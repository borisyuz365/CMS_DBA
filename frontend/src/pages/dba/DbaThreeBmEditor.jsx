import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, Stack, Paper,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Divider, Chip, Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CodeIcon from '@mui/icons-material/Code';
import OutlinedInput from '@mui/material/OutlinedInput';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';

import { DBA_COUNTRIES } from '../../data/dbaData';
import CreativeTemplateCodeDialog from '../../components/dba/CreativeTemplateCodeDialog';
import apiService from '../../services/api';
import { StatusPill, LogoThumb, Toggle } from '../../components/dba/DbaPrimitives';
import { invertText, bookmakerLogoUrl, isPayloadLinkBookmaker } from '../../components/dba/dbaUtils';
import ThreeBmPreview from '../../components/dba/ThreeBmPreview';

const SECTION_COUNT = 3;

function normalizePoolBookmaker(bm) {
  if (!bm) return null;
  return {
    id: bm.id,
    name: bm.name,
    brandColor: bm.brandColor || bm.defaultLogo?.bg || '#151E22',
    secondaryColor: bm.secondaryColor || null,
    logoBg: bm.defaultLogo?.bg || bm.logoBg || bm.brandColor || '#151E22',
    logoFg: bm.defaultLogo?.fg || bm.logoFg || '#FFFFFF',
    initials: bm.defaultLogo?.initials || bm.initials || (bm.name || 'BM').slice(0, 3).toUpperCase(),
    defaultLogoImageUrl: bm.defaultLogo?.imageUrl || bm.defaultLogoImageUrl || bookmakerLogoUrl(bm.id),
    useNoBgLogo: false,
    variants: bm.variants || undefined,
    fromPool: !bm.variants,
  };
}

