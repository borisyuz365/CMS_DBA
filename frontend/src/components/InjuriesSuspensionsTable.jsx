import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Tooltip,
  Chip,
  Checkbox,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * Format date (DD/MM/YYYY)
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * InjuriesSuspensionsTable Component
 */
const InjuriesSuspensionsTable = ({
  injuries = [],
  suspensions = [],
  onEditInjury,
  onDeleteInjury,
  onAddInjury,
  onEditSuspension,
  onDeleteSuspension,
  onAddSuspension,
  competitions = [],
  loading = false,
}) => {
  const [hoveredInjuryRow, setHoveredInjuryRow] = useState(null);
  const [hoveredSuspensionRow, setHoveredSuspensionRow] = useState(null);

  // Get competition by ID
  const getCompetition = (competitionId) => {
    return competitions.find(c => c.COMPETITION_ID === competitionId);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Injuries Section */}
      <Box sx={{ mb: 4 }}>
        {/* Injuries Header */}
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
            Injuries
          </Typography>
          <IconButton
            onClick={onAddInjury}
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

        {/* Injuries Table */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 400,
            boxShadow: 1,
            borderTop: 'none',
            overflowX: 'auto',
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                  Start Date
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                  End Date
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                  Injury Type
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                  Injury Category
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                  Expected Return
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Active
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Doubtful
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Type Unknown
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Irrelevant
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : injuries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No injuries found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                injuries.map((injury) => (
                  <TableRow
                    key={injury.INJURY_ID}
                    hover
                    onMouseEnter={() => setHoveredInjuryRow(injury.INJURY_ID)}
                    onMouseLeave={() => setHoveredInjuryRow(null)}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <TableCell>{formatDate(injury.START_DATE)}</TableCell>
                    <TableCell>{formatDate(injury.END_DATE)}</TableCell>
                    <TableCell>
                      {injury.INJURY_TYPE ? (
                        <Chip
                          label={injury.INJURY_TYPE}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {injury.INJURY_CATEGORY ? (
                        <Chip
                          label={injury.INJURY_CATEGORY}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(injury.EXPECTED_RETURN)}</TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={injury.ACTIVE || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={injury.DOUBTFUL || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={injury.INJURY_TYPE_UNKNOWN || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={injury.IRRELEVANT || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEditInjury(injury)}
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
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => onDeleteInjury(injury)}
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
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Injuries Footer */}
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
            Total Injuries: {injuries.length}
          </Typography>
        </Box>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3 }} />

      {/* Suspensions Section */}
      <Box>
        {/* Suspensions Header */}
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
            Suspensions
          </Typography>
          <IconButton
            onClick={onAddSuspension}
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

        {/* Suspensions Table */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 400,
            boxShadow: 1,
            borderTop: 'none',
            overflowX: 'auto',
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 200 }}>
                  Competition
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                  Suspension Type
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Games Count
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : suspensions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No suspensions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suspensions.map((suspension) => {
                  const competition = suspension.COMPETITION_ID
                    ? getCompetition(suspension.COMPETITION_ID)
                    : null;

                  return (
                    <TableRow
                      key={suspension.SUSPENSION_ID}
                      hover
                      onMouseEnter={() => setHoveredSuspensionRow(suspension.SUSPENSION_ID)}
                      onMouseLeave={() => setHoveredSuspensionRow(null)}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell>
                        {competition ? (
                          <Typography>
                            {competition.name || `Competition ${suspension.COMPETITION_ID}`}
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {suspension.SUSPENSION_TYPE ? (
                          <Chip
                            label={suspension.SUSPENSION_TYPE}
                            size="small"
                            sx={{ fontSize: '0.75rem', height: 24 }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {suspension.GAMES_COUNT || '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEditSuspension(suspension)}
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
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => onDeleteSuspension(suspension)}
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
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Suspensions Footer */}
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
            Total Suspensions: {suspensions.length}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default InjuriesSuspensionsTable;
