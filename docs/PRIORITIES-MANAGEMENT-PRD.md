# Priorities Management — Product Requirements Document (PRD)

**Module:** Priorities Page  
**Version:** 1.0  
**Last Updated:** 2026-03-29  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Priorities Management module is a single-screen CMS tool that enables operators to view, create, edit, and delete data-source priority rules scoped to hierarchical sports entities (Country → Competition → Game). Priorities determine which data sources take precedence for a given update type at a given entity level. The module supports temporal priority overrides (scheduled start/expiration dates), inline editing, bulk operations, and a full audit trail.

The module is implemented as a React SPA page using Material UI, communicating with a RESTful backend API layer.

- **Priorities Page** (`/priorities`) — A context-driven, filterable, sortable, groupable data table with View/Edit mode toggle, inline priority editing, bulk creation, bulk deletion, and per-row audit log access.

---

## 2. Priorities Page

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Dynamic page title reflecting the current context hierarchy, plus a View/Edit mode toggle switch. |
| **Context Selection Panel** | A card containing cascading entity selectors (Country → Sport → Competition → Game ID). |
| **Action Buttons Bar** | Contextual buttons: "Delete Selected" and "Add New Priorities" (edit mode only). |
| **Filter Panel** | Additional filters for Data Source, Update Type, Priority Level (Cut Type), and Priority Value. Visible only when a context is active. |
| **Data Table** | A sortable, groupable, selectable data table with pagination. |
| **Footer** | Total items count. |

### 2.2 Data Loading Strategy

- **Eager parallel load on mount.** All reference data and priority records are fetched simultaneously via `Promise.all`:
  - `getPriorities()` — All priority rules.
  - `getDataSourcesList()` — Data source options.
  - `getUpdateTypes()` — Update type options.
  - `getPriorityLevels()` — Priority level definitions (value-to-name mapping).
  - `getSports()` — Sport type options.
  - `getCountries()` — Country options.
  - `getCompetitions()` — Competition options.
  - `getGamesList()` — Games list.
- A full-screen `CircularProgress` spinner is displayed until all data loads complete.
- Each priority row is augmented with an `_index` field (its array position) used as the unique row identifier for API operations.

### 2.3 URL Parameter Synchronization

The page reads and writes context state to URL search parameters for deep-linking support:

| Parameter | Type | Description |
|-----------|------|-------------|
| `country` | Number | Selected country ID. |
| `competition` | Number | Selected competition ID. |
| `game` | Number | Loaded game ID. |

**On mount (after data loads):**
- If URL contains `game`: resolves the game to its parent competition and country, populates all context selectors, and loads game-level view.
- If URL contains `competition` (no game): resolves the competition to its parent country and sport, populates context selectors.
- If URL contains `country` (no competition/game): sets the country and auto-selects the sport from the first competition in that country.
- If no URL parameters: enables Edit mode by default.

**On context change:** URL parameters are updated via `setSearchParams` with `replace: true`.

### 2.4 Context Selection Panel

A card with cascading entity selectors arranged in a horizontal flex layout:

| Control | Type | Width | Behavior |
|---------|------|-------|----------|
| **Country** | `Autocomplete` (single-select) | 200–250px | Options: countries that have at least one associated competition. Selecting clears Competition and Game. |
| **Sport (Filter Only)** | `Autocomplete` (single-select) | 200–250px | Options: all sport types. Used to filter the Competition dropdown. Selecting clears Competition and Game. |
| **Competition** | `Autocomplete` (single-select) | 200–250px | Options: competitions matching both the selected country AND sport. Disabled when no country or sport is selected, or when no competitions match. Selecting clears Game. |
| **Game ID** | `TextField` (number) + **Load** button | 150–200px + button | Free-form numeric input. "Load" button resolves the game ID: auto-populates sport, country, and competition from the game's parent competition. Disabled when input is empty or non-numeric. |

**Cascading logic:**
- Country available list = countries that appear in at least one competition record.
- Competition available list = competitions where `COUNTRY_ID === selectedCountry` AND `SPORT_TYPE_ID === selectedSport`.
- Loading a Game ID auto-fills all parent context fields.

