import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { LogoThumb } from './DbaPrimitives';
import { bgCss, invertText, SIZE_DIMS, resolveLogoUrl, competitorLogoUrl, BRAZIL_LEGAL_FALLBACK_TEXT } from './dbaUtils';
import { DBA_SAMPLE_MATCHES } from '../../data/dbaData';

// Constants for team-name fitting in MatchRow.
const MIN_RATIO = 0.5;
const MIN_FONT_PX = 8;

// =============================================================================
// BANNER (320×50) — edit sizes here
// `default` = normal markets · `brazil` = SPA/MF legal band on
// =============================================================================
const BANNER = {
  default: {
    logoSize: 48,
    contentGap: 0,       // px between content row and legal strip (0 = no band)
    sidePad: 8,
    colGap: 8,
    ctaH: 30,
    ctaFont: 10,
    ctaPx: 8,
    // Center betting content (date pill · teams · odds)
    match: {
      pillH: 14.3, pillFont: 8.8, pillPx: 7,
      teamFont: 11, crest: 12.1, teamGap: 4.4,
      oddsFont: 9.9, oddsH: 13.2, oddDot: 3.3,
      rowGap: 2.5,
    },
    // Welcome-offer slide
    welcome: { headFont: 13, subFont: 9, ctaFont: 10 },
    // Non-Brazil corner legal strip
    legal: { fontSize: 6, badgeSize: 10, logoH: 7 },
  },
  brazil: {
    logoSize: 52,
    contentGap: 6,       // px between content row and Brazil legal band
    lift: 4,             // shift logo · match · CTA up by this many px
    sidePad: 6,
    colGap: 5,
    ctaH: 20,
    ctaFont: 8,
    ctaPx: 6,
    match: {
      pillH: 8.8, pillFont: 6.6, pillPx: 3.3,
      teamFont: 8.5, crest: 8.8, teamGap: 2.5,
      oddsFont: 7.7, oddsH: 8.8, oddDot: 2.2,
      rowGap: 1.5,
    },
    welcome: { headFont: 9, subFont: 6, ctaFont: 8 },
    // Brazil full-width legal band
    legal: { fontSize: 4.5, badgeSize: 8 },
  },
};

// 18+ age-restriction badge. The DBA repo doesn't ship a dedicated 18+ asset
// (production uses plain text), so we render it as a styled badge in pure CSS:
// a dark circle with bold "18+" inside. Sized by `size` (px diameter); colors
// optional and default to a high-contrast black/white pairing that reads at
// any ad-format size.
function Age18PlusBadge({ size = 14, bg = '#0A0A0A', color = '#FFFFFF' }) {
  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: bg,
      color,
      // 0.5 of diameter reads cleanly down to ~10px and stays readable up to ~30px.
      fontSize: size * 0.5,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: '-0.06em',
      flexShrink: 0,
      // Tiny extra right-padding inside the circle so the "+" doesn't kiss the edge.
      paddingLeft: '0.5px',
    }}>18+</Box>
  );
}

