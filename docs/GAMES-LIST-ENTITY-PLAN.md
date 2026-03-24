# תכנית פיתוח: מסך Games List

מסמך זה מתאר את תכנית העבודה המפורטת לפיתוח מסך **Games List** – מסך ישות (Entity) חדש שמציג רשימת משחקים לפי פילטרים, כולל כפתור ליצירת משחק חדש בדיאלוג.

**הגבלה:** כרגע **לא** מפתחים מסך Details – רק מסך List.

**מסמכים קשורים:**
- [ADD_NEW_ENTITY.md](./ADD_NEW_ENTITY.md) — תבנית הוספת ישות חדשה
- [UI-STANDARDS.md](./UI-STANDARDS.md) — סטנדרטים למסכי List

---

## 1. רקע ומטרה

### 1.1 הקשר
- **מיקום בתפריט:** תחת קטגוריית **Games** בתפריט השמאלי (Sidebar).
- **מקור נתונים:** `backend/data/games.json`
- **סכמת יצירה:** `backend/data/schemas/games.schema.json`

### 1.2 דרישות עיקריות
- מסך **List** בלבד (ללא מסך Details בשלב זה).
- הצגת משחקים לפי פילטרים (כמתואר בתמונה והמפורט להלן).
- כפתור **Create** – פתיחת דיאלוג ליצירת משחק חדש עם **שדות חובה בלבד**.
- מיקום בתפריט תחת Games.

---

## 2. מוסכמות שמות

| פריט | ערך |
|------|-----|
| **שדה מזהה ב-JSON** | `GAME_ID` |
| **קובץ נתונים** | `backend/data/games.json` |
| **קובץ סכמה** | `backend/data/schemas/games.schema.json` |
| **Controller** | `gameController.js` |
| **Routes** | `games.js` |
| **Base path API** | `/api/games` |
| **Frontend path** | `/games` |
| **דף Frontend** | `GamesList.jsx` |
| **שם בתפריט** | Games List (תחת קטגוריית Games) |

---

## 3. מבנה נתונים (games.json)

משחק לדוגמה:

```json
{
  "GAME_ID": 1001,
  "COMPETITION_ID": 2,
  "SEASON_NUM": 4,
  "STAGE_NUM": 1,
  "STARTTIME": "2026-02-20T19:00:00.000Z",
  "STATUS": 2,
  "GAMETIME": 90,
  "HOME_COMPETITOR_NUM": 1,
  "SPORTTYPE_ID": 1,
  "VENUE_ID": 1,
  "ROUND_NUM": 1,
  "GAME_KEY": "101-102"
}
```

