import React from 'react';
import { TextField } from '@mui/material';

/**
 * FormField - A reusable form field component
 * 
 * @param {Object} props
 * @param {string} props.type - Input type
 * @param {string} props.label - Field label
 * @param {string} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.placeholder - Placeholder text
 * @param {Object} props.sx - Additional styling
 */
export const FormField = ({
  type = 'text',
  label,
  value,
  onChange,
  required = false,
  placeholder,
  sx = {},
  ...props
}) => {
  const handleChange = (e) => {
    if (typeof onChange === 'function') {
      onChange(e.target.value);
    } else if (onChange) {
      onChange(e);
    }
  };

  return (
    <TextField
      type={type}
      label={label}
      value={value || ''}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={sx}
      {...props}
    />
  );
};
