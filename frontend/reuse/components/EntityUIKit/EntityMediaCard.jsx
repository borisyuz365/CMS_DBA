import React, { useState } from 'react';
import {
  Paper,
  Grid,
  Box,
  Avatar,
  Typography,
  Button,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * EntityMediaCard - Reusable media card component for entity details pages
 * 
 * @param {Object} props
 * @param {Array} props.images - Array of image configurations:
 *   [
 *     {
 *       type: 'club', // Unique identifier
 *       label: 'Club Image',
 *       url: entity.CLUB_IMAGE_URL,
 *       urlField: 'CLUB_IMAGE_URL', // Field name in entity object
 *     }
 *   ]
 * @param {Function} props.onImageClick - Handler for image upload click (imageType) => void
 * @param {Object} props.sx - Additional styling
 */
const EntityMediaCard = ({
  images = [],
  onImageClick,
  sx = {},
}) => {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (imageType) => {
    setImageErrors(prev => ({ ...prev, [imageType]: true }));
  };

  const handleUploadClick = (imageType) => {
    onImageClick?.(imageType);
  };

  return (
    <Paper
      sx={{
        p: 2,
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mb: 2,
        ...sx,
      }}
    >
      {/* Images Grid */}
      <Grid container spacing={2}>
        {images.map((imageConfig) => {
          const { type, label, url } = imageConfig;
          const hasError = imageErrors[type];
          const hasImage = url && !hasError;

          return (
            <Grid key={type} item xs={images.length === 1 ? 12 : 6}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Avatar
                  src={hasImage ? url : null}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: hasImage ? 'transparent' : '#f5f5f5',
                    border: '1px solid #e0e0e0',
                  }}
                  onError={() => handleImageError(type)}
                >
                  {!hasImage && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      No Image
                    </Typography>
                  )}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.75rem' }}>
                  {label}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Upload Button */}
      <Button
        variant="contained"
        size="small"
        startIcon={<CloudUploadIcon />}
        onClick={() => handleUploadClick(images[0]?.type)}
        sx={{
          backgroundColor: '#1976d2',
          textTransform: 'none',
          width: '100%',
        }}
      >
        Upload Image
      </Button>
    </Paper>
  );
};

export default EntityMediaCard;
