# Time Zones Management — Product Requirements Document (PRD)

**Module:** Time Zones List & Time Zone Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Time Zones Management module is a two-screen CMS product that enables operators to browse, create, edit, and manage time zone entities. Time zones are a core reference entity used across the platform for scheduling, display offsets, and linking to IANA/TZDB time zone identifiers. The module is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Time Zones List** (`/time-zones`) — A **search-first** filterable, sortable, paginated data table with inline editing of the UTC offset, bulk operations (delete/restore), CSV export, and time zone creation.
- **Time Zone Details** (`/time-zones/:id`) — A detail view with a General Details card (UTC Offset field) and a unique **Connected TZDB Time Zones** section that allows operators to link/unlink IANA TZDB time zones to this entity.

---

## 2. Time Zones List Screen

**Component:** `TimeZonesList` (`frontend/src/pages/TimeZonesList.jsx`)  
**Route:** `/time-zones`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Time Zones List") and a "Create Time Zone" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls. |

### 2.2 Data Loading Strategy

**Search-first pattern.** The table is empty on mount. Data is loaded only when the user explicitly clicks **Search**.

- On mount, only supporting data is loaded:
  - `api.getTerms()` + `api.getCategories()` via `Promise.all` — For Term Edit Modal.
- The **Search** button sets `hasSearched = true` and triggers `api.getTimeZonesList()`.
- **Clear Filters** resets `hasSearched` to `false`, clears all time zones, and returns the table to its initial empty state.
- Top-level filters (Time Zone ID, Time Zone Name) are applied **client-side** on the loaded dataset.
- The data table uses `dataForTable` which resolves to an empty array when `hasSearched` is `false`.

### 2.3 Filter Panel

Two filter controls plus action buttons:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Time Zone ID** | `TextField` (free text) | `md:2.4` | Exact string match on `TIME_ZONE_ID`. Applied client-side. |
| **Time Zone Name** | `TextField` (free text) | `md:2.4` | Case-insensitive substring match on `TIME_ZONE_NAME`. Applied client-side. |

Action buttons:

- **Search** (`md:1.2`) — Fetches all time zones from API and sets `hasSearched = true`.
- **Clear Filters** (`md:1.2`) — Resets all filter values, column filters, time zones array, selection, and `hasSearched` flag.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF, rows where `IS_DELETED === true` are hidden.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection. Header supports select-all / indeterminate. | Same. |
| 1 | `TIME_ZONE_ID` | ID | 90px | Blue link (`#1976d2`, `fontWeight: 500`). Click opens detail page in new tab. | Same (not editable). |
| 2 | `TIME_ZONE_NAME` | Name | 28ch | `ScheduleIcon` avatar (blue `#1976d2`) + clickable formatted name via `formatTimeZoneDisplay(row)` (e.g., "Israel Standard Time (UTC +2)"). Click behavior depends on `NAME_ID` — see section 2.4.6. | Same (not inline-editable). |
| 3 | `UTC_OFFSET` | UTC Offset | 100px | Numeric value or `"-"`. | Inline `TextField` (`type="number"`, `step: 0.5`). Uses `parseFloat`. |

This is a **compact table** with only 3 data columns, making it one of the simplest list pages in the system.

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter" (height: 32px). Filtering is:
- Case-insensitive substring match.
- `TIME_ZONE_ID`: Integer — exact numeric and substring match.
- `UTC_OFFSET`: Float — uses `parseFloat` for numeric matching; also supports substring match.

#### 2.4.3 Sorting

Standard sorting: click toggles asc/desc. Single active field. Strings use `localeCompare`; numbers use arithmetic. Nulls pushed to end. Active: blue; inactive: gray.

#### 2.4.4 Grouping

Standard grouping via `ViewListIcon`. Collapsible groups with count. Expand/collapse via icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/time-zones/{id}`).
- **Edit mode:** Row click disabled.
- **Deleted rows:** Opacity 0.6, gray background/text.
- **Selected rows:** Blue `#E3F2FD` background.

#### 2.4.6 Name Click — Conditional Term Modal

Three-tier fallback logic:

1. If `row.NAME_ID` is **falsy** → opens the detail page in a new tab.
2. If `row.NAME_ID` exists → fetches the term via `api.getTermById(NAME_ID)`:
   - If term `category === 'Time Zone names'` → opens the **Term Edit Modal**.
   - Otherwise → navigates to the detail page (same tab).
3. If the term fetch **fails** → navigates to the detail page (same tab).

#### 2.4.7 Empty States

