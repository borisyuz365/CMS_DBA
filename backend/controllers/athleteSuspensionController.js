const dataLoader = require('../utils/dataLoader');

/**
 * Athlete Suspension Controller
 */
class AthleteSuspensionController {
  /**
   * Get all suspensions for an athlete
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

      // Load suspensions and competitions
      const [suspensions, competitions, terms] = await Promise.all([
        dataLoader.loadData('athlete_suspensions.json').catch(() => []),
        dataLoader.loadData('competitions.json').catch(() => []),
        dataLoader.loadData('terms.json').catch(() => [])
      ]);

      // Filter suspensions for this athlete
      const athleteSuspensions = suspensions.filter(s => s.ATHLETE_ID === athleteId);

      // Enrich with competition names
      const enrichedSuspensions = athleteSuspensions.map(suspension => {
        const enriched = { ...suspension };
        if (suspension.COMPETITION_ID) {
          const competition = competitions.find(c => c.COMPETITION_ID === suspension.COMPETITION_ID);
          if (competition && competition.NAME_ID) {
            const competitionNameTerm = terms.find(t => t.id === competition.NAME_ID);
            if (competitionNameTerm) {
              // Resolve term name
              if (competitionNameTerm.engValue) {
                enriched.competitionName = competitionNameTerm.engValue;
              } else if (competitionNameTerm.values && Array.isArray(competitionNameTerm.values)) {
                const englishValue = competitionNameTerm.values.find(v => v.languageId === 1);
                if (englishValue && englishValue.value) {
                  enriched.competitionName = englishValue.value;
                }
              }
            }
          }
        }
        return enriched;
      });

      // Sort by SUSPENSION_ID descending (most recent first)
      enrichedSuspensions.sort((a, b) => {
        return (b.SUSPENSION_ID || 0) - (a.SUSPENSION_ID || 0);
      });

      res.json({
        success: true,
        data: enrichedSuspensions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new suspension
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
        GAMES_COUNT,
        SUSPENSION_TYPE
      } = req.body;

      // Load suspensions
      const suspensions = await dataLoader.loadData('athlete_suspensions.json').catch(() => []);

      // Generate new suspension ID
      const maxSuspensionId = suspensions.length > 0 
        ? Math.max(...suspensions.map(s => s.SUSPENSION_ID || 0))
        : 0;
      const newSuspensionId = maxSuspensionId + 1;

      const now = new Date().toISOString();

      const newSuspension = {
        SUSPENSION_ID: newSuspensionId,
        ATHLETE_ID: athleteId,
        COMPETITION_ID: COMPETITION_ID ? parseInt(COMPETITION_ID) : null,
        START_DATE: null,
        END_DATE: null,
        GAMES_COUNT: GAMES_COUNT ? parseInt(GAMES_COUNT) : null,
        SUSPENSION_TYPE: SUSPENSION_TYPE || null,
        CREATE_TIME: now,
        UPDATE_TIME: now,
        UPDATE_BY: null
      };

      suspensions.push(newSuspension);

      // Save suspensions
      await dataLoader.saveData('athlete_suspensions.json', suspensions);

      res.status(201).json({
        success: true,
        data: newSuspension
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a suspension
   */
  async update(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const suspensionId = parseInt(req.params.suspensionId);

      if (isNaN(athleteId) || isNaN(suspensionId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or suspension ID'
          }
        });
      }

      // Load suspensions
      const suspensions = await dataLoader.loadData('athlete_suspensions.json').catch(() => []);

      // Find the suspension
      const fullIndex = suspensions.findIndex(
        s => s.ATHLETE_ID === athleteId && s.SUSPENSION_ID === suspensionId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Suspension not found'
          }
        });
      }

      const {
        COMPETITION_ID,
        GAMES_COUNT,
        SUSPENSION_TYPE
      } = req.body;

      // Update suspension
      if (COMPETITION_ID !== undefined) {
        suspensions[fullIndex].COMPETITION_ID = COMPETITION_ID ? parseInt(COMPETITION_ID) : null;
      }
      if (GAMES_COUNT !== undefined) {
        suspensions[fullIndex].GAMES_COUNT = GAMES_COUNT ? parseInt(GAMES_COUNT) : null;
      }
      if (SUSPENSION_TYPE !== undefined) {
        suspensions[fullIndex].SUSPENSION_TYPE = SUSPENSION_TYPE || null;
      }
      suspensions[fullIndex].UPDATE_TIME = new Date().toISOString();

      // Save suspensions
      await dataLoader.saveData('athlete_suspensions.json', suspensions);

      res.json({
        success: true,
        data: suspensions[fullIndex]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a suspension
   */
  async delete(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const suspensionId = parseInt(req.params.suspensionId);

      if (isNaN(athleteId) || isNaN(suspensionId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or suspension ID'
          }
        });
      }

      // Load suspensions
      const suspensions = await dataLoader.loadData('athlete_suspensions.json').catch(() => []);

      // Find the suspension
      const fullIndex = suspensions.findIndex(
        s => s.ATHLETE_ID === athleteId && s.SUSPENSION_ID === suspensionId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Suspension not found'
          }
        });
      }

      // Remove suspension
      suspensions.splice(fullIndex, 1);

      // Save suspensions
      await dataLoader.saveData('athlete_suspensions.json', suspensions);

      res.json({
        success: true,
        message: 'Suspension deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteSuspensionController();
