# Entity UIKit

אוסף רכיבים לשימוש חוזר למסכי ENTITIES במערכת.

## רכיבים

### 1. EntityListPage
מסך רשימה מלא עם פילטרים וטבלה.

```jsx
import { EntityListPage } from './EntityUIKit';

<EntityListPage
  entityName="Competition"
  data={data}
  columns={columns}
  filters={filters}
  onFilterChange={handleFilterChange}
  filterConfig={filterConfig}
/>
```

### 2. EntityDetailsPage
מסך פרטים מלא עם מדיה, טופס וטאבים.

```jsx
import { EntityDetailsPage } from './EntityUIKit';

<EntityDetailsPage
  entityName="Competition"
  entity={entity}
  formData={formData}
  onFormChange={handleFormChange}
  images={images}
  formFields={formFields}
  tabs={tabs}
/>
```

### 3. EntityFilters
רכיב פילטרים עם תמיכה ב-Autocomplete, TextField ועוד.

### 4. EntityMediaCard
רכיב תצוגת תמונות עם כפתור העלאה.

### 5. EntityFormSection
סקשן טופס עם תמיכה בשדות שונים, checkboxes וכפתורי פעולה.

### 6. EntityTabsSection
סקשן טאבים עם lazy loading.

### 7. EntityImageDialog
דיאלוג העלאה/עריכת תמונה.

### 8. EntityPageHeader
כותרת עמוד עם breadcrumb וכפתור חזרה.

## Hooks לשימוש חוזר

בנוסף לרכיבי UI, קיימים hooks לניהול state ו-API calls:

- `useEntityList` - Hook למסך רשימה
- `useEntityDetails` - Hook למסך פרטים

📖 **ראה**: [hooks/README.md](../../hooks/README.md)

## תיעוד מלא

ראה: [ENTITY_UIKIT_USAGE.md](../../../../docs/ENTITY_UIKIT_USAGE.md)

## דוגמאות

ראה:
- `frontend/src/pages/AthletesList.jsx`
- `frontend/src/pages/AthleteDetails.jsx`
