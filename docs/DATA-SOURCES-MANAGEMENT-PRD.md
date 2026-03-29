# Data Sources Management — Product Requirements Document (PRD)

**Module:** Data Sources List & Data Source Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Data Sources Management module is a two-screen CMS product that enables operators to browse, create, edit, and manage data source entities. Data sources represent external content providers/integrations, each with its own language, time zone, logging, and widget configuration. The module is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Data Sources List** (`/data-sources`) — A **search-first** filterable, sortable, paginated data table with inline editing (three boolean fields), bulk operations (delete/restore), CSV export, and data source creation.
- **Data Source Details** (`/data-sources/:id`) — A detail view with a three-column layout: media (static icon), form fields with dropdown selectors for language and time zone, and boolean toggles.

---

## 2. Data Sources List Screen

**Component:** `DataSourcesList` (`frontend/src/pages/DataSourcesList.jsx`)  
**Route:** `/data-sources`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Data Sources List") and a "Create Data Source" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls. |

### 2.2 Data Loading Strategy

**Search-first pattern.** Unlike most other list pages in the system, this page does **not** auto-load data on mount. The table remains empty until the user explicitly clicks the **Search** button.

- On mount, only supporting data is loaded:
  - `api.getTerms()` + `api.getCategories()` via `Promise.all` — For Term Edit Modal.
  - `api.getTimeZonesList()` — For Time Zone column display and create dialog.
- The **Search** button sets `hasSearched = true` and triggers `api.getDataSourcesList()`.
- **Clear Filters** resets `hasSearched` to `false`, clears all sources, and returns the table to its initial empty state.
- Top-level filters (Data Source ID, Alias Name) are applied **client-side** on the loaded dataset.
- The data table uses `dataForTable` which resolves to an empty array when `hasSearched` is `false`.

### 2.3 Filter Panel

Two filter controls plus action buttons:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Data Source ID** | `TextField` (free text) | `md:2.4` | Exact string match on `DATA_SOURCE_ID`. Applied client-side. |
| **Alias Name** | `TextField` (free text) | `md:2.4` | Case-insensitive substring match on `ALIAS_NAME`. Applied client-side. |

Action buttons:

- **Search** (`md:1.2`) — Fetches all data sources from API and sets `hasSearched = true`.
- **Clear Filters** (`md:1.2`) — Resets all filter values, column filters, sources array, selection, and `hasSearched` flag (table returns to empty).
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF, rows where `IS_DELETED === true` are hidden.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection. Header supports select-all / indeterminate. | Same. |
| 1 | `DATA_SOURCE_ID` | ID | 90px | Blue link (`#1976d2`, `fontWeight: 500`). Click opens detail page in new tab. | Same (not editable). |
| 2 | `ALIAS_NAME` | Name | 16ch | `StorageIcon` avatar (blue `#1976d2`) + clickable name. If `NAME_ID` exists, click opens **Term Edit Modal** under category "Data Source names". Otherwise, click opens detail page. | Same (not inline-editable). |
| 3 | `SITE_ADDRESS` | Site Address | 22ch | Truncated text with `textOverflow: ellipsis`, native `title` tooltip. | Same (not inline-editable). |
| 4 | `LAST_SCAN_TIME` | Last Scan | 110px | Value or `"-"`. | Same (not editable). |
| 5 | `TIME_ZONE_ID` | Time Zone | 90px | Resolved to human-readable format via `formatTimeZoneDisplay()` (e.g., "Israel Standard Time (UTC +2)"). Falls back to raw ID if not found. | Same (not inline-editable). |
| 6 | `ALWAYS_ADD_VALUE_IN_LANG` | Add Value in Lang | 110px | "Yes" / "No". | Inline `Checkbox`. |
| 7 | `ADD_TO_LOG` | Add to Log | 95px | "Yes" / "No". | Inline `Checkbox`. |
| 8 | `WIDGET_ACTIVE` | Widget Active | 100px | "Yes" / "No". | Inline `Checkbox`. |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter" (height: 32px). Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- Numeric fields (`DATA_SOURCE_ID`, `LANG_ID`, `UI_LANG_ID`, `LOG_OPTION_ID`) support exact numeric and substring match.

