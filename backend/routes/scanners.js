const express = require('express');
const router = express.Router();
const scannerController = require('../controllers/scannerController');

router.get('/', scannerController.getAll.bind(scannerController));
router.put('/bulk', scannerController.updateBulk.bind(scannerController));
router.post('/', scannerController.create.bind(scannerController));
router.get('/:id', scannerController.getById.bind(scannerController));
router.post('/:id/action', scannerController.performAction.bind(scannerController));

module.exports = router;
