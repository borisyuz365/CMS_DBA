/* Measure card spacing inside the CMS editor preview (AdPreview React component). */
import { chromium } from 'playwright';

const URL = process.env.CMS_URL || 'http://localhost:3001/dba/templates/tpl_interstitial_v2/edit';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-match-card]', { timeout: 15000 });
await page.waitForTimeout(800);

const m = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-match-card]')]
    .filter((c) => c.getBoundingClientRect().width > 0);
  const rects = cards.map((c) => {
    const r = c.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) };
  });
  rects.sort((a, b) => a.top - b.top);
  const gaps = [];
  for (let i = 1; i < rects.length; i++) gaps.push(rects[i].top - rects[i - 1].bottom);
  // walk up from first card to find the flex column + its computed style
  let col = cards[0]?.parentElement;
  const colStyle = col ? {
    display: getComputedStyle(col).display,
    justifyContent: getComputedStyle(col).justifyContent,
    gap: getComputedStyle(col).gap,
    height: Math.round(col.getBoundingClientRect().height),
    childCount: col.children.length,
    marginBottoms: [...col.children].map((ch) => getComputedStyle(ch).marginBottom),
  } : null;
  return { cardCount: cards.length, rects, gaps, colStyle };
});
console.log(JSON.stringify(m, null, 2));

// screenshot the preview area (the tall dark canvas)
const preview = page.locator('[data-match-card]').first();
const handle = await preview.elementHandle();
const shell = await handle.evaluateHandle((el) => {
  let n = el;
  for (let i = 0; i < 12 && n.parentElement; i++) {
    n = n.parentElement;
    const r = n.getBoundingClientRect();
    if (r.height > 500 && r.height / r.width > 1.5) return n;
  }
  return n;
});
await shell.asElement().screenshot({ path: 'backend/gam/.layout-check/cms-preview.png' });
await browser.close();
