import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, Stack, Chip,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PublicIcon from '@mui/icons-material/Public';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const PLATFORM_COLORS = {
  Android: '#a4c639',
  iOS: '#555',
  Web: '#1976d2',
  All: '#888',
};

function PromotionCard({ promo, countryName, onEdit, onDuplicate, onDelete }) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Colour bar */}
      <Box sx={{ height: 6, bgcolor: promo.pageBgColor || '#000' }} />

      <Box sx={{ p: 2, flex: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600} fontSize="0.95rem" sx={{ flex: 1, mr: 1 }}>
            {promo.name}
          </Typography>
          <Chip
            size="small"
            label={promo.active ? 'Active' : 'Inactive'}
            color={promo.active ? 'success' : 'default'}
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.75} mb={1.5}>
          <Chip
            size="small"
            icon={<PublicIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={countryName || 'All'}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
          <Chip
            size="small"
            icon={<PhoneAndroidIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={promo.platform || 'All'}
            variant="outlined"
            sx={{ fontSize: '0.75rem', color: PLATFORM_COLORS[promo.platform] || '#888' }}
          />
          {promo.lid && (
            <Chip size="small" label={`LID ${promo.lid}`} variant="outlined" sx={{ fontSize: '0.75rem' }} />
          )}
          {promo.lang && (
            <Chip size="small" label={`Lang ${promo.lang}`} variant="outlined" sx={{ fontSize: '0.75rem' }} />
          )}
          {promo.publisher && (
            <Chip size="small" label={promo.publisher} variant="outlined" sx={{ fontSize: '0.75rem' }} />
          )}
          {promo.campaign && (
            <Chip size="small" label={promo.campaign} variant="outlined" sx={{ fontSize: '0.75rem' }} />
          )}
          <Chip size="small" label={`SOV ${promo.sov}%`} variant="outlined" sx={{ fontSize: '0.75rem' }} />
        </Stack>

        <Typography fontSize="0.78rem" color="text.secondary" mb={0.5}>
          {promo.bookies?.length || 0} bookmaker{promo.bookies?.length !== 1 ? 's' : ''}
        </Typography>

        {promo.header?.mainTitle?.text && (
          <Typography
            fontSize="0.78rem"
            color="text.secondary"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            "{promo.header.mainTitle.text}"
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
        <Tooltip title="Duplicate">
          <IconButton size="small" onClick={() => onDuplicate(promo)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(promo)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(promo)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}

export default function BpPromotions() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Filters
  const [filterCid, setFilterCid] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterActive, setFilterActive] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([apiService.getBpPromotions(), apiService.getBpCountries()])
      .then(([promos, cids]) => {
        if (cancelled) return;
        setPromotions(Array.isArray(promos) ? promos : []);
        // Real T_COUNTRIES CIDs, not backend/data/countries.json.
        setCountries(Array.isArray(cids) ? cids : []);
        setLoading(false);
      })
      .catch((err) => { if (!cancelled) { setLoadError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

  const cidOptions = useMemo(() => {
    const set = new Set(promotions.map((p) => p.cid).filter((cid) => cid != null));
    return [...set].sort((a, b) => (countryNameById.get(a) || '').localeCompare(countryNameById.get(b) || ''));
  }, [promotions, countryNameById]);

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      if (filterCid && p.cid !== filterCid) return false;
      if (filterPlatform && p.platform !== filterPlatform) return false;
      if (filterActive === 'active' && !p.active) return false;
      if (filterActive === 'inactive' && p.active) return false;
      return true;
    });
  }, [promotions, filterCid, filterPlatform, filterActive]);

  const handleDuplicate = async (promo) => {
    try {
      const { id: _drop, createdAt: _c, updatedAt: _u, ...rest } = promo;
      const created = await apiService.createBpPromotion({ ...rest, name: `${rest.name} (copy)`, active: false });
      setPromotions((prev) => [created, ...prev]);
      setToast({ kind: 'success', msg: `Duplicated as "${created.name}"` });
    } catch (err) {
      setToast({ kind: 'error', msg: `Duplicate failed: ${err.message}` });
    }
  };

  const handleDeleteConfirm = async () => {
    const promo = confirmDelete;
    setConfirmDelete(null);
    try {
      await apiService.deleteBpPromotion(promo.id);
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
      setToast({ kind: 'success', msg: `"${promo.name}" deleted` });
    } catch (err) {
      setToast({ kind: 'error', msg: `Delete failed: ${err.message}` });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  if (loadError) {
    return <Box sx={{ p: 4 }}><Typography color="error">{loadError}</Typography></Box>;
  }

  const filtersActive = [filterCid !== '', filterPlatform !== '', filterActive !== ''].filter(Boolean).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>BP Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Betting Promotion versions — {filtered.length} of {promotions.length}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/bp/promotions/new')}
        >
          New Promotion
        </Button>
      </Stack>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Geo</InputLabel>
            <Select value={filterCid} label="Geo" onChange={(e) => setFilterCid(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {cidOptions.map((cid) => <MenuItem key={cid} value={cid}>{countryNameById.get(cid) || cid}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Platform</InputLabel>
            <Select value={filterPlatform} label="Platform" onChange={(e) => setFilterPlatform(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {['Android', 'iOS', 'Web'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterActive} label="Status" onChange={(e) => setFilterActive(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          {filtersActive > 0 && (
            <Button size="small" onClick={() => { setFilterCid(''); setFilterPlatform(''); setFilterActive(''); }}>
              Clear filters ({filtersActive})
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" mb={2}>No promotions found.</Typography>
          <Button variant="outlined" onClick={() => navigate('/bp/promotions/new')}>
            Create the first one
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {filtered.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              countryName={promo.cid != null ? countryNameById.get(promo.cid) : null}
              onEdit={() => navigate(`/bp/promotions/${promo.id}/edit`)}
              onDuplicate={handleDuplicate}
              onDelete={setConfirmDelete}
            />
          ))}
        </Box>
      )}

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>This will permanently remove the promotion and all its bookmaker data.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.kind || 'info'} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
