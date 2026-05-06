const dataLoader = require('../utils/dataLoader');

/**
 * Resolve term name by ID with fallback logic
 */
function resolveTermName(term, languageId = null) {
  if (!term) return null;

  if (languageId && term.values && Array.isArray(term.values)) {
    const languageValue = term.values.find(v => v.languageId === languageId);
    if (languageValue && languageValue.value) {
      return languageValue.value;
    }
  }

  if (term.engValue) {
    return term.engValue;
  }

  if (term.values && Array.isArray(term.values)) {
    const englishValue = term.values.find(v => v.languageId === 1);
    if (englishValue && englishValue.value) {
      return englishValue.value;
    }

    const defaultValue = term.values.find(v => v.isDefault);
    if (defaultValue && defaultValue.value) {
      return defaultValue.value;
    }

    const approvedValue = term.values.find(v => v.status === 'approved');
    if (approvedValue && approvedValue.value) {
      return approvedValue.value;
    }

    if (term.values.length > 0 && term.values[0].value) {
      return term.values[0].value;
    }
  }

  return null;
}

/**
 * Enrich contract with related entities
 */
async function enrichContract(contract, terms, competitors, countries, competitions, positionTypes = [], formationPositionTypes = []) {
  const enriched = { ...contract };

  // Enrich competitor (club) information
  if (contract.COMPETITOR_ID) {
    const competitor = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
    if (competitor) {
      // Competitor name
      if (competitor.NAME_ID) {
        const competitorNameTerm = terms.find(t => t.id === competitor.NAME_ID);
        enriched.competitorName = resolveTermName(competitorNameTerm) || `Competitor ${competitor.COMPETITOR_ID}`;
      } else {
        enriched.competitorName = `Competitor ${competitor.COMPETITOR_ID}`;
      }

      // Competitor country
      if (competitor.COUNTRY_ID) {
        const country = countries.find(c => c.COUNTRY_ID === competitor.COUNTRY_ID);
        if (country) {
          enriched.competitorCountryName = country.name;
          enriched.competitorCountryEmoji = country.EMOJI || null;
        }
      }

      // Main competition
      if (competitor.MAIN_COMPETITION) {
        const competition = competitions.find(c => c.COMPETITION_ID === competitor.MAIN_COMPETITION);
        if (competition && competition.NAME_ID) {
          const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
          enriched.mainCompetitionName = resolveTermName(competitionNameTerm) || null;
        }
      }

      // Use contract's MAIN_COMPETITION_ID if available, otherwise use competitor's MAIN_COMPETITION
      if (contract.MAIN_COMPETITION_ID) {
        const competition = competitions.find(c => c.COMPETITION_ID === contract.MAIN_COMPETITION_ID);
        if (competition && competition.NAME_ID) {
          const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
          enriched.mainCompetitionName = resolveTermName(competitionNameTerm) || null;
        }
      }
    }
  }

  // Enrich position from new position types
  if (contract.POSITION !== null && contract.POSITION !== undefined && positionTypes.length > 0) {
    const pt = positionTypes.find(p => p.POSITION_TYPE_ID === contract.POSITION);
    if (pt) {
      const term = terms.find(t => t.id === pt.NAME_ID);
      enriched.positionName = (term ? resolveTermName(term) : null) || pt.ALIAS_NAME;
    }
  }

  // Enrich formation position from new formation position types
  if (contract.FORMATION_POSITION !== null && contract.FORMATION_POSITION !== undefined && formationPositionTypes.length > 0) {
    const fpt = formationPositionTypes.find(fp => fp.FORMATION_POSITION_TYPE_ID === contract.FORMATION_POSITION);
    if (fpt) {
      const term = terms.find(t => t.id === fpt.NAME_ID);
      enriched.formationPositionName = (term ? resolveTermName(term) : null) || fpt.ALIAS_NAME;
    }
  }

  return enriched;
}

/**
 * Athlete Contract Controller
 */
