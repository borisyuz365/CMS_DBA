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
  Typography,
  IconButton,
  Grid,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrimaryButton from '../../../reuse/PrimaryButton';
import SecondaryButton from '../../../reuse/SecondaryButton';
import DatePicker from '../../../reuse/DatePicker';

const CUT_TYPE_OPTIONS = [
  { value: 1, label: 'Game' },
  { value: 2, label: 'Competition' },
  { value: 3, label: 'Country' },
];

const PRIORITY_OPTIONS = [-1, 0, 1, 2, 3, 4, 5, 6];

const AddPriorityDialog = ({
  open,
  onClose,
  onSave,
  dataSourcesList = [],
  updateTypesList = [],
  priorityLevelsList = [],
  countries = [],
  competitions = [],
  games = [],
  initialData = {},
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    DATA_SOURCE: null,
    UPDATE_TYPE: null,
    PRIORITY: 0,
    CUT_TYPE: 3,
    CUT_VALUE: null,
    COMMENT: '',
    START_DATE: null,
    EXPIRATION_DATE: null,
    AFTER_EXPIRED_PRIORITY: null,
    SCHEDULE_PRIORITY: null,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        setFormData({
          DATA_SOURCE: initialData.DATA_SOURCE ?? null,
          UPDATE_TYPE: initialData.UPDATE_TYPE ?? null,
          PRIORITY: initialData.PRIORITY ?? 0,
          CUT_TYPE: initialData.CUT_TYPE ?? 3,
          CUT_VALUE: initialData.CUT_VALUE ?? null,
          COMMENT: initialData.COMMENT || '',
          START_DATE: initialData.START_DATE || null,
          EXPIRATION_DATE: initialData.EXPIRATION_DATE || null,
          AFTER_EXPIRED_PRIORITY: initialData.AFTER_EXPIRED_PRIORITY ?? null,
          SCHEDULE_PRIORITY: initialData.SCHEDULE_PRIORITY ?? null,
        });
      } else {
        setFormData({
          DATA_SOURCE: null,
          UPDATE_TYPE: null,
          PRIORITY: 0,
          CUT_TYPE: 3,
          CUT_VALUE: null,
          COMMENT: '',
          START_DATE: null,
          EXPIRATION_DATE: null,
          AFTER_EXPIRED_PRIORITY: null,
          SCHEDULE_PRIORITY: null,
        });
      }
      setErrors({});
    }
  }, [open, isEdit, initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'CUT_TYPE') next.CUT_VALUE = null;
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toISOString = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string' && val.trim()) return val;
    return null;
  };

  const hasExpiration = !!formData.EXPIRATION_DATE;
  const hasStartOnly = !!formData.START_DATE && !formData.EXPIRATION_DATE;
  const hasDates = !!formData.START_DATE || hasExpiration;

  const validate = () => {
    const e = {};
    if (formData.DATA_SOURCE == null) e.DATA_SOURCE = 'Data Source is required';
    if (formData.UPDATE_TYPE == null) e.UPDATE_TYPE = 'Update Type is required';
    if (formData.CUT_VALUE == null) e.CUT_VALUE = 'Cut Value is required';
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
    const payload = {
      ...formData,
      START_DATE: toISOString(formData.START_DATE),
      EXPIRATION_DATE: toISOString(formData.EXPIRATION_DATE),
      AFTER_EXPIRED_PRIORITY: hasExpiration ? formData.AFTER_EXPIRED_PRIORITY : null,
      SCHEDULE_PRIORITY: hasStartOnly ? formData.SCHEDULE_PRIORITY : null,
    };
    onSave(payload);
  };

  const selectedDS = dataSourcesList.find((ds) => ds.DATA_SOURCE_ID === formData.DATA_SOURCE) || null;
  const selectedUT = updateTypesList.find((ut) => ut.UPDATE_TYPE_ID === formData.UPDATE_TYPE) || null;

  const cutValueEntity = useMemo(() => {
    if (formData.CUT_TYPE === 3) return countries.find((c) => c.COUNTRY_ID === formData.CUT_VALUE) || null;
    if (formData.CUT_TYPE === 2) return competitions.find((c) => c.COMPETITION_ID === formData.CUT_VALUE) || null;
    return null;
  }, [formData.CUT_TYPE, formData.CUT_VALUE, countries, competitions]);

  const resolveCutValueLabel = () => {
    if (formData.CUT_TYPE === 3) {
      const c = countries.find((x) => x.COUNTRY_ID === formData.CUT_VALUE);
      return c?.name || formData.CUT_VALUE;
    }
    if (formData.CUT_TYPE === 2) {
      const c = competitions.find((x) => x.COMPETITION_ID === formData.CUT_VALUE);
      return c?.name || formData.CUT_VALUE;
    }
    return formData.CUT_VALUE;
  };

  const renderCutValueField = () => {
    if (formData.CUT_TYPE === 3) {
      return (
        <Autocomplete
          size="small"
          options={countries}
          getOptionLabel={(o) => o.name || `Country ${o.COUNTRY_ID}`}
          isOptionEqualToValue={(a, b) => a.COUNTRY_ID === b.COUNTRY_ID}
          value={cutValueEntity}
          onChange={(_, v) => handleChange('CUT_VALUE', v ? v.COUNTRY_ID : null)}
          renderInput={(params) => (
            <TextField {...params} label="Country" error={!!errors.CUT_VALUE} helperText={errors.CUT_VALUE} />
          )}
        />
      );
    }
    if (formData.CUT_TYPE === 2) {
      return (
        <Autocomplete
          size="small"
          options={competitions}
          getOptionLabel={(o) => o.name || `Competition ${o.COMPETITION_ID}`}
          isOptionEqualToValue={(a, b) => a.COMPETITION_ID === b.COMPETITION_ID}
          value={cutValueEntity}
          onChange={(_, v) => handleChange('CUT_VALUE', v ? v.COMPETITION_ID : null)}
          renderInput={(params) => (
            <TextField {...params} label="Competition" error={!!errors.CUT_VALUE} helperText={errors.CUT_VALUE} />
          )}
        />
      );
    }
    return (
      <TextField
        fullWidth size="small" type="number" label="Game ID"
        value={formData.CUT_VALUE ?? ''}
        onChange={(e) => handleChange('CUT_VALUE', e.target.value ? Number(e.target.value) : null)}
        error={!!errors.CUT_VALUE} helperText={errors.CUT_VALUE}
        inputProps={{ min: 1 }}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { overflow: 'visible' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 'inherit' }}>
          {isEdit ? 'Edit Priority' : 'Add Priority'}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 5, overflow: 'visible' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={dataSourcesList}
              getOptionLabel={(o) => o.ALIAS_NAME || ''}
              isOptionEqualToValue={(a, b) => a.DATA_SOURCE_ID === b.DATA_SOURCE_ID}
              value={selectedDS}
              onChange={(_, v) => handleChange('DATA_SOURCE', v ? v.DATA_SOURCE_ID : null)}
              disabled={isEdit}
              renderInput={(params) => (
                <TextField {...params} label="Data Source" error={!!errors.DATA_SOURCE} helperText={errors.DATA_SOURCE}
                  sx={isEdit ? { bgcolor: 'action.disabledBackground' } : {}} />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={updateTypesList}
              getOptionLabel={(o) => o.ALIAS_NAME || ''}
              isOptionEqualToValue={(a, b) => a.UPDATE_TYPE_ID === b.UPDATE_TYPE_ID}
              value={selectedUT}
              onChange={(_, v) => handleChange('UPDATE_TYPE', v ? v.UPDATE_TYPE_ID : null)}
              disabled={isEdit}
              renderInput={(params) => (
                <TextField {...params} label="Update Type" error={!!errors.UPDATE_TYPE} helperText={errors.UPDATE_TYPE}
                  sx={isEdit ? { bgcolor: 'action.disabledBackground' } : {}} />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Priority Level" disabled
              value={`${CUT_TYPE_OPTIONS.find((o) => o.value === formData.CUT_TYPE)?.label || formData.CUT_TYPE} (${resolveCutValueLabel()})`}
              sx={{ bgcolor: 'action.disabledBackground' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority Value</InputLabel>
              <Select value={formData.PRIORITY} label="Priority Value" onChange={(e) => handleChange('PRIORITY', Number(e.target.value))}>
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
        <PrimaryButton onClick={handleSave}>{isEdit ? 'Update' : 'Create'}</PrimaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default AddPriorityDialog;
