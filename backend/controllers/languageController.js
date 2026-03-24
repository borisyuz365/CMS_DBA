const dataLoader = require('../utils/dataLoader');

const ALLOWED_FIELDS = new Set([
  'nameId', 'direction', 'cultureName', 'iso2LettersCode', 'iso3LettersCode', 'win3LettersCode',
  'fatherLangId', 'langType', 'isDisplayed', 'fbCode', 'androidLocale', 'minLettersInSearch',
  'imgVer', 'websiteLang', 'isMetricSystem', 'didomiCode', 'name', 'code', 'isUI', 'IS_DELETED',
]);

/**
 * Language Controller - CRUD for languages.json
 */
class LanguageController {
  async getAll(req, res, next) {
    try {
      const list = await dataLoader.loadData('languages.json');
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
          error: { message: 'Invalid language ID' },
        });
      }

      const list = await dataLoader.loadData('languages.json');
      const item = Array.isArray(list) ? list.find((s) => s.id === id) : null;

      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'Language not found' },
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

      const list = await dataLoader.loadData('languages.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Languages data is invalid' },
        });
      }

      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { languageId, changes } = update;

        if (!languageId || !changes || typeof changes !== 'object') {
          errors.push({ languageId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(languageId, 10);
        const idx = list.findIndex((s) => s.id === id);
        if (idx === -1) {
          errors.push({ languageId: id, error: 'Language not found' });
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

      await dataLoader.saveData('languages.json', list);

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
      const list = await dataLoader.loadData('languages.json');
      const arr = Array.isArray(list) ? list : [];

      const maxId = arr.length > 0 ? Math.max(...arr.map((s) => s.id || 0)) : 0;
      const newId = maxId + 1;

      const template = arr[0] || {};
      const newItem = {};

      for (const [key, val] of Object.entries(template)) {
        newItem[key] = val === null || (typeof val === 'object' && !Array.isArray(val)) ? null : val;
      }

      newItem.id = newId;
      newItem.name = req.body.name != null ? String(req.body.name) : 'New Language';
      newItem.code = req.body.code != null ? String(req.body.code) : 'xx';

      if (req.body.nameId != null) newItem.nameId = parseInt(req.body.nameId, 10) || null;
      if (req.body.direction != null) newItem.direction = parseInt(req.body.direction, 10) ?? 0;
      if (req.body.cultureName != null) newItem.cultureName = String(req.body.cultureName) || null;
      if (req.body.iso2LettersCode != null) newItem.iso2LettersCode = String(req.body.iso2LettersCode) || null;
      if (req.body.iso3LettersCode != null) newItem.iso3LettersCode = String(req.body.iso3LettersCode) || null;
      if (req.body.androidLocale != null) newItem.androidLocale = String(req.body.androidLocale) || null;
      if (req.body.websiteLang != null) newItem.websiteLang = String(req.body.websiteLang) || null;
      if (typeof req.body.isDisplayed === 'boolean') newItem.isDisplayed = req.body.isDisplayed;
      if (typeof req.body.isUI === 'boolean') newItem.isUI = req.body.isUI;
      if (req.body.imgVer != null) newItem.imgVer = parseInt(req.body.imgVer, 10) ?? 0;

      arr.push(newItem);
      await dataLoader.saveData('languages.json', arr);

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
          error: { message: 'Invalid language ID' },
        });
      }

      const list = await dataLoader.loadData('languages.json');
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex((s) => s.id === id);

      if (idx === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'Language not found' },
        });
      }

      arr.splice(idx, 1);
      await dataLoader.saveData('languages.json', arr);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LanguageController();
