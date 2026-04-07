import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
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
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

function CompetitionsList() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 25, totalRows: 0 });
  const [selectedRows, setSelectedRows] = useState([]);

  const [filters, setFilters] = useState({
    country: [],
    sportType: [],
    competitionId: '',
    gender: '',
    competitionType: '',
  });
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [groupByField, setGroupByField] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const [countries, setCountries] = useState([]);
  const [sports, setSports] = useState([]);
  const [competitionTypes, setCompetitionTypes] = useState([]);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showDeleted, setShowDeleted] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    COUNTRY_ID: '',
    SPORT_TYPE_ID: '',
    GENDER: 1,
    COMPETITION_TYPE: 1,
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createSaving, setCreateSaving] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [partnerIdList, setPartnerIdList] = useState([]);
  const [screensDialogOpen, setScreensDialogOpen] = useState(false);
  const [screensDialogCompetition, setScreensDialogCompetition] = useState(null);


  const numberToHex = (num) => {
    if (num === null || num === undefined) return null;
    return `#${Number(num).toString(16).padStart(6, '0').toUpperCase()}`;
  };

  const hexToNumber = (hex) => {
    if (!hex || !String(hex).startsWith('#')) return null;
    return parseInt(String(hex).replace('#', ''), 16);
  };

  const handleFieldChange = (competitionId, field, value) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (!next[competitionId]) next[competitionId] = {};
      next[competitionId][field] = value;
      return next;
    });
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      if (Object.keys(pendingChanges).length > 0 && !window.confirm('You have unsaved changes. Cancel anyway?')) return;
      setPendingChanges({});
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      for (const [idStr, updates] of Object.entries(pendingChanges)) {
        const id = parseInt(idStr, 10);
        if (isNaN(id) || !updates || Object.keys(updates).length === 0) continue;
        await api.updateCompetition(id, updates);
      }
      setCompetitions((prev) =>
        prev.map((c) => (pendingChanges[c.COMPETITION_ID] ? { ...c, ...pendingChanges[c.COMPETITION_ID] } : c))
      );
      setPendingChanges({});
      setIsEditMode(false);
      setSnackbar({ open: true, message: 'Changes saved', severity: 'success' });
    } catch (err) {
      console.error('Save failed:', err);
      setSnackbar({ open: true, message: err.message || 'Save failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownData();
  }, []);

  // No default search: table stays empty until user clicks Search

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [countriesRes, sportsRes, competitionTypesRes, termsRes, categoriesRes] = await Promise.allSettled([
        api.getCountries(),
        api.getSports(),
        api.getCompetitionTypes(),
        api.getTerms(),
        api.getCategories(),
      ]);
      if (countriesRes.status === 'fulfilled') setCountries(countriesRes.value || []);
      else setCountries([]);
      if (sportsRes.status === 'fulfilled') setSports(sportsRes.value || []);
      else setSports([]);
      if (competitionTypesRes.status === 'fulfilled') setCompetitionTypes(competitionTypesRes.value || []);
      else setCompetitionTypes([]);
      if (termsRes.status === 'fulfilled') setAllTerms(termsRes.value || []);
      else setAllTerms([]);
      if (categoriesRes.status === 'fulfilled') setAllCategories(categoriesRes.value || []);
      else setAllCategories([]);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getCompetitions({ showDeleted }), api.getPartnerIdCompetitions()])
      .then(([compData, pidData]) => {
        setCompetitions(compData || []);
        setPartnerIdList(Array.isArray(pidData) ? pidData : []);
        setPagination((p) => ({ ...p, totalRows: (compData || []).length, page: 0 }));
      })
      .catch((err) => {
        setError(err.message || 'Failed to load competitions');
        setCompetitions([]);
        setPartnerIdList([]);
      })
      .finally(() => setLoading(false));
  };

  const handleClearFilters = () => {
    setFilters({ country: [], sportType: [], competitionId: '', gender: '', competitionType: '' });
    setColumnFilters({});
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));
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

  const handleToggleGroup = (k) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const filteredCompetitions = useMemo(() => {
    let list = [...competitions];
    if (filters.country && filters.country.length > 0) {
      const names = filters.country.map((c) => (typeof c === 'object' && c?.name ? c.name : c));
      list = list.filter((c) => names.includes(c.countryName) || names.includes(c.country));
    }
    if (filters.sportType && filters.sportType.length > 0) {
      const names = filters.sportType.map((s) => (typeof s === 'object' ? (s.name || s.ALIAS_NAME || '') : s));
      list = list.filter((c) => names.includes(c.sport) || sports.some((s) => s.SPORT_TYPE_ID === c.SPORT_TYPE_ID && names.includes(s.name || s.ALIAS_NAME)));
    }
    if (filters.competitionId && String(filters.competitionId).trim() !== '') {
      const idStr = String(filters.competitionId).trim();
      const num = parseInt(idStr, 10);
      list = list.filter(
        (c) =>
          (!isNaN(num) && c.COMPETITION_ID === num) ||
          String(c.COMPETITION_ID).includes(idStr) ||
          (c.name && String(c.name).toLowerCase().includes(idStr.toLowerCase()))
      );
    }
    if (filters.gender !== '' && filters.gender != null) {
      const g = Number(filters.gender);
      list = list.filter((c) => c.GENDER === g);
    }
    if (filters.competitionType !== '' && filters.competitionType != null) {
      const t = Number(filters.competitionType);
      list = list.filter((c) => c.COMPETITION_TYPE === t);
    }
    return list;
  }, [competitions, filters, sports]);

  const partnerCountByCompId = useMemo(() => {
    const m = {};
    (partnerIdList || []).forEach((r) => {
      const cid = r.COMPETITION_ID != null ? Number(r.COMPETITION_ID) : null;
      if (cid != null) m[cid] = (m[cid] || 0) + 1;
    });
    return m;
  }, [partnerIdList]);

  const filteredAndSorted = useMemo(() => {
    let list = [...filteredCompetitions];
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (field === '_' || !val || !String(val).trim()) return;
      const term = String(val).toLowerCase().trim();
      list = list.filter((row) => {
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
        if (typeof av === 'string') return dir * (String(av).localeCompare(String(bv)));
        return dir * (Number(av) - Number(bv));
      });
    }
    return list;
  }, [filteredCompetitions, columnFilters, sortConfig]);

  const groupedAndPaginated = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      return filteredAndSorted.slice(start, start + pagination.rowsPerPage).map((row) => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSorted.forEach((row) => {
      const k = String(row[groupByField] ?? 'Unknown');
      if (!groups[k]) groups[k] = [];
      groups[k].push(row);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      const an = Number(a),
        bn = Number(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a).localeCompare(String(b));
    });
    const out = [];
    keys.forEach((k) => {
      out.push({
        type: 'group-header',
        groupKey: k,
        groupValue: groups[k][0][groupByField],
        count: groups[k].length,
        isExpanded: expandedGroups.has(k),
      });
      if (expandedGroups.has(k)) groups[k].forEach((r) => out.push({ type: 'row', data: r }));
    });
    const start = pagination.page * pagination.rowsPerPage;
    return out.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    return filteredAndSorted.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, pagination.page, pagination.rowsPerPage]);

  useEffect(() => {
    setPagination((p) => {
      const total = filteredAndSorted.length;
      const maxPage = total === 0 ? 0 : Math.max(0, Math.ceil(total / p.rowsPerPage) - 1);
      return { ...p, totalRows: total, page: Math.min(p.page, maxPage) };
    });
  }, [filteredAndSorted.length]);

  const openScreensDialog = (e, row) => {
    e.stopPropagation();
    setScreensDialogCompetition(row);
    setScreensDialogOpen(true);
  };

  const closeScreensDialog = () => {
    setScreensDialogOpen(false);
    setScreensDialogCompetition(null);
  };

  const handleScreensDialogItemClick = (path) => {
    closeScreensDialog();
    if (path) window.open(path, '_blank');
  };

  const handleNameClick = async (e, row) => {
    e.stopPropagation();
    if (!row?.NAME_ID) return;
    try {
      const term = await api.getTermById(row.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleExportCsv = () => {
    const rows = selectedRows.length > 0
      ? competitions.filter((c) => selectedRows.includes(c.COMPETITION_ID))
      : filteredCompetitions;
    if (rows.length === 0) {
      setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
      return;
    }
    const headers = ['COMPETITION_ID', 'name', 'countryName', 'sport', 'GENDER', 'MAIN_COLOR', 'HIDE_ON_CATALOG', 'HIDE_ON_SEARCH', 'ENABLE_DASHBOARD_BUZZ'];
    const lines = [headers.join(',')];
    rows.forEach((r) => {
      const mainHex = numberToHex(r.MAIN_COLOR) || '';
      lines.push(
        [
          r.COMPETITION_ID,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${(r.countryName || r.country || '').replace(/"/g, '""')}"`,
          `"${(r.sport || '').replace(/"/g, '""')}"`,
          r.GENDER ?? '',
          mainHex,
          r.HIDE_ON_CATALOG === true ? 'Yes' : r.HIDE_ON_CATALOG === false ? 'No' : '',
          r.HIDE_ON_SEARCH === true ? 'Yes' : r.HIDE_ON_SEARCH === false ? 'No' : '',
          r.ENABLE_DASHBOARD_BUZZ === true ? 'Yes' : r.ENABLE_DASHBOARD_BUZZ === false ? 'No' : '',
        ].join(',')
      );
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({
      open: true,
      message: `Exported ${rows.length} competition(s)`,
      severity: 'success',
    });
  };

  const handleTermSave = () => {
    setTermModalOpen(false);
    setCurrentTerm(null);
    handleSearch();
  };


  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Soft-delete ${selectedRows.length} selected competition(s)?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedRows.map((id) => api.updateCompetition(id, { IS_DELETED: true })));
      setSelectedRows([]);
      const data = await api.getCompetitions({ showDeleted });
      setCompetitions(data || []);
      setPagination((p) => ({ ...p, totalRows: (data || []).length, page: 0 }));
      setSnackbar({ open: true, message: `Deleted ${selectedRows.length} competition(s)`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Restore ${selectedRows.length} selected competition(s)?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedRows.map((id) => api.updateCompetition(id, { IS_DELETED: false })));
      setSelectedRows([]);
      const data = await api.getCompetitions({ showDeleted });
      setCompetitions(data || []);
      setPagination((p) => ({ ...p, totalRows: (data || []).length, page: 0 }));
      setSnackbar({ open: true, message: `Restored ${selectedRows.length} competition(s)`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Restore failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: 'COMPETITION_ID',
        header: 'ID',
        width: 70,
        render: (value) => <Typography sx={{ color: '#1976d2', fontWeight: 500 }}>{value}</Typography>,
      },
      {
        field: 'name',
        header: 'Name',
        width: 160,
        render: (value, row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={row.COMPETITION_IMAGE_URL || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: row.COMPETITION_IMAGE_URL ? 'transparent' : '#1976d2',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Typography
              component="span"
              onClick={(e) => handleNameClick(e, row)}
              sx={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.875rem', '&:hover': { textDecoration: 'underline' } }}
            >
              {value || `Competition ${row.COMPETITION_ID}`}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'countryName',
        header: 'Country',
        width: 140,
        render: (value, row) =>
          isEditMode ? (
            <Autocomplete
              size="small"
              options={countries}
              getOptionLabel={(o) => o.name || ''}
              value={countries.find((c) => c.COUNTRY_ID === (pendingChanges[row.COMPETITION_ID]?.COUNTRY_ID ?? row.COUNTRY_ID)) || null}
              onChange={(e, v) => handleFieldChange(row.COMPETITION_ID, 'COUNTRY_ID', v ? v.COUNTRY_ID : null)}
              renderInput={(params) => <TextField {...params} sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' } }} />}
              sx={{ minWidth: 120 }}
              disableClearable={false}
            />
          ) : (
            row.countryName || row.country || '-'
          ),
      },
      {
        field: 'sport',
        header: 'Sport',
        width: 130,
        render: (value, row) =>
          isEditMode ? (
            <Autocomplete
              size="small"
              options={sports}
              getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''}
              value={sports.find((s) => s.SPORT_TYPE_ID === (pendingChanges[row.COMPETITION_ID]?.SPORT_TYPE_ID ?? row.SPORT_TYPE_ID)) || null}
              onChange={(e, v) => handleFieldChange(row.COMPETITION_ID, 'SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : null)}
              renderInput={(params) => <TextField {...params} sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' } }} />}
              sx={{ minWidth: 110 }}
              disableClearable={false}
            />
          ) : (
            value || '-'
          ),
      },
      {
        field: 'GENDER',
        header: 'Gender',
        width: 90,
        render: (value, row) =>
          isEditMode ? (
            <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
              <Select
                value={pendingChanges[row.COMPETITION_ID]?.GENDER ?? row.GENDER ?? ''}
                onChange={(e) => handleFieldChange(row.COMPETITION_ID, 'GENDER', e.target.value === '' ? null : Number(e.target.value))}
                displayEmpty
                sx={{ height: 32, fontSize: '0.875rem' }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          ) : (
            (row.GENDER === 1 ? 'Male' : row.GENDER === 2 ? 'Female' : '—')
          ),
      },
      {
        field: 'COMPETITION_TYPE',
        header: 'Type',
        width: 120,
        render: (value, row) =>
          isEditMode ? (
            <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
              <Select
                value={pendingChanges[row.COMPETITION_ID]?.COMPETITION_TYPE ?? row.COMPETITION_TYPE ?? ''}
                onChange={(e) => handleFieldChange(row.COMPETITION_ID, 'COMPETITION_TYPE', e.target.value === '' ? null : Number(e.target.value))}
                displayEmpty
                sx={{ height: 32, fontSize: '0.875rem' }}
              >
                <MenuItem value="">—</MenuItem>
                {competitionTypes.map((ct) => (
                  <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            competitionTypes.find((ct) => ct.COMPETITION_TYPE_ID === row.COMPETITION_TYPE)?.COMPETITION_TYPE || '—'
          ),
      },
      {
        field: 'MAIN_COLOR',
        header: 'Colors',
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
      {
        field: 'HIDE_ON_CATALOG',
        header: 'Hide Catalog',
        width: 90,
        render: (value, row) =>
          isEditMode ? (
            <Checkbox
              size="small"
              checked={!!(pendingChanges[row.COMPETITION_ID]?.HIDE_ON_CATALOG ?? row.HIDE_ON_CATALOG)}
              onChange={(e) => handleFieldChange(row.COMPETITION_ID, 'HIDE_ON_CATALOG', e.target.checked)}
            />
          ) : (
            row.HIDE_ON_CATALOG === true ? 'Yes' : row.HIDE_ON_CATALOG === false ? 'No' : '—'
          ),
      },
      {
        field: 'HIDE_ON_SEARCH',
        header: 'Hide Search',
        width: 90,
        render: (value, row) =>
          isEditMode ? (
            <Checkbox
              size="small"
              checked={!!(pendingChanges[row.COMPETITION_ID]?.HIDE_ON_SEARCH ?? row.HIDE_ON_SEARCH)}
              onChange={(e) => handleFieldChange(row.COMPETITION_ID, 'HIDE_ON_SEARCH', e.target.checked)}
            />
          ) : (
            row.HIDE_ON_SEARCH === true ? 'Yes' : row.HIDE_ON_SEARCH === false ? 'No' : '—'
          ),
      },
      {
        field: 'ENABLE_DASHBOARD_BUZZ',
        header: 'Dashboard Buzz',
        width: 100,
        render: (value, row) =>
          isEditMode ? (
            <Checkbox
              size="small"
              checked={!!(pendingChanges[row.COMPETITION_ID]?.ENABLE_DASHBOARD_BUZZ ?? row.ENABLE_DASHBOARD_BUZZ)}
              onChange={(e) => handleFieldChange(row.COMPETITION_ID, 'ENABLE_DASHBOARD_BUZZ', e.target.checked)}
            />
          ) : (
            row.ENABLE_DASHBOARD_BUZZ === true ? 'Yes' : row.ENABLE_DASHBOARD_BUZZ === false ? 'No' : '—'
          ),
      },
      {
        field: '_',
        header: 'Screens',
        width: 70,
        noFilter: true,
        render: (value, row) => (
          <IconButton size="small" onClick={(e) => openScreensDialog(e, row)} title="Screens" sx={{ color: '#1976d2' }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [isEditMode, pendingChanges, handleNameClick, handleFieldChange, openScreensDialog, numberToHex, hexToNumber, competitionTypes, countries, sports]
  );

  const handleOpenCreateDialog = () => {
    setCreateFormData({ name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: 1, COMPETITION_TYPE: 1 });
    setCreateFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateFormChange = (field, value) => {
    setCreateFormData((prev) => ({ ...prev, [field]: value }));
    setCreateFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCreateCompetition = async () => {
    const err = {};
    if (!createFormData.name || String(createFormData.name).trim() === '') err.name = 'Required';
    if (createFormData.COUNTRY_ID === '' || createFormData.COUNTRY_ID == null) err.COUNTRY_ID = 'Required';
    if (createFormData.SPORT_TYPE_ID === '' || createFormData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    setCreateFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setCreateSaving(true);
    try {
      const newTerm = await api.createTerm({
        category: 'Competitions Names',
        values: [
          { languageId: 1, value: createFormData.name.trim(), isDefault: true, status: 'Approved' },
        ],
      });
      const res = await api.createCompetition({
        NAME_ID: newTerm.id,
        COUNTRY_ID: Number(createFormData.COUNTRY_ID),
        SPORT_TYPE_ID: Number(createFormData.SPORT_TYPE_ID),
        GENDER: Number(createFormData.GENDER),
        COMPETITION_TYPE: Number(createFormData.COMPETITION_TYPE),
      });
      const created = (res && res.data) ? res.data : res;
      setCreateDialogOpen(false);
      const data = await api.getCompetitions({ showDeleted });
      setCompetitions(data || []);
      setPagination((p) => ({ ...p, totalRows: (data || []).length, page: 0 }));
      setSnackbar({ open: true, message: 'Competition created', severity: 'success' });
      if (created && created.COMPETITION_ID) navigate(`/competitions/${created.COMPETITION_ID}`);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Create failed', severity: 'error' });
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading && competitions.length === 0) {
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

  const countryOptions = countries.map((c) => ({ ...c, label: c.name }));
  const sportOptions = sports.map((s) => ({ ...s, label: s.name || s.ALIAS_NAME || '' }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
          Competitions List
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create Competition
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Autocomplete
              multiple
              size="small"
              options={countryOptions}
              getOptionLabel={(o) => o.name || o.label || ''}
              value={countryOptions.filter((o) => (filters.country || []).some((f) => (typeof f === 'object' ? f?.name : f) === (o.name || o.label)))}
              onChange={(e, v) => handleFilterChange('country', v.map((x) => x.name))}
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
            <Autocomplete
              multiple
              size="small"
              options={sportOptions}
              getOptionLabel={(o) => o.label || o.name || o.ALIAS_NAME || ''}
              value={sportOptions.filter((o) =>
                (filters.sportType || []).some((f) => {
                  const fn = typeof f === 'object' ? (f?.name || f?.ALIAS_NAME) : f;
                  return fn === (o.name || o.ALIAS_NAME || o.label);
                })
              )}
              onChange={(e, v) => handleFilterChange('sportType', v.map((x) => x.name || x.ALIAS_NAME))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sport Type"
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
              label="Competition ID"
              value={filters.competitionId || ''}
              onChange={(e) => handleFilterChange('competitionId', e.target.value)}
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
              <InputLabel sx={{ fontSize: '0.875rem' }}>Gender</InputLabel>
              <Select
                value={filters.gender ?? ''}
                label="Gender"
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0E0E0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '& .MuiSelect-icon': { color: '#666666' },
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.875rem' }}>Competition Type</InputLabel>
              <Select
                value={filters.competitionType ?? ''}
                label="Competition Type"
                onChange={(e) => handleFilterChange('competitionType', e.target.value)}
                sx={{
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0E0E0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '& .MuiSelect-icon': { color: '#666666' },
                }}
              >
                <MenuItem value="">All</MenuItem>
                {competitionTypes.map((ct) => (
                  <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
              control={<Switch size="small" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />}
              label="Show Deleted"
              sx={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#ffffff' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 'max-content', '& .MuiTableCell-root': { borderColor: '#EAECF0', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#fff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12, py: 1, px: 1.5, whiteSpace: 'nowrap' } }}>
                <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRows(paginatedData.map((r) => r.COMPETITION_ID));
                      else setSelectedRows([]);
                    }}
                    size="small"
                  />
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.field + (col.header || '')} sx={{ borderColor: '#EAECF0', width: col.width, minWidth: col.width, whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{col.header}</Typography>
                        {!col.noFilter && (
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
                        )}
                      </Box>
                      {!col.noFilter && (
                        <TextField
                          size="small"
                          placeholder="Filter"
                          value={columnFilters[col.field] || ''}
                          onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                          sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.8125rem', bgcolor: '#F9FAFB' } }}
                        />
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedAndPaginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                    <Typography color="text.secondary">
                      {competitions.length === 0 ? 'No competitions found. Click Search to load data.' : 'No competitions match the current filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                groupedAndPaginated.map((item, idx) => {
                  if (item.type === 'group-header') {
                    return (
                      <TableRow
                        key={`gh-${item.groupKey}-${idx}`}
                        sx={{ bgcolor: '#F5F5F5', '& td': { borderColor: '#EAECF0', fontWeight: 600 } }}
                        onClick={() => handleToggleGroup(item.groupKey)}
                      >
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
                      key={row.COMPETITION_ID}
                      hover
                      onClick={() => !isEditMode && navigate(`/competitions/${row.COMPETITION_ID}`)}
                      sx={{
                        cursor: isEditMode ? 'default' : 'pointer',
                        '&:hover': { backgroundColor: showDeleted && isDeleted ? 'rgba(0,0,0,0.06)' : '#F9FAFB' },
                        '&.Mui-selected': { backgroundColor: showDeleted && isDeleted ? '#e0e0e0' : '#E3F2FD' },
                        '& td': { borderColor: '#EAECF0' },
                        ...(showDeleted && isDeleted ? { backgroundColor: '#f5f5f5', opacity: 0.85, '& td': { color: '#666' } } : {}),
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ borderColor: '#EAECF0' }}>
                        <Checkbox
                          size="small"
                          checked={selectedRows.includes(row.COMPETITION_ID)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) setSelectedRows([...selectedRows, row.COMPETITION_ID]);
                            else setSelectedRows(selectedRows.filter((id) => id !== row.COMPETITION_ID));
                          }}
                        />
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.field + (col.header || '')} sx={{ borderColor: '#EAECF0', width: col.width }} onClick={col.field === 'GENDER' || col.field === 'countryName' || col.field === 'sport' || col.field === 'COMPETITION_TYPE' || col.field === 'HIDE_ON_CATALOG' || col.field === 'HIDE_ON_SEARCH' || col.field === 'ENABLE_DASHBOARD_BUZZ' || col.field === '_' ? (e) => e.stopPropagation() : undefined}>
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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 2, borderTop: '1px solid #EAECF0', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant={isEditMode ? 'contained' : 'outlined'}
              size="small"
              startIcon={isEditMode ? <CancelIcon /> : <EditIcon />}
              onClick={handleToggleEditMode}
              sx={{
                borderColor: isEditMode ? 'transparent' : '#E0E0E0',
                backgroundColor: isEditMode ? '#1976d2' : '#ffffff',
                color: isEditMode ? '#fff' : '#000',
                textTransform: 'none',
              }}
            >
              {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {isEditMode && (
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
                disabled={Object.keys(pendingChanges).length === 0}
                sx={{
                  backgroundColor: '#4caf50',
                  textTransform: 'none',
                  '&.Mui-disabled': { backgroundColor: '#ccc' },
                }}
              >
                Save Changes ({Object.keys(pendingChanges).length})
              </Button>
            )}
            {selectedRows.length > 0 && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedRows.length} selected
                </Typography>
                <Button size="small" variant="text" onClick={() => setSelectedRows([])} sx={{ textTransform: 'none' }}>
                  Clear selection
                </Button>
              </>
            )}
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={handleBulkDelete} disabled={selectedRows.length === 0} sx={{ textTransform: 'none' }}>
              Delete selected ({selectedRows.length})
            </Button>
            {showDeleted && (
              <Button size="small" variant="outlined" startIcon={<RestoreIcon />} onClick={handleBulkRestore} disabled={selectedRows.length === 0} sx={{ textTransform: 'none' }}>
                Restore selected ({selectedRows.length})
              </Button>
            )}
            <Button variant="outlined" size="small" onClick={handleExportCsv} sx={{ borderColor: '#E0E0E0', color: '#000', textTransform: 'none' }}>
              Export to CSV ({selectedRows.length})
            </Button>
            <Typography variant="body2" sx={{ fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', fontSize: '0.875rem' }}>
              Items per page:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pagination.rowsPerPage}
                onChange={(e) => setPagination((p) => ({ ...p, rowsPerPage: Number(e.target.value), page: 0 }))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {pagination.page * pagination.rowsPerPage + 1}-{Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton size="small" onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 0}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      <Dialog open={screensDialogOpen} onClose={closeScreensDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #EAECF0', pb: 1.5 }}>
          Screens{screensDialogCompetition ? ` — ${screensDialogCompetition.name || `Competition ${screensDialogCompetition.COMPETITION_ID}`}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[
              { label: 'Reports', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/reports` : '' },
              { label: 'Priorities', path: screensDialogCompetition ? `/priorities?competition=${screensDialogCompetition.COMPETITION_ID}` : '' },
              { label: 'Bet Lines (0)', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/bet-lines` : '' },
              { label: `Partner ID's (${screensDialogCompetition ? (partnerCountByCompId[screensDialogCompetition.COMPETITION_ID] ?? 0) : 0})`, path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/partner-ids` : '' },
              { label: 'Team of The Week', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/team-of-the-week` : '' },
              { label: 'Cards Order', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/cards-order` : '' },
              { label: 'Featured Match', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/featured-match` : '' },
              { label: 'Draw', path: screensDialogCompetition ? `/competitions/${screensDialogCompetition.COMPETITION_ID}/draw` : '' },
            ].map((item) => (
              <Button
                key={item.label}
                fullWidth
                variant="text"
                onClick={() => handleScreensDialogItemClick(item.path)}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #EAECF0', pb: 1.5 }}>Create Competition</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                required
                label="Name (Competitions Names)"
                value={createFormData.name ?? ''}
                onChange={(e) => handleCreateFormChange('name', e.target.value)}
                error={!!createFormErrors.name}
                helperText={createFormErrors.name}
                placeholder="Enter competition name"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required error={!!createFormErrors.COUNTRY_ID}>
                <InputLabel>Country</InputLabel>
                <Select
                  value={createFormData.COUNTRY_ID ?? ''}
                  label="Country"
                  onChange={(e) => handleCreateFormChange('COUNTRY_ID', e.target.value)}
                >
                  <MenuItem value="">—</MenuItem>
                  {countries.map((c) => (
                    <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>{c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}</MenuItem>
                  ))}
                </Select>
                {createFormErrors.COUNTRY_ID && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{createFormErrors.COUNTRY_ID}</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required error={!!createFormErrors.SPORT_TYPE_ID}>
                <InputLabel>Sport Type</InputLabel>
                <Select
                  value={createFormData.SPORT_TYPE_ID ?? ''}
                  label="Sport Type"
                  onChange={(e) => handleCreateFormChange('SPORT_TYPE_ID', e.target.value)}
                >
                  <MenuItem value="">—</MenuItem>
                  {sports.map((s) => (
                    <MenuItem key={s.SPORT_TYPE_ID} value={s.SPORT_TYPE_ID}>{s.name || s.ALIAS_NAME || ''}</MenuItem>
                  ))}
                </Select>
                {createFormErrors.SPORT_TYPE_ID && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{createFormErrors.SPORT_TYPE_ID}</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={createFormData.GENDER ?? 1} label="Gender" onChange={(e) => handleCreateFormChange('GENDER', Number(e.target.value))}>
                  <MenuItem value={1}>Male</MenuItem>
                  <MenuItem value={2}>Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Competition Type</InputLabel>
                <Select value={createFormData.COMPETITION_TYPE ?? 1} label="Competition Type" onChange={(e) => handleCreateFormChange('COMPETITION_TYPE', Number(e.target.value))}>
                  {competitionTypes.map((ct) => (
                    <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreateCompetition} variant="contained" disabled={createSaving} sx={{ textTransform: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>

      {termModalOpen && currentTerm && (
        <TermEditModal
          open={termModalOpen}
          term={currentTerm}
          onClose={() => { setTermModalOpen(false); setCurrentTerm(null); }}
          onSave={handleTermSave}
          allTerms={allTerms}
          allCategories={allCategories}
          initialCategory="Competitions Names"
        />
      )}
    </Box>
  );
}

export default CompetitionsList;
