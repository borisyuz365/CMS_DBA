# תכנית פיתוח: סקשן Stages בטאב STRUCTURE

מסמך זה מתאר את תכנית העבודה ל-UI/UX של סקשן השלבים (Stages) בטאב STRUCTURE בדף CompetitionDetails, בהקשר של עונה נבחרת — כולל תצוגה ראשית, דיאלוג יצירת שלב בודד, דיאלוג ייצור שלבים מרובים (Generate) ותצוגת Preview לפני ייצור.

---

## 1. רקע ומטרה

- **מיקום:** סקשן Stages מוצג בהקשר של **עונה נבחרת** (competition + season). מיקום מדויק: בתוך טאב STRUCTURE או במסך נפרד תחת עונה — לפי החלטת ניווט סופית.
- **היררכיה:** Stage נמצאת מתחת ל-Season. כל שלב שייך ל-`COMPETITION_ID` + `SEASON_NUM`; נתוני השלבים ב-`backend/data/stages.json`.
- **מטרה:** מסך נוח לצפייה ועריכה של שלבים: טבלת שלבים (עם סדר, שם, סוג, פרמטרים), פרטי שלב נבחר, פעולות (SET AS CURRENT, CREATE NEW, DELETE STAGE, GENERATE, PHASES), דיאלוג "New Stage" ליצירת שלב בודד, ודיאלוג "Generate Stages" לייצור מרובה (ייבוא מעונה קודמת או יצירה לפי טיפוסים) עם תצוגת Preview לפני אישור.

---

## 2. מקורות נתונים וסכמה

- **API:**  
  - `api.getStages(competitionId, seasonNum)` — קבלת רשימת שלבים (מועשרת בשם מטרמים).  
  - `api.createStage(competitionId, seasonNum, data)` — יצירת שלב (POST; `STAGE_NUM` בגוף או חישוב max+1).  
  - `api.updateStage(competitionId, seasonNum, stageNum, data)` — עדכון שלב.  
  - `api.deleteStage(competitionId, seasonNum, stageNum)` — מחיקת שלב (נכשל אם השלב הוא CURRENT_STAGE).  
  - `api.updateCompetition(id, { CURRENT_STAGE })` — הגדרת שלב נוכחי.
- **סכמה:** `backend/data/schemas/stages.schema.json`.
- **נתונים:** `backend/data/stages.json` — רשומות שלבים; מפתח לוגי: `COMPETITION_ID` + `SEASON_NUM` + `STAGE_NUM`.

---

## 3. תכנית UI – סקשן Stages (תצוגה ראשית)

### 3.1 אזור כותרת ופעולות (למעלה)

| רכיב | תיאור | הערות |
|------|--------|--------|
| כותרת | "Stages" | |
| **SET AS CURRENT** | כפתור כחול — הגדרת השלב הנבחר כשלב נוכחי | Disabled כשהשלב הנבחר כבר current (competition.CURRENT_STAGE === stageNum). |
| **CREATE NEW** | כפתור כחול | פותח דיאלוג "New Stage" (ראה סעיף 5). |
| **DELETE STAGE** | כפתור אפור | מוחק את השלב הנבחר (עם confirm). **Disabled** כאשר השלב הנבחר הוא CURRENT_STAGE. |
| **GENERATE** | כפתור כחול | פותח דיאלוג "Generate Stages" (ראה סעיף 6). |
| **PHASES** | כפתור כחול | תיעוד/המחשה — פונקציונליות לפי החלטה. |

### 3.2 טבלת שלבים

טבלה עם עמודות (ניתן לגרור שורות לסדר — ORDER_BY / PRESENTATION_ORDER):

