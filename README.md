# AETHER-SAR

Autonomous maritime dark-fleet and radar intelligence platform. The map is a live simulator. Vessel, incident, anomaly, and briefing records are stored in a database.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The surveillance console is at `/console`.

## Database

Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_SSL` in `.env.local`. `DB_SSL=true` connects with TLS and `rejectUnauthorized: true`, which TiDB Cloud requires. On a local MySQL host the server creates the database if needed and loads `sql/darkfleet.sql`. With none of those set, it falls back to SQLite at `data/aether.db`. `/api/health` and `/api/catalog` report which one is connected. Briefing requests are inserted into `briefing_requests`.

`sql/darkfleet.sql` also loads on MySQL 8, TiDB, and PostgreSQL 14+.

```bash
# TiDB / MySQL
mysql --host HOST -P 4000 -u USER -p DATABASE < sql/darkfleet.sql

# Neon / PostgreSQL
psql "$DATABASE_URL" -f sql/darkfleet.sql
```

`DATABASE_URL` is optional when the `DB_*` fields are set. See `.env.example`. Do not commit `.env.local`.

## Deploy

Import the repo into Vercel and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_SSL` on the production environment. Node 18.18 or newer.
