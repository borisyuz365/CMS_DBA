const express = require('express');
const router = express.Router();
const dataSourceController = require('../controllers/dataSourceController');

router.get('/', dataSourceController.getAll.bind(dataSourceController));
router.post('/', dataSourceController.create.bind(dataSourceController));
router.put('/bulk', dataSourceController.updateBulk.bind(dataSourceController));
router.get('/:id', dataSourceController.getById.bind(dataSourceController));
router.delete('/:id', dataSourceController.delete.bind(dataSourceController));

module.exports = router;
