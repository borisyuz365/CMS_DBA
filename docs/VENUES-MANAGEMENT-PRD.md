# Venues Management — Product Requirements Document (PRD)

**Module:** Venues List & Venue Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Venues Management module is a two-screen CMS product that enables operators to browse, search, create, edit, and manage venue (stadium/arena) entities. It is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Venues List** (`/venues`) — A filterable, sortable, paginated data table with inline editing, bulk operations (delete/restore), CSV export, and venue creation.
- **Venue Details** (`/venues/:id`) — A detail view for a single venue entity, allowing direct field editing (country, city, capacity, surface, location, etc.), image management, and term editing for names and cities.

---

## 2. Venues List Screen

**Component:** `VenuesList` (`frontend/src/pages/VenuesList.jsx`)  
**Route:** `/venues`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Venues List") and a "Create Venue" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls, and selection counter. |

### 2.2 Data Loading Strategy

- **No default data load.** The table renders empty on mount with the message: *"No venues found. Use the filters above and click Search to find venues."*
- On mount, only dropdown/reference data is loaded in parallel via `Promise.allSettled`:
  - `api.getCountries()` — Country dropdown options.
  - `api.getLanguages()` — Language dropdown options (filtered to `isDisplayed === true`).
  - `api.getTerms()` — All terms; cities are extracted client-side by filtering terms where `category === 'Cities'`.
  - `api.getCategories()` — All categories (for Term Edit Modal support).
- Data is fetched only when the user explicitly clicks the **Search** button, which calls `api.getVenuesList(filters)`.

### 2.3 Filter Panel

Five filter controls plus action buttons arranged in a responsive grid:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Country** | `Autocomplete` (multi-select) | `md:2.4` | Filters by country name(s). Options sourced from `/countries`. Sends array of country names as `country` query param. Changing country clears the City filter. |
| **City** | `Autocomplete` (multi-select) | `md:2.4` | Filters by city term ID(s). Options are terms where `category === 'Cities'`. Disabled when no country is selected. City names resolved via `resolveTermName()`. Sends array of term IDs as `city` query param. |
| **Venue ID** | `TextField` (free text) | `md:2.4` | Filters by exact or partial venue ID. Sent as `venueId` query param. |
| **Language** | `Select` (single) | `md:2.4` | Options dynamically populated from `/languages` (only `isDisplayed` languages). Uses `iso2LettersCode` as value. Sent as `language` query param. |
| **Venue Name** | `TextField` (free text) | `md:2.4` | Filters by venue name substring. Sent as `venueName` query param. |

Action buttons:

- **Search** (`md:1.2`) — Triggers `api.getVenuesList(filters)`; resets pagination to page 0.
- **Clear Filters** (`md:1.2`) — Resets all filter values and all column-level filters to empty.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF (default), rows where `IS_DELETED === true` are hidden from the table. When ON, deleted rows are shown with reduced opacity (0.6) and gray background.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection checkbox. Header checkbox supports select-all / indeterminate. | Same. |
| 1 | `VENUE_ID` | ID | 70px | Blue link text (`#1976d2`, `fontWeight: 500`). Click opens the detail page in a new tab (`/venues/{id}`). | Same (not editable). |
| 2 | `name` | Name | auto | Avatar (from `IMAGE_URL`, or blue `LocationOnIcon` fallback) + clickable name. Click opens **Term Edit Modal** for `NAME_ID` under category "Venues". | Same (not inline-editable; name is edited via Term Modal). |
| 3 | `shortName` | S. Name | auto | If `shortNameClickable` is true and `shortValuesCount` exists, displays the count as a clickable blue number. Otherwise displays the short name text. Both are clickable and open the Term Edit Modal for the venue's `NAME_ID`. | Same (not inline-editable). |
| 4 | `countryName` | Country | auto | Plain text with country name, or `"-"` if null. Edit field: `COUNTRY_ID`. | Inline `Select` dropdown populated from `/countries`. Shows emoji + name. "None" option clears value. "Loading..." shown if countries not yet loaded. |
| 5 | `cityName` | City | auto | Plain text, or `"-"` if null. Edit field: `CITY_ID`. | Inline `Select` dropdown populated from city terms. Disabled when no country is set for the row. Shows "Select a country first" when disabled. "None" option clears value. City names resolved via `resolveTermName()`. |
| 6 | `CAPACITY` | Capacity | auto | Numeric value or `"-"`. Edit field: `CAPACITY`. | Inline `TextField` (`type="number"`, 100px width). |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter". Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- Stacked with the top-level filter panel results.
- For numeric fields (`VENUE_ID`, `CAPACITY`, `OPENED`, `LOCATION_LAT`, `LOCATION_LNG`): supports exact numeric match and substring match.

