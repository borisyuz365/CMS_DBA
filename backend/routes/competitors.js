const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitorController');

/**
 * GET /api/competitors
 * Get all competitors with enrichment
 */
router.get('/', competitorController.getAll.bind(competitorController));

/**
 * POST /api/competitors
 * Create a new competitor
 */
router.post('/', competitorController.create.bind(competitorController));

/**
 * PUT /api/competitors/bulk
 * Update multiple competitors (bulk update)
 * NOTE: Must be before /:id route to avoid "bulk" being treated as an ID
 */
router.put('/bulk', competitorController.updateBulk.bind(competitorController));

/**
 * GET /api/competitors/:id
 * Get competitor by ID with enrichment
 */
router.get('/:id', competitorController.getById.bind(competitorController));

module.exports = router;
