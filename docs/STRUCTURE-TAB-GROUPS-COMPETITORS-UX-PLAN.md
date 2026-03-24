# תכנית פיתוח: סקשן Groups Competitors בטאב STRUCTURE

מסמך זה מתאר את תכנית העבודה ל-UI/UX של ניהול מתחרים בקבוצות (Groups Competitors) בדף `CompetitionDetails.jsx`, תחת סקשן Groups בטאב STRUCTURE. מטרה: לאפשר הוספת מתחרים מטבלת "Competitors not in groups" לקבוצה ספציפית. **מקור הנתונים:** `stage_competitors.json` לפי הסכמה `stage_competitors.schema.json`.

---

## 1. רקע ומטרה

- **מיקום:** סקשן Groups Competitors מוצג **בתוך סקשן Groups** בטאב STRUCTURE, מתחת לטבלת הקבוצות ופרטי הקבוצה.
- **היררכיה:** מתחרים בקבוצה משויכים ל-`COMPETITION_ID` + `SEASON_NUM` + `STAGE_NUM` + `GROUP_NUM` (טבלת `stage_competitors.json`).
- **תנאי תצוגה:** הסקשן מוצג **רק כאשר נבחרו עונה, שלב וקבוצה** (`selectedStructureSeasonNum != null && selectedStructureStageNum != null && selectedStructureGroupNum != null`).
- **מטרה:** כלי ניהול שמאפשר למשתמש:
  - לראות **אילו מתחרים נמצאים בקבוצה** הנבחרת
  - לראות **אילו מתחרים בעונה אינם באף קבוצה** בשלב הנבחר (Competitors not in groups)
  - **לחבר מתחרים לקבוצה** — העברה מ"לא בקבוצות" לקבוצה הספציפית הנבחרת
  - **להוציא מתחרים מקבוצה** — העברה מקבוצה ל"לא בקבוצות"
  - לערוך **Participant Number** למתחרים בקבוצה
- **מגבלה:** **ללא mock data** — שימוש אך ורק ב-API ובנתונים אמיתיים.

---

## 2. החלפת מקור נתונים: group_competitors → stage_competitors

### 2.1 החלטה ארכיטקטונית

- **קובץ נוכחי (להחלפה):** `backend/data/group_competitors.json`
- **קובץ חדש:** `backend/data/stage_competitors.json`
- **סכמה:** `backend/data/schemas/stage_competitors.schema.json`

### 2.2 שדות הסכמה (stage_competitors.schema.json)

| שדה | טיפוס | ברירת מחדל | הערות |
|-----|-------|------------|--------|
| COMPETITION_ID | int | 0 | מפתח |
| COMPETITOR_NUM | int | 0 | מזהה מתחרה — יש למפות מ-COMPETITOR_ID ב-API (ראו להלן) |
| GROUP_NUM | int | 0 | מפתח — מספר הקבוצה |
| PARTICIPANT_NUM | int | 0 | מספר משתתף בקבוצה (לעריכה ב-UI) |
| SEASON_NUM | int | 0 | מפתח |
| STAGE_NUM | int | 0 | מפתח — מספר השלב |

**הערה – COMPETITOR_NUM vs COMPETITOR_ID:** הסכמה מגדירה `COMPETITOR_NUM`. במערכת הנוכחית יש שימוש ב-`COMPETITOR_ID` (מקור: `competitors.json`). בשלב המימוש יש להחליט:
- **אפשרות א:** `COMPETITOR_NUM` = `COMPETITOR_ID` (מיפוי 1:1).
- **אפשרות ב:** הרחבת הסכמה לשדה `COMPETITOR_ID` אם `COMPETITOR_NUM` משמש למטרה אחרת (למשל מספר סידורי בקבוצה).

### 2.3 מיגרציה

