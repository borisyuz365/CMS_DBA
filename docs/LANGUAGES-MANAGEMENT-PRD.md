# Languages Management — Product Requirements Document (PRD)

**Module:** Languages List & Language Details  
**Version:** 1.0  
**Last Updated:** 2026-03-08  
**Status:** As-Built Specification (derived from source code)

---

## 1. Executive Summary

The Languages Management module is a two-screen CMS product that enables operators to browse, create, edit, and manage language entities. Languages are a core reference entity used across the platform for content localization, UI rendering, and text direction control. The module is implemented as a React SPA using Material UI, communicating with a RESTful backend API layer.

The module consists of:

- **Languages List** (`/languages`) — A **search-first** filterable, sortable, paginated data table with inline editing (two boolean fields), bulk operations (delete/restore), CSV export, and language creation.
- **Language Details** (`/languages/:id`) — A detail view with a three-column layout: media (static icon), form fields including a parent language selector, and boolean toggles.

---

## 2. Languages List Screen

**Component:** `LanguagesList` (`frontend/src/pages/LanguagesList.jsx`)  
**Route:** `/languages`

### 2.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | Page title ("Languages List") and a "Create Language" button (top-right). |
| **Filter Panel** | A row of filter controls above the data table. |
| **Data Table** | A sticky-header table with column-level filters, sorting, grouping, and row selection. |
| **Footer Bar** | Action buttons (edit mode, save, delete/restore, export CSV), pagination controls. |

### 2.2 Data Loading Strategy

**Search-first pattern.** The table is empty on mount. Data is loaded only when the user explicitly clicks **Search**.

- On mount, only supporting data is loaded:
  - `api.getTerms()` + `api.getCategories()` via `Promise.all` — For Term Edit Modal.
- The **Search** button sets `hasSearched = true` and triggers `api.getLanguagesList()`.
- **Clear Filters** resets `hasSearched` to `false`, clears all languages, and returns the table to its initial empty state.
- Top-level filters (Language ID, Name) are applied **client-side** on the loaded dataset.
- The data table uses `dataForTable` which resolves to an empty array when `hasSearched` is `false`.

### 2.3 Filter Panel

Two filter controls plus action buttons:

| Filter | Type | Grid Size | Behavior |
|--------|------|-----------|----------|
| **Language ID** | `TextField` (free text) | `md:2.4` | Exact string match on `id`. Applied client-side. |
| **Name** | `TextField` (free text) | `md:2.4` | Case-insensitive substring match on `name`. Applied client-side. |

Action buttons:

- **Search** (`md:1.2`) — Fetches all languages from API and sets `hasSearched = true`.
- **Clear Filters** (`md:1.2`) — Resets all filter values, column filters, languages array, selection, and `hasSearched` flag.
- **Show Deleted** (`Switch`, `md:1.2`) — Client-side toggle. When OFF, rows where `IS_DELETED === true` are hidden.

### 2.4 Data Table

#### 2.4.1 Columns

| # | Field | Header | Width | View Mode | Edit Mode |
|---|-------|--------|-------|-----------|-----------|
| 0 | — | Checkbox | — | Row selection. Header supports select-all / indeterminate. | Same. |
| 1 | `id` | ID | 70px | Blue link (`#1976d2`, `fontWeight: 500`). Click opens detail page in new tab. | Same (not editable). |
| 2 | `name` | Name | 14ch | `TranslateIcon` avatar (blue `#1976d2`) + clickable name. Click behavior depends on `nameId` — see section 2.4.6. | Same (not inline-editable). |
| 3 | `code` | Code | 70px | Value or `"-"`. | Same (not editable). |
| 4 | `direction` | Direction | 80px | Displays `"RTL"` if `1`, `"LTR"` if `0`, otherwise raw value. | Same (not editable). |
| 5 | `isDisplayed` | Displayed | 90px | "Yes" / "No". | Inline `Checkbox`. |
| 6 | `isUI` | Is UI | 70px | "Yes" / "No". | Inline `Checkbox`. |

