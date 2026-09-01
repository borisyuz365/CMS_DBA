// Bet365 DBA affiliate resolution via the production Targetings ExtraLinks
// path — mirrors AdsGeneratorService LinksManager (links_manager.py).
//
// Primary source for /api/dba/links when CONTEXT_AWARE_BMIDS includes 14.
// Sportifier MSSQL (bet365Links.js) remains a last-resort fallback in dbaLinks.
const crypto = require('crypto');

const DEFAULT_URL_TEMPLATE =
  process.env.BET365_TARGETINGS_URL
  || 'http://ds-ads.365scores.com/Data/Bets/Bookmakers/Targetings?country={cid}&uc={cid}&lang={lang}&bmid={bmid}&contextFilter=DBA&platforms=1&platforms=2';

const CACHE_TTL_MS = parseInt(process.env.BET365_TARGETINGS_CACHE_TTL_MS || '300000', 10); // 5 min
const FETCH_TIMEOUT_MS = parseInt(process.env.BET365_TARGETINGS_TIMEOUT_MS || '8000', 10);

// cacheKey → { expiresAt, data: { [md5Key]: { link, maturities } } }
const cache = new Map();

function stupidEncoded(value) {
  let ret = String(value == null ? '' : value);
  const replaceChars = "\"|'|=|!|+|#|*|~|;|^|(|)|<|>|[|]|,|&";
  for (const char of replaceChars.split('|')) {
    ret = ret.split(char).join('_');
  }
  return ret;
}

function normalizePublisher(publisher) {
  const s = String(publisher == null || publisher === -1 ? '' : publisher);
  if (s.toLowerCase() === 'organic') return '';
  return s;
}

function getKeyParams({
  bmid = -1,
  country = -1,
  platform = '',
  lang = -1,
  publisher = '',
  campaign = '',
  format = '',
  offer = '',
  price = '',
  ordering = '',
  scope = '',
} = {}) {
  const pub = normalizePublisher(publisher);
  return [
    `bmid=${bmid}`,
    `country=${country}`,
    `platform=${String(platform).toLowerCase()}`,
    `lang=${lang}`,
    `publisher=${pub.toLowerCase()}`,
    `campaign=${String(campaign).toLowerCase()}`,
    `format=${String(format).toLowerCase()}`,
    `offer=${String(offer).toLowerCase()}`,
    `price=${String(price).toLowerCase()}`,
    `ordering=${String(ordering).toLowerCase()}`,
    `scope=${String(scope).toLowerCase()}`,
  ].join('&');
}

function getKey(params) {
  return crypto.createHash('md5').update(getKeyParams(params), 'utf8').digest('hex');
}

function getParamValue(params, key, defaultValue = '') {
  return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : defaultValue;
}

function contextParamsFromExtraLink(extraLink) {
  const params = {};
  for (const param of (extraLink.ContextParams || [])) {
    params[param.K] = param.V;
  }
  return params;
}

function maturityObject(maturity) {
  let value = String(maturity);
  const ret = { maturity: value, min: -1, max: -1 };
  value = value.replace('WK', '');
  if (value.includes('-')) {
    const [a, b] = value.split('-');
    ret.min = parseInt(a, 10);
    ret.max = parseInt(b, 10);
  } else if (value.includes('+')) {
    ret.min = parseInt(value.replace('+', ''), 10);
    ret.max = 1000000;
  } else {
    ret.min = parseInt(value, 10);
    ret.max = ret.min;
  }
  return ret;
}

function ensureEntry(map, key) {
  if (!map[key]) map[key] = { link: null, maturities: [] };
  return map[key];
}

function storeLink(map, key, link, maturity) {
  const entry = ensureEntry(map, key);
  if (maturity == null || maturity === '') {
    entry.link = link;
    return;
  }
  if (String(maturity).toUpperCase().startsWith('WK')) {
    entry.maturities.push({ maturity: maturityObject(maturity), link });
  }
}

/**
 * Build the LinksManager-style lookup map from a Targetings API payload.
 * Pure — used by resolveFromTargetings and unit tests.
 */
function mapLinks(lang, linksPayload, inputData = {}) {
  const targetings = linksPayload && linksPayload.Targetings;
  if (!Array.isArray(targetings)) return inputData;

  for (const targeting of targetings) {
    const cid = targeting.CountryID;
    const publisher = targeting.PublisherName || '';

    for (const bookmaker of (targeting.Bookmakers || [])) {
      if (bookmaker.ID !== 14) continue;
      const bmid = bookmaker.ID;
      for (const extraLink of (bookmaker.ExtraLinks || [])) {
        const link = extraLink.Link;
        const params = contextParamsFromExtraLink(extraLink);
        if (getParamValue(params, 'C') !== 'DBA') continue;

        const platform = getParamValue(params, 'P');
        const campaign = getParamValue(params, 'CA', '');
        const format = getParamValue(params, 'Format');
        const price = getParamValue(params, 'Price');
        const offer = getParamValue(params, 'Offer');
        const ordering = getParamValue(params, 'Ordering');
        const maturity = getParamValue(params, 'Maturity', null);
        const scope = getParamValue(params, 'Scope');

        const keyParams = {
          bmid, country: cid, platform, lang, publisher, campaign,
          format, offer, price, ordering, scope,
        };
        const key = getKey(keyParams);
        storeLink(inputData, key, link, maturity);

        const encodedKey = getKey({
          ...keyParams,
          publisher: stupidEncoded(publisher),
          campaign: stupidEncoded(campaign),
        });
        if (encodedKey !== key) {
          storeLink(inputData, encodedKey, link, maturity);
        }
      }
    }
  }
  return inputData;
}

