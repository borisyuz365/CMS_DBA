import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { LogoThumb } from './DbaPrimitives';
import { bgCss, invertText, SIZE_DIMS, MPU_LAYOUT, resolveLogoUrl, competitorLogoUrl, BRAZIL_LEGAL_FALLBACK_TEXT, LEGAL_BAND_BG_DEFAULT, resolveDatePillBg, resolveDatePillFg, resolveOddsBoxBg, resolveOddsTextColor, resolveCardBg, isInterstitialSize } from './dbaUtils';
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
// `flat` — interstitial: no circular halo / drop-shadow behind the crest.
function TeamCrest({ team, size, flat = false }) {
  const logoUrl = team?.id != null ? competitorLogoUrl(team.id) : null;
  const [imageOk, setImageOk] = useState(!!logoUrl);

  const initialsCircle = (
    <Box sx={{
      width: size, height: size, borderRadius: flat ? 0 : '50%',
      bgcolor: flat ? 'transparent' : team.bg, color: team.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(7, size * 0.36), fontWeight: 800,
      letterSpacing: '-0.02em', flexShrink: 0,
      border: (!flat && team.bg === '#FFFFFF') ? '1px solid rgba(0,0,0,0.15)' : 'none',
      boxShadow: flat ? 'none' : '0 1px 2px rgba(0,0,0,0.18)',
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
        filter: flat ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
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

function MatchRow({ match, config, d, syncFonts = false, fillHeight = false, outerSx }) {
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
  // Interstitial shows a stylized "VS" (smaller, heavier); MPU keeps the plain dash.
  const vsText = wrapNames ? 'VS' : TEAM_VS;
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
    fontSize: d.teamFont, fontWeight: wrapNames ? 500 : 600, lineHeight: 1.15,
    ...(wrapNames
      ? {
          // bwin reference: wrap long names to 2 lines, then ellipsize.
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          wordBreak: 'normal',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
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
      bgcolor: wrapNames ? resolveCardBg(config) : 'rgba(255,255,255,0.06)',
      border: wrapNames ? 'none' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: `${d.cardRadius}px`,
      padding: d.cardPad,
      display: 'flex', flexDirection: 'column',
      gap: `${d.rowGap}px`,
      justifyContent: 'flex-start',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      ...(fillHeight ? {
        flex: '1 1 0', minHeight: 0, height: 0,
        justifyContent: 'center',
      } : {}),
      ...outerSx,
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
      {wrapNames ? (
        // Interstitial: no team names — crests sit on the outer edges, with
        // the three odds as boxed chips in between.
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0,
          flexShrink: 0, width: '100%', minHeight: d.crest, gap: '3%',
        }}>
          <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.home} size={d.crest} flat /></Box>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{
              flex: '1 1 0', minWidth: 0, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: resolveOddsBoxBg(config),
              borderRadius: `${Math.round(d.oddsFont * 0.7)}px`,
              padding: `${Math.round(d.oddsFont * 0.5)}px ${Math.round(d.oddsFont * 0.3)}px`,
            }}>
              <Box component="span" sx={{ fontSize: d.oddsTextFont, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', color: resolveOddsTextColor(config) }}>
                {match.odds[i]}
              </Box>
            </Box>
          ))}
          <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.away} size={d.crest} flat /></Box>
        </Box>
      ) : (
        <>
          {/* MPU: crests flank the names; odds sit under the crest–name clusters. */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 0, width: '100%' }}>
            <Box sx={{
              flex: 1, minWidth: 0, width: 0,
              justifyContent: 'flex-end',
              display: 'flex', alignItems: 'center', overflow: 'hidden',
            }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: `${nameCrestGap}px`,
                maxWidth: '100%', minWidth: 0, width: '100%',
              }}>
                <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.home} size={d.crest} /></Box>
                <Box sx={slotSx('right')}>
                  <Box ref={homeRef} component="span" data-team-name="home" sx={textSx}>{match.home.name}</Box>
                </Box>
              </Box>
            </Box>
            <Box sx={{
              fontSize: d.xFont, fontWeight: 700, opacity: 0.75, flexShrink: 0,
              mx: `${xSideGap}px`, letterSpacing: '0.02em', lineHeight: 1,
            }}>{vsText}</Box>
            <Box sx={{
              flex: 1, minWidth: 0, width: 0,
              justifyContent: 'flex-start',
              display: 'flex', alignItems: 'center', overflow: 'hidden',
            }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: `${nameCrestGap}px`,
                maxWidth: '100%', minWidth: 0, width: '100%',
              }}>
                <Box sx={slotSx('left')}>
                  <Box ref={awayRef} component="span" data-team-name="away" sx={textSx}>{match.away.name}</Box>
                </Box>
                <Box sx={{ flexShrink: 0 }}><TeamCrest team={match.away} size={d.crest} /></Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{
            display: 'flex', alignItems: 'center', minWidth: 0,
            minHeight: Math.ceil(d.oddsFont * 1.2),
            overflow: 'visible', flexShrink: 0, width: '100%',
          }}>
            <Box sx={{ flex: 1, minWidth: 0, width: 0, display: 'flex', justifyContent: 'flex-end', pr: `${oddsInset}px` }}>
              {oddCell(ODD_OUTCOME_LABELS[0], match.odds[0])}
            </Box>
            <Box sx={{
              position: 'relative', flexShrink: 0, mx: `${xSideGap}px`,
              fontSize: d.xFont, fontWeight: 700, lineHeight: 1, letterSpacing: '0.02em',
            }}>
              <Box sx={{ visibility: 'hidden' }} aria-hidden>{vsText}</Box>
              <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                {oddCell(ODD_OUTCOME_LABELS[1], match.odds[1])}
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, width: 0, display: 'flex', justifyContent: 'flex-start', pl: `${oddsInset}px` }}>
              {oddCell(ODD_OUTCOME_LABELS[2], match.odds[2])}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

