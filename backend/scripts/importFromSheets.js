// Import every Google Sheet BettingAdsService reads into MySQL.
// Uses the service account from BettingAdsService (read-only scopes).
//
// Usage:
//   node backend/scripts/importFromSheets.js
//
// Side-effects:
//   - TRUNCATEs and reloads every dba_* mirror table for each Sheet tab.
//   - TRUNCATEs dba_bookmakers / dba_bookmaker_variants / dba_templates and
//     re-derives dba_bookmakers from the imported Bookie Settings so the CMS
//     frontend keeps working.
//   - dba_audit_log and dba_service_state are not touched.
//
// Env:
//   GOOGLE_CREDS_PATH  default: ../../BettingAdsService/ConfigurationManager/credentials.json
//   MYSQL_*            see backend/db/mysql.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { pool } = require('../db/mysql');

const CREDS_PATH = process.env.GOOGLE_CREDS_PATH
  || path.join(__dirname, '..', '..', '..', 'BettingAdsService', 'ConfigurationManager', 'credentials.json');

const WORKBOOKS = {
  dbaTemplates:    '1Cokj0xbhYV2JVtEdQfM9CQthnJfyYY4Clm-5v9dCYrc',
  betBoost:        '1I50_UcyIW-gX1AjZ6_-zs06JtdRader2VcWwUUjuRt4',
  topFollowers:    '1DtRpg6-Q3pK3Nry2Pya5328RwH80hpLZ0HgkCo04sq0',
  gamesLoading:    '1lcahOrWv7L8r1gVU7ZEgW0x49Sh796Zv2Ox40RFzHew',
  // dbaManagement is resolved by name via the Drive API at runtime.
};

// ---- helpers ------------------------------------------------------------

function toInt(v) {
  if (v == null || v === '') return null;
  const n = parseInt(String(v).replace(/[, ]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function toStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function splitList(v) {
  if (!v) return [];
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

// Returns true if the error is a permission/access problem we should skip.
function isAccessError(err) {
  const m = (err && err.message) || '';
  return err && (err.code === 403 || err.code === 404 ||
    /does not have permission|requested entity was not found/i.test(m));
}

// Run an importer block and swallow access errors (logging them).
async function tryWorkbook(label, fn) {
  try { await fn(); }
  catch (err) {
    if (isAccessError(err)) {
      console.log(`  SKIPPED ${label}: ${err.message.split('.')[0]}.`);
      return;
    }
    throw err;
  }
}

// Read a whole tab as objects keyed by row-1 header.
async function readTab(sheets, spreadsheetId, tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return { headers: rows[0] || [], records: [] };
  const headers = rows[0].map((h) => String(h).trim());
  const records = rows.slice(1).map((row) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i] ?? null; });
    return o;
  });
  return { headers, records };
}

