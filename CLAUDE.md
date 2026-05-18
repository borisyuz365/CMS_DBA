# CMS_PROTOTYPE

Internal sports-content CMS used at 365Scores to curate athletes, competitors, competitions, games, venues, TV networks, and a multilingual term dictionary. Prototype stage: JSON files for persistence, no auth, no Docker.

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

## Deploy

Not yet deployed. There is **no** `Dockerfile`, **no** `.github/workflows/`, **no** Helm chart. Productionising requires:
1. Replacing JSON files with a real database
2. Adding auth
3. Containerising and shipping (the sister project `Betting Request Simulator` is a good template — Express serves both the API and the built `dist/`)
