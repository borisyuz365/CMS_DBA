import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Grid,
  Alert,
  Chip,
  Autocomplete,
  Checkbox,
  createFilterOptions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrimaryButton from '../../../reuse/PrimaryButton';
import SecondaryButton from '../../../reuse/SecondaryButton';
import DatePicker from '../../../reuse/DatePicker';

const PRIORITY_OPTIONS = [-1, 0, 1, 2, 3, 4, 5, 6];

const AddPrioritiesDialog = ({
  open,
  onClose,
  onSave,
  dataSourcesList = [],
  updateTypesList = [],
  priorityLevelsList = [],
  sportTypes = [],
  countries = [],
  competitions = [],
  games = [],
  contextSportID = null,
  contextCountryID = null,
  contextCompetitionID = null,
  contextGameID = null,
}) => {
  const hasContext = contextCountryID != null || contextCompetitionID != null || contextGameID != null;
  const emptyForm = {
    selectedSports: [],
    selectedCountries: [],
    selectedCompetitions: [],
    selectedGames: [],
    dataSources: [],
    updateTypes: [],
    PRIORITY: 0,
    COMMENT: '',
    START_DATE: null,
    EXPIRATION_DATE: null,
    AFTER_EXPIRED_PRIORITY: null,
    SCHEDULE_PRIORITY: null,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    const sport = contextSportID != null ? sportTypes.find((s) => s.SPORT_TYPE_ID === contextSportID) : null;
    const country = contextCountryID != null ? countries.find((c) => c.COUNTRY_ID === contextCountryID) : null;
    const comp = contextCompetitionID != null ? competitions.find((c) => c.COMPETITION_ID === contextCompetitionID) : null;
    const game = contextGameID != null ? games.find((g) => g.GAME_ID === contextGameID) : null;

    setFormData({
      ...emptyForm,
      selectedSports: sport ? [sport] : [],
      selectedCountries: country ? [country] : [],
      selectedCompetitions: comp ? [comp] : [],
      selectedGames: game ? [game] : [],
    });
    setErrors({});
  }, [open, contextSportID, contextCountryID, contextCompetitionID, contextGameID, sportTypes, countries, competitions, games]);

  const availableCountries = useMemo(() => {
    const countryIds = new Set(competitions.map((c) => c.COUNTRY_ID));
    return countries.filter((c) => countryIds.has(c.COUNTRY_ID));
  }, [competitions, countries]);

  const availableCompetitions = useMemo(() => {
    if (formData.selectedCountries.length === 0 || formData.selectedSports.length === 0) return [];
    const countryIds = new Set(formData.selectedCountries.map((c) => c.COUNTRY_ID));
    const sportIds = new Set(formData.selectedSports.map((s) => s.SPORT_TYPE_ID));
    return competitions.filter((c) => countryIds.has(c.COUNTRY_ID) && sportIds.has(c.SPORT_TYPE_ID));
  }, [formData.selectedCountries, formData.selectedSports, competitions]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const defaultFilter = createFilterOptions();

  const selectAllProps = (allOptions, selectedValue, fieldName, getLabel, isEqual, dependentFields = []) => ({
    disableCloseOnSelect: true,
    options: allOptions,
    getOptionLabel: (o) => o._selectAll ? 'Select All' : getLabel(o),
    isOptionEqualToValue: (a, b) => {
      if (a._selectAll || b._selectAll) return a._selectAll === b._selectAll;
      return isEqual(a, b);
    },
    filterOptions: (options, params) => {
      const filtered = defaultFilter(options, params);
      return [{ _selectAll: true }, ...filtered];
    },
    renderOption: (props, option, { selected }) => {
      const { key, ...rest } = props;
      if (option._selectAll) {
        const allChosen = allOptions.length > 0 && selectedValue.length === allOptions.length;
        return (
          <li key="select-all" {...rest}>
            <Checkbox checked={allChosen} indeterminate={selectedValue.length > 0 && !allChosen} sx={{ mr: 1 }} />
            <strong>Select All</strong>
          </li>
        );
      }
      return (
        <li key={key} {...rest}>
          <Checkbox checked={selected} sx={{ mr: 1 }} />
          {getLabel(option)}
        </li>
      );
    },
    onChange: (_, newValue, reason, details) => {
      let finalValue;
      if (details?.option?._selectAll) {
        finalValue = selectedValue.length === allOptions.length ? [] : [...allOptions];
      } else {
        finalValue = newValue.filter((v) => !v._selectAll);
      }
      handleChange(fieldName, finalValue);
      dependentFields.forEach((f) => handleChange(f, []));
    },
  });

  const derivedCutInfo = useMemo(() => {
    if (formData.selectedGames.length > 0) {
      return { cutType: 1, label: `${formData.selectedGames.length} game(s)` };
    }
    if (formData.selectedCompetitions.length > 0) {
      return { cutType: 2, label: `${formData.selectedCompetitions.length} competition(s)` };
    }
    if (formData.selectedCountries.length > 0) {
      return { cutType: 3, label: `${formData.selectedCountries.length} country/countries` };
    }
    return { cutType: null, label: 'Select countries or competitions first' };
  }, [formData.selectedGames, formData.selectedCompetitions, formData.selectedCountries]);

  const toISOString = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string' && val.trim()) return val;
    return null;
  };

  const hasExpiration = !!formData.EXPIRATION_DATE;
  const hasStartOnly = !!formData.START_DATE && !formData.EXPIRATION_DATE;

  const validate = () => {
    const e = {};
    if (formData.selectedCountries.length === 0) e.selectedCountries = 'At least one Country is required';
    if (formData.dataSources.length === 0) e.dataSources = 'At least one Data Source is required';
    if (formData.updateTypes.length === 0) e.updateTypes = 'At least one Update Type is required';
    if (!formData.COMMENT || formData.COMMENT.trim().length < 3) e.COMMENT = 'Comment is required (min 3 characters)';
    if (hasExpiration && formData.AFTER_EXPIRED_PRIORITY == null) {
      e.AFTER_EXPIRED_PRIORITY = 'Required when Expiration Date is set';
    }
    if (hasStartOnly && formData.SCHEDULE_PRIORITY == null) {
      e.SCHEDULE_PRIORITY = 'Required when only Start Date is set';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const items = [];
    const dsIds = formData.dataSources.map((ds) => ds.DATA_SOURCE_ID);
    const utIds = formData.updateTypes.map((ut) => ut.UPDATE_TYPE_ID);

    const base = {
      PRIORITY: formData.PRIORITY,
      COMMENT: formData.COMMENT,
      START_DATE: toISOString(formData.START_DATE),
      EXPIRATION_DATE: toISOString(formData.EXPIRATION_DATE),
      AFTER_EXPIRED_PRIORITY: hasExpiration ? formData.AFTER_EXPIRED_PRIORITY : null,
      SCHEDULE_PRIORITY: hasStartOnly ? formData.SCHEDULE_PRIORITY : null,
    };

    if (formData.selectedGames.length > 0) {
      for (const game of formData.selectedGames) {
        for (const dsId of dsIds) {
          for (const utId of utIds) {
            items.push({ ...base, DATA_SOURCE: dsId, UPDATE_TYPE: utId, CUT_TYPE: 1, CUT_VALUE: game.GAME_ID });
          }
        }
      }
    } else if (formData.selectedCompetitions.length > 0) {
      for (const comp of formData.selectedCompetitions) {
        for (const dsId of dsIds) {
          for (const utId of utIds) {
            items.push({ ...base, DATA_SOURCE: dsId, UPDATE_TYPE: utId, CUT_TYPE: 2, CUT_VALUE: comp.COMPETITION_ID });
          }
        }
      }
    } else {
      for (const country of formData.selectedCountries) {
        for (const dsId of dsIds) {
          for (const utId of utIds) {
            items.push({ ...base, DATA_SOURCE: dsId, UPDATE_TYPE: utId, CUT_TYPE: 3, CUT_VALUE: country.COUNTRY_ID });
          }
        }
      }
    }

    onSave(items);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { overflow: 'visible' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 'inherit' }}>Add New Priorities</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 5, overflow: 'visible' }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          {hasContext
            ? 'Targeting is set from the current page context.'
            : 'Select countries to create country-level priorities, or drill down to competitions for competition-level priorities.'}
          {' '}Will create: <strong>{derivedCutInfo.cutType ? `CUT_TYPE=${derivedCutInfo.cutType} (${derivedCutInfo.cutType === 1 ? 'Game' : derivedCutInfo.cutType === 2 ? 'Competition' : 'Country'}) for ${derivedCutInfo.label}` : derivedCutInfo.label}</strong>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              multiple size="small"
              {...selectAllProps(
                availableCountries,
                formData.selectedCountries,
                'selectedCountries',
                (o) => o.name || `Country ${o.COUNTRY_ID}`,
                (a, b) => a.COUNTRY_ID === b.COUNTRY_ID,
                ['selectedCompetitions']
              )}
              value={formData.selectedCountries}
              disabled={hasContext}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option.COUNTRY_ID} label={option.name || option.COUNTRY_ID} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Country *" error={!!errors.selectedCountries} helperText={errors.selectedCountries} />}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple size="small"
              options={sportTypes}
              getOptionLabel={(o) => o.ALIAS_NAME || `Sport ${o.SPORT_TYPE_ID}`}
              isOptionEqualToValue={(a, b) => a.SPORT_TYPE_ID === b.SPORT_TYPE_ID}
              value={formData.selectedSports}
              onChange={(_, v) => {
                handleChange('selectedSports', v);
                handleChange('selectedCompetitions', []);
              }}
              disabled={hasContext}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option.SPORT_TYPE_ID} label={option.ALIAS_NAME || option.SPORT_TYPE_ID} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Sport" />}
            />
          </Grid>

          {(availableCompetitions.length > 0 || (hasContext && formData.selectedCompetitions.length > 0)) && (
            <Grid item xs={12}>
              <Autocomplete
                multiple size="small"
                {...selectAllProps(
                  availableCompetitions,
                  formData.selectedCompetitions,
                  'selectedCompetitions',
                  (o) => o.name || `Competition ${o.COMPETITION_ID}`,
                  (a, b) => a.COMPETITION_ID === b.COMPETITION_ID
                )}
                value={formData.selectedCompetitions}
                disabled={hasContext}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.COMPETITION_ID} label={option.name || option.COMPETITION_ID} size="small" {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label={hasContext ? 'Competition' : 'Competitions (optional - leave empty for country-level)'} />}
              />
            </Grid>
          )}

          {formData.selectedGames.length > 0 && (
            <Grid item xs={12}>
              <Autocomplete
                multiple size="small"
                options={[]}
                getOptionLabel={(o) => `Game ${o.GAME_ID}`}
                isOptionEqualToValue={(a, b) => a.GAME_ID === b.GAME_ID}
                value={formData.selectedGames}
                disabled
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.GAME_ID} label={`Game ${option.GAME_ID}`} size="small" {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Game" />}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Autocomplete
              multiple size="small"
              {...selectAllProps(
                dataSourcesList,
                formData.dataSources,
                'dataSources',
                (o) => o.ALIAS_NAME || '',
                (a, b) => a.DATA_SOURCE_ID === b.DATA_SOURCE_ID
              )}
              value={formData.dataSources}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option.DATA_SOURCE_ID} label={option.ALIAS_NAME} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Data Sources *" error={!!errors.dataSources} helperText={errors.dataSources} />}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple size="small"
              {...selectAllProps(
                updateTypesList,
                formData.updateTypes,
                'updateTypes',
                (o) => o.ALIAS_NAME || '',
                (a, b) => a.UPDATE_TYPE_ID === b.UPDATE_TYPE_ID
              )}
              value={formData.updateTypes}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option.UPDATE_TYPE_ID} label={option.ALIAS_NAME} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Update Types *" error={!!errors.updateTypes} helperText={errors.updateTypes} />}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={formData.PRIORITY} label="Priority" onChange={(e) => handleChange('PRIORITY', Number(e.target.value))}>
                {PRIORITY_OPTIONS.map((v) => (
                  <MenuItem key={v} value={v}>{v === -1 ? '-1 (Ignore)' : v === 6 ? '6 (Always Update)' : v}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Comment *" value={formData.COMMENT} onChange={(e) => handleChange('COMMENT', e.target.value)} multiline rows={3} size="small" error={!!errors.COMMENT} helperText={errors.COMMENT} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker label="Start Date" value={formData.START_DATE} onChange={(d) => handleChange('START_DATE', d)} size="small" />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker label="Expiration Date" value={formData.EXPIRATION_DATE} onChange={(d) => handleChange('EXPIRATION_DATE', d)} size="small" />
          </Grid>

          {hasExpiration && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!errors.AFTER_EXPIRED_PRIORITY}>
                <InputLabel>After Expired Priority *</InputLabel>
                <Select value={formData.AFTER_EXPIRED_PRIORITY ?? ''} label="After Expired Priority *" onChange={(e) => handleChange('AFTER_EXPIRED_PRIORITY', e.target.value === '' ? null : Number(e.target.value))}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {PRIORITY_OPTIONS.map((v) => (
                    <MenuItem key={v} value={v}>{v === -1 ? '-1 (Ignore)' : v === 6 ? '6 (Always Update)' : v}</MenuItem>
                  ))}
                </Select>
                {errors.AFTER_EXPIRED_PRIORITY && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>{errors.AFTER_EXPIRED_PRIORITY}</Typography>}
              </FormControl>
            </Grid>
          )}

          {hasStartOnly && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" error={!!errors.SCHEDULE_PRIORITY}>
                <InputLabel>Schedule Priority *</InputLabel>
                <Select value={formData.SCHEDULE_PRIORITY ?? ''} label="Schedule Priority *" onChange={(e) => handleChange('SCHEDULE_PRIORITY', e.target.value === '' ? null : Number(e.target.value))}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {PRIORITY_OPTIONS.map((v) => (
                    <MenuItem key={v} value={v}>{v === -1 ? '-1 (Ignore)' : v === 6 ? '6 (Always Update)' : v}</MenuItem>
                  ))}
                </Select>
                {errors.SCHEDULE_PRIORITY && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>{errors.SCHEDULE_PRIORITY}</Typography>}
              </FormControl>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 2, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        <PrimaryButton onClick={handleSave}>Create Priorities</PrimaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default AddPrioritiesDialog;
