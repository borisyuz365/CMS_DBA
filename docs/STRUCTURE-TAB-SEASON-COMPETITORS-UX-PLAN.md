# תכנית פיתוח: סקשן Season Competitors בטאב STRUCTURE

מסמך זה מתאר את תכנית העבודה ל-UI/UX של סקשן ניהול מתחרים בעונה (Season Competitors) בדף `CompetitionDetails.jsx`, תחת סקשן Seasons בטאב STRUCTURE. כולל תיעוד התקדמות.

---

## 1. רקע ומטרה

- **מיקום:** `frontend/src/pages/CompetitionDetails.jsx` — סקשן חדש **מתחת לסקשן Seasons** בטאב STRUCTURE (activeTab === 0).
- **היררכיה:** Season Competitors נמצאת ברמת העונה. מתחרים משויכים ל-`COMPETITION_ID` + `SEASON_NUM` (טבלת `season_competitors.json`).
- **מטרה:** כלי ניהול שמאפשר למשתמש:
  - לראות **אילו מתחרים נמצאים בעונה** שהוא עורך
  - לראות **אילו מתחרים לא נמצאים בעונה** (באותו ספורט, אפשרויות להצטרפות)
  - **לחבר מתחרים לעונה** (העברה מ"לא בעונה" ל"בעונה")
  - **להוציא מתחרים מהעונה** (העברה מ"בעונה" ל"לא בעונה")
- **מגבלה:** **ללא mock data** — שימוש אך ורק ב-API הקיים ובנתונים אמיתיים.

---

## 2. מקורות נתונים ו-API

### 2.1 API קיימות

| מתודה | נתיב | תיאור |
|-------|------|--------|
| `api.getSeasonCompetitors(competitionId, seasonNum)` | GET `/data/season-competitors?competitionId=&seasonNum=` | מחזיר מתחרים המשויכים ל-competition+season (מועשרים בשם) |
| `api.getCompetitorsNotInSeason(competitionId, seasonNum, filters)` | GET `/data/competitions/:id/seasons/:seasonNum/competitors/not-in-season` | מחזיר מתחרים **לא** בעונה (אותו ספורט). פילטרים: `{ countryId?, name? }` |
| `api.addCompetitorsToSeason(competitionId, seasonNum, competitorIds)` | POST `/data/competitions/:id/seasons/:seasonNum/competitors` | מוסיף מתחרים לעונה. Body: `{ COMPETITOR_IDS: [1,2,3] }` |
| `api.removeCompetitorFromSeason(competitionId, seasonNum, competitorId)` | DELETE `/data/competitions/:id/seasons/:seasonNum/competitors/:competitorId` | מוציא מתחרה מהעונה |
| `api.updateSeasonCompetitor(competitionId, seasonNum, competitorId, body)` | PUT `/data/competitions/:id/seasons/:seasonNum/competitors/:competitorId` | מעדכן STATUS/SEED למתחרה בעונה. Body: `{ STATUS?, SEED? }` |

### 2.2 מבנה נתונים

- **season_competitors.json:** `COMPETITION_ID`, `SEASON_NUM`, `COMPETITOR_ID` (אופציונלי: `STATUS`, `SEED`).
- **תשובת getSeasonCompetitors:** `{ COMPETITION_ID, SEASON_NUM, COMPETITOR_ID, name?, STATUS?, SEED? }[]` (data).
- **תשובת getCompetitorsNotInSeason:** `{ COMPETITOR_ID, name?, countryName?, COUNTRY_ID?, ... }[]` (data).

### 2.3 פילטרים ל"לא בעונה"

- **countryId** (מספר) — סינון לפי מדינה (COUNTRY_ID).
- **name** (מחרוזת) — חיפוש בשם (substring).

---

## 3. תכנית UI – סקשן Season Competitors

### 3.1 תנאי תצוגה

- הסקשן יוצג **רק כאשר נבחרה עונה** (`selectedStructureSeasonNum != null`).
- הסקשן ממוקם **מתחת לסקשן Seasons** (Paper עם Season Details + Configuration).
- ייתכן שיהיה לפני או אחרי Phases — לפי סדר הלוגי הרצוי (מומלץ: מיד אחרי Seasons, לפני Phases).

### 3.2 מבנה Layout (שני פאנלים + כפתורי פעולה)

| אזור | תיאור |
|------|--------|
| **פאנל שמאל** | "Competitors In Season" — טבלה של מתחרים הנמצאים בעונה הנבחרת |
| **אזור אמצע** | כפתורי העברה: ADD COMPETITORS (←), REMOVE COMPETITORS (→) |
| **פאנל ימין** | "Competitors Not In Season" — טבלה של מתחרים שאינם בעונה + פילטרים |

### 3.3 כותרות ותוכן

- **כותרת סקשן:** "Season Competitors"
- **כפתורים גלובליים (אופציונלי):**
  - `CONNECT COMPETITORS TO SEASON` — כפתור ראשי לקישור (יכול להופיע כ-action מרכזי).
  - `SUGGEST NEW TEAMS` — אופציונלי, לא בשלב ראשון.

