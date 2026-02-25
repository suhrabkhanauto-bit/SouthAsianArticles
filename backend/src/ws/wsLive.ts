import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
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

interface Subscription {
  channels: Set<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach WebSocket server to an existing HTTP server
// ─────────────────────────────────────────────────────────────────────────────
export function attachWebSocketServer(httpServer: Server, pool: Pool): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws-live" });

  console.log("[WS] WebSocket server attached at /ws-live");

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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // ── Fetch a single channel and push to client ────────────────────────────
    async function fetchAndSend(channel: string): Promise<void> {
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

    // ── Poll all subscribed channels ─────────────────────────────────────────
    async function pollAll(): Promise<void> {
      for (const ch of sub.channels) {
        await fetchAndSend(ch);
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
          // Send immediately, then poll every 5 s
          await pollAll();
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => void pollAll(), 5000);
          return;
        }

        // Refresh: { "refresh": "news" } | { "refresh": "all" }
        if (msg.refresh) {
          if (msg.refresh === "all") {
            await pollAll();
          } else if (QUERIES[msg.refresh]) {
            await fetchAndSend(msg.refresh);
          }
        }
      } catch (e: any) {
        console.error("[WS] message parse error:", e.message);
      }
    });

    // ── Cleanup on disconnect ────────────────────────────────────────────────
    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      if (intervalId) clearInterval(intervalId);
    });

    ws.on("error", (e) => {
      console.error("[WS] Socket error:", e);
      if (intervalId) clearInterval(intervalId);
    });
  });
}
