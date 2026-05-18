import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, Select, MenuItem, FormControl, Slider,
  Stack, Paper, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

import { DBA_TEMPLATES, DBA_BOOKMAKERS, DBA_SAMPLE_MATCHES } from '../../data/dbaData';
import AdPreview, { CarouselDots } from '../../components/dba/AdPreview';
import { StatusPill, LogoThumb, Toggle } from '../../components/dba/DbaPrimitives';
import { invertText, SIZE_DIMS, resolveLogoUrl, bookmakerLogoUrl, autoLogoReason } from '../../components/dba/dbaUtils';

const DEFAULT_CONFIG = {
  bg: '#151E22', text: '#FFFFFF', cta: '#1976D2', ctaText: 'Bet Now',
  font: '365 Sans', fontSize: 14, logoPos: 'top-left', radius: 8,
  oddsFormat: 'decimal', layout: 'horizontal',
};

// Map a bookmaker's brand colors (from T_BET_BOOKMAKERS.COLOR / SECONDARY_COLOR)
// to the template's *color* fields. Crucially does NOT touch `ctaText` — that's
// the button label string (e.g. "Bet Now") and should stay user-controlled.
//   bg           ← primary brand color
//   text         ← contrasting tone over bg
//   cta          ← secondary color when it's distinct & legible, else auto-contrast
//   ctaTextColor ← contrasting tone over cta
function colorsFromBookmaker(bm) {
  if (!bm) return null;
  const brand = bm.brandColor || bm.logoBg || '#151E22';
  const text = invertText(brand);
  // Use secondary only if it's actually different from the primary — otherwise
  // we'd end up with a CTA that disappears into the ad background.
  const secondary = bm.secondaryColor && bm.secondaryColor !== brand ? bm.secondaryColor : null;
  const cta = secondary || invertText(brand);
  const ctaTextColor = invertText(cta);
  return { bg: brand, text, cta, ctaTextColor };
}

