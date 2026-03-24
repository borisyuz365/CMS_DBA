# הוספת ENTITY חדש – Merge

מסמך זה מתאר את כל השלבים והתצורות הנדרשים כדי להוסיף ישות (Entity) חדשה לפרויקט, בהתבסס על התצורה הקיימת: קשרי DB, לוגיקת שרת, ומסכי List ו-Details (Look & Feel).

**מסמכים קשורים:**  
- [UI-STANDARDS.md](./UI-STANDARDS.md) – סטנדרטים למסכי List ו-Details, צבעים, שדות תמונה, בוליאנים (Checkbox), Color Picker.  
- [backend/data/schemas/README.md](../backend/data/schemas/README.md) – סכמות Create ו־`generateCreateSchemas.js`.

---

## 1. מוסכמות שמות

| פריט | דוגמה (Country) | דוגמה (Sport) | הערה |
|------|-----------------|----------------|------|
| **שדה מזהה ב-JSON** | `COUNTRY_ID` | `SPORT_TYPE_ID` | לרוב `ENTITY_ID` או `ENTITY_TYPE_ID` |
| **קובץ נתונים** | `countries.json` | `sports.json` | `backend/data/<entity_plural>.json` |
| **קובץ סכמה** | `countries.schema.json` | `sports.schema.json` | `backend/data/schemas/` |
| **Controller** | `countryController.js` | `sportController.js` | `backend/controllers/` |
| **Routes** | `countries.js` | `sports.js` | `backend/routes/` |
| **Base path API** | `/api/countries` | `/api/sports` | לרוב `/api/<entity_plural>` |
| **Frontend path** | `/countries` | `/sports` | React Router |
| **דפי Frontend** | `CountriesList.jsx`, `CountryDetails.jsx` | `SportsList.jsx`, `SportDetails.jsx` | `frontend/src/pages/` |
| **שם בתפריט** | Countries | Sports | תחת Entities ב־`App.jsx` |

---

## 2. Backend

### 2.1 נתונים (JSON)

- קובץ: `backend/data/<entity_plural>.json` – מערך של אובייקטים.
- כל רשומה חייבת לכלול:
  - **שדה מזהה** (למשל `COUNTRY_ID`, `SPORT_TYPE_ID`) – ייחודי.
  - **NAME_ID** – אם השם מגיע מ־Terms (מילון): מפתח זר ל־`terms.json`. אופציונלי אם אין שימוש ב־Terms.
  - **name** – מחרוזת לתצוגה (לעיתים מנורמלת/מעודכנת מ־Term).
  - **IS_DELETED** – בוליאני ל־soft delete (אם רלוונטי).
  - שדה תמונה אם יש (למשל `COUNTRY_IMAGE_URL`, `SPORT_IMAGE_URL`) – ראו [UI-STANDARDS.md](./UI-STANDARDS.md).

### 2.2 סכמה (Schema) ל־Create

- קובץ: `backend/data/schemas/<entity>.schema.json`.
- כל שדה: `{ "type": "int"|"float"|"string"|"bool"|"any", "default": <value> }`.
- אחרי הוספת ישות חדשה: להוסיף את הישות ל־`ENTITIES` ב־`backend/scripts/generateCreateSchemas.js` ואז להריץ:
  ```bash
  cd backend && node scripts/generateCreateSchemas.js
  ```
  או ליצור את קובץ הסכמה ידנית בהתאם ל־README בתיקיית `schemas`.

### 2.3 Data Loader

- אין צורך בשינוי: `backend/utils/dataLoader.js` טוען/שומר לפי שם קובץ.
- שימוש ב־Controller: `dataLoader.loadData('<entity>.json')`, `dataLoader.saveData('<entity>.json', data)`.

### 2.4 Controller

קובץ: `backend/controllers/<entity>Controller.js`.

- **getAll(req, res)**  
  - טוען את ה־JSON, אופציונלי: סינון לפי query (למשל `countryId`, `name`).  
  - מחזיר: `{ success: true, data: array }`.

- **getById(req, res)**  
  - `req.params.id` – ממיר למספר, מחפש לפי שדה המזהה.  
  - 400 אם ID לא חוקי, 404 אם לא נמצא.  
  - מחזיר: `{ success: true, data: item }`.

