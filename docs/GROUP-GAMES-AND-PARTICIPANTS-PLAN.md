# תכנית פיתוח: Group Games ו־Group Participants

מסמך זה מתאר את תכנית העבודה המלאה לפיתוח **Group Games** ו־**Group Participants** בתוך סקשן Groups בטאב STRUCTURE — כולל יצירה אוטומטית, Backend, Frontend ותיעוד התקדמות.

**מסמכים קשורים:**
- [STRUCTURE-TAB-GROUPS-UX-PLAN.md](./STRUCTURE-TAB-GROUPS-UX-PLAN.md) — סקשן Groups הקיים
- [ADD_NEW_ENTITY.md](./ADD_NEW_ENTITY.md) — הוספת ישויות חדשות

---

## 1. רקע ומטרה

### 1.1 הקשר
- **מיקום:** בתוך **Group Details** (כשנבחרת קבוצה) בסקשן Groups בטאב STRUCTURE.
- **היררכיה:** Competition → Season → Stage → **Group** → **Group Games** / **Group Participants**
- **מטרה:** לאפשר ניהול משחקים ומשתתפים לכל קבוצה, עם יצירה אוטומטית של משחקים בקבוצות חדשות (תלוי בסוג השלב).

### 1.2 דרישות עיקריות
- **Group Games:** טבלת משחקים עם אפשרות להוסיף (+), למחוק (Delete) ולשמור (Save) לכל שורה.
- **Group Participants:** טבלת משתתפים עם אותה לוגיקה.
- **יצירה אוטומטית:** בעת יצירת קבוצה — אם התנאים מתקיימים, יווצרו אוטומטית משחקים לפי `stages.NUM_OF_GAMES`.

---

## 2. לוגיקת יצירה אוטומטית של Group Games

משחקים יווצרו אוטומטית **רק** כאשר מתקיימים **שני** התנאים הבאים:

| תנאי | פירוט |
|------|--------|
| **א. STAGE_TYPE** | השלב חייב להיות אחד מהסוגים: **KnockOut (3)**, **Qualification (4)**, **RelegationOrPromotion (5)**. |
| **ב. NUM_OF_GAMES** | `stages.NUM_OF_GAMES` חייב להיות **גדול מ־0**. |

**לא יווצרו משחקים כאשר:**
- `STAGE_TYPE` = LeagueCycle (1) או GroupStage (2)
- `stages.NUM_OF_GAMES` לא מוגדר, null, או 0

**מיפוי STAGE_TYPE:**
| STAGE_TYPE_ID | STAGE_TYPE |
|---------------|------------|
| 1 | LeagueCycle |
| 2 | GroupStage |
| 3 | KnockOut |
| 4 | Qualification |
| 5 | RelegationOrPromotion |

**מקור מספר המשחקים:** `stages.NUM_OF_GAMES` (לא מ־groups).

---

## 3. סכמות נתונים

### 3.1 Group Games
**קובץ סכמה:** `backend/data/schemas/group_games.schema.json`

| שדה | טיפוס | ברירת מחדל |
|-----|-------|------------|
| COMPETITION_ID | int | 0 |
| SEASON_NUM | int | 0 |
| STAGE_NUM | int | 0 |
| GROUP_NUM | int | 0 |
| COMPETITOR_NUM | int | 0 |
| PARTICIPANT_NUM | int | 0 |
| NAME_ID | int | 0 |
| USE_NAME | bool | false |
| ORIGIN_GROUP_NUM | any | null |
| ORIGIN_GROUP_POSITION | any | null |
| ORIGIN_STAGE_NUM | any | null |

**מפתח לוגי:** COMPETITION_ID + SEASON_NUM + STAGE_NUM + GROUP_NUM + מזהה יחיד למשחק (להגדיר — למשל GAME_NUM או index).

### 3.2 Group Participants
**קובץ סכמה:** `backend/data/schemas/group_participants.schema.json`

| שדה | טיפוס | ברירת מחדל |
|-----|-------|------------|
| COMPETITION_ID | int | 0 |
| SEASON_NUM | int | 0 |
| STAGE_NUM | int | 0 |
| GROUP_NUM | int | 0 |
| COMPETITOR_NUM | int | 0 |
| PARTICIPANT_NUM | int | 0 |
| NAME_ID | int | 0 |
| USE_NAME | bool | false |
| ORIGIN_GROUP_NUM | any | null |
| ORIGIN_GROUP_POSITION | any | null |
| ORIGIN_STAGE_NUM | any | null |

