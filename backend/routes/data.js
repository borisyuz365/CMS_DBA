const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const dataLoader = require('../utils/dataLoader');

const COMPETITIONS_SCHEMA_PATH = path.join(__dirname, '../data/schemas/competitions.schema.json');
const SEASON_COMPETITORS_SCHEMA_PATH = path.join(__dirname, '../data/schemas/season_competitors.schema.json');
const STAGE_COMPETITORS_SCHEMA_PATH = path.join(__dirname, '../data/schemas/stage_competitors.schema.json');
const GROUP_GAMES_SCHEMA_PATH = path.join(__dirname, '../data/schemas/group_games.schema.json');
const GROUP_PARTICIPANTS_SCHEMA_PATH = path.join(__dirname, '../data/schemas/group_participants.schema.json');
const STAGE_TABLE_SCHEMA_PATH = path.join(__dirname, '../data/schemas/stage_table.schema.json');

/**
 * Load competition schema and return an object with all keys set to schema defaults.
 * Used when creating a new competition so all parameters come from the schema.
 */
async function getCompetitionDefaultsFromSchema() {
  const raw = await fs.readFile(COMPETITIONS_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Load season_competitors schema and return an object with all keys set to schema defaults.
 * Used when adding a competitor to a season.
 */
async function getSeasonCompetitorDefaultsFromSchema() {
  const raw = await fs.readFile(SEASON_COMPETITORS_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Load stage_competitors schema and return an object with all keys set to schema defaults.
 * Used when adding a competitor to a group.
 */
async function getStageCompetitorDefaultsFromSchema() {
  const raw = await fs.readFile(STAGE_COMPETITORS_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Load group_games schema and return an object with all keys set to schema defaults.
 */
async function getGroupGameDefaultsFromSchema() {
  const raw = await fs.readFile(GROUP_GAMES_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Load group_participants schema and return an object with all keys set to schema defaults.
 */
async function getGroupParticipantDefaultsFromSchema() {
  const raw = await fs.readFile(GROUP_PARTICIPANTS_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Load stage_table schema and return an object with all keys set to schema defaults.
 */
async function getStageTableDefaultsFromSchema() {
  const raw = await fs.readFile(STAGE_TABLE_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

/**
 * Ensure stage table (standings) exists for a stage with HAS_TABLE.
 * Creates rows from stage_competitors; GROUP_NUM from competitor if stage has groups, else -1.
 * Fallback: when no stage_competitors and stage has no groups, use season_competitors.
 */
async function ensureStageTableForStage(cid, seasonNum, stageNum) {
  const [stageTables, stageCompetitors, groups, seasonCompetitors] = await Promise.all([
    dataLoader.loadData('stage_tables.json').catch(() => []),
    dataLoader.loadData('stage_competitors.json').catch(() => []),
    dataLoader.loadData('groups.json').catch(() => []),
    dataLoader.loadData('season_competitors.json').catch(() => [])
  ]);
  const exists = stageTables.some(
    r => Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum
  );
  if (exists) return;
  const stageHasGroups = groups.some(
    g => Number(g.COMPETITION_ID) === cid && Number(g.SEASON_NUM) === seasonNum && Number(g.STAGE_NUM) === stageNum
  );
  let competitorsInStage = stageCompetitors.filter(
    sc => Number(sc.COMPETITION_ID) === cid && Number(sc.SEASON_NUM) === seasonNum && Number(sc.STAGE_NUM) === stageNum
  );
  if (competitorsInStage.length === 0 && !stageHasGroups) {
    competitorsInStage = seasonCompetitors
      .filter(sc => Number(sc.COMPETITION_ID) === cid && Number(sc.SEASON_NUM) === seasonNum && !sc.NOT_IN_SEASON)
      .map(sc => ({ COMPETITOR_NUM: sc.COMPETITOR_ID, GROUP_NUM: -1 }));
  }
  const defaults = await getStageTableDefaultsFromSchema();
  const newRows = competitorsInStage.map((sc, i) => {
    const row = { ...defaults };
    row.COMPETITION_ID = cid;
    row.SEASON_NUM = seasonNum;
    row.STAGE_NUM = stageNum;
    row.COMPETITOR_NUM = sc.COMPETITOR_NUM;
    row.GROUP_NUM = stageHasGroups ? (sc.GROUP_NUM != null ? Number(sc.GROUP_NUM) : -1) : -1;
    row.POSITION = i + 1;
    return row;
  });
  await dataLoader.saveData('stage_tables.json', [...(Array.isArray(stageTables) ? stageTables : []), ...newRows]);
}

/**
 * Resolve term name by ID with fallback logic
 */
function resolveTermName(term) {
  if (!term) return null;
  if (term.engValue) return term.engValue;
  if (term.values && Array.isArray(term.values)) {
    const englishValue = term.values.find(v => v.languageId === 1);
    if (englishValue && englishValue.value) return englishValue.value;
    const defaultValue = term.values.find(v => v.isDefault === true);
    if (defaultValue && defaultValue.value) return defaultValue.value;
    const approvedValue = term.values.find(v => v.status === 'Approved');
    if (approvedValue && approvedValue.value) return approvedValue.value;
    if (term.values.length > 0 && term.values[0].value) return term.values[0].value;
  }
  return null;
}

// Get all countries
router.get('/countries', async (req, res, next) => {
  try {
    const countries = await dataLoader.loadData('countries.json');
    res.json({ success: true, data: countries });
  } catch (error) {
    next(error);
  }
});

// Get all competitors (teams/clubs) with enrichment
router.get('/competitors', async (req, res, next) => {
  try {
    const [competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);

    const enrichedCompetitors = competitors.map(competitor => {
      const enriched = { ...competitor };
      
      // Resolve name from terms
      if (competitor.NAME_ID) {
        const nameTerm = terms.find(t => t.id === competitor.NAME_ID);
        enriched.name = resolveTermName(nameTerm) || `Competitor ${competitor.COMPETITOR_ID}`;
      } else {
        enriched.name = `Competitor ${competitor.COMPETITOR_ID}`;
      }
      
      // Resolve country
      if (competitor.COUNTRY_ID) {
        const country = countries.find(c => c.COUNTRY_ID === competitor.COUNTRY_ID);
        enriched.countryName = country ? country.name : null;
      }
      
      return enriched;
    });

    res.json({ success: true, data: enrichedCompetitors });
  } catch (error) {
    next(error);
  }
});

// Get all competitions (leagues) with enrichment
router.get('/competitions', async (req, res, next) => {
  try {
    const showDeleted = String(req.query.showDeleted || '').toLowerCase() === 'true';
    const [competitions, terms, countries, sports] = await Promise.all([
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('sports.json')
    ]);
    let list = competitions || [];
    if (!showDeleted) {
      list = list.filter(c => !c.IS_DELETED);
    }

    const enrichedCompetitions = list.map(competition => {
      const enriched = { ...competition };
      
      // Resolve name from terms
      if (competition.NAME_ID) {
        const nameTerm = terms.find(t => t.id === competition.NAME_ID);
        enriched.name = resolveTermName(nameTerm) || `Competition ${competition.COMPETITION_ID}`;
      } else {
        enriched.name = `Competition ${competition.COMPETITION_ID}`;
      }
      
      // Resolve country
      if (competition.COUNTRY_ID) {
        const country = countries.find(c => c.COUNTRY_ID === competition.COUNTRY_ID);
        enriched.countryName = country ? country.name : null;
      }
      
      // Resolve sport
      if (competition.SPORT_TYPE_ID) {
        const sport = sports.find(s => s.SPORT_TYPE_ID === competition.SPORT_TYPE_ID);
        enriched.sport = sport ? sport.name || sport.ALIAS_NAME : null;
      }
      
      return enriched;
    });

    res.json({ success: true, data: enrichedCompetitions });
  } catch (error) {
    next(error);
  }
});

// Get one competition by id (enriched)
router.get('/competitions/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const [competitions, terms, countries, sports] = await Promise.all([
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('sports.json')
    ]);
    const competition = competitions.find(c => String(c.COMPETITION_ID) === String(id));
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    const enriched = { ...competition };
    if (competition.NAME_ID) {
      const nameTerm = terms.find(t => t.id === competition.NAME_ID);
      enriched.name = resolveTermName(nameTerm) || `Competition ${competition.COMPETITION_ID}`;
    } else {
      enriched.name = `Competition ${competition.COMPETITION_ID}`;
    }
    if (competition.COUNTRY_ID) {
      const country = countries.find(c => c.COUNTRY_ID === competition.COUNTRY_ID);
      enriched.countryName = country ? country.name : null;
    }
    if (competition.SPORT_TYPE_ID) {
      const sport = sports.find(s => s.SPORT_TYPE_ID === competition.SPORT_TYPE_ID);
      enriched.sport = sport ? sport.name || sport.ALIAS_NAME : null;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Create new competition (POST) — all parameters from competitions.schema.json defaults, then overridden by body
router.post('/competitions', async (req, res, next) => {
  try {
    const body = req.body || {};
    const [schemaDefaults, competitions] = await Promise.all([
      getCompetitionDefaultsFromSchema(),
      dataLoader.loadData('competitions.json'),
    ]);
    const existing = competitions || [];
    const maxId = existing.length
      ? Math.max(...existing.map((c) => (c.COMPETITION_ID != null ? Number(c.COMPETITION_ID) : 0)), 0)
      : 0;
    const newId = maxId + 1;
    // Start from schema defaults; COMPETITION_ID and IS_DELETED set explicitly
    const newCompetition = { ...schemaDefaults, COMPETITION_ID: newId, IS_DELETED: false };
    // Override only with keys that exist in the schema (and are sent in body)
    for (const key of Object.keys(body)) {
      if (Object.prototype.hasOwnProperty.call(schemaDefaults, key)) {
        let val = body[key];
        if (val === '' && (schemaDefaults[key] === null || typeof schemaDefaults[key] === 'number')) val = null;
        if (key === 'NAME_ID' || key === 'COUNTRY_ID' || key === 'SPORT_TYPE_ID' || key === 'GENDER' || key === 'COMPETITION_TYPE') {
          val = val != null && val !== '' ? Number(val) : null;
        }
        newCompetition[key] = val;
      }
    }
    if (newCompetition.NAME_ID == null || newCompetition.COUNTRY_ID == null || newCompetition.SPORT_TYPE_ID == null) {
      return res.status(400).json({ success: false, error: 'NAME_ID, COUNTRY_ID, SPORT_TYPE_ID are required' });
    }
    existing.push(newCompetition);
    await dataLoader.saveData('competitions.json', existing);
    const [terms, countries, sports] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('sports.json')
    ]);
    const enriched = { ...newCompetition };
    if (newCompetition.NAME_ID) {
      const nameTerm = terms.find((t) => t.id === newCompetition.NAME_ID);
      enriched.name = resolveTermName(nameTerm) || `Competition ${newId}`;
    } else {
      enriched.name = `Competition ${newId}`;
    }
    if (newCompetition.COUNTRY_ID) {
      const country = countries.find((c) => c.COUNTRY_ID === newCompetition.COUNTRY_ID);
      enriched.countryName = country ? country.name : null;
    }
    if (newCompetition.SPORT_TYPE_ID) {
      const sport = sports.find((s) => s.SPORT_TYPE_ID === newCompetition.SPORT_TYPE_ID);
      enriched.sport = sport ? sport.name || sport.ALIAS_NAME : null;
    }
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Update one competition by id
router.put('/competitions/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const competitions = await dataLoader.loadData('competitions.json');
    const idx = competitions.findIndex(c => String(c.COMPETITION_ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    const existing = competitions[idx];
    const allowed = [
      'COUNTRY_ID', 'SPORT_TYPE_ID',
      'GENDER', 'COMPETITION_TYPE', 'MAIN_COLOR', 'SECONDARY_COLOR',
      'COMPETITION_IMAGE_URL', 'COMPETITION_DARK_IMAGE_URL', 'TROPHY_IMAGE_URL', 'IMG_VER',
      'TABLE_WINNER_POINTS', 'TABLE_DRAW_POINTS', 'TABLE_LOSER_POINTS',
      'TABLE_IS_EVEN_EXISTS', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE',
      'TABLE_WIN_AFTER_EX_POINTS', 'TABLE_LOS_AFTER_EX_POINTS', 'TABLE_WIN_AFTER_PEN_POINTS', 'TABLE_LOS_AFTER_PEN_POINTS',
      'TABLE_OFF_BONUS_POINTS', 'TABLE_DEFF_BONUS_POINTS',
      'IGNORE_AWAY_GOALS', 'STANDING_TABLE_FORMAT', 'ORDER_BY',
      'SUPPORT_COMPETITION_DASHBOARD', 'ENABLE_DASHBOARD_BUZZ', 'HIDE_ON_CATALOG', 'HIDE_ON_SEARCH',
      'CURRENT_SEASON', 'CURRENT_STAGE', 'IS_DELETED',
      'FATHER_COMPETITION', 'STANDING_TYPE', 'CURRENT_ROUND', 'SUB_SPORT_TYPE',
      'COMPETITORS_TYPE', 'HOST_CITY',
      'AUTO_START_GAMES', 'ALWAYS_UPDATE_ABOVE_PRIORITY', 'AUTOMATIC_STATUS_PROGRESS',
      'AUTO_PROGRESS_ADDED_TIME', 'UPDATE_RESULT_SECOND_SCANNER', 'SUPPORT_TIE_ON_90',
      'MIN_PRIORITY_TO_CHANGE_STATUS',
      'REQUIRE_FORMATION', 'TIMEOUT_FOR_ATHLETES_CONNECTION', 'LINEUP_UPDATE_THRESHOLD',
      'SHOW_DISCONNECTED_PLAYERS', 'MINIMUM_ATHLETES_IN_LINEUPS', 'MAXIMUM_PLAYERS_IN_LINEUPS',
      'NOTIFY_LINEUPS', 'NOTIFY_PROBABLE_LINEUPS', 'TIME_TO_NOTIFY_ANY_LINEUP', 'SUPPORT_MISSING_PLAYERS',
      'TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE', 'HIDE_COMPETITION_STATS', 'TOP_ATHLETE_PCT',
      'PERSONAL_FOULS', 'TEAM_FOULS', 'MAN_OF_THE_MATCH_ENABLED', 'SHOULD_DISPLAY_TOP_PERFORMERS',
      'MIN_ROUND_TO_SHOW_PRE_GAME_TOP_PERFORMERS', 'TIME_TO_SHOW_PRE_GAME_TOP_PERFORMERS',
      'SHOW_TOP_PERFORMERS_PRE_MATCH', 'SHOW_TOP_PERFORMERS_LIVE', 'SHOW_TOP_PERFORMERS_POST_MATCH',
      'PLAYER_STAT_MAX_POSITION', 'PLAYER_STATISTICS_UPDATE_DELAY', 'HIDE_ON_STATS',
      'CALCULATE_WIN_PROBABILITY', 'CALCULATE_WIN_PROBABILITY_INSIGHTS', 'CALCULATE_LIVE_WIN_PROBABILITY',
      'SUPPORT_INSIGHTS_POPUP_FOR_PROPS', 'SUPPORT_PROPS_BETTING', 'H2H_LAYOUT',
      'IS_SUPPORT_TRENDS', 'SHOW_SPREAD', 'SHOW_PROMOTED_TRENDS', 'DONT_DISPLAY_FATHERS_H2H',
      'SUPPORT_SPECIAL_OUTRIGHTS', 'SPECIAL_OUTRIGHTS_START_DATE', 'SPECIAL_OUTRIGHTS_END_DATE',
      // General section (Configurations tab)
      'SUPPORT_PAST_FINALS_STANDINGS', 'HIDE_FROM_POPULAR_WHEN_NO_ACTIVE', 'PROMOTE_DURING_ACTIVE_SEASON',
      'SUPPORT_FANS_RATE', 'RECENTLY_WON_TROPHY_CARD_VALUE', 'PROMOTE_NEW_TROPHY_VALUE',
      'AUTO_TRANSFER_WAIT_APPROVAL', 'TRANSFERS_WINDOW_START_DATE', 'TRANSFERS_WINDOW_END_DATE',
      'HIDE_PLAYER_GAME_CARD', 'BRACKET_FINAL_DESCRIPTION', 'SELECT_ROUND_NAME',
      'ARTICLE_TIME_SPAN_BEFORE', 'ARTICLE_TIME_SPAN_AFTER',
      'PREMIUM_SOCIAL_TIME_SPAN_BEFORE', 'PREMIUM_SOCIAL_TIME_SPAN_AFTER',
      'GAME_SUMMARY_RELEVANCY', 'BUZZ_ITEM_TYPE', 'SUPPORT_CARDS',
      'ALLOW_NOTIFICATION_FOR_FATHER_COMPETITION', 'TIER', 'RECOGNITION_TIME_SPAN', 'SURFACE_TYPE'
    ];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        let val = body[key];
        if ((key === 'COMPETITION_IMAGE_URL' || key === 'COMPETITION_DARK_IMAGE_URL' || key === 'TROPHY_IMAGE_URL') && (val === '' || val == null)) val = null;
        existing[key] = val;
      }
    }
    await dataLoader.saveData('competitions.json', competitions);
    const [terms, countries, sports] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('sports.json')
    ]);
    const enriched = { ...existing };
    if (existing.NAME_ID) {
      const nameTerm = terms.find(t => t.id === existing.NAME_ID);
      enriched.name = resolveTermName(nameTerm) || `Competition ${existing.COMPETITION_ID}`;
    } else {
      enriched.name = `Competition ${existing.COMPETITION_ID}`;
    }
    if (existing.COUNTRY_ID) {
      const country = countries.find(c => c.COUNTRY_ID === existing.COUNTRY_ID);
      enriched.countryName = country ? country.name : null;
    }
    if (existing.SPORT_TYPE_ID) {
      const sport = sports.find(s => s.SPORT_TYPE_ID === existing.SPORT_TYPE_ID);
      enriched.sport = sport ? sport.name || sport.ALIAS_NAME : null;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ----- Partner IDs for competitions (from partner_id_competitions.json) -----
router.get('/data-sources', async (req, res, next) => {
  try {
    const data = await dataLoader.loadData('data_sources.json');
    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/partner-id-competitions', async (req, res, next) => {
  try {
    const competitionId = req.query.competitionId;
    const [rows, dataSources] = await Promise.all([
      dataLoader.loadData('partner_id_competitions.json').catch(() => []),
      dataLoader.loadData('data_sources.json').catch(() => [])
    ]);
    let list = rows || [];
    if (competitionId != null && competitionId !== '') {
      const cid = parseInt(competitionId, 10);
      if (!isNaN(cid)) {
        list = list.filter(r => r.COMPETITION_ID != null && Number(r.COMPETITION_ID) === cid);
      }
    }
    const enriched = list.map(r => {
      const out = { ...r };
      if (r.DATA_SOURCE_ID != null && dataSources && dataSources.length) {
        const ds = dataSources.find(d => d.DATA_SOURCE_ID === r.DATA_SOURCE_ID);
        out.dataSourceName = ds ? (ds.ALIAS_NAME || `DS ${r.DATA_SOURCE_ID}`) : null;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/partner-ids', async (req, res, next) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    const body = req.body || {};
    const dataSourceId = body.DATA_SOURCE_ID != null ? parseInt(body.DATA_SOURCE_ID, 10) : null;
    const partnerId = body.PARTNER_ID != null ? String(body.PARTNER_ID).trim() : null;
    if (isNaN(competitionId) || dataSourceId == null || isNaN(dataSourceId)) {
      return res.status(400).json({ success: false, error: 'Competition ID and DATA_SOURCE_ID required' });
    }
    const rows = await dataLoader.loadData('partner_id_competitions.json').catch(() => []);
    const list = rows || [];
    const idx = list.findIndex(r => r.COMPETITION_ID === competitionId && r.DATA_SOURCE_ID === dataSourceId);
    const row = { COMPETITION_ID: competitionId, DATA_SOURCE_ID: dataSourceId, PARTNER_ID: partnerId, CREATE_TIME: null, UPDATE_TIME: null, UPDATE_BY: null };
    if (idx >= 0) {
      if (list[idx].CREATE_TIME != null) row.CREATE_TIME = list[idx].CREATE_TIME;
      list[idx] = row;
    } else {
      list.push(row);
    }
    await dataLoader.saveData('partner_id_competitions.json', list);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

router.delete('/competitions/:id/partner-ids/:dataSourceId', async (req, res, next) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    const dataSourceId = parseInt(req.params.dataSourceId, 10);
    if (isNaN(competitionId) || isNaN(dataSourceId)) {
      return res.status(400).json({ success: false, error: 'Invalid competition or data source' });
    }
    const rows = await dataLoader.loadData('partner_id_competitions.json').catch(() => []);
    const list = rows || [];
    const newList = list.filter(r => !(r.COMPETITION_ID === competitionId && r.DATA_SOURCE_ID === dataSourceId));
    if (newList.length === list.length) {
      return res.status(404).json({ success: false, error: 'Partner ID mapping not found' });
    }
    await dataLoader.saveData('partner_id_competitions.json', newList);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/partner-ids/bulk', async (req, res, next) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    if (isNaN(competitionId)) {
      return res.status(400).json({ success: false, error: 'Invalid competition ID' });
    }
    const entries = req.body && Array.isArray(req.body.entries) ? req.body.entries : null;
    if (!entries) {
      return res.status(400).json({ success: false, error: 'entries array required' });
    }
    const allRows = await dataLoader.loadData('partner_id_competitions.json').catch(() => []);
    const otherRows = (allRows || []).filter(r => Number(r.COMPETITION_ID) !== competitionId);
    const newRows = entries.map(e => ({
      COMPETITION_ID: competitionId,
      DATA_SOURCE_ID: e.DATA_SOURCE_ID != null ? parseInt(e.DATA_SOURCE_ID, 10) : null,
      PARTNER_ID: e.PARTNER_ID != null ? e.PARTNER_ID : null,
      CREATE_TIME: e.CREATE_TIME || null,
      UPDATE_TIME: e.UPDATE_TIME || null,
      UPDATE_BY: e.UPDATE_BY || null,
    }));
    const merged = [...otherRows, ...newRows];
    await dataLoader.saveData('partner_id_competitions.json', merged);
    const dataSources = await dataLoader.loadData('data_sources.json').catch(() => []);
    const enriched = newRows.map(r => {
      const out = { ...r };
      if (r.DATA_SOURCE_ID != null && dataSources && dataSources.length) {
        const ds = dataSources.find(d => d.DATA_SOURCE_ID === r.DATA_SOURCE_ID);
        out.dataSourceName = ds ? (ds.ALIAS_NAME || `DS ${r.DATA_SOURCE_ID}`) : null;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ----- Competition Winners (read-only, informational) -----
router.get('/competitions/:id/winners', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    if (isNaN(cid)) return res.status(400).json({ success: false, error: 'Invalid competition id' });

    const [seasonCompetitors, seasons, competitors, athletes, contracts, terms] = await Promise.all([
      dataLoader.loadData('season_competitors.json'),
      dataLoader.loadData('seasons.json'),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('athletes.json'),
      dataLoader.loadData('athlete_contracts.json'),
      dataLoader.loadData('terms.json'),
    ]);

    const compSeasons = seasons.filter(s => Number(s.COMPETITION_ID) === cid);
    const seasonMap = {};
    for (const s of compSeasons) {
      const t = s.NAME_ID ? terms.find(x => x.id === s.NAME_ID) : null;
      seasonMap[s.SEASON_NUM] = {
        name: resolveTermName(t) || `Season ${s.SEASON_NUM}`,
        startDate: s.START_DATE || null,
        endDate: s.END_DATE || null,
      };
    }

    const winners = seasonCompetitors.filter(
      sc => Number(sc.COMPETITION_ID) === cid && sc.WINNER === true
    );

    const COACH_FORMATION_POSITION_ID = 24;

    const data = winners.map(w => {
      const sInfo = seasonMap[w.SEASON_NUM] || {};
      const comp = competitors.find(c => c.COMPETITOR_ID === w.COMPETITOR_ID);
      const compNameTerm = comp && comp.NAME_ID ? terms.find(x => x.id === comp.NAME_ID) : null;

      const row = {
        seasonNum: w.SEASON_NUM,
        seasonName: sInfo.name || `Season ${w.SEASON_NUM}`,
        competitorId: w.COMPETITOR_ID,
        competitorName: resolveTermName(compNameTerm) || (comp ? `Competitor ${w.COMPETITOR_ID}` : null),
        competitorLogo: comp ? (comp.LIGHT_IMAGE_URL || comp.DARK_IMAGE_URL || null) : null,
        coach: null,
      };

      const seasonStart = sInfo.startDate ? new Date(sInfo.startDate) : null;
      const seasonEnd = sInfo.endDate ? new Date(sInfo.endDate) : null;

      const coachContracts = contracts.filter(c =>
        c.COMPETITOR_ID === w.COMPETITOR_ID &&
        c.FORMATION_POSITION === COACH_FORMATION_POSITION_ID
      );

      for (const cc of coachContracts) {
        const cStart = cc.START_DATE ? new Date(cc.START_DATE) : null;
        const cEnd = cc.END_DATE ? new Date(cc.END_DATE) : null;

        const overlaps =
          (seasonStart == null && seasonEnd == null) ||
          (cStart == null && cEnd == null) ||
          (
            (cEnd == null || seasonStart == null || cEnd >= seasonStart) &&
            (cStart == null || seasonEnd == null || cStart <= seasonEnd)
          );

        if (overlaps) {
          const athlete = athletes.find(a => a.ATHLETE_ID === cc.ATHLETE_ID);
          const athleteNameTerm = athlete && athlete.NAME_ID ? terms.find(x => x.id === athlete.NAME_ID) : null;
          row.coach = {
            athleteId: cc.ATHLETE_ID,
            name: resolveTermName(athleteNameTerm) || `Athlete ${cc.ATHLETE_ID}`,
          };
          break;
        }
      }

      return row;
    });

    data.sort((a, b) => b.seasonNum - a.seasonNum);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Save competition winners: update WINNER flags + create coach contracts
router.post('/competitions/:id/winners', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    if (isNaN(cid)) return res.status(400).json({ success: false, error: 'Invalid competition id' });

    const { winners } = req.body || {};
    if (!Array.isArray(winners)) return res.status(400).json({ success: false, error: 'winners array required' });

    const [seasonCompetitors, seasons, contracts, contractSchema] = await Promise.all([
      dataLoader.loadData('season_competitors.json'),
      dataLoader.loadData('seasons.json'),
      dataLoader.loadData('athlete_contracts.json'),
      fs.readFile(SEASON_COMPETITORS_SCHEMA_PATH.replace('season_competitors', 'athlete_contracts').replace('season_competitors', 'athlete_contracts'), 'utf8').then(r => JSON.parse(r)).catch(() => ({})),
    ]);

    const compSeasons = seasons.filter(s => Number(s.COMPETITION_ID) === cid);
    const seasonDateMap = {};
    for (const s of compSeasons) {
      seasonDateMap[s.SEASON_NUM] = { startDate: s.START_DATE || null, endDate: s.END_DATE || null };
    }

    const newWinnerSet = new Set(winners.map(w => `${w.seasonNum}-${w.competitorId}`));

    for (const sc of seasonCompetitors) {
      if (Number(sc.COMPETITION_ID) !== cid) continue;
      const key = `${sc.SEASON_NUM}-${sc.COMPETITOR_ID}`;
      if (sc.WINNER && !newWinnerSet.has(key)) {
        sc.WINNER = false;
      }
    }

    const COACH_POSITION = 8;
    const COACH_FORMATION_POSITION = 24;

    for (const w of winners) {
      const sn = w.seasonNum;
      const compId = w.competitorId;
      const row = seasonCompetitors.find(
        sc => Number(sc.COMPETITION_ID) === cid && sc.SEASON_NUM === sn && sc.COMPETITOR_ID === compId
      );
      if (row) {
        row.WINNER = true;
      }

      if (w.coachAthleteId != null) {
        const sDates = seasonDateMap[sn] || {};
        const sStart = sDates.startDate ? new Date(sDates.startDate) : null;
        const sEnd = sDates.endDate ? new Date(sDates.endDate) : null;

        const existingCoach = contracts.find(c =>
          c.ATHLETE_ID === w.coachAthleteId &&
          c.COMPETITOR_ID === compId &&
          c.FORMATION_POSITION === COACH_FORMATION_POSITION &&
          (() => {
            const cStart = c.START_DATE ? new Date(c.START_DATE) : null;
            const cEnd = c.END_DATE ? new Date(c.END_DATE) : null;
            return (
              (cEnd == null || sStart == null || cEnd >= sStart) &&
              (cStart == null || sEnd == null || cStart <= sEnd)
            );
          })()
        );

        if (!existingCoach) {
          const maxId = contracts.reduce((max, c) => {
            const id = typeof c.CONTRACT_ID === 'number' ? c.CONTRACT_ID : 0;
            return id > max ? id : max;
          }, 0);
          const now = new Date().toISOString();
          const newContract = {
            ATHLETE_ID: w.coachAthleteId,
            COMPETITOR_ID: compId,
            START_DATE: sDates.startDate ? String(sDates.startDate).slice(0, 10) : null,
            END_DATE: sDates.endDate ? String(sDates.endDate).slice(0, 10) : null,
            CURRENT_CLUB: false,
            JERSEY_NUMBER: null,
            TRANSFER_TYPE: null,
            TRANSFER_FEE: null,
            TRANSFER_FEE_CURRENCY: null,
            SALARY: null,
            SALARY_CURRENCY: null,
            POSITION: COACH_POSITION,
            FORMATION_POSITION: COACH_FORMATION_POSITION,
            BLOCK_AUTOMATIC_UPDATES: false,
            MAIN_COMPETITION_ID: null,
            CONTRACT_ID: maxId + 1,
            CREATE_TIME: now,
            UPDATE_TIME: now,
          };
          contracts.push(newContract);
        }
      }
    }

    await Promise.all([
      dataLoader.saveData('season_competitors.json', seasonCompetitors),
      dataLoader.saveData('athlete_contracts.json', contracts),
    ]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Validate coach: check athlete-level POSITION=8 (Management) + FORMATION_POSITION=24 (Coach)
router.get('/athletes/:athleteId/validate-coach', async (req, res, next) => {
  try {
    const athleteId = parseInt(req.params.athleteId, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    const [athletes, terms] = await Promise.all([
      dataLoader.loadData('athletes.json'),
      dataLoader.loadData('terms.json'),
    ]);

    const athlete = athletes.find(a => a.ATHLETE_ID === athleteId);
    if (!athlete) {
      return res.json({ success: true, valid: false, reason: 'Athlete not found' });
    }

    const COACH_POSITION = 8;
    const COACH_FORMATION_POSITION = 24;
    if (athlete.POSITION !== COACH_POSITION || athlete.FORMATION_POSITION !== COACH_FORMATION_POSITION) {
      return res.json({ success: true, valid: false, reason: 'Athlete is not a Coach (requires Management position with Coach formation)' });
    }

    const nameTerm = athlete.NAME_ID ? terms.find(t => t.id === athlete.NAME_ID) : null;
    const name = resolveTermName(nameTerm) || `Athlete ${athleteId}`;

    res.json({ success: true, valid: true, athleteId, name });
  } catch (error) {
    next(error);
  }
});

// ----- Seasons CRUD (under competition) -----
const SEASON_FIELDS = [
  'SEASON_NUM', 'NAME_ID', 'SEASON_KEY', 'START_DATE', 'END_DATE', 'HAS_TABLE', 'HAS_BRACKETS',
  'TABLE_WINNER_POINTS', 'TABLE_DRAW_POINTS', 'TABLE_LOSER_POINTS',
  'TABLE_WIN_AFTER_EX_POINTS', 'TABLE_LOS_AFTER_EX_POINTS', 'TABLE_WIN_AFTER_PEN_POINTS', 'TABLE_LOS_AFTER_PEN_POINTS',
  'TABLE_IS_EVEN_EXISTS', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE',
  'ORDER_BY', 'STANDING_TYPE',
  'USE_NAME', 'SHOW_TOP_ATHLETES', 'HAS_HOME_TABLE', 'HAS_AWAY_TABLE', 'SHOW_INFO_CARD', 'SHOW_MATCHES',
  'HAS_SEED', 'SHOW_TOP_TEAMS_TAB', 'SHOW_OUTRIGHTS_TAB', 'PRESENT_COMPETITION_RULES',
  'TRANSFERS_WINDOW_START_DATE', 'TRANSFERS_WINDOW_END_DATE'
];

function buildSeason(competitionId, body) {
  const cid = parseInt(competitionId, 10);
  if (isNaN(cid)) return null;
  const s = { COMPETITION_ID: cid };
  for (const key of SEASON_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      s[key] = body[key];
    }
  }
  return s;
}

router.post('/competitions/:id/seasons', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid)) {
      return res.status(400).json({ success: false, error: 'Invalid competition id' });
    }
    const seasons = await dataLoader.loadData('seasons.json');
    const seasonNum = body.SEASON_NUM != null ? parseInt(body.SEASON_NUM, 10) : null;
    if (seasonNum == null || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'SEASON_NUM is required' });
    }
    const exists = seasons.some(s => s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Season already exists for this competition' });
    }
    const newSeason = buildSeason(competitionId, body);
    if (!newSeason.SEASON_NUM) {
      return res.status(400).json({ success: false, error: 'SEASON_NUM is required' });
    }
    seasons.push(newSeason);
    await dataLoader.saveData('seasons.json', seasons);
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...newSeason };
    if (newSeason.NAME_ID) {
      const t = terms.find(x => x.id === newSeason.NAME_ID);
      enriched.name = resolveTermName(t) || `Season ${newSeason.SEASON_NUM}`;
    } else {
      enriched.name = `Season ${newSeason.SEASON_NUM}`;
    }
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id or seasonNum' });
    }
    const seasons = await dataLoader.loadData('seasons.json');
    const idx = seasons.findIndex(s => s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Season not found' });
    }
    for (const key of SEASON_FIELDS) {
      if (key !== 'SEASON_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        seasons[idx][key] = body[key];
      }
    }
    await dataLoader.saveData('seasons.json', seasons);
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...seasons[idx] };
    if (enriched.NAME_ID) {
      const t = terms.find(x => x.id === enriched.NAME_ID);
      enriched.name = resolveTermName(t) || `Season ${enriched.SEASON_NUM}`;
    } else {
      enriched.name = `Season ${enriched.SEASON_NUM}`;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.delete('/competitions/:id/seasons/:seasonNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id or seasonNum' });
    }
    const [competitions, seasons] = await Promise.all([
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('seasons.json')
    ]);
    const comp = competitions.find(c => c.COMPETITION_ID === cid);
    if (comp && comp.CURRENT_SEASON === seasonNum) {
      return res.status(400).json({ success: false, error: 'Cannot delete current season. Set another season as current first.' });
    }
    const newSeasons = seasons.filter(s => !(s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum));
    if (newSeasons.length === seasons.length) {
      return res.status(404).json({ success: false, error: 'Season not found' });
    }
    await dataLoader.saveData('seasons.json', newSeasons);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ----- Stages CRUD (under competition+season) -----
const STAGE_FIELDS = [
  'STAGE_NUM', 'NAME_ID', 'NUM_OF_GAMES', 'STAGE_TYPE', 'HAS_TABLE',
  'TABLE_WINNER_POINTS', 'TABLE_DRAW_POINTS', 'TABLE_LOSER_POINTS',
  'TABLE_IS_EVEN_EXISTS', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE',
  'USE_NAME', 'IS_FINAL', 'START_DATE', 'END_DATE',
  'HAS_HOME_TABLE', 'HAS_AWAY_TABLE', 'PHASE', 'PRE_VISUAL_BRACKETS', 'INCLUDE_IN_BRACKET',
  'IS_SERIES', 'FILTER_DIVISION', 'CONNECTED_IN_BRACKETS', 'CONNECTED_TO_PREVIOUS_STAGE',
  'ORDER_BY', 'PRESENTATION_ORDER'
];

router.post('/competitions/:id/seasons/:seasonNum/stages', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition or season' });
    }
    const stages = await dataLoader.loadData('stages.json');
    const stageNum = body.STAGE_NUM != null ? parseInt(body.STAGE_NUM, 10) : null;
    if (stageNum == null || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'STAGE_NUM is required' });
    }
    const exists = stages.some(s => s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum && s.STAGE_NUM === stageNum);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Stage already exists' });
    }
    const newStage = { COMPETITION_ID: cid, SEASON_NUM: seasonNum };
    for (const key of STAGE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        newStage[key] = body[key];
      }
    }
    newStage.STAGE_NUM = stageNum;
    stages.push(newStage);
    await dataLoader.saveData('stages.json', stages);
    if (newStage.HAS_TABLE) {
      await ensureStageTableForStage(cid, seasonNum, stageNum);
    }
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...newStage };
    if (newStage.NAME_ID) {
      const t = terms.find(x => x.id === newStage.NAME_ID);
      enriched.name = resolveTermName(t) || `Stage ${newStage.STAGE_NUM}`;
    } else {
      enriched.name = `Stage ${newStage.STAGE_NUM}`;
    }
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const stages = await dataLoader.loadData('stages.json');
    const idx = stages.findIndex(s => s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum && s.STAGE_NUM === stageNum);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Stage not found' });
    }
    for (const key of STAGE_FIELDS) {
      if (key !== 'STAGE_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        stages[idx][key] = body[key];
      }
    }
    await dataLoader.saveData('stages.json', stages);
    const updatedStage = stages[idx];
    if (updatedStage.HAS_TABLE) {
      await ensureStageTableForStage(cid, seasonNum, stageNum);
    } else {
      const stageTables = await dataLoader.loadData('stage_tables.json').catch(() => []);
      const remaining = stageTables.filter(
        r => !(Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum)
      );
      if (remaining.length !== stageTables.length) {
        await dataLoader.saveData('stage_tables.json', remaining);
      }
    }
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...updatedStage };
    if (enriched.NAME_ID) {
      const t = terms.find(x => x.id === enriched.NAME_ID);
      enriched.name = resolveTermName(t) || `Stage ${enriched.STAGE_NUM}`;
    } else {
      enriched.name = `Stage ${enriched.STAGE_NUM}`;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ----- Stage Standings (stage_tables) -----
router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/standings', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const [stageTables, competitors, terms] = await Promise.all([
      dataLoader.loadData('stage_tables.json').catch(() => []),
      dataLoader.loadData('competitors.json').catch(() => []),
      dataLoader.loadData('terms.json').catch(() => [])
    ]);
    const filtered = stageTables.filter(
      r => Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum
    );
    const enriched = filtered.map((r) => {
      const comp = competitors.find(c => Number(c.COMPETITOR_ID) === Number(r.COMPETITOR_NUM));
      const nameId = comp?.NAME_ID;
      const term = nameId ? terms.find(t => t.id === nameId) : null;
      const name = resolveTermName(term) || (comp ? `Competitor ${r.COMPETITOR_NUM}` : `Competitor ${r.COMPETITOR_NUM}`);
      return { ...r, competitorName: name };
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/standings', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const body = req.body || {};
    const rows = Array.isArray(body.data) ? body.data : [];
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const stageTables = await dataLoader.loadData('stage_tables.json').catch(() => []);
    const others = stageTables.filter(
      r => !(Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum)
    );
    const updated = rows.map((r) => {
      const { competitorName, ...rest } = r;
      return { ...rest, COMPETITION_ID: cid, SEASON_NUM: seasonNum, STAGE_NUM: stageNum };
    });
    await dataLoader.saveData('stage_tables.json', [...others, ...updated]);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/destinations', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const [destinations, terms] = await Promise.all([
      dataLoader.loadData('stage_table_destinations.json').catch(() => []),
      dataLoader.loadData('terms.json').catch(() => [])
    ]);
    const filtered = destinations.filter(
      r => Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum
    );
    const enriched = filtered.map((r) => {
      const term = r.NAME_ID ? terms.find(t => t.id === r.NAME_ID) : null;
      const name = resolveTermName(term) || '';
      return { ...r, destinationName: name };
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/destinations', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const body = req.body || {};
    const rows = Array.isArray(body.data) ? body.data : [];
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const destinations = await dataLoader.loadData('stage_table_destinations.json').catch(() => []);
    const others = destinations.filter(
      r => !(Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum)
    );
    const updated = rows.map((r) => {
      const { destinationName, ...rest } = r;
      return { ...rest, COMPETITION_ID: cid, SEASON_NUM: seasonNum, STAGE_NUM: stageNum };
    });
    await dataLoader.saveData('stage_table_destinations.json', [...others, ...updated]);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ----- Stage Points Deductions (stage_table_points_deductions.json) -----
router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/points-deductions', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const [deductions, competitors, terms] = await Promise.all([
      dataLoader.loadData('stage_table_points_deductions.json').catch(() => []),
      dataLoader.loadData('competitors.json').catch(() => []),
      dataLoader.loadData('terms.json').catch(() => [])
    ]);
    const filtered = deductions.filter(
      r => Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum
    );
    const enriched = filtered.map((r) => {
      const comp = competitors.find(c => Number(c.COMPETITOR_ID) === Number(r.COMPETITOR_NUM));
      const nameId = comp?.NAME_ID;
      const nameTerm = nameId ? terms.find(t => t.id === nameId) : null;
      const competitorName = resolveTermName(nameTerm) || `Competitor ${r.COMPETITOR_NUM}`;
      const reasonTerm = r.REASON_TERM_ID ? terms.find(t => t.id === r.REASON_TERM_ID) : null;
      const reasonName = resolveTermName(reasonTerm) || '';
      const sourceTerm = r.SOURCE_ID ? terms.find(t => t.id === r.SOURCE_ID) : null;
      const sourceName = resolveTermName(sourceTerm) || '';
      return { ...r, competitorName, reasonName, sourceName };
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/points-deductions', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const body = req.body || {};
    const rows = Array.isArray(body.data) ? body.data : [];
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const deductions = await dataLoader.loadData('stage_table_points_deductions.json').catch(() => []);
    const others = deductions.filter(
      r => !(Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === seasonNum && Number(r.STAGE_NUM) === stageNum)
    );
    const updated = rows.map((r) => {
      const { competitorName, reasonName, sourceName, ...rest } = r;
      return { ...rest, COMPETITION_ID: cid, SEASON_NUM: seasonNum, STAGE_NUM: stageNum };
    });
    await dataLoader.saveData('stage_table_points_deductions.json', [...others, ...updated]);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/competitions/:id/seasons/:seasonNum/stages/:stageNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season or stage' });
    }
    const [competitions, stages] = await Promise.all([
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('stages.json')
    ]);
    const comp = competitions.find(c => c.COMPETITION_ID === cid);
    if (comp && comp.CURRENT_SEASON === seasonNum && comp.CURRENT_STAGE === stageNum) {
      return res.status(400).json({ success: false, error: 'Cannot delete current stage. Set another stage as current first.' });
    }
    const newStages = stages.filter(s => !(s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum && s.STAGE_NUM === stageNum));
    if (newStages.length === stages.length) {
      return res.status(404).json({ success: false, error: 'Stage not found' });
    }
    await dataLoader.saveData('stages.json', newStages);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ----- Groups CRUD (under competition+season+stage) -----
const GROUP_FIELDS = [
  'GROUP_NUM', 'NAME_ID', 'USE_NAME', 'HAS_TABLE', 'IS_SERIES', 'TO_QUALIFY', 'NUM_OF_GAMES',
  'GROUP_BY', 'AUTONOMOUS', 'GROUP_CATEGORY_NUM', 'FATHER_GROUP', 'IS_FINAL', 'ROUND_NAME'
];

router.post('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition, season or stage' });
    }
    const groups = await dataLoader.loadData('groups.json');
    const groupNum = body.GROUP_NUM != null ? parseInt(body.GROUP_NUM, 10) : null;
    if (groupNum == null || isNaN(groupNum)) {
      return res.status(400).json({ success: false, error: 'GROUP_NUM is required' });
    }
    const exists = groups.some(g => g.COMPETITION_ID === cid && g.SEASON_NUM === seasonNum && g.STAGE_NUM === stageNum && g.GROUP_NUM === groupNum);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Group already exists' });
    }
    const newGroup = { COMPETITION_ID: cid, SEASON_NUM: seasonNum, STAGE_NUM: stageNum };
    for (const key of GROUP_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        newGroup[key] = body[key];
      }
    }
    newGroup.GROUP_NUM = groupNum;
    groups.push(newGroup);
    await dataLoader.saveData('groups.json', groups);

    // Auto-create group games when stage is KnockOut/Qualification/RelegationOrPromotion and NUM_OF_GAMES > 0
    const stageTypesForGames = [3, 4, 5]; // KnockOut, Qualification, RelegationOrPromotion
    const stages = await dataLoader.loadData('stages.json').catch(() => []);
    const stage = stages.find(s => s.COMPETITION_ID === cid && s.SEASON_NUM === seasonNum && s.STAGE_NUM === stageNum);
    const numOfGames = stage && stage.NUM_OF_GAMES != null ? parseInt(stage.NUM_OF_GAMES, 10) : 0;
    if (stage && stageTypesForGames.includes(parseInt(stage.STAGE_TYPE, 10)) && numOfGames > 0) {
      const [gameDefaults, existingGames] = await Promise.all([
        getGroupGameDefaultsFromSchema(),
        dataLoader.loadData('group_games.json').catch(() => [])
      ]);
      const newGames = [];
      for (let i = 1; i <= numOfGames; i++) {
        const g = Object.assign({}, gameDefaults, {
          COMPETITION_ID: cid,
          SEASON_NUM: seasonNum,
          STAGE_NUM: stageNum,
          GROUP_NUM: groupNum,
          GAME_NUM: i,
          USE_NAME: true,
          START_TIME: stage.START_DATE || null
        });
        newGames.push(g);
      }
      await dataLoader.saveData('group_games.json', [...(existingGames || []), ...newGames]);
    }

    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...newGroup };
    if (newGroup.NAME_ID) {
      const t = terms.find(x => x.id === newGroup.NAME_ID);
      enriched.name = resolveTermName(t) || `Group ${newGroup.GROUP_NUM}`;
    } else {
      enriched.name = `Group ${newGroup.GROUP_NUM}`;
    }
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const groupNum = parseInt(req.params.groupNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum) || isNaN(groupNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season, stage or group' });
    }
    const groups = await dataLoader.loadData('groups.json');
    const idx = groups.findIndex(g => g.COMPETITION_ID === cid && g.SEASON_NUM === seasonNum && g.STAGE_NUM === stageNum && g.GROUP_NUM === groupNum);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    for (const key of GROUP_FIELDS) {
      if (key !== 'GROUP_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        groups[idx][key] = body[key];
      }
    }
    await dataLoader.saveData('groups.json', groups);
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...groups[idx] };
    if (enriched.NAME_ID) {
      const t = terms.find(x => x.id === enriched.NAME_ID);
      enriched.name = resolveTermName(t) || `Group ${enriched.GROUP_NUM}`;
    } else {
      enriched.name = `Group ${enriched.GROUP_NUM}`;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.delete('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const stageNum = parseInt(req.params.stageNum, 10);
    const groupNum = parseInt(req.params.groupNum, 10);
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(stageNum) || isNaN(groupNum)) {
      return res.status(400).json({ success: false, error: 'Invalid id, season, stage or group' });
    }
    const groups = await dataLoader.loadData('groups.json');
    const newGroups = groups.filter(g => !(g.COMPETITION_ID === cid && g.SEASON_NUM === seasonNum && g.STAGE_NUM === stageNum && g.GROUP_NUM === groupNum));
    if (newGroups.length === groups.length) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    await dataLoader.saveData('groups.json', newGroups);
    // BR-2: remove all stage_competitors for this group (competitors return to "Not In Groups")
    try {
      const sc = await dataLoader.loadData('stage_competitors.json').catch(() => []);
      const newSc = (sc || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum && r.STAGE_NUM === stageNum && r.GROUP_NUM === groupNum));
      if (newSc.length !== (sc || []).length) {
        await dataLoader.saveData('stage_competitors.json', newSc);
      }
    } catch (e) { /* ignore if file missing */ }
    // Remove group_games and group_participants for this group
    try {
      const gg = await dataLoader.loadData('group_games.json').catch(() => []);
      const newGg = (gg || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum && r.STAGE_NUM === stageNum && r.GROUP_NUM === groupNum));
      if (newGg.length !== (gg || []).length) {
        await dataLoader.saveData('group_games.json', newGg);
      }
    } catch (e) { /* ignore */ }
    try {
      const gp = await dataLoader.loadData('group_participants.json').catch(() => []);
      const newGp = (gp || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum && r.STAGE_NUM === stageNum && r.GROUP_NUM === groupNum));
      if (newGp.length !== (gp || []).length) {
        await dataLoader.saveData('group_participants.json', newGp);
      }
    } catch (e) { /* ignore */ }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Stage competitors (competition+season+stage+group) — stage_competitors.json ---
// GET competitors in a group (enriched with name, logoUrl). COMPETITOR_NUM in schema = COMPETITOR_ID.
router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const [sc, competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('stage_competitors.json').catch(() => []),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);
    const rows = (sc || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    const enriched = rows.map(r => {
      const compId = r.COMPETITOR_NUM ?? r.COMPETITOR_ID;
      const out = { ...r, COMPETITOR_ID: compId };
      const comp = competitors.find(c => c.COMPETITOR_ID === compId);
      if (comp && comp.NAME_ID) {
        const t = terms.find(x => x.id === comp.NAME_ID);
        out.name = resolveTermName(t) || `Competitor ${compId}`;
      } else { out.name = comp ? `Competitor ${compId}` : null; }
      if (comp) {
        out.logoUrl = comp.LIGHT_IMAGE_URL || comp.DARK_IMAGE_URL || null;
        if (comp.COUNTRY_ID) {
          const co = countries.find(x => x.COUNTRY_ID === comp.COUNTRY_ID);
          out.countryName = co ? co.name : null;
        }
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

// GET competitors in season but not in any group of this stage (for "Add to Group")
router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/competitors/not-in-groups', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const [sc, stageComp, competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('season_competitors.json'),
      dataLoader.loadData('stage_competitors.json').catch(() => []),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);
    const inSeason = new Set((sc || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn).map(r => r.COMPETITOR_ID));
    const compIdFromRow = (r) => r.COMPETITOR_NUM ?? r.COMPETITOR_ID;
    const inAnyGroupThisStage = new Set((stageComp || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn).map(compIdFromRow));
    const list = (competitors || []).filter(c => inSeason.has(c.COMPETITOR_ID) && !inAnyGroupThisStage.has(c.COMPETITOR_ID));
    const enriched = list.map(c => {
      const out = { ...c };
      if (c.NAME_ID) { const t = (terms || []).find(x => x.id === c.NAME_ID); out.name = resolveTermName(t) || `Competitor ${c.COMPETITOR_ID}`; } else { out.name = `Competitor ${c.COMPETITOR_ID}`; }
      if (c.COUNTRY_ID) { const co = (countries || []).find(x => x.COUNTRY_ID === c.COUNTRY_ID); out.countryName = co ? co.name : null; }
      out.logoUrl = c.LIGHT_IMAGE_URL || c.DARK_IMAGE_URL || null;
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

// POST add competitors to group; BR-2: if already in another group of this stage, remove from that group first.
// Uses stage_competitors schema: COMPETITOR_NUM = COMPETITOR_ID.
router.post('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    let ids = [];
    if (body.COMPETITOR_IDS && Array.isArray(body.COMPETITOR_IDS)) {
      ids = body.COMPETITOR_IDS.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    } else if (body.COMPETITOR_ID != null) {
      const one = parseInt(body.COMPETITOR_ID, 10);
      if (!isNaN(one)) ids = [one];
    }
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'COMPETITOR_ID or COMPETITOR_IDS required' });
    }
    const [defaults, list] = await Promise.all([
      getStageCompetitorDefaultsFromSchema(),
      dataLoader.loadData('stage_competitors.json').catch(() => [])
    ]);
    const base = Object.assign({}, defaults);
    const compIdFromRow = (r) => r.COMPETITOR_NUM ?? r.COMPETITOR_ID;
    const inThisGroup = new Set((list || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn).map(compIdFromRow));
    // BR-2: remove from any other group in this stage first
    let newList = (list || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM !== gn && ids.includes(compIdFromRow(r))));
    const toAdd = ids.filter(i => !inThisGroup.has(i));
    // PARTICIPANT_NUM: start from max(existing in group) + 1; first in toAdd gets lowest new number
    const existingInGroup = newList.filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    const maxPartNum = existingInGroup.length > 0
      ? Math.max(...existingInGroup.map(r => (r.PARTICIPANT_NUM != null && r.PARTICIPANT_NUM !== '') ? Number(r.PARTICIPANT_NUM) : 0))
      : 0;
    let nextPartNum = maxPartNum + 1;
    const addedWithPartNum = [];
    for (const compId of toAdd) {
      const partNum = nextPartNum++;
      const row = { ...base, COMPETITION_ID: cid, SEASON_NUM: sn, STAGE_NUM: stn, GROUP_NUM: gn, COMPETITOR_NUM: compId };
      row.PARTICIPANT_NUM = partNum;
      newList.push(row);
      addedWithPartNum.push({ compId, participantNum: partNum });
    }
    await dataLoader.saveData('stage_competitors.json', newList);
    // Sync group_participants: set COMPETITOR_NUM for each added competitor by PARTICIPANT_NUM
    if (addedWithPartNum.length > 0) {
      const [gpDefaults, gpList] = await Promise.all([
        getGroupParticipantDefaultsFromSchema(),
        dataLoader.loadData('group_participants.json').catch(() => [])
      ]);
      let gp = gpList || [];
      for (const { compId, participantNum } of addedWithPartNum) {
        const idx = gp.findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.PARTICIPANT_NUM ?? 0) === participantNum);
        if (idx >= 0) {
          gp[idx].COMPETITOR_NUM = compId;
        } else {
          const newRow = Object.assign({}, gpDefaults, { COMPETITION_ID: cid, SEASON_NUM: sn, STAGE_NUM: stn, GROUP_NUM: gn, PARTICIPANT_NUM: participantNum, COMPETITOR_NUM: compId });
          gp.push(newRow);
        }
      }
      await dataLoader.saveData('group_participants.json', gp);
    }
    res.status(201).json({ success: true, added: toAdd.length, data: toAdd });
  } catch (error) { next(error); }
});

// PUT update PARTICIPANT_NUM for a competitor in group
router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors/:competitorId', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const competitorId = parseInt(req.params.competitorId, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(competitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const sc = await dataLoader.loadData('stage_competitors.json').catch(() => []);
    const idx = (sc || []).findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && ((r.COMPETITOR_NUM ?? r.COMPETITOR_ID) === competitorId));
    if (idx === -1) return res.status(404).json({ success: false, error: 'Competitor not in group' });
    const oldPartNum = sc[idx].PARTICIPANT_NUM ?? 0;
    const newPartNum = body.PARTICIPANT_NUM !== undefined
      ? ((body.PARTICIPANT_NUM === '' || body.PARTICIPANT_NUM === null) ? 0 : (parseInt(body.PARTICIPANT_NUM, 10) || 0))
      : oldPartNum;
    if (body.PARTICIPANT_NUM !== undefined) sc[idx].PARTICIPANT_NUM = newPartNum;
    await dataLoader.saveData('stage_competitors.json', sc);
    // Sync group_participants: clear from old slot, set in new slot (create if needed)
    if (oldPartNum !== newPartNum) {
      const [gpDefaults, gp] = await Promise.all([
        getGroupParticipantDefaultsFromSchema(),
        dataLoader.loadData('group_participants.json').catch(() => [])
      ]);
      let gpList = gp || [];
      const oldIdx = gpList.findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.PARTICIPANT_NUM ?? 0) === oldPartNum && (r.COMPETITOR_NUM ?? 0) === competitorId);
      if (oldIdx >= 0) gpList[oldIdx].COMPETITOR_NUM = 0;
      const newIdx = gpList.findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.PARTICIPANT_NUM ?? 0) === newPartNum);
      if (newIdx >= 0) {
        gpList[newIdx].COMPETITOR_NUM = competitorId;
      } else {
        const newRow = Object.assign({}, gpDefaults, { COMPETITION_ID: cid, SEASON_NUM: sn, STAGE_NUM: stn, GROUP_NUM: gn, PARTICIPANT_NUM: newPartNum, COMPETITOR_NUM: competitorId });
        gpList.push(newRow);
      }
      await dataLoader.saveData('group_participants.json', gpList);
    }
    res.json({ success: true, data: { ...sc[idx], COMPETITOR_ID: sc[idx].COMPETITOR_NUM ?? sc[idx].COMPETITOR_ID } });
  } catch (error) { next(error); }
});

