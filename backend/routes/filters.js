const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

router.get('/', filterController.getAll.bind(filterController));
router.post('/', filterController.create.bind(filterController));
router.put('/bulk', filterController.updateBulk.bind(filterController));

module.exports = router;
