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
 * Enrich competitor data with related entities
 * @param {Object} competitor - The competitor object
 * @param {Array} terms - All terms
 * @param {Array} sports - All sports
 * @param {Array} countries - All countries
 * @param {Array} competitions - All competitions
 * @param {Array} competitors - All competitors (for father competitor resolution)
 * @param {number} languageId - Optional language ID for name resolution
 */
async function enrichCompetitor(competitor, terms, sports, countries, competitions, competitorsList = [], languageId = null) {
  // Start with all original fields
  const enriched = { ...competitor };

  // Resolve name from terms (add as 'name', keep original NAME_ID)
  if (competitor.NAME_ID) {
    const nameTerm = terms.find(t => t.id === competitor.NAME_ID);
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

  // Resolve sport (add as 'sport', keep original SPORT_TYPE_ID)
  if (competitor.SPORT_TYPE_ID) {
    const sport = sports.find(s => s.SPORT_TYPE_ID === competitor.SPORT_TYPE_ID);
    enriched.sport = sport ? sport.name || sport.ALIAS_NAME : 'Unknown';
  } else {
    enriched.sport = 'Unknown';
  }

  // Resolve country (add as 'countryName', keep original COUNTRY_ID)
  if (competitor.COUNTRY_ID) {
    const country = countries.find(c => c.COUNTRY_ID === competitor.COUNTRY_ID);
    enriched.countryName = country ? country.name : 'Unknown';
  } else {
    enriched.countryName = null;
  }

  // Resolve competition (add as 'competitionName', keep original MAIN_COMPETITION)
  if (competitor.MAIN_COMPETITION) {
    const competition = competitions.find(c => c.COMPETITION_ID === competitor.MAIN_COMPETITION);
    if (competition && competition.NAME_ID) {
      const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
      enriched.competitionName = resolveTermName(competitionNameTerm, languageId) || null;
    } else {
      enriched.competitionName = null;
    }
  } else {
    enriched.competitionName = null;
  }

  // Resolve father competitor (add as 'fatherCompetitorName', keep original FATHER_COMPETITOR)
  if (competitor.FATHER_COMPETITOR && competitorsList.length > 0) {
    const fatherCompetitor = competitorsList.find(c => c.COMPETITOR_ID === competitor.FATHER_COMPETITOR);
    if (fatherCompetitor && fatherCompetitor.NAME_ID) {
      const fatherNameTerm = terms.find(t => t.id === fatherCompetitor.NAME_ID);
      enriched.fatherCompetitorName = resolveTermName(fatherNameTerm, languageId) || null;
    } else {
      enriched.fatherCompetitorName = null;
    }
  } else {
    enriched.fatherCompetitorName = null;
  }

  // Convert gender (add as 'genderName', keep original GENDER)
  if (competitor.GENDER === 1) {
    enriched.genderName = 'Male';
  } else if (competitor.GENDER === 2) {
    enriched.genderName = 'Female';
  } else {
    enriched.genderName = 'Unknown';
  }

  // Convert competitor type (add as 'competitorTypeName', keep original COMPETITOR_TYPE)
  // Note: This is a placeholder - actual mapping should be defined based on business logic
  if (competitor.COMPETITOR_TYPE === 1) {
    enriched.competitorTypeName = 'Team';
  } else if (competitor.COMPETITOR_TYPE === 2) {
    enriched.competitorTypeName = 'Club';
  } else {
    enriched.competitorTypeName = 'Unknown';
  }

  return enriched;
}

/**
 * Competitor Controller
 */
class CompetitorController {
  /**
   * Get all competitors with enrichment and filtering
   */
  async getAll(req, res, next) {
    try {
      // Get filter parameters from query
      const {
        country,
        sportType,
        competition,
        competitorId,
        competitorName,
        language,
        showDeleted
      } = req.query;

      // Load all required data
      const [competitors, terms, sports, countries, competitions, languages] = await Promise.all([
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json'),
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

      // Filter competitors based on query parameters
      let filteredCompetitors = [...competitors];

      // Filter by IS_DELETED (show deleted only if showDeleted=true, otherwise hide them)
      // Handle both string 'true'/'false' and boolean true/false
      const shouldShowDeleted = showDeleted === 'true' || showDeleted === true;
      if (!shouldShowDeleted) {
        filteredCompetitors = filteredCompetitors.filter(c => !c.IS_DELETED);
      }

      // Filter by country - handle arrays
      if (country) {
        const countryValues = Array.isArray(country) ? country : [country];
        const countryIds = countryValues.map(c => {
          const countryObj = countries.find(countryItem => countryItem.name === c || countryItem.COUNTRY_ID === parseInt(c));
          return countryObj ? countryObj.COUNTRY_ID : null;
        }).filter(id => id !== null);
        
        if (countryIds.length > 0) {
          filteredCompetitors = filteredCompetitors.filter(c => countryIds.includes(c.COUNTRY_ID));
        }
      }

      // Filter by sport type - handle arrays
      if (sportType) {
        const sportValues = Array.isArray(sportType) ? sportType : [sportType];
        const sportIds = sportValues.map(s => {
          const sportObj = sports.find(sportItem => (sportItem.name || sportItem.ALIAS_NAME) === s || sportItem.SPORT_TYPE_ID === parseInt(s));
          return sportObj ? sportObj.SPORT_TYPE_ID : null;
        }).filter(id => id !== null);
        
        if (sportIds.length > 0) {
          filteredCompetitors = filteredCompetitors.filter(c => sportIds.includes(c.SPORT_TYPE_ID));
        }
      }

      // Filter by competition - handle arrays
      if (competition) {
        const competitionValues = Array.isArray(competition) ? competition : [competition];
        const competitionIds = competitionValues.map(c => parseInt(c)).filter(id => !isNaN(id));
        
        if (competitionIds.length > 0) {
          filteredCompetitors = filteredCompetitors.filter(c => 
            competitionIds.includes(c.MAIN_COMPETITION)
          );
        }
      }

      // Filter by competitor ID
      if (competitorId) {
        const id = parseInt(competitorId);
        if (!isNaN(id)) {
          filteredCompetitors = filteredCompetitors.filter(c => c.COMPETITOR_ID === id);
        } else {
          // Partial match
          filteredCompetitors = filteredCompetitors.filter(c => 
            c.COMPETITOR_ID.toString().includes(competitorId)
          );
        }
      }

      // Filter by competitor name (will be applied after enrichment)
      let nameFilter = null;
      if (competitorName) {
        nameFilter = competitorName.toLowerCase();
      }

      // Enrich each competitor
      let enrichedCompetitors = await Promise.all(
        filteredCompetitors.map(competitor => enrichCompetitor(competitor, terms, sports, countries, competitions, competitors, languageId))
      );

      // Apply name filter after enrichment
      if (nameFilter) {
        enrichedCompetitors = enrichedCompetitors.filter(c => 
          c.name && c.name.toLowerCase().includes(nameFilter)
        );
      }

      res.json({
        success: true,
        data: enrichedCompetitors
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get competitor by ID with enrichment
   */
  async getById(req, res, next) {
    try {
      const competitorId = parseInt(req.params.id);

      if (isNaN(competitorId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid competitor ID'
          }
        });
      }

      // Load all required data
      const [competitors, terms, sports, countries, competitions] = await Promise.all([
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json')
      ]);

      // Find competitor
      const competitor = competitors.find(c => c.COMPETITOR_ID === competitorId);

      if (!competitor) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Competitor with ID ${competitorId} not found`
          }
        });
      }

      // Enrich competitor
      const enrichedCompetitor = await enrichCompetitor(competitor, terms, sports, countries, competitions, competitors, null);

      res.json({
        success: true,
        data: enrichedCompetitor
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple competitors (bulk update)
   */
  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body; // Array of { competitorId, changes }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid updates array'
          }
        });
      }

      // Load competitors data
      const competitors = await dataLoader.loadData('competitors.json');

      let updatedCount = 0;
      const errors = [];

      // Process each update
      for (const update of updates) {
        const { competitorId, changes } = update;
        
        if (!competitorId || !changes || typeof changes !== 'object') {
          errors.push({ competitorId, error: 'Invalid update format' });
          continue;
        }

        // Find competitor
        const competitorIndex = competitors.findIndex(c => c.COMPETITOR_ID === competitorId);
        if (competitorIndex === -1) {
          errors.push({ competitorId, error: 'Competitor not found' });
          continue;
        }

        const competitor = competitors[competitorIndex];

        // Apply changes - update all fields that can be changed
        if (changes.SPORT_TYPE_ID !== undefined) {
          competitor.SPORT_TYPE_ID = changes.SPORT_TYPE_ID;
        }
        if (changes.COMPETITOR_TYPE !== undefined) {
          competitor.COMPETITOR_TYPE = changes.COMPETITOR_TYPE;
        }
        if (changes.COUNTRY_ID !== undefined) {
          competitor.COUNTRY_ID = changes.COUNTRY_ID;
        }
        if (changes.MAIN_COMPETITION !== undefined) {
          competitor.MAIN_COMPETITION = changes.MAIN_COMPETITION;
        }
        if (changes.GENDER !== undefined) {
          competitor.GENDER = changes.GENDER;
        }
        if (changes.FOUNDED !== undefined) {
          competitor.FOUNDED = changes.FOUNDED;
        }
        if (changes.FATHER_COMPETITOR !== undefined) {
          competitor.FATHER_COMPETITOR = changes.FATHER_COMPETITOR;
        }
        if (changes.CAPTAIN !== undefined) {
          competitor.CAPTAIN = changes.CAPTAIN;
        }
        if (changes.VENUE_ID !== undefined) {
          competitor.VENUE_ID = changes.VENUE_ID;
        }
        if (changes.CITY_ID !== undefined) {
          competitor.CITY_ID = changes.CITY_ID;
        }
        if (changes.FEDERATION_TERM_ID !== undefined) {
          competitor.FEDERATION_TERM_ID = changes.FEDERATION_TERM_ID;
        }
        if (changes.SELECTIONS_RANK !== undefined) {
          competitor.SELECTIONS_RANK = changes.SELECTIONS_RANK;
        }
        if (changes.MINIMUM_ATHLETES_IN_SQUAD !== undefined) {
          competitor.MINIMUM_ATHLETES_IN_SQUAD = changes.MINIMUM_ATHLETES_IN_SQUAD;
        }
        if (changes.STATISTICS_RESET_TYPE !== undefined) {
          competitor.STATISTICS_RESET_TYPE = changes.STATISTICS_RESET_TYPE;
        }
        if (changes.STATISTICS_RESET_DATE !== undefined) {
          competitor.STATISTICS_RESET_DATE = changes.STATISTICS_RESET_DATE;
        }
        if (changes.THIRD_COLOR !== undefined) {
          competitor.THIRD_COLOR = changes.THIRD_COLOR;
        }
        if (changes.SHOT_CHART_COLOR !== undefined) {
          competitor.SHOT_CHART_COLOR = changes.SHOT_CHART_COLOR;
        }
        if (changes.SYMBOLIC_NAME !== undefined) {
          competitor.SYMBOLIC_NAME = changes.SYMBOLIC_NAME;
        }
        if (changes.TITLE_NAME !== undefined) {
          competitor.TITLE_NAME = changes.TITLE_NAME;
        }
        // Color fields
        if (changes.HOME_MAIN_COLOR !== undefined) {
          competitor.HOME_MAIN_COLOR = changes.HOME_MAIN_COLOR;
        }
        if (changes.HOME_SECONDARY_COLOR !== undefined) {
          competitor.HOME_SECONDARY_COLOR = changes.HOME_SECONDARY_COLOR;
        }
        if (changes.AWAY_MAIN_COLOR !== undefined) {
          competitor.AWAY_MAIN_COLOR = changes.AWAY_MAIN_COLOR;
        }
        if (changes.AWAY_SECONDARY_COLOR !== undefined) {
          competitor.AWAY_SECONDARY_COLOR = changes.AWAY_SECONDARY_COLOR;
        }
        // Boolean flags
        if (changes.CONNECT_BY_TEXT !== undefined) {
          competitor.CONNECT_BY_TEXT = changes.CONNECT_BY_TEXT === true || changes.CONNECT_BY_TEXT === 'true';
        }
        if (changes.ENABLE_DASHBOARD_BUZZ !== undefined) {
          competitor.ENABLE_DASHBOARD_BUZZ = changes.ENABLE_DASHBOARD_BUZZ === true || changes.ENABLE_DASHBOARD_BUZZ === 'true';
        }
        if (changes.HIDE_ON_SEARCH !== undefined) {
          competitor.HIDE_ON_SEARCH = changes.HIDE_ON_SEARCH === true || changes.HIDE_ON_SEARCH === 'true';
        }
        if (changes.HIDE_ON_CATALOG !== undefined) {
          competitor.HIDE_ON_CATALOG = changes.HIDE_ON_CATALOG === true || changes.HIDE_ON_CATALOG === 'true';
        }
        if (changes.HIDE_PLAYER_GAME_CARD !== undefined) {
          competitor.HIDE_PLAYER_GAME_CARD = changes.HIDE_PLAYER_GAME_CARD === true || changes.HIDE_PLAYER_GAME_CARD === 'true';
        }
        if (changes.SUPPORT_DASHBOARD !== undefined) {
          competitor.SUPPORT_DASHBOARD = changes.SUPPORT_DASHBOARD === true || changes.SUPPORT_DASHBOARD === 'true';
        }
        if (changes.SHOW_ATHLETES_SALARY !== undefined) {
          competitor.SHOW_ATHLETES_SALARY = changes.SHOW_ATHLETES_SALARY === true || changes.SHOW_ATHLETES_SALARY === 'true';
        }
        if (changes.SHOULD_SHOW_TROPHIES !== undefined) {
          competitor.SHOULD_SHOW_TROPHIES = changes.SHOULD_SHOW_TROPHIES === true || changes.SHOULD_SHOW_TROPHIES === 'true';
        }
        if (changes.LINEUP_INSIGHTS_ENABLED !== undefined) {
          competitor.LINEUP_INSIGHTS_ENABLED = changes.LINEUP_INSIGHTS_ENABLED === true || changes.LINEUP_INSIGHTS_ENABLED === 'true';
        }
        if (changes.IS_DELETED !== undefined) {
          competitor.IS_DELETED = changes.IS_DELETED === true || changes.IS_DELETED === 'true';
        }
        if (changes.IMG_VER !== undefined) {
          competitor.IMG_VER = changes.IMG_VER;
        }
        // Image URLs
        if (changes.LIGHT_IMAGE_URL !== undefined) {
          competitor.LIGHT_IMAGE_URL = changes.LIGHT_IMAGE_URL;
        }
        if (changes.DARK_IMAGE_URL !== undefined) {
          competitor.DARK_IMAGE_URL = changes.DARK_IMAGE_URL;
        }

        updatedCount++;
      }

      // Save updated data
      await dataLoader.saveData('competitors.json', competitors);

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
   * Create a new competitor
   */
  async create(req, res, next) {
    try {
      const {
        NAME_ID,
        SPORT_TYPE_ID,
        COMPETITOR_TYPE,
        COUNTRY_ID,
        GENDER,
        MAIN_COMPETITION,
        FOUNDED
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

      // Load competitors data
      const competitors = await dataLoader.loadData('competitors.json');

      // Generate new competitor ID
      const maxCompetitorId = competitors.length > 0 
        ? Math.max(...competitors.map(c => c.COMPETITOR_ID || 0))
        : 0;
      const newCompetitorId = maxCompetitorId + 1;

      // Create new competitor object with defaults
      const newCompetitor = {
        COMPETITOR_ID: newCompetitorId,
        NAME_ID: parseInt(NAME_ID),
        SPORT_TYPE_ID: SPORT_TYPE_ID === '' || SPORT_TYPE_ID === null || SPORT_TYPE_ID === undefined ? null : parseInt(SPORT_TYPE_ID),
        COMPETITOR_TYPE: COMPETITOR_TYPE === '' || COMPETITOR_TYPE === null || COMPETITOR_TYPE === undefined ? null : parseInt(COMPETITOR_TYPE),
        COUNTRY_ID: COUNTRY_ID === '' || COUNTRY_ID === null || COUNTRY_ID === undefined ? null : parseInt(COUNTRY_ID),
        GENDER: GENDER === '' || GENDER === null || GENDER === undefined ? null : parseInt(GENDER),
        MAIN_COMPETITION: MAIN_COMPETITION === '' || MAIN_COMPETITION === null || MAIN_COMPETITION === undefined ? null : parseInt(MAIN_COMPETITION),
        FOUNDED: FOUNDED === '' || FOUNDED === null || FOUNDED === undefined ? null : parseInt(FOUNDED),
        HOME_MAIN_COLOR: null,
        HOME_SECONDARY_COLOR: null,
        AWAY_MAIN_COLOR: null,
        AWAY_SECONDARY_COLOR: null,
        CONNECT_BY_TEXT: false,
        SELECTIONS_RANK: null,
        SYMBOLIC_NAME: null,
        ENABLE_DASHBOARD_BUZZ: false,
        HIDE_ON_SEARCH: false,
        HIDE_ON_CATALOG: false,
        IMG_VER: 1,
        MINIMUM_ATHLETES_IN_SQUAD: null,
        FATHER_COMPETITOR: null,
        CITY_ID: null,
        TITLE_NAME: null,
        SHOT_CHART_COLOR: null,
        VENUE_ID: null,
        HIDE_PLAYER_GAME_CARD: false,
        SUPPORT_DASHBOARD: true,
        FEDERATION_TERM_ID: null,
        STATISTICS_RESET_TYPE: null,
        STATISTICS_RESET_DATE: null,
        CAPTAIN: null,
        SHOW_ATHLETES_SALARY: false,
        SHOULD_SHOW_TROPHIES: true,
        THIRD_COLOR: null,
        LINEUP_INSIGHTS_ENABLED: true,
        IS_DELETED: false
      };

      competitors.push(newCompetitor);

      // Save competitors
      await dataLoader.saveData('competitors.json', competitors);

      // Enrich and return
      const [terms, sports, countries, competitions] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json')
      ]);

      const enrichedCompetitor = await enrichCompetitor(newCompetitor, terms, sports, countries, competitions, competitors, null);

      res.status(201).json({
        success: true,
        data: enrichedCompetitor
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CompetitorController();
