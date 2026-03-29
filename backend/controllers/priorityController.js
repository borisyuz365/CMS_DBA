const dataLoader = require('../utils/dataLoader');

const ALLOWED_FIELDS = new Set([
  'DATA_SOURCE', 'UPDATE_TYPE', 'PRIORITY', 'CUT_TYPE', 'CUT_VALUE',
  'COMMENT', 'USER_NAME', 'CREATE_TIME', 'START_DATE', 'EXPIRATION_DATE',
  'AFTER_EXPIRED_PRIORITY', 'SCHEDULE_PRIORITY',
]);

function buildHistoryEntry(priorityItem) {
  return {
    DATA_SOURCE: priorityItem.DATA_SOURCE ?? null,
    UPDATE_TYPE: priorityItem.UPDATE_TYPE ?? null,
    PRIORITY_LEVEL: priorityItem.PRIORITY ?? null,
    CUT_TYPE: priorityItem.CUT_TYPE ?? null,
    CUT_VALUE: priorityItem.CUT_VALUE ?? null,
    COMMENT: priorityItem.COMMENT || '',
    START_DATE: priorityItem.START_DATE || null,
    EXPIRATION_DATE: priorityItem.EXPIRATION_DATE || null,
    AFTER_EXPIRED_PRIORITY: priorityItem.AFTER_EXPIRED_PRIORITY ?? null,
    SCHEDULE_PRIORITY: priorityItem.SCHEDULE_PRIORITY ?? null,
    USER_NAME: priorityItem.USER_NAME || null,
    UPDATE_TIME: new Date().toISOString(),
  };
}

async function appendHistory(entries) {
  const history = await dataLoader.loadData('priority_history.json');
  const arr = Array.isArray(history) ? history : [];
  arr.push(...entries);
  await dataLoader.saveData('priority_history.json', arr);
}

class PriorityController {
  async getAll(req, res, next) {
    try {
      const list = await dataLoader.loadData('priorities.json');
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
      const idx = parseInt(req.params.id, 10);
      if (isNaN(idx)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid priority index' },
        });
      }

      const list = await dataLoader.loadData('priorities.json');
      const arr = Array.isArray(list) ? list : [];

      if (idx < 0 || idx >= arr.length) {
        return res.status(404).json({
          success: false,
          error: { message: 'Priority not found' },
        });
      }

      res.json({
        success: true,
        data: { ...arr[idx], _index: idx },
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await dataLoader.loadData('priority_history.json');
      const arr = Array.isArray(history) ? history : [];

      const { data_source, update_type, cut_type, cut_value } = req.query;

      let filtered = arr;
      if (data_source !== undefined) {
        filtered = filtered.filter((h) => h.DATA_SOURCE === Number(data_source));
      }
      if (update_type !== undefined) {
        filtered = filtered.filter((h) => h.UPDATE_TYPE === Number(update_type));
      }
      if (cut_type !== undefined) {
        filtered = filtered.filter((h) => h.CUT_TYPE === Number(cut_type));
      }
      if (cut_value !== undefined) {
        filtered = filtered.filter((h) => h.CUT_VALUE === Number(cut_value));
      }

      filtered.sort((a, b) => new Date(b.UPDATE_TIME) - new Date(a.UPDATE_TIME));

      res.json({
        success: true,
        data: filtered,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const list = await dataLoader.loadData('priorities.json');
      const arr = Array.isArray(list) ? list : [];

      const schema = await dataLoader.loadData('schemas/priorities.schema.json');

      const newItem = {};
      for (const [key, def] of Object.entries(schema)) {
        if (key === 'CREATE_TIME') {
          newItem[key] = new Date().toISOString();
        } else {
          newItem[key] = def.default;
        }
      }

      for (const [key, value] of Object.entries(req.body)) {
        if (!ALLOWED_FIELDS.has(key)) continue;
        if (value === '' || value === undefined) {
          newItem[key] = null;
        } else if (typeof value === 'number' && !isNaN(value)) {
          newItem[key] = value;
        } else {
          newItem[key] = value;
        }
      }

      if (newItem.CREATE_TIME === 'UTC_NOW' || !newItem.CREATE_TIME) {
        newItem.CREATE_TIME = new Date().toISOString();
      }

      newItem.USER_NAME = 'DanielBelgi';

      arr.push(newItem);
      await dataLoader.saveData('priorities.json', arr);

      await appendHistory([buildHistoryEntry(newItem)]);

      res.status(201).json({
        success: true,
        data: { ...newItem, _index: arr.length - 1 },
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

      const list = await dataLoader.loadData('priorities.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Priorities data is invalid' },
        });
      }

      let updatedCount = 0;
      const errors = [];
      const historyEntries = [];

      for (const update of updates) {
        const { index, changes } = update;

        if (index === undefined || index === null || !changes || typeof changes !== 'object') {
          errors.push({ index, error: 'Invalid update format' });
          continue;
        }

        const idx = parseInt(index, 10);
        if (idx < 0 || idx >= list.length) {
          errors.push({ index: idx, error: 'Priority not found' });
          continue;
        }

        const item = list[idx];
        for (const [key, value] of Object.entries(changes)) {
          if (!ALLOWED_FIELDS.has(key)) continue;
          if (value === '' || value === undefined) {
            item[key] = null;
          } else {
            item[key] = value;
          }
        }
        item.USER_NAME = 'DanielBelgi';
        historyEntries.push(buildHistoryEntry(item));
        updatedCount++;
      }

      await dataLoader.saveData('priorities.json', list);
      if (historyEntries.length > 0) {
        await appendHistory(historyEntries);
      }

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

  async delete(req, res, next) {
    try {
      const idx = parseInt(req.params.id, 10);
      if (isNaN(idx)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid priority index' },
        });
      }

      const list = await dataLoader.loadData('priorities.json');
      const arr = Array.isArray(list) ? list : [];

      if (idx < 0 || idx >= arr.length) {
        return res.status(404).json({
          success: false,
          error: { message: 'Priority not found' },
        });
      }

      const deleted = arr[idx];
      const historyEntry = buildHistoryEntry({ ...deleted, USER_NAME: 'DanielBelgi' });
      historyEntry.COMMENT = `[DELETED] ${historyEntry.COMMENT || ''}`.trim();

      arr.splice(idx, 1);
      await dataLoader.saveData('priorities.json', arr);
      await appendHistory([historyEntry]);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async deleteBulk(req, res, next) {
    try {
      const { indices } = req.body;

      if (!indices || !Array.isArray(indices) || indices.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid indices array' },
        });
      }

      const list = await dataLoader.loadData('priorities.json');
      const arr = Array.isArray(list) ? list : [];

      const sortedIndices = [...indices].map(Number).sort((a, b) => b - a);
      let deletedCount = 0;
      const historyEntries = [];

      for (const idx of sortedIndices) {
        if (idx >= 0 && idx < arr.length) {
          const deleted = arr[idx];
          const entry = buildHistoryEntry({ ...deleted, USER_NAME: 'DanielBelgi' });
          entry.COMMENT = `[DELETED] ${entry.COMMENT || ''}`.trim();
          historyEntries.push(entry);
          arr.splice(idx, 1);
          deletedCount++;
        }
      }

      await dataLoader.saveData('priorities.json', arr);
      if (historyEntries.length > 0) {
        await appendHistory(historyEntries);
      }

      res.json({
        success: true,
        data: { deleted: deletedCount },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PriorityController();
