const dataLoader = require('../utils/dataLoader');

/**
 * Resolve term name by ID with fallback logic
 * @param {Object} term - The term object
 * @param {number} languageId - Optional language ID to prefer
 */
function resolveTermName(term, languageId = null) {
  if (!term) return null;
  if (languageId && term.values && Array.isArray(term.values)) {
    const languageValue = term.values.find(v => v.languageId === languageId);
    if (languageValue && languageValue.value) return languageValue.value;
  }
  if (term.engValue) return term.engValue;
  if (term.values && Array.isArray(term.values)) {
    const englishValue = term.values.find(v => v.languageId === 1);
    if (englishValue && englishValue.value) return englishValue.value;
    const defaultValue = term.values.find(v => v.isDefault === true);
    if (defaultValue && defaultValue.value) return defaultValue.value;
    const approvedValue = term.values.find(v => v.status === 'Approved');
    if (approvedValue && approvedValue.value) return approvedValue.value;
    if (term.values.length > 0 && term.values[0].value) return term.values[0].value;
  }
  return null;
}

/**
 * Enrich TV network with related entities
 */
async function enrichTvNetwork(network, terms, countries, countriesRestrictions, languageId = null) {
  const enriched = { ...network };
  if (network.NAME_ID) {
    const nameTerm = terms.find(t => t.id === network.NAME_ID);
    enriched.name = resolveTermName(nameTerm, languageId) || 'Unknown';
  } else {
    enriched.name = 'Unknown';
  }

  const countryIds = Array.isArray(network.COUNTRY_IDS) && network.COUNTRY_IDS.length > 0
    ? network.COUNTRY_IDS
    : (network.COUNTRY_ID ? [network.COUNTRY_ID] : []);

  enriched.COUNTRY_IDS = countryIds;
  enriched.countries = countryIds.map(cid => {
    const country = countries.find(c => c.COUNTRY_ID === cid);
    return country
      ? { COUNTRY_ID: cid, name: country.name || country.ALIAS_NAME || `Country ${cid}` }
      : { COUNTRY_ID: cid, name: `Country ${cid}` };
  });
  enriched.countryName = enriched.countries.length > 0
    ? enriched.countries.map(c => c.name).join(', ')
    : null;

  const relatedCountryIds = countriesRestrictions
    .filter(r => r.TV_NETWORK_ID === network.TV_NETWORK_ID)
    .map(r => r.COUNTRY_ID);
  const uniqueRelatedIds = [...new Set(relatedCountryIds)];
  enriched.relatedCountries = uniqueRelatedIds.map(cid => {
    const country = countries.find(c => c.COUNTRY_ID === cid);
    return country
      ? { COUNTRY_ID: cid, name: country.name || country.ALIAS_NAME || `Country ${cid}` }
      : { COUNTRY_ID: cid, name: `Country ${cid}` };
  });

  return enriched;
}

/**
 * TV Networks Controller
 */