// DELETE remove competitor from group
router.delete('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/competitors/:competitorId', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const competitorId = parseInt(req.params.competitorId, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(competitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const sc = await dataLoader.loadData('stage_competitors.json').catch(() => []);
    const compIdFromRow = (r) => r.COMPETITOR_NUM ?? r.COMPETITOR_ID;
    const removedRow = (sc || []).find(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && compIdFromRow(r) === competitorId);
    if (!removedRow) return res.status(404).json({ success: false, error: 'Competitor not in group' });
    const newList = (sc || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && compIdFromRow(r) === competitorId));
    await dataLoader.saveData('stage_competitors.json', newList);
    // Sync group_participants: clear COMPETITOR_NUM for the slot that had this competitor
    const gp = await dataLoader.loadData('group_participants.json').catch(() => []);
    const gpIdx = (gp || []).findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.COMPETITOR_NUM ?? 0) === competitorId);
    if (gpIdx >= 0) {
      gp[gpIdx].COMPETITOR_NUM = 0;
      await dataLoader.saveData('group_participants.json', gp);
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});

// --- Group Games (competition+season+stage+group) — group_games.json ---
const GROUP_GAME_FIELDS = ['GAME_NUM', 'GAME_ID', 'NAME_ID', 'USE_NAME', 'COMPETITOR_NUM', 'PARTICIPANT_NUM', 'ORIGIN_GROUP_NUM', 'ORIGIN_GROUP_POSITION', 'ORIGIN_STAGE_NUM', 'START_TIME', 'VENUE_ID'];

