// Terms read/write helpers for DBA template translations.
// Sits on top of utils/dictionaryStorage so the rest of the CMS keeps using
// the same terms.json file.
const dictionaryStorage = require('../utils/dictionaryStorage');

const ENGLISH = 1;

// Resolve a term to a string for the requested language. Priority chain
// matches the CMS-wide convention used in athletes/competitors controllers:
//   1) exact languageId match (Approved preferred)
//   2) English (langId 1)
//   3) first isDefault: true value
//   4) any Approved value
//   5) first value
function resolveTerm(term, langId) {
  if (!term || !Array.isArray(term.values) || term.values.length === 0) return null;
  const byLang = (id, requireApproved = false) =>
    term.values.find((v) => v.languageId === id && (!requireApproved || v.status === 'Approved'));
  let v = byLang(langId, true);
  if (!v) v = byLang(langId, false);
  if (!v && langId !== ENGLISH) v = byLang(ENGLISH, true) || byLang(ENGLISH, false);
  if (!v) v = term.values.find((x) => x.isDefault);
  if (!v) v = term.values.find((x) => x.status === 'Approved');
  if (!v) v = term.values[0];
  return v ? v.value : null;
}

function findTerm(terms, id) {
  return terms.find((t) => t.id === id) || null;
}

// Given a `{langId: value}` object, build a `values[]` array. If `prev` term is
// supplied, preserve its non-overlapping language values.
function buildValues(translations, prev = null) {
  const next = new Map();
  if (prev && Array.isArray(prev.values)) {
    for (const v of prev.values) next.set(v.languageId, { ...v });
  }
  for (const [langIdStr, value] of Object.entries(translations || {})) {
    const langId = parseInt(langIdStr, 10);
    if (!Number.isFinite(langId)) continue;
    const trimmed = value == null ? '' : String(value).trim();
    if (trimmed === '') {
      // Empty value removes the language entry.
      next.delete(langId);
      continue;
    }
    const existing = next.get(langId);
    next.set(langId, {
      languageId: langId,
      value: trimmed,
      isDefault: existing ? !!existing.isDefault : (langId === ENGLISH),
      status: existing ? existing.status : 'Approved',
    });
  }
  return Array.from(next.values());
}

// Upsert a term in terms.json. Returns the term id.
// - If `id` is provided and exists, update its values (preserving languages not
//   present in `translations`).
// - Else create a new term and return its new id.
function upsertTerm({ id, translations, aliasName, categoryId = null, category = '' }) {
  const terms = dictionaryStorage.readTerms();
  let term = id ? findTerm(terms, id) : null;
  const newValues = buildValues(translations, term);
  if (newValues.length === 0) {
    // No translations to store. If there's no existing term, do nothing.
    return term ? term.id : null;
  }
  if (term) {
    term.values = newValues;
    term.valsCount = newValues.length;
    if (aliasName && !term.aliasName) term.aliasName = aliasName;
    dictionaryStorage.writeTerms(terms);
    return term.id;
  }
  const newId = dictionaryStorage.getNextId(terms);
  const created = {
    id: newId,
    categoryId,
    aliasName: aliasName || null,
    fatherTerm: null,
    createTime: new Date().toISOString(),
    description: null,
    category,
    values: newValues,
    valsCount: newValues.length,
  };
  terms.push(created);
  dictionaryStorage.writeTerms(terms);
  return newId;
}

// Read all language values for a term, returned as `{langId: value}`.
// Used by the GET endpoint so the editor can pre-populate the popover.
function readTranslations(termId) {
  if (!termId) return null;
  const terms = dictionaryStorage.readTerms();
  const term = findTerm(terms, termId);
  if (!term) return null;
  const out = {};
  for (const v of term.values || []) out[v.languageId] = v.value;
  return out;
}

module.exports = {
  ENGLISH,
  resolveTerm,
  findTerm,
  upsertTerm,
  readTranslations,
};