#### 2.4.2 Column-Level Filtering

Each column header contains an inline `TextField` with placeholder "Filter" (height: 32px). Filtering is:
- Case-insensitive substring match.
- Applied client-side on the loaded dataset.
- Numeric fields (`id`, `direction`) support exact numeric and substring match.

#### 2.4.3 Sorting

Standard sorting: click toggles asc/desc. Single active field. Strings use `localeCompare`; numbers use arithmetic. Nulls pushed to end. Active: blue; inactive: gray.

#### 2.4.4 Grouping

Standard grouping via `ViewListIcon`. Collapsible groups with count. Expand/collapse via icons.

#### 2.4.5 Row Behavior

- **Non-edit mode:** Clicking a row opens the detail page in a new tab (`/languages/{id}`).
- **Edit mode:** Row click disabled.
- **Deleted rows:** Opacity 0.6, gray background/text.
- **Selected rows:** Blue `#E3F2FD` background.

#### 2.4.6 Name Click — Conditional Term Modal

The name click behavior has **three-tier fallback logic**, unique to this module:

1. If `row.nameId` is **falsy** (null/undefined) → opens the detail page in a new tab.
2. If `row.nameId` exists → fetches the term via `api.getTermById(nameId)`:
   - If term `category === 'Language names'` → opens the **Term Edit Modal**.
   - Otherwise → opens the detail page in a new tab.
3. If the term fetch **fails** → opens the detail page in a new tab (graceful fallback).

> **Note:** Per a code comment, all backend entries currently have `nameId: null`, so the Term Modal path is effectively dormant but is wired up for future use.

#### 2.4.7 Empty States

| Condition | Message |
|-----------|---------|
| Not yet searched (`hasSearched === false`) | "Enter criteria and click Search to see results." |
| Searched but no data returned | "No languages found. Click \"Create Language\" to add one." |
| Data loaded but filters exclude all rows | "No rows match the current filters." |

### 2.5 Footer Bar — Actions

| Action | Button Style | Condition | Behavior |
|--------|-------------|-----------|----------|
| **Edit Mode** | Outlined/Contained blue | Always visible | Toggles inline editing. Cancel with unsaved changes shows `window.confirm`. |
| **Save Changes** | Contained green (`#4caf50`) | Edit mode only | Sends `api.updateLanguagesBulk(updates)`. Shows pending count. Disabled if no changes. |
| **Delete / Restore** | Red/Green | Always; disabled if no selection | Dynamic based on selection. Opens confirmation dialog. Calls `api.deleteLanguages()` or `api.restoreLanguages()`. |
| **Export to CSV** | Outlined | Always visible | Exports selected or all to CSV. File: `languages_YYYY-MM-DD.csv`. |

### 2.6 Pagination

Standard: 10, 25 (default), 50, 100. Previous/Next buttons. Resets on filter change.

### 2.7 Create Language Dialog

Triggered by "Create Language". Dialog: `maxWidth="sm"`, `fullWidth`.

| Field | Type | Required | Grid | Default | Notes |
|-------|------|----------|------|---------|-------|
| **Name** | `TextField` | Yes | `xs:12` | `''` | Creates a Term under category "Language names" with `languageId: 1`, `isDefault: true`, `status: 'Approved'`. |
| **Code** | `TextField` | No | `xs:6` | `'xx'` | Language code (e.g., "en", "he"). Trimmed; falls back to `'xx'` if empty. |
| **Culture Name** | `TextField` | No | `xs:6` | `'xx-XX'` | Culture/locale identifier (e.g., "en-US"). Trimmed; falls back to `'xx-XX'`. |
| **ISO2 Code** | `TextField` | No | `xs:6` | `'xx'` | ISO 639-1 two-letter code. Trimmed; falls back to `'xx'`. |
| **Direction** | `TextField` (number) | No | `xs:6` | `0` | `0` = LTR, `1` = RTL. Converted to `Number`. Falls back to `0`. |
| **Displayed** | `Checkbox` | No | `xs:6` | `true` | `isDisplayed`. |
| **Is UI** | `Checkbox` | No | `xs:6` | `true` | `isUI`. |

