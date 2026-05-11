import React from 'react';
import { Box, Button } from '@mui/material';

export default function SeasonCompetitorTransferToolbar({
  selectedNotInSeasonCount,
  selectedInSeasonCount,
  onAddToSeason,
  onRemoveSelectedFromSeason,
  onRemoveFromAllSeasonsClick,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        justifyContent: 'center',
        alignSelf: { md: 'center' },
        gap: 1,
        order: { xs: 3, md: 2 },
      }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={onAddToSeason}
        disabled={selectedNotInSeasonCount === 0}
        sx={{ textTransform: 'none' }}
      >
        &lt;&lt; ADD COMPETITORS
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={onRemoveSelectedFromSeason}
        disabled={selectedInSeasonCount === 0}
        sx={{ textTransform: 'none' }}
      >
        REMOVE COMPETITORS &gt;&gt;
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={onRemoveFromAllSeasonsClick}
        disabled={selectedInSeasonCount === 0 && selectedNotInSeasonCount === 0}
        sx={{
          textTransform: 'none',
          borderColor: '#d32f2f',
          color: '#d32f2f',
          '&:hover': { borderColor: '#b71c1c', backgroundColor: 'rgba(211, 47, 47, 0.04)' },
        }}
      >
        REMOVE FROM ALL SEASONS
      </Button>
    </Box>
  );
}
