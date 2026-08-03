// Build a Google Ad Manager CreativeTemplate JSON payload from a dba_templates
// row. Phase 1: read-only — no GAM API calls. The output mirrors GAM's
// CreativeTemplate schema (https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate).
//
// Layout flags (welcome-offer enabled, banner-vs-MPU, etc.) decide which HTML
// file is loaded. Branding / feed / disclaimer macros are BAKED into the
// snippet at export time (per market). Only click-URL + welcome-offer fields
// remain as real GAM CreativeTemplate variables.
const fs = require('fs');
const path = require('path');

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
// NOT declared as CreativeTemplate variables. Only cta_url remains a variable.
const INLINE_VARIABLE_NAMES = new Set([
  'bookmaker_logo_url',
  'bookmaker_name',
  'brand_color_1',
  'brand_color_2_or_white',
  'cta_bg_color',
  'cta_text',
  'cta_text_color',
  'disclaimer_layout',
  'disclaimer_text',
  'disclaimer_url',
  'feed_url',
  'runtime_url',
  'welcome_headline',
  'welcome_subtext',
  'welcome_terms',
  'welcome_cta_text',
]);

// Full authoring macro set (HTML files still use [%name%] placeholders).
// type:
//   STRING  — single-line text (default)
//   URL     — HTTP/HTTPS URL with validation
const ALL_VARIABLE_SCHEMA = [
  { uniqueName: 'bookmaker_name',         label: 'Bookmaker name',      description: 'Display name of the bookmaker (Bet365, Betano, …)',          type: 'STRING', isRequired: true },
  { uniqueName: 'bookmaker_logo_url',     label: 'Bookmaker logo URL',  description: 'Full CDN URL to the bookmaker logo image',                   type: 'URL',    isRequired: true },
  { uniqueName: 'brand_color_1',          label: 'Brand color 1',       description: 'Primary brand color, hex e.g. #0d5240',                      type: 'STRING', isRequired: true },
  { uniqueName: 'brand_color_2_or_white', label: 'Brand color 2 / text',description: 'Secondary brand color or white for legibility, hex',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_bg_color',           label: 'CTA background color',description: 'CTA button background, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text_color',         label: 'CTA text color',      description: 'CTA button text color, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text',               label: 'CTA text',            description: 'Translated CTA button label for the target country',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_url',                label: 'CTA / affiliate URL', description: 'Affiliate landing page for this (bookmaker, country)',       type: 'URL',    isRequired: true },
  { uniqueName: 'disclaimer_text',        label: 'Legal disclaimer',    description: 'Responsible-gaming text shown in the footer (Brazil: full SPA/MF copy)', type: 'STRING', isRequired: false },
  { uniqueName: 'disclaimer_url',         label: 'Disclaimer URL',      description: 'Link target for the legal disclaimer',                       type: 'URL',    isRequired: false },
  { uniqueName: 'disclaimer_layout',      label: 'Disclaimer layout',   description: 'CSS class: legal-band (~10% Brazil) or legal-strip (default)', type: 'STRING', isRequired: false },
  { uniqueName: 'feed_url',               label: 'Match feed URL',      description: 'AdsGeneratorService endpoint for live match data',           type: 'URL',    isRequired: true },
  { uniqueName: 'runtime_url',            label: 'DBA runtime URL',     description: 'Script URL that renders match cards into the creative (served by DBAManagementService at /dba-runtime.js)', type: 'URL', isRequired: true },
  // Welcome-offer fields — only required when the loaded template HTML uses them.
  { uniqueName: 'welcome_headline',       label: 'Welcome offer headline', description: 'Translated headline on the welcome slide',                type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_subtext',        label: 'Welcome offer subtext',  description: 'Translated supporting copy on the welcome slide',         type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_terms',          label: 'Welcome offer terms',    description: 'Translated terms / fine-print on the welcome slide',      type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_cta_text',       label: 'Welcome offer CTA text', description: 'Translated CTA on the welcome slide (overrides cta_text)',type: 'STRING', isRequired: false },
];

// Variables actually declared on the GAM CreativeTemplate — click URL only.
const VARIABLE_SCHEMA = ALL_VARIABLE_SCHEMA.filter((v) => !INLINE_VARIABLE_NAMES.has(v.uniqueName));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Replace `[%name%]` macros. Text-ish fields are HTML-escaped; URL/color macros
// are inserted raw so CSS/hrefs stay valid.
const RAW_INLINE_NAMES = new Set([
  'bookmaker_logo_url',
  'brand_color_1',
  'brand_color_2_or_white',
  'cta_bg_color',
  'cta_text_color',
  'disclaimer_layout',
  'disclaimer_url',
  'feed_url',
  'runtime_url',
]);

function applyInlineValues(snippet, inlineValues) {
  // Always resolve every INLINE macro so `[%bookmaker_logo_url%]` etc. never
  // leak into the exported GAM snippet — even when a market creative could
  // not be built (empty string fallback).
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
    out = out.split(`[%${name}%]`).join(inserted);
  }
  return out;
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
// (SafeFrame / blocked host). Shape matches dba-runtime's React-preview path.
const SAMPLE_MATCH_FEED = {
  matches: [
    { date: '22/05 · 03:30', home: { id: 7766, name: 'Peñarol' }, away: { id: 1267, name: 'Corinthians' }, odds: ['2.62', '3.30', '2.62'] },
    { date: '24/05 · 01:00', home: { id: 1269, name: 'Mirassol' }, away: { id: 1216, name: 'Fluminense' }, odds: ['2.65', '3.10', '2.55'] },
    { date: '18/05 · 00:30', home: { id: 1273, name: 'RB Bragantino' }, away: { id: 1228, name: 'Associação Atlética Ponte Preta' }, odds: ['1.62', '3.80', '5.25'] },
    { date: '17/05 · 17:00', home: { id: 1224, name: 'Santos' }, away: { id: 1212, name: 'Coritiba' }, odds: ['1.66', '3.60', '5.25'] },
  ],
};

/**
 * Make the exported snippet self-contained for GAM paste/preview:
 *  1. Inline dba-runtime.js (external script hosts are often blocked in GAM)
 *  2. Attach data-sample-b64 so cards render even if /GetPayload fails
 */
function makeSnippetSelfContained(snippet) {
  const runtimePath = path.join(TEMPLATES_DIR, 'dba-runtime.js');
  if (fs.existsSync(runtimePath)) {
    const js = fs.readFileSync(runtimePath, 'utf8').replace(/<\/script/gi, '<\\/script');
    snippet = snippet.replace(
      /<script\s+src="[^"]*"\s*defer\s*><\/script>/i,
      `<script>\n${js}\n</script>`,
    );
  }

  const b64 = Buffer.from(JSON.stringify(SAMPLE_MATCH_FEED), 'utf8').toString('base64');
  snippet = snippet.replace(/<div class="matches"([^>]*)>/g, (match, attrs) => {
    if (/\bdata-sample-b64=/.test(attrs)) return match;
    return `<div class="matches"${attrs} data-sample-b64="${b64}">`;
  });
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
  let snippet = applyInlineValues(rawSnippet, options.inlineValues || null);
  // Self-contained export: inline runtime + sample matches for GAM preview.
  snippet = makeSnippetSelfContained(snippet);
  const macrosLeft = remainingMacros(snippet);
  const bakedFor = options.bakedMarket
    ? ` Branding/feed/disclaimer inlined for ${options.bakedMarket.bookmakerId}/${options.bakedMarket.country}.`
    : ' Branding/feed/disclaimer macros cleared (no market sample to bake).';
  return {
    // Operation hint for the (future) sync layer.
    operation: dbaTemplate.gam_creative_template_id ? 'UPDATE' : 'CREATE',
    id: dbaTemplate.gam_creative_template_id || null,
    name: `DBA: ${dbaTemplate.name} (${dbaTemplate.sizeId})`,
    description: `Auto-generated from CMS template ${dbaTemplate.id}. Layout file: ${file}.${bakedFor} Runtime inlined; sample matches embedded for preview.`,
    sourceFile: file,
    status: 'ACTIVE',
    // GAM CreativeTemplateType: USER_DEFINED = publisher template (us);
    // SYSTEM_DEFINED is reserved for Google-shipped templates.
    type: 'USER_DEFINED',
    snippet,
    // Declared GAM variable: cta_url. `remainingMacros` is what is still
    // literally present in the baked snippet (should match).
    variables: VARIABLE_SCHEMA,
    remainingMacros: macrosLeft,
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
  remainingMacros,
  templateFileFor,
};
