// 3-bookie MPU (kind=3bm): stacked branding sections with mixed CTAs —
// static affiliate (+ optional $GUID) or Bet365 ExtraLinks via GetPayload Bookie.Link.
const {
  CID_FOR_COUNTRY,
  buildFeedUrl,
  buildFeedTargetingAttrs,
  isPayloadLinkBmid,
} = require('./previewAlign');
const { countryToLangId } = require('../routes/_dbaLang');
const { normalizeSizeId } = require('../utils/dbaSizes');

const KIND_3BM = '3bm';
const SECTION_COUNT = 3;

function isThreeBmTemplate(dbaTemplate) {
  const kind = dbaTemplate?.kind || dbaTemplate?.config?.kind;
  return kind === KIND_3BM;
}

function defaultSection(partial = {}) {
  return {
    bookmakerId: null,
    bg: '#151E22',
    logoUrl: '',
    logoHeight: 20,
    headline: '',
    headlineColor: '#FFFFFF',
    headlineSize: 12,
    headlineWeight: '700',
    conditions: '',
    conditionsColor: '#FFFFFF',
    conditionsSize: 8,
    conditionsWeight: '400',
    ctaText: 'Bet Now',
    ctaColor: '#0A0A0A',
    ctaBg: '#FFFFFF',
    ctaSize: 11,
    ctaWeight: '700',
    affiliateOverride: '',
    ...partial,
  };
}

function defaultThreeBmConfig(partial = {}) {
  const sections = Array.isArray(partial.sections) && partial.sections.length
    ? partial.sections.slice(0, SECTION_COUNT).map((s) => defaultSection(s || {}))
    : [defaultSection(), defaultSection(), defaultSection()];
  while (sections.length < SECTION_COUNT) sections.push(defaultSection());
  return {
    kind: KIND_3BM,
    ...partial,
    sections,
  };
}

/** Normalize incoming template body so config.kind and top-level kind stay in sync. */
function normalizeThreeBmTemplate(tpl) {
  if (!tpl || typeof tpl !== 'object') return tpl;
  const kind = tpl.kind || tpl.config?.kind;
  if (kind !== KIND_3BM) {
    if (tpl.config?.kind === KIND_3BM) {
      return { ...tpl, kind: KIND_3BM, config: defaultThreeBmConfig(tpl.config) };
    }
    return tpl;
  }
  const config = defaultThreeBmConfig({ ...(tpl.config || {}), kind: KIND_3BM });
  return {
    ...tpl,
    kind: KIND_3BM,
    sizeId: normalizeSizeId(tpl.sizeId || '300x250'),
    size: tpl.size || '3-Bookie MPU · fluid',
    bookmakerId: tpl.bookmakerId || null,
    config,
  };
}

