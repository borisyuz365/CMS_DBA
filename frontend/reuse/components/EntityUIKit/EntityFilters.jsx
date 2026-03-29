import React from 'react';
import {
  Paper,
  Grid,
  TextField,
  Button,
  Autocomplete,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * EntityFilters - Reusable filter component for entity list pages
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter values { fieldName: value }
 * @param {Function} props.onFilterChange - Handler for filter changes (field, value) => void
 * @param {Function} props.onSearch - Handler for search button click
 * @param {Function} props.onClearFilters - Handler for clear filters button click
 * @param {boolean} props.showDeleted - Show deleted toggle state
 * @param {Function} props.onShowDeletedChange - Handler for show deleted toggle
 * @param {Array} props.filterConfig - Array of filter configurations:
 *   [
 *     {
 *       field: 'country',
 *       type: 'autocomplete-multiple', // 'autocomplete-multiple' | 'autocomplete' | 'text' | 'select'
 *       label: 'Country',
 *       options: [], // For autocomplete/select
 *       getOptionLabel: (option) => option.name, // For autocomplete
 *       getOptionValue: (option) => option.id, // For autocomplete
 *       xs: 12, // Grid breakpoints
 *       sm: 6,
 *       md: 2.4,
 *     }
 *   ]
 * @param {Object} props.sx - Additional styling
 */
const EntityFilters = ({
  filters = {},
  onFilterChange,
  onSearch,
  onClearFilters,
  showDeleted = false,
  onShowDeletedChange,
  filterConfig = [],
  sx = {},
}) => {
  const handleFilterChange = (field, value) => {
    onFilterChange?.(field, value);
  };

  const renderFilterField = (config) => {
    const { field, type, label, options = [], getOptionLabel, getOptionValue, ...gridProps } = config;

    switch (type) {
      case 'autocomplete-multiple':
        return (
          <Autocomplete
            multiple
            size="small"
            options={options}
            getOptionLabel={getOptionLabel || ((option) => option.name || option.label || String(option))}
            value={options.filter(opt => {
              const filterValue = filters[field] || [];
              const optValue = getOptionValue ? getOptionValue(opt) : (opt.id || opt.value || opt);
              return filterValue.includes(optValue) || filterValue.includes(String(optValue));
            })}
            onChange={(e, newValue) => {
              const values = newValue.map(opt => {
                return getOptionValue ? getOptionValue(opt) : (opt.id || opt.value || opt);
              });
              handleFilterChange(field, values);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#BDBDBD',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              />
            )}
            ListboxProps={{
              style: {
                maxHeight: '240px',
                overflow: 'auto',
              },
            }}
            sx={{
              '& .MuiAutocomplete-inputRoot': {
                fontSize: '0.875rem',
              },
            }}
          />
        );

      case 'autocomplete':
        return (
          <Autocomplete
            size="small"
            options={options}
            getOptionLabel={getOptionLabel || ((option) => option.name || option.label || String(option))}
            value={options.find(opt => {
              const filterValue = filters[field];
              const optValue = getOptionValue ? getOptionValue(opt) : (opt.id || opt.value || opt);
              return optValue === filterValue || String(optValue) === String(filterValue);
            }) || null}
            onChange={(e, newValue) => {
              const value = newValue ? (getOptionValue ? getOptionValue(newValue) : (newValue.id || newValue.value || newValue)) : '';
              handleFilterChange(field, value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#BDBDBD',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                }}
              />
            )}
            ListboxProps={{
              style: {
                maxHeight: '240px',
                overflow: 'auto',
              },
            }}
            sx={{
              '& .MuiAutocomplete-inputRoot': {
                fontSize: '0.875rem',
              },
            }}
          />
        );

      case 'text':
        return (
          <TextField
            size="small"
            label={label}
            value={filters[field] || ''}
            onChange={(e) => handleFilterChange(field, e.target.value)}
            sx={{
              backgroundColor: '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#E0E0E0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#BDBDBD',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff', ...sx }}>
      <Grid container spacing={2}>
        {/* Filter Fields */}
        {filterConfig.map((config) => (
          <Grid
            key={config.field}
            item
            xs={config.xs || 12}
            sm={config.sm || 6}
            md={config.md || 2.4}
          >
            {renderFilterField(config)}
          </Grid>
        ))}

        {/* Show Deleted Toggle */}
        {onShowDeletedChange && (
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControlLabel
              control={
                <Switch
                  checked={showDeleted}
                  onChange={(e) => onShowDeletedChange(e.target.checked)}
                  size="small"
                />
              }
              label="Show Deleted"
              sx={{ ml: 1 }}
            />
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            {onSearch && (
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={onSearch}
                sx={{
                  backgroundColor: '#1976d2',
                  textTransform: 'none',
                }}
              >
                Search
              </Button>
            )}
            {onClearFilters && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={onClearFilters}
                sx={{
                  textTransform: 'none',
                  borderColor: '#1976d2',
                  color: '#1976d2',
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default EntityFilters;
