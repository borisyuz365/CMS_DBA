# תכנית פיתוח: סקשן Groups בטאב STRUCTURE

מסמך זה מתאר את תכנית העבודה ל-UI/UX של סקשן הקבוצות (Groups) בטאב STRUCTURE בדף CompetitionDetails, בהקשר של עונה + שלב נבחרים — כולל תצוגה ראשית, טבלת קבוצות, פרטי קבוצה נבחרת, ודיאלוג Add/Edit Group הקיים.

---

## 1. רקע ומטרה

- **מיקום:** סקשן Groups מוצג **מתחת לסקשן Stages** בטאב STRUCTURE. מיקום מדויק: בתוך טאב Structure, אחרי Phases ו-Stages.
- **היררכיה:** Group נמצאת מתחת ל-Stage. כל קבוצה שייכת ל-`COMPETITION_ID` + `SEASON_NUM` + `STAGE_NUM`; נתוני הקבוצות ב-`backend/data/groups.json`.
- **תנאי תצוגה:** סקשן Groups מוצג **רק כאשר נבחרו עונה ושלב** (`selectedStructureSeasonNum != null && selectedStructureStageNum != null`). ללא שלב נבחר — אין קבוצות להצגה.
- **מטרה:** מסך נוח לצפייה ועריכה של קבוצות: טבלת קבוצות (עם סדר, שם, פרמטרים), פרטי קבוצה נבחרת, פעולות (CREATE NEW, DELETE GROUP), ודיאלוג Add/Edit Group הקיים — Look & Feel זהה ל-Stages עם התאמה ל-Groups.

---

## 2. מקורות נתונים וסכמה

- **API:**
  - `api.getGroups(competitionId, seasonNum, stageNum)` — קבלת רשימת קבוצות (מועשרת בשם מטרמים).
  - `api.createGroup(competitionId, seasonNum, stageNum, data)` — יצירת קבוצה.
  - `api.updateGroup(competitionId, seasonNum, stageNum, groupNum, data)` — עדכון קבוצה.
  - `api.deleteGroup(competitionId, seasonNum, stageNum, groupNum)` — מחיקת קבוצה.
- **סכמה:** `backend/data/schemas/groups.schema.json`.
- **נתונים:** `backend/data/groups.json` — רשומות קבוצות; מפתח לוגי: `COMPETITION_ID` + `SEASON_NUM` + `STAGE_NUM` + `GROUP_NUM`.

### שדות הסכמה (groups.schema.json)

| שדה | טיפוס | ברירת מחדל | הערות |
|-----|-------|------------|--------|
| COMPETITION_ID | int | 0 | מפתח |
| SEASON_NUM | int | 0 | מפתח |
| STAGE_NUM | int | 0 | מפתח |
| GROUP_NUM | int | 0 | מפתח |
| NAME_ID | int | 0 | טרם לשם |
| USE_NAME | bool | false | |
| HAS_TABLE | bool | true | |
| IS_SERIES | bool | false | |
| GROUP_BY | bool | false | |
| AUTONOMOUS | bool | false | |
| TO_QUALIFY | int | 0 | מספר מעפילים |
| NUM_OF_GAMES | int | 0 | |
| GROUP_CATEGORY_NUM | any | null | |
| FATHER_GROUP | any | null | |
| IS_FINAL | bool | false | |
| ROUND_NAME | any | null | |

---

## 3. תכנית UI – סקשן Groups (תצוגה ראשית)

### 3.1 אזור כותרת ופעולות (למעלה)

| רכיב | תיאור | הערות |
|------|--------|--------|
| כותרת | "Groups" | |
| **CREATE NEW** | כפתור כחול | פותח דיאלוג Add Group (handleAddGroup); דומה ל-CREATE NEW ב-Stages. |
| **DELETE GROUP** | כפתור אדום (כמו DELETE STAGE) | מוחק את הקבוצה הנבחרת (עם confirm). Disabled כאשר אין קבוצה נבחרת. |

*הערה:* אין SET AS CURRENT לגבי Groups — זה רלוונטי רק ל-Stages.

### 3.2 טבלת קבוצות

טבלה עם עמודות (בהשראת טבלת Stages):

| עמודה | מקור נתונים | הערות |
|--------|-------------|--------|
| Order | סדר תצוגה (1, 2, …) | index + 1; ללא drag בשלב ראשון. |
| Name | שם הקבוצה (מטרמים, NAME_ID) | קישור/לחיצה → בחירת הקבוצה + טעינת "Group Details" למטה; פותח מודל טרמים לעריכת השם. |
| Has Table | צ'קבוקס | `HAS_TABLE`. |
| Num Of Games | שדה מספר | `NUM_OF_GAMES`. |
| To Qualify | שדה מספר | `TO_QUALIFY`. |
| Is Series | צ'קבוקס | `IS_SERIES`. |
| Use Name | צ'קבוקס | `USE_NAME`. |
| Group By | צ'קבוקס | `GROUP_BY`. |
| Autonomous | צ'קבוקס | `AUTONOMOUS`. |
| Is Final | צ'קבוקס | `IS_FINAL`. |

