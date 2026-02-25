# Content Studio — Full Migration Guide

## Overview

This project is split into two parts:

```
project-root/
├── backend/          ← Express/Node.js API + WebSocket server
│   ├── src/
│   │   ├── db/
│   │   │   └── pool.ts          PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.ts          JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts          POST /auth/login|signup|logout
│   │   │   ├── dbQuery.ts       POST /db-query  (all CRUD)
│   │   │   └── proxyN8n.ts      POST /proxy-n8n (webhook proxy)
│   │   ├── ws/
│   │   │   └── wsLive.ts        ws://host/ws-live  (live data)
│   │   └── server.ts            Entry point
│   ├── .env.example             Copy → .env and fill values
│   ├── package.json
│   └── tsconfig.json
│
├── src/                ← React frontend (Vite)
│   ├── contexts/
│   │   └── AuthContext.tsx      reads VITE_API_URL
│   ├── hooks/
│   │   └── useRealtimeData.ts   reads VITE_API_URL → ws://
│   └── lib/
│       └── api.ts               reads VITE_API_URL
├── frontend.env.example         Copy → .env and fill VITE_API_URL
└── MIGRATION_GUIDE.md           ← you are here
```

---

## Step 1 — Clone / export the project

```bash
# If using GitHub
git clone https://github.com/your-org/content-studio.git
cd content-studio
```

---

## Step 2 — Set up the backend

### 2a. Install dependencies
```bash
cd backend
npm install
```

### 2b. Configure environment
```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/yourdb
JWT_SECRET=replace-with-a-long-random-secret-min-32-chars
N8N_WEBHOOK_BASE=https://your-n8n-instance.com/webhook
FRONTEND_URL=http://localhost:5173
```

> **JWT_SECRET** — generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 2c. Recreate the PostgreSQL schema

Connect to your database and run:

```sql
-- Users (managed by the auth service)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- News sources (usually populated by n8n)
CREATE TABLE IF NOT EXISTS news_sources (
  id                       SERIAL PRIMARY KEY,
  article_title            TEXT NOT NULL,
  original_news_url        TEXT,
  orignal_news_image_url   TEXT,
  source_name              TEXT,
  country                  TEXT,
  category                 TEXT,
  published_date           TIMESTAMPTZ,
  selected_for_production  BOOLEAN DEFAULT false,
  orignal_article          TEXT,
  keywords_research        TEXT,
  llm_keywords             TEXT,
  rewritten_headline       TEXT,
  rewritten_article        TEXT,
  meta_title               TEXT,
  meta_description         TEXT,
  status                   TEXT DEFAULT 'New',
  instagram_hashtags       TEXT,
  instagram_captions       TEXT,
  twitter_hashtags         TEXT,
  twitter_captions         TEXT,
  website_url              TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  published_at             TIMESTAMPTZ
);

-- Image production
CREATE TABLE IF NOT EXISTS manual_image_production (
  news_source_id                  INTEGER PRIMARY KEY REFERENCES news_sources(id),
  title                           TEXT,
  content                         TEXT,
  status                          TEXT DEFAULT 'pending',
  posted_on_wordpress             BOOLEAN DEFAULT false,
  posted_date                     TIMESTAMPTZ,
  catogires                       TEXT,
  highlighted_keywords            TEXT,
  image_for_post                  TEXT,
  image_url                       TEXT,
  image_owner_name                TEXT,
  image                           TEXT,
  download_link                   TEXT,
  google_search_query             TEXT,
  statistic_template_text         TEXT,
  keyword_highlight_template_text TEXT,
  simple_headline_template_text   TEXT,
  question_template_text          TEXT,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);

-- Reel production
CREATE TABLE IF NOT EXISTS reels (
  news_source_id                  INTEGER PRIMARY KEY REFERENCES news_sources(id),
  title                           TEXT,
  content                         TEXT,
  posted_on_wordpress             BOOLEAN DEFAULT false,
  category                        TEXT,
  status                          TEXT DEFAULT 'pending',
  video_url                       TEXT,
  video_owner_name                TEXT,
  video_dimension                 TEXT,
  make_video                      BOOLEAN DEFAULT false,
  final_video                     TEXT,
  video_without_voice_over        TEXT,
  video_overlay_text              TEXT,
  reel_cover_image                TEXT,
  final_reel_cover_image_view_link TEXT,
  final_reel_cover_download_link  TEXT,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now(),
  published_at                    TIMESTAMPTZ
);
```

### 2d. Start the backend

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

Server starts at `http://localhost:3001`
WebSocket at `ws://localhost:3001/ws-live`

---

## Step 3 — Set up the frontend

### 3a. Install dependencies (from project root)
```bash
npm install
```

### 3b. Configure environment
```bash
cp frontend.env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3001
```

In production replace with your server URL, e.g.:
```env
VITE_API_URL=https://api.yourdomain.com
```

### 3c. Start the frontend dev server
```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Step 4 — Production deployment

### Option A — VPS with PM2 + Nginx

```bash
# Install PM2 globally
npm install -g pm2

# Build backend
cd backend && npm run build

# Start with PM2
pm2 start dist/server.js --name content-studio-api
pm2 save && pm2 startup

# Build frontend
cd .. && npm run build
# Serve dist/ with Nginx
```

**Nginx config** (add to `/etc/nginx/sites-available/content-studio`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static)
    root /var/www/content-studio/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

If using `/api/` prefix, set `VITE_API_URL=https://yourdomain.com/api` in frontend.

### Option B — Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      N8N_WEBHOOK_BASE: ${N8N_WEBHOOK_BASE}
      FRONTEND_URL: http://localhost:5173
    restart: unless-stopped

  frontend:
    build:
      context: .
      args:
        VITE_API_URL: http://localhost:3001
    ports:
      - "5173:80"
    restart: unless-stopped
```

---

## Step 5 — (Optional) Migrate existing data

```bash
# Export from old database
pg_dump \
  --host=old-host \
  --username=old-user \
  --dbname=old-db \
  --table=news_sources \
  --table=manual_image_production \
  --table=reels \
  --data-only \
  -f export.sql

# Import to new database
psql "$DATABASE_URL" -f export.sql
```

---

## Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `PORT` | backend `.env` | Express server port (default: 3001) |
| `DATABASE_URL` | backend `.env` | PostgreSQL connection string |
| `JWT_SECRET` | backend `.env` | Secret for signing JWTs (min 32 chars) |
| `N8N_WEBHOOK_BASE` | backend `.env` | Base URL of n8n (no trailing slash) |
| `FRONTEND_URL` | backend `.env` | Allowed CORS origin |
| `VITE_API_URL` | frontend `.env` | Express backend URL (no trailing slash) |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Login → returns JWT |
| POST | `/auth/signup` | No | Create account → returns JWT |
| POST | `/auth/logout` | No | Stateless logout |
| POST | `/db-query` | JWT | All CRUD actions |
| POST | `/proxy-n8n` | JWT | Forward to n8n webhook |
| WS | `/ws-live?token=` | JWT | Live data push |
| GET | `/health` | No | Health check |
