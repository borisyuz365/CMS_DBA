# Entity Hooks - Custom Hooks for Entity Management

אוסף hooks לשימוש חוזר לניהול state ו-API calls במסכי ENTITIES.

## Hooks זמינים

### 1. useEntityList
Hook לניהול מסך רשימה - state, פילטרים, pagination, sorting ועוד.

### 2. useEntityDetails
Hook לניהול מסך פרטים - state, טופס, תמונות, טאבים ועוד.

---

## שימוש

### useEntityList

```jsx
import { useEntityList } from '../../reuse/hooks';
import { EntityListPage } from '../../reuse/components/EntityUIKit';
import api from '../services/api';

function CompetitionsList() {
  const {
    entities,
    loading,
    error,
    filters,
    handleFilterChange,
    clearFilters,
    showDeleted,
    setShowDeleted,
    pagination,
    setPagination,
    searchEntities,
    dropdownData,
  } = useEntityList({
    fetchEntities: api.getCompetitions,
    fetchDropdownData: async () => ({
      countries: await api.getCountries(),
      sports: await api.getSports(),
    }),
    initialFilters: {
      country: [],
      sportType: [],
    },
  });

  // Filter configuration
  const filterConfig = [
    {
      field: 'country',
      type: 'autocomplete-multiple',
      label: 'Country',
      options: dropdownData.countries || [],
      getOptionLabel: (option) => option.name,
      getOptionValue: (option) => option.COUNTRY_ID,
      xs: 12,
      sm: 6,
      md: 2.4,
    },
  ];

  return (
    <EntityListPage
      entityName="Competition"
      data={entities}
      loading={loading}
      error={error}
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={clearFilters}
      showDeleted={showDeleted}
      onShowDeletedChange={setShowDeleted}
      pagination={pagination}
      onPaginationChange={setPagination}
      onSearch={searchEntities}
      filterConfig={filterConfig}
      detailsPath="/competitions/:id"
    />
  );
}
```

### useEntityDetails

```jsx
import { useParams } from 'react-router-dom';
import { useEntityDetails } from '../../reuse/hooks';
import { EntityDetailsPage } from '../../reuse/components/EntityUIKit';
import api from '../services/api';

function CompetitionDetails() {
  const { id } = useParams();
  
  const {
    entity,
    loading,
    error,
    formData,
    handleFormChange,
    activeTab,
    setActiveTab,
    saveEntity,
    saveImage,
    dropdownData,
  } = useEntityDetails({
    entityId: id,
    fetchEntity: api.getCompetition,
    updateEntity: api.updateCompetition,
    updateEntityImage: api.updateCompetitionImage,
    fetchDropdownData: async () => ({
      countries: await api.getCountries(),
      sports: await api.getSports(),
    }),
    mapEntityToFormData: (entity) => ({
      COMPETITION_NAME: entity.COMPETITION_NAME || '',
      COUNTRY_ID: entity.COUNTRY_ID || '',
      SPORT_TYPE_ID: entity.SPORT_TYPE_ID || '',
    }),
  });

  // Form fields configuration
  const formFields = [
    {
      field: 'COMPETITION_NAME',
      type: 'text',
      label: 'Competition Name',
      xs: 12,
      md: 6,
    },
    {
      field: 'COUNTRY_ID',
      type: 'select',
      label: 'Country',
      options: dropdownData.countries || [],
      getOptionLabel: (option) => option.name,
      getOptionValue: (option) => option.COUNTRY_ID,
      xs: 12,
      md: 3,
    },
  ];

  // Images configuration
  const images = [
    {
      type: 'logo',
      label: 'Logo',
      url: entity?.LOGO_URL,
      urlField: 'LOGO_URL',
    },
  ];

  return (
    <EntityDetailsPage
      entityName="Competition"
      entity={entity}
      loading={loading}
      error={error}
      formData={formData}
      onFormChange={handleFormChange}
      onSave={saveEntity}
      images={images}
      formFields={formFields}
      onImageSave={saveImage}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      listPath="/competitions"
    />
  );
}
```

---

## API

### useEntityList

#### Parameters
- `fetchEntities` (required): `(filters) => Promise<Array>` - Function to fetch entities
- `fetchDropdownData` (optional): `() => Promise<Object>` - Function to fetch dropdown data
- `initialFilters` (optional): `Object` - Initial filter values
- `autoLoad` (optional): `boolean` - Whether to auto-load on mount (default: true)
- `onError` (optional): `(error) => void` - Error handler callback

