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
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

export default function GroupGamesTable({
  games,
  loading,
  editingIndex,
  editingOriginalGameNum,
  selectedSeasonNum,
  selectedStageNum,
  groupNum,
  onAddGame,
  onDeleteGame,
  onSaveGame,
  onGamesChange,
  onEditingIndexChange,
  onEditingOriginalGameNumChange,
}) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Group Games</Typography>
        <IconButton size="small" onClick={() => onAddGame(selectedSeasonNum, selectedStageNum, groupNum)} title="Add game">
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <TableContainer sx={{ maxHeight: 200, overflow: 'auto', overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 }, minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Actions</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Game Id</TableCell>
              <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Use Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Venue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">Loading…</TableCell></TableRow>
            ) : (
              games.map((game, index) => {
                const isEditing = editingIndex === index;
                return (
                  <TableRow key={index} hover>
                    <TableCell padding="none" sx={{ width: 80 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => onDeleteGame(selectedSeasonNum, selectedStageNum, groupNum, game.GAME_NUM)} sx={{ color: '#d32f2f' }} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        {isEditing ? (
                          <IconButton
                            size="small"
                            onClick={() => onSaveGame(
                              selectedSeasonNum,
                              selectedStageNum,
                              groupNum,
                              editingOriginalGameNum ?? game.GAME_NUM,
                              {
                                GAME_NUM: game.GAME_NUM ?? 0,
                                USE_NAME: !!game.USE_NAME,
                                START_TIME: game.START_TIME || null,
                                VENUE_ID: game.VENUE_ID || 0,
                                GAME_ID: game.GAME_ID ?? 0,
                              },
                              index
                            )}
                            title="Save"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => {
                              onEditingIndexChange(index);
                              onEditingOriginalGameNumChange(game.GAME_NUM);
                            }}
                            title="Edit"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={game.GAME_NUM ?? ''}
                          onChange={(event) => onGamesChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, GAME_NUM: event.target.value === '' ? 0 : Number(event.target.value) } : item))}
                          placeholder="#"
                          inputProps={{ min: 1, style: { width: 56 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        `#${game.GAME_NUM}`
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={game.GAME_ID && game.GAME_ID !== 0 ? game.GAME_ID : ''}
                          onChange={(event) => onGamesChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, GAME_ID: event.target.value === '' ? 0 : Number(event.target.value) } : item))}
                          placeholder="—"
                          inputProps={{ min: 0, style: { width: 80 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        game.GAME_ID && game.GAME_ID !== 0 ? game.GAME_ID : '—'
                      )}
                    </TableCell>
                    <TableCell padding="checkbox" onClick={(event) => !isEditing && event.stopPropagation()}>
                      {isEditing ? (
                        <Checkbox size="small" checked={!!game.USE_NAME} onChange={(event) => onGamesChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, USE_NAME: event.target.checked } : item))} />
                      ) : (
                        !!game.USE_NAME ? '✓' : '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <DateTimePicker
                          value={game.START_TIME ? dayjs(game.START_TIME) : null}
                          onChange={(value) => onGamesChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, START_TIME: value ? value.toISOString() : null } : item))}
                          slotProps={{ textField: { size: 'small', sx: { minWidth: 140, '& .MuiOutlinedInput-root': { minHeight: 32 } } } }}
                        />
                      ) : (
                        game.START_TIME ? dayjs(game.START_TIME).format('DD/MM/YYYY HH:mm') : '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => !isEditing && event.stopPropagation()}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={game.VENUE_ID && game.VENUE_ID !== 0 ? game.VENUE_ID : ''}
                          onChange={(event) => onGamesChange((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, VENUE_ID: event.target.value === '' ? 0 : Number(event.target.value) } : item))}
                          placeholder="VENUE_ID"
                          inputProps={{ min: 0, style: { width: 80 } }}
                          sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        game.venueName || '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!loading && games.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 2 }}>No games</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
