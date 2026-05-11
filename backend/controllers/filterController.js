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

const ENTITY_TYPE_LABELS = {
  1: 'Game',
  2: 'Country',
  3: 'Competition',
  4: 'Competitor',
  5: 'Game',
  6: 'Athlete',
};

const TARGET_TYPE_LABELS = {
  1: 'Language',
  2: 'Country',
};

class FilterController {
  async getById(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }

      const [filters, terms, entities, targets, languages, countriesData, games] = await Promise.all([
        dataLoader.loadData('filters.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('filter_entities.json'),
        dataLoader.loadData('filter_targets.json'),
        dataLoader.loadData('languages.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('games.json'),
      ]);

      const filtersArr = Array.isArray(filters) ? filters : [];
      const filter = filtersArr.find((f) => f.FILTER_ID === filterId);
      if (!filter) {
        return res.status(404).json({ success: false, error: { message: 'Filter not found' } });
      }

      const termsArr = Array.isArray(terms) ? terms : [];
      const termMap = new Map(termsArr.map((t) => [t.id, t]));
      const term = termMap.get(filter.NAME_ID);

      const langsArr = Array.isArray(languages) ? languages : [];
      const langMap = new Map(langsArr.map((l) => [l.id, l]));
      const countriesArr = Array.isArray(countriesData) ? countriesData : [];
      const countryMap = new Map(countriesArr.map((c) => [c.COUNTRY_ID, c]));
      const gamesArr = Array.isArray(games) ? games : [];
      const gameMap = new Map(gamesArr.map((g) => [g.GAME_ID, g]));

      const filterEntities = (Array.isArray(entities) ? entities : [])
        .filter((e) => e.FILTER_ID === filterId)
        .map((e) => {
          let entityName = `#${e.ENTITY_ID}`;
          if (e.ENTITY_TYPE === 5) {
            const game = gameMap.get(e.ENTITY_ID);
            if (game) {
              entityName = `Game #${e.ENTITY_ID} (${game.GAME_KEY || ''})`;
            }
          }
          return {
            ...e,
            ENTITY_TYPE_LABEL: ENTITY_TYPE_LABELS[e.ENTITY_TYPE] || `Type ${e.ENTITY_TYPE}`,
            ENTITY_NAME: entityName,
          };
        });

      const filterTargets = (Array.isArray(targets) ? targets : [])
        .filter((t) => t.FILTER_ID === filterId)
        .map((t) => {
          let targetName = `#${t.FILTER_TARGET_ID}`;
          if (t.FILTER_TARGET_TYPE === 1) {
            const lang = langMap.get(t.FILTER_TARGET_ID);
            if (lang) {
              targetName = lang.name || `Language #${t.FILTER_TARGET_ID}`;
            }
          } else if (t.FILTER_TARGET_TYPE === 2) {
            const country = countryMap.get(t.FILTER_TARGET_ID);
            if (country) {
              const countryTerm = termMap.get(country.NAME_ID);
              targetName = countryTerm ? (getEnglishValue(countryTerm) || targetName) : targetName;
              if (country.EMOJI) targetName = `${country.EMOJI} ${targetName}`;
            }
          }
          return {
            ...t,
            TARGET_TYPE_LABEL: TARGET_TYPE_LABELS[t.FILTER_TARGET_TYPE] || `Type ${t.FILTER_TARGET_TYPE}`,
            TARGET_NAME: targetName,
          };
        });

      res.json({
        success: true,
        data: {
          ...filter,
          FILTER_NAME: term ? (getEnglishValue(term) || `Term #${filter.NAME_ID}`) : null,
          entities: filterEntities,
          targets: filterTargets,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addEntity(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }
      const { ENTITY_ID, ENTITY_TYPE, CAPTION, FILTER_ORDER } = req.body;
      if (ENTITY_ID == null || ENTITY_TYPE == null) {
        return res.status(400).json({ success: false, error: { message: 'ENTITY_ID and ENTITY_TYPE are required' } });
      }

      const entities = await dataLoader.loadData('filter_entities.json');
      const arr = Array.isArray(entities) ? entities : [];
      const now = formatDateTime(new Date());

      const newEntity = {
        FILTER_ID: filterId,
        ENTITY_ID: parseInt(ENTITY_ID, 10),
        ENTITY_TYPE: parseInt(ENTITY_TYPE, 10),
        CAPTION: CAPTION || '',
        CREATE_TIME: now,
        UPDATE_TIME: now,
        FILTER_ORDER: FILTER_ORDER != null ? parseInt(FILTER_ORDER, 10) : null,
      };

      arr.unshift(newEntity);
      await dataLoader.saveData('filter_entities.json', arr);

      res.status(201).json({ success: true, data: newEntity });
    } catch (error) {
      next(error);
    }
  }

  async deleteEntities(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }
      const { entityIds } = req.body;
      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'entityIds array is required' } });
      }

      const entities = await dataLoader.loadData('filter_entities.json');
      const arr = Array.isArray(entities) ? entities : [];
      const idSet = new Set(entityIds.map((id) => parseInt(id, 10)));

      const filtered = arr.filter(
        (e) => !(e.FILTER_ID === filterId && idSet.has(e.ENTITY_ID))
      );
      const deletedCount = arr.length - filtered.length;
      await dataLoader.saveData('filter_entities.json', filtered);

      res.json({ success: true, data: { deleted: deletedCount } });
    } catch (error) {
      next(error);
    }
  }

  async updateEntities(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }

      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'updates array is required' } });
      }

      const entities = await dataLoader.loadData('filter_entities.json');
      const arr = Array.isArray(entities) ? entities : [];
      const now = formatDateTime(new Date());
      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const entityId = parseInt(update.entityId, 10);
        const entityType = update.entityType != null ? parseInt(update.entityType, 10) : null;
        const changes = update.changes || {};

        if (isNaN(entityId)) {
          errors.push({ entityId: update.entityId, message: 'Invalid ENTITY_ID' });
          continue;
        }

        const idx = arr.findIndex((entity) => (
          entity.FILTER_ID === filterId
          && entity.ENTITY_ID === entityId
          && (entityType == null || entity.ENTITY_TYPE === entityType)
        ));

        if (idx === -1) {
          errors.push({ entityId, entityType, message: 'Filter entity not found' });
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(changes, 'CAPTION')) {
          arr[idx].CAPTION = changes.CAPTION == null ? '' : String(changes.CAPTION);
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'FILTER_ORDER')) {
          const nextOrder = changes.FILTER_ORDER;
          arr[idx].FILTER_ORDER = nextOrder === '' || nextOrder == null ? null : parseInt(nextOrder, 10);
        }
        arr[idx].UPDATE_TIME = now;
        updatedCount += 1;
      }

      await dataLoader.saveData('filter_entities.json', arr);
      res.json({ success: true, data: { updated: updatedCount, errors } });
    } catch (error) {
      next(error);
    }
  }

  async addTarget(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }
      const { FILTER_TARGET_ID, FILTER_TARGET_TYPE } = req.body;
      if (FILTER_TARGET_ID == null || FILTER_TARGET_TYPE == null) {
        return res.status(400).json({ success: false, error: { message: 'FILTER_TARGET_ID and FILTER_TARGET_TYPE are required' } });
      }

      const targets = await dataLoader.loadData('filter_targets.json');
      const arr = Array.isArray(targets) ? targets : [];

      const newTarget = {
        FILTER_TARGET_ID: parseInt(FILTER_TARGET_ID, 10),
        FILTER_TARGET_TYPE: parseInt(FILTER_TARGET_TYPE, 10),
        FILTER_ID: filterId,
      };

      arr.unshift(newTarget);
      await dataLoader.saveData('filter_targets.json', arr);

      res.status(201).json({ success: true, data: newTarget });
    } catch (error) {
      next(error);
    }
  }

  async deleteTargets(req, res, next) {
    try {
      const filterId = parseInt(req.params.id, 10);
      if (isNaN(filterId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid filter ID' } });
      }
      const { targetIds } = req.body;
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'targetIds array is required' } });
      }

      const targets = await dataLoader.loadData('filter_targets.json');
      const arr = Array.isArray(targets) ? targets : [];
      const idSet = new Set(targetIds.map((id) => parseInt(id, 10)));

      const filtered = arr.filter(
        (t) => !(t.FILTER_ID === filterId && idSet.has(t.FILTER_TARGET_ID))
      );
      const deletedCount = arr.length - filtered.length;
      await dataLoader.saveData('filter_targets.json', filtered);

      res.json({ success: true, data: { deleted: deletedCount } });
    } catch (error) {
      next(error);
    }
  }

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
      if (req.query.filterName) {
        const searchName = String(req.query.filterName).trim().toLowerCase();
        if (searchName) {
          filters = filters.filter((f) => {
            const term = termMap.get(f.NAME_ID);
            const englishName = getEnglishValue(term);
            return englishName ? englishName.toLowerCase().includes(searchName) : false;
          });
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