### 3.4 טבלת "Competitors In Season"

| עמודה | מקור | הערות |
|--------|------|--------|
| Checkbox | — | בחירה מרובה |
| ID | `COMPETITOR_ID` | מזהה מספרי |
| Name | `name` (מועשר) | שם המתחרה |
| Country | `countryName` / `COUNTRY_ID` | אם קיים ב-API |
| Status | `STATUS` (אם יש) | dropdown/select — אופציונלי בשלב ראשון |
| Competition | — | אופציונלי (refresh icon) |
| Seed | `SEED` | שדה עריכה (input) — onBlur → `updateSeasonCompetitor` |
| Not In... | checkbox | אופציונלי — לא בשלב ראשון |

### 3.5 טבלת "Competitors Not In Season"

| עמודה | מקור | הערות |
|--------|------|--------|
| Checkbox | — | בחירה מרובה |
| ID | `COMPETITOR_ID` | |
| Name | `name` | |
| Country | `countryName` | |

**פילטרים (מעל הטבלה):**

| פילטר | סוג | API param |
|--------|-----|-----------|
| Country | Dropdown | `countryId` |
| Competition | Dropdown | אופציונלי — "Select a country first" |
| Competitor Name | Text input | `name` |
| SEARCH | Button | טוען `getCompetitorsNotInSeason` עם הפילטרים |

### 3.6 כפתורי פעולה (בין הפאנלים)

| כפתור | כיוון | פעולה | Disabled |
|--------|------|--------|----------|
| `<< ADD COMPETITORS` | ← | `addCompetitorsToSeason` עם `selectedNotInSeason` | כאשר `selectedNotInSeason.length === 0` |
| `REMOVE COMPETITORS >>` | → | `removeCompetitorFromSeason` עבור כל `selectedInSeason` | כאשר `selectedInSeason.length === 0` |
| `REMOVE FROM ALL SEASONS` | — | אופציונלי — הסרה מכל העונות של התחרות | כשאין בחירה |

---

## 4. לוגיקה טכנית

### 4.1 סנכרון עונה

- **בעיה נוכחית:** ב-`CompetitionDetails.jsx` קיים `competitorsSeasonNum` שמאותחל ל-`null` ולעולם לא מתעדכן.
- **פתרון:** `competitorsSeasonNum` יסונכרן עם `selectedStructureSeasonNum`:
  ```js
  useEffect(() => {
    setCompetitorsSeasonNum(selectedStructureSeasonNum);
  }, [selectedStructureSeasonNum]);
  ```

### 4.2 טעינת נתונים

- כאשר `activeTab === 0 && id && competitorsSeasonNum != null`:
  - `loadCompetitorsTab()` — קורא `getSeasonCompetitors` ו-`getCompetitorsNotInSeason` במקביל.
- `loadCompetitorsTab` כבר מוגדר ב-`CompetitionDetails.jsx` (שורות ~1318–1336).

### 4.3 Handlers קיימים

| Handler | מיקום | תיאור |
|---------|--------|--------|
| `loadCompetitorsTab` | ~1318 | טוען in/not-in |
| `handleRemoveFromSeason(competitorId)` | ~1338 | מוציא מתחרה בודד |
| `handleSeasonCompetitorStatusSeedBlur(competitorId, field, value)` | ~1349 | מעדכן STATUS/SEED |
| `handleRemoveSelectedFromSeason` | ~1362 | מוציא את הנבחרים |
| `handleAddToSeason` | ~1376 | מוסיף את הנבחרים מהרשימה "לא בעונה" |

### 4.4 State קיים

- `competitorsInSeason`, `competitorsNotInSeason`
- `selectedInSeason`, `selectedNotInSeason`
- `competitorsNotInSeasonFilters`: `{ countryId: '', name: '' }`
- `competitorsLoading`

---

## 5. רפרנס קוד קיים

- **CompetitionDetails.jsx:** State + handlers (שורות ~219–226, ~1318–1385).
- **reuse/CompetitionEdit/CompetitorsManager:** UI מלא עם `CompetitorsTable`, כפתורי ADD/REMOVE, פילטרים, דיאלוג Remove From All Seasons.
- **NotInSeasonCompetitors.js:** רכיב ישן שמשתמש ב-**mock data** — **לא לשימוש**.

---

## 6. משימות פיתוח מפורטות

### שלב א — סנכרון ועדכון לוגיקה

- [X] **א.1** — סנכרון `competitorsSeasonNum` עם `selectedStructureSeasonNum` (useEffect).
- [X] **א.2** — וידוא ש-`loadCompetitorsTab` נקרא כשמשתנים `competitorsSeasonNum` או הפילטרים.

### שלב ב — מבנה UI בסיסי

- [X] **ב.1** — הוספת Paper חדש "Season Competitors" מתחת ל-Seasons (או במיקום מתאים).
- [X] **ב.2** — Layout: שני פאנלים (Grid/Box) + אזור כפתורים במרכז.
- [X] **ב.3** — כותרת "Season Competitors" וייצוג "בעונה נבחרת: [שם עונה]".

