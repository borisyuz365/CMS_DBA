# TV Networks Management — Product Requirements Document (PRD)

**Module:** TV Networks List & TV Network Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The TV Networks Management module is a two-screen CMS product that enables operators to browse, search, create, edit, and manage TV network (channel) entities. It is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **TV Networks List** (`/tv-channels`) — A filterable, sortable, paginated data table with inline editing, bulk operations (delete/restore), CSV export, and TV channel creation.
- **TV Network Details** (`/tv-channels/:id`) — A detail view for a single TV network entity, allowing direct field editing, image management, and term editing.

---

## 2. TV Networks List Screen

**Component:** `TvNetworksList` (`frontend/src/pages/TvNetworksList.jsx`)  
**Route:** `/tv-channels`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("TV Channels List") and a "Create TV Channel" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls, and selection counter. |

### 2.2 Data Loading Strategy

- **No default data load.** The table renders empty on mount with the message: *"No TV channels found. Use the filters above and click Search to find channels."*
- On mount, only dropdown/reference data is loaded in parallel:
  - `api.getCountries()` and `api.getLanguages()` via `Promise.allSettled` (gracefully handles individual failures).
  - `api.getTerms()` and `api.getCategories()` via `Promise.all` (for Term Edit Modal support).
- Data is fetched only when the user explicitly clicks the **Search** button, which calls `api.getTvNetworksList(filters)`.

### 2.3 Filter Panel

Four filter controls plus action buttons arranged in a responsive grid:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Country** | `Autocomplete` (multi-select) | `md:2.4` | Filters by country name(s). Options sourced from `/countries`. Sends array of country names as `country` query param. |
| **TV Network ID** | `TextField` (free text) | `md:2.4` | Filters by exact or partial TV network ID. Sent as `tvNetworkId` query param. |
| **Language** | `Select` (single) | `md:2.4` | Options dynamically populated from `/languages` (only `isDisplayed` languages). Uses `iso2LettersCode` as value. Sent as `language` query param. |
| **Channel Name** | `TextField` (free text) | `md:2.4` | Filters by channel name substring. Sent as `channelName` query param. |

Action buttons:

