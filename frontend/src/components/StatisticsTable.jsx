import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Checkbox,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Format season name
 */
const formatSeason = (seasonName, seasonStartDate, seasonEndDate) => {
  if (seasonName) return seasonName;
  if (seasonStartDate && seasonEndDate) {
    const start = new Date(seasonStartDate);
    const end = new Date(seasonEndDate);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    if (startYear === endYear) {
      return `${startYear}/${String(endYear + 1).slice(-2)}`;
    }
    return `${startYear}/${String(endYear).slice(-2)}`;
  }
  return '';
};

/**
 * StatisticsTable Component
 */
const StatisticsTable = ({
  statistics = [],
  statisticsTypes = [],
  competitions = [],
  countries = [],
  competitors = [],
  loading = false,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [stickyColumnsDialogOpen, setStickyColumnsDialogOpen] = useState(false);
  
  // Load sticky columns settings from localStorage
  const [stickyColumns, setStickyColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('statisticsTable_stickyColumns');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load sticky columns settings:', e);
    }
    return {
      checkbox: true,
      season: true,
      country: false,
      competitionName: false,
      competitorName: false,
      phase: false,
      actions: false,
    };
  });

  // Save sticky columns settings to localStorage
  const updateStickyColumns = (newColumns) => {
    setStickyColumns(newColumns);
    try {
      localStorage.setItem('statisticsTable_stickyColumns', JSON.stringify(newColumns));
    } catch (e) {
      console.error('Failed to save sticky columns settings:', e);
    }
  };

  // Group statistics by competition, season, and competitor
  const groupedStatistics = useMemo(() => {
    const groups = new Map();

    statistics.forEach((stat) => {
      const key = `${stat.COMPETITION_ID}-${stat.SEASON_NUM}-${stat.COMPETITOR_ID}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          COMPETITION_ID: stat.COMPETITION_ID,
          SEASON_NUM: stat.SEASON_NUM,
          COMPETITOR_ID: stat.COMPETITOR_ID,
          competitionName: stat.competitionName || `Competition ${stat.COMPETITION_ID}`,
          competitionCountryName: stat.competitionCountryName || '',
          competitionCountryEmoji: stat.competitionCountryEmoji || '',
          seasonName: stat.seasonName || '',
          seasonStartDate: stat.seasonStartDate || '',
          seasonEndDate: stat.seasonEndDate || '',
          competitorName: stat.competitorName || `Competitor ${stat.COMPETITOR_ID}`,
          competitorCountryName: stat.competitorCountryName || '',
          competitorCountryEmoji: stat.competitorCountryEmoji || '',
          PHASE_NUM: stat.PHASE_NUM,
          stats: {},
        });
      }

      const group = groups.get(key);
      group.stats[stat.STATISTICS_TYPE] = {
        NUMERIC_VAL: stat.NUMERIC_VAL,
        VALUE: stat.VALUE,
        STATISTICS_TYPE_ID: stat.STATISTICS_TYPE_ID,
      };
    });

    return Array.from(groups.values());
  }, [statistics]);

  // Sort statistics types by ID
  const sortedStatisticsTypes = useMemo(() => {
    return [...statisticsTypes].sort((a, b) => a.STATISTICS_TYPE_ID - b.STATISTICS_TYPE_ID);
  }, [statisticsTypes]);

  // Handle row selection
  const handleRowSelect = (key) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRows(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === groupedStatistics.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(groupedStatistics.map((_, index) => index)));
    }
  };

  const isAllSelected = groupedStatistics.length > 0 && selectedRows.size === groupedStatistics.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < groupedStatistics.length;

  // Calculate left position for sticky columns
  const getStickyLeft = (columnKey) => {
    const columnWidths = {
      checkbox: 50,
      season: 150,
      country: 120,
      competitionName: 250,
      competitorName: 200,
      phase: 100,
      actions: 100,
    };

    let left = 0;
    const order = ['checkbox', 'season', 'country', 'competitionName', 'competitorName', 'phase', 'actions'];
    const index = order.indexOf(columnKey);
    
    if (index === -1) return 0;
    
    for (let i = 0; i < index; i++) {
      if (stickyColumns[order[i]]) {
        left += columnWidths[order[i]] || 100;
      }
    }
    
    return left;
  };

  // Get sticky styles for a column
  const getStickyStyles = (columnKey) => {
    if (!stickyColumns[columnKey]) return {};
    
    return {
      position: 'sticky',
      left: getStickyLeft(columnKey),
      zIndex: columnKey === 'checkbox' ? 1300 : 1200,
      backgroundColor: '#fafafa',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '1px',
        backgroundColor: '#e0e0e0',
      },
    };
  };

  // Get sticky styles for body cells
  const getStickyBodyStyles = (columnKey, isSelected) => {
    if (!stickyColumns[columnKey]) return {};
    
    return {
      position: 'sticky',
      left: getStickyLeft(columnKey),
      zIndex: columnKey === 'checkbox' ? 1100 : 1000,
      backgroundColor: 'inherit',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '1px',
        backgroundColor: '#e0e0e0',
      },
    };
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          p: 2,
          backgroundColor: '#f5f5f5',
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Sticky Columns Settings">
            <IconButton
              onClick={() => setStickyColumnsDialogOpen(true)}
              size="small"
              sx={{
                backgroundColor: '#f5f5f5',
                color: '#666',
                '&:hover': {
                  backgroundColor: '#e0e0e0',
                },
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onAdd && (
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
          )}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 600,
          boxShadow: 1,
          borderTop: 'none',
          overflowX: 'auto',
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  fontWeight: 700, 
                  backgroundColor: '#fafafa', 
                  minWidth: 50,
                  ...getStickyStyles('checkbox'),
                }} 
                padding="checkbox"
              >
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 150,
                ...getStickyStyles('season'),
              }}>
                Season
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 120,
                ...getStickyStyles('country'),
              }}>
                Country
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 250,
                ...getStickyStyles('competitionName'),
              }}>
                Competition Name
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 200,
                ...getStickyStyles('competitorName'),
              }}>
                Competitor Name
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 100,
                ...getStickyStyles('phase'),
              }}>
                Phase
              </TableCell>
              {sortedStatisticsTypes.map((statType) => (
                <TableCell
                  key={statType.STATISTICS_TYPE_ID}
                  sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }}
                  align="center"
                >
                  {statType.STATISTICS_TYPE}
                </TableCell>
              ))}
              <TableCell sx={{ 
                fontWeight: 700, 
                backgroundColor: '#fafafa', 
                minWidth: 100,
                ...getStickyStyles('actions'),
              }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7 + sortedStatisticsTypes.length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : groupedStatistics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7 + sortedStatisticsTypes.length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No statistics found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              groupedStatistics.map((group, index) => {
                const key = `${group.COMPETITION_ID}-${group.SEASON_NUM}-${group.COMPETITOR_ID}`;
                const isSelected = selectedRows.has(index);
                const seasonDisplay = formatSeason(
                  group.seasonName,
                  group.seasonStartDate,
                  group.seasonEndDate
                );

                return (
                  <TableRow
                    key={key}
                    hover
                    selected={isSelected}
                    sx={{
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                      '&:hover': {
                        backgroundColor: isSelected 
                          ? 'rgba(25, 118, 210, 0.12)' 
                          : 'rgba(0, 0, 0, 0.04)',
                        '& td[data-sticky="true"]': {
                          backgroundColor: isSelected 
                            ? 'rgba(25, 118, 210, 0.12)' 
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      },
                    }}
                  >
                    <TableCell 
                      padding="checkbox"
                      data-sticky={stickyColumns.checkbox ? 'true' : undefined}
                      sx={getStickyBodyStyles('checkbox', isSelected)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleRowSelect(index)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell 
                      data-sticky={stickyColumns.season ? 'true' : undefined}
                      sx={getStickyBodyStyles('season', isSelected)}
                    >
                      {seasonDisplay}
                    </TableCell>
                    <TableCell 
                      data-sticky={stickyColumns.country ? 'true' : undefined}
                      sx={getStickyBodyStyles('country', isSelected)}
                    >
                      {group.competitionCountryEmoji && (
                        <span style={{ marginRight: 4 }}>{group.competitionCountryEmoji}</span>
                      )}
                      {group.competitionCountryName || '-'}
                    </TableCell>
                    <TableCell 
                      data-sticky={stickyColumns.competitionName ? 'true' : undefined}
                      sx={getStickyBodyStyles('competitionName', isSelected)}
                    >
                      {group.competitionName} ({group.COMPETITION_ID})
                    </TableCell>
                    <TableCell 
                      data-sticky={stickyColumns.competitorName ? 'true' : undefined}
                      sx={getStickyBodyStyles('competitorName', isSelected)}
                    >
                      {group.competitorName}
                    </TableCell>
                    <TableCell 
                      data-sticky={stickyColumns.phase ? 'true' : undefined}
                      sx={getStickyBodyStyles('phase', isSelected)}
                    >
                      {group.PHASE_NUM || '-'}
                    </TableCell>
                    {sortedStatisticsTypes.map((statType) => {
                      const stat = group.stats[statType.STATISTICS_TYPE];
                      return (
                        <TableCell key={statType.STATISTICS_TYPE_ID} align="center">
                          {stat ? stat.VALUE : '0'}
                        </TableCell>
                      );
                    })}
                    <TableCell 
                      align="center"
                      data-sticky={stickyColumns.actions ? 'true' : undefined}
                      sx={getStickyBodyStyles('actions', isSelected)}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {onEdit && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(group)}
                              sx={{
                                color: '#1976d2',
                                '&:hover': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => onDelete(group)}
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
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: '#f5f5f5',
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Total Items: {groupedStatistics.length}
        </Typography>
      </Box>

      {/* Sticky Columns Settings Dialog */}
      <Dialog
        open={stickyColumnsDialogOpen}
        onClose={() => setStickyColumnsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sticky Columns Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which columns should remain visible when scrolling horizontally.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.checkbox}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, checkbox: e.target.checked })
                    }
                  />
                }
                label="Checkbox"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.season}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, season: e.target.checked })
                    }
                  />
                }
                label="Season"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.country}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, country: e.target.checked })
                    }
                  />
                }
                label="Country"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.competitionName}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, competitionName: e.target.checked })
                    }
                  />
                }
                label="Competition Name"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.competitorName}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, competitorName: e.target.checked })
                    }
                  />
                }
                label="Competitor Name"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.phase}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, phase: e.target.checked })
                    }
                  />
                }
                label="Phase"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={stickyColumns.actions}
                    onChange={(e) =>
                      updateStickyColumns({ ...stickyColumns, actions: e.target.checked })
                    }
                  />
                }
                label="Actions"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStickyColumnsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StatisticsTable;
