import React from 'react';
import {
  Avatar,
  Box,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export default function CompetitorsNotInGroupsTable({
  competitors,
  selectedCompetitorIds,
  loading,
  hasSelectedGroup,
  onSelectedCompetitorIdsChange,
}) {
  return (
    <>
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#000', display: 'block' }}>
        Competitors Not In Groups
        {hasSelectedGroup && (
          <Typography component="span" variant="caption" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>
            (adds to selected group)
          </Typography>
        )}
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 320, overflow: 'auto' }}>
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
                  inputProps={{ 'aria-label': 'select all not in groups' }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {competitors.map((row) => {
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
                        <Avatar src={row.logoUrl} alt={row.name || ''} variant="rounded" sx={{ width: 28, height: 28 }} />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}>
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
            {competitors.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  No competitors available (all in groups or not in season).
                </TableCell>
              </TableRow>
            )}
            {loading && competitors.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
