#!/usr/bin/env node
/**
 * Local GAM interstitial simulation — must match CMS preview structure:
 * 3 stacked match cards, capped logo, readable text on light cards.
 *
 * Sizes:
 *   320×480  — GAM inventory
 *   320×640  — common tall phone SafeFrame
 *   640×1280 — CMS preview canvas
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.pw-browsers');
}

import { chromium } from 'playwright';

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'templates');
const OUT = path.join(ROOT, '.layout-check');

const VIEWPORTS = [
  { w: 320, h: 480, label: 'gam-320x480' },
  { w: 320, h: 640, label: 'phone-320x640' },
  { w: 640, h: 1280, label: 'cms-640x1280' },
];

const SAMPLE_MATCHES = {
  matches: [
    { home: { id: 7766, name: 'Sporting Cristal' }, away: { id: 1267, name: 'Cienciano' }, odds: ['1.53', '4.1', '5.5'], date: '22/11 22:00', ISOStartTime: '2026-11-22T22:00:00.000Z' },
    { home: { id: 1215, name: 'Bayern' }, away: { id: 1300, name: 'Frosinone' }, odds: ['1.22', '7.0', '9.5'], date: '22/11 22:00', ISOStartTime: '2026-11-22T22:00:00.000Z' },
    { home: { id: 2001, name: 'Alianza Lima' }, away: { id: 2002, name: 'FC Cajamarca' }, odds: ['1.80', '3.5', '4.2'], date: '22/11 15:00', ISOStartTime: '2026-11-22T15:00:00.000Z' },
    { home: { id: 2003, name: 'Barcelona' }, away: { id: 2004, name: 'Villarreal' }, odds: ['1.90', '3.4', '3.8'], date: '23/11 18:00', ISOStartTime: '2026-11-23T18:00:00.000Z' },
    { home: { id: 2005, name: 'Lille' }, away: { id: 2006, name: 'PSG' }, odds: ['3.20', '3.40', '2.10'], date: '23/11 21:00', ISOStartTime: '2026-11-23T21:00:00.000Z' },
    { home: { id: 2007, name: 'Santos' }, away: { id: 2008, name: 'Flamengo' }, odds: ['2.80', '3.20', '2.50'], date: '24/11 19:00', ISOStartTime: '2026-11-24T19:00:00.000Z' },
  ],
};

const LOGO = 'https://res.cloudinary.com/scores365/image/upload/w_400,h_160,c_fit,d_countries:default.png/BookMakers/NoBG/42';

function buildHtml() {
  let tpl = fs.readFileSync(path.join(TEMPLATES, 'interstitial-standard.html'), 'utf8');
  let runtime = fs.readFileSync(path.join(TEMPLATES, 'dba-runtime.js'), 'utf8');
  runtime = runtime.replace(/<\/script/gi, '<\\/script');

  const subs = {
    '[[ad_border_radius]]': '0',
    '[[ad_background]]': '#FF7700',
    '[[brand_color_2_or_white]]': '#FFFFFF',
    '[[ad_font_family]]': 'Inter, sans-serif',
    '[[bookmaker_logo_url]]': LOGO,
    '[[cta_bg_color]]': '#00C853',
    '[[cta_text_color]]': '#FFFFFF',
    '[[disclaimer_layout]]': 'legal-band',
    '[[legal_text_color]]': '#FFFFFF',
    '[[disclaimer_bg_color]]': '#0A0A0A',
    '[[feed_url]]': '',
    '[[date_pill_bg]]': 'rgba(0,0,0,0.55)',
    '[[date_pill_text_color]]': '#FFFFFF',
    '[[cta_text]]': 'ABRIR CUENTA',
    '[[bookmaker_name]]': 'Betsson',
    '[[legal_text]]': '18+ Juego responsable. Los juegos y apuestas deportivas a distancia realizados en exceso pueden causar ludopatía.',
    '[[runtime_url]]': '',
    '[[odds_text_color]]': '#FFFFFF',
    '[[card_bg]]': 'rgba(255,255,255,0.85)',
    '[[ad_href]]': '#',
    '[[ad_attrs]]': '',
  };
  for (const [k, v] of Object.entries(subs)) tpl = tpl.split(k).join(v);
  tpl = tpl.replace(/\[\[[^\]]+\]\]/g, '');
  tpl = tpl.replace(/<script\s+src="[^"]*"\s*defer\s*><\/script>\s*/i, '');

  const b64 = Buffer.from(JSON.stringify(SAMPLE_MATCHES)).toString('base64');
  tpl = tpl.replace(
    /<div class="matches"([^>]*)>/,
    `<div class="matches"$1 data-sample-b64="${b64}">`,
  );

  const boot = `<script>window.__DBA_SKIP_AUTORENDER=true;</script>
<script>${runtime}</script>
<script>
(function () {
  var node = document.querySelector('.matches');
  if (!node || !window.DbaRenderMatches) return;
  var b64 = node.getAttribute('data-sample-b64');
  if (b64) {
    try { window.DbaRenderMatches(node, JSON.parse(atob(b64))); } catch (e) { console.error(e); }
  }
})();
</script>`;
  return tpl.replace('</body>', `${boot}\n</body>`);
}

