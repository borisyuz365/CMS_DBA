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
  InputLabel,
  Select,
  MenuItem,
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
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SearchIcon from '@mui/icons-material/Search';
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
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function SportsList() {
  const navigate = useNavigate();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 25, totalRows: 0 });
  const [selectedRows, setSelectedRows] = useState([]);

  const [filters, setFilters] = useState({
    sportTypeId: '',
    aliasName: '',
  });

  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [groupByField, setGroupByField] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    ALIAS_NAME: '',
    TABLE_DEF_WINNER_POINTS: 3,
    TABLE_DEF_DRAW_POINTS: 1,
    TABLE_DEF_LOSER_POINTS: 0,
    TABLE_DEF_IS_EVEN_EXISTS: true,
    IS_DISPLAYED: true,
    IMG_VER: 1,
  });
  const [createFormErrors, setCreateFormErrors] = useState({});

  const [showDeleted, setShowDeleted] = useState(false);
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
    loadSports();
    loadTermsAndCategories();
  }, []);

  const loadTermsAndCategories = async () => {
    try {
      const [terms, categories] = await Promise.all([api.getTerms(), api.getCategories()]);
      setAllTerms(terms || []);
      setAllCategories(categories || []);
    } catch (err) {
      console.warn('Failed to load terms/categories:', err);
    }
  };

  const loadSports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSportsList();
      setSports(Array.isArray(data) ? data : []);
      setPagination((prev) => ({ ...prev, totalRows: (data || []).length, page: 0 }));
    } catch (err) {
      console.error('Failed to load sports:', err);
      setError(err.message || 'Failed to load sports');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnFilterChange = (columnField, value) => {
    setColumnFilters((prev) => ({ ...prev, [columnField]: value }));
  };

  const filteredAndSortedSports = useMemo(() => {
    let filtered = [...sports];
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
          const cellValueStr = String(cellValue).toLowerCase();
          if (columnField === 'SPORT_TYPE_ID' || columnField === 'TABLE_DEF_WINNER_POINTS' || columnField === 'TABLE_DEF_DRAW_POINTS' || columnField === 'TABLE_DEF_LOSER_POINTS' || columnField === 'GAME_DURATION' || columnField === 'RECOGNITION_TIME_SPAN' || columnField === 'MATCH_REMINDER_TIME' || columnField === 'MINIMUM_ATHLETES_IN_SQUAD' || columnField === 'MINIMUM_ATHLETES_IN_LINEUPS') {
            const numValue = Number(searchTerm);
            if (!isNaN(numValue)) return cellValue === numValue || cellValueStr.includes(searchTerm);
          }
          return cellValueStr.includes(searchTerm);
        });
      }
    });

    if (filters.sportTypeId) {
      filtered = filtered.filter((s) => String(s.SPORT_TYPE_ID) === String(filters.sportTypeId));
    }
    if (filters.aliasName && filters.aliasName.trim()) {
      const term = filters.aliasName.toLowerCase().trim();
      filtered = filtered.filter((s) => (s.ALIAS_NAME || '').toLowerCase().includes(term));
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
  }, [sports, columnFilters, sortConfig, filters.sportTypeId, filters.aliasName, showDeleted]);

  const groupedAndPaginatedData = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSortedSports.slice(start, end).map((row) => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSortedSports.forEach((row) => {
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
  }, [filteredAndSortedSports, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, totalRows: filteredAndSortedSports.length, page: 0 }));
  }, [filteredAndSortedSports.length]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSortedSports.slice(start, end);
  }, [filteredAndSortedSports, pagination.page, pagination.rowsPerPage]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    loadSports();
  };

  const handleClearFilters = () => {
    setFilters({ sportTypeId: '', aliasName: '' });
    setColumnFilters({});
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleGroupBy = (field) => {
    if (groupByField === field) {
      setGroupByField(null);
      setExpandedGroups(new Set());
    } else {
      setGroupByField(field);
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

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setPagination((prev) => ({ ...prev, rowsPerPage: newRowsPerPage, page: 0 }));
  };

  const handleFieldChange = (sportTypeId, field, value) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (!next[sportTypeId]) next[sportTypeId] = {};
      next[sportTypeId][field] = value;
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
      const updates = Object.entries(pendingChanges).map(([sportTypeId, changes]) => ({
        sportTypeId: parseInt(sportTypeId, 10),
        changes,
      }));
      const result = await api.updateSportsBulk(updates);
      const msg = result.errors && result.errors.length > 0
        ? `Updated ${result.updated} sport(s). ${result.errors.length} error(s).`
        : `Updated ${result.updated} sport(s).`;
      setSnackbar({ open: true, message: msg, severity: result.errors?.length ? 'warning' : 'success' });
      setPendingChanges({});
      setIsEditMode(false);
      await loadSports();
    } catch (err) {
      console.error('Failed to save:', err);
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateFormData({
      ALIAS_NAME: '',
      TABLE_DEF_WINNER_POINTS: 3,
      TABLE_DEF_DRAW_POINTS: 1,
      TABLE_DEF_LOSER_POINTS: 0,
      TABLE_DEF_IS_EVEN_EXISTS: true,
      IS_DISPLAYED: true,
      IMG_VER: 1,
    });
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
      setCreateFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createFormData.ALIAS_NAME || !createFormData.ALIAS_NAME.trim()) {
      errors.ALIAS_NAME = 'Sport name is required';
    }
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSport = async () => {
    if (!validateCreateForm()) return;
    try {
      setLoading(true);
      setError(null);
      const aliasTrimmed = createFormData.ALIAS_NAME.trim();
      const newTerm = await api.createTerm({
        category: 'Sport Type names',
        values: [
          { languageId: 1, value: aliasTrimmed, isDefault: true, status: 'Approved' },
        ],
      });
      const newSport = await api.createSport({
        NAME_ID: newTerm.id,
        ALIAS_NAME: aliasTrimmed,
        TABLE_DEF_WINNER_POINTS: createFormData.TABLE_DEF_WINNER_POINTS != null ? Number(createFormData.TABLE_DEF_WINNER_POINTS) : 3,
        TABLE_DEF_DRAW_POINTS: createFormData.TABLE_DEF_DRAW_POINTS != null ? Number(createFormData.TABLE_DEF_DRAW_POINTS) : 1,
        TABLE_DEF_LOSER_POINTS: createFormData.TABLE_DEF_LOSER_POINTS != null ? Number(createFormData.TABLE_DEF_LOSER_POINTS) : 0,
        TABLE_DEF_IS_EVEN_EXISTS: !!createFormData.TABLE_DEF_IS_EVEN_EXISTS,
        IS_DISPLAYED: !!createFormData.IS_DISPLAYED,
        IMG_VER: createFormData.IMG_VER != null ? Number(createFormData.IMG_VER) : 1,
      });
      handleCloseCreateDialog();
      await loadSports();
      setSnackbar({ open: true, message: 'Sport created successfully', severity: 'success' });
      navigate(`/sports/${newSport.SPORT_TYPE_ID}`);
    } catch (err) {
      console.error('Failed to create sport:', err);
      setSnackbar({ open: true, message: err.message || 'Failed to create sport', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some((id) => {
      const s = sports.find((x) => x.SPORT_TYPE_ID === id);
      return s?.IS_DELETED === true;
    });
  }, [selectedRows, sports]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select sports', severity: 'warning' });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Sports`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} sport(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreSports(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} sport(s)`,
              severity: 'success',
            });
          } else {
            await api.deleteSports(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} sport(s)`,
              severity: 'success',
            });
          }
          setSelectedRows([]);
          await loadSports();
        } catch (err) {
          console.error(`Failed to ${actionText} sports:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} sports. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} sports`);
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

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSortedSports.filter((r) => selectedRows.includes(r.SPORT_TYPE_ID))
      : filteredAndSortedSports;
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
    a.download = `sports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} sport(s)`, severity: 'success' });
  };

  const handleSnackbarClose = (e, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
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
      await loadSports();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadSports();
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

  const columns = useMemo(
    () => [
      {
        field: 'SPORT_TYPE_ID',
        header: 'ID',
        width: 70,
        render: (value) => (
          <Typography
            sx={{ color: '#1976d2', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', '&:hover': { textDecoration: 'underline' } }}
            onClick={(e) => { e.stopPropagation(); window.open(`/sports/${value}`, '_blank'); }}
          >
            {value}
          </Typography>
        ),
      },
      {
        field: 'ALIAS_NAME',
        header: 'Name',
        width: '15ch',
        render: (value, row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={row.SPORT_IMAGE_URL || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: row.SPORT_IMAGE_URL ? 'transparent' : '#1976d2',
                borderRadius: '50%',
              }}
            >
              <SportsSoccerIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Typography
              sx={{
                color: '#1976d2',
                cursor: 'pointer',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: '0.875rem',
                fontWeight: 400,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (row.NAME_ID) {
                  handleNameClick(e, row);
                } else {
                  window.open(`/sports/${row.SPORT_TYPE_ID}`, '_blank');
                }
              }}
            >
              {value || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'IS_DISPLAYED',
        header: 'Displayed',
        width: 90,
        render: (value, row) => {
          if (isEditMode) {
            const v = pendingChanges[row.SPORT_TYPE_ID]?.IS_DISPLAYED ?? value;
            return (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!!v}
                    onChange={(e) => handleFieldChange(row.SPORT_TYPE_ID, 'IS_DISPLAYED', e.target.checked)}
                  />
                }
                label=""
              />
            );
          }
          return value ? 'Yes' : 'No';
        },
      },
      {
        field: 'GAME_DURATION',
        header: 'Duration',
        width: 80,
        render: (value) => value ?? '-',
      },
      {
        field: 'RECOGNITION_TIME_SPAN',
        header: 'Recognition Time',
        width: 110,
        render: (value) => value ?? '-',
      },
      {
        field: 'MATCH_REMINDER_TIME',
        header: 'Match Reminder',
        width: 120,
        render: (value) => value ?? '-',
      },
      {
        field: 'MINIMUM_ATHLETES_IN_SQUAD',
        header: 'Min in Squad',
        width: 95,
        render: (value) => value ?? '-',
      },
      {
        field: 'MINIMUM_ATHLETES_IN_LINEUPS',
        header: 'Min in Lineups',
        width: 105,
        render: (value) => value ?? '-',
      },
      {
        field: 'ALLOW_ATHLETE_SEARCH',
        header: 'Allow Athlete Search',
        width: 110,
        render: (value, row) => {
          if (isEditMode) {
            const v = pendingChanges[row.SPORT_TYPE_ID]?.ALLOW_ATHLETE_SEARCH ?? value;
            return (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!!v}
                    onChange={(e) => handleFieldChange(row.SPORT_TYPE_ID, 'ALLOW_ATHLETE_SEARCH', e.target.checked)}
                  />
                }
                label=""
              />
            );
          }
          return value ? 'Yes' : 'No';
        },
      },
    ],
    [isEditMode, pendingChanges, handleNameClick]
  );

  if (loading && sports.length === 0) {
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
          Sports List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Sport
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Sport ID"
              value={filters.sportTypeId}
              onChange={(e) => handleFilterChange('sportTypeId', e.target.value)}
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
              label="Sport Name"
              value={filters.aliasName}
              onChange={(e) => handleFilterChange('aliasName', e.target.value)}
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
              onClick={handleSearch}
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
                  onChange={(e) => setShowDeleted(e.target.checked)}
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
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TableContainer sx={{ maxHeight: '100%', overflowX: 'auto' }}>
            <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: '#EAECF0' }, '& .MuiTableHead-root': { position: 'sticky', top: 0, zIndex: 11 } }}>
              <TableHead>
                <TableRow sx={{ position: 'sticky', top: 0, zIndex: 11 }}>
                  <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12 }}>
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={(e) => (e.target.checked ? setSelectedRows(paginatedData.map((r) => r.SPORT_TYPE_ID)) : setSelectedRows([]))}
                      sx={{ padding: '4px' }}
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        backgroundColor: '#ffffff',
                        borderColor: '#EAECF0',
                        padding: '12px 16px',
                        verticalAlign: 'top',
                        position: 'sticky',
                        top: 0,
                        zIndex: 12,
                        whiteSpace: 'nowrap',
                        ...(col.width && { width: col.width, minWidth: col.width }),
                      }}
                    >
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
                          size="small"
                          placeholder="Filter"
                          value={columnFilters[col.field] || ''}
                          onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                          sx={{
                            '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem', backgroundColor: '#F9FAFB' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                          }}
                        />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAndPaginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                      <Typography color="text.secondary">
                        {sports.length === 0 ? 'No sports found. Click "Create Sport" to add one.' : 'No rows match the current filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedAndPaginatedData.map((item, index) => {
                    if (item.type === 'group-header') {
                      const col = columns.find((c) => c.field === groupByField);
                      return (
                        <TableRow key={`group-${item.groupKey}-${index}`} sx={{ backgroundColor: '#F5F5F5', '& td': { borderColor: '#EAECF0', fontWeight: 600 } }}>
                          <TableCell
                            colSpan={columns.length + 1}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleToggleGroup(item.groupKey)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleGroup(item.groupKey); }}>
                                {item.isExpanded ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{col?.header || groupByField}: {item.groupValue ?? 'Unknown'}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>({item.count} sport{item.count !== 1 ? 's' : ''})</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const row = item.data;
                    const isDeleted = row.IS_DELETED === true;
                    return (
                      <TableRow
                        key={row.SPORT_TYPE_ID}
                        hover
                        selected={selectedRows.includes(row.SPORT_TYPE_ID)}
                        onClick={() => !isEditMode && window.open(`/sports/${row.SPORT_TYPE_ID}`, '_blank')}
                        sx={{
                          cursor: isEditMode ? 'default' : 'pointer',
                          backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                          opacity: isDeleted && showDeleted ? 0.6 : 1,
                          '&:hover': {
                            backgroundColor: isEditMode ? 'transparent' : isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : '#F9FAFB',
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
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ borderColor: '#EAECF0' }}>
                          <Checkbox
                            checked={selectedRows.includes(row.SPORT_TYPE_ID)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) setSelectedRows([...selectedRows, row.SPORT_TYPE_ID]);
                              else setSelectedRows(selectedRows.filter((id) => id !== row.SPORT_TYPE_ID));
                            }}
                            sx={{ padding: '4px' }}
                          />
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.field} sx={{ borderColor: '#EAECF0', padding: '16px', fontSize: '0.875rem', ...(col.width && { width: col.width, minWidth: col.width }) }}>
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
              sx={{
                borderColor: isEditMode ? 'transparent' : '#E0E0E0',
                backgroundColor: isEditMode ? '#1976d2' : '#ffffff',
                color: isEditMode ? '#ffffff' : '#000000',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { backgroundColor: isEditMode ? '#1565c0' : '#f5f5f5', borderColor: isEditMode ? 'transparent' : '#BDBDBD' },
              }}
            >
              {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {isEditMode && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
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
                textTransform: 'none',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontWeight: 500,
                '&:hover': {
                  borderColor: hasDeletedSelected ? '#45a049' : 'transparent',
                  backgroundColor: hasDeletedSelected ? '#f1f8f4' : '#c62828',
                },
                '&.Mui-disabled': {
                  backgroundColor: hasDeletedSelected ? '#ffffff' : '#cccccc',
                  color: hasDeletedSelected ? '#cccccc' : '#fff',
                },
              }}
            >
              {hasDeletedSelected ? 'Restore Sports' : 'Delete Sports'} ({selectedRows.length})
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
              {pagination.page * pagination.rowsPerPage + 1}-{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => handlePageChange(pagination.page + 1)} disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontWeight: 600, fontSize: '1.25rem', borderBottom: '1px solid #EAECF0', pb: 2 }}>
          Create New Sport
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Sport Name (ALIAS_NAME)"
                value={createFormData.ALIAS_NAME}
                onChange={(e) => handleCreateFormChange('ALIAS_NAME', e.target.value)}
                error={!!createFormErrors.ALIAS_NAME}
                helperText={createFormErrors.ALIAS_NAME}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Win Points" value={createFormData.TABLE_DEF_WINNER_POINTS} onChange={(e) => handleCreateFormChange('TABLE_DEF_WINNER_POINTS', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Draw Points" value={createFormData.TABLE_DEF_DRAW_POINTS} onChange={(e) => handleCreateFormChange('TABLE_DEF_DRAW_POINTS', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Loss Points" value={createFormData.TABLE_DEF_LOSER_POINTS} onChange={(e) => handleCreateFormChange('TABLE_DEF_LOSER_POINTS', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Checkbox size="small" checked={!!createFormData.TABLE_DEF_IS_EVEN_EXISTS} onChange={(e) => handleCreateFormChange('TABLE_DEF_IS_EVEN_EXISTS', e.target.checked)} />}
                label="Draw exists"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Checkbox size="small" checked={!!createFormData.IS_DISPLAYED} onChange={(e) => handleCreateFormChange('IS_DISPLAYED', e.target.checked)} />}
                label="Displayed"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Image Version" value={createFormData.IMG_VER} onChange={(e) => handleCreateFormChange('IMG_VER', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreateSport} variant="contained" color="primary" disabled={loading} sx={{ textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</MuiAlert>
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
        initialCategory="Sport Type names"
      />
    </Box>
  );
}

export default SportsList;
