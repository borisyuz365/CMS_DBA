// Run: node --test gam/threeBm.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isThreeBmTemplate,
  defaultThreeBmConfig,
  normalizeThreeBmTemplate,
  buildThreeBmCreative,
  validateThreeBmForExport,
  KIND_3BM,
} = require('./threeBm');
const { variableSchemaFor, buildCreativeTemplate, applyInlineValues } = require('./templateBuilder');
const fs = require('fs');
const path = require('path');

describe('threeBm model', () => {
  it('detects kind=3bm on template or config', () => {
    assert.equal(isThreeBmTemplate({ kind: KIND_3BM }), true);
    assert.equal(isThreeBmTemplate({ config: { kind: KIND_3BM } }), true);
    assert.equal(isThreeBmTemplate({ kind: 'standard' }), false);
  });

  it('normalizes exactly 3 sections', () => {
    const tpl = normalizeThreeBmTemplate({
      kind: '3bm',
      name: 'Test',
      config: { sections: [{ bookmakerId: 'bk_1' }] },
    });
    assert.equal(tpl.config.sections.length, 3);
    assert.equal(tpl.config.sections[0].bookmakerId, 'bk_1');
    assert.equal(tpl.sizeId, '300x250');
  });
});

describe('variableSchemaFor 3bm', () => {
  it('returns Bypass + OS_Type when payloadLink', () => {
    const vars = variableSchemaFor({ kind: '3bm', payloadLink: true });
    assert.deepEqual(vars.map((v) => v.uniqueName), ['Bypass', 'OS_Type']);
  });

  it('returns Bypass only for static-only 3bm', () => {
    const vars = variableSchemaFor({ kind: '3bm', payloadLink: false });
    assert.deepEqual(vars.map((v) => v.uniqueName), ['Bypass']);
  });
});

describe('buildThreeBmCreative', () => {
  const bookmakersById = {
    bk_14: { id: 'bk_14', name: 'Bet365', defaultLogoImageUrl: 'https://example.com/365.png' },
    bk_2: { id: 'bk_2', name: 'Betsson', defaultLogoImageUrl: 'https://example.com/bs.png' },
    bk_3: { id: 'bk_3', name: 'Entain', defaultLogoImageUrl: 'https://example.com/en.png' },
  };
  const variantsByKey = {
    'bk_2:IT': { affiliate: 'https://record.betsson.it/x?payload=MPU__$GUID' },
    'bk_3:IT': { affiliate: 'https://mediaserver.entainpartners.com/x?tdpeh=MPU__$GUID' },
  };

  function baseTpl(sections) {
    return {
      id: 'tpl_3bm',
      name: 'IT Triple',
      kind: '3bm',
      sizeId: '300x250',
      config: defaultThreeBmConfig({
        sections: sections.map((s) => ({ ...s, headline: 'Offer', ctaText: 'Bet' })),
      }),
    };
  }

  it('bakes static affiliates and payload-link for Bet365 without bet365_cta_url', () => {
    const creative = buildThreeBmCreative({
      dbaTemplate: baseTpl([
        { bookmakerId: 'bk_2', bg: '#111' },
        { bookmakerId: 'bk_14', bg: '#006a4e' },
        { bookmakerId: 'bk_3', bg: '#222' },
      ]),
      country: 'IT',
      bookmakersById,
      variantsByKey,
      feedBaseUrl: 'https://bettingads.example.com',
    });

    assert.equal(creative.payloadLink, true);
    assert.match(creative.inlineValues.sections_html, /data-payload-link="1"/);
    assert.match(creative.inlineValues.sections_html, /\$GUID/);
    assert.match(creative.inlineValues.sections_html, /data-cta-url=/);
    assert.doesNotMatch(creative.inlineValues.sections_html, /bet365_cta_url/i);
    assert.match(creative.inlineValues.feed_url, /GetPayload/);
    assert.match(creative.inlineValues.feed_url, /bmid=14/);
    assert.match(creative.inlineValues.root_attrs, /data-payload-feed="1"/);
    assert.match(creative.inlineValues.root_attrs, /AttNw/);
  });

  it('static-only 3bm has no feed root attrs', () => {
    const creative = buildThreeBmCreative({
      dbaTemplate: baseTpl([
        { bookmakerId: 'bk_2' },
        { bookmakerId: 'bk_3' },
        { bookmakerId: 'bk_2', affiliateOverride: 'https://example.com/a' },
      ]),
      country: 'IT',
      bookmakersById,
      variantsByKey,
    });
    assert.equal(creative.payloadLink, false);
    assert.equal(creative.inlineValues.feed_url, '');
    assert.equal(creative.inlineValues.root_attrs, '');
  });

  it('allows pool-only bookmaker with affiliateOverride (not in dba_bookmakers)', () => {
    const creative = buildThreeBmCreative({
      dbaTemplate: baseTpl([
        { bookmakerId: 'bk_170', bookmakerName: 'Eurobet', affiliateOverride: 'https://record.betpartners.it/x?$GUID' },
        { bookmakerId: 'bk_42', bookmakerName: 'Betsson', affiliateOverride: 'https://record.betsson.it/x?$GUID' },
        { bookmakerId: 'bk_14', bookmakerName: 'Bet365' },
      ]),
      country: 'IT',
      bookmakersById: {}, // nothing configured in DBA Bookmakers
      variantsByKey: {},
    });
    assert.equal(creative.payloadLink, true);
    assert.match(creative.inlineValues.sections_html, /data-payload-link="1"/);
    assert.match(creative.inlineValues.sections_html, /betpartners\.it/);
    assert.ok(!creative.validation.some((v) => /not found/i.test(v)));
  });

  it('export validation requires 3 bookmakers and countries', () => {
    const bad = validateThreeBmForExport({ kind: '3bm', config: { sections: [{}, {}, {}] } }, []);
    assert.ok(bad.errors.some((e) => /no countries/i.test(e)));
    assert.ok(bad.errors.some((e) => /no bookmaker/i.test(e)));
  });
});

