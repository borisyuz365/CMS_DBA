import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

const IMAGE_TYPES = ['competition', 'dark', 'trophy'];

function getTabValue(imageType) {
  const index = IMAGE_TYPES.indexOf(imageType);
  return index >= 0 ? index : 0;
}

export default function ImageUrlDialog({
  open,
  imageType,
  imageUrl,
  onClose,
  onTypeChange,
  onUrlChange,
  onSave,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload / Edit Image</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
          <Tabs
            value={getTabValue(imageType)}
            onChange={(_, newValue) => onTypeChange(IMAGE_TYPES[newValue] || 'competition')}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
              '& .Mui-selected': { color: '#1976d2' },
            }}
          >
            <Tab label="Light Image" />
            <Tab label="Dark Image" />
            <Tab label="Trophy Image" />
          </Tabs>
        </Box>
        <TextField
          autoFocus
          margin="dense"
          label="Image URL"
          type="url"
          fullWidth
          variant="outlined"
          value={imageUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          sx={{ mt: 1 }}
          helperText="Enter the URL of the image"
        />
        {imageUrl && (
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Preview:</Typography>
            <Box
              sx={{
                width: '100%',
                height: 200,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt="Preview"
                onError={(e) => { e.target.style.display = 'none'; }}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  zIndex: -1,
                }}
              >
                <Typography variant="body2" color="text.secondary">Invalid image URL</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
