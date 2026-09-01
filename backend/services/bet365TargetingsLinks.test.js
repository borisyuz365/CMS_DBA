// Unit tests for Bet365 Targetings ExtraLinks matching (LinksManager parity).
// Run: node --test services/bet365TargetingsLinks.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  mapLinks,
  pickLinkFromMap,
  getKey,
  stupidEncoded,
  maturityObject,
} = require('./bet365TargetingsLinks');

function extraLink(link, params) {
  return {
    Link: link,
    ContextParams: Object.entries(params).map(([K, V]) => ({ K, V })),
  };
}

const FIXTURE = {
  Targetings: [
    {
      CountryID: 21,
      PublisherName: 'Organic',
      Bookmakers: [
        {
          ID: 14,
          ExtraLinks: [
            extraLink('https://bet365.example/exact', {
              C: 'DBA',
              P: 'android',
              CA: 'summer',
              Format: 'Interstitial',
              Offer: '1x2',
              Price: '',
              Ordering: 'random',
              Scope: '',
            }),
            extraLink('https://bet365.example/campaign-only', {
              C: 'DBA',
              P: 'android',
              CA: 'summer',
              Format: '',
              Offer: '',
              Price: '',
              Ordering: '',
              Scope: '',
            }),
            extraLink('https://bet365.example/wk0-4', {
              C: 'DBA',
              P: 'ios',
              CA: '',
              Format: 'MPU',
              Offer: '1x2',
              Maturity: 'WK0-4',
            }),
            extraLink('https://bet365.example/wk5+', {
              C: 'DBA',
              P: 'ios',
              CA: '',
              Format: 'MPU',
              Offer: '1x2',
              Maturity: 'WK5+',
            }),
            extraLink('https://ignored.example/not-dba', {
              C: 'BOOST',
              P: 'android',
            }),
          ],
        },
        {
          ID: 99,
          ExtraLinks: [
            extraLink('https://other.example', { C: 'DBA', P: 'android' }),
          ],
        },
      ],
    },
    {
      CountryID: 21,
      PublisherName: 'Foo&Bar',
      Bookmakers: [
        {
          ID: 14,
          ExtraLinks: [
            extraLink('https://bet365.example/encoded-pub', {
              C: 'DBA',
              P: 'web',
              CA: 'a=b',
              Format: 'Banner',
              Offer: '1x2',
            }),
          ],
        },
      ],
    },
  ],
};

describe('stupidEncoded', () => {
  it('replaces special chars with underscore', () => {
    assert.equal(stupidEncoded('Foo&Bar'), 'Foo_Bar');
    assert.equal(stupidEncoded('a=b'), 'a_b');
  });
});

describe('maturityObject', () => {
  it('parses WK ranges and plus forms', () => {
    assert.deepEqual(maturityObject('WK0-4'), { maturity: 'WK0-4', min: 0, max: 4 });
    assert.deepEqual(maturityObject('WK5+'), { maturity: 'WK5+', min: 5, max: 1000000 });
  });
});

describe('mapLinks + pickLinkFromMap', () => {
  const lang = 1;
  const data = mapLinks(lang, FIXTURE, {});

  it('matches exact ExtraLink context', () => {
    const url = pickLinkFromMap(data, {
      bmid: 14,
      cid: 21,
      languageId: lang,
      platform: 'android',
      publisher: '', // Organic → ''
      campaignSource: 'summer',
      adFormat: 'Interstitial',
      offer: '1x2',
      ordering: 'random',
    });
    assert.equal(url, 'https://bet365.example/exact');
  });

  it('falls back to empty format/offer/ordering key (LinksManager campaign fallback)', () => {
    const url = pickLinkFromMap(data, {
      bmid: 14,
      cid: 21,
      languageId: lang,
      platform: 'android',
      publisher: '',
      campaignSource: 'summer',
      adFormat: 'UnknownFormat',
      offer: '1x2',
      ordering: 'top',
    });
    assert.equal(url, 'https://bet365.example/campaign-only');
  });

  it('picks maturity range when present', () => {
    const young = pickLinkFromMap(data, {
      bmid: 14,
      cid: 21,
      languageId: lang,
      platform: 'ios',
      publisher: '',
      campaignSource: '',
      adFormat: 'MPU',
      offer: '1x2',
      maturity: 2,
    });
    assert.equal(young, 'https://bet365.example/wk0-4');

    const older = pickLinkFromMap(data, {
      bmid: 14,
      cid: 21,
      languageId: lang,
      platform: 'ios',
      publisher: '',
      campaignSource: '',
      adFormat: 'MPU',
      offer: '1x2',
      maturity: 10,
    });
    assert.equal(older, 'https://bet365.example/wk5+');
  });

  it('matches stupidEncoded publisher/campaign alternate key', () => {
    const url = pickLinkFromMap(data, {
      bmid: 14,
      cid: 21,
      languageId: lang,
      platform: 'web',
      publisher: 'Foo_Bar',
      campaignSource: 'a_b',
      adFormat: 'Banner',
      offer: '1x2',
    });
    assert.equal(url, 'https://bet365.example/encoded-pub');
  });

  it('ignores non-DBA and non-Bet365 ExtraLinks', () => {
    const keyBoost = getKey({
      bmid: 14, country: 21, platform: 'android', lang: 1,
      publisher: '', campaign: '', format: '', offer: '', price: '', ordering: '', scope: '',
    });
    // campaign-only entry exists for android/summer empty format — ensure BOOST link was not stored as bare android key from BOOST context
    assert.notEqual(
      (data[keyBoost] && data[keyBoost].link) || null,
      'https://ignored.example/not-dba',
    );

    const otherBm = pickLinkFromMap(data, {
      bmid: 99,
      cid: 21,
      languageId: lang,
      platform: 'android',
    });
    assert.equal(otherBm, null);
  });

  it('returns null when nothing matches', () => {
    const url = pickLinkFromMap(data, {
      bmid: 14,
      cid: 999,
      languageId: lang,
      platform: 'android',
      campaignSource: 'nope',
      adFormat: 'Interstitial',
      offer: '1x2',
    });
    assert.equal(url, null);
  });
});