- יצירת קובץ `stage_competitors.json` ריק או עם נתונים מ-`group_competitors.json` (המרה לפי הסכמה).
- עדכון כל ה-routes ב-`backend/routes/data.js` לטעינה/שמירה מ-`stage_competitors.json` במקום `group_competitors.json`.
- התאמת שמות שדות בנתיבי ה-API (למשל: `COMPETITOR_ID` ב-API → `COMPETITOR_NUM` או `COMPETITOR_ID` בקובץ, לפי ההחלטה בסעיף 2.2).

---

## 3. מקורות נתונים ו-API

### 3.1 API נדרש (עדכון/יצירה)

| מתודה | נתיב | תיאור |
|-------|------|--------|
| `api.getGroupCompetitors(competitionId, seasonNum, stageNum, groupNum)` | GET `/data/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors` | מחזיר מתחרים בקבוצה (מועשרים בשם) — **מקור:** `stage_competitors.json` |
| `api.getCompetitorsNotInGroups(competitionId, seasonNum, stageNum)` | GET `/data/competitions/:id/seasons/:seasonNum/stages/:stageNum/competitors/not-in-groups` | מחזיר מתחרים **בעונה** שאינם באף קבוצה בשלב — **מקור:** `season_competitors` + `stage_competitors` |
| `api.addCompetitorsToGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds, participantNum?)` | POST `/data/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors` | מוסיף מתחרים לקבוצה. Body: `{ COMPETITOR_IDS: [1,2,3], PARTICIPANT_NUM? }` — **שימוש בסכמה:** `stage_competitors.schema.json` |
| `api.removeCompetitorFromGroup(competitionId, seasonNum, stageNum, groupNum, competitorId)` | DELETE `/data/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors/:competitorId` | מוציא מתחרה מקבוצה |
| `api.updateGroupCompetitorParticipant(competitionId, seasonNum, stageNum, groupNum, competitorId, participantNum)` | PUT `/data/competitions/:id/seasons/:stageNum/stages/:stageNum/groups/:groupNum/competitors/:competitorId` | מעדכן PARTICIPANT_NUM למתחרה בקבוצה |

### 3.2 מבנה נתונים (לאחר מעבר ל-stage_competitors)

- **stage_competitors.json:** `COMPETITION_ID`, `SEASON_NUM`, `STAGE_NUM`, `GROUP_NUM`, `COMPETITOR_NUM` (או `COMPETITOR_ID`), `PARTICIPANT_NUM`.
- **תשובת getGroupCompetitors:** `{ COMPETITION_ID, SEASON_NUM, STAGE_NUM, GROUP_NUM, COMPETITOR_ID/COMPETITOR_NUM, PARTICIPANT_NUM, name?, countryName?, logoUrl? }[]`.
- **תשובת getCompetitorsNotInGroups:** `{ COMPETITOR_ID, name?, countryName?, logoUrl? }[]`.

---

## 4. תכנית UI – סקשן Groups Competitors

### 4.1 תנאי תצוגה

- הסקשן יוצג **רק כאשר נבחרה קבוצה** (`selectedStructureGroupNum != null`) (בתוך הקשר של עונה + שלב נבחרים).
- הסקשן ממוקם **מתחת ל-Group Details** או כחלק מ-"MANAGE COMPETITORS" — Accordion / בלוק expandable לכל קבוצה.

### 4.2 מבנה Layout (בהשראת התמונות ו-Season Competitors)

| אזור | תיאור |
|------|--------|
| **פאנל שמאל** | "Competitors In Group" — טבלה של מתחרים הנמצאים בקבוצה הנבחרת |
| **אזור אמצע** | כפתורי העברה: ADD COMPETITORS (←), REMOVE COMPETITORS (→) |
| **פאנל ימין** | "Competitors Not In Groups" — טבלה של מתחרים בעונה שאינם באף קבוצה בשלב + חיפוש |

**אלטרנטיבה (Accordion):** לכל קבוצה — Accordion שמפתח לפריסת שני הפאנלים + כפתורים. רק קבוצה אחת פתוחה בכל פעם.