### 2.5 View/Edit Mode Toggle

Located in the page header, implemented as an `Switch` component with icon labels:

| Mode | Icon | Behavior |
|------|------|----------|
| **View** | `VisibilityIcon` | Read-only table; Priority Value column shows colored `Chip` with optional temporal indicator. No row actions column. |
| **Edit** | `EditNoteIcon` | Editable table; Priority Value column shows inline `Select` dropdown. Actions column with edit button appears. Bulk action buttons visible. |

Toggling mode clears the current row selection.

### 2.6 Empty State

When no context is selected (`hasContext === false`), the table area is replaced with a centered message:

> "Select a context above (Country, Competition, or Game) to view priorities."

### 2.7 Dynamic Page Title

The header title dynamically reflects the current context hierarchy:

- No context: `"Priorities"`
- With context: `"Priorities: {Sport} > {Country} > {Competition} > Game ID: {id}"` (parts omitted when not selected)

Entity names are resolved from their respective lookup arrays.

---

## 3. Data Filtering

### 3.1 Context-Based Filtering (Primary)

The primary filter is the hierarchical context selection. Rows are included based on `CUT_TYPE` and `CUT_VALUE` matching:

| Context Level | Matching Logic |
|---------------|----------------|
| **Game loaded** | Show rows where: (`CUT_TYPE=1` AND `CUT_VALUE=gameID`) OR (`CUT_TYPE=2` AND `CUT_VALUE=competitionID`) OR (`CUT_TYPE=3` AND `CUT_VALUE=countryID`). |
| **Competition selected** (no game) | Show rows where: (`CUT_TYPE=2` AND `CUT_VALUE=competitionID`) OR (`CUT_TYPE=3` AND `CUT_VALUE=countryID`). |
| **Country selected** (no competition/game) | Show rows where: (`CUT_TYPE=3` AND `CUT_VALUE=countryID`). |

The country ID for CUT_TYPE=3 matching is resolved from the selected competition's `COUNTRY_ID` when a competition is selected (hierarchical matching).

### 3.2 Additional Filters (Secondary)

Visible only when a context is active. Applied client-side on top of context-filtered data:

| Filter | Type | Behavior |
|--------|------|----------|
| **Data Source** | `Autocomplete` (multi-select, 300–400px) | Filters by `DATA_SOURCE` field. Options: full data sources list. Chip tags for selected values. |
| **Update Type** | `Autocomplete` (multi-select, 300–400px) | Filters by `UPDATE_TYPE` field. Options: full update types list. Chip tags for selected values. |
| **Priority Level** (Cut Type) | `Select` (single, 180px) | Filters by `CUT_TYPE` field. Options: All, Game (1), Competition (2), Country (3). |
| **Priority Value** | `Select` (single, 150px) | Filters by `PRIORITY` field. Options: dynamically derived from unique priority values in the current filtered dataset plus the currently selected filter value. Displayed as `"{NAME} ({VALUE})"` when a matching priority level name exists. Sorted descending. |

---

## 4. Data Table

### 4.1 Columns

| # | Field | Header | View Mode Rendering | Edit Mode Rendering |
|---|-------|--------|---------------------|---------------------|
| 0 | — | Checkbox | Row selection checkbox. | Row selection checkbox. |
| 1 | `DATA_SOURCE` | Data Source | Resolved name via `dsLookup` (falls back to raw ID). | Same as View. |
| 2 | `UPDATE_TYPE` | Update Type | Resolved name via `utLookup` (falls back to raw ID). | Same as View. |
| 3 | `CUT_TYPE` | Priority Level | `"{CutTypeName} ({resolvedCutValue})"` — e.g., "Country (Germany)", "Competition (Premier League)", "Game (12345)". Cut type names: 1=Game, 2=Competition, 3=Country. Country and Competition IDs resolved to names via lookups. | Same as View. |
| 4 | `PRIORITY` | Priority Value | Colored `Chip` component: green for value 6, red for value -1, default for others. **Temporal indicator:** if `START_DATE` or `EXPIRATION_DATE` is set, a `TimerOutlinedIcon` (warning color) appears next to the chip with a tooltip showing date details. | Inline `Select` dropdown with all priority levels listed as `"{NAME} ({VALUE})"`. Changes trigger immediate API save. |
| 5 | `USER_NAME` | User | Clickable `Chip` (primary color) with the user name. Clicking opens the Audit Log Dialog. Displays "-" when null. | Same as View. |
| 6 | `CREATE_TIME` | Create Time | Formatted as `DD/MM/YYYY HH:MM:SS` (Israel locale). | Same as View. |
| 7 | `COMMENT` | Comment | Direct display; "-" when empty. | Same as View. |
| 8 | — | Actions | Not shown. | `EditIcon` button per row. Opens the Edit Priority Dialog. |