| עמודה | מקור נתונים | הערות |
|--------|-------------|--------|
| Order | סדר תצוגה (למשל 1, 2, …) | עם אייקון drag לריאורדר. |
| Name | שם השלב (מטרמים, NAME_ID) | קישור/לחיצה → בחירת השלב + טעינת "Stage Details" למטה. |
| Type | סוג השלב | מיפוי מ-`STAGE_TYPE` (למשל 1 = Group, 2 = Bracket). |
| Has Table | צ'קבוקס | `HAS_TABLE`. |
| Number Of Games | שדה מספר | `NUM_OF_GAMES` (למשל -1 = לא מוגבל). |
| Is Series | צ'קבוקס | `IS_SERIES`. |
| Connected To Previous Stage | צ'קבוקס | `CONNECTED_TO_PREVIOUS_STAGE`. |
| Filter Division | צ'קבוקס | `FILTER_DIVISION`. |
| Include in bracket | צ'קבוקס | `INCLUDE_IN_BRACKET`. |
| Pre Visual Brackets | צ'קבוקס | `PRE_VISUAL_BRACKETS`. |
| Connected In Brackets | צ'קבוקס | `CONNECTED_IN_BRACKETS`. |
| Phase | dropdown / טקסט | `PHASE` (או "Not Selected"). |

שורה נבחרת מודגשת (למשל רקע ורוד/אדום); בחירה → מילוי בלוק "Stage Details" בתחתית.

### 3.3 Stage Details (פרטי השלב הנבחר)

כותרת: "Stage Details: [שם השלב]".

| שדה | סוג | מקור בסכמה | הערות |
|-----|-----|------------|--------|
| Stage Name | טקסט | `NAME_ID` (טרמים) | עריכה דרך מודל טרמים או שדה. |
| Stage Type | dropdown | `STAGE_TYPE` | Group / Bracket (לפי מיפוי). |
| Phase | dropdown | `PHASE` | "Not Selected" או ערך. |
| Number Of Games | מספר | `NUM_OF_GAMES` | |
| Start Date | date+time | `START_DATE` | פורמט **DD/MM/YYYY HH:MM**. |
| End Date | date+time | `END_DATE` | פורמט **DD/MM/YYYY HH:MM**. |
| **CONNECT GAMES TO STAGE** | כפתור כחול | — | תיעוד/המחשה — חיבור משחקים לשלב. |

### 3.4 Stage Configuration (גריד צ'קבוקסים)

מיפוי תצוגה ↔ סכמה:

| תווית ב-UI | שדה בסכמה |
|------------|-----------|
| Has Table | `HAS_TABLE` |
| Is Series | `IS_SERIES` |
| Connected To Previous Stage | `CONNECTED_TO_PREVIOUS_STAGE` |
| Filter Division | `FILTER_DIVISION` |
| Include in bracket | `INCLUDE_IN_BRACKET` |
| Pre Visual Brackets | `PRE_VISUAL_BRACKETS` |
| Connected In Brackets | `CONNECTED_IN_BRACKETS` |

### 3.5 כפתור בתחתית

| כפתור | צבע | הערות |
|--------|------|--------|
| MANAGE STANDINGS | כחול | תיעוד/המחשה — ניהול טבלאות. |

---

## 4. לוגיקה כללית (תצוגה ראשית)

- **שלב נבחר:** לחיצה על שורה בטבלה → state "שלב נבחר" → מילוי Stage Details + Stage Configuration; שמירת שינויים → `api.updateStage(competitionId, seasonNum, stageNum, data)`.
- **SET AS CURRENT:** עדכון `competition.CURRENT_STAGE` לשלב הנבחר; כפתור disabled אם כבר current.
- **DELETE STAGE:** confirm → `api.deleteStage`; כפתור disabled אם השלב = CURRENT_STAGE.
- **פורמט תאריך:** בכל המסך — **DD/MM/YYYY HH:MM**.

---

## 5. דיאלוג "New Stage" (יצירת שלב בודד)

### 5.1 מבנה הדיאלוג (לפי עיצוב המסך)

- **כותרת:** "New Stage :"
- **סגירה:** X.
- **Stage Name** — שדה טקסט, placeholder "Enter Stage Name". הערך ישמש ליצירת/קישור טרם (קטגוריה מתאימה לשמות שלבים) — `NAME_ID`.
- **Stage Type** — dropdown: Group / Bracket (מיפוי מ-`STAGE_TYPE`).
- **Stage Parameters (גריד):**  
  Has Table, Include in bracket, Filter Division, Connected In Brackets;  
  Pre Visual Brackets, Is Series, **Num Of Games** (שדה מספר, ברירת מחדל -1), Connected To previous stage.
