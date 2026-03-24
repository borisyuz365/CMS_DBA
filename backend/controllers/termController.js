const dataLoader = require('../utils/dataLoader');

/**
 * Compute engValue from values if missing (for display)
 */
function ensureEngValue(term) {
  if (!term) return term;
  if (term.engValue != null && term.engValue !== '') return term;
  if (term.values && Array.isArray(term.values) && term.values.length > 0) {
    const eng = term.values.find(v => Number(v.languageId) === 1)?.value
      || term.values.find(v => v.isDefault)?.value
      || term.values[0]?.value;
    return { ...term, engValue: eng || '' };
  }
  return term;
}

/**
 * Term Controller - Handles term operations
 */
class TermController {
  /**
   * Get all terms
   */
  async getAll(req, res, next) {
    try {
      const terms = await dataLoader.loadData('terms.json');
      const enriched = (terms || []).map(t => ensureEngValue(t));
      res.json({
        success: true,
        data: enriched
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get term by ID
   */
  async getById(req, res, next) {
    try {
      const termId = parseInt(req.params.id);

      if (isNaN(termId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid term ID'
          }
        });
      }

      const terms = await dataLoader.loadData('terms.json');
      const term = terms.find(t => t.id === termId);

      if (!term) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Term with ID ${termId} not found`
          }
        });
      }

      res.json({
        success: true,
        data: ensureEngValue(term)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update term
   */
  async update(req, res, next) {
    try {
      const termId = parseInt(req.params.id);
      const termData = req.body;

      if (isNaN(termId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid term ID'
          }
        });
      }

      const terms = await dataLoader.loadData('terms.json');
      const termIndex = terms.findIndex(t => t.id === termId);

      if (termIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Term with ID ${termId} not found`
          }
        });
      }

      // Update term
      terms[termIndex] = {
        ...terms[termIndex],
        ...termData,
        id: termId // Ensure ID is not changed
      };

      // Save updated terms
      await dataLoader.saveData('terms.json', terms);

      res.json({
        success: true,
        data: terms[termIndex]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all categories
   */
  async getCategories(req, res, next) {
    try {
      const categories = await dataLoader.loadData('categories.json');
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new term
   */
  async create(req, res, next) {
    try {
      const termData = req.body;

      // Validate required fields
      if (!termData.category) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category is required'
          }
        });
      }

      if (!termData.values || !Array.isArray(termData.values) || termData.values.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'At least one value is required'
          }
        });
      }

      const terms = await dataLoader.loadData('terms.json');
      const categories = await dataLoader.loadData('categories.json').catch(() => []);

      // Find max ID
      const maxId = terms.length > 0
        ? Math.max(...terms.map(t => t.id || 0))
        : 0;

      // Resolve categoryId from category name if not provided
      let categoryId = termData.categoryId;
      if (categoryId == null && termData.category) {
        const cat = categories.find(c => (c.name || c.aliasName || '').toLowerCase() === String(termData.category).toLowerCase());
        if (cat) categoryId = cat.id;
      }

      // engValue: prefer languageId 1 (English), else isDefault, else first value
      const engVal = termData.values.find(v => Number(v.languageId) === 1)?.value
        || termData.values.find(v => v.isDefault)?.value
        || (termData.values[0] && termData.values[0].value);

      const newTerm = {
        id: maxId + 1,
        categoryId: categoryId ?? null,
        aliasName: termData.aliasName || null,
        fatherTerm: termData.fatherTerm || null,
        createTime: new Date().toISOString(),
        description: termData.description || null,
        category: termData.category,
        values: termData.values,
        valsCount: termData.values.length,
        engValue: engVal || null
      };

      terms.push(newTerm);
      await dataLoader.saveData('terms.json', terms);

      res.status(201).json({
        success: true,
        data: newTerm
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new category
   */
  async createCategory(req, res, next) {
    try {
      const categoryData = req.body;
      const categories = await dataLoader.loadData('categories.json');

      // Check if category with same name already exists
      const existingCategory = categories.find(
        c => c.name && c.name.toLowerCase() === categoryData.name?.toLowerCase()
      );

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category with this name already exists'
          }
        });
      }

      // Find max ID
      const maxId = categories.length > 0 
        ? Math.max(...categories.map(c => c.id || 0))
        : 0;

      const newCategory = {
        id: maxId + 1,
        ...categoryData
      };

      categories.push(newCategory);
      await dataLoader.saveData('categories.json', categories);

      res.json({
        success: true,
        data: newCategory
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TermController();
