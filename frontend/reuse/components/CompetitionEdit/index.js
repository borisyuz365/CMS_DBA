import React from 'react';
import {
  Typography, Box, Button, TextField, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ImageIcon from '@mui/icons-material/Image';
import TermEditModal from '../../TermEditModal';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

// Import the tabs (we'll create these next)
import ConfigurationsTab from './ConfigurationsTab';
import StructureTab from './StructureTab';

export default function CompetitionEdit() {
  const { id } = useParams();
  const [comp, setComp] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [tab, setTab] = React.useState(0);
  const [termsDialogOpen, setTermsDialogOpen] = React.useState(false);
  const [seasonDialogOpen, setSeasonDialogOpen] = React.useState(false);
  const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = React.useState(false);
  const [competitionTermId, setCompetitionTermId] = React.useState(null);
  const [seasonTermId, setSeasonTermId] = React.useState(null);
  const [stageTermId, setStageTermId] = React.useState(null);
  const [updateSnackbarOpen, setUpdateSnackbarOpen] = React.useState(false);
  const [updateSnackbarType, setUpdateSnackbarType] = React.useState('success');
  const [updateSnackbarMsg, setUpdateSnackbarMsg] = React.useState('');
  const [currentSeasonName, setCurrentSeasonName] = React.useState('');
  const [currentStageName, setCurrentStageName] = React.useState('');


  // Global competition table settings (loaded from DB)
  const [competitionTableSettings, setCompetitionTableSettings] = React.useState({
    winnerPoints: 3,
    drawPoints: 1,
    loserPoints: 0,
    winnerPointsAfterExtraTime: 2,
    loserPointsAfterExtraTime: 1,
    winnerPointsAfterPenalties: 2,
    loserPointsAfterPenalties: 1,
    orderBy: '',
    orderParameters: [
      { field: 'points', direction: 'desc' },
      { field: 'goalDifference', direction: 'desc' },
      { field: 'headToHead', direction: 'desc' },
      { field: 'goalsFor', direction: 'desc' },
      { field: 'wins', direction: 'desc' }
    ],
    tableSupportInEven: false,
    countExtraTimeScore: true,
    countPenaltyScore: true,
  });

  // Update competitionTableSettings when comp loads
  React.useEffect(() => {
    if (comp) {
      setCompetitionTableSettings(prev => ({
        ...prev,
        winnerPoints: comp.TABLE_WINNER_POINTS ?? prev.winnerPoints,
        drawPoints: comp.TABLE_DRAW_POINTS ?? prev.drawPoints,
        loserPoints: comp.TABLE_LOSER_POINTS ?? prev.loserPoints,
        tableSupportInEven: comp.TABLE_IS_EVEN_EXISTS ?? prev.tableSupportInEven,
        countExtraTimeScore: comp.TABLE_COUNT_ET_SCORE ?? prev.countExtraTimeScore,
        countPenaltyScore: comp.TABLE_COUNT_PEN_SCORE ?? prev.countPenaltyScore,
      }));
    }
  }, [comp]);

  // Global competition round name settings
  const [competitionRoundName, setCompetitionRoundName] = React.useState(false);
  const [competitionRoundNameValue, setCompetitionRoundNameValue] = React.useState('');
  
  // Round name terms dialog
  const [roundNameTermsDialogOpen, setRoundNameTermsDialogOpen] = React.useState(false);
  const [roundNameTermId, setRoundNameTermId] = React.useState(null);

  // Bracket final description terms dialog
  const [bracketFinalDescTermsDialogOpen, setBracketFinalDescTermsDialogOpen] = React.useState(false);
  const [bracketFinalDescTermId, setBracketFinalDescTermId] = React.useState(null);

  // Load competition data from API
  React.useEffect(() => {
    const fetchCompetition = async () => {
      if (!id) {
        setError('No competition ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.getCompetition(id);
        if (response.success && response.data) {
          // Transform API data to match component expectations
          const competitionData = {
            id: response.data.COMPETITION_ID || response.data.id,
            name: response.data.name || 'Unknown',
            season: response.data.CURRENT_SEASON ? `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` : '',
            stage: response.data.CURRENT_STAGE || '',
            country: response.data.country || 'Unknown',
            sport: response.data.sport || 'Unknown',
            competitorType: 'Team', // Default, can be enhanced later
            competitionType: response.data.COMPETITION_TYPE === 1 ? 'Tournament' : 'League',
            gender: response.data.gender || (response.data.GENDER === 1 ? 'Male' : response.data.GENDER === 2 ? 'Female' : 'Other'),
            standingType: '',
            logo: '',
            mainColor: response.data.mainColor || '#000000',
            secondaryColor: response.data.secondaryColor || '',
          ...response.data // Include all other fields
        };
        setComp(competitionData);
        setSavedComp(JSON.parse(JSON.stringify(competitionData))); // Initialize savedComp
        } else {
          throw new Error('Failed to load competition');
        }
      } catch (err) {
        console.error('Failed to fetch competition:', err);
        setError(err.message || 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [id]);

  // Helper function to load term name by ID and category
  // Helper function to find or create a term
  const findOrCreateTerm = async (engValue, categoryId, categoryName) => {
    if (!engValue || !engValue.trim()) {
      throw new Error('Term value is required');
    }
    
    // Check if term already exists
    const searchResponse = await api.findTermByCategoryAndValue(categoryId, engValue.trim());
    
    if (searchResponse.success && searchResponse.exists && searchResponse.data) {
      // Term exists, return existing term ID
      return searchResponse.data.id;
    }
    
    // Term doesn't exist, create new one
    const termData = {
      categoryId: categoryId,
      category: categoryName,
      aliasName: null,
      fatherTerm: null,
      values: [
        {
          languageId: 1, // English
          value: engValue.trim(),
          isDefault: true,
          status: 'Approved',
          context: '',
          block: false,
          sequence: 1
        }
      ],
      valsCount: 1,
      engValue: engValue.trim(),
      langValue: engValue.trim()
    };
    
    const termResponse = await api.createTerm(termData);
    if (!termResponse.success || !termResponse.data) {
      throw new Error('Failed to create term');
    }
    
    return termResponse.data.id;
  };

  const loadTermName = async (nameId, expectedCategoryId, fallbackName) => {
    if (!nameId) {
      return fallbackName;
    }

    try {
      const termResponse = await api.getTerm(nameId);
      if (termResponse.success && termResponse.data) {
        const term = termResponse.data;
        // If expectedCategoryId is provided, only use term if it's in the correct category
        // Otherwise, use any term (for groups that might not have specific category)
        if (!expectedCategoryId || term.categoryId === expectedCategoryId) {
          const termName = term.engValue || 
            (term.values?.find(v => v.languageId === 1)?.value) ||
            (term.values?.find(v => v.isDefault)?.value);
          if (termName) {
            return termName;
          }
        }
      }
    } catch (err) {
      console.error(`Failed to load term ${nameId}:`, err);
    }
    
    return fallbackName;
  };

  // Load seasons, stages, groups, and phases from API
  React.useEffect(() => {
    const loadStructureData = async () => {
      if (!id || !comp) return;

      try {
        setLoadingSeasons(true);
        
        // Load seasons for this competition
        const seasonsResponse = await api.getSeasons(id);
        if (seasonsResponse.success && seasonsResponse.data) {
          const seasonsData = await Promise.all(
            seasonsResponse.data.map(async (season) => {
              // Load season name from terms (categoryId 47 = Seasons Names)
              const seasonName = await loadTermName(
                season.NAME_ID, 
                47, 
                `Season ${season.SEASON_NUM}`
              );

              // Load stages for this season
              const stagesResponse = await api.getStages(id, season.SEASON_NUM);
              let stages = [];
              if (stagesResponse.success && stagesResponse.data) {
                stages = await Promise.all(
                  stagesResponse.data.map(async (stage) => {
                    // Load stage name from terms (categoryId 48 = Stages Names)
                    const stageName = await loadTermName(
                      stage.NAME_ID,
                      48,
                      `Stage ${stage.STAGE_NUM}`
                    );

                    // Load groups for this stage
                    const groupsResponse = await api.getGroups(id, season.SEASON_NUM, stage.STAGE_NUM);
                    let groups = [];
                    if (groupsResponse.success && groupsResponse.data) {
                      groups = await Promise.all(
                        groupsResponse.data.map(async (group) => {
                          // Load group name from terms (categoryId 49 = Groups Names)
                          const groupName = await loadTermName(
                            group.NAME_ID,
                            49, // Groups Names category
                            `Group ${group.GROUP_NUM}`
                          );

                          return {
                            id: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}-${group.GROUP_NUM}`,
                            groupNum: group.GROUP_NUM,
                            nameId: group.NAME_ID,
                            name: groupName,
                            stageId: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}`,
                            ...group
                          };
                        })
                      );
                    }

                    return {
                      id: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}`,
                      stageNum: stage.STAGE_NUM,
                      nameId: stage.NAME_ID,
                      name: stageName,
                      type: stage.STAGE_TYPE === 1 ? 'group' : 'knockout',
                      order: stage.STAGE_NUM,
                      isCurrent: false, // TODO: Determine from competition data
                      hasTable: stage.HAS_TABLE || false,
                      preVisualBrackets: false,
                      includeInBracket: false,
                      isSeries: false,
                      filterDivision: false,
                      numOfGames: stage.NUM_OF_GAMES || -1,
                      connectedInBrackets: false,
                      connectedToPreviousStage: false,
                      phase: '',
                      startDate: stage.START_DATE ? formatDateTimeForInput(stage.START_DATE) : '',
                      endDate: stage.END_DATE ? formatDateTimeForInput(stage.END_DATE) : '',
                      groups: groups,
                      ...stage
                    };
                  })
                );
              }

              // Load phases for this season
              const phasesResponse = await api.getPhases(id, season.SEASON_NUM);
              let phases = [];
              if (phasesResponse.success && phasesResponse.data) {
                phases = phasesResponse.data.map(phase => ({
                  id: `${id}-${season.SEASON_NUM}-${phase.PHASE_NUM}`,
                  phaseNum: phase.PHASE_NUM,
                  nameId: phase.PHASE_NAME_ID,
                  ...phase
                }));
              }

              return {
                id: `${id}-${season.SEASON_NUM}`,
                seasonNum: season.SEASON_NUM,
                nameId: season.NAME_ID,
                name: seasonName,
                isCurrent: comp.CURRENT_SEASON === season.SEASON_NUM,
                startDate: season.START_DATE,
                endDate: season.END_DATE,
                stages: stages,
                teams: [],
                phases: phases,
                // Keep original DB fields for reference
                TABLE_WINNER_POINTS: season.TABLE_WINNER_POINTS,
                TABLE_DRAW_POINTS: season.TABLE_DRAW_POINTS,
                TABLE_LOSER_POINTS: season.TABLE_LOSER_POINTS,
                TABLE_IS_EVEN_EXISTS: season.TABLE_IS_EVEN_EXISTS,
                TABLE_COUNT_ET_SCORE: season.TABLE_COUNT_ET_SCORE,
                TABLE_COUNT_PEN_SCORE: season.TABLE_COUNT_PEN_SCORE,
                tableSettings: {
                  winnerPoints: season.TABLE_WINNER_POINTS ?? 3,
                  drawPoints: season.TABLE_DRAW_POINTS ?? 1,
                  loserPoints: season.TABLE_LOSER_POINTS ?? 0,
                  isEvenExists: season.TABLE_IS_EVEN_EXISTS ?? false,
                  countExtraTimeScore: season.TABLE_COUNT_ET_SCORE ?? false,
                  countPenaltyScore: season.TABLE_COUNT_PEN_SCORE ?? false,
                  orderParameters: [], // Will be loaded from DB if exists
                },
                seasonConfig: {
                  seasonKey: '',
                  startDate: season.START_DATE ? formatDateTimeForInput(season.START_DATE) : '',
                  endDate: season.END_DATE ? formatDateTimeForInput(season.END_DATE) : '',
                  useName: season.USE_NAME || false,
                  showTopAthletes: season.SHOW_TOP_ATHLETES || false,
                  hasBrackets: season.HAS_BRACKETS || false,
                  hasTable: season.HAS_TABLE || false,
                  hasInfoCard: season.SHOW_INFO_CARD || false,
                  roundName: false,
                  hasSeed: false,
                  showTopTeamsTab: false,
                  showOutrightsTab: false,
                  presentCompetitionRules: false,
                  showMatches: season.SHOW_MATCHES || false,
                  roundNameValue: '',
                  transfersWindowStartDate: '',
                  transfersWindowEndDate: '',
                },
                ...season
              };
            })
          );

          setSeasons(seasonsData);
          setSavedSeasons(JSON.parse(JSON.stringify(seasonsData))); // Deep copy
          
          // Set current season as selected (or first season if no current season)
          if (seasonsData.length > 0) {
            const currentSeason = seasonsData.find(s => s.isCurrent) || seasonsData[0];
            setSelectedSeasonId(currentSeason.id);
          }
        }
      } catch (err) {
        console.error('Failed to load structure data:', err);
        setUpdateSnackbarType('error');
        setUpdateSnackbarMsg('Failed to load seasons, stages, and groups');
        setUpdateSnackbarOpen(true);
      } finally {
        setLoadingSeasons(false);
      }
    };

    loadStructureData();
  }, [id, comp]);

  // Helper function for datetime formatting
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Centralized form state
  const initialFormState = React.useMemo(() => {
    if (!comp) {
      return {
        country: '',
        sport: '',
        competitorType: 'Team',
        competitionType: 'Tournament',
        fatherCompetition: '',
        gender: 'Male',
        standingType: '',
        updatePriorityAbove: '',
        buzzItemType: '',
        h2hLayout: '',
        subSportType: '',
        mainColor: '#000000',
        secondaryColor: '',
        checkboxes: {
          updateResultSecondScanner: false,
      automaticStatusProgress: false,
      automaticStartOfGames: false,
      enableDashboardBuzz: false,
      hideOnCatalog: false,
      hideOnSearch: false,
      autoTransferWaitApproval: false,
      calculateWinProbabilityInsights: false,
      calculateLiveWinProbability: false,
      showDisconnectedPlayers: false,
      dontDisplayFathersH2h: false,
      autoProcessAddedTime: false,
      displayTopPrefers: false,
      supportTrends: false,
      hideCompetitionStats: false,
      hideFromPopularWhenNoActive: false,
      promoteDuringActiveSeason: false,
      requireFormation: false,
      lineupsNotificationDelay: false,
      supportCompetitionDashboard: false,
      supportPastFinalsStandings: false,
      hideLmtInCompetitionGames: false,
      gameSummaryNotifications: false,
      allowNotifications: false,
      hidePlayerGameCard: false,
      supportPropsBetting: false,
      supportSpecialOutrights: false,
      supportInsightsPopupForProps: false,
      supportTieOn90: false,
      recentlyWonTrophyCard: false,
      promoteNewTrophy: false,
      predictableLineupsRestriction: false,
      bracketFinal: false,
      roundName: false,
      gameSummaryPopup: false,
    },
    topAthletePct: '60',
    currentRound: '-1',
    tier: '1',
    gameSummaryRelevancy: '72',
    selectDescription: '',
    selectRoundName: '',
    image: '',
    displayTopPreformersStatus: '',
    predictableLineupsRestrictionValue: '',
    promoteNewTrophyValue: '',
    recentlyWonTrophyCardValue: '',
    teamFoulsLimit: '5',
    personalFoulsLimit: '6',
    lineupsNotificationDelayValue: '',
    bracketFinalDescription: '',
    recognitionTimeSpan: '',
    articleTimeSpanBefore: '',
    articleTimeSpanAfter: '',
        premiumSocialTimeSpanBefore: '',
        premiumSocialTimeSpanAfter: '',
        specialOutrightsStartDate: '',
        specialOutrightsEndDate: '',
      };
    }
    
    return {
      country: comp.country || '',
      sport: comp.sport || '',
      competitorType: comp.competitorType || 'Team',
      competitionType: comp.competitionType || 'Tournament',
      fatherCompetition: comp.FATHER_COMPETITION || comp.fatherCompetition || '',
      gender: comp.gender || 'Male',
      standingType: comp.standingType || '',
      updatePriorityAbove: comp.ALWAYS_UPDATE_ABOVE_PRIORITY ? String(comp.ALWAYS_UPDATE_ABOVE_PRIORITY) : '',
      buzzItemType: comp.BUZZ_ITEM_TYPE || comp.buzzItemType || '',
      h2hLayout: comp.H2H_LAYOUT || comp.h2hLayout || '',
      subSportType: comp.SUB_SPORT_TYPE || comp.subSportType || '',
      surfaceType: comp.SURFACE_TYPE || comp.surfaceType || '',
      mainColor: comp.mainColor || '#000000',
      secondaryColor: comp.secondaryColor || '',
      scoresUpdatePolicy: comp.SCORES_UPDATE_POLICY ? String(comp.SCORES_UPDATE_POLICY) : '',
      checkboxes: {
        updateResultSecondScanner: (comp.UPDATE_RESULT_SECOND_SCANNER ?? comp.updateResultSecondScanner) ?? false,
        automaticStatusProgress: (comp.AUTOMATIC_STATUS_PROGRESS ?? comp.automaticStatusProgress) ?? false,
        automaticStartOfGames: comp.AUTO_START_GAMES ?? false,
        enableDashboardBuzz: (comp.ENABLE_DASHBOARD_BUZZ ?? comp.enableDashboardBuzz) ?? false,
        hideOnCatalog: (comp.HIDE_ON_CATALOG ?? comp.hideOnCatalog) ?? false,
        hideOnSearch: (comp.HIDE_ON_SEARCH ?? comp.hideOnSearch) ?? false,
        autoTransferWaitApproval: (comp.AUTO_TRANSFER_WAIT_APPROVAL ?? comp.autoTransferWaitApproval) ?? false,
        calculateWinProbabilityInsights: (comp.CALCULATE_WIN_PROBABILITY_INSIGHTS ?? comp.calculateWinProbabilityInsights) ?? false,
        calculateLiveWinProbability: (comp.CALCULATE_LIVE_WIN_PROBABILITY ?? comp.calculateLiveWinProbability) ?? false,
        showDisconnectedPlayers: (comp.SHOW_DISCONNECTED_PLAYERS ?? comp.showDisconnectedPlayers) ?? false,
        dontDisplayFathersH2h: (comp.DONT_DISPLAY_FATHERS_H2H ?? comp.dontDisplayFathersH2h) ?? false,
        autoProcessAddedTime: (comp.AUTO_PROCESS_ADDED_TIME ?? comp.autoProcessAddedTime) ?? false,
        displayTopPrefers: (comp.DISPLAY_TOP_PREFERS ?? comp.displayTopPrefers) ?? false,
        supportTrends: (comp.SUPPORT_TRENDS ?? comp.supportTrends) ?? false,
        hideCompetitionStats: (comp.HIDE_COMPETITION_STATS ?? comp.hideCompetitionStats) ?? false,
        hideFromPopularWhenNoActive: (comp.HIDE_FROM_POPULAR_WHEN_NO_ACTIVE ?? comp.hideFromPopularWhenNoActive) ?? false,
        promoteDuringActiveSeason: (comp.PROMOTE_DURING_ACTIVE_SEASON ?? comp.promoteDuringActiveSeason) ?? false,
        requireFormation: (comp.REQUIRE_FORMATION ?? comp.requireFormation) ?? false,
        lineupsNotificationDelay: (comp.LINEUPS_NOTIFICATION_DELAY ?? comp.lineupsNotificationDelay) ?? false,
        supportCompetitionDashboard: (comp.SUPPORT_COMPETITION_DASHBOARD ?? comp.supportCompetitionDashboard) ?? false,
        supportPastFinalsStandings: (comp.SUPPORT_PAST_FINALS_STANDINGS ?? comp.supportPastFinalsStandings) ?? false,
        hideLmtInCompetitionGames: (comp.HIDE_LMT_IN_COMPETITION_GAMES ?? comp.hideLmtInCompetitionGames) ?? false,
        gameSummaryNotifications: (comp.GAME_SUMMARY_NOTIFICATIONS ?? comp.gameSummaryNotifications) ?? false,
        allowNotifications: (comp.ALLOW_NOTIFICATIONS ?? comp.allowNotifications) ?? false,
        hidePlayerGameCard: (comp.HIDE_PLAYER_GAME_CARD ?? comp.hidePlayerGameCard) ?? false,
        supportPropsBetting: (comp.SUPPORT_PROPS_BETTING ?? comp.supportPropsBetting) ?? false,
        supportSpecialOutrights: (comp.SUPPORT_SPECIAL_OUTRIGHTS ?? comp.supportSpecialOutrights) ?? false,
        supportInsightsPopupForProps: (comp.SUPPORT_INSIGHTS_POPUP_FOR_PROPS ?? comp.supportInsightsPopupForProps) ?? false,
        supportTieOn90: (comp.SUPPORT_TIE_ON_90 ?? comp.supportTieOn90) ?? false,
        recentlyWonTrophyCard: (comp.RECENTLY_WON_TROPHY_CARD ?? comp.recentlyWonTrophyCard) ?? false,
        promoteNewTrophy: (comp.PROMOTE_NEW_TROPHY ?? comp.promoteNewTrophy) ?? false,
        predictableLineupsRestriction: (comp.PREDICTABLE_LINEUPS_RESTRICTION ?? comp.predictableLineupsRestriction) ?? false,
        bracketFinal: (comp.BRACKET_FINAL ?? comp.bracketFinal) ?? false,
        roundName: (comp.ROUND_NAME ?? comp.roundName) ?? false,
        gameSummaryPopup: (comp.GAME_SUMMARY_POPUP ?? comp.gameSummaryPopup) ?? false,
        supportFansRate: (comp.SUPPORT_FANS_RATE ?? comp.supportFansRate) ?? false,
      },
      topAthletePct: comp.TOP_ATHLETE_PCT ? String(comp.TOP_ATHLETE_PCT) : (comp.topAthletePct ? String(comp.topAthletePct) : '60'),
      currentRound: comp.CURRENT_ROUND !== undefined ? String(comp.CURRENT_ROUND) : (comp.currentRound ? String(comp.currentRound) : '-1'),
      tier: comp.TIER ? String(comp.TIER) : (comp.tier ? String(comp.tier) : '1'),
      gameSummaryRelevancy: comp.GAME_SUMMARY_RELEVANCY ? String(comp.GAME_SUMMARY_RELEVANCY) : (comp.gameSummaryRelevancy ? String(comp.gameSummaryRelevancy) : '72'),
      selectDescription: comp.SELECT_DESCRIPTION || comp.selectDescription || '',
      selectRoundName: comp.SELECT_ROUND_NAME || comp.selectRoundName || '',
      image: comp.IMAGE || comp.image || '',
      displayTopPreformersStatus: comp.DISPLAY_TOP_PREFORMERS_STATUS || comp.displayTopPreformersStatus || '',
      predictableLineupsRestrictionValue: comp.PREDICTABLE_LINEUPS_RESTRICTION_VALUE || comp.predictableLineupsRestrictionValue || '',
      promoteNewTrophyValue: comp.PROMOTE_NEW_TROPHY_VALUE ? String(comp.PROMOTE_NEW_TROPHY_VALUE) : (comp.promoteNewTrophyValue ? String(comp.promoteNewTrophyValue) : ''),
      recentlyWonTrophyCardValue: comp.RECENTLY_WON_TROPHY_CARD_VALUE ? String(comp.RECENTLY_WON_TROPHY_CARD_VALUE) : (comp.recentlyWonTrophyCardValue ? String(comp.recentlyWonTrophyCardValue) : ''),
      teamFoulsLimit: comp.TEAM_FOULS_LIMIT ? String(comp.TEAM_FOULS_LIMIT) : (comp.teamFoulsLimit ? String(comp.teamFoulsLimit) : '5'),
      personalFoulsLimit: comp.PERSONAL_FOULS_LIMIT ? String(comp.PERSONAL_FOULS_LIMIT) : (comp.personalFoulsLimit ? String(comp.personalFoulsLimit) : '6'),
      lineupsNotificationDelayValue: comp.LINEUPS_NOTIFICATION_DELAY_VALUE ? String(comp.LINEUPS_NOTIFICATION_DELAY_VALUE) : (comp.lineupsNotificationDelayValue ? String(comp.lineupsNotificationDelayValue) : ''),
      bracketFinalDescription: comp.BRACKET_FINAL_DESCRIPTION || comp.bracketFinalDescription || '',
      recognitionTimeSpan: comp.RECOGNITION_TIME_SPAN ? String(comp.RECOGNITION_TIME_SPAN) : (comp.recognitionTimeSpan ? String(comp.recognitionTimeSpan) : ''),
      articleTimeSpanBefore: comp.ARTICLE_TIME_SPAN_BEFORE ? String(comp.ARTICLE_TIME_SPAN_BEFORE) : (comp.articleTimeSpanBefore ? String(comp.articleTimeSpanBefore) : ''),
      articleTimeSpanAfter: comp.ARTICLE_TIME_SPAN_AFTER ? String(comp.ARTICLE_TIME_SPAN_AFTER) : (comp.articleTimeSpanAfter ? String(comp.articleTimeSpanAfter) : ''),
      premiumSocialTimeSpanBefore: comp.PREMIUM_SOCIAL_TIME_SPAN_BEFORE ? String(comp.PREMIUM_SOCIAL_TIME_SPAN_BEFORE) : (comp.premiumSocialTimeSpanBefore ? String(comp.premiumSocialTimeSpanBefore) : ''),
      premiumSocialTimeSpanAfter: comp.PREMIUM_SOCIAL_TIME_SPAN_AFTER ? String(comp.PREMIUM_SOCIAL_TIME_SPAN_AFTER) : (comp.premiumSocialTimeSpanAfter ? String(comp.premiumSocialTimeSpanAfter) : ''),
      specialOutrightsStartDate: comp.SPECIAL_OUTRIGHTS_START_DATE || '',
      specialOutrightsEndDate: comp.SPECIAL_OUTRIGHTS_END_DATE || '',
    };
  }, [comp]);

  const [formState, setFormState] = React.useState(initialFormState);
  const [savedFormState, setSavedFormState] = React.useState(initialFormState);
  const [reloadFormLoading, setReloadFormLoading] = React.useState(false);

  // Update formState when comp changes
  React.useEffect(() => {
    if (comp) {
      setFormState(initialFormState);
      setSavedFormState(initialFormState);
    }
  }, [comp, initialFormState]);

  // Demo descriptions for Bracket Final Description dropdown
  const [bracketDescriptions, setBracketDescriptions] = React.useState([
    'Final',
    'Grand Finale',
    'Ultimate Match',
  ]);
  const [bracketFinalDescValue, setBracketFinalDescValue] = React.useState('');
  const [bracketFinalDescDialogOpen, setBracketFinalDescDialogOpen] = React.useState(false);

  // Demo round names for Round Name dropdown
  const [roundNames, setRoundNames] = React.useState([
    'Quarterfinal',
    'Semifinal',
    'Final',
  ]);
  const [roundNameValue, setRoundNameValue] = React.useState('');
  const [roundNameDialogOpen, setRoundNameDialogOpen] = React.useState(false);

  // Seasons state - will be loaded from API
  const [seasons, setSeasons] = React.useState([]);
  const [savedSeasons, setSavedSeasons] = React.useState([]);
  const [savedComp, setSavedComp] = React.useState(null);
  const [loadingSeasons, setLoadingSeasons] = React.useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = React.useState(1);
  const [selectedStageId, setSelectedStageId] = React.useState(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState(null);
  const [selectedInSeason, setSelectedInSeason] = React.useState([]);
  const [selectedNotInSeason, setSelectedNotInSeason] = React.useState([]);

  const [reloadStructureLoading, setReloadStructureLoading] = React.useState(false);

  // Reload season and stage names when seasons data changes - ONLY from DB terms
  React.useEffect(() => {
    const loadCurrentNames = async () => {
      if (!comp || !seasons.length) {
        setCurrentSeasonName('');
        setCurrentStageName('');
        return;
      }

      // Load current season name - ONLY from DB term (category 47)
      if (comp.CURRENT_SEASON) {
        const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
        if (currentSeason && currentSeason.nameId) {
          try {
            const seasonTermResponse = await api.getTerm(currentSeason.nameId);
            if (seasonTermResponse.success && seasonTermResponse.data) {
              const term = seasonTermResponse.data;
              // Only use term if it's in the correct category (47 = Seasons Names)
              if (term.categoryId === 47) {
                const seasonName = term.engValue || 
                  (term.values?.find(v => v.languageId === 1)?.value) ||
                  (term.values?.find(v => v.isDefault)?.value);
                if (seasonName) {
                  setCurrentSeasonName(seasonName);
                } else {
                  setCurrentSeasonName(''); // No valid term value
                }
              } else {
                setCurrentSeasonName(''); // Term exists but wrong category
              }
            } else {
              setCurrentSeasonName(''); // Term not found
            }
          } catch (err) {
            console.error('Failed to load season term:', err);
            setCurrentSeasonName(''); // Error loading term
          }
        } else {
          setCurrentSeasonName(''); // No NAME_ID
        }
      } else {
        setCurrentSeasonName('');
      }

      // Load current stage name - ONLY from DB term (category 48)
      if (comp.CURRENT_STAGE && comp.CURRENT_SEASON) {
        const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
        if (currentSeason) {
          const currentStage = currentSeason.stages?.find(s => s.stageNum === comp.CURRENT_STAGE);
          if (currentStage && currentStage.nameId) {
            try {
              const stageTermResponse = await api.getTerm(currentStage.nameId);
              if (stageTermResponse.success && stageTermResponse.data) {
                const term = stageTermResponse.data;
                // Only use term if it's in the correct category (48 = Stages Names)
                if (term.categoryId === 48) {
                  const stageName = term.engValue || 
                    (term.values?.find(v => v.languageId === 1)?.value) ||
                    (term.values?.find(v => v.isDefault)?.value);
                  if (stageName) {
                    setCurrentStageName(stageName);
                  } else {
                    setCurrentStageName(''); // No valid term value
                  }
                } else {
                  setCurrentStageName(''); // Term exists but wrong category
                }
              } else {
                setCurrentStageName(''); // Term not found
              }
            } catch (err) {
              console.error('Failed to load stage term:', err);
              setCurrentStageName(''); // Error loading term
            }
          } else {
            setCurrentStageName(''); // No NAME_ID
          }
        } else {
          setCurrentStageName('');
        }
      } else {
        setCurrentStageName('');
      }
    };

    loadCurrentNames();
  }, [seasons, comp]);

  // Store countries and sports for ID mapping
  const [countriesData, setCountriesData] = React.useState([]);
  const [sportsData, setSportsData] = React.useState([]);

  // Load countries and sports for ID mapping
  React.useEffect(() => {
    const fetchMappingData = async () => {
      try {
        const [countriesRes, sportsRes] = await Promise.all([
          api.getCountries(),
          api.getSports()
        ]);

        if (countriesRes.success && countriesRes.data) {
          setCountriesData(countriesRes.data);
        }

        if (sportsRes.success && sportsRes.data) {
          setSportsData(sportsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch mapping data:', err);
      }
    };

    fetchMappingData();
  }, []);

  // Helper function to convert form state to backend format
  const convertFormStateToBackendFormat = (formState, comp) => {
    if (!comp) {
      throw new Error('Competition data not available');
    }

    // Find country ID from name
    const country = countriesData.find(c => 
      (c.name && c.name === formState.country) || 
      (c.COUNTRY_CODE && c.COUNTRY_CODE === formState.country)
    );
    const countryId = country ? country.COUNTRY_ID : (comp.COUNTRY_ID);

    // Find sport ID from name
    const sport = sportsData.find(s => 
      (s.name && s.name === formState.sport) || 
      (s.ALIAS_NAME && s.ALIAS_NAME === formState.sport)
    );
    const sportId = sport ? sport.SPORT_TYPE_ID : (comp.SPORT_TYPE_ID);

    // Convert gender to number
    let genderId = comp.GENDER || 1;
    if (formState.gender === 'Male') genderId = 1;
    else if (formState.gender === 'Female') genderId = 2;
    else if (formState.gender === 'Mixed') genderId = 3;

    // Convert competition type to number
    let competitionTypeId = comp.COMPETITION_TYPE || 1;
    if (formState.competitionType === 'Tournament') competitionTypeId = 1;
    else if (formState.competitionType === 'League') competitionTypeId = 2;
    else if (formState.competitionType === 'Cup') competitionTypeId = 3;

    // Convert main color from hex to number if needed
    let mainColor = comp.MAIN_COLOR;
    if (formState.mainColor) {
      const hexColor = formState.mainColor.replace('#', '');
      if (hexColor && /^[0-9A-Fa-f]{6}$/.test(hexColor)) {
        mainColor = parseInt(hexColor, 16);
      }
    }

    // Convert secondary color from hex to number if needed
    let secondaryColor = comp.SECONDARY_COLOR;
    if (formState.secondaryColor) {
      const hexColor = formState.secondaryColor.replace('#', '');
      if (hexColor && /^[0-9A-Fa-f]{6}$/.test(hexColor)) {
        secondaryColor = parseInt(hexColor, 16);
      }
    }

    // Build backend payload - only include backend fields, exclude enriched fields
    const backendPayload = {
      COMPETITION_ID: comp.COMPETITION_ID || comp.id,
      NAME_ID: comp.NAME_ID,
      COUNTRY_ID: countryId,
      SPORT_TYPE_ID: sportId,
      GENDER: genderId,
      COMPETITION_TYPE: competitionTypeId,
      CURRENT_SEASON: comp.CURRENT_SEASON,
      CURRENT_STAGE: comp.CURRENT_STAGE,
      IMG_VER: comp.IMG_VER || 1,
      MAIN_COLOR: mainColor,
      SECONDARY_COLOR: secondaryColor,
      AUTO_START_GAMES: formState.checkboxes.automaticStartOfGames || false,
      SCORES_UPDATE_POLICY: formState.scoresUpdatePolicy ? parseInt(formState.scoresUpdatePolicy) : (comp.SCORES_UPDATE_POLICY || 1),
      ALWAYS_UPDATE_ABOVE_PRIORITY: formState.updatePriorityAbove ? parseInt(formState.updatePriorityAbove) : (comp.ALWAYS_UPDATE_ABOVE_PRIORITY || 0),
      CONNECT_BY_TEXT: comp.CONNECT_BY_TEXT || false, // Keep DB value, not editable in UI
      TABLE_WINNER_POINTS: competitionTableSettings.winnerPoints ?? comp.TABLE_WINNER_POINTS ?? 3,
      TABLE_DRAW_POINTS: competitionTableSettings.drawPoints ?? comp.TABLE_DRAW_POINTS ?? 1,
      TABLE_LOSER_POINTS: competitionTableSettings.loserPoints ?? comp.TABLE_LOSER_POINTS ?? 0,
      TABLE_IS_EVEN_EXISTS: competitionTableSettings.tableSupportInEven ?? comp.TABLE_IS_EVEN_EXISTS ?? false,
      TABLE_COUNT_ET_SCORE: competitionTableSettings.countExtraTimeScore ?? comp.TABLE_COUNT_ET_SCORE ?? false,
      TABLE_COUNT_PEN_SCORE: competitionTableSettings.countPenaltyScore ?? comp.TABLE_COUNT_PEN_SCORE ?? false,
      
      // General checkboxes
      SUPPORT_COMPETITION_DASHBOARD: formState.checkboxes.supportCompetitionDashboard || false,
      SUPPORT_PAST_FINALS_STANDINGS: formState.checkboxes.supportPastFinalsStandings || false,
      ENABLE_DASHBOARD_BUZZ: formState.checkboxes.enableDashboardBuzz || false,
      HIDE_ON_CATALOG: formState.checkboxes.hideOnCatalog || false,
      HIDE_ON_SEARCH: formState.checkboxes.hideOnSearch || false,
      DONT_DISPLAY_FATHERS_H2H: formState.checkboxes.dontDisplayFathersH2h || false,
      HIDE_FROM_POPULAR_WHEN_NO_ACTIVE: formState.checkboxes.hideFromPopularWhenNoActive || false,
      PROMOTE_DURING_ACTIVE_SEASON: formState.checkboxes.promoteDuringActiveSeason || false,
      HIDE_LMT_IN_COMPETITION_GAMES: formState.checkboxes.hideLmtInCompetitionGames || false,
      SUPPORT_FANS_RATE: formState.checkboxes.supportFansRate || false,
      RECENTLY_WON_TROPHY_CARD: formState.checkboxes.recentlyWonTrophyCard || false,
      PROMOTE_NEW_TROPHY: formState.checkboxes.promoteNewTrophy || false,
      
      // Status & Score checkboxes
      AUTOMATIC_STATUS_PROGRESS: formState.checkboxes.automaticStatusProgress || false,
      AUTO_TRANSFER_WAIT_APPROVAL: formState.checkboxes.autoTransferWaitApproval || false,
      UPDATE_RESULT_SECOND_SCANNER: formState.checkboxes.updateResultSecondScanner || false,
      AUTO_PROCESS_ADDED_TIME: formState.checkboxes.autoProcessAddedTime || false,
      SUPPORT_TIE_ON_90: formState.checkboxes.supportTieOn90 || false,
      
      // Notifications checkboxes
      GAME_SUMMARY_POPUP: formState.checkboxes.gameSummaryPopup || false,
      GAME_SUMMARY_NOTIFICATIONS: formState.checkboxes.gameSummaryNotifications || false,
      ALLOW_NOTIFICATIONS: formState.checkboxes.allowNotifications || false,
      HIDE_PLAYER_GAME_CARD: formState.checkboxes.hidePlayerGameCard || false,
      LINEUPS_NOTIFICATION_DELAY: formState.checkboxes.lineupsNotificationDelay || false,
      
      // Players & Statistics checkboxes
      DISPLAY_TOP_PREFERS: formState.checkboxes.displayTopPrefers || false,
      HIDE_COMPETITION_STATS: formState.checkboxes.hideCompetitionStats || false,
      PREDICTABLE_LINEUPS_RESTRICTION: formState.checkboxes.predictableLineupsRestriction || false,
      REQUIRE_FORMATION: formState.checkboxes.requireFormation || false,
      SHOW_DISCONNECTED_PLAYERS: formState.checkboxes.showDisconnectedPlayers || false,
      
      // Bettings checkboxes
      CALCULATE_WIN_PROBABILITY_INSIGHTS: formState.checkboxes.calculateWinProbabilityInsights || false,
      CALCULATE_LIVE_WIN_PROBABILITY: formState.checkboxes.calculateLiveWinProbability || false,
      SUPPORT_INSIGHTS_POPUP_FOR_PROPS: formState.checkboxes.supportInsightsPopupForProps || false,
      SUPPORT_PROPS_BETTING: formState.checkboxes.supportPropsBetting || false,
      SUPPORT_SPECIAL_OUTRIGHTS: formState.checkboxes.supportSpecialOutrights || false,
      SPECIAL_OUTRIGHTS_START_DATE: formState.checkboxes.supportSpecialOutrights ? (formState.specialOutrightsStartDate || null) : null,
      SPECIAL_OUTRIGHTS_END_DATE: formState.checkboxes.supportSpecialOutrights ? (formState.specialOutrightsEndDate || null) : null,
      SUPPORT_TRENDS: formState.checkboxes.supportTrends || false,
      
      // Other checkboxes
      BRACKET_FINAL: formState.checkboxes.bracketFinal || false,
      ROUND_NAME: formState.checkboxes.roundName || false,
      
      // Text/Number fields
      TIER: formState.tier ? parseInt(formState.tier) : (comp.TIER || 1),
      IMAGE: formState.image || comp.IMAGE || '',
      SELECT_DESCRIPTION: formState.selectDescription || comp.SELECT_DESCRIPTION || '',
      SELECT_ROUND_NAME: formState.selectRoundName || comp.SELECT_ROUND_NAME || '',
      CURRENT_ROUND: formState.currentRound ? parseInt(formState.currentRound) : (comp.CURRENT_ROUND || -1),
      BRACKET_FINAL_DESCRIPTION: formState.bracketFinalDescription || comp.BRACKET_FINAL_DESCRIPTION || '',
      RECOGNITION_TIME_SPAN: formState.recognitionTimeSpan ? parseInt(formState.recognitionTimeSpan) : (comp.RECOGNITION_TIME_SPAN || null),
      ARTICLE_TIME_SPAN_BEFORE: formState.articleTimeSpanBefore ? parseInt(formState.articleTimeSpanBefore) : (comp.ARTICLE_TIME_SPAN_BEFORE || null),
      ARTICLE_TIME_SPAN_AFTER: formState.articleTimeSpanAfter ? parseInt(formState.articleTimeSpanAfter) : (comp.ARTICLE_TIME_SPAN_AFTER || null),
      PREMIUM_SOCIAL_TIME_SPAN_BEFORE: formState.premiumSocialTimeSpanBefore ? parseInt(formState.premiumSocialTimeSpanBefore) : (comp.PREMIUM_SOCIAL_TIME_SPAN_BEFORE || null),
      PREMIUM_SOCIAL_TIME_SPAN_AFTER: formState.premiumSocialTimeSpanAfter ? parseInt(formState.premiumSocialTimeSpanAfter) : (comp.PREMIUM_SOCIAL_TIME_SPAN_AFTER || null),
      GAME_SUMMARY_RELEVANCY: formState.gameSummaryRelevancy ? parseInt(formState.gameSummaryRelevancy) : (comp.GAME_SUMMARY_RELEVANCY || null),
      LINEUPS_NOTIFICATION_DELAY_VALUE: formState.lineupsNotificationDelayValue ? parseInt(formState.lineupsNotificationDelayValue) : (comp.LINEUPS_NOTIFICATION_DELAY_VALUE || null),
      PREDICTABLE_LINEUPS_RESTRICTION_VALUE: formState.predictableLineupsRestrictionValue || comp.PREDICTABLE_LINEUPS_RESTRICTION_VALUE || '',
      PROMOTE_NEW_TROPHY_VALUE: formState.promoteNewTrophyValue ? parseInt(formState.promoteNewTrophyValue) : (comp.PROMOTE_NEW_TROPHY_VALUE || null),
      RECENTLY_WON_TROPHY_CARD_VALUE: formState.recentlyWonTrophyCardValue ? parseInt(formState.recentlyWonTrophyCardValue) : (comp.RECENTLY_WON_TROPHY_CARD_VALUE || null),
      TOP_ATHLETE_PCT: formState.topAthletePct ? parseInt(formState.topAthletePct) : (comp.TOP_ATHLETE_PCT || 60),
      PERSONAL_FOULS_LIMIT: formState.personalFoulsLimit ? parseInt(formState.personalFoulsLimit) : (comp.PERSONAL_FOULS_LIMIT || null),
      TEAM_FOULS_LIMIT: formState.teamFoulsLimit ? parseInt(formState.teamFoulsLimit) : (comp.TEAM_FOULS_LIMIT || null),
      DISPLAY_TOP_PREFORMERS_STATUS: formState.displayTopPreformersStatus || comp.DISPLAY_TOP_PREFORMERS_STATUS || '',
      
      // Dropdown fields
      BUZZ_ITEM_TYPE: formState.buzzItemType || comp.BUZZ_ITEM_TYPE || '',
      H2H_LAYOUT: formState.h2hLayout || comp.H2H_LAYOUT || '',
      FATHER_COMPETITION: formState.fatherCompetition !== undefined ? formState.fatherCompetition : (comp.FATHER_COMPETITION || ''),
      STANDING_TYPE: formState.standingType || comp.STANDING_TYPE || '',
      SUB_SPORT_TYPE: formState.subSportType || comp.SUB_SPORT_TYPE || '',
      SURFACE_TYPE: formState.surfaceType || comp.SURFACE_TYPE || '',
      
      // Transfers Window dates
      TRANSFERS_WINDOW_START_DATE: comp.TRANSFERS_WINDOW_START_DATE || null,
      TRANSFERS_WINDOW_END_DATE: comp.TRANSFERS_WINDOW_END_DATE || null,
      
      // Include any other backend fields from comp that exist
    };

    // Remove undefined values
    Object.keys(backendPayload).forEach(key => {
      if (backendPayload[key] === undefined) {
        delete backendPayload[key];
      }
    });

    return backendPayload;
  };

  // Handlers
  const handleFieldChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormState(prev => ({
      ...prev,
      checkboxes: { ...prev.checkboxes, [field]: e.target.checked },
    }));
  };

  const handleSave = async () => {
    if (!comp || !id) {
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Cannot save: Competition data not loaded');
      setUpdateSnackbarOpen(true);
      return;
    }

    try {
      const backendPayload = convertFormStateToBackendFormat(formState, comp, competitionTableSettings);
      const response = await api.updateCompetition(id, backendPayload);
      
      if (response.success) {
        // Reload the competition to get enriched data
        const reloadResponse = await api.getCompetition(id);
        if (reloadResponse.success && reloadResponse.data) {
          const competitionData = {
            id: reloadResponse.data.COMPETITION_ID || reloadResponse.data.id,
            name: reloadResponse.data.name || 'Unknown',
            season: reloadResponse.data.CURRENT_SEASON ? `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` : '',
            stage: reloadResponse.data.CURRENT_STAGE || '',
            country: reloadResponse.data.country || 'Unknown',
            sport: reloadResponse.data.sport || 'Unknown',
            competitorType: 'Team', // Default, can be enhanced later
            competitionType: reloadResponse.data.COMPETITION_TYPE === 1 ? 'Tournament' : 'League',
            gender: reloadResponse.data.gender || (reloadResponse.data.GENDER === 1 ? 'Male' : reloadResponse.data.GENDER === 2 ? 'Female' : 'Other'),
            standingType: '',
            logo: '',
            mainColor: reloadResponse.data.mainColor || '#000000',
            secondaryColor: reloadResponse.data.secondaryColor || '',
            ...reloadResponse.data // Include all other fields
          };
          setComp(competitionData);
          setSavedComp(JSON.parse(JSON.stringify(competitionData))); // Initialize savedComp
        }
        
        setSavedFormState(formState);
        setUpdateSnackbarType('success');
        setUpdateSnackbarMsg('Saved successfully!');
        setUpdateSnackbarOpen(true);
      } else {
        throw new Error(response.error?.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save competition:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg(error.message || 'Failed to save competition. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };

  const handleUpdateInServices = async () => {
    // For now, this does the same as handleSave
    // In the future, this might trigger additional service updates
    await handleSave();
  };

  const handleFormReload = async () => {
    if (!id) return;
    
    setReloadFormLoading(true);
    try {
      const response = await api.getCompetition(id);
      if (response.success && response.data) {
        // Transform API data to match component expectations
        const competitionData = {
          id: response.data.COMPETITION_ID || response.data.id,
          name: response.data.name || 'Unknown',
          season: response.data.CURRENT_SEASON ? `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` : '',
          stage: response.data.CURRENT_STAGE || '',
          country: response.data.country || 'Unknown',
          sport: response.data.sport || 'Unknown',
          competitorType: 'Team',
          competitionType: response.data.COMPETITION_TYPE === 1 ? 'Tournament' : 'League',
          gender: response.data.gender || (response.data.GENDER === 1 ? 'Male' : response.data.GENDER === 2 ? 'Female' : 'Other'),
          standingType: '',
          logo: '',
          mainColor: response.data.mainColor || '#000000',
          secondaryColor: response.data.secondaryColor || '',
          ...response.data
        };
        setComp(competitionData);
        setSavedComp(JSON.parse(JSON.stringify(competitionData))); // Deep copy for comparison
        
        // Update form state will happen automatically via useEffect when comp changes
        setUpdateSnackbarType('success');
        setUpdateSnackbarMsg('Data reloaded from database');
        setUpdateSnackbarOpen(true);
      } else {
        throw new Error('Failed to reload competition');
      }
    } catch (err) {
      console.error('Failed to reload competition:', err);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg(err.message || 'Failed to reload competition');
      setUpdateSnackbarOpen(true);
    } finally {
      setReloadFormLoading(false);
    }
  };

  const handleStructureSave = async () => {
    if (!id || !comp) {
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Cannot save: Competition data not loaded');
      setUpdateSnackbarOpen(true);
      return;
    }

    const errors = [];
    const savedItems = [];

    try {
      // First, identify new seasons (in seasons but not in savedSeasons)
      const savedSeasonIds = new Set(savedSeasons.map(s => s.id));
      const newSeasons = seasons.filter(s => !savedSeasonIds.has(s.id));
      
      // Identify deleted seasons (in savedSeasons but not in seasons)
      const currentSeasonIds = new Set(seasons.map(s => s.id));
      const deletedSeasons = savedSeasons.filter(s => !currentSeasonIds.has(s.id));
      
      // Delete seasons that were removed
      for (const deletedSeason of deletedSeasons) {
        try {
          const seasonId = `${id}-${deletedSeason.seasonNum}`;
          await api.deleteSeason(seasonId);
          savedItems.push(`Season ${deletedSeason.seasonNum} (deleted)`);
        } catch (err) {
          errors.push(`Season ${deletedSeason.seasonNum} (delete): ${err.message || 'Failed to delete'}`);
        }
      }
      
      // Create new seasons
      for (const newSeason of newSeasons) {
        try {
          // Check if season already exists in DB (might not be in savedSeasons if not loaded)
          const existingSeasonsResponse = await api.getSeasons(id);
          const existingSeasons = existingSeasonsResponse.success && existingSeasonsResponse.data 
            ? existingSeasonsResponse.data 
            : [];
          
          const seasonExists = existingSeasons.some(s => 
            s.COMPETITION_ID === parseInt(id) && s.SEASON_NUM === newSeason.seasonNum
          );
          
          if (seasonExists) {
            // Season already exists in DB, update it instead
            const seasonPayload = {
              COMPETITION_ID: parseInt(id),
              SEASON_NUM: newSeason.seasonNum,
              NAME_ID: newSeason.nameId,
              START_DATE: newSeason.startDate ? new Date(newSeason.startDate).toISOString() : null,
              END_DATE: newSeason.endDate ? new Date(newSeason.endDate).toISOString() : null,
              HAS_TABLE: newSeason.seasonConfig?.hasTable || false,
              TABLE_WINNER_POINTS: newSeason.tableSettings?.winnerPoints ?? 3,
              TABLE_DRAW_POINTS: newSeason.tableSettings?.drawPoints ?? 1,
              TABLE_LOSER_POINTS: newSeason.tableSettings?.loserPoints ?? 0,
              TABLE_IS_EVEN_EXISTS: newSeason.tableSettings?.isEvenExists || false,
              USE_NAME: newSeason.seasonConfig?.useName || false,
              SHOW_TOP_ATHLETES: newSeason.seasonConfig?.showTopAthletes || false,
              HAS_BRACKETS: newSeason.seasonConfig?.hasBrackets || false,
              TABLE_COUNT_ET_SCORE: newSeason.tableSettings?.countExtraTimeScore || false,
              TABLE_COUNT_PEN_SCORE: newSeason.tableSettings?.countPenaltyScore || false,
              SHOW_INFO_CARD: newSeason.seasonConfig?.hasInfoCard || false,
              SHOW_MATCHES: newSeason.seasonConfig?.showMatches || false,
              HAS_SEED: newSeason.seasonConfig?.hasSeed || false,
              SHOW_TOP_TEAMS_TAB: newSeason.seasonConfig?.showTopTeamsTab || false,
              SHOW_OUTRIGHTS_TAB: newSeason.seasonConfig?.showOutrightsTab || false,
              PRESENT_COMPETITION_RULES: newSeason.seasonConfig?.presentCompetitionRules || false,
              HAS_HOME_TABLE: newSeason.seasonConfig?.hasHomeTable || false,
              HAS_AWAY_TABLE: newSeason.seasonConfig?.hasAwayTable || false,
            };
            await api.updateSeason(`${id}-${newSeason.seasonNum}`, seasonPayload);
            savedItems.push(`Season ${newSeason.seasonNum} (updated)`);
          } else {
            // Season doesn't exist, create it
            const seasonPayload = {
              COMPETITION_ID: parseInt(id),
              SEASON_NUM: newSeason.seasonNum,
              NAME_ID: newSeason.nameId,
              START_DATE: newSeason.startDate ? new Date(newSeason.startDate).toISOString() : null,
              END_DATE: newSeason.endDate ? new Date(newSeason.endDate).toISOString() : null,
              HAS_TABLE: newSeason.seasonConfig?.hasTable || false,
              TABLE_WINNER_POINTS: newSeason.tableSettings?.winnerPoints ?? 3,
              TABLE_DRAW_POINTS: newSeason.tableSettings?.drawPoints ?? 1,
              TABLE_LOSER_POINTS: newSeason.tableSettings?.loserPoints ?? 0,
              TABLE_IS_EVEN_EXISTS: newSeason.tableSettings?.isEvenExists || false,
              USE_NAME: newSeason.seasonConfig?.useName || false,
              SHOW_TOP_ATHLETES: newSeason.seasonConfig?.showTopAthletes || false,
              HAS_BRACKETS: newSeason.seasonConfig?.hasBrackets || false,
              TABLE_COUNT_ET_SCORE: newSeason.tableSettings?.countExtraTimeScore || false,
              TABLE_COUNT_PEN_SCORE: newSeason.tableSettings?.countPenaltyScore || false,
              SHOW_INFO_CARD: newSeason.seasonConfig?.hasInfoCard || false,
              SHOW_MATCHES: newSeason.seasonConfig?.showMatches || false,
              HAS_SEED: newSeason.seasonConfig?.hasSeed || false,
              SHOW_TOP_TEAMS_TAB: newSeason.seasonConfig?.showTopTeamsTab || false,
              SHOW_OUTRIGHTS_TAB: newSeason.seasonConfig?.showOutrightsTab || false,
              PRESENT_COMPETITION_RULES: newSeason.seasonConfig?.presentCompetitionRules || false,
              HAS_HOME_TABLE: newSeason.seasonConfig?.hasHomeTable || false,
              HAS_AWAY_TABLE: newSeason.seasonConfig?.hasAwayTable || false,
            };
            await api.createSeason(seasonPayload);
            savedItems.push(`Season ${newSeason.seasonNum} (created)`);
          }
        } catch (err) {
          errors.push(`Season ${newSeason.seasonNum} (create): ${err.message || 'Failed to create'}`);
        }
      }
      
      // Save all seasons, stages, and groups (update existing)
      for (const season of seasons) {
        // Skip new seasons (already created above)
        if (newSeasons.find(s => s.id === season.id)) {
          continue;
        }
        
        // Update or create season
        const seasonPayload = {
          COMPETITION_ID: parseInt(id),
          SEASON_NUM: season.seasonNum,
          NAME_ID: season.nameId,
          START_DATE: season.startDate ? new Date(season.startDate).toISOString() : null,
          END_DATE: season.endDate ? new Date(season.endDate).toISOString() : null,
          HAS_TABLE: season.seasonConfig?.hasTable || false,
          TABLE_WINNER_POINTS: season.tableSettings?.winnerPoints ?? 3,
          TABLE_DRAW_POINTS: season.tableSettings?.drawPoints ?? 1,
          TABLE_LOSER_POINTS: season.tableSettings?.loserPoints ?? 0,
          TABLE_IS_EVEN_EXISTS: season.tableSettings?.isEvenExists || false,
          USE_NAME: season.seasonConfig?.useName || false,
          SHOW_TOP_ATHLETES: season.seasonConfig?.showTopAthletes || false,
          HAS_BRACKETS: season.seasonConfig?.hasBrackets || false,
          TABLE_COUNT_ET_SCORE: season.tableSettings?.countExtraTimeScore || false,
          TABLE_COUNT_PEN_SCORE: season.tableSettings?.countPenaltyScore || false,
          SHOW_INFO_CARD: season.seasonConfig?.hasInfoCard || false,
          SHOW_MATCHES: season.seasonConfig?.showMatches || false,
          // Add missing season config fields
          HAS_SEED: season.seasonConfig?.hasSeed || false,
          SHOW_TOP_TEAMS_TAB: season.seasonConfig?.showTopTeamsTab || false,
          SHOW_OUTRIGHTS_TAB: season.seasonConfig?.showOutrightsTab || false,
          PRESENT_COMPETITION_RULES: season.seasonConfig?.presentCompetitionRules || false,
          HAS_HOME_TABLE: season.seasonConfig?.hasHomeTable || false,
          HAS_AWAY_TABLE: season.seasonConfig?.hasAwayTable || false,
        };

        try {
          const response = await api.updateSeason(`${id}-${season.seasonNum}`, seasonPayload);
          // API service throws on error, so if we get here, it succeeded
          savedItems.push(`Season ${season.seasonNum}`);
        } catch (err) {
          // If update fails (404 or other error), try to create
          try {
            await api.createSeason(seasonPayload);
            savedItems.push(`Season ${season.seasonNum} (created)`);
          } catch (createErr) {
            errors.push(`Season ${season.seasonNum}: ${createErr.message || 'Failed to save'}`);
          }
        }

        // Update or create stages
        for (const stage of season.stages || []) {
          const stagePayload = {
            COMPETITION_ID: parseInt(id),
            SEASON_NUM: season.seasonNum,
            STAGE_NUM: stage.stageNum,
            NAME_ID: stage.nameId,
            NUM_OF_GAMES: stage.numOfGames ?? -1,
            STAGE_TYPE: stage.type === 'group' ? 1 : 2,
            HAS_TABLE: stage.hasTable || false,
            TABLE_WINNER_POINTS: stage.tableSettings?.winnerPoints ?? 3,
            TABLE_DRAW_POINTS: stage.tableSettings?.drawPoints ?? 1,
            TABLE_LOSER_POINTS: stage.tableSettings?.loserPoints ?? 0,
            TABLE_IS_EVEN_EXISTS: stage.tableSettings?.isEvenExists || false,
            USE_NAME: stage.useName || false,
            IS_FINAL: stage.isFinal || false,
            START_DATE: stage.startDate ? new Date(stage.startDate).toISOString() : null,
            END_DATE: stage.endDate ? new Date(stage.endDate).toISOString() : null,
            TABLE_COUNT_ET_SCORE: stage.tableSettings?.countExtraTimeScore || false,
            TABLE_COUNT_PEN_SCORE: stage.tableSettings?.countPenaltyScore || false,
            // Add missing stage fields
            PHASE: stage.phase || '',
            PRE_VISUAL_BRACKETS: stage.preVisualBrackets || false,
            INCLUDE_IN_BRACKET: stage.includeInBracket || false,
            IS_SERIES: stage.isSeries || false,
            FILTER_DIVISION: stage.filterDivision || false,
            CONNECTED_IN_BRACKETS: stage.connectedInBrackets || false,
            CONNECTED_TO_PREVIOUS_STAGE: stage.connectedToPreviousStage || false,
            HAS_HOME_TABLE: stage.hasHomeTable || false,
            HAS_AWAY_TABLE: stage.hasAwayTable || false,
          };

          try {
            await api.updateStage(`${id}-${season.seasonNum}-${stage.stageNum}`, stagePayload);
            // API service throws on error, so if we get here, it succeeded
            savedItems.push(`Stage ${stage.stageNum} (Season ${season.seasonNum})`);
          } catch (err) {
            // If update fails (404 or other error), try to create
            try {
              await api.createStage(stagePayload);
              savedItems.push(`Stage ${stage.stageNum} (Season ${season.seasonNum}, created)`);
            } catch (createErr) {
              errors.push(`Stage ${stage.stageNum} (Season ${season.seasonNum}): ${createErr.message || 'Failed to save'}`);
            }
          }

          // Update or create groups
          for (const group of stage.groups || []) {
            const groupPayload = {
              COMPETITION_ID: parseInt(id),
              SEASON_NUM: season.seasonNum,
              STAGE_NUM: stage.stageNum,
              GROUP_NUM: group.groupNum,
              NAME_ID: group.nameId,
              USE_NAME: group.USE_NAME || false,
              HAS_TABLE: group.HAS_TABLE || false,
              IS_SERIES: group.IS_SERIES || false,
              GROUP_BY: group.GROUP_BY || false,
              AUTONOMOUS: group.AUTONOMOUS || false,
              TO_QUALIFY: group.TO_QUALIFY || null,
              NUM_OF_GAMES: group.NUM_OF_GAMES || 0,
              IS_FINAL: group.IS_FINAL || false,
            };

            try {
              await api.updateGroup(`${id}-${season.seasonNum}-${stage.stageNum}-${group.groupNum}`, groupPayload);
              // API service throws on error, so if we get here, it succeeded
              savedItems.push(`Group ${group.groupNum} (Stage ${stage.stageNum}, Season ${season.seasonNum})`);
            } catch (err) {
              // If update fails (404 or other error), try to create
              try {
                await api.createGroup(groupPayload);
                savedItems.push(`Group ${group.groupNum} (Stage ${stage.stageNum}, Season ${season.seasonNum}, created)`);
              } catch (createErr) {
                errors.push(`Group ${group.groupNum} (Stage ${stage.stageNum}, Season ${season.seasonNum}): ${createErr.message || 'Failed to save'}`);
              }
            }
          }
        }

        // Update or create phases
        for (const phase of season.phases || []) {
          const phasePayload = {
            COMPETITION_ID: parseInt(id),
            SEASON_NUM: season.seasonNum,
            PHASE_NUM: phase.phaseNum,
            PHASE_NAME_ID: phase.nameId || phase.PHASE_NAME_ID,
            PARENT_PHASE_NUM: phase.PARENT_PHASE_NUM || null,
            SHOW_STATS: phase.SHOW_STATS !== undefined ? phase.SHOW_STATS : true,
            USE_NAME: phase.USE_NAME || false,
            OVERTIME_LENGTH: phase.OVERTIME_LENGTH || 5,
            TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE: phase.TOP_ATHLETES_MIN_APPEARANCES_PERCENTAGE || 0.5,
          };

          try {
            await api.updatePhase(`${id}-${season.seasonNum}-${phase.phaseNum}`, phasePayload);
            // API service throws on error, so if we get here, it succeeded
            savedItems.push(`Phase ${phase.phaseNum} (Season ${season.seasonNum})`);
          } catch (err) {
            // If update fails (404 or other error), try to create
            try {
              await api.createPhase(phasePayload);
              savedItems.push(`Phase ${phase.phaseNum} (Season ${season.seasonNum}, created)`);
            } catch (createErr) {
              errors.push(`Phase ${phase.phaseNum} (Season ${season.seasonNum}): ${createErr.message || 'Failed to save'}`);
            }
          }
        }
      }

      // Save competition data (transfers window and current season)
      if (comp) {
        try {
          const competitionUpdatePayload = {};
          
          // Save transfers window dates if they exist
          if (comp.TRANSFERS_WINDOW_START_DATE !== undefined || comp.TRANSFERS_WINDOW_END_DATE !== undefined) {
            competitionUpdatePayload.TRANSFERS_WINDOW_START_DATE = comp.TRANSFERS_WINDOW_START_DATE || null;
            competitionUpdatePayload.TRANSFERS_WINDOW_END_DATE = comp.TRANSFERS_WINDOW_END_DATE || null;
          }
          
          // Save CURRENT_SEASON if it exists
          if (comp.CURRENT_SEASON !== undefined) {
            competitionUpdatePayload.CURRENT_SEASON = comp.CURRENT_SEASON;
          }
          
          // Only update if there are changes
          if (Object.keys(competitionUpdatePayload).length > 0) {
            await api.updateCompetition(id, competitionUpdatePayload);
            if (competitionUpdatePayload.TRANSFERS_WINDOW_START_DATE !== undefined) {
              savedItems.push('Transfers Window dates');
            }
            if (competitionUpdatePayload.CURRENT_SEASON !== undefined) {
              savedItems.push('Current Season');
            }
          }
        } catch (err) {
          errors.push(`Competition settings: ${err.message || 'Failed to save'}`);
        }
      }

      // Show appropriate message based on results
      if (errors.length > 0) {
        setUpdateSnackbarType('error');
        setUpdateSnackbarMsg(`Saved ${savedItems.length} items, but ${errors.length} failed: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
        setUpdateSnackbarOpen(true);
      } else if (savedItems.length > 0) {
        setSavedSeasons(JSON.parse(JSON.stringify(seasons))); // Deep copy
        if (comp) {
          setSavedComp(JSON.parse(JSON.stringify(comp))); // Deep copy for comparison
        }
        setUpdateSnackbarType('success');
        setUpdateSnackbarMsg(`Structure saved successfully! (${savedItems.length} items)`);
        setUpdateSnackbarOpen(true);
      } else {
        setUpdateSnackbarType('warning');
        setUpdateSnackbarMsg('No changes to save');
        setUpdateSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to save structure:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg(error.message || 'Failed to save structure. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };

  const handleStructureUpdateInServices = async () => {
    // First save to DB
    try {
      await handleStructureSave();
      // Wait a bit to ensure save completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Add service update logic here if needed
      // For now, if save was successful, show success message
      // The handleStructureSave already shows its own message, so we don't need to override it
      // Only show additional message if service update is implemented
    } catch (error) {
      console.error('Failed to update structure in services:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Failed to update structure in services. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };

  const handleStructureReload = async () => {
    if (!id || !comp) return;
    
    setReloadStructureLoading(true);
    try {
      // Load seasons for this competition
      const seasonsResponse = await api.getSeasons(id);
      if (seasonsResponse.success && seasonsResponse.data) {
        const formatDateTimeForInput = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          const year = date.getUTCFullYear();
          const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
          const day = date.getUTCDate().toString().padStart(2, '0');
          const hours = date.getUTCHours().toString().padStart(2, '0');
          const minutes = date.getUTCMinutes().toString().padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        const seasonsData = await Promise.all(
          seasonsResponse.data.map(async (season) => {
            // Load season name from terms (categoryId 47 = Seasons Names)
            const seasonName = await loadTermName(
              season.NAME_ID, 
              47, 
              `Season ${season.SEASON_NUM}`
            );

            // Load stages for this season
            const stagesResponse = await api.getStages(id, season.SEASON_NUM);
            let stages = [];
            if (stagesResponse.success && stagesResponse.data) {
              stages = await Promise.all(
                stagesResponse.data.map(async (stage) => {
                  // Load stage name from terms (categoryId 48 = Stages Names)
                  const stageName = await loadTermName(
                    stage.NAME_ID,
                    48,
                    `Stage ${stage.STAGE_NUM}`
                  );

                  // Load groups for this stage
                  const groupsResponse = await api.getGroups(id, season.SEASON_NUM, stage.STAGE_NUM);
                  let groups = [];
                  if (groupsResponse.success && groupsResponse.data) {
                    groups = await Promise.all(
                      groupsResponse.data.map(async (group) => {
                        // Load group name from terms if needed
                        const groupName = await loadTermName(
                          group.NAME_ID,
                          null, // Groups might not have specific category, use any term
                          `Group ${group.GROUP_NUM}`
                        );

                        return {
                          id: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}-${group.GROUP_NUM}`,
                          groupNum: group.GROUP_NUM,
                          nameId: group.NAME_ID,
                          name: groupName,
                          stageId: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}`,
                          ...group
                        };
                      })
                    );
                  }

                  return {
                    id: `${id}-${season.SEASON_NUM}-${stage.STAGE_NUM}`,
                    stageNum: stage.STAGE_NUM,
                    nameId: stage.NAME_ID,
                    name: stageName,
                    type: stage.STAGE_TYPE === 1 ? 'group' : 'knockout',
                    order: stage.STAGE_NUM,
                    isCurrent: false,
                    hasTable: stage.HAS_TABLE || false,
                    preVisualBrackets: false,
                    includeInBracket: false,
                    isSeries: false,
                    filterDivision: false,
                    numOfGames: stage.NUM_OF_GAMES || -1,
                    connectedInBrackets: false,
                    connectedToPreviousStage: false,
                    phase: '',
                    startDate: stage.START_DATE ? formatDateTimeForInput(stage.START_DATE) : '',
                    endDate: stage.END_DATE ? formatDateTimeForInput(stage.END_DATE) : '',
                    groups: groups,
                    ...stage
                  };
                })
              );
            }

            // Load phases for this season
            const phasesResponse = await api.getPhases(id, season.SEASON_NUM);
            let phases = [];
            if (phasesResponse.success && phasesResponse.data) {
              phases = phasesResponse.data.map(phase => ({
                id: `${id}-${season.SEASON_NUM}-${phase.PHASE_NUM}`,
                phaseNum: phase.PHASE_NUM,
                nameId: phase.PHASE_NAME_ID,
                ...phase
              }));
            }

            return {
              id: `${id}-${season.SEASON_NUM}`,
              seasonNum: season.SEASON_NUM,
              nameId: season.NAME_ID,
              name: seasonName,
              isCurrent: comp.CURRENT_SEASON === season.SEASON_NUM,
              startDate: season.START_DATE,
              endDate: season.END_DATE,
              stages: stages,
              teams: [],
              phases: phases,
              // Keep original DB fields for reference
              TABLE_WINNER_POINTS: season.TABLE_WINNER_POINTS,
              TABLE_DRAW_POINTS: season.TABLE_DRAW_POINTS,
              TABLE_LOSER_POINTS: season.TABLE_LOSER_POINTS,
              TABLE_IS_EVEN_EXISTS: season.TABLE_IS_EVEN_EXISTS,
              TABLE_COUNT_ET_SCORE: season.TABLE_COUNT_ET_SCORE,
              TABLE_COUNT_PEN_SCORE: season.TABLE_COUNT_PEN_SCORE,
              tableSettings: {
                winnerPoints: season.TABLE_WINNER_POINTS ?? 3,
                drawPoints: season.TABLE_DRAW_POINTS ?? 1,
                loserPoints: season.TABLE_LOSER_POINTS ?? 0,
                isEvenExists: season.TABLE_IS_EVEN_EXISTS ?? false,
                countExtraTimeScore: season.TABLE_COUNT_ET_SCORE ?? false,
                countPenaltyScore: season.TABLE_COUNT_PEN_SCORE ?? false,
                orderParameters: [], // Will be loaded from DB if exists
              },
              seasonConfig: {
                seasonKey: '',
                startDate: season.START_DATE ? formatDateTimeForInput(season.START_DATE) : '',
                endDate: season.END_DATE ? formatDateTimeForInput(season.END_DATE) : '',
                useName: season.USE_NAME || false,
                showTopAthletes: season.SHOW_TOP_ATHLETES || false,
                hasBrackets: season.HAS_BRACKETS || false,
                hasTable: season.HAS_TABLE || false,
                hasInfoCard: season.SHOW_INFO_CARD || false,
                roundName: false,
                hasSeed: false,
                showTopTeamsTab: false,
                showOutrightsTab: false,
                presentCompetitionRules: false,
                showMatches: season.SHOW_MATCHES || false,
                roundNameValue: '',
                transfersWindowStartDate: '',
                transfersWindowEndDate: '',
              },
              ...season
            };
          })
        );

        setSeasons(seasonsData);
        setSavedSeasons(JSON.parse(JSON.stringify(seasonsData))); // Deep copy
        if (comp) {
          setSavedComp(JSON.parse(JSON.stringify(comp))); // Deep copy for comparison
        }
        
        // Set current season as selected (or first season if no current season)
        if (seasonsData.length > 0) {
          const currentSeason = seasonsData.find(s => s.isCurrent) || seasonsData[0];
          setSelectedSeasonId(currentSeason.id);
        }
        
        setUpdateSnackbarType('success');
        setUpdateSnackbarMsg('Structure data reloaded from database');
        setUpdateSnackbarOpen(true);
      } else {
        throw new Error('Failed to reload structure data');
      }
    } catch (err) {
      console.error('Failed to reload structure data:', err);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg(err.message || 'Failed to reload structure data');
      setUpdateSnackbarOpen(true);
    } finally {
      setReloadStructureLoading(false);
    }
  };



  const handleCompetitionTableSettingsChange = (field, value) => {
    setCompetitionTableSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true); // Mark that there are unsaved changes
  };

  // Season handlers - these update local state, actual save happens in handleStructureSave
  const handleSeasonKeyChange = (seasonId, value) => {
    setSeasons(prev => prev.map(season => 
      season.id === seasonId ? { ...season, seasonKey: value } : season
    ));
    setHasStructureChanges(true);
  };

  const handleSeasonStartDateChange = (seasonId, value) => {
    setSeasons(prev => prev.map(season => 
      season.id === seasonId ? { 
        ...season, 
        startDate: value,
        seasonConfig: {
          ...season.seasonConfig,
          startDate: value
        }
      } : season
    ));
    setHasStructureChanges(true);
  };

  const handleSeasonEndDateChange = (seasonId, value) => {
    setSeasons(prev => prev.map(season => 
      season.id === seasonId ? { 
        ...season, 
        endDate: value,
        seasonConfig: {
          ...season.seasonConfig,
          endDate: value
        }
      } : season
    ));
    setHasStructureChanges(true);
  };

  const handleSeasonConfigChange = (seasonId, field, value) => {
    setSeasons(prev => prev.map(season => 
      season.id === seasonId ? { 
        ...season, 
        seasonConfig: { 
          ...season.seasonConfig, 
          [field]: value 
        } 
      } : season
    ));
    setHasStructureChanges(true);
  };

  const handleTableSettingsChange = (seasonId, field, value) => {
    setSeasons(prevSeasons => 
      prevSeasons.map(season => {
        if (season.id === seasonId) {
          const updatedTableSettings = {
            ...season.tableSettings,
            [field]: value
          };
          
          // Also update the corresponding TABLE_* field for direct DB access
          const dbFieldMap = {
            winnerPoints: 'TABLE_WINNER_POINTS',
            drawPoints: 'TABLE_DRAW_POINTS',
            loserPoints: 'TABLE_LOSER_POINTS',
            isEvenExists: 'TABLE_IS_EVEN_EXISTS',
            countExtraTimeScore: 'TABLE_COUNT_ET_SCORE',
            countPenaltyScore: 'TABLE_COUNT_PEN_SCORE',
          };
          
          const dbField = dbFieldMap[field];
          const updatedSeason = {
            ...season,
            tableSettings: updatedTableSettings
          };
          
          if (dbField) {
            updatedSeason[dbField] = value;
          }
          
          return updatedSeason;
        }
        return season;
      })
    );
    setHasStructureChanges(true);
  };

  // New function to handle sending table update with notifications
  const handleSendTableUpdate = (tableData) => {
    try {
      // Simulate sending table update through WCF system
      console.log('Sending table update through WCF:', tableData);
      console.log('Message sent to update system via DATASOURCE: SIMULATOR_EN');
      
      // Simulate API call with random success/failure for testing
      const isSuccess = Math.random() > 0.2; // 80% success rate for testing
      
      setTimeout(() => {
        if (isSuccess) {
          setUpdateSnackbarType('success');
          setUpdateSnackbarMsg('Table update sent successfully!');
        } else {
          setUpdateSnackbarType('error');
          setUpdateSnackbarMsg('Failed to send table update. Please try again.');
        }
        setUpdateSnackbarOpen(true);
      }, 500);
      
    } catch (error) {
      console.error('Error sending table update:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Failed to send table update. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };

  // New function to handle connecting games to stage with notifications
  const handleConnectGamesToStage = (stageData) => {
    try {
      // Simulate connecting games to stage
      console.log('Connecting games to stage:', stageData);
      console.log('Connecting games between dates:', stageData.startDate, 'and', stageData.endDate);
      
      // Simulate API call with random success/failure for testing
      const isSuccess = Math.random() > 0.2; // 80% success rate for testing
      
      setTimeout(() => {
        if (isSuccess) {
          setUpdateSnackbarType('success');
          setUpdateSnackbarMsg('Games connected to stage successfully!');
        } else {
          setUpdateSnackbarType('error');
          setUpdateSnackbarMsg('Failed to connect games to stage. Please try again.');
        }
        setUpdateSnackbarOpen(true);
      }, 500);
      
    } catch (error) {
      console.error('Error connecting games to stage:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Failed to connect games to stage. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };

  // New function to handle connecting games to season with notifications
  const handleConnectGamesToSeason = (seasonData) => {
    try {
      // Simulate connecting games to season
      console.log('Connecting games to season:', seasonData);
      console.log('Connecting games between dates:', seasonData.startDate, 'and', seasonData.endDate);
      
      // Simulate API call with random success/failure for testing
      const isSuccess = Math.random() > 0.2; // 80% success rate for testing
      
      setTimeout(() => {
        if (isSuccess) {
          setUpdateSnackbarType('success');
          setUpdateSnackbarMsg('Games connected to season successfully!');
        } else {
          setUpdateSnackbarType('error');
          setUpdateSnackbarMsg('Failed to connect games to season. Please try again.');
        }
        setUpdateSnackbarOpen(true);
      }, 500);
      
    } catch (error) {
      console.error('Error connecting games to season:', error);
      setUpdateSnackbarType('error');
      setUpdateSnackbarMsg('Failed to connect games to season. Please try again.');
      setUpdateSnackbarOpen(true);
    }
  };


  // Track changes using state
  const [hasChanges, setHasChanges] = React.useState(false);
  const [hasStructureChanges, setHasStructureChanges] = React.useState(false);


  // Simple comparison function
  const isEqual = (obj1, obj2) => {
    try {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
    } catch (error) {
      return false;
    }
  };

  // Check for changes on formState changes
  React.useEffect(() => {
    setHasChanges(!isEqual(formState, savedFormState));
  }, [formState, savedFormState]);

  // Check for changes on seasons and competition changes
  React.useEffect(() => {
    const seasonsChanged = !isEqual(seasons, savedSeasons);
    
    // Check if comp has changed (only if both comp and savedComp exist)
    let compChanged = false;
    if (comp && savedComp) {
      compChanged = (
        comp.TRANSFERS_WINDOW_START_DATE !== savedComp.TRANSFERS_WINDOW_START_DATE ||
        comp.TRANSFERS_WINDOW_END_DATE !== savedComp.TRANSFERS_WINDOW_END_DATE ||
        comp.CURRENT_SEASON !== savedComp.CURRENT_SEASON
      );
    }
    
    // Only update hasStructureChanges if we have both comp and savedComp, or if seasons changed
    if (comp && savedComp) {
      setHasStructureChanges(seasonsChanged || compChanged);
    } else if (seasons.length > 0 || savedSeasons.length > 0) {
      // If we don't have comp/savedComp yet, only check seasons
      setHasStructureChanges(seasonsChanged);
    }
  }, [seasons, savedSeasons, comp, savedComp]);







  // Handle tab change - no warning, direct change
  const handleTabChange = (newTab) => {
    setTab(newTab);
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error || !comp) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          {error || 'Competition not found'}
        </Typography>
        <Typography variant="body1">
          {error ? `Error: ${error}` : `Competition with ID ${id} was not found.`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
        {/* Header - always visible */}
        <Box sx={{ px: 4, pt: 4, pb: 2, bgcolor: '#f7fafd', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1201 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>Competition Details</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Typography sx={{ mr: 0.25 }}>ID</Typography>
                <TextField size="small" value={comp.id} disabled sx={{ width: 80, mr: 2 }} InputProps={{ readOnly: true }} />
                <Typography sx={{ mr: 0.25 }}>Competition Name</Typography>
                <TextField
                  size="small"
                  value={comp.name}
                  sx={{ width: 320, fontWeight: 600, color: '#1976d2', cursor: 'pointer', mr: 2 }}
                  InputProps={{
                    readOnly: true,
                    style: { cursor: 'pointer', fontWeight: 600, color: '#1976d2' },
                    onClick: () => {
                      // Use NAME_ID from competition object
                      setCompetitionTermId(comp.NAME_ID || null);
                      setTermsDialogOpen(true);
                    },
                  }}
                />
                <Typography sx={{ mr: 0.25 }}>Current Season</Typography>
                <TextField
                  size="small"
                  value={currentSeasonName || ''}
                  placeholder={comp.CURRENT_SEASON ? `Season ${comp.CURRENT_SEASON} (No term)` : 'No season'}
                  sx={{ width: 180, fontWeight: 600, color: currentSeasonName ? '#1976d2' : '#999', cursor: 'pointer', mr: 2 }}
                  InputProps={{
                    readOnly: true,
                    style: { cursor: 'pointer', fontWeight: 600, color: currentSeasonName ? '#1976d2' : '#999' },
                    onClick: () => {
                      // Find current season and get its NAME_ID
                      const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
                      if (currentSeason && currentSeason.nameId) {
                        // Check if term is in correct category before using it
                        api.getTerm(currentSeason.nameId).then(response => {
                          if (response.success && response.data && response.data.categoryId === 47) {
                            setSeasonTermId(currentSeason.nameId);
                          } else {
                            setSeasonTermId(null); // Create new term if wrong category
                          }
                          setSeasonDialogOpen(true);
                        }).catch(() => {
                          setSeasonTermId(null);
                          setSeasonDialogOpen(true);
                        });
                      } else {
                        setSeasonTermId(null); // Create new term if doesn't exist
                        setSeasonDialogOpen(true);
                      }
                    },
                  }}
                />
                <Typography sx={{ mr: 0.25 }}>Current Stage</Typography>
                <TextField
                  size="small"
                  value={currentStageName || ''}
                  placeholder={comp.CURRENT_STAGE ? `Stage ${comp.CURRENT_STAGE} (No term)` : 'No stage'}
                  sx={{ width: 150, fontWeight: 600, color: currentStageName ? '#1976d2' : '#999', cursor: 'pointer' }}
                  InputProps={{
                    readOnly: true,
                    style: { cursor: 'pointer', fontWeight: 600, color: currentStageName ? '#1976d2' : '#999' },
                    onClick: () => {
                      // Find current season and stage, get stage NAME_ID
                      const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
                      if (currentSeason) {
                        const currentStage = currentSeason.stages?.find(s => s.stageNum === comp.CURRENT_STAGE);
                        if (currentStage && currentStage.nameId) {
                          // Check if term is in correct category before using it
                          api.getTerm(currentStage.nameId).then(response => {
                            if (response.success && response.data && response.data.categoryId === 48) {
                              setStageTermId(currentStage.nameId);
                            } else {
                              setStageTermId(null); // Create new term if wrong category
                            }
                            setStageDialogOpen(true);
                          }).catch(() => {
                            setStageTermId(null);
                            setStageDialogOpen(true);
                          });
                        } else {
                          setStageTermId(null); // Create new term if doesn't exist
                          setStageDialogOpen(true);
                        }
                      } else {
                        setStageTermId(null);
                        setStageDialogOpen(true);
                      }
                    },
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, ml: 6 }}>
              <ImageIcon sx={{ fontSize: 80, color: '#bbb', cursor: 'pointer' }} onClick={() => setLogoDialogOpen(true)} />
              <EmojiEventsIcon sx={{ fontSize: 80, color: '#FFD700', cursor: 'pointer' }} onClick={() => setLogoDialogOpen(true)} />
            </Box>
          </Box>
        </Box>

        {/* Main Details Section - always visible */}
        <Box sx={{ px: 2, pt: 3, width: '100%', maxWidth: '100%', mx: 0 }}>
          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => handleTabChange(v)}
            sx={{
              mb: 3,
              minHeight: 44,
              borderBottom: '1px solid #e0e0e0',
              '& .MuiTabs-flexContainer': { gap: 8 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 16,
                minHeight: 40,
                minWidth: 120,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                color: '#2d3843',
                background: 'none',
                transition: 'background 0.2s',
                mr: 1,
              },
              '& .Mui-selected': {
                background: '#1976d2',
                color: '#fff !important',
                fontWeight: 700,
                boxShadow: '0 2px 8px 0 rgba(25,118,210,0.10)',
              },
              '& .MuiTab-root.Mui-selected, & .MuiTab-root.Mui-selected:focus, & .MuiTab-root.Mui-selected:hover': {
                color: '#fff !important',
                fontWeight: 700,
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab label="Configurations" />
            <Tab label="Structure" />

          </Tabs>

          {/* Tab Content */}
          {tab === 0 && (
            <ConfigurationsTab
              formState={formState}
              setFormState={setFormState}
              handleFieldChange={handleFieldChange}
              handleCheckboxChange={handleCheckboxChange}
              handleSave={handleSave}
              handleUpdateInServices={handleUpdateInServices}
              handleFormReload={handleFormReload}
              hasChanges={hasChanges}
              reloadFormLoading={reloadFormLoading}
              bracketDescriptions={bracketDescriptions}
              setBracketDescriptions={setBracketDescriptions}
              bracketFinalDescValue={bracketFinalDescValue}
              setBracketFinalDescValue={setBracketFinalDescValue}
              bracketFinalDescDialogOpen={bracketFinalDescDialogOpen}
              setBracketFinalDescDialogOpen={setBracketFinalDescDialogOpen}
              roundNames={roundNames}
              setRoundNames={setRoundNames}
              roundNameValue={roundNameValue}
              setRoundNameValue={setRoundNameValue}
              roundNameDialogOpen={roundNameDialogOpen}
              setRoundNameDialogOpen={setRoundNameDialogOpen}
              competitionTableSettings={competitionTableSettings}
              handleCompetitionTableSettingsChange={handleCompetitionTableSettingsChange}
              competitionRoundName={competitionRoundName}
              setCompetitionRoundName={setCompetitionRoundName}
              competitionRoundNameValue={competitionRoundNameValue}
              setCompetitionRoundNameValue={setCompetitionRoundNameValue}
              roundNameTermsDialogOpen={roundNameTermsDialogOpen}
              setRoundNameTermsDialogOpen={setRoundNameTermsDialogOpen}
              roundNameTermId={roundNameTermId}
              setRoundNameTermId={setRoundNameTermId}
              bracketFinalDescTermsDialogOpen={bracketFinalDescTermsDialogOpen}
              setBracketFinalDescTermsDialogOpen={setBracketFinalDescTermsDialogOpen}
              bracketFinalDescTermId={bracketFinalDescTermId}
              setBracketFinalDescTermId={setBracketFinalDescTermId}
              currentCompetitionId={comp?.COMPETITION_ID || comp?.id || id}
            />
          )}

          {tab === 1 && (
            <StructureTab
              seasons={seasons}
              setSeasons={setSeasons}
              selectedSeasonId={selectedSeasonId}
              setSelectedSeasonId={setSelectedSeasonId}
              selectedStageId={selectedStageId}
              setSelectedStageId={setSelectedStageId}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              selectedInSeason={selectedInSeason}
              setSelectedInSeason={setSelectedInSeason}
              selectedNotInSeason={selectedNotInSeason}
              setSelectedNotInSeason={setSelectedNotInSeason}
              handleStructureSave={handleStructureSave}
              handleStructureUpdateInServices={handleStructureUpdateInServices}
              handleStructureReload={handleStructureReload}
              hasStructureChanges={hasStructureChanges}
              setHasStructureChanges={setHasStructureChanges}
              reloadStructureLoading={reloadStructureLoading}
              handleSeasonKeyChange={handleSeasonKeyChange}
              handleSeasonStartDateChange={handleSeasonStartDateChange}
              handleSeasonEndDateChange={handleSeasonEndDateChange}
              handleSeasonConfigChange={handleSeasonConfigChange}
              handleTableSettingsChange={handleTableSettingsChange}
              handleSendTableUpdate={handleSendTableUpdate}
              handleConnectGamesToStage={handleConnectGamesToStage}
              handleConnectGamesToSeason={handleConnectGamesToSeason}
              setUpdateSnackbarMsg={setUpdateSnackbarMsg}
              setUpdateSnackbarType={setUpdateSnackbarType}
              setUpdateSnackbarOpen={setUpdateSnackbarOpen}
              competitionId={id}
              comp={comp}
              setComp={setComp}
              findOrCreateTerm={findOrCreateTerm}
            />
          )}


        </Box>

        {/* Snackbars */}
        <Snackbar open={updateSnackbarOpen} autoHideDuration={2000} onClose={() => setUpdateSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <MuiAlert elevation={6} variant="filled" onClose={() => setUpdateSnackbarOpen(false)} severity={updateSnackbarType} sx={{ width: '100%' }}>
            {updateSnackbarMsg}
          </MuiAlert>
        </Snackbar>

        {/* Dialogs */}
        <TermEditModal
          open={termsDialogOpen}
          onClose={() => {
            setTermsDialogOpen(false);
            setCompetitionTermId(null);
          }}
          termId={competitionTermId}
        />
        <TermEditModal
          open={seasonDialogOpen}
          onClose={() => {
            setSeasonDialogOpen(false);
            setSeasonTermId(null);
          }}
          termId={seasonTermId}
          initialCategory={47}
          competitionId={id}
          competitionName={comp?.name}
          onSave={async (savedTerm) => {
            // Update season NAME_ID if term was created or updated
            if (savedTerm && savedTerm.id && comp.CURRENT_SEASON) {
              const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
              if (currentSeason) {
                // Update season with NAME_ID (whether new or existing)
                try {
                  const seasonPayload = {
                    COMPETITION_ID: parseInt(id),
                    SEASON_NUM: currentSeason.seasonNum,
                    NAME_ID: savedTerm.id,
                    START_DATE: currentSeason.startDate || currentSeason.START_DATE,
                    END_DATE: currentSeason.endDate || currentSeason.END_DATE,
                    HAS_TABLE: currentSeason.HAS_TABLE || currentSeason.seasonConfig?.hasTable || false,
                    TABLE_WINNER_POINTS: currentSeason.TABLE_WINNER_POINTS || currentSeason.tableSettings?.winnerPoints || 3,
                    TABLE_DRAW_POINTS: currentSeason.TABLE_DRAW_POINTS || currentSeason.tableSettings?.drawPoints || 1,
                    TABLE_LOSER_POINTS: currentSeason.TABLE_LOSER_POINTS || currentSeason.tableSettings?.loserPoints || 0,
                    TABLE_IS_EVEN_EXISTS: currentSeason.TABLE_IS_EVEN_EXISTS || currentSeason.tableSettings?.isEvenExists || false,
                    USE_NAME: currentSeason.USE_NAME || currentSeason.seasonConfig?.useName || false,
                    SHOW_TOP_ATHLETES: currentSeason.SHOW_TOP_ATHLETES || currentSeason.seasonConfig?.showTopAthletes || false,
                    HAS_BRACKETS: currentSeason.HAS_BRACKETS || currentSeason.seasonConfig?.hasBrackets || false,
                    TABLE_COUNT_ET_SCORE: currentSeason.TABLE_COUNT_ET_SCORE || currentSeason.tableSettings?.countExtraTimeScore || false,
                    TABLE_COUNT_PEN_SCORE: currentSeason.TABLE_COUNT_PEN_SCORE || currentSeason.tableSettings?.countPenaltyScore || false,
                    HAS_HOME_TABLE: currentSeason.HAS_HOME_TABLE || currentSeason.seasonConfig?.hasHomeTable || false,
                    HAS_AWAY_TABLE: currentSeason.HAS_AWAY_TABLE || currentSeason.seasonConfig?.hasAwayTable || false,
                    SHOW_INFO_CARD: currentSeason.SHOW_INFO_CARD || currentSeason.seasonConfig?.hasInfoCard || false,
                    SHOW_MATCHES: currentSeason.SHOW_MATCHES || currentSeason.seasonConfig?.showMatches || false,
                  };
                  await api.updateSeason(`${id}-${currentSeason.seasonNum}`, seasonPayload);
                } catch (err) {
                  console.error('Failed to update season NAME_ID:', err);
                }
              }
            }
            // Reload the name from the saved term
            if (savedTerm && savedTerm.id) {
              try {
                const termResponse = await api.getTerm(savedTerm.id);
                if (termResponse.success && termResponse.data && termResponse.data.categoryId === 47) {
                  const term = termResponse.data;
                  const seasonName = term.engValue || 
                    (term.values?.find(v => v.languageId === 1)?.value) ||
                    (term.values?.find(v => v.isDefault)?.value);
                  if (seasonName) {
                    setCurrentSeasonName(seasonName);
                  }
                }
              } catch (err) {
                console.error('Failed to reload season name:', err);
              }
            }
          }}
        />
        <TermEditModal
          open={stageDialogOpen}
          onClose={() => {
            setStageDialogOpen(false);
            setStageTermId(null);
          }}
          termId={stageTermId}
          initialCategory={48}
          competitionId={id}
          competitionName={comp?.name}
          onSave={async (savedTerm) => {
            // Update stage NAME_ID if term was created or updated
            if (savedTerm && savedTerm.id && comp.CURRENT_STAGE && comp.CURRENT_SEASON) {
              const currentSeason = seasons.find(s => s.seasonNum === comp.CURRENT_SEASON);
              if (currentSeason) {
                const currentStage = currentSeason.stages?.find(s => s.stageNum === comp.CURRENT_STAGE);
                if (currentStage) {
                  // Update stage with NAME_ID (whether new or existing)
                  try {
                    const stagePayload = {
                      COMPETITION_ID: parseInt(id),
                      SEASON_NUM: currentSeason.seasonNum,
                      STAGE_NUM: currentStage.stageNum,
                      NAME_ID: savedTerm.id,
                      NUM_OF_GAMES: currentStage.NUM_OF_GAMES || currentStage.numOfGames || -1,
                      STAGE_TYPE: currentStage.STAGE_TYPE || (currentStage.type === 'group' ? 1 : 2),
                      HAS_TABLE: currentStage.HAS_TABLE || currentStage.hasTable || false,
                      TABLE_WINNER_POINTS: currentStage.TABLE_WINNER_POINTS || currentStage.tableSettings?.winnerPoints || 3,
                      TABLE_DRAW_POINTS: currentStage.TABLE_DRAW_POINTS || currentStage.tableSettings?.drawPoints || 1,
                      TABLE_LOSER_POINTS: currentStage.TABLE_LOSER_POINTS || currentStage.tableSettings?.loserPoints || 0,
                      TABLE_IS_EVEN_EXISTS: currentStage.TABLE_IS_EVEN_EXISTS || currentStage.tableSettings?.isEvenExists || false,
                      USE_NAME: currentStage.USE_NAME || currentStage.useName || false,
                      IS_FINAL: currentStage.IS_FINAL || currentStage.isFinal || false,
                      START_DATE: currentStage.START_DATE || currentStage.startDate,
                      END_DATE: currentStage.END_DATE || currentStage.endDate,
                      TABLE_COUNT_ET_SCORE: currentStage.TABLE_COUNT_ET_SCORE || currentStage.tableSettings?.countExtraTimeScore || false,
                      TABLE_COUNT_PEN_SCORE: currentStage.TABLE_COUNT_PEN_SCORE || currentStage.tableSettings?.countPenaltyScore || false,
                      HAS_HOME_TABLE: currentStage.HAS_HOME_TABLE || currentStage.hasHomeTable || false,
                      HAS_AWAY_TABLE: currentStage.HAS_AWAY_TABLE || currentStage.hasAwayTable || false,
                    };
                    await api.updateStage(`${id}-${currentSeason.seasonNum}-${currentStage.stageNum}`, stagePayload);
                  } catch (err) {
                    console.error('Failed to update stage NAME_ID:', err);
                  }
                }
              }
            }
            // Reload the name from the saved term
            if (savedTerm && savedTerm.id) {
              try {
                const termResponse = await api.getTerm(savedTerm.id);
                if (termResponse.success && termResponse.data && termResponse.data.categoryId === 48) {
                  const term = termResponse.data;
                  const stageName = term.engValue || 
                    (term.values?.find(v => v.languageId === 1)?.value) ||
                    (term.values?.find(v => v.isDefault)?.value);
                  if (stageName) {
                    setCurrentStageName(stageName);
                  }
                }
              } catch (err) {
                console.error('Failed to reload stage name:', err);
              }
            }
          }}
        />
        <Dialog open={logoDialogOpen} onClose={() => setLogoDialogOpen(false)} maxWidth="xs" fullWidth>
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Competition Logo / Trophy</Typography>
            <ImageIcon sx={{ fontSize: 120, color: '#bbb', mb: 2 }} />
            <Button variant="contained" component="label">
              Upload Image
              <input type="file" hidden />
            </Button>
          </Box>
        </Dialog>

      </Box>
  );
} 