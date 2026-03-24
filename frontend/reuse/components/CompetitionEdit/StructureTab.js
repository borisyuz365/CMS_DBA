import React from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, TextField, Grid, FormControlLabel, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tabs, Tab, Autocomplete
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import TermEditModal from '../../TermEditModal';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveUpdateButtons from '../../SaveUpdateButtons';
import api from '../../services/api';

import CompetitorsManager from './CompetitorsManager';
import GroupsCompetitorsManager from './GroupsCompetitorsManager';
import EditGroupDialog from './GroupsCompetitorsManager/EditGroupDialog';

// Helper functions for datetime formatting

const formatDateTimeForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultDateTime = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}T00:00`;
};

// Competitors data will be loaded from API

// Demo stages and groups data
const demoStages = [
  { 
    id: 1, 
    name: 'Group Stage', 
    type: 'group', 
    order: 1, 
    isCurrent: true,
    hasTable: false,
    preVisualBrackets: false,
    includeInBracket: false,
    isSeries: false,
    filterDivision: false,
    numOfGames: -1,
    connectedInBrackets: false,
    connectedToPreviousStage: false,
    phase: '',
    startDate: '2024-09-15T00:00', // TODO: Load from DB - stage start date
    endDate: '2024-12-15T00:00'    // TODO: Load from DB - stage end date
  },
  { 
    id: 2, 
    name: 'Round of 16', 
    type: 'knockout', 
    order: 2, 
    isCurrent: false,
    hasTable: true,
    preVisualBrackets: false,
    includeInBracket: false,
    isSeries: false,
    filterDivision: true,
    numOfGames: 8,
    connectedInBrackets: false,
    connectedToPreviousStage: false,
    phase: '',
    startDate: '2025-02-15T00:00', // TODO: Load from DB - stage start date
    endDate: '2025-03-15T00:00'    // TODO: Load from DB - stage end date
  },
  { 
    id: 3, 
    name: 'Quarter Finals', 
    type: 'knockout', 
    order: 3, 
    isCurrent: false,
    hasTable: false,
    preVisualBrackets: true,
    includeInBracket: false,
    isSeries: false,
    filterDivision: false,
    numOfGames: 2,
    connectedInBrackets: false,
    connectedToPreviousStage: false,
    phase: '',
    startDate: '2025-04-01T00:00', // TODO: Load from DB - stage start date
    endDate: '2025-04-15T00:00'    // TODO: Load from DB - stage end date
  },
  { 
    id: 4, 
    name: 'Semi Finals', 
    type: 'knockout', 
    order: 4, 
    isCurrent: false,
    hasTable: false,
    preVisualBrackets: false,
    includeInBracket: false,
    isSeries: false,
    filterDivision: false,
    numOfGames: 2,
    connectedInBrackets: true,
    connectedToPreviousStage: true,
    phase: '',
    startDate: '2025-04-28T00:00', // TODO: Load from DB - stage start date
    endDate: '2025-05-05T00:00'    // TODO: Load from DB - stage end date
  },
  { 
    id: 5, 
    name: 'Final', 
    type: 'knockout', 
    order: 5, 
    isCurrent: false,
    hasTable: false,
    preVisualBrackets: false,
    includeInBracket: false,
    isSeries: false,
    filterDivision: false,
    numOfGames: 2,
    connectedInBrackets: true,
    connectedToPreviousStage: true,
    phase: '',
    startDate: '2025-05-28T00:00', // TODO: Load from DB - stage start date
    endDate: '2025-06-01T00:00'    // TODO: Load from DB - stage end date
  },
];

const demoGroups = [
  { id: 1, name: 'Group A', stageId: 1, teams: [1, 2] },
  { id: 2, name: 'Group B', stageId: 1, teams: [3, 4] },
  { id: 3, name: 'Group C', stageId: 1, teams: [5] },
  { id: 4, name: 'Group D', stageId: 1, teams: [] },
];

function StructureTab({
  seasons,
  setSeasons,
  selectedSeasonId,
  setSelectedSeasonId,
  selectedStageId,
  setSelectedStageId,
  selectedGroupId,
  setSelectedGroupId,
  selectedInSeason,
  setSelectedInSeason,
  selectedNotInSeason,
  setSelectedNotInSeason,
  handleStructureSave,
  handleStructureUpdateInServices,
  handleStructureReload,
  hasStructureChanges,
  setHasStructureChanges,
  reloadStructureLoading,
  handleSeasonKeyChange,
  handleSeasonStartDateChange,
  handleSeasonEndDateChange,
  handleSeasonConfigChange,
  handleTableSettingsChange,
  handleSendTableUpdate,
  handleConnectGamesToStage,
  handleConnectGamesToSeason,
  setUpdateSnackbarMsg,
  setUpdateSnackbarType,
  setUpdateSnackbarOpen,
  competitionId,
  comp,
  setComp,
  findOrCreateTerm
}) {

  


  // Get selected season data
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  // Get stages for selected season from API data
  const stages = selectedSeason?.stages || [];
  const stageGroups = selectedStageId ? 
    stages.find(s => s.id === selectedStageId)?.groups || [] : 
    [];

  // Track changes to stages for save button activation
  const [hasStageChanges, setHasStageChanges] = React.useState(false);
  
  // Track if table has been saved to DB for each stage
  const [savedTables, setSavedTables] = React.useState(new Set());
  
  // Track if season config has been saved to DB
  const [savedSeasonConfigs, setSavedSeasonConfigs] = React.useState(new Set());

  // Update stages when selected season changes
  React.useEffect(() => {
    if (selectedSeason && selectedSeason.stages) {
      // Stages are already loaded from API, no need to set them separately
      setHasStageChanges(false);
      
      // Initialize savedTables with stages that already have hasTable=true
      const stagesWithTable = selectedSeason.stages
        .filter(stage => stage.hasTable)
        .map(stage => stage.id);
      setSavedTables(new Set(stagesWithTable));
    }
  }, [selectedSeason]);



  // Handler for updating stage parameters - updates seasons state
  const handleStageParameterChange = (stageId, parameter, value) => {
    setSeasons(prev => prev.map(season => {
      if (season.id === selectedSeasonId) {
        return {
          ...season,
          stages: season.stages.map(stage => 
            stage.id === stageId ? { ...stage, [parameter]: value } : stage
          )
        };
      }
      return season;
    }));
    setHasStructureChanges(true);
    
    // If hasTable is being set to false, remove from saved tables
    if (parameter === 'hasTable' && value === false) {
      setSavedTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(stageId);
        return newSet;
      });
    }
    
    // If hasTable is being set to true, automatically set it to true at season level
    if (parameter === 'hasTable' && value === true) {
      handleSeasonConfigChange(selectedSeasonId, 'hasTable', true);
    }
  };

  // Handler for updating season config parameters
  const handleSeasonConfigChangeLocal = (seasonId, field, value) => {
    // Call the parent handler
    handleSeasonConfigChange(seasonId, field, value);
    
    // If hasInfoCard is being set to false, remove from saved season configs
    if (field === 'hasInfoCard' && value === false) {
      setSavedSeasonConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(seasonId);
        return newSet;
      });
    }
  };

  // Dialog states
  const [newSeasonDialogOpen, setNewSeasonDialogOpen] = React.useState(false);
  const [deleteSeasonDialogOpen, setDeleteSeasonDialogOpen] = React.useState(false);
  const [tableSettingsDialogOpen, setTableSettingsDialogOpen] = React.useState(false);
  const [newStageDialogOpen, setNewStageDialogOpen] = React.useState(false);
  const [deleteStageDialogOpen, setDeleteStageDialogOpen] = React.useState(false);
  const [newGroupDialogOpen, setNewGroupDialogOpen] = React.useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = React.useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = React.useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = React.useState(null);
  const [selectedGroupForDelete, setSelectedGroupForDelete] = React.useState(null);
  const [generateStagesDialogOpen, setGenerateStagesDialogOpen] = React.useState(false);
  const [generateStagesPreview, setGenerateStagesPreview] = React.useState(null);
  const [generateStagesConfirmDialogOpen, setGenerateStagesConfirmDialogOpen] = React.useState(false);
  
  // Groups competitors state
  const [competitorsInGroups, setCompetitorsInGroups] = React.useState([]);
  const [competitorsNotInGroups, setCompetitorsNotInGroups] = React.useState([]);
  const [selectedInGroups, setSelectedInGroups] = React.useState({});
  const [selectedNotInGroups, setSelectedNotInGroups] = React.useState([]);
  
  // Autocomplete suggestions for season and stage names
  const [seasonNameSuggestions, setSeasonNameSuggestions] = React.useState([]);
  const [seasonNameInputValue, setSeasonNameInputValue] = React.useState('');
  const [stageNameSuggestions, setStageNameSuggestions] = React.useState([]);
  const [stageNameInputValue, setStageNameInputValue] = React.useState('');
  const [groupNameSuggestions, setGroupNameSuggestions] = React.useState([]);
  const [groupNameInputValue, setGroupNameInputValue] = React.useState('');

  // Handler for season name autocomplete
  const handleSeasonNameChange = async (value) => {
    setSeasonNameInputValue(value);
    setNewSeasonForm(prev => ({ ...prev, name: value }));
    
    if (value && value.length >= 2) {
      try {
        const response = await api.getTermsByCategory(47, value); // 47 = Seasons Names
        if (response.success && response.data) {
          setSeasonNameSuggestions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch season name suggestions:', error);
      }
    } else {
      setSeasonNameSuggestions([]);
    }
  };

  // Handler for stage name autocomplete
  const handleStageNameChange = async (value) => {
    setStageNameInputValue(value);
    setNewStageForm(prev => ({ ...prev, name: value }));
    
    if (value && value.length >= 2) {
      try {
        const response = await api.getTermsByCategory(48, value); // 48 = Stages Names
        if (response.success && response.data) {
          setStageNameSuggestions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stage name suggestions:', error);
      }
    } else {
      setStageNameSuggestions([]);
    }
  };

  // Handler for group name autocomplete
  const handleGroupNameChange = async (value) => {
    setGroupNameInputValue(value);
    setNewGroupForm(prev => ({ ...prev, name: value }));
    
    if (value && value.length >= 2) {
      try {
        const response = await api.getTermsByCategory(49, value); // 49 = Groups Names
        if (response.success && response.data) {
          setGroupNameSuggestions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch group name suggestions:', error);
      }
    } else {
      setGroupNameSuggestions([]);
    }
  };
  const [seasonNameTermsDialogOpen, setSeasonNameTermsDialogOpen] = React.useState(false);
  const [stageNameTermsDialogOpen, setStageNameTermsDialogOpen] = React.useState(false);
  const [seasonNameTermId, setSeasonNameTermId] = React.useState(null);
  const [stageNameTermId, setStageNameTermId] = React.useState(null);
  const [selectedStageForTerms, setSelectedStageForTerms] = React.useState(null);
  const [groupNameTermsDialogOpen, setGroupNameTermsDialogOpen] = React.useState(false);
  const [groupNameTermId, setGroupNameTermId] = React.useState(null);
  const [selectedGroupForTerms, setSelectedGroupForTerms] = React.useState(null);
  const [manageStandingsDialogOpen, setManageStandingsDialogOpen] = React.useState(false);
  const [manageStandingsTabValue, setManageStandingsTabValue] = React.useState(0);
  
  // Demo destinations data
  const [destinations, setDestinations] = React.useState([
    {
      id: 1,
      color: '#00bcd4',
      name: 'Round of 16',
      dNum: 1,
      dTypeId: 0,
      dType: 'Unknown',
      tableType: 'Regular',
      groupNum: 1,
      fromPosition: 1,
      toPosition: 2
    },
    {
      id: 2,
      color: '#00bcd4',
      name: 'UEFA Europa League',
      dNum: 2,
      dTypeId: 9,
      dType: 'ContinentalSecondaryCup',
      tableType: 'Regular',
      groupNum: 1,
      fromPosition: 3,
      toPosition: 3
    }
  ]);

  // Demo standings table data
  const initialStandingsData = [
    {
      id: 110,
      division: 1,
      description: 4,
      name: 'Manchester City',
      group: 1,
      position: 1,
      played: 6,
      wins: 4,
      draws: 0,
      losses: 2,
      goalsFor: 18,
      goalsAgainst: 10,
      goalDifference: 8,
      points: 12,
      percentage: 66
    },
    {
      id: 480,
      division: 1,
      description: 18,
      name: 'PSG',
      group: 1,
      position: 2,
      played: 6,
      wins: 3,
      draws: 2,
      losses: 1,
      goalsFor: 13,
      goalsAgainst: 8,
      goalDifference: 5,
      points: 11,
      percentage: 50
    },
    {
      id: 7171,
      division: 2,
      description: 32,
      name: 'RB Leipzig',
      group: 1,
      position: 3,
      played: 6,
      wins: 2,
      draws: 1,
      losses: 3,
      goalsFor: 15,
      goalsAgainst: 14,
      goalDifference: 1,
      points: 7,
      percentage: 33
    },
    {
      id: 1169,
      division: 1,
      description: 26,
      name: 'Club Brugge',
      group: 1,
      position: 4,
      played: 6,
      wins: 1,
      draws: 1,
      losses: 4,
      goalsFor: 6,
      goalsAgainst: 20,
      goalDifference: -14,
      points: 4,
      percentage: 16
    }
  ];

  const [standingsData, setStandingsData] = React.useState(initialStandingsData);
  const [savedStandingsData, setSavedStandingsData] = React.useState(initialStandingsData);
  const [hasStandingsChanges, setHasStandingsChanges] = React.useState(false);
  const [deleteStandingsDialogOpen, setDeleteStandingsDialogOpen] = React.useState(false);
  
  // State for competitors management
  const [inSeasonCompetitorsList, setInSeasonCompetitorsList] = React.useState([]);
  const [notInSeasonCompetitorsList, setNotInSeasonCompetitorsList] = React.useState([]);
  const [loadingCompetitors, setLoadingCompetitors] = React.useState(false);

  // Function to delete destination row
  const handleDeleteDestination = (id) => {
    setDestinations(prev => prev.filter(dest => dest.id !== id));
  };
  
  // Load competitors when season is selected
  React.useEffect(() => {
    const loadCompetitors = async () => {
      if (!selectedSeasonId || !competitionId || !selectedSeason) {
        setInSeasonCompetitorsList([]);
        setNotInSeasonCompetitorsList([]);
        return;
      }

      try {
        setLoadingCompetitors(true);
        
        // Extract season number from selectedSeason
        const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
        
        if (!seasonNum) {
          console.error('Season number not found');
          return;
        }

        // Load competitors in season and not in season in parallel
        const [inSeasonResponse, notInSeasonResponse] = await Promise.all([
          api.getCompetitorsBySeason(competitionId, seasonNum),
          api.getCompetitorsNotInSeason(competitionId, seasonNum)
        ]);

        if (inSeasonResponse.success && inSeasonResponse.data) {
          setInSeasonCompetitorsList(inSeasonResponse.data);
        }

        if (notInSeasonResponse.success && notInSeasonResponse.data) {
          setNotInSeasonCompetitorsList(notInSeasonResponse.data);
        }
      } catch (error) {
        console.error('Failed to load competitors:', error);
        setInSeasonCompetitorsList([]);
        setNotInSeasonCompetitorsList([]);
      } finally {
        setLoadingCompetitors(false);
      }
    };

    loadCompetitors();
  }, [selectedSeasonId, competitionId, selectedSeason]);

  // Load groups competitors when stage is selected
  const loadGroupsCompetitors = React.useCallback(async () => {
    if (!selectedStageId || !competitionId || !selectedSeason) {
      setCompetitorsInGroups([]);
      setCompetitorsNotInGroups([]);
      return;
    }

    try {
      const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
      const stageNum = stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum;
      
      if (!seasonNum || !stageNum) {
        return;
      }

      const [inGroupsResponse, notInGroupsResponse] = await Promise.all([
        api.getCompetitorsInGroups(competitionId, seasonNum, stageNum),
        api.getCompetitorsNotInGroups(competitionId, seasonNum, stageNum)
      ]);

      if (inGroupsResponse.success && inGroupsResponse.data) {
        setCompetitorsInGroups(inGroupsResponse.data);
      }

      if (notInGroupsResponse.success && notInGroupsResponse.data) {
        setCompetitorsNotInGroups(notInGroupsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load groups competitors:', error);
    }
  }, [selectedStageId, competitionId, selectedSeason, stages]);

  React.useEffect(() => {
    loadGroupsCompetitors();
  }, [loadGroupsCompetitors]);

  // Function to add competitors to season
  const handleAddCompetitorsToSeason = async () => {
    if (!selectedSeasonId || !competitionId || !selectedSeason) {
      return;
    }

    const competitorsToAdd = notInSeasonCompetitorsList.filter(c => selectedNotInSeason.includes(c.id));
    
    if (competitorsToAdd.length === 0) {
      return;
    }

    try {
      const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
      const competitorIds = competitorsToAdd.map(c => c.id);
      
      await api.addCompetitorsToSeason(competitionId, seasonNum, competitorIds);
      
      // Update local state
      setInSeasonCompetitorsList(prev => [...prev, ...competitorsToAdd]);
      setNotInSeasonCompetitorsList(prev => prev.filter(c => !selectedNotInSeason.includes(c.id)));
      
      setSelectedNotInSeason([]);
      setHasStructureChanges(true);
      
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Competitors added to season successfully!');
        setUpdateSnackbarType('success');
        setUpdateSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to add competitors to season:', error);
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Failed to add competitors to season. Please try again.');
        setUpdateSnackbarType('error');
        setUpdateSnackbarOpen(true);
      }
    }
  };
  
  // Function to remove competitors from season
  const handleRemoveCompetitorsFromSeason = async () => {
    if (!selectedSeasonId || !competitionId || !selectedSeason) {
      return;
    }

    const competitorsToRemove = inSeasonCompetitorsList.filter(c => selectedInSeason.includes(c.id));
    
    if (competitorsToRemove.length === 0) {
      return;
    }

    try {
      const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
      const competitorIds = competitorsToRemove.map(c => c.id);
      
      await api.removeCompetitorsFromSeason(competitionId, seasonNum, competitorIds);
      
      // Update local state
      setNotInSeasonCompetitorsList(prev => [...prev, ...competitorsToRemove]);
      setInSeasonCompetitorsList(prev => prev.filter(c => !selectedInSeason.includes(c.id)));
      
      setSelectedInSeason([]);
      setHasStructureChanges(true);
      
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Competitors removed from season successfully!');
        setUpdateSnackbarType('success');
        setUpdateSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to remove competitors from season:', error);
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Failed to remove competitors from season. Please try again.');
        setUpdateSnackbarType('error');
        setUpdateSnackbarOpen(true);
      }
    }
  };

  // Function to handle status change for a competitor
  const handleStatusChange = (competitorId, status) => {
    setInSeasonCompetitorsList(prev => 
      prev.map(competitor => 
        competitor.id === competitorId 
          ? { ...competitor, status: status || undefined }
          : competitor
      )
    );
    setHasStructureChanges(true);
  };

  // Function to extract competitors from games connected to season and add them to season
  // This extracts all unique competitors from games that were connected to the season via "Connect Games To Season"
  const extractCompetitorsFromGames = async () => {
    if (!selectedSeasonId || !competitionId || !selectedSeason) {
      return;
    }

    try {
      // TODO: Get all games connected to this season
      // This is a placeholder - the actual implementation should:
      // 1. Query games that are connected to this season (via handleConnectGamesToSeason)
      // 2. Extract all unique competitor IDs from those games (HOME_TEAM_ID, AWAY_TEAM_ID, etc.)
      // 3. Find those competitors in the NOT IN SEASON list
      // 4. Add them to the IN SEASON list
      
      // Placeholder logic - replace with actual game query logic:
      // const games = await api.getGamesBySeason(competitionId, seasonNum);
      // const competitorIdsFromGames = new Set();
      // games.forEach(game => {
      //   if (game.HOME_TEAM_ID) competitorIdsFromGames.add(game.HOME_TEAM_ID);
      //   if (game.AWAY_TEAM_ID) competitorIdsFromGames.add(game.AWAY_TEAM_ID);
      //   // Add other competitor fields if they exist
      // });
      
      // For now, this is just a placeholder that demonstrates the structure
      const competitorIdsFromGames = new Set(); // This should be populated from actual games
      
      // Find competitors from games that are in the NOT IN SEASON list
      const competitorsToAdd = notInSeasonCompetitorsList.filter(c => 
        competitorIdsFromGames.has(c.id)
      );
      
      if (competitorsToAdd.length === 0) {
        return {
          success: true,
          added: 0,
          message: 'No new competitors found in games connected to this season.'
        };
      }

      const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
      const competitorIds = competitorsToAdd.map(c => c.id);
      
      // Add competitors to season via API
      await api.addCompetitorsToSeason(competitionId, seasonNum, competitorIds);
      
      // Update local state - move from NOT IN SEASON to IN SEASON
      setInSeasonCompetitorsList(prev => [...prev, ...competitorsToAdd]);
      setNotInSeasonCompetitorsList(prev => 
        prev.filter(c => !competitorIds.includes(c.id))
      );
      
      setHasStructureChanges(true);
      
      return {
        success: true,
        added: competitorsToAdd.length,
        message: `Successfully added ${competitorsToAdd.length} competitor(s) from games to season.`
      };
    } catch (error) {
      console.error('Failed to extract competitors from games:', error);
      throw error;
    }
  };

  // Function to identify teams and assign statuses (Promoted, Relegated, Host)
  // This is a generic placeholder - the actual logic will be implemented based on business rules
  const identifyAndAssignStatuses = () => {
    if (!selectedSeason || !inSeasonCompetitorsList.length) {
      return;
    }

    // TODO: Implement the actual logic to identify which teams should get which statuses
    // For now, this is a placeholder that demonstrates the structure
    // The actual implementation should:
    // 1. Compare with previous season to identify promoted/relegated teams
    // 2. Identify host teams based on business rules
    // 3. Update the statuses accordingly
    
    const updatedCompetitors = inSeasonCompetitorsList.map(competitor => {
      // Placeholder logic - replace with actual identification logic
      // This is just for demonstration - the real logic should be implemented here
      let newStatus = competitor.status; // Keep existing status by default
      
      // Example placeholder logic (replace with actual logic):
      // if (isPromotedTeam(competitor)) {
      //   newStatus = 'Promoted';
      // } else if (isRelegatedTeam(competitor)) {
      //   newStatus = 'Relegated';
      // } else if (isHostTeam(competitor)) {
      //   newStatus = 'Host';
      // }
      
      return { ...competitor, status: newStatus };
    });

    // Update the state with new statuses
    setInSeasonCompetitorsList(updatedCompetitors);
    setHasStructureChanges(true);
    
    return updatedCompetitors;
  };

  // Function to remove competitors from all seasons
  const handleRemoveFromAllSeasons = async () => {
    if (!selectedSeasonId || !competitionId || !selectedSeason) {
      return;
    }

    // Get all selected competitors from both lists
    const selectedCompetitors = [
      ...inSeasonCompetitorsList.filter(c => selectedInSeason.includes(c.id)),
      ...notInSeasonCompetitorsList.filter(c => selectedNotInSeason.includes(c.id))
    ];
    
    if (selectedCompetitors.length === 0) {
      return;
    }

    try {
      const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
      const competitorIds = selectedCompetitors.map(c => c.id);
      
      // Remove from current season
      await api.removeCompetitorsFromSeason(competitionId, seasonNum, competitorIds);
      
      // Update local state
      setInSeasonCompetitorsList(prev => prev.filter(c => !selectedInSeason.includes(c.id)));
      setNotInSeasonCompetitorsList(prev => prev.filter(c => !selectedNotInSeason.includes(c.id)));
      
      // Clear selections
      setSelectedInSeason([]);
      setSelectedNotInSeason([]);
      
      setHasStructureChanges(true);
      
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Competitors removed from season successfully!');
        setUpdateSnackbarType('success');
        setUpdateSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to remove competitors from season:', error);
      if (setUpdateSnackbarMsg) {
        setUpdateSnackbarMsg('Failed to remove competitors from season. Please try again.');
        setUpdateSnackbarType('error');
        setUpdateSnackbarOpen(true);
      }
    }
  };

  // Function to update standings data
  const handleStandingsDataChange = (teamId, field, value) => {
    setStandingsData(prev => prev.map(team => 
      team.id === teamId ? { ...team, [field]: parseInt(value) || 0 } : team
    ));
  };

  // Function to save standings data
  const handleSaveStandings = () => {
    setSavedStandingsData(standingsData);
    setHasStandingsChanges(false);
  };

  // Function to reset standings data
  const handleResetStandings = () => {
    setStandingsData(savedStandingsData);
    setHasStandingsChanges(false);
  };

  // Function to recalculate standings by games
  const handleRecalculateByGames = () => {
    // TODO: Implement recalculation logic based on actual games
    console.log('Recalculating standings by games...');
  };

  // Function to delete standings table
  const handleDeleteStandings = () => {
    // Set HAS TABLE to false for the current stage
    if (selectedStageId && selectedSeasonId) {
      setSeasons(prev => prev.map(season => {
        if (season.id === selectedSeasonId) {
          return {
            ...season,
            stages: season.stages.map(stage => 
              stage.id === selectedStageId 
                ? { ...stage, hasTable: false }
                : stage
            )
          };
        }
        return season;
      }));
      setHasStructureChanges(true);
    }
    
    // Close the delete confirmation dialog
    setDeleteStandingsDialogOpen(false);
    
    // Close the manage standings dialog
    setManageStandingsDialogOpen(false);
  };

  // Check for standings changes
  React.useEffect(() => {
    const hasChanges = JSON.stringify(standingsData) !== JSON.stringify(savedStandingsData);
    setHasStandingsChanges(hasChanges);
  }, [standingsData, savedStandingsData]);
  
  // New season form state
  const [newSeasonForm, setNewSeasonForm] = React.useState({
    name: '',
    language: 'English',
    startDate: '',
    endDate: '',
    roundName: false,
    roundNameValue: '',
    setCurrentSeason: false,
    basedOnLastSeason: false
  });

  // New stage form state
  const [newStageForm, setNewStageForm] = React.useState({
    name: '',
    type: 'group',
    setCurrentStage: false,
    hasTable: false,
    preVisualBrackets: false,
    includeInBracket: false,
    isSeries: false,
    filterDivision: false,
    numOfGames: -1,
    connectedInBrackets: false,
    connectedToPreviousStage: false,
    phase: '',
    startDate: getDefaultDateTime(), // TODO: Load from DB - stage start date
    endDate: getDefaultDateTime()    // TODO: Load from DB - stage end date
  });

  // New group form state
  const [newGroupForm, setNewGroupForm] = React.useState({
    name: '',
    language: 'English',
    hasTable: false,
    toQualify: null,
    numOfGames: -1,
    isSeries: false,
    isFinal: false
  });

  // Generate stages form state
  const [generateStagesForm, setGenerateStagesForm] = React.useState({
    importFromSeason: null, // Selected season ID to import from
    // Templates
    leagueCycle: {
      enabled: false,
      hasTable: false,
      connectedToPreviousStage: false
    },
    groupStage: {
      enabled: false,
      numOfGroups: '',
      hasTable: false,
      useName: false,
      connectedToPreviousStage: false
    },
    bracketStage: {
      enabled: false,
      numOfCompetitors: '',
      isSeries: false,
      numOfGames: '',
      connectedToPreviousStage: false,
      connectedInBrackets: false,
      thirdPlaceGame: false
    }
  });

  // Function to calculate preview data
  const calculatePreview = React.useCallback(() => {
    if (!selectedSeasonId || !competitionId || !selectedSeason) {
      return null;
    }

    const previewStages = [];
    let totalGroups = 0;
    let totalGames = 0;
    let totalParticipants = 0;

    // Helper function to calculate bracket games
    const calculateBracketGames = (numCompetitors) => {
      if (!numCompetitors) return 0;
      const competitors = parseInt(numCompetitors);
      // For bracket: numCompetitors - 1 games (plus 1 for 3rd place if enabled)
      return competitors - 1;
    };

    // Helper function to calculate group games
    const calculateGroupGames = (numGroups, competitorsPerGroup = 4) => {
      if (!numGroups) return 0;
      const groups = parseInt(numGroups);
      // Round-robin: each group has n*(n-1)/2 games where n is competitors per group
      const gamesPerGroup = (competitorsPerGroup * (competitorsPerGroup - 1)) / 2;
      return groups * gamesPerGroup;
    };

    // Option 1: Import from previous season
    if (generateStagesForm.importFromSeason) {
      const sourceSeason = seasons.find(s => s.id === generateStagesForm.importFromSeason);
      if (sourceSeason && sourceSeason.stages && sourceSeason.stages.length > 0) {
        sourceSeason.stages.forEach((sourceStage, index) => {
          const stageGroups = sourceStage.groups || [];
          const stageGroupsCount = stageGroups.length;
          let stageGames = 0;
          let stageParticipants = 0;

          // Calculate games and participants for this stage
          if (sourceStage.type === 'group' || sourceStage.STAGE_TYPE === 1) {
            // Group stage: calculate based on groups
            stageGroups.forEach(group => {
              const competitorsInGroup = group.competitors?.length || 4; // Default 4 per group
              stageParticipants += competitorsInGroup;
              // Round-robin: n*(n-1)/2 games per group
              stageGames += (competitorsInGroup * (competitorsInGroup - 1)) / 2;
            });
            if (stageGroupsCount === 0) {
              // Default: 4 competitors per group, 8 groups
              stageParticipants = 32;
              stageGames = 8 * 6; // 8 groups * 6 games per group (4 competitors)
            }
          } else {
            // Knockout stage: calculate based on numOfGames or default
            stageGames = sourceStage.numOfGames || sourceStage.NUM_OF_GAMES || 0;
            if (stageGames === 0 || stageGames === -1) {
              // Default: 8 competitors = 7 games
              stageGames = 7;
              stageParticipants = 8;
            } else {
              stageParticipants = stageGames + 1;
            }
          }

          totalGroups += stageGroupsCount;
          totalGames += stageGames;
          totalParticipants += stageParticipants;

          previewStages.push({
            name: sourceStage.name,
            type: sourceStage.type || (sourceStage.STAGE_TYPE === 1 ? 'group' : 'knockout'),
            groups: stageGroupsCount,
            games: stageGames,
            participants: stageParticipants,
            groupsData: stageGroups.map((g, idx) => ({
              name: g.name || `Group ${idx + 1}`,
              participants: g.competitors?.length || 4,
              games: g.competitors ? (g.competitors.length * (g.competitors.length - 1)) / 2 : 6
            }))
          });
        });
      }
    }

    // Option 2: Templates
    // League Cycle
    if (generateStagesForm.leagueCycle.enabled) {
      const stageGames = 0; // League cycle doesn't have predefined games
      const stageParticipants = 0;
      previewStages.push({
        name: 'League Cycle',
        type: 'group',
        groups: 0,
        games: stageGames,
        participants: stageParticipants,
        groupsData: []
      });
      totalGames += stageGames;
      totalParticipants += stageParticipants;
    }

    // Group Stage
    if (generateStagesForm.groupStage.enabled && generateStagesForm.groupStage.numOfGroups) {
      const numGroups = parseInt(generateStagesForm.groupStage.numOfGroups);
      const competitorsPerGroup = 4; // Default
      const gamesPerGroup = (competitorsPerGroup * (competitorsPerGroup - 1)) / 2;
      const stageGames = numGroups * gamesPerGroup;
      const stageParticipants = numGroups * competitorsPerGroup;

      const groupsData = [];
      for (let i = 1; i <= numGroups; i++) {
        groupsData.push({
          name: `Group ${i}`,
          participants: competitorsPerGroup,
          games: gamesPerGroup
        });
      }

      totalGroups += numGroups;
      totalGames += stageGames;
      totalParticipants += stageParticipants;

      previewStages.push({
        name: 'Group Stage',
        type: 'group',
        groups: numGroups,
        games: stageGames,
        participants: stageParticipants,
        groupsData: groupsData
      });
    }

    // Bracket Stage
    if (generateStagesForm.bracketStage.enabled && generateStagesForm.bracketStage.numOfCompetitors) {
      const numCompetitors = parseInt(generateStagesForm.bracketStage.numOfCompetitors);
      let stageGames = calculateBracketGames(numCompetitors);
      if (generateStagesForm.bracketStage.thirdPlaceGame) {
        stageGames += 1; // Add 3rd place game
      }
      const stageParticipants = numCompetitors;

      totalGames += stageGames;
      totalParticipants += stageParticipants;

      previewStages.push({
        name: 'Bracket Stage',
        type: 'knockout',
        groups: 0,
        games: stageGames,
        participants: stageParticipants,
        groupsData: []
      });
    }

    return {
      stages: previewStages,
      summary: {
        totalStages: previewStages.length,
        totalGroups: totalGroups,
        totalGames: totalGames,
        totalParticipants: totalParticipants
      }
    };
  }, [generateStagesForm, selectedSeasonId, competitionId, selectedSeason, seasons]);

  // Update preview when form changes
  React.useEffect(() => {
    const preview = calculatePreview();
    setGenerateStagesPreview(preview);
  }, [calculatePreview]);

  // Table settings form state
  const [tableSettingsForm, setTableSettingsForm] = React.useState({
    winnerPoints: -1,
    drawPoints: -1,
    loserPoints: -1,
    winnerPointsAfterExtraTime: -1,
    loserPointsAfterExtraTime: -1,
    winnerPointsAfterPenalties: -1,
    loserPointsAfterPenalties: -1,
    orderBy: '',
    tableSupportInEven: false,
    countExtraTimeScore: true,
    countPenaltyScore: true,
  });

  // Order parameters state
  const [orderParameters, setOrderParameters] = React.useState([]);
  const [newOrderParameter, setNewOrderParameter] = React.useState({ field: '', direction: 'desc' });

  // Available order fields
  const availableOrderFields = [
    { value: 'points', label: 'Points' },
    { value: 'goalDifference', label: 'Goal Difference' },
    { value: 'headToHead', label: 'Head to Head' },
    { value: 'goalsFor', label: 'Goals For' },
    { value: 'goalsAgainst', label: 'Goals Against' },
    { value: 'awayGoals', label: 'Away Goals' },
    { value: 'yellowCards', label: 'Yellow Cards' },
    { value: 'redCards', label: 'Red Cards' },
    { value: 'wins', label: 'Wins' },
    { value: 'draws', label: 'Draws' },
    { value: 'losses', label: 'Losses' },
    { value: 'cleanSheets', label: 'Clean Sheets' },
    { value: 'goalsConceded', label: 'Goals Conceded' },
  ];

  // Date validation for seasons
  const isStartDateValid = !selectedSeason?.startDate || !selectedSeason?.endDate || 
    new Date(selectedSeason.startDate) <= new Date(selectedSeason.endDate);
  
  const isEndDateValid = !selectedSeason?.startDate || !selectedSeason?.endDate || 
    new Date(selectedSeason.startDate) <= new Date(selectedSeason.endDate);

  const getDateFieldError = (fieldType) => {
    if (!selectedSeason?.startDate || !selectedSeason?.endDate) return '';
    
    const startDate = new Date(selectedSeason.startDate);
    const endDate = new Date(selectedSeason.endDate);
    
    if (fieldType === 'start' && startDate > endDate) {
      return 'Start date cannot be after end date';
    }
    if (fieldType === 'end' && startDate > endDate) {
      return 'End date cannot be before start date';
    }
    return '';
  };

  const getTransfersWindowDateError = (fieldType) => {
    if (!comp) return '';
    
    const transfersStartDate = comp.TRANSFERS_WINDOW_START_DATE ? new Date(comp.TRANSFERS_WINDOW_START_DATE) : null;
    const transfersEndDate = comp.TRANSFERS_WINDOW_END_DATE ? new Date(comp.TRANSFERS_WINDOW_END_DATE) : null;
    
    if (fieldType === 'start') {
      if (!transfersStartDate) return '';
      
      // Check if transfers start date is before transfers end date
      if (transfersEndDate && transfersStartDate > transfersEndDate) {
        return 'Transfers start date cannot be after end date';
      }
    }
    
    if (fieldType === 'end') {
      if (!transfersEndDate) return '';
      
      // Check if transfers end date is after transfers start date
      if (transfersStartDate && transfersEndDate < transfersStartDate) {
        return 'Transfers end date cannot be before start date';
      }
    }
    
    return '';
  };

  const handleTransfersWindowChange = (field, value) => {
    if (!comp || !setComp) return;
    
    setComp(prev => ({
      ...prev,
      [field]: value ? new Date(value).toISOString() : null
    }));
    setHasStructureChanges(true);
  };

  // Date validation for stages (New Stage Dialog)
  const isStageStartDateValid = !newStageForm.startDate || !newStageForm.endDate || 
    new Date(newStageForm.startDate) <= new Date(newStageForm.endDate);
  
  const isStageEndDateValid = !newStageForm.startDate || !newStageForm.endDate || 
    new Date(newStageForm.startDate) <= new Date(newStageForm.endDate);

  const getStageDateFieldError = (fieldType) => {
    if (!newStageForm.startDate || !newStageForm.endDate) return '';
    
    const startDate = new Date(newStageForm.startDate);
    const endDate = new Date(newStageForm.endDate);
    
    if (fieldType === 'start' && startDate > endDate) {
      return 'Start date cannot be after end date';
    }
    if (fieldType === 'end' && startDate > endDate) {
      return 'End date cannot be before start date';
    }
    return '';
  };

  // Date validation for existing stages (Stage Details)
  const getExistingStageDateFieldError = (fieldType) => {
    const selectedStage = stages.find(s => s.id === selectedStageId);
    if (!selectedStage?.startDate || !selectedStage?.endDate) return '';
    
    const startDate = new Date(selectedStage.startDate);
    const endDate = new Date(selectedStage.endDate);
    
    if (fieldType === 'start' && startDate > endDate) {
      return 'Start date cannot be after end date';
    }
    if (fieldType === 'end' && startDate > endDate) {
      return 'End date cannot be before start date';
    }
    return '';
  };

  const isExistingStageStartDateValid = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.startDate || !stage?.endDate) return true;
    return new Date(stage.startDate) <= new Date(stage.endDate);
  };

  const isExistingStageEndDateValid = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.startDate || !stage?.endDate) return true;
    return new Date(stage.startDate) <= new Date(stage.endDate);
  };



  // Function to change table type
  const handleTableTypeChange = (id, value) => {
    setDestinations(prev => prev.map(dest => dest.id === id ? { ...dest, tableType: value } : dest));
  };

  // 1. State for destination terms dialog
  const [destinationTermsDialogOpen, setDestinationTermsDialogOpen] = React.useState(false);
  const [destinationTermId, setDestinationTermId] = React.useState(null);
  const [selectedDestinationForTerms, setSelectedDestinationForTerms] = React.useState(null);

  // 2. Add destination row
  const handleAddDestination = () => {
    setDestinations(prev => [
      ...prev,
      {
        id: Date.now(),
        color: '#00bcd4',
        name: '',
        isNew: true,
        dNum: prev.length + 1,
        dType: 'Unknown',
        tableType: 'Regular',
        groupNum: 1,
        fromPosition: 1,
        toPosition: 1
      }
    ]);
  };

  // 3. Open terms dialog for destination
  const handleDestinationNameClick = (destination) => {
    setSelectedDestinationForTerms(destination);
    // TODO: Get NAME_ID from destination object when available
    setDestinationTermId(null); // For now, create new term
    setDestinationTermsDialogOpen(true);
  };

  return (
    <Box sx={{ width: '100%', p: 2, pb: 16, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}>
      {/* Seasons Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Seasons</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel shrink>Season Name</InputLabel>
            <Select
              value={selectedSeasonId}
              label="Season Name"
              onChange={e => setSelectedSeasonId(e.target.value)}
            >
              {seasons.map(season => (
                <MenuItem key={season.id} value={season.id}>
                  {`#${season.id} - ${season.name}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Season Name Terms Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              if (selectedSeason && selectedSeason.nameId) {
                // Check if term is in correct category before using it
                try {
                  const response = await api.getTerm(selectedSeason.nameId);
                  if (response.success && response.data && response.data.categoryId === 47) {
                    setSeasonNameTermId(selectedSeason.nameId);
                  } else {
                    setSeasonNameTermId(null); // Create new term if wrong category
                  }
                  setSeasonNameTermsDialogOpen(true);
                } catch (error) {
                  setSeasonNameTermId(null);
                  setSeasonNameTermsDialogOpen(true);
                }
              } else {
                setSeasonNameTermId(null); // Create new term if doesn't exist
                setSeasonNameTermsDialogOpen(true);
              }
            }}
            sx={{ minWidth: 40, px: 1 }}
          >
            ...
          </Button>
          
          {/* Action Buttons */}
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              if (!selectedSeason || !competitionId || !comp) return;
              
              // Update local state only (will be saved when user clicks SAVE)
              // Update local state
              setSeasons(prev => prev.map(season => ({
                ...season,
                isCurrent: season.id === selectedSeasonId
              })));
              
              // Update comp state
              if (setComp) {
                setComp(prev => ({
                  ...prev,
                  CURRENT_SEASON: selectedSeason.seasonNum
                }));
              }
              setHasStructureChanges(true);
              setUpdateSnackbarMsg('Current season will be saved when you click SAVE');
            }}
            disabled={selectedSeason?.isCurrent}
            sx={{ 
              minWidth: 120,
              bgcolor: selectedSeason?.isCurrent ? '#ccc' : '#1976d2',
              color: selectedSeason?.isCurrent ? '#666' : '#fff',
              '&:hover': {
                bgcolor: selectedSeason?.isCurrent ? '#ccc' : '#1565c0'
              }
            }}
          >
            {selectedSeason?.isCurrent ? 'Current Season' : 'Set as Current'}
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setNewSeasonDialogOpen(true);
              setSeasonNameInputValue('');
              setSeasonNameSuggestions([]);
            }}
            sx={{ 
              minWidth: 120,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            Create New
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={() => setDeleteSeasonDialogOpen(true)}
            disabled={selectedSeason?.isCurrent || (comp && comp.CURRENT_SEASON === selectedSeason?.seasonNum)}
            sx={{ 
              minWidth: 120,
              bgcolor: '#d32f2f',
              color: '#fff',
              '&:hover': {
                bgcolor: '#c62828'
              },
              '&:disabled': {
                bgcolor: '#ccc',
                color: '#666'
              }
            }}
          >
            Delete Season
          </Button>
        </Box>

        {/* Season Details */}
        {selectedSeason && (
          <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e0e0e0', borderRadius: 2, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#2d3843' }}>
              Season Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={2}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                    Season Key
                  </Typography>
                  <TextField
                    size="small"
                    value={selectedSeason.seasonKey}
                    onChange={(e) => handleSeasonKeyChange(selectedSeason.id, e.target.value)}
                    placeholder="<Default>YYYY/YYYY"
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1976d2',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                    Start Date
                  </Typography>
                  <Tooltip title="All times are in UTC">
                    <TextField
                      size="small"
                      type="datetime-local"
                      value={formatDateTimeForInput(selectedSeason.startDate)}
                      onChange={(e) => handleSeasonStartDateChange(selectedSeason.id, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={!isStartDateValid}
                      helperText={getDateFieldError('start')}
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#d32f2f',
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          margin: '4px 0 0 0',
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                    End Date
                  </Typography>
                  <Tooltip title="All times are in UTC">
                    <TextField
                      size="small"
                      type="datetime-local"
                      value={formatDateTimeForInput(selectedSeason.endDate)}
                      onChange={(e) => handleSeasonEndDateChange(selectedSeason.id, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={!isEndDateValid}
                      helperText={getDateFieldError('end')}
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#d32f2f',
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          margin: '4px 0 0 0',
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                    &nbsp;
                  </Typography>
                  <Tooltip title="This action will connect all games that fall between these dates to the season">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (selectedSeason) {
                          handleConnectGamesToSeason({
                            seasonId: selectedSeason.id,
                            seasonKey: selectedSeason.seasonKey,
                            startDate: selectedSeason.startDate,
                            endDate: selectedSeason.endDate
                          });
                        }
                      }}
                      sx={{
                        backgroundColor: '#fff',
                        color: '#1976d2',
                        borderColor: '#1976d2',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                          borderColor: '#1565c0',
                          color: '#1565c0',
                        },
                        minWidth: 'auto',
                        px: 2,
                        py: 1,
                        height: '40px',
                        width: '100%'
                      }}
                    >
                      Connect Games To Season
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
            
            {/* Season Configuration Checkboxes */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Season Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Use the season name in the competition title and description.">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.useName || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'useName', e.target.checked)}
                          name="useName"
                          color="primary"
                        />
                      }
                      label="Use Name"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
                                  <Grid item xs={12} sm={6} md={3} lg={2}>
                   <Tooltip title="Display players statistics in competition dashboard">
                     <FormControlLabel
                       control={
                         <Checkbox
                           checked={selectedSeason.seasonConfig?.showTopAthletes || false}
                           onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'showTopAthletes', e.target.checked)}
                           name="showTopAthletes"
                           color="primary"
                         />
                       }
                       label="Show Top Athletes"
                       sx={{ fontSize: '0.875rem' }}
                     />
                   </Tooltip>
                 </Grid>
                                  <Grid item xs={12} sm={6} md={3} lg={2}>
                   <Tooltip title="Display bruckets in competition standings tub">
                     <FormControlLabel
                       control={
                         <Checkbox
                           checked={selectedSeason.seasonConfig?.hasBrackets || false}
                           onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'hasBrackets', e.target.checked)}
                           name="hasBrackets"
                           color="primary"
                         />
                       }
                       label="Has Brackets"
                       sx={{ fontSize: '0.875rem' }}
                     />
                   </Tooltip>
                 </Grid>
                                  <Grid item xs={12} sm={6} md={3} lg={2}>
                   <Tooltip title="Display standings tab in competition dashboard">
                     <FormControlLabel
                       control={
                         <Checkbox
                           checked={selectedSeason.seasonConfig?.hasTable || false}
                           onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'hasTable', e.target.checked)}
                           name="hasTable"
                           color="primary"
                         />
                       }
                       label="Has Table"
                       sx={{ fontSize: '0.875rem' }}
                     />
                   </Tooltip>
                 </Grid>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Display an information card with details about the competition (e.g., rules, organizers).">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.hasInfoCard || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'hasInfoCard', e.target.checked)}
                          name="hasInfoCard"
                          color="primary"
                        />
                      }
                      label="Has Info Card"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>

                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Include a seeding system for teams (e.g., Group A, Group B).">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.hasSeed || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'hasSeed', e.target.checked)}
                          name="hasSeed"
                          color="primary"
                        />
                      }
                      label="Has Seed"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Show the 'Top Teams' tab in the competition overview.">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.showTopTeamsTab || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'showTopTeamsTab', e.target.checked)}
                          name="showTopTeamsTab"
                          color="primary"
                        />
                      }
                      label="Show Top Teams Tab"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Show the 'Outrights' tab in the competition overview.">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.showOutrightsTab || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'showOutrightsTab', e.target.checked)}
                          name="showOutrightsTab"
                          color="primary"
                        />
                      }
                      label="Show Outrights Tab"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Present competition tiebreakers in standings">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.presentCompetitionRules || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'presentCompetitionRules', e.target.checked)}
                          name="presentCompetitionRules"
                          color="primary"
                        />
                      }
                      label="Present Competition Rules"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                  <Tooltip title="Display match schedules and results in the competition overview.">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSeason.seasonConfig?.showMatches || false}
                          onChange={(e) => handleSeasonConfigChangeLocal(selectedSeason.id, 'showMatches', e.target.checked)}
                          name="showMatches"
                          color="primary"
                        />
                      }
                      label="Show Matches"
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </Tooltip>
                </Grid>
              </Grid>
              
              {/* Transfers Window Section */}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                  Transfers Window
                </Typography>
                <Grid container spacing={0}>
                  <Grid item xs={12} md={3} sx={{ pr: 0.5 }}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, color: '#2d3843' }}>
                        Start Date
                      </Typography>
                      <Tooltip title="All times are in UTC">
                        <TextField
                          size="small"
                          type="datetime-local"
                          value={formatDateTimeForInput(comp?.TRANSFERS_WINDOW_START_DATE || '')}
                          onChange={(e) => handleTransfersWindowChange('TRANSFERS_WINDOW_START_DATE', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          error={!!getTransfersWindowDateError('start')}
                          helperText={getTransfersWindowDateError('start')}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d0d0d0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#1976d2',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#1976d2',
                              },
                            },
                          }}
                        />
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, color: '#2d3843' }}>
                        End Date
                      </Typography>
                      <Tooltip title="All times are in UTC">
                        <TextField
                          size="small"
                          type="datetime-local"
                          value={formatDateTimeForInput(comp?.TRANSFERS_WINDOW_END_DATE || '')}
                          onChange={(e) => handleTransfersWindowChange('TRANSFERS_WINDOW_END_DATE', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          error={!!getTransfersWindowDateError('end')}
                          helperText={getTransfersWindowDateError('end')}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d0d0d0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#1976d2',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#1976d2',
                              },
                            },
                          }}
                        />
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
            
            {/* Table Settings and Info Card Buttons */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Load table settings from selectedSeason (which comes from DB)
                  // Priority: tableSettings (from loaded data) > TABLE_* (direct from DB) > defaults
                  const seasonTableSettings = selectedSeason?.tableSettings || {};
                  setTableSettingsForm({
                    winnerPoints: seasonTableSettings.winnerPoints ?? selectedSeason?.TABLE_WINNER_POINTS ?? 3,
                    drawPoints: seasonTableSettings.drawPoints ?? selectedSeason?.TABLE_DRAW_POINTS ?? 1,
                    loserPoints: seasonTableSettings.loserPoints ?? selectedSeason?.TABLE_LOSER_POINTS ?? 0,
                    winnerPointsAfterExtraTime: seasonTableSettings.winnerPointsAfterExtraTime ?? -1,
                    loserPointsAfterExtraTime: seasonTableSettings.loserPointsAfterExtraTime ?? -1,
                    winnerPointsAfterPenalties: seasonTableSettings.winnerPointsAfterPenalties ?? -1,
                    loserPointsAfterPenalties: seasonTableSettings.loserPointsAfterPenalties ?? -1,
                    orderBy: seasonTableSettings.orderBy || '',
                    tableSupportInEven: seasonTableSettings.isEvenExists ?? selectedSeason?.TABLE_IS_EVEN_EXISTS ?? false,
                    countExtraTimeScore: seasonTableSettings.countExtraTimeScore ?? selectedSeason?.TABLE_COUNT_ET_SCORE ?? false,
                    countPenaltyScore: seasonTableSettings.countPenaltyScore ?? selectedSeason?.TABLE_COUNT_PEN_SCORE ?? false,
                  });
                  setOrderParameters(seasonTableSettings.orderParameters || []); // Load existing order parameters
                  setNewOrderParameter({ field: '', direction: 'desc' }); // Reset new parameter form
                  setTableSettingsDialogOpen(true);
                }}
                sx={{ 
                  minWidth: 140,
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': { 
                    borderColor: '#1565c0',
                    bgcolor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                Table Settings
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // TODO: Open Info Card dialog
                  console.log('Info Card button clicked');
                }}
                disabled={!selectedSeason?.seasonConfig?.hasInfoCard || !savedSeasonConfigs.has(selectedSeason.id)}
                sx={{ 
                  minWidth: 140,
                  borderColor: (selectedSeason?.seasonConfig?.hasInfoCard && savedSeasonConfigs.has(selectedSeason.id)) ? '#1976d2' : '#ccc',
                  color: (selectedSeason?.seasonConfig?.hasInfoCard && savedSeasonConfigs.has(selectedSeason.id)) ? '#1976d2' : '#666',
                  '&:hover': { 
                    borderColor: (selectedSeason?.seasonConfig?.hasInfoCard && savedSeasonConfigs.has(selectedSeason.id)) ? '#1565c0' : '#ccc',
                    bgcolor: (selectedSeason?.seasonConfig?.hasInfoCard && savedSeasonConfigs.has(selectedSeason.id)) ? 'rgba(25, 118, 210, 0.04)' : 'transparent'
                  },
                  '&:disabled': {
                    borderColor: '#ccc',
                    color: '#666'
                  }
                }}
              >
                Info Card
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Season Competitors Management */}
      {selectedSeasonId && (
        <CompetitorsManager
          inSeasonCompetitors={inSeasonCompetitorsList}
          notInSeasonCompetitors={notInSeasonCompetitorsList}
          selectedInSeason={selectedInSeason}
          selectedNotInSeason={selectedNotInSeason}
          onInSeasonSelectionChange={setSelectedInSeason}
          onNotInSeasonSelectionChange={setSelectedNotInSeason}
          onAddCompetitors={handleAddCompetitorsToSeason}
          onRemoveCompetitors={handleRemoveCompetitorsFromSeason}
          onRemoveFromAllSeasons={handleRemoveFromAllSeasons}
          onStatusChange={handleStatusChange}
          onSeedChange={(competitorId, seed) => {
            // Handle seed change
            console.log('Seed change:', competitorId, seed);
          }}
          onNotInChange={(competitorId, notIn) => {
            // Handle not in change
            console.log('Not in change:', competitorId, notIn);
          }}
          competitionId={competitionId}
          seasonNum={selectedSeason?.SEASON_NUM || selectedSeason?.seasonNum}
          sportType={comp?.SPORT_TYPE_ID ? (comp.SPORT_TYPE_ID === 1 ? 'Football' : 'Basketball') : undefined}
          onExtractCompetitorsFromGames={extractCompetitorsFromGames}
          onIdentifyAndAssignStatuses={identifyAndAssignStatuses}
          setUpdateSnackbarMsg={setUpdateSnackbarMsg}
          setUpdateSnackbarType={setUpdateSnackbarType}
          setUpdateSnackbarOpen={setUpdateSnackbarOpen}
          selectedSeason={selectedSeason}
        />
      )}

        {/* Stages Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Stages</Typography>
            
                      {/* Action Buttons */}
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              // Set current stage logic
              if (selectedSeasonId) {
                setSeasons(prev => prev.map(season => {
                  if (season.id === selectedSeasonId) {
                    return {
                      ...season,
                      stages: season.stages.map(stage => ({
                        ...stage,
                        isCurrent: stage.id === selectedStageId
                      }))
                    };
                  }
                  return season;
                }));
                setHasStructureChanges(true);
              }
            }}
            disabled={stages.find(s => s.id === selectedStageId)?.isCurrent}
            sx={{ 
              minWidth: 120,
              bgcolor: stages.find(s => s.id === selectedStageId)?.isCurrent ? '#ccc' : '#1976d2',
              color: stages.find(s => s.id === selectedStageId)?.isCurrent ? '#666' : '#fff',
              '&:hover': {
                bgcolor: stages.find(s => s.id === selectedStageId)?.isCurrent ? '#ccc' : '#1565c0'
              }
            }}
          >
            {stages.find(s => s.id === selectedStageId)?.isCurrent ? 'Current Stage' : 'Set as Current'}
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setNewStageDialogOpen(true);
              setStageNameInputValue('');
              setStageNameSuggestions([]);
            }}
            sx={{ 
              minWidth: 120,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            Create New
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={() => setDeleteStageDialogOpen(true)}
            disabled={(() => {
              const stage = stages.find(s => s.id === selectedStageId);
              if (!stage || !selectedSeason) return false;
              return stage.isCurrent || 
                     (comp && comp.CURRENT_STAGE === stage.stageNum && 
                      comp.CURRENT_SEASON === selectedSeason.seasonNum);
            })()}
            sx={{ 
              minWidth: 120,
              bgcolor: '#d32f2f',
              color: '#fff',
              '&:hover': {
                bgcolor: '#c62828'
              },
              '&:disabled': {
                bgcolor: '#ccc',
                color: '#666'
              }
            }}
          >
            Delete Stage
          </Button>
          
          {/* Additional Stage Action Buttons */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setGenerateStagesDialogOpen(true);
            }}
            sx={{ 
              minWidth: 120,
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': { 
                borderColor: '#1565c0',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Generate
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              // TODO: Implement Phases functionality
              console.log('Phases clicked');
            }}
            sx={{ 
              minWidth: 120,
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': { 
                borderColor: '#1565c0',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Phases
          </Button>
          </Box>
          
                    {/* Stages Table */}
          <Box sx={{ mb: 3 }}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                      <Tooltip title="Stage order" placement="top" arrow>
                        <span>Order</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
                      <Tooltip title="Display name of the competition stage" placement="top" arrow>
                        <span>Name</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                      <Tooltip title="Type of stage: Group (round-robin) or Knockout (elimination)" placement="top" arrow>
                        <span>Type</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                      <Tooltip title="Display standings table for this stage" placement="top" arrow>
                        <span>Has Table</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
                      <Tooltip title="Number of games to be played in this stage (-1 for unlimited)" placement="top" arrow>
                        <span>Number Of Games</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                      <Tooltip title="Treat this stage as a series of matches between teams" placement="top" arrow>
                        <span>Is Series</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
                      <Tooltip title="Connect this stage to the previous stage in bracket progression" placement="top" arrow>
                        <span>Connected To Previous Stage</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 100, borderRight: '3px solid #d0d0d0', textAlign: 'center' }}>
                      <Tooltip title="Filter teams by division/league in this stage" placement="top" arrow>
                        <span>Filter Division</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
                      <Tooltip title="Include this stage in the bracket visualization" placement="top" arrow>
                        <span>Include in bracket</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
                      <Tooltip title="Show bracket preview before stage begins" placement="top" arrow>
                        <span>Pre Visual Brackets</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 140, borderRight: '3px solid #d0d0d0', textAlign: 'center' }}>
                      <Tooltip title="Connect teams within brackets for this stage" placement="top" arrow>
                        <span>Connected In Brackets</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
                      <Tooltip title="Competition phase: Group, Knockout, or Final" placement="top" arrow>
                        <span>Phase</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stages.map((stage, idx) => (
                    <TableRow
                      key={stage.id}
                      sx={{
                        backgroundColor: selectedStageId === stage.id ? '#ffebee' : stage.isCurrent ? '#e8f5e8' : '#fff',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: selectedStageId === stage.id ? '#ffcdd2' : '#f5f5f5'
                        }
                      }}
                      onClick={() => setSelectedStageId(stage.id)}
                    >
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <span style={{ fontWeight: 600 }}>{idx + 1}</span>
                          <Box
                            sx={{
                              cursor: 'grab',
                              color: '#666',
                              '&:hover': { color: '#1976d2' }
                            }}
                          >
                            <DragIndicatorIcon fontSize="small" />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, textAlign: 'center' }}>
                        <Box
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedStageForTerms(stage);
                            if (stage.nameId) {
                              // Check if term is in correct category before using it
                              try {
                                const response = await api.getTerm(stage.nameId);
                                if (response.success && response.data && response.data.categoryId === 48) {
                                  setStageNameTermId(stage.nameId);
                                } else {
                                  setStageNameTermId(null); // Create new term if wrong category
                                }
                                setStageNameTermsDialogOpen(true);
                              } catch (error) {
                                setStageNameTermId(null);
                                setStageNameTermsDialogOpen(true);
                              }
                            } else {
                              setStageNameTermId(null); // Create new term if doesn't exist
                              setStageNameTermsDialogOpen(true);
                            }
                          }}
                          sx={{
                            cursor: 'pointer',
                            color: '#1976d2',
                            textDecoration: 'underline',
                            '&:hover': {
                              color: '#1565c0'
                            }
                          }}
                        >
                          {stage.name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            backgroundColor: stage.type === 'group' ? '#e8f5e8' : '#fff3e0',
                            color: stage.type === 'group' ? '#2e7d32' : '#f57c00',
                            display: 'inline-block'
                          }}
                        >
                          {stage.type}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.hasTable}
                          onChange={(e) => handleStageParameterChange(stage.id, 'hasTable', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <TextField
                          type="number"
                          value={stage.numOfGames}
                          onChange={(e) => handleStageParameterChange(stage.id, 'numOfGames', parseInt(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          sx={{ width: 80 }}
                          inputProps={{ min: -1 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.isSeries}
                          onChange={(e) => handleStageParameterChange(stage.id, 'isSeries', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.connectedToPreviousStage}
                          onChange={(e) => handleStageParameterChange(stage.id, 'connectedToPreviousStage', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ borderRight: '3px solid #d0d0d0', textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.filterDivision}
                          onChange={(e) => handleStageParameterChange(stage.id, 'filterDivision', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.includeInBracket}
                          onChange={(e) => handleStageParameterChange(stage.id, 'includeInBracket', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.preVisualBrackets}
                          onChange={(e) => handleStageParameterChange(stage.id, 'preVisualBrackets', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ borderRight: '3px solid #d0d0d0', textAlign: 'center' }}>
                        <Checkbox
                          checked={stage.connectedInBrackets}
                          onChange={(e) => handleStageParameterChange(stage.id, 'connectedInBrackets', e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={stage.phase}
                            onChange={(e) => handleStageParameterChange(stage.id, 'phase', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            displayEmpty
                          >
                            <MenuItem value="">Not Selected</MenuItem>
                            <MenuItem value="group">Group</MenuItem>
                            <MenuItem value="knockout">Knockout</MenuItem>
                            <MenuItem value="final">Final</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

        {/* Stage Details - Edit selected stage */}
        {selectedStageId && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e0e0e0', borderRadius: 2, p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#2d3843' }}>
                Stage Details: {stages.find(s => s.id === selectedStageId)?.name}
              </Typography>
              
              <Grid container spacing={2}>
                {/* Stage Name */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                      Stage Name
                    </Typography>
                    <TextField
                      size="small"
                      value={stages.find(s => s.id === selectedStageId)?.name || ''}
                      onChange={(e) => handleStageParameterChange(selectedStageId, 'name', e.target.value)}
                      placeholder="Enter stage name"
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                        },
                      }}
                    />
                  </Box>
                </Grid>

                {/* Stage Type */}
                <Grid item xs={12} sm={6} md={2}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                      Stage Type
                    </Typography>
                    <FormControl size="small" sx={{ width: '100%' }}>
                      <Select
                        value={stages.find(s => s.id === selectedStageId)?.type || 'group'}
                        onChange={(e) => handleStageParameterChange(selectedStageId, 'type', e.target.value)}
                        sx={{
                          backgroundColor: '#fff',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e0e0e0',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                        }}
                      >
                        <MenuItem value="group">Group</MenuItem>
                        <MenuItem value="knockout">Knockout</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Phase */}
                <Grid item xs={12} sm={6} md={2}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                      Phase
                    </Typography>
                    <FormControl size="small" sx={{ width: '100%' }}>
                      <Select
                        value={stages.find(s => s.id === selectedStageId)?.phase || ''}
                        onChange={(e) => handleStageParameterChange(selectedStageId, 'phase', e.target.value)}
                        displayEmpty
                        sx={{
                          backgroundColor: '#fff',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e0e0e0',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                        }}
                      >
                        <MenuItem value="">Not Selected</MenuItem>
                        <MenuItem value="group">Group</MenuItem>
                        <MenuItem value="knockout">Knockout</MenuItem>
                        <MenuItem value="final">Final</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Number Of Games */}
                <Grid item xs={12} sm={6} md={2}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                      Number Of Games
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={stages.find(s => s.id === selectedStageId)?.numOfGames || -1}
                      onChange={(e) => handleStageParameterChange(selectedStageId, 'numOfGames', parseInt(e.target.value) || -1)}
                      placeholder="-1 for unlimited"
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2',
                          },
                        },
                      }}
                      inputProps={{ min: -1 }}
                    />
                  </Box>
                </Grid>

                {/* Stage Dates */}
                <Grid item xs={12} sm={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                      Stage Dates
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Start Date
                        </Typography>
                        <Tooltip title="All times are in UTC">
                          <TextField
                            size="small"
                            type="datetime-local"
                            value={formatDateTimeForInput(stages.find(s => s.id === selectedStageId)?.startDate || '')}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'startDate', e.target.value)}
                            error={!isExistingStageStartDateValid(selectedStageId)}
                            helperText={getExistingStageDateFieldError('start')}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              width: '100%',
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#fff',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#1976d2',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#1976d2',
                                },
                                '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#d32f2f',
                                },
                              },
                              '& .MuiFormHelperText-root': {
                                margin: '4px 0 0 0',
                                fontSize: '0.75rem',
                              },
                            }}
                          />
                        </Tooltip>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          End Date
                        </Typography>
                        <Tooltip title="All times are in UTC">
                          <TextField
                            size="small"
                            type="datetime-local"
                            value={formatDateTimeForInput(stages.find(s => s.id === selectedStageId)?.endDate || '')}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'endDate', e.target.value)}
                            error={!isExistingStageEndDateValid(selectedStageId)}
                            helperText={getExistingStageDateFieldError('end')}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              width: '100%',
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#fff',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#1976d2',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#1976d2',
                                },
                                '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#d32f2f',
                                },
                              },
                              '& .MuiFormHelperText-root': {
                                margin: '4px 0 0 0',
                                fontSize: '0.75rem',
                              },
                            }}
                          />
                        </Tooltip>
                      </Box>
                      <Tooltip title="This action will connect all games that fall between these dates to the stage">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const selectedStage = stages.find(s => s.id === selectedStageId);
                            if (selectedStage) {
                              handleConnectGamesToStage({
                                stageId: selectedStage.id,
                                stageName: selectedStage.name,
                                startDate: selectedStage.startDate,
                                endDate: selectedStage.endDate
                              });
                            }
                          }}
                          sx={{
                            backgroundColor: '#fff',
                            color: '#1976d2',
                            borderColor: '#1976d2',
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                              borderColor: '#1565c0',
                              color: '#1565c0',
                            },
                            minWidth: 'auto',
                            px: 2,
                            py: 1,
                            height: '40px'
                          }}
                        >
                          Connect Games To Stage
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Stage Configuration Checkboxes */}
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                  Stage Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Display standings table for this stage">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.hasTable || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'hasTable', e.target.checked)}
                            name="hasTable"
                            color="primary"
                          />
                        }
                        label="Has Table"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Treat this stage as a series of matches between teams">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.isSeries || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'isSeries', e.target.checked)}
                            name="isSeries"
                            color="primary"
                          />
                        }
                        label="Is Series"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Connect this stage to the previous stage in bracket progression">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.connectedToPreviousStage || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'connectedToPreviousStage', e.target.checked)}
                            name="connectedToPreviousStage"
                            color="primary"
                          />
                        }
                        label="Connected To Previous Stage"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Filter teams by division/league in this stage">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.filterDivision || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'filterDivision', e.target.checked)}
                            name="filterDivision"
                            color="primary"
                          />
                        }
                        label="Filter Division"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Include this stage in the bracket visualization">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.includeInBracket || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'includeInBracket', e.target.checked)}
                            name="includeInBracket"
                            color="primary"
                          />
                        }
                        label="Include in bracket"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Show bracket preview before stage begins">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.preVisualBrackets || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'preVisualBrackets', e.target.checked)}
                            name="preVisualBrackets"
                            color="primary"
                          />
                        }
                        label="Pre Visual Brackets"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}>
                    <Tooltip title="Connect teams within brackets for this stage">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stages.find(s => s.id === selectedStageId)?.connectedInBrackets || false}
                            onChange={(e) => handleStageParameterChange(selectedStageId, 'connectedInBrackets', e.target.checked)}
                            name="connectedInBrackets"
                            color="primary"
                          />
                        }
                        label="Connected In Brackets"
                        sx={{ fontSize: '0.875rem' }}
                      />
                    </Tooltip>
                  </Grid>
                </Grid>
              </Box>
              
              {/* Stage Action Buttons - Manage Standings button */}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setManageStandingsDialogOpen(true)}
                  disabled={!stages.find(s => s.id === selectedStageId)?.hasTable || !savedTables.has(selectedStageId)}
                  sx={{ 
                    minWidth: 140,
                    bgcolor: (stages.find(s => s.id === selectedStageId)?.hasTable && savedTables.has(selectedStageId)) ? '#1976d2' : '#ccc',
                    color: (stages.find(s => s.id === selectedStageId)?.hasTable && savedTables.has(selectedStageId)) ? '#fff' : '#666',
                    '&:hover': { 
                      bgcolor: (stages.find(s => s.id === selectedStageId)?.hasTable && savedTables.has(selectedStageId)) ? '#1565c0' : '#ccc'
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                      color: '#666'
                    }
                  }}
                >
                  Manage Standings
                </Button>
              </Box>
            </Box>
          </Box>
        )}

      </Box>

      {/* Groups Competitors Management */}
      {selectedStageId && selectedSeasonId && (
        <GroupsCompetitorsManager
          groups={stageGroups}
          competitorsInGroups={competitorsInGroups}
          competitorsNotInGroups={competitorsNotInGroups}
          selectedInGroups={selectedInGroups}
          selectedNotInGroups={selectedNotInGroups}
          onInGroupsSelectionChange={(groupNum, ids) => {
            setSelectedInGroups(prev => ({
              ...prev,
              [groupNum]: ids
            }));
          }}
          onNotInGroupsSelectionChange={setSelectedNotInGroups}
          onAddGroup={() => setNewGroupDialogOpen(true)}
          onDeleteGroup={(group) => {
            setSelectedGroupId(group.id);
            setSelectedGroupForDelete(group);
            setDeleteGroupDialogOpen(true);
          }}
          onAddCompetitorsToGroup={async (groupNum, competitorIds) => {
            if (!competitionId || !selectedSeason || !selectedStageId) return;
            
            const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
            const stageNum = stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum;
            
            try {
              // Add all competitors to the group in a single API call
              await api.addCompetitorToGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds);
              
              // Reload competitors
              await loadGroupsCompetitors();
              
              // Clear selection
              setSelectedNotInGroups([]);
            } catch (error) {
              console.error('Failed to add competitors to group:', error);
            }
          }}
          onRemoveCompetitorsFromGroup={async (groupNum, competitorIds) => {
            if (!competitionId || !selectedSeason || !selectedStageId) return;
            
            const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
            const stageNum = stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum;
            
            try {
              // Remove all competitors from the group in a single API call
              await api.removeCompetitorFromGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds);
              
              // Reload competitors
              await loadGroupsCompetitors();
              
              // Clear selection for this group
              setSelectedInGroups(prev => ({
                ...prev,
                [groupNum]: []
              }));
            } catch (error) {
              console.error('Failed to remove competitors from group:', error);
            }
          }}
          onParticipantNumberChange={async (competitorId, participantNum) => {
            if (!competitionId || !selectedSeason || !selectedStageId) return;
            
            const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
            const stageNum = stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum;
            
            // Find which group this competitor is in
            const groupData = competitorsInGroups.find(g => 
              g.competitors.some(c => c.id === competitorId)
            );
            
            if (groupData) {
              try {
                await api.addCompetitorToGroup(
                  competitionId, 
                  seasonNum, 
                  stageNum, 
                  groupData.groupNum, 
                  competitorId, 
                  participantNum
                );
                await loadGroupsCompetitors();
              } catch (error) {
                console.error('Failed to update participant number:', error);
              }
            }
          }}
          onEditGroup={(group) => {
            setSelectedGroupForEdit(group);
            setEditGroupDialogOpen(true);
          }}
          competitionId={competitionId}
          seasonNum={selectedSeason?.SEASON_NUM || selectedSeason?.seasonNum}
          stageNum={stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum}
        />
      )}

      {/* Edit Group Dialog */}
      <EditGroupDialog
        open={editGroupDialogOpen}
        onClose={() => {
          setEditGroupDialogOpen(false);
          setSelectedGroupForEdit(null);
        }}
        group={selectedGroupForEdit}
        onSave={async (updatedGroup) => {
          try {
            // Update group in backend
            const groupId = `${updatedGroup.COMPETITION_ID || competitionId}-${updatedGroup.SEASON_NUM || selectedSeason?.SEASON_NUM || selectedSeason?.seasonNum}-${updatedGroup.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.STAGE_NUM || stages.find(s => s.id === selectedStageId)?.stageNum}-${updatedGroup.GROUP_NUM || updatedGroup.groupNum}`;
            await api.updateGroup(groupId, updatedGroup);
            
            // Update local state
            setSeasons(prev => prev.map(season => {
              if (season.id === selectedSeasonId) {
                return {
                  ...season,
                  stages: season.stages.map(stage => {
                    if (stage.id === selectedStageId) {
                      return {
                        ...stage,
                        groups: stage.groups.map(g => {
                          const groupNum = g.GROUP_NUM || g.groupNum;
                          const updatedGroupNum = updatedGroup.GROUP_NUM || updatedGroup.groupNum;
                          if (groupNum === updatedGroupNum) {
                            return { ...g, ...updatedGroup };
                          }
                          return g;
                        })
                      };
                    }
                    return stage;
                  })
                };
              }
              return season;
            }));
            
            setUpdateSnackbarMsg('Group updated successfully!');
            setUpdateSnackbarType('success');
            setUpdateSnackbarOpen(true);
            
            setEditGroupDialogOpen(false);
            setSelectedGroupForEdit(null);
          } catch (error) {
            console.error('Failed to update group:', error);
            setUpdateSnackbarMsg('Failed to update group');
            setUpdateSnackbarType('error');
            setUpdateSnackbarOpen(true);
          }
        }}
        onGroupNameClick={async () => {
          if (selectedGroupForEdit) {
            setSelectedGroupForTerms(selectedGroupForEdit);
            if (selectedGroupForEdit.nameId) {
              try {
                const response = await api.getTerm(selectedGroupForEdit.nameId);
                if (response.success && response.data && response.data.categoryId === 49) {
                  setGroupNameTermId(selectedGroupForEdit.nameId);
                } else {
                  setGroupNameTermId(null);
                }
                setGroupNameTermsDialogOpen(true);
              } catch (error) {
                setGroupNameTermId(null);
                setGroupNameTermsDialogOpen(true);
              }
            } else {
              setGroupNameTermId(null);
              setGroupNameTermsDialogOpen(true);
            }
          }
        }}
      />

      {/* Teams Section */}


      {/* Save/Update Buttons */}
      <SaveUpdateButtons
        hasChanges={hasStructureChanges || hasStageChanges}
        onSave={async () => {
          // Save stages changes first
          if (hasStageChanges) {
            setHasStageChanges(false);
            
            // Add stages with hasTable=true to savedTables
            if (selectedSeason && selectedSeason.stages) {
              selectedSeason.stages.forEach(stage => {
                if (stage.hasTable) {
                  setSavedTables(prev => new Set([...prev, stage.id]));
                }
              });
            }
            
            // Stages are saved through handleStructureSave which updates seasons state
          }
          
          // Add seasons with hasInfoCard=true to savedSeasonConfigs
          if (selectedSeason && selectedSeason.seasonConfig?.hasInfoCard) {
            setSavedSeasonConfigs(prev => new Set([...prev, selectedSeason.id]));
          }
          
          // Then call the original save handler
          await handleStructureSave();
        }}
        onUpdate={handleStructureUpdateInServices}
        onReload={handleStructureReload}
        reloadLoading={reloadStructureLoading}
      />

      {/* New Season Dialog */}
      <Dialog 
        open={newSeasonDialogOpen} 
        onClose={() => {
          setNewSeasonDialogOpen(false);
          setSeasonNameInputValue('');
          setSeasonNameSuggestions([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            New Season :
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setNewSeasonDialogOpen(false);
              setSeasonNameInputValue('');
              setSeasonNameSuggestions([]);
            }}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Season Name */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Season Name
              </Typography>
              <Autocomplete
                freeSolo
                options={seasonNameSuggestions}
                inputValue={seasonNameInputValue}
                onInputChange={(event, newInputValue) => {
                  handleSeasonNameChange(newInputValue);
                }}
                value={newSeasonForm.name}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    handleSeasonNameChange(newValue);
                  } else if (newValue) {
                    handleSeasonNameChange(newValue.engValue || newValue);
                  }
                }}
                isOptionEqualToValue={(option, value) => {
                  if (typeof value === 'string') {
                    return option.engValue === value;
                  }
                  return option.engValue === value?.engValue;
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    return option;
                  }
                  return option.engValue || '';
                }}
                renderOption={(props, option) => {
                  const displayValue = typeof option === 'string' ? option : option.engValue;
                  const valsCount = typeof option === 'string' ? null : option.valsCount;
                  return (
                    <li {...props} key={option.id || displayValue}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{displayValue}</Typography>
                        {valsCount !== null && valsCount !== undefined && (
                          <Typography variant="body2" sx={{ color: '#666', ml: 2 }}>
                            ({valsCount} values)
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Enter Season Name"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Language */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select
                  value={newSeasonForm.language}
                  label="Language"
                  onChange={(e) => setNewSeasonForm(prev => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="English">English</MenuItem>
                  <MenuItem value="Hebrew">Hebrew</MenuItem>
                  <MenuItem value="Spanish">Spanish</MenuItem>
                  <MenuItem value="French">French</MenuItem>
                  <MenuItem value="German">German</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Start Date and Round Name */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Start Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={newSeasonForm.startDate}
                onChange={(e) => setNewSeasonForm(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newSeasonForm.roundName}
                      onChange={(e) => setNewSeasonForm(prev => ({ ...prev, roundName: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Round Name"
                  sx={{ fontSize: '0.875rem', mr: 0 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select
                    value={newSeasonForm.roundNameValue}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, roundNameValue: e.target.value }))}
                    disabled={!newSeasonForm.roundName}
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      select round name
                    </MenuItem>
                    <MenuItem value="Group Stage">Group Stage</MenuItem>
                    <MenuItem value="Round of 16">Round of 16</MenuItem>
                    <MenuItem value="Quarter Finals">Quarter Finals</MenuItem>
                    <MenuItem value="Semi Finals">Semi Finals</MenuItem>
                    <MenuItem value="Final">Final</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!newSeasonForm.roundName}
                  sx={{ minWidth: 40, px: 1 }}
                >
                  ...
                </Button>
              </Box>
            </Grid>

            {/* End Date */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                End Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={newSeasonForm.endDate}
                onChange={(e) => setNewSeasonForm(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
              />
            </Grid>

            {/* Checkboxes */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newSeasonForm.setCurrentSeason}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, setCurrentSeason: e.target.checked }))}
                  />
                }
                label="Set Current Season"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newSeasonForm.basedOnLastSeason}
                    onChange={(e) => setNewSeasonForm(prev => ({ ...prev, basedOnLastSeason: e.target.checked }))}
                  />
                }
                label="Based on last season"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setNewSeasonDialogOpen(false);
              setSeasonNameInputValue('');
              setSeasonNameSuggestions([]);
            }}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!newSeasonForm.name || !competitionId) {
                setUpdateSnackbarMsg('Please enter a season name');
                return;
              }

              try {
                // 1. Find or create term for season name (categoryId 47 = Seasons Names)
                const nameId = await findOrCreateTerm(
                  newSeasonForm.name,
                  47, // Seasons Names category
                  'Seasons Names'
                );

                // 2. Calculate next season number (only for this competition)
                // Get all seasons from DB for this competition to find the max season number
                let maxSeasonNum = 0;
                try {
                  const dbSeasonsResponse = await api.getSeasons(competitionId);
                  if (dbSeasonsResponse.success && dbSeasonsResponse.data) {
                    const dbSeasons = dbSeasonsResponse.data.filter(s => 
                      s.COMPETITION_ID === parseInt(competitionId)
                    );
                    if (dbSeasons.length > 0) {
                      maxSeasonNum = Math.max(...dbSeasons.map(s => s.SEASON_NUM || 0));
                    }
                  }
                } catch (err) {
                  console.error('Failed to fetch seasons from DB:', err);
                  // Fallback to local state
                  const competitionSeasons = seasons.filter(s => {
                    const seasonCompId = s.id ? s.id.split('-')[0] : null;
                    return seasonCompId === competitionId || seasonCompId === String(competitionId);
                  });
                  if (competitionSeasons.length > 0) {
                    maxSeasonNum = Math.max(...competitionSeasons.map(s => s.seasonNum || 0));
                  }
                }
                const newSeasonNum = maxSeasonNum + 1;

                // 3. Create season in DB immediately
                const seasonPayload = {
                  COMPETITION_ID: parseInt(competitionId),
                  SEASON_NUM: newSeasonNum,
                  NAME_ID: nameId,
                  START_DATE: newSeasonForm.startDate ? new Date(newSeasonForm.startDate).toISOString() : null,
                  END_DATE: newSeasonForm.endDate ? new Date(newSeasonForm.endDate).toISOString() : null,
                  HAS_TABLE: true,
                  TABLE_WINNER_POINTS: 3,
                  TABLE_DRAW_POINTS: 1,
                  TABLE_LOSER_POINTS: 0,
                  TABLE_IS_EVEN_EXISTS: false,
                  USE_NAME: false,
                  SHOW_TOP_ATHLETES: true,
                  HAS_BRACKETS: true,
                  TABLE_COUNT_ET_SCORE: false,
                  TABLE_COUNT_PEN_SCORE: false,
                  HAS_HOME_TABLE: false,
                  HAS_AWAY_TABLE: false,
                  SHOW_INFO_CARD: false,
                  SHOW_MATCHES: false,
                  HAS_SEED: true,
                  SHOW_TOP_TEAMS_TAB: true,
                  SHOW_OUTRIGHTS_TAB: true,
                  PRESENT_COMPETITION_RULES: false,
                  TRANSFERS_WINDOW_START_DATE: null,
                  TRANSFERS_WINDOW_END_DATE: null
                };

                // Save to DB immediately
                await api.createSeason(seasonPayload);

                // Add new season to local state (already saved to DB)
                const newSeasonData = {
                  id: `${competitionId}-${newSeasonNum}`,
                  seasonNum: newSeasonNum,
                  nameId: nameId,
                  name: newSeasonForm.name,
                  isCurrent: newSeasonForm.setCurrentSeason || false,
                  startDate: newSeasonForm.startDate ? new Date(newSeasonForm.startDate).toISOString() : null,
                  endDate: newSeasonForm.endDate ? new Date(newSeasonForm.endDate).toISOString() : null,
                  stages: [],
                  teams: [],
                  phases: [],
                  seasonConfig: {
                    hasTable: true,
                    useName: false,
                    showTopAthletes: true,
                    hasBrackets: true,
                    hasInfoCard: false,
                    showMatches: false,
                    hasSeed: true,
                    showTopTeamsTab: true,
                    showOutrightsTab: true,
                    presentCompetitionRules: false,
                    hasHomeTable: false,
                    hasAwayTable: false,
                  },
                  tableSettings: {
                    winnerPoints: 3,
                    drawPoints: 1,
                    loserPoints: 0,
                    isEvenExists: false,
                    countExtraTimeScore: false,
                    countPenaltyScore: false,
                  },
                };

                // Add to local state
                setSeasons(prev => [...prev, newSeasonData]);

                // 4. Update CURRENT_SEASON if needed (save to DB immediately)
                if (newSeasonForm.setCurrentSeason && comp && setComp) {
                  const updatedComp = {
                    ...comp,
                    CURRENT_SEASON: newSeasonNum
                  };
                  
                  // Save to DB immediately
                  await api.updateCompetition(competitionId, { CURRENT_SEASON: newSeasonNum });
                  
                  if (setComp) {
                    setComp(updatedComp);
                  }
                  
                  // Update isCurrent flag for all seasons
                  setSeasons(prev => prev.map(season => ({
                    ...season,
                    isCurrent: season.id === newSeasonData.id
                  })));
                }

                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }

                setNewSeasonDialogOpen(false);
                setSeasonNameInputValue('');
                setSeasonNameSuggestions([]);
                setNewSeasonForm({
                  name: '',
                  language: 'English',
                  startDate: '',
                  endDate: '',
                  roundName: false,
                  roundNameValue: '',
                  setCurrentSeason: false,
                  basedOnLastSeason: false
                });

                setUpdateSnackbarMsg('Season created and saved successfully!');
              } catch (err) {
                console.error('Failed to create season:', err);
                setUpdateSnackbarMsg(`Failed to create season: ${err.message}`);
              }
            }}
            disabled={!newSeasonForm.name}
            sx={{ bgcolor: '#1976d2' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Season Confirmation Dialog */}
      <Dialog 
        open={deleteSeasonDialogOpen} 
        onClose={() => setDeleteSeasonDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600} color="#d32f2f">
            Delete Season
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setDeleteSeasonDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the season "{selectedSeason?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone and will permanently remove the season from the database.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => setDeleteSeasonDialogOpen(false)}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeason || !competitionId) {
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg('Cannot delete: Season data not available');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                return;
              }

              // Check if this is the current season - prevent deletion
              if (selectedSeason.isCurrent || (comp && comp.CURRENT_SEASON === selectedSeason.seasonNum)) {
                setDeleteSeasonDialogOpen(false);
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg('Cannot delete the current season. Please set a different season as current first.');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                return;
              }

              try {
                // Delete from DB immediately
                const seasonId = `${competitionId}-${selectedSeason.seasonNum}`;
                await api.deleteSeason(seasonId);

                // Remove season from local state
                setSeasons(prev => prev.filter(season => season.id !== selectedSeasonId));

                // Clear selection if deleted season was selected
                if (selectedSeasonId) {
                  const remainingSeasons = seasons.filter(season => season.id !== selectedSeasonId);
                  if (remainingSeasons.length > 0) {
                    setSelectedSeasonId(remainingSeasons[0].id);
                  } else {
                    setSelectedSeasonId(null);
                  }
                }

                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }

                setDeleteSeasonDialogOpen(false);
                if (setUpdateSnackbarType) setUpdateSnackbarType('success');
                setUpdateSnackbarMsg('Season deleted successfully!');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
              } catch (err) {
                console.error('Failed to delete season:', err);
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg(`Failed to delete season: ${err.message}`);
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
              }
            }}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Settings Dialog */}
      <Dialog 
        open={tableSettingsDialogOpen} 
        onClose={() => setTableSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            Table Settings : {selectedSeason?.name}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setTableSettingsDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Winner Points */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Winner Points
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.winnerPoints}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, winnerPoints: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Draw Points */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Draw Points
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.drawPoints}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, drawPoints: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Loser Points */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Loser Points
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.loserPoints}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, loserPoints: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Winner Points After Extra Time */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Winner Points After Extra Time
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.winnerPointsAfterExtraTime}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, winnerPointsAfterExtraTime: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Loser Points After Extra Time */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Loser Points After Extra Time
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.loserPointsAfterExtraTime}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, loserPointsAfterExtraTime: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Winner Points After Penalties */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Winner Points After Penalties
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.winnerPointsAfterPenalties}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, winnerPointsAfterPenalties: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Loser Points After Penalties */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Loser Points After Penalties
              </Typography>
              <TextField
                size="small"
                type="number"
                value={tableSettingsForm.loserPointsAfterPenalties}
                onChange={(e) => setTableSettingsForm(prev => ({ ...prev, loserPointsAfterPenalties: parseInt(e.target.value) || 0 }))}
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
                inputProps={{ min: 0, max: 999 }}
              />
            </Grid>

            {/* Checkboxes - more compact layout */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tableSettingsForm.tableSupportInEven}
                      onChange={(e) => setTableSettingsForm(prev => ({ ...prev, tableSupportInEven: e.target.checked }))}
                    />
                  }
                  label="Table Support In Even"
                  sx={{ fontSize: '0.875rem' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tableSettingsForm.countExtraTimeScore}
                      onChange={(e) => setTableSettingsForm(prev => ({ ...prev, countExtraTimeScore: e.target.checked }))}
                    />
                  }
                  label="Count Exratime Score"
                  sx={{ fontSize: '0.875rem' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tableSettingsForm.countPenaltyScore}
                      onChange={(e) => setTableSettingsForm(prev => ({ ...prev, countPenaltyScore: e.target.checked }))}
                    />
                  }
                  label="Count Penalty Score"
                  sx={{ fontSize: '0.875rem' }}
                />
              </Box>
            </Grid>

            {/* Order By Parameters */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Table Order Parameters
              </Typography>
              
              {/* Current Order Parameters */}
              {orderParameters.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Current order (priority from top to bottom):
                  </Typography>
                  {orderParameters.map((param, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        mb: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <Typography variant="body2" sx={{ minWidth: 30, fontWeight: 600, color: '#1976d2' }}>
                        {index + 1}.
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {availableOrderFields.find(f => f.value === param.field)?.label}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1, 
                        fontSize: '0.75rem',
                        backgroundColor: param.direction === 'desc' ? '#e3f2fd' : '#fff3e0',
                        color: param.direction === 'desc' ? '#1976d2' : '#f57c00'
                      }}>
                        {param.direction === 'desc' ? 'Descending' : 'Ascending'}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setOrderParameters(prev => prev.filter((_, i) => i !== index))}
                        sx={{ color: '#d32f2f' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Add New Order Parameter */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Field</InputLabel>
                  <Select
                    value={newOrderParameter.field}
                    label="Select Field"
                    onChange={(e) => setNewOrderParameter(prev => ({ ...prev, field: e.target.value }))}
                  >
                    {availableOrderFields
                      .filter(field => !orderParameters.some(param => param.field === field.value))
                      .map(field => (
                        <MenuItem key={field.value} value={field.value}>
                          {field.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={newOrderParameter.direction}
                    label="Direction"
                    onChange={(e) => setNewOrderParameter(prev => ({ ...prev, direction: e.target.value }))}
                  >
                    <MenuItem value="desc">Descending</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (newOrderParameter.field) {
                      setOrderParameters(prev => [...prev, newOrderParameter]);
                      setNewOrderParameter({ field: '', direction: 'desc' });
                    }
                  }}
                  disabled={!newOrderParameter.field}
                  sx={{ minWidth: 100 }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => setTableSettingsDialogOpen(false)}
            sx={{ borderColor: '#ff9800', color: '#ff9800' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // Save table settings logic - map form fields to tableSettings structure
              if (selectedSeason?.id) {
                // Map form field names to tableSettings field names
                const fieldMapping = {
                  winnerPoints: 'winnerPoints',
                  drawPoints: 'drawPoints',
                  loserPoints: 'loserPoints',
                  winnerPointsAfterExtraTime: 'winnerPointsAfterExtraTime',
                  loserPointsAfterExtraTime: 'loserPointsAfterExtraTime',
                  winnerPointsAfterPenalties: 'winnerPointsAfterPenalties',
                  loserPointsAfterPenalties: 'loserPointsAfterPenalties',
                  tableSupportInEven: 'isEvenExists', // Map to isEvenExists
                  countExtraTimeScore: 'countExtraTimeScore',
                  countPenaltyScore: 'countPenaltyScore',
                };
                
                // Update each field
                Object.keys(fieldMapping).forEach(formKey => {
                  const tableSettingsKey = fieldMapping[formKey];
                  handleTableSettingsChange(selectedSeason.id, tableSettingsKey, tableSettingsForm[formKey]);
                });
                
                // Save order parameters
                handleTableSettingsChange(selectedSeason.id, 'orderParameters', orderParameters);
              }
              
              setTableSettingsDialogOpen(false);
            }}
            sx={{ bgcolor: '#1976d2' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Stage Dialog */}
      <Dialog 
        open={newStageDialogOpen} 
        onClose={() => {
          setNewStageDialogOpen(false);
          setStageNameInputValue('');
          setStageNameSuggestions([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            New Stage :
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setNewStageDialogOpen(false);
              setStageNameInputValue('');
              setStageNameSuggestions([]);
            }}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Stage Name */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Stage Name
              </Typography>
              <Autocomplete
                freeSolo
                options={stageNameSuggestions}
                inputValue={stageNameInputValue}
                onInputChange={(event, newInputValue) => {
                  handleStageNameChange(newInputValue);
                }}
                value={newStageForm.name}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    handleStageNameChange(newValue);
                  } else if (newValue) {
                    handleStageNameChange(newValue.engValue || newValue);
                  }
                }}
                isOptionEqualToValue={(option, value) => {
                  if (typeof value === 'string') {
                    return option.engValue === value;
                  }
                  return option.engValue === value?.engValue;
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    return option;
                  }
                  return option.engValue || '';
                }}
                renderOption={(props, option) => {
                  const displayValue = typeof option === 'string' ? option : option.engValue;
                  const valsCount = typeof option === 'string' ? null : option.valsCount;
                  return (
                    <li {...props} key={option.id || displayValue}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{displayValue}</Typography>
                        {valsCount !== null && valsCount !== undefined && (
                          <Typography variant="body2" sx={{ color: '#666', ml: 2 }}>
                            ({valsCount} values)
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Enter Stage Name"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Stage Type */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage Type</InputLabel>
                <Select
                  value={newStageForm.type}
                  label="Stage Type"
                  onChange={(e) => setNewStageForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="group">Group</MenuItem>
                  <MenuItem value="knockout">Knockout</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Stage Parameters */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Stage Parameters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.hasTable}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setNewStageForm(prev => ({ ...prev, hasTable: newValue }));
                          
                          // If hasTable is being set to true, automatically set it to true at season level
                          if (newValue) {
                            handleSeasonConfigChange(selectedSeasonId, 'hasTable', true);
                          }
                        }}
                      />
                    }
                    label="Has Table"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.preVisualBrackets}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, preVisualBrackets: e.target.checked }))}
                      />
                    }
                    label="Pre Visual Brackets"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.includeInBracket}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, includeInBracket: e.target.checked }))}
                      />
                    }
                    label="Include in bracket"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.isSeries}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, isSeries: e.target.checked }))}
                      />
                    }
                    label="Is Series"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.filterDivision}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, filterDivision: e.target.checked }))}
                      />
                    }
                    label="Filter Division"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                    Num Of Games
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={newStageForm.numOfGames}
                    onChange={(e) => setNewStageForm(prev => ({ ...prev, numOfGames: parseInt(e.target.value) || -1 }))}
                    inputProps={{ min: -1 }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.connectedInBrackets}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, connectedInBrackets: e.target.checked }))}
                      />
                    }
                    label="Connected In Brackets"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newStageForm.connectedToPreviousStage}
                        onChange={(e) => setNewStageForm(prev => ({ ...prev, connectedToPreviousStage: e.target.checked }))}
                      />
                    }
                    label="Connected To previous stage"
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Phase</InputLabel>
                    <Select
                      value={newStageForm.phase}
                      label="Phase"
                      onChange={(e) => setNewStageForm(prev => ({ ...prev, phase: e.target.value }))}
                    >
                      <MenuItem value="">Not Selected</MenuItem>
                      <MenuItem value="group">Group</MenuItem>
                      <MenuItem value="knockout">Knockout</MenuItem>
                      <MenuItem value="final">Final</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* Stage Dates */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Stage Dates
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Tooltip title="All times are in UTC">
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="Start Date"
                      value={newStageForm.startDate}
                      onChange={(e) => setNewStageForm(prev => ({ ...prev, startDate: e.target.value }))}
                      error={!isStageStartDateValid}
                      helperText={getStageDateFieldError('start')}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                        },
                      }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Tooltip title="All times are in UTC">
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="End Date"
                      value={newStageForm.endDate}
                      onChange={(e) => setNewStageForm(prev => ({ ...prev, endDate: e.target.value }))}
                      error={!isStageEndDateValid}
                      helperText={getStageDateFieldError('end')}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                        },
                      }}
                    />
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>

            {/* Set Current Stage Checkbox */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newStageForm.setCurrentStage}
                    onChange={(e) => setNewStageForm(prev => ({ ...prev, setCurrentStage: e.target.checked }))}
                  />
                }
                label="Set Current Stage"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setNewStageDialogOpen(false);
              setStageNameInputValue('');
              setStageNameSuggestions([]);
            }}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeasonId || !newStageForm.name) return;
              
              try {
                // 1. Find or create term for stage name (categoryId 48 = Stages Names)
                const nameId = await findOrCreateTerm(
                  newStageForm.name,
                  48, // Stages Names category
                  'Stages Names'
                );
                
                // 2. Calculate next stage number
                const maxStageNum = stages.length > 0 ? Math.max(...stages.map(s => s.stageNum || 0)) : 0;
                const newStageNum = maxStageNum + 1;
                const competitionId = selectedSeasonId.split('-')[0];
                const seasonNum = selectedSeasonId.split('-')[1];
                
                // 3. Create stage payload for DB
                const stagePayload = {
                  COMPETITION_ID: parseInt(competitionId),
                  SEASON_NUM: parseInt(seasonNum),
                  STAGE_NUM: newStageNum,
                  NAME_ID: nameId,
                  NUM_OF_GAMES: newStageForm.numOfGames || -1,
                  STAGE_TYPE: newStageForm.type === 'group' ? 1 : 2,
                  HAS_TABLE: newStageForm.hasTable || false,
                  TABLE_WINNER_POINTS: 3,
                  TABLE_DRAW_POINTS: 1,
                  TABLE_LOSER_POINTS: 0,
                  TABLE_IS_EVEN_EXISTS: false,
                  USE_NAME: false,
                  IS_FINAL: false,
                  START_DATE: newStageForm.startDate ? new Date(newStageForm.startDate).toISOString() : null,
                  END_DATE: newStageForm.endDate ? new Date(newStageForm.endDate).toISOString() : null,
                  TABLE_COUNT_ET_SCORE: false,
                  TABLE_COUNT_PEN_SCORE: false,
                  HAS_HOME_TABLE: false,
                  HAS_AWAY_TABLE: false,
                };

                // Save to DB immediately
                await api.createStage(stagePayload);
                
                // 4. Create new stage object for local state
                const newStage = {
                  id: `${competitionId}-${seasonNum}-${newStageNum}`,
                  stageNum: newStageNum,
                  nameId: nameId,
                  name: newStageForm.name,
                  type: newStageForm.type,
                  order: newStageNum,
                  isCurrent: newStageForm.setCurrentStage,
                  hasTable: newStageForm.hasTable,
                  preVisualBrackets: newStageForm.preVisualBrackets,
                  includeInBracket: newStageForm.includeInBracket,
                  isSeries: newStageForm.isSeries,
                  filterDivision: newStageForm.filterDivision,
                  numOfGames: newStageForm.numOfGames || -1,
                  connectedInBrackets: newStageForm.connectedInBrackets,
                  connectedToPreviousStage: newStageForm.connectedToPreviousStage,
                  phase: newStageForm.phase,
                  startDate: newStageForm.startDate,
                  endDate: newStageForm.endDate,
                  groups: [],
                  STAGE_TYPE: newStageForm.type === 'group' ? 1 : 2,
                  tableSettings: {
                    winnerPoints: 3,
                    drawPoints: 1,
                    loserPoints: 0,
                    isEvenExists: false,
                    countExtraTimeScore: false,
                    countPenaltyScore: false,
                  }
                };
                
                // Add to local state
                setSeasons(prev => prev.map(season => {
                  if (season.id === selectedSeasonId) {
                    const updatedStages = season.stages.map(stage => ({
                      ...stage,
                      isCurrent: newStageForm.setCurrentStage ? false : stage.isCurrent
                    }));
                    return {
                      ...season,
                      stages: [...updatedStages, newStage]
                    };
                  }
                  return season;
                }));
                
                // If hasTable is true, automatically set it to true at season level
                if (newStageForm.hasTable) {
                  handleSeasonConfigChange(selectedSeasonId, 'hasTable', true);
                }

                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }
                
                setUpdateSnackbarMsg('Stage created and saved successfully!');
                
                // Reset form and close dialog
                setNewStageDialogOpen(false);
                setStageNameInputValue('');
                setStageNameSuggestions([]);
                setNewStageForm({
                  name: '',
                  type: 'group',
                  setCurrentStage: false,
                  hasTable: false,
                  preVisualBrackets: false,
                  includeInBracket: false,
                  isSeries: false,
                  filterDivision: false,
                  numOfGames: -1,
                  connectedInBrackets: false,
                  connectedToPreviousStage: false,
                  phase: '',
                  startDate: getDefaultDateTime(),
                  endDate: getDefaultDateTime()
                });
              } catch (error) {
                console.error('Failed to create stage:', error);
                setUpdateSnackbarMsg(error.message || 'Failed to create stage');
              }
            }}
            disabled={!newStageForm.name}
            sx={{ bgcolor: '#1976d2' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Stage Confirmation Dialog */}
      <Dialog 
        open={deleteStageDialogOpen} 
        onClose={() => setDeleteStageDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600} color="#d32f2f">
            Delete Stage
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setDeleteStageDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the stage "{stages.find(s => s.id === selectedStageId)?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone and will permanently remove the stage from the database.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => setDeleteStageDialogOpen(false)}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeasonId || !selectedStageId) return;
              
              // Find the stage to check if it's current
              const stageToDelete = stages.find(s => s.id === selectedStageId);
              const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
              
              if (!stageToDelete || !selectedSeason) {
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg('Cannot delete: Stage data not available');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                return;
              }
              
              // Check if this is the current stage - prevent deletion
              const isCurrentStage = (comp && comp.CURRENT_STAGE === stageToDelete.stageNum && 
                                     comp.CURRENT_SEASON === selectedSeason.seasonNum) ||
                                    stageToDelete.isCurrent;
              
              if (isCurrentStage) {
                setDeleteStageDialogOpen(false);
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg('Cannot delete the current stage. Please set a different stage as current first.');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
                return;
              }
              
              try {
                // Delete from DB immediately
                await api.deleteStage(selectedStageId);
                
                // Remove stage from local state
                setSeasons(prev => prev.map(season => {
                  if (season.id === selectedSeasonId) {
                    return {
                      ...season,
                      stages: season.stages.filter(stage => stage.id !== selectedStageId)
                    };
                  }
                  return season;
                }));
                
                setSelectedStageId(null);
                
                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }
                
                setDeleteStageDialogOpen(false);
                if (setUpdateSnackbarType) setUpdateSnackbarType('success');
                setUpdateSnackbarMsg('Stage deleted successfully!');
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
              } catch (err) {
                console.error('Failed to delete stage:', err);
                if (setUpdateSnackbarType) setUpdateSnackbarType('error');
                setUpdateSnackbarMsg(`Failed to delete stage: ${err.message}`);
                if (setUpdateSnackbarOpen) setUpdateSnackbarOpen(true);
              }
            }}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog 
        open={newGroupDialogOpen} 
        onClose={() => {
          setNewGroupDialogOpen(false);
          setGroupNameInputValue('');
          setGroupNameSuggestions([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            New Group
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setNewGroupDialogOpen(false);
              setGroupNameInputValue('');
              setGroupNameSuggestions([]);
            }}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Group Name */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Group Name
              </Typography>
              <Autocomplete
                freeSolo
                options={groupNameSuggestions}
                value={groupNameInputValue}
                inputValue={groupNameInputValue}
                onInputChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    handleGroupNameChange(newValue);
                  } else if (newValue) {
                    handleGroupNameChange(newValue.engValue || newValue);
                  }
                }}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    handleGroupNameChange(newValue);
                  } else if (newValue) {
                    handleGroupNameChange(newValue.engValue || newValue);
                  }
                }}
                isOptionEqualToValue={(option, value) => {
                  if (typeof value === 'string') {
                    return option.engValue === value;
                  }
                  return option.engValue === value?.engValue;
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    return option;
                  }
                  return option.engValue || '';
                }}
                renderOption={(props, option) => {
                  const displayValue = typeof option === 'string' ? option : option.engValue;
                  const valsCount = typeof option === 'string' ? null : option.valsCount;
                  return (
                    <li {...props} key={option.id || displayValue}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{displayValue}</Typography>
                        {valsCount !== null && valsCount !== undefined && (
                          <Typography variant="body2" sx={{ color: '#666', ml: 2 }}>
                            ({valsCount} values)
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Enter Group Name"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Language */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select
                  value={newGroupForm.language}
                  label="Language"
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="English">English</MenuItem>
                  <MenuItem value="Hebrew">Hebrew</MenuItem>
                  <MenuItem value="Spanish">Spanish</MenuItem>
                  <MenuItem value="French">French</MenuItem>
                  <MenuItem value="German">German</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Has Table */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newGroupForm.hasTable}
                    onChange={(e) => setNewGroupForm(prev => ({ ...prev, hasTable: e.target.checked }))}
                  />
                }
                label="Has Table"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>

            {/* To Qualify */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                To Qualify
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={newGroupForm.toQualify || ''}
                onChange={(e) => setNewGroupForm(prev => ({ ...prev, toQualify: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Number of teams"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
              />
            </Grid>

            {/* Number of Games */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                Number of Games
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={newGroupForm.numOfGames === -1 ? '' : newGroupForm.numOfGames}
                onChange={(e) => setNewGroupForm(prev => ({ ...prev, numOfGames: e.target.value ? parseInt(e.target.value) : -1 }))}
                placeholder="Number of games"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
                }}
              />
            </Grid>

            {/* Is Series */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newGroupForm.isSeries}
                    onChange={(e) => setNewGroupForm(prev => ({ ...prev, isSeries: e.target.checked }))}
                  />
                }
                label="Is Series"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>

            {/* Is Final */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newGroupForm.isFinal}
                    onChange={(e) => setNewGroupForm(prev => ({ ...prev, isFinal: e.target.checked }))}
                  />
                }
                label="Is Final"
                sx={{ fontSize: '0.875rem' }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setNewGroupDialogOpen(false);
              setGroupNameInputValue('');
              setGroupNameSuggestions([]);
            }}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeasonId || !selectedStageId || !newGroupForm.name || !competitionId) {
                setUpdateSnackbarMsg('Please enter a group name');
                return;
              }

              try {
                // 1. Find or create term for group name (categoryId 49 = Groups Names)
                const nameId = await findOrCreateTerm(
                  newGroupForm.name,
                  49, // Groups Names category
                  'Groups Names'
                );
                
                // 2. Calculate next group number
                const selectedStage = stages.find(s => s.id === selectedStageId);
                const maxGroupNum = selectedStage?.groups?.length > 0 
                  ? Math.max(...selectedStage.groups.map(g => g.groupNum || 0)) 
                  : 0;
                const newGroupNum = maxGroupNum + 1;
                const competitionId = selectedSeasonId.split('-')[0];
                const seasonNum = selectedSeasonId.split('-')[1];
                const stageNum = selectedStageId.split('-')[2];
                
                // 3. Create group payload for DB
                const groupPayload = {
                  COMPETITION_ID: parseInt(competitionId),
                  SEASON_NUM: parseInt(seasonNum),
                  STAGE_NUM: parseInt(stageNum),
                  GROUP_NUM: newGroupNum,
                  NAME_ID: nameId,
                  USE_NAME: false,
                  HAS_TABLE: newGroupForm.hasTable || false,
                  IS_SERIES: newGroupForm.isSeries || false,
                  GROUP_BY: false,
                  AUTONOMOUS: false,
                  TO_QUALIFY: newGroupForm.toQualify || null,
                  NUM_OF_GAMES: newGroupForm.numOfGames || -1,
                  IS_FINAL: newGroupForm.isFinal || false
                };

                // Save to DB immediately
                await api.createGroup(groupPayload);
                
                // 4. Create new group object for local state
                const newGroup = {
                  id: `${competitionId}-${seasonNum}-${stageNum}-${newGroupNum}`,
                  groupNum: newGroupNum,
                  nameId: nameId,
                  name: newGroupForm.name,
                  stageId: selectedStageId,
                  teams: [],
                  ...groupPayload
                };
                
                // Add to local state
                setSeasons(prev => prev.map(season => {
                  if (season.id === selectedSeasonId) {
                    return {
                      ...season,
                      stages: season.stages.map(stage => {
                        if (stage.id === selectedStageId) {
                          return {
                            ...stage,
                            groups: [...(stage.groups || []), newGroup]
                          };
                        }
                        return stage;
                      })
                    };
                  }
                  return season;
                }));

                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }
                
                setUpdateSnackbarMsg('Group created and saved successfully!');
                setUpdateSnackbarType('success');
                setUpdateSnackbarOpen(true);
                
                // Reset form and close dialog
                setNewGroupDialogOpen(false);
                setGroupNameInputValue('');
                setGroupNameSuggestions([]);
                setNewGroupForm({
                  name: '',
                  language: 'English',
                  hasTable: false,
                  toQualify: null,
                  numOfGames: -1,
                  isSeries: false,
                  isFinal: false
                });
              } catch (error) {
                console.error('Failed to create group:', error);
                setUpdateSnackbarMsg(error.message || 'Failed to create group');
                setUpdateSnackbarType('error');
                setUpdateSnackbarOpen(true);
              }
            }}
            disabled={!newGroupForm.name}
            sx={{ bgcolor: '#1976d2' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog 
        open={deleteGroupDialogOpen} 
        onClose={() => {
          setDeleteGroupDialogOpen(false);
          setSelectedGroupForDelete(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600} color="#d32f2f">
            Delete Group
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setDeleteGroupDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the group "{selectedGroupForDelete?.name || stageGroups.find(g => g.id === selectedGroupId)?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            This action cannot be undone and will permanently remove the group from the database.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All competitors in this group will be moved back to "Competitors Not In Groups".
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => setDeleteGroupDialogOpen(false)}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeasonId || !selectedStageId || !selectedGroupId) return;
              
              try {
                // Delete from DB immediately
                await api.deleteGroup(selectedGroupId);
                
                // Remove group from local state
                setSeasons(prev => prev.map(season => {
                  if (season.id === selectedSeasonId) {
                    return {
                      ...season,
                      stages: season.stages.map(stage => {
                        if (stage.id === selectedStageId) {
                          return {
                            ...stage,
                            groups: (stage.groups || []).filter(group => group.id !== selectedGroupId)
                          };
                        }
                        return stage;
                      })
                    };
                  }
                  return season;
                }));
                
                setSelectedGroupId(null);
                setSelectedGroupForDelete(null);
                
                // Reload structure data to sync with DB
                if (handleStructureReload) {
                  await handleStructureReload();
                }
                
                // Reload groups competitors to update the UI
                await loadGroupsCompetitors();
                
                setDeleteGroupDialogOpen(false);
                setUpdateSnackbarType('success');
                setUpdateSnackbarMsg('Group deleted successfully! Competitors have been moved back to "Not In Groups".');
                setUpdateSnackbarOpen(true);
              } catch (err) {
                console.error('Failed to delete group:', err);
                setUpdateSnackbarType('error');
                setUpdateSnackbarMsg(`Failed to delete group: ${err.message}`);
                setUpdateSnackbarOpen(true);
              }
            }}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Season Name Terms Dialog */}
      <TermEditModal
        open={seasonNameTermsDialogOpen}
        onClose={() => {
          setSeasonNameTermsDialogOpen(false);
          setSeasonNameTermId(null);
        }}
        termId={seasonNameTermId}
        initialCategory={47}
      />

      {/* Stage Name Terms Dialog */}
      <TermEditModal
        open={stageNameTermsDialogOpen}
        onClose={async () => {
          setStageNameTermsDialogOpen(false);
          setStageNameTermId(null);
          // Reload structure data to get updated stage name
          if (handleStructureReload) {
            await handleStructureReload();
          }
        }}
        termId={stageNameTermId}
        initialCategory={48}
      />

      {/* Group Name Terms Dialog */}
      <TermEditModal
        open={groupNameTermsDialogOpen}
        onClose={async () => {
          setGroupNameTermsDialogOpen(false);
          setGroupNameTermId(null);
          // Reload structure data to get updated group name
          if (handleStructureReload) {
            await handleStructureReload();
          }
        }}
        termId={groupNameTermId}
        initialCategory={49}
      />

      {/* Manage Standings Dialog */}
      <Dialog 
        open={manageStandingsDialogOpen} 
        onClose={() => setManageStandingsDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            Standings for Stage: {stages.find(s => s.id === selectedStageId)?.name}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setManageStandingsDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box>
            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={manageStandingsTabValue} 
                onChange={(e, newValue) => setManageStandingsTabValue(newValue)}
                sx={{ px: 2 }}
              >
                <Tab label="Full" sx={{ fontWeight: 600, color: manageStandingsTabValue === 0 ? '#1976d2' : '#666' }} />
                <Tab label="Home" sx={{ fontWeight: 600, color: manageStandingsTabValue === 1 ? '#1976d2' : '#666' }} />
                <Tab label="Away" sx={{ fontWeight: 600, color: manageStandingsTabValue === 2 ? '#1976d2' : '#666' }} />
              </Tabs>
            </Box>

            {/* Content for all tabs (Full, Home, Away) */}
            <Box>
              {/* Stage Group Selection and Action Buttons */}
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Choose Stage Group:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value="Group A" displayEmpty>
                      <MenuItem value="Group A">Group A</MenuItem>
                      <MenuItem value="Group B">Group B</MenuItem>
                      <MenuItem value="Group C">Group C</MenuItem>
                      <MenuItem value="Group D">Group D</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                

              </Box>

              {/* Table Management Hint */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary">
                  Drag a column header here and drop it to group by that column.
                </Typography>
              </Box>

              {/* Standings Table */}
              <Box sx={{ p: 2 }}>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <Tooltip title="Unique team identifier" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Id</TableCell>
                        </Tooltip>
                        <Tooltip title="Destination number - shows the destination number based on team position" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>D. Num</TableCell>
                        </Tooltip>
                        <Tooltip title="Destination color - displays the color of the destination assigned to this position" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>D. Color</TableCell>
                        </Tooltip>
                        <Tooltip title="Team name" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        </Tooltip>
                        <Tooltip title="Group number (in group stage)" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Gro...</TableCell>
                        </Tooltip>
                        <Tooltip title="Team position in table" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Pos.</TableCell>
                        </Tooltip>
                        <Tooltip title="Number of games played" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Played</TableCell>
                        </Tooltip>
                        <Tooltip title="Number of wins" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Ws.</TableCell>
                        </Tooltip>
                        <Tooltip title="Number of draws" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Es.</TableCell>
                        </Tooltip>
                        <Tooltip title="Number of losses" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Ls.</TableCell>
                        </Tooltip>
                        <Tooltip title="Goals/points scored" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>For</TableCell>
                        </Tooltip>
                        <Tooltip title="Goals/points conceded" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Ag...</TableCell>
                        </Tooltip>
                        <Tooltip title="Goal/point difference (For - Against)" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Rt.</TableCell>
                        </Tooltip>
                        <Tooltip title="Total points" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>Pts.</TableCell>
                        </Tooltip>
                        <Tooltip title="Success percentage (usually win percentage)" placement="top" arrow>
                          <TableCell sx={{ fontWeight: 600 }}>%</TableCell>
                        </Tooltip>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {standingsData.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.id}</TableCell>
                          <TableCell>
                            {(() => {
                              // Find destination based on team position
                              const destination = destinations.find(dest => 
                                team.position >= dest.fromPosition && team.position <= dest.toPosition
                              );
                              return destination ? destination.dNum : '-';
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // Find destination based on team position
                              const destination = destinations.find(dest => 
                                team.position >= dest.fromPosition && team.position <= dest.toPosition
                              );
                              return destination ? (
                                <Box
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    backgroundColor: destination.color,
                                    borderRadius: 1,
                                    display: 'inline-block'
                                  }}
                                />
                              ) : '-';
                            })()}
                          </TableCell>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>{team.group}</TableCell>
                          <TableCell>{team.position}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.played}
                              onChange={(e) => handleStandingsDataChange(team.id, 'played', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.wins}
                              onChange={(e) => handleStandingsDataChange(team.id, 'wins', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.draws}
                              onChange={(e) => handleStandingsDataChange(team.id, 'draws', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.losses}
                              onChange={(e) => handleStandingsDataChange(team.id, 'losses', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.goalsFor}
                              onChange={(e) => handleStandingsDataChange(team.id, 'goalsFor', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.goalsAgainst}
                              onChange={(e) => handleStandingsDataChange(team.id, 'goalsAgainst', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>{team.goalDifference}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={team.points}
                              onChange={(e) => handleStandingsDataChange(team.id, 'points', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 999 }}
                            />
                          </TableCell>
                          <TableCell>{team.percentage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                                 {/* Action Buttons */}
                 <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                   <Box sx={{ display: 'flex', gap: 1 }}>
                     <Button
                       variant="outlined"
                       size="small"
                       onClick={() => {
                         // TODO: Reload missing competitors functionality
                         console.log('Reload missing competitors');
                       }}
                       sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                     >
                       Reload Missing Competitors
                     </Button>
                     <Button
                       variant="outlined"
                       size="small"
                       onClick={() => {
                         // TODO: Implement reorder functionality
                         console.log('Reorder functionality');
                       }}
                       sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                     >
                       Reorder
                     </Button>
                     <Button
                       variant="outlined"
                       size="small"
                       onClick={() => {
                         setStandingsData(initialStandingsData);
                         setHasStandingsChanges(true);
                       }}
                       sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                     >
                       Clear
                     </Button>
                     <Button
                       variant="outlined"
                       size="small"
                       onClick={handleResetStandings}
                       disabled={!hasStandingsChanges}
                       sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                     >
                       Reset
                     </Button>
                     <Button
                       variant="outlined"
                       size="small"
                       onClick={() => setDeleteStandingsDialogOpen(true)}
                       sx={{ borderColor: '#f44336', color: '#f44336' }}
                     >
                       Delete Standings
                     </Button>
                   </Box>
                 </Box>

                 {/* New Row - RECALCULATE BY GAMES + Checkbox */}
                 <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                   <Button
                     variant="outlined"
                     size="small"
                     onClick={handleRecalculateByGames}
                     sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                   >
                     Recalculate By Games
                   </Button>
                   <FormControlLabel
                     control={<Checkbox defaultChecked />}
                     label="Recalculate live upon save"
                     sx={{ fontSize: '0.875rem' }}
                   />
                 </Box>

                 {/* New Row - SEND TABLE UPDATE Button */}
                 <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                   <Button
                     variant="outlined"
                     size="small"
                     onClick={() => {
                       // Send table update through WCF system
                       const tableData = {
                         standingsData,
                         destinations,
                         selectedStageId,
                         selectedSeasonId,
                         datasource: 'SIMULATOR_EN'
                       };
                       handleSendTableUpdate(tableData);
                     }}
                     sx={{ borderColor: '#4caf50', color: '#4caf50' }}
                   >
                     Send Table Update
                   </Button>
                 </Box>
              </Box>

              {/* Destinations Section - Added below action buttons */}
              <Box sx={{ mt: 3, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                                   {/* Top Controls Section */}
                   <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
                     <IconButton
                       color="primary"
                       onClick={handleAddDestination}
                       sx={{ bgcolor: '#4caf50', color: '#fff', '&:hover': { bgcolor: '#388e3c' } }}
                     >
                       <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>+</span>
                     </IconButton>
                   </Box>

                {/* Destinations Table */}
                <Box sx={{ p: 2 }}>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>D. Num</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>D. Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Table Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Group Num</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>From Position</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>To Position</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Apply for all groups</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Delete</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {destinations.map((destination) => (
                          <TableRow key={destination.id}>
                            <TableCell>
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: destination.color,
                                  borderRadius: 1
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box
                                onClick={() => handleDestinationNameClick(destination)}
                                sx={{
                                  cursor: 'pointer',
                                  color: '#1976d2',
                                  textDecoration: 'underline',
                                  '&:hover': { color: '#1565c0' },
                                  fontWeight: 500
                                }}
                              >
                                {destination.name && destination.name !== '' ? destination.name : 'ADD'}
                              </Box>
                            </TableCell>
                            <TableCell>{destination.dNum}</TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select value={destination.dType} displayEmpty>
                                  <MenuItem value="Unknown">Unknown</MenuItem>
                                  <MenuItem value="ContinentalSecondaryCup">ContinentalSecondaryCup</MenuItem>
                                  <MenuItem value="DomesticCup">DomesticCup</MenuItem>
                                  <MenuItem value="Relegation">Relegation</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={destination.tableType || ''}
                                  onChange={e => handleTableTypeChange(destination.id, e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="Regular">Regular</MenuItem>
                                  <MenuItem value="Position">Position</MenuItem>
                                  <MenuItem value="Aggregate">Aggregate</MenuItem>
                                  <MenuItem value="Relegation">Relegation</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>{destination.groupNum}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={destination.fromPosition}
                                sx={{ width: 60 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={destination.toPosition}
                                sx={{ width: 60 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox size="small" />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteDestination(destination.id)}
                                sx={{ color: '#d32f2f' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                                                        {/* Table Summary */}
                   <Box sx={{ mt: 1, textAlign: 'right' }}>
                     <Typography variant="body2" color="text.secondary">
                       Total Items: {destinations.length}
                     </Typography>
                   </Box>

                   {/* Remove All Destinations Button - Moved below table */}
                   <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                     <Button
                       variant="outlined"
                       size="small"
                       color="error"
                       onClick={() => {
                         setDestinations([]);
                         setHasStandingsChanges(true);
                       }}
                     >
                       Remove All Destinations
                     </Button>
                   </Box>
                 </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // Save all changes (standings + destinations)
              handleSaveStandings();
              // TODO: Save destinations data
              console.log('Save all changes');
            }}
            disabled={!hasStandingsChanges}
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
          >
            Save All
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setManageStandingsDialogOpen(false)}
            sx={{ borderColor: '#ff9800', color: '#ff9800' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Destination Terms Dialog */}
      <TermEditModal
        open={destinationTermsDialogOpen}
        onClose={() => {
          setDestinationTermsDialogOpen(false);
          setDestinationTermId(null);
        }}
        termId={destinationTermId}
      />

      {/* Generate Stages Dialog */}
      <Dialog 
        open={generateStagesDialogOpen} 
        onClose={() => {
          setGenerateStagesDialogOpen(false);
          // Reset form
          setGenerateStagesForm({
            importFromSeason: null,
            leagueCycle: {
              enabled: false,
              hasTable: false,
              connectedToPreviousStage: false
            },
            groupStage: {
              enabled: false,
              numOfGroups: '',
              hasTable: false,
              useName: false,
              connectedToPreviousStage: false
            },
            bracketStage: {
              enabled: false,
              numOfCompetitors: '',
              isSeries: false,
              numOfGames: '',
              connectedToPreviousStage: false,
              connectedInBrackets: false,
              thirdPlaceGame: false
            }
          });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            Generate Stages
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => {
              setGenerateStagesDialogOpen(false);
              setGenerateStagesForm({
                importFromSeason: null,
                leagueCycle: {
                  enabled: false,
                  hasTable: false,
                  connectedToPreviousStage: false
                },
                groupStage: {
                  enabled: false,
                  numOfGroups: '',
                  hasTable: false,
                  useName: false,
                  connectedToPreviousStage: false
                },
                bracketStage: {
                  enabled: false,
                  numOfCompetitors: '',
                  isSeries: false,
                  numOfGames: '',
                  connectedToPreviousStage: false,
                  connectedInBrackets: false,
                  thirdPlaceGame: false
                }
              });
            }}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Import Stages from previous season */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Import Stages from previous season
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Season</InputLabel>
                  <Select
                    value={generateStagesForm.importFromSeason || ''}
                    label="Select Season"
                    onChange={(e) => setGenerateStagesForm(prev => ({ ...prev, importFromSeason: e.target.value }))}
                  >
                    {seasons
                      .filter(season => season.id !== selectedSeasonId && season.id)
                      .map(season => (
                        <MenuItem key={season.id} value={season.id}>
                          {`#${season.id} - ${season.name}`}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    // This is just for preview - actual import happens on Generate
                    if (generateStagesForm.importFromSeason) {
                      const sourceSeason = seasons.find(s => s.id === generateStagesForm.importFromSeason);
                      if (sourceSeason && sourceSeason.stages) {
                        setUpdateSnackbarMsg(`Will import ${sourceSeason.stages.length} stages from ${sourceSeason.name}`);
                        setUpdateSnackbarType('info');
                        setUpdateSnackbarOpen(true);
                      }
                    }
                  }}
                  disabled={!generateStagesForm.importFromSeason}
                  sx={{ minWidth: 140 }}
                >
                  Import Stages
                </Button>
              </Box>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #e0e0e0', my: 2 }} />
            </Grid>

            {/* Stages Types */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Stages Types
              </Typography>
              
              {/* League Cycle */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generateStagesForm.leagueCycle.enabled}
                      onChange={(e) => setGenerateStagesForm(prev => ({
                        ...prev,
                        leagueCycle: { ...prev.leagueCycle, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="League Cycle"
                  sx={{ fontWeight: 600, mb: 1 }}
                />
                {generateStagesForm.leagueCycle.enabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={generateStagesForm.leagueCycle.hasTable}
                          onChange={(e) => setGenerateStagesForm(prev => ({
                            ...prev,
                            leagueCycle: { ...prev.leagueCycle, hasTable: e.target.checked }
                          }))}
                        />
                      }
                      label="Has Table"
                      sx={{ fontSize: '0.875rem' }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={generateStagesForm.leagueCycle.connectedToPreviousStage}
                          onChange={(e) => setGenerateStagesForm(prev => ({
                            ...prev,
                            leagueCycle: { ...prev.leagueCycle, connectedToPreviousStage: e.target.checked }
                          }))}
                        />
                      }
                      label="Connected to previous stage"
                      sx={{ fontSize: '0.875rem', ml: 2 }}
                    />
                  </Box>
                )}
              </Box>

              {/* Group Stage */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generateStagesForm.groupStage.enabled}
                      onChange={(e) => setGenerateStagesForm(prev => ({
                        ...prev,
                        groupStage: { ...prev.groupStage, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Group Stage"
                  sx={{ fontWeight: 600, mb: 1 }}
                />
                {generateStagesForm.groupStage.enabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Number of groups
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={generateStagesForm.groupStage.numOfGroups}
                          onChange={(e) => setGenerateStagesForm(prev => ({
                            ...prev,
                            groupStage: { ...prev.groupStage, numOfGroups: e.target.value }
                          }))}
                          placeholder="Enter number"
                          fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mt: 3 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.groupStage.hasTable}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  groupStage: { ...prev.groupStage, hasTable: e.target.checked }
                                }))}
                              />
                            }
                            label="Has Table"
                            sx={{ fontSize: '0.875rem' }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.groupStage.useName}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  groupStage: { ...prev.groupStage, useName: e.target.checked }
                                }))}
                              />
                            }
                            label="Use Name"
                            sx={{ fontSize: '0.875rem', ml: 2 }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.groupStage.connectedToPreviousStage}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  groupStage: { ...prev.groupStage, connectedToPreviousStage: e.target.checked }
                                }))}
                              />
                            }
                            label="Connected to previous stage"
                            sx={{ fontSize: '0.875rem', ml: 2 }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>

              {/* Bracket Stage */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generateStagesForm.bracketStage.enabled}
                      onChange={(e) => setGenerateStagesForm(prev => ({
                        ...prev,
                        bracketStage: { ...prev.bracketStage, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Bracket Stage"
                  sx={{ fontWeight: 600, mb: 1 }}
                />
                {generateStagesForm.bracketStage.enabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Number of competitors
                        </Typography>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={generateStagesForm.bracketStage.numOfCompetitors}
                            onChange={(e) => setGenerateStagesForm(prev => ({
                              ...prev,
                              bracketStage: { ...prev.bracketStage, numOfCompetitors: e.target.value }
                            }))}
                            displayEmpty
                          >
                            <MenuItem value="" disabled>Select number</MenuItem>
                            <MenuItem value="2">2</MenuItem>
                            <MenuItem value="4">4</MenuItem>
                            <MenuItem value="8">8</MenuItem>
                            <MenuItem value="16">16</MenuItem>
                            <MenuItem value="32">32</MenuItem>
                            <MenuItem value="64">64</MenuItem>
                            <MenuItem value="128">128</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Number of games
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={generateStagesForm.bracketStage.numOfGames}
                          onChange={(e) => setGenerateStagesForm(prev => ({
                            ...prev,
                            bracketStage: { ...prev.bracketStage, numOfGames: e.target.value }
                          }))}
                          placeholder="Enter number"
                          fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.bracketStage.isSeries}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  bracketStage: { ...prev.bracketStage, isSeries: e.target.checked }
                                }))}
                              />
                            }
                            label="Is series"
                            sx={{ fontSize: '0.875rem' }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.bracketStage.connectedToPreviousStage}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  bracketStage: { ...prev.bracketStage, connectedToPreviousStage: e.target.checked }
                                }))}
                              />
                            }
                            label="Connected to previous stage"
                            sx={{ fontSize: '0.875rem' }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.bracketStage.connectedInBrackets}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  bracketStage: { ...prev.bracketStage, connectedInBrackets: e.target.checked }
                                }))}
                              />
                            }
                            label="Connected in brackets"
                            sx={{ fontSize: '0.875rem' }}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={generateStagesForm.bracketStage.thirdPlaceGame}
                                onChange={(e) => setGenerateStagesForm(prev => ({
                                  ...prev,
                                  bracketStage: { ...prev.bracketStage, thirdPlaceGame: e.target.checked }
                                }))}
                              />
                            }
                            label="3rd place game"
                            sx={{ fontSize: '0.875rem' }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Preview Section */}
          {generateStagesPreview && generateStagesPreview.stages.length > 0 && (
            <Box sx={{ mt: 4, pt: 3, borderTop: '2px solid #e0e0e0' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#2d3843' }}>
                Preview
              </Typography>
              
              {/* Summary */}
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Stages:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalStages}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Groups:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalGroups}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Games:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalGames}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Participants:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalParticipants}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Stages Hierarchy */}
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {generateStagesPreview.stages.map((stage, stageIndex) => (
                  <Box key={stageIndex} sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    {/* Stage Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#1976d2' }}>
                        {stage.name}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          backgroundColor: stage.type === 'group' ? '#e8f5e8' : '#fff3e0',
                          color: stage.type === 'group' ? '#2e7d32' : '#f57c00',
                        }}
                      >
                        {stage.type}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Games: {stage.games} | Participants: {stage.participants}
                      </Typography>
                    </Box>

                    {/* Groups */}
                    {stage.groups > 0 && (
                      <Box sx={{ ml: 3, mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Groups ({stage.groups}):
                        </Typography>
                        {stage.groupsData.map((group, groupIndex) => (
                          <Box key={groupIndex} sx={{ ml: 2, mb: 1, p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {group.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Participants: {group.participants} | Games: {group.games}
                            </Typography>
                            
                            {/* Participants (virtual) */}
                            <Box sx={{ ml: 2, mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                Participants (virtual):
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {Array.from({ length: Math.min(group.participants, 8) }).map((_, idx) => (
                                  <Box
                                    key={idx}
                                    sx={{
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 0.5,
                                      bgcolor: '#e3f2fd',
                                      fontSize: '0.7rem',
                                      color: '#1976d2'
                                    }}
                                  >
                                    Participant {idx + 1}
                                  </Box>
                                ))}
                                {group.participants > 8 && (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    +{group.participants - 8} more
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Games (virtual) */}
                            <Box sx={{ ml: 2, mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                Games (virtual):
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#666' }}>
                                {group.games} games will be created
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Games for knockout stages without groups */}
                    {stage.type === 'knockout' && stage.groups === 0 && (
                      <Box sx={{ ml: 3, mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Games ({stage.games}):
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#666', ml: 2 }}>
                          {stage.games} games will be created
                        </Typography>
                      </Box>
                    )}

                    {/* Participants for knockout stages */}
                    {stage.type === 'knockout' && stage.participants > 0 && (
                      <Box sx={{ ml: 3 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#2d3843' }}>
                          Participants ({stage.participants}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 2 }}>
                          {Array.from({ length: Math.min(stage.participants, 8) }).map((_, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 0.5,
                                bgcolor: '#e3f2fd',
                                fontSize: '0.7rem',
                                color: '#1976d2'
                              }}
                            >
                              Participant {idx + 1}
                            </Box>
                          ))}
                          {stage.participants > 8 && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              +{stage.participants - 8} more
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setGenerateStagesDialogOpen(false);
              setGenerateStagesPreview(null);
              setGenerateStagesForm({
                importFromSeason: null,
                leagueCycle: {
                  enabled: false,
                  hasTable: false,
                  connectedToPreviousStage: false
                },
                groupStage: {
                  enabled: false,
                  numOfGroups: '',
                  hasTable: false,
                  useName: false,
                  connectedToPreviousStage: false
                },
                bracketStage: {
                  enabled: false,
                  numOfCompetitors: '',
                  isSeries: false,
                  numOfGames: '',
                  connectedToPreviousStage: false,
                  connectedInBrackets: false,
                  thirdPlaceGame: false
                }
              });
            }}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (!selectedSeasonId || !competitionId || !selectedSeason) {
                setUpdateSnackbarMsg('Please select a season first');
                setUpdateSnackbarType('error');
                setUpdateSnackbarOpen(true);
                return;
              }

              if (!generateStagesPreview || generateStagesPreview.stages.length === 0) {
                setUpdateSnackbarMsg('Please configure at least one stage to generate');
                setUpdateSnackbarType('error');
                setUpdateSnackbarOpen(true);
                return;
              }

              // Open confirmation dialog
              setGenerateStagesConfirmDialogOpen(true);
            }}
            disabled={
              !generateStagesForm.importFromSeason && 
              !generateStagesForm.leagueCycle.enabled && 
              !generateStagesForm.groupStage.enabled && 
              !generateStagesForm.bracketStage.enabled
            }
            sx={{ bgcolor: '#1976d2' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Stages Confirmation Dialog */}
      <Dialog 
        open={generateStagesConfirmDialogOpen} 
        onClose={() => setGenerateStagesConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" fontWeight={600}>
            Confirm Generation
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setGenerateStagesConfirmDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You are about to generate the following:
          </Typography>

          {generateStagesPreview && (
            <Box>
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Stages:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalStages}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Groups:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalGroups}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Games:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalGames}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Participants:</Typography>
                    <Typography variant="h6" fontWeight={600}>{generateStagesPreview.summary.totalParticipants}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Stages to be created:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                {generateStagesPreview.stages.map((stage, idx) => (
                  <Typography key={idx} component="li" variant="body2" sx={{ mb: 0.5 }}>
                    {stage.name} ({stage.type}) - {stage.groups} groups, {stage.games} games, {stage.participants} participants
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This action will create all stages, groups, and related data in the database.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="outlined" 
            onClick={() => setGenerateStagesConfirmDialogOpen(false)}
            sx={{ borderColor: '#ccc', color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSeasonId || !competitionId || !selectedSeason) {
                setUpdateSnackbarMsg('Please select a season first');
                setUpdateSnackbarType('error');
                setUpdateSnackbarOpen(true);
                return;
              }

              try {
                const seasonNum = selectedSeason.SEASON_NUM || selectedSeason.seasonNum;
                const currentSeasonStartDate = new Date(selectedSeason.startDate);
                const currentSeasonEndDate = new Date(selectedSeason.endDate);
                
                // Calculate max stage number
                const maxStageNum = stages.length > 0 ? Math.max(...stages.map(s => s.stageNum || s.STAGE_NUM || 0)) : 0;
                let nextStageNum = maxStageNum + 1;
                const createdStages = [];

                // Helper function to adjust dates from source season to current season
                const adjustDate = (sourceDate, sourceSeasonStart, sourceSeasonEnd, currentSeasonStart, currentSeasonEnd) => {
                  if (!sourceDate) return null;
                  
                  const sourceDateObj = new Date(sourceDate);
                  const sourceMonth = sourceDateObj.getMonth();
                  const sourceDay = sourceDateObj.getDate();
                  const sourceHours = sourceDateObj.getHours();
                  const sourceMinutes = sourceDateObj.getMinutes();
                  
                  // Calculate year offset based on source season start
                  const sourceSeasonStartYear = sourceSeasonStart.getFullYear();
                  const currentSeasonStartYear = currentSeasonStart.getFullYear();
                  const yearOffset = currentSeasonStartYear - sourceSeasonStartYear;
                  
                  // Create adjusted date with same month/day but adjusted year
                  const adjustedDate = new Date(
                    currentSeasonStartYear + yearOffset,
                    sourceMonth,
                    sourceDay,
                    sourceHours,
                    sourceMinutes
                  );
                  
                  // If the adjusted date is before current season start, add one year
                  if (adjustedDate < currentSeasonStart) {
                    adjustedDate.setFullYear(adjustedDate.getFullYear() + 1);
                  }
                  
                  // If the adjusted date is after current season end, subtract one year
                  if (adjustedDate > currentSeasonEnd) {
                    adjustedDate.setFullYear(adjustedDate.getFullYear() - 1);
                  }
                  
                  // Final check: ensure date is within bounds
                  if (adjustedDate < currentSeasonStart) {
                    return currentSeasonStart.toISOString();
                  }
                  if (adjustedDate > currentSeasonEnd) {
                    return currentSeasonEnd.toISOString();
                  }
                  
                  return adjustedDate.toISOString();
                };

                // Option 1: Import stages from previous season
                if (generateStagesForm.importFromSeason) {
                  const sourceSeason = seasons.find(s => s.id === generateStagesForm.importFromSeason);
                  if (sourceSeason && sourceSeason.stages && sourceSeason.stages.length > 0) {
                    const sourceSeasonStartDate = new Date(sourceSeason.startDate);
                    const sourceSeasonEndDate = new Date(sourceSeason.endDate);
                    
                    for (const sourceStage of sourceSeason.stages) {
                      // Find or create term for stage name
                      const nameId = await findOrCreateTerm(
                        sourceStage.name,
                        48, // Stages Names category
                        'Stages Names'
                      );

                      // Adjust dates
                      const adjustedStartDate = adjustDate(
                        sourceStage.startDate,
                        sourceSeasonStartDate,
                        sourceSeasonEndDate,
                        currentSeasonStartDate,
                        currentSeasonEndDate
                      );
                      const adjustedEndDate = adjustDate(
                        sourceStage.endDate,
                        sourceSeasonStartDate,
                        sourceSeasonEndDate,
                        currentSeasonStartDate,
                        currentSeasonEndDate
                      );

                      // Create stage payload
                      const stagePayload = {
                        COMPETITION_ID: parseInt(competitionId),
                        SEASON_NUM: parseInt(seasonNum),
                        STAGE_NUM: nextStageNum++,
                        NAME_ID: nameId,
                        NUM_OF_GAMES: sourceStage.numOfGames || sourceStage.NUM_OF_GAMES || -1,
                        STAGE_TYPE: sourceStage.type === 'group' || sourceStage.STAGE_TYPE === 1 ? 1 : 2,
                        HAS_TABLE: sourceStage.hasTable || sourceStage.HAS_TABLE || false,
                        TABLE_WINNER_POINTS: 3,
                        TABLE_DRAW_POINTS: 1,
                        TABLE_LOSER_POINTS: 0,
                        TABLE_IS_EVEN_EXISTS: false,
                        USE_NAME: sourceStage.useName || false,
                        IS_FINAL: false,
                        START_DATE: adjustedStartDate,
                        END_DATE: adjustedEndDate,
                        TABLE_COUNT_ET_SCORE: false,
                        TABLE_COUNT_PEN_SCORE: false,
                        HAS_HOME_TABLE: false,
                        HAS_AWAY_TABLE: false,
                        PHASE: sourceStage.phase || sourceStage.PHASE || '',
                        PRE_VISUAL_BRACKETS: sourceStage.preVisualBrackets || sourceStage.PRE_VISUAL_BRACKETS || false,
                        INCLUDE_IN_BRACKET: sourceStage.includeInBracket || sourceStage.INCLUDE_IN_BRACKET || false,
                        IS_SERIES: sourceStage.isSeries || sourceStage.IS_SERIES || false,
                        FILTER_DIVISION: sourceStage.filterDivision || sourceStage.FILTER_DIVISION || false,
                        CONNECTED_IN_BRACKETS: sourceStage.connectedInBrackets || sourceStage.CONNECTED_IN_BRACKETS || false,
                        CONNECTED_TO_PREVIOUS_STAGE: sourceStage.connectedToPreviousStage || sourceStage.CONNECTED_TO_PREVIOUS_STAGE || false,
                      };

                      await api.createStage(stagePayload);
                      createdStages.push({ name: sourceStage.name, type: sourceStage.type });
                    }
                  }
                }

                // Option 2: Generate from templates
                // League Cycle
                if (generateStagesForm.leagueCycle.enabled) {
                  const nameId = await findOrCreateTerm('League Cycle', 48, 'Stages Names');
                  const stagePayload = {
                    COMPETITION_ID: parseInt(competitionId),
                    SEASON_NUM: parseInt(seasonNum),
                    STAGE_NUM: nextStageNum++,
                    NAME_ID: nameId,
                    NUM_OF_GAMES: -1,
                    STAGE_TYPE: 1, // Group type
                    HAS_TABLE: generateStagesForm.leagueCycle.hasTable,
                    TABLE_WINNER_POINTS: 3,
                    TABLE_DRAW_POINTS: 1,
                    TABLE_LOSER_POINTS: 0,
                    TABLE_IS_EVEN_EXISTS: false,
                    USE_NAME: false,
                    IS_FINAL: false,
                    START_DATE: currentSeasonStartDate.toISOString(),
                    END_DATE: currentSeasonEndDate.toISOString(),
                    TABLE_COUNT_ET_SCORE: false,
                    TABLE_COUNT_PEN_SCORE: false,
                    HAS_HOME_TABLE: false,
                    HAS_AWAY_TABLE: false,
                    PHASE: '',
                    PRE_VISUAL_BRACKETS: false,
                    INCLUDE_IN_BRACKET: false,
                    IS_SERIES: false,
                    FILTER_DIVISION: false,
                    CONNECTED_IN_BRACKETS: false,
                    CONNECTED_TO_PREVIOUS_STAGE: generateStagesForm.leagueCycle.connectedToPreviousStage,
                  };
                  await api.createStage(stagePayload);
                  createdStages.push({ name: 'League Cycle', type: 'group' });
                }

                // Group Stage
                if (generateStagesForm.groupStage.enabled) {
                  if (!generateStagesForm.groupStage.numOfGroups) {
                    setUpdateSnackbarMsg('Please enter number of groups for Group Stage');
                    setUpdateSnackbarType('error');
                    setUpdateSnackbarOpen(true);
                    return;
                  }
                  
                  const nameId = await findOrCreateTerm('Group Stage', 48, 'Stages Names');
                  const stagePayload = {
                    COMPETITION_ID: parseInt(competitionId),
                    SEASON_NUM: parseInt(seasonNum),
                    STAGE_NUM: nextStageNum++,
                    NAME_ID: nameId,
                    NUM_OF_GAMES: -1,
                    STAGE_TYPE: 1, // Group type
                    HAS_TABLE: generateStagesForm.groupStage.hasTable,
                    TABLE_WINNER_POINTS: 3,
                    TABLE_DRAW_POINTS: 1,
                    TABLE_LOSER_POINTS: 0,
                    TABLE_IS_EVEN_EXISTS: false,
                    USE_NAME: generateStagesForm.groupStage.useName,
                    IS_FINAL: false,
                    START_DATE: currentSeasonStartDate.toISOString(),
                    END_DATE: currentSeasonEndDate.toISOString(),
                    TABLE_COUNT_ET_SCORE: false,
                    TABLE_COUNT_PEN_SCORE: false,
                    HAS_HOME_TABLE: false,
                    HAS_AWAY_TABLE: false,
                    PHASE: '',
                    PRE_VISUAL_BRACKETS: false,
                    INCLUDE_IN_BRACKET: false,
                    IS_SERIES: false,
                    FILTER_DIVISION: false,
                    CONNECTED_IN_BRACKETS: false,
                    CONNECTED_TO_PREVIOUS_STAGE: generateStagesForm.groupStage.connectedToPreviousStage,
                  };
                  await api.createStage(stagePayload);
                  createdStages.push({ name: 'Group Stage', type: 'group' });
                  
                  // Create groups for Group Stage
                  const numGroups = parseInt(generateStagesForm.groupStage.numOfGroups);
                  const stageNum = nextStageNum - 1;
                  for (let i = 1; i <= numGroups; i++) {
                    const groupNameId = await findOrCreateTerm(`Group ${i}`, 49, 'Groups Names');
                    const groupPayload = {
                      COMPETITION_ID: parseInt(competitionId),
                      SEASON_NUM: parseInt(seasonNum),
                      STAGE_NUM: stageNum,
                      GROUP_NUM: i,
                      NAME_ID: groupNameId,
                      USE_NAME: false,
                      HAS_TABLE: generateStagesForm.groupStage.hasTable || false,
                      IS_SERIES: false,
                      GROUP_BY: false,
                      AUTONOMOUS: false,
                      TO_QUALIFY: null,
                      NUM_OF_GAMES: -1,
                      IS_FINAL: false
                    };
                    await api.createGroup(groupPayload);
                  }
                }

                // Bracket Stage
                if (generateStagesForm.bracketStage.enabled) {
                  if (!generateStagesForm.bracketStage.numOfCompetitors) {
                    setUpdateSnackbarMsg('Please select number of competitors for Bracket Stage');
                    setUpdateSnackbarType('error');
                    setUpdateSnackbarOpen(true);
                    return;
                  }
                  if (!generateStagesForm.bracketStage.numOfGames) {
                    setUpdateSnackbarMsg('Please enter number of games for Bracket Stage');
                    setUpdateSnackbarType('error');
                    setUpdateSnackbarOpen(true);
                    return;
                  }
                  
                  const nameId = await findOrCreateTerm('Bracket Stage', 48, 'Stages Names');
                  const stagePayload = {
                    COMPETITION_ID: parseInt(competitionId),
                    SEASON_NUM: parseInt(seasonNum),
                    STAGE_NUM: nextStageNum++,
                    NAME_ID: nameId,
                    NUM_OF_GAMES: parseInt(generateStagesForm.bracketStage.numOfGames),
                    STAGE_TYPE: 2, // Knockout type
                    HAS_TABLE: false,
                    TABLE_WINNER_POINTS: 3,
                    TABLE_DRAW_POINTS: 1,
                    TABLE_LOSER_POINTS: 0,
                    TABLE_IS_EVEN_EXISTS: false,
                    USE_NAME: false,
                    IS_FINAL: false,
                    START_DATE: currentSeasonStartDate.toISOString(),
                    END_DATE: currentSeasonEndDate.toISOString(),
                    TABLE_COUNT_ET_SCORE: false,
                    TABLE_COUNT_PEN_SCORE: false,
                    HAS_HOME_TABLE: false,
                    HAS_AWAY_TABLE: false,
                    PHASE: '',
                    PRE_VISUAL_BRACKETS: false,
                    INCLUDE_IN_BRACKET: false,
                    IS_SERIES: generateStagesForm.bracketStage.isSeries,
                    FILTER_DIVISION: false,
                    CONNECTED_IN_BRACKETS: generateStagesForm.bracketStage.connectedInBrackets,
                    CONNECTED_TO_PREVIOUS_STAGE: generateStagesForm.bracketStage.connectedToPreviousStage,
                  };
                  await api.createStage(stagePayload);
                  createdStages.push({ name: 'Bracket Stage', type: 'knockout' });
                }

                // Reload structure data
                if (handleStructureReload) {
                  await handleStructureReload();
                }

                // Show success message
                const stagesCount = createdStages.length;
                setUpdateSnackbarMsg(`Successfully generated ${stagesCount} stage(s)!`);
                setUpdateSnackbarType('success');
                setUpdateSnackbarOpen(true);

                // Close dialogs and reset form
                setGenerateStagesConfirmDialogOpen(false);
                setGenerateStagesDialogOpen(false);
                setGenerateStagesPreview(null);
                setGenerateStagesForm({
                  importFromSeason: null,
                  leagueCycle: {
                    enabled: false,
                    hasTable: false,
                    connectedToPreviousStage: false
                  },
                  groupStage: {
                    enabled: false,
                    numOfGroups: '',
                    hasTable: false,
                    useName: false,
                    connectedToPreviousStage: false
                  },
                  bracketStage: {
                    enabled: false,
                    numOfCompetitors: '',
                    isSeries: false,
                    numOfGames: '',
                    connectedToPreviousStage: false,
                    connectedInBrackets: false,
                    thirdPlaceGame: false
                  }
                });
              } catch (error) {
                console.error('Failed to generate stages:', error);
                setUpdateSnackbarMsg(`Failed to generate stages: ${error.message}`);
                setUpdateSnackbarType('error');
                setUpdateSnackbarOpen(true);
              }
            }}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
          >
            APPROVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Standings Confirmation Dialog */}
      <Dialog
        open={deleteStandingsDialogOpen}
        onClose={() => setDeleteStandingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          m: 0,
          p: 2,
          bgcolor: '#fff3e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #ff9800'
        }}>
          <Typography variant="h6" fontWeight={600} color="#e65100">
            ⚠️ Delete Standings Table
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setDeleteStandingsDialogOpen(false)}
            sx={{ color: '#e65100' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#d84315' }}>
            <strong>Warning:</strong> You are about to delete the standings table for this stage.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This action will:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Remove the "Has Table" setting from the current stage
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Delete all standings data from the database
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Close the Manage Standings dialog
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#d84315', fontWeight: 600 }}>
            This action cannot be undone. Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteStandingsDialogOpen(false)}
            sx={{ borderColor: '#666', color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteStandings}
            sx={{ 
              bgcolor: '#f44336',
              '&:hover': { bgcolor: '#d32f2f' }
            }}
          >
            Delete Standings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StructureTab; 