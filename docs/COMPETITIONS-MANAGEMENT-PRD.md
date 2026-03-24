# Competitions Management — Product Requirements Document (PRD)

**Module:** Competitions List & Competition Details  
**Version:** 1.0  
**Last Updated:** 2026-03-02  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Competitions Management module is a two-screen CMS product that enables operators to browse, search, create, configure, and deeply manage sports competition entities and their full hierarchical structure (Seasons → Stages → Groups → Competitors/Games/Participants). It is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Competitions List** (`/competitions`) — A filterable, sortable, paginated data table with inline editing, bulk operations, CSV export, and competition creation.
- **Competition Details** (`/competitions/:id`) — A comprehensive detail view organized into General Details (always visible) and four Extended Details tabs: Structure, Configurations, Tools & Screens, and Table Settings.

---

## 2. Competitions List Screen

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Competitions List") and a "Create Competition" button (top-right). |
| **Filter Panel** | A collapsible row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete, restore, export), pagination controls, and selection counter. |

### 2.2 Data Loading Strategy

- **No default data load.** The table renders empty on mount with the message: *"No competitions found. Click Search to load data."*
- On mount, only dropdown/reference data is loaded in parallel via `Promise.allSettled`: Countries, Sports, Competition Types, Terms, and Categories.
- Data is fetched only when the user explicitly clicks the **Search** button, which calls `api.getCompetitions({ showDeleted })` and `api.getPartnerIdCompetitions()` in parallel.

### 2.3 Filter Panel

Five filter controls arranged in a responsive 5-column grid (`xs:12 sm:6 md:2.4` each):

| Filter | Type | Behavior |
|--------|------|----------|
| **Country** | `Autocomplete` (multi-select) | Filters by `countryName` or `country` field. Options sourced from `/countries`. |
| **Sport Type** | `Autocomplete` (multi-select) | Filters by `sport` field or matched `SPORT_TYPE_ID`. Options sourced from `/sports`. |
| **Competition ID** | `TextField` (free text) | Supports exact numeric ID match, partial ID substring match, or case-insensitive name substring match. |
| **Gender** | `Select` (single) | Options: All, Male (1), Female (2). |
| **Competition Type** | `Select` (single) | Options dynamically populated from `/competition-types`. |

Action buttons:
- **Search** — Triggers data fetch; resets pagination to page 0.
- **Clear Filters** — Resets all filter values and column filters; resets page to 0.
- **Show Deleted** (`Switch`) — Toggles `showDeleted` parameter; requires a subsequent Search to take effect.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | Behavior |
|---|-------|--------|-------|----------|
| 0 | — | Checkbox | — | Row selection (select-all in header). |
| 1 | `COMPETITION_ID` | ID | 70px | Rendered in blue (`#1976d2`) with `fontWeight: 500`. |
| 2 | `name` | Name | 160px | Avatar (from `COMPETITION_IMAGE_URL` or fallback trophy icon) + clickable name. Click opens Term Edit Modal for `NAME_ID` under category "Competitions Names". |
| 3 | `countryName` | Country | 100px | Falls back to `country` field, then `"-"`. |
| 4 | `sport` | Sport | 90px | Direct display. |
| 5 | `GENDER` | Gender | 90px | In view mode: "Male" / "Female" / "—". In edit mode: inline `Select` dropdown. |
| 6 | `COMPETITION_TYPE` | Type | 100px | Resolved via `competitionTypes` lookup. |
| 7 | `MAIN_COLOR` | Main Color | 110px | In view mode: colored 28×28 swatch. In edit mode: native `<input type="color">` + hex label. Color stored as integer; displayed via `numberToHex()` conversion. |
| 8 | `pid` | PID | 50px | Partner ID count, computed from `partnerIdList` grouped by `COMPETITION_ID`. |
| 9 | `HIDE_ON_CATALOG` | Hide Catalog | 90px | "Yes" / "No" / "—". |
| 10 | `HIDE_ON_SEARCH` | Hide Search | 90px | "Yes" / "No" / "—". |
| 11 | `ENABLE_DASHBOARD_BUZZ` | Dashboard Buzz | 100px | "Yes" / "No" / "—". |
| 12 | — | Bet Lines | 80px | Placeholder ("—"). No filter. |
| 13 | — | Screens | 70px | Info icon button; opens Screens Dialog. No filter. |

#### 2.4.2 Column-Level Filtering

Each column header (except those marked `noFilter`) contains an inline text input. Filtering is case-insensitive substring matching, applied client-side after the top-level filter panel. Numeric values support both exact match and substring match.

