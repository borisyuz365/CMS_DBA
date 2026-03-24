import React from 'react';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

const LoadingSpinner = ({
  loading = true,
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
  sx = {},
}) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 56;
      default: return 40;
    }
  };
  const spinner = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, ...sx }}>
      <CircularProgress size={getSize()} />
      {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
    </Box>
  );
  if (fullScreen) {
    return (
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, ...sx }}>
        {spinner}
      </Backdrop>
    );
  }
  return loading ? spinner : null;
};

export default LoadingSpinner;