- **Phase** — dropdown (למשל "Phase" / "Not Selected").
- **Stage Dates:** Start Date, End Date (date+time, פורמט DD/MM/YYYY HH:MM).
- **Set Current Stage** — צ'קבוקס: להגדיר את השלב החדש כ-current לאחר היצירה.
- **כפתורים:** CANCEL, SAVE (SAVE פעיל when required fields filled, למשל Stage Name).

### 5.2 לוגיקת יצירת שלב בודד

- **STAGE_NUM:** `max(STAGE_NUM עבור competitionId+seasonNum) + 1`, או מהגוף אם נשלח.
- **טרם (term):** תחת קטגוריה מתאימה לשמות שלבים. **VALUE** = מה שהמשתמש הזין ב-**Stage Name**. קישור: `NAME_ID` = id הטרם שנוצר.
- שאר השדות לפי `stages.schema.json` (ברירות מחדל מהסכמה); שדות מהדיאלוג ממופים לסכמה.
- **Set Current Stage:** אם מסומן — לאחר `createStage` קריאה ל-`api.updateCompetition(id, { CURRENT_STAGE: newStageNum })`.

---

## 6. דיאלוג "Generate Stages" (ייצור שלבים מרובים)

### 6.1 שלב ראשון — בחירת מקור

- **כותרת:** "Generate Stages"
- **סגירה:** X.

**אפשרות א — ייבוא מעונה קודמת:**

| רכיב | תיאור |
|------|--------|
| "Import Stages from previous season" | סקשן עם dropdown "Select Season" (רשימת עונות של התחרות). |
| **IMPORT STAGES** | כפתור — ייבוא כל השלבים מהעונה הנבחרת (העתקת מבנה + פרמטרים). כפתור disabled עד לבחירת עונה. |

**אפשרות ב — יצירה לפי טיפוסים:**

| רכיב | תיאור |
|------|--------|
| "Stages Types" | צ'קבוקסים: **League Cycle**, **Group Stage**, **Bracket Stage**. |
| **CREATE** | כפתור — מעבר לתצוגת Preview (סעיף 6.2) או יצירה ישירה לפי טיפוסים שנבחרו. CREATE disabled עד לבחירת לפחות טיפוס אחד או ייבוא. |

### 6.2 תצוגת Preview (לפני ייצור בפועל)

- **כותרת:** "Generate Stages" (אותו דיאלוג או שלב שני).
- **אופציה:** צ'קבוקס "Bracket Stage" (אם רלוונטי).
- **Preview — Summary:**  
  Stages: X, Groups: Y, Games: Z, Participants: W (מספרים מחושבים לפי הטיפוסים/ייבוא).
- **Preview — פירוט:**  
  לכל שלב שייווצר: שם (למשל "Regular Season"), תג סוג (group/bracket), Games / Participants;  
  תחת כל שלב: Groups (למשל Group C, Group D) עם Participants (virtual) ו-"X games will be created".
- **כפתורים:** CANCEL, CREATE — לחיצה על CREATE מאשרת ייצור לפי ה-Preview (יצירת רשומות ב-`stages.json` + groups/games כפי שמוגדר).

### 6.3 לוגיקת Generate (תיעוד)

