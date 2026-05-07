import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * SuspensionDialog Component
 */
const SuspensionDialog = ({
  open,
  onClose,
  onSave,
  suspension = null,
  competitions = [],
  suspensionTypes = [],
}) => {
  const isEdit = !!suspension;

  const [formData, setFormData] = useState({
    COMPETITION_ID: '',
    GAMES_COUNT: '',
    SUSPENSION_TYPE: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (suspension) {
      setFormData({
        COMPETITION_ID: suspension.COMPETITION_ID || '',
        GAMES_COUNT: suspension.GAMES_COUNT || '',
        SUSPENSION_TYPE: suspension.SUSPENSION_TYPE || '',
      });
    } else {
      setFormData({
        COMPETITION_ID: '',
        GAMES_COUNT: '',
        SUSPENSION_TYPE: '',
      });
    }
    setErrors({});
  }, [suspension, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Validate games count is a positive number if provided
    if (formData.GAMES_COUNT && (isNaN(formData.GAMES_COUNT) || parseInt(formData.GAMES_COUNT) < 0)) {
      newErrors.GAMES_COUNT = 'Games count must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const suspensionData = {
      COMPETITION_ID: formData.COMPETITION_ID || null,
      GAMES_COUNT: formData.GAMES_COUNT ? parseInt(formData.GAMES_COUNT) : null,
      SUSPENSION_TYPE: formData.SUSPENSION_TYPE || null,
    };

    onSave(suspensionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEdit ? 'Edit Suspension' : 'Add Suspension'}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Competition</InputLabel>
              <Select
                value={formData.COMPETITION_ID}
                label="Competition"
                onChange={(e) => handleChange('COMPETITION_ID', e.target.value)}
                error={!!errors.COMPETITION_ID}
              >
                <MenuItem value="">None</MenuItem>
                {competitions.map(competition => (
                  <MenuItem key={competition.COMPETITION_ID} value={competition.COMPETITION_ID}>
                    {competition.name || `Competition ${competition.COMPETITION_ID}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Suspension Type</InputLabel>
              <Select
                value={formData.SUSPENSION_TYPE}
                label="Suspension Type"
                onChange={(e) => handleChange('SUSPENSION_TYPE', e.target.value)}
                error={!!errors.SUSPENSION_TYPE}
              >
                <MenuItem value="">None</MenuItem>
                {suspensionTypes.map(type => (
                  <MenuItem key={type.SUSPENSION_TYPE_ID} value={type.SUSPENSION_TYPE}>
                    {type.SUSPENSION_TYPE}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Games Count"
              type="number"
              value={formData.GAMES_COUNT}
              onChange={(e) => handleChange('GAMES_COUNT', e.target.value)}
              error={!!errors.GAMES_COUNT}
              helperText={errors.GAMES_COUNT}
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuspensionDialog;