#### 2.4.3 Sorting

Standard sorting: click toggles asc/desc. Single active field. Strings use `localeCompare`; numbers use arithmetic. Nulls pushed to end. Active: blue; inactive: gray.

#### 2.4.4 Grouping

Standard grouping via `ViewListIcon`. Collapsible groups with count. Expand/collapse via icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/data-sources/{id}`).
- **Edit mode:** Row click disabled.
- **Deleted rows:** Opacity 0.6, gray background/text.
- **Selected rows:** Blue `#E3F2FD` background.

#### 2.4.6 Empty States

Three distinct empty states:

| Condition | Message |
|-----------|---------|
| Not yet searched (`hasSearched === false`) | "Enter criteria and click Search to see results." |
| Searched but no data returned | "No data sources found. Click \"Create Data Source\" to add one." |
| Data loaded but filters exclude all rows | "No rows match the current filters." |

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined/Contained blue | Always visible | Toggles inline editing. Cancel with unsaved changes shows `window.confirm`. |
| **Save Changes** | Contained green (`#4caf50`) | Edit mode only | Sends `api.updateDataSourcesBulk(updates)`. Shows pending count. Disabled if no changes. |
| **Delete / Restore** | Red/Green | Always; disabled if no selection | Dynamic based on selection. Opens confirmation dialog. Calls `api.deleteDataSources()` or `api.restoreDataSources()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected or all to CSV. File: `data_sources_YYYY-MM-DD.csv`. |

### 2.6 Pagination

Standard: 10, 25 (default), 50, 100. Previous/Next buttons. Resets on filter change.

### 2.7 Create Data Source Dialog

Triggered by "Create Data Source". Dialog: `maxWidth="sm"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Alias Name (ALIAS_NAME)** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under category "Data Source names" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Site Address** | `TextField` | No | `xs:12` | `''` | Placeholder: "https://...". Trimmed before save; empty string becomes `null`. |
| **LANG_ID** | `TextField` (number) | No | `xs:6` | `null` | Language ID. |
| **UI_LANG_ID** | `TextField` (number) | No | `xs:6` | `null` | UI Language ID. |
| **Time Zone** | `Select` (dropdown) | No | `xs:6` | First time zone from list | Options from `api.getTimeZonesList()`, formatted via `formatTimeZoneDisplay()`. |
| **LOG_OPTION_ID** | `TextField` (number) | No | `xs:6` | `null` | Log option ID. |
| **Add value in lang** | `Checkbox` | No | `xs:4` | `null` (unchecked) | `ALWAYS_ADD_VALUE_IN_LANG`. |
| **Add to log** | `Checkbox` | No | `xs:4` | `null` (unchecked) | `ADD_TO_LOG`. |
| **Widget active** | `Checkbox` | No | `xs:4` | `null` (unchecked) | `WIDGET_ACTIVE`. |

**Creation flow:**
1. Validate form (ALIAS_NAME required).
2. Create Term via `api.createTerm({ category: 'Data Source names', values: [...] })`.
3. Create data source via `api.createDataSource(payload)` with `NAME_ID` from term.
4. Close dialog, reload data sources, navigate to detail page (`/data-sources/{newId}`).

**Type coercion on create:**
- `LANG_ID`, `UI_LANG_ID`, `TIME_ZONE_ID`, `LOG_OPTION_ID`: `Number()` conversion; empty/null remains `null`.
- Boolean fields: only `true` or `false` are sent; otherwise `null`.
- `SITE_ADDRESS`: trimmed; empty string becomes `null`.

### 2.8 Term Edit Modal

