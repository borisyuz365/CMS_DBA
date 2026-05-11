import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
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
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';

export default function PhasesSection({
  structureSeasons,
  selectedSeasonNum,
  expandedStructureSection,
  phasesBySeason,
  isPhaseEditMode,
  pendingPhaseChanges,
  selectedPhaseRows,
  onExpandedStructureSectionChange,
  onAddPhase,
  onTogglePhaseEditMode,
  onSaveStructurePhase,
  onDeleteSelectedPhases,
  onSelectedPhaseRowsChange,
  onPhaseNameClick,
  onPhaseFieldChange,
}) {
  if (structureSeasons.length === 0 || selectedSeasonNum == null) return null;

  const phasesList = phasesBySeason[selectedSeasonNum] || [];

  return (
    <Accordion
      expanded={expandedStructureSection === 'phases'}
      onChange={() => onExpandedStructureSectionChange((prev) => (prev === 'phases' ? null : 'phases'))}
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 2,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Phases ({phasesList.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => onAddPhase(selectedSeasonNum)}
            sx={{ textTransform: 'none' }}
          >
            CREATE NEW
          </Button>
          <Button
            variant={isPhaseEditMode ? 'contained' : 'outlined'}
            size="small"
            startIcon={isPhaseEditMode ? <CancelIcon /> : <EditIcon />}
            onClick={onTogglePhaseEditMode}
            sx={{
              textTransform: 'none',
              borderColor: '#E0E0E0',
              bgcolor: isPhaseEditMode ? '#1976d2' : '#fff',
              color: isPhaseEditMode ? '#fff' : '#000',
              '&:hover': { bgcolor: isPhaseEditMode ? '#1565c0' : '#f5f5f5' },
            }}
          >
            {isPhaseEditMode ? 'Cancel Edit' : 'Edit Mode'}
          </Button>
          {isPhaseEditMode && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={onSaveStructurePhase}
              disabled={Object.keys(pendingPhaseChanges).length === 0}
              sx={{
                textTransform: 'none',
                backgroundColor: '#15803d',
                color: '#fff',
                '&:hover': { backgroundColor: '#166534' },
                '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
              }}
            >
              Save Changes
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={onDeleteSelectedPhases}
            disabled={selectedPhaseRows.length === 0}
            sx={{
              textTransform: 'none',
              backgroundColor: '#d32f2f',
              color: '#fff',
              '&:hover': { backgroundColor: '#c62828' },
              '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
            }}
          >
            Delete ({selectedPhaseRows.length})
          </Button>
        </Box>

        {phasesList.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No phases for this season. Create one to get started.
          </Typography>
        ) : (
          <TableContainer sx={{ mb: 2 }}>
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ fontWeight: 600, width: 48 }}>
                    <Checkbox
                      size="small"
                      indeterminate={selectedPhaseRows.length > 0 && selectedPhaseRows.length < phasesList.length}
                      checked={phasesList.length > 0 && selectedPhaseRows.length === phasesList.length}
                      onChange={(event) => onSelectedPhaseRowsChange(event.target.checked ? phasesList.map((phase) => phase.PHASE_NUM) : [])}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '14%' }}>Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '20%' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '20%' }}>Parent Phase</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '14%' }} padding="checkbox">Show Stats</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '14%' }} padding="checkbox">Use Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '18%' }}>Top Athletes %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phasesList.map((phase) => {
                  const phaseNum = phase.PHASE_NUM;
                  const pending = pendingPhaseChanges[phaseNum] || {};
                  const parentValue = pending.PARENT_PHASE_NUM !== undefined ? pending.PARENT_PHASE_NUM : phase.PARENT_PHASE_NUM;
                  const showStatsValue = pending.SHOW_STATS !== undefined ? pending.SHOW_STATS : !!phase.SHOW_STATS;
                  const useNameValue = pending.USE_NAME !== undefined ? pending.USE_NAME : !!phase.USE_NAME;
                  const topAthletesValue = pending.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE !== undefined
                    ? pending.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE
                    : phase.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE;

                  return (
                    <TableRow key={phaseNum} hover>
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={selectedPhaseRows.includes(phaseNum)}
                          onChange={(event) => {
                            event.stopPropagation();
                            onSelectedPhaseRowsChange((selectedRows) => (
                              event.target.checked
                                ? [...selectedRows, phaseNum]
                                : selectedRows.filter((id) => id !== phaseNum)
                            ));
                          }}
                        />
                      </TableCell>
                      <TableCell>{phase.PHASE_NUM}</TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{ color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onPhaseNameClick(event, selectedSeasonNum, phase);
                          }}
                        >
                          {phase.name || `Phase ${phase.PHASE_NUM}`}
                        </Box>
                      </TableCell>
                      <TableCell onClick={(event) => isPhaseEditMode && event.stopPropagation()}>
                        {isPhaseEditMode ? (
                          <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                            <Select
                              value={parentValue != null && parentValue !== '' ? Number(parentValue) : ''}
                              onChange={(event) => onPhaseFieldChange(phaseNum, 'PARENT_PHASE_NUM', event.target.value === '' ? null : Number(event.target.value))}
                              sx={{ height: 32, fontSize: '0.8125rem' }}
                            >
                              <MenuItem value="">—</MenuItem>
                              {phasesList
                                .filter((item) => Number(item.PHASE_NUM) !== Number(phaseNum))
                                .map((item) => (
                                  <MenuItem key={item.PHASE_NUM} value={item.PHASE_NUM}>
                                    {item.name || `Phase ${item.PHASE_NUM}`}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        ) : (
                          parentValue != null
                            ? (phasesList.find((item) => Number(item.PHASE_NUM) === Number(parentValue))?.name || `Phase ${parentValue}`)
                            : '—'
                        )}
                      </TableCell>
                      <TableCell padding="checkbox" onClick={(event) => isPhaseEditMode && event.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={showStatsValue}
                          disabled={!isPhaseEditMode}
                          onChange={(event) => onPhaseFieldChange(phaseNum, 'SHOW_STATS', event.target.checked)}
                        />
                      </TableCell>
                      <TableCell padding="checkbox" onClick={(event) => isPhaseEditMode && event.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={useNameValue}
                          disabled={!isPhaseEditMode}
                          onChange={(event) => onPhaseFieldChange(phaseNum, 'USE_NAME', event.target.checked)}
                        />
                      </TableCell>
                      <TableCell onClick={(event) => isPhaseEditMode && event.stopPropagation()}>
                        {isPhaseEditMode ? (
                          <TextField
                            size="small"
                            type="number"
                            value={topAthletesValue ?? ''}
                            onChange={(event) => onPhaseFieldChange(phaseNum, 'TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE', event.target.value === '' ? null : Number(event.target.value))}
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            sx={{ width: 100, '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' } }}
                          />
                        ) : (
                          topAthletesValue ?? '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
