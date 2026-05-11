import React from 'react';
import {
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const SEASON_CONFIGURATION_FIELDS = [
  { key: 'USE_NAME', label: 'Use Name' },
  { key: 'SHOW_TOP_ATHLETES', label: 'Show Top Athletes' },
  { key: 'HAS_BRACKETS', label: 'Has Brackets' },
  { key: 'HAS_TABLE', label: 'Has Table' },
  { key: 'SHOW_INFO_CARD', label: 'Has Info Card' },
  { key: 'HAS_SEED', label: 'Has Seed' },
  { key: 'SHOW_TOP_TEAMS_TAB', label: 'Show Top Teams Tab' },
  { key: 'SHOW_OUTRIGHTS_TAB', label: 'Show Outrights Tab' },
  { key: 'PRESENT_COMPETITION_RULES', label: 'Present Competition Rules' },
  { key: 'SHOW_MATCHES', label: 'Show Matches' },
];

export default function SeasonDetailsForm({ seasonForm, onSeasonFormChange }) {
  const updateSeasonForm = (changes) => {
    onSeasonFormChange((prev) => ({ ...prev, ...changes }));
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Season Details</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            size="small"
            label="Season Key"
            placeholder="<Default>YYYY/YYYY"
            value={seasonForm.SEASON_KEY ?? ''}
            onChange={(event) => updateSeasonForm({ SEASON_KEY: event.target.value || null })}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <DateTimePicker
            label="Start Date"
            value={seasonForm.START_DATE ? dayjs(seasonForm.START_DATE) : null}
            onChange={(value) => updateSeasonForm({ START_DATE: value ? value.toISOString() : null })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <DateTimePicker
            label="End Date"
            value={seasonForm.END_DATE ? dayjs(seasonForm.END_DATE) : null}
            onChange={(value) => updateSeasonForm({ END_DATE: value ? value.toISOString() : null })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button variant="contained" size="small" sx={{ textTransform: 'none' }}>CONNECT GAMES & COMPETITORS</Button>
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Season Configuration</Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {SEASON_CONFIGURATION_FIELDS.map(({ key, label }) => (
          <Grid item xs={6} sm={4} md={3} key={key}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!!seasonForm[key]}
                  onChange={(event) => updateSeasonForm({ [key]: event.target.checked })}
                />
              }
              label={label}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
