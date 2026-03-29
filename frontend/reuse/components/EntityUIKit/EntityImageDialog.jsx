import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';

/**
 * EntityImageDialog - Reusable image upload/edit dialog component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Handler for dialog close
 * @param {Function} props.onSave - Handler for save (imageType, imageUrl) => void
 * @param {Array} props.imageTypes - Array of image type configurations:
 *   [
 *     {
 *       type: 'club',
 *       label: 'Club Image',
 *       url: entity.CLUB_IMAGE_URL,
 *     }
 *   ]
 * @param {Object} props.sx - Additional styling
 */
const EntityImageDialog = ({
  open = false,
  onClose,
  onSave,
  imageTypes = [],
  sx = {},
}) => {
  const [activeImageTypeIndex, setActiveImageTypeIndex] = useState(0);
  const [imageUrlValue, setImageUrlValue] = useState('');
  const [previewError, setPreviewError] = useState(false);

  const currentImageType = imageTypes[activeImageTypeIndex];

  useEffect(() => {
    if (open && currentImageType) {
      setImageUrlValue(currentImageType.url || '');
      setPreviewError(false);
    }
  }, [open, currentImageType]);

  const handleTabChange = (event, newValue) => {
    setActiveImageTypeIndex(newValue);
    const newImageType = imageTypes[newValue];
    setImageUrlValue(newImageType?.url || '');
    setPreviewError(false);
  };

  const handleSave = () => {
    if (currentImageType) {
      onSave?.(currentImageType.type, imageUrlValue);
    }
    handleClose();
  };

  const handleClose = () => {
    setImageUrlValue('');
    setPreviewError(false);
    onClose?.();
  };

  // If only one image type, don't show tabs
  const showTabs = imageTypes.length > 1;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={sx}
    >
      <DialogTitle>
        Upload / Edit Image
      </DialogTitle>
      <DialogContent>
        {/* Image Type Selection Tabs */}
        {showTabs && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
            <Tabs
              value={activeImageTypeIndex}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                },
                '& .Mui-selected': {
                  color: '#1976d2',
                },
              }}
            >
              {imageTypes.map((imageType, index) => (
                <Tab key={index} label={imageType.label} />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Image URL Input */}
        <TextField
          autoFocus
          margin="dense"
          label="Image URL"
          type="url"
          fullWidth
          variant="outlined"
          value={imageUrlValue}
          onChange={(e) => {
            setImageUrlValue(e.target.value);
            setPreviewError(false);
          }}
          placeholder="https://example.com/image.jpg"
          sx={{ mt: showTabs ? 0 : 1 }}
          helperText="Enter the URL of the image"
        />

        {/* Preview */}
        {imageUrlValue && !previewError && (
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Preview:
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 200,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
              }}
            >
              <img
                src={imageUrlValue}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
                onError={() => setPreviewError(true)}
              />
            </Box>
            {previewError && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Failed to load image preview
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: '#1976d2',
            textTransform: 'none',
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EntityImageDialog;
