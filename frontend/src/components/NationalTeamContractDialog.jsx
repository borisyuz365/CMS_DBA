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

const NationalTeamContractDialog = ({
  open,
  onClose,
  onSave,
  contract = null,
  existingContracts = [],
  competitors = [],
  countries = [],
  positionTypes = [],
  formationPositionTypes = [],
  athleteSportTypeId = null,
}) => {
  const isEdit = !!contract;

  const [formData, setFormData] = useState({
    COMPETITOR_ID: '',
    START_DATE: '',
    END_DATE: '',
    CURRENT_CLUB: false,
    JERSEY_NUMBER: '',
    POSITION: '',
    FORMATION_POSITION: '',
  });

  const [filterCountry, setFilterCountry] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contract) {
      setFormData({
        COMPETITOR_ID: contract.COMPETITOR_ID || '',
        START_DATE: contract.START_DATE ? contract.START_DATE.split('T')[0] : '',
        END_DATE: contract.END_DATE ? contract.END_DATE.split('T')[0] : '',
        CURRENT_CLUB: contract.CURRENT_CLUB || false,
        JERSEY_NUMBER: contract.JERSEY_NUMBER || '',
        POSITION: contract.POSITION || '',
        FORMATION_POSITION: contract.FORMATION_POSITION || '',
      });

      if (contract.COMPETITOR_ID) {
        const comp = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
        if (comp) {
          setFilterCountry(comp.COUNTRY_ID || '');
        }
      }
    } else {
      setFormData({
        COMPETITOR_ID: '',
        START_DATE: '',
        END_DATE: '',
        CURRENT_CLUB: false,
        JERSEY_NUMBER: '',
        POSITION: '',
        FORMATION_POSITION: '',
      });
      setFilterCountry('');
    }
    setErrors({});
  }, [contract, open]);

  const nationalTeamCompetitors = competitors.filter(
    c => c.COMPETITOR_TYPE === 2 && (!athleteSportTypeId || c.SPORT_TYPE_ID === athleteSportTypeId)
  );

  const competitorCountryIds = [...new Set(nationalTeamCompetitors.map(c => c.COUNTRY_ID))];
  const competitorCountries = countries.filter(c => competitorCountryIds.includes(c.COUNTRY_ID));

  const filteredCompetitors = filterCountry
    ? nationalTeamCompetitors.filter(c => c.COUNTRY_ID === filterCountry)
    : nationalTeamCompetitors;

  const availablePositions = positionTypes.filter(
    p => !athleteSportTypeId || p.SPORT_TYPE_ID === athleteSportTypeId
  );

  const availableFormationPositions = formData.POSITION
    ? formationPositionTypes.filter(fp =>
        (!athleteSportTypeId || fp.SPORT_TYPE_ID === athleteSportTypeId) &&
        fp.POSITION_ID === parseInt(formData.POSITION)
      )
    : [];

  const existingInSquadContract = existingContracts.find(c =>
    c.CURRENT_CLUB && (!isEdit || c.CONTRACT_ID !== contract?.CONTRACT_ID)
  );
  const willReplaceInSquad = formData.CURRENT_CLUB && !!existingInSquadContract;

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'POSITION') {
        updated.FORMATION_POSITION = '';
      }
      return updated;
    });

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
      newErrors.COMPETITOR_ID = 'National team is required';
    }

    if (!formData.START_DATE) {
      newErrors.START_DATE = 'International debut date is required';
    }

    if (formData.END_DATE && formData.START_DATE) {
      const startDate = new Date(formData.START_DATE);
      const endDate = new Date(formData.END_DATE);
      if (endDate < startDate) {
        newErrors.END_DATE = 'Retirement date must be after debut date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const contractData = {
      COMPETITOR_ID: parseInt(formData.COMPETITOR_ID),
      START_DATE: formData.START_DATE,
      END_DATE: formData.END_DATE || null,
      CURRENT_CLUB: formData.CURRENT_CLUB,
      JERSEY_NUMBER: formData.JERSEY_NUMBER ? parseInt(formData.JERSEY_NUMBER) : null,
      POSITION: formData.POSITION ? parseInt(formData.POSITION) : null,
      FORMATION_POSITION: formData.FORMATION_POSITION ? parseInt(formData.FORMATION_POSITION) : null,
      TRANSFER_TYPE: null,
      TRANSFER_FEE: null,
      TRANSFER_FEE_CURRENCY: null,
      SALARY: null,
      SALARY_CURRENCY: null,
      BLOCK_AUTOMATIC_UPDATES: false,
    };

    const replaceContractId = willReplaceInSquad ? existingInSquadContract.CONTRACT_ID : null;
    onSave(contractData, replaceContractId);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
          {isEdit ? 'Edit National Team Contract' : 'Add National Team Contract'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 4 }}>
        <Grid container spacing={2}>
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

          {/* Competitor Country Filter */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              size="small"
              options={competitorCountries}
              getOptionLabel={(option) => `${option.EMOJI ? option.EMOJI + ' ' : ''}${option.name}`}
              value={competitorCountries.find(c => c.COUNTRY_ID === filterCountry) || null}
              onChange={(e, newValue) => {
                setFilterCountry(newValue?.COUNTRY_ID || '');
                handleChange('COMPETITOR_ID', '');
              }}
              isOptionEqualToValue={(option, value) => option.COUNTRY_ID === value.COUNTRY_ID}
              renderInput={(params) => (
                <TextField {...params} label="Competitor Country" />
              )}
            />
          </Grid>

          {/* Competitor (National Team only) */}
          <Grid item xs={12}>
            <Autocomplete
              size="small"
              options={filteredCompetitors}
              getOptionLabel={(option) => option.name || `Competitor ${option.COMPETITOR_ID}`}
              value={filteredCompetitors.find(c => c.COMPETITOR_ID === parseInt(formData.COMPETITOR_ID)) || null}
              onChange={(e, newValue) => {
                handleChange('COMPETITOR_ID', newValue?.COMPETITOR_ID || '');
                if (newValue?.COUNTRY_ID && !filterCountry) {
                  setFilterCountry(newValue.COUNTRY_ID);
                }
              }}
              isOptionEqualToValue={(option, value) => option.COMPETITOR_ID === value.COMPETITOR_ID}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="National Team *"
                  error={!!errors.COMPETITOR_ID}
                  helperText={errors.COMPETITOR_ID}
                />
              )}
            />
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

          {/* International Debut */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="International Debut *"
              value={formData.START_DATE}
              onChange={(e) => handleChange('START_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.START_DATE}
              helperText={errors.START_DATE}
            />
          </Grid>

          {/* International Retirement */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="International Retirement"
              value={formData.END_DATE}
              onChange={(e) => handleChange('END_DATE', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.END_DATE}
              helperText={errors.END_DATE}
            />
          </Grid>

          {/* In Squad */}
          <Grid item xs={12}>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.CURRENT_CLUB}
                    onChange={(e) => handleChange('CURRENT_CLUB', e.target.checked)}
                  />
                }
                label="In Squad"
              />
              {willReplaceInSquad && (
                <Typography variant="caption" sx={{ display: 'block', ml: 2, color: '#ed6c02' }}>
                  The existing "In Squad" status on {existingInSquadContract.competitorName || `Competitor ${existingInSquadContract.COMPETITOR_ID}`} will be removed
                </Typography>
              )}
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

export default NationalTeamContractDialog;