#### 2.4.3 Sorting

- Each sortable column header displays Up/Down arrow icons.
- Clicking toggles between ascending and descending for that field.
- Active sort direction is highlighted in blue (`#1976d2`).
- Sort logic: strings use `localeCompare`; numbers use arithmetic comparison. Nulls sort last.

#### 2.4.4 Grouping

- Each sortable column header displays a "Group" icon (list icon).
- Clicking groups rows by that column's value. Clicking the same column again ungroups.
- Group headers are collapsible rows showing `{field}: {value} ({count})`.
- When grouped, pagination operates on the flattened group-header + expanded-row list.

#### 2.4.5 Row Interaction

- **Click on row** (when not in Edit Mode): navigates to `/competitions/{COMPETITION_ID}`.
- **Click on row** (in Edit Mode): no navigation; cursor is `default`.
- **Deleted rows** (when `showDeleted` is on): rendered with reduced opacity (0.85), gray background (`#f5f5f5`), and muted text color (`#666`).
- **Click on Name column**: opens Term Edit Modal (stops propagation to prevent navigation).
- **Click on Gender/Color/Screens columns**: stops propagation to prevent navigation.

### 2.5 Row Selection & Bulk Operations

- Header checkbox: select-all / deselect-all for current page.
- Individual row checkboxes for multi-select.
- Selection counter displayed in footer: `"{n} selected"` with a "Clear selection" text button.

| Action | Condition | Behavior |
|--------|-----------|----------|
| **Delete selected** | `selectedRows.length > 0` | Confirmation dialog → soft-deletes via `api.updateCompetition(id, { IS_DELETED: true })` for each selected ID → refreshes list. |
| **Restore selected** | `selectedRows.length > 0` AND `showDeleted === true` | Confirmation dialog → restores via `api.updateCompetition(id, { IS_DELETED: false })` for each selected ID → refreshes list. |
| **Export to CSV** | Always enabled | Exports selected rows (or all filtered rows if none selected). Columns: `COMPETITION_ID, name, countryName, sport, GENDER, MAIN_COLOR (hex), PID, HIDE_ON_CATALOG, HIDE_ON_SEARCH, ENABLE_DASHBOARD_BUZZ`. File name: `competitions_YYYY-MM-DD.csv`. |

### 2.6 Inline Edit Mode

Toggled via the "Edit Mode" / "Cancel Edit" button in the footer.

- **Editable fields (per row):** `GENDER` (dropdown), `MAIN_COLOR` (color picker + hex display).
- Changes are tracked in a `pendingChanges` map keyed by `COMPETITION_ID`.
- **Save Changes** button: disabled when no pending changes; shows count of modified competitions. Iterates over `pendingChanges` and calls `api.updateCompetition(id, updates)` for each. On success: merges changes into local state, exits edit mode.
- **Cancel Edit**: if unsaved changes exist, shows `window.confirm()` dialog; on confirm, discards changes and exits edit mode.

### 2.7 Pagination

- Configurable rows per page: 10 / 25 (default) / 50 / 100.
- Display format: `{start}-{end} of {total}`.
- Previous/Next navigation buttons; disabled at boundaries.
- Page auto-adjusts when filtering reduces total rows below current page.

### 2.8 Create Competition Dialog

Triggered by the "Create Competition" header button.

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | `TextField` | Yes | — | Creates a Term under "Competitions Names" category. |
| Country | `Select` | Yes | — | Populated from countries API. |
| Sport Type | `Select` | Yes | — | Populated from sports API. |
| Gender | `Select` | No | Male (1) | Options: Male, Female. |
| Competition Type | `Select` | No | 1 | Populated from competition types API. |

**Creation flow:**
1. Validate required fields; display inline error messages.
2. Create a new Term via `api.createTerm({ category: 'Competitions Names', values: [{ languageId: 1, value, isDefault: true, status: 'Approved' }] })`.
3. Create the competition via `api.createCompetition({ NAME_ID, COUNTRY_ID, SPORT_TYPE_ID, GENDER, COMPETITION_TYPE })`.
4. Refresh the competitions list.
5. Navigate to the newly created competition's detail page.

### 2.9 Screens Dialog

A modal listing quick-navigation links to sub-screens of a competition:
- Reports, Priorities, Bet Lines, Team of The Week, Cards Order, Featured Match, Draw.
- Each item generates a path: `/competitions/{id}/{screen-slug}`.

### 2.10 Snackbar Notifications

Global snackbar (bottom-center, auto-hide 6s) for all success, error, and warning messages.

---

