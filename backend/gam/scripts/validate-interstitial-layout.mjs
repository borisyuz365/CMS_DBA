#!/usr/bin/env node
/**
 * Android Chrome layout check for interstitial GAM creative (640×1280).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '.pw-browsers');
}

import { chromium, devices } from 'playwright';
const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'templates');

const W = 640;
const H = process.env.LAYOUT_H ? parseInt(process.env.LAYOUT_H, 10) : 960;

const SAMPLE_MATCHES = {
  matches: [
    { home: { id: 1, name: 'Lille' }, away: { id: 2, name: 'PSG' }, odds: ['3.20', '3.40', '2.10'], date: '28/08 21:45', ISOStartTime: '2026-08-28T18:45:00.000Z' },
    { home: { id: 3, name: 'Palace' }, away: { id: 4, name: 'Chelsea' }, odds: ['4.50', '3.80', '1.75'], date: '28/08 21:45', ISOStartTime: '2026-08-28T18:45:00.000Z' },
    { home: { id: 5, name: 'Fulham' }, away: { id: 6, name: 'Arsenal' }, odds: ['5.00', '4.00', '1.60'], date: '28/08 21:45', ISOStartTime: '2026-08-28T18:45:00.000Z' },
    { home: { id: 7, name: 'Santos' }, away: { id: 8, name: 'Flamengo' }, odds: ['2.80', '3.20', '2.50'], date: '29/08 19:00', ISOStartTime: '2026-08-29T16:00:00.000Z' },
  ],
};

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="none"/><text x="100" y="112" fill="white" font-size="28" font-family="sans-serif" font-weight="700" text-anchor="middle">SUPERBET</text></svg>';

function buildHtml() {
  let tpl = fs.readFileSync(path.join(TEMPLATES, 'interstitial-standard.html'), 'utf8');
  let runtime = fs.readFileSync(path.join(TEMPLATES, 'dba-runtime.js'), 'utf8');
  runtime = runtime.replace(/<\/script/gi, '<\\/script');

  const subs = {
    '[[ad_border_radius]]': '0',
    '[[ad_background]]': '#6B0046',
    '[[brand_color_2_or_white]]': '#FFFFFF',
    '[[ad_font_family]]': 'Inter, sans-serif',
    '[[bookmaker_logo_url]]': 'data:image/svg+xml,' + encodeURIComponent(LOGO_SVG),
    '[[cta_bg_color]]': '#E8002D',
    '[[cta_text_color]]': '#FFFFFF',
    '[[disclaimer_layout]]': 'legal-band',
    '[[legal_text_color]]': '#FFFFFF',
    '[[disclaimer_bg_color]]': '#0A0A0A',
    '[[feed_url]]': '',
    '[[date_pill_bg]]': '#FFC107',
    '[[date_pill_text_color]]': '#0A0A0A',
    '[[cta_text]]': 'Bet Now',
    '[[bookmaker_name]]': 'Superbet',
    '[[legal_text]]': '18+ MINISTÉRIO DA FAZENDA ADVERTE: Apostas esportivas são proibidas para menores de 18 anos.',
    '[[runtime_url]]': '',
  };
  for (const [k, v] of Object.entries(subs)) tpl = tpl.split(k).join(v);

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
  var node = document.querySelector('.matches[data-feed]');
  if (!node || !window.DbaRenderMatches) return;
  var b64 = node.getAttribute('data-sample-b64');
  if (b64) {
    try { window.DbaRenderMatches(node, JSON.parse(atob(b64))); } catch (e) {}
  }
})();
</script>`;

  return tpl.replace('</body>', `${boot}\n</body>`);
}

async function measure(page) {
  return page.evaluate(() => {
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        width: Math.round(r.width), height: Math.round(r.height),
        fontSize: cs.fontSize,
      };
    }
    const shell = document.querySelector('.ad-shell');
    const firstCard = document.querySelector('.dba-card');
    const homeName = firstCard && firstCard.querySelector('.dba-teamblock-home .dba-team-name');
    const homeCrest = firstCard && firstCard.querySelector('.dba-teamblock-home .dba-team-logo');
    const cards = [...document.querySelectorAll('.dba-card')].slice(0, 3).map((el, i) => {
      const r = el.getBoundingClientRect();
      const teams = el.querySelector('.dba-teams');
      return {
        i,
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        height: Math.round(r.height),
        teamFont: teams ? getComputedStyle(teams).fontSize : null,
      };
    });
    return {
      shell: rect(shell),
      logoWrap: rect(document.querySelector('.logo-wrap')),
      logo: rect(document.querySelector('.logo')),
      matches: rect(document.querySelector('.matches')),
      ctaZone: rect(document.querySelector('.cta-zone')),
      cta: rect(document.querySelector('.cta')),
      legal: rect(document.querySelector('.legal')),
      homeName: rect(homeName),
      homeCrest: rect(homeCrest),
      cards,
      teamVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-int-team').trim() : '',
      crestVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-int-crest').trim() : '',
      oddsVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-int-odds').trim() : '',
      legalVar: shell ? getComputedStyle(shell).getPropertyValue('--dba-legal-h').trim() : '',
    };
  });
}

function assertLayout(m) {
  const errors = [];
  const shellH = m.shell.height;
  const legalPct = m.legal.height / shellH;

  if (legalPct < 0.095) errors.push(`Legal band too small: ${Math.round(legalPct * 100)}% (need 10%)`);
  if (m.legal.top < m.cta.bottom - 2) errors.push(`CTA overlaps legal: cta.bottom=${m.cta.bottom} legal.top=${m.legal.top}`);
  if (m.matches.bottom > m.ctaZone.top + 4) errors.push(`Cards bleed into CTA`);
  if (m.logo.bottom > m.logoWrap.bottom + 2) errors.push(`Logo clipped by logo-wrap: logo.bottom=${m.logo.bottom} wrap.bottom=${m.logoWrap.bottom}`);
  if (m.logoWrap.bottom > m.matches.top + 4) errors.push(`Logo overlaps matches`);

  if (m.logoWrap.top > 30) errors.push(`Logo too far from top: ${Math.round(m.logoWrap.top)}px`);

  const teamPx = parseFloat(m.teamVar);
  if (teamPx < 16 || teamPx > 32) errors.push(`Team font out of range: ${m.teamVar} (want 18-28px)`);
  const oddsPx = parseFloat(m.oddsVar);
  if (!(oddsPx < teamPx)) errors.push(`Odds font must be smaller than team: odds=${m.oddsVar} team=${m.teamVar}`);
  if (oddsPx < 12) errors.push(`Odds font too small: ${m.oddsVar}`);

  const gapMid = m.cards.length >= 2 ? m.cards[1].top - m.cards[0].bottom : 0;
  if (gapMid < 14 || gapMid > 44) errors.push(`Card gap out of range: ${Math.round(gapMid)}px (want ~18-28px)`);
  if (m.cards[0] && m.cards[0].height > Math.round(m.shell.width * 0.30)) {
    errors.push(`Cards too tall: ${m.cards[0].height}px (cap ~${Math.round(m.shell.width * 0.27)}px)`);
  }
  if (m.cards.length >= 2) {
    const heights = m.cards.map((c) => c.height);
    const spread = Math.max(...heights) - Math.min(...heights);
    if (spread > 8) errors.push(`Uneven card heights: ${heights.join(',')}`);
  }

  const ctaToLegal = m.legal.top - m.cta.bottom;
  if (ctaToLegal > 80) errors.push(`CTA too far from legal footer: ${Math.round(ctaToLegal)}px`);

  if (!m.homeName || m.homeName.width < 20 || m.homeName.height < 10) {
    errors.push(`Home team name not visible: ${JSON.stringify(m.homeName)}`);
  }
  if (!m.homeCrest || m.homeCrest.width < 24 || m.homeCrest.height < 24) {
    errors.push(`Home crest not visible: ${JSON.stringify(m.homeCrest)}`);
  }
  if (m.homeCrest && m.cards[0]) {
    const c = m.cards[0];
    if (m.homeCrest.left < c.left - 2 || m.homeCrest.right > c.right + 2) {
      errors.push(`Home crest outside card bounds: crest=${m.homeCrest.left}-${m.homeCrest.right} card=${c.left}-${c.right}`);
    }
  }

  return errors;
}

async function main() {
  const outDir = path.join(ROOT, '.layout-check');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'interstitial-640x1280.html');
  fs.writeFileSync(htmlPath, buildHtml());

  const device = devices['Pixel 7'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...device,
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    userAgent: device.userAgent,
  });
  const page = await context.newPage();
  await page.goto(`file://${htmlPath}`);
  await page.waitForSelector('.dba-card', { timeout: 5000 });
  await page.waitForTimeout(400);

  const m = await measure(page);
  await page.screenshot({ path: path.join(outDir, 'interstitial-android.png'), fullPage: true });

  const errors = assertLayout(m);
  console.log(JSON.stringify({ viewport: `${W}x${H}`, device: 'Pixel 7', measures: m, errors }, null, 2));

  await browser.close();
  if (errors.length) {
    console.error('\nLAYOUT CHECK FAILED');
    process.exit(1);
  }
  console.log('\nLAYOUT CHECK PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