- `initialCategory`: `"Data Source names"`
- `onSave`/`onSaveAndUpdate`: Updates term then reloads data sources list.

### 2.9 Snackbar Notifications

Top-right, 6000ms auto-hide. Triggered on all CRUD operations.

---

## 3. Data Source Details Screen

**Component:** `DataSourceDetails` (`frontend/src/pages/DataSourceDetails.jsx`)  
**Route:** `/data-sources/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + title ("Data Source – {ALIAS_NAME}"). Clickable name opens Term Edit Modal. |
| **General Details Card** | Three-column layout: media (left), form fields (center), boolean toggles (right). Single "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` changes), four parallel loads:
1. `api.getDataSourceById(id)` — Loads the data source entity.
2. `api.getTerms()` + `api.getCategories()` — For Term Edit Modal.
3. `api.getTimeZonesList()` — For Time Zone dropdown.
4. `api.getLanguages()` — For Language and UI Language dropdowns.

When the source object loads, `formData` is initialized as a shallow copy of the entire source object.

### 3.3 Header Bar

- **Back to List**: Navigates to `/data-sources`.
- **Title**: `variant="h4"`, `fontWeight: 700`. Format: `Data Source – {ALIAS_NAME}`.
  - If `NAME_ID` exists, name is clickable (blue, underlined) → opens Term Edit Modal.

### 3.4 General Details Card

Three-column responsive layout with a single save scope.

#### 3.4.1 Section Header

