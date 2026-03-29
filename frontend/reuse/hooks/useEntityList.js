import { useState, useEffect, useMemo } from 'react';

/**
 * useEntityList - Custom hook for managing entity list page state and data
 * 
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchEntities - Function to fetch entities (filters) => Promise<Array>
 * @param {Function} config.fetchDropdownData - Function to fetch dropdown data () => Promise<Object>
 * @param {Object} config.initialFilters - Initial filter values
 * @param {boolean} config.autoLoad - Whether to auto-load on mount (default: true)
 * @param {Function} config.onError - Error handler callback
 * 
 * @returns {Object} - Entity list state and handlers
 */
const useEntityList = ({
  fetchEntities,
  fetchDropdownData = null,
  initialFilters = {},
  autoLoad = true,
  onError = null,
}) => {
  // Data state
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState(initialFilters);
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Dropdown data state
  const [dropdownData, setDropdownData] = useState({});
  const [dropdownLoading, setDropdownLoading] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    rowsPerPage: 25,
    totalRows: 0,
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: 'asc',
  });
  
  // Group state
  const [groupByField, setGroupByField] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // Column filter state
  const [columnFilters, setColumnFilters] = useState({});
  
  // Selection state
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load dropdown data
  const loadDropdownData = async () => {
    if (!fetchDropdownData) return;
    
    try {
      setDropdownLoading(true);
      const data = await fetchDropdownData();
      setDropdownData(data);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      const errorMsg = err.message || 'Failed to load dropdown data';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setDropdownLoading(false);
    }
  };

  // Search entities
  const searchEntities = async (overrideShowDeleted = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentShowDeleted = overrideShowDeleted !== null 
        ? overrideShowDeleted 
        : showDeleted;
      
      // Build filter object
      const searchFilters = {
        ...filters,
        showDeleted: currentShowDeleted,
      };
      
      // Remove undefined values (but keep showDeleted)
      Object.keys(searchFilters).forEach(key => {
        if (key !== 'showDeleted' && searchFilters[key] === undefined) {
          delete searchFilters[key];
        }
        // Remove empty arrays
        if (Array.isArray(searchFilters[key]) && searchFilters[key].length === 0) {
          delete searchFilters[key];
        }
        // Remove empty strings
        if (typeof searchFilters[key] === 'string' && searchFilters[key].trim() === '') {
          delete searchFilters[key];
        }
      });
      
      const entitiesData = await fetchEntities(searchFilters);
      setEntities(entitiesData);
      
      // Count visible entities for pagination
      const visibleEntities = currentShowDeleted
        ? entitiesData
        : entitiesData.filter(e => !e.IS_DELETED);
      
      setPagination(prev => ({
        ...prev,
        totalRows: visibleEntities.length,
        page: 0,
      }));
    } catch (err) {
      console.error('Failed to search entities:', err);
      const errorMsg = err.message || 'Failed to search entities';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(initialFilters);
    setColumnFilters({});
  };

  // Filtered and sorted entities
  const filteredAndSortedEntities = useMemo(() => {
    let filtered = [...entities];
    
    // Filter out deleted if needed
    if (!showDeleted) {
      filtered = filtered.filter(e => !e.IS_DELETED);
    }
    
    // Apply column-level filters
    Object.keys(columnFilters).forEach(columnField => {
      const filterValue = columnFilters[columnField];
      if (filterValue && filterValue.trim() !== '') {
        const searchTerm = filterValue.toLowerCase().trim();
        filtered = filtered.filter(row => {
          const cellValue = row[columnField];
          if (cellValue === null || cellValue === undefined) {
            return false;
          }
          const cellValueStr = String(cellValue).toLowerCase();
          return cellValueStr.includes(searchTerm);
        });
      }
    });
    
    // Apply sorting
    if (sortConfig.field) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [entities, columnFilters, sortConfig, showDeleted]);

  // Load dropdown data on mount
  useEffect(() => {
    if (fetchDropdownData) {
      loadDropdownData();
    }
  }, []);

  // Auto-load entities on mount or when filters change
  useEffect(() => {
    if (autoLoad) {
      searchEntities();
    }
  }, [filters, showDeleted]);

  return {
    // Data
    entities: filteredAndSortedEntities,
    loading,
    error,
    
    // Filters
    filters,
    setFilters,
    handleFilterChange,
    clearFilters,
    showDeleted,
    setShowDeleted,
    
    // Dropdown data
    dropdownData,
    dropdownLoading,
    loadDropdownData,
    
    // Pagination
    pagination,
    setPagination,
    
    // Sort
    sortConfig,
    setSortConfig,
    
    // Group
    groupByField,
    setGroupByField,
    expandedGroups,
    setExpandedGroups,
    
    // Column filters
    columnFilters,
    setColumnFilters,
    
    // Selection
    selectedRows,
    setSelectedRows,
    
    // Edit mode
    isEditMode,
    setIsEditMode,
    pendingChanges,
    setPendingChanges,
    
    // Snackbar
    snackbar,
    setSnackbar,
    
    // Actions
    searchEntities,
    reload: () => searchEntities(),
  };
};

export default useEntityList;
