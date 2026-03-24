const express = require('express');
const router = express.Router();
const athleteController = require('../controllers/athleteController');
const athleteContractController = require('../controllers/athleteContractController');
const athleteStatisticsController = require('../controllers/athleteStatisticsController');
const athleteInjuryController = require('../controllers/athleteInjuryController');
const athleteSuspensionController = require('../controllers/athleteSuspensionController');
const athleteTrophyController = require('../controllers/athleteTrophyController');

/**
 * GET /api/athletes
 * Get all athletes with enrichment
 */
router.get('/', athleteController.getAll.bind(athleteController));

/**
 * POST /api/athletes
 * Create a new athlete
 */
router.post('/', athleteController.create.bind(athleteController));

/**
 * PUT /api/athletes/bulk
 * Update multiple athletes (bulk update)
 * NOTE: Must be before /:id route to avoid "bulk" being treated as an ID
 */
router.put('/bulk', athleteController.updateBulk.bind(athleteController));

/**
 * GET /api/athletes/:id/contracts
 * Get all contracts for an athlete
 */
router.get('/:id/contracts', athleteContractController.getByAthleteId.bind(athleteContractController));

/**
 * POST /api/athletes/:id/contracts
 * Create a new contract for an athlete
 */
router.post('/:id/contracts', athleteContractController.create.bind(athleteContractController));

/**
 * PUT /api/athletes/:id/contracts/:contractId
 * Update a contract for an athlete
 */
router.put('/:id/contracts/:contractId', athleteContractController.update.bind(athleteContractController));

/**
 * DELETE /api/athletes/:id/contracts/:contractId
 * Delete a contract for an athlete
 */
router.delete('/:id/contracts/:contractId', athleteContractController.delete.bind(athleteContractController));

/**
 * GET /api/athletes/:id/statistics
 * Get all statistics for an athlete
 */
router.get('/:id/statistics', athleteStatisticsController.getByAthleteId.bind(athleteStatisticsController));

/**
 * POST /api/athletes/:id/statistics
 * Create new statistics for an athlete
 */
router.post('/:id/statistics', athleteStatisticsController.create.bind(athleteStatisticsController));

/**
 * PUT /api/athletes/:id/statistics/:competitionId/:seasonNum/:competitorId
 * Update statistics for an athlete
 */
router.put('/:id/statistics/:competitionId/:seasonNum/:competitorId', athleteStatisticsController.update.bind(athleteStatisticsController));

/**
 * DELETE /api/athletes/:id/statistics/:competitionId/:seasonNum/:competitorId
 * Delete statistics for an athlete
 */
router.delete('/:id/statistics/:competitionId/:seasonNum/:competitorId', athleteStatisticsController.delete.bind(athleteStatisticsController));

/**
 * GET /api/athletes/:id/injuries
 * Get all injuries for an athlete
 */
router.get('/:id/injuries', athleteInjuryController.getByAthleteId.bind(athleteInjuryController));

/**
 * POST /api/athletes/:id/injuries
 * Create a new injury for an athlete
 */
router.post('/:id/injuries', athleteInjuryController.create.bind(athleteInjuryController));

/**
 * PUT /api/athletes/:id/injuries/:injuryId
 * Update an injury for an athlete
 */
router.put('/:id/injuries/:injuryId', athleteInjuryController.update.bind(athleteInjuryController));

/**
 * DELETE /api/athletes/:id/injuries/:injuryId
 * Delete an injury for an athlete
 */
router.delete('/:id/injuries/:injuryId', athleteInjuryController.delete.bind(athleteInjuryController));

/**
 * GET /api/athletes/:id/suspensions
 * Get all suspensions for an athlete
 */
router.get('/:id/suspensions', athleteSuspensionController.getByAthleteId.bind(athleteSuspensionController));

/**
 * POST /api/athletes/:id/suspensions
 * Create a new suspension for an athlete
 */
router.post('/:id/suspensions', athleteSuspensionController.create.bind(athleteSuspensionController));

/**
 * PUT /api/athletes/:id/suspensions/:suspensionId
 * Update a suspension for an athlete
 */
router.put('/:id/suspensions/:suspensionId', athleteSuspensionController.update.bind(athleteSuspensionController));

/**
 * DELETE /api/athletes/:id/suspensions/:suspensionId
 * Delete a suspension for an athlete
 */
router.delete('/:id/suspensions/:suspensionId', athleteSuspensionController.delete.bind(athleteSuspensionController));

/**
 * GET /api/athletes/:id/trophies
 * Get all trophies for an athlete
 */
router.get('/:id/trophies', athleteTrophyController.getByAthleteId.bind(athleteTrophyController));

/**
 * POST /api/athletes/:id/trophies
 * Create a new trophy for an athlete
 */
router.post('/:id/trophies', athleteTrophyController.create.bind(athleteTrophyController));

/**
 * PUT /api/athletes/:id/trophies/:competitionId/:seasonNum/:competitorId
 * Update a trophy for an athlete
 */
router.put('/:id/trophies/:competitionId/:seasonNum/:competitorId', athleteTrophyController.update.bind(athleteTrophyController));

/**
 * DELETE /api/athletes/:id/trophies/:competitionId/:seasonNum/:competitorId
 * Delete a trophy for an athlete
 */
router.delete('/:id/trophies/:competitionId/:seasonNum/:competitorId', athleteTrophyController.delete.bind(athleteTrophyController));

/**
 * GET /api/athletes/:id
 * Get athlete by ID with enrichment
 */
router.get('/:id', athleteController.getById.bind(athleteController));

module.exports = router;
