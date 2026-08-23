import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Select, MenuItem,
  FormControl, Stack, Divider, Snackbar, Alert,
  CircularProgress, Slider, Switch, FormControlLabel, Tooltip, Autocomplete,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { DBA_PLATFORMS } from '../../data/dbaData';
import './365-sans.css';

// Auto-derived from the selected bookmaker's BMID — no manual logo upload needed.
const BOOKMAKER_LOGO_BASE = 'https://imagecache.365scores.com/image/upload/f_webp,w_80,c_limit,q_auto,dpr_2,d_Bookmakers:Round:default.png/v101/Bookmakers/';
const bookmakerLogoUrl = (bmid) => (bmid !== null && bmid !== undefined && bmid !== '' ? `${BOOKMAKER_LOGO_BASE}${bmid}` : null);

// Strip background auto-derived from T_BET_BOOKMAKERS.COLOR (primary colour),
// exposed as `brandColor` on bookmakerOptions (see getDbaBookmakerPool mapping below).
const bookmakerBrandColor = (bmid, bookmakerOptions) =>
  bookmakerOptions?.find((o) => o.bmid === bmid)?.brandColor || null;

// Real production CID (T_COUNTRIES.COUNTRY_ID) for Italy — drives the
// Italy-only regulatory logos, matching the same constant in bpService.js.
const ITALY_CID = 3;

function isItalyCid(cid) {
  return Number(cid) === ITALY_CID;
}

function Age18PlusBadge({ size = 16 }) {
  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: '#0A0A0A',
      color: '#FFFFFF',
      fontSize: size * 0.5,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: '-0.06em',
      flexShrink: 0,
    }}>
      18+
    </Box>
  );
}

const PREVIEW_FONT_FAMILY = "'365 Sans', sans-serif";

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <Box sx={{ '&:not(:first-of-type)': { borderTop: '1px solid #E5E5E5', pt: 3 }, pb: 3 }}>
      {title && (
        <Typography variant="caption" fontWeight={700} textTransform="uppercase"
          letterSpacing="0.08em" color="text.secondary" display="block" mb={1.5}>
          {title}
        </Typography>
      )}
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

function Field({ label, help, children }) {
  return (
    <Box>
      <Typography fontSize="0.8rem" fontWeight={600} mb={0.5}>{label}</Typography>
      {help && <Typography fontSize="0.72rem" color="text.secondary" mb={0.5}>{help}</Typography>}
      {children}
    </Box>
  );
}

function ColField({ label, help, value, onChange }) {
  return (
    <Field label={label} help={help}>
      <Stack direction="row" spacing={1} alignItems="center">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ width: 36, height: 36, border: 'none', padding: 0, borderRadius: 4, cursor: 'pointer' }}
        />
        <TextField
          size="small"
          value={value || ''}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          inputProps={{ maxLength: 9, style: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
          sx={{ flex: 1 }}
        />
      </Stack>
    </Field>
  );
}

// ── Interstitial preview ──────────────────────────────────────────────────────

