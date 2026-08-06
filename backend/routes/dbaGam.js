// /api/dba/gam — dry-run preview of what we'd push to Google Ad Manager.
// Phase 1: read-only. No GAM API calls; no writes anywhere.
const express = require('express');
const { pool } = require('../db/mysql');
const { templateRowToJson } = require('./_dbaShape');
const { buildCreativeTemplate, validateFeedUrl } = require('../gam/templateBuilder');
const { buildCreative } = require('../gam/creativeBuilder');

const router = express.Router();

// GET /api/dba/gam/templates/:id/preview
// Returns:
//   {
//     dbaTemplate: { ... original template JSON },
//     creativeTemplate: { ... GAM CreativeTemplate payload },
//     creatives: [ ... one Creative per (bookmaker, country) market ],
//     validation: { errors: [...], warnings: [...] },
//   }
router.get('/templates/:id/preview', async (req, res, next) => {
  try {
    const [[tplRow]] = await pool.query(
      'SELECT * FROM dba_templates WHERE id = ?',
      [req.params.id],
    );
    if (!tplRow) return res.status(404).json({ error: 'Template not found' });

    const [countryRows] = await pool.query(
      'SELECT country_code FROM dba_template_countries WHERE template_id = ? ORDER BY country_code',
      [tplRow.id],
    );
    const countries = countryRows.map((r) => r.country_code);

    const dbaTemplate = {
      ...templateRowToJson(tplRow, countries),
      gam_creative_template_id: tplRow.gam_creative_template_id,
      gam_last_synced_at: tplRow.gam_last_synced_at,
    };

    // Resolve the market list first: a Creative per (template.bookmakerId, country).
    // Branding / feed / disclaimer values from the first market are then baked
    // into the CreativeTemplate HTML snippet (they are not GAM variables).
    const errors = [];
    const creatives = [];
    if (dbaTemplate.bookmakerId) {
      const [[bookmaker]] = await pool.query(
        'SELECT * FROM dba_bookmakers WHERE id = ?',
        [dbaTemplate.bookmakerId],
      );
      const bmid = bookmaker ? parseInt(String(bookmaker.id).replace(/^bk_/, ''), 10) : null;
      let bookieSettings = null;
      if (Number.isFinite(bmid)) {
        const [[bs]] = await pool.query(
          'SELECT * FROM dba_bookie_settings WHERE bmid = ?', [bmid],
        );
        bookieSettings = bs || null;
      }

      // Pre-fetch existing GAM creative ids for UPDATE-vs-CREATE hint.
      const [creativeIdRows] = await pool.query(
        'SELECT country_code, gam_creative_id FROM dba_template_creatives WHERE dba_template_id = ? AND bookmaker_id = ?',
        [dbaTemplate.id, dbaTemplate.bookmakerId],
      );
      const previousByCountry = new Map(creativeIdRows.map((r) => [r.country_code, r.gam_creative_id]));

      if (!bookmaker) {
        errors.push(`Bookmaker ${dbaTemplate.bookmakerId} not found — cannot build creatives`);
      } else if (countries.length === 0) {
        errors.push('Template has no countries assigned — no creatives to build');
      } else {
        // mysql2 returns the `default_logo_image_url` snake_cased; reshape.
        const bookmakerJs = {
          id: bookmaker.id,
          name: bookmaker.name,
          brandColor: bookmaker.brand_color,
          secondaryColor: bookmaker.secondary_color,
          defaultLogoImageUrl: bookmaker.default_logo_image_url,
          useNoBgLogo: !!bookmaker.use_no_bg_logo,
        };
        for (const cc of countries) {
          const [[variant]] = await pool.query(
            'SELECT * FROM dba_bookmaker_variants WHERE bookmaker_id = ? AND country_code = ?',
            [bookmaker.id, cc],
          );
          const creative = buildCreative({
            dbaTemplate,
            bookmaker: bookmakerJs,
            country: cc,
            variant: variant || null,
            bookieSettings,
            previousId: previousByCountry.get(cc) || null,
            feedBaseUrl: req.query.feedBase || undefined,
          });
          creatives.push(creative);
        }
      }
    } else {
      errors.push('Template has no bookmaker_id — assign one in the editor first');
    }

    // Build CreativeTemplate with inlined brand/feed/disclaimer from the first
    // market. If the layout HTML file is missing, surface that as an error.
    let creativeTemplate = null;
    const sample = creatives[0] || null;
    try {
      creativeTemplate = buildCreativeTemplate(dbaTemplate, {
        inlineValues: sample ? sample.inlineValues : null,
        bakedMarket: sample ? sample.market : null,
      });
    } catch (err) {
      errors.push(err.message);
    }

    const warnings = creatives.flatMap((c) =>
      (c.validation || []).map((msg) => `${c.market.bookmakerId}/${c.market.country}: ${msg}`),
    );
    if (sample && creatives.length > 1) {
      warnings.push(
        `HTML snippet branding/feed/disclaimer are inlined from the first market (${sample.market.bookmakerId}/${sample.market.country}). Other countries need their own baked export.`,
      );
    }

    let feedValidation = null;
    const feedUrl = sample?.inlineValues?.feed_url || creativeTemplate?.bakedInline?.feed_url;
    if (feedUrl) {
      feedValidation = await validateFeedUrl(feedUrl);
      if (!feedValidation.ok) {
        warnings.push(`Games feed: ${feedValidation.error} (${feedUrl})`);
      }
    }

    if (creativeTemplate?.bakeValidation && !creativeTemplate.bakeValidation.ok) {
      creativeTemplate.bakeValidation.issues.forEach((msg) => warnings.push(`Snippet bake: ${msg}`));
    }

    res.json({
      dbaTemplate: { id: dbaTemplate.id, name: dbaTemplate.name, sizeId: dbaTemplate.sizeId, status: dbaTemplate.status, countries, bookmakerId: dbaTemplate.bookmakerId },
      creativeTemplate,
      creatives,
      feedValidation,
      validation: { errors, warnings },
    });
  } catch (err) { next(err); }
});

module.exports = router;