#### 2.4.3 Sorting

Each column header has up/down arrow icons. Sorting behavior:
- Click toggles between `asc` and `desc` on the same field.
- Only one sort field is active at a time.
- String fields use `localeCompare`; numeric fields use arithmetic comparison.
- Null values are pushed to the end.
- Active sort direction is indicated by blue (`#1976d2`) arrow icon; inactive arrows are gray (`#cccccc`).

#### 2.4.4 Grouping

Each column header has a `ViewListIcon` button for grouping:
- Clicking groups the table by that column's field.
- Clicking the same field again removes grouping.
- Groups are displayed as collapsible header rows showing `{Column Header}: {Value} ({count} venues)`.
- Groups are sorted: numerically if values are numbers, otherwise alphabetically.
- Null/undefined group values display as "Unknown".
- Expand/collapse is toggled via `ExpandMore` / `ChevronRight` icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/venues/{id}`).
- **Edit mode:** Row click is disabled (cursor changes to `default`).
- **Deleted rows** (when `showDeleted` is ON): Rendered with `opacity: 0.6`, gray background (`#f5f5f5`), and gray text (`#999999`).
- **Selected rows:** Highlighted with blue background (`#E3F2FD`); deleted selected rows use `#e0e0e0`.

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined (off) / Contained blue (on) | Always visible | Toggles inline editing. Cancelling with unsaved changes shows `window.confirm` prompt. |
| **Save Changes** | Contained green (`#4caf50`) | Only visible in edit mode | Sends `api.updateVenuesBulk(updates)`. Shows count of pending changes. Disabled when no changes exist. Numeric fields (`CAPACITY`, `OPENED`) are parsed to `parseInt`; geo fields (`LOCATION_LAT`, `LOCATION_LNG`) are parsed to `parseFloat`. On success: exits edit mode, clears changes, re-fetches data. |
| **Delete / Restore** | Contained red (delete) / Outlined green (restore) | Always visible; disabled if no selection | Dynamically switches between Delete and Restore based on whether selected rows include deleted items. Opens confirmation dialog. Calls `api.deleteVenues()` or `api.restoreVenues()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected rows (or all if none selected) to CSV. Generates `venues_YYYY-MM-DD.csv`. Only includes primitive (non-object) fields. Handles commas, quotes, and newlines in values. |

### 2.6 Pagination

- **Items per page options:** 10, 25 (default), 50, 100.
- **Display format:** `{start}-{end} of {total}`.
- **Navigation:** Previous / Next arrow buttons. Previous disabled on page 0; Next disabled on last page.
- Pagination resets to page 0 when filters change or new data is loaded.

### 2.7 Create Venue Dialog

Triggered by the "Create Venue" button in the header bar.

| Field | Type | Required | Grid | Notes |
|-------|------|----------|------|-------|
| **Name** | `TextField` | Yes | `xs:12` | Validated on submit. Creates a new Term under category "Venues" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Country** | `Select` | No | `md:6` | Dropdown from `/countries` with emoji + name. "None" option. |
| **City** | `Select` | No | `md:6` | Dropdown from city terms. Disabled when no country is selected. Cleared when country changes. Names resolved via `resolveTermName()`. |
| **Address** | `TextField` | No | `xs:12` | Free text. |
| **Capacity** | `TextField` (number) | No | `md:4` | Integer value. |
| **Surface** | `TextField` | No | `md:4` | Free text string. |
| **Opened (Year)** | `TextField` (number) | No | `md:4` | Integer (year). |
| **Primary** | `Checkbox` | No | `md:6` | Defaults to `false`. |
| **Website** | `TextField` | No | `xs:12` | Free text URL. |
| **Google Maps Place ID** | `TextField` | No | `xs:12` | Free text. |
| **Image URL** | `TextField` (url) | No | `xs:12` | Placeholder: `https://example.com/image.jpg`. |
| **Latitude** | `TextField` (number) | No | `md:6` | Float value. |
| **Longitude** | `TextField` (number) | No | `md:6` | Float value. |

