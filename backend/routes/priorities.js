const express = require('express');
const router = express.Router();
const priorityController = require('../controllers/priorityController');

router.get('/', priorityController.getAll.bind(priorityController));
router.get('/history', priorityController.getHistory.bind(priorityController));
router.post('/', priorityController.create.bind(priorityController));
router.put('/bulk', priorityController.updateBulk.bind(priorityController));
router.delete('/bulk', priorityController.deleteBulk.bind(priorityController));
router.get('/:id', priorityController.getById.bind(priorityController));
router.delete('/:id', priorityController.delete.bind(priorityController));

module.exports = router;
