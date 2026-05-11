import React from 'react';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GROUP_SETTING_FIELDS = [
  { key: 'HAS_TABLE', label: 'Has Table' },
  { key: 'IS_SERIES', label: 'Is Series' },
  { key: 'USE_NAME', label: 'Use Name' },
  { key: 'GROUP_BY', label: 'Group By' },
  { key: 'AUTONOMOUS', label: 'Autonomous' },
  { key: 'IS_FINAL', label: 'Is Final' },
];

export default function GroupModalDialog({
  open,
  mode,
  groupForm,
  groupTermOptions,
  newGroupName,
  saving,
  onClose,
  onSave,
  onGroupFormChange,
  onNewGroupNameChange,
}) {
  const groupNameLabel = (term) => (term?.values && term.values.find((value) => value.languageId === 1)?.value) || term?.engValue || (term?.id ? `Term ${term.id}` : '');
  const selectedGroupTerm = groupForm.NAME_ID
    ? (groupTermOptions.find((term) => term.id === (groupForm.NAME_ID?.id ?? groupForm.NAME_ID)) || null)
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {mode === 'add' ? 'Add Group' : 'Edit Group'}
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            {mode === 'add' ? (
              <Autocomplete
                freeSolo
                size="small"
                fullWidth
                options={groupTermOptions}
                getOptionLabel={groupNameLabel}
                value={selectedGroupTerm}
                inputValue={newGroupName}
                onInputChange={(_, value) => {
                  onNewGroupNameChange(value);
                  if (groupForm.NAME_ID) onGroupFormChange((form) => ({ ...form, NAME_ID: null }));
                }}
                onChange={(_, value) => {
                  if (value && typeof value === 'object' && value.id) {
                    onGroupFormChange((form) => ({ ...form, NAME_ID: value }));
                    onNewGroupNameChange((value.values && value.values.find((item) => item.languageId === 1)?.value) || value.engValue || `Term ${value.id}`);
                  } else if (typeof value === 'string') {
                    onGroupFormChange((form) => ({ ...form, NAME_ID: null }));
                    onNewGroupNameChange(value);
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
                    label="Group Name"
                    placeholder="Enter 3+ letters for suggestions or type a new name"
                    required={mode === 'add'}
                  />
                )}
              />
            ) : (
              <Autocomplete
                size="small"
                fullWidth
                options={groupTermOptions}
                getOptionLabel={(option) => (option.values && option.values.find((value) => value.languageId === 1)?.value) || option.engValue || `Term ${option.id}`}
                value={selectedGroupTerm}
                onChange={(_, value) => onGroupFormChange((form) => ({ ...form, NAME_ID: value }))}
                renderInput={(params) => <TextField {...params} label="Group Name (term)" />}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Group Settings</Typography>
            <Grid container spacing={1}>
              {GROUP_SETTING_FIELDS.map(({ key, label }) => (
                <Grid item xs={6} sm={4} key={key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!groupForm[key]}
                        onChange={(event) => onGroupFormChange((form) => ({ ...form, [key]: event.target.checked }))}
                      />
                    }
                    label={<Typography variant="body2">{label}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || (mode === 'add' && !(newGroupName || '').trim() && !groupForm.NAME_ID)}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
