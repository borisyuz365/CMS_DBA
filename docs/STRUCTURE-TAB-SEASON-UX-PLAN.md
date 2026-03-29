# תכנית פיתוח: סקשן Season בטאב STRUCTURE

מסמך זה מתאר את תכנית העבודה ל-UI/UX של סקשן העונות (Season) בטאב STRUCTURE בדף `CompetitionDetails.jsx`, כולל תיעוד התקדמות.

---

## 1. רקע ומטרה

- **מיקום:** `frontend/src/pages/CompetitionDetails.jsx` — טאב STRUCTURE (activeTab === 0, טאב ברירת מחדל). סדר הטאבים: Structure | Configurations | Tools & Screens | Table Settings.
- **היררכיה:** Season היא הרמה הגבוהה בתחרות. בטאב Structure מוצג רק סקשן העונות (Seasons); Phases, Stages, Groups ו-Competitors הוסרו מטאב זה.
- **מטרה:** מסך נוח לצפייה ועריכה של עונה נבחרת: בחירה ב-dropdown, מילוי פרטים והגדרות, פעולות (current / create / delete), ודיאלוג יצירת עונה חדשה.

---

## 2. מקורות נתונים וסכמה

- **API:** `api.getSeasons(competitionId)`, `api.updateSeason(competitionId, seasonNum, data)`, `api.createSeason(competitionId, data)`, `api.deleteSeason(competitionId, seasonNum)`, `api.updateCompetition(id, { CURRENT_SEASON })`.
- **סכמה:** `backend/data/schemas/seasons.schema.json`.
- **נתונים:** `backend/data/seasons.json` — שדות עונה תואמים לסכמה.

---

## 3. תכנית UI – סקשן Season (תצוגה ראשית)

### 3.1 אזור בחירה וניהול (למעלה)

