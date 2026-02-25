# Articles Monorepo

This repository contains a Vite/React frontend and an Express/Node.js backend.

## Structure

- frontend/ - Vite + React + Tailwind app
- backend/ - Express + TypeScript API server

## Frontend setup

```sh
cd frontend
npm install
npm run dev
```

### Frontend environment

Create `frontend/.env` from `frontend/.env.example` and fill in values.

## Backend setup

```sh
cd backend
npm install
npm run dev
```

### Backend environment

Create `backend/.env` from `backend/.env.example` and fill in values.

## Production build

Frontend:

```sh
cd frontend
npm run build
```

Backend:

```sh
cd backend
npm run build
npm run start
```

## CI/CD notes

This repo includes a basic GitHub Actions workflow at `.github/workflows/ci.yml`.
Set environment variables in your CI provider secrets rather than committing `.env` files.
