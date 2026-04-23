import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUrlFilters from '../hooks/useUrlFilters';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import api from '../services/api';

// All fields under General Details (excludes SPORT_TYPE_ID and table settings). Split by BOOLEAN_KEYS for toggles vs inputs.
const GENERAL_DETAILS_ALL_KEYS = [
  'GAME_DURATION', 'RECOGNITION_TIME_SPAN', 'MATCH_REMINDER_TIME', 'MINIMUM_ATHLETES_IN_SQUAD', 'MINIMUM_ATHLETES_IN_LINEUPS',
  'IS_DISPLAYED', 'ALLOW_ATHLETE_SEARCH',
  'NUMBER_OF_STARTING_PLAYERS', 'NOTIFY_LINEUPS', 'REQUIRE_FORMATION',
  'SHOW_SCORE_BOARD', 'SHOW_MARKET_VALUE', 'SHOW_PLAYERS_STATISTICS',
  'SHOW_MISSING_PLAYERS_WIDGET', 'SHOW_ATHLETE_CARD_NEXT_GAME', 'SHOW_ATHLETE_CARD_PREDICTONS',
  'LMT_SHOW_AFTER_FINISHED',
  'SHOW_TOP_PERFORMERS_PRE_MATCH', 'SHOW_TOP_PERFORMERS_LIVE', 'SHOW_TOP_PERFORMERS_POST_MATCH',
  'IS_SUPPORT_TRENDS', 'SUPPORTS_COMPETITION_BET_LINES', 'IS_GAME_SUMMARY_ENABLE',
  'SUPPORTS_PROPS', 'IS_VISIBLE_FOR_ENTITIES_SEARCH',
];

