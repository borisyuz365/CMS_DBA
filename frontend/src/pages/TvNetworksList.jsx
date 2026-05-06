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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert as MuiAlert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';
import useUrlFilters from '../hooks/useUrlFilters';

function TvNetworksList() {
  const navigate = useNavigate();
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);

  const [urlState, setUrlState] = useUrlFilters({
    country: { type: 'array', default: [] },
    tvNetworkId: { type: 'string', default: '' },
    language: { type: 'string', default: '' },
    channelName: { type: 'string', default: '' },
    showDeleted: { type: 'boolean', default: false },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });

  const filters = {
    country: urlState.country,
    tvNetworkId: urlState.tvNetworkId,
    language: urlState.language,
    channelName: urlState.channelName,
  };
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage, totalRows };
  const sortConfig = { field: urlState.sortField || null, direction: urlState.sortDir };
  const groupByField = urlState.groupBy || null;
  const showDeleted = urlState.showDeleted;

  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [tvNetworkTypes, setTvNetworkTypes] = useState([]);
  const [countriesDialogOpen, setCountriesDialogOpen] = useState(false);
  const [countriesDialogData, setCountriesDialogData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState({});

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    COUNTRY_IDS: [],
    WEBSITE: '',
    CHANNEL_TYPE: '',
    IS_INTERNATIONAL: false,
    ORDER_LEVEL: '',
    PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: true,
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    Promise.all([loadDropdownData(), loadTermsAndCategories()]).then(() => {
      if (window.location.search) searchTvNetworks();
    });
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

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [countriesResult, languagesResult, typesResult] = await Promise.allSettled([
        api.getCountries(),
        api.getLanguages(),
        api.getTvNetworkTypes(),
      ]);
      if (countriesResult.status === 'fulfilled') setCountries(countriesResult.value);
      else setCountries([]);
      if (languagesResult.status === 'fulfilled')
        setLanguages((languagesResult.value || []).filter((l) => l.isDisplayed));
      else setLanguages([]);
      if (typesResult.status === 'fulfilled') setTvNetworkTypes(typesResult.value);
      else setTvNetworkTypes([]);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setError(err.message || 'Failed to load dropdown data');
    } finally {
      setLoading(false);
    }
  };

  const searchTvNetworks = async () => {
    try {
      setLoading(true);
      setError(null);
      const searchFilters = {
        country: filters.country?.length > 0 ? filters.country : undefined,
        tvNetworkId: filters.tvNetworkId || undefined,
        channelName: filters.channelName || undefined,
        language: filters.language || undefined,
      };
      Object.keys(searchFilters).forEach((k) => {
        if (searchFilters[k] === undefined) delete searchFilters[k];
      });
      const data = await api.getTvNetworksList(searchFilters);
      setNetworks(data);
      setTotalRows(data.length);
      setUrlState({ page: 0 });
    } catch (err) {
      console.error('Failed to search TV networks:', err);
      setError(err.message || 'Failed to search TV networks');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...networks];
    if (!showDeleted) {
      list = list.filter((n) => !n.IS_DELETED);
    }
    Object.keys(columnFilters).forEach((field) => {
      const v = columnFilters[field];
      if (v && String(v).trim() !== '') {
        const term = String(v).toLowerCase().trim();
        list = list.filter((row) => {
          const cell = row[field];
          if (cell == null) return false;
          return String(cell).toLowerCase().includes(term);
        });
      }
    });
    if (sortConfig.field) {
      list.sort((a, b) => {
        const av = a[sortConfig.field];
        const bv = b[sortConfig.field];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'string')
          return sortConfig.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortConfig.direction === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [networks, columnFilters, sortConfig, showDeleted]);

  const groupedAndPaginated = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      const end = start + pagination.rowsPerPage;
      return filteredAndSorted.slice(start, end).map((row) => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSorted.forEach((row) => {
      const key = String(row[groupByField] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const an = Number(a);
      const bn = Number(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    const result = [];
    sortedKeys.forEach((key) => {
      const isExpanded = expandedGroups.has(key);
      result.push({
        type: 'group-header',
        groupKey: key,
        groupValue: key === 'Unknown' ? null : groups[key][0][groupByField],
        count: groups[key].length,
        isExpanded,
      });
      if (isExpanded) {
        groups[key].forEach((row) => result.push({ type: 'row', data: row }));
      }
    });
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return result.slice(start, end);
  }, [filteredAndSorted, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  useEffect(() => {
    setTotalRows(filteredAndSorted.length);
    setUrlState({ page: 0 });
  }, [filteredAndSorted.length]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return filteredAndSorted.slice(start, end);
  }, [filteredAndSorted, pagination.page, pagination.rowsPerPage]);

  const handleFilterChange = (field, value) => {
    setUrlState({ [field]: value });
  };

  const handleClearFilters = () => {
    setUrlState({ country: [], tvNetworkId: '', language: '', channelName: '' });
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

  const handleToggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    setUrlState({ page: newPage });
  };

  const handleRowsPerPageChange = (v) => {
    setUrlState({ rowsPerPage: v, page: 0 });
  };

  const handleOpenCreateDialog = () => {
    const broadcastType = tvNetworkTypes.find((t) => t.NAME === 'Broadcast');
    setCreateFormData({
      name: '',
      COUNTRY_ID: null,
      WEBSITE: '',
      CHANNEL_TYPE: broadcastType ? broadcastType.ID : '',
      IS_INTERNATIONAL: false,
      PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: true,
    });
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      COUNTRY_ID: null,
      WEBSITE: '',
      CHANNEL_TYPE: '',
      IS_INTERNATIONAL: false,
      PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: true,
    });
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
    if (!createFormData.name || String(createFormData.name).trim() === '') {
      errors.name = 'Name is required';
    }
    if (!createFormData.COUNTRY_ID) {
      errors.COUNTRY_ID = 'Country is required';
    }
    if (createFormData.CHANNEL_TYPE === '' || createFormData.CHANNEL_TYPE == null) {
      errors.CHANNEL_TYPE = 'Channel Type is required';
    }
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTvChannel = async () => {
    if (!validateCreateForm()) return;
    try {
      setLoading(true);
      setError(null);
      const newTerm = await api.createTerm({
        category: 'TV Channels',
        values: [
          { languageId: 1, value: createFormData.name.trim(), isDefault: true, status: 'Approved' },
        ],
      });
      const payload = {
        NAME_ID: newTerm.id,
        COUNTRY_IDS: createFormData.COUNTRY_ID ? [createFormData.COUNTRY_ID] : [],
        WEBSITE: createFormData.WEBSITE?.trim() || null,
        CHANNEL_TYPE: createFormData.CHANNEL_TYPE !== '' ? parseInt(createFormData.CHANNEL_TYPE) : null,
        IS_INTERNATIONAL: createFormData.IS_INTERNATIONAL || false,
        PROMOTE_IN_MATCH_REMINDER_NOTIFICATION: createFormData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION !== false,
      };
      const newNetwork = await api.createTvNetwork(payload);
      handleCloseCreateDialog();
      await searchTvNetworks();
      setSnackbar({ open: true, message: 'TV channel created successfully', severity: 'success' });
      navigate(`/tv-channels/${newNetwork.TV_NETWORK_ID}`);
    } catch (err) {
      console.error('Failed to create TV channel:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create TV channel',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
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
      await searchTvNetworks();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await searchTvNetworks();
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

  const handleFieldChange = (tvNetworkId, field, value) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (!next[tvNetworkId]) next[tvNetworkId] = {};
      next[tvNetworkId][field] = value;
      return next;
    });
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      if (Object.keys(pendingChanges).length > 0 && !window.confirm('You have unsaved changes. Cancel anyway?')) return;
      setPendingChanges({});
    }
    setIsEditMode((prev) => !prev);
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const updates = Object.keys(pendingChanges).map((id) => ({
        tvNetworkId: parseInt(id, 10),
        changes: pendingChanges[id],
      }));
      const result = await api.updateTvNetworksBulk(updates);
      const msg = result.errors && result.errors.length > 0
        ? `Saved ${result.updated} channel(s). ${result.errors.length} error(s).`
        : `Saved ${result.updated} channel(s).`;
      setSnackbar({ open: true, message: msg, severity: result.errors?.length ? 'warning' : 'success' });
      setPendingChanges({});
      setIsEditMode(false);
      await searchTvNetworks();
    } catch (err) {
      console.error('Failed to save:', err);
      setSnackbar({ open: true, message: err.message || 'Failed to save changes', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? filteredAndSorted.filter((r) => selectedRows.includes(r.TV_NETWORK_ID))
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
    a.download = `tv_networks_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Exported ${rows.length} TV network(s)`, severity: 'success' });
  };

  const hasDeletedSelected = useMemo(() => {
    return selectedRows.some((id) => {
      const n = networks.find((x) => x.TV_NETWORK_ID === id);
      return n?.IS_DELETED === true;
    });
  }, [selectedRows, networks]);

  const handleDeleteOrRestore = () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select TV networks', severity: 'warning' });
      return;
    }
    const isRestore = hasDeletedSelected;
    const actionText = isRestore ? 'restore' : 'delete';
    setConfirmDialog({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} TV Networks`,
      message: `Are you sure you want to ${actionText} ${selectedRows.length} TV network(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          if (isRestore) {
            await api.restoreTvNetworks(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully restored ${selectedRows.length} TV network(s)`,
              severity: 'success',
            });
          } else {
            await api.deleteTvNetworks(selectedRows);
            setSnackbar({
              open: true,
              message: `Successfully deleted ${selectedRows.length} TV network(s)`,
              severity: 'success',
            });
          }
          setSelectedRows([]);
          await searchTvNetworks();
        } catch (err) {
          console.error(`Failed to ${actionText} TV networks:`, err);
          setSnackbar({
            open: true,
            message: `Failed to ${actionText} TV networks. Please try again.`,
            severity: 'error',
          });
          setError(err.message || `Failed to ${actionText} TV networks`);
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

  const columns = useMemo(
    () => [
      {
        field: 'TV_NETWORK_ID',
        header: 'ID',
        width: 70,
        render: (value) => (
          <Typography
            sx={{
              color: '#1976d2',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: '0.875rem',
              '&:hover': { textDecoration: 'underline' },
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/tv-channels/${value}`, '_blank');
            }}
          >
            {value}
          </Typography>
        ),
      },
      {
        field: 'name',
        header: 'Name',
        render: (value, row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={row.NETWORK_IMAGE_URL || row.TV_NETWORK_IMAGE_URL || row.IMAGE_URL || row.LOGO_URL || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: (row.NETWORK_IMAGE_URL || row.TV_NETWORK_IMAGE_URL || row.IMAGE_URL || row.LOGO_URL) ? 'transparent' : '#1976d2',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <LiveTvIcon sx={{ fontSize: 18 }} />
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
                  window.open(`/tv-channels/${row.TV_NETWORK_ID}`, '_blank');
                }
              }}
            >
              {value || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'countryName',
        header: 'Country',
        render: (value, row) => {
          const rowCountries = row.countries || [];
          if (rowCountries.length === 0) return '-';
          return rowCountries[0].name;
        },
      },
      {
        field: 'relatedCountries',
        header: 'Related Countries',
        render: (value, row) => {
          const related = row.relatedCountries || [];
          if (related.length === 0) return '-';
          if (related.length === 1) return related[0].name;
          return (
            <Typography
              sx={{
                color: '#1976d2',
                cursor: 'pointer',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCountriesDialogData(related);
                setCountriesDialogOpen(true);
              }}
            >
              {related.length} countries
            </Typography>
          );
        },
      },
      {
        field: 'WEBSITE',
        header: 'Website',
        render: (value, row) => {
          if (isEditMode) {
            const current = pendingChanges[row.TV_NETWORK_ID]?.WEBSITE ?? value;
            return (
              <TextField
                size="small"
                value={current ?? ''}
                onChange={(e) => handleFieldChange(row.TV_NETWORK_ID, 'WEBSITE', e.target.value || null)}
                sx={{
                  width: '100%',
                  '& .MuiInputBase-root': { height: '32px', fontSize: '0.875rem' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                }}
              />
            );
          }
          if (value) {
            const href = value.startsWith('http') ? value : `https://${value}`;
            return (
              <Typography component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ color: '#1976d2', fontSize: '0.875rem', '&:hover': { textDecoration: 'underline' } }}>
                {value.length > 40 ? value.slice(0, 40) + '…' : value}
              </Typography>
            );
          }
          return '-';
        },
      },
      {
        field: 'CHANNEL_TYPE',
        header: 'Channel Type',
        render: (value, row) => {
          if (isEditMode) {
            const current = pendingChanges[row.TV_NETWORK_ID]?.CHANNEL_TYPE ?? value;
            return (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={current ?? ''}
                  onChange={(e) => handleFieldChange(row.TV_NETWORK_ID, 'CHANNEL_TYPE', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  sx={{ height: '32px', fontSize: '0.875rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' } }}
                >
                  <MenuItem value="">None</MenuItem>
                  {tvNetworkTypes.map((t) => (
                    <MenuItem key={t.ID} value={t.ID}>{t.NAME}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          if (value == null) return '-';
          const typeObj = tvNetworkTypes.find((t) => t.ID === value);
          return typeObj ? typeObj.NAME : value;
        },
      },
      {
        field: 'IS_INTERNATIONAL',
        header: 'International',
        render: (value, row) => {
          if (isEditMode) {
            const current = pendingChanges[row.TV_NETWORK_ID]?.IS_INTERNATIONAL ?? value;
            return (
              <Checkbox
                checked={!!current}
                onChange={(e) => handleFieldChange(row.TV_NETWORK_ID, 'IS_INTERNATIONAL', e.target.checked)}
                size="small"
                sx={{ padding: '4px' }}
              />
            );
          }
          return value ? 'Yes' : 'No';
        },
      },
      {
        field: 'ORDER_LEVEL',
        header: 'Order',
        render: (value, row) => {
          if (isEditMode) {
            const current = pendingChanges[row.TV_NETWORK_ID]?.ORDER_LEVEL ?? value;
            return (
              <TextField
                type="number"
                size="small"
                value={current ?? ''}
                onChange={(e) => handleFieldChange(row.TV_NETWORK_ID, 'ORDER_LEVEL', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                sx={{
                  width: '80px',
                  '& .MuiInputBase-root': { height: '32px', fontSize: '0.875rem' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                }}
              />
            );
          }
          return value ?? '-';
        },
      },
    ],
    [isEditMode, pendingChanges, countries, tvNetworkTypes, handleNameClick]
  );

  if (loading && networks.length === 0) {
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
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        backgroundColor: '#f5f5f5',
        overflow: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#000000',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          TV Channels List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create TV Channel
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Autocomplete
              multiple
              size="small"
              options={countries}
              getOptionLabel={(o) => o.name || ''}
              value={countries.filter((c) => filters.country.includes(c.name))}
              onChange={(e, newVal) => handleFilterChange('country', newVal.map((c) => c.name))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  sx={{
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0E0E0' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  }}
                />
              )}
              ListboxProps={{ style: { maxHeight: '240px', overflow: 'auto' } }}
              sx={{ '& .MuiAutocomplete-inputRoot': { fontSize: '0.875rem' } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="TV Network ID"
              value={filters.tvNetworkId}
              onChange={(e) => handleFilterChange('tvNetworkId', e.target.value)}
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
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.875rem' }}>Language</InputLabel>
              <Select
                value={filters.language}
                label="Language"
                onChange={(e) => handleFilterChange('language', e.target.value)}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0E0E0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '& .MuiSelect-icon': { color: '#666666' },
                }}
              >
                <MenuItem value="">
                  <em>Please Select Language</em>
                </MenuItem>
                {languages.map((lang) => (
                  <MenuItem key={lang.id} value={lang.iso2LettersCode}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Channel Name"
              value={filters.channelName}
              onChange={(e) => handleFilterChange('channelName', e.target.value)}
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
              onClick={searchTvNetworks}
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

      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 2,
          backgroundColor: '#ffffff',
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TableContainer sx={{ maxHeight: '100%' }}>
            <Table
              stickyHeader
              sx={{
                '& .MuiTableCell-root': { borderColor: '#EAECF0', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
                '& .MuiTableHead-root': { position: 'sticky', top: 0, zIndex: 11 },
              }}
            >
              <TableHead>
                <TableRow sx={{ position: 'sticky', top: 0, zIndex: 11 }}>
                  <TableCell
                    padding="checkbox"
                    sx={{
                      backgroundColor: '#ffffff',
                      borderColor: '#EAECF0',
                      borderRight: '1px solid #EAECF0',
                      padding: '12px 16px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 12,
                    }}
                  >
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(paginatedData.map((r) => r.TV_NETWORK_ID));
                        else setSelectedRows([]);
                      }}
                      sx={{ padding: '4px' }}
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        backgroundColor: '#ffffff',
                        borderColor: '#EAECF0',
                        borderRight: '1px solid #EAECF0',
                        padding: '12px 16px',
                        verticalAlign: 'top',
                        minHeight: '80px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 12,
                        ...(col.width && { width: col.width }),
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '24px' }}>
                          <Typography
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: '#000000',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {col.header}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleGroupBy(col.field)}
                              sx={{ p: 0.5, height: 16, width: 16, '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                              title={groupByField === col.field ? 'Remove grouping' : 'Group by this column'}
                            >
                              <ViewListIcon sx={{ fontSize: 12, color: groupByField === col.field ? '#1976d2' : '#cccccc' }} />
                            </IconButton>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              <IconButton size="small" onClick={() => handleSort(col.field)} sx={{ p: 0, height: 10, width: 10 }}>
                                <ArrowUpwardIcon
                                  sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'asc' ? '#1976d2' : '#cccccc' }}
                                />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleSort(col.field)} sx={{ p: 0, height: 10, width: 10 }}>
                                <ArrowDownwardIcon
                                  sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'desc' ? '#1976d2' : '#cccccc' }}
                                />
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                        <TextField
                          size="small"
                          placeholder="Filter"
                          value={columnFilters[col.field] || ''}
                          sx={{
                            width: '100%',
                            '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem', backgroundColor: '#F9FAFB', borderRadius: '4px' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0E0E0', borderWidth: '1px' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D0D0D0' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2', borderWidth: '1px' },
                            '& .MuiInputBase-input': { padding: '6px 12px' },
                          }}
                          onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                        />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAndPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      align="center"
                      sx={{ py: 4, borderColor: '#EAECF0', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}
                    >
                      <Typography color="text.secondary" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                        {networks.length === 0
                          ? 'No TV channels found. Use the filters above and click Search to find channels.'
                          : 'No channels match the current page.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedAndPaginated.map((item, idx) => {
                    if (item.type === 'group-header') {
                      const col = columns.find((c) => c.field === groupByField);
                      const displayVal = item.groupValue === null ? 'Unknown' : (item.groupValue ?? '-');
                      return (
                        <TableRow
                          key={`group-${item.groupKey}-${idx}`}
                          sx={{
                            backgroundColor: '#F5F5F5',
                            '& td': {
                              borderColor: '#EAECF0',
                              borderRight: '1px solid #EAECF0',
                              borderTop: '2px solid #D0D0D0',
                              borderBottom: '1px solid #D0D0D0',
                              fontWeight: 600,
                              padding: '12px 16px',
                            },
                          }}
                        >
                          <TableCell
                            colSpan={columns.length + 1}
                            sx={{
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              fontSize: '0.875rem',
                              color: '#000000',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleGroup(item.groupKey)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                sx={{ p: 0.5, height: 20, width: 20, '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleGroup(item.groupKey);
                                }}
                              >
                                {item.isExpanded ? (
                                  <ExpandMoreIcon sx={{ fontSize: 16, color: '#666666' }} />
                                ) : (
                                  <ChevronRightIcon sx={{ fontSize: 16, color: '#666666' }} />
                                )}
                              </IconButton>
                              <Typography sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                                {col?.header || groupByField}: {displayVal}
                              </Typography>
                              <Typography sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.75rem', fontWeight: 400, color: '#666666' }}>
                                ({item.count} {item.count === 1 ? 'channel' : 'channels'})
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const row = item.data;
                    const isDeleted = row.IS_DELETED === true;
                    return (
                      <TableRow
                        key={row.TV_NETWORK_ID}
                        hover
                        selected={selectedRows.includes(row.TV_NETWORK_ID)}
                        onClick={() => {
                          if (!isEditMode) window.open(`/tv-channels/${row.TV_NETWORK_ID}`, '_blank');
                        }}
                        sx={{
                          cursor: isEditMode ? 'default' : 'pointer',
                          backgroundColor: isDeleted && showDeleted ? '#f5f5f5' : 'inherit',
                          opacity: isDeleted && showDeleted ? 0.6 : 1,
                          '&:hover': {
                            backgroundColor: isEditMode ? 'transparent' : (isDeleted && showDeleted ? 'rgba(0, 0, 0, 0.08)' : '#F9FAFB'),
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
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ borderColor: '#EAECF0', borderRight: '1px solid #EAECF0', verticalAlign: 'middle' }}
                        >
                          <Checkbox
                            checked={selectedRows.includes(row.TV_NETWORK_ID)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) setSelectedRows([...selectedRows, row.TV_NETWORK_ID]);
                              else setSelectedRows(selectedRows.filter((id) => id !== row.TV_NETWORK_ID));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ padding: '4px' }}
                          />
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell
                            key={col.field}
                            sx={{
                              borderColor: '#EAECF0',
                              borderRight: '1px solid #EAECF0',
                              padding: '16px',
                              verticalAlign: 'middle',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              fontSize: '0.875rem',
                              fontWeight: 400,
                              color: '#000000',
                              ...(col.width && { width: col.width }),
                            }}
                          >
                            {col.render ? col.render(row[col.field], row) : (
                              <Typography sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem', fontWeight: 400, color: '#000000' }}>
                                {row[col.field] ?? '-'}
                              </Typography>
                            )}
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
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontWeight: 500,
                '&:hover': {
                  borderColor: isEditMode ? 'transparent' : '#BDBDBD',
                  backgroundColor: isEditMode ? '#1565c0' : '#f5f5f5',
                },
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
                sx={{
                  backgroundColor: '#4caf50',
                  textTransform: 'none',
                  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                  fontWeight: 500,
                  '&:hover': { backgroundColor: '#45a049' },
                  '&.Mui-disabled': { backgroundColor: '#cccccc' },
                }}
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
            {hasDeletedSelected ? 'Restore TV Networks' : 'Delete TV Networks'} ({selectedRows.length})
          </Button>
          <Button variant="outlined" onClick={handleExportCsv} sx={{ borderColor: '#E0E0E0', color: '#000', textTransform: 'none', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontWeight: 500 }}>
              Export to CSV ({selectedRows.length})
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem' }}>
              Items per page:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pagination.rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem' }}>
              {pagination.page * pagination.rowsPerPage + 1}-{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 0} size="small">
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows}
              size="small"
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Create TV Channel Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontWeight: 600, fontSize: '1.25rem', borderBottom: '1px solid #EAECF0', pb: 2 }}>
          Create New TV Channel
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Name"
                value={createFormData.name}
                onChange={(e) => handleCreateFormChange('name', e.target.value)}
                error={!!createFormErrors.name}
                helperText={createFormErrors.name}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={countries}
                getOptionLabel={(o) => (o.EMOJI ? `${o.EMOJI} ` : '') + (o.name || '')}
                value={countries.find((c) => c.COUNTRY_ID === createFormData.COUNTRY_ID) || null}
                onChange={(e, newVal) => handleCreateFormChange('COUNTRY_ID', newVal ? newVal.COUNTRY_ID : null)}
                isOptionEqualToValue={(option, val) => option.COUNTRY_ID === val.COUNTRY_ID}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Country"
                    error={!!createFormErrors.COUNTRY_ID}
                    helperText={createFormErrors.COUNTRY_ID}
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
                  />
                )}
                ListboxProps={{ style: { maxHeight: '240px', overflow: 'auto' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={createFormData.WEBSITE || ''}
                onChange={(e) => handleCreateFormChange('WEBSITE', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!createFormErrors.CHANNEL_TYPE}>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Channel Type</InputLabel>
                <Select
                  value={createFormData.CHANNEL_TYPE ?? ''}
                  label="Channel Type"
                  onChange={(e) => handleCreateFormChange('CHANNEL_TYPE', e.target.value)}
                  sx={{ fontSize: '0.875rem' }}
                >
                  {tvNetworkTypes.map((t) => (
                    <MenuItem key={t.ID} value={t.ID}>{t.NAME}</MenuItem>
                  ))}
                </Select>
                {createFormErrors.CHANNEL_TYPE && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75, fontSize: '0.75rem' }}>
                    {createFormErrors.CHANNEL_TYPE}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createFormData.IS_INTERNATIONAL || false}
                    onChange={(e) => handleCreateFormChange('IS_INTERNATIONAL', e.target.checked)}
                  />
                }
                label="International"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createFormData.PROMOTE_IN_MATCH_REMINDER_NOTIFICATION !== false}
                    onChange={(e) => handleCreateFormChange('PROMOTE_IN_MATCH_REMINDER_NOTIFICATION', e.target.checked)}
                  />
                }
                label="Promote in match reminder notification"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
            Cancel
          </Button>
          <Button onClick={handleCreateTvChannel} variant="contained" color="primary" disabled={loading} sx={{ textTransform: 'none', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </MuiAlert>
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

      <Dialog
        open={countriesDialogOpen}
        onClose={() => setCountriesDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontWeight: 600, fontSize: '1.1rem', borderBottom: '1px solid #EAECF0', pb: 2 }}>
          Related Countries ({countriesDialogData.length})
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {countriesDialogData.map((c) => (
                <TableRow key={c.COUNTRY_ID}>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{c.COUNTRY_ID}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{c.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={() => setCountriesDialogOpen(false)} color="primary" sx={{ textTransform: 'none' }}>Close</Button>
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
        initialCategory="TV Channels"
      />
    </Box>
  );
}

export default TvNetworksList;
