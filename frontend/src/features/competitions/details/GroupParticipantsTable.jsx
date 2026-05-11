import React from 'react';
import {
  Box,
  Checkbox,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

export default function GroupParticipantsTable({
  participants,
  loading,
  editingIndex,
  selectedSeasonNum,
  selectedStageNum,
  groupNum,
  onAddParticipant,
  onDeleteParticipant,
  onSaveParticipant,
  onParticipantNameClick,
  onParticipantsChange,
  onEditingIndexChange,
}) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Participants</Typography>
        <IconButton size="small" onClick={() => onAddParticipant(selectedSeasonNum, selectedStageNum, groupNum)} title="Add participant">
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <TableContainer sx={{ maxHeight: 200, overflow: 'auto' }}>
        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Actions</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Part. #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Origin Group</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Origin Pos.</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Origin Stage</TableCell>
              <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Use Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
            ) : (
              participants.map((participant, index) => {
                const participantNum = participant.PARTICIPANT_NUM ?? 0;
                const hasName = !!(participant.NAME_ID && participant.NAME_ID !== 0);
                const isEditing = editingIndex === index;
                return (
                  <TableRow key={`${participantNum}-${index}`} hover>
                    <TableCell padding="none" sx={{ width: 80 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => onDeleteParticipant(selectedSeasonNum, selectedStageNum, groupNum, participantNum)} sx={{ color: '#d32f2f' }} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        {isEditing ? (
                          <IconButton
                            size="small"
                            onClick={() => onSaveParticipant(
                              selectedSeasonNum,
                              selectedStageNum,
                              groupNum,
                              participantNum,
                              {
                                USE_NAME: !!participant.USE_NAME,
                                ORIGIN_GROUP_NUM: participant.ORIGIN_GROUP_NUM ?? null,
                                ORIGIN_GROUP_POSITION: participant.ORIGIN_GROUP_POSITION ?? null,
                                ORIGIN_STAGE_NUM: participant.ORIGIN_STAGE_NUM ?? null,
                              }
                            )}
                            title="Save"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton size="small" onClick={() => onEditingIndexChange(index)} title="Edit">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{participant.PARTICIPANT_NUM}</TableCell>
                    <TableCell
                      onClick={hasName ? (event) => onParticipantNameClick(event, participant, selectedSeasonNum, selectedStageNum, groupNum) : undefined}
                      sx={{ cursor: hasName ? 'pointer' : 'default', textDecoration: hasName ? 'underline' : 'none', '&:hover': hasName ? { color: 'primary.main' } : {} }}
                    >
                      {participant.name || `Participant ${participant.PARTICIPANT_NUM}`}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={participant.ORIGIN_GROUP_NUM ?? ''}
                          onChange={(event) => onParticipantsChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ORIGIN_GROUP_NUM: event.target.value === '' ? null : Number(event.target.value) } : item))}
                          placeholder="—"
                          inputProps={{ min: 0, style: { width: 56 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        participant.ORIGIN_GROUP_NUM ?? '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={participant.ORIGIN_GROUP_POSITION ?? ''}
                          onChange={(event) => onParticipantsChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ORIGIN_GROUP_POSITION: event.target.value === '' ? null : Number(event.target.value) } : item))}
                          placeholder="—"
                          inputProps={{ min: 0, style: { width: 56 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        participant.ORIGIN_GROUP_POSITION ?? '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={participant.ORIGIN_STAGE_NUM ?? ''}
                          onChange={(event) => onParticipantsChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ORIGIN_STAGE_NUM: event.target.value === '' ? null : Number(event.target.value) } : item))}
                          placeholder="—"
                          inputProps={{ min: 0, style: { width: 56 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        participant.ORIGIN_STAGE_NUM ?? '—'
                      )}
                    </TableCell>
                    <TableCell padding="checkbox" onClick={(event) => !isEditing && event.stopPropagation()}>
                      {isEditing ? (
                        <Checkbox size="small" checked={!!participant.USE_NAME} onChange={(event) => onParticipantsChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, USE_NAME: event.target.checked } : item))} />
                      ) : (
                        !!participant.USE_NAME ? '✓' : '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!loading && participants.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2 }}>No participants</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
