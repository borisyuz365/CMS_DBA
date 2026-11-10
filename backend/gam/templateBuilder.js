// Build a Google Ad Manager CreativeTemplate JSON payload from a dba_templates
// row. Phase 1: read-only — no GAM API calls. The output mirrors GAM's
// CreativeTemplate schema (https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate).
//
// Layout flags (welcome-offer enabled, banner-vs-MPU, etc.) decide which HTML
// file is loaded. Branding / feed / disclaimer text+layout macros are BAKED into the
// snippet at export time (per market). Only cta_url remains a GAM variable.
const fs = require('fs');
const path = require('path');
const { mergeInlineValues, validateBakedSnippet, validateFeedUrl } = require('./previewAlign');
const { isInterstitialSize } = require('../utils/dbaSizes');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Maps sizeId → layout HTML. Welcome offer is NOT a separate file — when
// enabled it is baked onto `.matches` as data-welcome-* and dba-runtime
// prepends it as carousel slide 0 (same chrome + match carousel as standard).
// Legacy *-welcome.html files are kept for reference only.
function templateFileFor(dbaTemplate) {
  const kind = dbaTemplate.kind || dbaTemplate.config?.kind;
  if (kind === '3bm') return '3bm-mpu.html';
  const sizeId = dbaTemplate.sizeId;
  const map = {
    '300x250':  'mpu-standard.html',
    '320x480':  'interstitial-standard.html',
    '640x1280': 'interstitial-standard.html',
    '320x50':   'banner.html',
  };
  return map[sizeId] || null;
}

// Macros that are resolved into the HTML snippet when exporting to GAM —
// NOT declared as CreativeTemplate variables.
// Remaining GAM vars: cta_url (static BMs) or OS_Type (Bet365 / payload-link).
const INLINE_VARIABLE_NAMES = new Set([
  'bookmaker_logo_url',
  'bookmaker_name',
  'ad_background',
  'ad_font_family',
  'ad_border_radius',
  'brand_color_1',
  'brand_color_2_or_white',
  'cta_bg_color',
  'cta_text',
  'cta_text_color',
  'disclaimer_layout',
  'disclaimer_bg_color',
  'legal_text_color',
  'disclaimer_text',
  'disclaimer_url',
  'feed_url',
  'feed_extra_attrs',
  'welcome_data_attrs',
  'runtime_url',
  'welcome_headline',
  'welcome_subtext',
  'welcome_terms',
  'welcome_cta_text',
  'welcome_pill_text',
  'welcome_pill_bg',
  'welcome_pill_text_color',
  'date_pill_bg',
  'date_pill_text_color',
  'odds_box_bg',
  'odds_text_color',
  'card_bg',
  'ad_href',
  'ad_attrs',
  'sections_html',
  'root_attrs',
]);

