// Sample data for the DBA Management screens.
// Mirrors the design prototype — wire to a real backend later.

export const DBA_COUNTRIES = [
  { code: 'GLOBAL', name: 'Global',          flag: '🌐' },
  { code: 'US',     name: 'United States',   flag: '🇺🇸' },
  { code: 'UK',     name: 'United Kingdom',  flag: '🇬🇧' },
  { code: 'DE',     name: 'Germany',         flag: '🇩🇪' },
  { code: 'ES',     name: 'Spain',           flag: '🇪🇸' },
  { code: 'IT',     name: 'Italy',           flag: '🇮🇹' },
  { code: 'BR',     name: 'Brazil',          flag: '🇧🇷' },
  { code: 'AU',     name: 'Australia',       flag: '🇦🇺' },
  { code: 'CA',     name: 'Canada',          flag: '🇨🇦' },
  // LATAM + Poland — countries the Sheets-derived variants reference.
  { code: 'AR',     name: 'Argentina',       flag: '🇦🇷' },
  { code: 'MX',     name: 'Mexico',          flag: '🇲🇽' },
  { code: 'CL',     name: 'Chile',           flag: '🇨🇱' },
  { code: 'CO',     name: 'Colombia',        flag: '🇨🇴' },
  { code: 'EC',     name: 'Ecuador',         flag: '🇪🇨' },
  { code: 'PE',     name: 'Peru',            flag: '🇵🇪' },
  { code: 'PL',     name: 'Poland',          flag: '🇵🇱' },
];

export const DBA_PLATFORMS = [
  { value: 'All',     label: 'All platforms' },
  { value: 'Android', label: 'Android' },
  { value: 'iOS',     label: 'iOS' },
];

const mkv = (affiliate, status, modified, modifiedBy, licenseNumber) => ({
  affiliate, status, modified, modifiedBy,
  ...(licenseNumber ? { licenseNumber } : {}),
});

// Helper for the seed data: build the Cloudinary CDN URL for a bookmaker's
// default logo. Mirrors the bookmakerLogoUrl() helper in dbaUtils.js — kept
// inline here so the data file is self-contained and easy to scan.
const _logoUrl = (numId, noBg = false) =>
  `https://res.cloudinary.com/scores365/image/upload/w_140,h_140,c_limit,d_countries:default.png/BookMakers/${noBg ? 'NoBG/' : ''}${numId}`;

