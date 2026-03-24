# Competitors Management — Product Requirements Document (PRD)

**Module:** Competitors List & Competitor Details  
**Version:** 1.0  
**Last Updated:** 2026-03-09  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Competitors Management module is a two-screen CMS product that enables operators to browse, create, edit, and manage competitor entities (teams and clubs). Competitors are a core domain entity tied to sports, countries, competitions, venues, and athletes. This is one of the most feature-rich modules in the system, with extensive server-side filtering, heavy inline editing (7 editable columns including dropdowns and color pickers), and a complex detail page with multiple term categories, dual image management, and a four-tab secondary section.

The module consists of:

- **Competitors List** (`/competitors`) — A server-side filtered, sortable, paginated data table with rich multi-select filter dropdowns (Country, Sport Type, Competition), inline editing of 7 fields (Sport Type, Gender, Country, Competition, Founded, Competitor Type, Colors), bulk operations, CSV export, and competitor creation.
- **Competitor Details** (`/competitors/:id`) — A comprehensive detail view with General Details (media with dual Light/Dark images, a 6-column field grid, 5 boolean toggles) and a four-tab section (Statistics, Squad, Trophies, Colors) with additional fields and toggles.

---

## 2. Competitors List Screen

**Component:** `CompetitorsList` (`frontend/src/pages/CompetitorsList.jsx`)  
**Route:** `/competitors`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Competitors List") and a "Create Competitor" button (top-right). |
| **Filter Panel** | Two rows of filter controls (multi-select dropdowns, text fields, action buttons). |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls. |

### 2.2 Data Loading Strategy

