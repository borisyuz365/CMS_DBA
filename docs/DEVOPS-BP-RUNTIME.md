# BP Runtime Service — DevOps deploy runbook
#
# Public read-only API for mobile clients (Betting Promotion / BPMB).
# CMS admin stays on cms-dba.sportifier.com (internal); this service gets a
# separate public hostname + CloudFront distribution.

## Architecture

| Service | Host (example) | Routes |
|---------|----------------|--------|
| **CMS (internal)** | `cms-dba.sportifier.com` | `/api/bp/promotions`, `/api/bp/countries`, BP Editor UI |
| **BP runtime (public)** | `bp-api.365scores.com` (TBD) | `GET /api/bp`, `GET /api/bp/meta`, `/legal-logos/*` |

After a CMS promotion save:

1. CMS writes to RDS (`bp_promotions`, `bp_bookies`)
2. CMS `POST`s to BP service `POST /internal/invalidate` (private network)
3. CMS purges **public** CloudFront distribution `/api/bp*`

---

## 1. Build & deploy BP runtime

**Dockerfile:** `bp-service/Dockerfile`  
**Build context:** repo root

```bash
docker build -f bp-service/Dockerfile -t bp-runtime:latest .
```

**Container port:** `3002`  
**Health check:** `GET /api/health`  
**Runtime check:** `GET /api/bp/meta` → `ready: true`, `totalVersions > 0`

---

## 2. Environment variables — BP runtime (public deploy)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `PORT` | no | `3002` | |
| `MYSQL_HOST` | yes | RDS endpoint | Read-only user is sufficient |
| `MYSQL_PORT` | no | `3306` | |
| `MYSQL_USER` | yes | | |
| `MYSQL_PASSWORD` | yes | secret | |
| `MYSQL_DATABASE` | yes | `dba_cms` | Same DB as CMS |
| `BP_PUBLIC_BASE_URL` | yes | `https://bp-api.365scores.com` | Prefix for `/legal-logos/…` and relative asset URLs in JSON |
| `BP_INVALIDATE_SECRET` | yes | random string | Must match CMS |

**Not required on BP service:** MSSQL, Google Sheets, CloudFront SDK, CMS frontend.

---

## 3. Environment variables — CMS (internal deploy)

Add to existing CMS deployment:

| Variable | Example | Notes |
|----------|---------|-------|
| `BP_RUNTIME_INVALIDATE_URL` | `http://bp-runtime.internal:3002/internal/invalidate` | Private URL — not public DNS |
| `BP_INVALIDATE_SECRET` | same as BP service | |
| `BP_RUNTIME_PUBLIC_URL` | `https://bp-api.365scores.com` | Logged at startup; docs reference only |
| `CLOUDFRONT_DISTRIBUTION_ID` | public BP distribution ID | **Not** cms-dba distribution |
| `AWS_REGION` | `us-east-1` | For CloudFront invalidation IAM |

MySQL + MSSQL vars unchanged — see `docs/DEVOPS-RDS-BOOTSTRAP.md`.

---

## 4. CloudFront (public BP distribution)

DevOps provisions a **separate** distribution for mobile traffic:

| Setting | Value |
|---------|--------|
| Origin | BP runtime load balancer / ECS service |
| Behaviors | `/api/bp*`, `/legal-logos/*` |
| Cache | Respect origin `Cache-Control: public, max-age=300, stale-while-revalidate=60` for `GET /api/bp` |
| Do **not** expose | `/internal/invalidate` — block at origin or WAF; CMS calls via private network only |

**Do not** expose `GET /api/bp` on `cms-dba.sportifier.com` to the public internet.

---

## 5. Network & security

| Rule | Detail |
|------|--------|
| BP service → RDS | MySQL 3306 |
| CMS → RDS | MySQL 3306 |
| CMS → MSSQL | SportifierDB (geo picker only) |
| CMS → BP service | `POST /internal/invalidate` on private network |
| Internet → BP service | Via CloudFront only (recommended) |
| Internet → CMS | Admin/VPN or auth gateway — no public runtime |

---

## 6. Verification checklist

```bash
# BP runtime (public URL after DNS + CF)
curl -s https://bp-api.example.com/api/health
curl -s https://bp-api.example.com/api/bp/meta
# expect ready:true, totalVersions > 0 after CMS created promotions

curl -s "https://bp-api.example.com/api/bp?uc=3&appType=2&lang=10"
# expect flat promotion JSON, not 404

curl -sI "https://bp-api.example.com/legal-logos/italia-gambling-full.svg"
# expect HTTP 200

# CMS internal — runtime should NOT be on public CMS host (or return 404)
curl -sI "https://cms-dba.sportifier.com/api/bp"
# expect 404 or blocked — only /api/bp/promotions for editors

# After CMS save — invalidate + CF
# Edit promotion in CMS → curl /api/bp/meta builtAt should update within seconds
```

---

## 7. Local development

```bash
npm run install:all
docker compose up -d mysql          # optional; or use existing MySQL
npm run dev:backend                 # CMS :3001
npm run dev:bp                      # BP runtime :3002
npm run dev:frontend                # CMS UI :3000
```

Or run BP in Docker:

```bash
docker compose up -d
```

**Local env (backend `.env`):**

```
BP_RUNTIME_INVALIDATE_URL=http://localhost:3002/internal/invalidate
BP_INVALIDATE_SECRET=dev-invalidate-secret
```

**Local env (bp-service `.env` or shell):**

```
PORT=3002
MYSQL_HOST=127.0.0.1
MYSQL_USER=cms
MYSQL_PASSWORD=cmspass
MYSQL_DATABASE=dba_cms
BP_PUBLIC_BASE_URL=http://localhost:3002
BP_INVALIDATE_SECRET=dev-invalidate-secret
```

---

## 8. Key repo files

| File | Purpose |
|------|---------|
| `bp-service/server.js` | Public runtime entry point |
| `bp-service/routes/runtime.js` | `GET /api/bp`, `GET /api/bp/meta` |
| `bp-service/Dockerfile` | Production image |
| `backend/routes/bpPromotions.js` | CMS CRUD (internal) |
| `backend/services/bpRuntimeClient.js` | CMS → BP invalidate hook |
| `backend/services/bp/formatRuntime.js` | Response shape + absolute asset URLs |
| `backend/services/bpCache.js` | In-memory promotion cache (BP service) |
| `backend/db/schema.sql` | `bp_promotions`, `bp_bookies` tables |

---

## 9. Mobile client integration (dev team)

Point apps at the **public** base URL (not cms-dba):

```
GET {BP_PUBLIC_BASE_URL}/api/bp?uc=&appType=&lang=&publisher=&campaign=&lid=
```

Response schema: Swagger at CMS `/api-docs` (Runtime section) or `backend/data/bp_mock_response.json`.
