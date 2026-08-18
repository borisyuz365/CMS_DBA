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
import CodeIcon from '@mui/icons-material/Code';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

import { DBA_SAMPLE_MATCHES, DBA_COUNTRIES } from '../../data/dbaData';
import OutlinedInput from '@mui/material/OutlinedInput';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import TranslationPopover from '../../components/dba/TranslationPopover';
import CreativeTemplateCodeDialog from '../../components/dba/CreativeTemplateCodeDialog';
import apiService from '../../services/api';
import AdPreview from '../../components/dba/AdPreview';
import { StatusPill, LogoThumb, Toggle } from '../../components/dba/DbaPrimitives';
import { invertText, SIZE_DIMS, resolveLogoUrl, bookmakerLogoUrl, autoLogoReason, brazilDefaultLegalText } from '../../components/dba/dbaUtils';

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

// Wrapper: fetches the template (if editing) and the bookmaker list, then mounts
// the inner editor with resolved props. Avoids reading from static seed data.
export default function DbaTemplateEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const [initial, setInitial] = useState(null);
  const [allBookmakers, setAllBookmakers] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const tplPromise = isNew ? Promise.resolve(null) : apiService.getDbaTemplate(id);
    Promise.all([tplPromise, apiService.getDbaBookmakers()])
      .then(([tpl, bms]) => {
        if (cancelled) return;
        setInitial(tpl);
        setAllBookmakers(Array.isArray(bms) ? bms : []);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [id, isNew]);

  if (loadError) {
    return <Box sx={{ p: 4 }}><Alert severity="error">Failed to load editor: {loadError}</Alert></Box>;
  }
  if (allBookmakers === null) {
    return <Box sx={{ p: 4 }}><Typography color="text.secondary">Loading editor…</Typography></Box>;
  }
  return <DbaTemplateEditorInner key={id || 'new'} initial={initial} allBookmakers={allBookmakers} isNew={isNew} />;
}

