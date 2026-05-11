import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export default function StageDeleteConfirmDialog({
  open,
  selectedStagesCount,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ color: '#d32f2f', display: 'inline-flex' }}>⚠️</Box>
        Delete Stages
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          You are about to delete <strong>{selectedStagesCount}</strong> stage(s). This action is irreversible and will remove all associated data (games, competitors, groups) for the selected stages.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Are you sure you want to proceed?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
