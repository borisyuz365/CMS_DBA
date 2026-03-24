const express = require('express');
const router = express.Router();
const {
  readTerms,
  writeTerms,
  getNextId,
  readCategories,
  writeCategories,
  getNextCategoryId,
  readLanguages,
  writeLanguages,
  getNextLanguageId,
} = require('../utils/dictionaryStorage');

function addBackwardCompatibility(terms) {
  const categories = readCategories();
  const categoryIdToName = {};
  categories.forEach((c) => {
    if (c.id) categoryIdToName[c.id] = c.name || c.aliasName;
  });

  return terms.map((term) => {
    const result = { ...term };
    if (term.categoryId && !term.category) {
      result.category = categoryIdToName[term.categoryId] || '';
    }
    if (term.category && !term.categoryId) {
      const foundCat = categories.find(
        (c) => c.name === term.category || c.aliasName === term.category
      );
      if (foundCat) result.categoryId = foundCat.id;
    }
    if (term.values && Array.isArray(term.values) && term.values.length > 0) {
      const defaultValue = term.values.find((v) => v.isDefault);
      const nonDefaultValue = term.values.find((v) => !v.isDefault);
      result.engValue =
        defaultValue?.value || term.values[0]?.value || '';
      result.langValue =
        nonDefaultValue?.value ||
        defaultValue?.value ||
        term.values[0]?.value ||
        '';
    } else if (!result.engValue && !result.langValue) {
      result.engValue = result.engValue || '';
      result.langValue = result.langValue || '';
    }
    return result;
  });
}

function addCategoryBackwardCompatibility(categories) {
  const idToName = {};
  categories.forEach((c) => {
    if (c.id) idToName[c.id] = c.name || c.aliasName;
  });

  return categories.map((cat) => {
    const result = { ...cat };
    if (cat.aliasName && !cat.name) result.name = cat.aliasName;
    if (cat.name && !cat.aliasName) result.aliasName = cat.name;
    if (cat.fatherCategoryId && !cat.fatherCategory) {
      result.fatherCategory = idToName[cat.fatherCategoryId] || null;
    }
    if (cat.fatherCategory && !cat.fatherCategoryId) {
      const foundCat = categories.find(
        (c) =>
          c.name === cat.fatherCategory || c.aliasName === cat.fatherCategory
      );
      if (foundCat) result.fatherCategoryId = foundCat.id;
    }
    return result;
  });
}