**Creation flow:**
1. Validate form (Name required).
2. Create Term via `api.createTerm({ category: 'Language names', values: [...] })`.
3. Create language via `api.createLanguage(payload)` with `nameId` from term.
4. Close dialog, reload languages, navigate to detail page (`/languages/{newId}`).

### 2.8 Term Edit Modal

- `initialCategory`: `"Language names"`
- `onSave`/`onSaveAndUpdate`: Updates term then reloads languages list.

### 2.9 Snackbar Notifications

Top-right, 6000ms auto-hide. Triggered on all CRUD operations.

---

## 3. Language Details Screen

**Component:** `LanguageDetails` (`frontend/src/pages/LanguageDetails.jsx`)  
**Route:** `/languages/:id`

### 3.1 Page Layout

| Zone | Description |
|------|-------------|
| **Header Bar** | "Back to List" button + title ("Language – {name}"). Clickable name opens Term Edit Modal if `nameId` exists. |
| **General Details Card** | Three-column layout: media (left), form fields (center), boolean toggles (right). Single "Save & Update In Service" button. |

### 3.2 Data Loading

On mount (and when `id` changes), three parallel loads:
1. `api.getLanguageById(id)` — Loads the language entity.
2. `api.getTerms()` + `api.getCategories()` — For Term Edit Modal.
3. `api.getLanguages()` — For the Parent Language (`fatherLangId`) dropdown.

When the language object loads, `formData` is initialized as a shallow copy of the entire language object.

### 3.3 Header Bar

- **Back to List**: Navigates to `/languages`.
- **Title**: `variant="h4"`, `fontWeight: 700`. Format: `Language – {name}`.
  - If `nameId` exists, name is clickable (blue, underlined) → opens Term Edit Modal.

### 3.4 General Details Card

Three-column responsive layout with a single save scope.

#### 3.4.1 Section Header

- Title: "General Details" (`variant="h6"`, `fontWeight: 600`).
- **Save & Update In Service** button (green `#15803d`).

#### 3.4.2 Left Column — Media (fixed 200px on md+)

| Element | Description |
|---------|-------------|
| **Avatar** | 72×72px. Static `TranslateIcon` (36px) on blue `#1976d2` background. No image upload functionality. |
| **Label** | "Language" (0.7rem). |

#### 3.4.3 Center Column — Form Fields (5-column grid on md)

Fields are rendered from `GENERAL_DETAILS_FIELD_KEYS`:

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| **Code** | `code` | `TextField` (text) | Language code string. |
| **Direction** | `direction` | `TextField` (number) | `0` = LTR, `1` = RTL. Auto-detected as numeric. |
| **Parent Language** | `fatherLangId` | `Select` dropdown | Options from `api.getLanguages()`, excluding the current language. Displays `lang.name \|\| lang.code \|\| "Language {id}"`. Includes an empty "None" option. Setting to empty sends `null`. |

**Field rendering logic (`renderField`):**
- **`fatherLangId`**: Rendered as a `Select` with all languages (excluding self). Empty option labeled `<em>None</em>`. Value is converted to `Number` on change.
- **Booleans** (`BOOLEAN_KEYS: isDisplayed, isUI, isMetricSystem`): Rendered as `Checkbox` with `FormControlLabel`.
- **Other fields**: Auto-detect numeric vs text. Read-only field: `id`.

#### 3.4.4 Right Column — Boolean Toggles (2-column grid on md)

| Field | Key | Label |
|-------|-----|-------|
| `isDisplayed` | Displayed | Checkbox |
| `isUI` | UI Language | Checkbox |

#### 3.4.5 Save Logic