class AthleteContractController {
  /**
   * Get all contracts for an athlete
   */
  async getByAthleteId(req, res, next) {
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
      const [contracts, terms, competitors, countries, competitions, positionTypes, formationPositionTypes] = await Promise.all([
        dataLoader.loadData('athlete_contracts.json').catch(() => []),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('athletes_position_types.json').catch(() => []),
        dataLoader.loadData('athletes_formation_position_types.json').catch(() => [])
      ]);

      // Filter contracts for this athlete
      const athleteContracts = contracts.filter(c => c.ATHLETE_ID === athleteId);

      // Enrich contracts
      const enrichedContracts = await Promise.all(
        athleteContracts.map(contract => 
          enrichContract(contract, terms, competitors, countries, competitions, positionTypes, formationPositionTypes)
        )
      );

      // Sort by START_DATE descending (most recent first)
      enrichedContracts.sort((a, b) => {
        const dateA = a.START_DATE ? new Date(a.START_DATE) : new Date(0);
        const dateB = b.START_DATE ? new Date(b.START_DATE) : new Date(0);
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: enrichedContracts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Build a new contract from schema defaults and request body.
   * Uses data/schemas/athlete_contracts.schema.json for default values.
   */
  async _buildContractFromSchema(athleteId, body) {
    const schema = await dataLoader.loadData('schemas/athlete_contracts.schema.json').catch(() => ({}));
    const now = new Date().toISOString();

    const newContract = {};
    for (const [key, desc] of Object.entries(schema)) {
      if (desc && typeof desc.default !== 'undefined') {
        newContract[key] = desc.default;
      }
    }

    newContract.ATHLETE_ID = athleteId;
    newContract.CREATE_TIME = now;
    newContract.UPDATE_TIME = now;

    const {
      COMPETITOR_ID,
      START_DATE,
      END_DATE,
      CURRENT_CLUB,
      JERSEY_NUMBER,
      TRANSFER_TYPE,
      TRANSFER_FEE,
      TRANSFER_FEE_CURRENCY,
      SALARY,
      SALARY_CURRENCY,
      POSITION,
      FORMATION_POSITION,
      BLOCK_AUTOMATIC_UPDATES,
      MAIN_COMPETITION_ID
    } = body;

    if (COMPETITOR_ID !== undefined && COMPETITOR_ID !== '') {
      newContract.COMPETITOR_ID = parseInt(COMPETITOR_ID);
    }
    if (START_DATE !== undefined && START_DATE !== '') {
      newContract.START_DATE = START_DATE;
    }
    if (END_DATE !== undefined) {
      newContract.END_DATE = END_DATE || null;
    }
    if (BLOCK_AUTOMATIC_UPDATES !== undefined) {
      newContract.BLOCK_AUTOMATIC_UPDATES = BLOCK_AUTOMATIC_UPDATES === true || BLOCK_AUTOMATIC_UPDATES === 'true';
    }
    if (POSITION !== undefined && POSITION !== '') {
      newContract.POSITION = typeof POSITION === 'number' ? POSITION : parseInt(POSITION);
    }
    if (FORMATION_POSITION !== undefined && FORMATION_POSITION !== '') {
      newContract.FORMATION_POSITION = typeof FORMATION_POSITION === 'number' ? FORMATION_POSITION : parseInt(FORMATION_POSITION);
    }
    if (TRANSFER_TYPE !== undefined) {
      newContract.TRANSFER_TYPE = TRANSFER_TYPE || null;
    }
    if (JERSEY_NUMBER !== undefined && JERSEY_NUMBER !== '') {
      const num = parseInt(JERSEY_NUMBER);
      newContract.JERSEY_NUM = num;
    }
    if (SALARY !== undefined && SALARY !== '') {
      const val = parseFloat(SALARY);
      newContract.SALARY_VALUE = val;
    }
    if (SALARY_CURRENCY !== undefined) {
      newContract.SALARY_CURRENCY = SALARY_CURRENCY || null;
    }
    if (TRANSFER_FEE !== undefined && TRANSFER_FEE !== '') {
      const val = parseFloat(TRANSFER_FEE);
      newContract.PRICE = val;
      newContract.PRICE_VALUE = val;
    }
    if (TRANSFER_FEE_CURRENCY !== undefined) {
      newContract.PRICE_CURRENCY = TRANSFER_FEE_CURRENCY || null;
    }

    const isCurrentClub = CURRENT_CLUB === true || CURRENT_CLUB === 'true';
    newContract.ACTIVE = isCurrentClub !== false;

    newContract.CURRENT_CLUB = isCurrentClub;
    newContract.JERSEY_NUMBER = newContract.JERSEY_NUM;
    newContract.SALARY = newContract.SALARY_VALUE;
    newContract.TRANSFER_FEE = newContract.PRICE;
    newContract.TRANSFER_FEE_CURRENCY = newContract.PRICE_CURRENCY;
    newContract.MAIN_COMPETITION_ID = MAIN_COMPETITION_ID ? parseInt(MAIN_COMPETITION_ID) : null;

    return newContract;
  }

  /**
   * Create a new contract
   * New contracts are built from data/schemas/athlete_contracts.schema.json defaults, then request body is applied.
   */
  async create(req, res, next) {
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

      const {
        COMPETITOR_ID,
        START_DATE,
        END_DATE,
        CURRENT_CLUB,
        JERSEY_NUMBER,
        TRANSFER_TYPE,
        TRANSFER_FEE,
        TRANSFER_FEE_CURRENCY,
        SALARY,
        SALARY_CURRENCY,
        POSITION,
        FORMATION_POSITION,
        BLOCK_AUTOMATIC_UPDATES,
        MAIN_COMPETITION_ID
      } = req.body;

      // Validate required fields
      if (!COMPETITOR_ID || !START_DATE) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'COMPETITOR_ID and START_DATE are required'
          }
        });
      }

