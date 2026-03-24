# Countries Management — Product Requirements Document (PRD)

**Module:** Countries List & Country Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Countries Management module is a two-screen CMS product that enables operators to browse, search, create, edit, and manage country entities. Countries are a core reference entity used throughout the system (competitions, athletes, venues, TV networks, etc.). The module is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Countries List** (`/countries`) — A filterable, sortable, paginated data table with inline editing (main color), bulk operations (delete/restore), CSV export, and country creation.
- **Country Details** (`/countries/:id`) — A comprehensive detail view for a single country entity with a three-column layout (media, fields, booleans), allowing direct editing of all country properties, image management, and term editing.

---

## 2. Countries List Screen

**Component:** `CountriesList` (`frontend/src/pages/CountriesList.jsx`)  
**Route:** `/countries`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Countries List") and a "Create Country" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls, and selection counter. |

### 2.2 Data Loading Strategy

- **Auto-loads on mount.** Unlike other list pages, this page loads all countries immediately on mount via `api.getCountries()`.
- On mount, three parallel data loads are initiated:
  - `api.getCountries()` — Loads all country data (sets table rows directly).
  - `api.getTerms()` + `api.getCategories()` via `Promise.all` — For Term Edit Modal support.
  - `api.getTimeZonesList()` — Time zone reference data for display.
- Filtering is performed **entirely client-side** on the loaded dataset. The Search button simply resets pagination to page 0 (no additional API call).

### 2.3 Filter Panel

Two filter controls plus action buttons:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Country ID** | `TextField` (free text) | `md:2.4` | Exact numeric ID match. Parsed to `parseInt`; non-numeric input shows no results. Applied client-side. |
| **Name** | `TextField` (free text) | `md:2.4` | Case-insensitive substring match on the `name` field. Applied client-side. |

Action buttons:

- **Search** (`md:1.2`) — Resets pagination to page 0 (does NOT trigger a new API call; filters are applied reactively).
- **Clear Filters** (`md:1.2`) — Resets all filter values, column filters, and pagination to page 0.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF (default), rows where `IS_DELETED === true` are hidden. When ON, deleted rows are shown with reduced opacity (0.6) and gray styling.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection checkbox. Header checkbox supports select-all / indeterminate. | Same. |
| 1 | `COUNTRY_ID` | ID | 52px | Blue text (`#1976d2`, `fontWeight: 500`). Click navigates to the detail page (`/countries/{id}`). | Same (not editable). |
| 2 | `name` | Name | 160px | Avatar (from `COUNTRY_IMAGE_URL`, or blue `PublicIcon` fallback) + clickable name. If `NAME_ID` exists, click opens **Term Edit Modal** under category "Countries names". | Same (not inline-editable; name edited via Term Modal). |
| 3 | `COUNTRY_CODE` | Code | 48px | Plain text, or `"-"`. | Same (not editable inline). |
| 4 | `TIME_ZONE_ID` | Time Zone | 195px | Resolved to display format via `formatTimeZoneDisplay()`: `"{name} (UTC {offset})"`. Falls back to raw `TIME_ZONE_ID` if no matching timezone found. | Same (not editable inline). |
| 5 | `ALLOW_BETTING` | Betting | 52px | "Yes" / "No". | Same (not editable inline). |
| 6 | `FATHER_COUNTRY_ID` | Father Country | 120px | Resolved to parent country name via countries lookup. Falls back to raw ID string if not found. `"-"` if null. | Same (not editable inline). |
| 7 | `IS_NOT_REAL` | Not Real | 52px | "Yes" / "No". | Same (not editable inline). |
| 8 | `MAIN_COLOR` | Main Color | 90px | Colored swatch (72×24px box) using `numberToHex()` conversion. `"-"` if null. | Inline `<input type="color">` (120px, 32px height). Color stored as integer; converted via `hexToNumber()` on change. |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter" (height: 28px). Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- For numeric fields: supports both exact numeric match and substring match.
- Stacked with the top-level filter panel.

#### 2.4.3 Sorting

Each column header has up/down arrow icons. Sorting behavior:
- Click toggles between `asc` and `desc` on the same field.
- Only one sort field is active at a time.
- String fields use `localeCompare`; numeric fields use arithmetic comparison.
- Null values are pushed to the end.
- Active direction: blue (`#1976d2`); inactive: gray (`#ccc`).

#### 2.4.4 Grouping

