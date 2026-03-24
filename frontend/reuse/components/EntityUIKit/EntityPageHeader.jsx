import React from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Breadcrumb from '../../Breadcrumb';

/**
 * EntityPageHeader - Reusable page header component for entity pages
 * 
 * @param {Object} props
 * @param {Array} props.breadcrumbItems - Breadcrumb items array
 * @param {string} props.title - Page title
 * @param {Function} props.onBack - Handler for back button click
 * @param {string} props.backLabel - Back button label (default: 'Back to List')
 * @param {Object} props.sx - Additional styling
 */
const EntityPageHeader = ({
  breadcrumbItems = [],
  title,
  onBack,
  backLabel = 'Back to List',
  sx = {},
}) => {
  return (
    <>
      {/* Breadcrumb */}
      {breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} />
      )}

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, ...sx }}>
        {onBack && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            variant="outlined"
            sx={{
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            {backLabel}
          </Button>
        )}
        {title && (
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000' }}>
            {title}
          </Typography>
        )}
      </Box>
    </>
  );
};

export default EntityPageHeader;