// —— Terms ——
router.get('/terms', (req, res) => {
  try {
    const terms = addBackwardCompatibility(readTerms());
    res.json(terms);
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

router.post('/terms/search', (req, res) => {
  try {
    const { searchTerm, searchOptions, category } = req.body;
    let terms = readTerms();

    if (category && category !== 'All Terms' && category !== null) {
      const categoryId = parseInt(category, 10);
      if (!isNaN(categoryId)) {
        terms = terms.filter((t) => t.categoryId === categoryId);
      } else {
        terms = terms.filter((t) => t.category === category);
      }
    }

    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      terms = terms.filter((term) => {
        let matches = false;
        if (searchOptions.alias && term.aliasName?.toLowerCase().includes(searchLower))
          matches = true;
        if (searchOptions.termId && String(term.id).includes(searchTerm))
          matches = true;
        if (searchOptions.values) {
          if (term.values?.some((v) => v.value?.toLowerCase().includes(searchLower)))
            matches = true;
          if (
            term.engValue?.toLowerCase().includes(searchLower) ||
            term.langValue?.toLowerCase().includes(searchLower)
          )
            matches = true;
        }
        if (searchOptions.uiLang) {
          if (
            term.values?.some(
              (v) => !v.isDefault && v.value?.toLowerCase().includes(searchLower)
            )
          )
            matches = true;
          if (term.langValue?.toLowerCase().includes(searchLower)) matches = true;
        }
        return matches;
      });
    }

    res.json(addBackwardCompatibility(terms));
  } catch (err) {
    console.error('Error searching terms:', err);
    res.status(500).json({ error: 'Failed to search terms' });
  }
});

router.post('/terms', (req, res) => {
  try {
    const terms = readTerms();
    const newTerm = {
      ...req.body,
      id: req.body.id || getNextId(terms),
    };
    terms.push(newTerm);
    if (writeTerms(terms)) res.status(201).json(newTerm);
    else res.status(500).json({ error: 'Failed to save term' });
  } catch (err) {
    console.error('Error creating term:', err);
    res.status(500).json({ error: 'Failed to create term' });
  }
});

router.put('/terms/:id', (req, res) => {
  try {
    const terms = readTerms();
    const termId = parseInt(req.params.id, 10);
    const idx = terms.findIndex((t) => t.id === termId);
    if (idx === -1) return res.status(404).json({ error: 'Term not found' });
    terms[idx] = { ...terms[idx], ...req.body, id: termId };
    if (writeTerms(terms)) res.json(terms[idx]);
    else res.status(500).json({ error: 'Failed to update term' });
  } catch (err) {
    console.error('Error updating term:', err);
    res.status(500).json({ error: 'Failed to update term' });
  }
});

router.delete('/terms/:id', (req, res) => {
  try {
    const terms = readTerms();
    const termId = parseInt(req.params.id, 10);
    const filtered = terms.filter((t) => t.id !== termId);
    if (filtered.length === terms.length)
      return res.status(404).json({ error: 'Term not found' });
    if (writeTerms(filtered)) res.json({ message: 'Term deleted successfully' });
    else res.status(500).json({ error: 'Failed to delete term' });
  } catch (err) {
    console.error('Error deleting term:', err);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

router.post('/terms/bulk', (req, res) => {
  try {
    const { terms } = req.body;
    if (!Array.isArray(terms))
      return res.status(400).json({ error: 'Terms must be an array' });
    if (writeTerms(terms))
      res.json({ message: 'Terms saved successfully', count: terms.length });
    else res.status(500).json({ error: 'Failed to save terms' });
  } catch (err) {
    console.error('Error saving terms in bulk:', err);
    res.status(500).json({ error: 'Failed to save terms' });
  }
});

// —— Categories ——
router.get('/categories', (req, res) => {
  try {
    let categories = addCategoryBackwardCompatibility(readCategories());
    const terms = readTerms();
    const withCounts = categories.map((cat) => {
      const name = cat.name || cat.aliasName;
      const count = terms.filter(
        (t) =>
          t.category === name ||
          t.category === cat.aliasName ||
          t.category === cat.name
      ).length;
      return { ...cat, count };
    });
    res.json(withCounts);
  } catch (err) {
    console.error('Error getting categories:', err);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.post('/categories', (req, res) => {
  try {
    const categories = readCategories();
    const newCat = {
      ...req.body,
      id: req.body.id || getNextCategoryId(categories),
    };
    categories.push(newCat);
    if (writeCategories(categories)) res.status(201).json(newCat);
    else res.status(500).json({ error: 'Failed to save category' });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const categories = readCategories();
    const id = parseInt(req.params.id, 10);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Category not found' });
    categories[idx] = { ...categories[idx], ...req.body, id };
    if (writeCategories(categories)) res.json(categories[idx]);
    else res.status(500).json({ error: 'Failed to update category' });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const categories = readCategories();
    const id = parseInt(req.params.id, 10);
    const filtered = categories.filter((c) => c.id !== id);
    if (filtered.length === categories.length)
      return res.status(404).json({ error: 'Category not found' });
    if (writeCategories(filtered))
      res.json({ message: 'Category deleted successfully' });
    else res.status(500).json({ error: 'Failed to delete category' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// —— Languages ——
router.get('/languages', (req, res) => {
  try {
    const languages = readLanguages().map((lang) => {
      const result = { ...lang };
      if (!result.name && result.cultureName)
        result.name = result.cultureName.split('-')[0];
      if (!result.code)
        result.code = result.iso2LettersCode || result.iso3LettersCode || '';
      if (result.isUI === undefined)
        result.isUI = result.isDisplayed !== undefined ? result.isDisplayed : true;
      return result;
    });
    res.json(languages);
  } catch (err) {
    console.error('Error getting languages:', err);
    res.status(500).json({ error: 'Failed to get languages' });
  }
});

router.post('/languages', (req, res) => {
  try {
    const languages = readLanguages();
    const newLang = {
      ...req.body,
      id: req.body.id || getNextLanguageId(languages),
    };
    languages.push(newLang);
    if (writeLanguages(languages)) res.status(201).json(newLang);
    else res.status(500).json({ error: 'Failed to save language' });
  } catch (err) {
    console.error('Error creating language:', err);
    res.status(500).json({ error: 'Failed to create language' });
  }
});

router.put('/languages/:id', (req, res) => {
  try {
    const languages = readLanguages();
    const id = parseInt(req.params.id, 10);
    const idx = languages.findIndex((l) => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Language not found' });
    languages[idx] = { ...languages[idx], ...req.body, id };
    if (writeLanguages(languages)) res.json(languages[idx]);
    else res.status(500).json({ error: 'Failed to update language' });
  } catch (err) {
    console.error('Error updating language:', err);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

router.delete('/languages/:id', (req, res) => {
  try {
    const languages = readLanguages();
    const id = parseInt(req.params.id, 10);
    const filtered = languages.filter((l) => l.id !== id);
    if (filtered.length === languages.length)
      return res.status(404).json({ error: 'Language not found' });
    if (writeLanguages(filtered))
      res.json({ message: 'Language deleted successfully' });
    else res.status(500).json({ error: 'Failed to delete language' });
  } catch (err) {
    console.error('Error deleting language:', err);
    res.status(500).json({ error: 'Failed to delete language' });
  }
});

module.exports = router;
