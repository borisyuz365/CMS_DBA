// Build a per-market Creative JSON payload for GAM from a DBA template +
// market context (bookmaker × country).
//
// One DBA template emits N Creatives — one per (template.bookmakerId, country).
// Each Creative supplies values for the variables declared by the template's
// CreativeTemplate.
//
// Phase 1: dry-run only. The caller (route) gathers the inputs and we map them
// into the GAM Creative shape.
const dictionaryStorage = require('../utils/dictionaryStorage');
const { countryToLangId, getByPath, TRANSLATABLE_PATHS, termIdPathFor } =
  require('../routes/_dbaLang');
const { resolveTerm, findTerm } = require('../routes/_dbaTerms');
const { brazilDefaultLegalText, BRAZIL_LEGAL_FALLBACK_TEXT } = require('../utils/brazilLegal');
const { INLINE_VARIABLE_NAMES } = require('./templateBuilder');

// Pull a translated value for a given field path. If the template has a
// *TermId reference at that path, resolve it for the requested language.
// Otherwise fall back to the canonical text on the template.
function resolveText(dbaTemplate, path, langId, terms) {
  const canonical = getByPath(dbaTemplate, path);
  const termId = getByPath(dbaTemplate, termIdPathFor(path));
  if (termId) {
    const term = findTerm(terms, termId);
    if (term) {
      const value = resolveTerm(term, langId);
      if (value != null) return value;
    }
  }
  return canonical;
}

// bmids whose affiliate URL is resolved at click time by /api/dba/links/click.
// Today only Bet365 (14); env override mirrors backend/routes/dbaLinks.js.
const CONTEXT_AWARE_BMIDS = new Set(
  (process.env.CONTEXT_AWARE_BMIDS || '14')
    .split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite),
);

// CMS country codes (BR, AR, …) are ISO; the link resolver wants the numeric
// CID from the BettingAdsService world. Mirrors what the seeded Sheets data
// shows in dba_ads_settings.
const CID_FOR_COUNTRY = {
  AR: 10, BR: 21, CL: 28, CO: 109, EC: 51, MX: 31, PE: 112, PL: 37,
  DE: 25, ES: 36, IT: 27, UK: 17, US: 8, AU: 90, CA: 76, GLOBAL: 0,
};

// Build the redirect URL the GAM Creative emits for click-time-resolved
// bookmakers. `%%PLATFORM%%` is a placeholder for whatever the publisher /
// AdsGeneratorService can inject at serve time (or 'all' fallback).
function buildRedirectUrl({ baseUrl, bmid, country, languageId, sizeId }) {
  const cid = CID_FOR_COUNTRY[country];
  const params = new URLSearchParams();
  params.set('bmid', String(bmid));
  if (cid != null) params.set('cid', String(cid));
  if (languageId) params.set('lang', String(languageId));
  if (sizeId) params.set('format', sizeId);
  // Platform left unfilled so publishers can append &platform=android etc;
  // a missing platform resolves to the 'all' row in the link table.
  return `${baseUrl}/api/dba/links/click?${params.toString()}`;
}

// Rewrite a Cloudinary BookMakers/<id> URL to its NoBG sibling.
//   /BookMakers/14            → /BookMakers/NoBG/14
//   /BookMakers/NoBG/14       → unchanged (idempotent)
//   anything else             → returned as-is
// The match is anchored to a Cloudinary host so we don't accidentally rewrite
// a brand-supplied direct URL.
function toNoBgBookmakerLogo(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.indexOf('res.cloudinary.com') === -1) return url;
  return url.replace(/(\/BookMakers\/)(?!NoBG\/)/, '$1NoBG/');
}

// Convert a CMS size id ("300x250") into GAM's Size shape.
function sizeFor(sizeId) {
  if (!sizeId) return null;
  const [w, h] = sizeId.split('x').map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { width: w, height: h, isAspectRatio: false };
}