function parseBmid(bookmakerId) {
  if (!bookmakerId) return null;
  const n = parseInt(String(bookmakerId).replace(/^bk_/, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function sectionIsPayloadLink(section, bookmaker) {
  const bmid = parseBmid(bookmaker?.id || section?.bookmakerId);
  return isPayloadLinkBmid(bmid);
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveSectionAffiliate(section, variant) {
  const override = (section.affiliateOverride || '').trim();
  if (override) return override;
  return (variant && (variant.affiliate || variant.Affiliate)) || '';
}

function sectionAnchorAttrs({ payloadLink, affiliate }) {
  if (payloadLink) {
    return {
      href: '#',
      attrs: ' data-payload-link="1" data-click-tracker="%%CLICK_URL_UNESC%%"',
    };
  }
  const dest = affiliate || '';
  return {
    href: `%%CLICK_URL_UNESC%%${dest}`,
    attrs: ` data-cta-url="${escapeAttr(dest)}" data-adv-id="%%ADVERTISING_IDENTIFIER_PLAIN%%"`,
  };
}

function renderSectionHtml(section, { payloadLink, affiliate, index }) {
  const { href, attrs } = sectionAnchorAttrs({ payloadLink, affiliate });
  const logoH = Number(section.logoHeight) || 20;
  const note = payloadLink
    ? ' (Bet365 — GetPayload Bookie.Link)'
    : (affiliate.includes('$GUID') || affiliate.includes('$guid') ? ' (static + $GUID)' : ' (static)');
  return `        <!-- Section ${index + 1}${note} -->
        <a href="${escapeAttr(href)}"${attrs} target="_blank" class="mpu-section" style="background-color: ${escapeAttr(section.bg || '#151E22')};">
            <div class="card-top-line">
                <img class="param-logo-img" src="${escapeAttr(section.logoUrl || '')}" style="height: ${logoH}px;" alt="Logo">
                <div class="param-headline" style="color: ${escapeAttr(section.headlineColor)}; font-size: ${Number(section.headlineSize) || 12}px; font-weight: ${escapeAttr(section.headlineWeight || '700')};">${escapeHtml(section.headline)}</div>
            </div>
            <div class="param-conditions" style="color: ${escapeAttr(section.conditionsColor || section.headlineColor || '#FFFFFF')}; font-size: ${Number(section.conditionsSize) || 8}px; font-weight: ${escapeAttr(section.conditionsWeight || '400')};">${escapeHtml(section.conditions)}</div>
            <div class="param-cta-btn" style="color: ${escapeAttr(section.ctaColor)}; background-color: ${escapeAttr(section.ctaBg)}; font-size: ${Number(section.ctaSize) || 11}px; font-weight: ${escapeAttr(section.ctaWeight || '700')};">${escapeHtml(section.ctaText || 'Bet Now')}</div>
        </a>`;
}

/**
 * Build per-country Creative + inline bake values for a 3BM template.
 * bookmakersById: { [id]: bookmakerJs }
 * variantsByKey: { [`${bmId}:${cc}`]: variantRow }
 */
function buildThreeBmCreative({
  dbaTemplate,
  country,
  bookmakersById = {},
  variantsByKey = {},
  previousId = null,
  feedBaseUrl,
  runtimeUrl,
}) {
  if (!dbaTemplate) throw new Error('dbaTemplate required');
  if (!country) throw new Error('country required');

  const config = defaultThreeBmConfig(dbaTemplate.config || {});
  const sections = config.sections;
  const validation = [];
  const sectionMeta = [];
  let hasPayloadLink = false;
  let payloadBmid = null;

  for (let i = 0; i < SECTION_COUNT; i++) {
    const section = sections[i] || defaultSection();
    // Pool-picked bookmakers may not exist in dba_bookmakers — that's OK.
    // Export uses section visuals + affiliateOverride (or DBA variant when present).
    const bm = bookmakersById[section.bookmakerId] || null;
    if (!section.bookmakerId) {
      validation.push(`section ${i + 1}: bookmakerId is required`);
    }
    const payloadLink = sectionIsPayloadLink(section, bm || { id: section.bookmakerId });
    const variant = variantsByKey[`${section.bookmakerId}:${country}`] || null;
    let affiliate = '';
    if (payloadLink) {
      hasPayloadLink = true;
      payloadBmid = parseBmid(bm?.id || section.bookmakerId);
    } else {
      affiliate = resolveSectionAffiliate(section, variant);
      if (!affiliate) {
        validation.push(
          `section ${i + 1}: affiliate URL empty for ${section.bookmakerId}/${country}`
          + (bm ? '' : ' — not in DBA Bookmakers; set section affiliateOverride'),
        );
      } else if (!/^https?:\/\//i.test(affiliate)) {
        validation.push(`section ${i + 1}: affiliate must start with http(s)://`);
      }
    }
    const bmidNum = parseBmid(section.bookmakerId);
    const logoUrl = (section.logoUrl || '').trim()
      || bm?.defaultLogoImageUrl
      || bm?.default_logo_image_url
      || (Number.isFinite(bmidNum)
        ? `https://res.cloudinary.com/scores365/image/upload/w_140,h_140,c_limit,d_countries:default.png/BookMakers/${bmidNum}`
        : '');
    const displayBm = bm || {
      id: section.bookmakerId,
      name: section.bookmakerName || section.bookmakerId || 'Bookmaker',
      defaultLogoImageUrl: logoUrl,
    };
    sectionMeta.push({
      section: { ...section, logoUrl: logoUrl || section.logoUrl },
      bookmaker: displayBm,
      payloadLink,
      affiliate,
    });
  }

  const cidNumeric = CID_FOR_COUNTRY[country];
  if (cidNumeric == null) {
    validation.push(`cid falls back to country code "${country}" — no entry in CID_FOR_COUNTRY`);
  }
  if (hasPayloadLink) {
    validation.push(
      'Bet365 section(s): OS_Type and/or User_OS; AttNw/AttCmp via GAM patterns → GetPayload Bookie.Link (no [%bet365_cta_url%])',
    );
  }

  const sectionsHtml = sectionMeta
    .map((m, i) => renderSectionHtml(m.section, {
      payloadLink: m.payloadLink,
      affiliate: m.affiliate,
      index: i,
    }))
    .join('\n\n');

  let rootAttrs = '';
  let feedUrl = '';
  if (hasPayloadLink && Number.isFinite(payloadBmid)) {
    feedUrl = buildFeedUrl({
      country,
      bmid: payloadBmid,
      cmsLangId: countryToLangId(country) || 1,
      sizeId: '300x250',
      feedBaseUrl,
      payloadLink: true,
    });
    const targeting = buildFeedTargetingAttrs(true);
    rootAttrs = `data-feed="${escapeAttr(feedUrl)}" ${targeting}`.trim();
  }

  const runtime = runtimeUrl
    || process.env.DBA_RUNTIME_URL
    || 'https://cms.365scores.com/dba-runtime.js';

  const names = sectionMeta
    .map((m) => m.bookmaker?.name || m.section.bookmakerId || '?')
    .join(' · ');

  return {
    operation: previousId ? 'UPDATE' : 'CREATE',
    id: previousId || null,
    name: `3BM · ${country} · ${dbaTemplate.name}`,
    size: { width: 300, height: 250, isAspectRatio: false },
    creativeTemplateId: dbaTemplate.gam_creative_template_id || null,
    creativeTemplateIdPending: !dbaTemplate.gam_creative_template_id,
    market: {
      country,
      bookmakerId: null,
      bookmakerIds: sectionMeta.map((m) => m.section.bookmakerId).filter(Boolean),
      languageId: countryToLangId(country) || 1,
      kind: KIND_3BM,
    },
    creativeTemplateVariableValues: hasPayloadLink
      ? [] // OS_Type filled by AdOps in GAM
      : [],
    inlineValues: {
      sections_html: sectionsHtml,
      root_attrs: rootAttrs,
      feed_url: feedUrl,
      runtime_url: runtime,
      bookmaker_name: names,
    },
    validation,
    payloadLink: hasPayloadLink,
    sectionMeta: sectionMeta.map((m) => ({
      bookmakerId: m.section.bookmakerId,
      payloadLink: m.payloadLink,
      affiliate: m.payloadLink ? '' : m.affiliate,
    })),
  };
}

function validateThreeBmForExport(dbaTemplate, countries = []) {
  const errors = [];
  const warnings = [];
  if (!isThreeBmTemplate(dbaTemplate)) {
    errors.push('Not a 3bm template');
    return { errors, warnings };
  }
  const config = defaultThreeBmConfig(dbaTemplate.config || {});
  if (config.sections.length !== SECTION_COUNT) {
    errors.push(`Expected ${SECTION_COUNT} sections, got ${config.sections.length}`);
  }
  config.sections.forEach((s, i) => {
    if (!s.bookmakerId) errors.push(`Section ${i + 1} has no bookmaker`);
  });
  if (!countries.length) errors.push('Template has no countries assigned');
  return { errors, warnings };
}

module.exports = {
  KIND_3BM,
  SECTION_COUNT,
  isThreeBmTemplate,
  defaultSection,
  defaultThreeBmConfig,
  normalizeThreeBmTemplate,
  parseBmid,
  sectionIsPayloadLink,
  buildThreeBmCreative,
  validateThreeBmForExport,
  resolveSectionAffiliate,
};
