import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, Select, MenuItem, FormControl,
  Paper, Stack, Snackbar, Alert, Tooltip, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloseIcon from '@mui/icons-material/Close';

import { DBA_TEMPLATES, DBA_BOOKMAKERS } from '../../data/dbaData';
import { StatusPill, LogoThumb } from '../../components/dba/DbaPrimitives';
import { relTime, bgCss, SIZE_DIMS, bookmakerLogoUrl } from '../../components/dba/dbaUtils';
import AdPreview from '../../components/dba/AdPreview';

export default function DbaTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(DBA_TEMPLATES);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookmakerFilter, setBookmakerFilter] = useState('all');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const isAnyLive = (b) => b.variants ? Object.values(b.variants).some((v) => v.status === 'live') : b.status === 'live';
  const dbaEnabledBookmakers = useMemo(() => DBA_BOOKMAKERS.filter(isAnyLive), []);
  const bmForTemplate = (t) =>
    DBA_BOOKMAKERS.find((b) => b.id === t.bookmakerId) ||
    DBA_BOOKMAKERS.find((b) => b.id === (Array.isArray(t.bookmakerIds) ? t.bookmakerIds[0] : null)) ||
    DBA_BOOKMAKERS[0];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (sizeFilter !== 'all' && t.sizeId !== sizeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (bookmakerFilter !== 'all') {
        const tplBmId = t.bookmakerId
          || (Array.isArray(t.bookmakerIds) ? t.bookmakerIds[0] : null);
        if (tplBmId !== bookmakerFilter) return false;
      }
      if (featureFilter === 'welcome'   && !(t.config?.welcomeOffer?.enabled)) return false;
      if (featureFilter === 'affiliate' && !(t.config?.affiliate?.enabled))    return false;
      if (featureFilter === 'legal'     && !(t.config?.legal?.enabled))        return false;
      if (q && !(t.name.toLowerCase().includes(q) || (t.modifiedBy || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [templates, sizeFilter, statusFilter, bookmakerFilter, featureFilter, search]);

  const activeFilterCount =
    (sizeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) +
    (bookmakerFilter !== 'all' ? 1 : 0) + (featureFilter !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setSearch(''); setSizeFilter('all'); setStatusFilter('all'); setBookmakerFilter('all'); setFeatureFilter('all');
  };

  const handleDuplicate = (tpl) => {
    const copy = {
      ...tpl,
      id: `tpl_${Math.random().toString(36).slice(2, 8)}`,
      name: `${tpl.name} (Copy)`,
      status: 'draft',
      modified: new Date().toISOString(),
      modifiedBy: 'D. Benvelgy',
    };
    setTemplates((ts) => [copy, ...ts]);
    setToast({ kind: 'success', msg: 'Template duplicated as Draft' });
  };

  const handleDelete = () => {
    setTemplates((ts) => ts.filter((t) => t.id !== confirmDelete.id));
    setToast({ kind: 'success', msg: `${confirmDelete.name} deleted` });
    setConfirmDelete(null);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }} spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>DBA Ad Formats</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Customize the creative layout, colors, and copy for each ad size.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={() => navigate('/dba/templates/new')}>
          Create New Format
        </Button>
      </Stack>

      <Stack direction="row" sx={{ mb: 2, gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Search formats…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small"><Select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All sizes</MenuItem>
          <MenuItem value="300x250">MPU · 300×250</MenuItem>
          <MenuItem value="640x1280">Interstitial · 640×1280</MenuItem>
          <MenuItem value="320x50">Banner · 320×50</MenuItem>
        </Select></FormControl>
        <FormControl size="small"><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="live">Live</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
        </Select></FormControl>
        <FormControl size="small"><Select value={bookmakerFilter} onChange={(e) => setBookmakerFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All bookmakers</MenuItem>
          {dbaEnabledBookmakers.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </Select></FormControl>
        <FormControl size="small"><Select value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="all">Any features</MenuItem>
          <MenuItem value="welcome">With welcome offer</MenuItem>
          <MenuItem value="affiliate">With custom affiliate</MenuItem>
          <MenuItem value="legal">With legal disclaimer</MenuItem>
        </Select></FormControl>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={clearAllFilters} startIcon={<CloseIcon fontSize="small" />}>
            Clear {activeFilterCount}
          </Button>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {filtered.length === templates.length ? `${templates.length} formats` : `${filtered.length} of ${templates.length}`}
          </Typography>
          <ToggleButtonGroup
            size="small" value={view} exclusive
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>

      {view === 'grid' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
          {filtered.map((tpl) => {
            const [pw, ph] = SIZE_DIMS[tpl.sizeId] || [300, 250];
            const previewScale = tpl.sizeId === '640x1280' ? 0.14
              : tpl.sizeId === '320x50' ? 0.85
              : 0.7;
            const bm = bmForTemplate(tpl);
            return (
              <Paper key={tpl.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Box sx={{
                  bgcolor: '#F5F5F5', height: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid #E5E5E5', position: 'relative',
                }}>
                  <Box sx={{ width: pw * previewScale, height: ph * previewScale, position: 'relative', overflow: 'hidden' }}>
                    <AdPreview config={tpl.config} sizeId={tpl.sizeId} bookmaker={bm} scale={previewScale} />
                  </Box>
                  <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 0.5, px: 1, py: 0.25, fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>
                    {tpl.size}
                  </Box>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.25 }}>{tpl.name}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
                        <LogoThumb bg={bm.logoBg} fg={bm.logoFg} initials={bm.initials}
                          imageUrl={bookmakerLogoUrl(bm.id, { noBg: !!bm.useNoBgLogo })}
                          size={16} radius={3} />
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.primary' }}>{bm.name}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {relTime(tpl.modified)} · {tpl.modifiedBy}
                      </Typography>
                    </Box>
                    <StatusPill kind={tpl.status === 'live' ? 'live' : 'draft'} label={tpl.status === 'live' ? 'Live' : 'Draft'} />
                  </Stack>
                  <Stack direction="row" spacing={0.75}>
                    <Button variant="outlined" size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => navigate(`/dba/templates/${tpl.id}/edit`)} sx={{ flex: 1 }}>
                      Edit
                    </Button>
                    <Tooltip title="Duplicate">
                      <IconButton size="small" onClick={() => handleDuplicate(tpl)}><ContentCopyIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={tpl.status === 'live' ? 'Move to Draft first' : 'Delete'}>
                      <span>
                        <IconButton size="small" disabled={tpl.status === 'live'} onClick={() => setConfirmDelete(tpl)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Template</TableCell>
                  <TableCell sx={{ width: 180 }}>Bookmaker</TableCell>
                  <TableCell sx={{ width: 140 }}>Size</TableCell>
                  <TableCell sx={{ width: 120 }}>Status</TableCell>
                  <TableCell sx={{ width: 200 }}>Last Modified</TableCell>
                  <TableCell sx={{ width: 140, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((tpl) => {
                  const bm = bmForTemplate(tpl);
                  return (
                  <TableRow key={tpl.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 60, height: 36, borderRadius: 0.75, background: bgCss(tpl.config), border: '1px solid #E5E5E5', flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 500 }}>{tpl.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LogoThumb bg={bm.logoBg} fg={bm.logoFg} initials={bm.initials}
                          imageUrl={bookmakerLogoUrl(bm.id, { noBg: !!bm.useNoBgLogo })}
                          size={24} radius={4} />
                        <Typography sx={{ fontSize: 14 }}>{bm.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><Box component="span" sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{tpl.size}</Box></TableCell>
                    <TableCell><StatusPill kind={tpl.status === 'live' ? 'live' : 'draft'} label={tpl.status === 'live' ? 'Live' : 'Draft'} /></TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{relTime(tpl.modified)}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>by {tpl.modifiedBy}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <IconButton size="small" onClick={() => navigate(`/dba/templates/${tpl.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDuplicate(tpl)}><ContentCopyIcon fontSize="small" /></IconButton>
                      <IconButton size="small" disabled={tpl.status === 'live'} onClick={() => setConfirmDelete(tpl)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete {confirmDelete?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This template will be permanently removed. This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete template</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.kind === 'error' ? 'error' : 'success'} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
