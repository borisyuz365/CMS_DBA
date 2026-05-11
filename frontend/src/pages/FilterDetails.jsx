import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Snackbar,
  Alert as MuiAlert,
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import TermEditModal from '../../reuse/TermEditModal';
import DatePicker from '../../reuse/DatePicker';
import api from '../services/api';
import { formatFilterDate, parseFilterDate, validateFilterDateRange } from '../utils/filterDates';

const ENTITY_TYPES = [
  { value: 5, label: 'Game' },
  { value: 6, label: 'Competition' },
  { value: 4, label: 'Competitor' },
  { value: 3, label: 'Country' },
  { value: 2, label: 'Athlete' },
];

const FILTER_EDIT_FIELDS = [
  'ACTIVE', 'PROMOTED', 'ALLOW_SELECTION',
  'START_DATE', 'END_DATE', 'EDITORS_CHOICE', 'EDITORS_PROMOTED_ODDS',
  'EDITORS_SHOW_SPORT_TYPE', 'EDITORS_PROMOTED_ALL_SCORES',
  'FORCE_FINAL_ACTION_ENUM_VAL',
];

function FilterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Targets
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [targetPage, setTargetPage] = useState(0);
  const [targetRowsPerPage] = useState(10);
  const [addLanguageIds, setAddLanguageIds] = useState([]);
  const [addCountryTargetIds, setAddCountryTargetIds] = useState([]);
  const [pendingTargetsToAdd, setPendingTargetsToAdd] = useState([]);
  const [pendingTargetIdsToDelete, setPendingTargetIdsToDelete] = useState([]);

  // Entities
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityPage, setEntityPage] = useState(0);
  const [entityRowsPerPage] = useState(10);
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [addEntityType, setAddEntityType] = useState(5);
  const [addEntityId, setAddEntityId] = useState('');
  const [pendingEntitiesToAdd, setPendingEntitiesToAdd] = useState([]);
  const [pendingEntityIdsToDelete, setPendingEntityIdsToDelete] = useState([]);
  const [pendingEntityChanges, setPendingEntityChanges] = useState({});
  const [isEntityEditMode, setIsEntityEditMode] = useState(false);
  const [draggingEntityKey, setDraggingEntityKey] = useState(null);
  const [entityDropTargetIndex, setEntityDropTargetIndex] = useState(null);

  // Dropdowns data
  const [sports, setSports] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [countries, setCountries] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    loadFilter();
    loadDropdownData();
    loadTermsAndCategories();
  }, [id]);

  useEffect(() => {
    setSelectedCompetition('');
    setSelectedCompetitor('');
    setSelectedAthlete('');
    setCompetitors([]);
    setAthletes([]);
  }, [selectedSport, selectedCountry]);

  useEffect(() => {
    setSelectedCompetitor('');
    setSelectedAthlete('');
    setAthletes([]);
  }, [selectedCompetition]);

  useEffect(() => {
    let cancelled = false;

    const loadFilteredCompetitors = async () => {
      if (![2, 4].includes(addEntityType) || !selectedSport || !selectedCountry || !selectedCompetition) {
        setCompetitors([]);
        return;
      }

      try {
        const data = await api.getCompetitorsList({
          sportType: selectedSport,
          country: selectedCountry,
          competition: selectedCompetition,
          showDeleted: false,
        });
        if (!cancelled) setCompetitors(data || []);
      } catch (err) {
        console.warn('Failed to load competitors:', err);
        if (!cancelled) setCompetitors([]);
      }
    };

    loadFilteredCompetitors();
    return () => {
      cancelled = true;
    };
  }, [addEntityType, selectedSport, selectedCountry, selectedCompetition]);

  useEffect(() => {
    let cancelled = false;

    const loadFilteredAthletes = async () => {
      if (addEntityType !== 2 || !selectedSport || !selectedCountry || !selectedCompetition || !selectedCompetitor) {
        setAthletes([]);
        return;
      }

      try {
        const data = await api.getAthletes({
          sportType: selectedSport,
          country: selectedCountry,
          league: selectedCompetition,
          team: selectedCompetitor,
          showDeleted: false,
        });
        if (!cancelled) setAthletes(data || []);
      } catch (err) {
        console.warn('Failed to load athletes:', err);
        if (!cancelled) setAthletes([]);
      }
    };

    loadFilteredAthletes();
    return () => {
      cancelled = true;
    };
  }, [addEntityType, selectedSport, selectedCountry, selectedCompetition, selectedCompetitor]);

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
      const [sportsData, countriesData, competitionsData, languagesData] = await Promise.all([
        api.getSports(),
        api.getCountries(),
        api.getCompetitions(),
        api.getLanguages(),
      ]);
      setSports(sportsData || []);
      setCountries(countriesData || []);
      setCompetitions(competitionsData || []);
      setLanguages(languagesData || []);
    } catch (err) {
      console.warn('Failed to load dropdown data:', err);
    }
  };

  const loadFilter = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFilterById(id);
      setFilter(data);
      setFormData({
        ACTIVE: data.ACTIVE ?? false,
        PROMOTED: data.PROMOTED ?? false,
        ALLOW_SELECTION: data.ALLOW_SELECTION ?? true,
        START_DATE: data.START_DATE ?? '',
        END_DATE: data.END_DATE ?? '',
        EDITORS_CHOICE: data.EDITORS_CHOICE ?? false,
        EDITORS_PROMOTED_ODDS: data.EDITORS_PROMOTED_ODDS ?? false,
        EDITORS_SHOW_SPORT_TYPE: data.EDITORS_SHOW_SPORT_TYPE ?? false,
        EDITORS_PROMOTED_ALL_SCORES: data.EDITORS_PROMOTED_ALL_SCORES ?? false,
        FORCE_FINAL_ACTION_ENUM_VAL: data.FORCE_FINAL_ACTION_ENUM_VAL ?? '',
      });
      setPendingTargetsToAdd([]);
      setPendingTargetIdsToDelete([]);
      setPendingEntitiesToAdd([]);
      setPendingEntityIdsToDelete([]);
      setPendingEntityChanges({});
      setIsEntityEditMode(false);
      setDraggingEntityKey(null);
      setEntityDropTargetIndex(null);
      setSelectedTargets([]);
      setSelectedEntities([]);
    } catch (err) {
      setError(err.message || 'Failed to load filter');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/filters');

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!filter) return;
    const dateErrors = validateFilterDateRange(formData.START_DATE, formData.END_DATE);
    if (Object.keys(dateErrors).length > 0) {
      setSnackbar({ open: true, message: 'Please fix invalid date ranges before saving', severity: 'error' });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const changes = {};
      for (const field of FILTER_EDIT_FIELDS) {
        const current = formData[field];
        const original = filter[field];
        if (typeof current === 'boolean') {
          if (current !== !!original) changes[field] = current;
        } else if (current !== (original ?? '')) {
          changes[field] = current === '' ? null : current;
        }
      }

      if (Object.keys(changes).length === 0) {
        setSnackbar({ open: true, message: 'No changes to save', severity: 'info' });
        setLoading(false);
        return;
      }

      await api.updateFiltersBulk([{ filterId: filter.FILTER_ID, changes }]);
      setSnackbar({ open: true, message: 'Filter updated successfully', severity: 'success' });
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNameClick = async () => {
    if (!filter || !filter.NAME_ID) return;
    try {
      const term = await api.getTermById(filter.NAME_ID);
      setCurrentTerm(term);
      setTermModalOpen(true);
    } catch (err) {
      console.error('Failed to load term:', err);
      setSnackbar({ open: true, message: 'Failed to load term for editing', severity: 'error' });
    }
  };

  const handleTermSave = async (termData) => {
    try {
      await api.updateTerm(termData.id, termData);
      await loadFilter();
      setTermModalOpen(false);
    } catch (err) {
      console.error('Failed to save term:', err);
      setSnackbar({ open: true, message: 'Failed to save term', severity: 'error' });
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

  const uiLanguages = useMemo(() => languages.filter((l) => l.isUI === true), [languages]);
  const realCountries = useMemo(() => countries.filter((c) => c.IS_NOT_REAL === false), [countries]);
  const pendingTargetDeleteSet = useMemo(
    () => new Set(pendingTargetIdsToDelete.map((targetId) => String(targetId))),
    [pendingTargetIdsToDelete]
  );
  const pendingEntityDeleteSet = useMemo(
    () => new Set(pendingEntityIdsToDelete.map((entityId) => String(entityId))),
    [pendingEntityIdsToDelete]
  );
  const getEntityKey = (entity) => `${entity.ENTITY_TYPE}-${entity.ENTITY_ID}`;
  const displayedTargets = useMemo(() => {
    const currentTargets = filter?.targets || [];
    return [
      ...pendingTargetsToAdd,
      ...currentTargets.filter((target) => !pendingTargetDeleteSet.has(String(target.FILTER_TARGET_ID))),
    ];
  }, [filter?.targets, pendingTargetsToAdd, pendingTargetDeleteSet]);
  const displayedEntities = useMemo(() => {
    const currentEntities = filter?.entities || [];
    const entities = [
      ...pendingEntitiesToAdd,
      ...currentEntities.filter((entity) => !pendingEntityDeleteSet.has(String(entity.ENTITY_ID))),
    ].map((entity) => ({
      ...entity,
      ...(pendingEntityChanges[getEntityKey(entity)] || {}),
    }));

    return entities
      .map((entity, index) => ({ entity, index }))
      .sort((a, b) => {
        const aOrder = a.entity.FILTER_ORDER;
        const bOrder = b.entity.FILTER_ORDER;
        const aHasOrder = aOrder !== null && aOrder !== undefined && aOrder !== '';
        const bHasOrder = bOrder !== null && bOrder !== undefined && bOrder !== '';
        if (aHasOrder && bHasOrder) return Number(aOrder) - Number(bOrder);
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return a.index - b.index;
      })
      .map(({ entity }) => entity);
  }, [filter?.entities, pendingEntitiesToAdd, pendingEntityDeleteSet, pendingEntityChanges]);
  const filteredCompetitionOptions = useMemo(() => (
    competitions.filter((competition) => {
      const matchesSport = !selectedSport || String(competition.SPORT_TYPE_ID) === String(selectedSport);
      const matchesCountry = !selectedCountry || String(competition.COUNTRY_ID) === String(selectedCountry);
      return matchesSport && matchesCountry;
    })
  ), [competitions, selectedSport, selectedCountry]);
  const hasExtendedDetailsChanges = pendingTargetsToAdd.length > 0
    || pendingTargetIdsToDelete.length > 0
    || pendingEntitiesToAdd.length > 0
    || pendingEntityIdsToDelete.length > 0
    || Object.keys(pendingEntityChanges).length > 0;

  const generalDateValidationErrors = useMemo(
    () => validateFilterDateRange(formData.START_DATE, formData.END_DATE),
    [formData.START_DATE, formData.END_DATE]
  );
  const hasGeneralDateValidationErrors = Object.keys(generalDateValidationErrors).length > 0;

  const hasGeneralDetailsChanges = useMemo(() => {
    if (!filter) return false;
    for (const field of FILTER_EDIT_FIELDS) {
      const current = formData[field];
      const original = filter[field];
      if (typeof current === 'boolean') {
        if (current !== !!original) return true;
      } else if (current !== (original ?? '')) {
        return true;
      }
    }
    return false;
  }, [filter, formData]);

  // --- Targets ---
  const getTargetDisplayData = (targetType, targetId) => {
    const numericTargetId = parseInt(targetId, 10);
    if (targetType === 1) {
      const language = uiLanguages.find((item) => String(item.id) === String(targetId));
      return {
        TARGET_TYPE_LABEL: 'Language',
        TARGET_NAME: language?.name || `Language #${numericTargetId}`,
      };
    }

    const country = realCountries.find((item) => String(item.COUNTRY_ID) === String(targetId));
    return {
      TARGET_TYPE_LABEL: 'Country',
      TARGET_NAME: country ? `${country.EMOJI ? `${country.EMOJI} ` : ''}${country.name || `Country #${numericTargetId}`}` : `Country #${numericTargetId}`,
    };
  };

  const handleDeleteTargets = () => {
    if (selectedTargets.length === 0) return;
    const selectedSet = new Set(selectedTargets.map((targetId) => String(targetId)));
    setPendingTargetsToAdd((prev) => prev.filter((target) => !selectedSet.has(String(target.FILTER_TARGET_ID))));
    setPendingTargetIdsToDelete((prev) => {
      const currentTargetIds = new Set((filter?.targets || []).map((target) => String(target.FILTER_TARGET_ID)));
      const next = new Set(prev.map((targetId) => String(targetId)));
      selectedSet.forEach((targetId) => {
        if (currentTargetIds.has(targetId)) next.add(targetId);
      });
      return Array.from(next);
    });
    setSelectedTargets([]);
    setSnackbar({ open: true, message: `Marked ${selectedTargets.length} target(s) for deletion`, severity: 'info' });
  };

  const handleAddTargets = (targetType, targetIds) => {
    if (!targetIds || targetIds.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one target', severity: 'warning' });
      return;
    }

    const targetIdKeys = targetIds.map((targetId) => String(parseInt(targetId, 10)));
    const currentTargetIds = new Set((filter?.targets || []).map((target) => String(target.FILTER_TARGET_ID)));
    setPendingTargetIdsToDelete((prev) => prev.filter((targetId) => !targetIdKeys.includes(String(targetId))));
    setPendingTargetsToAdd((prev) => {
      const displayedIds = new Set(displayedTargets.map((target) => String(target.FILTER_TARGET_ID)));
      const pendingIds = new Set(prev.map((target) => String(target.FILTER_TARGET_ID)));
      const next = [...prev];
      for (const tid of targetIds) {
        const targetId = parseInt(tid, 10);
        const targetIdKey = String(targetId);
        if (currentTargetIds.has(targetIdKey) || displayedIds.has(targetIdKey) || pendingIds.has(targetIdKey)) continue;
        next.push({
          FILTER_TARGET_ID: targetId,
          FILTER_TARGET_TYPE: targetType,
          FILTER_ID: filter.FILTER_ID,
          ...getTargetDisplayData(targetType, targetId),
          isPendingAdd: true,
        });
        pendingIds.add(targetIdKey);
      }
      return next;
    });
    setSnackbar({ open: true, message: `Marked ${targetIds.length} target(s) for addition`, severity: 'info' });
    if (targetType === 1) setAddLanguageIds([]);
    else setAddCountryTargetIds([]);
  };

  // --- Entities ---
  const filteredEntities = useMemo(() => {
    if (entityTypeFilter === 'all') return displayedEntities;
    return displayedEntities.filter((e) => e.ENTITY_TYPE === parseInt(entityTypeFilter, 10));
  }, [displayedEntities, entityTypeFilter]);

  const getEntityDisplayName = (entityType, entityId) => {
    if (entityType === 5) {
      return `Game #${entityId}`;
    }
    if (entityType === 6) {
      const competition = competitions.find((item) => String(item.COMPETITION_ID) === String(entityId));
      return competition?.name || `Competition #${entityId}`;
    }
    if (entityType === 3) {
      const country = countries.find((item) => String(item.COUNTRY_ID) === String(entityId));
      return country ? `${country.EMOJI ? `${country.EMOJI} ` : ''}${country.name || `Country #${entityId}`}` : `Country #${entityId}`;
    }
    if (entityType === 4) {
      const competitor = competitors.find((item) => String(item.COMPETITOR_ID) === String(entityId));
      return competitor?.name || competitor?.NAME || `Competitor #${entityId}`;
    }
    if (entityType === 2) {
      const athlete = athletes.find((item) => String(item.ATHLETE_ID) === String(entityId));
      return athlete?.name || athlete?.NAME || `Athlete #${entityId}`;
    }
    return `#${entityId}`;
  };

  const handleDeleteEntities = () => {
    if (selectedEntities.length === 0) return;
    const selectedSet = new Set(selectedEntities.map((entityId) => String(entityId)));
    setPendingEntitiesToAdd((prev) => prev.filter((entity) => !selectedSet.has(String(entity.ENTITY_ID))));
    setPendingEntityChanges((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const entityId = key.split('-').pop();
        if (selectedSet.has(String(entityId))) delete next[key];
      });
      return next;
    });
    setPendingEntityIdsToDelete((prev) => {
      const currentEntityIds = new Set((filter?.entities || []).map((entity) => String(entity.ENTITY_ID)));
      const next = new Set(prev.map((entityId) => String(entityId)));
      selectedSet.forEach((entityId) => {
        if (currentEntityIds.has(entityId)) next.add(entityId);
      });
      return Array.from(next);
    });
    setSelectedEntities([]);
    setSnackbar({ open: true, message: `Marked ${selectedEntities.length} entity/entities for deletion`, severity: 'info' });
  };

  const mergeCaptionToken = (caption, token, enabled) => {
    const tokens = new Set(String(caption || '').split(',').map((item) => item.trim()).filter(Boolean));
    if (enabled) tokens.add(token);
    else tokens.delete(token);
    return Array.from(tokens).join(',');
  };

  const handleToggleEntityEditMode = () => {
    if (isEntityEditMode && Object.keys(pendingEntityChanges).length > 0 && !window.confirm('Discard unsaved entity edits?')) return;
    if (isEntityEditMode) {
      setPendingEntityChanges({});
      setDraggingEntityKey(null);
      setEntityDropTargetIndex(null);
    }
    setIsEntityEditMode((prev) => !prev);
  };

  const handleEntityFieldChange = (entity, field, value) => {
    const key = getEntityKey(entity);
    const normalizedValue = field === 'FILTER_ORDER' && value !== null && value !== '' ? Number(value) : value;

    if (entity.isPendingAdd) {
      setPendingEntitiesToAdd((prev) => prev.map((item) => (
        getEntityKey(item) === key ? { ...item, [field]: normalizedValue } : item
      )));
      return;
    }

    setPendingEntityChanges((prev) => {
      const original = (filter?.entities || []).find((item) => getEntityKey(item) === key);
      const originalValue = original?.[field] ?? (field === 'CAPTION' ? '' : null);
      const nextForEntity = { ...(prev[key] || {}), [field]: normalizedValue };

      if (String(normalizedValue ?? '') === String(originalValue ?? '')) {
        delete nextForEntity[field];
      }

      const next = { ...prev };
      if (Object.keys(nextForEntity).length === 0) delete next[key];
      else next[key] = nextForEntity;
      return next;
    });
  };

  const handleEntityUseNameChange = (entity, checked) => {
    handleEntityFieldChange(entity, 'CAPTION', mergeCaptionToken(entity.CAPTION, 'name', checked));
  };

  const handleEntityOrderDrop = (targetIndex) => {
    if (!isEntityEditMode || !draggingEntityKey || entityTypeFilter !== 'all') return;
    const sourceIndex = displayedEntities.findIndex((entity) => getEntityKey(entity) === draggingEntityKey);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggingEntityKey(null);
      setEntityDropTargetIndex(null);
      return;
    }

    const next = [...displayedEntities];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    next.forEach((entity, index) => handleEntityFieldChange(entity, 'FILTER_ORDER', index + 1));
    setDraggingEntityKey(null);
    setEntityDropTargetIndex(null);
  };

  const handleAddEntity = () => {
    const entityIdByType = {
      2: selectedAthlete,
      3: selectedCountry,
      4: selectedCompetitor,
      5: addEntityId,
      6: selectedCompetition,
    };
    const entityId = entityIdByType[addEntityType];
    if (!entityId) {
      setSnackbar({ open: true, message: 'Please select or enter an entity', severity: 'warning' });
      return;
    }
    const parsedEntityId = parseInt(entityId, 10);
    const entityIdKey = String(parsedEntityId);
    const currentEntityIds = new Set((filter?.entities || []).map((entity) => String(entity.ENTITY_ID)));

    setPendingEntityIdsToDelete((prev) => prev.filter((idToDelete) => String(idToDelete) !== entityIdKey));
    setPendingEntitiesToAdd((prev) => {
      const displayedIds = new Set(displayedEntities.map((entity) => String(entity.ENTITY_ID)));
      if (currentEntityIds.has(entityIdKey) || displayedIds.has(entityIdKey) || prev.some((entity) => String(entity.ENTITY_ID) === entityIdKey)) return prev;

      const entityTypeLabel = ENTITY_TYPES.find((type) => type.value === addEntityType)?.label || `Type ${addEntityType}`;
      return [
        {
          FILTER_ID: filter.FILTER_ID,
          ENTITY_ID: parsedEntityId,
          ENTITY_TYPE: addEntityType,
          ENTITY_TYPE_LABEL: entityTypeLabel,
          ENTITY_NAME: getEntityDisplayName(addEntityType, parsedEntityId),
          FILTER_ORDER: null,
          CAPTION: '',
          isPendingAdd: true,
        },
        ...prev,
      ];
    });
    setSnackbar({ open: true, message: 'Marked entity for addition', severity: 'info' });
    setAddEntityId('');
    setSelectedSport('');
    setSelectedCountry('');
    setSelectedCompetition('');
    setSelectedCompetitor('');
    setSelectedAthlete('');
  };

  const handleExtendedDetailsSave = async () => {
    if (!filter || !hasExtendedDetailsChanges) return;
    try {
      setLoading(true);
      setError(null);

      if (pendingTargetIdsToDelete.length > 0) {
        await api.deleteFilterTargets(filter.FILTER_ID, pendingTargetIdsToDelete);
      }
      if (pendingEntityIdsToDelete.length > 0) {
        await api.deleteFilterEntities(filter.FILTER_ID, pendingEntityIdsToDelete);
      }
      for (const target of pendingTargetsToAdd) {
        await api.addFilterTarget(filter.FILTER_ID, {
          FILTER_TARGET_ID: target.FILTER_TARGET_ID,
          FILTER_TARGET_TYPE: target.FILTER_TARGET_TYPE,
        });
      }
      for (const entity of pendingEntitiesToAdd) {
        await api.addFilterEntity(filter.FILTER_ID, {
          ENTITY_ID: entity.ENTITY_ID,
          ENTITY_TYPE: entity.ENTITY_TYPE,
          CAPTION: entity.CAPTION || '',
          FILTER_ORDER: entity.FILTER_ORDER,
        });
      }
      const entityUpdates = Object.entries(pendingEntityChanges).map(([key, changes]) => {
        const [entityType, entityId] = key.split('-').map((value) => parseInt(value, 10));
        return { entityId, entityType, changes };
      });
      if (entityUpdates.length > 0) {
        await api.updateFilterEntities(filter.FILTER_ID, entityUpdates);
      }

      setSnackbar({ open: true, message: 'Extended details updated successfully', severity: 'success' });
      await loadFilter();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save extended details', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderBooleanChip = (value) => {
    if (value === true) return <Chip label="Yes" size="small" sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 500, fontSize: '0.75rem' }} />;
    if (value === false) return <Chip label="No" size="small" sx={{ backgroundColor: '#FFEBEE', color: '#C62828', fontWeight: 500, fontSize: '0.75rem' }} />;
    return '-';
  };

  const handleSnackbarClose = (e, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Pagination helpers
  const paginateData = (data, page, rowsPerPage) => {
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  };

  if (loading && !filter) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error && !filter) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  if (!filter) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" message="Filter not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>Back to List</Button>
      </Box>
    );
  }

  const targets = displayedTargets;
  const paginatedTargets = paginateData(targets, targetPage, targetRowsPerPage);
  const paginatedEntities = paginateData(filteredEntities, entityPage, entityRowsPerPage);

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
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
          Filter –{' '}
          <Box
            component="span"
            onClick={filter.NAME_ID ? handleNameClick : undefined}
            sx={{
              color: '#1976d2',
              cursor: filter.NAME_ID ? 'pointer' : 'default',
              textDecoration: filter.NAME_ID ? 'underline' : 'none',
              '&:hover': filter.NAME_ID ? { color: '#1565c0' } : {},
            }}
          >
            {filter.FILTER_NAME || `Filter #${filter.FILTER_ID}`}
          </Box>
        </Typography>
      </Box>

      {/* General Details */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>General Details</Typography>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || !hasGeneralDetailsChanges || hasGeneralDateValidationErrors}
            sx={{ textTransform: 'none', backgroundColor: '#15803d', color: 'white', px: 3, py: 1, '&:hover': { backgroundColor: '#166534' } }}
          >
            Save & Update In Service
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(260px, 1fr)' }, gap: 2, alignItems: 'start' }}>
          {/* Fields grid */}
          <Box sx={{
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 1.5, md: 1.25 }, width: '100%', alignContent: 'start',
          }}>
            <Box sx={{ minWidth: 0 }}>
              <DatePicker
                label="Start Date"
                value={parseFilterDate(formData.START_DATE)}
                onChange={(date) => handleFormChange('START_DATE', formatFilterDate(date))}
                error={generalDateValidationErrors.start}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <DatePicker
                label="End Date"
                value={parseFilterDate(formData.END_DATE)}
                onChange={(date) => handleFormChange('END_DATE', formatFilterDate(date))}
                error={generalDateValidationErrors.end}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.75rem' }}>Force Final Action</InputLabel>
                <Select
                  label="Force Final Action"
                  value={formData.FORCE_FINAL_ACTION_ENUM_VAL ?? ''}
                  onChange={(e) => handleFormChange('FORCE_FINAL_ACTION_ENUM_VAL', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiSelect-select': { py: 1, fontSize: '0.8rem' } }}
                >
                  <MenuItem value="">Server Logic</MenuItem>
                  <MenuItem value={2}>Force Show</MenuItem>
                  <MenuItem value={3}>Force Hide</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Created" value={filter.CREATE_TIME || '-'} disabled
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <TextField
                fullWidth size="small" label="Updated" value={filter.UPDATE_TIME || '-'} disabled
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
          </Box>

          {/* Booleans */}
          <Box sx={{
            minWidth: 0,
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 0.5, alignContent: 'start', alignItems: 'flex-start',
          }}>
            {[
              { field: 'ACTIVE', label: 'Active' },
              { field: 'PROMOTED', label: 'Promoted' },
              { field: 'ALLOW_SELECTION', label: 'Allow Selection' },
              { field: 'EDITORS_CHOICE', label: "Editor's Choice" },
              { field: 'EDITORS_PROMOTED_ODDS', label: 'Promoted Odds' },
              { field: 'EDITORS_SHOW_SPORT_TYPE', label: 'Show Sport Type' },
              { field: 'EDITORS_PROMOTED_ALL_SCORES', label: 'Promoted All Scores' },
            ].map(({ field, label }) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    size="small"
                    checked={!!formData[field]}
                    onChange={(e) => handleFormChange(field, e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
                sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Extended Details */}
      <Paper sx={{ boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          position: 'sticky', top: 0, zIndex: 10,
          borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Extended Details</Typography>
          <Button
            variant="contained"
            onClick={handleExtendedDetailsSave}
            disabled={loading || !hasExtendedDetailsChanges}
            sx={{ textTransform: 'none', backgroundColor: '#15803d', color: 'white', px: 3, py: 1, '&:hover': { backgroundColor: '#166534' } }}
          >
            Save & Update In Service
          </Button>
        </Box>

        <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
      {/* Filter Targets */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filter Targets</Typography>
        </Box>

        {/* Add Language target */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 80 }}>Language:</Typography>
          <Autocomplete
            multiple
            disableCloseOnSelect
            limitTags={3}
            options={[{ id: '__all__', name: 'All' }, ...uiLanguages]}
            getOptionLabel={(opt) => opt.name || `Language #${opt.id}`}
            value={addLanguageIds.length === uiLanguages.length
              ? [{ id: '__all__', name: 'All' }, ...uiLanguages]
              : uiLanguages.filter((l) => addLanguageIds.includes(String(l.id)))}
            onChange={(e, val) => {
              const hasAll = val.some((v) => v.id === '__all__');
              const hadAll = addLanguageIds.length === uiLanguages.length;
              if (hasAll && !hadAll) {
                setAddLanguageIds(uiLanguages.map((l) => String(l.id)));
              } else if (!hasAll && hadAll) {
                setAddLanguageIds([]);
              } else {
                const filtered = val.filter((v) => v.id !== '__all__');
                setAddLanguageIds(filtered.map((v) => String(v.id)));
              }
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={option.id === '__all__' ? addLanguageIds.length === uiLanguages.length : selected} sx={{ mr: 1 }} />
                {option.name || `Language #${option.id}`}
              </li>
            )}
            renderTags={(value, getTagProps) => {
              const items = value.filter((v) => v.id !== '__all__');
              if (items.length === uiLanguages.length) {
                return <Chip label={`All (${items.length})`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddLanguageIds([])} />;
              }
              if (items.length > 3) {
                return <Chip label={`${items.length} selected`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddLanguageIds([])} />;
              }
              return items.map((opt, index) => <Chip {...getTagProps({ index })} label={opt.name} size="small" sx={{ fontSize: '0.75rem' }} key={opt.id} />);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Select Languages" size="small"
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            )}
            sx={{ minWidth: 350 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddTargets(1, addLanguageIds)}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add
          </Button>
        </Box>

        {/* Add Country target */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 80 }}>Country:</Typography>
          <Autocomplete
            multiple
            disableCloseOnSelect
            limitTags={3}
            options={[{ COUNTRY_ID: '__all__', name: 'All' }, ...realCountries]}
            getOptionLabel={(opt) => opt.COUNTRY_ID === '__all__' ? 'All' : ((opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || `Country #${opt.COUNTRY_ID}`))}
            value={addCountryTargetIds.length === realCountries.length
              ? [{ COUNTRY_ID: '__all__', name: 'All' }, ...realCountries]
              : realCountries.filter((c) => addCountryTargetIds.includes(String(c.COUNTRY_ID)))}
            onChange={(e, val) => {
              const hasAll = val.some((v) => v.COUNTRY_ID === '__all__');
              const hadAll = addCountryTargetIds.length === realCountries.length;
              if (hasAll && !hadAll) {
                setAddCountryTargetIds(realCountries.map((c) => String(c.COUNTRY_ID)));
              } else if (!hasAll && hadAll) {
                setAddCountryTargetIds([]);
              } else {
                const filtered = val.filter((v) => v.COUNTRY_ID !== '__all__');
                setAddCountryTargetIds(filtered.map((v) => String(v.COUNTRY_ID)));
              }
            }}
            isOptionEqualToValue={(option, value) => option.COUNTRY_ID === value.COUNTRY_ID}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={option.COUNTRY_ID === '__all__' ? addCountryTargetIds.length === realCountries.length : selected} sx={{ mr: 1 }} />
                {option.COUNTRY_ID === '__all__' ? 'All' : ((option.EMOJI ? `${option.EMOJI} ` : '') + (option.name || `Country #${option.COUNTRY_ID}`))}
              </li>
            )}
            renderTags={(value, getTagProps) => {
              const items = value.filter((v) => v.COUNTRY_ID !== '__all__');
              if (items.length === realCountries.length) {
                return <Chip label={`All (${items.length})`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddCountryTargetIds([])} />;
              }
              if (items.length > 3) {
                return <Chip label={`${items.length} selected`} size="small" sx={{ fontSize: '0.75rem' }} onDelete={() => setAddCountryTargetIds([])} />;
              }
              return items.map((opt, index) => {
                const label = (opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || `#${opt.COUNTRY_ID}`);
                return <Chip {...getTagProps({ index })} label={label} size="small" sx={{ fontSize: '0.75rem' }} key={opt.COUNTRY_ID} />;
              });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Select Countries" size="small"
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            )}
            sx={{ minWidth: 350 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddTargets(2, addCountryTargetIds)}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff' }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedTargets.length > 0 && selectedTargets.length < paginatedTargets.length}
                    checked={paginatedTargets.length > 0 && selectedTargets.length === paginatedTargets.length}
                    onChange={(e) => e.target.checked
                      ? setSelectedTargets(paginatedTargets.map((t) => t.FILTER_TARGET_ID))
                      : setSelectedTargets([])
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Filter Target Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Target</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTargets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" fontSize="0.875rem">No targets found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTargets.map((t, idx) => (
                  <TableRow key={`${t.FILTER_TARGET_TYPE}-${t.FILTER_TARGET_ID}-${idx}`} hover
                    selected={selectedTargets.includes(t.FILTER_TARGET_ID)}
                    sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedTargets.includes(t.FILTER_TARGET_ID)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTargets([...selectedTargets, t.FILTER_TARGET_ID]);
                          else setSelectedTargets(selectedTargets.filter((id) => id !== t.FILTER_TARGET_ID));
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Chip label={t.TARGET_TYPE_LABEL} size="small" sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#1976d2', fontWeight: 500 }}>{t.FILTER_TARGET_ID}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{t.TARGET_NAME}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Targets footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #EAECF0', mt: 1 }}>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteTargets}
            disabled={selectedTargets.length === 0}
            sx={{
              backgroundColor: '#d32f2f', color: '#fff', textTransform: 'none', fontWeight: 500,
              '&:hover': { backgroundColor: '#c62828' },
              '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#fff' },
            }}
          >
            Delete Targets ({selectedTargets.length})
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {targets.length === 0 ? '0-0' : `${targetPage * targetRowsPerPage + 1}-${Math.min((targetPage + 1) * targetRowsPerPage, targets.length)}`} of {targets.length}
            </Typography>
            <IconButton onClick={() => setTargetPage(targetPage - 1)} disabled={targetPage === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => setTargetPage(targetPage + 1)} disabled={(targetPage + 1) * targetRowsPerPage >= targets.length} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Filter Entities */}
      <Paper sx={{ p: 3, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white', mb: 2 }}>
        <Box sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5',
          px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filter Entities</Typography>
        </Box>

        {/* Add Entity form */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            Choose Type of Entity to Add:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={addEntityType}
              onChange={(e) => {
                setAddEntityType(e.target.value);
                setAddEntityId('');
                setSelectedSport('');
                setSelectedCountry('');
                setSelectedCompetition('');
                setSelectedCompetitor('');
                setSelectedAthlete('');
                setCompetitors([]);
                setAthletes([]);
              }}
              sx={{ fontSize: '0.8rem' }}
            >
              {ENTITY_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {[6, 4, 2].includes(addEntityType) && (
            <Autocomplete
              options={sports}
              getOptionLabel={(opt) => opt.name || opt.ALIAS_NAME || `Sport #${opt.SPORT_TYPE_ID}`}
              value={sports.find((s) => String(s.SPORT_TYPE_ID) === String(selectedSport)) || null}
              onChange={(e, val) => setSelectedSport(val ? String(val.SPORT_TYPE_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Sport" size="small" placeholder="Please select sport"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              sx={{ minWidth: 160 }}
            />
          )}

          {[3, 6, 4, 2].includes(addEntityType) && (
            <Autocomplete
              options={countries}
              getOptionLabel={(opt) => (opt.EMOJI ? `${opt.EMOJI} ` : '') + (opt.name || `Country #${opt.COUNTRY_ID}`)}
              value={countries.find((c) => String(c.COUNTRY_ID) === String(selectedCountry)) || null}
              onChange={(e, val) => setSelectedCountry(val ? String(val.COUNTRY_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Country" size="small" placeholder="Please select country"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              sx={{ minWidth: 180 }}
            />
          )}

          {[6, 4, 2].includes(addEntityType) && (
            <Autocomplete
              options={selectedSport && selectedCountry ? filteredCompetitionOptions : []}
              getOptionLabel={(opt) => opt.name || `Competition #${opt.COMPETITION_ID}`}
              value={filteredCompetitionOptions.find((c) => String(c.COMPETITION_ID) === String(selectedCompetition)) || null}
              onChange={(e, val) => setSelectedCompetition(val ? String(val.COMPETITION_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Select Competition" size="small" placeholder="Select sport and country first"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              disabled={!selectedSport || !selectedCountry}
              sx={{ minWidth: 300 }}
            />
          )}

          {[4, 2].includes(addEntityType) && (
            <Autocomplete
              options={competitors}
              getOptionLabel={(opt) => opt.name || opt.NAME || `Competitor #${opt.COMPETITOR_ID}`}
              value={competitors.find((c) => String(c.COMPETITOR_ID) === String(selectedCompetitor)) || null}
              onChange={(e, val) => setSelectedCompetitor(val ? String(val.COMPETITOR_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Select Competitor" size="small" placeholder="Select sport, country and competition first"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              disabled={!selectedSport || !selectedCountry || !selectedCompetition}
              sx={{ minWidth: 280 }}
            />
          )}

          {addEntityType === 2 && (
            <Autocomplete
              options={athletes}
              getOptionLabel={(opt) => opt.name || opt.NAME || `Athlete #${opt.ATHLETE_ID}`}
              value={athletes.find((a) => String(a.ATHLETE_ID) === String(selectedAthlete)) || null}
              onChange={(e, val) => setSelectedAthlete(val ? String(val.ATHLETE_ID) : '')}
              renderInput={(params) => (
                <TextField {...params} label="Select Athlete" size="small" placeholder="Select full hierarchy first"
                  sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                />
              )}
              disabled={!selectedSport || !selectedCountry || !selectedCompetition || !selectedCompetitor}
              sx={{ minWidth: 280 }}
            />
          )}

          {addEntityType === 5 && (
            <TextField
              size="small"
              label="Game ID"
              placeholder="Enter Game ID"
              value={addEntityId}
              onChange={(e) => setAddEntityId(e.target.value)}
              sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { minHeight: 40 }, '& .MuiOutlinedInput-input': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
            />
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEntity}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 40 }}
          >
            Add Entity
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ backgroundColor: '#ffffff' }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedEntities.length > 0 && selectedEntities.length < paginatedEntities.length}
                    checked={paginatedEntities.length > 0 && selectedEntities.length === paginatedEntities.length}
                    onChange={(e) => e.target.checked
                      ? setSelectedEntities(paginatedEntities.map((en) => en.ENTITY_ID))
                      : setSelectedEntities([])
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Filter Entity Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', backgroundColor: '#ffffff' }}>Use Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEntities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" fontSize="0.875rem">No entities found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntities.map((en, idx) => {
                  const entityKey = getEntityKey(en);
                  const globalIndex = displayedEntities.findIndex((entity) => getEntityKey(entity) === entityKey);
                  const canDragEntity = isEntityEditMode && entityTypeFilter === 'all';
                  const isDragging = draggingEntityKey === entityKey;
                  const isDropTarget = entityDropTargetIndex === globalIndex;

                  return (
                  <TableRow
                    key={`${en.ENTITY_TYPE}-${en.ENTITY_ID}-${idx}`}
                    hover={!isDragging}
                    selected={selectedEntities.includes(en.ENTITY_ID)}
                    draggable={canDragEntity}
                    onDragStart={(e) => {
                      if (!canDragEntity) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('text/plain', entityKey);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingEntityKey(entityKey);
                    }}
                    onDragEnd={() => {
                      setDraggingEntityKey(null);
                      setEntityDropTargetIndex(null);
                    }}
                    onDragOver={(e) => {
                      if (!canDragEntity) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setEntityDropTargetIndex(globalIndex);
                    }}
                    onDragLeave={() => setEntityDropTargetIndex(null)}
                    onDrop={(e) => {
                      if (!canDragEntity) return;
                      e.preventDefault();
                      handleEntityOrderDrop(globalIndex);
                    }}
                    sx={{
                      opacity: isDragging ? 0.5 : 1,
                      outline: isDropTarget ? '2px dashed #1976d2' : 'none',
                      cursor: canDragEntity ? 'grab' : 'default',
                      '&:hover': { backgroundColor: '#F9FAFB' },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedEntities.includes(en.ENTITY_ID)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEntities([...selectedEntities, en.ENTITY_ID]);
                          else setSelectedEntities(selectedEntities.filter((eid) => eid !== en.ENTITY_ID));
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Chip label={en.ENTITY_TYPE_LABEL} size="small" sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#1976d2', fontWeight: 500 }}>{en.ENTITY_ID}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{en.ENTITY_NAME}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {isEntityEditMode ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {entityTypeFilter === 'all' && (
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab', color: 'primary.main', opacity: 0.8, '&:active': { cursor: 'grabbing' } }}
                              aria-label="Drag to reorder"
                            >
                              <DragIndicatorIcon fontSize="small" />
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {en.FILTER_ORDER ?? globalIndex + 1}
                          </Typography>
                        </Box>
                      ) : (
                        en.FILTER_ORDER ?? '-'
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {isEntityEditMode ? (
                        <Checkbox
                          size="small"
                          checked={en.CAPTION?.includes('name') || false}
                          onChange={(e) => handleEntityUseNameChange(en, e.target.checked)}
                        />
                      ) : (
                        renderBooleanChip(en.CAPTION?.includes('name'))
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Entities footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #EAECF0', mt: 1, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Show Entities of Type:</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={entityTypeFilter}
                onChange={(e) => { setEntityTypeFilter(e.target.value); setEntityPage(0); }}
                sx={{ fontSize: '0.8rem' }}
              >
                <MenuItem value="all">All</MenuItem>
                {ENTITY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteEntities}
              disabled={selectedEntities.length === 0}
              sx={{
                backgroundColor: '#d32f2f', color: '#fff', textTransform: 'none', fontWeight: 500,
                '&:hover': { backgroundColor: '#c62828' },
                '&.Mui-disabled': { backgroundColor: '#cccccc', color: '#fff' },
              }}
            >
              Delete Entities ({selectedEntities.length})
            </Button>
            <Button
              variant={isEntityEditMode ? 'contained' : 'outlined'}
              startIcon={isEntityEditMode ? <CancelIcon /> : <EditIcon />}
              onClick={handleToggleEntityEditMode}
              sx={{
                borderColor: '#E0E0E0',
                bgcolor: isEntityEditMode ? '#1976d2' : '#fff',
                color: isEntityEditMode ? '#fff' : '#000',
                textTransform: 'none',
                '&:hover': { bgcolor: isEntityEditMode ? '#1565c0' : '#f5f5f5' },
              }}
            >
              {isEntityEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {filteredEntities.length === 0 ? '0-0' : `${entityPage * entityRowsPerPage + 1}-${Math.min((entityPage + 1) * entityRowsPerPage, filteredEntities.length)}`} of {filteredEntities.length}
            </Typography>
            <IconButton onClick={() => setEntityPage(entityPage - 1)} disabled={entityPage === 0} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
            <IconButton onClick={() => setEntityPage(entityPage + 1)} disabled={(entityPage + 1) * entityRowsPerPage >= filteredEntities.length} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Paper>

        </Box>
      </Paper>

      {/* Term Edit Modal */}
      <TermEditModal
        open={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        term={currentTerm}
        onSave={handleTermSave}
        onSaveAndUpdate={handleTermSave}
        allTerms={allTerms}
        allCategories={allCategories}
        onCreateCategory={handleCreateCategory}
        initialCategory="Filters Names"
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default FilterDetails;
