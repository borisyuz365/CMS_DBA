// Build GAM bake values aligned with CMS AdPreview + validate export vs preview.
const { bgCss, invertText, resolveLogoUrl, resolveDatePillBg, resolveDatePillFg, resolveOddsBoxBg, resolveOddsTextColor, resolveCardBg } = require('../utils/dbaStyle');
const { brazilDefaultLegalText, BRAZIL_LEGAL_FALLBACK_TEXT, LEGAL_BAND_BG_DEFAULT } = require('../utils/brazilLegal');
const { countryToLangId } = require('../routes/_dbaLang');
const { placementForSize } = require('../utils/dbaSizes');

const CID_FOR_COUNTRY = {
  AR: 10, BR: 21, CL: 28, CO: 109, EC: 51, MX: 31, PE: 112, PL: 37,
  DE: 25, ES: 36, IT: 27, UK: 17, US: 8, AU: 90, CA: 76, GLOBAL: 0,
};

const LATAM_COUNTRIES = new Set(['CO', 'CL', 'PE', 'EC', 'MX']);

/** Effective /GetPayload lang — mirrors AdsGeneratorService overrides (use explicit ids). */
function feedLangForCountry(country, cmsLangId) {
  if (country === 'BR') return 31;
  if (LATAM_COUNTRIES.has(country)) return 29;
  return cmsLangId || 1;
}

function buildFeedUrl({ country, bmid, cmsLangId, sizeId, feedBaseUrl, payloadLink }) {
  const base = feedBaseUrl || process.env.FEED_BASE_URL || 'https://bettingads.365scores.com';
  const cidNumeric = CID_FOR_COUNTRY[country];
  const cidParam = cidNumeric != null ? cidNumeric : country;
  const lang = feedLangForCountry(country, cmsLangId);
  const placment = placementForSize(sizeId);
  // Core market identity is baked. Targeting context (OS / network / campaign /
  // price / maturity / scope / ordering) is attached separately for Bet365 so
  // dba-runtime can encodeURIComponent each value — same as legacy dba_service_url().
  let url = `${base}/GetPayload?cid=${encodeURIComponent(cidParam)}`
    + `&bmid=${bmid}`
    + `&lang=${lang}`
    + `&placment=${encodeURIComponent(placment)}`;
  if (payloadLink) {
    // Bet365: base only — full targeting applied at fetch time via data-* attrs.
    return url;
  }
  // Non-Bet365: keep a fully inlined feed (Bookie.Link unused; CTA is static).
  url += `&network=%%PATTERN:AttNw%%`
    + `&campaign=%%PATTERN:AttCmp%%`
    + `&maturity=%%PATTERN:UserMaturity_Weeks%%`
    + `&scope=%%PATTERN:Scope%%`
    + `&competitors=%%PATTERN:FollowedTeams_DBA%%`
    + `&os=%%PATTERN:OS_Type%%`;
  return url;
}

/**
 * Extra attrs on .matches for Bet365 — runtime builds GetPayload query with
 * encodeURIComponent (legacy 1X2 parity).
 * Declared CreativeTemplate var: OS_Type only (optional; User_OS pattern is
 * preferred when the app fills it).
 * Pricing / Top_Order_Logic are baked to ExtraLink defaults (Sponsorship /
 * Popularity). AttNw / AttCmp / maturity / scope come from pattern key-values.
 * Runtime only forwards Scope when it is InList AS / TopList AS — placement
 * labels (GameCenter, News, …) would otherwise miss ExtraLinks and hit the
 * bookie CoFallBack affiliate.
 */
function buildFeedTargetingAttrs(payloadLink) {
  if (!payloadLink) return '';
  return [
    'data-payload-feed="1"',
    'data-os="[%OS_Type%]"',
    // App always sends User_OS; used when OS_Type is unset/unresolved.
    'data-user-os="%%PATTERN:User_OS%%"',
    'data-network="%%PATTERN:AttNw%%"',
    'data-campaign="%%PATTERN:AttCmp%%"',
    'data-price="Sponsorship"',
    'data-order="Popularity"',
    'data-maturity="%%PATTERN:UserMaturity_Weeks%%"',
    'data-scope="%%PATTERN:Scope%%"',
    'data-competitors="%%PATTERN:FollowedTeams_DBA%%"',
  ].join(' ');
}