router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const [games, terms, venues] = await Promise.all([
      dataLoader.loadData('group_games.json').catch(() => []),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('venues.json').catch(() => [])
    ]);
    const rows = (games || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    const enriched = rows.map(r => {
      const out = { ...r };
      if (r.NAME_ID) {
        const t = terms.find(x => x.id === r.NAME_ID);
        out.name = resolveTermName(t) || `Game ${r.GAME_NUM || '-'}`;
      } else {
        out.name = `Game ${r.GAME_NUM || '-'}`;
      }
      if (r.VENUE_ID) {
        const venue = (venues || []).find(v => v.VENUE_ID === r.VENUE_ID);
        if (venue && venue.NAME_ID) {
          const t = terms.find(x => x.id === venue.NAME_ID);
          out.venueName = resolveTermName(t) || '';
        } else {
          out.venueName = '';
        }
      } else {
        out.venueName = '';
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

router.post('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const [defaults, list, stages] = await Promise.all([
      getGroupGameDefaultsFromSchema(),
      dataLoader.loadData('group_games.json').catch(() => []),
      dataLoader.loadData('stages.json').catch(() => [])
    ]);
    const stage = (stages || []).find(s => s.COMPETITION_ID === cid && s.SEASON_NUM === sn && s.STAGE_NUM === stn);
    const existing = (list || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    const maxGameNum = existing.length > 0 ? Math.max(...existing.map(r => (r.GAME_NUM != null ? Number(r.GAME_NUM) : 0))) : 0;
    const newGameNum = body.GAME_NUM != null ? parseInt(body.GAME_NUM, 10) : maxGameNum + 1;
    const exists = existing.some(r => (r.GAME_NUM ?? 0) === newGameNum);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Game number already exists in this group' });
    }
    const base = Object.assign({}, defaults, { COMPETITION_ID: cid, SEASON_NUM: sn, STAGE_NUM: stn, GROUP_NUM: gn });
    for (const key of GROUP_GAME_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        base[key] = body[key];
      }
    }
    if (!Object.prototype.hasOwnProperty.call(body, 'USE_NAME')) base.USE_NAME = true;
    if (!Object.prototype.hasOwnProperty.call(body, 'START_TIME') && stage) base.START_TIME = stage.START_DATE || null;
    base.GAME_NUM = newGameNum;
    const venueId = base.VENUE_ID != null ? parseInt(base.VENUE_ID, 10) : 0;
    if (venueId !== 0 && !isNaN(venueId)) {
      const venues = await dataLoader.loadData('venues.json').catch(() => []);
      const venueExists = (venues || []).some(v => v.VENUE_ID === venueId);
      if (!venueExists) {
        return res.status(400).json({ success: false, error: `Venue ID ${venueId} does not exist in venues` });
      }
    }
    const gameId = base.GAME_ID != null ? parseInt(base.GAME_ID, 10) : 0;
    if (gameId !== 0 && !isNaN(gameId)) {
      const [games, competitions] = await Promise.all([
        dataLoader.loadData('games.json').catch(() => []),
        dataLoader.loadData('competitions.json').catch(() => [])
      ]);
      const game = (games || []).find(g => (g.GAME_ID ?? g.gameId) === gameId);
      if (!game) {
        return res.status(400).json({ success: false, error: `Game ID ${gameId} does not exist in games` });
      }
      const comp = (competitions || []).find(c => (c.COMPETITION_ID ?? c.competitionId) === cid);
      const gameSportId = game.SPORTTYPE_ID ?? game.SPORT_TYPE_ID ?? game.sportTypeId;
      const compSportId = comp?.SPORT_TYPE_ID ?? comp?.sportTypeId;
      if (compSportId != null && gameSportId != null && Number(gameSportId) !== Number(compSportId)) {
        return res.status(400).json({ success: false, error: `Game sport type (${gameSportId}) does not match competition sport type (${compSportId})` });
      }
    }
    const newList = [...(list || []), base];
    await dataLoader.saveData('group_games.json', newList);
    const [terms, venues] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('venues.json').catch(() => [])
    ]);
    const enriched = { ...base };
    if (base.NAME_ID) {
      const t = terms.find(x => x.id === base.NAME_ID);
      enriched.name = resolveTermName(t) || `Game ${base.GAME_NUM}`;
    } else {
      enriched.name = `Game ${base.GAME_NUM}`;
    }
    if (base.VENUE_ID) {
      const venue = (venues || []).find(v => v.VENUE_ID === base.VENUE_ID);
      if (venue && venue.NAME_ID) {
        const t = terms.find(x => x.id === venue.NAME_ID);
        enriched.venueName = resolveTermName(t) || '';
      } else enriched.venueName = '';
    } else enriched.venueName = '';
    res.status(201).json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games/:gameNum', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const gameNum = parseInt(req.params.gameNum, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(gameNum)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const venueId = body.VENUE_ID != null ? parseInt(body.VENUE_ID, 10) : undefined;
    if (venueId !== undefined && venueId !== 0 && !isNaN(venueId)) {
      const venues = await dataLoader.loadData('venues.json').catch(() => []);
      const venueExists = (venues || []).some(v => v.VENUE_ID === venueId);
      if (!venueExists) {
        return res.status(400).json({ success: false, error: `Venue ID ${venueId} does not exist in venues` });
      }
    }
    const list = await dataLoader.loadData('group_games.json').catch(() => []);
    const idx = (list || []).findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.GAME_NUM ?? 0) === gameNum);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Game not found' });
    const newGameNum = body.GAME_NUM != null ? parseInt(body.GAME_NUM, 10) : undefined;
    if (newGameNum !== undefined && !isNaN(newGameNum) && newGameNum !== gameNum) {
      const duplicate = (list || []).some(r =>
        r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn &&
        (r.GAME_NUM ?? 0) === newGameNum
      );
      if (duplicate) {
        return res.status(400).json({ success: false, error: `GAME_NUM ${newGameNum} already exists in this group` });
      }
    }
    for (const key of GROUP_GAME_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        list[idx][key] = body[key];
      }
    }
    const gameId = list[idx].GAME_ID != null ? parseInt(list[idx].GAME_ID, 10) : 0;
    if (gameId !== 0 && !isNaN(gameId)) {
      const [games, competitions] = await Promise.all([
        dataLoader.loadData('games.json').catch(() => []),
        dataLoader.loadData('competitions.json').catch(() => [])
      ]);
      const game = (games || []).find(g => (g.GAME_ID ?? g.gameId) === gameId);
      if (!game) {
        return res.status(400).json({ success: false, error: `Game ID ${gameId} does not exist in games` });
      }
      const comp = (competitions || []).find(c => (c.COMPETITION_ID ?? c.competitionId) === cid);
      const gameSportId = game.SPORTTYPE_ID ?? game.SPORT_TYPE_ID ?? game.sportTypeId;
      const compSportId = comp?.SPORT_TYPE_ID ?? comp?.sportTypeId;
      if (compSportId != null && gameSportId != null && Number(gameSportId) !== Number(compSportId)) {
        return res.status(400).json({ success: false, error: `Game sport type (${gameSportId}) does not match competition sport type (${compSportId})` });
      }
    }
    await dataLoader.saveData('group_games.json', list);
    const [terms, venues] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('venues.json').catch(() => [])
    ]);
    const enriched = { ...list[idx] };
    if (enriched.NAME_ID) {
      const t = terms.find(x => x.id === enriched.NAME_ID);
      enriched.name = resolveTermName(t) || `Game ${enriched.GAME_NUM}`;
    } else {
      enriched.name = `Game ${enriched.GAME_NUM}`;
    }
    if (enriched.VENUE_ID) {
      const venue = (venues || []).find(v => v.VENUE_ID === enriched.VENUE_ID);
      if (venue && venue.NAME_ID) {
        const t = terms.find(x => x.id === venue.NAME_ID);
        enriched.venueName = resolveTermName(t) || '';
      } else enriched.venueName = '';
    } else enriched.venueName = '';
    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