שורה נבחרת מודגשת (למשל `action.selected`); לחיצה על שורה → מילוי בלוק "Group Details" בתחתית.

### 3.3 Group Details (פרטי הקבוצה הנבחרת)

כותרת: "Group Details: [שם הקבוצה]".

| שדה | סוג | מקור בסכמה | הערות |
|-----|-----|------------|--------|
| Name (term) | Autocomplete | `NAME_ID` | עריכה דרך מודל טרמים או Autocomplete. |
| To Qualify | מספר | `TO_QUALIFY` | |
| Num Of Games | מספר | `NUM_OF_GAMES` | |
| **Group Configuration** | גריד צ'קבוקסים | | Has Table, Is Series, Use Name, Group By, Autonomous, Is Final |

כפתורים בתחתית:

| כפתור | צבע | הערות |
|--------|------|--------|
| Save & Update In Service | ירוק | שמירת עריכות Group Details → `api.updateGroup`. |
| MANAGE COMPETITORS | כחול | תיעוד/המחשה — ניהול מתחרים בקבוצה (יכול להוביל לטאב Competitors). |

### 3.4 Group Configuration (גריד צ'קבוקסים)

מיפוי תצוגה ↔ סכמה:

| תווית ב-UI | שדה בסכמה |
|------------|-----------|
| Has Table | `HAS_TABLE` |
| Is Series | `IS_SERIES` |
| Use Name | `USE_NAME` |
| Group By | `GROUP_BY` |
| Autonomous | `AUTONOMOUS` |
| Is Final | `IS_FINAL` |

---

## 4. לוגיקה כללית (תצוגה ראשית)

- **קבוצה נבחרת:** לחיצה על שורה בטבלה → state "קבוצה נבחרת" → מילוי Group Details + Group Configuration; שמירת שינויים → `api.updateGroup(competitionId, seasonNum, stageNum, groupNum, data)`.
- **טעינת Groups:** בעת בחירת שלב (`selectedStructureStageNum` משתנה) — קריאה ל-`loadGroups(selectedStructureSeasonNum, selectedStructureStageNum)` אם הנתונים עוד לא נטענו. המפתח: `groupsByStage[${seasonNum}-${stageNum}]`.
- **DELETE GROUP:** confirm → `api.deleteGroup`; כפתור disabled כאשר אין קבוצה נבחרת.
- **איפוס בחירה:** כאשר השלב משתנה — איפוס `selectedStructureGroupNum` ו-`structureGroupForm`.

---

## 5. דיאלוג Add / Edit Group (קיים — הרחבה)

דיאלוג Add/Edit Group **כבר קיים** ב-CompetitionDetails (`groupModalOpen`, `handleAddGroup`, `handleEditGroup`, `handleGroupModalSave`). כרגע הוא **לא נקרא** מאף UI בטאב Structure. הסקשן Groups החדש יקרא ל:

- `handleAddGroup(selectedStructureSeasonNum, selectedStructureStageNum)` — CREATE NEW.
- `handleEditGroup(selectedStructureSeasonNum, selectedStructureStageNum, group)` — לחיצה על שורה או כפתור עריכה.

### 5.1 שדות בדיאלוג (המצב הקיים)

| שדה | מצב |
|-----|------|
| Group number | קיים (חובה ב-add) |
| Name (term) | קיים (Autocomplete) |
| TO_QUALIFY | קיים |
| NUM_OF_GAMES | קיים |
| HAS_TABLE | קיים (Checkbox) |
| IS_SERIES | קיים (Checkbox) |

### 5.2 שדות להרחבה (אופציונלי — לפי צורך)

שדות מהסכמה שניתן להוסיף לדיאלוג בשלב שני:

| שדה | טיפוס | הערות |
|-----|-------|--------|
| USE_NAME | bool | צ'קבוקס |
| GROUP_BY | bool | צ'קבוקס |
| AUTONOMOUS | bool | צ'קבוקס |
| IS_FINAL | bool | צ'קבוקס |
| FATHER_GROUP | any | dropdown/שדה; nullable |
| ROUND_NAME | any | dropdown/שדה; nullable |
| GROUP_CATEGORY_NUM | any | dropdown/שדה; nullable |