/** Anchor markup for GAM snippets — Bet365 uses JS click + Bookie.Link (no cta_url). */
function buildAdAnchorInline(payloadLink) {
  if (payloadLink) {
    return {
      ad_href: '#',
      ad_attrs: 'data-payload-link="1" data-click-tracker="%%CLICK_URL_UNESC%%"',
    };
  }
  return {
    ad_href: '%%CLICK_URL_UNESC%%[%cta_url%]',
    ad_attrs: 'data-cta-url="[%cta_url%]"',
  };
}

function isPayloadLinkBmid(bmid) {
  const set = new Set(
    (process.env.PAYLOAD_LINK_BMIDS || process.env.CONTEXT_AWARE_BMIDS || '14')
      .split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite),
  );
  return Number.isFinite(bmid) && set.has(bmid);
}

function stripLegacyBrazilPrefix(text) {
  return (text || '').replace(/^\s*18\+?\s*JOGUE COM RESPONSABILIDADE\.?\s*/i, '').trim();
}

/**
 * Inline bake map — single source of truth shared by creativeBuilder + GAM export.
 * `resolved` = output of resolveText() for translatable paths (optional).
 */
function buildPreviewInlineValues({
  dbaTemplate,
  bookmaker,
  country,
  variant,
  bookieSettings,
  resolved = {},
  feedBaseUrl,
  runtimeUrl,
}) {
  const cfg = dbaTemplate?.config || {};
  const cmsLangId = countryToLangId(country) || 1;
  const isBrazil = country === 'BR';
  const bmid = bookmaker
    ? parseInt(String(bookmaker.id).replace(/^bk_/, ''), 10)
    : null;

  const adBackground = bgCss(cfg);
  const textColor = cfg.text || bookieSettings?.color2 || bookmaker?.secondaryColor || '#FFFFFF';
  const ctaBg = cfg.cta || bookieSettings?.cta_bg_color || '#c71b31';
  const ctaTextColor = cfg.ctaTextColor || bookieSettings?.cta_text_color || invertText(ctaBg);
  const ctaLabel = resolved['config.ctaText'] || cfg.ctaText || 'Bet Now';

  const licenseNumber = variant?.license_number || variant?.licenseNumber || '';
  const brazilDisclaimer =
    stripLegacyBrazilPrefix(resolved['config.legal.text'])
    || stripLegacyBrazilPrefix(cfg.legal?.text)
    || (licenseNumber ? brazilDefaultLegalText(licenseNumber) : BRAZIL_LEGAL_FALLBACK_TEXT);

  const legalEnabled = !!(cfg.legal && cfg.legal.enabled) || isBrazil;
  const disclaimerText = legalEnabled
    ? (isBrazil ? brazilDisclaimer : ((bookieSettings?.disclaimer_text) || '18+ · BeGambleAware.org'))
    : '';
  const disclaimerUrl = legalEnabled
    ? (isBrazil
      ? (bookieSettings?.disclaimer_link || cfg.legal?.url || '')
      : (bookieSettings?.disclaimer_link || cfg.legal?.url || 'https://www.begambleaware.org/'))
    : '';

  const logoUrl = bookmaker ? resolveLogoUrl(bookmaker, cfg) : '';
  const runtime = runtimeUrl
    || process.env.DBA_RUNTIME_URL
    || 'https://cms.365scores.com/dba-runtime.js';

  const feedUrl = Number.isFinite(bmid)
    ? buildFeedUrl({
      country,
      bmid,
      cmsLangId,
      sizeId: dbaTemplate.sizeId,
      feedBaseUrl,
      payloadLink: isPayloadLinkBmid(bmid),
    })
    : '';

  const payloadLink = isPayloadLinkBmid(bmid);
  const anchor = buildAdAnchorInline(payloadLink);
  const feedExtraAttrs = buildFeedTargetingAttrs(payloadLink);

  return {
    bookmaker_name: bookmaker?.name || '',
    bookmaker_logo_url: logoUrl || '',
    ad_background: adBackground,
    ad_font_family: cfg.font ? `'${cfg.font}', Inter, sans-serif` : "'365 Sans', Inter, sans-serif",
    ad_border_radius: `${cfg.radius ?? 8}px`,
    brand_color_1: cfg.bg || bookieSettings?.color1 || bookmaker?.brandColor || '#151E22',
    brand_color_2_or_white: textColor,
    cta_bg_color: ctaBg,
    cta_text_color: ctaTextColor,
    cta_text: ctaLabel,
    disclaimer_layout: legalEnabled ? (isBrazil ? 'legal-band' : 'legal-strip') : 'legal-hidden',
    disclaimer_bg_color: cfg.legal?.bgColor || LEGAL_BAND_BG_DEFAULT,
    legal_text_color: cfg.legal?.color || textColor,
    disclaimer_text: disclaimerText,
    disclaimer_url: disclaimerUrl,
    feed_url: feedUrl,
    feed_extra_attrs: feedExtraAttrs,
    runtime_url: runtime,
    welcome_headline: resolved['config.welcomeOffer.headline'] || cfg.welcomeOffer?.headline || '',
    welcome_subtext: resolved['config.welcomeOffer.subtext'] || cfg.welcomeOffer?.subtext || '',
    welcome_terms: resolved['config.welcomeOffer.terms'] || cfg.welcomeOffer?.terms || '',
    welcome_cta_text: resolved['config.welcomeOffer.ctaText']
      || cfg.welcomeOffer?.ctaText || ctaLabel,
    date_pill_bg: resolveDatePillBg(cfg),
    date_pill_text_color: resolveDatePillFg(cfg),
    odds_box_bg: resolveOddsBoxBg(cfg),
    odds_text_color: resolveOddsTextColor(cfg),
    card_bg: resolveCardBg(cfg),
    ad_href: anchor.ad_href,
    ad_attrs: anchor.ad_attrs,
  };
}

