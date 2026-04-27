const express = require('express');
const router = express.Router();
const tempController = require('../controllers/tempController');

router.get('/:entity', tempController.getAll);
router.put('/:entity/:id', tempController.update);
router.delete('/:entity/:id', tempController.remove);
router.post('/:entity/bulk-delete', tempController.remove);
router.post('/:entity/connect', tempController.connect);
router.post('/:entity/suggest', tempController.suggest);

module.exports = router;