Each column header has a `ViewListIcon` button for grouping:
- Clicking groups the table by that column's field.
- Clicking the same field again removes grouping.
- Groups are collapsible header rows showing `{field}: {value} ({count})`.
- Groups sorted numerically if values are numbers, otherwise alphabetically.
- Null group values display as "Unknown".
- Expand/collapse via `ExpandMore` / `ChevronRight` icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row navigates to the detail page (`/countries/{id}`) in the same tab (not new tab).
- **Edit mode:** Row click is disabled (cursor changes to `default`).
- **Deleted rows** (when `showDeleted` is ON): Rendered with `opacity: 0.6`, gray background, and gray text.
- **Selected rows:** Blue background (`#E3F2FD`); deleted selected rows use `#e0e0e0`.

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined (off) / Contained blue (on) | Always visible | Toggles inline editing. Cancelling with unsaved changes shows `window.confirm("Discard unsaved changes?")`. |
| **Save** | Contained green (`#4caf50`) | Only visible in edit mode | Sends `api.updateCountriesBulk(updates)`. Shows count of pending changes. Disabled when no changes. Color fields are stored as integers via `hexToNumber()`. On success: exits edit mode, clears changes, re-fetches all countries. |
| **Delete / Restore** | Contained red (delete) / Outlined green (restore) | Always visible; disabled if no selection | Dynamically switches based on whether selected rows include deleted items. Opens confirmation dialog. Calls `api.deleteCountries()` or `api.restoreCountries()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected rows (or all if none selected) to CSV. Generates `countries_YYYY-MM-DD.csv`. Only includes primitive fields. |

### 2.6 Pagination

- **Items per page options:** 10, 25 (default), 50, 100.
- **Display format:** `{start}-{end} of {total}`.
- **Navigation:** Previous / Next arrow buttons.
- Pagination resets to page 0 when filters change.

### 2.7 Create Country Dialog

Triggered by the "Create Country" button. Dialog: `maxWidth="sm"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Name** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under category "Countries names" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Country Code** | `TextField` | Yes | `sm:6` | `''` | Auto-uppercased and truncated to 4 chars. Placeholder: "e.g. US". |
| **Time Zone** | `Select` | No | `sm:6` | `1` | Options from `/time-zones`. Displayed via `formatTimeZoneDisplay()`. |
| **Parent Country** | `Select` | No | `sm:6` | `''` (None) | Dropdown of all loaded countries with emoji + name. |
| **Emoji** | `TextField` | No | `sm:6` | `''` | Placeholder: "🇺🇸". |
| **Phone Code** | `TextField` | No | `sm:6` | `''` | Free text. |
| **Currency Symbol** | `TextField` | No | `sm:6` | `''` | Free text. |
| **Allow Betting** | `Checkbox` | No | `sm:6` | `true` | — |
| **Block Live Betting** | `Checkbox` | No | `sm:6` | `false` | — |
| **Min Users (Popular Bet)** | `TextField` (number) | No | `sm:6` | `100` | — |
| **Min Users (Popular Options)** | `TextField` (number) | No | `sm:6` | `50` | — |

**Hidden defaults** (not shown in dialog but included in payload):

| Field | Default |
|-------|---------|
| `IS_NOT_REAL` | `false` |
| `CONNECT_BY_TEXT` | `false` |
| `ALLOW_PREMIUM_INSIGHTS` | `true` |
| `ALLOW_BETS_IN_ALL_SCORES` | `true` |
| `LOGIN_AVAILABLE` | `true` |
| `MAIN_COLOR` | `0` (black) |
| `SECONDARY_COLOR` | `0` (black) |
| `ODDS_TYPE` | `2` |
| `CONTINENT_ID` | `null` |

**Creation flow:**
1. Validate form (name and country code required).
2. Create a Term via `api.createTerm({ category: 'Countries names', values: [...] })`.
3. Create the country via `api.createCountry(payload)` with `NAME_ID` from the term.
4. Close dialog, reload countries, show success snackbar.
5. Navigate to the new country's detail page (`/countries/{newId}`).

### 2.8 Color Conversion Helpers

Two utility functions used across both screens:

- `numberToHex(num)` — Converts integer to hex color string: `#${num.toString(16).padStart(6, '0').toUpperCase()}`.
- `hexToNumber(hex)` — Converts hex string to integer: `parseInt(hex.replace('#', ''), 16)`.