- **Search** (`md:1.2`) — Triggers `api.getTvNetworksList(filters)`; resets pagination to page 0.
- **Clear Filters** (`md:1.2`) — Resets all filter values and all column-level filters to empty.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF (default), rows where `IS_DELETED === true` are hidden from the table. When ON, deleted rows are shown with reduced opacity (0.6) and gray background.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection checkbox. Header checkbox supports select-all / indeterminate. | Same. |
| 1 | `TV_NETWORK_ID` | ID | 70px | Blue link text (`#1976d2`, `fontWeight: 500`). Click opens the detail page in a new tab (`/tv-channels/{id}`). | Same (not editable). |
| 2 | `name` | Name | auto | Avatar (from `NETWORK_IMAGE_URL` / `TV_NETWORK_IMAGE_URL` / `IMAGE_URL` / `LOGO_URL`, or blue `LiveTvIcon` fallback) + clickable name. If `NAME_ID` exists, click opens **Term Edit Modal** under category "TV Channels". Otherwise, click opens the detail page. | Same (not inline-editable; name is edited via Term Modal). |
| 3 | `countryName` | Country | auto | Plain text, or `"-"` if null. Edit field: `COUNTRY_ID`. | Inline `Select` dropdown populated from `/countries`. Shows emoji + name. "None" option clears value. |
| 4 | `WEBSITE` | Website | auto | Clickable link (prepends `https://` if missing). Truncated to 40 chars with ellipsis. | Inline `TextField` (full width). |
| 5 | `CHANNEL_TYPE` | Channel Type | auto | Numeric value or `"-"`. | Inline `TextField` (`type="number"`, 100px width). |
| 6 | `IS_INTERNATIONAL` | International | auto | "Yes" / "No". | Inline `Checkbox`. |
| 7 | `ORDER_LEVEL` | Order | auto | Numeric value or `"-"`. | Inline `TextField` (`type="number"`, 80px width). |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter". Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- Stacked with the top-level filter panel results.

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
- Groups are displayed as collapsible header rows showing `{Column Header}: {Value} ({count} channels)`.
- Groups are sorted: numerically if values are numbers, otherwise alphabetically.
- Null/undefined group values display as "Unknown".
- Expand/collapse is toggled via `ExpandMore` / `ChevronRight` icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/tv-channels/{id}`).
- **Edit mode:** Row click is disabled (cursor changes to `default`).
- **Deleted rows** (when `showDeleted` is ON): Rendered with `opacity: 0.6`, gray background (`#f5f5f5`), and gray text (`#999999`).
- **Selected rows:** Highlighted with blue background (`#E3F2FD`); deleted selected rows use `#e0e0e0`.

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined (off) / Contained blue (on) | Always visible | Toggles inline editing. Cancelling with unsaved changes shows `window.confirm` prompt. |
| **Save Changes** | Contained green (`#4caf50`) | Only visible in edit mode | Sends `api.updateTvNetworksBulk(updates)`. Shows count of pending changes. Disabled when no changes exist. On success: exits edit mode, clears changes, re-fetches data. |
| **Delete / Restore** | Contained red (delete) / Outlined green (restore) | Always visible; disabled if no selection | Dynamically switches between Delete and Restore based on whether selected rows include deleted items. Opens confirmation dialog. Calls `api.deleteTvNetworks()` or `api.restoreTvNetworks()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected rows (or all if none selected) to CSV. Generates `tv_networks_YYYY-MM-DD.csv`. Only includes primitive (non-object) fields. Handles commas, quotes, and newlines in values. |

### 2.6 Pagination

- **Items per page options:** 10, 25 (default), 50, 100.
- **Display format:** `{start}-{end} of {total}`.
- **Navigation:** Previous / Next arrow buttons. Previous disabled on page 0; Next disabled on last page.
- Pagination resets to page 0 when filters change or new data is loaded.

### 2.7 Create TV Channel Dialog

Triggered by the "Create TV Channel" button in the header bar.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| **Name** | `TextField` | Yes | Validated on submit. Creates a new Term under category "TV Channels" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Country** | `Select` | No | Dropdown from `/countries` with emoji + name. "None" option. |
| **Website** | `TextField` | No | Free text URL. |
| **Channel Type** | `TextField` (number) | No | Integer value. |
| **International** | `Checkbox` | No | Defaults to `false`. |
| **Order Level** | `TextField` (number) | No | Integer value. |
| **Promote in match reminder notification** | `Checkbox` | No | Defaults to `true`. |

**Creation flow:**
1. Validate form (name is required).
2. Create a new Term via `api.createTerm({ category: 'TV Channels', values: [...] })`.
3. Create the TV network via `api.createTvNetwork(payload)` using the returned `term.id` as `NAME_ID`.
4. Close dialog, re-fetch list, show success snackbar.
5. Navigate to the newly created network's detail page (`/tv-channels/{newId}`).

### 2.8 Term Edit Modal

Opened when clicking a network name that has a `NAME_ID`. Uses the shared `TermEditModal` component with:
- `initialCategory`: `"TV Channels"`
- `onSave` / `onSaveAndUpdate`: Calls `api.updateTerm(id, data)`, then re-fetches the list.
- Supports creating new categories via `api.createCategory()`.

### 2.9 Snackbar Notifications

- Positioned: top-right.
- Auto-hide duration: 6000ms.
- Severity levels: `success`, `error`, `warning`.
- Triggered on: create success/failure, save success/failure, delete/restore success/failure, export, no-data warnings.

---

## 3. TV Network Details Screen

**Component:** `TvNetworkDetails` (`frontend/src/pages/TvNetworkDetails.jsx`)  
**Route:** `/tv-channels/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + page title ("TV Channel – {name}"). The name is clickable if `NAME_ID` exists (opens Term Edit Modal). |
| **General Details Card** | A single `Paper` card containing: media section (left), editable fields (center), and boolean checkboxes (right). Includes a "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` param changes), three parallel data loads are initiated:
1. `api.getTvNetworkById(id)` — Loads the TV network entity.
2. `api.getCountries()` — Loads country dropdown options.
3. `api.getTerms()` + `api.getCategories()` — Loads data for Term Edit Modal.

When the network object is loaded, `formData` state is initialized from the network's current values.

### 3.3 Header Bar

- **Back to List** button: Outlined, blue border. Navigates to `/tv-channels`.
- **Page Title**: `variant="h4"`, `fontWeight: 700`. Format: `TV Channel – {network.name}`.
  - If `NAME_ID` exists, the name portion is clickable (blue, underlined) and opens the Term Edit Modal.

### 3.4 General Details Card

The card uses a three-column responsive layout following UI-STANDARDS:

#### 3.4.1 Section Header

