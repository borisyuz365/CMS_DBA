import React from 'react';
import {
  Box,
  Checkbox,
  FormControl,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export default function StagesTable({
  stages,
  stagesTypes,
  phases,
  competition,
  selectedSeasonNum,
  selectedStageNum,
  isEditMode,
  pendingStageChanges,
  pendingCurrentStage,
  selectedStagesForDelete,
  draggingStageNum,
  dropTargetIndex,
  onSelectedStageNumChange,
  onSelectedStagesForDeleteChange,
  onDraggingStageNumChange,
  onDropTargetIndexChange,
  onStagesReorderDrop,
  onStageNameClick,
  onStageFieldChange,
  onPendingCurrentStageChange,
}) {
  if (stages.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No stages for this season. Use Create/Generate to add stages.
      </Typography>
    );
  }

  const sortedStages = [...stages].sort((a, b) => {
    const firstOrder = a.PRESENTATION_ORDER != null && a.PRESENTATION_ORDER !== '' ? Number(a.PRESENTATION_ORDER) : Number(a.STAGE_NUM);
    const secondOrder = b.PRESENTATION_ORDER != null && b.PRESENTATION_ORDER !== '' ? Number(b.PRESENTATION_ORDER) : Number(b.STAGE_NUM);
    return firstOrder - secondOrder;
  });

  const stageTypeLabel = (type) => stagesTypes.find((stageType) => Number(stageType.STAGE_TYPE_ID) === Number(type))?.STAGE_TYPE ?? `Type ${type}`;

  return (
    <TableContainer sx={{ mb: 2, overflowX: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', width: 40 }} padding="checkbox">
              <Checkbox
                size="small"
                indeterminate={selectedStagesForDelete.length > 0 && selectedStagesForDelete.length < sortedStages.length}
                checked={selectedStagesForDelete.length === sortedStages.length && sortedStages.length > 0}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSelectedStagesForDeleteChange(sortedStages.map((stage) => stage.STAGE_NUM));
                  } else {
                    onSelectedStagesForDeleteChange([]);
                  }
                }}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', width: 50 }}>Order</TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', width: 40 }}>Num</TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }} padding="checkbox">Current</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Has Table</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Num Of Games</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Is Series</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Connected To Previous</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Filter Division</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Include in bracket</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Pre Visual Brackets</TableCell>
            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Connected In Brackets</TableCell>
            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Phase</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedStages.map((stage, index) => {
            const stageNum = stage.STAGE_NUM;
            const pending = pendingStageChanges[stageNum] || {};
            const isSelected = Number(stageNum) === Number(selectedStageNum);
            const isDragging = Number(stageNum) === Number(draggingStageNum);
            const isDropTarget = dropTargetIndex === index;
            const cellSx = { whiteSpace: 'nowrap' };
            const getValue = (field) => pending[field] !== undefined ? pending[field] : stage[field];
            const isCurrentFromDb = competition?.CURRENT_SEASON === selectedSeasonNum && competition?.CURRENT_STAGE === stageNum;
            const isCurrent = pendingCurrentStage != null ? Number(pendingCurrentStage) === Number(stageNum) : isCurrentFromDb;
            const isCheckedForDelete = selectedStagesForDelete.includes(stageNum);

            return (
              <TableRow
                key={stageNum}
                hover={!draggingStageNum}
                selected={isSelected}
                onClick={() => onSelectedStageNumChange(stageNum)}
                draggable={isEditMode}
                onDragStart={(event) => {
                  if (!isEditMode) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.setData('text/plain', String(stageNum));
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setDragImage(event.currentTarget, 0, 0);
                  onDraggingStageNumChange(stageNum);
                }}
                onDragEnd={() => {
                  onDraggingStageNumChange(null);
                  onDropTargetIndexChange(null);
                }}
                onDragOver={(event) => {
                  if (!isEditMode) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  onDropTargetIndexChange(index);
                }}
                onDragLeave={() => onDropTargetIndexChange(null)}
                onDrop={(event) => {
                  if (!isEditMode) return;
                  event.preventDefault();
                  onDraggingStageNumChange(null);
                  onDropTargetIndexChange(null);
                  const dragged = event.dataTransfer.getData('text/plain');
                  if (dragged) onStagesReorderDrop(selectedSeasonNum, dragged, index);
                }}
                sx={{
                  cursor: isDragging ? 'grabbing' : 'pointer',
                  backgroundColor: isSelected ? 'action.selected' : undefined,
                  transition: 'opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                  opacity: isDragging ? 0.7 : 1,
                  transform: isDragging ? 'scale(0.99)' : 'scale(1)',
                  boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                  ...(isDropTarget && {
                    borderTop: '2px solid',
                    borderTopColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  }),
                  '&:hover': { '& .drag-handle': { opacity: 1 } },
                }}
              >
                <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    size="small"
                    checked={isCheckedForDelete}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSelectedStagesForDeleteChange((prev) => [...prev, stageNum]);
                      } else {
                        onSelectedStagesForDeleteChange((prev) => prev.filter((selectedStage) => selectedStage !== stageNum));
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: 50, maxWidth: 50 }}>
                  {isEditMode && (
                    <Box
                      className="drag-handle"
                      component="span"
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData('text/plain', String(stageNum));
                        event.dataTransfer.effectAllowed = 'move';
                        onDraggingStageNumChange(stageNum);
                      }}
                      sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab', color: 'primary.main', opacity: 0.7, transition: 'opacity 0.15s ease', '&:active': { cursor: 'grabbing' }, '&:hover': { opacity: 1 } }}
                      aria-label="Drag to reorder"
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  )}
                  {' '}{index + 1}
                </TableCell>
                <TableCell sx={{ width: 40, maxWidth: 40 }}>{stageNum}</TableCell>
                <TableCell sx={cellSx}>
                  <Box
                    component="span"
                    sx={{ color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStageNameClick(event, selectedSeasonNum, stage);
                    }}
                  >
                    {stage.name || `Stage ${stageNum}`}
                  </Box>
                </TableCell>
                <TableCell sx={cellSx} onClick={(event) => isEditMode && event.stopPropagation()}>
                  {isEditMode ? (
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select
                        value={getValue('STAGE_TYPE') ?? 1}
                        onChange={(event) => onStageFieldChange(stageNum, 'STAGE_TYPE', Number(event.target.value))}
                        sx={{ height: 32, fontSize: '0.8125rem' }}
                      >
                        {stagesTypes.map((stageType) => (
                          <MenuItem key={stageType.STAGE_TYPE_ID} value={stageType.STAGE_TYPE_ID}>{stageType.STAGE_TYPE}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : stageTypeLabel(stage.STAGE_TYPE)}
                </TableCell>
                <TableCell sx={cellSx} padding="checkbox" onClick={(event) => isEditMode && event.stopPropagation()}>
                  <Checkbox
                    size="small"
                    checked={isCurrent}
                    disabled={!isEditMode}
                    onChange={() => {
                      if (!isCurrent) onPendingCurrentStageChange(stageNum);
                    }}
                  />
                </TableCell>
                {[
                  ['HAS_TABLE', 'checkbox'],
                  ['NUM_OF_GAMES', 'number'],
                  ['IS_SERIES', 'checkbox'],
                  ['CONNECTED_TO_PREVIOUS_STAGE', 'checkbox'],
                  ['FILTER_DIVISION', 'checkbox'],
                  ['INCLUDE_IN_BRACKET', 'checkbox'],
                  ['PRE_VISUAL_BRACKETS', 'checkbox'],
                  ['CONNECTED_IN_BRACKETS', 'checkbox'],
                ].map(([field, type]) => (
                  <TableCell key={field} sx={cellSx} padding={type === 'checkbox' ? 'checkbox' : 'normal'} onClick={(event) => isEditMode && event.stopPropagation()}>
                    {type === 'checkbox' ? (
                      <Checkbox
                        size="small"
                        checked={!!getValue(field)}
                        disabled={!isEditMode}
                        onChange={(event) => onStageFieldChange(stageNum, field, event.target.checked)}
                      />
                    ) : isEditMode ? (
                      <TextField
                        size="small"
                        type="number"
                        value={getValue(field) ?? ''}
                        onChange={(event) => onStageFieldChange(stageNum, field, event.target.value === '' ? null : Number(event.target.value))}
                        sx={{ width: 70, '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' } }}
                      />
                    ) : (
                      stage[field] ?? '-'
                    )}
                  </TableCell>
                ))}
                <TableCell sx={cellSx} onClick={(event) => isEditMode && event.stopPropagation()}>
                  {isEditMode ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={getValue('PHASE') ?? ''}
                        onChange={(event) => onStageFieldChange(stageNum, 'PHASE', event.target.value || '')}
                        sx={{ height: 32, fontSize: '0.8125rem' }}
                      >
                        <MenuItem value="">Not Selected</MenuItem>
                        {phases.map((phase) => (
                          <MenuItem key={phase.PHASE_NUM} value={phase.name || `Phase ${phase.PHASE_NUM}`}>
                            {phase.name || `Phase ${phase.PHASE_NUM}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (stage.PHASE || 'Not Selected')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
