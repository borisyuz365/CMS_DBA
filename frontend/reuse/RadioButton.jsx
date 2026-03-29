import React from 'react';
import {
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';

/**
 * RadioButton - A single radio button component
 * 
 * @param {Object} props
 * @param {string} props.value - The value of this radio button
 * @param {boolean} props.checked - Whether this radio button is selected
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Label text
 * @param {string} props.description - Optional description text
 * @param {boolean} props.disabled - Whether the radio button is disabled
 * @param {string} props.color - Color theme ('primary', 'secondary', 'success', 'warning', 'error')
 * @param {string} props.size - Size ('small', 'medium', 'large')
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text
 * @param {string} props.tooltip - Tooltip text
 * @param {Object} props.sx - Additional styling
 */
const RadioButton = ({
  value,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  color = 'primary',
  size = 'medium',
  required = false,
  error,
  helperText,
  tooltip,
  sx = {},
}) => {
  const radioElement = (
    <FormControlLabel
      control={
        <Radio
          checked={checked}
          onChange={onChange}
          value={value}
          disabled={disabled}
          color={color}
          size={size}
          required={required}
        />
      }
      label={
        <Box>
          <Typography variant="body1" sx={{ fontWeight: checked ? 600 : 400 }}>
            {label}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
      }
      sx={{
        alignItems: 'flex-start',
        '& .MuiFormControlLabel-label': {
          marginLeft: 1,
        },
        ...sx,
      }}
    />
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="top" arrow>
        {radioElement}
      </Tooltip>
    );
  }

  return radioElement;
};

/**
 * RadioGroup - A group of radio buttons with shared state management
 * 
 * @param {Object} props
 * @param {string} props.name - Name for the radio group
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Change handler
 * @param {Array} props.options - Array of radio button options
 * @param {string} props.label - Group label
 * @param {string} props.helperText - Helper text
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Whether the group is required
 * @param {boolean} props.disabled - Whether all radio buttons are disabled
 * @param {string} props.color - Color theme
 * @param {string} props.size - Size
 * @param {'row'|'column'} props.orientation - Layout orientation
 * @param {Object} props.sx - Additional styling
 */
const RadioGroupComponent = ({
  name,
  value,
  onChange,
  options = [],
  label,
  helperText,
  error,
  required = false,
  disabled = false,
  color = 'primary',
  size = 'medium',
  orientation = 'column',
  sx = {},
}) => {
  const handleChange = (event) => {
    onChange(event.target.value);
  };

  return (
    <FormControl
      component="fieldset"
      error={!!error}
      required={required}
      disabled={disabled}
      sx={sx}
    >
      {label && (
        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
          {label}
        </FormLabel>
      )}
      
      <RadioGroup
        name={name}
        value={value}
        onChange={handleChange}
        sx={{
          flexDirection: orientation === 'row' ? 'row' : 'column',
          gap: orientation === 'row' ? 2 : 1,
        }}
      >
        {options.map((option) => (
          <RadioButton
            key={option.value}
            value={option.value}
            checked={value === option.value}
            onChange={handleChange}
            label={option.label}
            description={option.description}
            disabled={disabled || option.disabled}
            color={color}
            size={option.size || size}
            tooltip={option.tooltip}
          />
        ))}
      </RadioGroup>
      
      {(error || helperText) && (
        <FormHelperText error={!!error}>
          {error || helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export { RadioButton, RadioGroupComponent as RadioGroup };
export default RadioButton;
