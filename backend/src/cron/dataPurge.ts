import cron from "node-cron";
import { pool } from "../db/pool";

// ─── Tables subject to 30-day purge (oldest-first, NO cascades needed) ────────
const PURGEABLE_TABLES = [
    // Child tables first to avoid FK constraint violations
    "manual_image_production",
    "reels",
    // Parent table last
    "news_sources",
];

async function purgeOldData(): Promise<void> {
    console.log("[Cron] Starting 30-day data purge...");

    const client = await pool.connect();
    try {
        let totalDeleted = 0;

        for (const table of PURGEABLE_TABLES) {
            try {
                const result = await client.query(
                    `DELETE FROM ${table} WHERE created_at < NOW() - INTERVAL '30 days'`
                );
                const deleted = result.rowCount ?? 0;
                totalDeleted += deleted;
                console.log(`[Cron] Purged ${deleted} rows from "${table}"`);
            } catch (tableErr: any) {
                // Log per-table errors without stopping the whole purge
                console.error(`[Cron] Error purging "${table}":`, tableErr.message);
            }
        }

        console.log(`[Cron] Purge complete — total deleted: ${totalDeleted} rows`);
    } finally {
        client.release();
    }
}

// ─── Schedule: runs daily at 02:00 server time ────────────────────────────────
export function startDataPurgeCron(): void {
    // Validate the cron is supported (node-cron validates at schedule time)
    cron.schedule("0 2 * * *", async () => {
        try {
            await purgeOldData();
        } catch (e: any) {
            console.error("[Cron] Unhandled purge error:", e.message);
        }
    });

    console.log("[Cron] Data purge job scheduled — runs daily at 02:00");
}
