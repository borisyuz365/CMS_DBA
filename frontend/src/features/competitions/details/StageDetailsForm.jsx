import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import TableSettingsEditor from '../../../components/TableSettingsEditor';

export default function StageDetailsForm({
  stageForm,
  allTerms,
  positionTableNamesTermOptions,
  allCompetitions,
  tableTypes,
  competition,
  showTableOptions,
  onStageFormChange,
  onOpenManageStandingsDialog,
}) {
  const updateStageForm = (changes) => {
    onStageFormChange((prev) => ({ ...prev, ...changes }));
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Stage Details: {stageForm.name || `Stage ${stageForm.STAGE_NUM}`}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={2}>
          <DateTimePicker
            label="Start Date"
            value={stageForm.START_DATE ? dayjs(stageForm.START_DATE) : null}
            onChange={(value) => updateStageForm({ START_DATE: value ? value.toISOString() : null })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <DateTimePicker
            label="End Date"
            value={stageForm.END_DATE ? dayjs(stageForm.END_DATE) : null}
            onChange={(value) => updateStageForm({ END_DATE: value ? value.toISOString() : null })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button variant="contained" size="small" sx={{ textTransform: 'none' }}>CONNECT GAMES & COMPETITORS</Button>
        </Grid>
      </Grid>

      {showTableOptions && !!stageForm.HAS_TABLE && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Table Options</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!stageForm.HAS_HOME_TABLE || !!stageForm.HAS_AWAY_TABLE}
                  onChange={(event) => {
                    const value = event.target.checked;
                    updateStageForm({ HAS_HOME_TABLE: value, HAS_AWAY_TABLE: value });
                  }}
                />
              }
              label="Has Home/Away Table"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={!!stageForm.HIDE_HOME_AWAY_TABLES} onChange={(event) => updateStageForm({ HIDE_HOME_AWAY_TABLES: event.target.checked })} />}
              label="Hide Home/Away Table"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={!!stageForm.HIDE_MAIN_TABLE} onChange={(event) => updateStageForm({ HIDE_MAIN_TABLE: event.target.checked })} />}
              label="Hide Main Table"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={!!stageForm.HAS_POSITION_TABLE} onChange={(event) => {
                const checked = event.target.checked;
                updateStageForm({
                  HAS_POSITION_TABLE: checked,
                  ...(!checked && { POSITION_PARAMETER: null, POSITION_TABLE_NAME: null, POSITION_TABLE_NAME_ID: null }),
                });
              }} />}
              label="Has Position Table"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={!!stageForm.HAS_AGGREGATION_TABLE} onChange={(event) => {
                const checked = event.target.checked;
                updateStageForm({
                  HAS_AGGREGATION_TABLE: checked,
                  ...(!checked && { AGGREGATED_TABLE_SETTINGS: null }),
                });
              }} />}
              label="Has Aggregation Table"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={!!stageForm.HAS_RELEGATION_TABLE} onChange={(event) => {
                const checked = event.target.checked;
                updateStageForm({
                  HAS_RELEGATION_TABLE: checked,
                  ...(!checked && { RELEGATION_TABLE_SETTINGS: null }),
                });
              }} />}
              label="Has Relegation Table"
            />
          </Box>
          {!!stageForm.HAS_POSITION_TABLE && (
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Position Table Settings
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  type="number"
                  label="Position"
                  placeholder="Position"
                  value={stageForm.POSITION_PARAMETER ?? ''}
                  onChange={(event) => updateStageForm({
                    POSITION_PARAMETER: event.target.value === '' ? null : Number(event.target.value),
                  })}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ width: 120 }}
                />
                <Autocomplete
                  size="small"
                  sx={{ minWidth: 220 }}
                  options={positionTableNamesTermOptions}
                  getOptionLabel={(option) => (option?.engValue || option?.values?.[0]?.value || `Term ${option?.id}` || '')}
                  value={
                    (() => {
                      const termId = stageForm.POSITION_TABLE_NAME_ID ?? stageForm.POSITION_TABLE_NAME;
                      return termId != null && termId !== 0 ? ((allTerms || []).find((term) => term.id === termId) || null) : null;
                    })()
                  }
                  isOptionEqualToValue={(option, value) => option && value && option.id === value.id}
                  onChange={(_, value) => {
                    const termId = value?.id ?? null;
                    updateStageForm({ POSITION_TABLE_NAME_ID: termId, POSITION_TABLE_NAME: termId });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Position Table Name" />
                  )}
                />
              </Box>
            </Paper>
          )}
          {(!!stageForm.HAS_AGGREGATION_TABLE || !!stageForm.HAS_RELEGATION_TABLE) && (
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              {!!stageForm.HAS_AGGREGATION_TABLE && (
                <Box sx={{ flex: '1 1 0', minWidth: 300 }}>
                  <TableSettingsEditor
                    label="Aggregation Table Settings"
                    value={stageForm.AGGREGATED_TABLE_SETTINGS ?? ''}
                    onChange={(value) => updateStageForm({ AGGREGATED_TABLE_SETTINGS: value })}
                    competitions={allCompetitions}
                    tableTypes={tableTypes}
                    competitionSportTypeId={competition?.SPORT_TYPE_ID}
                    competitionCountryId={competition?.COUNTRY_ID}
                  />
                </Box>
              )}
              {!!stageForm.HAS_RELEGATION_TABLE && (
                <Box sx={{ flex: '1 1 0', minWidth: 300 }}>
                  <TableSettingsEditor
                    label="Relegation Table Settings"
                    value={stageForm.RELEGATION_TABLE_SETTINGS ?? ''}
                    onChange={(value) => updateStageForm({ RELEGATION_TABLE_SETTINGS: value })}
                    competitions={allCompetitions}
                    tableTypes={tableTypes}
                    competitionSportTypeId={competition?.SPORT_TYPE_ID}
                    competitionCountryId={competition?.COUNTRY_ID}
                  />
                </Box>
              )}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
            <Button variant="outlined" size="small" onClick={onOpenManageStandingsDialog} sx={{ textTransform: 'none' }}>MANAGE STANDINGS</Button>
          </Box>
        </>
      )}
    </>
  );
}