// Banner middle section: date pill + team row + odds row, with odds *dynamically*
// aligned to the team row's home / X / away positions. CSS alone can't do this
// because team-name widths vary at render time, so we measure each team-row
// glyph's centre via offsetLeft/offsetWidth after layout and absolutely-position
// each odd onto that x-coordinate. Re-runs when team names change or the banner
// resizes (ResizeObserver).
function BannerMatchSection({ match, config, dense = false }) {
  // Sizes come from BANNER.default.match / BANNER.brazil.match — edit there.
  const s = dense ? BANNER.brazil.match : BANNER.default.match;
  const teamRowRef  = useRef(null);
  const homeNameRef = useRef(null);
  const xRef        = useRef(null);
  const awayNameRef = useRef(null);
  const pillRef     = useRef(null);
  const homeOddRef  = useRef(null);
  const tieOddRef   = useRef(null);
  const awayOddRef  = useRef(null);

  useLayoutEffect(() => {
    const place = () => {
      const hn = homeNameRef.current;
      const x  = xRef.current;
      const an = awayNameRef.current;
      const pill = pillRef.current;
      const ho = homeOddRef.current;
      const to = tieOddRef.current;
      const ao = awayOddRef.current;
      if (!hn || !x || !an || !pill || !ho || !to || !ao) return;
      // offsetLeft/Width are in unscaled CSS px relative to the offsetParent —
      // pill row, team row, and odds row share the same width (alignItems:
      // stretch), so the X centre maps to the same x on the pill/odds rows.
      const homeC = hn.offsetLeft + hn.offsetWidth / 2;
      const xC    = x.offsetLeft  + x.offsetWidth  / 2;
      const awayC = an.offsetLeft + an.offsetWidth / 2;
      // Pill + tie odd sit on the X. Outer odds use the smaller team→X span
      // so they stay symmetric when one name is much longer.
      const symDist = Math.min(Math.abs(xC - homeC), Math.abs(awayC - xC));
      pill.style.left = `${xC}px`;
      ho.style.left = `${xC - symDist}px`;
      to.style.left = `${xC}px`;
      ao.style.left = `${xC + symDist}px`;
    };
    place();
    // Re-place when the section's width changes (e.g. preview scale resize).
    const target = teamRowRef.current;
    if (!target) return undefined;
    const ro = new ResizeObserver(place);
    ro.observe(target);
    return () => ro.disconnect();
  }, [match.home.name, match.away.name, dense, match.date]);

  return (
    <Box sx={{
      justifySelf: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      rowGap: `${s.rowGap}px`,
      minWidth: 0,
    }}>
      {/* Date pill — absolutely placed so its centre sits above the X (not the
          section midpoint; asymmetric team names shift the X off-centre). */}
      <Box sx={{ position: 'relative', height: s.pillH }}>
        <Box ref={pillRef} sx={{
          position: 'absolute', top: 0, transform: 'translateX(-50%)',
          height: s.pillH, px: `${s.pillPx}px`, borderRadius: 999,
          bgcolor: config.datePillColor || 'rgba(0,0,0,0.55)',
          color: config.datePillTextColor || config.text,
          fontSize: s.pillFont, fontWeight: 600, letterSpacing: '0.02em',
          display: 'inline-flex', alignItems: 'center',
          whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1,
        }}>{match.date}</Box>
      </Box>

      {/* Team row — natural-width tight cluster, centred in the row. The row
          itself stretches to section width (alignItems: stretch on parent),
          so its offset coordinates are the same coordinate system as the
          pill/odds rows.
          `position: relative` so the inner spans' offsetLeft is measured
          relative to the team row (their offsetParent), not whatever
          positioned ancestor sits further up the tree. */}
      <Box ref={teamRowRef} sx={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: `${s.teamGap}px`,
        fontSize: s.teamFont, fontWeight: 600, lineHeight: 1,
      }}>
        <Box ref={homeNameRef} component="span" sx={{ whiteSpace: 'nowrap' }}>{match.home.name}</Box>
        <TeamCrest team={match.home} size={s.crest} />
        <Box ref={xRef} component="span" sx={{ opacity: 0.6, fontWeight: 700, mx: '1px' }}>X</Box>
        <TeamCrest team={match.away} size={s.crest} />
        <Box ref={awayNameRef} component="span" sx={{ whiteSpace: 'nowrap' }}>{match.away.name}</Box>
      </Box>

      {/* Odds row — same width as the team row (via stretch). Children are
          absolutely positioned; the useLayoutEffect above writes each odd's
          inline `left` to the centre of the corresponding team element so
          the tie odd lands directly under the X, and home/away odds land
          directly under their team names. translateX(-50%) centres each
          odd on the computed x. */}
      <Box sx={{
        position: 'relative',
        height: s.oddsH,
        fontSize: s.oddsFont, fontWeight: 700, lineHeight: 1,
      }}>
        <Box ref={homeOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={{ width: s.oddDot, height: s.oddDot, borderRadius: 999, bgcolor: '#FFC107' }} />
          <Box component="span">{match.odds[0]}</Box>
        </Box>
        <Box ref={tieOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={{ width: s.oddDot, height: s.oddDot, borderRadius: 999, bgcolor: '#FFC107' }} />
          <Box component="span">{match.odds[1]}</Box>
        </Box>
        <Box ref={awayOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={{ width: s.oddDot, height: s.oddDot, borderRadius: 999, bgcolor: '#FFC107' }} />
          <Box component="span">{match.odds[2]}</Box>
        </Box>
      </Box>
    </Box>
  );
}

// Render the real team crest from Cloudinary when an id is supplied. The
// colored circle stays as a graceful fallback: shown until the image loads,
// and permanently when the image 404s or `team.id` is missing.
function TeamCrest({ team, size }) {
  const logoUrl = team?.id != null ? competitorLogoUrl(team.id) : null;
  const [imageOk, setImageOk] = useState(!!logoUrl);

  const initialsCircle = (
    <Box sx={{
      width: size, height: size, borderRadius: '50%',
      bgcolor: team.bg, color: team.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(7, size * 0.36), fontWeight: 800,
      letterSpacing: '-0.02em', flexShrink: 0,
      border: team.bg === '#FFFFFF' ? '1px solid rgba(0,0,0,0.15)' : 'none',
      boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
    }}>{team.short}</Box>
  );

  if (!logoUrl || !imageOk) return initialsCircle;

  return (
    <Box
      component="img"
      src={logoUrl}
      alt={team.name || ''}
      onError={() => setImageOk(false)}
      sx={{
        width: size, height: size,
        objectFit: 'contain', flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
      }}
    />
  );
}

export function CarouselDots({ count, active, color, dotSize = 5 }) {
  return (
    <Box sx={{ display: 'flex', gap: `${dotSize + 2}px`, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} component="span" sx={{
          width: i === active ? dotSize * 2.4 : dotSize,
          height: dotSize, borderRadius: 999,
          bgcolor: color, opacity: i === active ? 1 : 0.35,
          transition: 'width 0.3s, opacity 0.3s',
        }} />
      ))}
    </Box>
  );
}

