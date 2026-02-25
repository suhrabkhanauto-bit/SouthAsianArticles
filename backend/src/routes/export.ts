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

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("warning", (err) => {
    if (err.code !== "ENOENT") throw err;
  });

  archive.on("error", (err) => {
    console.error("[export/download] archive error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Archive error" });
    }
  });

  archive.pipe(res);

  const client = await pool.connect();
  try {
    for (const table of EXPORT_TABLES) {
      const result = await client.query(table.sql, table.values);
      const csv = rowsToCsv(result.rows as Record<string, unknown>[]);
      archive.append(csv || "", { name: `${table.name}.csv` });
      console.log(`[export] ${table.name}: ${result.rows.length} rows`);
    }

    // Add a manifest
    const manifest = {
      exported_at: new Date().toISOString(),
      window_days: 30,
      tables: EXPORT_TABLES.map((t) => t.name),
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    await archive.finalize();
    console.log(`[export] ZIP streamed as "${filename}"`);
  } catch (e: any) {
    console.error("[export/download] query error:", e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Export failed" });
    }
  } finally {
    client.release();
  }
});

export default router;
