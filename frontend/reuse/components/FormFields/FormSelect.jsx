import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Tooltip, Box } from '@mui/material';
import { FORM_CONSTANTS } from '../../theme/formConstants';

/**
 * FormSelect
 * 
 * Standardized select/dropdown field with consistent styling.
 * 
 * @param {string} label - Select label
 * @param {string} value - Selected value
 * @param {function} onChange - Change handler
 * @param {array} options - Array of option objects {value, label} or array of strings
 * @param {string} tooltip - Optional tooltip text
 * @param {string|number} width - Width preset ('small', 'medium', 'large') or custom value
 * @param {string} size - Field size ('small', 'medium', 'large')
 * @param {boolean} disabled - Disabled state
 * @param {boolean} displayEmpty - Show empty option
 * @param {object} ...props - Additional Select props
 */
export const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
  tooltip,
  width,
  size = 'small',
  disabled = false,
  displayEmpty = false,
  ...props
}) => {
  // Determine width value
  const widthValue = typeof width === 'number' 
    ? width 
    : (width ? FORM_CONSTANTS.sizes.select[width] : undefined);

  // Normalize options to array of {value, label} objects
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const select = (
    <FormControl 
      size={size} 
      sx={widthValue ? { minWidth: widthValue } : { width: '100%' }}
      disabled={disabled}
    >
      <InputLabel shrink>{label}</InputLabel>
      <Select
        value={value || ''}
        label={label}
        onChange={onChange}
        displayEmpty={displayEmpty}
        {...props}
      >
        {displayEmpty && <MenuItem value="" disabled>Please select {label.toLowerCase()}</MenuItem>}
        {normalizedOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="top" arrow>
        <Box sx={{ display: 'inline-block', width: widthValue || '100%' }}>
          {select}
        </Box>
      </Tooltip>
    );
  }

  return select;
};
