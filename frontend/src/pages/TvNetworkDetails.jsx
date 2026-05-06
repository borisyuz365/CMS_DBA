import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function TvNetworkDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [tvNetworkTypes, setTvNetworkTypes] = useState([]);
  const [formData, setFormData] = useState({
    COUNTRY_ID: null,
    WEBSITE: '',
    CHANNEL_TYPE: '',
    LANG_ID: '',
    IS_INTERNATIONAL: false,
    ORDER_LEVEL: '',
    PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: false,
    NETWORK_IMAGE_URL: '',
  });
  const [relatedCountryIds, setRelatedCountryIds] = useState([]);

  const [networkImageError, setNetworkImageError] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadNetwork();
    loadCountries();
    loadLanguages();
    loadTermsAndCategories();
    loadTvNetworkTypes();
  }, [id]);

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
    if (network) {
      const countryId = Array.isArray(network.COUNTRY_IDS) && network.COUNTRY_IDS.length > 0
        ? network.COUNTRY_IDS[0]
        : (network.COUNTRY_ID ?? null);
      setFormData({
        COUNTRY_ID: countryId,
        WEBSITE: network.WEBSITE ?? '',
        CHANNEL_TYPE: network.CHANNEL_TYPE ?? '',
        LANG_ID: network.LANG_ID ?? '',
        IS_INTERNATIONAL: network.IS_INTERNATIONAL ?? false,
        ORDER_LEVEL: network.ORDER_LEVEL ?? '',
        PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: network.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION ?? false,
        NETWORK_IMAGE_URL: network.NETWORK_IMAGE_URL ?? '',
      });
      setRelatedCountryIds((network.relatedCountries || []).map(c => c.COUNTRY_ID));
      setNetworkImageError(false);
    }
  }, [network]);

  const loadCountries = async () => {
    try {
      const data = await api.getCountries();
      setCountries(data || []);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const loadLanguages = async () => {
    try {
      const data = await api.getLanguages();
      setLanguages((data || []).filter((l) => l.isDisplayed));
    } catch (err) {
      console.error('Failed to load languages:', err);
    }
  };

  const loadTvNetworkTypes = async () => {
    try {
      const data = await api.getTvNetworkTypes();
      setTvNetworkTypes(data || []);
    } catch (err) {
      console.warn('Failed to load TV network types:', err);
    }
  };

  const loadNetwork = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTvNetworkById(id);
      setNetwork(data);
    } catch (err) {
      setError(err.message || 'Failed to load TV channel');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/tv-channels');
  };

  const handleNameClick = async () => {
    if (!network || !network.NAME_ID) return;
    try {
      const term = await api.getTermById(network.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setError('Failed to load term for editing');
    }
  };

  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadNetwork();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadNetwork();
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

  const handleOpenImageDialog = () => {
    setImageUrlValue(network?.NETWORK_IMAGE_URL || '');
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setImageUrlValue('');
  };

  const handleSaveImageUrl = async () => {
    if (!network) return;
    try {
      setLoading(true);
      setError(null);
      setNetworkImageError(false);
      await api.updateTvNetworksBulk([{ tvNetworkId: network.TV_NETWORK_ID, changes: { NETWORK_IMAGE_URL: imageUrlValue.trim() || null } }]);
      await loadNetwork();
      handleCloseImageDialog();
    } catch (err) {
      console.error('Failed to save image URL:', err);
      setError(err.message || 'Failed to save image URL');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const FIELD_LABELS = {
    COUNTRY_ID: 'Country',
    WEBSITE: 'Website',
    CHANNEL_TYPE: 'Channel Type',
    LANG_ID: 'Language',
    IS_INTERNATIONAL: 'International',
    ORDER_LEVEL: 'Order Level',
    PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: 'Promote in match reminder notification',
  };

  const handleSave = async () => {
    if (!network) return;
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      const originalCountryId = Array.isArray(network.COUNTRY_IDS) && network.COUNTRY_IDS.length > 0
        ? network.COUNTRY_IDS[0]
        : (network.COUNTRY_ID ?? null);
      if (formData.COUNTRY_ID !== originalCountryId) {
        changes.COUNTRY_IDS = formData.COUNTRY_ID ? [formData.COUNTRY_ID] : [];
      }
      if (formData.WEBSITE !== undefined && (formData.WEBSITE ?? '') !== (network.WEBSITE ?? '')) {
        changes.WEBSITE = formData.WEBSITE?.trim() || null;
      }
      if (formData.CHANNEL_TYPE !== undefined) {
        const v = formData.CHANNEL_TYPE === '' || formData.CHANNEL_TYPE == null ? null : parseInt(formData.CHANNEL_TYPE, 10);
        if (v !== (network.CHANNEL_TYPE ?? null)) changes.CHANNEL_TYPE = v;
      }
      if (formData.LANG_ID !== undefined) {
        const v = formData.LANG_ID === '' || formData.LANG_ID == null ? null : parseInt(formData.LANG_ID, 10);
        if (v !== (network.LANG_ID ?? null)) changes.LANG_ID = v;
      }
      if (formData.IS_INTERNATIONAL !== undefined && !!formData.IS_INTERNATIONAL !== !!network.IS_INTERNATIONAL) {
        changes.IS_INTERNATIONAL = formData.IS_INTERNATIONAL || false;
      }
      if (formData.ORDER_LEVEL !== undefined) {
        const v = formData.ORDER_LEVEL === '' || formData.ORDER_LEVEL == null ? null : parseInt(formData.ORDER_LEVEL, 10);
        if (v !== (network.ORDER_LEVEL ?? null)) changes.ORDER_LEVEL = v;
      }
      if (formData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION !== undefined && !!formData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION !== !!network.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION) {
        changes.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION = formData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION || false;
      }
      const newImageUrl = formData.NETWORK_IMAGE_URL?.trim() || null;
      if (formData.NETWORK_IMAGE_URL !== undefined && newImageUrl !== (network.NETWORK_IMAGE_URL ?? null)) {
        changes.NETWORK_IMAGE_URL = newImageUrl;
      }
      const originalRelatedIds = (network.relatedCountries || []).map(c => c.COUNTRY_ID).sort().join(',');
      const currentRelatedIds = [...relatedCountryIds].sort().join(',');
      const relatedChanged = originalRelatedIds !== currentRelatedIds;

      if (Object.keys(changes).length === 0 && !relatedChanged) {
        setLoading(false);
        return;
      }
      if (Object.keys(changes).length > 0) {
        await api.updateTvNetworksBulk([{ tvNetworkId: network.TV_NETWORK_ID, changes }]);
      }
      if (relatedChanged) {
        await api.updateTvNetworkRelatedCountries(network.TV_NETWORK_ID, relatedCountryIds);
      }
      await loadNetwork();
    } catch (err) {
      setError(err.message || 'Failed to save TV channel');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !network) {
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
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  if (!network) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="TV channel not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
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
            '&:hover': {
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          TV Channel –{' '}
          <Box
            component="span"
            onClick={network.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: '#1976d2',
              cursor: network.NAME_ID ? 'pointer' : 'default',
              textDecoration: network.NAME_ID ? 'underline' : 'none',
              '&:hover': network.NAME_ID ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {network.name || 'TV Channel Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – Left Media | Middle: fields (5 per row) | Right: Booleans – per UI-STANDARDS */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
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
                  src={(formData.NETWORK_IMAGE_URL || network?.NETWORK_IMAGE_URL) && !networkImageError ? (formData.NETWORK_IMAGE_URL || network?.NETWORK_IMAGE_URL) : null}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: ((formData.NETWORK_IMAGE_URL || network?.NETWORK_IMAGE_URL) && !networkImageError) ? 'transparent' : '#1976d2',
                    border: '1px solid #e0e0e0',
                  }}
                  onError={() => setNetworkImageError(true)}
                >
                  {(!(formData.NETWORK_IMAGE_URL || network?.NETWORK_IMAGE_URL) || networkImageError) && (
                    <LiveTvIcon sx={{ fontSize: 36, color: 'white' }} />
                  )}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  TV Channel Image
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={handleOpenImageDialog}
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Upload Image
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields – 5 per row, responsive, uniform height per UI-STANDARDS */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: { xs: 1.5, md: 1.25 }, width: '100%', alignContent: 'start' }}>
            <Box sx={{ minWidth: 0 }}>
              <Autocomplete
                options={countries}
                getOptionLabel={(option) => (option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || '')}
                value={countries.find((c) => c.COUNTRY_ID === formData.COUNTRY_ID) || null}
                onChange={(e, newValue) => handleFormChange('COUNTRY_ID', newValue ? newValue.COUNTRY_ID : null)}
                isOptionEqualToValue={(option, value) => Number(option?.COUNTRY_ID) === Number(value?.COUNTRY_ID)}
                ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                renderInput={(params) => (
                  <TextField {...params} label={FIELD_LABELS.COUNTRY_ID} size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }} />
                )}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
              />
            </Box>
            <Box sx={{ minWidth: 0, gridColumn: { xs: '1', md: 'span 2' } }}>
              <Autocomplete
                multiple
                options={countries}
                getOptionLabel={(option) => (option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || '')}
                value={countries.filter((c) => relatedCountryIds.includes(c.COUNTRY_ID))}
                onChange={(e, newValue) => setRelatedCountryIds(newValue.map((c) => c.COUNTRY_ID))}
                isOptionEqualToValue={(option, value) => Number(option?.COUNTRY_ID) === Number(value?.COUNTRY_ID)}
                ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                renderInput={(params) => (
                  <TextField {...params} label="Related Countries" size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }} />
                )}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
              />
            </Box>
            <Box sx={{ minWidth: 0, gridColumn: { xs: '1', md: 'span 1' } }}>
              <TextField
                fullWidth
                size="small"
                label={FIELD_LABELS.WEBSITE}
                value={formData.WEBSITE || ''}
                onChange={(e) => handleFormChange('WEBSITE', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.75rem' }}>{FIELD_LABELS.CHANNEL_TYPE}</InputLabel>
                <Select
                  value={formData.CHANNEL_TYPE ?? ''}
                  label={FIELD_LABELS.CHANNEL_TYPE}
                  onChange={(e) => handleFormChange('CHANNEL_TYPE', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  sx={{ minHeight: 40, fontSize: '0.8rem' }}
                >
                  <MenuItem value="">None</MenuItem>
                  {tvNetworkTypes.map((t) => (
                    <MenuItem key={t.ID} value={t.ID}>{t.NAME}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.75rem' }}>{FIELD_LABELS.LANG_ID}</InputLabel>
                <Select
                  value={formData.LANG_ID ?? ''}
                  label={FIELD_LABELS.LANG_ID}
                  onChange={(e) => handleFormChange('LANG_ID', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  sx={{ minHeight: 40, fontSize: '0.8rem' }}
                >
                  <MenuItem value="">None</MenuItem>
                  {languages.map((lang) => (
                    <MenuItem key={lang.id} value={lang.id}>{lang.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={FIELD_LABELS.ORDER_LEVEL}
                value={formData.ORDER_LEVEL ?? ''}
                onChange={(e) => handleFormChange('ORDER_LEVEL', e.target.value ? parseInt(e.target.value, 10) : '')}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
          </Box>

          {/* Right: Booleans – per UI-STANDARDS, gap 0.5 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minWidth: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr' }, gap: 0.5, alignContent: 'start', alignItems: 'flex-start' }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!formData.IS_INTERNATIONAL}
                  onChange={(e) => handleFormChange('IS_INTERNATIONAL', e.target.checked)}
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.IS_INTERNATIONAL}</Typography>}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!formData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION}
                  onChange={(e) => handleFormChange('PROMOTE_IN_MATCH_REMINDER_NOTIFICATION', e.target.checked)}
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION}</Typography>}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Image Edit Dialog */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Edit Image</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Image URL"
            type="url"
            fullWidth
            variant="outlined"
            value={imageUrlValue}
            onChange={(e) => setImageUrlValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            sx={{ mt: 1 }}
            helperText="Enter the URL of the TV channel logo/image"
          />
          {imageUrlValue && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Preview:</Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={imageUrlValue}
                  alt="Preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog} color="inherit">Cancel</Button>
          <Button onClick={handleSaveImageUrl} variant="contained" color="primary" disabled={loading}>Save</Button>
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
        initialCategory="TV Channels"
      />
    </Box>
  );
}

export default TvNetworkDetails;