**שדות רלוונטיים להצגה ולפילטרים:**
- `GAME_ID` — מזהה ייחודי
- `COMPETITION_ID` — קישור לליגה/תחרות
- `SEASON_NUM`, `STAGE_NUM`, `ROUND_NUM`
- `STARTTIME` — מועד התחלה
- `STATUS` — סטטוס משחק (להצגה: Scheduled, Ended, 1st Half וכו' – מ־`game_statuses.json` או מיפוי)
- `GAMETIME` — משך משחק (דקות) או זמן נוכחי
- `HOME_COMPETITOR_NUM` — מתחרה ביתי
- `SPORTTYPE_ID` — סוג ספורט
- `VENUE_ID` — אולם/אצטדיון
- `GAME_KEY` — מפתח (למשל "101-102" = שני מתחרים)
- `IS_DELETED` — soft delete (לפי סכמה)

---

## 4. סכמת יצירה (games.schema.json)

הסכמה ממוקמת ב־`backend/data/schemas/games.schema.json`.

**שדות חובה ליצירת משחק חדש (Create dialog):**

לפי הסכמה והמבנה הקיים ב־games.json, שדות ליבה שיש להציג בדיאלוג Create:

| שדה | טיפוס | ברירת מחדל | הערה |
|-----|-------|------------|------|
| `COMPETITION_ID` | int | 0 | חובה |
| `SEASON_NUM` | int | 0 | חובה |
| `STAGE_NUM` | int | 0 | חובה |
| `STARTTIME` | string (ISO) | 0001-01-01... | חובה |
| `VENUE_ID` | int | 0 | חובה |
| `ROUND_NUM` | int | 0 | חובה |
| `GAME_KEY` | string | "" | חובה – מזהה משחק (למשל "101-102") |
| `HOME_COMPETITOR_NUM` | int | 0 | חובה |
| `SPORTTYPE_ID` | int | 1 | חובה (ברירת מחדל 1) |
| `GAMETIME` | int | 90 | אופציונלי – ברירת מחדל 90 |
| `STATUS` | any | null | אופציונלי – ניתן להגדיר ברירת מחדל (למשל "Scheduled") |

**הערה:** יש לאמת מול צוות/מוצר אילו שדות נחשבים לחובה בפועל. הדיאלוג יכלול רק את השדות האלה (או תת-קבוצה שלהם) ללא שדות אופציונליים.

---

## 5. פילטרים (לפי תמונה)

| פילטר | סוג | מקור נתונים | הערה |
|-------|-----|-------------|------|
| **Countries** | Dropdown | `countries.json` | סינון לפי מדינה (דרך Competition) |
| **Sport** | Dropdown | `sports.json` | למשל Football |
| **Leagues** | Dropdown | `competitions.json` | סינון לפי תחרות/ליגה |
| **Teams** | Dropdown | `competitors.json` | סינון לפי מתחרים |
| **Game ID** | Dropdown + TextField | — | סוג מזהה (למשל GAME_ID) + ערך |
| **SEARCH_PARTNER_ID** | TextField | — | כפתור X למחיקת ערך |
| **Between / And** | DatePicker | — | טווח תאריכים (לפי `STARTTIME`) |
| **Hide Deleted** | Checkbox | — | הסתרת משחקים עם `IS_DELETED: true` |

**כפתורי פעולה:**
- **Search** — הפעלת הפילטרים
- **Create** — פתיחת דיאלוג יצירת משחק חדש

---

## 6. טבלת משחקים (Data Grid)

### 6.1 Group by
שורת הוראה: "Drag a column header here and drop it to group by that column" – כמו במסכי ישות אחרים.

### 6.2 עמודות

| עמודה | תוכן | הערה |
|-------|------|------|
| Checkbox | בחירת שורות | |
| **ID** | GAME_ID | לחיץ (בשלב זה ללא ניווט ל־Details – ניתן להשאיר כ־link עתידי) |
| 🕐 | תאריך ושעה | `STARTTIME` מפורמט |
| **Competition** | שם התחרות/ליגה | Enrichment מ־competitions + terms |
| 🌐 | דגל מדינה | Enrichment: Country דרך Competition |
| **Competitor1** | שם + לוגו מתחרה 1 | Enrichment מ־competitors/group_participants |
| **Competitor2** | שם + לוגו מתחרה 2 | Enrichment מ־competitors/group_participants |
| **Status** | סטטוס (Scheduled, Ended, 1st Half...) | מיפוי מ־`STATUS` + `game_statuses.json` / `game_status_defaults.json` |
| 📊 | ערך מספרי | GAMETIME או ציון – לפי סטטוס |

### 6.3 פונקציונליות טבלה
- מיון לפי עמודה (חצים)
- Group by (גרירה לעמודת כותרת)
- פילטר בעמודה (TextField ב־header)
- פאגינציה (Items per page, טווח, קדימה/אחורה)
- Checkbox לבחירה (אם יתווספו פעולות bulk בעתיד)

---

## 7. Backend

### 7.1 נתונים (JSON)
- **קיים:** `backend/data/games.json`
- **וידוא:** שכל רשומה כוללת `GAME_ID`, `IS_DELETED` (אם רלוונטי), ושדות ליבה.

### 7.2 Controller
קובץ: `backend/controllers/gameController.js`

| מתודה | תיאור |
|-------|--------|
| **getAll(req, res)** | טוען `games.json`, מסנן לפי query params (countryId, sportId, competitionId, teamId, gameId, searchPartnerId, dateFrom, dateTo, hideDeleted). מחזיר `{ success: true, data: array }`. |
| **getById(req, res)** | `GET /:id` – מחפש לפי GAME_ID. 404 אם לא נמצא. |
| **create(req, res)** | ולידציה לשדות חובה, חישוב GAME_ID חדש (max+1), הוספה למערך, `saveData`. מחזיר 201 + `{ success: true, data: newItem }`. |

**הערה:** בשלב זה **לא** נדרשים `updateBulk`, `delete` – המסך הוא List + Create בלבד. ניתן להוסיף בהמשך.

### 7.3 Routes
קובץ: `backend/routes/games.js`

- `GET /` → getAll (עם query params לפילטרים)
- `POST /` → create
- `GET /:id` → getById (אופציונלי – לצורך enrichment או פרטים עתידיים)

### 7.4 רישום ב־server.js
- `const gamesRoutes = require('./routes/games');`
- `app.use('/api/games', gamesRoutes);`

### 7.5 Enrichment
כדי להציג Competition name, Country, Competitor1, Competitor2 – צריך:
- טעינת `competitions.json`, `countries.json`, `competitors.json`, `terms.json`
- מיפוי ב־Controller או ב־Frontend (טעינת data מ־`/api/data` כפי שקיים ב־data.js)
- מיפוי STATUS → שם קריא (game_statuses.json / game_status_defaults.json)

---

## 8. Frontend

### 8.1 API (frontend/src/services/api.js)

| מתודה | תיאור |
|-------|--------|
| `getGamesList(filters)` | `GET /api/games?...` עם query params (countryId, sportId, competitionId, teamId, gameId, searchPartnerId, dateFrom, dateTo, hideDeleted) |
| `getGameById(id)` | `GET /api/games/:id` (אופציונלי) |
| `createGame(payload)` | `POST /api/games` – body: אובייקט משחק עם שדות חובה |

### 8.2 ניווט ותפריט (App.jsx)

1. **Import:**
   ```jsx
   import GamesList from './pages/GamesList';
   ```

2. **תפריט (Games):**
   - כרגע: `{ label: 'Games', icon: <SportsEsportsIcon /> }` – ללא path.
   - **עדכון:** להוסיף `subItems` תחת Games עם:
     ```jsx
     { label: 'Games', icon: <SportsEsportsIcon />, subItems: [
       { label: 'Games List', path: '/games', icon: <SportsEsportsIcon /> }
     ]}
     ```
   - או אם Games הוא פריט בודד: `{ label: 'Games', path: '/games', icon: <SportsEsportsIcon /> }`

3. **Route:**
   ```jsx
   <Route path="games" element={<GamesList />} />
   ```

### 8.3 דף GamesList.jsx

- **Breadcrumb:** `Games` → `Games List`.
- **כותרת:** "Games" + כפתור **Create** (צבע #1976d2).
- **פילטרים:** שורת שדות כמפורט בסעיף 5 (Countries, Sport, Leagues, Teams, Game ID, SEARCH_PARTNER_ID, תאריכים, Hide Deleted) + Search + Create.
- **טבלה:** כמפורט בסעיף 6.
- **Create dialog:** טופס עם שדות חובה בלבד (לפי סעיף 4). שמירה → `api.createGame(payload)`.
- **עיצוב:** בהתאם ל־[UI-STANDARDS.md](./UI-STANDARDS.md).

---

## 9. Create Dialog – שדות חובה

הדיאלוג יכלול רק את השדות המחייבים ליצירת משחק:

1. **COMPETITION_ID** — Select מ־competitions
2. **SEASON_NUM** — Number
3. **STAGE_NUM** — Number
4. **STARTTIME** — DateTimePicker
5. **VENUE_ID** — Select מ־venues
6. **ROUND_NUM** — Number
7. **GAME_KEY** — TextField (למשל "101-102")
8. **HOME_COMPETITOR_NUM** — Number
9. **SPORTTYPE_ID** — Select מ־sports (ברירת מחדל 1)
10. **GAMETIME** — Number (ברירת מחדל 90, אופציונלי)
11. **STATUS** — Select מ־game_statuses או ערך ברירת מחדל (אופציונלי)

**ברירות מחדל:** שאר השדות מהסכמה ייושמו בצד שרת (Controller) בהתאם ל־games.schema.json.

---

## 10. Checklist – Games List

### Backend
- [ ] **Controller:** `gameController.js` — getAll (עם פילטרים), create, (getById אופציונלי)
- [ ] **Routes:** `games.js` — GET /, POST /
- [ ] **server.js:** require + app.use('/api/games', ...)
- [ ] **Enrichment:** לוגיקת מילוי Competition name, Country, Competitor names, Status name (ב־getAll או ב־Frontend)

### Frontend
- [ ] **api.js:** getGamesList(filters), createGame(payload)
- [ ] **App.jsx:** import GamesList, פריט תפריט Games (עם path /games או subItem Games List), Route
- [ ] **GamesList.jsx:**
  - [ ] Breadcrumb
  - [ ] כותרת + כפתור Create
  - [ ] פילטרים (Countries, Sport, Leagues, Teams, Game ID, SEARCH_PARTNER_ID, תאריכים, Hide Deleted) + Search
  - [ ] טבלה (עמודות: Checkbox, ID, תאריך, Competition, מדינה, Competitor1, Competitor2, Status, ערך)
  - [ ] Group by, מיון, פאגינציה
  - [ ] Create dialog (שדות חובה בלבד)
  - [ ] עיצוב לפי UI-STANDARDS

### אימות
- [ ] מסך Games List נגיש מהתפריט תחת Games
- [ ] פילטרים עובדים כראוי
- [ ] יצירת משחק חדש בדיאלוג מצליחה ומרעננת את הרשימה

---

סיום: אחרי ביצוע כל השלבים, מסך Games List יהיה זמין מהתפריט תחת Games, יציג משחקים לפי פילטרים, ויאפשר יצירת משחק חדש בדיאלוג עם שדות חובה בלבד.
