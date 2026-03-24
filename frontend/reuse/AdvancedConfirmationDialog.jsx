import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';

/**
 * AdvancedConfirmationDialog - A sophisticated confirmation dialog with large icons and custom styling
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Main dialog message
 * @param {string} props.subMessage - Secondary message (optional)
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {string} props.type - Dialog type: 'success', 'warning', 'error', 'info'
 * @param {boolean} props.dangerous - Whether this is a dangerous action
 * @param {Object} props.sx - Additional styling
 */
const AdvancedConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  subMessage = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'success',
  dangerous = false,
  sx = {},
}) => {
  const getColors = () => {
    if (dangerous) {
      return {
        primary: 'error',
        light: 'error.light',
        main: 'error.main',
        dark: 'error.dark',
        contrastText: 'error.contrastText'
      };
    }
    
    switch (type) {
      case 'warning':
        return {
          primary: 'warning',
          light: 'warning.light',
          main: 'warning.main',
          dark: 'warning.dark',
          contrastText: 'warning.contrastText'
        };
      case 'error':
        return {
          primary: 'error',
          light: 'error.light',
          main: 'error.main',
          dark: 'error.dark',
          contrastText: 'error.contrastText'
        };
      case 'success':
        return {
          primary: 'success',
          light: 'success.light',
          main: 'success.main',
          dark: 'success.dark',
          contrastText: 'success.contrastText'
        };
      default:
        return {
          primary: 'primary',
          light: 'primary.light',
          main: 'primary.main',
          dark: 'primary.dark',
          contrastText: 'primary.contrastText'
        };
    }
  };

  const colors = getColors();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: colors.light,
          color: colors.dark,
          fontWeight: 600,
          fontSize: '1.25rem',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: colors.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {dangerous ? '!' : '✓'}
          </Box>
          {title}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: colors.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: colors.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              {dangerous ? '!' : '✓'}
            </Box>
          </Box>

          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 500,
              mb: 2,
              color: colors.dark,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="body1"
            color="text.primary"
            sx={{ mb: 2, fontWeight: 500 }}
          >
            {message}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            {subMessage}
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
          color={colors.primary}
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
          color={colors.primary}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: `0 4px 12px ${colors.main}30`,
            '&:hover': {
              boxShadow: `0 6px 16px ${colors.main}40`,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedConfirmationDialog;




