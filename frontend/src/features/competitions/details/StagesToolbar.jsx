import React from 'react';
import { Box, Button } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

export default function StagesToolbar({
  isEditMode,
  selectedStagesCount,
  pendingChangesCount,
  hasPendingCurrentStage,
  onOpenCreateGenerate,
  onDeleteSelectedStages,
  onToggleEditMode,
  onSaveStageEdits,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Button
        variant="contained"
        size="small"
        onClick={onOpenCreateGenerate}
        sx={{ textTransform: 'none' }}
      >
        Create/Generate
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={onDeleteSelectedStages}
        disabled={selectedStagesCount === 0}
        sx={{
          textTransform: 'none',
          backgroundColor: '#d32f2f',
          color: '#fff',
          '&:hover': { backgroundColor: '#c62828' },
          '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
        }}
      >
        {selectedStagesCount > 0 ? `DELETE (${selectedStagesCount})` : 'DELETE'}
      </Button>
      <Button
        variant={isEditMode ? 'contained' : 'outlined'}
        size="small"
        startIcon={isEditMode ? <CancelIcon /> : <EditIcon />}
        onClick={onToggleEditMode}
        sx={{
          textTransform: 'none',
          borderColor: '#E0E0E0',
          bgcolor: isEditMode ? '#1976d2' : '#fff',
          color: isEditMode ? '#fff' : '#000',
          '&:hover': { bgcolor: isEditMode ? '#1565c0' : '#f5f5f5' },
        }}
      >
        {isEditMode ? 'Cancel Edit' : 'Edit Mode'}
      </Button>
      {isEditMode && (
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onSaveStageEdits}
          disabled={pendingChangesCount === 0 && !hasPendingCurrentStage}
          sx={{
            textTransform: 'none',
            backgroundColor: '#15803d',
            color: '#fff',
            '&:hover': { backgroundColor: '#166534' },
            '&.Mui-disabled': { backgroundColor: '#ccc', color: '#fff' },
          }}
        >
          Save Changes
        </Button>
      )}
    </Box>
  );
}
