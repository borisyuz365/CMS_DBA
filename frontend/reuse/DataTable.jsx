import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SearchIcon from '@mui/icons-material/Search';

/**
 * DataTable - A comprehensive data table with filtering, pagination, and selection
 * 
 * @param {Object} props
 * @param {Array} props.data - Table data array
 * @param {Array} props.columns - Column configuration
 * @param {Function} props.onRowClick - Row click handler
 * @param {Function} props.onSelectionChange - Selection change handler
 * @param {Array} props.selectedRows - Currently selected rows
 * @param {boolean} props.selectable - Whether rows are selectable
 * @param {boolean} props.searchable - Whether table is searchable
 * @param {Array} props.filters - Available filters
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {Object} props.pagination - Pagination configuration
 * @param {Function} props.onPageChange - Page change handler
 * @param {Function} props.onRowsPerPageChange - Rows per page change handler
 * @param {Object} props.sx - Additional styling
 */
const DataTable = ({
  data = [],
  columns = [],
  onRowClick,
  onSelectionChange,
  selectedRows = [],
  selectable = true,
  searchable = true,
  filters = [],
  onFilterChange,
  pagination = { page: 0, rowsPerPage: 10, totalRows: 0 },
  onPageChange,
  onRowsPerPageChange,
  showPagination = true,
  sx = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({});

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        columns.some((column) => {
          const value = row[column.field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(filterValues).forEach(([field, value]) => {
      if (value) {
        filtered = filtered.filter((row) => {
          const rowValue = row[field];
          return rowValue && rowValue.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    return filtered;
  }, [data, searchTerm, filterValues, columns]);

  // Handle row selection
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filteredData.map((row) => row.id);
      onSelectionChange?.(newSelected);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (rowId) => {
    const newSelected = selectedRows.includes(rowId)
      ? selectedRows.filter((id) => id !== rowId)
      : [...selectedRows, rowId];
    onSelectionChange?.(newSelected);
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filterValues, [field]: value };
    setFilterValues(newFilters);
    onFilterChange?.(newFilters);
  };

  const isSelected = (rowId) => selectedRows.includes(rowId);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {/* Search and Filters */}
      {(searchable || filters.length > 0) && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ minWidth: 200 }}
            />
          )}
          
          {filters.map((filter) => (
            <FormControl key={filter.field} size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filterValues[filter.field] || ''}
                label={filter.label}
                onChange={(e) => handleFilterChange(filter.field, e.target.value)}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {filter.options?.map((option) => (
                  <MenuItem key={option.value || option} value={option.value || option}>
                    {option.label || option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Box>
      )}

      {/* Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          boxShadow: 1,
          flex: 1,
          minHeight: 0,
          overflow: 'auto'
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < filteredData.length}
                    checked={filteredData.length > 0 && selectedRows.length === filteredData.length}
                    onChange={handleSelectAll}
                    inputProps={{ 'aria-label': 'select all rows' }}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.field} sx={{ fontWeight: 700 }}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow
                key={row.id || index}
                hover
                selected={isSelected(row.id)}
                onClick={(e) => {
                  // If onRowClick is provided, use it
                  if (onRowClick) {
                    onRowClick(row);
                  } else if (selectable) {
                    // Otherwise, if selectable, toggle selection
                    handleSelectRow(row.id);
                  }
                }}
                sx={{ cursor: (onRowClick || selectable) ? 'pointer' : 'default' }}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      inputProps={{ 'aria-label': `select row ${row.id}` }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.field}>
                    {column.render ? column.render(row[column.field], row) : row[column.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && pagination.totalRows > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 0 || pagination.rowsPerPage >= pagination.totalRows}
              size="small"
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <span style={{ margin: '0 8px' }}>
              {pagination.rowsPerPage >= pagination.totalRows ? (
                `Showing all ${pagination.totalRows} results`
              ) : (
                `Page ${pagination.page + 1} of ${Math.ceil(pagination.totalRows / pagination.rowsPerPage) || 1}`
              )}
            </span>
            <IconButton
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.totalRows / pagination.rowsPerPage) - 1 || pagination.rowsPerPage >= pagination.totalRows}
              size="small"
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={pagination.rowsPerPage === pagination.totalRows ? 'all' : pagination.rowsPerPage}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all') {
                  onRowsPerPageChange?.(pagination.totalRows);
                } else {
                  onRowsPerPageChange?.(Number(value));
                }
                onPageChange?.(0); // Reset to first page when changing rows per page
              }}
            >
              {[10, 25, 50, 100].map((option) => (
                <MenuItem key={option} value={option}>
                  {option} / page
                </MenuItem>
              ))}
              <MenuItem value="all">
                All
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};

export default DataTable;