export default function DbaTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const initial = isNew ? null : DBA_TEMPLATES.find((t) => t.id === id);

  const [name, setName] = useState(initial?.name || 'New Format');
  const [previewSize, setPreviewSize] = useState(initial?.sizeId || '300x250');
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Each format is associated with exactly one DBA-enabled bookmaker. This drives
  // the live preview and is persisted on save.
  const [bookmakerId, setBookmakerId] = useState(() => {
    if (initial?.bookmakerId) return initial.bookmakerId;
    // Back-compat: legacy templates used bookmakerIds (array or 'all'); pick first.
    if (Array.isArray(initial?.bookmakerIds) && initial.bookmakerIds[0]) return initial.bookmakerIds[0];
    const anyLive = (b) => Object.values(b.variants).some((v) => v.status === 'live');
    return (DBA_BOOKMAKERS.find(anyLive) || DBA_BOOKMAKERS[0]).id;
  });
  // For new templates seed the color palette from the initial bookmaker's brand
  // color (DB-sourced). Existing templates keep their saved config.
  const [config, setConfig] = useState(() => {
    if (initial?.config) return initial.config;
    const seedBm = DBA_BOOKMAKERS.find((b) => b.id === bookmakerId) || DBA_BOOKMAKERS[0];
    const seed = colorsFromBookmaker(seedBm);
    return seed ? { ...DEFAULT_CONFIG, ...seed } : DEFAULT_CONFIG;
  });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState(null);

  // When the user picks a different bookmaker, repaint the colour fields with
  // its brand colour. The user is free to override any colour after.
  const handleBookmakerChange = (newId) => {
    setBookmakerId(newId);
    const bm = DBA_BOOKMAKERS.find((b) => b.id === newId);
    const next = colorsFromBookmaker(bm);
    if (next) {
      setConfig((c) => ({ ...c, ...next }));
      setToast({ kind: 'success', msg: `Colors updated to ${bm.name}'s brand` });
    }
  };

  const matchesPerSlide = previewSize === '640x1280' ? 3 : previewSize === '320x50' ? 1 : 2;
  const matchSlideCount = Math.max(1, Math.ceil(DBA_SAMPLE_MATCHES.length / matchesPerSlide));
  const hasWelcome = !!config?.welcomeOffer?.enabled;
  const totalSlides = (hasWelcome ? 1 : 0) + matchSlideCount;
  const safeSlideIdx = totalSlides ? ((slideIdx % totalSlides) + totalSlides) % totalSlides : 0;

  useEffect(() => { setSlideIdx((i) => totalSlides ? ((i % totalSlides) + totalSlides) % totalSlides : 0); }, [totalSlides]);
  useEffect(() => { if (hasWelcome) setSlideIdx(0); }, [hasWelcome]);
  useEffect(() => {
    if (!playing) return;
    const interval = previewSize === '640x1280' ? 3500 : 3000;
    const tid = setInterval(() => setSlideIdx((i) => (i + 1) % totalSlides), interval);
    return () => clearInterval(tid);
  }, [playing, totalSlides, previewSize]);

  // Auto-scale the preview to fit available space
  const previewBoxRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const [w, h] = SIZE_DIMS[previewSize] || [300, 250];
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(40, rect.width - 64);
      const availH = Math.max(40, rect.height - 96);
      const sx = availW / w;
      const sy = availH / h;
      setFitScale(Math.max(0.1, Math.min(sx, sy, 1.8)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewSize]);

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }));
  const previewBm = DBA_BOOKMAKERS.find((b) => b.id === bookmakerId) || DBA_BOOKMAKERS[0];
  // "DBA-enabled" = a bookmaker that's been configured in the Bookmaker Management
  // screen with at least one live country variant.
  const dbaEnabledBookmakers = useMemo(
    () => DBA_BOOKMAKERS.filter((b) => Object.values(b.variants).some((v) => v.status === 'live')),
    []
  );

  const buildSavedTemplate = (status) => ({
    ...(initial || {}),
    name, config, sizeId: previewSize, status, bookmakerId,
    modified: new Date().toISOString(), modifiedBy: 'D. Benvelgy',
  });
  const handleSaveDraft = () => {
    // (In a wired-up backend: POST/PUT buildSavedTemplate('draft'))
    setToast({ kind: 'success', msg: 'Saved as Draft' });
  };
  const handlePublish = () => {
    setConfirmPublish(false);
    // (In a wired-up backend: POST/PUT buildSavedTemplate('live'))
    setToast({ kind: 'success', msg: `${name} published as Live` });
    setTimeout(() => navigate('/dba/templates'), 800);
  };
  const handleReset = () => { setConfig(DEFAULT_CONFIG); setConfirmReset(false); setToast({ kind: 'success', msg: 'Reset to defaults' }); };

  const [w, h] = SIZE_DIMS[previewSize] || [300, 250];
  const displayScale = fitScale;
  const slideLabel = hasWelcome && slideIdx === 0
    ? 'Welcome'
    : `Match set ${(hasWelcome ? slideIdx : slideIdx + 1)} / ${matchSlideCount}`;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Editor header */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #E5E5E5', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button size="small" startIcon={<ChevronLeftIcon fontSize="small" />} onClick={() => navigate('/dba/templates')}>
          Back to Templates
        </Button>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TextField
            variant="standard" value={name} onChange={(e) => setName(e.target.value)}
            InputProps={{ disableUnderline: true, sx: { fontSize: 18, fontWeight: 600 } }}
            sx={{ '& input': { px: 1, py: 0.5, borderRadius: 0.5, '&:focus': { bgcolor: '#F5F5F5' } } }}
          />
          <Box sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, px: 1, py: 0.5, bgcolor: '#F5F5F5', borderRadius: 0.5 }}>
            {previewSize}
          </Box>
          <StatusPill kind={initial?.status === 'live' ? 'live' : 'draft'} label={initial?.status === 'live' ? 'Live' : 'Draft'} />
        </Box>
        <Button startIcon={<RestartAltIcon />} onClick={() => setConfirmReset(true)}>Reset</Button>
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveDraft}>Save as Draft</Button>
        <Button variant="contained" startIcon={<CheckIcon />} onClick={() => setConfirmPublish(true)}>Save & Publish</Button>
      </Box>

      {/* Body: split pane */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Form sidebar */}
        <Box sx={{ width: 380, borderRight: '1px solid #E5E5E5', overflow: 'auto', flexShrink: 0, bgcolor: '#fff' }}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Section title="Identity">
              <Field label="Template name">
                <TextField size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field
                label="Bookmaker"
                help={dbaEnabledBookmakers.length === 0
                  ? 'No DBA-enabled bookmakers — add one in Bookmaker Management first.'
                  : `Only DBA-enabled bookmakers (${dbaEnabledBookmakers.length}) are listed. Drives the live preview and ad serving.`}
              >
                <FormControl size="small" fullWidth>
                  <Select value={bookmakerId} onChange={(e) => handleBookmakerChange(e.target.value)}
                    renderValue={(val) => {
                      const b = DBA_BOOKMAKERS.find((x) => x.id === val);
                      if (!b) return val;
                      return (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LogoThumb
                            bg={b.logoBg} fg={b.logoFg} initials={b.initials}
                            imageUrl={bookmakerLogoUrl(b.id, { noBg: !!b.useNoBgLogo })}
                            size={20} radius={4}
                          />
                          <Box component="span">{b.name}</Box>
                        </Stack>
                      );
                    }}
                  >
                    {dbaEnabledBookmakers.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <LogoThumb
                            bg={b.logoBg} fg={b.logoFg} initials={b.initials}
                            imageUrl={bookmakerLogoUrl(b.id, { noBg: !!b.useNoBgLogo })}
                            size={22} radius={4}
                          />
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{b.name}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {Object.values(b.variants).filter((v) => v.status === 'live').length} live · {Object.keys(b.variants).length} countries
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Field>
              <Field label="Ad size">
                <FormControl size="small" fullWidth>
                  <Select value={previewSize} onChange={(e) => setPreviewSize(e.target.value)}>
                    <MenuItem value="300x250">MPU · 300×250</MenuItem>
                    <MenuItem value="640x1280">Interstitial · 640×1280</MenuItem>
                    <MenuItem value="320x50">Banner · 320×50</MenuItem>
                  </Select>
                </FormControl>
              </Field>
            </Section>

            <Section title="Background">
              <Field label="Background type">
                <ToggleButtonGroup
                  value={config.bgType || 'solid'} exclusive size="small"
                  onChange={(_, v) => v && set('bgType', v)} fullWidth
                >
                  <ToggleButton value="solid">Solid</ToggleButton>
                  <ToggleButton value="gradient">Gradient</ToggleButton>
                  <ToggleButton value="image">Image</ToggleButton>
                </ToggleButtonGroup>
              </Field>

              {(config.bgType || 'solid') === 'solid' && (
                <Field label="Background color">
                  <ColorField value={config.bg} onChange={(v) => set('bg', v)} />
                </Field>
              )}

              {config.bgType === 'gradient' && (
                <>
                  <Field label="From color"><ColorField value={config.bg}              onChange={(v) => set('bg', v)} /></Field>
                  <Field label="To color">  <ColorField value={config.bg2 || config.bg} onChange={(v) => set('bg2', v)} /></Field>
                  <Field label={`Angle · ${config.bgAngle ?? 135}°`}>
                    <Slider min={0} max={360} value={config.bgAngle ?? 135} onChange={(_, v) => set('bgAngle', v)} />
                  </Field>
                </>
              )}

              {config.bgType === 'image' && (
                <>
                  <Field label="Image"><ImageUploadField value={config.bgImage} onChange={(v) => set('bgImage', v)} /></Field>
                  <Field label="Overlay tint"><ColorField value={config.bg} onChange={(v) => set('bg', v)} /></Field>
                  <Field label={`Overlay opacity · ${Math.round((config.bgOverlay ?? 0.35) * 100)}%`}>
                    <Slider min={0} max={100} value={Math.round((config.bgOverlay ?? 0.35) * 100)} onChange={(_, v) => set('bgOverlay', v / 100)} />
                  </Field>
                </>
              )}
            </Section>

            <Section title="Foreground">
              <Field label="Text"><ColorField value={config.text} onChange={(v) => set('text', v)} /></Field>
              <Field label="CTA button"><ColorField value={config.cta} onChange={(v) => set('cta', v)} /></Field>
              <Field label="CTA text" help="Defaults to auto-contrast against the CTA button color">
                <ColorField value={config.ctaTextColor || invertText(config.cta)} onChange={(v) => set('ctaTextColor', v)} />
              </Field>
            </Section>

            <Section title="Bookmaker logo">
              <Field
                label="Logo variant"
                help={
                  (() => {
                    const v = config.logoVariant || 'auto';
                    if (v === 'auto') {
                      const a = autoLogoReason(previewBm, config);
                      return `Auto · ${a.noBg ? 'Transparent' : 'With background'} (${a.reason})`;
                    }
                    return v === 'nobg'
                      ? 'Force transparent — overrides the auto choice for this format'
                      : 'Force with-background — overrides the auto choice for this format';
                  })()
                }
              >
                <Stack direction="row" spacing={1}>
                  {(() => {
                    const autoNoBg = autoLogoReason(previewBm, config).noBg;
                    return [
                      { v: 'auto', label: 'Auto',         hint: autoNoBg ? '→ Transparent' : '→ With bg' },
                      { v: 'bg',   label: 'With bg',      hint: 'Force background variant' },
                      { v: 'nobg', label: 'Transparent',  hint: 'Force NoBG variant' },
                    ];
                  })().map((opt) => {
                    const active = (config.logoVariant || 'auto') === opt.v;
                    // Show a tiny live preview using the current preview bookmaker.
                    const previewUrl = opt.v === 'auto'
                      ? resolveLogoUrl(previewBm, config)          // honours dark-bg rule + bookmaker
                      : bookmakerLogoUrl(previewBm.id, { noBg: opt.v === 'nobg' });
                    return (
                      <Box
                        key={opt.v}
                        onClick={() => set('logoVariant', opt.v)}
                        sx={{
                          flex: 1, p: 1, cursor: 'pointer',
                          borderRadius: 1.25, border: '2px solid',
                          borderColor: active ? 'primary.main' : '#E5E5E5',
                          bgcolor: active ? '#EFF6FF' : '#fff',
                          display: 'flex', alignItems: 'center', gap: 1,
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                      >
                        <Box sx={{
                          width: 30, height: 30, borderRadius: 0.75, flexShrink: 0,
                          backgroundImage: opt.v === 'nobg' ? 'repeating-conic-gradient(#EEE 0 25%, #FFF 0 50%)' : 'none',
                          backgroundSize: opt.v === 'nobg' ? '8px 8px' : 'auto',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <LogoThumb
                            bg={previewBm.logoBg} fg={previewBm.logoFg} initials={previewBm.initials}
                            imageUrl={previewUrl} size={28} radius={5}
                          />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                            color: active ? 'primary.main' : 'text.primary' }}>
                            {opt.label}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.2 }}>
                            {opt.hint}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Field>
            </Section>

            <Section title="Call to Action">
              <Field label="Button text" help={`${(config.ctaText || '').length}/24 characters`}>
                <TextField size="small" fullWidth value={config.ctaText} inputProps={{ maxLength: 24 }} onChange={(e) => set('ctaText', e.target.value)} />
              </Field>
            </Section>

            <Section title="Typography">
              <Field label="Font family">
                <FormControl size="small" fullWidth>
                  <Select value={config.font || '365 Sans'} onChange={(e) => set('font', e.target.value)}>
                    <MenuItem value="365 Sans">365 Sans</MenuItem>
                    <MenuItem value="Roboto">Roboto</MenuItem>
                    <MenuItem value="Inter">Inter</MenuItem>
                    <MenuItem value="System">System</MenuItem>
                  </Select>
                </FormControl>
              </Field>
              <Field label={`Font size · ${config.fontSize ?? 14}px`}>
                <Slider min={10} max={20} value={config.fontSize ?? 14} onChange={(_, v) => set('fontSize', v)} />
              </Field>
            </Section>

            <Section title="Layout">
              <Field label={`Border radius · ${config.radius}px`}>
                <Slider min={0} max={24} value={config.radius} onChange={(_, v) => set('radius', v)} />
              </Field>
              <Field label="Odds display">
                <ToggleButtonGroup value={config.oddsFormat} exclusive size="small" onChange={(_, v) => v && set('oddsFormat', v)} fullWidth>
                  <ToggleButton value="decimal">Decimal</ToggleButton>
                  <ToggleButton value="fractional">Fractional</ToggleButton>
                  <ToggleButton value="american">American</ToggleButton>
                </ToggleButtonGroup>
              </Field>
            </Section>

            <Section title="Affiliate link (optional)">
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Toggle on={!!config.affiliate?.enabled} onChange={(on) => set('affiliate', { ...(config.affiliate || {}), enabled: on })} ariaLabel="Toggle affiliate" />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {config.affiliate?.enabled ? 'Using a custom link for this format' : 'Using the bookmaker default'}
                </Typography>
              </Stack>
              {config.affiliate?.enabled && (
                <>
                  <Field label="Affiliate URL">
                    <TextField size="small" fullWidth type="url"
                      value={config.affiliate?.url || ''}
                      onChange={(e) => set('affiliate', { ...(config.affiliate || {}), url: e.target.value })}
                      placeholder="https://bookmaker.com/promo?aff=365_format_x"
                      InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: 12 } }}
                    />
                  </Field>
                  <Field label="Welcome-slide link" help="Optional separate URL for the welcome slide.">
                    <TextField size="small" fullWidth type="url"
                      value={config.affiliate?.welcomeUrl || ''}
                      onChange={(e) => set('affiliate', { ...(config.affiliate || {}), welcomeUrl: e.target.value })}
                      placeholder="https://bookmaker.com/welcome?aff=365_format_x"
                      InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: 12 } }}
                    />
                  </Field>
                </>
              )}
            </Section>

            <Section title="Welcome offer (optional)">
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Toggle on={!!config.welcomeOffer?.enabled} onChange={(on) => set('welcomeOffer', { ...(config.welcomeOffer || {}), enabled: on })} ariaLabel="Toggle welcome offer" />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {config.welcomeOffer?.enabled ? 'Shown as the first slide' : 'Hidden'}
                </Typography>
              </Stack>
              {config.welcomeOffer?.enabled && (
                <>
                  <Field label="Headline">
                    <TextField size="small" fullWidth value={config.welcomeOffer?.headline || ''} inputProps={{ maxLength: 60 }} placeholder="Get £30 in Free Bets"
                      onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), headline: e.target.value })} />
                  </Field>
                  <Field label="Subtext">
                    <TextField size="small" fullWidth value={config.welcomeOffer?.subtext || ''} inputProps={{ maxLength: 120 }} placeholder="Bet £10, get £30 when you sign up"
                      onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), subtext: e.target.value })} />
                  </Field>
                  <Field label="Terms / small print">
                    <TextField size="small" fullWidth value={config.welcomeOffer?.terms || ''} inputProps={{ maxLength: 180 }} placeholder="New customers only · 18+ · T&Cs apply"
                      onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), terms: e.target.value })} />
                  </Field>
                  <Field label="CTA text override" help="Leave blank to use the main CTA text">
                    <TextField size="small" fullWidth value={config.welcomeOffer?.ctaText || ''} inputProps={{ maxLength: 24 }} placeholder={config.ctaText}
                      onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaText: e.target.value })} />
                  </Field>
                  <Field label="CTA button color"><ColorField value={config.welcomeOffer?.ctaColor || config.cta} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaColor: v })} /></Field>
                  <Field label="CTA text color"><ColorField value={config.welcomeOffer?.ctaTextColor || invertText(config.welcomeOffer?.ctaColor || config.cta)} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaTextColor: v })} /></Field>
                  <Field label="Hero image (optional)"><ImageUploadField value={config.welcomeOffer?.image || null} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), image: v })} /></Field>
                </>
              )}
            </Section>

            <Section title="Legal (optional)">
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Toggle on={!!config.legal?.enabled} onChange={(on) => set('legal', { ...(config.legal || {}), enabled: on })} ariaLabel="Toggle legal disclaimer" />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {config.legal?.enabled ? 'Shown in the ad' : 'Hidden'}
                </Typography>
              </Stack>
              {config.legal?.enabled && (
                <>
                  <Field label="Legal text" help="e.g. 18+ · Gamble responsibly · BeGambleAware.org">
                    <TextField size="small" fullWidth value={config.legal?.text || ''} inputProps={{ maxLength: 120 }} placeholder="18+ · Gamble responsibly"
                      onChange={(e) => set('legal', { ...(config.legal || {}), text: e.target.value })} />
                  </Field>
                  <Field label="Legal text color">
                    <ColorField value={config.legal?.color || config.text} onChange={(v) => set('legal', { ...(config.legal || {}), color: v })} />
                  </Field>
                  <Field label="Legal logo / image">
                    <ImageUploadField value={config.legal?.logo || null} onChange={(v) => set('legal', { ...(config.legal || {}), logo: v })} />
                  </Field>
                </>
              )}
            </Section>
          </Box>
        </Box>

        {/* Preview pane (sticky, doesn't scroll with form) */}
        <Box sx={{ flex: 1, p: 3, overflow: 'hidden', bgcolor: '#FAFAFA', minWidth: 0, display: 'flex' }}>
          <Box
            ref={previewBoxRef}
            sx={{
              flex: 1, minWidth: 0, minHeight: 0,
              borderRadius: 1.5,
              p: '64px 32px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
              bgcolor: '#F5F5F5',
              backgroundImage: 'linear-gradient(45deg, #EEEEEE 25%, transparent 25%), linear-gradient(-45deg, #EEEEEE 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #EEEEEE 75%), linear-gradient(-45deg, transparent 75%, #EEEEEE 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
            }}
          >
            {/* Toolbar: size + carousel controls + bookmaker */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                {[{ v: '300x250', l: 'MPU' }, { v: '640x1280', l: 'Interstitial' }, { v: '320x50', l: 'Banner' }].map((opt) => {
                  const active = previewSize === opt.v;
                  return (
                    <Box key={opt.v} onClick={() => setPreviewSize(opt.v)}
                      sx={{
                        height: 28, px: 1.5, borderRadius: 0.75, cursor: 'pointer',
                        bgcolor: active ? 'primary.main' : 'transparent',
                        color: active ? '#fff' : 'text.secondary',
                        fontSize: 12, fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center',
                      }}
                    >{opt.l}</Box>
                  );
                })}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, p: 0.5, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <IconButton size="small" onClick={() => { setPlaying(false); setSlideIdx((i) => (i - 1 + totalSlides) % totalSlides); }}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Box sx={{ minWidth: 96, px: 0.75, fontSize: 11, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{slideLabel}</Box>
                  <IconButton size="small" onClick={() => { setPlaying(false); setSlideIdx((i) => (i + 1) % totalSlides); }}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                  <Box onClick={() => setPlaying((p) => !p)}
                    sx={{
                      height: 28, px: 1.25, borderRadius: 0.75, cursor: 'pointer',
                      bgcolor: playing ? 'primary.main' : 'transparent',
                      color: playing ? '#fff' : 'text.primary',
                      fontSize: 12, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    }}>
                    {playing ? <PauseIcon fontSize="inherit" /> : <PlayArrowIcon fontSize="inherit" />}
                    {playing ? 'Pause' : 'Animate'}
                  </Box>
                </Box>
                {/* Bookmaker selection lives in the form's Identity section now */}
              </Stack>
            </Box>

            <Box sx={{ position: 'relative' }}>
              <Box sx={{
                width: w * displayScale, height: h * displayScale,
                position: 'relative', overflow: 'hidden',
                borderRadius: `${(config.radius || 8) * displayScale}px`,
              }}>
                <Box sx={{
                  display: 'flex',
                  width: w * displayScale * totalSlides,
                  height: h * displayScale,
                  transform: `translateX(-${safeSlideIdx * w * displayScale}px)`,
                  transition: 'transform 720ms cubic-bezier(0.32, 0.72, 0.24, 1)',
                }}>
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <Box key={i} sx={{ width: w * displayScale, height: h * displayScale, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                      <AdPreview config={config} sizeId={previewSize} bookmaker={previewBm} scale={displayScale} slideIdx={i} />
                    </Box>
                  ))}
                </Box>

                {previewSize !== '320x50' && (
                  <Box sx={{
                    position: 'absolute', left: 0, right: 0,
                    bottom: (previewSize === '640x1280' ? 50 : 12) * displayScale,
                    display: 'flex', justifyContent: 'center', pointerEvents: 'none',
                  }}>
                    <CarouselDots count={totalSlides} active={safeSlideIdx} color={config.text} dotSize={previewSize === '640x1280' ? Math.max(5, 10 * displayScale) : 4} />
                  </Box>
                )}
              </Box>
              <Box sx={{ position: 'absolute', top: -22, left: 0, fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'text.secondary' }}>
                {w} × {h}{displayScale !== 1 ? ` · ${Math.round(displayScale * 100)}%` : ''}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={confirmPublish} onClose={() => setConfirmPublish(false)}>
        <DialogTitle>Publish template?</DialogTitle>
        <DialogContent><DialogContentText>Publishing will update all live DBA ads using this format. Continue?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPublish(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePublish}>Publish & go Live</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Reset to defaults?</DialogTitle>
        <DialogContent><DialogContentText>All form fields will be reverted to default values. Unsaved changes will be lost.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReset}>Reset all fields</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.kind === 'error' ? 'error' : 'success'} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

