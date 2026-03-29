# Create Schemas

קבצי הסכמה האלה מגדירים **אילו שדות** להעביר ביצירת ישות חדשה (Create), כולל **טיפוס** ו-**ערך ברירת מחדל** לכל שדה.

## פורמט

כל שדה מופיע כך:

```json
"FIELD_NAME": {
  "type": "int | float | string | bool | any",
  "default": <ערך מהרשומה עם ה-ID המינימלי>
}
```

- **type** – מה השדה אמור לקבל: `int`, `float`, `string`, `bool`, או `any` (למשל כשהערך null ולא נגזר מטיפוס אחר).
- **default** – הערך מהיישות עם ה-ID הנמוך ביותר; משמש כ־default בטופס Create.

## מקור

כל קובץ `*.schema.json` נגזר מהיישות עם **ה-ID הנמוך ביותר** בקובץ הנתונים המתאים בתיקיית `../` (למשל `countries.json` → `countries.schema.json`). הטיפוס נגזר אוטומטית מהערך (ומשם השדה כשהערך null).

## שימוש

- **Frontend:** טופס "יצירת ישות" ו־`createFormData` / `DEFAULT_CREATE_FORM` יכולים להתבסס על המפתחות, `type` ו־`default` מהסכמה.
- **Backend:** לא חובה; ה-controllers כבר מגדירים ברירות מחדל. הסכמה משמשת כמקור אמת משותף.

## עדכון הסכמות

אחרי שינוי במבנה הנתונים (הוספת/הסרת שדות ב־JSON), הרצה:

```bash
cd backend
node scripts/generateCreateSchemas.js
```

הסקריפט קורא את הקבצים בתיקיית `data/`, מחפש בכל אחד את הרשומה עם ה-ID המינימלי, ושומר אותה ב־`data/schemas/<entity>.schema.json`.

## קבצים

| קובץ סכמה | קובץ נתונים | שדה מזהה |
|-----------|-------------|----------|
| countries.schema.json | countries.json | COUNTRY_ID |
| tv_networks.schema.json | tv_networks.json | TV_NETWORK_ID |
| sports.schema.json | sports.json | SPORT_TYPE_ID |
| athletes.schema.json | athletes.json | ATHLETE_ID |
| competitors.schema.json | competitors.json | COMPETITOR_ID |
| venues.schema.json | venues.json | VENUE_ID |
| competitions.schema.json | competitions.json | COMPETITION_ID |
