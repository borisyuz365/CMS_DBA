import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import api from '../../services/api';
import {
  CountryCreateForm,
  DEFAULT_COUNTRY_CREATE_FORM,
  validateCountryForm,
  createCountryWithValues,
} from '../../../reuse/CountryCreateDialog';

/**
 * "Many -> One" flow: creates a single new country whose term holds every
 * selected temp NAME as a value (each under its own LANG_ID).
 *
 * Props:
 *   open, onClose, tempRows: [{ NAME, LANG_ID, ... }], onCreated(country, term)
 */
export default function ManyToOneCountryDialog({ open, onClose, tempRows = [], onCreated }) {
  const [formData, setFormData] = useState({ ...DEFAULT_COUNTRY_CREATE_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [timeZones, setTimeZones] = useState([]);

  useEffect(() => {
    if (!open) return;
    setFormData({ ...DEFAULT_COUNTRY_CREATE_FORM, name: tempRows[0]?.NAME || '' });
    setErrors({});
    let cancelled = false;
    (async () => {
      try {
        const [cs, tzs] = await Promise.all([
          api.getCountries().catch(() => []),
          api.getTimeZonesList().catch(() => []),
        ]);
        if (cancelled) return;
        setCountries(Array.isArray(cs) ? cs : []);
        setTimeZones(Array.isArray(tzs) ? tzs : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tempRows]);

  const onChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const values = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of tempRows) {
      const v = String(row.NAME ?? '').trim();
      const lang = Number(row.LANG_ID);
      if (!v || !Number.isFinite(lang)) continue;
      const key = `${lang}|${v.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ languageId: lang, value: v, isDefault: list.length === 0, status: 'Approved' });
    }
    return list;
  }, [tempRows]);

  const handleCreate = async () => {
    const nextErrors = validateCountryForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      const result = await createCountryWithValues(formData, values);
      onCreated?.(result.country, result.term, tempRows.map((r) => r.COUNTRY_ID));
      onClose?.();
    } catch (err) {
      setErrors((prev) => ({ ...prev, _form: err?.message || 'Failed to create country' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create Country from {tempRows.length} temp rows
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            background: '#f9fafb',
            borderColor: '#e0e0e0',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Term values that will be created ({values.length + 1})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            The <strong>Name</strong> below will be added as an English (Approved) default value.
            The values from the selected temp rows will be added as NotApproved under their own LANG_ID.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {values.map((v) => (
              <Chip
                key={`${v.languageId}|${v.value}`}
                size="small"
                label={`[${v.languageId}] ${v.value}`}
                sx={{ maxWidth: 360 }}
              />
            ))}
          </Box>
        </Paper>
        <CountryCreateForm
          formData={formData}
          onChange={onChange}
          errors={errors}
          countries={countries}
          timeZones={timeZones}
        />
        {errors._form && (
          <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{errors._form}</Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={saving || values.length === 0}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
