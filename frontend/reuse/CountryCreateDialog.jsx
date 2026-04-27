import React, { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import api from '../src/services/api';
import { formatTimeZoneDisplay } from '../src/utils/formatTimeZone';

export const DEFAULT_COUNTRY_CREATE_FORM = {
  name: '',
  COUNTRY_CODE: '',
  TIME_ZONE_ID: 1,
  FATHER_COUNTRY_ID: '',
  IS_NOT_REAL: false,
  ALLOW_BETTING: true,
  EMOJI: '',
  CONNECT_BY_TEXT: false,
  ALLOW_PREMIUM_INSIGHTS: true,
  PHONE_CODE: '',
  ALLOW_BETS_IN_ALL_SCORES: true,
  LOGIN_AVAILABLE: true,
  MAIN_COLOR: 0,
  SECONDARY_COLOR: 0,
  BLOCK_LIVE_BETTING: false,
  CURRENCY_SYMBOL: '',
  MIN_USERS_FOR_MOST_POPULAR_BET: 100,
  MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: 50,
  ODDS_TYPE: 2,
  CONTINENT_ID: '',
};

export function validateCountryForm(formData) {
  const errors = {};
  if (!formData.name || !String(formData.name).trim()) errors.name = 'Name is required';
  if (!formData.COUNTRY_CODE || !String(formData.COUNTRY_CODE).trim()) errors.COUNTRY_CODE = 'Country code is required';
  return errors;
}

/**
 * Stateless country form body (renders inputs only, not Dialog chrome).
 * Used both in the standalone dialog and inside per-tab forms (TermsFix).
 */
export function CountryCreateForm({ formData, onChange, errors = {}, countries = [], timeZones = [] }) {
  const handle = (field, value) => onChange(field, value);
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          required
          size="small"
          label="Name"
          value={formData.name ?? ''}
          onChange={(e) => handle('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          required
          size="small"
          label="Country Code"
          placeholder="e.g. US"
          value={formData.COUNTRY_CODE ?? ''}
          onChange={(e) => handle('COUNTRY_CODE', e.target.value)}
          error={!!errors.COUNTRY_CODE}
          helperText={errors.COUNTRY_CODE}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Time Zone</InputLabel>
          <Select
            label="Time Zone"
            value={formData.TIME_ZONE_ID ?? ''}
            onChange={(e) => handle('TIME_ZONE_ID', e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">—</MenuItem>
            {timeZones.map((tz) => (
              <MenuItem key={tz.TIME_ZONE_ID} value={tz.TIME_ZONE_ID}>
                {formatTimeZoneDisplay(tz)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Parent Country</InputLabel>
          <Select
            label="Parent Country"
            value={formData.FATHER_COUNTRY_ID || ''}
            onChange={(e) => handle('FATHER_COUNTRY_ID', e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            {countries.map((c) => (
              <MenuItem key={c.COUNTRY_ID} value={c.COUNTRY_ID}>
                {c.EMOJI ? `${c.EMOJI} ` : ''}{c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          size="small"
          label="Emoji"
          placeholder="🇺🇸"
          value={formData.EMOJI ?? ''}
          onChange={(e) => handle('EMOJI', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          size="small"
          label="Phone Code"
          value={formData.PHONE_CODE ?? ''}
          onChange={(e) => handle('PHONE_CODE', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          size="small"
          label="Currency Symbol"
          value={formData.CURRENCY_SYMBOL ?? ''}
          onChange={(e) => handle('CURRENCY_SYMBOL', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!!formData.ALLOW_BETTING}
              onChange={(e) => handle('ALLOW_BETTING', e.target.checked)}
            />
          }
          label="Allow Betting"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!!formData.BLOCK_LIVE_BETTING}
              onChange={(e) => handle('BLOCK_LIVE_BETTING', e.target.checked)}
            />
          }
          label="Block Live Betting"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          size="small"
          label="Min Users (Popular Bet)"
          value={formData.MIN_USERS_FOR_MOST_POPULAR_BET ?? ''}
          onChange={(e) => handle('MIN_USERS_FOR_MOST_POPULAR_BET', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          size="small"
          label="Min Users (Popular Options)"
          value={formData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS ?? ''}
          onChange={(e) => handle('MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS', e.target.value)}
        />
      </Grid>
    </Grid>
  );
}

/**
 * Build the payload expected by POST /api/countries from a form object.
 * Does NOT set NAME_ID – caller decides whether to pass it (e.g. from a term).
 */
export function buildCountryPayload(formData, { nameId } = {}) {
  const nameTrimmed = String(formData.name || '').trim();
  const payload = {
    name: nameTrimmed,
    COUNTRY_CODE: String(formData.COUNTRY_CODE || '').trim().toUpperCase().slice(0, 4),
    TIME_ZONE_ID:
      formData.TIME_ZONE_ID != null && formData.TIME_ZONE_ID !== ''
        ? Number(formData.TIME_ZONE_ID)
        : 1,
    FATHER_COUNTRY_ID:
      formData.FATHER_COUNTRY_ID === '' || formData.FATHER_COUNTRY_ID == null
        ? null
        : Number(formData.FATHER_COUNTRY_ID) || null,
    IS_NOT_REAL: !!formData.IS_NOT_REAL,
    ALLOW_BETTING: formData.ALLOW_BETTING !== false,
    EMOJI: formData.EMOJI || null,
    CONNECT_BY_TEXT: !!formData.CONNECT_BY_TEXT,
    ALLOW_PREMIUM_INSIGHTS: formData.ALLOW_PREMIUM_INSIGHTS !== false,
    PHONE_CODE: formData.PHONE_CODE || null,
    ALLOW_BETS_IN_ALL_SCORES: formData.ALLOW_BETS_IN_ALL_SCORES !== false,
    LOGIN_AVAILABLE: formData.LOGIN_AVAILABLE !== false,
    MAIN_COLOR: Number(formData.MAIN_COLOR) || 0,
    SECONDARY_COLOR: Number(formData.SECONDARY_COLOR) || 0,
    BLOCK_LIVE_BETTING: !!formData.BLOCK_LIVE_BETTING,
    CURRENCY_SYMBOL: formData.CURRENCY_SYMBOL || null,
    MIN_USERS_FOR_MOST_POPULAR_BET: Number(formData.MIN_USERS_FOR_MOST_POPULAR_BET) || 100,
    MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: Number(formData.MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS) || 50,
    ODDS_TYPE: Number(formData.ODDS_TYPE) || 2,
    CONTINENT_ID:
      formData.CONTINENT_ID === '' || formData.CONTINENT_ID == null
        ? null
        : Number(formData.CONTINENT_ID) || null,
  };
  if (nameId != null) payload.NAME_ID = nameId;
  return payload;
}

/**
 * Create a brand new term (category "Countries names") for a new country.
 *
 * The English value typed by the user in the dialog's NAME field is ALWAYS
 * added first as an Approved default value (languageId = 1), regardless of
 * any extra values coming from temp/data-source rows. Those extra values
 * (if provided) are added afterwards as NotApproved (and non-default),
 * keeping the dedupe rule: a duplicate of the English default is skipped.
 *
 * extraValues: Array<{ languageId, value }>
 */
export async function createCountryWithValues(formData, extraValues) {
  const nameTrimmed = String(formData.name || '').trim();
  if (!nameTrimmed) {
    throw new Error('Country name is required');
  }
  const seen = new Set();
  const termValues = [];
  const englishKey = `1|${nameTrimmed.toLowerCase()}`;
  termValues.push({
    languageId: 1,
    value: nameTrimmed,
    isDefault: true,
    status: 'Approved',
  });
  seen.add(englishKey);

  if (Array.isArray(extraValues)) {
    for (const v of extraValues) {
      const lang = Number(v?.languageId);
      const val = String(v?.value ?? '').trim();
      if (!val || !Number.isFinite(lang)) continue;
      const key = `${lang}|${val.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      termValues.push({
        languageId: lang,
        value: val,
        isDefault: false,
        status: 'NotApproved',
      });
    }
  }

  const newTerm = await api.createTerm({ category: 'Countries names', values: termValues });
  const payload = buildCountryPayload(formData, { nameId: newTerm.id });
  const created = await api.createCountry(payload);
  return { term: newTerm, country: created };
}

/**
 * Standalone dialog used by the Create Country flow.
 * Props:
 *   open, onClose, initialName, onCreated(country), extraValues?
 */
export default function CountryCreateDialog({
  open,
  onClose,
  initialName = '',
  onCreated,
  extraValues,
  title = 'Create New Country',
}) {
  const [formData, setFormData] = useState({ ...DEFAULT_COUNTRY_CREATE_FORM });
  const [errors, setErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [timeZones, setTimeZones] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({ ...DEFAULT_COUNTRY_CREATE_FORM, name: initialName || '' });
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
        /* ignored – dropdowns just stay empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialName]);

  const onChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCreate = async () => {
    const nextErrors = validateCountryForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setSaving(true);
      const result = await createCountryWithValues(formData, extraValues);
      onCreated?.(result.country, result.term);
      onClose?.();
    } catch (err) {
      const message = err?.message || 'Failed to create country';
      setErrors((prev) => ({ ...prev, _form: message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
          fontWeight: 600,
          borderBottom: '1px solid #EAECF0',
          pb: 2,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
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
          disabled={saving}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
