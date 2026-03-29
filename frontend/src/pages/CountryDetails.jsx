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
  FormControlLabel,
  Checkbox,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicIcon from '@mui/icons-material/Public';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import { formatTimeZoneDisplay } from '../utils/formatTimeZone';
import api from '../services/api';

// General Details fields: row1 = code, parent, phone; row2 = currency, main color, secondary color; row3 = time zone. EMOJI removed.
const GENERAL_DETAILS_FIELD_KEYS = [
  'COUNTRY_CODE', 'FATHER_COUNTRY_ID', 'PHONE_CODE',
  'CURRENCY_SYMBOL', 'MAIN_COLOR', 'SECONDARY_COLOR',
  'TIME_ZONE_ID',
];
const GENERAL_DETAILS_TOGGLE_KEYS = [
  'ALLOW_BETTING', 'IS_NOT_REAL', 'ALLOW_PREMIUM_INSIGHTS', 'ALLOW_BETS_IN_ALL_SCORES',
  'LOGIN_AVAILABLE', 'BLOCK_LIVE_BETTING', 'ALLOW_PREMIUM_USERS',
];

const BOOLEAN_KEYS = new Set([
  'IS_NOT_REAL', 'ALLOW_BETTING', 'CONNECT_BY_TEXT', 'ALLOW_PREMIUM_INSIGHTS', 'ALLOW_BETS_IN_ALL_SCORES',
  'LOGIN_AVAILABLE', 'BLOCK_LIVE_BETTING', 'ALLOW_PREMIUM_USERS',
]);

const COLOR_KEYS = new Set(['MAIN_COLOR', 'SECONDARY_COLOR']);

const FIELD_LABELS = {
  COUNTRY_CODE: 'Country Code',
  TIME_ZONE_ID: 'Time Zone',
  FATHER_COUNTRY_ID: 'Parent Country',
  PHONE_CODE: 'Phone Code',
  EMOJI: 'Emoji',
  CURRENCY_SYMBOL: 'Currency',
  MAIN_COLOR: 'Main Color',
  SECONDARY_COLOR: 'Secondary Color',
  ALLOW_BETTING: 'Allow Betting',
  IS_NOT_REAL: 'Virtual / Not Real Country',
  ALLOW_PREMIUM_INSIGHTS: 'Allow Premium Insights',
  ALLOW_BETS_IN_ALL_SCORES: 'Allow Bets in All Scores',
  LOGIN_AVAILABLE: 'Login Available',
  BLOCK_LIVE_BETTING: 'Block Live Betting',
  ALLOW_PREMIUM_USERS: 'Allow Premium Users',
};

const getFieldLabel = (key) => FIELD_LABELS[key] ?? key;

function CountryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCountries, setAllCountries] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    NAME_ID: '',
    COUNTRY_CODE: '',
    TIME_ZONE_ID: 1,
    FATHER_COUNTRY_ID: null,
    IS_NOT_REAL: false,
    ALLOW_BETTING: true,
    EMOJI: '',
    CONNECT_BY_TEXT: false,
    ALLOW_PREMIUM_INSIGHTS: true,
    TRANSFER_SEASON_ACTIVE: null,
    PHONE_CODE: null,
    ALLOW_BETS_IN_ALL_SCORES: true,
    LOGIN_AVAILABLE: true,
    MAIN_COLOR: '#000000',
    SECONDARY_COLOR: '#ffffff',
    IMG_VER: 1,
    PLATFORM: null,
    FORCE_RAFFLE_TOP_BOOKMAKER: null,
    ALLOW_SUB_TERRITORY_DETECTION: null,
    ODDS_TYPE: 2,
    TYPE: null,
    CONTINENT_ID: null,
    BLOCK_LIVE_BETTING: false,
    CURRENCY_SYMBOL: null,
    ALLOW_PREMIUM_USERS: null,
    MIN_USERS_FOR_MOST_POPULAR_BET: 100,
    MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: 50,
    LINEUPS_BET_VALUE: null,
    BET_VALUE: null,
    COUNTRY_IMAGE_URL: null,
  });

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [timeZones, setTimeZones] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [countryImageError, setCountryImageError] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');

  const numberToHex = (num) => {
    if (num === null || num === undefined) return null;
    return `#${Number(num).toString(16).padStart(6, '0').toUpperCase()}`;
  };
  const hexToNumber = (hex) => {
    if (!hex || !String(hex).startsWith('#')) return null;
    return parseInt(String(hex).replace('#', ''), 16);
  };

  useEffect(() => {
    loadCountry();
    loadAllCountries();
    loadTermsAndCategories();
    loadTimeZones();
    loadCurrencies();
    setCountryImageError(false);
  }, [id]);

  const loadTimeZones = async () => {
    try {
      const list = await api.getTimeZonesList();
      setTimeZones(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load time zones:', err);
    }
  };

  const loadCurrencies = async () => {
    try {
      const list = await api.getCurrencies();
      setCurrencies(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load currencies:', err);
    }
  };

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
    if (country) {
      setFormData({
        name: country.name ?? '',
        NAME_ID: country.NAME_ID ?? '',
        COUNTRY_CODE: country.COUNTRY_CODE ?? '',
        TIME_ZONE_ID: country.TIME_ZONE_ID ?? 1,
        FATHER_COUNTRY_ID: country.FATHER_COUNTRY_ID ?? null,
        IS_NOT_REAL: country.IS_NOT_REAL ?? false,
        ALLOW_BETTING: country.ALLOW_BETTING ?? true,
        EMOJI: country.EMOJI ?? '',
        CONNECT_BY_TEXT: country.CONNECT_BY_TEXT ?? false,
        ALLOW_PREMIUM_INSIGHTS: country.ALLOW_PREMIUM_INSIGHTS ?? true,
        TRANSFER_SEASON_ACTIVE: country.TRANSFER_SEASON_ACTIVE ?? null,
        PHONE_CODE: country.PHONE_CODE ?? null,
        ALLOW_BETS_IN_ALL_SCORES: country.ALLOW_BETS_IN_ALL_SCORES ?? true,
        LOGIN_AVAILABLE: country.LOGIN_AVAILABLE ?? true,
        MAIN_COLOR: numberToHex(country.MAIN_COLOR ?? 0) || '#000000',
        SECONDARY_COLOR: numberToHex(country.SECONDARY_COLOR ?? 0) || '#ffffff',
        IMG_VER: country.IMG_VER ?? 1,
        PLATFORM: country.PLATFORM ?? null,
        FORCE_RAFFLE_TOP_BOOKMAKER: country.FORCE_RAFFLE_TOP_BOOKMAKER ?? null,
        ALLOW_SUB_TERRITORY_DETECTION: country.ALLOW_SUB_TERRITORY_DETECTION ?? null,
        ODDS_TYPE: country.ODDS_TYPE ?? 2,
        TYPE: country.TYPE ?? null,
        CONTINENT_ID: country.CONTINENT_ID ?? null,
        BLOCK_LIVE_BETTING: country.BLOCK_LIVE_BETTING ?? false,
        CURRENCY_SYMBOL: country.CURRENCY_SYMBOL ?? null,
        ALLOW_PREMIUM_USERS: country.ALLOW_PREMIUM_USERS ?? null,
        MIN_USERS_FOR_MOST_POPULAR_BET: country.MIN_USERS_FOR_MOST_POPULAR_BET ?? 100,
        MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: country.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS ?? 50,
        LINEUPS_BET_VALUE: country.LINEUPS_BET_VALUE ?? null,
        BET_VALUE: country.BET_VALUE ?? null,
        COUNTRY_IMAGE_URL: country.COUNTRY_IMAGE_URL ?? null,
      });
    }
  }, [country]);

  const loadCountry = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCountryById(id);
      setCountry(data);
    } catch (err) {
      setError(err.message || 'Failed to load country');
      setCountry(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCountries = async () => {
    try {
      const data = await api.getCountries();
      setAllCountries(Array.isArray(data) ? data : []);
    } catch (_) {
      setAllCountries([]);
    }
  };

  const handleBack = () => navigate('/countries');

  const handleNameClick = async () => {
    if (!country || !country.NAME_ID) return;
    try {
      const term = await api.getTermById(country.NAME_ID);
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
      await loadCountry();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadCountry();
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
    setImageUrlValue(country?.COUNTRY_IMAGE_URL || '');
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setImageUrlValue('');
  };

  const handleSaveImageUrl = async () => {
    if (!country) return;
    try {
      setLoading(true);
      setError(null);
      setCountryImageError(false);
      await api.updateCountriesBulk([{ countryId: country.COUNTRY_ID, changes: { COUNTRY_IMAGE_URL: imageUrlValue.trim() || null } }]);
      await loadCountry();
      handleCloseImageDialog();
    } catch (err) {
      console.error('Failed to save image URL:', err);
      setError(err.message || 'Failed to save image URL');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!country) return;
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      const stringOrNull = (v) => (v === '' || v === null || v === undefined ? null : v);
      const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : (isNaN(Number(v)) ? null : Number(v)));
      const bool = (v) => v === true || v === 'true' || v === 1;

      if (formData.name !== country.name) changes.name = stringOrNull(formData.name);
      if (formData.COUNTRY_CODE !== country.COUNTRY_CODE) changes.COUNTRY_CODE = stringOrNull(formData.COUNTRY_CODE);
      if (formData.TIME_ZONE_ID !== country.TIME_ZONE_ID) changes.TIME_ZONE_ID = numOrNull(formData.TIME_ZONE_ID);
      if (formData.FATHER_COUNTRY_ID !== country.FATHER_COUNTRY_ID) changes.FATHER_COUNTRY_ID = numOrNull(formData.FATHER_COUNTRY_ID);
      if (formData.IS_NOT_REAL !== country.IS_NOT_REAL) changes.IS_NOT_REAL = bool(formData.IS_NOT_REAL);
      if (formData.ALLOW_BETTING !== country.ALLOW_BETTING) changes.ALLOW_BETTING = bool(formData.ALLOW_BETTING);
      if (formData.EMOJI !== country.EMOJI) changes.EMOJI = stringOrNull(formData.EMOJI);
      if (formData.CONNECT_BY_TEXT !== country.CONNECT_BY_TEXT) changes.CONNECT_BY_TEXT = bool(formData.CONNECT_BY_TEXT);
      if (formData.ALLOW_PREMIUM_INSIGHTS !== country.ALLOW_PREMIUM_INSIGHTS) changes.ALLOW_PREMIUM_INSIGHTS = bool(formData.ALLOW_PREMIUM_INSIGHTS);
      if (formData.PHONE_CODE !== country.PHONE_CODE) changes.PHONE_CODE = stringOrNull(formData.PHONE_CODE);
      if (formData.ALLOW_BETS_IN_ALL_SCORES !== country.ALLOW_BETS_IN_ALL_SCORES) changes.ALLOW_BETS_IN_ALL_SCORES = bool(formData.ALLOW_BETS_IN_ALL_SCORES);
      if (formData.LOGIN_AVAILABLE !== country.LOGIN_AVAILABLE) changes.LOGIN_AVAILABLE = bool(formData.LOGIN_AVAILABLE);
      const mainNum = hexToNumber(formData.MAIN_COLOR);
      const secNum = hexToNumber(formData.SECONDARY_COLOR);
      if (mainNum !== (country.MAIN_COLOR ?? null)) changes.MAIN_COLOR = mainNum;
      if (secNum !== (country.SECONDARY_COLOR ?? null)) changes.SECONDARY_COLOR = secNum;
      if (formData.IMG_VER !== country.IMG_VER) changes.IMG_VER = numOrNull(formData.IMG_VER);
      if (formData.ODDS_TYPE !== country.ODDS_TYPE) changes.ODDS_TYPE = numOrNull(formData.ODDS_TYPE);
      if (formData.CONTINENT_ID !== country.CONTINENT_ID) changes.CONTINENT_ID = numOrNull(formData.CONTINENT_ID);
      if (formData.BLOCK_LIVE_BETTING !== country.BLOCK_LIVE_BETTING) changes.BLOCK_LIVE_BETTING = bool(formData.BLOCK_LIVE_BETTING);
      if (formData.CURRENCY_SYMBOL !== country.CURRENCY_SYMBOL) changes.CURRENCY_SYMBOL = stringOrNull(formData.CURRENCY_SYMBOL);
      if (formData.MIN_USERS_FOR_MOST_POPULAR_BET !== country.MIN_USERS_FOR_MOST_POPULAR_BET) changes.MIN_USERS_FOR_MOST_POPULAR_BET = numOrNull(formData.MIN_USERS_FOR_MOST_POPULAR_BET);
      if (formData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS !== country.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS) changes.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS = numOrNull(formData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS);
      if (formData.LINEUPS_BET_VALUE !== country.LINEUPS_BET_VALUE) changes.LINEUPS_BET_VALUE = numOrNull(formData.LINEUPS_BET_VALUE);
      if (formData.BET_VALUE !== country.BET_VALUE) changes.BET_VALUE = numOrNull(formData.BET_VALUE);
      if (formData.COUNTRY_IMAGE_URL !== country.COUNTRY_IMAGE_URL) changes.COUNTRY_IMAGE_URL = stringOrNull(formData.COUNTRY_IMAGE_URL);

      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }

      await api.updateCountriesBulk([{ countryId: country.COUNTRY_ID, changes }]);
      await loadCountry();
    } catch (err) {
      setError(err.message || 'Failed to save country');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !country) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }
  if (error && !country) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }
  if (!country) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Country not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  const inputSx = { '& .MuiOutlinedInput-input': { py: 1 }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } };

  const renderField = (key, value) => {
    if (BOOLEAN_KEYS.has(key)) {
      return (
        <FormControlLabel
          control={<Checkbox size="small" checked={!!formData[key]} onChange={(e) => handleFormChange(key, e.target.checked)} />}
          label={<Typography variant="body2">{getFieldLabel(key)}</Typography>}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
        />
      );
    }
    if (COLOR_KEYS.has(key)) {
      const defaultColor = key === 'SECONDARY_COLOR' ? '#ffffff' : '#000000';
      return (
        <TextField
          fullWidth
          size="small"
          type="color"
          label={getFieldLabel(key)}
          value={formData[key] || defaultColor}
          onChange={(e) => handleFormChange(key, e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ ...inputSx, '& .MuiOutlinedInput-input': { py: 1, height: 24, minHeight: 24 } }}
        />
      );
    }
    if (key === 'FATHER_COUNTRY_ID') {
      return (
        <FormControl fullWidth size="small" sx={inputSx}>
          <InputLabel>{getFieldLabel(key)}</InputLabel>
          <Select
            value={formData.FATHER_COUNTRY_ID ?? ''}
            label={getFieldLabel(key)}
            onChange={(e) => handleFormChange('FATHER_COUNTRY_ID', e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">None</MenuItem>
            {allCountries.filter((c) => c.COUNTRY_ID !== country.COUNTRY_ID).map((c) => (
              <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>{c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (key === 'TIME_ZONE_ID') {
      return (
        <FormControl fullWidth size="small" sx={inputSx}>
          <InputLabel>{getFieldLabel(key)}</InputLabel>
          <Select
            value={formData.TIME_ZONE_ID ?? ''}
            label={getFieldLabel(key)}
            onChange={(e) => handleFormChange('TIME_ZONE_ID', e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">—</MenuItem>
            {timeZones.map((tz) => (
              <MenuItem key={tz.TIME_ZONE_ID} value={tz.TIME_ZONE_ID}>
                {formatTimeZoneDisplay(tz)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (key === 'CURRENCY_SYMBOL') {
      return (
        <FormControl fullWidth size="small" sx={inputSx}>
          <InputLabel>{getFieldLabel(key)}</InputLabel>
          <Select
            value={formData.CURRENCY_SYMBOL ?? ''}
            label={getFieldLabel(key)}
            onChange={(e) => handleFormChange('CURRENCY_SYMBOL', e.target.value === '' ? null : e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            {currencies.map((c) => (
              <MenuItem key={c.CURRENCY_ID} value={c.SYMBOL ?? ''}>
                {c.SYMBOL ? `${c.SYMBOL} – ${c.name || c.CURRENCY_CODE}` : (c.name || c.CURRENCY_CODE)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    const isNum = typeof value === 'number' || (value != null && value !== '' && !isNaN(Number(value)));
    return (
      <TextField
        fullWidth
        size="small"
        label={getFieldLabel(key)}
        value={formData[key] ?? ''}
        onChange={(e) => handleFormChange(key, isNum ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        type={isNum ? 'number' : 'text'}
        placeholder={key === 'EMOJI' ? '🇺🇸' : undefined}
        sx={inputSx}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      {/* Header – same style as SportDetails */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{ borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' } }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Country –{' '}
          <Box
            component="span"
            onClick={country.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: '#1976d2',
              cursor: country.NAME_ID ? 'pointer' : 'default',
              textDecoration: country.NAME_ID ? 'underline' : 'none',
              '&:hover': country.NAME_ID ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {country.EMOJI && <span>{country.EMOJI} </span>}
            {country.name || formData.name || 'Country Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – Left Media | Middle: one column of fields | Right: Booleans (same standard as SportDetails) */}
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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>General Details</Typography>
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
          {/* Left: Media (compact) – same as SportDetails */}
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
                  src={country.COUNTRY_IMAGE_URL && !countryImageError ? country.COUNTRY_IMAGE_URL : null}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: country.COUNTRY_IMAGE_URL && !countryImageError ? 'transparent' : '#f5f5f5',
                    border: '1px solid #e0e0e0',
                  }}
                  onError={() => setCountryImageError(true)}
                >
                  {(!country.COUNTRY_IMAGE_URL || countryImageError) && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {(formData.EMOJI || country.EMOJI || '🏳️').charAt(0)}
                    </Typography>
                  )}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>Country Image</Typography>
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
              <Button variant="contained" fullWidth size="small" sx={{ backgroundColor: '#1976d2', textTransform: 'none', py: 0.5 }}>
                Image Version ({country.IMG_VER ?? 1})
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields – 3 columns (area 2); TIME_ZONE spans full width */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 1 auto' }, minWidth: 0, maxWidth: { md: 480 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, width: '100%' }}>
              {GENERAL_DETAILS_FIELD_KEYS.map((key) => (
                <Box key={key} sx={{ minWidth: 0, ...(key === 'TIME_ZONE_ID' ? { gridColumn: { md: '1 / -1' } } : {}) }}>
                  {renderField(key, formData[key] ?? country[key])}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right: Booleans – 4 per row, gap 0.5 */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '1 1 0' },
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 0.5,
              alignContent: 'start',
              alignItems: { xs: 'stretch', md: 'flex-start' },
            }}
          >
            {GENERAL_DETAILS_TOGGLE_KEYS.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    size="small"
                    checked={!!(formData[key] ?? country[key])}
                    onChange={(e) => handleFormChange(key, e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{getFieldLabel(key)}</Typography>}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Image Edit Dialog */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Edit Image</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Image URL" type="url" fullWidth variant="outlined" value={imageUrlValue} onChange={(e) => setImageUrlValue(e.target.value)} placeholder="https://example.com/image.jpg" sx={{ mt: 1 }} helperText="Enter the URL of the country flag/image" />
          {imageUrlValue && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Preview:</Typography>
              <Box sx={{ width: '100%', height: 200, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Box component="img" src={imageUrlValue} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
        initialCategory="Countries names"
      />
    </Box>
  );
}

export default CountryDetails;
