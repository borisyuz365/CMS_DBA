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

  const filteredData = useMemo(() => {
    let filtered = data;
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        columns.some((col) => {
          const v = row[col.field];
          return v && String(v).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }
    Object.entries(filterValues).forEach(([field, value]) => {
      if (value) {
        filtered = filtered.filter((row) => {
          const v = row[field];
          return v && String(v).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    return filtered;
  }, [data, searchTerm, filterValues, columns]);

  const handleSelectAll = (e) => {
    if (e.target.checked) onSelectionChange?.(filteredData.map((r) => r.id));
    else onSelectionChange?.([]);
  };
  const handleSelectRow = (rowId) => {
    const next = selectedRows.includes(rowId) ? selectedRows.filter((id) => id !== rowId) : [...selectedRows, rowId];
    onSelectionChange?.(next);
  };
  const handleFilterChange = (field, value) => {
    const next = { ...filterValues, [field]: value };
    setFilterValues(next);
    onFilterChange?.(next);
  };
  const isSelected = (rowId) => selectedRows.includes(rowId);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {(searchable || filters.length > 0) && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              sx={{ minWidth: 200 }}
            />
          )}
          {filters.map((f) => (
            <FormControl key={f.field} size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{f.label}</InputLabel>
              <Select
                value={filterValues[f.field] || ''}
                label={f.label}
                onChange={(e) => handleFilterChange(f.field, e.target.value)}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {f.options?.map((opt) => (
                  <MenuItem key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Box>
      )}
      <TableContainer component={Paper} sx={{ boxShadow: 1, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < filteredData.length}
                    checked={filteredData.length > 0 && selectedRows.length === filteredData.length}
                    onChange={handleSelectAll}
                    inputProps={{ 'aria-label': 'select all' }}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.field} sx={{ fontWeight: 700 }}>{col.header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow
                key={row.id ?? idx}
                hover
                selected={isSelected(row.id)}
                onClick={() => (onRowClick ? onRowClick(row) : selectable && handleSelectRow(row.id))}
                sx={{ cursor: (onRowClick || selectable) ? 'pointer' : 'default' }}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ 'aria-label': `select row ${row.id}` }}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.field}>
                    {col.render ? col.render(row[col.field], row) : row[col.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
              {pagination.rowsPerPage >= pagination.totalRows
                ? `Showing all ${pagination.totalRows} results`
                : `Page ${pagination.page + 1} of ${Math.ceil(pagination.totalRows / pagination.rowsPerPage) || 1}`}
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
                const v = e.target.value;
                onRowsPerPageChange?.(v === 'all' ? pagination.totalRows : Number(v));
                onPageChange?.(0);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>{n} / page</MenuItem>
              ))}
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};

export default DataTable;
