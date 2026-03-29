import React from 'react';
import { FormControlLabel, Checkbox, Tooltip } from '@mui/material';

/**
 * FormCheckbox
 * 
 * Standardized checkbox field with consistent styling.
 * 
 * @param {string} label - Checkbox label
 * @param {boolean} checked - Checked state
 * @param {function} onChange - Change handler
 * @param {string} tooltip - Optional tooltip text
 * @param {boolean} disabled - Disabled state
 * @param {object} ...props - Additional FormControlLabel props
 */
export const FormCheckbox = ({
  label,
  checked,
  onChange,
  tooltip,
  disabled = false,
  ...props
}) => {
  const checkbox = (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      }
      label={label}
      sx={{ fontSize: '0.875rem' }}
      {...props}
    />
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="top" arrow>
        <span>{checkbox}</span>
      </Tooltip>
    );
  }

  return checkbox;
};