### 2.9 Time Zone Display Format

Time zones are displayed using the shared `formatTimeZoneDisplay()` utility:
- Template: `"{TIME_ZONE_NAME} (UTC {±offset})"`.
- Example: `"Israel Standard Time (UTC +2)"`, `"Eastern (UTC -5)"`.
- Falls back to `"(UTC {±offset})"` if name is missing.

### 2.10 Term Edit Modal

Opened when clicking a country name that has a `NAME_ID`. Uses the shared `TermEditModal` component with:
- `initialCategory`: `"Countries names"`
- `onSave` / `onSaveAndUpdate`: Calls `api.updateTerm(id, data)`, then re-fetches countries.

### 2.11 Snackbar Notifications

- Positioned: top-right. Auto-hide: 6000ms.
- Triggered on: create success/failure, save success/failure, delete/restore, export, no-data warnings.

---

## 3. Country Details Screen

**Component:** `CountryDetails` (`frontend/src/pages/CountryDetails.jsx`)  
**Route:** `/countries/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + page title ("Country – {emoji} {name}"). The name is clickable if `NAME_ID` exists (opens Term Edit Modal). |
| **General Details Card** | A single `Paper` card with three-column layout: media (left), fields (center), booleans (right). Includes "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` param changes), five parallel data loads are initiated:
1. `api.getCountryById(id)` — Loads the country entity.
2. `api.getCountries()` — Loads all countries for the Parent Country dropdown.
3. `api.getTerms()` + `api.getCategories()` — For Term Edit Modal.
4. `api.getTimeZonesList()` — Time zone dropdown options.
5. `api.getCurrencies()` — Currency dropdown options.

When the country object is loaded, `formData` is initialized with all country fields. Color fields are converted from integer to hex string format using `numberToHex()`.

### 3.3 Header Bar

- **Back to List** button: Outlined, blue border. Navigates to `/countries`.
- **Page Title**: `variant="h4"`, `fontWeight: 700`. Format: `Country – {emoji} {name}`.
  - Emoji is displayed as a `<span>` prefix if present.
  - If `NAME_ID` exists, the name portion is clickable (blue, underlined) and opens the Term Edit Modal.

### 3.4 General Details Card

Three-column responsive layout:

#### 3.4.1 Section Header

