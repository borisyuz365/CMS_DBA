const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

router.get('/', filterController.getAll.bind(filterController));
router.get('/:id', filterController.getById.bind(filterController));
router.post('/', filterController.create.bind(filterController));
router.put('/bulk', filterController.updateBulk.bind(filterController));

router.post('/:id/entities', filterController.addEntity.bind(filterController));
router.delete('/:id/entities', filterController.deleteEntities.bind(filterController));
router.post('/:id/targets', filterController.addTarget.bind(filterController));
router.delete('/:id/targets', filterController.deleteTargets.bind(filterController));

module.exports = router;
