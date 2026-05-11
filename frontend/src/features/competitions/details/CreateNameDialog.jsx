import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

export default function CreateNameDialog({
  open,
  title,
  label,
  value,
  placeholder,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={label}
          fullWidth
          variant="outlined"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">Create</Button>
      </DialogActions>
    </Dialog>
  );
}