- Title: "General Details" (`variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (right-aligned, green `#15803d`).
- Background: `#f5f5f5` with bottom border.

#### 3.4.2 Left Column — Media (fixed 200px width on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Displays `COUNTRY_IMAGE_URL` if available and not errored; otherwise shows emoji character (first char of emoji, or `🏳️` fallback) in gray background. |
| **Label** | "Country Image" (centered, 0.7rem). |
| **Upload Image** button | Contained blue, full width. Opens Image Edit Dialog. |
| **Image Version** button | Contained blue, full width. Displays current `IMG_VER` value. (Display only — no action currently.) |

#### 3.4.3 Center Column — Fields (max-width 480px on md+, 3-column grid)

Fields are defined by `GENERAL_DETAILS_FIELD_KEYS` array and rendered dynamically via `renderField()`:

| Field | Type | Grid Span | Notes |
|-------|------|-----------|-------|
| **Country Code** | `TextField` | 1 col | Text input. |
| **Parent Country** | `Select` | 1 col | Dropdown of all countries (excluding self). Shows emoji + name. "None" option clears. |
| **Phone Code** | `TextField` | 1 col | Text/number input (auto-detects type from value). |
| **Currency** | `Select` | 1 col | Dropdown from `/data/currencies`. Shows `{SYMBOL} – {name}` or `{CURRENCY_CODE}`. |
| **Main Color** | `<input type="color">` | 1 col | Color picker. Stored as hex in form, converted to integer for API. Default: `#000000`. |
| **Secondary Color** | `<input type="color">` | 1 col | Color picker. Default: `#ffffff`. |
| **Time Zone** | `Select` | **Full width** (spans all 3 cols) | Dropdown from `/time-zones`. Displayed via `formatTimeZoneDisplay()`. |

The `renderField()` function dynamically selects the input type based on the field key:
- `BOOLEAN_KEYS` → `Checkbox` with `FormControlLabel`
- `COLOR_KEYS` → `<input type="color">` with label
- `FATHER_COUNTRY_ID` → Country `Select` dropdown
- `TIME_ZONE_ID` → Time zone `Select` dropdown
- `CURRENCY_SYMBOL` → Currency `Select` dropdown
- Others → `TextField` (auto-detects `type="number"` vs `type="text"`)

#### 3.4.4 Right Column — Booleans (4-column grid on md+)

Boolean toggles defined by `GENERAL_DETAILS_TOGGLE_KEYS`:

| Field | Label | Default |
|-------|-------|---------|
| `ALLOW_BETTING` | Allow Betting | `true` |
| `IS_NOT_REAL` | Virtual / Not Real Country | `false` |
| `ALLOW_PREMIUM_INSIGHTS` | Allow Premium Insights | `true` |
| `ALLOW_BETS_IN_ALL_SCORES` | Allow Bets in All Scores | `true` |
| `LOGIN_AVAILABLE` | Login Available | `true` |
| `BLOCK_LIVE_BETTING` | Block Live Betting | `false` |
| `ALLOW_PREMIUM_USERS` | Allow Premium Users | `null` |

Each is rendered as a `Checkbox` with `FormControlLabel`.

#### 3.4.5 Save Logic

The "Save & Update In Service" button triggers `handleSave()` which:
1. Compares every field in `formData` against the original `country` object.
2. Uses helper functions for type coercion:
   - `stringOrNull(v)` — Returns `null` for empty/null/undefined, otherwise the value.
   - `numOrNull(v)` — Returns `null` for empty/null/undefined/NaN, otherwise `Number(v)`.
   - `bool(v)` — Returns `true` for `true`, `'true'`, or `1`.
3. Color fields are converted from hex string back to integer via `hexToNumber()`.
4. Only includes fields that have actually changed.
5. Sends changes via `api.updateCountriesBulk([{ countryId, changes }])`.
6. Re-fetches the country data on success.
7. If no fields changed, silently returns.

**Full list of compared fields:**

| Field | Type Coercion |
|-------|--------------|
| `name` | `stringOrNull` |
| `COUNTRY_CODE` | `stringOrNull` |
| `TIME_ZONE_ID` | `numOrNull` |
| `FATHER_COUNTRY_ID` | `numOrNull` |
| `IS_NOT_REAL` | `bool` |
| `ALLOW_BETTING` | `bool` |
| `EMOJI` | `stringOrNull` |
| `CONNECT_BY_TEXT` | `bool` |
| `ALLOW_PREMIUM_INSIGHTS` | `bool` |
| `PHONE_CODE` | `stringOrNull` |
| `ALLOW_BETS_IN_ALL_SCORES` | `bool` |
| `LOGIN_AVAILABLE` | `bool` |
| `MAIN_COLOR` | `hexToNumber` (integer comparison) |
| `SECONDARY_COLOR` | `hexToNumber` (integer comparison) |
| `IMG_VER` | `numOrNull` |
| `ODDS_TYPE` | `numOrNull` |
| `CONTINENT_ID` | `numOrNull` |
| `BLOCK_LIVE_BETTING` | `bool` |
| `CURRENCY_SYMBOL` | `stringOrNull` |
| `MIN_USERS_FOR_MOST_POPULAR_BET` | `numOrNull` |
| `MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS` | `numOrNull` |
| `LINEUPS_BET_VALUE` | `numOrNull` |
| `BET_VALUE` | `numOrNull` |
| `COUNTRY_IMAGE_URL` | `stringOrNull` |

### 3.5 Image Edit Dialog

A `Dialog` (`maxWidth="sm"`, `fullWidth`) for managing the country image:

| Element | Description |
|---------|-------------|
| **Title** | "Upload / Edit Image" |
| **Image URL field** | `TextField` (`type="url"`). Placeholder: `https://example.com/image.jpg`. Helper text: "Enter the URL of the country flag/image". |
| **Preview** | Shown when URL is non-empty. 200px-tall container with `objectFit: contain`. Broken images hidden via `onError`. |
| **Cancel** | Closes dialog without saving. |
| **Save** | Calls `api.updateCountriesBulk()` with `{ COUNTRY_IMAGE_URL: trimmedUrl || null }`. Reloads country data on success. |

### 3.6 Term Edit Modal

Uses the shared `TermEditModal` component with:
- `initialCategory`: `"Countries names"`
- `onSave` / `onSaveAndUpdate`: Calls `api.updateTerm(id, data)`, then re-fetches the country.

### 3.7 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no country loaded yet) | Centered `LoadingSpinner`. |
| **Error** (no country) | `Alert` (severity: error) with error message + "Back to List" button. |
| **Not Found** (country is null after load) | `Alert` (severity: warning) with "Country not found" + "Back to List" button. |

---

## 4. API Endpoints

All API calls are made through the `api` service layer (`frontend/src/services/api.js`).

### 4.1 Country Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/data/countries` | Get all countries (basic reference data). Returns `{ data: [...] }`. | List (Load on mount), Details (Parent dropdown) |
| `GET` | `/countries/:id` | Get a single country by ID (full entity). Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/countries` | Create a new country. Body includes `NAME_ID`, `COUNTRY_CODE`, `TIME_ZONE_ID`, and all other country fields. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/countries/bulk` | Bulk update countries. Body: `{ updates: [{ countryId, changes: {...} }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Mode Save), Details (Save), Details (Image Save), List (Delete), List (Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/time-zones` | Returns list of time zones with `TIME_ZONE_ID`, `TIME_ZONE_NAME`, `UTC_OFFSET`. | List (Display), Details (Dropdown), List (Create Dialog) |
| `GET` | `/data/currencies` | Returns list of currencies with `CURRENCY_ID`, `SYMBOL`, `name`, `CURRENCY_CODE`. | Details (Currency dropdown) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term by ID. | List + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term Modal save) |
| `POST` | `/terms` | Create a new term. Used during country creation. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 Country Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `COUNTRY_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term entity (category: "Countries names"). |
| `name` | String | Yes | Resolved display name (from Term). |
| `COUNTRY_CODE` | String | No | ISO-style country code (up to 4 chars, auto-uppercased). |
| `TIME_ZONE_ID` | Integer | No | Foreign key to Time Zone entity. Default: `1`. |
| `FATHER_COUNTRY_ID` | Integer | Yes | Foreign key to parent Country entity (self-referential). |
| `IS_NOT_REAL` | Boolean | No | Whether this is a virtual/synthetic country. Default: `false`. |
| `ALLOW_BETTING` | Boolean | No | Whether betting is allowed in this country. Default: `true`. |
| `EMOJI` | String | Yes | Country flag emoji (e.g., "🇺🇸"). |
| `CONNECT_BY_TEXT` | Boolean | No | Default: `false`. |
| `ALLOW_PREMIUM_INSIGHTS` | Boolean | No | Default: `true`. |
| `TRANSFER_SEASON_ACTIVE` | Any | Yes | Transfer season flag. |
| `PHONE_CODE` | String | Yes | International phone dialing code. |
| `ALLOW_BETS_IN_ALL_SCORES` | Boolean | No | Default: `true`. |
| `LOGIN_AVAILABLE` | Boolean | No | Whether login is available for this country. Default: `true`. |
| `MAIN_COLOR` | Integer | No | Primary brand color. Stored as integer (e.g., `16711680` for `#FF0000`). Default: `0`. |
| `SECONDARY_COLOR` | Integer | No | Secondary brand color. Same format. Default: `0`. |
| `IMG_VER` | Integer | Yes | Image version counter. Default: `1`. |
| `PLATFORM` | Any | Yes | Platform identifier. |
| `FORCE_RAFFLE_TOP_BOOKMAKER` | Any | Yes | Bookmaker forcing flag. |
| `ALLOW_SUB_TERRITORY_DETECTION` | Any | Yes | Sub-territory detection flag. |
| `ODDS_TYPE` | Integer | No | Odds display format. Default: `2`. |
| `TYPE` | Any | Yes | Country type. |
| `CONTINENT_ID` | Integer | Yes | Foreign key to continent. |
| `BLOCK_LIVE_BETTING` | Boolean | No | Whether live betting is blocked. Default: `false`. |
| `CURRENCY_SYMBOL` | String | Yes | Currency symbol (e.g., "$", "€"). |
| `ALLOW_PREMIUM_USERS` | Boolean | Yes | Allow premium users flag. |
| `MIN_USERS_FOR_MOST_POPULAR_BET` | Integer | No | Minimum users threshold for most popular bet. Default: `100`. |
| `MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS` | Integer | No | Minimum users threshold for popular options. Default: `50`. |
| `LINEUPS_BET_VALUE` | Number | Yes | Lineups bet value. |
| `BET_VALUE` | Number | Yes | Bet value. |
| `COUNTRY_IMAGE_URL` | String | Yes | URL of the country flag/image. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. `true` = deleted. |

