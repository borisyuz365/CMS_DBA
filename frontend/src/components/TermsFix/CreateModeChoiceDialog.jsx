import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  Typography,
} from '@mui/material';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';

/**
 * Ask the user how to create entities from multiple selected temp rows:
 * - "many-to-one": all selected temp NAMEs become values on one new entity
 * - "one-to-one":  create one entity per temp row (tabs flow)
 *
 * @param {string} entityName - e.g. "country", "competition", "competitor"
 */
export default function CreateModeChoiceDialog({ open, onClose, count = 0, onChoose, entityName = 'country' }) {
  const Option = ({ icon, title, description, onClick }) => (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        flex: 1,
        cursor: 'pointer',
        border: '1px solid #e0e0e0',
        boxShadow: 1,
        '&:hover': { borderColor: '#1976d2', boxShadow: 2 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ color: '#1976d2', display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Paper>
  );

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #EAECF0', pb: 2 }}>
        Which type of creation mode do you want?
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You have selected {count} temp rows. Choose how the new entities should be created.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Option
            icon={<MergeTypeIcon />}
            title="Many → One"
            description={`Create a single new ${entityName} and attach every selected temp NAME as a value (under its own LANG_ID) on that ${entityName}'s term.`}
            onClick={() => onChoose?.('many-to-one')}
          />
          <Option
            icon={<DynamicFeedIcon />}
            title="One → One (Tabs)"
            description={`Create one new ${entityName} per selected temp row. One tab per ${entityName} – fill all forms, then create them together.`}
            onClick={() => onChoose?.('one-to-one')}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #EAECF0' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
