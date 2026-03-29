import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TranslateIcon from '@mui/icons-material/Translate';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

const GENERAL_DETAILS_FIELD_KEYS = ['code', 'direction', 'fatherLangId'];
const GENERAL_DETAILS_TOGGLE_KEYS = ['isDisplayed', 'isUI'];

const BOOLEAN_KEYS = new Set([
  'isDisplayed', 'isUI', 'isMetricSystem',
]);

const FIELD_LABELS = {
  code: 'Code',
  direction: 'Direction',
  isDisplayed: 'Displayed',
  isUI: 'UI Language',
  fatherLangId: 'Parent Language',
};

function LanguageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allLanguages, setAllLanguages] = useState([]);

  useEffect(() => {
    loadLanguage();
    loadTermsAndCategories();
    loadAllLanguages();
  }, [id]);

  const loadAllLanguages = async () => {
    try {
      const list = await api.getLanguages();
      setAllLanguages(list || []);
    } catch (err) {
      console.warn('Failed to load languages for fatherLangId:', err);
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
    if (language) {
      setFormData({ ...language });
    }
  }, [language]);

  const loadLanguage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLanguageById(id);
      setLanguage(data);
    } catch (err) {
      setError(err.message || 'Failed to load language');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/languages');

  const handleNameClick = async () => {
    if (!language || !language.nameId) return;
    try {
      const term = await api.getTermById(language.nameId);
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
      await loadLanguage();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadLanguage();
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

  const handleSave = async () => {
    if (!language) return;
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      Object.keys(formData).forEach((key) => {
        if (JSON.stringify(formData[key]) !== JSON.stringify(language[key])) {
          changes[key] = formData[key];
        }
      });
      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }
      await api.updateLanguagesBulk([{ languageId: language.id, changes }]);
      await loadLanguage();
    } catch (err) {
      setError(err.message || 'Failed to save language');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { minHeight: 40 },
    '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' },
    '& .MuiInputLabel-root': { fontSize: '0.75rem' },
  };

  const renderField = (key, value) => {
    const isBoolean = BOOLEAN_KEYS.has(key);
    const isReadOnly = key === 'id';
    const label = FIELD_LABELS[key] ?? key;

    if (key === 'fatherLangId') {
      const currentValue = value ?? '';
      return (
        <FormControl key={key} fullWidth size="small" sx={fieldSx}>
          <InputLabel id="fatherLangId-label">{label}</InputLabel>
          <Select
            labelId="fatherLangId-label"
            label={label}
            value={currentValue === null || currentValue === '' ? '' : currentValue}
            onChange={(e) => handleFormChange(key, e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {allLanguages
              .filter((lang) => lang.id !== language?.id)
              .map((lang) => (
                <MenuItem key={lang.id} value={lang.id}>
                  {lang.name || lang.code || `Language ${lang.id}`}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      );
    }

    if (isBoolean) {
      return (
        <FormControlLabel
          key={key}
          control={<Checkbox size="small" checked={!!value} onChange={(e) => handleFormChange(key, e.target.checked)} />}
          label={<Typography variant="body2">{label}</Typography>}
          sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
        />
      );
    }

    const isNum = typeof value === 'number' || (value !== null && value !== undefined && value !== '' && !isNaN(Number(value)));
    return (
      <TextField
        key={key}
        fullWidth
        size="small"
        label={label}
        value={value ?? ''}
        onChange={(e) => handleFormChange(key, isNum ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        disabled={isReadOnly}
        type={isNum ? 'number' : 'text'}
        sx={fieldSx}
      />
    );
  };

  if (loading && !language) {
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

  if (!language) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Language not found" />
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
          Language –{' '}
          <Box
            component="span"
            onClick={language.nameId ? handleNameClick : undefined}
            sx={{
              color: language.nameId ? '#1976d2' : 'inherit',
              cursor: language.nameId ? 'pointer' : 'default',
              textDecoration: language.nameId ? 'underline' : 'none',
              '&:hover': language.nameId ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {formData.name || language.name || 'Language Details'}
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
                <Avatar sx={{ width: 72, height: 72, bgcolor: '#1976d2', border: '1px solid #e0e0e0' }}>
                  <TranslateIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  Language
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Middle: Fields – 5 per row, responsive, uniform height per UI-STANDARDS */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '1 1 0' },
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: { xs: 1.5, md: 1.25 },
              width: '100%',
              alignContent: 'start',
            }}
          >
            {GENERAL_DETAILS_FIELD_KEYS.map((key) => {
              if (!(key in formData) && !(key in language)) return null;
              return (
                <Box key={key} sx={{ minWidth: 0 }}>
                  {renderField(key, formData[key] ?? language[key])}
                </Box>
              );
            })}
          </Box>

          {/* Right: Booleans – same row (Displayed, UI Language) */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 auto' },
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 0.5,
              alignContent: 'start',
              alignItems: 'flex-start',
            }}
          >
            {GENERAL_DETAILS_TOGGLE_KEYS.map((key) => {
              if (!(key in formData) && !(key in language)) return null;
              return (
                <Box key={key}>
                  {renderField(key, formData[key] ?? language[key])}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <TermEditModal
        open={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSaveAndUpdate}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Language names"
      />
    </Box>
  );
}

export default LanguageDetails;
