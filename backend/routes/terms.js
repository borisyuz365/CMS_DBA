const express = require('express');
const router = express.Router();
const termController = require('../controllers/termController');

router.get('/', termController.getAll);
router.get('/categories', termController.getCategories);
router.post('/categories', termController.createCategory);
router.post('/', termController.create);
router.get('/:id', termController.getById);
router.put('/:id', termController.update);

module.exports = router;
