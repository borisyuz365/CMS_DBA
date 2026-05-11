import React from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

function getTermLabel(term) {
  return (
    term?.values?.find((value) => value.languageId === 1)?.value
    || term?.engValue
    || (term?.id ? `Term ${term.id}` : '')
  );
}

export default function ParticipantAddDialog({
  open,
  saving,
  termOptions,
  selectedTermId,
  participantName,
  onParticipantNameChange,
  onSelectedTermIdChange,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Participant</DialogTitle>
      <DialogContent>
        <Autocomplete
          freeSolo
          size="small"
          fullWidth
          options={termOptions}
          getOptionLabel={getTermLabel}
          value={selectedTermId ? (termOptions.find((term) => term.id === selectedTermId) || null) : null}
          inputValue={participantName}
          onInputChange={(_, value) => {
            onParticipantNameChange(value);
            if (selectedTermId) onSelectedTermIdChange(null);
          }}
          onChange={(_, value) => {
            if (value && typeof value === 'object' && value.id) {
              onSelectedTermIdChange(value.id);
              onParticipantNameChange(getTermLabel(value));
            } else if (typeof value === 'string') {
              onSelectedTermIdChange(null);
              onParticipantNameChange(value);
            }
          }}
          filterOptions={(options, { inputValue }) => {
            const trim = (inputValue || '').trim();
            if (trim.length < 2) return [];
            const lower = trim.toLowerCase();
            return options.filter((option) => getTermLabel(option).toLowerCase().includes(lower));
          }}
          onKeyDown={(event) => event.key === 'Enter' && onConfirm()}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Participant Name"
              placeholder="Start typing for suggestions or enter a new name"
              autoFocus
              sx={{ mt: 1 }}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={saving || (!(participantName || '').trim() && !selectedTermId)}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