- **updateBulk(req, res)**  
  - Body: `{ updates: [ { <idKey>: id, changes: { field: value, ... } } ] }`.  
  - **allowedFields** – רשימת שדות מותרים לעדכון (מומלץ להגביל). לכלול גם שדה תמונה אם קיים.  
  - טיפוסים: מספרים (כולל צבעים), בוליאנים (כ־boolean), מחרוזות. לא לעדכן את שדה המזהה.  
  - שמירה: `dataLoader.saveData('<entity>.json', array)`.  
  - מחזיר: `{ success: true, data: { updated, errors? } }`.

- **create(req, res)**  
  - ולידציה לשדות חובה (למשל `name`, קוד ייחודי).  
  - חישוב ID חדש: `maxId + 1`.  
  - NAME_ID: מהגוף או יצירת Term/placeholder לפי הלוגיקה בפרויקט.  
  - הוספה למערך + `saveData`.  
  - 201 + `{ success: true, data: newItem }`.

- **delete(req, res)** (אופציונלי)  
  - **Referential integrity:** אם ישויות אחרות מפנות לישות הזו (למשל competitions → COUNTRY_ID), לבדוק לפני מחיקה ולהחזיר 409 אם בשימוש.  
  - מחיקה פיזית מהמערך או סימון IS_DELETED לפי המוסכמה בפרויקט.

### 2.5 Routes

קובץ: `backend/routes/<entities>.js`.

- `GET /` → getAll  
- `PUT /bulk` → updateBulk (חייב להיות לפני `/:id`)  
- `POST /` → create  
- `GET /:id` → getById  
- `DELETE /:id` → delete (אם קיים)

### 2.6 רישום ב־server.js

- `const <entities>Routes = require('./routes/<entities>');`  
- `app.use('/api/<entities>', <entities>Routes);`

### 2.7 ישויות שמעשירות נתונים (Terms, שמות)

- **Terms:** רוב הישויות משתמשות ב־`NAME_ID` שמפנה ל־`terms.json`. השם לתצוגה (`name`) יכול להיות שמור ב־JSON (denormalized) או להיות מוזן/מעודכן דרך API ה־Terms.  
- אם הישות צריכה להציג שמות מ־ישויות אחרות (למשל Country name ב־Competition): ב־`/api/data` יש endpoints שמעשירים רשומות (למשל `resolveTermName`, טעינת countries/sports). ישות חדשה שצריכה enrichment דומה – להוסיף לוגיקה ב־data routes או ב־controller שלה.

### 2.8 תנאי חובה: יצירת Term לפני יצירת ישות (Create flow)

**בכל תהליך יצירה (Create) של ישות שיש לה שדה שם שמגיע מ־Terms (`NAME_ID` או `nameId`), חובה:**

1. **לפני** קריאה ל־`create<Entity>` – ליצור קודם Term חדש באמצעות `api.createTerm()` עם:
   - **category** – הקטגוריה הרלוונטית לישות (למשל `"Countries names"`, `"Sport Type names"`, `"Venues"`, `"Language names"`).
   - **values** – מערך שמכיל **לפחות value אחד באנגלית**:  
     `[{ languageId: 1, value: <שם הישות>, isDefault: true, status: 'Approved' }]`  
     (`languageId: 1` = אנגלית).
2. **אחרי** יצירת ה־Term – ליצור את הישות עם `NAME_ID` (או `nameId` ב־Languages) המצביע על `newTerm.id`.

זה הסטנדרט בכל מסכי ה־List: AthletesList, CompetitionsList, CompetitorsList, VenuesList, TvNetworksList, CountriesList, DataSourcesList, LanguagesList, TimeZonesList, SportsList. ישות חדשה שמוסיפים לפרויקט חייבת לעמוד באותו תהליך.

---

## 3. Frontend – API

ב־`frontend/src/services/api.js`:

- **רשימה:**  
  `get<Entities>List(filters?)` – קורא ל־`/api/<entities>?...` (עם query אם צריך), מחזיר `data` או `[]`.
- **פרט בודד:**  
  `get<Entity>ById(id)` – `GET /api/<entities>/:id`, מחזיר `data`.