### 5.2 Time Zone Entity

| Field | Type | Description |
|-------|------|-------------|
| `TIME_ZONE_ID` | Integer | Primary key. |
| `TIME_ZONE_NAME` | String | Display name (e.g., "Israel Standard Time"). |
| `UTC_OFFSET` | Number | UTC offset in hours (e.g., `2`, `-5`). |

### 5.3 Currency Entity

| Field | Type | Description |
|-------|------|-------------|
| `CURRENCY_ID` | Integer | Primary key. |
| `SYMBOL` | String | Currency symbol (e.g., "$", "€"). |
| `name` | String | Currency name. |
| `CURRENCY_CODE` | String | ISO currency code (e.g., "USD", "EUR"). |

---

## 6. User Flows

### 6.1 Browse Countries

1. User navigates to `/countries`.
2. All countries are loaded automatically on mount.
3. Table displays all countries (excluding deleted by default).
4. User can type in Country ID or Name filter for instant client-side filtering.
5. User can further refine with column-level filters, sort, or group.

### 6.2 Create a New Country

1. User clicks **Create Country** button.
2. Dialog opens with default values (10 visible fields + hidden defaults).
3. User fills in at least **Name** and **Country Code** (required).
4. User clicks **Create**.
5. System creates a Term under "Countries names", then creates the country with the term's ID.
6. Dialog closes; countries reload; user navigates to the new country's detail page.

