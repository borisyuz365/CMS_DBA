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
  Tab,
  Autocomplete,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import PublicIcon from '@mui/icons-material/Public';
import DataObjectIcon from '@mui/icons-material/DataObject';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

/**
 * CreateEntityDialog - A generic dialog for creating different types of entities
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.entityType - Type of entity to create
 * @param {Function} props.onSave - Save handler that receives the form data
 * @param {Object} props.initialData - Initial data for editing
 * @param {Object} props.sx - Additional styling
 */
const CreateEntityDialog = ({
  open,
  onClose,
  entityType = 'competitor',
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
    country: {
      title: 'Create New Country',
      icon: <PublicIcon />,
      color: 'primary',
      fields: {
        name: { label: 'Country Name', required: true, type: 'text', placeholder: 'Enter country name' },
        code: { label: 'Country Code', required: true, type: 'text', placeholder: 'e.g., US, UK, DE', maxLength: 3 },
        continent: { 
          label: 'Continent', 
          required: true, 
          type: 'select', 
          options: ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Antarctica'] 
        },
        population: { label: 'Population', type: 'number', placeholder: 'Enter population' },
        currency: { label: 'Currency', type: 'text', placeholder: 'e.g., USD, EUR' },
        flag: { label: 'Flag URL', type: 'url', placeholder: 'https://example.com/flag.png' },
        isActive: { label: 'Active Country', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3, placeholder: 'Enter country description' }
      },
      tabs: ['Basic Info', 'Details', 'Settings']
    },
    dataSource: {
      title: 'Create New Data Source',
      icon: <DataObjectIcon />,
      color: 'secondary',
      fields: {
        name: { label: 'Data Source Name', required: true, type: 'text', placeholder: 'Enter data source name' },
        type: { 
          label: 'Source Type', 
          required: true, 
          type: 'select', 
          options: ['API', 'Database', 'File', 'Web Scraping', 'Manual Entry', 'Third Party'] 
        },
        url: { label: 'Source URL', type: 'url', placeholder: 'https://api.example.com' },
        apiKey: { label: 'API Key', type: 'password', placeholder: 'Enter API key' },
        refreshInterval: { 
          label: 'Refresh Interval', 
          type: 'select', 
          options: ['Real-time', 'Every 5 minutes', 'Every 15 minutes', 'Every hour', 'Daily', 'Weekly'] 
        },
        priority: { 
          label: 'Priority', 
          type: 'select', 
          options: ['Low', 'Medium', 'High', 'Critical'] 
        },
        isActive: { label: 'Active Source', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3, placeholder: 'Enter data source description' }
      },
      tabs: ['Basic Info', 'Configuration', 'Settings']
    },
    competition: {
      title: 'Create New Competition',
      icon: <EmojiEventsIcon />,
      color: 'success',
      fields: {
        name: { label: 'Competition Name', required: true, type: 'text', placeholder: 'Enter competition name' },
        sportType: { 
          label: 'Sport Type', 
          required: true, 
          type: 'select', 
          options: ['Football', 'Basketball', 'Tennis', 'Baseball', 'Hockey', 'Volleyball', 'Other'] 
        },
        country: { label: 'Country', required: true, type: 'text', placeholder: 'Enter country' },
        season: { label: 'Season', type: 'text', placeholder: 'e.g., 2024/25' },
        startDate: { label: 'Start Date', type: 'date' },
        endDate: { label: 'End Date', type: 'date' },
        level: { 
          label: 'Competition Level', 
          type: 'select', 
          options: ['Professional', 'Semi-Professional', 'Amateur', 'Youth', 'Recreational'] 
        },
        isActive: { label: 'Active Competition', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3, placeholder: 'Enter competition description' }
      },
      tabs: ['Basic Info', 'Schedule', 'Settings']
    },
    athlete: {
      title: 'Create New Athlete',
      icon: <PersonIcon />,
      color: 'info',
      fields: {
        firstName: { label: 'First Name', required: true, type: 'text', placeholder: 'Enter first name' },
        lastName: { label: 'Last Name', required: true, type: 'text', placeholder: 'Enter last name' },
        dateOfBirth: { label: 'Date of Birth', type: 'date' },
        nationality: { label: 'Nationality', type: 'text', placeholder: 'Enter nationality' },
        sport: { 
          label: 'Primary Sport', 
          type: 'select', 
          options: ['Football', 'Basketball', 'Tennis', 'Baseball', 'Hockey', 'Volleyball', 'Other'] 
        },
        position: { label: 'Position', type: 'text', placeholder: 'e.g., Forward, Midfielder, Goalkeeper' },
        height: { label: 'Height (cm)', type: 'number', placeholder: 'Enter height in centimeters' },
        weight: { label: 'Weight (kg)', type: 'number', placeholder: 'Enter weight in kilograms' },
        jerseyNumber: { label: 'Jersey Number', type: 'number', placeholder: 'Enter jersey number' },
        isActive: { label: 'Active Athlete', type: 'switch', default: true },
        bio: { label: 'Biography', type: 'textarea', multiline: true, rows: 4, placeholder: 'Enter athlete biography' }
      },
      tabs: ['Personal Info', 'Sports Info', 'Details']
    },
    venue: {
      title: 'Create New Venue',
      icon: <LocationOnIcon />,
      color: 'warning',
      fields: {
        name: { label: 'Venue Name', required: true, type: 'text', placeholder: 'Enter venue name' },
        city: { label: 'City', required: true, type: 'text', placeholder: 'Enter city' },
        country: { label: 'Country', required: true, type: 'text', placeholder: 'Enter country' },
        address: { label: 'Address', type: 'text', placeholder: 'Enter full address' },
        capacity: { label: 'Capacity', type: 'number', placeholder: 'Enter venue capacity' },
        surface: { 
          label: 'Surface Type', 
          type: 'select', 
          options: ['Grass', 'Artificial Turf', 'Hard Court', 'Clay', 'Indoor', 'Other'] 
        },
        coordinates: { 
          label: 'Coordinates', 
          type: 'text', 
          placeholder: 'Latitude, Longitude (e.g., 40.7128, -74.0060)' 
        },
        isActive: { label: 'Active Venue', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3, placeholder: 'Enter venue description' }
      },
      tabs: ['Basic Info', 'Location', 'Details']
    },
    competitor: {
      title: 'Create New Competitor',
      icon: <SportsSoccerIcon />,
      color: 'primary',
      fields: {
        name: { label: 'Competitor Name', required: true, type: 'text', placeholder: 'Enter competitor name' },
        sportType: { 
          label: 'Sport Type', 
          required: true, 
          type: 'select', 
          options: ['Football', 'Basketball', 'Tennis', 'Baseball', 'Hockey', 'Volleyball', 'Other'] 
        },
        competitorType: { 
          label: 'Competitor Type', 
          required: true, 
          type: 'select', 
          options: ['Team', 'Individual', 'Club', 'Association'] 
        },
        country: { label: 'Country', required: true, type: 'text', placeholder: 'Enter country' },
        city: { label: 'City', type: 'text', placeholder: 'Enter city' },
        gender: { 
          label: 'Gender', 
          type: 'select', 
          options: ['Male', 'Female', 'Mixed', 'Not Specified'] 
        },
        foundationYear: { label: 'Foundation Year', type: 'number', placeholder: 'Enter foundation year' },
        primaryColor: { label: 'Primary Color', type: 'color', default: '#1976d2' },
        secondaryColor: { label: 'Secondary Color', type: 'color', default: '#ffffff' },
        thirdColor: { label: 'Third Color', type: 'color', default: '#000000' },
        logo: { label: 'Logo URL', type: 'url', placeholder: 'https://example.com/logo.png' },
        isActive: { label: 'Active Competitor', type: 'switch', default: true },
        description: { label: 'Description', type: 'textarea', multiline: true, rows: 3, placeholder: 'Enter competitor description' }
      },
      tabs: ['Basic Info', 'Appearance', 'Details']
    }
  };

  const config = entityConfigs[entityType] || entityConfigs.competitor;

  // Initialize form data
  useEffect(() => {
    if (open) {
      const initialFormData = {};
      Object.keys(config.fields).forEach(key => {
        initialFormData[key] = initialData[key] || config.fields[key].default || '';
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
    Object.keys(config.fields).forEach(key => {
      const field = config.fields[key];
      if (field.required && (!formData[key] || formData[key].toString().trim() === '')) {
        newErrors[key] = `${field.label} is required`;
      }
      if (field.maxLength && formData[key] && formData[key].length > field.maxLength) {
        newErrors[key] = `${field.label} must be ${field.maxLength} characters or less`;
      }
      if (field.min && formData[key] && formData[key] < field.min) {
        newErrors[key] = `${field.label} must be at least ${field.min}`;
      }
      if (field.max && formData[key] && formData[key] > field.max) {
        newErrors[key] = `${field.label} must be at most ${field.max}`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving entity:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (key, field) => {
    const value = formData[key] || '';
    const error = errors[key];

    const commonProps = {
      fullWidth: true,
      value,
      onChange: (e) => handleFieldChange(key, e.target.value),
      error: !!error,
      helperText: error,
      disabled: loading,
      size: 'small',
      sx: { mb: 2 }
    };

    switch (field.type) {
      case 'text':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            inputProps={{ maxLength: field.maxLength }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            multiline={field.multiline}
            rows={field.rows}
            required={field.required}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            type="number"
            required={field.required}
            inputProps={{ min: field.min, max: field.max }}
          />
        );

      case 'date':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type="date"
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'url':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            type="url"
            required={field.required}
          />
        );

      case 'password':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            type="password"
            required={field.required}
          />
        );

      case 'color':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type="color"
            required={field.required}
            sx={{ ...commonProps.sx, '& .MuiInputBase-input': { height: '40px', padding: '8px' } }}
          />
        );

      case 'select':
        return (
          <FormControl {...commonProps} required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              label={field.label}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={loading}
            >
              {field.options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(key, e.target.checked)}
                disabled={loading}
                color={config.color}
              />
            }
            label={field.label}
            sx={{ mb: 2 }}
          />
        );

      default:
        return null;
    }
  };

  const getTabFields = (tabIndex) => {
    const tabNames = config.tabs;
    const fieldsPerTab = Math.ceil(Object.keys(config.fields).length / tabNames.length);
    const fieldKeys = Object.keys(config.fields);
    const startIndex = tabIndex * fieldsPerTab;
    const endIndex = Math.min(startIndex + fieldsPerTab, fieldKeys.length);
    return fieldKeys.slice(startIndex, endIndex);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20)',
          ...sx,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: `${config.color}.main`,
          fontWeight: 600,
          fontSize: '1.25rem',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          p: 1,
          borderRadius: 2,
          bgcolor: `${config.color}.light`,
          color: `${config.color}.main`
        }}>
          {config.icon}
        </Box>
        {config.title}
        <IconButton
          onClick={onClose}
          sx={{ ml: 'auto' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ px: 3 }}
          >
            {config.tabs.map((tab, index) => (
              <Tab 
                key={index} 
                label={tab} 
                sx={{ 
                  fontWeight: 600, 
                  color: activeTab === index ? `${config.color}.main` : 'text.secondary',
                  textTransform: 'none'
                }} 
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {getTabFields(activeTab).map((key) => (
              <Grid item xs={12} sm={6} key={key}>
                {renderField(key, config.fields[key])}
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          gap: 2,
          justifyContent: 'flex-end',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSave}
          variant="contained"
          color={config.color}
          disabled={loading}
          startIcon={loading ? null : <SaveIcon />}
          sx={{
            minWidth: 120,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: `0 4px 12px ${config.color === 'primary' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(0, 0, 0, 0.2)'}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${config.color === 'primary' ? 'rgba(25, 118, 210, 0.4)' : 'rgba(0, 0, 0, 0.3)'}`,
            },
          }}
        >
          {loading ? 'Creating...' : 'CREATE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEntityDialog;
