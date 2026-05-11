import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const STAGE_PARAMETER_FIELDS = [
  { key: 'HAS_TABLE', label: 'Has Table' },
  { key: 'INCLUDE_IN_BRACKET', label: 'Include in bracket' },
  { key: 'FILTER_DIVISION', label: 'Filter Division' },
  { key: 'CONNECTED_IN_BRACKETS', label: 'Connected In Brackets' },
  { key: 'PRE_VISUAL_BRACKETS', label: 'Pre Visual Brackets' },
  { key: 'IS_SERIES', label: 'Is Series' },
  { key: 'CONNECTED_TO_PREVIOUS_STAGE', label: 'Connected To previous stage' },
];

const GENERATE_STAGE_TYPES = [
  { key: 'leagueCycle', label: 'League Cycle' },
  { key: 'groupStage', label: 'Group Stage' },
  { key: 'bracketStage', label: 'Bracket Stage' },
];

export default function CreateGenerateStagesDialog({
  open,
  tab,
  competitionId,
  selectedSeasonNum,
  structureSeasons,
  importSeasonNum,
  generateStagesTypes,
  stageForm,
  stageTermOptions,
  stagesTypes,
  phasesBySeason,
  stageFormContext,
  newStageName,
  newStageSetCurrent,
  stageSaving,
  onClose,
  onTabChange,
  onImportSeasonNumChange,
  onGenerateStagesTypesChange,
  onStageFormChange,
  onNewStageNameChange,
  onNewStageSetCurrentChange,
  onImportStages,
  onCreateGeneratedStages,
  onCreateStage,
}) {
  const stageNameLabel = (term) => (term?.values && term.values.find((value) => value.languageId === 1)?.value) || term?.engValue || (term?.id ? `Term ${term.id}` : '');
  const selectedStageTerm = stageForm.NAME_ID
    ? (stageTermOptions.find((term) => term.id === (stageForm.NAME_ID?.id ?? stageForm.NAME_ID)) || null)
    : null;
  const hasGeneratedStageType = !!(generateStagesTypes.leagueCycle || generateStagesTypes.groupStage || generateStagesTypes.bracketStage);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Create / Generate Stages
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 0, pb: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => onTabChange(newValue)}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 }, '& .Mui-selected': { color: '#1976d2' } }}
          >
            <Tab label="Generate Stages" />
            <Tab label="Create Stage" />
          </Tabs>
        </Box>

        {tab === 0 && (
          <Box sx={{ px: 3, pt: 2, pb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Import Stages from previous season</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Season</InputLabel>
                <Select
                  label="Select Season"
                  value={importSeasonNum ?? ''}
                  onChange={(event) => onImportSeasonNumChange(event.target.value === '' ? null : event.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Select Season</MenuItem>
                  {(structureSeasons || [])
                    .filter((season) => season.SEASON_NUM !== selectedSeasonNum)
                    .map((season) => (
                      <MenuItem key={season.SEASON_NUM} value={season.SEASON_NUM}>
                        #{season.SEASON_NUM} - {season.name || `Season ${season.SEASON_NUM}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                disabled={!importSeasonNum || !competitionId}
                sx={{ textTransform: 'none' }}
                onClick={onImportStages}
              >
                IMPORT STAGES
              </Button>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Stages Types</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {GENERATE_STAGE_TYPES.map(({ key, label }) => (
                <Grid item xs={12} key={key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!generateStagesTypes[key]}
                        onChange={(event) => onGenerateStagesTypesChange((prev) => ({ ...prev, [key]: event.target.checked }))}
                      />
                    }
                    label={label}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ px: 3, pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={stageTermOptions}
                  getOptionLabel={stageNameLabel}
                  value={selectedStageTerm}
                  inputValue={newStageName}
                  onInputChange={(_, value) => {
                    onNewStageNameChange(value);
                    if (stageForm.NAME_ID) onStageFormChange((form) => ({ ...form, NAME_ID: null }));
                  }}
                  onChange={(_, value) => {
                    if (value && typeof value === 'object' && value.id) {
                      onStageFormChange((form) => ({ ...form, NAME_ID: value }));
                      onNewStageNameChange((value.values && value.values.find((item) => item.languageId === 1)?.value) || value.engValue || `Term ${value.id}`);
                    } else if (typeof value === 'string') {
                      onStageFormChange((form) => ({ ...form, NAME_ID: null }));
                      onNewStageNameChange(value);
                    }
                  }}
                  filterOptions={(options, { inputValue }) => {
                    const trim = (inputValue || '').trim();
                    if (trim.length < 3) return [];
                    const lower = trim.toLowerCase();
                    return options.filter((option) => {
                      const label = (option.values && option.values.find((value) => value.languageId === 1)?.value) || option.engValue || '';
                      return String(label).toLowerCase().includes(lower);
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Stage Name"
                      placeholder="Enter 3+ letters for suggestions"
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage Type</InputLabel>
                  <Select
                    label="Stage Type"
                    value={stageForm.STAGE_TYPE ?? 1}
                    onChange={(event) => onStageFormChange((form) => ({ ...form, STAGE_TYPE: Number(event.target.value) }))}
                    renderValue={(value) => stagesTypes.find((type) => Number(type.STAGE_TYPE_ID) === Number(value))?.STAGE_TYPE ?? String(value)}
                  >
                    {stagesTypes.map((type) => (
                      <MenuItem key={type.STAGE_TYPE_ID} value={type.STAGE_TYPE_ID}>
                        {type.STAGE_TYPE}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Num Of Games"
                  value={stageForm.NUM_OF_GAMES ?? -1}
                  onChange={(event) => onStageFormChange((form) => ({ ...form, NUM_OF_GAMES: event.target.value === '' ? -1 : Number(event.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Phase</InputLabel>
                  <Select
                    label="Phase"
                    value={stageForm.PHASE ?? ''}
                    onChange={(event) => onStageFormChange((form) => ({ ...form, PHASE: event.target.value || '' }))}
                    renderValue={(value) => value || 'Not Selected'}
                  >
                    <MenuItem value="">Not Selected</MenuItem>
                    {(phasesBySeason[stageFormContext?.seasonNum] || []).map((phase) => {
                      const displayName = phase.name || `Phase ${phase.PHASE_NUM}`;
                      return (
                        <MenuItem key={phase.PHASE_NUM} value={displayName}>
                          {displayName}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Stage Parameters</Typography>
                <Grid container spacing={1}>
                  {STAGE_PARAMETER_FIELDS.map(({ key, label }) => (
                    <Grid item xs={6} sm={4} key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!stageForm[key]}
                            onChange={(event) => onStageFormChange((form) => ({ ...form, [key]: event.target.checked }))}
                          />
                        }
                        label={<Typography variant="body2">{label}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Stage Dates</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="Start Date"
                      value={stageForm.START_DATE ? dayjs(stageForm.START_DATE) : null}
                      onChange={(value) => onStageFormChange((form) => ({ ...form, START_DATE: value ? value.toISOString() : '' }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="End Date"
                      value={stageForm.END_DATE ? dayjs(stageForm.END_DATE) : null}
                      onChange={(value) => onStageFormChange((form) => ({ ...form, END_DATE: value ? value.toISOString() : '' }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={newStageSetCurrent}
                      onChange={(event) => onNewStageSetCurrentChange(event.target.checked)}
                    />
                  }
                  label="Set Current Stage"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>CANCEL</Button>
        {tab === 0 && (
          <Button
            variant="contained"
            disabled={!hasGeneratedStageType}
            sx={{ textTransform: 'none' }}
            onClick={onCreateGeneratedStages}
          >
            CREATE
          </Button>
        )}
        {tab === 1 && (
          <Button
            variant="contained"
            onClick={onCreateStage}
            disabled={stageSaving || (!(newStageName || '').trim() && !stageForm.NAME_ID)}
            sx={{ textTransform: 'none' }}
          >
            {stageSaving ? 'Saving…' : 'SAVE'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
