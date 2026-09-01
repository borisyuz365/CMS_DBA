# CMS_PROTOTYPE

Internal sports-content CMS used at 365Scores to curate athletes, competitors, competitions, games, venues, TV networks, and a multilingual term dictionary. Core entities are still prototype stage: JSON files for persistence, no auth. The newer DBA/BP ad-template features (`dba_templates`, `bp_promotions`, etc.) have since moved to MySQL and gained a real Docker + CI/CD deploy pipeline to production — see Deploy below.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18.2, React Router v6, Vite 5, MUI v5 (Material-UI) + Emotion, dayjs |
| Backend | Node.js, Express 4.18, dotenv, cors, xlsx |
| Storage | JSON files in `backend/data/` |
| State mgmt | React hooks + URL query params (`useUrlFilters`). No Redux/Zustand. |

## Layout

```
CMS_PROTOTYPE/
├── package.json             # orchestrates frontend + backend (concurrently)
├── backend/
│   ├── server.js            # Express entry; port 3001
│   ├── routes/              # 19 route files, mounted under /api/*
│   ├── controllers/         # 22 controllers — business logic per entity
│   ├── utils/
│   │   ├── dataLoader.js    # async JSON read/write
│   │   ├── dictionaryStorage.js  # sync read/write for terms.json
│   │   └── coralogix.js     # external logging
│   ├── data/                # 135+ JSON files (the "database")
│   │   ├── schemas/         # 40+ JSON schemas with default values
│   │   └── temp/            # staging dir for bulk imports
│   └── scripts/             # importGameUpdatesFromExcel.js etc.
└── frontend/
    ├── vite.config.js       # /api/* → http://localhost:3001
    ├── src/
    │   ├── main.jsx         # entry; mounts <App />
    │   ├── App.jsx          # 30+ routes (one page lazy-loaded)
    │   ├── pages/           # 32 page components
    │   ├── components/      # MUI-based UI building blocks
    │   ├── services/api.js  # fetch wrapper, base = /api
    │   ├── hooks/           # useUrlFilters, ...
    │   └── theme.js         # MUI theme (primary #1976d2, success #2e7d32)
    └── reuse/               # globally shared widgets (DataTable, Sidebar, Breadcrumb)
```

## Running locally

```bash
# From repo root
npm run install:all   # installs root, backend, frontend
npm run both          # backend :3001, frontend :3000 (color-tagged output)
npm run kill          # kills node/npm/vite processes

# Or run individually
cd backend && npm start
cd frontend && npm run dev
```

## API surface (`/api/*`)

Mounted in `backend/server.js`:

| Path | Resource |
|------|----------|
| `/api/athletes` | Players — CRUD + nested `contracts`, `injuries`, `suspensions`, `statistics`, `trophies` |
| `/api/competitors` | Teams (clubs / national teams) |
| `/api/competitions` | Tournaments |
| `/api/games` | Fixtures |
| `/api/venues` | Stadiums |
| `/api/tv-networks` | Broadcast metadata |
| `/api/countries`, `/api/sports`, `/api/languages`, `/api/time-zones`, `/api/cities` | Reference data |
| `/api/data` | Competition / season / stage schemas with defaults |
| `/api/terms` | Multilingual dictionary (the foundation of name display) |
| `/api/filters`, `/api/scanners`, `/api/priorities` | Governance / data-quality config |
| `/api/health` | Health check |

CORS is enabled globally. No auth middleware.

## Data layer

All persistence is **JSON files** under `backend/data/`:

- **Entity data** (athletes, competitors, games, venues, tv_networks, ...)
- **Athlete relations** (`athlete_contracts.json`, `athlete_injuries.json`, `athlete_suspensions.json`, `athlete_statistics.json`, `athlete_trophies.json`)
- **Competition hierarchy** (competitions → seasons → stages → phases → groups)
- **Reference** (countries, sports, languages, time_zones, data_sources)
- **Dictionary** (`terms.json` ≈ 62k lines; `categories.json`)
- **Schemas** (`backend/data/schemas/*.schema.json`) — drive create-dialog defaults

Async access goes through `utils/dataLoader.js`. The dictionary uses synchronous read/write via `utils/dictionaryStorage.js` because it's hot-path on every entity render.

### Term resolution

Every entity stores names as foreign-key IDs (`NAME_ID`, `SHORT_NAME_ID`, etc.) into `terms.json`. Controllers resolve them on the way out with a consistent fallback order:

```
engValue → English → default → approved → first
```

If you add a new entity controller, follow that same priority chain.

## Frontend patterns

- **Routing**: `App.jsx` defines all routes with `BrowserRouter`. Only `CompetitionDetails` is lazy-loaded.
- **Layout**: `Sidebar` (reuse/) + main content area. `Breadcrumb` reflects URL.
- **Lists**: `DataTable` (reuse/) handles sorting, pagination, row selection.
- **Detail pages**: Tabs for nested relations. Athletes have tabs for Contracts / Injuries / Suspensions / Statistics / Trophies.
- **Editing**: Inline edit-with-save-cancel, plus modal dialogs (`ContractDialog`, `InjuryDialog`, `StatisticsDialog`, `TrophyDialog`) for creating relations.
- **Filters**: `useUrlFilters` syncs filter state to URL query params — list pages are bookmarkable.

