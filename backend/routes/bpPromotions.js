// CMS-only routes for Betting Promotion (BPMB) management.
// Runtime GET /api/bp lives in the bp-service microservice (public mobile endpoint).

const router = require('express').Router();
const countryCache = require('../services/countryCache');
const { notifyBpRuntimeInvalidate } = require('../services/bpRuntimeClient');
const { invalidateBpCache } = require('../services/cloudfront');
const { pool } = require('../db/mysql');

const FETCH_QUERY = `
  SELECT
    p.id, p.name, p.cid, p.platform, p.lid, p.lang, p.publisher, p.campaign, p.sov, p.active,
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
    b.subtitle_text,  b.subtitle_text_color,
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
        cid: r.cid,
        platform: r.platform,
        lid: r.lid,
        lang: r.lang,
        publisher: r.publisher,
        campaign: r.campaign,
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
    body.cid       != null ? Number(body.cid) : null,
    body.platform  || 'All',
    body.lid       != null ? Number(body.lid) : null,
    body.lang      != null && body.lang !== '' ? Number(body.lang) : null,
    body.publisher != null && body.publisher !== '' ? Number(body.publisher) : null,
    body.campaign?.trim() || null,
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
        title_text, title_text_color, subtitle_text, subtitle_text_color,
        cta_text, cta_text_color, strip_color_1, strip_color_2,
        logo_image_url, click_url)
     VALUES ?`,
    [values]
  );
}

async function afterPromotionMutation() {
  notifyBpRuntimeInvalidate();
  invalidateBpCache().catch((err) => console.warn('[cloudfront] invalidation failed:', err.message));
}

/**
 * @openapi
 * /api/bp/countries:
 *   get:
 *     tags: [Promotions]
 *     summary: List countries for the Geo picker
 *     description: >
 *       { id, name } pairs sourced from the production T_COUNTRIES table
 *       (MSSQL SportifierDB) — the same real CIDs used by Targeting.uc.
 *     responses:
 *       200:
 *         description: Countries, sorted by name
 */
router.get('/countries', (req, res) => {
  res.json(countryCache.listCountries());
});

/**
 * @openapi
 * /api/bp/promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: List all promotions
 *   post:
 *     tags: [Promotions]
 *     summary: Create a promotion
 *     description: >
 *       Persists to MySQL, notifies the public BP runtime service to reload its cache,
 *       and triggers CloudFront invalidation of /api/bp* on the public distribution.
 */
router.get('/promotions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${FETCH_QUERY} ORDER BY p.id DESC, b.position`);
    res.json(groupRows(rows));
  } catch (err) { next(err); }
});

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

router.post('/promotions', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO bp_promotions
         (name, cid, platform, lid, lang, publisher, campaign, sov, page_bg_color,
          bg_type, bg_gradient_color1, bg_gradient_color2, bg_gradient_angle, bg_image_url,
          header_main_text, header_main_color,
          header_secondary_text, header_secondary_color,
          header_image_url, header_image_height, legal_enabled, legal_text, legal_color, legal_link,
          legal_reg_logo1_link, legal_reg_logo2_link, active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      promoParams(req.body)
    );
    await insertBookies(conn, result.insertId, req.body.bookies);
    await conn.commit();
    await afterPromotionMutation();
    const [rows] = await pool.query(`${FETCH_QUERY} WHERE p.id = ? ORDER BY b.position`, [result.insertId]);
    res.status(201).json(groupRows(rows)[0]);
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

router.put('/promotions/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [check] = await conn.query('SELECT id FROM bp_promotions WHERE id = ?', [req.params.id]);
    if (!check.length) { await conn.rollback(); return res.status(404).json({ error: 'Not found' }); }
    await conn.query(
      `UPDATE bp_promotions SET
         name=?, cid=?, platform=?, lid=?, lang=?, publisher=?, campaign=?, sov=?, page_bg_color=?,
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
    await afterPromotionMutation();
    const [rows] = await pool.query(`${FETCH_QUERY} WHERE p.id = ? ORDER BY b.position`, [req.params.id]);
    res.json(groupRows(rows)[0]);
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

router.delete('/promotions/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM bp_promotions WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    await afterPromotionMutation();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