router.delete('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/games/:gameNum', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const gameNum = parseInt(req.params.gameNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(gameNum)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const list = await dataLoader.loadData('group_games.json').catch(() => []);
    const newList = (list || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.GAME_NUM ?? 0) === gameNum));
    if (newList.length === (list || []).length) return res.status(404).json({ success: false, error: 'Game not found' });
    await dataLoader.saveData('group_games.json', newList);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// --- Group Participants (competition+season+stage+group) — group_participants.json ---
const GROUP_PARTICIPANT_FIELDS = ['COMPETITOR_NUM', 'PARTICIPANT_NUM', 'NAME_ID', 'USE_NAME', 'ORIGIN_GROUP_NUM', 'ORIGIN_GROUP_POSITION', 'ORIGIN_STAGE_NUM'];

router.get('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const [participants, competitors, terms] = await Promise.all([
      dataLoader.loadData('group_participants.json').catch(() => []),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json')
    ]);
    const rows = (participants || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    const enriched = rows.map(r => {
      const compId = r.COMPETITOR_NUM ?? 0;
      const out = { ...r, COMPETITOR_ID: compId };
      const comp = competitors.find(c => c.COMPETITOR_ID === compId);
      if (comp && comp.NAME_ID) {
        const t = terms.find(x => x.id === comp.NAME_ID);
        out.name = resolveTermName(t) || `Competitor ${compId}`;
      } else {
        out.name = r.NAME_ID ? (() => { const t = terms.find(x => x.id === r.NAME_ID); return resolveTermName(t) || `Participant ${r.PARTICIPANT_NUM}`; })() : `Participant ${r.PARTICIPANT_NUM}`;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
});

router.post('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const competitorNum = body.COMPETITOR_NUM != null ? parseInt(body.COMPETITOR_NUM, 10) : (body.COMPETITOR_ID != null ? parseInt(body.COMPETITOR_ID, 10) : 0);
    const nameId = body.NAME_ID != null ? parseInt(body.NAME_ID, 10) : 0;
    if (competitorNum === 0 && !nameId) {
      return res.status(400).json({ success: false, error: 'NAME_ID or COMPETITOR_NUM required' });
    }
    const [defaults, list] = await Promise.all([
      getGroupParticipantDefaultsFromSchema(),
      dataLoader.loadData('group_participants.json').catch(() => [])
    ]);
    const existing = (list || []).filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn);
    if (competitorNum !== 0) {
      const existsCompetitor = existing.some(r => (r.COMPETITOR_NUM ?? 0) === competitorNum);
      if (existsCompetitor) {
        return res.status(409).json({ success: false, error: 'Participant already in group' });
      }
    }
    const maxPartNum = existing.length > 0 ? Math.max(...existing.map(r => (r.PARTICIPANT_NUM != null ? Number(r.PARTICIPANT_NUM) : 0))) : 0;
    const base = Object.assign({}, defaults, { COMPETITION_ID: cid, SEASON_NUM: sn, STAGE_NUM: stn, GROUP_NUM: gn, COMPETITOR_NUM: competitorNum, NAME_ID: nameId || (defaults.NAME_ID ?? 0) });
    base.PARTICIPANT_NUM = body.PARTICIPANT_NUM != null ? parseInt(body.PARTICIPANT_NUM, 10) : maxPartNum + 1;
    for (const key of GROUP_PARTICIPANT_FIELDS) {
      if (key !== 'COMPETITOR_NUM' && key !== 'PARTICIPANT_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        base[key] = body[key];
      }
    }
    const newList = [...(list || []), base];
    await dataLoader.saveData('group_participants.json', newList);
    res.status(201).json({ success: true, data: base });
  } catch (error) { next(error); }
});