describe('3bm CreativeTemplate bake', () => {
  it('builds snippet with inlined runtime and no [%bet365_cta_url%]', () => {
    const tplPath = path.join(__dirname, 'templates', '3bm-mpu.html');
    assert.ok(fs.existsSync(tplPath));

    const sectionsHtml = `
        <a href="%%CLICK_URL_UNESC%%https://x.com?g=$GUID" data-cta-url="https://x.com?g=$GUID" data-adv-id="%%ADVERTISING_IDENTIFIER_PLAIN%%" class="mpu-section" style="background-color: #111;">
            <div class="card-top-line"><img class="param-logo-img" src="a.png" style="height: 20px;" alt="Logo"><div class="param-headline">A</div></div>
            <div class="param-conditions">c</div><div class="param-cta-btn">Bet</div>
        </a>
        <a href="#" data-payload-link="1" data-click-tracker="%%CLICK_URL_UNESC%%" class="mpu-section" style="background-color: #006a4e;">
            <div class="card-top-line"><img class="param-logo-img" src="b.png" style="height: 20px;" alt="Logo"><div class="param-headline">B</div></div>
            <div class="param-conditions">c</div><div class="param-cta-btn">Bet</div>
        </a>
        <a href="%%CLICK_URL_UNESC%%https://y.com" data-cta-url="https://y.com" data-adv-id="%%ADVERTISING_IDENTIFIER_PLAIN%%" class="mpu-section" style="background-color: #222;">
            <div class="card-top-line"><img class="param-logo-img" src="c.png" style="height: 20px;" alt="Logo"><div class="param-headline">C</div></div>
            <div class="param-conditions">c</div><div class="param-cta-btn">Bet</div>
        </a>`;

    const dbaTemplate = {
      id: 'tpl_x',
      name: 'Triple',
      kind: '3bm',
      sizeId: '300x250',
      config: { kind: '3bm' },
    };

    const ct = buildCreativeTemplate(dbaTemplate, {
      payloadLink: true,
      bakedMarket: { country: 'IT', bookmakerIds: ['bk_2', 'bk_14', 'bk_3'] },
      inlineValues: {
        sections_html: sectionsHtml,
        root_attrs: 'data-feed="https://bettingads.example.com/GetPayload?cid=27&bmid=14&lang=1&placment=MPU" data-payload-feed="1" data-network="%%PATTERN:AttNw%%" data-campaign="%%PATTERN:AttCmp%%"',
        feed_url: 'https://bettingads.example.com/GetPayload?cid=27&bmid=14&lang=1&placment=MPU',
        runtime_url: 'https://cms.example.com/dba-runtime.js',
      },
    });

    assert.equal(ct.kind, '3bm');
    assert.deepEqual(ct.variables.map((v) => v.uniqueName), ['Bypass', 'OS_Type']);
    assert.match(ct.snippet, /three-bm-mpu/);
    assert.match(ct.snippet, /data-payload-link="1"/);
    assert.match(ct.snippet, /generateClickGuid|DbaWireStaticCtaGuidClicks/);
    assert.doesNotMatch(ct.snippet, /\[%bet365_cta_url%\]/i);
    assert.ok(ct.remainingMacros.includes('Bypass'));
    assert.ok(ct.bakeValidation.ok, ct.bakeValidation.issues.join('; '));
  });

  it('applyInlineValues inserts sections_html raw', () => {
    const out = applyInlineValues('<div>[[sections_html]]</div>', {
      sections_html: '<a class="mpu-section">x</a>',
    });
    assert.equal(out, '<div><a class="mpu-section">x</a></div>');
  });
});
