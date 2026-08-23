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
const { INLINE_VARIABLE_NAMES } = require('./templateBuilder');
const { buildPreviewInlineValues, CID_FOR_COUNTRY } = require('./previewAlign');
const { normalizeSizeId } = require('../utils/dbaSizes');

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

// CMS country codes (BR, AR, …) → numeric CID for /GetPayload and link resolver.
// Re-exported via previewAlign.js — kept here for validation messages.
const CID_FOR_COUNTRY_REEXPORT = CID_FOR_COUNTRY;

// Build the redirect URL the GAM Creative emits for click-time-resolved
// bookmakers. `%%PLATFORM%%` is a placeholder for whatever the publisher /
// AdsGeneratorService can inject at serve time (or 'all' fallback).
function buildRedirectUrl({ baseUrl, bmid, country, languageId, sizeId }) {
  const cid = CID_FOR_COUNTRY_REEXPORT[country];
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
  const normalized = normalizeSizeId(sizeId);
  const [w, h] = normalized.split('x').map(Number);
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

  // Template editor colors + legal + logo — shared with GAM export (previewAlign).
  const previewInline = buildPreviewInlineValues({
    dbaTemplate,
    bookmaker,
    country,
    variant,
    bookieSettings,
    resolved,
    feedBaseUrl,
    runtimeUrl,
  });

  const logoUrl = previewInline.bookmaker_logo_url;
  const cidNumeric = CID_FOR_COUNTRY[country];

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
        bmid, country, languageId: langId, sizeId: normalizeSizeId(dbaTemplate.sizeId),
      })
    : ((variant && variant.affiliate) || dbaTemplate.config?.affiliate?.url || '');

  // Full resolved map (includes values that are baked into the HTML snippet).
  const allVariableValues = [
    ...Object.entries(previewInline).map(([uniqueName, value]) => ({ uniqueName, value })),
    { uniqueName: 'cta_url', value: affiliate },
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
