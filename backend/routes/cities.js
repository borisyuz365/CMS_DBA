const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');

router.get('/', cityController.getAll.bind(cityController));

router.put('/bulk', cityController.updateBulk.bind(cityController));

router.post('/', cityController.create.bind(cityController));

router.get('/:id', cityController.getById.bind(cityController));

module.exports = router;
