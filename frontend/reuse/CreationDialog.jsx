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
  Box,
  Typography,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * CreationDialog - A generic dialog for creating new entities (seasons, stages, etc.)
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.entityType - Type of entity to create ('season', 'stage', 'group', etc.)
 * @param {Function} props.onSave - Save handler that receives the form data
 * @param {Object} props.initialData - Initial data for editing
 * @param {Object} props.sx - Additional styling
 */
const CreationDialog = ({
  open,
  onClose,
  entityType = 'season',
  onSave,
  initialData = {},
  sx = {}
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Entity type configurations
  const entityConfigs = {
    season: {
      title: 'Create New Season',
      icon: <CalendarTodayIcon />,
      fields: {
        name: { label: 'Season Name', required: true, type: 'text' },
        key: { label: 'Season Key', required: true, type: 'text' },
        startDate: { label: 'Start Date', required: true, type: 'date' },
        endDate: { label: 'End Date', required: true, type: 'date' },
        isActive: { label: 'Active Season', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3 }
      },
      tabs: ['Basic Info', 'Configuration', 'Advanced']
    },
    stage: {
      title: 'Create New Stage',
      icon: <SettingsIcon />,
      fields: {
        name: { label: 'Stage Name', required: true, type: 'text' },
        type: { label: 'Stage Type', required: true, type: 'select', options: ['Group', 'Knockout', 'Playoff', 'Final'] },
        startDate: { label: 'Start Date', required: true, type: 'date' },
        endDate: { label: 'End Date', required: true, type: 'date' },
        isActive: { label: 'Active Stage', type: 'switch', default: true },
        maxTeams: { label: 'Max Teams', type: 'number', min: 1, max: 32 },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3 }
      },
      tabs: ['Basic Info', 'Settings', 'Advanced']
    },
    group: {
      title: 'Create New Group',
      icon: <AddIcon />,
      fields: {
        name: { label: 'Group Name', required: true, type: 'text' },
        type: { label: 'Group Type', required: true, type: 'select', options: ['Round Robin', 'Single Elimination', 'Double Elimination'] },
        maxTeams: { label: 'Max Teams', required: true, type: 'number', min: 2, max: 16 },
        isActive: { label: 'Active Group', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 2 }
      },
      tabs: ['Basic Info', 'Settings']
    }
  };

  const config = entityConfigs[entityType] || entityConfigs.season;

  // Initialize form data
  useEffect(() => {
    if (open) {
      const initialFormData = {};
      Object.keys(config.fields).forEach(key => {
        const field = config.fields[key];
        initialFormData[key] = initialData[key] || field.default || '';
      });
      setFormData(initialFormData);
      setErrors({});
      setActiveTab(0);
    }
  }, [open, entityType, initialData, config.fields]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(config.fields).forEach(field => {
      const fieldConfig = config.fields[field];
      const value = formData[field];
      
      if (fieldConfig.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = `${fieldConfig.label} is required`;
      }
      
      if (fieldConfig.type === 'date' && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          newErrors[field] = 'Invalid date format';
        }
      }
      
      if (fieldConfig.type === 'number' && value) {
        const num = Number(value);
        if (isNaN(num) || (fieldConfig.min && num < fieldConfig.min) || (fieldConfig.max && num > fieldConfig.max)) {
          newErrors[field] = `Must be between ${fieldConfig.min || 0} and ${fieldConfig.max || 999}`;
        }
      }
    });
    
    // Date range validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await onSave?.(formData);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderField = (fieldKey, fieldConfig) => {
    const value = formData[fieldKey] || '';
    const error = errors[fieldKey];
    
    switch (fieldConfig.type) {
      case 'text':
        return (
          <TextField
            key={fieldKey}
            fullWidth
            label={fieldConfig.label}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            error={!!error}
            helperText={error}
            required={fieldConfig.required}
          />
        );
        
      case 'textarea':
        return (
          <TextField
            key={fieldKey}
            fullWidth
            label={fieldConfig.label}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            error={!!error}
            helperText={error}
            multiline={fieldConfig.multiline}
            rows={fieldConfig.rows}
            required={fieldConfig.required}
          />
        );
        
      case 'number':
        return (
          <TextField
            key={fieldKey}
            fullWidth
            label={fieldConfig.label}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            error={!!error}
            helperText={error}
            required={fieldConfig.required}
            inputProps={{ min: fieldConfig.min, max: fieldConfig.max }}
          />
        );
        
      case 'date':
        return (
          <TextField
            key={fieldKey}
            fullWidth
            label={fieldConfig.label}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            error={!!error}
            helperText={error}
            required={fieldConfig.required}
            InputLabelProps={{ shrink: true }}
          />
        );
        
      case 'select':
        return (
          <FormControl key={fieldKey} fullWidth error={!!error}>
            <InputLabel>{fieldConfig.label}</InputLabel>
            <Select
              value={value}
              label={fieldConfig.label}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              required={fieldConfig.required}
            >
              {fieldConfig.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
            {error && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>{error}</Typography>}
          </FormControl>
        );
        
      case 'switch':
        return (
          <FormControlLabel
            key={fieldKey}
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
              />
            }
            label={fieldConfig.label}
          />
        );
        
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    const fields = Object.keys(config.fields);
    
    switch (activeTab) {
      case 0: // Basic Info
        return (
          <Grid container spacing={2}>
            {fields.slice(0, Math.ceil(fields.length / 2)).map(fieldKey => (
              <Grid item xs={12} sm={6} key={fieldKey}>
                {renderField(fieldKey, config.fields[fieldKey])}
              </Grid>
            ))}
          </Grid>
        );
        
      case 1: // Configuration/Settings
        return (
          <Grid container spacing={2}>
            {fields.slice(Math.ceil(fields.length / 2), fields.length - 1).map(fieldKey => (
              <Grid item xs={12} sm={6} key={fieldKey}>
                {renderField(fieldKey, config.fields[fieldKey])}
              </Grid>
            ))}
          </Grid>
        );
        
      case 2: // Advanced
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {renderField('description', config.fields.description)}
            </Grid>
          </Grid>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={sx}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {config.icon}
        {config.title}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`Entity Type: ${entityType.toUpperCase()}`} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        </Box>
        
        {config.tabs.length > 1 && (
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
            {config.tabs.map((tab, index) => (
              <Tab key={index} label={tab} />
            ))}
          </Tabs>
        )}
        
        {renderTabContent()}
        
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Please fix the errors above before saving.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreationDialog;

