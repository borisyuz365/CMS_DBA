import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUrlFilters from '../hooks/useUrlFilters';
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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GroupsIcon from '@mui/icons-material/Groups';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function CompetitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competitor, setCompetitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentTermCategory, setCurrentTermCategory] = useState(null); // Track which category we're editing
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [citySelectValue, setCitySelectValue] = useState('');
  const [venueSelectValue, setVenueSelectValue] = useState('');
  const [symbolicNameTerm, setSymbolicNameTerm] = useState(null);
  const [titleNameTerm, setTitleNameTerm] = useState(null);
  const [countries, setCountries] = useState([]);
  const [allCompetitors, setAllCompetitors] = useState([]);
  const [sports, setSports] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [venues, setVenues] = useState([]);
  const [competitorTypes, setCompetitorTypes] = useState([]);
  const [lightImageError, setLightImageError] = useState(false);
  const [darkImageError, setDarkImageError] = useState(false);
  const [urlState, setUrlState] = useUrlFilters({
    tab: { type: 'number', default: 0 },
  });
  const activeTab = urlState.tab;
  
  // Image edit dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageType, setEditingImageType] = useState(null); // 'light' or 'dark'
  const [imageUrlValue, setImageUrlValue] = useState('');
  
  // Helper function to convert color number to hex
  const numberToHex = (num) => {
    if (num === null || num === undefined) return null;
    return `#${num.toString(16).padStart(6, '0').toUpperCase()}`;
  };

  // Helper function to convert hex to color number
  const hexToNumber = (hex) => {
    if (!hex || !hex.startsWith('#')) return null;
    return parseInt(hex.replace('#', ''), 16);
  };

  // Form state for General Details (using IDs like in CompetitorsList)
  const [formData, setFormData] = useState({
    SPORT_TYPE_ID: '',
    COUNTRY_ID: '',
    MAIN_COMPETITION: '',
    COMPETITOR_TYPE: '',
    GENDER: '',
    FOUNDED: '',
    FATHER_COMPETITOR: '',
    CAPTAIN: '',
    CITY_ID: '',
    VENUE_ID: '',
    FEDERATION_TERM_ID: '',
    SELECTIONS_RANK: '',
    MINIMUM_ATHLETES_IN_SQUAD: '',
    STATISTICS_RESET_TYPE: '',
    STATISTICS_RESET_DATE: '',
    HOME_MAIN_COLOR: '',
    HOME_SECONDARY_COLOR: '',
    AWAY_MAIN_COLOR: '',
    AWAY_SECONDARY_COLOR: '',
    THIRD_COLOR: '',
    SHOT_CHART_COLOR: '',
    SYMBOLIC_NAME: '',
    TITLE_NAME: '',
    ENABLE_DASHBOARD_BUZZ: false,
    HIDE_ON_SEARCH: false,
    HIDE_ON_CATALOG: false,
    HIDE_PLAYER_GAME_CARD: false,
    SUPPORT_DASHBOARD: false,
    SHOW_ATHLETES_SALARY: false,
    SHOULD_SHOW_TROPHIES: false,
    LINEUP_INSIGHTS_ENABLED: false,
    CONNECT_BY_TEXT: false,
    LIGHT_IMAGE_URL: '',
    DARK_IMAGE_URL: '',
  });

  useEffect(() => {
    loadCompetitor();
    loadTermsAndCategories();
    loadCountriesAndCompetitors();
    loadSports();
    loadCompetitions();
    loadVenues();
    loadCompetitorTypes();
    setLightImageError(false); // Reset image errors when competitor changes
    setDarkImageError(false);
  }, [id]);

  useEffect(() => {
    if (competitor) {
      // Format STATISTICS_RESET_DATE for input (YYYY-MM-DD)
      let statisticsResetDateValue = '';
      if (competitor.STATISTICS_RESET_DATE) {
        const date = new Date(competitor.STATISTICS_RESET_DATE);
        if (!isNaN(date.getTime())) {
          statisticsResetDateValue = date.toISOString().split('T')[0];
        }
      }
      
      setFormData({
        SPORT_TYPE_ID: competitor.SPORT_TYPE_ID || '',
        COUNTRY_ID: competitor.COUNTRY_ID || '',
        MAIN_COMPETITION: competitor.MAIN_COMPETITION || '',
        COMPETITOR_TYPE: competitor.COMPETITOR_TYPE || '',
        GENDER: competitor.GENDER || '',
        FOUNDED: competitor.FOUNDED || '',
        FATHER_COMPETITOR: competitor.FATHER_COMPETITOR || '',
        CAPTAIN: competitor.CAPTAIN || '',
        CITY_ID: competitor.CITY_ID || '',
        VENUE_ID: competitor.VENUE_ID || '',
        FEDERATION_TERM_ID: competitor.FEDERATION_TERM_ID || '',
        SELECTIONS_RANK: competitor.SELECTIONS_RANK || '',
        MINIMUM_ATHLETES_IN_SQUAD: competitor.MINIMUM_ATHLETES_IN_SQUAD || '',
        STATISTICS_RESET_TYPE: competitor.STATISTICS_RESET_TYPE || '',
        STATISTICS_RESET_DATE: statisticsResetDateValue,
        HOME_MAIN_COLOR: numberToHex(competitor.HOME_MAIN_COLOR) || '#000000',
        HOME_SECONDARY_COLOR: numberToHex(competitor.HOME_SECONDARY_COLOR) || '#ffffff',
        AWAY_MAIN_COLOR: numberToHex(competitor.AWAY_MAIN_COLOR) || '#000000',
        AWAY_SECONDARY_COLOR: numberToHex(competitor.AWAY_SECONDARY_COLOR) || '#ffffff',
        THIRD_COLOR: numberToHex(competitor.THIRD_COLOR) || '#000000',
        SHOT_CHART_COLOR: numberToHex(competitor.SHOT_CHART_COLOR) || '#000000',
        SYMBOLIC_NAME: competitor.SYMBOLIC_NAME || '',
        TITLE_NAME: competitor.TITLE_NAME || '',
        ENABLE_DASHBOARD_BUZZ: competitor.ENABLE_DASHBOARD_BUZZ || false,
        HIDE_ON_SEARCH: competitor.HIDE_ON_SEARCH || false,
        HIDE_ON_CATALOG: competitor.HIDE_ON_CATALOG || false,
        HIDE_PLAYER_GAME_CARD: competitor.HIDE_PLAYER_GAME_CARD || false,
        SUPPORT_DASHBOARD: competitor.SUPPORT_DASHBOARD || false,
        SHOW_ATHLETES_SALARY: competitor.SHOW_ATHLETES_SALARY || false,
        SHOULD_SHOW_TROPHIES: competitor.SHOULD_SHOW_TROPHIES || false,
        LINEUP_INSIGHTS_ENABLED: competitor.LINEUP_INSIGHTS_ENABLED || false,
        CONNECT_BY_TEXT: competitor.CONNECT_BY_TEXT || false,
        LIGHT_IMAGE_URL: competitor.LIGHT_IMAGE_URL || '',
        DARK_IMAGE_URL: competitor.DARK_IMAGE_URL || '',
      });
      // Set select values
      setCitySelectValue(competitor.CITY_ID || '');
      setVenueSelectValue(competitor.VENUE_ID || '');
      
      // Load terms for SYMBOLIC_NAME and TITLE_NAME
      if (competitor.SYMBOLIC_NAME) {
        loadTermById(competitor.SYMBOLIC_NAME, 'symbolic');
      } else {
        setSymbolicNameTerm(null);
      }
      if (competitor.TITLE_NAME) {
        loadTermById(competitor.TITLE_NAME, 'title');
      } else {
        setTitleNameTerm(null);
      }
    }
  }, [competitor]);

  const loadCountriesAndCompetitors = async () => {
    try {
      const [countriesData, competitorsData] = await Promise.all([
        api.getCountries(),
        api.getCompetitors(),
      ]);
      setCountries(countriesData);
      setAllCompetitors(competitorsData);
    } catch (err) {
      console.error('Failed to load countries/competitors:', err);
    }
  };

  const loadSports = async () => {
    try {
      const sportsData = await api.getSports();
      setSports(sportsData || []);
    } catch (err) {
      console.error('Failed to load sports:', err);
    }
  };

  const loadCompetitions = async () => {
    try {
      const competitionsData = await api.getCompetitions();
      setCompetitions(competitionsData || []);
    } catch (err) {
      console.error('Failed to load competitions:', err);
    }
  };

  const loadVenues = async () => {
    try {
      const venuesData = await api.getVenues();
      setVenues(venuesData || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    }
  };

  const loadCompetitorTypes = async () => {
    try {
      const types = await api.getCompetitorTypes();
      setCompetitorTypes(types || []);
    } catch (err) {
      console.error('Failed to load competitor types:', err);
    }
  };

  const loadTermById = async (termId, type) => {
    if (!termId) return;
    try {
      const term = await api.getTermById(termId);
      if (type === 'symbolic') {
        setSymbolicNameTerm(term);
      } else if (type === 'title') {
        setTitleNameTerm(term);
      }
    } catch (err) {
      console.error(`Failed to load ${type} term:`, err);
      if (type === 'symbolic') {
        setSymbolicNameTerm(null);
      } else if (type === 'title') {
        setTitleNameTerm(null);
      }
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

  const loadCompetitor = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCompetitorById(id);
      setCompetitor(data);
    } catch (err) {
      setError(err.message || 'Failed to load competitor');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/competitors');
  };

  // Handle opening image edit dialog
  const handleOpenImageDialog = (imageType) => {
    // If imageType is null, default to 'light', otherwise use the provided type
    const initialType = imageType || 'light';
    setEditingImageType(initialType);
    if (initialType === 'light') {
      setImageUrlValue(formData.LIGHT_IMAGE_URL || competitor?.LIGHT_IMAGE_URL || '');
    } else if (initialType === 'dark') {
      setImageUrlValue(formData.DARK_IMAGE_URL || competitor?.DARK_IMAGE_URL || '');
    }
    setImageDialogOpen(true);
  };

  // Handle closing image edit dialog
  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setEditingImageType(null);
    setImageUrlValue('');
  };

  // Handle saving image URL
  const handleSaveImageUrl = async () => {
    if (!competitor || !editingImageType) return;

    try {
      setLoading(true);
      setError(null);

      const changes = {};
      if (editingImageType === 'light') {
        changes.LIGHT_IMAGE_URL = imageUrlValue.trim() || null;
        // Reset error state when updating
        setLightImageError(false);
        // Update formData
        setFormData(prev => ({ ...prev, LIGHT_IMAGE_URL: imageUrlValue.trim() || '' }));
      } else if (editingImageType === 'dark') {
        changes.DARK_IMAGE_URL = imageUrlValue.trim() || null;
        // Reset error state when updating
        setDarkImageError(false);
        // Update formData
        setFormData(prev => ({ ...prev, DARK_IMAGE_URL: imageUrlValue.trim() || '' }));
      }

      const updateData = {
        competitorId: competitor.COMPETITOR_ID,
        changes
      };

      // Update competitor
      await api.updateCompetitorsBulk([updateData]);
      
      // Reload competitor to get updated data
      await loadCompetitor();
      
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
    if (!competitor || !competitor.NAME_ID) return;
    
    try {
      const term = await api.getTermById(competitor.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setError('Failed to load term for editing');
    }
  };


  const handleTermSave = async (termData) => {
    try {
      let savedTerm;
      // Check if this is a new term (no id) or existing term (has id)
      if (!termData.id) {
        // Create new term
        savedTerm = await api.createTerm(termData);
      } else {
        // Update existing term
        savedTerm = await api.updateTerm(termData.id, termData);
      }
      
      // Reload competitor to get updated data
      await loadCompetitor();
      // Reload terms to get updated list
      await loadTermsAndCategories();
      
      // If this was a new term and matches the category we're editing, select it
      if (!currentTerm && currentTermCategory) {
        if (savedTerm.category === 'Cities') {
          setCitySelectValue(savedTerm.id);
          handleFormChange('CITY_ID', savedTerm.id);
        } else if (savedTerm.category === 'Venues') {
          setVenueSelectValue(savedTerm.id);
          handleFormChange('VENUE_ID', savedTerm.id);
        } else if (savedTerm.category === 'Symbolic Names') {
          handleFormChange('SYMBOLIC_NAME', savedTerm.id);
          setSymbolicNameTerm(savedTerm);
        } else if (savedTerm.category === 'Title Names') {
          handleFormChange('TITLE_NAME', savedTerm.id);
          setTitleNameTerm(savedTerm);
        }
      } else if (currentTerm) {
        // If editing existing term, update the term state
        if (currentTermCategory === 'Symbolic Names') {
          setSymbolicNameTerm(savedTerm);
        } else if (currentTermCategory === 'Title Names') {
          setTitleNameTerm(savedTerm);
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
      let savedTerm;
      // Check if this is a new term (no id) or existing term (has id)
      if (!termData.id) {
        // Create new term
        savedTerm = await api.createTerm(termData);
      } else {
        // Update existing term
        savedTerm = await api.updateTerm(termData.id, termData);
      }
      
      // Reload competitor to get updated data
      await loadCompetitor();
      // Reload terms to get updated list
      await loadTermsAndCategories();
      
      // If this was a new term and matches the category we're editing, select it
      if (!currentTerm && currentTermCategory) {
        if (savedTerm.category === 'Cities') {
          setCitySelectValue(savedTerm.id);
          handleFormChange('CITY_ID', savedTerm.id);
        } else if (savedTerm.category === 'Venues') {
          setVenueSelectValue(savedTerm.id);
          handleFormChange('VENUE_ID', savedTerm.id);
        } else if (savedTerm.category === 'Symbolic Names') {
          handleFormChange('SYMBOLIC_NAME', savedTerm.id);
          setSymbolicNameTerm(savedTerm);
        } else if (savedTerm.category === 'Title Names') {
          handleFormChange('TITLE_NAME', savedTerm.id);
          setTitleNameTerm(savedTerm);
        }
      } else if (currentTerm) {
        // If editing existing term, update the term state
        if (currentTermCategory === 'Symbolic Names') {
          setSymbolicNameTerm(savedTerm);
        } else if (currentTermCategory === 'Title Names') {
          setTitleNameTerm(savedTerm);
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

  // Handle opening term modal for SYMBOLIC_NAME or TITLE_NAME
  const handleSymbolicNameClick = () => {
    if (symbolicNameTerm) {
      setCurrentTerm(symbolicNameTerm);
      setCurrentTermCategory('Symbolic Names');
    } else {
      setCurrentTerm(null);
      setCurrentTermCategory('Symbolic Names');
    }
    setTermModalOpen(true);
  };

  const handleTitleNameClick = () => {
    if (titleNameTerm) {
      setCurrentTerm(titleNameTerm);
      setCurrentTermCategory('Title Names');
    } else {
      setCurrentTerm(null);
      setCurrentTermCategory('Title Names');
    }
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

  // Get venues filtered by country ID
  const getVenuesByCountry = (countryId) => {
    if (!countryId) return [];
    return venues.filter(venue => venue.COUNTRY_ID === countryId);
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

  if (!competitor) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Competitor not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If sport changed, clear competition (competition depends on sport)
      if (field === 'SPORT_TYPE_ID') {
        updated.MAIN_COMPETITION = '';
      }
      
      // If country changed, clear venue (venue depends on country)
      if (field === 'COUNTRY_ID') {
        updated.VENUE_ID = '';
        setVenueSelectValue('');
      }
      
      // Convert hex colors to numbers for color fields
      if (field.includes('COLOR') && typeof value === 'string' && value.startsWith('#')) {
        // Keep as hex in formData, will convert to number on save
      }
      
      return updated;
    });
  };

  const fieldSx = { '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } };
  const FIELD_LABELS = {
    SPORT_TYPE_ID: 'Sport Type',
    COUNTRY_ID: 'Country',
    MAIN_COMPETITION: 'Competition',
    COMPETITOR_TYPE: 'Competitor Type',
    GENDER: 'Gender',
    FOUNDED: 'Founded',
    SELECTIONS_RANK: 'Selections Rank',
    SYMBOLIC_NAME: 'Symbolic Name',
    TITLE_NAME: 'Title Name',
    CITY_ID: 'City',
    VENUE_ID: 'Venue',
    ENABLE_DASHBOARD_BUZZ: 'Enable Dashboard Buzz',
    HIDE_ON_SEARCH: 'Hide on Search',
    HIDE_ON_CATALOG: 'Hide on Catalog',
    HIDE_PLAYER_GAME_CARD: 'Hide Player Game Card',
    SUPPORT_DASHBOARD: 'Support Dashboard',
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare update data (like in CompetitorsList)
      const changes = {};

      // Update all form fields
      if (formData.SPORT_TYPE_ID !== undefined && formData.SPORT_TYPE_ID !== competitor.SPORT_TYPE_ID) {
        changes.SPORT_TYPE_ID = formData.SPORT_TYPE_ID || null;
      }
      if (formData.COUNTRY_ID !== undefined && formData.COUNTRY_ID !== competitor.COUNTRY_ID) {
        changes.COUNTRY_ID = formData.COUNTRY_ID || null;
      }
      if (formData.MAIN_COMPETITION !== undefined && formData.MAIN_COMPETITION !== competitor.MAIN_COMPETITION) {
        changes.MAIN_COMPETITION = formData.MAIN_COMPETITION || null;
      }
      if (formData.COMPETITOR_TYPE !== undefined && formData.COMPETITOR_TYPE !== competitor.COMPETITOR_TYPE) {
        changes.COMPETITOR_TYPE = formData.COMPETITOR_TYPE || null;
      }
      if (formData.GENDER !== undefined && formData.GENDER !== competitor.GENDER) {
        changes.GENDER = formData.GENDER || null;
      }
      if (formData.FOUNDED !== undefined) {
        changes.FOUNDED = formData.FOUNDED ? parseInt(formData.FOUNDED) : null;
      }
      if (formData.FATHER_COMPETITOR !== undefined && formData.FATHER_COMPETITOR !== competitor.FATHER_COMPETITOR) {
        changes.FATHER_COMPETITOR = formData.FATHER_COMPETITOR || null;
      }
      if (formData.CAPTAIN !== undefined && formData.CAPTAIN !== competitor.CAPTAIN) {
        changes.CAPTAIN = formData.CAPTAIN || null;
      }
      if (formData.CITY_ID !== undefined && formData.CITY_ID !== competitor.CITY_ID) {
        changes.CITY_ID = formData.CITY_ID || null;
      }
      if (formData.VENUE_ID !== undefined && formData.VENUE_ID !== competitor.VENUE_ID) {
        changes.VENUE_ID = formData.VENUE_ID || null;
      }
      if (formData.FEDERATION_TERM_ID !== undefined && formData.FEDERATION_TERM_ID !== competitor.FEDERATION_TERM_ID) {
        changes.FEDERATION_TERM_ID = formData.FEDERATION_TERM_ID || null;
      }
      // SELECTIONS_RANK is read-only, do not send in update
      if (formData.MINIMUM_ATHLETES_IN_SQUAD !== undefined) {
        changes.MINIMUM_ATHLETES_IN_SQUAD = formData.MINIMUM_ATHLETES_IN_SQUAD ? parseInt(formData.MINIMUM_ATHLETES_IN_SQUAD) : null;
      }
      if (formData.STATISTICS_RESET_TYPE !== undefined && formData.STATISTICS_RESET_TYPE !== competitor.STATISTICS_RESET_TYPE) {
        changes.STATISTICS_RESET_TYPE = formData.STATISTICS_RESET_TYPE || null;
      }
      if (formData.STATISTICS_RESET_DATE !== undefined) {
        changes.STATISTICS_RESET_DATE = formData.STATISTICS_RESET_DATE || null;
      }
      
      // Color fields - convert hex to number
      if (formData.HOME_MAIN_COLOR !== undefined) {
        changes.HOME_MAIN_COLOR = formData.HOME_MAIN_COLOR ? hexToNumber(formData.HOME_MAIN_COLOR) : null;
      }
      if (formData.HOME_SECONDARY_COLOR !== undefined) {
        changes.HOME_SECONDARY_COLOR = formData.HOME_SECONDARY_COLOR ? hexToNumber(formData.HOME_SECONDARY_COLOR) : null;
      }
      if (formData.AWAY_MAIN_COLOR !== undefined) {
        changes.AWAY_MAIN_COLOR = formData.AWAY_MAIN_COLOR ? hexToNumber(formData.AWAY_MAIN_COLOR) : null;
      }
      if (formData.AWAY_SECONDARY_COLOR !== undefined) {
        changes.AWAY_SECONDARY_COLOR = formData.AWAY_SECONDARY_COLOR ? hexToNumber(formData.AWAY_SECONDARY_COLOR) : null;
      }
      if (formData.THIRD_COLOR !== undefined) {
        changes.THIRD_COLOR = formData.THIRD_COLOR ? hexToNumber(formData.THIRD_COLOR) : null;
      }
      if (formData.SHOT_CHART_COLOR !== undefined) {
        changes.SHOT_CHART_COLOR = formData.SHOT_CHART_COLOR ? hexToNumber(formData.SHOT_CHART_COLOR) : null;
      }
      
      // Text fields
      if (formData.SYMBOLIC_NAME !== undefined && formData.SYMBOLIC_NAME !== competitor.SYMBOLIC_NAME) {
        changes.SYMBOLIC_NAME = formData.SYMBOLIC_NAME || null;
      }
      if (formData.TITLE_NAME !== undefined && formData.TITLE_NAME !== competitor.TITLE_NAME) {
        changes.TITLE_NAME = formData.TITLE_NAME || null;
      }
      
      // Image URLs
      if (formData.LIGHT_IMAGE_URL !== undefined && formData.LIGHT_IMAGE_URL !== competitor.LIGHT_IMAGE_URL) {
        changes.LIGHT_IMAGE_URL = formData.LIGHT_IMAGE_URL || null;
      }
      if (formData.DARK_IMAGE_URL !== undefined && formData.DARK_IMAGE_URL !== competitor.DARK_IMAGE_URL) {
        changes.DARK_IMAGE_URL = formData.DARK_IMAGE_URL || null;
      }
      
      // Boolean flags
      if (formData.ENABLE_DASHBOARD_BUZZ !== undefined && formData.ENABLE_DASHBOARD_BUZZ !== competitor.ENABLE_DASHBOARD_BUZZ) {
        changes.ENABLE_DASHBOARD_BUZZ = formData.ENABLE_DASHBOARD_BUZZ;
      }
      if (formData.HIDE_ON_SEARCH !== undefined && formData.HIDE_ON_SEARCH !== competitor.HIDE_ON_SEARCH) {
        changes.HIDE_ON_SEARCH = formData.HIDE_ON_SEARCH;
      }
      if (formData.HIDE_ON_CATALOG !== undefined && formData.HIDE_ON_CATALOG !== competitor.HIDE_ON_CATALOG) {
        changes.HIDE_ON_CATALOG = formData.HIDE_ON_CATALOG;
      }
      if (formData.HIDE_PLAYER_GAME_CARD !== undefined && formData.HIDE_PLAYER_GAME_CARD !== competitor.HIDE_PLAYER_GAME_CARD) {
        changes.HIDE_PLAYER_GAME_CARD = formData.HIDE_PLAYER_GAME_CARD;
      }
      if (formData.SUPPORT_DASHBOARD !== undefined && formData.SUPPORT_DASHBOARD !== competitor.SUPPORT_DASHBOARD) {
        changes.SUPPORT_DASHBOARD = formData.SUPPORT_DASHBOARD;
      }
      if (formData.SHOW_ATHLETES_SALARY !== undefined && formData.SHOW_ATHLETES_SALARY !== competitor.SHOW_ATHLETES_SALARY) {
        changes.SHOW_ATHLETES_SALARY = formData.SHOW_ATHLETES_SALARY;
      }
      if (formData.SHOULD_SHOW_TROPHIES !== undefined && formData.SHOULD_SHOW_TROPHIES !== competitor.SHOULD_SHOW_TROPHIES) {
        changes.SHOULD_SHOW_TROPHIES = formData.SHOULD_SHOW_TROPHIES;
      }
      if (formData.LINEUP_INSIGHTS_ENABLED !== undefined && formData.LINEUP_INSIGHTS_ENABLED !== competitor.LINEUP_INSIGHTS_ENABLED) {
        changes.LINEUP_INSIGHTS_ENABLED = formData.LINEUP_INSIGHTS_ENABLED;
      }
      if (formData.CONNECT_BY_TEXT !== undefined && formData.CONNECT_BY_TEXT !== competitor.CONNECT_BY_TEXT) {
        changes.CONNECT_BY_TEXT = formData.CONNECT_BY_TEXT;
      }

      // Only update if there are changes
      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }

      const updateData = {
        competitorId: competitor.COMPETITOR_ID,
        changes
      };

      // Update competitor
      await api.updateCompetitorsBulk([updateData]);
      
      // Reload competitor to get updated data
      await loadCompetitor();
    } catch (err) {
      console.error('Failed to save competitor:', err);
      setError(err.message || 'Failed to save competitor');
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
          {competitor.sport || 'Football'} Competitor -{' '}
          <Box
            component="span"
            onClick={handleNameClick}
            sx={{
              color: '#1976d2',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1565c0',
                textDecoration: 'underline',
              },
            }}
          >
            {competitor.name || 'Competitor Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – per UI-STANDARDS: header row, 3-area layout (media | fields | booleans) */}
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
          {/* Left: Media (compact) – 72×72 avatars, Image Version per UI-STANDARDS */}
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
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={formData.LIGHT_IMAGE_URL || competitor?.LIGHT_IMAGE_URL || null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: (formData.LIGHT_IMAGE_URL || competitor?.LIGHT_IMAGE_URL) && !lightImageError ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setLightImageError(true)}
                  >
                    {(!formData.LIGHT_IMAGE_URL && !competitor?.LIGHT_IMAGE_URL) || lightImageError ? (
                      <GroupsIcon sx={{ fontSize: 36, color: '#999999' }} />
                    ) : null}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Light Image
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={formData.DARK_IMAGE_URL || competitor?.DARK_IMAGE_URL || null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: (formData.DARK_IMAGE_URL || competitor?.DARK_IMAGE_URL) && !darkImageError ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setDarkImageError(true)}
                  >
                    {(!formData.DARK_IMAGE_URL && !competitor?.DARK_IMAGE_URL) || darkImageError ? (
                      <GroupsIcon sx={{ fontSize: 36, color: '#999999' }} />
                    ) : null}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Dark Image
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenImageDialog(null)}
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Upload Image
              </Button>
              <Button
                variant="contained"
                size="small"
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Image Version ({competitor?.IMG_VER || 1})
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields – grid 5 per row, uniform height per UI-STANDARDS */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: '0.5fr 0.5fr 1fr 1fr 1fr 1fr' },
                gap: { xs: 1.5, md: 1.25 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={sports}
                  getOptionLabel={(option) => option.name || option.ALIAS_NAME || ''}
                  value={sports.find((s) => Number(s.SPORT_TYPE_ID) === Number(formData.SPORT_TYPE_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('SPORT_TYPE_ID', newValue?.SPORT_TYPE_ID ?? '')}
                  isOptionEqualToValue={(option, value) => Number(option?.SPORT_TYPE_ID) === Number(value?.SPORT_TYPE_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS.SPORT_TYPE_ID} size="small" sx={fieldSx} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => (option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || '')}
                  value={countries.find((c) => Number(c.COUNTRY_ID) === Number(formData.COUNTRY_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('COUNTRY_ID', newValue?.COUNTRY_ID ?? '')}
                  isOptionEqualToValue={(option, value) => Number(option?.COUNTRY_ID) === Number(value?.COUNTRY_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS.COUNTRY_ID} size="small" sx={fieldSx} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.MAIN_COMPETITION}</InputLabel>
                  <Select
                    value={formData.MAIN_COMPETITION || ''}
                    label={FIELD_LABELS.MAIN_COMPETITION}
                    onChange={(e) => handleFormChange('MAIN_COMPETITION', e.target.value)}
                    disabled={!formData.SPORT_TYPE_ID}
                  >
                    {(() => {
                      const availableCompetitions = formData.SPORT_TYPE_ID
                        ? competitions.filter(c => c.SPORT_TYPE_ID === formData.SPORT_TYPE_ID)
                        : competitions;
                      return availableCompetitions.length > 0 ? availableCompetitions.map(comp => (
                        <MenuItem key={comp.COMPETITION_ID} value={comp.COMPETITION_ID}>
                          {comp.name || '-'}
                        </MenuItem>
                      )) : (
                        <MenuItem value="" disabled>Select sport first</MenuItem>
                      );
                    })()}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.COMPETITOR_TYPE}</InputLabel>
                  <Select
                    value={formData.COMPETITOR_TYPE || ''}
                    label={FIELD_LABELS.COMPETITOR_TYPE}
                    onChange={(e) => handleFormChange('COMPETITOR_TYPE', e.target.value)}
                  >
                    {competitorTypes.map((ct) => (
                      <MenuItem key={ct.COMPETITOR_TYPE_ID} value={ct.COMPETITOR_TYPE_ID}>{ct.COMPETITOR_TYPE}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.GENDER}</InputLabel>
                  <Select
                    value={formData.GENDER || ''}
                    label={FIELD_LABELS.GENDER}
                    onChange={(e) => handleFormChange('GENDER', e.target.value)}
                  >
                    <MenuItem value={1}>Male</MenuItem>
                    <MenuItem value={2}>Female</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.FOUNDED}
                  value={formData.FOUNDED || ''}
                  onChange={(e) => handleFormChange('FOUNDED', e.target.value ? parseInt(e.target.value) : null)}
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.SELECTIONS_RANK}
                  value={formData.SELECTIONS_RANK || ''}
                  disabled
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.SYMBOLIC_NAME}
                  value={symbolicNameTerm ? resolveTermName(symbolicNameTerm) || '' : ''}
                  placeholder={!symbolicNameTerm ? 'Add New' : ''}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  onClick={handleSymbolicNameClick}
                  sx={{
                    ...fieldSx,
                    '& .MuiOutlinedInput-input': { cursor: 'pointer', color: !symbolicNameTerm ? '#1976d2' : 'inherit' },
                    '& .MuiInputBase-input::placeholder': { color: '#1976d2', opacity: 1 },
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.TITLE_NAME}
                  value={titleNameTerm ? resolveTermName(titleNameTerm) || '' : ''}
                  placeholder={!titleNameTerm ? 'Add New' : ''}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  onClick={handleTitleNameClick}
                  sx={{
                    ...fieldSx,
                    '& .MuiOutlinedInput-input': { cursor: 'pointer', color: !titleNameTerm ? '#1976d2' : 'inherit' },
                    '& .MuiInputBase-input::placeholder': { color: '#1976d2', opacity: 1 },
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
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
                        handleFormChange('CITY_ID', value);
                      }
                    }}
                  >
                    <MenuItem value="">None</MenuItem>
                    {getTermsByCategory('Cities').map(term => (
                      <MenuItem key={term.id} value={term.id}>
                        {resolveTermName(term) || `Term ${term.id}`}
                      </MenuItem>
                    ))}
                    <MenuItem value="NEW" sx={{ fontStyle: 'italic', color: '#1976d2' }}>+ New City</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.VENUE_ID}</InputLabel>
                  <Select
                    value={venueSelectValue}
                    label={FIELD_LABELS.VENUE_ID}
                    onChange={(e) => {
                      setVenueSelectValue(e.target.value);
                      handleFormChange('VENUE_ID', e.target.value);
                    }}
                    disabled={!formData.COUNTRY_ID}
                  >
                    <MenuItem value="">None</MenuItem>
                    {(() => {
                      const currentCountryId = formData.COUNTRY_ID || competitor?.COUNTRY_ID;
                      const availableVenues = getVenuesByCountry(currentCountryId);
                      if (venueSelectValue) {
                        const currentVenueId = parseInt(venueSelectValue);
                        const currentVenue = venues.find(v => v.VENUE_ID === currentVenueId);
                        if (currentVenue && !availableVenues.find(v => v.VENUE_ID === currentVenueId)) {
                          availableVenues.push(currentVenue);
                        }
                      }
                      return availableVenues.length > 0 ? availableVenues.map(venue => (
                        <MenuItem key={venue.VENUE_ID} value={venue.VENUE_ID}>
                          {venue.name || `Venue ${venue.VENUE_ID}`}
                        </MenuItem>
                      )) : (
                        <MenuItem value="" disabled>
                          {formData.COUNTRY_ID ? 'No venues available for this country' : 'Select a country first'}
                        </MenuItem>
                      );
                    })()}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          {/* Right: Booleans only – gap 0.5 per UI-STANDARDS */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.ENABLE_DASHBOARD_BUZZ || false}
                  onChange={(e) => handleFormChange('ENABLE_DASHBOARD_BUZZ', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.ENABLE_DASHBOARD_BUZZ}</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_SEARCH || false}
                  onChange={(e) => handleFormChange('HIDE_ON_SEARCH', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.HIDE_ON_SEARCH}</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_CATALOG || false}
                  onChange={(e) => handleFormChange('HIDE_ON_CATALOG', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.HIDE_ON_CATALOG}</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_PLAYER_GAME_CARD || false}
                  onChange={(e) => handleFormChange('HIDE_PLAYER_GAME_CARD', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.HIDE_PLAYER_GAME_CARD}</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.SUPPORT_DASHBOARD || false}
                  onChange={(e) => handleFormChange('SUPPORT_DASHBOARD', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{FIELD_LABELS.SUPPORT_DASHBOARD}</Typography>}
            />
          </Box>
        </Box>
      </Paper>

      {/* Tabs Section */}
      <Paper sx={{ boxShadow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setUrlState({ tab: newValue })}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: '#1976d2',
            },
          }}
        >
          <Tab label="Statistics" />
          <Tab label="Squad" />
          <Tab label="Trophies" />
          <Tab label="Colors" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {/* Tab content layout per UI-STANDARDS: fields left (responsive grid), booleans right; dynamic width */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Statistics Reset Date"
                        value={formData.STATISTICS_RESET_DATE || ''}
                        onChange={(e) => handleFormChange('STATISTICS_RESET_DATE', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={fieldSx}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', flexDirection: 'column', gap: 0.5 }} />
              </Box>
            </Box>
          )}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Squad
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Minimum Athletes in Squad"
                        value={formData.MINIMUM_ATHLETES_IN_SQUAD || ''}
                        onChange={(e) => handleFormChange('MINIMUM_ATHLETES_IN_SQUAD', e.target.value ? parseInt(e.target.value) : null)}
                        sx={fieldSx}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.SHOW_ATHLETES_SALARY || false}
                        onChange={(e) => handleFormChange('SHOW_ATHLETES_SALARY', e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Show Athletes Salary</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.LINEUP_INSIGHTS_ENABLED || false}
                        onChange={(e) => handleFormChange('LINEUP_INSIGHTS_ENABLED', e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Lineup Insights Enabled</Typography>}
                  />
                </Box>
              </Box>
            </Box>
          )}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Trophies
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }} />
                <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.SHOULD_SHOW_TROPHIES || false}
                        onChange={(e) => handleFormChange('SHOULD_SHOW_TROPHIES', e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Should Show Trophies</Typography>}
                  />
                </Box>
              </Box>
            </Box>
          )}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Colors
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Home Main"
                        value={formData.HOME_MAIN_COLOR || '#000000'}
                        onChange={(e) => handleFormChange('HOME_MAIN_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Home Secondary"
                        value={formData.HOME_SECONDARY_COLOR || '#ffffff'}
                        onChange={(e) => handleFormChange('HOME_SECONDARY_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Away Main"
                        value={formData.AWAY_MAIN_COLOR || '#000000'}
                        onChange={(e) => handleFormChange('AWAY_MAIN_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Away Secondary"
                        value={formData.AWAY_SECONDARY_COLOR || '#ffffff'}
                        onChange={(e) => handleFormChange('AWAY_SECONDARY_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Third Color"
                        value={formData.THIRD_COLOR || '#000000'}
                        onChange={(e) => handleFormChange('THIRD_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="color"
                        label="Shot Chart Color"
                        value={formData.SHOT_CHART_COLOR || '#000000'}
                        onChange={(e) => handleFormChange('SHOT_CHART_COLOR', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { py: 1, height: '40px' } }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Image Edit Dialog – one dialog with tabs for Light / Dark (like AthleteDetails) */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload / Edit Image
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
            <Tabs
              value={editingImageType === 'light' ? 0 : 1}
              onChange={(e, newValue) => {
                const newType = newValue === 0 ? 'light' : 'dark';
                setEditingImageType(newType);
                if (newType === 'light') {
                  setImageUrlValue(formData.LIGHT_IMAGE_URL || competitor?.LIGHT_IMAGE_URL || '');
                } else {
                  setImageUrlValue(formData.DARK_IMAGE_URL || competitor?.DARK_IMAGE_URL || '');
                }
              }}
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
                '& .Mui-selected': { color: '#1976d2' },
              }}
            >
              <Tab label="Light Image" />
              <Tab label="Dark Image" />
            </Tabs>
          </Box>
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
            helperText="Enter the URL of the image"
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
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    zIndex: -1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Invalid image URL
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveImageUrl}
            variant="contained"
            color="primary"
            disabled={loading}
          >
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
        initialCategory={currentTermCategory || "Competitors Names"}
      />

    </Box>
  );
}

export default CompetitorDetails;