### שלב ג — טבלת Competitors In Season

- [X] **ג.1** — טבלה עם עמודות: Checkbox, ID, Name, Country.
- [X] **ג.2** — Checkbox לכל שורה + "select all".
- [X] **ג.3** — בחירה → `selectedInSeason` (COMPETITOR_ID).
- [X] **ג.4** — (אופציונלי) עמודת Seed עם input + onBlur → `updateSeasonCompetitor`.

### שלב ד — טבלת Competitors Not In Season

- [X] **ד.1** — אזור פילטרים: Country (dropdown מ-`countries`), Competitor Name (input), כפתור SEARCH.
- [X] **ד.2** — טבלה עם עמודות: Checkbox, ID, Name, Country.
- [X] **ד.3** — בחירה → `selectedNotInSeason`.
- [X] **ד.4** — חיבור פילטרים ל-`getCompetitorsNotInSeason(filters)`.

### שלב ה — כפתורי פעולה

- [X] **ה.1** — כפתור "<< ADD COMPETITORS" → `handleAddToSeason` (disabled כש-`selectedNotInSeason` ריק).
- [X] **ה.2** — כפתור "REMOVE COMPETITORS >>" → `handleRemoveSelectedFromSeason` (disabled כש-`selectedInSeason` ריק).
- [X] **ה.3** — כפתור "REMOVE FROM ALL SEASONS" — הושלם: API חדש + דיאלוג אישור. 2025-02-15.

### שלב ו — שיפורים

- [X] **ו.1** — Loading state (spinner) בזמן `competitorsLoading`.
- [X] **ו.2** — הודעות Snackbar להצלחה/שגיאה (קיימות).
- [X] **ו.3** — ריענון אוטומטי לאחר Add/Remove.

---

## 7. תיעוד התקדמות

### 7.1 סטטוס כללי

| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-15 | תכנית | יצירת מסמך תכנית. |
| 2025-02-15 | הושלם | יישום מלא: סנכרון, UI, טבלאות, פילטרים, כפתורי פעולה. |
| 2025-02-15 | שיפורים | Merge ל-Seasons, Remove from all seasons, פילטר Competition (אחרי מדינה, אותו ספורט). |

### 7.2 משימות ומעקב

- [X] **א.1** — סנכרון `competitorsSeasonNum` עם `selectedStructureSeasonNum` (useEffect). 2025-02-15.
- [X] **א.2** — וידוא ש-`loadCompetitorsTab` נקרא כשמשתנים `competitorsSeasonNum` או הפילטרים. 2025-02-15.
- [X] **ב.1** — הוספת Paper חדש "Season Competitors" מתחת ל-Seasons. 2025-02-15.
- [X] **ב.2** — Layout: שני פאנלים + אזור כפתורים במרכז. 2025-02-15.
- [X] **ב.3** — כותרת "Season Competitors" וייצוג שם עונה. 2025-02-15.
- [X] **ג.1** — טבלה Competitors In Season: Checkbox, ID, Name, Country, Seed. 2025-02-15.
- [X] **ג.2** — Checkbox לכל שורה + select all. 2025-02-15.
- [X] **ג.3** — בחירה → `selectedInSeason`. 2025-02-15.
- [X] **ג.4** — עמודת Seed עם input + onBlur → `updateSeasonCompetitor`. 2025-02-15.
- [X] **ד.1** — פילטרים: Country, Competitor Name, SEARCH. 2025-02-15.
- [X] **ד.2** — טבלה Competitors Not In Season. 2025-02-15.
- [X] **ה.1** — כפתור "<< ADD COMPETITORS". 2025-02-15.
- [X] **ה.2** — כפתור "REMOVE COMPETITORS >>". 2025-02-15.
- [X] **ו.1** — Loading state (LoadingSpinner). 2025-02-15.

### 7.3 לוג שינויים

| תאריך | תיאור קצר |
|--------|------------|
| 2025-02-15 | יצירת מסמך תכנית Season Competitors. |
| 2025-02-15 | יישום: useEffect לסנכרון competitorsSeasonNum; הוספת Paper Season Competitors עם שתי טבלאות, פילטרים, כפתורי ADD/REMOVE, עמודת Seed. |

---

## 8. הערות נוספות

- **REMOVE FROM ALL SEASONS:** אם ה-API לא תומכת — יש לבחור: לוותר, או להוסיף endpoint חדש שמסיר מתחרה מכל ה-`season_competitors` של התחרות.
- **Competition filter ב"Not In Season":** ה-backend הנוכחי מקבל `countryId` ו-`name` בלבד. פילטר לפי competition עשוי לדרוש הרחבה.
- **סדר סקשנים:** להחליט אם Season Competitors יופיע לפני או אחרי Phases/Stages — לפי UX.

---

*מסמך זה מעודכן לפי הבקשה: הוספת כלי ניהול Season Competitors תחת סקשן Seasons ב-CompetitionDetails.jsx, ללא mock data.*
