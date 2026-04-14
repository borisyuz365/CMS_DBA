const dataLoader = require('../utils/dataLoader');
const path = require('path');
const fs = require('fs').promises;

const FILTERS_SCHEMA_PATH = path.join(__dirname, '../data/schemas/filters.schema.json');

const ALLOWED_FIELDS = new Set([
  'ACTIVE', 'PROMOTED', 'ORDER_LEVEL', 'ALLOW_SELECTION',
  'START_DATE', 'END_DATE', 'EDITORS_CHOICE', 'EDITORS_PROMOTED_ODDS',
  'EDITORS_SHOW_SPORT_TYPE', 'IMG_VER', 'EDITORS_PROMOTED_ALL_SCORES',
  'FORCE_FINAL_ACTION_ENUM_VAL', 'NAME_ID',
]);

function getEnglishValue(term) {
  if (!term || !Array.isArray(term.values)) return null;
  const eng = term.values.find((v) => v.languageId === 1);
  return eng ? eng.value : null;
}

function formatDateTime(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

async function getDefaultsFromSchema() {
  const raw = await fs.readFile(FILTERS_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const defaults = {};
  for (const [key, desc] of Object.entries(schema)) {
    if (desc && Object.prototype.hasOwnProperty.call(desc, 'default')) {
      defaults[key] = desc.default;
    }
  }
  return defaults;
}

class FilterController {
  async getAll(req, res, next) {
    try {
      const [list, terms] = await Promise.all([
        dataLoader.loadData('filters.json'),
        dataLoader.loadData('terms.json'),
      ]);
      let filters = Array.isArray(list) ? list : [];
      const termsArr = Array.isArray(terms) ? terms : [];
      const termMap = new Map(termsArr.map((t) => [t.id, t]));

      if (req.query.activeOnly === 'true') {
        filters = filters.filter((f) => f.ACTIVE === true);
      }
      if (req.query.filterId) {
        const id = parseInt(req.query.filterId, 10);
        if (!isNaN(id)) {
          filters = filters.filter((f) => f.FILTER_ID === id);
        }
      }

      const enriched = filters.map((f) => {
        const term = termMap.get(f.NAME_ID);
        return {
          ...f,
          FILTER_NAME: term ? (getEnglishValue(term) || `Term #${f.NAME_ID}`) : null,
        };
      });

      res.json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const list = await dataLoader.loadData('filters.json');
      const arr = Array.isArray(list) ? list : [];

      const defaults = await getDefaultsFromSchema();
      const maxId = arr.length > 0 ? Math.max(...arr.map((f) => f.FILTER_ID || 0)) : 0;
      const newId = maxId + 1;
      const now = formatDateTime(new Date());

      const newItem = { ...defaults };
      newItem.FILTER_ID = newId;
      newItem.CREATE_TIME = now;
      newItem.UPDATE_TIME = now;

      if (req.body.NAME_ID != null) newItem.NAME_ID = parseInt(req.body.NAME_ID, 10) || 0;
      if (req.body.ACTIVE != null) newItem.ACTIVE = !!req.body.ACTIVE;
      if (req.body.EDITORS_CHOICE != null) newItem.EDITORS_CHOICE = !!req.body.EDITORS_CHOICE;
      if (req.body.START_DATE != null) newItem.START_DATE = String(req.body.START_DATE);
      if (req.body.END_DATE != null) newItem.END_DATE = String(req.body.END_DATE);
      if (req.body.ALLOW_SELECTION != null) newItem.ALLOW_SELECTION = !!req.body.ALLOW_SELECTION;
      if (req.body.PROMOTED != null) newItem.PROMOTED = !!req.body.PROMOTED;
      if (req.body.ORDER_LEVEL != null) newItem.ORDER_LEVEL = parseInt(req.body.ORDER_LEVEL, 10) || 0;

      arr.unshift(newItem);
      await dataLoader.saveData('filters.json', arr);

      res.status(201).json({ success: true, data: newItem });
    } catch (error) {
      next(error);
    }
  }

  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Invalid updates array' } });
      }

      const list = await dataLoader.loadData('filters.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({ success: false, error: { message: 'Filters data is invalid' } });
      }

      const now = formatDateTime(new Date());
      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { filterId, changes } = update;
        if (!filterId || !changes || typeof changes !== 'object') {
          errors.push({ filterId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(filterId, 10);
        const idx = list.findIndex((f) => f.FILTER_ID === id);
        if (idx === -1) {
          errors.push({ filterId: id, error: 'Filter not found' });
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
        item.UPDATE_TIME = now;
        updatedCount++;
      }

      await dataLoader.saveData('filters.json', list);

      res.json({
        success: true,
        data: { updated: updatedCount, errors: errors.length > 0 ? errors : undefined },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FilterController();
