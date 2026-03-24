import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
 * TrophyDialog Component
 */
const TrophyDialog = ({
  open,
  onClose,
  onSave,
  trophy = null,
  competitions = [],
  competitors = [],
  seasons = [],
  countries = [],
  athleteSportTypeId = null,
  seasonCompetitors = [],
}) => {
  const isEdit = !!trophy;

  const [formData, setFormData] = useState({
    COUNTRY_ID: '',
    COMPETITION_ID: '',
    SEASON_NUM: '',
    COMPETITOR_ID: '',
  });

  const [errors, setErrors] = useState({});

  // Filter competitions by selected country and athlete sport type
  const availableCompetitions = useMemo(() => {
    let filtered = competitions;
    
    // Filter by country if selected
    if (formData.COUNTRY_ID) {
      filtered = filtered.filter(
        c => c.COUNTRY_ID === parseInt(formData.COUNTRY_ID)
      );
    }
    
    // Filter by athlete sport type
    if (athleteSportTypeId) {
      filtered = filtered.filter(
        c => c.SPORT_TYPE_ID === athleteSportTypeId
      );
    }
    
    return filtered;
  }, [competitions, formData.COUNTRY_ID, athleteSportTypeId]);

  // Filter seasons by selected competition
  const availableSeasons = useMemo(() => {
    if (!formData.COMPETITION_ID) return [];
    return seasons.filter(
      s => s.COMPETITION_ID === parseInt(formData.COMPETITION_ID)
    );
  }, [formData.COMPETITION_ID, seasons]);

  // Filter competitors by selected competition and season
  const availableCompetitors = useMemo(() => {
    if (!formData.COMPETITION_ID) {
      return [];
    }

    const competitionId = parseInt(formData.COMPETITION_ID);
    
    // If season is selected, filter by season_competitors for that specific season
    if (formData.SEASON_NUM) {
      const seasonNum = parseInt(formData.SEASON_NUM);
      let competitorIdsInSeason = seasonCompetitors
        .filter(sc => 
          parseInt(sc.COMPETITION_ID) === competitionId && 
          parseInt(sc.SEASON_NUM) === seasonNum
        )
        .map(sc => parseInt(sc.COMPETITOR_ID));
      
      // If no competitors found in season_competitors, fallback to MAIN_COMPETITION
      if (competitorIdsInSeason.length === 0) {
        competitorIdsInSeason = competitors
          .filter(comp => parseInt(comp.MAIN_COMPETITION) === competitionId)
          .map(comp => parseInt(comp.COMPETITOR_ID));
      }
      
      // Filter competitors to only include those in this season
      return competitors.filter(comp => 
        competitorIdsInSeason.includes(parseInt(comp.COMPETITOR_ID))
      );
    }
    
    // If no season selected, show all competitors that participate in any season of this competition
    let competitorIdsInCompetition = seasonCompetitors
      .filter(sc => parseInt(sc.COMPETITION_ID) === competitionId)
      .map(sc => parseInt(sc.COMPETITOR_ID));
    
    // If no competitors found in season_competitors, fallback to MAIN_COMPETITION
    if (competitorIdsInCompetition.length === 0) {
      competitorIdsInCompetition = competitors
        .filter(comp => parseInt(comp.MAIN_COMPETITION) === competitionId)
        .map(comp => parseInt(comp.COMPETITOR_ID));
    }
    
    // Get unique competitor IDs
    const uniqueCompetitorIds = [...new Set(competitorIdsInCompetition)];
    
    // Filter competitors to only include those that participate in this competition
    return competitors.filter(comp => 
      uniqueCompetitorIds.includes(parseInt(comp.COMPETITOR_ID))
    );
  }, [competitors, seasonCompetitors, competitions, formData.COMPETITION_ID, formData.SEASON_NUM]);

  // Initialize form data
  useEffect(() => {
    if (trophy) {
      // Find competition to get country
      const competition = competitions.find(c => c.COMPETITION_ID === trophy.COMPETITION_ID);
      setFormData({
        COUNTRY_ID: competition?.COUNTRY_ID || '',
        COMPETITION_ID: trophy.COMPETITION_ID || '',
        SEASON_NUM: trophy.SEASON_NUM || '',
        COMPETITOR_ID: trophy.COMPETITOR_ID || '',
      });
    } else {
      setFormData({
        COUNTRY_ID: '',
        COMPETITION_ID: '',
        SEASON_NUM: '',
        COMPETITOR_ID: '',
      });
    }
    setErrors({});
  }, [trophy, open, competitions]);

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
      
      // Reset dependent fields when parent changes
      if (field === 'COUNTRY_ID') {
        updated.COMPETITION_ID = '';
        updated.SEASON_NUM = '';
        updated.COMPETITOR_ID = '';
      } else if (field === 'COMPETITION_ID') {
        updated.SEASON_NUM = '';
        updated.COMPETITOR_ID = '';
      } else if (field === 'SEASON_NUM') {
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

  const validate = () => {
    const newErrors = {};
    
    if (!formData.COUNTRY_ID) {
      newErrors.COUNTRY_ID = 'Country is required';
    }
    
    if (!formData.COMPETITION_ID) {
      newErrors.COMPETITION_ID = 'Competition is required';
    }
    
    if (!formData.SEASON_NUM) {
      newErrors.SEASON_NUM = 'Season is required';
    }
    
    if (!formData.COMPETITOR_ID) {
      newErrors.COMPETITOR_ID = 'Competitor (Team) is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const trophyData = {
      COMPETITION_ID: parseInt(formData.COMPETITION_ID),
      SEASON_NUM: parseInt(formData.SEASON_NUM),
      COMPETITOR_ID: parseInt(formData.COMPETITOR_ID),
    };

    onSave(trophyData);
  };

  // Format season display
  const formatSeasonDisplay = (season) => {
    if (season.NAME_ID) {
      // If season has a name, we'd need to resolve it from terms
      // For now, use dates or season number
      if (season.START_DATE && season.END_DATE) {
        const start = new Date(season.START_DATE);
        const end = new Date(season.END_DATE);
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        if (startYear === endYear) {
          return `${startYear}/${String(endYear + 1).slice(-2)} (Season ${season.SEASON_NUM})`;
        }
        return `${startYear}/${String(endYear).slice(-2)} (Season ${season.SEASON_NUM})`;
      }
      return `Season ${season.SEASON_NUM}`;
    }
    if (season.START_DATE && season.END_DATE) {
      const start = new Date(season.START_DATE);
      const end = new Date(season.END_DATE);
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      if (startYear === endYear) {
        return `${startYear}/${String(endYear + 1).slice(-2)} (Season ${season.SEASON_NUM})`;
      }
      return `${startYear}/${String(endYear).slice(-2)} (Season ${season.SEASON_NUM})`;
    }
    return `Season ${season.SEASON_NUM}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEdit ? 'Edit Trophy' : 'Add Trophy'}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.COUNTRY_ID}>
              <InputLabel>Country *</InputLabel>
              <Select
                value={formData.COUNTRY_ID}
                label="Country *"
                onChange={(e) => handleChange('COUNTRY_ID', e.target.value)}
                disabled={isEdit}
              >
                {countries.map(country => (
                  <MenuItem key={country.COUNTRY_ID} value={country.COUNTRY_ID}>
                    {country.EMOJI ? `${country.EMOJI} ` : ''}{country.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.COUNTRY_ID && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.COUNTRY_ID}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={!!errors.COMPETITION_ID}
              disabled={!formData.COUNTRY_ID || isEdit}
            >
              <InputLabel>Competition *</InputLabel>
              <Select
                value={formData.COMPETITION_ID}
                label="Competition *"
                onChange={(e) => handleChange('COMPETITION_ID', e.target.value)}
              >
                {availableCompetitions.length > 0 ? (
                  availableCompetitions.map(competition => (
                    <MenuItem key={competition.COMPETITION_ID} value={competition.COMPETITION_ID}>
                      {competition.name || `Competition ${competition.COMPETITION_ID}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    {formData.COUNTRY_ID 
                      ? 'No competitions available for this country and sport type' 
                      : 'Select a country first'}
                  </MenuItem>
                )}
              </Select>
              {errors.COMPETITION_ID && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.COMPETITION_ID}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={!!errors.SEASON_NUM}
              disabled={!formData.COMPETITION_ID}
            >
              <InputLabel>Season *</InputLabel>
              <Select
                value={formData.SEASON_NUM}
                label="Season *"
                onChange={(e) => handleChange('SEASON_NUM', e.target.value)}
              >
                {availableSeasons.length > 0 ? (
                  availableSeasons.map(season => (
                    <MenuItem key={season.SEASON_NUM} value={season.SEASON_NUM}>
                      {formatSeasonDisplay(season)}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    {formData.COMPETITION_ID 
                      ? 'No seasons available for this competition' 
                      : 'Select a competition first'}
                  </MenuItem>
                )}
              </Select>
              {errors.SEASON_NUM && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.SEASON_NUM}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={!!errors.COMPETITOR_ID}
              disabled={!formData.COMPETITION_ID || availableCompetitors.length === 0}
            >
              <InputLabel>Competitor (Team) *</InputLabel>
              <Select
                value={formData.COMPETITOR_ID}
                label="Competitor (Team) *"
                onChange={(e) => handleChange('COMPETITOR_ID', e.target.value)}
              >
                {availableCompetitors.length > 0 ? (
                  availableCompetitors.map(competitor => (
                    <MenuItem key={competitor.COMPETITOR_ID} value={competitor.COMPETITOR_ID}>
                      {competitor.name || `Competitor ${competitor.COMPETITOR_ID}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    {formData.COMPETITION_ID 
                      ? (formData.SEASON_NUM 
                          ? 'No competitors available for this competition and season' 
                          : 'No competitors available for this competition')
                      : 'Select a competition first'}
                  </MenuItem>
                )}
              </Select>
              {errors.COMPETITOR_ID && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.COMPETITOR_ID}
                </Typography>
              )}
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
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

export default TrophyDialog;
