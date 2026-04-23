# סטנדרטים למסכי UI – Merge

מסמך זה מתאר את הסטנדרטים שנקבעו למסכי הרשימה (List) ומסכי הפרטים (Details) בפרויקט.

---

## 1. מסכי Details (עריכת ישות)

### 1.1 מבנה כללי

כל מסך Details (למשל `AthleteDetails`, `SportDetails`, `CountryDetails`) יבנה לפי המבנה הבא:

1. **Breadcrumb** – בראש העמוד
2. **Header** – כפתור "Back to List" + כותרת: `[ישות] – [שם]` (השם לחיץ לעריכת Term)
3. **כרטיס General Details** – תמונה + מטה־דאטה
4. **טאבים** – שאר השדות מחולקים לטאבים

### 1.2 Header

- **כפתור**: "Back to List" – `variant="outlined"`, צבע `#1976d2`, סטייל hover אחיד
- **כותרת**: `[ישות] – [שם]` (למשל "Sport – Soccer", "Country – Germany")
- **שם**: לחיץ (`cursor: pointer`, `textDecoration: underline`) ופותח את מודל עריכת ה-Term (אם קיים `NAME_ID`)

### 1.3 כרטיס General Details (החלק העליון)

#### מספר שדות בשורה (סטנדרט מחייב)

- **באזור השדות (אמצע):** מותר ומקובל להציג **בדיוק 5 שדות בשורה** במסכים בינוניים ומעלה (`md`).
- **טכניקה:** CSS Grid עם `gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }` – במסכים קטנים (`xs`) עמודה אחת, במסכים בינוניים ומעלה **5 עמודות שוות**.
- **אין לשנות** ל־4 או 6 שדות בשורה (סטנדרט אחיד). כפתור Save של General Details מוצג בשורת כותרת הסקשן (ראו להלן "שורת כותרת הסקשן + כפתור Save").

#### דינמיות שלושת האזורים (מדיה | שדות | בוליאנים)

כרטיס General Details בנוי משלוש עמודות (Flexbox). **גודל כל אזור דינמי** לפי התוכן והמקום:

| אזור | תפקיד | דינמיות גודל |
|------|--------|----------------|
| **שמאל (מדיה)** | תמונות, כפתור Upload, Image Version | **רוחב קבוע/מצומצם** – למשל `flex: 0 0 200px` (או `minWidth` קבוע). לא מתרחב; חוסך מקום. |
| **אמצע (שדות)** | כל שדות הטופס (5 בשורה) | **גמיש** – `flex: 1 1 0`, `minWidth: 0`. תופס את שאר המקום האופקי ומתאים את עצמו לכמות השדות. |
| **ימין (בוליאנים)** | צ'קבוקסים | **לפי תוכן** – `flex: 0 0 auto`. רוחב רק לפי הצ'קבוקסים, לא מתרחב מיותר. (כפתור Save של General Details בשורת כותרת הסקשן.) |

- **מטרה:** שהאזור האמצעי והימני **יתאימו את גודלם** לכמות התוכן; השמאלי נשאר קומפקטי.
- **רספונסיביות:** במסכים קטנים (`xs`) כל שלוש העמודות יכולות לעבור ל־`flex: 1 1 100%` – אז הן נעות אחת מתחת לשנייה (מדיה, שדות, בוליאנים).

#### שמאל (עמודת תמונה)

- **כרטיס Paper** עם:
  - **Avatar** (100×100 או קטן יותר לקומפקטיות, למשל 72×72) – תמונת הישות:
    - `src` = שדה תמונה של הישות (למשל `SPORT_IMAGE_URL`, `COUNTRY_IMAGE_URL`, `CLUB_IMAGE_URL` / `NATIONAL_IMAGE_URL`)
    - Fallback: אות ראשונה של השם / אייקון / EMOJI כשאין תמונה או כשהתמונה נכשלת
  - תווית מתחת (למשל "Sport Image", "Country Image")
  - **כפתור "Upload Image"** – פותח דיאלוג לעריכת URL התמונה
  - **כפתור Image Version** (אם קיים) – באותו כרטיס, מתחת ל־Upload

