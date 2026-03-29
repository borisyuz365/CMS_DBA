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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * InjuryDialog Component
 */
const InjuryDialog = ({
  open,
  onClose,
  onSave,
  injury = null,
}) => {
  const isEdit = !!injury;

  const [formData, setFormData] = useState({
    START_DATE: '',
    END_DATE: '',
    INJURY_TYPE: '',
    INJURY_CATEGORY: '',
    EXPECTED_RETURN: '',
    ACTIVE: false,
    DOUBTFUL: false,
    INJURY_TYPE_UNKNOWN: false,
    IRRELEVANT: false,
  });

  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (injury) {
      setFormData({
        START_DATE: injury.START_DATE ? injury.START_DATE.split('T')[0] : '',
        END_DATE: injury.END_DATE ? injury.END_DATE.split('T')[0] : '',
        INJURY_TYPE: injury.INJURY_TYPE || '',
        INJURY_CATEGORY: injury.INJURY_CATEGORY || '',
        EXPECTED_RETURN: injury.EXPECTED_RETURN ? injury.EXPECTED_RETURN.split('T')[0] : '',
        ACTIVE: injury.ACTIVE || false,
        DOUBTFUL: injury.DOUBTFUL || false,
        INJURY_TYPE_UNKNOWN: injury.INJURY_TYPE_UNKNOWN || false,
        IRRELEVANT: injury.IRRELEVANT || false,
      });
    } else {
      setFormData({
        START_DATE: '',
        END_DATE: '',
        INJURY_TYPE: '',
        INJURY_CATEGORY: '',
        EXPECTED_RETURN: '',
        ACTIVE: false,
        DOUBTFUL: false,
        INJURY_TYPE_UNKNOWN: false,
        IRRELEVANT: false,
      });
    }
    setErrors({});
  }, [injury, open]);

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
    
    if (!formData.START_DATE) {
      newErrors.START_DATE = 'Start date is required';
    }
    
    // Validate that end date is after start date if both are provided
    if (formData.START_DATE && formData.END_DATE) {
      const startDate = new Date(formData.START_DATE);
      const endDate = new Date(formData.END_DATE);
      if (endDate < startDate) {
        newErrors.END_DATE = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const injuryData = {
      START_DATE: formData.START_DATE || null,
      END_DATE: formData.END_DATE || null,
      INJURY_TYPE: formData.INJURY_TYPE || null,
      INJURY_CATEGORY: formData.INJURY_CATEGORY || null,
      EXPECTED_RETURN: formData.EXPECTED_RETURN || null,
      ACTIVE: formData.ACTIVE,
      DOUBTFUL: formData.DOUBTFUL,
      INJURY_TYPE_UNKNOWN: formData.INJURY_TYPE_UNKNOWN,
      IRRELEVANT: formData.IRRELEVANT,
    };

    onSave(injuryData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEdit ? 'Edit Injury' : 'Add Injury'}
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
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.START_DATE}
              onChange={(e) => handleChange('START_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.START_DATE}
              helperText={errors.START_DATE}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.END_DATE}
              onChange={(e) => handleChange('END_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.END_DATE}
              helperText={errors.END_DATE}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Injury Type"
              value={formData.INJURY_TYPE}
              onChange={(e) => handleChange('INJURY_TYPE', e.target.value)}
              error={!!errors.INJURY_TYPE}
              helperText={errors.INJURY_TYPE}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Injury Category"
              value={formData.INJURY_CATEGORY}
              onChange={(e) => handleChange('INJURY_CATEGORY', e.target.value)}
              error={!!errors.INJURY_CATEGORY}
              helperText={errors.INJURY_CATEGORY}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Expected Return"
              type="date"
              value={formData.EXPECTED_RETURN}
              onChange={(e) => handleChange('EXPECTED_RETURN', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.EXPECTED_RETURN}
              helperText={errors.EXPECTED_RETURN}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.ACTIVE}
                    onChange={(e) => handleChange('ACTIVE', e.target.checked)}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.DOUBTFUL}
                    onChange={(e) => handleChange('DOUBTFUL', e.target.checked)}
                  />
                }
                label="Doubtful"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.INJURY_TYPE_UNKNOWN}
                    onChange={(e) => handleChange('INJURY_TYPE_UNKNOWN', e.target.checked)}
                  />
                }
                label="Injury Type Unknown"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.IRRELEVANT}
                    onChange={(e) => handleChange('IRRELEVANT', e.target.checked)}
                  />
                }
                label="Irrelevant"
              />
            </Box>
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

export default InjuryDialog;
