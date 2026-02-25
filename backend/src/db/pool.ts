import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected PostgreSQL pool error:", err);
});

pool.on("connect", () => {
  console.log("[DB] New client connected to PostgreSQL pool");
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("[DB] PostgreSQL connection verified ✓");
  } finally {
    client.release();
  }
}