| Condition | Message |
|-----------|---------|
| Not yet searched (`hasSearched === false`) | "Enter criteria and click Search to see results." |
| Searched but no data returned | "No time zones found. Click \"Create Time Zone\" to add one." |
| Data loaded but filters exclude all rows | "No rows match the current filters." |

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined/Contained blue | Always visible | Toggles inline editing. Cancel with unsaved changes shows `window.confirm`. |
| **Save Changes** | Contained green (`#4caf50`) | Edit mode only | Sends `api.updateTimeZonesBulk(updates)`. Shows pending count. Disabled if no changes. |
| **Delete / Restore** | Red/Green | Always; disabled if no selection | Dynamic based on selection. Opens confirmation dialog. Calls `api.deleteTimeZones()` or `api.restoreTimeZones()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected or all to CSV. File: `time_zones_YYYY-MM-DD.csv`. |

### 2.6 Pagination

Standard: 10, 25 (default), 50, 100. Previous/Next buttons. Resets on filter change.

### 2.7 Create Time Zone Dialog

Triggered by "Create Time Zone". Dialog: `maxWidth="sm"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Time Zone Name** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under category "Time Zone names" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **UTC Offset** | `TextField` (number, `step: 0.5`) | No | `xs:12` | `0` | Converted via `parseFloat`. Falls back to `0`. Supports half-hour offsets (e.g., `+5.5`, `-3.5`). |

This is the **simplest create dialog** in the system — only two fields.

**Creation flow:**
1. Validate form (TIME_ZONE_NAME required).
2. Create Term via `api.createTerm({ category: 'Time Zone names', values: [...] })`.
3. Create time zone via `api.createTimeZone({ NAME_ID, TIME_ZONE_NAME, UTC_OFFSET })`.
4. Close dialog, reload time zones, navigate to detail page (`/time-zones/{newId}`).

### 2.8 Term Edit Modal

- `initialCategory`: `"Time Zone names"`
- `onSave`/`onSaveAndUpdate`: Updates term then reloads time zones list.

### 2.9 Snackbar Notifications

Top-right, 6000ms auto-hide. Triggered on all CRUD operations.

---

## 3. Time Zone Details Screen

**Component:** `TimeZoneDetails` (`frontend/src/pages/TimeZoneDetails.jsx`)  
**Route:** `/time-zones/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + title ("Time Zone – {formatted display}"). Clickable name opens Term Edit Modal if conditions met. |
| **General Details Card** | Two-column layout: media (left) and a single UTC Offset field (center). "Save & Update In Service" button. |
| **Connected TZDB Time Zones Card** | A table of linked IANA/TZDB time zones with connect and unlink actions. |

### 3.2 Data Loading

On mount (and when `id` changes):
1. `api.getTimeZoneById(id)` — Loads the time zone entity.
2. `api.getTerms()` + `api.getCategories()` — For Term Edit Modal.

On a separate effect triggered when `timeZone.TIME_ZONE_ID` is set:
3. `api.getTzdbTimeZonesByConnectedId(TIME_ZONE_ID)` — Loads connected TZDB zones.

On mount (once):
4. `api.getCountriesList()` — Loads countries for resolving `CONNECTED_COUNTRY_ID` to names.

### 3.3 Header Bar

- **Back to List**: Navigates to `/time-zones`.
- **Title**: `variant="h4"`, `fontWeight: 700`. Format: `Time Zone – {formatTimeZoneDisplay(formData)}`.
  - If `NAME_ID` exists, name is clickable (blue, underlined) → opens Term Edit Modal only if term category is "Time Zone names".

### 3.4 General Details Card

#### 3.4.1 Section Header

- Title: "General Details" (`variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (green `#15803d`).

#### 3.4.2 Left Column — Media (fixed 200px on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Static `ScheduleIcon` (36px) on blue `#1976d2` background. No image upload. |
| **Label** | "Time Zone" (0.7rem). |

#### 3.4.3 Center Column — Fields (5-column grid on md)

Only **one** editable field:

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| **UTC Offset** | `UTC_OFFSET` | `TextField` (number, `step: 0.5`) | Uses `parseFloat`. Supports fractional values. Width: `50%` of grid cell. |

This is the **simplest detail form** in the system — a single numeric field.

#### 3.4.4 Save Logic

`handleSave()`:
1. Iterates over all keys in `formData`.
2. Compares each field against original `timeZone` using `JSON.stringify` comparison.
3. Only changed fields sent via `api.updateTimeZonesBulk([{ timeZoneId, changes }])`.
4. Time zone reloaded on success.

### 3.5 Connected TZDB Time Zones Card

This section is **unique to the Time Zone Details page** and has no equivalent in other entity detail pages. It manages the many-to-one relationship between IANA TZDB time zone identifiers and the system's internal time zone entity.

#### 3.5.1 Section Header