      // Load contracts
      const contracts = await dataLoader.loadData('athlete_contracts.json').catch(() => []);

      // Build new contract from schema defaults + body
      const newContract = await this._buildContractFromSchema(athleteId, req.body);

      // If this is set as current club, unset all other current clubs for this athlete
      if (newContract.CURRENT_CLUB === true) {
        contracts.forEach(contract => {
          if (contract.ATHLETE_ID === athleteId && contract.CURRENT_CLUB === true) {
            contract.CURRENT_CLUB = false;
          }
        });
      }

      const maxContractId = contracts.length > 0
        ? Math.max(...contracts.map(c => c.CONTRACT_ID || 0))
        : 0;
      newContract.CONTRACT_ID = maxContractId + 1;

      contracts.push(newContract);

      // Save contracts
      await dataLoader.saveData('athlete_contracts.json', contracts);

      // Load enrichment data and return enriched contract
      const [terms, competitors, countries, competitions, positionTypes, formationPositionTypes] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('athletes_position_types.json').catch(() => []),
        dataLoader.loadData('athletes_formation_position_types.json').catch(() => [])
      ]);

      const enrichedContract = await enrichContract(
        newContract,
        terms,
        competitors,
        countries,
        competitions,
        positionTypes,
        formationPositionTypes
      );

      res.status(201).json({
        success: true,
        data: enrichedContract
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a contract
   */
  async update(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const contractId = parseInt(req.params.contractId);

      if (isNaN(athleteId) || isNaN(contractId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or contract ID'
          }
        });
      }

      // Load contracts
      const contracts = await dataLoader.loadData('athlete_contracts.json').catch(() => []);

      // Find the contract
      const fullIndex = contracts.findIndex(
        c => c.ATHLETE_ID === athleteId && c.CONTRACT_ID === contractId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Contract not found'
          }
        });
      }

      const {
        COMPETITOR_ID,
        START_DATE,
        END_DATE,
        CURRENT_CLUB,
        JERSEY_NUMBER,
        TRANSFER_TYPE,
        TRANSFER_FEE,
        TRANSFER_FEE_CURRENCY,
        SALARY,
        SALARY_CURRENCY,
        POSITION,
        FORMATION_POSITION,
        BLOCK_AUTOMATIC_UPDATES,
        MAIN_COMPETITION_ID
      } = req.body;

      // If this is set as current club, unset all other current clubs for this athlete
      if (CURRENT_CLUB === true || CURRENT_CLUB === 'true') {
        contracts.forEach((contract, index) => {
          if (contract.ATHLETE_ID === athleteId && 
              contract.CURRENT_CLUB === true && 
              index !== fullIndex) {
            contract.CURRENT_CLUB = false;
          }
        });
      }

      // Update contract
      if (COMPETITOR_ID !== undefined) contracts[fullIndex].COMPETITOR_ID = parseInt(COMPETITOR_ID);
      if (START_DATE !== undefined) contracts[fullIndex].START_DATE = START_DATE;
      if (END_DATE !== undefined) contracts[fullIndex].END_DATE = END_DATE || null;
      if (CURRENT_CLUB !== undefined) {
        contracts[fullIndex].CURRENT_CLUB = CURRENT_CLUB === true || CURRENT_CLUB === 'true';
      }
      if (JERSEY_NUMBER !== undefined) {
        contracts[fullIndex].JERSEY_NUMBER = JERSEY_NUMBER ? parseInt(JERSEY_NUMBER) : null;
      }
      if (TRANSFER_TYPE !== undefined) contracts[fullIndex].TRANSFER_TYPE = TRANSFER_TYPE || null;
      if (TRANSFER_FEE !== undefined) {
        contracts[fullIndex].TRANSFER_FEE = TRANSFER_FEE ? parseFloat(TRANSFER_FEE) : null;
      }
      if (TRANSFER_FEE_CURRENCY !== undefined) {
        contracts[fullIndex].TRANSFER_FEE_CURRENCY = TRANSFER_FEE_CURRENCY || null;
      }
      if (SALARY !== undefined) {
        contracts[fullIndex].SALARY = SALARY ? parseFloat(SALARY) : null;
      }
      if (SALARY_CURRENCY !== undefined) {
        contracts[fullIndex].SALARY_CURRENCY = SALARY_CURRENCY || null;
      }
      if (POSITION !== undefined) {
        contracts[fullIndex].POSITION = POSITION ? parseInt(POSITION) : null;
      }
      if (FORMATION_POSITION !== undefined) {
        contracts[fullIndex].FORMATION_POSITION = FORMATION_POSITION ? parseInt(FORMATION_POSITION) : null;
      }
      if (BLOCK_AUTOMATIC_UPDATES !== undefined) {
        contracts[fullIndex].BLOCK_AUTOMATIC_UPDATES = BLOCK_AUTOMATIC_UPDATES === true || BLOCK_AUTOMATIC_UPDATES === 'true';
      }
      if (MAIN_COMPETITION_ID !== undefined) {
        contracts[fullIndex].MAIN_COMPETITION_ID = MAIN_COMPETITION_ID ? parseInt(MAIN_COMPETITION_ID) : null;
      }

      // Save contracts
      await dataLoader.saveData('athlete_contracts.json', contracts);

      // Load enrichment data and return enriched contract
      const [terms, competitors, countries, competitions, positionTypes, formationPositionTypes] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('athletes_position_types.json').catch(() => []),
        dataLoader.loadData('athletes_formation_position_types.json').catch(() => [])
      ]);

      const enrichedContract = await enrichContract(
        contracts[fullIndex],
        terms,
        competitors,
        countries,
        competitions,
        positionTypes,
        formationPositionTypes
      );

      res.json({
        success: true,
        data: enrichedContract
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a contract
   */
  async delete(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const contractId = parseInt(req.params.contractId);

      if (isNaN(athleteId) || isNaN(contractId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or contract ID'
          }
        });
      }

      // Load contracts
      const contracts = await dataLoader.loadData('athlete_contracts.json').catch(() => []);

      // Find the contract
      const fullIndex = contracts.findIndex(
        c => c.ATHLETE_ID === athleteId && c.CONTRACT_ID === contractId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Contract not found'
          }
        });
      }

      // Remove contract
      contracts.splice(fullIndex, 1);

      // Save contracts
      await dataLoader.saveData('athlete_contracts.json', contracts);

      res.json({
        success: true,
        message: 'Contract deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteContractController();
