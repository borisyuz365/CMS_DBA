// One-shot seeder: writes backend/data/dba_*.json from the frontend mock data.
// Run once with `node backend/scripts/seedDbaData.js`; the route handlers take
// over after that. Safe to re-run — it will overwrite the JSON files.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const logoUrl = (numId, noBg = false) =>
  `https://res.cloudinary.com/scores365/image/upload/w_140,h_140,c_limit,d_countries:default.png/BookMakers/${noBg ? 'NoBG/' : ''}${numId}`;

const mkv = (affiliate, status, modified, modifiedBy, licenseNumber) => ({
  affiliate, status, modified, modifiedBy,
  ...(licenseNumber ? { licenseNumber } : {}),
});

const bookmakers = [
  { id: 'bk_14', name: 'Bet365',
    brandColor: '#007B5B', secondaryColor: '#FFDB00',
    logoBg: '#007B5B', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: logoUrl(14), defaultLogoImageUrlNoBg: logoUrl(14, true),
    variants: {
      GLOBAL: mkv('https://www.bet365.com/?aff=365scores',       'live',  '2026-04-29T14:32:00Z', 'D. Benvelgy'),
      UK:     mkv('https://www.bet365.com/uk/?aff=365scores_uk', 'live',  '2026-04-29T14:32:00Z', 'D. Benvelgy'),
      DE:     mkv('https://www.bet365.de/de/?aff=365scores_de',  'live',  '2026-04-28T11:10:00Z', 'M. Cohen'),
      ES:     mkv('https://www.bet365.es/es/?aff=365scores_es',  'live',  '2026-04-28T10:00:00Z', 'M. Cohen'),
      IT:     mkv('https://www.bet365.it/it/?aff=365scores_it',  'draft', '2026-04-27T09:15:00Z', 'A. Levi'),
      AU:     mkv('https://www.bet365.com.au/?aff=365scores_au', 'live',  '2026-04-26T14:00:00Z', 'D. Benvelgy'),
    }},
  { id: 'bk_7', name: '1xBet',
    brandColor: '#052E64', secondaryColor: '#105789',
    logoBg: '#052E64', logoFg: '#FFFFFF', initials: '1XB',
    defaultLogoImageUrl: logoUrl(7), defaultLogoImageUrlNoBg: logoUrl(7, true), useNoBgLogo: true,
    variants: {
      GLOBAL: mkv('https://1xbet.com/?aff=365_global', 'live', '2026-04-29T08:12:00Z', 'D. Benvelgy'),
      DE:     mkv('https://1xbet.de/?aff=365_de',     'live', '2026-04-28T09:30:00Z', 'M. Cohen'),
      BR:     mkv('https://1xbet.com.br/?aff=365_br', 'live', '2026-04-27T11:00:00Z', 'A. Levi'),
    }},
  { id: 'bk_4', name: 'BWIN',
    brandColor: '#000000', secondaryColor: '#B3A3A3',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BWI',
    defaultLogoImageUrl: logoUrl(4), defaultLogoImageUrlNoBg: logoUrl(4, true),
    variants: {
      GLOBAL: mkv('https://sports.bwin.com/?aff=365scores',     'live', '2026-04-28T09:15:00Z', 'M. Cohen'),
      DE:     mkv('https://sports.bwin.de/?aff=365scores_de',   'live', '2026-04-28T09:15:00Z', 'M. Cohen'),
      ES:     mkv('https://sports.bwin.es/?aff=365scores_es',   'live', '2026-04-27T13:00:00Z', 'A. Levi'),
      IT:     mkv('https://sports.bwin.it/?aff=365scores_it',   'live', '2026-04-26T15:30:00Z', 'A. Levi'),
    }},
  { id: 'bk_103', name: 'BetMGM',
    brandColor: '#000000', secondaryColor: '#000000',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: logoUrl(103), defaultLogoImageUrlNoBg: logoUrl(103, true),
    variants: {
      US: mkv('https://sports.betmgm.com/?wm=365_us',   'live', '2026-04-25T08:30:00Z', 'M. Cohen'),
      UK: mkv('https://sports.betmgm.co.uk/?wm=365_uk', 'live', '2026-04-24T11:00:00Z', 'M. Cohen'),
    }},
  { id: 'bk_9', name: 'BetWay',
    brandColor: '#000000', secondaryColor: '#FAFAFA',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: logoUrl(9), defaultLogoImageUrlNoBg: logoUrl(9, true),
    variants: {
      GLOBAL: mkv('https://betway.com/sport?aff=365',       'live',  '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      UK:     mkv('https://betway.com/uk/sport?aff=365_uk', 'live',  '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      DE:     mkv('https://betway.com/de/sport?aff=365_de', 'draft', '2026-04-18T15:00:00Z', 'A. Levi'),
      BR:     mkv('https://betway.com/br/sport?aff=365_br', 'live',  '2026-04-17T10:30:00Z', 'A. Levi'),
    }},
  { id: 'bk_139', name: 'SportingBet',
    brandColor: '#0573CD', secondaryColor: '#3D4C7C',
    logoBg: '#0573CD', logoFg: '#FFFFFF', initials: 'SPO',
    defaultLogoImageUrl: logoUrl(139), defaultLogoImageUrlNoBg: logoUrl(139, true), useNoBgLogo: true,
    variants: {
      BR: mkv('https://sports.sportingbet.com.br/?aff=365_br', 'live', '2026-04-13T09:00:00Z', 'D. Benvelgy', '247/2025'),
      DE: mkv('https://sports.sportingbet.de/?aff=365_de',     'live', '2026-04-12T14:30:00Z', 'M. Cohen'),
    }},
  { id: 'bk_42', name: 'Betsson',
    brandColor: '#FF7700', secondaryColor: '#FFFFFF',
    logoBg: '#FF7700', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: logoUrl(42), defaultLogoImageUrlNoBg: logoUrl(42, true),
    variants: {
      GLOBAL: mkv('https://www.betsson.com/?aff=365scores',     'live',  '2026-04-22T17:55:00Z', 'A. Levi'),
      DE:     mkv('https://www.betsson.de/?aff=365scores_de',   'draft', '2026-04-21T16:00:00Z', 'M. Cohen'),
      ES:     mkv('https://www.betsson.es/?aff=365scores_es',   'live',  '2026-04-22T17:55:00Z', 'A. Levi'),
      IT:     mkv('https://www.betsson.it/?aff=365scores_it',   'live',  '2026-04-21T16:00:00Z', 'M. Cohen'),
    }},
  { id: 'bk_156', name: 'NoviBet',
    brandColor: '#313541', secondaryColor: null,
    logoBg: '#313541', logoFg: '#FFFFFF', initials: 'NOV',
    defaultLogoImageUrl: logoUrl(156), defaultLogoImageUrlNoBg: logoUrl(156, true),
    variants: {
      GLOBAL: mkv('https://www.novibet.com/?aff=365_global', 'draft', '2026-04-20T10:11:00Z', 'M. Cohen'),
    }},
  { id: 'bk_161', name: 'Superbet',
    brandColor: '#EA060A', secondaryColor: '#C80505',
    logoBg: '#EA060A', logoFg: '#FFFFFF', initials: 'SUP',
    defaultLogoImageUrl: logoUrl(161), defaultLogoImageUrlNoBg: logoUrl(161, true),
    variants: {
      BR: mkv('https://superbet.com.br/?aff=365_br', 'live',  '2026-04-13T09:00:00Z', 'D. Benvelgy'),
      IT: mkv('https://superbet.it/?aff=365_it',     'live',  '2026-04-15T14:22:00Z', 'A. Levi'),
      ES: mkv('https://superbet.es/?aff=365_es',     'draft', '2026-04-14T11:00:00Z', 'A. Levi'),
    }},
  { id: 'bk_10', name: 'BetFair',
    brandColor: '#000000', secondaryColor: '#000000',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: logoUrl(10), defaultLogoImageUrlNoBg: logoUrl(10, true),
    variants: {
      GLOBAL: mkv('https://www.betfair.com/sport?aff=365scores',    'live', '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      UK:     mkv('https://www.betfair.com/sport?aff=365scores_uk', 'live', '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      IT:     mkv('https://www.betfair.it/sport?aff=365scores_it',  'live', '2026-04-18T15:00:00Z', 'A. Levi'),
    }},
];

const templates = [
  { id: 'tpl_mpu_v3', name: 'MPU Standard', sizeId: '300x250', size: 'MPU · 300×250', status: 'live',
    modified: '2026-04-30T10:30:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_14',
    config: { bg: '#151E22', text: '#FFFFFF', cta: '#1976D2', ctaText: 'Bet Now', radius: 8, oddsFormat: 'decimal' } },
  { id: 'tpl_interstitial_v2', name: 'Interstitial Match Promo', sizeId: '640x1280', size: 'Interstitial · 640×1280', status: 'live',
    modified: '2026-04-29T15:45:00Z', modifiedBy: 'M. Cohen', bookmakerId: 'bk_4',
    config: { bg: '#0B1419', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Bet Now', radius: 16, oddsFormat: 'decimal' } },
  { id: 'tpl_banner_v1', name: 'Mobile Banner', sizeId: '320x50', size: 'Banner · 320×50', status: 'live',
    modified: '2026-04-28T12:10:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_9',
    config: { bg: '#FFFFFF', text: '#0A0A0A', cta: '#1976D2', ctaText: 'Bet Now', radius: 6, oddsFormat: 'decimal' } },
  { id: 'tpl_mpu_dark', name: 'MPU Dark (Promo)', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
    modified: '2026-04-27T08:00:00Z', modifiedBy: 'A. Levi', bookmakerId: 'bk_4',
    config: { bg: '#0A0A0A', text: '#FFFFFF', cta: '#FF495C', ctaText: 'Claim Bonus', radius: 16, oddsFormat: 'fractional',
      welcomeOffer: { enabled: true, headline: 'Claim £30 Bonus', subtext: 'Bet £10, get £30',
        terms: 'New customers only · 18+ · T&Cs apply', ctaText: 'Claim Now' } } },
  { id: 'tpl_mpu_minimal', name: 'MPU Minimal', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
    modified: '2026-04-26T17:30:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_42',
    config: { bg: '#FAFAFA', text: '#0A0A0A', cta: '#2E7D32', ctaText: 'Bet Now', radius: 4, oddsFormat: 'american' } },
  { id: 'tpl_interstitial_welcome', name: 'Interstitial Welcome Bonus', sizeId: '640x1280', size: 'Interstitial · 640×1280',
    status: 'draft', modified: '2026-04-24T11:15:00Z', modifiedBy: 'M. Cohen', bookmakerId: 'bk_14',
    config: { bg: '#1976D2', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Claim £30 Bonus', radius: 20, oddsFormat: 'decimal',
      welcomeOffer: { enabled: true, headline: 'Get £30 in Free Bets', subtext: 'Bet £10 · Get £30 in Free Bets',
        terms: 'New customers only · 18+ · BeGambleAware.org', ctaText: 'Claim Now' },
      affiliate: { enabled: true, url: 'https://promo.bookmaker.com/welcome?aff=365_INTER_v2' } } },
];

const auditLog = [
  { kind: 'restart', who: 'D. Benvelgy', when: '2026-04-30T08:14:00Z', text: 'Restarted service' },
  { kind: 'publish', who: 'D. Benvelgy', when: '2026-04-30T08:10:00Z', text: 'Published MPU Standard (300×250)' },
  { kind: 'publish', who: 'M. Cohen',    when: '2026-04-29T15:45:00Z', text: 'Published Interstitial Match Promo (640×1280)' },
  { kind: 'edit',    who: 'A. Levi',     when: '2026-04-29T11:22:00Z', text: 'Updated BetWay affiliate link' },
  { kind: 'add',     who: 'D. Benvelgy', when: '2026-04-28T10:00:00Z', text: 'Added BetMGM bookmaker' },
  { kind: 'restart', who: 'M. Cohen',    when: '2026-04-26T16:30:00Z', text: 'Restarted service' },
  { kind: 'edit',    who: 'D. Benvelgy', when: '2026-04-25T13:15:00Z', text: 'Edited Mobile Banner template (320×50)' },
];

const serviceState = {
  lastRestartAt: '2026-04-30T08:14:00Z',
  lastRestartBy: 'D. Benvelgy',
  cooldownSeconds: 120,
};

fs.writeFileSync(path.join(DATA_DIR, 'dba_bookmakers.json'),  JSON.stringify(bookmakers, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'dba_templates.json'),   JSON.stringify(templates,  null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'dba_audit_log.json'),   JSON.stringify(auditLog,   null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'dba_service_state.json'), JSON.stringify(serviceState, null, 2));

console.log('Seeded dba_bookmakers.json, dba_templates.json, dba_audit_log.json, dba_service_state.json');
