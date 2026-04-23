import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useUrlFilters from '../hooks/useUrlFilters';
import {
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  IconButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Snackbar,
  Alert as MuiAlert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../../reuse/DataTable';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function CompetitorsList() {
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [urlState, setUrlState] = useUrlFilters({
    country: { type: 'array', default: [] },
    sportType: { type: 'array', default: [] },
    competition: { type: 'array', default: [] },
    competitorId: { type: 'string', default: '' },
    language: { type: 'string', default: '' },
    competitorName: { type: 'string', default: '' },
    showDeleted: { type: 'boolean', default: false },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });
  const [totalRows, setTotalRows] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);

  const filters = {
    country: urlState.country,
    sportType: urlState.sportType,
    competition: urlState.competition,
    competitorId: urlState.competitorId,
    language: urlState.language,
    competitorName: urlState.competitorName,
  };
  const showDeleted = urlState.showDeleted;
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage, totalRows };
  const sortConfig = { field: urlState.sortField || null, direction: urlState.sortDir };
  const groupByField = urlState.groupBy || null;

  // Data for dropdowns
  const [countries, setCountries] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [allCompetitors, setAllCompetitors] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [sports, setSports] = useState([]);

  // Term Edit Modal state
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Expanded groups state (Set of group keys that are expanded)
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Column-level filter state (for stacked header filters)
  const [columnFilters, setColumnFilters] = useState({});

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({}); // { [competitorId]: { field: value, ... } }

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  // Create Competitor Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    SPORT_TYPE_ID: '',
    COMPETITOR_TYPE: '',
    COUNTRY_ID: '',
    GENDER: '',
    MAIN_COMPETITION: '',
    FOUNDED: '',
  });
  const [createFormErrors, setCreateFormErrors] = useState({});

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  useEffect(() => {
    loadDropdownData().then(() => {
      if (window.location.search) searchCompetitors();
    });
  }, []);

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load only dropdown data (countries, competitions, languages, sports, terms, categories)
      // Use Promise.allSettled so failures don't block the page
      const [countriesResult, competitionsResult, languagesResult, sportsResult, termsResult, categoriesResult] = await Promise.allSettled([
        api.getCountries(),
        api.getCompetitions(),
        api.getLanguages(),
        api.getSports(),
        api.getTerms(),
        api.getCategories(),
      ]);
      
      if (countriesResult.status === 'fulfilled') {
        setCountries(countriesResult.value);
      } else {
        console.warn('Failed to load countries:', countriesResult.reason);
        setCountries([]);
      }
      
      if (competitionsResult.status === 'fulfilled') {
        setCompetitions(competitionsResult.value);
      } else {
        console.warn('Failed to load competitions:', competitionsResult.reason);
        setCompetitions([]);
      }
      
      
      if (languagesResult.status === 'fulfilled') {
        setLanguages(languagesResult.value.filter(lang => lang.isDisplayed));
      } else {
        console.warn('Failed to load languages:', languagesResult.reason);
        setLanguages([]);
      }
      
      if (sportsResult.status === 'fulfilled') {
        // Use sports data directly from server (already enriched)
        setSports(sportsResult.value || []);
      } else {
        console.warn('Failed to load sports:', sportsResult.reason);
        setSports([]);
      }
      
      if (termsResult.status === 'fulfilled') {
        setAllTerms(termsResult.value || []);
      } else {
        console.warn('Failed to load terms:', termsResult.reason);
        setAllTerms([]);
      }
      
      if (categoriesResult.status === 'fulfilled') {
        setAllCategories(categoriesResult.value || []);
      } else {
        console.warn('Failed to load categories:', categoriesResult.reason);
        setAllCategories([]);
      }
      
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setError(err.message || 'Failed to load dropdown data');
    } finally {
      setLoading(false);
    }
  };

  // Search competitors with filters
  const searchCompetitors = async (overrideShowDeleted = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use override value if provided, otherwise use state
      const currentShowDeleted = overrideShowDeleted !== null ? overrideShowDeleted : showDeleted;
      
      // Build filter object
      const searchFilters = {
        country: filters.country && filters.country.length > 0 ? filters.country : undefined,
        sportType: filters.sportType && filters.sportType.length > 0 ? filters.sportType : undefined,
        competition: filters.competition && filters.competition.length > 0 ? filters.competition : undefined,
        competitorId: filters.competitorId || undefined,
        competitorName: filters.competitorName || undefined,
        language: filters.language || undefined,
        showDeleted: currentShowDeleted, // Always include showDeleted (true/false)
      };
      
      // Remove undefined values (but keep showDeleted even if false)
      Object.keys(searchFilters).forEach(key => {
        if (key !== 'showDeleted' && searchFilters[key] === undefined) {
          delete searchFilters[key];
        }
      });
      
      // Load competitors with filters
      const competitorsData = await api.getCompetitorsList(searchFilters);
      setCompetitors(competitorsData);
      // Count only non-deleted competitors for pagination (unless showDeleted is true)
      const visibleCompetitors = currentShowDeleted 
        ? competitorsData 
        : competitorsData.filter(c => !c.IS_DELETED);
      setTotalRows(visibleCompetitors.length);
      setUrlState({ page: 0 });
    } catch (err) {
      console.error('Failed to search competitors:', err);
      setError(err.message || 'Failed to search competitors');
    } finally {
      setLoading(false);
    }
  };

  // Handle column-level filter changes (from table header inputs)
  const handleColumnFilterChange = (columnField, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnField]: value
    }));
  };

  // Sort, filter, and group competitors (backend filtering + column-level filtering + grouping)
  const filteredAndSortedCompetitors = useMemo(() => {
    let filtered = [...competitors];
    
    // Filter out deleted competitors if showDeleted is false (backend should handle this, but double-check)
    if (!showDeleted) {
      filtered = filtered.filter(c => !c.IS_DELETED);
    }

    // Apply column-level filters (real-time filtering from table headers)
    Object.keys(columnFilters).forEach(columnField => {
      const filterValue = columnFilters[columnField];
      if (filterValue && filterValue.trim() !== '') {
        const searchTerm = filterValue.toLowerCase().trim();
        
        filtered = filtered.filter(row => {
          const cellValue = row[columnField];
          
          // Handle null/undefined
          if (cellValue === null || cellValue === undefined) {
            return false;
          }
          
          // Convert to string for comparison
          const cellValueStr = String(cellValue).toLowerCase();
          
          // For numeric fields, try exact match first
          if (columnField === 'COMPETITOR_ID' || columnField === 'FOUNDED' || columnField === 'SELECTIONS_RANK') {
            const numValue = Number(searchTerm);
            if (!isNaN(numValue)) {
              return cellValue === numValue || cellValueStr.includes(searchTerm);
            }
          }
          
          // For date fields
          if (columnField === 'STATISTICS_RESET_DATE') {
            const dateStr = cellValue ? new Date(cellValue).toLocaleDateString('en-GB') : '';
            return dateStr.toLowerCase().includes(searchTerm);
          }
          
          // For all other fields, use contains match
          return cellValueStr.includes(searchTerm);
        });
      }
    });

    // Apply sorting (before grouping, so groups are sorted)
    if (sortConfig.field) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return filtered;
  }, [competitors, columnFilters, sortConfig, showDeleted]);

  // Group competitors by field (returns array with group headers and rows)
  const groupedAndPaginatedData = useMemo(() => {
    if (!groupByField) {
      // No grouping - return regular paginated data
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSortedCompetitors.slice(start, end).map(row => ({ type: 'row', data: row }));
    }

    // Group by field
    const groups = {};
    filteredAndSortedCompetitors.forEach(row => {
      const groupValue = row[groupByField] ?? 'Unknown';
      const groupKey = String(groupValue);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    // Convert to array and sort groups by key
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      // Try numeric comparison first
      const aNum = Number(a);
      const bNum = Number(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // Otherwise string comparison
      return a.localeCompare(b);
    });

    // Flatten groups into array with headers
    const result = [];
    sortedGroups.forEach(groupKey => {
      const isExpanded = expandedGroups.has(groupKey);
      
      // Add group header
      result.push({ 
        type: 'group-header', 
        groupValue: groupKey === 'Unknown' ? null : groups[groupKey][0][groupByField],
        groupKey,
        count: groups[groupKey].length,
        isExpanded
      });
      
      // Add rows in group only if expanded
      if (isExpanded) {
        groups[groupKey].forEach(row => {
          result.push({ type: 'row', data: row });
        });
      }
    });

    // Apply pagination
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return result.slice(start, end);
  }, [filteredAndSortedCompetitors, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setTotalRows(filteredAndSortedCompetitors.length);
    setUrlState({ page: 0 });
  }, [filteredAndSortedCompetitors.length]);

  // Paginated data (for checkbox selection - use non-grouped data)
  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSortedCompetitors.slice(start, end);
  }, [filteredAndSortedCompetitors, pagination.page, pagination.rowsPerPage]);

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

  // Handle short name click - open TermEditModal (same as name click)
  const handleShortNameClick = async (e, competitor) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Handle field change in edit mode
  const handleFieldChange = (competitorId, field, value) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      if (!newChanges[competitorId]) {
        newChanges[competitorId] = {};
      }
      // Convert hex colors to numbers for color fields
      if (field.includes('COLOR') && typeof value === 'string' && value.startsWith('#')) {
        newChanges[competitorId][field] = hexToNumber(value);
      } else {
        newChanges[competitorId][field] = value;
      }
      return newChanges;
    });
  };

  // Table columns configuration
  const columns = useMemo(() => [
    {
      field: 'COMPETITOR_ID',
      header: 'ID',
      render: (value) => (
        <Typography
          sx={{
            color: '#1976d2',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontSize: '0.875rem',
            '&:hover': { textDecoration: 'underline' }
          }}
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/competitors/${value}`, '_blank');
          }}
        >
          {value}
        </Typography>
      ),
    },
    {
      field: 'name',
      header: 'Name',
      render: (value, row) => {
        const imageUrl = row.LIGHT_IMAGE_URL || row.DARK_IMAGE_URL;
        return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={imageUrl || undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: imageUrl ? 'transparent' : '#1976d2',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          >
            <GroupsIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography
            sx={{
              color: '#1976d2',
              cursor: 'pointer',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 400,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={(e) => handleNameClick(e, row)}
          >
            {value || '-'}
          </Typography>
        </Box>
        );
      },
    },
    {
      field: 'shortName',
      header: 'S. Name',
      render: (value, row) => {
        // If shortNameClickable is true, show clickable number that opens term modal
        if (row.shortNameClickable && row.shortValuesCount) {
          return (
            <Typography
              sx={{
                color: '#1976d2',
                cursor: 'pointer',
                fontWeight: 500,
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: '0.875rem',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={(e) => handleShortNameClick(e, row)}
            >
              {row.shortValuesCount}
            </Typography>
          );
        }
        
        // Otherwise show short name (also clickable to open term modal)
        return (
          <Typography
            sx={{
              color: '#1976d2',
              cursor: 'pointer',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 400,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={(e) => handleShortNameClick(e, row)}
          >
            {value || '-'}
          </Typography>
        );
      },
    },
    {
      field: 'sport',
      header: 'Sport Type',
      minWidth: 100,
      editable: true,
      editField: 'SPORT_TYPE_ID',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID;
          // Ensure value exists in options
          const validValue = sports.some(s => s.SPORT_TYPE_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'SPORT_TYPE_ID', e.target.value)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                {sports.length > 0 ? sports.map(sport => (
                  <MenuItem key={sport.SPORT_TYPE_ID} value={sport.SPORT_TYPE_ID}>
                    {sport.name || sport.ALIAS_NAME}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>Loading...</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'genderName',
      header: 'Gender',
      editable: true,
      editField: 'GENDER',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.GENDER ?? row.GENDER;
          // Ensure value is 1 or 2
          const validValue = (currentValue === 1 || currentValue === 2) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'GENDER', e.target.value)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'countryName',
      header: 'Country',
      editable: true,
      editField: 'COUNTRY_ID',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.COUNTRY_ID ?? row.COUNTRY_ID;
          // Ensure value exists in options
          const validValue = countries.some(c => c.COUNTRY_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'COUNTRY_ID', e.target.value)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                {countries.length > 0 ? countries.map(country => (
                  <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                    {country.EMOJI ? `${country.EMOJI} ` : ''}{country.name}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>Loading...</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {value && (
              <Typography 
                sx={{
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 400,
                }}
              >
                {value}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'competitionName',
      header: 'Competition',
      editable: true,
      editField: 'MAIN_COMPETITION',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.MAIN_COMPETITION ?? row.MAIN_COMPETITION;
          // Filter competitions by sport type
          const sportTypeId = pendingChanges[row.COMPETITOR_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID;
          const availableCompetitions = sportTypeId 
            ? competitions.filter(c => c.SPORT_TYPE_ID === sportTypeId)
            : competitions;
          // Ensure value exists in options
          const validValue = availableCompetitions.some(c => c.COMPETITION_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'MAIN_COMPETITION', e.target.value)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                {availableCompetitions.length > 0 ? availableCompetitions.map(comp => (
                  <MenuItem key={comp.COMPETITION_ID} value={comp.COMPETITION_ID}>
                    {comp.name || '-'}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>Loading...</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'FOUNDED',
      header: 'Founded',
      editable: true,
      editField: 'FOUNDED',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.FOUNDED ?? value;
          return (
            <TextField
              type="number"
              size="small"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'FOUNDED', e.target.value ? parseInt(e.target.value) : null)}
              sx={{
                width: '80px',
                '& .MuiOutlinedInput-root': {
                  height: '32px',
                  fontSize: '0.875rem',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
              }}
            />
          );
        }
        return value || '-';
      },
    },
    {
      field: 'competitorTypeName',
      header: 'Competitor Type',
      editable: true,
      editField: 'COMPETITOR_TYPE',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.COMPETITOR_ID]?.COMPETITOR_TYPE ?? row.COMPETITOR_TYPE;
          // Ensure value is 1 or 2
          const validValue = (currentValue === 1 || currentValue === 2) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'COMPETITOR_TYPE', e.target.value)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                <MenuItem value={1}>Team</MenuItem>
                <MenuItem value={2}>Club</MenuItem>
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'HOME_MAIN_COLOR',
      header: 'Colors',
      editable: true,
      editField: 'HOME_MAIN_COLOR',
      render: (value, row) => {
        if (isEditMode) {
          const homeMain = numberToHex(pendingChanges[row.COMPETITOR_ID]?.HOME_MAIN_COLOR ?? row.HOME_MAIN_COLOR);
          const homeSecondary = numberToHex(pendingChanges[row.COMPETITOR_ID]?.HOME_SECONDARY_COLOR ?? row.HOME_SECONDARY_COLOR);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                type="color"
                size="small"
                value={homeMain || '#000000'}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'HOME_MAIN_COLOR', e.target.value)}
                sx={{
                  width: '40px',
                  height: '32px',
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                    padding: '4px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '4px',
                    height: '24px',
                  },
                }}
                title="Home Main Color"
              />
              <TextField
                type="color"
                size="small"
                value={homeSecondary || '#ffffff'}
                onChange={(e) => handleFieldChange(row.COMPETITOR_ID, 'HOME_SECONDARY_COLOR', e.target.value)}
                sx={{
                  width: '40px',
                  height: '32px',
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                    padding: '4px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '4px',
                    height: '24px',
                  },
                }}
                title="Home Secondary Color"
              />
            </Box>
          );
        }
        const homeMain = numberToHex(row.HOME_MAIN_COLOR);
        const homeSecondary = numberToHex(row.HOME_SECONDARY_COLOR);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {homeMain && (
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: homeMain,
                  border: '1px solid #e0e0e0',
                  borderRadius: '2px',
                }}
                title={`Home Main: ${homeMain}`}
              />
            )}
            {homeSecondary && (
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: homeSecondary,
                  border: '1px solid #e0e0e0',
                  borderRadius: '2px',
                }}
                title={`Home Secondary: ${homeSecondary}`}
              />
            )}
            {!homeMain && !homeSecondary && '-'}
          </Box>
        );
      },
    },
  ], [navigate, handleShortNameClick, isEditMode, pendingChanges, sports, countries, competitions, handleFieldChange]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setUrlState(prev => {
      const updates = { [field]: value };
      
      // Reset dependent filters
      if (field === 'sportType') {
        updates.competition = [];
      } else if (field === 'country') {
        if (Array.isArray(value) && value.length > 0) {
          const selectedCountryIds = value.map(countryName => {
            const country = countries.find(c => c.name === countryName);
            return country ? country.COUNTRY_ID : null;
          }).filter(id => id !== null);
          
          if (Array.isArray(prev.competition) && prev.competition.length > 0) {
            const validCompetitions = prev.competition.filter(compId => {
              const comp = competitions.find(c => c.COMPETITION_ID === parseInt(compId));
              return comp && selectedCountryIds.includes(comp.COUNTRY_ID);
            });
            updates.competition = validCompetitions;
          }
        } else {
          updates.competition = [];
        }
      }
      
      return updates;
    });
  };

  // Handle search - load competitors from DB with filters
  const handleSearch = () => {
    searchCompetitors();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setUrlState({
      country: [],
      sportType: [],
      competition: [],
      competitorId: '',
      language: '',
      competitorName: '',
    });
    setColumnFilters({});
    // Optionally trigger search after clearing
    // searchCompetitors();
  };

  // Filter competitions by sport type and country
  const filteredCompetitions = useMemo(() => {
    // Must have sport type selected
    if (!filters.sportType || filters.sportType.length === 0) {
      return [];
    }
    
    const selectedSportIds = filters.sportType.map(sportName => {
      const sport = sports.find(s => (s.name || s.ALIAS_NAME) === sportName);
      return sport ? sport.SPORT_TYPE_ID : null;
    }).filter(id => id !== null);
    
    if (selectedSportIds.length === 0) {
      return [];
    }
    
    let filtered = competitions.filter(comp => selectedSportIds.includes(comp.SPORT_TYPE_ID));
    
    // Also filter by country if selected
    if (filters.country && filters.country.length > 0) {
      const selectedCountryIds = filters.country.map(countryName => {
        const country = countries.find(c => c.name === countryName);
        return country ? country.COUNTRY_ID : null;
      }).filter(id => id !== null);
      
      if (selectedCountryIds.length > 0) {
        filtered = filtered.filter(comp => selectedCountryIds.includes(comp.COUNTRY_ID));
      }
    }
    
    return filtered;
  }, [competitions, sports, countries, filters.sportType, filters.country]);

  // Handle sort
  const handleSort = (field) => {
    setUrlState(prev => ({
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle group by field
  const handleGroupBy = (field) => {
    if (groupByField === field) {
      setUrlState({ groupBy: '' });
      setExpandedGroups(new Set());
    } else {
      setUrlState({ groupBy: field });
      setExpandedGroups(new Set());
    }
  };

  // Toggle group expand/collapse
  const handleToggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setUrlState({ page: newPage });
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setUrlState({ rowsPerPage: newRowsPerPage, page: 0 });
  };

  // Check if any selected competitors are deleted
  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some(id => {
      const competitor = competitors.find(c => c.COMPETITOR_ID === id);
      return competitor?.IS_DELETED === true;
    });
  }, [selectedRows, competitors]);

  // Handle delete/restore with confirmation dialog
  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select competitors',
        severity: 'warning',
      });
      return;
    }

    const isRestore = hasDeletedSelected;
    const action = isRestore ? 'restore' : 'delete';
    const actionText = isRestore ? 'restore' : 'delete';
    
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Competitors`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} competitor(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          
          if (isRestore) {
            await api.restoreCompetitors(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} competitor(s)`,
              severity: 'success',
            });
          } else {
            await api.deleteCompetitors(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} competitor(s)`,
              severity: 'success',
            });
          }
          
          // Clear selection and reload
          setSelectedRows([]);
          await searchCompetitors();
        } catch (err) {
          console.error(`Failed to ${action} competitors:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} competitors. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} competitors`);
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  // Handle confirmation dialog close
  const handleConfirmDialogClose = () => {
    setConfirmDialog(prev => ({ ...prev, open: false, onConfirm: null }));
  };

  // Handle create short name
  const handleCreateShortName = () => {
    if (selectedRows.length === 0) {
      alert('Please select competitors to create short names for');
      return;
    }
    
    // TODO: Implement create short name functionality
    // This should open a modal or form to create short names for selected competitors
    console.log('Create short name for competitors:', selectedRows);
    
    // For now, show a confirmation
    if (window.confirm(`Create short names for ${selectedRows.length} selected competitor(s)?`)) {
      // Implementation will go here
    }
  };

  // Handle edit mode toggle
  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Cancel edit mode - clear pending changes
      if (Object.keys(pendingChanges).length > 0) {
        if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
          setPendingChanges({});
          setIsEditMode(false);
        }
      } else {
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(true);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setSnackbar({
        open: true,
        message: 'No changes to save',
        severity: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert pendingChanges to updates array format
      const updates = Object.keys(pendingChanges).map(competitorId => {
        const changes = { ...pendingChanges[competitorId] };
        
        // Ensure STATISTICS_RESET_DATE is in correct format (YYYY-MM-DD)
        if (changes.STATISTICS_RESET_DATE) {
          // If it's already a date string, use it; otherwise format it
          if (typeof changes.STATISTICS_RESET_DATE === 'string' && changes.STATISTICS_RESET_DATE.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in correct format
          } else {
            // Try to parse and format
            const date = new Date(changes.STATISTICS_RESET_DATE);
            if (!isNaN(date.getTime())) {
              changes.STATISTICS_RESET_DATE = date.toISOString().split('T')[0];
            }
          }
        }
        
        // Convert FOUNDED to number if it's a string
        if (changes.FOUNDED !== undefined && changes.FOUNDED !== null) {
          changes.FOUNDED = typeof changes.FOUNDED === 'string' 
            ? (changes.FOUNDED.trim() === '' ? null : parseInt(changes.FOUNDED))
            : changes.FOUNDED;
        }
        
        // Convert SELECTIONS_RANK to number if it's a string
        if (changes.SELECTIONS_RANK !== undefined && changes.SELECTIONS_RANK !== null) {
          changes.SELECTIONS_RANK = typeof changes.SELECTIONS_RANK === 'string' 
            ? (changes.SELECTIONS_RANK.trim() === '' ? null : parseInt(changes.SELECTIONS_RANK))
            : changes.SELECTIONS_RANK;
        }
        
        // Convert MINIMUM_ATHLETES_IN_SQUAD to number if it's a string
        if (changes.MINIMUM_ATHLETES_IN_SQUAD !== undefined && changes.MINIMUM_ATHLETES_IN_SQUAD !== null) {
          changes.MINIMUM_ATHLETES_IN_SQUAD = typeof changes.MINIMUM_ATHLETES_IN_SQUAD === 'string' 
            ? (changes.MINIMUM_ATHLETES_IN_SQUAD.trim() === '' ? null : parseInt(changes.MINIMUM_ATHLETES_IN_SQUAD))
            : changes.MINIMUM_ATHLETES_IN_SQUAD;
        }
        
        return {
          competitorId: parseInt(competitorId),
          changes,
        };
      });

      // Call API to save changes
      const result = await api.updateCompetitorsBulk(updates);

      // Show success message
      const successMessage = result.errors && result.errors.length > 0
        ? `Successfully updated ${result.updated} competitor(s). ${result.errors.length} error(s) occurred.`
        : `Successfully updated ${result.updated} competitor(s).`;

      setSnackbar({
        open: true,
        message: successMessage,
        severity: result.errors && result.errors.length > 0 ? 'warning' : 'success',
      });

      // Clear pending changes and exit edit mode
      setPendingChanges({});
      setIsEditMode(false);

      // Reload competitors to get updated data
      await searchCompetitors();
    } catch (err) {
      console.error('Failed to save changes:', err);
      const errorMessage = err.message || 'Failed to save changes. Please try again.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSortedCompetitors.filter((r) => selectedRows.includes(r.COMPETITOR_ID))
      : filteredAndSortedCompetitors;
    if (rows.length === 0) {
      setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
      return;
    }
    const headers = Object.keys(rows[0] || {}).filter(
      (k) => rows[0][k] == null || (typeof rows[0][k] !== 'object' && typeof rows[0][k] !== 'function')
    );
    const lines = [headers.join(',')];
    rows.forEach((r) => {
      lines.push(
        headers
          .map((k) => {
            const v = r[k];
            if (v == null) return '';
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      );
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} competitor(s)`, severity: 'success' });
  };

  // Handle name click - open TermEditModal
  const handleNameClick = async (e, competitor) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Handle term save
  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload competitors to get updated names (with current filters)
      await searchCompetitors();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  // Handle term save and update
  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload competitors to get updated names (with current filters)
      await searchCompetitors();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  // Handle create category
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

  // Handle open create dialog
  const handleOpenCreateDialog = () => {
    setCreateFormData({
      name: '',
      SPORT_TYPE_ID: '',
      COMPETITOR_TYPE: '',
      COUNTRY_ID: '',
      GENDER: '',
      MAIN_COMPETITION: '',
      FOUNDED: '',
    });
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };

  // Handle close create dialog
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      SPORT_TYPE_ID: '',
      COMPETITOR_TYPE: '',
      COUNTRY_ID: '',
      GENDER: '',
      MAIN_COMPETITION: '',
      FOUNDED: '',
    });
    setCreateFormErrors({});
  };

  // Handle create form change
  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If sport type changed, clear competition (competition depends on sport type)
      if (field === 'SPORT_TYPE_ID') {
        updated.MAIN_COMPETITION = '';
      }
      
      return updated;
    });
    
    // Clear error for this field
    if (createFormErrors[field]) {
      setCreateFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Validate create form
  const validateCreateForm = () => {
    const errors = {};
    
    if (!createFormData.name || createFormData.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    if (!createFormData.SPORT_TYPE_ID) {
      errors.SPORT_TYPE_ID = 'Sport Type is required';
    }
    
    if (!createFormData.COMPETITOR_TYPE) {
      errors.COMPETITOR_TYPE = 'Competitor Type is required';
    }
    
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create competitor
  const handleCreateCompetitor = async () => {
    if (!validateCreateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, create a new term for the competitor name
      const newTerm = await api.createTerm({
        category: 'Competitors Names',
        values: [
          {
            languageId: 1, // English
            value: createFormData.name.trim(),
            isDefault: true,
            status: 'Approved'
          }
        ]
      });

      // Then, create the competitor with the new term's ID
      const competitorData = {
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: createFormData.SPORT_TYPE_ID ? parseInt(createFormData.SPORT_TYPE_ID) : null,
        COMPETITOR_TYPE: createFormData.COMPETITOR_TYPE ? parseInt(createFormData.COMPETITOR_TYPE) : null,
        COUNTRY_ID: createFormData.COUNTRY_ID ? parseInt(createFormData.COUNTRY_ID) : null,
        GENDER: createFormData.GENDER ? parseInt(createFormData.GENDER) : null,
        MAIN_COMPETITION: createFormData.MAIN_COMPETITION ? parseInt(createFormData.MAIN_COMPETITION) : null,
        FOUNDED: createFormData.FOUNDED ? parseInt(createFormData.FOUNDED) : null,
      };

      const newCompetitor = await api.createCompetitor(competitorData);

      // Close dialog and reload competitors
      handleCloseCreateDialog();
      await searchCompetitors();

      // Show success message
      setSnackbar({
        open: true,
        message: 'Competitor created successfully',
        severity: 'success'
      });

      // Navigate to the new competitor details page
      navigate(`/competitors/${newCompetitor.COMPETITOR_ID}`);
    } catch (err) {
      console.error('Failed to create competitor:', err);
      setError(err.message || 'Failed to create competitor');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create competitor',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && competitors.length === 0) {
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
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#000000',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          Competitors List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Competitor
        </Button>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          {/* Row 1 */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Autocomplete
              multiple
              size="small"
              options={countries}
              getOptionLabel={(option) => option.name || ''}
              value={countries.filter(c => filters.country.includes(c.name))}
              onChange={(e, newValue) => {
                handleFilterChange('country', newValue.map(c => c.name));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  sx={{
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E0E0E0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#BDBDBD',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  }}
                />
              )}
              ListboxProps={{
                style: {
                  maxHeight: '240px', // Approximately 6 rows (each row ~40px with padding)
                  overflow: 'auto',
                },
              }}
              sx={{
                '& .MuiAutocomplete-inputRoot': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Autocomplete
              multiple
              size="small"
              options={sports}
              getOptionLabel={(option) => option.name || option.ALIAS_NAME || ''}
              value={sports.filter(s => filters.sportType.includes(s.name || s.ALIAS_NAME))}
              onChange={(e, newValue) => {
                handleFilterChange('sportType', newValue.map(s => s.name || s.ALIAS_NAME));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sport Type"
                  sx={{
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E0E0E0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#BDBDBD',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  }}
                />
              )}
              ListboxProps={{
                style: {
                  maxHeight: '240px', // Approximately 6 rows (each row ~40px with padding)
                  overflow: 'auto',
                },
              }}
              sx={{
                '& .MuiAutocomplete-inputRoot': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Autocomplete
              multiple
              size="small"
              options={filteredCompetitions}
              getOptionLabel={(option) => option.name || ''}
              value={filteredCompetitions.filter(c => filters.competition.includes(String(c.COMPETITION_ID)))}
              onChange={(e, newValue) => {
                handleFilterChange('competition', newValue.map(c => String(c.COMPETITION_ID)));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Competitions"
                  sx={{
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E0E0E0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#BDBDBD',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  }}
                />
              )}
              ListboxProps={{
                style: {
                  maxHeight: '240px', // Approximately 6 rows (each row ~40px with padding)
                  overflow: 'auto',
                },
              }}
              sx={{
                '& .MuiAutocomplete-inputRoot': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Competitor ID"
              value={filters.competitorId}
              onChange={(e) => handleFilterChange('competitorId', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#BDBDBD',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Grid>

          {/* Row 2 */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.875rem' }}>Language</InputLabel>
              <Select
                value={filters.language}
                label="Language"
                onChange={(e) => handleFilterChange('language', e.target.value)}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#BDBDBD',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                  '& .MuiSelect-icon': {
                    color: '#666666',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Please Select Language</em>
                </MenuItem>
                {languages.map(lang => (
                  <MenuItem key={lang.id} value={lang.iso2LettersCode}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Competitor Name"
              value={filters.competitorName}
              onChange={(e) => handleFilterChange('competitorName', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#BDBDBD',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleCreateShortName}
              sx={{ 
                backgroundColor: '#ffffff',
                borderColor: '#E0E0E0',
                color: '#000000',
                textTransform: 'none',
                height: '40px',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#BDBDBD',
                },
              }}
            >
              Create Short Name ({selectedRows.length})
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ 
                backgroundColor: '#1976d2',
                textTransform: 'none',
                height: '40px',
                borderRadius: '4px',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#1565c0',
                  boxShadow: 'none',
                },
              }}
            >
              Search
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleClearFilters}
              sx={{ 
                backgroundColor: '#ffffff',
                borderColor: '#E0E0E0',
                color: '#000000',
                textTransform: 'none',
                height: '40px',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#BDBDBD',
                },
              }}
            >
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showDeleted}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setUrlState({ showDeleted: newValue });
                    searchCompetitors(newValue);
                  }}
                  size="small"
                />
              }
              label="Show Deleted"
              sx={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#ffffff' }}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TableContainer sx={{ maxHeight: '100%' }}>
            <Table 
              stickyHeader
              sx={{
                '& .MuiTableCell-root': {
                  borderColor: '#EAECF0',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                },
                '& .MuiTableHead-root': {
                  position: 'sticky',
                  top: 0,
                  zIndex: 11,
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ position: 'sticky', top: 0, zIndex: 11 }}>
                  <TableCell 
                    padding="checkbox"
                    sx={{ 
                      backgroundColor: '#ffffff',
                      borderColor: '#EAECF0',
                      borderRight: '1px solid #EAECF0',
                      padding: '12px 16px',
                      height: 'auto',
                      position: 'sticky',
                      top: 0,
                      zIndex: 12,
                    }}
                  >
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(paginatedData.map(row => row.COMPETITOR_ID));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                      sx={{
                        padding: '4px',
                      }}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell 
                      key={column.field} 
                      sx={{ 
                        backgroundColor: '#ffffff',
                        borderColor: '#EAECF0',
                        borderRight: '1px solid #EAECF0',
                        padding: '12px 16px',
                        verticalAlign: 'top',
                        height: 'auto',
                        minHeight: '80px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 12,
                        ...(column.minWidth && { minWidth: column.minWidth }),
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '24px' }}>
                          <Typography 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: '#000000',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {column.header}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleGroupBy(column.field)}
                              sx={{ 
                                p: 0.5,
                                height: 16,
                                width: 16,
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                              }}
                              title={groupByField === column.field ? 'Remove grouping' : 'Group by this column'}
                            >
                              <ViewListIcon 
                                sx={{ 
                                  fontSize: 12,
                                  color: groupByField === column.field ? '#1976d2' : '#cccccc'
                                }} 
                              />
                            </IconButton>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleSort(column.field)}
                                sx={{ 
                                  p: 0,
                                  height: 10,
                                  width: 10,
                                  '&:hover': { backgroundColor: 'transparent' }
                                }}
                              >
                                <ArrowUpwardIcon 
                                  sx={{ 
                                    fontSize: 10,
                                    color: sortConfig.field === column.field && sortConfig.direction === 'asc' ? '#1976d2' : '#cccccc'
                                  }} 
                                />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleSort(column.field)}
                                sx={{ 
                                  p: 0,
                                  height: 10,
                                  width: 10,
                                  '&:hover': { backgroundColor: 'transparent' }
                                }}
                              >
                                <ArrowDownwardIcon 
                                  sx={{ 
                                    fontSize: 10,
                                    color: sortConfig.field === column.field && sortConfig.direction === 'desc' ? '#1976d2' : '#cccccc'
                                  }} 
                                />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                        <TextField
                          size="small"
                          placeholder="Filter"
                          value={columnFilters[column.field] || ''}
                          sx={{ 
                            width: '100%',
                            '& .MuiInputBase-root': {
                              height: 32,
                              fontSize: '0.8125rem',
                              backgroundColor: '#F9FAFB',
                              borderRadius: '4px',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#E0E0E0',
                              borderWidth: '1px',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#D0D0D0',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#1976d2',
                              borderWidth: '1px',
                            },
                            '& .MuiInputBase-input': {
                              padding: '6px 12px',
                            },
                          }}
                          onChange={(e) => {
                            handleColumnFilterChange(column.field, e.target.value);
                          }}
                        />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAndPaginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length + 1} 
                      align="center" 
                      sx={{ 
                        py: 4,
                        borderColor: '#EAECF0',
                        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                      }}
                    >
                      <Typography 
                        color="text.secondary"
                        sx={{
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        }}
                      >
                        {competitors.length === 0 
                          ? 'No competitors found. Use the filters above and click Search to find competitors.'
                          : 'No competitors match the current page.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedAndPaginatedData.map((item, index) => {
                    if (item.type === 'group-header') {
                      // Render group header row
                      const column = columns.find(col => col.field === groupByField);
                      const displayValue = item.groupValue === null 
                        ? 'Unknown' 
                        : (item.groupValue ?? '-');
                      
                      return (
                        <TableRow
                          key={`group-${item.groupKey}-${index}`}
                          sx={{
                            backgroundColor: '#F5F5F5',
                            '& td': {
                              borderColor: '#EAECF0',
                              borderRight: '1px solid #EAECF0',
                              borderTop: '2px solid #D0D0D0',
                              borderBottom: '1px solid #D0D0D0',
                              fontWeight: 600,
                              padding: '12px 16px',
                            }
                          }}
                        >
                          <TableCell 
                            colSpan={columns.length + 1}
                            sx={{
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              fontSize: '0.875rem',
                              color: '#000000',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleGroup(item.groupKey)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                sx={{
                                  p: 0.5,
                                  height: 20,
                                  width: 20,
                                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleGroup(item.groupKey);
                                }}
                              >
                                {item.isExpanded ? (
                                  <ExpandMoreIcon sx={{ fontSize: 16, color: '#666666' }} />
                                ) : (
                                  <ChevronRightIcon sx={{ fontSize: 16, color: '#666666' }} />
                                )}
                              </IconButton>
                              <Typography
                                sx={{
                                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#000000',
                                }}
                              >
                                {column?.header || groupByField}: {displayValue}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                                  fontSize: '0.75rem',
                                  fontWeight: 400,
                                  color: '#666666',
                                }}
                              >
                                ({item.count} {item.count === 1 ? 'competitor' : 'competitors'})
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      // Render regular data row
                      const row = item.data;
                      const isDeleted = row.IS_DELETED === true;
                      return (
                        <TableRow
                          key={row.COMPETITOR_ID}
                          hover
                          selected={selectedRows.includes(row.COMPETITOR_ID)}
                          onClick={() => {
                            // Only navigate if not in edit mode
                            if (!isEditMode) {
                              window.open(`/competitors/${row.COMPETITOR_ID}`, '_blank');
                            }
                          }}
                          sx={{ 
                            cursor: isEditMode ? 'default' : 'pointer',
                            backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                            opacity: isDeleted && showDeleted ? 0.6 : 1,
                            '&:hover': {
                              backgroundColor: isEditMode 
                                ? 'transparent' 
                                : (isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : '#F9FAFB'),
                            },
                            '&.Mui-selected': {
                              backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD',
                              '&:hover': {
                                backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD',
                              },
                            },
                            '& td': {
                              color: isDeleted && showDeleted ? '#999999' : 'inherit',
                            },
                          }}
                        >
                          <TableCell 
                            padding="checkbox"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click navigation when clicking on checkbox cell
                            }}
                            sx={{
                              borderColor: '#EAECF0',
                              borderRight: '1px solid #EAECF0',
                              verticalAlign: 'middle',
                            }}
                          >
                            <Checkbox
                              checked={selectedRows.includes(row.COMPETITOR_ID)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedRows([...selectedRows, row.COMPETITOR_ID]);
                                } else {
                                  setSelectedRows(selectedRows.filter(id => id !== row.COMPETITOR_ID));
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click navigation when clicking on checkbox
                              }}
                              sx={{
                                padding: '4px',
                              }}
                            />
                          </TableCell>
                          {columns.map((column) => (
                            <TableCell 
                              key={column.field}
                              sx={{
                                borderColor: '#EAECF0',
                                borderRight: '1px solid #EAECF0',
                                padding: '16px',
                                verticalAlign: 'middle',
                                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                                fontSize: '0.875rem',
                                fontWeight: 400,
                                color: '#000000',
                                ...(column.minWidth && { minWidth: column.minWidth }),
                              }}
                            >
                              {column.render ? column.render(row[column.field], row) : (
                                <Typography
                                  sx={{
                                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                                    fontSize: '0.875rem',
                                    fontWeight: 400,
                                    color: '#000000',
                                  }}
                                >
                                  {row[column.field] || '-'}
                                </Typography>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    }
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 2, borderTop: '1px solid #EAECF0', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant={isEditMode ? 'contained' : 'outlined'}
              startIcon={isEditMode ? <CancelIcon /> : <EditIcon />}
              onClick={handleToggleEditMode}
              sx={{ 
                borderColor: isEditMode ? 'transparent' : '#E0E0E0',
                backgroundColor: isEditMode ? '#1976d2' : '#ffffff',
                color: isEditMode ? '#ffffff' : '#000000',
                textTransform: 'none',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontWeight: 500,
                '&:hover': {
                  borderColor: isEditMode ? 'transparent' : '#BDBDBD',
                  backgroundColor: isEditMode ? '#1565c0' : '#f5f5f5',
                },
              }}
            >
              {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {isEditMode && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
                disabled={Object.keys(pendingChanges).length === 0}
                sx={{ 
                  backgroundColor: '#4caf50',
                  textTransform: 'none',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: '#45a049',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#cccccc',
                  },
                }}
              >
                Save Changes ({Object.keys(pendingChanges).length})
              </Button>
            )}
            <Button
              variant={hasDeletedSelected ? "outlined" : "contained"}
              startIcon={hasDeletedSelected ? <RestoreIcon /> : <DeleteIcon />}
              onClick={handleDeleteOrRestore}
              disabled={selectedRows.length === 0}
              sx={{ 
                borderColor: hasDeletedSelected ? '#4caf50' : 'transparent',
                backgroundColor: hasDeletedSelected ? '#ffffff' : '#d32f2f',
                color: hasDeletedSelected ? '#4caf50' : '#ffffff',
                textTransform: 'none',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontWeight: 500,
                '&:hover': {
                  borderColor: hasDeletedSelected ? '#45a049' : 'transparent',
                  backgroundColor: hasDeletedSelected ? '#f1f8f4' : '#c62828',
                },
                '&.Mui-disabled': {
                  backgroundColor: hasDeletedSelected ? '#ffffff' : '#cccccc',
                  color: hasDeletedSelected ? '#cccccc' : '#ffffff',
                },
              }}
            >
              {hasDeletedSelected ? 'Restore Competitors' : 'Delete Competitors'} ({selectedRows.length})
            </Button>
            <Button variant="outlined" onClick={handleExportCsv} sx={{ borderColor: '#E0E0E0', color: '#000', textTransform: 'none', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontWeight: 500 }}>
              Export to CSV ({selectedRows.length})
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem' }}>
              Items per page:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pagination.rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem' }}>
              {pagination.page * pagination.rowsPerPage + 1}-{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 0} size="small">
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => handlePageChange(pagination.page + 1)} disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows} size="small">
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Create Competitor Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          fontWeight: 600,
          fontSize: '1.25rem',
          borderBottom: '1px solid #EAECF0',
          pb: 2
        }}>
          Create New Competitor
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {/* Name - Required */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Name"
                value={createFormData.name}
                onChange={(e) => handleCreateFormChange('name', e.target.value)}
                error={!!createFormErrors.name}
                helperText={createFormErrors.name}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Sport Type - Required */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Sport Type</InputLabel>
                <Select
                  value={createFormData.SPORT_TYPE_ID || ''}
                  label="Sport Type"
                  onChange={(e) => handleCreateFormChange('SPORT_TYPE_ID', e.target.value ? parseInt(e.target.value) : '')}
                  error={!!createFormErrors.SPORT_TYPE_ID}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">
                    <em>Please Select</em>
                  </MenuItem>
                  {sports.map(sport => (
                    <MenuItem key={sport.SPORT_TYPE_ID} value={sport.SPORT_TYPE_ID}>
                      {sport.name || sport.ALIAS_NAME}
                    </MenuItem>
                  ))}
                </Select>
                {createFormErrors.SPORT_TYPE_ID && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {createFormErrors.SPORT_TYPE_ID}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Competitor Type - Required */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Competitor Type</InputLabel>
                <Select
                  value={createFormData.COMPETITOR_TYPE || ''}
                  label="Competitor Type"
                  onChange={(e) => handleCreateFormChange('COMPETITOR_TYPE', e.target.value ? parseInt(e.target.value) : '')}
                  error={!!createFormErrors.COMPETITOR_TYPE}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">
                    <em>Please Select</em>
                  </MenuItem>
                  <MenuItem value={1}>Team</MenuItem>
                  <MenuItem value={2}>Club</MenuItem>
                </Select>
                {createFormErrors.COMPETITOR_TYPE && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {createFormErrors.COMPETITOR_TYPE}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Country */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Country</InputLabel>
                <Select
                  value={createFormData.COUNTRY_ID || ''}
                  label="Country"
                  onChange={(e) => handleCreateFormChange('COUNTRY_ID', e.target.value ? parseInt(e.target.value) : '')}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {countries.map(country => (
                    <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                      {country.EMOJI ? `${country.EMOJI} ` : ''}{country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Gender */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Gender</InputLabel>
                <Select
                  value={createFormData.GENDER || ''}
                  label="Gender"
                  onChange={(e) => handleCreateFormChange('GENDER', e.target.value ? parseInt(e.target.value) : '')}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value={1}>Male</MenuItem>
                  <MenuItem value={2}>Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Competition */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Main Competition</InputLabel>
                <Select
                  value={createFormData.MAIN_COMPETITION || ''}
                  label="Main Competition"
                  onChange={(e) => handleCreateFormChange('MAIN_COMPETITION', e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!createFormData.SPORT_TYPE_ID}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {competitions
                    .filter(c => !createFormData.SPORT_TYPE_ID || c.SPORT_TYPE_ID === parseInt(createFormData.SPORT_TYPE_ID))
                    .map(comp => (
                      <MenuItem key={comp.COMPETITION_ID} value={comp.COMPETITION_ID}>
                        {comp.name || '-'}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Founded */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Founded (Year)"
                value={createFormData.FOUNDED}
                onChange={(e) => handleCreateFormChange('FOUNDED', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button 
            onClick={handleCloseCreateDialog} 
            color="inherit"
            sx={{
              textTransform: 'none',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCompetitor} 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            Create
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
        initialCategory="Competitors Names"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (confirmDialog.onConfirm) {
                confirmDialog.onConfirm();
              }
            }} 
            color="primary"
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompetitorsList;
