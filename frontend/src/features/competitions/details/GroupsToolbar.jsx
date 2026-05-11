import React from 'react';
import { Box, Button } from '@mui/material';

export default function GroupsToolbar({ onCreateGroup }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
      <Button
        variant="contained"
        size="small"
        onClick={onCreateGroup}
        sx={{ textTransform: 'none' }}
      >
        CREATE NEW
      </Button>
    </Box>
  );
}
