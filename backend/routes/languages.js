const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');

router.get('/', languageController.getAll.bind(languageController));
router.post('/', languageController.create.bind(languageController));
router.put('/bulk', languageController.updateBulk.bind(languageController));
router.get('/:id', languageController.getById.bind(languageController));
router.delete('/:id', languageController.delete.bind(languageController));

module.exports = router;