On mount, **only dropdown/reference data** is loaded (not competitors):
- `api.getCountries()`, `api.getCompetitions()`, `api.getLanguages()`, `api.getSports()`, `api.getTerms()`, `api.getCategories()` — via `Promise.allSettled` (individual failures don't block the page).
- Languages are filtered to `lang.isDisplayed === true` for the Language dropdown.

Competitors are loaded **only when the user clicks Search**, via `api.getCompetitorsList(searchFilters)` with server-side filter parameters.

### 2.3 Filter Panel

Two rows of filters with cascading dependencies:

**Row 1:**

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Country** | `Autocomplete` (multi-select) | `md:2.4` | Sends `country` array to API. Changing clears invalid competitions. |
| **Sport Type** | `Autocomplete` (multi-select) | `md:2.4` | Sends `sportType` array to API. Changing clears competition selection. |
| **Competitions** | `Autocomplete` (multi-select) | `md:2.4` | Options filtered by selected sport type AND selected country. Sends `competition` array to API. |
| **Competitor ID** | `TextField` (free text) | `md:2.4` | Sends `competitorId` to API. |

**Row 2:**

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Language** | `Select` (single) | `md:2.4` | Sends `language` (iso2LettersCode) to API. Options: displayed languages only. |
| **Competitor Name** | `TextField` (free text) | `md:2.4` | Sends `competitorName` to API. |
| **Create Short Name** | `Button` (outlined) | `md:2.4` | Shows `({selectedRows.length})`. Currently a **stub** (TODO). |
| **Search** | `Button` (contained) | `md:1.2` | Triggers `api.getCompetitorsList()` with all filter params. |
| **Clear Filters** | `Button` (outlined) | `md:1.2` | Resets all filters and column filters. Does **not** clear table data. |
| **Show Deleted** | `Switch` | `md:1.2` | Triggers **immediate re-search** with the new value (unlike other pages). |

**Filter cascading rules:**
- Changing **Sport Type** → clears Competition selection.
- Changing **Country** → filters out competitions that don't match selected countries; clears invalid ones.
- **Competitions** dropdown is empty until at least one Sport Type is selected.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Edit Mode | Notes |
|---|-------|--------|-----------|-------|
| 0 | — | Checkbox | — | Row selection. |
| 1 | `COMPETITOR_ID` | ID | Not editable | Blue link, opens detail in new tab. |
| 2 | `name` | Name | Not editable | Avatar (from `LIGHT_IMAGE_URL` or `DARK_IMAGE_URL`, fallback `GroupsIcon`) + clickable name → Term Edit Modal ("Competitors Names"). |
| 3 | `shortName` | S. Name | Not editable | If `shortNameClickable && shortValuesCount` → shows clickable count. Otherwise clickable short name. Both open Term Modal. |
| 4 | `sport` | Sport Type | `Select` dropdown | Options from `sports` list. `minWidth: 100`. |
| 5 | `genderName` | Gender | `Select` dropdown | `1` = Male, `2` = Female. |
| 6 | `countryName` | Country | `Select` dropdown | Options from `countries` (with emoji prefix). |
| 7 | `competitionName` | Competition | `Select` dropdown | Options filtered by current row's `SPORT_TYPE_ID` (from pending changes or original). |
| 8 | `FOUNDED` | Founded | `TextField` (number) | Width: `80px`. Parsed via `parseInt`. |
| 9 | `competitorTypeName` | Competitor Type | `Select` dropdown | `1` = Team, `2` = Club. |
| 10 | `HOME_MAIN_COLOR` | Colors | Two color pickers | Home Main + Home Secondary. Uses `numberToHex`/`hexToNumber` conversion. In view mode: two colored boxes (20×20px). |

#### 2.4.2 Column-Level Filtering

Client-side filtering after server results:
- Numeric fields (`COMPETITOR_ID`, `FOUNDED`, `SELECTIONS_RANK`): exact numeric and substring match.
- Date field (`STATISTICS_RESET_DATE`): formats to locale date string, then substring match.
- All others: case-insensitive substring match.

#### 2.4.3 Sorting & Grouping

Standard sorting and grouping via column header icons.

#### 2.4.4 Row Behavior

- **Non-edit mode:** Clicking a row opens detail page in new tab.
- **Edit mode:** Row click disabled.
- **Deleted rows:** Opacity 0.6, gray background.

#### 2.4.5 Empty States

| Condition | Message |
|-----------|---------|
| No competitors loaded | "No competitors found. Use the filters above and click Search to find competitors." |
| Data loaded but no matches | "No competitors match the current page." |

### 2.5 Footer Bar — Actions

| Action | Behavior |
|--------|----------|
| **Edit Mode** | Toggles inline editing for 7 columns. Cancel with unsaved changes shows `window.confirm`. |
| **Save Changes** | Type coercion: `FOUNDED`, `SELECTIONS_RANK`, `MINIMUM_ATHLETES_IN_SQUAD` → `parseInt`; `STATISTICS_RESET_DATE` → `YYYY-MM-DD`. Calls `api.updateCompetitorsBulk()`. |
| **Delete / Restore** | Dynamic. Opens confirmation dialog. |
| **Export to CSV** | File: `competitors_YYYY-MM-DD.csv`. |

### 2.6 Pagination

Standard: 10, 25 (default), 50, 100.

### 2.7 Create Competitor Dialog

`maxWidth="md"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Name** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under "Competitors Names". |
| **Sport Type** | `Select` | Yes | `md:6` | `''` | From `sports` list. |
| **Competitor Type** | `Select` | Yes | `md:6` | `''` | `1` = Team, `2` = Club. |
| **Country** | `Select` | No | `md:6` | `''` | From `countries` (with emoji). |
| **Gender** | `Select` | No | `md:6` | `''` | `1` = Male, `2` = Female. |
| **Main Competition** | `Select` | No | `md:6` | `''` | Filtered by selected Sport Type. Disabled if no sport. |
| **Founded (Year)** | `TextField` (number) | No | `md:6` | `''` | Year integer. |

**Creation flow:**
1. Validate (Name, Sport Type, Competitor Type required).
2. Create Term via `api.createTerm({ category: 'Competitors Names', ... })`.
3. Create competitor via `api.createCompetitor()` with `NAME_ID` from term. All optional fields parsed via `parseInt`.
4. Close dialog, reload competitors, navigate to detail page.

### 2.8 Term Edit Modal

- `initialCategory`: `"Competitors Names"`
- Used for both Name and Short Name clicks.

---

## 3. Competitor Details Screen

**Component:** `CompetitorDetails` (`frontend/src/pages/CompetitorDetails.jsx`)  
**Route:** `/competitors/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" + title ("{sport} Competitor – {name}"). Name is always clickable → Term Modal. |
| **General Details Card** | Three-column layout: dual-image media (left), 6-column field grid (center), 5 boolean toggles (right). "Save & Update In Service" button. |
| **Tabs Section** | Four tabs: Statistics, Squad, Trophies, Colors. |

### 3.2 Data Loading

On mount (and when `id` changes):
1. `api.getCompetitorById(id)` — Loads the competitor.
2. `api.getTerms()` + `api.getCategories()` — For Term Modals.
3. `api.getCountries()` + `api.getCompetitors()` (basic) — For Country and Father Competitor dropdowns.
4. `api.getSports()` — For Sport Type dropdown.
5. `api.getCompetitions()` — For Competition dropdown.
6. `api.getVenues()` — For Venue dropdown.
7. On competitor load: `api.getTermById()` for `SYMBOLIC_NAME` and `TITLE_NAME` terms (if set).

### 3.3 Header Bar

- **Title**: `{competitor.sport || 'Football'} Competitor – {name}`.
- Name is **always** clickable (blue, underlined) → opens Term Modal with `NAME_ID`.

### 3.4 General Details Card

#### 3.4.1 Left Column — Media (fixed 200px on md+)

**Dual image support** — unique to this entity:

| Element | Description |
|---------|-------------|
| **Light Image Avatar** | 72×72px. From `LIGHT_IMAGE_URL`. Fallback: `GroupsIcon` on gray. |
| **Dark Image Avatar** | 72×72px. From `DARK_IMAGE_URL`. Fallback: `GroupsIcon` on gray. |
| **Upload Image** button | Opens Image Edit Dialog with Light/Dark tabs. |
| **Image Version** button | Displays `IMG_VER`. (Display only.) |

#### 3.4.2 Center Column — Fields (6-column responsive grid)

Grid: `0.5fr 0.5fr 1fr 1fr 1fr 1fr` on md.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| **Sport Type** | `SPORT_TYPE_ID` | `Autocomplete` | From `sports`. Changing clears Competition. |
| **Country** | `COUNTRY_ID` | `Autocomplete` (with emoji) | From `countries`. Changing clears Venue. |
| **Competition** | `MAIN_COMPETITION` | `Select` | Filtered by `SPORT_TYPE_ID`. Disabled if no sport. |
| **Competitor Type** | `COMPETITOR_TYPE` | `Select` | `1` = Team, `2` = Club. |
| **Gender** | `GENDER` | `Select` | `1` = Male, `2` = Female. |
| **Founded** | `FOUNDED` | `TextField` (number) | Year. `parseInt` on save. |
| **Selections Rank** | `SELECTIONS_RANK` | `TextField` (number) | **Read-only (disabled)**. |
| **Symbolic Name** | `SYMBOLIC_NAME` | `TextField` (read-only, clickable) | Shows resolved term name or "Add New" placeholder. Click opens Term Modal with category "Symbolic Names". |
| **Title Name** | `TITLE_NAME` | `TextField` (read-only, clickable) | Same as above but category "Title Names". |
| **City** | `CITY_ID` | `Select` | Options from Terms category "Cities". Includes "+ New City" option → opens Term Modal for creation. |
| **Venue** | `VENUE_ID` | `Select` | Filtered by `COUNTRY_ID`. Disabled if no country. Uses `getVenuesByCountry()`. |

**Cascading dependencies:**
- Sport Type change → clears Competition.
- Country change → clears Venue.

#### 3.4.3 Right Column — Boolean Toggles

| Field | Label |
|-------|-------|
| `ENABLE_DASHBOARD_BUZZ` | Enable Dashboard Buzz |
| `HIDE_ON_SEARCH` | Hide on Search |
| `HIDE_ON_CATALOG` | Hide on Catalog |
| `HIDE_PLAYER_GAME_CARD` | Hide Player Game Card |
| `SUPPORT_DASHBOARD` | Support Dashboard |

#### 3.4.4 Save Logic

`handleSave()` performs explicit field-by-field comparison:
- Each field is compared individually against `competitor` (original).
- Color fields: `hexToNumber()` conversion before sending.
- Numeric fields: `parseInt()` for `FOUNDED`, `MINIMUM_ATHLETES_IN_SQUAD`.
- `SELECTIONS_RANK`: **not sent** (read-only).
- Boolean fields: direct value comparison.
- Image URLs: direct string comparison.
- Only changed fields are included in the `changes` object.
- Sent via `api.updateCompetitorsBulk([{ competitorId, changes }])`.

### 3.5 Tabs Section

Four tabs, each with its own content layout:

#### Tab 0 — Statistics

| Field | Type | Notes |
|-------|------|-------|
| `STATISTICS_RESET_DATE` | `TextField` (`type="date"`) | Formatted as `YYYY-MM-DD`. |

#### Tab 1 — Squad

| Field | Type | Notes |
|-------|------|-------|
| `MINIMUM_ATHLETES_IN_SQUAD` | `TextField` (number) | `parseInt` on change. |

Boolean toggles:
- `SHOW_ATHLETES_SALARY` — Show Athletes Salary
- `LINEUP_INSIGHTS_ENABLED` — Lineup Insights Enabled

#### Tab 2 — Trophies

Boolean toggle only:
- `SHOULD_SHOW_TROPHIES` — Should Show Trophies

#### Tab 3 — Colors

6 color pickers in a responsive grid (`repeat(6, 1fr)` on lg):

| Field | Label |
|-------|-------|
| `HOME_MAIN_COLOR` | Home Main |
| `HOME_SECONDARY_COLOR` | Home Secondary |
| `AWAY_MAIN_COLOR` | Away Main |
| `AWAY_SECONDARY_COLOR` | Away Secondary |
| `THIRD_COLOR` | Third Color |
| `SHOT_CHART_COLOR` | Shot Chart Color |

All colors stored as integers in the database. Displayed/edited as hex (`#RRGGBB`). Converted via `numberToHex()`/`hexToNumber()`.

### 3.6 Image Edit Dialog

`maxWidth="sm"`, `fullWidth`. Unique feature: **tabbed dialog for Light/Dark images**.

| Element | Description |
|---------|-------------|
| **Tabs** | "Light Image" / "Dark Image" — switching tabs loads the respective URL. |
| **Image URL field** | `type="url"`. Helper text: "Enter the URL of the image". |
| **Preview** | 200px container, `objectFit: contain`. |
| **Save** | Updates `LIGHT_IMAGE_URL` or `DARK_IMAGE_URL` via `api.updateCompetitorsBulk()`. |

### 3.7 Term Edit Modal — Multi-Category Support

The detail page uses the Term Modal for **multiple categories**, determined by context:

| Trigger | Category | Behavior |
|---------|----------|----------|
| Header name click | `"Competitors Names"` | Edits the competitor's main name term. |
| Symbolic Name field | `"Symbolic Names"` | Edits or creates a new symbolic name term. |
| Title Name field | `"Title Names"` | Edits or creates a new title name term. |
| City "+ New City" | `"Cities"` | Creates a new city term; auto-selects on save. |

On save, the modal handler checks if the saved term matches a known category and auto-updates the relevant form field (e.g., `CITY_ID`, `SYMBOLIC_NAME`, etc.).

### 3.8 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** | Centered `LoadingSpinner`. |
| **Error** | `Alert` (error) + "Back to List" button. |
| **Not Found** | `Alert` (warning, "Competitor not found") + "Back to List" button. |

---

## 4. API Endpoints

### 4.1 Competitor Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/competitors?{filters}` | Get competitors with server-side filters (`country`, `sportType`, `competition`, `competitorId`, `competitorName`, `language`, `showDeleted`). Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/competitors/:id` | Get a single competitor. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/competitors` | Create a new competitor. Body: `{ NAME_ID, SPORT_TYPE_ID, COMPETITOR_TYPE, ... }`. | List (Create Dialog) |
| `PUT` | `/competitors/bulk` | Bulk update. Body: `{ updates: [{ competitorId, changes }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Save), Details (Save, Image Save), List (Delete/Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/data/countries` | Basic country reference data. | List + Details (Dropdowns) |
| `GET` | `/data/competitors` | Basic competitor reference data. | Details (Father Competitor) |
| `GET` | `/data/sports` | Sports reference data. | List + Details (Dropdowns) |
| `GET` | `/data/competitions` | Competitions reference data. | List + Details (Dropdowns) |
| `GET` | `/data/languages` | Languages (filtered to `isDisplayed`). | List (Language filter) |
| `GET` | `/data/venues` | Venues reference data. | Details (Venue dropdown) |
| `GET` | `/terms`, `/terms/:id` | Terms. | List + Details (Term Modals) |
| `PUT` | `/terms/:id`, `POST /terms` | Term CRUD. | List + Details (Term Modals) |
| `GET` | `/categories`, `POST /categories` | Categories. | List + Details (Term Modals) |

---

## 5. Data Model

### 5.1 Competitor Entity

#### Core Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `COMPETITOR_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | FK to Term (category: "Competitors Names"). |
| `name` | String | Yes | Enriched display name (server-resolved). |
| `shortName` | String | Yes | Short display name. |
| `shortNameClickable` | Boolean | Yes | Whether short name should show clickable count. |
| `shortValuesCount` | Integer | Yes | Count of short name values. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. |
| `IMG_VER` | Integer | Yes | Image version counter. |

#### General Details

| Field | Type | Description |
|-------|------|-------------|
| `SPORT_TYPE_ID` | Integer | FK to Sport Type. |
| `COUNTRY_ID` | Integer | FK to Country. |
| `MAIN_COMPETITION` | Integer | FK to Competition (filtered by sport). |
| `COMPETITOR_TYPE` | Integer | `1` = Team, `2` = Club. |
| `GENDER` | Integer | `1` = Male, `2` = Female. |
| `FOUNDED` | Integer | Year founded. |
| `FATHER_COMPETITOR` | Integer | FK to parent competitor. |
| `CAPTAIN` | Integer | Captain reference. |
| `CITY_ID` | Integer | FK to Term (category: "Cities"). |
| `VENUE_ID` | Integer | FK to Venue (filtered by country). |
| `FEDERATION_TERM_ID` | Integer | FK to Federation term. |
| `SELECTIONS_RANK` | Integer | Read-only rank. |
| `SYMBOLIC_NAME` | Integer | FK to Term (category: "Symbolic Names"). |
| `TITLE_NAME` | Integer | FK to Term (category: "Title Names"). |

#### Images

| Field | Type | Description |
|-------|------|-------------|
| `LIGHT_IMAGE_URL` | String | Light theme image URL. |
| `DARK_IMAGE_URL` | String | Dark theme image URL. |

#### Colors (stored as integers)

| Field | Description |
|-------|-------------|
| `HOME_MAIN_COLOR` | Home kit main color. |
| `HOME_SECONDARY_COLOR` | Home kit secondary color. |
| `AWAY_MAIN_COLOR` | Away kit main color. |
| `AWAY_SECONDARY_COLOR` | Away kit secondary color. |
| `THIRD_COLOR` | Third kit color. |
| `SHOT_CHART_COLOR` | Shot chart color. |

#### Statistics & Squad

| Field | Type | Description |
|-------|------|-------------|
| `STATISTICS_RESET_TYPE` | String/Integer | Statistics reset type. |
| `STATISTICS_RESET_DATE` | Date | Statistics reset date (`YYYY-MM-DD`). |
| `MINIMUM_ATHLETES_IN_SQUAD` | Integer | Minimum athletes required. |

#### Boolean Toggles

| Field | Description |
|-------|-------------|
| `ENABLE_DASHBOARD_BUZZ` | Enable dashboard buzz feature. |
| `HIDE_ON_SEARCH` | Hide from search results. |
| `HIDE_ON_CATALOG` | Hide from catalog. |
| `HIDE_PLAYER_GAME_CARD` | Hide player game card. |
| `SUPPORT_DASHBOARD` | Support dashboard feature. |
| `SHOW_ATHLETES_SALARY` | Show athletes salary info. |
| `SHOULD_SHOW_TROPHIES` | Show trophies section. |
| `LINEUP_INSIGHTS_ENABLED` | Enable lineup insights. |
| `CONNECT_BY_TEXT` | Connect by text feature. |

---

## 6. User Flows

### 6.1 Search Competitors

1. User navigates to `/competitors`. Table is empty; dropdown data loads.
2. User selects Country, Sport Type, Competition filters (cascading), and/or enters ID/Name.
3. User clicks **Search**. API returns server-filtered results.
4. Column-level filters, sorting, grouping applied client-side.

### 6.2 Create a New Competitor

1. User clicks **Create Competitor**.
2. Fills in Name, Sport Type, Competitor Type (all required).
3. Optionally sets Country, Gender, Main Competition (filtered by sport), Founded.
4. System creates Term + competitor. Navigates to detail page.

### 6.3 Inline Edit (List)

1. User clicks **Edit Mode**.
2. 7 columns become editable: Sport Type, Gender, Country, Competition, Founded, Competitor Type, Colors.
3. Competition dropdown dynamically filters based on the row's current/pending Sport Type.
4. Color fields show dual color pickers (Home Main + Home Secondary).
5. User saves; changes are type-coerced and bulk-updated.

### 6.4 Edit Competitor Details

1. User navigates to `/competitors/:id`.
2. Modifies fields in General Details (with cascading: sport→competition, country→venue).
3. Uses tabbed section for Statistics (date), Squad (number + booleans), Trophies (boolean), Colors (6 pickers).
4. Clicks **Save & Update In Service**.

### 6.5 Manage Competitor Images

1. User clicks **Upload Image** on detail page.
2. Tabbed dialog: "Light Image" / "Dark Image".
3. Enters URL, sees preview, saves.

### 6.6 Edit Terms (Multiple Categories)

1. **Name**: Click competitor name → Term Modal ("Competitors Names").
2. **Short Name**: Click S. Name column → Term Modal ("Competitors Names").
3. **Symbolic Name**: Click field on detail page → Term Modal ("Symbolic Names").
4. **Title Name**: Click field on detail page → Term Modal ("Title Names").
5. **City**: Select "+ New City" → Term Modal ("Cities"). Auto-selects on save.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Loading indicator. |
| `Alert` | `reuse/Alert` | Error/warning display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-category term editing. |
| `api` | `services/api` | Centralized API client. |

---

## 8. UI / UX Specifications

### 8.1 Design System

- **Font family:** `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
- **Primary color:** `#1976d2`
- **Success color:** `#4caf50` / `#15803d`
- **Danger color:** `#d32f2f`
- **Background:** `#f5f5f5` (page), `#ffffff` (cards/table)
- **Table borders:** `#EAECF0` (both horizontal and vertical `borderRight`)

### 8.2 Color Handling

Colors are stored as **integers** in the database and displayed/edited as **hex strings** (`#RRGGBB`):
- `numberToHex(num)`: `num.toString(16).padStart(6, '0').toUpperCase()` → `#RRGGBB`.
- `hexToNumber(hex)`: `parseInt(hex.replace('#', ''), 16)` → integer.

In the list view, colors display as **colored boxes** (20×20px). In edit mode, `type="color"` pickers.

### 8.3 Key Behavioral Differences from Other Entity Pages

| Behavior | Competitors | Most Other Entities |
|----------|-------------|---------------------|
| **Server-side filtering** | Filters (country, sport, competition, ID, name, language, showDeleted) sent to API. | Most pages load all data then filter client-side. |
| **Filter cascading** | Sport→Competition, Country→Competition (list); Sport→Competition, Country→Venue (detail). | Rare or no cascading. |
| **Show Deleted toggle** | Triggers **immediate re-search** via API. | Client-side filter only. |
| **Multi-select Autocomplete filters** | Country and Sport Type use MUI `Autocomplete` with `multiple`. | Most use simple `Select` or `TextField`. |
| **Inline editable columns** | 7 columns (most of any list page): dropdowns, number, dual color pickers. | Typically 2–3 checkbox toggles. |
| **Dual image management** | Light Image + Dark Image with tabbed dialog. | Single image or no image. |
| **Multi-category Term Modal** | 4 categories: Competitors Names, Symbolic Names, Title Names, Cities. | Typically 1 category. |
| **Detail page tabs** | 4 tabs (Statistics, Squad, Trophies, Colors). | 0–1 tabs. |
| **Create dialog size** | `maxWidth="md"` with 3 required fields. | `maxWidth="sm"` typically. |
| **Create Short Name button** | Present in filter panel (stubbed/TODO). | Not present. |

### 8.4 Known Limitations & TODOs

- **Create Short Name**: The "Create Short Name" button in the filter panel is a stub (`TODO`). Currently logs to console and shows a `window.confirm` placeholder.