### 4.3 כותרות ותוכן

- **כותרת סקשן:** "Group Competitors" או "Competitors in [שם קבוצה]".
- **תצוגה:** "Competitors in [Group A]" + ספירת מתחרים — לדוגמה: "Group A (3 competitors)".

### 4.4 טבלת "Competitors In Group"

| עמודה | מקור | הערות |
|--------|------|--------|
| Checkbox | — | בחירה מרובה |
| ID | `COMPETITOR_ID` / `COMPETITOR_NUM` | מזהה מספרי |
| Name | `name` (מועשר) | שם + לוגו/Avatar (כמו Season Competitors) |
| Country | `countryName` | |
| Participant Number | `PARTICIPANT_NUM` | שדה עריכה (input) — onBlur → `updateGroupCompetitorParticipant` |
| (אופציונלי) Actions | — | אייקון מחיקה לשורה בודדת |

### 4.5 טבלת "Competitors Not In Groups"

| עמודה | מקור | הערות |
|--------|------|--------|
| Checkbox | — | בחירה מרובה |
| ID | `COMPETITOR_ID` | |
| Name | `name` | שם + לוגו/Avatar |
| Country | `countryName` | |

**חיפוש (מעל הטבלה):**

| פילטר | סוג | תיאור |
|--------|-----|--------|
| Search by name or ID | Text input | חיפוש לפי שם או מזהה (client-side או server-side לפי צורך) |
| (אופציונלי) SEARCH | Button | טוען/מסנן את הרשימה |

### 4.6 כפתורי פעולה (בין הפאנלים)

| כפתור | כיוון | פעולה | Disabled |
|--------|------|--------|----------|
| `<< ADD COMPETITORS` | ← | `addCompetitorsToGroup` עם `selectedNotInGroups` — מוסיף לקבוצה **הנבחרת** | כאשר `selectedNotInGroups.length === 0` |
| `REMOVE COMPETITORS >>` | → | `removeCompetitorFromGroup` עבור כל `selectedInGroup` | כאשר `selectedInGroup.length === 0` |

---

## 5. Look & Feel — התאמה לפרויקט

### 5.1 עקביות עם Season Competitors

| אלמנט | Season Competitors | Groups Competitors (מקביל) |
|--------|--------------------|----------------------------|
| Layout | שני פאנלים + כפתורים | זהה |
| טבלאות | Checkbox, ID, Name (עם Avatar), Country | זהה + Participant Number בטבלה השמאלית |
| כפתורי ADD/REMOVE | `<< ADD`, `REMOVE >>` | זהה |
| גובה טבלאות | 530px | זהה |
| Paper / כותרות | שחור, fontWeight 600 | זהה |

### 5.2 עקביות עם התמונות (רפרנס)

- **פאנל שמאל:** רשימת קבוצות עם expand/collapse; בחירת קבוצה → פתיחת בלוק Competitors.
- **פאנל ימין:** טבלת "Competitors not in groups" עם חיפוש.
- **לוגואים:** קבוצה עם לוגו — הצגת הלוגו; בלי לוגו — Avatar גנרי (אות ראשונה).

---

## 6. לוגיקה טכנית

### 6.1 State נדרש

| State | טיפוס | תיאור |
|-------|-------|--------|
| `groupCompetitorsInGroup` | `object[]` | מתחרים בקבוצה הנבחרת |
| `groupCompetitorsNotInGroups` | `object[]` | מתחרים בעונה לא באף קבוצה בשלב |
| `selectedInGroup` | `number[]` | COMPETITOR_ID נבחרים בקבוצה |
| `selectedNotInGroups` | `number[]` | COMPETITOR_ID נבחרים ב"לא בקבוצות" |
| `expandedGroupKey` | `string \| null` | מפתח הקבוצה הפתוחה: `"season-stage-group"` |
| `loadingGroupCompetitors` | `boolean` | אינדיקציה לטעינה |