class TvNetworksController {
  async getAll(req, res, next) {
    try {
      const { tvNetworkId, country, channelName, language } = req.query;

      const [networks, terms, countries, languages, countriesRestrictions] = await Promise.all([
        dataLoader.loadData('tv_networks.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('languages.json').catch(() => []),
        dataLoader.loadData('tv_networks_countries_restrictions.json').catch(() => [])
      ]);

      let languageId = null;
      if (language) {
        const lang = languages.find(l => l.iso2LettersCode === language || l.code === language);
        if (lang) languageId = lang.id;
      }

      let filtered = [...networks];

      if (country) {
        const countryValues = Array.isArray(country) ? country : [country];
        const countryIds = countryValues.map(c => {
          const countryObj = countries.find(item => item.name === c || item.COUNTRY_ID === parseInt(c));
          return countryObj ? countryObj.COUNTRY_ID : null;
        }).filter(id => id !== null);
        if (countryIds.length > 0) {
          filtered = filtered.filter(n => {
            const netCountryIds = Array.isArray(n.COUNTRY_IDS) && n.COUNTRY_IDS.length > 0
              ? n.COUNTRY_IDS
              : (n.COUNTRY_ID ? [n.COUNTRY_ID] : []);
            if (netCountryIds.some(cid => countryIds.includes(cid))) return true;
            const relatedIds = countriesRestrictions
              .filter(r => r.TV_NETWORK_ID === n.TV_NETWORK_ID)
              .map(r => r.COUNTRY_ID);
            return relatedIds.some(cid => countryIds.includes(cid));
          });
        }
      }

      if (tvNetworkId) {
        const id = parseInt(tvNetworkId);
        if (!isNaN(id)) {
          filtered = filtered.filter(n => n.TV_NETWORK_ID === id);
        } else {
          filtered = filtered.filter(n => n.TV_NETWORK_ID.toString().includes(tvNetworkId));
        }
      }

      let enriched = await Promise.all(
        filtered.map(n => enrichTvNetwork(n, terms, countries, countriesRestrictions, languageId))
      );

      if (channelName) {
        const nameFilter = channelName.toLowerCase();
        enriched = enriched.filter(n => n.name && n.name.toLowerCase().includes(nameFilter));
      }

      res.json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid TV network ID' } });
      }

      const [networks, terms, countries, countriesRestrictions] = await Promise.all([
        dataLoader.loadData('tv_networks.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('tv_networks_countries_restrictions.json').catch(() => [])
      ]);

      const network = networks.find(n => n.TV_NETWORK_ID === id);
      if (!network) {
        return res.status(404).json({
          success: false,
          error: { message: `TV network with ID ${id} not found` }
        });
      }

      const enriched = await enrichTvNetwork(network, terms, countries, countriesRestrictions, null);
      res.json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const {
        NAME_ID,
        COUNTRY_ID,
        COUNTRY_IDS,
        WEBSITE,
        CHANNEL_TYPE,
        IS_INTERNATIONAL,
        LANG_ID,
        ORDER_LEVEL,
        PROMOTE_IN_MATCH_REMINDER_NOTIFICATION
      } = req.body;

      if (!NAME_ID) {
        return res.status(400).json({
          success: false,
          error: { message: 'NAME_ID is required' }
        });
      }

      const networks = await dataLoader.loadData('tv_networks.json');
      const maxId = networks.length > 0
        ? Math.max(...networks.map(n => n.TV_NETWORK_ID || 0))
        : 0;
      const newId = maxId + 1;

      const resolvedCountryIds = Array.isArray(COUNTRY_IDS)
        ? COUNTRY_IDS.map(id => parseInt(id)).filter(id => !isNaN(id))
        : (COUNTRY_ID === '' || COUNTRY_ID == null ? [] : [parseInt(COUNTRY_ID)]);

      const newNetwork = {
        TV_NETWORK_ID: newId,
        NAME_ID: parseInt(NAME_ID),
        COUNTRY_IDS: resolvedCountryIds,
        COUNTRY_ID: resolvedCountryIds.length > 0 ? resolvedCountryIds[0] : null,
        WEBSITE: WEBSITE || null,
        CHANNEL_TYPE: CHANNEL_TYPE === '' || CHANNEL_TYPE == null ? null : parseInt(CHANNEL_TYPE),
        IS_INTERNATIONAL: IS_INTERNATIONAL === true || IS_INTERNATIONAL === 'true' || IS_INTERNATIONAL === 1,
        LANG_ID: LANG_ID === '' || LANG_ID == null ? null : parseInt(LANG_ID),
        CONNECTED_BOOKMAKER: null,
        IMG_VER: 1,
        PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === true || PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === 'true' || PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === 1,
        ORDER_LEVEL: ORDER_LEVEL === '' || ORDER_LEVEL == null ? null : parseInt(ORDER_LEVEL)
      };

      networks.push(newNetwork);
      await dataLoader.saveData('tv_networks.json', networks);

      const [terms, countries, countriesRestrictions] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('tv_networks_countries_restrictions.json').catch(() => [])
      ]);
      const enriched = await enrichTvNetwork(newNetwork, terms, countries, countriesRestrictions, null);

      res.status(201).json({ success: true, data: enriched });
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

      const networks = await dataLoader.loadData('tv_networks.json');
      let updatedCount = 0;
      const errors = [];

      for (const update of updates) {
        const { tvNetworkId, changes } = update;
        if (!tvNetworkId || !changes || typeof changes !== 'object') {
          errors.push({ tvNetworkId, error: 'Invalid update format' });
          continue;
        }
        const idx = networks.findIndex(n => n.TV_NETWORK_ID === tvNetworkId);
        if (idx === -1) {
          errors.push({ tvNetworkId, error: 'TV network not found' });
          continue;
        }
        const net = networks[idx];
        if (changes.COUNTRY_IDS !== undefined) {
          const ids = Array.isArray(changes.COUNTRY_IDS)
            ? changes.COUNTRY_IDS.map(id => parseInt(id)).filter(id => !isNaN(id))
            : [];
          net.COUNTRY_IDS = ids;
          net.COUNTRY_ID = ids.length > 0 ? ids[0] : null;
        } else if (changes.COUNTRY_ID !== undefined) {
          net.COUNTRY_ID = changes.COUNTRY_ID === '' || changes.COUNTRY_ID == null ? null : parseInt(changes.COUNTRY_ID);
          net.COUNTRY_IDS = net.COUNTRY_ID ? [net.COUNTRY_ID] : [];
        }
        if (changes.WEBSITE !== undefined) {
          net.WEBSITE = changes.WEBSITE === '' ? null : changes.WEBSITE;
        }
        if (changes.CHANNEL_TYPE !== undefined) {
          net.CHANNEL_TYPE = changes.CHANNEL_TYPE === '' || changes.CHANNEL_TYPE == null ? null : parseInt(changes.CHANNEL_TYPE);
        }
        if (changes.IS_INTERNATIONAL !== undefined) {
          net.IS_INTERNATIONAL = changes.IS_INTERNATIONAL === true || changes.IS_INTERNATIONAL === 'true' || changes.IS_INTERNATIONAL === 1;
        }
        if (changes.LANG_ID !== undefined) {
          net.LANG_ID = changes.LANG_ID === '' || changes.LANG_ID == null ? null : parseInt(changes.LANG_ID);
        }
        if (changes.ORDER_LEVEL !== undefined) {
          net.ORDER_LEVEL = changes.ORDER_LEVEL === '' || changes.ORDER_LEVEL == null ? null : parseInt(changes.ORDER_LEVEL);
        }
        if (changes.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION !== undefined) {
          net.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION = changes.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === true || changes.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === 'true' || changes.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION === 1;
        }
        if (changes.NETWORK_IMAGE_URL !== undefined) {
          net.NETWORK_IMAGE_URL = changes.NETWORK_IMAGE_URL === '' ? null : changes.NETWORK_IMAGE_URL;
        }
        if (changes.IS_DELETED !== undefined) {
          net.IS_DELETED = changes.IS_DELETED === true || changes.IS_DELETED === 'true' || changes.IS_DELETED === 1;
        }
        updatedCount++;
      }

      await dataLoader.saveData('tv_networks.json', networks);
      res.json({
        success: true,
        data: { updated: updatedCount, errors: errors.length > 0 ? errors : undefined }
      });
    } catch (error) {
      next(error);
    }
  }
  async updateRelatedCountries(req, res, next) {
    try {
      const tvNetworkId = parseInt(req.params.id);
      if (isNaN(tvNetworkId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid TV network ID' } });
      }

      const { countryIds } = req.body;
      if (!Array.isArray(countryIds)) {
        return res.status(400).json({ success: false, error: { message: 'countryIds must be an array' } });
      }

      const restrictions = await dataLoader.loadData('tv_networks_countries_restrictions.json').catch(() => []);
      const filtered = restrictions.filter(r => r.TV_NETWORK_ID !== tvNetworkId);
      const newEntries = countryIds
        .map(id => parseInt(id))
        .filter(id => !isNaN(id))
        .map(cid => ({ TV_NETWORK_ID: tvNetworkId, COUNTRY_ID: cid }));
      const updated = [...filtered, ...newEntries];
      await dataLoader.saveData('tv_networks_countries_restrictions.json', updated);

      res.json({ success: true, data: { tvNetworkId, countryIds: newEntries.map(e => e.COUNTRY_ID) } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TvNetworksController();
