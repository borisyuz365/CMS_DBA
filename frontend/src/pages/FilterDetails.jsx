import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Snackbar,
  Alert as MuiAlert,
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

const ENTITY_TYPES = [
  { value: 5, label: 'Game' },
  { value: 6, label: 'Competition' },
  { value: 4, label: 'Competitor' },
  { value: 3, label: 'Country' },
  { value: 2, label: 'Athlete' },
];

function FilterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Targets
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [targetPage, setTargetPage] = useState(0);
  const [targetRowsPerPage] = useState(10);
  const [addLanguageIds, setAddLanguageIds] = useState([]);
  const [addCountryTargetIds, setAddCountryTargetIds] = useState([]);

  // Entities
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityPage, setEntityPage] = useState(0);
  const [entityRowsPerPage] = useState(10);
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [addEntityType, setAddEntityType] = useState(5);
  const [addEntityId, setAddEntityId] = useState('');

  // Dropdowns data
  const [sports, setSports] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [countries, setCountries] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    loadFilter();
    loadDropdownData();
    loadTermsAndCategories();
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

  const loadDropdownData = async () => {
    try {
      const [sportsData, countriesData, competitionsData, languagesData] = await Promise.all([
        api.getSports(),
        api.getCountries(),
        api.getCompetitions(),
        api.getLanguages(),
      ]);
      setSports(sportsData || []);
      setCountries(countriesData || []);
      setCompetitions(competitionsData || []);
      setLanguages(languagesData || []);
    } catch (err) {
      console.warn('Failed to load dropdown data:', err);
    }
  };

  const loadFilter = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFilterById(id);
      setFilter(data);
      setFormData({
        ACTIVE: data.ACTIVE ?? false,
        PROMOTED: data.PROMOTED ?? false,
        ORDER_LEVEL: data.ORDER_LEVEL ?? '',
        ALLOW_SELECTION: data.ALLOW_SELECTION ?? true,
        START_DATE: data.START_DATE ?? '',
        END_DATE: data.END_DATE ?? '',
        EDITORS_CHOICE: data.EDITORS_CHOICE ?? false,
        EDITORS_PROMOTED_ODDS: data.EDITORS_PROMOTED_ODDS ?? false,
        EDITORS_SHOW_SPORT_TYPE: data.EDITORS_SHOW_SPORT_TYPE ?? false,
        IMG_VER: data.IMG_VER ?? 0,
        EDITORS_PROMOTED_ALL_SCORES: data.EDITORS_PROMOTED_ALL_SCORES ?? false,
        FORCE_FINAL_ACTION_ENUM_VAL: data.FORCE_FINAL_ACTION_ENUM_VAL ?? '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load filter');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/filters');

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!filter) return;
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      const fields = [
        'ACTIVE', 'PROMOTED', 'ORDER_LEVEL', 'ALLOW_SELECTION',
        'START_DATE', 'END_DATE', 'EDITORS_CHOICE', 'EDITORS_PROMOTED_ODDS',
        'EDITORS_SHOW_SPORT_TYPE', 'IMG_VER', 'EDITORS_PROMOTED_ALL_SCORES',
        'FORCE_FINAL_ACTION_ENUM_VAL',
      ];
      for (const field of fields) {
        const current = formData[field];
        const original = filter[field];
        if (typeof current === 'boolean') {
          if (current !== !!original) changes[field] = current;
        } else if (current !== (original ?? '')) {
          changes[field] = current === '' ? null : current;
        }
      }

      if (Object.keys(changes).length === 0) {
        setSnackbar({ open: true, message: 'No changes to save', severity: 'info' });
        setLoading(false);
        return;
      }

      await api.updateFiltersBulk([{ filterId: filter.FILTER_ID, changes }]);
      setSnackbar({ open: true, message: 'Filter updated successfully', severity: 'success' });
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNameClick = async () => {
    if (!filter || !filter.NAME_ID) return;
    try {
      const term = await api.getTermById(filter.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setSnackbar({ open: true, message: 'Failed to load term for editing', severity: 'error' });
    }
  };

  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadFilter();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setSnackbar({ open: true, message: 'Failed to save term', severity: 'error' });
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

  const uiLanguages = useMemo(() => languages.filter((l) => l.isUI === true), [languages]);
  const realCountries = useMemo(() => countries.filter((c) => c.IS_NOT_REAL === false), [countries]);

  // --- Targets ---
  const handleDeleteTargets = async () => {
    if (selectedTargets.length === 0) return;
    try {
      setLoading(true);
      await api.deleteFilterTargets(filter.FILTER_ID, selectedTargets);
      setSnackbar({ open: true, message: `Deleted ${selectedTargets.length} target(s)`, severity: 'success' });
      setSelectedTargets([]);
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete targets', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTargets = async (targetType, targetIds) => {
    if (!targetIds || targetIds.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one target', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      for (const tid of targetIds) {
        await api.addFilterTarget(filter.FILTER_ID, {
          FILTER_TARGET_ID: parseInt(tid, 10),
          FILTER_TARGET_TYPE: targetType,
        });
      }
      setSnackbar({ open: true, message: `Added ${targetIds.length} target(s) successfully`, severity: 'success' });
      if (targetType === 1) setAddLanguageIds([]);
      else setAddCountryTargetIds([]);
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to add targets', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- Entities ---
  const filteredEntities = useMemo(() => {
    if (!filter?.entities) return [];
    if (entityTypeFilter === 'all') return filter.entities;
    return filter.entities.filter((e) => e.ENTITY_TYPE === parseInt(entityTypeFilter, 10));
  }, [filter?.entities, entityTypeFilter]);

  const handleDeleteEntities = async () => {
    if (selectedEntities.length === 0) return;
    try {
      setLoading(true);
      await api.deleteFilterEntities(filter.FILTER_ID, selectedEntities);
      setSnackbar({ open: true, message: `Deleted ${selectedEntities.length} entity/entities`, severity: 'success' });
      setSelectedEntities([]);
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete entities', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntity = async () => {
    const entityId = addEntityId || selectedCompetition || selectedCompetitor || selectedAthlete;
    if (!entityId) {
      setSnackbar({ open: true, message: 'Please select or enter an entity', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      await api.addFilterEntity(filter.FILTER_ID, {
        ENTITY_ID: parseInt(entityId, 10),
        ENTITY_TYPE: addEntityType,
      });
      setSnackbar({ open: true, message: 'Entity added successfully', severity: 'success' });
      setAddEntityId('');
      setSelectedSport('');
      setSelectedCountry('');
      setSelectedCompetition('');
      setSelectedCompetitor('');
      setSelectedAthlete('');
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to add entity', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderBooleanChip = (value) => {
    if (value === true) return <Chip label="Yes" size="small" sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 500, fontSize: '0.75rem' }} />;
    if (value === false) return <Chip label="No" size="small" sx={{ backgroundColor: '#FFEBEE', color: '#C62828', fontWeight: 500, fontSize: '0.75rem' }} />;
    return '-';
  };

  const handleSnackbarClose = (e, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Pagination helpers
  const paginateData = (data, page, rowsPerPage) => {
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  };

  if (loading && !filter) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && !filter) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  if (!filter) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Filter not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  const targets = filter.targets || [];
  const paginatedTargets = paginateData(targets, targetPage, targetRowsPerPage);
  const paginatedEntities = paginateData(filteredEntities, entityPage, entityRowsPerPage);

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
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
          Filter –{' '}
          <Box
            component="span"
            onClick={filter.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: '#1976d2',
              cursor: filter.NAME_ID ? 'pointer' : 'default',
              textDecoration: filter.NAME_ID ? 'underline' : 'none',
              '&:hover': filter.NAME_ID ? { color: '#1565c0' } : {},
            }}
          >
            {filter.FILTER_NAME || `Filter #${filter.FILTER_ID}`}
          </Box>
        </Typography>
      </Box>

      {/* General Details */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>General Details</Typography>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ textTransform: 'none', backgroundColor: '#15803d', color: 'white', px: 3, py: 1, '&:hover': { backgroundColor: '#166534' } }}
          >
            Save & Update In Service
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {/* Fields grid */}
          <Box sx={{
            flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            gap: { xs: 1.5, md: 1.25 }, width: '100%', alignContent: 'start',
          }}>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Filter ID" value={filter.FILTER_ID} disabled
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" type="number" label="Order Level"
                value={formData.ORDER_LEVEL ?? ''}
                onChange={(e) => handleFormChange('ORDER_LEVEL', e.target.value ? parseInt(e.target.value, 10) : '')}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Start Date" placeholder="DD/MM/YY HH:mm"
                value={formData.START_DATE || ''}
                onChange={(e) => handleFormChange('START_DATE', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="End Date" placeholder="DD/MM/YY HH:mm"
                value={formData.END_DATE || ''}
                onChange={(e) => handleFormChange('END_DATE', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" type="number" label="Image Version"
                value={formData.IMG_VER ?? ''}
                onChange={(e) => handleFormChange('IMG_VER', e.target.value ? parseInt(e.target.value, 10) : '')}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" type="number" label="Force Final Action"
                value={formData.FORCE_FINAL_ACTION_ENUM_VAL ?? ''}
                onChange={(e) => handleFormChange('FORCE_FINAL_ACTION_ENUM_VAL', e.target.value ? parseInt(e.target.value, 10) : '')}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Created" value={filter.CREATE_TIME || '-'} disabled
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Updated" value={filter.UPDATE_TIME || '-'} disabled
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
          </Box>

          {/* Booleans */}
          <Box sx={{
            flex: { xs: '1 1 100%', md: '0 0 auto' }, minWidth: 0,
            display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1fr' },
            gap: 0.5, alignContent: 'start', alignItems: 'flex-start',
          }}>
            {[
              { field: 'ACTIVE', label: 'Active' },
              { field: 'PROMOTED', label: 'Promoted' },
              { field: 'ALLOW_SELECTION', label: 'Allow Selection' },
              { field: 'EDITORS_CHOICE', label: "Editor's Choice" },
              { field: 'EDITORS_PROMOTED_ODDS', label: 'Promoted Odds' },
              { field: 'EDITORS_SHOW_SPORT_TYPE', label: 'Show Sport Type' },
              { field: 'EDITORS_PROMOTED_ALL_SCORES', label: 'Promoted All Scores' },
            ].map(({ field, label }) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    size="small"
                    checked={!!formData[field]}
                    onChange={(e) => handleFormChange(field, e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
                sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Filter Targets */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filter Targets</Typography>
        </Box>

        {/* Add Language target */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 80 }}>Language:</Typography>
          <Autocomplete
            multiple
            disableCloseOnSelect
            limitTags={3}
            options={[{ id: '__all__', name: 'All' }, ...uiLanguages]}
            getOptionLabel={(opt) => opt.name || `Language #${opt.id}`}
            value={addLanguageIds.length === uiLanguages.length
              ? [{ id: '__all__', name: 'All' }, ...uiLanguages]
              : uiLanguages.filter((l) => addLanguageIds.includes(String(l.id)))}
            onChange={(e, val) => {
              const hasAll = val.some((v) => v.id === '__all__');
              const hadAll = addLanguageIds.length === uiLanguages.length;
              if (hasAll && !hadAll) {
                setAddLanguageIds(uiLanguages.map((l) => String(l.id)));
              } else if (!hasAll && hadAll) {
                setAddLanguageIds([]);
              } else {
                const filtered = val.filter((v) => v.id !== '__all__');
                setAddLanguageIds(filtered.map((v) => String(v.id)));
              }
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={option.id === '__all__' ? addLanguageIds.length === uiLanguages.length : selected} sx={{ mr: 1 }} />
                {option.name || `Language #${option.id}`}
              </li>
            )}
            renderTags={(value, getTagProps) => {
              const items = value.filter((v) => v.id !== '__all__');
              if (items.length === uiLanguages.length) {
                return <Chip label={`All (${items.length})`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddLanguageIds([])} />;
              }
              if (items.length > 3) {
                return <Chip label={`${items.length} selected`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddLanguageIds([])} />;
              }
              return items.map((opt, index) => <Chip {...getTagProps({ index })} label={opt.name} size="small" sx={{ fontSize: '0.75rem' }} key={opt.id} />);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Select Languages" size="small"
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            )}
            sx={{ minWidth: 350 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddTargets(1, addLanguageIds)}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add
          </Button>
        </Box>

        {/* Add Country target */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 80 }}>Country:</Typography>
          <Autocomplete
            multiple
            disableCloseOnSelect
            limitTags={3}
            options={[{ COUNTRY_ID: '__all__', name: 'All' }, ...realCountries]}
            getOptionLabel={(opt) => opt.COUNTRY_ID === '__all__' ? 'All' : ((opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || `Country #${opt.COUNTRY_ID}`))}
            value={addCountryTargetIds.length === realCountries.length
              ? [{ COUNTRY_ID: '__all__', name: 'All' }, ...realCountries]
              : realCountries.filter((c) => addCountryTargetIds.includes(String(c.COUNTRY_ID)))}
            onChange={(e, val) => {
              const hasAll = val.some((v) => v.COUNTRY_ID === '__all__');
              const hadAll = addCountryTargetIds.length === realCountries.length;
              if (hasAll && !hadAll) {
                setAddCountryTargetIds(realCountries.map((c) => String(c.COUNTRY_ID)));
              } else if (!hasAll && hadAll) {
                setAddCountryTargetIds([]);
              } else {
                const filtered = val.filter((v) => v.COUNTRY_ID !== '__all__');
                setAddCountryTargetIds(filtered.map((v) => String(v.COUNTRY_ID)));
              }
            }}
            isOptionEqualToValue={(option, value) => option.COUNTRY_ID === value.COUNTRY_ID}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={option.COUNTRY_ID === '__all__' ? addCountryTargetIds.length === realCountries.length : selected} sx={{ mr: 1 }} />
                {option.COUNTRY_ID === '__all__' ? 'All' : ((option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || `Country #${option.COUNTRY_ID}`))}
              </li>
            )}
            renderTags={(value, getTagProps) => {
              const items = value.filter((v) => v.COUNTRY_ID !== '__all__');
              if (items.length === realCountries.length) {
                return <Chip label={`All (${items.length})`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddCountryTargetIds([])} />;
              }
              if (items.length > 3) {
                return <Chip label={`${items.length} selected`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddCountryTargetIds([])} />;
              }
              return items.map((opt, index) => {
                const label = (opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || `#${opt.COUNTRY_ID}`);
                return <Chip {...getTagProps({ index })} label={label} size="small" sx={{ fontSize: '0.75rem' }} key={opt.COUNTRY_ID} />;
              });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Select Countries" size="small"
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            )}
            sx={{ minWidth: 350 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddTargets(2, addCountryTargetIds)}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff' }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedTargets.length > 0 && selectedTargets.length < paginatedTargets.length}
                    checked={paginatedTargets.length > 0 && selectedTargets.length === paginatedTargets.length}
                    onChange={(e) => e.target.checked
                      ? setSelectedTargets(paginatedTargets.map((t) => t.FILTER_TARGET_ID))
                      : setSelectedTargets([])
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Filter Target Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Target</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTargets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" fontSize="0.875rem">No targets found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTargets.map((t, idx) => (
                  <TableRow key={`${t.FILTER_TARGET_TYPE}-${t.FILTER_TARGET_ID}-${idx}`} hover
                    selected={selectedTargets.includes(t.FILTER_TARGET_ID)}
                    sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedTargets.includes(t.FILTER_TARGET_ID)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTargets([...selectedTargets, t.FILTER_TARGET_ID]);
                          else setSelectedTargets(selectedTargets.filter((id) => id !== t.FILTER_TARGET_ID));
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Chip label={t.TARGET_TYPE_LABEL} size="small" sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#1976d2', fontWeight: 500 }}>{t.FILTER_TARGET_ID}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{t.TARGET_NAME}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Targets footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #EAECF0', mt: 1 }}>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteTargets}
            disabled={selectedTargets.length === 0}
            sx={{
              backgroundColor: '#d32f2f', color: '#fff', textTransform: 'none', fontWeight: 500,
              '&:hover': { backgroundColor: '#c62828' },
              '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#fff' },
            }}
          >
            Delete Targets ({selectedTargets.length})
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {targets.length === 0 ? '0-0' : `${targetPage * targetRowsPerPage + 1}-${Math.min((targetPage + 1) * targetRowsPerPage, targets.length)}`} of {targets.length}
            </Typography>
            <IconButton onClick={() => setTargetPage(targetPage - 1)} disabled={targetPage === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => setTargetPage(targetPage + 1)} disabled={(targetPage + 1) * targetRowsPerPage >= targets.length} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Filter Entities */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filter Entities</Typography>
        </Box>

        {/* Add Entity form */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            Choose Type of Entity to Add:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={addEntityType}
              onChange={(e) => {
                setAddEntityType(e.target.value);
                setAddEntityId('');
                setSelectedSport('');
                setSelectedCountry('');
                setSelectedCompetition('');
                setSelectedCompetitor('');
                setSelectedAthlete('');
              }}
              sx={{ fontSize: '0.8rem' }}
            >
              {ENTITY_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {addEntityType === 5 && (
            <>
              <Autocomplete
                options={sports}
                getOptionLabel={(opt) => opt.name || opt.ALIAS_NAME || `Sport #${opt.SPORT_TYPE_ID}`}
                value={sports.find((s) => String(s.SPORT_TYPE_ID) === String(selectedSport)) || null}
                onChange={(e, val) => setSelectedSport(val ? String(val.SPORT_TYPE_ID) : '')}
                renderInput={(params) => (
                  <TextField {...params} label="Sport" size="small" placeholder="Please select sport"
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                  />
                )}
                sx={{ minWidth: 160 }}
              />
              <Autocomplete
                options={countries}
                getOptionLabel={(opt) => (opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || '')}
                value={countries.find((c) => String(c.COUNTRY_ID) === String(selectedCountry)) || null}
                onChange={(e, val) => setSelectedCountry(val ? String(val.COUNTRY_ID) : '')}
                renderInput={(params) => (
                  <TextField {...params} label="Country" size="small" placeholder="Please select countries"
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                  />
                )}
                sx={{ minWidth: 180 }}
              />
              <Autocomplete
                options={competitions}
                getOptionLabel={(opt) => opt.name || `Competition #${opt.COMPETITION_ID}`}
                value={competitions.find((c) => String(c.COMPETITION_ID) === String(selectedCompetition)) || null}
                onChange={(e, val) => setSelectedCompetition(val ? String(val.COMPETITION_ID) : '')}
                renderInput={(params) => (
                  <TextField {...params} label="Competition" size="small" placeholder="Please select competitions"
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                  />
                )}
                sx={{ minWidth: 200 }}
              />
              <TextField
                size="small" label="Game Id" placeholder="Game Id"
                value={addEntityId}
                onChange={(e) => setAddEntityId(e.target.value)}
                sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </>
          )}

          {addEntityType === 6 && (
            <Autocomplete
              options={competitions}
              getOptionLabel={(opt) => opt.name || `Competition #${opt.COMPETITION_ID}`}
              value={competitions.find((c) => String(c.COMPETITION_ID) === String(addEntityId)) || null}
              onChange={(e, val) => setAddEntityId(val ? String(val.COMPETITION_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Select Competition" size="small"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              sx={{ minWidth: 300 }}
            />
          )}

          {addEntityType === 3 && (
            <Autocomplete
              options={countries}
              getOptionLabel={(opt) => (opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || '')}
              value={countries.find((c) => String(c.COUNTRY_ID) === String(addEntityId)) || null}
              onChange={(e, val) => setAddEntityId(val ? String(val.COUNTRY_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Select Country" size="small"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              sx={{ minWidth: 250 }}
            />
          )}

          {(addEntityType === 4 || addEntityType === 2) && (
            <TextField
              size="small"
              label={addEntityType === 4 ? 'Competitor ID' : 'Athlete ID'}
              placeholder={addEntityType === 4 ? 'Enter Competitor ID' : 'Enter Athlete ID'}
              value={addEntityId}
              onChange={(e) => setAddEntityId(e.target.value)}
              sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
            />
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEntity}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add Entity
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff' }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedEntities.length > 0 && selectedEntities.length < paginatedEntities.length}
                    checked={paginatedEntities.length > 0 && selectedEntities.length === paginatedEntities.length}
                    onChange={(e) => e.target.checked
                      ? setSelectedEntities(paginatedEntities.map((en) => en.ENTITY_ID))
                      : setSelectedEntities([])
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Filter Entity Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Use Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Use Image</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEntities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" fontSize="0.875rem">No entities found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntities.map((en, idx) => (
                  <TableRow key={`${en.ENTITY_TYPE}-${en.ENTITY_ID}-${idx}`} hover
                    selected={selectedEntities.includes(en.ENTITY_ID)}
                    sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedEntities.includes(en.ENTITY_ID)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEntities([...selectedEntities, en.ENTITY_ID]);
                          else setSelectedEntities(selectedEntities.filter((eid) => eid !== en.ENTITY_ID));
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Chip label={en.ENTITY_TYPE_LABEL} size="small" sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#1976d2', fontWeight: 500 }}>{en.ENTITY_ID}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{en.ENTITY_NAME}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{en.FILTER_ORDER ?? '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{renderBooleanChip(en.CAPTION?.includes('name'))}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{renderBooleanChip(en.CAPTION?.includes('image'))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Entities footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #EAECF0', mt: 1, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Show Entities of Type:</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={entityTypeFilter}
                onChange={(e) => { setEntityTypeFilter(e.target.value); setEntityPage(0); }}
                sx={{ fontSize: '0.8rem' }}
              >
                <MenuItem value="all">All</MenuItem>
                {ENTITY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteEntities}
              disabled={selectedEntities.length === 0}
              sx={{
                backgroundColor: '#d32f2f', color: '#fff', textTransform: 'none', fontWeight: 500,
                '&:hover': { backgroundColor: '#c62828' },
                '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#fff' },
              }}
            >
              Delete Entities ({selectedEntities.length})
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {filteredEntities.length === 0 ? '0-0' : `${entityPage * entityRowsPerPage + 1}-${Math.min((entityPage + 1) * entityRowsPerPage, filteredEntities.length)}`} of {filteredEntities.length}
            </Typography>
            <IconButton onClick={() => setEntityPage(entityPage - 1)} disabled={entityPage === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => setEntityPage(entityPage + 1)} disabled={(entityPage + 1) * entityRowsPerPage >= filteredEntities.length} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Term Edit Modal */}
      <TermEditModal
        open={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSave}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Filters Names"
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default FilterDetails;
