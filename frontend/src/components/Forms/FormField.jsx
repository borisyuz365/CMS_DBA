import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, Box, Tooltip, Typography } from '@mui/material';

const FormField = ({
  type = 'text',
  label,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  readOnly = false,
  placeholder,
  helperText,
  error,
  size = 'small',
  fullWidth = true,
  tooltip,
  startAdornment,
  endAdornment,
  sx = {},
  ...props
}) => {
  const fieldProps = {
    label,
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    required,
    disabled: disabled || readOnly,
    size,
    fullWidth,
    error: !!error,
    sx: {
      ...sx,
      ...(readOnly && {
        '& .MuiInputBase-root': { color: '#495057', fontWeight: 400, cursor: 'default', background: '#fafbfc' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e3e7' },
      }),
    },
    ...props,
  };

  const renderField = () => {
    switch (type) {
      case 'select':
        return (
          <FormControl {...fieldProps}>
            <InputLabel>{label}</InputLabel>
            <Select value={value || ''} label={label} onChange={onChange} disabled={disabled || readOnly}>
              {options.map((opt) => (
                <MenuItem key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControlLabel
            control={<Checkbox checked={!!value} onChange={(e) => onChange(e.target.checked)} disabled={disabled} color="primary" />}
            label={label}
            sx={sx}
          />
        );
      case 'switch':
        return (
          <FormControlLabel
            control={<Checkbox checked={!!value} onChange={(e) => onChange(e.target.checked)} disabled={disabled} color="primary" size="small" />}
            label={label}
            sx={sx}
          />
        );
      case 'color':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
            <TextField {...fieldProps} type="color" sx={{ width: 50, minWidth: 50, p: 0, bgcolor: 'transparent', '& .MuiInputBase-input': { padding: 0, width: 40, height: 30 }, '& .MuiInputLabel-root': { display: 'none' } }} />
            <Typography variant="body2" sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}>{label}</Typography>
          </Box>
        );
      default:
        return (
          <TextField
            {...fieldProps}
            type={type}
            placeholder={placeholder}
            helperText={error || helperText}
            InputProps={{ readOnly, startAdornment, endAdornment }}
          />
        );
    }
  };

  const field = renderField();
  if (tooltip) return <Tooltip title={tooltip} arrow><Box>{field}</Box></Tooltip>;
  return field;
};

export default FormField;