### 6.2 Handlers

| Handler | תיאור |
|---------|--------|
| `loadGroupCompetitorsData(seasonNum, stageNum, groupNum)` | טוען `getGroupCompetitors` + `getCompetitorsNotInGroups` במקביל |
| `handleExpandGroupForCompetitors(seasonNum, stageNum, groupNum)` | מחליף קבוצה פתוחה; קורא ל-`loadGroupCompetitorsData` |
| `handleAddToGroup(seasonNum, stageNum, groupNum)` | מוסיף `selectedNotInGroups` לקבוצה |
| `handleRemoveFromGroup(seasonNum, stageNum, groupNum, competitorId)` | מוציא מתחרה בודד מקבוצה |
| `handleRemoveSelectedFromGroup(seasonNum, stageNum, groupNum)` | מוציא את הנבחרים מקבוצה |
| `handleParticipantNumChange(seasonNum, stageNum, groupNum, competitorId, value)` | מעדכן PARTICIPANT_NUM |

### 6.3 יצירת רשומה חדשה (לפי הסכמה)

- בשימוש ב-`stage_competitors.schema.json` — פונקציה `getStageCompetitorDefaultsFromSchema()` (בדומה ל-`getSeasonCompetitorDefaultsFromSchema()`).
- ערכי ברירת מחדל: `COMPETITION_ID`, `SEASON_NUM`, `STAGE_NUM`, `GROUP_NUM` מההקשר; `COMPETITOR_NUM`/`COMPETITOR_ID` מהמתחרה; `PARTICIPANT_NUM` — אופציונלי או auto-increment.

---

## 7. משימות פיתוח מפורטות

### שלב א — החלפת מקור נתונים

- [X] **א.1** — יצירת קובץ `stage_competitors.json` (ריק או מיגרציה מ-`group_competitors.json`). **הערות:** 2025-02-15. נוצר קובץ ריק `[]`.
- [X] **א.2** — עדכון כל ה-routes ב-`data.js`: טעינה/שמירה מ-`stage_competitors.json`. **הערות:** 2025-02-15.
- [X] **א.3** — התאמת שמות שדות (COMPETITOR_ID ↔ COMPETITOR_NUM) לפי הסכמה. **הערות:** 2025-02-15. API שומר COMPETITOR_NUM (מיפוי 1:1 ל-COMPETITOR_ID); מחזיר COMPETITOR_ID בתשובות.
- [X] **א.4** — הוספת `getStageCompetitorDefaultsFromSchema()`. **הערות:** 2025-02-15.

### שלב ב — מבנה UI בסיסי

- [X] **ב.1** — הוספת בלוק "Group Competitors" מתחת ל-Group Details. **הערות:** 2025-02-15.
- [X] **ב.2** — Layout: שני פאנלים (55% / 45%) + כפתורים במרכז. **הערות:** 2025-02-15.
- [X] **ב.3** — כותרת: "Competitors in [שם קבוצה]" + ספירת מתחרים. **הערות:** 2025-02-15.

### שלב ג — טבלת Competitors In Group

- [X] **ג.1** — טבלה: Checkbox, ID, Name (עם Avatar/לוגו), Country, Participant Number. **הערות:** 2025-02-15.
- [X] **ג.2** — Checkbox לכל שורה + "select all". **הערות:** 2025-02-15.
- [X] **ג.3** — Participant Number: input + onBlur → `updateGroupCompetitorParticipant`. **הערות:** 2025-02-15.
- [X] **ג.4** — בחירה → `selectedInGroup`. **הערות:** 2025-02-15.

### שלב ד — טבלת Competitors Not In Groups

- [ ] **ד.1** — שדה חיפוש: "Search by name or ID". **הערות:** לא בשלב ראשון.
- [X] **ד.2** — טבלה: Checkbox, ID, Name (עם Avatar/לוגו), Country. **הערות:** 2025-02-15.
- [X] **ד.3** — בחירה → `selectedNotInGroups`. **הערות:** 2025-02-15.
- [ ] **ד.4** — חיבור חיפוש (client-side או API). **הערות:** לא בשלב ראשון.

