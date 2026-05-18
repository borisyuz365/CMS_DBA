import React from 'react';
import { Box } from '@mui/material';
import { LogoThumb } from './DbaPrimitives';
import { bgCss, invertText, SIZE_DIMS, resolveLogoUrl } from './dbaUtils';
import { DBA_SAMPLE_MATCHES } from '../../data/dbaData';

function TeamCrest({ team, size }) {
  return (
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

function MatchRow({ match, config, d }) {
  return (
    <Box sx={{
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
        bgcolor: 'rgba(0,0,0,0.55)',
        color: config.text,
        fontSize: d.pillFont, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>{match.date}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.teamsGap}px`, mt: `${d.pillH / 2}px` }}>
        <Box sx={{ flex: 1, textAlign: 'right', fontSize: d.teamFont, fontWeight: 600, lineHeight: 1.1 }}>{match.home.name}</Box>
        <TeamCrest team={match.home} size={d.crest} />
        <Box sx={{ fontSize: d.xFont, fontWeight: 700, opacity: 0.65, px: `${d.crest * 0.05}px` }}>X</Box>
        <TeamCrest team={match.away} size={d.crest} />
        <Box sx={{ flex: 1, textAlign: 'left', fontSize: d.teamFont, fontWeight: 600, lineHeight: 1.1 }}>{match.away.name}</Box>
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

export default function AdPreview({ config, sizeId, bookmaker, scale = 1, slideIdx = 0 }) {
  const [w, h] = SIZE_DIMS[sizeId] || [300, 250];
  const isInterstitial = sizeId === '640x1280';
  const isBanner = sizeId === '320x50';
  const radius = config.radius || 8;

  const wo = config.welcomeOffer || {};
  const woCtaText = (wo.ctaText && wo.ctaText.trim()) || config.ctaText;
  const woCtaBg = wo.ctaColor || config.cta;
  const woCtaFg = wo.ctaTextColor || invertText(woCtaBg);
  const woHeadline = wo.headline || 'Get £30 in Free Bets';
  const woSubtext = wo.subtext || 'Bet £10, get £30 when you sign up';
  const woTerms = wo.terms || 'New customers only · 18+ · T&Cs apply';

  const matchesPerSlide = isInterstitial ? 3 : isBanner ? 1 : 2;
  const matchSlideCount = Math.max(1, Math.ceil(DBA_SAMPLE_MATCHES.length / matchesPerSlide));
  const hasWelcome = !!wo.enabled;
  const totalSlides = (hasWelcome ? 1 : 0) + matchSlideCount;
  const safeIdx = totalSlides ? ((slideIdx % totalSlides) + totalSlides) % totalSlides : 0;
  const showWelcome = hasWelcome && safeIdx === 0;
  const matchSlideIdx = hasWelcome ? safeIdx - 1 : safeIdx;
  const matchStart = matchSlideIdx * matchesPerSlide;
  const slideMatches = DBA_SAMPLE_MATCHES.slice(matchStart, matchStart + matchesPerSlide);

  const wrap = (children, pad) => (
    <Box sx={{
      width: w, height: h,
      background: bgCss(config), color: config.text,
      borderRadius: `${radius}px`, overflow: 'hidden',
      fontFamily: '"365 Sans", Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding: pad,
      boxSizing: 'border-box', position: 'relative',
      transform: `scale(${scale})`, transformOrigin: 'top left',
    }}>{children}</Box>
  );

  // BANNER · 320×50
  const renderBanner = () => {
    const m = slideMatches[0] || DBA_SAMPLE_MATCHES[0];
    return (
      <Box sx={{
        width: w, height: h,
        background: bgCss(config), color: config.text,
        borderRadius: `${radius}px`, overflow: 'hidden',
        fontFamily: '"365 Sans", Inter, sans-serif',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', columnGap: 1,
        padding: '4px 8px', boxSizing: 'border-box', position: 'relative',
        transform: `scale(${scale})`, transformOrigin: 'top left',
      }}>
        <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={24} radius={3} bare />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: 0 }}>
          <Box sx={{
            height: 13, px: '6px', borderRadius: 999,
            bgcolor: 'rgba(0,0,0,0.55)',
            fontSize: 8, fontWeight: 600, letterSpacing: '0.02em',
            display: 'inline-flex', alignItems: 'center',
            whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1,
          }}>{m.date}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 10, fontWeight: 600, lineHeight: 1 }}>
            <Box component="span">{m.home.name}</Box>
            <TeamCrest team={m.home} size={11} />
            <Box component="span" sx={{ opacity: 0.6, fontWeight: 700 }}>X</Box>
            <TeamCrest team={m.away} size={11} />
            <Box component="span">{m.away.name}</Box>
          </Box>
          <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: 9, fontWeight: 700 }}>
            {m.odds.map((o, i) => (
              <Box key={i} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Box component="span" sx={{ width: 3, height: 3, borderRadius: 999, bgcolor: '#FFC107' }} />
                <Box component="span">{o}</Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', height: 30, px: '8px',
          borderRadius: `${Math.min(radius, 4)}px`,
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', letterSpacing: '0.01em',
        }}>{config.ctaText}</Box>
        {config.legal && config.legal.enabled && (config.legal.text || config.legal.logo) && (
          <Box sx={{
            position: 'absolute', left: 4, right: 4, bottom: 1,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 6, color: config.legal.color || config.text, opacity: 0.85,
            pointerEvents: 'none',
          }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 7, width: 'auto' }} />}
              <Box component="span">18+</Box>
            </Box>
            <Box component="span" sx={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.legal.text}</Box>
          </Box>
        )}
      </Box>
    );
  };

  // MPU · 300×250
  const renderMPU = () => {
    const visible = slideMatches.slice(0, 2);
    const d = { cardRadius: 12, cardPad: '14px 12px 10px', pillH: 16, pillFont: 9,
                teamsGap: 6, teamFont: 10, crest: 18, xFont: 11,
                oddsGap: 12, oddsFont: 11, oddsDot: 5, rowGap: 6 };
    return wrap(
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '10px' }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={22} radius={4} bare />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          {visible.map((m, i) => <MatchRow key={i} match={m} config={config} d={d} />)}
        </Box>
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', height: 30, mt: '8px',
          borderRadius: `${Math.min(radius, 6)}px`,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
        }}>{config.ctaText}</Box>
        {config.legal && config.legal.enabled && (
          <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
              <Box component="span">18+</Box>
            </Box>
            <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.legal.text || 'Jogue com responsabilidade'}
            </Box>
          </Box>
        )}
      </>,
      '10px 14px 22px'
    );
  };

  // INTERSTITIAL · 640×1280
  const renderInterstitial = () => {
    const visible = slideMatches.slice(0, 3);
    const d = { cardRadius: 36, cardPad: '40px 36px 32px', pillH: 44, pillFont: 22,
                teamsGap: 18, teamFont: 32, crest: 64, xFont: 32,
                oddsGap: 32, oddsFont: 30, oddsDot: 12, rowGap: 24 };
    return wrap(
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '48px' }}>
          <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={72} radius={12} bare />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '56px', flex: 1 }}>
          {visible.map((m, i) => <MatchRow key={i} match={m} config={config} d={d} />)}
        </Box>
        <Box component="button" sx={{
          background: config.cta, color: config.ctaTextColor || invertText(config.cta),
          border: 'none', height: 96, mt: '40px',
          borderRadius: `${Math.min(radius * 1.5, 20)}px`,
          fontSize: 32, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
        }}>{config.ctaText}</Box>
        <Box sx={{ position: 'absolute', bottom: 20, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: (config.legal && config.legal.color) || config.text, opacity: 0.85 }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {config.legal && config.legal.enabled && config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
            <Box component="span">18+</Box>
          </Box>
          <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(config.legal && config.legal.enabled && config.legal.text) || 'Jogue com responsabilidade'}
          </Box>
        </Box>
      </>,
      '64px 56px 80px'
    );
  };

  // ===== Welcome offer slides =====
  const renderWelcomeBanner = () => (
    <Box sx={{
      width: w, height: h,
      background: bgCss(config), color: config.text,
      borderRadius: `${radius}px`, overflow: 'hidden',
      fontFamily: '"365 Sans", Inter, sans-serif',
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', columnGap: 1,
      padding: '4px 8px', boxSizing: 'border-box', position: 'relative',
      transform: `scale(${scale})`, transformOrigin: 'top left',
    }}>
      <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={24} radius={3} bare />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', minWidth: 0, lineHeight: 1.1, textAlign: 'center' }}>
        <Box sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{woHeadline}</Box>
        <Box sx={{ fontSize: 9, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{woSubtext}</Box>
      </Box>
      <Box component="button" sx={{
        background: woCtaBg, color: woCtaFg,
        border: 'none', height: 30, px: '8px',
        borderRadius: `${Math.min(radius, 4)}px`,
        fontSize: 10, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap', letterSpacing: '0.01em',
      }}>{woCtaText}</Box>
    </Box>
  );

  const renderWelcomeMPU = () => wrap(
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
        <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={22} radius={4} bare />
        <Box sx={{
          padding: '2px 8px', borderRadius: 999,
          bgcolor: '#FFC107', color: '#1A1A1A',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Welcome offer</Box>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '6px', textAlign: 'center', px: '4px' }}>
        {wo.image && <Box component="img" src={wo.image} alt="" sx={{ maxHeight: 50, maxWidth: '100%', objectFit: 'contain', mb: '2px' }} />}
        <Box sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{woHeadline}</Box>
        <Box sx={{ fontSize: 11, opacity: 0.8, lineHeight: 1.25 }}>{woSubtext}</Box>
        <Box sx={{ fontSize: 8, opacity: 0.55, lineHeight: 1.2, mt: '2px' }}>{woTerms}</Box>
      </Box>
      <Box component="button" sx={{
        background: woCtaBg, color: woCtaFg,
        border: 'none', height: 32, mt: '6px',
        borderRadius: `${Math.min(radius, 6)}px`,
        fontSize: 13, fontWeight: 800, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>{woCtaText}</Box>
      {config.legal && config.legal.enabled && (
        <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: config.legal.color || config.text, opacity: 0.85 }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 8, width: 'auto' }} />}
            <Box component="span">18+</Box>
          </Box>
          <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.legal.text || 'Jogue com responsabilidade'}</Box>
        </Box>
      )}
    </>,
    '10px 14px 22px'
  );

  const renderWelcomeInterstitial = () => wrap(
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '40px' }}>
        <LogoThumb bg={bookmaker.logoBg} fg={bookmaker.logoFg} initials={bookmaker.initials} imageUrl={resolveLogoUrl(bookmaker, config)} size={72} radius={12} bare />
        <Box sx={{
          padding: '10px 24px', borderRadius: 999,
          bgcolor: '#FFC107', color: '#1A1A1A',
          fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Welcome offer</Box>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '40px', textAlign: 'center' }}>
        {wo.image && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box component="img" src={wo.image} alt="" sx={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain' }} />
          </Box>
        )}
        <Box sx={{ fontSize: 108, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.03em' }}>{woHeadline}</Box>
        <Box sx={{ fontSize: 36, opacity: 0.85, lineHeight: 1.25, fontWeight: 500 }}>{woSubtext}</Box>
      </Box>
      <Box component="button" sx={{
        background: woCtaBg, color: woCtaFg,
        border: 'none', height: 104, mt: '32px',
        borderRadius: `${Math.min(radius * 1.5, 24)}px`,
        fontSize: 36, fontWeight: 800, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>{woCtaText}</Box>
      <Box sx={{ mt: '20px', fontSize: 18, opacity: 0.55, textAlign: 'center', lineHeight: 1.3 }}>{woTerms}</Box>
      <Box sx={{ position: 'absolute', bottom: 20, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: (config.legal && config.legal.color) || config.text, opacity: 0.85 }}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {config.legal && config.legal.enabled && config.legal.logo && <Box component="img" src={config.legal.logo} alt="" sx={{ height: 22, width: 'auto' }} />}
          <Box component="span">18+</Box>
        </Box>
        <Box component="span" sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(config.legal && config.legal.enabled && config.legal.text) || 'Jogue com responsabilidade'}
        </Box>
      </Box>
    </>,
    '64px 56px 80px'
  );

  if (isBanner) return showWelcome ? renderWelcomeBanner() : renderBanner();
  if (isInterstitial) return showWelcome ? renderWelcomeInterstitial() : renderInterstitial();
  return showWelcome ? renderWelcomeMPU() : renderMPU();
}
