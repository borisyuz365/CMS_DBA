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
 * Format season name
 */
function formatSeason(seasonName, seasonStartDate, seasonEndDate, seasonNum) {
  if (seasonName) return seasonName;
  if (seasonStartDate && seasonEndDate) {
    const start = new Date(seasonStartDate);
    const end = new Date(seasonEndDate);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    if (startYear === endYear) {
      return `${startYear}/${String(endYear + 1).slice(-2)}`;
    }
    return `${startYear}/${String(endYear).slice(-2)}`;
  }
  // Fallback: use season number if available
  if (seasonNum) {
    // Try to infer year from season number (this is a fallback)
    return `Season ${seasonNum}`;
  }
  return '';
}

/**
 * Enrich trophy with related entities
 */
async function enrichTrophy(trophy, terms, competitors, countries, competitions, seasons) {
  const enriched = { ...trophy };

  // Enrich competition information
  if (trophy.COMPETITION_ID) {
    const competition = competitions.find(c => c.COMPETITION_ID === trophy.COMPETITION_ID);
    if (competition) {
      // Competition name
      if (competition.NAME_ID) {
        const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
        enriched.competitionName = resolveTermName(competitionNameTerm) || `Competition ${competition.COMPETITION_ID}`;
      } else {
        enriched.competitionName = `Competition ${competition.COMPETITION_ID}`;
      }

      // Competition country/region
      if (competition.COUNTRY_ID) {
        const country = countries.find(c => c.COUNTRY_ID === competition.COUNTRY_ID);
        if (country) {
          enriched.region = country.name || null;
          enriched.countryEmoji = country.EMOJI || null;
        }
      }
    }
  }

  // Enrich competitor (team) information
  if (trophy.COMPETITOR_ID) {
    const competitor = competitors.find(c => c.COMPETITOR_ID === trophy.COMPETITOR_ID);
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
    }
  }

  // Enrich season information
  if (trophy.COMPETITION_ID && trophy.SEASON_NUM) {
    const season = seasons.find(
      s => s.COMPETITION_ID === trophy.COMPETITION_ID && s.SEASON_NUM === trophy.SEASON_NUM
    );
    if (season) {
      // Only use NAME_ID if it's a season name, not a competition name
      // Also check USE_NAME flag - if false, don't use NAME_ID even if it's a season name
      let seasonNameFromTerm = null;
      if (season.NAME_ID && season.USE_NAME !== false) {
        const seasonTerm = terms.find(t => t.id === season.NAME_ID);
        // Check if the term is actually a season name (category 47) and not a competition name (category 4)
        if (seasonTerm && seasonTerm.categoryId === 47) {
          seasonNameFromTerm = resolveTermName(seasonTerm);
        }
        // If categoryId is not 47 (e.g., 4 for competitions), ignore it and use dates instead
      }
      
      enriched.seasonName = formatSeason(
        seasonNameFromTerm,
        season.START_DATE,
        season.END_DATE,
        season.SEASON_NUM
      );
    } else {
      // Fallback: format season number
      enriched.seasonName = formatSeason(null, null, null, trophy.SEASON_NUM);
    }
  }

  return enriched;
}

/**
 * Athlete Trophy Controller
 */
