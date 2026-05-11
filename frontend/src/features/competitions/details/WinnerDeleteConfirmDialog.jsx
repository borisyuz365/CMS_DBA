import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export default function WinnerDeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove Winner</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to remove this winner? The competitor will remain in the season but will no longer be marked as winner.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>Remove</Button>
      </DialogActions>
    </Dialog>
  );
}