/** Merge market bake over template-config defaults (empty strings don't wipe defaults). */
function mergeInlineValues(dbaTemplate, marketInline) {
  const base = buildPreviewInlineValues({ dbaTemplate, country: dbaTemplate.countries?.[0] || 'GLOBAL' });
  const merged = { ...base };
  if (marketInline && typeof marketInline === 'object') {
    for (const [k, v] of Object.entries(marketInline)) {
      if (v != null && String(v).trim() !== '') merged[k] = String(v);
    }
  }
  return merged;
}

/** Fields the CMS preview configures that must appear literally in the baked snippet. */
const BAKE_CHECKS = [
  { key: 'ad_background', label: 'Background', cssProp: 'background' },
  { key: 'ad_font_family', label: 'Font family', cssProp: 'font' },
  { key: 'ad_border_radius', label: 'Border radius', cssProp: 'radius' },
  { key: 'brand_color_2_or_white', label: 'Text color', cssProp: 'color' },
  { key: 'cta_bg_color', label: 'CTA background', cssProp: 'cta-bg' },
  { key: 'cta_text_color', label: 'CTA text color', cssProp: 'cta-color' },
  { key: 'cta_text', label: 'CTA label', cssProp: 'cta-text' },
  { key: 'disclaimer_bg_color', label: 'Legal band background', cssProp: 'legal-bg' },
  { key: 'legal_text_color', label: 'Legal text color', cssProp: 'legal-color' },
  { key: 'disclaimer_text', label: 'Legal text', cssProp: 'legal-text' },
  { key: 'feed_url', label: 'Games feed URL', cssProp: 'feed' },
  { label: 'Match carousel runtime', cssProp: 'runtime' },
];

