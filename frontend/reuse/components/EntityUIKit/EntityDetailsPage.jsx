import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
} from '@mui/material';
import EntityPageHeader from './EntityPageHeader';
import EntityMediaCard from './EntityMediaCard';
import EntityFormSection from './EntityFormSection';
import EntityTabsSection from './EntityTabsSection';
import EntityImageDialog from './EntityImageDialog';
import LoadingSpinner from '../../LoadingSpinner';
import Alert from '../../Alert';

/**
 * EntityDetailsPage - Complete reusable details page component for entities
 * 
 * @param {Object} props
 * @param {string} props.entityName - Entity name (e.g., 'Athlete', 'Competition')
 * @param {string} props.entityNamePlural - Plural form (default: entityName + 's')
 * @param {Object} props.entity - Entity data object
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {string} props.title - Page title (default: entity name)
 * @param {Array} props.images - Image configurations (see EntityMediaCard)
 * @param {Object} props.formData - Form data object
 * @param {Function} props.onFormChange - Form change handler
 * @param {Function} props.onSave - Save handler
 * @param {Array} props.formFields - Form field configurations (see EntityFormSection)
 * @param {Array} props.checkboxes - Checkbox configurations (see EntityFormSection)
 * @param {Object} props.actionButtons - Action buttons configuration (see EntityFormSection)
 * @param {Array} props.tabs - Tab configurations (see EntityTabsSection)
 * @param {number} props.activeTab - Active tab index
 * @param {Function} props.onTabChange - Tab change handler
 * @param {Function} props.onImageSave - Image save handler (imageType, imageUrl) => void
 * @param {string} props.listPath - Path to list page (default: '/entities')
 * @param {Object} props.sx - Additional styling
 */
const EntityDetailsPage = ({
  entityName = 'Entity',
  entityNamePlural,
  entity = null,
  loading = false,
  error = null,
  title,
  images = [],
  formData = {},
  onFormChange,
  onSave,
  formFields = [],
  checkboxes = [],
  actionButtons = null,
  tabs = [],
  activeTab = 0,
  onTabChange,
  onImageSave,
  listPath,
  sx = {},
}) => {
  const navigate = useNavigate();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageType, setEditingImageType] = useState(null);
  const pluralName = entityNamePlural || `${entityName}s`;

  const handleBack = () => {
    navigate(listPath || `/${pluralName.toLowerCase()}`);
  };

  const handleImageClick = (imageType) => {
    setEditingImageType(imageType);
    setImageDialogOpen(true);
  };

  const handleImageSave = (imageType, imageUrl) => {
    onImageSave?.(imageType, imageUrl);
    setImageDialogOpen(false);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setEditingImageType(null);
  };

  const pageTitle = title || (entity ? `${entity.name || entityName} Details` : `${entityName} Details`);

  if (loading && !entity) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  return (
    <Box sx={{
      height: '100%',
      overflow: 'auto',
      p: 3,
      backgroundColor: '#f5f5f5',
      ...sx,
    }}>
      {/* Page Header */}
      <EntityPageHeader
        breadcrumbItems={[
          { label: 'Entities', path: '/' },
          { label: pluralName, path: `/${pluralName.toLowerCase()}` },
          { label: 'Edit' }
        ]}
        title={pageTitle}
        onBack={handleBack}
      />

      {/* General Details Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Media Card */}
        {images.length > 0 && (
          <Box sx={{ width: { xs: '100%', md: '25%' } }}>
            <EntityMediaCard
              images={images}
              onImageClick={handleImageClick}
            />
          </Box>
        )}

        {/* Form Section */}
        <Box sx={{ flex: 1 }}>
          <EntityFormSection
            title="General Details"
            formData={formData}
            onFormChange={onFormChange}
            fields={formFields}
            checkboxes={checkboxes}
            actionButtons={actionButtons}
          />
        </Box>
      </Box>

      {/* Tabs Section */}
      {tabs.length > 0 && (
        <EntityTabsSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          tabs={tabs}
        />
      )}

      {/* Image Edit Dialog */}
      <EntityImageDialog
        open={imageDialogOpen}
        onClose={handleCloseImageDialog}
        onSave={handleImageSave}
        imageTypes={images}
      />
    </Box>
  );
};

export default EntityDetailsPage;
