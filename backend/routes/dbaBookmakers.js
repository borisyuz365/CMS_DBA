// /api/dba/bookmakers — CRUD for the DBA Bookmaker Management screen.
// Backed by MySQL tables `dba_bookmakers` and `dba_bookmaker_variants`.
const express = require('express');
const { pool } = require('../db/mysql');
const { bookmakerRowToJson } = require('./_dbaShape');
const { appendAuditEntry } = require('./_dbaAudit');

const router = express.Router();

// Fetch every bookmaker + its variants in two queries, then stitch in JS.
// Faster than per-row lookups and trivial for the prototype's row counts.
async function fetchAllBookmakers() {
  const [bmRows]   = await pool.query('SELECT * FROM dba_bookmakers ORDER BY name');
  const [varRows]  = await pool.query('SELECT * FROM dba_bookmaker_variants ORDER BY modified DESC');
  const variantsById = new Map();
  for (const v of varRows) {
    const arr = variantsById.get(v.bookmaker_id) || [];
    arr.push(v);
    variantsById.set(v.bookmaker_id, arr);
  }
  return bmRows.map((bm) => bookmakerRowToJson(bm, variantsById.get(bm.id) || []));
}

async function fetchBookmaker(id) {
  const [[bm]]   = await pool.query('SELECT * FROM dba_bookmakers WHERE id = ?', [id]);
  if (!bm) return null;
  const [vars]   = await pool.query('SELECT * FROM dba_bookmaker_variants WHERE bookmaker_id = ?', [id]);
  return bookmakerRowToJson(bm, vars);
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await fetchAllBookmakers());
  } catch (err) { next(err); }
});