// Offline fallback pool — used only when /api/dba/bookmaker-pool can't be
// reached (no VPN / DB down). IDs are real T_BET_BOOKMAKERS IDs so the
// "filter already-configured" dedupe in add mode behaves correctly. Online,
// the live endpoint replaces this whole list.
const _poolLogo = (numId, swatch, initials) => ({
  bg: swatch.bg, fg: swatch.fg, initials,
  imageUrl: _logoUrl(numId), imageUrlNoBg: _logoUrl(numId, true),
});
export const DBA_BOOKMAKER_POOL = [
  { id: 'bk_14',  name: 'Bet365',      defaultLogo: _poolLogo(14,  { bg: '#53D337', fg: '#0A0A0A' }, 'BET') },
  { id: 'bk_7',   name: '1xBet',       defaultLogo: _poolLogo(7,   { bg: '#E50914', fg: '#FFFFFF' }, '1XB') },
  { id: 'bk_4',   name: 'BWIN',        defaultLogo: _poolLogo(4,   { bg: '#BB9457', fg: '#0A0A0A' }, 'BWI') },
  { id: 'bk_103', name: 'BetMGM',      defaultLogo: _poolLogo(103, { bg: '#E50914', fg: '#FFFFFF' }, 'BET') },
  { id: 'bk_9',   name: 'BetWay',      defaultLogo: _poolLogo(9,   { bg: '#D40000', fg: '#FFFFFF' }, 'BET') },
  { id: 'bk_139', name: 'SportingBet', defaultLogo: _poolLogo(139, { bg: '#E50914', fg: '#FFFFFF' }, 'SPO') },
  { id: 'bk_42',  name: 'Betsson',     defaultLogo: _poolLogo(42,  { bg: '#14805E', fg: '#FFFFFF' }, 'BET') },
  { id: 'bk_156', name: 'NoviBet',     defaultLogo: _poolLogo(156, { bg: '#FFCC00', fg: '#0A0A0A' }, 'NOV') },
  { id: 'bk_161', name: 'Superbet',    defaultLogo: _poolLogo(161, { bg: '#003B71', fg: '#D4AF37' }, 'SUP') },
  { id: 'bk_10',  name: 'BetFair',     defaultLogo: _poolLogo(10,  { bg: '#FCE205', fg: '#0A0A0A' }, 'BET') },
  // Extras — not in the seeded configured list, so they show as addable.
  { id: 'bk_5',   name: 'William Hill', defaultLogo: _poolLogo(5,   { bg: '#1B3970', fg: '#FFFFFF' }, 'WIL') },
  { id: 'bk_12',  name: 'Betano',       defaultLogo: _poolLogo(12,  { bg: '#FF6900', fg: '#FFFFFF' }, 'BET') },
  { id: 'bk_30',  name: 'DraftKings',   defaultLogo: _poolLogo(30,  { bg: '#53D337', fg: '#0A0A0A' }, 'DRA') },
  { id: 'bk_31',  name: 'FanDuel',      defaultLogo: _poolLogo(31,  { bg: '#1493FF', fg: '#FFFFFF' }, 'FAN') },
  { id: 'bk_45',  name: 'Unibet',       defaultLogo: _poolLogo(45,  { bg: '#14805E', fg: '#FFFFFF' }, 'UNI') },
  { id: 'bk_51',  name: 'Caesars',      defaultLogo: _poolLogo(51,  { bg: '#003B71', fg: '#D4AF37' }, 'CAE') },
  { id: 'bk_70',  name: 'PaddyPower',   defaultLogo: _poolLogo(70,  { bg: '#004833', fg: '#FFFFFF' }, 'PAD') },
  { id: 'bk_88',  name: 'SkyBet',       defaultLogo: _poolLogo(88,  { bg: '#0072C6', fg: '#FFFFFF' }, 'SKY') },
  { id: 'bk_102', name: 'Tipico',       defaultLogo: _poolLogo(102, { bg: '#D40000', fg: '#FFFFFF' }, 'TIP') },
  { id: 'bk_220', name: 'Ladbrokes',    defaultLogo: _poolLogo(220, { bg: '#E20E17', fg: '#FFFFFF' }, 'LAD') },
];

