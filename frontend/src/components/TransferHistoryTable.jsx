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
  Checkbox,
  Typography,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * Format currency value
 */
const formatCurrency = (value, currency) => {
  if (!value) return '';
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}${currency || '€'}`;
};

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
 * TransferHistoryTable Component
 */
const TransferHistoryTable = ({
  contracts = [],
  onEdit,
  onDelete,
  onAdd,
  competitors = [],
  countries = [],
  competitions = [],
  athletesPositions = [],
  currencies = [],
  loading = false,
  onTermClick, // Callback for term clicks: (nameId, category) => void
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  // Get competitor by ID
  const getCompetitor = (competitorId) => {
    return competitors.find(c => c.COMPETITOR_ID === competitorId);
  };

  // Get country by ID
  const getCountry = (countryId) => {
    return countries.find(c => c.COUNTRY_ID === countryId);
  };

  // Get competition by ID
  const getCompetition = (competitionId) => {
    return competitions.find(c => c.COMPETITION_ID === competitionId);
  };

  // Get currency symbol
  const getCurrencySymbol = (currencyId) => {
    if (!currencyId) return '€';
    const currency = currencies.find(c => c.CURRENCY_ID === currencyId);
    return currency ? currency.SYMBOL || currency.CURRENCY_CODE : '€';
  };

  // Get position name
  const getPositionName = (positionId) => {
    if (!positionId) return '';
    const position = athletesPositions.find(p => p.POSITION_ID === positionId);
    return position ? position.POSITION_NAME : '';
  };

  // Get formation position name
  const getFormationPositionName = (positionId, formationPositionId) => {
    if (!positionId || !formationPositionId) return '';
    const position = athletesPositions.find(p => p.POSITION_ID === positionId);
    if (!position || !position.FORMATION_POSITIONS) return '';
    const formationPos = position.FORMATION_POSITIONS.find(
      fp => fp.FORMATION_POSITION_ID === formationPositionId
    );
    return formationPos ? formationPos.FORMATION_POSITION_NAME : '';
  };

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
          Transfer History
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
        <Table stickyHeader size="small" sx={{ minWidth: 2000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 80 }}>
                Jersey Number
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }}>
                Competitor ID
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 200 }}>
                Competitor Name
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                Competitor Country
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                Main Competition
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                Transfer Type
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                Transfer Fee
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                Salary
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }}>
                Position
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }}>
                Formation
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                Contract Start
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 120 }}>
                Contract End
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                Current Club
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 150 }} align="center">
                Block Auto Updates
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#fafafa', minWidth: 100 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No contracts found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => {
                const competitor = getCompetitor(contract.COMPETITOR_ID);
                const country = competitor ? getCountry(competitor.COUNTRY_ID) : null;
                const competition = contract.MAIN_COMPETITION_ID
                  ? getCompetition(contract.MAIN_COMPETITION_ID)
                  : (competitor ? getCompetition(competitor.MAIN_COMPETITION) : null);

                return (
                  <TableRow
                    key={contract.CONTRACT_ID}
                    hover
                    onMouseEnter={() => setHoveredRow(contract.CONTRACT_ID)}
                    onMouseLeave={() => setHoveredRow(null)}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <TableCell>{contract.JERSEY_NUMBER || '-'}</TableCell>
                    <TableCell>{contract.COMPETITOR_ID}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {competitor && (
                          <Typography
                            component="span"
                            onClick={() => competitor.NAME_ID && onTermClick && onTermClick(competitor.NAME_ID, 'Competitors Names')}
                            sx={{
                              color: '#1976d2',
                              cursor: competitor.NAME_ID && onTermClick ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: competitor.NAME_ID && onTermClick ? 'underline' : 'none',
                              },
                            }}
                          >
                            {contract.competitorName || `Competitor ${contract.COMPETITOR_ID}`}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {country && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {country.EMOJI && (
                            <Typography component="span">{country.EMOJI}</Typography>
                          )}
                          <Typography
                            component="span"
                            onClick={() => country.NAME_ID && onTermClick && onTermClick(country.NAME_ID, 'Countries Names')}
                            sx={{
                              color: country.NAME_ID && onTermClick ? '#1976d2' : 'inherit',
                              cursor: country.NAME_ID && onTermClick ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: country.NAME_ID && onTermClick ? 'underline' : 'none',
                              },
                            }}
                          >
                            {country.name || `Country ${country.COUNTRY_ID}`}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {competition ? (
                        <Typography
                          onClick={() => competition.NAME_ID && onTermClick && onTermClick(competition.NAME_ID, 'Competitions Names')}
                          sx={{
                            color: competition.NAME_ID && onTermClick ? '#1976d2' : 'inherit',
                            cursor: competition.NAME_ID && onTermClick ? 'pointer' : 'default',
                            '&:hover': {
                              textDecoration: competition.NAME_ID && onTermClick ? 'underline' : 'none',
                            },
                          }}
                        >
                          {contract.mainCompetitionName || competition.name || '-'}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.TRANSFER_TYPE ? (
                        <Chip
                          label={contract.TRANSFER_TYPE}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.TRANSFER_FEE
                        ? formatCurrency(contract.TRANSFER_FEE, getCurrencySymbol(contract.TRANSFER_FEE_CURRENCY))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.SALARY
                        ? formatCurrency(contract.SALARY, getCurrencySymbol(contract.SALARY_CURRENCY))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.POSITION ? (() => {
                        const positionName = getPositionName(contract.POSITION);
                        return (
                          <Typography
                            onClick={() => positionName && onTermClick && onTermClick(positionName, 'Athlete Position Types')}
                            sx={{
                              color: '#1976d2',
                              cursor: positionName && onTermClick ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: positionName && onTermClick ? 'underline' : 'none',
                              },
                            }}
                          >
                            {positionName}
                          </Typography>
                        );
                      })() : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.FORMATION_POSITION ? (() => {
                        const formationPositionName = getFormationPositionName(contract.POSITION, contract.FORMATION_POSITION);
                        return (
                          <Typography
                            onClick={() => formationPositionName && onTermClick && onTermClick(formationPositionName, 'Athlete Formation Position Types')}
                            sx={{
                              color: '#1976d2',
                              cursor: formationPositionName && onTermClick ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: formationPositionName && onTermClick ? 'underline' : 'none',
                              },
                            }}
                          >
                            {formationPositionName}
                          </Typography>
                        );
                      })() : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(contract.START_DATE)}</TableCell>
                    <TableCell>{formatDate(contract.END_DATE)}</TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={contract.CURRENT_CLUB || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={contract.BLOCK_AUTOMATIC_UPDATES || false}
                        disabled
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(contract)}
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
                            onClick={() => onDelete(contract)}
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
    </Box>
  );
};

export default TransferHistoryTable;