router.put('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants/:participantNum', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const participantNum = parseInt(req.params.participantNum, 10);
    const body = req.body || {};
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(participantNum)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const list = await dataLoader.loadData('group_participants.json').catch(() => []);
    const idx = (list || []).findIndex(r => r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.PARTICIPANT_NUM ?? 0) === participantNum);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Participant not found' });
    for (const key of GROUP_PARTICIPANT_FIELDS) {
      if (key !== 'COMPETITOR_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        list[idx][key] = body[key];
      }
    }
    await dataLoader.saveData('group_participants.json', list);
    res.json({ success: true, data: list[idx] });
  } catch (error) { next(error); }
});

router.delete('/competitions/:id/seasons/:seasonNum/stages/:stageNum/groups/:groupNum/participants/:participantNum', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.id, 10);
    const sn = parseInt(req.params.seasonNum, 10);
    const stn = parseInt(req.params.stageNum, 10);
    const gn = parseInt(req.params.groupNum, 10);
    const participantNum = parseInt(req.params.participantNum, 10);
    if (isNaN(cid) || isNaN(sn) || isNaN(stn) || isNaN(gn) || isNaN(participantNum)) {
      return res.status(400).json({ success: false, error: 'Invalid params' });
    }
    const list = await dataLoader.loadData('group_participants.json').catch(() => []);
    const newList = (list || []).filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === sn && r.STAGE_NUM === stn && r.GROUP_NUM === gn && (r.PARTICIPANT_NUM ?? 0) === participantNum));
    if (newList.length === (list || []).length) return res.status(404).json({ success: false, error: 'Participant not found' });
    await dataLoader.saveData('group_participants.json', newList);
    res.json({ success: true });
  } catch (error) { next(error); }
});