**Creation flow:**
1. Validate form (name is required).
2. Create a new Term via `api.createTerm({ category: 'Venues', values: [...] })`.
3. Create the venue via `api.createVenue(payload)` using the returned `term.id` as `NAME_ID`.
4. Close dialog, re-fetch list, show success snackbar.
5. Navigate to the newly created venue's detail page (`/venues/{newId}`).

**Field dependency:** Changing `COUNTRY_ID` resets `CITY_ID` to empty.

### 2.8 Term Edit Modal

Opened when clicking a venue name or short name that has a `NAME_ID`. Uses the shared `TermEditModal` component with:
- `initialCategory`: `"Venues"`
- `onSave` / `onSaveAndUpdate`: Calls `api.updateTerm(id, data)`, then re-fetches the venue list.
- Supports creating new categories via `api.createCategory()`.

### 2.9 Snackbar Notifications

- Positioned: top-right.
- Auto-hide duration: 6000ms.
- Severity levels: `success`, `error`, `warning`.
- Triggered on: create success/failure, save success/failure, delete/restore success/failure, export, no-data warnings.

### 2.10 Term Name Resolution

The `resolveTermName()` helper resolves a term object to a display string using this priority:
1. `term.engValue` (precomputed English value).
2. `term.values` array: first English (`languageId: 1`), then default (`isDefault: true`), then approved (`status: 'Approved'`), then first available value.
3. Returns `null` if no value can be resolved.

---

## 3. Venue Details Screen

**Component:** `VenueDetails` (`frontend/src/pages/VenueDetails.jsx`)  
**Route:** `/venues/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + page title ("Venue – {name}"). The name is clickable if `NAME_ID` exists (opens Term Edit Modal). |
| **General Details Card** | A single `Paper` card containing: media section (left) and editable fields (center/right). Includes a "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` param changes), three parallel data loads are initiated:
1. `api.getVenueById(id)` — Loads the venue entity.
2. `api.getTerms()` + `api.getCategories()` — Loads data for Term Edit Modal.
3. `api.getCountries()` + `api.getTerms()` (for cities) + `api.getSurfaces()` — Loads dropdown options for countries, cities (terms where `category === 'Cities'`), and surfaces.

When the venue object is loaded, `formData` state is initialized from the venue's current values. Surface value resolution handles both numeric IDs and string names (matching against `SURFACE_NAME`).

### 3.3 Header Bar

- **Back to List** button: Outlined, blue border. Navigates to `/venues`.
- **Page Title**: `variant="h4"`, `fontWeight: 700`. Format: `Venue – {venue.name}`.
  - If `NAME_ID` exists, the name portion is clickable (blue, underlined) and opens the Term Edit Modal for the venue name.

### 3.4 General Details Card

The card uses a two-area responsive layout following UI-STANDARDS:

#### 3.4.1 Section Header

