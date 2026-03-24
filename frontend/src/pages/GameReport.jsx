import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Alert,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BugReportIcon from '@mui/icons-material/BugReport';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import api from '../services/api';

dayjs.extend(utc);
import LoadingSpinner from '../../reuse/LoadingSpinner';

// Game status codes from data sources (Opta/Simulator); extend as new codes appear
const GAME_STATUS_LABELS = {
  1: 'Unknown',
  2: 'Not Started',
  3: 'Finished',
  6: 'First Half',
  7: 'Half Time',
  8: 'Second Half',
  12: '1st Half',
  13: 'Extra Time 1st Half',
  18: 'Scheduled',
  19: 'Live',
  23: 'Ended',
  128: 'Postponed',
  172: 'Extra Time 1st Half',
  174: 'Extra Time 2nd Half',
};

// Including Data filter config: Name in filter -> { searchText, matchType }
// matchType: 'hasValue' = Key: with non-empty content | 'notMinusOne' = Key with value ≠ -1 | 'contains' = substring exists
const INCLUDING_DATA_FILTERS = [
  { filterName: 'Status', searchText: 'Status:', matchType: 'notMinusOne' },
  { filterName: 'Venue', searchText: 'Venue:', matchType: 'notMinusOne' },
  { filterName: 'Current Score', searchText: 'CurrResult', matchType: 'notMinusOne', excludeText: ['-1--1', 'Score For CurrResult- _-_'] },
  { filterName: 'Period Score', searchText: 'Score For', excludeText: ['CurrResult', '-1--1', 'Score For CurrResult- _-_'], matchType: 'notMinusOne' },
  { filterName: 'Game Time', searchText: 'GameTime:', matchType: 'notMinusOne' },
  { filterName: 'Events', searchText: 'Events:', matchType: 'hasValue' },
  { filterName: 'VAR Events', searchText: 'VarEvents:', matchType: 'hasValue' },
  { filterName: 'Statitstics', searchText: 'Statistics:', matchType: 'hasValue' },
  { filterName: 'Missing Players', searchText: '(Suspended)', searchTextAlt: '(Injured)', matchType: 'contains' },
  { filterName: 'Probable Lineups', searchText: '(NotConfirmed)', matchType: 'contains' },
  { filterName: 'Official Lineups', searchText: '(Confirmed)', matchType: 'contains' },
  { filterName: 'Players Stats', searchText: 'Stats:', matchType: 'hasValue' },
  { filterName: 'Attendence', searchText: 'Attendance:', matchType: 'hasValue' },
  { filterName: 'Events chart', searchText: 'Event Chart Updates:', matchType: 'hasValue' },
  { filterName: 'TV network', searchText: 'Broadcasts:', matchType: 'hasValue' },
  { filterName: 'Stories', searchText: 'Stories:', matchType: 'hasValue' },
  { filterName: 'Officials', searchText: 'Officials:', matchType: 'hasValue' },
  { filterName: 'Team Possesion', searchText: 'Possession:', matchType: 'notMinusOne' },
  { filterName: 'Serving player', searchText: 'Serving Player:', matchType: 'notMinusOne' },
  { filterName: 'To Qualify', searchText: 'ToQualify:', matchType: 'notMinusOne' },
  { filterName: 'Stage Times', searchText: 'Stage Times:', matchType: 'hasValue' },
];

function matchIncludingDataFilter(text, config) {
  if (!text || typeof text !== 'string') return false;
  const { searchText, searchTextAlt, excludeText, matchType } = config;
  const excludes = Array.isArray(excludeText) ? excludeText : excludeText ? [excludeText] : [];
  if (excludes.some((ex) => text.includes(ex))) return false;
  if (matchType === 'contains') {
    const ok = text.includes(searchText) || (searchTextAlt && text.includes(searchTextAlt));
    return ok;
  }
  if (matchType === 'hasValue') {
    const idx = text.indexOf(searchText);
    if (idx === -1) return false;
    const after = text.slice(idx + searchText.length).trim();
    return after.length > 0 && after !== '-1';
  }
  if (matchType === 'notMinusOne') {
    const idx = text.indexOf(searchText);
    if (idx === -1) return false;
    const after = text.slice(idx + searchText.length);
    const numMatch = after.match(/^\s*(-?\d+)/);
    if (!numMatch) return true; // key exists, assume valid if no number
    return numMatch[1] !== '-1';
  }
  return false;
}

