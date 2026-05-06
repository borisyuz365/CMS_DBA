import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  InputAdornment,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Tooltip,
  Avatar,
  Snackbar,
  Alert as MuiAlert,
  OutlinedInput,
  ListItemText,
  Chip,
  Button,
  Divider,
  Radio,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AddIcon from '@mui/icons-material/Add';
import UndoIcon from '@mui/icons-material/Undo';
import SearchIcon from '@mui/icons-material/Search';
import PublicIcon from '@mui/icons-material/Public';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import PageHeader from '../components/Layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import useUrlFilters from '../hooks/useUrlFilters';
import api from '../services/api';
import CountryCreateDialog from '../../reuse/CountryCreateDialog';
import {
  CreateModeChoiceDialog,
  ManyToOneCountryDialog,
  OneToOneTabsCountryDialog,
} from '../components/TermsFix';

const ENTITY_TABS = [
  { key: 'countries', label: 'Countries', enabled: true },
  { key: 'competitions', label: 'Competitions', enabled: true },
  { key: 'competitors', label: 'Competitors', enabled: true },
  { key: 'athletes', label: 'Athletes', enabled: true },
  { key: 'seasons', label: 'Seasons', enabled: false },
  { key: 'phases', label: 'Phases', enabled: false },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function TermsFixPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'countries';

  const setActiveTab = useCallback((tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'countries') next.delete('tab');
      else next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PageHeader title="Terms Fix" subtitle="Map unidentified entities from imports to existing dictionary entries" />
      <Paper sx={{ mb: 2, boxShadow: 1, border: '1px solid #e0e0e0' }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
            '& .Mui-selected': { color: '#1976d2' },
          }}
        >
          {ENTITY_TABS.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              label={t.enabled ? t.label : `${t.label} (soon)`}
              disabled={!t.enabled}
            />
          ))}
        </Tabs>
      </Paper>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'countries' && <CountriesTermsFix />}
        {activeTab === 'competitions' && <CompetitionsTermsFix />}
        {activeTab === 'competitors' && <CompetitorsTermsFix />}
        {activeTab === 'athletes' && <AthletesTermsFix />}
      </Box>
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Shared info dialog – shows all fields of a temp row with UPDATE_TEXT
 * rendered in a readable format.
 * ------------------------------------------------------------------------ */

const UPDATE_TEXT_FIELD_RE = /^(.+?):\s*(.+)$/;

