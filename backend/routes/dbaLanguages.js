// /api/dba/languages — UI languages from production T_LANGUAGES (shared cache).
const express = require('express');
const languageCache = require('../services/languageCache');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(languageCache.listLanguages());
});

module.exports = router;
