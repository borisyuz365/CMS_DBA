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
 * WarningDialog - A specialized warning dialog with prominent warning styling
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onProceed - Proceed handler
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Main warning message
 * @param {string} props.subMessage - Secondary message (optional)
 * @param {string} props.proceedText - Proceed button text
 * @param {string} props.cancelText - Cancel button text
 * @param {string} props.warningType - Warning type: 'warning', 'error', 'danger'
 * @param {Object} props.sx - Additional styling
 */
const WarningDialog = ({
  open,
  onClose,
  onProceed,
  title = 'Warning',
  message = 'Please review the following warning before proceeding with this action.',
  subMessage = 'This action cannot be undone.',
  proceedText = 'Proceed Anyway',
  cancelText = 'Cancel',
  warningType = 'warning',
  sx = {},
}) => {
  const getColors = () => {
    switch (warningType) {
      case 'error':
        return {
          primary: 'error',
          light: 'error.light',
          main: 'error.main',
          dark: 'error.dark',
          contrastText: 'error.contrastText'
        };
      case 'danger':
        return {
          primary: 'error',
          light: 'error.light',
          main: 'error.main',
          dark: 'error.dark',
          contrastText: 'error.contrastText'
        };
      case 'warning':
      default:
        return {
          primary: 'warning',
          light: 'warning.light',
          main: 'warning.main',
          dark: 'warning.dark',
          contrastText: 'warning.contrastText'
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
            !
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
              !
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
          onClick={onProceed}
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
          {proceedText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarningDialog;