### 4.2 Priority Value Temporal Tooltip

When a priority row has scheduling dates, the tooltip content includes:

| Condition | Tooltip Content |
|-----------|-----------------|
| `START_DATE` set | `"Start: {formattedDate}"` |
| `EXPIRATION_DATE` set | `"Expires: {formattedDate}"` |
| `EXPIRATION_DATE` set + `AFTER_EXPIRED_PRIORITY` set | `"After expired: {value}"` |
| `START_DATE` set (no expiration) + `SCHEDULE_PRIORITY` set | `"Schedule priority: {value}"` |

Parts are joined with `" | "` separator.

### 4.3 Sorting

- Clicking a column header toggles sort direction for that field (ascending ↔ descending).
- Active sort: strings use `localeCompare`; numbers use arithmetic comparison. Nulls sort last.
- **Default sort** (when no explicit sort is active): primary by `CUT_TYPE` ascending, secondary by `CREATE_TIME` descending.

### 4.4 Grouping

- Supported via the `DataTable` component's built-in grouping functionality.
- When grouped, rows are organized under collapsible group headers showing `"{field}: {resolvedValue} ({count})"`.
- Group values are resolved: `DATA_SOURCE` → name, `UPDATE_TYPE` → name, `CUT_TYPE` → Game/Competition/Country.
- Clicking the same group field again ungroups. Grouping resets pagination to page 0.

### 4.5 Row Selection

- Checkbox-based multi-select per row.
- Row ID is the `_index` field (array position in the original priorities data).
- Selection is cleared when toggling between View/Edit mode or changing page.

### 4.6 Pagination

- Configurable rows per page: default 15.
- Pagination operates on the display data (after grouping, if active).
- `Total Items: {count}` displayed below the table (based on filtered, non-grouped count).

---

## 5. CRUD Operations

### 5.1 Inline Priority Value Change (Edit Mode)

- Each row's Priority Value column renders as a `Select` dropdown in edit mode.
- Changing the value immediately triggers:
  1. `api.updatePrioritiesBulk([{ index: row._index, changes: { PRIORITY: newValue } }])`
  2. Full data reload via `loadAll()`.
- No confirmation dialog.

### 5.2 Add New Priorities (Bulk Creation Dialog)

Triggered by the "Add New Priorities" button (visible only in edit mode). Opens the `AddPrioritiesDialog`.

#### 5.2.1 Context Pre-Population

When opened, the dialog pre-populates entity selections from the current page context:
- Sport, Country, Competition, and Game fields are auto-filled and disabled when a context is active.

#### 5.2.2 Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Country | `Autocomplete` (multi-select with Select All) | Yes | Countries with associated competitions. Disabled when context is active. Clearing resets competitions. |
| Sport | `Autocomplete` (multi-select) | No | Used to filter available competitions. Disabled when context is active. |
| Competitions | `Autocomplete` (multi-select with Select All) | No | Filtered by selected countries + sports. Leave empty for country-level priorities. Conditionally rendered. |
| Games | `Autocomplete` (multi-select) | No | Displayed read-only when a game context exists. |
| Data Sources | `Autocomplete` (multi-select with Select All) | Yes | Full data sources list. |
| Update Types | `Autocomplete` (multi-select with Select All) | Yes | Full update types list. |
| Priority | `Select` (single) | Yes | Options: -1 (Ignore), 0, 1, 2, 3, 4, 5, 6 (Always Update). Default: 0. |
| Comment | `TextField` (multiline, 3 rows) | Yes | Minimum 3 characters. |
| Start Date | `DatePicker` | No | Scheduling start date. |
| Expiration Date | `DatePicker` | No | Scheduling expiration date. |
| After Expired Priority | `Select` (single) | Conditional | Required when Expiration Date is set. Same options as Priority. |
| Schedule Priority | `Select` (single) | Conditional | Required when only Start Date is set (no Expiration Date). Same options as Priority. |

