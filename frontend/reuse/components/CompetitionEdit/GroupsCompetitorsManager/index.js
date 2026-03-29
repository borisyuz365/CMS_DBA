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
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import api from '../../../services/api';

// Group Competitors Table Component
function GroupCompetitorsTable({ 
  group,
  competitors,
  selectedIds,
  onSelectionChange,
  onParticipantNumberChange,
}) {
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        border: '1px solid #e0e0e0', 
        mt: 1,
        '& .MuiTableCell': {
          minWidth: { xs: 100, sm: 'auto' },
          whiteSpace: { xs: 'nowrap', sm: 'normal' },
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          padding: { xs: '8px 4px', sm: '16px' },
        },
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell padding="checkbox" sx={{ fontWeight: 600 }}>
              <Checkbox
                checked={competitors.length > 0 && selectedIds.length === competitors.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < competitors.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange(competitors.map(c => c.id));
                  } else {
                    onSelectionChange([]);
                  }
                }}
                size="small"
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Competitor ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Competitor Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Competitor Country</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Participant Number</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {competitors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No competitors in this group
              </TableCell>
            </TableRow>
          ) : (
            competitors.map((competitor) => (
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
                    size="small"
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
                    <span style={{ marginRight: 8 }}>{competitor.countryFlag}</span>
                  )}
                  {competitor.country}
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={competitor.participantNumber || ''}
                    onChange={(e) => onParticipantNumberChange(competitor.id, e.target.value ? parseInt(e.target.value) : null)}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{ min: 1 }}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Not In Groups Table Component
function NotInGroupsTable({ 
  competitors, 
  selectedIds, 
  onSelectionChange,
  onAddCompetitorsToGroup,
  getExpandedGroupNum,
  searchTerm = '',
  onSearchChange,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Pagination state
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 128; // Default 128 competitors per page
  
  // סינון לפי searchTerm - רק שם ו-ID
  const filteredCompetitors = React.useMemo(() => {
    if (!searchTerm) return competitors;
    const term = searchTerm.toLowerCase();
    return competitors.filter(c => 
      c.id.toString().includes(term) ||
      c.name?.toLowerCase().includes(term)
    );
  }, [competitors, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCompetitors.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentCompetitors = filteredCompetitors.slice(startIndex, endIndex);

  // Handle page navigation
  const handlePageChange = (newPage) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  };

  // Reset page when search term changes
  React.useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder="Search by name or ID..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />
      <TableContainer 
        component={Paper} 
        sx={{ 
          border: '1px solid #e0e0e0',
          maxHeight: 'calc(10 * 53px)', // מקסימום 10 שורות (כל שורה ~53px)
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
              <TableCell padding="checkbox" sx={{ fontWeight: 600 }}>
                <Checkbox
                  checked={competitors.length > 0 && selectedIds.length === competitors.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < competitors.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange(competitors.map(c => c.id));
                    } else {
                      onSelectionChange([]);
                    }
                  }}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor Country</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentCompetitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  {searchTerm ? 'No competitors found' : 'No competitors available'}
                </TableCell>
              </TableRow>
            ) : (
              currentCompetitors.map((competitor) => (
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
                      size="small"
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
                      <span style={{ marginRight: 8 }}>{competitor.countryFlag}</span>
                    )}
                    {competitor.country}
                  </TableCell>
                </TableRow>
              ))
            )}
        </TableBody>
      </Table>
    </TableContainer>
    
    {/* Pagination Controls - Responsive */}
    {filteredCompetitors.length > rowsPerPage && (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 1, sm: 0 },
        mt: 1, 
        px: 1 
      }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            textAlign: { xs: 'center', sm: 'left' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          Showing {startIndex + 1}-{Math.min(endIndex, filteredCompetitors.length)} of {filteredCompetitors.length}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 0.5 },
          justifyContent: { xs: 'center', sm: 'flex-end' }
        }}>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(0)}
            disabled={page === 0}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <FirstPageIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography 
            variant="body2" 
            sx={{ 
              minWidth: { xs: 70, sm: 60 }, 
              textAlign: 'center',
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            Page {page + 1} / {totalPages}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <LastPageIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    )}
    
      {selectedIds.length > 0 && (
        <Box sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          display: 'flex', 
          justifyContent: { xs: 'center', sm: 'flex-start' },
          borderTop: '1px solid #e0e0e0', 
          mt: 1, 
          backgroundColor: '#fff', 
          borderRadius: '0 0 4px 4px' 
        }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const expandedGroupNum = getExpandedGroupNum();
              if (expandedGroupNum && selectedIds.length > 0) {
                onAddCompetitorsToGroup(expandedGroupNum, selectedIds);
              }
            }}
            disabled={getExpandedGroupNum() === null}
            fullWidth={isMobile}
            sx={{ 
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              minHeight: { xs: 44, sm: 40 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            Add to Group
          </Button>
        </Box>
      )}
    </Box>
  );
}

