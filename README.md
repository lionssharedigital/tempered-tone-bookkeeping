# Tempered Tone Woods — Bookkeeping

Self-hosted bookkeeping app: transactions, a category map, CSV/PDF bank
statement import, and P&L / Balance Sheet reports computed from your
transaction data.

This instance starts **blank** — no pre-set accounts, no category map rules.
Create both from scratch through the **Accounts** and **Category Map** screens
after your first login.

## Stack

Next.js (App Router) + TypeScript, SQLite via Drizzle ORM, single Docker
container.

## Running with Docker (recommended)

1. Copy `.env.example` to `.env` and set `ADMIN_PASSWORD` and
   `SESSION_SECRET` (a long random string).
2. `docker compose up --build`
3. Open `http://localhost:3002` and sign in with `ADMIN_PASSWORD`.

Runs on port 3002 (not 3000) so it can sit alongside the Lion's Share and
Gravitas Recordings instances on the same host without a port conflict.

The SQLite database lives in a Docker-managed named volume (`sqlite_data`)
and uploaded CSV/PDF files in `./uploads` (a regular bind mount), so both
persist across container restarts/rebuilds. The database uses a named
volume rather than a bind mount because SQLite's file locking isn't
reliably supported over Docker Desktop's virtualized bind-mount filesystem
on macOS.

**Getting started after first login:**
1. Go to **Accounts** and add your bank accounts (name, institution, type,
   opening balance and date).
2. Go to **Category Map** and add keyword → category rules as you go —
   new transactions get auto-categorized by matching the payee against
   these rules.
3. Import 2025/2026 statements via **Import** (CSV or PDF), or add
   transactions by hand.

To back up the database: `docker run --rm -v tempered-tone-bookkeeping_sqlite_data:/data -v "$(pwd)":/backup alpine cp /data/bookkeeping.sqlite /backup/bookkeeping-backup.sqlite`
(volume name may be prefixed differently depending on your project/folder name — check with `docker volume ls`).

If this is exposed beyond your local network, put it behind a reverse proxy
(Caddy, Traefik, nginx, or a Cloudflare Tunnel) for TLS — the app itself
only serves plain HTTP.

## Running locally without Docker

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD and SESSION_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

## How it works

- **Category Map** (`/categories`): payee keyword → category → type rules.
  New transactions are auto-categorized by case-insensitive substring match
  against these rules, highest-priority rule wins on overlaps.
- **Transactions** (`/transactions`): manual entry with live category
  auto-suggest as you type the payee, inline editing, filtering, CSV/Excel
  export.
- **Import** (`/import`): upload a CSV or PDF bank statement. You map
  columns (CSV) or the app extracts a table (PDF, best-effort — works well
  for text-based statements, not scanned images), then review
  auto-categorization and duplicate flags before committing. Nothing is
  written to the ledger until you commit.
- **Reports** (`/reports/*`): P&L (category × month) and Balance Sheet
  (opening balance + activity per account) are computed live from
  transactions, not separately maintained — they can't drift out of sync.
  Transfer-type transactions are excluded from P&L (to avoid double-counting
  money moved between your own accounts) but still count toward each
  account's Balance Sheet activity. Both reports export to CSV/Excel.

## Scripts

- `npm run db:generate` — generate a new Drizzle migration after editing `db/schema.ts`
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — no-op for this instance (kept for parity with the other two; there's nothing to seed)
- `npm run lint` — ESLint
