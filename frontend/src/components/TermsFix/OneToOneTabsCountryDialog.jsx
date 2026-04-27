import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tab,
  Tabs,
  Typography,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../../services/api';
import {
  CountryCreateForm,
  DEFAULT_COUNTRY_CREATE_FORM,
  validateCountryForm,
  createCountryWithValues,
} from '../../../reuse/CountryCreateDialog';

/**
 * "One -> One (Tabs)" flow: creates one new country per selected temp row.
 * The dialog shows a tab per temp row. User fills each form individually and
 * submits them together.
 *
 * Props:
 *   open, onClose, tempRows, onCreated(createdCountries[], tempIds)
 */
export default function OneToOneTabsCountryDialog({ open, onClose, tempRows = [], onCreated }) {
  const [activeTab, setActiveTab] = useState(0);
  const [forms, setForms] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [timeZones, setTimeZones] = useState([]);
  const [formError, setFormError] = useState('');
  const [completed, setCompleted] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setActiveTab(0);
    setForms(
      tempRows.map((row) => ({
        ...DEFAULT_COUNTRY_CREATE_FORM,
        name: row.NAME || '',
        _tempRow: row,
      }))
    );
    setErrors(tempRows.map(() => ({})));
    setCompleted(new Set());
    setFormError('');
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

  const onChange = (tabIdx, field, value) => {
    setForms((prev) => {
      const next = [...prev];
      next[tabIdx] = { ...next[tabIdx], [field]: value };
      return next;
    });
    setErrors((prev) => {
      const next = [...prev];
      if (next[tabIdx]?.[field]) {
        next[tabIdx] = { ...next[tabIdx], [field]: undefined };
      }
      return next;
    });
  };

  const tabs = useMemo(
    () =>
      tempRows.map((row, idx) => ({
        label: row.NAME || `Row ${row.COUNTRY_ID}`,
        done: completed.has(idx),
      })),
    [tempRows, completed]
  );

  const handleCreateAll = async () => {
    const nextErrors = forms.map((f) => validateCountryForm(f));
    setErrors(nextErrors);
    const firstInvalid = nextErrors.findIndex((e) => Object.keys(e).length > 0);
    if (firstInvalid !== -1) {
      setActiveTab(firstInvalid);
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const createdCountries = [];
      const createdTempIds = [];
      const failed = [];
      const nextCompleted = new Set(completed);
      for (let idx = 0; idx < forms.length; idx += 1) {
        if (nextCompleted.has(idx)) continue;
        const form = forms[idx];
        const row = form._tempRow;
        const lang = Number(row?.LANG_ID);
        const values = Number.isFinite(lang) && row?.NAME
          ? [{ languageId: lang, value: String(row.NAME).trim(), isDefault: true, status: 'Approved' }]
          : undefined;
        try {
          const result = await createCountryWithValues(form, values);
          createdCountries.push(result.country);
          createdTempIds.push(row?.COUNTRY_ID);
          nextCompleted.add(idx);
        } catch (err) {
          failed.push({ idx, message: err?.message || 'Failed' });
        }
      }
      setCompleted(nextCompleted);
      if (failed.length > 0) {
        setFormError(
          `Created ${createdCountries.length}/${forms.length}. Errors: ${failed
            .map((f) => `tab ${f.idx + 1} – ${f.message}`)
            .join(' | ')}`
        );
        const firstFailed = failed[0]?.idx;
        if (firstFailed != null) setActiveTab(firstFailed);
      }
      if (createdCountries.length > 0) {
        onCreated?.(createdCountries, createdTempIds.filter((x) => x != null));
      }
      if (failed.length === 0) onClose?.();
    } catch (err) {
      setFormError(err?.message || 'Failed to create countries');
    } finally {
      setSaving(false);
    }
  };

  if (forms.length === 0) return null;

  return (
    <Dialog open={!!open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Create {tempRows.length} Countries (one per tab)
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 0, pb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
            '& .Mui-selected': { color: '#1976d2' },
          }}
        >
          {tabs.map((t, idx) => (
            <Tab
              key={idx}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {t.done && <CheckCircleIcon sx={{ fontSize: 16, color: '#15803d' }} />}
                  <span>{t.label}</span>
                </Box>
              }
            />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Source temp row:</Typography>
            <Chip
              size="small"
              label={`[${forms[activeTab]?._tempRow?.LANG_ID}] ${forms[activeTab]?._tempRow?.NAME ?? ''}`}
              sx={{ maxWidth: 420 }}
            />
          </Box>
          <CountryCreateForm
            formData={forms[activeTab]}
            onChange={(field, value) => onChange(activeTab, field, value)}
            errors={errors[activeTab] || {}}
            countries={countries}
            timeZones={timeZones}
          />
          {formError && (
            <Box sx={{ mt: 2, color: 'error.main', fontSize: 13 }}>{formError}</Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateAll}
          variant="contained"
          disabled={saving}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Creating…' : `Create ${forms.length} Countries`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