async function measure(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('.ad-shell');
    const logo = document.querySelector('.logo');
    const slides = [...document.querySelectorAll('.dba-slide:not(.dba-slide-welcome)')];
    const firstSlide = slides[0];
    const cards = firstSlide
      ? [...firstSlide.querySelectorAll('.dba-card')].map((c) => {
        const r = c.getBoundingClientRect();
        const pill = c.querySelector('.dba-pill')?.getBoundingClientRect();
        const teams = c.querySelector('.dba-teams');
        const name = c.querySelector('.dba-team-name');
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          pillInset: pill ? Math.round(pill.top - r.top) : null,
          teamFont: teams ? getComputedStyle(teams).fontSize : null,
          nameColor: name ? getComputedStyle(name).color : null,
          cardFg: getComputedStyle(c).getPropertyValue('color'),
        };
      })
      : [];
    const lr = logo.getBoundingClientRect();
    return {
      logo: { w: Math.round(lr.width), h: Math.round(lr.height) },
      cardFg: shell ? getComputedStyle(shell.querySelector('.matches') || shell).getPropertyValue('--dba-card-fg').trim() : '',
      cardsOnFirstSlide: cards.length,
      cards,
      teamVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-int-team').trim() : '',
      crestVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-int-crest').trim() : '',
    };
  });
}

function assertLayout(m, vp) {
  const errors = [];
  if (m.cardsOnFirstSlide !== 3) {
    errors.push(`${vp.label}: expected 3 cards on first match slide, got ${m.cardsOnFirstSlide}`);
  }
  if (m.logo.w > 210) errors.push(`${vp.label}: logo too wide ${m.logo.w}px (cap 200)`);
  if (m.logo.h > 52) errors.push(`${vp.label}: logo too tall ${m.logo.h}px (cap 48)`);

  if (m.cardFg && !/0,\s*0,\s*0|10,\s*10,\s*10|#0a0a0a/i.test(m.cardFg)) {
    // CSS vars may be #0A0A0A
    if (m.cardFg.replace(/\s/g, '').toLowerCase() !== '#0a0a0a') {
      errors.push(`${vp.label}: card fg should be dark on light card, got ${m.cardFg}`);
    }
  }

  for (let i = 0; i < m.cards.length; i++) {
    const c = m.cards[i];
    if (c.pillInset != null && c.pillInset < 4) {
      errors.push(`${vp.label}: card[${i}] pill too tight to top (${c.pillInset}px)`);
    }
    if (c.height > Math.round(vp.w * 0.42)) {
      errors.push(`${vp.label}: card[${i}] too tall ${c.height}px (cap ~${Math.round(vp.w * 0.38)})`);
    }
  }

  if (m.cards.length >= 2) {
    const gap = m.cards[1].top - m.cards[0].bottom;
    if (gap < 6 || gap > 60) {
      errors.push(`${vp.label}: card gap out of range ${gap}px`);
    }
    // Must be stacked, not overlapping / same top
    if (m.cards[1].top <= m.cards[0].top + 10) {
      errors.push(`${vp.label}: cards not stacked (tops ${m.cards.map((c) => c.top).join(',')})`);
    }
  }

  return errors;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const htmlPath = path.join(OUT, 'interstitial-sim.html');
  fs.writeFileSync(htmlPath, buildHtml());

  const browser = await chromium.launch({ headless: true });
  const allErrors = [];
  const reports = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${htmlPath}`);
    await page.waitForSelector('.dba-card', { timeout: 8000 });
    await page.waitForTimeout(600);
    const m = await measure(page);
    const shot = path.join(OUT, `interstitial-${vp.label}.png`);
    await page.screenshot({ path: shot });
    const errors = assertLayout(m, vp);
    allErrors.push(...errors);
    reports.push({ viewport: `${vp.w}x${vp.h}`, label: vp.label, measures: m, errors, shot });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(reports, null, 2));
  if (allErrors.length) {
    console.error('\nLAYOUT CHECK FAILED\n' + allErrors.map((e) => ` - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('\nLAYOUT CHECK PASSED for', VIEWPORTS.map((v) => `${v.w}x${v.h}`).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