**החלטה:** בשלב ראשון לא מרחיבים את הדיאלוג — משתמשים בשדות הקיימים. שדות נוספים יוצגו ב-Group Details (inline) ויישמרו דרך `handleSaveStructureGroup`.

---

## 6. State חדש נדרש

| State | טיפוס | תיאור |
|-------|-------|--------|
| `selectedStructureGroupNum` | number \| null | מזהה הקבוצה הנבחרת. |
| `structureGroupForm` | object \| null | נתוני הקבוצה לעריכה (כמו structureStageForm). |
| `structureGroupSaving` | boolean | אינדיקציה לשמירה (כמו structureStageSaving). |

**State קיים בשימוש:**

- `groupsByStage` — `{ [seasonNum-stageNum]: groups[] }` — כבר קיים.
- `loadGroups(seasonNum, stageNum)` — כבר קיים.
- `handleAddGroup`, `handleEditGroup`, `handleDeleteGroup`, `handleGroupNameClick` — כבר קיימים.

---

## 7. תלויות והשפעות

### 7.1 useEffect לטעינת Groups

כאשר `selectedStructureSeasonNum` ו-`selectedStructureStageNum` תקפים, ולנתוני Groups עבור ה-key המקביל חסרים — קריאה ל-`loadGroups`.

```js
useEffect(() => {
  if (activeTab !== 0 || !id || selectedStructureSeasonNum == null || selectedStructureStageNum == null) return;
  const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
  if (groupsByStage[key] === undefined) {
    loadGroups(selectedStructureSeasonNum, selectedStructureStageNum);
  }
}, [activeTab, id, selectedStructureSeasonNum, selectedStructureStageNum]);
```

### 7.2 איפוס Group בעת שינוי Stage

```js
// בתוך useEffect שבודק selectedStructureSeasonNum — או useEffect נפרד
useEffect(() => {
  setSelectedStructureGroupNum(null);
  setStructureGroupForm(null);
}, [selectedStructureStageNum]);
```

### 7.3 סנכרון structureGroupForm עם הקבוצה הנבחרת

```js
useEffect(() => {
  if (selectedStructureSeasonNum == null || selectedStructureStageNum == null || selectedStructureGroupNum == null) {
    setStructureGroupForm(null);
    return;
  }
  const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
  const groups = groupsByStage[key] || [];
  const group = groups.find((g) => Number(g.GROUP_NUM) === Number(selectedStructureGroupNum));
  setStructureGroupForm(group ? { ...group } : null);
}, [selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum, groupsByStage]);
```

---

## 8. מיפוי שדות סכמה מרכזיים (Group)

| שדה בסכמה | סוג | שימוש ב-UI |
|-----------|-----|------------|
| COMPETITION_ID, SEASON_NUM, STAGE_NUM, GROUP_NUM | int | מפתח; GROUP_NUM נקבע ביצירה. |
| NAME_ID | int | שם הקבוצה (טרמים, קטגוריה "Groups Names"). |
| TO_QUALIFY | int | To Qualify. |
| NUM_OF_GAMES | int | Num Of Games. |
| HAS_TABLE | bool | צ'קבוקס. |
| IS_SERIES | bool | צ'קבוקס. |
| USE_NAME | bool | צ'קבוקס. |
| GROUP_BY | bool | צ'קבוקס. |
| AUTONOMOUS | bool | צ'קבוקס. |
| IS_FINAL | bool | צ'קבוקס. |
| GROUP_CATEGORY_NUM, FATHER_GROUP, ROUND_NAME | any | nullable — בשלב ראשון לא ב-UI; ניתן להוסיף בהמשך. |

---

## 9. סדר ביצוע (רשימת משימות)

### שלב א — מבנה וטעינת נתונים

- [X] **א.1** — הוספת State: `selectedStructureGroupNum`, `structureGroupForm`, `structureGroupSaving`.  
  **הערות:** 2025-02-15. CompetitionDetails.jsx.

- [X] **א.2** — useEffect לטעינת Groups כש-Stage נבחר; איפוס Group כש-Stage משתנה.  
  **הערות:** 2025-02-15. useEffects נפרדים: אחד לטעינה, אחד לאיפוס בעת שינוי season/stage.

- [X] **א.3** — useEffect לסנכרון `structureGroupForm` עם הקבוצה הנבחרת.  
  **הערות:** 2025-02-15.

### שלב ב — UI סקשן Groups

- [X] **ב.1** — הוספת Paper עם כותרת "Groups" **מתחת לסקשן Stages**; תנאי: `selectedStructureSeasonNum != null && selectedStructureStageNum != null`.  
  **הערות:** 2025-02-15.

