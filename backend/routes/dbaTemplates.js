// /api/dba/templates — CRUD for the DBA Ad Formats screen + template editor.
// Backed by MySQL tables `dba_templates` and `dba_template_countries`, with
// per-field translations stored in terms.json (via _dbaTerms helpers).
const express = require('express');
const dictionaryStorage = require('../utils/dictionaryStorage');
const { pool } = require('../db/mysql');
const { templateRowToJson } = require('./_dbaShape');
const { appendAuditEntry } = require('./_dbaAudit');
const {
  TRANSLATABLE_PATHS, countryToLangId, getByPath, setByPath, termIdPathFor,
} = require('./_dbaLang');
const { upsertTerm, readTranslations, resolveTerm, findTerm } = require('./_dbaTerms');
const { normalizeSizeId, INTERSTITIAL_SIZE_ID } = require('../utils/dbaSizes');

const router = express.Router();

/** Persist canonical size id + label (legacy 640x1280 → 320x480). */
function withCanonicalSize(tpl) {
  const sizeId = normalizeSizeId(tpl.sizeId);
  const size = sizeId === INTERSTITIAL_SIZE_ID
    ? 'Interstitial · 640×1280'
    : (tpl.size || sizeId);
  return { ...tpl, sizeId, size };
}

// ---- helpers --------------------------------------------------------------

