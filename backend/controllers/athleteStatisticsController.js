const dataLoader = require('../utils/dataLoader');

/**
 * Resolve term name by ID with fallback logic
 */
function resolveTermName(term) {
  if (!term) return null;
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
 * Enrich statistics with related entities
 */
async function enrichStatistics(statistics, terms, competitors, countries, competitions, seasons) {
  const enriched = { ...statistics };

  // Enrich competitor information
  if (statistics.COMPETITOR_ID) {
    const competitor = competitors.find(c => c.COMPETITOR_ID === statistics.COMPETITOR_ID);
    if (competitor) {
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

  // Enrich competition information
  if (statistics.COMPETITION_ID) {
    const competition = competitions.find(c => c.COMPETITION_ID === statistics.COMPETITION_ID);
    if (competition) {
      if (competition.NAME_ID) {
        const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
        enriched.competitionName = resolveTermName(competitionNameTerm) || `Competition ${competition.COMPETITION_ID}`;
      } else {
        enriched.competitionName = `Competition ${competition.COMPETITION_ID}`;
      }

      // Competition country
      if (competition.COUNTRY_ID) {
        const country = countries.find(c => c.COUNTRY_ID === competition.COUNTRY_ID);
        if (country) {
          enriched.competitionCountryName = country.name;
          enriched.competitionCountryEmoji = country.EMOJI || null;
        }
      }
    }
  }

  // Enrich season information
  if (statistics.COMPETITION_ID && statistics.SEASON_NUM) {
    const season = seasons.find(
      s => s.COMPETITION_ID === statistics.COMPETITION_ID && s.SEASON_NUM === statistics.SEASON_NUM
    );
    if (season) {
      if (season.NAME_ID) {
        const seasonNameTerm = terms.find(t => t.id === season.NAME_ID);
        enriched.seasonName = resolveTermName(seasonNameTerm);
      }
      if (season.START_DATE) {
        enriched.seasonStartDate = season.START_DATE;
      }
      if (season.END_DATE) {
        enriched.seasonEndDate = season.END_DATE;
      }
    }
  }

  return enriched;
}

/**
 * Athlete Statistics Controller
 */
class AthleteStatisticsController {
  /**
   * Get all statistics for an athlete
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
      const [statistics, terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('athlete_statistics.json').catch(() => []),
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      // Filter statistics for this athlete
      const athleteStatistics = statistics.filter(s => s.ATHLETE_ID === athleteId);

      // Enrich statistics
      const enrichedStatistics = await Promise.all(
        athleteStatistics.map(stat =>
          enrichStatistics(stat, terms, competitors, countries, competitions, seasons)
        )
      );

      res.json({
        success: true,
        data: enrichedStatistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all statistics types
   */
  async getStatisticsTypes(req, res, next) {
    try {
      const statisticsTypes = await dataLoader.loadData('athlete_statistics_types.json').catch(() => []);
      res.json({
        success: true,
        data: statisticsTypes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new statistics (array of statistics entries)
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

      const statisticsData = req.body; // Array of statistics entries

      if (!Array.isArray(statisticsData) || statisticsData.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Statistics data must be a non-empty array'
          }
        });
      }

      // Validate all entries have required fields (only COMPETITION_ID is required)
      for (const stat of statisticsData) {
        if (!stat.COMPETITION_ID) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'All statistics entries must have COMPETITION_ID'
            }
          });
        }
      }

      // Load existing statistics
      const statistics = await dataLoader.loadData('athlete_statistics.json').catch(() => []);

      // Check if statistics already exist for this combination
      // Only COMPETITION_ID is required, others can be null
      const firstStat = statisticsData[0];
      const existingStats = statistics.filter(s => {
        const seasonMatch = firstStat.SEASON_NUM === null || firstStat.SEASON_NUM === undefined 
          ? (s.SEASON_NUM === null || s.SEASON_NUM === undefined)
          : s.SEASON_NUM === firstStat.SEASON_NUM;
        const competitorMatch = firstStat.COMPETITOR_ID === null || firstStat.COMPETITOR_ID === undefined
          ? (s.COMPETITOR_ID === null || s.COMPETITOR_ID === undefined)
          : s.COMPETITOR_ID === firstStat.COMPETITOR_ID;
        
        return s.ATHLETE_ID === athleteId &&
               s.COMPETITION_ID === firstStat.COMPETITION_ID &&
               seasonMatch &&
               competitorMatch;
      });

      if (existingStats.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Statistics already exist for this competition/season/competitor combination'
          }
        });
      }

      // Add ATHLETE_ID to all statistics entries
      // Only COMPETITION_ID is required, SEASON_NUM and COMPETITOR_ID can be null
      const newStatistics = statisticsData.map(stat => ({
        ...stat,
        ATHLETE_ID: athleteId,
        SEASON_NUM: stat.SEASON_NUM !== undefined ? stat.SEASON_NUM : null,
        COMPETITOR_ID: stat.COMPETITOR_ID !== undefined ? stat.COMPETITOR_ID : null,
        NUMERIC_VAL: stat.NUMERIC_VAL || 0,
        VALUE: String(stat.NUMERIC_VAL || 0),
        CREATE_TIME: stat.CREATE_TIME || new Date().toISOString(),
      }));

      statistics.push(...newStatistics);

      // Save statistics
      await dataLoader.saveData('athlete_statistics.json', statistics);

      // Load enrichment data and return enriched statistics
      const [terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      const enrichedStatistics = await Promise.all(
        newStatistics.map(stat =>
          enrichStatistics(stat, terms, competitors, countries, competitions, seasons)
        )
      );

      res.json({
        success: true,
        data: enrichedStatistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update statistics (array of statistics entries for a specific combination)
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
            message: 'Invalid parameters'
          }
        });
      }

      const statisticsData = req.body; // Array of statistics entries

      if (!Array.isArray(statisticsData) || statisticsData.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Statistics data must be a non-empty array'
          }
        });
      }

      // Load existing statistics
      const statistics = await dataLoader.loadData('athlete_statistics.json').catch(() => []);

      // Remove existing statistics for this combination
      const filteredStatistics = statistics.filter(s =>
        !(s.ATHLETE_ID === athleteId &&
          s.COMPETITION_ID === competitionId &&
          s.SEASON_NUM === seasonNum &&
          s.COMPETITOR_ID === competitorId)
      );

      // Add updated statistics
      const updatedStatistics = statisticsData.map(stat => ({
        ...stat,
        ATHLETE_ID: athleteId,
        COMPETITION_ID: competitionId,
        SEASON_NUM: seasonNum,
        COMPETITOR_ID: competitorId,
        NUMERIC_VAL: stat.NUMERIC_VAL || 0,
        VALUE: String(stat.NUMERIC_VAL || 0),
        CREATE_TIME: stat.CREATE_TIME || new Date().toISOString(),
      }));

      filteredStatistics.push(...updatedStatistics);

      // Save statistics
      await dataLoader.saveData('athlete_statistics.json', filteredStatistics);

      // Load enrichment data and return enriched statistics
      const [terms, competitors, countries, competitions, seasons] = await Promise.all([
        dataLoader.loadData('terms.json'),
        dataLoader.loadData('competitors.json'),
        dataLoader.loadData('countries.json'),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('seasons.json').catch(() => [])
      ]);

      const enrichedStatistics = await Promise.all(
        updatedStatistics.map(stat =>
          enrichStatistics(stat, terms, competitors, countries, competitions, seasons)
        )
      );

      res.json({
        success: true,
        data: enrichedStatistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete statistics for a specific combination
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
            message: 'Invalid parameters'
          }
        });
      }

      // Load existing statistics
      const statistics = await dataLoader.loadData('athlete_statistics.json').catch(() => []);

      // Filter out statistics for this combination
      const filteredStatistics = statistics.filter(s =>
        !(s.ATHLETE_ID === athleteId &&
          s.COMPETITION_ID === competitionId &&
          s.SEASON_NUM === seasonNum &&
          s.COMPETITOR_ID === competitorId)
      );

      // Save statistics
      await dataLoader.saveData('athlete_statistics.json', filteredStatistics);

      res.json({
        success: true,
        message: 'Statistics deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteStatisticsController();
