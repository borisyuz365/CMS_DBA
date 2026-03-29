const dataLoader = require('../utils/dataLoader');

/**
 * Resolve term name by ID with fallback logic
 * Priority: engValue > English value > default value > approved value > first value
 * @param {Object} term - The term object
 * @param {number} languageId - Optional language ID to prefer
 */
function resolveTermName(term, languageId = null) {
  if (!term) return null;

  // If languageId is specified, try to find value for that language first
  if (languageId && term.values && Array.isArray(term.values)) {
    const languageValue = term.values.find(v => v.languageId === languageId);
    if (languageValue && languageValue.value) {
      return languageValue.value;
    }
  }

  // Priority 1: engValue
  if (term.engValue) {
    return term.engValue;
  }

  // Priority 2: English value (languageId: 1)
  if (term.values && Array.isArray(term.values)) {
    const englishValue = term.values.find(v => v.languageId === 1);
    if (englishValue && englishValue.value) {
      return englishValue.value;
    }

    // Priority 3: Default value
    const defaultValue = term.values.find(v => v.isDefault === true);
    if (defaultValue && defaultValue.value) {
      return defaultValue.value;
    }

    // Priority 4: Approved value
    const approvedValue = term.values.find(v => v.status === 'Approved');
    if (approvedValue && approvedValue.value) {
      return approvedValue.value;
    }

    // Priority 5: First available value
    if (term.values.length > 0 && term.values[0].value) {
      return term.values[0].value;
    }
  }

  return null;
}

/**
 * Resolve short name for a term
 * Logic:
 * - If there are 2 values in the same language, show the shorter one
 * - If there are 3+ values in the same language and multiple are shorter than default, show clickable number
 * @param {Object} term - The term object
 * @param {number} languageId - Language ID to check values for (if null, use the language of the default value)
 * @returns {Object} { shortName: string|null, showClickableNumber: boolean, shortValuesCount: number }
 */
function resolveShortName(term, languageId = null) {
  if (!term || !term.values || !Array.isArray(term.values) || term.values.length === 0) {
    return { shortName: null, showClickableNumber: false, shortValuesCount: 0 };
  }

  // Get default value and its language
  const defaultValueObj = term.values.find(v => v.isDefault === true) ||
    term.values.find(v => v.languageId === 1) ||
    term.values[0];
  
  const defaultValue = term.engValue || defaultValueObj?.value;
  const defaultLanguageId = languageId || defaultValueObj?.languageId;

  if (!defaultValue || !defaultLanguageId) {
    return { shortName: null, showClickableNumber: false, shortValuesCount: 0 };
  }

  // Filter values by the same language as default (or specified languageId)
  const relevantValues = term.values.filter(v => 
    v && v.value && v.value.trim() && v.languageId === defaultLanguageId
  );

  if (relevantValues.length === 0) {
    return { shortName: null, showClickableNumber: false, shortValuesCount: 0 };
  }

  // If only 1 value in this language, return it
  if (relevantValues.length === 1) {
    return { shortName: relevantValues[0].value, showClickableNumber: false, shortValuesCount: 0 };
  }

  // If 2 values in the same language, return the shorter one
  if (relevantValues.length === 2) {
    const shorter = relevantValues[0].value.length <= relevantValues[1].value.length
      ? relevantValues[0].value
      : relevantValues[1].value;
    return { shortName: shorter, showClickableNumber: false, shortValuesCount: 0 };
  }

  // If 3+ values in the same language, check if multiple are shorter than default
  const shorterThanDefault = relevantValues.filter(v => 
    v.value && v.value.length < defaultValue.length
  );

  if (shorterThanDefault.length >= 2) {
    // Multiple shorter values exist - show clickable number
    return { 
      shortName: null, 
      showClickableNumber: true,
      shortValuesCount: shorterThanDefault.length
    };
  } else if (shorterThanDefault.length === 1) {
    // Only one shorter value - show it
    return { shortName: shorterThanDefault[0].value, showClickableNumber: false, shortValuesCount: 0 };
  } else {
    // No shorter values - find the shortest one
    const shortest = relevantValues.reduce((shortest, current) => 
      current.value.length < shortest.value.length ? current : shortest
    );
    return { shortName: shortest.value, showClickableNumber: false, shortValuesCount: 0 };
  }
}