- **יצירה:**  
  `create<Entity>(payload)` – `POST /api/<entities>`, body: אובייקט הישות.
- **עדכון bulk:**  
  `update<Entities>Bulk(updates)` – `PUT /api/<entities>/bulk`, body: `{ updates: [ { <idKey>: id, changes } ] }`.
- **מחיקה/שחזור (soft delete):**  
  `delete<Entities>(ids)` – שולח bulk עם `changes: { IS_DELETED: true }`.  
  `restore<Entities>(ids)` – `changes: { IS_DELETED: false }`.

אם לישות יש תת־משאבים (כמו contracts ל־athletes), להוסיף את המתודות הרלוונטיות (get/create/update/delete) לאותו entity.

---

## 4. Frontend – ניווט ותפריט

ב־`frontend/src/App.jsx`:

1. **Import דפים:**  
   `import <Entities>List from './pages/<Entities>List';`  
   `import <Entity>Details from './pages/<Entity>Details';`

2. **תפריט (Sidebar):**  
   תחת `Entities` ב־`menuItems`, להוסיף:  
   `{ label: '<Entity Label>', path: '/<entities>', icon: <Icon /> }`

3. **Routes:**  
   - `<Route path="/<entities>" element={<Entities>List />} />`  
   - `<Route path="/<entities>/:id" element={<Entity>Details />} />`

---

## 5. מסך List – Look & Feel

התבנית זהה ל־CountriesList, SportsList, VenuesList, TvNetworksList וכו'.