| רכיב | תיאור | הערות |
|------|--------|--------|
| כותרת | "Seasons" | |
| **Autocomplete "Season Name"** | בחירת עונה עם חיפוש והשלמה אוטומטית. תצוגה: מזהה/שם (למשל #10 - 2025/2026). רוחב שדה זהה ל-Season Key. | הקלדה → סינון רשימה; בחירה → טעינת העונה ומילוי כל השדות למטה. |
| **כפתור (...)** | שלוש נקודות ליד השדה | פותח את מודל הטרמים (Term) לעריכת **שם העונה** הנבחרת (NAME_ID). |
| **SET CURRENT** | כפתור להגדרת עונה נוכחית | Disabled כשהעונה הנבחרת כבר current. |
| **CREATE** | כפתור כחול | פותח דיאלוג "New Season" (ראה סעיף 5). |
| **DELETE** | כפתור אפור | מוחק את העונה הנבחרת (עם confirm). **Disabled** רק כאשר העונה הנבחרת היא CURRENT. |

### 3.2 Season Details

| שדה | סוג | מקור בסכמה | הערות |
|-----|-----|------------|--------|
| Season Key | טקסט | `SEASON_KEY` | Placeholder: `<Default>YYYY/YYYY`. |
| Start Date | date+time | `START_DATE` | פורמט: **DD/MM/YYYY HH:MM**. |
| End Date | date+time | `END_DATE` | פורמט: **DD/MM/YYYY HH:MM**. |
| **CONNECT GAMES & COMPETITORS** | כפתור כחול | — | ללא פונקציונליות כרגע — תיעוד בלבד. |

### 3.3 Season Configuration

גריד צ'קבוקסים — מיפוי תצוגה ↔ סכמה:

| תווית ב-UI | שדה בסכמה |
|------------|-----------|
| Use Name | `USE_NAME` |
| Show Top Athletes | `SHOW_TOP_ATHLETES` |
| Has Brackets | `HAS_BRACKETS` |
| Has Table | `HAS_TABLE` |
| Has Info Card | `SHOW_INFO_CARD` |
| Has Seed | `HAS_SEED` |
| Show Top Teams Tab | `SHOW_TOP_TEAMS_TAB` |
| Show Outrights Tab | `SHOW_OUTRIGHTS_TAB` |
| Present Competition Rules | `PRESENT_COMPETITION_RULES` |
| Show Matches | `SHOW_MATCHES` |

### 3.4 Transfers Window

**לא לממש כרגע** — מוותרים על החלק (למרות ש-`TRANSFERS_WINDOW_START_DATE` / `TRANSFERS_WINDOW_END_DATE` קיימים בסכמה).

### 3.5 כפתורים בתחתית

| כפתור | צבע | פונקציונליות כרגע |
|--------|------|---------------------|
| TABLE SETTINGS | כחול | אין — המחשה/תיעוד. |
| INFO CARD | אפור | אין — המחשה/תיעוד. |

---

## 4. לוגיקה כללית (תצוגה ראשית)

- **עונה נבחרת:** בחירה ב-Autocomplete (Season Name) → טעינת העונה → מילוי Season Details + Season Configuration. עריכה בשדות + כפתור Save → עדכון לאותה עונה.
- **DELETE:** מחיקת העונה הנבחרת (עם confirm). כפתור disabled אם העונה = CURRENT.
- **SET CURRENT:** הגדרת העונה הנבחרת כ-current. כפתור disabled אם כבר current.
- **פורמט תאריך:** בכל המסך — **DD/MM/YYYY HH:MM**.

---

## 5. דיאלוג "New Season"

### 5.1 מבנה הדיאלוג (לפי עיצוב המסך)

- **כותרת:** "New Season :"
- **סגירה:** X.
- **Season Name** — שדה טקסט, placeholder "Enter Season Name". הערך ישמש כ-**VALUE** (באנגלית) של הטרם שייווצר (קטגוריה "Seasons Names").
- **Language** — dropdown (למשל English). קובע שפה; ה-VALUE של הטרם = באנגלית = מה שהמשתמש הזין ב-Season Name.
- **Start Date / End Date** — תאריך (פורמט DD/MM/YYYY HH:MM).
- **Round Name** — צ'קבוקס + dropdown "select round name" + כפתור "...".
- **Set Current Season** — צ'קבוקס: להגדיר את העונה החדשה כ-current.
- **Based on last season** — צ'קבוקס (תיעוד/המחשה או העתקת הגדרות בהמשך).
- **כפתורים:** CANCEL, SAVE (SAVE פעיל when required fields filled).

### 5.2 לוגיקת יצירת עונה

- **SEASON_NUM:** `max(SEASON_NUM בק competition) + 1`.
- **טרם (term):** תחת קטגוריה **"Seasons Names"**. **VALUE** = באנגלית = מה שהמשתמש הזין ב-**Season Name** בדיאלוג. קישור העונה: `NAME_ID` = id הטרם שנוצר.
- שאר השדות של העונה לפי `seasons.schema.json` (ברירות מחדל לפי סכמה).

---

## 6. תיעוד התקדמות פיתוח

### 6.1 סטטוס כללי

| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-11 | הושלם שלב א + ב + ג | תצוגה ראשית, דיאלוג New Season, אינטגרציה. |

*(לעדכן עם התקדמות.)*

### 6.2 משימות ומעקב

לסמן X כשהמשימה הושלמה. לעדכן תאריך והערות קצרות בשורה "הערות".

#### שלב א — תצוגה ראשית (סקשן Season)

- [X] **א.1** — מבנה layout: כותרת "Seasons", Autocomplete Season Name (חיפוש), כפתורים (...), SET CURRENT, CREATE, DELETE.  
  **הערות:** 2025-02-11. Paper עם כותרת Seasons; Autocomplete (type to search) + MoreVert + כפתורים. שמות כפתורים עודכנו; רוחב Season Name = Season Key.

- [X] **א.2** — חיבור Autocomplete ל-`structureSeasons`; בחירת עונה → state "עונה נבחרת" וטעינת נתוניה.  
  **הערות:** 2025-02-11. `selectedStructureSeasonNum` + `structureSeasonForm` מסונכרנים ב-useEffect. Autocomplete עם getOptionLabel, filter.

- [X] **א.3** — בלוק Season Details: Season Key, Start Date, End Date (פורמט DD/MM/YYYY HH:MM), כפתור CONNECT GAMES & COMPETITORS (ללא לוגיקה).  
  **הערות:** 2025-02-11. formatSeasonDateTime / parseSeasonDateTime; כפתור ללא לוגיקה.

- [X] **א.4** — בלוק Season Configuration: גריד צ'קבוקסים לפי הטבלה בסעיף 3.3, חיבור ל-API/state.  
  **הערות:** 2025-02-11. 10 צ'קבוקסים; handleSaveStructureSeason שולח payload מלא ל-updateSeason.

- [X] **א.5** — כפתור (...) → פתיחת Term modal לעריכת שם העונה (NAME_ID) של העונה הנבחרת.  
  **הערות:** 2025-02-11. handleSeasonNameClick עם e?.stopPropagation; מופעל מ-IconButton MoreVert.

- [X] **א.6** — SET CURRENT: לחיצה → עדכון competition.CURRENT_SEASON; disabled כשהעונה הנבחרת כבר current.  
  **הערות:** 2025-02-11. handleSetCurrentSeason; כפתור "SET CURRENT".

- [X] **א.7** — DELETE: לחיצה → confirm → מחיקה; כפתור disabled כאשר העונה הנבחרת = CURRENT.  
  **הערות:** 2025-02-11. handleDeleteSeason; כפתור "DELETE".

- [X] **א.8** — כפתורים בתחתית: TABLE SETTINGS, INFO CARD (ללא פונקציונליות).  
  **הערות:** 2025-02-11. כפתורים ויזואליים בלבד.

- [X] **א.9** — עדכון עונה: שמירת שינויים מ-Season Details + Season Configuration ל-API (עריכה inline או כפתור Save).  
  **הערות:** 2025-02-11. כפתור Save קורא handleSaveStructureSeason; backend SEASON_FIELDS כולל SEASON_KEY.

#### שלב ב — דיאלוג New Season

- [X] **ב.1** — פתיחת דיאלוג "New Season" בלחיצה על CREATE; מבנה השדות לפי סעיף 5.1.  
  **הערות:** 2025-02-11. DialogTitle "New Season :"; Season Name, Language, Start/End (DD/MM/YYYY HH:MM), Round Name (צ'קבוקס + dropdown), Set Current, Based on last.

- [X] **ב.2** — ולידציה: שדות חובה (למשל Season Name, תאריכים); SAVE פעיל בהתאם.  
  **הערות:** 2025-02-11. SAVE disabled כש-newSeasonName ריק; תאריכים אופציונליים (parseSeasonDateTime מחזיר null אם ריק).

- [X] **ב.3** — SAVE: חישוב SEASON_NUM = max+1; יצירת טרם תחת "Seasons Names" עם VALUE = Season Name (אנגלית); יצירת עונה ב-API.  
  **הערות:** 2025-02-11. api.createTerm({ category: 'Seasons Names', values: [{ languageId, value: nameTrim }] }); SEASON_NUM = Math.max(...structureSeasons.SEASON_NUM) + 1; api.createSeason.

- [X] **ב.4** — Set Current Season: אם מסומן — עדכון competition.CURRENT_SEASON לאחר יצירה.  
  **הערות:** 2025-02-11. newSeasonSetCurrent → api.updateCompetition(id, { CURRENT_SEASON: nextSeasonNum }).

- [X] **ב.5** — Round Name (צ'קבוקס + dropdown + ...): UI בלבד או חיבור למונחים — לפי החלטה.  
  **הערות:** 2025-02-11. UI בלבד; dropdown "select round name" ללא אופציות.

- [X] **ב.6** — Based on last season: UI/תיעוד בלבד כרגע.  
  **הערות:** 2025-02-11. צ'קבוקס state בלבד.

#### שלב ג — אינטגרציה וטאב STRUCTURE

- [X] **ג.1** — החלפת ה-UI הישן של רשימת העונות (List + expand) בסקשן החדש (Autocomplete + פרטים).  
  **הערות:** 2025-02-11. Paper עם Autocomplete Season Name + Season Details + Season Configuration. כותרת/תיאור "Structure — Seasons, Stages..." הוסר.

- [X] **ג.2** — הסרת Phases, Stages, Groups ו-Competitors מטאב STRUCTURE.  
  **הערות:** 2025-02-11. הבלוקים "Phases / Stages" (כולל Groups) ו-"Competitors — Seasons, Groups & Participants" הוסרו. בטאב Structure נשאר רק סקשן Seasons (בחירה, פרטים, Configuration).

- [X] **ג.3** — פורמט תאריך אחיד DD/MM/YYYY HH:MM בכל הסקשן והדיאלוג.  
  **הערות:** 2025-02-11. formatSeasonDateTime / parseSeasonDateTime; placeholder בשדות תאריך; New Season dialog עם placeholder DD/MM/YYYY HH:MM.

### 6.3 לוג שינויים (אופציונלי)

| תאריך | תיאור קצר |
|--------|------------|
| | יצירת מסמך תכנית. |
| 2025-02-11 | יישום שלב א: תצוגה ראשית (dropdown, פרטים, Configuration, Save, TABLE SETTINGS, INFO CARD). |
| 2025-02-11 | יישום שלב ב: דיאלוג New Season (Season Name, Language, תאריכים, Round Name, Set Current, Based on last); createTerm + createSeason עם SEASON_NUM = max+1. |
| 2025-02-11 | יישום שלב ג: החלפת List ב-dropdown + Stages/Phases לעונה נבחרת; backend SEASON_FIELDS + SEASON_KEY. |
| 2025-02-11 | עדכון טאבים: סדר Structure (ברירת מחדל), Configurations, Tools & Screens, Table Settings; activeTab === 0 ל-Structure. |
| 2025-02-11 | Season Name: Dropdown → Autocomplete (חיפוש); רוחב שדה = Season Key; כפתורים SET CURRENT, CREATE, DELETE; הסרת כותרת/תיאור; הסרת Competitors ו-Phases/Stages/Groups מטאב Structure. |

---

*מסמך זה מעודכן לפי ההחלטה: טרם לעונה חדשה תחת קטגוריית **Seasons Names** (לא Seasons Stages).*