- [X] **ב.2** — כפתורים CREATE NEW, DELETE GROUP; חיבור ל-`handleAddGroup`, `handleDeleteGroup`.  
  **הערות:** 2025-02-15.

- [X] **ב.3** — טבלת קבוצות: Order, Name, Has Table, Num Of Games, To Qualify, Is Series, Use Name, Group By, Autonomous, Is Final.  
  **הערות:** 2025-02-15.

- [X] **ב.4** — הודעת "No groups for this stage" כאשר `groupsByStage[key]` ריק; הצעת יצירה.  
  **הערות:** 2025-02-15. + הודעת "Loading groups…" בזמן טעינה.

- [X] **ב.5** — לחיצה על שורה → `setSelectedStructureGroupNum`; הדגשת שורה נבחרת.  
  **הערות:** 2025-02-15.

### שלב ג — Group Details ו-Configuration

- [X] **ג.1** — בלוק "Group Details" מתחת לטבלה (מוצג רק כאשר `structureGroupForm` != null).  
  **הערות:** 2025-02-15.

- [X] **ג.2** — שדות: Name (Autocomplete + כפתור עריכת טרמים), To Qualify, Num Of Games.  
  **הערות:** 2025-02-15. Name עם IconButton (MoreVertIcon) לפתיחת מודל טרמים.

- [X] **ג.3** — גריד צ'קבוקסים: Has Table, Is Series, Use Name, Group By, Autonomous, Is Final.  
  **הערות:** 2025-02-15.

- [X] **ג.4** — כפתור "Save & Update In Service" — `handleSaveStructureGroup`; payload מלא לפי סכמה.  
  **הערות:** 2025-02-15.

- [X] **ג.5** — כפתור MANAGE COMPETITORS (תיעוד/המחשה).  
  **הערות:** 2025-02-15. כפתור ויזואלי בלבד.

### שלב ד — פונקציות ולוגיקה

- [X] **ד.1** — מימוש `handleSaveStructureGroup`: בניית payload מ-`structureGroupForm`, קריאה ל-`api.updateGroup`, רענון `groupsByStage`.  
  **הערות:** 2025-02-15.

- [X] **ד.2** — חיבור Name לטופס → `handleGroupNameClick` (פתיחת מודל טרמים "Groups Names").  
  **הערות:** 2025-02-15. בטבלה (לחיצה על שם) + בפרטי קבוצה (כפתור …).

- [X] **ד.3** — בדיקה שטעינת Groups מתבצעת אחרי save/delete (כבר מטופל ב-handleGroupModalSave ו-handleDeleteGroup).  
  **הערות:** 2025-02-15. handleSaveStructureGroup קורא ל-loadGroups; handleGroupModalSave ו-handleDeleteGroup מעדכנים groupsByStage.

---

## 10. Look & Feel — השוואה ל-Stages

| אלמנט | Stages | Groups (מקביל) |
|--------|--------|----------------|
| כותרת | "Stages" | "Groups" |
| תנאי תצוגה | season נבחר | season **ו-stage** נבחרים |
| כפתור SET AS CURRENT | קיים | לא רלוונטי |
| CREATE NEW | קיים | קיים |
| DELETE | DELETE STAGE | DELETE GROUP |
| GENERATE | קיים | לא בשלב ראשון |
| טבלה | Order, Name, Type, Has Table, … | Order, Name, Has Table, Num Of Games, … |
| פרטים נבחרים | Stage Details + Configuration | Group Details + Configuration |
| כפתור Save | Save & Update In Service | זהה |
| דיאלוג Add/Edit | Stage Modal | Group Modal (קיים) |

---

## 11. תיעוד התקדמות פיתוח

### 11.1 סטטוס כללי

| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-15 | מסמך תכנית | יצירת המסמך; יישום לפי שלבים. |
| 2025-02-15 | **הושלם** | שלבים א–ד: State, useEffects, UI, Group Details, handleSaveStructureGroup. |

### 11.2 לוג שינויים

| תאריך | תיאור קצר |
|--------|------------|
| 2025-02-15 | יצירת מסמך תכנית Groups — סקשן Groups בטאב Structure מתחת ל-Stages. |
| 2025-02-15 | יישום מלא: State (selectedStructureGroupNum, structureGroupForm, structureGroupSaving), useEffects לטעינה/איפוס/סנכרון, סקשן Groups (Paper, כפתורים, טבלה), Group Details + Configuration, handleSaveStructureGroup. |

---

*מסמך זה מתייחס לסכמה `backend/data/schemas/groups.schema.json` ולנתונים ב-`backend/data/groups.json`. הרפרנס: מבנה סקשן Stages ומסמך STRUCTURE-TAB-STAGES-UX-PLAN.md.*
