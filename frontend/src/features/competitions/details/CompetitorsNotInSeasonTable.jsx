import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
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
  Typography,
} from '@mui/material';

export default function CompetitorsNotInSeasonTable({
  competitionId,
  competition,
  competitors,
  selectedCompetitorIds,
  rowsPerPage,
  page,
  filters,
  countries,
  allCompetitions,
  onSelectedCompetitorIdsChange,
  onPageChange,
  onRowsPerPageChange,
  onFiltersChange,
  onLoadCompetitors,
}) {
  return (
    <Box sx={{ flex: { xs: '1 1 100%', md: '45 1 0%' }, minWidth: 0, order: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 52, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#000' }}>
          Competitors Not In Season {competitors.length > 0 && (
            <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
              (Total: {competitors.length})
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, minHeight: 52, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Country</InputLabel>
            <Select
              value={filters.countryId || ''}
              label="Country"
              onChange={(event) => {
                const newCountry = event.target.value === '' ? '' : event.target.value;
                onFiltersChange((currentFilters) => {
                  let newCompetition = '';
                  if (newCountry) {
                    const currentCompetition = allCompetitions.find((item) => Number(item.COMPETITION_ID) === Number(competitionId));
                    newCompetition = currentCompetition && Number(currentCompetition.COUNTRY_ID) === Number(newCountry) ? String(competitionId) : '';
                  }
                  return { ...currentFilters, countryId: newCountry, competitionId: newCompetition };
                });
              }}
            >
              <MenuItem value="">All</MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                  {country.name || `Country ${country.COUNTRY_ID}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {filters.countryId && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Competition</InputLabel>
              <Select
                value={filters.competitionId || ''}
                label="Competition"
                onChange={(event) =>
                  onFiltersChange((currentFilters) => ({
                    ...currentFilters,
                    competitionId: event.target.value === '' ? '' : event.target.value,
                  }))
                }
              >
                <MenuItem value="">All</MenuItem>
                {(allCompetitions || [])
                  .filter(
                    (item) =>
                      Number(item.SPORT_TYPE_ID) === Number(competition?.SPORT_TYPE_ID) &&
                      Number(item.COUNTRY_ID) === Number(filters.countryId)
                  )
                  .map((item) => (
                    <MenuItem key={item.COMPETITION_ID} value={item.COMPETITION_ID}>
                      {item.name || `Competition ${item.COMPETITION_ID}`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
          <TextField
            size="small"
            label="Competitor Name"
            placeholder="Search by name"
            value={filters.name || ''}
            onChange={(event) =>
              onFiltersChange((currentFilters) => ({ ...currentFilters, name: event.target.value }))
            }
            sx={{ minWidth: 160 }}
          />
          <Button variant="contained" size="small" onClick={onLoadCompetitors} sx={{ textTransform: 'none' }}>
            SEARCH
          </Button>
        </Box>
      </Box>
      <Paper variant="outlined" sx={{ height: 530, minHeight: 530, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
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
                    inputProps={{ 'aria-label': 'select all not in season' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
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
                    <TableCell>{row.countryName || '—'}</TableCell>
                  </TableRow>
                );
              })}
              {competitors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    No competitors found. Use filters and search.
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