## 3. Competition Details Screen

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Navigation** | "Back to List" button → `/competitions`. |
| **Title** | "Competition - {name}" where name is clickable (opens Term Edit Modal for the competition's `NAME_ID` under "Competitions Names"). |
| **General Details** | Always-visible card with media, fields, and boolean toggles. Includes own Save button. |
| **Extended Details** | Sticky-header card containing 4 tabs. Includes own Save button (saves all pending changes across tabs). |

### 3.2 Data Loading

On mount (and when `id` changes), three parallel data loads:
1. **Competition data:** `api.getCompetitionById(id)` with fallback to `api.getCompetitions()` + find by ID. Also loads all competitions list (for Father Competition resolution) and seasons/stages for General Details display.
2. **Terms & Categories:** `api.getTerms()`, `api.getCategories()`.
3. **Reference data (9 parallel calls):** Countries, Sports, Genders, Competition Types, Standing Types, Sub Sport Types, Competitor Types, Priority Levels, Stages Types.

Additional background loads: Buzz Item Types, Surfaces, Table Settings field options.

### 3.3 General Details Section

A three-column layout: Media (left), Fields (center), Booleans (right).

#### 3.3.1 Media Panel (left, fixed 200px)

- **Competition Image**: 72×72 Avatar. Falls back to trophy icon on load error.
- **Trophy Image**: 72×72 Avatar. Falls back to trophy icon on load error.
- **Upload Image** button: opens Image Edit Dialog (tabbed: Competition / Trophy) where user enters a URL.
- **Image Version** button (disabled): displays `IMG_VER` value.

**Image Edit Dialog:**
- Two modes: "competition" and "trophy", selected via tabs.
- User enters an image URL.
- On save: calls `api.updateCompetition(id, { [COMPETITION|TROPHY]_IMAGE_URL })`.

#### 3.3.2 Fields Grid (center, responsive 4 columns)

| Row | Fields |
|-----|--------|
| **Row 1** | Country (`Autocomplete`), Sport (`Autocomplete`), Gender (`Select`), Competition Type (`Select`) |
| **Row 2** | Current Season (disabled display), Current Stage (disabled display), Father Competition (`TextField` with resolved name caption), Current Round (`TextField` number) |
| **Row 3** | Sub Sport Type (`Select`, conditionally visible for Tennis/Basketball), Competitors Type (`Select`), Host City (`Autocomplete` with create-new capability), Main Color (`color` input), Secondary Color (`color` input) |

**Host City** special behaviors:
- When a value is set: read-only display; if the value maps to a term in "Cities" category, the field is clickable (opens Term Edit Modal). Has a clear (×) button.
- When empty: Autocomplete with freeSolo, filtering starts at 3 characters. "+" icon to create a new City term inline.

**Father Competition** resolves the entered ID to a competition name via the loaded all-competitions list.

**Conditional fields:**
- `SUB_SPORT_TYPE`: only rendered when `SPORT_TYPE_ID` is Tennis (3) or Basketball (2). Options filtered by the selected sport.

#### 3.3.3 Boolean Toggles (right column)

Five checkboxes, always visible:
- Hide On Search (`HIDE_ON_SEARCH`)
- Hide On Catalog (`HIDE_ON_CATALOG`)
- Enable Dashboard Buzz (`ENABLE_DASHBOARD_BUZZ`)
- Support Competition Dashboard (`SUPPORT_COMPETITION_DASHBOARD`)
- Hide LMT/LAW (`HIDE_LMT`)

#### 3.3.4 Save Button ("Save & Update In Service")

- Disabled when no General Details changes are detected (deep comparison of `GENERAL_DETAILS_KEYS` against original competition data).
- On save: validates color hex format (`#XXXXXX`) and numeric table points → calls `api.updateCompetition(id, payload)` → reloads competition.

### 3.4 Extended Details — Tab System

Four tabs with a sticky header containing the section title and a unified Save button:

| Tab Index | Label | Description |
|-----------|-------|-------------|
| 0 | **Structure** | Seasons, Phases, Stages, Groups, Competitors, Games, Participants, Standings. |
| 1 | **Configurations** | 5 collapsible accordion sections: General, Statuses & Scores, Lineups, Statistics, Betting. |
| 2 | **Tools & Screens** | Quick navigation buttons to sub-screens. |
| 3 | **Table Settings** | Point configuration, scoring rules, and table order parameters. |

The Extended Details Save button detects changes across: competition formData, structureSeasonForm, structureStageForm, structurePhaseForm, structureGroupForm — and saves all modified entities in sequence.

---

### 3.5 Structure Tab (Tab 0)

The Structure tab implements a hierarchical CRUD system: **Competition → Seasons → Stages → Groups**, with ancillary management of Phases, Competitors, Games, Participants, and Standings.

#### 3.5.1 Seasons Section

**Season Selector:**
- `Autocomplete` dropdown listing all seasons, labeled `#NUM - Name (Current)`.
- Auto-selects the competition's `CURRENT_SEASON` on load; falls back to the highest `SEASON_NUM`.
- Edit Name button (MoreVert icon): opens Term Edit Modal for the season's `NAME_ID` under "Seasons Names".

**Season Actions:**
- **SET CURRENT**: calls `api.updateCompetition(id, { CURRENT_SEASON: seasonNum })`. Disabled for the already-current season.
- **CREATE**: opens New Season Dialog.
- **DELETE**: confirmation dialog → `api.deleteSeason(id, seasonNum)`. Disabled for the current season.
- **TABLE SETTINGS**: opens Season Table Settings Dialog.

**Season Details Form (inline, below selector):**

| Field | Type | Notes |
|-------|------|-------|
| Season Key | `TextField` | Placeholder: `<Default>YYYY/YYYY`. |
| Start Date | `DateTimePicker` | ISO datetime. |
| End Date | `DateTimePicker` | ISO datetime. |
| CONNECT GAMES & COMPETITORS | `Button` | Placeholder action. |

**Season Configuration (10 checkboxes in a 4-column grid):**
- Use Name, Show Top Athletes, Has Brackets, Has Table, Has Info Card, Has Seed, Show Top Teams Tab, Show Outrights Tab, Present Competition Rules, Show Matches.

**New Season Dialog:**

| Field | Type | Notes |
|-------|------|-------|
| Season Name | `TextField` | Creates a Term under "Seasons Names". |
| Start Date | `DateTimePicker` | Optional. |
| End Date | `DateTimePicker` | Optional. |
| Set as Current Season | `Checkbox` | If checked, updates `CURRENT_SEASON` after creation. |
| Based on Last Season | `Checkbox` | UI flag (logic delegated). |

Auto-assigns `SEASON_NUM = max(existing) + 1`. Default boolean values on creation: `HAS_TABLE: true`, `HAS_BRACKETS: false`, `USE_NAME: false`, `SHOW_TOP_ATHLETES: true`, `SHOW_INFO_CARD: true`, `SHOW_MATCHES: true`, `PRESENT_COMPETITION_RULES: true`.

#### 3.5.2 Season Competitors Section

Integrated directly within the Seasons section. Two-panel layout (55% / 45%) with action buttons in the middle.

**Left Panel: "Competitors In Season"**
- Table with columns: Checkbox, ID, Name (with avatar), Country, Status, Seed (conditional on `HAS_SEED`), Not In Season.
- **Status** dropdown per row: Host, Promoted, Relegated, (empty). Updates immediately via `api.updateSeasonCompetitor()`. Tooltip shows origin competition name for promoted/relegated.
- **Seed** editable number field per row (onBlur save).
- **Not In Season** checkbox per row (immediate save).
- Paginated (25/50/100/200 rows per page).

**Right Panel: "Competitors Not In Season"**
- Filters: Country (`Select`), Competition (`Select`, conditionally visible when Country is set, filtered by same sport + country), Competitor Name (`TextField`), Search button.
- Default filters auto-set to competition's country and current competition ID.
- Table with columns: Checkbox, ID, Name (with avatar), Country.
- Paginated (25/50/100/200 rows per page).

**Middle Action Buttons:**
- **<< ADD COMPETITORS**: adds selected "Not In Season" competitors to the season.
- **REMOVE COMPETITORS >>**: removes selected "In Season" competitors from the season.
- **REMOVE FROM ALL SEASONS**: confirmation dialog → removes selected competitors from all seasons of the competition.

#### 3.5.3 Phases Section

Rendered as a collapsible `Accordion` (collapsed by default), visible when a season is selected.

**Phase Table:**
- Columns: Order, Name (clickable → Term Edit Modal for "Phases Names"), Parent Phase, Show Stats (checkbox), Use Name (checkbox), Top Athletes %.
- Row click selects the phase.

**Phase Actions:**
- **CREATE NEW**: opens Phase Dialog.
- **DELETE PHASE**: deletes the selected phase.

**Phase Details Form (inline, below table, when a phase is selected):**
- Parent Phase (`Select`), Top Athletes % (`TextField`), Show Stats (`Checkbox`), Use Name (`Checkbox`).

**Phase Dialog (Create/Edit):**

| Field | Type | Notes |
|-------|------|-------|
| Phase Name | `TextField` or existing term selection | Creates Term under "Phases Names" on add. |
| Parent Phase | `Select` | References existing phases in the season. |
| Show Stats | `Checkbox` | Default: true. |
| Use Name | `Checkbox` | Default: false. |
| Overtime Length | `TextField` (number) | Optional. |
| Top Athletes Min Appearances % | `TextField` (number) | Optional. |

Auto-assigns `PHASE_NUM = max(existing) + 1`.

#### 3.5.4 Stages Section

Visible when a season is selected. Loads stages and phases for the selected season on demand.

**Stages Table (12 columns, drag-and-drop reorderable):**
- Order (with drag handle), Name (clickable → Term Edit Modal for "Stages Names"), Type, Has Table, Num Of Games, Is Series, Connected To Previous, Filter Division, Include in bracket, Pre Visual Brackets, Connected In Brackets, Phase.
- Rows are draggable; dropping reorders by updating `PRESENTATION_ORDER` for all stages via API.
- Rows are sorted by `PRESENTATION_ORDER` (falls back to `STAGE_NUM`).
- Row click selects the stage.

**Stage Actions:**
- **SET AS CURRENT**: calls `api.updateCompetition(id, { CURRENT_SEASON, CURRENT_STAGE })`. Disabled when already current.
- **CREATE NEW**: opens Stage Dialog.
- **DELETE STAGE**: deletes selected stage. Disabled for the current stage.
- **GENERATE**: opens Generate Stages Dialog.

**Stage Details Form (inline, below table, when a stage is selected):**
- Stage Type (`Select`), Phase (`Select` from season's phases), Num Of Games (`TextField`), Start Date (`DateTimePicker`), End Date (`DateTimePicker`).
- CONNECT GAMES TO STAGE button (placeholder).

**Stage Configuration (7 checkboxes):**
- Has Table, Is Series, Connected To Previous Stage, Filter Division, Include in bracket, Pre Visual Brackets, Connected In Brackets.
- Special: checking "Has Table" also enables `HAS_TABLE` on the parent season.

**Table Options (conditional on `HAS_TABLE`):**
- Has Home/Away Table, Hide Home/Away Table, Hide Main Table, Has Position Table.
- If Has Position Table: Position number input, Position Table Name (`Autocomplete` from "Position Table Names" terms).
- Aggregation Table (`TextField`), Relegation Table (`TextField`).
- MANAGE STANDINGS button.

**Stage Dialog (Create/Edit):**

| Field | Type | Notes |
|-------|------|-------|
| Stage Name | `TextField` or existing term selection | Creates Term under "Stages Names" on add. |
| Stage Type | `Select` | Default: 1. |
| Num Of Games | `TextField` | Default: -1. |
| Start/End Date | DateTime inputs | Optional. |
| Set as Current | `Checkbox` | On create, optionally sets current season+stage. |
| 7 boolean checkboxes | `Checkbox` | Various stage flags. |
| Phase | `TextField` | Optional phase association. |

Auto-assigns `STAGE_NUM = max(existing) + 1`.

#### 3.5.5 Groups Section

Visible when both a season and a stage are selected. Two-column layout: Groups (left, 55%), Competitors Not In Groups (right, 45%).

**Groups — Accordion List:**
- Each group is a clickable accordion item.
- Clicking selects the group and loads: Group Competitors, Group Games, Group Participants, Competitors Not In Groups.
- Competitor count is pre-loaded for each group badge.

**Group Details Form (inline, when a group is selected):**
- Name (`Autocomplete`), Group Category Num, Father Group, plus 6 boolean checkboxes: Has Table, Is Series, Use Name, Group By, Autonomous, Is Final.

**Group Actions:**
- **CREATE NEW**: opens Group Dialog.
- **Edit**: opens Group Edit Dialog (from accordion header).
- **Delete**: deletes the group.

**Group Dialog (Create/Edit):**

| Field | Type | Notes |
|-------|------|-------|
| Group Name | `TextField` or existing term selection | Creates Term under "Groups Names" on add. |
| Has Table | `Checkbox` | Default: true. |
| Is Series, Use Name, Group By, Autonomous, Is Final | `Checkbox` | Default: false. |

Auto-assigns `GROUP_NUM = max(existing) + 1`.

**Group Competitors (In Group / Not In Groups):**
- Left: table of competitors assigned to this group, with `PARTICIPANT_NUM` editable field.
- Right: table of competitors in the season but not in any group.
- Action buttons: Add to group, Remove from group, Remove selected.

**Group Games Table:**
- Lists games within the selected group.
- Inline edit mode per row (edit button → Save/Cancel).
- Add Game, Delete Game actions.

**Group Participants Table:**
- Lists participants within the selected group.
- Inline edit mode per row.
- Add Participant (opens dialog to create/select term under "Participants Names"), Delete Participant, clickable participant names open Term Edit Modal.

#### 3.5.6 Manage Standings Dialog

Opened from a stage context. Loads standings, destinations, and points deductions in parallel.

**Standings Table:**
- Filterable by group.
- Toggle between view and edit modes.
- In edit mode: all numeric fields are editable inline.
- Recalculate Live toggle.

**Destinations Section (collapsible):**
- Add/Remove/Remove All destinations.
- Fields per destination: Destination Num, Color, From/To Position, Destination Type (`Select`: Unknown, ContinentalSecondaryCup, DomesticCup, Relegation), Table Type (`Select`: Regular, Position, Aggregate, Relegation), Group Num, Destination Competition/Season/Stage/Group, Name (term reference, clickable), Guaranteed Text.

**Points Deductions Section (collapsible):**
- Add/Remove/Remove All deductions.
- Fields per deduction: Competitor Num, Points, Goals For, Goals Against, Reason Term (clickable → Term Edit Modal for "Points Deduction Reasons"), Deduction Date.

**Save** saves all three sections (standings, destinations, deductions) in parallel.

#### 3.5.7 Season Table Settings Dialog

Mirrors the Table Settings tab UI but scoped to a single season. Fields:
- Point configuration (7 point keys).
- Scoring rules (3 checkboxes: Support Draw, Count Extra Time Score, Count Penalties Score).
- Standing Type (conditional on Basketball).
- ORDER_BY list with drag-and-drop reordering, add/remove.

Saves via `api.updateSeason(id, seasonNum, payload)`.

---

### 3.6 Configurations Tab (Tab 1)

Five collapsible accordion sections, each following a consistent layout: fields (left/center grid) + boolean checkboxes (right column).

#### 3.6.1 General

**Fields (4-column grid):**
- Promote Athlete Recently Trophy (Days)
- Promote Athlete New Trophy (Days)
- Transfer Window Start Date / End Date
- Bracket Final Name (`Autocomplete` from "Finals" terms, with create-new and term click-through)
- Round Name (`Autocomplete` from "Rounds Names" terms, with create-new and term click-through)
- Display Article Before/After (Hours)
- Premium Social Before/After (Hours)
- Game Summary Popup Relevancy (Hours)
- Buzz Item Type (`Select` from Buzz Item Types API)
- Tier (number)
- Recognition Time Span (Hours)
- Surface Type (`Select`, only for Tennis competitions)

**Booleans (2-column grid):**
- Display History, Hide From Popular When No Active Season, Promote During Active Season, Support Fans Rate, Block Auto Transfer, Hide Athlete Game Card, Display Cards, Allow Notification For Father Competition.

#### 3.6.2 Statuses & Scores

**Fields:**
- Always Update Score Above Priority (`Select` from Priority Levels)
- Min Priority to Update Status (`Select` from Priority Levels)

**Booleans (3-column grid):**
- Auto Start Games, Auto Change Statuses, Auto Added Time, Update Score From 2nd Source, Support Draw In 90, Ignore Away Goals Advantage.

#### 3.6.3 Lineups

**Fields (3-column grid):**
- Lineups Notification Delay (Minutes)
- Probable Lineups Restriction (Hours)
- Min Players In Lineups
- Max Players In Lineups
- Time To Notify Any Lineups (Minutes)

**Booleans (horizontal row):**
- Require Formation, Show Disconnected Players In Missing, Notify Official Lineups, Notify Probable Lineups, Support Missing Players.

#### 3.6.4 Statistics

**Fields (3-column grid):**
- Top Athletes Min Appearances (%)
- Personal Fouls (Basketball only)
- Team Fouls (Basketball only)
- Min Round to Show Pre-Game Top Performers
- Key Players Before A Game (Days)
- Players Stats Max Position
- Player Statistics Update Delay

**Booleans (3×2 grid):**
- Hide Competition Stats, Man of the Match Enabled, Display Top Performers, Show Top Performers Pre-Match, Show Top Performers Live, Show Top Performers Post-Match.

#### 3.6.5 Betting

**Fields:**
- Head to Head Layout (`Select`: Default, US)

**Booleans (3-column grid):**
- Calculate Win Probability, Calculate Win Probability Insights, Calculate Live Win Probability, Support Insights Popup for Props, Support Props Betting, Support Trends, Show Spread, Show Promoted Trends, Hide from H2H In Father Competition.

---

### 3.7 Tools & Screens Tab (Tab 2)

A horizontal row of outlined buttons providing quick navigation links:
- Reports, Info Card, Priorities, Bet Lines, Team of The Week, Cards Order, Featured Match, Draw.

---

### 3.8 Table Settings Tab (Tab 3)

Two-column layout: Point Configuration (left), Table Order Parameters (right).

**Point Configuration (left):**
- 7 numeric fields in a 4-column grid:
  - TABLE_WINNER_POINTS, TABLE_DRAW_POINTS, TABLE_LOSER_POINTS, TABLE_WIN_AFTER_EX_POINTS, TABLE_LOS_AFTER_EX_POINTS, TABLE_WIN_AFTER_PEN_POINTS, TABLE_LOS_AFTER_PEN_POINTS.
- Standing Type (`Select`, only for Basketball, from Standing Types API).

**Scoring Rules:**
- 3 checkboxes: Support Draw (`TABLE_IS_EVEN_EXISTS`), Count Extra Time Score (`TABLE_COUNT_ET_SCORE`), Count Penalties Score (`TABLE_COUNT_PEN_SCORE`).

**Table Order Parameters (right):**
- Ordered list with drag-and-drop reordering (HTML5 drag API).
- Each item shows: index, field label (resolved from table settings), direction (Ascending/Descending).
- Remove button per item.
- Add section: Select field (excluding already-added), Select direction (Ascending/Descending), Add button.
- ORDER_BY is serialized as `field:direction,field:direction,...` string.
- Field options are dynamically loaded from `api.getTableSettings()` response keys.

---

### 3.9 Integration — Partner IDs

Loaded when relevant context is active.

**Partner ID Table:**
- Lists partner ID mappings for the competition.
- Columns: Data Source (resolved name), Partner ID, Actions (Edit, Delete).

**Partner ID Dialog (Add/Edit):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Data Source | `Select` | Yes | From Data Sources API. |
| Partner ID | `TextField` | No | Free text. |

**CRUD operations:** `api.putPartnerId()`, `api.deletePartnerId()`.

---

## 4. Cross-Cutting Behaviors

### 4.1 Term Edit Modal

A reusable modal (`TermEditModal`) for editing multilingual term entries. Used throughout both screens for:
- Competition Names, Season Names, Stage Names, Group Names, Phase Names, Participant Names, Cities, Finals, Rounds Names, Table Destinations, Points Deduction Reasons.

**Behavior:**
- Opens with a pre-loaded term (via `api.getTermById()`).
- `initialCategory` prop sets the context.
- On save: closes modal, triggers context-appropriate data refresh (e.g., reload structure, reload groups, reload terms).

### 4.2 Color Handling

Colors are stored as integers in the database and converted for display/editing:
- `numberToHex(num)`: converts integer to `#XXXXXX` uppercase hex string.
- `hexToNumber(hex)`: converts `#XXXXXX` hex string back to integer.

### 4.3 Change Detection

Both General Details and Extended Details sections implement deep change detection:
- **General Details:** compares `formData` against original `competition` for `GENERAL_DETAILS_KEYS`.
- **Extended Details:** compares formData, structureSeasonForm, structureStageForm, structurePhaseForm, structureGroupForm against their original values.
- Save buttons are disabled when no changes are detected.

### 4.4 Error Handling

- Loading states: `LoadingSpinner` component during initial loads.
- Error states: `Alert` component for critical errors (prevents rendering).
- Snackbar: non-blocking notifications for all CRUD operations (success, error, warning).
- `Promise.allSettled` used for dropdown data loads (graceful degradation — individual failures don't block the page).
- Try/catch blocks around all API calls with error messages surfaced to the user.

### 4.5 Navigation

- **List → Detail**: row click (when not in edit mode) → `/competitions/{id}`.
- **Detail → List**: "Back to List" button → `/competitions`.
- **Post-Create**: automatic navigation to the new competition's detail page.

### 4.6 Confirmation Dialogs

Browser `window.confirm()` used for destructive actions:
- Canceling edit mode with unsaved changes.
- Bulk delete / restore competitions.
- Delete season / stage / group / phase / game / participant.
- Remove from all seasons.

### 4.7 Responsive Design

- Grid layouts use MUI breakpoints (`xs`, `sm`, `md`, `lg`).
- Filter panel: 5-column on desktop, stacks on mobile.
- General Details: 3-zone horizontal layout on desktop, vertical stack on mobile.
- Competitor panels: side-by-side on desktop, stacked on mobile.

---

## 5. API Dependencies

The module depends on the following API endpoints (via the `api` service layer):

### 5.1 Competitions
- `getCompetitions({ showDeleted })` — List all competitions.
- `getCompetitionById(id)` — Single competition.
- `createCompetition(payload)` — Create.
- `updateCompetition(id, payload)` — Update (also used for soft-delete, restore, set current season/stage).

### 5.2 Reference Data
- `getCountries()`, `getSports()`, `getGenders()`, `getCompetitionTypes()`, `getStandingTypes()`, `getSubSportTypes()`, `getCompetitorTypes()`, `getPriorityLevels()`, `getStagesTypes()`, `getSurfaces()`, `getBuzzItemTypes()`, `getTableSettings()`.

### 5.3 Terms & Categories
- `getTerms()`, `getCategories()`, `getTermById(id)`, `createTerm(payload)`.

### 5.4 Structure Hierarchy
- Seasons: `getSeasons(compId)`, `createSeason(compId, payload)`, `updateSeason(compId, seasonNum, payload)`, `deleteSeason(compId, seasonNum)`.
- Stages: `getStages(compId, seasonNum)`, `createStage(compId, seasonNum, payload)`, `updateStage(compId, seasonNum, stageNum, payload)`, `deleteStage(compId, seasonNum, stageNum)`.
- Groups: `getGroups(compId, seasonNum, stageNum)`, `createGroup(...)`, `updateGroup(...)`, `deleteGroup(...)`.
- Phases: `getPhases(compId, seasonNum)`, `createPhase(...)`, `updatePhase(...)`, `deletePhase(...)`.

### 5.5 Competitors
- `getSeasonCompetitors(compId, seasonNum)`, `getCompetitorsNotInSeason(compId, seasonNum, filters)`, `addCompetitorsToSeason(...)`, `removeCompetitorFromSeason(...)`, `updateSeasonCompetitor(...)`, `removeCompetitorsFromAllSeasons(...)`.
- `getGroupCompetitors(...)`, `getCompetitorsNotInGroups(...)`, `addCompetitorsToGroup(...)`, `removeCompetitorFromGroup(...)`, `updateGroupCompetitorParticipant(...)`.

### 5.6 Games & Participants
- `getGroupGames(...)`, `createGroupGame(...)`, `updateGroupGame(...)`, `deleteGroupGame(...)`.
- `getGroupParticipants(...)`, `createGroupParticipant(...)`, `updateGroupParticipant(...)`, `deleteGroupParticipant(...)`.

### 5.7 Standings
- `getStageStandings(...)`, `updateStageStandings(...)`.
- `getStageDestinations(...)`, `updateStageDestinations(...)`.
- `getStagePointsDeductions(...)`, `updateStagePointsDeductions(...)`.

### 5.8 Integration
- `getPartnerIdCompetitions(compId?)`, `putPartnerId(compId, dsId, partnerId)`, `deletePartnerId(compId, dsId)`.
- `getDataSources()`.

---

## 6. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18+ (functional components, hooks) |
| UI Library | Material UI (MUI) v5 |
| Routing | React Router v6 (`useParams`, `useNavigate`) |
| Date Handling | Day.js + MUI X Date Pickers |
| State Management | Local component state (`useState`, `useEffect`, `useMemo`, `useRef`) |
| API Layer | Custom `api` service module |
| Drag & Drop | HTML5 Drag and Drop API (native) |

---

## 7. Key Data Entities

| Entity | Primary Key | Parent | Description |
|--------|-------------|--------|-------------|
| Competition | `COMPETITION_ID` | — | Root entity. |
| Season | `SEASON_NUM` | Competition | Time-bound subdivision. |
| Stage | `STAGE_NUM` | Season | Competition phase within a season. |
| Group | `GROUP_NUM` | Stage | Division within a stage. |
| Phase | `PHASE_NUM` | Season | Statistical phase (orthogonal to stages). |
| Competitor | `COMPETITOR_ID` | Season/Group | Team or individual. |
| Game | `GAME_NUM` | Group | Match within a group. |
| Participant | `PARTICIPANT_NUM` | Group | Named slot in a group (bracket participant). |
| Term | `id` | Category | Multilingual text entry. |
| Partner ID | `DATA_SOURCE_ID` | Competition | External system mapping. |
| Destination | `DESTINATION_NUM` | Stage | Promotion/relegation zone. |
| Points Deduction | (composite) | Stage | Manual point adjustments. |
