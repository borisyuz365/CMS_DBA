import React from 'react';
import { Button } from '@mui/material';

const SecondaryButton = ({
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
    variant="outlined"
    color="primary"
    size={size}
    disabled={disabled || loading}
    onClick={onClick}
    startIcon={startIcon}
    endIcon={endIcon}
    sx={{
      textTransform: 'none',
      fontWeight: 600,
      minWidth: 120,
      borderWidth: 2,
      '&:hover': { borderWidth: 2 },
      ...sx,
    }}
    {...props}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

export default SecondaryButton;