- Title: "General Details" (`variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (green `#15803d`).

#### 3.4.2 Left Column — Media (fixed 200px on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Static `StorageIcon` (36px) on blue `#1976d2` background. No image upload functionality. |
| **Label** | "Data Source" (0.7rem). |

Unlike other entity detail pages, there is **no image upload dialog** — the media column displays only a static icon.

#### 3.4.3 Center Column — Form Fields (flexible, two rows)

**Row 1** — 3-column grid (`repeat(3, 1fr)` on md):

| Field | Key | Type | Editable | Notes |
|-------|-----|------|----------|-------|
| **Language ID** | `LANG_ID` | `Select` dropdown | Yes | Options from `api.getLanguages()`. Shows all languages. Displays `lang.name ?? lang.code ?? lang.id`. |
| **UI Language ID** | `UI_LANG_ID` | `Select` dropdown | Yes | Options filtered to `lang.isUI === true` only. |
| **Last Scan Time** | `LAST_SCAN_TIME` | `TextField` | No (read-only) | Disabled input. |

**Row 2** — 2-column grid (`repeat(2, 1fr)` on sm+):

| Field | Key | Type | Editable | Notes |
|-------|-----|------|----------|-------|
| **Site Address** | `SITE_ADDRESS` | `TextField` (text) | Yes | Free-text input. |
| **Time Zone** | `TIME_ZONE_ID` | `Select` dropdown | Yes | Options from `api.getTimeZonesList()`. Formatted via `formatTimeZoneDisplay()`. |

**Field rendering logic (`renderField`):**
- **Booleans** (`BOOLEAN_KEYS`): Rendered as `Checkbox` with `FormControlLabel`.
- **`TIME_ZONE_ID`**: Rendered as a `Select` with time zone options. Value is converted to `Number` before comparison.
- **`LANG_ID` / `UI_LANG_ID`**: Rendered as a `Select`. `UI_LANG_ID` filters the language list to `isUI === true`. Value is `Number`.
- **Other fields**: Auto-detect numeric vs text. Numeric values use `type="number"`. Read-only fields (`DATA_SOURCE_ID`, `LAST_SCAN_TIME`) are disabled.

#### 3.4.4 Right Column — Boolean Toggles (single column on md)

| Field | Key | Label |
|-------|-----|-------|
| `ALWAYS_ADD_VALUE_IN_LANG` | Always Add Value in Lang | Checkbox |
| `ADD_TO_LOG` | Add to Log | Checkbox |
| `WIDGET_ACTIVE` | Widget Active | Checkbox |
| `PREMIUM` | Premium | Checkbox |

Note: The **PREMIUM** toggle appears **only on the Details page**, not in the list view or create dialog.

#### 3.4.5 Save Logic

`handleSave()`:
1. Iterates over all keys in `formData`.
2. Compares each field against original `source` using `JSON.stringify` comparison.
3. Only changed fields are sent via `api.updateDataSourcesBulk([{ dataSourceId, changes }])`.
4. Data source reloaded on success.
5. No save is performed if no changes are detected.

### 3.5 Term Edit Modal

- `initialCategory`: `"Data Source names"`
- On save: updates term, reloads data source.

### 3.6 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no source yet) | Centered `LoadingSpinner`. |
| **Error** | `Alert` (error) + "Back to List" button. |
| **Not Found** | `Alert` (warning, "Data source not found") + "Back to List" button. |

---

## 4. API Endpoints

### 4.1 Data Source Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/data-sources` | Get all data sources (enriched). Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/data-sources/:id` | Get a single data source by `DATA_SOURCE_ID`. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/data-sources` | Create a new data source. Body: `{ NAME_ID, ALIAS_NAME, SITE_ADDRESS, LANG_ID, ... }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/data-sources/bulk` | Bulk update data sources. Body: `{ updates: [{ dataSourceId, changes }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Save), Details (Save), List (Delete/Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/time-zones` | Returns all time zones. | List + Details (Time Zone dropdown/display) |
| `GET` | `/data/languages` | Returns all languages (with `isUI` flag). | Details (Language dropdowns) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term. | List + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term save) |
| `POST` | `/terms` | Create a new term. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 Data Source Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `DATA_SOURCE_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term (category: "Data Source names"). |
| `ALIAS_NAME` | String | Yes | Display name / alias for the data source. |
| `SITE_ADDRESS` | String | Yes | URL of the data source site. |
| `LANG_ID` | Integer | Yes | Default language ID for content from this source. |
| `UI_LANG_ID` | Integer | Yes | UI language ID. |
| `LAST_SCAN_TIME` | String/DateTime | Yes | Timestamp of the last data scan (read-only). |
| `TIME_ZONE_ID` | Integer | Yes | Foreign key to time zone. |
| `ALWAYS_ADD_VALUE_IN_LANG` | Boolean | Yes | Whether to always add values in the specified language. |
| `ADD_TO_LOG` | Boolean | Yes | Whether to add operations to the log. |
| `WIDGET_ACTIVE` | Boolean | Yes | Whether the widget is active for this data source. |
| `LOG_OPTION_ID` | Integer | Yes | Log option configuration ID. |
| `PREMIUM` | Boolean | Yes | Premium data source flag (detail page only). |
| `IS_DELETED` | Boolean | No | Soft-delete flag. |

### 5.2 Time Zone Entity (Reference)

| Field | Type | Description |
|-------|------|-------------|
| `TIME_ZONE_ID` | Integer | Primary key. |
| `TIME_ZONE_NAME` | String | Human-readable name (e.g., "Israel Standard Time"). |
| `UTC_OFFSET` | Number | UTC offset (e.g., `2`, `-5`). |

Formatted via `formatTimeZoneDisplay(tz)` → `"{TIME_ZONE_NAME} (UTC +{UTC_OFFSET})"`.

### 5.3 Language Entity (Reference)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key. |
| `name` | String | Language name. |
| `code` | String | Language code (e.g., "en", "he"). |
| `isUI` | Boolean | Whether this language is available as a UI language. |

---

## 6. User Flows

### 6.1 Search Data Sources

1. User navigates to `/data-sources`.
2. Table is **empty** — message: "Enter criteria and click Search to see results."
3. User optionally enters Data Source ID and/or Alias Name.
4. User clicks **Search**.
5. All data sources load; client-side filters are applied.
6. Column-level filters, sorting, and grouping are available.

### 6.2 Create a New Data Source

1. User clicks **Create Data Source**.
2. Dialog opens with defaults (first time zone pre-selected, booleans unchecked).
3. User fills in at least **Alias Name** (required).
4. Optionally sets Site Address, Language IDs, Time Zone, Log Option, and boolean flags.
5. System creates a Term, then the data source.
6. Navigates to new data source's detail page.

### 6.3 Inline Edit (List)

1. User clicks **Edit Mode**.
2. `ALWAYS_ADD_VALUE_IN_LANG`, `ADD_TO_LOG`, and `WIDGET_ACTIVE` columns become inline checkboxes.
3. User toggles values, clicks **Save Changes**.
4. Bulk update sent; list reloaded.

### 6.4 Edit Data Source Details

1. User navigates to `/data-sources/:id`.
2. Modifies fields:
   - **Language ID** and **UI Language ID** via dropdown selectors.
   - **Site Address** via text field.
   - **Time Zone** via dropdown selector.
   - Boolean toggles (4 fields including **Premium**).
3. Clicks **Save & Update In Service**.
4. Only changed fields are sent.

### 6.5 Edit Data Source Name (Term)

1. User clicks the data source name link (list or detail page).
2. Term Modal opens with category "Data Source names".
3. User edits translations; data source data is refreshed on save.

### 6.6 Bulk Delete / Restore

1. User selects one or more rows via checkboxes.
2. Clicks **Delete Data Sources** (or **Restore Data Sources** if deleted rows are selected).
3. Confirmation dialog appears.
4. On confirm, `api.deleteDataSources()` or `api.restoreDataSources()` is called.
5. Selection cleared; list reloaded.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing for data source names. |
| `formatTimeZoneDisplay` | `utils/formatTimeZone` | Formats time zone objects to human-readable strings. |
| `api` | `services/api` | Centralized API client. |

---

## 8. UI / UX Specifications

### 8.1 Design System

- **Font family:** `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
- **Primary color:** `#1976d2` (Material Blue)
- **Success color:** `#4caf50` (list save) / `#15803d` (detail save)
- **Danger color:** `#d32f2f` (red)
- **Background:** `#f5f5f5` (page), `#ffffff` (cards/table)
- **Border color:** `#EAECF0` (table), `#E0E0E0` (inputs), `#e0e0e0` (cards)
- **Font sizes:** `0.875rem` (body/table), `0.8rem` (detail fields), `0.75rem` (labels), `0.7rem` (media label)