/** Measure how small a home/away pair must go to fit both names in their slots. */
function neededTeamFont(homeEl, awayEl, base) {
  if (!homeEl?.parentElement || !awayEl?.parentElement) return base;
  const floor = Math.max(MIN_FONT_PX, base * MIN_RATIO);
  homeEl.style.fontSize = `${base}px`;
  awayEl.style.fontSize = `${base}px`;
  const homeRatio = homeEl.scrollWidth / homeEl.parentElement.clientWidth;
  const awayRatio = awayEl.scrollWidth / awayEl.parentElement.clientWidth;
  const maxRatio = Math.max(homeRatio, awayRatio);
  return maxRatio > 1.005 ? Math.max(floor, base / maxRatio) : base;
}

function MatchRow({ match, config, d, syncFonts = false }) {
  // Pair-coordinated font fitting. Home and away render at the SAME size: we
  // measure both at the base size, then shrink both to the size that lets the
  // longer-rendered one fit. Matches the reference where both names visibly
  // share a height, even when one is short ("Brasil") and the other long
  // ("Chapecoense").
  //
  // When syncFonts is true, skip per-card shrinking so every card keeps the
  // designed teamFont (long names ellipsize instead of looking smaller).
  //
  // DOM-mutation (not state) keeps useLayoutEffect from re-running off its
  // own writes. The ResizeObserver watches the flex slots, whose widths come
  // from the flex parent and don't react to font-size changes inside.
  const homeRef = React.useRef(null);
  const awayRef = React.useRef(null);

  useLayoutEffect(() => {
    if (syncFonts) return undefined;
    const home = homeRef.current;
    const away = awayRef.current;
    if (!home || !away) return undefined;
    const base = d.teamFont;

    const fit = () => {
      const next = neededTeamFont(home, away, base);
      home.style.fontSize = `${next}px`;
      away.style.fontSize = `${next}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(home.parentElement);
    ro.observe(away.parentElement);
    return () => ro.disconnect();
  }, [match.home.name, match.away.name, d.teamFont, syncFonts]);

  const wrapNames = !!d.wrapNames;
  const slotSx = (align) => ({
    flex: 1, minWidth: 0,
    textAlign: align,
    display: 'flex', alignItems: 'center',
    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    minHeight: d.teamFont * 1.1,
    overflow: wrapNames ? 'visible' : 'hidden',
  });
  const textSx = {
    display: wrapNames ? 'block' : 'inline-block',
    maxWidth: '100%',
    fontSize: d.teamFont, fontWeight: 600, lineHeight: 1.15,
    ...(wrapNames
      ? { whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' }
      : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  };

  return (
    <Box data-match-card sx={{
      bgcolor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: `${d.cardRadius}px`,
      padding: d.cardPad,
      display: 'flex', flexDirection: 'column', gap: `${d.rowGap}px`,
      position: 'relative',
    }}>
      <Box sx={{
        position: 'absolute', top: -d.pillH / 2, left: '50%', transform: 'translateX(-50%)',
        height: d.pillH, px: `${d.pillH * 0.7}px`,
        borderRadius: 999,
        bgcolor: config.datePillColor || 'rgba(0,0,0,0.55)',
        color: config.datePillTextColor || config.text,
        fontSize: d.pillFont, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>{match.date}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.teamsGap}px`, mt: `${d.pillH / 2}px`, minWidth: 0 }}>
        <Box sx={slotSx('right')}>
          <Box ref={homeRef} component="span" data-team-name="home" sx={textSx}>{match.home.name}</Box>
        </Box>
        <TeamCrest team={match.home} size={d.crest} />
        <Box sx={{ fontSize: d.xFont, fontWeight: 700, opacity: 0.65, px: `${d.crest * 0.05}px`, flexShrink: 0 }}>X</Box>
        <TeamCrest team={match.away} size={d.crest} />
        <Box sx={slotSx('left')}>
          <Box ref={awayRef} component="span" data-team-name="away" sx={textSx}>{match.away.name}</Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: `${d.oddsGap}px` }}>
        {match.odds.map((o, i) => (
          <Box key={i} sx={{ display: 'inline-flex', alignItems: 'center', gap: `${d.oddsDot * 1.2}px`, fontSize: d.oddsFont, fontWeight: 700 }}>
            <Box component="span" sx={{ width: d.oddsDot, height: d.oddsDot, borderRadius: 999, bgcolor: '#FFC107' }} />
            <Box component="span">{o}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Column of match cards — same teamFont on every card (no per-card shrink). */
function MatchCardColumn({ matches, config, d, sx }) {
  return (
    <Box sx={sx}>
      {matches.map((m, i) => (
        <MatchRow key={i} match={m} config={config} d={d} syncFonts />
      ))}
    </Box>
  );
}

export default function AdPreview({ config, sizeId, bookmaker, scale = 1, slideIdx = 0, countries = [] }) {
  const [w, h] = SIZE_DIMS[sizeId] || [300, 250];
  const isInterstitial = sizeId === '640x1280';
  const isBanner = sizeId === '320x50';
  const radius = config.radius || 8;
  const isBrazil = Array.isArray(countries) && countries.includes('BR');
  const useBrazilBand = isBrazil && !!config.legal?.enabled;
  // ~10% of ad height; floor so the two-line SPA/MF copy stays readable.
  const brazilBandH = Math.max(isBanner ? 12 : 25, Math.round(h * 0.1));

  // Brazil (SPA/MF): full-width disclaimer band (~10% of ad).
  // 18+ is a badge; copy is the Ministério da Fazenda sentence only.
  const brazilLegalText = (() => {
    const raw = (config.legal?.text || BRAZIL_LEGAL_FALLBACK_TEXT).trim();
    return raw.replace(/^\s*18\+?\s*JOGUE COM RESPONSABILIDADE\.?\s*/i, '').trim() || BRAZIL_LEGAL_FALLBACK_TEXT;
  })();
  const renderBrazilLegalBand = (heightPx, fontSize, badgeSize) => (
    <Box sx={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: heightPx, zIndex: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${Math.max(4, heightPx * 0.14)}px`,
      px: `${Math.max(3, heightPx * 0.12)}px`, py: `${Math.max(1, heightPx * 0.06)}px`, boxSizing: 'border-box',
      bgcolor: 'rgba(0,0,0,0.72)', color: config.legal?.color || '#FFFFFF',
      fontSize, lineHeight: 1.15, fontWeight: 700, textAlign: 'left',
      pointerEvents: 'none',
    }}>
      <Age18PlusBadge size={badgeSize} />
      {config.legal?.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: badgeSize, width: 'auto', flexShrink: 0 }} />}
      <Box component="span" sx={{ whiteSpace: 'normal', overflow: 'hidden', letterSpacing: '0.01em', flex: 1, minWidth: 0 }}>
        {brazilLegalText}
      </Box>
    </Box>
  );

  const wo = config.welcomeOffer || {};
  const woCtaText = (wo.ctaText && wo.ctaText.trim()) || config.ctaText;
  const woCtaBg = wo.ctaColor || config.cta;
  const woCtaFg = wo.ctaTextColor || invertText(woCtaBg);
  const woHeadline = wo.headline || 'Get £30 in Free Bets';
  const woSubtext = wo.subtext || 'Bet £10, get £30 when you sign up';
  const woTerms = wo.terms || 'New customers only · 18+ · T&Cs apply';
  const woPillText = (wo.pillText && wo.pillText.trim()) || 'Welcome offer';
  const woPillBg = wo.pillColor || '#FFC107';
  const woPillFg = wo.pillTextColor || invertText(woPillBg);

  const matchesPerSlide = isInterstitial ? 3 : isBanner ? 1 : 2;
  const matchSlideCount = Math.max(1, Math.ceil(DBA_SAMPLE_MATCHES.length / matchesPerSlide));
  const hasWelcome = !!wo.enabled;
  const totalSlides = (hasWelcome ? 1 : 0) + matchSlideCount;
  const safeIdx = totalSlides ? ((slideIdx % totalSlides) + totalSlides) % totalSlides : 0;
  const showWelcome = hasWelcome && safeIdx === 0;
  const matchSlideIdx = hasWelcome ? safeIdx - 1 : safeIdx;
  const matchStart = matchSlideIdx * matchesPerSlide;
  const slideMatches = DBA_SAMPLE_MATCHES.slice(matchStart, matchStart + matchesPerSlide);

  // If the welcome slide has its own background override, build a bgCss
  // input from the welcomeOffer.* fields. Otherwise welcome slides inherit
  // the main slide's bgCss(config).
  const welcomeBgConfig = wo.bgEnabled ? {
    bgType:    wo.bgType    || 'solid',
    bg:        wo.bg        || config.bg,
    bg2:       wo.bg2,
    bgAngle:   wo.bgAngle,
    bgImage:   wo.bgImage,
    bgOverlay: wo.bgOverlay,
  } : null;
  const welcomeBg = welcomeBgConfig ? bgCss(welcomeBgConfig) : null;

  // `customBg` lets a render function (welcome variants) override the main
  // bgCss(config) without otherwise duplicating the wrap layout.
  const wrap = (children, pad, customBg) => (
    <Box sx={{
      width: w, height: h,
      background: customBg || bgCss(config), color: config.text,
      borderRadius: `${radius}px`, overflow: 'hidden',
      fontFamily: '"365 Sans", Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding: pad,
      boxSizing: 'border-box', position: 'relative',
      transform: `scale(${scale})`, transformOrigin: 'top left',
    }}>{children}</Box>
  );

  // In-ad carousel page indicator. Production serves dots inside the ad
  // (carousel.css: .dots { position: absolute; bottom: 0 } + per-format heights),
  // so the prototype renders them inside the wrap too — but as a FLEX-FLOW
  // child placed after the CTA. That way the column layout guarantees the
  // dots sit below the CTA regardless of padding or absolute positioning.
  //
  //   rowHeight: px the dots row reserves in the flex flow
  //   dotSize:   px diameter of each dot
  //   mt:        margin-top above the row (gap from CTA)
  //
  // Hidden when there's only one slide and for banner (production also skips
  // dots for banner: `!baseUtils.isBanner() && container.appendChild(dots)`).
  const renderInAdDots = ({ rowHeight, dotSize, mt = 6 }) => (
    totalSlides > 1 ? (
      <Box sx={{
        height: rowHeight, mt: `${mt}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <CarouselDots count={totalSlides} active={safeIdx} color={config.text} dotSize={dotSize} />
      </Box>
    ) : null
  );

  // BANNER · 320×50
  const renderBanner = () => {
    const m = slideMatches[0] || DBA_SAMPLE_MATCHES[0];
    // A point (x, y) measured from a rounded corner is clipped if it falls
    // inside the corner square but outside the curve. The diagonal safe
    // inset — where the curve passes through — is radius * (1 - 1/√2). Use
    // that to inset the bottom legal strip so it never gets clipped, no
    // matter how aggressive the border-radius is. Clamp to the visual
    // minimums we already use when the radius is small.
    const cornerInset = radius * (1 - 1 / Math.SQRT2);
    const legalSideInset = Math.max(4, cornerInset);
    const legalBottomInset = Math.max(1, cornerInset);
    // Sizes: edit BANNER.default / BANNER.brazil at the top of this file.
    // All three columns share the same vertical centre (and the same Brazil
    // footer clearance) so logo · match · CTA stay aligned at current sizes.
    const b = useBrazilBand ? BANNER.brazil : BANNER.default;
    const footerClearance = useBrazilBand ? brazilBandH + b.contentGap : 0;
    const lift = useBrazilBand ? (b.lift || 0) : 0;
    const colSx = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pb: `${footerClearance}px`, boxSizing: 'border-box', minWidth: 0,
      transform: lift ? `translateY(-${lift}px)` : undefined,
    };
    return (
      <Box sx={{
        width: w, height: h,
        background: bgCss(config), color: config.text,
        borderRadius: `${radius}px`, overflow: 'hidden',
        fontFamily: '"365 Sans", Inter, sans-serif',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'stretch',
        columnGap: `${b.colGap}px`,
        padding: `0 ${b.sidePad}px`,
        boxSizing: 'border-box', position: 'relative',
        transform: `scale(${scale})`, transformOrigin: 'top left',
      }}>
        <Box sx={colSx}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={b.logoSize} radius={4} bare />
        </Box>
        <Box sx={colSx}>
          <BannerMatchSection match={m} config={config} dense={useBrazilBand} />
        </Box>
        <Box sx={colSx}>
          <Box component="button" sx={{
            background: config.cta, color: config.ctaTextColor || invertText(config.cta),
            border: 'none', height: b.ctaH, px: `${b.ctaPx}px`,
            borderRadius: `${Math.min(radius, 4)}px`,
            fontSize: b.ctaFont, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', letterSpacing: '0.01em',
          }}>{config.ctaText}</Box>
        </Box>
        {/* Bottom regulatory strip — both the 18+ badge and the legal text
            are gated on config.legal.enabled. pointerEvents: none keeps the
            CTA clickable through it. Inset by the diagonal safe distance so
            nothing gets clipped by the rounded corners. */}
        {config.legal && config.legal.enabled && (
          useBrazilBand ? renderBrazilLegalBand(brazilBandH, b.legal.fontSize, b.legal.badgeSize) : (
          <Box sx={{
            position: 'absolute', left: legalSideInset, right: legalSideInset, bottom: legalBottomInset,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: b.legal.fontSize, color: config.legal.color || config.text, opacity: 0.85,
            pointerEvents: 'none',
          }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: b.legal.logoH, width: 'auto' }} />}
              <Age18PlusBadge size={b.legal.badgeSize} />
            </Box>
            {config.legal.text && (
              <Box component="span" sx={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {config.legal.text}
              </Box>
            )}
          </Box>
          )
        )}
      </Box>
    );
  };

  // MPU · 300×250
  const renderMPU = () => {
    const visible = slideMatches.slice(0, 2);
    // Cards keep their natural size; the space comes from a tight top zone:
    // wrap top padding 0 + logo mb 0 means the logo sits flush with the ad's
    // top edge, leaving the full 152px below for two full-size cards (148px
    // total) with a small buffer. CTA + dots stay at their fixed positions
    // anchored by the unchanged wrap bottom padding (14).
    //
    // Brazil band (~25px / 10%): 52px logo, cards sit tight under it and stay
    // clear of the CTA (slightly denser cards + smaller logo→card gap).
    const d = useBrazilBand
      ? { cardRadius: 11, cardPad: '10px 10px 7px', pillH: 14, pillFont: 8,
          teamsGap: 5, teamFont: 10, crest: 15, xFont: 10,
          oddsGap: 10, oddsFont: 10, oddsDot: 4, rowGap: 4 }
      : { cardRadius: 12, cardPad: '14px 12px 10px', pillH: 16, pillFont: 9,
          teamsGap: 6, teamFont: 10, crest: 18, xFont: 11,
          oddsGap: 12, oddsFont: 11, oddsDot: 5, rowGap: 6 };
    const logoSize = useBrazilBand ? 52 : 28;
    const cardGap = useBrazilBand ? 8 : 14;
    const ctaH = useBrazilBand ? 26 : 30;
    const ctaMt = useBrazilBand ? 4 : 8;
    const ctaFont = useBrazilBand ? 11 : 12;
    const sidePad = useBrazilBand ? 12 : 14;
    const bottomPad = useBrazilBand ? brazilBandH + 2 : 14;
    // Room for the protruding date pill only — keep logo→card gap tight.
    const matchesMt = useBrazilBand ? 2 : 0;
    return wrap(
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={logoSize} radius={6} bare />
        </Box>
        {/* No overflow:hidden — the date pill on the top card is positioned
            top: -pillH/2 to poke above the card, and clipping that here
            chops it in half. The CTA below now has `position: relative` so
            even if cards visually overflowed downward, the CTA would paint
            on top (same stacking context). */}
        <MatchCardColumn
          matches={visible}
          config={config}
          d={d}
          sx={{
            display: 'flex', flexDirection: 'column', gap: `${cardGap}px`,
            flex: 1, minHeight: 0, mt: `${matchesMt}px`,
            justifyContent: 'flex-start',
          }}
        />
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', height: ctaH, mt: `${ctaMt}px`,
          // position: relative so the CTA participates in the same stacking
          // context as the cards (which are also positioned) — ensures the
          // CTA paints ABOVE any card paint, not below.
          position: 'relative',
          borderRadius: `${Math.min(radius, 6)}px`,
          fontSize: ctaFont, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
        }}>{config.ctaText}</Box>
        {/* Dots flow as a flex child immediately after the CTA. */}
        {renderInAdDots(useBrazilBand
          ? { rowHeight: 6, dotSize: 3, mt: 2 }
          : { rowHeight: 10, dotSize: 4, mt: 8 })}
        {config.legal && config.legal.enabled && (
          useBrazilBand ? renderBrazilLegalBand(brazilBandH, 7, 10) : (
          <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
              <Age18PlusBadge size={12} />
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.legal.text || 'Jogue com responsabilidade'}
            </Box>
          </Box>
          )
        )}
      </>,
      // Top padding = 0 so the logo sits flush at the top (matches
      // production's `padding: 0` on .dynamic-banner-widget-container).
      // Brazil: bottom pad equals the band height so CTA/dots sit above it.
      `0px ${sidePad}px ${bottomPad}px`
    );
  };

  // INTERSTITIAL · 640×1280
  const renderInterstitial = () => {
    const visible = slideMatches.slice(0, 3);
    // Cards sit 5px from the template edge; long team names wrap (not ellipsis).
    const sidePad = 5;
    const d = { cardRadius: 36, cardPad: '40px 36px 32px', pillH: 44, pillFont: 22,
                teamsGap: 18, teamFont: 24, crest: 64, xFont: 28,
                oddsGap: 32, oddsFont: 30, oddsDot: 12, rowGap: 24, wrapNames: true };
    // Brazil: same element sizes. CTA + dots sit in a flex zone that fills the
    // space between the bottom card and the legal band, centered exactly mid-way.
    const cardGap = useBrazilBand ? 40 : 56;
    const logoMb = useBrazilBand ? 16 : 24;
    const bottomPad = useBrazilBand ? brazilBandH : 80;
    const ctaBtn = (
      <Box component="button" sx={{
        background: config.cta, color: config.ctaTextColor || invertText(config.cta),
        border: 'none', height: 96, mt: useBrazilBand ? 0 : '40px',
        position: 'relative', flexShrink: 0,
        borderRadius: `${Math.min(radius * 1.5, 20)}px`,
        fontSize: 32, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>{config.ctaText}</Box>
    );
    const dots = renderInAdDots({ rowHeight: 24, dotSize: 10, mt: useBrazilBand ? 0 : 24 });
    return wrap(
      <>
        {/* Interstitial logo: 28.28% of 640 ≈ 181px. Horizontally centered to
            match production's flex `align-items: center`. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '8px', mb: `${logoMb}px`, flexShrink: 0 }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={181} radius={24} bare />
        </Box>
        <MatchCardColumn
          matches={visible}
          config={config}
          d={d}
          sx={{
            display: 'flex', flexDirection: 'column', gap: `${cardGap}px`,
            ...(useBrazilBand ? { flexShrink: 0 } : { flex: 1, minHeight: 0, justifyContent: 'flex-start' }),
          }}
        />
        {useBrazilBand ? (
          <Box sx={{
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', justifyContent: 'center', gap: '24px',
          }}>
            {ctaBtn}
            {dots}
          </Box>
        ) : (
          <>
            {ctaBtn}
            <Box sx={{ flexShrink: 0 }}>{dots}</Box>
          </>
        )}
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, 20, 28) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: 20, left: sidePad, right: sidePad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
              <Age18PlusBadge size={28} />
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.legal.text || 'Jogue com responsabilidade'}
            </Box>
          </Box>
          ) : null
        )}
      </>,
      `24px ${sidePad}px ${bottomPad}px`
    );
  };

  // ===== Welcome offer slides =====
  const renderWelcomeBanner = () => {
    // Sizes: edit BANNER.default / BANNER.brazil at the top of this file.
    const b = useBrazilBand ? BANNER.brazil : BANNER.default;
    const footerClearance = useBrazilBand ? brazilBandH + b.contentGap : 0;
    const lift = useBrazilBand ? (b.lift || 0) : 0;
    const colSx = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pb: `${footerClearance}px`, boxSizing: 'border-box', minWidth: 0,
      transform: lift ? `translateY(-${lift}px)` : undefined,
    };
    return (
      <Box sx={{
        width: w, height: h,
        // Use the welcome override if set; otherwise inherit the main slide's bg.
        background: welcomeBg || bgCss(config), color: config.text,
        borderRadius: `${radius}px`, overflow: 'hidden',
        fontFamily: '"365 Sans", Inter, sans-serif',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'stretch',
        columnGap: `${b.colGap}px`,
        padding: useBrazilBand ? `0 ${b.sidePad}px` : '4px 8px',
        boxSizing: 'border-box', position: 'relative',
        transform: `scale(${scale})`, transformOrigin: 'top left',
      }}>
        <Box sx={colSx}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={b.logoSize} radius={4} bare />
        </Box>
        <Box sx={{ ...colSx, flexDirection: 'column', gap: '1px', lineHeight: 1.1, textAlign: 'center' }}>
          <Box sx={{ fontSize: b.welcome.headFont, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{woHeadline}</Box>
          <Box sx={{ fontSize: b.welcome.subFont, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{woSubtext}</Box>
        </Box>
        <Box sx={colSx}>
          <Box component="button" sx={{
            background: woCtaBg, color: woCtaFg,
            border: 'none', height: b.ctaH, px: `${b.ctaPx}px`,
            borderRadius: `${Math.min(radius, 4)}px`,
            fontSize: b.welcome.ctaFont, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', letterSpacing: '0.01em',
          }}>{woCtaText}</Box>
        </Box>
        {useBrazilBand && renderBrazilLegalBand(brazilBandH, b.legal.fontSize, b.legal.badgeSize)}
      </Box>
    );
  };

  const renderWelcomeMPU = () => {
    const logoSize = useBrazilBand ? 32 : 42;
    const headFont = useBrazilBand ? 18 : 22;
    const subFont = useBrazilBand ? 10 : 11;
    const termsFont = useBrazilBand ? 7 : 8;
    const imgMax = useBrazilBand ? 36 : 50;
    const ctaH = useBrazilBand ? 26 : 32;
    const gap = useBrazilBand ? 4 : 6;
    const topPad = useBrazilBand ? 8 : 10;
    const bottomPad = useBrazilBand ? brazilBandH + 2 : 14;
    return wrap(
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: useBrazilBand ? '4px' : '8px' }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={logoSize} radius={6} bare />
          {/* textIndent balances the trailing letter-spacing after the last
              glyph (otherwise the text reads as left-shifted inside the pill).
              Asymmetric vertical padding (top > bottom) compensates for the
              empty descender area: uppercase glyphs occupy ~70% of the line
              box from the top, so equal padding makes the text read top-heavy. */}
          <Box sx={{
            padding: useBrazilBand ? '2px 6px 1px' : '3px 8px 1px', borderRadius: 999,
            bgcolor: woPillBg, color: woPillFg,
            fontSize: useBrazilBand ? 8 : 9, fontWeight: 800, lineHeight: 1,
            letterSpacing: '0.06em', textIndent: '0.06em',
            textTransform: 'uppercase', textAlign: 'center',
          }}>{woPillText}</Box>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: `${gap}px`, textAlign: 'center', px: '4px' }}>
          {wo.image && <Box component="img" src={wo.image} alt="" sx={{ maxHeight: imgMax, maxWidth: '100%', objectFit: 'contain', mb: '2px' }} />}
          <Box sx={{ fontSize: headFont, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{woHeadline}</Box>
          <Box sx={{ fontSize: subFont, opacity: 0.8, lineHeight: 1.25 }}>{woSubtext}</Box>
          <Box sx={{ fontSize: termsFont, opacity: 0.55, lineHeight: 1.2, mt: '2px' }}>{woTerms}</Box>
        </Box>
        <Box component="button" sx={{
          background: woCtaBg, color: woCtaFg,
          border: 'none', height: ctaH, mt: useBrazilBand ? '4px' : '6px',
          borderRadius: `${Math.min(radius, 6)}px`,
          fontSize: useBrazilBand ? 11 : 13, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
        }}>{woCtaText}</Box>
        {renderInAdDots(useBrazilBand
          ? { rowHeight: 7, dotSize: 3, mt: 3 }
          : { rowHeight: 10, dotSize: 4, mt: 8 })}
        {config.legal && config.legal.enabled && (
          useBrazilBand ? renderBrazilLegalBand(brazilBandH, 7, 10) : (
          <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
              <Age18PlusBadge size={12} />
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.legal.text || 'Jogue com responsabilidade'}</Box>
          </Box>
          )
        )}
      </>,
      `${topPad}px 14px ${bottomPad}px`,
      welcomeBg,
    );
  };

  const renderWelcomeInterstitial = () => {
    // Brazil: CTA + dots centered in the space between offer content and legal band.
    const bottomPad = useBrazilBand ? brazilBandH : 80;
    const ctaBtn = (
      <Box component="button" sx={{
        background: woCtaBg, color: woCtaFg,
        border: 'none', height: 104, mt: useBrazilBand ? 0 : '32px',
        position: 'relative', flexShrink: 0,
        borderRadius: `${Math.min(radius * 1.5, 24)}px`,
        fontSize: 36, fontWeight: 800, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>{woCtaText}</Box>
    );
    const dots = renderInAdDots({ rowHeight: 24, dotSize: 10, mt: useBrazilBand ? 0 : 24 });
    return wrap(
      <>
        {/* Logo centered on its own row; the "Welcome offer" pill stacks below
            so the logo retains its centered alignment instead of being shifted
            off by the pill in a justify-between row. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '46px', mb: '20px', flexShrink: 0 }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={181} radius={24} bare />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: '32px', flexShrink: 0 }}>
          <Box sx={{
            padding: '10px 24px', borderRadius: 999,
            bgcolor: woPillBg, color: woPillFg,
            fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', textIndent: '0.08em',
            textTransform: 'uppercase', textAlign: 'center',
          }}>{woPillText}</Box>
        </Box>
        <Box sx={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '40px',
          textAlign: 'center', minHeight: 0,
          ...(useBrazilBand ? { flexShrink: 0 } : { flex: 1 }),
        }}>
          {wo.image && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={wo.image} alt="" sx={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain' }} />
            </Box>
          )}
          <Box sx={{ fontSize: 108, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.03em' }}>{woHeadline}</Box>
          <Box sx={{ fontSize: 36, opacity: 0.85, lineHeight: 1.25, fontWeight: 500 }}>{woSubtext}</Box>
        </Box>
        {useBrazilBand ? (
          <Box sx={{
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', justifyContent: 'center', gap: '20px',
          }}>
            {ctaBtn}
            <Box sx={{ fontSize: 18, opacity: 0.55, textAlign: 'center', lineHeight: 1.3, flexShrink: 0 }}>{woTerms}</Box>
            {dots}
          </Box>
        ) : (
          <>
            {ctaBtn}
            <Box sx={{ mt: '20px', fontSize: 18, opacity: 0.55, textAlign: 'center', lineHeight: 1.3, flexShrink: 0 }}>{woTerms}</Box>
            <Box sx={{ flexShrink: 0 }}>{dots}</Box>
          </>
        )}
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, 20, 28) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: 20, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
              <Age18PlusBadge size={28} />
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.legal.text || 'Jogue com responsabilidade'}
            </Box>
          </Box>
          ) : null
        )}
      </>,
      `64px 56px ${bottomPad}px`,
      welcomeBg,
    );
  };

  if (isBanner) return showWelcome ? renderWelcomeBanner() : renderBanner();
  if (isInterstitial) return showWelcome ? renderWelcomeInterstitial() : renderInterstitial();
  return showWelcome ? renderWelcomeMPU() : renderMPU();
}
