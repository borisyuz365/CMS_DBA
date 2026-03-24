# Sports Management — Product Requirements Document (PRD)

**Module:** Sports List & Sport Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Sports Management module is a two-screen CMS product that enables operators to browse, search, create, edit, and manage sport type entities. Sports are a core reference entity that defines game rules, display settings, table scoring configurations, and various feature toggles for each sport type across the platform. The module is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Sports List** (`/sports`) — A filterable, sortable, paginated data table with inline editing (Displayed, Allow Athlete Search), bulk operations (delete/restore), CSV export, and sport creation.
- **Sport Details** (`/sports/:id`) — A comprehensive detail view organized into two sections: General Details (media, numeric fields, and ~20 boolean toggles) and Table Settings (point configuration, scoring rules, and a drag-and-drop table order parameter list).

---

## 2. Sports List Screen

**Component:** `SportsList` (`frontend/src/pages/SportsList.jsx`)  
**Route:** `/sports`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Sports List") and a "Create Sport" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls. |

### 2.2 Data Loading Strategy

- **Auto-loads on mount.** All sports are loaded immediately via `api.getSportsList()`.
- On mount, two parallel loads are initiated:
  - `api.getSportsList()` — All sport entities.
  - `api.getTerms()` + `api.getCategories()` via `Promise.all` — For Term Edit Modal.
- The **Search** button re-triggers `api.getSportsList()` (full reload).
- Top-level filters (Sport ID, Sport Name) are applied **client-side** on the loaded dataset.

### 2.3 Filter Panel

Two filter controls plus action buttons:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Sport ID** | `TextField` (free text) | `md:2.4` | Exact string match on `SPORT_TYPE_ID`. Applied client-side. |
| **Sport Name** | `TextField` (free text) | `md:2.4` | Case-insensitive substring match on `ALIAS_NAME`. Applied client-side. |

Action buttons:

- **Search** (`md:1.2`) — Re-fetches all sports from API.
- **Clear Filters** (`md:1.2`) — Resets all filter values and column filters.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF, rows where `IS_DELETED === true` are hidden.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection. Header supports select-all / indeterminate. | Same. |
| 1 | `SPORT_TYPE_ID` | ID | 70px | Blue link (`#1976d2`, `fontWeight: 500`). Click opens detail page in new tab. | Same (not editable). |
| 2 | `ALIAS_NAME` | Name | 15ch | Avatar (from `SPORT_IMAGE_URL`, or blue `SportsSoccerIcon` fallback) + clickable name. If `NAME_ID` exists, click opens **Term Edit Modal** under category "Sport Type names". Otherwise, click opens detail page. | Same (not inline-editable). |
| 3 | `IS_DISPLAYED` | Displayed | 90px | "Yes" / "No". | Inline `Checkbox`. |
| 4 | `GAME_DURATION` | Duration | 80px | Numeric value or `"-"`. | Same (not editable inline). |
| 5 | `RECOGNITION_TIME_SPAN` | Recognition Time | 110px | Numeric value or `"-"`. | Same. |
| 6 | `MATCH_REMINDER_TIME` | Match Reminder | 120px | Numeric value or `"-"`. | Same. |
| 7 | `MINIMUM_ATHLETES_IN_SQUAD` | Min in Squad | 95px | Numeric value or `"-"`. | Same. |
| 8 | `MINIMUM_ATHLETES_IN_LINEUPS` | Min in Lineups | 105px | Numeric value or `"-"`. | Same. |
| 9 | `ALLOW_ATHLETE_SEARCH` | Allow Athlete Search | 110px | "Yes" / "No". | Inline `Checkbox`. |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter" (height: 32px). Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- Numeric fields (`SPORT_TYPE_ID`, `TABLE_DEF_WINNER_POINTS`, `TABLE_DEF_DRAW_POINTS`, `TABLE_DEF_LOSER_POINTS`, `GAME_DURATION`, `RECOGNITION_TIME_SPAN`, `MATCH_REMINDER_TIME`, `MINIMUM_ATHLETES_IN_SQUAD`, `MINIMUM_ATHLETES_IN_LINEUPS`) support exact numeric and substring match.

#### 2.4.3 Sorting

Standard sorting: click toggles asc/desc. Single active field. Strings use `localeCompare`; numbers use arithmetic. Nulls pushed to end. Active: blue; inactive: gray.