// Seeded from /api/dba/bookmaker-pool — IDs match T_BET_BOOKMAKERS.BOOKMAKER_ID,
// brandColor / secondaryColor come from the DB's COLOR / SECONDARY_COLOR (ARGB int).
// logoBg / logoFg are kept as legacy fields that mirror the brand colour so older
// LogoThumb fallbacks still work when an image fails to load.
export const DBA_BOOKMAKERS = [
  // Bet365 — global
  { id: 'bk_14', name: 'Bet365',
    brandColor: '#007B5B', secondaryColor: '#FFDB00',
    logoBg: '#007B5B', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: _logoUrl(14), defaultLogoImageUrlNoBg: _logoUrl(14, true),
    variants: {
      GLOBAL: mkv('https://www.bet365.com/?aff=365scores',       'live',  '2026-04-29T14:32:00Z', 'D. Benvelgy'),
      UK:     mkv('https://www.bet365.com/uk/?aff=365scores_uk', 'live',  '2026-04-29T14:32:00Z', 'D. Benvelgy'),
      DE:     mkv('https://www.bet365.de/de/?aff=365scores_de',  'live',  '2026-04-28T11:10:00Z', 'M. Cohen'),
      ES:     mkv('https://www.bet365.es/es/?aff=365scores_es',  'live',  '2026-04-28T10:00:00Z', 'M. Cohen'),
      IT:     mkv('https://www.bet365.it/it/?aff=365scores_it',  'draft', '2026-04-27T09:15:00Z', 'A. Levi'),
      AU:     mkv('https://www.bet365.com.au/?aff=365scores_au', 'live',  '2026-04-26T14:00:00Z', 'D. Benvelgy'),
    }},
  // 1xBet — CIS / DE / BR (deep navy primary)
  { id: 'bk_7', name: '1xBet',
    brandColor: '#052E64', secondaryColor: '#105789',
    logoBg: '#052E64', logoFg: '#FFFFFF', initials: '1XB',
    defaultLogoImageUrl: _logoUrl(7), defaultLogoImageUrlNoBg: _logoUrl(7, true), useNoBgLogo: true,
    variants: {
      GLOBAL: mkv('https://1xbet.com/?aff=365_global', 'live', '2026-04-29T08:12:00Z', 'D. Benvelgy'),
      DE:     mkv('https://1xbet.de/?aff=365_de',     'live', '2026-04-28T09:30:00Z', 'M. Cohen'),
      BR:     mkv('https://1xbet.com.br/?aff=365_br', 'live', '2026-04-27T11:00:00Z', 'A. Levi'),
    }},
  // BWIN — global European (black + warm-grey secondary in DB)
  { id: 'bk_4', name: 'BWIN',
    brandColor: '#000000', secondaryColor: '#B3A3A3',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BWI',
    defaultLogoImageUrl: _logoUrl(4), defaultLogoImageUrlNoBg: _logoUrl(4, true),
    variants: {
      GLOBAL: mkv('https://sports.bwin.com/?aff=365scores',     'live',  '2026-04-28T09:15:00Z', 'M. Cohen'),
      DE:     mkv('https://sports.bwin.de/?aff=365scores_de',   'live',  '2026-04-28T09:15:00Z', 'M. Cohen'),
      ES:     mkv('https://sports.bwin.es/?aff=365scores_es',   'live',  '2026-04-27T13:00:00Z', 'A. Levi'),
      IT:     mkv('https://sports.bwin.it/?aff=365scores_it',   'live',  '2026-04-26T15:30:00Z', 'A. Levi'),
    }},
  // BetMGM — US / UK
  { id: 'bk_103', name: 'BetMGM',
    brandColor: '#000000', secondaryColor: '#000000',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: _logoUrl(103), defaultLogoImageUrlNoBg: _logoUrl(103, true),
    variants: {
      US: mkv('https://sports.betmgm.com/?wm=365_us',   'live', '2026-04-25T08:30:00Z', 'M. Cohen'),
      UK: mkv('https://sports.betmgm.co.uk/?wm=365_uk', 'live', '2026-04-24T11:00:00Z', 'M. Cohen'),
    }},
  // BetWay — global
  { id: 'bk_9', name: 'BetWay',
    brandColor: '#000000', secondaryColor: '#FAFAFA',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: _logoUrl(9), defaultLogoImageUrlNoBg: _logoUrl(9, true),
    variants: {
      GLOBAL: mkv('https://betway.com/sport?aff=365',       'live',  '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      UK:     mkv('https://betway.com/uk/sport?aff=365_uk', 'live',  '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      DE:     mkv('https://betway.com/de/sport?aff=365_de', 'draft', '2026-04-18T15:00:00Z', 'A. Levi'),
      BR:     mkv('https://betway.com/br/sport?aff=365_br', 'live',  '2026-04-17T10:30:00Z', 'A. Levi'),
    }},
  // SportingBet — BR / DE (blue primary)
  { id: 'bk_139', name: 'SportingBet',
    brandColor: '#0573CD', secondaryColor: '#3D4C7C',
    logoBg: '#0573CD', logoFg: '#FFFFFF', initials: 'SPO',
    defaultLogoImageUrl: _logoUrl(139), defaultLogoImageUrlNoBg: _logoUrl(139, true), useNoBgLogo: true,
    variants: {
      BR: mkv('https://sports.sportingbet.com.br/?aff=365_br', 'live', '2026-04-13T09:00:00Z', 'D. Benvelgy', '247/2025'),
      DE: mkv('https://sports.sportingbet.de/?aff=365_de',     'live', '2026-04-12T14:30:00Z', 'M. Cohen'),
    }},
  // Betsson — global European (orange primary)
  { id: 'bk_42', name: 'Betsson',
    brandColor: '#FF7700', secondaryColor: '#FFFFFF',
    logoBg: '#FF7700', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: _logoUrl(42), defaultLogoImageUrlNoBg: _logoUrl(42, true),
    variants: {
      GLOBAL: mkv('https://www.betsson.com/?aff=365scores',     'live',  '2026-04-22T17:55:00Z', 'A. Levi'),
      DE:     mkv('https://www.betsson.de/?aff=365scores_de',   'draft', '2026-04-21T16:00:00Z', 'M. Cohen'),
      ES:     mkv('https://www.betsson.es/?aff=365scores_es',   'live',  '2026-04-22T17:55:00Z', 'A. Levi'),
      IT:     mkv('https://www.betsson.it/?aff=365scores_it',   'live',  '2026-04-21T16:00:00Z', 'M. Cohen'),
    }},
  // NoviBet — global (dark slate)
  { id: 'bk_156', name: 'NoviBet',
    brandColor: '#313541', secondaryColor: null,
    logoBg: '#313541', logoFg: '#FFFFFF', initials: 'NOV',
    defaultLogoImageUrl: _logoUrl(156), defaultLogoImageUrlNoBg: _logoUrl(156, true),
    variants: {
      GLOBAL: mkv('https://www.novibet.com/?aff=365_global', 'draft', '2026-04-20T10:11:00Z', 'M. Cohen'),
    }},
  // Superbet — BR / IT / ES (red)
  { id: 'bk_161', name: 'Superbet',
    brandColor: '#EA060A', secondaryColor: '#C80505',
    logoBg: '#EA060A', logoFg: '#FFFFFF', initials: 'SUP',
    defaultLogoImageUrl: _logoUrl(161), defaultLogoImageUrlNoBg: _logoUrl(161, true),
    variants: {
      BR: mkv('https://superbet.com.br/?aff=365_br', 'live',  '2026-04-13T09:00:00Z', 'D. Benvelgy'),
      IT: mkv('https://superbet.it/?aff=365_it',     'live',  '2026-04-15T14:22:00Z', 'A. Levi'),
      ES: mkv('https://superbet.es/?aff=365_es',     'draft', '2026-04-14T11:00:00Z', 'A. Levi'),
    }},
  // BetFair — global / UK / IT
  { id: 'bk_10', name: 'BetFair',
    brandColor: '#000000', secondaryColor: '#000000',
    logoBg: '#000000', logoFg: '#FFFFFF', initials: 'BET',
    defaultLogoImageUrl: _logoUrl(10), defaultLogoImageUrlNoBg: _logoUrl(10, true),
    variants: {
      GLOBAL: mkv('https://www.betfair.com/sport?aff=365scores',    'live', '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      UK:     mkv('https://www.betfair.com/sport?aff=365scores_uk', 'live', '2026-04-19T09:00:00Z', 'D. Benvelgy'),
      IT:     mkv('https://www.betfair.it/sport?aff=365scores_it',  'live', '2026-04-18T15:00:00Z', 'A. Levi'),
    }},
];

export const DBA_AD_SIZES = [
  { id: '300x250',  kind: 'MPU',          label: 'MPU · 300×250',          short: '300×250',  w: 300, h: 250 },
  { id: '320x480', kind: 'Interstitial', label: 'Interstitial · 640×1280', short: '640×1280', w: 640, h: 1280 },
  { id: '320x50',   kind: 'Banner',       label: 'Banner · 320×50',         short: '320×50',   w: 320, h: 50 },
];

// Each template is associated with exactly one DBA-enabled bookmaker via `bookmakerId`.
export const DBA_TEMPLATES = [
  { id: 'tpl_mpu_v3', name: 'MPU Standard', sizeId: '300x250', size: 'MPU · 300×250', status: 'live',
    modified: '2026-04-30T10:30:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_14', // Bet365
    config: { bg: '#151E22', text: '#FFFFFF', cta: '#1976D2', ctaText: 'Bet Now', radius: 8, oddsFormat: 'decimal' } },
  { id: 'tpl_interstitial_v2', name: 'Interstitial Match Promo', sizeId: '320x480', size: 'Interstitial · 640×1280', status: 'live',
    modified: '2026-04-29T15:45:00Z', modifiedBy: 'M. Cohen', bookmakerId: 'bk_4', // BWIN
    config: { bg: '#0B1419', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Bet Now', radius: 16, oddsFormat: 'decimal' } },
  { id: 'tpl_banner_v1', name: 'Mobile Banner', sizeId: '320x50', size: 'Banner · 320×50', status: 'live',
    modified: '2026-04-28T12:10:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_9', // BetWay
    config: { bg: '#FFFFFF', text: '#0A0A0A', cta: '#1976D2', ctaText: 'Bet Now', radius: 6, oddsFormat: 'decimal' } },
  { id: 'tpl_mpu_dark', name: 'MPU Dark (Promo)', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
    modified: '2026-04-27T08:00:00Z', modifiedBy: 'A. Levi', bookmakerId: 'bk_4', // BWIN
    config: { bg: '#0A0A0A', text: '#FFFFFF', cta: '#FF495C', ctaText: 'Claim Bonus', radius: 16, oddsFormat: 'fractional',
      welcomeOffer: { enabled: true, headline: 'Claim £30 Bonus', subtext: 'Bet £10, get £30',
        terms: 'New customers only · 18+ · T&Cs apply', ctaText: 'Claim Now' } } },
  { id: 'tpl_mpu_minimal', name: 'MPU Minimal', sizeId: '300x250', size: 'MPU · 300×250', status: 'draft',
    modified: '2026-04-26T17:30:00Z', modifiedBy: 'D. Benvelgy', bookmakerId: 'bk_42', // Betsson
    config: { bg: '#FAFAFA', text: '#0A0A0A', cta: '#2E7D32', ctaText: 'Bet Now', radius: 4, oddsFormat: 'american' } },
  { id: 'tpl_interstitial_welcome', name: 'Interstitial Welcome Bonus', sizeId: '320x480', size: 'Interstitial · 640×1280',
    status: 'draft', modified: '2026-04-24T11:15:00Z', modifiedBy: 'M. Cohen', bookmakerId: 'bk_14', // Bet365
    config: { bg: '#1976D2', text: '#FFFFFF', cta: '#FFCC00', ctaText: 'Claim £30 Bonus', radius: 20, oddsFormat: 'decimal',
      welcomeOffer: { enabled: true, headline: 'Get £30 in Free Bets', subtext: 'Bet £10 · Get £30 in Free Bets',
        terms: 'New customers only · 18+ · BeGambleAware.org', ctaText: 'Claim Now' },
      affiliate: { enabled: true, url: 'https://promo.bookmaker.com/welcome?aff=365_INTER_v2' } } },
];

// Team `id`s match 365scores competitor IDs (verified via the public standings
// endpoint + Cloudinary 200 responses). Used by competitorLogoUrl() in dbaUtils
// to pull the real club crest; the colored circle + initials stay as a fallback
// when the image fails to load.
export const DBA_SAMPLE_MATCHES = [
  { date: '22/05 · 03:30', home: { id: 7766, name: 'Peñarol',       short: 'PEÑ', bg: '#F2C200', fg: '#1A1A1A' }, away: { id: 1267, name: 'Corinthians',   short: 'COR', bg: '#111111', fg: '#FFFFFF' }, odds: ['2.62', '3.30', '2.62'] },
  { date: '24/05 · 01:00', home: { id: 1269, name: 'Mirassol',      short: 'MIR', bg: '#FFC107', fg: '#1F4D2B' }, away: { id: 1216, name: 'Fluminense',    short: 'FLU', bg: '#7A1F2F', fg: '#FFFFFF' }, odds: ['2.65', '3.10', '2.55'] },
  // Long BR name — exercises interstitial team-name wrapping in AdPreview.
  { date: '18/05 · 00:30', home: { id: 1273, name: 'RB Bragantino', short: 'BRA', bg: '#E60023', fg: '#FFFFFF' }, away: { id: 1228, name: 'Associação Atlética Ponte Preta', short: 'PON', bg: '#0F0F0F', fg: '#E60023' }, odds: ['1.62', '3.80', '5.25'] },
  { date: '17/05 · 17:00', home: { id: 1224, name: 'Santos',        short: 'SAN', bg: '#FFFFFF', fg: '#111111' }, away: { id: 1212, name: 'Coritiba',      short: 'CFC', bg: '#1B5E20', fg: '#FFFFFF' }, odds: ['1.66', '3.60', '5.25'] },
  { date: '21/05 · 03:30', home: { id: 1215, name: 'Flamengo',      short: 'FLA', bg: '#C8102E', fg: '#FFFFFF' }, away: { id: 867,  name: 'Estudiantes',   short: 'EDLP',bg: '#E10600', fg: '#FFFFFF' }, odds: ['1.42', '4.50', '7.50'] },
  { date: '17/05 · 22:00', home: { id: 1767, name: 'Bahia',         short: 'BAH', bg: '#1565C0', fg: '#FFFFFF' }, away: { id: 1218, name: 'Grêmio',        short: 'GRE', bg: '#0C4A8C', fg: '#FFFFFF' }, odds: ['1.66', '3.90', '4.75'] },
  { date: '19/05 · 21:30', home: { id: 1222, name: 'Palmeiras',     short: 'PAL', bg: '#0E5C2F', fg: '#FFFFFF' }, away: { id: 1225, name: 'São Paulo',     short: 'SAO', bg: '#E60023', fg: '#FFFFFF' }, odds: ['1.95', '3.40', '3.60'] },
  { date: '20/05 · 19:00', home: { id: 1209, name: 'Atl. Mineiro',  short: 'CAM', bg: '#0B0B0B', fg: '#FFFFFF' }, away: { id: 1211, name: 'Botafogo',      short: 'BOT', bg: '#101010', fg: '#FFFFFF' }, odds: ['2.10', '3.20', '3.30'] },
];

export const DBA_INITIAL_SERVICE_STATE = {
  status: 'running',
  lastRestartAt: '2026-04-30T08:14:00Z',
  lastRestartBy: 'D. Benvelgy',
  cacheSizeBytes: 142_300_000,
  uptimeSec: 86400 * 6 + 3600 * 5,
  cooldownRemainingSec: 0,
};

export const DBA_AUDIT_LOG = [
  { kind: 'restart', who: 'D. Benvelgy', when: '2026-04-30T08:14:00Z', text: 'Restarted service' },
  { kind: 'publish', who: 'D. Benvelgy', when: '2026-04-30T08:10:00Z', text: 'Published MPU Standard (300×250)' },
  { kind: 'publish', who: 'M. Cohen',    when: '2026-04-29T15:45:00Z', text: 'Published Interstitial Match Promo (320×480)' },
  { kind: 'edit',    who: 'A. Levi',     when: '2026-04-29T11:22:00Z', text: 'Updated BetWay affiliate link' },
  { kind: 'add',     who: 'D. Benvelgy', when: '2026-04-28T10:00:00Z', text: 'Added BetMGM bookmaker' },
  { kind: 'restart', who: 'M. Cohen',    when: '2026-04-26T16:30:00Z', text: 'Restarted service' },
  { kind: 'edit',    who: 'D. Benvelgy', when: '2026-04-25T13:15:00Z', text: 'Edited Mobile Banner template (320×50)' },
];
