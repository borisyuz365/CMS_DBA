import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { LogoThumb } from './DbaPrimitives';
import { bgCss, invertText, SIZE_DIMS, MPU_LAYOUT, resolveLogoUrl, competitorLogoUrl, BRAZIL_LEGAL_FALLBACK_TEXT, LEGAL_BAND_BG_DEFAULT, resolveDatePillBg, resolveDatePillFg } from './dbaUtils';
import { DBA_SAMPLE_MATCHES } from '../../data/dbaData';

// Constants for team-name fitting in MatchRow.
const MIN_RATIO = 0.5;
const MIN_FONT_PX = 8;
const ODD_OUTCOME_LABELS = ['1', 'X', '2'];
const ODD_LABEL_COLOR = '#FFC107';
const TEAM_VS = '–';

/** Date/time pill chrome — text geometrically centred in the capsule. */
function datePillSx({ height, fontSize, px, bgcolor, color }) {
  return {
    height,
    boxSizing: 'border-box',
    borderRadius: 999,
    bgcolor,
    color,
    px: `${px}px`,
    py: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 600,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    // Kill inherited line-box quirks from the ad root font.
    '& > span': {
      display: 'block',
      lineHeight: 1,
      // Tiny optical nudge — 365 Sans digits sit slightly high in the em-box.
      transform: 'translateY(0.5px)',
    },
  };
}

// =============================================================================
// BANNER (320×50) — edit sizes here
// `default` = normal markets · `brazil` = SPA/MF legal band on
// =============================================================================
const BANNER = {
  default: {
    logoSize: 48,
    topPad: 5,           // px from ad top edge to date pill
    contentGap: 0,       // px between content row and legal strip (0 = no band)
    sidePad: 8,
    colGap: 8,
    ctaH: 30,
    ctaFont: 10,
    ctaPx: 8,
    // Center betting content (date pill · teams · odds)
    match: {
      pillH: 14.3, pillFont: 8.8, pillPx: 7,
      teamFont: 11, crest: 13.9, teamGap: 4.4,
      oddsFont: 9, oddsH: 12, oddDot: 3.3,
      // 1 / 2 sit this many px left/right of the ad centre (not on the crests).
      oddsSpread: 38,
      // Equal vertical gap between pill · teams · odds (fixed so it always shows)
      rowGap: 3,
    },
    // Welcome-offer slide
    welcome: { headFont: 13, subFont: 9, ctaFont: 10 },
    // Non-Brazil corner legal strip
    legal: { fontSize: 6, badgeSize: 11, logoH: 7 },
  },
  brazil: {
    logoSize: 52,
    topPad: 5,
    contentGap: 4,       // px between odds and Brazil legal band
    lift: 4,             // shift logo · CTA up by this many px (match column stays pinned)
    sidePad: 6,
    colGap: 5,
    ctaH: 20,
    ctaFont: 8,
    ctaPx: 6,
    match: {
      pillH: 8.8, pillFont: 6.6, pillPx: 3.3,
      teamFont: 8.5, crest: 10.1, teamGap: 2.5,
      oddsFont: 7, oddsH: 8.8, oddDot: 2.2,
      oddsSpread: 28,
      rowGap: 2,
    },
    welcome: { headFont: 9, subFont: 6, ctaFont: 8 },
    // Brazil full-width legal band
    legal: { fontSize: 4.5, badgeSize: 9 },
  },
};