// Build the per-market Creative payload.
//
// dbaTemplate    full template object (config + translations decorated)
// bookmaker      from dba_bookmakers (id, name, brandColor, defaultLogoImageUrl, …)
// country        country_code ('BR', 'AR', …)
// variant        from dba_bookmaker_variants (affiliate URL, status, modified, …) or null
// bookieSettings from dba_bookie_settings keyed by bmid (cta_bg_color, …) or null
// previousId     existing gam_creative_id, when known (for UPDATE-vs-CREATE hint)
function buildCreative({ dbaTemplate, bookmaker, country, variant, bookieSettings, previousId, feedBaseUrl, linkBaseUrl, runtimeUrl }) {
  if (!dbaTemplate) throw new Error('dbaTemplate required');
  if (!bookmaker)   throw new Error('bookmaker required');
  if (!country)     throw new Error('country required');

  const langId = countryToLangId(country) || 1;
  const terms = dictionaryStorage.readTerms();

  // Resolve all translatable fields for the target language.
  const resolved = {};
  for (const p of TRANSLATABLE_PATHS) {
    resolved[p] = resolveText(dbaTemplate, p, langId, terms);
  }

  // Bookmaker brand colors come from either dba_bookmakers (frontend table) or
  // dba_bookie_settings (sheet mirror). Prefer the sheet values when present.
  const brandColor1 = (bookieSettings && bookieSettings.color1) || bookmaker.brandColor || '#0d5240';
  const brandColor2 = (bookieSettings && bookieSettings.color2) || bookmaker.secondaryColor || '#FFFFFF';
  const ctaBg       = (bookieSettings && bookieSettings.cta_bg_color)    || dbaTemplate.config?.cta || brandColor2;
  const ctaText     = (bookieSettings && bookieSettings.cta_text_color)  || dbaTemplate.config?.ctaTextColor || '#FFFFFF';
  // Prefer the NoBG variant of the bookmaker logo when the URL points at the
  // standard Cloudinary BookMakers/<id> path — the templates render the logo
  // over a coloured/gradient `.ad` background where a transparent crest reads
  // significantly cleaner than the framed thumbnail. Non-standard URLs (e.g.
  // brand-supplied direct asset hosts) pass through unchanged.
  const logoUrl     = toNoBgBookmakerLogo(bookmaker.defaultLogoImageUrl);

  // bmid extracted from "bk_<N>" — needed below for both Bet365 dispatch and
  // the feed URL.
  const bmid = parseInt(String(bookmaker.id).replace(/^bk_/, ''), 10);
  const useContextLink = Number.isFinite(bmid) && CONTEXT_AWARE_BMIDS.has(bmid);

  // For context-aware bookmakers (Bet365), the variant.affiliate field is
  // stale-by-design — the link is resolved at click time. Emit a redirect URL
  // pointing at our /api/dba/links/click endpoint so monthly external updates
  // propagate without re-publishing to GAM.
  const affiliate = useContextLink
    ? buildRedirectUrl({
        baseUrl: linkBaseUrl || feedBaseUrl || 'https://cms.365scores.com',
        bmid, country, languageId: langId, sizeId: dbaTemplate.sizeId,
      })
    : ((variant && variant.affiliate) || dbaTemplate.config?.affiliate?.url || '');

  // Feed URL: the live AdsGenerator endpoint for this (country, bookmaker).
  // Caller can supply the base; default to the public host. bmid was computed
  // above for the context-link dispatch.
  //
  // /GetPayload contract (AdsGeneratorService/app/main.py:createPayload):
  //   - cid       NUMERIC country id (BR=21, not "BR"). Use CID_FOR_COUNTRY.
  //   - bmid      numeric bookmaker id
  //   - lang      numeric language id; OVERRIDDEN by the endpoint for BR (→31)
  //               and Latin America (→29). We still send it so non-overridden
  //               countries get the right language.
  //   - placment  string label (typo intentional) — defaults to "Interstitial"
  //               when missing. Map our sizeId to the right value so the
  //               returned payload is labeled correctly downstream.
  //   - `size` is NOT a /GetPayload param — silently ignored. Don't send it.
  //
  // Falls back to the raw country code only when CID_FOR_COUNTRY has no entry
  // (validation flags this case).
  const base = feedBaseUrl || 'https://bettingads.365scores.com';
  const cidNumeric = CID_FOR_COUNTRY[country];
  const cidParam = cidNumeric != null ? cidNumeric : country;
  const placment = ({ '300x250': 'MPU', '320x50': 'Banner', '640x1280': 'Interstitial' })[dbaTemplate.sizeId] || 'Interstitial';
  const feedUrl = `${base}/GetPayload?cid=${encodeURIComponent(cidParam)}&bmid=${bmid}&lang=${langId}&placment=${placment}`;

  // Runtime URL: defaults to the env-configured DBAManagementService host.
  // The script renders match cards into the `.matches[data-feed]` node.
  const runtime = runtimeUrl
    || process.env.DBA_RUNTIME_URL
    || `${(linkBaseUrl || feedBaseUrl || 'https://cms.365scores.com')}/dba-runtime.js`;

  // Brazil SPA/MF: disclaimer comes from template legal text (or default with
  // the bookmaker BR license number) and uses the ~10% legal-band layout.
  const isBrazil = country === 'BR';
  const licenseNumber = (variant && (variant.license_number || variant.licenseNumber)) || '';
  const stripLegacyBrazilPrefix = (text) => (text || '')
    .replace(/^\s*18\+?\s*JOGUE COM RESPONSABILIDADE\.?\s*/i, '')
    .trim();
  const brazilDisclaimer =
    stripLegacyBrazilPrefix(resolved['config.legal.text'])
    || stripLegacyBrazilPrefix(dbaTemplate.config?.legal?.text)
    || (licenseNumber ? brazilDefaultLegalText(licenseNumber) : BRAZIL_LEGAL_FALLBACK_TEXT);
  const disclaimerText = isBrazil
    ? brazilDisclaimer
    : ((bookieSettings && bookieSettings.disclaimer_text) || '18+ · BeGambleAware.org');
  const disclaimerUrl = isBrazil
    ? ((bookieSettings && bookieSettings.disclaimer_link) || '')
    : ((bookieSettings && bookieSettings.disclaimer_link) || 'https://www.begambleaware.org/');
  const disclaimerLayout = isBrazil ? 'legal-band' : 'legal-strip';

  // Full resolved map (includes values that are baked into the HTML snippet).
  const allVariableValues = [
    { uniqueName: 'bookmaker_name',         value: bookmaker.name },
    { uniqueName: 'bookmaker_logo_url',     value: logoUrl },
    { uniqueName: 'brand_color_1',          value: brandColor1 },
    { uniqueName: 'brand_color_2_or_white', value: brandColor2 },
    { uniqueName: 'cta_bg_color',           value: ctaBg },
    { uniqueName: 'cta_text_color',         value: ctaText },
    { uniqueName: 'cta_text',               value: resolved['config.ctaText'] || dbaTemplate.config?.ctaText || 'Bet Now' },
    { uniqueName: 'cta_url',                value: affiliate },
    { uniqueName: 'disclaimer_text',        value: disclaimerText },
    { uniqueName: 'disclaimer_url',         value: disclaimerUrl },
    { uniqueName: 'disclaimer_layout',      value: disclaimerLayout },
    { uniqueName: 'feed_url',               value: feedUrl },
    { uniqueName: 'runtime_url',            value: runtime },
    // Welcome-offer variables, only set when the template uses them.
    { uniqueName: 'welcome_headline',       value: resolved['config.welcomeOffer.headline'] || '' },
    { uniqueName: 'welcome_subtext',        value: resolved['config.welcomeOffer.subtext']  || '' },
    { uniqueName: 'welcome_terms',          value: resolved['config.welcomeOffer.terms']    || '' },
    { uniqueName: 'welcome_cta_text',       value: resolved['config.welcomeOffer.ctaText']
      || resolved['config.ctaText'] || dbaTemplate.config?.ctaText || 'Bet Now' },
  ];
  // Only values that remain real GAM CreativeTemplate variables.
  const variables = allVariableValues.filter((v) => !INLINE_VARIABLE_NAMES.has(v.uniqueName));
  const inlineValues = Object.fromEntries(
    allVariableValues
      .filter((v) => INLINE_VARIABLE_NAMES.has(v.uniqueName))
      .map((v) => [v.uniqueName, v.value]),
  );

  // Surface validation hits so the dry-run can flag missing fields without
  // throwing — easier to spot N issues at once than fix-and-retry.
  const validation = [];
  if (!logoUrl)   validation.push('bookmaker_logo_url is empty');
  if (!affiliate) validation.push('cta_url (affiliate) is empty for this (bookmaker, country) pair');
  if (!resolved['config.ctaText']) validation.push('cta_text has no translation for this country language');
  if (cidNumeric == null) validation.push(`feed_url cid falls back to country code "${country}" — no entry in CID_FOR_COUNTRY; AdsGeneratorService expects a numeric cid (e.g. BR→21)`);
  if (useContextLink) {
    validation.push(`cta_url is a click-time redirect (bmid=${bmid} is context-aware via /api/dba/links/click; actual URL resolved against the external link table per impression)`);
  }

  return {
    operation: previousId ? 'UPDATE' : 'CREATE',
    id: previousId || null,
    name: `${bookmaker.name} · ${country} · ${dbaTemplate.name}`,
    size: sizeFor(dbaTemplate.sizeId),
    creativeTemplateId: dbaTemplate.gam_creative_template_id || null,
    creativeTemplateIdPending: !dbaTemplate.gam_creative_template_id,
    market: { country, bookmakerId: bookmaker.id, languageId: langId },
    creativeTemplateVariableValues: variables,
    inlineValues,
    validation,
  };
}

module.exports = { buildCreative, sizeFor, toNoBgBookmakerLogo };
