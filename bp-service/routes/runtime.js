// Public runtime routes for mobile clients — GET /api/bp, GET /api/bp/meta.

const router = require('express').Router();
const bpCache = require('../../backend/services/bpCache');
const { selectVersion } = require('../../backend/services/bpTargeting');
const { PLATFORM_BY_APP_TYPE, formatVersion } = require('../../backend/services/bp/formatRuntime');

/**
 * @openapi
 * /api/bp:
 *   get:
 *     tags: [Runtime]
 *     summary: Get a matched promotion (mobile clients)
 */
router.get('/', (req, res) => {
  const cache = bpCache.get();

  if (!cache) {
    return res.status(503).json({ error: 'Service initializing — retry in a moment' });
  }

  const { uc, appType, lid, lang, publisher, campaign } = req.query;
  const platform = PLATFORM_BY_APP_TYPE[appType];
  const version = selectVersion(cache.versions, { cid: uc, platform, lid, lang, publisher, campaign });

  if (!version) {
    return res.status(404).json({ error: 'No matching promotion found for the given targeting params' });
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.json(formatVersion(version, { uc }));
});

router.get('/meta', (req, res) => {
  const cache = bpCache.get();
  if (!cache) return res.status(503).json({ ready: false });
  res.json({
    ready:         true,
    builtAt:       new Date(cache.builtAt).toISOString(),
    ageMs:         Date.now() - cache.builtAt,
    totalVersions: cache.versions.length,
  });
});

module.exports = router;
