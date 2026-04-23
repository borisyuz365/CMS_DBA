import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import PublicIcon from '@mui/icons-material/Public';
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
import { formatTimeZoneDisplay } from '../utils/formatTimeZone';
import api from '../services/api';

const DEFAULT_CREATE_FORM = {
  name: '',
  COUNTRY_CODE: '',
  TIME_ZONE_ID: 1,
  FATHER_COUNTRY_ID: '',
  IS_NOT_REAL: false,
  ALLOW_BETTING: true,
  EMOJI: '',
  CONNECT_BY_TEXT: false,
  ALLOW_PREMIUM_INSIGHTS: true,
  PHONE_CODE: '',
  ALLOW_BETS_IN_ALL_SCORES: true,
  LOGIN_AVAILABLE: true,
  MAIN_COLOR: 0,
  SECONDARY_COLOR: 0,
  BLOCK_LIVE_BETTING: false,
  CURRENCY_SYMBOL: '',
  MIN_USERS_FOR_MOST_POPULAR_BET: 100,
  MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: 50,
  ODDS_TYPE: 2,
  CONTINENT_ID: '',
};

function CountriesList() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const [urlState, setUrlState] = useUrlFilters({
    countryId: { type: 'string', default: '' },
    name: { type: 'string', default: '' },
    showDeleted: { type: 'boolean', default: false },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });

  const filters = { countryId: urlState.countryId, name: urlState.name };
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
  const [timeZones, setTimeZones] = useState([]);

  useEffect(() => {
    loadCountries();
    loadTermsAndCategories();
    loadTimeZones();
  }, []);

  const loadTimeZones = async () => {
    try {
      const list = await api.getTimeZonesList();
      setTimeZones(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load time zones:', err);
    }
  };

  const loadTermsAndCategories = async () => {
    try {
      const [terms, categories] = await Promise.all([api.getTerms(), api.getCategories()]);
      setAllTerms(terms || []);
      setAllCategories(categories || []);
    } catch (err) {
      console.warn('Failed to load terms/categories:', err);
    }
  };

  const loadCountries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCountries();
      setCountries(Array.isArray(data) ? data : []);
      setTotalRows((Array.isArray(data) ? data : []).length);
      setUrlState({ page: 0 });
    } catch (err) {
      console.error('Failed to load countries:', err);
      setError(err.message || 'Failed to load countries');
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...countries];
    if (!showDeleted) {
      list = list.filter((c) => !c.IS_DELETED);
    }
    if (filters.countryId && String(filters.countryId).trim()) {
      const id = parseInt(filters.countryId);
      if (!isNaN(id)) list = list.filter(c => c.COUNTRY_ID === id);
    }
    if (filters.name && String(filters.name).trim()) {
      const n = String(filters.name).trim().toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(n));
    }
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (!val || !String(val).trim()) return;
      const term = String(val).toLowerCase().trim();
      list = list.filter(row => {
        const v = row[field];
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return v === Number(term) || String(v).toLowerCase().includes(term);
        return String(v).toLowerCase().includes(term);
      });
    });
    if (sortConfig.field) {
      list.sort((a, b) => {
        const av = a[sortConfig.field];
        const bv = b[sortConfig.field];
        if (av == null) return 1;
        if (bv == null) return -1;
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (typeof av === 'string') return dir * (av.localeCompare(bv));
        return dir * (av - bv);
      });
    }
    return list;
  }, [countries, filters, columnFilters, sortConfig, showDeleted]);

  const groupedAndPaginated = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      return filteredAndSorted.slice(start, start + pagination.rowsPerPage).map(row => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSorted.forEach(row => {
      const k = String(row[groupByField] ?? 'Unknown');
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
      out.push({ type: 'group-header', groupKey: k, groupValue: groups[k][0][groupByField], count: groups[k].length, isExpanded: expandedGroups.has(k) });
      if (expandedGroups.has(k)) groups[k].forEach(r => out.push({ type: 'row', data: r }));
    });
    const start = pagination.page * pagination.rowsPerPage;
    return out.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

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
  const numberToHex = (num) => {
    if (num === null || num === undefined) return null;
    return `#${Number(num).toString(16).padStart(6, '0').toUpperCase()}`;
  };
  const hexToNumber = (hex) => {
    if (!hex || !String(hex).startsWith('#')) return null;
    return parseInt(String(hex).replace('#', ''), 16);
  };

  const handleFieldChange = (countryId, field, value) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      if (!next[countryId]) next[countryId] = {};
      if (field.includes('COLOR') && typeof value === 'string' && value.startsWith('#')) {
        next[countryId][field] = hexToNumber(value);
      } else {
        next[countryId][field] = value;
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setUrlState({ countryId: '', name: '', page: 0 });
    setColumnFilters({});
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
      await loadCountries();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadCountries();
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
        countryId: parseInt(id),
        changes: ch
      }));
      const result = await api.updateCountriesBulk(updates);
      const msg = result.errors?.length
        ? `Updated ${result.updated} country(s). ${result.errors.length} error(s).`
        : `Updated ${result.updated} country(s).`;
      setSnackbar({ open: true, message: msg, severity: result.errors?.length ? 'warning' : 'success' });
      setPendingChanges({});
      setIsEditMode(false);
      await loadCountries();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSorted.filter((r) => selectedRows.includes(r.COUNTRY_ID))
      : filteredAndSorted;
    if (rows.length === 0) {
      setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
      return;
    }
    const headers = Object.keys(rows[0] || {}).filter(
      (k) => rows[0][k] == null || (typeof rows[0][k] !== 'object' && typeof rows[0][k] !== 'function')
    );
    const lines = [headers.join(',')];
    rows.forEach((r) => {
      lines.push(
        headers
          .map((k) => {
            const v = r[k];
            if (v == null) return '';
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      );
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `countries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} country(ies)`, severity: 'success' });
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some((id) => {
      const c = countries.find((x) => x.COUNTRY_ID === id);
      return c?.IS_DELETED === true;
    });
  }, [selectedRows, countries]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select countries', severity: 'warning' });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Countries`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} country(ies)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreCountries(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} country(ies)`,
              severity: 'success',
            });
          } else {
            await api.deleteCountries(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} country(ies)`,
              severity: 'success',
            });
          }
          setSelectedRows([]);
          await loadCountries();
        } catch (err) {
          console.error(`Failed to ${actionText} countries:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} countries. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} countries`);
        } finally {
          setLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: null }));
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
    if (!createFormData.COUNTRY_CODE || !String(createFormData.COUNTRY_CODE).trim()) err.COUNTRY_CODE = 'Country code is required';
    setCreateFormErrors(err);
    return Object.keys(err).length === 0;
  };
  const handleCreateCountry = async () => {
    if (!validateCreate()) return;
    try {
      setLoading(true);
      setError(null);
      const nameTrimmed = String(createFormData.name).trim();
      const newTerm = await api.createTerm({
        category: 'Countries names',
        values: [
          { languageId: 1, value: nameTrimmed, isDefault: true, status: 'Approved' },
        ],
      });
      const payload = {
        name: nameTrimmed,
        NAME_ID: newTerm.id,
        COUNTRY_CODE: String(createFormData.COUNTRY_CODE).trim().toUpperCase().slice(0, 4),
        TIME_ZONE_ID: createFormData.TIME_ZONE_ID != null && createFormData.TIME_ZONE_ID !== '' ? Number(createFormData.TIME_ZONE_ID) : (timeZones[0]?.TIME_ZONE_ID ?? 1),
        FATHER_COUNTRY_ID: createFormData.FATHER_COUNTRY_ID === '' ? null : (Number(createFormData.FATHER_COUNTRY_ID) || null),
        IS_NOT_REAL: !!createFormData.IS_NOT_REAL,
        ALLOW_BETTING: createFormData.ALLOW_BETTING !== false,
        EMOJI: createFormData.EMOJI || null,
        CONNECT_BY_TEXT: !!createFormData.CONNECT_BY_TEXT,
        ALLOW_PREMIUM_INSIGHTS: createFormData.ALLOW_PREMIUM_INSIGHTS !== false,
        PHONE_CODE: createFormData.PHONE_CODE || null,
        ALLOW_BETS_IN_ALL_SCORES: createFormData.ALLOW_BETS_IN_ALL_SCORES !== false,
        LOGIN_AVAILABLE: createFormData.LOGIN_AVAILABLE !== false,
        MAIN_COLOR: Number(createFormData.MAIN_COLOR) || 0,
        SECONDARY_COLOR: Number(createFormData.SECONDARY_COLOR) || 0,
        BLOCK_LIVE_BETTING: !!createFormData.BLOCK_LIVE_BETTING,
        CURRENCY_SYMBOL: createFormData.CURRENCY_SYMBOL || null,
        MIN_USERS_FOR_MOST_POPULAR_BET: Number(createFormData.MIN_USERS_FOR_MOST_POPULAR_BET) || 100,
        MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: Number(createFormData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS) || 50,
        ODDS_TYPE: Number(createFormData.ODDS_TYPE) || 2,
        CONTINENT_ID: createFormData.CONTINENT_ID === '' ? null : (Number(createFormData.CONTINENT_ID) || null),
      };
      const created = await api.createCountry(payload);
      handleCloseCreateDialog();
      await loadCountries();
      setSnackbar({ open: true, message: 'Country created successfully', severity: 'success' });
      navigate(`/countries/${created.COUNTRY_ID}`);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create country', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: 'COUNTRY_ID', header: 'ID', width: 52 },
    {
      field: 'name',
      header: 'Name',
      width: 160,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={row.COUNTRY_IMAGE_URL || undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: row.COUNTRY_IMAGE_URL ? 'transparent' : '#1976d2',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          >
            <PublicIcon sx={{ fontSize: 18 }} />
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
    { field: 'COUNTRY_CODE', header: 'Code', width: 48 },
    { field: 'TIME_ZONE_ID', header: 'Time Zone', width: 195 },
    { field: 'ALLOW_BETTING', header: 'Betting', width: 52 },
    { field: 'FATHER_COUNTRY_ID', header: 'Father Country', width: 120 },
    { field: 'IS_NOT_REAL', header: 'Not Real', width: 52 },
    {
      field: 'MAIN_COLOR',
      header: 'Color',
      width: 110,
      render: (value, row) => {
        const mainHex = numberToHex(row.MAIN_COLOR);
        const secHex = numberToHex(row.SECONDARY_COLOR);
        const handleCopy = (hex, label) => {
          if (!hex) return;
          navigator.clipboard.writeText(hex).then(() => {
            setSnackbar({ open: true, message: `${label} color ${hex} copied to clipboard`, severity: 'success' });
          });
        };
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {mainHex ? (
              <Box
                onClick={(e) => { e.stopPropagation(); handleCopy(mainHex, 'Main'); }}
                sx={{
                  width: 28, height: 28, borderRadius: 1, border: '1px solid #ddd',
                  bgcolor: mainHex, flexShrink: 0, cursor: 'pointer',
                  '&:hover': { outline: '2px solid #1976d2', outlineOffset: 1 },
                }}
                title={`Main: ${mainHex}`}
              />
            ) : (
              <Box sx={{ width: 28, height: 28, borderRadius: 1, border: '1px dashed #ccc', flexShrink: 0 }} title="Main: none" />
            )}
            {secHex ? (
              <Box
                onClick={(e) => { e.stopPropagation(); handleCopy(secHex, 'Secondary'); }}
                sx={{
                  width: 28, height: 28, borderRadius: 1, border: '1px solid #ddd',
                  bgcolor: secHex, flexShrink: 0, cursor: 'pointer',
                  '&:hover': { outline: '2px solid #1976d2', outlineOffset: 1 },
                }}
                title={`Secondary: ${secHex}`}
              />
            ) : (
              <Box sx={{ width: 28, height: 28, borderRadius: 1, border: '1px dashed #ccc', flexShrink: 0 }} title="Secondary: none" />
            )}
          </Box>
        );
      },
    },
  ], [handleNameClick, numberToHex, setSnackbar]);

  if (loading && countries.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && countries.length === 0) {
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
          Countries List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Country
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Country ID"
              value={filters.countryId}
              onChange={(e) => setUrlState({ countryId: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  '& fieldset': { borderColor: '#E0E0E0' },
                  '&:hover fieldset': { borderColor: '#BDBDBD' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={filters.name}
              onChange={(e) => setUrlState({ name: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  '& fieldset': { borderColor: '#E0E0E0' },
                  '&:hover fieldset': { borderColor: '#BDBDBD' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={() => setUrlState({ page: 0 })}
              sx={{
                backgroundColor: '#1976d2',
                textTransform: 'none',
                height: '40px',
                borderRadius: '4px',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': { backgroundColor: '#1565c0', boxShadow: 'none' },
              }}
            >
              Search
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleClearFilters}
              sx={{
                backgroundColor: '#ffffff',
                borderColor: '#E0E0E0',
                color: '#000000',
                textTransform: 'none',
                height: '40px',
                fontWeight: 500,
                '&:hover': { backgroundColor: '#f5f5f5', borderColor: '#BDBDBD' },
              }}
            >
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showDeleted}
                  onChange={(e) => setUrlState({ showDeleted: e.target.checked })}
                  size="small"
                />
              }
              label="Show Deleted"
              sx={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                },
              }}
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
                    onChange={(e) => setSelectedRows(e.target.checked ? paginatedData.map(r => r.COUNTRY_ID) : [])}
                    size="small"
                  />
                </TableCell>
                {columns.map((col) => (
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
                    <Typography color="text.secondary">No countries match the current filters.</Typography>
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
                      key={row.COUNTRY_ID}
                      hover
                      onClick={() => !isEditMode && navigate(`/countries/${row.COUNTRY_ID}`)}
                      sx={{
                        cursor: isEditMode ? 'default' : 'pointer',
                        backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                        opacity: isDeleted && showDeleted ? 0.6 : 1,
                        '&:hover': {
                          backgroundColor: isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : undefined,
                        },
                        '&.Mui-selected': {
                          backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD',
                          '&:hover': {
                            backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD',
                          },
                        },
                        '& td': {
                          color: isDeleted && showDeleted ? '#999999' : 'inherit',
                        },
                      }}
                      selected={selectedRows.includes(row.COUNTRY_ID)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ borderColor: '#EAECF0' }}>
                        <Checkbox size="small" checked={selectedRows.includes(row.COUNTRY_ID)} onChange={(e) => {
                          e.stopPropagation();
                          setSelectedRows(s => e.target.checked ? [...s, row.COUNTRY_ID] : s.filter(id => id !== row.COUNTRY_ID));
                        }} />
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0', color: '#1976d2', fontWeight: 500, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (!isEditMode) navigate(`/countries/${row.COUNTRY_ID}`); }}>
                        {row.COUNTRY_ID}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }}>
                        {(columns.find(c => c.field === 'name')?.render && columns.find(c => c.field === 'name').render(row.name, row)) || (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PublicIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                            <Typography sx={{ fontSize: '0.875rem' }}>{row.name || '-'}</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }}>{row.COUNTRY_CODE || '-'}</TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }} onClick={(e) => isEditMode && e.stopPropagation()}>
                        {isEditMode ? (
                          <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
                            <Select
                              value={pendingChanges[row.COUNTRY_ID]?.TIME_ZONE_ID ?? row.TIME_ZONE_ID ?? ''}
                              onChange={(e) => handleFieldChange(row.COUNTRY_ID, 'TIME_ZONE_ID', e.target.value === '' ? null : Number(e.target.value))}
                              sx={{ height: 32, fontSize: '0.8125rem' }}
                            >
                              <MenuItem value="">—</MenuItem>
                              {timeZones.map((tz) => (
                                <MenuItem key={tz.TIME_ZONE_ID} value={tz.TIME_ZONE_ID}>
                                  {formatTimeZoneDisplay(tz)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (() => {
                          const tz = timeZones.find((t) => t.TIME_ZONE_ID === row.TIME_ZONE_ID);
                          return tz ? formatTimeZoneDisplay(tz) : (row.TIME_ZONE_ID ?? '-');
                        })()}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }} onClick={(e) => isEditMode && e.stopPropagation()}>
                        {isEditMode ? (
                          <Checkbox
                            size="small"
                            checked={!!(pendingChanges[row.COUNTRY_ID]?.ALLOW_BETTING ?? row.ALLOW_BETTING)}
                            onChange={(e) => handleFieldChange(row.COUNTRY_ID, 'ALLOW_BETTING', e.target.checked)}
                          />
                        ) : (row.ALLOW_BETTING ? 'Yes' : 'No')}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }}>
                        {row.FATHER_COUNTRY_ID != null
                          ? (countries.find(c => c.COUNTRY_ID === row.FATHER_COUNTRY_ID)?.name ?? String(row.FATHER_COUNTRY_ID))
                          : '-'}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }} onClick={(e) => isEditMode && e.stopPropagation()}>
                        {isEditMode ? (
                          <Checkbox
                            size="small"
                            checked={!!(pendingChanges[row.COUNTRY_ID]?.IS_NOT_REAL ?? row.IS_NOT_REAL)}
                            onChange={(e) => handleFieldChange(row.COUNTRY_ID, 'IS_NOT_REAL', e.target.checked)}
                          />
                        ) : (row.IS_NOT_REAL ? 'Yes' : 'No')}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#EAECF0' }}>
                        {(columns.find(c => c.field === 'MAIN_COLOR')?.render && columns.find(c => c.field === 'MAIN_COLOR').render(row.MAIN_COLOR, row)) ?? (row.MAIN_COLOR ?? '-')}
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
                '&:hover': {
                  borderColor: hasDeletedSelected ? '#45a049' : 'transparent',
                  backgroundColor: hasDeletedSelected ? '#f1f8f4' : '#c62828',
                },
                '&.Mui-disabled': {
                  backgroundColor: hasDeletedSelected ? '#ffffff' : '#cccccc',
                  color: hasDeletedSelected ? '#cccccc' : '#ffffff',
                },
              }}
            >
              {hasDeletedSelected ? 'Restore Countries' : 'Delete Countries'} ({selectedRows.length})
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
        <DialogTitle sx={{ fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif', fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>Create New Country</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Name" value={createFormData.name} onChange={(e) => handleCreateFormChange('name', e.target.value)} error={!!createFormErrors.name} helperText={createFormErrors.name} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Country Code" value={createFormData.COUNTRY_CODE} onChange={(e) => handleCreateFormChange('COUNTRY_CODE', e.target.value)} error={!!createFormErrors.COUNTRY_CODE} helperText={createFormErrors.COUNTRY_CODE} size="small" placeholder="e.g. US" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Zone</InputLabel>
                <Select
                  label="Time Zone"
                  value={createFormData.TIME_ZONE_ID ?? ''}
                  onChange={(e) => handleCreateFormChange('TIME_ZONE_ID', e.target.value === '' ? null : Number(e.target.value))}
                >
                  <MenuItem value="">—</MenuItem>
                  {timeZones.map((tz) => (
                    <MenuItem key={tz.TIME_ZONE_ID} value={tz.TIME_ZONE_ID}>
                      {formatTimeZoneDisplay(tz)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Country</InputLabel>
                <Select value={createFormData.FATHER_COUNTRY_ID || ''} label="Parent Country" onChange={(e) => handleCreateFormChange('FATHER_COUNTRY_ID', e.target.value)}>
                  <MenuItem value="">None</MenuItem>
                  {countries.map(c => (<MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>{c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Emoji" value={createFormData.EMOJI} onChange={(e) => handleCreateFormChange('EMOJI', e.target.value)} size="small" placeholder="🇺🇸" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone Code" value={createFormData.PHONE_CODE} onChange={(e) => handleCreateFormChange('PHONE_CODE', e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Currency Symbol" value={createFormData.CURRENCY_SYMBOL} onChange={(e) => handleCreateFormChange('CURRENCY_SYMBOL', e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={createFormData.ALLOW_BETTING} onChange={(e) => handleCreateFormChange('ALLOW_BETTING', e.target.checked)} />} label="Allow Betting" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={createFormData.BLOCK_LIVE_BETTING} onChange={(e) => handleCreateFormChange('BLOCK_LIVE_BETTING', e.target.checked)} />} label="Block Live Betting" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Min Users (Popular Bet)" value={createFormData.MIN_USERS_FOR_MOST_POPULAR_BET} onChange={(e) => handleCreateFormChange('MIN_USERS_FOR_MOST_POPULAR_BET', e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Min Users (Popular Options)" value={createFormData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS} onChange={(e) => handleCreateFormChange('MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS', e.target.value)} size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreateCountry} variant="contained" disabled={loading} sx={{ textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</MuiAlert>
      </Snackbar>

      {/* Confirmation Dialog - same style as AthletesList */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.onConfirm) {
                confirmDialog.onConfirm();
              }
            }}
            color="primary"
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
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
        initialCategory="Countries names"
      />
    </Box>
  );
}

export default CountriesList;
