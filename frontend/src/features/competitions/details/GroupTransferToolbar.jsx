import React from 'react';
import { Box, Button } from '@mui/material';

export default function GroupTransferToolbar({
  selectedNotInGroupsCount,
  selectedInGroupCount,
  hasSelectedGroup,
  onAddToGroup,
  onRemoveFromGroup,
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={onAddToGroup}
        disabled={selectedNotInGroupsCount === 0 || !hasSelectedGroup}
        sx={{ textTransform: 'none' }}
      >
        &lt;&lt; ADD TO GROUP
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={onRemoveFromGroup}
        disabled={selectedInGroupCount === 0 || !hasSelectedGroup}
        sx={{ textTransform: 'none' }}
      >
        REMOVE &gt;&gt;
      </Button>
    </Box>
  );
}
