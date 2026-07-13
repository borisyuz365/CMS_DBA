// GET /api/bp
//
// Configuration endpoint for the Betting Promotion (BPMB) product.
// Returns a single promotion version selected by targeting + SOV lottery.
//
// Query params (all optional — omitting a param widens the match):
//   geo       string  e.g. "Brazil"
//   platform  string  e.g. "Android" | "iOS" | "Web"
//   lid       int     League ID
//
// Response matches the BPMB_v8 JSON contract:
//   { BPMB: { BPMB_Versions: [ <one version> ] } }
//
// All data is served from an in-memory cache — no per-request DB I/O.
// Cache is loaded at startup and refreshed every 30 s in the background.

const router = require('express').Router();
const bpCache = require('../services/bpCache');
const { selectVersion } = require('../services/bpTargeting');
const { invalidateBpCache } = require('../services/cloudfront');

function formatVersion(v) {
  return {
    BP_Version_Name:    v.name,
    Num_Of_Bookies:     v.bookies.length,
    Targeting: {
      Geo:      v.geo,
      Platform: v.platform,
      LID:      v.lid,
      SOV:      v.sov,
    },
    Header: {
      Main_Title:      { Text: v.header.mainTitle.text,      Color: v.header.mainTitle.color },
      Secondary_Title: { Text: v.header.secondaryTitle.text, Color: v.header.secondaryTitle.color },
      ImageURL:        v.header.imageUrl,
      ImageHeight:     v.header.imageHeight || 110,
    },
    Page_Background_Color: v.pageBgColor,
    Page_Background: {
      Type:           v.bgType || 'solid',
      Color:          v.pageBgColor,
      GradientColor1: v.bgGradientColor1,
      GradientColor2: v.bgGradientColor2,
      GradientAngle:  v.bgGradientAngle,
      ImageUrl:       v.bgImageUrl,
    },
    Legal: v.legal?.enabled ? {
      Text:  v.legal.text,
      Color: v.legal.color,
      Link:  v.legal.link,
      Regulatory_Logos: v.geo === 'Italy' ? v.legal.regulatoryLogos.map((l) => ({ Src: l.src, Link: l.link })) : undefined,
    } : null,
    Bookies: v.bookies.map((b) => ({
      BMID:             b.bmid,
      Section_BG_Color: b.sectionBgColor,
      Title_Text:      b.titleText,
      Title_Text_Color: b.titleTextColor,
      Subtitle_Text:       b.subtitleText,
      Subtitle_Text_Color: b.subtitleTextColor || null,
      Terms_Text:          b.termsText,
      CTA_Text:        b.ctaText,
      CTA_Text_Color:  b.ctaTextColor,
      Strip_Colors:    b.stripColors,
      LogoImage:       b.logoImageUrl,
      Click_URL:       b.clickUrl,
    })),
  };
}

/**
 * @openapi
 * /api/bp:
 *   get:
 *     tags: [Runtime]
 *     summary: Get a matched promotion
 *     description: >
 *       Returns one promotion version selected by targeting + SOV lottery.
 *       All data is served from an in-memory cache — no per-request DB I/O.
 *       Omitting a query param widens the match (treated as "All").
 *     parameters:
 *       - in: query
 *         name: geo
 *         schema: { type: string }
 *         example: Brazil
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [Android, iOS, Web] }
 *       - in: query
 *         name: lid
 *         schema: { type: integer }
 *         description: League ID
 *     responses:
 *       200:
 *         description: Matched promotion
 *         headers:
 *           Cache-Control:
 *             schema: { type: string }
 *             description: 'public, max-age=300, stale-while-revalidate=60'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BPMBResponse' }
 *       404:
 *         description: No matching promotion for the given targeting params
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Cache not yet ready — retry in a moment
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', (req, res) => {
  const cache = bpCache.get();

  if (!cache) {
    return res.status(503).json({ error: 'Service initializing — retry in a moment' });
  }

  const { geo, platform, lid } = req.query;
  const version = selectVersion(cache.versions, { geo, platform, lid });

  if (!version) {
    return res.status(404).json({ error: 'No matching promotion found for the given targeting params' });
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.json({ BPMB: { BPMB_Versions: [formatVersion(version)] } });
});

/**
 * @openapi
 * /api/bp/meta:
 *   get:
 *     tags: [Runtime]
 *     summary: Cache health and metadata
 *     description: Ops/debug endpoint — returns cache readiness, age, and version count without exposing promotion data.
 *     responses:
 *       200:
 *         description: Cache status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:         { type: boolean }
 *                 builtAt:       { type: string, format: date-time }
 *                 ageMs:         { type: integer, description: 'Milliseconds since last cache build' }
 *                 totalVersions: { type: integer }
 *       503:
 *         description: Cache not yet ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready: { type: boolean, example: false }
 */
