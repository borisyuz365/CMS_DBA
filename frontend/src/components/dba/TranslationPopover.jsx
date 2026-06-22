// TranslationPopover — small dialog for entering per-language values for one
// template field (e.g. config.ctaText). Used by DbaTemplateEditor to attach
// translations to any free-text field via the 🌐 button.
//
// Translations are sent back as `{ langId: value, ... }`. langId=1 (English)
// is treated as canonical and stays synced with the parent's regular TextField
// value.
//
// To keep moving parts down, the supported language set is hardcoded here.
// When the CMS needs more, swap to /api/languages.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, TextField,
  Typography, Button, Box, Tooltip, Chip,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

export const SUPPORTED_LANGUAGES = [
  { id: 1, code: 'en', label: 'English',           flag: '🇬🇧', defaultForEnglish: true },
  { id: 9, code: 'pt', label: 'Portuguese (BR)',   flag: '🇧🇷' },
  { id: 5, code: 'es', label: 'Spanish (LATAM)',   flag: '🇲🇽' },
  { id: 7, code: 'de', label: 'German',            flag: '🇩🇪' },
  { id: 8, code: 'it', label: 'Italian',           flag: '🇮🇹' },
];

// Count language entries that have a non-empty value (excluding English, which
// is the canonical / TextField value).
export function countTranslations(translations) {
  if (!translations) return 0;
  return Object.entries(translations).filter(
    ([langId, v]) => Number(langId) !== 1 && v != null && String(v).trim() !== '',
  ).length;
}

// Inline button + popover for one field. Drop next to your TextField.
//
// Props:
//   fieldLabel    — title shown in the dialog ("CTA button text")
//   canonical     — current English/canonical text from the parent TextField
//   translations  — { langId: value } from parent state (excluding empties)
//   onChange      — called with the next { langId: value } map on Apply
//   multiline     — render textarea inputs
export default function TranslationPopover({ fieldLabel, canonical = '', translations, onChange, multiline = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});

  // Seed the dialog state from the parent. English defaults to the canonical
  // TextField value so the user doesn't have to retype it.
  useEffect(() => {
    if (!open) return;
    const next = { ...(translations || {}) };
    if (!next[1] && canonical) next[1] = canonical;
    setDraft(next);
  }, [open, translations, canonical]);

  const setLang = (langId, value) => setDraft((d) => ({ ...d, [langId]: value }));

  const handleApply = () => {
    // Strip empties so we don't store junk.
    const out = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v != null && String(v).trim() !== '') out[k] = String(v);
    }
    onChange(out);
    setOpen(false);
  };

  const nonEnglishCount = useMemo(() => countTranslations(translations), [translations]);

  return (
    <>
      <Tooltip title={nonEnglishCount > 0
        ? `Translations · ${nonEnglishCount} language${nonEnglishCount === 1 ? '' : 's'}`
        : 'Add translations'}>
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            ml: 0.5,
            border: '1px solid',
            borderColor: nonEnglishCount > 0 ? 'primary.main' : '#E0E0E0',
            color: nonEnglishCount > 0 ? 'primary.main' : 'text.secondary',
            borderRadius: 1,
            width: 32, height: 32,
            position: 'relative',
          }}
        >
          <TranslateIcon fontSize="small" />
          {nonEnglishCount > 0 && (
            <Box sx={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, px: 0.5,
              bgcolor: 'primary.main', color: '#fff',
              borderRadius: 999, fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{nonEnglishCount}</Box>
          )}
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          Translations
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            <Box component="strong">{fieldLabel}</Box>
            <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
              · English is the canonical fallback when a requested language has no value.
            </Box>
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Stack key={lang.id} direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{ width: 140, pt: multiline ? 1 : 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ fontSize: 16 }}>{lang.flag}</Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{lang.label}</Typography>
                  {lang.defaultForEnglish && <Chip label="canonical" size="small" sx={{ height: 18, fontSize: 10 }} />}
                </Box>
                <TextField
                  fullWidth size="small" multiline={multiline} minRows={multiline ? 2 : 1}
                  value={draft[lang.id] || ''}
                  onChange={(e) => setLang(lang.id, e.target.value)}
                  placeholder={lang.defaultForEnglish ? 'English value' : `Translate to ${lang.label}…`}
                />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