#### 5.2.3 CUT_TYPE Derivation

The CUT_TYPE is automatically derived from the most specific entity level selected:

| Condition | CUT_TYPE | CUT_VALUE Source |
|-----------|----------|------------------|
| Games selected | 1 (Game) | Each selected `GAME_ID` |
| Competitions selected (no games) | 2 (Competition) | Each selected `COMPETITION_ID` |
| Countries selected (no competitions/games) | 3 (Country) | Each selected `COUNTRY_ID` |

An info alert at the top of the dialog indicates the targeting configuration.

#### 5.2.4 Cartesian Product Generation

The dialog generates priority records as a cartesian product of:
`(selected entities) × (selected data sources) × (selected update types)`

Each generated record includes the shared priority value, comment, and date fields.

#### 5.2.5 Select All Pattern

Multi-select dropdowns for Countries, Competitions, Data Sources, and Update Types support a "Select All" option at the top of the dropdown list. Clicking it toggles between selecting all options and deselecting all. An indeterminate checkbox state is shown when some but not all options are selected.

#### 5.2.6 Creation Flow

1. Validate required fields.
2. Generate the cartesian product of priority items.
3. Create each item sequentially via `api.createPriority(item)`.
4. Reload all data via `loadAll()`.
5. Close the dialog.

### 5.3 Edit Priority (Single Row Dialog)

Triggered by clicking the edit (`EditIcon`) button on a row in edit mode. Opens the `AddPriorityDialog` in edit mode.

#### 5.3.1 Form Fields

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| Data Source | `Autocomplete` | Yes | **No** (disabled) | Pre-filled, displayed on disabled background. |
| Update Type | `Autocomplete` | Yes | **No** (disabled) | Pre-filled, displayed on disabled background. |
| Priority Level | `TextField` | — | **No** (disabled) | Shows `"{CutTypeName} ({resolvedCutValue})"`. |
| Priority Value | `Select` | Yes | Yes | Options: -1, 0, 1, 2, 3, 4, 5, 6. Labels: `-1 (Ignore)`, `6 (Always Update)`, others as raw value. |
| Comment | `TextField` (multiline, 3 rows) | Yes | Yes | Minimum 3 characters. |
| Start Date | `DatePicker` | No | Yes | |
| Expiration Date | `DatePicker` | No | Yes | |
| After Expired Priority | `Select` | Conditional | Yes | Required when Expiration Date is set. |
| Schedule Priority | `Select` | Conditional | Yes | Required when only Start Date is set (no Expiration Date). |

#### 5.3.2 Edit Flow

1. Validate fields.
2. Call `api.updatePrioritiesBulk([{ index: row._index, changes: payload }])`.
3. Reload all data via `loadAll()`.
4. Close the dialog.

### 5.4 Bulk Delete

Triggered by the "Delete Selected ({count})" button. Requires at least one selected row.

1. Opens a `ConfirmationDialog` (warning type, marked as dangerous):
   - Title: "Delete Selected Priorities"
   - Message: `"Are you sure you want to delete {count} selected priority/priorities?"`
2. On confirm: calls `api.deletePrioritiesBulk(indices)` with the `_index` values of selected rows.
3. Reloads all data via `loadAll()`.
4. Clears selection.

---

## 6. Audit Log Dialog

Triggered by clicking a user name `Chip` in the User column. Opens the `AuditLogDialog`.

### 6.1 Dialog Header

- Title: "Priority Change History"
- Subtitle: `"— {DataSourceName} / {UpdateTypeName} / {CutTypeName} : {resolvedCutValue}"`

### 6.2 Data Loading

