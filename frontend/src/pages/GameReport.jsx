import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BugReportIcon from '@mui/icons-material/BugReport';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import api from '../services/api';
import useUrlFilters from '../hooks/useUrlFilters';

dayjs.extend(utc);
import LoadingSpinner from '../../reuse/LoadingSpinner';

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

const TAB_SLUGS = ['score-log', 'status-log', 'events-log', 'game-time-log', 'full-report', 'notifications-log', 'bets-log'];

export default function GameReport() {
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const activeTab = Math.max(0, TAB_SLUGS.indexOf(tab || TAB_SLUGS[0]));
  const [game, setGame] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [scoreLog, setScoreLog] = useState([]);
  const [statusLog, setStatusLog] = useState([]);
  const [eventsLog, setEventsLog] = useState([]);
  const [eventsLogMaps, setEventsLogMaps] = useState({ eventTypeNames: {}, dataSourceNames: {}, gameEventsMap: {}, sequenceMap: {} });
  const [notificationsLog, setNotificationsLog] = useState([]);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [seqDialog, setSeqDialog] = useState({ open: false, sequence: null, loading: false, data: null });
  const [urlState, setUrlState] = useUrlFilters({
    freeText: { type: 'string', default: '' },
    source: { type: 'json', default: [] },
    updateType: { type: 'json', default: [] },
    includingData: { type: 'array', default: [] },
    status: { type: 'json', default: [] },
    score: { type: 'array', default: [] },
    handlingDelay: { type: 'boolean', default: false },
    hasSequence: { type: 'boolean', default: false },
    hasException: { type: 'boolean', default: false },
    hasTrace: { type: 'boolean', default: false },
    dateFrom: { type: 'string', default: '' },
    dateTo: { type: 'string', default: '' },
    page: { type: 'number', default: 0 },
    rowsPerPage: { type: 'number', default: 15 },
    sortBy: { type: 'string', default: 'handled' },
    sortDir: { type: 'string', default: 'desc' },
  });
  const filters = {
    freeText: urlState.freeText,
    source: urlState.source,
    updateType: urlState.updateType,
    includingData: urlState.includingData,
    status: urlState.status,
    score: urlState.score,
    handlingDelay: urlState.handlingDelay,
    hasSequence: urlState.hasSequence,
    hasException: urlState.hasException,
    hasTrace: urlState.hasTrace,
    dateFrom: urlState.dateFrom ? dayjs(urlState.dateFrom) : null,
    dateTo: urlState.dateTo ? dayjs(urlState.dateTo) : null,
  };
  const pagination = { page: urlState.page, rowsPerPage: urlState.rowsPerPage };
  const sort = { by: urlState.sortBy, dir: urlState.sortDir };
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ sources: [], updateTypes: [], sourceNames: {} });
  const [gameStatusesMap, setGameStatusesMap] = useState({});
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
        const [sports, competition, competitors, gameStatuses] = await Promise.all([
          api.getSports().catch(() => []),
          game.COMPETITION_ID ? api.getCompetitionById(game.COMPETITION_ID).catch(() => null) : Promise.resolve(null),
          api.getCompetitors().catch(() => []),
          api.getGameStatuses().catch(() => []),
        ]);
        if (!cancelled) {
          const statusMap = {};
          for (const s of gameStatuses) {
            statusMap[`${s.STAGE_ID}-${s.SPORT_TYPE_ID}`] = s.ALIAS_NAME;
          }
          setGameStatusesMap(statusMap);
        }
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

  const loadVersionRef = React.useRef(0);

  const loadUpdates = React.useCallback(async (appliedFilters) => {
    if (!id) return;
    const version = ++loadVersionRef.current;
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
      if (version !== loadVersionRef.current) return;
      setUpdates(Array.isArray(data) ? data : []);
      setFilterOptions(opts || { sources: [], updateTypes: [], sourceNames: {} });
    } catch (err) {
      if (version !== loadVersionRef.current) return;
      setError(err?.message || 'Failed to load report');
      setUpdates([]);
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
    }
  }, [id]);

  const loadTabData = React.useCallback(async (tabIndex) => {
    if (!id) return;
    try {
      switch (tabIndex) {
        case 0: {
          const data = await api.getGameScoreLog(id);
          setScoreLog(Array.isArray(data) ? data : []);
          break;
        }
        case 1: {
          const data = await api.getGameStatusLog(id);
          setStatusLog(Array.isArray(data) ? data : []);
          break;
        }
        case 2: {
          const { data, eventTypeNames, dataSourceNames, gameEventsMap, sequenceMap } = await api.getGameEventsLog(id);
          setEventsLog(Array.isArray(data) ? data : []);
          setEventsLogMaps({ eventTypeNames: eventTypeNames || {}, dataSourceNames: dataSourceNames || {}, gameEventsMap: gameEventsMap || {}, sequenceMap: sequenceMap || {} });
          break;
        }
        case 4: {
          const { data, filterOptions: opts } = await api.getGameUpdates(id);
          setUpdates(Array.isArray(data) ? data : []);
          const fo = opts || { sources: [], updateTypes: [], sourceNames: {} };
          setFilterOptions(fo);
          setUrlState({
            dateFrom: fo.dateFrom ? dayjs(fo.dateFrom).format('YYYY-MM-DD') : '',
            dateTo: fo.dateTo ? dayjs(fo.dateTo).format('YYYY-MM-DD') : '',
          });
          break;
        }
        case 5: {
          const data = await api.getGameNotificationsLog(id);
          setNotificationsLog(Array.isArray(data) ? data : []);
          break;
        }
        default:
          break;
      }
    } catch {
      // tab data load failure is non-fatal
    }
    setLoadedTabs((prev) => new Set(prev).add(tabIndex));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const version = ++loadVersionRef.current;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const gameData = await api.getGameById(id).catch(() => null);
        if (cancelled || version !== loadVersionRef.current) return;
        setGame(gameData);
        await loadTabData(activeTab);
      } catch (err) {
        if (cancelled || version !== loadVersionRef.current) return;
        setError(err?.message || 'Failed to load report');
      } finally {
        if (!cancelled && version === loadVersionRef.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !game) return;
    if (loadedTabs.has(activeTab)) return;
    loadTabData(activeTab);
  }, [activeTab, id, game, loadedTabs, loadTabData]);

  const handleSearch = () => {
    const next = { ...filters };
    setAppliedFilters(next);
    setUrlState({ page: 0 });
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

  const availableStatusOptions = useMemo(() => {
    if (!updates.length) return [];
    const sportId = game?.SPORTTYPE_ID ?? game?.SPORT_TYPE_ID;
    const seen = new Map();
    for (const u of updates) {
      const s = u.GAME_STATUS;
      if (s == null || s === -1 || s === 1 || seen.has(s)) continue;
      const label = gameStatusesMap[`${s}-${sportId}`] ?? String(s);
      seen.set(s, label);
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [updates, gameStatusesMap, game]);

  const availableScoreOptions = useMemo(() => {
    if (!updates.length) return [];
    const seen = new Set();
    const results = [];
    for (const u of updates) {
      if (u.COMPETITOR_1_CURR_SCORE == null || u.COMPETITOR_2_CURR_SCORE == null) continue;
      if (u.COMPETITOR_1_CURR_SCORE === -1 && u.COMPETITOR_2_CURR_SCORE === -1) continue;
      const score = `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`;
      if (seen.has(score)) continue;
      seen.add(score);
      results.push(score);
    }
    return results.sort((a, b) => a.localeCompare(b));
  }, [updates]);

  const filteredUpdates = useMemo(() => {
    const selectedIncluding = appliedFilters ? (appliedFilters.includingData || []) : [];
    const selectedStatus = appliedFilters ? (appliedFilters.status || []) : [];
    const selectedScore = appliedFilters ? (appliedFilters.score || []) : [];
    const hasIncluding = selectedIncluding.length > 0;
    const hasStatus = selectedStatus.length > 0;
    const hasScore = selectedScore.length > 0;
    const hasDelay = filters.handlingDelay === true;
    const filterSequence = filters.hasSequence === true;
    const filterException = filters.hasException === true;
    const filterTrace = filters.hasTrace === true;
    if (!hasIncluding && !hasStatus && !hasScore && !hasDelay && !filterSequence && !filterException && !filterTrace) return updates;
    return updates.filter((u) => {
      if (hasIncluding) {
        const text = u.UPDATE_TEXT || '';
        const match = selectedIncluding.some((name) => {
          const config = INCLUDING_DATA_FILTERS.find((c) => c.filterName === name);
          return config && matchIncludingDataFilter(text, config);
        });
        if (!match) return false;
      }
      if (hasStatus) {
        if (!selectedStatus.includes(u.GAME_STATUS)) return false;
      }
      if (hasScore) {
        if (u.COMPETITOR_1_CURR_SCORE == null || u.COMPETITOR_2_CURR_SCORE == null) return false;
        const score = `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`;
        if (!selectedScore.includes(score)) return false;
      }
      if (hasDelay) {
        if (!u.HANDLED || !u.CREATED) return false;
        const c = new Date(u.CREATED);
        const h = new Date(u.HANDLED);
        if (isNaN(c.getTime()) || isNaN(h.getTime())) return false;
        if (Math.abs(h.getTime() - c.getTime()) <= 5000) return false;
      }
      if (filterSequence) {
        const v = u.CREATED_SEQUENCE;
        if (v == null || Number(v) <= 0) return false;
      }
      if (filterException) {
        if (!u.EXCEPTION_TEXT || !String(u.EXCEPTION_TEXT).trim()) return false;
      }
      if (filterTrace) {
        if (!u.TRACE || !String(u.TRACE).trim()) return false;
      }
      return true;
    });
  }, [updates, appliedFilters, filters.handlingDelay, filters.hasSequence, filters.hasException, filters.hasTrace]);

  const getSortValue = (u, by) => {
    switch (by) {
      case 'created':
        return u.CREATED ? new Date(u.CREATED).getTime() : null;
      case 'handled':
        return u.HANDLED ? new Date(u.HANDLED).getTime() : null;
      case 'status': {
        if (u.GAME_STATUS == null || u.GAME_STATUS === -1 || u.GAME_STATUS === 1) return null;
        const sportId = game?.SPORTTYPE_ID ?? game?.SPORT_TYPE_ID;
        return gameStatusesMap[`${u.GAME_STATUS}-${sportId}`] ?? String(u.GAME_STATUS);
      }
      case 'startTime':
        return u.GAME_STARTTIME ? new Date(u.GAME_STARTTIME).getTime() : null;
      case 'gameTime':
        return typeof u.GAME_TIME === 'number' ? u.GAME_TIME : (u.GAME_TIME != null ? Number(u.GAME_TIME) : null);
      case 'score':
        return u.COMPETITOR_1_CURR_SCORE != null && u.COMPETITOR_2_CURR_SCORE != null
          ? `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`
          : null;
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
  }, [filteredUpdates, sort.by, sort.dir, filterOptions, gameStatusesMap, game]);

  const paginatedUpdates = useMemo(() => {
    const start = pagination.page * pagination.rowsPerPage;
    return sortedUpdates.slice(start, start + pagination.rowsPerPage);
  }, [sortedUpdates, pagination.page, pagination.rowsPerPage]);

  const { pivotedEvents, uniqueDataSources } = useMemo(() => {
    if (!eventsLog.length) return { pivotedEvents: [], uniqueDataSources: [] };
    const { eventTypeNames, dataSourceNames, gameEventsMap, sequenceMap } = eventsLogMaps;
    const dsSet = new Set();
    const groups = {};
    for (const row of eventsLog) {
      const key = `${row.EVENT_TYPE}-${row.EVENT_COMPETITOR_NUM}-${row.EVENT_NUM}`;
      dsSet.add(row.DATA_SOURCE);
      if (!groups[key]) {
        const ge = gameEventsMap[key] || {};
        const playerName = eventsLog
          .filter(r => `${r.EVENT_TYPE}-${r.EVENT_COMPETITOR_NUM}-${r.EVENT_NUM}` === key && r.LAST_PLAYER_NAME)
          .sort((a, b) => (b.LAST_PLAYER_NAME?.length || 0) - (a.LAST_PLAYER_NAME?.length || 0))[0]?.LAST_PLAYER_NAME || '';
        groups[key] = {
          key,
          eventType: row.EVENT_TYPE,
          competitorNum: row.EVENT_COMPETITOR_NUM,
          eventNum: row.EVENT_NUM,
          gameTime: ge.GAME_TIME,
          eventTypeName: eventTypeNames[row.EVENT_TYPE] ?? String(row.EVENT_TYPE),
          playerName,
          sources: {},
        };
      }
      const seqKey = `${row.DATA_SOURCE}-${row.UPDATE_TIME}`;
      groups[key].sources[row.DATA_SOURCE] = {
        updateTime: row.UPDATE_TIME,
        wasApplied: row.WAS_APPLIED,
        playerName: row.LAST_PLAYER_NAME,
        sequence: sequenceMap[seqKey] ?? null,
      };
    }
    const events = Object.values(groups).sort((a, b) => (a.gameTime ?? 999) - (b.gameTime ?? 999));
    for (const evt of events) {
      const times = Object.values(evt.sources)
        .map(s => s.updateTime ? new Date(s.updateTime.replace(/(\d{2})\/(\d{2})\/(\d{2})/, '20$3-$2-$1')).getTime() : Infinity)
        .filter(t => isFinite(t));
      const earliest = times.length ? Math.min(...times) : null;
      let rank = 1;
      const ranked = Object.entries(evt.sources)
        .map(([dsId, s]) => {
          const t = s.updateTime ? new Date(s.updateTime.replace(/(\d{2})\/(\d{2})\/(\d{2})/, '20$3-$2-$1')).getTime() : Infinity;
          return { dsId, t, ...s };
        })
        .sort((a, b) => a.t - b.t);
      for (const item of ranked) {
        const gapMs = earliest && isFinite(item.t) ? item.t - earliest : 0;
        const gapSec = Math.floor(gapMs / 1000);
        const mm = String(Math.floor(gapSec / 3600)).padStart(2, '0');
        const ss = String(Math.floor((gapSec % 3600) / 60)).padStart(2, '0');
        const sss = String(gapSec % 60).padStart(2, '0');
        evt.sources[item.dsId].gap = gapMs > 0 ? `(${mm}:${ss}:${sss})` : '';
        evt.sources[item.dsId].rank = isFinite(item.t) ? rank++ : null;
        evt.sources[item.dsId].parsedTime = isFinite(item.t) ? item.t : null;
      }
    }
    const dsArr = [...dsSet].sort((a, b) => {
      const na = dataSourceNames[a] ?? String(a);
      const nb = dataSourceNames[b] ?? String(b);
      return na.localeCompare(nb);
    });
    return { pivotedEvents: events, uniqueDataSources: dsArr };
  }, [eventsLog, eventsLogMaps]);

  const handleSort = (by) => {
    setUrlState((prev) => ({
      sortBy: by,
      sortDir: prev.sortBy === by && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 0,
    }));
  };

  const openSequenceDialog = async (sequence) => {
    setSeqDialog({ open: true, sequence, loading: true, data: null });
    try {
      const data = await api.getSequenceDetails(sequence);
      setSeqDialog((prev) => ({ ...prev, loading: false, data }));
    } catch {
      setSeqDialog((prev) => ({ ...prev, loading: false, data: { sequence, items: [] } }));
    }
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
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {game.STATUS != null && game.STATUS !== -1 && game.STATUS !== 1
                  ? (gameStatusesMap[`${game.STATUS}-${game.SPORTTYPE_ID ?? game.SPORT_TYPE_ID}`] ?? game.STATUS)
                  : '-'}
              </Typography>
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

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => navigate(`/games/${id}/report/${TAB_SLUGS[v]}`, { replace: true })}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label="Score Log" />
          <Tab label="Status Log" />
          <Tab label="Events Log" />
          <Tab label="Game Time Log" />
          <Tab label="Full Report" />
          <Tab label="Notifications Log" />
          <Tab label="Bets Log" />
        </Tabs>
      </Paper>

      {/* Tab 0: Score Log */}
      {activeTab === 0 && (
        <Paper>
          {scoreLog.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No score log data found for this game.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 640, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 600 } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Stage Num</TableCell>
                    <TableCell>Score Seq</TableCell>
                    <TableCell>Data Source</TableCell>
                    <TableCell>Update Time</TableCell>
                    <TableCell>Update Status</TableCell>
                    <TableCell>Create Time</TableCell>
                    <TableCell align="center">Created Score</TableCell>
                    <TableCell align="center">Canceled Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scoreLog.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{row.STAGE_NUM ?? '-'}</TableCell>
                      <TableCell>{row.SCORE_SEQ ?? '-'}</TableCell>
                      <TableCell>{(filterOptions.sourceNames || {})[row.DATA_SOURCE] ?? row.DATA_SOURCE ?? '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.UPDATE_TIME ?? '-'}</TableCell>
                      <TableCell>{row.UPDATE_STATUS ?? '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.CREATE_TIME ?? '-'}</TableCell>
                      <TableCell align="center"><Checkbox checked={!!row.CREATED_SCORE} disabled size="small" /></TableCell>
                      <TableCell align="center"><Checkbox checked={!!row.CANCELED_SCORE} disabled size="small" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 1: Status Log */}
      {activeTab === 1 && (
        <Paper>
          {statusLog.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No status log data found for this game.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 640, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 600 } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Status Seq</TableCell>
                    <TableCell>Data Source</TableCell>
                    <TableCell>Update Time</TableCell>
                    <TableCell>Update Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusLog.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{row.STATUS_SEQ ?? '-'}</TableCell>
                      <TableCell>{(filterOptions.sourceNames || {})[row.DATA_SOURCE] ?? row.DATA_SOURCE ?? '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.UPDATE_TIME ?? '-'}</TableCell>
                      <TableCell>{row.UPDATE_STATUS ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 2: Events Log */}
      {activeTab === 2 && (
        <Paper>
          {pivotedEvents.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No events log data found for this game.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 640, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 600 } }}>
                    <TableCell sx={{ minWidth: 220, position: 'sticky', left: 0, zIndex: 3, bgcolor: '#fafafa' }}>Event</TableCell>
                    {uniqueDataSources.map((dsId) => (
                      <TableCell key={dsId} align="center" sx={{ whiteSpace: 'nowrap', minWidth: 160 }}>
                        {eventsLogMaps.dataSourceNames[dsId] ?? dsId}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pivotedEvents.map((evt) => {
                    const competitorName = evt.competitorNum === 1
                      ? (gameEnrichment.competitor1Name ?? `Competitor ${evt.competitorNum}`)
                      : evt.competitorNum === 2
                        ? (gameEnrichment.competitor2Name ?? `Competitor ${evt.competitorNum}`)
                        : `Competitor ${evt.competitorNum ?? '?'}`;
                    return (
                      <TableRow key={evt.key} hover>
                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'white', zIndex: 1, borderRight: '1px solid #e0e0e0' }}>
                          {evt.playerName && (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Player: <span style={{ color: '#1976d2' }}>{evt.playerName}</span>
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            Team: <span style={{ color: '#1976d2' }}>{competitorName}</span>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Type: {evt.eventTypeName}
                            {evt.gameTime != null && evt.gameTime !== -1 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: 4, color: '#666' }}>
                                {evt.gameTime}' <WatchLaterIcon sx={{ fontSize: 14 }} />
                              </span>
                            )}
                          </Typography>
                        </TableCell>
                        {uniqueDataSources.map((dsId) => {
                          const src = evt.sources[dsId];
                          if (!src) return <TableCell key={dsId} />;
                          return (
                            <TableCell key={dsId} align="center" sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {src.updateTime ?? '-'}
                              </Typography>
                              {src.gap && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {src.gap}
                                </Typography>
                              )}
                              {src.rank != null && (
                                <Chip
                                  label={src.rank}
                                  size="small"
                                  color={src.wasApplied ? 'primary' : 'default'}
                                  clickable={!!(src.wasApplied && src.sequence)}
                                  onClick={src.wasApplied && src.sequence ? (e) => { e.stopPropagation(); openSequenceDialog(src.sequence); } : undefined}
                                  sx={{
                                    mt: 0.5, minWidth: 24, height: 22, fontWeight: 700, fontSize: '0.75rem',
                                    ...(src.wasApplied && src.sequence ? { cursor: 'pointer', textDecoration: 'underline' } : {}),
                                  }}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 3: Game Time Log */}
      {activeTab === 3 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Game Time Log - Coming soon</Typography>
        </Paper>
      )}

      {/* Tab 4: Full Report */}
      {activeTab === 4 && (<>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, justifyContent: 'flex-start' }}>
          <TextField
            size="small"
            placeholder="Free Text Search (min 3 chars)"
            value={filters.freeText}
            onChange={(e) => setUrlState({ freeText: e.target.value })}
            sx={{ minWidth: 245, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
          />
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.source}
            onChange={(e) => setUrlState({ source: e.target.value })}
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
            onChange={(e) => setUrlState({ updateType: e.target.value })}
            sx={{ minWidth: 220, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Update Type';
              const types = filterOptions.updateTypes || [];
              if (arr.length === 1) {
                const match = types.find((t) => t.id === arr[0]);
                const label = match ? match.name : String(arr[0]);
                return label.length > 50 ? label.slice(0, 50) + '...' : label;
              }
              return `Update Type (${arr.length})`;
            }}
          >
            {(filterOptions.updateTypes || []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Checkbox checked={(filters.updateType || []).indexOf(t.id) > -1} size="small" sx={{ mr: 1 }} />
                {t.name.length > 50 ? t.name.slice(0, 50) + '...' : t.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.includingData}
            onChange={(e) => setUrlState({ includingData: e.target.value })}
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
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.status}
            onChange={(e) => setUrlState({ status: e.target.value })}
            sx={{ minWidth: 160, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Status';
              if (arr.length === 1) {
                const opt = availableStatusOptions.find((o) => o.value === arr[0]);
                return opt ? opt.label : arr[0];
              }
              return `Status (${arr.length})`;
            }}
          >
            {availableStatusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Checkbox checked={(filters.status || []).indexOf(opt.value) > -1} size="small" sx={{ mr: 1 }} />
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            multiple
            displayEmpty
            value={filters.score}
            onChange={(e) => setUrlState({ score: e.target.value })}
            sx={{ minWidth: 140, bgcolor: '#fff' }}
            renderValue={(v) => {
              const arr = Array.isArray(v) ? v : [];
              if (arr.length === 0) return 'Score';
              if (arr.length === 1) return arr[0];
              return `Score (${arr.length})`;
            }}
          >
            {availableScoreOptions.map((s) => (
              <MenuItem key={s} value={s}>
                <Checkbox checked={(filters.score || []).indexOf(s) > -1} size="small" sx={{ mr: 1 }} />
                {s}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant={filters.handlingDelay ? 'contained' : 'outlined'}
            color={filters.handlingDelay ? 'error' : 'inherit'}
            startIcon={<WatchLaterIcon />}
            onClick={() => setUrlState(prev => ({ handlingDelay: !prev.handlingDelay, page: 0 }))}
            sx={{ minWidth: 160, textTransform: 'none' }}
          >
            Handling Delay
          </Button>
          <Button
            variant={filters.hasSequence ? 'contained' : 'outlined'}
            color={filters.hasSequence ? 'primary' : 'inherit'}
            onClick={() => setUrlState(prev => ({ hasSequence: !prev.hasSequence, page: 0 }))}
            sx={{ textTransform: 'none' }}
          >
            Updates Only
          </Button>
          <Button
            variant={filters.hasException ? 'contained' : 'outlined'}
            color={filters.hasException ? 'warning' : 'inherit'}
            onClick={() => setUrlState(prev => ({ hasException: !prev.hasException, page: 0 }))}
            sx={{ textTransform: 'none' }}
          >
            Has Exception
          </Button>
          <Button
            variant={filters.hasTrace ? 'contained' : 'outlined'}
            color={filters.hasTrace ? 'info' : 'inherit'}
            onClick={() => setUrlState(prev => ({ hasTrace: !prev.hasTrace, page: 0 }))}
            sx={{ textTransform: 'none' }}
          >
            Has Trace
          </Button>
          <DatePicker
            label="From"
            value={filters.dateFrom}
            onChange={(v) => setUrlState({ dateFrom: v ? v.format('YYYY-MM-DD') : '' })}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } } } }}
          />
          <DatePicker
            label="To"
            value={filters.dateTo}
            onChange={(v) => setUrlState({ dateTo: v ? v.format('YYYY-MM-DD') : '' })}
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
              setUrlState({
                freeText: '',
                source: [],
                updateType: [],
                includingData: [],
                status: [],
                score: [],
                handlingDelay: false,
                hasSequence: false,
                hasException: false,
                hasTrace: false,
                dateFrom: fo?.dateFrom ? dayjs(fo.dateFrom).format('YYYY-MM-DD') : '',
                dateTo: fo?.dateTo ? dayjs(fo.dateTo).format('YYYY-MM-DD') : '',
                page: 0,
              });
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
                          if (gapMs === 0) return null;
                          const isOver5Sec = gapMs > 5000;
                          return (
                            <Tooltip title={formatGap(u.CREATED, u.HANDLED)} arrow>
                              <WatchLaterIcon
                                sx={{
                                  ml: 0.5,
                                  fontSize: 16,
                                  verticalAlign: 'middle',
                                  color: isOver5Sec ? 'error.main' : 'text.secondary',
                                }}
                              />
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {u.GAME_STATUS != null && u.GAME_STATUS !== -1 && u.GAME_STATUS !== 1
                          ? (gameStatusesMap[`${u.GAME_STATUS}-${game?.SPORTTYPE_ID ?? game?.SPORT_TYPE_ID}`] ?? u.GAME_STATUS)
                          : ''}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {u.GAME_STARTTIME ? formatDateTime(u.GAME_STARTTIME) : '-'}
                      </TableCell>
                      <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>{u.GAME_TIME != null && u.GAME_TIME !== -1 ? u.GAME_TIME : ''}</TableCell>
                      <TableCell>
                        {u.COMPETITOR_1_CURR_SCORE != null && u.COMPETITOR_2_CURR_SCORE != null
                          && u.COMPETITOR_1_CURR_SCORE !== -1 && u.COMPETITOR_2_CURR_SCORE !== -1
                          ? `${u.COMPETITOR_1_CURR_SCORE}-${u.COMPETITOR_2_CURR_SCORE}`
                          : ''}
                      </TableCell>
                      <TableCell>{(filterOptions.sourceNames || {})[u.DATA_SOURCE_ID] ?? u.DATA_SOURCE_ID ?? '-'}</TableCell>
                      <TableCell>
                          {(() => {
                            const v = u.CREATED_SEQUENCE;
                            if (v == null) return '-';
                            if (Number(v) <= 0) return '';
                            return (
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: 'primary.dark' } }}
                                onClick={(e) => { e.stopPropagation(); openSequenceDialog(v); }}
                              >
                                {v}
                              </Typography>
                            );
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
                onChange={(e) => setUrlState({ rowsPerPage: Number(e.target.value), page: 0 })}
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
                  onClick={() => setUrlState(prev => ({ page: Math.max(0, prev.page - 1) }))}
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
                  onClick={() => setUrlState(prev => ({ page: prev.page + 1 }))}
                >
                  →
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
      </>)}

      {/* Tab 5: Notifications Log */}
      {activeTab === 5 && (
        <Paper>
          {notificationsLog.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No notifications found for this game.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 640, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 600 } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Create Time</TableCell>
                    <TableCell>Notification Update Name</TableCell>
                    <TableCell>Is Replacement</TableCell>
                    <TableCell>Notification ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notificationsLog.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.CREATE_TIME)}</TableCell>
                      <TableCell>{row.UPDATE_NAME ?? '-'}</TableCell>
                      <TableCell>{row.IS_REPLACEMENT === true ? 'true' : row.IS_REPLACEMENT === false ? 'false' : String(row.IS_REPLACEMENT ?? '-')}</TableCell>
                      <TableCell>{row.NOTIFICATION_ID ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 6: Bets Log */}
      {activeTab === 6 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Bets Log - Coming soon</Typography>
        </Paper>
      )}

      <Dialog
        open={seqDialog.open}
        onClose={() => setSeqDialog({ open: false, sequence: null, loading: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="span">Sequence #{seqDialog.sequence}</Typography>
          <IconButton size="small" onClick={() => setSeqDialog({ open: false, sequence: null, loading: false, data: null })}>✕</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {seqDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !seqDialog.data?.items?.length ? (
            <Typography color="text.secondary">No details found for this sequence.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#fafafa' } }}>
                  <TableCell>Update ID</TableCell>
                  <TableCell>Update Type</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Parameters</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {seqDialog.data.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.updateId}</TableCell>
                    <TableCell>{item.updateTypeName || item.updateType}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.createTime || '-'}</TableCell>
                    <TableCell>
                      {item.params.length === 0
                        ? '-'
                        : item.params.map((p, pi) => (
                            <Chip
                              key={pi}
                              label={`${p.paramName || `P${p.paramNum}`}: ${p.value ?? ''}`}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