/**
 * Enrich venue data with related entities
 * @param {Object} venue - The venue object
 * @param {Array} terms - All terms
 * @param {Array} countries - All countries
 * @param {number} languageId - Optional language ID for name resolution
 */
async function enrichVenue(venue, terms, countries, languageId = null) {
  // Start with all original fields
  const enriched = { ...venue };

  // Resolve name from terms (add as 'name', keep original NAME_ID)
  if (venue.NAME_ID) {
    const nameTerm = terms.find(t => t.id === venue.NAME_ID);
    enriched.name = resolveTermName(nameTerm, languageId) || 'Unknown';
    
    // Resolve short name
    const shortNameResult = resolveShortName(nameTerm, languageId);
    enriched.shortName = shortNameResult.shortName;
    enriched.shortNameClickable = shortNameResult.showClickableNumber;
    enriched.shortValuesCount = shortNameResult.shortValuesCount || 0;
  } else {
    enriched.name = 'Unknown';
    enriched.shortName = null;
    enriched.shortNameClickable = false;
    enriched.shortValuesCount = 0;
  }

  // Resolve country name
  if (venue.COUNTRY_ID) {
    const country = countries.find(c => c.COUNTRY_ID === venue.COUNTRY_ID);
    enriched.countryName = country ? (country.name || country.ALIAS_NAME || `Country ${venue.COUNTRY_ID}`) : null;
  } else {
    enriched.countryName = null;
  }

  // Resolve city name from terms (category: Cities)
  if (venue.CITY_ID) {
    const cityTerm = terms.find(t => t.id === venue.CITY_ID && t.category === 'Cities');
    enriched.cityName = resolveTermName(cityTerm, languageId) || null;
  } else {
    enriched.cityName = null;
  }

  return enriched;
}

/**
 * Venue Controller
 */
