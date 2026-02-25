import { Router, Response } from "express";
import { pool } from "../db/pool";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// All routes require a valid JWT
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Action registry — maps action name → parameterized SQL builder
// All queries use positional parameters ($1, $2 …) — NO raw SQL injection
// ─────────────────────────────────────────────────────────────────────────────
const ACTIONS: Record<string, (p: any) => { sql: string; values: any[] }> = {

  // ── News ──────────────────────────────────────────────────────────────────
  list_news: () => ({
    sql: `SELECT * FROM news_sources ORDER BY COALESCE(published_date, created_at) DESC`,
    values: [],
  }),

  // ── Images ────────────────────────────────────────────────────────────────
  list_images: () => ({
    sql: `SELECT * FROM manual_image_production ORDER BY created_at DESC`,
    values: [],
  }),

  save_image_data: (p) => ({
    sql: `
      INSERT INTO manual_image_production
        (news_source_id, title, image_for_post, catogires, image_url, image_owner_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (news_source_id) DO UPDATE SET
        title            = EXCLUDED.title,
        image_for_post   = EXCLUDED.image_for_post,
        catogires        = EXCLUDED.catogires,
        image_url        = EXCLUDED.image_url,
        image_owner_name = EXCLUDED.image_owner_name,
        updated_at       = now()
      RETURNING *
    `,
    values: [p.news_source_id, p.title, p.image_for_post, p.catogires, p.image_url, p.image_owner_name],
  }),

  get_image_by_news_id: (p) => ({
    sql: `SELECT * FROM manual_image_production WHERE news_source_id = $1`,
    values: [p.news_source_id],
  }),

  update_image_generated_url: (p) => ({
    sql: `
      UPDATE manual_image_production
      SET download_link = $1, updated_at = now()
      WHERE news_source_id = $2
      RETURNING *
    `,
    values: [p.download_link, p.news_source_id],
  }),

  // ── Reels ─────────────────────────────────────────────────────────────────
  list_reels: () => ({
    sql: `SELECT * FROM reels ORDER BY created_at DESC`,
    values: [],
  }),

  save_reel_data: (p) => ({
    sql: `
      INSERT INTO reels
        (news_source_id, title, video_url, video_owner_name, video_dimension, reel_cover_image)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (news_source_id) DO UPDATE SET
        title            = EXCLUDED.title,
        video_url        = EXCLUDED.video_url,
        video_owner_name = EXCLUDED.video_owner_name,
        video_dimension  = EXCLUDED.video_dimension,
        reel_cover_image = EXCLUDED.reel_cover_image,
        updated_at       = now()
      RETURNING *
    `,
    values: [
      p.news_source_id,
      p.title,
      p.video_url,
      p.video_owner_name,
      p.video_dimension,
      p.reel_cover_image ?? null,
    ],
  }),

  get_reel_by_news_id: (p) => ({
    sql: `SELECT * FROM reels WHERE news_source_id = $1`,
    values: [p.news_source_id],
  }),

  update_reel_generated_url: (p) => ({
    sql: `
      UPDATE reels
      SET final_video = $1, updated_at = now()
      WHERE news_source_id = $2
      RETURNING *
    `,
    values: [p.final_video, p.news_source_id],
  }),
};

// POST /db-query
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { action, params = {} } = req.body;

  const builder = ACTIONS[action];
  if (!builder) {
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }

  try {
    const { sql, values } = builder(params);
    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (e: any) {
    console.error(`[db-query] action="${action}" error:`, e.message);
    res.status(500).json({ error: e.message || "Database error" });
  }
});

export default router;
