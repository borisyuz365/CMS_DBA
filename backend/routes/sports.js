const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');

router.get('/', sportController.getAll.bind(sportController));
router.post('/', sportController.create.bind(sportController));
router.put('/bulk', sportController.updateBulk.bind(sportController));
router.get('/:id', sportController.getById.bind(sportController));
/**
 * DELETE /api/sports/:id — Delete sport. 409 if used by any competition (referential integrity).
 */
router.delete('/:id', sportController.delete.bind(sportController));

module.exports = router;