function DbaTemplateEditorInner({ initial, allBookmakers, isNew }) {
  const navigate = useNavigate();

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
    const anyLive = (b) => Object.values(b.variants || {}).some((v) => v.status === 'live');
    return (allBookmakers.find(anyLive) || allBookmakers[0])?.id || null;
  });
  // For new templates seed the color palette from the initial bookmaker's brand
  // color (DB-sourced). Existing templates keep their saved config.
  const [config, setConfig] = useState(() => {
    if (initial?.config) return initial.config;
    const seedBm = allBookmakers.find((b) => b.id === bookmakerId) || allBookmakers[0];
    const seed = colorsFromBookmaker(seedBm);
    return seed ? { ...DEFAULT_CONFIG, ...seed } : DEFAULT_CONFIG;
  });
  const [countries, setCountries] = useState(() => Array.isArray(initial?.countries) ? initial.countries : []);
  // Pending translations to ship with the next save. Backend pre-fills these on
  // GET via the `translations` decoration. Shape: { <fieldPath>: { <langId>: value } }.
  const [translations, setTranslations] = useState(() => initial?.translations || {});
  const setFieldTranslations = (path, value) =>
    setTranslations((prev) => ({ ...prev, [path]: value }));
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState(null);
  const [showGamCode, setShowGamCode] = useState(false);

  // When the user picks a different bookmaker, repaint the colour fields with
  // its brand colour. The user is free to override any colour after.
  const handleBookmakerChange = (newId) => {
    setBookmakerId(newId);
    const bm = allBookmakers.find((b) => b.id === newId);
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

  // Infinite forward carousel: render `totalSlides + 1` slides where the last
  // is a clone of slide 0. `displayPos` is the *visual* position [0..totalSlides];
  // it can briefly equal totalSlides (sitting on the clone) before snapping
  // back to 0 without a transition. The dot indicator uses safeSlideIdx (the
  // logical slide), which advances independently.
  //
  // NB: we deliberately do NOT auto-sync displayPos with safeSlideIdx — when
  // the tick wraps slideIdx from N-1 → 0, such an effect would override the
  // displayPos increment and animate backward to slide 0 instead of forward
  // onto the clone.
  const SLIDE_DURATION_MS = 720;
  const [displayPos, setDisplayPos] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);

  useEffect(() => { setDisplayPos(0); setSlideIdx(0); }, [totalSlides]);
  useEffect(() => { if (hasWelcome) { setDisplayPos(0); setSlideIdx(0); } }, [hasWelcome]);

  useEffect(() => {
    if (!playing) return;
    const interval = previewSize === '640x1280' ? 3500 : 3000;
    const tid = setInterval(() => {
      // Advance the visual position past the last real slide onto the clone,
      // and bump the logical slideIdx straight to its wrapped successor so
      // the dot indicator updates immediately.
      setDisplayPos((p) => p + 1);
      setSlideIdx((i) => (i + 1) % totalSlides);
    }, interval);
    return () => clearInterval(tid);
  }, [playing, totalSlides, previewSize]);

  // When displayPos lands on the clone (== totalSlides), wait for the
  // animation to finish, then snap back to 0 with no transition. Two RAFs
  // are needed so the browser commits the transition: none + transform: 0
  // before transitions get turned back on for the next user advance.
  useEffect(() => {
    if (displayPos !== totalSlides) return undefined;
    const tid = setTimeout(() => {
      setTransitionOn(false);
      setDisplayPos(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransitionOn(true));
      });
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(tid);
  }, [displayPos, totalSlides]);

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
  const previewBm = allBookmakers.find((b) => b.id === bookmakerId) || allBookmakers[0];

  // Brazil requires a legal disclaimer with the bookmaker's own SPA/MF
  // authorization number. As soon as a format targets Brazil, turn the
  // disclaimer on and seed it with the compliant default. Also strip the
  // legacy "18+ JOGUE COM RESPONSABILIDADE" prefix — 18+ is now a badge.
  useEffect(() => {
    if (!countries.includes('BR')) return;
    const licenseNumber = previewBm?.variants?.BR?.licenseNumber;
    const stripLegacy = (text) => (text || '')
      .replace(/^\s*18\+?\s*JOGUE COM RESPONSABILIDADE\.?\s*/i, '')
      .trim();
    setConfig((c) => {
      const cleaned = stripLegacy(c.legal?.text);
      const nextText = cleaned || brazilDefaultLegalText(licenseNumber);
      if (c.legal?.enabled && c.legal?.text === nextText) return c;
      return {
        ...c,
        legal: {
          ...(c.legal || {}),
          enabled: true,
          text: nextText,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, previewBm?.variants?.BR?.licenseNumber]);

  // "DBA-enabled" = a bookmaker that's been configured in the Bookmaker Management
  // screen with at least one live country variant.
  const dbaEnabledBookmakers = useMemo(
    () => allBookmakers.filter((b) => Object.values(b.variants || {}).some((v) => v.status === 'live')),
    [allBookmakers]
  );

  const buildSavedTemplate = (status) => ({
    ...(initial || {}),
    name, config, sizeId: previewSize, status, bookmakerId,
    countries,
    translations,
    // size label kept for display compatibility on the list screen
    size: previewSize === '300x250' ? 'MPU · 300×250'
        : previewSize === '640x1280' ? 'Interstitial · 640×1280'
        : 'Banner · 320×50',
    modifiedBy: 'D. Benvelgy',
  });

  const saveTemplate = async (status) => {
    const tpl = buildSavedTemplate(status);
    if (isNew) return apiService.createDbaTemplate(tpl);
    return apiService.updateDbaTemplate(initial.id, tpl);
  };

  const handleSaveDraft = async () => {
    try {
      await saveTemplate('draft');
      setToast({ kind: 'success', msg: 'Saved as Draft' });
    } catch (err) {
      setToast({ kind: 'error', msg: `Save failed: ${err.message}` });
    }
  };
  const handlePublish = async () => {
    setConfirmPublish(false);
    try {
      await saveTemplate('live');
      setToast({ kind: 'success', msg: `${name} published as Live` });
      setTimeout(() => navigate('/dba/templates'), 800);
    } catch (err) {
      setToast({ kind: 'error', msg: `Publish failed: ${err.message}` });
    }
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
        <Button
          startIcon={<CodeIcon />}
          onClick={() => setShowGamCode(true)}
          disabled={isNew}
          title={isNew ? 'Save the template first to view its GAM code' : 'View the CreativeTemplate that would be uploaded to Google Ad Manager'}
        >
          View GAM code
        </Button>
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveDraft}>Save as Draft</Button>
        <Button variant="contained" startIcon={<CheckIcon />} onClick={() => setConfirmPublish(true)}>Save & Publish</Button>
      </Box>

      {/* Body: split pane */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Form sidebar */}
        <Box sx={{ width: 380, borderRight: '1px solid #E5E5E5', overflow: 'auto', flexShrink: 0, bgcolor: '#fff' }}>
          {/* Section-level separators come from a top border on each Section
              after the first — see the Section component below. The gap is the
              spacing between the divider line and the section content above/below. */}
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Section title="Identity">
              <Field label="Template name">
                <Stack direction="row" spacing={0} alignItems="center">
                  <TextField size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
                  <TranslationPopover
                    fieldLabel="Template name"
                    canonical={name}
                    translations={translations['name']}
                    onChange={(v) => setFieldTranslations('name', v)}
                  />
                </Stack>
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
                      const b = allBookmakers.find((x) => x.id === val);
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
              <Field
                label="Countries"
                help="The countries this format is targeted at. Multiple allowed; leave empty for none. Drives which markets serve the ad and which language the text is resolved in."
              >
                <FormControl size="small" fullWidth>
                  <Select
                    multiple
                    value={countries}
                    onChange={(e) => setCountries(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((cc) => {
                          const c = DBA_COUNTRIES.find((x) => x.code === cc);
                          return <Chip key={cc} size="small" label={`${c?.flag || ''} ${c?.name || cc}`} />;
                        })}
                      </Box>
                    )}
                  >
                    {DBA_COUNTRIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        <Checkbox size="small" checked={countries.indexOf(c.code) > -1} />
                        <ListItemText primary={`${c.flag} ${c.name}`} />
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
              <Field label="Date pill fill" help="Off = transparent (default). On = solid colour behind the date/time.">
                <Toggle
                  on={!!config.datePillFill}
                  onChange={(on) => set('datePillFill', on)}
                  ariaLabel="Toggle date pill fill"
                />
              </Field>
              {!!config.datePillFill && (
                <Field label="Date pill colour">
                  <ColorField value={config.datePillColor || '#000000'} onChange={(v) => set('datePillColor', v)} />
                </Field>
              )}
              <Field label="Date pill text" help="Defaults to the main text color">
                <ColorField value={config.datePillTextColor || config.text} onChange={(v) => set('datePillTextColor', v)} />
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
                <Stack direction="row" alignItems="center">
                  <TextField size="small" fullWidth value={config.ctaText} inputProps={{ maxLength: 24 }} onChange={(e) => set('ctaText', e.target.value)} />
                  <TranslationPopover
                    fieldLabel="CTA button text"
                    canonical={config.ctaText}
                    translations={translations['config.ctaText']}
                    onChange={(v) => setFieldTranslations('config.ctaText', v)}
                  />
                </Stack>
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
                  <Field label="Pill text" help="The badge at the top of the welcome slide">
                    <Stack direction="row" alignItems="center">
                      <TextField size="small" fullWidth value={config.welcomeOffer?.pillText || ''} inputProps={{ maxLength: 40 }} placeholder="Welcome offer"
                        onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), pillText: e.target.value })} />
                      <TranslationPopover
                        fieldLabel="Welcome offer · Pill text"
                        canonical={config.welcomeOffer?.pillText || ''}
                        translations={translations['config.welcomeOffer.pillText']}
                        onChange={(v) => setFieldTranslations('config.welcomeOffer.pillText', v)}
                      />
                    </Stack>
                  </Field>
                  <Field label="Pill color"><ColorField value={config.welcomeOffer?.pillColor || '#FFC107'} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), pillColor: v })} /></Field>
                  <Field label="Pill text color"><ColorField value={config.welcomeOffer?.pillTextColor || invertText(config.welcomeOffer?.pillColor || '#FFC107')} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), pillTextColor: v })} /></Field>
                  <Field label="Headline">
                    <Stack direction="row" alignItems="center">
                      <TextField size="small" fullWidth value={config.welcomeOffer?.headline || ''} inputProps={{ maxLength: 60 }} placeholder="Get £30 in Free Bets"
                        onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), headline: e.target.value })} />
                      <TranslationPopover
                        fieldLabel="Welcome offer · Headline"
                        canonical={config.welcomeOffer?.headline || ''}
                        translations={translations['config.welcomeOffer.headline']}
                        onChange={(v) => setFieldTranslations('config.welcomeOffer.headline', v)}
                      />
                    </Stack>
                  </Field>
                  <Field label="Subtext">
                    <Stack direction="row" alignItems="center">
                      <TextField size="small" fullWidth value={config.welcomeOffer?.subtext || ''} inputProps={{ maxLength: 120 }} placeholder="Bet £10, get £30 when you sign up"
                        onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), subtext: e.target.value })} />
                      <TranslationPopover
                        fieldLabel="Welcome offer · Subtext"
                        canonical={config.welcomeOffer?.subtext || ''}
                        translations={translations['config.welcomeOffer.subtext']}
                        onChange={(v) => setFieldTranslations('config.welcomeOffer.subtext', v)}
                      />
                    </Stack>
                  </Field>
                  <Field label="Terms / small print">
                    <Stack direction="row" alignItems="flex-start">
                      <TextField size="small" fullWidth multiline minRows={2}
                        value={config.welcomeOffer?.terms || ''} inputProps={{ maxLength: 180 }}
                        placeholder="New customers only · 18+ · T&Cs apply"
                        onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), terms: e.target.value })} />
                      <TranslationPopover
                        fieldLabel="Welcome offer · Terms"
                        canonical={config.welcomeOffer?.terms || ''}
                        translations={translations['config.welcomeOffer.terms']}
                        onChange={(v) => setFieldTranslations('config.welcomeOffer.terms', v)}
                        multiline
                      />
                    </Stack>
                  </Field>
                  <Field label="CTA text override" help="Leave blank to use the main CTA text">
                    <Stack direction="row" alignItems="center">
                      <TextField size="small" fullWidth value={config.welcomeOffer?.ctaText || ''} inputProps={{ maxLength: 24 }} placeholder={config.ctaText}
                        onChange={(e) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaText: e.target.value })} />
                      <TranslationPopover
                        fieldLabel="Welcome offer · CTA text override"
                        canonical={config.welcomeOffer?.ctaText || ''}
                        translations={translations['config.welcomeOffer.ctaText']}
                        onChange={(v) => setFieldTranslations('config.welcomeOffer.ctaText', v)}
                      />
                    </Stack>
                  </Field>
                  <Field label="CTA button color"><ColorField value={config.welcomeOffer?.ctaColor || config.cta} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaColor: v })} /></Field>
                  <Field label="CTA text color"><ColorField value={config.welcomeOffer?.ctaTextColor || invertText(config.welcomeOffer?.ctaColor || config.cta)} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), ctaTextColor: v })} /></Field>
                  <Field label="Hero image (optional)"><ImageUploadField value={config.welcomeOffer?.image || null} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), image: v })} /></Field>

                  {/* Background override for the welcome slide. When disabled, the
                      welcome slide inherits the main background (config.bg*). When
                      enabled, mirror the main Background section's solid / gradient /
                      image controls but write to config.welcomeOffer.bg* instead. */}
                  <Field label="Background override" help="Off: inherit the main background. On: give the welcome slide its own solid colour, gradient, or image.">
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Toggle
                        on={!!config.welcomeOffer?.bgEnabled}
                        onChange={(on) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bgEnabled: on })}
                        ariaLabel="Toggle welcome background override"
                      />
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {config.welcomeOffer?.bgEnabled ? 'Using a custom background' : 'Inheriting the main background'}
                      </Typography>
                    </Stack>
                  </Field>

                  {config.welcomeOffer?.bgEnabled && (
                    <>
                      <Field label="Background type">
                        <ToggleButtonGroup
                          value={config.welcomeOffer?.bgType || 'solid'} exclusive size="small"
                          onChange={(_, v) => v && set('welcomeOffer', { ...(config.welcomeOffer || {}), bgType: v })} fullWidth
                        >
                          <ToggleButton value="solid">Solid</ToggleButton>
                          <ToggleButton value="gradient">Gradient</ToggleButton>
                          <ToggleButton value="image">Image</ToggleButton>
                        </ToggleButtonGroup>
                      </Field>

                      {(config.welcomeOffer?.bgType || 'solid') === 'solid' && (
                        <Field label="Background color">
                          <ColorField value={config.welcomeOffer?.bg || config.bg} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bg: v })} />
                        </Field>
                      )}

                      {config.welcomeOffer?.bgType === 'gradient' && (
                        <>
                          <Field label="From color">
                            <ColorField value={config.welcomeOffer?.bg || config.bg} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bg: v })} />
                          </Field>
                          <Field label="To color">
                            <ColorField value={config.welcomeOffer?.bg2 || config.welcomeOffer?.bg || config.bg} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bg2: v })} />
                          </Field>
                          <Field label={`Angle · ${config.welcomeOffer?.bgAngle ?? 135}°`}>
                            <Slider min={0} max={360} value={config.welcomeOffer?.bgAngle ?? 135} onChange={(_, v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bgAngle: v })} />
                          </Field>
                        </>
                      )}

                      {config.welcomeOffer?.bgType === 'image' && (
                        <>
                          <Field label="Image">
                            <ImageUploadField value={config.welcomeOffer?.bgImage} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bgImage: v })} />
                          </Field>
                          <Field label="Overlay tint">
                            <ColorField value={config.welcomeOffer?.bg || '#000000'} onChange={(v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bg: v })} />
                          </Field>
                          <Field label={`Overlay opacity · ${Math.round((config.welcomeOffer?.bgOverlay ?? 0.35) * 100)}%`}>
                            <Slider min={0} max={100} value={Math.round((config.welcomeOffer?.bgOverlay ?? 0.35) * 100)} onChange={(_, v) => set('welcomeOffer', { ...(config.welcomeOffer || {}), bgOverlay: v / 100 })} />
                          </Field>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </Section>

            <Section title="Legal (optional)">
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Toggle on={!!config.legal?.enabled} onChange={(on) => set('legal', { ...(config.legal || {}), enabled: on })} ariaLabel="Toggle legal disclaimer" />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {config.legal?.enabled
                    ? (countries.includes('BR') ? 'Brazil band (~10% of ad)' : 'Shown in the ad')
                    : 'Hidden'}
                </Typography>
              </Stack>
              {config.legal?.enabled && (
                <>
                  <Field
                    label="Legal text"
                    help={countries.includes('BR')
                      ? 'Brazil SPA/MF (~10% band). 18+ badge is shown automatically; paste the Ministério sentence. License from bookmaker BR variant.'
                      : 'e.g. 18+ · Gamble responsibly · BeGambleAware.org'}
                  >
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={countries.includes('BR') ? 3 : 1}
                      value={config.legal?.text || ''}
                      inputProps={{ maxLength: 320 }}
                      placeholder={countries.includes('BR')
                        ? 'MINISTÉRIO DA FAZENDA ADVERTE: APOSTA NÃO É INVESTIMENTO. AUTORIZAÇÃO SPA/MF …'
                        : '18+ · Gamble responsibly'}
                      onChange={(e) => set('legal', { ...(config.legal || {}), text: e.target.value })}
                    />
                  </Field>
                  <Field label="Legal text color">
                    <ColorField value={config.legal?.color || config.text} onChange={(v) => set('legal', { ...(config.legal || {}), color: v })} />
                  </Field>
                  <Field
                    label="Legal footer background"
                    help={countries.includes('BR')
                      ? 'Background of the Brazil SPA/MF band (~10% of ad height). Supports hex or rgba.'
                      : 'Used when the legal band layout is active (Brazil targeting). Supports hex or rgba.'}
                  >
                    <ColorField
                      value={config.legal?.bgColor || 'rgba(0, 0, 0, 0.72)'}
                      onChange={(v) => set('legal', { ...(config.legal || {}), bgColor: v })}
                    />
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
                  {/* Arrow clicks drive `displayPos` (the visual transform) as
                      well as `slideIdx`. Forward reuses the autoplay mechanism
                      (advance + clone-snap-back when the increment lands on
                      the clone). Backward at index 0 jumps without transition
                      to the last real slide, since there's no clone before
                      slide 0 to animate into. */}
                  <IconButton size="small" onClick={() => {
                    setPlaying(false);
                    if (displayPos === 0) {
                      setTransitionOn(false);
                      setDisplayPos(totalSlides - 1);
                      setSlideIdx(totalSlides - 1);
                      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)));
                    } else {
                      setDisplayPos((p) => p - 1);
                      setSlideIdx((i) => (i - 1 + totalSlides) % totalSlides);
                    }
                  }}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Box sx={{ minWidth: 96, px: 0.75, fontSize: 11, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{slideLabel}</Box>
                  <IconButton size="small" onClick={() => {
                    setPlaying(false);
                    setDisplayPos((p) => p + 1);
                    setSlideIdx((i) => (i + 1) % totalSlides);
                  }}>
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

            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Box sx={{
                width: w * displayScale, height: h * displayScale,
                position: 'relative', overflow: 'hidden',
                borderRadius: `${(config.radius || 8) * displayScale}px`,
              }}>
                <AdPreview
                  config={config}
                  sizeId={previewSize}
                  bookmaker={previewBm}
                  scale={displayScale}
                  slideIdx={safeSlideIdx}
                  displayPos={displayPos}
                  transitionOn={transitionOn}
                  carouselDurationMs={SLIDE_DURATION_MS}
                  countries={countries}
                />
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

      <CreativeTemplateCodeDialog
        open={showGamCode}
        templateId={initial?.id || null}
        onClose={() => setShowGamCode(false)}
      />
    </Box>
  );
}

function Section({ title, children }) {
  // Sibling selector adds a divider line above every Section *after the first*
  // in the form sidebar, so the editor reads as a clear sequence of grouped
  // sub-sections without the first one having a leading line.
  return (
    <Box sx={{
      '&:not(:first-of-type)': {
        borderTop: '1px solid #E5E5E5',
        pt: 3,
      },
    }}>
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
