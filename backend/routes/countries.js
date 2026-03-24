const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

/**
 * GET /api/countries
 * Get all countries (optional query: countryId, countryCode, name)
 */
router.get('/', countryController.getAll.bind(countryController));

/**
 * PUT /api/countries/bulk
 * Update multiple countries (body: { updates: [{ countryId, changes }] })
 * Must be before /:id to avoid "bulk" as id
 */
router.put('/bulk', countryController.updateBulk.bind(countryController));

/**
 * POST /api/countries
 * Create a new country
 */
router.post('/', countryController.create.bind(countryController));

/**
 * GET /api/countries/:id
 * Get country by ID
 */
router.get('/:id', countryController.getById.bind(countryController));

/**
 * DELETE /api/countries/:id
 * Delete country. 409 if used by any competition (referential integrity).
 */
router.delete('/:id', countryController.delete.bind(countryController));

module.exports = router;
