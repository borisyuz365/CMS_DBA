import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  FormControlLabel,
  Snackbar,
  Alert as MuiAlert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Checkbox,
  Avatar,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Switch,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import StarIcon from '@mui/icons-material/Star';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import api from '../services/api';

// Table Settings: own tab (to the right of Structure), same UI as SportDetails; data = competition (competitions.json)
const TABLE_POINT_KEYS = [
  'TABLE_WINNER_POINTS', 'TABLE_DRAW_POINTS', 'TABLE_LOSER_POINTS',
  'TABLE_WIN_AFTER_EX_POINTS', 'TABLE_LOS_AFTER_EX_POINTS', 'TABLE_WIN_AFTER_PEN_POINTS', 'TABLE_LOS_AFTER_PEN_POINTS',
];
const TABLE_CHECKBOX_KEYS = ['TABLE_IS_EVEN_EXISTS', 'TABLE_COUNT_ET_SCORE', 'TABLE_COUNT_PEN_SCORE'];
const TABLE_SETTINGS_ALL_KEYS = [...TABLE_POINT_KEYS, ...TABLE_CHECKBOX_KEYS, 'STANDING_TYPE', 'ORDER_BY'];

const TABLE_SETTINGS_LABELS = {
  TABLE_IS_EVEN_EXISTS: 'Support Draw',
  TABLE_COUNT_ET_SCORE: 'Count Extra Time Score',
  TABLE_COUNT_PEN_SCORE: 'Count Penalties Score',
};

const TABLE_ORDER_EXCLUDE_KEYS = ['TABLE_SETTING_ID', 'ORDER_DIRECTION', 'INNER_TABLE'];

const GENERAL_DETAILS_KEYS = [
  'COUNTRY_ID', 'SPORT_TYPE_ID', 'GENDER', 'COMPETITION_TYPE', 'FATHER_COMPETITION', 'CURRENT_ROUND',
  'SUB_SPORT_TYPE', 'COMPETITORS_TYPE', 'HOST_CITY', 'MAIN_COLOR', 'SECONDARY_COLOR',
  'COMPETITION_IMAGE_URL', 'TROPHY_IMAGE_URL', 'HIDE_ON_SEARCH', 'HIDE_ON_CATALOG', 'ENABLE_DASHBOARD_BUZZ',
  'SUPPORT_COMPETITION_DASHBOARD', 'HIDE_LMT',
];

