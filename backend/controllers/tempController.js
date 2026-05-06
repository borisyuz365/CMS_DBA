const dataLoader = require('../utils/dataLoader');
const countrySuggest = require('../utils/countrySuggest');
const competitionSuggest = require('../utils/competitionSuggest');
const competitorSuggest = require('../utils/competitorSuggest');
const athleteSuggest = require('../utils/athleteSuggest');

const TEMP_FILES = {
  countries: 'temp/countries_temp.json',
  competitions: 'temp/competitions_temp.json',
  competitors: 'temp/competitors_temp.json',
  athletes: 'temp/athletes_temp.json',
  seasons: 'temp/seasons_temp.json',
  phases: 'temp/phases_temp.json',
};

const TEMP_ID_FIELDS = {
  countries: 'COUNTRY_ID',
  competitions: 'COMPETITION_ID',
  competitors: 'COMPETITOR_ID',
  athletes: 'ATHLETE_ID',
  seasons: 'SEASON_TEMP_ID',
  phases: 'PHASE_TEMP_ID',
};

const ENTITY_FILES = {
  countries: 'countries.json',
  competitions: 'competitions.json',
  competitors: 'competitors.json',
  athletes: 'athletes.json',
};

const ENTITY_ID_FIELDS = {
  countries: 'COUNTRY_ID',
  competitions: 'COMPETITION_ID',
  competitors: 'COMPETITOR_ID',
  athletes: 'ATHLETE_ID',
};

/**
 * Facets exposed to the client for filtering the temp table.
 * Only facets whose `field` exists on the temp rows will be populated
 * (missing fields just yield an empty list).
 */
const FACET_CONFIG = [
  {
    key: 'sportTypes',
    field: 'SPORT_TYPE_ID',
    paramKey: 'sportTypeIds',
    lookupFile: 'sports.json',
    lookupKey: 'SPORT_TYPE_ID',
    labelKey: 'ALIAS_NAME',
    fallbackLabel: (id) => `Sport ${id}`,
  },
  {
    key: 'dataSources',
    field: 'DATA_SOURCE_ID',
    paramKey: 'dataSourceIds',
    lookupFile: 'data_sources.json',
    lookupKey: 'DATA_SOURCE_ID',
    labelKey: 'ALIAS_NAME',
    fallbackLabel: (id) => `Source ${id}`,
  },
  {
    key: 'competitions',
    field: 'COMPETITION_ID',
    paramKey: 'competitionIds',
    entities: ['competitors', 'athletes'],
    buildLookup: async () => {
      const [competitions, terms] = await Promise.all([
        dataLoader.loadData('competitions.json'),
        dataLoader.loadData('terms.json'),
      ]);
      const termsById = new Map();
      (terms || []).forEach((t) => {
        if (t?.id != null) termsById.set(Number(t.id), t);
      });
      const map = new Map();
      (competitions || []).forEach((c) => {
        const id = Number(c.COMPETITION_ID);
        if (!Number.isFinite(id) || c.IS_DELETED) return;
        let name = null;
        if (c.NAME_ID != null) {
          const term = termsById.get(Number(c.NAME_ID));
          if (term && Array.isArray(term.values)) {
            const def = term.values.find((v) => v.isDefault);
            const en = term.values.find((v) => Number(v.languageId) === 1);
            name = (def || en || term.values[0])?.value || null;
          }
        }
        map.set(id, name || `Competition ${id}`);
      });
      return map;
    },
    fallbackLabel: (id) => `Competition ${id}`,
  },
  {
    key: 'competitors',
    field: 'COMPETITOR_ID',
    paramKey: 'competitorIds',
    entities: ['athletes'],
    buildLookup: async () => {
      const [competitors, terms] = await Promise.all([
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('terms.json'),
      ]);
      const termsById = new Map();
      (terms || []).forEach((t) => {
        if (t?.id != null) termsById.set(Number(t.id), t);
      });
      const map = new Map();
      (competitors || []).forEach((c) => {
        const id = Number(c.COMPETITOR_ID);
        if (!Number.isFinite(id) || c.IS_DELETED) return;
        let name = null;
        if (c.NAME_ID != null) {
          const term = termsById.get(Number(c.NAME_ID));
          if (term && Array.isArray(term.values)) {
            const def = term.values.find((v) => v.isDefault);
            const en = term.values.find((v) => Number(v.languageId) === 1);
            name = (def || en || term.values[0])?.value || null;
          }
        }
        map.set(id, name || `Competitor ${id}`);
      });
      return map;
    },
    fallbackLabel: (id) => `Competitor ${id}`,
  },
  {
    key: 'countries',
    field: 'COUNTRY_ID',
    entityFieldOverrides: { athletes: 'NATIONALITY_ID' },
    paramKey: 'countryIds',
    entities: ['competitions', 'competitors', 'athletes'],
    buildLookup: async () => {
      const [countries, terms] = await Promise.all([
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('terms.json'),
      ]);
      const termsById = new Map();
      (terms || []).forEach((t) => {
        if (t?.id != null) termsById.set(Number(t.id), t);
      });
      const map = new Map();
      (countries || []).forEach((c) => {
        const id = Number(c.COUNTRY_ID);
        if (!Number.isFinite(id)) return;
        let name = null;
        if (c.NAME_ID != null) {
          const term = termsById.get(Number(c.NAME_ID));
          if (term && Array.isArray(term.values)) {
            const def = term.values.find((v) => v.isDefault);
            const en = term.values.find((v) => Number(v.languageId) === 1);
            name = (def || en || term.values[0])?.value || null;
          }
        }
        map.set(id, name || `Country ${id}`);
      });
      return map;
    },
    fallbackLabel: (id) => `Country ${id}`,
  },
];

