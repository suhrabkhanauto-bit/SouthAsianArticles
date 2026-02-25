import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";

const router = Router();

// Ensure users table exists (idempotent)
async function ensureUsersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    )
  `);
}

function signJwt(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
}

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    await ensureUsersTable();

    const result = await pool.query<{ id: number; email: string; name: string }>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email, password, name || null]
    );

    const user = result.rows[0];
    const token = signJwt({ sub: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    if (e.code === "23505" || e.message?.includes("unique")) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }
    console.error("[auth/signup] error:", e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      email: string;
      name: string;
      password_hash: string;
    }>(
      `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];
    if (password !== user.password_hash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signJwt({ sub: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    console.error("[auth/login] error:", e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

// POST /auth/logout — stateless; client discards token
router.post("/logout", (_req: Request, res: Response): void => {
  res.json({ success: true });
});

export default router;
