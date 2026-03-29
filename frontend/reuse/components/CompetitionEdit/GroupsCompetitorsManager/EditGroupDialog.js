import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  IconButton,
  Grid,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

function EditGroupDialog({
  open,
  onClose,
  group,
  onSave,
  onGroupNameClick,
}) {
  const [formData, setFormData] = React.useState({
    USE_NAME: false,
    GROUP_BY: false,
    HAS_TABLE: false,
    IS_SERIES: false,
    IS_FINAL: false,
  });

  React.useEffect(() => {
    if (group) {
      setFormData({
        USE_NAME: group.USE_NAME || false,
        GROUP_BY: group.GROUP_BY || false,
        HAS_TABLE: group.HAS_TABLE || false,
        IS_SERIES: group.IS_SERIES || false,
        IS_FINAL: group.IS_FINAL || false,
      });
    }
  }, [group]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (onSave && group) {
      onSave({
        ...group,
        ...formData
      });
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset form data
    if (group) {
      setFormData({
        USE_NAME: group.USE_NAME || false,
        GROUP_BY: group.GROUP_BY || false,
        HAS_TABLE: group.HAS_TABLE || false,
        IS_SERIES: group.IS_SERIES || false,
        IS_FINAL: group.IS_FINAL || false,
      });
    }
    onClose();
  };

  if (!group) return null;

  const groupName = group.name || `Group ${group.GROUP_NUM || group.groupNum}`;

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        bgcolor: '#f5f5f5', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Typography variant="h6" fontWeight={600}>
          Edit Group {groupName}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleCancel}
          sx={{ color: '#666' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {/* Group Name */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
              Group Name
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={groupName}
                size="small"
                disabled
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={onGroupNameClick}
                sx={{ minWidth: 40, px: 1 }}
              >
                ...
              </Button>
            </Box>
          </Grid>

          {/* Checkboxes */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.USE_NAME}
                  onChange={(e) => handleChange('USE_NAME', e.target.checked)}
                  size="small"
                />
              }
              label="Use Name"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.GROUP_BY}
                  onChange={(e) => handleChange('GROUP_BY', e.target.checked)}
                  size="small"
                />
              }
              label="Group By"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HAS_TABLE}
                  onChange={(e) => handleChange('HAS_TABLE', e.target.checked)}
                  size="small"
                />
              }
              label="Has Table"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.IS_SERIES}
                  onChange={(e) => handleChange('IS_SERIES', e.target.checked)}
                  size="small"
                />
              }
              label="Is Series"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.IS_FINAL}
                  onChange={(e) => handleChange('IS_FINAL', e.target.checked)}
                  size="small"
                />
              }
              label="Is Final"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0', gap: 1 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ 
            minWidth: 100,
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditGroupDialog;



