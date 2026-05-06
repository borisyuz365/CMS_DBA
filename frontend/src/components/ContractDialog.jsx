import React, { useState, useEffect } from 'react';
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
  Checkbox,
  FormControlLabel,
  Box,
  IconButton,
  Typography,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ContractDialog Component
 */
const ContractDialog = ({
  open,
  onClose,
  onSave,
  contract = null,
  competitors = [],
  countries = [],
  competitions = [],
  seasonCompetitors = [],
  positionTypes = [],
  formationPositionTypes = [],
  currencies = [],
  athleteSportTypeId = null,
}) => {
  const isEdit = !!contract;

  const [formData, setFormData] = useState({
    COMPETITOR_ID: '',
    START_DATE: '',
    END_DATE: '',
    CURRENT_CLUB: false,
    JERSEY_NUMBER: '',
    TRANSFER_TYPE: '',
    TRANSFER_FEE: '',
    TRANSFER_FEE_CURRENCY: '',
    SALARY: '',
    SALARY_CURRENCY: '',
    POSITION: '',
    FORMATION_POSITION: '',
    BLOCK_AUTOMATIC_UPDATES: false,
  });

  const [filterCountry, setFilterCountry] = useState('');
  const [filterCompetition, setFilterCompetition] = useState('');
  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (contract) {
      setFormData({
        COMPETITOR_ID: contract.COMPETITOR_ID || '',
        START_DATE: contract.START_DATE ? contract.START_DATE.split('T')[0] : '',
        END_DATE: contract.END_DATE ? contract.END_DATE.split('T')[0] : '',
        CURRENT_CLUB: contract.CURRENT_CLUB || false,
        JERSEY_NUMBER: contract.JERSEY_NUMBER || '',
        TRANSFER_TYPE: contract.TRANSFER_TYPE || '',
        TRANSFER_FEE: contract.TRANSFER_FEE || '',
        TRANSFER_FEE_CURRENCY: contract.TRANSFER_FEE_CURRENCY || '',
        SALARY: contract.SALARY || '',
        SALARY_CURRENCY: contract.SALARY_CURRENCY || '',
        POSITION: contract.POSITION || '',
        FORMATION_POSITION: contract.FORMATION_POSITION || '',
        BLOCK_AUTOMATIC_UPDATES: contract.BLOCK_AUTOMATIC_UPDATES || false,
      });
    } else {
      setFormData({
        COMPETITOR_ID: '',
        START_DATE: '',
        END_DATE: '',
        CURRENT_CLUB: false,
        JERSEY_NUMBER: '',
        TRANSFER_TYPE: '',
        TRANSFER_FEE: '',
        TRANSFER_FEE_CURRENCY: '',
        SALARY: '',
        SALARY_CURRENCY: '',
        POSITION: '',
        FORMATION_POSITION: '',
        BLOCK_AUTOMATIC_UPDATES: false,
      });
    }
    setFilterCountry('');
    setFilterCompetition('');
    setErrors({});
  }, [contract, open]);

  const sportCompetitors = competitors.filter(
    c => !athleteSportTypeId || c.SPORT_TYPE_ID === athleteSportTypeId
  );

  const sportCompetitions = competitions.filter(
    c => !athleteSportTypeId || c.SPORT_TYPE_ID === athleteSportTypeId
  );

  const competitorCountryIds = [...new Set(sportCompetitors.map(c => c.COUNTRY_ID))];
  const competitorCountries = countries.filter(c => competitorCountryIds.includes(c.COUNTRY_ID));

  const filteredCompetitions = filterCountry
    ? sportCompetitions.filter(c => c.COUNTRY_ID === filterCountry)
    : sportCompetitions;

  const competitorIdsInCompetition = filterCompetition
    ? [...new Set(
        seasonCompetitors
          .filter(sc => sc.COMPETITION_ID === filterCompetition)
          .map(sc => sc.COMPETITOR_ID)
      )]
    : null;

  const filteredCompetitors = sportCompetitors.filter(c => {
    if (filterCountry && c.COUNTRY_ID !== filterCountry) return false;
    if (competitorIdsInCompetition && !competitorIdsInCompetition.includes(c.COMPETITOR_ID)) return false;
    return true;
  });

  // Get available positions for the athlete's sport (from new flat files)
  const availablePositions = positionTypes.filter(
    p => !athleteSportTypeId || p.SPORT_TYPE_ID === athleteSportTypeId
  );

  // Get available formation positions for selected position (from new flat files)
  const availableFormationPositions = formData.POSITION
    ? formationPositionTypes.filter(fp =>
        (!athleteSportTypeId || fp.SPORT_TYPE_ID === athleteSportTypeId) &&
        fp.POSITION_ID === parseInt(formData.POSITION)
      )
    : [];


  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset formation position when position changes
      if (field === 'POSITION') {
        updated.FORMATION_POSITION = '';
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
    
    if (!formData.COMPETITOR_ID) {
      newErrors.COMPETITOR_ID = 'Competitor is required';
    }
    
    if (!formData.START_DATE) {
      newErrors.START_DATE = 'Start date is required';
    }
    
    if (formData.END_DATE && formData.START_DATE) {
      const startDate = new Date(formData.START_DATE);
      const endDate = new Date(formData.END_DATE);
      if (endDate < startDate) {
        newErrors.END_DATE = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const contractData = {
      COMPETITOR_ID: parseInt(formData.COMPETITOR_ID),
      START_DATE: formData.START_DATE,
      END_DATE: formData.END_DATE || null,
      CURRENT_CLUB: formData.CURRENT_CLUB,
      JERSEY_NUMBER: formData.JERSEY_NUMBER ? parseInt(formData.JERSEY_NUMBER) : null,
      TRANSFER_TYPE: formData.TRANSFER_TYPE || null,
      TRANSFER_FEE: formData.TRANSFER_FEE ? parseFloat(formData.TRANSFER_FEE) : null,
      TRANSFER_FEE_CURRENCY: formData.TRANSFER_FEE_CURRENCY || null,
      SALARY: formData.SALARY ? parseFloat(formData.SALARY) : null,
      SALARY_CURRENCY: formData.SALARY_CURRENCY || null,
      POSITION: formData.POSITION ? parseInt(formData.POSITION) : null,
      FORMATION_POSITION: formData.FORMATION_POSITION ? parseInt(formData.FORMATION_POSITION) : null,
      BLOCK_AUTOMATIC_UPDATES: formData.BLOCK_AUTOMATIC_UPDATES,
    };

    onSave(contractData);
  };

  const transferTypes = ['FullOwnership', 'Loan', 'FreeTransfer', 'Unknown'];

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
          {isEdit ? 'Edit Contract' : 'Add New Contract'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 4 }}>
        <Grid container spacing={2}>
          {/* Competitor Country Filter */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={competitorCountries}
              getOptionLabel={(option) => `${option.EMOJI ? option.EMOJI + ' ' : ''}${option.name}`}
              value={competitorCountries.find(c => c.COUNTRY_ID === filterCountry) || null}
              onChange={(e, newValue) => {
                setFilterCountry(newValue?.COUNTRY_ID || '');
                setFilterCompetition('');
                handleChange('COMPETITOR_ID', '');
              }}
              isOptionEqualToValue={(option, value) => option.COUNTRY_ID === value.COUNTRY_ID}
              renderInput={(params) => (
                <TextField {...params} label="Competitor Country" />
              )}
            />
          </Grid>

          {/* Competitor Competition Filter */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={filteredCompetitions}
              getOptionLabel={(option) => option.name || `Competition ${option.COMPETITION_ID}`}
              value={filteredCompetitions.find(c => c.COMPETITION_ID === filterCompetition) || null}
              onChange={(e, newValue) => {
                setFilterCompetition(newValue?.COMPETITION_ID || '');
                handleChange('COMPETITOR_ID', '');
              }}
              isOptionEqualToValue={(option, value) => option.COMPETITION_ID === value.COMPETITION_ID}
              disabled={!filterCountry}
              renderInput={(params) => (
                <TextField {...params} label="Competitor Competition" />
              )}
            />
          </Grid>

          {/* Competitor */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={filteredCompetitors}
              getOptionLabel={(option) => option.name || `Competitor ${option.COMPETITOR_ID}`}
              value={filteredCompetitors.find(c => c.COMPETITOR_ID === parseInt(formData.COMPETITOR_ID)) || null}
              onChange={(e, newValue) => {
                handleChange('COMPETITOR_ID', newValue?.COMPETITOR_ID || '');
              }}
              isOptionEqualToValue={(option, value) => option.COMPETITOR_ID === value.COMPETITOR_ID}
              disabled={!filterCountry}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Competitor *"
                  error={!!errors.COMPETITOR_ID}
                  helperText={errors.COMPETITOR_ID}
                />
              )}
            />
          </Grid>

          {/* Start Date */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Contract Start Date *"
              value={formData.START_DATE}
              onChange={(e) => handleChange('START_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.START_DATE}
              helperText={errors.START_DATE}
            />
          </Grid>

          {/* End Date */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Contract End Date"
              value={formData.END_DATE}
              onChange={(e) => handleChange('END_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.END_DATE}
              helperText={errors.END_DATE}
            />
          </Grid>

          {/* Jersey Number */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Jersey Number"
              value={formData.JERSEY_NUMBER}
              onChange={(e) => handleChange('JERSEY_NUMBER', e.target.value)}
            />
          </Grid>

          {/* Transfer Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Transfer Type</InputLabel>
              <Select
                value={formData.TRANSFER_TYPE}
                label="Transfer Type"
                onChange={(e) => handleChange('TRANSFER_TYPE', e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {transferTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>


          {/* Transfer Fee */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Transfer Fee"
                value={formData.TRANSFER_FEE}
                onChange={(e) => handleChange('TRANSFER_FEE', e.target.value)}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.TRANSFER_FEE_CURRENCY}
                  label="Currency"
                  onChange={(e) => handleChange('TRANSFER_FEE_CURRENCY', e.target.value)}
                >
                  <MenuItem value="">€</MenuItem>
                  {currencies.map(currency => (
                    <MenuItem key={currency.CURRENCY_ID} value={currency.CURRENCY_ID}>
                      {currency.SYMBOL} {currency.CURRENCY_CODE}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* Salary */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Salary"
                value={formData.SALARY}
                onChange={(e) => handleChange('SALARY', e.target.value)}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.SALARY_CURRENCY}
                  label="Currency"
                  onChange={(e) => handleChange('SALARY_CURRENCY', e.target.value)}
                >
                  <MenuItem value="">€</MenuItem>
                  {currencies.map(currency => (
                    <MenuItem key={currency.CURRENCY_ID} value={currency.CURRENCY_ID}>
                      {currency.SYMBOL} {currency.CURRENCY_CODE}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* Position */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Position</InputLabel>
              <Select
                value={formData.POSITION}
                label="Position"
                onChange={(e) => handleChange('POSITION', e.target.value)}
                disabled={!athleteSportTypeId}
              >
                <MenuItem value="">None</MenuItem>
                {availablePositions.map(position => (
                  <MenuItem key={position.POSITION_TYPE_ID} value={position.POSITION_TYPE_ID}>
                    {position.name || position.ALIAS_NAME}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Formation Position */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Formation Position</InputLabel>
              <Select
                value={formData.FORMATION_POSITION}
                label="Formation Position"
                onChange={(e) => handleChange('FORMATION_POSITION', e.target.value)}
                disabled={!formData.POSITION}
              >
                <MenuItem value="">None</MenuItem>
                {availableFormationPositions.map(formPos => (
                  <MenuItem key={formPos.FORMATION_POSITION_TYPE_ID} value={formPos.FORMATION_POSITION_TYPE_ID}>
                    {formPos.name || formPos.ALIAS_NAME}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Checkboxes */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.CURRENT_CLUB}
                    onChange={(e) => handleChange('CURRENT_CLUB', e.target.checked)}
                  />
                }
                label="Current Club"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.BLOCK_AUTOMATIC_UPDATES}
                    onChange={(e) => handleChange('BLOCK_AUTOMATIC_UPDATES', e.target.checked)}
                  />
                }
                label="Block Automatic Updates"
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          gap: 2,
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            minWidth: 100,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            textTransform: 'none',
            minWidth: 100,
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractDialog;