class AthleteTrophyController {
  /**
   * Get all trophies for an athlete
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
      const [trophies, terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('athlete_trophies.json').catch(() => []),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      // Filter trophies for this athlete
      const athleteTrophies = trophies.filter(t => t.ATHLETE_ID === athleteId);

      // Enrich trophies
      const enrichedTrophies = await Promise.all(
        athleteTrophies.map(trophy => 
          enrichTrophy(trophy, terms, competitors, countries, competitions, seasons)
        )
      );

      // Sort by SEASON_NUM descending (most recent first)
      enrichedTrophies.sort((a, b) => {
        const seasonA = a.SEASON_NUM || 0;
        const seasonB = b.SEASON_NUM || 0;
        return seasonB - seasonA;
      });

      res.json({
        success: true,
        data: enrichedTrophies
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new trophy
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
        COMPETITION_ID,
        SEASON_NUM,
        COMPETITOR_ID
      } = req.body;

      // Validate required fields
      if (!COMPETITION_ID || !SEASON_NUM || !COMPETITOR_ID) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'COMPETITION_ID, SEASON_NUM, and COMPETITOR_ID are required'
          }
        });
      }

      // Load trophies
      const trophies = await dataLoader.loadData('athlete_trophies.json').catch(() => []);

      // Check if trophy already exists (composite key)
      const existingTrophy = trophies.find(
        t => t.ATHLETE_ID === athleteId &&
             t.COMPETITION_ID === parseInt(COMPETITION_ID) &&
             t.SEASON_NUM === parseInt(SEASON_NUM) &&
             t.COMPETITOR_ID === parseInt(COMPETITOR_ID)
      );

      if (existingTrophy) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Trophy already exists for this athlete, competition, season, and competitor combination'
          }
        });
      }

      const now = new Date().toISOString();

      const newTrophy = {
        ATHLETE_ID: athleteId,
        COMPETITION_ID: parseInt(COMPETITION_ID),
        SEASON_NUM: parseInt(SEASON_NUM),
        COMPETITOR_ID: parseInt(COMPETITOR_ID),
        CREATE_TIME: now
      };

      trophies.push(newTrophy);

      // Save trophies
      await dataLoader.saveData('athlete_trophies.json', trophies);

      // Enrich and return
      const [terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      const enrichedTrophy = await enrichTrophy(newTrophy, terms, competitors, countries, competitions, seasons);

      res.status(201).json({
        success: true,
        data: enrichedTrophy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a trophy
   */
  async update(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const competitionId = parseInt(req.params.competitionId);
      const seasonNum = parseInt(req.params.seasonNum);
      const competitorId = parseInt(req.params.competitorId);

      if (isNaN(athleteId) || isNaN(competitionId) || isNaN(seasonNum) || isNaN(competitorId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID, competition ID, season number, or competitor ID'
          }
        });
      }

      // Load trophies
      const trophies = await dataLoader.loadData('athlete_trophies.json').catch(() => []);

      // Find the trophy
      const trophyIndex = trophies.findIndex(
        t => t.ATHLETE_ID === athleteId &&
             t.COMPETITION_ID === competitionId &&
             t.SEASON_NUM === seasonNum &&
             t.COMPETITOR_ID === competitorId
      );

      if (trophyIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Trophy not found'
          }
        });
      }

      const {
        COMPETITION_ID: newCompetitionId,
        SEASON_NUM: newSeasonNum,
        COMPETITOR_ID: newCompetitorId
      } = req.body;

      // If updating to new composite key, check for duplicates
      if (newCompetitionId || newSeasonNum || newCompetitorId) {
        const finalCompetitionId = newCompetitionId ? parseInt(newCompetitionId) : competitionId;
        const finalSeasonNum = newSeasonNum ? parseInt(newSeasonNum) : seasonNum;
        const finalCompetitorId = newCompetitorId ? parseInt(newCompetitorId) : competitorId;

        // Check if new combination already exists (excluding current trophy)
        const duplicateTrophy = trophies.find(
          (t, index) => index !== trophyIndex &&
                       t.ATHLETE_ID === athleteId &&
                       t.COMPETITION_ID === finalCompetitionId &&
                       t.SEASON_NUM === finalSeasonNum &&
                       t.COMPETITOR_ID === finalCompetitorId
        );

        if (duplicateTrophy) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'Trophy with this combination already exists'
            }
          });
        }

        // Update fields
        if (newCompetitionId !== undefined) {
          trophies[trophyIndex].COMPETITION_ID = finalCompetitionId;
        }
        if (newSeasonNum !== undefined) {
          trophies[trophyIndex].SEASON_NUM = finalSeasonNum;
        }
        if (newCompetitorId !== undefined) {
          trophies[trophyIndex].COMPETITOR_ID = finalCompetitorId;
        }
      }

      // Save trophies
      await dataLoader.saveData('athlete_trophies.json', trophies);

      // Enrich and return
      const [terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      const enrichedTrophy = await enrichTrophy(trophies[trophyIndex], terms, competitors, countries, competitions, seasons);

      res.json({
        success: true,
        data: enrichedTrophy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a trophy
   */
  async delete(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const competitionId = parseInt(req.params.competitionId);
      const seasonNum = parseInt(req.params.seasonNum);
      const competitorId = parseInt(req.params.competitorId);

      if (isNaN(athleteId) || isNaN(competitionId) || isNaN(seasonNum) || isNaN(competitorId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID, competition ID, season number, or competitor ID'
          }
        });
      }

      // Load trophies
      const trophies = await dataLoader.loadData('athlete_trophies.json').catch(() => []);

      // Find the trophy
      const trophyIndex = trophies.findIndex(
        t => t.ATHLETE_ID === athleteId &&
             t.COMPETITION_ID === competitionId &&
             t.SEASON_NUM === seasonNum &&
             t.COMPETITOR_ID === competitorId
      );

      if (trophyIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Trophy not found'
          }
        });
      }

      // Remove trophy
      trophies.splice(trophyIndex, 1);

      // Save trophies
      await dataLoader.saveData('athlete_trophies.json', trophies);

      res.json({
        success: true,
        message: 'Trophy deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteTrophyController();