// Cache metadata — useful for ops/debugging without exposing data.
router.get('/meta', (req, res) => {
  const cache = bpCache.get();
  if (!cache) return res.status(503).json({ ready: false });
  res.json({
    ready:      true,
    builtAt:    new Date(cache.builtAt).toISOString(),
    ageMs:      Date.now() - cache.builtAt,
    totalVersions: cache.versions.length,
  });
});

// =============================================================================
// CMS CRUD — /api/bp/promotions
// =============================================================================

const { pool } = require('../db/mysql');

const FETCH_QUERY = `
  SELECT
    p.id, p.name, p.geo, p.platform, p.lid, p.sov, p.active,
    p.page_bg_color,
    p.bg_type, p.bg_gradient_color1, p.bg_gradient_color2,
    p.bg_gradient_angle, p.bg_image_url,
    p.header_main_text,       p.header_main_color,
    p.header_secondary_text,  p.header_secondary_color,
    p.header_image_url,       p.header_image_height,
    p.legal_enabled, p.legal_text, p.legal_color, p.legal_link,
    p.legal_reg_logo1_link, p.legal_reg_logo2_link,
    p.created_at, p.updated_at,
    b.position,       b.bmid,
    b.section_bg_color,
    b.title_text,     b.title_text_color,
    b.subtitle_text,  b.subtitle_text_color, b.terms_text,
    b.cta_text,       b.cta_text_color,
    b.strip_color_1,  b.strip_color_2,
    b.logo_image_url, b.click_url
  FROM bp_promotions p
  LEFT JOIN bp_bookies b ON b.promotion_id = p.id
`;

function groupRows(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id: r.id,
        name: r.name,
        geo: r.geo,
        platform: r.platform,
        lid: r.lid,
        sov: r.sov,
        active: !!r.active,
        pageBgColor:      r.page_bg_color,
        bgType:           r.bg_type || 'solid',
        bgGradientColor1: r.bg_gradient_color1,
        bgGradientColor2: r.bg_gradient_color2,
        bgGradientAngle:  r.bg_gradient_angle,
        bgImageUrl:       r.bg_image_url,
        header: {
          mainTitle:      { text: r.header_main_text,      color: r.header_main_color },
          secondaryTitle: { text: r.header_secondary_text, color: r.header_secondary_color },
          imageUrl:       r.header_image_url,
          imageHeight:    r.header_image_height || 110,
        },
        legal: {
          enabled: !!r.legal_enabled,
          text:    r.legal_text  || '',
          color:   r.legal_color || '#ffffff',
          link:    r.legal_link  || '',
          regulatoryLogos: [
            { src: '/legal-logos/italia-gambling-full.svg',  link: r.legal_reg_logo1_link || '' },
            { src: '/legal-logos/italia-gambling-gauge.svg', link: r.legal_reg_logo2_link || '' },
          ],
        },
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        bookies: [],
      });
    }
    if (r.bmid != null) {
      map.get(r.id).bookies.push({
        position:       r.position,
        bmid:           r.bmid,
        sectionBgColor: r.section_bg_color || '#12193A',
        titleText:      r.title_text,
        titleTextColor: r.title_text_color,
        subtitleText:      r.subtitle_text,
        subtitleTextColor: r.subtitle_text_color || null,
        termsText:         r.terms_text,
        ctaText:        r.cta_text,
        ctaTextColor:   r.cta_text_color,
        stripColors:    [r.strip_color_1, r.strip_color_2].filter(Boolean),
        logoImageUrl:   r.logo_image_url,
        clickUrl:       r.click_url,
      });
    }
  }
  return [...map.values()];
}

function promoParams(body) {
  const h = body.header || {};
  const l = body.legal  || {};
  return [
    body.name,
    body.geo       || 'All',
    body.platform  || 'All',
    body.lid       != null ? Number(body.lid) : null,
    body.sov       != null ? Number(body.sov) : 100,
    body.pageBgColor || '#000000',
    body.bgType || 'solid',
    body.bgGradientColor1 || null,
    body.bgGradientColor2 || null,
    body.bgGradientAngle != null ? Number(body.bgGradientAngle) : 135,
    body.bgImageUrl || null,
    h.mainTitle?.text      || '',
    h.mainTitle?.color     || '#ffffff',
    h.secondaryTitle?.text || '',
    h.secondaryTitle?.color|| '#ffffff',
    h.imageUrl             || null,
    h.imageHeight != null ? Number(h.imageHeight) : 110,
    l.enabled ? 1 : 0,
    l.text  || null,
    l.color || null,
    l.link  || null,
    l.regulatoryLogos?.[0]?.link || null,
    l.regulatoryLogos?.[1]?.link || null,
    body.active !== false ? 1 : 0,
  ];
}