#### אמצע (שדות)

- **שדות רגילים**: **5 בשורה** (CSS Grid: `gridTemplateColumns: repeat(5, 1fr)` ב־md) – ראו "מספר שדות בשורה" למעלה.
- כל תא ברשת: `Box` עם `minWidth: 0` כדי שלא יגדיל את הרשת.

#### דינמיות שדות לרוחב המסך (סטנדרט מחייב)

- **רשת רספונסיבית:** מספר העמודות בשדות חייב להתאים לרוחב המסך – במסכים קטנים פחות עמודות, במסכים גדולים יותר, כדי למלא את המקום ולצמצם "שטח מת" בין שדות.
- **טכניקה:** `gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }` (או ערכים דומים לפי כמות השדות). דוגמה: `VenueDetails.jsx` – שורת שדות קצרים עם 7 עמודות ב־lg, 4 ב־md, 2 ב־sm, 1 ב־xs.
- **פערים:** ניתן להשתמש ב־`gap: { xs: 1.5, md: 1.25 }` כדי לצמצם רווח בין שדות במסכים בינוניים ומעלה.
- **מטרה:** השדות ימלאו את התא שלהם (ללא הגבלת רוחב מיותרת) והפריסה תשתנה בהתאם לרוחב המסך.

#### גובה אחיד לכל השדות (סטנדרט מחייב)

- **כל השדות** (TextField, Select/FormControl) באותו אזור טופס חייבים להיות **באותו גובה** – ללא קשר לסוג השדה.
- **טכניקה:** הוספת `'& .MuiOutlinedInput-root': { minHeight: 40 }` ל־sx של כל שדה (גם TextField וגם FormControl עם Select). גובה 40px מתאים ל־`size="small"` ב־MUI.
- **יישום:** דוגמה – `VenueDetails.jsx`: כל שדות General Details (Country, City, TextField, Select) מקבלים את אותו sx עם `minHeight: 40` על ה־OutlinedInput root.
- **מטרה:** מראה אחיד ושורות ישרות ללא "קפיצות" גובה בין שדות.

#### ימין (בוליאנים)

