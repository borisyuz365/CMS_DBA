# CMS DBA — RDS bootstrap runbook

Handoff for DevOps: how to provision MySQL on RDS for the DBA CMS backend and load initial data.

**Prod URL:** `https://cms-dba.sportifier.com`  
**Public BP runtime:** separate microservice — see [`DEVOPS-BP-RUNTIME.md`](./DEVOPS-BP-RUNTIME.md)  
**Schema:** `backend/db/schema.sql` (idempotent — safe to re-run)  
**App entry:** `backend/server.js` (Dockerfile runs `node server.js` from `/app/backend`)

---

## Overview

The DBA management UI (bookmakers, templates, Sheets mirror tables) reads from **MySQL** (`dba_cms` database). Sports entity data still uses JSON files; MSSQL (`DB_*` env vars) is a separate connection for SportifierDB lookups.

The app **does not** apply schema or seed data on startup. An empty RDS yields an empty UI — the API returns `HTTP 200` with `[]`, not an error.

**Bootstrap order:**

1. Create database `dba_cms` (utf8mb4) if it does not exist
2. Apply `backend/db/schema.sql`
3. Load data (Sheets import **or** SQL dump restore — pick one)
4. Deploy / restart CMS backend with correct `MYSQL_*` pointing at RDS
5. Verify API

---

## 1. RDS prerequisites

| Item | Value |
|------|--------|
| Engine | MySQL 8.x |
| Database | `dba_cms` (or match `MYSQL_DATABASE`) |
| Charset | `utf8mb4` / `utf8mb4_unicode_ci` |
| App user | e.g. `cms` with `ALL` on `dba_cms.*` |
| Network | CMS backend (and one-off bootstrap jobs) → RDS **3306** |

Create database (if needed):