// 18+ age-restriction badge. The DBA repo doesn't ship a dedicated 18+ asset
// (production uses plain text), so we render it as a styled badge in pure CSS:
// a dark circle with bold "18+" inside. Sized by `size` (px diameter); colors
// optional and default to a high-contrast black/white pairing that reads at
// any ad-format size.
function Age18PlusBadge({ size = 15, bg = '#0A0A0A', color = '#FFFFFF' }) {
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

// Banner middle section: date pill + team row + odds row. The dash and date
// pill snap to the on-screen ad centre; 1 / X / 2 sit at a fixed offset from
// that same centre (they do not follow crests or name widths).
function BannerMatchSection({ match, config, dense = false, alignKey = 0 }) {
  // Sizes come from BANNER.default.match / BANNER.brazil.match — edit there.
  const s = dense ? BANNER.brazil.match : BANNER.default.match;
  const rootRef      = useRef(null);
  const teamRowRef   = useRef(null);
  const homeBlockRef = useRef(null);
  const awayBlockRef = useRef(null);
  const homeNameRef  = useRef(null);
  const homeCrestRef = useRef(null);
  const xRef         = useRef(null);
  const awayNameRef  = useRef(null);
  const awayCrestRef = useRef(null);
  const pillRef      = useRef(null);
  const oddsRowRef   = useRef(null);
  const homeOddRef   = useRef(null);
  const tieOddRef    = useRef(null);
  const awayOddRef   = useRef(null);

  useLayoutEffect(() => {
    const place = () => {
      const root = rootRef.current;
      const row = teamRowRef.current;
      const homeBlock = homeBlockRef.current;
      const awayBlock = awayBlockRef.current;
      const hn = homeNameRef.current;
      const x = xRef.current;
      const an = awayNameRef.current;
      const pill = pillRef.current;
      const oddsRow = oddsRowRef.current;
      const ho = homeOddRef.current;
      const to = tieOddRef.current;
      const ao = awayOddRef.current;
      if (!root || !row || !homeBlock || !awayBlock || !hn || !x || !an || !pill || !oddsRow || !ho || !to || !ao) return;

      const ad = root.closest('[data-dba-banner]');
      const adRect = (ad || root).getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      if (rowRect.width < 1) return;

      // Default: centre X in this slide. Only snap to the banner midline when
      // this slide is the one on screen — otherwise off-screen slides park
      // their absolute X/odds on the visible midline and bleed into the view.
      let centerLocal = row.offsetWidth / 2;
      if (ad) {
        const rowMid = rowRect.left + rowRect.width / 2;
        const adMid = adRect.left + adRect.width / 2;
        if (Math.abs(rowMid - adMid) < rowRect.width * 0.4) {
          centerLocal = (adMid - rowRect.left) / rowRect.width * row.offsetWidth;
        }
      }
      const xGap = 2; // px between dash and each name cluster

      x.style.left = `${centerLocal}px`;
      const xW = x.offsetWidth || 8;
      homeBlock.style.right = `${Math.max(0, row.offsetWidth - centerLocal + xW / 2 + xGap)}px`;
      awayBlock.style.left = `${Math.max(0, centerLocal + xW / 2 + xGap)}px`;

      // Pill / odds: getBoundingClientRect so absolute team blocks don't break
      // offsetLeft coordinate sharing.
      const pillBox = pill.offsetParent?.getBoundingClientRect?.() || root.getBoundingClientRect();
      const oddsBox = oddsRow.getBoundingClientRect();
      const scaleX = rowRect.width / row.offsetWidth;
      const xRect = x.getBoundingClientRect();
      const xC = (xRect.left + xRect.width / 2 - pillBox.left) / scaleX;
      const drawC = (xRect.left + xRect.width / 2 - oddsBox.left) / scaleX;
      const spread = s.oddsSpread;
      pill.style.left = `${xC}px`;
      ho.style.left = `${drawC - spread}px`;
      to.style.left = `${drawC}px`;
      ao.style.left = `${drawC + spread}px`;
    };
    place();
    const target = teamRowRef.current;
    const ad = rootRef.current?.closest('[data-dba-banner]');
    if (!target) return undefined;
    const ro = new ResizeObserver(place);
    ro.observe(target);
    if (ad) ro.observe(ad);
    return () => ro.disconnect();
  }, [match.home.name, match.away.name, dense, match.date, alignKey]);

  const oddLabelSx = {
    fontSize: s.oddsFont * 0.72,
    fontWeight: 800,
    color: ODD_LABEL_COLOR,
    lineHeight: 1,
  };

  const nameSx = {
    display: 'inline-block', maxWidth: '100%',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };

  return (
    <Box ref={rootRef} sx={{
      height: '100%',
      width: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: `${s.rowGap}px`,
      minWidth: 0,
      minHeight: 0,
      boxSizing: 'border-box',
    }}>
      {/* Date pill — centred on the banner midline (same as X). */}
      <Box sx={{ position: 'relative', height: s.pillH, flexShrink: 0 }}>
        <Box ref={pillRef} sx={{
          position: 'absolute', top: 0, left: 0, transform: 'translateX(-50%)',
          flexShrink: 0,
          ...datePillSx({
            height: s.pillH,
            fontSize: s.pillFont,
            px: s.pillPx,
            bgcolor: resolveDatePillBg(config),
            color: resolveDatePillFg(config),
          }),
        }}><Box component="span">{match.date}</Box></Box>
      </Box>

      {/* Team row — dash on the banner centre line; crests sit on the outer
          sides of the names. Names ellipsize in the leftover space. */}
      <Box ref={teamRowRef} sx={{
        position: 'relative',
        width: '100%', minWidth: 0,
        height: Math.max(s.crest, s.teamFont),
        fontSize: s.teamFont, fontWeight: 600, lineHeight: 1,
        flexShrink: 0,
      }}>
        <Box ref={homeBlockRef} sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, right: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          minWidth: 0, overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: `${s.teamGap}px`,
            maxWidth: '100%', minWidth: 0,
          }}>
            <Box ref={homeCrestRef} sx={{ flexShrink: 0 }}><TeamCrest team={match.home} size={s.crest} /></Box>
            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
              <Box ref={homeNameRef} component="span" sx={nameSx}>{match.home.name}</Box>
            </Box>
          </Box>
        </Box>
        <Box ref={xRef} component="span" sx={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.6, fontWeight: 700, flexShrink: 0, lineHeight: 1,
          zIndex: 1,
        }}>{TEAM_VS}</Box>
        <Box ref={awayBlockRef} sx={{
          position: 'absolute', right: 0, top: 0, bottom: 0, left: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          minWidth: 0, overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: `${s.teamGap}px`,
            maxWidth: '100%', minWidth: 0,
          }}>
            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
              <Box ref={awayNameRef} component="span" sx={nameSx}>{match.away.name}</Box>
            </Box>
            <Box ref={awayCrestRef} sx={{ flexShrink: 0 }}><TeamCrest team={match.away} size={s.crest} /></Box>
          </Box>
        </Box>
      </Box>

      {/* Odds row — 1 / X / 2 sit at a fixed offset from the ad centre. */}
      <Box ref={oddsRowRef} sx={{
        position: 'relative',
        height: s.oddsH,
        fontSize: s.oddsFont, fontWeight: 700, lineHeight: 1,
        flexShrink: 0,
      }}>
        <Box ref={homeOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={oddLabelSx}>{ODD_OUTCOME_LABELS[0]}</Box>
          <Box component="span">{match.odds[0]}</Box>
        </Box>
        <Box ref={tieOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={oddLabelSx}>{ODD_OUTCOME_LABELS[1]}</Box>
          <Box component="span">{match.odds[1]}</Box>
        </Box>
        <Box ref={awayOddRef} sx={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', lineHeight: 1 }}>
          <Box component="span" sx={oddLabelSx}>{ODD_OUTCOME_LABELS[2]}</Box>
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
  // Odds use a flex row that mirrors the team row (crest column padding +
  // centre X gap) so 1 / X / 2 stay equidistant from the middle without JS.
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
  const nameCrestGap = d.teamsGap;
  const xSideGap = d.xSideGap ?? Math.round(nameCrestGap * 2);
  // Push 1 / 2 outward (toward the crests) so they don't sit on the dash.
  const oddsInset = nameCrestGap + d.crest;
  const slotSx = (align) => ({
    flex: wrapNames ? '1 1 auto' : '0 1 auto', minWidth: 0,
    textAlign: align,
    display: 'flex', alignItems: 'center',
    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    minHeight: d.teamFont * 1.1,
    overflow: 'hidden',
  });
  const textSx = {
    maxWidth: '100%',
    fontSize: d.teamFont, fontWeight: 600, lineHeight: 1.15,
    ...(wrapNames
      ? {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
          overflowWrap: 'break-word',
          wordBreak: 'normal',
          whiteSpace: 'normal',
        }
      : {
          display: 'inline-block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }),
  };
  const oddLabelSx = {
    fontSize: Math.round(d.oddsFont * 0.68),
    fontWeight: 800,
    color: ODD_LABEL_COLOR,
    lineHeight: 1.2,
  };
  const oddCell = (label, value) => (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: d.oddsFont,
      fontWeight: 700,
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      <Box component="span" sx={oddLabelSx}>{label}</Box>
      <Box component="span">{value}</Box>
    </Box>
  );

  return (
    <Box data-match-card sx={{
      bgcolor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: `${d.cardRadius}px`,
      padding: d.cardPad,
      display: 'flex', flexDirection: 'column', gap: `${d.rowGap}px`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <Box sx={datePillSx({
          height: d.pillH,
          fontSize: d.pillFont,
          px: d.pillH * 0.7,
          bgcolor: resolveDatePillBg(config),
          color: resolveDatePillFg(config),
        })}><Box component="span">{match.date}</Box></Box>
      </Box>
      {/* Crests sit on the outer sides of the names; dash is the centre. */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Box sx={{
          flex: 1, minWidth: 0, justifyContent: 'flex-end',
          display: 'flex', alignItems: 'center', overflow: 'hidden',
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: `${nameCrestGap}px`,
            maxWidth: '100%', minWidth: 0,
            ...(wrapNames ? { flex: 1 } : {}),
          }}>
            <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.home} size={d.crest} /></Box>
            <Box sx={slotSx('right')}>
              <Box ref={homeRef} component="span" data-team-name="home" sx={textSx}>{match.home.name}</Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{
          fontSize: d.xFont, fontWeight: 700, opacity: 0.65, flexShrink: 0,
          mx: `${xSideGap}px`,
        }}>{TEAM_VS}</Box>
        <Box sx={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', overflow: 'hidden',
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: `${nameCrestGap}px`,
            maxWidth: '100%', minWidth: 0,
            ...(wrapNames ? { flex: 1 } : {}),
          }}>
            <Box sx={slotSx('left')}>
              <Box ref={awayRef} component="span" data-team-name="away" sx={textSx}>{match.away.name}</Box>
            </Box>
            <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.away} size={d.crest} /></Box>
          </Box>
        </Box>
      </Box>
      {/* Odds sit under the crest–name clusters, not against the centre dash. */}
      <Box sx={{
        display: 'flex', alignItems: 'center', minWidth: 0,
        minHeight: Math.ceil(d.oddsFont * 1.2),
        overflow: 'visible',
      }}>
        <Box sx={{
          flex: 1, minWidth: 0,
          display: 'flex', justifyContent: 'flex-end',
          pr: `${oddsInset}px`,
        }}>
          {oddCell(ODD_OUTCOME_LABELS[0], match.odds[0])}
        </Box>
        <Box sx={{
          position: 'relative', flexShrink: 0, mx: `${xSideGap}px`,
          fontSize: d.xFont, fontWeight: 700, lineHeight: 1,
        }}>
          <Box sx={{ visibility: 'hidden' }} aria-hidden>{TEAM_VS}</Box>
          <Box sx={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            {oddCell(ODD_OUTCOME_LABELS[1], match.odds[1])}
          </Box>
        </Box>
        <Box sx={{
          flex: 1, minWidth: 0,
          display: 'flex', justifyContent: 'flex-start',
          pl: `${oddsInset}px`,
        }}>
          {oddCell(ODD_OUTCOME_LABELS[2], match.odds[2])}
        </Box>
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

/**
 * Horizontal match carousel — only the cards slide; logo / CTA / dots / legal
 * footer stay fixed (mirrors GAM dba-runtime + production carousel.css).
 */
function MatchCarouselViewport({
  matchSlideCount, matchesPerSlide, visualPos, transitionOn, durationMs = 720,
  renderSlide, sx, pillPad = 8, isolateSlides = false,
}) {
  // Clip the viewport always. Per-slide overflow:hidden is required for banner
  // (absolute X/odds from off-screen slides used to paint into the visible card).
  const viewportSx = {
    overflow: 'hidden',
    width: '100%',
    minWidth: 0,
    flexShrink: 0,
    pt: `${pillPad}px`,
    boxSizing: 'border-box',
    ...sx,
  };
  const slideClipSx = {
    overflow: isolateSlides ? 'hidden' : 'visible',
    minWidth: 0,
    boxSizing: 'border-box',
  };
  const n = matchSlideCount;
  if (n <= 1) {
    const matches = DBA_SAMPLE_MATCHES.slice(0, matchesPerSlide);
    return (
      <Box sx={viewportSx}>
        <Box sx={{ ...slideClipSx, height: '100%', width: '100%' }}>
          {renderSlide(matches, { minWidth: 0, flexShrink: 0, height: '100%', width: '100%' })}
        </Box>
      </Box>
    );
  }

  const pos = Math.min(Math.max(0, visualPos), n);
  const slideCount = n + 1;

  return (
    <Box sx={viewportSx}>
      <Box sx={{
        display: 'flex',
        height: '100%',
        width: `${slideCount * 100}%`,
        transform: `translateX(-${(pos * 100) / slideCount}%)`,
        transition: transitionOn ? `transform ${durationMs}ms cubic-bezier(0.32, 0.72, 0.24, 1)` : 'none',
      }}>
        {Array.from({ length: slideCount }).map((_, i) => {
          const slideIdx = i < n ? i : 0;
          const start = slideIdx * matchesPerSlide;
          const matches = DBA_SAMPLE_MATCHES.slice(start, start + matchesPerSlide);
          return (
            <Box
              key={i}
              sx={{
                ...slideClipSx,
                flex: `0 0 ${100 / slideCount}%`,
                width: `${100 / slideCount}%`,
                height: '100%',
              }}
            >
              {renderSlide(matches, { minWidth: 0, flexShrink: 0, height: '100%', width: '100%' })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function AdPreview({
  config, sizeId, bookmaker, scale = 1, slideIdx = 0, countries = [],
  displayPos, transitionOn = true, carouselDurationMs = 720,
}) {
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
      bgcolor: config.legal?.bgColor || LEGAL_BAND_BG_DEFAULT, color: config.legal?.color || '#FFFFFF',
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
  const showWelcome = hasWelcome && (
    safeIdx === 0
    || displayPos === 0
    || (displayPos != null && displayPos === totalSlides)
  );
  const matchSlideIdx = hasWelcome ? safeIdx - 1 : safeIdx;

  const carouselPos = displayPos != null
    ? (hasWelcome ? Math.max(0, displayPos - 1) : displayPos)
    : Math.max(0, matchSlideIdx);
  const matchTrackPos = matchSlideCount > 1
    ? Math.min(Math.max(0, carouselPos), matchSlideCount)
    : Math.max(0, matchSlideIdx);

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
  const renderInAdDots = ({ rowHeight, dotSize, mt = 6, absoluteBottom }) => (
    !isBanner && totalSlides > 1 ? (
      <Box sx={{
        height: rowHeight,
        ...(absoluteBottom != null
          ? { position: 'absolute', left: 0, right: 0, bottom: absoluteBottom, zIndex: 3 }
          : { mt: `${mt}px`, flexShrink: 0 }),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <CarouselDots count={totalSlides} active={safeIdx} color={config.text} dotSize={dotSize} />
      </Box>
    ) : null
  );

  const renderMatchCarousel = (d, { cardGap, columnSx, bannerDense, pillPad } = {}) => (
    <MatchCarouselViewport
      matchSlideCount={matchSlideCount}
      matchesPerSlide={matchesPerSlide}
      visualPos={matchTrackPos}
      transitionOn={transitionOn}
      durationMs={carouselDurationMs}
      pillPad={pillPad ?? Math.ceil((d.pillH || 16) / 2)}
      isolateSlides={isBanner}
      sx={columnSx}
      renderSlide={(matches, innerSx) => (
        isBanner ? (
          <Box sx={{
            ...innerSx,
            display: 'flex', alignItems: 'stretch', justifyContent: 'center',
            height: '100%', minHeight: 0, overflow: 'hidden',
          }}>
            <BannerMatchSection
              match={matches[0] || DBA_SAMPLE_MATCHES[0]}
              config={config}
              dense={bannerDense}
              alignKey={matchTrackPos}
            />
          </Box>
        ) : (
          <MatchCardColumn
            matches={matches}
            config={config}
            d={d}
            sx={{
              display: 'flex', flexDirection: 'column', gap: `${cardGap ?? d.rowGap}px`,
              ...innerSx,
            }}
          />
        )
      )}
    />
  );

  // BANNER · 320×50
  const renderBanner = () => {
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
    const b = useBrazilBand ? BANNER.brazil : BANNER.default;
    const hasLegalStrip = !!(config.legal?.enabled && !useBrazilBand);
    const footerClearance = useBrazilBand
      ? brazilBandH + b.contentGap
      : (hasLegalStrip ? b.legal.badgeSize + 2 : 2);
    const lift = useBrazilBand ? (b.lift || 0) : 0;
    const sideColSx = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pb: `${footerClearance}px`, boxSizing: 'border-box', minWidth: 0,
      transform: lift ? `translateY(-${lift}px)` : undefined,
    };
    // Match column: pill sits 5px from the ad top; BannerMatchSection uses a
    // fixed equal gap between pill · teams · odds.
    const matchColSx = {
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
      pt: `${b.topPad}px`,
      pb: `${footerClearance}px`,
      boxSizing: 'border-box',
      minWidth: 0,
      minHeight: 0,
    };
    return (
      <Box data-dba-banner sx={{
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
        <Box sx={sideColSx}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={b.logoSize} radius={4} bare />
        </Box>
        <Box sx={matchColSx}>
          {renderMatchCarousel(
            useBrazilBand ? BANNER.brazil.match : BANNER.default.match,
            {
              bannerDense: useBrazilBand,
              pillPad: 0,
              columnSx: { height: '100%', width: '100%', flex: 1, minHeight: 0, pt: 0 },
            },
          )}
        </Box>
        <Box sx={sideColSx}>
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

  // MPU · 300×250 — match carousel pinned to MPU_LAYOUT.axisY; logo hangs above it.
  const renderMPU = () => {
    const d = useBrazilBand
      ? { cardRadius: 11, cardPad: '8px 10px 9px', pillH: 14, pillFont: 8,
          teamsGap: 5, xSideGap: 10, teamFont: 11, crest: 17.25, xFont: 11,
          oddsGap: 10, oddsFont: 9, oddsDot: 4, rowGap: 4 }
      : { cardRadius: 12, cardPad: '8px 12px 10px', pillH: 16, pillFont: 9,
          teamsGap: 6, xSideGap: 12, teamFont: 12, crest: 20.7, xFont: 12,
          oddsGap: 12, oddsFont: 10, oddsDot: 5, rowGap: 6 };
    const sidePad = useBrazilBand ? MPU_LAYOUT.sidePad.brazil : MPU_LAYOUT.sidePad.default;
    const logoSpec = useBrazilBand ? MPU_LAYOUT.logo.brazil : MPU_LAYOUT.logo.default;
    const pillPad = useBrazilBand ? MPU_LAYOUT.pillPad.brazil : MPU_LAYOUT.pillPad.default;
    const cardGap = useBrazilBand ? MPU_LAYOUT.cardGap.brazil : MPU_LAYOUT.cardGap.default;
    const ctaH = useBrazilBand ? 26 : 30;
    const ctaFont = useBrazilBand ? 11 : 12;
    const dotsRowH = 10;
    const dotsGap = 4;
    const ctaGapAboveDots = 4;
    const hasLegalStrip = !!(config.legal?.enabled && !useBrazilBand);
    const dotsBottom = useBrazilBand ? brazilBandH + dotsGap : (hasLegalStrip ? 12 : 6);
    const ctaBottom = dotsBottom + dotsRowH + ctaGapAboveDots;
    const bottomPad = ctaBottom + ctaH;
    const stackSx = {
      position: 'absolute',
      top: MPU_LAYOUT.axisY,
      left: sidePad,
      right: sidePad,
      transform: 'translateY(-50%)',
    };
    const logoWrapSx = {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: `translateX(-50%) translateY(${MPU_LAYOUT.logoOffsetY}px)`,
      mb: `${MPU_LAYOUT.logoGap}px`,
    };
    return wrap(
      <>
        <Box sx={stackSx}>
          <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={logoWrapSx}>
              <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={logoSpec.w} height={logoSpec.h} radius={6} bare />
            </Box>
            {renderMatchCarousel(d, {
              cardGap,
              columnSx: { flexShrink: 0, width: '100%' },
              pillPad,
            })}
          </Box>
        </Box>
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', height: ctaH,
          position: 'absolute', left: sidePad, right: sidePad, bottom: ctaBottom, zIndex: 2,
          borderRadius: `${Math.min(radius, 6)}px`,
          fontSize: ctaFont, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
        }}>{config.ctaText}</Box>
        {renderInAdDots({ rowHeight: dotsRowH, dotSize: 4, absoluteBottom: dotsBottom })}
        {config.legal && config.legal.enabled && (
          useBrazilBand ? renderBrazilLegalBand(brazilBandH, 7, 11) : (
          <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
              <Age18PlusBadge size={13} />
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.legal.text || 'Jogue com responsabilidade'}
            </Box>
          </Box>
          )
        )}
      </>,
      // Bottom pad reserves the pinned CTA + dots stack above the legal footer.
      `0px ${sidePad}px ${bottomPad}px`
    );
  };

  // INTERSTITIAL · 640×1280
  const renderInterstitial = () => {
    // Cards sit 5px from the template edge; long team names wrap (not ellipsis).
    const sidePad = 5;
    const d = { cardRadius: 36, cardPad: '16px 20px 24px', pillH: 44, pillFont: 22,
                teamsGap: 10, xSideGap: 12, teamFont: 30, crest: 73.6, xFont: 30,
                oddsGap: 32, oddsFont: 24, oddsDot: 12, rowGap: 16, wrapNames: true };
    const cardGap = useBrazilBand ? 32 : 40;
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
        {renderMatchCarousel(d, {
          cardGap,
          columnSx: {
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            justifyContent: 'flex-start',
          },
          pillPad: 0,
        })}
        {useBrazilBand ? (
          <Box sx={{
            flex: '0 0 auto',
            display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', justifyContent: 'center', gap: '24px',
            pt: '24px',
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
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, 20, 31) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: 20, left: sidePad, right: sidePad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
              <Age18PlusBadge size={31} />
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
          useBrazilBand ? renderBrazilLegalBand(brazilBandH, 7, 11) : (
          <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
              <Age18PlusBadge size={13} />
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
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, 20, 31) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: 20, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
              <Age18PlusBadge size={31} />
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