#### Returns
- `entities`: Filtered and sorted entities array
- `loading`: Loading state
- `error`: Error message
- `filters`: Current filter values
- `handleFilterChange`: `(field, value) => void` - Handler for filter changes
- `clearFilters`: `() => void` - Clear all filters
- `showDeleted`: Show deleted toggle state
- `setShowDeleted`: `(value) => void` - Set show deleted toggle
- `pagination`: Pagination state object
- `setPagination`: `(pagination) => void` - Set pagination
- `sortConfig`: Sort configuration object
- `setSortConfig`: `(config) => void` - Set sort configuration
- `groupByField`: Current group by field
- `setGroupByField`: `(field) => void` - Set group by field
- `expandedGroups`: Set of expanded group keys
- `setExpandedGroups`: `(groups) => void` - Set expanded groups
- `columnFilters`: Column filter values object
- `setColumnFilters`: `(filters) => void` - Set column filters
- `selectedRows`: Selected row IDs array
- `setSelectedRows`: `(rows) => void` - Set selected rows
- `isEditMode`: Edit mode state
- `setIsEditMode`: `(value) => void` - Set edit mode
- `pendingChanges`: Pending changes object
- `setPendingChanges`: `(changes) => void` - Set pending changes
- `dropdownData`: Dropdown data object
- `dropdownLoading`: Dropdown loading state
- `loadDropdownData`: `() => Promise<void>` - Reload dropdown data
- `snackbar`: Snackbar state object
- `setSnackbar`: `(snackbar) => void` - Set snackbar
- `searchEntities`: `() => Promise<void>` - Search entities with current filters
- `reload`: `() => Promise<void>` - Reload entities

### useEntityDetails

#### Parameters
- `entityId` (required): `string` - Entity ID
- `fetchEntity` (required): `(id) => Promise<Object>` - Function to fetch entity
- `updateEntity` (optional): `(id, data) => Promise<Object>` - Function to update entity
- `updateEntityImage` (optional): `(id, imageType, imageUrl) => Promise` - Function to update entity image
- `fetchDropdownData` (optional): `() => Promise<Object>` - Function to fetch dropdown data
- `fetchTabData` (optional): `(id, tabIndex) => Promise<any>` - Function to fetch tab data
- `mapEntityToFormData` (optional): `(entity) => Object` - Function to map entity to form data
- `onError` (optional): `(error) => void` - Error handler callback
- `onSaveSuccess` (optional): `() => void` - Success handler callback

#### Returns
- `entity`: Entity data object
- `loading`: Loading state
- `error`: Error message
- `formData`: Form data object
- `setFormData`: `(data) => void` - Set form data directly
- `handleFormChange`: `(field, value) => void` - Handler for form field changes
- `formChanged`: Whether form has been modified
- `imageErrors`: Image error states object
- `setImageErrors`: `(errors) => void` - Set image errors
- `activeTab`: Active tab index
- `setActiveTab`: `(index) => void` - Set active tab
- `tabData`: Tab data object (indexed by tab index)
- `tabLoading`: Tab loading states object
- `loadTabData`: `(tabIndex) => Promise<void>` - Load tab data
- `dropdownData`: Dropdown data object
- `dropdownLoading`: Dropdown loading state
- `loadDropdownData`: `() => Promise<void>` - Reload dropdown data
- `snackbar`: Snackbar state object
- `setSnackbar`: `(snackbar) => void` - Set snackbar
- `loadEntity`: `() => Promise<void>` - Reload entity
- `saveEntity`: `() => Promise<void>` - Save entity
- `saveImage`: `(imageType, imageUrl) => Promise<void>` - Save image
- `reload`: `() => Promise<void>` - Reload entity

---

## יתרונות

- **עקביות**: אותו pattern לכל ה-entities
- **פחות קוד**: לא צריך לכתוב state management בכל מסך
- **תחזוקה קלה**: שינוי אחד משפיע על כל המסכים
- **טיפול בשגיאות**: טיפול אוטומטי בשגיאות
- **Loading states**: ניהול אוטומטי של loading states
- **Type safety**: ניתן להוסיף TypeScript types בקלות

---

## דוגמאות מימוש

ראה:
- `frontend/src/pages/AthletesList.jsx` - דוגמה למסך רשימה
- `frontend/src/pages/AthleteDetails.jsx` - דוגמה למסך פרטים

---

**תאריך יצירה**: 2026-01-25