### שלב ה — כפתורי פעולה

- [X] **ה.1** — כפתור "<< ADD COMPETITORS" → `handleAddToGroup`. **הערות:** 2025-02-15.
- [X] **ה.2** — כפתור "REMOVE COMPETITORS >>" → `handleRemoveSelectedFromGroup`. **הערות:** 2025-02-15.

### שלב ו — שיפורים

- [X] **ו.1** — Loading state בזמן `loadingGroupCompetitors`. **הערות:** 2025-02-15.
- [X] **ו.2** — Snackbar להצלחה/שגיאה. **הערות:** 2025-02-15.
- [X] **ו.3** — ריענון אוטומטי לאחר Add/Remove. **הערות:** 2025-02-15.
- [X] **ו.4** — העשרת נתונים: `logoUrl`, `countryName` ב-API. **הערות:** 2025-02-15.

---

## 8. רפרנס קוד קיים

- **CompetitionDetails.jsx:** State + handlers (שורות ~229–237, ~1528–1596) — **מעודכן ל-`stage_competitors`** (2025-02-15).
- **backend/routes/data.js:** Routes עבור stage competitors (שורות ~760–920) — **מעודכן** (2025-02-15).
- **frontend/src/services/api.js:** `getGroupCompetitors`, `getCompetitorsNotInGroups`, `addCompetitorsToGroup`, `removeCompetitorFromGroup`, `updateGroupCompetitorParticipant`.
- **docs/STRUCTURE-TAB-SEASON-COMPETITORS-UX-PLAN.md:** רפרנס Layout ו-Look & Feel.
- **docs/STRUCTURE-TAB-GROUPS-UX-PLAN.md:** רפרנס סקשן Groups.

---

## 9. הערות נוספות

- **BR-2 (כבר מיושם):** מתחרה יכול להיות רק בקבוצה אחת בשלב; הוספה לקבוצה מסירה אוטומטית מקבוצה אחרת.
- **סדר קבוצות:** אם משתמשים ב-Accordion — רק קבוצה אחת פתוחה בכל פעם (`expandedGroupKey`).
- **מחיקת קבוצה:** בעת מחיקת קבוצה — כל המתחרים עוברים חזרה ל"Competitors not in groups" (BR-2).

---

## 10. תיעוד התקדמות פיתוח

### 10.1 סטטוס כללי

| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-15 | תכנית | יצירת מסמך תכנית. |
| 2025-02-15 | **הושלם שלב א–ו (חלקי)** | מיגרציה ל-stage_competitors, UI מלא עם שתי טבלאות, כפתורי ADD/REMOVE, לוגואים. |

### 10.2 לוג שינויים

| תאריך | תיאור קצר |
|--------|------------|
| 2025-02-15 | יצירת מסמך תכנית Groups Competitors. |
| 2025-02-15 | Backend: יצירת `stage_competitors.json`, `getStageCompetitorDefaultsFromSchema()`, החלפת כל ה-routes מ-group_competitors ל-stage_competitors. |
| 2025-02-15 | Backend: העשרת API עם `logoUrl`, `countryName` (טבלאות In Group ו-Not In Groups). |
| 2025-02-15 | Frontend: הוספת סקשן Group Competitors מתחת ל-Group Details — שתי טבלאות (In Group, Not In Groups), כפתורי ADD/REMOVE, Avatar/לוגו, Participant Number. |
| 2025-02-15 | Frontend: useEffect לטעינת נתוני קבוצה כשנבחרת קבוצה. |

### 10.3 משימות עתידיות (אופציונלי)

- חיפוש "Search by name or ID" בטבלת Competitors Not In Groups (ד.1, ד.4).

---

*מסמך זה עודכן עם התקדמות המימוש — 2025-02-15.*
