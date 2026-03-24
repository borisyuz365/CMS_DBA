import React from 'react';
import {
  Box, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, FormControlLabel, Checkbox, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TermEditModal from '../../TermEditModal';
import SaveUpdateButtons from '../../SaveUpdateButtons';
import SettingsIcon from '@mui/icons-material/Settings';
import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';
import GroupIcon from '@mui/icons-material/Group';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import api from '../../services/api';
import {
  SectionContainer,
  FormTextField,
  FormCheckbox,
  FormSelect,
  FormGrid,
  FormGridItem,
  InlineFieldGroup
} from '../FormFields';
import { FORM_CONSTANTS } from '../../theme/formConstants';
const competitorTypes = ['Team', 'Athlete'];
const competitionTypes = ['Tournament', 'League', 'Cup'];
const genders = ['Male', 'Female', 'Mixed'];
const standingTypes = ['League Table', 'Knockout', 'Group Stage', 'Swiss'];
const buzzItemTypes = ['PremiumSocial', 'News', 'Video'];
const h2hLayouts = ['Default', 'Compact', 'Detailed'];
const subSportTypes = ['Regular', 'TwoHalves'];
const tennisSubSportTypes = ['Regular', 'Five Sets'];
const surfaceTypes = ['Hard', 'Clay', 'Grass'];

function ConfigurationsTab({
  formState,
  setFormState,
  handleFieldChange,
  handleCheckboxChange,
  handleSave,
  handleUpdateInServices,
  handleFormReload,
  hasChanges,
  reloadFormLoading,
  bracketDescriptions,
  setBracketDescriptions,
  bracketFinalDescValue,
  setBracketFinalDescValue,
  bracketFinalDescDialogOpen,
  setBracketFinalDescDialogOpen,
  roundNames,
  setRoundNames,
  roundNameValue,
  setRoundNameValue,
  roundNameDialogOpen,
  setRoundNameDialogOpen,
  competitionTableSettings,
  handleCompetitionTableSettingsChange,
  competitionRoundName,
  setCompetitionRoundName,
  competitionRoundNameValue,
  setCompetitionRoundNameValue,
  roundNameTermsDialogOpen,
  setRoundNameTermsDialogOpen,
  roundNameTerms,
  setRoundNameTerms,
  roundNameTermId,
  setRoundNameTermId,
  bracketFinalDescTermsDialogOpen,
  setBracketFinalDescTermsDialogOpen,
  bracketFinalDescTerms,
  setBracketFinalDescTerms,
  bracketFinalDescTermId,
  setBracketFinalDescTermId,
  currentCompetitionId
}) {
  const [countries, setCountries] = React.useState([]);
  const [sports, setSports] = React.useState([]);
  const [fatherCompetitions, setFatherCompetitions] = React.useState(['Unset']);
  const [sportsData, setSportsData] = React.useState([]);

  // Fetch countries and sports from API
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesRes, sportsRes] = await Promise.all([
          api.getCountries(),
          api.getSports()
        ]);

        // Store sports data for filtering
        if (sportsRes.success && sportsRes.data) {
          setSportsData(sportsRes.data);
        }

        if (countriesRes.success && countriesRes.data) {
          const countryNames = countriesRes.data
            .map(c => c.name || c.COUNTRY_CODE)
            .filter(Boolean)
            .sort();
          
          // Always ensure current form value is in the list to avoid MUI warnings
          const currentCountry = formState.country;
          if (currentCountry && !countryNames.includes(currentCountry)) {
            countryNames.unshift(currentCountry);
          }
          
          setCountries(countryNames);
        } else {
          // If API fails, at least include current value
          const fallbackCountries = formState.country ? [formState.country] : [];
          setCountries(fallbackCountries);
        }

        if (sportsRes.success && sportsRes.data) {
          const sportNames = sportsRes.data
            .map(s => s.name || s.ALIAS_NAME)
            .filter(Boolean)
            .sort();
          
          // Always ensure current form value is in the list to avoid MUI warnings
          const currentSport = formState.sport;
          if (currentSport && !sportNames.includes(currentSport)) {
            sportNames.unshift(currentSport);
          }
          
          setSports(sportNames);
        } else {
          // If API fails, at least include current value
          const fallbackSports = formState.sport ? [formState.sport] : [];
          setSports(fallbackSports);
        }
      } catch (err) {
        console.error('Failed to fetch countries/sports:', err);
        // Fallback: include current form values if available
        const fallbackCountries = formState.country ? [formState.country] : [];
        const fallbackSports = formState.sport ? [formState.sport] : [];
        setCountries(fallbackCountries);
        setSports(fallbackSports);
      }
    };

    fetchData();
  }, []); // Only run once on mount

  // Update countries/sports when formState changes to include new values
  React.useEffect(() => {
    if (formState.country && !countries.includes(formState.country)) {
      setCountries(prev => [formState.country, ...prev.filter(c => c !== formState.country)]);
    }
  }, [formState.country, countries]);

  React.useEffect(() => {
    if (formState.sport && !sports.includes(formState.sport)) {
      setSports(prev => [formState.sport, ...prev.filter(s => s !== formState.sport)]);
    }
  }, [formState.sport, sports]);

  // Fetch and filter competitions by sport type for Father Competition dropdown
  React.useEffect(() => {
    const fetchFatherCompetitions = async () => {
      if (!formState.sport) {
        setFatherCompetitions(['Unset']);
        return;
      }

      try {
        // Find the sport ID from the sport name
        const sport = sportsData.find(s => 
          (s.name && s.name === formState.sport) || 
          (s.ALIAS_NAME && s.ALIAS_NAME === formState.sport)
        );
        
        if (!sport || !sport.SPORT_TYPE_ID) {
          setFatherCompetitions(['Unset']);
          return;
        }

        // Fetch all competitions
        const competitionsRes = await api.getCompetitions();
        
        if (competitionsRes.success && competitionsRes.data) {
          // Filter competitions by the same sport type and exclude current competition
          const filteredCompetitions = competitionsRes.data
            .filter(comp => 
              comp.SPORT_TYPE_ID === sport.SPORT_TYPE_ID &&
              comp.COMPETITION_ID !== currentCompetitionId
            )
            .map(comp => ({
              id: comp.COMPETITION_ID,
              name: comp.name || `Competition ${comp.COMPETITION_ID}`,
              nameId: comp.NAME_ID
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          // Build the options list: 'Unset' + filtered competitions
          const options = ['Unset', ...filteredCompetitions.map(c => c.name)];
          
          // Ensure current value is in the list
          if (formState.fatherCompetition && !options.includes(formState.fatherCompetition)) {
            options.push(formState.fatherCompetition);
          }
          
          setFatherCompetitions(options);
        } else {
          setFatherCompetitions(['Unset']);
        }
      } catch (err) {
        console.error('Failed to fetch father competitions:', err);
        setFatherCompetitions(['Unset']);
      }
    };

    fetchFatherCompetitions();
  }, [formState.sport, sportsData, formState.fatherCompetition, currentCompetitionId]);

  // Validation for PopUp Relevancy (Hours)
  const popupRelevancyValue = formState.gameSummaryRelevancy;
  const popupRelevancyError = popupRelevancyValue && (!/^[0-9]{1,3}$/.test(popupRelevancyValue));

  // Clear standing type when sport changes from basketball to something else
  React.useEffect(() => {
    if (formState.sport !== 'Basketball' && formState.standingType) {
      handleFieldChange('standingType', '');
    }
  }, [formState.sport, formState.standingType, handleFieldChange]);

  // Clear update priority when second scanner checkbox is unchecked
  React.useEffect(() => {
    const isSecondScannerEnabled = formState.checkboxes?.['updateResultSecondScanner'] ?? false;
    if (!isSecondScannerEnabled && formState.updatePriorityAbove) {
      handleFieldChange('updatePriorityAbove', '');
    }
  }, [formState.checkboxes, formState.updatePriorityAbove, handleFieldChange]);

  // Clear football-specific fields when sport changes from football to something else
  React.useEffect(() => {
    if (formState.sport !== 'Football') {
      if (formState.checkboxes?.['lineupsNotificationDelay']) {
        handleCheckboxChange('lineupsNotificationDelay')({ target: { checked: false } });
      }
      if (formState.checkboxes?.['requireFormation']) {
        handleCheckboxChange('requireFormation')({ target: { checked: false } });
      }
      if (formState.lineupsNotificationDelayValue) {
        handleFieldChange('lineupsNotificationDelayValue', '');
      }
      // Clear football-specific status & score parameters
      if (formState.checkboxes?.['automaticStatusProgress']) {
        handleCheckboxChange('automaticStatusProgress')({ target: { checked: false } });
      }
      if (formState.checkboxes?.['autoProcessAddedTime']) {
        handleCheckboxChange('autoProcessAddedTime')({ target: { checked: false } });
      }
      if (formState.checkboxes?.['supportTieOn90']) {
        handleCheckboxChange('supportTieOn90')({ target: { checked: false } });
      }
    }
  }, [formState.sport, formState.checkboxes, formState.lineupsNotificationDelayValue, handleFieldChange, handleCheckboxChange]);

  // Clear basketball-specific fields when sport changes from basketball to something else
  React.useEffect(() => {
    if (formState.sport !== 'Basketball') {
      if (formState.personalFoulsLimit) {
        handleFieldChange('personalFoulsLimit', '');
      }
      if (formState.teamFoulsLimit) {
        handleFieldChange('teamFoulsLimit', '');
      }
    }
  }, [formState.sport, formState.personalFoulsLimit, formState.teamFoulsLimit, handleFieldChange]);

  // Clear sub sport type when sport changes from tennis/basketball to something else
  React.useEffect(() => {
    if (formState.sport !== 'Tennis' && formState.sport !== 'Basketball' && formState.subSportType) {
      handleFieldChange('subSportType', '');
    }
  }, [formState.sport, formState.subSportType, handleFieldChange]);

  // Clear surface type when sport changes from tennis to something else
  React.useEffect(() => {
    if (formState.sport !== 'Tennis' && formState.surfaceType) {
      handleFieldChange('surfaceType', '');
    }
  }, [formState.sport, formState.surfaceType, handleFieldChange]);

  // Table settings dialog state
  const [tableSettingsDialogOpen, setTableSettingsDialogOpen] = React.useState(false);
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

  return (
    <Box sx={{ width: '100%', p: 2, pb: 16, bgcolor: '#fff', borderRadius: 2, boxShadow: 1, position: 'relative' }}>
      {/* Top Dropdowns Section */}
      <FormGrid spacing={3} sx={{ mb: 3 }}>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Country"
            value={formState.country || ''}
            onChange={(e) => handleFieldChange('country', e.target.value)}
            options={countries.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Sport Type"
            value={formState.sport || ''}
            onChange={(e) => handleFieldChange('sport', e.target.value)}
            options={sports.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Competitor Type"
            value={formState.competitorType || ''}
            onChange={(e) => handleFieldChange('competitorType', e.target.value)}
            options={competitorTypes.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Competition Type"
            value={formState.competitionType || ''}
            onChange={(e) => handleFieldChange('competitionType', e.target.value)}
            options={competitionTypes.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Father Competition"
            value={formState.fatherCompetition || ''}
            onChange={(e) => handleFieldChange('fatherCompetition', e.target.value)}
            options={fatherCompetitions.map(opt => ({ value: opt === 'Unset' ? '' : opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Gender"
            value={formState.gender || ''}
            onChange={(e) => handleFieldChange('gender', e.target.value)}
            options={genders.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        {formState.sport === 'Basketball' && (
          <FormGridItem xs={12} sm={6} md={4} lg={3}>
            <FormSelect
              label="Standing Type"
              value={formState.standingType || ''}
              onChange={(e) => handleFieldChange('standingType', e.target.value)}
              options={standingTypes.map(opt => ({ value: opt, label: opt }))}
              displayEmpty
              width="full"
            />
          </FormGridItem>
        )}
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="Buzz Item Type"
            value={formState.buzzItemType || ''}
            onChange={(e) => handleFieldChange('buzzItemType', e.target.value)}
            options={buzzItemTypes.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
        <FormGridItem xs={12} sm={6} md={4} lg={3}>
          <FormSelect
            label="H2H Layout"
            value={formState.h2hLayout || ''}
            onChange={(e) => handleFieldChange('h2hLayout', e.target.value)}
            options={h2hLayouts.map(opt => ({ value: opt, label: opt }))}
            displayEmpty
            width="full"
          />
        </FormGridItem>
      </FormGrid>

      {/* Table Settings Button - moved above General section */}
      <Box sx={{ mt: 3, mb: 3, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setTableSettingsForm(competitionTableSettings);
            setOrderParameters(competitionTableSettings?.orderParameters || []);
            setNewOrderParameter({ field: '', direction: 'desc' });
            setTableSettingsDialogOpen(true);
          }}
          startIcon={<SettingsIcon />}
          sx={{ 
            minWidth: 160,
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
          onClick={() => {/* TODO: Cards Order functionality */}}
          startIcon={<FeaturedPlayListIcon />}
          sx={{ 
            minWidth: 160,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { 
              borderColor: '#1565c0',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Cards Order
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {/* TODO: Featured Match functionality */}}
          startIcon={<FeaturedPlayListIcon />}
          sx={{ 
            minWidth: 160,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { 
              borderColor: '#1565c0',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Featured Match
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {/* TODO: Team Of The Week functionality */}}
          startIcon={<GroupIcon />}
          sx={{ 
            minWidth: 160,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { 
              borderColor: '#1565c0',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Team Of The Week
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {/* TODO: Live Draw functionality */}}
          startIcon={<CasinoIcon />}
          sx={{ 
            minWidth: 160,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { 
              borderColor: '#1565c0',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Draw
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {/* TODO: Winners functionality */}}
          startIcon={<EmojiEventsIcon />}
          sx={{ 
            minWidth: 160,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { 
              borderColor: '#1565c0',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Winners
        </Button>
      </Box>

      {/* General Section */}
      <SectionContainer title="General">
        <FormGrid>
          {[
            { field: 'supportCompetitionDashboard', tooltip: 'Enable competition-specific dashboard with detailed statistics and insights' },
            { field: 'supportPastFinalsStandings', tooltip: 'Show historical final standings and results from previous seasons' },
            { field: 'enableDashboardBuzz', tooltip: 'Display buzz items and social media content on the competition dashboard' },
            { field: 'hideOnCatalog', tooltip: 'Hide this competition from the main catalog/listing page' },
            { field: 'hideOnSearch', tooltip: 'Exclude this competition from search results' },
            { field: 'dontDisplayFathersH2h', tooltip: 'Hide head-to-head statistics from parent competitions' },
            { field: 'hideFromPopularWhenNoActive', tooltip: 'Hide from popular competitions when no active games are running' },
            { field: 'promoteDuringActiveSeason', tooltip: 'Promote this competition more prominently during active season periods' },
            { field: 'hideLmtInCompetitionGames', tooltip: 'Hide LMT (Live Match Tracker) features in competition games' },
            { field: 'supportFansRate', tooltip: 'Enable fans rate feature to display collective predictions and insights' },
          ].map(({ field, tooltip }) => (
            <FormGridItem key={field}>
              <FormCheckbox
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                checked={formState.checkboxes?.[field] ?? false}
                onChange={handleCheckboxChange(field)}
                tooltip={tooltip}
              />
            </FormGridItem>
          ))}
          
          {/* Trophy Settings - inline */}
          <FormGridItem>
            <InlineFieldGroup>
              <FormCheckbox
                label="Recently Won Trophy Card"
                checked={formState.checkboxes?.['recentlyWonTrophyCard'] ?? false}
                onChange={handleCheckboxChange('recentlyWonTrophyCard')}
                tooltip="Display recently won trophy cards with specified count limit"
              />
              <FormTextField
                width="small"
                value={formState.recentlyWonTrophyCardValue || ''}
                onChange={e => handleFieldChange('recentlyWonTrophyCardValue', e.target.value)}
                disabled={!(formState.checkboxes?.['recentlyWonTrophyCard'] ?? false)}
                inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </InlineFieldGroup>
          </FormGridItem>
          
          <FormGridItem>
            <InlineFieldGroup>
              <FormCheckbox
                label="Promote New Trophy"
                checked={formState.checkboxes?.['promoteNewTrophy'] ?? false}
                onChange={handleCheckboxChange('promoteNewTrophy')}
                tooltip="Promote new trophy achievements with specified promotion count"
              />
              <FormTextField
                width="small"
                value={formState.promoteNewTrophyValue || ''}
                onChange={e => handleFieldChange('promoteNewTrophyValue', e.target.value)}
                disabled={!(formState.checkboxes?.['promoteNewTrophy'] ?? false)}
                inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </InlineFieldGroup>
          </FormGridItem>
          
          {/* Sub Sport Type - only for Tennis and Basketball */}
          {(formState.sport === 'Tennis' || formState.sport === 'Basketball') && (
            <FormGridItem>
              <FormSelect
                label="Sub Sport Type"
                value={formState.subSportType || ''}
                onChange={(e) => handleFieldChange('subSportType', e.target.value)}
                options={(formState.sport === 'Tennis' ? tennisSubSportTypes : subSportTypes).map(opt => ({ value: opt, label: opt }))}
                tooltip="Select the sub-sport type that determines the specific format and rules for this competition"
                displayEmpty
              />
            </FormGridItem>
          )}

          {/* Surface Type - only for Tennis */}
          {formState.sport === 'Tennis' && (
            <FormGridItem>
              <FormSelect
                label="Surface Type"
                value={formState.surfaceType || ''}
                onChange={(e) => handleFieldChange('surfaceType', e.target.value)}
                options={surfaceTypes.map(opt => ({ value: opt, label: opt }))}
                tooltip="Select the surface type for tennis competitions"
                displayEmpty
              />
            </FormGridItem>
          )}

          {/* Tier */}
          <FormGridItem>
            <FormTextField
              label="Tier"
              value={formState.tier || '1'}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || (/^[1-9][0-9]?$/.test(val))) {
                  handleFieldChange('tier', val);
                }
              }}
              tooltip="Competition tier/level (1 = highest tier, higher numbers = lower tiers)"
              width="full"
              inputProps={{ maxLength: 2, inputMode: 'numeric', pattern: '[0-9]*' }}
            />
          </FormGridItem>

          {/* Image */}
          <FormGridItem>
            <FormTextField
              label="Image"
              value={formState.image || ''}
              onChange={e => handleFieldChange('image', e.target.value)}
              tooltip="Competition image/logo URL or path"
              width="full"
            />
          </FormGridItem>

          {/* Select Description */}
          <FormGridItem>
            <FormTextField
              label="Select Description"
              value={formState.selectDescription || ''}
              onChange={e => handleFieldChange('selectDescription', e.target.value)}
              tooltip="Description for selection/dropdown display"
              width="full"
            />
          </FormGridItem>

          {/* Select Round Name */}
          <FormGridItem>
            <FormTextField
              label="Select Round Name"
              value={formState.selectRoundName || ''}
              onChange={e => handleFieldChange('selectRoundName', e.target.value)}
              tooltip="Round name for selection/dropdown display"
              width="full"
            />
          </FormGridItem>

          {/* Current Round / Round Name / Bracket Final - Combined Line */}
          <FormGridItem xs={12}>
            <InlineFieldGroup gap={3}>
              {/* Round Name - Left Side */}
              <InlineFieldGroup>
                <FormCheckbox
                  label="Round Name"
                  checked={competitionRoundName}
                  onChange={(e) => setCompetitionRoundName(e.target.checked)}
                />
                <FormSelect
                  label="Round Name"
                  value={competitionRoundNameValue}
                  onChange={(e) => setCompetitionRoundNameValue(e.target.value)}
                  options={['Week', 'Matchweek', 'Match', 'Round', 'Game'].map(opt => ({ value: opt, label: opt }))}
                  disabled={!competitionRoundName}
                  displayEmpty
                  width="medium"
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!competitionRoundName}
                  onClick={() => {
                    setRoundNameTermId(null);
                    setRoundNameTermsDialogOpen(true);
                  }}
                  sx={{ minWidth: 40, px: 1 }}
                >
                  ...
                </Button>
              </InlineFieldGroup>

              {/* Current Round - Middle */}
              <InlineFieldGroup>
                <Typography variant="body2" sx={FORM_CONSTANTS.typography.label}>Current Round:</Typography>
                <FormTextField
                  width="small"
                  value={formState.currentRound || '-1'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || (/^-?[0-9]{0,3}$/.test(val))) {
                      handleFieldChange('currentRound', val);
                    }
                  }}
                  tooltip="Set the current round number for the competition"
                  inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '-?[0-9]*' }}
                />
              </InlineFieldGroup>

              {/* Bracket Final - Right Side */}
              <InlineFieldGroup>
                <FormCheckbox
                  label="Bracket Final"
                  checked={formState.checkboxes?.['bracketFinal'] ?? false}
                  onChange={handleCheckboxChange('bracketFinal')}
                  tooltip="Enable bracket final functionality for tournament competitions"
                />
                <Typography variant="body2" sx={{ minWidth: 'fit-content', color: '#666' }}>Description:</Typography>
                <FormSelect
                  label="Description"
                  value={formState.bracketFinalDescription || ''}
                  onChange={e => handleFieldChange('bracketFinalDescription', e.target.value)}
                  options={['Final', 'Championship', 'Grand Final', 'Title Match'].map(opt => ({ value: opt, label: opt }))}
                  disabled={!(formState.checkboxes?.['bracketFinal'] ?? false)}
                  displayEmpty
                  width="medium"
                />
                <Tooltip title="Open description configuration dialog" placement="top" arrow>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!(formState.checkboxes?.['bracketFinal'] ?? false)}
                      onClick={() => {
                        setBracketFinalDescTermId(null);
                        setBracketFinalDescTermsDialogOpen(true);
                      }}
                      sx={{ minWidth: 40, px: 1 }}
                    >
                      ...
                    </Button>
                  </span>
                </Tooltip>
              </InlineFieldGroup>
            </InlineFieldGroup>
          </FormGridItem>

          {/* Time Span Settings - all three on same row */}
          <FormGridItem xs={12}>
            <InlineFieldGroup gap={3}>
              {/* Recognition Time Span - First */}
              <InlineFieldGroup>
                <Typography variant="body2" sx={FORM_CONSTANTS.typography.label}>Recognition Time Span:</Typography>
                <FormTextField
                  width="small"
                  label="Hours"
                  value={formState.recognitionTimeSpan || ''}
                  onChange={e => handleFieldChange('recognitionTimeSpan', e.target.value)}
                  tooltip="Hours to display recognition content after achievements"
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
              </InlineFieldGroup>

              {/* Article Time Span - Second */}
              <InlineFieldGroup>
                <Typography variant="body2" sx={FORM_CONSTANTS.typography.label}>Article Time Span:</Typography>
                <FormTextField
                  width="small"
                  label="Before"
                  value={formState.articleTimeSpanBefore || ''}
                  onChange={e => handleFieldChange('articleTimeSpanBefore', e.target.value)}
                  tooltip="Hours before the event to display articles"
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <FormTextField
                  width="small"
                  label="After"
                  value={formState.articleTimeSpanAfter || ''}
                  onChange={e => handleFieldChange('articleTimeSpanAfter', e.target.value)}
                  tooltip="Hours after the event to display articles"
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <Tooltip title="Reset to default values (48 hours)" placement="top" arrow>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      handleFieldChange('articleTimeSpanBefore', '48');
                      handleFieldChange('articleTimeSpanAfter', '48');
                    }}
                    sx={{ fontSize: '0.75rem', px: 1, py: 0.5 }}
                  >
                    Reset
                  </Button>
                </Tooltip>
              </InlineFieldGroup>

              {/* Premium Social Time Span - Third */}
              <InlineFieldGroup>
                <Typography variant="body2" sx={FORM_CONSTANTS.typography.label}>Premium Social Time Span:</Typography>
                <FormTextField
                  width="small"
                  label="Before"
                  value={formState.premiumSocialTimeSpanBefore || ''}
                  onChange={e => handleFieldChange('premiumSocialTimeSpanBefore', e.target.value)}
                  tooltip="Hours before the event to display premium social content"
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <FormTextField
                  width="small"
                  label="After"
                  value={formState.premiumSocialTimeSpanAfter || ''}
                  onChange={e => handleFieldChange('premiumSocialTimeSpanAfter', e.target.value)}
                  tooltip="Hours after the event to display premium social content"
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <Tooltip title="Reset to default values (48 hours)" placement="top" arrow>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      handleFieldChange('premiumSocialTimeSpanBefore', '48');
                      handleFieldChange('premiumSocialTimeSpanAfter', '48');
                    }}
                    sx={{ fontSize: '0.75rem', px: 1, py: 0.5 }}
                  >
                    Reset
                  </Button>
                </Tooltip>
              </InlineFieldGroup>
            </InlineFieldGroup>
          </FormGridItem>
        </FormGrid>
      </SectionContainer>

      {/* Status & Score Section */}
      <SectionContainer title="Status & Score">
        <FormGrid>
          {/* General parameters - always visible */}
          {[
            { field: 'automaticStartOfGames', tooltip: 'Automatically start games at scheduled times without manual intervention' },
            { field: 'autoTransferWaitApproval', tooltip: 'Automatically transfer games to waiting for approval status' },
          ].map(({ field, tooltip }) => (
            <FormGridItem key={field} xs={12} sm={6} md={3} lg={3}>
              <FormCheckbox
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                checked={formState.checkboxes?.[field] ?? false}
                onChange={handleCheckboxChange(field)}
                tooltip={tooltip}
              />
            </FormGridItem>
          ))}
          
          {/* Football-specific parameters - only visible for Football */}
          {formState.sport === 'Football' && [
            { field: 'automaticStatusProgress', tooltip: 'Automatically update game status (pre-game, live, finished) based on game events' },
            { field: 'autoProcessAddedTime', tooltip: 'Automatically process and display added/injury time during live games' },
            { field: 'supportTieOn90', tooltip: 'Support tie games that end in a draw after 90 minutes' },
          ].map(({ field, tooltip }) => (
            <FormGridItem key={field} xs={12} sm={6} md={3} lg={3}>
              <FormCheckbox
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                checked={formState.checkboxes?.[field] ?? false}
                onChange={handleCheckboxChange(field)}
                tooltip={tooltip}
              />
            </FormGridItem>
          ))}
          
          {/* Checkbox with dependent dropdown */}
          <FormGridItem xs={12} sm={6} md={6} lg={6}>
            <InlineFieldGroup>
              <FormCheckbox
                label="Update Result Only From Second Scanner"
                checked={formState.checkboxes?.['updateResultSecondScanner'] ?? false}
                onChange={handleCheckboxChange('updateResultSecondScanner')}
                tooltip="Update Game Current Result only from 2nd source"
              />
              <FormSelect
                label="Priority"
                value={formState.updatePriorityAbove || ''}
                onChange={e => handleFieldChange('updatePriorityAbove', e.target.value)}
                options={[6, 5, 4, 3, 2, 1].map(num => ({ value: String(num), label: `Priority ${num}` }))}
                disabled={!(formState.checkboxes?.['updateResultSecondScanner'] ?? false)}
                displayEmpty
                width="small"
              />
            </InlineFieldGroup>
          </FormGridItem>

          {/* Scores Update Policy */}
          <FormGridItem xs={12} sm={6} md={3} lg={3}>
            <FormSelect
              label="Scores Update Policy"
              value={formState.scoresUpdatePolicy || ''}
              onChange={e => handleFieldChange('scoresUpdatePolicy', e.target.value)}
              options={[
                { value: '1', label: 'Always Update' },
                { value: '2', label: 'Only If Different' },
                { value: '3', label: 'Manual Only' },
              ]}
              tooltip="Policy for updating scores (1 = Always, 2 = Only if different, etc.)"
              displayEmpty
              width="full"
            />
          </FormGridItem>
        </FormGrid>
      </SectionContainer>

      {/* Notifications Section */}
      <SectionContainer title="Notifications">
        <FormGrid>
          <FormGridItem xs={12}>
            <InlineFieldGroup gap={3}>
              {/* Game Summary Popup with Relevancy */}
              <InlineFieldGroup>
                <FormCheckbox
                  label="Game Summary Popup"
                  checked={formState.checkboxes?.['gameSummaryPopup'] ?? false}
                  onChange={handleCheckboxChange('gameSummaryPopup')}
                  tooltip="Show game summary popup with key statistics and highlights after game ends"
                />
                <FormTextField
                  width={130}
                  label="Relevancy (Hours)"
                  value={formState.gameSummaryRelevancy}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || (/^[0-9]{0,3}$/.test(val))) {
                      handleFieldChange('gameSummaryRelevancy', val);
                    }
                  }}
                  error={popupRelevancyError}
                  helperText={popupRelevancyError ? 'Up to 3 digits, numbers only' : ''}
                  inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }}
                  disabled={!(formState.checkboxes?.['gameSummaryPopup'] ?? false)}
                  InputLabelProps={{ shrink: true, style: { whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'unset' } }}
                />
              </InlineFieldGroup>

              {/* Game Summary Notifications */}
              <FormCheckbox
                label="Game Summary Notifications"
                checked={formState.checkboxes?.['gameSummaryNotifications'] ?? false}
                onChange={handleCheckboxChange('gameSummaryNotifications')}
                tooltip="Send push notifications with game summary and key highlights"
              />

              {/* Allow Notifications */}
              <FormCheckbox
                label="Allow Notifications"
                checked={formState.checkboxes?.['allowNotifications'] ?? false}
                onChange={handleCheckboxChange('allowNotifications')}
                tooltip="Enable all types of notifications for this competition"
              />

              {/* Hide Player Game Card */}
              <FormCheckbox
                label="Hide Player Game Card"
                checked={formState.checkboxes?.['hidePlayerGameCard'] ?? false}
                onChange={handleCheckboxChange('hidePlayerGameCard')}
                tooltip="Hide individual player game cards and statistics"
              />

              {/* Lineups Notification Delay - Football specific */}
              {formState.sport === 'Football' && (
                <InlineFieldGroup>
                  <FormCheckbox
                    label="Lineups Notification Delay"
                    checked={formState.checkboxes?.['lineupsNotificationDelay'] ?? false}
                    onChange={handleCheckboxChange('lineupsNotificationDelay')}
                    tooltip="Delay lineups notifications when player/s disconnected in starting XI"
                  />
                  <FormTextField
                    width="small"
                    label="Minutes"
                    value={formState.lineupsNotificationDelayValue || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (/^[1-9][0-9]?$/.test(val))) {
                        handleFieldChange('lineupsNotificationDelayValue', val);
                      }
                    }}
                    error={!!formState.lineupsNotificationDelayValue && !/^[1-9][0-9]?$/.test(formState.lineupsNotificationDelayValue)}
                    helperText={!!formState.lineupsNotificationDelayValue && !/^[1-9][0-9]?$/.test(formState.lineupsNotificationDelayValue) ? 'Enter 1-99 (positive integer)' : ''}
                    inputProps={{ maxLength: 2, inputMode: 'numeric', pattern: '[0-9]*' }}
                    disabled={!(formState.checkboxes?.['lineupsNotificationDelay'] ?? false)}
                  />
                </InlineFieldGroup>
              )}
            </InlineFieldGroup>
          </FormGridItem>
        </FormGrid>
      </SectionContainer>

      {/* Players & Statistics Section */}
      <SectionContainer title="Players & Statistics">
        <FormGrid>
          <FormGridItem xs={12}>
            <InlineFieldGroup gap={3}>
              {/* Statistics - Display Top Preformers */}
              <InlineFieldGroup>
                <FormCheckbox
                  label="Display Top Preformers"
                  checked={formState.checkboxes?.['displayTopPrefers'] ?? false}
                  onChange={handleCheckboxChange('displayTopPrefers')}
                  tooltip="Display top performing athletes/players with their statistics and achievements"
                />
                <FormSelect
                  label="Status"
                  value={formState.displayTopPreformersStatus || ''}
                  onChange={e => handleFieldChange('displayTopPreformersStatus', e.target.value)}
                  options={[
                    { value: 'All', label: 'All' },
                    { value: 'Pre Game only', label: 'Pre Game only' },
                    { value: 'Live & Post', label: 'Live & Post' },
                  ]}
                  disabled={!(formState.checkboxes?.['displayTopPrefers'] ?? false)}
                  displayEmpty
                  width="small"
                />
              </InlineFieldGroup>

              {/* Statistics - Hide Competition Stats */}
              <FormCheckbox
                label="Hide Competition Stats"
                checked={formState.checkboxes?.['hideCompetitionStats'] ?? false}
                onChange={handleCheckboxChange('hideCompetitionStats')}
                tooltip="Hide all competition statistics and performance metrics"
              />

              {/* Predictable Lineups Restriction */}
              <InlineFieldGroup>
                <FormCheckbox
                  label="Predictable Lineups Restriction"
                  checked={formState.checkboxes?.['predictableLineupsRestriction'] ?? false}
                  onChange={handleCheckboxChange('predictableLineupsRestriction')}
                  tooltip="Restrict predictable lineups based on specified criteria"
                />
                <FormTextField
                  width={120}
                  label="Restriction Value"
                  value={formState.predictableLineupsRestrictionValue || ''}
                  onChange={e => handleFieldChange('predictableLineupsRestrictionValue', e.target.value)}
                  disabled={!(formState.checkboxes?.['predictableLineupsRestriction'] ?? false)}
                />
              </InlineFieldGroup>

              {/* Statistics - Top Athlete Pct */}
              <FormTextField
                width={110}
                label="Top Athlete Pct"
                value={formState.topAthletePct || '60'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (/^[0-9]{1,3}$/.test(val) && parseInt(val) <= 100)) {
                    handleFieldChange('topAthletePct', val);
                  }
                }}
                tooltip="Percentage of games a player needs to play out of total team games to appear in seasonal competition statistics"
                inputProps={{ 
                  maxLength: 3, 
                  inputMode: 'numeric', 
                  pattern: '[0-9]*',
                  style: { textAlign: 'right' }
                }}
                InputProps={{
                  endAdornment: <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>%</Typography>
                }}
              />

              {/* Players - Football specific */}
              {formState.sport === 'Football' && (
                <FormCheckbox
                  label="Require Formation"
                  checked={formState.checkboxes?.['requireFormation'] ?? false}
                  onChange={handleCheckboxChange('requireFormation')}
                  tooltip="Require teams to submit formation details before games start"
                />
              )}

              {/* Players - Basketball specific */}
              {formState.sport === 'Basketball' && (
                <InlineFieldGroup>
                  <FormTextField
                    width={140}
                    label="Personal Fouls"
                    value={formState.personalFoulsLimit || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (/^[1-9]$/.test(val))) {
                        handleFieldChange('personalFoulsLimit', val);
                      }
                    }}
                    error={!!formState.personalFoulsLimit && !/^[1-9]$/.test(formState.personalFoulsLimit)}
                    helperText={!!formState.personalFoulsLimit && !/^[1-9]$/.test(formState.personalFoulsLimit) ? 'Enter 1-9 (single digit)' : ''}
                    tooltip="Number of fouls a player can commit before being fouled out"
                    inputProps={{ maxLength: 1, inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                  <FormTextField
                    width={140}
                    label="Team Fouls"
                    value={formState.teamFoulsLimit || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (/^[1-9][0-9]?$/.test(val))) {
                        handleFieldChange('teamFoulsLimit', val);
                      }
                    }}
                    error={!!formState.teamFoulsLimit && !/^[1-9][0-9]?$/.test(formState.teamFoulsLimit)}
                    helperText={!!formState.teamFoulsLimit && !/^[1-9][0-9]?$/.test(formState.teamFoulsLimit) ? 'Enter 1-99 (positive integer)' : ''}
                    tooltip="Number of fouls a team can commit per quarter before automatic free throws"
                    inputProps={{ maxLength: 2, inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </InlineFieldGroup>
              )}

              {/* Players - Show Disconnected Players (all sports) */}
              <FormCheckbox
                label="Show Disconnected Players"
                checked={formState.checkboxes?.['showDisconnectedPlayers'] ?? false}
                onChange={handleCheckboxChange('showDisconnectedPlayers')}
                tooltip="Display players who are disconnected or unavailable for the game"
              />
            </InlineFieldGroup>
          </FormGridItem>
        </FormGrid>
      </SectionContainer>

      {/* Bettings Section */}
      <SectionContainer title="Bettings">
        <FormGrid>
          {[
            { field: 'calculateWinProbabilityInsights', tooltip: 'Calculate and display win probability insights and analysis' },
            { field: 'calculateLiveWinProbability', tooltip: 'Calculate real-time win probability during live games' },
            { field: 'supportInsightsPopupForProps', tooltip: 'Show insights popup for prop betting options' },
            { field: 'supportPropsBetting', tooltip: 'Enable prop betting features and options for this competition' },
            { field: 'supportTrends', tooltip: 'Enable trend analysis and statistical trends for this competition' },
            { field: 'supportSpecialOutrights', tooltip: 'Display outrights card on competitors dashboards participating in this competition. This card will only be displayed between the configured start and end dates.' },
          ].map(({ field, tooltip }) => (
            <FormGridItem key={field} xs={12} sm={6} md={3} lg={3}>
              <FormCheckbox
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                checked={formState.checkboxes?.[field] ?? false}
                onChange={handleCheckboxChange(field)}
                tooltip={tooltip}
              />
            </FormGridItem>
          ))}
        </FormGrid>
        {formState.checkboxes?.supportSpecialOutrights && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1, ml: 4 }}>
            <TextField
              size="small"
              type="date"
              label="Start Date"
              value={formState.specialOutrightsStartDate ? String(formState.specialOutrightsStartDate).slice(0, 10) : ''}
              onChange={(e) => handleFieldChange('specialOutrightsStartDate', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
              sx={{ width: 180 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="End Date"
              value={formState.specialOutrightsEndDate ? String(formState.specialOutrightsEndDate).slice(0, 10) : ''}
              onChange={(e) => handleFieldChange('specialOutrightsEndDate', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
              sx={{ width: 180 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
      </SectionContainer>

      <SaveUpdateButtons
        hasChanges={hasChanges}
        onSave={handleSave}
        onUpdate={handleUpdateInServices}
        onReload={handleFormReload}
        reloadLoading={reloadFormLoading}
      />

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
            Table Settings : Competition Level
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
              // Save table settings logic
              Object.keys(tableSettingsForm).forEach(key => {
                if (key !== 'orderBy') { // Don't save the old orderBy field
                  handleCompetitionTableSettingsChange(key, tableSettingsForm[key]);
                }
              });
              
              // Save order parameters
              handleCompetitionTableSettingsChange('orderParameters', orderParameters);
              
              setTableSettingsDialogOpen(false);
            }}
            sx={{ bgcolor: '#1976d2' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Round Name Terms Dialog */}
      <TermEditModal
        open={roundNameTermsDialogOpen}
        onClose={() => {
          setRoundNameTermsDialogOpen(false);
          setRoundNameTermId(null);
        }}
        termId={roundNameTermId}
      />

      {/* Bracket Final Description Terms Dialog */}
      <TermEditModal
        open={bracketFinalDescTermsDialogOpen}
        onClose={() => {
          setBracketFinalDescTermsDialogOpen(false);
          setBracketFinalDescTermId(null);
        }}
        termId={bracketFinalDescTermId}
      />
    </Box>
  );
}

export default ConfigurationsTab; 