On open, fetches history via `api.getPriorityHistory({ data_source, update_type, cut_type, cut_value })` filtered to the specific priority row's identity fields.

### 6.3 History Table

| Column | Description |
|--------|-------------|
| Update Time | Formatted as `DD/MM/YYYY HH:MM:SS`. |
| User | `Chip` (primary color) with user name, or "-". |
| Priority Level | Colored `Chip`: green for 6, red for -1, default otherwise. |
| Cut Type | Game / Competition / Country. |
| Cut Value | Resolved via `resolveCutValue` (names for countries/competitions, raw ID for games). |
| Comment | Direct display. Deleted entries (comment starts with `[DELETED]`) are highlighted in red with bold text. |
| Start Date | Formatted date or "-". |
| Expiration | Formatted date or "-". |
| After Expired | Priority value or "-". |
| Schedule | Priority value or "-". |

### 6.4 Visual States

- **Deleted entries:** rows with comments starting with `[DELETED]` are rendered with error background color and reduced opacity (0.85).
- **Empty state:** "No history entries found for this priority."
- **Loading state:** centered `CircularProgress`.
- Maximum table height: 500px with sticky header (scrollable).

---

## 7. Data Model

### 7.1 Priority Record

| Field | Type | Description |
|-------|------|-------------|
| `DATA_SOURCE` | Number | Foreign key to Data Sources entity. |
| `UPDATE_TYPE` | Number | Foreign key to Update Types entity. |
| `PRIORITY` | Number | Priority value (-1 to 6). |
| `CUT_TYPE` | Number | Entity level: 1=Game, 2=Competition, 3=Country. |
| `CUT_VALUE` | Number | Entity ID matching the CUT_TYPE (Game ID, Competition ID, or Country ID). |
| `COMMENT` | String | User-provided comment/reason. |
| `USER_NAME` | String \| null | Name of the user who last modified the record. |
| `CREATE_TIME` | String | Creation timestamp (format: `"DD-MM-YY HH:MM"`). |
| `START_DATE` | String \| null | ISO datetime for scheduled priority activation. |
| `EXPIRATION_DATE` | String \| null | ISO datetime for priority expiration. |
| `AFTER_EXPIRED_PRIORITY` | Number \| null | Priority value to revert to after expiration. |
| `SCHEDULE_PRIORITY` | Number \| null | Priority value before the scheduled start date activates. |

### 7.2 Priority Levels

| ID | VALUE | NAME |
|----|-------|------|
| 1 | -1 | Ignore |
| 2 | 0 | Neutral |
| 3 | 1 | One |
| 4 | 2 | Two |
| 5 | 3 | Three |
| 6 | 4 | Four |
| 7 | 5 | Five |
| 8 | 6 | Always Update |

### 7.3 Cut Types

| Value | Label | Description |
|-------|-------|-------------|
| 1 | Game | Priority scoped to a specific game. |
| 2 | Competition | Priority scoped to a competition. |
| 3 | Country | Priority scoped to a country (broadest scope). |

### 7.4 Composite Identity

A priority rule is uniquely identified by the combination of: `DATA_SOURCE` + `UPDATE_TYPE` + `CUT_TYPE` + `CUT_VALUE`.

---

## 8. Cross-Cutting Behaviors

### 8.1 Date Formatting

All dates are displayed in Israel locale format: `DD/MM/YYYY HH:MM:SS`. The formatter handles:
- Short format input: `"DD-MM-YY HH:MM"` (auto-expands 2-digit year: <70 → 20xx, ≥70 → 19xx).
- Standard `Date`-parseable strings.
- Returns the raw value if parsing fails.
- Returns `"-"` for null/undefined values.

### 8.2 Lookup Resolution

Entity IDs are resolved to human-readable names via memoized lookup maps:
- `dsLookup`: `DATA_SOURCE_ID` → `ALIAS_NAME`
- `utLookup`: `UPDATE_TYPE_ID` → `ALIAS_NAME`
- `plLookup`: Priority Level `ID` → full record (`{ID, VALUE, NAME}`)
- `countryLookup`: `COUNTRY_ID` → `name`
- `competitionLookup`: `COMPETITION_ID` → `name`

### 8.3 Error Handling