- Title: "Connected TZDB Time Zones ({count})" (`variant="h6"`, `fontWeight: 600`).

#### 3.5.2 Connected Zones Table

| Column | Width | Description |
|--------|-------|-------------|
| **Time Zone Name** | — | IANA identifier (e.g., `"Africa/Accra"`, `"Asia/Jerusalem"`). |
| **Created Date** | — | `CREATE_TIME` formatted via `formatCreateTime()` as locale date (e.g., "Mar 8, 2026"). Falls back to raw value. |
| **Country** | — | `CONNECTED_COUNTRY_ID` resolved to country name via `getCountryName()`. Falls back to `"ID: {id}"` or `"—"`. |
| **Actions** | right-aligned | Red "Unlink" button with `LinkOffIcon`. |

- **Empty state**: "No connected device time zones."
- **Loading state**: Centered `LoadingSpinner`.

#### 3.5.3 Connect New Zone Dialog

Triggered by "Connect New Zone" button (blue, top-right of section).

**Flow:**
1. Fetches unconnected TZDB zones via `api.getTzdbTimeZonesUnconnected()`.
2. Opens dialog (`maxWidth="sm"`, `fullWidth`) with:
   - Instruction text: "Select an unconnected TZDB time zone to link to this time zone."
   - Search field: Filters by `TIME_ZONE_NAME`, case-insensitive substring.
   - Scrollable table (`maxHeight: 320px`) showing up to **100 results**:
     - Column: Time Zone Name.
     - Selection: Click to select; `"✓"` indicator in checkbox column.
   - Empty states: "No unconnected zones available." or "No matches for your search."
3. **Save**: Calls `api.updateTzdbTimeZoneConnection(selectedZone.TIME_ZONE_NAME, timeZone.TIME_ZONE_ID)`.
4. Reloads connected zones table. Closes dialog.

#### 3.5.4 Unlink Confirmation Dialog

Triggered by "Unlink" button on a connected zone row.

- Dialog: `maxWidth="xs"`, `fullWidth`.
- Title: "Unlink time zone" (styled header with gray background).
- Message: `Unlink <strong>{TIME_ZONE_NAME}</strong> from this time zone? This will remove the connection.`
- Actions: "Cancel" (inherit) + "Unlink" (red `#d32f2f`, with `LinkOffIcon`).
- On confirm: Calls `api.updateTzdbTimeZoneConnection(timeZoneName, null)` (sets to null = unlink).
- Reloads connected zones table.

### 3.6 Term Edit Modal

- `initialCategory`: `"Time Zone names"`
- Name click only opens modal if term category matches "Time Zone names".
- On save: updates term, reloads time zone.

### 3.7 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no time zone yet) | Centered `LoadingSpinner`. |
| **Error** | `Alert` (error) + "Back to List" button. |
| **Not Found** | `Alert` (warning, "Time zone not found") + "Back to List" button. |

---

## 4. API Endpoints

### 4.1 Time Zone Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/time-zones` | Get all time zones. Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/time-zones/:id` | Get a single time zone by `TIME_ZONE_ID`. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/time-zones` | Create a new time zone. Body: `{ NAME_ID, TIME_ZONE_NAME, UTC_OFFSET }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/time-zones/bulk` | Bulk update time zones. Body: `{ updates: [{ timeZoneId, changes }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Save), Details (Save), List (Delete/Restore) |

### 4.2 TZDB Time Zone Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/tzdb-time-zones?connectedTimeZoneId={id}` | Get TZDB zones connected to a given `TIME_ZONE_ID`. Returns `{ data: [...] }`. | Details (Connected table) |
| `GET` | `/tzdb-time-zones?unconnected=true` | Get TZDB zones where `CONNECTED_TIME_ZONE` is null or 0. Returns `{ data: [...] }`. | Details (Connect dialog) |
| `PATCH` | `/tzdb-time-zones/by-name/{encodedName}` | Update `CONNECTED_TIME_ZONE` for a TZDB record. Body: `{ CONNECTED_TIME_ZONE: id \| null }`. | Details (Connect / Unlink) |

