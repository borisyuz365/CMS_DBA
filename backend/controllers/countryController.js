const dataLoader = require('../utils/dataLoader');

/**
 * Country Controller - CRUD for countries (read from/write to countries.json)
 */
class CountryController {
  /**
   * Get all countries (optionally filtered by query params)
   */
  async getAll(req, res, next) {
    try {
      const { countryId, countryCode, name } = req.query;
      let countries = await dataLoader.loadData('countries.json');

      if (countryId) {
        const id = parseInt(countryId);
        if (!isNaN(id)) {
          countries = countries.filter(c => c.COUNTRY_ID === id);
        }
      }
      if (countryCode && countryCode.trim()) {
        const code = countryCode.trim().toLowerCase();
        countries = countries.filter(c => (c.COUNTRY_CODE || '').toLowerCase().includes(code));
      }
      if (name && name.trim()) {
        const searchName = name.trim().toLowerCase();
        countries = countries.filter(c => (c.name || '').toLowerCase().includes(searchName));
      }

      res.json({
        success: true,
        data: countries
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get country by ID
   */
  async getById(req, res, next) {
    try {
      const countryId = parseInt(req.params.id);
      if (isNaN(countryId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid country ID' }
        });
      }

      const countries = await dataLoader.loadData('countries.json');
      const country = countries.find(c => c.COUNTRY_ID === countryId);

      if (!country) {
        return res.status(404).json({
          success: false,
          error: { message: `Country with ID ${countryId} not found` }
        });
      }

      res.json({
        success: true,
        data: country
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple countries (bulk update)
   */
  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body; // Array of { countryId, changes }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid updates array' }
        });
      }

      const countries = await dataLoader.loadData('countries.json');
      let updatedCount = 0;
      const errors = [];

      const allowedFields = [
        'NAME_ID', 'COUNTRY_CODE', 'TIME_ZONE_ID', 'FATHER_COUNTRY_ID', 'IS_NOT_REAL',
        'ALLOW_BETTING', 'EMOJI', 'CONNECT_BY_TEXT', 'ALLOW_PREMIUM_INSIGHTS',
        'TRANSFER_SEASON_ACTIVE', 'PHONE_CODE', 'ALLOW_BETS_IN_ALL_SCORES', 'LOGIN_AVAILABLE',
        'MAIN_COLOR', 'SECONDARY_COLOR', 'IMG_VER', 'PLATFORM', 'FORCE_RAFFLE_TOP_BOOKMAKER',
        'ALLOW_SUB_TERRITORY_DETECTION', 'ODDS_TYPE', 'TYPE', 'CONTINENT_ID',
        'BLOCK_LIVE_BETTING', 'CURRENCY_SYMBOL', 'ALLOW_PREMIUM_USERS',
        'MIN_USERS_FOR_MOST_POPULAR_BET', 'MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS',
        'LINEUPS_BET_VALUE', 'BET_VALUE', 'name', 'IS_DELETED', 'COUNTRY_IMAGE_URL'
      ];

      for (const update of updates) {
        const { countryId, changes } = update;

        if (!countryId || !changes || typeof changes !== 'object') {
          errors.push({ countryId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(countryId);
        const idx = countries.findIndex(c => c.COUNTRY_ID === id);
        if (idx === -1) {
          errors.push({ countryId: id, error: 'Country not found' });
          continue;
        }

        const country = countries[idx];
        for (const [key, value] of Object.entries(changes)) {
          if (!allowedFields.includes(key)) continue;
          if (key === 'COUNTRY_ID') continue; // immutable
          if (['TIME_ZONE_ID', 'FATHER_COUNTRY_ID', 'NAME_ID', 'CONTINENT_ID', 'ODDS_TYPE', 'IMG_VER'].includes(key)) {
            country[key] = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
          } else if (['MAIN_COLOR', 'SECONDARY_COLOR', 'MIN_USERS_FOR_MOST_POPULAR_BET', 'MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS', 'LINEUPS_BET_VALUE', 'BET_VALUE'].includes(key)) {
            country[key] = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
          } else if (['IS_NOT_REAL', 'ALLOW_BETTING', 'CONNECT_BY_TEXT', 'ALLOW_PREMIUM_INSIGHTS', 'ALLOW_BETS_IN_ALL_SCORES', 'LOGIN_AVAILABLE', 'BLOCK_LIVE_BETTING', 'ALLOW_SUB_TERRITORY_DETECTION', 'IS_DELETED'].includes(key)) {
            country[key] = value === true || value === 'true' || value === 1;
          } else {
            country[key] = value === '' ? null : value;
          }
        }
        updatedCount++;
      }

      await dataLoader.saveData('countries.json', countries);

      res.json({
        success: true,
        data: {
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete country by ID.
   * Referential integrity (5.6): refuse if any competition uses this country.
   */
  async delete(req, res, next) {
    try {
      const countryId = parseInt(req.params.id);
      if (isNaN(countryId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid country ID' }
        });
      }

      const [countries, competitions] = await Promise.all([
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => [])
      ]);

      const inUse = Array.isArray(competitions) && competitions.some(
        c => c.COUNTRY_ID != null && Number(c.COUNTRY_ID) === countryId
      );
      if (inUse) {
        return res.status(409).json({
          success: false,
          error: { message: 'Cannot delete country: it is used by one or more competitions.' }
        });
      }

      const idx = countries.findIndex(c => c.COUNTRY_ID === countryId);
      if (idx === -1) {
        return res.status(404).json({
          success: false,
          error: { message: `Country with ID ${countryId} not found` }
        });
      }

      countries.splice(idx, 1);
      await dataLoader.saveData('countries.json', countries);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new country
   */
  async create(req, res, next) {
    try {
      const body = req.body;

      // Validate required: name and COUNTRY_CODE
      if (!body.name || (body.name && typeof body.name === 'string' && !body.name.trim())) {
        return res.status(400).json({
          success: false,
          error: { message: 'name is required' }
        });
      }
      if (!body.COUNTRY_CODE || (body.COUNTRY_CODE && typeof body.COUNTRY_CODE === 'string' && !body.COUNTRY_CODE.trim())) {
        return res.status(400).json({
          success: false,
          error: { message: 'COUNTRY_CODE is required' }
        });
      }

      const countries = await dataLoader.loadData('countries.json');
      const maxId = countries.length > 0 ? Math.max(...countries.map(c => c.COUNTRY_ID || 0)) : 0;
      const newCountryId = maxId + 1;

      // NAME_ID: use body.NAME_ID if provided, else we'd need to create a term — for now require NAME_ID or generate a placeholder and set name
      const NAME_ID = body.NAME_ID != null && body.NAME_ID !== '' ? parseInt(body.NAME_ID) : 77566300 + newCountryId;

      const newCountry = {
        COUNTRY_ID: newCountryId,
        NAME_ID,
        COUNTRY_CODE: (body.COUNTRY_CODE || '').trim().toUpperCase().slice(0, 4),
        TIME_ZONE_ID: body.TIME_ZONE_ID === '' || body.TIME_ZONE_ID === null || body.TIME_ZONE_ID === undefined ? 1 : (isNaN(Number(body.TIME_ZONE_ID)) ? 1 : Number(body.TIME_ZONE_ID)),
        FATHER_COUNTRY_ID: body.FATHER_COUNTRY_ID === '' || body.FATHER_COUNTRY_ID === null || body.FATHER_COUNTRY_ID === undefined ? null : (isNaN(Number(body.FATHER_COUNTRY_ID)) ? null : Number(body.FATHER_COUNTRY_ID)),
        IS_NOT_REAL: body.IS_NOT_REAL === true || body.IS_NOT_REAL === 'true' || body.IS_NOT_REAL === 1 || false,
        ALLOW_BETTING: body.ALLOW_BETTING !== false && body.ALLOW_BETTING !== 'false' && body.ALLOW_BETTING !== 0,
        EMOJI: body.EMOJI || null,
        CONNECT_BY_TEXT: body.CONNECT_BY_TEXT === true || body.CONNECT_BY_TEXT === 'true' || body.CONNECT_BY_TEXT === 1 || false,
        ALLOW_PREMIUM_INSIGHTS: body.ALLOW_PREMIUM_INSIGHTS !== false && body.ALLOW_PREMIUM_INSIGHTS !== 'false',
        TRANSFER_SEASON_ACTIVE: body.TRANSFER_SEASON_ACTIVE || null,
        PHONE_CODE: body.PHONE_CODE === '' || body.PHONE_CODE === null || body.PHONE_CODE === undefined ? null : body.PHONE_CODE,
        ALLOW_BETS_IN_ALL_SCORES: body.ALLOW_BETS_IN_ALL_SCORES !== false && body.ALLOW_BETS_IN_ALL_SCORES !== 'false',
        LOGIN_AVAILABLE: body.LOGIN_AVAILABLE !== false && body.LOGIN_AVAILABLE !== 'false',
        MAIN_COLOR: body.MAIN_COLOR === '' || body.MAIN_COLOR === null || body.MAIN_COLOR === undefined ? 0 : (isNaN(Number(body.MAIN_COLOR)) ? 0 : Number(body.MAIN_COLOR)),
        SECONDARY_COLOR: body.SECONDARY_COLOR === '' || body.SECONDARY_COLOR === null || body.SECONDARY_COLOR === undefined ? 0 : (isNaN(Number(body.SECONDARY_COLOR)) ? 0 : Number(body.SECONDARY_COLOR)),
        IMG_VER: body.IMG_VER === '' || body.IMG_VER === null || body.IMG_VER === undefined ? 1 : (isNaN(Number(body.IMG_VER)) ? 1 : Number(body.IMG_VER)),
        PLATFORM: body.PLATFORM || null,
        FORCE_RAFFLE_TOP_BOOKMAKER: body.FORCE_RAFFLE_TOP_BOOKMAKER || null,
        ALLOW_SUB_TERRITORY_DETECTION: body.ALLOW_SUB_TERRITORY_DETECTION || null,
        ODDS_TYPE: body.ODDS_TYPE === '' || body.ODDS_TYPE === null || body.ODDS_TYPE === undefined ? 2 : (isNaN(Number(body.ODDS_TYPE)) ? 2 : Number(body.ODDS_TYPE)),
        TYPE: body.TYPE || null,
        CONTINENT_ID: body.CONTINENT_ID === '' || body.CONTINENT_ID === null || body.CONTINENT_ID === undefined ? null : (isNaN(Number(body.CONTINENT_ID)) ? null : Number(body.CONTINENT_ID)),
        BLOCK_LIVE_BETTING: body.BLOCK_LIVE_BETTING === true || body.BLOCK_LIVE_BETTING === 'true' || body.BLOCK_LIVE_BETTING === 1 || false,
        CURRENCY_SYMBOL: body.CURRENCY_SYMBOL || null,
        ALLOW_PREMIUM_USERS: body.ALLOW_PREMIUM_USERS || null,
        MIN_USERS_FOR_MOST_POPULAR_BET: body.MIN_USERS_FOR_MOST_POPULAR_BET === '' || body.MIN_USERS_FOR_MOST_POPULAR_BET === null || body.MIN_USERS_FOR_MOST_POPULAR_BET === undefined ? 100 : (isNaN(Number(body.MIN_USERS_FOR_MOST_POPULAR_BET)) ? 100 : Number(body.MIN_USERS_FOR_MOST_POPULAR_BET)),
        MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: body.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS === '' || body.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS === null || body.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS === undefined ? 50 : (isNaN(Number(body.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS)) ? 50 : Number(body.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS)),
        LINEUPS_BET_VALUE: body.LINEUPS_BET_VALUE === '' || body.LINEUPS_BET_VALUE === null || body.LINEUPS_BET_VALUE === undefined ? null : (isNaN(Number(body.LINEUPS_BET_VALUE)) ? null : Number(body.LINEUPS_BET_VALUE)),
        BET_VALUE: body.BET_VALUE === '' || body.BET_VALUE === null || body.BET_VALUE === undefined ? null : (isNaN(Number(body.BET_VALUE)) ? null : Number(body.BET_VALUE)),
        name: (body.name || '').trim() || null
      };

      countries.push(newCountry);
      await dataLoader.saveData('countries.json', countries);

      res.status(201).json({
        success: true,
        data: newCountry
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CountryController();
