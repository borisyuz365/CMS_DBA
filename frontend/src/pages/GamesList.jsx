import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
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
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  FormHelperText,
  Switch,
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ViewListIcon from '@mui/icons-material/ViewList';
import PublicIcon from '@mui/icons-material/Public';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ClearIcon from '@mui/icons-material/Clear';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import api from '../services/api';
import useUrlFilters from '../hooks/useUrlFilters';

// Simple status labels (extend as needed from game_statuses)
const STATUS_LABELS = {
  2: 'Scheduled',
  12: '1st Half',
  23: 'Ended',
};

function getStatusLabel(status) {
  if (status == null) return '-';
  return STATUS_LABELS[status] ?? `Status ${status}`;
}

function formatStartTime(val) {
  if (!val) return '-';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '-' : dayjs(d).format('MM-DD-YY HH:mm');
  } catch {
    return '-';
  }
}

const DEFAULT_CREATE_FORM = {
  COUNTRY_ID: '',
  COMPETITION_ID: '',
  COMPETITOR1: '',
  COMPETITOR2: '',
  STARTTIME: null,
  VENUE_ID: '',
  SPORTTYPE_ID: 1,
};

function GamesList() {
  const [urlState, setUrlState] = useUrlFilters({
    countryId: { type: 'string', default: '' },
    sportId: { type: 'string', default: '' },
    competitionId: { type: 'string', default: '' },
    teamId: { type: 'string', default: '' },
    gameId: { type: 'string', default: '' },
    searchPartnerId: { type: 'string', default: '' },
    dateFrom: { type: 'string', default: '' },
    dateTo: { type: 'string', default: '' },
    hideDeleted: { type: 'boolean', default: true },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 25 },
    sortField: { type: 'string', default: '' },
    sortDir: { type: 'string', default: 'asc' },
    groupBy: { type: 'string', default: '' },
  });

  const [totalRows, setTotalRows] = useState(0);

  const filters = {
    countryId: urlState.countryId,
    sportId: urlState.sportId,
    competitionId: urlState.competitionId,
    teamId: urlState.teamId,
    gameId: urlState.gameId,
    searchPartnerId: urlState.searchPartnerId,
    dateFrom: urlState.dateFrom ? dayjs(urlState.dateFrom) : dayjs(),
    dateTo: urlState.dateTo ? dayjs(urlState.dateTo) : dayjs(),
    hideDeleted: urlState.hideDeleted,
  };
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage, totalRows };
  const sortConfig = { field: urlState.sortField || null, direction: urlState.sortDir };
  const groupByField = urlState.groupBy || null;

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(DEFAULT_CREATE_FORM);
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [seasonCompetitors, setSeasonCompetitors] = useState([]);

  // Lookup data for enrichment and filters
  const [countries, setCountries] = useState([]);
  const [sports, setSports] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [venues, setVenues] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    loadLookupData().then(() => {
      if (window.location.search) handleSearch();
    });
  }, []);

  const loadLookupData = async () => {
    try {
      const [c, s, comp, comps, v, t] = await Promise.all([
        api.getCountries(),
        api.getSports(),
        api.getCompetitions(),
        api.getCompetitors(),
        api.getVenues(),
        api.getTerms(),
      ]);
      setCountries(Array.isArray(c) ? c : []);
      setSports(Array.isArray(s) ? s : []);
      setCompetitions(Array.isArray(comp) ? comp : []);
      setCompetitors(Array.isArray(comps) ? comps : []);
      setVenues(Array.isArray(v) ? v : []);
      setTerms(Array.isArray(t) ? t : []);
    } catch (err) {
      console.warn('Failed to load lookup data:', err);
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const filterParams = {};

      if (filters.gameId) {
        filterParams.gameId = filters.gameId;
      } else {
        if (filters.countryId) filterParams.countryId = filters.countryId;
        if (filters.sportId) filterParams.sportId = filters.sportId;
        if (filters.competitionId) filterParams.competitionId = filters.competitionId;
        if (filters.teamId) filterParams.teamId = filters.teamId;
        if (filters.searchPartnerId) filterParams.searchPartnerId = filters.searchPartnerId;
        if (filters.dateFrom) filterParams.dateFrom = dayjs(filters.dateFrom).format('YYYY-MM-DD');
        if (filters.dateTo) filterParams.dateTo = dayjs(filters.dateTo).format('YYYY-MM-DD');
        if (filters.hideDeleted) filterParams.hideDeleted = true;
      }

      const data = await api.getGamesList(filterParams);
      setGames(Array.isArray(data) ? data : []);
      setTotalRows((data || []).length);
      setUrlState({ page: 0 });
    } catch (err) {
      console.error('Failed to load games:', err);
      setError(err.message || 'Failed to load games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  // No auto-load on mount - screen stays empty until user clicks Search

  const handleSearch = () => {
    loadGames();
  };

  const getTermValue = (termId) => {
    if (!termId) return null;
    const term = terms.find(t => t.id === termId || t.TERM_ID === termId);
    if (!term?.values?.length) return null;
    const def = term.values.find(v => v.isDefault || v.languageId === 1);
    return def?.value ?? term.values[0]?.value;
  };

  const getCompetitionName = (competitionId) => {
    const comp = competitions.find(c => (c.COMPETITION_ID ?? c.competitionId) === competitionId);
    if (!comp) return '-';
    return getTermValue(comp.NAME_ID) ?? '-';
  };

  const getCountryForCompetition = (competitionId) => {
    const comp = competitions.find(c => (c.COMPETITION_ID ?? c.competitionId) === competitionId);
    return comp ? (comp.COUNTRY_ID ?? comp.countryId) : null;
  };

  const getCountryName = (countryId) => {
    const country = countries.find(c => (c.COUNTRY_ID ?? c.countryId) === countryId);
    return country ? (getTermValue(country.NAME_ID) ?? country.name ?? '-') : '-';
  };

  const getCompetitorName = (competitorId) => {
    const id = parseInt(competitorId, 10);
    if (isNaN(id)) return '-';
    const comp = competitors.find(c => (c.COMPETITOR_ID ?? c.competitorId) === id);
    if (!comp) return `#${id}`;
    return getTermValue(comp.NAME_ID) ?? comp.name ?? `#${id}`;
  };

  const getCompetitorNamesFromGameKey = (gameKey) => {
    if (!gameKey || typeof gameKey !== 'string') return ['-', '-'];
    const parts = gameKey.split('-').map(p => p.trim()).filter(Boolean);
    return [
      parts[0] ? getCompetitorName(parts[0]) : '-',
      parts[1] ? getCompetitorName(parts[1]) : '-',
    ];
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...games];
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
  }, [games, columnFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    return filteredAndSorted.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, pagination.page, pagination.rowsPerPage]);

  useEffect(() => {
    setTotalRows(filteredAndSorted.length);
  }, [filteredAndSorted.length]);

  const handleSort = (field) => {
    setUrlState(prev => ({ sortField: field, sortDir: prev.sortField === field && prev.sortDir === 'asc' ? 'desc' : 'asc' }));
  };

  const handleGroupBy = (field) => {
    setUrlState(prev => ({ groupBy: prev.groupBy === field ? '' : field }));
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setUrlState({
      countryId: '',
      sportId: '',
      competitionId: '',
      teamId: '',
      gameId: '',
      searchPartnerId: '',
      dateFrom: '',
      dateTo: '',
      hideDeleted: true,
      page: 0,
    });
    setColumnFilters({});
  };

  const handleOpenCreateDialog = () => {
    setCreateFormData({
      ...DEFAULT_CREATE_FORM,
      STARTTIME: dayjs().add(1, 'day'),
    });
    setCreateFormErrors({});
    setSeasonCompetitors([]);
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData(DEFAULT_CREATE_FORM);
    setCreateFormErrors({});
  };

  const handleCreateFormChange = async (field, value) => {
    setCreateFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'COUNTRY_ID') {
        next.COMPETITION_ID = '';
        next.COMPETITOR1 = '';
        next.COMPETITOR2 = '';
      } else if (field === 'COMPETITION_ID') {
        next.COMPETITOR1 = '';
        next.COMPETITOR2 = '';
      } else if (field === 'COMPETITOR1' && value === prev.COMPETITOR2) {
        next.COMPETITOR2 = '';
      }
      return next;
    });
    if (createFormErrors[field]) setCreateFormErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'COMPETITION_ID' && value) {
      const comp = competitions.find(c => (c.COMPETITION_ID ?? c.competitionId) === value);
      const seasonNum = comp?.CURRENT_SEASON ?? 1;
      try {
        const list = await api.getSeasonCompetitors(value, seasonNum);
        setSeasonCompetitors(Array.isArray(list) ? list : []);
      } catch {
        setSeasonCompetitors([]);
      }
    } else if (field === 'COUNTRY_ID') {
      setSeasonCompetitors([]);
    }
  };

  const validateCreate = () => {
    const err = {};
    if (!createFormData.COUNTRY_ID && createFormData.COUNTRY_ID !== 0) err.COUNTRY_ID = 'Required';
    if (!createFormData.COMPETITION_ID && createFormData.COMPETITION_ID !== 0) err.COMPETITION_ID = 'Required';
    if (!createFormData.COMPETITOR1) err.COMPETITOR1 = 'Required';
    if (!createFormData.COMPETITOR2) err.COMPETITOR2 = 'Required';
    if (createFormData.COMPETITOR1 && createFormData.COMPETITOR2 && createFormData.COMPETITOR1 === createFormData.COMPETITOR2) {
      err.COMPETITOR2 = 'Cannot select the same competitor for both teams';
    }
    if (!createFormData.STARTTIME) err.STARTTIME = 'Required';
    if (!createFormData.VENUE_ID && createFormData.VENUE_ID !== 0) err.VENUE_ID = 'Required';
    setCreateFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleCreateGame = async () => {
    if (!validateCreate()) return;
    try {
      setLoading(true);
      setError(null);
      const comp = competitions.find(c => (c.COMPETITION_ID ?? c.competitionId) === createFormData.COMPETITION_ID);
      const seasonNum = comp?.CURRENT_SEASON ?? 1;
      const gameKey = `${createFormData.COMPETITOR1}-${createFormData.COMPETITOR2}`;
      const payload = {
        COMPETITION_ID: Number(createFormData.COMPETITION_ID),
        SEASON_NUM: seasonNum,
        STAGE_NUM: 1,
        ROUND_NUM: 1,
        GAME_KEY: gameKey,
        HOME_COMPETITOR_NUM: 1,
        STARTTIME: createFormData.STARTTIME?.toISOString?.() ?? createFormData.STARTTIME,
        VENUE_ID: Number(createFormData.VENUE_ID),
        SPORTTYPE_ID: Number(createFormData.SPORTTYPE_ID) || 1,
      };
      await api.createGame(payload);
      handleCloseCreateDialog();
      await loadGames();
      setSnackbar({ open: true, message: 'Game created successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create game', severity: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: 'GAME_ID', header: 'ID', width: 80 },
    { field: 'STARTTIME', header: 'Time', width: 120, render: (val) => formatStartTime(val) },
    { field: 'COMPETITION_ID', header: 'Competition', width: 160, render: (val) => getCompetitionName(val) },
    { field: 'COUNTRY', header: 'Country', width: 80, render: (_, row) => getCountryName(getCountryForCompetition(row.COMPETITION_ID)) },
    { field: 'COMPETITOR1', header: 'Competitor1', width: 140, render: (_, row) => getCompetitorNamesFromGameKey(row.GAME_KEY)[0] },
    { field: 'COMPETITOR2', header: 'Competitor2', width: 140, render: (_, row) => getCompetitorNamesFromGameKey(row.GAME_KEY)[1] },
    { field: 'STATUS', header: 'Status', width: 90, render: (val) => getStatusLabel(val) },
    { field: 'GAMETIME', header: 'Time', width: 70 },
  ], [getCompetitionName, getCountryForCompetition, getCountryName, getCompetitorNamesFromGameKey]);

  if (loading && games.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && games.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000', fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif' }}>
          Games
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}>
          Create
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#fff' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Countries</InputLabel>
              <Select
                value={filters.countryId}
                onChange={(e) => setUrlState({ countryId: e.target.value })}
                label="Countries"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              >
                <MenuItem value="">Please select countries</MenuItem>
                {countries.map(c => (
                  <MenuItem key={c.COUNTRY_ID ?? c.countryId} value={c.COUNTRY_ID ?? c.countryId}>
                    {getTermValue(c.NAME_ID) ?? c.name ?? c.COUNTRY_ID}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Sport</InputLabel>
              <Select
                value={filters.sportId}
                onChange={(e) => setUrlState({ sportId: e.target.value })}
                label="Sport"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              >
                <MenuItem value="">Please select sport</MenuItem>
                {sports.map(s => (
                  <MenuItem key={s.SPORT_TYPE_ID ?? s.sportTypeId} value={s.SPORT_TYPE_ID ?? s.sportTypeId}>
                    {s.ALIAS_NAME ?? s.aliasName ?? s.SPORT_TYPE_ID}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Leagues</InputLabel>
              <Select
                value={filters.competitionId}
                onChange={(e) => setUrlState({ competitionId: e.target.value })}
                label="Leagues"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              >
                <MenuItem value="">Please select leagues</MenuItem>
                {competitions.map(c => (
                  <MenuItem key={c.COMPETITION_ID ?? c.competitionId} value={c.COMPETITION_ID ?? c.competitionId}>
                    {getTermValue(c.NAME_ID) ?? c.COMPETITION_ID}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Teams</InputLabel>
              <Select
                value={filters.teamId}
                onChange={(e) => setUrlState({ teamId: e.target.value })}
                label="Teams"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              >
                <MenuItem value="">Please select teams</MenuItem>
                {competitors.slice(0, 200).map(c => (
                  <MenuItem key={c.COMPETITOR_ID ?? c.competitorId} value={String(c.COMPETITOR_ID ?? c.competitorId)}>
                    {getTermValue(c.NAME_ID) ?? c.name ?? c.COMPETITOR_ID}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <TextField
              fullWidth
              size="small"
              label="Game ID"
              value={filters.gameId}
              onChange={(e) => setUrlState({ gameId: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <TextField
              fullWidth
              size="small"
              label="SEARCH_PARTNER_ID"
              value={filters.searchPartnerId}
              onChange={(e) => setUrlState({ searchPartnerId: e.target.value })}
              InputProps={{
                endAdornment: filters.searchPartnerId ? (
                  <IconButton size="small" onClick={() => setUrlState({ searchPartnerId: '' })}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              }}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <DatePicker
              label="Between"
              value={filters.dateFrom}
              onChange={(v) => setUrlState({ dateFrom: v ? v.toISOString() : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.2}>
            <DatePicker
              label="AND"
              value={filters.dateTo}
              onChange={(v) => setUrlState({ dateTo: v ? v.toISOString() : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={!filters.hideDeleted}
                  onChange={(e) => setUrlState({ hideDeleted: !e.target.checked })}
                  size="small"
                />
              }
              label="Hide Deleted"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#fff' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { borderColor: '#EAECF0' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#fff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12, py: 1, px: 1.5 } }}>
                <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                    onChange={(e) => setSelectedRows(e.target.checked ? paginatedData.map(r => r.GAME_ID) : [])}
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
                      <TextField
                        size="small"
                        placeholder="Filter"
                        value={columnFilters[col.field] || ''}
                        onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                        sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.8125rem', bgcolor: '#F9FAFB' } }}
                      />
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                    No games found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.GAME_ID} hover sx={{ '& td': { borderColor: '#EAECF0' } }}>
                    <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                      <Checkbox
                        checked={selectedRows.includes(row.GAME_ID)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRows(prev => [...prev, row.GAME_ID]);
                          else setSelectedRows(prev => prev.filter(id => id !== row.GAME_ID));
                        }}
                        size="small"
                      />
                    </TableCell>
                    {columns.map((col) => {
                      const val = col.render ? col.render(row[col.field], row) : row[col.field];
                      return (
                        <TableCell key={col.field} sx={{ borderColor: '#EAECF0' }}>
                          {col.field === 'GAME_ID' ? (
                            <Link to={`/games/${row.GAME_ID}/report`} style={{ textDecoration: 'none' }}>
                              <Typography sx={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.875rem', '&:hover': { textDecoration: 'underline' } }}>
                                {val}
                              </Typography>
                            </Link>
                          ) : col.field === 'STARTTIME' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: '#999' }} />
                              {val}
                            </Box>
                          ) : col.field === 'COUNTRY' ? (
                            <PublicIcon sx={{ fontSize: 18 }} titleAccess={val} />
                          ) : (
                            val ?? '-'
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, borderTop: '1px solid #EAECF0' }}>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
            {pagination.totalRows} rows
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
              Rows per page:
            </Typography>
            <Select
              size="small"
              value={pagination.rowsPerPage}
              onChange={(e) => setUrlState({ rowsPerPage: Number(e.target.value), page: 0 })}
              sx={{ minWidth: 60, height: 32 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
              {pagination.page * pagination.rowsPerPage + 1}-
              {Math.min((pagination.page + 1) * pagination.rowsPerPage, pagination.totalRows)} of {pagination.totalRows}
            </Typography>
            <IconButton
              size="small"
              disabled={pagination.page === 0}
              onClick={() => setUrlState(prev => ({ page: Math.max(0, prev.page - 1) }))}
            >
              ←
            </IconButton>
            <IconButton
              size="small"
              disabled={(pagination.page + 1) * pagination.rowsPerPage >= pagination.totalRows}
              onClick={() => setUrlState(prev => ({ page: prev.page + 1 }))}
            >
              →
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Game</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!createFormErrors.COUNTRY_ID}>
                <InputLabel>Country *</InputLabel>
                <Select
                  value={createFormData.COUNTRY_ID}
                  onChange={(e) => handleCreateFormChange('COUNTRY_ID', e.target.value)}
                  label="Country *"
                >
                  <MenuItem value="">Select</MenuItem>
                  {countries.map(c => (
                    <MenuItem key={c.COUNTRY_ID ?? c.countryId} value={c.COUNTRY_ID ?? c.countryId}>
                      {getTermValue(c.NAME_ID) ?? c.name ?? (c.COUNTRY_ID ?? c.countryId)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!createFormErrors.COMPETITION_ID}>
                <InputLabel>Competition *</InputLabel>
                <Select
                  value={createFormData.COMPETITION_ID}
                  onChange={(e) => handleCreateFormChange('COMPETITION_ID', e.target.value)}
                  label="Competition *"
                  disabled={!createFormData.COUNTRY_ID}
                >
                  <MenuItem value="">Select</MenuItem>
                  {competitions
                    .filter(c => String(c.COUNTRY_ID ?? c.countryId) === String(createFormData.COUNTRY_ID))
                    .map(c => (
                      <MenuItem key={c.COMPETITION_ID} value={c.COMPETITION_ID}>
                        {getTermValue(c.NAME_ID) ?? c.COMPETITION_ID}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!createFormErrors.COMPETITOR1}>
                <InputLabel>Competitor 1 *</InputLabel>
                <Select
                  value={createFormData.COMPETITOR1}
                  onChange={(e) => handleCreateFormChange('COMPETITOR1', e.target.value)}
                  label="Competitor 1 *"
                  disabled={!createFormData.COMPETITION_ID}
                >
                  <MenuItem value="">Select</MenuItem>
                  {seasonCompetitors.map(c => (
                    <MenuItem key={c.COMPETITOR_ID} value={String(c.COMPETITOR_ID)}>
                      {c.name ?? `Competitor ${c.COMPETITOR_ID}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!createFormErrors.COMPETITOR2}>
                <InputLabel>Competitor 2 *</InputLabel>
                <Select
                  value={createFormData.COMPETITOR2}
                  onChange={(e) => handleCreateFormChange('COMPETITOR2', e.target.value)}
                  label="Competitor 2 *"
                  disabled={!createFormData.COMPETITION_ID}
                >
                  <MenuItem value="">Select</MenuItem>
                  {seasonCompetitors
                    .filter(c => String(c.COMPETITOR_ID) !== createFormData.COMPETITOR1)
                    .map(c => (
                      <MenuItem key={c.COMPETITOR_ID} value={String(c.COMPETITOR_ID)}>
                        {c.name ?? `Competitor ${c.COMPETITOR_ID}`}
                      </MenuItem>
                    ))}
                </Select>
                {createFormErrors.COMPETITOR2 && <FormHelperText>{createFormErrors.COMPETITOR2}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time *"
                value={createFormData.STARTTIME}
                onChange={(v) => handleCreateFormChange('STARTTIME', v)}
                slotProps={{ textField: { fullWidth: true, size: 'small', error: !!createFormErrors.STARTTIME, helperText: createFormErrors.STARTTIME } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!createFormErrors.VENUE_ID}>
                <InputLabel>Venue *</InputLabel>
                <Select
                  value={createFormData.VENUE_ID}
                  onChange={(e) => handleCreateFormChange('VENUE_ID', e.target.value)}
                  label="Venue *"
                >
                  <MenuItem value="">Select</MenuItem>
                  {venues.map(v => (
                    <MenuItem key={v.VENUE_ID ?? v.venueId} value={v.VENUE_ID ?? v.venueId}>
                      {getTermValue(v.NAME_ID) ?? v.name ?? (v.VENUE_ID ?? v.venueId)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Sport Type</InputLabel>
                <Select
                  value={createFormData.SPORTTYPE_ID}
                  onChange={(e) => handleCreateFormChange('SPORTTYPE_ID', e.target.value)}
                  label="Sport Type"
                >
                  {sports.map(s => (
                    <MenuItem key={s.SPORT_TYPE_ID} value={s.SPORT_TYPE_ID}>{s.ALIAS_NAME ?? s.SPORT_TYPE_ID}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateGame} sx={{ backgroundColor: '#1976d2' }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default GamesList;