- `try/catch` blocks around all API calls with `console.error` logging.
- Loading state: full-screen `CircularProgress` during initial data load.
- No user-facing error notifications in the current implementation (errors are logged to console).

### 8.4 State Reset on Context Change

- Changing Country resets: Competition, Game ID input, loaded Game ID.
- Changing Sport resets: Competition, Game ID input, loaded Game ID.
- Changing Competition resets: Game ID input, loaded Game ID.
- Toggling View/Edit mode resets: selected rows.
- Changing page resets: selected rows.

---

## 9. API Dependencies

### 9.1 Priorities

- `getPriorities()` — Fetch all priority rules.
- `createPriority(data)` — Create a single priority rule (POST `/priorities`).
- `updatePrioritiesBulk(updates)` — Bulk update priority rules (PUT `/priorities/bulk`). Payload: `[{ index, changes }]`.
- `deletePrioritiesBulk(indices)` — Bulk delete priority rules (DELETE `/priorities/bulk`). Payload: `{ indices: [...] }`.
- `getPriorityHistory({ data_source, update_type, cut_type, cut_value })` — Fetch change history for a specific priority identity (GET `/priorities/history?...`).

### 9.2 Reference Data

- `getDataSourcesList()` — Data source definitions.
- `getUpdateTypes()` — Update type definitions.
- `getPriorityLevels()` — Priority level definitions (GET `/data/priority-levels`).
- `getSports()` — Sport type options.
- `getCountries()` — Country options.
- `getCompetitions()` — Competition options.
- `getGamesList()` — Games list.

---

## 10. Component Architecture

| Component | Path | Description |
|-----------|------|-------------|
| `PrioritiesPage` | `frontend/src/pages/PrioritiesPage.jsx` | Main page component. Manages all state, context selection, filtering, and table rendering. |
| `AddPrioritiesDialog` | `frontend/src/components/priorities/AddPrioritiesDialog.jsx` | Bulk creation dialog. Multi-entity cartesian product generator with Select All support. |
| `AddPriorityDialog` | `frontend/src/components/priorities/AddPriorityDialog.jsx` | Single priority create/edit dialog. Shared between add and edit flows (via `isEdit` prop). |
| `AuditLogDialog` | `frontend/src/components/priorities/AuditLogDialog.jsx` | Priority change history viewer. Read-only table of historical changes. |
| `DataTable` | `reuse/DataTable.jsx` | Reusable table component with sorting, grouping, pagination, and selection. |
| `PageHeader` | `reuse/PageHeader.jsx` | Reusable page header with title and action slot. |
| `PrimaryButton` | `reuse/PrimaryButton.jsx` | Styled primary action button. |
| `ConfirmationDialog` | `reuse/ConfirmationDialog.jsx` | Reusable confirmation modal with warning/danger styling. |
| `DatePicker` | `reuse/DatePicker.jsx` | Reusable date picker component. |
| `SecondaryButton` | `reuse/SecondaryButton.jsx` | Styled secondary action button. |

---

## 11. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18+ (functional components, hooks) |
| UI Library | Material UI (MUI) v5 |
| Routing | React Router v6 (`useSearchParams`) |
| State Management | Local component state (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) |
| API Layer | Custom `api` service module |

---

## 12. Key Data Entities

| Entity | Primary Key | Role in Priorities |
|--------|-------------|-------------------|
| Priority Rule | `_index` (array position) | The core managed entity. |
| Data Source | `DATA_SOURCE_ID` | Identifies the data provider. |
| Update Type | `UPDATE_TYPE_ID` | Identifies the type of data update. |
| Priority Level | `ID` / `VALUE` | Defines the priority scale (-1 to 6). |
| Country | `COUNTRY_ID` | Broadest scope entity (CUT_TYPE=3). |
| Competition | `COMPETITION_ID` | Mid-level scope entity (CUT_TYPE=2). |
| Game | `GAME_ID` | Most specific scope entity (CUT_TYPE=1). |
| Sport Type | `SPORT_TYPE_ID` | Used for filtering competitions in context selection. |
| Priority History | Composite key | Audit trail entries for priority changes. |