## Bulk imports

CSV/Excel importers in `backend/scripts/`:

- `importGameUpdatesFromExcel.js`
- `importTvNetworksFromCsv.js`

They parse with `xlsx`, transform, and stage to `data/temp/` before promoting to the real JSON files.

## Configuration

- Backend: `process.env.PORT` (default 3001), `.env` (gitignored)
- Frontend: hardcoded `/api` base in `services/api.js`; Vite proxies it to `:3001` in dev
- No environment-specific config files committed

### Bet365 / context-aware affiliate links

GAM creatives for Bet365 (`bmid=14`) use **payload-time** resolution (legacy 1X2 parity) — **option B**:

1. **No `cta_url`.** Declare **`OS_Type`** only (optional if `User_OS` pattern is present). `Pricing=Sponsorship` and `Top_Order_Logic=Popularity` are baked.
2. Anchor is `href="#"` + `data-payload-link` + `data-click-tracker="%%CLICK_URL_UNESC%%"`.
3. `.matches` gets a baked `data-feed` base (`cid`/`bmid`/`lang`/`placment`) plus targeting `data-*` attrs (`os` / `user-os`, `network=%%PATTERN:AttNw%%`, `campaign`, baked price/order, `maturity`, `scope`, `competitors`).
4. `dba-runtime` builds GetPayload with `encodeURIComponent` per value (legacy `dba_service_url` parity), prefers `User_OS` when `OS_Type` is empty, and only forwards `Scope` when it matches the placement (MPU→`TopList AS`, Banner→`InList AS`, Interstitial→never). Then stores `Bookie.Link` and opens `CLICK_URL + encodeURIComponent(link)` on click.

Non-Bet365 creatives keep a static CMS variant affiliate as `[%cta_url%]` — unchanged.

| Variable | Purpose | Default |
|----------|---------|---------|
| `PAYLOAD_LINK_BMIDS` | Bmids that take `Bookie.Link` from GetPayload (falls back to `CONTEXT_AWARE_BMIDS`) | `14` |
| `FEED_BASE_URL` | AdsGenerator host for `data-feed` | `https://bettingads.365scores.com` |
| `LINK_BASE_URL` | Optional host for debug `/api/dba/links/*` only (not used on Bet365 CTA export) | — |

Debug (optional Sportifier/Targetings tools, not the live CTA path): `GET /api/dba/links/resolve?bmid=14&cid=21&lang=1`.

## Deploy

Has a real pipeline now — don't take "prototype" at face value here. The DBA/BP ad-template features ship a Docker + CI/CD deploy that builds and deploys this repo's backend + frontend as one image, alongside a second, split-out microservice:

- **Two Dockerfiles**: root `Dockerfile` (multi-stage — builds the Vite frontend, bakes `dist/` into the Express image; `server.js` serves it via static + SPA fallback) and `bp-service/Dockerfile` (the split-out public BP runtime microservice, port 3003 — build context must be the repo root, so use `scripts/build-bp-runtime.sh` rather than `docker build` from inside `bp-service/`).
- **Two manual GitHub Actions workflows**, both `workflow_dispatch`-only (no auto-deploy on push/merge — every prod deploy is a human picking an environment and clicking "Run workflow"): `.github/workflows/build-and-deploy-dba.yml` → GitHub Environment `cms-dba-prod`, and `build-and-deploy-bp.yml` → `cms-bp-prod`.
- **Target: AWS EKS via Helm, not ECS.** Both push to ECR and deploy via reusable workflows from the org repo `365Scores/workflows` (`BuildNPushContainer.yml` + `DeployToEKS.yml`, pinned `@v1.1.12`). The Helm chart itself lives in a separate repo, **`CMS.Helm`** — it is not in this repo. Prod AWS account `509962170850`, region `us-east-1`.
- **MySQL (RDS)** now backs the DBA/BP tables (`dba_templates`, `bp_promotions`, `bp_bookies`, `dba_service_state`, `dba_audit_log`, ...) — a real DB, separate from the legacy JSON-file entities below. Schema/seed are **not** applied automatically on boot; see `docs/DEVOPS-RDS-BOOTSTRAP.md`.
- Runbooks: `docs/DEVOPS-NEXT-STEPS.md` (rollout checklist), `docs/DEVOPS-RDS-BOOTSTRAP.md` (MySQL provisioning), `docs/DEVOPS-BP-RUNTIME.md` (BP env vars, network rules — includes an explicit "never expose `GET /api/bp` publicly on the CMS hostname" guardrail).
- Still genuinely missing: app-level auth (relies entirely on network/VPN perimeter), CI test/lint gating before deploy, DB migration automation, and a finalized public hostname + CloudFront distribution for BP (still TBD in the docs as of the last deploy-infra work).

The **core entity CRUD** (athletes/competitors/competitions/etc.) is unaffected by any of this — it still has no auth and no real DB of its own. Productionising *that* part still requires replacing its JSON files with a real database and adding auth.