async function insertBookies(conn, promotionId, bookies) {
  if (!Array.isArray(bookies) || bookies.length === 0) return;
  const values = bookies.map((b) => [
    promotionId,
    b.position,
    b.sectionBgColor || '#12193A',
    b.bmid,
    b.titleText       || '',
    b.titleTextColor  || '#ffffff',
    b.subtitleText    || null,
    b.subtitleTextColor|| null,
    b.termsText        || null,
    b.ctaText         || '',
    b.ctaTextColor    || '#ffffff',
    b.stripColors?.[0]|| null,
    b.stripColors?.[1]|| null,
    b.logoImageUrl    || null,
    b.clickUrl        || '',
  ]);
  await conn.query(
    `INSERT INTO bp_bookies
       (promotion_id, position, section_bg_color, bmid,
        title_text, title_text_color, subtitle_text, subtitle_text_color, terms_text,
        cta_text, cta_text_color, strip_color_1, strip_color_2,
        logo_image_url, click_url)
     VALUES ?`,
    [values]
  );
}

/**
 * @openapi
 * /api/bp/promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: List all promotions
 *     responses:
 *       200:
 *         description: Array of all promotions, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Promotion' }
 *   post:
 *     tags: [Promotions]
 *     summary: Create a promotion
 *     description: 'Creates the promotion, refreshes the in-memory cache, and triggers a CloudFront invalidation of /api/bp*.'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Promotion' }
 *     responses:
 *       201:
 *         description: Created promotion
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Promotion' }
 */
// GET /api/bp/promotions — list all (for CMS)
router.get('/promotions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${FETCH_QUERY} ORDER BY p.id DESC, b.position`);
    res.json(groupRows(rows));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /api/bp/promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get a single promotion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion object
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Promotion' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     tags: [Promotions]
 *     summary: Replace a promotion (full update)
 *     description: 'Replaces the promotion in full, refreshes the in-memory cache, and triggers a CloudFront invalidation of /api/bp*.'
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Promotion' }
 *     responses:
 *       200:
 *         description: Updated promotion
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Promotion' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Promotions]
 *     summary: Delete a promotion
 *     description: 'Deletes the promotion, refreshes the in-memory cache, and triggers a CloudFront invalidation of /api/bp*.'
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deletion confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// GET /api/bp/promotions/:id
router.get('/promotions/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `${FETCH_QUERY} WHERE p.id = ? ORDER BY b.position`,
      [req.params.id]
    );
    const list = groupRows(rows);
    if (!list.length) return res.status(404).json({ error: 'Not found' });
    res.json(list[0]);
  } catch (err) { next(err); }
});

// POST /api/bp/promotions — create
router.post('/promotions', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO bp_promotions
         (name, geo, platform, lid, sov, page_bg_color,
          bg_type, bg_gradient_color1, bg_gradient_color2, bg_gradient_angle, bg_image_url,
          header_main_text, header_main_color,
          header_secondary_text, header_secondary_color,
          header_image_url, header_image_height, legal_enabled, legal_text, legal_color, legal_link,
          legal_reg_logo1_link, legal_reg_logo2_link, active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      promoParams(req.body)
    );
    await insertBookies(conn, result.insertId, req.body.bookies);
    await conn.commit();
    await bpCache.invalidate();
    invalidateBpCache().catch((err) => console.warn('[cloudfront] invalidation failed:', err.message));
    const [rows] = await pool.query(`${FETCH_QUERY} WHERE p.id = ? ORDER BY b.position`, [result.insertId]);
    res.status(201).json(groupRows(rows)[0]);
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

// PUT /api/bp/promotions/:id — update
router.put('/promotions/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [check] = await conn.query('SELECT id FROM bp_promotions WHERE id = ?', [req.params.id]);
    if (!check.length) { await conn.rollback(); return res.status(404).json({ error: 'Not found' }); }
    await conn.query(
      `UPDATE bp_promotions SET
         name=?, geo=?, platform=?, lid=?, sov=?, page_bg_color=?,
         bg_type=?, bg_gradient_color1=?, bg_gradient_color2=?, bg_gradient_angle=?, bg_image_url=?,
         header_main_text=?, header_main_color=?,
         header_secondary_text=?, header_secondary_color=?,
         header_image_url=?, header_image_height=?, legal_enabled=?, legal_text=?, legal_color=?, legal_link=?,
         legal_reg_logo1_link=?, legal_reg_logo2_link=?, active=?
       WHERE id=?`,
      [...promoParams(req.body), req.params.id]
    );
    await conn.query('DELETE FROM bp_bookies WHERE promotion_id = ?', [req.params.id]);
    await insertBookies(conn, req.params.id, req.body.bookies);
    await conn.commit();
    await bpCache.invalidate();
    invalidateBpCache().catch((err) => console.warn('[cloudfront] invalidation failed:', err.message));
    const [rows] = await pool.query(`${FETCH_QUERY} WHERE p.id = ? ORDER BY b.position`, [req.params.id]);
    res.json(groupRows(rows)[0]);
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

// DELETE /api/bp/promotions/:id
router.delete('/promotions/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM bp_promotions WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    await bpCache.invalidate();
    invalidateBpCache().catch((err) => console.warn('[cloudfront] invalidation failed:', err.message));
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
