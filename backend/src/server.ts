import http from "http";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { pool, testConnection } from "./db/pool";
import { attachWebSocketServer } from "./ws/wsLive";

// ── Route handlers ────────────────────────────────────────────────────────────
import authRouter from "./routes/auth";
import dbQueryRouter from "./routes/dbQuery";
import proxyN8nRouter from "./routes/proxyN8n";
import exportRouter from "./routes/export";

// ── Cron jobs ─────────────────────────────────────────────────────────────────
import { startDataPurgeCron } from "./cron/dataPurge";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "*",
  credentials: true,
}));
app.use(express.json());

// ── Request logger (dev) ──────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/db-query", dbQueryRouter);
app.use("/proxy-n8n", proxyN8nRouter);
app.use("/export", exportRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
attachWebSocketServer(server, pool);

// ── Start ─────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await testConnection();
  } catch (e) {
    console.error("[Server] Could not connect to PostgreSQL — check DATABASE_URL");
    process.exit(1);
  }

  // Start background cron jobs after DB is confirmed live
  startDataPurgeCron();

  server.listen(PORT, () => {
    console.log(`\n🚀  Content Studio backend running on http://localhost:${PORT}`);
    console.log(`🔌  WebSocket available at  ws://localhost:${PORT}/ws-live`);
    console.log(`❤️   Health check at         http://localhost:${PORT}/health\n`);
  });
}

start();
