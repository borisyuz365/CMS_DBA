import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function GroupAccordionSummary({
  group,
  isExpanded,
  countLabel,
  onGroupNameClick,
  onEditGroup,
  onDeleteGroup,
  onToggleGroup,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {isExpanded ? (
          <ExpandLessIcon sx={{ color: 'action.active', mr: 0.5 }} />
        ) : (
          <ChevronRightIcon sx={{ color: 'action.active', mr: 0.5 }} />
        )}
        <Typography
          component="span"
          sx={{
            fontWeight: 500,
            ...(group.NAME_ID ? { color: 'primary.main', textDecoration: 'underline', cursor: 'pointer', '&:hover': { color: 'primary.dark' } } : {}),
          }}
          onClick={group.NAME_ID ? onGroupNameClick : undefined}
        >
          {group.name || `Group ${group.GROUP_NUM}`}
        </Typography>
        <Typography component="span" sx={{ fontWeight: 500, ml: 0.5 }}> ({countLabel})</Typography>
      </Box>
      <IconButton
        size="small"
        sx={{ color: '#1976d2' }}
        onClick={onEditGroup}
        title="Edit group"
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{ color: '#d32f2f' }}
        onClick={onDeleteGroup}
        title="Delete group"
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={onToggleGroup}>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </Box>
  );
}