function BookiePreviewCard({ bookie, index, bookmakerOptions }) {
  const stripBg = (bookie.stripColors || [])[0] || bookmakerBrandColor(bookie.bmid, bookmakerOptions) || '#333333';
  const contentBg = bookie.sectionBgColor || '#000000';
  const logoSrc = bookie.logoImageUrl || bookmakerLogoUrl(bookie.bmid);

  return (
    <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: nativePx(32) }}>
      {/* Top strip: logo left, CTA right — 80px native */}
      <Box sx={{
        bgcolor: stripBg,
        height: nativePx(80), flexShrink: 0,
        px: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      }}>
        <Box sx={{ height: 26, display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {logoSrc
            ? <img src={logoSrc} alt=""
                style={{ height: '100%', width: 'auto', maxWidth: 110, objectFit: 'contain' }} />
            : <Typography fontSize="0.62rem" fontWeight={700} color="#fff">{`BK${index + 1}`}</Typography>
          }
        </Box>
        <Box sx={{ bgcolor: '#fff', borderRadius: 10, px: 1.25, py: 0.35, flexShrink: 0 }}>
          <Typography fontSize={nativePx(20)} fontWeight={400} color="#111">
            {bookie.ctaText || 'Visit Site'}
          </Typography>
        </Box>
      </Box>

      {/* Content area: title + description (description also carries T&Cs) — 180px native */}
      <Box sx={{
        bgcolor: contentBg, height: nativePx(180), overflow: 'hidden', flexShrink: 0,
        px: 1.5, pt: 0.9, pb: 1.1,
        wordBreak: 'break-word', overflowWrap: 'break-word',
        textAlign: 'center',
      }}>
        <Typography fontSize={nativePx(28)} fontWeight={600} color={bookie.titleTextColor || '#fff'}
          lineHeight={1.2} mb={0.35}>
          {bookie.titleText || `Bonus Offer ${index + 1}`}
        </Typography>
        {bookie.subtitleText && (
          <Typography fontSize={nativePx(20)} fontWeight={400} color={bookie.subtitleTextColor || '#A6A6A6'}
            lineHeight={1.4} mb={0.25}>
            {bookie.subtitleText}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function previewBackground(form) {
  const { bgType, pageBgColor, bgGradientColor1, bgGradientColor2, bgGradientAngle, bgImageUrl } = form;
  if (bgType === 'gradient') {
    const c1 = bgGradientColor1 || '#0a1628';
    const c2 = bgGradientColor2 || '#1a3060';
    return `linear-gradient(${bgGradientAngle ?? 135}deg, ${c1}, ${c2})`;
  }
  if (bgType === 'image' && bgImageUrl) {
    return `url(${bgImageUrl}) center/cover no-repeat`;
  }
  const c = pageBgColor || '#0a1628';
  return `linear-gradient(175deg, ${c} 0%, ${c}dd 100%)`;
}

// 640×1280 native ad canvas. Preview renders at 270×540 for editor real
// estate — NOT exactly half-scale (that'd be 320×640) — so native px specs
// must go through NATIVE_SCALE (0.421875), not a flat ÷2.
const PREVIEW_W = 270;
const PREVIEW_H = 540;
const NATIVE_SCALE = PREVIEW_W / 640;
const nativePx = (px) => `${+(px * NATIVE_SCALE).toFixed(2)}px`;

// Client renders the header image/badge at a fixed height — not sent by the
// server and not configurable per-promotion.
const HEADER_IMAGE_HEIGHT = 110;

function InterstitialPreview({ form, bookmakerOptions }) {
  const { header, bookies, legal, cid } = form;

  return (
    <Box sx={{
      width: PREVIEW_W,
      height: PREVIEW_H,
      background: previewBackground(form),
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: PREVIEW_FONT_FAMILY,
      '& .MuiTypography-root': { fontFamily: 'inherit' },
    }}>
      {/* Side glow effects */}
      <Box sx={{ position: 'absolute', left: -20, top: '30%', width: 40, height: 220,
        background: 'radial-gradient(ellipse, rgba(30,100,255,0.35) 0%, transparent 70%)',
        pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', right: -20, top: '30%', width: 40, height: 220,
        background: 'radial-gradient(ellipse, rgba(30,100,255,0.35) 0%, transparent 70%)',
        pointerEvents: 'none' }} />

      {/* Header image / badge — optional; takes no space when unset. Fixed
          height (client-side constant, not sent by the server). */}
      {header.imageUrl && (
        <Box sx={{ height: HEADER_IMAGE_HEIGHT, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <img src={header.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      {/* Titles */}
      {/* No header image: 120px native from the very top of the interstitial to the headline. */}
      <Box sx={{ px: 1.75, pt: header.imageUrl ? 1.25 : nativePx(120), pb: 0.75, textAlign: 'center', flexShrink: 0 }}>
        <Typography
          // No header image: main title is the hero text — 48px native, DemiBold.
          // With a header image/badge above it, the title stays smaller so the badge keeps focus.
          fontSize={header.imageUrl ? '1rem' : nativePx(48)}
          fontWeight={header.imageUrl ? 900 : 600}
          lineHeight={1.1}
          color={header.mainTitle?.color || '#fff'}
          letterSpacing="0.01em">
          {header.mainTitle?.text || 'Biggest Signup Bonus'}
        </Typography>
        <Typography fontSize={nativePx(32)} fontWeight={400} color={header.secondaryTitle?.color || '#CCCCCC'} mt={0.4} mb={1}>
          {header.secondaryTitle?.text || 'Compare Offers & Claim Your Bonus'}
        </Typography>
      </Box>

      {/* Bookmaker cards — fills remaining space; legal pinned to bottom */}
      <Box sx={{ flex: 1, minHeight: 0, px: 1.25, pb: 1.25, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {[0, 1, 2].map((i) => (
            <BookiePreviewCard key={i} bookie={bookies[i] || {}} index={i} bookmakerOptions={bookmakerOptions} />
          ))}
        </Box>
        {legal?.enabled && (
          <Box sx={{ pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Age18PlusBadge size={17} />
            <Typography fontSize="0.56rem" color={legal.color || '#666666'} lineHeight={1.4} sx={{ flex: 1 }}>
              {legal.text || 'Gamble responsibly'}
            </Typography>
            {isItalyCid(cid) && (
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                {legal.regulatoryLogos?.map((logo, i) => (
                  <Box key={i} component="img" src={logo.src} alt="" sx={{ height: 16, width: 'auto', flexShrink: 0 }} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Bookie section ────────────────────────────────────────────────────────────

function BookieSection({ index, bookie, onChange, bookmakerOptions, descriptionError }) {
  const set = (key, val) => onChange({ ...bookie, [key]: val });
  const setStrip = (idx, val) => {
    const colors = [...(bookie.stripColors || ['#000000', '#000000'])];
    colors[idx] = val;
    onChange({ ...bookie, stripColors: colors });
  };

  const selectedOption = bookmakerOptions.find((o) => o.bmid === bookie.bmid) || null;

  return (
    <Box sx={{ border: '1px solid #E5E5E5', borderRadius: 2, p: 2 }}>
      <Typography fontSize="0.8rem" fontWeight={700} mb={2} color="text.secondary">
        Bookmaker {index + 1}
      </Typography>
      <Stack spacing={2}>
        <Field label="Bookmaker" help="Select from the DBA bookmakers">
          <Autocomplete
            size="small"
            options={bookmakerOptions}
            value={selectedOption}
            onChange={(_, opt) => set('bmid', opt?.bmid ?? null)}
            getOptionLabel={(o) => `${o.name} (BMID ${o.bmid})`}
            isOptionEqualToValue={(o, v) => o.bmid === v.bmid}
            renderOption={(props, o) => (
              <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 24, height: 24, borderRadius: 0.5, flexShrink: 0,
                  bgcolor: o.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography fontSize="0.55rem" fontWeight={700} color={o.logoFg || '#fff'}>{o.initials}</Typography>
                </Box>
                <Box>
                  <Typography fontSize="0.82rem">{o.name}</Typography>
                  <Typography fontSize="0.7rem" color="text.secondary">BMID {o.bmid}</Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search bookmaker…" />
            )}
          />
        </Field>
        <ColField label="Content area background" value={bookie.sectionBgColor || '#12193A'}
          onChange={(v) => set('sectionBgColor', v)} />
        <Field label="Title text">
          <TextField size="small" fullWidth value={bookie.titleText || ''}
            onChange={(e) => set('titleText', e.target.value)} placeholder="e.g. Bonus up to €500" />
        </Field>
        <ColField label="Title text colour" value={bookie.titleTextColor || '#ffffff'}
          onChange={(v) => set('titleTextColor', v)} />
        <Field label="Description *" help="Mandatory — smaller text below the title. Also carries bonus terms/T&Cs (Italian regulation) — no separate terms field.">
          <TextField
            size="small" fullWidth multiline minRows={2} maxRows={6}
            required
            error={!!descriptionError}
            helperText={descriptionError ? 'Description is required' : ''}
            value={bookie.subtitleText || ''}
            onChange={(e) => set('subtitleText', e.target.value)}
            placeholder="e.g. Fino a 50€ sul deposito + 25€ Scommesse + fino a 2.000€ Scommesse. T&C Lottomatica."
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }}
          />
        </Field>
        <ColField label="Description text colour" value={bookie.subtitleTextColor || '#999999'}
          onChange={(v) => set('subtitleTextColor', v)} />
        <Field label="CTA text">
          <TextField size="small" fullWidth value={bookie.ctaText || ''}
            onChange={(e) => set('ctaText', e.target.value)} />
        </Field>
        <ColField label="CTA text colour" value={bookie.ctaTextColor || '#ffffff'}
          onChange={(v) => set('ctaTextColor', v)} />
        <ColField label="Strip bg colour" help="Auto-filled from the bookmaker's brand colour — only set this to override."
          value={(bookie.stripColors || [])[0] || selectedOption?.brandColor || '#000000'}
          onChange={(v) => setStrip(0, v)} />
        <Field label="Logo image URL (override)" help="Auto-filled from the selected bookmaker's BMID — only set this to use a different image.">
          <TextField size="small" fullWidth placeholder={bookmakerLogoUrl(bookie.bmid) || 'https://…'}
            value={bookie.logoImageUrl || ''}
            onChange={(e) => set('logoImageUrl', e.target.value)} />
        </Field>
        <Field label="Click URL">
          <TextField size="small" fullWidth placeholder="https://…"
            value={bookie.clickUrl || ''}
            onChange={(e) => set('clickUrl', e.target.value)} />
        </Field>
      </Stack>
    </Box>
  );
}

// ── Default form state ────────────────────────────────────────────────────────

const DEFAULT_BOOKIE = { position: 0, bmid: '', sectionBgColor: '#12193A',
  titleText: '', titleTextColor: '#FFFFFF',
  subtitleText: '', subtitleTextColor: '#999999', ctaText: '', ctaTextColor: '#FFFFFF',
  stripColors: ['', '#000000'], logoImageUrl: '', clickUrl: '' };

const DEFAULT_FORM = {
  name: '',
  cid: '',
  platform: 'All',
  lid: null,
  lang: '',
  publisher: '',
  campaign: '',
  sov: 100,
  active: true,
  pageBgColor: '#0a1628',
  bgType: 'solid',
  bgGradientColor1: '#0a1628',
  bgGradientColor2: '#1a3060',
  bgGradientAngle: 135,
  bgImageUrl: '',
  header: {
    mainTitle:      { text: '', color: '#ffffff' },
    secondaryTitle: { text: '', color: '#ffffff' },
    imageUrl: '',
    imageHeight: 110,
  },
  legal: {
    enabled: false, text: '', color: '#ffffff', link: '',
    regulatoryLogos: [
      { src: '/legal-logos/italia-gambling-full.svg', link: '' },
      { src: '/legal-logos/italia-gambling-gauge.svg', link: '' },
    ],
  },
  bookies: [
    { ...DEFAULT_BOOKIE, position: 1 },
    { ...DEFAULT_BOOKIE, position: 2 },
    { ...DEFAULT_BOOKIE, position: 3 },
  ],
};

function promoToForm(promo) {
  const bookies = [1, 2, 3].map((pos) => {
    const found = promo.bookies?.find((b) => b.position === pos);
    return found ? { subtitleTextColor: '#999999', ...found } : { ...DEFAULT_BOOKIE, position: pos };
  });
  return {
    name: promo.name || '',
    cid: promo.cid ?? '',
    platform: promo.platform || 'All',
    lid: promo.lid ?? null,
    lang: promo.lang ?? '',
    publisher: promo.publisher ?? '',
    campaign: promo.campaign ?? '',
    sov: promo.sov ?? 100,
    active: promo.active !== false,
    pageBgColor:      promo.pageBgColor || '#0a1628',
    bgType:           promo.bgType || 'solid',
    bgGradientColor1: promo.bgGradientColor1 || '#0a1628',
    bgGradientColor2: promo.bgGradientColor2 || '#1a3060',
    bgGradientAngle:  promo.bgGradientAngle ?? 135,
    bgImageUrl:       promo.bgImageUrl || '',
    header: {
      mainTitle:      { text: promo.header?.mainTitle?.text || '',      color: promo.header?.mainTitle?.color || '#ffffff' },
      secondaryTitle: { text: promo.header?.secondaryTitle?.text || '', color: promo.header?.secondaryTitle?.color || '#ffffff' },
      imageUrl:    promo.header?.imageUrl || '',
      imageHeight: promo.header?.imageHeight ?? 110,
    },
    legal: {
      enabled: !!promo.legal?.enabled,
      text:    promo.legal?.text  || '',
      color:   promo.legal?.color || '#ffffff',
      link:    promo.legal?.link  || '',
      regulatoryLogos: [
        { src: '/legal-logos/italia-gambling-full.svg', link: promo.legal?.regulatoryLogos?.[0]?.link || '' },
        { src: '/legal-logos/italia-gambling-gauge.svg', link: promo.legal?.regulatoryLogos?.[1]?.link || '' },
      ],
    },
    bookies,
  };
}

function formToPayload(form) {
  return {
    ...form,
    cid: form.cid !== '' ? Number(form.cid) : null,
    lid: form.lid !== '' ? Number(form.lid) : null,
    lang: form.lang !== '' ? Number(form.lang) : null,
    publisher: form.publisher !== '' ? Number(form.publisher) : null,
    campaign: form.campaign?.trim() || null,
    sov: Number(form.sov),
    bookies: form.bookies.map((b, i) => ({
      ...b,
      position: i + 1,
      bmid: b.bmid !== '' ? Number(b.bmid) : null,
    })),
  };
}

// ── Inner editor ──────────────────────────────────────────────────────────────

function BpEditorInner({ initial, isNew, bookmakerOptions, countries, languages, draftKey }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return initial ? promoToForm(initial) : { ...DEFAULT_FORM };
  });
  const [hasDraft, setHasDraft] = useState(() => {
    try { return !!localStorage.getItem(draftKey); } catch { return false; }
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [zoom, setZoom] = useState(1.4);
  const [errors, setErrors] = useState({ name: false, bookieDescriptions: [false, false, false] });

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch {}
  }, [form, draftKey]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setHeader = (key, val) => setForm((f) => ({ ...f, header: { ...f.header, [key]: val } }));
  const setHeaderTitle = (which, key, val) =>
    setForm((f) => ({ ...f, header: { ...f.header, [which]: { ...f.header[which], [key]: val } } }));
  const setBookie = (index, val) =>
    setForm((f) => { const b = [...f.bookies]; b[index] = val; return { ...f, bookies: b }; });

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setForm(initial ? promoToForm(initial) : { ...DEFAULT_FORM });
    setHasDraft(false);
  };

  const handleSave = async () => {
    const nameError = !form.name.trim();
    const bookieDescriptionErrors = form.bookies.map((b) => !b.subtitleText?.trim());
    if (nameError || bookieDescriptionErrors.some(Boolean)) {
      setErrors({ name: nameError, bookieDescriptions: bookieDescriptionErrors });
      const missingDescriptions = bookieDescriptionErrors.map((err, i) => (err ? i + 1 : null)).filter(Boolean);
      const msgs = [];
      if (nameError) msgs.push('Name is required');
      if (missingDescriptions.length) msgs.push(`Description is required for bookmaker${missingDescriptions.length > 1 ? 's' : ''} ${missingDescriptions.join(', ')}`);
      setToast({ kind: 'error', msg: msgs.join(' · ') });
      return;
    }
    setErrors({ name: false, bookieDescriptions: [false, false, false] });
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (isNew) {
        await apiService.createBpPromotion(payload);
      } else {
        await apiService.updateBpPromotion(initial.id, payload);
      }
      try { localStorage.removeItem(draftKey); } catch {}
      setToast({ kind: 'success', msg: isNew ? 'Promotion created' : 'Saved' });
      setTimeout(() => navigate('/bp/promotions'), 800);
    } catch (err) {
      setToast({ kind: 'error', msg: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header bar */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #E5E5E5', bgcolor: '#fff',
        display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Tooltip title="Back to BP Management">
          <IconButton size="small" onClick={() => navigate('/bp/promotions')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Typography fontWeight={600} fontSize="0.95rem" sx={{ flex: 1 }}>
          {isNew ? 'New Promotion' : `Edit — ${initial?.name}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ bgcolor: '#f5f5f5', px: 1, py: 0.3, borderRadius: 1 }}>
          Interstitial
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {isNew ? 'Create' : 'Save'}
        </Button>
      </Box>

      {/* Body: form + preview */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Form panel */}
        <Box sx={{ width: 380, borderRight: '1px solid #E5E5E5', overflowY: 'auto',
          flexShrink: 0, px: 3, py: 3 }}>

          {hasDraft && (
            <Box sx={{ mx: -3, mt: -3, mb: 2, px: 2, py: 0.75, bgcolor: '#fff8e1',
              borderBottom: '1px solid #ffe082', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontSize="0.78rem" color="text.secondary" sx={{ flex: 1 }}>
                Unsaved draft restored
              </Typography>
              <Button size="small" onClick={discardDraft}
                sx={{ fontSize: '0.72rem', color: 'text.secondary', minWidth: 0, px: 1 }}>
                Discard
              </Button>
            </Box>
          )}

          <Section title="Version info">
            <Field label="Name">
              <TextField size="small" fullWidth value={form.name}
                error={errors.name}
                helperText={errors.name ? 'Name is required' : ''}
                onChange={(e) => { set('name', e.target.value); if (errors.name) setErrors((er) => ({ ...er, name: false })); }}
                placeholder="e.g. Brazil Android Q3" />
            </Field>
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => set('active', e.target.checked)} size="small" />}
              label={<Typography fontSize="0.85rem">Active</Typography>}
            />
          </Section>

          <Section title="Targeting">
            <Field label="Geo">
              <FormControl size="small" fullWidth>
                <Select
                  value={form.cid}
                  onChange={(e) => set('cid', e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">🌐 All countries</MenuItem>
                  {countries.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
            <Field label="Platform">
              <FormControl size="small" fullWidth>
                <Select value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                  {DBA_PLATFORMS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
            <Field label="Language">
              <FormControl size="small" fullWidth>
                <Select value={form.lang} onChange={(e) => set('lang', e.target.value)}>
                  <MenuItem value="">All languages</MenuItem>
                  {languages.map((l) => (
                    <MenuItem key={l.id} value={l.id}>{l.name} ({l.id})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
            <Field label="Publisher" help="Publisher ID — leave blank to match all">
              <TextField size="small" fullWidth type="number" inputProps={{ min: 1 }}
                value={form.publisher}
                onChange={(e) => set('publisher', e.target.value)}
                placeholder="e.g. 147" />
            </Field>
            <Field label="Campaign" help="Leave blank to match all campaigns">
              <TextField size="small" fullWidth
                value={form.campaign}
                onChange={(e) => set('campaign', e.target.value)}
                placeholder="e.g. summer_promo" />
            </Field>
            <Field label={`Share of Voice — ${form.sov}%`} help="Traffic weight relative to other matching versions">
              <Slider min={0} max={100} value={form.sov} onChange={(_, v) => set('sov', v)} />
            </Field>
          </Section>

          <Section title="Header">
            <Field label="Main title text">
              <TextField size="small" fullWidth value={form.header.mainTitle.text}
                onChange={(e) => setHeaderTitle('mainTitle', 'text', e.target.value)} />
            </Field>
            <ColField label="Main title colour" value={form.header.mainTitle.color}
              onChange={(v) => setHeaderTitle('mainTitle', 'color', v)} />
            <Field label="Secondary title text">
              <TextField size="small" fullWidth value={form.header.secondaryTitle.text}
                onChange={(e) => setHeaderTitle('secondaryTitle', 'text', e.target.value)} />
            </Field>
            <ColField label="Secondary title colour" value={form.header.secondaryTitle.color}
              onChange={(v) => setHeaderTitle('secondaryTitle', 'color', v)} />
            <Field label="Header image / badge URL" help="Optional — e.g. a 'Special Offer / Limited Time' badge graphic. Leave blank for a plain text header with no reserved space above it. Rendered at a fixed height set by the client — not configurable here.">
              <TextField size="small" fullWidth placeholder="https://…"
                value={form.header.imageUrl}
                onChange={(e) => setHeader('imageUrl', e.target.value)} />
            </Field>
          </Section>

          <Section title="Page style">
            <Field label="Background type">
              <ToggleButtonGroup
                value={form.bgType || 'solid'}
                exclusive
                onChange={(_, v) => v && set('bgType', v)}
                size="small"
                fullWidth
                sx={{ '& .MuiToggleButton-root': { flex: 1, fontSize: '0.78rem', py: 0.6 } }}
              >
                <ToggleButton value="solid">Solid</ToggleButton>
                <ToggleButton value="gradient">Gradient</ToggleButton>
                <ToggleButton value="image">Image</ToggleButton>
              </ToggleButtonGroup>
            </Field>

            {(!form.bgType || form.bgType === 'solid') && (
              <ColField label="Background colour" value={form.pageBgColor}
                onChange={(v) => set('pageBgColor', v)} />
            )}

            {form.bgType === 'gradient' && (
              <>
                <Stack direction="row" spacing={1}>
                  <ColField label="Colour 1" value={form.bgGradientColor1 || '#0a1628'}
                    onChange={(v) => set('bgGradientColor1', v)} />
                  <ColField label="Colour 2" value={form.bgGradientColor2 || '#1a3060'}
                    onChange={(v) => set('bgGradientColor2', v)} />
                </Stack>
                <Field label={`Angle — ${form.bgGradientAngle ?? 135}°`}>
                  <Slider min={0} max={360} value={form.bgGradientAngle ?? 135}
                    onChange={(_, v) => set('bgGradientAngle', v)} />
                </Field>
              </>
            )}

            {form.bgType === 'image' && (
              <Field label="Background image URL">
                <TextField size="small" fullWidth placeholder="https://…"
                  value={form.bgImageUrl || ''}
                  onChange={(e) => set('bgImageUrl', e.target.value)} />
              </Field>
            )}
          </Section>

          <Section title="Bookmakers">
            {[0, 1, 2].map((i) => (
              <BookieSection key={i} index={i} bookie={form.bookies[i] || {}}
                onChange={(val) => {
                  setBookie(i, val);
                  if (errors.bookieDescriptions[i]) {
                    setErrors((er) => {
                      const next = [...er.bookieDescriptions];
                      next[i] = false;
                      return { ...er, bookieDescriptions: next };
                    });
                  }
                }}
                bookmakerOptions={bookmakerOptions}
                descriptionError={errors.bookieDescriptions[i]} />
            ))}
          </Section>

          <Section title="Legal (optional)">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!form.legal?.enabled}
                  onChange={(e) => set('legal', { ...(form.legal || {}), enabled: e.target.checked })}
                />
              }
              label={
                <Typography fontSize="0.85rem" color="text.secondary">
                  {form.legal?.enabled ? 'Shown in ad footer' : 'Hidden'}
                </Typography>
              }
            />
            {form.legal?.enabled && (
              <>
                <Field label="Legal text" help="e.g. 18+ · Gamble responsibly · BeGambleAware.org">
                  <TextField
                    size="small" fullWidth multiline maxRows={3}
                    inputProps={{ maxLength: 200 }}
                    placeholder="18+ · Gamble responsibly"
                    value={form.legal?.text || ''}
                    onChange={(e) => set('legal', { ...(form.legal || {}), text: e.target.value })}
                  />
                </Field>
                <ColField
                  label="Legal text colour"
                  value={form.legal?.color || '#ffffff'}
                  onChange={(v) => set('legal', { ...(form.legal || {}), color: v })}
                />
                <Field label="Legal link URL" help="Optional — links the legal text">
                  <TextField
                    size="small" fullWidth placeholder="https://begambleaware.org"
                    value={form.legal?.link || ''}
                    onChange={(e) => set('legal', { ...(form.legal || {}), link: e.target.value })}
                  />
                </Field>
                {isItalyCid(form.cid) && (
                  <Field label="Regulatory logos" help="Both logos appear on the right of the footer — set each link">
                    <Stack spacing={1}>
                      {[
                        { idx: 0, src: '/legal-logos/italia-gambling-full.svg', placeholder: 'Italia Gioco Legale URL' },
                        { idx: 1, src: '/legal-logos/italia-gambling-gauge.svg', placeholder: 'ADM gauge URL' },
                      ].map(({ idx, src, placeholder }) => (
                        <Stack key={idx} direction="row" spacing={1} alignItems="center">
                          <Box sx={{ bgcolor: '#1A2340', borderRadius: 0.5, px: 0.5, py: 0.25, flexShrink: 0 }}>
                            <Box component="img" src={src} alt="" sx={{ height: 16, width: 'auto', display: 'block' }} />
                          </Box>
                          <TextField size="small" fullWidth placeholder={placeholder}
                            value={form.legal?.regulatoryLogos?.[idx]?.link || ''}
                            onChange={(e) => {
                              const logos = (form.legal?.regulatoryLogos || []).map((l, i) =>
                                i === idx ? { ...l, link: e.target.value } : l
                              );
                              set('legal', { ...(form.legal || {}), regulatoryLogos: logos });
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Field>
                )}
              </>
            )}
          </Section>

          <Section title="League targeting">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={form.lid !== '' && form.lid !== null}
                  onChange={(e) => set('lid', e.target.checked ? '' : null)}
                />
              }
              label={<Typography fontSize="0.85rem">Target a specific league (LID)</Typography>}
            />
            {form.lid !== null && (
              <Field label="League ID" help="365Scores league ID — leave blank to save as unset">
                <TextField
                  size="small" fullWidth type="number"
                  value={form.lid ?? ''}
                  onChange={(e) => set('lid', e.target.value)}
                  placeholder="e.g. 31"
                  autoFocus
                />
              </Field>
            )}
          </Section>
        </Box>

        {/* Preview panel */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#FAFAFA', overflow: 'hidden', minWidth: 0 }}>
          {/* Toolbar */}
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #E5E5E5', bgcolor: '#fff',
            display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" letterSpacing="0.08em"
              textTransform="uppercase" fontWeight={600} sx={{ flex: 1 }}>
              Preview · Interstitial
            </Typography>
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}>
              <Typography fontSize="1rem" lineHeight={1} color="text.secondary">−</Typography>
            </IconButton>
            <Typography fontSize="0.78rem" fontWeight={600} color="text.secondary" sx={{ minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}>
              <Typography fontSize="1rem" lineHeight={1} color="text.secondary">+</Typography>
            </IconButton>
            <Button size="small" variant="outlined" sx={{ fontSize: '0.7rem', py: 0.3, minWidth: 0, px: 1 }}
              onClick={() => setZoom(1)}>
              Reset
            </Button>
          </Box>

          {/* Scrollable canvas — outer box has visual dimensions so scroll works correctly */}
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex',
            alignItems: 'flex-start', justifyContent: 'center', pt: 4, pb: 4 }}>
            <Box sx={{
              width: PREVIEW_W * zoom,
              height: PREVIEW_H * zoom,
              flexShrink: 0,
              transition: 'width 0.15s ease, height 0.15s ease',
            }}>
              <Box sx={{
                width: PREVIEW_W,
                height: PREVIEW_H,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease',
              }}>
                <InterstitialPreview form={form} bookmakerOptions={bookmakerOptions} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.kind || 'info'} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ── Outer loader ──────────────────────────────────────────────────────────────

export default function BpEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const [initial, setInitial] = useState(null);
  const [bookmakerOptions, setBookmakerOptions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const promoPromise = isNew ? Promise.resolve(null) : apiService.getBpPromotion(id);
    Promise.all([promoPromise, apiService.getDbaBookmakerPool(), apiService.getBpCountries(), apiService.getLanguages()])
      .then(([promo, bms, cids, langs]) => {
        if (cancelled) return;
        setInitial(promo);
        // Pool response: { id: "bk_47", name, brandColor, defaultLogo: { bg, fg, initials } }
        const opts = (Array.isArray(bms) ? bms : []).map((bm) => ({
          bmid:       parseInt(bm.id.replace('bk_', ''), 10),
          name:       bm.name,
          brandColor: bm.brandColor || bm.defaultLogo?.bg,
          logoFg:     bm.defaultLogo?.fg || '#ffffff',
          initials:   bm.defaultLogo?.initials || bm.name?.slice(0, 3).toUpperCase(),
        })).filter((o) => !isNaN(o.bmid));
        setBookmakerOptions(opts);
        // Countries response: { id, name } — real T_COUNTRIES CIDs, not backend/data/countries.json.
        setCountries(Array.isArray(cids) ? cids : []);
        setLanguages(Array.isArray(langs) ? langs : []);
        setReady(true);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [id, isNew]);

  if (loadError) return <Box sx={{ p: 4 }}><Typography color="error">{loadError}</Typography></Box>;
  if (!ready) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const draftKey = isNew ? 'bp_draft_new' : `bp_draft_${id}`;
  return <BpEditorInner key={id || 'new'} initial={initial} isNew={isNew} bookmakerOptions={bookmakerOptions} countries={countries} languages={languages} draftKey={draftKey} />;
}
