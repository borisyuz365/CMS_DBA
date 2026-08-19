# DevOps next steps — DBA CMS + BP Runtime (prod)

**Repo:** `borisyuz365/CMS_DBA` (branch: `logo-positioning-dba` until merged)  
**Internal CMS:** `https://cms-dba.sportifier.com`  
**Public BP API:** new microservice — hostname TBD (e.g. `bp-api.365scores.com`)

This is the ordered checklist to complete production. Detailed runbooks:

- [`DEVOPS-RDS-BOOTSTRAP.md`](./DEVOPS-RDS-BOOTSTRAP.md) — MySQL schema + seed
- [`DEVOPS-BP-RUNTIME.md`](./DEVOPS-BP-RUNTIME.md) — BP microservice + CloudFront

---

## Phase 1 — RDS (if not already done)

- [ ] Confirm `dba_cms` database exists on RDS (utf8mb4)
- [ ] Apply schema: `backend/db/schema.sql` (includes `bp_promotions`, `bp_bookies`, DBA tables)
- [ ] Seed data: Sheets import **or** restore known-good SQL dump (see RDS runbook)
- [ ] Verify: `SELECT COUNT(*) FROM dba_bookmakers` > 0
- [ ] CMS deployment `MYSQL_*` env vars point at **RDS** (not localhost)

---

## Phase 2 — Deploy BP runtime microservice (new)

- [ ] Build image from **repo root** (`CMS_PROTOTYPE/`, not `bp-service/`):
  ```bash
  cd /path/to/CMS_PROTOTYPE
  docker build -f bp-service/Dockerfile -t bp-runtime:latest .
  ```
  Or: `./scripts/build-bp-runtime.sh`  
  Or from `bp-service/`: `npm run docker:build`  
  **Do not** run `docker build .` inside `bp-service/` — context must include `backend/`.
- [ ] Deploy as separate ECS/K8s service (port **3002**)
- [ ] Set environment:

  | Variable | Value |
  |----------|--------|
  | `MYSQL_HOST` | RDS endpoint |
  | `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | `dba_cms` credentials |
  | `BP_PUBLIC_BASE_URL` | **Final public URL** (CloudFront hostname) |
  | `BP_INVALIDATE_SECRET` | Generate strong shared secret |

- [ ] Security group: BP service → RDS :3306
- [ ] Health check: `GET /api/health` → 200
- [ ] Runtime check: `GET /api/bp/meta` → `ready: true`

---

## Phase 3 — Public edge (CloudFront + DNS)

- [ ] Create **new** CloudFront distribution (not cms-dba):
  - Origin: BP runtime load balancer / service
  - Behaviors: `/api/bp*`, `/legal-logos/*`
  - Respect origin `Cache-Control` on `GET /api/bp` (300s TTL)
- [ ] DNS + TLS cert for public hostname (product to confirm name)
- [ ] **Block** `GET /api/bp` on `cms-dba.sportifier.com` from public internet (WAF / ingress)
- [ ] IAM: CMS task role can `cloudfront:CreateInvalidation` on **BP** distribution

---

## Phase 4 — Update CMS deployment (internal)

Add to existing `cms-dba` backend secrets:

| Variable | Example |
|----------|---------|
| `BP_RUNTIME_INVALIDATE_URL` | `http://bp-runtime.internal:3002/internal/invalidate` (private) |
| `BP_INVALIDATE_SECRET` | Same secret as BP service |
| `BP_RUNTIME_PUBLIC_URL` | `https://bp-api.365scores.com` (documentation / logs) |
| `CLOUDFRONT_DISTRIBUTION_ID` | BP public distribution ID |

Redeploy CMS after setting vars. Verify:

- [ ] `GET https://cms-dba.sportifier.com/api/bp` → **404** or blocked (no public runtime)
- [ ] `GET https://cms-dba.sportifier.com/api/bp/promotions` → works for editors
- [ ] Save a test promotion in CMS → BP `/api/bp/meta` `builtAt` updates within seconds

---

## Phase 5 — BP content + end-to-end test

- [ ] Ops creates ≥1 **active** promotion in CMS (`/bp/promotions`)
- [ ] Verify public API:
  ```bash
  curl -s "https://{PUBLIC_HOST}/api/bp/meta"
  # totalVersions > 0

  curl -s "https://{PUBLIC_HOST}/api/bp?uc=3&appType=2&lang=10"
  # flat JSON with BP_Version_Name, Bookies, …
  ```
- [ ] Hand public URL to mobile team for app integration

---

## Phase 6 — Mobile client (dev team — out of DevOps scope)

Mobile apps must call the **public** URL, not cms-dba:

```
GET {PUBLIC_HOST}/api/bp?uc=&appType=&lang=&publisher=&campaign=&lid=
```

Swagger schema: `https://cms-dba.sportifier.com/api-docs` (Runtime section, internal VPN).

---

## Quick reference — two services

| | CMS (internal) | BP runtime (public) |
|--|----------------|---------------------|
| **Image** | Root `Dockerfile` | `bp-service/Dockerfile` |
| **Port** | 3001 | 3002 |
| **MySQL** | read/write | read |
| **MSSQL** | yes (geo picker) | no |
| **Mobile-facing** | no | yes |

---

## Contacts / decisions needed

| Decision | Owner |
|----------|-------|
| Public BP hostname | Product / platform |
| CloudFront distribution setup | DevOps |
| RDS credentials for BP service | DevOps |
| First prod promotions | Ops / marketing |
| Android/iOS wiring to new URL | Mobile team |