function validateBakedSnippet(snippet, inline) {
  const issues = [];
  const checks = [];

  for (const check of BAKE_CHECKS) {
    const { key, label, cssProp } = check;
    const expected = key ? inline[key] : null;
    let ok = false;
    if (cssProp === 'runtime') {
      ok = snippet.includes('DbaRenderMatches') && snippet.includes('data-sample-b64') && snippet.includes('dba-dots');
      checks.push({ key: 'runtime', label, expected: 'inlined in snippet', ok });
      if (!ok) issues.push(`${label} missing — snippet must inline dba-runtime.js + sample matches`);
      continue;
    }
    if (expected == null || String(expected).trim() === '') {
      ok = cssProp === 'legal-text' && inline.disclaimer_layout === 'legal-hidden';
    } else if (cssProp === 'background') {
      ok = snippet.includes(String(expected));
    } else if (cssProp === 'font') {
      ok = snippet.includes(`font-family: ${expected}`) || snippet.includes(`font-family:${expected}`);
    } else if (cssProp === 'radius') {
      ok = snippet.includes(`border-radius: ${expected}`) || snippet.includes(`border-radius:${expected}`);
    } else if (cssProp === 'color') {
      ok = snippet.includes(`color: ${expected}`) || snippet.includes(`color:${expected}`);
    } else if (cssProp === 'cta-bg') {
      ok = snippet.includes(`background: ${expected}`) && snippet.includes('.cta');
    } else if (cssProp === 'cta-color') {
      ok = snippet.includes(`.cta`) && snippet.includes(String(expected));
    } else if (cssProp === 'cta-text') {
      ok = snippet.includes(`>${expected}<`) || snippet.includes(`>${expected.replace(/&/g, '&amp;')}<`);
    } else if (cssProp === 'legal-bg') {
      ok = snippet.includes(String(expected)) || inline.disclaimer_layout === 'legal-hidden';
    } else if (cssProp === 'legal-color') {
      ok = snippet.includes(String(expected)) || inline.disclaimer_layout === 'legal-hidden';
    } else if (cssProp === 'legal-text') {
      ok = snippet.includes(String(expected).slice(0, 24)) || inline.disclaimer_layout === 'legal-hidden';
    } else if (cssProp === 'feed') {
      ok = snippet.includes(String(expected));
    }
    checks.push({ key, label, expected: expected || '(empty)', ok });
    if (!ok && expected && String(expected).trim()) {
      issues.push(`${label} not found in snippet (expected: ${String(expected).slice(0, 60)}…)`);
    }
  }

  const leaked = [];
  const re = /\[\[([a-z_0-9]+)\]\]/gi;
  let m;
  while ((m = re.exec(snippet))) leaked.push(m[1]);
  if (leaked.length) {
    issues.push(`Unbaked placeholders remain: ${[...new Set(leaked)].join(', ')}`);
  }

  return { ok: issues.length === 0, issues, checks };
}

async function validateFeedUrl(feedUrl, { timeoutMs = 8000 } = {}) {
  if (!feedUrl) return { ok: false, error: 'feed_url is empty', gameCount: 0 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(feedUrl, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, gameCount: 0, feedUrl };
    if (text.trim() === 'No Games') {
      return { ok: false, error: 'API returned "No Games" — check cid/bmid/lang/placment', gameCount: 0, feedUrl };
    }
    let data;
    try { data = JSON.parse(text); } catch {
      return { ok: false, error: 'Response is not JSON', gameCount: 0, feedUrl };
    }
    const games = Array.isArray(data.Games) ? data.Games : [];
    return {
      ok: games.length > 0,
      gameCount: games.length,
      feedUrl,
      error: games.length ? null : 'JSON parsed but Games array is empty',
      sampleGame: games[0]?.Comps?.map((c) => c.Name).join(' vs ') || null,
    };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Feed request timed out' : err.message, gameCount: 0, feedUrl };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  CID_FOR_COUNTRY,
  buildFeedUrl,
  buildFeedTargetingAttrs,
  buildAdAnchorInline,
  isPayloadLinkBmid,
  feedLangForCountry,
  buildPreviewInlineValues,
  mergeInlineValues,
  validateBakedSnippet,
  validateFeedUrl,
};