#### 2.4.4 Grouping

Standard grouping via `ViewListIcon`. Collapsible groups with count. Expand/collapse via icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/sports/{id}`).
- **Edit mode:** Row click disabled.
- **Deleted rows:** Opacity 0.6, gray background/text.
- **Selected rows:** Blue `#E3F2FD` background.

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined/Contained blue | Always visible | Toggles inline editing. Cancel with unsaved changes shows `window.confirm`. |
| **Save Changes** | Contained green (`#4caf50`) | Edit mode only | Sends `api.updateSportsBulk(updates)`. Shows pending count. Disabled if no changes. |
| **Delete / Restore** | Red/Green | Always; disabled if no selection | Dynamic based on selection. Opens confirmation dialog. Calls `api.deleteSports()` or `api.restoreSports()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected or all to CSV. File: `sports_YYYY-MM-DD.csv`. |

### 2.6 Pagination

Standard: 10, 25 (default), 50, 100. Previous/Next buttons. Resets on filter change.

### 2.7 Create Sport Dialog

Triggered by "Create Sport". Dialog: `maxWidth="sm"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Sport Name (ALIAS_NAME)** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under category "Sport Type names" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Win Points** | `TextField` (number) | No | `xs:6` | `3` | `TABLE_DEF_WINNER_POINTS`. |
| **Draw Points** | `TextField` (number) | No | `xs:6` | `1` | `TABLE_DEF_DRAW_POINTS`. |
| **Loss Points** | `TextField` (number) | No | `xs:6` | `0` | `TABLE_DEF_LOSER_POINTS`. |
| **Draw exists** | `Checkbox` | No | `xs:6` | `true` | `TABLE_DEF_IS_EVEN_EXISTS`. |
| **Displayed** | `Checkbox` | No | `xs:6` | `true` | `IS_DISPLAYED`. |
| **Image Version** | `TextField` (number) | No | `xs:6` | `1` | `IMG_VER`. |

**Creation flow:**
1. Validate form (ALIAS_NAME required).
2. Create Term via `api.createTerm({ category: 'Sport Type names', values: [...] })`.
3. Create sport via `api.createSport(payload)` with `NAME_ID` from term.
4. Close dialog, reload sports, navigate to detail page (`/sports/{newId}`).

### 2.8 Term Edit Modal

- `initialCategory`: `"Sport Type names"`
- `onSave`/`onSaveAndUpdate`: Updates term then reloads sports list.

### 2.9 Snackbar Notifications

Top-right, 6000ms auto-hide. Triggered on all CRUD operations.

---

## 3. Sport Details Screen

**Component:** `SportDetails` (`frontend/src/pages/SportDetails.jsx`)  
**Route:** `/sports/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + title ("Sport – {ALIAS_NAME}"). Clickable name opens Term Edit Modal. |
| **General Details Card** | Three-column layout: media (left), numeric fields (center), boolean toggles (right). Own "Save & Update In Service" button. |
| **Table Settings Card** | Tabbed panel with Point Configuration, Scoring Rules, and Table Order Parameters. Own "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` changes):
1. `api.getSportById(id)` — Loads the sport entity.
2. `api.getTerms()` + `api.getCategories()` — For Term Edit Modal.
3. `api.getTableSettings()` — Loads table setting field options for the order-by dropdown.

When the sport object loads, `formData` is initialized as a shallow copy of the entire sport object.

### 3.3 Header Bar

- **Back to List**: Navigates to `/sports`.
- **Title**: `variant="h4"`, `fontWeight: 700`. Format: `Sport – {ALIAS_NAME}`.
  - If `NAME_ID` exists, name is clickable (blue, underlined) → opens Term Edit Modal.

### 3.4 General Details Card

Three-column responsive layout:

#### 3.4.1 Section Header

