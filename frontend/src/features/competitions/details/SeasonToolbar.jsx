import React from 'react';
import { Autocomplete, Box, Button, TextField } from '@mui/material';

export default function SeasonToolbar({
  seasons,
  competition,
  selectedSeasonNum,
  onSelectedSeasonNumChange,
  onEditSeasonName,
  onSetCurrentSeason,
  onAddSeason,
  onDeleteSeason,
}) {
  const selectedSeason = seasons.find((season) => season.SEASON_NUM === selectedSeasonNum);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Box sx={{ width: { xs: '100%', sm: 'calc((100% - 48px) / 6)' }, minWidth: { xs: 0, sm: 120 } }}>
        <Autocomplete
          size="small"
          options={seasons}
          getOptionLabel={(season) => {
            const isCurrent = competition?.CURRENT_SEASON === season.SEASON_NUM;
            return `#${season.SEASON_NUM} - ${season.name || `Season ${season.SEASON_NUM}`}${isCurrent ? ' (Current)' : ''}`;
          }}
          value={selectedSeason ?? null}
          onChange={(_, newValue) => onSelectedSeasonNumChange(newValue?.SEASON_NUM ?? null)}
          isOptionEqualToValue={(option, value) => option?.SEASON_NUM === value?.SEASON_NUM}
          renderInput={(params) => (
            <TextField {...params} label="Season Name" placeholder="Type to search..." />
          )}
          filterSelectedOptions={false}
        />
      </Box>
      <Button
        variant="outlined"
        size="small"
        sx={{ textTransform: 'none' }}
        onClick={() => selectedSeason?.NAME_ID && onEditSeasonName(selectedSeason)}
        disabled={!selectedSeasonNum}
      >
        Edit Name
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => onSetCurrentSeason(selectedSeasonNum)}
        disabled={!selectedSeasonNum || competition?.CURRENT_SEASON === selectedSeasonNum}
        sx={{ textTransform: 'none' }}
      >
        SET CURRENT
      </Button>
      <Button variant="contained" size="small" onClick={onAddSeason} sx={{ textTransform: 'none' }}>CREATE</Button>
      <Button
        variant="contained"
        size="small"
        onClick={() => selectedSeason && onDeleteSeason(selectedSeason)}
        disabled={!selectedSeasonNum || competition?.CURRENT_SEASON === selectedSeasonNum}
        sx={{
          textTransform: 'none',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          backgroundColor: '#d32f2f',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#c62828',
          },
          '&.Mui-disabled': {
            backgroundColor: '#cccccc',
            color: '#ffffff',
          },
        }}
      >
        DELETE
      </Button>
    </Box>
  );
}