const PHASE_FIELDS = [
  'PHASE_NUM', 'PHASE_NAME_ID', 'PARENT_PHASE_NUM', 'SHOW_STATS', 'USE_NAME',
  'OVERTIME_LENGTH', 'TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE'
];

router.post('/competitions/:id/seasons/:seasonNum/phases', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition or season' });
    }
    const phases = await dataLoader.loadData('phases.json');
    const phaseNum = body.PHASE_NUM != null ? parseInt(body.PHASE_NUM, 10) : null;
    if (phaseNum == null || isNaN(phaseNum)) {
      return res.status(400).json({ success: false, error: 'PHASE_NUM is required' });
    }
    const exists = phases.some(p => p.COMPETITION_ID === cid && p.SEASON_NUM === seasonNum && p.PHASE_NUM === phaseNum);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Phase already exists' });
    }
    const newPhase = { COMPETITION_ID: cid, SEASON_NUM: seasonNum };
    for (const key of PHASE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        newPhase[key] = body[key];
      }
    }
    newPhase.PHASE_NUM = phaseNum;
    phases.push(newPhase);
    await dataLoader.saveData('phases.json', phases);
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...newPhase };
    if (newPhase.PHASE_NAME_ID) {
      const t = terms.find(x => x.id === newPhase.PHASE_NAME_ID);
      enriched.name = resolveTermName(t) || `Phase ${newPhase.PHASE_NUM}`;
    } else {
      enriched.name = `Phase ${newPhase.PHASE_NUM}`;
    }
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.put('/competitions/:id/seasons/:seasonNum/phases/:phaseNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const phaseNum = parseInt(req.params.phaseNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(phaseNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition, season or phase' });
    }
    const phases = await dataLoader.loadData('phases.json');
    const idx = phases.findIndex(p => p.COMPETITION_ID === cid && p.SEASON_NUM === seasonNum && p.PHASE_NUM === phaseNum);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Phase not found' });
    }
    for (const key of PHASE_FIELDS) {
      if (key !== 'PHASE_NUM' && Object.prototype.hasOwnProperty.call(body, key)) {
        phases[idx][key] = body[key];
      }
    }
    await dataLoader.saveData('phases.json', phases);
    const terms = await dataLoader.loadData('terms.json');
    const enriched = { ...phases[idx] };
    if (enriched.PHASE_NAME_ID) {
      const t = terms.find(x => x.id === enriched.PHASE_NAME_ID);
      enriched.name = resolveTermName(t) || `Phase ${enriched.PHASE_NUM}`;
    } else {
      enriched.name = `Phase ${enriched.PHASE_NUM}`;
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

router.delete('/competitions/:id/seasons/:seasonNum/phases/:phaseNum', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const phaseNum = parseInt(req.params.phaseNum, 10);
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(phaseNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition, season or phase' });
    }
    const phases = await dataLoader.loadData('phases.json');
    const newPhases = phases.filter(p => !(p.COMPETITION_ID === cid && p.SEASON_NUM === seasonNum && p.PHASE_NUM === phaseNum));
    if (newPhases.length === phases.length) {
      return res.status(404).json({ success: false, error: 'Phase not found' });
    }
    await dataLoader.saveData('phases.json', newPhases);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Season competitors (competition+season) ---
// GET season-competitors: optional ?competitionId=&seasonNum= → filter + enrich with competitor name + country
router.get('/season-competitors', async (req, res, next) => {
  try {
    const [rows, competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('season_competitors.json'),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);
    let filtered = rows;
    const competitionId = req.query.competitionId;
    const seasonNum = req.query.seasonNum;
    if (competitionId != null && competitionId !== '' && seasonNum != null && seasonNum !== '') {
      const cid = parseInt(competitionId, 10);
      const sn = parseInt(seasonNum, 10);
      if (!isNaN(cid) && !isNaN(sn)) {
        filtered = rows.filter(r => Number(r.COMPETITION_ID) === cid && Number(r.SEASON_NUM) === sn);
      } else {
        filtered = [];
      }
    }
    const enriched = filtered.map(r => {
      const out = { ...r };
      const comp = competitors.find(c => c.COMPETITOR_ID === r.COMPETITOR_ID);
      if (comp && comp.NAME_ID) {
        const t = terms.find(x => x.id === comp.NAME_ID);
        out.name = resolveTermName(t) || `Competitor ${r.COMPETITOR_ID}`;
      } else {
        out.name = comp ? `Competitor ${r.COMPETITOR_ID}` : null;
      }
      if (comp && comp.COUNTRY_ID != null) {
        out.COUNTRY_ID = comp.COUNTRY_ID;
        const co = countries.find(x => x.COUNTRY_ID === comp.COUNTRY_ID);
        out.countryName = co ? co.name : null;
      }
      if (comp) {
        out.logoUrl = comp.LIGHT_IMAGE_URL || comp.DARK_IMAGE_URL || null;
      }
      if (out.NOT_IN_SEASON === undefined) out.NOT_IN_SEASON = false;
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// POST add competitors to season; body: { COMPETITOR_ID } or { COMPETITOR_IDS: [1,2,3] }
router.post('/competitions/:id/seasons/:seasonNum/competitors', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition or season' });
    }
    let ids = [];
    if (body.COMPETITOR_IDS && Array.isArray(body.COMPETITOR_IDS)) {
      ids = body.COMPETITOR_IDS.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    } else if (body.COMPETITOR_ID != null) {
      const one = parseInt(body.COMPETITOR_ID, 10);
      if (!isNaN(one)) ids = [one];
    }
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'COMPETITOR_ID or COMPETITOR_IDS required' });
    }
    const [schemaDefaults, rows] = await Promise.all([
      getSeasonCompetitorDefaultsFromSchema(),
      dataLoader.loadData('season_competitors.json')
    ]);
    const existing = new Set(rows.filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum).map(r => r.COMPETITOR_ID));
    const toAdd = ids.filter(i => !existing.has(i));
    for (const compId of toAdd) {
      const newRow = { ...schemaDefaults, COMPETITION_ID: cid, SEASON_NUM: seasonNum, COMPETITOR_ID: compId };
      rows.push(newRow);
      existing.add(compId);
    }
    await dataLoader.saveData('season_competitors.json', rows);
    res.status(201).json({ success: true, added: toAdd.length, data: toAdd });
  } catch (error) {
    next(error);
  }
});