- Title: "General Details" (`variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (green `#15803d`).

#### 3.4.2 Left Column — Media (fixed 200px on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. `SPORT_IMAGE_URL` if available; otherwise first letter of `ALIAS_NAME` on gray background. |
| **Label** | "Sport Image" (0.7rem). |
| **Upload Image** button | Blue, full width. Opens Image Edit Dialog. |
| **Image Version** button | Blue, full width. Displays `IMG_VER`. (Display only.) |

#### 3.4.3 Center Column — Numeric Fields (max-width 320px, single column grid)

Fields are dynamically rendered from `GENERAL_DETAILS_ALL_KEYS`, filtered to exclude booleans:

| Field | Label | Type |
|-------|-------|------|
| `GAME_DURATION` | Game Duration | Number |
| `RECOGNITION_TIME_SPAN` | Recognition Time Span | Number |
| `MATCH_REMINDER_TIME` | Match Reminder Time | Number |
| `MINIMUM_ATHLETES_IN_SQUAD` | Minimum Athletes in Squad | Number |
| `MINIMUM_ATHLETES_IN_LINEUPS` | Minimum Athletes in Lineups | Number |

Fields use auto-detection: if the value is numeric, renders `type="number"`; otherwise `type="text"`.

#### 3.4.4 Right Column — Boolean Toggles (4-column grid on md+)

Dynamically rendered from `GENERAL_DETAILS_ALL_KEYS`, filtered to booleans only:

| Field | Label |
|-------|-------|
| `IS_DISPLAYED` | Displayed |
| `ALLOW_ATHLETE_SEARCH` | Allow Athlete Search |
| `NUMBER_OF_STARTING_PLAYERS` | Number of Starting Players |
| `NOTIFY_LINEUPS` | Notify Lineups |
| `REQUIRE_FORMATION` | Require Formation |
| `SHOW_SCORE_BOARD` | Show Score Board |
| `SHOW_MARKET_VALUE` | Show Market Value |
| `SHOW_PLAYERS_STATISTICS` | Show Players Statistics |
| `SHOW_MISSING_PLAYERS_WIDGET` | Show Missing Players Widget |
| `SHOW_ATHLETE_CARD_NEXT_GAME` | Show Athlete Card (Next Game) |
| `SHOW_ATHLETE_CARD_PREDICTONS` | Show Athlete Card (Predictions) |
| `LMT_SHOW_AFTER_FINISHED` | Show After Finished |
| `SHOW_TOP_PERFORMERS_PRE_MATCH` | Show Top Performers (Pre-Match) |
| `SHOW_TOP_PERFORMERS_LIVE` | Show Top Performers (Live) |
| `SHOW_TOP_PERFORMERS_POST_MATCH` | Show Top Performers (Post-Match) |
| `IS_SUPPORT_TRENDS` | Support Trends |
| `SUPPORTS_COMPETITION_BET_LINES` | Supports Competition Bet Lines |
| `IS_GAME_SUMMARY_ENABLE` | Game Summary Enabled |
| `SUPPORTS_PROPS` | Supports Props |
| `IS_VISIBLE_FOR_ENTITIES_SEARCH` | Visible for Entities Search |

Each rendered as `Checkbox` with `FormControlLabel`.

#### 3.4.5 General Details Save Logic

`handleSaveGeneralDetails()`:
1. Calls `buildChanges(GENERAL_DETAILS_ALL_KEYS)` which compares each field in `formData` against original `sport` using `JSON.stringify` comparison.
2. `ORDER_BY` values are serialized/deduplicated before comparison.
3. Only changed fields are sent via `api.updateSportsBulk([{ sportTypeId, changes }])`.
4. Sport reloaded on success.

### 3.5 Table Settings Card

Rendered inside a `Paper` with a `Tabs` component (currently single tab: "Table Settings").

#### 3.5.1 Left Half — Point Configuration (4-column grid, 18ch per column)

| Field | Label | Type |
|-------|-------|------|
| `TABLE_DEF_WINNER_POINTS` | Winner Points | Number |
| `TABLE_DEF_DRAW_POINTS` | Draw Points | Number |
| `TABLE_DEF_LOSER_POINTS` | Loser Points | Number |
| `TABLE_WIN_AFTER_EX_POINTS` | Win After Extra Time (Points) | Number |
| `TABLE_LOS_AFTER_EX_POINTS` | Loss After Extra Time (Points) | Number |
| `TABLE_WIN_AFTER_PEN_POINTS` | Win After Penalties (Points) | Number |
| `TABLE_LOS_AFTER_PEN_POINTS` | Loss After Penalties (Points) | Number |

#### 3.5.2 Left Half — Scoring Rules (below point config)

| Field | Label | Type |
|-------|-------|------|
| `TABLE_DEF_IS_EVEN_EXISTS` | Draw (Even) Exists | Checkbox |
| `TABLE_COUNT_ET_SCORE` | Count Extra Time in Score | Checkbox |
| `TABLE_COUNT_PEN_SCORE` | Count Penalties in Score | Checkbox |

#### 3.5.3 Right Half — Table Order Parameters

An interactive, drag-and-drop reorderable list that defines the sort priority for competition standings tables.

**ORDER_BY format:** Stored as a comma-separated string of `field:direction` pairs. Example: `"POINTS:desc,GOAL_DIFF:desc,GOALS_FOR:desc"`.

**Parsing/Serialization:**
- `parseOrderBy(str)` — Splits by `,`, then by `:` into `{ field, direction }` objects. Default direction: `desc`.
- `serializeOrderBy(arr)` — Joins back to comma-separated `field:direction` string.
- `deduplicateOrderByList(arr)` — Removes duplicate fields (keeps first occurrence).

**UI Components:**

| Element | Description |
|---------|-------------|
| **Current Order List** | `List` component with numbered items. Each item shows: drag handle (`DragIndicatorIcon`), field label (resolved from table settings options), direction ("Descending"/"Ascending"), and a red delete button. |
| **Drag-and-Drop** | Items are draggable via the `DragIndicatorIcon`. Uses HTML5 drag-and-drop API (`onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`). Visual feedback: dragged item gets `scale(1.02)` + shadow; drop target gets blue top border. |
| **Add New Parameter** | Two `Select` dropdowns (field selector + direction) and an "Add" button. Field options are loaded from `/data/table-settings` (first row's keys, excluding meta keys). Already-used fields are filtered out. |
| **Empty State** | "No order parameters defined" message. |

**Field options** are dynamically loaded from `api.getTableSettings()`:
- Takes the first row from the response.
- Extracts all keys except `TABLE_SETTING_ID`, `ORDER_DIRECTION`, `INNER_TABLE`.
- Labels are auto-generated via `formatTableSettingKeyAsLabel()` (splits by `_`, capitalizes each word).

#### 3.5.4 Table Settings Save Logic

`handleSaveTableSettings()`:
1. Calls `buildChanges(TABLE_SETTINGS_ALL_KEYS)` comparing all table setting fields + `ORDER_BY`.
2. Only changed fields sent via `api.updateSportsBulk()`.
3. Sport reloaded on success.

### 3.6 Image Edit Dialog

Standard dialog (`maxWidth="sm"`, `fullWidth`):

| Element | Description |
|---------|-------------|
| **Title** | "Upload / Edit Image" |
| **Image URL field** | `type="url"`. Helper text: "Enter the URL of the sport logo/image". |
| **Preview** | 200px container, `objectFit: contain`. |
| **Save** | Updates `SPORT_IMAGE_URL` via `api.updateSportsBulk()`. |

### 3.7 Term Edit Modal

- `initialCategory`: `"Sport Type names"`
- On save: updates term, reloads sport.

### 3.8 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no sport yet) | Centered `LoadingSpinner`. |
| **Error** | `Alert` (error) + "Back to List" button. |
| **Not Found** | `Alert` (warning, "Sport not found") + "Back to List" button. |

---

## 4. API Endpoints

### 4.1 Sport Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/sports` | Get all sports (enriched). Returns `{ data: [...] }`. | List (Load) |
| `GET` | `/sports/:id` | Get a single sport by `SPORT_TYPE_ID`. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/sports` | Create a new sport. Body: `{ NAME_ID, ALIAS_NAME, TABLE_DEF_WINNER_POINTS, ... }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/sports/bulk` | Bulk update sports. Body: `{ updates: [{ sportTypeId, changes }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Save), Details (General Save), Details (Table Save), Details (Image Save), List (Delete/Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/data/table-settings` | Returns table setting rows. First row's keys are used as field options for ORDER_BY. | Details (Order field options) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term. | List + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term save) |
| `POST` | `/terms` | Create a new term. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 Sport Entity

#### Core Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `SPORT_TYPE_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term (category: "Sport Type names"). |
| `ALIAS_NAME` | String | Yes | Display name / alias for the sport. |
| `SPORT_IMAGE_URL` | String | Yes | URL of the sport logo/image. |
| `IMG_VER` | Integer | Yes | Image version counter. Default: `1`. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. |

#### General Details — Numeric Fields

| Field | Type | Description |
|-------|------|-------------|
| `GAME_DURATION` | Integer | Standard game duration (minutes). |
| `RECOGNITION_TIME_SPAN` | Integer | Recognition time span. |
| `MATCH_REMINDER_TIME` | Integer | Match reminder notification time. |
| `MINIMUM_ATHLETES_IN_SQUAD` | Integer | Minimum athletes required in a squad. |
| `MINIMUM_ATHLETES_IN_LINEUPS` | Integer | Minimum athletes required in lineups. |
| `NUMBER_OF_STARTING_PLAYERS` | Integer | Number of starting players. |

#### General Details — Boolean Toggles

| Field | Default | Description |
|-------|---------|-------------|
| `IS_DISPLAYED` | `true` | Whether this sport is displayed in the app. |
| `ALLOW_ATHLETE_SEARCH` | — | Allow athlete search for this sport. |
| `NOTIFY_LINEUPS` | — | Send lineup notifications. |
| `REQUIRE_FORMATION` | — | Require formation data. |
| `SHOW_SCORE_BOARD` | — | Show score board in app. |
| `SHOW_MARKET_VALUE` | — | Show market value. |
| `SHOW_PLAYERS_STATISTICS` | — | Show player statistics. |
| `SHOW_MISSING_PLAYERS_WIDGET` | — | Show missing players widget. |
| `SHOW_ATHLETE_CARD_NEXT_GAME` | — | Show athlete card for next game. |
| `SHOW_ATHLETE_CARD_PREDICTONS` | — | Show athlete card predictions. |
| `LMT_SHOW_AFTER_FINISHED` | — | Show live match tracker after game ends. |
| `SHOW_TOP_PERFORMERS_PRE_MATCH` | — | Show top performers before match. |
| `SHOW_TOP_PERFORMERS_LIVE` | — | Show top performers during live match. |
| `SHOW_TOP_PERFORMERS_POST_MATCH` | — | Show top performers after match. |
| `IS_SUPPORT_TRENDS` | — | Support trends feature. |
| `SUPPORTS_COMPETITION_BET_LINES` | — | Supports competition bet lines. |
| `IS_GAME_SUMMARY_ENABLE` | — | Enable game summary. |
| `SUPPORTS_PROPS` | — | Supports props betting. |
| `IS_VISIBLE_FOR_ENTITIES_SEARCH` | — | Visible in entities search. |

#### Table Settings — Points

| Field | Type | Description |
|-------|------|-------------|
| `TABLE_DEF_WINNER_POINTS` | Integer | Points for a win. Default: `3`. |
| `TABLE_DEF_DRAW_POINTS` | Integer | Points for a draw. Default: `1`. |
| `TABLE_DEF_LOSER_POINTS` | Integer | Points for a loss. Default: `0`. |
| `TABLE_WIN_AFTER_EX_POINTS` | Integer | Points for win after extra time. |
| `TABLE_LOS_AFTER_EX_POINTS` | Integer | Points for loss after extra time. |
| `TABLE_WIN_AFTER_PEN_POINTS` | Integer | Points for win after penalties. |
| `TABLE_LOS_AFTER_PEN_POINTS` | Integer | Points for loss after penalties. |

#### Table Settings — Scoring Rules

| Field | Type | Description |
|-------|------|-------------|
| `TABLE_DEF_IS_EVEN_EXISTS` | Boolean | Whether draws are possible. Default: `true`. |
| `TABLE_COUNT_ET_SCORE` | Boolean | Count extra time score in standings. |
| `TABLE_COUNT_PEN_SCORE` | Boolean | Count penalty score in standings. |

#### Table Settings — Order

| Field | Type | Description |
|-------|------|-------------|
| `ORDER_BY` | String | Comma-separated `field:direction` pairs defining table sort priority. Example: `"POINTS:desc,GOAL_DIFF:desc"`. |

---

## 6. User Flows

### 6.1 Browse Sports

1. User navigates to `/sports`.
2. All sports load automatically.
3. User can filter by Sport ID or Sport Name (client-side).
4. Column-level filters, sorting, and grouping are available.

### 6.2 Create a New Sport

1. User clicks **Create Sport**.
2. Dialog opens with defaults (Win:3, Draw:1, Loss:0, draw exists, displayed, IMG_VER:1).
3. User fills in at least **Sport Name** (required).
4. System creates a Term, then the sport.
5. Navigates to new sport's detail page.

### 6.3 Inline Edit (List)

1. User clicks **Edit Mode**.
2. `IS_DISPLAYED` and `ALLOW_ATHLETE_SEARCH` columns become inline checkboxes.
3. User toggles values, clicks **Save Changes**.
4. Bulk update sent; list reloaded.

### 6.4 Edit General Details

1. User navigates to `/sports/:id`.
2. Modifies numeric fields and boolean toggles in the General Details card.
3. Clicks **Save & Update In Service** (General Details section).
4. Only `GENERAL_DETAILS_ALL_KEYS` are compared and sent.

### 6.5 Edit Table Settings

1. In the Table Settings section, user modifies point values and scoring rule checkboxes.
2. User manages table order parameters:
   - **Add:** Selects a field and direction, clicks "Add".
   - **Remove:** Clicks the red delete icon on an item.
   - **Reorder:** Drags items using the drag handle to change priority.
3. Clicks **Save & Update In Service** (Table Settings section).
4. Only `TABLE_SETTINGS_ALL_KEYS` (including `ORDER_BY`) are compared and sent.

### 6.6 Update Sport Image

1. User clicks **Upload Image** on the detail page.
2. Enters image URL; preview is shown.
3. Clicks **Save**. `SPORT_IMAGE_URL` updated via bulk API.

### 6.7 Edit Sport Name (Term)

1. User clicks the sport name link (list or detail page).
2. Term Modal opens with category "Sport Type names".
3. User edits translations; sport data is refreshed on save.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing for sport names. |
| `api` | `services/api` | Centralized API client. |

---

## 8. UI / UX Specifications

### 8.1 Design System

- **Font family:** `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
- **Primary color:** `#1976d2` (Material Blue)
- **Success color:** `#4caf50` / `#15803d` (green)
- **Danger color:** `#d32f2f` (red)
- **Background:** `#f5f5f5` (page), `#ffffff` (cards/table)
- **Border color:** `#EAECF0` (table), `#E0E0E0` (inputs), `#e0e0e0` (cards)
- **Font sizes:** `0.875rem` (body/table), `0.8rem` (detail fields), `0.75rem` (labels)

### 8.2 Responsive Breakpoints

- **List filter panel:** `md:2.4` for filters, `md:1.2` for buttons.
- **Detail General Details:** Media fixed 200px on md+, fields max-width 320px (single column), booleans 4-column grid on md.
- **Detail Table Settings:** 2-column (`md:6` each) grid. Point config uses 4-column grid of 18ch fields.

### 8.3 Detail Page — Separate Save Scopes

A key distinction of the Sport Details page: it has **two independent save buttons**, each saving a different subset of fields:

| Save Button | Scope | Fields |
|-------------|-------|--------|
| General Details "Save & Update In Service" | `GENERAL_DETAILS_ALL_KEYS` | `GAME_DURATION`, `RECOGNITION_TIME_SPAN`, `MATCH_REMINDER_TIME`, `MINIMUM_ATHLETES_IN_SQUAD`, `MINIMUM_ATHLETES_IN_LINEUPS`, + all boolean toggles (~20 fields) |
| Table Settings "Save & Update In Service" | `TABLE_SETTINGS_ALL_KEYS` | 7 point fields, 3 scoring rule checkboxes, `ORDER_BY` |

Both use the same `buildChanges()` function and the same `api.updateSportsBulk()` endpoint, but with different allowed-key sets.

### 8.4 Drag-and-Drop Order Parameters

The ORDER_BY drag-and-drop interface uses:
- HTML5 Drag and Drop API (no external library).
- `DragIndicatorIcon` as drag handle (cursor: `grab`/`grabbing`).
- Visual feedback: dragged item gets `scale(1.02)` + `boxShadow`; drop target gets `borderTop: 2px solid primary.main` + `action.hover` background.
- Deduplication prevents adding the same field twice.
- Newly added fields default to `desc` direction.