function TempInfoDialog({ row, open, onClose, sourceById, sportById, langById }) {
  if (!row) return null;

  const langName = langById?.get(Number(row.LANG_ID))?.name || `#${row.LANG_ID}`;
  const updateLines = (row.UPDATE_TEXT || '').split(/\r?\n/).filter(Boolean);
  const metaFields = [
    { label: 'ID', value: row.COUNTRY_ID ?? row.COMPETITION_ID ?? row.COMPETITOR_ID ?? row.ATHLETE_ID ?? '-' },
    { label: 'Name', value: row.NAME },
    { label: 'Language', value: langName },
    { label: 'Data Source', value: sourceById?.get(Number(row.DATA_SOURCE_ID))?.ALIAS_NAME || row.DATA_SOURCE_ID || '-' },
    { label: 'Sport', value: sportById?.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-' },
    { label: 'Active', value: Number(row.ACTIVE) === 0 ? 'Hidden' : 'Active' },
    { label: 'Created', value: row.CREATED_TIME || '-' },
    ...(row.GAME_START_TIME ? [{ label: 'Game Start', value: row.GAME_START_TIME }] : []),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Record Info — {row.NAME || 'Unknown'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', mb: 2 }}>
          {metaFields.map((f) => (
            <React.Fragment key={f.label}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{f.label}</Typography>
              <Typography variant="body2">{f.value ?? '-'}</Typography>
            </React.Fragment>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Update Text</Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 340, overflow: 'auto' }}>
          {updateLines.map((line, i) => {
            const m = line.match(UPDATE_TEXT_FIELD_RE);
            if (m) {
              return (
                <Box key={i}>
                  <Typography component="span" sx={{ fontWeight: 600, fontSize: 'inherit', fontFamily: 'inherit' }}>{m[1]}:</Typography>
                  {' '}{m[2]}
                </Box>
              );
            }
            return <Box key={i}>{line}</Box>;
          })}
          {updateLines.length === 0 && <Typography variant="body2" color="text.secondary">No update text</Typography>}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Countries tab
 * ------------------------------------------------------------------------ */

function CountriesTermsFix() {
  /* -------- URL-synced filter / pagination state (ctr_ prefix) -------- */
  const [urlState, setUrlState] = useUrlFilters({
    ctr_search: { type: 'string', default: '' },
    ctr_sport: { type: 'array', default: [] },
    ctr_source: { type: 'array', default: [] },
    ctr_hidden: { type: 'boolean', default: false },
    ctr_tPage: { type: 'number', default: 0 },
    ctr_tSize: { type: 'number', default: 10 },
    ctr_eSearch: { type: 'string', default: '' },
    ctr_ePage: { type: 'number', default: 0 },
    ctr_eSize: { type: 'number', default: 10 },
  });

  const tempSearch = urlState.ctr_search;
  const sportFilter = useMemo(() => (urlState.ctr_sport || []).map(Number).filter(Number.isFinite), [urlState.ctr_sport]);
  const sourceFilter = useMemo(() => (urlState.ctr_source || []).map(Number).filter(Number.isFinite), [urlState.ctr_source]);
  const showHiddens = urlState.ctr_hidden;
  const tempPage = urlState.ctr_tPage;
  const tempRowsPerPage = urlState.ctr_tSize;
  const countrySearch = urlState.ctr_eSearch;
  const countryPage = urlState.ctr_ePage;
  const countryRowsPerPage = urlState.ctr_eSize;

  const setTempPage = useCallback((v) => setUrlState({ ctr_tPage: v }), [setUrlState]);
  const setCountryPage = useCallback((v) => setUrlState({ ctr_ePage: v }), [setUrlState]);

  /* -------- Top (TEMP) table - driven entirely by the server -------- */
  const [tempRows, setTempRows] = useState([]);
  const [tempTotal, setTempTotal] = useState(0);
  const [tempFacets, setTempFacets] = useState({ sportTypes: [], dataSources: [] });

  /* -------- Bottom (existing countries) table - unchanged (client) -------- */
  const [countries, setCountries] = useState([]);
  const [sports, setSports] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedTemp, setSelectedTemp] = useState(() => new Map());
  const [selectedCountry, setSelectedCountry] = useState(() => new Set());

  const [pendingTempSearch, setPendingTempSearch] = useState(tempSearch);
  useEffect(() => { setPendingTempSearch(tempSearch); }, [tempSearch]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [singleCreateOpen, setSingleCreateOpen] = useState(false);
  const [singleCreateTempRow, setSingleCreateTempRow] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [manyOneOpen, setManyOneOpen] = useState(false);
  const [oneOneOpen, setOneOneOpen] = useState(false);
  const [infoRow, setInfoRow] = useState(null);

  // Server-driven top-N suggestions for the currently selected temp rows.
  // `suggestions` is an ordered array [{ countryId, score, reason }, ...].
  // Gates (mirror the server):
  //   - 1 <= selectedTemp.size <= 3
  //   - every selected row's NAME is longer than 3 characters
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestReqSeq = useRef(0);

  const SUGGEST_MIN_NAME_LEN = 4; // "more than 3 letters" per product spec
  const SUGGEST_MAX_SELECTION = 3;

  const showToast = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Guards against out-of-order responses when filters/pages change quickly.
  const tempReqSeq = useRef(0);

  const loadTemp = useCallback(async () => {
    const reqId = ++tempReqSeq.current;
    try {
      setLoading(true);
      setError('');
      const result = await api.getTempEntities('countries', {
        search: tempSearch,
        sportTypeIds: sportFilter.map(Number),
        dataSourceIds: sourceFilter.map(Number),
        showHidden: showHiddens,
        page: tempPage,
        pageSize: tempRowsPerPage,
      });
      if (reqId !== tempReqSeq.current) return; // stale
      setTempRows(result.rows);
      setTempTotal(result.total);
      setTempFacets(result.facets || { sportTypes: [], dataSources: [] });
    } catch (err) {
      if (reqId !== tempReqSeq.current) return;
      setError(err?.message || 'Failed to load temp data');
      setTempRows([]);
      setTempTotal(0);
      setTempFacets({ sportTypes: [], dataSources: [] });
    } finally {
      if (reqId === tempReqSeq.current) setLoading(false);
    }
  }, [tempSearch, sportFilter, sourceFilter, showHiddens, tempPage, tempRowsPerPage]);

  const [pendingCountrySearch, setPendingCountrySearch] = useState(countrySearch);
  useEffect(() => { setPendingCountrySearch(countrySearch); }, [countrySearch]);

  const loadCountries = useCallback(async () => {
    try {
      const searchParam = countrySearch.trim();
      const list = await api.getCountries(searchParam ? { search: searchParam } : {});
      setCountries(Array.isArray(list) ? list : []);
      setSelectedCountry(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to load countries');
    }
  }, [countrySearch]);

  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [sportsList, sourcesList, langsList] = await Promise.all([
          api.getSports().catch(() => []),
          api.getDataSources().catch(() => []),
          api.getLanguages().catch(() => []),
        ]);
        setSports(Array.isArray(sportsList) ? sportsList : []);
        setDataSources(Array.isArray(sourcesList) ? sourcesList : []);
        setLanguages(Array.isArray(langsList) ? langsList : []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => { loadCountries(); }, [loadCountries]);
  useEffect(() => { loadTemp(); }, [loadTemp]);

  /* -------------------- Lookup maps for table cells -------------------- */
  const langById = useMemo(() => {
    const map = new Map();
    (languages || []).forEach((l) => { if (l.id != null) map.set(Number(l.id), l); });
    return map;
  }, [languages]);

  const sportById = useMemo(() => {
    const map = new Map();
    (sports || []).forEach((s) => {
      if (s.SPORT_TYPE_ID != null) map.set(Number(s.SPORT_TYPE_ID), s);
    });
    return map;
  }, [sports]);

  const sourceById = useMemo(() => {
    const map = new Map();
    (dataSources || []).forEach((ds) => {
      if (ds.DATA_SOURCE_ID != null) map.set(Number(ds.DATA_SOURCE_ID), ds);
    });
    return map;
  }, [dataSources]);

  const countryById = useMemo(() => {
    const map = new Map();
    (countries || []).forEach((c) => { if (c.COUNTRY_ID != null) map.set(Number(c.COUNTRY_ID), c); });
    return map;
  }, [countries]);

  // Quick lookup by facet id for rendering selection chips in the dropdowns.
  const sportFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.sportTypes || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const sourceFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.dataSources || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);

  // Autocomplete expects option objects as its value. Map the IDs held in
  // sourceFilter back to the facet objects (falling back to a synthetic one
  // with just the label from the master list if the id is no longer in the
  // current facet - e.g. after other filters narrowed it out).
  const sourceFilterValue = useMemo(
    () =>
      sourceFilter.map((id) => {
        const num = Number(id);
        const fromFacet = sourceFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = sourceById.get(num)?.ALIAS_NAME || `Source ${num}`;
        return { id: num, label, count: 0 };
      }),
    [sourceFilter, sourceFacetById, sourceById]
  );

  /* -------------------- Bottom table (server-filtered) -------------------- */
  const countryTotal = (countries || []).length;

  const pagedCountries = useMemo(() => {
    const start = countryPage * countryRowsPerPage;
    return (countries || []).slice(start, start + countryRowsPerPage);
  }, [countries, countryPage, countryRowsPerPage]);

  // Clamp temp page if total shrinks below the current page.
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(tempTotal / tempRowsPerPage) - 1);
    if (tempPage > maxPage) setTempPage(maxPage);
  }, [tempTotal, tempRowsPerPage, tempPage]);
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(countryTotal / countryRowsPerPage) - 1);
    if (countryPage > maxPage) setCountryPage(maxPage);
  }, [countryTotal, countryRowsPerPage, countryPage]);

  /* -------------------- Selection -------------------- */
  const pagedTemp = tempRows; // alias for readability below

  const toggleTempSelect = (row) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      const id = row.COUNTRY_ID;
      if (next.has(id)) next.delete(id); else next.set(id, row);
      return next;
    });
  };
  const toggleCountrySelect = (id) => {
    setSelectedCountry((prev) => prev.has(id) ? new Set() : new Set([id]));
  };
  const toggleAllTemp = (checked) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      if (checked) pagedTemp.forEach((r) => next.set(r.COUNTRY_ID, r));
      else pagedTemp.forEach((r) => next.delete(r.COUNTRY_ID));
      return next;
    });
  };
  const selectedTempList = useMemo(
    () => Array.from(selectedTemp.values()),
    [selectedTemp]
  );
  const selectedCountryList = useMemo(
    () => (countries || []).filter((r) => selectedCountry.has(r.COUNTRY_ID)),
    [countries, selectedCountry]
  );

  const clearTempSelection = useCallback(() => setSelectedTemp(new Map()), []);

  /* -------------------- Suggestions -------------------- */
  // Eligibility: 1..3 rows AND every selected row has a name longer than 3 chars.
  const suggestEligible = useMemo(() => {
    if (selectedTempList.length === 0 || selectedTempList.length > SUGGEST_MAX_SELECTION) {
      return false;
    }
    return selectedTempList.every(
      (r) => String(r.NAME || '').trim().length >= SUGGEST_MIN_NAME_LEN
    );
  }, [selectedTempList]);

  useEffect(() => {
    // Not eligible -> make sure no stale suggestions hang around.
    if (!suggestEligible) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    const payload = selectedTempList.map((r) => ({
      NAME: r.NAME,
      LANG_ID: r.LANG_ID,
    }));
    const reqId = ++suggestReqSeq.current;
    setSuggestLoading(true);
    (async () => {
      try {
        const result = await api.suggestTempMatches('countries', payload, { limit: 3 });
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch {
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions([]);
      } finally {
        if (reqId === suggestReqSeq.current) setSuggestLoading(false);
      }
    })();
  }, [suggestEligible, selectedTempList]);

  // Map countryId -> { rank (1..N), score } for quick cell lookup in the bottom table.
  const suggestionByCountryId = useMemo(() => {
    const m = new Map();
    suggestions.forEach((s, i) => m.set(Number(s.countryId), { rank: i + 1, score: s.score }));
    return m;
  }, [suggestions]);
  const selectOnlyCountry = (id) => {
    setSelectedCountry(new Set([Number(id)]));
  };

  /* -------------------- Search commit helpers -------------------- */
  const commitTempSearch = () => {
    const trimmed = pendingTempSearch.trim();
    if (trimmed === tempSearch) return;
    setUrlState({ ctr_search: trimmed, ctr_tPage: 0 });
  };

  const handleSportFilterChange = (value) => {
    setUrlState({ ctr_sport: (Array.isArray(value) ? value : []).map(String), ctr_tPage: 0 });
  };
  const handleSourceFilterChange = (value) => {
    setUrlState({ ctr_source: (Array.isArray(value) ? value : []).map(String), ctr_tPage: 0 });
  };
  const handleShowHiddensChange = (checked) => {
    setUrlState({ ctr_hidden: checked, ctr_tPage: 0 });
  };

  const hasActiveFilters =
    sportFilter.length > 0 ||
    sourceFilter.length > 0 ||
    tempSearch !== '' ||
    pendingTempSearch !== '' ||
    showHiddens;

  const handleClearFilters = () => {
    setUrlState({
      ctr_search: '',
      ctr_sport: [],
      ctr_source: [],
      ctr_hidden: false,
      ctr_tPage: 0,
    });
    setPendingTempSearch('');
  };

  /* -------------------- Actions -------------------- */
  const handleReload = async () => {
    clearTempSelection();
    await loadTemp();
    showToast('Temp table reloaded', 'success');
  };
  const handleClearCache = () => {
    showToast('Cache cleared successfully', 'success');
  };
  const handleUndo = () => {
    showToast('Undo requested (no-op for now)', 'info');
  };

  const handleConnect = async () => {
    if (selectedTempList.length === 0 || selectedCountryList.length !== 1) return;
    const target = selectedCountryList[0];
    try {
      const result = await api.connectTempEntities(
        'countries',
        selectedTempList.map((r) => r.COUNTRY_ID),
        target.COUNTRY_ID
      );
      showToast(
        `Connected ${result?.removedTempRows ?? selectedTempList.length} temp row(s) to ${target.name}`,
        'success'
      );
      clearTempSelection();
      await Promise.all([loadTemp(), loadCountries()]);
    } catch (err) {
      showToast(err?.message || 'Failed to connect', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedTempList.length === 0) return;
    try {
      await api.deleteTempEntitiesBulk('countries', selectedTempList.map((r) => r.COUNTRY_ID));
      showToast(`Deleted ${selectedTempList.length} temp row(s)`, 'success');
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
    }
  };

  const allSelectedHidden = selectedTempList.length > 0 && selectedTempList.every((r) => Number(r.ACTIVE) === 0);

  const handleHide = async () => {
    if (selectedTempList.length === 0) return;
    const newActive = allSelectedHidden ? 1 : 0;
    try {
      for (const row of selectedTempList) {
        await api.updateTempEntity('countries', row.COUNTRY_ID, { ACTIVE: newActive });
      }
      showToast(
        newActive === 1
          ? `Unhidden ${selectedTempList.length} temp row(s)`
          : `Hidden ${selectedTempList.length} temp row(s)`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const handleCreateClick = () => {
    if (selectedTempList.length === 0) return;
    if (selectedTempList.length === 1) {
      setSingleCreateTempRow(selectedTempList[0]);
      setSingleCreateOpen(true);
      return;
    }
    setChoiceOpen(true);
  };
  const handleChoose = (mode) => {
    setChoiceOpen(false);
    if (mode === 'many-to-one') setManyOneOpen(true);
    if (mode === 'one-to-one') setOneOneOpen(true);
  };

  const onSingleCreated = async (country) => {
    const row = singleCreateTempRow;
    try {
      if (row?.COUNTRY_ID != null) {
        await api.deleteTempEntity('countries', row.COUNTRY_ID);
      }
      showToast(`Created country "${country?.name ?? ''}"`, 'success');
    } catch (err) {
      showToast(err?.message || 'Created country but failed to remove temp row', 'warning');
    } finally {
      setSingleCreateTempRow(null);
      await Promise.all([loadTemp(), loadCountries()]);
    }
  };

  const onManyToOneCreated = async (country, term, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('countries', tempIds);
      }
      showToast(`Created country "${country?.name ?? ''}" with ${(term?.values || []).length} values`, 'success');
    } catch (err) {
      showToast(err?.message || 'Created country but failed to remove temp rows', 'warning');
    } finally {
      await Promise.all([loadTemp(), loadCountries()]);
    }
  };

  const onOneToOneCreated = async (createdCountries, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('countries', tempIds);
      }
      showToast(`Created ${createdCountries.length} countries`, 'success');
    } catch (err) {
      showToast(err?.message || 'Some temp rows could not be removed', 'warning');
    } finally {
      await Promise.all([loadTemp(), loadCountries()]);
    }
  };

  /* -------------------- Render -------------------- */
  const tempAllChecked = pagedTemp.length > 0 && pagedTemp.every((r) => selectedTemp.has(r.COUNTRY_ID));
  const tempSomeChecked = pagedTemp.some((r) => selectedTemp.has(r.COUNTRY_ID));
  const searchDirty = pendingTempSearch.trim() !== tempSearch;

  const selectedCountries = selectedCountryList.length;
  const selectedTemps = selectedTempList.length;
  const canConnect = selectedTemps >= 1 && selectedCountries === 1;
  const canDelete = selectedTemps >= 1;
  const canHide = selectedTemps >= 1;
  const canCreate = selectedTemps >= 1;

  // Shared table styling: slightly smaller font + tighter cell padding so
  // ~10 rows fit comfortably on screen. We no longer constrain the page to
  // the viewport - the user is fine with vertical page scrolling.
  const compactTableSx = {
    '& .MuiTableCell-root': {
      fontSize: '0.8125rem',
      paddingTop: 0.5,
      paddingBottom: 0.5,
    },
    '& .MuiTableCell-head': { fontSize: '0.8125rem' },
  };

  // Keep each TableContainer bounded so that at most ~10 rows are visible
  // at once; anything beyond (i.e. when the user bumps pageSize above 10)
  // scrolls vertically inside the container instead of pushing the whole
  // page down. Rough maths: header ~38px + 10 rows * ~33px = ~368px.
  const tableMaxHeightSx = { maxHeight: 380 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters + global actions */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.dataSources || []}
            value={sourceFilterValue}
            onChange={(_e, newValue) => handleSourceFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.dataSources || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.count}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField {...params} label="Data Source" placeholder="Search data source…" />
            )}
          />
          {/*
            NOTE: keep Sport Type as a classic Select - it usually has a small,
            stable domain (soccer/tennis/...) and doesn't need free-text search.
          */}
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={(tempFacets.sportTypes || []).length === 0}>
            <InputLabel>Sport Type</InputLabel>
            <Select
              multiple
              value={sportFilter}
              onChange={(e) => handleSportFilterChange(e.target.value)}
              input={<OutlinedInput label="Sport Type" />}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {sel.map((v) => {
                    const label =
                      sportFacetById.get(Number(v))?.label ||
                      sportById.get(Number(v))?.ALIAS_NAME ||
                      v;
                    return <Chip key={v} size="small" label={label} />;
                  })}
                </Box>
              )}
            >
              {(tempFacets.sportTypes || []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Checkbox checked={sportFilter.includes(f.id)} size="small" />
                  <ListItemText primary={f.label} secondary={`${f.count}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Search temp name…"
            value={pendingTempSearch}
            onChange={(e) => setPendingTempSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitTempSearch();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
          />
          <PrimaryButton
            size="small"
            startIcon={<SearchIcon />}
            onClick={commitTempSearch}
            disabled={!searchDirty}
          >
            Search
          </PrimaryButton>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showHiddens}
                onChange={(e) => handleShowHiddensChange(e.target.checked)}
              />
            }
            label="Show Hiddens"
          />
          <SecondaryButton
            size="small"
            startIcon={<FilterAltOffIcon />}
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </SecondaryButton>
          <Box sx={{ flex: 1 }} />
          <SecondaryButton size="small" startIcon={<RefreshIcon />} onClick={handleReload}>
            Reload Table
          </SecondaryButton>
          <SecondaryButton size="small" startIcon={<CleaningServicesIcon />} onClick={handleClearCache}>
            Clear Cache
          </SecondaryButton>
          <SecondaryButton size="small" startIcon={<UndoIcon />} onClick={handleUndo}>
            Undo
          </SecondaryButton>
        </Box>
      </Paper>

      {/* Top table: temp */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Unidentified Countries ({tempTotal})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedTemps} selected
          </Typography>
        </Box>
        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={tempSomeChecked && !tempAllChecked}
                    checked={tempAllChecked}
                    onChange={(e) => toggleAllTemp(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data Source</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedTemp.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No unidentified countries
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedTemp.map((row) => (
                <TableRow
                  key={row.COUNTRY_ID}
                  hover
                  selected={selectedTemp.has(row.COUNTRY_ID)}
                  sx={{ cursor: 'pointer', opacity: Number(row.ACTIVE) === 0 ? 0.55 : 1 }}
                  onClick={() => toggleTempSelect(row)}
                  onDoubleClick={() => setInfoRow(row)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={selectedTemp.has(row.COUNTRY_ID)}
                      onChange={() => toggleTempSelect(row)}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={row.NAME || ''} arrow>
                      <span>{row.NAME}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{sourceById.get(Number(row.DATA_SOURCE_ID))?.ALIAS_NAME || row.DATA_SOURCE_ID || '-'}</TableCell>
                  <TableCell>{sportById.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-'}</TableCell>
                  <TableCell>{row.CREATED_TIME || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={tempTotal}
          page={tempPage}
          rowsPerPage={tempRowsPerPage}
          onPageChange={setTempPage}
          onRowsPerPageChange={(n) => setUrlState({ ctr_tSize: n, ctr_tPage: 0 })}
        />
      </Paper>

      {/* Bulk action bar */}
      <Paper sx={{ p: 1.5, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Selected: <strong>{selectedTemps}</strong> temp / <strong>{selectedCountries}</strong> existing
        </Typography>
        <Box sx={{ flex: 1 }} />
        <PrimaryButton size="small" startIcon={<LinkIcon />} disabled={!canConnect} onClick={handleConnect}>
          Connect
        </PrimaryButton>
        <SecondaryButton size="small" startIcon={<AddIcon />} disabled={!canCreate} onClick={handleCreateClick}>
          Create
        </SecondaryButton>
        <SecondaryButton size="small" startIcon={<VisibilityOffIcon />} disabled={!canHide} onClick={handleHide}>
          {allSelectedHidden ? 'Unhide' : 'Hide'}
        </SecondaryButton>
        <SecondaryButton size="small" startIcon={<DeleteIcon />} disabled={!canDelete} onClick={handleDelete}>
          Delete
        </SecondaryButton>
      </Paper>

      {/* Bottom table: existing */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Existing Countries ({countryTotal})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedCountries} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search existing countries… (Enter to search)"
            value={pendingCountrySearch}
            onChange={(e) => setPendingCountrySearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = pendingCountrySearch.trim();
                if (trimmed !== countrySearch) setUrlState({ ctr_eSearch: trimmed, ctr_ePage: 0 });
              }
            }}
            onBlur={() => {
              const trimmed = pendingCountrySearch.trim();
              if (trimmed !== countrySearch) setUrlState({ ctr_eSearch: trimmed, ctr_ePage: 0 });
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: countrySearch && (
                <IconButton size="small" onClick={() => { setPendingCountrySearch(''); setUrlState({ ctr_eSearch: '', ctr_ePage: 0 }); }}>
                  <FilterAltOffIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
        </Box>

        <SuggestionBanner
          selectedCount={selectedTempList.length}
          maxSelection={SUGGEST_MAX_SELECTION}
          minNameLen={SUGGEST_MIN_NAME_LEN}
          eligible={suggestEligible}
          loading={suggestLoading}
          suggestions={suggestions}
          selectedCountryIds={selectedCountry}
          onPick={(id) => selectOnlyCountry(id)}
        />
        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Father Country</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedCountries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No countries match
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedCountries.map((row) => {
                const suggestion = suggestionByCountryId.get(Number(row.COUNTRY_ID));
                return (
                  <TableRow
                    key={row.COUNTRY_ID}
                    hover
                    selected={selectedCountry.has(row.COUNTRY_ID)}
                    sx={{
                      cursor: 'pointer',
                      ...(suggestion
                        ? { backgroundColor: 'rgba(25, 118, 210, 0.06)' }
                        : null),
                    }}
                    onClick={() => toggleCountrySelect(row.COUNTRY_ID)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Radio
                        size="small"
                        checked={selectedCountry.has(row.COUNTRY_ID)}
                        onChange={() => toggleCountrySelect(row.COUNTRY_ID)}
                      />
                    </TableCell>
                    <TableCell>{row.COUNTRY_ID}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={row.COUNTRY_IMAGE_URL || undefined}
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: row.COUNTRY_IMAGE_URL ? 'transparent' : '#1976d2',
                            fontSize: '0.95rem',
                          }}
                        >
                          <PublicIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{row.name || `#${row.COUNTRY_ID}`}</Typography>
                        {suggestion && (
                          <Tooltip
                            arrow
                            title={`Auto-suggested match (${Math.round(suggestion.score * 100)}% similarity)`}
                          >
                            <Chip
                              size="small"
                              color="primary"
                              variant="outlined"
                              label={`Suggested #${suggestion.rank} · ${Math.round(suggestion.score * 100)}%`}
                              sx={{ ml: 0.5 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{row.FATHER_COUNTRY_ID ? (countryById.get(Number(row.FATHER_COUNTRY_ID))?.name || `#${row.FATHER_COUNTRY_ID}`) : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={countryTotal}
          page={countryPage}
          rowsPerPage={countryRowsPerPage}
          onPageChange={setCountryPage}
          onRowsPerPageChange={(n) => setUrlState({ ctr_eSize: n, ctr_ePage: 0 })}
        />
      </Paper>

      {error && (
        <MuiAlert severity="error" onClose={() => setError('')}>{error}</MuiAlert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      <CountryCreateDialog
        open={singleCreateOpen}
        onClose={() => setSingleCreateOpen(false)}
        initialName={singleCreateTempRow?.NAME || ''}
        extraValues={
          singleCreateTempRow && Number.isFinite(Number(singleCreateTempRow.LANG_ID))
            ? [{
                languageId: Number(singleCreateTempRow.LANG_ID),
                value: String(singleCreateTempRow.NAME || '').trim(),
                isDefault: true,
                status: 'Approved',
              }]
            : undefined
        }
        onCreated={onSingleCreated}
      />
      <CreateModeChoiceDialog
        open={choiceOpen}
        count={selectedTempList.length}
        onClose={() => setChoiceOpen(false)}
        onChoose={handleChoose}
      />
      <ManyToOneCountryDialog
        open={manyOneOpen}
        tempRows={selectedTempList}
        onClose={() => setManyOneOpen(false)}
        onCreated={onManyToOneCreated}
      />
      <OneToOneTabsCountryDialog
        open={oneOneOpen}
        tempRows={selectedTempList}
        onClose={() => setOneOneOpen(false)}
        onCreated={onOneToOneCreated}
      />
      <TempInfoDialog
        row={infoRow}
        open={!!infoRow}
        onClose={() => setInfoRow(null)}
        sourceById={sourceById}
        sportById={sportById}
        langById={langById}
      />
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Competitions tab
 * ------------------------------------------------------------------------ */

function CompetitionsTermsFix() {
  /* -------- URL-synced filter / pagination state (comp_ prefix) -------- */
  const [urlState, setUrlState] = useUrlFilters({
    comp_search: { type: 'string', default: '' },
    comp_sport: { type: 'array', default: [] },
    comp_source: { type: 'array', default: [] },
    comp_country: { type: 'array', default: [] },
    comp_hidden: { type: 'boolean', default: false },
    comp_tPage: { type: 'number', default: 0 },
    comp_tSize: { type: 'number', default: 10 },
    comp_eSearch: { type: 'string', default: '' },
    comp_ePage: { type: 'number', default: 0 },
    comp_eSize: { type: 'number', default: 10 },
    comp_suggestCountry: { type: 'boolean', default: true },
  });

  const tempSearch = urlState.comp_search;
  const sportFilter = useMemo(() => (urlState.comp_sport || []).map(Number).filter(Number.isFinite), [urlState.comp_sport]);
  const sourceFilter = useMemo(() => (urlState.comp_source || []).map(Number).filter(Number.isFinite), [urlState.comp_source]);
  const countryFilter = useMemo(() => (urlState.comp_country || []).map(Number).filter(Number.isFinite), [urlState.comp_country]);
  const showHiddens = urlState.comp_hidden;
  const tempPage = urlState.comp_tPage;
  const tempRowsPerPage = urlState.comp_tSize;
  const compSearch = urlState.comp_eSearch;
  const compPage = urlState.comp_ePage;
  const compRowsPerPage = urlState.comp_eSize;
  const suggestCountryFilter = urlState.comp_suggestCountry;

  const setTempPage = useCallback((v) => setUrlState({ comp_tPage: v }), [setUrlState]);
  const setCompPage = useCallback((v) => setUrlState({ comp_ePage: v }), [setUrlState]);
  const setSuggestCountryFilter = useCallback((v) => setUrlState({ comp_suggestCountry: v }), [setUrlState]);

  const [tempRows, setTempRows] = useState([]);
  const [tempTotal, setTempTotal] = useState(0);
  const [tempFacets, setTempFacets] = useState({ sportTypes: [], dataSources: [], countries: [] });

  const [competitions, setCompetitions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [sports, setSports] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [competitionTypes, setCompetitionTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedTemp, setSelectedTemp] = useState(() => new Map());
  const [selectedComp, setSelectedComp] = useState(() => new Set());

  const [pendingTempSearch, setPendingTempSearch] = useState(tempSearch);
  useEffect(() => { setPendingTempSearch(tempSearch); }, [tempSearch]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [singleCreateOpen, setSingleCreateOpen] = useState(false);
  const [singleCreateTempRow, setSingleCreateTempRow] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [manyOneOpen, setManyOneOpen] = useState(false);
  const [oneOneOpen, setOneOneOpen] = useState(false);
  const [infoRow, setInfoRow] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestReqSeq = useRef(0);

  const SUGGEST_MIN_NAME_LEN = 4;
  const SUGGEST_MAX_SELECTION = 3;

  const showToast = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const tempReqSeq = useRef(0);

  const loadTemp = useCallback(async () => {
    const reqId = ++tempReqSeq.current;
    try {
      setLoading(true);
      setError('');
      const result = await api.getTempEntities('competitions', {
        search: tempSearch,
        sportTypeIds: sportFilter.map(Number),
        dataSourceIds: sourceFilter.map(Number),
        countryIds: countryFilter.map(Number),
        showHidden: showHiddens,
        page: tempPage,
        pageSize: tempRowsPerPage,
      });
      if (reqId !== tempReqSeq.current) return;
      setTempRows(result.rows);
      setTempTotal(result.total);
      setTempFacets(result.facets || { sportTypes: [], dataSources: [], countries: [] });
    } catch (err) {
      if (reqId !== tempReqSeq.current) return;
      setError(err?.message || 'Failed to load temp data');
      setTempRows([]);
      setTempTotal(0);
      setTempFacets({ sportTypes: [], dataSources: [], countries: [] });
    } finally {
      if (reqId === tempReqSeq.current) setLoading(false);
    }
  }, [tempSearch, sportFilter, sourceFilter, countryFilter, showHiddens, tempPage, tempRowsPerPage]);

  const loadCompetitions = useCallback(async () => {
    try {
      const searchParam = compSearch.trim();
      const list = await api.getCompetitions(searchParam ? { search: searchParam } : {});
      setCompetitions(Array.isArray(list) ? list : []);
      setSelectedComp(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to load competitions');
    }
  }, [compSearch]);

  const [pendingCompSearch, setPendingCompSearch] = useState(compSearch);
  useEffect(() => { setPendingCompSearch(compSearch); }, [compSearch]);

  useEffect(() => {
    (async () => {
      try {
        const [sportsList, sourcesList, countriesList, compTypesList, langsList] = await Promise.all([
          api.getSports().catch(() => []),
          api.getDataSources().catch(() => []),
          api.getCountries().catch(() => []),
          api.getCompetitionTypes().catch(() => []),
          api.getLanguages().catch(() => []),
        ]);
        setSports(Array.isArray(sportsList) ? sportsList : []);
        setDataSources(Array.isArray(sourcesList) ? sourcesList : []);
        setCountries(Array.isArray(countriesList) ? countriesList : []);
        setCompetitionTypes(Array.isArray(compTypesList) ? compTypesList : []);
        setLanguages(Array.isArray(langsList) ? langsList : []);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => { loadCompetitions(); }, [loadCompetitions]);
  useEffect(() => { loadTemp(); }, [loadTemp]);

  /* -------------------- Lookup maps -------------------- */
  const sportById = useMemo(() => {
    const map = new Map();
    (sports || []).forEach((s) => {
      if (s.SPORT_TYPE_ID != null) map.set(Number(s.SPORT_TYPE_ID), s);
    });
    return map;
  }, [sports]);

  const sourceById = useMemo(() => {
    const map = new Map();
    (dataSources || []).forEach((ds) => {
      if (ds.DATA_SOURCE_ID != null) map.set(Number(ds.DATA_SOURCE_ID), ds);
    });
    return map;
  }, [dataSources]);

  const countryById = useMemo(() => {
    const map = new Map();
    (countries || []).forEach((c) => {
      if (c.COUNTRY_ID != null) map.set(Number(c.COUNTRY_ID), c);
    });
    return map;
  }, [countries]);

  const langById = useMemo(() => {
    const map = new Map();
    (languages || []).forEach((l) => { if (l.id != null) map.set(Number(l.id), l); });
    return map;
  }, [languages]);

  const sportFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.sportTypes || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const sourceFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.dataSources || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const countryFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.countries || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);

  const sourceFilterValue = useMemo(
    () =>
      sourceFilter.map((id) => {
        const num = Number(id);
        const fromFacet = sourceFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = sourceById.get(num)?.ALIAS_NAME || `Source ${num}`;
        return { id: num, label, count: 0 };
      }),
    [sourceFilter, sourceFacetById, sourceById]
  );

  const countryFilterValue = useMemo(
    () =>
      countryFilter.map((id) => {
        const num = Number(id);
        const fromFacet = countryFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = countryById.get(num)?.name || `Country ${num}`;
        return { id: num, label, count: 0 };
      }),
    [countryFilter, countryFacetById, countryById]
  );

  /* -------------------- Bottom table (client-side) -------------------- */
  /* -------------------- Bottom table (server-filtered) -------------------- */
  const compTotal = (competitions || []).length;

  const pagedCompetitions = useMemo(() => {
    const start = compPage * compRowsPerPage;
    return (competitions || []).slice(start, start + compRowsPerPage);
  }, [competitions, compPage, compRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(tempTotal / tempRowsPerPage) - 1);
    if (tempPage > maxPage) setTempPage(maxPage);
  }, [tempTotal, tempRowsPerPage, tempPage]);
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(compTotal / compRowsPerPage) - 1);
    if (compPage > maxPage) setCompPage(maxPage);
  }, [compTotal, compRowsPerPage, compPage]);

  /* -------------------- Selection -------------------- */
  const pagedTemp = tempRows;

  const toggleTempSelect = (row) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      const id = row.COMPETITION_ID;
      if (next.has(id)) next.delete(id); else next.set(id, row);
      return next;
    });
  };
  const toggleCompSelect = (id) => {
    setSelectedComp((prev) => prev.has(id) ? new Set() : new Set([id]));
  };
  const toggleAllTemp = (checked) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      if (checked) pagedTemp.forEach((r) => next.set(r.COMPETITION_ID, r));
      else pagedTemp.forEach((r) => next.delete(r.COMPETITION_ID));
      return next;
    });
  };

  const selectedTempList = useMemo(
    () => Array.from(selectedTemp.values()),
    [selectedTemp]
  );
  const selectedCompList = useMemo(
    () => (competitions || []).filter((r) => selectedComp.has(r.COMPETITION_ID)),
    [competitions, selectedComp]
  );

  const clearTempSelection = useCallback(() => setSelectedTemp(new Map()), []);

  /* -------------------- Suggestions -------------------- */
  const suggestEligible = useMemo(() => {
    if (selectedTempList.length === 0 || selectedTempList.length > SUGGEST_MAX_SELECTION) return false;
    return selectedTempList.every(
      (r) => String(r.NAME || '').trim().length >= SUGGEST_MIN_NAME_LEN
    );
  }, [selectedTempList]);

  const selectedCountryIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.COUNTRY_ID != null && Number.isFinite(Number(r.COUNTRY_ID)) && Number(r.COUNTRY_ID) > 0) {
        ids.add(Number(r.COUNTRY_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMultipleCountries = selectedCountryIds.length > 1;
  const effectiveCountryFilter = suggestCountryFilter && !hasMultipleCountries;

  useEffect(() => {
    if (hasMultipleCountries) setSuggestCountryFilter(false);
  }, [hasMultipleCountries]);

  useEffect(() => {
    if (!suggestEligible) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    const payload = selectedTempList.map((r) => ({
      NAME: r.NAME,
      LANG_ID: r.LANG_ID,
      COUNTRY_ID: r.COUNTRY_ID,
    }));
    const opts = { limit: 3 };
    if (effectiveCountryFilter && selectedCountryIds.length > 0) {
      opts.countryIds = selectedCountryIds;
    }
    const reqId = ++suggestReqSeq.current;
    setSuggestLoading(true);
    (async () => {
      try {
        const result = await api.suggestTempMatches('competitions', payload, opts);
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch {
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions([]);
      } finally {
        if (reqId === suggestReqSeq.current) setSuggestLoading(false);
      }
    })();
  }, [suggestEligible, selectedTempList, effectiveCountryFilter, selectedCountryIds]);

  const suggestionByCompId = useMemo(() => {
    const m = new Map();
    suggestions.forEach((s, i) => m.set(Number(s.competitionId), { rank: i + 1, score: s.score }));
    return m;
  }, [suggestions]);

  const selectOnlyComp = (id) => {
    setSelectedComp(new Set([Number(id)]));
  };

  /* -------------------- Search commit helpers -------------------- */
  const commitTempSearch = () => {
    const trimmed = pendingTempSearch.trim();
    if (trimmed === tempSearch) return;
    setUrlState({ comp_search: trimmed, comp_tPage: 0 });
  };

  const handleSportFilterChange = (value) => {
    setUrlState({ comp_sport: (Array.isArray(value) ? value : []).map(String), comp_tPage: 0 });
  };
  const handleSourceFilterChange = (value) => {
    setUrlState({ comp_source: (Array.isArray(value) ? value : []).map(String), comp_tPage: 0 });
  };
  const handleCountryFilterChange = (value) => {
    setUrlState({ comp_country: (Array.isArray(value) ? value : []).map(String), comp_tPage: 0 });
  };
  const handleShowHiddensChange = (checked) => {
    setUrlState({ comp_hidden: checked, comp_tPage: 0 });
  };

  const hasActiveFilters =
    sportFilter.length > 0 || sourceFilter.length > 0 || countryFilter.length > 0 ||
    tempSearch !== '' || pendingTempSearch !== '' || showHiddens;

  const handleClearFilters = () => {
    setUrlState({
      comp_search: '',
      comp_sport: [],
      comp_source: [],
      comp_country: [],
      comp_hidden: false,
      comp_tPage: 0,
    });
    setPendingTempSearch('');
  };

  /* -------------------- Actions -------------------- */
  const handleReload = async () => {
    clearTempSelection();
    await loadTemp();
    showToast('Temp table reloaded', 'success');
  };
  const handleClearCache = () => showToast('Cache cleared successfully', 'success');
  const handleUndo = () => showToast('Undo requested (no-op for now)', 'info');

  const handleConnect = async () => {
    if (selectedTempList.length === 0 || selectedCompList.length !== 1) return;
    const target = selectedCompList[0];
    try {
      const result = await api.connectTempEntities(
        'competitions',
        selectedTempList.map((r) => r.COMPETITION_ID),
        target.COMPETITION_ID
      );
      showToast(
        `Connected ${result?.removedTempRows ?? selectedTempList.length} temp row(s) to ${target.name}`,
        'success'
      );
      clearTempSelection();
      await Promise.all([loadTemp(), loadCompetitions()]);
    } catch (err) {
      showToast(err?.message || 'Failed to connect', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedTempList.length === 0) return;
    try {
      await api.deleteTempEntitiesBulk('competitions', selectedTempList.map((r) => r.COMPETITION_ID));
      showToast(`Deleted ${selectedTempList.length} temp row(s)`, 'success');
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
    }
  };

  const allSelectedHidden = selectedTempList.length > 0 && selectedTempList.every((r) => Number(r.ACTIVE) === 0);

  const handleHide = async () => {
    if (selectedTempList.length === 0) return;
    const newActive = allSelectedHidden ? 1 : 0;
    try {
      for (const row of selectedTempList) {
        await api.updateTempEntity('competitions', row.COMPETITION_ID, { ACTIVE: newActive });
      }
      showToast(
        newActive === 1
          ? `Unhidden ${selectedTempList.length} temp row(s)`
          : `Hidden ${selectedTempList.length} temp row(s)`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const handleCreateClick = () => {
    if (selectedTempList.length === 0) return;
    if (selectedTempList.length === 1) {
      setSingleCreateTempRow(selectedTempList[0]);
      setSingleCreateOpen(true);
      return;
    }
    setChoiceOpen(true);
  };
  const handleChoose = (mode) => {
    setChoiceOpen(false);
    if (mode === 'many-to-one') setManyOneOpen(true);
    if (mode === 'one-to-one') setOneOneOpen(true);
  };

  const onSingleCreated = async (tempRow) => {
    try {
      if (tempRow?.COMPETITION_ID != null) {
        await api.deleteTempEntity('competitions', tempRow.COMPETITION_ID);
      }
    } catch (err) {
      showToast(err?.message || 'Created but failed to remove temp row', 'warning');
    } finally {
      setSingleCreateTempRow(null);
      await Promise.all([loadTemp(), loadCompetitions()]);
    }
  };

  const onManyToOneCreated = async (created, term, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('competitions', tempIds);
      }
      showToast(`Created competition "${created?.name ?? ''}" with ${(term?.values || []).length} values`, 'success');
    } catch (err) {
      showToast(err?.message || 'Created competition but failed to remove temp rows', 'warning');
    } finally {
      clearTempSelection();
      await Promise.all([loadTemp(), loadCompetitions()]);
    }
  };

  const onOneToOneCreated = async (createdList, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('competitions', tempIds);
      }
      showToast(`Created ${createdList.length} competitions`, 'success');
    } catch (err) {
      showToast(err?.message || 'Some temp rows could not be removed', 'warning');
    } finally {
      clearTempSelection();
      await Promise.all([loadTemp(), loadCompetitions()]);
    }
  };

  /* -------------------- Render -------------------- */
  const tempAllChecked = pagedTemp.length > 0 && pagedTemp.every((r) => selectedTemp.has(r.COMPETITION_ID));
  const tempSomeChecked = pagedTemp.some((r) => selectedTemp.has(r.COMPETITION_ID));
  const searchDirty = pendingTempSearch.trim() !== tempSearch;

  const selectedComps = selectedCompList.length;
  const selectedTemps = selectedTempList.length;
  const canConnect = selectedTemps >= 1 && selectedComps === 1;
  const canDelete = selectedTemps >= 1;
  const canHide = selectedTemps >= 1;
  const canCreate = selectedTemps >= 1;

  const compactTableSx = {
    '& .MuiTableCell-root': { fontSize: '0.8125rem', paddingTop: 0.5, paddingBottom: 0.5 },
    '& .MuiTableCell-head': { fontSize: '0.8125rem' },
  };
  const tableMaxHeightSx = { maxHeight: 380 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.dataSources || []}
            value={sourceFilterValue}
            onChange={(_e, newValue) => handleSourceFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.dataSources || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Data Source" placeholder="Search data source…" />}
          />
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={(tempFacets.sportTypes || []).length === 0}>
            <InputLabel>Sport Type</InputLabel>
            <Select
              multiple
              value={sportFilter}
              onChange={(e) => handleSportFilterChange(e.target.value)}
              input={<OutlinedInput label="Sport Type" />}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {sel.map((v) => {
                    const label = sportFacetById.get(Number(v))?.label || sportById.get(Number(v))?.ALIAS_NAME || v;
                    return <Chip key={v} size="small" label={label} />;
                  })}
                </Box>
              )}
            >
              {(tempFacets.sportTypes || []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Checkbox checked={sportFilter.includes(f.id)} size="small" />
                  <ListItemText primary={f.label} secondary={`${f.count}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 240, maxWidth: 380 }}
            options={tempFacets.countries || []}
            value={countryFilterValue}
            onChange={(_e, newValue) => handleCountryFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.countries || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Country" placeholder="Search country…" />}
          />
          <TextField
            size="small"
            placeholder="Search temp name…"
            value={pendingTempSearch}
            onChange={(e) => setPendingTempSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTempSearch(); } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
          <PrimaryButton size="small" startIcon={<SearchIcon />} onClick={commitTempSearch} disabled={!searchDirty}>Search</PrimaryButton>
          <FormControlLabel
            control={<Switch size="small" checked={showHiddens} onChange={(e) => handleShowHiddensChange(e.target.checked)} />}
            label="Show Hiddens"
          />
          <SecondaryButton size="small" startIcon={<FilterAltOffIcon />} onClick={handleClearFilters} disabled={!hasActiveFilters}>Clear Filters</SecondaryButton>
          <Box sx={{ flex: 1 }} />
          <SecondaryButton size="small" startIcon={<RefreshIcon />} onClick={handleReload}>Reload Table</SecondaryButton>
          <SecondaryButton size="small" startIcon={<CleaningServicesIcon />} onClick={handleClearCache}>Clear Cache</SecondaryButton>
          <SecondaryButton size="small" startIcon={<UndoIcon />} onClick={handleUndo}>Undo</SecondaryButton>
        </Box>
      </Paper>

      {/* Top table: temp competitions */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Unidentified Competitions ({tempTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedTemps} selected</Typography>
        </Box>
        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" indeterminate={tempSomeChecked && !tempAllChecked} checked={tempAllChecked} onChange={(e) => toggleAllTemp(e.target.checked)} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data Source</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedTemp.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No unidentified competitions</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedTemp.map((row) => (
                <TableRow
                  key={row.COMPETITION_ID}
                  hover
                  selected={selectedTemp.has(row.COMPETITION_ID)}
                  sx={{ cursor: 'pointer', opacity: Number(row.ACTIVE) === 0 ? 0.55 : 1 }}
                  onClick={() => toggleTempSelect(row)}
                  onDoubleClick={() => setInfoRow(row)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={selectedTemp.has(row.COMPETITION_ID)} onChange={() => toggleTempSelect(row)} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={row.NAME || ''} arrow><span>{row.NAME}</span></Tooltip>
                  </TableCell>
                  <TableCell>{sourceById.get(Number(row.DATA_SOURCE_ID))?.ALIAS_NAME || row.DATA_SOURCE_ID || '-'}</TableCell>
                  <TableCell>{sportById.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-'}</TableCell>
                  <TableCell>{countryById.get(Number(row.COUNTRY_ID))?.name || row.COUNTRY_ID || '-'}</TableCell>
                  <TableCell>{row.CREATED_TIME || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={tempTotal}
          page={tempPage}
          rowsPerPage={tempRowsPerPage}
          onPageChange={setTempPage}
          onRowsPerPageChange={(n) => setUrlState({ comp_tSize: n, comp_tPage: 0 })}
        />
      </Paper>

      {/* Bulk action bar */}
      <Paper sx={{ p: 1.5, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Selected: <strong>{selectedTemps}</strong> temp / <strong>{selectedComps}</strong> existing
        </Typography>
        <Box sx={{ flex: 1 }} />
        <PrimaryButton size="small" startIcon={<LinkIcon />} disabled={!canConnect} onClick={handleConnect}>Connect</PrimaryButton>
        <SecondaryButton size="small" startIcon={<AddIcon />} disabled={!canCreate} onClick={handleCreateClick}>Create</SecondaryButton>
        <SecondaryButton size="small" startIcon={<VisibilityOffIcon />} disabled={!canHide} onClick={handleHide}>{allSelectedHidden ? 'Unhide' : 'Hide'}</SecondaryButton>
        <SecondaryButton size="small" startIcon={<DeleteIcon />} disabled={!canDelete} onClick={handleDelete}>Delete</SecondaryButton>
      </Paper>

      {/* Bottom table: existing competitions */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Existing Competitions ({compTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedComps} selected</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search existing competitions… (Enter to search)"
            value={pendingCompSearch}
            onChange={(e) => setPendingCompSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = pendingCompSearch.trim();
                if (trimmed !== compSearch) setUrlState({ comp_eSearch: trimmed, comp_ePage: 0 });
              }
            }}
            onBlur={() => {
              const trimmed = pendingCompSearch.trim();
              if (trimmed !== compSearch) setUrlState({ comp_eSearch: trimmed, comp_ePage: 0 });
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: compSearch && (
                <IconButton size="small" onClick={() => { setPendingCompSearch(''); setUrlState({ comp_eSearch: '', comp_ePage: 0 }); }}>
                  <FilterAltOffIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        <CompetitionSuggestionBanner
          selectedCount={selectedTempList.length}
          maxSelection={SUGGEST_MAX_SELECTION}
          minNameLen={SUGGEST_MIN_NAME_LEN}
          eligible={suggestEligible}
          loading={suggestLoading}
          suggestions={suggestions}
          countryById={countryById}
          selectedCompIds={selectedComp}
          onPick={(id) => selectOnlyComp(id)}
          suggestCountryFilter={suggestCountryFilter}
          onToggleCountryFilter={(val) => setSuggestCountryFilter(val)}
          hasMultipleCountries={hasMultipleCountries}
          selectedCountryIds={selectedCountryIds}
        />

        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedCompetitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No competitions match</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedCompetitions.map((row) => {
                const suggestion = suggestionByCompId.get(Number(row.COMPETITION_ID));
                return (
                  <TableRow
                    key={row.COMPETITION_ID}
                    hover
                    selected={selectedComp.has(row.COMPETITION_ID)}
                    sx={{ cursor: 'pointer', ...(suggestion ? { backgroundColor: 'rgba(25, 118, 210, 0.06)' } : null) }}
                    onClick={() => toggleCompSelect(row.COMPETITION_ID)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Radio size="small" checked={selectedComp.has(row.COMPETITION_ID)} onChange={() => toggleCompSelect(row.COMPETITION_ID)} />
                    </TableCell>
                    <TableCell>{row.COMPETITION_ID}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={row.COMPETITION_IMAGE_URL || undefined}
                          sx={{ width: 32, height: 32, bgcolor: row.COMPETITION_IMAGE_URL ? 'transparent' : '#1976d2', fontSize: '0.95rem' }}
                        >
                          <EmojiEventsIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{row.name || `#${row.COMPETITION_ID}`}</Typography>
                        {suggestion && (
                          <Tooltip arrow title={`Auto-suggested match (${Math.round(suggestion.score * 100)}% similarity)`}>
                            <Chip size="small" color="primary" variant="outlined" label={`Suggested #${suggestion.rank} · ${Math.round(suggestion.score * 100)}%`} sx={{ ml: 0.5 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{row.countryName || '-'}</TableCell>
                    <TableCell>{row.sport || '-'}</TableCell>
                    <TableCell>{row.GENDER === 1 ? 'Male' : row.GENDER === 2 ? 'Female' : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={compTotal}
          page={compPage}
          rowsPerPage={compRowsPerPage}
          onPageChange={setCompPage}
          onRowsPerPageChange={(n) => setUrlState({ comp_eSize: n, comp_ePage: 0 })}
        />
      </Paper>

      {error && <MuiAlert severity="error" onClose={() => setError('')}>{error}</MuiAlert>}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</MuiAlert>
      </Snackbar>

      <CompetitionCreateDialog
        open={singleCreateOpen}
        onClose={() => setSingleCreateOpen(false)}
        tempRow={singleCreateTempRow}
        countries={countries}
        sports={sports}
        competitionTypes={competitionTypes}
        onCreated={(comp) => {
          showToast(`Created competition "${comp?.name ?? ''}"`, 'success');
          onSingleCreated(singleCreateTempRow);
          setSingleCreateOpen(false);
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
      <CreateModeChoiceDialog
        open={choiceOpen}
        count={selectedTempList.length}
        onClose={() => setChoiceOpen(false)}
        onChoose={handleChoose}
        entityName="competition"
      />
      <ManyToOneCompetitionDialog
        open={manyOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        competitionTypes={competitionTypes}
        onClose={() => setManyOneOpen(false)}
        onCreated={onManyToOneCreated}
      />
      <OneToOneTabsCompetitionDialog
        open={oneOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        competitionTypes={competitionTypes}
        onClose={() => setOneOneOpen(false)}
        onCreated={onOneToOneCreated}
      />
      <TempInfoDialog
        row={infoRow}
        open={!!infoRow}
        onClose={() => setInfoRow(null)}
        sourceById={sourceById}
        sportById={sportById}
        langById={langById}
      />
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Competition create dialog (for Terms Fix page)
 * ------------------------------------------------------------------------ */
function CompetitionCreateDialog({ open, onClose, tempRow, countries, sports, competitionTypes, onCreated, onError }) {
  const [formData, setFormData] = useState({ name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: 1, COMPETITION_TYPE: 1 });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && tempRow) {
      setFormData({
        name: tempRow.NAME || '',
        COUNTRY_ID: tempRow.COUNTRY_ID != null && Number(tempRow.COUNTRY_ID) > 0 ? Number(tempRow.COUNTRY_ID) : '',
        SPORT_TYPE_ID: tempRow.SPORT_TYPE_ID != null ? Number(tempRow.SPORT_TYPE_ID) : '',
        GENDER: 1,
        COMPETITION_TYPE: 1,
      });
      setFormErrors({});
    }
  }, [open, tempRow]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.COUNTRY_ID === '' || formData.COUNTRY_ID == null) err.COUNTRY_ID = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const langId = tempRow?.LANG_ID != null && Number.isFinite(Number(tempRow.LANG_ID)) ? Number(tempRow.LANG_ID) : 1;
      const newTerm = await api.createTerm({
        category: 'Competitions Names',
        values: [{ languageId: langId, value: formData.name.trim(), isDefault: true, status: 'Approved' }],
      });
      const res = await api.createCompetition({
        NAME_ID: newTerm.id,
        COUNTRY_ID: Number(formData.COUNTRY_ID),
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        GENDER: Number(formData.GENDER),
        COMPETITION_TYPE: Number(formData.COMPETITION_TYPE),
      });
      const created = res?.data ?? res;
      onCreated(created);
    } catch (err) {
      onError(err?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 1.5 }}>Create Competition</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" required label="Name"
              value={formData.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!formErrors.name} helperText={formErrors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={countries || []}
              getOptionLabel={(o) => o.name || ''}
              value={(countries || []).find((c) => c.COUNTRY_ID === formData.COUNTRY_ID) || null}
              onChange={(_e, v) => handleChange('COUNTRY_ID', v ? v.COUNTRY_ID : '')}
              renderInput={(params) => (
                <TextField {...params} label="Country" required error={!!formErrors.COUNTRY_ID} helperText={formErrors.COUNTRY_ID} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={sports || []}
              getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''}
              value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null}
              onChange={(_e, v) => handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')}
              renderInput={(params) => (
                <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? 1} label="Gender" onChange={(e) => handleChange('GENDER', Number(e.target.value))}>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Competition Type</InputLabel>
              <Select value={formData.COMPETITION_TYPE ?? 1} label="Competition Type" onChange={(e) => handleChange('COMPETITION_TYPE', Number(e.target.value))}>
                {(competitionTypes || []).map((ct) => (
                  <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Many-to-One Competition dialog: create one competition with all NAMEs as
 * term values
 * ------------------------------------------------------------------------ */
function ManyToOneCompetitionDialog({ open, onClose, tempRows = [], countries, sports, competitionTypes, onCreated }) {
  const [formData, setFormData] = useState({ name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: 1, COMPETITION_TYPE: 1 });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({
      name: tempRows[0]?.NAME || '',
      COUNTRY_ID: tempRows[0]?.COUNTRY_ID != null && Number(tempRows[0].COUNTRY_ID) > 0 ? Number(tempRows[0].COUNTRY_ID) : '',
      SPORT_TYPE_ID: tempRows[0]?.SPORT_TYPE_ID != null ? Number(tempRows[0].SPORT_TYPE_ID) : '',
      GENDER: 1,
      COMPETITION_TYPE: 1,
    });
    setFormErrors({});
  }, [open, tempRows]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const values = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of tempRows) {
      const v = String(row.NAME ?? '').trim();
      const lang = Number(row.LANG_ID);
      if (!v || !Number.isFinite(lang)) continue;
      const key = `${lang}|${v.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ languageId: lang, value: v, isDefault: list.length === 0, status: 'Approved' });
    }
    return list;
  }, [tempRows]);

  const handleCreate = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.COUNTRY_ID === '' || formData.COUNTRY_ID == null) err.COUNTRY_ID = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const allValues = [
        { languageId: 1, value: formData.name.trim(), isDefault: true, status: 'Approved' },
        ...values.filter((v) => !(v.languageId === 1 && v.value.toLowerCase() === formData.name.trim().toLowerCase())),
      ];
      const newTerm = await api.createTerm({ category: 'Competitions Names', values: allValues });
      const res = await api.createCompetition({
        NAME_ID: newTerm.id,
        COUNTRY_ID: Number(formData.COUNTRY_ID),
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        GENDER: Number(formData.GENDER),
        COMPETITION_TYPE: Number(formData.COMPETITION_TYPE),
      });
      const created = res?.data ?? res;
      onCreated?.(created, newTerm, tempRows.map((r) => r.COMPETITION_ID));
      onClose?.();
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, _form: e?.message || 'Failed to create competition' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create Competition from {tempRows.length} temp rows
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, background: '#f9fafb', borderColor: '#e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Term values that will be created ({values.length + 1})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            The <strong>Name</strong> below will be added as an English (Approved) default value.
            The values from the selected temp rows will be added under their own LANG_ID.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {values.map((v) => (
              <Chip key={`${v.languageId}|${v.value}`} size="small" label={`[${v.languageId}] ${v.value}`} sx={{ maxWidth: 360 }} />
            ))}
          </Box>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" required label="Name" value={formData.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} error={!!formErrors.name} helperText={formErrors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === formData.COUNTRY_ID) || null} onChange={(_e, v) => handleChange('COUNTRY_ID', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Country" required error={!!formErrors.COUNTRY_ID} helperText={formErrors.COUNTRY_ID} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null} onChange={(_e, v) => handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? 1} label="Gender" onChange={(e) => handleChange('GENDER', Number(e.target.value))}>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Competition Type</InputLabel>
              <Select value={formData.COMPETITION_TYPE ?? 1} label="Competition Type" onChange={(e) => handleChange('COMPETITION_TYPE', Number(e.target.value))}>
                {(competitionTypes || []).map((ct) => (
                  <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {formErrors._form && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formErrors._form}</Box>}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={saving || values.length === 0} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * One-to-One Tabs Competition dialog: one tab per temp row, creates one
 * competition per tab
 * ------------------------------------------------------------------------ */
function OneToOneTabsCompetitionDialog({ open, onClose, tempRows = [], countries, sports, competitionTypes, onCreated }) {
  const DEFAULT_FORM = { name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: 1, COMPETITION_TYPE: 1 };
  const [activeTab, setActiveTab] = useState(0);
  const [forms, setForms] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [completed, setCompleted] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setActiveTab(0);
    setForms(tempRows.map((row) => ({
      ...DEFAULT_FORM,
      name: row.NAME || '',
      COUNTRY_ID: row.COUNTRY_ID != null && Number(row.COUNTRY_ID) > 0 ? Number(row.COUNTRY_ID) : '',
      SPORT_TYPE_ID: row.SPORT_TYPE_ID != null ? Number(row.SPORT_TYPE_ID) : '',
      _tempRow: row,
    })));
    setErrors(tempRows.map(() => ({})));
    setCompleted(new Set());
    setFormError('');
  }, [open, tempRows]);

  const onChange = (tabIdx, field, value) => {
    setForms((prev) => { const next = [...prev]; next[tabIdx] = { ...next[tabIdx], [field]: value }; return next; });
    setErrors((prev) => { const next = [...prev]; if (next[tabIdx]?.[field]) { next[tabIdx] = { ...next[tabIdx], [field]: undefined }; } return next; });
  };

  const validate = (f) => {
    const err = {};
    if (!f.name || String(f.name).trim() === '') err.name = 'Required';
    if (f.COUNTRY_ID === '' || f.COUNTRY_ID == null) err.COUNTRY_ID = 'Required';
    if (f.SPORT_TYPE_ID === '' || f.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    return err;
  };

  const tabs = useMemo(
    () => tempRows.map((row, idx) => ({ label: row.NAME || `Row ${row.COMPETITION_ID}`, done: completed.has(idx) })),
    [tempRows, completed]
  );

  const handleCreateAll = async () => {
    const nextErrors = forms.map(validate);
    setErrors(nextErrors);
    const firstInvalid = nextErrors.findIndex((e) => Object.keys(e).length > 0);
    if (firstInvalid !== -1) { setActiveTab(firstInvalid); return; }
    try {
      setSaving(true);
      setFormError('');
      const createdList = [];
      const createdTempIds = [];
      const failed = [];
      const nextCompleted = new Set(completed);
      for (let idx = 0; idx < forms.length; idx += 1) {
        if (nextCompleted.has(idx)) continue;
        const form = forms[idx];
        const row = form._tempRow;
        const langId = row?.LANG_ID != null && Number.isFinite(Number(row.LANG_ID)) ? Number(row.LANG_ID) : 1;
        try {
          const newTerm = await api.createTerm({
            category: 'Competitions Names',
            values: [{ languageId: langId, value: form.name.trim(), isDefault: true, status: 'Approved' }],
          });
          const res = await api.createCompetition({
            NAME_ID: newTerm.id,
            COUNTRY_ID: Number(form.COUNTRY_ID),
            SPORT_TYPE_ID: Number(form.SPORT_TYPE_ID),
            GENDER: Number(form.GENDER),
            COMPETITION_TYPE: Number(form.COMPETITION_TYPE),
          });
          createdList.push(res?.data ?? res);
          createdTempIds.push(row?.COMPETITION_ID);
          nextCompleted.add(idx);
        } catch (err) {
          failed.push({ idx, message: err?.message || 'Failed' });
        }
      }
      setCompleted(nextCompleted);
      if (failed.length > 0) {
        setFormError(`Created ${createdList.length}/${forms.length}. Errors: ${failed.map((f) => `tab ${f.idx + 1} – ${f.message}`).join(' | ')}`);
        if (failed[0]?.idx != null) setActiveTab(failed[0].idx);
      }
      if (createdList.length > 0) onCreated?.(createdList, createdTempIds.filter((x) => x != null));
      if (failed.length === 0) onClose?.();
    } catch (err) {
      setFormError(err?.message || 'Failed to create competitions');
    } finally {
      setSaving(false);
    }
  };

  if (forms.length === 0) return null;
  const f = forms[activeTab] || {};

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create {tempRows.length} Competitions (one per tab)
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 0, pb: 2 }}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 }, '& .Mui-selected': { color: '#1976d2' } }}>
          {tabs.map((t, idx) => (
            <Tab key={idx} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{t.done && <Box component="span" sx={{ color: '#15803d', fontSize: 16, display: 'flex' }}>✓</Box>}<span>{t.label}</span></Box>} />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Source temp row:</Typography>
            <Chip size="small" label={`[${f._tempRow?.LANG_ID}] ${f._tempRow?.NAME ?? ''}`} sx={{ maxWidth: 420 }} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" required label="Name" value={f.name ?? ''} onChange={(e) => onChange(activeTab, 'name', e.target.value)} error={!!(errors[activeTab] || {}).name} helperText={(errors[activeTab] || {}).name} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === f.COUNTRY_ID) || null} onChange={(_e, v) => onChange(activeTab, 'COUNTRY_ID', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Country" required error={!!(errors[activeTab] || {}).COUNTRY_ID} helperText={(errors[activeTab] || {}).COUNTRY_ID} />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === f.SPORT_TYPE_ID) || null} onChange={(_e, v) => onChange(activeTab, 'SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!(errors[activeTab] || {}).SPORT_TYPE_ID} helperText={(errors[activeTab] || {}).SPORT_TYPE_ID} />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={f.GENDER ?? 1} label="Gender" onChange={(e) => onChange(activeTab, 'GENDER', Number(e.target.value))}>
                  <MenuItem value={1}>Male</MenuItem>
                  <MenuItem value={2}>Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Competition Type</InputLabel>
                <Select value={f.COMPETITION_TYPE ?? 1} label="Competition Type" onChange={(e) => onChange(activeTab, 'COMPETITION_TYPE', Number(e.target.value))}>
                  {(competitionTypes || []).map((ct) => (
                    <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          {formError && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formError}</Box>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreateAll} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : `Create ${forms.length} Competitions`}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Competition suggestion banner with country filter toggle
 * ------------------------------------------------------------------------ */
function CompetitionSuggestionBanner({
  selectedCount,
  maxSelection,
  minNameLen,
  eligible,
  loading,
  suggestions,
  countryById,
  selectedCompIds,
  onPick,
  suggestCountryFilter,
  onToggleCountryFilter,
  hasMultipleCountries,
  selectedCountryIds,
}) {
  if (selectedCount === 0) return null;

  if (!eligible) {
    const reason =
      selectedCount > maxSelection
        ? `Auto-suggestions are disabled when more than ${maxSelection} temp rows are selected.`
        : `Selected temp names must have more than ${minNameLen - 1} characters to auto-suggest.`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.03)', border: '1px dashed #d0d0d0' }}>
        <Typography variant="caption" color="text.secondary">{reason}</Typography>
      </Box>
    );
  }

  const countryLabel = selectedCountryIds.length === 1
    ? countryById.get(selectedCountryIds[0])?.name || `Country ${selectedCountryIds[0]}`
    : '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.06)', border: '1px solid rgba(25,118,210,0.2)' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
        {loading ? 'Finding best matches…' : 'Suggested matches:'}
      </Typography>
      {!loading && suggestions.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No similar existing competitions found. Use the search below to connect manually.
        </Typography>
      )}
      {!loading &&
        suggestions.map((s, idx) => {
          const label = s.name || `#${s.competitionId}`;
          const pct = Math.round(s.score * 100);
          const isSelected = selectedCompIds.has(Number(s.competitionId));
          return (
            <Tooltip key={s.competitionId} arrow title={`Rank #${idx + 1} · ${pct}% similarity`}>
              <Chip
                size="small" clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                icon={<EmojiEventsIcon />}
                label={`#${idx + 1}  ${label}  ·  ${pct}%`}
                onClick={() => onPick(s.competitionId)}
                sx={{ fontWeight: 500 }}
              />
            </Tooltip>
          );
        })}
      <Box sx={{ flex: 1 }} />
      <Tooltip arrow title={
        hasMultipleCountries
          ? 'Country filter disabled: selected temp rows belong to different countries'
          : suggestCountryFilter
            ? `Showing only competitions from ${countryLabel || 'the same country'}. Toggle off to see all.`
            : 'Showing all competitions. Toggle on to filter by country.'
      }>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={suggestCountryFilter}
              onChange={(e) => onToggleCountryFilter(e.target.checked)}
              disabled={hasMultipleCountries}
            />
          }
          label={
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              Same country{countryLabel ? `: ${countryLabel}` : ''}
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      </Tooltip>
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Competitors tab
 * ------------------------------------------------------------------------ */

function CompetitorsTermsFix() {
  const [urlState, setUrlState] = useUrlFilters({
    cmpt_search: { type: 'string', default: '' },
    cmpt_sport: { type: 'array', default: [] },
    cmpt_source: { type: 'array', default: [] },
    cmpt_country: { type: 'array', default: [] },
    cmpt_comp: { type: 'array', default: [] },
    cmpt_hidden: { type: 'boolean', default: false },
    cmpt_tPage: { type: 'number', default: 0 },
    cmpt_tSize: { type: 'number', default: 10 },
    cmpt_eSearch: { type: 'string', default: '' },
    cmpt_ePage: { type: 'number', default: 0 },
    cmpt_eSize: { type: 'number', default: 10 },
    cmpt_suggestCountry: { type: 'boolean', default: true },
    cmpt_suggestComp: { type: 'boolean', default: true },
  });

  const tempSearch = urlState.cmpt_search;
  const sportFilter = useMemo(() => (urlState.cmpt_sport || []).map(Number).filter(Number.isFinite), [urlState.cmpt_sport]);
  const sourceFilter = useMemo(() => (urlState.cmpt_source || []).map(Number).filter(Number.isFinite), [urlState.cmpt_source]);
  const countryFilter = useMemo(() => (urlState.cmpt_country || []).map(Number).filter(Number.isFinite), [urlState.cmpt_country]);
  const competitionFilter = useMemo(() => (urlState.cmpt_comp || []).map(Number).filter(Number.isFinite), [urlState.cmpt_comp]);
  const showHiddens = urlState.cmpt_hidden;
  const tempPage = urlState.cmpt_tPage;
  const tempRowsPerPage = urlState.cmpt_tSize;
  const existSearch = urlState.cmpt_eSearch;
  const existPage = urlState.cmpt_ePage;
  const existRowsPerPage = urlState.cmpt_eSize;
  const suggestCountryFilter = urlState.cmpt_suggestCountry;
  const suggestCompetitionFilter = urlState.cmpt_suggestComp;

  const setTempPage = useCallback((v) => setUrlState({ cmpt_tPage: v }), [setUrlState]);
  const setExistPage = useCallback((v) => setUrlState({ cmpt_ePage: v }), [setUrlState]);
  const setSuggestCountryFilter = useCallback((v) => setUrlState({ cmpt_suggestCountry: v }), [setUrlState]);
  const setSuggestCompetitionFilter = useCallback((v) => setUrlState({ cmpt_suggestComp: v }), [setUrlState]);

  const [tempRows, setTempRows] = useState([]);
  const [tempTotal, setTempTotal] = useState(0);
  const [tempFacets, setTempFacets] = useState({ sportTypes: [], dataSources: [], countries: [], competitions: [] });

  const [existingCompetitors, setExistingCompetitors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [sports, setSports] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [competitorTypes, setCompetitorTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedTemp, setSelectedTemp] = useState(() => new Map());
  const [selectedExist, setSelectedExist] = useState(() => new Set());

  const [pendingTempSearch, setPendingTempSearch] = useState(tempSearch);
  useEffect(() => { setPendingTempSearch(tempSearch); }, [tempSearch]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [singleCreateOpen, setSingleCreateOpen] = useState(false);
  const [singleCreateTempRow, setSingleCreateTempRow] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [manyOneOpen, setManyOneOpen] = useState(false);
  const [oneOneOpen, setOneOneOpen] = useState(false);
  const [infoRow, setInfoRow] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestReqSeq = useRef(0);

  const SUGGEST_MIN_NAME_LEN = 4;
  const SUGGEST_MAX_SELECTION = 3;

  const showToast = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const tempReqSeq = useRef(0);

  const loadTemp = useCallback(async () => {
    const reqId = ++tempReqSeq.current;
    try {
      setLoading(true);
      setError('');
      const result = await api.getTempEntities('competitors', {
        search: tempSearch,
        sportTypeIds: sportFilter.map(Number),
        dataSourceIds: sourceFilter.map(Number),
        countryIds: countryFilter.map(Number),
        competitionIds: competitionFilter.map(Number),
        showHidden: showHiddens,
        page: tempPage,
        pageSize: tempRowsPerPage,
      });
      if (reqId !== tempReqSeq.current) return;
      setTempRows(result.rows);
      setTempTotal(result.total);
      setTempFacets(result.facets || { sportTypes: [], dataSources: [], countries: [], competitions: [] });
    } catch (err) {
      if (reqId !== tempReqSeq.current) return;
      setError(err?.message || 'Failed to load temp data');
      setTempRows([]);
      setTempTotal(0);
      setTempFacets({ sportTypes: [], dataSources: [], countries: [], competitions: [] });
    } finally {
      if (reqId === tempReqSeq.current) setLoading(false);
    }
  }, [tempSearch, sportFilter, sourceFilter, countryFilter, competitionFilter, showHiddens, tempPage, tempRowsPerPage]);

  const loadExisting = useCallback(async (overrides = {}) => {
    try {
      const params = {};
      const searchParam = existSearch.trim();
      if (searchParam) params.search = searchParam;
      if (overrides.sportTypeId) params.sportTypeId = overrides.sportTypeId;
      if (overrides.mainCompetition) params.mainCompetition = overrides.mainCompetition;
      const list = await api.getCompetitors(params);
      setExistingCompetitors(Array.isArray(list) ? list : []);
      setSelectedExist(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to load competitors');
    }
  }, [existSearch]);

  const [pendingExistSearch, setPendingExistSearch] = useState(existSearch);
  useEffect(() => { setPendingExistSearch(existSearch); }, [existSearch]);

  useEffect(() => {
    (async () => {
      try {
        const [sportsList, sourcesList, countriesList, compsList, compTypesList, langsList] = await Promise.all([
          api.getSports().catch(() => []),
          api.getDataSources().catch(() => []),
          api.getCountries().catch(() => []),
          api.getCompetitions().catch(() => []),
          api.getCompetitorTypes().catch(() => []),
          api.getLanguages().catch(() => []),
        ]);
        setSports(Array.isArray(sportsList) ? sportsList : []);
        setDataSources(Array.isArray(sourcesList) ? sourcesList : []);
        setCountries(Array.isArray(countriesList) ? countriesList : []);
        setCompetitions(Array.isArray(compsList) ? compsList : []);
        setCompetitorTypes(Array.isArray(compTypesList) ? compTypesList : []);
        setLanguages(Array.isArray(langsList) ? langsList : []);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => { loadTemp(); }, [loadTemp]);

  /* -------------------- Lookup maps -------------------- */
  const sportById = useMemo(() => {
    const map = new Map();
    (sports || []).forEach((s) => { if (s.SPORT_TYPE_ID != null) map.set(Number(s.SPORT_TYPE_ID), s); });
    return map;
  }, [sports]);

  const sourceById = useMemo(() => {
    const map = new Map();
    (dataSources || []).forEach((ds) => { if (ds.DATA_SOURCE_ID != null) map.set(Number(ds.DATA_SOURCE_ID), ds); });
    return map;
  }, [dataSources]);

  const countryById = useMemo(() => {
    const map = new Map();
    (countries || []).forEach((c) => { if (c.COUNTRY_ID != null) map.set(Number(c.COUNTRY_ID), c); });
    return map;
  }, [countries]);

  const competitionById = useMemo(() => {
    const map = new Map();
    (competitions || []).forEach((c) => { if (c.COMPETITION_ID != null) map.set(Number(c.COMPETITION_ID), c); });
    return map;
  }, [competitions]);

  const langById = useMemo(() => {
    const map = new Map();
    (languages || []).forEach((l) => { if (l.id != null) map.set(Number(l.id), l); });
    return map;
  }, [languages]);

  const sportFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.sportTypes || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const sourceFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.dataSources || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const countryFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.countries || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const competitionFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.competitions || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);

  const sourceFilterValue = useMemo(
    () =>
      sourceFilter.map((id) => {
        const num = Number(id);
        const fromFacet = sourceFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = sourceById.get(num)?.ALIAS_NAME || `Source ${num}`;
        return { id: num, label, count: 0 };
      }),
    [sourceFilter, sourceFacetById, sourceById]
  );

  const countryFilterValue = useMemo(
    () =>
      countryFilter.map((id) => {
        const num = Number(id);
        const fromFacet = countryFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = countryById.get(num)?.name || `Country ${num}`;
        return { id: num, label, count: 0 };
      }),
    [countryFilter, countryFacetById, countryById]
  );

  const competitionFilterValue = useMemo(
    () =>
      competitionFilter.map((id) => {
        const num = Number(id);
        const fromFacet = competitionFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = competitionById.get(num)?.name || `Competition ${num}`;
        return { id: num, label, count: 0 };
      }),
    [competitionFilter, competitionFacetById, competitionById]
  );

  /* -------------------- Bottom table (client-paged) -------------------- */
  const existTotal = (existingCompetitors || []).length;

  const pagedExisting = useMemo(() => {
    const start = existPage * existRowsPerPage;
    return (existingCompetitors || []).slice(start, start + existRowsPerPage);
  }, [existingCompetitors, existPage, existRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(tempTotal / tempRowsPerPage) - 1);
    if (tempPage > maxPage) setTempPage(maxPage);
  }, [tempTotal, tempRowsPerPage, tempPage]);
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(existTotal / existRowsPerPage) - 1);
    if (existPage > maxPage) setExistPage(maxPage);
  }, [existTotal, existRowsPerPage, existPage]);

  /* -------------------- Selection -------------------- */
  const pagedTemp = tempRows;

  const toggleTempSelect = (row) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      const id = row.COMPETITOR_ID;
      if (next.has(id)) next.delete(id); else next.set(id, row);
      return next;
    });
  };
  const toggleExistSelect = (id) => {
    setSelectedExist((prev) => prev.has(id) ? new Set() : new Set([id]));
  };
  const toggleAllTemp = (checked) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      if (checked) pagedTemp.forEach((r) => next.set(r.COMPETITOR_ID, r));
      else pagedTemp.forEach((r) => next.delete(r.COMPETITOR_ID));
      return next;
    });
  };

  const selectedTempList = useMemo(() => Array.from(selectedTemp.values()), [selectedTemp]);
  const selectedExistList = useMemo(
    () => (existingCompetitors || []).filter((r) => selectedExist.has(r.COMPETITOR_ID)),
    [existingCompetitors, selectedExist]
  );

  const clearTempSelection = useCallback(() => setSelectedTemp(new Map()), []);

  /* -------------------- Suggestions -------------------- */
  const suggestEligible = useMemo(() => {
    if (selectedTempList.length === 0 || selectedTempList.length > SUGGEST_MAX_SELECTION) return false;
    return selectedTempList.every(
      (r) => String(r.NAME || '').trim().length >= SUGGEST_MIN_NAME_LEN
    );
  }, [selectedTempList]);

  const selectedCountryIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.COUNTRY_ID != null && Number.isFinite(Number(r.COUNTRY_ID)) && Number(r.COUNTRY_ID) > 0) {
        ids.add(Number(r.COUNTRY_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMultipleCountries = selectedCountryIds.length > 1;
  const effectiveCountryFilter = suggestCountryFilter && !hasMultipleCountries;

  useEffect(() => {
    if (hasMultipleCountries) setSuggestCountryFilter(false);
  }, [hasMultipleCountries]);

  const selectedSportTypeIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.SPORT_TYPE_ID != null && Number.isFinite(Number(r.SPORT_TYPE_ID)) && Number(r.SPORT_TYPE_ID) > 0) {
        ids.add(Number(r.SPORT_TYPE_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMixedSportTypes = selectedSportTypeIds.length > 1;

  const selectedCompetitionIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.COMPETITION_ID != null && Number.isFinite(Number(r.COMPETITION_ID)) && Number(r.COMPETITION_ID) > 0) {
        ids.add(Number(r.COMPETITION_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMultipleCompetitions = selectedCompetitionIds.length > 1;
  const effectiveCompetitionFilter = suggestCompetitionFilter && !hasMultipleCompetitions;

  useEffect(() => {
    if (hasMultipleCompetitions) setSuggestCompetitionFilter(false);
  }, [hasMultipleCompetitions]);

  useEffect(() => {
    if (hasMixedSportTypes) {
      setExistingCompetitors([]);
      setSelectedExist(new Set());
      return;
    }
    const overrides = {};
    if (selectedSportTypeIds.length === 1) {
      overrides.sportTypeId = selectedSportTypeIds;
    }
    if (effectiveCompetitionFilter && selectedCompetitionIds.length > 0) {
      overrides.mainCompetition = selectedCompetitionIds;
    }
    loadExisting(overrides);
  }, [loadExisting, selectedSportTypeIds, hasMixedSportTypes, effectiveCompetitionFilter, selectedCompetitionIds]);

  useEffect(() => {
    if (!suggestEligible) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    const payload = selectedTempList.map((r) => ({
      NAME: r.NAME,
      LANG_ID: r.LANG_ID,
      COUNTRY_ID: r.COUNTRY_ID,
    }));
    const opts = { limit: 3 };
    if (effectiveCountryFilter && selectedCountryIds.length > 0) {
      opts.countryIds = selectedCountryIds;
    }
    if (effectiveCompetitionFilter && selectedCompetitionIds.length > 0) {
      opts.competitionIds = selectedCompetitionIds;
    }
    const reqId = ++suggestReqSeq.current;
    setSuggestLoading(true);
    (async () => {
      try {
        const result = await api.suggestTempMatches('competitors', payload, opts);
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch {
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions([]);
      } finally {
        if (reqId === suggestReqSeq.current) setSuggestLoading(false);
      }
    })();
  }, [suggestEligible, selectedTempList, effectiveCountryFilter, selectedCountryIds, effectiveCompetitionFilter, selectedCompetitionIds]);

  const suggestionByCompetitorId = useMemo(() => {
    const m = new Map();
    suggestions.forEach((s, i) => m.set(Number(s.competitorId), { rank: i + 1, score: s.score }));
    return m;
  }, [suggestions]);

  const selectOnlyExist = (id) => {
    setSelectedExist(new Set([Number(id)]));
  };

  /* -------------------- Search commit helpers -------------------- */
  const commitTempSearch = () => {
    const trimmed = pendingTempSearch.trim();
    if (trimmed === tempSearch) return;
    setUrlState({ cmpt_search: trimmed, cmpt_tPage: 0 });
  };

  const handleSportFilterChange = (value) => {
    setUrlState({ cmpt_sport: (Array.isArray(value) ? value : []).map(String), cmpt_tPage: 0 });
  };
  const handleSourceFilterChange = (value) => {
    setUrlState({ cmpt_source: (Array.isArray(value) ? value : []).map(String), cmpt_tPage: 0 });
  };
  const handleCountryFilterChange = (value) => {
    setUrlState({ cmpt_country: (Array.isArray(value) ? value : []).map(String), cmpt_tPage: 0 });
  };
  const handleCompetitionFilterChange = (value) => {
    setUrlState({ cmpt_comp: (Array.isArray(value) ? value : []).map(String), cmpt_tPage: 0 });
  };
  const handleShowHiddensChange = (checked) => {
    setUrlState({ cmpt_hidden: checked, cmpt_tPage: 0 });
  };

  const hasActiveFilters =
    sportFilter.length > 0 || sourceFilter.length > 0 || countryFilter.length > 0 ||
    competitionFilter.length > 0 || tempSearch !== '' || pendingTempSearch !== '' || showHiddens;

  const handleClearFilters = () => {
    setUrlState({
      cmpt_search: '',
      cmpt_sport: [],
      cmpt_source: [],
      cmpt_country: [],
      cmpt_comp: [],
      cmpt_hidden: false,
      cmpt_tPage: 0,
    });
    setPendingTempSearch('');
  };

  /* -------------------- Actions -------------------- */
  const handleReload = async () => {
    clearTempSelection();
    await loadTemp();
    showToast('Temp table reloaded', 'success');
  };
  const handleClearCache = () => showToast('Cache cleared successfully', 'success');
  const handleUndo = () => showToast('Undo requested (no-op for now)', 'info');

  const handleConnect = async () => {
    if (selectedTempList.length === 0 || selectedExistList.length !== 1) return;
    const target = selectedExistList[0];
    try {
      const result = await api.connectTempEntities(
        'competitors',
        selectedTempList.map((r) => r.COMPETITOR_ID),
        target.COMPETITOR_ID
      );

      // Add competitor to current season of the competition (if not already there)
      let seasonMsg = '';
      if (selectedCompetitionIds.length === 1) {
        const compId = selectedCompetitionIds[0];
        const comp = competitionById.get(compId);
        const currentSeason = comp?.CURRENT_SEASON;
        if (currentSeason != null) {
          try {
            const seasonCompetitors = await api.getSeasonCompetitors(compId, currentSeason);
            const alreadyInSeason = seasonCompetitors.some(
              (sc) => Number(sc.COMPETITOR_ID) === Number(target.COMPETITOR_ID)
            );
            if (!alreadyInSeason) {
              await api.addCompetitorsToSeason(compId, currentSeason, [target.COMPETITOR_ID]);
              seasonMsg = ` | Added to season ${currentSeason} of competition ${comp.name || compId}`;
            }
          } catch (seasonErr) {
            showToast(seasonErr?.message || 'Connected value but failed to add to season', 'warning');
          }
        }
      }

      showToast(
        `Connected ${result?.removedTempRows ?? selectedTempList.length} temp row(s) to ${target.name}${seasonMsg}`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to connect', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedTempList.length === 0) return;
    try {
      await api.deleteTempEntitiesBulk('competitors', selectedTempList.map((r) => r.COMPETITOR_ID));
      showToast(`Deleted ${selectedTempList.length} temp row(s)`, 'success');
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
    }
  };

  const allSelectedHidden = selectedTempList.length > 0 && selectedTempList.every((r) => Number(r.ACTIVE) === 0);

  const handleHide = async () => {
    if (selectedTempList.length === 0) return;
    const newActive = allSelectedHidden ? 1 : 0;
    try {
      for (const row of selectedTempList) {
        await api.updateTempEntity('competitors', row.COMPETITOR_ID, { ACTIVE: newActive });
      }
      showToast(
        newActive === 1
          ? `Unhidden ${selectedTempList.length} temp row(s)`
          : `Hidden ${selectedTempList.length} temp row(s)`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const handleCreateClick = () => {
    if (selectedTempList.length === 0) return;
    if (selectedTempList.length === 1) {
      setSingleCreateTempRow(selectedTempList[0]);
      setSingleCreateOpen(true);
      return;
    }
    setChoiceOpen(true);
  };
  const handleChoose = (mode) => {
    setChoiceOpen(false);
    if (mode === 'many-to-one') setManyOneOpen(true);
    if (mode === 'one-to-one') setOneOneOpen(true);
  };

  const onSingleCreated = async (tempRow) => {
    try {
      if (tempRow?.COMPETITOR_ID != null) {
        await api.deleteTempEntity('competitors', tempRow.COMPETITOR_ID);
      }
    } catch (err) {
      showToast(err?.message || 'Created but failed to remove temp row', 'warning');
    } finally {
      setSingleCreateTempRow(null);
      await loadTemp();
    }
  };

  const onManyToOneCreated = async (created, term, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('competitors', tempIds);
      }
      showToast(`Created competitor "${created?.name ?? ''}" with ${(term?.values || []).length} values`, 'success');
    } catch (err) {
      showToast(err?.message || 'Created competitor but failed to remove temp rows', 'warning');
    } finally {
      clearTempSelection();
      await loadTemp();
    }
  };

  const onOneToOneCreated = async (createdList, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('competitors', tempIds);
      }
      showToast(`Created ${createdList.length} competitors`, 'success');
    } catch (err) {
      showToast(err?.message || 'Some temp rows could not be removed', 'warning');
    } finally {
      clearTempSelection();
      await loadTemp();
    }
  };

  /* -------------------- Render -------------------- */
  const tempAllChecked = pagedTemp.length > 0 && pagedTemp.every((r) => selectedTemp.has(r.COMPETITOR_ID));
  const tempSomeChecked = pagedTemp.some((r) => selectedTemp.has(r.COMPETITOR_ID));
  const searchDirty = pendingTempSearch.trim() !== tempSearch;

  const selectedExistCount = selectedExistList.length;
  const selectedTemps = selectedTempList.length;
  const canConnect = selectedTemps >= 1 && selectedExistCount === 1;
  const canDelete = selectedTemps >= 1;
  const canHide = selectedTemps >= 1;
  const canCreate = selectedTemps >= 1;

  const compactTableSx = {
    '& .MuiTableCell-root': { fontSize: '0.8125rem', paddingTop: 0.5, paddingBottom: 0.5 },
    '& .MuiTableCell-head': { fontSize: '0.8125rem' },
  };
  const tableMaxHeightSx = { maxHeight: 380 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.dataSources || []}
            value={sourceFilterValue}
            onChange={(_e, newValue) => handleSourceFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.dataSources || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Data Source" placeholder="Search data source…" />}
          />
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={(tempFacets.sportTypes || []).length === 0}>
            <InputLabel>Sport Type</InputLabel>
            <Select
              multiple
              value={sportFilter}
              onChange={(e) => handleSportFilterChange(e.target.value)}
              input={<OutlinedInput label="Sport Type" />}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {sel.map((v) => {
                    const label = sportFacetById.get(Number(v))?.label || sportById.get(Number(v))?.ALIAS_NAME || v;
                    return <Chip key={v} size="small" label={label} />;
                  })}
                </Box>
              )}
            >
              {(tempFacets.sportTypes || []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Checkbox checked={sportFilter.includes(f.id)} size="small" />
                  <ListItemText primary={f.label} secondary={`${f.count}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 240, maxWidth: 380 }}
            options={tempFacets.countries || []}
            value={countryFilterValue}
            onChange={(_e, newValue) => handleCountryFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.countries || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Country" placeholder="Search country…" />}
          />
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.competitions || []}
            value={competitionFilterValue}
            onChange={(_e, newValue) => handleCompetitionFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.competitions || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Competition" placeholder="Search competition…" />}
          />
          <TextField
            size="small"
            placeholder="Search temp name…"
            value={pendingTempSearch}
            onChange={(e) => setPendingTempSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTempSearch(); } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
          <PrimaryButton size="small" startIcon={<SearchIcon />} onClick={commitTempSearch} disabled={!searchDirty}>Search</PrimaryButton>
          <FormControlLabel
            control={<Switch size="small" checked={showHiddens} onChange={(e) => handleShowHiddensChange(e.target.checked)} />}
            label="Show Hiddens"
          />
          <SecondaryButton size="small" startIcon={<FilterAltOffIcon />} onClick={handleClearFilters} disabled={!hasActiveFilters}>Clear Filters</SecondaryButton>
          <Box sx={{ flex: 1 }} />
          <SecondaryButton size="small" startIcon={<RefreshIcon />} onClick={handleReload}>Reload Table</SecondaryButton>
          <SecondaryButton size="small" startIcon={<CleaningServicesIcon />} onClick={handleClearCache}>Clear Cache</SecondaryButton>
          <SecondaryButton size="small" startIcon={<UndoIcon />} onClick={handleUndo}>Undo</SecondaryButton>
        </Box>
      </Paper>

      {/* Top table: temp competitors */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Unidentified Competitors ({tempTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedTemps} selected</Typography>
        </Box>
        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" indeterminate={tempSomeChecked && !tempAllChecked} checked={tempAllChecked} onChange={(e) => toggleAllTemp(e.target.checked)} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data Source</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Competition</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedTemp.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No unidentified competitors</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedTemp.map((row) => (
                <TableRow
                  key={row.COMPETITOR_ID}
                  hover
                  selected={selectedTemp.has(row.COMPETITOR_ID)}
                  sx={{ cursor: 'pointer', opacity: Number(row.ACTIVE) === 0 ? 0.55 : 1 }}
                  onClick={() => toggleTempSelect(row)}
                  onDoubleClick={() => setInfoRow(row)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={selectedTemp.has(row.COMPETITOR_ID)} onChange={() => toggleTempSelect(row)} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={row.NAME || ''} arrow><span>{row.NAME}</span></Tooltip>
                  </TableCell>
                  <TableCell>{sourceById.get(Number(row.DATA_SOURCE_ID))?.ALIAS_NAME || row.DATA_SOURCE_ID || '-'}</TableCell>
                  <TableCell>{sportById.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-'}</TableCell>
                  <TableCell>{countryById.get(Number(row.COUNTRY_ID))?.name || row.COUNTRY_ID || '-'}</TableCell>
                  <TableCell>{competitionById.get(Number(row.COMPETITION_ID))?.name || row.COMPETITION_ID || '-'}</TableCell>
                  <TableCell>{row.CREATED_TIME || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={tempTotal}
          page={tempPage}
          rowsPerPage={tempRowsPerPage}
          onPageChange={setTempPage}
          onRowsPerPageChange={(n) => setUrlState({ cmpt_tSize: n, cmpt_tPage: 0 })}
        />
      </Paper>

      {/* Bulk action bar */}
      <Paper sx={{ p: 1.5, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Selected: <strong>{selectedTemps}</strong> temp / <strong>{selectedExistCount}</strong> existing
        </Typography>
        <Box sx={{ flex: 1 }} />
        <PrimaryButton size="small" startIcon={<LinkIcon />} disabled={!canConnect} onClick={handleConnect}>Connect</PrimaryButton>
        <SecondaryButton size="small" startIcon={<AddIcon />} disabled={!canCreate} onClick={handleCreateClick}>Create</SecondaryButton>
        <SecondaryButton size="small" startIcon={<VisibilityOffIcon />} disabled={!canHide} onClick={handleHide}>{allSelectedHidden ? 'Unhide' : 'Hide'}</SecondaryButton>
        <SecondaryButton size="small" startIcon={<DeleteIcon />} disabled={!canDelete} onClick={handleDelete}>Delete</SecondaryButton>
      </Paper>

      {/* Bottom table: existing competitors */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Existing Competitors ({existTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedExistCount} selected</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search existing competitors… (Enter to search)"
            value={pendingExistSearch}
            onChange={(e) => setPendingExistSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = pendingExistSearch.trim();
                if (trimmed !== existSearch) setUrlState({ cmpt_eSearch: trimmed, cmpt_ePage: 0 });
              }
            }}
            onBlur={() => {
              const trimmed = pendingExistSearch.trim();
              if (trimmed !== existSearch) setUrlState({ cmpt_eSearch: trimmed, cmpt_ePage: 0 });
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: existSearch && (
                <IconButton size="small" onClick={() => { setPendingExistSearch(''); setUrlState({ cmpt_eSearch: '', cmpt_ePage: 0 }); }}>
                  <FilterAltOffIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        <CompetitorSuggestionBanner
          selectedCount={selectedTempList.length}
          maxSelection={SUGGEST_MAX_SELECTION}
          minNameLen={SUGGEST_MIN_NAME_LEN}
          eligible={suggestEligible}
          loading={suggestLoading}
          suggestions={suggestions}
          countryById={countryById}
          competitionById={competitionById}
          selectedCompetitorIds={selectedExist}
          onPick={(id) => selectOnlyExist(id)}
          suggestCountryFilter={suggestCountryFilter}
          onToggleCountryFilter={(val) => setSuggestCountryFilter(val)}
          hasMultipleCountries={hasMultipleCountries}
          selectedCountryIds={selectedCountryIds}
          suggestCompetitionFilter={suggestCompetitionFilter}
          onToggleCompetitionFilter={(val) => setSuggestCompetitionFilter(val)}
          hasMultipleCompetitions={hasMultipleCompetitions}
          selectedCompetitionIds={selectedCompetitionIds}
          hasMixedSportTypes={hasMixedSportTypes}
        />

        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedExisting.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      {hasMixedSportTypes
                        ? 'Cannot display existing competitors: the selected unidentified rows belong to different sport types. Please select rows with the same sport type.'
                        : 'No competitors match'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedExisting.map((row) => {
                const suggestion = suggestionByCompetitorId.get(Number(row.COMPETITOR_ID));
                return (
                  <TableRow
                    key={row.COMPETITOR_ID}
                    hover
                    selected={selectedExist.has(row.COMPETITOR_ID)}
                    sx={{ cursor: 'pointer', ...(suggestion ? { backgroundColor: 'rgba(25, 118, 210, 0.06)' } : null) }}
                    onClick={() => toggleExistSelect(row.COMPETITOR_ID)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Radio size="small" checked={selectedExist.has(row.COMPETITOR_ID)} onChange={() => toggleExistSelect(row.COMPETITOR_ID)} />
                    </TableCell>
                    <TableCell>{row.COMPETITOR_ID}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={row.LIGHT_IMAGE_URL || undefined}
                          sx={{ width: 32, height: 32, bgcolor: row.LIGHT_IMAGE_URL ? 'transparent' : '#1976d2', fontSize: '0.95rem' }}
                        >
                          <GroupsIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{row.name || `#${row.COMPETITOR_ID}`}</Typography>
                        {suggestion && (
                          <Tooltip arrow title={`Auto-suggested match (${Math.round(suggestion.score * 100)}% similarity)`}>
                            <Chip size="small" color="primary" variant="outlined" label={`Suggested #${suggestion.rank} · ${Math.round(suggestion.score * 100)}%`} sx={{ ml: 0.5 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{row.countryName || '-'}</TableCell>
                    <TableCell>{row.GENDER === 1 ? 'Male' : row.GENDER === 2 ? 'Female' : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={existTotal}
          page={existPage}
          rowsPerPage={existRowsPerPage}
          onPageChange={setExistPage}
          onRowsPerPageChange={(n) => setUrlState({ cmpt_eSize: n, cmpt_ePage: 0 })}
        />
      </Paper>

      {error && <MuiAlert severity="error" onClose={() => setError('')}>{error}</MuiAlert>}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</MuiAlert>
      </Snackbar>

      <CompetitorCreateDialog
        open={singleCreateOpen}
        onClose={() => setSingleCreateOpen(false)}
        tempRow={singleCreateTempRow}
        countries={countries}
        sports={sports}
        competitions={competitions}
        onCreated={(comp) => {
          showToast(`Created competitor "${comp?.name ?? ''}"`, 'success');
          onSingleCreated(singleCreateTempRow);
          setSingleCreateOpen(false);
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
      <CreateModeChoiceDialog
        open={choiceOpen}
        count={selectedTempList.length}
        onClose={() => setChoiceOpen(false)}
        onChoose={handleChoose}
        entityName="competitor"
      />
      <ManyToOneCompetitorDialog
        open={manyOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        competitions={competitions}
        onClose={() => setManyOneOpen(false)}
        onCreated={onManyToOneCreated}
      />
      <OneToOneTabsCompetitorDialog
        open={oneOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        competitions={competitions}
        onClose={() => setOneOneOpen(false)}
        onCreated={onOneToOneCreated}
      />
      <TempInfoDialog
        row={infoRow}
        open={!!infoRow}
        onClose={() => setInfoRow(null)}
        sourceById={sourceById}
        sportById={sportById}
        langById={langById}
      />
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Competitor create dialog (for Terms Fix page)
 * ------------------------------------------------------------------------ */
function CompetitorCreateDialog({ open, onClose, tempRow, countries, sports, competitions, onCreated, onError }) {
  const [formData, setFormData] = useState({ name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: '', COMPETITOR_TYPE: 1 });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && tempRow) {
      const comp = (competitions || []).find(c => c.COMPETITION_ID === Number(tempRow.COMPETITION_ID));
      setFormData({
        name: tempRow.NAME || '',
        COUNTRY_ID: tempRow.COUNTRY_ID != null && Number(tempRow.COUNTRY_ID) > 0 ? Number(tempRow.COUNTRY_ID) : '',
        SPORT_TYPE_ID: tempRow.SPORT_TYPE_ID != null ? Number(tempRow.SPORT_TYPE_ID) : '',
        GENDER: comp?.GENDER != null ? Number(comp.GENDER) : '',
        COMPETITOR_TYPE: comp?.COMPETITORS_TYPE != null ? Number(comp.COMPETITORS_TYPE) : 1,
      });
      setFormErrors({});
    }
  }, [open, tempRow, competitions]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    if (formData.COMPETITOR_TYPE === '' || formData.COMPETITOR_TYPE == null) err.COMPETITOR_TYPE = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const langId = tempRow?.LANG_ID != null && Number.isFinite(Number(tempRow.LANG_ID)) ? Number(tempRow.LANG_ID) : 1;
      const newTerm = await api.createTerm({
        category: 'Competitors Names',
        values: [{ languageId: langId, value: formData.name.trim(), isDefault: true, status: 'Approved' }],
      });
      const res = await api.createCompetitor({
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        COMPETITOR_TYPE: Number(formData.COMPETITOR_TYPE),
        COUNTRY_ID: formData.COUNTRY_ID !== '' ? Number(formData.COUNTRY_ID) : null,
        GENDER: formData.GENDER !== '' ? Number(formData.GENDER) : null,
      });
      const created = res?.data ?? res;
      onCreated(created);
    } catch (e) {
      onError(e?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 1.5 }}>Create Competitor</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" required label="Name"
              value={formData.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!formErrors.name} helperText={formErrors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={sports || []}
              getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''}
              value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null}
              onChange={(_e, v) => handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')}
              renderInput={(params) => (
                <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required error={!!formErrors.COMPETITOR_TYPE}>
              <InputLabel>Competitor Type</InputLabel>
              <Select value={formData.COMPETITOR_TYPE ?? ''} label="Competitor Type" onChange={(e) => handleChange('COMPETITOR_TYPE', Number(e.target.value))}>
                <MenuItem value={1}>Team</MenuItem>
                <MenuItem value={2}>Club</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={countries || []}
              getOptionLabel={(o) => o.name || ''}
              value={(countries || []).find((c) => c.COUNTRY_ID === formData.COUNTRY_ID) || null}
              onChange={(_e, v) => handleChange('COUNTRY_ID', v ? v.COUNTRY_ID : '')}
              renderInput={(params) => <TextField {...params} label="Country" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? ''} label="Gender" onChange={(e) => handleChange('GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Many-to-One Competitor dialog
 * ------------------------------------------------------------------------ */
function ManyToOneCompetitorDialog({ open, onClose, tempRows = [], countries, sports, competitions, onCreated }) {
  const [formData, setFormData] = useState({ name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: '', COMPETITOR_TYPE: 1 });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const comp = (competitions || []).find(c => c.COMPETITION_ID === Number(tempRows[0]?.COMPETITION_ID));
    setFormData({
      name: tempRows[0]?.NAME || '',
      COUNTRY_ID: tempRows[0]?.COUNTRY_ID != null && Number(tempRows[0].COUNTRY_ID) > 0 ? Number(tempRows[0].COUNTRY_ID) : '',
      SPORT_TYPE_ID: tempRows[0]?.SPORT_TYPE_ID != null ? Number(tempRows[0].SPORT_TYPE_ID) : '',
      GENDER: comp?.GENDER != null ? Number(comp.GENDER) : '',
      COMPETITOR_TYPE: comp?.COMPETITORS_TYPE != null ? Number(comp.COMPETITORS_TYPE) : 1,
    });
    setFormErrors({});
  }, [open, tempRows, competitions]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const values = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of tempRows) {
      const v = String(row.NAME ?? '').trim();
      const lang = Number(row.LANG_ID);
      if (!v || !Number.isFinite(lang)) continue;
      const key = `${lang}|${v.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ languageId: lang, value: v, isDefault: list.length === 0, status: 'Approved' });
    }
    return list;
  }, [tempRows]);

  const handleCreate = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    if (formData.COMPETITOR_TYPE === '' || formData.COMPETITOR_TYPE == null) err.COMPETITOR_TYPE = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const allValues = [
        { languageId: 1, value: formData.name.trim(), isDefault: true, status: 'Approved' },
        ...values.filter((v) => !(v.languageId === 1 && v.value.toLowerCase() === formData.name.trim().toLowerCase())),
      ];
      const newTerm = await api.createTerm({ category: 'Competitors Names', values: allValues });
      const res = await api.createCompetitor({
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        COMPETITOR_TYPE: Number(formData.COMPETITOR_TYPE),
        COUNTRY_ID: formData.COUNTRY_ID !== '' ? Number(formData.COUNTRY_ID) : null,
        GENDER: formData.GENDER !== '' ? Number(formData.GENDER) : null,
      });
      const created = res?.data ?? res;
      onCreated?.(created, newTerm, tempRows.map((r) => r.COMPETITOR_ID));
      onClose?.();
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, _form: e?.message || 'Failed to create competitor' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create Competitor from {tempRows.length} temp rows
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, background: '#f9fafb', borderColor: '#e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Term values that will be created ({values.length + 1})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            The <strong>Name</strong> below will be added as an English (Approved) default value.
            The values from the selected temp rows will be added under their own LANG_ID.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {values.map((v) => (
              <Chip key={`${v.languageId}|${v.value}`} size="small" label={`[${v.languageId}] ${v.value}`} sx={{ maxWidth: 360 }} />
            ))}
          </Box>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" required label="Name" value={formData.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} error={!!formErrors.name} helperText={formErrors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null} onChange={(_e, v) => handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required error={!!formErrors.COMPETITOR_TYPE}>
              <InputLabel>Competitor Type</InputLabel>
              <Select value={formData.COMPETITOR_TYPE ?? ''} label="Competitor Type" onChange={(e) => handleChange('COMPETITOR_TYPE', Number(e.target.value))}>
                <MenuItem value={1}>Team</MenuItem>
                <MenuItem value={2}>Club</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === formData.COUNTRY_ID) || null} onChange={(_e, v) => handleChange('COUNTRY_ID', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Country" />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? ''} label="Gender" onChange={(e) => handleChange('GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {formErrors._form && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formErrors._form}</Box>}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={saving || values.length === 0} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * One-to-One Tabs Competitor dialog
 * ------------------------------------------------------------------------ */
function OneToOneTabsCompetitorDialog({ open, onClose, tempRows = [], countries, sports, competitions, onCreated }) {
  const DEFAULT_FORM = { name: '', COUNTRY_ID: '', SPORT_TYPE_ID: '', GENDER: '', COMPETITOR_TYPE: 1 };
  const [activeTab, setActiveTab] = useState(0);
  const [forms, setForms] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [completed, setCompleted] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setActiveTab(0);
    setForms(tempRows.map((row) => {
      const comp = (competitions || []).find(c => c.COMPETITION_ID === Number(row.COMPETITION_ID));
      return {
        ...DEFAULT_FORM,
        name: row.NAME || '',
        COUNTRY_ID: row.COUNTRY_ID != null && Number(row.COUNTRY_ID) > 0 ? Number(row.COUNTRY_ID) : '',
        SPORT_TYPE_ID: row.SPORT_TYPE_ID != null ? Number(row.SPORT_TYPE_ID) : '',
        GENDER: comp?.GENDER != null ? Number(comp.GENDER) : '',
        COMPETITOR_TYPE: comp?.COMPETITORS_TYPE != null ? Number(comp.COMPETITORS_TYPE) : 1,
        _tempRow: row,
      };
    }));
    setErrors(tempRows.map(() => ({})));
    setCompleted(new Set());
    setFormError('');
  }, [open, tempRows, competitions]);

  const onChange = (tabIdx, field, value) => {
    setForms((prev) => { const next = [...prev]; next[tabIdx] = { ...next[tabIdx], [field]: value }; return next; });
    setErrors((prev) => { const next = [...prev]; if (next[tabIdx]?.[field]) { next[tabIdx] = { ...next[tabIdx], [field]: undefined }; } return next; });
  };

  const validate = (f) => {
    const err = {};
    if (!f.name || String(f.name).trim() === '') err.name = 'Required';
    if (f.SPORT_TYPE_ID === '' || f.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    if (f.COMPETITOR_TYPE === '' || f.COMPETITOR_TYPE == null) err.COMPETITOR_TYPE = 'Required';
    return err;
  };

  const tabs = useMemo(
    () => tempRows.map((row, idx) => ({ label: row.NAME || `Row ${row.COMPETITOR_ID}`, done: completed.has(idx) })),
    [tempRows, completed]
  );

  const handleCreateAll = async () => {
    const nextErrors = forms.map(validate);
    setErrors(nextErrors);
    const firstInvalid = nextErrors.findIndex((e) => Object.keys(e).length > 0);
    if (firstInvalid !== -1) { setActiveTab(firstInvalid); return; }
    try {
      setSaving(true);
      setFormError('');
      const createdList = [];
      const createdTempIds = [];
      const failed = [];
      const nextCompleted = new Set(completed);
      for (let idx = 0; idx < forms.length; idx += 1) {
        if (nextCompleted.has(idx)) continue;
        const form = forms[idx];
        const row = form._tempRow;
        const langId = row?.LANG_ID != null && Number.isFinite(Number(row.LANG_ID)) ? Number(row.LANG_ID) : 1;
        try {
          const newTerm = await api.createTerm({
            category: 'Competitors Names',
            values: [{ languageId: langId, value: form.name.trim(), isDefault: true, status: 'Approved' }],
          });
          const res = await api.createCompetitor({
            NAME_ID: newTerm.id,
            SPORT_TYPE_ID: Number(form.SPORT_TYPE_ID),
            COMPETITOR_TYPE: Number(form.COMPETITOR_TYPE),
            COUNTRY_ID: form.COUNTRY_ID !== '' ? Number(form.COUNTRY_ID) : null,
            GENDER: form.GENDER !== '' ? Number(form.GENDER) : null,
          });
          createdList.push(res?.data ?? res);
          createdTempIds.push(row?.COMPETITOR_ID);
          nextCompleted.add(idx);
        } catch (err) {
          failed.push({ idx, message: err?.message || 'Failed' });
        }
      }
      setCompleted(nextCompleted);
      if (failed.length > 0) {
        setFormError(`Created ${createdList.length}/${forms.length}. Errors: ${failed.map((f) => `tab ${f.idx + 1} – ${f.message}`).join(' | ')}`);
        if (failed[0]?.idx != null) setActiveTab(failed[0].idx);
      }
      if (createdList.length > 0) onCreated?.(createdList, createdTempIds.filter((x) => x != null));
      if (failed.length === 0) onClose?.();
    } catch (err) {
      setFormError(err?.message || 'Failed to create competitors');
    } finally {
      setSaving(false);
    }
  };

  if (forms.length === 0) return null;
  const f = forms[activeTab] || {};

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create {tempRows.length} Competitors (one per tab)
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 0, pb: 2 }}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 }, '& .Mui-selected': { color: '#1976d2' } }}>
          {tabs.map((t, idx) => (
            <Tab key={idx} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{t.done && <Box component="span" sx={{ color: '#15803d', fontSize: 16, display: 'flex' }}>✓</Box>}<span>{t.label}</span></Box>} />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Source temp row:</Typography>
            <Chip size="small" label={`[${f._tempRow?.LANG_ID}] ${f._tempRow?.NAME ?? ''}`} sx={{ maxWidth: 420 }} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" required label="Name" value={f.name ?? ''} onChange={(e) => onChange(activeTab, 'name', e.target.value)} error={!!(errors[activeTab] || {}).name} helperText={(errors[activeTab] || {}).name} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === f.SPORT_TYPE_ID) || null} onChange={(_e, v) => onChange(activeTab, 'SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : '')} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!(errors[activeTab] || {}).SPORT_TYPE_ID} helperText={(errors[activeTab] || {}).SPORT_TYPE_ID} />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required error={!!(errors[activeTab] || {}).COMPETITOR_TYPE}>
                <InputLabel>Competitor Type</InputLabel>
                <Select value={f.COMPETITOR_TYPE ?? ''} label="Competitor Type" onChange={(e) => onChange(activeTab, 'COMPETITOR_TYPE', Number(e.target.value))}>
                  <MenuItem value={1}>Team</MenuItem>
                  <MenuItem value={2}>Club</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === f.COUNTRY_ID) || null} onChange={(_e, v) => onChange(activeTab, 'COUNTRY_ID', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Country" />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={f.GENDER ?? ''} label="Gender" onChange={(e) => onChange(activeTab, 'GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value={1}>Male</MenuItem>
                  <MenuItem value={2}>Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          {formError && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formError}</Box>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreateAll} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : `Create ${forms.length} Competitors`}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Competitor suggestion banner with country filter toggle
 * ------------------------------------------------------------------------ */
function CompetitorSuggestionBanner({
  selectedCount,
  maxSelection,
  minNameLen,
  eligible,
  loading,
  suggestions,
  countryById,
  competitionById,
  selectedCompetitorIds,
  onPick,
  suggestCountryFilter,
  onToggleCountryFilter,
  hasMultipleCountries,
  selectedCountryIds,
  suggestCompetitionFilter,
  onToggleCompetitionFilter,
  hasMultipleCompetitions,
  selectedCompetitionIds,
  hasMixedSportTypes,
}) {
  if (selectedCount === 0) return null;

  if (hasMixedSportTypes) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(211,47,47,0.06)', border: '1px dashed rgba(211,47,47,0.4)' }}>
        <Typography variant="caption" color="error.main">
          Selected unidentified rows belong to different sport types — existing competitors cannot be displayed.
        </Typography>
      </Box>
    );
  }

  if (!eligible) {
    const reason =
      selectedCount > maxSelection
        ? `Auto-suggestions are disabled when more than ${maxSelection} temp rows are selected.`
        : `Selected temp names must have more than ${minNameLen - 1} characters to auto-suggest.`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.03)', border: '1px dashed #d0d0d0' }}>
        <Typography variant="caption" color="text.secondary">{reason}</Typography>
      </Box>
    );
  }

  const countryLabel = selectedCountryIds.length === 1
    ? countryById.get(selectedCountryIds[0])?.name || `Country ${selectedCountryIds[0]}`
    : '';

  const competitionLabel = selectedCompetitionIds.length === 1
    ? competitionById.get(selectedCompetitionIds[0])?.name || `Competition ${selectedCompetitionIds[0]}`
    : '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.06)', border: '1px solid rgba(25,118,210,0.2)' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
        {loading ? 'Finding best matches…' : 'Suggested matches:'}
      </Typography>
      {!loading && suggestions.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No similar existing competitors found. Use the search below to connect manually.
        </Typography>
      )}
      {!loading &&
        suggestions.map((s, idx) => {
          const label = s.name || `#${s.competitorId}`;
          const pct = Math.round(s.score * 100);
          const isSelected = selectedCompetitorIds.has(Number(s.competitorId));
          return (
            <Tooltip key={s.competitorId} arrow title={`Rank #${idx + 1} · ${pct}% similarity`}>
              <Chip
                size="small" clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                icon={<GroupsIcon />}
                label={`#${idx + 1}  ${label}  ·  ${pct}%`}
                onClick={() => onPick(s.competitorId)}
                sx={{ fontWeight: 500 }}
              />
            </Tooltip>
          );
        })}
      <Box sx={{ flex: 1 }} />
      <Tooltip arrow title={
        hasMultipleCompetitions
          ? 'Competition filter disabled: selected temp rows belong to different competitions'
          : suggestCompetitionFilter
            ? `Showing only competitors from ${competitionLabel || 'the same competition'}. Toggle off to see all.`
            : 'Showing all competitors. Toggle on to filter by competition.'
      }>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={suggestCompetitionFilter}
              onChange={(e) => onToggleCompetitionFilter(e.target.checked)}
              disabled={hasMultipleCompetitions}
            />
          }
          label={
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              Same competition{competitionLabel ? `: ${competitionLabel}` : ''}
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      </Tooltip>
      <Tooltip arrow title={
        hasMultipleCountries
          ? 'Country filter disabled: selected temp rows belong to different countries'
          : suggestCountryFilter
            ? `Showing only competitors from ${countryLabel || 'the same country'}. Toggle off to see all.`
            : 'Showing all competitors. Toggle on to filter by country.'
      }>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={suggestCountryFilter}
              onChange={(e) => onToggleCountryFilter(e.target.checked)}
              disabled={hasMultipleCountries}
            />
          }
          label={
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              Same country{countryLabel ? `: ${countryLabel}` : ''}
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      </Tooltip>
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Athletes tab
 * ------------------------------------------------------------------------ */

function AthletesTermsFix() {
  const [urlState, setUrlState] = useUrlFilters({
    ath_search: { type: 'string', default: '' },
    ath_sport: { type: 'array', default: [] },
    ath_country: { type: 'array', default: [] },
    ath_comp: { type: 'array', default: [] },
    ath_cmpt: { type: 'array', default: [] },
    ath_hidden: { type: 'boolean', default: false },
    ath_tPage: { type: 'number', default: 0 },
    ath_tSize: { type: 'number', default: 10 },
    ath_eSearch: { type: 'string', default: '' },
    ath_ePage: { type: 'number', default: 0 },
    ath_eSize: { type: 'number', default: 10 },
    ath_suggestCmpt: { type: 'boolean', default: true },
  });

  const tempSearch = urlState.ath_search;
  const sportFilter = useMemo(() => (urlState.ath_sport || []).map(Number).filter(Number.isFinite), [urlState.ath_sport]);
  const countryFilter = useMemo(() => (urlState.ath_country || []).map(Number).filter(Number.isFinite), [urlState.ath_country]);
  const competitionFilter = useMemo(() => (urlState.ath_comp || []).map(Number).filter(Number.isFinite), [urlState.ath_comp]);
  const competitorFilter = useMemo(() => (urlState.ath_cmpt || []).map(Number).filter(Number.isFinite), [urlState.ath_cmpt]);
  const showHiddens = urlState.ath_hidden;
  const tempPage = urlState.ath_tPage;
  const tempRowsPerPage = urlState.ath_tSize;
  const existSearch = urlState.ath_eSearch;
  const existPage = urlState.ath_ePage;
  const existRowsPerPage = urlState.ath_eSize;
  const suggestCompetitorFilter = urlState.ath_suggestCmpt;

  const setTempPage = useCallback((v) => setUrlState({ ath_tPage: v }), [setUrlState]);
  const setExistPage = useCallback((v) => setUrlState({ ath_ePage: v }), [setUrlState]);
  const setSuggestCompetitorFilter = useCallback((v) => setUrlState({ ath_suggestCmpt: v }), [setUrlState]);

  const [tempRows, setTempRows] = useState([]);
  const [tempTotal, setTempTotal] = useState(0);
  const [tempFacets, setTempFacets] = useState({ sportTypes: [], countries: [], competitions: [], competitors: [] });

  const [existingAthletes, setExistingAthletes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [sports, setSports] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [positionTypes, setPositionTypes] = useState([]);
  const [formationPositionTypes, setFormationPositionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedTemp, setSelectedTemp] = useState(() => new Map());
  const [selectedExist, setSelectedExist] = useState(() => new Set());

  const [pendingTempSearch, setPendingTempSearch] = useState(tempSearch);
  useEffect(() => { setPendingTempSearch(tempSearch); }, [tempSearch]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [singleCreateOpen, setSingleCreateOpen] = useState(false);
  const [singleCreateTempRow, setSingleCreateTempRow] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [manyOneOpen, setManyOneOpen] = useState(false);
  const [oneOneOpen, setOneOneOpen] = useState(false);
  const [infoRow, setInfoRow] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestReqSeq = useRef(0);

  const SUGGEST_MIN_NAME_LEN = 4;
  const SUGGEST_MAX_SELECTION = 3;

  const showToast = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const tempReqSeq = useRef(0);

  const loadTemp = useCallback(async () => {
    const reqId = ++tempReqSeq.current;
    try {
      setLoading(true);
      setError('');
      const result = await api.getTempEntities('athletes', {
        search: tempSearch,
        sportTypeIds: sportFilter.map(Number),
        countryIds: countryFilter.map(Number),
        competitionIds: competitionFilter.map(Number),
        competitorIds: competitorFilter.map(Number),
        showHidden: showHiddens,
        page: tempPage,
        pageSize: tempRowsPerPage,
      });
      if (reqId !== tempReqSeq.current) return;
      setTempRows(result.rows);
      setTempTotal(result.total);
      setTempFacets(result.facets || { sportTypes: [], countries: [], competitions: [], competitors: [] });
    } catch (err) {
      if (reqId !== tempReqSeq.current) return;
      setError(err?.message || 'Failed to load temp data');
      setTempRows([]);
      setTempTotal(0);
      setTempFacets({ sportTypes: [], countries: [], competitions: [], competitors: [] });
    } finally {
      if (reqId === tempReqSeq.current) setLoading(false);
    }
  }, [tempSearch, sportFilter, countryFilter, competitionFilter, competitorFilter, showHiddens, tempPage, tempRowsPerPage]);

  const loadExisting = useCallback(async (overrides = {}) => {
    try {
      const params = {};
      const searchParam = existSearch.trim();
      if (searchParam) params.athleteName = searchParam;
      if (overrides.sportType) params.sportType = overrides.sportType;
      if (overrides.team) params.team = overrides.team;
      const list = await api.getAthletes(params);
      setExistingAthletes(Array.isArray(list) ? list : []);
      setSelectedExist(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to load athletes');
    }
  }, [existSearch]);

  const [pendingExistSearch, setPendingExistSearch] = useState(existSearch);
  useEffect(() => { setPendingExistSearch(existSearch); }, [existSearch]);

  useEffect(() => {
    (async () => {
      try {
        const [sportsList, countriesList, compsList, cmptsList, langsList, posTypesList, fpTypesList] = await Promise.all([
          api.getSports().catch(() => []),
          api.getCountries().catch(() => []),
          api.getCompetitions().catch(() => []),
          api.getCompetitors().catch(() => []),
          api.getLanguages().catch(() => []),
          api.getPositionTypes().catch(() => []),
          api.getFormationPositionTypes().catch(() => []),
        ]);
        setSports(Array.isArray(sportsList) ? sportsList : []);
        setCountries(Array.isArray(countriesList) ? countriesList : []);
        setCompetitions(Array.isArray(compsList) ? compsList : []);
        setCompetitors(Array.isArray(cmptsList) ? cmptsList : []);
        setLanguages(Array.isArray(langsList) ? langsList : []);
        setPositionTypes(Array.isArray(posTypesList) ? posTypesList : []);
        setFormationPositionTypes(Array.isArray(fpTypesList) ? fpTypesList : []);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => { loadTemp(); }, [loadTemp]);

  /* -------------------- Lookup maps -------------------- */
  const sportById = useMemo(() => {
    const map = new Map();
    (sports || []).forEach((s) => { if (s.SPORT_TYPE_ID != null) map.set(Number(s.SPORT_TYPE_ID), s); });
    return map;
  }, [sports]);

  const countryById = useMemo(() => {
    const map = new Map();
    (countries || []).forEach((c) => { if (c.COUNTRY_ID != null) map.set(Number(c.COUNTRY_ID), c); });
    return map;
  }, [countries]);

  const competitionById = useMemo(() => {
    const map = new Map();
    (competitions || []).forEach((c) => { if (c.COMPETITION_ID != null) map.set(Number(c.COMPETITION_ID), c); });
    return map;
  }, [competitions]);

  const competitorById = useMemo(() => {
    const map = new Map();
    (competitors || []).forEach((c) => { if (c.COMPETITOR_ID != null) map.set(Number(c.COMPETITOR_ID), c); });
    return map;
  }, [competitors]);

  const langById = useMemo(() => {
    const map = new Map();
    (languages || []).forEach((l) => { if (l.id != null) map.set(Number(l.id), l); });
    return map;
  }, [languages]);

  const sportFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.sportTypes || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const countryFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.countries || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const competitionFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.competitions || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);
  const competitorFacetById = useMemo(() => {
    const m = new Map();
    (tempFacets.competitors || []).forEach((f) => m.set(Number(f.id), f));
    return m;
  }, [tempFacets]);

  const countryFilterValue = useMemo(
    () =>
      countryFilter.map((id) => {
        const num = Number(id);
        const fromFacet = countryFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = countryById.get(num)?.name || `Country ${num}`;
        return { id: num, label, count: 0 };
      }),
    [countryFilter, countryFacetById, countryById]
  );

  const competitionFilterValue = useMemo(
    () =>
      competitionFilter.map((id) => {
        const num = Number(id);
        const fromFacet = competitionFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = competitionById.get(num)?.name || `Competition ${num}`;
        return { id: num, label, count: 0 };
      }),
    [competitionFilter, competitionFacetById, competitionById]
  );

  const competitorFilterValue = useMemo(
    () =>
      competitorFilter.map((id) => {
        const num = Number(id);
        const fromFacet = competitorFacetById.get(num);
        if (fromFacet) return fromFacet;
        const label = competitorById.get(num)?.name || `Competitor ${num}`;
        return { id: num, label, count: 0 };
      }),
    [competitorFilter, competitorFacetById, competitorById]
  );

  /* -------------------- Bottom table (client-paged) -------------------- */
  const existTotal = (existingAthletes || []).length;

  const pagedExisting = useMemo(() => {
    const start = existPage * existRowsPerPage;
    return (existingAthletes || []).slice(start, start + existRowsPerPage);
  }, [existingAthletes, existPage, existRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(tempTotal / tempRowsPerPage) - 1);
    if (tempPage > maxPage) setTempPage(maxPage);
  }, [tempTotal, tempRowsPerPage, tempPage]);
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(existTotal / existRowsPerPage) - 1);
    if (existPage > maxPage) setExistPage(maxPage);
  }, [existTotal, existRowsPerPage, existPage]);

  /* -------------------- Selection -------------------- */
  const pagedTemp = tempRows;

  const toggleTempSelect = (row) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      const id = row.ATHLETE_ID;
      if (next.has(id)) next.delete(id); else next.set(id, row);
      return next;
    });
  };
  const toggleExistSelect = (id) => {
    setSelectedExist((prev) => prev.has(id) ? new Set() : new Set([id]));
  };
  const toggleAllTemp = (checked) => {
    setSelectedTemp((prev) => {
      const next = new Map(prev);
      if (checked) pagedTemp.forEach((r) => next.set(r.ATHLETE_ID, r));
      else pagedTemp.forEach((r) => next.delete(r.ATHLETE_ID));
      return next;
    });
  };

  const selectedTempList = useMemo(() => Array.from(selectedTemp.values()), [selectedTemp]);
  const selectedExistList = useMemo(
    () => (existingAthletes || []).filter((r) => selectedExist.has(r.ATHLETE_ID)),
    [existingAthletes, selectedExist]
  );

  const clearTempSelection = useCallback(() => setSelectedTemp(new Map()), []);

  /* -------------------- Suggestions -------------------- */
  const suggestEligible = useMemo(() => {
    if (selectedTempList.length === 0 || selectedTempList.length > SUGGEST_MAX_SELECTION) return false;
    return selectedTempList.every(
      (r) => String(r.NAME || '').trim().length >= SUGGEST_MIN_NAME_LEN
    );
  }, [selectedTempList]);

  const selectedSportTypeIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.SPORT_TYPE_ID != null && Number.isFinite(Number(r.SPORT_TYPE_ID)) && Number(r.SPORT_TYPE_ID) > 0) {
        ids.add(Number(r.SPORT_TYPE_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMixedSportTypes = selectedSportTypeIds.length > 1;

  const selectedCompetitorIds = useMemo(() => {
    const ids = new Set();
    selectedTempList.forEach((r) => {
      if (r.COMPETITOR_ID != null && Number.isFinite(Number(r.COMPETITOR_ID)) && Number(r.COMPETITOR_ID) > 0) {
        ids.add(Number(r.COMPETITOR_ID));
      }
    });
    return Array.from(ids);
  }, [selectedTempList]);

  const hasMultipleCompetitors = selectedCompetitorIds.length > 1;
  const effectiveCompetitorFilter = suggestCompetitorFilter && !hasMultipleCompetitors;

  useEffect(() => {
    if (hasMultipleCompetitors) setSuggestCompetitorFilter(false);
  }, [hasMultipleCompetitors]);

  useEffect(() => {
    if (hasMixedSportTypes) {
      setExistingAthletes([]);
      setSelectedExist(new Set());
      return;
    }
    const overrides = {};
    if (selectedSportTypeIds.length === 1) {
      overrides.sportType = selectedSportTypeIds;
    }
    if (effectiveCompetitorFilter && selectedCompetitorIds.length > 0) {
      overrides.team = selectedCompetitorIds;
    }
    loadExisting(overrides);
  }, [loadExisting, selectedSportTypeIds, hasMixedSportTypes, effectiveCompetitorFilter, selectedCompetitorIds]);

  useEffect(() => {
    if (!suggestEligible) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    const payload = selectedTempList.map((r) => ({
      NAME: r.NAME,
      LANG_ID: r.LANG_ID,
    }));
    const opts = { limit: 3 };
    if (effectiveCompetitorFilter && selectedCompetitorIds.length > 0) {
      opts.competitorIds = selectedCompetitorIds;
    }
    const reqId = ++suggestReqSeq.current;
    setSuggestLoading(true);
    (async () => {
      try {
        const result = await api.suggestTempMatches('athletes', payload, opts);
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      } catch {
        if (reqId !== suggestReqSeq.current) return;
        setSuggestions([]);
      } finally {
        if (reqId === suggestReqSeq.current) setSuggestLoading(false);
      }
    })();
  }, [suggestEligible, selectedTempList, effectiveCompetitorFilter, selectedCompetitorIds]);

  const suggestionByAthleteId = useMemo(() => {
    const m = new Map();
    suggestions.forEach((s, i) => m.set(Number(s.athleteId), { rank: i + 1, score: s.score }));
    return m;
  }, [suggestions]);

  const selectOnlyExist = (id) => {
    setSelectedExist(new Set([Number(id)]));
  };

  /* -------------------- Search commit helpers -------------------- */
  const commitTempSearch = () => {
    const trimmed = pendingTempSearch.trim();
    if (trimmed === tempSearch) return;
    setUrlState({ ath_search: trimmed, ath_tPage: 0 });
  };

  const handleSportFilterChange = (value) => {
    setUrlState({ ath_sport: (Array.isArray(value) ? value : []).map(String), ath_tPage: 0 });
  };
  const handleCountryFilterChange = (value) => {
    setUrlState({ ath_country: (Array.isArray(value) ? value : []).map(String), ath_tPage: 0 });
  };
  const handleCompetitionFilterChange = (value) => {
    setUrlState({ ath_comp: (Array.isArray(value) ? value : []).map(String), ath_tPage: 0 });
  };
  const handleCompetitorFilterChange = (value) => {
    setUrlState({ ath_cmpt: (Array.isArray(value) ? value : []).map(String), ath_tPage: 0 });
  };
  const handleShowHiddensChange = (checked) => {
    setUrlState({ ath_hidden: checked, ath_tPage: 0 });
  };

  const hasActiveFilters =
    sportFilter.length > 0 || countryFilter.length > 0 || competitionFilter.length > 0 ||
    competitorFilter.length > 0 || tempSearch !== '' || pendingTempSearch !== '' || showHiddens;

  const handleClearFilters = () => {
    setUrlState({
      ath_search: '',
      ath_sport: [],
      ath_country: [],
      ath_comp: [],
      ath_cmpt: [],
      ath_hidden: false,
      ath_tPage: 0,
    });
    setPendingTempSearch('');
  };

  /* -------------------- Actions -------------------- */
  const handleReload = async () => {
    clearTempSelection();
    await loadTemp();
    showToast('Temp table reloaded', 'success');
  };
  const handleClearCache = () => showToast('Cache cleared successfully', 'success');
  const handleUndo = () => showToast('Undo requested (no-op for now)', 'info');

  const handleConnect = async () => {
    if (selectedTempList.length === 0 || selectedExistList.length !== 1) return;
    const target = selectedExistList[0];
    try {
      const result = await api.connectTempEntities(
        'athletes',
        selectedTempList.map((r) => r.ATHLETE_ID),
        target.ATHLETE_ID
      );
      showToast(
        `Connected ${result?.removedTempRows ?? selectedTempList.length} temp row(s) to ${target.name || target.ATHLETE_ID}`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to connect', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedTempList.length === 0) return;
    try {
      await api.deleteTempEntitiesBulk('athletes', selectedTempList.map((r) => r.ATHLETE_ID));
      showToast(`Deleted ${selectedTempList.length} temp row(s)`, 'success');
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
    }
  };

  const allSelectedHidden = selectedTempList.length > 0 && selectedTempList.every((r) => Number(r.ACTIVE) === 0);

  const handleHide = async () => {
    if (selectedTempList.length === 0) return;
    const newActive = allSelectedHidden ? 1 : 0;
    try {
      for (const row of selectedTempList) {
        await api.updateTempEntity('athletes', row.ATHLETE_ID, { ACTIVE: newActive });
      }
      showToast(
        newActive === 1
          ? `Unhidden ${selectedTempList.length} temp row(s)`
          : `Hidden ${selectedTempList.length} temp row(s)`,
        'success'
      );
      clearTempSelection();
      await loadTemp();
    } catch (err) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const handleCreateClick = () => {
    if (selectedTempList.length === 0) return;
    if (selectedTempList.length === 1) {
      setSingleCreateTempRow(selectedTempList[0]);
      setSingleCreateOpen(true);
      return;
    }
    setChoiceOpen(true);
  };
  const handleChoose = (mode) => {
    setChoiceOpen(false);
    if (mode === 'many-to-one') setManyOneOpen(true);
    if (mode === 'one-to-one') setOneOneOpen(true);
  };

  const onSingleCreated = async (tempRow) => {
    try {
      if (tempRow?.ATHLETE_ID != null) {
        await api.deleteTempEntity('athletes', tempRow.ATHLETE_ID);
      }
    } catch (err) {
      showToast(err?.message || 'Created but failed to remove temp row', 'warning');
    } finally {
      setSingleCreateTempRow(null);
      await loadTemp();
    }
  };

  const onManyToOneCreated = async (created, term, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('athletes', tempIds);
      }
      showToast(`Created athlete "${created?.name ?? ''}" with ${(term?.values || []).length} values`, 'success');
    } catch (err) {
      showToast(err?.message || 'Created athlete but failed to remove temp rows', 'warning');
    } finally {
      clearTempSelection();
      await loadTemp();
    }
  };

  const onOneToOneCreated = async (createdList, tempIds) => {
    try {
      if (Array.isArray(tempIds) && tempIds.length > 0) {
        await api.deleteTempEntitiesBulk('athletes', tempIds);
      }
      showToast(`Created ${createdList.length} athletes`, 'success');
    } catch (err) {
      showToast(err?.message || 'Some temp rows could not be removed', 'warning');
    } finally {
      clearTempSelection();
      await loadTemp();
    }
  };

  /* -------------------- Render -------------------- */
  const tempAllChecked = pagedTemp.length > 0 && pagedTemp.every((r) => selectedTemp.has(r.ATHLETE_ID));
  const tempSomeChecked = pagedTemp.some((r) => selectedTemp.has(r.ATHLETE_ID));
  const searchDirty = pendingTempSearch.trim() !== tempSearch;

  const selectedExistCount = selectedExistList.length;
  const selectedTemps = selectedTempList.length;
  const canConnect = selectedTemps >= 1 && selectedExistCount === 1 && !hasMultipleCompetitors;
  const connectDisabledReason = hasMultipleCompetitors
    ? 'Cannot connect: selected temp rows belong to different competitors'
    : '';
  const canDelete = selectedTemps >= 1;
  const canHide = selectedTemps >= 1;
  const canCreate = selectedTemps >= 1;

  const compactTableSx = {
    '& .MuiTableCell-root': { fontSize: '0.8125rem', paddingTop: 0.5, paddingBottom: 0.5 },
    '& .MuiTableCell-head': { fontSize: '0.8125rem' },
  };
  const tableMaxHeightSx = { maxHeight: 380 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={(tempFacets.sportTypes || []).length === 0}>
            <InputLabel>Sport Type</InputLabel>
            <Select
              multiple
              value={sportFilter}
              onChange={(e) => handleSportFilterChange(e.target.value)}
              input={<OutlinedInput label="Sport Type" />}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {sel.map((v) => {
                    const label = sportFacetById.get(Number(v))?.label || sportById.get(Number(v))?.ALIAS_NAME || v;
                    return <Chip key={v} size="small" label={label} />;
                  })}
                </Box>
              )}
            >
              {(tempFacets.sportTypes || []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Checkbox checked={sportFilter.includes(f.id)} size="small" />
                  <ListItemText primary={f.label} secondary={`${f.count}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 240, maxWidth: 380 }}
            options={tempFacets.countries || []}
            value={countryFilterValue}
            onChange={(_e, newValue) => handleCountryFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.countries || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Country" placeholder="Search country…" />}
          />
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.competitions || []}
            value={competitionFilterValue}
            onChange={(_e, newValue) => handleCompetitionFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.competitions || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Competition" placeholder="Search competition…" />}
          />
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            sx={{ minWidth: 280, maxWidth: 420 }}
            options={tempFacets.competitors || []}
            value={competitorFilterValue}
            onChange={(_e, newValue) => handleCompetitorFilterChange(newValue.map((v) => Number(v.id)))}
            getOptionLabel={(opt) => opt?.label ?? String(opt?.id ?? '')}
            isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
            disabled={(tempFacets.competitors || []).length === 0}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                  </Box>
                </li>
              );
            }}
            renderTags={(values, getTagProps) =>
              values.map((opt, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={opt.id} size="small" label={opt.label} {...tagProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Competitor" placeholder="Search competitor…" />}
          />
          <TextField
            size="small"
            placeholder="Search temp name…"
            value={pendingTempSearch}
            onChange={(e) => setPendingTempSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTempSearch(); } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
          <PrimaryButton size="small" startIcon={<SearchIcon />} onClick={commitTempSearch} disabled={!searchDirty}>Search</PrimaryButton>
          <FormControlLabel
            control={<Switch size="small" checked={showHiddens} onChange={(e) => handleShowHiddensChange(e.target.checked)} />}
            label="Show Hiddens"
          />
          <SecondaryButton size="small" startIcon={<FilterAltOffIcon />} onClick={handleClearFilters} disabled={!hasActiveFilters}>Clear Filters</SecondaryButton>
          <Box sx={{ flex: 1 }} />
          <SecondaryButton size="small" startIcon={<RefreshIcon />} onClick={handleReload}>Reload Table</SecondaryButton>
          <SecondaryButton size="small" startIcon={<CleaningServicesIcon />} onClick={handleClearCache}>Clear Cache</SecondaryButton>
          <SecondaryButton size="small" startIcon={<UndoIcon />} onClick={handleUndo}>Undo</SecondaryButton>
        </Box>
      </Paper>

      {/* Top table: temp athletes */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Unidentified Athletes ({tempTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedTemps} selected</Typography>
        </Box>
        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" indeterminate={tempSomeChecked && !tempAllChecked} checked={tempAllChecked} onChange={(e) => toggleAllTemp(e.target.checked)} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Competition</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Competitor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nationality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DOB</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedTemp.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No unidentified athletes</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedTemp.map((row) => (
                <TableRow
                  key={row.ATHLETE_ID}
                  hover
                  selected={selectedTemp.has(row.ATHLETE_ID)}
                  sx={{ cursor: 'pointer', opacity: Number(row.ACTIVE) === 0 ? 0.55 : 1 }}
                  onClick={() => toggleTempSelect(row)}
                  onDoubleClick={() => setInfoRow(row)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={selectedTemp.has(row.ATHLETE_ID)} onChange={() => toggleTempSelect(row)} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={row.NAME || ''} arrow><span>{row.NAME}</span></Tooltip>
                  </TableCell>
                  <TableCell>{sportById.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-'}</TableCell>
                  <TableCell>{competitionById.get(Number(row.COMPETITION_ID))?.name || row.COMPETITION_ID || '-'}</TableCell>
                  <TableCell>{competitorById.get(Number(row.COMPETITOR_ID))?.name || row.COMPETITOR_ID || '-'}</TableCell>
                  <TableCell>{countryById.get(Number(row.NATIONALITY_ID))?.name || (row.NATIONALITY_ID > 0 ? row.NATIONALITY_ID : '-')}</TableCell>
                  <TableCell>{row.POSITION_ID > 0 ? row.POSITION_ID : '-'}</TableCell>
                  <TableCell>{row.DOB && row.DOB !== '1800-01-01' ? row.DOB : '-'}</TableCell>
                  <TableCell>{row.CREATED_TIME || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={tempTotal}
          page={tempPage}
          rowsPerPage={tempRowsPerPage}
          onPageChange={setTempPage}
          onRowsPerPageChange={(n) => setUrlState({ ath_tSize: n, ath_tPage: 0 })}
        />
      </Paper>

      {/* Bulk action bar */}
      <Paper sx={{ p: 1.5, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Selected: <strong>{selectedTemps}</strong> temp / <strong>{selectedExistCount}</strong> existing
        </Typography>
        {connectDisabledReason && (
          <Typography variant="caption" color="error.main" sx={{ ml: 1 }}>{connectDisabledReason}</Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip arrow title={connectDisabledReason || ''} disableHoverListener={!connectDisabledReason}>
          <span>
            <PrimaryButton size="small" startIcon={<LinkIcon />} disabled={!canConnect} onClick={handleConnect}>Connect</PrimaryButton>
          </span>
        </Tooltip>
        <SecondaryButton size="small" startIcon={<AddIcon />} disabled={!canCreate} onClick={handleCreateClick}>Create</SecondaryButton>
        <SecondaryButton size="small" startIcon={<VisibilityOffIcon />} disabled={!canHide} onClick={handleHide}>{allSelectedHidden ? 'Unhide' : 'Hide'}</SecondaryButton>
        <SecondaryButton size="small" startIcon={<DeleteIcon />} disabled={!canDelete} onClick={handleDelete}>Delete</SecondaryButton>
      </Paper>

      {/* Bottom table: existing athletes */}
      <Paper sx={{ p: 2, boxShadow: 1, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Existing Athletes ({existTotal})</Typography>
          <Typography variant="caption" color="text.secondary">{selectedExistCount} selected</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search existing athletes… (Enter to search)"
            value={pendingExistSearch}
            onChange={(e) => setPendingExistSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = pendingExistSearch.trim();
                if (trimmed !== existSearch) setUrlState({ ath_eSearch: trimmed, ath_ePage: 0 });
              }
            }}
            onBlur={() => {
              const trimmed = pendingExistSearch.trim();
              if (trimmed !== existSearch) setUrlState({ ath_eSearch: trimmed, ath_ePage: 0 });
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: existSearch && (
                <IconButton size="small" onClick={() => { setPendingExistSearch(''); setUrlState({ ath_eSearch: '', ath_ePage: 0 }); }}>
                  <FilterAltOffIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        <AthleteSuggestionBanner
          selectedCount={selectedTempList.length}
          maxSelection={SUGGEST_MAX_SELECTION}
          minNameLen={SUGGEST_MIN_NAME_LEN}
          eligible={suggestEligible}
          loading={suggestLoading}
          suggestions={suggestions}
          competitorById={competitorById}
          selectedAthleteIds={selectedExist}
          onPick={(id) => selectOnlyExist(id)}
          suggestCompetitorFilter={suggestCompetitorFilter}
          onToggleCompetitorFilter={(val) => setSuggestCompetitorFilter(val)}
          hasMultipleCompetitors={hasMultipleCompetitors}
          selectedCompetitorIds={selectedCompetitorIds}
          hasMixedSportTypes={hasMixedSportTypes}
        />

        <TableContainer sx={tableMaxHeightSx}>
          <Table size="small" stickyHeader sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sport</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nationality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DOB</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedExisting.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      {hasMixedSportTypes
                        ? 'Cannot display existing athletes: the selected unidentified rows belong to different sport types. Please select rows with the same sport type.'
                        : 'No athletes match'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {pagedExisting.map((row) => {
                const suggestion = suggestionByAthleteId.get(Number(row.ATHLETE_ID));
                return (
                  <TableRow
                    key={row.ATHLETE_ID}
                    hover
                    selected={selectedExist.has(row.ATHLETE_ID)}
                    sx={{ cursor: 'pointer', ...(suggestion ? { backgroundColor: 'rgba(25, 118, 210, 0.06)' } : null) }}
                    onClick={() => toggleExistSelect(row.ATHLETE_ID)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Radio size="small" checked={selectedExist.has(row.ATHLETE_ID)} onChange={() => toggleExistSelect(row.ATHLETE_ID)} />
                    </TableCell>
                    <TableCell>{row.ATHLETE_ID}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={row.IMAGE_URL || undefined}
                          sx={{ width: 32, height: 32, bgcolor: row.IMAGE_URL ? 'transparent' : '#1976d2', fontSize: '0.95rem' }}
                        >
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{row.name || `#${row.ATHLETE_ID}`}</Typography>
                        {suggestion && (
                          <Tooltip arrow title={`Auto-suggested match (${Math.round(suggestion.score * 100)}% similarity)`}>
                            <Chip size="small" color="primary" variant="outlined" label={`Suggested #${suggestion.rank} · ${Math.round(suggestion.score * 100)}%`} sx={{ ml: 0.5 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{sportById.get(Number(row.SPORT_TYPE_ID))?.ALIAS_NAME || row.SPORT_TYPE_ID || '-'}</TableCell>
                    <TableCell>{row.nationalityName || countryById.get(Number(row.NATIONALITY))?.name || (row.NATIONALITY > 0 ? row.NATIONALITY : '-')}</TableCell>
                    <TableCell>{row.GENDER === 1 ? 'Male' : row.GENDER === 2 ? 'Female' : '-'}</TableCell>
                    <TableCell>{row.POSITION || '-'}</TableCell>
                    <TableCell>{row.BIRTHDATE && row.BIRTHDATE !== '1800-01-01' ? row.BIRTHDATE : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          total={existTotal}
          page={existPage}
          rowsPerPage={existRowsPerPage}
          onPageChange={setExistPage}
          onRowsPerPageChange={(n) => setUrlState({ ath_eSize: n, ath_ePage: 0 })}
        />
      </Paper>

      {error && <MuiAlert severity="error" onClose={() => setError('')}>{error}</MuiAlert>}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</MuiAlert>
      </Snackbar>

      <AthleteCreateDialog
        open={singleCreateOpen}
        onClose={() => setSingleCreateOpen(false)}
        tempRow={singleCreateTempRow}
        countries={countries}
        sports={sports}
        positionTypes={positionTypes}
        formationPositionTypes={formationPositionTypes}
        onCreated={(ath) => {
          showToast(`Created athlete "${ath?.name ?? ''}"`, 'success');
          onSingleCreated(singleCreateTempRow);
          setSingleCreateOpen(false);
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
      <CreateModeChoiceDialog
        open={choiceOpen}
        count={selectedTempList.length}
        onClose={() => setChoiceOpen(false)}
        onChoose={handleChoose}
        entityName="athlete"
        disableManyToOne={hasMultipleCompetitors}
        disableManyToOneReason={hasMultipleCompetitors ? 'Selected temp rows belong to different competitors — cannot create a single athlete from them.' : ''}
      />
      <ManyToOneAthleteDialog
        open={manyOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        positionTypes={positionTypes}
        formationPositionTypes={formationPositionTypes}
        onClose={() => setManyOneOpen(false)}
        onCreated={onManyToOneCreated}
      />
      <OneToOneTabsAthleteDialog
        open={oneOneOpen}
        tempRows={selectedTempList}
        countries={countries}
        sports={sports}
        positionTypes={positionTypes}
        formationPositionTypes={formationPositionTypes}
        onClose={() => setOneOneOpen(false)}
        onCreated={onOneToOneCreated}
      />
      <TempInfoDialog
        row={infoRow}
        open={!!infoRow}
        onClose={() => setInfoRow(null)}
        sportById={sportById}
        langById={langById}
      />
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Athlete create dialog (for Terms Fix page)
 * ------------------------------------------------------------------------ */
function AthleteCreateDialog({ open, onClose, tempRow, countries, sports, positionTypes = [], formationPositionTypes = [], onCreated, onError }) {
  const [formData, setFormData] = useState({ name: '', SPORT_TYPE_ID: '', GENDER: '', NATIONALITY: '', BIRTHDATE: '', HEIGHT: '', POSITION: null, FORMATION_POSITION: null });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && tempRow) {
      setFormData({
        name: tempRow.NAME || '',
        SPORT_TYPE_ID: tempRow.SPORT_TYPE_ID != null ? Number(tempRow.SPORT_TYPE_ID) : '',
        GENDER: '',
        NATIONALITY: tempRow.NATIONALITY_ID != null && Number(tempRow.NATIONALITY_ID) > 0 ? Number(tempRow.NATIONALITY_ID) : '',
        BIRTHDATE: tempRow.DOB && tempRow.DOB !== '1800-01-01' ? tempRow.DOB : '',
        HEIGHT: '',
        POSITION: tempRow.POSITION_ID != null && Number(tempRow.POSITION_ID) > 0 ? tempRow.POSITION_ID : null,
        FORMATION_POSITION: null,
      });
      setFormErrors({});
    }
  }, [open, tempRow]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const filteredPositions = useMemo(
    () => formData.SPORT_TYPE_ID
      ? (positionTypes || []).filter((p) => p.SPORT_TYPE_ID === Number(formData.SPORT_TYPE_ID))
      : [],
    [positionTypes, formData.SPORT_TYPE_ID]
  );

  const formationPositions = useMemo(() => {
    if (!formData.POSITION) return [];
    return (formationPositionTypes || []).filter(
      (fp) => fp.POSITION_ID === formData.POSITION && fp.SPORT_TYPE_ID === Number(formData.SPORT_TYPE_ID)
    );
  }, [formationPositionTypes, formData.POSITION, formData.SPORT_TYPE_ID]);

  const handleSubmit = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const langId = tempRow?.LANG_ID != null && Number.isFinite(Number(tempRow.LANG_ID)) ? Number(tempRow.LANG_ID) : 1;
      const termValues = [{ languageId: 1, value: formData.name.trim(), isDefault: true, status: 'Approved' }];
      if (langId !== 1) {
        const origName = String(tempRow?.NAME ?? '').trim();
        if (origName && origName.toLowerCase() !== formData.name.trim().toLowerCase()) {
          termValues.push({ languageId: langId, value: origName, isDefault: false, status: 'Approved' });
        }
      }
      const newTerm = await api.createTerm({ category: 'Athletes Names', values: termValues });
      const res = await api.createAthlete({
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        GENDER: formData.GENDER !== '' ? Number(formData.GENDER) : null,
        NATIONALITY: formData.NATIONALITY !== '' ? Number(formData.NATIONALITY) : null,
        BIRTHDATE: formData.BIRTHDATE || null,
        HEIGHT: formData.HEIGHT ? Number(formData.HEIGHT) : null,
        POSITION: formData.POSITION || null,
        FORMATION_POSITION: formData.FORMATION_POSITION || null,
      });
      const created = res?.data ?? res;
      const athleteId = created?.ATHLETE_ID ?? created?.id;
      if (athleteId && tempRow?.COMPETITOR_ID != null && Number(tempRow.COMPETITOR_ID) > 0) {
        const rawTime = tempRow.CREATED_TIME;
        let startDate = null;
        if (rawTime) { const m = String(rawTime).match(/^(\d{2})\/(\d{2})\/(\d{2})/); if (m) startDate = `20${m[1]}-${m[2]}-${m[3]}`; }
        await api.createAthleteContract(athleteId, {
          COMPETITOR_ID: Number(tempRow.COMPETITOR_ID),
          JERSEY_NUMBER: tempRow.JERSEY_NUM != null && Number(tempRow.JERSEY_NUM) > 0 ? Number(tempRow.JERSEY_NUM) : null,
          CURRENT_CLUB: true,
          START_DATE: startDate,
          END_DATE: null,
        });
      }
      onCreated(created);
    } catch (e) {
      onError(e?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 1.5 }}>Create Athlete</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" required label="Name" value={formData.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} error={!!formErrors.name} helperText={formErrors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null} onChange={(_e, v) => { handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : ''); handleChange('POSITION', null); handleChange('FORMATION_POSITION', null); }} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? ''} label="Gender" onChange={(e) => handleChange('GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === formData.NATIONALITY) || null} onChange={(_e, v) => handleChange('NATIONALITY', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Nationality" />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" type="date" label="Date of Birth" value={formData.BIRTHDATE ?? ''} onChange={(e) => handleChange('BIRTHDATE', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" type="number" label="Height (cm)" value={formData.HEIGHT ?? ''} onChange={(e) => handleChange('HEIGHT', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={!formData.SPORT_TYPE_ID}>
              <InputLabel>Position</InputLabel>
              <Select value={formData.POSITION ?? ''} label="Position" onChange={(e) => { handleChange('POSITION', e.target.value || null); handleChange('FORMATION_POSITION', null); }}>
                <MenuItem value="">None</MenuItem>
                {filteredPositions.map((p) => (
                  <MenuItem key={p.POSITION_TYPE_ID} value={p.POSITION_TYPE_ID}>{p.ALIAS_NAME || p.POSITION_TYPE_ID}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={!formData.POSITION}>
              <InputLabel>Formation Position</InputLabel>
              <Select value={formData.FORMATION_POSITION ?? ''} label="Formation Position" onChange={(e) => handleChange('FORMATION_POSITION', e.target.value || null)}>
                <MenuItem value="">None</MenuItem>
                {formationPositions.map((fp) => (
                  <MenuItem key={fp.FORMATION_POSITION_TYPE_ID} value={fp.FORMATION_POSITION_TYPE_ID}>{fp.ALIAS_NAME || fp.FORMATION_POSITION_TYPE_ID}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Many-to-One Athlete dialog
 * ------------------------------------------------------------------------ */
function ManyToOneAthleteDialog({ open, onClose, tempRows = [], countries, sports, positionTypes = [], formationPositionTypes = [], onCreated }) {
  const [formData, setFormData] = useState({ name: '', SPORT_TYPE_ID: '', GENDER: '', NATIONALITY: '', BIRTHDATE: '', HEIGHT: '', POSITION: null, FORMATION_POSITION: null });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = tempRows[0];
    setFormData({
      name: first?.NAME || '',
      SPORT_TYPE_ID: first?.SPORT_TYPE_ID != null ? Number(first.SPORT_TYPE_ID) : '',
      GENDER: '',
      NATIONALITY: first?.NATIONALITY_ID != null && Number(first.NATIONALITY_ID) > 0 ? Number(first.NATIONALITY_ID) : '',
      BIRTHDATE: first?.DOB && first.DOB !== '1800-01-01' ? first.DOB : '',
      HEIGHT: '',
      POSITION: first?.POSITION_ID != null && Number(first.POSITION_ID) > 0 ? first.POSITION_ID : null,
      FORMATION_POSITION: null,
    });
    setFormErrors({});
  }, [open, tempRows]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const values = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of tempRows) {
      const v = String(row.NAME ?? '').trim();
      const lang = Number(row.LANG_ID);
      if (!v || !Number.isFinite(lang)) continue;
      const key = `${lang}|${v.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ languageId: lang, value: v, isDefault: list.length === 0, status: 'Approved' });
    }
    return list;
  }, [tempRows]);

  const filteredPositions = useMemo(
    () => formData.SPORT_TYPE_ID ? (positionTypes || []).filter((p) => p.SPORT_TYPE_ID === Number(formData.SPORT_TYPE_ID)) : [],
    [positionTypes, formData.SPORT_TYPE_ID]
  );

  const formationPositions = useMemo(() => {
    if (!formData.POSITION) return [];
    return (formationPositionTypes || []).filter(
      (fp) => fp.POSITION_ID === formData.POSITION && fp.SPORT_TYPE_ID === Number(formData.SPORT_TYPE_ID)
    );
  }, [formationPositionTypes, formData.POSITION, formData.SPORT_TYPE_ID]);

  const handleCreate = async () => {
    const err = {};
    if (!formData.name || String(formData.name).trim() === '') err.name = 'Required';
    if (formData.SPORT_TYPE_ID === '' || formData.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;
    setSaving(true);
    try {
      const allValues = [
        { languageId: 1, value: formData.name.trim(), isDefault: true, status: 'Approved' },
        ...values.filter((v) => !(v.languageId === 1 && v.value.toLowerCase() === formData.name.trim().toLowerCase())),
      ];
      const newTerm = await api.createTerm({ category: 'Athletes Names', values: allValues });
      const res = await api.createAthlete({
        NAME_ID: newTerm.id,
        SPORT_TYPE_ID: Number(formData.SPORT_TYPE_ID),
        GENDER: formData.GENDER !== '' ? Number(formData.GENDER) : null,
        NATIONALITY: formData.NATIONALITY !== '' ? Number(formData.NATIONALITY) : null,
        BIRTHDATE: formData.BIRTHDATE || null,
        HEIGHT: formData.HEIGHT ? Number(formData.HEIGHT) : null,
        POSITION: formData.POSITION || null,
        FORMATION_POSITION: formData.FORMATION_POSITION || null,
      });
      const created = res?.data ?? res;
      const athleteId = created?.ATHLETE_ID ?? created?.id;
      const firstRow = tempRows[0];
      if (athleteId && firstRow?.COMPETITOR_ID != null && Number(firstRow.COMPETITOR_ID) > 0) {
        const rawTime = firstRow.CREATED_TIME;
        let startDate = null;
        if (rawTime) { const m = String(rawTime).match(/^(\d{2})\/(\d{2})\/(\d{2})/); if (m) startDate = `20${m[1]}-${m[2]}-${m[3]}`; }
        await api.createAthleteContract(athleteId, {
          COMPETITOR_ID: Number(firstRow.COMPETITOR_ID),
          JERSEY_NUMBER: firstRow.JERSEY_NUM != null && Number(firstRow.JERSEY_NUM) > 0 ? Number(firstRow.JERSEY_NUM) : null,
          CURRENT_CLUB: true,
          START_DATE: startDate,
          END_DATE: null,
        });
      }
      onCreated?.(created, newTerm, tempRows.map((r) => r.ATHLETE_ID));
      onClose?.();
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, _form: e?.message || 'Failed to create athlete' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create Athlete from {tempRows.length} temp rows
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, background: '#f9fafb', borderColor: '#e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Term values that will be created ({values.length + 1})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            The <strong>Name</strong> below will be added as an English (Approved) default value.
            The values from the selected temp rows will be added under their own LANG_ID.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {values.map((v) => (
              <Chip key={`${v.languageId}|${v.value}`} size="small" label={`[${v.languageId}] ${v.value}`} sx={{ maxWidth: 360 }} />
            ))}
          </Box>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" required label="Name" value={formData.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} error={!!formErrors.name} helperText={formErrors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === formData.SPORT_TYPE_ID) || null} onChange={(_e, v) => { handleChange('SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : ''); handleChange('POSITION', null); handleChange('FORMATION_POSITION', null); }} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!formErrors.SPORT_TYPE_ID} helperText={formErrors.SPORT_TYPE_ID} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={formData.GENDER ?? ''} label="Gender" onChange={(e) => handleChange('GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value={1}>Male</MenuItem>
                <MenuItem value={2}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === formData.NATIONALITY) || null} onChange={(_e, v) => handleChange('NATIONALITY', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Nationality" />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" type="date" label="Date of Birth" value={formData.BIRTHDATE ?? ''} onChange={(e) => handleChange('BIRTHDATE', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" type="number" label="Height (cm)" value={formData.HEIGHT ?? ''} onChange={(e) => handleChange('HEIGHT', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={!formData.SPORT_TYPE_ID}>
              <InputLabel>Position</InputLabel>
              <Select value={formData.POSITION ?? ''} label="Position" onChange={(e) => { handleChange('POSITION', e.target.value || null); handleChange('FORMATION_POSITION', null); }}>
                <MenuItem value="">None</MenuItem>
                {filteredPositions.map((p) => (
                  <MenuItem key={p.POSITION_TYPE_ID} value={p.POSITION_TYPE_ID}>{p.ALIAS_NAME || p.POSITION_TYPE_ID}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={!formData.POSITION}>
              <InputLabel>Formation Position</InputLabel>
              <Select value={formData.FORMATION_POSITION ?? ''} label="Formation Position" onChange={(e) => handleChange('FORMATION_POSITION', e.target.value || null)}>
                <MenuItem value="">None</MenuItem>
                {formationPositions.map((fp) => (
                  <MenuItem key={fp.FORMATION_POSITION_TYPE_ID} value={fp.FORMATION_POSITION_TYPE_ID}>{fp.ALIAS_NAME || fp.FORMATION_POSITION_TYPE_ID}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {formErrors._form && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formErrors._form}</Box>}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={saving || values.length === 0} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * One-to-One Tabs Athlete dialog
 * ------------------------------------------------------------------------ */
function OneToOneTabsAthleteDialog({ open, onClose, tempRows = [], countries, sports, positionTypes = [], formationPositionTypes = [], onCreated }) {
  const DEFAULT_FORM = { name: '', SPORT_TYPE_ID: '', GENDER: '', NATIONALITY: '', BIRTHDATE: '', HEIGHT: '', POSITION: null, FORMATION_POSITION: null };
  const [activeTab, setActiveTab] = useState(0);
  const [forms, setForms] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [completed, setCompleted] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setActiveTab(0);
    setForms(tempRows.map((row) => ({
      ...DEFAULT_FORM,
      name: row.NAME || '',
      SPORT_TYPE_ID: row.SPORT_TYPE_ID != null ? Number(row.SPORT_TYPE_ID) : '',
      NATIONALITY: row.NATIONALITY_ID != null && Number(row.NATIONALITY_ID) > 0 ? Number(row.NATIONALITY_ID) : '',
      BIRTHDATE: row.DOB && row.DOB !== '1800-01-01' ? row.DOB : '',
      POSITION: row.POSITION_ID != null && Number(row.POSITION_ID) > 0 ? row.POSITION_ID : null,
      _tempRow: row,
    })));
    setErrors(tempRows.map(() => ({})));
    setCompleted(new Set());
    setFormError('');
  }, [open, tempRows]);

  const onChange = (tabIdx, field, value) => {
    setForms((prev) => { const next = [...prev]; next[tabIdx] = { ...next[tabIdx], [field]: value }; return next; });
    setErrors((prev) => { const next = [...prev]; if (next[tabIdx]?.[field]) { next[tabIdx] = { ...next[tabIdx], [field]: undefined }; } return next; });
  };

  const validate = (f) => {
    const err = {};
    if (!f.name || String(f.name).trim() === '') err.name = 'Required';
    if (f.SPORT_TYPE_ID === '' || f.SPORT_TYPE_ID == null) err.SPORT_TYPE_ID = 'Required';
    return err;
  };

  const tabs = useMemo(
    () => tempRows.map((row, idx) => ({ label: row.NAME || `Row ${row.ATHLETE_ID}`, done: completed.has(idx) })),
    [tempRows, completed]
  );

  const handleCreateAll = async () => {
    const nextErrors = forms.map(validate);
    setErrors(nextErrors);
    const firstInvalid = nextErrors.findIndex((e) => Object.keys(e).length > 0);
    if (firstInvalid !== -1) { setActiveTab(firstInvalid); return; }
    try {
      setSaving(true);
      setFormError('');
      const createdList = [];
      const createdTempIds = [];
      const failed = [];
      const nextCompleted = new Set(completed);
      for (let idx = 0; idx < forms.length; idx += 1) {
        if (nextCompleted.has(idx)) continue;
        const form = forms[idx];
        const row = form._tempRow;
        const langId = row?.LANG_ID != null && Number.isFinite(Number(row.LANG_ID)) ? Number(row.LANG_ID) : 1;
        try {
          const termValues = [{ languageId: 1, value: form.name.trim(), isDefault: true, status: 'Approved' }];
          if (langId !== 1) {
            const origName = String(row?.NAME ?? '').trim();
            if (origName && origName.toLowerCase() !== form.name.trim().toLowerCase()) {
              termValues.push({ languageId: langId, value: origName, isDefault: false, status: 'Approved' });
            }
          }
          const newTerm = await api.createTerm({ category: 'Athletes Names', values: termValues });
          const res = await api.createAthlete({
            NAME_ID: newTerm.id,
            SPORT_TYPE_ID: Number(form.SPORT_TYPE_ID),
            GENDER: form.GENDER !== '' ? Number(form.GENDER) : null,
            NATIONALITY: form.NATIONALITY !== '' ? Number(form.NATIONALITY) : null,
            BIRTHDATE: form.BIRTHDATE || null,
            HEIGHT: form.HEIGHT ? Number(form.HEIGHT) : null,
            POSITION: form.POSITION || null,
            FORMATION_POSITION: form.FORMATION_POSITION || null,
          });
          const created = res?.data ?? res;
          const athleteId = created?.ATHLETE_ID ?? created?.id;
          if (athleteId && row?.COMPETITOR_ID != null && Number(row.COMPETITOR_ID) > 0) {
            const rawTime = row.CREATED_TIME;
            let startDate = null;
            if (rawTime) { const m = String(rawTime).match(/^(\d{2})\/(\d{2})\/(\d{2})/); if (m) startDate = `20${m[1]}-${m[2]}-${m[3]}`; }
            await api.createAthleteContract(athleteId, {
              COMPETITOR_ID: Number(row.COMPETITOR_ID),
              JERSEY_NUMBER: row.JERSEY_NUM != null && Number(row.JERSEY_NUM) > 0 ? Number(row.JERSEY_NUM) : null,
              CURRENT_CLUB: true,
              START_DATE: startDate,
              END_DATE: null,
            });
          }
          createdList.push(created);
          createdTempIds.push(row?.ATHLETE_ID);
          nextCompleted.add(idx);
        } catch (err) {
          failed.push({ idx, message: err?.message || 'Failed' });
        }
      }
      setCompleted(nextCompleted);
      if (failed.length > 0) {
        setFormError(`Created ${createdList.length}/${forms.length}. Errors: ${failed.map((f) => `tab ${f.idx + 1} – ${f.message}`).join(' | ')}`);
        if (failed[0]?.idx != null) setActiveTab(failed[0].idx);
      }
      if (createdList.length > 0) onCreated?.(createdList, createdTempIds.filter((x) => x != null));
      if (failed.length === 0) onClose?.();
    } catch (err) {
      setFormError(err?.message || 'Failed to create athletes');
    } finally {
      setSaving(false);
    }
  };

  const f = forms[activeTab] || {};

  const filteredPositions = useMemo(
    () => f.SPORT_TYPE_ID ? (positionTypes || []).filter((p) => p.SPORT_TYPE_ID === Number(f.SPORT_TYPE_ID)) : [],
    [positionTypes, f.SPORT_TYPE_ID]
  );

  const formationPositions = useMemo(() => {
    if (!f.POSITION) return [];
    return (formationPositionTypes || []).filter(
      (fp) => fp.POSITION_ID === f.POSITION && fp.SPORT_TYPE_ID === Number(f.SPORT_TYPE_ID)
    );
  }, [formationPositionTypes, f.POSITION, f.SPORT_TYPE_ID]);

  if (forms.length === 0) return null;

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create {tempRows.length} Athletes (one per tab)
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 0, pb: 2 }}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 }, '& .Mui-selected': { color: '#1976d2' } }}>
          {tabs.map((t, idx) => (
            <Tab key={idx} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{t.done && <Box component="span" sx={{ color: '#15803d', fontSize: 16, display: 'flex' }}>✓</Box>}<span>{t.label}</span></Box>} />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Source temp row:</Typography>
            <Chip size="small" label={`[${f._tempRow?.LANG_ID}] ${f._tempRow?.NAME ?? ''}`} sx={{ maxWidth: 420 }} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" required label="Name" value={f.name ?? ''} onChange={(e) => onChange(activeTab, 'name', e.target.value)} error={!!(errors[activeTab] || {}).name} helperText={(errors[activeTab] || {}).name} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={sports || []} getOptionLabel={(o) => o.name || o.ALIAS_NAME || ''} value={(sports || []).find((s) => s.SPORT_TYPE_ID === f.SPORT_TYPE_ID) || null} onChange={(_e, v) => { onChange(activeTab, 'SPORT_TYPE_ID', v ? v.SPORT_TYPE_ID : ''); onChange(activeTab, 'POSITION', null); onChange(activeTab, 'FORMATION_POSITION', null); }} renderInput={(params) => <TextField {...params} label="Sport Type" required error={!!(errors[activeTab] || {}).SPORT_TYPE_ID} helperText={(errors[activeTab] || {}).SPORT_TYPE_ID} />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={f.GENDER ?? ''} label="Gender" onChange={(e) => onChange(activeTab, 'GENDER', e.target.value !== '' ? Number(e.target.value) : '')}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value={1}>Male</MenuItem>
                  <MenuItem value={2}>Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete size="small" options={countries || []} getOptionLabel={(o) => o.name || ''} value={(countries || []).find((c) => c.COUNTRY_ID === f.NATIONALITY) || null} onChange={(_e, v) => onChange(activeTab, 'NATIONALITY', v ? v.COUNTRY_ID : '')} renderInput={(params) => <TextField {...params} label="Nationality" />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="Date of Birth" value={f.BIRTHDATE ?? ''} onChange={(e) => onChange(activeTab, 'BIRTHDATE', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="number" label="Height (cm)" value={f.HEIGHT ?? ''} onChange={(e) => onChange(activeTab, 'HEIGHT', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" disabled={!f.SPORT_TYPE_ID}>
                <InputLabel>Position</InputLabel>
                <Select value={f.POSITION ?? ''} label="Position" onChange={(e) => { onChange(activeTab, 'POSITION', e.target.value || null); onChange(activeTab, 'FORMATION_POSITION', null); }}>
                  <MenuItem value="">None</MenuItem>
                  {filteredPositions.map((p) => (
                    <MenuItem key={p.POSITION_TYPE_ID} value={p.POSITION_TYPE_ID}>{p.ALIAS_NAME || p.POSITION_TYPE_ID}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" disabled={!f.POSITION}>
                <InputLabel>Formation Position</InputLabel>
                <Select value={f.FORMATION_POSITION ?? ''} label="Formation Position" onChange={(e) => onChange(activeTab, 'FORMATION_POSITION', e.target.value || null)}>
                  <MenuItem value="">None</MenuItem>
                  {formationPositions.map((fp) => (
                    <MenuItem key={fp.FORMATION_POSITION_TYPE_ID} value={fp.FORMATION_POSITION_TYPE_ID}>{fp.ALIAS_NAME || fp.FORMATION_POSITION_TYPE_ID}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          {formError && <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formError}</Box>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreateAll} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>{saving ? 'Creating…' : `Create ${forms.length} Athletes`}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
 * Athlete suggestion banner with competitor filter toggle
 * ------------------------------------------------------------------------ */
function AthleteSuggestionBanner({
  selectedCount,
  maxSelection,
  minNameLen,
  eligible,
  loading,
  suggestions,
  competitorById,
  selectedAthleteIds,
  onPick,
  suggestCompetitorFilter,
  onToggleCompetitorFilter,
  hasMultipleCompetitors,
  selectedCompetitorIds,
  hasMixedSportTypes,
}) {
  if (selectedCount === 0) return null;

  if (hasMixedSportTypes) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(211,47,47,0.06)', border: '1px dashed rgba(211,47,47,0.4)' }}>
        <Typography variant="caption" color="error.main">
          Selected unidentified rows belong to different sport types — existing athletes cannot be displayed.
        </Typography>
      </Box>
    );
  }

  if (!eligible) {
    const reason =
      selectedCount > maxSelection
        ? `Auto-suggestions are disabled when more than ${maxSelection} temp rows are selected.`
        : `Selected temp names must have more than ${minNameLen - 1} characters to auto-suggest.`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.03)', border: '1px dashed #d0d0d0' }}>
        <Typography variant="caption" color="text.secondary">{reason}</Typography>
      </Box>
    );
  }

  const competitorLabel = selectedCompetitorIds.length === 1
    ? competitorById.get(selectedCompetitorIds[0])?.name || `Competitor ${selectedCompetitorIds[0]}`
    : '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.06)', border: '1px solid rgba(25,118,210,0.2)' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
        {loading ? 'Finding best matches…' : 'Suggested matches:'}
      </Typography>
      {!loading && suggestions.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No similar existing athletes found. Use the search below to connect manually.
        </Typography>
      )}
      {!loading &&
        suggestions.map((s, idx) => {
          const label = s.name || `#${s.athleteId}`;
          const pct = Math.round(s.score * 100);
          const isSelected = selectedAthleteIds.has(Number(s.athleteId));
          return (
            <Tooltip key={s.athleteId} arrow title={`Rank #${idx + 1} · ${pct}% similarity`}>
              <Chip
                size="small" clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                icon={<PersonIcon />}
                label={`#${idx + 1}  ${label}  ·  ${pct}%`}
                onClick={() => onPick(s.athleteId)}
                sx={{ fontWeight: 500 }}
              />
            </Tooltip>
          );
        })}
      <Box sx={{ flex: 1 }} />
      <Tooltip arrow title={
        hasMultipleCompetitors
          ? 'Competitor filter disabled: selected temp rows belong to different competitors'
          : suggestCompetitorFilter
            ? `Showing only athletes from ${competitorLabel || 'the same competitor'}. Toggle off to see all.`
            : 'Showing all athletes. Toggle on to filter by competitor.'
      }>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={suggestCompetitorFilter}
              onChange={(e) => onToggleCompetitorFilter(e.target.checked)}
              disabled={hasMultipleCompetitors}
            />
          }
          label={
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              Same competitor{competitorLabel ? `: ${competitorLabel}` : ''}
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      </Tooltip>
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Suggestion banner: renders the top-N auto-suggested countries as clickable
 * chips above the Existing Countries table. Clicking a chip selects exactly
 * that country (replacing any prior manual selection). The banner is always
 * shown while 1..3 temp rows are selected so the user gets consistent
 * feedback - including the "no good match" case (empty suggestions).
 * ------------------------------------------------------------------------ */
function SuggestionBanner({
  selectedCount,
  maxSelection,
  minNameLen,
  eligible,
  loading,
  suggestions,
  selectedCountryIds,
  onPick,
}) {
  if (selectedCount === 0) return null;

  // Explain the gate when the user has disqualifying selections, rather than
  // silently showing nothing.
  if (!eligible) {
    const reason =
      selectedCount > maxSelection
        ? `Auto-suggestions are disabled when more than ${maxSelection} temp rows are selected.`
        : `Selected temp names must have more than ${minNameLen - 1} characters to auto-suggest.`;
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          p: 1,
          borderRadius: 1,
          bgcolor: 'rgba(0,0,0,0.03)',
          border: '1px dashed #d0d0d0',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {reason}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        mb: 1.5,
        p: 1,
        borderRadius: 1,
        bgcolor: 'rgba(25,118,210,0.06)',
        border: '1px solid rgba(25,118,210,0.2)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
        {loading ? 'Finding best matches…' : 'Suggested matches:'}
      </Typography>
      {!loading && suggestions.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No similar existing countries found. Use the search below to connect manually.
        </Typography>
      )}
      {!loading &&
        suggestions.map((s, idx) => {
          const label = s.name || `#${s.countryId}`;
          const pct = Math.round(s.score * 100);
          const isSelected = selectedCountryIds.has(Number(s.countryId));
          return (
            <Tooltip
              key={s.countryId}
              arrow
              title={
                s.code
                  ? `Rank #${idx + 1} · ${pct}% similarity · ${s.code}`
                  : `Rank #${idx + 1} · ${pct}% similarity`
              }
            >
              <Chip
                size="small"
                clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                icon={<PublicIcon />}
                label={`#${idx + 1}  ${label}  ·  ${pct}%`}
                onClick={() => onPick(s.countryId)}
                sx={{ fontWeight: 500 }}
              />
            </Tooltip>
          );
        })}
    </Box>
  );
}

/* --------------------------------------------------------------------------
 * Pagination bar (kept consistent with CountriesList styling)
 * ------------------------------------------------------------------------ */
function PaginationBar({ total, page, rowsPerPage, onPageChange, onRowsPerPageChange }) {
  if (total === 0) return null;
  const maxPage = Math.max(0, Math.ceil(total / rowsPerPage) - 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        >
          {ROWS_PER_PAGE_OPTIONS.map((n) => (
            <MenuItem key={n} value={n}>{n}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2">
        {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, total)} of {total}
      </Typography>
      <IconButton size="small" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => onPageChange(Math.min(maxPage, page + 1))} disabled={page >= maxPage}>
        <ArrowForwardIosIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
