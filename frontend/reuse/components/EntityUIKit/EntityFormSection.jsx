import React from 'react';
import {
  Paper,
  Grid,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';

/**
 * EntityFormSection - Reusable form section component for entity details pages
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {Object} props.formData - Form data object
 * @param {Function} props.onFormChange - Handler for form field changes (field, value) => void
 * @param {Array} props.fields - Array of field configurations:
 *   [
 *     {
 *       field: 'SPORT_TYPE_ID',
 *       type: 'select', // 'select' | 'text' | 'number' | 'date' | 'checkbox'
 *       label: 'Sport Type',
 *       options: [], // For select fields
 *       getOptionLabel: (option) => option.name, // For select fields
 *       getOptionValue: (option) => option.id, // For select fields
 *       disabled: false,
 *       xs: 12, // Grid breakpoints
 *       md: 3,
 *       conditional: (formData) => formData.SPORT_TYPE_ID !== 3, // Show conditionally
 *     }
 *   ]
 * @param {Array} props.checkboxes - Array of checkbox configurations:
 *   [
 *     {
 *       field: 'ENABLE_BUZZ',
 *       label: 'Buzz',
 *     }
 *   ]
 * @param {Object} props.actionButtons - Action buttons configuration:
 *   {
 *     left: [
 *       {
 *         label: 'Image Version Update (1)',
 *         onClick: () => {},
 *         variant: 'contained',
 *         color: 'primary',
 *       }
 *     ],
 *     right: [
 *       {
 *         label: 'Save & Update In Service',
 *         onClick: () => {},
 *         variant: 'contained',
 *         color: 'success',
 *       }
 *     ]
 *   }
 * @param {Object} props.sx - Additional styling
 */
const EntityFormSection = ({
  title = 'General Details',
  formData = {},
  onFormChange,
  fields = [],
  checkboxes = [],
  actionButtons = null,
  sx = {},
}) => {
  const handleFieldChange = (field, value) => {
    onFormChange?.(field, value);
  };

  const renderField = (fieldConfig) => {
    const {
      field,
      type,
      label,
      options = [],
      getOptionLabel,
      getOptionValue,
      disabled = false,
      ...fieldProps
    } = fieldConfig;

    const value = formData[field] || '';

    switch (type) {
      case 'select':
        return (
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>{label}</InputLabel>
            <Select
              value={value}
              label={label}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              sx={{
                '& .MuiOutlinedInput-input': {
                  py: 1,
                },
              }}
              {...fieldProps}
            >
              {options.map((option) => {
                const optValue = getOptionValue ? getOptionValue(option) : (option.id || option.value || option);
                const optLabel = getOptionLabel ? getOptionLabel(option) : (option.name || option.label || String(option));
                return (
                  <MenuItem key={optValue} value={optValue}>
                    {optLabel}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        );

      case 'text':
      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type={type === 'number' ? 'number' : 'text'}
            label={label}
            value={value}
            onChange={(e) => handleFieldChange(field, type === 'number' ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value)}
            disabled={disabled}
            sx={{
              '& .MuiOutlinedInput-input': {
                py: 1,
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
              ...(disabled && {
                '& .MuiOutlinedInput-input': {
                  backgroundColor: '#f5f5f5',
                },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f5f5f5',
                },
              }),
            }}
            {...fieldProps}
          />
        );

      case 'date':
        return (
          <TextField
            fullWidth
            size="small"
            type="date"
            label={label}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={disabled}
            sx={{
              '& .MuiOutlinedInput-input': {
                py: 1,
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
              ...(disabled && {
                '& .MuiOutlinedInput-input': {
                  backgroundColor: '#f5f5f5',
                },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f5f5f5',
                },
              }),
            }}
            {...fieldProps}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        boxShadow: 1,
        border: '1px solid #e0e0e0',
        backgroundColor: 'white',
        mb: 2,
        ...sx,
      }}
    >
      {/* Section Header */}
      <Box
        sx={{
          mb: 2,
          pb: 1,
          borderBottom: '2px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          px: 2,
          py: 1,
          mx: -3,
          mt: -3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>

      {/* Form Fields Grid */}
      <Grid container spacing={1.5}>
        {fields.map((fieldConfig) => {
          const { field, conditional, xs = 12, md = 3, ...rest } = fieldConfig;
          
          // Check conditional rendering
          if (conditional && !conditional(formData)) {
            return null;
          }

          return (
            <Grid key={field} item xs={xs} md={md}>
              {renderField({ field, ...rest })}
            </Grid>
          );
        })}
      </Grid>

      {/* Action Buttons Row */}
      {actionButtons && (
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {/* Left Buttons */}
          {actionButtons.left && actionButtons.left.length > 0 && (
            <Grid item xs={12} md={3}>
              {actionButtons.left.map((button, index) => (
                <Button
                  key={index}
                  variant={button.variant || 'contained'}
                  fullWidth={button.fullWidth !== false}
                  onClick={button.onClick}
                  sx={{
                    backgroundColor: button.color === 'primary' ? '#1976d2' : undefined,
                    textTransform: 'none',
                    mb: index < actionButtons.left.length - 1 ? 1 : 0,
                    ...button.sx,
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </Grid>
          )}

          {/* Checkboxes and Right Buttons */}
          {(checkboxes.length > 0 || (actionButtons.right && actionButtons.right.length > 0)) && (
            <Grid item xs={12} md={actionButtons.left ? 9 : 12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                {/* Checkboxes */}
                {checkboxes.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {checkboxes.map((checkbox) => (
                      <FormControlLabel
                        key={checkbox.field}
                        control={
                          <Checkbox
                            checked={formData[checkbox.field] || false}
                            onChange={(e) => handleFieldChange(checkbox.field, e.target.checked)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">{checkbox.label}</Typography>}
                      />
                    ))}
                  </Box>
                )}

                {/* Right Buttons */}
                {actionButtons.right && actionButtons.right.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {actionButtons.right.map((button, index) => (
                      <Button
                        key={index}
                        variant={button.variant || 'contained'}
                        onClick={button.onClick}
                        sx={{
                          textTransform: 'none',
                          backgroundColor: button.color === 'success' ? '#15803d' : '#1976d2',
                          color: 'white',
                          px: 4,
                          py: 1,
                          '&:hover': {
                            backgroundColor: button.color === 'success' ? '#166534' : '#1565c0',
                          },
                          ...button.sx,
                        }}
                      >
                        {button.label}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Paper>
  );
};

export default EntityFormSection;
