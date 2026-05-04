import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RadarIcon from '@mui/icons-material/Radar';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import api from '../services/api';

const FIELD_LABELS = {
  DESCRIPTION: 'Description',
  DATA_SOURCE_NAME: 'Data Source',
  SPORT: 'Sport',
  ENVIRONMENT: 'Environment',
  SOURCE: 'Message Source',
  HOST_NAME: 'Host Name',
  SCANNER_LOCATION: 'Scanner Location',
  ASPNETCORE_ENV: 'ASPNETCORE Environment',
  SCAN_INTERVAL_SECONDS: 'Scan Interval (s)',
  FULL_SCAN_DAYS: 'Full Scan Days',
  FULL_SCAN_INTERVAL_SECONDS: 'Full Scan Interval (s)',
  REDIS_CONNECTION_STRING: 'Redis Connection String',
};

const EDITABLE_FIELDS = [
  'DESCRIPTION',
  'SCAN_INTERVAL_SECONDS',
  'FULL_SCAN_DAYS',
  'FULL_SCAN_INTERVAL_SECONDS',
  'SCANNER_LOCATION',
  'ASPNETCORE_ENV',
];

const READONLY_FIELDS = ['DATA_SOURCE_NAME', 'SPORT', 'ENVIRONMENT', 'SOURCE', 'HOST_NAME', 'REDIS_CONNECTION_STRING'];

const DETAILS_FIELDS = ['DESCRIPTION', 'DATA_SOURCE_NAME', 'SPORT', 'ENVIRONMENT', 'SOURCE', 'HOST_NAME'];
const CONFIG_FIELDS = ['SCAN_INTERVAL_SECONDS', 'FULL_SCAN_DAYS', 'FULL_SCAN_INTERVAL_SECONDS', 'SCANNER_LOCATION', 'ASPNETCORE_ENV', 'REDIS_CONNECTION_STRING'];

