import React from 'react';
import { TextField, Tooltip, Box } from '@mui/material';
import { FORM_CONSTANTS } from '../../theme/formConstants';

/**
 * FormTextField
 * 
 * Standardized text input field with consistent styling and behavior.
 * 
 * @param {string} label - Field label
 * @param {string} value - Field value
 * @param {function} onChange - Change handler
 * @param {string} tooltip - Optional tooltip text
 * @param {string|number} width - Width preset ('small', 'medium', 'large', 'full') or custom value
 * @param {string} size - Field size ('small', 'medium', 'large')
 * @param {boolean} disabled - Disabled state
 * @param {boolean} error - Error state
 * @param {string} helperText - Helper text (usually for errors)
 * @param {object} inputProps - Additional input props
 * @param {object} ...props - Additional TextField props
 */
export const FormTextField = ({
  label,
  value,
  onChange,
  tooltip,
  width = 'full',
  size = 'small',
  disabled = false,
  error = false,
  helperText = '',
  inputProps = {},
  ...props
}) => {
  // Determine width value
  const widthValue = typeof width === 'number' 
    ? width 
    : FORM_CONSTANTS.sizes.input[width] || width;

  const isFullWidth = width === 'full';

  const field = (
    <TextField
      fullWidth={isFullWidth}
      size={size}
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      helperText={helperText}
      InputLabelProps={{ shrink: true }}
      sx={!isFullWidth ? { width: widthValue } : {}}
      inputProps={inputProps}
      {...props}
    />
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="top" arrow>
        <Box sx={{ width: !isFullWidth ? widthValue : '100%', display: 'inline-block' }}>
          {field}
        </Box>
      </Tooltip>
    );
  }

  return field;
};
