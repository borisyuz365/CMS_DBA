const dataLoader = require('../utils/dataLoader');

/**
 * Sport Controller - CRUD for sports.json
 */
class SportController {
  /**
   * Get all sports
   */
  async getAll(req, res, next) {
    try {
      const sports = await dataLoader.loadData('sports.json');
      res.json({
        success: true,
        data: Array.isArray(sports) ? sports : []
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sport by SPORT_TYPE_ID
   */
  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid sport ID' }
        });
      }

      const sports = await dataLoader.loadData('sports.json');
      const sport = Array.isArray(sports)
        ? sports.find(s => s.SPORT_TYPE_ID === id)
        : null;

      if (!sport) {
        return res.status(404).json({
          success: false,
          error: { message: 'Sport not found' }
        });
      }

      res.json({
        success: true,
        data: sport
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple sports (bulk update)
   */
  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body; // Array of { sportTypeId, changes }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid updates array' }
        });
      }

      const sports = await dataLoader.loadData('sports.json');
      if (!Array.isArray(sports)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Sports data is invalid' }
        });
      }

      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { sportTypeId, changes } = update;

        if (!sportTypeId || !changes || typeof changes !== 'object') {
          errors.push({ sportTypeId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(sportTypeId, 10);
        const idx = sports.findIndex(s => s.SPORT_TYPE_ID === id);
        if (idx === -1) {
          errors.push({ sportTypeId: id, error: 'Sport not found' });
          continue;
        }

        const sport = sports[idx];
        for (const [key, value] of Object.entries(changes)) {
          if (value === '' || value === undefined) {
            sport[key] = null;
          } else if (typeof value === 'boolean') {
            sport[key] = value;
          } else if (typeof value === 'number' && !isNaN(value)) {
            sport[key] = value;
          } else {
            sport[key] = value;
          }
        }
        updatedCount++;
      }

      await dataLoader.saveData('sports.json', sports);

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
   * Delete sport by SPORT_TYPE_ID.
   * Referential integrity (5.6): refuse if any competition uses this sport.
   */
  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid sport ID' }
        });
      }

      const [sports, competitions] = await Promise.all([
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('competitions.json').catch(() => [])
      ]);

      const inUse = Array.isArray(competitions) && competitions.some(
        c => c.SPORT_TYPE_ID != null && Number(c.SPORT_TYPE_ID) === id
      );
      if (inUse) {
        return res.status(409).json({
          success: false,
          error: { message: 'Cannot delete sport: it is used by one or more competitions.' }
        });
      }

      const list = Array.isArray(sports) ? sports : [];
      const idx = list.findIndex(s => s.SPORT_TYPE_ID === id);
      if (idx === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'Sport not found' }
        });
      }

      list.splice(idx, 1);
      await dataLoader.saveData('sports.json', list);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new sport
   */
  async create(req, res, next) {
    try {
      const sports = await dataLoader.loadData('sports.json');
      const list = Array.isArray(sports) ? sports : [];

      const maxId = list.length > 0
        ? Math.max(...list.map(s => (s.SPORT_TYPE_ID || 0)))
        : 0;
      const newId = maxId + 1;

      const template = list[0] || {};
      const newSport = {};

      for (const [key, val] of Object.entries(template)) {
        newSport[key] = val === null || typeof val === 'object' ? null : val;
      }

      newSport.SPORT_TYPE_ID = newId;
      newSport.ALIAS_NAME = req.body.ALIAS_NAME != null ? String(req.body.ALIAS_NAME) : 'New Sport';

      if (req.body.NAME_ID != null) newSport.NAME_ID = parseInt(req.body.NAME_ID, 10) || null;
      if (req.body.CURRENT_SCORE_STAGE != null) newSport.CURRENT_SCORE_STAGE = parseInt(req.body.CURRENT_SCORE_STAGE, 10) || null;
      if (req.body.TABLE_DEF_WINNER_POINTS != null) newSport.TABLE_DEF_WINNER_POINTS = parseInt(req.body.TABLE_DEF_WINNER_POINTS, 10) ?? null;
      if (req.body.TABLE_DEF_DRAW_POINTS != null) newSport.TABLE_DEF_DRAW_POINTS = parseInt(req.body.TABLE_DEF_DRAW_POINTS, 10) ?? null;
      if (req.body.TABLE_DEF_LOSER_POINTS != null) newSport.TABLE_DEF_LOSER_POINTS = parseInt(req.body.TABLE_DEF_LOSER_POINTS, 10) ?? null;
      if (typeof req.body.TABLE_DEF_IS_EVEN_EXISTS === 'boolean') newSport.TABLE_DEF_IS_EVEN_EXISTS = req.body.TABLE_DEF_IS_EVEN_EXISTS;
      if (typeof req.body.IS_DISPLAYED === 'boolean') newSport.IS_DISPLAYED = req.body.IS_DISPLAYED;
      if (req.body.IMG_VER != null) newSport.IMG_VER = parseInt(req.body.IMG_VER, 10) || 1;

      list.push(newSport);
      await dataLoader.saveData('sports.json', list);

      res.status(201).json({
        success: true,
        data: newSport
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SportController();