const DATE_FORMAT_IL_UTC = 'DD/MM/YYYY HH:mm:ss';

function getStatusFromUpdateText(text) {
  if (!text || typeof text !== 'string') return null;
  const idx = text.indexOf('Status: ');
  if (idx === -1) return null;
  const after = text.slice(idx + 8);
  const end = after.search(/[\r\n]/);
  const value = (end === -1 ? after : after.slice(0, end)).trim();
  return value || null;
}

function formatDateTime(val) {
  if (!val) return '-';
  try {
    const d = dayjs.utc(val);
    return d.isValid() ? d.format(DATE_FORMAT_IL_UTC) : '-';
  } catch {
    return '-';
  }
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text)?.catch(() => {});
}

function formatGap(created, handled) {
  if (!created || !handled) return '-';
  try {
    const c = new Date(created);
    const h = new Date(handled);
    if (isNaN(c.getTime()) || isNaN(h.getTime())) return '-';
    let ms = h.getTime() - c.getTime();
    if (ms < 0) ms = -ms;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    const parts = [];
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    parts.push(`${millis}ms`);
    return parts.join(' ');
  } catch {
    return '-';
  }
}

export default function GameReport() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 15 });
  const [sort, setSort] = useState({ by: 'handled', dir: 'desc' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [filters, setFilters] = useState({
    freeText: '',
    source: [],
    updateType: [],
    includingData: [],
    dateFrom: null,
    dateTo: null,
  });
  const [filterOptions, setFilterOptions] = useState({ sources: [], updateTypes: [], sourceNames: {} });
  const [gameEnrichment, setGameEnrichment] = useState({
    sportName: null,
    competitionName: null,
    competitionCountryName: null,
    competitor1Name: null,
    competitor2Name: null,
  });

  useEffect(() => {
    if (!game) {
      setGameEnrichment({ sportName: null, competitionName: null, competitionCountryName: null, competitor1Name: null, competitor2Name: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [sports, competition, competitors] = await Promise.all([
          api.getSports().catch(() => []),
          game.COMPETITION_ID ? api.getCompetitionById(game.COMPETITION_ID).catch(() => null) : Promise.resolve(null),
          api.getCompetitors().catch(() => []),
        ]);
        if (cancelled) return;
        const sport = Array.isArray(sports) ? sports.find((s) => (s.SPORT_TYPE_ID ?? s.SPORTTYPE_ID) === (game.SPORTTYPE_ID ?? game.SPORT_TYPE_ID)) : null;
        const sportName = sport ? (sport.name || sport.ALIAS_NAME || null) : null;
        const competitionName = competition?.name ?? null;
        const competitionCountryName = competition?.countryName ?? null;
        const parts = (game.GAME_KEY || game.gameKey || '').toString().trim().split('-');
        const id1 = parts.length >= 1 ? parseInt(parts[0].trim(), 10) : null;
        const id2 = parts.length >= 2 ? parseInt(parts[1].trim(), 10) : null;
        const compList = Array.isArray(competitors) ? competitors : [];
        const c1 = id1 != null && !isNaN(id1) ? compList.find((c) => (c.COMPETITOR_ID ?? c.id) === id1) : null;
        const c2 = id2 != null && !isNaN(id2) ? compList.find((c) => (c.COMPETITOR_ID ?? c.id) === id2) : null;
        setGameEnrichment({
          sportName: sportName ?? null,
          competitionName: competitionName ?? null,
          competitionCountryName: competitionCountryName ?? null,
          competitor1Name: c1?.name ?? null,
          competitor2Name: c2?.name ?? null,
        });
      } catch {
        if (!cancelled) setGameEnrichment({ sportName: null, competitionName: null, competitionCountryName: null, competitor1Name: null, competitor2Name: null });
      }
    })();
    return () => { cancelled = true; };
  }, [game]);

  const loadUpdates = React.useCallback(async (appliedFilters) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const f = appliedFilters || filters;
      const { data, filterOptions: opts } = await api.getGameUpdates(id, {
        freeText: f.freeText,
        source: Array.isArray(f.source) ? f.source : (f.source ? [f.source] : []),
        updateType: Array.isArray(f.updateType) ? f.updateType : (f.updateType ? [f.updateType] : []),
        dateFrom: f.dateFrom ? dayjs(f.dateFrom).format('YYYY-MM-DD') : undefined,
        dateTo: f.dateTo ? dayjs(f.dateTo).format('YYYY-MM-DD') : undefined,
      });
      setUpdates(Array.isArray(data) ? data : []);
      setFilterOptions(opts || { sources: [], updateTypes: [], sourceNames: {} });
    } catch (err) {
      setError(err?.message || 'Failed to load report');
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [gameData, { data, filterOptions: opts }] = await Promise.all([
          api.getGameById(id).catch(() => null),
          api.getGameUpdates(id),
        ]);
        setGame(gameData);
        setUpdates(Array.isArray(data) ? data : []);
        const fo = opts || { sources: [], updateTypes: [], sourceNames: {} };
        setFilterOptions(fo);
        setFilters((prev) => ({
          ...prev,
          dateFrom: fo.dateFrom ? dayjs(fo.dateFrom) : null,
          dateTo: fo.dateTo ? dayjs(fo.dateTo) : null,
        }));
      } catch (err) {
        setError(err?.message || 'Failed to load report');
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSearch = () => {
    const next = { ...filters };
    setAppliedFilters(next);
    setPagination((p) => ({ ...p, page: 0 }));
    loadUpdates(next);
  };

  const availableIncludingDataOptions = useMemo(() => {
    if (!updates.length) return [];
    const present = new Set();
    for (const u of updates) {
      const text = u.UPDATE_TEXT || '';
      for (const config of INCLUDING_DATA_FILTERS) {
        if (matchIncludingDataFilter(text, config)) {
          present.add(config.filterName);
        }
      }
    }
    return INCLUDING_DATA_FILTERS.filter((c) => present.has(c.filterName))
      .map((c) => c.filterName)
      .sort((a, b) => a.localeCompare(b));
  }, [updates]);

  const filteredUpdates = useMemo(() => {
    const selected = appliedFilters ? (appliedFilters.includingData || []) : [];
    if (selected.length === 0) return updates;
    return updates.filter((u) => {
      const text = u.UPDATE_TEXT || '';
      return selected.some((name) => {
        const config = INCLUDING_DATA_FILTERS.find((c) => c.filterName === name);
        return config && matchIncludingDataFilter(text, config);
      });
    });
  }, [updates, appliedFilters]);

  const getSortValue = (u, by) => {
    switch (by) {
      case 'created':
        return u.CREATED ? new Date(u.CREATED).getTime() : null;
      case 'handled':
        return u.HANDLED ? new Date(u.HANDLED).getTime() : null;
      case 'status': {
        const label = getStatusFromUpdateText(u.UPDATE_TEXT) ?? GAME_STATUS_LABELS[u.GAME_STATUS] ?? String(u.GAME_STATUS ?? '');
        return label === '-1' ? '' : (label || '');
      }
      case 'startTime':
        return u.GAME_STARTTIME ? new Date(u.GAME_STARTTIME).getTime() : null;
      case 'gameTime':
        return typeof u.GAME_TIME === 'number' ? u.GAME_TIME : (u.GAME_TIME != null ? Number(u.GAME_TIME) : null);
      case 'score': {
        const score = u.COMPETITOR_1_CURR_SCORE != null && u.COMPETITOR_2_CURR_SCORE != null
          ? `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`
          : null;
        return score === '-1--1' ? '' : (score ?? '');
      }
      case 'source':
        return (filterOptions.sourceNames || {})[u.DATA_SOURCE_ID] ?? String(u.DATA_SOURCE_ID ?? '');
      case 'sequence':
        return u.CREATED_SEQUENCE != null ? Number(u.CREATED_SEQUENCE) : null;
      case 'hasException':
        return !!(u.EXCEPTION_TEXT && String(u.EXCEPTION_TEXT).trim());
      case 'hasTrace':
        return !!(u.TRACE && String(u.TRACE).trim());
      default:
        return null;
    }
  };

  const sortedUpdates = useMemo(() => {
    if (!sort.by) return filteredUpdates;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredUpdates].sort((a, b) => {
      const va = getSortValue(a, sort.by);
      const vb = getSortValue(b, sort.by);
      const na = va == null || va === '';
      const nb = vb == null || vb === '';
      if (na && nb) return 0;
      if (na) return 1;
      if (nb) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return dir * cmp;
    });
  }, [filteredUpdates, sort.by, sort.dir, filterOptions]);

  const paginatedUpdates = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    return sortedUpdates.slice(start, start + pagination.rowsPerPage);
  }, [sortedUpdates, pagination.page, pagination.rowsPerPage]);

  const handleSort = (by) => {
    setSort((prev) => ({
      by,
      dir: prev.by === by && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
    setPagination((p) => ({ ...p, page: 0 }));
  };

  if (loading && !game) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton component={Link} to="/games" size="small" sx={{ bgcolor: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReportIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Game Report (Investigation)
          </Typography>
          <Chip label={`Game #${id}`} color="primary" size="small" />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {game && (
        <Paper
          sx={{
            p: 3,
            boxShadow: 1,
            border: '1px solid #e0e0e0',
            backgroundColor: 'white',
            mb: 2,
          }}
        >
          <Box
            sx={{
              mb: 2,
              pb: 1,
              borderBottom: '2px solid #e0e0e0',
              backgroundColor: '#f5f5f5',
              px: 2,
              py: 1,
              mx: -3,
              mt: -3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              General Details
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
              gap: { xs: 1.5, md: 1.25 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">STARTTIME</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{formatDateTime(game.STARTTIME)}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Sport type name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{gameEnrichment.sportName ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Competition name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{gameEnrichment.competitionName ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Competition Country name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{gameEnrichment.competitionCountryName ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Game status name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{GAME_STATUS_LABELS[game.STATUS] ?? game.STATUS ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Competitor 1 Name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{gameEnrichment.competitor1Name ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Competitor 2 name</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{gameEnrichment.competitor2Name ?? '-'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Game score</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>-</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">Is deleted</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {game.IS_DELETED ? (game.DELETE_TIME ? formatDateTime(game.DELETE_TIME) : 'Yes') : 'No'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">KEEP_DEBUG_LOGS</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{game.KEEP_DEBUG_LOGS === true ? 'Yes' : 'No'}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">KEEP_BETS_DEBUG_LOGS</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{game.KEEP_BETS_DEBUG_LOGS === true ? 'Yes' : 'No'}</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, justifyContent: 'flex-start' }}>
          <TextField
            size="small"
            placeholder="Free Text Search (min 3 chars)"
            value={filters.freeText}
            onChange={(e) => setFilters((prev) => ({ ...prev, freeText: e.target.value }))}
            sx={{ minWidth: 245, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
          />
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.source}
            onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
            sx={{ minWidth: 140, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Source';
              if (arr.length === 1) return (filterOptions.sourceNames || {})[arr[0]] || arr[0];
              return `Source (${arr.length})`;
            }}
          >
            {(filterOptions.sources || []).map((s) => (
              <MenuItem key={s} value={s}>
                <Checkbox checked={(filters.source || []).indexOf(s) > -1} size="small" sx={{ mr: 1 }} />
                {(filterOptions.sourceNames || {})[s] || s}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.updateType}
            onChange={(e) => setFilters((prev) => ({ ...prev, updateType: e.target.value }))}
            sx={{ minWidth: 220, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Update Type';
              if (arr.length === 1) return (arr[0].length > 50 ? arr[0].slice(0, 50) + '...' : arr[0]);
              return `Update Type (${arr.length})`;
            }}
          >
            {(filterOptions.updateTypes || []).map((t) => (
              <MenuItem key={t} value={t}>
                <Checkbox checked={(filters.updateType || []).indexOf(t) > -1} size="small" sx={{ mr: 1 }} />
                {t.length > 50 ? t.slice(0, 50) + '...' : t}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.includingData}
            onChange={(e) => setFilters((prev) => ({ ...prev, includingData: e.target.value }))}
            sx={{ minWidth: 180, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Including Data';
              if (arr.length === 1) return arr[0];
              return `Including Data (${arr.length})`;
            }}
          >
            {availableIncludingDataOptions.map((name) => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={(filters.includingData || []).indexOf(name) > -1} size="small" sx={{ mr: 1 }} />
                {name}
              </MenuItem>
            ))}
          </Select>
          <DatePicker
            label="From"
            value={filters.dateFrom}
            onChange={(v) => setFilters((prev) => ({ ...prev, dateFrom: v }))}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } } } }}
          />
          <DatePicker
            label="To"
            value={filters.dateTo}
            onChange={(v) => setFilters((prev) => ({ ...prev, dateTo: v }))}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } } } }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              const fo = filterOptions;
              setFilters({
                freeText: '',
                source: [],
                updateType: [],
                includingData: [],
                dateFrom: fo?.dateFrom ? dayjs(fo.dateFrom) : null,
                dateTo: fo?.dateTo ? dayjs(fo.dateTo) : null,
              });
              setPagination((p) => ({ ...p, page: 0 }));
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      <Paper>
        {updates.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No updates found for this game. Import data via <code>npm run import-game-updates</code>.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ height: 640, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 600 } }}>
                  <TableCell>#</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'created'}
                      direction={sort.by === 'created' ? sort.dir : 'asc'}
                      onClick={() => handleSort('created')}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'handled'}
                      direction={sort.by === 'handled' ? sort.dir : 'asc'}
                      onClick={() => handleSort('handled')}
                    >
                      Handled
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'status'}
                      direction={sort.by === 'status' ? sort.dir : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'startTime'}
                      direction={sort.by === 'startTime' ? sort.dir : 'asc'}
                      onClick={() => handleSort('startTime')}
                    >
                      StartTime
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                    <TableSortLabel
                      active={sort.by === 'gameTime'}
                      direction={sort.by === 'gameTime' ? sort.dir : 'asc'}
                      onClick={() => handleSort('gameTime')}
                    >
                      Game Time
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'score'}
                      direction={sort.by === 'score' ? sort.dir : 'asc'}
                      onClick={() => handleSort('score')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'source'}
                      direction={sort.by === 'source' ? sort.dir : 'asc'}
                      onClick={() => handleSort('source')}
                    >
                      Source
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.by === 'sequence'}
                      direction={sort.by === 'sequence' ? sort.dir : 'asc'}
                      onClick={() => handleSort('sequence')}
                    >
                      Sequence
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Has Exception</TableCell>
                  <TableCell align="center">Has Trace</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUpdates.map((u, idx) => {
                  const globalIdx = pagination.page * pagination.rowsPerPage + idx;
                  return (
                  <React.Fragment key={u.ID ?? globalIdx}>
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: expandedId === (u.ID ?? globalIdx) ? 'action.hover' : 'inherit',
                      }}
                      onClick={() => setExpandedId(expandedId === (u.ID ?? globalIdx) ? null : (u.ID ?? globalIdx))}
                    >
                      <TableCell>{globalIdx + 1}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(u.CREATED)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(u.HANDLED)}
                        {u.HANDLED && u.CREATED && (() => {
                          const c = new Date(u.CREATED);
                          const h = new Date(u.HANDLED);
                          const gapMs = isNaN(c.getTime()) || isNaN(h.getTime()) ? 0 : Math.abs(h.getTime() - c.getTime());
                          const isOver5Sec = gapMs > 5000;
                          return (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 0.5, color: isOver5Sec ? 'error.main' : 'text.secondary' }}
                            >
                              ({formatGap(u.CREATED, u.HANDLED)})
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const label = getStatusFromUpdateText(u.UPDATE_TEXT) ?? GAME_STATUS_LABELS[u.GAME_STATUS] ?? (u.GAME_STATUS != null ? `Status ${u.GAME_STATUS}` : '-');
                          if (label === '-1') return '';
                          return (
                            <Chip
                              label={label}
                              size="small"
                              color={u.GAME_STATUS === 3 ? 'success' : 'default'}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {u.GAME_STARTTIME ? formatDateTime(u.GAME_STARTTIME) : '-'}
                      </TableCell>
                      <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const v = u.GAME_TIME;
                          if (v == null) return '-';
                          const s = String(v);
                          return s === '-1--1' || s === '-1' ? '' : v;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const score = u.COMPETITOR_1_CURR_SCORE != null && u.COMPETITOR_2_CURR_SCORE != null
                            ? `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`
                            : null;
                          return score === '-1--1' ? '' : (score ?? '-');
                        })()}
                      </TableCell>
                      <TableCell>{(filterOptions.sourceNames || {})[u.DATA_SOURCE_ID] ?? u.DATA_SOURCE_ID ?? '-'}</TableCell>
                      <TableCell>
                          {(() => {
                            const v = u.CREATED_SEQUENCE;
                            if (v == null) return '-';
                            const s = String(v);
                            return s === '-1--1' || s === '-1' ? '' : v;
                          })()}
                        </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={!!(u.EXCEPTION_TEXT && String(u.EXCEPTION_TEXT).trim())}
                          disabled
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={!!(u.TRACE && String(u.TRACE).trim())}
                          disabled
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    {expandedId === (u.ID ?? globalIdx) && (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ p: 2, borderBottom: '1px solid #eee', bgcolor: '#fafafa', verticalAlign: 'top' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">UPDATE_TEXT (raw)</Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(u.UPDATE_TEXT || '');
                              }}
                              title="Copy to clipboard"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box
                            component="pre"
                            sx={{
                              maxHeight: 400,
                              overflow: 'auto',
                              fontSize: 12,
                              fontFamily: 'monospace',
                              bgcolor: '#1e1e1e',
                              color: '#d4d4d4',
                              p: 2,
                              borderRadius: 1,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {u.UPDATE_TEXT || '(empty)'}
                          </Box>
                          {u.TRACE && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                TRACE:
                              </Typography>
                              <Box
                                component="pre"
                                sx={{
                                  maxHeight: 200,
                                  overflow: 'auto',
                                  fontSize: 11,
                                  bgcolor: '#f5f5f5',
                                  p: 1,
                                  borderRadius: 1,
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {u.TRACE}
                              </Box>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {updates.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: '#fafafa',
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {sortedUpdates.length} total{appliedFilters?.includingData?.length ? ` (filtered from ${updates.length})` : ''} • Showing {pagination.page * pagination.rowsPerPage + 1}–
              {Math.min((pagination.page + 1) * pagination.rowsPerPage, sortedUpdates.length)} of {sortedUpdates.length}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                Rows per page:
              </Typography>
              <Select
                size="small"
                value={pagination.rowsPerPage}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    rowsPerPage: Number(e.target.value),
                    page: 0,
                  }))
                }
                sx={{ minWidth: 70, height: 32 }}
              >
                <MenuItem value={15}>15</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  disabled={pagination.page === 0}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(0, prev.page - 1) }))
                  }
                >
                  ←
                </IconButton>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', minWidth: 80, textAlign: 'center' }}>
                  Page {pagination.page + 1} of {Math.ceil(sortedUpdates.length / pagination.rowsPerPage) || 1}
                </Typography>
                <IconButton
                  size="small"
                  disabled={
                    (pagination.page + 1) * pagination.rowsPerPage >= sortedUpdates.length
                  }
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  →
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
