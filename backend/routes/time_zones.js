const express = require('express');
const router = express.Router();
const timeZoneController = require('../controllers/timeZoneController');

router.get('/', timeZoneController.getAll.bind(timeZoneController));
router.post('/', timeZoneController.create.bind(timeZoneController));
router.put('/bulk', timeZoneController.updateBulk.bind(timeZoneController));
router.get('/:id', timeZoneController.getById.bind(timeZoneController));
router.delete('/:id', timeZoneController.delete.bind(timeZoneController));

module.exports = router;
