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
import { DBA_COUNTRIES, DBA_PLATFORMS } from '../../data/dbaData';

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

function ColField({ label, value, onChange }) {
  return (
    <Field label={label}>
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

function BookiePreviewCard({ bookie, index }) {
  const stripBg = (bookie.stripColors || [])[0] || '#333333';
  const contentBg = bookie.sectionBgColor || 'rgba(0,0,0,0.55)';

  return (
    <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: 1.25 }}>
      {/* Top strip: logo left, CTA right */}
      <Box sx={{
        bgcolor: stripBg,
        px: 1.5, py: 0.9,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      }}>
        <Box sx={{ height: 26, display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {bookie.logoImageUrl
            ? <img src={bookie.logoImageUrl} alt=""
                style={{ height: '100%', width: 'auto', maxWidth: 110, objectFit: 'contain' }} />
            : <Typography fontSize="0.62rem" fontWeight={700} color="#fff">{`BK${index + 1}`}</Typography>
          }
        </Box>
        <Box sx={{ bgcolor: '#fff', borderRadius: 10, px: 1.25, py: 0.35, flexShrink: 0 }}>
          <Typography fontSize="0.6rem" fontWeight={700} color="#111">
            {bookie.ctaText || 'Visit Site'}
          </Typography>
        </Box>
      </Box>

      {/* Content area: title + subtitle + terms */}
      <Box sx={{ bgcolor: contentBg, px: 1.5, pt: 0.9, pb: 1.1 }}>
        <Typography fontSize="0.72rem" fontWeight={800} color={bookie.titleTextColor || '#fff'}
          lineHeight={1.2} mb={0.35}>
          {bookie.titleText || `Bonus Offer ${index + 1}`}
        </Typography>
        {bookie.subtitleText && (
          <Typography fontSize="0.6rem" color={bookie.subtitleTextColor || 'rgba(255,255,255,0.65)'}
            lineHeight={1.4} mb={0.25}>
            {bookie.subtitleText}
          </Typography>
        )}
        {bookie.termsText && (
          <Typography fontSize="0.55rem" color="rgba(255,255,255,0.4)" lineHeight={1.3} fontStyle="italic">
            {bookie.termsText}
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

// 640×1280 native — preview is rendered at 270×540 (exactly 1:2)
const PREVIEW_W = 270;
const PREVIEW_H = 540;

function InterstitialPreview({ form }) {
  const { header, bookies, legal, geo } = form;

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
    }}>
      {/* Side glow effects */}
      <Box sx={{ position: 'absolute', left: -20, top: '30%', width: 40, height: 220,
        background: 'radial-gradient(ellipse, rgba(30,100,255,0.35) 0%, transparent 70%)',
        pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', right: -20, top: '30%', width: 40, height: 220,
        background: 'radial-gradient(ellipse, rgba(30,100,255,0.35) 0%, transparent 70%)',
        pointerEvents: 'none' }} />

      {/* Header image / badge — optional; takes no space when unset */}
      {header.imageUrl && (
        <Box sx={{ height: header.imageHeight || 110, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <img src={header.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      {/* Titles */}
      <Box sx={{ px: 1.75, pt: 1.25, pb: 0.75, textAlign: 'center', flexShrink: 0 }}>
        <Typography fontSize="1rem" fontWeight={900} lineHeight={1.1}
          color={header.mainTitle?.color || '#fff'}
          textTransform="uppercase" letterSpacing="0.01em">
          {header.mainTitle?.text || 'BIGGEST SIGNUP BONUS'}
        </Typography>
        <Typography fontSize="0.68rem" color={header.secondaryTitle?.color || 'rgba(255,255,255,0.8)'} mt={0.4} mb={1}>
          {header.secondaryTitle?.text || 'Compare offers & claim your bonus'}
        </Typography>
      </Box>

      {/* Bookmaker cards — fills remaining space; legal pinned to bottom */}
      <Box sx={{ flex: 1, minHeight: 0, px: 1.25, pb: 1.25, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {[0, 1, 2].map((i) => (
            <BookiePreviewCard key={i} bookie={bookies[i] || {}} index={i} />
          ))}
        </Box>
        {legal?.enabled && (
          <Box sx={{ pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography fontSize="0.56rem" color={legal.color || 'rgba(255,255,255,0.4)'} lineHeight={1.4} sx={{ flex: 1 }}>
              {legal.text || '18+ · Gamble responsibly'}
            </Typography>
            {geo === 'Italy' && (
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                {legal.regulatoryLogos?.map((logo, i) => (
                  <Box key={i} component="img" src={logo.src} alt="" sx={{ height: 10, width: 'auto', opacity: 0.8 }} />
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

function BookieSection({ index, bookie, onChange, bookmakerOptions }) {
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
        <Field label="Subtitle / description" help="Smaller text below the title">
          <TextField size="small" fullWidth multiline maxRows={3} value={bookie.subtitleText || ''}
            onChange={(e) => set('subtitleText', e.target.value)}
            placeholder="e.g. T&C apply · 18+ · BeGambleAware.org" />
        </Field>
        <ColField label="Subtitle text colour" value={bookie.subtitleTextColor || 'rgba(255,255,255,0.6)'}
          onChange={(v) => set('subtitleTextColor', v)} />
        <Field label="Description (terms) *" help="Mandatory — bonus terms text, may be long (Italian regulation)">
          <TextField
            size="small" fullWidth multiline minRows={2} maxRows={6}
            required
            value={bookie.termsText || ''}
            onChange={(e) => set('termsText', e.target.value)}
            placeholder="e.g. Fino a 50€ sul deposito + 25€ Scommesse + fino a 2.000€ Scommesse. T&C Lottomatica."
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }}
          />
        </Field>
        <Field label="CTA text">
          <TextField size="small" fullWidth value={bookie.ctaText || ''}
            onChange={(e) => set('ctaText', e.target.value)} />
        </Field>
        <ColField label="CTA text colour" value={bookie.ctaTextColor || '#ffffff'}
          onChange={(v) => set('ctaTextColor', v)} />
        <Stack direction="row" spacing={1}>
          <ColField label="Strip bg colour" value={(bookie.stripColors || [])[0] || '#000000'}
            onChange={(v) => setStrip(0, v)} />
          <ColField label="Strip colour 2" value={(bookie.stripColors || [])[1] || '#000000'}
            onChange={(v) => setStrip(1, v)} />
        </Stack>
        <Field label="Logo image URL">
          <TextField size="small" fullWidth placeholder="https://…"
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
  titleText: '', titleTextColor: '#ffffff',
  subtitleText: '', subtitleTextColor: 'rgba(255,255,255,0.6)', termsText: '', ctaText: '', ctaTextColor: '#ffffff',
  stripColors: ['#333333', '#000000'], logoImageUrl: '', clickUrl: '' };

const DEFAULT_FORM = {
  name: '',
  geo: 'All',
  platform: 'All',
  lid: null,
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
    return found ? { subtitleTextColor: 'rgba(255,255,255,0.6)', ...found } : { ...DEFAULT_BOOKIE, position: pos };
  });
  return {
    name: promo.name || '',
    geo: promo.geo || 'All',
    platform: promo.platform || 'All',
    lid: promo.lid ?? null,
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
    lid: form.lid !== '' ? Number(form.lid) : null,
    sov: Number(form.sov),
    bookies: form.bookies.map((b, i) => ({
      ...b,
      position: i + 1,
      bmid: b.bmid !== '' ? Number(b.bmid) : null,
    })),
  };
}

// ── Inner editor ──────────────────────────────────────────────────────────────

function BpEditorInner({ initial, isNew, bookmakerOptions, draftKey }) {
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
    if (!form.name.trim()) { setToast({ kind: 'error', msg: 'Name is required' }); return; }
    const missingTerms = form.bookies.map((b, i) => !b.termsText?.trim() ? i + 1 : null).filter(Boolean);
    if (missingTerms.length) {
      setToast({ kind: 'error', msg: `Description (terms) is required for bookmaker${missingTerms.length > 1 ? 's' : ''} ${missingTerms.join(', ')}` });
      return;
    }
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
                onChange={(e) => set('name', e.target.value)} placeholder="e.g. Brazil Android Q3" />
            </Field>
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => set('active', e.target.checked)} size="small" />}
              label={<Typography fontSize="0.85rem">Active</Typography>}
            />
          </Section>

          <Section title="Targeting">
            <Field label="Geo">
              <FormControl size="small" fullWidth>
                <Select value={form.geo} onChange={(e) => set('geo', e.target.value)}>
                  <MenuItem value="All">🌐 All countries</MenuItem>
                  {DBA_COUNTRIES.filter((c) => c.code !== 'GLOBAL').map((c) => (
                    <MenuItem key={c.code} value={c.name}>{c.flag} {c.name}</MenuItem>
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
            <Field label="Header image / badge URL" help="Optional — e.g. a 'Special Offer / Limited Time' badge graphic. Leave blank for a plain text header with no reserved space above it.">
              <TextField size="small" fullWidth placeholder="https://…"
                value={form.header.imageUrl}
                onChange={(e) => setHeader('imageUrl', e.target.value)} />
            </Field>
            {form.header.imageUrl && (
              <Field label={`Header image height — ${form.header.imageHeight ?? 110}px`}>
                <Slider min={40} max={300} step={5}
                  value={form.header.imageHeight ?? 110}
                  onChange={(_, v) => setHeader('imageHeight', v)} />
              </Field>
            )}
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
                onChange={(val) => setBookie(i, val)} bookmakerOptions={bookmakerOptions} />
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
                {form.geo === 'Italy' && (
                  <Field label="Regulatory logos" help="Both logos appear on the right of the footer — set each link">
                    <Stack spacing={1}>
                      {[
                        { idx: 0, src: '/legal-logos/italia-gambling-full.svg', placeholder: 'Italia Gioco Legale URL' },
                        { idx: 1, src: '/legal-logos/italia-gambling-gauge.svg', placeholder: 'ADM gauge URL' },
                      ].map(({ idx, src, placeholder }) => (
                        <Stack key={idx} direction="row" spacing={1} alignItems="center">
                          <Box component="img" src={src} alt="" sx={{ height: 16, width: 'auto', flexShrink: 0, opacity: 0.7 }} />
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
                <InterstitialPreview form={form} />
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
  const [loadError, setLoadError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const promoPromise = isNew ? Promise.resolve(null) : apiService.getBpPromotion(id);
    Promise.all([promoPromise, apiService.getDbaBookmakerPool()])
      .then(([promo, bms]) => {
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
        setReady(true);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [id, isNew]);

  if (loadError) return <Box sx={{ p: 4 }}><Typography color="error">{loadError}</Typography></Box>;
  if (!ready) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const draftKey = isNew ? 'bp_draft_new' : `bp_draft_${id}`;
  return <BpEditorInner key={id || 'new'} initial={initial} isNew={isNew} bookmakerOptions={bookmakerOptions} draftKey={draftKey} />;
}