// Main Groups Competitors Manager Component
function GroupsCompetitorsManager({
  groups = [],
  competitorsInGroups = [],
  competitorsNotInGroups = [],
  selectedInGroups = {},
  selectedNotInGroups = [],
  onInGroupsSelectionChange,
  onNotInGroupsSelectionChange,
  onAddCompetitorsToGroup,
  onRemoveCompetitorsFromGroup,
  onParticipantNumberChange,
  onEditGroup,
  onDeleteGroup,
  onAddGroup,
  competitionId,
  seasonNum,
  stageNum,
}) {
  // Track expanded groups - only one can be expanded at a time
  const [expandedGroups, setExpandedGroups] = React.useState({});

  const handleGroupToggle = (groupNum) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = prev[groupNum] === true;
      
      // If clicking on an expanded group, close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [groupNum]: false
        };
      }
      
      // If clicking on a collapsed group, close all others and open this one
      return {
        [groupNum]: true
      };
    });
  };

  // Get the currently expanded group number (only one should be expanded)
  const getExpandedGroupNum = () => {
    const expanded = Object.keys(expandedGroups).find(gn => expandedGroups[gn] === true);
    if (expanded) {
      return parseInt(expanded);
    }
    return null;
  };

  // Get group name from groups array
  const getGroupName = (groupNum) => {
    const group = groups.find(g => g.GROUP_NUM === groupNum || g.groupNum === groupNum);
    if (group && group.name) {
      return group.name;
    }
    return `Group ${groupNum}`;
  };

  // Get competitors for a specific group
  const getCompetitorsForGroup = (groupNum) => {
    const groupData = competitorsInGroups.find(g => g.groupNum === groupNum);
    return groupData ? groupData.competitors : [];
  };

  // State לחיפוש (רק לטבלה הימנית)
  const [searchTermNotInGroups, setSearchTermNotInGroups] = React.useState('');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          Groups Competitors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          Manage competitors for each group. Use the action buttons to add/remove them from groups.
        </Typography>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 } 
      }}>
        {/* Left Section - Competitors In Groups */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#1976d2' }}>
            Competitors In Groups
          </Typography>
          
          {/* כפתור Create Group */}
          {onAddGroup && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={onAddGroup}
                sx={{
                  bgcolor: '#1976d2',
                  '&:hover': { bgcolor: '#1565c0' },
                  minWidth: 120
                }}
              >
                Create Group
              </Button>
            </Box>
          )}
          
          {groups.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              No groups available. Create a group first.
            </Box>
          ) : (
            <Box>
              {groups.map((group) => {
                const groupNum = group.GROUP_NUM || group.groupNum;
                const groupName = getGroupName(groupNum);
                const competitors = getCompetitorsForGroup(groupNum);
                const isExpanded = expandedGroups[groupNum] || false;
                const selectedIds = selectedInGroups[groupNum] || [];

                return (
                  <Box key={groupNum} sx={{ mb: 2 }}>
                    <Accordion 
                      expanded={isExpanded}
                      onChange={() => handleGroupToggle(groupNum)}
                      sx={{
                        border: '1px solid #e0e0e0',
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: isExpanded ? '#f5f5f5' : '#fff',
                          '&:hover': { backgroundColor: '#f9f9f9' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {!isExpanded && <ChevronRightIcon sx={{ color: '#666' }} />}
                            <Typography variant="body1" fontWeight={500}>
                              {groupName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({competitors.length} competitors)
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditGroup(group);
                              }}
                              sx={{ color: '#1976d2' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteGroup(group);
                              }}
                              sx={{ color: '#d32f2f' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <GroupCompetitorsTable
                          group={group}
                          competitors={competitors}
                          selectedIds={selectedIds}
                          onSelectionChange={(ids) => onInGroupsSelectionChange(groupNum, ids)}
                          onParticipantNumberChange={onParticipantNumberChange}
                        />
                        {selectedIds.length > 0 && (
                          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid #e0e0e0' }}>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => onRemoveCompetitorsFromGroup(groupNum, selectedIds)}
                              sx={{ 
                                bgcolor: '#d32f2f',
                                '&:hover': { bgcolor: '#c62828' }
                              }}
                            >
                              Remove Selected
                            </Button>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
        
        {/* Right Section - Competitors Not In Groups */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#666' }}>
            Competitors Not In Groups
          </Typography>
          <NotInGroupsTable
            competitors={competitorsNotInGroups}
            selectedIds={selectedNotInGroups}
            onSelectionChange={onNotInGroupsSelectionChange}
            onAddCompetitorsToGroup={onAddCompetitorsToGroup}
            getExpandedGroupNum={getExpandedGroupNum}
            searchTerm={searchTermNotInGroups}
            onSearchChange={setSearchTermNotInGroups}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default GroupsCompetitorsManager;