- Title: "General Details" (left-aligned, `variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (right-aligned, green `#15803d`).
- Background: `#f5f5f5` with bottom border.

#### 3.4.2 Left Column — Media (fixed 200px width on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Displays `IMAGE_URL` if available and not errored; otherwise shows gray `LocationOnIcon` fallback. Has error handler that hides broken images. |
| **Label** | "Venue Image" (centered, 0.7rem). |
| **Upload Image** button | Contained blue, full width. Opens Image Edit Dialog. |

#### 3.4.3 Center/Right Area — Editable Fields

The fields are organized in two rows:

**Row 1 — Short fields** (7-column grid on `lg`, 4 on `md`, 2 on `sm`, 1 on `xs`):

| Field | Type | Notes |
|-------|------|-------|
| **Country** | `Autocomplete` (single-select) | Options from `/countries` with emoji + name. Uses `COUNTRY_ID`. Changing country clears City. |
| **City** | `Select` (single) | Options from city terms. Disabled when no country is set. Includes a `"+ New City"` option that opens the Term Edit Modal with category "Cities" to create a new city inline. |
| **Opened (Year)** | `TextField` (number) | Integer value. Parsed with `parseInt`. |
| **Capacity** | `TextField` (number) | Integer value. Parsed with `parseInt`. |
| **Surface** | `Select` (single) | Options from `/data/surfaces` endpoint. Displays `SURFACE_NAME`, stores `SURFACE_ID`. "None" option clears value. |
| **Latitude** | `TextField` (number) | Float value. Parsed with `parseFloat`. |
| **Longitude** | `TextField` (number) | Float value. Parsed with `parseFloat`. |

**Row 2 — Long fields** (2-column grid on `sm+`, 1 on `xs`):

| Field | Type | Notes |
|-------|------|-------|
| **Address** | `TextField` | Free text. |
| **Website** | `TextField` | Free text URL. |

All fields use `size="small"` with `minHeight: 40px` and `fontSize: 0.8rem`.

#### 3.4.4 Save Logic

The "Save & Update In Service" button triggers `handleSave()` which:
1. Compares every field in `formData` against the original `venue` object.
2. Only includes fields that have actually changed in the update payload.
3. Sends changes via `api.updateVenuesBulk([{ venueId, changes }])`.
4. Re-fetches the venue data on success.
5. If no fields changed, silently returns without making an API call.

**Field-specific change detection and parsing:**

| Field | Comparison Logic | Stored Type |
|-------|------------------|-------------|
| `COUNTRY_ID` | Direct comparison; empty → `null`. | Integer or null |
| `CITY_ID` | Direct comparison; empty → `null`. | Integer or null |
| `ADDRESS` | Direct comparison; empty → `null`. | String or null |
| `CAPACITY` | Parsed to `parseInt`; empty → `null`. | Integer or null |
| `SURFACE` | Direct comparison; empty/null → `null`. | Integer (SURFACE_ID) or null |
| `OPENED` | Parsed to `parseInt`; empty → `null`. | Integer or null |
| `PRIMARY` | Direct comparison. | Boolean |
| `WEBSITE` | Direct comparison; empty → `null`. | String or null |
| `LOCATION_LAT` | Parsed to `parseFloat`; empty → `null`. | Float or null |
| `LOCATION_LNG` | Parsed to `parseFloat`; empty → `null`. | Float or null |
| `IMAGE_URL` | Direct comparison; empty → `null`. | String or null |

### 3.5 Image Edit Dialog

A `Dialog` (`maxWidth="sm"`, `fullWidth`) for managing the venue image:

| Element | Description |
|---------|-------------|
| **Title** | "Upload / Edit Venue Image" |
| **Image URL field** | `TextField` (`type="url"`). Placeholder: `https://example.com/image.jpg`. Helper text: "Enter the URL for the venue image". |
| **Preview** | Shown when URL is non-empty. A 200px-tall container with `objectFit: contain`. Broken images are hidden via `onError`. |
| **Cancel** | Closes dialog without saving. |
| **Save** | Calls `api.updateVenuesBulk()` with `{ IMAGE_URL: trimmedUrl || null }`. Reloads venue data on success. Also updates local `formData` and resets the image error state. |

### 3.6 Term Edit Modal

The `TermEditModal` component is used for two distinct purposes on this page:

1. **Editing the venue name** — Opened when clicking the venue name in the header. Uses `initialCategory: "Venues"`.
2. **Creating a new city** — Opened when selecting the "+ New City" option in the City dropdown. Uses `initialCategory: "Cities"`. On save, the newly created city term is automatically selected as the venue's `CITY_ID`.
3. **Editing an existing city term** — Opened when calling `handleTermClick(termId)`. Category is auto-detected from the term.

After any term save, both the venue data and the terms list are reloaded. If a new term was created for the "Cities" category, it is automatically assigned to the `CITY_ID` field.

### 3.7 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** | Centered `LoadingSpinner`. |
| **Error** | `Alert` (severity: error) with error message + "Back to List" button. |
| **Not Found** (venue is null after load) | `Alert` (severity: warning) with "Venue not found" + "Back to List" button. |

---

## 4. API Endpoints

All API calls are made through the `api` service layer (`frontend/src/services/api.js`).

### 4.1 Venue Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/venues?country=...&city=...&venueId=...&venueName=...&language=...` | Search venues with optional filters. `country` and `city` params support multiple values (repeated query param). Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/venues/:id` | Get a single venue by ID. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/venues` | Create a new venue. Body: `{ NAME_ID, COUNTRY_ID, CITY_ID, ADDRESS, CAPACITY, SURFACE, OPENED, PRIMARY, WEBSITE, GMAPS_PLACE_ID, LOCATION_LAT, LOCATION_LNG }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/venues/bulk` | Bulk update venues. Body: `{ updates: [{ venueId, changes: {...} }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Mode Save), Details (Save), Details (Image Save), List (Delete), List (Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/countries` | Returns list of countries with `COUNTRY_ID`, `name`, `EMOJI`. | List (Filter + Edit), Details (Country dropdown) |
| `GET` | `/languages` | Returns list of languages. Filtered client-side to `isDisplayed === true`. | List (Filter) |
| `GET` | `/data/surfaces` | Returns list of surfaces with `SURFACE_ID` and `SURFACE_NAME`. | Details (Surface dropdown) |
| `GET` | `/terms` | Returns all terms. Cities are extracted client-side (`category === 'Cities'`). | List + Details (City dropdown, Term Modal) |
| `GET` | `/terms/:id` | Returns a single term by ID. | List + Details (Name/City click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term Modal save) |
| `POST` | `/terms` | Create a new term. Used during venue creation and new city creation. | List (Create Dialog), Details (New City) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 Venue Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `VENUE_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term entity (category: "Venues"). |
| `name` | String | Yes | Resolved display name (from Term). Read-only in the entity; edited via Term Modal. |
| `shortName` | String | Yes | Resolved short display name (from Term). Read-only. |
| `shortNameClickable` | Boolean | Yes | If true, short name column shows a clickable count instead of text. |
| `shortValuesCount` | Integer | Yes | Number of short name term values (shown when `shortNameClickable` is true). |
| `COUNTRY_ID` | Integer | Yes | Foreign key to Country entity. |
| `countryName` | String | Yes | Resolved country display name. Read-only. |
| `CITY_ID` | Integer | Yes | Foreign key to Term entity (category: "Cities"). |
| `cityName` | String | Yes | Resolved city display name. Read-only. |
| `ADDRESS` | String | Yes | Physical address of the venue. |
| `CAPACITY` | Integer | Yes | Seating capacity. |
| `SURFACE` | Integer/String | Yes | Surface type. Stored as `SURFACE_ID` (integer); may also appear as `SURFACE_NAME` (string) from backend. |
| `OPENED` | Integer | Yes | Year the venue was opened. |
| `PRIMARY` | Boolean | No | Whether this is a primary venue. Defaults to `false`. |
| `WEBSITE` | String | Yes | URL of the venue's website. |
| `GMAPS_PLACE_ID` | String | Yes | Google Maps Place ID for the venue. |
| `LOCATION_LAT` | Float | Yes | Latitude coordinate. |
| `LOCATION_LNG` | Float | Yes | Longitude coordinate. |
| `IMAGE_URL` | String | Yes | URL of the venue image. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. `true` = deleted. |

### 5.2 Surface Entity

| Field | Type | Description |
|-------|------|-------------|
| `SURFACE_ID` | Integer | Primary key. |
| `SURFACE_NAME` | String | Display name of the surface type (e.g., "Grass", "Artificial Turf"). |

---

## 6. User Flows

### 6.1 Search & Browse Venues

1. User navigates to `/venues`.
2. Page loads dropdown data (countries, languages, terms/cities, categories).
3. User optionally sets filter values (country, city, venue ID, language, venue name).
4. User clicks **Search**.
5. API returns matching venues; table is populated.
6. User can further refine with column-level filters, sort, or group.

### 6.2 Create a New Venue

1. User clicks **Create Venue** button.
2. Dialog opens with empty form (13 fields).
3. User fills in at least the **Name** field (required).
4. User clicks **Create**.
5. System creates a Term under category "Venues", then creates the venue referencing that Term.
6. Dialog closes; list re-fetches; user is navigated to the new venue's detail page.

### 6.3 Inline Bulk Edit (List)

1. User clicks **Edit Mode** in the footer.
2. Editable columns (Country, City, Capacity) switch to inline input controls.
3. User modifies values across one or more rows.
4. User clicks **Save Changes ({count})**.
5. System sends all changes in a single bulk API call (with type parsing for numeric/float fields).
6. On success: exits edit mode, clears pending changes, re-fetches data.
7. To cancel: click **Cancel Edit**; if changes exist, a confirmation prompt appears.

### 6.4 Delete / Restore Venues

1. User selects one or more rows via checkboxes.
2. Button dynamically shows "Delete Venues" or "Restore Venues" based on selection.
3. User clicks the button.
4. Confirmation dialog appears.
5. On confirm: system calls bulk update with `IS_DELETED: true` (delete) or `IS_DELETED: false` (restore).
6. Selection is cleared; data is re-fetched.

### 6.5 Edit Venue Details

1. User navigates to `/venues/:id` (via list row click or direct URL).
2. Detail page loads the venue entity, countries, cities, and surfaces.
3. User modifies fields directly in the form (7 short fields + 2 long fields).
4. User clicks **Save & Update In Service**.
5. System computes diff of changed fields, sends only changes via bulk API.
6. Venue data is reloaded to reflect saved state.

### 6.6 Update Venue Image

1. On the detail page, user clicks **Upload Image**.
2. Dialog opens with current URL (if any) pre-filled.
3. User enters/modifies the image URL.
4. A live preview is shown.
5. User clicks **Save**.
6. System updates the `IMAGE_URL` field via bulk API.

### 6.7 Edit Venue Name (Term)

1. On either page, user clicks the venue name link.
2. System fetches the full Term by `NAME_ID`.
3. Term Edit Modal opens with category "Venues".
4. User edits translations/values.
5. On save: Term is updated via API; parent page data is refreshed.

### 6.8 Create a New City (Details Page)

1. On the detail page, user opens the City dropdown.
2. User selects the "+ New City" option at the bottom of the list.
3. Term Edit Modal opens with category "Cities" and no existing term (creation mode).
4. User fills in city name translations.
5. On save: new city term is created; the city is automatically selected in the form; venue and terms are reloaded.

### 6.9 Export to CSV

1. User optionally selects specific rows via checkboxes.
2. User clicks **Export to CSV ({count})**.
3. If rows are selected, only those are exported; otherwise all filtered rows are exported.
4. A CSV file named `venues_YYYY-MM-DD.csv` is downloaded.
5. Success snackbar shows the count of exported venues.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing dialog. Used for venue name editing, short name viewing, and city creation/editing. |
| `DataTable` | `reuse/DataTable` | Imported but not used in the current implementation (table is built inline). |
| `api` | `services/api` | Centralized API client with fetch wrapper. |

---

## 8. UI / UX Specifications

### 8.1 Design System

- **Font family:** `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
- **Primary color:** `#1976d2` (Material Blue)
- **Success color:** `#4caf50` / `#15803d` (green)
- **Danger color:** `#d32f2f` (red)
- **Background:** `#f5f5f5` (page), `#ffffff` (cards/table)
- **Border color:** `#EAECF0` (table cells), `#E0E0E0` (inputs)
- **Font sizes:** `0.875rem` (body/table), `0.8rem` (detail form), `0.75rem` (labels), `0.7rem` (media labels)

### 8.2 Responsive Breakpoints

- **List filter panel:** 5-column grid on `md`, 2 columns on `sm`, 1 column on `xs`.
- **Detail page Row 1 fields:** 7 columns on `lg`, 4 on `md`, 2 on `sm`, 1 on `xs`.
- **Detail page Row 2 fields:** 2 columns on `sm+`, 1 on `xs`.
- **Media section:** Fixed 200px on `md+`, full width on `xs`.

### 8.3 Accessibility

- Table uses sticky header for scroll context.
- All interactive elements have appropriate cursor styles.
- Confirmation dialogs use `aria-labelledby` and `aria-describedby`.
- Form errors are displayed via `helperText` on the relevant input.
- Disabled states on City filter/dropdown when no country is selected.

---

## 9. Known Limitations & TODOs

| Item | Description | Location |
|------|-------------|----------|
| **City filtering by country** | The city dropdown in both the list filter and edit mode currently shows all cities regardless of the selected country. A comment notes this should be filtered by country in a real implementation. | `VenuesList.jsx` lines 591–597, 696–702 |
| **Create Short Name** | A "Create Short Name" function is stubbed out with a `TODO` comment. Currently only shows a `window.confirm` dialog and logs to console. | `VenuesList.jsx` lines 810–824 |
| **DataTable import unused** | `DataTable` from `reuse/DataTable` is imported but not used in `VenuesList`. The table is implemented inline. | `VenuesList.jsx` line 49 |
