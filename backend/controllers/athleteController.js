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
 * Enrich athlete data with related entities
 * @param {Object} athlete - The athlete object
 * @param {Array} terms - All terms
 * @param {Array} sports - All sports
 * @param {Array} countries - All countries
 * @param {number} languageId - Optional language ID for name resolution
 * @param {Array} athleteContracts - All athlete contracts (optional)
 * @param {Array} competitors - All competitors (optional)
 * @param {Array} athletesPositions - All athlete positions (optional)
 */
async function enrichAthlete(athlete, terms, sports, countries, languageId = null, athleteContracts = [], competitors = [], athletesPositions = []) {
  // Start with all original fields
  const enriched = { ...athlete };

  // Resolve name from terms (add as 'name', keep original NAME_ID)
  if (athlete.NAME_ID) {
    const nameTerm = terms.find(t => t.id === athlete.NAME_ID);
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
  if (athlete.SPORT_TYPE_ID) {
    const sport = sports.find(s => s.SPORT_TYPE_ID === athlete.SPORT_TYPE_ID);
    enriched.sport = sport ? sport.name || sport.ALIAS_NAME : 'Unknown';
  } else {
    enriched.sport = 'Unknown';
  }

  // Resolve nationality (add as 'nationalityName', keep original NATIONALITY)
  if (athlete.NATIONALITY) {
    const country = countries.find(c => c.COUNTRY_ID === athlete.NATIONALITY);
    enriched.nationalityName = country ? country.name : 'Unknown';
  } else {
    enriched.nationalityName = null;
  }

  // Resolve country of birth (add as 'countryOfBirthName', keep original COUNTRY_OF_BIRTH)
  if (athlete.COUNTRY_OF_BIRTH) {
    const country = countries.find(c => c.COUNTRY_ID === athlete.COUNTRY_OF_BIRTH);
    enriched.countryOfBirthName = country ? country.name : 'Unknown';
  } else {
    enriched.countryOfBirthName = null;
  }

  // Resolve place of birth (add as 'placeOfBirthName', keep original PLACE_OF_BIRTH)
  if (athlete.PLACE_OF_BIRTH) {
    const placeTerm = terms.find(t => t.id === athlete.PLACE_OF_BIRTH);
    enriched.placeOfBirthName = resolveTermName(placeTerm) || null;
  } else {
    enriched.placeOfBirthName = null;
  }

  // Resolve position from ATHLETES_POSITIONS (add as 'positionName', keep original POSITION)
  if (athlete.POSITION && athletesPositions.length > 0) {
    const position = athletesPositions.find(p => p.POSITION_ID === athlete.POSITION && p.SPORT_TYPE_ID === athlete.SPORT_TYPE_ID);
    enriched.positionName = position ? position.POSITION_NAME : null;
  } else if (athlete.POSITION) {
    // Fallback to terms if ATHLETES_POSITIONS not available
    const positionTerm = terms.find(t => t.id === athlete.POSITION);
    enriched.positionName = resolveTermName(positionTerm) || null;
  } else {
    enriched.positionName = null;
  }

  // Resolve formation position from ATHLETES_POSITIONS (add as 'formationPositionName', keep original FORMATION_POSITION)
  if (athlete.FORMATION_POSITION && athletesPositions.length > 0) {
    let formationPos = null;
    
    // First, try to find it in the athlete's specific position (if POSITION is set)
    if (athlete.POSITION) {
      const athletePosition = athletesPositions.find(p => 
        p.POSITION_ID === athlete.POSITION && 
        p.SPORT_TYPE_ID === athlete.SPORT_TYPE_ID
      );
      if (athletePosition && athletePosition.FORMATION_POSITIONS) {
        formationPos = athletePosition.FORMATION_POSITIONS.find(fp => 
          fp.FORMATION_POSITION_ID === athlete.FORMATION_POSITION
        );
      }
    }
    
    // If not found in specific position, search all positions for this sport
    if (!formationPos) {
      const position = athletesPositions.find(p => 
        p.SPORT_TYPE_ID === athlete.SPORT_TYPE_ID &&
        p.FORMATION_POSITIONS &&
        p.FORMATION_POSITIONS.some(fp => fp.FORMATION_POSITION_ID === athlete.FORMATION_POSITION)
      );
      if (position) {
        formationPos = position.FORMATION_POSITIONS.find(fp => fp.FORMATION_POSITION_ID === athlete.FORMATION_POSITION);
      }
    }
    
    enriched.formationPositionName = formationPos ? formationPos.FORMATION_POSITION_NAME : null;
  } else if (athlete.FORMATION_POSITION) {
    // Fallback to terms if ATHLETES_POSITIONS not available
    const formationTerm = terms.find(t => t.id === athlete.FORMATION_POSITION);
    enriched.formationPositionName = resolveTermName(formationTerm) || null;
  } else {
    enriched.formationPositionName = null;
  }

  // Resolve boot/equipment (add as 'bootName', keep original BOOT_ID)
  if (athlete.BOOT_ID) {
    const bootTerm = terms.find(t => t.id === athlete.BOOT_ID);
    enriched.bootName = resolveTermName(bootTerm) || null;
  } else {
    enriched.bootName = null;
  }

  // Convert gender (add as 'genderName', keep original GENDER)
  if (athlete.GENDER === 1) {
    enriched.genderName = 'Male';
  } else if (athlete.GENDER === 2) {
    enriched.genderName = 'Female';
  } else {
    enriched.genderName = 'Unknown';
  }

  // Resolve main club and jersey number from current contract
  if (athleteContracts.length > 0 && competitors.length > 0) {
    const currentContract = athleteContracts.find(contract => 
      contract.ATHLETE_ID === athlete.ATHLETE_ID && contract.CURRENT_CLUB === true
    );
    
    if (currentContract) {
      // Get jersey number
      enriched.jerseyNumber = currentContract.JERSEY_NUMBER;
      
      // Get main club name
      if (currentContract.COMPETITOR_ID) {
        const competitor = competitors.find(c => c.COMPETITOR_ID === currentContract.COMPETITOR_ID);
        if (competitor && competitor.NAME_ID) {
          const competitorNameTerm = terms.find(t => t.id === competitor.NAME_ID);
          enriched.mainClub = resolveTermName(competitorNameTerm, languageId) || null;
        } else {
          enriched.mainClub = null;
        }
      } else {
        enriched.mainClub = null;
      }
    } else {
      enriched.mainClub = null;
      enriched.jerseyNumber = null;
    }
  } else {
    enriched.mainClub = null;
    enriched.jerseyNumber = null;
  }

  return enriched;
}

/**
 * Athlete Controller
 */
class AthleteController {
  /**
   * Get all athletes with enrichment and filtering
   */
  async getAll(req, res, next) {
    try {
      // Get filter parameters from query
      const {
        country,
        sportType,
        league,
        team,
        athleteId,
        athleteName,
        language,
        showDeleted
      } = req.query;

      // Load all required data
      const [athletes, terms, sports, countries, competitions, competitors, athleteContracts, languages, athletesPositions] = await Promise.all([
        dataLoader.loadData('athletes.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('athlete_contracts.json').catch(() => []),
        dataLoader.loadData('languages.json').catch(() => []),
        dataLoader.loadData('athletes_positions.json').catch(() => [])
      ]);

      // Get language ID if language code is provided
      let languageId = null;
      if (language) {
        const lang = languages.find(l => l.iso2LettersCode === language || l.code === language);
        if (lang) {
          languageId = lang.id;
        }
      }

      // Filter athletes based on query parameters
      let filteredAthletes = [...athletes];

      // Filter by IS_DELETED (show deleted only if showDeleted=true, otherwise hide them)
      // Handle both string 'true'/'false' and boolean true/false
      const shouldShowDeleted = showDeleted === 'true' || showDeleted === true;
      if (!shouldShowDeleted) {
        filteredAthletes = filteredAthletes.filter(a => !a.IS_DELETED);
      }

      // Filter by country (nationality) - handle arrays
      if (country) {
        const countryValues = Array.isArray(country) ? country : [country];
        const countryIds = countryValues.map(c => {
          const countryObj = countries.find(countryItem => countryItem.name === c || countryItem.COUNTRY_ID === parseInt(c));
          return countryObj ? countryObj.COUNTRY_ID : null;
        }).filter(id => id !== null);
        
        if (countryIds.length > 0) {
          filteredAthletes = filteredAthletes.filter(a => countryIds.includes(a.NATIONALITY));
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
          filteredAthletes = filteredAthletes.filter(a => sportIds.includes(a.SPORT_TYPE_ID));
        }
      }

      // Filter by league (competition) - handle arrays
      if (league) {
        const leagueValues = Array.isArray(league) ? league : [league];
        const competitionIds = leagueValues.map(l => parseInt(l)).filter(id => !isNaN(id));
        
        if (competitionIds.length > 0) {
          // Get competitors in these competitions
          const competitionCompetitors = competitors.filter(c => competitionIds.includes(c.MAIN_COMPETITION));
          const competitorIds = competitionCompetitors.map(c => c.COMPETITOR_ID);
          
          // Filter athletes by their current club or contracts
          filteredAthletes = filteredAthletes.filter(a => {
            // Check current club
            if (a.CURRENT_CLUB_ID && competitorIds.includes(a.CURRENT_CLUB_ID)) {
              return true;
            }
            // Check contracts
            const hasContract = athleteContracts.some(contract => 
              contract.ATHLETE_ID === a.ATHLETE_ID && 
              competitorIds.includes(contract.COMPETITOR_ID) &&
              contract.CURRENT_CLUB === true
            );
            return hasContract;
          });
        }
      }

      // Filter by team (competitor) - handle arrays
      if (team) {
        const teamValues = Array.isArray(team) ? team : [team];
        const competitorIds = teamValues.map(t => parseInt(t)).filter(id => !isNaN(id));
        
        if (competitorIds.length > 0) {
          // Filter athletes by their current club or contracts
          filteredAthletes = filteredAthletes.filter(a => {
            // Check current club
            if (a.CURRENT_CLUB_ID && competitorIds.includes(a.CURRENT_CLUB_ID)) {
              return true;
            }
            // Check contracts
            return athleteContracts.some(contract => 
              contract.ATHLETE_ID === a.ATHLETE_ID && 
              competitorIds.includes(contract.COMPETITOR_ID) &&
              contract.CURRENT_CLUB === true
            );
          });
        }
      }

      // Filter by athlete ID
      if (athleteId) {
        const id = parseInt(athleteId);
        if (!isNaN(id)) {
          filteredAthletes = filteredAthletes.filter(a => a.ATHLETE_ID === id);
        } else {
          // Partial match
          filteredAthletes = filteredAthletes.filter(a => 
            a.ATHLETE_ID.toString().includes(athleteId)
          );
        }
      }

      // Filter by athlete name (will be applied after enrichment)
      let nameFilter = null;
      if (athleteName) {
        nameFilter = athleteName.toLowerCase();
      }

      // Enrich each athlete
      let enrichedAthletes = await Promise.all(
        filteredAthletes.map(athlete => enrichAthlete(athlete, terms, sports, countries, languageId, athleteContracts, competitors, athletesPositions))
      );

      // Apply name filter after enrichment
      if (nameFilter) {
        enrichedAthletes = enrichedAthletes.filter(a => 
          a.name && a.name.toLowerCase().includes(nameFilter)
        );
      }

      res.json({
        success: true,
        data: enrichedAthletes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get athlete by ID with enrichment
   */
  async getById(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);

      if (isNaN(athleteId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID'
          }
        });
      }

      // Load all required data
      const [athletes, terms, sports, countries, competitors, athleteContracts, athletesPositions] = await Promise.all([
        dataLoader.loadData('athletes.json'),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('athlete_contracts.json').catch(() => []),
        dataLoader.loadData('athletes_positions.json').catch(() => [])
      ]);

      // Find athlete
      const athlete = athletes.find(a => a.ATHLETE_ID === athleteId);

      if (!athlete) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Athlete with ID ${athleteId} not found`
          }
        });
      }

      // Enrich athlete
      const enrichedAthlete = await enrichAthlete(athlete, terms, sports, countries, null, athleteContracts, competitors, athletesPositions);

      res.json({
        success: true,
        data: enrichedAthlete
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple athletes (bulk update)
   */
  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body; // Array of { athleteId, changes }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid updates array'
          }
        });
      }

      // Load athletes data
      const athletes = await dataLoader.loadData('athletes.json');
      const athleteContracts = await dataLoader.loadData('athlete_contracts.json').catch(() => []);

      let updatedCount = 0;
      const errors = [];

      // Process each update
      for (const update of updates) {
        const { athleteId, changes } = update;
        
        if (!athleteId || !changes || typeof changes !== 'object') {
          errors.push({ athleteId, error: 'Invalid update format' });
          continue;
        }

        // Find athlete
        const athleteIndex = athletes.findIndex(a => a.ATHLETE_ID === athleteId);
        if (athleteIndex === -1) {
          errors.push({ athleteId, error: 'Athlete not found' });
          continue;
        }

        const athlete = athletes[athleteIndex];

        // Apply changes
        if (changes.SPORT_TYPE_ID !== undefined) {
          athlete.SPORT_TYPE_ID = changes.SPORT_TYPE_ID;
        }
        if (changes.GENDER !== undefined) {
          athlete.GENDER = changes.GENDER;
        }
        if (changes.NATIONALITY !== undefined) {
          athlete.NATIONALITY = changes.NATIONALITY;
        }
        if (changes.BIRTHDATE !== undefined) {
          athlete.BIRTHDATE = changes.BIRTHDATE;
        }
        if (changes.COUNTRY_OF_BIRTH !== undefined) {
          athlete.COUNTRY_OF_BIRTH = changes.COUNTRY_OF_BIRTH;
        }
        if (changes.HEIGHT !== undefined) {
          athlete.HEIGHT = changes.HEIGHT;
        }
        if (changes.WEIGHT !== undefined) {
          athlete.WEIGHT = changes.WEIGHT;
        }
        if (changes.POSITION !== undefined) {
          athlete.POSITION = changes.POSITION;
        }
        if (changes.FORMATION_POSITION !== undefined) {
          athlete.FORMATION_POSITION = changes.FORMATION_POSITION;
        }
        if (changes.PREFERRED_SIDE !== undefined) {
          athlete.PREFERRED_SIDE = changes.PREFERRED_SIDE;
        }
        // Handle status field and status dates
        if (changes.STATUS !== undefined) {
          athlete.STATUS = changes.STATUS;
        }
        if (changes.DATE_OF_RETIREMENT !== undefined) {
          athlete.DATE_OF_RETIREMENT = changes.DATE_OF_RETIREMENT;
        }
        if (changes.DATE_OF_DEATH !== undefined) {
          athlete.DATE_OF_DEATH = changes.DATE_OF_DEATH;
        }
        // Handle boolean flags
        if (changes.ENABLE_BUZZ !== undefined) {
          athlete.ENABLE_BUZZ = changes.ENABLE_BUZZ === true || changes.ENABLE_BUZZ === 'true';
        }
        if (changes.HIDE_ON_SEARCH !== undefined) {
          athlete.HIDE_ON_SEARCH = changes.HIDE_ON_SEARCH === true || changes.HIDE_ON_SEARCH === 'true';
        }
        if (changes.HIDE_PLAYER_GAME_CARD !== undefined) {
          athlete.HIDE_PLAYER_GAME_CARD = changes.HIDE_PLAYER_GAME_CARD === true || changes.HIDE_PLAYER_GAME_CARD === 'true';
        }
        if (changes.HIDE_ON_CATALOG !== undefined) {
          athlete.HIDE_ON_CATALOG = changes.HIDE_ON_CATALOG === true || changes.HIDE_ON_CATALOG === 'true';
        }
        if (changes.IS_DELETED !== undefined) {
          athlete.IS_DELETED = changes.IS_DELETED === true || changes.IS_DELETED === 'true';
        }
        // Handle image URLs
        if (changes.CLUB_IMAGE_URL !== undefined) {
          athlete.CLUB_IMAGE_URL = changes.CLUB_IMAGE_URL;
        }
        if (changes.NATIONAL_IMAGE_URL !== undefined) {
          athlete.NATIONAL_IMAGE_URL = changes.NATIONAL_IMAGE_URL;
        }
        
        // Handle tennis-specific fields
        if (changes.PREFERRED_SURFACE !== undefined) {
          athlete.PREFERRED_SURFACE = changes.PREFERRED_SURFACE;
        }
        if (changes.BACKHAND_TYPE !== undefined) {
          athlete.BACKHAND_TYPE = changes.BACKHAND_TYPE;
        }
        if (changes.PRIZE_MONEY !== undefined) {
          athlete.PRIZE_MONEY = changes.PRIZE_MONEY;
        }
        if (changes.HIGHEST_CAREER_RANKING !== undefined) {
          athlete.HIGHEST_CAREER_RANKING = changes.HIGHEST_CAREER_RANKING;
        }
        
        // Handle football-specific fields
        if (changes.MARKET_VALUE !== undefined) {
          athlete.MARKET_VALUE = changes.MARKET_VALUE;
        }
        if (changes.MARKET_VALUE_CURRENCY !== undefined) {
          athlete.MARKET_VALUE_CURRENCY = changes.MARKET_VALUE_CURRENCY;
        }

        // Handle jersey number (stored in athlete_contracts.json)
        if (changes.jerseyNumber !== undefined) {
          // Find current contract
          const currentContractIndex = athleteContracts.findIndex(contract => 
            contract.ATHLETE_ID === athleteId && contract.CURRENT_CLUB === true
          );
          
          if (currentContractIndex !== -1) {
            athleteContracts[currentContractIndex].JERSEY_NUMBER = changes.jerseyNumber;
          } else {
            // If no current contract, we could create one, but for now just log
            console.warn(`No current contract found for athlete ${athleteId} to update jersey number`);
          }
        }

        updatedCount++;
      }

      // Save updated data
      await dataLoader.saveData('athletes.json', athletes);
      if (athleteContracts.length > 0) {
        await dataLoader.saveData('athlete_contracts.json', athleteContracts);
      }

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
   * Create a new athlete
   */
  async create(req, res, next) {
    try {
      const {
        NAME_ID,
        SPORT_TYPE_ID,
        GENDER,
        NATIONALITY,
        BIRTHDATE,
        HEIGHT,
        POSITION,
        FORMATION_POSITION,
        STATUS
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

      // Load athletes data
      const athletes = await dataLoader.loadData('athletes.json');

      // Generate new athlete ID
      const maxAthleteId = athletes.length > 0 
        ? Math.max(...athletes.map(a => a.ATHLETE_ID || 0))
        : 0;
      const newAthleteId = maxAthleteId + 1;

      // Create new athlete object with defaults
      const newAthlete = {
        ATHLETE_ID: newAthleteId,
        NAME_ID: parseInt(NAME_ID),
        SPORT_TYPE_ID: SPORT_TYPE_ID === '' || SPORT_TYPE_ID === null || SPORT_TYPE_ID === undefined ? null : parseInt(SPORT_TYPE_ID),
        GENDER: GENDER === '' || GENDER === null || GENDER === undefined ? null : parseInt(GENDER),
        NATIONALITY: NATIONALITY === '' || NATIONALITY === null || NATIONALITY === undefined ? null : parseInt(NATIONALITY),
        BIRTHDATE: BIRTHDATE || null,
        HEIGHT: HEIGHT === '' || HEIGHT === null || HEIGHT === undefined ? null : parseInt(HEIGHT),
        WEIGHT: null,
        COUNTRY_OF_BIRTH: NATIONALITY === '' || NATIONALITY === null || NATIONALITY === undefined ? null : parseInt(NATIONALITY),
        PLACE_OF_BIRTH: null,
        POSITION: POSITION === '' || POSITION === null || POSITION === undefined ? null : parseInt(POSITION),
        FORMATION_POSITION: FORMATION_POSITION === '' || FORMATION_POSITION === null || FORMATION_POSITION === undefined ? null : parseInt(FORMATION_POSITION),
        BOOT_ID: null,
        IMG_VER: 1,
        STATUS: STATUS === '' || STATUS === null || STATUS === undefined ? 1 : parseInt(STATUS),
        DATE_OF_DEATH: null,
        CONNECT_BY_TEXT: false,
        TOTAL_SOCIAL_FOLLOWERS: null,
        SELECTION_RANK: null,
        HIDE_ON_CATALOG: false,
        BUZZ_TYPE: null,
        ENABLE_BUZZ: false,
        HIDE_ON_SEARCH: false,
        DATE_OF_RETIREMENT: null,
        HAS_LOGO: false,
        HIDE_PLAYER_GAME_CARD: false,
        PREFERRED_SIDE: null,
        PREFERRED_SURFACE: null,
        BACKHAND_TYPE: null,
        PRIZE_MONEY: null,
        HIGHEST_CAREER_RANKING: null,
        CURRENT_CLUB_ID: null,
        IS_DELETED: false
      };

      athletes.push(newAthlete);

      // Save athletes
      await dataLoader.saveData('athletes.json', athletes);

      // Enrich and return
      const [terms, sports, countries, athleteContracts, competitors, athletesPositions] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('sports.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('athlete_contracts.json').catch(() => []),
        dataLoader.loadData('competitors.json').catch(() => []),
        dataLoader.loadData('athletes_positions.json').catch(() => [])
      ]);

      const enrichedAthlete = await enrichAthlete(newAthlete, terms, sports, countries, null, athleteContracts, competitors, athletesPositions);

      res.status(201).json({
        success: true,
        data: enrichedAthlete
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteController();
