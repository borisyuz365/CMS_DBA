import React from 'react';
import { Box, Chip } from '@mui/material';

// Small status pill used in tables & cards.
// kind: 'live' | 'draft' | 'running' | 'restarting' | 'down'
export function StatusPill({ kind = 'draft', label, sx = {} }) {
  const palettes = {
    live:       { bg: '#E8F5E9', fg: '#2E7D32', dot: '#4CAF50' },
    draft:      { bg: '#F5F5F5', fg: '#525252', dot: '#A3A3A3' },
    running:    { bg: '#E8F5E9', fg: '#2E7D32', dot: '#4CAF50' },
    restarting: { bg: '#FFF3E0', fg: '#F57C00', dot: '#FFA726' },
    down:       { bg: '#FEE2E2', fg: '#EF4444', dot: '#EF4444' },
  };
  const p = palettes[kind] || palettes.draft;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75,
      height: 24, px: 1.25, borderRadius: 999,
      bgcolor: p.bg, color: p.fg, fontSize: 12, fontWeight: 500,
      ...sx,
    }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: p.dot }} />
      {label}
    </Box>
  );
}

// Bookmaker logo. If `imageUrl` is provided, renders the image and falls back
// to a coloured swatch with `initials` if it fails to load.
// `bare` mode (used inside ad creatives) drops the white wrapper + border so
// the logo sits directly on the ad's background.
export function LogoThumb({ bg, fg, initials, imageUrl, size = 40, radius = 8, bare = false }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <Box sx={{
        width: size, height: size, borderRadius: `${radius}px`,
        overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...(bare ? null : { bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.08)' }),
      }}>
        <Box
          component="img"
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: size, height: size,
      borderRadius: `${radius}px`,
      bgcolor: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.28, fontWeight: 700,
      letterSpacing: '-0.02em',
      flexShrink: 0, overflow: 'hidden',
      ...(bare ? null : { border: '1px solid rgba(0,0,0,0.08)' }),
    }}>
      {initials}
    </Box>
  );
}

// iOS-style toggle.
export function Toggle({ on, onChange, ariaLabel }) {
  return (
    <Box
      role="switch"
      aria-checked={!!on}
      aria-label={ariaLabel}
      onClick={() => onChange && onChange(!on)}
      sx={{
        position: 'relative', width: 36, height: 20,
        bgcolor: on ? '#1976D2' : '#D4D4D4',
        borderRadius: 999, cursor: 'pointer',
        transition: 'background 0.18s',
        flexShrink: 0,
        '&::after': {
          content: '""', position: 'absolute', top: 2, left: 2,
          width: 16, height: 16, bgcolor: '#fff', borderRadius: 999,
          transition: 'transform 0.18s',
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        },
      }}
    />
  );
}

// Country chip used in switcher + table.
export function CountryChip({ country, code, name, active, count, onClick, dense = false }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        height: dense ? 26 : 30, px: dense ? 1 : 1.5,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? '#1976D2' : '#E5E5E5',
        bgcolor: active ? '#EFF6FF' : '#fff',
        color: active ? '#1976D2' : '#525252',
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        '&:hover': onClick ? { bgcolor: active ? '#EFF6FF' : '#FAFAFA' } : {},
      }}
    >
      {country?.flag && <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>{country.flag}</Box>}
      <Box component="span">{code === 'GLOBAL' ? 'Global' : code}</Box>
      {typeof count === 'number' && (
        <Box component="span" sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 18, height: 18, px: 0.625, borderRadius: 999,
          bgcolor: active ? '#1976D2' : '#F5F5F5',
          color: active ? '#fff' : '#737373',
          fontSize: 11, fontWeight: 600,
        }}>{count}</Box>
      )}
    </Box>
  );
}
