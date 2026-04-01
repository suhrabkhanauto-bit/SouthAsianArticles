import { Router, Response } from "express";
import archiver from "archiver";
import { pool } from "../db/pool";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// ─── Tables to export (name → SQL) ────────────────────────────────────────────
interface TableDef {
  name: string;
  sql: string;
  values: unknown[];
}

const EXPORT_TABLES: TableDef[] = [
  {
    name: "news_sources",
    sql: `SELECT * FROM news_sources WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY COALESCE(published_date, created_at) DESC`,
    values: [],
  },
  {
    name: "manual_image_production",
    sql: `SELECT * FROM manual_image_production WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`,
    values: [],
  },
  {
    name: "reels",
    sql: `SELECT * FROM reels WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`,
    values: [],
  },
  {
    name: "users",
    sql: `SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC`,
    values: [],
  },
];

const EXPORT_TABLE_NAMES = EXPORT_TABLES.map((t) => t.name);
const CLEAR_AFTER_EXPORT_TABLES = EXPORT_TABLE_NAMES.filter((name) => name !== "users");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str}"`
      : str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

async function buildExportZipBuffer(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("warning", (err) => {
    if (err.code !== "ENOENT") throw err;
  });

  archive.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });

  const zipReady = new Promise<Buffer>((resolve, reject) => {
    archive.on("error", reject);
    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });

  const client = await pool.connect();
  try {
    for (const table of EXPORT_TABLES) {
      const result = await client.query(table.sql, table.values);
      const csv = rowsToCsv(result.rows as Record<string, unknown>[]);
      archive.append(csv || "", { name: `${table.name}.csv` });
      console.log(`[export] ${table.name}: ${result.rows.length} rows`);
    }

    const manifest = {
      exported_at: new Date().toISOString(),
      window_days: 30,
      tables: EXPORT_TABLES.map((t) => t.name),
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    await archive.finalize();
    return await zipReady;
  } finally {
    client.release();
  }
}

async function clearExportedTables(): Promise<void> {
  const client = await pool.connect();
  try {
    if (CLEAR_AFTER_EXPORT_TABLES.length === 0) {
      return;
    }

    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE ${CLEAR_AFTER_EXPORT_TABLES.join(", ")} RESTART IDENTITY CASCADE`
    );
    await client.query("COMMIT");
    console.log(
      `[export] Cleared tables after download: ${CLEAR_AFTER_EXPORT_TABLES.join(", ")} (users preserved)`
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── GET /export/stats ────────────────────────────────────────────────────────
// Returns per-table row counts + date range info — used by the UI banner
router.get("/stats", async (_req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const STAT_TABLES = ["news_sources", "manual_image_production", "reels"];

    const stats = await Promise.all(
      STAT_TABLES.map(async (table) => {
        const r = await client.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS within_30d,
             MIN(created_at) AS oldest,
             MAX(created_at) AS newest
           FROM ${table}`
        );
        return { table, ...r.rows[0] };
      })
    );

    // The purge date = today + days until the oldest record turns 30 days old
    const purgeDate = new Date();
    purgeDate.setDate(purgeDate.getDate() + 30);

    res.json({
      tables: stats,
      purge_date: purgeDate.toISOString(),
      window_days: 30,
    });
  } catch (e: any) {
    console.error("[export/stats] error:", e.message);
    res.status(500).json({ error: e.message || "Database error" });
  } finally {
    client.release();
  }
});

// ─── GET /export/download ─────────────────────────────────────────────────────
// Streams a ZIP archive containing one CSV per table
router.get("/download", async (req: AuthRequest, res: Response): Promise<void> => {
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `content-studio-export-${dateTag}.zip`;

  try {
    const zipBuffer = await buildExportZipBuffer();
    await clearExportedTables();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(zipBuffer.byteLength));
    res.status(200).end(zipBuffer);
    console.log(`[export] ZIP sent as "${filename}" and data cleared`);
  } catch (e: any) {
    console.error("[export/download] error:", e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Export failed" });
    }
  }
});

export default router;