// PUT /:id — upsert the whole bookmaker (record + all variants).
// The frontend always sends a complete object; simplest contract.
router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const bm = req.body;
    if (!bm || bm.id !== req.params.id) {
      return res.status(400).json({ error: 'Body id must match URL id' });
    }
    await conn.beginTransaction();

    const [[existing]] = await conn.query('SELECT id, name FROM dba_bookmakers WHERE id = ?', [bm.id]);
    const isNew = !existing;

    await conn.query(
      `INSERT INTO dba_bookmakers
         (id, name, brand_color, secondary_color, logo_bg, logo_fg, initials,
          default_logo_image_url, default_logo_image_url_no_bg, use_no_bg_logo, dedicated_logo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         brand_color = VALUES(brand_color),
         secondary_color = VALUES(secondary_color),
         logo_bg = VALUES(logo_bg),
         logo_fg = VALUES(logo_fg),
         initials = VALUES(initials),
         default_logo_image_url = VALUES(default_logo_image_url),
         default_logo_image_url_no_bg = VALUES(default_logo_image_url_no_bg),
         use_no_bg_logo = VALUES(use_no_bg_logo),
         dedicated_logo = VALUES(dedicated_logo)`,
      [
        bm.id, bm.name, bm.brandColor || null, bm.secondaryColor || null,
        bm.logoBg || null, bm.logoFg || null, bm.initials || null,
        bm.defaultLogoImageUrl || null, bm.defaultLogoImageUrlNoBg || null,
        bm.useNoBgLogo ? 1 : 0,
        bm.dedicatedLogo ? JSON.stringify(bm.dedicatedLogo) : null,
      ],
    );

    // Replace the variants set wholesale — handles deletes from the form too.
    await conn.query('DELETE FROM dba_bookmaker_variants WHERE bookmaker_id = ?', [bm.id]);
    const variants = bm.variants || {};
    for (const [cc, v] of Object.entries(variants)) {
      await conn.query(
        `INSERT INTO dba_bookmaker_variants
           (bookmaker_id, country_code, affiliate, status, modified, modified_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          bm.id, cc, v.affiliate || '', v.status || 'draft',
          v.modified ? new Date(v.modified) : new Date(),
          v.modifiedBy || 'D. Benvelgy',
        ],
      );
    }

    await conn.commit();
    await appendAuditEntry({
      kind: isNew ? 'add' : 'edit',
      who: bm.__actor || 'D. Benvelgy',
      text: isNew ? `Added ${bm.name} bookmaker` : `Edited ${bm.name} configuration`,
    });
    res.json(await fetchBookmaker(bm.id));
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// PATCH a single variant — used for status toggles and inline affiliate edits.
router.patch('/:id/variants/:cc', async (req, res, next) => {
  try {
    const { id, cc } = req.params;
    const patch = req.body || {};
    const [[bm]] = await pool.query('SELECT name FROM dba_bookmakers WHERE id = ?', [id]);
    if (!bm) return res.status(404).json({ error: 'Bookmaker not found' });

    // Build the SET clause dynamically from the patch keys we accept.
    const setFragments = [];
    const params = [];
    if (patch.affiliate !== undefined) { setFragments.push('affiliate = ?');   params.push(patch.affiliate); }
    if (patch.status    !== undefined) { setFragments.push('status = ?');      params.push(patch.status); }
    if (patch.modifiedBy !== undefined){ setFragments.push('modified_by = ?'); params.push(patch.modifiedBy); }
    // `modified` always bumps to either the supplied value or "now".
    setFragments.push('modified = ?');
    params.push(patch.modified ? new Date(patch.modified) : new Date());

    if (setFragments.length === 1) {
      // Only the auto-bumped `modified` would change — bail out.
      return res.status(400).json({ error: 'No patchable fields supplied' });
    }

    params.push(id, cc);
    const [result] = await pool.query(
      `UPDATE dba_bookmaker_variants SET ${setFragments.join(', ')}
       WHERE bookmaker_id = ? AND country_code = ?`,
      params,
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (patch.status === 'live') {
      await appendAuditEntry({ kind: 'publish', who: patch.modifiedBy || 'D. Benvelgy', text: `${bm.name} (${cc}) published Live` });
    } else if (patch.status === 'draft') {
      await appendAuditEntry({ kind: 'edit', who: patch.modifiedBy || 'D. Benvelgy', text: `${bm.name} (${cc}) moved to Draft` });
    } else if (patch.affiliate) {
      await appendAuditEntry({ kind: 'edit', who: patch.modifiedBy || 'D. Benvelgy', text: `Updated ${bm.name} (${cc}) affiliate link` });
    }
    res.json(await fetchBookmaker(id));
  } catch (err) { next(err); }
});

// DELETE one variant. If it was the last one, also remove the bookmaker —
// matches the JSON-era behaviour the frontend was built around.
router.delete('/:id/variants/:cc', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id, cc } = req.params;
    await conn.beginTransaction();
    const [[bm]] = await conn.query('SELECT name FROM dba_bookmakers WHERE id = ?', [id]);
    if (!bm) {
      await conn.rollback();
      return res.status(404).json({ error: 'Bookmaker not found' });
    }
    const [del] = await conn.query(
      'DELETE FROM dba_bookmaker_variants WHERE bookmaker_id = ? AND country_code = ?',
      [id, cc],
    );
    const [[{ remaining }]] = await conn.query(
      'SELECT COUNT(*) AS remaining FROM dba_bookmaker_variants WHERE bookmaker_id = ?',
      [id],
    );
    if (remaining === 0) {
      await conn.query('DELETE FROM dba_bookmakers WHERE id = ?', [id]);
      await conn.commit();
      await appendAuditEntry({ kind: 'edit', who: 'D. Benvelgy', text: `Removed ${bm.name} (no countries left)` });
    } else {
      await conn.commit();
      if (del.affectedRows > 0) {
        await appendAuditEntry({ kind: 'edit', who: 'D. Benvelgy', text: `Removed ${bm.name} from ${cc}` });
      }
    }
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [[bm]] = await pool.query('SELECT name FROM dba_bookmakers WHERE id = ?', [req.params.id]);
    if (!bm) return res.status(404).json({ error: 'Bookmaker not found' });
    await pool.query('DELETE FROM dba_bookmakers WHERE id = ?', [req.params.id]); // cascades to variants
    await appendAuditEntry({ kind: 'edit', who: 'D. Benvelgy', text: `Deleted ${bm.name}` });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