function Field({ label, help, children }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.75 }}>{label}</Typography>
      {children}
      {help && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{help}</Typography>}
    </Box>
  );
}

function ColorField({ value, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: 36, px: 0.75, pl: 0.5, border: '1px solid #E5E5E5', borderRadius: 1, bgcolor: '#fff' }}>
      <Box component="input" type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())}
        sx={{ width: 26, height: 26, border: 'none', p: 0, background: 'transparent', cursor: 'pointer', appearance: 'none' }} />
      <Box component="input" type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} spellCheck={false}
        sx={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'ui-monospace, monospace', background: 'transparent' }} />
    </Box>
  );
}

function ImageUploadField({ value, onChange }) {
  const inputRef = useRef(null);
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };
  return (
    <Stack spacing={1}>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, border: '1px solid #E5E5E5', borderRadius: 1, bgcolor: '#fff' }}>
        <Box sx={{
          width: 56, height: 40, borderRadius: 0.75, flexShrink: 0, border: '1px solid #E5E5E5',
          background: value
            ? `url("${value}") center/cover no-repeat`
            : 'repeating-conic-gradient(#EEE 0 25%, #FFF 0 50%) 50% / 12px 12px',
        }} />
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 12, color: 'text.secondary' }}>
          {value ? 'Image selected' : 'No image chosen'}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<UploadIcon />} onClick={() => inputRef.current?.click()}>
          {value ? 'Replace' : 'Browse'}
        </Button>
        {value && <IconButton size="small" onClick={() => onChange(null)}><CloseIcon fontSize="small" /></IconButton>}
      </Box>
      <TextField size="small" placeholder="or paste an image URL…"
        value={value && !value.startsWith?.('data:') ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        InputProps={{ sx: { fontSize: 12 } }}
      />
    </Stack>
  );
}