```sql
CREATE DATABASE IF NOT EXISTS dba_cms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## 2. Environment variables

### MySQL (required for DBA CMS)

Defined in `backend/db/mysql.js`. Defaults match local `docker-compose.yml` only — **override in production**.

| Variable | Example | Notes |
|----------|---------|--------|
| `MYSQL_HOST` | RDS endpoint | Must not be `127.0.0.1` in prod |
| `MYSQL_PORT` | `3306` | |
| `MYSQL_USER` | app user | |
| `MYSQL_PASSWORD` | secret | |
| `MYSQL_DATABASE` | `dba_cms` | |

### Google Sheets import (Option A only)

| Variable | Notes |
|----------|--------|
| `GOOGLE_CREDS_PATH` | Path to service account JSON inside the job container |

Default in script: `../../BettingAdsService/ConfigurationManager/credentials.json` — override in prod via secret mount.

### MSSQL (separate — not RDS)

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | SportifierDB — bookmaker pool picker, Bet365 link **fallback** |

### Bet365 click resolution (DBA Management)

Bet365 live CTAs use **GetPayload `Bookie.Link`** (AdsGenerator LinksManager) — option B: no `cta_url`, declare `OS_Type`.

| Variable | Purpose |
|----------|---------|
| `PAYLOAD_LINK_BMIDS` | Default `14` — bmids that take Bookie.Link from GetPayload via dba-runtime |
| `FEED_BASE_URL` | AdsGenerator host for creative `data-feed` |
| `CONTEXT_AWARE_BMIDS` | Legacy alias accepted by `PAYLOAD_LINK_BMIDS` |
| `LINK_BASE_URL` / Targetings env | Optional debug `/api/dba/links/*` only |

---

## 3. Step A — Apply schema

From repo root, from a host that can reach RDS:

```bash
mysql -h "$MYSQL_HOST" -P 3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  < backend/db/schema.sql
```

Without a local `mysql` client:

```bash
docker run --rm -i mysql:8.4 mysql \
  -h "$MYSQL_HOST" -P 3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  < backend/db/schema.sql
```

Verify:

```sql
SHOW TABLES LIKE 'dba_%';
-- expect dba_bookmakers, dba_templates, dba_bookie_settings, ...
```

---

## 4. Step B — Load data (choose one)

### Option A — Google Sheets import (recommended for production)

Mirrors live BettingAds config. Script: `backend/scripts/importFromSheets.js`.

**Side effects:**

- `TRUNCATE`s and reloads every Sheets mirror table
- `TRUNCATE`s `dba_bookmakers`, `dba_bookmaker_variants`, `dba_templates` and re-derives them from imported Bookie Settings
- Does **not** touch `dba_audit_log` or `dba_service_state`

```bash
cd backend
export MYSQL_HOST=...
export MYSQL_PORT=3306
export MYSQL_USER=...
export MYSQL_PASSWORD=...
export MYSQL_DATABASE=dba_cms
export GOOGLE_CREDS_PATH=/path/to/service-account.json

node scripts/importFromSheets.js
```

**Requires from platform team:**

- Google service account JSON (read-only Sheets access on BettingAds workbooks)
- Secret mounted at `GOOGLE_CREDS_PATH`
- Outbound HTTPS to Google APIs from the job runner

### Option B — SQL dump restore (first prod fill / DR)

Good for cloning a known-good snapshot. Use `--no-tablespaces` on MySQL 8 / RDS to avoid `PROCESS` privilege errors.

```bash
# Dump from source (e.g. local Docker with data)
docker exec cms_mysql mysqldump -u cms -pcmspass --no-tablespaces dba_cms \
  dba_bookmakers dba_bookmaker_variants dba_templates dba_audit_log dba_service_state \
  > dba_seed.sql

# Restore to RDS
docker run --rm -i mysql:8.4 mysql \
  -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  < dba_seed.sql
```

Optional: store a sanitized `dba_seed.sql` in a secure artifact bucket for disaster recovery.

### Option C — Sample JSON seed (dev / staging only)

**Not for production go-live.**

```bash
cd backend
# MYSQL_* → target RDS
node scripts/seedDbaData.js          # writes backend/data/dba_*.json
node scripts/migrateJsonToMysql.js     # JSON → MySQL
```

---

## 5. Verification

### Database

```bash
docker run --rm -i mysql:8.4 mysql \
  -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  -e "SELECT COUNT(*) AS bookmakers FROM dba_bookmakers; SELECT COUNT(*) AS templates FROM dba_templates;"
```

Expect counts **> 0**.

### API (after backend deploy)

```bash
curl -s https://cms-dba.sportifier.com/api/health

curl -s https://cms-dba.sportifier.com/api/dba/bookmakers | python3 -c \
  "import sys,json; print(len(json.load(sys.stdin)))"
```

`/api/dba/bookmakers` must return a JSON array with entries, not `[]`.

---

## 6. Suggested CI/CD integration

| Job | When | Action |
|-----|------|--------|
| `dba-schema` | New RDS or schema change | Apply `backend/db/schema.sql` |
| `dba-seed` | New environment / empty DB | Run `importFromSheets.js` **or** restore `dba_seed.sql` |
| `cms-deploy` | Every release | Deploy container with `MYSQL_*` secrets; **no re-seed** unless intentional |

**Do not** rely on local Docker defaults (`cms` / `cmspass` @ `127.0.0.1`) in production.

Optional: gate staging deploy on `SELECT COUNT(*) FROM dba_bookmakers > 0`.

---

## 7. Deliverables checklist

| Deliverable | Owner |
|-------------|--------|
| RDS endpoint, port, database name | DevOps |
| App DB user + password (Secrets Manager / K8s secret) | DevOps |
| `MYSQL_*` wired into CMS deployment | DevOps |
| `backend/db/schema.sql` pinned to release tag/commit | Dev team |
| Google SA JSON **or** signed `dba_seed.sql` artifact | Dev / platform |
| MSSQL `DB_*` for SportifierDB (separate from MySQL) | Dev team |
| Decision: Option A vs B for first prod seed | Team |

---

## 8. Common pitfalls

| Symptom | Cause |
|---------|--------|
| `Table 'dba_cms.dba_bookmakers' doesn't exist` | Schema never applied to RDS |
| `Access denied for user 'cms'@'...'` | Local Docker creds used against RDS |
| Prod UI empty, API returns `[]` | Schema OK but RDS empty; or prod points at wrong DB |
| Seed worked locally, prod still empty | Data loaded into **local Docker**, prod uses **RDS** |
| `mysqldump` tablespaces error on RDS | Add `--no-tablespaces` |

---

## Key files

| File | Purpose |
|------|---------|
| `backend/db/schema.sql` | MySQL DDL (idempotent) |
| `backend/db/mysql.js` | Connection pool; reads `MYSQL_*` |
| `backend/scripts/importFromSheets.js` | Production seed from Google Sheets |
| `backend/scripts/seedDbaData.js` | Dev mock JSON generator |
| `backend/scripts/migrateJsonToMysql.js` | JSON → MySQL (dev/staging) |
| `Dockerfile` | Production image; does not run migrations |
| `docker-compose.yml` | Local MySQL only — not used in prod |