- Title: "General Details" (left-aligned, `variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (right-aligned, green `#15803d`).
- Background: `#f5f5f5` with bottom border.

#### 3.4.2 Left Column — Media (fixed 200px width on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Displays `NETWORK_IMAGE_URL` if available and not errored; otherwise shows blue `LiveTvIcon` fallback. Has error handler that hides broken images. |
| **Label** | "TV Channel Image" (centered, 0.7rem). |
| **Upload Image** button | Contained blue, full width. Opens Image Edit Dialog. |

#### 3.4.3 Center Column — Editable Fields (5 per row on md+)

| Field | Type | Grid Span | Notes |
|-------|------|-----------|-------|
| **Country** | `Autocomplete` (single-select) | 1 col | Options from `/countries` with emoji + name. Uses `COUNTRY_ID`. |
| **Website** | `TextField` | 2 cols (`span 2`) | Free text URL. |
| **Channel Type** | `TextField` (number) | 1 col | Integer value. Parsed with `parseInt`. |
| **Order Level** | `TextField` (number) | 1 col | Integer value. Parsed with `parseInt`. |

All fields use `size="small"` with `minHeight: 40px` and `fontSize: 0.8rem`.

#### 3.4.4 Right Column — Booleans (stacked vertically)

| Field | Type | Default |
|-------|------|---------|
| **International** | `Checkbox` | `false` |
| **Promote in match reminder notification** | `Checkbox` | `false` |

#### 3.4.5 Save Logic

The "Save & Update In Service" button triggers `handleSave()` which:
1. Compares every field in `formData` against the original `network` object.
2. Only includes fields that have actually changed in the update payload.
3. Sends changes via `api.updateTvNetworksBulk([{ tvNetworkId, changes }])`.
4. Re-fetches the network data on success.
5. If no fields changed, silently returns without making an API call.

**Field-specific change detection:**

| Field | Comparison Logic |
|-------|------------------|
| `COUNTRY_ID` | Coerced to string; `""` treated as `null`. |
| `WEBSITE` | Trimmed; empty string treated as `null`. |
| `CHANNEL_TYPE` | Parsed to int; empty/null treated as `null`. |
| `IS_INTERNATIONAL` | Boolean coercion (`!!`). |
| `ORDER_LEVEL` | Parsed to int; empty/null treated as `null`. |
| `PROMOTE_IN_MATCH_REMINDER_NOTIFICATION` | Boolean coercion (`!!`). |
| `NETWORK_IMAGE_URL` | Trimmed; empty string treated as `null`. |

### 3.5 Image Edit Dialog

A `Dialog` (`maxWidth="sm"`, `fullWidth`) for managing the TV channel image:

| Element | Description |
|---------|-------------|
| **Title** | "Upload / Edit Image" |
| **Image URL field** | `TextField` (`type="url"`). Placeholder: `https://example.com/image.jpg`. Helper text: "Enter the URL of the TV channel logo/image". |
| **Preview** | Shown when URL is non-empty. A 200px-tall container with `objectFit: contain`. Broken images are hidden via `onError`. |
| **Cancel** | Closes dialog without saving. |
| **Save** | Calls `api.updateTvNetworksBulk()` with `{ NETWORK_IMAGE_URL: trimmedUrl || null }`. Reloads network data on success. |

### 3.6 Term Edit Modal

Same shared `TermEditModal` component as the list page:
- `initialCategory`: `"TV Channels"`
- `onSave` / `onSaveAndUpdate`: Calls `api.updateTerm(id, data)`, then re-fetches the network.
- Supports creating new categories via `api.createCategory()`.

### 3.7 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no network loaded yet) | Centered `LoadingSpinner`. |
| **Error** | `Alert` (severity: error) with error message + "Back to List" button. |
| **Not Found** (network is null after load) | `Alert` (severity: warning) with "TV channel not found" + "Back to List" button. |

---

## 4. API Endpoints

All API calls are made through the `api` service layer (`frontend/src/services/api.js`).

### 4.1 TV Network Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/tv-networks?country=...&tvNetworkId=...&channelName=...&language=...` | Search TV networks with optional filters. `country` param supports multiple values (repeated query param). Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/tv-networks/:id` | Get a single TV network by ID. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/tv-networks` | Create a new TV network. Body: `{ NAME_ID, COUNTRY_ID, WEBSITE, CHANNEL_TYPE, IS_INTERNATIONAL, ORDER_LEVEL, PROMOTE_IN_MATCH_REMINDER_NOTIFICATION }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/tv-networks/bulk` | Bulk update TV networks. Body: `{ updates: [{ tvNetworkId, changes: {...} }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Mode Save), Details (Save), Details (Image Save), List (Delete), List (Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/countries` | Returns list of countries with `COUNTRY_ID`, `name`, `EMOJI`. | List (Filter + Edit), Details (Country dropdown) |
| `GET` | `/languages` | Returns list of languages. Filtered client-side to `isDisplayed === true`. | List (Filter) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term by ID. | List + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term Modal save) |
| `POST` | `/terms` | Create a new term. Used during TV channel creation. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

---

## 5. Data Model