// PUT update season competitor (STATUS, SEED, HOST, JOIN_TYPE, ORIGIN_COMPETITION_ID) — 2f.4
router.put('/competitions/:id/seasons/:seasonNum/competitors/:competitorId', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const competitorId = parseInt(req.params.competitorId, 10);
    const body = req.body || {};
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(competitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid competition, season or competitor' });
    }
    const [rows, competitions] = await Promise.all([
      dataLoader.loadData('season_competitors.json'),
      dataLoader.loadData('competitions.json'),
    ]);
    const row = rows.find(r => r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum && r.COMPETITOR_ID === competitorId);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Competitor not in season' });
    }
    const currentComp = competitions.find(c => Number(c.COMPETITION_ID) === cid);
    if (!currentComp) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    if (body.STATUS !== undefined) row.STATUS = body.STATUS == null || body.STATUS === '' ? null : Number(body.STATUS);
    if (body.SEED !== undefined) row.SEED = body.SEED == null || body.SEED === '' ? null : Number(body.SEED);
    if (body.NOT_IN_SEASON !== undefined) row.NOT_IN_SEASON = !!body.NOT_IN_SEASON;
    if (body.HOST !== undefined) row.HOST = !!body.HOST;
    const newJoinType = body.JOIN_TYPE !== undefined ? (body.JOIN_TYPE == null || body.JOIN_TYPE === '' ? 0 : Number(body.JOIN_TYPE)) : row.JOIN_TYPE;
    row.JOIN_TYPE = newJoinType;

    // Auto-set ORIGIN_COMPETITION_ID for Promoted (1) / Relegated (2)
    if (newJoinType === 1 || newJoinType === 2) {
      const countryId = Number(currentComp.COUNTRY_ID);
      const sportTypeId = Number(currentComp.SPORT_TYPE_ID);
      const gender = currentComp.GENDER;
      const currentTier = Number(currentComp.TIER) || 0;
      const targetTier = newJoinType === 1 ? currentTier + 1 : currentTier - 1; // Promoted: from lower tier (higher num). Relegated: from higher tier (lower num)
      const matches = competitions.filter(
        c =>
          Number(c.COMPETITION_ID) !== cid &&
          Number(c.COUNTRY_ID) === countryId &&
          Number(c.SPORT_TYPE_ID) === sportTypeId &&
          Number(c.GENDER) === Number(gender) &&
          (Number(c.TIER) || 0) === targetTier &&
          !c.IS_DELETED
      );
      if (matches.length > 1) {
        return res.status(400).json({
          success: false,
          error: `Multiple competitions found with same country, sport, gender and tier ${targetTier}. Cannot determine ORIGIN_COMPETITION_ID automatically.`,
        });
      }
      if (matches.length === 0) {
        const tierDesc = newJoinType === 1 ? 'lower' : 'higher';
        return res.status(400).json({
          success: false,
          error: `No competition found with ${tierDesc} tier (tier ${targetTier}) in same country, sport and gender.`,
        });
      }
      row.ORIGIN_COMPETITION_ID = matches[0].COMPETITION_ID;
    } else {
      row.ORIGIN_COMPETITION_ID = null;
    }

    await dataLoader.saveData('season_competitors.json', rows);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

// DELETE remove competitor from season
router.delete('/competitions/:id/seasons/:seasonNum/competitors/:competitorId', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const competitorId = parseInt(req.params.competitorId, 10);
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum) || isNaN(competitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid competition, season or competitor' });
    }
    const rows = await dataLoader.loadData('season_competitors.json');
    const newRows = rows.filter(r => !(r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum && r.COMPETITOR_ID === competitorId));
    if (newRows.length === rows.length) {
      return res.status(404).json({ success: false, error: 'Competitor not in season' });
    }
    await dataLoader.saveData('season_competitors.json', newRows);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE remove competitors from ALL seasons of this competition
