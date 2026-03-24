import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ModalDialog - A flexible modal dialog component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Dialog title
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} props.actions - Custom actions
 * @param {string} props.maxWidth - Maximum width: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {boolean} props.fullWidth - Whether dialog takes full width
 * @param {boolean} props.fullScreen - Whether dialog is full screen
 * @param {boolean} props.showCloseButton - Whether to show close button
 * @param {Object} props.sx - Additional styling
 */
const ModalDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  fullWidth = true,
  fullScreen = false,
  showCloseButton = true,
  sx = {},
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          boxShadow: fullScreen 
            ? 'none' 
            : '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20)',
          ...sx,
        },
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '1.25rem',
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 'inherit' }}>
            {title}
          </Typography>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              sx={{ ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ p: 3 }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            p: 3,
            pt: 2,
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ModalDialog;
