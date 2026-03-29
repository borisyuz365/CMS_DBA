const dataLoader = require('../utils/dataLoader');

const ALLOWED_FIELDS = new Set([
  'NAME_ID', 'TIME_ZONE_NAME', 'UTC_OFFSET', 'IS_DELETED',
]);

/**
 * Time Zone Controller - CRUD for time_zones.json
 */
class TimeZoneController {
  async getAll(req, res, next) {
    try {
      const list = await dataLoader.loadData('time_zones.json');
      res.json({
        success: true,
        data: Array.isArray(list) ? list : [],
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid time zone ID' },
        });
      }

      const list = await dataLoader.loadData('time_zones.json');
      const item = Array.isArray(list) ? list.find((s) => s.TIME_ZONE_ID === id) : null;

      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'Time zone not found' },
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid updates array' },
        });
      }

      const list = await dataLoader.loadData('time_zones.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Time zones data is invalid' },
        });
      }

      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { timeZoneId, changes } = update;

        if (!timeZoneId || !changes || typeof changes !== 'object') {
          errors.push({ timeZoneId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(timeZoneId, 10);
        const idx = list.findIndex((s) => s.TIME_ZONE_ID === id);
        if (idx === -1) {
          errors.push({ timeZoneId: id, error: 'Time zone not found' });
          continue;
        }

        const item = list[idx];
        for (const [key, value] of Object.entries(changes)) {
          if (!ALLOWED_FIELDS.has(key)) continue;
          if (value === '' || value === undefined) {
            item[key] = null;
          } else if (typeof value === 'boolean') {
            item[key] = value;
          } else if (typeof value === 'number' && !isNaN(value)) {
            item[key] = value;
          } else {
            item[key] = value;
          }
        }
        updatedCount++;
      }

      await dataLoader.saveData('time_zones.json', list);

      res.json({
        success: true,
        data: {
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const list = await dataLoader.loadData('time_zones.json');
      const arr = Array.isArray(list) ? list : [];

      const maxId = arr.length > 0 ? Math.max(...arr.map((s) => s.TIME_ZONE_ID || 0)) : 0;
      const newId = maxId + 1;

      const template = arr[0] || {};
      const newItem = {};

      for (const [key, val] of Object.entries(template)) {
        newItem[key] = val === null || (typeof val === 'object' && !Array.isArray(val)) ? null : val;
      }

      newItem.TIME_ZONE_ID = newId;
      newItem.TIME_ZONE_NAME = req.body.TIME_ZONE_NAME != null ? String(req.body.TIME_ZONE_NAME) : 'New Time Zone';
      newItem.UTC_OFFSET = req.body.UTC_OFFSET != null ? parseFloat(req.body.UTC_OFFSET) : 0;

      if (req.body.NAME_ID != null) newItem.NAME_ID = parseInt(req.body.NAME_ID, 10) || null;

      arr.push(newItem);
      await dataLoader.saveData('time_zones.json', arr);

      res.status(201).json({
        success: true,
        data: newItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid time zone ID' },
        });
      }

      const list = await dataLoader.loadData('time_zones.json');
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex((s) => s.TIME_ZONE_ID === id);

      if (idx === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'Time zone not found' },
        });
      }

      arr.splice(idx, 1);
      await dataLoader.saveData('time_zones.json', arr);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimeZoneController();
