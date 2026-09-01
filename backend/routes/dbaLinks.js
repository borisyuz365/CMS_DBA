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
//   platform           optional (ios/android/…); empty/'all' → match LinksManager empty P
//   publisher          optional publisher / network name
//   lang               optional, integer (language id)
//   campaign           optional
//   format             optional (ad format / placement, e.g. Interstitial)
//   offer              optional, default '1x2'
//   price              optional
//   ordering           optional
//   maturity           optional integer (weeks)
//   scope              optional
//   at                 optional, ISO date (defaults to now; reserved)
//
// Resolve order for Bet365 (14):
//   1. Targetings ExtraLinks (production LinksManager parity)
//   2. Sportifier T_BET_BOOKMAKER_COUNTRIES + T_DICT_VALUES
const express = require('express');
const { resolveFromTargetings } = require('../services/bet365TargetingsLinks');
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
    publisher:      query.publisher != null ? String(query.publisher) : '',
    languageId:     query.lang ? parseInt(query.lang, 10) : null,
    campaignSource: query.campaign != null ? String(query.campaign) : '',
    adFormat:       query.format != null ? String(query.format) : '',
    offer:          query.offer != null ? String(query.offer) : '1x2',
    price:          query.price != null ? String(query.price) : '',
    ordering:       query.ordering != null ? String(query.ordering) : '',
    maturity:       query.maturity != null ? parseInt(query.maturity, 10) : -1,
    scope:          query.scope != null ? String(query.scope) : '',
    at:             query.at ? new Date(query.at) : new Date(),
  };
}

async function resolve(ctx) {
  if (!Number.isFinite(ctx.bmid) || !Number.isFinite(ctx.cid)) {
    return { url: null, source: null, reason: 'missing or invalid bmid/cid' };
  }
  if (!CONTEXT_AWARE_BMIDS.has(ctx.bmid)) {
    return {
      url: null,
      source: null,
      reason: `bmid=${ctx.bmid} is not context-aware (CONTEXT_AWARE_BMIDS=${[...CONTEXT_AWARE_BMIDS].join(',')})`,
    };
  }

  // 1. Production Targetings ExtraLinks (LinksManager parity)
  const fromTargetings = await resolveFromTargetings(ctx);
  if (fromTargetings) {
    return { url: fromTargetings, source: 'targetings', reason: null };
  }

  // 2. Sportifier MSSQL fallback (monthly dict rows)
  const fromSportifier = await resolveBet365Link(ctx);
  if (fromSportifier) {
    return { url: fromSportifier, source: 'sportifier', reason: null };
  }

  return {
    url: null,
    source: null,
    reason: 'no resolvable Targetings ExtraLink or Sportifier row for this context',
  };
}

router.get('/click', async (req, res, next) => {
  try {
    const ctx = parseContext(req.query);
    const { url, reason, source } = await resolve(ctx);
    if (!url) {
      return res.status(404).json({ error: 'No matching link', context: ctx, reason, source });
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
    res.status(500).json({
      error: err.message,
      code: err.code,
      hint: 'Targetings network failure or Sportifier DB connectivity (VPN) — see backend/services/bet365TargetingsLinks.js and bet365Links.js',
    });
  }
});

module.exports = router;