### 8.2 Responsive Breakpoints

- **List filter panel:** `md:2.4` for filters, `md:1.2` for buttons.
- **Detail General Details:** Media fixed 200px on md+, fields row 1 is 3-column on md, row 2 is 2-column on sm+, booleans single column on md.

### 8.3 Key Behavioral Differences from Other Entity List Pages

| Behavior | Data Sources List | Most Other Lists |
|----------|-------------------|------------------|
| **Initial data load** | Does NOT auto-load. Requires explicit Search click. | Auto-loads all data on mount. |
| **Empty table on mount** | Shows "Enter criteria and click Search to see results." | Shows loading spinner, then data. |
| **Clear Filters** | Resets `hasSearched`, clears sources array, returns to initial empty state. | Resets filters but keeps loaded data visible. |
| **Time Zone display** | Resolves `TIME_ZONE_ID` to human-readable string via `formatTimeZoneDisplay()`. | N/A for most entities. |
| **Detail page media** | Static icon only (no image upload). | Most have image upload dialog. |
| **Detail page — PREMIUM field** | Present only on detail page, not in list or create dialog. | Fields are typically consistent across views. |
| **Language dropdowns (Detail)** | `LANG_ID` shows all languages; `UI_LANG_ID` filters to `isUI === true`. | N/A for most entities. |
