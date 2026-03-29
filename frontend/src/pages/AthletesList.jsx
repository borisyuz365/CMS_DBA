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
import PersonIcon from '@mui/icons-material/Person';
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

function AthletesList() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 25, totalRows: 0 });
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    country: [],
    sportType: [],
    league: [],
    team: [],
    athleteId: '',
    language: '',
    athleteName: '',
  });

  // Data for dropdowns
  const [countries, setCountries] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [sports, setSports] = useState([]);

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
  const [pendingChanges, setPendingChanges] = useState({}); // { [athleteId]: { field: value, ... } }
  
  // Athletes positions data
  const [athletesPositions, setAthletesPositions] = useState([]);

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  // Show deleted athletes toggle
  const [showDeleted, setShowDeleted] = useState(false);

  // Create Athlete Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    SPORT_TYPE_ID: '',
    GENDER: '',
    NATIONALITY: '',
    BIRTHDATE: '',
    HEIGHT: '',
    POSITION: null,
    FORMATION_POSITION: null,
    STATUS: 1,
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
      
      // Load only dropdown data (countries, competitions, competitors, languages, sports, terms, categories, positions)
      // Use Promise.allSettled so failures don't block the page
      const [countriesResult, competitionsResult, competitorsResult, languagesResult, sportsResult, termsResult, categoriesResult, positionsResult] = await Promise.allSettled([
        api.getCountries(),
        api.getCompetitions(),
        api.getCompetitors(),
        api.getLanguages(),
        api.getSports(),
        api.getTerms(),
        api.getCategories(),
        api.getAthletesPositions(),
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
      
      if (competitorsResult.status === 'fulfilled') {
        setCompetitors(competitorsResult.value);
      } else {
        console.warn('Failed to load competitors:', competitorsResult.reason);
        setCompetitors([]);
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
      
      if (positionsResult.status === 'fulfilled') {
        setAthletesPositions(positionsResult.value || []);
      } else {
        console.warn('Failed to load athletes positions:', positionsResult.reason);
        setAthletesPositions([]);
      }
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setError(err.message || 'Failed to load dropdown data');
    } finally {
      setLoading(false);
    }
  };

  // Search athletes with filters
  const searchAthletes = async (overrideShowDeleted = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use override value if provided, otherwise use state
      const currentShowDeleted = overrideShowDeleted !== null ? overrideShowDeleted : showDeleted;
      
      // Build filter object
      const searchFilters = {
        country: filters.country && filters.country.length > 0 ? filters.country : undefined,
        sportType: filters.sportType && filters.sportType.length > 0 ? filters.sportType : undefined,
        league: filters.league && filters.league.length > 0 ? filters.league : undefined,
        team: filters.team && filters.team.length > 0 ? filters.team : undefined,
        athleteId: filters.athleteId || undefined,
        athleteName: filters.athleteName || undefined,
        language: filters.language || undefined,
        showDeleted: currentShowDeleted, // Always include showDeleted (true/false)
      };
      
      // Remove undefined values (but keep showDeleted even if false)
      Object.keys(searchFilters).forEach(key => {
        if (key !== 'showDeleted' && searchFilters[key] === undefined) {
          delete searchFilters[key];
        }
      });
      
      // Load athletes with filters
      const athletesData = await api.getAthletes(searchFilters);
      setAthletes(athletesData);
      // Count only non-deleted athletes for pagination (unless showDeleted is true)
      const visibleAthletes = currentShowDeleted 
        ? athletesData 
        : athletesData.filter(a => !a.IS_DELETED);
      setPagination(prev => ({ ...prev, totalRows: visibleAthletes.length, page: 0 }));
    } catch (err) {
      console.error('Failed to search athletes:', err);
      setError(err.message || 'Failed to search athletes');
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

  // Sort, filter, and group athletes (backend filtering + column-level filtering + grouping)
  const filteredAndSortedAthletes = useMemo(() => {
    let filtered = [...athletes];
    
    // Filter out deleted athletes if showDeleted is false (backend should handle this, but double-check)
    if (!showDeleted) {
      filtered = filtered.filter(a => !a.IS_DELETED);
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
          if (columnField === 'ATHLETE_ID' || columnField === 'jerseyNumber' || columnField === 'HEIGHT') {
            const numValue = Number(searchTerm);
            if (!isNaN(numValue)) {
              return cellValue === numValue || cellValueStr.includes(searchTerm);
            }
          }
          
          // For date fields
          if (columnField === 'BIRTHDATE') {
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
  }, [athletes, columnFilters, sortConfig, showDeleted]);

  // Group athletes by field (returns array with group headers and rows)
  const groupedAndPaginatedData = useMemo(() => {
    if (!groupByField) {
      // No grouping - return regular paginated data
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSortedAthletes.slice(start, end).map(row => ({ type: 'row', data: row }));
    }

    // Group by field
    const groups = {};
    filteredAndSortedAthletes.forEach(row => {
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
  }, [filteredAndSortedAthletes, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, totalRows: filteredAndSortedAthletes.length, page: 0 }));
  }, [filteredAndSortedAthletes.length]);

  // Paginated data (for checkbox selection - use non-grouped data)
  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSortedAthletes.slice(start, end);
  }, [filteredAndSortedAthletes, pagination.page, pagination.rowsPerPage]);

  // Handle short name click - open TermEditModal (same as name click)
  const handleShortNameClick = async (e, athlete) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Handle field change in edit mode
  const handleFieldChange = (athleteId, field, value) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      if (!newChanges[athleteId]) {
        newChanges[athleteId] = {};
      }
      newChanges[athleteId][field] = value;
      return newChanges;
    });
  };

  // Table columns configuration
  const columns = useMemo(() => [
    {
      field: 'ATHLETE_ID',
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
            window.open(`/athletes/${value}`, '_blank');
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
            src={row.CLUB_IMAGE_URL || null}
            sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: row.CLUB_IMAGE_URL ? 'transparent' : '#1976d2',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          >
            {!row.CLUB_IMAGE_URL && <PersonIcon sx={{ fontSize: 18 }} />}
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
      field: 'sport',
      header: 'Sport Type',
      minWidth: 100,
      editable: true,
      editField: 'SPORT_TYPE_ID',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID;
          // Ensure value exists in options
          const validValue = sports.some(s => s.SPORT_TYPE_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'SPORT_TYPE_ID', e.target.value)}
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
          const currentValue = pendingChanges[row.ATHLETE_ID]?.GENDER ?? row.GENDER;
          // Ensure value is 1 or 2
          const validValue = (currentValue === 1 || currentValue === 2) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'GENDER', e.target.value)}
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
      field: 'nationalityName',
      header: 'Nationality',
      editable: true,
      editField: 'NATIONALITY',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.NATIONALITY ?? row.NATIONALITY;
          // Ensure value exists in options
          const validValue = countries.some(c => c.COUNTRY_ID === currentValue) ? currentValue : '';
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'NATIONALITY', e.target.value)}
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
      field: 'BIRTHDATE',
      header: 'D.O.B',
      editable: true,
      editField: 'BIRTHDATE',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.BIRTHDATE ?? value;
          // Format date for input (YYYY-MM-DD)
          const dateValue = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
          return (
            <TextField
              type="date"
              size="small"
              value={dateValue}
              onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'BIRTHDATE', e.target.value)}
              sx={{
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
        return value ? new Date(value).toLocaleDateString('en-GB') : '-';
      },
    },
    {
      field: 'mainClub',
      header: 'Main Club',
      render: (value) => value || '-',
    },
    {
      field: 'jerseyNumber',
      header: 'Jersey Number',
      minWidth: 120,
      editable: true,
      editField: 'jerseyNumber',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.jerseyNumber ?? value;
          return (
            <TextField
              type="number"
              size="small"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'jerseyNumber', e.target.value ? parseInt(e.target.value) : null)}
              sx={{
                width: '60px',
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
      field: 'HEIGHT',
      header: 'Height',
      minWidth: 80,
      editable: true,
      editField: 'HEIGHT',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.HEIGHT ?? value;
          return (
            <TextField
              type="number"
              size="small"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'HEIGHT', e.target.value ? parseInt(e.target.value) : null)}
              inputProps={{ maxLength: 3 }}
              sx={{
                width: '70px',
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
      field: 'positionName',
      header: 'Position',
      editable: true,
      editField: 'POSITION',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.POSITION ?? row.POSITION;
          const sportTypeId = pendingChanges[row.ATHLETE_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID;
          const availablePositions = athletesPositions.filter(p => p.SPORT_TYPE_ID === sportTypeId);
          // Ensure value exists in options
          const validValue = availablePositions.some(p => p.POSITION_ID === currentValue) ? currentValue : '';
          
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => {
                  handleFieldChange(row.ATHLETE_ID, 'POSITION', e.target.value);
                  // Reset formation position when position changes
                  handleFieldChange(row.ATHLETE_ID, 'FORMATION_POSITION', null);
                }}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                {availablePositions.length > 0 ? availablePositions.map(position => (
                  <MenuItem key={position.POSITION_ID} value={position.POSITION_ID}>
                    {position.POSITION_NAME}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>No positions available</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'formationPositionName',
      header: 'F Position',
      editable: true,
      editField: 'FORMATION_POSITION',
      render: (value, row) => {
        if (isEditMode) {
          const currentValue = pendingChanges[row.ATHLETE_ID]?.FORMATION_POSITION ?? row.FORMATION_POSITION;
          const sportTypeId = pendingChanges[row.ATHLETE_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID;
          const positionId = pendingChanges[row.ATHLETE_ID]?.POSITION ?? row.POSITION;
          
          // Get formation positions for the selected position
          let availableFormPositions = [];
          if (positionId) {
            const position = athletesPositions.find(p => 
              p.POSITION_ID === positionId && p.SPORT_TYPE_ID === sportTypeId
            );
            if (position && position.FORMATION_POSITIONS) {
              availableFormPositions = position.FORMATION_POSITIONS;
            }
          }
          // Ensure value exists in options
          const validValue = availableFormPositions.some(fp => fp.FORMATION_POSITION_ID === currentValue) ? currentValue : '';
          
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={validValue || ''}
                onChange={(e) => handleFieldChange(row.ATHLETE_ID, 'FORMATION_POSITION', e.target.value)}
                disabled={!positionId || availableFormPositions.length === 0}
                sx={{
                  height: '32px',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                {availableFormPositions.length > 0 ? availableFormPositions.map(formPos => (
                  <MenuItem key={formPos.FORMATION_POSITION_ID} value={formPos.FORMATION_POSITION_ID}>
                    {formPos.FORMATION_POSITION_NAME}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>Select position first</MenuItem>
                )}
              </Select>
            </FormControl>
          );
        }
        return value || '-';
      },
    },
    {
      field: 'report',
      header: 'Report',
      minWidth: 80,
      render: (value, row) => (
        <Typography
          sx={{
            color: '#1976d2',
            cursor: 'pointer',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontSize: '0.875rem',
            fontWeight: 400,
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          Report
        </Typography>
      ),
    },
  ], [navigate, handleShortNameClick, isEditMode, pendingChanges, sports, countries, athletesPositions, handleFieldChange]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Reset dependent filters
      if (field === 'sportType') {
        newFilters.league = [];
        newFilters.team = [];
      } else if (field === 'league') {
        newFilters.team = [];
      } else if (field === 'country') {
        // When country changes, filter out leagues/teams that don't match selected countries
        if (Array.isArray(value) && value.length > 0) {
          const selectedCountryIds = value.map(countryName => {
            const country = countries.find(c => c.name === countryName);
            return country ? country.COUNTRY_ID : null;
          }).filter(id => id !== null);
          
          // Filter out leagues that don't match selected countries
          if (Array.isArray(prev.league) && prev.league.length > 0) {
            const validLeagues = prev.league.filter(leagueId => {
              const league = competitions.find(c => c.COMPETITION_ID === parseInt(leagueId));
              return league && selectedCountryIds.includes(league.COUNTRY_ID);
            });
            newFilters.league = validLeagues;
          }
          
          // Filter out teams that don't match selected countries
          if (Array.isArray(prev.team) && prev.team.length > 0) {
            const validTeams = prev.team.filter(teamId => {
              const team = competitors.find(c => c.COMPETITOR_ID === parseInt(teamId));
              return team && selectedCountryIds.includes(team.COUNTRY_ID);
            });
            newFilters.team = validTeams;
          }
        } else {
          // If no countries selected, clear leagues and teams
          newFilters.league = [];
          newFilters.team = [];
        }
      }
      
      return newFilters;
    });
  };

  // Handle search - load athletes from DB with filters
  const handleSearch = () => {
    searchAthletes();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      country: [],
      sportType: [],
      league: [],
      team: [],
      athleteId: '',
      language: '',
      athleteName: '',
    });
    setColumnFilters({});
    // Optionally trigger search after clearing
    // searchAthletes();
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

  // Filter competitors by competition, sport type, and country
  const filteredCompetitors = useMemo(() => {
    // Must have league (competition) selected
    if (!filters.league || filters.league.length === 0) {
      return [];
    }
    
    const competitionIds = filters.league.map(id => parseInt(id));
    let filtered = competitors.filter(comp => competitionIds.includes(comp.MAIN_COMPETITION));
    
    // Also filter by sport type if selected
    if (filters.sportType && filters.sportType.length > 0) {
      const selectedSportIds = filters.sportType.map(sportName => {
        const sport = sports.find(s => (s.name || s.ALIAS_NAME) === sportName);
        return sport ? sport.SPORT_TYPE_ID : null;
      }).filter(id => id !== null);
      
      if (selectedSportIds.length > 0) {
        filtered = filtered.filter(comp => selectedSportIds.includes(comp.SPORT_TYPE_ID));
      }
    }
    
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
  }, [competitors, sports, countries, filters.league, filters.sportType, filters.country]);

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

  // Check if any selected athletes are deleted
  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some(id => {
      const athlete = athletes.find(a => a.ATHLETE_ID === id);
      return athlete?.IS_DELETED === true;
    });
  }, [selectedRows, athletes]);

  // Handle delete/restore with confirmation dialog
  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select athletes',
        severity: 'warning',
      });
      return;
    }

    const isRestore = hasDeletedSelected;
    const action = isRestore ? 'restore' : 'delete';
    const actionText = isRestore ? 'restore' : 'delete';
    
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Athletes`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} athlete(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          
          if (isRestore) {
            await api.restoreAthletes(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} athlete(s)`,
              severity: 'success',
            });
          } else {
            await api.deleteAthletes(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} athlete(s)`,
              severity: 'success',
            });
          }
          
          // Clear selection and reload
          setSelectedRows([]);
          await searchAthletes();
        } catch (err) {
          console.error(`Failed to ${action} athletes:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} athletes. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} athletes`);
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
      alert('Please select athletes to create short names for');
      return;
    }
    
    // TODO: Implement create short name functionality
    // This should open a modal or form to create short names for selected athletes
    console.log('Create short name for athletes:', selectedRows);
    
    // For now, show a confirmation
    if (window.confirm(`Create short names for ${selectedRows.length} selected athlete(s)?`)) {
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
      const updates = Object.keys(pendingChanges).map(athleteId => {
        const changes = { ...pendingChanges[athleteId] };
        
        // Ensure BIRTHDATE is in correct format (YYYY-MM-DD)
        if (changes.BIRTHDATE) {
          // If it's already a date string, use it; otherwise format it
          if (typeof changes.BIRTHDATE === 'string' && changes.BIRTHDATE.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in correct format
          } else {
            // Try to parse and format
            const date = new Date(changes.BIRTHDATE);
            if (!isNaN(date.getTime())) {
              changes.BIRTHDATE = date.toISOString().split('T')[0];
            }
          }
        }
        
        // Convert jerseyNumber to number if it's a string
        if (changes.jerseyNumber !== undefined && changes.jerseyNumber !== null) {
          changes.jerseyNumber = typeof changes.jerseyNumber === 'string' 
            ? (changes.jerseyNumber.trim() === '' ? null : parseInt(changes.jerseyNumber))
            : changes.jerseyNumber;
        }
        
        // Convert HEIGHT to number if it's a string
        if (changes.HEIGHT !== undefined && changes.HEIGHT !== null) {
          changes.HEIGHT = typeof changes.HEIGHT === 'string' 
            ? (changes.HEIGHT.trim() === '' ? null : parseInt(changes.HEIGHT))
            : changes.HEIGHT;
        }
        
        return {
          athleteId: parseInt(athleteId),
          changes,
        };
      });

      // Call API to save changes
      const result = await api.updateAthletesBulk(updates);

      // Show success message
      const successMessage = result.errors && result.errors.length > 0
        ? `Successfully updated ${result.updated} athlete(s). ${result.errors.length} error(s) occurred.`
        : `Successfully updated ${result.updated} athlete(s).`;

      setSnackbar({
        open: true,
        message: successMessage,
        severity: result.errors && result.errors.length > 0 ? 'warning' : 'success',
      });

      // Clear pending changes and exit edit mode
      setPendingChanges({});
      setIsEditMode(false);

      // Reload athletes to get updated data
      await searchAthletes();
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
      ? filteredAndSortedAthletes.filter((a) => selectedRows.includes(a.ATHLETE_ID))
      : filteredAndSortedAthletes;
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
    a.download = `athletes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} athlete(s)`, severity: 'success' });
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle name click - open TermEditModal
  const handleNameClick = async (e, athlete) => {
    e.stopPropagation(); // Prevent row click navigation
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

  // Handle term save
  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      // Reload athletes to get updated names (with current filters)
      await searchAthletes();
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
      // Reload athletes to get updated names (with current filters)
      await searchAthletes();
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
      GENDER: '',
      NATIONALITY: '',
      BIRTHDATE: '',
      HEIGHT: '',
      POSITION: null,
      FORMATION_POSITION: null,
      STATUS: 1,
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
      GENDER: '',
      NATIONALITY: '',
      BIRTHDATE: '',
      HEIGHT: '',
      POSITION: null,
      FORMATION_POSITION: null,
      STATUS: 1,
    });
    setCreateFormErrors({});
  };

  // Handle create form change
  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'SPORT_TYPE_ID') {
        updated.POSITION = null;
        updated.FORMATION_POSITION = null;
      }
      if (field === 'POSITION') {
        updated.FORMATION_POSITION = null;
      }
      return updated;
    });
    
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
    
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create athlete
  const handleCreateAthlete = async () => {
    if (!validateCreateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, create a new term for the athlete name
      const newTerm = await api.createTerm({
        category: 'Athletes Names',
        values: [
          {
            languageId: 1, // English
            value: createFormData.name.trim(),
            isDefault: true,
            status: 'Approved'
          }
        ]
      });

      // Then, create the athlete with the new term's ID
      const athleteData = {
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: createFormData.SPORT_TYPE_ID ? parseInt(createFormData.SPORT_TYPE_ID) : null,
        GENDER: createFormData.GENDER ? parseInt(createFormData.GENDER) : null,
        NATIONALITY: createFormData.NATIONALITY ? parseInt(createFormData.NATIONALITY) : null,
        BIRTHDATE: createFormData.BIRTHDATE || null,
        HEIGHT: createFormData.HEIGHT ? parseInt(createFormData.HEIGHT) : null,
        POSITION: createFormData.POSITION || null,
        FORMATION_POSITION: createFormData.FORMATION_POSITION || null,
        STATUS: createFormData.STATUS ?? 1,
      };

      const newAthlete = await api.createAthlete(athleteData);

      // Close dialog and reload athletes
      handleCloseCreateDialog();
      await searchAthletes();

      // Show success message
      setSnackbar({
        open: true,
        message: 'Athlete created successfully',
        severity: 'success'
      });

      // Navigate to the new athlete details page
      navigate(`/athletes/${newAthlete.ATHLETE_ID}`);
    } catch (err) {
      console.error('Failed to create athlete:', err);
      setError(err.message || 'Failed to create athlete');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create athlete',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && athletes.length === 0) {
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
          Athletes List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Athlete
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
              value={filteredCompetitions.filter(c => filters.league.includes(String(c.COMPETITION_ID)))}
              onChange={(e, newValue) => {
                handleFilterChange('league', newValue.map(c => String(c.COMPETITION_ID)));
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
            <Autocomplete
              multiple
              size="small"
              options={filteredCompetitors}
              getOptionLabel={(option) => option.name || ''}
              value={filteredCompetitors.filter(c => filters.team.includes(String(c.COMPETITOR_ID)))}
              onChange={(e, newValue) => {
                handleFilterChange('team', newValue.map(c => String(c.COMPETITOR_ID)));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Competitors"
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
              label="Athlete ID"
              value={filters.athleteId}
              onChange={(e) => handleFilterChange('athleteId', e.target.value)}
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
              label="Athlete Name"
              value={filters.athleteName}
              onChange={(e) => handleFilterChange('athleteName', e.target.value)}
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
                    setShowDeleted(newValue);
                    // Trigger search immediately with the new value
                    searchAthletes(newValue);
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
                          setSelectedRows(paginatedData.map(row => row.ATHLETE_ID));
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
                        {athletes.length === 0 
                          ? 'No athletes found. Use the filters above and click Search to find athletes.'
                          : 'No athletes match the current page.'}
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
                                ({item.count} {item.count === 1 ? 'athlete' : 'athletes'})
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
                          key={row.ATHLETE_ID}
                          hover
                          selected={selectedRows.includes(row.ATHLETE_ID)}
                          onClick={() => {
                            // Only navigate if not in edit mode
                            if (!isEditMode) {
                              window.open(`/athletes/${row.ATHLETE_ID}`, '_blank');
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
                              checked={selectedRows.includes(row.ATHLETE_ID)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedRows([...selectedRows, row.ATHLETE_ID]);
                                } else {
                                  setSelectedRows(selectedRows.filter(id => id !== row.ATHLETE_ID));
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
              {hasDeletedSelected ? 'Restore Athletes' : 'Delete Athletes'} ({selectedRows.length})
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

      {/* Create Athlete Dialog */}
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
          Create New Athlete
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

            {/* Nationality */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Nationality</InputLabel>
                <Select
                  value={createFormData.NATIONALITY || ''}
                  label="Nationality"
                  onChange={(e) => handleCreateFormChange('NATIONALITY', e.target.value ? parseInt(e.target.value) : '')}
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

            {/* Birthdate */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                value={createFormData.BIRTHDATE}
                onChange={(e) => handleCreateFormChange('BIRTHDATE', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Height */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Height (cm)"
                value={createFormData.HEIGHT}
                onChange={(e) => handleCreateFormChange('HEIGHT', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Grid>

            {/* Position */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Position</InputLabel>
                <Select
                  value={createFormData.POSITION || ''}
                  label="Position"
                  onChange={(e) => handleCreateFormChange('POSITION', e.target.value || null)}
                  disabled={!createFormData.SPORT_TYPE_ID}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="">None</MenuItem>
                  {athletesPositions
                    .filter(p => p.SPORT_TYPE_ID === (typeof createFormData.SPORT_TYPE_ID === 'number' ? createFormData.SPORT_TYPE_ID : parseInt(createFormData.SPORT_TYPE_ID)))
                    .map(position => (
                      <MenuItem key={position.POSITION_ID} value={position.POSITION_ID}>
                        {position.POSITION_NAME}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Formation Position */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Formation Position</InputLabel>
                <Select
                  value={createFormData.FORMATION_POSITION || ''}
                  label="Formation Position"
                  onChange={(e) => handleCreateFormChange('FORMATION_POSITION', e.target.value || null)}
                  disabled={!createFormData.POSITION}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="">None</MenuItem>
                  {(() => {
                    const pos = athletesPositions.find(p =>
                      p.POSITION_ID === createFormData.POSITION &&
                      p.SPORT_TYPE_ID === (typeof createFormData.SPORT_TYPE_ID === 'number' ? createFormData.SPORT_TYPE_ID : parseInt(createFormData.SPORT_TYPE_ID))
                    );
                    return (pos?.FORMATION_POSITIONS || []).map(fp => (
                      <MenuItem key={fp.FORMATION_POSITION_ID} value={fp.FORMATION_POSITION_ID}>
                        {fp.FORMATION_POSITION_NAME}
                      </MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
                <Select
                  value={createFormData.STATUS ?? 1}
                  label="Status"
                  onChange={(e) => handleCreateFormChange('STATUS', e.target.value)}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={2}>Retired</MenuItem>
                  <MenuItem value={3}>Deceased</MenuItem>
                </Select>
              </FormControl>
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
            onClick={handleCreateAthlete} 
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
        initialCategory="Athletes Names"
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

export default AthletesList;
