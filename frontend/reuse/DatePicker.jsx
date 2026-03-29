import React, { useRef } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ClearIcon from '@mui/icons-material/Clear';

const toDateInputValue = (date) => {
  if (!date) return '';
  let d = date;
  if (typeof d === 'string') d = new Date(d);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toDisplayValue = (date) => {
  if (!date) return '';
  let d = date;
  if (typeof d === 'string') d = new Date(d);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
};

const DatePicker = ({
  value,
  onChange,
  label = 'Select Date',
  disabled = false,
  required = false,
  error,
  helperText,
  sx = {},
  ...props
}) => {
  const hiddenRef = useRef(null);

  const handleNativeChange = (e) => {
    const dateValue = e.target.value ? new Date(e.target.value) : null;
    onChange?.(dateValue);
  };

  const openPicker = () => {
    if (disabled) return;
    hiddenRef.current?.showPicker?.();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <>
      <input
        ref={hiddenRef}
        type="date"
        value={toDateInputValue(value)}
        onChange={handleNativeChange}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
      />
      <TextField
        label={label}
        value={toDisplayValue(value)}
        onClick={openPicker}
        disabled={disabled}
        required={required}
        error={!!error}
        helperText={error || helperText}
        fullWidth
        size="small"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          sx: { cursor: disabled ? 'default' : 'pointer' },
          endAdornment: (
            <InputAdornment position="end">
              {value && !disabled && (
                <IconButton size="small" onClick={handleClear} edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" onClick={openPicker} disabled={disabled} edge="end">
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={sx}
        {...props}
      />
    </>
  );
};

export default DatePicker;