function defaultSection(partial = {}) {
  const base = {
    bookmakerId: null,
    bookmakerName: '',
    bg: '#151E22',
    logoUrl: '',
    logoHeight: 20,
    headline: '',
    headlineColor: '#FFFFFF',
    headlineSize: 12,
    headlineWeight: '700',
    conditions: '',
    // Default matches headline — keep in sync when seeding from bookmaker.
    conditionsColor: '#FFFFFF',
    conditionsSize: 8,
    conditionsWeight: '400',
    ctaText: 'Bet Now',
    ctaColor: '#0A0A0A',
    ctaBg: '#FFFFFF',
    ctaSize: 11,
    ctaWeight: '700',
    affiliateOverride: '',
    ...partial,
  };
  // Coerce colors to hex for <input type="color">. Legacy rgba conditions
  // (old muted seed) snap back to headline so preview doesn't go black.
  const headlineHex = toColorInputValue(base.headlineColor, '#FFFFFF');
  base.headlineColor = headlineHex;
  const rawCond = (partial && partial.conditionsColor != null) ? String(partial.conditionsColor) : '';
  if (!rawCond || /^rgba?\(/i.test(rawCond.trim())) {
    base.conditionsColor = headlineHex;
  } else {
    base.conditionsColor = toColorInputValue(rawCond, headlineHex);
  }
  return base;
}

/** Normalize stored colors for <input type="color"> (hex only). */
function toColorInputValue(c, fallback = '#FFFFFF') {
  if (!c || typeof c !== 'string') return fallback;
  const s = c.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return `#${[m[1], m[2], m[3]].map((n) => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;
  }
  return fallback;
}

function seedFromBookmaker(bm) {
  if (!bm) return {};
  const brand = bm.brandColor || bm.logoBg || '#151E22';
  const text = invertText(brand);
  const secondary = bm.secondaryColor && bm.secondaryColor !== brand ? bm.secondaryColor : null;
  const ctaBg = secondary || invertText(brand);
  return {
    bg: brand,
    headlineColor: text,
    // Conditions default to the same color as the headline.
    conditionsColor: text,
    ctaBg,
    ctaColor: invertText(ctaBg),
    logoUrl: bookmakerLogoUrl(bm.id, { noBg: !!bm.useNoBgLogo }) || bm.defaultLogoImageUrl || '',
  };
}

export default function DbaThreeBmEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const [initial, setInitial] = useState(null);
  const [poolBookmakers, setPoolBookmakers] = useState(null);
  const [dbaBookmakers, setDbaBookmakers] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const tplPromise = isNew ? Promise.resolve(null) : apiService.getDbaTemplate(id);
    const poolPromise = apiService.getDbaBookmakerPool().catch((err) => {
      console.warn('[DbaThreeBmEditor] bookmaker pool unavailable:', err.message);
      return null;
    });
    const dbaPromise = apiService.getDbaBookmakers().catch(() => []);
    Promise.all([tplPromise, poolPromise, dbaPromise])
      .then(([tpl, pool, dba]) => {
        if (cancelled) return;
        setInitial(tpl);
        const dbaList = Array.isArray(dba) ? dba : [];
        setDbaBookmakers(dbaList);
        const poolList = Array.isArray(pool) ? pool.map(normalizePoolBookmaker) : [];
        // Prefer active production pool (IS_VISIBLE). Fall back to DBA-configured
        // list only if the pool endpoint is down.
        if (poolList.length) {
          setPoolBookmakers(poolList);
        } else {
          setPoolBookmakers(dbaList.map(normalizePoolBookmaker));
          if (pool === null) {
            setLoadError('Bookmaker pool unavailable — showing DBA-configured bookmakers only. Check VPN / DB.');
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setPoolBookmakers([]);
      });
    return () => { cancelled = true; };
  }, [id, isNew]);

  if (poolBookmakers === null) {
    return <Box sx={{ p: 4 }}><Typography color="text.secondary">Loading editor…</Typography></Box>;
  }
  if (loadError && !poolBookmakers.length && !initial && !isNew) {
    return <Box sx={{ p: 4 }}><Alert severity="error">Failed to load editor: {loadError}</Alert></Box>;
  }
  return (
    <DbaThreeBmEditorInner
      key={id || 'new-3bm'}
      initial={initial}
      poolBookmakers={poolBookmakers}
      dbaBookmakers={dbaBookmakers}
      isNew={isNew}
      loadWarning={loadError}
    />
  );
}

function DbaThreeBmEditorInner({ initial, poolBookmakers, dbaBookmakers, isNew, loadWarning }) {
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name || 'New 3-Bookie MPU');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [countries, setCountries] = useState(() => Array.isArray(initial?.countries) ? initial.countries : []);
  const [sections, setSections] = useState(() => {
    const raw = initial?.config?.sections;
    if (Array.isArray(raw) && raw.length) {
      return Array.from({ length: SECTION_COUNT }, (_, i) => defaultSection(raw[i] || {}));
    }
    return [defaultSection(), defaultSection(), defaultSection()];
  });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [toast, setToast] = useState(null);
  const [showGamCode, setShowGamCode] = useState(false);
  const [savedId, setSavedId] = useState(initial?.id || null);
  const [saving, setSaving] = useState(false);

  const poolById = useMemo(() => {
    const map = new Map();
    poolBookmakers.forEach((b) => map.set(b.id, b));
    return map;
  }, [poolBookmakers]);
  const dbaById = useMemo(() => {
    const map = new Map();
    dbaBookmakers.forEach((b) => map.set(b.id, b));
    return map;
  }, [dbaBookmakers]);

  const resolveBookmaker = (bookmakerId) => {
    if (!bookmakerId) return null;
    const dba = dbaById.get(bookmakerId);
    const pool = poolById.get(bookmakerId);
    if (dba && pool) {
      return {
        ...normalizePoolBookmaker(pool),
        ...dba,
        logoBg: dba.logoBg || pool.logoBg,
        logoFg: dba.logoFg || pool.logoFg,
        initials: dba.initials || pool.initials,
        brandColor: dba.brandColor || pool.brandColor,
        secondaryColor: dba.secondaryColor || pool.secondaryColor,
      };
    }
    return dba ? normalizePoolBookmaker(dba) : pool || null;
  };

  const setSection = (index, patch) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleBookmakerPick = (index, bmId) => {
    const bm = resolveBookmaker(bmId);
    setSection(index, {
      bookmakerId: bmId,
      bookmakerName: bm?.name || '',
      ...seedFromBookmaker(bm),
    });
  };

  const previewCountry = countries[0] || 'IT';

  const affiliatePreview = (section) => {
    const bm = resolveBookmaker(section.bookmakerId);
    if (!section.bookmakerId) return null;
    if (isPayloadLinkBookmaker(section.bookmakerId) || (bm && isPayloadLinkBookmaker(bm))) {
      return { kind: 'extralinks', text: 'Managed via ExtraLinks (GetPayload Bookie.Link) — no baked URL / no [%bet365_cta_url%]' };
    }
    const override = (section.affiliateOverride || '').trim();
    const variant = bm?.variants?.[previewCountry];
    const url = override || variant?.affiliate || '';
    if (url) return { kind: 'static', text: url };
    if (bm?.variants) {
      return { kind: 'static', text: `No affiliate for ${previewCountry} — set DBA variant or override below` };
    }
    return { kind: 'static', text: `Not in DBA Bookmakers — paste affiliate override below (supports $GUID)` };
  };

  const buildPayload = (nextStatus) => ({
    id: savedId || undefined,
    name: name.trim() || 'New 3-Bookie MPU',
    kind: '3bm',
    sizeId: '300x250',
    size: '3-Bookie MPU · fluid',
    status: nextStatus || status,
    bookmakerId: null,
    countries,
    config: {
      kind: '3bm',
      sections: sections.map((s) => defaultSection(s)),
    },
    modifiedBy: 'D. Benvelgy',
  });

  const handleSave = async (nextStatus) => {
    setSaving(true);
    try {
      const body = buildPayload(nextStatus);
      let saved;
      if (savedId) {
        saved = await apiService.updateDbaTemplate(savedId, body);
      } else {
        saved = await apiService.createDbaTemplate(body);
        setSavedId(saved.id);
      }
      setStatus(saved.status);
      setToast({ kind: 'success', msg: `${saved.name} saved` });
      if (isNew && saved.id) {
        navigate(`/dba/templates/${saved.id}/edit`, { replace: true });
      }
    } catch (err) {
      setToast({ kind: 'error', msg: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
      setConfirmPublish(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto', width: '100%' }}>
      {loadWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>{loadWarning}</Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dba/templates')} size="small">
          Formats
        </Button>
        <Chip label="3-Bookie MPU" size="small" color="primary" variant="outlined" />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {poolBookmakers.length} active bookmakers
        </Typography>
        <Box sx={{ flex: 1 }} />
        <StatusPill kind={status === 'live' ? 'live' : 'draft'} label={status === 'live' ? 'Live' : 'Draft'} />
        {savedId && (
          <Button size="small" startIcon={<CodeIcon />} onClick={() => setShowGamCode(true)}>
            View GAM code
          </Button>
        )}
        <Button size="small" variant="outlined" disabled={saving} onClick={() => handleSave('draft')} startIcon={<SaveIcon />}>
          Save draft
        </Button>
        <Button size="small" variant="contained" disabled={saving} onClick={() => setConfirmPublish(true)} startIcon={<CheckIcon />}>
          Save & Publish
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 3, alignItems: 'start' }}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1.5 }}>Identity</Typography>
            <Stack spacing={1.5}>
              <TextField size="small" label="Format name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              <FormControl size="small" fullWidth>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Target countries</Typography>
                <Select
                  multiple
                  value={countries}
                  onChange={(e) => setCountries(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  input={<OutlinedInput />}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {DBA_COUNTRIES.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      <Checkbox checked={countries.indexOf(c.code) > -1} size="small" />
                      <ListItemText primary={`${c.flag || ''} ${c.code}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: 13 }}>Live</Typography>
                <Toggle on={status === 'live'} onChange={(on) => setStatus(on ? 'live' : 'draft')} />
              </Stack>
            </Stack>
          </Paper>

          {sections.map((sec, index) => {
            const bm = resolveBookmaker(sec.bookmakerId);
            const aff = affiliatePreview(sec);
            const isBet365 = isPayloadLinkBookmaker(sec.bookmakerId);
            const hasDbaVariant = !!(bm?.variants);
            return (
              <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>Section {index + 1}</Typography>
                  {isBet365 && <Chip size="small" label="Bet365 ExtraLinks" color="warning" />}
                </Stack>
                <Stack spacing={1.25}>
                  <FormControl size="small" fullWidth>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                      Bookmaker (active pool)
                    </Typography>
                    <Select
                      value={sec.bookmakerId || ''}
                      displayEmpty
                      onChange={(e) => handleBookmakerPick(index, e.target.value || null)}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
                    >
                      <MenuItem value=""><em>Select bookmaker</em></MenuItem>
                      {poolBookmakers.map((b) => (
                        <MenuItem key={b.id} value={b.id}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LogoThumb bg={b.logoBg} fg={b.logoFg} initials={b.initials}
                              imageUrl={b.defaultLogoImageUrl || bookmakerLogoUrl(b.id)}
                              size={20} radius={3} />
                            <span>{b.name}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {aff && (
                    <Alert severity={aff.kind === 'extralinks' ? 'info' : (aff.text.startsWith('No affiliate') || aff.text.startsWith('Not in DBA') ? 'warning' : 'success')} sx={{ py: 0 }}>
                      <Typography sx={{ fontSize: 12 }}>{aff.text}</Typography>
                    </Alert>
                  )}

                  {!isBet365 && sec.bookmakerId && (
                    <TextField
                      size="small" fullWidth
                      label={hasDbaVariant
                        ? `Affiliate override (optional, else ${previewCountry} DBA variant)`
                        : 'Affiliate URL (required — not in DBA Bookmakers)'}
                      value={sec.affiliateOverride || ''}
                      onChange={(e) => setSection(index, { affiliateOverride: e.target.value })}
                      placeholder="https://…$GUID"
                      helperText="Use $GUID where the network requires an impression guid"
                    />
                  )}

                  <Divider />

                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Background" type="color" value={sec.bg || '#151E22'}
                      onChange={(e) => setSection(index, { bg: e.target.value })} sx={{ width: 100 }} />
                    <TextField size="small" label="Logo URL" fullWidth value={sec.logoUrl || ''}
                      onChange={(e) => setSection(index, { logoUrl: e.target.value })} />
                    <TextField size="small" label="Logo H" type="number" value={sec.logoHeight ?? 20}
                      onChange={(e) => setSection(index, { logoHeight: Number(e.target.value) || 20 })}
                      sx={{ width: 88 }} />
                  </Stack>
                  <TextField size="small" label="Headline" fullWidth value={sec.headline || ''}
                    onChange={(e) => setSection(index, { headline: e.target.value })} />
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Headline color" type="color"
                      value={toColorInputValue(sec.headlineColor, '#FFFFFF')}
                      onChange={(e) => {
                        const headlineColor = e.target.value;
                        // Keep conditions matching headline until the user sets a distinct conditions color.
                        const cond = toColorInputValue(sec.conditionsColor, '');
                        const head = toColorInputValue(sec.headlineColor, '#FFFFFF');
                        const syncConditions = !sec.conditionsColor || cond === head;
                        setSection(index, syncConditions
                          ? { headlineColor, conditionsColor: headlineColor }
                          : { headlineColor });
                      }}
                      sx={{ width: 120 }} />
                    <TextField size="small" label="Size" type="number" value={sec.headlineSize ?? 12}
                      onChange={(e) => setSection(index, { headlineSize: Number(e.target.value) || 12 })} sx={{ width: 80 }} />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select value={String(sec.headlineWeight || '700')}
                        onChange={(e) => setSection(index, { headlineWeight: e.target.value })}>
                        <MenuItem value="400">Regular</MenuItem>
                        <MenuItem value="600">Semi</MenuItem>
                        <MenuItem value="700">Bold</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField size="small" label="Conditions" fullWidth value={sec.conditions || ''}
                    onChange={(e) => setSection(index, { conditions: e.target.value })} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" label="Conditions color" type="color"
                      value={toColorInputValue(sec.conditionsColor || sec.headlineColor, '#FFFFFF')}
                      onChange={(e) => setSection(index, { conditionsColor: e.target.value })}
                      sx={{ width: 140 }} />
                    <TextField size="small" label="Size" type="number" value={sec.conditionsSize ?? 8}
                      onChange={(e) => setSection(index, { conditionsSize: Number(e.target.value) || 8 })} sx={{ width: 80 }} />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select value={String(sec.conditionsWeight || '400')}
                        onChange={(e) => setSection(index, { conditionsWeight: e.target.value })}>
                        <MenuItem value="400">Regular</MenuItem>
                        <MenuItem value="600">Semi</MenuItem>
                        <MenuItem value="700">Bold</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="CTA text" value={sec.ctaText || ''}
                      onChange={(e) => setSection(index, { ctaText: e.target.value })} sx={{ flex: 1 }} />
                    <TextField size="small" label="CTA bg" type="color"
                      value={toColorInputValue(sec.ctaBg, '#FFFFFF')}
                      onChange={(e) => setSection(index, { ctaBg: e.target.value })} sx={{ width: 100 }} />
                    <TextField size="small" label="CTA text" type="color"
                      value={toColorInputValue(sec.ctaColor, '#0A0A0A')}
                      onChange={(e) => setSection(index, { ctaColor: e.target.value })} sx={{ width: 100 }} />
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Box sx={{ position: 'sticky', top: 16 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Preview</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
              Same CSS as GAM export (Helvetica, 6/12/8 padding, 83.33px rows) · ~360px wide · {previewCountry} affiliates
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#F5F5F5', p: 2, borderRadius: 1 }}>
              <ThreeBmPreview sections={sections} bookmakers={poolBookmakers} width={360} />
            </Box>
            <Tooltip title="Bet365 sections resolve at impression time via AttNw / AttCmp — one GAM line item covers all targetings.">
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.5 }}>
                Static sections bake affiliate (+ optional $GUID). Bet365 uses ExtraLinks, not a GAM CTA macro.
              </Typography>
            </Tooltip>
          </Paper>
        </Box>
      </Box>

      <Dialog open={confirmPublish} onClose={() => setConfirmPublish(false)}>
        <DialogTitle>Publish {name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This marks the 3-bookie MPU as Live. Copy the GAM code into Ad Manager after saving — CMS does not push automatically.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPublish(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSave('live')}>Publish</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.kind === 'error' ? 'error' : 'success'} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>

      <CreativeTemplateCodeDialog
        open={showGamCode}
        templateId={savedId}
        onClose={() => setShowGamCode(false)}
      />
    </Box>
  );
}
