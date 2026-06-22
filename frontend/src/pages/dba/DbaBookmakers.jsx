import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Select, MenuItem, FormControl,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, TableSortLabel,
  Drawer, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Alert, InputAdornment, Snackbar, Stack, Tooltip, Menu, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import UploadIcon from '@mui/icons-material/Upload';
import ImageIcon from '@mui/icons-material/Image';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { DBA_BOOKMAKER_POOL, DBA_COUNTRIES } from '../../data/dbaData';
import apiService from '../../services/api';
import { StatusPill, LogoThumb, Toggle } from '../../components/dba/DbaPrimitives';
import { relTime, truncateMiddle, bookmakerLogoUrl } from '../../components/dba/dbaUtils';

export default function DbaBookmakers() {
  const [bookmakers, setBookmakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getDbaBookmakers()
      .then((list) => { if (!cancelled) { setBookmakers(Array.isArray(list) ? list : []); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setLoadError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortKey, setSortKey] = useState('modified');
  const [sortDir, setSortDir] = useState('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [formInitial, setFormInitial] = useState(null);
  const [formDefaultCountry, setFormDefaultCountry] = useState('US');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [toast, setToast] = useState(null);

  const rows = useMemo(() => {
    const all = [];
    bookmakers.forEach((bm) => {
      Object.entries(bm.variants).forEach(([cc, v]) => {
        all.push({ rowId: `${bm.id}_${cc}`, bm, cc, ...v });
      });
    });
    return all;
  }, [bookmakers]);

  const filtered = useMemo(() => {
    let out = rows;
    if (countryFilter !== 'all') out = out.filter((r) => r.cc === countryFilter);
    if (statusFilter !== 'all') out = out.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((r) => r.bm.name.toLowerCase().includes(s) || r.cc.toLowerCase().includes(s));
    }
    out = [...out].sort((a, b) => {
      let av, bv;
      if (sortKey === 'name')     { av = a.bm.name.toLowerCase(); bv = b.bm.name.toLowerCase(); }
      else if (sortKey === 'country') { av = a.cc; bv = b.cc; }
      else if (sortKey === 'status')  { av = a.status; bv = b.status; }
      else                            { av = new Date(a.modified).getTime(); bv = new Date(b.modified).getTime(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, countryFilter, statusFilter, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleAdd = () => { setFormMode('add'); setFormInitial(null); setFormDefaultCountry(countryFilter === 'all' ? 'US' : countryFilter); setFormOpen(true); };
  const handleEdit = (bm, cc) => { setFormMode('edit'); setFormInitial(bm); setFormDefaultCountry(cc); setFormOpen(true); };

  const handleSave = async (bm) => {
    try {
      const saved = await apiService.upsertDbaBookmaker(bm);
      setBookmakers((bs) => {
        const idx = bs.findIndex((b) => b.id === saved.id);
        if (idx === -1) return [saved, ...bs];
        const next = [...bs]; next[idx] = saved; return next;
      });
      setShowBanner(true);
    } catch (err) {
      setToast({ kind: 'error', msg: `Save failed: ${err.message}` });
    }
  };

  const handleDelete = async (id, cc) => {
    try {
      await apiService.deleteDbaBookmakerVariant(id, cc);
      setBookmakers((bs) => bs.flatMap((b) => {
        if (b.id !== id) return [b];
        const v = { ...b.variants }; delete v[cc];
        if (Object.keys(v).length === 0) return [];
        return [{ ...b, variants: v }];
      }));
      setShowBanner(true);
    } catch (err) {
      setToast({ kind: 'error', msg: `Delete failed: ${err.message}` });
    }
  };

  const patchVariant = async (bm, cc, patch) => {
    const next = { ...patch, modified: new Date().toISOString(), modifiedBy: 'D. Benvelgy' };
    try {
      const updated = await apiService.patchDbaBookmakerVariant(bm.id, cc, next);
      setBookmakers((bs) => bs.map((b) => b.id === bm.id ? updated : b));
      setShowBanner(true);
      return true;
    } catch (err) {
      setToast({ kind: 'error', msg: `Update failed: ${err.message}` });
      return false;
    }
  };

  const handleStatusToggle = async (bm, cc, currentStatus) => {
    if (currentStatus === 'draft') setConfirmPublish({ bm, cc });
    else {
      const ok = await patchVariant(bm, cc, { status: 'draft' });
      if (ok) setToast({ kind: 'success', msg: `${bm.name} (${cc}) moved to Draft` });
    }
  };

  const confirmPublishYes = async () => {
    const { bm, cc } = confirmPublish;
    setConfirmPublish(null);
    const ok = await patchVariant(bm, cc, { status: 'live' });
    if (ok) setToast({ kind: 'success', msg: `${bm.name} is now Live in ${DBA_COUNTRIES.find(c => c.code === cc)?.name}` });
  };

  const confirmDeleteYes = async () => {
    const { bm, cc } = confirmDelete;
    setConfirmDelete(null);
    await handleDelete(bm.id, cc);
    setToast({ kind: 'success', msg: `${bm.name} removed from ${DBA_COUNTRIES.find(c => c.code === cc)?.name}` });
  };

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setCountryFilter('all'); };

  return (
    <Box sx={{ p: 4, maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }} spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>DBA Bookmaker Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
            Each row is a bookmaker's configuration for a specific country. Bookmakers can have different affiliate links, assets and statuses per market.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} size="large">
          Add Bookmaker
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>Failed to load bookmakers: {loadError}</Alert>
      )}

      {showBanner && (
        <Alert severity="info" sx={{ mb: 2 }}
          action={<IconButton size="small" onClick={() => setShowBanner(false)}><CloseIcon fontSize="small" /></IconButton>}>
          <strong>Bookmaker configuration changed.</strong>{' '}
          <Typography component="span" color="text.secondary" sx={{ fontSize: 'inherit' }}>
            Reload the service to apply changes immediately, or wait for the next automatic cache refresh.
          </Typography>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderBottom: '1px solid #E5E5E5', alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by bookmaker or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: '1 1 280px', maxWidth: 360 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              <MenuItem value="all">All countries</MenuItem>
              {DBA_COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="live">Live only</MenuItem>
              <MenuItem value="draft">Draft only</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ ml: 'auto', fontSize: 13, color: 'text.secondary' }}>
            {filtered.length} of {rows.length} configurations
          </Typography>
        </Box>

        {filtered.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>No configurations match</Typography>
            <Typography sx={{ mb: 2, fontSize: 14 }}>Try clearing the filters or adding a new bookmaker.</Typography>
            <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortKey === 'name' ? sortDir : false}>
                    <TableSortLabel active={sortKey === 'name'} direction={sortDir} onClick={() => handleSort('name')}>Bookmaker</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortKey === 'country' ? sortDir : false} sx={{ width: 160 }}>
                    <TableSortLabel active={sortKey === 'country'} direction={sortDir} onClick={() => handleSort('country')}>Country</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: 320 }}>Affiliate Link</TableCell>
                  <TableCell sortDirection={sortKey === 'status' ? sortDir : false} sx={{ width: 140 }}>
                    <TableSortLabel active={sortKey === 'status'} direction={sortDir} onClick={() => handleSort('status')}>Status</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortKey === 'modified' ? sortDir : false} sx={{ width: 170 }}>
                    <TableSortLabel active={sortKey === 'modified'} direction={sortDir} onClick={() => handleSort('modified')}>Last Modified</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: 110, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => {
                  const co = DBA_COUNTRIES.find((c) => c.code === r.cc);
                  return (
                    <TableRow key={r.rowId} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <LogoThumb
                            bg={r.bm.logoBg} fg={r.bm.logoFg} initials={r.bm.initials}
                            imageUrl={r.bm.dedicatedLogo ? null : bookmakerLogoUrl(r.bm.id)}
                          />
                          <Typography sx={{ fontWeight: 500 }}>{r.bm.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5,
                          bgcolor: '#F5F5F5', borderRadius: 999, fontSize: 13, whiteSpace: 'nowrap' }}>
                          <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>{co?.flag}</Box>
                          <Box component="span" sx={{ fontWeight: 500 }}>{r.cc === 'GLOBAL' ? 'Global' : r.cc}</Box>
                          {r.cc !== 'GLOBAL' && (
                            <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>· {co?.name}</Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {r.bm.id === 'bk_14' ? (
                          <Tooltip title="Bet365 links are resolved at click time against an external monthly table. The ad serves a redirect via /api/dba/links/click.">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                              <LinkIcon sx={{ fontSize: 13 }} />
                              <Box component="span">managed externally</Box>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Tooltip title={r.affiliate}>
                            <Box component="a" href={r.affiliate} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.preventDefault()}
                              sx={{ color: 'primary.main', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 13, fontFamily: 'ui-monospace, monospace' }}>
                              <LinkIcon sx={{ fontSize: 13 }} />
                              <Box component="span" sx={{ maxWidth: 260 }}>{truncateMiddle(r.affiliate, 42)}</Box>
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <StatusPill kind={r.status === 'live' ? 'live' : 'draft'} label={r.status === 'live' ? 'Live' : 'Draft'} />
                          <Toggle on={r.status === 'live'} onChange={() => handleStatusToggle(r.bm, r.cc, r.status)} ariaLabel="Toggle status" />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13 }}>{relTime(r.modified)}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>by {r.modifiedBy}</Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <IconButton size="small" onClick={() => handleEdit(r.bm, r.cc)} aria-label="Edit"><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small"
                          disabled={r.status === 'live'}
                          onClick={() => setConfirmDelete({ bm: r.bm, cc: r.cc })}
                          aria-label="Delete"><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <BookmakerForm
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        defaultCountry={formDefaultCountry}
        configuredBookmakers={bookmakers}
        onClose={() => setFormOpen(false)}
        onSave={(bm) => { handleSave(bm); setToast({ kind: 'success', msg: `${bm.name} saved` }); }}
      />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>
          {confirmDelete && `Remove ${confirmDelete.bm.name} from ${DBA_COUNTRIES.find(c => c.code === confirmDelete.cc)?.name}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDelete && Object.keys(confirmDelete.bm.variants).length > 1
              ? <>This only removes the <strong>{confirmDelete.cc}</strong> row. <strong>{confirmDelete.bm.name}</strong> will remain configured in {Object.keys(confirmDelete.bm.variants).length - 1} other countries.</>
              : <>This is the last country variant — removing it will delete the bookmaker <strong>{confirmDelete?.bm.name}</strong> entirely.</>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteYes}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmPublish} onClose={() => setConfirmPublish(null)}>
        <DialogTitle>
          {confirmPublish && `Publish in ${DBA_COUNTRIES.find(c => c.code === confirmPublish.cc)?.name}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmPublish && <>Publishing <strong>{confirmPublish.bm.name}</strong> will make it appear in live DBA ads served to <strong>{DBA_COUNTRIES.find(c => c.code === confirmPublish.cc)?.name}</strong>.</>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPublish(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPublishYes}>Publish</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.kind === 'error' ? 'error' : 'success'} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// =========================================================
// Bookmaker Form (slide-in Drawer with per-country tabs)
// =========================================================
function BookmakerForm({ open, mode, initial, defaultCountry, configuredBookmakers = [], onClose, onSave }) {
  // In add mode the user picks from the pool; in edit mode the bookmaker is fixed.
  const [selectedBookmaker, setSelectedBookmaker] = useState(null);
  const [defaultLogo, setDefaultLogo] = useState(null);    // from the pool (read-only)
  const [dedicatedLogo, setDedicatedLogo] = useState(null); // optional override
  const [useNoBgLogo, setUseNoBgLogo] = useState(false);   // pick the transparent variant
  const [variants, setVariants] = useState({});
  const [activeCC, setActiveCC] = useState(defaultCountry);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmPublishAll, setConfirmPublishAll] = useState(false);
  const [addCountryMenuAnchor, setAddCountryMenuAnchor] = useState(null);

  // Pool fetched from /api/dba/bookmaker-pool (DB-backed). Falls back to the
  // bundled mock list when the DB is unreachable (no VPN, missing creds, etc.).
  const [poolFromDb, setPoolFromDb] = useState(null);    // null = not loaded; [] = loaded but empty
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPoolLoading(true);
    setPoolError(null);
    fetch('/api/dba/bookmaker-pool')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { if (!cancelled) setPoolFromDb(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) { setPoolFromDb(null); setPoolError(err.message); } })
      .finally(() => { if (!cancelled) setPoolLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const usingFallback = poolFromDb === null;
  const sourcePool = poolFromDb || DBA_BOOKMAKER_POOL;

  // Already-configured bookmaker IDs — filter them out of the pool in add mode.
  const configuredIds = React.useMemo(
    () => new Set(configuredBookmakers.map((b) => b.id)),
    [configuredBookmakers]
  );
  const poolOptions = React.useMemo(
    () => (mode === 'edit')
      ? sourcePool
      : sourcePool.filter((b) => !configuredIds.has(b.id)),
    [mode, sourcePool, configuredIds]
  );

  React.useEffect(() => {
    if (open) {
      if (initial) {
        // Edit: hydrate from the existing configured bookmaker. Prefer the
        // live pool, fall back to the local bundle, then to the row itself.
        const fromPool =
          (poolFromDb && poolFromDb.find((b) => b.id === initial.id)) ||
          DBA_BOOKMAKER_POOL.find((b) => b.id === initial.id);
        setSelectedBookmaker(fromPool || { id: initial.id, name: initial.name });
        setDefaultLogo(fromPool?.defaultLogo || { bg: initial.logoBg, fg: initial.logoFg, initials: initial.initials });
        setDedicatedLogo(initial.dedicatedLogo || null);
        setUseNoBgLogo(!!initial.useNoBgLogo);
      } else {
        setSelectedBookmaker(null);
        setDefaultLogo(null);
        setDedicatedLogo(null);
        setUseNoBgLogo(false);
      }
      const v = {};
      if (initial?.variants) {
        Object.entries(initial.variants).forEach(([cc, val]) => { v[cc] = { affiliate: val.affiliate, status: val.status }; });
      } else {
        v[defaultCountry] = { affiliate: '', status: 'draft' };
      }
      setVariants(v);
      setActiveCC(defaultCountry in v ? defaultCountry : Object.keys(v)[0]);
      setErrors({});
      setTouched(false);
    }
  }, [open, initial, defaultCountry, poolFromDb]);

  // Effective logo shown in the live thumbnail = dedicated override > default from pool
  const effectiveLogo = dedicatedLogo || defaultLogo;

  const handleSelectBookmaker = (bm) => {
    setSelectedBookmaker(bm);
    setDefaultLogo(bm?.defaultLogo || null);
    // Don't clear the dedicated logo on bookmaker change — the user might have
    // specifically uploaded one to apply across selections. But in add mode
    // there's no dedicated logo yet, so this is effectively a no-op there.
    setTouched(true);
    setErrors((er) => ({ ...er, bookmaker: null }));
  };

  const handleDedicatedLogoUpload = () => {
    // Mock upload: pick a random palette and use the bookmaker's initials.
    // Real implementation: open a file picker, POST to /api/dba/uploads, store the returned URL.
    const PALETTES = [
      { bg: '#1976D2', fg: '#FFFFFF' }, { bg: '#FFCC00', fg: '#0A0A0A' },
      { bg: '#0A0A0A', fg: '#FFFFFF' }, { bg: '#9C27B0', fg: '#FFFFFF' },
      { bg: '#2E7D32', fg: '#FFFFFF' }, { bg: '#FF495C', fg: '#FFFFFF' },
    ];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const initials = selectedBookmaker?.name?.slice(0, 3).toUpperCase() || 'NEW';
    setDedicatedLogo({ ...p, initials });
    setTouched(true);
  };

  const handleRemoveDedicatedLogo = () => {
    setDedicatedLogo(null);
    setTouched(true);
  };

  const ccList = Object.keys(variants);
  const activeV = variants[activeCC];
  const availableCountries = DBA_COUNTRIES.filter((c) => !variants[c.code]);
  const variantErrors = errors.variants?.[activeCC] || {};

  const setVariantField = (cc, key, val) => {
    setVariants((vs) => ({ ...vs, [cc]: { ...vs[cc], [key]: val } }));
    setTouched(true);
  };

  // Bookmakers whose affiliate URLs are not entered by hand — they're resolved
  // at click time against an external link table (see backend/services/bet365Links.js
  // and backend/routes/dbaLinks.js). For these, the per-country URL field in
  // the editor is read-only and validation is skipped.
  const CONTEXT_LINKED_BOOKMAKER_IDS = new Set(['bk_14']); // Bet365
  const isContextLinked = !!(selectedBookmaker && CONTEXT_LINKED_BOOKMAKER_IDS.has(selectedBookmaker.id));

  const validate = () => {
    const e = {};
    if (!selectedBookmaker) e.bookmaker = 'Pick a bookmaker from the pool';
    if (!defaultLogo) e.logo = 'Default logo is missing';
    const perCountry = {};
    Object.entries(variants).forEach(([cc, v]) => {
      const ce = {};
      if (!isContextLinked) {
        if (!v.affiliate.trim()) ce.affiliate = 'Affiliate link required';
        else if (!/^https?:\/\/.+/i.test(v.affiliate)) ce.affiliate = 'Must start with http:// or https://';
      }
      if (Object.keys(ce).length) perCountry[cc] = ce;
    });
    if (Object.keys(perCountry).length) e.variants = perCountry;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doSave = (publishAll) => {
    if (!validate()) return;
    const finalVariants = {};
    Object.entries(variants).forEach(([cc, v]) => {
      finalVariants[cc] = {
        affiliate: v.affiliate.trim(),
        status: publishAll ? 'live' : v.status,
        modified: new Date().toISOString(),
        modifiedBy: 'D. Benvelgy',
      };
    });
    // The bookmaker keeps the pool's default logo as its identity, and the
    // dedicated logo (if any) lives alongside it so the user can revert.
    const display = dedicatedLogo || defaultLogo;
    onSave({
      ...(initial || {}),
      id: selectedBookmaker.id,
      name: selectedBookmaker.name,
      logoBg: display.bg, logoFg: display.fg, initials: display.initials,
      // Stored alongside so the table / ad preview can render the CDN logo.
      defaultLogoImageUrl: defaultLogo?.imageUrl || null,
      defaultLogoImageUrlNoBg: defaultLogo?.imageUrlNoBg || null,
      useNoBgLogo: useNoBgLogo,
      dedicatedLogo: dedicatedLogo, // null if no override
      variants: finalVariants,
    });
    onClose();
  };

  const tryClose = () => {
    if (touched) setConfirmDiscard(true);
    else onClose();
  };

  const addCountryVariant = (cc) => {
    setVariants((vs) => ({ ...vs, [cc]: { affiliate: '', status: 'draft' } }));
    setActiveCC(cc);
    setAddCountryMenuAnchor(null);
    setTouched(true);
  };

  const removeCountryVariant = (cc) => {
    if (ccList.length === 1) return;
    const next = { ...variants }; delete next[cc];
    setVariants(next);
    setActiveCC(Object.keys(next)[0]);
    setTouched(true);
  };

  const copyFromActive = (toCC) => {
    setVariants((vs) => ({ ...vs, [toCC]: { ...vs[activeCC] } }));
  };

  const activeCountryObj = DBA_COUNTRIES.find((c) => c.code === activeCC);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={tryClose}
        PaperProps={{ sx: { width: 640, maxWidth: '100vw' } }}
      >
        <Box sx={{ p: 2.5, borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
              {mode === 'edit' ? 'Edit Bookmaker' : 'New Bookmaker'}
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {mode === 'edit' ? (initial?.name || 'Edit Bookmaker') : 'Add New Bookmaker'}
            </Typography>
          </Box>
          <IconButton onClick={tryClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
          {/* Shared */}
          <Box sx={{ mb: 3, pb: 2.5, borderBottom: '1px solid #E5E5E5' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              Shared (all countries)
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.75 }}>Bookmaker *</Typography>
              <Autocomplete
                size="small"
                disabled={mode === 'edit'}
                loading={poolLoading}
                value={selectedBookmaker}
                onChange={(_, v) => handleSelectBookmaker(v)}
                options={poolOptions}
                getOptionLabel={(o) => o?.name || ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderOption={(props, o) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <LogoThumb
                      bg={o.defaultLogo.bg} fg={o.defaultLogo.fg} initials={o.defaultLogo.initials}
                      imageUrl={o.defaultLogo.imageUrl}
                      size={28} radius={5}
                    />
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{o.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{o.id}</Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={mode === 'edit' ? selectedBookmaker?.name : 'Search bookmakers from the DB…'}
                    error={!!errors.bookmaker}
                    helperText={
                      errors.bookmaker ||
                      (mode === 'edit'
                        ? 'Bookmaker selection is locked when editing — create a new entry to add another'
                        : poolLoading
                          ? 'Loading bookmakers from T_BET_BOOKMAKERS…'
                          : usingFallback
                            ? `DB unreachable — showing ${poolOptions.length} mock entries${poolError ? ` (${poolError})` : ''}`
                            : `${poolOptions.length} bookmakers from the DB · ${poolFromDb.length - poolOptions.length} already configured`)
                    }
                  />
                )}
              />
            </Box>

            <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.75 }}>Logo</Typography>

            {/* Default logo from the pool — always shown, read-only. Two preview
                thumbnails (with bg / no bg) double as the variant selector. */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.75,
              border: '1px solid #E5E5E5', borderRadius: 2, p: 1.75, bgcolor: '#FAFAFA',
              mb: dedicatedLogo ? 1 : 1.5,
            }}>
              {defaultLogo ? (
                <Stack direction="row" spacing={1}>
                  {[
                    { key: 'with',   noBg: false, label: 'With bg' },
                    { key: 'no',     noBg: true,  label: 'Transparent' },
                  ].map((opt) => {
                    const active = useNoBgLogo === opt.noBg;
                    const url = opt.noBg
                      ? (defaultLogo.imageUrlNoBg || bookmakerLogoUrl(selectedBookmaker?.id, { noBg: true }))
                      : (defaultLogo.imageUrl     || bookmakerLogoUrl(selectedBookmaker?.id));
                    return (
                      <Tooltip key={opt.key} title={`${opt.label} variant`}>
                        <Box
                          onClick={() => { setUseNoBgLogo(opt.noBg); setTouched(true); }}
                          sx={{
                            position: 'relative', cursor: 'pointer',
                            p: 0.5, borderRadius: 1.25,
                            border: '2px solid',
                            borderColor: active ? 'primary.main' : 'transparent',
                            bgcolor: opt.noBg ? 'repeating-conic-gradient(#EEE 0 25%, #FFF 0 50%) 50% / 8px 8px' : 'transparent',
                            backgroundImage: opt.noBg ? 'repeating-conic-gradient(#EEE 0 25%, #FFF 0 50%)' : 'none',
                            backgroundSize: opt.noBg ? '8px 8px' : 'auto',
                          }}
                        >
                          <LogoThumb
                            bg={defaultLogo.bg} fg={defaultLogo.fg} initials={defaultLogo.initials}
                            imageUrl={url}
                            size={44}
                          />
                          {active && (
                            <Box sx={{
                              position: 'absolute', top: -6, right: -6,
                              width: 16, height: 16, borderRadius: 999,
                              bgcolor: 'primary.main', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, border: '2px solid #fff',
                            }}>✓</Box>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Stack>
              ) : (
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}><ImageIcon /></Box>
              )}
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 500, fontSize: 14 }}>Default logo</Typography>
                  <Box component="span" sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary', bgcolor: '#fff', px: 0.75, py: 0.125, borderRadius: 0.5, border: '1px solid #E5E5E5' }}>
                    From pool
                  </Box>
                  {defaultLogo && (
                    <Box component="span" sx={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                      color: useNoBgLogo ? 'primary.main' : 'text.secondary',
                      bgcolor: useNoBgLogo ? '#EFF6FF' : '#fff',
                      px: 0.75, py: 0.125, borderRadius: 0.5,
                      border: '1px solid', borderColor: useNoBgLogo ? '#BBDEFB' : '#E5E5E5',
                    }}>
                      {useNoBgLogo ? 'Transparent' : 'With background'}
                    </Box>
                  )}
                </Stack>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  {selectedBookmaker
                    ? `Central image for ${selectedBookmaker.name} — click a thumbnail to switch variant`
                    : 'Pick a bookmaker to see its default logo'}
                </Typography>
              </Box>
            </Box>

            {/* Dedicated logo — optional override saved alongside the default */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.75,
              border: '1.5px dashed', borderColor: dedicatedLogo ? '#1976D2' : '#D4D4D4',
              borderRadius: 2, p: 1.75,
              bgcolor: dedicatedLogo ? '#EFF6FF' : '#FAFAFA',
            }}>
              {dedicatedLogo
                ? <LogoThumb bg={dedicatedLogo.bg} fg={dedicatedLogo.fg} initials={dedicatedLogo.initials} size={48} />
                : <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}><ImageIcon /></Box>}
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 500, fontSize: 14 }}>Dedicated logo</Typography>
                  <Box component="span" sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    Optional
                  </Box>
                </Stack>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  {dedicatedLogo
                    ? 'Overrides the default for this bookmaker. Saved alongside the default — remove to revert.'
                    : 'Upload a custom logo that takes precedence over the default. The default stays available.'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75}>
                <Button variant="outlined" size="small" startIcon={<UploadIcon />} disabled={!selectedBookmaker} onClick={handleDedicatedLogoUpload}>
                  {dedicatedLogo ? 'Replace' : 'Upload'}
                </Button>
                {dedicatedLogo && (
                  <Tooltip title="Remove dedicated logo (falls back to default)">
                    <IconButton size="small" onClick={handleRemoveDedicatedLogo}><CloseIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {effectiveLogo && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>In ads, you'll see:</Typography>
                <LogoThumb
                  bg={effectiveLogo.bg} fg={effectiveLogo.fg} initials={effectiveLogo.initials}
                  imageUrl={
                    dedicatedLogo
                      ? null
                      : (useNoBgLogo
                          ? (defaultLogo?.imageUrlNoBg || bookmakerLogoUrl(selectedBookmaker?.id, { noBg: true }))
                          : (defaultLogo?.imageUrl     || bookmakerLogoUrl(selectedBookmaker?.id)))
                  }
                  size={28} radius={5}
                />
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                  {dedicatedLogo ? 'Dedicated logo' : (useNoBgLogo ? 'Default logo (transparent)' : 'Default logo')}
                </Typography>
              </Stack>
            )}
            {errors.logo && <Typography color="error" sx={{ fontSize: 13, mt: 1 }}>{errors.logo}</Typography>}
          </Box>

          {/* Per-country */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Per-country configuration · {ccList.length} {ccList.length === 1 ? 'country' : 'countries'}
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />}
              disabled={availableCountries.length === 0}
              onClick={(e) => setAddCountryMenuAnchor(e.currentTarget)}>Add country</Button>
            <Menu open={!!addCountryMenuAnchor} anchorEl={addCountryMenuAnchor} onClose={() => setAddCountryMenuAnchor(null)}>
              {availableCountries.map((c) => (
                <MenuItem key={c.code} onClick={() => addCountryVariant(c.code)}>
                  <Box component="span" sx={{ mr: 1 }}>{c.flag}</Box>
                  {c.name}
                  <Box component="span" sx={{ ml: 'auto', pl: 2, fontSize: 11, color: 'text.secondary' }}>{c.code}</Box>
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          <Tabs
            value={activeCC}
            onChange={(_, v) => setActiveCC(v)}
            variant="scrollable"
            sx={{ borderBottom: '1px solid #E5E5E5', mb: 2, minHeight: 40 }}
          >
            {ccList.map((cc) => {
              const co = DBA_COUNTRIES.find((c) => c.code === cc);
              return (
                <Tab key={cc} value={cc} sx={{ minHeight: 40, textTransform: 'none' }}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box component="span">{co?.flag}</Box>
                      <Box component="span">{cc}</Box>
                      {errors.variants?.[cc] && <Box component="span" sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: 'error.main' }} />}
                      <StatusPill kind={variants[cc].status === 'live' ? 'live' : 'draft'} label={variants[cc].status === 'live' ? 'Live' : 'Draft'} />
                    </Stack>
                  }
                />
              );
            })}
          </Tabs>

          {activeV && (
            <Paper variant="outlined" sx={{ p: 2.25, bgcolor: '#FAFAFA' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box sx={{ fontSize: 20 }}>{activeCountryObj?.flag}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{activeCountryObj?.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Variant for {activeCC}</Typography>
                  </Box>
                </Stack>
                {ccList.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeCountryVariant(activeCC)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>

              <TextField
                label={`Affiliate Link · ${activeCC}${isContextLinked ? ' · managed externally' : ' *'}`}
                size="small" fullWidth
                value={activeV?.affiliate || ''}
                onChange={(e) => setVariantField(activeCC, 'affiliate', e.target.value)}
                error={!!variantErrors.affiliate}
                disabled={isContextLinked}
                helperText={
                  variantErrors.affiliate
                  || (isContextLinked
                    ? `Bet365 links are written monthly by an external system (context: country × platform × language × month). The ad serves a redirect via /api/dba/links/click that resolves to the live URL at click time.`
                    : `Used when the user's market is ${activeCC}.`)
                }
                placeholder={isContextLinked ? 'Resolved at click time — not edited here' : `https://… (specific to ${activeCC})`}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment>,
                  sx: { fontFamily: 'ui-monospace, monospace', fontSize: 13 },
                }}
                sx={{ mb: 1.5 }}
              />

              {ccList.length > 1 && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Copy this link to:</Typography>
                  {ccList.filter((cc) => cc !== activeCC).map((cc) => (
                    <Button key={cc} size="small" variant="outlined" sx={{ height: 24, minWidth: 0, px: 1, fontSize: 11 }} onClick={() => copyFromActive(cc)}>
                      {DBA_COUNTRIES.find((c) => c.code === cc)?.flag} {cc}
                    </Button>
                  ))}
                </Box>
              )}

              <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.75 }}>Status in {activeCC}</Typography>
              <Stack direction="row" sx={{ border: '1px solid #E5E5E5', borderRadius: 2, p: 0.5, bgcolor: '#fff' }}>
                {['draft', 'live'].map((s) => {
                  const active = activeV?.status === s;
                  return (
                    <Button key={s}
                      onClick={() => setVariantField(activeCC, 'status', s)}
                      sx={{
                        flex: 1, height: 32, textTransform: 'none', fontSize: 13,
                        bgcolor: active ? '#F5F5F5' : 'transparent',
                        color: active ? 'text.primary' : 'text.secondary',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <Box component="span" sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: s === 'live' ? '#4CAF50' : '#A3A3A3', mr: 1 }} />
                      {s === 'live' ? 'Live' : 'Draft'}
                    </Button>
                  );
                })}
              </Stack>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75 }}>
                {activeV?.status === 'draft' ? `Hidden from live ads in ${activeCountryObj?.name}.` : `Visible in all live DBA ads served to ${activeCountryObj?.name}.`}
              </Typography>
            </Paper>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25 }}>
          <Button onClick={tryClose}>Cancel</Button>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {ccList.filter((cc) => variants[cc].status === 'live').length} of {ccList.length} live
            </Typography>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => doSave(false)}>Save</Button>
            <Button variant="contained" startIcon={<CheckIcon />} onClick={() => { if (validate()) setConfirmPublishAll(true); }}>
              Save & Publish all
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>You have unsaved changes across one or more country variants. If you leave now, your changes will be lost.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirmDiscard(false); onClose(); }}>Discard</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmPublishAll} onClose={() => setConfirmPublishAll(false)}>
        <DialogTitle>Publish to all {ccList.length} countries?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Publishing will make <strong>{selectedBookmaker?.name}</strong> live in <strong>{ccList.join(', ')}</strong>. To publish to only some countries, set status per tab and use Save instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPublishAll(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setConfirmPublishAll(false); doSave(true); }}>Publish everywhere</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