const ACTION_PARAMS = {
  Restart: null,
  ClearQueue: null,
  ScanMatches: { label: 'Date (optional)', placeholder: 'e.g. 2026-05-04' },
  ScanMatchDetails: { label: 'Match ID', placeholder: 'e.g. 12345' },
  ScanAthletes: null,
  ScanCompetitions: null,
  SetGameDetailsScanFrequencyInSeconds: { label: 'Frequency (seconds)', placeholder: 'e.g. 30' },
  SetHomePageTrackingFrequency: { label: 'Frequency', placeholder: 'e.g. 60' },
  SetWhiteListForDetailsScanningByCountryAndCompetition: { label: 'Country ID, Competition ID', placeholder: 'e.g. 1,100' },
};

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ScannerDetailsV2() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scanner, setScanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [imageError, setImageError] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');

  const [action, setAction] = useState('');
  const [param, setParam] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    loadScanner();
    setImageError(false);
  }, [id]);

  useEffect(() => {
    if (scanner) setFormData({ ...scanner });
  }, [scanner]);

  const loadScanner = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScannerById(id);
      setScanner(data);
    } catch (err) {
      setError(err.message || 'Failed to load scanner');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const hasChanges = useMemo(() => {
    if (!scanner) return false;
    return EDITABLE_FIELDS.some((key) => {
      const current = formData[key] ?? scanner[key];
      return JSON.stringify(current) !== JSON.stringify(scanner[key]);
    }) || formData.IS_ACTIVE !== scanner.IS_ACTIVE;
  }, [formData, scanner]);

  const handleSave = async () => {
    if (!scanner) return;
    const changes = {};
    EDITABLE_FIELDS.forEach((key) => {
      const current = formData[key] ?? scanner[key];
      if (JSON.stringify(current) !== JSON.stringify(scanner[key])) changes[key] = current;
    });
    if (formData.IS_ACTIVE !== scanner.IS_ACTIVE) changes.IS_ACTIVE = formData.IS_ACTIVE;
    if (Object.keys(changes).length === 0) return;
    try {
      setLoading(true);
      setError(null);
      await api.updateScannersBulk([{ scannerId: scanner.SCANNER_ID, changes }]);
      await loadScanner();
      setSnackbar({ open: true, severity: 'success', message: 'Saved successfully' });
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSnackbar({ open: true, severity: 'error', message: err.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImageDialog = () => {
    setImageUrlValue(scanner?.SCANNER_IMAGE_URL || '');
    setImageDialogOpen(true);
  };

  const handleSaveImageUrl = async () => {
    if (!scanner) return;
    try {
      setLoading(true);
      setImageError(false);
      await api.updateScannersBulk([{ scannerId: scanner.SCANNER_ID, changes: { SCANNER_IMAGE_URL: imageUrlValue.trim() || null } }]);
      await loadScanner();
      setImageDialogOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save image URL');
    } finally {
      setLoading(false);
    }
  };

  const paramDef = action ? ACTION_PARAMS[action] : null;

  const handleSubmitAction = async () => {
    if (!action) return;
    setActionLoading(true);
    try {
      const result = await api.performScannerAction(scanner.SCANNER_ID, action, paramDef && param ? { value: param } : {});
      setActionHistory((h) => [{ id: Date.now(), action, param: param || '—', at: result.executedAt, result: result.result }, ...h]);
      setParam('');
      setSnackbar({ open: true, severity: 'success', message: `${action} submitted successfully` });
    } catch (err) {
      setSnackbar({ open: true, severity: 'error', message: err.message || 'Action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  function renderField(key) {
    const isReadOnly = READONLY_FIELDS.includes(key);
    const value = formData[key] ?? scanner[key];
    const isNumeric = key === 'SCAN_INTERVAL_SECONDS' || key === 'FULL_SCAN_DAYS' || key === 'FULL_SCAN_INTERVAL_SECONDS';
    const isLong = key === 'REDIS_CONNECTION_STRING' || key === 'DESCRIPTION';
    const rowCount = key === 'DESCRIPTION' ? 4 : key === 'REDIS_CONNECTION_STRING' ? 2 : undefined;
    return (
      <TextField
        key={key}
        fullWidth
        size="small"
        label={FIELD_LABELS[key] ?? key}
        value={value ?? ''}
        onChange={(e) => !isReadOnly && handleFormChange(key, isNumeric ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        disabled={isReadOnly}
        type={isNumeric ? 'number' : 'text'}
        multiline={isLong}
        rows={rowCount}
        sx={{
          '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem', fontFamily: key === 'REDIS_CONNECTION_STRING' ? 'monospace' : 'inherit' },
          '& .MuiInputLabel-root': { fontSize: '0.75rem' },
        }}
      />
    );
  }

  if (loading && !scanner) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && !scanner) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/scanners-v2')} variant="outlined" sx={{ borderColor: '#1976d2', color: '#1976d2', textTransform: 'none' }}>Back to List</Button>
      </Box>
    );
  }

  if (!scanner) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/scanners-v2')} variant="outlined" sx={{ borderColor: '#1976d2', color: '#1976d2', textTransform: 'none', mb: 2 }}>Back to List</Button>
        <Typography color="error">Scanner not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/scanners-v2')}
          variant="outlined"
          sx={{ borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.04)' } }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Scanner – {formData.SCANNER_NAME || scanner.SCANNER_NAME || 'Scanner Details'}
        </Typography>
      </Box>

      {/* ── General Details ── */}
      <Paper sx={{ p: 3, mb: 2, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white' }}>
        <Box
          sx={{
            mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f5f5f5', px: 2, py: 1, mx: -3, mt: -3,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>General Details</Typography>
          <Button
            variant="contained" onClick={handleSave} disabled={!hasChanges}
            sx={{ textTransform: 'none', backgroundColor: '#15803d', color: 'white', px: 3, py: 1, '&:hover': { backgroundColor: '#166534' } }}
          >
            Save & Update In Service
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {/* Image */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 200px' }, minWidth: 0 }}>
            <Paper sx={{ p: 1.25, border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Avatar
                  src={scanner.SCANNER_IMAGE_URL && !imageError ? scanner.SCANNER_IMAGE_URL : null}
                  sx={{ width: 72, height: 72, bgcolor: scanner.SCANNER_IMAGE_URL && !imageError ? 'transparent' : '#f5f5f5', border: '1px solid #e0e0e0' }}
                  onError={() => setImageError(true)}
                >
                  {(!scanner.SCANNER_IMAGE_URL || imageError) && <RadarIcon sx={{ fontSize: 36, color: '#1976d2' }} />}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>Scanner Image</Typography>
              </Box>
              <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={handleOpenImageDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}>
                Upload Image
              </Button>
            </Paper>
          </Box>
          {/* Fields */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {DETAILS_FIELDS.map(renderField)}
            </Box>
          </Box>
          {/* IS_ACTIVE */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minWidth: 0 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!(formData.IS_ACTIVE ?? scanner.IS_ACTIVE)}
                  onChange={(e) => handleFormChange('IS_ACTIVE', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Active</Typography>}
            />
          </Box>
        </Box>
      </Paper>

      {/* ── Actions ── */}
      <Paper sx={{ p: 3, mb: 2, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white' }}>
        <Box sx={{ mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5', px: 2, py: 1, mx: -3, mt: -3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Actions</Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mb: 0.75 }}>Select an action</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <Select value={action} onChange={(e) => { setAction(e.target.value); setParam(''); }} displayEmpty>
                <MenuItem value=""><em>None</em></MenuItem>
                {(scanner.AVAILABLE_ACTIONS || []).map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            {paramDef && (
              <TextField
                fullWidth size="small" label={paramDef.label} placeholder={paramDef.placeholder}
                value={param} onChange={(e) => setParam(e.target.value)} sx={{ mb: 1.5 }}
              />
            )}
            <Button
              variant="contained" fullWidth disabled={!action || actionLoading} onClick={handleSubmitAction}
              startIcon={actionLoading ? <CircularProgress size={13} color="inherit" /> : <PlayArrowIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Submit
            </Button>
          </Grid>
          <Grid item xs={12} md={8}>
            {actionHistory.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 2 }}>
                <Typography variant="body2" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>No actions submitted yet in this session.</Typography>
              </Box>
            ) : (
              <>
                <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mb: 1 }}>Request history (this session)</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Action', 'Param', 'Submitted At', 'Result'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 600, color: '#616161', fontSize: 12, py: 0.75 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {actionHistory.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.action}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#757575' }}>{r.param}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#757575' }}>{formatTs(r.at)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#388e3c' }}>{r.result}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* ── Configurations ── */}
      <Paper sx={{ p: 3, mb: 2, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white' }}>
        <Box
          sx={{
            mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f5f5f5', px: 2, py: 1, mx: -3, mt: -3,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Configurations</Typography>
          <Button
            variant="contained" onClick={handleSave} disabled={!hasChanges}
            sx={{ textTransform: 'none', backgroundColor: '#15803d', color: 'white', px: 3, py: 1, '&:hover': { backgroundColor: '#166534' } }}
          >
            Save & Update In Service
          </Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {CONFIG_FIELDS.map(renderField)}
        </Box>
      </Paper>

      {/* Image dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Edit Image</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label="Image URL" type="url" fullWidth variant="outlined"
            value={imageUrlValue} onChange={(e) => setImageUrlValue(e.target.value)}
            placeholder="https://example.com/image.png" sx={{ mt: 1 }}
            helperText="Enter the URL of the scanner logo/image"
          />
          {imageUrlValue && (
            <Box sx={{ mt: 2, width: '100%', height: 160, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Box component="img" src={imageUrlValue} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveImageUrl} variant="contained" color="primary" disabled={loading}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}>
        <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent><DialogContentText>{confirmDialog.message}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))} sx={{ textTransform: 'none', color: '#424242' }}>Cancel</Button>
          <Button variant="contained" onClick={async () => { setConfirmDialog((d) => ({ ...d, open: false })); await confirmDialog.onConfirm?.(); }} sx={{ textTransform: 'none' }}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
