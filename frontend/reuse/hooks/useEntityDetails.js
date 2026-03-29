import { useState, useEffect } from 'react';

/**
 * useEntityDetails - Custom hook for managing entity details page state and data
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.entityId - Entity ID
 * @param {Function} config.fetchEntity - Function to fetch entity (id) => Promise<Object>
 * @param {Function} config.updateEntity - Function to update entity (id, data) => Promise<Object>
 * @param {Function} config.updateEntityImage - Function to update entity image (id, imageType, imageUrl) => Promise
 * @param {Function} config.fetchDropdownData - Function to fetch dropdown data () => Promise<Object>
 * @param {Function} config.fetchTabData - Function to fetch tab data (id, tabIndex) => Promise<any>
 * @param {Function} config.mapEntityToFormData - Function to map entity to form data (entity) => Object
 * @param {Function} config.onError - Error handler callback
 * @param {Function} config.onSaveSuccess - Success handler callback
 * 
 * @returns {Object} - Entity details state and handlers
 */
const useEntityDetails = ({
  entityId,
  fetchEntity,
  updateEntity = null,
  updateEntityImage = null,
  fetchDropdownData = null,
  fetchTabData = null,
  mapEntityToFormData = (entity) => ({ ...entity }),
  onError = null,
  onSaveSuccess = null,
}) => {
  // Entity state
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({});
  const [formChanged, setFormChanged] = useState(false);
  
  // Image state
  const [imageErrors, setImageErrors] = useState({});
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  
  // Dropdown data state
  const [dropdownData, setDropdownData] = useState({});
  const [dropdownLoading, setDropdownLoading] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load entity
  const loadEntity = async () => {
    if (!entityId) return;
    
    try {
      setLoading(true);
      setError(null);
      const entityData = await fetchEntity(entityId);
      setEntity(entityData);
      
      // Map entity to form data
      const mappedFormData = mapEntityToFormData(entityData);
      setFormData(mappedFormData);
      setFormChanged(false);
    } catch (err) {
      console.error('Failed to load entity:', err);
      const errorMsg = err.message || 'Failed to load entity';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load dropdown data
  const loadDropdownData = async () => {
    if (!fetchDropdownData) return;
    
    try {
      setDropdownLoading(true);
      const data = await fetchDropdownData();
      setDropdownData(data);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    } finally {
      setDropdownLoading(false);
    }
  };

  // Load tab data
  const loadTabData = async (tabIndex) => {
    if (!entityId || !fetchTabData) return;
    
    try {
      setTabLoading(prev => ({ ...prev, [tabIndex]: true }));
      const data = await fetchTabData(entityId, tabIndex);
      setTabData(prev => ({ ...prev, [tabIndex]: data }));
    } catch (err) {
      console.error(`Failed to load tab ${tabIndex} data:`, err);
    } finally {
      setTabLoading(prev => ({ ...prev, [tabIndex]: false }));
    }
  };

  // Handle form change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setFormChanged(true);
  };

  // Save entity
  const saveEntity = async () => {
    if (!entityId || !updateEntity) {
      console.warn('updateEntity function not provided');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await updateEntity(entityId, formData);
      
      setSnackbar({
        open: true,
        message: 'Entity updated successfully',
        severity: 'success',
      });
      
      setFormChanged(false);
      onSaveSuccess?.();
      
      // Reload entity to get updated data
      await loadEntity();
    } catch (err) {
      console.error('Failed to save entity:', err);
      const errorMsg = err.message || 'Failed to save entity';
      setError(errorMsg);
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Save image
  const saveImage = async (imageType, imageUrl) => {
    if (!entityId || !updateEntityImage) {
      console.warn('updateEntityImage function not provided');
      return;
    }
    
    try {
      await updateEntityImage(entityId, imageType, imageUrl);
      
      setSnackbar({
        open: true,
        message: 'Image updated successfully',
        severity: 'success',
      });
      
      // Reload entity to get updated image
      await loadEntity();
    } catch (err) {
      console.error('Failed to save image:', err);
      const errorMsg = err.message || 'Failed to save image';
      setError(errorMsg);
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error',
      });
      onError?.(errorMsg);
    }
  };

  // Handle tab change
  const handleTabChange = (newTabIndex) => {
    setActiveTab(newTabIndex);
    // Load tab data if not already loaded
    if (!tabData[newTabIndex] && fetchTabData) {
      loadTabData(newTabIndex);
    }
  };

  // Load entity on mount or when ID changes
  useEffect(() => {
    if (entityId) {
      loadEntity();
      if (fetchDropdownData) {
        loadDropdownData();
      }
    }
  }, [entityId]);

  // Load tab data when tab changes
  useEffect(() => {
    if (entityId && activeTab !== null && fetchTabData) {
      loadTabData(activeTab);
    }
  }, [entityId, activeTab]);

  return {
    // Entity data
    entity,
    loading,
    error,
    
    // Form
    formData,
    setFormData,
    handleFormChange,
    formChanged,
    
    // Images
    imageErrors,
    setImageErrors,
    
    // Tabs
    activeTab,
    setActiveTab: handleTabChange,
    tabData,
    tabLoading,
    loadTabData,
    
    // Dropdown data
    dropdownData,
    dropdownLoading,
    loadDropdownData,
    
    // Snackbar
    snackbar,
    setSnackbar,
    
    // Actions
    loadEntity,
    saveEntity,
    saveImage,
    reload: () => loadEntity(),
  };
};

export default useEntityDetails;