### 5.1 TV Network Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `TV_NETWORK_ID` | Integer | No | Primary key. Auto-generated. |
| `NAME_ID` | Integer | Yes | Foreign key to Term entity (category: "TV Channels"). |
| `name` | String | Yes | Resolved display name (from Term). Read-only in the entity; edited via Term Modal. |
| `COUNTRY_ID` | Integer | Yes | Foreign key to Country entity. |
| `countryName` | String | Yes | Resolved country display name. Read-only. |
| `WEBSITE` | String | Yes | URL of the TV network's website. |
| `CHANNEL_TYPE` | Integer | Yes | Numeric channel type identifier. |
| `IS_INTERNATIONAL` | Boolean | No | Whether the channel broadcasts internationally. Defaults to `false`. |
| `ORDER_LEVEL` | Integer | Yes | Sort/display priority. |
| `PROMOTE_IN_MATCH_REMINDER_NOTIFICATION` | Boolean | No | Whether to promote this channel in match reminder push notifications. |
| `NETWORK_IMAGE_URL` | String | Yes | URL of the channel logo/image. |
| `TV_NETWORK_IMAGE_URL` | String | Yes | Alternative image URL field (fallback). |
| `IMAGE_URL` | String | Yes | Alternative image URL field (fallback). |
| `LOGO_URL` | String | Yes | Alternative image URL field (fallback). |
| `IS_DELETED` | Boolean | No | Soft-delete flag. `true` = deleted. |

### 5.2 Image URL Resolution Order (List View)

The avatar in the list table resolves the image using the following priority:
1. `NETWORK_IMAGE_URL`
2. `TV_NETWORK_IMAGE_URL`
3. `IMAGE_URL`
4. `LOGO_URL`
5. Fallback: Blue `LiveTvIcon` on `#1976d2` background.

---

## 6. User Flows

### 6.1 Search & Browse TV Channels

1. User navigates to `/tv-channels`.
2. Page loads dropdown data (countries, languages).
3. User optionally sets filter values (country, ID, language, channel name).
4. User clicks **Search**.
5. API returns matching TV networks; table is populated.
6. User can further refine with column-level filters, sort, or group.

### 6.2 Create a New TV Channel

1. User clicks **Create TV Channel** button.
2. Dialog opens with empty form.
3. User fills in at least the **Name** field (required).
4. User clicks **Create**.
5. System creates a Term, then creates the TV network referencing that Term.
6. Dialog closes; list re-fetches; user is navigated to the new channel's detail page.

### 6.3 Inline Bulk Edit (List)

1. User clicks **Edit Mode** in the footer.
2. Editable columns (Country, Website, Channel Type, International, Order) switch to inline input controls.
3. User modifies values across one or more rows.
4. User clicks **Save Changes ({count})**.
5. System sends all changes in a single bulk API call.
6. On success: exits edit mode, clears pending changes, re-fetches data.
7. To cancel: click **Cancel Edit**; if changes exist, a confirmation prompt appears.

### 6.4 Delete / Restore TV Channels

1. User selects one or more rows via checkboxes.
2. Button dynamically shows "Delete TV Networks" or "Restore TV Networks" based on selection.
3. User clicks the button.
4. Confirmation dialog appears.
5. On confirm: system calls bulk update with `IS_DELETED: true` (delete) or `IS_DELETED: false` (restore).
6. Selection is cleared; data is re-fetched.

### 6.5 Edit TV Channel Details

1. User navigates to `/tv-channels/:id` (via list row click or direct URL).
2. Detail page loads the network entity and country dropdown.
3. User modifies fields directly in the form.
4. User clicks **Save & Update In Service**.
5. System computes diff of changed fields, sends only changes via bulk API.
6. Network data is reloaded to reflect saved state.

### 6.6 Update Channel Image

1. On the detail page, user clicks **Upload Image**.
2. Dialog opens with current URL (if any) pre-filled.
3. User enters/modifies the image URL.
4. A live preview is shown.
5. User clicks **Save**.
6. System updates the `NETWORK_IMAGE_URL` field via bulk API.

### 6.7 Edit Channel Name (Term)

1. On either page, user clicks the channel name link.
2. System fetches the full Term by `NAME_ID`.
3. Term Edit Modal opens with category "TV Channels".
4. User edits translations/values.
5. On save: Term is updated via API; parent page data is refreshed.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing dialog. Used for channel name editing and category creation. |
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
- **Font sizes:** `0.875rem` (body/table), `0.8rem` (detail form), `0.75rem` (labels)

### 8.2 Responsive Breakpoints

- Filter panel: 5-column grid on `md`, 2 columns on `sm`, 1 column on `xs`.
- Detail page fields: 5-column grid on `md`, 2 columns on `sm`, 1 column on `xs`.
- Media section: Fixed 200px on `md+`, full width on `xs`.

### 8.3 Accessibility

- Table uses sticky header for scroll context.
- All interactive elements have appropriate cursor styles.
- Confirmation dialogs use `aria-labelledby` and `aria-describedby`.
- Form errors are displayed via `helperText` on the relevant input.
