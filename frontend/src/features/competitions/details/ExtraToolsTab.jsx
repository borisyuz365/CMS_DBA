import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const EXTRA_TOOL_LABELS = [
  'Reports',
  'Info Card',
  'Priorities',
  'Bet Lines',
  'Team of The Week',
  'Cards Order',
  'Featured Match',
  'Draw',
];

export default function ExtraToolsTab() {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#000000', mb: 2 }}>
        Extra Tools & Screens
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {EXTRA_TOOL_LABELS.map((label) => (
          <Button key={label} variant="outlined" size="small" sx={{ textTransform: 'none' }}>
            {label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
