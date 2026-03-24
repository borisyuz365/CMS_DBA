import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  TextField,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
} from '@mui/material';
import api from '../../../services/api';
import {
  Refresh as RefreshIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';

// Competitors Table Component
function CompetitorsTable({ 
  competitors, 
  selectedIds, 
  onSelectionChange, 
  title, 
  isInSeason = true,
  onStatusChange,
  onSeedChange,
  onNotInChange,
  showFilters = false,
  filterData = {},
  onFilterChange = () => {},
  onSearch = () => {},
  availableCompetitions = [],
  allCompetitors = [], // For country dropdown
  maxHeight = 400, // Default max height, can be overridden
}) {
  // Sorting state - default sort by NAME ascending
  const [sortField, setSortField] = React.useState('name');
  const [sortDirection, setSortDirection] = React.useState('asc');
  
  // Pagination state
  const [pageSize, setPageSize] = React.useState(25);
  const [currentPage, setCurrentPage] = React.useState(0);
  
  // Sort function
  const sortCompetitors = (competitorsList, field, direction) => {
    const sorted = [...competitorsList].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      
      // Handle null/undefined/empty values - put them at the end
      const aIsEmpty = aValue == null || aValue === '';
      const bIsEmpty = bValue == null || bValue === '';
      
      if (aIsEmpty && bIsEmpty) return 0;
      if (aIsEmpty) return 1; // Empty values go to end
      if (bIsEmpty) return -1; // Empty values go to end
      
      // For numeric fields (id, seed), compare as numbers
      if (field === 'id' || field === 'seed') {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
      }
      
      // For string fields, compare as strings (case-insensitive)
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };
  
  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(0);
  };
  
  // Sort competitors before pagination
  const sortedCompetitors = sortCompetitors(competitors, sortField, sortDirection);
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedCompetitors.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentCompetitors = sortedCompetitors.slice(startIndex, endIndex);
  
  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(0); // Reset to first page when changing page size
  };
  
  // Handle page navigation
  const handlePageChange = (newPage) => {
    setCurrentPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  };
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: isInSeason ? '#1976d2' : '#666' }}>
        {title}
      </Typography>
      
      {/* Filter Section - Only show for Not In Season table */}
      {showFilters && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #e0e0e0', 
          borderRadius: 1 
        }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Country
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filterData.country || ''}
                  onChange={(e) => onFilterChange('country', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#fff',
                    },
                  }}
                >
                  <MenuItem value="">All Countries</MenuItem>
                  {[...new Set(allCompetitors.map(c => c.country).filter(Boolean))].sort().map(country => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                  {filterData.country && (
                    <MenuItem value="" onClick={(e) => e.stopPropagation()}>
                      ✕ Clear
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Competition
                {!filterData.country && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#666', fontStyle: 'italic' }}>
                    Select a country first
                  </Typography>
                )}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filterData.competition || ''}
                  onChange={(e) => onFilterChange('competition', e.target.value)}
                  disabled={!filterData.country}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#fff',
                    },
                  }}
                >
                  <MenuItem value="">All Competitions</MenuItem>
                  {availableCompetitions.map((competition) => (
                    <MenuItem key={competition.id} value={competition.id.toString()}>
                      {competition.name}
                    </MenuItem>
                  ))}
                  {filterData.competition && (
                    <MenuItem value="" onClick={(e) => e.stopPropagation()}>
                      ✕ Clear
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Competitor Name:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={filterData.competitorName || ''}
                onChange={(e) => onFilterChange('competitorName', e.target.value)}
                placeholder={filterData.country ? "Enter competitor name" : "Select country first"}
                disabled={!filterData.country}
                InputProps={{
                  endAdornment: filterData.competitorName && (
                    <IconButton
                      size="small"
                      onClick={() => onFilterChange('competitorName', '')}
                      sx={{ color: '#666' }}
                    >
                      ✕
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={onSearch}
                sx={{
                  backgroundColor: '#fff',
                  color: '#1976d2',
                  borderColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    borderColor: '#1565c0',
                    color: '#1565c0',
                  },
                  height: '40px',
                  width: '100%'
                }}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Table - Responsive */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          border: '1px solid #e0e0e0', 
          mb: 2, 
          flex: 1,
          maxHeight: maxHeight, // Configurable height for scrolling
          overflow: 'auto',
          '& .MuiTableCell': {
            minWidth: { xs: 100, sm: 'auto' },
            whiteSpace: { xs: 'nowrap', sm: 'normal' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            padding: { xs: '8px 4px', sm: '16px' },
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={currentCompetitors.length > 0 && currentCompetitors.every(c => selectedIds.includes(c.id))}
                  indeterminate={currentCompetitors.some(c => selectedIds.includes(c.id)) && !currentCompetitors.every(c => selectedIds.includes(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Add all current page competitors to selection
                      const newSelection = [...selectedIds];
                      currentCompetitors.forEach(c => {
                        if (!newSelection.includes(c.id)) {
                          newSelection.push(c.id);
                        }
                      });
                      onSelectionChange(newSelection);
                    } else {
                      // Remove all current page competitors from selection
                      const newSelection = selectedIds.filter(id => !currentCompetitors.some(c => c.id === id));
                      onSelectionChange(newSelection);
                    }
                  }}
                />
              </TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('id')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  ID
                  {sortField === 'id' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('name')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Name
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('country')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Country
                  {sortField === 'country' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              {isInSeason && (
                <>
                  <TableCell 
                    sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('competition')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Competition
                      {sortField === 'competition' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('seed')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Seed
                      {sortField === 'seed' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Not In...</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentCompetitors.map((competitor) => (
              <TableRow
                key={competitor.id}
                selected={selectedIds.includes(competitor.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(competitor.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedIds, competitor.id]);
                      } else {
                        onSelectionChange(selectedIds.filter(id => id !== competitor.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{competitor.id}</TableCell>
                <TableCell>
                  {competitor.logo && (
                    <img 
                      src={competitor.logo} 
                      alt={competitor.name} 
                      style={{ width: 20, height: 20, marginRight: 8, verticalAlign: 'middle' }} 
                    />
                  )}
                  {competitor.name}
                </TableCell>
                <TableCell>
                  {competitor.countryFlag && (
                    competitor.countryFlag.startsWith('http') ? (
                      <img 
                        src={competitor.countryFlag} 
                        alt={competitor.country} 
                        style={{ width: 16, height: 12, marginRight: 4, verticalAlign: 'middle' }} 
                      />
                    ) : (
                      <span style={{ marginRight: 4, fontSize: '14px' }}>{competitor.countryFlag}</span>
                    )
                  )}
                  {competitor.country}
                </TableCell>
                {isInSeason && (
                  <>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select 
                          value={competitor.status || ""} 
                          displayEmpty
                          onChange={(e) => onStatusChange(competitor.id, e.target.value)}
                        >
                          <MenuItem value="">Not Selected</MenuItem>
                          <MenuItem value="Promoted">Promoted</MenuItem>
                          <MenuItem value="Relegated">Relegated</MenuItem>
                          <MenuItem value="Host">Host</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#1976d2' }}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        sx={{ width: 60 }}
                        value={competitor.seed || ''}
                        onChange={(e) => onSeedChange(competitor.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox 
                        size="small"
                        checked={competitor.notIn || false}
                        onChange={(e) => onNotInChange(competitor.id, e.target.checked)}
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Summary and Pagination - Responsive */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 2, sm: 0 },
        mb: 2 
      }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            textAlign: { xs: 'center', sm: 'left' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          Total: {competitors.length} | Selected: {selectedIds.length}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 1 },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          flexWrap: 'wrap'
        }}>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Page Size:
          </Typography>
          <FormControl size="small" sx={{ minWidth: { xs: 70, sm: 80 } }}>
            <Select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              sx={{ height: { xs: 36, sm: 32 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <FirstPageIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography 
            variant="body2" 
            sx={{ 
              minWidth: { xs: 50, sm: 40 }, 
              textAlign: 'center',
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            {currentPage + 1} / {totalPages || 1}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <LastPageIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

// Main Competitors Manager Component
function CompetitorsManager({
  inSeasonCompetitors = [],
  notInSeasonCompetitors = [],
  selectedInSeason = [],
  selectedNotInSeason = [],
  onInSeasonSelectionChange,
  onNotInSeasonSelectionChange,
  onAddCompetitors,
  onRemoveCompetitors,
  onRemoveFromAllSeasons,
  onStatusChange,
  onSeedChange,
  onNotInChange,
  competitionId,
  seasonNum,
  sportType,
  onExtractCompetitorsFromGames,
  onIdentifyAndAssignStatuses,
  setUpdateSnackbarMsg,
  setUpdateSnackbarType,
  setUpdateSnackbarOpen,
  selectedSeason,
}) {
  // Filter state for Not In Season competitors
  const [filterData, setFilterData] = React.useState({
    country: '',
    competition: '',
    competitorName: ''
  });

  // Available competitions based on selected country and sport type
  const [availableCompetitions, setAvailableCompetitions] = React.useState([]);
  
  // Filtered competitors state
  const [filteredCompetitors, setFilteredCompetitors] = React.useState(notInSeasonCompetitors);

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

  const [allCompetitions, setAllCompetitions] = React.useState([]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch competitions from API
  React.useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await api.getCompetitions();
        if (response.success && response.data) {
          const transformedData = response.data.map(comp => ({
            id: comp.COMPETITION_ID || comp.id,
            name: comp.name || `Competition ${comp.COMPETITION_ID}`,
            country: comp.country || 'Unknown',
            sport: comp.sport || 'Unknown',
          }));
          setAllCompetitions(transformedData);
        }
      } catch (err) {
        console.error('Failed to fetch competitions:', err);
      }
    };

    fetchCompetitions();
  }, []);

  // Handle search - call API with filters
  const handleSearch = React.useCallback(async (searchFilters = null) => {
    const filtersToUse = searchFilters || filterData;
    
    // Require country if searching by name
    if (filtersToUse.competitorName && filtersToUse.competitorName.trim() !== '' && !filtersToUse.country) {
      alert('Please select a country before searching by competitor name.');
      return;
    }

    if (!competitionId || !seasonNum) {
      console.error('Missing competitionId or seasonNum');
      return;
    }

    try {
      const filters = {
        country: filtersToUse.country || undefined,
        competition: filtersToUse.competition || undefined,
        competitorName: filtersToUse.competitorName || undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const response = await api.getCompetitorsNotInSeason(competitionId, seasonNum, filters);
      
      if (response.success && response.data) {
        setFilteredCompetitors(response.data);
      } else {
        setFilteredCompetitors([]);
      }
    } catch (error) {
      console.error('Failed to search competitors:', error);
      setFilteredCompetitors([]);
    }
  }, [competitionId, seasonNum]);

  // Update filtered competitors when notInSeasonCompetitors changes (initial load)
  React.useEffect(() => {
    // Only set initial data if no filters are active
    if (!filterData.country && !filterData.competition && !filterData.competitorName) {
      setFilteredCompetitors(notInSeasonCompetitors);
    }
  }, [notInSeasonCompetitors]);

  // Auto-search when filters change (country or competition)
  React.useEffect(() => {
    // Only auto-search if country or competition is selected (not just name)
    if (filterData.country || filterData.competition) {
      handleSearch(filterData);
    }
  }, [filterData.country, filterData.competition, handleSearch]);

  // Get competitions by country and sport type from API data
  const getCompetitionsByCountryAndSport = (country) => {
    if (!allCompetitions.length || !sportType) return [];
    
    // Normalize sport type (football -> Football, basketball -> Basketball)
    const normalizedSport = sportType.charAt(0).toUpperCase() + sportType.slice(1).toLowerCase();
    
    return allCompetitions
      .filter(comp => comp.country === country && comp.sport === normalizedSport)
      .map(comp => ({ id: comp.id, name: comp.name }));
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilterData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // If country changed, update available competitions
      if (field === 'country') {
        const competitions = getCompetitionsByCountryAndSport(value);
        setAvailableCompetitions(competitions);
        
        // Reset competition selection if it's no longer available
        const competitionIds = competitions.map(c => c.id.toString());
        if (prev.competition && !competitionIds.includes(prev.competition)) {
          newData.competition = '';
        }
        
        // If competitor name is set but country is cleared, clear competitor name
        if (!value && prev.competitorName) {
          newData.competitorName = '';
        }
      }

      return newData;
    });
  };


  // Handle remove from all seasons
  const handleRemoveFromAllSeasons = () => {
    setConfirmDialogOpen(true);
  };

  // Handle confirmation dialog
  const handleConfirmRemove = () => {
    if (onRemoveFromAllSeasons) {
      onRemoveFromAllSeasons();
    }
    setConfirmDialogOpen(false);
  };

  const handleCancelRemove = () => {
    setConfirmDialogOpen(false);
  };


  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Season Competitors</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2 }}>
        <Tooltip title="Connect competitors to this season">
          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              if (selectedSeason && onExtractCompetitorsFromGames) {
                try {
                  const result = await onExtractCompetitorsFromGames();
                  
                  if (result && result.success) {
                    if (setUpdateSnackbarMsg) setUpdateSnackbarMsg(result.message);
                    if (setUpdateSnackbarType) setUpdateSnackbarType('success');
                    if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                  } else {
                    if (setUpdateSnackbarMsg) setUpdateSnackbarMsg('No competitors found in games connected to this season.');
                    if (setUpdateSnackbarType) setUpdateSnackbarType('info');
                    if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                  }
                } catch (error) {
                  console.error('Error connecting competitors to season:', error);
                  if (setUpdateSnackbarMsg) setUpdateSnackbarMsg('Failed to connect competitors to season. Please try again.');
                  if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                  if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                }
              }
            }}
            sx={{
              backgroundColor: '#fff',
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#1565c0',
                color: '#1565c0',
              },
              minWidth: 'auto',
              px: 2,
              py: 1,
              height: '40px',
            }}
          >
            Connect Competitors To Season
          </Button>
        </Tooltip>
        <Tooltip title="Suggest new teams for this season">
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              if (selectedSeason && onIdentifyAndAssignStatuses) {
                try {
                  const updatedCompetitors = onIdentifyAndAssignStatuses();
                  
                  if (updatedCompetitors && updatedCompetitors.length > 0) {
                    const statusCounts = {
                      Promoted: updatedCompetitors.filter(c => c.status === 'Promoted').length,
                      Relegated: updatedCompetitors.filter(c => c.status === 'Relegated').length,
                      Host: updatedCompetitors.filter(c => c.status === 'Host').length
                    };
                    
                    const statusSummary = Object.entries(statusCounts)
                      .filter(([_, count]) => count > 0)
                      .map(([status, count]) => `${status}: ${count}`)
                      .join(', ');
                    
                    if (setUpdateSnackbarMsg) {
                      setUpdateSnackbarMsg(
                        statusSummary 
                          ? `Team statuses updated successfully! (${statusSummary})`
                          : 'Team statuses analyzed. No status changes were made.'
                      );
                    }
                    if (setUpdateSnackbarType) setUpdateSnackbarType('success');
                    if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                  } else {
                    if (setUpdateSnackbarMsg) setUpdateSnackbarMsg('No competitors found in season.');
                    if (setUpdateSnackbarType) setUpdateSnackbarType('warning');
                    if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                  }
                } catch (error) {
                  console.error('Error suggesting new teams:', error);
                  if (setUpdateSnackbarMsg) setUpdateSnackbarMsg('Failed to suggest new teams. Please try again.');
                  if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                  if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                }
              }
            }}
            sx={{
              backgroundColor: '#fff',
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#1565c0',
                color: '#1565c0',
              },
              minWidth: 'auto',
              px: 2,
              py: 1,
              height: '40px',
            }}
          >
            Suggest New Teams
          </Button>
        </Tooltip>
      </Box>
      
      {/* Responsive Layout */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 }, 
        alignItems: { xs: 'stretch', md: 'stretch' } 
      }}>
        {/* Left Section - Competitors In Season */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0%' } }}>
          <CompetitorsTable
            competitors={inSeasonCompetitors}
            selectedIds={selectedInSeason}
            onSelectionChange={onInSeasonSelectionChange}
            title="Competitors In Season"
            isInSeason={true}
            onStatusChange={onStatusChange}
            onSeedChange={onSeedChange}
            onNotInChange={onNotInChange}
            maxHeight={480}
          />
        </Box>
        
        {/* Middle Action Buttons - Responsive */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'row', md: 'column' },
          justifyContent: { xs: 'center', md: 'center' },
          gap: { xs: 1, md: 2 },
          order: { xs: 3, md: 2 },
          flexWrap: { xs: 'wrap', md: 'nowrap' }
        }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onAddCompetitors}
            disabled={selectedNotInSeason.length === 0}
            sx={{ 
              borderColor: '#1976d2', 
              color: '#1976d2',
              minWidth: { xs: 'auto', md: 180 },
              minHeight: { xs: 44, sm: 40 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            {isMobile ? '<< Add' : '<< Add Competitors'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onRemoveCompetitors}
            disabled={selectedInSeason.length === 0}
            sx={{ 
              borderColor: '#1976d2', 
              color: '#1976d2',
              minWidth: { xs: 'auto', md: 180 },
              minHeight: { xs: 44, sm: 40 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            {isMobile ? 'Remove >>' : 'Remove Competitors >>'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRemoveFromAllSeasons}
            disabled={selectedInSeason.length === 0 && selectedNotInSeason.length === 0}
            sx={{ 
              borderColor: '#d32f2f', 
              color: '#d32f2f',
              minWidth: { xs: 'auto', md: 180 },
              minHeight: { xs: 44, sm: 40 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: '#ffebee'
              }
            }}
          >
            {isMobile ? 'Remove All' : 'Remove From All Seasons'}
          </Button>
        </Box>
        
        {/* Right Section - Competitors Not In Season */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0%' }, order: { xs: 2, md: 3 } }}>
          <CompetitorsTable
            competitors={filteredCompetitors}
            selectedIds={selectedNotInSeason}
            onSelectionChange={onNotInSeasonSelectionChange}
            title="Competitors Not In Season"
            isInSeason={false}
            showFilters={true}
            filterData={filterData}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            availableCompetitions={availableCompetitions}
            allCompetitors={notInSeasonCompetitors}
          />
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelRemove}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to perform this action? This will remove the selected competitors from all seasons.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemove} color="error" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompetitorsManager; 