function formatTableSettingKeyAsLabel(key) {
  if (!key || typeof key !== 'string') return key;
  return key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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

function CompetitionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [sports, setSports] = useState([]);
  const [genders, setGenders] = useState([]);
  const [competitionTypes, setCompetitionTypes] = useState([]);
  const [stagesTypes, setStagesTypes] = useState([]);
  const [standingTypes, setStandingTypes] = useState([]);
  const [subSportTypes, setSubSportTypes] = useState([]);
  const [competitorTypes, setCompetitorTypes] = useState([]);
  const [priorityLevels, setPriorityLevels] = useState([]);
  const [generalExpanded, setGeneralExpanded] = useState(false);
  const [statusesScoresExpanded, setStatusesScoresExpanded] = useState(false);
  const [lineupsExpanded, setLineupsExpanded] = useState(false);
  const [statisticsExpanded, setStatisticsExpanded] = useState(false);
  const [bettingExpanded, setBettingExpanded] = useState(false);
  const [buzzItemTypes, setBuzzItemTypes] = useState([]);
  const [surfaces, setSurfaces] = useState([]);
  const [allCompetitions, setAllCompetitions] = useState([]); // for resolving FATHER_COMPETITION name
  const [generalDetailsSeasons, setGeneralDetailsSeasons] = useState([]);
  const [generalDetailsStages, setGeneralDetailsStages] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0=Structure (default), 1=Configurations, 2=Tools & Screens, 3=Winners, 4=Table Settings
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Winners tab
  const [winnersData, setWinnersData] = useState([]);
  const [winnersOriginalData, setWinnersOriginalData] = useState([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [winnersEditingIdx, setWinnersEditingIdx] = useState(null);
  const [winnersEditForm, setWinnersEditForm] = useState({});
  const [winnersSeasonCompetitors, setWinnersSeasonCompetitors] = useState([]);
  const [winnersAllSeasons, setWinnersAllSeasons] = useState([]);
  const [winnersCoachError, setWinnersCoachError] = useState('');
  const [winnersCoachValidating, setWinnersCoachValidating] = useState(false);
  const [winnersDeleteConfirm, setWinnersDeleteConfirm] = useState(null);
  // Table Settings tab: ORDER_BY list + drag-and-drop
  const [tableOrderByNewField, setTableOrderByNewField] = useState('');
  const [tableOrderByNewDirection, setTableOrderByNewDirection] = useState('desc');
  const [tableSettingsFieldOptions, setTableSettingsFieldOptions] = useState([]);
  const [dragOrderIndex, setDragOrderIndex] = useState(null);
  const [dragOverOrderIndex, setDragOverOrderIndex] = useState(null);
  // Structure tab: seasons, stages per season, groups per stage, phases per season
  const [structureSeasons, setStructureSeasons] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [expandedSeasonNum, setExpandedSeasonNum] = useState(null);
  const [stagesBySeason, setStagesBySeason] = useState({});
  const [groupsByStage, setGroupsByStage] = useState({});
  const [phasesBySeason, setPhasesBySeason] = useState({});
  const [expandedStageKey, setExpandedStageKey] = useState(null); // "seasonNum-stageNum"
  const [phasesExpanded, setPhasesExpanded] = useState(false); // Phases section: collapsed by default
  // Structure tab: selected season (dropdown) and inline form for Season Details + Configuration
  const [selectedStructureSeasonNum, setSelectedStructureSeasonNum] = useState(null);
  const [structureSeasonForm, setStructureSeasonForm] = useState(null); // full season fields for editing; null when none selected
  const [structureSeasonSaving, setStructureSeasonSaving] = useState(false);
  // Stages section: selected stage and form for Stage Details + Configuration
  const [selectedStructureStageNum, setSelectedStructureStageNum] = useState(null);
  const [structureStageForm, setStructureStageForm] = useState(null); // full stage fields for editing; null when none selected
  const [structureStageSaving, setStructureStageSaving] = useState(false);
  const [generateStagesDialogOpen, setGenerateStagesDialogOpen] = useState(false);
  const [generateStagesImportSeasonNum, setGenerateStagesImportSeasonNum] = useState(null);
  const [generateStagesTypes, setGenerateStagesTypes] = useState({ leagueCycle: false, groupStage: false, bracketStage: false });
  const [newStageSetCurrent, setNewStageSetCurrent] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  // Stages table drag-and-drop visual state
  const [stagesDraggingStageNum, setStagesDraggingStageNum] = useState(null);
  const [stagesDropTargetIndex, setStagesDropTargetIndex] = useState(null);
  // Phases section (Structure tab): selected phase and form for Phase Details
  const [selectedStructurePhaseNum, setSelectedStructurePhaseNum] = useState(null);
  const [structurePhaseForm, setStructurePhaseForm] = useState(null);
  const [structurePhaseSaving, setStructurePhaseSaving] = useState(false);
  // Groups section (Structure tab): selected group and form for Group Details
  const [selectedStructureGroupNum, setSelectedStructureGroupNum] = useState(null);
  const [structureGroupForm, setStructureGroupForm] = useState(null);
  const [structureGroupSaving, setStructureGroupSaving] = useState(false);
  // Season add/edit modal (CREATE NEW → "New Season" dialog)
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [seasonModalMode, setSeasonModalMode] = useState('add'); // 'add' | 'edit'
  const [seasonEditTarget, setSeasonEditTarget] = useState(null);
  const [seasonForm, setSeasonForm] = useState({ SEASON_NUM: '', NAME_ID: null, START_DATE: '', END_DATE: '', HAS_TABLE: true, HAS_BRACKETS: false });
  const [seasonSaving, setSeasonSaving] = useState(false);
  // New Season dialog (CREATE NEW): Season Name → term under "Seasons Names", SEASON_NUM = max+1
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonLanguageId, setNewSeasonLanguageId] = useState(1);
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('');
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('');
  const [newSeasonSetCurrent, setNewSeasonSetCurrent] = useState(false);
  const [newSeasonBasedOnLast, setNewSeasonBasedOnLast] = useState(false);
  const [newSeasonRoundNameCheck, setNewSeasonRoundNameCheck] = useState(false);
  const [newSeasonRoundNameId, setNewSeasonRoundNameId] = useState(null);
  // Term modal: when editing season name we use category "Seasons Names" and reload structure on save
  const [termModalCategory, setTermModalCategory] = useState('Competitions Names');
  // Stage add/edit modal (context: which season we're adding to / editing in)
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageModalMode, setStageModalMode] = useState('add');
  const [stageFormContext, setStageFormContext] = useState(null); // { seasonNum }
  const [stageEditTarget, setStageEditTarget] = useState(null);
  const [stageForm, setStageForm] = useState({ STAGE_NUM: '', NAME_ID: null, STAGE_TYPE: 1, NUM_OF_GAMES: '', START_DATE: '', END_DATE: '', HAS_TABLE: true });
  const [stageSaving, setStageSaving] = useState(false);
  // Group add/edit modal (context: seasonNum, stageNum)
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState('add');
  const [groupFormContext, setGroupFormContext] = useState(null); // { seasonNum, stageNum }
  const [groupEditTarget, setGroupEditTarget] = useState(null);
  const [groupForm, setGroupForm] = useState({ GROUP_NUM: '', NAME_ID: null, TO_QUALIFY: '', HAS_TABLE: true, IS_SERIES: false, NUM_OF_GAMES: '' });
  const [groupSaving, setGroupSaving] = useState(false);
  // When opening term modal from a group name, store context to refresh groups on save
  const [termModalGroupContext, setTermModalGroupContext] = useState(null); // { seasonNum, stageNum }
  const [termModalPhaseContext, setTermModalPhaseContext] = useState(null); // { seasonNum }
  const [termModalParticipantContext, setTermModalParticipantContext] = useState(null); // { seasonNum, stageNum, groupNum }
  const [termModalDestinationContext, setTermModalDestinationContext] = useState(null); // opened from destination name
  const [destinationNameCreating, setDestinationNameCreating] = useState(null); // row idx when creating new term
  // Add participant dialog (name → create term under Participants Names, then participant)
  const [participantAddDialogOpen, setParticipantAddDialogOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [participantSelectedTermId, setParticipantSelectedTermId] = useState(null); // NAME_ID when selecting existing term
  const [participantAddContext, setParticipantAddContext] = useState(null); // { seasonNum, stageNum, groupNum }
  const [participantAddSaving, setParticipantAddSaving] = useState(false);
  // Phase add/edit modal (context: seasonNum)
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [phaseModalMode, setPhaseModalMode] = useState('add');
  const [phaseFormContext, setPhaseFormContext] = useState(null); // { seasonNum }
  const [phaseEditTarget, setPhaseEditTarget] = useState(null);
  const [phaseForm, setPhaseForm] = useState({ PHASE_NUM: '', PHASE_NAME_ID: null, PARENT_PHASE_NUM: '', SHOW_STATS: true, USE_NAME: false, OVERTIME_LENGTH: '', TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: '' });
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [phaseSaving, setPhaseSaving] = useState(false);
  // Competitors tab (2f, 2g)
  const [competitorsSeasonNum, setCompetitorsSeasonNum] = useState(null);
  const [competitorsInSeason, setCompetitorsInSeason] = useState([]);
  const [competitorsNotInSeason, setCompetitorsNotInSeason] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [selectedInSeason, setSelectedInSeason] = useState([]); // COMPETITOR_ID[]
  const [selectedNotInSeason, setSelectedNotInSeason] = useState([]);
  const [competitorsNotInSeasonFilters, setCompetitorsNotInSeasonFilters] = useState({ countryId: '', name: '', competitionId: '' });
  const [pageInSeason, setPageInSeason] = useState(0);
  const [rowsPerPageInSeason, setRowsPerPageInSeason] = useState(25);
  const [pageNotInSeason, setPageNotInSeason] = useState(0);
  const [rowsPerPageNotInSeason, setRowsPerPageNotInSeason] = useState(25);
  const [removeFromAllSeasonsDialogOpen, setRemoveFromAllSeasonsDialogOpen] = useState(false);
  // Competitors in Groups (2h): only one group expanded at a time
  const [competitorsStagesForGroups, setCompetitorsStagesForGroups] = useState([]);
  const [competitorsGroupsByStageForGroups, setCompetitorsGroupsByStageForGroups] = useState({});
  const [expandedGroupKey, setExpandedGroupKey] = useState(null); // "seasonNum-stageNum-groupNum"
  const [groupCompetitorsInGroup, setGroupCompetitorsInGroup] = useState([]);
  const [groupCompetitorsNotInGroups, setGroupCompetitorsNotInGroups] = useState([]);
  const [loadingGroupCompetitors, setLoadingGroupCompetitors] = useState(false);
  const [selectedInGroup, setSelectedInGroup] = useState([]);
  const [selectedNotInGroups, setSelectedNotInGroups] = useState([]);
  const [groupCompetitorCounts, setGroupCompetitorCounts] = useState({}); // { groupNum: count } - cached when group is expanded
  const [groupEditDialogOpen, setGroupEditDialogOpen] = useState(false);
  const [groupEditDialogForm, setGroupEditDialogForm] = useState(null);
  const [groupEditDialogContext, setGroupEditDialogContext] = useState(null); // { seasonNum, stageNum }
  // Group Games & Participants (in Group Details)
  const [groupGames, setGroupGames] = useState([]);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [loadingGroupGames, setLoadingGroupGames] = useState(false);
  const [loadingGroupParticipants, setLoadingGroupParticipants] = useState(false);
  const [editingGroupGameIndex, setEditingGroupGameIndex] = useState(null); // index of row in edit mode (Save visible)
  const [editingGroupGameOriginalNum, setEditingGroupGameOriginalNum] = useState(null); // original GAME_NUM when edit started (for API URL)
  const [editingGroupParticipantIndex, setEditingGroupParticipantIndex] = useState(null); // index of participant row in edit mode
  // Integration tab (2a.5) — Partner IDs from partner_id_competitions.json
  const [partnerIdList, setPartnerIdList] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [partnerIdModalOpen, setPartnerIdModalOpen] = useState(false);
  const [partnerIdModalMode, setPartnerIdModalMode] = useState('add'); // 'add' | 'edit'
  const [partnerIdForm, setPartnerIdForm] = useState({ DATA_SOURCE_ID: '', PARTNER_ID: '' });
  const [partnerIdEditTarget, setPartnerIdEditTarget] = useState(null);
  const [partnerIdSaving, setPartnerIdSaving] = useState(false);
  // Image edit: one dialog with tabs (Competition / Trophy) per UI-STANDARDS
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageType, setEditingImageType] = useState('competition'); // 'competition' | 'trophy'
  const [imageUrlValue, setImageUrlValue] = useState('');
  const [competitionImageError, setCompetitionImageError] = useState(false);
  const [trophyImageError, setTrophyImageError] = useState(false);
  const [createCityDialogOpen, setCreateCityDialogOpen] = useState(false);
  const [createCityName, setCreateCityName] = useState('');
  const [hostCityInputValue, setHostCityInputValue] = useState('');
  const [createBracketFinalDialogOpen, setCreateBracketFinalDialogOpen] = useState(false);
  const [createBracketFinalName, setCreateBracketFinalName] = useState('');
  const [bracketFinalInputValue, setBracketFinalInputValue] = useState('');
  const [createRoundNameDialogOpen, setCreateRoundNameDialogOpen] = useState(false);
  const [createRoundNameName, setCreateRoundNameName] = useState('');
  const [roundNameInputValue, setRoundNameInputValue] = useState('');
  // Season Table Settings dialog (same UI as TABLE SETTINGS tab, but for single season)
  const [seasonTableSettingsDialogOpen, setSeasonTableSettingsDialogOpen] = useState(false);
  const [seasonTableSettingsForm, setSeasonTableSettingsForm] = useState(null);
  const [seasonTableSettingsOrderByNewField, setSeasonTableSettingsOrderByNewField] = useState('');
  const [seasonTableSettingsOrderByNewDirection, setSeasonTableSettingsOrderByNewDirection] = useState('desc');
  const [seasonTableSettingsDragOrderIndex, setSeasonTableSettingsDragOrderIndex] = useState(null);
  const [seasonTableSettingsDragOverOrderIndex, setSeasonTableSettingsDragOverOrderIndex] = useState(null);
  const [seasonTableSettingsSaving, setSeasonTableSettingsSaving] = useState(false);
  const [manageStandingsDialogOpen, setManageStandingsDialogOpen] = useState(false);
  const [manageStandingsData, setManageStandingsData] = useState([]);
  const [manageStandingsGroupFilter, setManageStandingsGroupFilter] = useState(null); // null = all, number = filter by GROUP_NUM
  const [manageStandingsEditMode, setManageStandingsEditMode] = useState(false);
  const [manageStandingsLoading, setManageStandingsLoading] = useState(false);
  const [manageStandingsSaving, setManageStandingsSaving] = useState(false);
  const [manageStandingsOriginal, setManageStandingsOriginal] = useState([]);
  const [manageStandingsRecalculateLive, setManageStandingsRecalculateLive] = useState(true);
  const [manageStandingsDestinations, setManageStandingsDestinations] = useState([]);
  const [manageStandingsDestinationsOriginal, setManageStandingsDestinationsOriginal] = useState([]);
  const [manageStandingsDestinationsExpanded, setManageStandingsDestinationsExpanded] = useState(false);
  const [manageStandingsPointsDeductions, setManageStandingsPointsDeductions] = useState([]);
  const [manageStandingsPointsDeductionsOriginal, setManageStandingsPointsDeductionsOriginal] = useState([]);
  const [manageStandingsPointsDeductionsExpanded, setManageStandingsPointsDeductionsExpanded] = useState(false);
  const [manageStandingsMultiStageEnabled, setManageStandingsMultiStageEnabled] = useState(false);
  const [manageStandingsSelectedStages, setManageStandingsSelectedStages] = useState([]);
  const [manageStandingsLoadPrevEnabled, setManageStandingsLoadPrevEnabled] = useState(false);
  const [manageStandingsLoadPrevSeason, setManageStandingsLoadPrevSeason] = useState(null);
  const [manageStandingsLoadPrevStage, setManageStandingsLoadPrevStage] = useState(null);

  const numberToHex = (num) => {
    if (num === null || num === undefined) return null;
    return `#${Number(num).toString(16).padStart(6, '0').toUpperCase()}`;
  };
  const hexToNumber = (hex) => {
    if (!hex || !String(hex).startsWith('#')) return null;
    return parseInt(String(hex).replace('#', ''), 16);
  };

  const [formData, setFormData] = useState({
    NAME_ID: '',
    COUNTRY_ID: '',
    SPORT_TYPE_ID: '',
    GENDER: '',
    COMPETITION_TYPE: '',
    COMPETITION_IMAGE_URL: '',
    TROPHY_IMAGE_URL: '',
    MAIN_COLOR: '',
    SECONDARY_COLOR: '',
    TABLE_WINNER_POINTS: '',
    TABLE_DRAW_POINTS: '',
    TABLE_LOSER_POINTS: '',
    TABLE_IS_EVEN_EXISTS: false,
    TABLE_COUNT_ET_SCORE: false,
    TABLE_COUNT_PEN_SCORE: false,
    SUPPORT_COMPETITION_DASHBOARD: false,
    ENABLE_DASHBOARD_BUZZ: false,
    HIDE_ON_CATALOG: false,
    HIDE_ON_SEARCH: false,
    HIDE_LMT: false,
  });

  useEffect(() => {
    loadCompetition();
    loadTermsAndCategories();
    loadCountriesAndSports();
  }, [id]);

  useEffect(() => {
    const loadBuzzItemTypes = async () => {
      try {
        const data = await api.getBuzzItemTypes();
        setBuzzItemTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to load buzz item types:', err);
      }
    };
    loadBuzzItemTypes();
  }, []);

  useEffect(() => {
    const loadSurfaces = async () => {
      try {
        const data = await api.getSurfaces();
        setSurfaces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to load surfaces:', err);
      }
    };
    loadSurfaces();
  }, []);

  useEffect(() => {
    const loadTableSettings = async () => {
      try {
        const data = await api.getTableSettings();
        const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (first && typeof first === 'object') {
          const keys = Object.keys(first).filter((k) => !TABLE_ORDER_EXCLUDE_KEYS.includes(k));
          setTableSettingsFieldOptions(keys.map((key) => ({ value: key, label: formatTableSettingKeyAsLabel(key) })));
        }
      } catch (err) {
        console.warn('Failed to load table settings for order options:', err);
      }
    };
    loadTableSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 0 && id) {
      loadStructureSeasons();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === 3 && id) {
      (async () => {
        setWinnersLoading(true);
        try {
          const [rows, seasons] = await Promise.all([
            api.getCompetitionWinners(id),
            api.getSeasons(id),
          ]);
          setWinnersData(rows);
          setWinnersOriginalData(JSON.parse(JSON.stringify(rows)));
          setWinnersAllSeasons(seasons);
        } catch (err) {
          console.warn('Failed to load winners:', err);
          setWinnersData([]);
          setWinnersOriginalData([]);
          setWinnersAllSeasons([]);
        } finally {
          setWinnersLoading(false);
          setWinnersEditingIdx(null);
          setWinnersEditForm({});
          setWinnersCoachError('');
        }
      })();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === 0 && id && competitorsSeasonNum != null) {
      loadCompetitorsTab();
    }
  }, [activeTab, id, competitorsSeasonNum, competitorsNotInSeasonFilters.countryId, competitorsNotInSeasonFilters.name, competitorsNotInSeasonFilters.competitionId]);

  useEffect(() => {
    if (activeTab === 0 && id && competitorsSeasonNum != null) {
      (async () => {
        try {
          const stages = await api.getStages(id, competitorsSeasonNum) || [];
          setCompetitorsStagesForGroups(stages);
          const byStage = {};
          for (const st of stages) {
            const gs = await api.getGroups(id, competitorsSeasonNum, st.STAGE_NUM) || [];
            byStage[`${competitorsSeasonNum}-${st.STAGE_NUM}`] = gs;
          }
          setCompetitorsGroupsByStageForGroups(byStage);
        } catch (e) {
          setCompetitorsStagesForGroups([]);
          setCompetitorsGroupsByStageForGroups({});
        }
      })();
    } else {
      setCompetitorsStagesForGroups([]);
      setCompetitorsGroupsByStageForGroups({});
      setExpandedGroupKey(null);
    }
  }, [activeTab, id, competitorsSeasonNum]);

  // Load group competitors, games, and participants when a group is selected (In Group table)
  useEffect(() => {
    if (activeTab === 0 && id && structureGroupForm && selectedStructureSeasonNum != null && selectedStructureStageNum != null) {
      const gn = structureGroupForm.GROUP_NUM;
      loadGroupCompetitorsData(selectedStructureSeasonNum, selectedStructureStageNum, gn);
      (async () => {
        setLoadingGroupGames(true);
        setLoadingGroupParticipants(true);
        try {
          const [games, participants] = await Promise.all([
            api.getGroupGames(id, selectedStructureSeasonNum, selectedStructureStageNum, gn),
            api.getGroupParticipants(id, selectedStructureSeasonNum, selectedStructureStageNum, gn),
          ]);
          setGroupGames(games || []);
          setGroupParticipants(participants || []);
        } catch (err) {
          setSnackbar({ open: true, message: err.message || 'Failed to load', severity: 'error' });
          setGroupGames([]);
          setGroupParticipants([]);
        } finally {
          setLoadingGroupGames(false);
          setLoadingGroupParticipants(false);
        }
      })();
    } else {
      setGroupCompetitorsInGroup([]);
      setGroupGames([]);
      setGroupParticipants([]);
      setEditingGroupGameIndex(null);
      setEditingGroupGameOriginalNum(null);
      setEditingGroupParticipantIndex(null);
      // Keep groupCompetitorsNotInGroups - it's shown in the right panel regardless of expanded group
    }
  }, [activeTab, id, structureGroupForm, selectedStructureSeasonNum, selectedStructureStageNum]);

  // Load Competitors Not In Groups when stage is selected (for the right-hand panel, always visible)
  useEffect(() => {
    if (activeTab === 0 && id && selectedStructureSeasonNum != null && selectedStructureStageNum != null) {
      const load = async () => {
        setLoadingGroupCompetitors(true);
        try {
          const notIn = await api.getCompetitorsNotInGroups(id, selectedStructureSeasonNum, selectedStructureStageNum);
          setGroupCompetitorsNotInGroups(notIn || []);
        } catch (err) {
          setSnackbar({ open: true, message: err.message || 'Failed to load', severity: 'error' });
        } finally {
          setLoadingGroupCompetitors(false);
        }
      };
      load();
    } else {
      setGroupCompetitorsNotInGroups([]);
    }
  }, [activeTab, id, selectedStructureSeasonNum, selectedStructureStageNum]);

  const loadStructureSeasons = async () => {
    if (!id) return;
    try {
      setStructureLoading(true);
      const list = await api.getSeasons(id);
      setStructureSeasons(list || []);
    } catch (err) {
      console.warn('Failed to load seasons:', err);
      setStructureSeasons([]);
    } finally {
      setStructureLoading(false);
    }
  };

  // When switching competition, reset so we re-apply initial season selection
  const hasInitializedSeasonSelection = useRef(false);
  useEffect(() => {
    hasInitializedSeasonSelection.current = false;
  }, [id]);

  // When structure seasons + competition are ready, select current season once (else highest NUM = most recent)
  useEffect(() => {
    if (activeTab !== 0) return;
    if (structureSeasons.length === 0) {
      setSelectedStructureSeasonNum(null);
      setStructureSeasonForm(null);
      return;
    }
    // Wait for competition so we can pick CURRENT_SEASON; avoid selecting lowest NUM prematurely
    if (competition == null) return;
    if (hasInitializedSeasonSelection.current) return;
    hasInitializedSeasonSelection.current = true;
    const currentNum = competition?.CURRENT_SEASON;
    const currentExists = currentNum != null && structureSeasons.some((s) => s.SEASON_NUM === currentNum);
    const fallbackNum = structureSeasons.length
      ? structureSeasons.reduce((max, s) => (s.SEASON_NUM > max.SEASON_NUM ? s : max)).SEASON_NUM
      : null;
    setSelectedStructureSeasonNum(currentExists ? currentNum : fallbackNum);
  }, [activeTab, structureSeasons, competition]);

  // Sync structureSeasonForm from selected season; if selected was deleted, pick current or highest remaining
  useEffect(() => {
    if (!structureSeasons.length) {
      setStructureSeasonForm(null);
      return;
    }
    const season = structureSeasons.find((s) => s.SEASON_NUM === selectedStructureSeasonNum);
    if (!season) {
      if (competition == null) return; // wait for init (which needs competition)
      const currentNum = competition?.CURRENT_SEASON;
      const currentExists = currentNum != null && structureSeasons.some((s) => s.SEASON_NUM === currentNum);
      const fallback = currentExists
        ? structureSeasons.find((s) => s.SEASON_NUM === currentNum)
        : structureSeasons.reduce((max, s) => (s.SEASON_NUM > max.SEASON_NUM ? s : max));
      setSelectedStructureSeasonNum(fallback.SEASON_NUM);
      setStructureSeasonForm({ ...fallback });
      return;
    }
    setStructureSeasonForm({ ...season });
  }, [selectedStructureSeasonNum, structureSeasons, competition]);

  // Sync competitorsSeasonNum with selected season (for Season Competitors section)
  useEffect(() => {
    setCompetitorsSeasonNum(selectedStructureSeasonNum);
    setSelectedInSeason([]);
    setSelectedNotInSeason([]);
  }, [selectedStructureSeasonNum]);

  // Default filters for Competitors Not In Season: competition's country + current competition (once per competition)
  const hasSetDefaultCompetitorsFilters = useRef(false);
  useEffect(() => {
    hasSetDefaultCompetitorsFilters.current = false;
  }, [id]);
  useEffect(() => {
    if (!id || !competition || hasSetDefaultCompetitorsFilters.current) return;
    const countryId = competition.COUNTRY_ID != null ? String(competition.COUNTRY_ID) : '';
    const competitionId = String(id);
    setCompetitorsNotInSeasonFilters((f) => ({ ...f, countryId, competitionId }));
    hasSetDefaultCompetitorsFilters.current = true;
  }, [id, competition]);

  // Load stages & phases when selected season changes
  useEffect(() => {
    if (activeTab !== 0 || !id || selectedStructureSeasonNum == null) return;
    if (stagesBySeason[selectedStructureSeasonNum] === undefined) {
      loadStagesAndPhases(selectedStructureSeasonNum);
    }
  }, [activeTab, id, selectedStructureSeasonNum]);

  // Load groups when stage is selected (Structure tab)
  useEffect(() => {
    if (activeTab !== 0 || !id || selectedStructureSeasonNum == null || selectedStructureStageNum == null) return;
    const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
    if (groupsByStage[key] === undefined) {
      loadGroups(selectedStructureSeasonNum, selectedStructureStageNum);
    }
  }, [activeTab, id, selectedStructureSeasonNum, selectedStructureStageNum]);

  // When season changes, clear selected stage, phase and group
  useEffect(() => {
    setSelectedStructureStageNum(null);
    setStructureStageForm(null);
    setSelectedStructurePhaseNum(null);
    setStructurePhaseForm(null);
    setSelectedStructureGroupNum(null);
    setStructureGroupForm(null);
    setGroupCompetitorCounts({});
    setGroupEditDialogOpen(false);
    setPhasesExpanded(false);
  }, [selectedStructureSeasonNum]);

  // When stage changes, clear selected group and competitor counts cache
  useEffect(() => {
    setSelectedStructureGroupNum(null);
    setGroupCompetitorCounts({});
    setGroupEditDialogOpen(false);
    setStructureGroupForm(null);
  }, [selectedStructureStageNum]);

  // Sync structureStageForm when selected stage or stages list changes
  useEffect(() => {
    if (selectedStructureSeasonNum == null || selectedStructureStageNum == null) {
      setStructureStageForm(null);
      return;
    }
    const stages = stagesBySeason[selectedStructureSeasonNum] || [];
    const stage = stages.find((s) => Number(s.STAGE_NUM) === Number(selectedStructureStageNum));
    setStructureStageForm(stage ? { ...stage } : null);
  }, [selectedStructureSeasonNum, selectedStructureStageNum, stagesBySeason]);

  // Sync structurePhaseForm when selected phase or phases list changes
  useEffect(() => {
    if (selectedStructureSeasonNum == null || selectedStructurePhaseNum == null) {
      setStructurePhaseForm(null);
      return;
    }
    const phases = phasesBySeason[selectedStructureSeasonNum] || [];
    const phase = phases.find((p) => Number(p.PHASE_NUM) === Number(selectedStructurePhaseNum));
    setStructurePhaseForm(phase ? { ...phase } : null);
  }, [selectedStructureSeasonNum, selectedStructurePhaseNum, phasesBySeason]);

  // Sync structureGroupForm when selected group or groups list changes
  useEffect(() => {
    if (selectedStructureSeasonNum == null || selectedStructureStageNum == null || selectedStructureGroupNum == null) {
      setStructureGroupForm(null);
      return;
    }
    const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
    const groups = groupsByStage[key] || [];
    const group = groups.find((g) => Number(g.GROUP_NUM) === Number(selectedStructureGroupNum));
    setStructureGroupForm(group ? { ...group } : null);
  }, [selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum, groupsByStage]);

  const loadStagesAndPhases = async (seasonNum) => {
    if (!id) return;
    try {
      const [stages, phases] = await Promise.all([
        api.getStages(id, seasonNum),
        api.getPhases(id, seasonNum),
      ]);
      setStagesBySeason((prev) => ({ ...prev, [seasonNum]: stages || [] }));
      setPhasesBySeason((prev) => ({ ...prev, [seasonNum]: phases || [] }));
    } catch (err) {
      console.warn('Failed to load stages/phases:', err);
    }
  };

  const loadGroups = async (seasonNum, stageNum) => {
    if (!id) return;
    try {
      const groups = await api.getGroups(id, seasonNum, stageNum) || [];
      const key = `${seasonNum}-${stageNum}`;
      setGroupsByStage((prev) => ({ ...prev, [key]: groups }));

      // Load competitor counts for each group so they display without expanding
      if (groups.length > 0) {
        const countPromises = groups.map((g) =>
          api.getGroupCompetitors(id, seasonNum, stageNum, g.GROUP_NUM).then((arr) => ({ groupNum: g.GROUP_NUM, count: (arr || []).length }))
        );
        const counts = await Promise.all(countPromises);
        const countsMap = Object.fromEntries(counts.map((c) => [c.groupNum, c.count]));
        setGroupCompetitorCounts((prev) => ({ ...prev, ...countsMap }));
      }
    } catch (err) {
      console.warn('Failed to load groups:', err);
    }
  };

  const handleExpandSeason = (seasonNum) => {
    const next = expandedSeasonNum === seasonNum ? null : seasonNum;
    setExpandedSeasonNum(next);
    setExpandedStageKey(null);
    if (next != null && stagesBySeason[next] === undefined) {
      loadStagesAndPhases(next);
    }
  };

  const handleExpandStage = (seasonNum, stageNum) => {
    const key = `${seasonNum}-${stageNum}`;
    const next = expandedStageKey === key ? null : key;
    setExpandedStageKey(next);
    if (next && groupsByStage[next] === undefined) {
      loadGroups(seasonNum, stageNum);
    }
  };

  const seasonCategoryId = (allCategories || []).find(c => c.id === 47 || (c.name && String(c.name).includes('Season')))?.id ?? 47;
  const seasonTermOptions = (allTerms || []).filter(t => t.categoryId === seasonCategoryId);

  const handleAddSeason = () => {
    setSeasonModalMode('add');
    setSeasonEditTarget(null);
    setSeasonForm({ SEASON_NUM: '', NAME_ID: null, START_DATE: '', END_DATE: '', HAS_TABLE: true, HAS_BRACKETS: false });
    setNewSeasonName('');
    setNewSeasonLanguageId(1);
    setNewSeasonStartDate('');
    setNewSeasonEndDate('');
    setNewSeasonSetCurrent(false);
    setNewSeasonBasedOnLast(false);
    setNewSeasonRoundNameCheck(false);
    setNewSeasonRoundNameId(null);
    setSeasonModalOpen(true);
  };

  const handleEditSeason = (season) => {
    setSeasonModalMode('edit');
    setSeasonEditTarget(season);
    const termOpt = seasonTermOptions.find(t => t.id === season.NAME_ID);
    setSeasonForm({
      SEASON_NUM: season.SEASON_NUM,
      NAME_ID: termOpt || (season.NAME_ID ? { id: season.NAME_ID } : null),
      START_DATE: season.START_DATE ? String(season.START_DATE).slice(0, 10) : '',
      END_DATE: season.END_DATE ? String(season.END_DATE).slice(0, 10) : '',
      HAS_TABLE: !!season.HAS_TABLE,
      HAS_BRACKETS: !!season.HAS_BRACKETS,
    });
    setSeasonModalOpen(true);
  };

  const handleSeasonModalClose = () => {
    setSeasonModalOpen(false);
    setSeasonEditTarget(null);
  };

  const handleSeasonModalSave = async () => {
    if (!id) return;
    if (seasonModalMode === 'add') {
      const nameTrim = (newSeasonName || '').trim();
      if (!nameTrim) {
        setSnackbar({ open: true, message: 'Season name is required', severity: 'error' });
        return;
      }
      setSeasonSaving(true);
      try {
        const newTerm = await api.createTerm({
          category: 'Seasons Names',
          values: [
            { languageId: newSeasonLanguageId, value: nameTrim, isDefault: true, status: 'Approved' },
          ],
        });
        const nextSeasonNum = structureSeasons.length
          ? Math.max(...structureSeasons.map((s) => s.SEASON_NUM)) + 1
          : 1;
        const startIso = newSeasonStartDate ? dayjs(newSeasonStartDate).toISOString() : null;
        const endIso = newSeasonEndDate ? dayjs(newSeasonEndDate).toISOString() : null;
        const payload = {
          SEASON_NUM: nextSeasonNum,
          NAME_ID: newTerm.id,
          START_DATE: startIso,
          END_DATE: endIso,
          HAS_TABLE: true,
          HAS_BRACKETS: false,
          USE_NAME: false,
          SHOW_TOP_ATHLETES: true,
          SHOW_INFO_CARD: true,
          SHOW_MATCHES: true,
          PRESENT_COMPETITION_RULES: true,
        };
        await api.createSeason(id, payload);
        setSnackbar({ open: true, message: 'Season created', severity: 'success' });
        if (newSeasonSetCurrent) {
          await api.updateCompetition(id, { CURRENT_SEASON: nextSeasonNum });
          setSnackbar((s) => ({ ...s, message: 'Season created and set as current', severity: 'success' }));
        }
        handleSeasonModalClose();
        loadStructureSeasons();
        loadCompetition();
        setStagesBySeason({});
        setPhasesBySeason({});
      } catch (err) {
        setSnackbar({ open: true, message: err.message || 'Failed to create season', severity: 'error' });
      } finally {
        setSeasonSaving(false);
      }
      return;
    }
    if (seasonModalMode === 'edit' && (seasonForm.SEASON_NUM === '' || isNaN(Number(seasonForm.SEASON_NUM)))) {
      setSnackbar({ open: true, message: 'Season number is required', severity: 'error' });
      return;
    }
    setSeasonSaving(true);
    try {
      const nameId = seasonForm.NAME_ID != null ? (seasonForm.NAME_ID?.id ?? seasonForm.NAME_ID) : null;
      const payload = {
        SEASON_NUM: seasonEditTarget.SEASON_NUM,
        NAME_ID: nameId,
        START_DATE: seasonForm.START_DATE ? `${seasonForm.START_DATE}T00:00:00.000Z` : null,
        END_DATE: seasonForm.END_DATE ? `${seasonForm.END_DATE}T00:00:00.000Z` : null,
        HAS_TABLE: !!seasonForm.HAS_TABLE,
        HAS_BRACKETS: !!seasonForm.HAS_BRACKETS,
      };
      await api.updateSeason(id, seasonEditTarget.SEASON_NUM, payload);
      setSnackbar({ open: true, message: 'Season updated', severity: 'success' });
      handleSeasonModalClose();
      loadStructureSeasons();
      loadCompetition();
      setStagesBySeason({});
      setPhasesBySeason({});
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save season', severity: 'error' });
    } finally {
      setSeasonSaving(false);
    }
  };

  const handleDeleteSeason = async (season) => {
    if (!id || competition?.CURRENT_SEASON === season.SEASON_NUM) return;
    if (!window.confirm(`Delete season ${season.SEASON_NUM}?`)) return;
    try {
      await api.deleteSeason(id, season.SEASON_NUM);
      setSnackbar({ open: true, message: 'Season deleted', severity: 'success' });
      loadStructureSeasons();
      loadCompetition();
      setStagesBySeason({});
      setPhasesBySeason({});
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete season', severity: 'error' });
    }
  };

  const handleSetCurrentSeason = async (seasonNum) => {
    if (!id) return;
    try {
      await api.updateCompetition(id, { CURRENT_SEASON: seasonNum });
      setSnackbar({ open: true, message: 'Current season updated', severity: 'success' });
      loadCompetition();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to set current season', severity: 'error' });
    }
  };

  const handleSaveStructureSeason = async () => {
    if (!id || selectedStructureSeasonNum == null || !structureSeasonForm) return;
    setStructureSeasonSaving(true);
    try {
      const payload = {
        NAME_ID: structureSeasonForm.NAME_ID ?? null,
        SEASON_KEY: structureSeasonForm.SEASON_KEY ?? null,
        START_DATE: structureSeasonForm.START_DATE || null,
        END_DATE: structureSeasonForm.END_DATE || null,
        USE_NAME: !!structureSeasonForm.USE_NAME,
        SHOW_TOP_ATHLETES: !!structureSeasonForm.SHOW_TOP_ATHLETES,
        HAS_BRACKETS: !!structureSeasonForm.HAS_BRACKETS,
        HAS_TABLE: !!structureSeasonForm.HAS_TABLE,
        SHOW_INFO_CARD: !!structureSeasonForm.SHOW_INFO_CARD,
        HAS_SEED: !!structureSeasonForm.HAS_SEED,
        SHOW_TOP_TEAMS_TAB: !!structureSeasonForm.SHOW_TOP_TEAMS_TAB,
        SHOW_OUTRIGHTS_TAB: !!structureSeasonForm.SHOW_OUTRIGHTS_TAB,
        PRESENT_COMPETITION_RULES: !!structureSeasonForm.PRESENT_COMPETITION_RULES,
        SHOW_MATCHES: !!structureSeasonForm.SHOW_MATCHES,
      };
      await api.updateSeason(id, selectedStructureSeasonNum, payload);
      setSnackbar({ open: true, message: 'Season updated', severity: 'success' });
      loadStructureSeasons();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save season', severity: 'error' });
    } finally {
      setStructureSeasonSaving(false);
    }
  };

  const handleSaveStructureStage = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedStructureStageNum == null || !structureStageForm) return;
    setStructureStageSaving(true);
    try {
      const payload = {
        NAME_ID: structureStageForm.NAME_ID ?? null,
        NUM_OF_GAMES: structureStageForm.NUM_OF_GAMES != null && structureStageForm.NUM_OF_GAMES !== '' ? Number(structureStageForm.NUM_OF_GAMES) : null,
        STAGE_TYPE: Number(structureStageForm.STAGE_TYPE) || 1,
        HAS_TABLE: !!structureStageForm.HAS_TABLE,
        IS_SERIES: !!structureStageForm.IS_SERIES,
        CONNECTED_TO_PREVIOUS_STAGE: !!structureStageForm.CONNECTED_TO_PREVIOUS_STAGE,
        FILTER_DIVISION: !!structureStageForm.FILTER_DIVISION,
        INCLUDE_IN_BRACKET: !!structureStageForm.INCLUDE_IN_BRACKET,
        PRE_VISUAL_BRACKETS: !!structureStageForm.PRE_VISUAL_BRACKETS,
        CONNECTED_IN_BRACKETS: !!structureStageForm.CONNECTED_IN_BRACKETS,
        PHASE: structureStageForm.PHASE ?? '',
        START_DATE: structureStageForm.START_DATE || null,
        END_DATE: structureStageForm.END_DATE || null,
        HAS_HOME_TABLE: !!structureStageForm.HAS_HOME_TABLE,
        HAS_AWAY_TABLE: !!structureStageForm.HAS_AWAY_TABLE,
        HIDE_HOME_AWAY_TABLES: !!structureStageForm.HIDE_HOME_AWAY_TABLES,
        HIDE_MAIN_TABLE: !!structureStageForm.HIDE_MAIN_TABLE,
        HAS_POSITION_TABLE: !!structureStageForm.HAS_POSITION_TABLE,
        POSITION_PARAMETER: (structureStageForm.POSITION_PARAMETER != null && String(structureStageForm.POSITION_PARAMETER).trim() !== '') ? Number(structureStageForm.POSITION_PARAMETER) : null,
        POSITION_TABLE_NAME: structureStageForm.POSITION_TABLE_NAME_ID ?? structureStageForm.POSITION_TABLE_NAME ?? null,
        AGGREGATED_TABLE_SETTINGS: (structureStageForm.AGGREGATED_TABLE_SETTINGS || '').trim() || null,
        RELEGATION_TABLE_SETTINGS: (structureStageForm.RELEGATION_TABLE_SETTINGS || '').trim() || null,
      };
      await api.updateStage(id, selectedStructureSeasonNum, selectedStructureStageNum, payload);
      setSnackbar({ open: true, message: 'Stage updated', severity: 'success' });
      loadStagesAndPhases(selectedStructureSeasonNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save stage', severity: 'error' });
    } finally {
      setStructureStageSaving(false);
    }
  };

  const handleSaveStructureGroup = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedStructureStageNum == null || selectedStructureGroupNum == null || !structureGroupForm) return;
    setStructureGroupSaving(true);
    try {
      const nameId = structureGroupForm.NAME_ID != null ? (structureGroupForm.NAME_ID?.id ?? structureGroupForm.NAME_ID) : null;
      const payload = {
        NAME_ID: nameId,
        GROUP_CATEGORY_NUM: (structureGroupForm.GROUP_CATEGORY_NUM != null && structureGroupForm.GROUP_CATEGORY_NUM !== '')
        ? Number(structureGroupForm.GROUP_CATEGORY_NUM)
        : null,
        FATHER_GROUP: structureGroupForm.FATHER_GROUP != null ? (Number(structureGroupForm.FATHER_GROUP) || structureGroupForm.FATHER_GROUP) : null,
        HAS_TABLE: !!structureGroupForm.HAS_TABLE,
        IS_SERIES: !!structureGroupForm.IS_SERIES,
        USE_NAME: !!structureGroupForm.USE_NAME,
        GROUP_BY: !!structureGroupForm.GROUP_BY,
        AUTONOMOUS: !!structureGroupForm.AUTONOMOUS,
        IS_FINAL: !!structureGroupForm.IS_FINAL,
      };
      await api.updateGroup(id, selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum, payload);
      setSnackbar({ open: true, message: 'Group updated', severity: 'success' });
      loadGroups(selectedStructureSeasonNum, selectedStructureStageNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save group', severity: 'error' });
    } finally {
      setStructureGroupSaving(false);
    }
  };

  const handleOpenGroupEditDialog = (group, seasonNum, stageNum) => {
    setGroupEditDialogForm(group ? { ...group } : null);
    setGroupEditDialogContext({ seasonNum, stageNum });
    setGroupEditDialogOpen(true);
  };

  const handleCloseGroupEditDialog = () => {
    setGroupEditDialogOpen(false);
    setGroupEditDialogForm(null);
    setGroupEditDialogContext(null);
  };

  const handleOpenManageStandingsDialog = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedStructureStageNum == null) return;
    setManageStandingsDialogOpen(true);
    setManageStandingsLoading(true);
    setManageStandingsEditMode(false);
    setManageStandingsGroupFilter(null);
    loadGroups(selectedStructureSeasonNum, selectedStructureStageNum);
    try {
      const [data, destData, deductionsData] = await Promise.all([
        api.getStageStandings(id, selectedStructureSeasonNum, selectedStructureStageNum),
        api.getStageDestinations(id, selectedStructureSeasonNum, selectedStructureStageNum),
        api.getStagePointsDeductions(id, selectedStructureSeasonNum, selectedStructureStageNum),
      ]);
      setManageStandingsData(data || []);
      setManageStandingsOriginal(JSON.parse(JSON.stringify(data || [])));
      setManageStandingsDestinations(destData || []);
      setManageStandingsDestinationsOriginal(JSON.parse(JSON.stringify(destData || [])));
      setManageStandingsPointsDeductions(deductionsData || []);
      setManageStandingsPointsDeductionsOriginal(JSON.parse(JSON.stringify(deductionsData || [])));
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load standings', severity: 'error' });
      setManageStandingsData([]);
      setManageStandingsOriginal([]);
      setManageStandingsDestinations([]);
      setManageStandingsDestinationsOriginal([]);
      setManageStandingsPointsDeductions([]);
      setManageStandingsPointsDeductionsOriginal([]);
    } finally {
      setManageStandingsLoading(false);
    }
  };

  const handleCloseManageStandingsDialog = () => {
    setManageStandingsDialogOpen(false);
    setManageStandingsData([]);
    setManageStandingsOriginal([]);
    setManageStandingsDestinations([]);
    setManageStandingsDestinationsOriginal([]);
    setManageStandingsDestinationsExpanded(false);
    setManageStandingsPointsDeductions([]);
    setManageStandingsPointsDeductionsOriginal([]);
    setManageStandingsPointsDeductionsExpanded(false);
    setManageStandingsEditMode(false);
    setManageStandingsMultiStageEnabled(false);
    setManageStandingsSelectedStages([]);
    setManageStandingsLoadPrevEnabled(false);
    setManageStandingsLoadPrevSeason(null);
    setManageStandingsLoadPrevStage(null);
  };

  const handleSaveManageStandings = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedStructureStageNum == null) return;
    setManageStandingsSaving(true);
    try {
      await Promise.all([
        api.updateStageStandings(id, selectedStructureSeasonNum, selectedStructureStageNum, manageStandingsData),
        api.updateStageDestinations(id, selectedStructureSeasonNum, selectedStructureStageNum, manageStandingsDestinations),
        api.updateStagePointsDeductions(id, selectedStructureSeasonNum, selectedStructureStageNum, manageStandingsPointsDeductions.map((pd) => ({ ...pd, SOURCE_ID: 1 }))),
      ]);
      setSnackbar({ open: true, message: 'Saved', severity: 'success' });
      setManageStandingsOriginal(JSON.parse(JSON.stringify(manageStandingsData)));
      setManageStandingsDestinationsOriginal(JSON.parse(JSON.stringify(manageStandingsDestinations)));
      setManageStandingsPointsDeductionsOriginal(JSON.parse(JSON.stringify(manageStandingsPointsDeductions)));
      setManageStandingsEditMode(false);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save standings', severity: 'error' });
    } finally {
      setManageStandingsSaving(false);
    }
  };

  const updateManageStandingsRow = (competitorNum, groupNum, field, value) => {
    setManageStandingsData((prev) =>
      prev.map((r) => {
        if (Number(r.COMPETITOR_NUM) === competitorNum && Number(r.GROUP_NUM) === groupNum) {
          const numVal = value === '' || value == null ? 0 : Number(value);
          return { ...r, [field]: isNaN(numVal) ? r[field] : numVal };
        }
        return r;
      })
    );
  };

  const DESTINATION_TYPE_OPTIONS = [
    { value: 0, label: 'Unknown' },
    { value: 1, label: 'ContinentalSecondaryCup' },
    { value: 2, label: 'DomesticCup' },
    { value: 3, label: 'Relegation' },
  ];
  const TABLE_TYPE_OPTIONS = [
    { value: 0, label: 'Regular' },
    { value: 1, label: 'Position' },
    { value: 2, label: 'Aggregate' },
    { value: 3, label: 'Relegation' },
  ];

  const handleAddDestination = () => {
    const maxNum = manageStandingsDestinations.length ? Math.max(...manageStandingsDestinations.map((d) => Number(d.DESTINATION_NUM) || 0), 0) : 0;
    setManageStandingsDestinations((prev) => [
      ...prev,
      {
        COLOR: '#00CED1',
        DESTINATION_COMPETITION: 0,
        DESTINATION_GROUP: 0,
        DESTINATION_NUM: maxNum + 1,
        DESTINATION_SEASON: 0,
        DESTINATION_STAGE: 0,
        DESTINATION_TYPE: 0,
        FROM_POSITION: 0,
        GROUP_NUM: 1,
        GUARANTEED_TEXT: '',
        NAME_ID: 0,
        TABLE_TYPE: 0,
        TO_POSITION: 0,
      },
    ]);
  };

  const handleRemoveDestination = (idx) => {
    setManageStandingsDestinations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveAllDestinations = () => {
    setManageStandingsDestinations([]);
  };

  const handleUpdateDestination = (idx, field, value) => {
    setManageStandingsDestinations((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const handleAddPointsDeduction = () => {
    setManageStandingsPointsDeductions((prev) => [
      ...prev,
      {
        COMPETITOR_NUM: 0,
        POINTS: 0,
        GOALS_FOR: 0,
        GOALS_AGAINST: 0,
        REASON_TERM_ID: 0,
        SOURCE_ID: 1,
        DEDUCTION_DATE: null,
      },
    ]);
  };

  const handleRemovePointsDeduction = (idx) => {
    setManageStandingsPointsDeductions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveAllPointsDeductions = () => {
    setManageStandingsPointsDeductions([]);
  };

  const handleUpdatePointsDeduction = (idx, field, value) => {
    setManageStandingsPointsDeductions((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveGroupEditDialog = async () => {
    if (!id || !groupEditDialogForm || !groupEditDialogContext) return;
    const { seasonNum, stageNum } = groupEditDialogContext;
    const form = groupEditDialogForm;
    setStructureGroupSaving(true);
    try {
      const nameId = form.NAME_ID != null ? (form.NAME_ID?.id ?? form.NAME_ID) : null;
      const payload = {
        NAME_ID: nameId,
        GROUP_CATEGORY_NUM: (form.GROUP_CATEGORY_NUM != null && form.GROUP_CATEGORY_NUM !== '') ? Number(form.GROUP_CATEGORY_NUM) : null,
        FATHER_GROUP: form.FATHER_GROUP != null ? (Number(form.FATHER_GROUP) || form.FATHER_GROUP) : null,
        HAS_TABLE: !!form.HAS_TABLE,
        IS_SERIES: !!form.IS_SERIES,
        USE_NAME: !!form.USE_NAME,
        GROUP_BY: !!form.GROUP_BY,
        AUTONOMOUS: !!form.AUTONOMOUS,
        IS_FINAL: !!form.IS_FINAL,
      };
      await api.updateGroup(id, seasonNum, stageNum, form.GROUP_NUM, payload);
      setSnackbar({ open: true, message: 'Group updated', severity: 'success' });
      loadGroups(seasonNum, stageNum);
      handleCloseGroupEditDialog();
      if (selectedStructureSeasonNum === seasonNum && selectedStructureStageNum === stageNum && selectedStructureGroupNum === form.GROUP_NUM) {
        setStructureGroupForm((prev) => (prev ? { ...prev, ...form } : null));
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save group', severity: 'error' });
    } finally {
      setStructureGroupSaving(false);
    }
  };

  const handleStagesReorderDrop = async (seasonNum, draggedStageNum, targetIndex) => {
    if (!id) return;
    const list = stagesBySeason[seasonNum] || [];
    const sorted = [...list].sort((a, b) => {
      const pa = a.PRESENTATION_ORDER != null && a.PRESENTATION_ORDER !== '' ? Number(a.PRESENTATION_ORDER) : Number(a.STAGE_NUM);
      const pb = b.PRESENTATION_ORDER != null && b.PRESENTATION_ORDER !== '' ? Number(b.PRESENTATION_ORDER) : Number(b.STAGE_NUM);
      return pa - pb;
    });
    const fromIndex = sorted.findIndex((s) => Number(s.STAGE_NUM) === Number(draggedStageNum));
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(targetIndex, 0, moved);
    try {
      for (let i = 0; i < sorted.length; i++) {
        await api.updateStage(id, seasonNum, sorted[i].STAGE_NUM, { PRESENTATION_ORDER: i });
      }
      setSnackbar({ open: true, message: 'Stage order updated', severity: 'success' });
      loadStagesAndPhases(seasonNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to reorder stages', severity: 'error' });
    }
  };

  const handleSaveStructurePhase = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedStructurePhaseNum == null || !structurePhaseForm) return;
    setStructurePhaseSaving(true);
    try {
      const payload = {
        PHASE_NAME_ID: structurePhaseForm.PHASE_NAME_ID ?? null,
        PARENT_PHASE_NUM: structurePhaseForm.PARENT_PHASE_NUM != null && structurePhaseForm.PARENT_PHASE_NUM !== '' ? Number(structurePhaseForm.PARENT_PHASE_NUM) : null,
        SHOW_STATS: !!structurePhaseForm.SHOW_STATS,
        USE_NAME: !!structurePhaseForm.USE_NAME,
        OVERTIME_LENGTH: structurePhaseForm.OVERTIME_LENGTH != null && structurePhaseForm.OVERTIME_LENGTH !== '' ? Number(structurePhaseForm.OVERTIME_LENGTH) : null,
        TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: structurePhaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE != null && structurePhaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE !== '' ? Number(structurePhaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE) : null,
      };
      await api.updatePhase(id, selectedStructureSeasonNum, selectedStructurePhaseNum, payload);
      setSnackbar({ open: true, message: 'Phase updated', severity: 'success' });
      loadStagesAndPhases(selectedStructureSeasonNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save phase', severity: 'error' });
    } finally {
      setStructurePhaseSaving(false);
    }
  };

  const handleSeasonNameClick = async (e, season) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!season?.NAME_ID) return;
    try {
      const term = await api.getTermById(season.NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Seasons Names');
      setTermModalGroupContext(null);
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleReasonTermClick = async (e, reasonTermId) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!reasonTermId) return;
    try {
      const term = await api.getTermById(reasonTermId);
      setCurrentTerm(term);
      setTermModalCategory('Points Deduction Reasons');
      setTermModalDestinationContext(null);
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load term', severity: 'error' });
    }
  };

  const handleDestinationNameClick = async (e, nameId) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!nameId) return;
    try {
      const term = await api.getTermById(nameId);
      setCurrentTerm(term);
      setTermModalCategory('Table Destinations');
      setTermModalDestinationContext({});
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleTermSave = () => {
    setTermModalOpen(false);
    setCurrentTerm(null);
    loadCompetition();
    if (termModalCategory === 'Seasons Names' || termModalCategory === 'Stages Names') {
      loadStructureSeasons();
      setStagesBySeason({});
      setPhasesBySeason({});
    }
    if (termModalCategory === 'Groups Names' && termModalGroupContext) {
      loadGroups(termModalGroupContext.seasonNum, termModalGroupContext.stageNum);
    }
    if (termModalCategory === 'Phases Names' && termModalPhaseContext) {
      loadStagesAndPhases(termModalPhaseContext.seasonNum);
    }
    if (termModalCategory === 'Cities' || termModalCategory === 'Finals' || termModalCategory === 'Rounds Names') {
      loadTermsAndCategories();
    }
    if (termModalCategory === 'Participants Names' && termModalParticipantContext) {
      loadGroupGamesAndParticipants(termModalParticipantContext.seasonNum, termModalParticipantContext.stageNum, termModalParticipantContext.groupNum);
    }
    if (termModalCategory === 'Table Destinations' && termModalDestinationContext) {
      loadTermsAndCategories();
    }
    if (termModalCategory === 'Points Deduction Reasons') {
      loadTermsAndCategories();
    }
    setTermModalGroupContext(null);
    setTermModalPhaseContext(null);
    setTermModalParticipantContext(null);
    setTermModalDestinationContext(null);
  };

  const stageCategoryId = (allCategories || []).find(c => c.id === 48 || (c.name && String(c.name).includes('Stage')))?.id ?? 48;
  const stageTermOptions = (allTerms || []).filter(t => t.categoryId === stageCategoryId || t.category === 'Stages Names');
  const groupCategoryId = (allCategories || []).find(c => c.id === 49 || (c.name && String(c.name).includes('Group')))?.id ?? 49;
  const groupTermOptions = (allTerms || []).filter(t => t.categoryId === groupCategoryId || t.category === 'Groups Names');
  const phaseCategoryId = (allCategories || []).find(c => c.id === 53 || (c.name && String(c.name).includes('Phase')))?.id ?? 53;
  const phaseTermOptions = (allTerms || []).filter(t => t.categoryId === phaseCategoryId || t.category === 'Phases Names');
  const participantCategoryId = (allCategories || []).find(c => c.id === 59 || (c.name && String(c.name).includes('Participant')))?.id ?? 59;
  const participantTermOptions = (allTerms || []).filter(t => t.categoryId === participantCategoryId || t.category === 'Participants Names');

  const handleAddStage = (seasonNum) => {
    setStageModalMode('add');
    setStageFormContext({ seasonNum });
    setStageEditTarget(null);
    setNewStageName('');
    setNewStageSetCurrent(false);
    setStageForm({
      STAGE_NUM: '',
      NAME_ID: null,
      STAGE_TYPE: 1,
      NUM_OF_GAMES: -1,
      START_DATE: '',
      END_DATE: '',
      HAS_TABLE: false,
      INCLUDE_IN_BRACKET: false,
      FILTER_DIVISION: false,
      CONNECTED_IN_BRACKETS: false,
      PRE_VISUAL_BRACKETS: false,
      IS_SERIES: false,
      CONNECTED_TO_PREVIOUS_STAGE: false,
      PHASE: '',
    });
    setStageModalOpen(true);
  };

  const handleEditStage = (seasonNum, stage) => {
    setStageModalMode('edit');
    setStageFormContext({ seasonNum });
    setStageEditTarget(stage);
    const termOpt = stageTermOptions.find(t => t.id === stage.NAME_ID);
    setStageForm({
      STAGE_NUM: stage.STAGE_NUM,
      NAME_ID: termOpt || (stage.NAME_ID ? { id: stage.NAME_ID } : null),
      STAGE_TYPE: stage.STAGE_TYPE ?? 1,
      NUM_OF_GAMES: stage.NUM_OF_GAMES ?? -1,
      START_DATE: stage.START_DATE ? String(stage.START_DATE).slice(0, 19) : '',
      END_DATE: stage.END_DATE ? String(stage.END_DATE).slice(0, 19) : '',
      HAS_TABLE: !!stage.HAS_TABLE,
      INCLUDE_IN_BRACKET: !!stage.INCLUDE_IN_BRACKET,
      FILTER_DIVISION: !!stage.FILTER_DIVISION,
      CONNECTED_IN_BRACKETS: !!stage.CONNECTED_IN_BRACKETS,
      PRE_VISUAL_BRACKETS: !!stage.PRE_VISUAL_BRACKETS,
      IS_SERIES: !!stage.IS_SERIES,
      CONNECTED_TO_PREVIOUS_STAGE: !!stage.CONNECTED_TO_PREVIOUS_STAGE,
      PHASE: stage.PHASE ?? '',
    });
    setStageModalOpen(true);
  };

  const handleStageModalClose = () => {
    setStageModalOpen(false);
    setStageFormContext(null);
    setStageEditTarget(null);
  };

  const handleStageModalSave = async () => {
    if (!id || !stageFormContext) return;
    const seasonNum = stageFormContext.seasonNum;

    if (stageModalMode === 'add') {
      const nameTrim = (newStageName || '').trim();
      const hasSelectedTerm = stageForm.NAME_ID != null;
      if (!nameTrim && !hasSelectedTerm) {
        setSnackbar({ open: true, message: 'Stage name is required', severity: 'error' });
        return;
      }
    } else if (stageModalMode === 'edit' && (stageForm.STAGE_NUM === '' || isNaN(Number(stageForm.STAGE_NUM)))) {
      setSnackbar({ open: true, message: 'Stage number is required', severity: 'error' });
      return;
    }

    setStageSaving(true);
    try {
      let nameId = stageForm.NAME_ID != null ? (stageForm.NAME_ID?.id ?? stageForm.NAME_ID) : null;
      if (stageModalMode === 'add') {
        const selectedTermId = stageForm.NAME_ID != null ? (stageForm.NAME_ID?.id ?? stageForm.NAME_ID) : null;
        if (selectedTermId) {
          nameId = selectedTermId;
        } else {
          const newTerm = await api.createTerm({
            category: 'Stages Names',
            values: [
              { languageId: 1, value: (newStageName || '').trim(), isDefault: true, status: 'Approved' },
            ],
          });
          nameId = newTerm?.id ?? newTerm;
        }
      }
      const stagesInSeason = stagesBySeason[seasonNum] || [];
      const nextStageNum = stageModalMode === 'add'
        ? (stagesInSeason.length ? Math.max(...stagesInSeason.map((s) => Number(s.STAGE_NUM))) + 1 : 1)
        : stageEditTarget.STAGE_NUM;

      const payload = {
        STAGE_NUM: nextStageNum,
        NAME_ID: nameId,
        STAGE_TYPE: Number(stageForm.STAGE_TYPE) || 1,
        NUM_OF_GAMES: stageForm.NUM_OF_GAMES !== '' && stageForm.NUM_OF_GAMES != null ? Number(stageForm.NUM_OF_GAMES) : -1,
        START_DATE: stageForm.START_DATE ? (stageForm.START_DATE.includes('T') ? stageForm.START_DATE : `${stageForm.START_DATE}T00:00:00.000Z`) : null,
        END_DATE: stageForm.END_DATE ? (stageForm.END_DATE.includes('T') ? stageForm.END_DATE : `${stageForm.END_DATE}T00:00:00.000Z`) : null,
        HAS_TABLE: !!stageForm.HAS_TABLE,
        INCLUDE_IN_BRACKET: !!stageForm.INCLUDE_IN_BRACKET,
        FILTER_DIVISION: !!stageForm.FILTER_DIVISION,
        CONNECTED_IN_BRACKETS: !!stageForm.CONNECTED_IN_BRACKETS,
        PRE_VISUAL_BRACKETS: !!stageForm.PRE_VISUAL_BRACKETS,
        IS_SERIES: !!stageForm.IS_SERIES,
        CONNECTED_TO_PREVIOUS_STAGE: !!stageForm.CONNECTED_TO_PREVIOUS_STAGE,
        PHASE: (stageForm.PHASE || '').trim() || null,
      };

      if (stageModalMode === 'add') {
        await api.createStage(id, seasonNum, payload);
        setSnackbar({ open: true, message: 'Stage created', severity: 'success' });
        if (newStageSetCurrent) {
          await api.updateCompetition(id, { CURRENT_SEASON: seasonNum, CURRENT_STAGE: nextStageNum });
          setSnackbar((s) => ({ ...s, message: 'Stage created and set as current', severity: 'success' }));
        }
      } else {
        await api.updateStage(id, seasonNum, stageEditTarget.STAGE_NUM, payload);
        setSnackbar({ open: true, message: 'Stage updated', severity: 'success' });
      }
      handleStageModalClose();
      loadStagesAndPhases(seasonNum);
      loadCompetition();
      const terms = await api.getTerms();
      setAllTerms(terms || []);
      setGroupsByStage((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach(k => { if (k.startsWith(`${seasonNum}-`)) delete out[k]; });
        return out;
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save stage', severity: 'error' });
    } finally {
      setStageSaving(false);
    }
  };

  const handleDeleteStage = async (seasonNum, stage) => {
    if (!id) return;
    const isCurrent = competition?.CURRENT_SEASON === seasonNum && competition?.CURRENT_STAGE === stage.STAGE_NUM;
    if (isCurrent) return;
    if (!window.confirm(`Delete stage ${stage.STAGE_NUM}?`)) return;
    try {
      await api.deleteStage(id, seasonNum, stage.STAGE_NUM);
      setSnackbar({ open: true, message: 'Stage deleted', severity: 'success' });
      loadStagesAndPhases(seasonNum);
      loadCompetition();
      setGroupsByStage((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach(k => { if (k.startsWith(`${seasonNum}-`)) delete out[k]; });
        return out;
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete stage', severity: 'error' });
    }
  };

  const handleSetCurrentStage = async (seasonNum, stageNum) => {
    if (!id) return;
    try {
      await api.updateCompetition(id, { CURRENT_SEASON: seasonNum, CURRENT_STAGE: stageNum });
      setSnackbar({ open: true, message: 'Current stage updated', severity: 'success' });
      loadCompetition();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to set current stage', severity: 'error' });
    }
  };

  const handleStageNameClick = async (e, seasonNum, stage) => {
    e.stopPropagation();
    if (!stage?.NAME_ID) return;
    try {
      const term = await api.getTermById(stage.NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Stages Names');
      setTermModalGroupContext(null);
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleGroupNameClick = async (e, seasonNum, stageNum, gr) => {
    e.stopPropagation();
    if (!gr?.NAME_ID) return;
    try {
      const term = await api.getTermById(gr.NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Groups Names');
      setTermModalGroupContext({ seasonNum, stageNum });
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleAddGroup = (seasonNum, stageNum) => {
    setGroupModalMode('add');
    setGroupFormContext({ seasonNum, stageNum });
    setGroupEditTarget(null);
    setNewGroupName('');
    setGroupForm({
      NAME_ID: null,
      HAS_TABLE: true,
      IS_SERIES: false,
      USE_NAME: false,
      GROUP_BY: false,
      AUTONOMOUS: false,
      IS_FINAL: false,
    });
    setGroupModalOpen(true);
  };

  const handleEditGroup = (seasonNum, stageNum, gr) => {
    setGroupModalMode('edit');
    setGroupFormContext({ seasonNum, stageNum });
    setGroupEditTarget(gr);
    const termOpt = groupTermOptions.find(t => t.id === gr.NAME_ID);
    setGroupForm({
      GROUP_NUM: gr.GROUP_NUM,
      NAME_ID: termOpt || (gr.NAME_ID ? { id: gr.NAME_ID } : null),
      HAS_TABLE: !!gr.HAS_TABLE,
      IS_SERIES: !!gr.IS_SERIES,
      USE_NAME: !!gr.USE_NAME,
      GROUP_BY: !!gr.GROUP_BY,
      AUTONOMOUS: !!gr.AUTONOMOUS,
      IS_FINAL: !!gr.IS_FINAL,
    });
    setGroupModalOpen(true);
  };

  const handleGroupModalClose = () => {
    setGroupModalOpen(false);
    setGroupFormContext(null);
    setGroupEditTarget(null);
  };

  const handleGroupModalSave = async () => {
    if (!id || !groupFormContext) return;
    const { seasonNum, stageNum } = groupFormContext;

    if (groupModalMode === 'add') {
      const nameTrim = (newGroupName || '').trim();
      const hasSelectedTerm = groupForm.NAME_ID != null;
      if (!nameTrim && !hasSelectedTerm) {
        setSnackbar({ open: true, message: 'Group name is required', severity: 'error' });
        return;
      }
    }

    setGroupSaving(true);
    try {
      let nameId = groupForm.NAME_ID != null ? (groupForm.NAME_ID?.id ?? groupForm.NAME_ID) : null;
      if (groupModalMode === 'add') {
        const selectedTermId = groupForm.NAME_ID != null ? (groupForm.NAME_ID?.id ?? groupForm.NAME_ID) : null;
        if (selectedTermId) {
          nameId = selectedTermId;
        } else {
          const newTerm = await api.createTerm({
            category: 'Groups Names',
            values: [
              { languageId: 1, value: (newGroupName || '').trim(), isDefault: true, status: 'Approved' },
            ],
          });
          nameId = newTerm?.id ?? newTerm;
        }
      }
      let groupNum;
      if (groupModalMode === 'add') {
        const key = `${seasonNum}-${stageNum}`;
        const existing = groupsByStage[key] || [];
        const maxNum = existing.length ? Math.max(...existing.map((g) => Number(g.GROUP_NUM))) : 0;
        groupNum = maxNum + 1;
      } else {
        groupNum = groupEditTarget.GROUP_NUM;
      }
      const payload = {
        NAME_ID: nameId,
        HAS_TABLE: !!groupForm.HAS_TABLE,
        IS_SERIES: !!groupForm.IS_SERIES,
        USE_NAME: !!groupForm.USE_NAME,
        GROUP_BY: !!groupForm.GROUP_BY,
        AUTONOMOUS: !!groupForm.AUTONOMOUS,
        IS_FINAL: !!groupForm.IS_FINAL,
      };
      if (groupModalMode === 'add') {
        await api.createGroup(id, seasonNum, stageNum, { ...payload, GROUP_NUM: groupNum });
        setSnackbar({ open: true, message: 'Group created', severity: 'success' });
      } else {
        payload.TO_QUALIFY = groupEditTarget.TO_QUALIFY != null ? Number(groupEditTarget.TO_QUALIFY) : null;
        payload.NUM_OF_GAMES = groupEditTarget.NUM_OF_GAMES != null ? Number(groupEditTarget.NUM_OF_GAMES) : null;
        await api.updateGroup(id, seasonNum, stageNum, groupNum, payload);
        setSnackbar({ open: true, message: 'Group updated', severity: 'success' });
      }
      handleGroupModalClose();
      const sk = `${seasonNum}-${stageNum}`;
      const groups = await api.getGroups(id, seasonNum, stageNum);
      setGroupsByStage((prev) => ({ ...prev, [sk]: groups || [] }));
      const terms = await api.getTerms();
      setAllTerms(terms || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save group', severity: 'error' });
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = async (seasonNum, stageNum, gr) => {
    if (!id) return;
    if (!window.confirm(`Delete group ${gr.GROUP_NUM}?`)) return;
    try {
      await api.deleteGroup(id, seasonNum, stageNum, gr.GROUP_NUM);
      setSnackbar({ open: true, message: 'Group deleted', severity: 'success' });
      const sk = `${seasonNum}-${stageNum}`;
      const groups = await api.getGroups(id, seasonNum, stageNum);
      setGroupsByStage((prev) => ({ ...prev, [sk]: groups || [] }));
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete group', severity: 'error' });
    }
  };

  const handlePhaseNameClick = async (e, seasonNum, ph) => {
    e.stopPropagation();
    if (!ph?.PHASE_NAME_ID) return;
    try {
      const term = await api.getTermById(ph.PHASE_NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Phases Names');
      setTermModalGroupContext(null);
      setTermModalPhaseContext({ seasonNum });
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleAddPhase = (seasonNum) => {
    setPhaseModalMode('add');
    setPhaseFormContext({ seasonNum });
    setPhaseEditTarget(null);
    setNewPhaseName('');
    setPhaseForm({ PHASE_NUM: '', PHASE_NAME_ID: null, PARENT_PHASE_NUM: '', SHOW_STATS: true, USE_NAME: false, OVERTIME_LENGTH: '', TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: '' });
    setPhaseModalOpen(true);
  };

  const handleEditPhase = (seasonNum, ph) => {
    setPhaseModalMode('edit');
    setPhaseFormContext({ seasonNum });
    setPhaseEditTarget(ph);
    const termOpt = phaseTermOptions.find(t => t.id === ph.PHASE_NAME_ID);
    setPhaseForm({
      PHASE_NUM: ph.PHASE_NUM,
      PHASE_NAME_ID: termOpt || (ph.PHASE_NAME_ID ? { id: ph.PHASE_NAME_ID } : null),
      PARENT_PHASE_NUM: ph.PARENT_PHASE_NUM != null ? String(ph.PARENT_PHASE_NUM) : '',
      SHOW_STATS: !!ph.SHOW_STATS,
      USE_NAME: !!ph.USE_NAME,
      OVERTIME_LENGTH: ph.OVERTIME_LENGTH != null ? String(ph.OVERTIME_LENGTH) : '',
      TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: ph.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE != null ? String(ph.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE) : '',
    });
    setPhaseModalOpen(true);
  };

  const handlePhaseModalClose = () => {
    setPhaseModalOpen(false);
    setPhaseFormContext(null);
    setPhaseEditTarget(null);
    setNewPhaseName('');
  };

  const handlePhaseModalSave = async () => {
    if (!id || !phaseFormContext) return;
    const { seasonNum } = phaseFormContext;

    if (phaseModalMode === 'add') {
      const nameTrim = (newPhaseName || '').trim();
      const hasSelectedTerm = phaseForm.PHASE_NAME_ID != null;
      if (!nameTrim && !hasSelectedTerm) {
        setSnackbar({ open: true, message: 'Phase name is required', severity: 'error' });
        return;
      }
    }

    setPhaseSaving(true);
    try {
      let nameId = null;
      if (phaseModalMode === 'add') {
        const selectedTermId = phaseForm.PHASE_NAME_ID != null ? (phaseForm.PHASE_NAME_ID?.id ?? phaseForm.PHASE_NAME_ID) : null;
        if (selectedTermId) {
          nameId = selectedTermId;
        } else {
          const newTerm = await api.createTerm({
            category: 'Phases Names',
            values: [
              { languageId: 1, value: (newPhaseName || '').trim(), isDefault: true, status: 'Approved' },
            ],
          });
          nameId = newTerm?.id ?? newTerm;
        }
      } else {
        nameId = phaseForm.PHASE_NAME_ID != null ? (phaseForm.PHASE_NAME_ID?.id ?? phaseForm.PHASE_NAME_ID) : null;
      }
      const phaseNum = phaseModalMode === 'edit'
        ? phaseEditTarget.PHASE_NUM
        : (() => {
            const list = phasesBySeason[seasonNum] || [];
            return list.length === 0 ? 1 : Math.max(...list.map((p) => Number(p.PHASE_NUM))) + 1;
          })();
      const payload = {
        PHASE_NUM: phaseNum,
        PHASE_NAME_ID: nameId ?? null,
        PARENT_PHASE_NUM: phaseForm.PARENT_PHASE_NUM !== '' ? Number(phaseForm.PARENT_PHASE_NUM) : null,
        SHOW_STATS: !!phaseForm.SHOW_STATS,
        USE_NAME: !!phaseForm.USE_NAME,
        OVERTIME_LENGTH: phaseForm.OVERTIME_LENGTH !== '' ? Number(phaseForm.OVERTIME_LENGTH) : null,
        TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: phaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE !== '' ? Number(phaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE) : null,
      };
      if (phaseModalMode === 'add') {
        await api.createPhase(id, seasonNum, payload);
        setSnackbar({ open: true, message: 'Phase created', severity: 'success' });
      } else {
        await api.updatePhase(id, seasonNum, phaseEditTarget.PHASE_NUM, payload);
        setSnackbar({ open: true, message: 'Phase updated', severity: 'success' });
      }
      handlePhaseModalClose();
      loadStagesAndPhases(seasonNum);
      const terms = await api.getTerms();
      setAllTerms(terms || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save phase', severity: 'error' });
    } finally {
      setPhaseSaving(false);
    }
  };

  const handleDeletePhase = async (seasonNum, ph) => {
    if (!id) return;
    if (!window.confirm(`Delete phase ${ph.PHASE_NUM}?`)) return;
    try {
      await api.deletePhase(id, seasonNum, ph.PHASE_NUM);
      setSnackbar({ open: true, message: 'Phase deleted', severity: 'success' });
      loadStagesAndPhases(seasonNum);
      if (Number(ph.PHASE_NUM) === Number(selectedStructurePhaseNum)) {
        setSelectedStructurePhaseNum(null);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete phase', severity: 'error' });
    }
  };

  const loadCompetitorsTab = async () => {
    if (!id || competitorsSeasonNum == null) return;
    setCompetitorsLoading(true);
    setPageInSeason(0);
    setPageNotInSeason(0);
    try {
      const [inSeason, notInSeason] = await Promise.all([
        api.getSeasonCompetitors(id, competitorsSeasonNum),
        api.getCompetitorsNotInSeason(id, competitorsSeasonNum, {
          countryId: competitorsNotInSeasonFilters.countryId || undefined,
          name: competitorsNotInSeasonFilters.name.trim() || undefined,
          sourceCompetitionId: competitorsNotInSeasonFilters.competitionId || undefined,
        }),
      ]);
      setCompetitorsInSeason(inSeason || []);
      setCompetitorsNotInSeason(notInSeason || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load competitors', severity: 'error' });
    } finally {
      setCompetitorsLoading(false);
    }
  };

  const handleRemoveFromSeason = async (competitorId) => {
    if (!id || competitorsSeasonNum == null) return;
    try {
      await api.removeCompetitorFromSeason(id, competitorsSeasonNum, competitorId);
      setSnackbar({ open: true, message: 'Competitor removed from season', severity: 'success' });
      loadCompetitorsTab();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const handleSeasonCompetitorStatusSeedBlur = async (competitorId, field, value) => {
    if (!id || competitorsSeasonNum == null) return;
    const num = value === '' || value == null ? null : Number(value);
    try {
      await api.updateSeasonCompetitor(id, competitorsSeasonNum, competitorId, { [field]: num });
      setCompetitorsInSeason((prev) =>
        prev.map((r) => (r.COMPETITOR_ID === competitorId ? { ...r, [field]: num } : r))
      );
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
    }
  };

  const handleSeasonCompetitorStatusChange = async (competitorId, statusValue) => {
    if (!id || competitorsSeasonNum == null) return;
    const payload =
      statusValue === 'host'
        ? { HOST: true, JOIN_TYPE: 0 }
        : statusValue === 'promoted'
          ? { HOST: false, JOIN_TYPE: 1 }
          : statusValue === 'relegated'
            ? { HOST: false, JOIN_TYPE: 2 }
            : { HOST: false, JOIN_TYPE: 0 };
    try {
      const updated = await api.updateSeasonCompetitor(id, competitorsSeasonNum, competitorId, payload);
      setCompetitorsInSeason((prev) =>
        prev.map((r) => (r.COMPETITOR_ID === competitorId ? { ...r, ...updated } : r))
      );
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
    }
  };

  const handleSeasonCompetitorNotInSeasonChange = async (competitorId, checked) => {
    if (!id || competitorsSeasonNum == null) return;
    try {
      await api.updateSeasonCompetitor(id, competitorsSeasonNum, competitorId, { NOT_IN_SEASON: !!checked });
      setCompetitorsInSeason((prev) =>
        prev.map((r) => (r.COMPETITOR_ID === competitorId ? { ...r, NOT_IN_SEASON: !!checked } : r))
      );
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
    }
  };

  const handleRemoveSelectedFromSeason = async () => {
    if (!id || competitorsSeasonNum == null || selectedInSeason.length === 0) return;
    try {
      for (const cid of selectedInSeason) {
        await api.removeCompetitorFromSeason(id, competitorsSeasonNum, cid);
      }
      setSnackbar({ open: true, message: `${selectedInSeason.length} removed from season`, severity: 'success' });
      setSelectedInSeason([]);
      loadCompetitorsTab();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const handleAddToSeason = async () => {
    if (!id || competitorsSeasonNum == null || selectedNotInSeason.length === 0) return;
    try {
      await api.addCompetitorsToSeason(id, competitorsSeasonNum, selectedNotInSeason);
      setSnackbar({ open: true, message: `${selectedNotInSeason.length} added to season`, severity: 'success' });
      setSelectedNotInSeason([]);
      loadCompetitorsTab();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot add', severity: 'error' });
    }
  };

  const handleRemoveFromAllSeasonsClick = () => {
    if (selectedInSeason.length === 0 && selectedNotInSeason.length === 0) return;
    setRemoveFromAllSeasonsDialogOpen(true);
  };

  const handleRemoveFromAllSeasonsConfirm = async () => {
    if (!id) return;
    const ids = [...selectedInSeason, ...selectedNotInSeason];
    if (ids.length === 0) {
      setRemoveFromAllSeasonsDialogOpen(false);
      return;
    }
    try {
      await api.removeCompetitorsFromAllSeasons(id, ids);
      setSnackbar({ open: true, message: `${ids.length} removed from all seasons`, severity: 'success' });
      setSelectedInSeason([]);
      setSelectedNotInSeason([]);
      setRemoveFromAllSeasonsDialogOpen(false);
      loadCompetitorsTab();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const loadIntegrationPartnerIds = async () => {
    if (!id) return;
    try {
      const list = await api.getPartnerIdCompetitions(id);
      setPartnerIdList(list || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load partner IDs', severity: 'error' });
    }
  };

  const handleAddPartnerId = () => {
    setPartnerIdModalMode('add');
    setPartnerIdEditTarget(null);
    setPartnerIdForm({ DATA_SOURCE_ID: '', PARTNER_ID: '' });
    setPartnerIdModalOpen(true);
  };

  const handleEditPartnerId = (row) => {
    setPartnerIdModalMode('edit');
    setPartnerIdEditTarget(row);
    setPartnerIdForm({ DATA_SOURCE_ID: row.DATA_SOURCE_ID ?? '', PARTNER_ID: row.PARTNER_ID != null ? String(row.PARTNER_ID) : '' });
    setPartnerIdModalOpen(true);
  };

  const handlePartnerIdModalClose = () => {
    setPartnerIdModalOpen(false);
    setPartnerIdEditTarget(null);
  };

  const handlePartnerIdModalSave = async () => {
    if (!id) return;
    const dsId = partnerIdForm.DATA_SOURCE_ID != null && partnerIdForm.DATA_SOURCE_ID !== '' ? Number(partnerIdForm.DATA_SOURCE_ID) : null;
    if (dsId == null || isNaN(dsId)) {
      setSnackbar({ open: true, message: 'Data Source is required', severity: 'error' });
      return;
    }
    setPartnerIdSaving(true);
    try {
      await api.putPartnerId(id, dsId, partnerIdForm.PARTNER_ID || null);
      setSnackbar({ open: true, message: partnerIdModalMode === 'add' ? 'Partner ID added' : 'Partner ID updated', severity: 'success' });
      handlePartnerIdModalClose();
      loadIntegrationPartnerIds();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    } finally {
      setPartnerIdSaving(false);
    }
  };

  const handleDeletePartnerId = async (row) => {
    if (!id || row.DATA_SOURCE_ID == null) return;
    if (!window.confirm(`Remove partner ID for ${row.dataSourceName || `Data Source ${row.DATA_SOURCE_ID}`}?`)) return;
    try {
      await api.deletePartnerId(id, row.DATA_SOURCE_ID);
      setSnackbar({ open: true, message: 'Partner ID removed', severity: 'success' });
      loadIntegrationPartnerIds();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const loadGroupCompetitorsData = async (seasonNum, stageNum, groupNum) => {
    if (!id) return;
    setLoadingGroupCompetitors(true);
    try {
      const [inGroup, notInGroups] = await Promise.all([
        api.getGroupCompetitors(id, seasonNum, stageNum, groupNum),
        api.getCompetitorsNotInGroups(id, seasonNum, stageNum),
      ]);
      setGroupCompetitorsInGroup(inGroup || []);
      setGroupCompetitorsNotInGroups(notInGroups || []);
      setGroupCompetitorCounts((prev) => ({ ...prev, [groupNum]: (inGroup || []).length }));
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load group competitors', severity: 'error' });
    } finally {
      setLoadingGroupCompetitors(false);
    }
  };

  const handleExpandGroupForCompetitors = (seasonNum, stageNum, groupNum) => {
    const key = `${seasonNum}-${stageNum}-${groupNum}`;
    const next = expandedGroupKey === key ? null : key;
    setExpandedGroupKey(next);
    setSelectedInGroup([]);
    setSelectedNotInGroups([]);
    if (next) loadGroupCompetitorsData(seasonNum, stageNum, groupNum);
  };

  const handleAddToGroup = async (seasonNum, stageNum, groupNum) => {
    if (!id || selectedNotInGroups.length === 0) return;
    try {
      await api.addCompetitorsToGroup(id, seasonNum, stageNum, groupNum, selectedNotInGroups);
      setSnackbar({ open: true, message: `${selectedNotInGroups.length} added to group`, severity: 'success' });
      setSelectedNotInGroups([]);
      loadGroupCompetitorsData(seasonNum, stageNum, groupNum);
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot add to group', severity: 'error' });
    }
  };

  const handleRemoveFromGroup = async (seasonNum, stageNum, groupNum, competitorId) => {
    if (!id) return;
    try {
      await api.removeCompetitorFromGroup(id, seasonNum, stageNum, groupNum, competitorId);
      setSnackbar({ open: true, message: 'Competitor removed from group', severity: 'success' });
      loadGroupCompetitorsData(seasonNum, stageNum, groupNum);
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const handleRemoveSelectedFromGroup = async (seasonNum, stageNum, groupNum) => {
    if (!id || selectedInGroup.length === 0) return;
    try {
      for (const cid of selectedInGroup) {
        await api.removeCompetitorFromGroup(id, seasonNum, stageNum, groupNum, cid);
      }
      setSnackbar({ open: true, message: `${selectedInGroup.length} removed from group`, severity: 'success' });
      setSelectedInGroup([]);
      loadGroupCompetitorsData(seasonNum, stageNum, groupNum);
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot remove', severity: 'error' });
    }
  };

  const handleParticipantNumChange = async (seasonNum, stageNum, groupNum, competitorId, value) => {
    if (!id) return;
    const num = value === '' || value === null ? null : Number(value);
    try {
      await api.updateGroupCompetitorParticipant(id, seasonNum, stageNum, groupNum, competitorId, num);
      setGroupCompetitorsInGroup((prev) => prev.map((r) => (r.COMPETITOR_ID === competitorId ? { ...r, PARTICIPANT_NUM: num } : r)));
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update', severity: 'error' });
    }
  };

  const loadGroupGamesAndParticipants = async (seasonNum, stageNum, groupNum) => {
    if (!id) return;
    setLoadingGroupGames(true);
    setLoadingGroupParticipants(true);
    try {
      const [games, participants] = await Promise.all([
        api.getGroupGames(id, seasonNum, stageNum, groupNum),
        api.getGroupParticipants(id, seasonNum, stageNum, groupNum),
      ]);
      setGroupGames(games || []);
      setGroupParticipants(participants || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to load', severity: 'error' });
    } finally {
      setLoadingGroupGames(false);
      setLoadingGroupParticipants(false);
    }
  };

  const handleAddGroupGame = async (seasonNum, stageNum, groupNum) => {
    if (!id) return;
    try {
      await api.createGroupGame(id, seasonNum, stageNum, groupNum, {});
      setSnackbar({ open: true, message: 'Game added', severity: 'success' });
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot add game', severity: 'error' });
    }
  };

  const handleDeleteGroupGame = async (seasonNum, stageNum, groupNum, gameNum) => {
    if (!id || !window.confirm('Delete this game?')) return;
    try {
      await api.deleteGroupGame(id, seasonNum, stageNum, groupNum, gameNum);
      setSnackbar({ open: true, message: 'Game deleted', severity: 'success' });
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete', severity: 'error' });
    }
  };

  const handleSaveGroupGame = async (seasonNum, stageNum, groupNum, gameNum, data, rowIndex) => {
    if (!id) return;
    try {
      await api.updateGroupGame(id, seasonNum, stageNum, groupNum, gameNum, data);
      setSnackbar({ open: true, message: 'Game saved', severity: 'success' });
      setGroupGames((prev) => prev.map((g, i) => (i === rowIndex ? { ...g, ...data } : g)));
      setEditingGroupGameIndex(null);
      setEditingGroupGameOriginalNum(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot save', severity: 'error' });
    }
  };

  const handleAddGroupParticipant = (seasonNum, stageNum, groupNum) => {
    setParticipantAddContext({ seasonNum, stageNum, groupNum });
    setNewParticipantName('');
    setParticipantSelectedTermId(null);
    setParticipantAddDialogOpen(true);
  };

  const handleAddParticipantConfirm = async () => {
    if (!id || !participantAddContext) return;
    const nameTrim = (newParticipantName || '').trim();
    const hasSelectedTerm = participantSelectedTermId != null && participantSelectedTermId !== 0;
    if (!nameTrim && !hasSelectedTerm) {
      setSnackbar({ open: true, message: 'Please enter or select participant name', severity: 'error' });
      return;
    }
    setParticipantAddSaving(true);
    try {
      let nameId = participantSelectedTermId;
      if (!nameId) {
        const newTerm = await api.createTerm({
          category: 'Participants Names',
          values: [{ languageId: 1, value: nameTrim, isDefault: true, status: 'Approved' }],
        });
        nameId = newTerm?.id ?? newTerm;
        const terms = await api.getTerms();
        setAllTerms(terms || []);
      }
      await api.createGroupParticipant(id, participantAddContext.seasonNum, participantAddContext.stageNum, participantAddContext.groupNum, { NAME_ID: nameId });
      setSnackbar({ open: true, message: 'Participant added', severity: 'success' });
      loadGroupGamesAndParticipants(participantAddContext.seasonNum, participantAddContext.stageNum, participantAddContext.groupNum);
      setParticipantAddDialogOpen(false);
      setParticipantAddContext(null);
      setNewParticipantName('');
      setParticipantSelectedTermId(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot add participant', severity: 'error' });
    } finally {
      setParticipantAddSaving(false);
    }
  };

  const handleParticipantNameClick = async (e, p, seasonNum, stageNum, groupNum) => {
    e.stopPropagation();
    if (!p?.NAME_ID) return;
    try {
      const term = await api.getTermById(p.NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Participants Names');
      setTermModalGroupContext(null);
      setTermModalPhaseContext(null);
      setTermModalParticipantContext({ seasonNum, stageNum, groupNum });
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleDeleteGroupParticipant = async (seasonNum, stageNum, groupNum, participantNum) => {
    if (!id || !window.confirm('Delete this participant?')) return;
    try {
      await api.deleteGroupParticipant(id, seasonNum, stageNum, groupNum, participantNum);
      setSnackbar({ open: true, message: 'Participant deleted', severity: 'success' });
      loadGroupGamesAndParticipants(seasonNum, stageNum, groupNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot delete', severity: 'error' });
    }
  };

  const handleSaveGroupParticipant = async (seasonNum, stageNum, groupNum, participantNum, data) => {
    if (!id) return;
    try {
      await api.updateGroupParticipant(id, seasonNum, stageNum, groupNum, participantNum, data);
      setSnackbar({ open: true, message: 'Participant saved', severity: 'success' });
      setGroupParticipants((prev) => prev.map((p) => (Number(p.PARTICIPANT_NUM) === Number(participantNum) ? { ...p, ...data } : p)));
      setEditingGroupParticipantIndex(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Cannot save', severity: 'error' });
    }
  };

  const loadCompetition = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      let comp;
      try {
        comp = await api.getCompetitionById(id);
      } catch (e) {
        const list = await api.getCompetitions();
        comp = (list || []).find((c) => String(c.COMPETITION_ID) === String(id)) || null;
      }
      if (!comp) {
        setError('Competition not found');
        setCompetition(null);
        return;
      }
      setCompetition(comp);
      setCompetitionImageError(false);
      setTrophyImageError(false);
      // Full competition object in formData for Configurations tab; colors as hex for UI
      setFormData({
        ...comp,
        MAIN_COLOR: numberToHex(comp.MAIN_COLOR) || '#000000',
        SECONDARY_COLOR: numberToHex(comp.SECONDARY_COLOR) || '#ffffff',
        NAME_ID: comp.NAME_ID ?? '',
        FATHER_COMPETITION: comp.FATHER_COMPETITION ?? '',
        STANDING_TYPE: comp.STANDING_TYPE ?? '',
        HOST_CITY: comp.HOST_CITY ?? '',
      });
      const [compList, seasons] = await Promise.all([
        api.getCompetitions(),
        api.getSeasons(id),
      ]);
      setAllCompetitions(compList || []);
      setGeneralDetailsSeasons(seasons || []);
      if (comp.CURRENT_SEASON != null && comp.CURRENT_SEASON !== '') {
        const stages = await api.getStages(id, comp.CURRENT_SEASON);
        setGeneralDetailsStages(stages || []);
      } else {
        setGeneralDetailsStages([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load competition');
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTermsAndCategories = async () => {
    try {
      const [terms, categories] = await Promise.all([api.getTerms(), api.getCategories()]);
      setAllTerms(terms || []);
      setAllCategories(categories || []);
    } catch (err) {
      console.warn('Failed to load terms/categories:', err);
    }
  };

  const loadCountriesAndSports = async () => {
    try {
      const [c, s, g, ct, st, sst, compt, pl, stgTypes] = await Promise.all([
        api.getCountries(),
        api.getSports(),
        api.getGenders(),
        api.getCompetitionTypes(),
        api.getStandingTypes(),
        api.getSubSportTypes(),
        api.getCompetitorTypes(),
        api.getPriorityLevels(),
        api.getStagesTypes(),
      ]);
      setCountries(c || []);
      setSports(s || []);
      setGenders(g || []);
      setCompetitionTypes(ct || []);
      setStandingTypes(st || []);
      setSubSportTypes(sst || []);
      setCompetitorTypes(compt || []);
      setPriorityLevels(pl || []);
      setStagesTypes(stgTypes || []);
    } catch (err) {
      console.warn('Failed to load dropdown data:', err);
    }
  };

  const handleBack = () => navigate('/competitions');

  const handleNameClick = async () => {
    if (!competition?.NAME_ID) return;
    try {
      const term = await api.getTermById(competition.NAME_ID);
      setCurrentTerm(term);
      setTermModalCategory('Competitions Names');
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const currentSeasonObj = generalDetailsSeasons.find((s) => Number(s.SEASON_NUM) === Number(competition?.CURRENT_SEASON));
  const currentStageObj = generalDetailsStages.find((s) => Number(s.STAGE_NUM) === Number(competition?.CURRENT_STAGE));

  const fatherCompetitionId = formData.FATHER_COMPETITION != null && formData.FATHER_COMPETITION !== '' ? (Number(formData.FATHER_COMPETITION) || formData.FATHER_COMPETITION) : null;
  const fatherCompetitionName = fatherCompetitionId != null ? (allCompetitions.find((c) => Number(c.COMPETITION_ID) === Number(fatherCompetitionId))?.name ?? null) : null;

  const cityCategoryId = (allCategories || []).find((c) => c.name === 'Cities')?.id;
  const cityTerms = (allTerms || []).filter((t) => t.categoryId === cityCategoryId);
  const resolveTermDisplayValue = (t) => (t?.engValue || (t?.values && t.values[0] && t.values[0].value) || (t?.id != null ? `Term ${t.id}` : ''));
  const hostCityTerm = (formData.HOST_CITY != null && String(formData.HOST_CITY).trim() !== '')
    ? cityTerms.find((t) => resolveTermDisplayValue(t) === String(formData.HOST_CITY).trim())
    : null;

  const finalsCategoryId = (allCategories || []).find((c) => c.name === 'Finals')?.id;
  const finalsTerms = (allTerms || []).filter((t) => t.categoryId === finalsCategoryId || t.category === 'Finals');
  const bracketFinalDisplayValue = formData.BRACKET_FINAL_DESCRIPTION ?? competition?.BRACKET_FINAL_DESCRIPTION ?? '';
  const bracketFinalTrimmed = bracketFinalDisplayValue != null ? String(bracketFinalDisplayValue).trim() : '';
  const bracketFinalTerm = bracketFinalTrimmed !== ''
    ? (finalsTerms.find((t) => resolveTermDisplayValue(t) === bracketFinalTrimmed) || (allTerms || []).find((t) => resolveTermDisplayValue(t) === bracketFinalTrimmed))
    : null;
  const bracketFinalHasValue = bracketFinalTrimmed !== '';

  const roundsCategoryId = (allCategories || []).find((c) => c.name === 'Rounds Names')?.id;
  const roundsTerms = (allTerms || []).filter((t) => t.categoryId === roundsCategoryId || t.category === 'Rounds Names');
  const tableDestinationsCategoryId = (allCategories || []).find((c) => c.name === 'Table Destinations')?.id ?? 60;
  const tableDestinationsTermOptions = (allTerms || []).filter((t) => t.categoryId === tableDestinationsCategoryId || t.category === 'Table Destinations');
  const pointsDeductionReasonsCategoryId = (allCategories || []).find((c) => c.name === 'Points Deduction Reasons')?.id ?? 61;
  const pointsDeductionReasonsTermOptions = (allTerms || []).filter((t) => t.categoryId === pointsDeductionReasonsCategoryId || t.category === 'Points Deduction Reasons');
  const positionTableNamesCategoryId = (allCategories || []).find((c) => c.name === 'Position Table Names')?.id;
  const positionTableNamesTermOptions = (allTerms || []).filter((t) => t.categoryId === positionTableNamesCategoryId || t.category === 'Position Table Names');
  const roundNameDisplayValue = formData.SELECT_ROUND_NAME ?? competition?.SELECT_ROUND_NAME ?? '';
  const roundNameTrimmed = roundNameDisplayValue != null ? String(roundNameDisplayValue).trim() : '';
  const roundNameTerm = roundNameTrimmed !== ''
    ? (roundsTerms.find((t) => resolveTermDisplayValue(t) === roundNameTrimmed) || (allTerms || []).find((t) => resolveTermDisplayValue(t) === roundNameTrimmed))
    : null;
  const roundNameHasValue = roundNameTrimmed !== '';

  const sportTypeId = formData.SPORT_TYPE_ID ?? competition?.SPORT_TYPE_ID;
  const isTennisCompetition = Number(sportTypeId) === 3; // Tennis = SPORT_TYPE_ID 3

  const handleHostCityNameClick = async () => {
    if (!hostCityTerm?.id) return;
    try {
      const term = await api.getTermById(hostCityTerm.id);
      setCurrentTerm(term);
      setTermModalCategory('Cities');
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleBracketFinalNameClick = async () => {
    if (!bracketFinalTerm?.id) return;
    try {
      const term = await api.getTermById(bracketFinalTerm.id);
      setCurrentTerm(term);
      setTermModalCategory('Finals');
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleCreateBracketFinalSave = async () => {
    const name = (createBracketFinalName || '').trim();
    if (!name) {
      setSnackbar({ open: true, message: 'Bracket Final name is required', severity: 'warning' });
      return;
    }
    try {
      await api.createTerm({
        category: 'Finals',
        values: [{ languageId: 1, value: name, isDefault: true, status: 'Approved' }],
      });
      const terms = await api.getTerms();
      setAllTerms(terms || []);
      handleFormChange('BRACKET_FINAL_DESCRIPTION', name);
      setCreateBracketFinalDialogOpen(false);
      setCreateBracketFinalName('');
      setBracketFinalInputValue('');
      setSnackbar({ open: true, message: 'Bracket Final term created', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create Bracket Final term', severity: 'error' });
    }
  };

  const handleRoundNameClick = async () => {
    if (!roundNameTerm?.id) return;
    try {
      const term = await api.getTermById(roundNameTerm.id);
      setCurrentTerm(term);
      setTermModalCategory('Rounds Names');
      setTermModalOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load term', severity: 'error' });
    }
  };

  const handleCreateRoundNameSave = async () => {
    const name = (createRoundNameName || '').trim();
    if (!name) {
      setSnackbar({ open: true, message: 'Round Name is required', severity: 'warning' });
      return;
    }
    try {
      await api.createTerm({
        category: 'Rounds Names',
        values: [{ languageId: 1, value: name, isDefault: true, status: 'Approved' }],
      });
      const terms = await api.getTerms();
      setAllTerms(terms || []);
      handleFormChange('SELECT_ROUND_NAME', name);
      setCreateRoundNameDialogOpen(false);
      setCreateRoundNameName('');
      setRoundNameInputValue('');
      setSnackbar({ open: true, message: 'Round Name term created', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create Round Name term', severity: 'error' });
    }
  };

  const handleSave = async () => {
    if (!id || !competition) return;
    // 5.4 / 5.5: validate data types before save
    const w = formData.TABLE_WINNER_POINTS !== '' && formData.TABLE_WINNER_POINTS != null ? Number(formData.TABLE_WINNER_POINTS) : null;
    const d = formData.TABLE_DRAW_POINTS !== '' && formData.TABLE_DRAW_POINTS != null ? Number(formData.TABLE_DRAW_POINTS) : null;
    const l = formData.TABLE_LOSER_POINTS !== '' && formData.TABLE_LOSER_POINTS != null ? Number(formData.TABLE_LOSER_POINTS) : null;
    if (w != null && isNaN(w)) { setSnackbar({ open: true, message: 'Winner points must be a number', severity: 'error' }); return; }
    if (d != null && isNaN(d)) { setSnackbar({ open: true, message: 'Draw points must be a number', severity: 'error' }); return; }
    if (l != null && isNaN(l)) { setSnackbar({ open: true, message: 'Loser points must be a number', severity: 'error' }); return; }
    const mainHex = (formData.MAIN_COLOR || '').toString().trim();
    const secHex = (formData.SECONDARY_COLOR || '').toString().trim();
    if (mainHex && !/^#[0-9a-fA-F]{6}$/.test(mainHex)) { setSnackbar({ open: true, message: 'Main color must be a valid hex (e.g. #FFFFFF)', severity: 'error' }); return; }
    if (secHex && !/^#[0-9a-fA-F]{6}$/.test(secHex)) { setSnackbar({ open: true, message: 'Secondary color must be a valid hex (e.g. #FFFFFF)', severity: 'error' }); return; }
    try {
      const mainNum = hexToNumber(formData.MAIN_COLOR);
      const secNum = hexToNumber(formData.SECONDARY_COLOR);
      // Build payload from formData (Configurations + General Details); exclude COMPETITION_ID
      const payload = { ...competition, ...formData };
      delete payload.COMPETITION_ID;
      payload.MAIN_COLOR = mainNum ?? competition.MAIN_COLOR;
      payload.SECONDARY_COLOR = secNum != null ? secNum : competition.SECONDARY_COLOR;
      // Ensure types for key fields
      if (w != null) payload.TABLE_WINNER_POINTS = w;
      if (d != null) payload.TABLE_DRAW_POINTS = d;
      if (l != null) payload.TABLE_LOSER_POINTS = l;
      payload.COUNTRY_ID = formData.COUNTRY_ID !== '' && formData.COUNTRY_ID != null ? Number(formData.COUNTRY_ID) : (competition.COUNTRY_ID ?? null);
      payload.SPORT_TYPE_ID = formData.SPORT_TYPE_ID !== '' && formData.SPORT_TYPE_ID != null ? Number(formData.SPORT_TYPE_ID) : (competition.SPORT_TYPE_ID ?? null);
      payload.GENDER = formData.GENDER !== '' && formData.GENDER != null ? Number(formData.GENDER) : competition.GENDER;
      payload.COMPETITION_TYPE = formData.COMPETITION_TYPE !== '' && formData.COMPETITION_TYPE != null ? Number(formData.COMPETITION_TYPE) : competition.COMPETITION_TYPE;
      payload.FATHER_COMPETITION = formData.FATHER_COMPETITION != null && formData.FATHER_COMPETITION !== '' ? String(formData.FATHER_COMPETITION).trim() : '';
      payload.HOST_CITY = formData.HOST_CITY != null ? String(formData.HOST_CITY).trim() : (competition.HOST_CITY ?? '');
      payload.CURRENT_ROUND = formData.CURRENT_ROUND !== '' && formData.CURRENT_ROUND != null && !isNaN(Number(formData.CURRENT_ROUND)) ? Number(formData.CURRENT_ROUND) : competition.CURRENT_ROUND;
      // Statistics: direct mapping to DB field TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE
      const minAppearancesPct = formData.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE;
      payload.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE = (minAppearancesPct !== '' && minAppearancesPct != null && !isNaN(Number(minAppearancesPct))) ? Number(minAppearancesPct) : null;
      await api.updateCompetition(id, payload);
      setSnackbar({ open: true, message: 'Competition saved', severity: 'success' });
      loadCompetition();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const orderByList = deduplicateOrderByList(parseOrderBy(formData.ORDER_BY ?? competition?.ORDER_BY));
  const handleAddOrderByItem = () => {
    if (!tableOrderByNewField) return;
    if (orderByList.some((item) => item.field === tableOrderByNewField)) return;
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
    e.dataTransfer.setData('text/plain', String(index));
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

  const hasGeneralDetailsChanges = useMemo(() => {
    if (!competition) return false;
    const norm = (v) => (v === null || v === undefined || v === '' ? null : v);
    const getForm = (k) => norm(formData[k]);
    const getComp = (k) => {
      if (k === 'MAIN_COLOR') return norm(numberToHex(competition.MAIN_COLOR) || '');
      if (k === 'SECONDARY_COLOR') return norm(numberToHex(competition.SECONDARY_COLOR) || '');
      return norm(competition[k]);
    };
    for (const k of GENERAL_DETAILS_KEYS) {
      const f = getForm(k);
      const c = getComp(k);
      if (k === 'COUNTRY_ID' || k === 'SPORT_TYPE_ID' || k === 'GENDER' || k === 'COMPETITION_TYPE' || k === 'SUB_SPORT_TYPE' || k === 'COMPETITORS_TYPE') {
        if (String(f ?? '') !== String(c ?? '')) return true;
      } else if (k === 'HIDE_ON_SEARCH' || k === 'HIDE_ON_CATALOG' || k === 'ENABLE_DASHBOARD_BUZZ' || k === 'SUPPORT_COMPETITION_DASHBOARD' || k === 'HIDE_LMT') {
        if (!!(formData[k] ?? false) !== !!(competition[k] ?? false)) return true;
      } else {
        if (String(f ?? '') !== String(c ?? '')) return true;
      }
    }
    return false;
  }, [formData, competition]);

  const hasExtendedDetailsChanges = useMemo(() => {
    if (!competition) return false;
    const norm = (v) => (v === null || v === undefined || v === '' ? null : v);
    const formKeys = Object.keys(formData).filter((k) => !GENERAL_DETAILS_KEYS.includes(k));
    for (const k of formKeys) {
      const fv = formData[k];
      const cv = competition[k];
      if (k === 'ORDER_BY') {
        const fSer = serializeOrderBy(deduplicateOrderByList(parseOrderBy(fv ?? '')));
        const cSer = serializeOrderBy(deduplicateOrderByList(parseOrderBy(cv ?? '')));
        if (fSer !== cSer) return true;
      } else if (typeof fv === 'boolean' || typeof cv === 'boolean') {
        if (!!fv !== !!cv) return true;
      } else if (typeof fv === 'number' || typeof cv === 'number' || TABLE_POINT_KEYS.includes(k)) {
        const fn = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
        const fN = fn(fv);
        const cN = fn(cv);
        if (Number.isNaN(fN) && Number.isNaN(cN)) continue;
        if ((fN ?? null) !== (cN ?? null)) return true;
      } else if (String(norm(fv) ?? '') !== String(norm(cv) ?? '')) {
        return true;
      }
    }
    const origSeason = structureSeasons.find((s) => s.SEASON_NUM === selectedStructureSeasonNum);
    if (structureSeasonForm && origSeason) {
      const seasonKeys = ['NAME_ID', 'SEASON_KEY', 'START_DATE', 'END_DATE', 'USE_NAME', 'SHOW_TOP_ATHLETES', 'HAS_BRACKETS', 'HAS_TABLE', 'SHOW_INFO_CARD', 'HAS_SEED', 'SHOW_TOP_TEAMS_TAB', 'SHOW_OUTRIGHTS_TAB', 'PRESENT_COMPETITION_RULES', 'SHOW_MATCHES'];
      for (const k of seasonKeys) {
        const fv = structureSeasonForm[k];
        const ov = origSeason[k];
        const fn = k === 'NAME_ID' ? (v) => (v?.id ?? v ?? null) : (v) => (v === null || v === undefined ? null : (typeof v === 'boolean' ? !!v : v));
        if (String(fn(fv) ?? '') !== String(fn(ov) ?? '')) return true;
      }
    }
    const stages = stagesBySeason[selectedStructureSeasonNum] || [];
    const origStage = stages.find((s) => Number(s.STAGE_NUM) === Number(selectedStructureStageNum));
    if (structureStageForm && origStage) {
      const stageKeys = ['NAME_ID', 'NUM_OF_GAMES', 'STAGE_TYPE', 'HAS_TABLE', 'IS_SERIES', 'CONNECTED_TO_PREVIOUS_STAGE', 'FILTER_DIVISION', 'INCLUDE_IN_BRACKET', 'PRE_VISUAL_BRACKETS', 'CONNECTED_IN_BRACKETS', 'PHASE', 'START_DATE', 'END_DATE', 'HAS_HOME_TABLE', 'HAS_AWAY_TABLE', 'HIDE_HOME_AWAY_TABLES', 'HIDE_MAIN_TABLE', 'HAS_POSITION_TABLE', 'POSITION_PARAMETER', 'POSITION_TABLE_NAME', 'AGGREGATED_TABLE_SETTINGS', 'RELEGATION_TABLE_SETTINGS'];
      const posNameF = (f) => (f?.POSITION_TABLE_NAME_ID ?? f?.POSITION_TABLE_NAME ?? null);
      const posNameO = (o) => (o?.POSITION_TABLE_NAME_ID ?? o?.POSITION_TABLE_NAME ?? null);
      for (const k of stageKeys) {
        if (k === 'POSITION_TABLE_NAME') {
          if (String(posNameF(structureStageForm) ?? '') !== String(posNameO(origStage) ?? '')) return true;
          continue;
        }
        const fv = structureStageForm[k];
        const ov = origStage[k];
        const fn = (v) => {
          if (v === null || v === undefined || v === '') return null;
          if (k === 'NAME_ID') return v?.id ?? v ?? null;
          return typeof v === 'boolean' ? !!v : v;
        };
        if (String(fn(fv) ?? '') !== String(fn(ov) ?? '')) return true;
      }
    }
    const phases = phasesBySeason[selectedStructureSeasonNum] || [];
    const origPhase = phases.find((p) => Number(p.PHASE_NUM) === Number(selectedStructurePhaseNum));
    if (structurePhaseForm && origPhase) {
      const phaseKeys = ['PHASE_NAME_ID', 'PARENT_PHASE_NUM', 'SHOW_STATS', 'USE_NAME', 'OVERTIME_LENGTH', 'TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE'];
      for (const k of phaseKeys) {
        const fv = structurePhaseForm[k];
        const ov = origPhase[k];
        const fn = (v) => {
          if (v === null || v === undefined || v === '') return null;
          if (k === 'PHASE_NAME_ID') return v?.id ?? v ?? null;
          return typeof v === 'boolean' ? !!v : v;
        };
        if (String(fn(fv) ?? '') !== String(fn(ov) ?? '')) return true;
      }
    }
    const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
    const groups = groupsByStage[key] || [];
    const origGroup = groups.find((g) => Number(g.GROUP_NUM) === Number(selectedStructureGroupNum));
    if (structureGroupForm && origGroup) {
      const groupKeys = ['NAME_ID', 'GROUP_CATEGORY_NUM', 'FATHER_GROUP', 'HAS_TABLE', 'IS_SERIES', 'USE_NAME', 'GROUP_BY', 'AUTONOMOUS', 'IS_FINAL'];
      const nameIdF = (f) => (f?.NAME_ID?.id ?? f?.NAME_ID ?? null);
      const nameIdO = (o) => (o?.NAME_ID ?? null);
      for (const k of groupKeys) {
        if (k === 'NAME_ID') continue;
        const fv = structureGroupForm[k];
        const ov = origGroup[k];
        const fn = (v) => (v === null || v === undefined || v === '' ? null : (typeof v === 'boolean' ? !!v : v));
        if (String(fn(fv) ?? '') !== String(fn(ov) ?? '')) return true;
      }
      if (String(nameIdF(structureGroupForm) ?? '') !== String(nameIdO(origGroup) ?? '')) return true;
    }
    // Winners tab changes
    if (winnersData.length !== winnersOriginalData.length) return true;
    for (let i = 0; i < winnersData.length; i++) {
      const w = winnersData[i];
      const o = winnersOriginalData[i];
      if (!o || w.seasonNum !== o.seasonNum || w.competitorId !== o.competitorId ||
          (w.coach?.athleteId ?? null) !== (o.coach?.athleteId ?? null)) return true;
    }
    return false;
  }, [formData, competition, structureSeasonForm, structureStageForm, structurePhaseForm, structureGroupForm, structureSeasons, stagesBySeason, phasesBySeason, groupsByStage, selectedStructureSeasonNum, selectedStructureStageNum, selectedStructurePhaseNum, selectedStructureGroupNum, winnersData, winnersOriginalData]);

  const hasWinnersChanges = useMemo(() => {
    if (winnersData.length !== winnersOriginalData.length) return true;
    for (let i = 0; i < winnersData.length; i++) {
      const w = winnersData[i];
      const o = winnersOriginalData[i];
      if (!o || w.seasonNum !== o.seasonNum || w.competitorId !== o.competitorId ||
          (w.coach?.athleteId ?? null) !== (o.coach?.athleteId ?? null)) return true;
    }
    return false;
  }, [winnersData, winnersOriginalData]);

  const handleSaveWinners = async () => {
    if (!id || !hasWinnersChanges) return;
    try {
      const payload = winnersData.map((w) => ({
        seasonNum: w.seasonNum,
        competitorId: w.competitorId,
        coachAthleteId: w.coach?.athleteId ?? null,
      }));
      await api.saveCompetitionWinners(id, payload);
      setSnackbar({ open: true, message: 'Winners saved', severity: 'success' });
      const rows = await api.getCompetitionWinners(id);
      setWinnersData(rows);
      setWinnersOriginalData(JSON.parse(JSON.stringify(rows)));
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save Winners', severity: 'error' });
    }
  };

  const winnersAvailableSeasons = useMemo(() => {
    const takenSeasons = new Set(winnersData.map((w) => w.seasonNum));
    if (winnersEditingIdx != null && winnersEditingIdx !== 'new') {
      const editingRow = winnersData[winnersEditingIdx];
      if (editingRow) takenSeasons.delete(editingRow.seasonNum);
    }
    return winnersAllSeasons.filter((s) => !takenSeasons.has(s.SEASON_NUM));
  }, [winnersAllSeasons, winnersData, winnersEditingIdx]);

  const handleWinnersStartEdit = async (idx) => {
    const row = winnersData[idx];
    setWinnersEditingIdx(idx);
    setWinnersEditForm({
      seasonNum: row.seasonNum,
      competitorId: row.competitorId,
      coachAthleteId: row.coach?.athleteId ?? '',
      coachName: row.coach?.name ?? '',
    });
    setWinnersCoachError('');
    try {
      const sc = await api.getSeasonCompetitors(id, row.seasonNum);
      setWinnersSeasonCompetitors(sc.filter((c) => !c.NOT_IN_SEASON));
    } catch {
      setWinnersSeasonCompetitors([]);
    }
  };

  const handleWinnersSeasonChange = async (seasonNum) => {
    setWinnersEditForm((prev) => ({ ...prev, seasonNum, competitorId: '', coachAthleteId: '', coachName: '' }));
    setWinnersCoachError('');
    try {
      const sc = await api.getSeasonCompetitors(id, seasonNum);
      setWinnersSeasonCompetitors(sc.filter((c) => !c.NOT_IN_SEASON));
    } catch {
      setWinnersSeasonCompetitors([]);
    }
  };

  const handleWinnersCompetitorChange = (competitorId) => {
    const comp = winnersSeasonCompetitors.find((c) => c.COMPETITOR_ID === competitorId);
    setWinnersEditForm((prev) => ({
      ...prev,
      competitorId,
      competitorName: comp?.name || '',
      competitorLogo: comp?.logoUrl || null,
    }));
  };

  const handleWinnersCoachValidate = async (athleteIdStr) => {
    setWinnersEditForm((prev) => ({ ...prev, coachAthleteId: athleteIdStr, coachName: '' }));
    setWinnersCoachError('');
    if (!athleteIdStr || athleteIdStr === '') return;
    const athleteId = parseInt(athleteIdStr, 10);
    if (isNaN(athleteId)) { setWinnersCoachError('Invalid ID'); return; }
    setWinnersCoachValidating(true);
    try {
      const result = await api.validateCoach(athleteId);
      if (!result.valid) {
        setWinnersCoachError(result.reason || 'Not a valid coach');
      } else {
        setWinnersEditForm((prev) => ({ ...prev, coachName: result.name }));
      }
    } catch {
      setWinnersCoachError('Failed to validate');
    } finally {
      setWinnersCoachValidating(false);
    }
  };

  const handleWinnersEditSave = () => {
    if (winnersCoachError) return;
    const f = winnersEditForm;
    if (!f.seasonNum || !f.competitorId) return;
    const season = winnersAllSeasons.find((s) => s.SEASON_NUM === f.seasonNum);
    const comp = winnersSeasonCompetitors.find((c) => c.COMPETITOR_ID === f.competitorId);
    const updated = [...winnersData];
    updated[winnersEditingIdx] = {
      seasonNum: f.seasonNum,
      seasonName: season?.name || `Season ${f.seasonNum}`,
      competitorId: f.competitorId,
      competitorName: comp?.name || f.competitorName || `Competitor ${f.competitorId}`,
      competitorLogo: comp?.logoUrl || f.competitorLogo || null,
      coach: f.coachAthleteId ? { athleteId: parseInt(f.coachAthleteId, 10), name: f.coachName || `Athlete ${f.coachAthleteId}` } : null,
    };
    updated.sort((a, b) => b.seasonNum - a.seasonNum);
    setWinnersData(updated);
    setWinnersEditingIdx(null);
    setWinnersEditForm({});
  };

  const handleWinnersEditCancel = () => {
    setWinnersEditingIdx(null);
    setWinnersEditForm({});
    setWinnersCoachError('');
  };

  const handleWinnersAddNew = () => {
    setWinnersEditingIdx('new');
    setWinnersEditForm({ seasonNum: '', competitorId: '', coachAthleteId: '', coachName: '' });
    setWinnersCoachError('');
    setWinnersSeasonCompetitors([]);
  };

  const handleWinnersAddSave = () => {
    if (winnersCoachError) return;
    const f = winnersEditForm;
    if (!f.seasonNum || !f.competitorId) return;
    const season = winnersAllSeasons.find((s) => s.SEASON_NUM === f.seasonNum);
    const comp = winnersSeasonCompetitors.find((c) => c.COMPETITOR_ID === f.competitorId);
    const newRow = {
      seasonNum: f.seasonNum,
      seasonName: season?.name || `Season ${f.seasonNum}`,
      competitorId: f.competitorId,
      competitorName: comp?.name || `Competitor ${f.competitorId}`,
      competitorLogo: comp?.logoUrl || null,
      coach: f.coachAthleteId ? { athleteId: parseInt(f.coachAthleteId, 10), name: f.coachName || `Athlete ${f.coachAthleteId}` } : null,
    };
    const updated = [...winnersData, newRow].sort((a, b) => b.seasonNum - a.seasonNum);
    setWinnersData(updated);
    setWinnersEditingIdx(null);
    setWinnersEditForm({});
  };

  const handleWinnersDelete = (idx) => {
    setWinnersDeleteConfirm(idx);
  };

  const handleWinnersDeleteConfirm = () => {
    if (winnersDeleteConfirm == null) return;
    const updated = winnersData.filter((_, i) => i !== winnersDeleteConfirm);
    setWinnersData(updated);
    setWinnersDeleteConfirm(null);
    if (winnersEditingIdx === winnersDeleteConfirm) {
      setWinnersEditingIdx(null);
      setWinnersEditForm({});
    }
  };

  const handleExtendedDetailsSave = async () => {
    await handleSave();
    if (structureSeasonForm) await handleSaveStructureSeason();
    if (structureStageForm) await handleSaveStructureStage();
    if (structurePhaseForm) await handleSaveStructurePhase();
    if (structureGroupForm) await handleSaveStructureGroup();
    if (hasWinnersChanges) await handleSaveWinners();
  };

  const handleSaveTableSettings = async () => {
    if (!id || !competition) return;
    const payload = { ...competition };
    TABLE_SETTINGS_ALL_KEYS.forEach((key) => {
      const value = formData[key] ?? competition[key];
      if (key === 'ORDER_BY' && value != null) {
        payload[key] = serializeOrderBy(deduplicateOrderByList(parseOrderBy(value)));
      } else if (value !== undefined && value !== null) {
        payload[key] = value;
      }
    });
    delete payload.COMPETITION_ID;
    try {
      await api.updateCompetition(id, payload);
      setSnackbar({ open: true, message: 'Table Settings saved', severity: 'success' });
      loadCompetition();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save Table Settings', severity: 'error' });
    }
  };

  const handleOpenSeasonTableSettingsDialog = () => {
    if (!structureSeasonForm || !competition) return;
    const fallback = competition;
    const seasonData = structureSeasonForm;
    setSeasonTableSettingsForm({
      TABLE_WINNER_POINTS: seasonData.TABLE_WINNER_POINTS ?? fallback.TABLE_WINNER_POINTS ?? '',
      TABLE_DRAW_POINTS: seasonData.TABLE_DRAW_POINTS ?? fallback.TABLE_DRAW_POINTS ?? '',
      TABLE_LOSER_POINTS: seasonData.TABLE_LOSER_POINTS ?? fallback.TABLE_LOSER_POINTS ?? '',
      TABLE_WIN_AFTER_EX_POINTS: seasonData.TABLE_WIN_AFTER_EX_POINTS ?? fallback.TABLE_WIN_AFTER_EX_POINTS ?? '',
      TABLE_LOS_AFTER_EX_POINTS: seasonData.TABLE_LOS_AFTER_EX_POINTS ?? fallback.TABLE_LOS_AFTER_EX_POINTS ?? '',
      TABLE_WIN_AFTER_PEN_POINTS: seasonData.TABLE_WIN_AFTER_PEN_POINTS ?? fallback.TABLE_WIN_AFTER_PEN_POINTS ?? '',
      TABLE_LOS_AFTER_PEN_POINTS: seasonData.TABLE_LOS_AFTER_PEN_POINTS ?? fallback.TABLE_LOS_AFTER_PEN_POINTS ?? '',
      TABLE_IS_EVEN_EXISTS: !!(seasonData.TABLE_IS_EVEN_EXISTS ?? fallback.TABLE_IS_EVEN_EXISTS),
      TABLE_COUNT_ET_SCORE: !!(seasonData.TABLE_COUNT_ET_SCORE ?? fallback.TABLE_COUNT_ET_SCORE),
      TABLE_COUNT_PEN_SCORE: !!(seasonData.TABLE_COUNT_PEN_SCORE ?? fallback.TABLE_COUNT_PEN_SCORE),
      STANDING_TYPE: seasonData.STANDING_TYPE ?? fallback.STANDING_TYPE ?? '',
      ORDER_BY: (typeof seasonData.ORDER_BY === 'string' && seasonData.ORDER_BY.trim())
        ? seasonData.ORDER_BY
        : (typeof fallback.ORDER_BY === 'string' && fallback.ORDER_BY.trim() ? fallback.ORDER_BY : ''),
    });
    setSeasonTableSettingsOrderByNewField('');
    setSeasonTableSettingsOrderByNewDirection('desc');
    setSeasonTableSettingsDialogOpen(true);
  };

  const handleCloseSeasonTableSettingsDialog = () => {
    setSeasonTableSettingsDialogOpen(false);
    setSeasonTableSettingsForm(null);
  };

  const seasonTableSettingsOrderByList = seasonTableSettingsForm
    ? deduplicateOrderByList(parseOrderBy(seasonTableSettingsForm.ORDER_BY ?? ''))
    : [];

  const handleSeasonTableSettingsFormChange = (field, value) => {
    setSeasonTableSettingsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSeasonTableSettingsAddOrderBy = () => {
    if (!seasonTableSettingsOrderByNewField || !seasonTableSettingsForm) return;
    if (seasonTableSettingsOrderByList.some((item) => item.field === seasonTableSettingsOrderByNewField)) return;
    const next = [...seasonTableSettingsOrderByList, { field: seasonTableSettingsOrderByNewField, direction: seasonTableSettingsOrderByNewDirection }];
    handleSeasonTableSettingsFormChange('ORDER_BY', serializeOrderBy(next));
    setSeasonTableSettingsOrderByNewField('');
  };

  const handleSeasonTableSettingsRemoveOrderBy = (index) => {
    const next = seasonTableSettingsOrderByList.filter((_, i) => i !== index);
    handleSeasonTableSettingsFormChange('ORDER_BY', serializeOrderBy(next));
  };

  const handleSeasonTableSettingsOrderDragStart = (e, index) => {
    setSeasonTableSettingsDragOrderIndex(index);
    e.dataTransfer.setData('application/json', JSON.stringify({ index }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleSeasonTableSettingsOrderDragEnd = () => {
    setSeasonTableSettingsDragOrderIndex(null);
    setSeasonTableSettingsDragOverOrderIndex(null);
  };

  const handleSeasonTableSettingsOrderDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setSeasonTableSettingsDragOverOrderIndex(index);
  };

  const handleSeasonTableSettingsOrderDrop = (e, dropIndex) => {
    e.preventDefault();
    setSeasonTableSettingsDragOrderIndex(null);
    setSeasonTableSettingsDragOverOrderIndex(null);
    let dragIndex;
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) dragIndex = JSON.parse(data).index;
      else dragIndex = Number(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }
    if (dragIndex == null || dragIndex === dropIndex) return;
    const next = [...seasonTableSettingsOrderByList];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    handleSeasonTableSettingsFormChange('ORDER_BY', serializeOrderBy(next));
  };

  const handleSaveSeasonTableSettings = async () => {
    if (!id || selectedStructureSeasonNum == null || !seasonTableSettingsForm) return;
    setSeasonTableSettingsSaving(true);
    try {
      const payload = {};
      TABLE_SETTINGS_ALL_KEYS.forEach((key) => {
        const value = seasonTableSettingsForm[key];
        if (key === 'ORDER_BY' && value != null) {
          payload[key] = serializeOrderBy(deduplicateOrderByList(parseOrderBy(value)));
        } else if (value !== undefined && value !== null) {
          if (TABLE_CHECKBOX_KEYS.includes(key)) {
            payload[key] = !!value;
          } else if (TABLE_POINT_KEYS.includes(key)) {
            payload[key] = value === '' ? null : Number(value);
          } else {
            payload[key] = value;
          }
        }
      });
      await api.updateSeason(id, selectedStructureSeasonNum, payload);
      setSnackbar({ open: true, message: 'Season Table Settings saved', severity: 'success' });
      loadStructureSeasons();
      handleCloseSeasonTableSettingsDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save Season Table Settings', severity: 'error' });
    } finally {
      setSeasonTableSettingsSaving(false);
    }
  };

  const fieldSx = { '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } };
  const FIELD_LABELS = {
    COUNTRY_ID: 'Country',
    SPORT_TYPE_ID: 'Sport',
    GENDER: 'Gender',
    COMPETITION_TYPE: 'Competition Type',
    CURRENT_SEASON: 'Current Season',
    CURRENT_STAGE: 'Current Stage',
    FATHER_COMPETITION: 'Father Competition',
    STANDING_TYPE: 'Standing Type',
    CURRENT_ROUND: 'Current Round',
    SUB_SPORT_TYPE: 'Sub Sport Type',
    COMPETITORS_TYPE: 'Competitors Type',
    HOST_CITY: 'Host City',
    MAIN_COLOR: 'Main Color',
    SECONDARY_COLOR: 'Secondary Color',
  };

  const handleOpenImageDialog = (imageType) => {
    const initialType = imageType || 'competition';
    setEditingImageType(initialType);
    if (initialType === 'competition') {
      setImageUrlValue(formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL || '');
    } else {
      setImageUrlValue(formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL || '');
    }
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setEditingImageType('competition');
    setImageUrlValue('');
  };

  const handleSaveImageUrl = async () => {
    if (!id) return;
    try {
      if (editingImageType === 'competition') {
        await api.updateCompetition(id, { COMPETITION_IMAGE_URL: imageUrlValue.trim() || null });
        setFormData((prev) => ({ ...prev, COMPETITION_IMAGE_URL: imageUrlValue.trim() || '' }));
        setCompetitionImageError(false);
      } else {
        await api.updateCompetition(id, { TROPHY_IMAGE_URL: imageUrlValue.trim() || null });
        setFormData((prev) => ({ ...prev, TROPHY_IMAGE_URL: imageUrlValue.trim() || '' }));
        setTrophyImageError(false);
      }
      setSnackbar({ open: true, message: 'Image URL saved', severity: 'success' });
      loadCompetition();
      handleCloseImageDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save image URL', severity: 'error' });
    }
  };

  const handleCreateCitySave = async () => {
    const name = (createCityName || '').trim();
    if (!name) {
      setSnackbar({ open: true, message: 'City name is required', severity: 'warning' });
      return;
    }
    try {
      // Create new term under Cities with the entered value as English (languageId: 1)
      await api.createTerm({
        category: 'Cities',
        values: [{ languageId: 1, value: name, isDefault: true, status: 'Approved' }],
      });
      const terms = await api.getTerms();
      setAllTerms(terms || []);
      handleFormChange('HOST_CITY', name);
      setCreateCityDialogOpen(false);
      setCreateCityName('');
      setSnackbar({ open: true, message: 'City term created', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to create city term', severity: 'error' });
    }
  };

  if (loading && !competition) {
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
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const displayName = competition?.name || `Competition ${id}`;

  return (
    <Box sx={{ height: '100%', overflow: 'auto', px: 3, pt: 0, pb: 3, backgroundColor: '#f5f5f5' }}>
      <Box sx={{ mt: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          Back to List
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
          Competition -{' '}
          <Box
            component="span"
            onClick={handleNameClick}
            sx={{
              color: '#1976d2',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1565c0',
                textDecoration: 'underline',
              },
            }}
          >
            {displayName}
          </Box>
        </Typography>
      </Box>

      {/* General Details – per UI-STANDARDS: header row, 3 rows of fields (4 cols) */}
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
            onClick={handleSave}
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
          {/* Left: Media (compact) – 72×72, one Upload Image, Image Version */}
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
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL || null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: ((formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL) && !competitionImageError) ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setCompetitionImageError(true)}
                  >
                    {(!(formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL) || competitionImageError) && (
                      <EmojiEventsIcon sx={{ fontSize: 36, color: '#999999' }} />
                    )}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Competition Image
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL || null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: ((formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL) && !trophyImageError) ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setTrophyImageError(true)}
                  >
                    {(!(formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL) || trophyImageError) && (
                      <EmojiEventsIcon sx={{ fontSize: 36, color: '#999999' }} />
                    )}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Trophy Image
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenImageDialog(null)}
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Upload Image
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled
                sx={{ backgroundColor: '#1976d2', textTransform: 'none', width: '100%', py: 0.5 }}
              >
                Image Version ({competition?.IMG_VER ?? 1})
              </Button>
            </Paper>
          </Box>

          {/* Middle: Fields – grid 4 cols, 3 rows */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: { xs: 1.5, md: 1.25 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => (option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || '')}
                  value={countries.find((c) => Number(c.COUNTRY_ID) === Number(formData.COUNTRY_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('COUNTRY_ID', newValue?.COUNTRY_ID ?? '')}
                  isOptionEqualToValue={(option, value) => Number(option?.COUNTRY_ID) === Number(value?.COUNTRY_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS.COUNTRY_ID} size="small" sx={fieldSx} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Autocomplete
                  options={sports}
                  getOptionLabel={(option) => option.name || option.ALIAS_NAME || ''}
                  value={sports.find((s) => Number(s.SPORT_TYPE_ID) === Number(formData.SPORT_TYPE_ID)) || null}
                  onChange={(e, newValue) => handleFormChange('SPORT_TYPE_ID', newValue?.SPORT_TYPE_ID ?? '')}
                  isOptionEqualToValue={(option, value) => Number(option?.SPORT_TYPE_ID) === Number(value?.SPORT_TYPE_ID)}
                  ListboxProps={{ style: { maxHeight: 48 * 6 } }}
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS.SPORT_TYPE_ID} size="small" sx={fieldSx} />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.GENDER}</InputLabel>
                  <Select value={formData.GENDER ?? ''} label={FIELD_LABELS.GENDER} onChange={(e) => handleFormChange('GENDER', e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {genders.map((g) => (
                      <MenuItem key={g.GENDER_ID} value={g.GENDER_ID}>{g.GENDER}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.COMPETITION_TYPE}</InputLabel>
                  <Select value={formData.COMPETITION_TYPE ?? ''} label={FIELD_LABELS.COMPETITION_TYPE} onChange={(e) => handleFormChange('COMPETITION_TYPE', e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {competitionTypes.map((ct) => (
                      <MenuItem key={ct.COMPETITION_TYPE_ID} value={ct.COMPETITION_TYPE_ID}>{ct.COMPETITION_TYPE}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.CURRENT_SEASON}
                  value={currentSeasonObj?.name ?? (competition?.CURRENT_SEASON != null ? `Season ${competition.CURRENT_SEASON}` : '—')}
                  disabled
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.CURRENT_STAGE}
                  value={currentStageObj?.name ?? (competition?.CURRENT_STAGE != null ? `Stage ${competition.CURRENT_STAGE}` : '—')}
                  disabled
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={FIELD_LABELS.FATHER_COMPETITION}
                  value={formData.FATHER_COMPETITION ?? ''}
                  onChange={(e) => handleFormChange('FATHER_COMPETITION', e.target.value)}
                  placeholder={fatherCompetitionName ? `${fatherCompetitionName} (ID: ${formData.FATHER_COMPETITION})` : 'Enter competition ID'}
                  sx={fieldSx}
                />
                {fatherCompetitionName && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Name: {fatherCompetitionName}</Typography>
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={FIELD_LABELS.CURRENT_ROUND}
                  value={formData.CURRENT_ROUND ?? ''}
                  onChange={(e) => handleFormChange('CURRENT_ROUND', e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              {/* SUB_SPORT_TYPE only for Tennis (3) and Basketball (2) */}
              {(Number(formData.SPORT_TYPE_ID) === 2 || Number(formData.SPORT_TYPE_ID) === 3) && (
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth size="small" sx={fieldSx}>
                    <InputLabel>{FIELD_LABELS.SUB_SPORT_TYPE}</InputLabel>
                    <Select value={formData.SUB_SPORT_TYPE ?? ''} label={FIELD_LABELS.SUB_SPORT_TYPE} onChange={(e) => handleFormChange('SUB_SPORT_TYPE', e.target.value)}>
                      <MenuItem value="">—</MenuItem>
                      {subSportTypes
                        .filter((sst) => Number(sst.SPORT_TYPE_ID) === Number(formData.SPORT_TYPE_ID))
                        .map((sst) => (
                          <MenuItem key={sst.SUB_SPORT_TYPE_ID} value={sst.SUB_SPORT_TYPE}>{sst.SUB_SPORT_TYPE}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>{FIELD_LABELS.COMPETITORS_TYPE}</InputLabel>
                  <Select value={formData.COMPETITORS_TYPE ?? ''} label={FIELD_LABELS.COMPETITORS_TYPE} onChange={(e) => handleFormChange('COMPETITORS_TYPE', e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {competitorTypes.map((ct) => (
                      <MenuItem key={ct.COMPETITOR_TYPE_ID} value={ct.COMPETITOR_TYPE_ID}>{ct.COMPETITOR_TYPE}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                {formData.HOST_CITY != null && String(formData.HOST_CITY).trim() !== '' ? (
                  <TextField
                    fullWidth
                    size="small"
                    label={FIELD_LABELS.HOST_CITY}
                    value={formData.HOST_CITY}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        cursor: hostCityTerm ? 'pointer' : 'default',
                        '& input': {
                          color: hostCityTerm ? '#1976d2' : 'inherit',
                          fontWeight: 500,
                          textDecoration: hostCityTerm ? 'underline' : 'none',
                          cursor: hostCityTerm ? 'pointer' : 'default',
                        },
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFormChange('HOST_CITY', ''); }} title="Remove city" sx={{ p: 0.5 }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    onClick={hostCityTerm ? handleHostCityNameClick : undefined}
                    sx={{
                      ...fieldSx,
                      ...(hostCityTerm ? { '& .MuiOutlinedInput-root:hover input': { color: '#1565c0', textDecoration: 'underline' } } : {}),
                    }}
                  />
                ) : (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={cityTerms.map((t) => resolveTermDisplayValue(t))}
                    value=""
                    inputValue={hostCityInputValue}
                    onInputChange={(_, v) => setHostCityInputValue(v)}
                    onChange={(_, v) => { if (v != null && String(v).trim() !== '') handleFormChange('HOST_CITY', String(v).trim()); setHostCityInputValue(''); }}
                    filterOptions={(options, state) => {
                      if ((state.inputValue || '').length < 3) return [];
                      const input = (state.inputValue || '').toLowerCase().trim();
                      return options.filter((o) => String(o).toLowerCase().includes(input));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={FIELD_LABELS.HOST_CITY}
                        sx={fieldSx}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {params.InputProps.endAdornment}
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCreateCityName(''); setCreateCityDialogOpen(true); }} title="New city term" sx={{ p: 0.5 }}>
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="color"
                  label={FIELD_LABELS.MAIN_COLOR}
                  value={formData.MAIN_COLOR}
                  onChange={(e) => handleFormChange('MAIN_COLOR', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="color"
                  label={FIELD_LABELS.SECONDARY_COLOR}
                  value={formData.SECONDARY_COLOR}
                  onChange={(e) => handleFormChange('SECONDARY_COLOR', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Right: Booleans – Hide On Search, Hide On Catalog, Enable Dashboard Buzz, Support Competition Dashboard, Hide LMT/LAW */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_SEARCH ?? false}
                  onChange={(e) => handleFormChange('HIDE_ON_SEARCH', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Hide On Search</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_ON_CATALOG ?? false}
                  onChange={(e) => handleFormChange('HIDE_ON_CATALOG', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Hide On Catalog</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.ENABLE_DASHBOARD_BUZZ ?? false}
                  onChange={(e) => handleFormChange('ENABLE_DASHBOARD_BUZZ', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Enable Dashboard Buzz</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.SUPPORT_COMPETITION_DASHBOARD ?? false}
                  onChange={(e) => handleFormChange('SUPPORT_COMPETITION_DASHBOARD', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Support Competition Dashboard</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.HIDE_LMT ?? false}
                  onChange={(e) => handleFormChange('HIDE_LMT', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Hide LMT/LAW</Typography>}
            />
          </Box>
        </Box>
      </Paper>

      {/* Extended Details – sticky header, tabs with content below */}
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
            onClick={handleExtendedDetailsSave}
            disabled={!hasExtendedDetailsChanges}
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
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: '#1976d2',
            },
          }}
        >
          <Tab label="Structure" />
          <Tab label="Configurations" />
          <Tab label="Tools & Screens" />
          <Tab label="Winners" />
          <Tab label="Table Settings" />
        </Tabs>
        <Box sx={{ p: 3 }}>
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#000000' }}>
            Configurations
          </Typography>
          <Accordion
            expanded={generalExpanded}
            onChange={() => setGeneralExpanded((prev) => !prev)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>General</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Promote Athlete Recently Trophy (Days)"
                        value={formData.RECENTLY_WON_TROPHY_CARD_VALUE ?? competition?.RECENTLY_WON_TROPHY_CARD_VALUE ?? ''}
                        onChange={(e) => handleFormChange('RECENTLY_WON_TROPHY_CARD_VALUE', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Promote Athlete New Trophy (Days)"
                        value={formData.PROMOTE_NEW_TROPHY_VALUE ?? competition?.PROMOTE_NEW_TROPHY_VALUE ?? ''}
                        onChange={(e) => handleFormChange('PROMOTE_NEW_TROPHY_VALUE', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Transfer Window Start Date"
                        value={formData.TRANSFERS_WINDOW_START_DATE != null || competition?.TRANSFERS_WINDOW_START_DATE != null ? String(formData.TRANSFERS_WINDOW_START_DATE ?? competition?.TRANSFERS_WINDOW_START_DATE ?? '').slice(0, 10) : ''}
                        onChange={(e) => handleFormChange('TRANSFERS_WINDOW_START_DATE', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Transfer Window End Date"
                        value={formData.TRANSFERS_WINDOW_END_DATE != null || competition?.TRANSFERS_WINDOW_END_DATE != null ? String(formData.TRANSFERS_WINDOW_END_DATE ?? competition?.TRANSFERS_WINDOW_END_DATE ?? '').slice(0, 10) : ''}
                        onChange={(e) => handleFormChange('TRANSFERS_WINDOW_END_DATE', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      {(formData.BRACKET_FINAL_DESCRIPTION ?? competition?.BRACKET_FINAL_DESCRIPTION) != null && String(formData.BRACKET_FINAL_DESCRIPTION ?? competition?.BRACKET_FINAL_DESCRIPTION ?? '').trim() !== '' ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Bracket Final Name"
                          value={formData.BRACKET_FINAL_DESCRIPTION ?? competition?.BRACKET_FINAL_DESCRIPTION ?? ''}
                          InputProps={{
                            readOnly: true,
                            sx: {
                              cursor: bracketFinalHasValue ? 'pointer' : 'default',
                              '& input': {
                                color: bracketFinalHasValue ? '#1976d2' : 'inherit',
                                fontWeight: 500,
                                textDecoration: bracketFinalHasValue ? 'underline' : 'none',
                                cursor: bracketFinalHasValue ? 'pointer' : 'default',
                              },
                            },
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFormChange('BRACKET_FINAL_DESCRIPTION', ''); }} title="Remove Bracket Final" sx={{ p: 0.5 }}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          onClick={bracketFinalHasValue ? handleBracketFinalNameClick : undefined}
                          sx={{
                            ...fieldSx,
                            ...(bracketFinalHasValue ? { '& .MuiOutlinedInput-root:hover input': { color: '#1565c0', textDecoration: 'underline' } } : {}),
                          }}
                        />
                      ) : (
                        <Autocomplete
                          freeSolo
                          fullWidth
                          size="small"
                          options={finalsTerms.map((t) => resolveTermDisplayValue(t))}
                          value=""
                          inputValue={bracketFinalInputValue}
                          onInputChange={(_, v) => setBracketFinalInputValue(v)}
                          onChange={(_, v) => { if (v != null && String(v).trim() !== '') handleFormChange('BRACKET_FINAL_DESCRIPTION', String(v).trim()); setBracketFinalInputValue(''); }}
                          filterOptions={(options, state) => {
                            const input = (state.inputValue || '').toLowerCase().trim();
                            if (!input) return options;
                            return options.filter((o) => String(o).toLowerCase().includes(input));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Bracket Final Name"
                              sx={fieldSx}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {params.InputProps.endAdornment}
                                    <InputAdornment position="end">
                                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCreateBracketFinalName(''); setCreateBracketFinalDialogOpen(true); }} title="New Bracket Final term" sx={{ p: 0.5 }}>
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </InputAdornment>
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      {(formData.SELECT_ROUND_NAME ?? competition?.SELECT_ROUND_NAME) != null && String(formData.SELECT_ROUND_NAME ?? competition?.SELECT_ROUND_NAME ?? '').trim() !== '' ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Round Name"
                          value={formData.SELECT_ROUND_NAME ?? competition?.SELECT_ROUND_NAME ?? ''}
                          InputProps={{
                            readOnly: true,
                            sx: {
                              cursor: roundNameHasValue ? 'pointer' : 'default',
                              '& input': {
                                color: roundNameHasValue ? '#1976d2' : 'inherit',
                                fontWeight: 500,
                                textDecoration: roundNameHasValue ? 'underline' : 'none',
                                cursor: roundNameHasValue ? 'pointer' : 'default',
                              },
                            },
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFormChange('SELECT_ROUND_NAME', ''); }} title="Remove Round Name" sx={{ p: 0.5 }}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          onClick={roundNameHasValue ? handleRoundNameClick : undefined}
                          sx={{
                            ...fieldSx,
                            ...(roundNameHasValue ? { '& .MuiOutlinedInput-root:hover input': { color: '#1565c0', textDecoration: 'underline' } } : {}),
                          }}
                        />
                      ) : (
                        <Autocomplete
                          freeSolo
                          fullWidth
                          size="small"
                          options={roundsTerms.map((t) => resolveTermDisplayValue(t))}
                          value=""
                          inputValue={roundNameInputValue}
                          onInputChange={(_, v) => setRoundNameInputValue(v)}
                          onChange={(_, v) => { if (v != null && String(v).trim() !== '') handleFormChange('SELECT_ROUND_NAME', String(v).trim()); setRoundNameInputValue(''); }}
                          filterOptions={(options, state) => {
                            const input = (state.inputValue || '').toLowerCase().trim();
                            if (!input) return options;
                            return options.filter((o) => String(o).toLowerCase().includes(input));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Round Name"
                              sx={fieldSx}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {params.InputProps.endAdornment}
                                    <InputAdornment position="end">
                                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCreateRoundNameName(''); setCreateRoundNameDialogOpen(true); }} title="New Round Name term" sx={{ p: 0.5 }}>
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </InputAdornment>
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Display Article Before (Hours)"
                        value={formData.ARTICLE_TIME_SPAN_BEFORE ?? competition?.ARTICLE_TIME_SPAN_BEFORE ?? ''}
                        onChange={(e) => handleFormChange('ARTICLE_TIME_SPAN_BEFORE', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Display Article After (Hours)"
                        value={formData.ARTICLE_TIME_SPAN_AFTER ?? competition?.ARTICLE_TIME_SPAN_AFTER ?? ''}
                        onChange={(e) => handleFormChange('ARTICLE_TIME_SPAN_AFTER', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Premium Social Before (Hours)"
                        value={formData.PREMIUM_SOCIAL_TIME_SPAN_BEFORE ?? competition?.PREMIUM_SOCIAL_TIME_SPAN_BEFORE ?? ''}
                        onChange={(e) => handleFormChange('PREMIUM_SOCIAL_TIME_SPAN_BEFORE', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Premium Social After (Hours)"
                        value={formData.PREMIUM_SOCIAL_TIME_SPAN_AFTER ?? competition?.PREMIUM_SOCIAL_TIME_SPAN_AFTER ?? ''}
                        onChange={(e) => handleFormChange('PREMIUM_SOCIAL_TIME_SPAN_AFTER', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Game Summery Popup Relevancy (Hours)"
                        value={formData.GAME_SUMMARY_RELEVANCY ?? competition?.GAME_SUMMARY_RELEVANCY ?? ''}
                        onChange={(e) => handleFormChange('GAME_SUMMARY_RELEVANCY', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Buzz Item Type</InputLabel>
                        <Select
                          value={formData.BUZZ_ITEM_TYPE ?? competition?.BUZZ_ITEM_TYPE ?? ''}
                          label="Buzz Item Type"
                          onChange={(e) => handleFormChange('BUZZ_ITEM_TYPE', e.target.value || null)}
                        >
                          <MenuItem value="">—</MenuItem>
                          {buzzItemTypes.map((bt) => (
                            <MenuItem key={bt.id} value={bt.name}>{bt.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Tier"
                        value={formData.TIER ?? competition?.TIER ?? ''}
                        onChange={(e) => handleFormChange('TIER', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Recognition Time Span (Hours)"
                        value={formData.RECOGNITION_TIME_SPAN ?? competition?.RECOGNITION_TIME_SPAN ?? ''}
                        onChange={(e) => handleFormChange('RECOGNITION_TIME_SPAN', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    {isTennisCompetition && (
                      <Box sx={{ minWidth: 0 }}>
                        <FormControl fullWidth size="small" sx={fieldSx}>
                          <InputLabel>Surface Type</InputLabel>
                          <Select
                            value={(() => {
                              const v = formData.SURFACE_TYPE ?? competition?.SURFACE_TYPE;
                              return v != null && v !== '' ? Number(v) : '';
                            })()}
                            label="Surface Type"
                            onChange={(e) => handleFormChange('SURFACE_TYPE', e.target.value === '' ? null : Number(e.target.value))}
                          >
                            <MenuItem value="">—</MenuItem>
                            {surfaces.map((s) => (
                              <MenuItem key={s.SURFACE_ID} value={s.SURFACE_ID}>{s.SURFACE_NAME}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: { xs: '1 1 100%', md: '0 0 auto' },
                    marginLeft: { md: 'auto' },
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '4px 16px',
                    alignContent: 'start',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_PAST_FINALS_STANDINGS ?? competition?.SUPPORT_PAST_FINALS_STANDINGS)}
                        onChange={(e) => handleFormChange('SUPPORT_PAST_FINALS_STANDINGS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Display History</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.HIDE_FROM_POPULAR_WHEN_NO_ACTIVE ?? competition?.HIDE_FROM_POPULAR_WHEN_NO_ACTIVE)}
                        onChange={(e) => handleFormChange('HIDE_FROM_POPULAR_WHEN_NO_ACTIVE', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Hide From Popular When No Active Season</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.PROMOTE_DURING_ACTIVE_SEASON ?? competition?.PROMOTE_DURING_ACTIVE_SEASON)}
                        onChange={(e) => handleFormChange('PROMOTE_DURING_ACTIVE_SEASON', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Promote During Active Season</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_FANS_RATE ?? competition?.SUPPORT_FANS_RATE)}
                        onChange={(e) => handleFormChange('SUPPORT_FANS_RATE', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Support Fans Rate</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.AUTO_TRANSFER_WAIT_APPROVAL ?? competition?.AUTO_TRANSFER_WAIT_APPROVAL)}
                        onChange={(e) => handleFormChange('AUTO_TRANSFER_WAIT_APPROVAL', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Block Auto Transfer</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.HIDE_PLAYER_GAME_CARD ?? competition?.HIDE_PLAYER_GAME_CARD)}
                        onChange={(e) => handleFormChange('HIDE_PLAYER_GAME_CARD', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Hide Athlete Game Card</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_CARDS ?? competition?.SUPPORT_CARDS)}
                        onChange={(e) => handleFormChange('SUPPORT_CARDS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Display Cards</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.ALLOW_NOTIFICATION_FOR_FATHER_COMPETITION ?? competition?.ALLOW_NOTIFICATION_FOR_FATHER_COMPETITION)}
                        onChange={(e) => handleFormChange('ALLOW_NOTIFICATION_FOR_FATHER_COMPETITION', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Allow Notification For Father Competition</Typography>}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={statusesScoresExpanded}
            onChange={() => setStatusesScoresExpanded((prev) => !prev)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Statuses &amp; Scores</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {/* Per UI-STANDARDS: fields left, booleans right; dynamic width */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Always Update Score Above Priority</InputLabel>
                        <Select
                          value={formData.ALWAYS_UPDATE_ABOVE_PRIORITY ?? competition?.ALWAYS_UPDATE_ABOVE_PRIORITY ?? ''}
                          label="Always Update Score Above Priority"
                          onChange={(e) => handleFormChange('ALWAYS_UPDATE_ABOVE_PRIORITY', e.target.value === '' ? null : Number(e.target.value))}
                        >
                          <MenuItem value="">—</MenuItem>
                          {priorityLevels.map((pl) => (
                            <MenuItem key={pl.ID} value={pl.VALUE}>{pl.VALUE} ({pl.NAME})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Min Priority to Update Status</InputLabel>
                        <Select
                          value={formData.MIN_PRIORITY_TO_CHANGE_STATUS ?? competition?.MIN_PRIORITY_TO_CHANGE_STATUS ?? ''}
                          label="Min Priority to Update Status"
                          onChange={(e) => handleFormChange('MIN_PRIORITY_TO_CHANGE_STATUS', e.target.value === '' ? null : Number(e.target.value))}
                        >
                          <MenuItem value="">—</MenuItem>
                          {priorityLevels.map((pl) => (
                            <MenuItem key={pl.ID} value={pl.VALUE}>{pl.VALUE} ({pl.NAME})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: { xs: '1 1 100%', md: '0 0 auto' },
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px 16px',
                    alignContent: 'start',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.AUTO_START_GAMES ?? competition?.AUTO_START_GAMES)}
                        onChange={(e) => handleFormChange('AUTO_START_GAMES', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Auto Start Games</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.AUTOMATIC_STATUS_PROGRESS ?? competition?.AUTOMATIC_STATUS_PROGRESS)}
                        onChange={(e) => handleFormChange('AUTOMATIC_STATUS_PROGRESS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Auto Change Statuses</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.AUTO_PROGRESS_ADDED_TIME ?? competition?.AUTO_PROGRESS_ADDED_TIME)}
                        onChange={(e) => handleFormChange('AUTO_PROGRESS_ADDED_TIME', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Auto Added Time</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.UPDATE_RESULT_SECOND_SCANNER ?? competition?.UPDATE_RESULT_SECOND_SCANNER)}
                        onChange={(e) => handleFormChange('UPDATE_RESULT_SECOND_SCANNER', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Update Score From 2nd Source</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_TIE_ON_90 ?? competition?.SUPPORT_TIE_ON_90)}
                        onChange={(e) => handleFormChange('SUPPORT_TIE_ON_90', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Support Draw In 90</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.IGNORE_AWAY_GOALS ?? competition?.IGNORE_AWAY_GOALS)}
                        onChange={(e) => handleFormChange('IGNORE_AWAY_GOALS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Ignore Away Goals Advantage</Typography>}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={lineupsExpanded}
            onChange={() => setLineupsExpanded((prev) => !prev)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Lineups</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                      maxWidth: { md: '75%' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Lineups Notification Delay (Minutes)"
                        value={formData.TIMEOUT_FOR_ATHLETES_CONNECTION ?? competition?.TIMEOUT_FOR_ATHLETES_CONNECTION ?? ''}
                        onChange={(e) => handleFormChange('TIMEOUT_FOR_ATHLETES_CONNECTION', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Probable Lineups Restriction (Hours)"
                        value={formData.LINEUP_UPDATE_THRESHOLD ?? competition?.LINEUP_UPDATE_THRESHOLD ?? ''}
                        onChange={(e) => handleFormChange('LINEUP_UPDATE_THRESHOLD', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Min Players In Lineups"
                        value={formData.MINIMUM_ATHLETES_IN_LINEUPS ?? competition?.MINIMUM_ATHLETES_IN_LINEUPS ?? ''}
                        onChange={(e) => handleFormChange('MINIMUM_ATHLETES_IN_LINEUPS', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Max Players In Lineups"
                        value={formData.MAXIMUM_PLAYERS_IN_LINEUPS ?? competition?.MAXIMUM_PLAYERS_IN_LINEUPS ?? ''}
                        onChange={(e) => handleFormChange('MAXIMUM_PLAYERS_IN_LINEUPS', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Time To Notify Any Lineups (Minutes)"
                        value={formData.TIME_TO_NOTIFY_ANY_LINEUP ?? competition?.TIME_TO_NOTIFY_ANY_LINEUP ?? ''}
                        onChange={(e) => handleFormChange('TIME_TO_NOTIFY_ANY_LINEUP', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: { xs: '1 1 100%', md: '0 0 auto' },
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                    alignItems: 'center',
                    gap: 3,
                    flexWrap: 'nowrap',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.REQUIRE_FORMATION ?? competition?.REQUIRE_FORMATION)}
                        onChange={(e) => handleFormChange('REQUIRE_FORMATION', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Require Formation</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_DISCONNECTED_PLAYERS ?? competition?.SHOW_DISCONNECTED_PLAYERS)}
                        onChange={(e) => handleFormChange('SHOW_DISCONNECTED_PLAYERS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Disconnected Players In Missing</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.NOTIFY_LINEUPS ?? competition?.NOTIFY_LINEUPS)}
                        onChange={(e) => handleFormChange('NOTIFY_LINEUPS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Notify Official Lineups</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.NOTIFY_PROBABLE_LINEUPS ?? competition?.NOTIFY_PROBABLE_LINEUPS)}
                        onChange={(e) => handleFormChange('NOTIFY_PROBABLE_LINEUPS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Notify Probable Lineups</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_MISSING_PLAYERS ?? competition?.SUPPORT_MISSING_PLAYERS)}
                        onChange={(e) => handleFormChange('SUPPORT_MISSING_PLAYERS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Support Missing Players</Typography>}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={statisticsExpanded}
            onChange={() => setStatisticsExpanded((prev) => !prev)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Statistics</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(200px, 1fr))', md: 'repeat(3, minmax(240px, 1fr))' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Top Athletes Min Appearances (%)"
                        value={formData.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE ?? competition?.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE ?? ''}
                        onChange={(e) => handleFormChange('TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    {(Number(formData.SPORT_TYPE_ID) === 2 || Number(competition?.SPORT_TYPE_ID) === 2) && (
                      <>
                        <Box sx={{ minWidth: 0 }}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Personal Fouls"
                            value={formData.PERSONAL_FOULS ?? competition?.PERSONAL_FOULS ?? ''}
                            onChange={(e) => handleFormChange('PERSONAL_FOULS', e.target.value === '' ? null : Number(e.target.value))}
                            sx={fieldSx}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Team Fouls"
                            value={formData.TEAM_FOULS ?? competition?.TEAM_FOULS ?? ''}
                            onChange={(e) => handleFormChange('TEAM_FOULS', e.target.value === '' ? null : Number(e.target.value))}
                            sx={fieldSx}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                      </>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Min Round to Show Pre-Game Top Performers"
                        value={formData.MIN_ROUND_TO_SHOW_PRE_GAME_TOP_PERFORMERS ?? competition?.MIN_ROUND_TO_SHOW_PRE_GAME_TOP_PERFORMERS ?? ''}
                        onChange={(e) => handleFormChange('MIN_ROUND_TO_SHOW_PRE_GAME_TOP_PERFORMERS', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Key Players Before A Game (Days)"
                        value={formData.TIME_TO_SHOW_PRE_GAME_TOP_PERFORMERS ?? competition?.TIME_TO_SHOW_PRE_GAME_TOP_PERFORMERS ?? ''}
                        onChange={(e) => handleFormChange('TIME_TO_SHOW_PRE_GAME_TOP_PERFORMERS', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Players Stats Max Position"
                        value={formData.PLAYER_STAT_MAX_POSITION ?? competition?.PLAYER_STAT_MAX_POSITION ?? ''}
                        onChange={(e) => handleFormChange('PLAYER_STAT_MAX_POSITION', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Player Statistics Update Delay"
                        value={formData.PLAYER_STATISTICS_UPDATE_DELAY ?? competition?.PLAYER_STATISTICS_UPDATE_DELAY ?? ''}
                        onChange={(e) => handleFormChange('PLAYER_STATISTICS_UPDATE_DELAY', e.target.value === '' ? null : Number(e.target.value))}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: { xs: '1 1 100%', md: '0 0 auto' },
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, max-content)',
                    gap: '6px 20px',
                    alignContent: 'start',
                    width: { md: 'fit-content' },
                    ml: { md: 'auto' },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.HIDE_COMPETITION_STATS ?? competition?.HIDE_COMPETITION_STATS)}
                        onChange={(e) => handleFormChange('HIDE_COMPETITION_STATS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'normal' }}>Hide Competition Stats</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.MAN_OF_THE_MATCH_ENABLED ?? competition?.MAN_OF_THE_MATCH_ENABLED)}
                        onChange={(e) => handleFormChange('MAN_OF_THE_MATCH_ENABLED', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Man of the Match Enabled</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOULD_DISPLAY_TOP_PERFORMERS ?? competition?.SHOULD_DISPLAY_TOP_PERFORMERS)}
                        onChange={(e) => handleFormChange('SHOULD_DISPLAY_TOP_PERFORMERS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Display Top Performers</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_TOP_PERFORMERS_PRE_MATCH ?? competition?.SHOW_TOP_PERFORMERS_PRE_MATCH)}
                        onChange={(e) => handleFormChange('SHOW_TOP_PERFORMERS_PRE_MATCH', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Top Performers Pre-Match</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_TOP_PERFORMERS_LIVE ?? competition?.SHOW_TOP_PERFORMERS_LIVE)}
                        onChange={(e) => handleFormChange('SHOW_TOP_PERFORMERS_LIVE', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Top Performers Live</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_TOP_PERFORMERS_POST_MATCH ?? competition?.SHOW_TOP_PERFORMERS_POST_MATCH)}
                        onChange={(e) => handleFormChange('SHOW_TOP_PERFORMERS_POST_MATCH', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Top Performers Post-Match</Typography>}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={bettingExpanded}
            onChange={() => setBettingExpanded((prev) => !prev)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Betting</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: { xs: 1.5, md: 1.25 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <FormControl fullWidth size="small" sx={fieldSx}>
                        <InputLabel>Head to Head Layout</InputLabel>
                        <Select
                          value={formData.H2H_LAYOUT ?? competition?.H2H_LAYOUT ?? 'Default'}
                          label="Head to Head Layout"
                          onChange={(e) => handleFormChange('H2H_LAYOUT', e.target.value)}
                        >
                          <MenuItem value="Default">Default</MenuItem>
                          <MenuItem value="US">US</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: { xs: '1 1 100%', md: '0 0 auto' },
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, max-content)',
                    gap: '6px 20px',
                    alignContent: 'start',
                    width: { md: 'fit-content' },
                    ml: { md: 'auto' },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.CALCULATE_WIN_PROBABILITY ?? competition?.CALCULATE_WIN_PROBABILITY)}
                        onChange={(e) => handleFormChange('CALCULATE_WIN_PROBABILITY', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Calculate Win Probability</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.CALCULATE_WIN_PROBABILITY_INSIGHTS ?? competition?.CALCULATE_WIN_PROBABILITY_INSIGHTS)}
                        onChange={(e) => handleFormChange('CALCULATE_WIN_PROBABILITY_INSIGHTS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'normal' }}>Calculate Win Probability Insights</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.CALCULATE_LIVE_WIN_PROBABILITY ?? competition?.CALCULATE_LIVE_WIN_PROBABILITY)}
                        onChange={(e) => handleFormChange('CALCULATE_LIVE_WIN_PROBABILITY', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Calculate Live Win Probability</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_INSIGHTS_POPUP_FOR_PROPS ?? competition?.SUPPORT_INSIGHTS_POPUP_FOR_PROPS)}
                        onChange={(e) => handleFormChange('SUPPORT_INSIGHTS_POPUP_FOR_PROPS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'normal' }}>Support Insights Popup for Props</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SUPPORT_PROPS_BETTING ?? competition?.SUPPORT_PROPS_BETTING)}
                        onChange={(e) => handleFormChange('SUPPORT_PROPS_BETTING', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Support Props Betting</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.IS_SUPPORT_TRENDS ?? competition?.IS_SUPPORT_TRENDS)}
                        onChange={(e) => handleFormChange('IS_SUPPORT_TRENDS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Support Trends</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_SPREAD ?? competition?.SHOW_SPREAD)}
                        onChange={(e) => handleFormChange('SHOW_SPREAD', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Spread</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.SHOW_PROMOTED_TRENDS ?? competition?.SHOW_PROMOTED_TRENDS)}
                        onChange={(e) => handleFormChange('SHOW_PROMOTED_TRENDS', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Show Promoted Trends</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!(formData.DONT_DISPLAY_FATHERS_H2H ?? competition?.DONT_DISPLAY_FATHERS_H2H)}
                        onChange={(e) => handleFormChange('DONT_DISPLAY_FATHERS_H2H', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Hide from H2H In Father Competition</Typography>}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, gridColumn: 'span 3' }}>
                    <Tooltip title="Display outrights card on competitors dashboards participating in this competition. This card will only be displayed between the configured start and end dates." arrow>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!(formData.SUPPORT_SPECIAL_OUTRIGHTS ?? competition?.SUPPORT_SPECIAL_OUTRIGHTS)}
                            onChange={(e) => {
                              handleFormChange('SUPPORT_SPECIAL_OUTRIGHTS', e.target.checked);
                              if (!e.target.checked) {
                                handleFormChange('SPECIAL_OUTRIGHTS_START_DATE', null);
                                handleFormChange('SPECIAL_OUTRIGHTS_END_DATE', null);
                              }
                            }}
                          />
                        }
                        label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Support Special Outrights</Typography>}
                      />
                    </Tooltip>
                    {!!(formData.SUPPORT_SPECIAL_OUTRIGHTS ?? competition?.SUPPORT_SPECIAL_OUTRIGHTS) && (
                      <>
                        <TextField
                          size="small"
                          type="date"
                          label="Start Date"
                          value={formData.SPECIAL_OUTRIGHTS_START_DATE != null || competition?.SPECIAL_OUTRIGHTS_START_DATE != null ? String(formData.SPECIAL_OUTRIGHTS_START_DATE ?? competition?.SPECIAL_OUTRIGHTS_START_DATE ?? '').slice(0, 10) : ''}
                          onChange={(e) => handleFormChange('SPECIAL_OUTRIGHTS_START_DATE', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)}
                          sx={{ width: 180, ...fieldSx }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          size="small"
                          type="date"
                          label="End Date"
                          value={formData.SPECIAL_OUTRIGHTS_END_DATE != null || competition?.SPECIAL_OUTRIGHTS_END_DATE != null ? String(formData.SPECIAL_OUTRIGHTS_END_DATE ?? competition?.SPECIAL_OUTRIGHTS_END_DATE ?? '').slice(0, 10) : ''}
                          onChange={(e) => handleFormChange('SPECIAL_OUTRIGHTS_END_DATE', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)}
                          sx={{ width: 180, ...fieldSx }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#000000' }}>
              Winners
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleWinnersAddNew}
              disabled={winnersLoading || winnersEditingIdx != null}
              sx={{ textTransform: 'none', bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
            >
              Add Winner
            </Button>
          </Box>
          {winnersLoading ? (
            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </Box>
          ) : winnersData.length === 0 && winnersEditingIdx !== 'new' ? (
            <Typography variant="body2" color="text.secondary">
              No winners recorded for this competition.
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f5f5f5' }}>Season Number</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f5f5f5' }}>Season Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f5f5f5' }}>Title Winner</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f5f5f5' }}>Coach</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f5f5f5', width: 100 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {winnersData.map((row, idx) => (
                    winnersEditingIdx === idx ? (
                      <TableRow key={`edit-${idx}`} sx={{ bgcolor: '#f9fafb' }}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          #{winnersEditForm.seasonNum}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select
                              value={winnersEditForm.seasonNum ?? ''}
                              onChange={(e) => handleWinnersSeasonChange(e.target.value)}
                              sx={{ fontSize: '0.8rem' }}
                            >
                              {winnersAvailableSeasons.map((s) => (
                                <MenuItem key={s.SEASON_NUM} value={s.SEASON_NUM} sx={{ fontSize: '0.8rem' }}>
                                  {s.name || `Season ${s.SEASON_NUM}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select
                              value={winnersEditForm.competitorId ?? ''}
                              onChange={(e) => handleWinnersCompetitorChange(e.target.value)}
                              sx={{ fontSize: '0.8rem' }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled sx={{ fontSize: '0.8rem' }}>Select team...</MenuItem>
                              {winnersSeasonCompetitors.map((c) => (
                                <MenuItem key={c.COMPETITOR_ID} value={c.COMPETITOR_ID} sx={{ fontSize: '0.8rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {c.logoUrl && <Avatar src={c.logoUrl} sx={{ width: 18, height: 18 }} variant="square" />}
                                    {c.name}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              size="small"
                              placeholder="Athlete ID"
                              value={winnersEditForm.coachAthleteId ?? ''}
                              onChange={(e) => setWinnersEditForm((prev) => ({ ...prev, coachAthleteId: e.target.value, coachName: '' }))}
                              onBlur={(e) => handleWinnersCoachValidate(e.target.value)}
                              error={!!winnersCoachError}
                              helperText={winnersCoachError || (winnersEditForm.coachName ? winnersEditForm.coachName : ' ')}
                              sx={{ width: 130, '& .MuiOutlinedInput-input': { py: 0.75, fontSize: '0.8rem' } }}
                              InputProps={{
                                endAdornment: winnersCoachValidating ? (
                                  <InputAdornment position="end"><Box sx={{ width: 16, height: 16, border: '2px solid #ccc', borderTop: '2px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} /></InputAdornment>
                                ) : null,
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={handleWinnersEditSave}
                              disabled={!winnersEditForm.competitorId || !!winnersCoachError || winnersCoachValidating}
                              sx={{ color: '#15803d' }}
                              title="Confirm"
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={handleWinnersEditCancel} title="Cancel">
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={`${row.seasonNum}-${idx}`} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>#{row.seasonNum}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.seasonName}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {row.competitorLogo && (
                              <Avatar src={row.competitorLogo} sx={{ width: 22, height: 22 }} variant="square" />
                            )}
                            {row.competitorName}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {row.coach ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{row.coach.name}</Typography>
                              <Typography variant="caption" color="text.secondary">ID: {row.coach.athleteId}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleWinnersStartEdit(idx)} title="Edit" disabled={winnersEditingIdx != null}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleWinnersDelete(idx)} title="Remove" sx={{ color: '#d32f2f' }} disabled={winnersEditingIdx != null}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  ))}
                  {winnersEditingIdx === 'new' && (
                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {winnersEditForm.seasonNum ? `#${winnersEditForm.seasonNum}` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <Select
                            value={winnersEditForm.seasonNum ?? ''}
                            onChange={(e) => handleWinnersSeasonChange(e.target.value)}
                            sx={{ fontSize: '0.8rem' }}
                            displayEmpty
                          >
                            <MenuItem value="" disabled sx={{ fontSize: '0.8rem' }}>Select season...</MenuItem>
                            {winnersAvailableSeasons.map((s) => (
                              <MenuItem key={s.SEASON_NUM} value={s.SEASON_NUM} sx={{ fontSize: '0.8rem' }}>
                                {s.name || `Season ${s.SEASON_NUM}`}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <Select
                            value={winnersEditForm.competitorId ?? ''}
                            onChange={(e) => handleWinnersCompetitorChange(e.target.value)}
                            sx={{ fontSize: '0.8rem' }}
                            displayEmpty
                            disabled={!winnersEditForm.seasonNum}
                          >
                            <MenuItem value="" disabled sx={{ fontSize: '0.8rem' }}>Select team...</MenuItem>
                            {winnersSeasonCompetitors.map((c) => (
                              <MenuItem key={c.COMPETITOR_ID} value={c.COMPETITOR_ID} sx={{ fontSize: '0.8rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {c.logoUrl && <Avatar src={c.logoUrl} sx={{ width: 18, height: 18 }} variant="square" />}
                                  {c.name}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            placeholder="Athlete ID"
                            value={winnersEditForm.coachAthleteId ?? ''}
                            onChange={(e) => setWinnersEditForm((prev) => ({ ...prev, coachAthleteId: e.target.value, coachName: '' }))}
                            onBlur={(e) => handleWinnersCoachValidate(e.target.value)}
                            error={!!winnersCoachError}
                            helperText={winnersCoachError || (winnersEditForm.coachName ? winnersEditForm.coachName : ' ')}
                            sx={{ width: 130, '& .MuiOutlinedInput-input': { py: 0.75, fontSize: '0.8rem' } }}
                            InputProps={{
                              endAdornment: winnersCoachValidating ? (
                                <InputAdornment position="end"><Box sx={{ width: 16, height: 16, border: '2px solid #ccc', borderTop: '2px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} /></InputAdornment>
                              ) : null,
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={handleWinnersAddSave}
                            disabled={!winnersEditForm.seasonNum || !winnersEditForm.competitorId || !!winnersCoachError || winnersCoachValidating}
                            sx={{ color: '#15803d' }}
                            title="Add"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={handleWinnersEditCancel} title="Cancel">
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Delete confirmation dialog */}
          <Dialog open={winnersDeleteConfirm != null} onClose={() => setWinnersDeleteConfirm(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Remove Winner</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                Are you sure you want to remove this winner? The competitor will remain in the season but will no longer be marked as winner.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setWinnersDeleteConfirm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
              <Button onClick={handleWinnersDeleteConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>Remove</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#000000' }}>
            Table Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Points and table rules for this competition. Changes are saved to this competition only (competitions.json).
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} sx={{ width: 'fit-content', maxWidth: '100%' }}>
              {Number(formData.SPORT_TYPE_ID) === 2 && (
                <Box sx={{ mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                    <InputLabel>{FIELD_LABELS.STANDING_TYPE}</InputLabel>
                    <Select
                      value={formData.STANDING_TYPE ?? competition?.STANDING_TYPE ?? ''}
                      label={FIELD_LABELS.STANDING_TYPE}
                      onChange={(e) => handleFormChange('STANDING_TYPE', e.target.value)}
                    >
                      <MenuItem value="">—</MenuItem>
                      {standingTypes.map((st) => (
                        <MenuItem key={st.STANDING_TYPE_ID} value={st.STANDING_TYPE}>{st.STANDING_TYPE}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Point configuration</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 18ch)', columnGap: 2, rowGap: 3.5, mb: 2, width: 'fit-content' }}>
                {TABLE_POINT_KEYS.map((key) => (
                  <TextField
                    key={key}
                    size="small"
                    label={formatTableSettingKeyAsLabel(key)}
                    type="number"
                    value={formData[key] ?? competition?.[key] ?? ''}
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
                        checked={!!(formData[key] ?? competition?.[key])}
                        onChange={(e) => handleFormChange(key, e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">{TABLE_SETTINGS_LABELS[key] ?? formatTableSettingKeyAsLabel(key)}</Typography>}
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Table order parameters</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                Current order (priority from top to bottom):
              </Typography>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
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
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#000000', mb: 2 }}>
            Tools & Screens
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Reports</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Info Card</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Priorities</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Bet Lines</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Team of The Week</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Cards Order</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Featured Match</Button>
            <Button variant="outlined" size="small" sx={{ textTransform: 'none' }}>Draw</Button>
          </Box>
        </Box>
      )}

      {activeTab === 0 && (
        <Box>
          {/* Seasons section: dropdown + actions + details + config */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Seasons</Typography>
            {structureLoading ? (
              <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner />
              </Box>
            ) : structureSeasons.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography color="text.secondary">No seasons for this competition.</Typography>
                <Button variant="contained" onClick={handleAddSeason} sx={{ textTransform: 'none' }}>CREATE</Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Box sx={{ width: { xs: '100%', sm: 'calc((100% - 48px) / 6)' }, minWidth: { xs: 0, sm: 120 } }}>
                    <Autocomplete
                      size="small"
                      options={structureSeasons}
                      getOptionLabel={(s) => {
                        const isCurrent = competition?.CURRENT_SEASON === s.SEASON_NUM;
                        return `#${s.SEASON_NUM} - ${s.name || `Season ${s.SEASON_NUM}`}${isCurrent ? ' (Current)' : ''}`;
                      }}
                      value={structureSeasons.find((s) => s.SEASON_NUM === selectedStructureSeasonNum) ?? null}
                      onChange={(_, newValue) => setSelectedStructureSeasonNum(newValue?.SEASON_NUM ?? null)}
                      isOptionEqualToValue={(opt, val) => opt?.SEASON_NUM === val?.SEASON_NUM}
                      renderInput={(params) => (
                        <TextField {...params} label="Season Name" placeholder="Type to search..." />
                      )}
                      filterSelectedOptions={false}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    title="Edit season name (term)"
                    onClick={() => {
                      const s = structureSeasons.find((se) => se.SEASON_NUM === selectedStructureSeasonNum);
                      if (s?.NAME_ID) handleSeasonNameClick(null, s);
                    }}
                    disabled={!selectedStructureSeasonNum}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleSetCurrentSeason(selectedStructureSeasonNum)}
                    disabled={!selectedStructureSeasonNum || competition?.CURRENT_SEASON === selectedStructureSeasonNum}
                    sx={{ textTransform: 'none' }}
                  >
                    SET CURRENT
                  </Button>
                  <Button variant="contained" size="small" onClick={handleAddSeason} sx={{ textTransform: 'none' }}>CREATE</Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const s = structureSeasons.find((se) => se.SEASON_NUM === selectedStructureSeasonNum);
                      if (s) handleDeleteSeason(s);
                    }}
                    disabled={!selectedStructureSeasonNum || competition?.CURRENT_SEASON === selectedStructureSeasonNum}
                    sx={{
                      textTransform: 'none',
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                      backgroundColor: '#d32f2f',
                      color: '#ffffff',
                      '&:hover': {
                        backgroundColor: '#c62828',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#cccccc',
                        color: '#ffffff',
                      },
                    }}
                  >
                    DELETE
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none' }}
                    onClick={handleOpenSeasonTableSettingsDialog}
                    disabled={!selectedStructureSeasonNum}
                  >
                    TABLE SETTINGS
                  </Button>
                </Box>

                {structureSeasonForm && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Season Details</Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                      <Grid item xs={12} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Season Key"
                          placeholder="<Default>YYYY/YYYY"
                          value={structureSeasonForm.SEASON_KEY ?? ''}
                          onChange={(e) => setStructureSeasonForm((f) => ({ ...f, SEASON_KEY: e.target.value || null }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <DateTimePicker
                          label="Start Date"
                          value={structureSeasonForm.START_DATE ? dayjs(structureSeasonForm.START_DATE) : null}
                          onChange={(v) => setStructureSeasonForm((f) => ({ ...f, START_DATE: v ? v.toISOString() : null }))}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <DateTimePicker
                          label="End Date"
                          value={structureSeasonForm.END_DATE ? dayjs(structureSeasonForm.END_DATE) : null}
                          onChange={(v) => setStructureSeasonForm((f) => ({ ...f, END_DATE: v ? v.toISOString() : null }))}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Button variant="contained" size="small" sx={{ textTransform: 'none' }}>CONNECT GAMES & COMPETITORS</Button>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Season Configuration</Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      {[
                        { key: 'USE_NAME', label: 'Use Name' },
                        { key: 'SHOW_TOP_ATHLETES', label: 'Show Top Athletes' },
                        { key: 'HAS_BRACKETS', label: 'Has Brackets' },
                        { key: 'HAS_TABLE', label: 'Has Table' },
                        { key: 'SHOW_INFO_CARD', label: 'Has Info Card' },
                        { key: 'HAS_SEED', label: 'Has Seed' },
                        { key: 'SHOW_TOP_TEAMS_TAB', label: 'Show Top Teams Tab' },
                        { key: 'SHOW_OUTRIGHTS_TAB', label: 'Show Outrights Tab' },
                        { key: 'PRESENT_COMPETITION_RULES', label: 'Present Competition Rules' },
                        { key: 'SHOW_MATCHES', label: 'Show Matches' },
                      ].map(({ key, label }) => (
                        <Grid item xs={6} sm={4} md={3} key={key}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={!!structureSeasonForm[key]}
                                onChange={(e) => setStructureSeasonForm((f) => ({ ...f, [key]: e.target.checked }))}
                              />
                            }
                            label={label}
                          />
                        </Grid>
                      ))}
                    </Grid>

                    {/* Season Competitors - merged into Seasons section */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                      Season Competitors
                    </Typography>
              {competitorsLoading ? (
                <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                  <LoadingSpinner />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    alignItems: { xs: 'stretch', md: 'stretch' },
                  }}
                >
                  {/* Left: Competitors In Season - 55% width */}
                  <Box sx={{ flex: { xs: '1 1 100%', md: '55 1 0%' }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flex: 1, minHeight: 52, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#000' }}>
                        Competitors In Season {competitorsInSeason.length > 0 && (
                          <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
                            (Total: {competitorsInSeason.length})
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ minHeight: 52, display: { xs: 'none', md: 'block' }, mb: 1 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ height: 530, minHeight: 530, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 }, '& .MuiTableRow-root': { '& td': { verticalAlign: 'middle' } } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={
                                  competitorsInSeason.length > 0 &&
                                  selectedInSeason.length === competitorsInSeason.length
                                }
                                indeterminate={
                                  selectedInSeason.length > 0 &&
                                  selectedInSeason.length < competitorsInSeason.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInSeason(competitorsInSeason.map((r) => r.COMPETITOR_ID));
                                  } else {
                                    setSelectedInSeason([]);
                                  }
                                }}
                                inputProps={{ 'aria-label': 'select all in season' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            {!!structureSeasonForm.HAS_SEED && (
                              <TableCell sx={{ fontWeight: 600 }}>Seed</TableCell>
                            )}
                            <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Not In Season</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(rowsPerPageInSeason > 0
                            ? competitorsInSeason.slice(
                                pageInSeason * rowsPerPageInSeason,
                                pageInSeason * rowsPerPageInSeason + rowsPerPageInSeason
                              )
                            : competitorsInSeason
                          ).map((r) => {
                            const cid = r.COMPETITOR_ID;
                            const countryName =
                              r.countryName ||
                              (r.COUNTRY_ID && countries.find((c) => Number(c.COUNTRY_ID) === Number(r.COUNTRY_ID))?.name) ||
                              '—';
                            return (
                              <TableRow
                                key={cid}
                                hover
                                selected={selectedInSeason.includes(cid)}
                                onClick={() => {
                                  setSelectedInSeason((prev) =>
                                    prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                                  );
                                }}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedInSeason.includes(cid)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedInSeason((prev) => [...prev, cid]);
                                      } else {
                                        setSelectedInSeason((prev) => prev.filter((x) => x !== cid));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{cid}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {r.logoUrl ? (
                                      <Avatar
                                        src={r.logoUrl}
                                        alt={r.name || ''}
                                        variant="rounded"
                                        sx={{ width: 28, height: 28 }}
                                        imgProps={{ onError: (e) => { e.target.style.display = 'none'; } }}
                                      />
                                    ) : (
                                      <Avatar
                                        variant="rounded"
                                        sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}
                                      >
                                        {(r.name || `C`).charAt(0).toUpperCase()}
                                      </Avatar>
                                    )}
                                    <span>{r.name || `Competitor ${cid}`}</span>
                                  </Box>
                                </TableCell>
                                <TableCell>{countryName}</TableCell>
                                <TableCell onClick={(ev) => ev.stopPropagation()}>
                                  <Tooltip
                                    title={
                                      (r.JOIN_TYPE === 1 || r.JOIN_TYPE === 2) && r.ORIGIN_COMPETITION_ID
                                        ? `from ${allCompetitions.find((c) => Number(c.COMPETITION_ID) === Number(r.ORIGIN_COMPETITION_ID))?.name || `Competition ${r.ORIGIN_COMPETITION_ID}`}`
                                        : ''
                                    }
                                    placement="top"
                                  >
                                    <span style={{ display: 'inline-block' }}>
                                      <Select
                                        size="small"
                                        displayEmpty
                                        value={
                                          r.HOST ? 'host' : r.JOIN_TYPE === 1 ? 'promoted' : r.JOIN_TYPE === 2 ? 'relegated' : ''
                                        }
                                        onChange={(e) => handleSeasonCompetitorStatusChange(cid, e.target.value)}
                                        renderValue={(v) =>
                                          v === 'host' ? 'Host' : v === 'promoted' ? 'Promoted' : v === 'relegated' ? 'Relegated' : 'Select status'
                                        }
                                        sx={{
                                          minWidth: 130,
                                          height: 32,
                                          fontSize: '0.875rem',
                                          '& .MuiSelect-select': { py: 0.5 },
                                        }}
                                      >
                                        <MenuItem value="">
                                          <em>Select status</em>
                                        </MenuItem>
                                        <MenuItem value="host">Host</MenuItem>
                                        <MenuItem value="promoted">Promoted</MenuItem>
                                        <MenuItem value="relegated">Relegated</MenuItem>
                                      </Select>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                                {!!structureSeasonForm.HAS_SEED && (
                                  <TableCell>
                                    <TextField
                                      variant="outlined"
                                      size="small"
                                      type="number"
                                      value={r.SEED ?? ''}
                                      onBlur={(e) => {
                                        const val = e.target.value;
                                        handleSeasonCompetitorStatusSeedBlur(cid, 'SEED', val);
                                      }}
                                      onChange={(e) => {
                                        setCompetitorsInSeason((prev) =>
                                          prev.map((x) =>
                                            x.COMPETITOR_ID === cid ? { ...x, SEED: e.target.value === '' ? null : Number(e.target.value) } : x
                                          )
                                        );
                                      }}
                                      inputProps={{ min: 0, style: { width: 56, textAlign: 'center' } }}
                                      onClick={(ev) => ev.stopPropagation()}
                                      sx={{
                                        width: 72,
                                        '& .MuiOutlinedInput-root': {
                                          backgroundColor: 'background.paper',
                                          '& fieldset': { borderColor: 'divider' },
                                          '&:hover fieldset': { borderColor: 'action.hover' },
                                          '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
                                        },
                                        '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' },
                                      }}
                                    />
                                  </TableCell>
                                )}
                                <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                                  <Checkbox
                                    size="small"
                                    checked={!!r.NOT_IN_SEASON}
                                    onChange={(e) => handleSeasonCompetitorNotInSeasonChange(cid, e.target.checked)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {competitorsInSeason.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={structureSeasonForm.HAS_SEED ? 7 : 6} align="center" sx={{ py: 3 }}>
                                No competitors in this season.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                      <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}>
                        <TablePagination
                          component="div"
                          rowsPerPageOptions={[25, 50, 100, 200]}
                          count={competitorsInSeason.length}
                          rowsPerPage={rowsPerPageInSeason}
                          page={pageInSeason}
                          onPageChange={(_, newPage) => setPageInSeason(newPage)}
                          onRowsPerPageChange={(e) => {
                            setRowsPerPageInSeason(parseInt(e.target.value, 10));
                            setPageInSeason(0);
                          }}
                          labelRowsPerPage="Rows:"
                        />
                      </Box>
                    </Paper>
                  </Box>

                  {/* Middle: Action buttons - vertically centered with tables */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', md: 'column' },
                      justifyContent: 'center',
                      alignSelf: { md: 'center' },
                      gap: 1,
                      order: { xs: 3, md: 2 },
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddToSeason}
                      disabled={selectedNotInSeason.length === 0}
                      sx={{ textTransform: 'none' }}
                    >
                      &lt;&lt; ADD COMPETITORS
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleRemoveSelectedFromSeason}
                      disabled={selectedInSeason.length === 0}
                      sx={{ textTransform: 'none' }}
                    >
                      REMOVE COMPETITORS &gt;&gt;
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleRemoveFromAllSeasonsClick}
                      disabled={selectedInSeason.length === 0 && selectedNotInSeason.length === 0}
                      sx={{
                        textTransform: 'none',
                        borderColor: '#d32f2f',
                        color: '#d32f2f',
                        '&:hover': { borderColor: '#b71c1c', backgroundColor: 'rgba(211, 47, 47, 0.04)' },
                      }}
                    >
                      REMOVE FROM ALL SEASONS
                    </Button>
                  </Box>

                  {/* Right: Competitors Not In Season - 45% width */}
                  <Box sx={{ flex: { xs: '1 1 100%', md: '45 1 0%' }, minWidth: 0, order: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flex: 1, minHeight: 52, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#000' }}>
                        Competitors Not In Season {competitorsNotInSeason.length > 0 && (
                          <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
                            (Total: {competitorsNotInSeason.length})
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, minHeight: 52, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Country</InputLabel>
                        <Select
                          value={competitorsNotInSeasonFilters.countryId || ''}
                          label="Country"
                          onChange={(e) => {
                            const newCountry = e.target.value === '' ? '' : e.target.value;
                            setCompetitorsNotInSeasonFilters((f) => {
                              let newComp = '';
                              if (newCountry) {
                                const curComp = allCompetitions.find((c) => Number(c.COMPETITION_ID) === Number(id));
                                newComp = curComp && Number(curComp.COUNTRY_ID) === Number(newCountry) ? String(id) : '';
                              }
                              return { ...f, countryId: newCountry, competitionId: newComp };
                            });
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {countries.map((c) => (
                            <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>
                              {c.name || `Country ${c.COUNTRY_ID}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {competitorsNotInSeasonFilters.countryId && (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel>Competition</InputLabel>
                          <Select
                            value={competitorsNotInSeasonFilters.competitionId || ''}
                            label="Competition"
                            onChange={(e) =>
                              setCompetitorsNotInSeasonFilters((f) => ({
                                ...f,
                                competitionId: e.target.value === '' ? '' : e.target.value,
                              }))
                            }
                          >
                            <MenuItem value="">All</MenuItem>
                            {(allCompetitions || [])
                              .filter(
                                (c) =>
                                  Number(c.SPORT_TYPE_ID) === Number(competition?.SPORT_TYPE_ID) &&
                                  Number(c.COUNTRY_ID) === Number(competitorsNotInSeasonFilters.countryId)
                              )
                              .map((c) => (
                                <MenuItem key={c.COMPETITION_ID} value={c.COMPETITION_ID}>
                                  {c.name || `Competition ${c.COMPETITION_ID}`}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      )}
                      <TextField
                        size="small"
                        label="Competitor Name"
                        placeholder="Search by name"
                        value={competitorsNotInSeasonFilters.name || ''}
                        onChange={(e) =>
                          setCompetitorsNotInSeasonFilters((f) => ({ ...f, name: e.target.value }))
                        }
                        sx={{ minWidth: 160 }}
                      />
                      <Button variant="contained" size="small" onClick={loadCompetitorsTab} sx={{ textTransform: 'none' }}>
                        SEARCH
                      </Button>
                    </Box>
                    </Box>
                    <Paper variant="outlined" sx={{ height: 530, minHeight: 530, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={
                                  competitorsNotInSeason.length > 0 &&
                                  selectedNotInSeason.length === competitorsNotInSeason.length
                                }
                                indeterminate={
                                  selectedNotInSeason.length > 0 &&
                                  selectedNotInSeason.length < competitorsNotInSeason.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedNotInSeason(competitorsNotInSeason.map((r) => r.COMPETITOR_ID));
                                  } else {
                                    setSelectedNotInSeason([]);
                                  }
                                }}
                                inputProps={{ 'aria-label': 'select all not in season' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(rowsPerPageNotInSeason > 0
                            ? competitorsNotInSeason.slice(
                                pageNotInSeason * rowsPerPageNotInSeason,
                                pageNotInSeason * rowsPerPageNotInSeason + rowsPerPageNotInSeason
                              )
                            : competitorsNotInSeason
                          ).map((r) => {
                            const cid = r.COMPETITOR_ID;
                            return (
                              <TableRow
                                key={cid}
                                hover
                                selected={selectedNotInSeason.includes(cid)}
                                onClick={() => {
                                  setSelectedNotInSeason((prev) =>
                                    prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                                  );
                                }}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedNotInSeason.includes(cid)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedNotInSeason((prev) => [...prev, cid]);
                                      } else {
                                        setSelectedNotInSeason((prev) => prev.filter((x) => x !== cid));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{cid}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {r.logoUrl ? (
                                      <Avatar
                                        src={r.logoUrl}
                                        alt={r.name || ''}
                                        variant="rounded"
                                        sx={{ width: 28, height: 28 }}
                                        imgProps={{ onError: (e) => { e.target.style.display = 'none'; } }}
                                      />
                                    ) : (
                                      <Avatar
                                        variant="rounded"
                                        sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}
                                      >
                                        {(r.name || `C`).charAt(0).toUpperCase()}
                                      </Avatar>
                                    )}
                                    <span>{r.name || `Competitor ${cid}`}</span>
                                  </Box>
                                </TableCell>
                                <TableCell>{r.countryName || '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                          {competitorsNotInSeason.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                No competitors found. Use filters and search.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                      <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}>
                        <TablePagination
                          component="div"
                          rowsPerPageOptions={[25, 50, 100, 200]}
                          count={competitorsNotInSeason.length}
                          rowsPerPage={rowsPerPageNotInSeason}
                          page={pageNotInSeason}
                          onPageChange={(_, newPage) => setPageNotInSeason(newPage)}
                          onRowsPerPageChange={(e) => {
                            setRowsPerPageNotInSeason(parseInt(e.target.value, 10));
                            setPageNotInSeason(0);
                          }}
                          labelRowsPerPage="Rows:"
                        />
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              )}

                  </>
                )}
              </>
            )}
          </Paper>

          {/* Phases section: only when a season is selected; above Stages, below Season; collapsed by default */}
          {structureSeasons.length > 0 && selectedStructureSeasonNum != null && (
            <Accordion
              expanded={phasesExpanded}
              onChange={() => setPhasesExpanded((prev) => !prev)}
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Phases ({(phasesBySeason[selectedStructureSeasonNum] || []).length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleAddPhase(selectedStructureSeasonNum)}
                  sx={{ textTransform: 'none' }}
                >
                  CREATE NEW
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const phasesList = phasesBySeason[selectedStructureSeasonNum] || [];
                    const ph = phasesList.find((p) => Number(p.PHASE_NUM) === Number(selectedStructurePhaseNum));
                    if (ph) handleDeletePhase(selectedStructureSeasonNum, ph);
                  }}
                  disabled={selectedStructurePhaseNum == null}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#d32f2f',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#c62828' },
                    '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
                  }}
                >
                  DELETE PHASE
                </Button>
              </Box>

              {(() => {
                const phasesList = phasesBySeason[selectedStructureSeasonNum] || [];
                if (phasesList.length === 0) {
                  return (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No phases for this season. Create one to get started.
                    </Typography>
                  );
                }
                return (
                  <>
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }}>Order</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }}>Parent Phase</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }} padding="checkbox">Show Stats</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }} padding="checkbox">Use Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '16.66%' }}>Top Athletes %</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {phasesList.map((ph, idx) => {
                            const isSelected = Number(ph.PHASE_NUM) === Number(selectedStructurePhaseNum);
                            const cellSx = { width: '16.66%' };
                            return (
                              <TableRow
                                key={ph.PHASE_NUM}
                                hover
                                selected={isSelected}
                                onClick={() => setSelectedStructurePhaseNum(ph.PHASE_NUM)}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? 'action.selected' : undefined,
                                }}
                              >
                                <TableCell sx={cellSx}>{idx + 1}</TableCell>
                                <TableCell sx={cellSx}>
                                  <Box
                                    component="span"
                                    sx={{ color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePhaseNameClick(e, selectedStructureSeasonNum, ph);
                                    }}
                                  >
                                    {ph.name || `Phase ${ph.PHASE_NUM}`}
                                  </Box>
                                </TableCell>
                                <TableCell sx={cellSx}>
                                  {ph.PARENT_PHASE_NUM != null
                                    ? (phasesList.find((p) => Number(p.PHASE_NUM) === Number(ph.PARENT_PHASE_NUM))?.name || `Phase ${ph.PARENT_PHASE_NUM}`)
                                    : '—'}
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!ph.SHOW_STATS} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!ph.USE_NAME} disabled />
                                </TableCell>
                                <TableCell sx={cellSx}>{ph.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE ?? '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {structurePhaseForm && (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                          Phase Details: {structurePhaseForm.name || `Phase ${structurePhaseForm.PHASE_NUM}`}
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                          <Grid item xs={12} sm={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Parent Phase</InputLabel>
                              <Select
                                label="Parent Phase"
                                value={structurePhaseForm.PARENT_PHASE_NUM != null && structurePhaseForm.PARENT_PHASE_NUM !== '' ? Number(structurePhaseForm.PARENT_PHASE_NUM) : ''}
                                onChange={(e) => setStructurePhaseForm((f) => ({ ...f, PARENT_PHASE_NUM: e.target.value === '' ? '' : Number(e.target.value) }))}
                                renderValue={(v) => {
                                  if (v === '' || v == null) return '—';
                                  const list = phasesBySeason[selectedStructureSeasonNum] || [];
                                  const p = list.find((ph) => Number(ph.PHASE_NUM) === Number(v));
                                  return p ? (p.name || `Phase ${p.PHASE_NUM}`) : `Phase ${v}`;
                                }}
                              >
                                <MenuItem value="">—</MenuItem>
                                {(phasesBySeason[selectedStructureSeasonNum] || [])
                                  .filter((ph) => Number(ph.PHASE_NUM) !== Number(structurePhaseForm.PHASE_NUM))
                                  .map((ph) => (
                                    <MenuItem key={ph.PHASE_NUM} value={ph.PHASE_NUM}>
                                      {ph.name || `Phase ${ph.PHASE_NUM}`}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Top Athletes %"
                              value={structurePhaseForm.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE ?? ''}
                              onChange={(e) => setStructurePhaseForm((f) => ({ ...f, TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: e.target.value === '' ? '' : Number(e.target.value) }))}
                              inputProps={{ min: 0, max: 100, step: 0.01 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={!!structurePhaseForm.SHOW_STATS}
                                  onChange={(e) => setStructurePhaseForm((f) => ({ ...f, SHOW_STATS: e.target.checked }))}
                                />
                              }
                              label="Show Stats"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={!!structurePhaseForm.USE_NAME}
                                  onChange={(e) => setStructurePhaseForm((f) => ({ ...f, USE_NAME: e.target.checked }))}
                                />
                              }
                              label="Use Name"
                            />
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </>
                );
              })()}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Stages section: only when a season is selected */}
          {structureSeasons.length > 0 && selectedStructureSeasonNum != null && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Stages</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleSetCurrentStage(selectedStructureSeasonNum, selectedStructureStageNum)}
                  disabled={selectedStructureStageNum == null || (competition?.CURRENT_SEASON === selectedStructureSeasonNum && competition?.CURRENT_STAGE === selectedStructureStageNum)}
                  sx={{ textTransform: 'none' }}
                >
                  SET AS CURRENT
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleAddStage(selectedStructureSeasonNum)}
                  sx={{ textTransform: 'none' }}
                >
                  CREATE NEW
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const stages = stagesBySeason[selectedStructureSeasonNum] || [];
                    const stage = stages.find((s) => Number(s.STAGE_NUM) === Number(selectedStructureStageNum));
                    if (stage) handleDeleteStage(selectedStructureSeasonNum, stage);
                  }}
                  disabled={selectedStructureStageNum == null || (competition?.CURRENT_SEASON === selectedStructureSeasonNum && competition?.CURRENT_STAGE === selectedStructureStageNum)}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#d32f2f',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#c62828' },
                    '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
                  }}
                >
                  DELETE STAGE
                </Button>
                <Button variant="contained" size="small" onClick={() => setGenerateStagesDialogOpen(true)} sx={{ textTransform: 'none' }}>
                  GENERATE
                </Button>
              </Box>

              {(() => {
                const stagesList = stagesBySeason[selectedStructureSeasonNum] || [];
                if (stagesList.length === 0) {
                  return (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No stages for this season. Create one or use Generate.
                    </Typography>
                  );
                }
                const sortedStages = [...stagesList].sort((a, b) => {
                  const pa = a.PRESENTATION_ORDER != null && a.PRESENTATION_ORDER !== '' ? Number(a.PRESENTATION_ORDER) : Number(a.STAGE_NUM);
                  const pb = b.PRESENTATION_ORDER != null && b.PRESENTATION_ORDER !== '' ? Number(b.PRESENTATION_ORDER) : Number(b.STAGE_NUM);
                  return pa - pb;
                });
                const stageTypeLabel = (type) => stagesTypes.find((t) => Number(t.STAGE_TYPE_ID) === Number(type))?.STAGE_TYPE ?? `Type ${type}`;
                return (
                  <>
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }}>Order</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Has Table</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }}>Num Of Games</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Is Series</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Connected To Previous</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Filter Division</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Include in bracket</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Pre Visual Brackets</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }} padding="checkbox">Connected In Brackets</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '8.33%' }}>Phase</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedStages.map((stage, idx) => {
                            const isSelected = Number(stage.STAGE_NUM) === Number(selectedStructureStageNum);
                            const isDragging = Number(stage.STAGE_NUM) === Number(stagesDraggingStageNum);
                            const isDropTarget = stagesDropTargetIndex === idx;
                            const cellSx = { width: '8.33%' };
                            return (
                              <TableRow
                                key={stage.STAGE_NUM}
                                hover={!stagesDraggingStageNum}
                                selected={isSelected}
                                onClick={() => setSelectedStructureStageNum(stage.STAGE_NUM)}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', String(stage.STAGE_NUM));
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
                                  setStagesDraggingStageNum(stage.STAGE_NUM);
                                }}
                                onDragEnd={() => {
                                  setStagesDraggingStageNum(null);
                                  setStagesDropTargetIndex(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  setStagesDropTargetIndex(idx);
                                }}
                                onDragLeave={() => setStagesDropTargetIndex(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setStagesDraggingStageNum(null);
                                  setStagesDropTargetIndex(null);
                                  const dragged = e.dataTransfer.getData('text/plain');
                                  if (dragged) handleStagesReorderDrop(selectedStructureSeasonNum, dragged, idx);
                                }}
                                sx={{
                                  cursor: isDragging ? 'grabbing' : 'pointer',
                                  backgroundColor: isSelected ? 'action.selected' : undefined,
                                  transition: 'opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                                  opacity: isDragging ? 0.7 : 1,
                                  transform: isDragging ? 'scale(0.99)' : 'scale(1)',
                                  boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                                  ...(isDropTarget && {
                                    borderTop: '2px solid',
                                    borderTopColor: 'primary.main',
                                    backgroundColor: 'action.hover',
                                  }),
                                  '&:hover': { '& .drag-handle': { opacity: 1 } },
                                }}
                              >
                                <TableCell sx={cellSx}>
                                  <Box
                                    className="drag-handle"
                                    component="span"
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', String(stage.STAGE_NUM));
                                      e.dataTransfer.effectAllowed = 'move';
                                      setStagesDraggingStageNum(stage.STAGE_NUM);
                                    }}
                                    sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab', color: 'primary.main', opacity: 0.7, transition: 'opacity 0.15s ease', '&:active': { cursor: 'grabbing' }, '&:hover': { opacity: 1 } }}
                                    aria-label="Drag to reorder"
                                  >
                                    <DragIndicatorIcon fontSize="small" />
                                  </Box>
                                  {' '}
                                  {idx + 1}
                                </TableCell>
                                <TableCell sx={cellSx}>
                                  <Box
                                    component="span"
                                    sx={{ color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStageNameClick(e, selectedStructureSeasonNum, stage);
                                    }}
                                  >
                                    {stage.name || `Stage ${stage.STAGE_NUM}`}
                                  </Box>
                                </TableCell>
                                <TableCell sx={cellSx}>{stageTypeLabel(stage.STAGE_TYPE)}</TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.HAS_TABLE} disabled />
                                </TableCell>
                                <TableCell sx={cellSx}>{stage.NUM_OF_GAMES ?? '-'}</TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.IS_SERIES} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.CONNECTED_TO_PREVIOUS_STAGE} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.FILTER_DIVISION} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.INCLUDE_IN_BRACKET} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.PRE_VISUAL_BRACKETS} disabled />
                                </TableCell>
                                <TableCell sx={cellSx} padding="checkbox">
                                  <Checkbox size="small" checked={!!stage.CONNECTED_IN_BRACKETS} disabled />
                                </TableCell>
                                <TableCell sx={cellSx}>{stage.PHASE || 'Not Selected'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {structureStageForm && (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                          Stage Details: {structureStageForm.name || `Stage ${structureStageForm.STAGE_NUM}`}
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                          <Grid item xs={12} sm={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Stage Type</InputLabel>
                              <Select
                                label="Stage Type"
                                value={structureStageForm.STAGE_TYPE ?? 1}
                                onChange={(e) => setStructureStageForm((f) => ({ ...f, STAGE_TYPE: Number(e.target.value) }))}
                                renderValue={(v) => stagesTypes.find((t) => Number(t.STAGE_TYPE_ID) === Number(v))?.STAGE_TYPE ?? String(v)}
                              >
                                {stagesTypes.map((t) => (
                                  <MenuItem key={t.STAGE_TYPE_ID} value={t.STAGE_TYPE_ID}>
                                    {t.STAGE_TYPE}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Phase</InputLabel>
                              <Select
                                label="Phase"
                                value={structureStageForm.PHASE ?? ''}
                                onChange={(e) => setStructureStageForm((f) => ({ ...f, PHASE: e.target.value || '' }))}
                                renderValue={(v) => v || 'Not Selected'}
                              >
                                <MenuItem value="">Not Selected</MenuItem>
                                {(phasesBySeason[selectedStructureSeasonNum] || []).map((ph) => {
                                  const displayName = ph.name || `Phase ${ph.PHASE_NUM}`;
                                  return (
                                    <MenuItem key={ph.PHASE_NUM} value={displayName}>
                                      {displayName}
                                    </MenuItem>
                                  );
                                })}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Num Of Games"
                              value={structureStageForm.NUM_OF_GAMES ?? ''}
                              onChange={(e) => setStructureStageForm((f) => ({ ...f, NUM_OF_GAMES: e.target.value === '' ? '' : Number(e.target.value) }))}
                              placeholder="-1"
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <DateTimePicker
                              label="Start Date"
                              value={structureStageForm.START_DATE ? dayjs(structureStageForm.START_DATE) : null}
                              onChange={(v) => setStructureStageForm((f) => ({ ...f, START_DATE: v ? v.toISOString() : null }))}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <DateTimePicker
                              label="End Date"
                              value={structureStageForm.END_DATE ? dayjs(structureStageForm.END_DATE) : null}
                              onChange={(v) => setStructureStageForm((f) => ({ ...f, END_DATE: v ? v.toISOString() : null }))}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Button variant="contained" size="small" sx={{ textTransform: 'none' }}>CONNECT GAMES & COMPETITORS</Button>
                          </Grid>
                        </Grid>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Stage Configuration</Typography>
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          {[
                            { key: 'HAS_TABLE', label: 'Has Table' },
                            { key: 'IS_SERIES', label: 'Is Series' },
                            { key: 'CONNECTED_TO_PREVIOUS_STAGE', label: 'Connected To Previous Stage' },
                            { key: 'FILTER_DIVISION', label: 'Filter Division' },
                            { key: 'INCLUDE_IN_BRACKET', label: 'Include in bracket' },
                            { key: 'PRE_VISUAL_BRACKETS', label: 'Pre Visual Brackets' },
                            { key: 'CONNECTED_IN_BRACKETS', label: 'Connected In Brackets' },
                          ].map(({ key, label }) => (
                            <Grid item xs={6} sm={4} md={3} key={key}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={!!structureStageForm[key]}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setStructureStageForm((f) => ({ ...f, [key]: checked }));
                                      if (key === 'HAS_TABLE' && checked && structureSeasonForm) {
                                        setStructureSeasonForm((s) => ({ ...s, HAS_TABLE: true }));
                                      }
                                    }}
                                  />
                                }
                                label={label}
                              />
                            </Grid>
                          ))}
                        </Grid>

                        {!!structureStageForm.HAS_TABLE && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Table Options</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={!!structureStageForm.HAS_HOME_TABLE || !!structureStageForm.HAS_AWAY_TABLE}
                                    onChange={(e) => {
                                      const v = e.target.checked;
                                      setStructureStageForm((f) => ({ ...f, HAS_HOME_TABLE: v, HAS_AWAY_TABLE: v }));
                                    }}
                                  />
                                }
                                label="Has Home/Away Table"
                              />
                              <FormControlLabel
                                control={<Checkbox size="small" checked={!!structureStageForm.HIDE_HOME_AWAY_TABLES} onChange={(e) => setStructureStageForm((f) => ({ ...f, HIDE_HOME_AWAY_TABLES: e.target.checked }))} />}
                                label="Hide Home/Away Table"
                              />
                              <FormControlLabel
                                control={<Checkbox size="small" checked={!!structureStageForm.HIDE_MAIN_TABLE} onChange={(e) => setStructureStageForm((f) => ({ ...f, HIDE_MAIN_TABLE: e.target.checked }))} />}
                                label="Hide Main Table"
                              />
                              <FormControlLabel
                                control={<Checkbox size="small" checked={!!structureStageForm.HAS_POSITION_TABLE} onChange={(e) => setStructureStageForm((f) => ({ ...f, HAS_POSITION_TABLE: e.target.checked }))} />}
                                label="Has Position Table"
                              />
                              {!!structureStageForm.HAS_POSITION_TABLE && (
                                <>
                                  <TextField
                                    size="small"
                                    type="number"
                                    label="Position"
                                    placeholder="Position"
                                    value={structureStageForm.POSITION_PARAMETER ?? ''}
                                    onChange={(e) => setStructureStageForm((f) => ({
                                      ...f,
                                      POSITION_PARAMETER: e.target.value === '' ? null : Number(e.target.value),
                                    }))}
                                    inputProps={{ min: 1, step: 1 }}
                                    sx={{ width: 100 }}
                                  />
                                  <Autocomplete
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    options={positionTableNamesTermOptions}
                                  getOptionLabel={(opt) => (opt?.engValue || opt?.values?.[0]?.value || `Term ${opt?.id}` || '')}
                                  value={
                                    (() => {
                                      const termId = structureStageForm.POSITION_TABLE_NAME_ID ?? structureStageForm.POSITION_TABLE_NAME;
                                      return termId != null && termId !== 0 ? ((allTerms || []).find((t) => t.id === termId) || null) : null;
                                    })()
                                  }
                                  isOptionEqualToValue={(opt, val) => opt && val && opt.id === val.id}
                                  onChange={(_, v) => {
                                    const termId = v?.id ?? null;
                                    setStructureStageForm((f) => ({ ...f, POSITION_TABLE_NAME_ID: termId, POSITION_TABLE_NAME: termId }));
                                  }}
                                  renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Position table name" />
                                  )}
                                />
                                </>
                              )}
                            </Box>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Aggregation Table"
                                  placeholder="Numbers and symbols"
                                  value={structureStageForm.AGGREGATED_TABLE_SETTINGS ?? ''}
                                  onChange={(e) => setStructureStageForm((f) => ({ ...f, AGGREGATED_TABLE_SETTINGS: e.target.value || null }))}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Relegation Table"
                                  placeholder="Numbers and symbols"
                                  value={structureStageForm.RELEGATION_TABLE_SETTINGS ?? ''}
                                  onChange={(e) => setStructureStageForm((f) => ({ ...f, RELEGATION_TABLE_SETTINGS: e.target.value || null }))}
                                />
                              </Grid>
                            </Grid>
                          </>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                          <Button variant="outlined" size="small" onClick={handleOpenManageStandingsDialog} sx={{ textTransform: 'none' }}>MANAGE STANDINGS</Button>
                        </Box>
                      </>
                    )}
                  </>
                );
              })()}
            </Paper>
          )}

          {/* Groups section: accordion left, Competitors Not In Groups always on right */}
          {structureSeasons.length > 0 && selectedStructureSeasonNum != null && selectedStructureStageNum != null && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, alignItems: 'stretch' }}>
                {/* Left: Groups + CREATE NEW, then Accordion — 55% width */}
                <Box sx={{ flex: { xs: '1 1 100%', lg: '55 55 55%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Groups</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddGroup(selectedStructureSeasonNum, selectedStructureStageNum)}
                      sx={{ textTransform: 'none' }}
                    >
                      CREATE NEW
                    </Button>
                  </Box>
              {(() => {
                const key = `${selectedStructureSeasonNum}-${selectedStructureStageNum}`;
                const groupsList = groupsByStage[key] || [];
                if (groupsList.length === 0 && groupsByStage[key] === undefined) {
                  return (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Loading groups…
                    </Typography>
                  );
                }
                if (groupsList.length === 0) {
                  return (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No groups for this stage. Create one to get started.
                    </Typography>
                  );
                }
                const sortedGroups = [...groupsList].sort((a, b) => Number(a.GROUP_NUM) - Number(b.GROUP_NUM));

                return (
                  <Box sx={{ '& .MuiAccordion-root': { '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: 1, '& + .MuiAccordion-root': { mt: 1 } } }}>
                    {sortedGroups.map((group) => {
                      const isExpanded = Number(group.GROUP_NUM) === Number(selectedStructureGroupNum);
                      const count = groupCompetitorCounts[group.GROUP_NUM] ?? (isExpanded ? groupCompetitorsInGroup.length : null);
                      const countLabel = count != null ? `${count} competitor${count !== 1 ? 's' : ''}` : '—';

                      return (
                        <Accordion
                          key={group.GROUP_NUM}
                          expanded={isExpanded}
                          onChange={() => {
                            const next = isExpanded ? null : group.GROUP_NUM;
                            setSelectedStructureGroupNum(next);
                            if (next == null) {
                              setSelectedInGroup([]);
                              setSelectedNotInGroups([]);
                            }
                          }}
                          sx={{ '&.Mui-expanded': { margin: 0 } }}
                        >
                          <AccordionSummary
                            expandIcon={null}
                            sx={{
                              minHeight: 48,
                              '& .MuiAccordionSummary-content': { margin: 0, alignItems: 'center', flex: 1 },
                              flexDirection: 'row-reverse',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                {isExpanded ? (
                                  <ExpandLessIcon sx={{ color: 'action.active', mr: 0.5 }} />
                                ) : (
                                  <ChevronRightIcon sx={{ color: 'action.active', mr: 0.5 }} />
                                )}
                                <Typography
                                  component="span"
                                  sx={{
                                    fontWeight: 500,
                                    ...(group.NAME_ID ? { color: 'primary.main', textDecoration: 'underline', cursor: 'pointer', '&:hover': { color: 'primary.dark' } } : {}),
                                  }}
                                  onClick={group.NAME_ID ? (e) => { e.stopPropagation(); handleGroupNameClick(e, selectedStructureSeasonNum, selectedStructureStageNum, group); } : undefined}
                                >
                                  {group.name || `Group ${group.GROUP_NUM}`}
                                </Typography>
                                <Typography component="span" sx={{ fontWeight: 500, ml: 0.5 }}> ({countLabel})</Typography>
                              </Box>
                              <IconButton
                                size="small"
                                sx={{ color: '#1976d2' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGroupEditDialog(group, selectedStructureSeasonNum, selectedStructureStageNum);
                                }}
                                title="Edit group"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                sx={{ color: '#d32f2f' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(selectedStructureSeasonNum, selectedStructureStageNum, group);
                                }}
                                title="Delete group"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const next = isExpanded ? null : group.GROUP_NUM;
                                  setSelectedStructureGroupNum(next);
                                  if (next == null) {
                                    setSelectedInGroup([]);
                                    setSelectedNotInGroups([]);
                                  }
                                }}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>Competitors In Group (stage_competitors)</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ height: 320, minHeight: 320, overflow: 'auto' }}>
                                  <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell padding="checkbox">
                                          <Checkbox
                                            checked={groupCompetitorsInGroup.length > 0 && selectedInGroup.length === groupCompetitorsInGroup.length}
                                            indeterminate={selectedInGroup.length > 0 && selectedInGroup.length < groupCompetitorsInGroup.length}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedInGroup(groupCompetitorsInGroup.map((r) => r.COMPETITOR_ID ?? r.COMPETITOR_NUM));
                                              } else {
                                                setSelectedInGroup([]);
                                              }
                                            }}
                                            inputProps={{ 'aria-label': 'select all in group' }}
                                          />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Competitor ID</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Competitor Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Competitor Country</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Participant Number</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {groupCompetitorsInGroup.map((r) => {
                                        const cid = r.COMPETITOR_ID ?? r.COMPETITOR_NUM;
                                        return (
                                          <TableRow
                                            key={cid}
                                            hover
                                            selected={selectedInGroup.includes(cid)}
                                            onClick={() => {
                                              setSelectedInGroup((prev) =>
                                                prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                                              );
                                            }}
                                            sx={{ cursor: 'pointer' }}
                                          >
                                            <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                                              <Checkbox
                                                checked={selectedInGroup.includes(cid)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedInGroup((prev) => [...prev, cid]);
                                                  } else {
                                                    setSelectedInGroup((prev) => prev.filter((x) => x !== cid));
                                                  }
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell>{cid}</TableCell>
                                            <TableCell>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {r.logoUrl ? (
                                                  <Avatar src={r.logoUrl} alt={r.name || ''} variant="rounded" sx={{ width: 28, height: 28 }} />
                                                ) : (
                                                  <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}>
                                                    {(r.name || 'C').charAt(0).toUpperCase()}
                                                  </Avatar>
                                                )}
                                                <span>{r.name || `Competitor ${cid}`}</span>
                                              </Box>
                                            </TableCell>
                                            <TableCell>{r.countryName || '—'}</TableCell>
                                            <TableCell onClick={(ev) => ev.stopPropagation()}>
                                              <TextField
                                                variant="outlined"
                                                size="small"
                                                type="number"
                                                value={r.PARTICIPANT_NUM ?? ''}
                                                onBlur={(e) => {
                                                  const val = e.target.value;
                                                  handleParticipantNumChange(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM, cid, val);
                                                }}
                                                onChange={(e) => {
                                                  setGroupCompetitorsInGroup((prev) =>
                                                    prev.map((x) =>
                                                      (x.COMPETITOR_ID ?? x.COMPETITOR_NUM) === cid
                                                        ? { ...x, PARTICIPANT_NUM: e.target.value === '' ? null : Number(e.target.value) }
                                                        : x
                                                    )
                                                  );
                                                }}
                                                inputProps={{ min: 0, style: { width: 56, textAlign: 'center' } }}
                                                sx={{
                                                  width: 72,
                                                  '& .MuiOutlinedInput-root': { backgroundColor: 'background.paper' },
                                                  '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' },
                                                }}
                                              />
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                      {groupCompetitorsInGroup.length === 0 && !loadingGroupCompetitors && (
                                        <TableRow>
                                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            No competitors in this group.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {loadingGroupCompetitors && (
                                        <TableRow>
                                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            Loading…
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                            {/* Group Games & Participants — side by side, below Competitors In Group */}
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mt: 2 }}>
                              <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Group Games</Typography>
                                  <IconButton size="small" onClick={() => handleAddGroupGame(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM)} title="Add game">
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <TableContainer sx={{ maxHeight: 200, overflow: 'auto', overflowX: 'auto' }}>
                                  <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 }, minWidth: 520 }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600, width: 80 }}>Actions</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Game Id</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Use Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Venue</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {loadingGroupGames ? (
                                        <TableRow><TableCell colSpan={6} align="center">Loading…</TableCell></TableRow>
                                      ) : (
                                        groupGames.map((g, idx) => (
                                          <TableRow key={idx} hover>
                                            <TableCell padding="none" sx={{ width: 80 }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconButton size="small" onClick={() => handleDeleteGroupGame(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM, g.GAME_NUM)} sx={{ color: '#d32f2f' }} title="Delete">
                                                  <DeleteIcon fontSize="small" />
                                                </IconButton>
                                                {editingGroupGameIndex === idx ? (
                                                  <IconButton size="small" onClick={() => handleSaveGroupGame(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM, editingGroupGameOriginalNum ?? g.GAME_NUM, { GAME_NUM: g.GAME_NUM ?? 0, USE_NAME: !!g.USE_NAME, START_TIME: g.START_TIME || null, VENUE_ID: g.VENUE_ID || 0, GAME_ID: g.GAME_ID ?? 0 }, idx)} title="Save">
                                                    <SaveIcon fontSize="small" />
                                                  </IconButton>
                                                ) : (
                                                  <IconButton size="small" onClick={() => { setEditingGroupGameIndex(idx); setEditingGroupGameOriginalNum(g.GAME_NUM); }} title="Edit">
                                                    <EditIcon fontSize="small" />
                                                  </IconButton>
                                                )}
                                              </Box>
                                            </TableCell>
                                            <TableCell onClick={(ev) => editingGroupGameIndex !== idx && ev.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                              {editingGroupGameIndex === idx ? (
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  value={g.GAME_NUM ?? ''}
                                                  onChange={(e) => setGroupGames((prev) => prev.map((x, i) => i === idx ? { ...x, GAME_NUM: e.target.value === '' ? 0 : Number(e.target.value) } : x))}
                                                  placeholder="#"
                                                  inputProps={{ min: 1, style: { width: 56 } }}
                                                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                />
                                              ) : (
                                                `#${g.GAME_NUM}`
                                              )}
                                            </TableCell>
                                            <TableCell onClick={(ev) => editingGroupGameIndex !== idx && ev.stopPropagation()}>
                                              {editingGroupGameIndex === idx ? (
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  value={g.GAME_ID && g.GAME_ID !== 0 ? g.GAME_ID : ''}
                                                  onChange={(e) => setGroupGames((prev) => prev.map((x, i) => i === idx ? { ...x, GAME_ID: e.target.value === '' ? 0 : Number(e.target.value) } : x))}
                                                  placeholder="—"
                                                  inputProps={{ min: 0, style: { width: 80 } }}
                                                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                />
                                              ) : (
                                                g.GAME_ID && g.GAME_ID !== 0 ? g.GAME_ID : '—'
                                              )}
                                            </TableCell>
                                            <TableCell padding="checkbox" onClick={(ev) => editingGroupGameIndex !== idx && ev.stopPropagation()}>
                                              {editingGroupGameIndex === idx ? (
                                                <Checkbox size="small" checked={!!g.USE_NAME} onChange={(e) => setGroupGames((prev) => prev.map((x, i) => i === idx ? { ...x, USE_NAME: e.target.checked } : x))} />
                                              ) : (
                                                !!g.USE_NAME ? '✓' : '—'
                                              )}
                                            </TableCell>
                                            <TableCell onClick={(ev) => editingGroupGameIndex !== idx && ev.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                              {editingGroupGameIndex === idx ? (
                                                <DateTimePicker
                                                  value={g.START_TIME ? dayjs(g.START_TIME) : null}
                                                  onChange={(v) => setGroupGames((prev) => prev.map((x, i) => i === idx ? { ...x, START_TIME: v ? v.toISOString() : null } : x))}
                                                  slotProps={{ textField: { size: 'small', sx: { minWidth: 140, '& .MuiOutlinedInput-root': { minHeight: 32 } } } }}
                                                />
                                              ) : (
                                                g.START_TIME ? dayjs(g.START_TIME).format('DD/MM/YYYY HH:mm') : '—'
                                              )}
                                            </TableCell>
                                            <TableCell onClick={(ev) => editingGroupGameIndex !== idx && ev.stopPropagation()}>
                                              {editingGroupGameIndex === idx ? (
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  value={g.VENUE_ID && g.VENUE_ID !== 0 ? g.VENUE_ID : ''}
                                                  onChange={(e) => setGroupGames((prev) => prev.map((x, i) => i === idx ? { ...x, VENUE_ID: e.target.value === '' ? 0 : Number(e.target.value) } : x))}
                                                  placeholder="VENUE_ID"
                                                  inputProps={{ min: 0, style: { width: 80 } }}
                                                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                />
                                              ) : (
                                                g.venueName || '—'
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                      {!loadingGroupGames && groupGames.length === 0 && (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 2 }}>No games</TableCell></TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Paper>
                              <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Participants</Typography>
                                  <IconButton size="small" onClick={() => handleAddGroupParticipant(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM)} title="Add participant">
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                <TableContainer sx={{ maxHeight: 200, overflow: 'auto' }}>
                                  <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600, width: 80 }}>Actions</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Part. #</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Origin Group</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Origin Pos.</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Origin Stage</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} padding="checkbox">Use Name</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {loadingGroupParticipants ? (
                                        <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
                                      ) : (
                                        groupParticipants.map((p, idx) => {
                                          const partNum = p.PARTICIPANT_NUM ?? 0;
                                          const hasName = !!(p.NAME_ID && p.NAME_ID !== 0);
                                          const isEditing = editingGroupParticipantIndex === idx;
                                          return (
                                            <TableRow key={`${partNum}-${idx}`} hover>
                                              <TableCell padding="none" sx={{ width: 80 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                  <IconButton size="small" onClick={() => handleDeleteGroupParticipant(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM, partNum)} sx={{ color: '#d32f2f' }} title="Delete">
                                                    <DeleteIcon fontSize="small" />
                                                  </IconButton>
                                                  {isEditing ? (
                                                    <IconButton size="small" onClick={() => handleSaveGroupParticipant(selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM, partNum, { USE_NAME: !!p.USE_NAME, ORIGIN_GROUP_NUM: p.ORIGIN_GROUP_NUM ?? null, ORIGIN_GROUP_POSITION: p.ORIGIN_GROUP_POSITION ?? null, ORIGIN_STAGE_NUM: p.ORIGIN_STAGE_NUM ?? null })} title="Save">
                                                      <SaveIcon fontSize="small" />
                                                    </IconButton>
                                                  ) : (
                                                    <IconButton size="small" onClick={() => setEditingGroupParticipantIndex(idx)} title="Edit">
                                                      <EditIcon fontSize="small" />
                                                    </IconButton>
                                                  )}
                                                </Box>
                                              </TableCell>
                                              <TableCell>{p.PARTICIPANT_NUM}</TableCell>
                                              <TableCell
                                                onClick={hasName ? (e) => handleParticipantNameClick(e, p, selectedStructureSeasonNum, selectedStructureStageNum, group.GROUP_NUM) : undefined}
                                                sx={{ cursor: hasName ? 'pointer' : 'default', textDecoration: hasName ? 'underline' : 'none', '&:hover': hasName ? { color: 'primary.main' } : {} }}
                                              >
                                                {p.name || `Participant ${p.PARTICIPANT_NUM}`}
                                              </TableCell>
                                              <TableCell onClick={(ev) => !isEditing && ev.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                                {isEditing ? (
                                                  <TextField
                                                    size="small"
                                                    type="number"
                                                    value={p.ORIGIN_GROUP_NUM ?? ''}
                                                    onChange={(e) => setGroupParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, ORIGIN_GROUP_NUM: e.target.value === '' ? null : Number(e.target.value) } : x))}
                                                    placeholder="—"
                                                    inputProps={{ min: 0, style: { width: 56 } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                  />
                                                ) : (
                                                  p.ORIGIN_GROUP_NUM ?? '—'
                                                )}
                                              </TableCell>
                                              <TableCell onClick={(ev) => !isEditing && ev.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                                {isEditing ? (
                                                  <TextField
                                                    size="small"
                                                    type="number"
                                                    value={p.ORIGIN_GROUP_POSITION ?? ''}
                                                    onChange={(e) => setGroupParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, ORIGIN_GROUP_POSITION: e.target.value === '' ? null : Number(e.target.value) } : x))}
                                                    placeholder="—"
                                                    inputProps={{ min: 0, style: { width: 56 } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                  />
                                                ) : (
                                                  p.ORIGIN_GROUP_POSITION ?? '—'
                                                )}
                                              </TableCell>
                                              <TableCell onClick={(ev) => !isEditing && ev.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                                                {isEditing ? (
                                                  <TextField
                                                    size="small"
                                                    type="number"
                                                    value={p.ORIGIN_STAGE_NUM ?? ''}
                                                    onChange={(e) => setGroupParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, ORIGIN_STAGE_NUM: e.target.value === '' ? null : Number(e.target.value) } : x))}
                                                    placeholder="—"
                                                    inputProps={{ min: 0, style: { width: 56 } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 32 }, '& .MuiOutlinedInput-input': { py: 0.5, fontSize: '0.875rem' } }}
                                                  />
                                                ) : (
                                                  p.ORIGIN_STAGE_NUM ?? '—'
                                                )}
                                              </TableCell>
                                              <TableCell padding="checkbox" onClick={(ev) => !isEditing && ev.stopPropagation()}>
                                                {isEditing ? (
                                                  <Checkbox size="small" checked={!!p.USE_NAME} onChange={(e) => setGroupParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, USE_NAME: e.target.checked } : x))} />
                                                ) : (
                                                  !!p.USE_NAME ? '✓' : '—'
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })
                                      )}
                                      {!loadingGroupParticipants && groupParticipants.length === 0 && (
                                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2 }}>No participants</TableCell></TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Paper>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                );
              })()}
                </Box>

                {/* Right: ADD TO GROUP + REMOVE, then Competitors Not In Groups — 45% width */}
                <Box sx={{ flex: { xs: '1 1 100%', lg: '45 45 45%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleAddToGroup(selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum)}
                      disabled={selectedNotInGroups.length === 0 || selectedStructureGroupNum == null}
                      sx={{ textTransform: 'none' }}
                    >
                      &lt;&lt; ADD TO GROUP
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRemoveSelectedFromGroup(selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum)}
                      disabled={selectedInGroup.length === 0 || selectedStructureGroupNum == null}
                      sx={{ textTransform: 'none' }}
                    >
                      REMOVE &gt;&gt;
                    </Button>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#000', display: 'block' }}>
                    Competitors Not In Groups
                    {selectedStructureGroupNum != null && (
                      <Typography component="span" variant="caption" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>
                        (adds to selected group)
                      </Typography>
                    )}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 320, overflow: 'auto' }}>
                    <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.25 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={groupCompetitorsNotInGroups.length > 0 && selectedNotInGroups.length === groupCompetitorsNotInGroups.length}
                              indeterminate={selectedNotInGroups.length > 0 && selectedNotInGroups.length < groupCompetitorsNotInGroups.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedNotInGroups(groupCompetitorsNotInGroups.map((r) => r.COMPETITOR_ID));
                                } else {
                                  setSelectedNotInGroups([]);
                                }
                              }}
                              inputProps={{ 'aria-label': 'select all not in groups' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupCompetitorsNotInGroups.map((r) => {
                          const cid = r.COMPETITOR_ID;
                          return (
                            <TableRow
                              key={cid}
                              hover
                              selected={selectedNotInGroups.includes(cid)}
                              onClick={() => {
                                setSelectedNotInGroups((prev) =>
                                  prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                                );
                              }}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox
                                  checked={selectedNotInGroups.includes(cid)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedNotInGroups((prev) => [...prev, cid]);
                                    } else {
                                      setSelectedNotInGroups((prev) => prev.filter((x) => x !== cid));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>{cid}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {r.logoUrl ? (
                                    <Avatar src={r.logoUrl} alt={r.name || ''} variant="rounded" sx={{ width: 28, height: 28 }} />
                                  ) : (
                                    <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: 'action.hover', fontSize: '0.75rem' }}>
                                      {(r.name || 'C').charAt(0).toUpperCase()}
                                    </Avatar>
                                  )}
                                  <span>{r.name || `Competitor ${cid}`}</span>
                                </Box>
                              </TableCell>
                              <TableCell>{r.countryName || '—'}</TableCell>
                            </TableRow>
                          );
                        })}
                        {groupCompetitorsNotInGroups.length === 0 && !loadingGroupCompetitors && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                              No competitors available (all in groups or not in season).
                            </TableCell>
                          </TableRow>
                        )}
                        {loadingGroupCompetitors && groupCompetitorsNotInGroups.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                              Loading…
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Group Edit Dialog */}
          <Dialog open={groupEditDialogOpen} onClose={handleCloseGroupEditDialog} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogContent>
              {groupEditDialogForm && groupEditDialogContext && (
                <Box sx={{ pt: 1 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Group Hierarchy (Category)"
                        value={groupEditDialogForm.GROUP_CATEGORY_NUM ?? ''}
                        onChange={(e) => setGroupEditDialogForm((f) => ({ ...f, GROUP_CATEGORY_NUM: e.target.value === '' ? null : Number(e.target.value) }))}
                        placeholder="—"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Parent Group</InputLabel>
                        <Select
                          label="Parent Group"
                          value={groupEditDialogForm.FATHER_GROUP ?? ''}
                          onChange={(e) => setGroupEditDialogForm((f) => ({ ...f, FATHER_GROUP: e.target.value === '' ? null : Number(e.target.value) }))}
                          renderValue={(v) => {
                            if (v == null || v === '') return '—';
                            const gr = (groupsByStage[`${groupEditDialogContext.seasonNum}-${groupEditDialogContext.stageNum}`] || []).find((g) => Number(g.GROUP_NUM) === Number(v));
                            return gr ? (gr.name || `Group ${gr.GROUP_NUM}`) : `Group ${v}`;
                          }}
                        >
                          <MenuItem value="">—</MenuItem>
                          {(groupsByStage[`${groupEditDialogContext.seasonNum}-${groupEditDialogContext.stageNum}`] || [])
                            .filter((g) => {
                              if (Number(g.GROUP_NUM) === Number(groupEditDialogForm.GROUP_NUM)) return false;
                              const currentCat = groupEditDialogForm.GROUP_CATEGORY_NUM;
                              if (currentCat == null || currentCat === '') return false;
                              const currentCatNum = Number(currentCat);
                              if (isNaN(currentCatNum)) return false;
                              const gCat = g.GROUP_CATEGORY_NUM;
                              if (gCat == null || gCat === '') return true;
                              return Number(gCat) < currentCatNum;
                            })
                            .sort((a, b) => Number(a.GROUP_NUM) - Number(b.GROUP_NUM))
                            .map((g) => (
                              <MenuItem key={g.GROUP_NUM} value={g.GROUP_NUM}>
                                {g.name || `Group ${g.GROUP_NUM}`}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Group Configuration</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      { key: 'HAS_TABLE', label: 'Has Table' },
                      { key: 'IS_SERIES', label: 'Is Series' },
                      { key: 'USE_NAME', label: 'Use Name' },
                      { key: 'GROUP_BY', label: 'Group By' },
                      { key: 'AUTONOMOUS', label: 'Autonomous' },
                      { key: 'IS_FINAL', label: 'Is Final' },
                    ].map(({ key, label }) => (
                      <Grid item xs={6} sm={4} md={3} key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={!!groupEditDialogForm[key]}
                              onChange={(e) => setGroupEditDialogForm((f) => ({ ...f, [key]: e.target.checked }))}
                            />
                          }
                          label={label}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseGroupEditDialog} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleSaveGroupEditDialog}
                variant="contained"
                disabled={structureGroupSaving}
                sx={{ textTransform: 'none', backgroundColor: '#15803d', '&:hover': { backgroundColor: '#166534' } }}
              >
                {structureGroupSaving ? 'Saving…' : 'Save & Update In Service'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Manage Standings Dialog – edit table for Stage */}
          <Dialog open={manageStandingsDialogOpen} onClose={handleCloseManageStandingsDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { minHeight: '70vh' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Standings for Stage: {structureStageForm?.name || `Stage ${selectedStructureStageNum}`}
              <IconButton size="small" onClick={handleCloseManageStandingsDialog} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 400 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {manageStandingsData.some((r) => r.GROUP_NUM != null && Number(r.GROUP_NUM) !== -1) && (() => {
                    const groupsList = groupsByStage[`${selectedStructureSeasonNum}-${selectedStructureStageNum}`] || [];
                    const getGroupName = (gn) => {
                      if (gn === -1) return 'No Group';
                      const gr = groupsList.find((g) => Number(g.GROUP_NUM) === Number(gn));
                      return gr?.name || `Group ${gn}`;
                    };
                    return (
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Stage Group</InputLabel>
                        <Select
                          label="Stage Group"
                          value={manageStandingsGroupFilter === null ? '__all__' : manageStandingsGroupFilter}
                          onChange={(e) => setManageStandingsGroupFilter(e.target.value === '__all__' ? null : e.target.value)}
                          renderValue={(v) => (v === '__all__' ? 'All' : getGroupName(v))}
                        >
                          <MenuItem value="__all__">All</MenuItem>
                          {[...new Set(manageStandingsData.map((r) => r.GROUP_NUM))].sort((a, b) => a - b).map((gn) => (
                            <MenuItem key={gn} value={gn}>{getGroupName(gn)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    );
                  })()}
                  <FormControlLabel
                    control={<Switch size="small" checked={manageStandingsEditMode} onChange={(e) => setManageStandingsEditMode(e.target.checked)} />}
                    label={manageStandingsEditMode ? 'Edit' : 'View'}
                  />
                  <Button variant="contained" size="small" sx={{ textTransform: 'none', color: 'white', backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' }, ml: 'auto' }} onClick={() => {}}>Delete Standings</Button>
                </Box>
                {manageStandingsLoading ? (
                  <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                  </Box>
                ) : (
                  <TableContainer sx={{ flex: 1, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Id</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Played</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">W</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">D</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">L</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">For</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Against</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">GD</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Pts</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(manageStandingsGroupFilter != null
                          ? manageStandingsData.filter((r) => Number(r.GROUP_NUM) === Number(manageStandingsGroupFilter))
                          : manageStandingsData
                        )
                          .sort((a, b) => (Number(a.POSITION) || 0) - (Number(b.POSITION) || 0))
                          .map((r) => {
                            const played = Number(r.GAMES_PLAYED) || 0;
                            const pts = Number(r.POINTS) || 0;
                            const pct = played > 0 && pts >= 0 ? Math.round((pts / (played * 3)) * 100) : 0;
                            const gd = (Number(r.TOTAL_FOR) || 0) - (Number(r.TOTAL_AGAINST) || 0);
                            const EditableCell = ({ field, val }) =>
                              manageStandingsEditMode ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={r[field] ?? ''}
                                  onChange={(e) => updateManageStandingsRow(r.COMPETITOR_NUM, r.GROUP_NUM, field, e.target.value)}
                                  inputProps={{ style: { width: 48, textAlign: 'center', padding: '4px 8px' } }}
                                  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }}
                                />
                              ) : (
                                <span>{val}</span>
                              );
                            return (
                              <TableRow key={`${r.COMPETITOR_NUM}-${r.GROUP_NUM}`} hover>
                                <TableCell>{r.COMPETITOR_NUM}</TableCell>
                                <TableCell>{r.competitorName || `Competitor ${r.COMPETITOR_NUM}`}</TableCell>
                                <TableCell>{r.GROUP_NUM === -1 ? '—' : r.GROUP_NUM}</TableCell>
                                <TableCell align="center"><EditableCell field="POSITION" val={r.POSITION ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_PLAYED" val={r.GAMES_PLAYED ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_WON" val={r.GAMES_WON ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_EVEN" val={r.GAMES_EVEN ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_LOST" val={r.GAMES_LOST ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="TOTAL_FOR" val={r.TOTAL_FOR ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="TOTAL_AGAINST" val={r.TOTAL_AGAINST ?? 0} /></TableCell>
                                <TableCell align="center">{gd}</TableCell>
                                <TableCell align="center"><EditableCell field="POINTS" val={r.POINTS ?? 0} /></TableCell>
                                <TableCell align="center">{pct}</TableCell>
                              </TableRow>
                            );
                          })}
                        {manageStandingsData.length === 0 && !manageStandingsLoading && (
                          <TableRow>
                            <TableCell colSpan={13} align="center" sx={{ py: 3 }} color="text.secondary">
                              No standings data. Enable Has Table on this stage and save to generate.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'flex-start', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Reload Missing Competitors</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Reorder</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Clear</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}} disabled>Reset</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Recalculate By Games</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Send Update</Button>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={manageStandingsRecalculateLive} onChange={(e) => setManageStandingsRecalculateLive(e.target.checked)} />}
                    label="Recalculate live upon save"
                    sx={{ ml: 0.5 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={manageStandingsMultiStageEnabled}
                        onChange={(e) => {
                          setManageStandingsMultiStageEnabled(e.target.checked);
                          if (!e.target.checked) setManageStandingsSelectedStages([]);
                        }}
                      />
                    }
                    label="Recalculate Multiple Stages"
                    sx={{ ml: 0, mr: 0 }}
                  />
                  <Autocomplete
                    multiple
                    size="small"
                    disabled={!manageStandingsMultiStageEnabled}
                    options={(stagesBySeason[selectedStructureSeasonNum] || []).map((s) => s.STAGE_NUM)}
                    value={manageStandingsSelectedStages}
                    onChange={(_, val) => setManageStandingsSelectedStages(val)}
                    getOptionLabel={(opt) => {
                      const s = (stagesBySeason[selectedStructureSeasonNum] || []).find((st) => st.STAGE_NUM === opt);
                      return s?.name || `Stage ${opt}`;
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((opt, index) => {
                        const s = (stagesBySeason[selectedStructureSeasonNum] || []).find((st) => st.STAGE_NUM === opt);
                        return <Chip variant="outlined" size="small" label={s?.name || `Stage ${opt}`} {...getTagProps({ index })} />;
                      })
                    }
                    renderInput={(params) => <TextField {...params} label="Stages" placeholder={manageStandingsMultiStageEnabled ? 'Select stages...' : ''} />}
                    sx={{ minWidth: 280, flex: 1, maxWidth: 480 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none' }}
                    disabled={!manageStandingsMultiStageEnabled || manageStandingsSelectedStages.length === 0}
                    onClick={() => {}}
                  >
                    Recalculate Multiple Stages
                  </Button>
                </Box>

                {/* Destinations section – collapsible */}
                <Accordion
                  expanded={manageStandingsDestinationsExpanded}
                  onChange={(_, exp) => setManageStandingsDestinationsExpanded(exp)}
                  sx={{ mt: 3, '&:before': { display: 'none' }, boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Destinations ({manageStandingsDestinations.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={manageStandingsLoadPrevEnabled}
                            onChange={(e) => {
                              setManageStandingsLoadPrevEnabled(e.target.checked);
                              if (!e.target.checked) {
                                setManageStandingsLoadPrevSeason(null);
                                setManageStandingsLoadPrevStage(null);
                              }
                            }}
                          />
                        }
                        label="Load From Previous Stage"
                        sx={{ ml: 0, mr: 0 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 180 }} disabled={!manageStandingsLoadPrevEnabled}>
                        <InputLabel>Season</InputLabel>
                        <Select
                          value={manageStandingsLoadPrevSeason ?? ''}
                          label="Season"
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : e.target.value;
                            setManageStandingsLoadPrevSeason(val);
                            setManageStandingsLoadPrevStage(null);
                            if (val != null && stagesBySeason[val] === undefined) {
                              loadStagesAndPhases(val);
                            }
                          }}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {structureSeasons.map((s) => (
                            <MenuItem key={s.SEASON_NUM} value={s.SEASON_NUM}>
                              #{s.SEASON_NUM} - {s.name || `Season ${s.SEASON_NUM}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 180 }} disabled={!manageStandingsLoadPrevEnabled || manageStandingsLoadPrevSeason == null}>
                        <InputLabel>Stage</InputLabel>
                        <Select
                          value={manageStandingsLoadPrevStage ?? ''}
                          label="Stage"
                          onChange={(e) => setManageStandingsLoadPrevStage(e.target.value === '' ? null : e.target.value)}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {(stagesBySeason[manageStandingsLoadPrevSeason] || []).map((s) => (
                            <MenuItem key={s.STAGE_NUM} value={s.STAGE_NUM}>
                              {s.name || `Stage ${s.STAGE_NUM}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none' }}
                        disabled={!manageStandingsLoadPrevEnabled || manageStandingsLoadPrevSeason == null || manageStandingsLoadPrevStage == null}
                        onClick={() => {}}
                      >
                        Add Destinations
                      </Button>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddDestination} sx={{ textTransform: 'none' }}>
                        Add New Destination
                      </Button>
                    </Box>
                    <TableContainer sx={{ maxHeight: 240, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, width: 48 }}>Color</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">D. Num</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>D. Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Table Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Group Num</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">From Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">To Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 48 }} align="center" padding="checkbox" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {manageStandingsDestinations.map((d, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: (d.COLOR && /^#[0-9A-Fa-f]{6}$/.test(d.COLOR)) ? d.COLOR : '#e0e0e0', border: '1px solid #ccc', flexShrink: 0 }} />
                                <TextField size="small" value={d.COLOR || ''} onChange={(e) => handleUpdateDestination(idx, 'COLOR', e.target.value)} placeholder="#hex" inputProps={{ style: { width: 56, fontSize: '0.75rem' } }} sx={{ '& .MuiInput-root': { fontSize: '0.75rem' } }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Autocomplete
                                key={`dest-name-${idx}-${d.NAME_ID || 'empty'}`}
                                size="small"
                                freeSolo
                                options={tableDestinationsTermOptions}
                                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt?.engValue || opt?.values?.[0]?.value || `Term ${opt?.id}` || ''))}
                                value={d.NAME_ID && d.NAME_ID !== 0 ? ((allTerms || []).find((t) => t.id === d.NAME_ID) || null) : null}
                                isOptionEqualToValue={(opt, val) => (opt && val && (opt.id === val.id))}
                                filterOptions={(options, { inputValue }) => {
                                  const trim = (inputValue || '').trim();
                                  if (trim.length < 3) return [];
                                  const lower = trim.toLowerCase();
                                  return options.filter((opt) => {
                                    const label = (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase();
                                    return String(label).includes(lower);
                                  });
                                }}
                                onChange={async (_, v) => {
                                  if (v == null) {
                                    handleUpdateDestination(idx, 'NAME_ID', 0);
                                    return;
                                  }
                                  if (typeof v === 'object' && v?.id) {
                                    handleUpdateDestination(idx, 'NAME_ID', v.id);
                                    return;
                                  }
                                  if (typeof v === 'string' && (v || '').trim()) {
                                    const txt = String(v).trim();
                                    setDestinationNameCreating(idx);
                                    try {
                                      const newTerm = await api.createTerm({
                                        category: 'Table Destinations',
                                        values: [{ languageId: 1, value: txt, isDefault: true, status: 'Approved' }],
                                      });
                                      const tid = newTerm?.id ?? newTerm;
                                      handleUpdateDestination(idx, 'NAME_ID', tid);
                                      await loadTermsAndCategories();
                                      setSnackbar({ open: true, message: 'Destination term created', severity: 'success' });
                                    } catch (err) {
                                      setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                    } finally {
                                      setDestinationNameCreating(null);
                                    }
                                  }
                                }}
                                disabled={destinationNameCreating === idx}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Type 3+ chars for suggestions or enter new"
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <>
                                          {params.InputProps.endAdornment}
                                          {d.NAME_ID && (
                                            <InputAdornment position="end">
                                              <IconButton
                                                size="small"
                                                onClick={(e) => handleDestinationNameClick(e, d.NAME_ID)}
                                                aria-label="Edit term"
                                                sx={{ mr: -0.5 }}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </InputAdornment>
                                          )}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                                sx={{ minWidth: 160, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.5 }}>{d.DESTINATION_NUM ?? idx + 1}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Select
                                size="small"
                                value={d.DESTINATION_TYPE ?? 0}
                                onChange={(e) => handleUpdateDestination(idx, 'DESTINATION_TYPE', Number(e.target.value))}
                                sx={{ minWidth: 100, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                {DESTINATION_TYPE_OPTIONS.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Select
                                size="small"
                                value={d.TABLE_TYPE ?? 0}
                                onChange={(e) => handleUpdateDestination(idx, 'TABLE_TYPE', Number(e.target.value))}
                                sx={{ minWidth: 90, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                {TABLE_TYPE_OPTIONS.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.GROUP_NUM ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'GROUP_NUM', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.FROM_POSITION ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'FROM_POSITION', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.TO_POSITION ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'TO_POSITION', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} padding="checkbox">
                              <IconButton size="small" onClick={() => handleRemoveDestination(idx)} sx={{ color: '#dc2626' }} aria-label="Delete">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#dc2626', borderColor: '#dc2626', '&:hover': { borderColor: '#b91c1c', bgcolor: 'rgba(220,38,38,0.04)' } }} onClick={handleRemoveAllDestinations} disabled={manageStandingsDestinations.length === 0}>
                        Remove All Destinations
                      </Button>
                      <Typography variant="body2" color="text.secondary">Total Items: {manageStandingsDestinations.length}</Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Points Deductions section – collapsible, collapsed by default */}
                <Accordion
                  expanded={manageStandingsPointsDeductionsExpanded}
                  onChange={(_, exp) => setManageStandingsPointsDeductionsExpanded(exp)}
                  sx={{ mt: 3, '&:before': { display: 'none' }, boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Points Deductions ({manageStandingsPointsDeductions.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Box sx={{ mb: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddPointsDeduction} sx={{ textTransform: 'none' }}>
                        Add Points Deduction
                      </Button>
                    </Box>
                    <TableContainer sx={{ maxHeight: 240, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: 40 }} align="center">#</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Points</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Goals For</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">Goals Against</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Reason</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 110 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 48 }} align="center" padding="checkbox" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {manageStandingsPointsDeductions.map((pd, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell align="center" sx={{ py: 0.5 }}>{idx + 1}</TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Autocomplete
                                  size="small"
                                  options={manageStandingsData}
                                  getOptionLabel={(opt) => opt?.competitorName || `Competitor ${opt?.COMPETITOR_NUM || ''}`}
                                  value={manageStandingsData.find((c) => Number(c.COMPETITOR_NUM) === Number(pd.COMPETITOR_NUM)) || null}
                                  onChange={(_, v) => handleUpdatePointsDeduction(idx, 'COMPETITOR_NUM', v ? Number(v.COMPETITOR_NUM) : 0)}
                                  renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Select competitor" sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }} />
                                  )}
                                  sx={{ minWidth: 140 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.POINTS ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'POINTS', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ min: -999, style: { width: 48, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.GOALS_FOR ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'GOALS_FOR', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ style: { width: 50, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.GOALS_AGAINST ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'GOALS_AGAINST', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ style: { width: 50, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  options={pointsDeductionReasonsTermOptions}
                                  getOptionLabel={(opt) => {
                                    if (typeof opt === 'string') return opt;
                                    if (opt?._createValue) return opt.engValue || `Create "${opt._createValue}"`;
                                    return opt?.engValue || opt?.values?.[0]?.value || `Term ${opt?.id}` || '';
                                  }}
                                  value={pd.REASON_TERM_ID && pd.REASON_TERM_ID !== 0 ? ((allTerms || []).find((t) => t.id === pd.REASON_TERM_ID) || null) : null}
                                  isOptionEqualToValue={(opt, val) => {
                                    if (!opt || !val) return opt === val;
                                    if (opt.id === '__create__' || val.id === '__create__') return false;
                                    return opt.id === val.id;
                                  }}
                                  filterOptions={(options, { inputValue }) => {
                                    const trim = (inputValue || '').trim();
                                    const lower = trim.toLowerCase();
                                    let filtered = trim.length < 2 ? options : options.filter((opt) => {
                                      const label = (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase();
                                      return String(label).includes(lower);
                                    });
                                    const exactMatch = options.some((opt) =>
                                      (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase() === lower
                                    );
                                    if (trim.length >= 1 && !exactMatch) {
                                      filtered = [...filtered, { id: '__create__', engValue: `Create "${trim}"`, _createValue: trim }];
                                    }
                                    return filtered;
                                  }}
                                  onChange={async (_, v) => {
                                    if (v == null) {
                                      handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', 0);
                                      return;
                                    }
                                    if (typeof v === 'object' && v?.id === '__create__' && v?._createValue) {
                                      const valueToCreate = String(v._createValue).trim();
                                      if (!valueToCreate) return;
                                      try {
                                        const newTerm = await api.createTerm({
                                          category: 'Points Deduction Reasons',
                                          values: [{ languageId: 1, value: valueToCreate, isDefault: true, status: 'Approved' }],
                                        });
                                        const tid = newTerm?.id ?? newTerm;
                                        handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', tid);
                                        await loadTermsAndCategories();
                                        setSnackbar({ open: true, message: 'Reason term created', severity: 'success' });
                                      } catch (err) {
                                        setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                      }
                                      return;
                                    }
                                    if (typeof v === 'object' && v?.id && v.id !== '__create__') {
                                      handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', v.id);
                                      return;
                                    }
                                    if (typeof v === 'string' && (v || '').trim()) {
                                      try {
                                        const newTerm = await api.createTerm({
                                          category: 'Points Deduction Reasons',
                                          values: [{ languageId: 1, value: String(v).trim(), isDefault: true, status: 'Approved' }],
                                        });
                                        const tid = newTerm?.id ?? newTerm;
                                        handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', tid);
                                        await loadTermsAndCategories();
                                        setSnackbar({ open: true, message: 'Reason term created', severity: 'success' });
                                      } catch (err) {
                                        setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                      }
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      size="small"
                                      placeholder="Type 2+ chars or enter new"
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {params.InputProps.endAdornment}
                                            {pd.REASON_TERM_ID && pd.REASON_TERM_ID !== 0 && (
                                              <InputAdornment position="end">
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => handleReasonTermClick(e, pd.REASON_TERM_ID)}
                                                  aria-label="Edit term"
                                                  sx={{ mr: -0.5 }}
                                                >
                                                  <EditIcon fontSize="small" />
                                                </IconButton>
                                              </InputAdornment>
                                            )}
                                          </>
                                        ),
                                      }}
                                      sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }}
                                    />
                                  )}
                                  sx={{ minWidth: 130 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="date"
                                  value={(pd.DEDUCTION_DATE || '').toString().slice(0, 10) || ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'DEDUCTION_DATE', e.target.value || null)}
                                  InputLabelProps={{ shrink: true }}
                                  inputProps={{ style: { fontSize: '0.75rem' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }} padding="checkbox">
                                <IconButton size="small" onClick={() => handleRemovePointsDeduction(idx)} sx={{ color: '#dc2626' }} aria-label="Delete">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#dc2626', borderColor: '#dc2626', '&:hover': { borderColor: '#b91c1c', bgcolor: 'rgba(220,38,38,0.04)' } }} onClick={handleRemoveAllPointsDeductions} disabled={manageStandingsPointsDeductions.length === 0}>
                        Remove All Points Deductions
                      </Button>
                      <Typography variant="body2" color="text.secondary">Total Items: {manageStandingsPointsDeductions.length}</Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseManageStandingsDialog} color="inherit">Close</Button>
              <Button
                variant="contained"
                onClick={handleSaveManageStandings}
                disabled={manageStandingsSaving || (JSON.stringify(manageStandingsData) === JSON.stringify(manageStandingsOriginal) && JSON.stringify(manageStandingsDestinations) === JSON.stringify(manageStandingsDestinationsOriginal) && JSON.stringify(manageStandingsPointsDeductions) === JSON.stringify(manageStandingsPointsDeductionsOriginal))}
                sx={{ textTransform: 'none', backgroundColor: '#15803d', '&:hover': { backgroundColor: '#166534' } }}
              >
                {manageStandingsSaving ? 'Saving…' : 'Save & Update In Service'}
              </Button>
            </DialogActions>
          </Dialog>

        </Box>
      )}
        </Box>
      </Paper>

      {/* Image edit dialog – one dialog with tabs (Competition / Trophy) per UI-STANDARDS */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Edit Image</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
            <Tabs
              value={editingImageType === 'competition' ? 0 : 1}
              onChange={(e, newValue) => {
                const newType = newValue === 0 ? 'competition' : 'trophy';
                setEditingImageType(newType);
                if (newType === 'competition') {
                  setImageUrlValue(formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL || '');
                } else {
                  setImageUrlValue(formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL || '');
                }
              }}
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
                '& .Mui-selected': { color: '#1976d2' },
              }}
            >
              <Tab label="Competition Image" />
              <Tab label="Trophy Image" />
            </Tabs>
          </Box>
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
            helperText="Enter the URL of the image"
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
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#f5f5f5', zIndex: -1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">Invalid image URL</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog} color="inherit">Cancel</Button>
          <Button onClick={handleSaveImageUrl} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Create city term (category: Cities) */}
      <Dialog open={createCityDialogOpen} onClose={() => { setCreateCityDialogOpen(false); setCreateCityName(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>New City Term</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="City name"
            fullWidth
            variant="outlined"
            value={createCityName}
            onChange={(e) => setCreateCityName(e.target.value)}
            placeholder="Enter city name"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateCityDialogOpen(false); setCreateCityName(''); }} color="inherit">Cancel</Button>
          <Button onClick={handleCreateCitySave} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createBracketFinalDialogOpen} onClose={() => { setCreateBracketFinalDialogOpen(false); setCreateBracketFinalName(''); setBracketFinalInputValue(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>New Bracket Final Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bracket Final name"
            fullWidth
            variant="outlined"
            value={createBracketFinalName}
            onChange={(e) => setCreateBracketFinalName(e.target.value)}
            placeholder="Enter Bracket Final name"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateBracketFinalDialogOpen(false); setCreateBracketFinalName(''); setBracketFinalInputValue(''); }} color="inherit">Cancel</Button>
          <Button onClick={handleCreateBracketFinalSave} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={removeFromAllSeasonsDialogOpen} onClose={() => setRemoveFromAllSeasonsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove From All Seasons</DialogTitle>
        <DialogContent>
          <Typography>
            Remove the selected competitor(s) from all seasons of this competition?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveFromAllSeasonsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRemoveFromAllSeasonsConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createRoundNameDialogOpen} onClose={() => { setCreateRoundNameDialogOpen(false); setCreateRoundNameName(''); setRoundNameInputValue(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>New Round Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Round Name"
            fullWidth
            variant="outlined"
            value={createRoundNameName}
            onChange={(e) => setCreateRoundNameName(e.target.value)}
            placeholder="Enter Round Name"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateRoundNameDialogOpen(false); setCreateRoundNameName(''); setRoundNameInputValue(''); }} color="inherit">Cancel</Button>
          <Button onClick={handleCreateRoundNameSave} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {termModalOpen && currentTerm && (
        <TermEditModal
          open={termModalOpen}
          term={currentTerm}
          onClose={() => { setTermModalOpen(false); setCurrentTerm(null); setTermModalGroupContext(null); setTermModalPhaseContext(null); setTermModalParticipantContext(null); }}
          onSave={handleTermSave}
          allTerms={allTerms}
          allCategories={allCategories}
          initialCategory={termModalCategory}
        />
      )}

      <Dialog open={participantAddDialogOpen} onClose={() => { if (!participantAddSaving) { setParticipantAddDialogOpen(false); setParticipantAddContext(null); setNewParticipantName(''); setParticipantSelectedTermId(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle>Add Participant</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            size="small"
            fullWidth
            options={participantTermOptions}
            getOptionLabel={(opt) => (opt?.values && opt.values.find(v => v.languageId === 1)?.value) || opt?.engValue || (opt?.id ? `Term ${opt.id}` : '')}
            value={participantSelectedTermId ? (participantTermOptions.find(t => t.id === participantSelectedTermId) || null) : null}
            inputValue={newParticipantName}
            onInputChange={(_, v) => {
              setNewParticipantName(v);
              if (participantSelectedTermId) setParticipantSelectedTermId(null);
            }}
            onChange={(_, v) => {
              if (v && typeof v === 'object' && v.id) {
                setParticipantSelectedTermId(v.id);
                setNewParticipantName((v.values && v.values.find(x => x.languageId === 1)?.value) || v.engValue || `Term ${v.id}`);
              } else if (typeof v === 'string') {
                setParticipantSelectedTermId(null);
                setNewParticipantName(v);
              }
            }}
            filterOptions={(options, { inputValue }) => {
              const trim = (inputValue || '').trim();
              if (trim.length < 2) return [];
              const lower = trim.toLowerCase();
              return options.filter((opt) => {
                const label = (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || '';
                return String(label).toLowerCase().includes(lower);
              });
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddParticipantConfirm()}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Participant Name"
                placeholder="Start typing for suggestions or enter a new name"
                autoFocus
                sx={{ mt: 1 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setParticipantAddDialogOpen(false); setParticipantAddContext(null); setNewParticipantName(''); setParticipantSelectedTermId(null); }} color="inherit" disabled={participantAddSaving}>Cancel</Button>
          <Button onClick={handleAddParticipantConfirm} variant="contained" color="primary" disabled={participantAddSaving || (!(newParticipantName || '').trim() && !participantSelectedTermId)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={seasonModalOpen} onClose={handleSeasonModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>{seasonModalMode === 'add' ? 'New Season :' : 'Edit Season'}</DialogTitle>
        <DialogContent>
          {seasonModalMode === 'add' ? (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Season Name"
                  placeholder="Enter Season Name"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    label="Language"
                    value={newSeasonLanguageId}
                    onChange={(e) => setNewSeasonLanguageId(Number(e.target.value))}
                  >
                    <MenuItem value={1}>English</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Date"
                  value={newSeasonStartDate ? dayjs(newSeasonStartDate) : null}
                  onChange={(v) => setNewSeasonStartDate(v ? v.toISOString() : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={newSeasonRoundNameCheck} onChange={(e) => setNewSeasonRoundNameCheck(e.target.checked)} />}
                    label="Round Name"
                  />
                </Box>
              </Grid>
              {newSeasonRoundNameCheck && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Round name</InputLabel>
                    <Select label="Round name" value={newSeasonRoundNameId ?? ''} onChange={(e) => setNewSeasonRoundNameId(e.target.value === '' ? null : e.target.value)}>
                      <MenuItem value="">select round name</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End Date"
                  value={newSeasonEndDate ? dayjs(newSeasonEndDate) : null}
                  onChange={(v) => setNewSeasonEndDate(v ? v.toISOString() : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Checkbox size="small" checked={newSeasonSetCurrent} onChange={(e) => setNewSeasonSetCurrent(e.target.checked)} />} label="Set Current Season" />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Checkbox size="small" checked={newSeasonBasedOnLast} onChange={(e) => setNewSeasonBasedOnLast(e.target.checked)} />} label="Based on last season" />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="number" label="Season number" value={seasonForm.SEASON_NUM} onChange={(e) => setSeasonForm((f) => ({ ...f, SEASON_NUM: e.target.value }))} disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={seasonTermOptions}
                  getOptionLabel={(opt) => (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || `Term ${opt.id}`}
                  value={seasonForm.NAME_ID ? (seasonTermOptions.find(t => t.id === (seasonForm.NAME_ID?.id ?? seasonForm.NAME_ID)) || null) : null}
                  onChange={(_, v) => setSeasonForm((f) => ({ ...f, NAME_ID: v }))}
                  renderInput={(params) => <TextField {...params} label="Name (term)" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start date"
                  value={seasonForm.START_DATE ? dayjs(seasonForm.START_DATE) : null}
                  onChange={(v) => setSeasonForm((f) => ({ ...f, START_DATE: v ? v.format('YYYY-MM-DD') : '' }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End date"
                  value={seasonForm.END_DATE ? dayjs(seasonForm.END_DATE) : null}
                  onChange={(v) => setSeasonForm((f) => ({ ...f, END_DATE: v ? v.format('YYYY-MM-DD') : '' }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel control={<Checkbox size="small" checked={seasonForm.HAS_TABLE} onChange={(e) => setSeasonForm((f) => ({ ...f, HAS_TABLE: e.target.checked }))} />} label={<Typography variant="body2">HAS_TABLE</Typography>} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel control={<Checkbox size="small" checked={seasonForm.HAS_BRACKETS} onChange={(e) => setSeasonForm((f) => ({ ...f, HAS_BRACKETS: e.target.checked }))} />} label={<Typography variant="body2">HAS_BRACKETS</Typography>} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSeasonModalClose} sx={{ textTransform: 'uppercase' }}>CANCEL</Button>
          <Button
            variant="contained"
            onClick={handleSeasonModalSave}
            disabled={seasonSaving || (seasonModalMode === 'add' && !(newSeasonName || '').trim()) || (seasonModalMode === 'edit' && (seasonForm.SEASON_NUM === '' || isNaN(Number(seasonForm.SEASON_NUM))))}
            sx={{ textTransform: 'uppercase' }}
          >
            {seasonSaving ? 'Saving…' : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stageModalOpen} onClose={handleStageModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {stageModalMode === 'add' ? 'New Stage :' : 'Edit Stage'}
          <IconButton size="small" onClick={handleStageModalClose} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {stageModalMode === 'add' ? (
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={stageTermOptions}
                  getOptionLabel={(opt) => (opt?.values && opt.values.find(v => v.languageId === 1)?.value) || opt?.engValue || (opt?.id ? `Term ${opt.id}` : '')}
                  value={stageForm.NAME_ID ? (stageTermOptions.find(t => t.id === (stageForm.NAME_ID?.id ?? stageForm.NAME_ID)) || null) : null}
                  inputValue={newStageName}
                  onInputChange={(_, v) => {
                    setNewStageName(v);
                    if (stageForm.NAME_ID) setStageForm((f) => ({ ...f, NAME_ID: null }));
                  }}
                  onChange={(_, v) => {
                    if (v && typeof v === 'object' && v.id) {
                      setStageForm((f) => ({ ...f, NAME_ID: v }));
                      setNewStageName((v.values && v.values.find(x => x.languageId === 1)?.value) || v.engValue || `Term ${v.id}`);
                    } else if (typeof v === 'string') {
                      setStageForm((f) => ({ ...f, NAME_ID: null }));
                      setNewStageName(v);
                    }
                  }}
                  filterOptions={(options, { inputValue }) => {
                    const trim = (inputValue || '').trim();
                    if (trim.length < 3) return [];
                    const lower = trim.toLowerCase();
                    return options.filter((opt) => {
                      const label = (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || '';
                      return String(label).toLowerCase().includes(lower);
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Stage Name"
                      placeholder="Enter 3+ letters for suggestions"
                      required
                    />
                  )}
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={stageTermOptions}
                  getOptionLabel={(opt) => (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || `Term ${opt.id}`}
                  value={stageForm.NAME_ID ? (stageTermOptions.find(t => t.id === (stageForm.NAME_ID?.id ?? stageForm.NAME_ID)) || null) : null}
                  onChange={(_, v) => setStageForm((f) => ({ ...f, NAME_ID: v }))}
                  renderInput={(params) => <TextField {...params} label="Stage Name (term)" />}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage Type</InputLabel>
                <Select
                  label="Stage Type"
                  value={stageForm.STAGE_TYPE ?? 1}
                  onChange={(e) => setStageForm((f) => ({ ...f, STAGE_TYPE: Number(e.target.value) }))}
                  renderValue={(v) => stagesTypes.find((t) => Number(t.STAGE_TYPE_ID) === Number(v))?.STAGE_TYPE ?? String(v)}
                >
                  {stagesTypes.map((t) => (
                    <MenuItem key={t.STAGE_TYPE_ID} value={t.STAGE_TYPE_ID}>
                      {t.STAGE_TYPE}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Num Of Games"
                value={stageForm.NUM_OF_GAMES ?? -1}
                onChange={(e) => setStageForm((f) => ({ ...f, NUM_OF_GAMES: e.target.value === '' ? -1 : Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Phase</InputLabel>
                <Select
                  label="Phase"
                  value={stageForm.PHASE ?? ''}
                  onChange={(e) => setStageForm((f) => ({ ...f, PHASE: e.target.value || '' }))}
                  renderValue={(v) => v || 'Not Selected'}
                >
                  <MenuItem value="">Not Selected</MenuItem>
                  {(phasesBySeason[stageFormContext?.seasonNum] || []).map((ph) => {
                    const displayName = ph.name || `Phase ${ph.PHASE_NUM}`;
                    return (
                      <MenuItem key={ph.PHASE_NUM} value={displayName}>
                        {displayName}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Stage Parameters</Typography>
              <Grid container spacing={1}>
                {[
                  { key: 'HAS_TABLE', label: 'Has Table' },
                  { key: 'INCLUDE_IN_BRACKET', label: 'Include in bracket' },
                  { key: 'FILTER_DIVISION', label: 'Filter Division' },
                  { key: 'CONNECTED_IN_BRACKETS', label: 'Connected In Brackets' },
                  { key: 'PRE_VISUAL_BRACKETS', label: 'Pre Visual Brackets' },
                  { key: 'IS_SERIES', label: 'Is Series' },
                  { key: 'CONNECTED_TO_PREVIOUS_STAGE', label: 'Connected To previous stage' },
                ].map(({ key, label }) => (
                  <Grid item xs={6} sm={4} key={key}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={!!stageForm[key]}
                          onChange={(e) => setStageForm((f) => ({ ...f, [key]: e.target.checked }))}
                        />
                      }
                      label={<Typography variant="body2">{label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Stage Dates</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Start Date"
                    value={stageForm.START_DATE ? dayjs(stageForm.START_DATE) : null}
                    onChange={(v) => setStageForm((f) => ({ ...f, START_DATE: v ? v.toISOString() : '' }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="End Date"
                    value={stageForm.END_DATE ? dayjs(stageForm.END_DATE) : null}
                    onChange={(v) => setStageForm((f) => ({ ...f, END_DATE: v ? v.toISOString() : '' }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Grid>
            {stageModalMode === 'add' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={newStageSetCurrent}
                      onChange={(e) => setNewStageSetCurrent(e.target.checked)}
                    />
                  }
                  label="Set Current Stage"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStageModalClose}>CANCEL</Button>
          <Button
            variant="contained"
            onClick={handleStageModalSave}
            disabled={stageSaving || (stageModalMode === 'add' && !(newStageName || '').trim() && !stageForm.NAME_ID)}
            sx={{ textTransform: 'none' }}
          >
            {stageSaving ? 'Saving…' : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Stages dialog */}
      <Dialog open={generateStagesDialogOpen} onClose={() => { setGenerateStagesDialogOpen(false); setGenerateStagesImportSeasonNum(null); setGenerateStagesTypes({ leagueCycle: false, groupStage: false, bracketStage: false }); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Generate Stages
          <IconButton size="small" onClick={() => setGenerateStagesDialogOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>Import Stages from previous season</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Season</InputLabel>
              <Select
                label="Select Season"
                value={generateStagesImportSeasonNum ?? ''}
                onChange={(e) => setGenerateStagesImportSeasonNum(e.target.value === '' ? null : e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select Season</MenuItem>
                {(structureSeasons || [])
                  .filter((s) => s.SEASON_NUM !== selectedStructureSeasonNum)
                  .map((s) => (
                    <MenuItem key={s.SEASON_NUM} value={s.SEASON_NUM}>
                      #{s.SEASON_NUM} - {s.name || `Season ${s.SEASON_NUM}`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              disabled={!generateStagesImportSeasonNum || !id}
              sx={{ textTransform: 'none' }}
              onClick={async () => {
                if (!id || !generateStagesImportSeasonNum || selectedStructureSeasonNum == null) return;
                try {
                  const sourceStages = await api.getStages(id, generateStagesImportSeasonNum);
                  const currentStages = stagesBySeason[selectedStructureSeasonNum] || [];
                  const maxNum = currentStages.length ? Math.max(...currentStages.map((s) => Number(s.STAGE_NUM))) : 0;
                  let nextNum = maxNum + 1;
                  for (const s of sourceStages) {
                    const payload = {
                      STAGE_NUM: nextNum,
                      NAME_ID: s.NAME_ID,
                      STAGE_TYPE: s.STAGE_TYPE ?? 1,
                      NUM_OF_GAMES: s.NUM_OF_GAMES ?? -1,
                      START_DATE: s.START_DATE,
                      END_DATE: s.END_DATE,
                      HAS_TABLE: !!s.HAS_TABLE,
                      INCLUDE_IN_BRACKET: !!s.INCLUDE_IN_BRACKET,
                      FILTER_DIVISION: !!s.FILTER_DIVISION,
                      CONNECTED_IN_BRACKETS: !!s.CONNECTED_IN_BRACKETS,
                      PRE_VISUAL_BRACKETS: !!s.PRE_VISUAL_BRACKETS,
                      IS_SERIES: !!s.IS_SERIES,
                      CONNECTED_TO_PREVIOUS_STAGE: !!s.CONNECTED_TO_PREVIOUS_STAGE,
                      PHASE: s.PHASE ?? '',
                    };
                    await api.createStage(id, selectedStructureSeasonNum, payload);
                    nextNum += 1;
                  }
                  setSnackbar({ open: true, message: `Imported ${sourceStages.length} stage(s)`, severity: 'success' });
                  loadStagesAndPhases(selectedStructureSeasonNum);
                  setGenerateStagesDialogOpen(false);
                  setGenerateStagesImportSeasonNum(null);
                } catch (err) {
                  setSnackbar({ open: true, message: err.message || 'Import failed', severity: 'error' });
                }
              }}
            >
              IMPORT STAGES
            </Button>
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Stages Types</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {[
              { key: 'leagueCycle', label: 'League Cycle' },
              { key: 'groupStage', label: 'Group Stage' },
              { key: 'bracketStage', label: 'Bracket Stage' },
            ].map(({ key, label }) => (
              <Grid item xs={12} key={key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={!!generateStagesTypes[key]}
                      onChange={(e) => setGenerateStagesTypes((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                  }
                  label={label}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateStagesDialogOpen(false)}>CANCEL</Button>
          <Button
            variant="contained"
            disabled={!generateStagesTypes.leagueCycle && !generateStagesTypes.groupStage && !generateStagesTypes.bracketStage}
            sx={{ textTransform: 'none' }}
            onClick={async () => {
              if (!id || selectedStructureSeasonNum == null) return;
              const names = {
                leagueCycle: 'League Cycle',
                groupStage: 'Group Stage',
                bracketStage: 'Bracket Stage',
              };
              const types = { leagueCycle: 1, groupStage: 1, bracketStage: 2 };
              const currentStages = stagesBySeason[selectedStructureSeasonNum] || [];
              const maxNum = currentStages.length ? Math.max(...currentStages.map((s) => Number(s.STAGE_NUM))) : 0;
              let nextNum = maxNum + 1;
              try {
                for (const key of ['leagueCycle', 'groupStage', 'bracketStage']) {
                  if (!generateStagesTypes[key]) continue;
                  const term = await api.createTerm({
                    category: 'Stages Names',
                    values: [{ languageId: 1, value: names[key], isDefault: true, status: 'Approved' }],
                  });
                  await api.createStage(id, selectedStructureSeasonNum, {
                    STAGE_NUM: nextNum,
                    NAME_ID: term?.id ?? term,
                    STAGE_TYPE: types[key],
                    NUM_OF_GAMES: -1,
                    HAS_TABLE: key === 'groupStage' || key === 'leagueCycle',
                    INCLUDE_IN_BRACKET: key === 'bracketStage',
                    PRE_VISUAL_BRACKETS: false,
                    IS_SERIES: false,
                    CONNECTED_TO_PREVIOUS_STAGE: false,
                    FILTER_DIVISION: false,
                    CONNECTED_IN_BRACKETS: false,
                    PHASE: '',
                  });
                  nextNum += 1;
                }
                setSnackbar({ open: true, message: 'Stages created', severity: 'success' });
                loadStagesAndPhases(selectedStructureSeasonNum);
                setGenerateStagesDialogOpen(false);
                setGenerateStagesTypes({ leagueCycle: false, groupStage: false, bracketStage: false });
              } catch (err) {
                setSnackbar({ open: true, message: err.message || 'Create failed', severity: 'error' });
              }
            }}
          >
            CREATE
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={groupModalOpen} onClose={handleGroupModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {groupModalMode === 'add' ? 'Add Group' : 'Edit Group'}
          <IconButton size="small" onClick={handleGroupModalClose} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              {groupModalMode === 'add' ? (
                <Autocomplete
                  freeSolo
                  size="small"
                  fullWidth
                  options={groupTermOptions}
                  getOptionLabel={(opt) => (opt?.values && opt.values.find(v => v.languageId === 1)?.value) || opt?.engValue || (opt?.id ? `Term ${opt.id}` : '')}
                  value={groupForm.NAME_ID ? (groupTermOptions.find(t => t.id === (groupForm.NAME_ID?.id ?? groupForm.NAME_ID)) || null) : null}
                  inputValue={newGroupName}
                  onInputChange={(_, v) => {
                    setNewGroupName(v);
                    if (groupForm.NAME_ID) setGroupForm((f) => ({ ...f, NAME_ID: null }));
                  }}
                  onChange={(_, v) => {
                    if (v && typeof v === 'object' && v.id) {
                      setGroupForm((f) => ({ ...f, NAME_ID: v }));
                      setNewGroupName((v.values && v.values.find(x => x.languageId === 1)?.value) || v.engValue || `Term ${v.id}`);
                    } else if (typeof v === 'string') {
                      setGroupForm((f) => ({ ...f, NAME_ID: null }));
                      setNewGroupName(v);
                    }
                  }}
                  filterOptions={(options, { inputValue }) => {
                    const trim = (inputValue || '').trim();
                    if (trim.length < 3) return [];
                    const lower = trim.toLowerCase();
                    return options.filter((opt) => {
                      const label = (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || '';
                      return String(label).toLowerCase().includes(lower);
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Group Name"
                      placeholder="Enter 3+ letters for suggestions or type a new name"
                      required={groupModalMode === 'add'}
                    />
                  )}
                />
              ) : (
                <Autocomplete
                  size="small"
                  fullWidth
                  options={groupTermOptions}
                  getOptionLabel={(opt) => (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || `Term ${opt.id}`}
                  value={groupForm.NAME_ID ? (groupTermOptions.find(t => t.id === (groupForm.NAME_ID?.id ?? groupForm.NAME_ID)) || null) : null}
                  onChange={(_, v) => setGroupForm((f) => ({ ...f, NAME_ID: v }))}
                  renderInput={(params) => <TextField {...params} label="Group Name (term)" />}
                />
              )}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Group Settings</Typography>
              <Grid container spacing={1}>
                {[
                  { key: 'HAS_TABLE', label: 'Has Table' },
                  { key: 'IS_SERIES', label: 'Is Series' },
                  { key: 'USE_NAME', label: 'Use Name' },
                  { key: 'GROUP_BY', label: 'Group By' },
                  { key: 'AUTONOMOUS', label: 'Autonomous' },
                  { key: 'IS_FINAL', label: 'Is Final' },
                ].map(({ key, label }) => (
                  <Grid item xs={6} sm={4} key={key}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={!!groupForm[key]}
                          onChange={(e) => setGroupForm((f) => ({ ...f, [key]: e.target.checked }))}
                        />
                      }
                      label={<Typography variant="body2">{label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGroupModalClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGroupModalSave}
            disabled={groupSaving || (groupModalMode === 'add' && !(newGroupName || '').trim() && !groupForm.NAME_ID)}
          >
            {groupSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={phaseModalOpen} onClose={handlePhaseModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>{phaseModalMode === 'add' ? 'Add Phase' : 'Edit Phase'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {phaseModalMode === 'add' ? (
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={phaseTermOptions}
                  getOptionLabel={(opt) => (opt?.values && opt.values.find(v => v.languageId === 1)?.value) || opt?.engValue || (opt?.id ? `Term ${opt.id}` : '')}
                  value={phaseForm.PHASE_NAME_ID ? (phaseTermOptions.find(t => t.id === (phaseForm.PHASE_NAME_ID?.id ?? phaseForm.PHASE_NAME_ID)) || null) : null}
                  inputValue={newPhaseName}
                  onInputChange={(_, v) => {
                    setNewPhaseName(v);
                    if (phaseForm.PHASE_NAME_ID) setPhaseForm((f) => ({ ...f, PHASE_NAME_ID: null }));
                  }}
                  onChange={(_, v) => {
                    if (v && typeof v === 'object' && v.id) {
                      setPhaseForm((f) => ({ ...f, PHASE_NAME_ID: v }));
                      setNewPhaseName((v.values && v.values.find(x => x.languageId === 1)?.value) || v.engValue || `Term ${v.id}`);
                    } else if (typeof v === 'string') {
                      setPhaseForm((f) => ({ ...f, PHASE_NAME_ID: null }));
                      setNewPhaseName(v);
                    }
                  }}
                  filterOptions={(options, { inputValue }) => {
                    const trim = (inputValue || '').trim();
                    if (trim.length < 3) return [];
                    const lower = trim.toLowerCase();
                    return options.filter((opt) => {
                      const label = (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || '';
                      return String(label).toLowerCase().includes(lower);
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Phase Name"
                      placeholder="Enter 3+ letters for suggestions"
                      required
                    />
                  )}
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Phase number"
                    value={phaseForm.PHASE_NUM}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    size="small"
                    options={phaseTermOptions}
                    getOptionLabel={(opt) => (opt.values && opt.values.find(v => v.languageId === 1)?.value) || opt.engValue || `Term ${opt.id}`}
                    value={phaseForm.PHASE_NAME_ID ? (phaseTermOptions.find(t => t.id === (phaseForm.PHASE_NAME_ID?.id ?? phaseForm.PHASE_NAME_ID)) || null) : null}
                    onChange={(_, v) => setPhaseForm((f) => ({ ...f, PHASE_NAME_ID: v }))}
                    renderInput={(params) => <TextField {...params} label="Phase Name (term)" />}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Phase</InputLabel>
                <Select
                  label="Parent Phase"
                  value={phaseForm.PARENT_PHASE_NUM != null && phaseForm.PARENT_PHASE_NUM !== '' ? Number(phaseForm.PARENT_PHASE_NUM) : ''}
                  onChange={(e) => setPhaseForm((f) => ({ ...f, PARENT_PHASE_NUM: e.target.value === '' ? '' : Number(e.target.value) }))}
                  renderValue={(v) => {
                    if (v === '' || v == null) return '—';
                    const list = phasesBySeason[phaseFormContext?.seasonNum] || [];
                    const p = list.find((ph) => Number(ph.PHASE_NUM) === Number(v));
                    return p ? (p.name || `Phase ${p.PHASE_NUM}`) : `Phase ${v}`;
                  }}
                >
                  <MenuItem value="">—</MenuItem>
                  {(phasesBySeason[phaseFormContext?.seasonNum] || [])
                    .filter((ph) => phaseModalMode !== 'edit' || Number(ph.PHASE_NUM) !== Number(phaseEditTarget?.PHASE_NUM))
                    .map((ph) => (
                      <MenuItem key={ph.PHASE_NUM} value={ph.PHASE_NUM}>
                        {ph.name || `Phase ${ph.PHASE_NUM}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={phaseForm.SHOW_STATS} onChange={(e) => setPhaseForm((f) => ({ ...f, SHOW_STATS: e.target.checked }))} />} label={<Typography variant="body2">Show Statistics</Typography>} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Checkbox size="small" checked={phaseForm.USE_NAME} onChange={(e) => setPhaseForm((f) => ({ ...f, USE_NAME: e.target.checked }))} />} label={<Typography variant="body2">Use Phase Name</Typography>} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePhaseModalClose}>Cancel</Button>
          <Button variant="contained" onClick={handlePhaseModalSave} disabled={phaseSaving || (phaseModalMode === 'add' && !(newPhaseName || '').trim() && !phaseForm.PHASE_NAME_ID)}>
            {phaseSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={seasonTableSettingsDialogOpen} onClose={handleCloseSeasonTableSettingsDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { minHeight: '75vh' } }}>
        <DialogTitle>
          Table Settings — Season {structureSeasons.find((s) => s.SEASON_NUM === selectedStructureSeasonNum)?.name || selectedStructureSeasonNum}
        </DialogTitle>
        <DialogContent sx={{ minHeight: '60vh' }}>
          {seasonTableSettingsForm && (
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                {Number(competition?.SPORT_TYPE_ID) === 2 && (
                  <Box sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                      <InputLabel>{FIELD_LABELS.STANDING_TYPE}</InputLabel>
                      <Select
                        value={seasonTableSettingsForm.STANDING_TYPE ?? ''}
                        label={FIELD_LABELS.STANDING_TYPE}
                        onChange={(e) => handleSeasonTableSettingsFormChange('STANDING_TYPE', e.target.value)}
                      >
                        <MenuItem value="">—</MenuItem>
                        {standingTypes.map((st) => (
                          <MenuItem key={st.STANDING_TYPE_ID} value={st.STANDING_TYPE}>{st.STANDING_TYPE}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Point configuration</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 2, rowGap: 2, mb: 2, maxWidth: 400 }}>
                  {TABLE_POINT_KEYS.map((key) => (
                    <TextField
                      key={key}
                      size="small"
                      label={formatTableSettingKeyAsLabel(key)}
                      type="number"
                      value={seasonTableSettingsForm[key] ?? ''}
                      onChange={(e) => handleSeasonTableSettingsFormChange(key, e.target.value === '' ? null : Number(e.target.value))}
                      fullWidth
                      sx={{
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
                          checked={!!seasonTableSettingsForm[key]}
                          onChange={(e) => handleSeasonTableSettingsFormChange(key, e.target.checked)}
                        />
                      }
                      label={<Typography variant="body2">{TABLE_SETTINGS_LABELS[key] ?? formatTableSettingKeyAsLabel(key)}</Typography>}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Table order parameters</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                  Current order (priority from top to bottom):
                </Typography>
                <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, bgcolor: '#fafafa' }}>
                  {seasonTableSettingsOrderByList.map((item, index) => (
                    <ListItem
                      key={`${item.field}-${index}`}
                      data-index={index}
                      onDragOver={(e) => handleSeasonTableSettingsOrderDragOver(e, index)}
                      onDragLeave={() => setSeasonTableSettingsDragOverOrderIndex(null)}
                      onDrop={(e) => handleSeasonTableSettingsOrderDrop(e, index)}
                      sx={{
                        py: 0.5,
                        cursor: seasonTableSettingsDragOrderIndex != null ? (seasonTableSettingsDragOrderIndex === index ? 'grabbing' : 'default') : 'default',
                        transition: 'all 0.2s ease',
                        ...(seasonTableSettingsDragOrderIndex === index && {
                          opacity: 0.9,
                          transform: 'scale(1.02)',
                          boxShadow: 2,
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                          zIndex: 1,
                        }),
                        ...(seasonTableSettingsDragOverOrderIndex === index && seasonTableSettingsDragOrderIndex !== index && {
                          borderTop: '2px solid',
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                          borderRadius: 0,
                        }),
                      }}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleSeasonTableSettingsRemoveOrderBy(index)} aria-label="Remove" sx={{ color: '#d32f2f' }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <Box
                        component="span"
                        draggable
                        onDragStart={(e) => handleSeasonTableSettingsOrderDragStart(e, index)}
                        onDragEnd={handleSeasonTableSettingsOrderDragEnd}
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
                  {seasonTableSettingsOrderByList.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No order parameters defined" primaryTypographyProps={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    </ListItem>
                  )}
                </List>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="season-table-order-field-label">Select field</InputLabel>
                    <Select
                      labelId="season-table-order-field-label"
                      label="Select field"
                      value={seasonTableSettingsOrderByNewField}
                      onChange={(e) => setSeasonTableSettingsOrderByNewField(e.target.value)}
                    >
                      <MenuItem value="">Select field</MenuItem>
                      {tableSettingsFieldOptions.filter((o) => !seasonTableSettingsOrderByList.some((item) => item.field === o.value)).map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="season-table-order-dir-label">Direction</InputLabel>
                    <Select
                      labelId="season-table-order-dir-label"
                      label="Direction"
                      value={seasonTableSettingsOrderByNewDirection}
                      onChange={(e) => setSeasonTableSettingsOrderByNewDirection(e.target.value)}
                    >
                      <MenuItem value="desc">Descending</MenuItem>
                      <MenuItem value="asc">Ascending</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSeasonTableSettingsAddOrderBy}
                    disabled={!seasonTableSettingsOrderByNewField || seasonTableSettingsOrderByList.some((item) => item.field === seasonTableSettingsOrderByNewField)}
                    sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}
                  >
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSeasonTableSettingsDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSeasonTableSettings}
            disabled={seasonTableSettingsSaving}
            sx={{
              textTransform: 'none',
              backgroundColor: '#15803d',
              color: 'white',
              px: 4,
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            {seasonTableSettingsSaving ? 'Saving…' : 'Save & Update In Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompetitionDetails;