`handleSave()`:
1. Iterates over all keys in `formData`.
2. Compares each field against original `language` using `JSON.stringify` comparison.
3. Only changed fields are sent via `api.updateLanguagesBulk([{ languageId: language.id, changes }])`.
4. Language reloaded on success.
5. No save is performed if no changes are detected.

### 3.5 Term Edit Modal

- `initialCategory`: `"Language names"`
- On save: updates term, reloads language.

### 3.6 Error & Loading States

| State | Behavior |
|-------|----------|
| **Loading** (no language yet) | Centered `LoadingSpinner`. |
| **Error** | `Alert` (error) + "Back to List" button. |
| **Not Found** | `Alert` (warning, "Language not found") + "Back to List" button. |

---

## 4. API Endpoints

### 4.1 Language Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/languages` | Get all languages (enriched, for list/edit). Returns `{ data: [...] }`. | List (Search) |
| `GET` | `/languages/:id` | Get a single language by `id`. Returns `{ data: {...} }`. | Details (Load) |
| `POST` | `/languages` | Create a new language. Body: `{ nameId, name, code, cultureName, iso2LettersCode, direction, isDisplayed, isUI }`. Returns `{ data: {...} }`. | List (Create Dialog) |
| `PUT` | `/languages/bulk` | Bulk update languages. Body: `{ updates: [{ languageId, changes }] }`. Returns `{ data: { updated, errors } }`. | List (Edit Save), Details (Save), List (Delete/Restore) |

### 4.2 Supporting Endpoints

| Method | Endpoint | Description | Used By |
|--------|----------|-------------|---------|
| `GET` | `/data/languages` | Returns all languages (basic reference data with `isUI` flag). | Details (Parent Language dropdown) |
| `GET` | `/terms` | Returns all terms. | List + Details (Term Modal) |
| `GET` | `/terms/:id` | Returns a single term. | List (Name click) + Details (Name click) |
| `PUT` | `/terms/:id` | Update a term. | List + Details (Term save) |
| `POST` | `/terms` | Create a new term. | List (Create Dialog) |
| `GET` | `/categories` | Returns all categories. | List + Details (Term Modal) |
| `POST` | `/categories` | Create a new category. | List + Details (Term Modal) |

