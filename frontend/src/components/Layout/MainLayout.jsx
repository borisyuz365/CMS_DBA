import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import TopBar from '../../../reuse/TopBar';

/**
 * MainLayout - Top bar (breadcrumbs + environment) + content area, no extra frame or colored background.
 */
function MainLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <TopBar />
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