function resolveEntity(req, res) {
  const entity = req.params.entity;
  if (!TEMP_FILES[entity]) {
    res.status(404).json({ success: false, error: { message: `Unknown temp entity '${entity}'` } });
    return null;
  }
  return entity;
}

function parseBool(value, defaultValue) {
  if (value == null || value === '') return defaultValue;
  const s = String(value).toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return defaultValue;
}

function parseIdArray(value) {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of raw) {
    const parts = String(item).split(',');
    for (const p of parts) {
      const trimmed = String(p).trim();
      if (!trimmed) continue;
      const n = Number(trimmed);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

function parseIntOr(value, defaultValue) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

class TempController {
  /**
   * List temp rows with server-side filtering, pagination and facets.
   * Query params:
   *   search        - substring match on NAME (case-insensitive).
   *   sportTypeIds  - repeatable or csv; restricts SPORT_TYPE_ID.
   *   dataSourceIds - repeatable or csv; restricts DATA_SOURCE_ID.
   *   showHidden    - 'true'|'false' (default false). When false, ACTIVE=0 rows are hidden.
   *   page          - 0-based page index (default 0).
   *   pageSize      - page size (default 25, max 500).
   *
   * Response data:
   *   { rows, total, page, pageSize, facets: { sportTypes:[{id,label,count}], dataSources:[...] } }
   *
   * Each facet list is computed with every other filter applied EXCEPT the
   * filter that the facet drives (so a user can still expand their selection
   * in that dropdown). Hidden rows are always excluded from facets unless
   * `showHidden` is true, to mirror what the table shows.
   */
  async getAll(req, res, next) {
    try {
      const entity = resolveEntity(req, res);
      if (!entity) return;

      const q = req.query || {};
      const search = String(q.search || '').trim().toLowerCase();
      const sportTypeIds = parseIdArray(q.sportTypeIds);
      const dataSourceIds = parseIdArray(q.dataSourceIds);
      const countryIds = parseIdArray(q.countryIds);
      const competitionIds = parseIdArray(q.competitionIds);
      const competitorIds = parseIdArray(q.competitorIds);
      const showHidden = parseBool(q.showHidden, false);
      const page = Math.max(0, parseIntOr(q.page, 0));
      const pageSize = Math.min(500, Math.max(1, parseIntOr(q.pageSize, 25)));

      const list = (await dataLoader.loadData(TEMP_FILES[entity])) || [];

      const entityFacets = FACET_CONFIG.filter(
        (cfg) => !cfg.entities || cfg.entities.includes(entity)
      );

      const lookupMaps = {};
      await Promise.all(
        entityFacets.map(async (cfg) => {
          try {
            if (cfg.buildLookup) {
              lookupMaps[cfg.key] = await cfg.buildLookup();
            } else {
              const rows = (await dataLoader.loadData(cfg.lookupFile)) || [];
              const map = new Map();
              for (const r of rows) {
                const id = Number(r[cfg.lookupKey]);
                if (Number.isFinite(id)) map.set(id, r[cfg.labelKey]);
              }
              lookupMaps[cfg.key] = map;
            }
          } catch {
            lookupMaps[cfg.key] = new Map();
          }
        })
      );

      const predicates = {
        hidden: (r) => showHidden || Number(r.ACTIVE) !== 0,
        search: (r) => !search || String(r.NAME || '').toLowerCase().includes(search),
        sportTypes: (r) => {
          if (sportTypeIds.length === 0) return true;
          if (r.SPORT_TYPE_ID == null) return false;
          return sportTypeIds.includes(Number(r.SPORT_TYPE_ID));
        },
        dataSources: (r) => {
          if (dataSourceIds.length === 0) return true;
          if (r.DATA_SOURCE_ID == null) return false;
          return dataSourceIds.includes(Number(r.DATA_SOURCE_ID));
        },
        competitions: (r) => {
          if (competitionIds.length === 0) return true;
          if (r.COMPETITION_ID == null) return false;
          return competitionIds.includes(Number(r.COMPETITION_ID));
        },
        competitors: (r) => {
          if (competitorIds.length === 0) return true;
          if (r.COMPETITOR_ID == null) return false;
          return competitorIds.includes(Number(r.COMPETITOR_ID));
        },
        countries: (r) => {
          if (countryIds.length === 0) return true;
          const cid = r.COUNTRY_ID ?? r.NATIONALITY_ID;
          if (cid == null) return false;
          return countryIds.includes(Number(cid));
        },
      };

      const applyAllExcept = (rows, skipKey) =>
        rows.filter((r) =>
          Object.entries(predicates).every(([key, fn]) => (key === skipKey ? true : fn(r)))
        );

      const filtered = applyAllExcept(list, null);

      const facets = {};
      for (const cfg of entityFacets) {
        const rowsForFacet = applyAllExcept(list, cfg.key);
        const counts = new Map();
        const fieldName = cfg.entityFieldOverrides?.[entity] || cfg.field;
        for (const r of rowsForFacet) {
          const raw = r[fieldName];
          if (raw == null) continue;
          const id = Number(raw);
          if (!Number.isFinite(id)) continue;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        const lookup = lookupMaps[cfg.key] || new Map();
        const items = Array.from(counts.entries())
          .map(([id, count]) => ({
            id,
            label: lookup.get(id) || cfg.fallbackLabel(id),
            count,
          }))
          .sort((a, b) => String(a.label).localeCompare(String(b.label)));
        facets[cfg.key] = items;
      }

      const total = filtered.length;
      const start = page * pageSize;
      const rows = filtered.slice(start, start + pageSize);

      res.json({
        success: true,
        data: { rows, total, page, pageSize, facets },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const entity = resolveEntity(req, res);
      if (!entity) return;
      const idField = TEMP_ID_FIELDS[entity];
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }
      const list = await dataLoader.loadData(TEMP_FILES[entity]);
      const idx = (list || []).findIndex((r) => Number(r[idField]) === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: { message: 'Temp record not found' } });
      }
      const changes = req.body || {};
      list[idx] = { ...list[idx], ...changes, [idField]: list[idx][idField] };
      await dataLoader.saveData(TEMP_FILES[entity], list);
      res.json({ success: true, data: list[idx] });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const entity = resolveEntity(req, res);
      if (!entity) return;
      const idField = TEMP_ID_FIELDS[entity];
      const list = await dataLoader.loadData(TEMP_FILES[entity]);
      const ids = new Set();
      if (req.params.id != null) ids.add(Number(req.params.id));
      if (Array.isArray(req.body?.ids)) req.body.ids.forEach((x) => ids.add(Number(x)));
      if (ids.size === 0) {
        return res.status(400).json({ success: false, error: { message: 'No ids provided' } });
      }
      const next = (list || []).filter((r) => !ids.has(Number(r[idField])));
      await dataLoader.saveData(TEMP_FILES[entity], next);
      res.json({ success: true, data: { removed: (list || []).length - next.length } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Connect temp row(s) of an entity to a real entity by adding the temp NAME(s)
   * as values to the term that the real entity's NAME_ID points to (language
   * comes from each temp row's LANG_ID). Then removes the temp row(s).
   *
   * Body: { tempIds: number[], targetId: number }
   */
  async connect(req, res, next) {
    try {
      const entity = resolveEntity(req, res);
      if (!entity) return;
      if (!ENTITY_FILES[entity]) {
        return res.status(400).json({ success: false, error: { message: `Connect not supported for '${entity}'` } });
      }
      const tempIdField = TEMP_ID_FIELDS[entity];
      const entityIdField = ENTITY_ID_FIELDS[entity];
      const { tempIds, targetId } = req.body || {};
      if (!Array.isArray(tempIds) || tempIds.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'tempIds array is required' } });
      }
      if (targetId == null || !Number.isFinite(Number(targetId))) {
        return res.status(400).json({ success: false, error: { message: 'targetId is required' } });
      }

      const [tempList, entityList, terms] = await Promise.all([
        dataLoader.loadData(TEMP_FILES[entity]),
        dataLoader.loadData(ENTITY_FILES[entity]),
        dataLoader.loadData('terms.json'),
      ]);

      const target = (entityList || []).find((r) => Number(r[entityIdField]) === Number(targetId));
      if (!target) {
        return res.status(404).json({ success: false, error: { message: `${entity} with id ${targetId} not found` } });
      }
      const nameId = target.NAME_ID;
      const termIdx = (terms || []).findIndex((t) => Number(t.id) === Number(nameId));
      if (termIdx === -1) {
        return res.status(404).json({ success: false, error: { message: `Term with id ${nameId} not found` } });
      }

      const wantedIds = new Set(tempIds.map((x) => Number(x)));
      const selectedRows = (tempList || []).filter((r) => wantedIds.has(Number(r[tempIdField])));
      if (selectedRows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'No matching temp rows found' } });
      }

      const term = terms[termIdx];
      if (!Array.isArray(term.values)) term.values = [];

      let added = 0;
      for (const row of selectedRows) {
        const value = String(row.NAME ?? '').trim();
        const languageId = Number(row.LANG_ID);
        if (!value || !Number.isFinite(languageId)) continue;
        const exists = term.values.some(
          (v) => Number(v.languageId) === languageId && String(v.value).trim().toLowerCase() === value.toLowerCase()
        );
        if (exists) continue;
        term.values.push({ languageId, value, isDefault: false, status: 'Approved' });
        added += 1;
      }
      term.valsCount = term.values.length;
      terms[termIdx] = term;

      const remainingTemp = (tempList || []).filter((r) => !wantedIds.has(Number(r[tempIdField])));

      const savePromises = [
        dataLoader.saveData('terms.json', terms),
        dataLoader.saveData(TEMP_FILES[entity], remainingTemp),
      ];

      let contractCreated = null;
      if (entity === 'athletes') {
        const firstRow = selectedRows[0];
        const competitorId = firstRow.COMPETITOR_ID != null ? Number(firstRow.COMPETITOR_ID) : null;
        if (competitorId != null && Number.isFinite(competitorId) && competitorId > 0) {
          const contracts = (await dataLoader.loadData('athlete_contracts.json').catch(() => [])) || [];
          const athleteId = Number(targetId);

          contracts.forEach((c) => {
            if (c.ATHLETE_ID === athleteId && c.CURRENT_CLUB === true) {
              c.CURRENT_CLUB = false;
            }
          });

          const maxContractId = contracts.length > 0
            ? Math.max(...contracts.map((c) => c.CONTRACT_ID || 0))
            : 0;

          let startDate = null;
          const raw = firstRow.CREATED_TIME;
          if (raw) {
            const m = String(raw).match(/^(\d{2})\/(\d{2})\/(\d{2})/);
            if (m) startDate = `20${m[1]}-${m[2]}-${m[3]}`;
          }

          const jerseyNum = firstRow.JERSEY_NUM != null && Number(firstRow.JERSEY_NUM) > 0
            ? Number(firstRow.JERSEY_NUM)
            : null;

          contractCreated = {
            ATHLETE_ID: athleteId,
            COMPETITOR_ID: competitorId,
            START_DATE: startDate,
            END_DATE: null,
            CURRENT_CLUB: true,
            JERSEY_NUMBER: jerseyNum,
            TRANSFER_TYPE: null,
            TRANSFER_FEE: null,
            TRANSFER_FEE_CURRENCY: null,
            SALARY: null,
            SALARY_CURRENCY: null,
            POSITION: null,
            FORMATION_POSITION: null,
            BLOCK_AUTOMATIC_UPDATES: false,
            MAIN_COMPETITION_ID: null,
            CONTRACT_ID: maxContractId + 1,
          };
          contracts.push(contractCreated);
          savePromises.push(dataLoader.saveData('athlete_contracts.json', contracts));
        }
      }

      await Promise.all(savePromises);

      countrySuggest.invalidateIndex();
      competitionSuggest.invalidateIndex();
      if (entity === 'athletes') athleteSuggest.invalidateIndex();

      const responseData = { addedValues: added, removedTempRows: selectedRows.length, term };
      if (contractCreated) responseData.contractCreated = contractCreated;
      res.json({ success: true, data: responseData });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suggest the top-N existing countries that best match the NAME(s) of
   * the supplied temp row(s).
   *
   * Gates enforced here (per product requirements):
   *   - supported only for `entity === 'countries'`
   *   - 1 <= rows.length <= 3 (more than 3 -> empty list)
   *   - each row's NAME must have more than 3 characters after normalization
   *     (shorter names are too noisy to match meaningfully).
   *
   * Body:
   *   { rows: [{ NAME, LANG_ID }], limit?: number }
   *   -- or, for backwards compatibility --
   *   { tempIds: number[], limit?: number }   (server resolves rows from disk)
   *
   * The `rows` form is preferred because the temp file is known to contain
   * multiple records sharing the same COUNTRY_ID; resolving by id on the
   * server can pull in rows the user didn't actually select.
   *
   * Response data: { suggestions: Array<{ entityId, score, reason }> }
   */
  async suggest(req, res, next) {
    try {
      const entity = resolveEntity(req, res);
      if (!entity) return;
      if (entity !== 'countries' && entity !== 'competitions' && entity !== 'competitors' && entity !== 'athletes') {
        return res
          .status(400)
          .json({ success: false, error: { message: `Suggestions not supported for '${entity}'` } });
      }

      const { rows, tempIds, limit, countryIds, competitionIds, competitorIds } = req.body || {};

      let selectedRows = [];
      if (Array.isArray(rows) && rows.length > 0) {
        selectedRows = rows
          .map((r) => ({
            NAME: r?.NAME ?? r?.name ?? '',
            LANG_ID: r?.LANG_ID ?? r?.languageId ?? null,
            COUNTRY_ID: r?.COUNTRY_ID ?? null,
          }))
          .filter((r) => r.NAME);
      } else if (Array.isArray(tempIds) && tempIds.length > 0) {
        const tempIdField = TEMP_ID_FIELDS[entity];
        const tempList = (await dataLoader.loadData(TEMP_FILES[entity])) || [];
        const wanted = new Set(tempIds.map((x) => Number(x)));
        const seen = new Set();
        for (const r of tempList) {
          const id = Number(r[tempIdField]);
          if (!wanted.has(id) || seen.has(id)) continue;
          seen.add(id);
          selectedRows.push(r);
        }
      } else {
        return res
          .status(400)
          .json({ success: false, error: { message: 'Either rows or tempIds must be provided' } });
      }

      if (selectedRows.length === 0 || selectedRows.length > 3) {
        return res.json({ success: true, data: { suggestions: [] } });
      }

      const opts = {
        limit: limit != null ? Number(limit) : 3,
        defaultLanguageId: 1,
        minLength: 4,
      };

      let suggestions;
      if (entity === 'countries') {
        suggestions = await countrySuggest.suggestCountries(selectedRows, opts);
      } else if (entity === 'competitors') {
        const filterCountryIds = Array.isArray(countryIds)
          ? countryIds.map(Number).filter(Number.isFinite)
          : [];
        const filterCompetitionIds = Array.isArray(competitionIds)
          ? competitionIds.map(Number).filter(Number.isFinite)
          : [];
        suggestions = await competitorSuggest.suggestCompetitors(selectedRows, {
          ...opts,
          countryIds: filterCountryIds,
          competitionIds: filterCompetitionIds,
        });
      } else if (entity === 'athletes') {
        const filterCompetitorIds = Array.isArray(competitorIds)
          ? competitorIds.map(Number).filter(Number.isFinite)
          : [];
        suggestions = await athleteSuggest.suggestAthletes(selectedRows, {
          ...opts,
          competitorIds: filterCompetitorIds,
        });
      } else {
        const filterCountryIds = Array.isArray(countryIds)
          ? countryIds.map(Number).filter(Number.isFinite)
          : [];
        suggestions = await competitionSuggest.suggestCompetitions(selectedRows, {
          ...opts,
          countryIds: filterCountryIds,
        });
      }

      res.json({ success: true, data: { suggestions } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TempController();
