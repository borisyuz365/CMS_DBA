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
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import ConfirmationDialog from '../../reuse/ConfirmationDialog';
import TransferHistoryTable from '../components/TransferHistoryTable';
import StatisticsTable from '../components/StatisticsTable';
import StatisticsDialog from '../components/StatisticsDialog';
import ContractDialog from '../components/ContractDialog';
import InjuriesSuspensionsTable from '../components/InjuriesSuspensionsTable';
import InjuryDialog from '../components/InjuryDialog';
import SuspensionDialog from '../components/SuspensionDialog';
import TrophiesTable from '../components/TrophiesTable';
import TrophyDialog from '../components/TrophyDialog';
import api from '../services/api';

function AthleteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [athleteStatuses, setAthleteStatuses] = useState([]);
  const [sports, setSports] = useState([]);
  const [positionTypes, setPositionTypes] = useState([]);
  const [formationPositionTypes, setFormationPositionTypes] = useState([]);
  const [surfaces, setSurfaces] = useState([]);
  const [tennisBackhandTypes, setTennisBackhandTypes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [urlState, setUrlState] = useUrlFilters({
    tab: { type: 'number', default: 0 },
  });
  const activeTab = urlState.tab;
  const [clubImageError, setClubImageError] = useState(false);
  const [nationalImageError, setNationalImageError] = useState(false);
  
  // Contract state
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    contract: null,
  });
  const [competitions, setCompetitions] = useState([]);
  
  // Statistics state
  const [statistics, setStatistics] = useState([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsTypes, setStatisticsTypes] = useState([]);
  const [statisticsDialogOpen, setStatisticsDialogOpen] = useState(false);
  const [editingStatisticsGroup, setEditingStatisticsGroup] = useState(null);
  const [deleteStatisticsConfirmDialog, setDeleteStatisticsConfirmDialog] = useState({
    open: false,
    statisticsGroup: null,
  });
  const [seasons, setSeasons] = useState([]);
  const [seasonCompetitors, setSeasonCompetitors] = useState([]);
  
  // Injuries & Suspensions state
  const [injuries, setInjuries] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [injuriesSuspensionsLoading, setInjuriesSuspensionsLoading] = useState(false);
  const [injuryDialogOpen, setInjuryDialogOpen] = useState(false);
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState(null);
  const [editingSuspension, setEditingSuspension] = useState(null);
  const [deleteInjuryConfirmDialog, setDeleteInjuryConfirmDialog] = useState({
    open: false,
    injury: null,
  });
  const [deleteSuspensionConfirmDialog, setDeleteSuspensionConfirmDialog] = useState({
    open: false,
    suspension: null,
  });
  
  // Trophies state
  const [trophies, setTrophies] = useState([]);
  const [trophiesLoading, setTrophiesLoading] = useState(false);
  const [trophyDialogOpen, setTrophyDialogOpen] = useState(false);
  const [editingTrophy, setEditingTrophy] = useState(null);
  const [deleteTrophyConfirmDialog, setDeleteTrophyConfirmDialog] = useState({
    open: false,
    trophy: null,
  });
  
  // Image edit dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageType, setEditingImageType] = useState(null); // 'club' or 'national'
  const [imageUrlValue, setImageUrlValue] = useState('');
  
  // Form state for General Details (using IDs like in AthletesList)
  const [formData, setFormData] = useState({
    SPORT_TYPE_ID: '',
    NATIONALITY: '',
    BIRTHDATE: '',
    status: '',
    statusDate: '',
    COUNTRY_OF_BIRTH: '',
    HEIGHT: '',
    WEIGHT: '',
    currentClubId: '',
    currentClubName: '',
    GENDER: '',
    POSITION: '',
    FORMATION_POSITION: '',
    PREFERRED_SIDE: '',
    jerseyNumber: '',
    ENABLE_BUZZ: false,
    HIDE_ON_SEARCH: false,
    HIDE_PLAYER_GAME_CARD: false,
    HIDE_ON_CATALOG: false,
    // New fields
    TOTAL_SOCIAL_FOLLOWERS: '',
    SELECTION_RANK: '',
    PREFERRED_SURFACE: '',
    BACKHAND_TYPE: '',
    PRIZE_MONEY: '',
    HIGHEST_CAREER_RANKING: '',
    MARKET_VALUE: '',
    MARKET_VALUE_CURRENCY: '',
  });

  useEffect(() => {
    loadAthlete();
    loadTermsAndCategories();
    loadCountriesAndCompetitors();
    loadAthleteStatuses();
    loadSportsAndPositions();
    loadTennisOptions();
    loadCurrencies();
    loadCompetitions();
    loadSeasons();
    setClubImageError(false); // Reset image errors when athlete changes
    setNationalImageError(false);
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 0) {
      loadContracts();
    }
    if (id && activeTab === 1) {
      loadStatistics();
    }
    if (id && activeTab === 2) {
      loadInjuriesAndSuspensions();
    }
    if (id && activeTab === 3) {
      loadTrophies();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (athlete && athleteStatuses.length > 0) {
      // Determine current status - use STATUS field if available, otherwise calculate from dates
      let currentStatus = 'active';
      let statusDate = '';
      
      if (athlete.STATUS) {
        // Use STATUS field if it exists (1=active, 2=retired, 3=dead)
        const statusFromId = athleteStatuses.find(s => s.STATUS_TYPE_ID === athlete.STATUS);
        if (statusFromId) {
          currentStatus = statusFromId.STATUS_TYPE;
          // Get the date if status requires it
          if (statusFromId.REQUIRES_DATE && statusFromId.DATE_FIELD) {
            statusDate = athlete[statusFromId.DATE_FIELD] || '';
          }
        }
      } else {
        // Fallback: Calculate current status based on dates (for backwards compatibility)
        if (athlete.DATE_OF_DEATH) {
          currentStatus = 'dead';
          statusDate = athlete.DATE_OF_DEATH;
        } else if (athlete.DATE_OF_RETIREMENT) {
          currentStatus = 'retired';
          statusDate = athlete.DATE_OF_RETIREMENT;
        }
      }
      
      // Format BIRTHDATE for input (YYYY-MM-DD)
      let birthdateValue = '';
      if (athlete.BIRTHDATE) {
        const date = new Date(athlete.BIRTHDATE);
        if (!isNaN(date.getTime())) {
          birthdateValue = date.toISOString().split('T')[0];
        }
      }
      
      setFormData({
        SPORT_TYPE_ID: athlete.SPORT_TYPE_ID || '',
        NATIONALITY: athlete.NATIONALITY || '',
        BIRTHDATE: birthdateValue,
        status: currentStatus,
        statusDate: statusDate ? new Date(statusDate).toISOString().split('T')[0] : '',
        COUNTRY_OF_BIRTH: athlete.COUNTRY_OF_BIRTH || '',
        HEIGHT: athlete.HEIGHT || '',
        WEIGHT: athlete.WEIGHT || '',
        currentClubId: athlete.currentClubId || '',
        currentClubName: athlete.currentClubName || athlete.mainClub || '',
        GENDER: athlete.GENDER || '',
        POSITION: athlete.POSITION || '',
        FORMATION_POSITION: athlete.FORMATION_POSITION || '',
        PREFERRED_SIDE: athlete.PREFERRED_SIDE || '',
        jerseyNumber: athlete.jerseyNumber || '',
        ENABLE_BUZZ: athlete.ENABLE_BUZZ || false,
        HIDE_ON_SEARCH: athlete.HIDE_ON_SEARCH || false,
        HIDE_PLAYER_GAME_CARD: athlete.HIDE_PLAYER_GAME_CARD || false,
        HIDE_ON_CATALOG: athlete.HIDE_ON_CATALOG || false,
        // New fields
        TOTAL_SOCIAL_FOLLOWERS: athlete.TOTAL_SOCIAL_FOLLOWERS || '',
        SELECTION_RANK: athlete.SELECTION_RANK || '',
        PREFERRED_SURFACE: athlete.PREFERRED_SURFACE || '',
        BACKHAND_TYPE: athlete.BACKHAND_TYPE || '',
        PRIZE_MONEY: athlete.PRIZE_MONEY || '',
        HIGHEST_CAREER_RANKING: athlete.HIGHEST_CAREER_RANKING || '',
        MARKET_VALUE: athlete.MARKET_VALUE || '',
        MARKET_VALUE_CURRENCY: athlete.MARKET_VALUE_CURRENCY || '',
      });
    }
  }, [athlete, athleteStatuses]);

  const loadCountriesAndCompetitors = async () => {
    try {
      const [countriesData, competitorsData] = await Promise.all([
        api.getCountries(),
        api.getCompetitors(),
      ]);
      setCountries(countriesData);
      setCompetitors(competitorsData);
    } catch (err) {
      console.error('Failed to load countries/competitors:', err);
    }
  };

  const loadSportsAndPositions = async () => {
    try {
      const [sportsData, posTypesData, fpTypesData] = await Promise.all([
        api.getSports(),
        api.getPositionTypes(),
        api.getFormationPositionTypes(),
      ]);
      setSports(sportsData || []);
      setPositionTypes(posTypesData || []);
      setFormationPositionTypes(fpTypesData || []);
    } catch (err) {
      console.error('Failed to load sports/positions:', err);
    }
  };

  const loadTennisOptions = async () => {
    try {
      const [surfacesData, backhandTypesData] = await Promise.all([
        api.getTennisCourtSurfaces(),
        api.getTennisBackhandTypes(),
      ]);
      setSurfaces(surfacesData || []);
      setTennisBackhandTypes(backhandTypesData || []);
    } catch (err) {
      console.error('Failed to load tennis options:', err);
    }
  };

  const loadCurrencies = async () => {
    try {
      const currenciesData = await api.getCurrencies();
      setCurrencies(currenciesData || []);
    } catch (err) {
      console.error('Failed to load currencies:', err);
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

  const loadSeasons = async () => {
    try {
      const [seasonsData, seasonCompetitorsData] = await Promise.all([
        api.getSeasons(),
        api.getSeasonCompetitors(),
      ]);
      setSeasons(seasonsData || []);
      setSeasonCompetitors(seasonCompetitorsData || []);
    } catch (err) {
      console.error('Failed to load seasons:', err);
    }
  };

  const loadInjuriesAndSuspensions = async () => {
    if (!id) return;
    try {
      setInjuriesSuspensionsLoading(true);
      const [injuriesData, suspensionsData] = await Promise.all([
        api.getAthleteInjuries(id),
        api.getAthleteSuspensions(id),
      ]);
      setInjuries(injuriesData || []);
      setSuspensions(suspensionsData || []);
    } catch (err) {
      console.error('Failed to load injuries/suspensions:', err);
      setError(err.message || 'Failed to load injuries/suspensions');
    } finally {
      setInjuriesSuspensionsLoading(false);
    }
  };

  const loadTrophies = async () => {
    if (!id) return;
    try {
      setTrophiesLoading(true);
      const trophiesData = await api.getAthleteTrophies(id);
      setTrophies(trophiesData || []);
    } catch (err) {
      console.error('Failed to load trophies:', err);
      setError(err.message || 'Failed to load trophies');
    } finally {
      setTrophiesLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!id) return;
    try {
      setStatisticsLoading(true);
      const [statisticsData, statisticsTypesData] = await Promise.all([
        api.getAthleteStatistics(id),
        api.getStatisticsTypes(),
      ]);
      setStatistics(statisticsData || []);
      setStatisticsTypes(statisticsTypesData || []);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setStatisticsLoading(false);
    }
  };

  const loadContracts = async () => {
    if (!id) return;
    try {
      setContractsLoading(true);
      const contractsData = await api.getAthleteContracts(id);
      setContracts(contractsData || []);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError(err.message || 'Failed to load contracts');
    } finally {
      setContractsLoading(false);
    }
  };

  const loadAthleteStatuses = async () => {
    try {
      const statuses = await api.getAthleteStatuses();
      setAthleteStatuses(statuses);
    } catch (err) {
      console.error('Failed to load athlete statuses:', err);
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

  const loadAthlete = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAthleteById(id);
      setAthlete(data);
    } catch (err) {
      setError(err.message || 'Failed to load athlete');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/athletes');
  };

  // Helper to get display name for a term (e.g. city)
  const resolveTermName = (term) => {
    if (!term) return null;
    if (term.engValue) return term.engValue;
    if (term.values && Array.isArray(term.values)) {
      const defaultValue = term.values.find(v => v.isDefault === true);
      if (defaultValue?.value) return defaultValue.value;
      const englishValue = term.values.find(v => v.languageId === 1);
      if (englishValue?.value) return englishValue.value;
      if (term.values.length > 0 && term.values[0].value) return term.values[0].value;
    }
    return null;
  };

  // Cities from terms (category "Cities") for City of Birth
  const cities = (allTerms || []).filter(t => t.category === 'Cities');

  // Handle opening image edit dialog
  const handleOpenImageDialog = (imageType) => {
    // If imageType is null, default to 'club', otherwise use the provided type
    const initialType = imageType || 'club';
    setEditingImageType(initialType);
    if (initialType === 'club') {
      setImageUrlValue(athlete?.CLUB_IMAGE_URL || '');
    } else if (initialType === 'national') {
      setImageUrlValue(athlete?.NATIONAL_IMAGE_URL || '');
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
    if (!athlete || !editingImageType) return;

    try {
      setLoading(true);
      setError(null);

      const changes = {};
      if (editingImageType === 'club') {
        changes.CLUB_IMAGE_URL = imageUrlValue.trim() || null;
        // Reset error state when updating
        setClubImageError(false);
      } else if (editingImageType === 'national') {
        changes.NATIONAL_IMAGE_URL = imageUrlValue.trim() || null;
        // Reset error state when updating
        setNationalImageError(false);
      }

      const updateData = {
        athleteId: athlete.ATHLETE_ID,
        changes
      };

      // Update athlete
      await api.updateAthletesBulk([updateData]);
      
      // Reload athlete to get updated data
      await loadAthlete();
      
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
    if (!athlete || !athlete.NAME_ID) return;
    
    try {
      const term = await api.getTermById(athlete.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setError('Failed to load term for editing');
    }
  };

  const handleTermClick = async (nameIdOrName, category) => {
    if (!nameIdOrName) return;
    
    try {
      let term;
      
      // If it's a number, treat it as NAME_ID
      if (typeof nameIdOrName === 'number' || (typeof nameIdOrName === 'string' && !isNaN(nameIdOrName))) {
        term = await api.getTermById(nameIdOrName);
      } else {
        // Otherwise, it's a name - find term by name and category
        const categoryId = category === 'Athlete Position Types' ? 8 : 
                          category === 'Athlete Formation Position Types' ? 9 : null;
        
        if (!categoryId) {
          console.error('Unknown category for term search:', category);
          return;
        }
        
        // Find term by engValue or value in the specified category
        term = allTerms.find(t => 
          t.categoryId === categoryId && 
          (t.engValue === nameIdOrName || 
           (t.values && t.values.some(v => v.value === nameIdOrName)))
        );
        
        if (!term) {
          console.error('Term not found:', nameIdOrName, 'in category', category);
          setError(`Term "${nameIdOrName}" not found in ${category}`);
          return;
        }
      }
      
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
      // Reload athlete to get updated name
      await loadAthlete();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload athlete to get updated name
      await loadAthlete();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
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

  if (!athlete) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Athlete not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If status changed, clear statusDate if new status doesn't require date
      if (field === 'status') {
        const selectedStatus = athleteStatuses.find(s => s.STATUS_TYPE === value);
        if (selectedStatus && !selectedStatus.REQUIRES_DATE) {
          updated.statusDate = '';
        }
      }
      
      // If position changed, reset formation position
      if (field === 'POSITION') {
        updated.FORMATION_POSITION = '';
      }
      
      // If sport changed, reset position and formation, and clear sport-specific fields
      if (field === 'SPORT_TYPE_ID') {
        updated.POSITION = '';
        updated.FORMATION_POSITION = '';
        // Clear tennis-specific fields
        updated.PREFERRED_SURFACE = '';
        updated.BACKHAND_TYPE = '';
        updated.PRIZE_MONEY = '';
        updated.HIGHEST_CAREER_RANKING = '';
        // Clear football-specific fields
        updated.MARKET_VALUE = '';
        updated.MARKET_VALUE_CURRENCY = '';
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare update data (like in AthletesList)
      const changes = {};

      // Always update status-related dates and STATUS field based on selected status
      // This ensures status changes are always saved, even if dates haven't changed
      const selectedStatus = athleteStatuses.find(s => s.STATUS_TYPE === formData.status);
      if (selectedStatus) {
        // Save STATUS field with STATUS_TYPE_ID (1=active, 2=retired, 3=dead)
        changes.STATUS = selectedStatus.STATUS_TYPE_ID;
        
        if (selectedStatus.REQUIRES_DATE && selectedStatus.DATE_FIELD) {
          // statusDate is already in YYYY-MM-DD format
          const dateValue = formData.statusDate || null;
          changes[selectedStatus.DATE_FIELD] = dateValue;
          
          // Always clear the other date field when setting a status
          if (selectedStatus.DATE_FIELD === 'DATE_OF_RETIREMENT') {
            changes.DATE_OF_DEATH = null;
          } else if (selectedStatus.DATE_FIELD === 'DATE_OF_DEATH') {
            changes.DATE_OF_RETIREMENT = null;
          }
        } else {
          // Active status - always clear both dates
          changes.DATE_OF_RETIREMENT = null;
          changes.DATE_OF_DEATH = null;
        }
      }

      // Update all form fields
      if (formData.SPORT_TYPE_ID !== undefined && formData.SPORT_TYPE_ID !== athlete.SPORT_TYPE_ID) {
        changes.SPORT_TYPE_ID = formData.SPORT_TYPE_ID || null;
      }
      if (formData.NATIONALITY !== undefined && formData.NATIONALITY !== athlete.NATIONALITY) {
        changes.NATIONALITY = formData.NATIONALITY || null;
      }
      if (formData.BIRTHDATE !== undefined) {
        changes.BIRTHDATE = formData.BIRTHDATE || null;
      }
      if (formData.COUNTRY_OF_BIRTH !== undefined && formData.COUNTRY_OF_BIRTH !== athlete.COUNTRY_OF_BIRTH) {
        changes.COUNTRY_OF_BIRTH = formData.COUNTRY_OF_BIRTH || null;
      }
      if (formData.HEIGHT !== undefined) {
        changes.HEIGHT = formData.HEIGHT ? parseInt(formData.HEIGHT) : null;
      }
      if (formData.WEIGHT !== undefined) {
        changes.WEIGHT = formData.WEIGHT ? parseInt(formData.WEIGHT) : null;
      }
      if (formData.GENDER !== undefined && formData.GENDER !== athlete.GENDER) {
        changes.GENDER = formData.GENDER || null;
      }
      if (formData.POSITION !== undefined && formData.POSITION !== athlete.POSITION) {
        changes.POSITION = formData.POSITION || null;
        // Reset formation position when position changes
        if (formData.POSITION !== athlete.POSITION) {
          changes.FORMATION_POSITION = null;
        }
      }
      if (formData.FORMATION_POSITION !== undefined && formData.FORMATION_POSITION !== athlete.FORMATION_POSITION) {
        changes.FORMATION_POSITION = formData.FORMATION_POSITION || null;
      }
      if (formData.PREFERRED_SIDE !== undefined && formData.PREFERRED_SIDE !== athlete.PREFERRED_SIDE) {
        changes.PREFERRED_SIDE = formData.PREFERRED_SIDE || null;
      }
      if (formData.jerseyNumber !== undefined) {
        changes.jerseyNumber = formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null;
      }
      if (formData.ENABLE_BUZZ !== undefined && formData.ENABLE_BUZZ !== athlete.ENABLE_BUZZ) {
        changes.ENABLE_BUZZ = formData.ENABLE_BUZZ;
      }
      if (formData.HIDE_ON_SEARCH !== undefined && formData.HIDE_ON_SEARCH !== athlete.HIDE_ON_SEARCH) {
        changes.HIDE_ON_SEARCH = formData.HIDE_ON_SEARCH;
      }
      if (formData.HIDE_PLAYER_GAME_CARD !== undefined && formData.HIDE_PLAYER_GAME_CARD !== athlete.HIDE_PLAYER_GAME_CARD) {
        changes.HIDE_PLAYER_GAME_CARD = formData.HIDE_PLAYER_GAME_CARD;
      }
      if (formData.HIDE_ON_CATALOG !== undefined && formData.HIDE_ON_CATALOG !== athlete.HIDE_ON_CATALOG) {
        changes.HIDE_ON_CATALOG = formData.HIDE_ON_CATALOG;
      }
      
      // Tennis-specific fields (SPORT_TYPE_ID === 3)
      if (formData.SPORT_TYPE_ID === 3) {
        if (formData.PREFERRED_SURFACE !== undefined) {
          changes.PREFERRED_SURFACE = formData.PREFERRED_SURFACE || null;
        }
        if (formData.BACKHAND_TYPE !== undefined) {
          changes.BACKHAND_TYPE = formData.BACKHAND_TYPE || null;
        }
        if (formData.PRIZE_MONEY !== undefined) {
          changes.PRIZE_MONEY = formData.PRIZE_MONEY && formData.PRIZE_MONEY !== '' ? parseFloat(formData.PRIZE_MONEY) : null;
        }
        if (formData.HIGHEST_CAREER_RANKING !== undefined) {
          changes.HIGHEST_CAREER_RANKING = formData.HIGHEST_CAREER_RANKING && formData.HIGHEST_CAREER_RANKING !== '' ? parseInt(formData.HIGHEST_CAREER_RANKING) : null;
        }
      }
      
      // Football-specific fields (SPORT_TYPE_ID === 1)
      if (formData.SPORT_TYPE_ID === 1) {
        if (formData.MARKET_VALUE !== undefined) {
          changes.MARKET_VALUE = formData.MARKET_VALUE ? parseFloat(formData.MARKET_VALUE) : null;
        }
        if (formData.MARKET_VALUE_CURRENCY !== undefined) {
          changes.MARKET_VALUE_CURRENCY = formData.MARKET_VALUE_CURRENCY || null;
        }
      }

      // Only update if there are changes
      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }

      const updateData = {
        athleteId: athlete.ATHLETE_ID,
        changes
      };

      // Update athlete
      await api.updateAthletesBulk([updateData]);
      
      // Reload athlete to get updated data
      await loadAthlete();
    } catch (err) {
      console.error('Failed to save athlete:', err);
      setError(err.message || 'Failed to save athlete');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndUpdate = async () => {
    await handleSave();
  };

  // Contract handlers
  const handleAddContract = () => {
    setEditingContract(null);
    setContractDialogOpen(true);
  };

  const handleEditContract = (contract) => {
    setEditingContract(contract);
    setContractDialogOpen(true);
  };

  const handleDeleteContract = (contract) => {
    setDeleteConfirmDialog({
      open: true,
      contract: contract,
    });
  };

  const handleConfirmDeleteContract = async () => {
    if (!deleteConfirmDialog.contract || !id) return;

    try {
      setLoading(true);
      setError(null);
      await api.deleteAthleteContract(id, deleteConfirmDialog.contract.CONTRACT_ID);
      await loadContracts();
      setDeleteConfirmDialog({ open: false, contract: null });
    } catch (err) {
      console.error('Failed to delete contract:', err);
      setError(err.message || 'Failed to delete contract');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async (contractData) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      if (editingContract) {
        // Update existing contract
        await api.updateAthleteContract(id, editingContract.CONTRACT_ID, contractData);
      } else {
        // Create new contract
        await api.createAthleteContract(id, contractData);
      }

      await loadContracts();
      setContractDialogOpen(false);
      setEditingContract(null);
    } catch (err) {
      console.error('Failed to save contract:', err);
      setError(err.message || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  // Statistics handlers
  const handleAddStatistics = () => {
    setEditingStatisticsGroup(null);
    setStatisticsDialogOpen(true);
  };

  const handleEditStatistics = (statisticsGroup) => {
    setEditingStatisticsGroup(statisticsGroup);
    setStatisticsDialogOpen(true);
  };

  const handleDeleteStatistics = (statisticsGroup) => {
    setDeleteStatisticsConfirmDialog({
      open: true,
      statisticsGroup: statisticsGroup,
    });
  };

  const handleConfirmDeleteStatistics = async () => {
    if (!deleteStatisticsConfirmDialog.statisticsGroup || !id) return;

    try {
      setLoading(true);
      setError(null);
      const group = deleteStatisticsConfirmDialog.statisticsGroup;
      await api.deleteAthleteStatistics(
        id,
        group.COMPETITION_ID,
        group.SEASON_NUM,
        group.COMPETITOR_ID
      );
      await loadStatistics();
      setDeleteStatisticsConfirmDialog({ open: false, statisticsGroup: null });
    } catch (err) {
      console.error('Failed to delete statistics:', err);
      setError(err.message || 'Failed to delete statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatistics = async (statisticsData) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      if (editingStatisticsGroup) {
        // Update existing statistics
        const group = editingStatisticsGroup;
        await api.updateAthleteStatistics(
          id,
          group.COMPETITION_ID,
          group.SEASON_NUM,
          group.COMPETITOR_ID,
          statisticsData
        );
      } else {
        // Create new statistics
        await api.createAthleteStatistics(id, statisticsData);
      }

      await loadStatistics();
      setStatisticsDialogOpen(false);
      setEditingStatisticsGroup(null);
    } catch (err) {
      console.error('Failed to save statistics:', err);
      setError(err.message || 'Failed to save statistics');
    } finally {
      setLoading(false);
    }
  };

  // Injuries handlers
  const handleAddInjury = () => {
    setEditingInjury(null);
    setInjuryDialogOpen(true);
  };

  const handleEditInjury = (injury) => {
    setEditingInjury(injury);
    setInjuryDialogOpen(true);
  };

  const handleDeleteInjury = (injury) => {
    setDeleteInjuryConfirmDialog({
      open: true,
      injury: injury,
    });
  };

  const handleConfirmDeleteInjury = async () => {
    if (!deleteInjuryConfirmDialog.injury || !id) return;

    try {
      setLoading(true);
      setError(null);
      await api.deleteAthleteInjury(id, deleteInjuryConfirmDialog.injury.INJURY_ID);
      await loadInjuriesAndSuspensions();
      setDeleteInjuryConfirmDialog({ open: false, injury: null });
    } catch (err) {
      console.error('Failed to delete injury:', err);
      setError(err.message || 'Failed to delete injury');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInjury = async (injuryData) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      if (editingInjury) {
        // Update existing injury
        await api.updateAthleteInjury(id, editingInjury.INJURY_ID, injuryData);
      } else {
        // Create new injury
        await api.createAthleteInjury(id, injuryData);
      }

      await loadInjuriesAndSuspensions();
      setInjuryDialogOpen(false);
      setEditingInjury(null);
    } catch (err) {
      console.error('Failed to save injury:', err);
      setError(err.message || 'Failed to save injury');
    } finally {
      setLoading(false);
    }
  };

  // Suspensions handlers
  const handleAddSuspension = () => {
    setEditingSuspension(null);
    setSuspensionDialogOpen(true);
  };

  const handleEditSuspension = (suspension) => {
    setEditingSuspension(suspension);
    setSuspensionDialogOpen(true);
  };

  const handleDeleteSuspension = (suspension) => {
    setDeleteSuspensionConfirmDialog({
      open: true,
      suspension: suspension,
    });
  };

  const handleConfirmDeleteSuspension = async () => {
    if (!deleteSuspensionConfirmDialog.suspension || !id) return;

    try {
      setLoading(true);
      setError(null);
      await api.deleteAthleteSuspension(id, deleteSuspensionConfirmDialog.suspension.SUSPENSION_ID);
      await loadInjuriesAndSuspensions();
      setDeleteSuspensionConfirmDialog({ open: false, suspension: null });
    } catch (err) {
      console.error('Failed to delete suspension:', err);
      setError(err.message || 'Failed to delete suspension');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuspension = async (suspensionData) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      if (editingSuspension) {
        // Update existing suspension
        await api.updateAthleteSuspension(id, editingSuspension.SUSPENSION_ID, suspensionData);
      } else {
        // Create new suspension
        await api.createAthleteSuspension(id, suspensionData);
      }

      await loadInjuriesAndSuspensions();
      setSuspensionDialogOpen(false);
      setEditingSuspension(null);
    } catch (err) {
      console.error('Failed to save suspension:', err);
      setError(err.message || 'Failed to save suspension');
    } finally {
      setLoading(false);
    }
  };

  // Trophies handlers
  const handleAddTrophy = () => {
    setEditingTrophy(null);
    setTrophyDialogOpen(true);
  };

  const handleEditTrophy = (trophy) => {
    setEditingTrophy(trophy);
    setTrophyDialogOpen(true);
  };

  const handleDeleteTrophy = (trophy) => {
    setDeleteTrophyConfirmDialog({
      open: true,
      trophy: trophy,
    });
  };

  const handleConfirmDeleteTrophy = async () => {
    if (!deleteTrophyConfirmDialog.trophy || !id) return;

    try {
      setLoading(true);
      setError(null);
      const trophy = deleteTrophyConfirmDialog.trophy;
      await api.deleteAthleteTrophy(
        id,
        trophy.COMPETITION_ID,
        trophy.SEASON_NUM,
        trophy.COMPETITOR_ID
      );
      await loadTrophies();
      setDeleteTrophyConfirmDialog({ open: false, trophy: null });
    } catch (err) {
      console.error('Failed to delete trophy:', err);
      setError(err.message || 'Failed to delete trophy');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrophy = async (trophyData) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      if (editingTrophy) {
        // Update existing trophy
        const trophy = editingTrophy;
        await api.updateAthleteTrophy(
          id,
          trophy.COMPETITION_ID,
          trophy.SEASON_NUM,
          trophy.COMPETITOR_ID,
          trophyData
        );
      } else {
        // Create new trophy
        await api.createAthleteTrophy(id, trophyData);
      }

      await loadTrophies();
      setTrophyDialogOpen(false);
      setEditingTrophy(null);
    } catch (err) {
      console.error('Failed to save trophy:', err);
      setError(err.message || 'Failed to save trophy');
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
          {athlete.sport || 'Football'} Athlete -{' '}
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
            {athlete.name || 'Athlete Details'}
          </Box>
        </Typography>
      </Box>

      {/* Unified General Details Section */}
      <Paper 
        sx={{ 
          p: 3, 
          boxShadow: 1,
          border: '1px solid #e0e0e0',
          backgroundColor: 'white',
          mb: 2,
        }}
      >
        {/* Section Header – title + Save button in same row (UI-STANDARDS) */}
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

        {/* Main Content: 3 columns - Left: Media | Middle: Fields | Right: Booleans */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'flex-start',
          }}
        >
          {/* Left: Media (compact) */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 200px' },
              minWidth: 0,
            }}
          >
            <Paper
              sx={{
                p: 1.25,
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={athlete.CLUB_IMAGE_URL && !clubImageError ? athlete.CLUB_IMAGE_URL : null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: athlete.CLUB_IMAGE_URL && !clubImageError ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setClubImageError(true)}
                  >
                    {(!athlete.CLUB_IMAGE_URL || clubImageError) && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        No Image
                      </Typography>
                    )}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Club
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={athlete.NATIONAL_IMAGE_URL && !nationalImageError ? athlete.NATIONAL_IMAGE_URL : null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: athlete.NATIONAL_IMAGE_URL && !nationalImageError ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setNationalImageError(true)}
                  >
                    {(!athlete.NATIONAL_IMAGE_URL || nationalImageError) && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        No Image
                      </Typography>
                    )}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    National
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
                fullWidth
                size="small"
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', py: 0.5 }}
              >
                Image Version ({athlete.IMG_VER || 1})
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields (dynamic width) */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
              {/* Row 1 */}
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={sports}
                  getOptionLabel={(option) => option.name || option.ALIAS_NAME || ''}
                  value={sports.find((s) => Number(s.SPORT_TYPE_ID) === Number(formData.SPORT_TYPE_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('SPORT_TYPE_ID', newValue?.SPORT_TYPE_ID ?? '')}
                  isOptionEqualToValue={(option, value) => Number(option?.SPORT_TYPE_ID) === Number(value?.SPORT_TYPE_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label="Sport Type" size="small" sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1 }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Nationality</InputLabel>
                  <Select
                    value={formData.NATIONALITY || ''}
                    label="Nationality"
                    onChange={(e) => handleFormChange('NATIONALITY', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1,
                      },
                    }}
                  >
                    {countries.map(country => (
                      <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                        {country.EMOJI ? `${country.EMOJI} ` : ''}{country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Birthdate"
                  value={formData.BIRTHDATE || ''}
                  onChange={(e) => handleFormChange('BIRTHDATE', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-input': {
                      py: 1,
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1,
                      },
                    }}
                  >
                    {athleteStatuses.map(status => (
                      <MenuItem key={status.STATUS_TYPE_ID} value={status.STATUS_TYPE}>
                        {status.STATUS_TYPE.charAt(0).toUpperCase() + status.STATUS_TYPE.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {/* Status Date (conditional) */}
              {formData.status && (() => {
                const selectedStatus = athleteStatuses.find(s => s.STATUS_TYPE === formData.status);
                return selectedStatus && selectedStatus.REQUIRES_DATE ? (
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label={selectedStatus.DATE_FIELD === 'DATE_OF_RETIREMENT' ? 'Retirement Date' : 'Death Date'}
                      value={formData.statusDate || ''}
                      onChange={(e) => handleFormChange('statusDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-input': {
                          py: 1,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Box>
                ) : null;
              })()}
              
              {/* Row 3 - City of Birth (from terms category Cities, 5 default + search) */}
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  size="small"
                  options={cities}
                  value={cities.find(c => c.id === formData.COUNTRY_OF_BIRTH) || null}
                  getOptionLabel={(option) => resolveTermName(option) || `Term ${option.id}`}
                  onChange={(e, newValue) => handleFormChange('COUNTRY_OF_BIRTH', newValue?.id ?? '')}
                  filterOptions={(options, state) => {
                    if (!state.inputValue) return options.slice(0, 5);
                    const input = state.inputValue.toLowerCase();
                    const filtered = options.filter(opt =>
                      (resolveTermName(opt) || '').toLowerCase().includes(input)
                    );
                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="City of Birth"
                      sx={{
                        '& .MuiOutlinedInput-input': { py: 1 },
                        '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                      }}
                    />
                  )}
                />
              </Box>
              {/* Height + Jersey Number (one slot, side by side - like Market Value + Currency; Jersey hidden for tennis) */}
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Height"
                    value={formData.HEIGHT || ''}
                    onChange={(e) => handleFormChange('HEIGHT', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-input': { py: 1 },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                    }}
                  />
                  {formData.SPORT_TYPE_ID !== 3 && (
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Jersey Number"
                      value={formData.jerseyNumber || ''}
                      onChange={(e) => handleFormChange('jerseyNumber', e.target.value ? parseInt(e.target.value) : null)}
                      sx={{
                        '& .MuiOutlinedInput-input': { py: 1 },
                        '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                      }}
                    />
                  )}
                </Box>
              </Box>
              
              {/* Row 4 - Club fields (hidden for tennis) */}
              {formData.SPORT_TYPE_ID !== 3 && (
                <>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Current Club Name"
                      value={formData.currentClubName || ''}
                      onChange={(e) => handleFormChange('currentClubName', e.target.value)}
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-input': {
                          py: 1,
                          backgroundColor: '#f5f5f5',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.75rem',
                        },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    />
                  </Box>
                </>
              )}
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Gender</InputLabel>
                  <Select
                    value={formData.GENDER || ''}
                    label="Gender"
                    onChange={(e) => handleFormChange('GENDER', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1,
                      },
                    }}
                  >
                    <MenuItem value={1}>Male</MenuItem>
                    <MenuItem value={2}>Female</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Row 5 - Position fields (hidden for tennis) */}
              {formData.SPORT_TYPE_ID !== 3 && (
                <>
                  <Box sx={{ minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Position</InputLabel>
                      <Select
                        value={formData.POSITION ?? ''}
                        label="Position"
                        onChange={(e) => handleFormChange('POSITION', e.target.value)}
                        disabled={!formData.SPORT_TYPE_ID}
                        sx={{
                          '& .MuiOutlinedInput-input': {
                            py: 1,
                          },
                        }}
                      >
                        {(() => {
                          const availablePositions = positionTypes.filter(p => p.SPORT_TYPE_ID === formData.SPORT_TYPE_ID);
                          return availablePositions.length > 0 ? availablePositions.map(position => (
                            <MenuItem key={position.POSITION_TYPE_ID} value={position.POSITION_TYPE_ID}>
                              {position.name || position.ALIAS_NAME}
                            </MenuItem>
                          )) : (
                            <MenuItem value="" disabled>Select sport first</MenuItem>
                          );
                        })()}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Formation Position</InputLabel>
                      <Select
                        value={formData.FORMATION_POSITION ?? ''}
                        label="Formation Position"
                        onChange={(e) => handleFormChange('FORMATION_POSITION', e.target.value)}
                        disabled={formData.POSITION === null || formData.POSITION === undefined || formData.POSITION === ''}
                        sx={{
                          '& .MuiOutlinedInput-input': {
                            py: 1,
                          },
                        }}
                      >
                        {(() => {
                          if (formData.POSITION === null || formData.POSITION === undefined || formData.POSITION === '') {
                            return <MenuItem value="" disabled>Select position first</MenuItem>;
                          }
                          const availableFormPositions = formationPositionTypes.filter(fp =>
                            fp.SPORT_TYPE_ID === formData.SPORT_TYPE_ID && fp.POSITION_ID === formData.POSITION
                          );
                          return availableFormPositions.length > 0 ? availableFormPositions.map(formPos => (
                            <MenuItem key={formPos.FORMATION_POSITION_TYPE_ID} value={formPos.FORMATION_POSITION_TYPE_ID}>
                              {formPos.name || formPos.ALIAS_NAME}
                            </MenuItem>
                          )) : (
                            <MenuItem value="" disabled>No formation positions available</MenuItem>
                          );
                        })()}
                      </Select>
                    </FormControl>
                  </Box>
                </>
              )}
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Preferred Side</InputLabel>
                  <Select
                    value={formData.PREFERRED_SIDE || ''}
                    label="Preferred Side"
                    onChange={(e) => handleFormChange('PREFERRED_SIDE', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-input': {
                        py: 1,
                      },
                    }}
                  >
                    <MenuItem value="Right">Right</MenuItem>
                    <MenuItem value="Left">Left</MenuItem>
                    <MenuItem value="Both">Both</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Row 7 - View Only Fields (All Athletes) */}
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Total Social Followers"
                  value={formData.TOTAL_SOCIAL_FOLLOWERS || ''}
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-input': {
                      py: 1,
                      backgroundColor: '#f5f5f5',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                />
              </Box>
              {/* Row 8 - Tennis Specific Fields (SPORT_TYPE_ID === 3) */}
              {formData.SPORT_TYPE_ID === 3 && (
                <>
                  {/* Preferred Surface */}
                  <Box sx={{ minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Preferred Surface</InputLabel>
                      <Select
                        value={formData.PREFERRED_SURFACE || ''}
                        label="Preferred Surface"
                        onChange={(e) => handleFormChange('PREFERRED_SURFACE', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-input': {
                            py: 1,
                          },
                        }}
                      >
                        <MenuItem value="">None</MenuItem>
                        {surfaces.map(surface => (
                          <MenuItem key={surface.SURFACE_ID} value={surface.SURFACE_NAME}>
                            {surface.SURFACE_NAME}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {/* Backhand Type: options from backend/data/tennis_backhand_types.json only */}
                  <Box sx={{ minWidth: 0 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Backhand Type</InputLabel>
                      <Select
                        value={formData.BACKHAND_TYPE || ''}
                        label="Backhand Type"
                        onChange={(e) => handleFormChange('BACKHAND_TYPE', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-input': {
                            py: 1,
                          },
                        }}
                      >
                        <MenuItem value="">None</MenuItem>
                        {tennisBackhandTypes.map(backhandType => (
                          <MenuItem key={backhandType.BACKHAND_TYPE_ID} value={backhandType.BACKHAND_TYPE_NAME}>
                            {backhandType.BACKHAND_TYPE_NAME}
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
                      label="Prize Money"
                      value={formData.PRIZE_MONEY || ''}
                      onChange={(e) => handleFormChange('PRIZE_MONEY', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-input': {
                          py: 1,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Highest Career Ranking"
                      value={formData.HIGHEST_CAREER_RANKING || ''}
                      onChange={(e) => handleFormChange('HIGHEST_CAREER_RANKING', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-input': {
                          py: 1,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Box>
                </>
              )}
              
              {/* Row 9 - Football Specific Fields (SPORT_TYPE_ID === 1) */}
              {formData.SPORT_TYPE_ID === 1 && (
                <>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Market Value"
                        value={formData.MARKET_VALUE || ''}
                        onChange={(e) => handleFormChange('MARKET_VALUE', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-input': {
                            py: 1,
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.75rem',
                          },
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Currency</InputLabel>
                        <Select
                          value={formData.MARKET_VALUE_CURRENCY || ''}
                          label="Currency"
                          onChange={(e) => handleFormChange('MARKET_VALUE_CURRENCY', e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-input': {
                              py: 1,
                            },
                          }}
                        >
                          {currencies.map(currency => (
                            <MenuItem key={currency.CURRENCY_ID} value={currency.CURRENCY_ID}>
                              {currency.SYMBOL} {currency.CURRENCY_CODE}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Right: Booleans (dynamic width) */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 auto' },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              flexWrap: 'wrap',
              gap: 0.5,
              alignItems: { xs: 'stretch', md: 'flex-start' },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.ENABLE_BUZZ || false}
                  onChange={(e) => handleFormChange('ENABLE_BUZZ', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Buzz</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_SEARCH || false}
                  onChange={(e) => handleFormChange('HIDE_ON_SEARCH', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Search Hide</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_PLAYER_GAME_CARD || false}
                  onChange={(e) => handleFormChange('HIDE_PLAYER_GAME_CARD', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Hide Player Game Card</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_CATALOG || false}
                  onChange={(e) => handleFormChange('HIDE_ON_CATALOG', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Catalog Hide</Typography>}
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
          <Tab label="Transfer History & National Teams" />
          <Tab label="Statistics" />
          <Tab label="Injuries & Suspensions" />
          <Tab label="Trophies" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <TransferHistoryTable
              contracts={contracts}
              onEdit={handleEditContract}
              onDelete={handleDeleteContract}
              onAdd={handleAddContract}
              competitors={competitors}
              countries={countries}
              competitions={competitions}
              positionTypes={positionTypes}
              formationPositionTypes={formationPositionTypes}
              currencies={currencies}
              loading={contractsLoading}
              onTermClick={handleTermClick}
            />
          )}
          {activeTab === 1 && (
            <StatisticsTable
              statistics={statistics}
              statisticsTypes={statisticsTypes}
              competitions={competitions}
              countries={countries}
              competitors={competitors}
              loading={statisticsLoading}
              onEdit={handleEditStatistics}
              onDelete={handleDeleteStatistics}
              onAdd={handleAddStatistics}
            />
          )}
          {activeTab === 2 && (
            <InjuriesSuspensionsTable
              injuries={injuries}
              suspensions={suspensions}
              onEditInjury={handleEditInjury}
              onDeleteInjury={handleDeleteInjury}
              onAddInjury={handleAddInjury}
              onEditSuspension={handleEditSuspension}
              onDeleteSuspension={handleDeleteSuspension}
              onAddSuspension={handleAddSuspension}
              competitions={competitions}
              loading={injuriesSuspensionsLoading}
            />
          )}
          {activeTab === 3 && (
            <TrophiesTable
              trophies={trophies}
              competitions={competitions}
              competitors={competitors}
              countries={countries}
              seasons={seasons}
              loading={trophiesLoading}
              onEdit={handleEditTrophy}
              onDelete={handleDeleteTrophy}
              onAdd={handleAddTrophy}
            />
          )}
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
          Upload / Edit Image
        </DialogTitle>
        <DialogContent>
          {/* Image Type Selection Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
            <Tabs
              value={editingImageType === 'club' ? 0 : 1}
              onChange={(e, newValue) => {
                const newType = newValue === 0 ? 'club' : 'national';
                setEditingImageType(newType);
                if (newType === 'club') {
                  setImageUrlValue(athlete?.CLUB_IMAGE_URL || '');
                } else {
                  setImageUrlValue(athlete?.NATIONAL_IMAGE_URL || '');
                }
              }}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                },
                '& .Mui-selected': {
                  color: '#1976d2',
                },
              }}
            >
              <Tab label="Club Image" />
              <Tab label="National Image" />
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
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSaveAndUpdate}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Athletes Names"
      />

      {/* Contract Dialog */}
      <ContractDialog
        open={contractDialogOpen}
        onClose={() => {
          setContractDialogOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        contract={editingContract}
        competitors={competitors}
        countries={countries}
        competitions={competitions}
        seasonCompetitors={seasonCompetitors}
        positionTypes={positionTypes}
        formationPositionTypes={formationPositionTypes}
        currencies={currencies}
        athleteSportTypeId={athlete?.SPORT_TYPE_ID}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, contract: null })}
        onConfirm={handleConfirmDeleteContract}
        title="Delete Contract"
        message={`Are you sure you want to delete this contract?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        dangerous={true}
      />

      {/* Statistics Dialog */}
      <StatisticsDialog
        open={statisticsDialogOpen}
        onClose={() => {
          setStatisticsDialogOpen(false);
          setEditingStatisticsGroup(null);
        }}
        onSave={handleSaveStatistics}
        statisticsGroup={editingStatisticsGroup}
        statisticsTypes={statisticsTypes}
        competitions={competitions}
        competitors={competitors}
        seasons={seasons}
        terms={allTerms}
        seasonCompetitors={seasonCompetitors}
      />

      {/* Delete Statistics Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteStatisticsConfirmDialog.open}
        onClose={() => setDeleteStatisticsConfirmDialog({ open: false, statisticsGroup: null })}
        onConfirm={handleConfirmDeleteStatistics}
        title="Delete Statistics"
        message={`Are you sure you want to delete these statistics?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        dangerous={true}
      />

      {/* Injury Dialog */}
      <InjuryDialog
        open={injuryDialogOpen}
        onClose={() => {
          setInjuryDialogOpen(false);
          setEditingInjury(null);
        }}
        onSave={handleSaveInjury}
        injury={editingInjury}
      />

      {/* Suspension Dialog */}
      <SuspensionDialog
        open={suspensionDialogOpen}
        onClose={() => {
          setSuspensionDialogOpen(false);
          setEditingSuspension(null);
        }}
        onSave={handleSaveSuspension}
        suspension={editingSuspension}
        competitions={competitions}
      />

      {/* Delete Injury Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteInjuryConfirmDialog.open}
        onClose={() => setDeleteInjuryConfirmDialog({ open: false, injury: null })}
        onConfirm={handleConfirmDeleteInjury}
        title="Delete Injury"
        message={`Are you sure you want to delete this injury?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        dangerous={true}
      />

      {/* Delete Suspension Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteSuspensionConfirmDialog.open}
        onClose={() => setDeleteSuspensionConfirmDialog({ open: false, suspension: null })}
        onConfirm={handleConfirmDeleteSuspension}
        title="Delete Suspension"
        message={`Are you sure you want to delete this suspension?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        dangerous={true}
      />

      {/* Trophy Dialog */}
      <TrophyDialog
        open={trophyDialogOpen}
        onClose={() => {
          setTrophyDialogOpen(false);
          setEditingTrophy(null);
        }}
        onSave={handleSaveTrophy}
        trophy={editingTrophy}
        competitions={competitions}
        competitors={competitors}
        seasons={seasons}
        countries={countries}
        athleteSportTypeId={athlete?.SPORT_TYPE_ID}
        seasonCompetitors={seasonCompetitors}
      />

      {/* Delete Trophy Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteTrophyConfirmDialog.open}
        onClose={() => setDeleteTrophyConfirmDialog({ open: false, trophy: null })}
        onConfirm={handleConfirmDeleteTrophy}
        title="Delete Trophy"
        message={`Are you sure you want to delete this trophy?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        dangerous={true}
      />
    </Box>
  );
}

export default AthleteDetails;
