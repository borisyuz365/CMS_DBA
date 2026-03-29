import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * ConfirmationDialog - A reusable confirmation dialog component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {string} props.type - Dialog type: 'warning', 'info', 'success', 'error'
 * @param {boolean} props.dangerous - Whether this is a dangerous action
 * @param {Object} props.sx - Additional styling
 */
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  dangerous = false,
  sx = {},
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
      case 'error':
        return <WarningAmberIcon color="error" sx={{ fontSize: 40 }} />;
      case 'success':
        return <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />;
      default:
        return <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />;
    }
  };

  const getColor = () => {
    if (dangerous) return 'error';
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20)',
          ...sx,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: `${getColor()}.main`,
          fontWeight: 600,
          fontSize: '1.25rem',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {getIcon()}
        {title}
        <IconButton
          onClick={onClose}
          sx={{ ml: 'auto' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" color="text.primary" sx={{ mb: 1, fontWeight: 500 }}>
            {message}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          gap: 2,
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color={getColor()}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {cancelText}
        </Button>

        <Button
          onClick={onConfirm}
          variant="contained"
          color={getColor()}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: `0 4px 12px ${dangerous ? 'rgba(244, 67, 54, 0.3)' : 'rgba(25, 118, 210, 0.3)'}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${dangerous ? 'rgba(244, 67, 54, 0.4)' : 'rgba(25, 118, 210, 0.4)'}`,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
