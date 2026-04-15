const dataLoader = require('../utils/dataLoader');
const path = require('path');

/**
 * Load schema defaults for a new game
 */
function getSchemaDefaults() {
  try {
    const schemaPath = path.join(__dirname, '../data/schemas/games.schema.json');
    const schema = require(schemaPath);
    const defaults = {};
    for (const [key, def] of Object.entries(schema)) {
      if (def && typeof def === 'object' && 'default' in def) {
        defaults[key] = def.default;
      }
    }
    return defaults;
  } catch (e) {
    return {};
  }
}

/**
 * Game Controller - CRUD for games (read from/write to games.json)
 */
class GameController {
  /**
   * Get all games (optionally filtered by query params)
   */
  async getAll(req, res, next) {
    try {
      const {
        countryId,
        sportId,
        competitionId,
        teamId,
        gameId,
        searchPartnerId,
        dateFrom,
        dateTo,
        hideDeleted
      } = req.query;

      let games = await dataLoader.loadData('games.json');
      if (!Array.isArray(games)) games = [];

      // Hide deleted
      if (hideDeleted === 'true' || hideDeleted === true) {
        games = games.filter(g => !g.IS_DELETED);
      }

      // Filter by gameId
      if (gameId && String(gameId).trim()) {
        const id = parseInt(gameId);
        if (!isNaN(id)) {
          games = games.filter(g => (g.GAME_ID || g.gameId) === id);
        }
      }

      // Filter by searchPartnerId (e.g. external partner ID - filter by GAME_KEY or similar)
      if (searchPartnerId && String(searchPartnerId).trim()) {
        const term = String(searchPartnerId).trim().toLowerCase();
        games = games.filter(g => {
          const key = (g.GAME_KEY || g.gameKey || '').toString();
          return key.toLowerCase().includes(term);
        });
      }

      // Filter by date range
      if (dateFrom && dateFrom.trim()) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) {
          games = games.filter(g => new Date(g.STARTTIME || g.startTime) >= from);
        }
      }
      if (dateTo && dateTo.trim()) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) {
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          games = games.filter(g => new Date(g.STARTTIME || g.startTime) <= endOfDay);
        }
      }

      // Filter by competitionId
      if (competitionId && String(competitionId).trim()) {
        const cid = parseInt(competitionId);
        if (!isNaN(cid)) {
          games = games.filter(g => (g.COMPETITION_ID || g.competitionId) === cid);
        }
      }

      // Filter by sportId (SPORTTYPE_ID)
      if (sportId && String(sportId).trim()) {
        const sid = parseInt(sportId);
        if (!isNaN(sid)) {
          games = games.filter(g => (g.SPORTTYPE_ID ?? g.sportTypeId ?? 1) === sid);
        }
      }

      // Filter by countryId (via competition)
      if (countryId && String(countryId).trim()) {
        const countries = await dataLoader.loadData('competitions.json').catch(() => []);
        const compsInCountry = (countries || []).filter(c => (c.COUNTRY_ID || c.countryId) === parseInt(countryId));
        const compIds = new Set(compsInCountry.map(c => c.COMPETITION_ID || c.competitionId));
        games = games.filter(g => compIds.has(g.COMPETITION_ID || g.competitionId));
      }

      // Filter by teamId (competitor) - GAME_KEY format "101-102" means competitor 101 vs 102
      if (teamId && String(teamId).trim()) {
        const tid = String(teamId).trim();
        games = games.filter(g => {
          const key = (g.GAME_KEY || g.gameKey || '').toString();
          const parts = key.split('-');
          return parts.some(p => p.trim() === tid);
        });
      }

      res.json({
        success: true,
        data: games
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get updates log for a game (investigation/debug)
   * Query params: freeText, source, updateType, dateFrom, dateTo
   * Search runs server-side only when filters are passed.
   */
  async getUpdates(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid game ID' }
        });
      }

      const { freeText, source, updateType, dateFrom, dateTo } = req.query;
      const sourceIds = [].concat(source || []).filter(Boolean).map(s => String(s).trim()).filter(Boolean);
      const updateTypeValues = [].concat(updateType || []).filter(Boolean).map(t => String(t).trim()).filter(Boolean);

      let updates = await dataLoader.loadData('game_updates.json');
      if (!Array.isArray(updates)) updates = [];
      updates = updates.filter(u => (u.GAME_ID ?? u.gameId) === gameId);
      updates = updates.sort((a, b) => new Date(b.CREATED || 0) - new Date(a.CREATED || 0));

      const uniqueSourceIds = [...new Set(updates.map(u => u.DATA_SOURCE_ID).filter(v => v != null && String(v) !== ''))].map(String).sort();
      const createdDates = updates.map(u => u.CREATED).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      const minCreated = createdDates.length ? new Date(Math.min(...createdDates)) : null;
      const maxCreated = createdDates.length ? new Date(Math.max(...createdDates)) : null;
      const sourceNames = {};
      const dataSources = await dataLoader.loadData('data_sources.json').catch(() => []);
      const dsArray = Array.isArray(dataSources) ? dataSources : [];
      dsArray.forEach(ds => {
        const id = String(ds.DATA_SOURCE_ID ?? '');
        if (id && ds.ALIAS_NAME) sourceNames[id] = ds.ALIAS_NAME;
      });
      uniqueSourceIds.forEach(id => {
        if (!sourceNames[id]) {
          const u = updates.find(x => String(x.DATA_SOURCE_ID || '') === id);
          if (u?.UPDATE_TEXT) {
            const m = String(u.UPDATE_TEXT).match(/Data Source:\s*([^=]+?)\s*=>\s*\d+/);
            if (m) sourceNames[id] = m[1].trim();
          }
        }
      });

      // Build updateTypes from the 3-file join:
      // game_updates.CREATED_SEQUENCE -> updates.UPDATE_SEQUENCE -> updates.UPDATE_TYPE -> update_types.ALIAS_NAME
      const sequencesInGame = new Set(
        updates
          .map(u => u.CREATED_SEQUENCE)
          .filter(v => v != null && Number(v) > 0)
      );

      let updateTypesList = [];
      const sequenceToUpdateTypes = {};
      if (sequencesInGame.size > 0) {
        const allUpdates = await dataLoader.loadData('updates.json').catch(() => []);
        const updatesArr = Array.isArray(allUpdates) ? allUpdates : [];
        const updateTypeIds = new Set();
        for (const rec of updatesArr) {
          if (sequencesInGame.has(rec.UPDATE_SEQUENCE)) {
            if (rec.UPDATE_TYPE != null) {
              updateTypeIds.add(rec.UPDATE_TYPE);
              if (!sequenceToUpdateTypes[rec.UPDATE_SEQUENCE]) {
                sequenceToUpdateTypes[rec.UPDATE_SEQUENCE] = new Set();
              }
              sequenceToUpdateTypes[rec.UPDATE_SEQUENCE].add(rec.UPDATE_TYPE);
            }
          }
        }

        if (updateTypeIds.size > 0) {
          const allUpdateTypes = await dataLoader.loadData('update_types.json').catch(() => []);
          const utArr = Array.isArray(allUpdateTypes) ? allUpdateTypes : [];
          const utMap = {};
          for (const ut of utArr) {
            utMap[ut.UPDATE_TYPE_ID] = ut.ALIAS_NAME || `Type ${ut.UPDATE_TYPE_ID}`;
          }
          updateTypesList = [...updateTypeIds]
            .map(id => ({ id, name: utMap[id] || `Type ${id}` }))
            .sort((a, b) => a.name.localeCompare(b.name));
        }
      }

      const filterOptions = {
        sources: uniqueSourceIds,
        updateTypes: updateTypesList,
        sourceNames,
        dateFrom: minCreated ? minCreated.toISOString().slice(0, 10) : null,
        dateTo: maxCreated ? maxCreated.toISOString().slice(0, 10) : null
      };

      if (freeText && String(freeText).trim().length >= 3) {
        const term = String(freeText).trim().toLowerCase();
        updates = updates.filter(u => (u.UPDATE_TEXT || '').toLowerCase().includes(term));
      }
      if (sourceIds.length > 0) {
        updates = updates.filter(u => sourceIds.includes(String(u.DATA_SOURCE_ID || '')));
      }
      if (updateTypeValues.length > 0) {
        const selectedTypeIds = new Set(updateTypeValues.map(v => Number(v)));
        updates = updates.filter(u => {
          const seq = u.CREATED_SEQUENCE;
          if (seq == null || Number(seq) <= 0) return false;
          const types = sequenceToUpdateTypes[seq];
          if (!types) return false;
          for (const t of types) {
            if (selectedTypeIds.has(t)) return true;
          }
          return false;
        });
      }
      if (dateFrom && dateFrom.trim()) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        updates = updates.filter(u => new Date(u.CREATED || 0) >= from);
      }
      if (dateTo && dateTo.trim()) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        updates = updates.filter(u => new Date(u.CREATED || 0) <= to);
      }

      res.json({
        success: true,
        data: updates,
        filterOptions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get game by ID
   */
  async getById(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid game ID' }
        });
      }

      const games = await dataLoader.loadData('games.json');
      const game = (games || []).find(g => (g.GAME_ID ?? g.gameId) === gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: { message: `Game with ID ${gameId} not found` }
        });
      }

      res.json({
        success: true,
        data: game
      });
    } catch (error) {
      next(error);
    }
  }

  async getScoreLog(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) return res.status(400).json({ success: false, error: { message: 'Invalid game ID' } });
      let rows = await dataLoader.loadData('data_sources_game_score_updates_log.json');
      if (!Array.isArray(rows)) rows = [];
      rows = rows.filter(r => r.GAME_ID === gameId);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async getStatusLog(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) return res.status(400).json({ success: false, error: { message: 'Invalid game ID' } });
      let rows = await dataLoader.loadData('data_sources_game_status_updates_log.json');
      if (!Array.isArray(rows)) rows = [];
      rows = rows.filter(r => r.GAME_ID === gameId);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async getEventsLog(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) return res.status(400).json({ success: false, error: { message: 'Invalid game ID' } });
      let rows = await dataLoader.loadData('data_sources_game_events_updates_log.json');
      if (!Array.isArray(rows)) rows = [];
      rows = rows.filter(r => r.GAME_ID === gameId);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  /**
   * Create a new game
   */
  async create(req, res, next) {
    try {
      const body = req.body;

      // Required fields validation
      const competitionId = body.COMPETITION_ID != null ? parseInt(body.COMPETITION_ID) : body.competitionId;
      const seasonNum = body.SEASON_NUM != null ? parseInt(body.SEASON_NUM) : body.seasonNum;
      const stageNum = body.STAGE_NUM != null ? parseInt(body.STAGE_NUM) : body.stageNum;
      const venueId = body.VENUE_ID != null ? parseInt(body.VENUE_ID) : body.venueId;
      const roundNum = body.ROUND_NUM != null ? parseInt(body.ROUND_NUM) : body.roundNum;
      const gameKey = String(body.GAME_KEY ?? body.gameKey ?? '').trim();
      const homeCompetitorNum = body.HOME_COMPETITOR_NUM != null ? parseInt(body.HOME_COMPETITOR_NUM) : body.homeCompetitorNum;

      if (!competitionId || isNaN(competitionId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'COMPETITION_ID is required' }
        });
      }
      if (seasonNum == null || isNaN(seasonNum)) {
        return res.status(400).json({
          success: false,
          error: { message: 'SEASON_NUM is required' }
        });
      }
      if (stageNum == null || isNaN(stageNum)) {
        return res.status(400).json({
          success: false,
          error: { message: 'STAGE_NUM is required' }
        });
      }
      if (!venueId || isNaN(venueId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'VENUE_ID is required' }
        });
      }
      if (roundNum == null || isNaN(roundNum)) {
        return res.status(400).json({
          success: false,
          error: { message: 'ROUND_NUM is required' }
        });
      }
      if (!gameKey) {
        return res.status(400).json({
          success: false,
          error: { message: 'GAME_KEY is required' }
        });
      }

      let startTime = body.STARTTIME ?? body.startTime;
      if (!startTime || startTime === '0001-01-01T00:00:00.000Z') {
        return res.status(400).json({
          success: false,
          error: { message: 'STARTTIME is required' }
        });
      }
      const startDate = new Date(startTime);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: { message: 'STARTTIME must be a valid date' }
        });
      }

      const games = await dataLoader.loadData('games.json');
      const arr = Array.isArray(games) ? games : [];

      // Check GAME_KEY uniqueness
      if (arr.some(g => (g.GAME_KEY || g.gameKey || '') === gameKey)) {
        return res.status(400).json({
          success: false,
          error: { message: `Game with GAME_KEY "${gameKey}" already exists` }
        });
      }

      const maxId = arr.length > 0 ? Math.max(...arr.map(g => g.GAME_ID || g.gameId || 0)) : 0;
      const newGameId = maxId + 1;

      const schemaDefaults = getSchemaDefaults();
      const sportTypeId = body.SPORTTYPE_ID != null ? parseInt(body.SPORTTYPE_ID) : (body.sportTypeId ?? schemaDefaults.SPORTTYPE_ID ?? 1);
      const gameTime = body.GAMETIME != null ? parseInt(body.GAMETIME) : (body.gameTime ?? schemaDefaults.GAMETIME ?? 90);
      const status = body.STATUS != null ? body.STATUS : (body.status ?? schemaDefaults.STATUS ?? 2);

      const newGame = {
        ...schemaDefaults,
        GAME_ID: newGameId,
        COMPETITION_ID: competitionId,
        SEASON_NUM: seasonNum,
        STAGE_NUM: stageNum,
        STARTTIME: startDate.toISOString(),
        STATUS: status,
        GAMETIME: gameTime,
        HOME_COMPETITOR_NUM: homeCompetitorNum ?? 0,
        SPORTTYPE_ID: sportTypeId,
        VENUE_ID: venueId,
        ROUND_NUM: roundNum,
        GAME_KEY: gameKey,
        IS_DELETED: false
      };

      arr.push(newGame);
      await dataLoader.saveData('games.json', arr);

      res.status(201).json({
        success: true,
        data: newGame
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GameController();
