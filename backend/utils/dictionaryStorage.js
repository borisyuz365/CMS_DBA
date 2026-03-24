/**
 * Dictionary storage – sync read/write for terms, categories, languages.
 * Uses backend/data (same files as rest of app).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'terms.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const LANGUAGES_FILE = path.join(DATA_DIR, 'languages.json');

const ensureDataDirectory = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readTerms = () => {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading terms:', e);
    return [];
  }
};

const writeTerms = (terms) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(DATA_FILE, JSON.stringify(terms, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing terms:', e);
    return false;
  }
};

const getNextId = (terms) => {
  if (!terms.length) return 1;
  return Math.max(...terms.map((t) => t.id || 0)) + 1;
};

const readCategories = () => {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(CATEGORIES_FILE)) return [];
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading categories:', e);
    return [];
  }
};

const writeCategories = (categories) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing categories:', e);
    return false;
  }
};

const getNextCategoryId = (categories) => {
  if (!categories.length) return 1;
  return Math.max(...categories.map((c) => c.id || 0)) + 1;
};

const readLanguages = () => {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(LANGUAGES_FILE)) return [];
    return JSON.parse(fs.readFileSync(LANGUAGES_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading languages:', e);
    return [];
  }
};

const writeLanguages = (languages) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(LANGUAGES_FILE, JSON.stringify(languages, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing languages:', e);
    return false;
  }
};

const getNextLanguageId = (languages) => {
  if (!languages.length) return 1;
  return Math.max(...languages.map((l) => l.id || 0)) + 1;
};

module.exports = {
  readTerms,
  writeTerms,
  getNextId,
  readCategories,
  writeCategories,
  getNextCategoryId,
  readLanguages,
  writeLanguages,
  getNextLanguageId,
};