### 6.3 Inline Edit (Main Color)

1. User clicks **Edit Mode** in the footer.
2. The Main Color column switches to a color picker input.
3. User changes colors across one or more rows.
4. User clicks **Save ({count})**.
5. System sends all changes via bulk update; color values are converted from hex to integer.
6. On success: exits edit mode, clears changes, re-fetches countries.

### 6.4 Delete / Restore Countries

1. User selects one or more rows via checkboxes.
2. Button dynamically shows "Delete Countries" or "Restore Countries" based on selection.
3. User clicks the button → confirmation dialog.
4. On confirm: system calls bulk update with `IS_DELETED: true` (delete) or `IS_DELETED: false` (restore).
5. Selection cleared; countries re-fetched.

### 6.5 Edit Country Details

1. User navigates to `/countries/:id`.
2. Detail page loads country entity plus reference data (countries, timezones, currencies, terms).
3. User modifies fields in the three-column form.
4. User clicks **Save & Update In Service**.
5. System computes diff with type coercion (string, number, boolean, hex→int), sends only changed fields.
6. Country reloaded on success.

### 6.6 Update Country Image

1. On the detail page, user clicks **Upload Image**.
2. Dialog opens with current URL pre-filled.
3. User enters/modifies the image URL; live preview is shown.
4. User clicks **Save**.
5. System updates `COUNTRY_IMAGE_URL` via bulk API.

### 6.7 Edit Country Name (Term)

1. On either page, user clicks the country name.
2. System fetches the Term by `NAME_ID`.
3. Term Edit Modal opens with category "Countries names".
4. User edits translations.
5. On save: Term updated; country data refreshed.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing for country names. |
| `formatTimeZoneDisplay` | `utils/formatTimeZone` | Formats time zone for display: `"{name} (UTC {±offset})"`. |
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

- **List filter panel:** `md:2.4` for filters, `md:1.2` for buttons.
- **Detail page center fields:** 3-column grid on `md`, 1 column on `xs`. Time Zone spans full width.
- **Detail page booleans:** 4-column grid on `md`, 1 column on `xs`.
- **Media section:** Fixed 200px on `md+`, full width on `xs`.

### 8.3 Key Behavioral Differences from Other Entity List Pages

| Aspect | Countries List | Other Lists (e.g., TV Networks, Venues) |
|--------|---------------|------------------------------------------|
| **Initial data load** | Auto-loads all countries on mount | No auto-load; requires explicit Search click |
| **Search button behavior** | Only resets pagination (client-side filtering) | Triggers API call with filters |
| **Row click navigation** | Same tab (`navigate()`) | New tab (`window.open()`) |
| **Inline editable columns** | Only Main Color | Multiple fields (country, capacity, etc.) |

### 8.4 Accessibility

- Table uses sticky header for scroll context.
- Confirmation dialogs use `aria-labelledby` and `aria-describedby`.
- Form errors displayed via `helperText`.
- Color inputs use `title` attribute for accessibility.