### 4.3 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/countries` | Get all countries (for resolving country names). | Details (Country column) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term. | List + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term save) |
| `POST` | `/terms` | Create a new term. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 Time Zone Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `TIME_ZONE_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term (category: "Time Zone names"). |
| `TIME_ZONE_NAME` | String | Yes | Human-readable name (e.g., "Israel Standard Time"). |
| `UTC_OFFSET` | Float | Yes | UTC offset in hours. Supports half-hour values (e.g., `5.5` for UTC+5:30). Default: `0`. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. |

### 5.2 TZDB Time Zone Entity (Connected Zones)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `TIME_ZONE_NAME` | String | No | IANA TZDB identifier (e.g., `"Asia/Jerusalem"`, `"America/New_York"`). Primary key. |
| `CONNECTED_TIME_ZONE` | Integer | Yes | Foreign key to `TIME_ZONE_ID`. `null` if unconnected. |
| `CONNECTED_COUNTRY_ID` | Integer | Yes | Foreign key to Country. |
| `CREATE_TIME` | DateTime | Yes | Creation timestamp. |

### 5.3 Display Formatting

`formatTimeZoneDisplay(tz)` produces a human-readable string:
- If both `TIME_ZONE_NAME` and `UTC_OFFSET` exist: `"{TIME_ZONE_NAME} (UTC +{offset})"` (e.g., "Israel Standard Time (UTC +2)").
- If only `UTC_OFFSET`: `"(UTC +{offset})"`.
- If neither: `""`.

---

## 6. User Flows

### 6.1 Search Time Zones

1. User navigates to `/time-zones`.
2. Table is **empty** — message: "Enter criteria and click Search to see results."
3. User optionally enters Time Zone ID and/or Name.
4. User clicks **Search**.
5. All time zones load; client-side filters are applied.

### 6.2 Create a New Time Zone

1. User clicks **Create Time Zone**.
2. Dialog opens with defaults (UTC Offset: `0`).
3. User fills in at least **Time Zone Name** (required).
4. Optionally sets UTC Offset (supports half-hour steps like `+5.5`).
5. System creates a Term, then the time zone.
6. Navigates to new time zone's detail page.

### 6.3 Inline Edit (List)

1. User clicks **Edit Mode**.
2. `UTC_OFFSET` column becomes an inline number input (`step: 0.5`).
3. User modifies offset values, clicks **Save Changes**.
4. Bulk update sent; list reloaded.

### 6.4 Edit Time Zone Details

1. User navigates to `/time-zones/:id`.
2. Modifies **UTC Offset** field.
3. Clicks **Save & Update In Service**.
4. Only changed fields are sent.

### 6.5 Connect a TZDB Zone

1. On the detail page, user clicks **Connect New Zone**.
2. Dialog loads unconnected TZDB zones.
3. User searches by name and selects a zone from the list.
4. Clicks **Save** to link the selected TZDB zone to this time zone.
5. Connected zones table refreshes.

### 6.6 Unlink a TZDB Zone

1. User clicks **Unlink** on a connected TZDB zone row.
2. Confirmation dialog appears with the zone name.
3. On confirm, the connection is removed (set to `null`).
4. Connected zones table refreshes.

### 6.7 Edit Time Zone Name (Term)

1. User clicks the time zone name link (list or detail page).
2. Term Modal opens if `NAME_ID` exists and term category is "Time Zone names".
3. User edits translations; data is refreshed on save.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page and section loading indicators. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing for time zone names. |
| `formatTimeZoneDisplay` | `utils/formatTimeZone` | Formats time zone objects to human-readable strings. |
| `api` | `services/api` | Centralized API client. |

---

## 8. UI / UX Specifications

### 8.1 Design System

- **Font family:** `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
- **Primary color:** `#1976d2` (Material Blue)
- **Success color:** `#4caf50` (list save) / `#15803d` (detail save)
- **Danger color:** `#d32f2f` (red — unlink, delete)
- **Background:** `#f5f5f5` (page, section headers), `#ffffff` (cards/table)
- **Border color:** `#EAECF0` (list table), `#e0e0e0` (detail cards/tables)
- **Font sizes:** `0.875rem` (body/table), `0.8rem` (detail fields), `0.75rem` (labels), `0.7rem` (media label)

### 8.2 Key Behavioral Differences from Other Entity Pages

| Behavior | Time Zones | Most Other Entities |
|----------|------------|---------------------|
| **Initial data load** | Does NOT auto-load. Requires explicit Search click. | Varies (some auto-load, some search-first). |
| **Data table columns** | Only 3 data columns (most compact list page). | 6–10 columns typically. |
| **Inline edit type** | Numeric `TextField` with `step: 0.5` (float). | Typically `Checkbox` toggles. |
| **Detail form fields** | Single field (`UTC_OFFSET`). Simplest detail form. | Multiple fields, dropdowns, toggles. |
| **TZDB connection management** | Unique: connect/unlink IANA TZDB zones via dedicated section. | No equivalent in other entities. |
| **PATCH endpoint** | Uses `PATCH` for TZDB connection updates (by name in URL). | All other entities use `PUT` bulk. |
| **Connect dialog** | Searchable, scrollable table with max 100 results, single-select. | No equivalent. |
| **Name display** | Uses `formatTimeZoneDisplay()` which combines name + UTC offset. | Displays `ALIAS_NAME` or `name` directly. |