/** Column of match cards — same teamFont on every card (no per-card shrink). */
function MatchCardColumn({ matches, config, d, sx, fillCards = false, legacyCard }) {
  return (
    <Box sx={sx}>
      {matches.map((m, i) => (
        <MatchRow
          key={i}
          match={m}
          config={config}
          d={d}
          syncFonts
          fillHeight={fillCards === true}
          outerSx={legacyCard ? {
            height: legacyCard.height,
            flexShrink: 0,
            // px string — numeric margins get multiplied by MUI theme spacing (×8)
            marginBottom: i < matches.length - 1 ? `${legacyCard.gap}px` : 0,
            boxSizing: 'border-box',
          } : undefined}
        />
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
    minHeight: 0,
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
  const isInterstitial = isInterstitialSize(sizeId);
  const isBanner = sizeId === '320x50';
  const radius = config.radius || 8;
  const isBrazil = Array.isArray(countries) && countries.includes('BR');
  const useBrazilBand = isBrazil && !!config.legal?.enabled;
  // ~10% of ad height; floor so the two-line SPA/MF copy stays readable.
  const brazilBandH = Math.max(isBanner ? 12 : 25, Math.round(h * 0.1));

  const isMpu = !isBanner && !isInterstitial;
  const mpuStackRef = useRef(null);
  const mpuAdRef = useRef(null);
  // Height (px) of the empty band from ad top → top edge of the match stack.
  // Logo is flex-centered inside that band so it sits exactly mid-gap.
  const [mpuGapH, setMpuGapH] = useState(0);
  const mpuLogoH = useBrazilBand ? MPU_LAYOUT.logo.brazil.h : MPU_LAYOUT.logo.default.h;

  // Brazil (SPA/MF): full-width disclaimer band (~10% of ad).
  // 18+ is a badge; copy is the Ministério da Fazenda sentence only.
  const brazilLegalText = (() => {
    const raw = (config.legal?.text || BRAZIL_LEGAL_FALLBACK_TEXT).trim();
    return raw.replace(/^\s*18\+?\s*JOGUE COM RESPONSABILIDADE\.?\s*/i, '').trim() || BRAZIL_LEGAL_FALLBACK_TEXT;
  })();
  const renderBrazilLegalBand = (heightPx, fontSize, badgeSize, fontWeight = 700) => (
    <Box sx={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: heightPx, zIndex: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${Math.max(4, heightPx * 0.14)}px`,
      px: `${Math.max(3, heightPx * 0.12)}px`, py: `${Math.max(1, heightPx * 0.06)}px`, boxSizing: 'border-box',
      bgcolor: config.legal?.bgColor || LEGAL_BAND_BG_DEFAULT, color: config.legal?.color || '#FFFFFF',
      fontSize, lineHeight: 1.15, fontWeight, textAlign: 'left',
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

  // MPU logo: flex-center in the measured band between ad top and top card.
  useLayoutEffect(() => {
    if (!isMpu || showWelcome) {
      setMpuGapH(0);
      return undefined;
    }

    const measure = () => {
      const stack = mpuStackRef.current;
      const ad = mpuAdRef.current;
      if (!stack || !ad) return;
      const adRect = ad.getBoundingClientRect();
      const stackRect = stack.getBoundingClientRect();
      // wrap uses transform: scale(scale) — convert screen px → local layout px.
      const sy = ad.offsetHeight ? (adRect.height / ad.offsetHeight) : 1;
      const cardTop = Math.max(0, (stackRect.top - adRect.top) / (sy || 1));
      setMpuGapH((prev) => (Math.abs(prev - cardTop) < 0.5 ? prev : cardTop));
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (mpuStackRef.current) ro?.observe(mpuStackRef.current);
    const t1 = requestAnimationFrame(measure);
    const t2 = window.setTimeout(measure, 50);
    const t3 = window.setTimeout(measure, 250);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isMpu, showWelcome, mpuLogoH, slideIdx, sizeId, useBrazilBand, scale]);



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
  const wrap = (children, pad, customBg, rootRef = null) => (
    <Box ref={rootRef} sx={{
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

  const renderMatchCarousel = (d, { cardGap, columnSx, bannerDense, pillPad, fillCards, legacyCard } = {}) => (
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
            fillCards={fillCards}
            legacyCard={legacyCard}
            sx={{
              display: 'flex', flexDirection: 'column',
              gap: legacyCard ? 0 : `${cardGap ?? d.rowGap}px`,
              ...innerSx,
              ...(fillCards ? { height: '100%', minHeight: 0, flex: '1 1 auto' } : {}),
              ...(legacyCard ? {
                flex: '1 1 auto',
                minHeight: 0,
                height: '100%',
                justifyContent: 'flex-start',
                gap: 0,
                boxSizing: 'border-box',
              } : {}),
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

  // MPU · 300×250 — logo fixed at top-center; match cards centered in the band below.
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
    // MPU logo: hard 28px image height, centered in the mid-gap band.
    // Position with top offset (no flex height clamp) so nothing can shrink it.
    const logoFitH = 28;
    const logoUrl = resolveLogoUrl(bookmaker, config);
    const logoWrapSx = {
      position: 'absolute',
      top: Math.max(0, (mpuGapH - logoFitH) / 2),
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 2,
    };
    const stackSx = {
      position: 'absolute',
      top: MPU_LAYOUT.axisY,
      left: sidePad,
      right: sidePad,
      transform: 'translateY(-50%)',
    };
    return wrap(
      <>
        <Box sx={logoWrapSx}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt=""
              style={{ height: 28, width: 'auto', display: 'block', flexShrink: 0 }}
              sx={{
                height: '28px !important',
                width: 'auto',
                minHeight: '28px',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
                flexShrink: 0,
              }}
            />
          ) : (
            <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} size={34} height={28} radius={6} bare />
          )}
        </Box>
        <Box ref={mpuStackRef} sx={stackSx}>
          {renderMatchCarousel(d, {
            cardGap,
            columnSx: { flexShrink: 0, width: '100%' },
            pillPad,
          })}
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
      // No horizontal pad (GAM .ad padding:0). sidePad is on stack/CTA only.
      // Bottom pad reserves the pinned CTA + dots stack above the legal footer.
      `0px 0px ${bottomPad}px`,
      null,
      mpuAdRef,
    );
  };

  // INTERSTITIAL · preview canvas 640×1280 (tall device slot; inventory is 320×480).
  // Cards ~27% of width (bwin reference +10%) with roomy inner date/teams/odds gaps.
  const renderInterstitial = () => {
    const vw = (pct) => Math.round(w * (pct / 100));
    // Interstitial content (logo/cards/CTA) is designed for a 2:3 (w:h) box.
    // Real ad slots vary — some are much taller (e.g. 640x1280 = 1:2). Rather
    // than leaving that extra height as dead space below the cards, scale the
    // whole ad up as if it were authored at a wider "effective" width `we`,
    // so logo/crests/text/CTA all grow together to fill more of the slot.
    // Purely horizontal/positional values (side padding, card width) stay
    // tied to the true render width `w` so nothing overflows sideways.
    const designScale = Math.max(0.85, Math.min(2.2, h / (w * 1.5)));
    const we = w * designScale;
    const vwe = (pct) => Math.round(we * (pct / 100));
    // Height-driven, not a forced square: real bookmaker logos are usually wide
    // wordmarks (see design ref), and boxing them at width=height wasted
    // vertical space that belongs to the match cards below.
    const interstitialLogoW = Math.min(vw(92), vwe(62));
    const interstitialLogoH = Math.max(26, vwe(9));
    const logoTop = vwe(3);
    const logoBlock = logoTop + interstitialLogoH;
    const ctaH = Math.max(50, vwe(10));
    const dotsH = Math.max(14, vwe(2.8));
    const ctaBlock = dotsH + ctaH + vwe(3);
    const bottomPad = useBrazilBand ? brazilBandH : (config.legal?.enabled ? 48 : 0);
    const legalH = useBrazilBand ? brazilBandH : 0;
    const sidePad = Math.round(w * 0.05);
    const matchesEst = Math.max(200, h - logoBlock - ctaBlock - legalH - vwe(2));
    const cardsPerSlide = 3;
    // Cards ~26% of effective width (was 27% originally; inter-card gap
    // overshot to 12.8% last round and read as too much dead space between
    // cards, so it's pulled back close to the original ~3.8% here). The two
    // ratios are sized together (3*26 + 2*5.3 ≈ 3*27 + 2*3.8) so the stack
    // still covers the same total height.
    const maxCardH = vwe(26);
    const cardGap = Math.max(20, vwe(5.3));
    const cardH = Math.max(72, Math.min(maxCardH, Math.floor((matchesEst - cardGap * (cardsPerSlide - 1)) / cardsPerSlide)));
    // Team names 10% smaller, odds 10% larger than the previous pass — sized
    // independently now (odds is no longer capped below team). Crest +20%,
    // odds +15% again on top of that (crests now live on the odds row).
    // Team names bigger again (production feedback: previous pass read too
    // small); crest bigger again (crests live on the odds row now), then
    // bumped once more on top of that per later feedback.
    const teamFont = Math.max(20, Math.min(vwe(4.6), Math.round(cardH * 0.15)));
    const crest = Math.max(46, Math.min(vwe(9.5), Math.round(cardH * 0.4)));
    // Odds-box SIZE (radius/padding) — its own value now (was briefly tied
    // to pillFont per an earlier "same size as date/time" request; a later
    // request asked for the odds specifically to grow, then this pass
    // brought it back down 15%).
    const oddsFont = Math.max(24, Math.min(vwe(4.6), Math.round(cardH * 0.162)));
    // Odds NUMBER text — smaller than the box size above, per a request to
    // shrink just the digits without shrinking the boxes around them (10%,
    // then another 15% on top per follow-up feedback that it still read too
    // big: 0.9 * 0.85 = 0.765).
    const oddsTextFont = Math.round(oddsFont * 0.765);
    // Gap between the date pill and the crest/odds line below it. Capped to
    // a share of cardH too — on a short card the font-driven value alone
    // would overflow the fixed card box.
    const innerGap = Math.max(14, Math.min(Math.round(teamFont * 1.6), Math.round(cardH * 0.2)));
    const cardPadTop = 5;
    const cardPadBottom = Math.max(6, Math.round(cardH * 0.04));
    const d = {
      cardRadius: vwe(2.5),
      cardPad: `${cardPadTop}px ${Math.round(w * 0.04)}px ${cardPadBottom}px`,
      pillH: Math.max(23, vwe(3.0)), pillFont: vwe(2.8),
      teamsGap: vwe(1.2), xSideGap: vwe(1.6), teamFont,
      crest, xFont: Math.round(teamFont * 0.8),
      oddsGap: vwe(1.5), oddsFont, oddsTextFont, oddsDot: 10,
      rowGap: innerGap,
      wrapNames: true,
    };
    const ctaFont = vwe(3.29);
    const dots = renderInAdDots({ rowHeight: dotsH, dotSize: Math.max(5, vwe(0.7)), mt: 0 });
    const ctaZone = (
      <Box sx={{
        flexShrink: 0,
        mt: 'auto',
        pt: `${vwe(2)}px`,
        pb: `${vwe(6)}px`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', gap: `${vwe(1.8)}px`,
      }}>
        {dots}
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', width: '95%', height: ctaH, minHeight: 50,
          position: 'relative', flexShrink: 0,
          borderRadius: `${vwe(1.2)}px`,
          fontSize: ctaFont, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          boxShadow: '0 2px 4px 0 rgba(0, 32, 27, 0.69)',
        }}>{config.ctaText}</Box>
      </Box>
    );
    return wrap(
      <>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mt: `${logoTop}px`, mb: `${Math.round(w * 0.015)}px`, flexShrink: 0,
        }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={interstitialLogoW} height={interstitialLogoH} radius={vw(2)} bare />
        </Box>
        {renderMatchCarousel(d, {
          fillCards: false,
          cardGap,
          legacyCard: { height: cardH, gap: cardGap },
          columnSx: {
            flex: '1 1 0',
            minHeight: 0,
            height: 'auto',
            overflow: 'hidden',
            flexShrink: 1,
            justifyContent: 'flex-start',
            pt: `${Math.max(4, Math.round(w * 0.008))}px`,
          },
          pillPad: 0,
        })}
        {ctaZone}
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, vw(2.0), 31, 600) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: '0.5%', left: '1%', right: '1%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: vw(2.4), color: config.legal.color || config.text, opacity: 0.85 }}>
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
      `40px ${sidePad}px ${bottomPad}px`
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
      `0 2.5% ${bottomPad}px`,
      welcomeBg,
    );
  };

  const renderWelcomeInterstitial = () => {
    const vw = (pct) => Math.round(w * (pct / 100));
    const bottomPad = useBrazilBand ? brazilBandH : 48;
    const ctaH = Math.max(44, Math.round(w * 0.0875));
    const dotsH = Math.max(14, Math.round(w * 0.028));
    const ctaBtn = (
      <Box component="button" sx={{
        background: woCtaBg, color: woCtaFg,
        border: 'none', width: '92%', height: ctaH, minHeight: 40,
        position: 'relative', flexShrink: 0,
        borderRadius: '10px',
        fontSize: vw(4.62), fontWeight: 800, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
        boxShadow: '0 2px 4px 0 rgba(0, 32, 27, 0.69)',
      }}>{woCtaText}</Box>
    );
    const dots = renderInAdDots({ rowHeight: dotsH, dotSize: Math.max(5, vw(0.7)), mt: 0 });
    return wrap(
      <>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mt: `${Math.round(w * 0.03)}px`, flexShrink: 0,
        }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={Math.round(w * 0.62)} height={Math.max(26, Math.min(64, Math.round(w * 0.09)))} radius={vw(2)} bare />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: `${vw(3)}px`, flexShrink: 0 }}>
          <Box sx={{
            padding: `${vw(1)}px ${vw(2.5)}px`, borderRadius: 999,
            bgcolor: woPillBg, color: woPillFg,
            fontSize: vw(2.5), fontWeight: 800, letterSpacing: '0.08em', textIndent: '0.08em',
            textTransform: 'uppercase', textAlign: 'center',
          }}>{woPillText}</Box>
        </Box>
        <Box sx={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: `${vw(2)}px`,
          textAlign: 'center', minHeight: 0,
        }}>
          {wo.image && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={wo.image} alt="" sx={{ maxHeight: vw(30), maxWidth: '100%', objectFit: 'contain' }} />
            </Box>
          )}
          <Box sx={{ fontSize: vw(6.2), fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.03em' }}>{woHeadline}</Box>
          <Box sx={{ fontSize: vw(4), opacity: 0.85, lineHeight: 1.25, fontWeight: 500 }}>{woSubtext}</Box>
        </Box>
        <Box sx={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
        }}>
          {dots}
          {ctaBtn}
          <Box sx={{ mt: `${vw(2)}px`, fontSize: vw(2.5), opacity: 0.55, textAlign: 'center', lineHeight: 1.3 }}>{woTerms}</Box>
        </Box>
        {useBrazilBand ? renderBrazilLegalBand(brazilBandH, vw(2.0), 31, 600) : (
          config.legal && config.legal.enabled ? (
          <Box sx={{ position: 'absolute', bottom: '0.5%', left: '1%', right: '1%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: vw(2.4), color: config.legal.color || config.text, opacity: 0.85 }}>
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
      `0 2.5% ${bottomPad}px`,
      welcomeBg,
    );
  };

  if (isBanner) return showWelcome ? renderWelcomeBanner() : renderBanner();
  if (isInterstitial) return showWelcome ? renderWelcomeInterstitial() : renderInterstitial();
  return showWelcome ? renderWelcomeMPU() : renderMPU();
}
