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

export default function PhaseModalDialog({
  open,
  mode,
  phaseForm,
  phaseTermOptions,
  newPhaseName,
  phasesBySeason,
  phaseFormContext,
  phaseEditTarget,
  saving,
  onClose,
  onSave,
  onPhaseFormChange,
  onNewPhaseNameChange,
}) {
  const phaseNameLabel = (term) => (term?.values && term.values.find((value) => value.languageId === 1)?.value) || term?.engValue || (term?.id ? `Term ${term.id}` : '');
  const selectedPhaseTerm = phaseForm.PHASE_NAME_ID
    ? (phaseTermOptions.find((term) => term.id === (phaseForm.PHASE_NAME_ID?.id ?? phaseForm.PHASE_NAME_ID)) || null)
    : null;
  const phases = phasesBySeason[phaseFormContext?.seasonNum] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'Add Phase' : 'Edit Phase'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {mode === 'add' ? (
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                size="small"
                options={phaseTermOptions}
                getOptionLabel={phaseNameLabel}
                value={selectedPhaseTerm}
                inputValue={newPhaseName}
                onInputChange={(_, value) => {
                  onNewPhaseNameChange(value);
                  if (phaseForm.PHASE_NAME_ID) onPhaseFormChange((form) => ({ ...form, PHASE_NAME_ID: null }));
                }}
                onChange={(_, value) => {
                  if (value && typeof value === 'object' && value.id) {
                    onPhaseFormChange((form) => ({ ...form, PHASE_NAME_ID: value }));
                    onNewPhaseNameChange((value.values && value.values.find((item) => item.languageId === 1)?.value) || value.engValue || `Term ${value.id}`);
                  } else if (typeof value === 'string') {
                    onPhaseFormChange((form) => ({ ...form, PHASE_NAME_ID: null }));
                    onNewPhaseNameChange(value);
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
                    label="Phase Name"
                    placeholder="Enter 3+ letters for suggestions"
                    required
                  />
                )}
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Phase number"
                  value={phaseForm.PHASE_NUM}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={phaseTermOptions}
                  getOptionLabel={(option) => (option.values && option.values.find((value) => value.languageId === 1)?.value) || option.engValue || `Term ${option.id}`}
                  value={selectedPhaseTerm}
                  onChange={(_, value) => onPhaseFormChange((form) => ({ ...form, PHASE_NAME_ID: value }))}
                  renderInput={(params) => <TextField {...params} label="Phase Name (term)" />}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Parent Phase</InputLabel>
              <Select
                label="Parent Phase"
                value={phaseForm.PARENT_PHASE_NUM != null && phaseForm.PARENT_PHASE_NUM !== '' ? Number(phaseForm.PARENT_PHASE_NUM) : ''}
                onChange={(event) => onPhaseFormChange((form) => ({ ...form, PARENT_PHASE_NUM: event.target.value === '' ? '' : Number(event.target.value) }))}
                renderValue={(value) => {
                  if (value === '' || value == null) return '—';
                  const phase = phases.find((item) => Number(item.PHASE_NUM) === Number(value));
                  return phase ? (phase.name || `Phase ${phase.PHASE_NUM}`) : `Phase ${value}`;
                }}
              >
                <MenuItem value="">—</MenuItem>
                {phases
                  .filter((phase) => mode !== 'edit' || Number(phase.PHASE_NUM) !== Number(phaseEditTarget?.PHASE_NUM))
                  .map((phase) => (
                    <MenuItem key={phase.PHASE_NUM} value={phase.PHASE_NUM}>
                      {phase.name || `Phase ${phase.PHASE_NUM}`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Checkbox size="small" checked={phaseForm.SHOW_STATS} onChange={(event) => onPhaseFormChange((form) => ({ ...form, SHOW_STATS: event.target.checked }))} />}
              label={<Typography variant="body2">Show Statistics</Typography>}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Checkbox size="small" checked={phaseForm.USE_NAME} onChange={(event) => onPhaseFormChange((form) => ({ ...form, USE_NAME: event.target.checked }))} />}
              label={<Typography variant="body2">Use Phase Name</Typography>}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || (mode === 'add' && !(newPhaseName || '').trim() && !phaseForm.PHASE_NAME_ID)}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
