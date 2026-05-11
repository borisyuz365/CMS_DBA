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
  TextField,
  Typography,
} from '@mui/material';

export default function GroupCompetitorsTable({
  competitors,
  selectedCompetitorIds,
  loading,
  selectedSeasonNum,
  selectedStageNum,
  groupNum,
  onSelectedCompetitorIdsChange,
  onCompetitorsChange,
  onParticipantNumChange,
}) {
  return (
    <>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
        Competitors In Group (stage_competitors)
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ height: 320, minHeight: 320, overflow: 'auto' }}>
        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={competitors.length > 0 && selectedCompetitorIds.length === competitors.length}
                  indeterminate={selectedCompetitorIds.length > 0 && selectedCompetitorIds.length < competitors.length}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onSelectedCompetitorIdsChange(competitors.map((row) => row.COMPETITOR_ID ?? row.COMPETITOR_NUM));
                    } else {
                      onSelectedCompetitorIdsChange([]);
                    }
                  }}
                  inputProps={{ 'aria-label': 'select all in group' }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Competitor Country</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Participant Number</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {competitors.map((row) => {
              const competitorId = row.COMPETITOR_ID ?? row.COMPETITOR_NUM;
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
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <TextField
                      variant="outlined"
                      size="small"
                      type="number"
                      value={row.PARTICIPANT_NUM ?? ''}
                      onBlur={(event) => {
                        const value = event.target.value;
                        onParticipantNumChange(selectedSeasonNum, selectedStageNum, groupNum, competitorId, value);
                      }}
                      onChange={(event) => {
                        onCompetitorsChange((prev) =>
                          prev.map((item) =>
                            (item.COMPETITOR_ID ?? item.COMPETITOR_NUM) === competitorId
                              ? { ...item, PARTICIPANT_NUM: event.target.value === '' ? null : Number(event.target.value) }
                              : item
                          )
                        );
                      }}
                      inputProps={{ min: 0, style: { width: 56, textAlign: 'center' } }}
                      sx={{
                        width: 72,
                        '& .MuiOutlinedInput-root': { backgroundColor: 'background.paper' },
                        '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' },
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {competitors.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No competitors in this group.
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
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