async function resolveDbaManagementId(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const res = await drive.files.list({
    q: "name = 'DBA New Management File' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    pageSize: 5,
    fields: 'files(id, name, modifiedTime)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const files = res.data.files || [];
  if (files.length === 0) {
    throw new Error("Could not find 'DBA New Management File' shared with the service account.");
  }
  if (files.length > 1) {
    console.warn(`  multiple "DBA New Management File" matches; using newest`);
    files.sort((a, b) => (b.modifiedTime || '').localeCompare(a.modifiedTime || ''));
  }
  return files[0].id;
}

// Wipe + bulk-insert helper. `cols` defines column order; `rowMap(record) => array`
// produces values in the same order. Skips records where rowMap returns null.
async function reloadTab(conn, label, table, cols, records, rowMap) {
  await conn.query(`DELETE FROM ${table}`);
  let inserted = 0, skipped = 0;
  for (const r of records) {
    const values = rowMap(r);
    if (values === null) { skipped += 1; continue; }
    await conn.query(
      // REPLACE INTO so duplicate primary/unique keys in the source sheet don't
      // crash the import; last occurrence wins.
      `REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      values,
    );
    inserted += 1;
  }
  console.log(`  ${label}: ${inserted} rows${skipped ? ` (${skipped} skipped)` : ''}`);
}

// ---- main ---------------------------------------------------------------

(async () => {
  if (!fs.existsSync(CREDS_PATH)) {
    console.error(`credentials.json not found at ${CREDS_PATH}`);
    process.exit(2);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  console.log('Resolving "DBA New Management File"...');
  const dbaMgmtId = await resolveDbaManagementId(authClient);
  console.log(`  id: ${dbaMgmtId}`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ===== DBA New Management File =====
    console.log('\n[DBA New Management File]');

    // DBA Service Activation — actual headers: Country, CID, Language, Lang,
    // Bookie, BMID, SportTypes, MaxDays, IsExistAd, WhichFormatExist
    {
      const { records } = await readTab(sheets, dbaMgmtId, 'DBA Service Activation');
      await reloadTab(conn, 'DBA Service Activation', 'dba_service_activation',
        ['cid', 'lang_id', 'bmid', 'country', 'language', 'bookie', 'sport_types',
         'max_days', 'is_exist_ad', 'which_format_exist'],
        records,
        (r) => {
          const cid = toInt(r.CID), lang = toInt(r.Lang), bmid = toInt(r.BMID);
          if (cid == null || lang == null || bmid == null) return null;
          return [cid, lang, bmid, toStr(r.Country), toStr(r.Language), toStr(r.Bookie),
                  toStr(r.SportTypes), toInt(r.MaxDays),
                  toStr(r.IsExistAd), toStr(r.WhichFormatExist)];
        },
      );
    }

    // Bookie Settings — actual headers: App, Bookie, BMID, "Color 1", "Color 2",
    // "Disclaimer Text", "Disclaimer Link", "CTA BGColor", "CTA TextColor",
    // "Text Bold Color", "Competitors Logo Usage", "GUID Support"
    let bookieSettingsRecords;
    {
      const { records } = await readTab(sheets, dbaMgmtId, 'Bookie Settings');
      bookieSettingsRecords = records;
      await reloadTab(conn, 'Bookie Settings', 'dba_bookie_settings',
        ['bmid', 'app', 'bookie', 'color1', 'color2', 'disclaimer_text', 'disclaimer_link',
         'cta_bg_color', 'cta_text_color', 'text_bold_color',
         'competitors_logo_usage', 'guid_support'],
        records,
        (r) => {
          const bmid = toInt(r.BMID);
          if (bmid == null) return null;
          return [
            bmid, toStr(r.App), toStr(r.Bookie),
            toStr(r['Color 1']), toStr(r['Color 2']),
            toStr(r['Disclaimer Text']), toStr(r['Disclaimer Link']),
            toStr(r['CTA BGColor']), toStr(r['CTA TextColor']),
            toStr(r['Text Bold Color']),
            toStr(r['Competitors Logo Usage']),
            toStr(r['GUID Support']),
          ];
        },
      );
    }

    // Ads Settings — actual headers: App, Bookie, BMID, Country, CID, Language,
    // Lang, OS, "Segmentation / Configuration", Sport, Offer, Format, Theme,
    // "Opening Screen Title", "Opening Screen Text", "Bonus Screen Title",
    // "Bonus Screen Text", "CTAButton Text", "Odds Type", "Links (Array)"
    {
      const { records } = await readTab(sheets, dbaMgmtId, 'Ads Settings');
      await reloadTab(conn, 'Ads Settings', 'dba_ads_settings',
        ['app', 'bookie', 'bmid', 'country', 'cid', 'language', 'lang_id', 'os',
         'segmentation', 'sport', 'offer', 'format', 'theme',
         'opening_screen_title', 'opening_screen_text',
         'bonus_screen_title', 'bonus_screen_text',
         'cta_button_text', 'odds_type', 'links'],
        records,
        (r) => {
          // Skip blank rows / template placeholders.
          if (!toStr(r.Bookie) && !toInt(r.BMID)) return null;
          return [
            toStr(r.App), toStr(r.Bookie), toInt(r.BMID),
            toStr(r.Country), toInt(r.CID),
            toStr(r.Language), toInt(r.Lang),
            toStr(r.OS),
            toStr(r['Segmentation / Configuration']),
            toStr(r.Sport), toStr(r.Offer), toStr(r.Format), toStr(r.Theme),
            toStr(r['Opening Screen Title']), toStr(r['Opening Screen Text']),
            toStr(r['Bonus Screen Title']),  toStr(r['Bonus Screen Text']),
            toStr(r['CTAButton Text']), toStr(r['Odds Type']),
            JSON.stringify(splitList(r['Links (Array)'])),
          ];
        },
      );
    }

    // Themes — actual headers use spaces and include a "Text Bold Color" column
    // not described in the BettingAdsService manager.
    {
      const { records } = await readTab(sheets, dbaMgmtId, 'Themes');
      await reloadTab(conn, 'Themes', 'dba_themes',
        ['theme_name', 'color1', 'color2', 'disclaimer_text', 'disclaimer_link',
         'cta_button_bg_color', 'cta_button_text_color', 'text_bold_color', 'show_texture'],
        records,
        (r) => {
          const name = toStr(r['Theme Name']);
          if (!name) return null;
          return [name, toStr(r['Color 1']), toStr(r['Color 2']),
                  toStr(r['Disclaimer Text']), toStr(r['Disclaimer Link']),
                  toStr(r['CTAButton BGColor']), toStr(r['CTAButton TextColor']),
                  toStr(r['Text Bold Color']), toStr(r['Show Texture'])];
        },
      );
    }

    // ===== DBA Templates =====
    console.log('\n[DBA Templates]');
    await tryWorkbook('DBA Templates', async () => {
      {
        const { records } = await readTab(sheets, WORKBOOKS.dbaTemplates, 'Timing Templates');
        await reloadTab(conn, 'Timing Templates', 'dba_timing_templates',
          ['id', 'template_key', 'name', 'relevant_offers'],
          records,
          (r) => {
            const id = toInt(r.ID);
            if (id == null) return null;
            return [id, toStr(r.Key), toStr(r.Name), toStr(r['Relevant offers'] ?? r.RelevantOffers)];
          },
        );
      }
      {
        const { records, headers } = await readTab(sheets, WORKBOOKS.dbaTemplates, 'TT Params');
        const ttCols = headers.filter((h) => /^TT\d+$/i.test(h));
        await reloadTab(conn, 'TT Params', 'dba_tt_params',
          ['id', 'name', 'comment', 'param_values'],
          records,
          (r) => {
            const id = toInt(r.ID);
            if (id == null) return null;
            const vals = {};
            for (const c of ttCols) vals[c] = toInt(r[c]);
            return [id, toStr(r.Name), toStr(r.Comment), JSON.stringify(vals)];
          },
        );
      }
      {
        const { records } = await readTab(sheets, WORKBOOKS.dbaTemplates, 'Offer Templates');
        await reloadTab(conn, 'Offer Templates', 'dba_offer_templates',
          ['id', 'template_key', 'name', 'html_template'],
          records,
          (r) => {
            const id = toInt(r.ID);
            if (id == null) return null;
            return [id, toStr(r.Key), toStr(r.Name), toStr(r['HTML Template'] ?? r.HtmlTemplate)];
          },
        );
      }
      {
        const { records, headers } = await readTab(sheets, WORKBOOKS.dbaTemplates, 'OT Params');
        const otCols = headers.filter((h) => /^OT\d+$/i.test(h));
        await reloadTab(conn, 'OT Params', 'dba_ot_params',
          ['id', 'name', 'comment', 'param_values'],
          records,
          (r) => {
            const id = toInt(r.ID);
            if (id == null) return null;
            const vals = {};
            for (const c of otCols) vals[c] = toInt(r[c]);
            return [id, toStr(r.Name), toStr(r.Comment), JSON.stringify(vals)];
          },
        );
      }
    });

    // ===== BetBoost =====
    console.log('\n[BetBoost]');
    await tryWorkbook('BetBoost', async () => {
      {
        const { records } = await readTab(sheets, WORKBOOKS.betBoost, 'links');
        await reloadTab(conn, 'links', 'dba_betboost_links',
          ['cid', 'lang_id', 'bmid', 'fifth_button_bonus', 'fifth_button_boost',
           'gc_bonus', 'gc_boost', 'my_scores_bonus', 'my_scores_boost'],
          records,
          (r) => {
            const cid = toInt(r.cid), lang = toInt(r.lang), bmid = toInt(r.bmid);
            if (cid == null || lang == null || bmid == null) return null;
            return [cid, lang, bmid,
              toStr(r['5th_button_bonus']), toStr(r['5th_button_boost']),
              toStr(r.gc_bonus), toStr(r.gc_boost),
              toStr(r.my_scores_bonus), toStr(r.my_scores_boost)];
          },
        );
      }
      {
        const { records } = await readTab(sheets, WORKBOOKS.betBoost, 'promotions');
        await reloadTab(conn, 'promotions', 'dba_betboost_promotions',
          ['cid', 'lang_id', 'bmid', 'stars', 'rank_name',
           'title1', 'title2', 'title3', 'title4', 'title5', 'cta', 'image_url'],
          records,
          (r) => {
            const cid = toInt(r.cid), lang = toInt(r.lang), bmid = toInt(r.bmid);
            if (cid == null || lang == null || bmid == null) return null;
            return [cid, lang, bmid, toInt(r.stars), toStr(r.rank),
              toStr(r.title1), toStr(r.title2), toStr(r.title3), toStr(r.title4), toStr(r.title5),
              toStr(r.CTA ?? r.cta), toStr(r.image_url)];
          },
        );
      }
      {
        const { records } = await readTab(sheets, WORKBOOKS.betBoost, 'data sources');
        await reloadTab(conn, 'data sources', 'dba_betboost_data_sources',
          ['bmid', 'bookie', 'lang_id', 'lang_name', 'data_source_name'],
          records,
          (r) => {
            const bmid = toInt(r.bmid), lang = toInt(r.lang);
            if (bmid == null || lang == null) return null;
            return [bmid, toStr(r.bookie), lang, toStr(r.lang_name), toStr(r.data_source_name)];
          },
        );
      }
      {
        const { records } = await readTab(sheets, WORKBOOKS.betBoost, 'countries');
        await reloadTab(conn, 'countries', 'dba_betboost_countries',
          ['cid', 'name', 'langs', 'def_lang', 'bookies',
           'promoted_competitions', 'min_competitors_followers', 'min_competitions_followers'],
          records,
          (r) => {
            const cid = toInt(r.cid);
            if (cid == null) return null;
            return [cid, toStr(r.name), toStr(r.langs), toInt(r.def_lang),
              toStr(r.bookies), toStr(r.promoted_competitions),
              toInt(r.min_competitors_followers), toInt(r.min_competitions_followers)];
          },
        );
      }
    });

    // ===== Top Followers =====
    console.log('\n[Top Followers]');
    await tryWorkbook('Top Followers', async () => {
      const { records } = await readTab(sheets, WORKBOOKS.topFollowers, 'Data');
      await reloadTab(conn, 'Data', 'dba_top_followers',
        ['country_id', 'entity_type', 'entity_id', 'entity_name', 'followers'],
        records,
        (r) => {
          const cid = toInt(r.country_id), etype = toInt(r.entity_type), eid = toInt(r.entity_id);
          if (cid == null || etype == null || eid == null) return null;
          return [cid, etype, eid, toStr(r.entity_name), toInt(r.followers)];
        },
      );
    });

    // ===== Games Loading Configuration =====
    console.log('\n[Games Loading Configuration]');
    await tryWorkbook('Games Loading Configuration', async () => {
      const { records } = await readTab(sheets, WORKBOOKS.gamesLoading, 'Sheet1');
      await reloadTab(conn, 'Sheet1', 'dba_games_loading_config',
        ['country_id', 'lang_id', 'bookie_id', 'sport_types', 'max_days'],
        records,
        (r) => {
          const cid = toInt(r.CountryID), lang = toInt(r.LangID), bm = toInt(r.BookieID);
          if (cid == null || lang == null || bm == null) return null;
          return [cid, lang, bm, toStr(r.SportTypes), toInt(r.MaxDays)];
        },
      );
    });

    // ===== Re-derive CMS-facing tables =====
    // The frontend reads from dba_bookmakers / dba_bookmaker_variants / dba_templates.
    //  - dba_bookmakers     ← derived from imported Bookie Settings
    //  - dba_bookmaker_variants ← derived from imported Ads Settings (one variant
    //    per (bmid, country) with the first link as the affiliate URL)
    //  - dba_templates      ← reseeded from the 6 prototype templates (Sheets has
    //    no counterpart for the CMS ad-format concept)
    console.log('\n[CMS-facing tables]');
    await conn.query('DELETE FROM dba_bookmaker_variants');
    await conn.query('DELETE FROM dba_templates');
    await conn.query('DELETE FROM dba_bookmakers');

    const cloudinary = 'https://res.cloudinary.com/scores365/image/upload/w_140,h_140,c_limit,d_countries:default.png/BookMakers';
    const initialsFor = (name) => {
      if (!name) return 'BM';
      const clean = name.replace(/[^A-Za-z0-9 ]/g, '').trim();
      if (!clean) return 'BM';
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return clean.slice(0, 3).toUpperCase();
    };

    let derived = 0;
    for (const r of bookieSettingsRecords) {
      const bmid = toInt(r.BMID);
      const bookie = toStr(r.Bookie);
      if (bmid == null || !bookie) continue;
      const color1 = toStr(r['Color 1']);
      const color2 = toStr(r['Color 2']);
      await conn.query(
        // REPLACE INTO so a duplicate BMID in Bookie Settings doesn't crash the
        // derivation; last occurrence wins (matches REPLACE behaviour above).
        `REPLACE INTO dba_bookmakers
           (id, name, brand_color, secondary_color, logo_bg, logo_fg, initials,
            default_logo_image_url, default_logo_image_url_no_bg, use_no_bg_logo, dedicated_logo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `bk_${bmid}`, bookie, color1, color2,
          color1, '#FFFFFF', initialsFor(bookie),
          `${cloudinary}/${bmid}`, `${cloudinary}/NoBG/${bmid}`,
          0, null,
        ],
      );
      derived += 1;
    }
    console.log(`  derived ${derived} bookmakers from Bookie Settings`);

    // ----- dba_bookmaker_variants from dba_ads_settings -----
    // Country names → ISO codes (frontend's DBA_COUNTRIES uses ISO).
    const countryCodeFor = {
      Argentina: 'AR', Brazil: 'BR', Chile: 'CL', Colombia: 'CO',
      Ecuador: 'EC', Mexico: 'MX', Peru: 'PE', Poland: 'PL',
      'United States': 'US', 'United Kingdom': 'UK', Germany: 'DE',
      Spain: 'ES', Italy: 'IT', Australia: 'AU', Canada: 'CA', Global: 'GLOBAL',
    };
    // Prefer the row whose Format = "All" when multiple rows share (bmid, country).
    // mysql2's JSON columns come back parsed; the link list is JSON.
    const [adsRows] = await conn.query(`
      SELECT bmid, country, links, format
      FROM dba_ads_settings
      WHERE bmid IS NOT NULL AND country IS NOT NULL AND links IS NOT NULL
      ORDER BY CASE WHEN format = 'All' THEN 0 ELSE 1 END, id
    `);
    const seen = new Set();
    let variants = 0, skippedNoCode = 0;
    for (const row of adsRows) {
      const cc = countryCodeFor[row.country];
      if (!cc) { skippedNoCode += 1; continue; }
      const bookmakerId = `bk_${row.bmid}`;
      const key = `${bookmakerId}|${cc}`;
      if (seen.has(key)) continue;  // first (preferred) row already inserted
      seen.add(key);
      const links = Array.isArray(row.links) ? row.links : [];
      const affiliate = links[0] || '';
      if (!affiliate) continue;
      // Skip if no matching bookmaker (FK would fail).
      const [[bm]] = await conn.query('SELECT id FROM dba_bookmakers WHERE id = ?', [bookmakerId]);
      if (!bm) continue;
      await conn.query(
        `INSERT INTO dba_bookmaker_variants
           (bookmaker_id, country_code, affiliate, status, modified, modified_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bookmakerId, cc, affiliate, 'live', new Date(), 'sheets import'],
      );
      variants += 1;
    }
    console.log(`  derived ${variants} bookmaker variants from Ads Settings` +
      (skippedNoCode ? ` (${skippedNoCode} skipped: unmapped country)` : ''));

    // ----- dba_templates: reseed the 6 prototype templates -----
    const seedTemplates = [
      { id: 'tpl_mpu_v3', name: 'MPU Standard', sizeId: '300x250', size: 'MPU · 300×250', status: 'live',
        bookmakerId: 'bk_14',
        config: { bg: '#151E22', text: '#FFFFFF', cta: '#1976D2', ctaText: 'Bet Now', radius: 8, oddsFormat: 'decimal' } },
      { id: 'tpl_interstitial_v2', name: 'Interstitial Match Promo', sizeId: '320x480', size: 'Interstitial · 320×480', status: 'live',
        bookmakerId: 'bk_4',
        config: { bg: '#0B1419', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Bet Now', radius: 16, oddsFormat: 'decimal' } },
      { id: 'tpl_banner_v1', name: 'Mobile Banner', sizeId: '320x50', size: 'Banner · 320×50', status: 'live',
        bookmakerId: 'bk_9',
        config: { bg: '#FFFFFF', text: '#0A0A0A', cta: '#1976D2', ctaText: 'Bet Now', radius: 6, oddsFormat: 'decimal' } },
      { id: 'tpl_mpu_dark', name: 'MPU Dark (Promo)', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
        bookmakerId: 'bk_4',
        config: { bg: '#0A0A0A', text: '#FFFFFF', cta: '#FF495C', ctaText: 'Claim Bonus', radius: 16, oddsFormat: 'fractional',
          welcomeOffer: { enabled: true, headline: 'Claim £30 Bonus', subtext: 'Bet £10, get £30',
            terms: 'New customers only · 18+ · T&Cs apply', ctaText: 'Claim Now' } } },
      { id: 'tpl_mpu_minimal', name: 'MPU Minimal', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
        bookmakerId: 'bk_42',
        config: { bg: '#FAFAFA', text: '#0A0A0A', cta: '#2E7D32', ctaText: 'Bet Now', radius: 4, oddsFormat: 'american' } },
      { id: 'tpl_interstitial_welcome', name: 'Interstitial Welcome Bonus', sizeId: '320x480', size: 'Interstitial · 320×480',
        status: 'draft', bookmakerId: 'bk_14',
        config: { bg: '#1976D2', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Claim £30 Bonus', radius: 20, oddsFormat: 'decimal',
          welcomeOffer: { enabled: true, headline: 'Get £30 in Free Bets', subtext: 'Bet £10 · Get £30 in Free Bets',
            terms: 'New customers only · 18+ · BeGambleAware.org', ctaText: 'Claim Now' },
          affiliate: { enabled: true, url: 'https://promo.bookmaker.com/welcome?aff=365_INTER_v2' } } },
    ];
    let tpls = 0;
    for (const t of seedTemplates) {
      // Only seed if the bookmaker exists in the imported set.
      const [[bm]] = await conn.query('SELECT id FROM dba_bookmakers WHERE id = ?', [t.bookmakerId]);
      const bookmakerId = bm ? t.bookmakerId : null;
      await conn.query(
        `INSERT INTO dba_templates
           (id, name, size_id, size_label, status, bookmaker_id, config, modified, modified_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.sizeId, t.size, t.status, bookmakerId,
         JSON.stringify(t.config), new Date(), 'sheets import'],
      );
      tpls += 1;
    }
    console.log(`  reseeded ${tpls} prototype templates`);

    await conn.commit();
    console.log('\nDone.');
  } catch (err) {
    await conn.rollback();
    console.error('Import failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