- **Breadcrumb:** `Entities` → `<Entity> List`.
- **כותרת:** `<Entity> List` + כפתור **Create <Entity>** (צבע ראשי #1976d2).
- **פילטרים:** שורת שדות (למשל ID, Name) + Search + Clear + אופציה "Show Deleted" (Checkbox).
- **טבלה:**  
  - עמודת בחירה (Checkbox).  
  - עמודת **Name** – **Box** עם **Avatar** (32×32) משמאל + **Typography** לשם.  
    - Avatar: `src` = שדה תמונה של הישות; fallback = אייקון (למשל PublicIcon, SportsSoccerIcon).  
    - שם: לחיץ → ניווט ל־Details או פתיחת TermEditModal אם יש NAME_ID.  
  - שאר העמודות בהתאם לשדות הרלוונטיים.  
  - בכל header: מיון (חצים) + Group by + שדה Filter (TextField).  
- **פאגינציה:** Items per page, טווח רשומות, כפתורי קדימה/אחורה.  
- **כפתורים:** Edit Mode / Cancel Edit, Save (bulk), Delete / Restore (לפי בחירה), Export to CSV.  
- **Create dialog:** טופס עם שדות ברירת מחדל (ניתן להגדיר מ־DEFAULT_CREATE_FORM או מהסכמה). **חובה:** לפני שליחת ה־create ל־API – ליצור Term תחת הקטגוריה הרלוונטית עם value באנגלית (languageId: 1), ורק אז ליצור את הישות עם NAME_ID/nameId של ה־Term (ראו סעיף 2.8).  
- **Term Edit Modal:** אם לישות יש NAME_ID – טעינת terms + categories, לחיצה על שם פותחת TermEditModal לעריכת ה־Term.  
- **אישור מחיקה/שחזור:** Dialog עם Confirm/Cancel.

פרטי עיצוב (צבעים, גבולות, רקע): לפי [UI-STANDARDS.md](./UI-STANDARDS.md).

---

## 6. מסך Details – Look & Feel

התבנית זהה ל־CountryDetails, SportDetails, CompetitorDetails וכו'.

- **Breadcrumb:** Entities → `<Entity>` → `<Name>`.
- **Header:**  
  - כפתור "Back to List" (outlined, #1976d2).  
  - כותרת: `<Entity> – <Name>`.  
  - **Name** לחיץ → פתיחת TermEditModal אם יש NAME_ID.
- **כרטיס General Details (Paper):**  
  - **ללא NAME_ID/nameId:** שדה NAME_ID (או nameId) **לא מוצג ולא ניתן לעריכה** – השם מתנהל דרך Term (לחיצה על השם פותחת TermEditModal). ראו גם [UI-STANDARDS.md](./UI-STANDARDS.md).  
  - **מבנה שלוש עמודות (דינמי):** שמאל = מדיה (רוחב קבוע/מצומצם), אמצע = שדות (גמיש, תופס את השאר), ימין = בוליאנים (רוחב לפי תוכן). **מספר שדות בשורה:** **5 בלבד** (סטנדרט מחייב – ראו [UI-STANDARDS.md](./UI-STANDARDS.md) סעיף 1.3).  
  - **שמאל (מדיה):**  
    - Avatar (100×100 או קטן יותר) – תמונת הישות או fallback (אות/אייקון).  
    - תווית (למשל "Country Image").  
    - כפתור "Upload Image" → דיאלוג לעריכת URL תמונה.  
    - כפתור Image Version (אם קיים).  
  - **אמצע (שדות):** שדות רגילים – **5 בשורה** (gridTemplateColumns: repeat(5, 1fr) ב־md). **דינמיות לרוחב מסך:** רשת רספונסיבית (xs/sm/md/lg) כדי שהשדות יתאימו לרוחב ויצמצמו שטח מת – ראו [UI-STANDARDS.md](./UI-STANDARDS.md) "דינמיות שדות לרוחב המסך". **גובה אחיד:** כל השדות (TextField, Select) באותו גובה – `'& .MuiOutlinedInput-root': { minHeight: 40 }` – ראו [UI-STANDARDS.md](./UI-STANDARDS.md) "גובה אחיד לכל השדות".  
  - **ימין (בוליאנים):** **שורה/עמודה נפרדת**, **רק Checkbox (צ'קבוקס סטנדרטי)** – לא Switch/טוגל (כמו ב־AthleteDetails.jsx). **מרווח בין שורות:** `gap: 0.5` באזור הבוליאנים – ראו [UI-STANDARDS.md](./UI-STANDARDS.md) סעיף 1.3 "ימין (בוליאנים)".  
  - **תוויות שדות:** להציג **תוויות ידידותיות** (Friendly Field Labels) ולא מפתחות טכניים – למשל "Country Code" במקום `COUNTRY_CODE`, "Virtual / Not Real Country" במקום `IS_NOT_REAL`. ראו [UI-STANDARDS.md](./UI-STANDARDS.md) סעיף 6.
  - **שורת כותרת הסקשן (General Details):** כותרת "General Details" **ובאותה שורה** – כפתור "Save & Update In Service" (ירוק #15803d) מימין. **סטנדרט מחייב:** [UI-STANDARDS.md](./UI-STANDARDS.md) – סעיף "שורת כותרת הסקשן (General Details) + כפתור Save".  
  - **תחתית כרטיס המדיה:** כפתור Image Version (IMG_VER אם קיים) – בתוך כרטיס התמונה (שמאל), לא בשורה נפרדת.
  - **כפתור Save בתחתית (מחוץ ל-General Details):** בחלק התחתון של כרטיסים/טאבים שאינם General Details – כפתור השמירה חייב להיות **זהה** ל-"Save & Update In Service" (אותו טקסט, אותו עיצוב: רקע ירוק #15803d, טקסט לבן). ראו [UI-STANDARDS.md](./UI-STANDARDS.md) סעיף 1.3.
  - **טאבים (אופציונלי):**  
  - Paper נפרד, MUI Tabs – אם יש הרבה שדות. לחלופין, כל השדות יכולים להופיע בכרטיס General Details בלבד (שורות שדות ואז שורת בוליאנים).  
  - **תוכן כל טאב (פריסת Configurations):** **שדות משמאל, בוליאנים מימין** – כמו ב־General Details. **ניצול דינמי של רוחב המסך** – לא ליצור מצב של הרבה שורות בוליאנים ומעט שדות (חללים ריקים). ראו [UI-STANDARDS.md](./UI-STANDARDS.md) סעיף 1.4 "פריסת טאבים – שדות משמאל, בוליאנים מימין". בתוך טאב: אזור שמאל = שדות ברשת רספונסיבית; אזור ימין = צ'קבוקסים ב־**Checkbox** (לא Switch). **תוויות:** תמיד ידידותיות (FIELD_LABELS / getFieldLabel).
- **דיאלוג תמונה:** שדה URL, תצוגה מקדימה, Cancel / Save.  
- **שדות צבע:** Color Picker (TextField type="color"); המרה hex ↔ מספר ב־backend לפי [UI-STANDARDS.md](./UI-STANDARDS.md).  
- **TermEditModal:** כמו ב־List – load terms/categories, handleNameClick, onSave/onSaveAndUpdate.

---

## 7. קשרים ב־DB ולוגיקת שרת

- **NAME_ID:** אם הישות משתמשת ב־Terms לשם, כל רשומה יכולה לכלול `NAME_ID`; ה־Frontend טוען terms ומציג/עורך דרך TermEditModal.  
- **מפתחות זרים לישויות אחרות:** למשל Competition → COUNTRY_ID, SPORT_TYPE_ID. ב־Details/List אפשר להציג שם (country name, sport name) על ידי טעינת הישות המקושרת או enrichment ב־API.  
- **Referential integrity:** כשישות A מפנה לישות B (למשל Competition → Country), במחיקת B לבדוק אם קיימות רשומות A שמשתמשות ב־B ולהחזיר 409 אם כן.  
- **Soft delete:** עדכון bulk עם `IS_DELETED: true/false`; במסכי List – פילטר "Show Deleted" והצגת רשומות שנמחקו עם סטייל מוחלש.

---

## 8. Checklist – הוספת Entity חדש

- [ ] **Backend – נתונים:** קובץ `backend/data/<entities>.json` עם שדה מזהה, NAME_ID (אם רלוונטי), name, IS_DELETED (אם רלוונטי), שדה תמונה (אם רלוונטי).  
- [ ] **Backend – סכמה:** קובץ ב־`backend/data/schemas/` + עדכון `generateCreateSchemas.js` והרצת הסקריפט.  
- [ ] **Backend – Controller:** getAll, getById, updateBulk (עם allowedFields), create, delete (כולל בדיקת referential integrity אם צריך).  
- [ ] **Backend – Routes:** GET /, PUT /bulk, POST /, GET /:id, DELETE /:id.  
- [ ] **Backend – server.js:** require routes + app.use('/api/<entities>', ...).  
- [ ] **Frontend – api.js:** getList, getById, create, updateBulk, delete, restore (לפי הצורך).  
- [ ] **Frontend – App.jsx:** import דפים, פריט תפריט תחת Entities, שני Routes (list + details).  
- [ ] **Frontend – List:** `<Entities>List.jsx` – Breadcrumb, כותרת, פילטרים, טבלה עם עמודת Name (Avatar + שם לחיץ), Create dialog (**כולל יצירת Term לפני create – value באנגלית, קטגוריה רלוונטית – ראו 2.8**), Term modal, bulk save, delete/restore, עיצוב לפי UI-STANDARDS.  
- [ ] **Frontend – Details:** `<Entity>Details.jsx` – Breadcrumb, Header (Back + שם לחיץ), כרטיס General Details (תמונה + שדות + בוליאנים כ־Checkbox, **ללא שדה NAME_ID/nameId** – השם נערך דרך Term בלחיצה על השם), **כפתור Save בשורת כותרת הסקשן** – "General Details" משמאל, "Save & Update In Service" מימין באותה שורה (ראו UI-STANDARDS – שורת כותרת הסקשן + כפתור Save), **תוויות שדות ידידותיות** (FIELD_LABELS / getFieldLabel – ראו UI-STANDARDS סעיף 6), **דינמיות שדות לרוחב מסך** (רשת רספונסיבית) ו**גובה אחיד לכל השדות** (minHeight על OutlinedInput – ראו UI-STANDARDS), טאבים או כל השדות בכרטיס אחד, דיאלוג תמונה, Color Picker לשדות צבע, TermEditModal.  
- [ ] **עיצוב:** צבעים (#1976d2, #15803d), רקע #f5f5f5, כרטיסים לבנים, **Checkbox** (לא Switch) לבוליאנים – בהתאם ל־[UI-STANDARDS.md](./UI-STANDARDS.md).

---

סיום: אחרי ביצוע כל השלבים, ה־Entity החדש יהיה זמין מהתפריט, ממסך הרשימה וממסך הפרטים, עם שמירה ועדכון דרך ה־API והתנהגות עקבית עם שאר הישויות בפרויקט.
