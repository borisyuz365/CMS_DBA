import React from 'react';
import { Box, Button, Checkbox, FormControlLabel } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import UndoIcon from '@mui/icons-material/Undo';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import UpdateIcon from '@mui/icons-material/Update';

/**
 * ActionButton - A floating action button component with multiple actions
 * 
 * @param {Object} props
 * @param {Function} props.onSend - Callback for send action
 * @param {number} props.activeTab - Current active tab index
 * @param {Function} props.onUndo - Callback for undo action
 * @param {Function} props.onSave - Callback for save action
 * @param {Function} props.onUpdate - Callback for update action
 * @param {boolean} props.canUndo - Whether undo is available
 * @param {boolean} props.allowNotification - Whether notifications are allowed
 * @param {Function} props.onAllowNotificationChange - Callback for notification toggle
 * @param {boolean} props.hasDuplicateTargets - Whether there are duplicate targets
 * @param {boolean} props.hasChanges - Whether there are unsaved changes
 * @param {boolean} props.saveDisabled - Whether save is disabled
 * @param {Object} props.sx - Additional styling
 */
const ActionButton = ({ 
  onSend, 
  activeTab, 
  onUndo, 
  onSave,
  onUpdate,
  canUndo, 
  allowNotification, 
  onAllowNotificationChange, 
  hasDuplicateTargets,
  hasChanges = false,
  saveDisabled = false,
  sx = {}
}) => {
  const handleReload = () => {
    if (typeof activeTab === 'number') {
      localStorage.setItem('activeTab', activeTab.toString());
    }
    window.location.reload();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 64,
        right: 24,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: '#fff',
        boxShadow: 3,
        borderRadius: 2,
        p: 2,
        minWidth: 200,
        ...sx
      }}
    >
      <Button 
        variant="outlined" 
        fullWidth 
        sx={{ mb: 1 }} 
        onClick={handleReload} 
        startIcon={<ReplayIcon />}
      >
        Reload Page
      </Button>
      
      <Button 
        variant="outlined" 
        fullWidth 
        sx={{ mb: 1 }} 
        onClick={onUndo} 
        disabled={!canUndo} 
        startIcon={<UndoIcon />}
      >
        UNDO
      </Button>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={onSend} 
        fullWidth 
        sx={{ mb: 1 }} 
        startIcon={<SendIcon />}
        disabled={hasDuplicateTargets}
      >
        Send Message
      </Button>
      
      <Button 
        variant="contained" 
        color="success" 
        onClick={onSave} 
        fullWidth 
        sx={{ mb: 1 }} 
        startIcon={<SaveIcon />}
        disabled={saveDisabled || !hasChanges}
      >
        Save
      </Button>
      
      <Button 
        variant="contained" 
        color="info" 
        onClick={onUpdate} 
        fullWidth 
        sx={{ mb: 1 }} 
        startIcon={<UpdateIcon />}
      >
        Update In Services
      </Button>
      
      <FormControlLabel 
        control={
          <Checkbox 
            checked={allowNotification} 
            onChange={e => onAllowNotificationChange(e.target.checked)} 
          />
        } 
        label="Allow Notification" 
        sx={{ ml: 0 }} 
      />
    </Box>
  );
};

export default ActionButton;
