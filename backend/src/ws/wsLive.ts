import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { Pool, PoolClient } from "pg";
import { IncomingMessage } from "http";
import { Server } from "http";
import { parse as parseUrl } from "url";

// ─────────────────────────────────────────────────────────────────────────────
// SQL queries — one per subscribable channel
// ─────────────────────────────────────────────────────────────────────────────
const QUERIES: Record<string, string> = {
  news:   `SELECT * FROM news_sources ORDER BY COALESCE(published_date, created_at) DESC`,
  images: `SELECT * FROM manual_image_production ORDER BY created_at DESC`,
  reels:  `SELECT * FROM reels ORDER BY created_at DESC`,
};

const TABLE_TO_CHANNEL: Record<string, string> = {
  news_sources: "news",
  manual_image_production: "images",
  reels: "reels",
};

const DB_NOTIFY_CHANNEL = "table_change";

interface Subscription {
  channels: Set<string>;
}

interface DbNotifyPayload {
  table: string;
  op: "INSERT" | "UPDATE" | "DELETE";
}

async function ensureRealtimeTriggers(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE OR REPLACE FUNCTION notify_table_change() RETURNS TRIGGER AS $$
    DECLARE
      payload TEXT;
    BEGIN
      payload := json_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP
      )::text;

      PERFORM pg_notify('${DB_NOTIFY_CHANNEL}', payload);

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS news_sources_change_trigger ON news_sources;
    CREATE TRIGGER news_sources_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON news_sources
    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS manual_image_production_change_trigger ON manual_image_production;
    CREATE TRIGGER manual_image_production_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON manual_image_production
    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS reels_change_trigger ON reels;
    CREATE TRIGGER reels_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reels
    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach WebSocket server to an existing HTTP server
// ─────────────────────────────────────────────────────────────────────────────
export function attachWebSocketServer(httpServer: Server, pool: Pool): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws-live" });
  const subscriptions = new Map<WebSocket, Subscription>();

  console.log("[WS] WebSocket server attached at /ws-live");

  async function fetchAndSendToSocket(ws: WebSocket, channel: string): Promise<void> {
    const query = QUERIES[channel];
    if (!query) return;

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(query);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: channel, data: result.rows }));
        }
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.error(`[WS] fetch error [${channel}]:`, e.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", channel, message: e.message }));
      }
    }
  }

  async function pushChannelToSubscribers(channel: string): Promise<void> {
    const sends: Promise<void>[] = [];

    for (const [ws, sub] of subscriptions.entries()) {
      if (ws.readyState !== WebSocket.OPEN || !sub.channels.has(channel)) {
        continue;
      }
      sends.push(fetchAndSendToSocket(ws, channel));
    }

    await Promise.allSettled(sends);
  }

  async function startDbListener(): Promise<void> {
    await ensureRealtimeTriggers(pool);

    const listener: PoolClient = await pool.connect();
    await listener.query(`LISTEN ${DB_NOTIFY_CHANNEL}`);

    listener.on("notification", async (msg) => {
      if (!msg.payload) return;

      try {
        const payload = JSON.parse(msg.payload) as DbNotifyPayload;
        const channel = TABLE_TO_CHANNEL[payload.table];
        if (!channel) return;

        console.log(`[WS] DB notify: ${payload.table} ${payload.op} -> ${channel}`);
        await pushChannelToSubscribers(channel);
      } catch (e: any) {
        console.error("[WS] notification parse error:", e.message);
      }
    });

    listener.on("error", (err) => {
      console.error("[WS] DB listener error:", err);
    });

    console.log(`[WS] PostgreSQL LISTEN active on channel "${DB_NOTIFY_CHANNEL}"`);
  }

  void startDbListener().catch((e: any) => {
    console.error("[WS] Failed to start DB LISTEN/NOTIFY realtime listener:", e.message);
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // ── Authenticate via ?token= query param ────────────────────────────────
    const { query } = parseUrl(req.url ?? "", true);
    const token = query.token as string | undefined;

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      ws.close(4001, "Unauthorized");
      return;
    }

    console.log("[WS] Client connected");

    const sub: Subscription = { channels: new Set() };
    subscriptions.set(ws, sub);

    async function sendSubscribedChannels(): Promise<void> {
      for (const ch of sub.channels) {
        await fetchAndSendToSocket(ws, ch);
      }
    }

    // ── Message handler ──────────────────────────────────────────────────────
    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Subscribe: { "subscribe": ["news", "images"] }
        if (msg.subscribe && Array.isArray(msg.subscribe)) {
          sub.channels.clear();
          for (const ch of msg.subscribe) {
            if (QUERIES[ch]) sub.channels.add(ch);
          }
          await sendSubscribedChannels();
          return;
        }

        // Refresh: { "refresh": "news" } | { "refresh": "all" }
        if (msg.refresh) {
          if (msg.refresh === "all") {
            await sendSubscribedChannels();
          } else if (QUERIES[msg.refresh]) {
            await fetchAndSendToSocket(ws, msg.refresh);
          }
        }
      } catch (e: any) {
        console.error("[WS] message parse error:", e.message);
      }
    });

    // ── Cleanup on disconnect ────────────────────────────────────────────────
    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      subscriptions.delete(ws);
    });

    ws.on("error", (e) => {
      console.error("[WS] Socket error:", e);
      subscriptions.delete(ws);
    });
  });
}