**מפתח לוגי:** COMPETITION_ID + SEASON_NUM + STAGE_NUM + GROUP_NUM + COMPETITOR_NUM (או PARTICIPANT_NUM).

---

## 4. תכנית UI — Group Details (הרחבה)

באזור **Group Details** (מתחת לטבלת הקבוצות) — שני תת־סקשנים side-by-side:

### 4.1 Group Games (שמאל)
| רכיב | תיאור |
|------|--------|
| כותרת | "Group Games" |
| כפתור "+" | הוספת משחק חדש |
| טבלה | עמודות לפי הסכמה (שם, Use Name, וכו') + עמודות Delete, Save לכל שורה |
| Delete | אייקון/כפתור מחיקה בכל שורה (עם confirm) |
| Save | אייקון/כפתור שמירה לכל שורה |

### 4.2 Participants (ימין)
| רכיב | תיאור |
|------|--------|
| כותרת | "Participants" |
| כפתור "+" | הוספת משתתף חדש |
| טבלה | עמודות לפי הסכמה + Delete, Save לכל שורה |
| Delete | אייקון/כפתור מחיקה בכל שורה |
| Save | אייקון/כפתור שמירה לכל שורה |

**Look & Feel:** התאמה לסגנון הקיים (Stages, Groups) — Paper, Table, IconButton.

---

## 5. Backend — רשימת משימות

### 5.1 קבצי נתונים
- [ ] **ב.1** — יצירת `backend/data/group_games.json` (מערך ריק `[]`).
- [ ] **ב.2** — יצירת `backend/data/group_participants.json` (מערך ריק `[]`).

### 5.2 Routes — Group Games
- [ ] **ב.3** — `GET /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games` — רשימת משחקים בקבוצה (מועשרת בשמות מטרמים אם רלוונטי).
- [ ] **ב.4** — `POST /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games` — הוספת משחק.
- [ ] **ב.5** — `PUT /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games/:gameId` — עדכון משחק (gameId = GAME_NUM או מזהה אחר).
- [ ] **ב.6** — `DELETE /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games/:gameId` — מחיקת משחק.

### 5.3 Routes — Group Participants
- [ ] **ב.7** — `GET /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants` — רשימת משתתפים (מועשרת — שם competitor, וכו').
- [ ] **ב.8** — `POST /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants` — הוספת משתתף.
- [ ] **ב.9** — `PUT /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants/:participantId` — עדכון משתתף.
- [ ] **ב.10** — `DELETE /competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants/:participantId` — מחיקת משתתף.

### 5.4 לוגיקת יצירת Group — שילוב Group Games
- [ ] **ב.11** — בעת `POST .../groups` (יצירת קבוצה):
  1. לטעון את השלב (stages.json) לפי COMPETITION_ID, SEASON_NUM, STAGE_NUM.
  2. לבדוק: `stage.STAGE_TYPE` in [3, 4, 5] **ו־** `(stage.NUM_OF_GAMES ?? 0) > 0`.
  3. אם כן — ליצור `NUM_OF_GAMES` רשומות ב־`group_games.json` עבור הקבוצה החדשה (עם ברירות מחדל מהסכמה).
- [ ] **ב.12** — בעת `DELETE .../groups/:groupNum` — למחוק גם את כל ה־group_games ו־group_participants של הקבוצה.

### 5.5 סכמה וזהות
- [ ] **ב.13** — להגדיר מזהה יחיד למשחק (GAME_NUM או שדה אחר) — אם הסכמה הנוכחית לא כוללת, להוסיף ל־group_games.schema.json ולהשתמש בו.

---

## 6. Frontend — רשימת משימות

### 6.1 API (api.js)
- [ ] **פ.1** — `getGroupGames(competitionId, seasonNum, stageNum, groupNum)` — GET games.
- [ ] **פ.2** — `createGroupGame(competitionId, seasonNum, stageNum, groupNum, data)` — POST game.
- [ ] **פ.3** — `updateGroupGame(competitionId, seasonNum, stageNum, groupNum, gameId, data)` — PUT game.
- [ ] **פ.4** — `deleteGroupGame(competitionId, seasonNum, stageNum, groupNum, gameId)` — DELETE game.
- [ ] **פ.5** — `getGroupParticipants(competitionId, seasonNum, stageNum, groupNum)` — GET participants.
- [ ] **פ.6** — `createGroupParticipant(competitionId, seasonNum, stageNum, groupNum, data)` — POST participant.
- [ ] **פ.7** — `updateGroupParticipant(competitionId, seasonNum, stageNum, groupNum, participantId, data)` — PUT participant.
- [ ] **פ.8** — `deleteGroupParticipant(competitionId, seasonNum, stageNum, groupNum, participantId)` — DELETE participant.

### 6.2 UI — Group Details (StructureTab / CompetitionDetails)
- [ ] **פ.9** — הוספת שני Paper side-by-side: "Group Games" ו־"Participants".
- [ ] **פ.10** — טבלת Group Games: כותרת, כפתור "+", עמודות לפי הסכמה, Delete/Save לכל שורה.
- [ ] **פ.11** — טבלת Participants: כותרת, כפתור "+", עמודות לפי הסכמה, Delete/Save לכל שורה.
- [ ] **פ.12** — חיבור לטעינה: כשנבחרת קבוצה — קריאה ל־getGroupGames ו־getGroupParticipants.
- [ ] **פ.13** — דיאלוג/Inline להוספת משחק חדש (כפתור "+").
- [ ] **פ.14** — דיאלוג/Inline להוספת משתתף (כפתור "+").
- [ ] **פ.15** — אישור מחיקה (confirm dialog) לפני Delete.
- [ ] **פ.16** — שמירה — Save לכל שורה → קריאה ל־updateGroupGame / updateGroupParticipant.

### 6.3 תנאי תצוגה
- [ ] **פ.17** — סקשנים Group Games ו־Participants מוצגים רק כאשר `structureGroupForm != null` (קבוצה נבחרת).

---

## 7. תיעוד התקדמות

### 7.1 סטטוס כללי
| תאריך | סטטוס | הערות |
|--------|--------|--------|
| 2025-02-16 | תכנית | יצירת מסמך תכנית עבודה מלאה |
| 2025-02-16 | **הושלם** | Backend + Frontend — כל הפריטים יושמו |

### 7.2 לוג שינויים
| תאריך | תיאור |
|--------|--------|
| 2025-02-16 | יצירת מסמך GROUP-GAMES-AND-PARTICIPANTS-PLAN.md — תכנית מלאה: יצירה אוטומטית (STAGE_TYPE 3,4,5 + stages.NUM_OF_GAMES), Backend routes, Frontend UI, תיעוד התקדמות. |
| 2025-02-16 | יישום Backend: group_games.json, group_participants.json, GAME_NUM בסכמה, Routes מלאים (GET/POST/PUT/DELETE), לוגיקת יצירה אוטומטית ב־createGroup, מחיקת games+participants ב־deleteGroup. |
| 2025-02-16 | יישום Frontend: API methods (getGroupGames, createGroupGame, updateGroupGame, deleteGroupGame, getGroupParticipants, createGroupParticipant, updateGroupParticipant, deleteGroupParticipant), טבלאות Group Games ו־Participants ב־AccordionDetails, כפתורי +/Delete/Save, טעינה ו-handlers. |

### 7.3 Checklist ביצוע
לסמן [X] בעת השלמת כל פריט.

**Backend:**
- [X] ב.1 – group_games.json
- [X] ב.2 – group_participants.json
- [X] ב.3 – GET games
- [X] ב.4 – POST game
- [X] ב.5 – PUT game
- [X] ב.6 – DELETE game
- [X] ב.7 – GET participants
- [X] ב.8 – POST participant
- [X] ב.9 – PUT participant
- [X] ב.10 – DELETE participant
- [X] ב.11 – לוגיקת יצירה אוטומטית ב־createGroup
- [X] ב.12 – מחיקת games+participants ב־deleteGroup
- [X] ב.13 – הגדרת מזהה משחק (GAME_NUM)

**Frontend:**
- [X] פ.1 – getGroupGames
- [X] פ.2 – createGroupGame
- [X] פ.3 – updateGroupGame
- [X] פ.4 – deleteGroupGame
- [X] פ.5 – getGroupParticipants
- [X] פ.6 – createGroupParticipant
- [X] פ.7 – updateGroupParticipant
- [X] פ.8 – deleteGroupParticipant
- [X] פ.9 – Papers Group Games + Participants
- [X] פ.10 – טבלת Group Games
- [X] פ.11 – טבלת Participants
- [X] פ.12 – חיבור טעינה
- [X] פ.13 – הוספת משחק (+)
- [X] פ.14 – הוספת משתתף (+)
- [X] פ.15 – confirm מחיקה
- [X] פ.16 – שמירה per row
- [X] פ.17 – תנאי תצוגה

---

*מסמך זה מתייחס לסכמות `group_games.schema.json` ו־`group_participants.schema.json` ולנתונים ב־`group_games.json`, `group_participants.json` (ליצירה).*