> **Note:** Two distinct language endpoints exist:
> - `/data/languages` — Basic reference list (used for dropdowns across the app).
> - `/languages` — Enriched list/edit endpoint (used by this module's list screen).

---

## 5. Data Model

### 5.1 Language Entity

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | Integer | No | Primary key. Auto-generated. |
| `nameId` | Integer | Yes | Foreign key to Term (category: "Language names"). Currently `null` for all backend entries. |
| `name` | String | Yes | Display name of the language (e.g., "English", "Hebrew"). |
| `code` | String | Yes | Short language code (e.g., "en", "he"). Default: `'xx'`. |
| `cultureName` | String | Yes | Culture/locale identifier (e.g., "en-US", "he-IL"). Default: `'xx-XX'`. |
| `iso2LettersCode` | String | Yes | ISO 639-1 two-letter code. Default: `'xx'`. |
| `direction` | Integer | Yes | Text direction. `0` = LTR, `1` = RTL. Default: `0`. |
| `isDisplayed` | Boolean | Yes | Whether this language is displayed in the app. Default: `true`. |
| `isUI` | Boolean | Yes | Whether this language is available as a UI language. Default: `true`. |
| `fatherLangId` | Integer | Yes | Foreign key to parent language (`id` of another language). `null` if no parent. |
| `IS_DELETED` | Boolean | No | Soft-delete flag. |

### 5.2 Field Naming Convention

This entity uses **camelCase** field names (e.g., `isDisplayed`, `nameId`, `fatherLangId`) rather than the **UPPER_SNAKE_CASE** convention (e.g., `IS_DISPLAYED`, `NAME_ID`) used by most other entities in the system. The only exception is `IS_DELETED`, which follows the system-wide convention.

---

## 6. User Flows

### 6.1 Search Languages

1. User navigates to `/languages`.
2. Table is **empty** — message: "Enter criteria and click Search to see results."
3. User optionally enters Language ID and/or Name.
4. User clicks **Search**.
5. All languages load; client-side filters are applied.
6. Column-level filters, sorting, and grouping are available.

### 6.2 Create a New Language

1. User clicks **Create Language**.
2. Dialog opens with defaults (code: `'xx'`, cultureName: `'xx-XX'`, iso2LettersCode: `'xx'`, direction: `0` (LTR), displayed: true, isUI: true).
3. User fills in at least **Name** (required).
4. Optionally sets code, culture name, ISO2 code, direction, and boolean flags.
5. System creates a Term under "Language names", then the language.
6. Navigates to new language's detail page.

### 6.3 Inline Edit (List)

1. User clicks **Edit Mode**.
2. `isDisplayed` and `isUI` columns become inline checkboxes.
3. User toggles values, clicks **Save Changes**.
4. Bulk update sent; list reloaded.

### 6.4 Edit Language Details

1. User navigates to `/languages/:id`.
2. Modifies fields:
   - **Code** via text field.
   - **Direction** via number field (0 = LTR, 1 = RTL).
   - **Parent Language** via dropdown selector (all languages except self, or "None").
   - Boolean toggles (`isDisplayed`, `isUI`).
3. Clicks **Save & Update In Service**.
4. Only changed fields are sent.

### 6.5 Edit Language Name (Term)

1. User clicks the language name link (list or detail page).
2. **List page**: Opens Term Modal only if `nameId` exists AND term category is "Language names"; otherwise opens detail page.
3. **Detail page**: Opens Term Modal if `nameId` exists.
4. User edits translations; language data is refreshed on save.

### 6.6 Bulk Delete / Restore

1. User selects one or more rows via checkboxes.
2. Clicks **Delete Languages** (or **Restore Languages** if deleted rows are selected).
3. Confirmation dialog appears.
4. On confirm, `api.deleteLanguages()` or `api.restoreLanguages()` is called.
5. Selection cleared; list reloaded.

---

## 7. Shared Components & Dependencies

| Component | Source | Usage |
|-----------|--------|-------|
| `LoadingSpinner` | `reuse/LoadingSpinner` | Full-page loading indicator. |
| `Alert` | `reuse/Alert` | Error and warning message display. |
| `TermEditModal` | `reuse/TermEditModal` | Multi-language term editing for language names. |
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
- **Detail General Details:** Media fixed 200px on md+, fields 5-column grid on md, booleans 2-column grid on md.

### 8.3 Direction Column Display

The `direction` field uses a human-readable mapping in the list view:

| Value | Display |
|-------|---------|
| `0` | `LTR` |
| `1` | `RTL` |
| Other/null | Raw value or `"-"` |

### 8.4 Key Behavioral Differences from Other Entity List Pages

| Behavior | Languages List | Most Other Lists |
|----------|----------------|------------------|
| **Initial data load** | Does NOT auto-load. Requires explicit Search click. | Auto-loads all data on mount. |
| **Field naming convention** | Uses **camelCase** (`id`, `name`, `code`, `isDisplayed`, `fatherLangId`). | Uses **UPPER_SNAKE_CASE** (`SPORT_TYPE_ID`, `ALIAS_NAME`, `IS_DISPLAYED`). |
| **Name click (list)** | Three-tier fallback: null nameId → detail page; valid term with correct category → Term Modal; otherwise → detail page. | If `NAME_ID` exists → Term Modal; else → detail page. |
| **Detail page media** | Static icon only (no image upload). | Most have image upload dialog. |
| **Parent entity reference** | `fatherLangId` dropdown to select parent language (self-referencing). | Not present in other entities. |
| **Direction field** | Mapped to LTR/RTL display. | N/A for other entities. |
| **Create defaults** | Provides locale-style defaults (`'xx'`, `'xx-XX'`). | Defaults are typically empty or numeric. |
