import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Typography,
  Switch,
  Tooltip,
  TextField,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import DataTable from '../../reuse/DataTable';
import PageHeader from '../../reuse/PageHeader';
import PrimaryButton from '../../reuse/PrimaryButton';
import ConfirmationDialog from '../../reuse/ConfirmationDialog';
import AddPriorityDialog from '../components/priorities/AddPriorityDialog';
import AddPrioritiesDialog from '../components/priorities/AddPrioritiesDialog';
import AuditLogDialog from '../components/priorities/AuditLogDialog';
import api from '../services/api';

const formatDateIL = (value) => {
  if (!value) return '-';
  let d;
  const shortMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (shortMatch) {
    const [, day, month, year, hours, minutes] = shortMatch;
    const fullYear = Number(year) < 70 ? `20${year}` : `19${year}`;
    d = new Date(`${fullYear}-${month}-${day}T${hours}:${minutes}:00`);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const CUT_TYPE_MAP = { 1: 'Game', 2: 'Competition', 3: 'Country' };
const CUT_TYPE_OPTIONS = [
  { value: 1, label: 'Game' },
  { value: 2, label: 'Competition' },
  { value: 3, label: 'Country' },
];

const PrioritiesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedRef = useRef(false);

  const [priorities, setPriorities] = useState([]);
  const [dataSourcesList, setDataSourcesList] = useState([]);
  const [updateTypesList, setUpdateTypesList] = useState([]);
  const [priorityLevelsList, setPriorityLevelsList] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Context selection
  const [selectedSportID, setSelectedSportID] = useState(null);
  const [selectedCountryID, setSelectedCountryID] = useState(null);
  const [selectedCompetitionID, setSelectedCompetitionID] = useState(null);
  const [gameIDInput, setGameIDInput] = useState('');
  const [loadedGameID, setLoadedGameID] = useState(null);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [dataSourceFilter, setDataSourceFilter] = useState([]);
  const [updateTypeFilter, setUpdateTypeFilter] = useState([]);
  const [cutTypeFilter, setCutTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Dialog state
  const [addPrioritiesDialogOpen, setAddPrioritiesDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [auditPriorityRow, setAuditPriorityRow] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Sort & Group state
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [groupByField, setGroupByField] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const hasContext = selectedCountryID != null || selectedCompetitionID != null || loadedGameID != null;

  // Lookups
  const dsLookup = useMemo(() => {
    const m = {};
    dataSourcesList.forEach((ds) => { m[ds.DATA_SOURCE_ID] = ds.ALIAS_NAME; });
    return m;
  }, [dataSourcesList]);

  const utLookup = useMemo(() => {
    const m = {};
    updateTypesList.forEach((ut) => { m[ut.UPDATE_TYPE_ID] = ut.ALIAS_NAME; });
    return m;
  }, [updateTypesList]);

  const plLookup = useMemo(() => {
    const m = {};
    priorityLevelsList.forEach((pl) => { m[pl.ID] = pl; });
    return m;
  }, [priorityLevelsList]);

  const countryLookup = useMemo(() => {
    const m = {};
    countries.forEach((c) => { m[c.COUNTRY_ID] = c.name || `Country ${c.COUNTRY_ID}`; });
    return m;
  }, [countries]);

  const competitionLookup = useMemo(() => {
    const m = {};
    competitions.forEach((c) => { m[c.COMPETITION_ID] = c.name || `Competition ${c.COMPETITION_ID}`; });
    return m;
  }, [competitions]);

  const resolveCutValue = useCallback((cutType, cutValue) => {
    if (cutType === 3) return countryLookup[cutValue] || `Country ${cutValue}`;
    if (cutType === 2) return competitionLookup[cutValue] || `Competition ${cutValue}`;
    if (cutType === 1) return String(cutValue);
    return cutValue;
  }, [countryLookup, competitionLookup]);

  // Cascading options
  const availableCountries = useMemo(() => {
    const countryIds = new Set(competitions.map((c) => c.COUNTRY_ID));
    return countries.filter((c) => countryIds.has(c.COUNTRY_ID));
  }, [competitions, countries]);

  const availableCompetitions = useMemo(() => {
    if (!selectedCountryID || !selectedSportID) return [];
    return competitions.filter(
      (c) => c.COUNTRY_ID === selectedCountryID && c.SPORT_TYPE_ID === selectedSportID
    );
  }, [selectedCountryID, selectedSportID, competitions]);

  // Load all reference data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, dsData, utData, plData, spData, coData, cpData, gData] = await Promise.all([
        api.getPriorities(),
        api.getDataSourcesList(),
        api.getUpdateTypes(),
        api.getPriorityLevels(),
        api.getSports(),
        api.getCountries(),
        api.getCompetitions(),
        api.getGamesList(),
      ]);
      setPriorities(pData.map((item, idx) => ({ ...item, _index: idx })));
      setDataSourcesList(dsData);
      setUpdateTypesList(utData);
      setPriorityLevelsList(plData);
      setSportTypes(spData);
      setCountries(coData);
      setCompetitions(cpData);
      setGames(gData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Resolve URL params into context after data loads
  useEffect(() => {
    if (loading || initializedRef.current) return;
    initializedRef.current = true;

    const urlCountry = searchParams.get('country');
    const urlCompetition = searchParams.get('competition');
    const urlGame = searchParams.get('game');

    if (!urlCountry && !urlCompetition && !urlGame) {
      setEditMode(true);
    }

    if (urlGame) {
      const gameId = Number(urlGame);
      const game = games.find((g) => g.GAME_ID === gameId);
      if (game) {
        const comp = competitions.find((c) => c.COMPETITION_ID === game.COMPETITION_ID);
        if (comp) {
          setSelectedSportID(comp.SPORT_TYPE_ID);
          setSelectedCountryID(comp.COUNTRY_ID);
          setSelectedCompetitionID(comp.COMPETITION_ID);
        }
        setGameIDInput(String(gameId));
        setLoadedGameID(gameId);
      }
    } else if (urlCompetition) {
      const compId = Number(urlCompetition);
      const comp = competitions.find((c) => c.COMPETITION_ID === compId);
      if (comp) {
        setSelectedSportID(comp.SPORT_TYPE_ID);
        setSelectedCountryID(comp.COUNTRY_ID);
        setSelectedCompetitionID(comp.COMPETITION_ID);
      }
    } else if (urlCountry) {
      const countryId = Number(urlCountry);
      setSelectedCountryID(countryId);
      const compsForCountry = competitions.filter((c) => c.COUNTRY_ID === countryId);
      if (compsForCountry.length > 0) {
        setSelectedSportID(compsForCountry[0].SPORT_TYPE_ID);
      }
    }
  }, [loading, searchParams, games, competitions]);

  // Sync context → URL
  useEffect(() => {
    if (!initializedRef.current) return;
    const params = new URLSearchParams();
    if (selectedCountryID != null) params.set('country', String(selectedCountryID));
    if (selectedCompetitionID != null) params.set('competition', String(selectedCompetitionID));
    if (loadedGameID != null) params.set('game', String(loadedGameID));
    setSearchParams(params, { replace: true });
  }, [selectedCountryID, selectedCompetitionID, loadedGameID, setSearchParams]);

  useEffect(() => { setSelectedRows([]); }, [editMode, page]);

  // Filtered data - precise entity matching via CUT_TYPE + CUT_VALUE
  const filteredData = useMemo(() => {
    if (!hasContext) return [];

    let filtered = priorities;

    // Resolve the competition's country for hierarchical matching
    const contextComp = selectedCompetitionID != null
      ? competitions.find((c) => c.COMPETITION_ID === selectedCompetitionID)
      : null;
    const contextCountryFromComp = contextComp ? contextComp.COUNTRY_ID : selectedCountryID;

    filtered = filtered.filter((row) => {
      if (loadedGameID != null) {
        if (row.CUT_TYPE === 1 && row.CUT_VALUE === loadedGameID) return true;
        if (row.CUT_TYPE === 2 && row.CUT_VALUE === selectedCompetitionID) return true;
        if (row.CUT_TYPE === 3 && row.CUT_VALUE === contextCountryFromComp) return true;
        return false;
      }
      if (selectedCompetitionID != null) {
        if (row.CUT_TYPE === 2 && row.CUT_VALUE === selectedCompetitionID) return true;
        if (row.CUT_TYPE === 3 && row.CUT_VALUE === contextCountryFromComp) return true;
        return false;
      }
      if (selectedCountryID != null) {
        if (row.CUT_TYPE === 3 && row.CUT_VALUE === selectedCountryID) return true;
        return false;
      }
      return false;
    });

    if (dataSourceFilter.length > 0) {
      const ids = new Set(dataSourceFilter.map((ds) => ds.DATA_SOURCE_ID));
      filtered = filtered.filter((row) => ids.has(row.DATA_SOURCE));
    }

    if (updateTypeFilter.length > 0) {
      const ids = new Set(updateTypeFilter.map((ut) => ut.UPDATE_TYPE_ID));
      filtered = filtered.filter((row) => ids.has(row.UPDATE_TYPE));
    }

    if (cutTypeFilter !== '') {
      filtered = filtered.filter((row) => row.CUT_TYPE === cutTypeFilter);
    }

    if (priorityFilter !== '') {
      filtered = filtered.filter((row) => row.PRIORITY === priorityFilter);
    }

    if (sortConfig.field) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.field];
        let bVal = b[sortConfig.field];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else {
      filtered.sort((a, b) => {
        if (a.CUT_TYPE !== b.CUT_TYPE) return a.CUT_TYPE - b.CUT_TYPE;
        return new Date(b.CREATE_TIME || 0) - new Date(a.CREATE_TIME || 0);
      });
    }

    return filtered;
  }, [priorities, hasContext, loadedGameID, selectedCompetitionID, selectedCountryID, competitions, dataSourceFilter, updateTypeFilter, cutTypeFilter, priorityFilter, sortConfig]);

  const availablePriorityValues = useMemo(() => {
    const vals = new Set(filteredData.map((row) => row.PRIORITY));
    if (priorityFilter !== '') vals.add(priorityFilter);
    return [...vals].sort((a, b) => b - a);
  }, [filteredData, priorityFilter]);

  // Context handlers
  const handleSportChange = (sportId) => {
    setSelectedSportID(sportId);
    setSelectedCompetitionID(null);
    setGameIDInput('');
    setLoadedGameID(null);
  };

  const handleCountryChange = (countryId) => {
    setSelectedCountryID(countryId);
    setSelectedCompetitionID(null);
    setGameIDInput('');
    setLoadedGameID(null);
  };

  const handleCompetitionChange = (compId) => {
    setSelectedCompetitionID(compId);
    setGameIDInput('');
    setLoadedGameID(null);
  };

  const handleLoadGame = () => {
    const id = Number(gameIDInput);
    if (!id || isNaN(id)) return;
    const game = games.find((g) => g.GAME_ID === id);
    if (game) {
      const comp = competitions.find((c) => c.COMPETITION_ID === game.COMPETITION_ID);
      if (comp) {
        setSelectedSportID(comp.SPORT_TYPE_ID);
        setSelectedCountryID(comp.COUNTRY_ID);
        setSelectedCompetitionID(comp.COMPETITION_ID);
      }
      setLoadedGameID(id);
    }
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleGroupBy = (field) => {
    setGroupByField((prev) => prev === field ? null : field);
    setExpandedGroups(new Set());
    setPage(0);
  };

  const handleToggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // CRUD handlers
  const handleInlinePriorityChange = async (row, newValue) => {
    try {
      await api.updatePrioritiesBulk([{ index: row._index, changes: { PRIORITY: newValue } }]);
      await loadAll();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleAuditLogClick = (row) => {
    setAuditPriorityRow(row);
    setAuditLogDialogOpen(true);
  };

  const handleAddPriorities = async (newItems) => {
    try {
      for (const item of newItems) {
        await api.createPriority(item);
      }
      await loadAll();
      setAddPrioritiesDialogOpen(false);
    } catch (error) {
      console.error('Error creating priorities:', error);
    }
  };

  const handleEditPriority = async (changes) => {
    try {
      await api.updatePrioritiesBulk([{ index: editingPriority._index, changes }]);
      await loadAll();
      setEditDialogOpen(false);
      setEditingPriority(null);
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const indices = selectedRows.map((id) => {
        const row = priorities.find((p) => p._index === id);
        return row ? row._index : id;
      });
      await api.deletePrioritiesBulk(indices);
      await loadAll();
      setSelectedRows([]);
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting priorities:', error);
    }
  };

  // Dynamic page title
  const pageTitle = useMemo(() => {
    if (!hasContext) return 'Priorities';
    const parts = [];
    if (selectedSportID != null) {
      const s = sportTypes.find((x) => x.SPORT_TYPE_ID === selectedSportID);
      if (s) parts.push(s.ALIAS_NAME || `Sport ${selectedSportID}`);
    }
    if (selectedCountryID != null) {
      const c = countries.find((x) => x.COUNTRY_ID === selectedCountryID);
      if (c) parts.push(c.name || `Country ${selectedCountryID}`);
    }
    if (selectedCompetitionID != null) {
      const c = competitions.find((x) => x.COMPETITION_ID === selectedCompetitionID);
      if (c) parts.push(c.name || `Competition ${selectedCompetitionID}`);
    }
    if (loadedGameID != null) {
      parts.push(`Game ID: ${loadedGameID}`);
    }
    return parts.length > 0 ? `Priorities: ${parts.join(' > ')}` : 'Priorities';
  }, [hasContext, selectedSportID, selectedCountryID, selectedCompetitionID, loadedGameID, sportTypes, countries, competitions]);

  // Table columns
  const columns = useMemo(() => {
    const baseColumns = [
      { field: 'DATA_SOURCE', header: 'Data Source', render: (value) => dsLookup[value] || value },
      { field: 'UPDATE_TYPE', header: 'Update Type', render: (value) => utLookup[value] || value },
      {
        field: 'CUT_TYPE', header: 'Priority Level',
        render: (value, row) => `${CUT_TYPE_MAP[value] || value} (${resolveCutValue(value, row.CUT_VALUE)})`,
      },
      {
        field: 'PRIORITY', header: 'Priority Value',
        render: (value, row) => {
          if (editMode) {
            return (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={value}
                  onChange={(e) => handleInlinePriorityChange(row, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ height: 32 }}
                >
                  {priorityLevelsList.map((pl) => (
                    <MenuItem key={pl.ID} value={pl.VALUE}>{pl.NAME} ({pl.VALUE})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          const isTemporary = row.START_DATE || row.EXPIRATION_DATE;
          const chip = <Chip label={value} size="small" color={value === 6 ? 'success' : value === -1 ? 'error' : 'default'} sx={{ fontWeight: 600 }} />;
          if (!isTemporary) return chip;
          const dateParts = [];
          if (row.START_DATE) dateParts.push(`Start: ${formatDateIL(row.START_DATE)}`);
          if (row.EXPIRATION_DATE) dateParts.push(`Expires: ${formatDateIL(row.EXPIRATION_DATE)}`);
          if (row.EXPIRATION_DATE && row.AFTER_EXPIRED_PRIORITY != null) dateParts.push(`After expired: ${row.AFTER_EXPIRED_PRIORITY}`);
          if (row.START_DATE && !row.EXPIRATION_DATE && row.SCHEDULE_PRIORITY != null) dateParts.push(`Schedule priority: ${row.SCHEDULE_PRIORITY}`);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {chip}
              <Tooltip title={dateParts.join(' | ')} arrow>
                <TimerOutlinedIcon sx={{ fontSize: 18, color: 'warning.main', cursor: 'default' }} />
              </Tooltip>
            </Box>
          );
        },
      },
      {
        field: 'USER_NAME', header: 'User',
        render: (value, row) => {
          if (!value) return '-';
          return (
            <Tooltip title="Click to view audit log">
              <Chip label={value} size="small" color="primary"
                onClick={(e) => { e.stopPropagation(); handleAuditLogClick(row); }}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'primary.dark' } }} />
            </Tooltip>
          );
        },
      },
      { field: 'CREATE_TIME', header: 'Create Time', render: (value) => formatDateIL(value) },
      { field: 'COMMENT', header: 'Comment', render: (value) => value || '-' },
    ];

    if (editMode) {
      baseColumns.push({
        field: 'actions', header: 'Actions',
        render: (value, row) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingPriority(row); setEditDialogOpen(true); }} sx={{ color: 'primary.main' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      });
    }

    return baseColumns;
  }, [editMode, dsLookup, utLookup, resolveCutValue, priorityLevelsList]);

  const resolveGroupValue = useCallback((field, value) => {
    switch (field) {
      case 'DATA_SOURCE': return dsLookup[value] || value;
      case 'UPDATE_TYPE': return utLookup[value] || value;
      case 'CUT_TYPE': return CUT_TYPE_MAP[value] || value;
      default: return value ?? '-';
    }
  }, [dsLookup, utLookup]);

  const displayData = useMemo(() => {
    if (!groupByField) return filteredData;

    const groups = {};
    filteredData.forEach((row) => {
      const groupKey = String(row[groupByField] ?? 'Unknown');
      if (!groups[groupKey]) groups[groupKey] = { value: row[groupByField], rows: [] };
      groups[groupKey].rows.push(row);
    });

    const col = columns.find((c) => c.field === groupByField);
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aNum = Number(a), bNum = Number(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });

    const result = [];
    sortedKeys.forEach((key) => {
      const isExpanded = expandedGroups.has(key);
      result.push({
        _isGroupHeader: true,
        _groupKey: key,
        _groupValue: resolveGroupValue(groupByField, groups[key].value),
        _groupLabel: col?.header || groupByField,
        _count: groups[key].rows.length,
        _isExpanded: isExpanded,
      });
      if (isExpanded) {
        groups[key].rows.forEach((row) => result.push(row));
      }
    });
    return result;
  }, [filteredData, groupByField, expandedGroups, columns, resolveGroupValue]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return displayData.slice(start, start + rowsPerPage);
  }, [displayData, page, rowsPerPage]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <PageHeader
        title={pageTitle}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon color={!editMode ? 'primary' : 'disabled'} />
            <Typography variant="body2" color={!editMode ? 'primary' : 'text.secondary'}>View</Typography>
            <Switch checked={editMode} onChange={(e) => setEditMode(e.target.checked)} color="primary" />
            <EditNoteIcon color={editMode ? 'primary' : 'disabled'} />
            <Typography variant="body2" color={editMode ? 'primary' : 'text.secondary'}>Edit</Typography>
          </Box>
        }
      />

      {/* Context Selection */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 200, maxWidth: 250 }}
            options={availableCountries}
            getOptionLabel={(o) => o.name || `Country ${o.COUNTRY_ID}`}
            isOptionEqualToValue={(a, b) => a.COUNTRY_ID === b.COUNTRY_ID}
            value={availableCountries.find((c) => c.COUNTRY_ID === selectedCountryID) || null}
            onChange={(_, v) => handleCountryChange(v ? v.COUNTRY_ID : null)}
            renderInput={(params) => <TextField {...params} label="Country" />}
          />

          <Autocomplete
            size="small"
            sx={{ minWidth: 200, maxWidth: 250 }}
            options={sportTypes}
            getOptionLabel={(o) => o.ALIAS_NAME || `Sport ${o.SPORT_TYPE_ID}`}
            isOptionEqualToValue={(a, b) => a.SPORT_TYPE_ID === b.SPORT_TYPE_ID}
            value={sportTypes.find((s) => s.SPORT_TYPE_ID === selectedSportID) || null}
            onChange={(_, v) => handleSportChange(v ? v.SPORT_TYPE_ID : null)}
            renderInput={(params) => <TextField {...params} label="Sport (Filter Only)" />}
          />

          <Autocomplete
            size="small"
            sx={{ minWidth: 200, maxWidth: 250 }}
            options={availableCompetitions}
            getOptionLabel={(o) => o.name || `Competition ${o.COMPETITION_ID}`}
            isOptionEqualToValue={(a, b) => a.COMPETITION_ID === b.COMPETITION_ID}
            value={availableCompetitions.find((c) => c.COMPETITION_ID === selectedCompetitionID) || null}
            onChange={(_, v) => handleCompetitionChange(v ? v.COMPETITION_ID : null)}
            disabled={!selectedCountryID || !selectedSportID || availableCompetitions.length === 0}
            renderInput={(params) => <TextField {...params} label="Competition" />}
          />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small" label="Game ID" type="number"
              value={gameIDInput}
              onChange={(e) => setGameIDInput(e.target.value)}
              sx={{ minWidth: 150, maxWidth: 200 }}
              inputProps={{ min: 1 }}
            />
            <PrimaryButton
              size="small"
              onClick={handleLoadGame}
              disabled={!gameIDInput || isNaN(Number(gameIDInput))}
              startIcon={<RefreshIcon />}
            >
              Load
            </PrimaryButton>
          </Box>
        </Box>
      </Box>

      {/* Action buttons */}
      {(selectedRows.length > 0 || editMode) && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <PrimaryButton variant="contained" color="error" onClick={() => setBulkDeleteDialogOpen(true)} disabled={selectedRows.length === 0} sx={{ minWidth: 180 }}>
            Delete Selected ({selectedRows.length})
          </PrimaryButton>
          {editMode && (
            <PrimaryButton variant="contained" color="success" onClick={() => setAddPrioritiesDialogOpen(true)} sx={{ minWidth: 180 }}>
              Add New Priorities
            </PrimaryButton>
          )}
        </Box>
      )}

      {/* Additional Filters */}
      {hasContext && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Autocomplete
            multiple size="small" sx={{ minWidth: 300, maxWidth: 400 }}
            options={dataSourcesList}
            getOptionLabel={(o) => o.ALIAS_NAME || ''}
            isOptionEqualToValue={(a, b) => a.DATA_SOURCE_ID === b.DATA_SOURCE_ID}
            value={dataSourceFilter}
            onChange={(_, v) => setDataSourceFilter(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip key={option.DATA_SOURCE_ID} label={option.ALIAS_NAME} size="small" {...getTagProps({ index })} />)
            }
            renderInput={(params) => <TextField {...params} label="Data Source" />}
          />

          <Autocomplete
            multiple size="small" sx={{ minWidth: 300, maxWidth: 400 }}
            options={updateTypesList}
            getOptionLabel={(o) => o.ALIAS_NAME || ''}
            isOptionEqualToValue={(a, b) => a.UPDATE_TYPE_ID === b.UPDATE_TYPE_ID}
            value={updateTypeFilter}
            onChange={(_, v) => setUpdateTypeFilter(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip key={option.UPDATE_TYPE_ID} label={option.ALIAS_NAME} size="small" {...getTagProps({ index })} />)
            }
            renderInput={(params) => <TextField {...params} label="Update Type" />}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Priority Level</InputLabel>
            <Select value={cutTypeFilter} label="Priority Level" onChange={(e) => setCutTypeFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {CUT_TYPE_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Priority Value</InputLabel>
            <Select value={priorityFilter} label="Priority Value" onChange={(e) => setPriorityFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {availablePriorityValues.map((v) => {
                const pl = priorityLevelsList.find((p) => p.VALUE === v);
                return <MenuItem key={v} value={v}>{pl ? `${pl.NAME} (${v})` : v}</MenuItem>;
              })}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Empty state */}
      {!hasContext && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Select a context above (Country, Competition, or Game) to view priorities.
          </Typography>
        </Box>
      )}

      {/* Table */}
      {hasContext && (
        <>
          <DataTable
            data={paginatedData}
            columns={columns}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            getRowId={(row) => row._index}
            searchable={false}
            pagination={{ page, rowsPerPage, totalRows: displayData.length }}
            onPageChange={setPage}
            onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(0); }}
            sortConfig={sortConfig}
            onSortChange={handleSort}
            groupByField={groupByField}
            onGroupByChange={handleGroupBy}
            onToggleGroup={handleToggleGroup}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Items: {filteredData.length}
            </Typography>
          </Box>
        </>
      )}

      {/* Dialogs */}
      <AddPrioritiesDialog
        open={addPrioritiesDialogOpen}
        onClose={() => setAddPrioritiesDialogOpen(false)}
        onSave={handleAddPriorities}
        dataSourcesList={dataSourcesList}
        updateTypesList={updateTypesList}
        priorityLevelsList={priorityLevelsList}
        sportTypes={sportTypes}
        countries={countries}
        competitions={competitions}
        games={games}
        contextSportID={selectedSportID}
        contextCountryID={selectedCountryID}
        contextCompetitionID={selectedCompetitionID}
        contextGameID={loadedGameID}
      />

      {editingPriority && (
        <AddPriorityDialog
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setEditingPriority(null); }}
          onSave={handleEditPriority}
          dataSourcesList={dataSourcesList}
          updateTypesList={updateTypesList}
          priorityLevelsList={priorityLevelsList}
          countries={countries}
          competitions={competitions}
          games={games}
          initialData={editingPriority}
          isEdit={true}
        />
      )}

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Priorities"
        message={`Are you sure you want to delete ${selectedRows.length} selected priority/priorities?`}
        type="warning"
        dangerous={true}
      />

      <AuditLogDialog
        open={auditLogDialogOpen}
        onClose={() => { setAuditLogDialogOpen(false); setAuditPriorityRow(null); }}
        priorityRow={auditPriorityRow}
        dsLookup={dsLookup}
        utLookup={utLookup}
        resolveCutValue={resolveCutValue}
      />
    </Box>
  );
};

export default PrioritiesPage;
