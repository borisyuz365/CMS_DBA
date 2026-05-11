import React from 'react';
import {
  Avatar,
  Box,
  Checkbox,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

export default function CompetitorsInSeasonTable({
  seasonForm,
  competitors,
  selectedCompetitorIds,
  rowsPerPage,
  page,
  countries,
  allCompetitions,
  onSelectedCompetitorIdsChange,
  onCompetitorsChange,
  onPageChange,
  onRowsPerPageChange,
  onStatusChange,
  onStatusSeedBlur,
  onNotInSeasonChange,
}) {
  return (
    <Box sx={{ flex: { xs: '1 1 100%', md: '55 1 0%' }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 52, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#000' }}>
          Competitors In Season {competitors.length > 0 && (
            <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
              (Total: {competitors.length})
            </Typography>
          )}
        </Typography>
        <Box sx={{ minHeight: 52, display: { xs: 'none', md: 'block' }, mb: 1 }} />
      </Box>
      <Paper variant="outlined" sx={{ height: 530, minHeight: 530, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 }, '& .MuiTableRow-root': { '& td': { verticalAlign: 'middle' } } }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={competitors.length > 0 && selectedCompetitorIds.length === competitors.length}
                    indeterminate={selectedCompetitorIds.length > 0 && selectedCompetitorIds.length < competitors.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSelectedCompetitorIdsChange(competitors.map((row) => row.COMPETITOR_ID));
                      } else {
                        onSelectedCompetitorIdsChange([]);
                      }
                    }}
                    inputProps={{ 'aria-label': 'select all in season' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                {!!seasonForm.HAS_SEED && (
                  <TableCell sx={{ fontWeight: 600 }}>Seed</TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Not In Season</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rowsPerPage > 0
                ? competitors.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage
                )
                : competitors
              ).map((row) => {
                const competitorId = row.COMPETITOR_ID;
                const countryName =
                  row.countryName ||
                  (row.COUNTRY_ID && countries.find((country) => Number(country.COUNTRY_ID) === Number(row.COUNTRY_ID))?.name) ||
                  '—';
                return (
                  <TableRow
                    key={competitorId}
                    hover
                    selected={selectedCompetitorIds.includes(competitorId)}
                    onClick={() => {
                      onSelectedCompetitorIdsChange((prev) =>
                        prev.includes(competitorId) ? prev.filter((id) => id !== competitorId) : [...prev, competitorId]
                      );
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedCompetitorIds.includes(competitorId)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            onSelectedCompetitorIdsChange((prev) => [...prev, competitorId]);
                          } else {
                            onSelectedCompetitorIdsChange((prev) => prev.filter((id) => id !== competitorId));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{competitorId}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {row.logoUrl ? (
                          <Avatar
                            src={row.logoUrl}
                            alt={row.name || ''}
                            variant="rounded"
                            sx={{ width: 28, height: 28 }}
                            imgProps={{ onError: (event) => { event.target.style.display = 'none'; } }}
                          />
                        ) : (
                          <Avatar
                            variant="rounded"
                            sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}
                          >
                            {(row.name || 'C').charAt(0).toUpperCase()}
                          </Avatar>
                        )}
                        <span>{row.name || `Competitor ${competitorId}`}</span>
                      </Box>
                    </TableCell>
                    <TableCell>{countryName}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Tooltip
                        title={
                          (row.JOIN_TYPE === 1 || row.JOIN_TYPE === 2) && row.ORIGIN_COMPETITION_ID
                            ? `from ${allCompetitions.find((item) => Number(item.COMPETITION_ID) === Number(row.ORIGIN_COMPETITION_ID))?.name || `Competition ${row.ORIGIN_COMPETITION_ID}`}`
                            : ''
                        }
                        placement="top"
                      >
                        <span style={{ display: 'inline-block' }}>
                          <Select
                            size="small"
                            displayEmpty
                            value={row.HOST ? 'host' : row.JOIN_TYPE === 1 ? 'promoted' : row.JOIN_TYPE === 2 ? 'relegated' : ''}
                            onChange={(event) => onStatusChange(competitorId, event.target.value)}
                            renderValue={(value) =>
                              value === 'host' ? 'Host' : value === 'promoted' ? 'Promoted' : value === 'relegated' ? 'Relegated' : 'Select status'
                            }
                            sx={{
                              minWidth: 130,
                              height: 32,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.5 },
                            }}
                          >
                            <MenuItem value="">
                              <em>Select status</em>
                            </MenuItem>
                            <MenuItem value="host">Host</MenuItem>
                            <MenuItem value="promoted">Promoted</MenuItem>
                            <MenuItem value="relegated">Relegated</MenuItem>
                          </Select>
                        </span>
                      </Tooltip>
                    </TableCell>
                    {!!seasonForm.HAS_SEED && (
                      <TableCell>
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={row.SEED ?? ''}
                          onBlur={(event) => {
                            const value = event.target.value;
                            onStatusSeedBlur(competitorId, 'SEED', value);
                          }}
                          onChange={(event) => {
                            onCompetitorsChange((prev) =>
                              prev.map((item) =>
                                item.COMPETITOR_ID === competitorId ? { ...item, SEED: event.target.value === '' ? null : Number(event.target.value) } : item
                              )
                            );
                          }}
                          inputProps={{ min: 0, style: { width: 56, textAlign: 'center' } }}
                          onClick={(event) => event.stopPropagation()}
                          sx={{
                            width: 72,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'background.paper',
                              '& fieldset': { borderColor: 'divider' },
                              '&:hover fieldset': { borderColor: 'action.hover' },
                              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
                            },
                            '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' },
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={!!row.NOT_IN_SEASON}
                        onChange={(event) => onNotInSeasonChange(competitorId, event.target.checked)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {competitors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={seasonForm.HAS_SEED ? 7 : 6} align="center" sx={{ py: 3 }}>
                    No competitors in this season.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}>
          <TablePagination
            component="div"
            rowsPerPageOptions={[25, 50, 100, 200]}
            count={competitors.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            onRowsPerPageChange={(event) => {
              onRowsPerPageChange(parseInt(event.target.value, 10));
              onPageChange(0);
            }}
            labelRowsPerPage="Rows:"
          />
        </Box>
      </Paper>
    </Box>
  );
}
