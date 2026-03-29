import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * StatisticsDialog Component
 */
/**
 * Resolve term name by ID with fallback logic
 */
const resolveTermName = (term) => {
  if (!term) return null;
  if (term.engValue) return term.engValue;
  if (term.values && Array.isArray(term.values)) {
    const englishValue = term.values.find(v => v.languageId === 1);
    if (englishValue && englishValue.value) return englishValue.value;
    const defaultValue = term.values.find(v => v.isDefault === true);
    if (defaultValue && defaultValue.value) return defaultValue.value;
    const approvedValue = term.values.find(v => v.status === 'Approved');
    if (approvedValue && approvedValue.value) return approvedValue.value;
    if (term.values.length > 0 && term.values[0].value) return term.values[0].value;
  }
  return null;
};

const StatisticsDialog = ({
  open,
  onClose,
  onSave,
  statisticsGroup = null, // The grouped statistics object
  statisticsTypes = [],
  competitions = [],
  competitors = [],
  seasons = [],
  terms = [],
  seasonCompetitors = [],
}) => {
  const isEdit = !!statisticsGroup;

  // Initialize form data - one field per statistics type
  const [formData, setFormData] = useState({
    COMPETITION_ID: '',
    SEASON_NUM: '',
    COMPETITOR_ID: '',
    PHASE_NUM: '',
    // Statistics values - keyed by STATISTICS_TYPE_ID
    statistics: {},
  });

  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (statisticsGroup) {
      // Extract statistics values from the group
      const statsValues = {};
      Object.keys(statisticsGroup.stats || {}).forEach((statType) => {
        const stat = statisticsGroup.stats[statType];
        statsValues[stat.STATISTICS_TYPE_ID] = stat.NUMERIC_VAL || 0;
      });

      setFormData({
        COMPETITION_ID: statisticsGroup.COMPETITION_ID || '',
        SEASON_NUM: statisticsGroup.SEASON_NUM || '',
        COMPETITOR_ID: statisticsGroup.COMPETITOR_ID || '',
        PHASE_NUM: statisticsGroup.PHASE_NUM || '',
        statistics: statsValues,
      });
    } else {
      // Initialize with empty statistics
      const emptyStats = {};
      statisticsTypes.forEach((statType) => {
        emptyStats[statType.STATISTICS_TYPE_ID] = 0;
      });

      setFormData({
        COMPETITION_ID: '',
        SEASON_NUM: '',
        COMPETITOR_ID: '',
        PHASE_NUM: '',
        statistics: emptyStats,
      });
    }
    setErrors({});
  }, [statisticsGroup, statisticsTypes, open]);

  // Get available seasons for selected competition
  const availableSeasons = seasons.filter(
    s => !formData.COMPETITION_ID || s.COMPETITION_ID === parseInt(formData.COMPETITION_ID)
  );

  // Get available competitors for selected competition and season
  const availableCompetitors = useMemo(() => {
    if (!formData.COMPETITION_ID) {
      return [];
    }

    const competitionId = parseInt(formData.COMPETITION_ID);
    
    // First filter by MAIN_COMPETITION
    let filtered = competitors.filter(comp => comp.MAIN_COMPETITION === competitionId);

    // If season is selected, also filter by season_competitors
    if (formData.SEASON_NUM) {
      const seasonNum = parseInt(formData.SEASON_NUM);
      const competitorIdsInSeason = seasonCompetitors
        .filter(sc => 
          sc.COMPETITION_ID === competitionId && 
          sc.SEASON_NUM === seasonNum
        )
        .map(sc => sc.COMPETITOR_ID);
      
      // Filter to only include competitors that are in this season
      filtered = filtered.filter(comp => 
        competitorIdsInSeason.includes(comp.COMPETITOR_ID)
      );
    }

    return filtered;
  }, [competitors, seasonCompetitors, formData.COMPETITION_ID, formData.SEASON_NUM]);

  // Reset competitor when competition or season changes
  useEffect(() => {
    if (formData.COMPETITION_ID || formData.SEASON_NUM) {
      // Check if current competitor is still available
      const isAvailable = availableCompetitors.some(
        comp => comp.COMPETITOR_ID === parseInt(formData.COMPETITOR_ID)
      );
      if (!isAvailable && formData.COMPETITOR_ID) {
        setFormData(prev => ({ ...prev, COMPETITOR_ID: '' }));
      }
    }
  }, [formData.COMPETITION_ID, formData.SEASON_NUM, availableCompetitors]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset season and competitor when competition changes
      if (field === 'COMPETITION_ID') {
        updated.SEASON_NUM = '';
        updated.COMPETITOR_ID = '';
      }
      
      // Reset competitor when season changes
      if (field === 'SEASON_NUM') {
        updated.COMPETITOR_ID = '';
      }
      
      return updated;
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleStatisticsChange = (statisticsTypeId, value) => {
    setFormData(prev => ({
      ...prev,
      statistics: {
        ...prev.statistics,
        [statisticsTypeId]: value ? parseInt(value) : 0,
      },
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    // Only COMPETITION_ID is required
    if (!formData.COMPETITION_ID) {
      newErrors.COMPETITION_ID = 'Competition is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    // Build statistics array - one entry per statistics type
    // Only COMPETITION_ID is required, others are optional
    const statisticsData = statisticsTypes.map(statType => ({
      COMPETITION_ID: parseInt(formData.COMPETITION_ID),
      SEASON_NUM: formData.SEASON_NUM ? parseInt(formData.SEASON_NUM) : null,
      COMPETITOR_ID: formData.COMPETITOR_ID ? parseInt(formData.COMPETITOR_ID) : null,
      STATISTICS_TYPE: statType.STATISTICS_TYPE,
      STATISTICS_TYPE_ID: statType.STATISTICS_TYPE_ID,
      NUMERIC_VAL: formData.statistics[statType.STATISTICS_TYPE_ID] || 0,
      VALUE: String(formData.statistics[statType.STATISTICS_TYPE_ID] || 0),
      PHASE_NUM: formData.PHASE_NUM ? parseInt(formData.PHASE_NUM) : null,
      CREATE_TIME: new Date().toISOString(),
    }));

    onSave(statisticsData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: '1.25rem',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'inherit' }}>
          {isEdit ? 'Edit Statistics' : 'Add New Statistics'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {/* Competition */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small" error={!!errors.COMPETITION_ID}>
              <InputLabel>Competition *</InputLabel>
              <Select
                value={formData.COMPETITION_ID}
                label="Competition *"
                onChange={(e) => handleChange('COMPETITION_ID', e.target.value)}
                disabled={isEdit}
              >
                {competitions.map(competition => (
                  <MenuItem key={competition.COMPETITION_ID} value={competition.COMPETITION_ID}>
                    {competition.name || `Competition ${competition.COMPETITION_ID}`}
                  </MenuItem>
                ))}
              </Select>
              {errors.COMPETITION_ID && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.COMPETITION_ID}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Season */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small" error={!!errors.SEASON_NUM}>
              <InputLabel>Season</InputLabel>
              <Select
                value={formData.SEASON_NUM || ''}
                label="Season"
                onChange={(e) => handleChange('SEASON_NUM', e.target.value)}
                disabled={isEdit || !formData.COMPETITION_ID}
              >
                {availableSeasons.map(season => {
                  // Resolve season name from terms
                  let seasonName = `Season ${season.SEASON_NUM}`;
                  if (season.NAME_ID) {
                    const seasonTerm = terms.find(t => t.id === season.NAME_ID);
                    const resolvedName = resolveTermName(seasonTerm);
                    if (resolvedName) {
                      seasonName = resolvedName;
                    }
                  }
                  return (
                    <MenuItem key={`${season.COMPETITION_ID}-${season.SEASON_NUM}`} value={season.SEASON_NUM}>
                      {seasonName}
                    </MenuItem>
                  );
                })}
              </Select>
              {errors.SEASON_NUM && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.SEASON_NUM}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Competitor */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small" error={!!errors.COMPETITOR_ID}>
              <InputLabel>Competitor</InputLabel>
              <Select
                value={formData.COMPETITOR_ID || ''}
                label="Competitor"
                onChange={(e) => handleChange('COMPETITOR_ID', e.target.value)}
                disabled={isEdit}
              >
                {availableCompetitors.length === 0 ? (
                  <MenuItem value="" disabled>
                    {formData.COMPETITION_ID ? 'No competitors available for this competition' : 'Select competition first'}
                  </MenuItem>
                ) : (
                  availableCompetitors.map(competitor => (
                    <MenuItem key={competitor.COMPETITOR_ID} value={competitor.COMPETITOR_ID}>
                      {competitor.name || `Competitor ${competitor.COMPETITOR_ID}`}
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.COMPETITOR_ID && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.COMPETITOR_ID}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Phase */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Phase"
              value={formData.PHASE_NUM}
              onChange={(e) => handleChange('PHASE_NUM', e.target.value)}
              helperText="Leave empty if not applicable"
            />
          </Grid>

          {/* Statistics Values */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Statistics Values
            </Typography>
          </Grid>

          {statisticsTypes.map((statType) => (
            <Grid item xs={12} md={6} key={statType.STATISTICS_TYPE_ID}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={statType.STATISTICS_TYPE}
                value={formData.statistics[statType.STATISTICS_TYPE_ID] || 0}
                onChange={(e) => handleStatisticsChange(statType.STATISTICS_TYPE_ID, e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatisticsDialog;
