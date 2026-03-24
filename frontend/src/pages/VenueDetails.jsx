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
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function VenueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentTermCategory, setCurrentTermCategory] = useState(null); // Track which category we're editing
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [citySelectValue, setCitySelectValue] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [surfaces, setSurfaces] = useState([]);
  const [imageError, setImageError] = useState(false);
  
  // Image edit dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');
  
  // Form state for Venue Details
  const [formData, setFormData] = useState({
    COUNTRY_ID: '',
    CITY_ID: '',
    ADDRESS: '',
    CAPACITY: '',
    SURFACE: '',
    OPENED: '',
    PRIMARY: false,
    WEBSITE: '',
    LOCATION_LAT: '',
    LOCATION_LNG: '',
    IMAGE_URL: '',
  });

  useEffect(() => {
    loadVenue();
    loadTermsAndCategories();
    loadCountriesAndCities();
  }, [id]);

  useEffect(() => {
    if (venue) {
      let surfaceValue = '';
      if (venue.SURFACE != null && venue.SURFACE !== '') {
        if (typeof venue.SURFACE === 'number') {
          surfaceValue = venue.SURFACE;
        } else if (surfaces.length > 0) {
          const match = surfaces.find(s => s.SURFACE_NAME === venue.SURFACE);
          surfaceValue = match ? match.SURFACE_ID : venue.SURFACE;
        } else {
          surfaceValue = venue.SURFACE;
        }
      }
      setFormData({
        COUNTRY_ID: venue.COUNTRY_ID || '',
        CITY_ID: venue.CITY_ID || '',
        ADDRESS: venue.ADDRESS || '',
        CAPACITY: venue.CAPACITY || '',
        SURFACE: surfaceValue,
        OPENED: venue.OPENED || '',
        PRIMARY: venue.PRIMARY || false,
        WEBSITE: venue.WEBSITE || '',
        LOCATION_LAT: venue.LOCATION_LAT || '',
        LOCATION_LNG: venue.LOCATION_LNG || '',
        IMAGE_URL: venue.IMAGE_URL || '',
      });
      setCitySelectValue(venue.CITY_ID || '');
      setImageError(false);
    }
  }, [venue, surfaces]);

  const loadCountriesAndCities = async () => {
    try {
      const [countriesData, termsData, surfacesData] = await Promise.all([
        api.getCountries(),
        api.getTerms(),
        api.getSurfaces(),
      ]);
      setCountries(countriesData);
      const citiesData = termsData.filter(term => term.category === 'Cities');
      setCities(citiesData);
      setSurfaces(surfacesData || []);
    } catch (err) {
      console.error('Failed to load countries/cities/surfaces:', err);
    }
  };


  const loadTermsAndCategories = async () => {
    try {
      const [terms, categories] = await Promise.all([
        api.getTerms(),
        api.getCategories(),
      ]);
      setAllTerms(terms);
      setAllCategories(categories);
    } catch (err) {
      console.error('Failed to load terms/categories:', err);
    }
  };

  const loadVenue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getVenueById(id);
      setVenue(data);
    } catch (err) {
      setError(err.message || 'Failed to load venue');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/venues');
  };

  // Handle opening image edit dialog
  const handleOpenImageDialog = () => {
    setImageUrlValue(formData.IMAGE_URL || venue?.IMAGE_URL || '');
    setImageDialogOpen(true);
  };

  // Handle closing image edit dialog
  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setImageUrlValue('');
  };

  // Handle saving image URL
  const handleSaveImageUrl = async () => {
    if (!venue) return;

    try {
      setLoading(true);
      setError(null);

      const changes = {
        IMAGE_URL: imageUrlValue.trim() || null,
      };

      // Reset error state when updating
      setImageError(false);
      // Update formData
      setFormData(prev => ({ ...prev, IMAGE_URL: imageUrlValue.trim() || '' }));

      const updateData = {
        venueId: venue.VENUE_ID,
        changes
      };

      // Update venue
      await api.updateVenuesBulk([updateData]);
      
      // Reload venue to get updated data
      await loadVenue();
      
      // Close dialog
      handleCloseImageDialog();
    } catch (err) {
      console.error('Failed to save image URL:', err);
      setError(err.message || 'Failed to save image URL');
    } finally {
      setLoading(false);
    }
  };


  const handleNameClick = async () => {
    if (!venue || !venue.NAME_ID) return;
    
    try {
      const term = await api.getTermById(venue.NAME_ID);
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
      // Reload venue to get updated data
      await loadVenue();
      // Reload terms to get updated list
      await loadTermsAndCategories();
      
      // If this was a new term and matches the category we're editing, select it
      if (!currentTerm && currentTermCategory) {
        if (termData.category === 'Cities') {
          setCitySelectValue(termData.id);
          handleFormChange('CITY_ID', termData.id);
        }
      }
      
      setTermModalOpen(false);
      setCurrentTerm(null);
      setCurrentTermCategory(null);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload venue to get updated data
      await loadVenue();
      // Reload terms to get updated list
      await loadTermsAndCategories();
      
      // If this was a new term and matches the category we're editing, select it
      if (!currentTerm && currentTermCategory) {
        if (termData.category === 'Cities') {
          setCitySelectValue(termData.id);
          handleFormChange('CITY_ID', termData.id);
        }
      }
      
      setTermModalOpen(false);
      setCurrentTerm(null);
      setCurrentTermCategory(null);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  // Handle opening term modal for new term creation
  const handleNewTermClick = (category) => {
    setCurrentTerm(null); // null means new term
    setCurrentTermCategory(category);
    setTermModalOpen(true);
  };

  // Handle clicking on existing term to edit
  const handleTermClick = async (termId) => {
    if (!termId) return;
    
    try {
      const term = await api.getTermById(termId);
      setCurrentTerm(term);
      // Determine category from term
      const category = term.category || (term.categoryId ? allCategories.find(c => c.id === term.categoryId)?.name : null);
      setCurrentTermCategory(category);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setError('Failed to load term for editing');
    }
  };

  // Helper function to resolve term name
  const resolveTermName = (term) => {
    if (!term) return null;
    if (term.engValue) return term.engValue;
    if (term.values && Array.isArray(term.values)) {
      const englishValue = term.values.find(v => v.languageId === 1);
      if (englishValue && englishValue.value) return englishValue.value;
      const defaultValue = term.values.find(v => v.isDefault === true);
      if (defaultValue && defaultValue.value) return defaultValue.value;
      const approvedValue = term.values.find(v => v.status === 'Approved');
      if (approvedValue && approvedValue.value) return approvedValue.value;
      if (term.values.length > 0 && term.values[0].value) return term.values[0].value;
    }
    return null;
  };

  // Get terms by category
  const getTermsByCategory = (categoryName) => {
    return allTerms.filter(term => term.category === categoryName);
  };


  const handleCreateCategory = async (categoryData) => {
    try {
      const newCategory = await api.createCategory(categoryData);
      // Reload categories
      const categories = await api.getCategories();
      setAllCategories(categories);
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      throw err;
    }
  };

  if (loading) {
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

  if (!venue) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Venue not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If country changed, clear city (city depends on country)
      if (field === 'COUNTRY_ID') {
        updated.CITY_ID = '';
        setCitySelectValue('');
      }
      
      return updated;
    });
  };

  const FIELD_LABELS = {
    COUNTRY_ID: 'Country',
    CITY_ID: 'City',
    ADDRESS: 'Address',
    CAPACITY: 'Capacity',
    SURFACE: 'Surface',
    OPENED: 'Opened (Year)',
    WEBSITE: 'Website',
    LOCATION_LAT: 'Latitude',
    LOCATION_LNG: 'Longitude',
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare update data
      const changes = {};

      // Update all form fields
      if (formData.COUNTRY_ID !== undefined && formData.COUNTRY_ID !== venue.COUNTRY_ID) {
        changes.COUNTRY_ID = formData.COUNTRY_ID || null;
      }
      if (formData.CITY_ID !== undefined && formData.CITY_ID !== venue.CITY_ID) {
        changes.CITY_ID = formData.CITY_ID || null;
      }
      if (formData.ADDRESS !== undefined && formData.ADDRESS !== venue.ADDRESS) {
        changes.ADDRESS = formData.ADDRESS || null;
      }
      if (formData.CAPACITY !== undefined) {
        changes.CAPACITY = formData.CAPACITY ? parseInt(formData.CAPACITY) : null;
      }
      if (formData.SURFACE !== undefined && formData.SURFACE !== venue.SURFACE) {
        changes.SURFACE = (formData.SURFACE !== '' && formData.SURFACE != null) ? formData.SURFACE : null;
      }
      if (formData.OPENED !== undefined) {
        changes.OPENED = formData.OPENED ? parseInt(formData.OPENED) : null;
      }
      if (formData.PRIMARY !== undefined && formData.PRIMARY !== venue.PRIMARY) {
        changes.PRIMARY = formData.PRIMARY;
      }
      if (formData.WEBSITE !== undefined && formData.WEBSITE !== venue.WEBSITE) {
        changes.WEBSITE = formData.WEBSITE || null;
      }
      if (formData.LOCATION_LAT !== undefined) {
        changes.LOCATION_LAT = formData.LOCATION_LAT ? parseFloat(formData.LOCATION_LAT) : null;
      }
      if (formData.LOCATION_LNG !== undefined) {
        changes.LOCATION_LNG = formData.LOCATION_LNG ? parseFloat(formData.LOCATION_LNG) : null;
      }
      if (formData.IMAGE_URL !== undefined && formData.IMAGE_URL !== venue.IMAGE_URL) {
        changes.IMAGE_URL = formData.IMAGE_URL || null;
      }

      // Only update if there are changes
      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }

      const updateData = {
        venueId: venue.VENUE_ID,
        changes
      };

      // Update venue
      await api.updateVenuesBulk([updateData]);
      
      // Reload venue to get updated data
      await loadVenue();
    } catch (err) {
      console.error('Failed to save venue:', err);
      setError(err.message || 'Failed to save venue');
    } finally {
      setLoading(false);
    }
  };


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
            '&:hover': {
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            }
          }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Venue –{' '}
          <Box
            component="span"
            onClick={venue.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: '#1976d2',
              cursor: venue.NAME_ID ? 'pointer' : 'default',
              textDecoration: venue.NAME_ID ? 'underline' : 'none',
              '&:hover': venue.NAME_ID ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {venue.name || 'Venue Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – Left Media | Middle: fields (5 per row) | Right: Booleans – per UI-STANDARDS */}
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
                  src={(formData.IMAGE_URL || venue?.IMAGE_URL) && !imageError ? (formData.IMAGE_URL || venue?.IMAGE_URL) : null}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: (formData.IMAGE_URL || venue?.IMAGE_URL) && !imageError ? 'transparent' : '#f5f5f5',
                    border: '1px solid #e0e0e0',
                  }}
                  onError={() => setImageError(true)}
                >
                  {(!formData.IMAGE_URL && !venue?.IMAGE_URL) || imageError ? (
                    <LocationOnIcon sx={{ fontSize: 36, color: '#999999' }} />
                  ) : null}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  Venue Image
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

          {/* Middle: Fields – row 1: narrow (50%), row 2: full width */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Row 1: short fields – dynamic columns, fill cell to reduce dead space */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: { xs: 1.5, md: 1.25 } }}>
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => (option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || '')}
                  value={countries.find((c) => Number(c.COUNTRY_ID) === Number(formData.COUNTRY_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('COUNTRY_ID', newValue?.COUNTRY_ID ?? null)}
                  isOptionEqualToValue={(option, value) => Number(option?.COUNTRY_ID) === Number(value?.COUNTRY_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS.COUNTRY_ID} size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                  <InputLabel>{FIELD_LABELS.CITY_ID}</InputLabel>
                  <Select
                    value={citySelectValue}
                    label={FIELD_LABELS.CITY_ID}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'NEW') {
                        handleNewTermClick('Cities');
                      } else {
                        setCitySelectValue(value);
                        handleFormChange('CITY_ID', value ? parseInt(value, 10) : null);
                      }
                    }}
                    disabled={!formData.COUNTRY_ID}
                  >
                    <MenuItem value="">None</MenuItem>
                    {cities.map(city => (
                      <MenuItem key={city.id} value={city.id}>
                        {resolveTermName(city) || `City ${city.id}`}
                      </MenuItem>
                    ))}
                    <MenuItem value="NEW" sx={{ fontStyle: 'italic', color: '#1976d2' }}>
                      + New City
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.OPENED}
                  value={formData.OPENED || ''}
                  onChange={(e) => handleFormChange('OPENED', e.target.value ? parseInt(e.target.value, 10) : null)}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.CAPACITY}
                  value={formData.CAPACITY || ''}
                  onChange={(e) => handleFormChange('CAPACITY', e.target.value ? parseInt(e.target.value, 10) : null)}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                  <InputLabel>{FIELD_LABELS.SURFACE}</InputLabel>
                  <Select
                    value={formData.SURFACE !== '' && formData.SURFACE != null ? formData.SURFACE : ''}
                    label={FIELD_LABELS.SURFACE}
                    onChange={(e) => handleFormChange('SURFACE', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {surfaces.map(s => (
                      <MenuItem key={s.SURFACE_ID} value={s.SURFACE_ID}>
                        {s.SURFACE_NAME}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.LOCATION_LAT}
                  value={formData.LOCATION_LAT || ''}
                  onChange={(e) => handleFormChange('LOCATION_LAT', e.target.value === '' ? null : parseFloat(e.target.value))}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.LOCATION_LNG}
                  value={formData.LOCATION_LNG || ''}
                  onChange={(e) => handleFormChange('LOCATION_LNG', e.target.value === '' ? null : parseFloat(e.target.value))}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
            </Box>
            {/* Row 2: long fields – responsive */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 1.25 } }}>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.ADDRESS}
                  value={formData.ADDRESS || ''}
                  onChange={(e) => handleFormChange('ADDRESS', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.WEBSITE}
                  value={formData.WEBSITE || ''}
                  onChange={(e) => handleFormChange('WEBSITE', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

      </Paper>

      {/* Image Edit Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload / Edit Venue Image
        </DialogTitle>
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
            helperText="Enter the URL for the venue image"
          />
          {imageUrlValue && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Preview:
              </Typography>
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
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveImageUrl} variant="contained" color="primary" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Term Edit Modal */}
      <TermEditModal
        open={termModalOpen}
        onClose={() => {
          setTermModalOpen(false);
          setCurrentTerm(null);
          setCurrentTermCategory(null);
        }}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSaveAndUpdate}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory={currentTermCategory || "Venues"}
      />

    </Box>
  );
}

export default VenueDetails;
