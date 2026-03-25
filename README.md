# Project Cars Monorepo

This repository is now an npm workspace monorepo with:

- `backend`: Express + MongoDB backend
- `frontend`: React + Vite frontend

## Workspaces

```text
backend/
frontend/
```

## Commands

Install all workspace dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run dev:backend
```

Run the frontend:

```bash
npm run dev:frontend
```

Run both together:

```bash
npm run dev
```

Run backend tests:

```bash
npm test
```

Rebuild summaries and top issues for existing analysis reports:

```bash
node scripts/backfill-analysis.js
```

Preview the backfill safely without writing:

```bash
node scripts/backfill-analysis.js --dry-run
```

Run frontend end-to-end tests with Playwright:

```bash
npx playwright test
```
