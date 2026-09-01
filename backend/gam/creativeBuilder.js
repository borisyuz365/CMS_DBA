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

// bmids whose live affiliate URL comes from AdsGenerator GetPayload
// (Bookie.Link via LinksManager) — option B: no cta_url; OS_Type + JS click.
// Today only Bet365 (14).
const PAYLOAD_LINK_BMIDS = new Set(
  (process.env.PAYLOAD_LINK_BMIDS || process.env.CONTEXT_AWARE_BMIDS || '14')
    .split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite),
);

// CMS country codes (BR, AR, …) → numeric CID for /GetPayload.
const CID_FOR_COUNTRY_REEXPORT = CID_FOR_COUNTRY;
void CID_FOR_COUNTRY_REEXPORT;

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
  const usePayloadLink = Number.isFinite(bmid) && PAYLOAD_LINK_BMIDS.has(bmid);

  // Bet365 (payload-link): no baked cta_url — live URL is Bookie.Link from
  // GetPayload; dba-runtime opens %%CLICK_URL%% + encodeURIComponent(link) on click.
  // Other bookmakers: CMS variant (or template) affiliate as [%cta_url%].
  const affiliate = usePayloadLink
    ? ''
    : ((variant && variant.affiliate) || dbaTemplate.config?.affiliate?.url || '');

  void linkBaseUrl;

  // Full resolved map (includes values that are baked into the HTML snippet).
  const allVariableValues = [
    ...Object.entries(previewInline).map(([uniqueName, value]) => ({ uniqueName, value })),
  ];
  if (!usePayloadLink) {
    allVariableValues.push({ uniqueName: 'cta_url', value: affiliate });
  }
  // Only values that remain real GAM CreativeTemplate variables.
  // Bet365: OS_Type is filled by AdOps in GAM (not baked here).
  const variables = allVariableValues.filter((v) => !INLINE_VARIABLE_NAMES.has(v.uniqueName));
  const inlineValues = Object.fromEntries(
    allVariableValues
      .filter((v) => INLINE_VARIABLE_NAMES.has(v.uniqueName))
      .map((v) => [v.uniqueName, v.value]),
  );
  // Ensure ad_href / ad_attrs / feed_url from previewInline are in inlineValues
  Object.assign(inlineValues, {
    ad_href: previewInline.ad_href,
    ad_attrs: previewInline.ad_attrs,
    feed_url: previewInline.feed_url,
    feed_extra_attrs: previewInline.feed_extra_attrs,
  });

  const validation = [];
  if (!logoUrl)   validation.push('bookmaker_logo_url is empty');
  if (!usePayloadLink && !affiliate) validation.push('cta_url (affiliate) is empty for this (bookmaker, country) pair');
  if (!resolved['config.ctaText']) validation.push('cta_text has no translation for this country language');
  if (cidNumeric == null) validation.push(`feed_url cid falls back to country code "${country}" — no entry in CID_FOR_COUNTRY; AdsGeneratorService expects a numeric cid (e.g. BR→21)`);
  if (usePayloadLink) {
    validation.push(`Bet365 payload-link: OS_Type and/or User_OS; Pricing/Ordering baked (Sponsorship/Popularity); AttNw/AttCmp/maturity via GAM patterns; Scope only InList/TopList AS; live CTA from GetPayload Bookie.Link`);
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
