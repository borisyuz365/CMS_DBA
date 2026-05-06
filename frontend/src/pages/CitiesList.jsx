import React, { useState, useEffect, useMemo } from 'react';
import useUrlFilters from '../hooks/useUrlFilters';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Snackbar,
  Alert as MuiAlert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

const DEFAULT_CREATE_FORM = {
  name: '',
  COUNTRY_ID: '',
};

function CitiesList() {
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const [urlState, setUrlState] = useUrlFilters({
    cityId: { type: 'string', default: '' },
    name: { type: 'string', default: '' },
    countryId: { type: 'string', default: '' },
    showDeleted: { type: 'boolean', default: false },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });

  const filters = { cityId: urlState.cityId, name: urlState.name, countryId: urlState.countryId };
  const showDeleted = urlState.showDeleted;
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage, totalRows };
  const sortConfig = { field: urlState.sortField || null, direction: urlState.sortDir };
  const groupByField = urlState.groupBy || null;

  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(DEFAULT_CREATE_FORM);
  const [createFormErrors, setCreateFormErrors] = useState({});

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadDropdownData().then(() => {
      if (window.location.search) handleSearch();
    });
  }, []);

  const loadDropdownData = async () => {
    try {
      const [countriesData, terms, categories] = await Promise.all([
        api.getCountries(),
        api.getTerms(),
        api.getCategories(),
      ]);
      setCountries(Array.isArray(countriesData) ? countriesData : []);
      setAllTerms(terms || []);
      setAllCategories(categories || []);
    } catch (err) {
      console.warn('Failed to load dropdown data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCitiesList({
        cityId: urlState.cityId || undefined,
        name: urlState.name || undefined,
        countryId: urlState.countryId || undefined,
      });
      setCities(Array.isArray(data) ? data : []);
      setTotalRows((Array.isArray(data) ? data : []).length);
      setUrlState({ page: 0 });
    } catch (err) {
      console.error('Failed to load cities:', err);
      setError(err.message || 'Failed to load cities');
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  const getCountryName = (countryId) => {
    if (countryId == null) return '-';
    const c = countries.find(x => x.COUNTRY_ID === countryId);
    return c ? c.name : String(countryId);
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...cities];
    if (!showDeleted) {
      list = list.filter(c => !c.IS_DELETED);
    }
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (!val || !String(val).trim()) return;
      const term = String(val).toLowerCase().trim();
      list = list.filter(row => {
        let v = row[field];
        if (field === 'COUNTRY_ID') {
          const countryName = getCountryName(v);
          return countryName.toLowerCase().includes(term) || String(v).includes(term);
        }
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return v === Number(term) || String(v).toLowerCase().includes(term);
        return String(v).toLowerCase().includes(term);
      });
    });
    if (sortConfig.field) {
      list.sort((a, b) => {
        let av = a[sortConfig.field];
        let bv = b[sortConfig.field];
        if (sortConfig.field === 'COUNTRY_ID') {
          av = getCountryName(av);
          bv = getCountryName(bv);
        }
        if (av == null) return 1;
        if (bv == null) return -1;
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (typeof av === 'string') return dir * av.localeCompare(bv);
        return dir * (av - bv);
      });
    }
    return list;
  }, [cities, columnFilters, sortConfig, showDeleted, countries]);

  const groupedAndPaginated = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      return filteredAndSorted.slice(start, start + pagination.rowsPerPage).map(row => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSorted.forEach(row => {
      let k = String(row[groupByField] ?? 'Unknown');
      if (groupByField === 'COUNTRY_ID') k = getCountryName(row[groupByField]);
      if (!groups[k]) groups[k] = [];
      groups[k].push(row);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      const an = Number(a), bn = Number(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    const out = [];
    keys.forEach(k => {
      out.push({ type: 'group-header', groupKey: k, groupValue: k, count: groups[k].length, isExpanded: expandedGroups.has(k) });
      if (expandedGroups.has(k)) groups[k].forEach(r => out.push({ type: 'row', data: r }));
    });
    const start = pagination.page * pagination.rowsPerPage;
    return out.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups, countries]);

  useEffect(() => {
    setTotalRows(filteredAndSorted.length);
  }, [filteredAndSorted.length]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    return filteredAndSorted.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, pagination.page, pagination.rowsPerPage]);

  const handleSort = (field) => {
    setUrlState(prev => ({ sortField: field, sortDir: prev.sortField === field && prev.sortDir === 'asc' ? 'desc' : 'asc' }));
  };
  const handleGroupBy = (field) => {
    if (groupByField === field) {
      setUrlState({ groupBy: '' });
      setExpandedGroups(new Set());
    } else {
      setUrlState({ groupBy: field });
      setExpandedGroups(new Set());
    }
  };
  const handleToggleGroup = (k) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const handleFieldChange = (cityId, field, value) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      if (!next[cityId]) next[cityId] = {};
      next[cityId][field] = value;
      return next;
    });
  };

  const handleClearFilters = () => {
    setUrlState({ cityId: '', name: '', countryId: '', page: 0 });
    setColumnFilters({});
    setCities([]);
    setTotalRows(0);
  };

  const handleNameClick = async (e, row) => {
    e.stopPropagation();
    if (!row || !row.NAME_ID) return;
    try {
      const term = await api.getTermById(row.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setError('Failed to load term for editing');
    }
  };

  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await handleSearch();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await handleSearch();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const newCategory = await api.createCategory(categoryData);
      const categories = await api.getCategories();
      setAllCategories(categories);
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      throw err;
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const updates = Object.entries(pendingChanges).map(([id, ch]) => ({
        cityId: parseInt(id),
        changes: ch
      }));
      const result = await api.updateCitiesBulk(updates);
      const msg = result.errors?.length
        ? `Updated ${result.updated} city(ies). ${result.errors.length} error(s).`
        : `Updated ${result.updated} city(ies).`;
      setSnackbar({ open: true, message: msg, severity: result.errors?.length ? 'warning' : 'success' });
      setPendingChanges({});
      setIsEditMode(false);
      await handleSearch();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSorted.filter(r => selectedRows.includes(r.CITY_ID))
      : filteredAndSorted;
    if (rows.length === 0) {
      setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
      return;
    }
    const headers = Object.keys(rows[0] || {}).filter(
      k => rows[0][k] == null || (typeof rows[0][k] !== 'object' && typeof rows[0][k] !== 'function')
    );
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push(
        headers.map(k => {
          const v = r[k];
          if (v == null) return '';
          const s = String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      );
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cities_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} city(ies)`, severity: 'success' });
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some(id => {
      const c = cities.find(x => x.CITY_ID === id);
      return c?.IS_DELETED === true;
    });
  }, [selectedRows, cities]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select cities', severity: 'warning' });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Cities`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} city(ies)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreCities(selectedRows);
            setSnackbar({ open: true, message: `Successfully restored ${selectedRows.length} city(ies)`, severity: 'success' });
          } else {
            await api.deleteCities(selectedRows);
            setSnackbar({ open: true, message: `Successfully deleted ${selectedRows.length} city(ies)`, severity: 'success' });
          }
          setSelectedRows([]);
          await handleSearch();
        } catch (err) {
          console.error(`Failed to ${actionText} cities:`, err);
          setSnackbar({ open: true, message: `Failed to ${actionText} cities. Please try again.`, severity: 'error' });
          setError(err.message || `Failed to ${actionText} cities`);
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog(prev => ({ ...prev, open: false, onConfirm: null }));
  };

  const handleToggleEditMode = () => {
    if (isEditMode && Object.keys(pendingChanges).length > 0 && !window.confirm('Discard unsaved changes?')) return;
    if (isEditMode) {
      setPendingChanges({});
    }
    setIsEditMode(!isEditMode);
  };

  const handleOpenCreateDialog = () => {
    setCreateFormData(DEFAULT_CREATE_FORM);
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData(DEFAULT_CREATE_FORM);
    setCreateFormErrors({});
  };
  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
    if (createFormErrors[field]) setCreateFormErrors(prev => ({ ...prev, [field]: undefined }));
  };
  const validateCreate = () => {
    const err = {};
    if (!createFormData.name || !String(createFormData.name).trim()) err.name = 'Name is required';
    setCreateFormErrors(err);
    return Object.keys(err).length === 0;
  };
  const handleCreateCity = async () => {
    if (!validateCreate()) return;
    try {
      setLoading(true);
      setError(null);
      const nameTrimmed = String(createFormData.name).trim();
      const newTerm = await api.createTerm({
        category: 'Cities',
        values: [
          { languageId: 1, value: nameTrimmed, isDefault: true, status: 'Approved' },
        ],
      });
      const payload = {
        CITY_NAME: nameTrimmed,
        NAME_ID: newTerm.id,
        COUNTRY_ID: createFormData.COUNTRY_ID === '' ? null : Number(createFormData.COUNTRY_ID),
      };
      await api.createCity(payload);
      handleCloseCreateDialog();
      await handleSearch();
      setSnackbar({ open: true, message: 'City created successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create city', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: 'CITY_ID', header: 'ID', width: 60 },
    {
      field: 'CITY_NAME',
      header: 'Name',
      width: 220,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: '#1976d2',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          >
            <LocationCityIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography
            sx={{
              color: row.NAME_ID ? '#1976d2' : 'inherit',
              cursor: row.NAME_ID ? 'pointer' : 'default',
              fontSize: '0.875rem',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 400,
              '&:hover': row.NAME_ID ? { textDecoration: 'underline' } : {},
            }}
            onClick={row.NAME_ID ? (e) => handleNameClick(e, row) : undefined}
          >
            {value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'COUNTRY_ID',
      header: 'Country',
      width: 180,
    },
  ], [handleNameClick]);

  if (loading && cities.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && cities.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000', fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif' }}>
          Cities List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create City
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="City ID"
              value={filters.cityId}
              onChange={(e) => setUrlState({ cityId: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffffff', '& fieldset': { borderColor: '#E0E0E0' }, '&:hover fieldset': { borderColor: '#BDBDBD' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="Name"
              value={filters.name}
              onChange={(e) => setUrlState({ name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffffff', '& fieldset': { borderColor: '#E0E0E0' }, '&:hover fieldset': { borderColor: '#BDBDBD' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Country</InputLabel>
              <Select
                label="Country"
                value={filters.countryId}
                onChange={(e) => setUrlState({ countryId: e.target.value })}
                sx={{ backgroundColor: '#ffffff' }}
              >
                <MenuItem value="">All</MenuItem>
                {countries
                  .filter(c => !c.IS_DELETED)
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(c => (
                    <MenuItem key={c.COUNTRY_ID} value={String(c.COUNTRY_ID)}>
                      {c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="contained" fullWidth startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: '40px', borderRadius: '4px', fontWeight: 500, boxShadow: 'none', '&:hover': { backgroundColor: '#1565c0', boxShadow: 'none' } }}
            >
              Search
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="outlined" fullWidth onClick={handleClearFilters}
              sx={{ backgroundColor: '#ffffff', borderColor: '#E0E0E0', color: '#000000', textTransform: 'none', height: '40px', fontWeight: 500, '&:hover': { backgroundColor: '#f5f5f5', borderColor: '#BDBDBD' } }}
            >
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <FormControlLabel
              control={<Switch checked={showDeleted} onChange={(e) => setUrlState({ showDeleted: e.target.checked })} size="small" />}
              label="Show Deleted"
              sx={{ height: '40px', display: 'flex', alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#ffffff' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { borderColor: '#EAECF0', fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#fff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12, py: 1, px: 1.5 } }}>
                <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                    onChange={(e) => setSelectedRows(e.target.checked ? paginatedData.map(r => r.CITY_ID) : [])}
                    size="small"
                  />
                </TableCell>
                {columns.map(col => (
                  <TableCell key={col.field} sx={{ borderColor: '#EAECF0', width: col.width, minWidth: col.width }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{col.header}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleGroupBy(col.field)} title={groupByField === col.field ? 'Ungroup' : 'Group'}>
                            <ViewListIcon sx={{ fontSize: 12, color: groupByField === col.field ? '#1976d2' : '#ccc' }} />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0 }} onClick={() => handleSort(col.field)}>
                            <ArrowUpwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'asc' ? '#1976d2' : '#ccc' }} />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0 }} onClick={() => handleSort(col.field)}>
                            <ArrowDownwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'desc' ? '#1976d2' : '#ccc' }} />
                          </IconButton>
                        </Box>
                      </Box>
                      <TextField size="small" placeholder="Filter" value={columnFilters[col.field] || ''} onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                        sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.8125rem', bgcolor: '#F9FAFB' } }} />
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedAndPaginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                    <Typography color="text.secondary">No cities match the current filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                groupedAndPaginated.map((item, idx) => {
                  if (item.type === 'group-header') {
                    return (
                      <TableRow key={`gh-${item.groupKey}-${idx}`} sx={{ bgcolor: '#F5F5F5', '& td': { borderColor: '#EAECF0', fontWeight: 600 } }}
                        onClick={() => handleToggleGroup(item.groupKey)}>
                        <TableCell colSpan={columns.length + 1} sx={{ cursor: 'pointer', borderColor: '#EAECF0' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {item.isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                            <Typography sx={{ fontWeight: 600 }}>{groupByField}: {item.groupValue ?? 'Unknown'}</Typography>
                            <Typography variant="caption" color="text.secondary">({item.count})</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const row = item.data;
                  const isDeleted = row.IS_DELETED === true;
                  return (
                    <TableRow
                      key={row.CITY_ID}
                      hover
                      sx={{
                        cursor: 'default',
                        backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                        opacity: isDeleted && showDeleted ? 0.6 : 1,
                        '&:hover': { backgroundColor: isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : undefined },
                        '&.Mui-selected': { backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD', '&:hover': { backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD' } },
                        '& td': { color: isDeleted && showDeleted ? '#999999' : 'inherit' },
                      }}
                      selected={selectedRows.includes(row.CITY_ID)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ borderColor: '#EAECF0' }}>
                        <Checkbox size="small" checked={selectedRows.includes(row.CITY_ID)} onChange={(e) => {
                          e.stopPropagation();
                          setSelectedRows(s => e.target.checked ? [...s, row.CITY_ID] : s.filter(id => id !== row.CITY_ID));
                        }} />
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0', color: '#1976d2', fontWeight: 500 }}>
                        {row.CITY_ID}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }}>
                        {columns.find(c => c.field === 'CITY_NAME')?.render(row.CITY_NAME, row)}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }} onClick={(e) => isEditMode && e.stopPropagation()}>
                        {isEditMode ? (
                          <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
                            <Select
                              value={pendingChanges[row.CITY_ID]?.COUNTRY_ID ?? row.COUNTRY_ID ?? ''}
                              onChange={(e) => handleFieldChange(row.CITY_ID, 'COUNTRY_ID', e.target.value === '' ? null : Number(e.target.value))}
                              sx={{ height: 32, fontSize: '0.8125rem' }}
                            >
                              <MenuItem value="">—</MenuItem>
                              {countries
                                .filter(c => !c.IS_DELETED)
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map(c => (
                                  <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>
                                    {c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        ) : getCountryName(row.COUNTRY_ID)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 2, borderTop: '1px solid #EAECF0', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button variant={isEditMode ? 'contained' : 'outlined'} startIcon={isEditMode ? <CancelIcon /> : <EditIcon />} onClick={handleToggleEditMode}
              sx={{ borderColor: '#E0E0E0', bgcolor: isEditMode ? '#1976d2' : '#fff', color: isEditMode ? '#fff' : '#000', textTransform: 'none' }}>
              {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {isEditMode && (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveChanges} disabled={Object.keys(pendingChanges).length === 0}
                sx={{ bgcolor: '#4caf50', textTransform: 'none', '&:hover': { bgcolor: '#45a049' }, '&.Mui-disabled': { bgcolor: '#ccc' } }}>
                Save ({Object.keys(pendingChanges).length})
              </Button>
            )}
            <Button
              variant={hasDeletedSelected ? 'outlined' : 'contained'}
              startIcon={hasDeletedSelected ? <RestoreIcon /> : <DeleteIcon />}
              onClick={handleDeleteOrRestore}
              disabled={selectedRows.length === 0}
              sx={{
                borderColor: hasDeletedSelected ? '#4caf50' : 'transparent',
                backgroundColor: hasDeletedSelected ? '#ffffff' : '#d32f2f',
                color: hasDeletedSelected ? '#4caf50' : '#fff',
                textTransform: 'none',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontWeight: 500,
                '&:hover': { borderColor: hasDeletedSelected ? '#45a049' : 'transparent', backgroundColor: hasDeletedSelected ? '#f1f8f4' : '#c62828' },
                '&.Mui-disabled': { backgroundColor: hasDeletedSelected ? '#ffffff' : '#cccccc', color: hasDeletedSelected ? '#cccccc' : '#ffffff' },
              }}
            >
              {hasDeletedSelected ? 'Restore Cities' : 'Delete Cities'} ({selectedRows.length})
            </Button>
            <Button variant="outlined" onClick={handleExportCsv} sx={{ borderColor: '#E0E0E0', color: '#000', textTransform: 'none' }}>
              Export to CSV ({selectedRows.length})
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Items per page:</Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select value={pagination.rowsPerPage} onChange={(e) => setUrlState({ rowsPerPage: Number(e.target.value), page: 0 })}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2">
              {pagination.page * pagination.rowsPerPage + 1}-{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton size="small" onClick={() => setUrlState(p => ({ page: p.page - 1 }))} disabled={pagination.page === 0}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setUrlState(p => ({ page: p.page + 1 }))} disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows}>
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif', fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>Create New City</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth required label="City Name" value={createFormData.name} onChange={(e) => handleCreateFormChange('name', e.target.value)} error={!!createFormErrors.name} helperText={createFormErrors.name} size="small" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select
                  label="Country"
                  value={createFormData.COUNTRY_ID}
                  onChange={(e) => handleCreateFormChange('COUNTRY_ID', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {countries
                    .filter(c => !c.IS_DELETED)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(c => (
                      <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>
                        {c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreateCity} variant="contained" disabled={loading} sx={{ textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</MuiAlert>
      </Snackbar>

      <Dialog open={confirmDialog.open} onClose={handleConfirmDialogClose}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="inherit">Cancel</Button>
          <Button onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); }} color="primary" variant="contained" autoFocus>Confirm</Button>
        </DialogActions>
      </Dialog>

      <TermEditModal
        open={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSaveAndUpdate}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Cities"
      />
    </Box>
  );
}

export default CitiesList;
