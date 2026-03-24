const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venueController');

/**
 * GET /api/venues
 * Get all venues with enrichment
 */
router.get('/', venueController.getAll.bind(venueController));

/**
 * POST /api/venues
 * Create a new venue
 */
router.post('/', venueController.create.bind(venueController));

/**
 * PUT /api/venues/bulk
 * Update multiple venues (bulk update)
 * NOTE: Must be before /:id route to avoid "bulk" being treated as an ID
 */
router.put('/bulk', venueController.updateBulk.bind(venueController));

/**
 * GET /api/venues/:id
 * Get venue by ID with enrichment
 */
router.get('/:id', venueController.getById.bind(venueController));

module.exports = router;