// Table Settings: point config + checkboxes + ORDER_BY (parsed as list of { field, direction })
const TABLE_POINT_KEYS = [
  'TABLE_DEF_WINNER_POINTS', 'TABLE_DEF_DRAW_POINTS', 'TABLE_DEF_LOSER_POINTS',
  'TABLE_WIN_AFTER_EX_POINTS', 'TABLE_LOS_AFTER_EX_POINTS', 'TABLE_WIN_AFTER_PEN_POINTS', 'TABLE_LOS_AFTER_PEN_POINTS',
];
const TABLE_CHECKBOX_KEYS = ['TABLE_DEF_IS_EVEN_EXISTS', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE'];
const TABLE_SETTINGS_ALL_KEYS = [...TABLE_POINT_KEYS, ...TABLE_CHECKBOX_KEYS, 'ORDER_BY'];

// Keys to exclude from table order field options (meta fields from table_settings.json)
const TABLE_ORDER_EXCLUDE_KEYS = ['TABLE_SETTING_ID', 'ORDER_DIRECTION', 'INNER_TABLE'];

function formatTableSettingKeyAsLabel(key) {
  if (!key || typeof key !== 'string') return key;
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseOrderBy(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(',')
    .map((part) => {
      const [field, direction] = part.trim().split(':');
      return { field: (field || '').trim(), direction: (direction || 'desc').toLowerCase() };
    })
    .filter((o) => o.field);
}
/** Keep first occurrence of each field (no duplicate parameters). */
function deduplicateOrderByList(arr) {
  const seen = new Set();
  return arr.filter((o) => {
    if (seen.has(o.field)) return false;
    seen.add(o.field);
    return true;
  });
}
function serializeOrderBy(arr) {
  return arr.map((o) => `${o.field}:${o.direction || 'desc'}`).join(',');
}

const BOOLEAN_KEYS = new Set([
  'TABLE_DEF_IS_EVEN_EXISTS', 'IS_DISPLAYED', 'LMT_SHOW_AFTER_FINISHED', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE',
  'ALLOW_ATHLETE_SEARCH', 'SHOW_PLAYERS_STATISTICS', 'SHOW_TOP_PERFORMERS_PRE_MATCH', 'SHOW_TOP_PERFORMERS_LIVE', 'SHOW_TOP_PERFORMERS_POST_MATCH', 'NOTIFY_LINEUPS', 'REQUIRE_FORMATION',
  'IS_SUPPORT_TRENDS', 'ATHLETE_MIN_APPEARANCES_PERCENTAGE', 'SHOW_SCORE_BOARD', 'RANKING_TABLE_LAST_X_GAMES_AMOUNT',
  'SHOW_MISSING_PLAYERS_WIDGET', 'SHOW_ATHLETE_CARD_NEXT_GAME', 'SHOW_ATHLETE_CARD_PREDICTONS',
  'SUPPORTS_COMPETITION_BET_LINES', 'IS_GAME_SUMMARY_ENABLE', 'SUPPORTS_PROPS', 'IS_VISIBLE_FOR_ENTITIES_SEARCH', 'SHOW_MARKET_VALUE',
]);

// User-friendly labels for form fields
const FIELD_LABELS = {
  NAME_ID: 'Name (Term ID)',
  CURRENT_SCORE_STAGE: 'Current Score Stage',
  IMG_VER: 'Image Version',
  GAME_DURATION: 'Game Duration',
  RECOGNITION_TIME_SPAN: 'Recognition Time Span',
  MATCH_REMINDER_TIME: 'Match Reminder Time',
  MINIMUM_ATHLETES_IN_SQUAD: 'Minimum Athletes in Squad',
  MINIMUM_ATHLETES_IN_LINEUPS: 'Minimum Athletes in Lineups',
  IS_DISPLAYED: 'Displayed',
  ALLOW_ATHLETE_SEARCH: 'Allow Athlete Search',
  TABLE_DEF_WINNER_POINTS: 'Winner Points',
  TABLE_DEF_DRAW_POINTS: 'Draw Points',
  TABLE_DEF_LOSER_POINTS: 'Loser Points',
  TABLE_DEF_IS_EVEN_EXISTS: 'Draw (Even) Exists',
  TABLE_WIN_AFTER_EX_POINTS: 'Win After Extra Time (Points)',
  TABLE_LOS_AFTER_EX_POINTS: 'Loss After Extra Time (Points)',
  TABLE_WIN_AFTER_PEN_POINTS: 'Win After Penalties (Points)',
  TABLE_LOS_AFTER_PEN_POINTS: 'Loss After Penalties (Points)',
  TABLE_COUNT_ET_SCORE: 'Count Extra Time in Score',
  TABLE_COUNT_PEN_SCORE: 'Count Penalties in Score',
  ORDER_BY: 'Order By',
  NUMBER_OF_STARTING_PLAYERS: 'Number of Starting Players',
  NOTIFY_LINEUPS: 'Notify Lineups',
  REQUIRE_FORMATION: 'Require Formation',
  SHOW_SCORE_BOARD: 'Show Score Board',
  SHOW_CLOCK: 'Show Clock',
  SHOW_MARKET_VALUE: 'Show Market Value',
  SHOW_PLAYERS_STATISTICS: 'Show Players Statistics',
  SHOW_MISSING_PLAYERS_WIDGET: 'Show Missing Players Widget',
  SHOW_ATHLETE_CARD_NEXT_GAME: 'Show Athlete Card (Next Game)',
  SHOW_ATHLETE_CARD_PREDICTONS: 'Show Athlete Card (Predictions)',
  RANKING_TABLE_LAST_X_GAMES_AMOUNT: 'Ranking Table – Last X Games',
  MAX_POPULAR_COMPETITIONS: 'Max Popular Competitions',
  CLOCK_DIRECTION: 'Clock Direction',
  LMT_SHOW_BEFORE: 'Show Before (minutes)',
  LMT_SHOW_AFTER_FINISHED: 'Show After Finished',
  MATCH_WINNER_LINE_TYPE_ID: 'Match Winner Line Type ID',
  TOP_PERFORMERS_CATEGORY_TYPE: 'Top Performers Category Type',
  MIN_ROUND_TO_SHOW_PRE_GAME_TOP_PERFORMERS: 'Min Round for Pre-Game Top Performers',
  TIME_TO_SHOW_PRE_GAME_TOP_PERFORMERS: 'Time to Show Pre-Game Top Performers',
  SHOW_TOP_PERFORMERS_PRE_MATCH: 'Show Top Performers (Pre-Match)',
  SHOW_TOP_PERFORMERS_LIVE: 'Show Top Performers (Live)',
  SHOW_TOP_PERFORMERS_POST_MATCH: 'Show Top Performers (Post-Match)',
  IS_SUPPORT_TRENDS: 'Support Trends',
  SUPPORTS_COMPETITION_BET_LINES: 'Supports Competition Bet Lines',
  IS_GAME_SUMMARY_ENABLE: 'Game Summary Enabled',
  SUPPORTS_PROPS: 'Supports Props',
  IS_VISIBLE_FOR_ENTITIES_SEARCH: 'Visible for Entities Search',
  ROUND_NAME: 'Round Name',
  SERIES_ROUND_NAME: 'Series Round Name',
  ATHLETE_MIN_APPEARANCES_PERCENTAGE: 'Athlete Min Appearances %',
};

function SportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sport, setSport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [urlState, setUrlState] = useUrlFilters({
    tab: { type: 'number', default: 0 },
  });
  const activeTab = urlState.tab;
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [tableOrderByNewField, setTableOrderByNewField] = useState('');
  const [tableOrderByNewDirection, setTableOrderByNewDirection] = useState('desc');
  const [tableSettingsFieldOptions, setTableSettingsFieldOptions] = useState([]);
  const [dragOrderIndex, setDragOrderIndex] = useState(null);
  const [dragOverOrderIndex, setDragOverOrderIndex] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [sportImageError, setSportImageError] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');

  useEffect(() => {
    loadSport();
    loadTermsAndCategories();
    setSportImageError(false);
  }, [id]);

  useEffect(() => {
    const loadTableSettings = async () => {
      try {
        const data = await api.getTableSettings();
        const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (first && typeof first === 'object') {
          const keys = Object.keys(first).filter((k) => !TABLE_ORDER_EXCLUDE_KEYS.includes(k));
          setTableSettingsFieldOptions(
            keys.map((key) => ({ value: key, label: formatTableSettingKeyAsLabel(key) }))
          );
        }
      } catch (err) {
        console.warn('Failed to load table settings for order options:', err);
      }
    };
    loadTableSettings();
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

  useEffect(() => {
    if (sport) {
      setFormData({ ...sport });
    }
  }, [sport]);

  const loadSport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSportById(id);
      setSport(data);
    } catch (err) {
      setError(err.message || 'Failed to load sport');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/sports');

  const handleNameClick = async () => {
    if (!sport || !sport.NAME_ID) return;
    try {
      const term = await api.getTermById(sport.NAME_ID);
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
      await loadSport();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setError('Failed to save term');
    }
  };

  const handleTermSaveAndUpdate = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadSport();
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

  const handleOpenImageDialog = () => {
    setImageUrlValue(sport?.SPORT_IMAGE_URL || '');
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setImageUrlValue('');
  };

  const handleSaveImageUrl = async () => {
    if (!sport) return;
    try {
      setLoading(true);
      setError(null);
      setSportImageError(false);
      await api.updateSportsBulk([{ sportTypeId: sport.SPORT_TYPE_ID, changes: { SPORT_IMAGE_URL: imageUrlValue.trim() || null } }]);
      await loadSport();
      handleCloseImageDialog();
    } catch (err) {
      console.error('Failed to save image URL:', err);
      setError(err.message || 'Failed to save image URL');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const orderByList = deduplicateOrderByList(parseOrderBy(formData.ORDER_BY ?? sport?.ORDER_BY));
  const handleAddOrderByItem = () => {
    if (!tableOrderByNewField) return;
    if (orderByList.some((item) => item.field === tableOrderByNewField)) return; // no duplicate parameters
    const next = [...orderByList, { field: tableOrderByNewField, direction: tableOrderByNewDirection }];
    handleFormChange('ORDER_BY', serializeOrderBy(next));
    setTableOrderByNewField('');
  };
  const handleRemoveOrderByItem = (index) => {
    const next = orderByList.filter((_, i) => i !== index);
    handleFormChange('ORDER_BY', serializeOrderBy(next));
  };

  const handleOrderDragStart = (e, index) => {
    setDragOrderIndex(index);
    e.dataTransfer.setData('application/json', JSON.stringify({ index }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index)); // fallback for some browsers
  };
  const handleOrderDragEnd = () => {
    setDragOrderIndex(null);
    setDragOverOrderIndex(null);
  };
  const handleOrderDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOrderIndex(index);
  };
  const handleOrderDragLeave = () => setDragOverOrderIndex(null);
  const handleOrderDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOrderIndex(null);
    setDragOverOrderIndex(null);
    let dragIndex;
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) dragIndex = JSON.parse(data).index;
      else dragIndex = Number(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }
    if (dragIndex == null || dragIndex === dropIndex) return;
    const next = [...orderByList];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    handleFormChange('ORDER_BY', serializeOrderBy(next));
  };

  const buildChanges = (allowedKeys) => {
    const changes = {};
    allowedKeys.forEach((key) => {
      if (!(key in formData) && !(key in sport)) return;
      let value = formData[key] ?? sport[key];
      if (key === 'ORDER_BY' && value != null) {
        value = serializeOrderBy(deduplicateOrderByList(parseOrderBy(value)));
      }
      if (JSON.stringify(value) !== JSON.stringify(sport[key])) {
        changes[key] = value;
      }
    });
    return changes;
  };

  const hasGeneralDetailsChanges = useMemo(() => {
    if (!sport) return false;
    return Object.keys(buildChanges(GENERAL_DETAILS_ALL_KEYS)).length > 0;
  }, [formData, sport]);

  const hasTableSettingsChanges = useMemo(() => {
    if (!sport) return false;
    return Object.keys(buildChanges(TABLE_SETTINGS_ALL_KEYS)).length > 0;
  }, [formData, sport]);

  const handleSaveGeneralDetails = async () => {
    if (!sport) return;
    const changes = buildChanges(GENERAL_DETAILS_ALL_KEYS);
    if (Object.keys(changes).length === 0) return;
    try {
      setLoading(true);
      setError(null);
      await api.updateSportsBulk([{ sportTypeId: sport.SPORT_TYPE_ID, changes }]);
      await loadSport();
    } catch (err) {
      setError(err.message || 'Failed to save General Details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTableSettings = async () => {
    if (!sport) return;
    const changes = buildChanges(TABLE_SETTINGS_ALL_KEYS);
    if (Object.keys(changes).length === 0) return;
    try {
      setLoading(true);
      setError(null);
      await api.updateSportsBulk([{ sportTypeId: sport.SPORT_TYPE_ID, changes }]);
      await loadSport();
    } catch (err) {
      setError(err.message || 'Failed to save Table Settings');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (key, value) => {
    const isBoolean = BOOLEAN_KEYS.has(key);
    const isReadOnly = key === 'SPORT_TYPE_ID';

    const label = FIELD_LABELS[key] ?? key;
    if (isBoolean) {
      return (
        <FormControlLabel
          key={key}
          control={<Checkbox size="small" checked={!!value} onChange={(e) => handleFormChange(key, e.target.checked)} />}
          label={<Typography variant="body2">{label}</Typography>}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
        />
      );
    }

    const isNum = typeof value === 'number' || (value !== null && value !== undefined && value !== '' && !isNaN(Number(value)));
    return (
      <TextField
        key={key}
        fullWidth
        size="small"
        label={label}
        value={value ?? ''}
        onChange={(e) => handleFormChange(key, isNum ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        disabled={isReadOnly}
        type={isNum ? 'number' : 'text'}
        sx={{
          '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' },
          '& .MuiInputLabel-root': { fontSize: '0.75rem' },
        }}
      />
    );
  };

  if (loading && !sport) {
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
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  if (!sport) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Sport not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  const availableKeys = GENERAL_DETAILS_ALL_KEYS.filter((k) => k in formData || k in sport);
  const fieldKeys = availableKeys.filter((k) => !BOOLEAN_KEYS.has(k));
  const toggleKeys = availableKeys.filter((k) => BOOLEAN_KEYS.has(k));

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      {/* Header - same style as AthleteDetails */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' },
          }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Sport –{' '}
          <Box
            component="span"
            onClick={sport.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: sport.NAME_ID ? '#1976d2' : 'inherit',
              cursor: sport.NAME_ID ? 'pointer' : 'default',
              textDecoration: sport.NAME_ID ? 'underline' : 'none',
              '&:hover': sport.NAME_ID ? { color: '#1565c0', textDecoration: 'underline' } : {},
            }}
          >
            {formData.ALIAS_NAME || sport.ALIAS_NAME || 'Sport Details'}
          </Box>
        </Typography>
      </Box>

      {/* General Details – Left Media | Middle: one column of fields (6 rows) | Right: Booleans */}
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
          <Button
            variant="contained"
            onClick={handleSaveGeneralDetails}
            disabled={!hasGeneralDetailsChanges}
            sx={{
              textTransform: 'none',
              backgroundColor: '#15803d',
              color: 'white',
              px: 3,
              py: 1,
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            Save & Update In Service
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {/* Left: Media (compact) – stretches to match tallest column */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 200px' }, minWidth: 0 }}>
            <Paper
              sx={{
                p: 1.25,
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Avatar
                  src={sport.SPORT_IMAGE_URL && !sportImageError ? sport.SPORT_IMAGE_URL : null}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: sport.SPORT_IMAGE_URL && !sportImageError ? 'transparent' : '#f5f5f5',
                    border: '1px solid #e0e0e0',
                  }}
                  onError={() => setSportImageError(true)}
                >
                  {(!sport.SPORT_IMAGE_URL || sportImageError) && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {(formData.ALIAS_NAME || sport.ALIAS_NAME || 'S').charAt(0)}
                    </Typography>
                  )}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  Sport Image
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={handleOpenImageDialog}
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Upload Image
              </Button>
              <Button variant="contained" fullWidth size="small" sx={{ backgroundColor: '#1976d2', textTransform: 'none', py: 0.5 }}>
                Image Version ({sport.IMG_VER ?? 1})
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields – single column (one field per row → 6 rows) */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 1 auto' }, minWidth: 0, maxWidth: { md: 320 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5, width: '100%' }}>
              {fieldKeys.map((key) => (
                <Box key={key} sx={{ minWidth: 0 }}>
                  {renderField(key, formData[key] ?? sport[key])}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right: Booleans – 4 per row, gap 0.5 */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '1 1 0' },
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 0.5,
              alignContent: 'start',
              alignItems: { xs: 'stretch', md: 'flex-start' },
            }}
          >
            {toggleKeys.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    size="small"
                    checked={!!(formData[key] ?? sport[key])}
                    onChange={(e) => handleFormChange(key, e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{FIELD_LABELS[key] ?? key}</Typography>}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Table Settings – sticky header, tabs with content below */}
      <Paper
        sx={{
          boxShadow: 1,
          border: '1px solid #e0e0e0',
          backgroundColor: 'white',
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            mb: 0,
            pb: 1,
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f5f5f5',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Extended Details
          </Typography>
          <Button
            variant="contained"
            onClick={handleSaveTableSettings}
            disabled={!hasTableSettingsChanges}
            sx={{
              textTransform: 'none',
              backgroundColor: '#15803d',
              color: 'white',
              px: 3,
              py: 1,
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            Save & Update In Service
          </Button>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setUrlState({ tab: newValue })}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
            '& .Mui-selected': { color: '#1976d2' },
          }}
        >
          <Tab label="Table Settings" />
        </Tabs>
        <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Left: Point configuration + Scoring rules – fields width = longest label */}
          <Grid item xs={12} md={6} sx={{ width: 'fit-content', maxWidth: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Point configuration</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 18ch)', columnGap: 2, rowGap: 3.5, mb: 2, width: 'fit-content' }}>
              {TABLE_POINT_KEYS.map((key) => (
                <TextField
                  key={key}
                  size="small"
                  label={FIELD_LABELS[key] ?? key}
                  type="number"
                  value={formData[key] ?? sport[key] ?? ''}
                  onChange={(e) => handleFormChange(key, e.target.value === '' ? null : Number(e.target.value))}
                  sx={{
                    width: '18ch',
                    maxWidth: '100%',
                    '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' },
                    '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                  }}
                />
              ))}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Scoring rules</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: 'fit-content' }}>
              {TABLE_CHECKBOX_KEYS.map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      size="small"
                      checked={!!(formData[key] ?? sport[key])}
                      onChange={(e) => handleFormChange(key, e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">{FIELD_LABELS[key] ?? key}</Typography>}
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                />
              ))}
            </Box>
          </Grid>

          {/* Right: Table order parameters */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Table order parameters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
              Current order (priority from top to bottom):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="table-order-field-label">Select field</InputLabel>
                <Select
                  labelId="table-order-field-label"
                  label="Select field"
                  value={tableOrderByNewField}
                  onChange={(e) => setTableOrderByNewField(e.target.value)}
                >
                  <MenuItem value="">Select field</MenuItem>
                  {tableSettingsFieldOptions.filter((o) => !orderByList.some((item) => item.field === o.value)).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="table-order-dir-label">Direction</InputLabel>
                <Select
                  labelId="table-order-dir-label"
                  label="Direction"
                  value={tableOrderByNewDirection}
                  onChange={(e) => setTableOrderByNewDirection(e.target.value)}
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                onClick={handleAddOrderByItem}
                disabled={!tableOrderByNewField || orderByList.some((item) => item.field === tableOrderByNewField)}
                sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}
              >
                Add
              </Button>
            </Box>
            <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, bgcolor: '#fafafa' }}>
              {orderByList.map((item, index) => (
                <ListItem
                  key={`${item.field}-${index}`}
                  data-index={index}
                  onDragOver={(e) => handleOrderDragOver(e, index)}
                  onDragLeave={handleOrderDragLeave}
                  onDrop={(e) => handleOrderDrop(e, index)}
                  sx={{
                    py: 0.5,
                    cursor: dragOrderIndex != null ? (dragOrderIndex === index ? 'grabbing' : 'default') : 'default',
                    transition: 'all 0.2s ease',
                    ...(dragOrderIndex === index && {
                      opacity: 0.9,
                      transform: 'scale(1.02)',
                      boxShadow: 2,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      zIndex: 1,
                    }),
                    ...(dragOverOrderIndex === index && dragOrderIndex !== index && {
                      borderTop: '2px solid',
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                      borderRadius: 0,
                    }),
                  }}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRemoveOrderByItem(index)} aria-label="Remove" sx={{ color: '#d32f2f' }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Box
                    component="span"
                    draggable
                    onDragStart={(e) => handleOrderDragStart(e, index)}
                    onDragEnd={handleOrderDragEnd}
                    sx={{ display: 'flex', alignItems: 'center', mr: 1, cursor: 'grab', color: 'action.active', '&:active': { cursor: 'grabbing' } }}
                    aria-label="Drag to reorder"
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Box>
                  <ListItemText
                    primary={`${index + 1}. ${tableSettingsFieldOptions.find((o) => o.value === item.field)?.label ?? item.field}`}
                    secondary={item.direction === 'desc' ? 'Descending' : 'Ascending'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              ))}
              {orderByList.length === 0 && (
                <ListItem>
                  <ListItemText primary="No order parameters defined" primaryTypographyProps={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>

        </Box>
      </Paper>

      {/* Image Edit Dialog */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Edit Image</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Image URL"
            type="url"
            fullWidth
            variant="outlined"
            value={imageUrlValue}
            onChange={(e) => setImageUrlValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            sx={{ mt: 1 }}
            helperText="Enter the URL of the sport logo/image"
          />
          {imageUrlValue && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Preview:</Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={imageUrlValue}
                  alt="Preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog} color="inherit">Cancel</Button>
          <Button onClick={handleSaveImageUrl} variant="contained" color="primary" disabled={loading}>Save</Button>
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

export default SportDetails;
