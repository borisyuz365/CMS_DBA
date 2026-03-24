import React from 'react';
import { Button } from '@mui/material';

/**
 * PrimaryButton - A primary action button component
 * 
 * @param {Object} props
 * @param {string} props.children - Button text
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {string} props.size - Button size: 'small', 'medium', 'large'
 * @param {React.ReactNode} props.startIcon - Start icon
 * @param {React.ReactNode} props.endIcon - End icon
 * @param {Object} props.sx - Additional styling
 */
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
}) => {
  return (
    <Button
      variant="contained"
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
        ...sx
      }}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </Button>
  );
};

export default PrimaryButton;
