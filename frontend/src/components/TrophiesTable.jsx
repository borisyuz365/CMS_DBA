import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LoadingSpinner from '../../reuse/LoadingSpinner';

/**
 * TrophiesTable Component
 * Displays trophies grouped by competition with expand/collapse functionality
 */
const TrophiesTable = ({
  trophies = [],
  competitions = [],
  competitors = [],
  countries = [],
  seasons = [],
  loading = false,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [expandedCompetitions, setExpandedCompetitions] = useState(new Set());
  const [filters, setFilters] = useState({
    countryId: '',
    competitionId: '',
    competitorId: '',
  });

  // Get competition by ID
  const getCompetition = (competitionId) => {
    return competitions.find(c => c.COMPETITION_ID === competitionId);
  };

  // Get competitor by ID
  const getCompetitor = (competitorId) => {
    return competitors.find(c => c.COMPETITOR_ID === competitorId);
  };

  // Get season by competition and season number
  const getSeason = (competitionId, seasonNum) => {
    return seasons.find(
      s => s.COMPETITION_ID === competitionId && s.SEASON_NUM === seasonNum
    );
  };

  // Filter trophies based on selected filters
  const filteredTrophies = useMemo(() => {
    return trophies.filter(trophy => {
      // Filter by country (via competition)
      if (filters.countryId) {
        const competition = getCompetition(trophy.COMPETITION_ID);
        if (!competition || competition.COUNTRY_ID !== parseInt(filters.countryId)) {
          return false;
        }
      }

      // Filter by competition
      if (filters.competitionId && trophy.COMPETITION_ID !== parseInt(filters.competitionId)) {
        return false;
      }

      // Filter by competitor
      if (filters.competitorId && trophy.COMPETITOR_ID !== parseInt(filters.competitorId)) {
        return false;
      }

      return true;
    });
  }, [trophies, filters, competitions]);

  // Get unique countries from trophies
  const availableCountriesForFilter = useMemo(() => {
    const countryIds = new Set();
    trophies.forEach(trophy => {
      const competition = getCompetition(trophy.COMPETITION_ID);
      if (competition && competition.COUNTRY_ID) {
        countryIds.add(competition.COUNTRY_ID);
      }
    });
    return countries.filter(c => countryIds.has(c.COUNTRY_ID));
  }, [trophies, countries, competitions]);

  // Get unique competitions from trophies (filtered by country if selected)
  const availableCompetitionsForFilter = useMemo(() => {
    const competitionIds = new Set();
    trophies.forEach(trophy => {
      competitionIds.add(trophy.COMPETITION_ID);
    });
    
    let filtered = competitions.filter(c => competitionIds.has(c.COMPETITION_ID));
    
    // Further filter by country if selected
    if (filters.countryId) {
      filtered = filtered.filter(c => c.COUNTRY_ID === parseInt(filters.countryId));
    }
    
    return filtered;
  }, [trophies, competitions, filters.countryId]);

  // Get unique competitors from trophies (filtered by competition if selected)
  const availableCompetitorsForFilter = useMemo(() => {
    const competitorIds = new Set();
    trophies.forEach(trophy => {
      // If competition filter is selected, only include competitors from that competition
      if (filters.competitionId) {
        if (trophy.COMPETITION_ID === parseInt(filters.competitionId)) {
          competitorIds.add(trophy.COMPETITOR_ID);
        }
      } else {
        competitorIds.add(trophy.COMPETITOR_ID);
      }
    });
    
    return competitors.filter(c => competitorIds.has(c.COMPETITOR_ID));
  }, [trophies, competitors, filters.competitionId]);

  // Group filtered trophies by competition
  const groupedTrophies = useMemo(() => {
    const groups = {};
    
    filteredTrophies.forEach(trophy => {
      const competitionId = trophy.COMPETITION_ID;
      if (!groups[competitionId]) {
        groups[competitionId] = {
          competitionId,
          competitionName: trophy.competitionName || `Competition ${competitionId}`,
          region: trophy.region || null,
          trophies: []
        };
      }
      groups[competitionId].trophies.push(trophy);
    });

    // Sort trophies within each group by season (most recent first)
    Object.values(groups).forEach(group => {
      group.trophies.sort((a, b) => {
        const seasonA = a.SEASON_NUM || 0;
        const seasonB = b.SEASON_NUM || 0;
        return seasonB - seasonA;
      });
    });

    return groups;
  }, [filteredTrophies]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset dependent filters
      if (field === 'countryId') {
        updated.competitionId = '';
        updated.competitorId = '';
      } else if (field === 'competitionId') {
        updated.competitorId = '';
      }
      
      return updated;
    });
  };

  // Toggle competition expansion
  const toggleCompetition = (competitionId) => {
    setExpandedCompetitions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(competitionId)) {
        newSet.delete(competitionId);
      } else {
        newSet.add(competitionId);
      }
      return newSet;
    });
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (trophies.length === 0 && !loading) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            backgroundColor: '#f5f5f5',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Trophies
          </Typography>
          <IconButton
            onClick={onAdd}
            size="small"
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderTop: 'none',
            boxShadow: 1,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No trophies found. Click the + button to add a trophy.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: '#f5f5f5',
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          Trophies {filteredTrophies.length !== trophies.length && `(${filteredTrophies.length}/${trophies.length})`}
        </Typography>
        <IconButton
          onClick={onAdd}
          size="small"
          sx={{
            backgroundColor: '#1976d2',
            color: 'white',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      {/* Filters */}
      {trophies.length > 0 && (
        <Box
          sx={{
            p: 2,
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Country</InputLabel>
                <Select
                  value={filters.countryId}
                  label="Filter by Country"
                  onChange={(e) => handleFilterChange('countryId', e.target.value)}
                >
                  <MenuItem value="">All Countries</MenuItem>
                  {availableCountriesForFilter.map(country => (
                    <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                      {country.EMOJI ? `${country.EMOJI} ` : ''}{country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Competition</InputLabel>
                <Select
                  value={filters.competitionId}
                  label="Filter by Competition"
                  onChange={(e) => handleFilterChange('competitionId', e.target.value)}
                >
                  <MenuItem value="">All Competitions</MenuItem>
                  {availableCompetitionsForFilter.map(competition => (
                    <MenuItem key={competition.COMPETITION_ID} value={competition.COMPETITION_ID}>
                      {competition.name || `Competition ${competition.COMPETITION_ID}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Competitor</InputLabel>
                <Select
                  value={filters.competitorId}
                  label="Filter by Competitor"
                  onChange={(e) => handleFilterChange('competitorId', e.target.value)}
                >
                  <MenuItem value="">All Competitors</MenuItem>
                  {availableCompetitorsForFilter.map(competitor => (
                    <MenuItem key={competitor.COMPETITOR_ID} value={competitor.COMPETITOR_ID}>
                      {competitor.name || `Competitor ${competitor.COMPETITOR_ID}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Trophies List */}
      <Paper
        sx={{
          borderTop: 'none',
          boxShadow: 1,
          maxHeight: 600,
          overflow: 'auto',
        }}
      >
        {Object.keys(groupedTrophies).length === 0 && !loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No trophies match the selected filters.
            </Typography>
          </Box>
        ) : (
          Object.values(groupedTrophies).map((group) => {
            const isExpanded = expandedCompetitions.has(group.competitionId);
            const competition = getCompetition(group.competitionId);

            return (
            <Box key={group.competitionId}>
              {/* Competition Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: isExpanded ? '#fafafa' : '#f5f5f5',
                  borderBottom: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
                onClick={() => toggleCompetition(group.competitionId)}
              >
                <IconButton
                  size="small"
                  sx={{
                    padding: 0.5,
                    color: '#666',
                  }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {group.region ? `${group.region} - ` : ''}{group.competitionName} ({group.trophies.length})
                </Typography>
              </Box>

              {/* Trophies List */}
              <Collapse in={isExpanded}>
                {group.trophies.map((trophy, index) => {
                  const competitor = getCompetitor(trophy.COMPETITOR_ID);
                  const season = getSeason(trophy.COMPETITION_ID, trophy.SEASON_NUM);
                  
                  // Format season display
                  const seasonDisplay = trophy.seasonName || 
                    (season && season.START_DATE && season.END_DATE
                      ? `${new Date(season.START_DATE).getFullYear()}/${String(new Date(season.END_DATE).getFullYear()).slice(-2)}`
                      : `Season ${trophy.SEASON_NUM}`);

                  return (
                    <Box
                      key={`${trophy.COMPETITION_ID}-${trophy.SEASON_NUM}-${trophy.COMPETITOR_ID}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        borderBottom: index < group.trophies.length - 1 ? '1px solid #e0e0e0' : 'none',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    >
                      {/* Action Icons */}
                      <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(trophy)}
                            sx={{
                              color: '#d32f2f',
                              '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(trophy)}
                            sx={{
                              color: '#666',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Trophy Icon */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 60,
                          height: 60,
                          mr: 2,
                        }}
                      >
                        <EmojiEventsIcon
                          sx={{
                            fontSize: 50,
                            color: '#ffd700',
                          }}
                        />
                      </Box>

                      {/* Trophy Details */}
                      <Box sx={{ flex: 1 }}>
                        {/* Season & Team */}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {seasonDisplay}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {competitor && (
                              <>
                                {competitor.IMAGE_URL && (
                                  <Avatar
                                    src={competitor.IMAGE_URL}
                                    sx={{ width: 24, height: 24 }}
                                  />
                                )}
                                <Typography variant="body2" color="text.secondary">
                                  {trophy.competitorName || `Competitor ${trophy.COMPETITOR_ID}`}
                                </Typography>
                              </>
                            )}
                            {!competitor && (
                              <Typography variant="body2" color="text.secondary">
                                {trophy.competitorName || `Competitor ${trophy.COMPETITOR_ID}`}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Collapse>
            </Box>
            );
          })
        )}
      </Paper>
    </Box>
  );
};

export default TrophiesTable;
