const express = require('express');
const router = express.Router();
const tzdbTimeZoneController = require('../controllers/tzdbTimeZoneController');

router.get('/', tzdbTimeZoneController.getAll.bind(tzdbTimeZoneController));
router.get('/by-name/:name', tzdbTimeZoneController.getByName.bind(tzdbTimeZoneController));
router.patch('/by-name/:name', tzdbTimeZoneController.updateConnection.bind(tzdbTimeZoneController));

module.exports = router;
