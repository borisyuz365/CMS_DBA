import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Avatar,
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
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import RadarIcon from '@mui/icons-material/Radar';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import api from '../services/api';
import useUrlFilters from '../hooks/useUrlFilters';

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const QUICK_ACTION_META = {
  Restart:          { label: 'Restart',           icon: <RefreshIcon sx={{ fontSize: 16 }} />,       color: '#1976d2', needsConfirm: true },
  ClearQueue:       { label: 'Clear Queue',        icon: <DeleteSweepIcon sx={{ fontSize: 16 }} />,   color: '#e53935', needsConfirm: true },
  ScanAthletes:     { label: 'Scan Athletes',      icon: <PersonIcon sx={{ fontSize: 16 }} />,        color: '#616161', needsConfirm: false },
  ScanCompetitions: { label: 'Scan Competitions',  icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />,   color: '#616161', needsConfirm: false },
};

function ScannersListV2() {
  const navigate = useNavigate();
  const [scanners, setScanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);

  const [urlState, setUrlState] = useUrlFilters({
    scannerId: { type: 'string', default: '' },
    scannerName: { type: 'string', default: '' },
    environment: { type: 'string', default: '' },
    sport: { type: 'string', default: '' },
    showDeleted: { type: 'boolean', default: false },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });

  const filters = {
    scannerId: urlState.scannerId,
    scannerName: urlState.scannerName,
    environment: urlState.environment,
    sport: urlState.sport,
  };
  const showDeleted = urlState.showDeleted;
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage, totalRows };
  const sortConfig = { field: urlState.sortField || null, direction: urlState.sortDir };
  const groupByField = urlState.groupBy || null;

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    SCANNER_NAME: '',
    DESCRIPTION: '',
    DATA_SOURCE_NAME: '',
    SPORT: '',
    ENVIRONMENT: 'prod',
    IS_ACTIVE: true,
    SCAN_INTERVAL_SECONDS: 30,
  });
  const [createFormErrors, setCreateFormErrors] = useState({});

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadScanners();
  }, []);

  const loadScanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScannersList();
      setScanners(Array.isArray(data) ? data : []);
      setTotalRows((data || []).length);
      setUrlState({ page: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load scanners');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnFilterChange = (columnField, value) => {
    setColumnFilters((prev) => ({ ...prev, [columnField]: value }));
  };

  const filteredAndSortedScanners = useMemo(() => {
    let filtered = [...scanners];
    if (!showDeleted) {
      filtered = filtered.filter((s) => !s.IS_DELETED);
    }

    Object.keys(columnFilters).forEach((columnField) => {
      const filterValue = columnFilters[columnField];
      if (filterValue && filterValue.trim() !== '') {
        const searchTerm = filterValue.toLowerCase().trim();
        filtered = filtered.filter((row) => {
          const cellValue = row[columnField];
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(searchTerm);
        });
      }
    });

    if (filters.scannerId) {
      filtered = filtered.filter((s) => String(s.SCANNER_ID) === String(filters.scannerId));
    }
    if (filters.scannerName && filters.scannerName.trim()) {
      const term = filters.scannerName.toLowerCase().trim();
      filtered = filtered.filter((s) => (s.SCANNER_NAME || '').toLowerCase().includes(term));
    }
    if (filters.environment) {
      filtered = filtered.filter((s) => s.ENVIRONMENT === filters.environment);
    }
    if (filters.sport && filters.sport.trim()) {
      const term = filters.sport.toLowerCase().trim();
      filtered = filtered.filter((s) => (s.SPORT || '').toLowerCase().includes(term));
    }

    if (sortConfig.field) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return filtered;
  }, [scanners, columnFilters, sortConfig, filters, showDeleted]);

  const groupedAndPaginatedData = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSortedScanners.slice(start, end).map((row) => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSortedScanners.forEach((row) => {
      const groupValue = row[groupByField] ?? 'Unknown';
      const groupKey = String(groupValue);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(row);
    });
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      const aNum = Number(a), bNum = Number(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
    const result = [];
    sortedGroups.forEach((groupKey) => {
      const isExpanded = expandedGroups.has(groupKey);
      result.push({ type: 'group-header', groupValue: groups[groupKey][0][groupByField], groupKey, count: groups[groupKey].length, isExpanded });
      if (isExpanded) {
        groups[groupKey].forEach((row) => result.push({ type: 'row', data: row }));
      }
    });
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return result.slice(start, end);
  }, [filteredAndSortedScanners, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  useEffect(() => {
    setTotalRows(filteredAndSortedScanners.length);
    setUrlState({ page: 0 });
  }, [filteredAndSortedScanners.length]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSortedScanners.slice(start, end);
  }, [filteredAndSortedScanners, pagination.page, pagination.rowsPerPage]);

  const handleFilterChange = (field, value) => setUrlState({ [field]: value });
  const handleSearch = () => loadScanners();
  const handleClearFilters = () => {
    setUrlState({ scannerId: '', scannerName: '', environment: '', sport: '' });
    setColumnFilters({});
  };

  const handleSort = (field) => {
    setUrlState((prev) => ({
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === 'asc' ? 'desc' : 'asc',
    }));
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

  const handleToggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handlePageChange = (newPage) => setUrlState({ page: newPage });
  const handleRowsPerPageChange = (newRowsPerPage) => setUrlState({ rowsPerPage: newRowsPerPage, page: 0 });

  const handleFieldChange = (scannerId, field, value) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (!next[scannerId]) next[scannerId] = {};
      next[scannerId][field] = value;
      return next;
    });
  };

  const handleToggleEditMode = () => {
    if (isEditMode && Object.keys(pendingChanges).length > 0) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setPendingChanges({});
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(!isEditMode);
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
      const updates = Object.entries(pendingChanges).map(([scannerId, changes]) => ({
        scannerId: parseInt(scannerId, 10),
        changes,
      }));
      const result = await api.updateScannersBulk(updates);
      const msg = result.errors && result.errors.length > 0
        ? `Updated ${result.updated} scanner(s). ${result.errors.length} error(s).`
        : `Updated ${result.updated} scanner(s).`;
      setSnackbar({ open: true, message: msg, severity: result.errors?.length ? 'warning' : 'success' });
      setPendingChanges({});
      setIsEditMode(false);
      await loadScanners();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateFormData({ SCANNER_NAME: '', DESCRIPTION: '', DATA_SOURCE_NAME: '', SPORT: '', ENVIRONMENT: 'prod', IS_ACTIVE: true, SCAN_INTERVAL_SECONDS: 30 });
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormErrors({});
  };

  const handleCreateFormChange = (field, value) => {
    setCreateFormData((prev) => ({ ...prev, [field]: value }));
    if (createFormErrors[field]) {
      setCreateFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createFormData.SCANNER_NAME || !createFormData.SCANNER_NAME.trim()) {
      errors.SCANNER_NAME = 'Scanner name is required';
    }
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateScanner = async () => {
    if (!validateCreateForm()) return;
    try {
      setLoading(true);
      setError(null);
      const newScanner = await api.createScanner({
        ...createFormData,
        SCANNER_NAME: createFormData.SCANNER_NAME.trim(),
        SCAN_INTERVAL_SECONDS: Number(createFormData.SCAN_INTERVAL_SECONDS) || 30,
      });
      handleCloseCreateDialog();
      await loadScanners();
      setSnackbar({ open: true, message: 'Scanner created successfully', severity: 'success' });
      navigate(`/scanners-v2/${newScanner.SCANNER_ID}`);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create scanner', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some((id) => {
      const s = scanners.find((x) => x.SCANNER_ID === id);
      return s?.IS_DELETED === true;
    });
  }, [selectedRows, scanners]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select scanners', severity: 'warning' });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Scanners`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} scanner(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreScanners(selectedRows);
            setSnackbar({ open: true, message: `Successfully restored ${selectedRows.length} scanner(s)`, severity: 'success' });
          } else {
            await api.deleteScanners(selectedRows);
            setSnackbar({ open: true, message: `Successfully deleted ${selectedRows.length} scanner(s)`, severity: 'success' });
          }
          setSelectedRows([]);
          await loadScanners();
        } catch (err) {
          setSnackbar({ open: true, message: `Failed to ${actionText} scanners. Please try again.`, severity: 'error' });
          setError(err.message || `Failed to ${actionText} scanners`);
        } finally {
          setLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleConfirmDialogClose = () => setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: null }));

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSortedScanners.filter((r) => selectedRows.includes(r.SCANNER_ID))
      : filteredAndSortedScanners;
    if (rows.length === 0) {
      setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
      return;
    }
    const exclude = new Set(['AVAILABLE_ACTIONS']);
    const headers = Object.keys(rows[0] || {}).filter((k) => !exclude.has(k));
    const lines = [headers.join(',')];
    rows.forEach((r) => {
      lines.push(
        headers.map((k) => {
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
    a.download = `scanners_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} scanner(s)`, severity: 'success' });
  };

  const handleSnackbarClose = (e, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleRowAction = (e, row, actionName) => {
    e.stopPropagation();
    const meta = QUICK_ACTION_META[actionName];
    if (!meta) return;
    const fire = async () => {
      try {
        await api.performScannerAction(row.SCANNER_ID, actionName, {});
        setSnackbar({ open: true, message: `${meta.label} submitted for "${row.SCANNER_NAME}"`, severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: err.message || `${meta.label} failed`, severity: 'error' });
      }
    };
    if (meta.needsConfirm) {
      setConfirmDialog({
        open: true,
        title: meta.label,
        message: actionName === 'ClearQueue'
          ? `Clear the queue for "${row.SCANNER_NAME}"? Pending messages will be discarded.`
          : `${meta.label} "${row.SCANNER_NAME}"?`,
        onConfirm: fire,
      });
    } else {
      fire();
    }
  };

  const columns = useMemo(
    () => [
      {
        field: 'SCANNER_ID',
        header: 'ID',
        width: 70,
        render: (value) => (
          <Typography
            sx={{ color: '#1976d2', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', '&:hover': { textDecoration: 'underline' } }}
            onClick={(e) => { e.stopPropagation(); navigate(`/scanners-v2/${value}`); }}
          >
            {value}
          </Typography>
        ),
      },
      {
        field: 'SCANNER_NAME',
        header: 'Name',
        render: (value, row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={row.SCANNER_IMAGE_URL || undefined}
              sx={{ width: 32, height: 32, bgcolor: row.SCANNER_IMAGE_URL ? 'transparent' : '#1976d2', borderRadius: '50%' }}
            >
              <RadarIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Typography
              sx={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 400, '&:hover': { textDecoration: 'underline' } }}
              onClick={(e) => { e.stopPropagation(); navigate(`/scanners-v2/${row.SCANNER_ID}`); }}
            >
              {value || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'DATA_SOURCE_NAME',
        header: 'Data Source',
        width: '12ch',
        render: (value) => value ?? '-',
      },
      {
        field: 'SPORT',
        header: 'Sport',
        width: '11ch',
        render: (value) => value ?? '-',
      },
      {
        field: 'ENVIRONMENT',
        header: 'Environment',
        width: 100,
        render: (value) => (
          <Typography
            sx={{
              display: 'inline-block', px: 1, py: 0.25, borderRadius: 1,
              fontSize: '0.75rem', fontWeight: 600,
              bgcolor: value === 'prod' ? '#fce4ec' : '#e3f2fd',
              color: value === 'prod' ? '#c62828' : '#1565c0',
            }}
          >
            {value || '-'}
          </Typography>
        ),
      },
      {
        field: 'IS_ACTIVE',
        header: 'Active',
        width: 80,
        render: (value, row) => {
          if (isEditMode) {
            const v = pendingChanges[row.SCANNER_ID]?.IS_ACTIVE ?? value;
            return (
              <FormControlLabel
                control={<Checkbox size="small" checked={!!v} onChange={(e) => handleFieldChange(row.SCANNER_ID, 'IS_ACTIVE', e.target.checked)} />}
                label=""
              />
            );
          }
          return value ? 'Yes' : 'No';
        },
      },
      {
        field: 'SCAN_INTERVAL_SECONDS',
        header: 'Scan Interval (s)',
        width: 110,
        render: (value, row) => {
          if (isEditMode) {
            const v = pendingChanges[row.SCANNER_ID]?.SCAN_INTERVAL_SECONDS ?? value;
            return (
              <TextField
                size="small" type="number" value={v ?? ''}
                onChange={(e) => handleFieldChange(row.SCANNER_ID, 'SCAN_INTERVAL_SECONDS', e.target.value === '' ? null : Number(e.target.value))}
                sx={{ width: 80, '& .MuiInputBase-root': { height: 28, fontSize: '0.8125rem' } }}
                onClick={(e) => e.stopPropagation()}
              />
            );
          }
          return value ?? '-';
        },
      },
      {
        field: 'LAST_MESSAGE_SENT',
        header: 'Last Message',
        width: '18ch',
        render: (value) => formatTs(value),
      },
      {
        field: '_actions',
        header: 'Actions',
        noControls: true,
        render: (_, row) => {
          const available = (row.AVAILABLE_ACTIONS || []).filter((a) => QUICK_ACTION_META[a]);
          if (available.length === 0) return null;
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
              {available.map((actionName) => {
                const meta = QUICK_ACTION_META[actionName];
                return (
                  <Tooltip key={actionName} title={meta.label}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleRowAction(e, row, actionName)}
                      sx={{ color: meta.color, p: 0.5, '&:hover': { bgcolor: `${meta.color}14` } }}
                    >
                      {meta.icon}
                    </IconButton>
                  </Tooltip>
                );
              })}
            </Box>
          );
        },
      },
    ],
    [isEditMode, pendingChanges, handleRowAction]
  );

  if (loading && scanners.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
          Scanners
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Scanner
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={1.6}>
            <TextField
              fullWidth size="small" label="Scanner ID" value={filters.scannerId}
              onChange={(e) => handleFilterChange('scannerId', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffffff', '& fieldset': { borderColor: '#E0E0E0' }, '&:hover fieldset': { borderColor: '#BDBDBD' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth size="small" label="Scanner Name" value={filters.scannerName}
              onChange={(e) => handleFilterChange('scannerName', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffffff', '& fieldset': { borderColor: '#E0E0E0' }, '&:hover fieldset': { borderColor: '#BDBDBD' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.6}>
            <FormControl fullWidth size="small">
              <InputLabel>Environment</InputLabel>
              <Select label="Environment" value={filters.environment} onChange={(e) => handleFilterChange('environment', e.target.value)} sx={{ backgroundColor: '#ffffff' }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="prod">prod</MenuItem>
                <MenuItem value="qa">qa</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.6}>
            <TextField
              fullWidth size="small" label="Sport" value={filters.sport}
              onChange={(e) => handleFilterChange('sport', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffffff', '& fieldset': { borderColor: '#E0E0E0' }, '&:hover fieldset': { borderColor: '#BDBDBD' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <Button
              variant="contained" fullWidth startIcon={<SearchIcon />} onClick={handleSearch}
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
              sx={{ height: '40px', display: 'flex', alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#ffffff' }}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: '#EAECF0' }, '& .MuiTableHead-root': { position: 'sticky', top: 0, zIndex: 11 } }}>
              <TableHead>
                <TableRow sx={{ position: 'sticky', top: 0, zIndex: 11 }}>
                  <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12 }}>
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={(e) => (e.target.checked ? setSelectedRows(paginatedData.map((r) => r.SCANNER_ID)) : setSelectedRows([]))}
                      sx={{ padding: '4px' }}
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        backgroundColor: '#ffffff', borderColor: '#EAECF0', padding: '12px 16px',
                        verticalAlign: 'top', position: 'sticky', top: 0, zIndex: 12, whiteSpace: 'nowrap',
                        ...(col.width && { minWidth: col.width }),
                      }}
                    >
                      {col.noControls ? (
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000' }}>{col.header}</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', whiteSpace: 'nowrap' }}>{col.header}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => handleGroupBy(col.field)} sx={{ p: 0.5 }} title={groupByField === col.field ? 'Remove grouping' : 'Group by'}>
                                <ViewListIcon sx={{ fontSize: 12, color: groupByField === col.field ? '#1976d2' : '#cccccc' }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleSort(col.field)}><ArrowUpwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'asc' ? '#1976d2' : '#cccccc' }} /></IconButton>
                              <IconButton size="small" onClick={() => handleSort(col.field)}><ArrowDownwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'desc' ? '#1976d2' : '#cccccc' }} /></IconButton>
                            </Box>
                          </Box>
                          <TextField
                            size="small" placeholder="Filter" value={columnFilters[col.field] || ''}
                            onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                            sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem', backgroundColor: '#F9FAFB' } }}
                          />
                        </Box>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAndPaginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                      <Typography color="text.secondary">
                        {scanners.length === 0 ? 'No scanners found. Click "Create Scanner" to add one.' : 'No rows match the current filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedAndPaginatedData.map((item, index) => {
                    if (item.type === 'group-header') {
                      const col = columns.find((c) => c.field === groupByField);
                      return (
                        <TableRow key={`group-${item.groupKey}-${index}`} sx={{ backgroundColor: '#F5F5F5', '& td': { borderColor: '#EAECF0', fontWeight: 600 } }}>
                          <TableCell colSpan={columns.length + 1} sx={{ cursor: 'pointer' }} onClick={() => handleToggleGroup(item.groupKey)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleGroup(item.groupKey); }}>
                                {item.isExpanded ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{col?.header || groupByField}: {item.groupValue ?? 'Unknown'}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>({item.count} scanner{item.count !== 1 ? 's' : ''})</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const row = item.data;
                    const isDeleted = row.IS_DELETED === true;
                    return (
                      <TableRow
                        key={row.SCANNER_ID}
                        hover
                        selected={selectedRows.includes(row.SCANNER_ID)}
                        onClick={() => !isEditMode && navigate(`/scanners-v2/${row.SCANNER_ID}`)}
                        sx={{
                          cursor: isEditMode ? 'default' : 'pointer',
                          backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                          opacity: isDeleted && showDeleted ? 0.6 : 1,
                          '&:hover': { backgroundColor: isEditMode ? 'transparent' : isDeleted && showDeleted ? 'rgba(0,0,0,0.08)' : '#F9FAFB' },
                          '&.Mui-selected': { backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD', '&:hover': { backgroundColor: isDeleted && showDeleted ? '#e0e0e0' : '#E3F2FD' } },
                          '& td': { color: isDeleted && showDeleted ? '#999999' : 'inherit' },
                        }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ borderColor: '#EAECF0' }}>
                          <Checkbox
                            checked={selectedRows.includes(row.SCANNER_ID)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) setSelectedRows([...selectedRows, row.SCANNER_ID]);
                              else setSelectedRows(selectedRows.filter((id) => id !== row.SCANNER_ID));
                            }}
                            sx={{ padding: '4px' }}
                          />
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.field} sx={{ borderColor: '#EAECF0', padding: '16px', fontSize: '0.875rem', ...(col.width && { minWidth: col.width }) }}>
                            {col.render ? col.render(row[col.field], row) : (row[col.field] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 2, borderTop: '1px solid #EAECF0', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant={isEditMode ? 'contained' : 'outlined'}
              startIcon={isEditMode ? <CancelIcon /> : <EditIcon />}
              onClick={handleToggleEditMode}
              sx={{ borderColor: isEditMode ? 'transparent' : '#E0E0E0', backgroundColor: isEditMode ? '#1976d2' : '#ffffff', color: isEditMode ? '#ffffff' : '#000000', textTransform: 'none', fontWeight: 500, '&:hover': { backgroundColor: isEditMode ? '#1565c0' : '#f5f5f5', borderColor: isEditMode ? 'transparent' : '#BDBDBD' } }}
            >
              {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {isEditMode && (
              <Button
                variant="contained" startIcon={<SaveIcon />} onClick={handleSaveChanges}
                disabled={Object.keys(pendingChanges).length === 0}
                sx={{ backgroundColor: '#4caf50', textTransform: 'none', fontWeight: 500, '&:hover': { backgroundColor: '#45a049' }, '&.Mui-disabled': { backgroundColor: '#cccccc' } }}
              >
                Save Changes ({Object.keys(pendingChanges).length})
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
                textTransform: 'none', fontWeight: 500,
                '&:hover': { borderColor: hasDeletedSelected ? '#45a049' : 'transparent', backgroundColor: hasDeletedSelected ? '#f1f8f4' : '#c62828' },
                '&.Mui-disabled': { backgroundColor: hasDeletedSelected ? '#ffffff' : '#cccccc', color: hasDeletedSelected ? '#cccccc' : '#fff' },
              }}
            >
              {hasDeletedSelected ? 'Restore Scanners' : 'Delete Scanners'} ({selectedRows.length})
            </Button>
            <Button variant="outlined" onClick={handleExportCsv} sx={{ borderColor: '#E0E0E0', color: '#000', textTransform: 'none', fontWeight: 500 }}>
              Export to CSV ({selectedRows.length})
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Items per page:</Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select value={pagination.rowsPerPage} onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {pagination.page * pagination.rowsPerPage + 1}–{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => handlePageChange(pagination.page + 1)} disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem', borderBottom: '1px solid #EAECF0', pb: 2 }}>
          Create New Scanner
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth required label="Scanner Name" value={createFormData.SCANNER_NAME}
                onChange={(e) => handleCreateFormChange('SCANNER_NAME', e.target.value)}
                error={!!createFormErrors.SCANNER_NAME} helperText={createFormErrors.SCANNER_NAME}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={2} label="Description" value={createFormData.DESCRIPTION}
                onChange={(e) => handleCreateFormChange('DESCRIPTION', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Data Source" value={createFormData.DATA_SOURCE_NAME} onChange={(e) => handleCreateFormChange('DATA_SOURCE_NAME', e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Sport" value={createFormData.SPORT} onChange={(e) => handleCreateFormChange('SPORT', e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Environment</InputLabel>
                <Select label="Environment" value={createFormData.ENVIRONMENT} onChange={(e) => handleCreateFormChange('ENVIRONMENT', e.target.value)}>
                  <MenuItem value="prod">prod</MenuItem>
                  <MenuItem value="qa">qa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Scan Interval (s)" value={createFormData.SCAN_INTERVAL_SECONDS} onChange={(e) => handleCreateFormChange('SCAN_INTERVAL_SECONDS', e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Checkbox size="small" checked={!!createFormData.IS_ACTIVE} onChange={(e) => handleCreateFormChange('IS_ACTIVE', e.target.checked)} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreateScanner} variant="contained" color="primary" disabled={loading} sx={{ textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</MuiAlert>
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
    </Box>
  );
}

export default ScannersListV2;
