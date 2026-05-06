const express = require('express');
const router = express.Router();
const tvNetworksController = require('../controllers/tvNetworksController');

router.get('/', tvNetworksController.getAll.bind(tvNetworksController));
router.post('/', tvNetworksController.create.bind(tvNetworksController));
router.put('/bulk', tvNetworksController.updateBulk.bind(tvNetworksController));
router.get('/:id', tvNetworksController.getById.bind(tvNetworksController));
router.put('/:id/related-countries', tvNetworksController.updateRelatedCountries.bind(tvNetworksController));

module.exports = router;