/**
 * Pick a URL from a LinksManager-style map. Pure — unit-testable.
 * Mirrors GetLink fallbacks: exact key → key with empty format/offer/price/ordering/scope → null
 * (bookie term fallback is intentionally omitted; Sportifier handles that in dbaLinks).
 */
function pickLinkFromMap(data, ctx) {
  const bmid = parseInt(ctx.bmid, 10);
  if (bmid !== 14) return null;

  const country = parseInt(ctx.cid, 10);
  const lang = Number.isFinite(parseInt(ctx.languageId, 10)) ? parseInt(ctx.languageId, 10) : 1;
  const platform = ctx.platform == null || ctx.platform === 'all' ? '' : String(ctx.platform);
  const publisher = ctx.publisher == null ? '' : ctx.publisher;
  const campaign = ctx.campaignSource == null ? '' : String(ctx.campaignSource);
  const format = ctx.adFormat == null ? '' : String(ctx.adFormat);
  const offer = ctx.offer == null ? '' : String(ctx.offer);
  const price = ctx.price == null ? '' : String(ctx.price);
  const ordering = ctx.ordering == null ? '' : String(ctx.ordering);
  const scope = ctx.scope == null ? '' : String(ctx.scope);
  const maturity = Number.isFinite(parseInt(ctx.maturity, 10)) ? parseInt(ctx.maturity, 10) : -1;

  const key = getKey({
    bmid, country, platform, lang, publisher, campaign, format, offer, price, ordering, scope,
  });

  if (data[key]) {
    const linkData = data[key];
    if (linkData.maturities && linkData.maturities.length > 0) {
      let link = linkData.maturities[linkData.maturities.length - 1].link;
      for (const m of linkData.maturities) {
        if (maturity >= m.maturity.min && maturity <= m.maturity.max) {
          link = m.link;
          break;
        }
      }
      return link || null;
    }
    return linkData.link || null;
  }

  // LinksManager "campaign fallback": same bmid/cid/platform/lang/publisher/campaign,
  // empty format/offer/price/ordering/scope.
  const fallbackKey = getKey({
    bmid, country, platform, lang, publisher, campaign,
    format: '', offer: '', price: '', ordering: '', scope: '',
  });
  if (data[fallbackKey] && data[fallbackKey].link) {
    return data[fallbackKey].link;
  }
  return null;
}

function buildTargetingsUrl({ cid, lang, bmid }) {
  return DEFAULT_URL_TEMPLATE
    .replace(/\{cid\}/g, String(cid))
    .replace(/\{lang\}/g, String(lang))
    .replace(/\{bmid\}/g, String(bmid));
}

async function fetchTargetingsPayload({ cid, lang, bmid }) {
  const url = buildTargetingsUrl({ cid, lang, bmid });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Targetings HTTP ${res.status} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getLinkMap({ cid, lang, bmid }) {
  const cacheKey = `${bmid}:${cid}:${lang}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const payload = await fetchTargetingsPayload({ cid, lang, bmid });
  const data = mapLinks(lang, payload, {});
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}

/**
 * Resolve a Bet365 DBA affiliate URL from Targetings ExtraLinks.
 * @returns {Promise<string|null>}
 */
async function resolveFromTargetings(context) {
  const bmid = parseInt(context.bmid, 10);
  const cid = parseInt(context.cid, 10);
  if (!Number.isFinite(bmid) || !Number.isFinite(cid) || bmid !== 14) return null;

  const lang = Number.isFinite(parseInt(context.languageId, 10))
    ? parseInt(context.languageId, 10)
    : 1;

  try {
    const data = await getLinkMap({ cid, lang, bmid });
    return pickLinkFromMap(data, context);
  } catch (err) {
    console.error('[bet365TargetingsLinks] resolve failed:', err.message);
    return null;
  }
}

/** Test helper — clear in-memory cache. */
function clearCache() {
  cache.clear();
}

module.exports = {
  resolveFromTargetings,
  mapLinks,
  pickLinkFromMap,
  getKey,
  getKeyParams,
  stupidEncoded,
  maturityObject,
  buildTargetingsUrl,
  clearCache,
  CACHE_TTL_MS,
};