- **בוליאנים** – **שורה/עמודה נפרדת** (אותה עמודה ימנית), **רק Checkbox (צ'קבוקס סטנדרטי)** – לא Switch/טוגל (ראה סעיף 7).
- אין לערבב בוליאנים ושדות רגילים באותה שורה עם השדות האמצעיים.
- **מרווח בין שורות (סטנדרט מחייב):** באזור הבוליאנים המרווח בין הצ'קבוקסים **קטן** – כדי לא להגדיל את גובה השורה.  
  - **גוף האזור:** `gap: 0.5` (ב־Box של עמודת הבוליאנים).  
  - דוגמה: `frontend/src/pages/AthleteDetails.jsx` – `gap: 0.5` ב־Box של "Right: Booleans". (כפתור Save של General Details מוצג בשורת כותרת הסקשן – ראו "שורת כותרת הסקשן + כפתור Save".)

#### שדות ב-General Details

- **כמו עמודות הרשימה**: אותם שדות שמופיעים בעמודות מסך ה-List (למעט מזהה ו/או שם אם הוחלט להציגם רק בכותרת).
- **ללא**: מזהה הישות (ID) ושם (Name) אם הוחלט שלא להציגם בחלק העליון (כמו ב-SportDetails).
- **ללא NAME_ID / nameId**: שדה ה־NAME_ID (או nameId ב־Languages) **לא מוצג ולא ניתן לעריכה** במסך Details. השם מתנהל דרך מודל ה־Terms – לחיצה על השם בכותרת פותחת את TermEditModal. אין להציג שדה עריכה ל־NAME_ID/nameId בשום מסך Details.

#### שורת כותרת הסקשן (General Details) + כפתור Save – חובה (אחידות לכל המסכים)

- **כפתור "Save & Update In Service"** – מוצג **באותה שורה** כמו שם הסקשן "General Details".
- **מבנה השורה:** `display: flex`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `flexWrap: 'wrap'` – משמאל: כותרת "General Details"; מימין: כפתור Save (צבע ירוק `#15803d`, טקסט "Save & Update In Service"). במסכים צרים הכפתור והכותרת יכולים לעבור שורה (`flexWrap`).
- **עיצוב הכפתור:** `variant="contained"`, `textTransform: 'none'`, רקע `#15803d`, טקסט לבן, `px: 3`, `py: 1`, hover `#166534`.
- **יישום:** דוגמה מלאה – `frontend/src/pages/SportDetails.jsx`: שורת הכותרת של הכרטיס General Details מכילה את ה־Typography "General Details" ואת כפתור Save באותו Box.
- **חל על:** כל מסך Details שיש בו כרטיס General Details. יש ליישם את אותו דפוס כדי לשמור על אחידות.

#### שורת תחתונה של הכרטיס (ללא Save)

- **Image Version Update** – כפתור עם גרסת תמונה (למשל `IMG_VER`) – בתוך כרטיס המדיה (שמאל), לא בשורה נפרדת. כפתור השמירה של General Details נמצא בשורת כותרת הסקשן (ראו למעלה).

#### כפתור Save בתחתית מסכי Details (חלקים שאינם General Details)

**בכל מסך Details**, בחלק התחתון של המסך **שאינו** כרטיס General Details (למשל בתחתית טאבים כמו Table Settings) – כפתור השמירה **חייב להיות זהה** לכפתור "Save & Update In Service" ב-General Details:

- **טקסט הכפתור**: זהה – "Save & Update In Service" (לא רק "Save").
- **צבע רקע**: `#15803d` (ירוק)
- **צבע טקסט**: `white`
- **סטייל**: `variant="contained"`, `textTransform: 'none'`, `px: 4`, `py: 1`
- **Hover**: `backgroundColor: '#166534'`

הסטנדרט חל רק על החלק התחתון של כרטיסים/טאבים שמחוץ ל-General Details.

### 1.4 טאבים

- **Paper** נפרד מתחת לכרטיס General Details
- **Tabs** של MUI – כל טאב = קבוצת שדות (למשל "Table / Points", "Timing", "General", "Flags / Booleans", "Statistics", "Squad", "Trophies", "Colors")
- **תוכן כל טאב**:
  - **שדות רגילים**: 5 בשורה (אותו CSS Grid כמו למעלה) או רשת רספונסיבית לפי כמות השדות (ראו "פריסת טאבים – שדות משמאל, בוליאנים מימין" להלן).
  - **בוליאנים**: שורה/עמודה נפרדת, מוצגים כ־**Checkbox** בלבד (לא Switch/טוגל).
  - **אין ערבוב** של בוליאנים ושדות רגילים באותה שורה עם השדות.

#### פריסת טאבים (Configurations / תוכן טאבים) – שדות משמאל, בוליאנים מימין (חובה)

במסכי Details, **תוכן כל טאב** (למשל Statistics, Squad, Trophies, Colors ב־CompetitorDetails) חייב לעמוד בחוקיות הבאה:

1. **שדות בצד שמאל, בוליאנים בצד ימין** – כמו ב־General Details: אזור שמאלי לשדות (TextField, Select, וכו'), אזור ימני לצ'קבוקסים בלבד. אין לערבב שדות ובוליאנים באותה עמודה.
2. **ניצול דינמי של רוחב המסך** – לנסות תמיד לנצל את כל רוחב המסך בהתאם לגודל המסך ולכמות התוכן. **אסור** ליצור מצב שבו יש 7–8 שורות של בוליאנים בצד אחד ו־2 שדות בלבד בצד השני, כי זה יוצר חללים ריקים גדולים בסקשן.
3. **טכניקה**:
   - **מבנה**: `Box` עם `display: 'flex'`, `flexWrap: 'wrap'`, `gap: 2`, `alignItems: 'stretch'`.
   - **אזור שמאל (שדות)**: `flex: { xs: '1 1 100%', md: '1 1 0' }`, `minWidth: 0`. בתוכו רשת (Grid) רספונסיבית – למשל `gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }` – כדי שהשדות יתפסו כמה שורות/עמודות לפי הרוחב.
   - **אזור ימין (בוליאנים)**: `flex: { xs: '1 1 100%', md: '0 0 auto' }`, `display: 'flex'`, `flexDirection: 'column'`, `gap: 0.5` (מרווח קטן בין צ'קבוקסים).
   - **טאב שיש בו רק שדות** (למשל Colors): אזור שמאל תופס את כל הרוחב (`flex: '1 1 100%'`), רשת רספונסיבית עם מספר עמודות לפי breakpoints (למשל 6 עמודות ב־lg) כדי למלא את הרוחב.
4. **דוגמה**: `CompetitorDetails.jsx` – טאבים Statistics, Squad, Trophies, Colors מיישמים פריסה זו; טאב Squad = שדה "Minimum Athletes in Squad" משמאל, צ'קבוקסים "Show Athletes Salary" ו־"Lineup Insights Enabled" מימין.

### 1.5 דיאלוג עריכת תמונה

- **שדה**: Image URL (TextField `type="url"`)
- **תצוגת מקדימה**: כשמוזן URL, הצגת תצוגה מקדימה של התמונה
- **כפתורים**: Cancel, Save
- **שמירה**: עדכון הישות דרך ה-API עם שדה התמונה הרלוונטי (למשל `SPORT_IMAGE_URL`, `COUNTRY_IMAGE_URL`)

---

## 2. מסכי List (רשימת ישויות)

### 2.0 טעינה אוטומטית כש-URL מכיל פילטרים (סטנדרט מחייב)

במסכי List שלא טוענים נתונים אוטומטית (כלומר, הטבלה ריקה עד שהמשתמש לוחץ Search), **חובה** להוסיף טעינה אוטומטית כאשר ה-URL מכיל query params:

- **מתי:** כשהמשתמש חוזר ממסך פנימי (Details) למסך List שיש בו פילטרים ב-URL (למשל `?country=Spain&sportType=Soccer`).
- **מטרה:** שהמשתמש לא יצטרך ללחוץ שוב על Search – התוצאות יטענו אוטומטית.
- **טכניקה:** ב-`useEffect` של mount, **אחרי** שנתוני dropdown נטענו, לבדוק אם ה-URL מכיל query params ואם כן – לקרוא לפונקציית החיפוש:
  ```jsx
  useEffect(() => {
    loadDropdownData().then(() => {
      if (window.location.search) handleSearch();
    });
  }, []);
  ```
- **חל על:** כל מסך List שמשתמש ב-`useUrlFilters` ולא טוען נתונים אוטומטית ב-mount (למשל AthletesList, CompetitionsList, CompetitorsList, DataSourcesList, GamesList, LanguagesList, TimeZonesList, TvNetworksList, VenuesList).
- **לא חל על:** מסכים שטוענים את כל הנתונים ב-mount (כגון CountriesList, SportsList, FiltersList) – שם הסינון הוא client-side וממילא הנתונים כבר זמינים.

### 2.1 עמודת Name

- **מבנה**: `Box` עם `display: flex`, `alignItems: center`, `gap: 1.5`
- **Avatar** (32×32) משמאל לשם:
  - **src**: שדה תמונה של הישות (למשל `SPORT_IMAGE_URL`, `COUNTRY_IMAGE_URL`, `COMPETITION_IMAGE_URL`, `IMAGE_URL`)
  - **children**: אייקון fallback כשאין תמונה או כשהתמונה נכשלת (למשל `SportsSoccerIcon`, `PublicIcon`, `EmojiEventsIcon`)
  - **רקע**: `#1976d2` כשאין תמונה, `transparent` כשיש תמונה

- **Typography** – שם הישות (לחיץ לניווט ל-Details או לפתיחת עריכת Term)

### 2.2 סטנדרט לכל הרשימות

אותו דפוס חל על: SportsList, CompetitionsList, CompetitorsList, CountriesList, TvNetworksList, VenuesList – Avatar משמאל לשם בעמודת Name, עם תמונה או אייקון fallback.

---

## 3. Backend – שדות תמונה

### 3.1 סכמה (Schema)

- הוספת שדה תמונה לישות (למשל `SPORT_IMAGE_URL`, `COUNTRY_IMAGE_URL`):
  - **type**: `"any"` (או `"string"` אם רוצים להחמיר)
  - **default**: `null`

### 3.2 נתונים (JSON)

- הוספת השדה לכל רשומה רלוונטית (למשל `"SPORT_IMAGE_URL": null`).
- או: השדה נוצר בשמירה הראשונה דרך ה-API אם ה-controller מאפשר עדכון דינמי.

### 3.3 Controller

- ב־bulk update (למשל `updateSportsBulk`, `updateCountriesBulk`): להוסיף את שדה התמונה לרשימת השדות המורשים (`allowedFields` או המקביל), ולוודא שהעדכון מטפל במחרוזת או ב־null.

---

## 4. סיכום שדות תמונה לפי ישות

| ישות      | שדה תמונה (Details + List) | הערות                          |
|-----------|----------------------------|---------------------------------|
| Sport     | `SPORT_IMAGE_URL`          | סכמה + sports.json + backend   |
| Country   | `COUNTRY_IMAGE_URL`        | סכמה + allowedFields + backend |
| Competition| `COMPETITION_IMAGE_URL`    | Avatar ב-List                   |
| Competitor| API image + IMG_VER        | `/api/images/competitor/...`   |
| Venue     | `IMAGE_URL`                | Avatar ב-List                   |
| TvNetwork | `TV_NETWORK_IMAGE_URL` / `IMAGE_URL` / `LOGO_URL` | Avatar ב-List     |

---

## 5. עיצוב וצבעים

- **כפתור ראשי (Back, Save)**: `#1976d2` (כחול)
- **כפתור Save & Update**: `#15803d` (ירוק), hover `#166534`
- **כותרות**: `fontWeight: 700`, צבע טקסט `#000000`
- **קישורים/שם לחיץ**: `#1976d2`, hover `#1565c0`
- **רקע כללי**: `#f5f5f5`
- **כרטיסים**: `backgroundColor: 'white'`, `border: '1px solid #e0e0e0'`, `boxShadow: 1`
- **כותרת סקשן**: רקע `#f5f5f5`, `borderBottom: '2px solid #e0e0e0'`

---

## 6. תוויות שדות ידידותיות (Friendly Field Labels)

- **לא להציג מפתחות טכניים** (כגון `IS_NOT_REAL`, `FATHER_COUNTRY_ID`) ישירות למשתמש.
- **להגדיר מפת תוויות** – אובייקט (למשל `FIELD_LABELS`) שממפה מפתח שדה → תווית קריאה באנגלית (או בשפת הממשק).
- **שימוש עקבי**: בכל מקום שמוצגת תווית שדה – `InputLabel`, `FormControlLabel`, `TextField` label, `Select` label – להשתמש בפונקציה עזר (למשל `getFieldLabel(key)`) שמחזירה `FIELD_LABELS[key] ?? key`.
- דוגמאות: `COUNTRY_CODE` → "Country Code", `IS_NOT_REAL` → "Virtual / Not Real Country", `CURRENCY_SYMBOL` → "Currency", `FATHER_COUNTRY_ID` → "Parent Country".
- חל על: מסכי Details (כל השדות בכרטיס General Details ובטאבים אם קיימים) ומסכי List בשדות טופס (Create/Edit) במידה שרלוונטי.

---

## 7. בוליאנים – צ'קבוקס (Checkbox) בלבד

- **לא להשתמש ב־Switch/טוגל** להצגת שדות בוליאנים.
- **להציג בוליאנים רק כ־Checkbox (צ'קבוקס סטנדרטי)** – רכיב MUI `Checkbox` עם `FormControlLabel`, כמו במסך `AthleteDetails.jsx`.
- חל על: **כל** המסכים בפרויקט – מסכי Details (General Details + תוכן טאבים) ומסכי List (מצב עריכה).
- **תווית**: להשתמש בתווית ידידותית (ראו סעיף 6), למשל `label={getFieldLabel(key)}` או `label={<Typography variant="body2">...</Typography>}`.
- דוגמה (כמו ב־AthleteDetails):  
  `FormControlLabel control={<Checkbox size="small" checked={!!value} onChange={(e) => handleFormChange(key, e.target.checked)} />} label={<Typography variant="body2">...</Typography>} />

---

## 8. שדות צבע – Color Picker

כל שדה שקשור לצבע (למשל `MAIN_COLOR`, `SECONDARY_COLOR`, `HOME_MAIN_COLOR`, `HOME_SECONDARY_COLOR`, `AWAY_MAIN_COLOR`, `AWAY_SECONDARY_COLOR`, `THIRD_COLOR`, `SHOT_CHART_COLOR`) יוצג ויערך **כ־Color Picker** (בורר צבע), כמו ב־`CompetitorDetails.jsx`.

### 8.1 הצגה ועריכה

- **רכיב**: MUI `TextField` עם `type="color"` (מנצל את ה־native HTML color picker).
- **מבנה**: תווית (label) מעל מלבן שמציג את הצבע הנוכחי; לחיצה פותחת את בורר הצבע.
- **ערך בתצוגה**: מחרוזת hex (למשל `#ff0000`, `#000000`). אם ה־backend שומר מספר (int) – להמיר ל־hex בתצוגה ולהמיר חזרה למספר בשמירה.

### 8.2 המרה Backend ↔ UI

- **Backend**: שדות צבע נשמרים בדרך כלל כמספר (int, ערך צבע דוגמת `0xff0000`).
- **ב־UI (formData)**: לאחסן כ־מחרוזת hex (למשל `#FF0000`) לצורך ה־Color Picker.
- **בטעינה**: `numberToHex(num)` – המרת מספר ל־`#RRGGBB` (למשל `#${num.toString(16).padStart(6, '0').toUpperCase()}`).
- **בשמירה**: `hexToNumber(hex)` – המרת מחרוזת hex למספר (למשל `parseInt(hex.replace('#', ''), 16)`).

### 8.3 עיצוב

- **TextField**: `fullWidth`, `size="small"`, `type="color"`, `InputLabelProps={{ shrink: true }}`.
- **ערך ברירת מחדל** כשאין צבע: למשל `#000000` או `#ffffff` לפי ההקשר.
- **סטייל** (אופציונלי): גובה נוח לשדה, למשל `'& .MuiOutlinedInput-input': { py: 1, height: '40px' }`.

### 8.4 פריסה

- שדות צבע יכולים להופיע בטאב ייעודי "Colors" או בתוך טאב כללי.
- פריסה ב־Grid: למשל 3 או 5 שדות בשורה (`Grid item xs={12} md={4}` או CSS Grid חמש עמודות), בהתאם לסטנדרט 5 בשורה או לפי רוחב הטאב.

### 8.5 דוגמה (CompetitorDetails)

```jsx
<TextField
  fullWidth
  size="small"
  type="color"
  label="Home Main"
  value={formData.HOME_MAIN_COLOR || '#000000'}
  onChange={(e) => handleFormChange('HOME_MAIN_COLOR', e.target.value)}
  InputLabelProps={{ shrink: true }}
  sx={{ '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
/>
```

---

*מסמך זה מתאר את הסטנדרטים כפי שיושמו במסכי SportDetails, SportsList, CountryDetails, CountriesList, CompetitorDetails ובמסכי List הנוספים.*