router.delete('/competitions/:id/competitors/all-seasons', async (req, res, next) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    const body = req.body || {};
    let ids = [];
    if (body.COMPETITOR_IDS && Array.isArray(body.COMPETITOR_IDS)) {
      ids = body.COMPETITOR_IDS.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    } else if (body.COMPETITOR_ID != null) {
      const one = parseInt(body.COMPETITOR_ID, 10);
      if (!isNaN(one)) ids = [one];
    }
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'COMPETITOR_ID or COMPETITOR_IDS required' });
    }
    const rows = await dataLoader.loadData('season_competitors.json');
    const idSet = new Set(ids);
    const newRows = rows.filter(r => !(r.COMPETITION_ID === competitionId && idSet.has(r.COMPETITOR_ID)));
    const removed = rows.length - newRows.length;
    await dataLoader.saveData('season_competitors.json', newRows);
    res.json({ success: true, removed });
  } catch (error) {
    next(error);
  }
});

// GET competitors not in this competition+season; same sport; optional ?countryId=&name=&sourceCompetitionId=
router.get('/competitions/:id/seasons/:seasonNum/competitors/not-in-season', async (req, res, next) => {
  try {
    const competitionId = req.params.id;
    const seasonNum = parseInt(req.params.seasonNum, 10);
    const countryId = req.query.countryId != null && req.query.countryId !== '' ? parseInt(req.query.countryId, 10) : null;
    const sourceCompetitionId = req.query.sourceCompetitionId != null && req.query.sourceCompetitionId !== '' ? parseInt(req.query.sourceCompetitionId, 10) : null;
    const nameSub = (req.query.name || '').trim().toLowerCase();
    const cid = parseInt(competitionId, 10);
    if (isNaN(cid) || isNaN(seasonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid competition or season' });
    }
    const [competitions, competitors, terms, countries, scRows] = await Promise.all([
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('season_competitors.json')
    ]);
    const comp = competitions.find(c => Number(c.COMPETITION_ID) === cid);
    if (!comp) return res.status(404).json({ success: false, error: 'Competition not found' });
    const sportTypeId = comp.SPORT_TYPE_ID;
    const inSeason = new Set(
      scRows.filter(r => r.COMPETITION_ID === cid && r.SEASON_NUM === seasonNum).map(r => r.COMPETITOR_ID)
    );
    let list = competitors.filter(c => Number(c.SPORT_TYPE_ID) === sportTypeId && !inSeason.has(c.COMPETITOR_ID));
    if (sourceCompetitionId != null && !isNaN(sourceCompetitionId)) {
      const inSourceCompetition = new Set(
        scRows.filter(r => r.COMPETITION_ID === sourceCompetitionId).map(r => r.COMPETITOR_ID)
      );
      list = list.filter(c => inSourceCompetition.has(c.COMPETITOR_ID));
    }
    if (countryId != null && !isNaN(countryId)) {
      list = list.filter(c => c.COUNTRY_ID === countryId);
    }
    if (nameSub) {
      const nameMatches = (c) => {
        if (!c.NAME_ID) return false;
        const t = terms.find(x => x.id === c.NAME_ID);
        const n = resolveTermName(t) || '';
        return n.toLowerCase().includes(nameSub);
      };
      list = list.filter(nameMatches);
    }
    const enriched = list.map(c => {
      const out = { ...c };
      if (c.NAME_ID) {
        const t = terms.find(x => x.id === c.NAME_ID);
        out.name = resolveTermName(t) || `Competitor ${c.COMPETITOR_ID}`;
      } else {
        out.name = `Competitor ${c.COMPETITOR_ID}`;
      }
      if (c.COUNTRY_ID) {
        const co = countries.find(x => x.COUNTRY_ID === c.COUNTRY_ID);
        out.countryName = co ? co.name : null;
      }
      out.logoUrl = c.LIGHT_IMAGE_URL || c.DARK_IMAGE_URL || null;
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Get all languages
router.get('/languages', async (req, res, next) => {
  try {
    const languages = await dataLoader.loadData('languages.json');
    res.json({ success: true, data: languages });
  } catch (error) {
    next(error);
  }
});

// Get all sports
router.get('/sports', async (req, res, next) => {
  try {
    const sports = await dataLoader.loadData('sports.json');
    res.json({ success: true, data: sports });
  } catch (error) {
    next(error);
  }
});

// Get all athletes positions
router.get('/athletes-positions', async (req, res, next) => {
  try {
    const positions = await dataLoader.loadData('athletes_positions.json');
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
});

// Get all athlete status types
router.get('/athlete-statuses', async (req, res, next) => {
  try {
    const statuses = await dataLoader.loadData('athlete_statuses.json');
    res.json({ success: true, data: statuses });
  } catch (error) {
    next(error);
  }
});

router.get('/genders', async (req, res, next) => {
  try {
    const genders = await dataLoader.loadData('genders.json');
    res.json({ success: true, data: genders || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/competition-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('competition_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/standing-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('standing_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/stages-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('stages_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/sub-sport-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('sub_sport_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/competitor-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('competitor_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/priority-levels', async (req, res, next) => {
  try {
    const levels = await dataLoader.loadData('priority_levels.json');
    res.json({ success: true, data: levels || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/update-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('update_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

// Get all statistics types
router.get('/statistics-types', async (req, res, next) => {
  try {
    const statisticsTypes = await dataLoader.loadData('athlete_statistics_types.json');
    res.json({ success: true, data: statisticsTypes });
  } catch (error) {
    next(error);
  }
});

// Get all seasons (optionally by competitionId), enriched with name from terms
router.get('/seasons', async (req, res, next) => {
  try {
    const competitionId = req.query.competitionId;
    const [seasons, terms] = await Promise.all([
      dataLoader.loadData('seasons.json'),
      dataLoader.loadData('terms.json')
    ]);
    let filtered = seasons;
    if (competitionId != null && competitionId !== '') {
      const cid = parseInt(competitionId, 10);
      filtered = isNaN(cid) ? [] : seasons.filter(s => Number(s.COMPETITION_ID) === cid);
    }
    const enriched = filtered.map(s => {
      const out = { ...s };
      if (s.NAME_ID) {
        const t = terms.find(x => x.id === s.NAME_ID);
        out.name = resolveTermName(t) || `Season ${s.SEASON_NUM}`;
      } else {
        out.name = `Season ${s.SEASON_NUM}`;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Get stages for a competition+season (enriched with name)
router.get('/stages', async (req, res, next) => {
  try {
    const competitionId = req.query.competitionId;
    const seasonNum = req.query.seasonNum;
    const [stages, terms] = await Promise.all([
      dataLoader.loadData('stages.json'),
      dataLoader.loadData('terms.json')
    ]);
    let filtered = stages;
    if (competitionId != null && competitionId !== '' && seasonNum != null && seasonNum !== '') {
      const cid = parseInt(competitionId, 10);
      const sn = parseInt(seasonNum, 10);
      if (!isNaN(cid) && !isNaN(sn)) {
        filtered = stages.filter(x => Number(x.COMPETITION_ID) === cid && Number(x.SEASON_NUM) === sn);
      } else {
        filtered = [];
      }
    }
    const enriched = filtered.map(s => {
      const out = { ...s };
      if (s.NAME_ID) {
        const t = terms.find(x => x.id === s.NAME_ID);
        out.name = resolveTermName(t) || `Stage ${s.STAGE_NUM}`;
      } else {
        out.name = `Stage ${s.STAGE_NUM}`;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Get groups for a competition+season+stage (enriched with name)
router.get('/groups', async (req, res, next) => {
  try {
    const competitionId = req.query.competitionId;
    const seasonNum = req.query.seasonNum;
    const stageNum = req.query.stageNum;
    const [groups, terms] = await Promise.all([
      dataLoader.loadData('groups.json'),
      dataLoader.loadData('terms.json')
    ]);
    let filtered = groups;
    if (competitionId != null && competitionId !== '' && seasonNum != null && seasonNum !== '' && stageNum != null && stageNum !== '') {
      const cid = parseInt(competitionId, 10);
      const sn = parseInt(seasonNum, 10);
      const stn = parseInt(stageNum, 10);
      if (!isNaN(cid) && !isNaN(sn) && !isNaN(stn)) {
        filtered = groups.filter(x =>
          Number(x.COMPETITION_ID) === cid && Number(x.SEASON_NUM) === sn && Number(x.STAGE_NUM) === stn
        );
      } else {
        filtered = [];
      }
    }
    const enriched = filtered.map(g => {
      const out = { ...g };
      if (g.NAME_ID) {
        const t = terms.find(x => x.id === g.NAME_ID);
        out.name = resolveTermName(t) || `Group ${g.GROUP_NUM}`;
      } else {
        out.name = `Group ${g.GROUP_NUM}`;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Get phases for a competition+season (enriched with name from PHASE_NAME_ID)
router.get('/phases', async (req, res, next) => {
  try {
    const competitionId = req.query.competitionId;
    const seasonNum = req.query.seasonNum;
    const [phases, terms] = await Promise.all([
      dataLoader.loadData('phases.json'),
      dataLoader.loadData('terms.json')
    ]);
    let filtered = phases;
    if (competitionId != null && competitionId !== '' && seasonNum != null && seasonNum !== '') {
      const cid = parseInt(competitionId, 10);
      const sn = parseInt(seasonNum, 10);
      if (!isNaN(cid) && !isNaN(sn)) {
        filtered = phases.filter(x => Number(x.COMPETITION_ID) === cid && Number(x.SEASON_NUM) === sn);
      } else {
        filtered = [];
      }
    }
    const enriched = filtered.map(p => {
      const out = { ...p };
      if (p.PHASE_NAME_ID) {
        const t = terms.find(x => x.id === p.PHASE_NAME_ID);
        out.name = resolveTermName(t) || `Phase ${p.PHASE_NUM}`;
      } else {
        out.name = `Phase ${p.PHASE_NUM}`;
      }
      return out;
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Get table settings (field options for table order / standings)
router.get('/table-settings', async (req, res, next) => {
  try {
    const tableSettings = await dataLoader.loadData('table_settings.json');
    res.json({ success: true, data: tableSettings || [] });
  } catch (error) {
    next(error);
  }
});

// Get buzz item types (for competition BUZZ_ITEM_TYPE dropdown)
router.get('/buzz-item-types', async (req, res, next) => {
  try {
    const buzzItemTypes = await dataLoader.loadData('buzz_item_types.json');
    res.json({ success: true, data: buzzItemTypes || [] });
  } catch (error) {
    next(error);
  }
});

// Get all surfaces (tennis, basketball, football, swimming, etc.)
router.get('/surfaces', async (req, res, next) => {
  try {
    const surfaces = await dataLoader.loadData('surfaces.json');
    res.json({ success: true, data: surfaces });
  } catch (error) {
    next(error);
  }
});

// Get all tennis backhand types
router.get('/tennis-backhand-types', async (req, res, next) => {
  try {
    const backhandTypes = await dataLoader.loadData('tennis_backhand_types.json');
    res.json({ success: true, data: backhandTypes });
  } catch (error) {
    next(error);
  }
});

// Get all currencies
router.get('/currencies', async (req, res, next) => {
  try {
    const currencies = await dataLoader.loadData('currencies.json');
    res.json({ success: true, data: currencies });
  } catch (error) {
    next(error);
  }
});

// Get all venues with enrichment
router.get('/venues', async (req, res, next) => {
  try {
    const [venues, terms] = await Promise.all([
      dataLoader.loadData('venues.json'),
      dataLoader.loadData('terms.json')
    ]);

    const enrichedVenues = venues.map(venue => {
      const enriched = { ...venue };
      
      // Resolve name from terms
      if (venue.NAME_ID) {
        const nameTerm = terms.find(t => t.id === venue.NAME_ID);
        enriched.name = resolveTermName(nameTerm) || `Venue ${venue.VENUE_ID}`;
      } else {
        enriched.name = `Venue ${venue.VENUE_ID}`;
      }
      
      return enriched;
    });

    res.json({ success: true, data: enrichedVenues });
  } catch (error) {
    next(error);
  }
});

router.get('/tv-network-types', async (req, res, next) => {
  try {
    const types = await dataLoader.loadData('tv_networks_types.json');
    res.json({ success: true, data: types || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
