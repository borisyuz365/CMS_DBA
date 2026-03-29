import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

/**
 * SaveUpdateButtons - Floating action buttons for save, update, and reload operations
 * 
 * @param {Object} props
 * @param {boolean} props.hasChanges - Whether there are unsaved changes
 * @param {Function} props.onSave - Callback for save action
 * @param {Function} props.onUpdate - Callback for update action
 * @param {Function} props.onReload - Callback for reload action
 * @param {boolean} props.reloadLoading - Whether reload is in progress
 * @param {boolean} props.saveDisabled - Whether save button should be disabled
 * @param {Object} props.sx - Additional styling
 */
const SaveUpdateButtons = ({ 
  hasChanges, 
  onSave, 
  onUpdate, 
  onReload, 
  reloadLoading, 
  saveDisabled, 
  sx = {} 
}) => {
  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        bottom: 32, 
        right: 32, 
        zIndex: 1200, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        ...sx 
      }}
    >
      <Button
        variant="contained"
        color="success"
        size="large"
        disabled={saveDisabled || !hasChanges || reloadLoading}
        onClick={onSave}
        sx={{ 
          px: 5, 
          boxShadow: 3, 
          bgcolor: '#43a047', 
          '&:hover': { bgcolor: '#388e3c' } 
        }}
      >
        SAVE
      </Button>
      
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={onUpdate}
        disabled={reloadLoading}
        sx={{ px: 5, boxShadow: 3 }}
      >
        UPDATE IN SERVICES
      </Button>
      
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={onReload}
        disabled={reloadLoading}
        sx={{ px: 5, boxShadow: 3, position: 'relative' }}
      >
        {reloadLoading && (
          <CircularProgress 
            size={24} 
            color="inherit" 
            sx={{ 
              position: 'absolute', 
              left: 24, 
              top: '50%', 
              marginTop: '-12px' 
            }} 
          />
        )}
        RELOAD
      </Button>
    </Box>
  );
};

export default SaveUpdateButtons;