// Full authoring macro set (HTML template files use [[name]] for baked fields;
// only cta_url stays as GAM's [%cta_url%] syntax).
// type:
//   STRING  — single-line text (default)
//   URL     — HTTP/HTTPS URL with validation
const ALL_VARIABLE_SCHEMA = [
  { uniqueName: 'bookmaker_name',         label: 'Bookmaker name',      description: 'Display name of the bookmaker (Bet365, Betano, …)',          type: 'STRING', isRequired: true },
  { uniqueName: 'bookmaker_logo_url',     label: 'Bookmaker logo URL',  description: 'Full CDN URL to the bookmaker logo image',                   type: 'URL',    isRequired: true },
  { uniqueName: 'ad_background',          label: 'Ad background',       description: 'CSS background from template editor (solid, gradient, or image)', type: 'STRING', isRequired: true },
  { uniqueName: 'ad_font_family',         label: 'Font family',         description: 'Font stack from template editor',                            type: 'STRING', isRequired: false },
  { uniqueName: 'ad_border_radius',       label: 'Border radius',       description: 'Corner radius from template editor',                         type: 'STRING', isRequired: false },
  { uniqueName: 'brand_color_1',          label: 'Brand color 1',       description: 'Primary brand color, hex e.g. #0d5240',                      type: 'STRING', isRequired: true },
  { uniqueName: 'brand_color_2_or_white', label: 'Brand color 2 / text',description: 'Secondary brand color or white for legibility, hex',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_bg_color',           label: 'CTA background color',description: 'CTA button background, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text_color',         label: 'CTA text color',      description: 'CTA button text color, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text',               label: 'CTA text',            description: 'Translated CTA button label for the target country',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_url',                label: 'CTA / affiliate URL', description: 'Static affiliate landing URL (non-Bet365 bookmakers)',       type: 'URL',    isRequired: true },
  { uniqueName: 'OS_Type',                label: 'OS Type',             description: 'Device OS for GetPayload/LinksManager (android / ios). Required for Bet365.', type: 'STRING', isRequired: true },
  { uniqueName: 'Bypass',                 label: 'Bypass',              description: 'Hidden AdOps bypass token (3-bookie MPU and legacy creatives).', type: 'STRING', isRequired: false },
  { uniqueName: 'disclaimer_text',        label: 'Legal disclaimer',    description: 'Responsible-gaming text shown in the footer (Brazil: full SPA/MF copy)', type: 'STRING', isRequired: false },
  { uniqueName: 'disclaimer_url',         label: 'Disclaimer URL',      description: 'Link target for the legal disclaimer',                       type: 'URL',    isRequired: false },
  { uniqueName: 'disclaimer_layout',      label: 'Disclaimer layout',   description: 'CSS class: legal-band (~10% Brazil) or legal-strip (default)', type: 'STRING', isRequired: false },
  { uniqueName: 'disclaimer_bg_color',    label: 'Disclaimer background', description: 'Legal band background color (hex or rgba)',                  type: 'STRING', isRequired: false },
  { uniqueName: 'legal_text_color',       label: 'Legal text color',    description: 'Legal footer text color from template editor',               type: 'STRING', isRequired: false },
  { uniqueName: 'feed_url',               label: 'Match feed URL',      description: 'AdsGeneratorService endpoint for live match data',           type: 'URL',    isRequired: true },
  { uniqueName: 'runtime_url',            label: 'DBA runtime URL',     description: 'Script URL that renders match cards into the creative (served by DBAManagementService at /dba-runtime.js)', type: 'URL', isRequired: true },
  // Welcome-offer fields — only required when the loaded template HTML uses them.
  { uniqueName: 'welcome_headline',       label: 'Welcome offer headline', description: 'Translated headline on the welcome slide',                type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_subtext',        label: 'Welcome offer subtext',  description: 'Translated supporting copy on the welcome slide',         type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_terms',          label: 'Welcome offer terms',    description: 'Translated terms / fine-print on the welcome slide',      type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_cta_text',       label: 'Welcome offer CTA text', description: 'Translated CTA on the welcome slide (overrides cta_text)',type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_pill_text',      label: 'Welcome offer pill text', description: 'Label inside the welcome offer pill',                    type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_pill_bg',        label: 'Welcome offer pill fill', description: 'Background color of the welcome offer pill',            type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_pill_text_color', label: 'Welcome offer pill text color', description: 'Text color of the welcome offer pill',           type: 'STRING', isRequired: false },
  { uniqueName: 'date_pill_bg',           label: 'Date pill fill',     description: 'Background of the date/time pill (transparent when fill is off)', type: 'STRING', isRequired: false },
  { uniqueName: 'date_pill_text_color',   label: 'Date pill text',     description: 'Date/time pill text color', type: 'STRING', isRequired: false },
  { uniqueName: 'odds_box_bg',            label: 'Odds box fill',      description: 'Background of the 1/X/2 odds boxes on interstitial cards (hex or rgba)', type: 'STRING', isRequired: false },
  { uniqueName: 'odds_text_color',        label: 'Odds text color',   description: 'Text color of the 1/X/2 odds numbers on interstitial cards', type: 'STRING', isRequired: false },
  { uniqueName: 'card_bg',                label: 'Game card fill',     description: 'Background of each match card on interstitial (hex or rgba)', type: 'STRING', isRequired: false },
];

