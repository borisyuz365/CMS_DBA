const dataLoader = require('../utils/dataLoader');

/**
 * Athlete Injury Controller
 */
class AthleteInjuryController {
  /**
   * Get all injuries for an athlete
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

      // Load injuries
      const injuries = await dataLoader.loadData('athlete_injuries.json').catch(() => []);

      // Filter injuries for this athlete
      const athleteInjuries = injuries.filter(i => i.ATHLETE_ID === athleteId);

      // Sort by START_DATE descending (most recent first)
      athleteInjuries.sort((a, b) => {
        const dateA = a.START_DATE ? new Date(a.START_DATE) : new Date(0);
        const dateB = b.START_DATE ? new Date(b.START_DATE) : new Date(0);
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: athleteInjuries
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new injury
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
        START_DATE,
        END_DATE,
        INJURY_TYPE,
        INJURY_CATEGORY,
        EXPECTED_RETURN,
        ACTIVE,
        DOUBTFUL,
        INJURY_TYPE_UNKNOWN,
        IRRELEVANT
      } = req.body;

      // Validate required fields
      if (!START_DATE) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'START_DATE is required'
          }
        });
      }

      // Load injuries
      const injuries = await dataLoader.loadData('athlete_injuries.json').catch(() => []);

      // Generate new injury ID
      const maxInjuryId = injuries.length > 0 
        ? Math.max(...injuries.map(i => i.INJURY_ID || 0))
        : 0;
      const newInjuryId = maxInjuryId + 1;

      const now = new Date().toISOString();

      const newInjury = {
        INJURY_ID: newInjuryId,
        ATHLETE_ID: athleteId,
        START_DATE: START_DATE,
        END_DATE: END_DATE || null,
        INJURY_TYPE: INJURY_TYPE || null,
        INJURY_CATEGORY: INJURY_CATEGORY || null,
        EXPECTED_RETURN: EXPECTED_RETURN || null,
        ACTIVE: ACTIVE === true || ACTIVE === 'true' || false,
        DOUBTFUL: DOUBTFUL === true || DOUBTFUL === 'true' || false,
        INJURY_TYPE_UNKNOWN: INJURY_TYPE_UNKNOWN === true || INJURY_TYPE_UNKNOWN === 'true' || false,
        IRRELEVANT: IRRELEVANT === true || IRRELEVANT === 'true' || false,
        CREATE_TIME: now,
        UPDATE_TIME: now,
        UPDATE_BY: null
      };

      injuries.push(newInjury);

      // Save injuries
      await dataLoader.saveData('athlete_injuries.json', injuries);

      res.status(201).json({
        success: true,
        data: newInjury
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an injury
   */
  async update(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const injuryId = parseInt(req.params.injuryId);

      if (isNaN(athleteId) || isNaN(injuryId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or injury ID'
          }
        });
      }

      // Load injuries
      const injuries = await dataLoader.loadData('athlete_injuries.json').catch(() => []);

      // Find the injury
      const fullIndex = injuries.findIndex(
        i => i.ATHLETE_ID === athleteId && i.INJURY_ID === injuryId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Injury not found'
          }
        });
      }

      const {
        START_DATE,
        END_DATE,
        INJURY_TYPE,
        INJURY_CATEGORY,
        EXPECTED_RETURN,
        ACTIVE,
        DOUBTFUL,
        INJURY_TYPE_UNKNOWN,
        IRRELEVANT
      } = req.body;

      // Update injury
      if (START_DATE !== undefined) injuries[fullIndex].START_DATE = START_DATE;
      if (END_DATE !== undefined) injuries[fullIndex].END_DATE = END_DATE || null;
      if (INJURY_TYPE !== undefined) injuries[fullIndex].INJURY_TYPE = INJURY_TYPE || null;
      if (INJURY_CATEGORY !== undefined) injuries[fullIndex].INJURY_CATEGORY = INJURY_CATEGORY || null;
      if (EXPECTED_RETURN !== undefined) injuries[fullIndex].EXPECTED_RETURN = EXPECTED_RETURN || null;
      if (ACTIVE !== undefined) {
        injuries[fullIndex].ACTIVE = ACTIVE === true || ACTIVE === 'true' || false;
      }
      if (DOUBTFUL !== undefined) {
        injuries[fullIndex].DOUBTFUL = DOUBTFUL === true || DOUBTFUL === 'true' || false;
      }
      if (INJURY_TYPE_UNKNOWN !== undefined) {
        injuries[fullIndex].INJURY_TYPE_UNKNOWN = INJURY_TYPE_UNKNOWN === true || INJURY_TYPE_UNKNOWN === 'true' || false;
      }
      if (IRRELEVANT !== undefined) {
        injuries[fullIndex].IRRELEVANT = IRRELEVANT === true || IRRELEVANT === 'true' || false;
      }
      injuries[fullIndex].UPDATE_TIME = new Date().toISOString();

      // Save injuries
      await dataLoader.saveData('athlete_injuries.json', injuries);

      res.json({
        success: true,
        data: injuries[fullIndex]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an injury
   */
  async delete(req, res, next) {
    try {
      const athleteId = parseInt(req.params.id);
      const injuryId = parseInt(req.params.injuryId);

      if (isNaN(athleteId) || isNaN(injuryId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid athlete ID or injury ID'
          }
        });
      }

      // Load injuries
      const injuries = await dataLoader.loadData('athlete_injuries.json').catch(() => []);

      // Find the injury
      const fullIndex = injuries.findIndex(
        i => i.ATHLETE_ID === athleteId && i.INJURY_ID === injuryId
      );

      if (fullIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Injury not found'
          }
        });
      }

      // Remove injury
      injuries.splice(fullIndex, 1);

      // Save injuries
      await dataLoader.saveData('athlete_injuries.json', injuries);

      res.json({
        success: true,
        message: 'Injury deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AthleteInjuryController();
