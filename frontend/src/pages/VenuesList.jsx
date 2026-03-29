import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
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

function VenuesList() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 25, totalRows: 0 });
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    country: [],
    city: [],
    venueId: '',
    language: '',
    venueName: '',
  });

  // Data for dropdowns
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);

  // Term Edit Modal state
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // Group state (always active, but can be set to null to disable)
  const [groupByField, setGroupByField] = useState(null);
  // Expanded groups state (Set of group keys that are expanded)
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Column-level filter state (for stacked header filters)
  const [columnFilters, setColumnFilters] = useState({});

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({}); // { [venueId]: { field: value, ... } }

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  // Show deleted venues toggle
  const [showDeleted, setShowDeleted] = useState(false);

  // Create Venue Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    COUNTRY_ID: '',
    CITY_ID: '',
    ADDRESS: '',
    CAPACITY: '',
    SURFACE: '',
    OPENED: '',
    PRIMARY: false,
    WEBSITE: '',
    GMAPS_PLACE_ID: '',
    LOCATION_LAT: '',
    LOCATION_LNG: '',
    IMAGE_URL: '',
  });
  const [createFormErrors, setCreateFormErrors] = useState({});


  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Load data on mount (only dropdown data, not athletes)
  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load only dropdown data (countries, cities, languages, terms, categories)
      // Use Promise.allSettled so failures don't block the page
      const [countriesResult, languagesResult, termsResult, categoriesResult] = await Promise.allSettled([
        api.getCountries(),
        api.getLanguages(),
        api.getTerms(),
        api.getCategories(),
      ]);
      
      if (countriesResult.status === 'fulfilled') {
        setCountries(countriesResult.value);
      } else {
        console.warn('Failed to load countries:', countriesResult.reason);
        setCountries([]);
      }
      
      if (languagesResult.status === 'fulfilled') {
        setLanguages(languagesResult.value.filter(lang => lang.isDisplayed));
      } else {
        console.warn('Failed to load languages:', languagesResult.reason);
        setLanguages([]);
      }
      
      if (termsResult.status === 'fulfilled') {
        const allTermsData = termsResult.value || [];
        setAllTerms(allTermsData);
        // Extract cities from terms (category: Cities)
        const citiesData = allTermsData.filter(term => term.category === 'Cities');
        setCities(citiesData);
      } else {
        console.warn('Failed to load terms:', termsResult.reason);
        setAllTerms([]);
        setCities([]);
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

  // Search venues with filters
  const searchVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build filter object
      const searchFilters = {
        country: filters.country && filters.country.length > 0 ? filters.country : undefined,
        city: filters.city && filters.city.length > 0 ? filters.city : undefined,
        venueId: filters.venueId || undefined,
        venueName: filters.venueName || undefined,
        language: filters.language || undefined,
      };
      
      // Remove undefined values
      Object.keys(searchFilters).forEach(key => {
        if (searchFilters[key] === undefined) {
          delete searchFilters[key];
        }
      });
      
      // Load venues with filters
      const venuesData = await api.getVenuesList(searchFilters);
      setVenues(venuesData);
      setPagination(prev => ({ ...prev, totalRows: venuesData.length, page: 0 }));
    } catch (err) {
      console.error('Failed to search venues:', err);
      setError(err.message || 'Failed to search venues');
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

  // Sort, filter, and group venues (backend filtering + column-level filtering + grouping)
  const filteredAndSortedVenues = useMemo(() => {
    let filtered = [...venues];
    if (!showDeleted) {
      filtered = filtered.filter((v) => !v.IS_DELETED);
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
          if (columnField === 'VENUE_ID' || columnField === 'CAPACITY' || columnField === 'OPENED' || columnField === 'LOCATION_LAT' || columnField === 'LOCATION_LNG') {
            const numValue = Number(searchTerm);
            if (!isNaN(numValue)) {
              return cellValue === numValue || cellValueStr.includes(searchTerm);
            }
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
  }, [venues, columnFilters, sortConfig, showDeleted]);

  // Group venues by field (returns array with group headers and rows)
  const groupedAndPaginatedData = useMemo(() => {
    if (!groupByField) {
      // No grouping - return regular paginated data
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSortedVenues.slice(start, end).map(row => ({ type: 'row', data: row }));
    }

    // Group by field
    const groups = {};
    filteredAndSortedVenues.forEach(row => {
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
  }, [filteredAndSortedVenues, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, totalRows: filteredAndSortedVenues.length, page: 0 }));
  }, [filteredAndSortedVenues.length]);

  // Paginated data (for checkbox selection - use non-grouped data)
  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSortedVenues.slice(start, end);
  }, [filteredAndSortedVenues, pagination.page, pagination.rowsPerPage]);

  // Handle short name click - open TermEditModal (same as name click)
  const handleShortNameClick = async (e, venue) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Handle field change in edit mode
  const handleFieldChange = (venueId, field, value) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      if (!newChanges[venueId]) {
        newChanges[venueId] = {};
      }
      newChanges[venueId][field] = value;
      return newChanges;
    });
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

  // Handle name click - open TermEditModal
  const handleNameClick = async (e, venue) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Table columns configuration
  const columns = useMemo(() => [
    {
      field: 'VENUE_ID',
      header: 'ID',
      width: 70,
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
            window.open(`/venues/${value}`, '_blank');
          }}
        >
          {value}
        </Typography>
      ),
    },
    {
      field: 'name',
      header: 'Name',
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={row.IMAGE_URL || undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: row.IMAGE_URL ? 'transparent' : '#1976d2',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          >
            <LocationOnIcon sx={{ fontSize: 18 }} />
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
      ),
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
      field: 'countryName',
      header: 'Country',
      editable: true,
      editField: 'COUNTRY_ID',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.VENUE_ID]?.COUNTRY_ID ?? row.COUNTRY_ID;
          // Ensure value exists in options
          const validValue = countries.some(c => c.COUNTRY_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.VENUE_ID, 'COUNTRY_ID', e.target.value ? parseInt(e.target.value) : null)}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                <MenuItem value="">None</MenuItem>
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
            {!value && '-'}
          </Box>
        );
      },
    },
    {
      field: 'cityName',
      header: 'City',
      editable: true,
      editField: 'CITY_ID',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.VENUE_ID]?.CITY_ID ?? row.CITY_ID;
          // Filter cities by country
          const countryId = pendingChanges[row.VENUE_ID]?.COUNTRY_ID ?? row.COUNTRY_ID;
          const availableCities = countryId 
            ? cities.filter(c => {
                // Cities don't have direct country link, so show all cities for now
                // In a real implementation, you might need to filter by country
                return true;
              })
            : cities;
          // Find term by ID
          const cityTerm = availableCities.find(c => c.id === currentValue);
          const validValue = cityTerm ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.VENUE_ID, 'CITY_ID', e.target.value ? parseInt(e.target.value) : null)}
                disabled={!countryId}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                <MenuItem value="">None</MenuItem>
                {availableCities.length > 0 ? availableCities.map(city => (
                  <MenuItem key={city.id} value={city.id}>
                    {resolveTermName(city) || `City ${city.id}`}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>{countryId ? 'No cities available' : 'Select a country first'}</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'CAPACITY',
      header: 'Capacity',
      editable: true,
      editField: 'CAPACITY',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.VENUE_ID]?.CAPACITY ?? value;
          return (
            <TextField
              type="number"
              size="small"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(row.VENUE_ID, 'CAPACITY', e.target.value ? parseInt(e.target.value) : null)}
              sx={{
                width: '100px',
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
  ], [navigate, handleShortNameClick, isEditMode, pendingChanges, countries, cities, handleFieldChange, resolveTermName]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Reset dependent filters
      if (field === 'country') {
        // When country changes, clear city filter
        newFilters.city = [];
      }
      
      return newFilters;
    });
  };

  // Handle search - load venues from DB with filters
  const handleSearch = () => {
    searchVenues();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      country: [],
      city: [],
      venueId: '',
      language: '',
      venueName: '',
    });
    setColumnFilters({});
  };

  // Filter cities by country
  const filteredCities = useMemo(() => {
    if (!filters.country || filters.country.length === 0) {
      return cities;
    }
    
    // For now, return all cities (in a real implementation, you might filter by country)
    return cities;
  }, [cities, filters.country]);

  // Handle sort
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle group by field
  const handleGroupBy = (field) => {
    if (groupByField === field) {
      setGroupByField(null);
      setExpandedGroups(new Set()); // Reset expanded groups when disabling grouping
    } else {
      setGroupByField(field);
      setExpandedGroups(new Set()); // Reset expanded groups when changing grouping field
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
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setPagination(prev => ({ ...prev, rowsPerPage: newRowsPerPage, page: 0 }));
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some((id) => {
      const v = venues.find((x) => x.VENUE_ID === id);
      return v?.IS_DELETED === true;
    });
  }, [selectedRows, venues]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select venues',
        severity: 'warning',
      });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Venues`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} venue(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreVenues(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} venue(s)`,
              severity: 'success',
            });
          } else {
            await api.deleteVenues(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} venue(s)`,
              severity: 'success',
            });
          }
          setSelectedRows([]);
          await searchVenues();
        } catch (err) {
          console.error(`Failed to ${actionText} venues:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} venues. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} venues`);
        } finally {
          setLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
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
      alert('Please select venues to create short names for');
      return;
    }
    
    // TODO: Implement create short name functionality
    // This should open a modal or form to create short names for selected venues
    console.log('Create short name for venues:', selectedRows);
    
    // For now, show a confirmation
    if (window.confirm(`Create short names for ${selectedRows.length} selected venue(s)?`)) {
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
      const updates = Object.keys(pendingChanges).map(venueId => {
        const changes = { ...pendingChanges[venueId] };
        
        // Convert numeric fields
        if (changes.CAPACITY !== undefined && changes.CAPACITY !== null) {
          changes.CAPACITY = typeof changes.CAPACITY === 'string' 
            ? (changes.CAPACITY.trim() === '' ? null : parseInt(changes.CAPACITY))
            : changes.CAPACITY;
        }
        
        if (changes.OPENED !== undefined && changes.OPENED !== null) {
          changes.OPENED = typeof changes.OPENED === 'string' 
            ? (changes.OPENED.trim() === '' ? null : parseInt(changes.OPENED))
            : changes.OPENED;
        }
        
        if (changes.LOCATION_LAT !== undefined && changes.LOCATION_LAT !== null) {
          changes.LOCATION_LAT = typeof changes.LOCATION_LAT === 'string' 
            ? (changes.LOCATION_LAT.trim() === '' ? null : parseFloat(changes.LOCATION_LAT))
            : changes.LOCATION_LAT;
        }
        
        if (changes.LOCATION_LNG !== undefined && changes.LOCATION_LNG !== null) {
          changes.LOCATION_LNG = typeof changes.LOCATION_LNG === 'string' 
            ? (changes.LOCATION_LNG.trim() === '' ? null : parseFloat(changes.LOCATION_LNG))
            : changes.LOCATION_LNG;
        }
        
        return {
          venueId: parseInt(venueId),
          changes,
        };
      });

      // Call API to save changes
      const result = await api.updateVenuesBulk(updates);

      // Show success message
      const successMessage = result.errors && result.errors.length > 0
        ? `Successfully updated ${result.updated} venue(s). ${result.errors.length} error(s) occurred.`
        : `Successfully updated ${result.updated} venue(s).`;

      setSnackbar({
        open: true,
        message: successMessage,
        severity: result.errors && result.errors.length > 0 ? 'warning' : 'success',
      });

      // Clear pending changes and exit edit mode
      setPendingChanges({});
      setIsEditMode(false);

      // Reload venues to get updated data
      await searchVenues();
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

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSortedVenues.filter((r) => selectedRows.includes(r.VENUE_ID))
      : filteredAndSortedVenues;
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
    a.download = `venues_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} venue(s)`, severity: 'success' });
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle term save
  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload venues to get updated names (with current filters)
      await searchVenues();
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
      // Reload venues to get updated names (with current filters)
      await searchVenues();
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
      COUNTRY_ID: '',
      CITY_ID: '',
      ADDRESS: '',
      CAPACITY: '',
      SURFACE: '',
      OPENED: '',
      PRIMARY: false,
      WEBSITE: '',
      GMAPS_PLACE_ID: '',
      LOCATION_LAT: '',
      LOCATION_LNG: '',
    });
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };

  // Handle close create dialog
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      COUNTRY_ID: '',
      CITY_ID: '',
      ADDRESS: '',
      CAPACITY: '',
      SURFACE: '',
      OPENED: '',
      PRIMARY: false,
      WEBSITE: '',
      GMAPS_PLACE_ID: '',
      LOCATION_LAT: '',
      LOCATION_LNG: '',
    });
    setCreateFormErrors({});
  };

  // Handle create form change
  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If country changed, clear city (city depends on country)
      if (field === 'COUNTRY_ID') {
        updated.CITY_ID = '';
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
    
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create venue
  const handleCreateVenue = async () => {
    if (!validateCreateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, create a new term for the venue name
      const newTerm = await api.createTerm({
        category: 'Venues',
        values: [
          {
            languageId: 1, // English
            value: createFormData.name.trim(),
            isDefault: true,
            status: 'Approved'
          }
        ]
      });

      // Then, create the venue with the new term's ID
      const venueData = {
        NAME_ID: newTerm.id,
        COUNTRY_ID: createFormData.COUNTRY_ID || null,
        CITY_ID: createFormData.CITY_ID || null,
        ADDRESS: createFormData.ADDRESS || null,
        CAPACITY: createFormData.CAPACITY ? parseInt(createFormData.CAPACITY) : null,
        SURFACE: createFormData.SURFACE || null,
        OPENED: createFormData.OPENED ? parseInt(createFormData.OPENED) : null,
        PRIMARY: createFormData.PRIMARY || false,
        WEBSITE: createFormData.WEBSITE || null,
        GMAPS_PLACE_ID: createFormData.GMAPS_PLACE_ID || null,
        LOCATION_LAT: createFormData.LOCATION_LAT ? parseFloat(createFormData.LOCATION_LAT) : null,
        LOCATION_LNG: createFormData.LOCATION_LNG ? parseFloat(createFormData.LOCATION_LNG) : null,
      };

      const newVenue = await api.createVenue(venueData);

      // Close dialog and reload venues
      handleCloseCreateDialog();
      await searchVenues();

      // Show success message
      setSnackbar({
        open: true,
        message: 'Venue created successfully',
        severity: 'success'
      });

      // Navigate to the new venue details page
      navigate(`/venues/${newVenue.VENUE_ID}`);
    } catch (err) {
      console.error('Failed to create venue:', err);
      setError(err.message || 'Failed to create venue');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create venue',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && venues.length === 0) {
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
          Venues List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Venue
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
              options={filteredCities}
              getOptionLabel={(option) => resolveTermName(option) || `City ${option.id}`}
              value={filteredCities.filter(c => filters.city.includes(String(c.id)))}
              onChange={(e, newValue) => {
                handleFilterChange('city', newValue.map(c => String(c.id)));
              }}
              disabled={!filters.country || filters.country.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="City"
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
                  maxHeight: '240px',
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
              label="Venue ID"
              value={filters.venueId}
              onChange={(e) => handleFilterChange('venueId', e.target.value)}
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
              label="Venue Name"
              value={filters.venueName}
              onChange={(e) => handleFilterChange('venueName', e.target.value)}
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
                  onChange={(e) => setShowDeleted(e.target.checked)}
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
                          setSelectedRows(paginatedData.map(row => row.VENUE_ID));
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
                        ...(column.width && { width: column.width }),
                        ...(column.minWidth && { minWidth: column.minWidth }),
                        ...(column.maxWidth && { maxWidth: column.maxWidth }),
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
                        {venues.length === 0 
                          ? 'No venues found. Use the filters above and click Search to find venues.'
                          : 'No venues match the current page.'}
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
                                ({item.count} {item.count === 1 ? 'venue' : 'venues'})
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
                          key={row.VENUE_ID}
                          hover
                          selected={selectedRows.includes(row.VENUE_ID)}
                          onClick={() => {
                            // Only navigate if not in edit mode
                            if (!isEditMode) {
                              window.open(`/venues/${row.VENUE_ID}`, '_blank');
                            }
                          }}
                          sx={{ 
                            cursor: isEditMode ? 'default' : 'pointer',
                            backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                            opacity: isDeleted && showDeleted ? 0.6 : 1,
                            '&:hover': {
                              backgroundColor: isEditMode ? 'transparent' : (isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : '#F9FAFB'),
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
                              checked={selectedRows.includes(row.VENUE_ID)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedRows([...selectedRows, row.VENUE_ID]);
                                } else {
                                  setSelectedRows(selectedRows.filter(id => id !== row.VENUE_ID));
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
                                ...(column.width && { width: column.width }),
                        ...(column.minWidth && { minWidth: column.minWidth }),
                        ...(column.maxWidth && { maxWidth: column.maxWidth }),
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
              variant={hasDeletedSelected ? 'outlined' : 'contained'}
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
              {hasDeletedSelected ? 'Restore Venues' : 'Delete Venues'} ({selectedRows.length})
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

      {/* Create Venue Dialog */}
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
          Create New Venue
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

            {/* City */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>City</InputLabel>
                <Select
                  value={createFormData.CITY_ID || ''}
                  label="City"
                  onChange={(e) => handleCreateFormChange('CITY_ID', e.target.value ? parseInt(e.target.value) : '')}
                  disabled={!createFormData.COUNTRY_ID}
                  sx={{
                    fontSize: '0.875rem',
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {cities.map(city => (
                    <MenuItem key={city.id} value={city.id}>
                      {resolveTermName(city) || `City ${city.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={createFormData.ADDRESS}
                onChange={(e) => handleCreateFormChange('ADDRESS', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Capacity */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Capacity"
                value={createFormData.CAPACITY}
                onChange={(e) => handleCreateFormChange('CAPACITY', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Surface */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Surface"
                value={createFormData.SURFACE}
                onChange={(e) => handleCreateFormChange('SURFACE', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Opened */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Opened (Year)"
                value={createFormData.OPENED}
                onChange={(e) => handleCreateFormChange('OPENED', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Primary */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createFormData.PRIMARY}
                    onChange={(e) => handleCreateFormChange('PRIMARY', e.target.checked)}
                  />
                }
                label="Primary"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                  },
                }}
              />
            </Grid>

            {/* Website */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={createFormData.WEBSITE}
                onChange={(e) => handleCreateFormChange('WEBSITE', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Google Maps Place ID */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Google Maps Place ID"
                value={createFormData.GMAPS_PLACE_ID}
                onChange={(e) => handleCreateFormChange('GMAPS_PLACE_ID', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Image URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                type="url"
                value={createFormData.IMAGE_URL}
                onChange={(e) => handleCreateFormChange('IMAGE_URL', e.target.value)}
                placeholder="https://example.com/image.jpg"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Location Lat/Lng */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Latitude"
                value={createFormData.LOCATION_LAT}
                onChange={(e) => handleCreateFormChange('LOCATION_LAT', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Longitude"
                value={createFormData.LOCATION_LNG}
                onChange={(e) => handleCreateFormChange('LOCATION_LNG', e.target.value)}
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
            onClick={handleCreateVenue} 
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
        initialCategory="Venues"
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

export default VenuesList;
