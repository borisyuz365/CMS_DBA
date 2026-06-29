// Build a Google Ad Manager CreativeTemplate JSON payload from a dba_templates
// row. Phase 1: read-only — no GAM API calls. The output mirrors GAM's
// CreativeTemplate schema (https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate).
//
// Layout flags (welcome-offer enabled, banner-vs-MPU, etc.) decide which HTML
// file is loaded; branding/text fields stay as variables that are filled per
// Creative.
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

// GAM variable schema. Order matters for the Ad Manager UI.
// type:
//   STRING  — single-line text (default)
//   URL     — HTTP/HTTPS URL with validation
//   LIST    — picker; not used in Phase 1
//   ASSET   — uploaded image; we use URL strings instead so a single asset
//             host (Cloudinary) keeps things flat
const VARIABLE_SCHEMA = [
  { uniqueName: 'bookmaker_name',         label: 'Bookmaker name',      description: 'Display name of the bookmaker (Bet365, Betano, …)',          type: 'STRING', isRequired: true },
  { uniqueName: 'bookmaker_logo_url',     label: 'Bookmaker logo URL',  description: 'Full CDN URL to the bookmaker logo image',                   type: 'URL',    isRequired: true },
  { uniqueName: 'brand_color_1',          label: 'Brand color 1',       description: 'Primary brand color, hex e.g. #0d5240',                      type: 'STRING', isRequired: true },
  { uniqueName: 'brand_color_2_or_white', label: 'Brand color 2 / text',description: 'Secondary brand color or white for legibility, hex',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_bg_color',           label: 'CTA background color',description: 'CTA button background, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text_color',         label: 'CTA text color',      description: 'CTA button text color, hex',                                 type: 'STRING', isRequired: true },
  { uniqueName: 'cta_text',               label: 'CTA text',            description: 'Translated CTA button label for the target country',         type: 'STRING', isRequired: true },
  { uniqueName: 'cta_url',                label: 'CTA / affiliate URL', description: 'Affiliate landing page for this (bookmaker, country)',       type: 'URL',    isRequired: true },
  { uniqueName: 'disclaimer_text',        label: 'Legal disclaimer',    description: 'Responsible-gaming text shown in the footer',                type: 'STRING', isRequired: false },
  { uniqueName: 'disclaimer_url',         label: 'Disclaimer URL',      description: 'Link target for the legal disclaimer',                       type: 'URL',    isRequired: false },
  { uniqueName: 'feed_url',               label: 'Match feed URL',      description: 'AdsGeneratorService endpoint for live match data',           type: 'URL',    isRequired: true },
  { uniqueName: 'runtime_url',            label: 'DBA runtime URL',     description: 'Script URL that renders match cards into the creative (served by DBAManagementService at /dba-runtime.js)', type: 'URL', isRequired: true },
  // Welcome-offer fields — only required when the loaded template HTML uses them.
  { uniqueName: 'welcome_headline',       label: 'Welcome offer headline', description: 'Translated headline on the welcome slide',                type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_subtext',        label: 'Welcome offer subtext',  description: 'Translated supporting copy on the welcome slide',         type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_terms',          label: 'Welcome offer terms',    description: 'Translated terms / fine-print on the welcome slide',      type: 'STRING', isRequired: false },
  { uniqueName: 'welcome_cta_text',       label: 'Welcome offer CTA text', description: 'Translated CTA on the welcome slide (overrides cta_text)',type: 'STRING', isRequired: false },
];

// Build the CreativeTemplate payload (the "what HTML + variable schema does GAM
// store" view). Mirrors GAM's CreativeTemplate schema:
//   https://developers.google.com/ad-manager/api/reference/v202508/CreativeTemplateService.CreativeTemplate
// Variable macros inside `snippet` use GAM's `[%variable_name%]` syntax.
// Throws if the layout HTML file is missing.
function buildCreativeTemplate(dbaTemplate) {
  const file = templateFileFor(dbaTemplate);
  if (!file) {
    throw new Error(`No GAM template file mapped for sizeId=${dbaTemplate.sizeId}`);
  }
  const filePath = path.join(TEMPLATES_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file missing: ${file} (expected at ${filePath})`);
  }
  const snippet = fs.readFileSync(filePath, 'utf8');
  return {
    // Operation hint for the (future) sync layer.
    operation: dbaTemplate.gam_creative_template_id ? 'UPDATE' : 'CREATE',
    id: dbaTemplate.gam_creative_template_id || null,
    name: `DBA: ${dbaTemplate.name} (${dbaTemplate.sizeId})`,
    description: `Auto-generated from CMS template ${dbaTemplate.id}. Layout file: ${file}.`,
    sourceFile: file,
    status: 'ACTIVE',
    // GAM CreativeTemplateType: USER_DEFINED = publisher template (us);
    // SYSTEM_DEFINED is reserved for Google-shipped templates.
    type: 'USER_DEFINED',
    snippet,
    variables: VARIABLE_SCHEMA,
    // Layout flags GAM exposes on the template record itself:
    isInterstitial: dbaTemplate.sizeId === '640x1280',
    isNativeEligible: false,
    isSafeFrameCompatible: true,
  };
}

module.exports = { buildCreativeTemplate, VARIABLE_SCHEMA, templateFileFor };
