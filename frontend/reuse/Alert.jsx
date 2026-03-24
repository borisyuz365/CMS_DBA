import React from 'react';
import { Alert as MuiAlert, AlertTitle, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Alert - A customizable alert component with optional snackbar
 * 
 * @param {Object} props
 * @param {string} props.severity - Alert severity: 'error', 'warning', 'info', 'success'
 * @param {string} props.title - Alert title
 * @param {string} props.message - Alert message
 * @param {boolean} props.closable - Whether alert can be closed
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.snackbar - Whether to show as snackbar
 * @param {number} props.autoHideDuration - Auto hide duration for snackbar
 * @param {Object} props.sx - Additional styling
 */
const Alert = ({
  severity = 'info',
  title,
  message,
  closable = true,
  onClose,
  snackbar = false,
  autoHideDuration = 6000,
  sx = {},
  ...props
}) => {
  const [open, setOpen] = React.useState(true);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    onClose?.(event, reason);
  };

  const alertContent = (
    <MuiAlert
      severity={severity}
      action={
        closable && (
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        )
      }
      sx={sx}
      {...props}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </MuiAlert>
  );

  if (snackbar) {
    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {alertContent}
      </Snackbar>
    );
  }

  return alertContent;
};

export default Alert;







