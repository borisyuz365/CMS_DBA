const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

/**
 * GET /api/games
 * Get all games (optional query: countryId, sportId, competitionId, teamId, gameId, searchPartnerId, dateFrom, dateTo, hideDeleted)
 */
router.get('/', gameController.getAll.bind(gameController));

/**
 * POST /api/games
 * Create a new game
 */
router.post('/', gameController.create.bind(gameController));

/**
 * GET /api/games/:id/updates
 * Get updates log for a game (investigation)
 */
router.get('/:id/updates', gameController.getUpdates.bind(gameController));

router.get('/:id/score-log', gameController.getScoreLog.bind(gameController));
router.get('/:id/status-log', gameController.getStatusLog.bind(gameController));
router.get('/:id/events-log', gameController.getEventsLog.bind(gameController));
router.get('/:id/notifications-log', gameController.getNotificationsLog.bind(gameController));

/**
 * GET /api/games/:id
 * Get game by ID
 */
router.get('/:id', gameController.getById.bind(gameController));

module.exports = router;
