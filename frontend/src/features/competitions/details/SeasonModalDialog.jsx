import React from 'react';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

export default function SeasonModalDialog({
  open,
  mode,
  newSeasonName,
  newSeasonLanguageId,
  newSeasonStartDate,
  newSeasonEndDate,
  newSeasonSetCurrent,
  newSeasonBasedOnLast,
  seasonForm,
  seasonTermOptions,
  saving,
  onClose,
  onSave,
  onNewSeasonNameChange,
  onNewSeasonLanguageIdChange,
  onNewSeasonStartDateChange,
  onNewSeasonEndDateChange,
  onNewSeasonSetCurrentChange,
  onNewSeasonBasedOnLastChange,
  onSeasonFormChange,
}) {
  const selectedSeasonTerm = seasonForm.NAME_ID
    ? (seasonTermOptions.find((term) => term.id === (seasonForm.NAME_ID?.id ?? seasonForm.NAME_ID)) || null)
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'New Season :' : 'Edit Season'}</DialogTitle>
      <DialogContent>
        {mode === 'add' ? (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Season Name"
                placeholder="Enter Season Name"
                value={newSeasonName}
                onChange={(event) => onNewSeasonNameChange(event.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select
                  label="Language"
                  value={newSeasonLanguageId}
                  onChange={(event) => onNewSeasonLanguageIdChange(Number(event.target.value))}
                >
                  <MenuItem value={1}>English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Date"
                value={newSeasonStartDate ? dayjs(newSeasonStartDate) : null}
                onChange={(value) => onNewSeasonStartDateChange(value ? value.toISOString() : '')}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Date"
                value={newSeasonEndDate ? dayjs(newSeasonEndDate) : null}
                onChange={(value) => onNewSeasonEndDateChange(value ? value.toISOString() : '')}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox size="small" checked={newSeasonSetCurrent} onChange={(event) => onNewSeasonSetCurrentChange(event.target.checked)} />} label="Set Current Season" />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox size="small" checked={newSeasonBasedOnLast} onChange={(event) => onNewSeasonBasedOnLastChange(event.target.checked)} />} label="Based on last season" />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="number" label="Season number" value={seasonForm.SEASON_NUM} onChange={(event) => onSeasonFormChange((form) => ({ ...form, SEASON_NUM: event.target.value }))} disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={seasonTermOptions}
                getOptionLabel={(option) => (option.values && option.values.find((value) => value.languageId === 1)?.value) || option.engValue || `Term ${option.id}`}
                value={selectedSeasonTerm}
                onChange={(_, value) => onSeasonFormChange((form) => ({ ...form, NAME_ID: value }))}
                renderInput={(params) => <TextField {...params} label="Name (term)" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start date"
                value={seasonForm.START_DATE ? dayjs(seasonForm.START_DATE) : null}
                onChange={(value) => onSeasonFormChange((form) => ({ ...form, START_DATE: value ? value.format('YYYY-MM-DD') : '' }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End date"
                value={seasonForm.END_DATE ? dayjs(seasonForm.END_DATE) : null}
                onChange={(value) => onSeasonFormChange((form) => ({ ...form, END_DATE: value ? value.format('YYYY-MM-DD') : '' }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={seasonForm.HAS_TABLE} onChange={(event) => onSeasonFormChange((form) => ({ ...form, HAS_TABLE: event.target.checked }))} />} label={<Typography variant="body2">HAS_TABLE</Typography>} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={seasonForm.HAS_BRACKETS} onChange={(event) => onSeasonFormChange((form) => ({ ...form, HAS_BRACKETS: event.target.checked }))} />} label={<Typography variant="body2">HAS_BRACKETS</Typography>} />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'uppercase' }}>CANCEL</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || (mode === 'add' && !(newSeasonName || '').trim()) || (mode === 'edit' && (seasonForm.SEASON_NUM === '' || isNaN(Number(seasonForm.SEASON_NUM))))}
          sx={{ textTransform: 'uppercase' }}
        >
          {saving ? 'Saving…' : 'SAVE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
