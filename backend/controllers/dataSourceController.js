const dataLoader = require('../utils/dataLoader');

const ALLOWED_FIELDS = new Set([
  'NAME_ID', 'SITE_ADDRESS', 'LANG_ID', 'UI_LANG_ID', 'IS_ACTIVE', 'LAST_SCAN_TIME', 'TIME_ZONE_ID',
  'ALIAS_NAME', 'ALWAYS_ADD_VALUE_IN_LANG', 'ADD_TO_LOG', 'HANDLE_PLAYER_WITH_INITIALS_NAMES',
  'WIDGET_URL_TEMPLATE', 'WIDGET_ORDER', 'WIDGET_RATIO', 'WIDGET_ACTIVE', 'WIDGET_MIN_IOS_VERSION',
  'WIDGET_MIN_ANDROID_VERSION', 'PBP_URL_TEMPLATE', 'PBP_SUPPORTED_LANGS', 'QA_PBP_URL_TEMPLATE',
  'PREMIUM', 'WIDGET_TYPE', 'PRIORITY_FALLBACK_TIME_MINS', 'LIVE_PRIORITY_FALLBACK_TIME_SECS',
  'FEED_URL_TEMPLATE', 'PBP_PRIORITY', 'LOG_OPTION_ID', 'IS_DELETED',
]);

/**
 * Data Source Controller - CRUD for data_sources.json
 */
class DataSourceController {
  async getAll(req, res, next) {
    try {
      const list = await dataLoader.loadData('data_sources.json');
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
          error: { message: 'Invalid data source ID' },
        });
      }

      const list = await dataLoader.loadData('data_sources.json');
      const item = Array.isArray(list) ? list.find((s) => s.DATA_SOURCE_ID === id) : null;

      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'Data source not found' },
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

      const list = await dataLoader.loadData('data_sources.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Data sources data is invalid' },
        });
      }

      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { dataSourceId, changes } = update;

        if (!dataSourceId || !changes || typeof changes !== 'object') {
          errors.push({ dataSourceId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(dataSourceId, 10);
        const idx = list.findIndex((s) => s.DATA_SOURCE_ID === id);
        if (idx === -1) {
          errors.push({ dataSourceId: id, error: 'Data source not found' });
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

      await dataLoader.saveData('data_sources.json', list);

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
      const list = await dataLoader.loadData('data_sources.json');
      const arr = Array.isArray(list) ? list : [];

      const maxId = arr.length > 0 ? Math.max(...arr.map((s) => s.DATA_SOURCE_ID || 0)) : 0;
      const newId = maxId + 1;

      const template = arr[0] || {};
      const newItem = {};

      for (const [key, val] of Object.entries(template)) {
        newItem[key] = val === null || (typeof val === 'object' && !Array.isArray(val)) ? null : val;
      }

      newItem.DATA_SOURCE_ID = newId;
      newItem.ALIAS_NAME = req.body.ALIAS_NAME != null ? String(req.body.ALIAS_NAME) : 'New Data Source';

      if (req.body.NAME_ID != null) newItem.NAME_ID = parseInt(req.body.NAME_ID, 10) || null;
      if (req.body.SITE_ADDRESS != null) newItem.SITE_ADDRESS = String(req.body.SITE_ADDRESS) || null;
      if (req.body.LANG_ID != null) newItem.LANG_ID = parseInt(req.body.LANG_ID, 10) || null;
      if (req.body.UI_LANG_ID != null) newItem.UI_LANG_ID = parseInt(req.body.UI_LANG_ID, 10) || null;
      if (req.body.TIME_ZONE_ID != null) newItem.TIME_ZONE_ID = String(req.body.TIME_ZONE_ID) || null;
      if (typeof req.body.ALWAYS_ADD_VALUE_IN_LANG === 'boolean') newItem.ALWAYS_ADD_VALUE_IN_LANG = req.body.ALWAYS_ADD_VALUE_IN_LANG;
      if (typeof req.body.ADD_TO_LOG === 'boolean') newItem.ADD_TO_LOG = req.body.ADD_TO_LOG;
      if (typeof req.body.WIDGET_ACTIVE === 'boolean') newItem.WIDGET_ACTIVE = req.body.WIDGET_ACTIVE;
      if (req.body.LOG_OPTION_ID != null) newItem.LOG_OPTION_ID = parseInt(req.body.LOG_OPTION_ID, 10) ?? 3;

      arr.push(newItem);
      await dataLoader.saveData('data_sources.json', arr);

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
          error: { message: 'Invalid data source ID' },
        });
      }

      const list = await dataLoader.loadData('data_sources.json');
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex((s) => s.DATA_SOURCE_ID === id);

      if (idx === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'Data source not found' },
        });
      }

      arr.splice(idx, 1);
      await dataLoader.saveData('data_sources.json', arr);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DataSourceController();