// Variables actually declared on the GAM CreativeTemplate depend on bookmaker:
//   Bet365 (payload-link): OS_Type only (Pricing/ordering baked; AttNw/AttCmp via patterns)
//   Others: cta_url only
const CTA_URL_VAR = ALL_VARIABLE_SCHEMA.find((v) => v.uniqueName === 'cta_url');
const OS_TYPE_VAR = ALL_VARIABLE_SCHEMA.find((v) => v.uniqueName === 'OS_Type');
const BYPASS_VAR = ALL_VARIABLE_SCHEMA.find((v) => v.uniqueName === 'Bypass');
const VARIABLE_SCHEMA = [CTA_URL_VAR].filter(Boolean);

function variableSchemaFor({ payloadLink, kind } = {}) {
  // 3BM: affiliates are baked per section (or Bet365 via ExtraLinks). Always
  // declare Bypass (hidden AdOps token in the HTML). When any section is
  // Bet365, also OS_Type — never bet365_cta_url.
  if (kind === '3bm') {
    const vars = [BYPASS_VAR];
    if (payloadLink) vars.push(OS_TYPE_VAR);
    return vars.filter(Boolean);
  }
  if (payloadLink) return [OS_TYPE_VAR].filter(Boolean);
  return [CTA_URL_VAR].filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Replace [[name]] bake placeholders (and legacy [%name%] if any remain).
// Text-ish fields are HTML-escaped; URL/color macros are inserted raw.
const RAW_INLINE_NAMES = new Set([
  'bookmaker_logo_url',
  'ad_background',
  'ad_font_family',
  'ad_border_radius',
  'brand_color_1',
  'brand_color_2_or_white',
  'cta_bg_color',
  'cta_text_color',
  'disclaimer_layout',
  'disclaimer_bg_color',
  'legal_text_color',
  'disclaimer_url',
  'feed_url',
  'feed_extra_attrs',
  'welcome_data_attrs',
  'runtime_url',
  'date_pill_bg',
  'date_pill_text_color',
  'odds_box_bg',
  'odds_text_color',
  'card_bg',
  'ad_href',
  'ad_attrs',
  'sections_html',
  'root_attrs',
]);

function applyInlineValues(snippet, inlineValues) {
  // Always resolve every INLINE macro so bake placeholders never leak into the
  // exported GAM snippet as [%…%] (GAM validates every [%name%] as a variable).
  const values = {};
  for (const name of INLINE_VARIABLE_NAMES) values[name] = '';
  if (inlineValues && typeof inlineValues === 'object') {
    for (const [name, raw] of Object.entries(inlineValues)) {
      if (INLINE_VARIABLE_NAMES.has(name)) values[name] = raw == null ? '' : String(raw);
    }
  }
  let out = snippet;
  for (const [name, value] of Object.entries(values)) {
    const inserted = RAW_INLINE_NAMES.has(name) ? value : escapeHtml(value);
    out = out.split(`[[${name}]]`).join(inserted);
    // Legacy source files that still use [%name%] for baked fields.
    out = out.split(`[%${name}%]`).join(inserted);
  }
  return out;
}

/** @deprecated use mergeInlineValues from previewAlign.js */
function fallbackInlineFromTemplate(dbaTemplate) {
  const { buildPreviewInlineValues } = require('./previewAlign');
  return buildPreviewInlineValues({
    dbaTemplate,
    country: dbaTemplate.countries?.[0] || 'GLOBAL',
  });
}

/** Macros still present in a snippet after inlining (for UI / validation). */
function remainingMacros(snippet) {
  const found = new Set();
  const re = /\[%([a-z0-9_]+)%\]/gi;
  let m;
  while ((m = re.exec(snippet))) found.add(m[1]);
  return [...found];
}

// Sample matches for GAM preview when the live feed cannot be fetched
// (SafeFrame / blocked host). Kickoffs are generated relative to "now" so
// baked creatives never ship hard-coded past dates.
function buildSampleMatchFeed(now = new Date()) {
  const teams = [
    { home: { id: 7766, name: 'Peñarol' }, away: { id: 1267, name: 'Corinthians' }, odds: ['2.62', '3.30', '2.62'] },
    { home: { id: 1269, name: 'Mirassol' }, away: { id: 1216, name: 'Fluminense' }, odds: ['2.65', '3.10', '2.55'] },
    { home: { id: 1273, name: 'RB Bragantino' }, away: { id: 1228, name: 'Ponte Preta' }, odds: ['1.62', '3.80', '5.25'] },
    { home: { id: 1224, name: 'Santos' }, away: { id: 1212, name: 'Coritiba' }, odds: ['1.66', '3.60', '5.25'] },
  ];
  const matches = teams.map((t, i) => {
    const kickoff = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    kickoff.setHours(15 + (i % 3), 30, 0, 0);
    const dd = String(kickoff.getDate()).padStart(2, '0');
    const mm = String(kickoff.getMonth() + 1).padStart(2, '0');
    const hh = String(kickoff.getHours()).padStart(2, '0');
    const mi = String(kickoff.getMinutes()).padStart(2, '0');
    return {
      ...t,
      ISOStartTime: kickoff.toISOString(),
      date: `${dd}/${mm} · ${hh}:${mi}`,
    };
  });
  return { matches };
}

const DEFAULT_RUNTIME_URL = process.env.DBA_RUNTIME_URL || 'https://cms.365scores.com/dba-runtime.js';

/** Read dba-runtime.js and wrap for safe inline embedding in GAM HTML. */
function inlinedRuntimeScriptTag() {
  const runtimePath = path.join(TEMPLATES_DIR, 'dba-runtime.js');
  let code = fs.readFileSync(runtimePath, 'utf8');
  code = code.replace(/<\/script/gi, '<\\/script');
  return `<script>\n${code}\n</script>`;
}

/** Parse /GetPayload — JSON object or plain-text "No Games". */
const FEED_PARSE_FN = `
function __dbaParseFeed(r) {
  if (!r || !r.ok) return Promise.resolve(null);
  return r.text().then(function (t) {
    if (!t || String(t).trim() === 'No Games') return null;
    try { return JSON.parse(t); } catch (e) { return null; }
  });
}`;

/**
 * GAM preview: inline runtime at body end (external cms.365scores.com/dba-runtime.js
 * currently serves SPA HTML, not JS), paint embedded sample, then fetch live feed.
 */
function gamBootstrapScripts() {
  return [
    '<script>window.__DBA_SKIP_AUTORENDER=true;</script>',
    inlinedRuntimeScriptTag(),
    `<script>${FEED_PARSE_FN}
function __dbaGameCount(data) {
  if (!data) return 0;
  if (Array.isArray(data.Games)) return data.Games.length;
  if (Array.isArray(data.matches)) return data.matches.length;
  if (Array.isArray(data.games)) return data.games.length;
  if (Array.isArray(data)) return data.length;
  return 0;
}
(function () {
  var node = document.querySelector('.matches[data-feed]');
  if (!node || !window.DbaRenderMatches) return;
  var b64 = node.getAttribute('data-sample-b64');
  var sample = null;
  if (b64) {
    try {
      sample = JSON.parse(atob(b64));
      window.DbaRenderMatches(node, sample);
    } catch (e) {}
  }
  var feed = (window.DbaResolveFeedUrl
    ? window.DbaResolveFeedUrl(node)
    : node.getAttribute('data-feed'));
  if (!feed) return;
  fetch(feed, { credentials: 'omit' })
    .then(__dbaParseFeed)
    .then(function (data) {
      if (!data || !window.DbaRenderMatches) return;
      if (window.DbaOnFeedPayload) window.DbaOnFeedPayload(node, data);
      // Prefer live games when the feed returns any. Runtime drops per-slide
      // to 1 when needed so thin feeds (GAM line-item preview) still rotate.
      if (__dbaGameCount(data) > 0) window.DbaRenderMatches(node, data);
    })
    .catch(function () {});
}());
</script>`,
  ].join('\n');
}

/**
 * 3BM: inline dba-runtime at body end (no match-card sample). Runtime's
 * three-bm path fetches GetPayload only for Bookie.Link when needed.
 */
function makeThreeBmSnippetSelfContained(snippet) {
  snippet = snippet.replace(/<script\s+src="[^"]*"\s*defer\s*><\/script>\s*/i, '');
  if (!snippet.includes('dba-runtime') && !snippet.includes('DbaWireStaticCtaGuidClicks')) {
    snippet = snippet.replace('</body>', `${inlinedRuntimeScriptTag()}\n</body>`);
  }
  return snippet;
}

/**
 * Prepare snippet for GAM paste/preview:
 *  1. Move runtime load + feed bootstrap to end of <body> (GAM-proven pattern)
 *  2. Attach data-sample-b64 so cards render when the live feed is blocked
 */
function makeSnippetSelfContained(snippet) {
  if (/\bthree-bm-mpu\b/.test(snippet)) {
    return makeThreeBmSnippetSelfContained(snippet);
  }
  if (!/\bclass="matches"[^>]*\bdata-feed=/.test(snippet)) return snippet;

  snippet = snippet.replace(/<script\s+src="[^"]*"\s*defer\s*><\/script>\s*/i, '');

  const b64 = Buffer.from(JSON.stringify(buildSampleMatchFeed()), 'utf8').toString('base64');
  snippet = snippet.replace(/<div class="matches"([^>]*)>/g, (match, attrs) => {
    if (/\bdata-sample-b64=/.test(attrs)) return match;
    return `<div class="matches"${attrs} data-sample-b64="${b64}">`;
  });

  if (!snippet.includes('__DBA_SKIP_AUTORENDER')) {
    snippet = snippet.replace('</body>', `${gamBootstrapScripts()}\n</body>`);
  }
  return snippet;
}

function validateThreeBmSnippet(snippet, inline) {
  const issues = [];
  const checks = [];
  const hasRuntime = snippet.includes('generateClickGuid') || snippet.includes('DbaWireStaticCtaGuidClicks');
  checks.push({ key: 'runtime', label: '3BM runtime', expected: 'inlined dba-runtime.js', ok: hasRuntime });
  if (!hasRuntime) issues.push('3BM runtime missing — snippet must inline dba-runtime.js');
  const hasSections = snippet.includes('mpu-section') && (inline.sections_html || '').includes('mpu-section');
  checks.push({ key: 'sections_html', label: '3 sections', expected: 'three .mpu-section anchors', ok: hasSections });
  if (!hasSections) issues.push('sections_html missing or empty');
  if (inline.feed_url) {
    // data-feed may HTML-escape & as &amp; — match the GetPayload identity, not the raw string.
    const feedOk = /data-feed="[^"]*GetPayload[^"]*"/.test(snippet)
      && snippet.includes('data-payload-feed="1"');
    checks.push({ key: 'feed_url', label: 'Bet365 GetPayload feed', expected: inline.feed_url, ok: feedOk });
    if (!feedOk) issues.push('feed_url not baked into three-bm-mpu root');
  }
  const banned = /\[%bet365_cta_url%\]/i.test(snippet);
  checks.push({ key: 'no_bet365_macro', label: 'No [%bet365_cta_url%]', expected: 'absent', ok: !banned });
  if (banned) issues.push('Must not emit [%bet365_cta_url%] — use ExtraLinks via GetPayload');
  return { ok: issues.length === 0, issues, checks };
}

// Build the CreativeTemplate payload (the "what HTML + variable schema does GAM
// store" view). Mirrors GAM's CreativeTemplate schema:
//   https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate
// Remaining GAM macros: [%cta_url%] (static BMs) or [%OS_Type%] (Bet365).
// `options.inlineValues` — map of name→value for macros that are baked in.
// `options.payloadLink` — Bet365-style CreativeTemplate (OS_Type, no cta_url).
// Throws if the layout HTML file is missing.
function buildCreativeTemplate(dbaTemplate, options = {}) {
  const file = templateFileFor(dbaTemplate);
  if (!file) {
    throw new Error(`No GAM template file mapped for sizeId=${dbaTemplate.sizeId}`);
  }
  const filePath = path.join(TEMPLATES_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file missing: ${file} (expected at ${filePath})`);
  }
  const rawSnippet = fs.readFileSync(filePath, 'utf8');
  const kind = dbaTemplate.kind || dbaTemplate.config?.kind || 'standard';
  const inline = kind === '3bm'
    ? { ...(options.inlineValues || {}) }
    : mergeInlineValues(dbaTemplate, options.inlineValues);
  let snippet = applyInlineValues(rawSnippet, inline);
  // GAM export: body-end bootstrap (+ sample matches for standard formats).
  snippet = makeSnippetSelfContained(snippet);
  // Visible bake stamp so ops can confirm the copied HTML is the current build
  // (GAM creatives do not auto-update when cms-dba redeploys).
  const bakeStamp = `<!-- dba-snippet-v=2026-11-10-odds-welcome sha=${String(process.env.GIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 12)} -->`;
  if (snippet.includes('<!DOCTYPE html>') || snippet.includes('<!doctype html>')) {
    snippet = snippet.replace(/<!DOCTYPE html>/i, `${bakeStamp}\n<!DOCTYPE html>`);
  } else {
    snippet = `${bakeStamp}\n${snippet}`;
  }
  const macrosLeft = remainingMacros(snippet);
  const payloadLink = !!options.payloadLink;
  const bakeValidation = kind === '3bm'
    ? validateThreeBmSnippet(snippet, inline)
    : validateBakedSnippet(snippet, inline);
  const vars = variableSchemaFor({ payloadLink, kind });
  const bakedFor = options.bakedMarket
    ? (kind === '3bm'
      ? ` 3BM sections inlined for country ${options.bakedMarket.country}.`
      : ` Branding/feed/disclaimer inlined for ${options.bakedMarket.bookmakerId}/${options.bakedMarket.country}.`)
    : ' Branding/feed/disclaimer macros cleared (no market sample to bake).';
  let varHint = payloadLink
    ? ' Declared GAM variable: OS_Type (Pricing=Sponsorship, Ordering=Popularity baked; AttNw/AttCmp via patterns → Bookie.Link).'
    : ' Declared GAM variable: cta_url.';
  if (kind === '3bm') {
    varHint = payloadLink
      ? ' 3BM: declare Bypass + OS_Type; static affiliates baked; Bet365 via ExtraLinks; no [%bet365_cta_url%].'
      : ' 3BM: declare Bypass; all section affiliates baked; no CTA URL variables.';
  }
  return {
    // Operation hint for the (future) sync layer.
    operation: dbaTemplate.gam_creative_template_id ? 'UPDATE' : 'CREATE',
    id: dbaTemplate.gam_creative_template_id || null,
    name: kind === '3bm'
      ? `DBA 3BM: ${dbaTemplate.name}`
      : `DBA: ${dbaTemplate.name} (${dbaTemplate.sizeId})`,
    description: `Auto-generated from CMS template ${dbaTemplate.id}. Layout file: ${file}.${bakedFor}${varHint}`,
    sourceFile: file,
    status: 'ACTIVE',
    type: 'USER_DEFINED',
    snippet,
    variables: vars,
    remainingMacros: macrosLeft,
    bakeValidation,
    bakedInline: inline,
    payloadLink,
    kind,
    isInterstitial: isInterstitialSize(dbaTemplate.sizeId),
    isNativeEligible: false,
    isSafeFrameCompatible: true,
  };
}

module.exports = {
  buildCreativeTemplate,
  VARIABLE_SCHEMA,
  ALL_VARIABLE_SCHEMA,
  INLINE_VARIABLE_NAMES,
  variableSchemaFor,
  applyInlineValues,
  mergeInlineValues,
  validateBakedSnippet,
  validateFeedUrl,
  fallbackInlineFromTemplate,
  remainingMacros,
  templateFileFor,
};
