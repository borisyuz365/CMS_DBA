import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AddIcon from '@mui/icons-material/Add';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import { formatTimeZoneDisplay } from '../utils/formatTimeZone';
import api from '../services/api';

function TimeZoneDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeZone, setTimeZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  // Connected TZDB Time Zones (T_TZDB_TIME_ZONES where CONNECTED_TIME_ZONE = this time zone)
  const [connectedTzdbZones, setConnectedTzdbZones] = useState([]);
  const [tzdbLoading, setTzdbLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [unconnectedTzdbZones, setUnconnectedTzdbZones] = useState([]);
  const [tzdbSearchQuery, setTzdbSearchQuery] = useState('');
  const [selectedTzdbZone, setSelectedTzdbZone] = useState(null);
  const [connectSaving, setConnectSaving] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [zoneToUnlink, setZoneToUnlink] = useState(null);

  useEffect(() => {
    loadTimeZone();
    loadTermsAndCategories();
  }, [id]);

  useEffect(() => {
    if (timeZone && timeZone.TIME_ZONE_ID != null) {
      loadConnectedTzdbZones();
    }
  }, [timeZone?.TIME_ZONE_ID]);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadTermsAndCategories = async () => {
    try {
      const [terms, categories] = await Promise.all([api.getTerms(), api.getCategories()]);
      setAllTerms(terms || []);
      setAllCategories(categories || []);
    } catch (err) {
      console.warn('Failed to load terms/categories:', err);
    }
  };

  useEffect(() => {
    if (timeZone) {
      setFormData({ ...timeZone });
    }
  }, [timeZone]);

  const loadTimeZone = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTimeZoneById(id);
      setTimeZone(data);
    } catch (err) {
      setError(err.message || 'Failed to load time zone');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedTzdbZones = async () => {
    const tzId = timeZone?.TIME_ZONE_ID ?? id;
    if (tzId == null || tzId === '') return;
    try {
      setTzdbLoading(true);
      const data = await api.getTzdbTimeZonesByConnectedId(tzId);
      setConnectedTzdbZones(data || []);
    } catch (err) {
      console.warn('Failed to load connected TZDB zones:', err);
      setConnectedTzdbZones([]);
    } finally {
      setTzdbLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const list = await api.getCountriesList();
      setCountries(list || []);
    } catch (err) {
      console.warn('Failed to load countries:', err);
    }
  };

  const getCountryName = (countryId) => {
    if (countryId == null) return '—';
    const c = countries.find((x) => x.COUNTRY_ID === countryId);
    return c?.name ?? `ID: ${countryId}`;
  };

  const formatCreateTime = (createTime) => {
    if (!createTime) return '—';
    try {
      const d = new Date(createTime);
      return Number.isNaN(d.getTime()) ? createTime : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return createTime;
    }
  };

  const handleConnectNewZone = async () => {
    setSelectedTzdbZone(null);
    setTzdbSearchQuery('');
    try {
      const list = await api.getTzdbTimeZonesUnconnected();
      setUnconnectedTzdbZones(list || []);
    } catch (err) {
      console.warn('Failed to load unconnected TZDB zones:', err);
      setUnconnectedTzdbZones([]);
    }
    setConnectModalOpen(true);
  };

  const handleConnectModalClose = () => {
    setConnectModalOpen(false);
    setSelectedTzdbZone(null);
    setTzdbSearchQuery('');
  };

  const handleConnectModalSave = async () => {
    if (!selectedTzdbZone || !timeZone) return;
    try {
      setConnectSaving(true);
      await api.updateTzdbTimeZoneConnection(selectedTzdbZone.TIME_ZONE_NAME, timeZone.TIME_ZONE_ID);
      await loadConnectedTzdbZones();
      handleConnectModalClose();
    } catch (err) {
      setError(err.message || 'Failed to connect zone');
    } finally {
      setConnectSaving(false);
    }
  };

  const handleUnlinkTzdbClick = (row) => {
    if (!row?.TIME_ZONE_NAME) return;
    setZoneToUnlink(row);
    setUnlinkConfirmOpen(true);
  };

  const handleUnlinkConfirmClose = () => {
    setUnlinkConfirmOpen(false);
    setZoneToUnlink(null);
  };

  const handleUnlinkConfirm = async () => {
    if (!zoneToUnlink?.TIME_ZONE_NAME) return;
    try {
      await api.updateTzdbTimeZoneConnection(zoneToUnlink.TIME_ZONE_NAME, null);
      await loadConnectedTzdbZones();
      handleUnlinkConfirmClose();
    } catch (err) {
      setError(err.message || 'Failed to unlink');
    }
  };

  const handleBack = () => navigate('/time-zones');

  const TERM_CATEGORY_TIME_ZONE_NAMES = 'Time Zone names';

  const handleNameClick = async () => {
    if (!timeZone || !timeZone.NAME_ID) return;
    try {
      const term = await api.getTermById(timeZone.NAME_ID);
      if (term?.category === TERM_CATEGORY_TIME_ZONE_NAMES) {
        setCurrentTerm(term);
        setTermModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load term:', err);
    }
  };

  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadTimeZone();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadTimeZone();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const newCategory = await api.createCategory(categoryData);
      const categories = await api.getCategories();
      setAllCategories(categories);
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      throw err;
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const FIELD_LABELS = { UTC_OFFSET: 'UTC Offset' };

  const handleSave = async () => {
    if (!timeZone) return;
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      Object.keys(formData).forEach((key) => {
        if (JSON.stringify(formData[key]) !== JSON.stringify(timeZone[key])) {
          changes[key] = formData[key];
        }
      });
      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }
      await api.updateTimeZonesBulk([{ timeZoneId: timeZone.TIME_ZONE_ID, changes }]);
      await loadTimeZone();
    } catch (err) {
      setError(err.message || 'Failed to save time zone');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !timeZone) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  if (!timeZone) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Time zone not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' },
          }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Time Zone –{' '}
          <Box
            component="span"
            onClick={timeZone.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: timeZone.NAME_ID ? '#1976d2' : 'inherit',
              cursor: timeZone.NAME_ID ? 'pointer' : 'default',
              textDecoration: timeZone.NAME_ID ? 'underline' : 'none',
              '&:hover': timeZone.NAME_ID ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {formatTimeZoneDisplay(formData) || formatTimeZoneDisplay(timeZone) || 'Time Zone Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – Left Media | Middle: fields (5 per row) – per UI-STANDARDS */}
      <Paper
        sx={{
          p: 3,
          boxShadow: 1,
          border: '1px solid #e0e0e0',
          backgroundColor: 'white',
          mb: 2,
        }}
      >
        <Box
          sx={{
            mb: 2,
            pb: 1,
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f5f5f5',
            px: 2,
            py: 1,
            mx: -3,
            mt: -3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            General Details
          </Typography>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{
              textTransform: 'none',
              backgroundColor: '#15803d',
              color: 'white',
              px: 3,
              py: 1,
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            Save & Update In Service
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {/* Left: Media (compact) – fixed width per UI-STANDARDS */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 200px' }, minWidth: 0 }}>
            <Paper
              sx={{
                p: 1.25,
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: '#1976d2',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  Time Zone
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Middle: Fields – 5 per row (grid) per UI-STANDARDS */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 1.5, width: '100%', alignContent: 'start' }}>
            <Box sx={{ minWidth: 0, width: '50%' }}>
              <TextField
                fullWidth
                size="small"
                label={FIELD_LABELS.UTC_OFFSET ?? 'UTC_OFFSET'}
                type="number"
                inputProps={{ step: 0.5 }}
                value={formData.UTC_OFFSET ?? ''}
                onChange={(e) => handleFormChange('UTC_OFFSET', e.target.value === '' ? null : parseFloat(e.target.value))}
                sx={{
                  '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Connected TZDB Time Zones */}
      <Paper
        sx={{
          p: 3,
          boxShadow: 1,
          border: '1px solid #e0e0e0',
          backgroundColor: 'white',
          mb: 2,
        }}
      >
        <Box
          sx={{
            mb: 2,
            pb: 1,
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f5f5f5',
            px: 2,
            py: 1,
            mx: -3,
            mt: -3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Connected TZDB Time Zones ({connectedTzdbZones.length})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleConnectNewZone}
            sx={{ textTransform: 'none', backgroundColor: '#1976d2' }}
          >
            Connect New Zone
          </Button>
        </Box>
        {tzdbLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <LoadingSpinner />
          </Box>
        ) : connectedTzdbZones.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No connected device time zones.
          </Typography>
        ) : (
          <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', borderColor: '#e0e0e0', fontWeight: 600, py: 1, px: 1.5 } }}>
                  <TableCell>Time Zone Name</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectedTzdbZones.map((row) => (
                  <TableRow key={row.TIME_ZONE_NAME} sx={{ '& td': { borderColor: '#e0e0e0', py: 1, px: 1.5 } }}>
                    <TableCell>{row.TIME_ZONE_NAME ?? '—'}</TableCell>
                    <TableCell>{formatCreateTime(row.CREATE_TIME)}</TableCell>
                    <TableCell>{getCountryName(row.CONNECTED_COUNTRY_ID)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<LinkOffIcon />}
                        onClick={() => handleUnlinkTzdbClick(row)}
                        sx={{ textTransform: 'none', color: '#d32f2f' }}
                      >
                        Unlink
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Unlink confirmation dialog - product design language */}
      <Dialog
        open={unlinkConfirmOpen}
        onClose={handleUnlinkConfirmClose}
        aria-labelledby="unlink-dialog-title"
        aria-describedby="unlink-dialog-description"
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { border: '1px solid #e0e0e0', boxShadow: 1 } }}
      >
        <DialogTitle
          id="unlink-dialog-title"
          sx={{ fontWeight: 600, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5', px: 2, py: 1.5 }}
        >
          Unlink time zone
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, px: 2, pb: 1 }}>
          <DialogContentText id="unlink-dialog-description" sx={{ color: 'text.primary' }}>
            {zoneToUnlink ? (
              <>
                Unlink <strong>{zoneToUnlink.TIME_ZONE_NAME}</strong> from this time zone? This will remove the connection.
              </>
            ) : (
              ''
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', px: 2, py: 1.5, backgroundColor: '#fafafa' }}>
          <Button onClick={handleUnlinkConfirmClose} color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUnlinkConfirm}
            startIcon={<LinkOffIcon />}
            sx={{
              textTransform: 'none',
              backgroundColor: '#d32f2f',
              '&:hover': { backgroundColor: '#b71c1c' },
            }}
          >
            Unlink
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={connectModalOpen} onClose={handleConnectModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>Connect New Zone</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an unconnected TZDB time zone to link to this time zone.
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name (e.g. Africa/Accra)"
            value={tzdbSearchQuery}
            onChange={(e) => setTzdbSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer sx={{ maxHeight: 320, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', borderColor: '#e0e0e0', fontWeight: 600, py: 0.75, px: 1 } }}>
                  <TableCell>Time Zone Name</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {unconnectedTzdbZones
                  .filter((r) => !tzdbSearchQuery.trim() || (r.TIME_ZONE_NAME || '').toLowerCase().includes(tzdbSearchQuery.trim().toLowerCase()))
                  .slice(0, 100)
                  .map((row) => (
                    <TableRow
                      key={row.TIME_ZONE_NAME}
                      selected={selectedTzdbZone?.TIME_ZONE_NAME === row.TIME_ZONE_NAME}
                      onClick={() => setSelectedTzdbZone(row)}
                      sx={{ cursor: 'pointer', '& td': { borderColor: '#e0e0e0', py: 0.75, px: 1 } }}
                    >
                      <TableCell>{row.TIME_ZONE_NAME ?? '—'}</TableCell>
                      <TableCell padding="checkbox">
                        {selectedTzdbZone?.TIME_ZONE_NAME === row.TIME_ZONE_NAME ? '✓' : ''}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          {unconnectedTzdbZones.filter((r) => !tzdbSearchQuery.trim() || (r.TIME_ZONE_NAME || '').toLowerCase().includes(tzdbSearchQuery.trim().toLowerCase())).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {unconnectedTzdbZones.length === 0 ? 'No unconnected zones available.' : 'No matches for your search.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConnectModalClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConnectModalSave}
            disabled={connectSaving || !selectedTzdbZone}
            sx={{ backgroundColor: '#1976d2' }}
          >
            {connectSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <TermEditModal
        open={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSaveAndUpdate}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Time Zone names"
      />
    </Box>
  );
}

export default TimeZoneDetails;
