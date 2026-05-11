import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUrlFilters from '../hooks/useUrlFilters';
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
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
import { parseSettingsString } from '../components/TableSettingsEditor';
import CompetitionTableSettingsTab from '../features/competitions/details/CompetitionTableSettingsTab';
import CreateGenerateStagesDialog from '../features/competitions/details/CreateGenerateStagesDialog';
import CreateNameDialog from '../features/competitions/details/CreateNameDialog';
import ExtraToolsTab from '../features/competitions/details/ExtraToolsTab';
import GroupEditDialog from '../features/competitions/details/GroupEditDialog';
import GroupModalDialog from '../features/competitions/details/GroupModalDialog';
import GroupsSection from '../features/competitions/details/GroupsSection';
import ImageUrlDialog from '../features/competitions/details/ImageUrlDialog';
import ManageStandingsDialog from '../features/competitions/details/ManageStandingsDialog';
import ParticipantAddDialog from '../features/competitions/details/ParticipantAddDialog';
import PhaseModalDialog from '../features/competitions/details/PhaseModalDialog';
import PhasesSection from '../features/competitions/details/PhasesSection';
import RemoveFromAllSeasonsDialog from '../features/competitions/details/RemoveFromAllSeasonsDialog';
import StagesSection from '../features/competitions/details/StagesSection';
import SeasonDetailsForm from '../features/competitions/details/SeasonDetailsForm';
import SeasonCompetitorsSection from '../features/competitions/details/SeasonCompetitorsSection';
import SeasonToolbar from '../features/competitions/details/SeasonToolbar';
import SeasonModalDialog from '../features/competitions/details/SeasonModalDialog';
import SeasonTableSettingsDialog from '../features/competitions/details/SeasonTableSettingsDialog';
import StageDeleteConfirmDialog from '../features/competitions/details/StageDeleteConfirmDialog';
import StageModalDialog from '../features/competitions/details/StageModalDialog';
import WinnerDeleteConfirmDialog from '../features/competitions/details/WinnerDeleteConfirmDialog';
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
  'COMPETITION_IMAGE_URL', 'COMPETITION_DARK_IMAGE_URL', 'TROPHY_IMAGE_URL', 'HIDE_ON_SEARCH', 'HIDE_ON_CATALOG', 'ENABLE_DASHBOARD_BUZZ',
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
  const [tableTypes, setTableTypes] = useState([]);
  const [generalDetailsSeasons, setGeneralDetailsSeasons] = useState([]);
  const [generalDetailsStages, setGeneralDetailsStages] = useState([]);
  const [urlState, setUrlState] = useUrlFilters({
    tab: { type: 'number', default: 0 },
  });
  const activeTab = urlState.tab; // 0=Structure (default), 1=Configurations, 2=Winners, 3=Table Settings, 4=Extra Tools & Screens
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
  const [expandedStructureSection, setExpandedStructureSection] = useState(null); // 'seasons' | 'stages' | 'groups' | 'phases' | null
  // Structure tab: selected season (dropdown) and inline form for Season Details + Configuration
  const [selectedStructureSeasonNum, setSelectedStructureSeasonNum] = useState(null);
  const [structureSeasonForm, setStructureSeasonForm] = useState(null); // full season fields for editing; null when none selected
  const [structureSeasonSaving, setStructureSeasonSaving] = useState(false);
  // Stages section: selected stage and form for Stage Details + Configuration
  const [selectedStructureStageNum, setSelectedStructureStageNum] = useState(null);
  const [structureStageForm, setStructureStageForm] = useState(null); // full stage fields for editing; null when none selected
  const [structureStageSaving, setStructureStageSaving] = useState(false);
  const [createGenerateDialogOpen, setCreateGenerateDialogOpen] = useState(false);
  const [createGenerateDialogTab, setCreateGenerateDialogTab] = useState(0); // 0 = Generate Stages, 1 = Create Stage
  const [generateStagesImportSeasonNum, setGenerateStagesImportSeasonNum] = useState(null);
  const [generateStagesTypes, setGenerateStagesTypes] = useState({ leagueCycle: false, groupStage: false, bracketStage: false });
  const [newStageSetCurrent, setNewStageSetCurrent] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  // Stages table drag-and-drop visual state
  const [stagesDraggingStageNum, setStagesDraggingStageNum] = useState(null);
  const [stagesDropTargetIndex, setStagesDropTargetIndex] = useState(null);
  // Stages table inline edit mode
  const [isStageEditMode, setIsStageEditMode] = useState(false);
  const [pendingStageChanges, setPendingStageChanges] = useState({});
  const [pendingCurrentStage, setPendingCurrentStage] = useState(null);
  const [selectedStagesForDelete, setSelectedStagesForDelete] = useState([]);
  const [stageDeleteConfirmOpen, setStageDeleteConfirmOpen] = useState(false);
  const [stageEditsNeedServiceUpdate, setStageEditsNeedServiceUpdate] = useState(false);
  const [phaseEditsNeedServiceUpdate, setPhaseEditsNeedServiceUpdate] = useState(false);
  // Phases section (Structure tab): selected phase and form for Phase Details
  const [selectedStructurePhaseNum, setSelectedStructurePhaseNum] = useState(null);
  const [structurePhaseForm, setStructurePhaseForm] = useState(null);
  const [structurePhaseSaving, setStructurePhaseSaving] = useState(false);
  const [isPhaseEditMode, setIsPhaseEditMode] = useState(false);
  const [pendingPhaseChanges, setPendingPhaseChanges] = useState({});
  const [selectedPhaseRows, setSelectedPhaseRows] = useState([]);
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
  const [pointsDeductionReasonCreating, setPointsDeductionReasonCreating] = useState(null); // row idx when creating new reason term
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
  const [editingImageType, setEditingImageType] = useState('competition'); // 'competition' | 'dark' | 'trophy'
  const [imageUrlValue, setImageUrlValue] = useState('');
  const [competitionImageError, setCompetitionImageError] = useState(false);
  const [darkImageError, setDarkImageError] = useState(false);
  const [trophyImageError, setTrophyImageError] = useState(false);
  const [allCities, setAllCities] = useState([]);
  const [hostCityInputValue, setHostCityInputValue] = useState('');
  const [fatherCompetitionInputValue, setFatherCompetitionInputValue] = useState('');
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
    COMPETITION_DARK_IMAGE_URL: '',
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
    const loadTableTypes = async () => {
      try {
        const data = await api.getTableTypes();
        setTableTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to load table types:', err);
      }
    };
    loadTableTypes();
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
    if (activeTab === 2 && id) {
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
  const prevStructureSeasonNum = useRef(null);
  useEffect(() => {
    hasInitializedSeasonSelection.current = false;
    prevStructureSeasonNum.current = null;
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

  // When season truly changes (user picks a different one), clear selected stage, phase and group
  useEffect(() => {
    const prev = prevStructureSeasonNum.current;
    prevStructureSeasonNum.current = selectedStructureSeasonNum;
    if (prev == null || prev === selectedStructureSeasonNum) return;
    setSelectedStructureStageNum(null);
    setStructureStageForm(null);
    setSelectedStructurePhaseNum(null);
    setStructurePhaseForm(null);
    setSelectedStructureGroupNum(null);
    setStructureGroupForm(null);
    setGroupCompetitorCounts({});
    setGroupEditDialogOpen(false);
    setExpandedStructureSection(null);
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
    if (stage) {
      setStructureStageForm({
        ...stage,
        HAS_AGGREGATION_TABLE: !!stage.AGGREGATED_TABLE_SETTINGS,
        HAS_RELEGATION_TABLE: !!stage.RELEGATION_TABLE_SETTINGS,
      });
    } else {
      setStructureStageForm(null);
    }
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

    if (structureStageForm.HAS_AGGREGATION_TABLE && structureStageForm.AGGREGATED_TABLE_SETTINGS) {
      const rows = parseSettingsString(structureStageForm.AGGREGATED_TABLE_SETTINGS);
      const incomplete = rows.some((r) => !r.COMPETITION_ID || !r.SEASON_NUM || !r.STAGE_NUM || !r.TABLE_TYPE_ID);
      if (incomplete) {
        setSnackbar({ open: true, message: 'Aggregation Table Settings: All fields (Competition, Season, Stage, Table Type) are required for each row', severity: 'error' });
        return;
      }
    }
    if (structureStageForm.HAS_RELEGATION_TABLE && structureStageForm.RELEGATION_TABLE_SETTINGS) {
      const rows = parseSettingsString(structureStageForm.RELEGATION_TABLE_SETTINGS);
      const incomplete = rows.some((r) => !r.COMPETITION_ID || !r.SEASON_NUM || !r.STAGE_NUM || !r.TABLE_TYPE_ID);
      if (incomplete) {
        setSnackbar({ open: true, message: 'Relegation Table Settings: All fields (Competition, Season, Stage, Table Type) are required for each row', severity: 'error' });
        return;
      }
    }

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
        POSITION_PARAMETER: structureStageForm.HAS_POSITION_TABLE
          ? ((structureStageForm.POSITION_PARAMETER != null && String(structureStageForm.POSITION_PARAMETER).trim() !== '') ? Number(structureStageForm.POSITION_PARAMETER) : null)
          : null,
        POSITION_TABLE_NAME: structureStageForm.HAS_POSITION_TABLE
          ? (structureStageForm.POSITION_TABLE_NAME_ID ?? structureStageForm.POSITION_TABLE_NAME ?? null)
          : null,
        AGGREGATED_TABLE_SETTINGS: structureStageForm.HAS_AGGREGATION_TABLE
          ? ((structureStageForm.AGGREGATED_TABLE_SETTINGS || '').trim() || null)
          : null,
        RELEGATION_TABLE_SETTINGS: structureStageForm.HAS_RELEGATION_TABLE
          ? ((structureStageForm.RELEGATION_TABLE_SETTINGS || '').trim() || null)
          : null,
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

  const handleToggleStageEditMode = () => {
    const hasPending = Object.keys(pendingStageChanges).length > 0 || pendingCurrentStage != null;
    if (isStageEditMode && hasPending && !window.confirm('Discard unsaved stage changes?')) return;
    if (isStageEditMode) {
      setPendingStageChanges({});
      setPendingCurrentStage(null);
      setSelectedStagesForDelete([]);
    }
    setIsStageEditMode(!isStageEditMode);
  };

  const handleStageFieldChange = (stageNum, field, value) => {
    setPendingStageChanges((prev) => ({
      ...prev,
      [stageNum]: { ...(prev[stageNum] || {}), [field]: value },
    }));
  };

  const handleSaveStageEdits = async () => {
    if (!id || selectedStructureSeasonNum == null) return;
    const changedStageNums = Object.keys(pendingStageChanges).filter((k) => Object.keys(pendingStageChanges[k]).length > 0);
    const hasCurrentChange = pendingCurrentStage != null;
    if (changedStageNums.length === 0 && !hasCurrentChange) {
      setIsStageEditMode(false);
      return;
    }
    try {
      for (const stageNum of changedStageNums) {
        const changes = pendingStageChanges[stageNum];
        await api.updateStage(id, selectedStructureSeasonNum, Number(stageNum), changes);
      }
      if (hasCurrentChange) {
        await handleSetCurrentStage(selectedStructureSeasonNum, pendingCurrentStage);
      }
      setSnackbar({ open: true, message: 'Stages updated', severity: 'success' });
      setPendingStageChanges({});
      setPendingCurrentStage(null);
      setSelectedStagesForDelete([]);
      setIsStageEditMode(false);
      setStageEditsNeedServiceUpdate(true);
      loadStagesAndPhases(selectedStructureSeasonNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save stages', severity: 'error' });
    }
  };

  const handleDeleteSelectedStages = () => {
    if (!id || selectedStructureSeasonNum == null || selectedStagesForDelete.length === 0) return;
    const dbCurrentStage = competition?.CURRENT_STAGE;
    const dbCurrentSeason = competition?.CURRENT_SEASON;
    const isCurrentSeason = dbCurrentSeason === selectedStructureSeasonNum;
    const blockList = selectedStagesForDelete.filter((sn) => isCurrentSeason && Number(sn) === Number(dbCurrentStage));
    if (blockList.length > 0) {
      setSnackbar({ open: true, message: 'Cannot delete the current stage', severity: 'error' });
      return;
    }
    setStageDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteStages = async () => {
    setStageDeleteConfirmOpen(false);
    try {
      for (const sn of selectedStagesForDelete) {
        await api.deleteStage(id, selectedStructureSeasonNum, sn);
      }
      const count = selectedStagesForDelete.length;
      setSnackbar({ open: true, message: `${count} stage(s) deleted`, severity: 'success' });
      setGroupsByStage((prev) => {
        const out = { ...prev };
        for (const sn of selectedStagesForDelete) {
          delete out[`${selectedStructureSeasonNum}-${sn}`];
        }
        return out;
      });
      setSelectedStagesForDelete([]);
      loadStagesAndPhases(selectedStructureSeasonNum);
      loadCompetition();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete stages', severity: 'error' });
    }
  };

  const handleSaveStructurePhase = async () => {
    if (!id || selectedStructureSeasonNum == null) return;
    const phases = phasesBySeason[selectedStructureSeasonNum] || [];
    const changedPhaseNums = Object.keys(pendingPhaseChanges).filter((k) => Object.keys(pendingPhaseChanges[k]).length > 0);
    if (changedPhaseNums.length === 0) return;
    setStructurePhaseSaving(true);
    try {
      for (const phaseNum of changedPhaseNums) {
        const orig = phases.find((p) => Number(p.PHASE_NUM) === Number(phaseNum));
        if (!orig) continue;
        const merged = { ...orig, ...pendingPhaseChanges[phaseNum] };
        const payload = {
          PHASE_NAME_ID: merged.PHASE_NAME_ID ?? null,
          PARENT_PHASE_NUM: merged.PARENT_PHASE_NUM != null && merged.PARENT_PHASE_NUM !== '' ? Number(merged.PARENT_PHASE_NUM) : null,
          SHOW_STATS: !!merged.SHOW_STATS,
          USE_NAME: !!merged.USE_NAME,
          OVERTIME_LENGTH: merged.OVERTIME_LENGTH != null && merged.OVERTIME_LENGTH !== '' ? Number(merged.OVERTIME_LENGTH) : null,
          TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: merged.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE != null && merged.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE !== '' ? Number(merged.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE) : null,
        };
        await api.updatePhase(id, selectedStructureSeasonNum, phaseNum, payload);
      }
      setSnackbar({ open: true, message: `Updated ${changedPhaseNums.length} phase(s)`, severity: 'success' });
      setPendingPhaseChanges({});
      setIsPhaseEditMode(false);
      setSelectedPhaseRows([]);
      setPhaseEditsNeedServiceUpdate(true);
      loadStagesAndPhases(selectedStructureSeasonNum);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save phase', severity: 'error' });
    } finally {
      setStructurePhaseSaving(false);
    }
  };

  const handlePhaseFieldChange = (phaseNum, field, value) => {
    setPendingPhaseChanges((prev) => {
      const next = { ...prev };
      if (!next[phaseNum]) next[phaseNum] = {};
      next[phaseNum][field] = value;
      return next;
    });
  };

  const handleTogglePhaseEditMode = () => {
    if (isPhaseEditMode && Object.keys(pendingPhaseChanges).length > 0 && !window.confirm('Discard unsaved phase changes?')) return;
    if (isPhaseEditMode) {
      setPendingPhaseChanges({});
      setSelectedPhaseRows([]);
    }
    setIsPhaseEditMode(!isPhaseEditMode);
  };

  const handleDeleteSelectedPhases = async () => {
    if (!id || selectedStructureSeasonNum == null || selectedPhaseRows.length === 0) return;
    if (!window.confirm(`Delete ${selectedPhaseRows.length} phase(s)?`)) return;
    try {
      for (const phaseNum of selectedPhaseRows) {
        await api.deletePhase(id, selectedStructureSeasonNum, phaseNum);
      }
      setSnackbar({ open: true, message: `Deleted ${selectedPhaseRows.length} phase(s)`, severity: 'success' });
      setSelectedPhaseRows([]);
      loadStagesAndPhases(selectedStructureSeasonNum);
      if (selectedPhaseRows.includes(Number(selectedStructurePhaseNum))) {
        setSelectedStructurePhaseNum(null);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete phases', severity: 'error' });
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

  const handleOpenCreateGenerateDialog = (tab = 0) => {
    setCreateGenerateDialogTab(tab);
    setGenerateStagesImportSeasonNum(null);
    setGenerateStagesTypes({ leagueCycle: false, groupStage: false, bracketStage: false });
    if (tab === 1) {
      setStageModalMode('add');
      setStageFormContext({ seasonNum: selectedStructureSeasonNum });
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
    }
    setCreateGenerateDialogOpen(true);
  };

  const handleCloseCreateGenerateDialog = () => {
    setCreateGenerateDialogOpen(false);
    setGenerateStagesImportSeasonNum(null);
    setGenerateStagesTypes({ leagueCycle: false, groupStage: false, bracketStage: false });
  };

  const handleCreateGenerateDialogTabChange = (newTab) => {
    setCreateGenerateDialogTab(newTab);
    if (newTab === 1 && !stageFormContext) {
      setStageModalMode('add');
      setStageFormContext({ seasonNum: selectedStructureSeasonNum });
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
    }
  };

  const handleImportStagesFromSeason = async () => {
    if (!id || !generateStagesImportSeasonNum || selectedStructureSeasonNum == null) return;
    try {
      const sourceStages = await api.getStages(id, generateStagesImportSeasonNum);
      const currentStages = stagesBySeason[selectedStructureSeasonNum] || [];
      const maxNum = currentStages.length ? Math.max(...currentStages.map((s) => Number(s.STAGE_NUM))) : 0;
      let nextNum = maxNum + 1;
      for (const sourceStage of sourceStages) {
        const payload = {
          STAGE_NUM: nextNum,
          NAME_ID: sourceStage.NAME_ID,
          STAGE_TYPE: sourceStage.STAGE_TYPE ?? 1,
          NUM_OF_GAMES: sourceStage.NUM_OF_GAMES ?? -1,
          START_DATE: sourceStage.START_DATE,
          END_DATE: sourceStage.END_DATE,
          HAS_TABLE: !!sourceStage.HAS_TABLE,
          INCLUDE_IN_BRACKET: !!sourceStage.INCLUDE_IN_BRACKET,
          FILTER_DIVISION: !!sourceStage.FILTER_DIVISION,
          CONNECTED_IN_BRACKETS: !!sourceStage.CONNECTED_IN_BRACKETS,
          PRE_VISUAL_BRACKETS: !!sourceStage.PRE_VISUAL_BRACKETS,
          IS_SERIES: !!sourceStage.IS_SERIES,
          CONNECTED_TO_PREVIOUS_STAGE: !!sourceStage.CONNECTED_TO_PREVIOUS_STAGE,
          PHASE: sourceStage.PHASE ?? '',
        };
        await api.createStage(id, selectedStructureSeasonNum, payload);
        nextNum += 1;
      }
      setSnackbar({ open: true, message: `Imported ${sourceStages.length} stage(s)`, severity: 'success' });
      loadStagesAndPhases(selectedStructureSeasonNum);
      handleCloseCreateGenerateDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Import failed', severity: 'error' });
    }
  };

  const handleCreateGeneratedStages = async () => {
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
      handleCloseCreateGenerateDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Create failed', severity: 'error' });
    }
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
    setCreateGenerateDialogOpen(false);
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

  const handleDeleteStage = (seasonNum, stage) => {
    if (!id) return;
    const isCurrent = competition?.CURRENT_SEASON === seasonNum && competition?.CURRENT_STAGE === stage.STAGE_NUM;
    if (isCurrent) {
      setSnackbar({ open: true, message: 'Cannot delete the current stage', severity: 'error' });
      return;
    }
    setSelectedStagesForDelete([stage.STAGE_NUM]);
    setStageDeleteConfirmOpen(true);
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
      const [c, s, g, ct, st, sst, compt, pl, stgTypes, cities] = await Promise.all([
        api.getCountries(),
        api.getSports(),
        api.getGenders(),
        api.getCompetitionTypes(),
        api.getStandingTypes(),
        api.getSubSportTypes(),
        api.getCompetitorTypes(),
        api.getPriorityLevels(),
        api.getStagesTypes(),
        api.getCities(),
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
      setAllCities(cities || []);
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
  const fatherCompetitionObj = fatherCompetitionId != null ? allCompetitions.find((c) => Number(c.COMPETITION_ID) === Number(fatherCompetitionId)) : null;
  const fatherCompetitionName = fatherCompetitionObj?.name ?? null;
  const fatherCompetitionDisplayName = fatherCompetitionId != null
    ? (fatherCompetitionName ? `${fatherCompetitionName} (${fatherCompetitionId})` : `${fatherCompetitionId}`)
    : '';

  const resolveTermDisplayValue = (t) => (t?.engValue || (t?.values && t.values[0] && t.values[0].value) || (t?.id != null ? `Term ${t.id}` : ''));

  const competitionCountryId = formData.COUNTRY_ID != null && formData.COUNTRY_ID !== '' ? Number(formData.COUNTRY_ID) : null;
  const competitionSportTypeId = formData.SPORT_TYPE_ID != null && formData.SPORT_TYPE_ID !== '' ? Number(formData.SPORT_TYPE_ID) : null;
  const competitionsForFatherAutocomplete = allCompetitions.filter((c) =>
    competitionCountryId != null && Number(c.COUNTRY_ID) === competitionCountryId &&
    competitionSportTypeId != null && Number(c.SPORT_TYPE_ID) === competitionSportTypeId &&
    Number(c.COMPETITION_ID) !== Number(id)
  );
  const citiesForCountry = allCities.filter((c) => competitionCountryId != null && Number(c.COUNTRY_ID) === competitionCountryId);

  const hostCityId = formData.HOST_CITY != null && String(formData.HOST_CITY).trim() !== '' ? Number(formData.HOST_CITY) : null;
  const hostCityObj = hostCityId != null ? allCities.find((c) => Number(c.CITY_ID) === hostCityId) : null;
  const hostCityDisplayName = (() => {
    if (!hostCityObj) return hostCityId != null ? `(${hostCityId})` : '';
    const nameId = hostCityObj.NAME_ID;
    let cityName = hostCityObj.CITY_NAME || '';
    if (nameId != null) {
      const term = (allTerms || []).find((t) => t.id === nameId);
      if (term) {
        const engVal = term.values?.find((v) => v.languageId === 1);
        if (engVal?.value) cityName = engVal.value;
      }
    }
    return cityName ? `${cityName} (${hostCityId})` : `(${hostCityId})`;
  })();

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
      payload.HOST_CITY = formData.HOST_CITY != null && String(formData.HOST_CITY).trim() !== '' ? Number(formData.HOST_CITY) : (competition.HOST_CITY ?? '');
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
    if (Object.keys(pendingStageChanges).some((k) => Object.keys(pendingStageChanges[k]).length > 0) || pendingCurrentStage != null) return true;
    if (Object.keys(pendingPhaseChanges).some((k) => Object.keys(pendingPhaseChanges[k]).length > 0)) return true;
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
    if (stageEditsNeedServiceUpdate) return true;
    if (phaseEditsNeedServiceUpdate) return true;
    return false;
  }, [formData, competition, structureSeasonForm, structureStageForm, pendingPhaseChanges, structureGroupForm, structureSeasons, stagesBySeason, phasesBySeason, groupsByStage, selectedStructureSeasonNum, selectedStructureStageNum, selectedStructureGroupNum, winnersData, winnersOriginalData, stageEditsNeedServiceUpdate, phaseEditsNeedServiceUpdate]);

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
    if (Object.keys(pendingStageChanges).length > 0) await handleSaveStageEdits();
    if (structureStageForm) await handleSaveStructureStage();
    if (Object.keys(pendingPhaseChanges).length > 0) await handleSaveStructurePhase();
    if (structureGroupForm) await handleSaveStructureGroup();
    if (hasWinnersChanges) await handleSaveWinners();
    setStageEditsNeedServiceUpdate(false);
    setPhaseEditsNeedServiceUpdate(false);
    // TODO: call UPDATE IN SERVICES endpoint here when ready
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
    } else if (initialType === 'dark') {
      setImageUrlValue(formData.COMPETITION_DARK_IMAGE_URL || competition?.COMPETITION_DARK_IMAGE_URL || '');
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

  const handleImageDialogTypeChange = (newType) => {
    setEditingImageType(newType);
    if (newType === 'competition') {
      setImageUrlValue(formData.COMPETITION_IMAGE_URL || competition?.COMPETITION_IMAGE_URL || '');
    } else if (newType === 'dark') {
      setImageUrlValue(formData.COMPETITION_DARK_IMAGE_URL || competition?.COMPETITION_DARK_IMAGE_URL || '');
    } else {
      setImageUrlValue(formData.TROPHY_IMAGE_URL || competition?.TROPHY_IMAGE_URL || '');
    }
  };

  const handleSaveImageUrl = async () => {
    if (!id) return;
    try {
      if (editingImageType === 'competition') {
        await api.updateCompetition(id, { COMPETITION_IMAGE_URL: imageUrlValue.trim() || null });
        setFormData((prev) => ({ ...prev, COMPETITION_IMAGE_URL: imageUrlValue.trim() || '' }));
        setCompetitionImageError(false);
      } else if (editingImageType === 'dark') {
        await api.updateCompetition(id, { COMPETITION_DARK_IMAGE_URL: imageUrlValue.trim() || null });
        setFormData((prev) => ({ ...prev, COMPETITION_DARK_IMAGE_URL: imageUrlValue.trim() || '' }));
        setDarkImageError(false);
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

  const handleCloseCreateBracketFinalDialog = () => {
    setCreateBracketFinalDialogOpen(false);
    setCreateBracketFinalName('');
    setBracketFinalInputValue('');
  };

  const handleCloseCreateRoundNameDialog = () => {
    setCreateRoundNameDialogOpen(false);
    setCreateRoundNameName('');
    setRoundNameInputValue('');
  };

  const handleCloseParticipantAddDialog = () => {
    if (participantAddSaving) return;
    setParticipantAddDialogOpen(false);
    setParticipantAddContext(null);
    setNewParticipantName('');
    setParticipantSelectedTermId(null);
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
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 270px' }, minWidth: 0 }}>
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
                    Light Image
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    src={formData.COMPETITION_DARK_IMAGE_URL || competition?.COMPETITION_DARK_IMAGE_URL || null}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: ((formData.COMPETITION_DARK_IMAGE_URL || competition?.COMPETITION_DARK_IMAGE_URL) && !darkImageError) ? 'transparent' : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                    }}
                    onError={() => setDarkImageError(true)}
                  >
                    {(!(formData.COMPETITION_DARK_IMAGE_URL || competition?.COMPETITION_DARK_IMAGE_URL) || darkImageError) && (
                      <EmojiEventsIcon sx={{ fontSize: 36, color: '#999999' }} />
                    )}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                    Dark Image
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
                {fatherCompetitionId != null ? (
                  <TextField
                    fullWidth
                    size="small"
                    label={FIELD_LABELS.FATHER_COMPETITION}
                    value={fatherCompetitionDisplayName}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFormChange('FATHER_COMPETITION', ''); }} title="Remove father competition" sx={{ p: 0.5 }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                ) : (
                  <Autocomplete
                    fullWidth
                    size="small"
                    freeSolo
                    clearOnBlur={false}
                    options={competitionsForFatherAutocomplete}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return `${option.name || ''} (${option.COMPETITION_ID})`;
                    }}
                    value={null}
                    inputValue={fatherCompetitionInputValue}
                    onInputChange={(_, v, reason) => { if (reason !== 'reset') setFatherCompetitionInputValue(v); }}
                    onChange={(_, v) => {
                      if (v == null) return;
                      if (typeof v === 'string') {
                        const trimmed = v.trim();
                        if (trimmed !== '' && !isNaN(Number(trimmed))) {
                          handleFormChange('FATHER_COMPETITION', trimmed);
                        }
                      } else {
                        handleFormChange('FATHER_COMPETITION', String(v.COMPETITION_ID));
                      }
                      setFatherCompetitionInputValue('');
                    }}
                    filterOptions={(options, state) => {
                      const input = (state.inputValue || '').trim();
                      if (!input) return options;
                      const lower = input.toLowerCase();
                      return options.filter((o) =>
                        (o.name || '').toLowerCase().includes(lower) ||
                        String(o.COMPETITION_ID).includes(input)
                      );
                    }}
                    ListboxProps={{ style: { maxHeight: 240 } }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.COMPETITION_ID}>
                        {option.name || 'Unknown'} <span style={{ color: '#999', marginLeft: 8, fontSize: '0.85em' }}>({option.COMPETITION_ID})</span>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={FIELD_LABELS.FATHER_COMPETITION}
                        placeholder="Search competition or enter ID"
                        sx={fieldSx}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target.value || '').trim();
                            if (val !== '' && !isNaN(Number(val))) {
                              handleFormChange('FATHER_COMPETITION', val);
                              setFatherCompetitionInputValue('');
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = (e.target.value || '').trim();
                          if (val !== '' && !isNaN(Number(val))) {
                            handleFormChange('FATHER_COMPETITION', val);
                            setFatherCompetitionInputValue('');
                          }
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
                  label={FIELD_LABELS.CURRENT_ROUND}
                  value={formData.CURRENT_ROUND ?? ''}
                  onChange={(e) => handleFormChange('CURRENT_ROUND', e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ minWidth: 0, display: 'flex', gap: 1 }}>
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
                {hostCityId != null ? (
                  <TextField
                    fullWidth
                    size="small"
                    label={FIELD_LABELS.HOST_CITY}
                    value={hostCityDisplayName}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFormChange('HOST_CITY', ''); }} title="Remove city" sx={{ p: 0.5 }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                ) : (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    clearOnBlur={false}
                    options={citiesForCountry}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return option.CITY_NAME ? `${option.CITY_NAME} (${option.CITY_ID})` : `(${option.CITY_ID})`;
                    }}
                    value={null}
                    inputValue={hostCityInputValue}
                    onInputChange={(_, v, reason) => { if (reason !== 'reset') setHostCityInputValue(v); }}
                    onChange={(_, v) => {
                      if (v == null) return;
                      if (typeof v === 'string') {
                        const trimmed = v.trim();
                        if (trimmed !== '' && !isNaN(Number(trimmed))) {
                          handleFormChange('HOST_CITY', Number(trimmed));
                        }
                      } else {
                        handleFormChange('HOST_CITY', v.CITY_ID);
                      }
                      setHostCityInputValue('');
                    }}
                    filterOptions={(options, state) => {
                      const input = (state.inputValue || '').trim();
                      if (!input) return options;
                      const lower = input.toLowerCase();
                      return options.filter((o) =>
                        (o.CITY_NAME || '').toLowerCase().includes(lower) ||
                        String(o.CITY_ID).includes(input)
                      );
                    }}
                    ListboxProps={{ style: { maxHeight: 240 } }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.CITY_ID}>
                        {option.CITY_NAME} <span style={{ color: '#999', marginLeft: 8, fontSize: '0.85em' }}>({option.CITY_ID})</span>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={FIELD_LABELS.HOST_CITY}
                        placeholder="Search city or enter City ID"
                        sx={fieldSx}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target.value || '').trim();
                            if (val !== '' && !isNaN(Number(val))) {
                              handleFormChange('HOST_CITY', Number(val));
                              setHostCityInputValue('');
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = (e.target.value || '').trim();
                          if (val !== '' && !isNaN(Number(val))) {
                            handleFormChange('HOST_CITY', Number(val));
                            setHostCityInputValue('');
                          }
                        }}
                      />
                    )}
                  />
                )}
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
          onChange={(e, v) => setUrlState({ tab: v })}
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
          <Tab label="Winners" />
          <Tab label="Table Settings" />
          <Tab label="Extra Tools & Screens" />
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

      {activeTab === 2 && (
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

          <WinnerDeleteConfirmDialog
            open={winnersDeleteConfirm != null}
            onClose={() => setWinnersDeleteConfirm(null)}
            onConfirm={handleWinnersDeleteConfirm}
          />
        </Box>
      )}

      {activeTab === 3 && (
        <CompetitionTableSettingsTab
          formData={formData}
          competition={competition}
          standingTypes={standingTypes}
          tablePointKeys={TABLE_POINT_KEYS}
          tableCheckboxKeys={TABLE_CHECKBOX_KEYS}
          tableSettingsLabels={TABLE_SETTINGS_LABELS}
          orderByList={orderByList}
          tableSettingsFieldOptions={tableSettingsFieldOptions}
          tableOrderByNewField={tableOrderByNewField}
          tableOrderByNewDirection={tableOrderByNewDirection}
          dragOrderIndex={dragOrderIndex}
          dragOverOrderIndex={dragOverOrderIndex}
          standingTypeLabel={FIELD_LABELS.STANDING_TYPE}
          onFormChange={handleFormChange}
          onTableOrderByNewFieldChange={setTableOrderByNewField}
          onTableOrderByNewDirectionChange={setTableOrderByNewDirection}
          onAddOrderByItem={handleAddOrderByItem}
          onRemoveOrderByItem={handleRemoveOrderByItem}
          onOrderDragStart={handleOrderDragStart}
          onOrderDragEnd={handleOrderDragEnd}
          onOrderDragOver={handleOrderDragOver}
          onOrderDragLeave={handleOrderDragLeave}
          onOrderDrop={handleOrderDrop}
          formatTableSettingKeyAsLabel={formatTableSettingKeyAsLabel}
        />
      )}

      {activeTab === 4 && <ExtraToolsTab />}

      {activeTab === 0 && (
        <Box>
          {/* Seasons section: dropdown + actions + details + config */}
          <Accordion
            expanded={expandedStructureSection === 'seasons'}
            onChange={() => setExpandedStructureSection((prev) => prev === 'seasons' ? null : 'seasons')}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Seasons
                {(() => {
                  if (selectedStructureSeasonNum != null) {
                    const s = structureSeasons.find((se) => se.SEASON_NUM === selectedStructureSeasonNum);
                    if (s) return <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>— Selected Season: {s.name || `Season ${s.SEASON_NUM}`} ({s.SEASON_NUM})</Typography>;
                  }
                  if (competition?.CURRENT_SEASON != null) {
                    const s = structureSeasons.find((se) => se.SEASON_NUM === competition.CURRENT_SEASON);
                    if (s) return <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>— Current Season: {s.name || `Season ${s.SEASON_NUM}`} ({s.SEASON_NUM})</Typography>;
                  }
                  return null;
                })()}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
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
                <SeasonToolbar
                  seasons={structureSeasons}
                  competition={competition}
                  selectedSeasonNum={selectedStructureSeasonNum}
                  onSelectedSeasonNumChange={setSelectedStructureSeasonNum}
                  onEditSeasonName={(season) => handleSeasonNameClick(null, season)}
                  onSetCurrentSeason={handleSetCurrentSeason}
                  onAddSeason={handleAddSeason}
                  onDeleteSeason={handleDeleteSeason}
                />

                {structureSeasonForm && (
                  <>
                    <SeasonDetailsForm
                      seasonForm={structureSeasonForm}
                      onSeasonFormChange={setStructureSeasonForm}
                    />

                    <SeasonCompetitorsSection
                      competitionId={id}
                      competition={competition}
                      seasonForm={structureSeasonForm}
                      competitorsLoading={competitorsLoading}
                      competitorsInSeason={competitorsInSeason}
                      competitorsNotInSeason={competitorsNotInSeason}
                      selectedInSeason={selectedInSeason}
                      selectedNotInSeason={selectedNotInSeason}
                      rowsPerPageInSeason={rowsPerPageInSeason}
                      pageInSeason={pageInSeason}
                      rowsPerPageNotInSeason={rowsPerPageNotInSeason}
                      pageNotInSeason={pageNotInSeason}
                      competitorsNotInSeasonFilters={competitorsNotInSeasonFilters}
                      countries={countries}
                      allCompetitions={allCompetitions}
                      onSelectedInSeasonChange={setSelectedInSeason}
                      onSelectedNotInSeasonChange={setSelectedNotInSeason}
                      onCompetitorsInSeasonChange={setCompetitorsInSeason}
                      onPageInSeasonChange={setPageInSeason}
                      onRowsPerPageInSeasonChange={setRowsPerPageInSeason}
                      onPageNotInSeasonChange={setPageNotInSeason}
                      onRowsPerPageNotInSeasonChange={setRowsPerPageNotInSeason}
                      onCompetitorsNotInSeasonFiltersChange={setCompetitorsNotInSeasonFilters}
                      onSeasonCompetitorStatusChange={handleSeasonCompetitorStatusChange}
                      onSeasonCompetitorStatusSeedBlur={handleSeasonCompetitorStatusSeedBlur}
                      onSeasonCompetitorNotInSeasonChange={handleSeasonCompetitorNotInSeasonChange}
                      onAddToSeason={handleAddToSeason}
                      onRemoveSelectedFromSeason={handleRemoveSelectedFromSeason}
                      onRemoveFromAllSeasonsClick={handleRemoveFromAllSeasonsClick}
                      onLoadCompetitors={loadCompetitorsTab}
                    />

                  </>
                )}
              </>
            )}
            </AccordionDetails>
          </Accordion>

          <PhasesSection
            structureSeasons={structureSeasons}
            selectedSeasonNum={selectedStructureSeasonNum}
            expandedStructureSection={expandedStructureSection}
            phasesBySeason={phasesBySeason}
            isPhaseEditMode={isPhaseEditMode}
            pendingPhaseChanges={pendingPhaseChanges}
            selectedPhaseRows={selectedPhaseRows}
            onExpandedStructureSectionChange={setExpandedStructureSection}
            onAddPhase={handleAddPhase}
            onTogglePhaseEditMode={handleTogglePhaseEditMode}
            onSaveStructurePhase={handleSaveStructurePhase}
            onDeleteSelectedPhases={handleDeleteSelectedPhases}
            onSelectedPhaseRowsChange={setSelectedPhaseRows}
            onPhaseNameClick={handlePhaseNameClick}
            onPhaseFieldChange={handlePhaseFieldChange}
          />

          <StagesSection
            structureSeasons={structureSeasons}
            selectedSeasonNum={selectedStructureSeasonNum}
            expandedStructureSection={expandedStructureSection}
            stagesBySeason={stagesBySeason}
            phasesBySeason={phasesBySeason}
            stagesTypes={stagesTypes}
            competition={competition}
            selectedStageNum={selectedStructureStageNum}
            isStageEditMode={isStageEditMode}
            pendingStageChanges={pendingStageChanges}
            pendingCurrentStage={pendingCurrentStage}
            selectedStagesForDelete={selectedStagesForDelete}
            stagesDraggingStageNum={stagesDraggingStageNum}
            stagesDropTargetIndex={stagesDropTargetIndex}
            structureStageForm={structureStageForm}
            allTerms={allTerms}
            positionTableNamesTermOptions={positionTableNamesTermOptions}
            allCompetitions={allCompetitions}
            tableTypes={tableTypes}
            onExpandedStructureSectionChange={setExpandedStructureSection}
            onOpenCreateGenerate={() => handleOpenCreateGenerateDialog(0)}
            onDeleteSelectedStages={handleDeleteSelectedStages}
            onToggleStageEditMode={handleToggleStageEditMode}
            onSaveStageEdits={handleSaveStageEdits}
            onSelectedStageNumChange={setSelectedStructureStageNum}
            onSelectedStagesForDeleteChange={setSelectedStagesForDelete}
            onStagesDraggingStageNumChange={setStagesDraggingStageNum}
            onStagesDropTargetIndexChange={setStagesDropTargetIndex}
            onStagesReorderDrop={handleStagesReorderDrop}
            onStageNameClick={handleStageNameClick}
            onStageFieldChange={handleStageFieldChange}
            onPendingCurrentStageChange={setPendingCurrentStage}
            onStageFormChange={setStructureStageForm}
            onOpenManageStandingsDialog={handleOpenManageStandingsDialog}
          />

          <GroupsSection
            structureSeasons={structureSeasons}
            selectedSeasonNum={selectedStructureSeasonNum}
            selectedStageNum={selectedStructureStageNum}
            expandedStructureSection={expandedStructureSection}
            groupsByStage={groupsByStage}
            selectedGroupNum={selectedStructureGroupNum}
            groupCompetitorCounts={groupCompetitorCounts}
            groupCompetitorsInGroup={groupCompetitorsInGroup}
            groupCompetitorsNotInGroups={groupCompetitorsNotInGroups}
            groupGames={groupGames}
            groupParticipants={groupParticipants}
            selectedInGroup={selectedInGroup}
            selectedNotInGroups={selectedNotInGroups}
            loadingGroupCompetitors={loadingGroupCompetitors}
            loadingGroupGames={loadingGroupGames}
            loadingGroupParticipants={loadingGroupParticipants}
            editingGroupGameIndex={editingGroupGameIndex}
            editingGroupGameOriginalNum={editingGroupGameOriginalNum}
            editingGroupParticipantIndex={editingGroupParticipantIndex}
            onExpandedStructureSectionChange={setExpandedStructureSection}
            onSelectedGroupNumChange={setSelectedStructureGroupNum}
            onSelectedInGroupChange={setSelectedInGroup}
            onSelectedNotInGroupsChange={setSelectedNotInGroups}
            onGroupCompetitorsInGroupChange={setGroupCompetitorsInGroup}
            onGroupGamesChange={setGroupGames}
            onGroupParticipantsChange={setGroupParticipants}
            onEditingGroupGameIndexChange={setEditingGroupGameIndex}
            onEditingGroupGameOriginalNumChange={setEditingGroupGameOriginalNum}
            onEditingGroupParticipantIndexChange={setEditingGroupParticipantIndex}
            onAddGroup={handleAddGroup}
            onGroupNameClick={handleGroupNameClick}
            onOpenGroupEditDialog={handleOpenGroupEditDialog}
            onDeleteGroup={handleDeleteGroup}
            onParticipantNumChange={handleParticipantNumChange}
            onAddGroupGame={handleAddGroupGame}
            onDeleteGroupGame={handleDeleteGroupGame}
            onSaveGroupGame={handleSaveGroupGame}
            onAddGroupParticipant={handleAddGroupParticipant}
            onDeleteGroupParticipant={handleDeleteGroupParticipant}
            onSaveGroupParticipant={handleSaveGroupParticipant}
            onParticipantNameClick={handleParticipantNameClick}
            onAddToGroup={handleAddToGroup}
            onRemoveFromGroup={handleRemoveSelectedFromGroup}
          />

          <GroupEditDialog
            open={groupEditDialogOpen}
            form={groupEditDialogForm}
            context={groupEditDialogContext}
            groupsByStage={groupsByStage}
            saving={structureGroupSaving}
            onClose={handleCloseGroupEditDialog}
            onSave={handleSaveGroupEditDialog}
            onFormChange={setGroupEditDialogForm}
          />

          <ManageStandingsDialog
            open={manageStandingsDialogOpen}
            stageName={structureStageForm?.name}
            selectedStageNum={selectedStructureStageNum}
            selectedSeasonNum={selectedStructureSeasonNum}
            groupsByStage={groupsByStage}
            stagesBySeason={stagesBySeason}
            structureSeasons={structureSeasons}
            manageStandingsData={manageStandingsData}
            manageStandingsOriginal={manageStandingsOriginal}
            manageStandingsLoading={manageStandingsLoading}
            manageStandingsSaving={manageStandingsSaving}
            manageStandingsGroupFilter={manageStandingsGroupFilter}
            manageStandingsEditMode={manageStandingsEditMode}
            manageStandingsRecalculateLive={manageStandingsRecalculateLive}
            manageStandingsMultiStageEnabled={manageStandingsMultiStageEnabled}
            manageStandingsSelectedStages={manageStandingsSelectedStages}
            manageStandingsDestinationsExpanded={manageStandingsDestinationsExpanded}
            manageStandingsDestinations={manageStandingsDestinations}
            manageStandingsDestinationsOriginal={manageStandingsDestinationsOriginal}
            manageStandingsLoadPrevEnabled={manageStandingsLoadPrevEnabled}
            manageStandingsLoadPrevSeason={manageStandingsLoadPrevSeason}
            manageStandingsLoadPrevStage={manageStandingsLoadPrevStage}
            manageStandingsPointsDeductionsExpanded={manageStandingsPointsDeductionsExpanded}
            manageStandingsPointsDeductions={manageStandingsPointsDeductions}
            manageStandingsPointsDeductionsOriginal={manageStandingsPointsDeductionsOriginal}
            tableDestinationsTermOptions={tableDestinationsTermOptions}
            pointsDeductionReasonsTermOptions={pointsDeductionReasonsTermOptions}
            allTerms={allTerms}
            tableTypes={tableTypes}
            destinationNameCreating={destinationNameCreating}
            pointsDeductionReasonCreating={pointsDeductionReasonCreating}
            api={api}
            onClose={handleCloseManageStandingsDialog}
            onSave={handleSaveManageStandings}
            onGroupFilterChange={setManageStandingsGroupFilter}
            onEditModeChange={setManageStandingsEditMode}
            onRecalculateLiveChange={setManageStandingsRecalculateLive}
            onMultiStageEnabledChange={setManageStandingsMultiStageEnabled}
            onSelectedStagesChange={setManageStandingsSelectedStages}
            onDestinationsExpandedChange={setManageStandingsDestinationsExpanded}
            onLoadPrevEnabledChange={setManageStandingsLoadPrevEnabled}
            onLoadPrevSeasonChange={setManageStandingsLoadPrevSeason}
            onLoadPrevStageChange={setManageStandingsLoadPrevStage}
            onPointsDeductionsExpandedChange={setManageStandingsPointsDeductionsExpanded}
            updateManageStandingsRow={updateManageStandingsRow}
            loadStagesAndPhases={loadStagesAndPhases}
            loadTermsAndCategories={loadTermsAndCategories}
            setSnackbar={setSnackbar}
            setDestinationNameCreating={setDestinationNameCreating}
            setPointsDeductionReasonCreating={setPointsDeductionReasonCreating}
            destinationTypeOptions={DESTINATION_TYPE_OPTIONS}
            tableTypeOptions={TABLE_TYPE_OPTIONS}
            handleAddDestination={handleAddDestination}
            handleUpdateDestination={handleUpdateDestination}
            handleRemoveDestination={handleRemoveDestination}
            handleRemoveAllDestinations={handleRemoveAllDestinations}
            handleDestinationNameClick={handleDestinationNameClick}
            handleAddPointsDeduction={handleAddPointsDeduction}
            handleUpdatePointsDeduction={handleUpdatePointsDeduction}
            handleRemovePointsDeduction={handleRemovePointsDeduction}
            handleRemoveAllPointsDeductions={handleRemoveAllPointsDeductions}
            handleReasonTermClick={handleReasonTermClick}
          />

        </Box>
      )}
        </Box>
      </Paper>

      <ImageUrlDialog
        open={imageDialogOpen}
        imageType={editingImageType}
        imageUrl={imageUrlValue}
        onClose={handleCloseImageDialog}
        onTypeChange={handleImageDialogTypeChange}
        onUrlChange={setImageUrlValue}
        onSave={handleSaveImageUrl}
      />

      <CreateNameDialog
        open={createBracketFinalDialogOpen}
        title="New Bracket Final Name"
        label="Bracket Final name"
        value={createBracketFinalName}
        placeholder="Enter Bracket Final name"
        onChange={setCreateBracketFinalName}
        onClose={handleCloseCreateBracketFinalDialog}
        onSave={handleCreateBracketFinalSave}
      />

      <RemoveFromAllSeasonsDialog
        open={removeFromAllSeasonsDialogOpen}
        onClose={() => setRemoveFromAllSeasonsDialogOpen(false)}
        onConfirm={handleRemoveFromAllSeasonsConfirm}
      />

      <CreateNameDialog
        open={createRoundNameDialogOpen}
        title="New Round Name"
        label="Round Name"
        value={createRoundNameName}
        placeholder="Enter Round Name"
        onChange={setCreateRoundNameName}
        onClose={handleCloseCreateRoundNameDialog}
        onSave={handleCreateRoundNameSave}
      />

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

      <ParticipantAddDialog
        open={participantAddDialogOpen}
        saving={participantAddSaving}
        termOptions={participantTermOptions}
        selectedTermId={participantSelectedTermId}
        participantName={newParticipantName}
        onParticipantNameChange={setNewParticipantName}
        onSelectedTermIdChange={setParticipantSelectedTermId}
        onClose={handleCloseParticipantAddDialog}
        onConfirm={handleAddParticipantConfirm}
      />

      <SeasonModalDialog
        open={seasonModalOpen}
        mode={seasonModalMode}
        newSeasonName={newSeasonName}
        newSeasonLanguageId={newSeasonLanguageId}
        newSeasonStartDate={newSeasonStartDate}
        newSeasonEndDate={newSeasonEndDate}
        newSeasonSetCurrent={newSeasonSetCurrent}
        newSeasonBasedOnLast={newSeasonBasedOnLast}
        seasonForm={seasonForm}
        seasonTermOptions={seasonTermOptions}
        saving={seasonSaving}
        onClose={handleSeasonModalClose}
        onSave={handleSeasonModalSave}
        onNewSeasonNameChange={setNewSeasonName}
        onNewSeasonLanguageIdChange={setNewSeasonLanguageId}
        onNewSeasonStartDateChange={setNewSeasonStartDate}
        onNewSeasonEndDateChange={setNewSeasonEndDate}
        onNewSeasonSetCurrentChange={setNewSeasonSetCurrent}
        onNewSeasonBasedOnLastChange={setNewSeasonBasedOnLast}
        onSeasonFormChange={setSeasonForm}
      />

      <StageModalDialog
        open={stageModalOpen}
        mode={stageModalMode}
        stageForm={stageForm}
        stageTermOptions={stageTermOptions}
        newStageName={newStageName}
        stagesTypes={stagesTypes}
        phasesBySeason={phasesBySeason}
        stageFormContext={stageFormContext}
        newStageSetCurrent={newStageSetCurrent}
        saving={stageSaving}
        onClose={handleStageModalClose}
        onSave={handleStageModalSave}
        onStageFormChange={setStageForm}
        onNewStageNameChange={setNewStageName}
        onNewStageSetCurrentChange={setNewStageSetCurrent}
      />

      <CreateGenerateStagesDialog
        open={createGenerateDialogOpen}
        tab={createGenerateDialogTab}
        competitionId={id}
        selectedSeasonNum={selectedStructureSeasonNum}
        structureSeasons={structureSeasons}
        importSeasonNum={generateStagesImportSeasonNum}
        generateStagesTypes={generateStagesTypes}
        stageForm={stageForm}
        stageTermOptions={stageTermOptions}
        stagesTypes={stagesTypes}
        phasesBySeason={phasesBySeason}
        stageFormContext={stageFormContext}
        newStageName={newStageName}
        newStageSetCurrent={newStageSetCurrent}
        stageSaving={stageSaving}
        onClose={handleCloseCreateGenerateDialog}
        onTabChange={handleCreateGenerateDialogTabChange}
        onImportSeasonNumChange={setGenerateStagesImportSeasonNum}
        onGenerateStagesTypesChange={setGenerateStagesTypes}
        onStageFormChange={setStageForm}
        onNewStageNameChange={setNewStageName}
        onNewStageSetCurrentChange={setNewStageSetCurrent}
        onImportStages={handleImportStagesFromSeason}
        onCreateGeneratedStages={handleCreateGeneratedStages}
        onCreateStage={handleStageModalSave}
      />

      <StageDeleteConfirmDialog
        open={stageDeleteConfirmOpen}
        selectedStagesCount={selectedStagesForDelete.length}
        onClose={() => setStageDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteStages}
      />

      <GroupModalDialog
        open={groupModalOpen}
        mode={groupModalMode}
        groupForm={groupForm}
        groupTermOptions={groupTermOptions}
        newGroupName={newGroupName}
        saving={groupSaving}
        onClose={handleGroupModalClose}
        onSave={handleGroupModalSave}
        onGroupFormChange={setGroupForm}
        onNewGroupNameChange={setNewGroupName}
      />

      <PhaseModalDialog
        open={phaseModalOpen}
        mode={phaseModalMode}
        phaseForm={phaseForm}
        phaseTermOptions={phaseTermOptions}
        newPhaseName={newPhaseName}
        phasesBySeason={phasesBySeason}
        phaseFormContext={phaseFormContext}
        phaseEditTarget={phaseEditTarget}
        saving={phaseSaving}
        onClose={handlePhaseModalClose}
        onSave={handlePhaseModalSave}
        onPhaseFormChange={setPhaseForm}
        onNewPhaseNameChange={setNewPhaseName}
      />

      <SeasonTableSettingsDialog
        open={seasonTableSettingsDialogOpen}
        seasonName={structureSeasons.find((season) => season.SEASON_NUM === selectedStructureSeasonNum)?.name || selectedStructureSeasonNum}
        competition={competition}
        form={seasonTableSettingsForm}
        standingTypes={standingTypes}
        tablePointKeys={TABLE_POINT_KEYS}
        tableCheckboxKeys={TABLE_CHECKBOX_KEYS}
        tableSettingsLabels={TABLE_SETTINGS_LABELS}
        fieldLabels={FIELD_LABELS}
        orderByList={seasonTableSettingsOrderByList}
        dragOrderIndex={seasonTableSettingsDragOrderIndex}
        dragOverOrderIndex={seasonTableSettingsDragOverOrderIndex}
        fieldOptions={tableSettingsFieldOptions}
        newField={seasonTableSettingsOrderByNewField}
        newDirection={seasonTableSettingsOrderByNewDirection}
        saving={seasonTableSettingsSaving}
        formatLabel={formatTableSettingKeyAsLabel}
        onClose={handleCloseSeasonTableSettingsDialog}
        onSave={handleSaveSeasonTableSettings}
        onFormChange={handleSeasonTableSettingsFormChange}
        onOrderDragOver={handleSeasonTableSettingsOrderDragOver}
        onOrderDragLeave={() => setSeasonTableSettingsDragOverOrderIndex(null)}
        onOrderDrop={handleSeasonTableSettingsOrderDrop}
        onRemoveOrderBy={handleSeasonTableSettingsRemoveOrderBy}
        onOrderDragStart={handleSeasonTableSettingsOrderDragStart}
        onOrderDragEnd={handleSeasonTableSettingsOrderDragEnd}
        onNewFieldChange={setSeasonTableSettingsOrderByNewField}
        onNewDirectionChange={setSeasonTableSettingsOrderByNewDirection}
        onAddOrderBy={handleSeasonTableSettingsAddOrderBy}
      />
    </Box>
  );
}

export default CompetitionDetails;
