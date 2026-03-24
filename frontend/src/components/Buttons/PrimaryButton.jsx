import React from 'react';
import { Button } from '@mui/material';

const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  size = 'medium',
  startIcon,
  endIcon,
  sx = {},
  ...props
}) => (
  <Button
    variant="contained"
    color="primary"
    size={size}
    disabled={disabled || loading}
    onClick={onClick}
    startIcon={startIcon}
    endIcon={endIcon}
    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 120, ...sx }}
    {...props}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

export default PrimaryButton;
