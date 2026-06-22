// /api/dba/links — runtime click resolution for context-aware affiliate links.
//
// Two endpoints:
//   GET /click   — 302 redirect to the resolved URL (the path GAM Creatives use)
//   GET /resolve — JSON debug view of what /click would do (useful when QA'ing
//                  the resolver without an actual browser hop)
//
// Both accept the same query params:
//   bmid               required, integer
//   cid                required, integer (country id, NOT the ISO code)
//   platform           optional, default 'all'
//   lang               optional, integer (CMS-local language id)
//   campaign           optional
//   format             optional (ad format)
//   at                 optional, ISO date (defaults to now)
const express = require('express');
const { resolveBet365Link } = require('../services/bet365Links');

const router = express.Router();

// Set of bmids that resolve via the context-aware path. Bet365 (14) is the
// only one today; comma-separated env override for when others join.
const CONTEXT_AWARE_BMIDS = new Set(
  (process.env.CONTEXT_AWARE_BMIDS || '14')
    .split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite),
);

function parseContext(query) {
  return {
    bmid:           parseInt(query.bmid, 10),
    cid:            parseInt(query.cid, 10),
    platform:       (query.platform || 'all').toString(),
    languageId:     query.lang ? parseInt(query.lang, 10) : null,
    campaignSource: query.campaign || null,
    adFormat:       query.format || null,
    at:             query.at ? new Date(query.at) : new Date(),
  };
}

async function resolve(ctx) {
  if (!Number.isFinite(ctx.bmid) || !Number.isFinite(ctx.cid)) {
    return { url: null, reason: 'missing or invalid bmid/cid' };
  }
  if (!CONTEXT_AWARE_BMIDS.has(ctx.bmid)) {
    return { url: null, reason: `bmid=${ctx.bmid} is not context-aware (CONTEXT_AWARE_BMIDS=${[...CONTEXT_AWARE_BMIDS].join(',')})` };
  }
  // Today only Bet365 (14). Add per-bmid dispatch here if others join.
  const url = await resolveBet365Link(ctx);
  return { url, reason: url ? null : 'no resolvable row in T_BET_BOOKMAKER_COUNTRIES + T_DICT_VALUES for this context (all candidate term ids returned empty values)' };
}

router.get('/click', async (req, res, next) => {
  try {
    const ctx = parseContext(req.query);
    const { url, reason } = await resolve(ctx);
    if (!url) {
      // We can't redirect anywhere. Returning 404 is honest, but ad-click
      // flows usually prefer a sensible-looking fallback so the user doesn't
      // see a bare error page. For now: 404 with a helpful JSON body.
      return res.status(404).json({ error: 'No matching link', context: ctx, reason });
    }
    return res.redirect(302, url);
  } catch (err) { next(err); }
});

router.get('/resolve', async (req, res, next) => {
  try {
    const ctx = parseContext(req.query);
    const result = await resolve(ctx);
    res.json({ context: ctx, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code, hint: 'Likely DB connectivity (VPN) or wrong table/column names — see backend/services/bet365Links.js' });
  }
});

module.exports = router;