- **ייבוא מעונה:** שליפה של כל השלבים (ואולי Groups) של העונה הנבחרת; יצירת עותקים עם `SEASON_NUM` של העונה הנוכחית ו-`STAGE_NUM` חדשים.
- **יצירה לפי טיפוסים:** לכל טיפוס נבחר (League Cycle, Group Stage, Bracket Stage) — יצירת שלב(ים) עם פרמטרי ברירת מחדל וקבוצות/משחקים וירטואליים לפי תבנית; המספרים ב-Preview משקפים את המבנה המתוכנן.
- **אישור CREATE:** ביצוע ה-API calls (createStage ואם צריך createGroup וכו') לפי ה-Preview.

---

## 7. מיפוי שדות סכמה מרכזיים (Stage)

להלן שדות רלוונטיים ל-UI מהסכמה (חלקם כבר ממופים למעלה):

| שדה בסכמה | סוג | שימוש ב-UI |
|-----------|-----|------------|
| COMPETITION_ID, SEASON_NUM, STAGE_NUM | int | מפתח; STAGE_NUM נקבע ביצירה. |
| NAME_ID | int | שם השלב (טרמים). |
| NUM_OF_GAMES | int | Number Of Games (-1 = לא מוגבל). |
| STAGE_TYPE | int | 1 = Group, 2 = Bracket (או מיפוי אחר). |
| HAS_TABLE, IS_SERIES, CONNECTED_TO_PREVIOUS_STAGE | bool | צ'קבוקסים. |
| FILTER_DIVISION, INCLUDE_IN_BRACKET, PRE_VISUAL_BRACKETS, CONNECTED_IN_BRACKETS | bool | צ'קבוקסים. |
| PHASE | string | dropdown Phase. |
| START_DATE, END_DATE | string | תאריכים (ISO או פורמט תצוגה DD/MM/YYYY HH:MM). |
| TABLE_WINNER_POINTS, TABLE_DRAW_POINTS, TABLE_LOSER_POINTS | int | טבלת ניקוד (למשל ב-Manage Standings). |
| ORDER_BY / PRESENTATION_ORDER | any | סדר תצוגה בטבלה. |

שדות נוספים בסכמה (TABLE_*, ROUND_*, וכו') — לשלב בהמשך לפי צורך (למשל TABLE SETTINGS, Manage Standings).

---

## 8. תיעוד התקדמות פיתוח

### 8.1 סטטוס כללי

| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-11 | מסמך תכנית | יצירת המסמך; יישום לפי שלבים. |
| 2025-02-11 | הושלם שלב א + ב + ג (חלקי) | תצוגה ראשית, דיאלוג New Stage, דיאלוג Generate Stages (ייבוא + טיפוסים). תצוגת Preview לפני CREATE — להמשך. |

*(לעדכן עם התקדמות.)*

### 8.2 משימות ומעקב

לסמן X כשהמשימה הושלמה. לעדכן תאריך והערות קצרות בשורה "הערות".

#### שלב א — תצוגה ראשית (סקשן Stages)

- [X] **א.1** — מבנה layout: כותרת "Stages", כפתורים SET AS CURRENT, CREATE NEW, DELETE STAGE, GENERATE, PHASES.  
  **הערות:** 2025-02-11. Paper תחת Seasons; כפתורים ב-CompetitionDetails.jsx (טאב Structure).

- [X] **א.2** — טבלת שלבים: Order (עם drag), Name, Type, Has Table, Num Of Games, Is Series, Connected To Previous Stage, Filter Division, Include in bracket, Pre Visual Brackets, Connected In Brackets, Phase; חיבור ל-`getStages(competitionId, seasonNum)`.  
  **הערות:** 2025-02-11. Table עם stagesBySeason[selectedStructureSeasonNum]; Order = index+1 (drag להמשך). חיבור ל-loadStagesAndPhases.

- [X] **א.3** — בחירת שורה → state "שלב נבחר" → מילוי Stage Details (Stage Name, Stage Type, Phase, Number Of Games, Start/End Date, CONNECT GAMES TO STAGE) + Stage Configuration (צ'קבוקסים).  
  **הערות:** 2025-02-11. selectedStructureStageNum + structureStageForm; לחיצה על שורה מעדכנת את הטופס; Stage Details + Configuration מתחת לטבלה.

- [X] **א.4** — SET AS CURRENT: עדכון competition.CURRENT_STAGE; disabled כשהשלב כבר current.  
  **הערות:** 2025-02-11. handleSetCurrentStage(selectedStructureSeasonNum, selectedStructureStageNum); כפתור disabled כאשר CURRENT_SEASON + CURRENT_STAGE תואמים.

- [X] **א.5** — DELETE STAGE: confirm → deleteStage; disabled כאשר השלב = CURRENT_STAGE.  
  **הערות:** 2025-02-11. handleDeleteStage; confirm; כפתור disabled כאשר השלב current.

- [X] **א.6** — שמירת עריכות Stage Details + Stage Configuration → updateStage.  
  **הערות:** 2025-02-11. handleSaveStructureStage; כפתור "Save & Update In Service"; payload מלא לפי סכמה.

- [X] **א.7** — כפתור MANAGE STANDINGS (תיעוד/המחשה).  
  **הערות:** 2025-02-11. כפתור ויזואלי בלבד.

#### שלב ב — דיאלוג New Stage

- [X] **ב.1** — פתיחת דיאלוג "New Stage" בלחיצה על CREATE NEW; שדות: Stage Name, Stage Type, Stage Parameters (צ'קבוקסים + Num Of Games), Phase, Stage Dates, Set Current Stage.  
  **הערות:** 2025-02-11. כותרת "New Stage :"; במצב add — שדה טקסט Stage Name (newStageName); במצב edit — Autocomplete טרמים. Stage Type dropdown (Group/Bracket), גריד צ'קבוקסים, Phase, Stage Dates, Set Current Stage.

- [X] **ב.2** — ולידציה: שדות חובה (למשל Stage Name); SAVE פעיל בהתאם.  
  **הערות:** 2025-02-11. SAVE disabled כש-newStageName ריק (add).

- [X] **ב.3** — SAVE: חישוב STAGE_NUM = max+1; יצירת טרם לשם השלב; createStage; אם "Set Current Stage" — updateCompetition עם CURRENT_STAGE.  
  **הערות:** 2025-02-11. createTerm קטגוריה "Stages Names"; STAGE_NUM = max(stagesInSeason)+1; newStageSetCurrent → updateCompetition(CURRENT_SEASON, CURRENT_STAGE).

#### שלב ג — דיאלוג Generate Stages + Preview

- [X] **ג.1** — פתיחת דיאלוג "Generate Stages": סקשן ייבוא (Select Season + IMPORT STAGES) וסקשן טיפוסים (League Cycle, Group Stage, Bracket Stage).  
  **הערות:** 2025-02-11. דיאלוג עם Select Season (עונות מלבד הנוכחית), כפתור IMPORT STAGES; צ'קבוקסים League Cycle, Group Stage, Bracket Stage.

- [X] **ג.2** — לוגיקת ייבוא: שליפת שלבים מעונה נבחרת ויצירת עותקים לעונה הנוכחית.  
  **הערות:** 2025-02-11. IMPORT STAGES → getStages(sourceSeason); createStage לכל שלב עם STAGE_NUM עולה.

- [ ] **ג.3** — תצוגת Preview: Summary (Stages, Groups, Games, Participants) + פירוט לכל שלב וקבוצה (Participants virtual, Games virtual).  
  **הערות:** להמשך — שלב שני בדיאלוג או דיאלוג נפרד לפני CREATE.

- [X] **ג.4** — כפתור CREATE ב-Preview → ביצוע יצירת שלבים (ו-Groups/משחקים) לפי ה-Preview.  
  **הערות:** 2025-02-11. CREATE (ללא Preview): יצירת שלב אחד לכל טיפוס נבחר (League Cycle, Group Stage, Bracket Stage) עם טרם + createStage. Preview מלא — להמשך.

### 8.3 לוג שינויים (אופציונלי)

| תאריך | תיאור קצר |
|--------|------------|
| 2025-02-11 | יצירת מסמך תכנית Stages (תצוגה ראשית, New Stage, Generate Stages, Preview). |
| 2025-02-11 | יישום סקשן Stages בטאב Structure: טבלת שלבים, Stage Details, Stage Configuration, SET AS CURRENT, CREATE NEW, DELETE STAGE, GENERATE, PHASES, MANAGE STANDINGS. |
| 2025-02-11 | יישום דיאלוג New Stage: Stage Name (טקסט/טרם), Stage Type, פרמטרים, Phase, Stage Dates, Set Current Stage; createTerm + createStage עם STAGE_NUM = max+1. |
| 2025-02-11 | יישום דיאלוג Generate Stages: ייבוא מעונה קודמת (IMPORT STAGES), יצירה לפי טיפוסים (League Cycle, Group Stage, Bracket Stage) עם CREATE. |

---

*מסמך זה מתייחס לסכמה `backend/data/schemas/stages.schema.json` ולנתונים ב-`backend/data/stages.json`. רואים תמונות רפרנס: מבנה סקשן, דיאלוג New Stage, דיאלוג Generate Stages, תצוגת Preview.*