async function fetchCountriesByTemplate(ids) {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT template_id, country_code FROM dba_template_countries
     WHERE template_id IN (${placeholders}) ORDER BY country_code`,
    ids,
  );
  const map = new Map();
  for (const r of rows) {
    const arr = map.get(r.template_id) || [];
    arr.push(r.country_code);
    map.set(r.template_id, arr);
  }
  return map;
}

async function replaceTemplateCountries(conn, templateId, countries) {
  await conn.query('DELETE FROM dba_template_countries WHERE template_id = ?', [templateId]);
  if (!Array.isArray(countries) || countries.length === 0) return;
  const unique = [...new Set(countries.map((c) => String(c).trim()).filter(Boolean))];
  for (const cc of unique) {
    await conn.query(
      'INSERT INTO dba_template_countries (template_id, country_code) VALUES (?, ?)',
      [templateId, cc],
    );
  }
}

// Decorate a template JSON with translation info for every TRANSLATABLE_PATH:
//  - `translations[path]`: `{langId: value}` map (full set of stored translations)
//  - `resolved[path]`:     the string the API would serve for the given langId
//                          (uses the term value, falls back to the raw field).
// All term lookups go through terms.json (read once, passed in to avoid I/O loops).
function decorateTranslations(tpl, langId) {
  const terms = dictionaryStorage.readTerms();
  const translations = {};
  const resolved = {};
  for (const path of TRANSLATABLE_PATHS) {
    const raw = getByPath(tpl, path);
    const termId = getByPath(tpl, termIdPathFor(path));
    if (termId) {
      const term = findTerm(terms, termId);
      if (term) {
        const allValues = {};
        for (const v of term.values || []) allValues[v.languageId] = v.value;
        translations[path] = allValues;
        if (langId) {
          const r = resolveTerm(term, langId);
          if (r != null) resolved[path] = r;
        }
      }
    }
    // If we couldn't resolve via term, fall back to the raw string (canonical).
    if (resolved[path] == null && raw != null) resolved[path] = raw;
  }
  return { ...tpl, translations, resolved };
}

// Pull translatable-field translations out of an incoming request body and
// upsert each into terms.json. Mutates `config` (or template) in place to set
// the corresponding `*TermId` field. Returns the updated `name` and `config`.
function applyTranslationsToTemplate(template, translationsByPath) {
  if (!translationsByPath || typeof translationsByPath !== 'object') return template;
  // Shallow clone the parts we mutate.
  const next = { ...template, config: { ...(template.config || {}) } };
  for (const path of TRANSLATABLE_PATHS) {
    const entry = translationsByPath[path];
    if (!entry || typeof entry !== 'object') continue;
    const existingId = getByPath(next, termIdPathFor(path));
    const id = upsertTerm({
      id: existingId || undefined,
      translations: entry,
      aliasName: `dba_template:${template.id || 'new'}:${path}`,
      category: 'DBA Templates',
    });
    if (id) {
      setByPath(next, termIdPathFor(path), id);
      // Also keep the English / canonical value synced on the field itself, so
      // legacy consumers that don't resolve via terms still see something.
      const english = entry[1];
      if (english != null && english !== '') setByPath(next, path, english);
    }
  }
  return next;
}

// ---- routes ---------------------------------------------------------------

router.get('/', async (req, res, next) => {
  try {
    const langId = countryToLangId(req.query.country);
    const [rows] = await pool.query('SELECT * FROM dba_templates ORDER BY modified DESC');
    const countriesByTpl = await fetchCountriesByTemplate(rows.map((r) => r.id));
    res.json(rows.map((row) =>
      decorateTranslations(templateRowToJson(row, countriesByTpl.get(row.id) || []), langId),
    ));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const langId = countryToLangId(req.query.country);
    const [[row]] = await pool.query('SELECT * FROM dba_templates WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Template not found' });
    const countriesByTpl = await fetchCountriesByTemplate([row.id]);
    const tpl = templateRowToJson(row, countriesByTpl.get(row.id) || []);
    res.json(decorateTranslations(tpl, langId));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const body = req.body || {};
    const id = body.id || `tpl_${Math.random().toString(36).slice(2, 8)}`;
    // Persist translations first, then save the template with the resulting
    // *TermId references already wired into config/name.
    const withTerms = withCanonicalSize(
      applyTranslationsToTemplate({ ...body, id }, body.translations),
    );
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO dba_templates
         (id, name, size_id, size_label, status, bookmaker_id, config, modified, modified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, withTerms.name, withTerms.sizeId, withTerms.size || null, withTerms.status || 'draft',
        withTerms.bookmakerId || null,
        JSON.stringify(withTerms.config || {}),
        new Date(),
        withTerms.modifiedBy || 'D. Benvelgy',
      ],
    );
    await replaceTemplateCountries(conn, id, withTerms.countries);
    await conn.commit();
    const [[row]] = await pool.query('SELECT * FROM dba_templates WHERE id = ?', [id]);
    const countriesByTpl = await fetchCountriesByTemplate([id]);
    const saved = decorateTranslations(templateRowToJson(row, countriesByTpl.get(id) || []), null);
    await appendAuditEntry({
      kind: saved.status === 'live' ? 'publish' : 'add',
      who: saved.modifiedBy,
      text: saved.status === 'live'
        ? `Published ${saved.name} (${saved.size || saved.sizeId})`
        : `Created template ${saved.name}`,
    });
    res.status(201).json(saved);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [[prev]] = await conn.query('SELECT * FROM dba_templates WHERE id = ?', [req.params.id]);
    if (!prev) { conn.release(); return res.status(404).json({ error: 'Template not found' }); }
    const prevJson = templateRowToJson(prev);
    const merged = { ...prevJson, ...req.body, id: prev.id };
    const withTerms = withCanonicalSize(
      applyTranslationsToTemplate(merged, req.body.translations),
    );
    await conn.beginTransaction();
    await conn.query(
      `UPDATE dba_templates
         SET name = ?, size_id = ?, size_label = ?, status = ?, bookmaker_id = ?,
             config = ?, modified = ?, modified_by = ?
       WHERE id = ?`,
      [
        withTerms.name, withTerms.sizeId, withTerms.size || null, withTerms.status, withTerms.bookmakerId || null,
        JSON.stringify(withTerms.config || {}),
        new Date(),
        withTerms.modifiedBy || 'D. Benvelgy',
        prev.id,
      ],
    );
    if (Array.isArray(req.body.countries)) {
      await replaceTemplateCountries(conn, prev.id, req.body.countries);
    }
    await conn.commit();
    const [[row]] = await pool.query('SELECT * FROM dba_templates WHERE id = ?', [prev.id]);
    const countriesByTpl = await fetchCountriesByTemplate([prev.id]);
    const saved = decorateTranslations(templateRowToJson(row, countriesByTpl.get(prev.id) || []), null);
    const goingLive = prev.status !== 'live' && saved.status === 'live';
    await appendAuditEntry({
      kind: goingLive ? 'publish' : 'edit',
      who: saved.modifiedBy,
      text: goingLive
        ? `Published ${saved.name} (${saved.size || saved.sizeId})`
        : `Edited ${saved.name} (${saved.size || saved.sizeId})`,
    });
    res.json(saved);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT name FROM dba_templates WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Template not found' });
    await pool.query('DELETE FROM dba_templates WHERE id = ?', [req.params.id]);
    await appendAuditEntry({ kind: 'edit', who: 'D. Benvelgy', text: `Deleted ${row.name}` });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
