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

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Maps a (sizeId, has-welcome-offer) shape to a template file name.
// Add new variants as new files land in templates/.
function templateFileFor(dbaTemplate) {
  const sizeId = dbaTemplate.sizeId;
  const hasWelcome = !!(dbaTemplate.config && dbaTemplate.config.welcomeOffer && dbaTemplate.config.welcomeOffer.enabled);
  const map = {
    '300x250':       hasWelcome ? 'mpu-welcome.html'          : 'mpu-standard.html',
    '640x1280':      hasWelcome ? 'interstitial-welcome.html' : 'interstitial-standard.html',
    '320x50':        hasWelcome ? 'banner-welcome.html'       : 'banner.html',
  };
  return map[sizeId] || null;
}

// Macros that are resolved into the HTML snippet when exporting to GAM —
// NOT declared as CreativeTemplate variables. Per-creative var: cta_url only.
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
  'runtime_url',
  'welcome_headline',
  'welcome_subtext',
  'welcome_terms',
  'welcome_cta_text',
  'date_pill_bg',
  'date_pill_text_color',
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
  { uniqueName: 'cta_url',                label: 'CTA / affiliate URL', description: 'Affiliate landing page for this (bookmaker, country)',       type: 'URL',    isRequired: true },
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
  { uniqueName: 'date_pill_bg',           label: 'Date pill fill',     description: 'Background of the date/time pill (transparent when fill is off)', type: 'STRING', isRequired: false },
  { uniqueName: 'date_pill_text_color',   label: 'Date pill text',     description: 'Date/time pill text color', type: 'STRING', isRequired: false },
];

// Variables actually declared on the GAM CreativeTemplate — cta_url only.
const VARIABLE_SCHEMA = ALL_VARIABLE_SCHEMA.filter((v) => !INLINE_VARIABLE_NAMES.has(v.uniqueName));

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
  'runtime_url',
  'date_pill_bg',
  'date_pill_text_color',
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
  var feed = node.getAttribute('data-feed');
  if (!feed) return;
  fetch(feed, { credentials: 'omit' })
    .then(__dbaParseFeed)
    .then(function (data) {
      if (!data || !window.DbaRenderMatches) return;
      // Prefer any live feed over baked sample (sample is offline fallback only).
      if (__dbaGameCount(data) > 0) window.DbaRenderMatches(node, data);
    })
    .catch(function () {});
}());
</script>`,
  ].join('\n');
}

/**
 * Prepare snippet for GAM paste/preview:
 *  1. Move runtime load + feed bootstrap to end of <body> (GAM-proven pattern)
 *  2. Attach data-sample-b64 so cards render when the live feed is blocked
 */
function makeSnippetSelfContained(snippet) {
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

// Build the CreativeTemplate payload (the "what HTML + variable schema does GAM
// store" view). Mirrors GAM's CreativeTemplate schema:
//   https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate
// Remaining variable macro: GAM's `[%cta_url%]`.
// `options.inlineValues` — map of name→value for macros that are baked in.
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
  const inline = mergeInlineValues(dbaTemplate, options.inlineValues);
  let snippet = applyInlineValues(rawSnippet, inline);
  // GAM export: body-end bootstrap + sample matches for preview.
  snippet = makeSnippetSelfContained(snippet);
  const macrosLeft = remainingMacros(snippet);
  const bakeValidation = validateBakedSnippet(snippet, inline);
  const bakedFor = options.bakedMarket
    ? ` Branding/feed/disclaimer inlined for ${options.bakedMarket.bookmakerId}/${options.bakedMarket.country}.`
    : ' Branding/feed/disclaimer macros cleared (no market sample to bake).';
  return {
    // Operation hint for the (future) sync layer.
    operation: dbaTemplate.gam_creative_template_id ? 'UPDATE' : 'CREATE',
    id: dbaTemplate.gam_creative_template_id || null,
    name: `DBA: ${dbaTemplate.name} (${dbaTemplate.sizeId})`,
    description: `Auto-generated from CMS template ${dbaTemplate.id}. Layout file: ${file}.${bakedFor} Body-end feed bootstrap + sample matches for GAM preview.`,
    sourceFile: file,
    status: 'ACTIVE',
    // GAM CreativeTemplateType: USER_DEFINED = publisher template (us);
    // SYSTEM_DEFINED is reserved for Google-shipped templates.
    type: 'USER_DEFINED',
    snippet,
    // Declared GAM variable: cta_url only. `remainingMacros` must match.
    variables: VARIABLE_SCHEMA,
    remainingMacros: macrosLeft,
    bakeValidation,
    bakedInline: inline,
    // Layout flags GAM exposes on the template record itself:
    isInterstitial: dbaTemplate.sizeId === '640x1280',
    isNativeEligible: false,
    isSafeFrameCompatible: true,
  };
}

module.exports = {
  buildCreativeTemplate,
  VARIABLE_SCHEMA,
  ALL_VARIABLE_SCHEMA,
  INLINE_VARIABLE_NAMES,
  applyInlineValues,
  mergeInlineValues,
  validateBakedSnippet,
  validateFeedUrl,
  fallbackInlineFromTemplate,
  remainingMacros,
  templateFileFor,
};