class VenueController {
  /**
   * Get all venues with enrichment and filtering
   */
  async getAll(req, res, next) {
    try {
      // Get filter parameters from query
      const {
        country,
        city,
        venueId,
        venueName,
        language,
        hasCapacity,
        hasLocation
      } = req.query;

      // Load all required data
      const [venues, terms, countries, languages] = await Promise.all([
        dataLoader.loadData('venues.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('languages.json').catch(() => [])
      ]);

      // Get language ID if language code is provided
      let languageId = null;
      if (language) {
        const lang = languages.find(l => l.iso2LettersCode === language || l.code === language);
        if (lang) {
          languageId = lang.id;
        }
      }

      // Filter venues based on query parameters
      let filteredVenues = [...venues];

      // Filter by country - handle arrays
      if (country) {
        const countryValues = Array.isArray(country) ? country : [country];
        const countryIds = countryValues.map(c => {
          const countryObj = countries.find(countryItem => countryItem.name === c || countryItem.COUNTRY_ID === parseInt(c));
          return countryObj ? countryObj.COUNTRY_ID : null;
        }).filter(id => id !== null);
        
        if (countryIds.length > 0) {
          filteredVenues = filteredVenues.filter(v => countryIds.includes(v.COUNTRY_ID));
        }
      }

      // Filter by city - handle arrays
      if (city) {
        const cityValues = Array.isArray(city) ? city : [city];
        const cityIds = cityValues.map(c => {
          // Try to find by term ID or name
          const cityTerm = terms.find(t => 
            (t.id === parseInt(c) || resolveTermName(t) === c) && t.category === 'Cities'
          );
          return cityTerm ? cityTerm.id : null;
        }).filter(id => id !== null);
        
        if (cityIds.length > 0) {
          filteredVenues = filteredVenues.filter(v => cityIds.includes(v.CITY_ID));
        }
      }

      // Filter by venue ID
      if (venueId) {
        const id = parseInt(venueId);
        if (!isNaN(id)) {
          filteredVenues = filteredVenues.filter(v => v.VENUE_ID === id);
        } else {
          // Partial match
          filteredVenues = filteredVenues.filter(v => 
            v.VENUE_ID.toString().includes(venueId)
          );
        }
      }

      // Filter by hasCapacity
      if (hasCapacity === 'true' || hasCapacity === true) {
        filteredVenues = filteredVenues.filter(v => v.CAPACITY !== null && v.CAPACITY !== undefined);
      }

      // Filter by hasLocation
      if (hasLocation === 'true' || hasLocation === true) {
        filteredVenues = filteredVenues.filter(v => 
          v.LOCATION_LAT !== null && v.LOCATION_LAT !== undefined &&
          v.LOCATION_LNG !== null && v.LOCATION_LNG !== undefined
        );
      }

      // Filter by venue name (will be applied after enrichment)
      let nameFilter = null;
      if (venueName) {
        nameFilter = venueName.toLowerCase();
      }

      // Enrich each venue
      let enrichedVenues = await Promise.all(
        filteredVenues.map(venue => enrichVenue(venue, terms, countries, languageId))
      );

      // Apply name filter after enrichment
      if (nameFilter) {
        enrichedVenues = enrichedVenues.filter(v => 
          v.name && v.name.toLowerCase().includes(nameFilter)
        );
      }

      res.json({
        success: true,
        data: enrichedVenues
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue by ID with enrichment
   */
  async getById(req, res, next) {
    try {
      const venueId = parseInt(req.params.id);

      if (isNaN(venueId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid venue ID'
          }
        });
      }

      // Load all required data
      const [venues, terms, countries] = await Promise.all([
        dataLoader.loadData('venues.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json')
      ]);

      // Find venue
      const venue = venues.find(v => v.VENUE_ID === venueId);

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Venue with ID ${venueId} not found`
          }
        });
      }

      // Enrich venue
      const enrichedVenue = await enrichVenue(venue, terms, countries, null);

      res.json({
        success: true,
        data: enrichedVenue
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple venues (bulk update)
   */
  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body; // Array of { venueId, changes }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid updates array'
          }
        });
      }

      // Load venues data
      const venues = await dataLoader.loadData('venues.json');

      let updatedCount = 0;
      const errors = [];

      // Process each update
      for (const update of updates) {
        const { venueId, changes } = update;
        
        if (!venueId || !changes || typeof changes !== 'object') {
          errors.push({ venueId, error: 'Invalid update format' });
          continue;
        }

        // Find venue
        const venueIndex = venues.findIndex(v => v.VENUE_ID === venueId);
        if (venueIndex === -1) {
          errors.push({ venueId, error: 'Venue not found' });
          continue;
        }

        const venue = venues[venueIndex];

        // Apply changes - update all fields that can be changed
        if (changes.ADDRESS !== undefined) {
          venue.ADDRESS = changes.ADDRESS;
        }
        if (changes.CAPACITY !== undefined) {
          venue.CAPACITY = changes.CAPACITY === '' ? null : (isNaN(changes.CAPACITY) ? null : parseInt(changes.CAPACITY));
        }
        if (changes.CITY_ID !== undefined) {
          venue.CITY_ID = changes.CITY_ID === '' ? null : (isNaN(changes.CITY_ID) ? null : parseInt(changes.CITY_ID));
        }
        if (changes.COUNTRY_ID !== undefined) {
          venue.COUNTRY_ID = changes.COUNTRY_ID === '' ? null : (isNaN(changes.COUNTRY_ID) ? null : parseInt(changes.COUNTRY_ID));
        }
        if (changes.GMAPS_PLACE_ID !== undefined) {
          venue.GMAPS_PLACE_ID = changes.GMAPS_PLACE_ID === '' ? null : changes.GMAPS_PLACE_ID;
        }
        if (changes.LOCATION_LAT !== undefined) {
          venue.LOCATION_LAT = changes.LOCATION_LAT === '' ? null : (isNaN(changes.LOCATION_LAT) ? null : parseFloat(changes.LOCATION_LAT));
        }
        if (changes.LOCATION_LNG !== undefined) {
          venue.LOCATION_LNG = changes.LOCATION_LNG === '' ? null : (isNaN(changes.LOCATION_LNG) ? null : parseFloat(changes.LOCATION_LNG));
        }
        if (changes.OPENED !== undefined) {
          venue.OPENED = changes.OPENED === '' ? null : (isNaN(changes.OPENED) ? null : parseInt(changes.OPENED));
        }
        if (changes.PRIMARY !== undefined) {
          venue.PRIMARY = changes.PRIMARY === true || changes.PRIMARY === 'true' || changes.PRIMARY === 1;
        }
        if (changes.SURFACE !== undefined) {
          venue.SURFACE = changes.SURFACE === '' ? null : changes.SURFACE;
        }
        if (changes.WEBSITE !== undefined) {
          venue.WEBSITE = changes.WEBSITE === '' ? null : changes.WEBSITE;
        }
        if (changes.IMAGE_URL !== undefined) {
          venue.IMAGE_URL = changes.IMAGE_URL === '' ? null : changes.IMAGE_URL;
        }
        if (changes.IS_DELETED !== undefined) {
          venue.IS_DELETED = changes.IS_DELETED === true || changes.IS_DELETED === 'true' || changes.IS_DELETED === 1;
        }

        updatedCount++;
      }

      // Save updated data
      await dataLoader.saveData('venues.json', venues);

      res.json({
        success: true,
        data: {
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new venue
   */
  async create(req, res, next) {
    try {
      const {
        NAME_ID,
        ADDRESS,
        CAPACITY,
        CITY_ID,
        COUNTRY_ID,
        GMAPS_PLACE_ID,
        LOCATION_LAT,
        LOCATION_LNG,
        OPENED,
        PRIMARY,
        SURFACE,
        WEBSITE,
        IMAGE_URL
      } = req.body;

      // Validate required fields
      if (!NAME_ID) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'NAME_ID is required'
          }
        });
      }

      // Load venues data
      const venues = await dataLoader.loadData('venues.json');

      // Generate new venue ID
      const maxVenueId = venues.length > 0 
        ? Math.max(...venues.map(v => v.VENUE_ID || 0))
        : 0;
      const newVenueId = maxVenueId + 1;

      // Create new venue object
      const newVenue = {
        VENUE_ID: newVenueId,
        NAME_ID: parseInt(NAME_ID),
        ADDRESS: ADDRESS || null,
        CAPACITY: CAPACITY === '' || CAPACITY === null || CAPACITY === undefined ? null : (isNaN(CAPACITY) ? null : parseInt(CAPACITY)),
        CITY_ID: CITY_ID === '' || CITY_ID === null || CITY_ID === undefined ? null : (isNaN(CITY_ID) ? null : parseInt(CITY_ID)),
        COUNTRY_ID: COUNTRY_ID === '' || COUNTRY_ID === null || COUNTRY_ID === undefined ? null : (isNaN(COUNTRY_ID) ? null : parseInt(COUNTRY_ID)),
        GMAPS_PLACE_ID: GMAPS_PLACE_ID || null,
        LOCATION_LAT: LOCATION_LAT === '' || LOCATION_LAT === null || LOCATION_LAT === undefined ? null : (isNaN(LOCATION_LAT) ? null : parseFloat(LOCATION_LAT)),
        LOCATION_LNG: LOCATION_LNG === '' || LOCATION_LNG === null || LOCATION_LNG === undefined ? null : (isNaN(LOCATION_LNG) ? null : parseFloat(LOCATION_LNG)),
        OPENED: OPENED === '' || OPENED === null || OPENED === undefined ? null : (isNaN(OPENED) ? null : parseInt(OPENED)),
        PRIMARY: PRIMARY === true || PRIMARY === 'true' || PRIMARY === 1 || false,
        SURFACE: SURFACE || null,
        WEBSITE: WEBSITE || null,
        IMAGE_URL: IMAGE_URL || null
      };

      venues.push(newVenue);

      // Save venues
      await dataLoader.saveData('venues.json', venues);

      // Enrich and return
      const [terms, countries] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('countries.json')
      ]);

      const enrichedVenue = await enrichVenue(newVenue, terms, countries, null);

      res.status(201).json({
        success: true,
        data: enrichedVenue
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VenueController();
