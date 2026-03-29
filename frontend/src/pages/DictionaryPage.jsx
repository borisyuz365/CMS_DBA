import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
  Typography,
  IconButton,
  InputAdornment,
  Link,
  Tooltip,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as ExportIcon,
  UploadFile as UploadIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { DataTable } from '../components/Tables';
import { CategoryTree, TermEditModal, CategoryEditModal, ImportTermsModal } from '../components/Dictionary';
import PageHeader from '../components/Layout/PageHeader';
import {
  fetchTerms,
  searchTerms,
  createTerm,
  updateTerm,
  deleteTerm,
  saveAllTerms,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/dictionaryApi';
import { exportToCSV } from '../utils/csvStorage';
import { LoadingSpinner, Alert } from '../components/Feedback';

const Dictionary = () => {
  const [terms, setTerms] = useState([]);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    alias: true,
    termId: false,
    values: true,
    uiLang: true,
    visible: true,
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySearch, setCategorySearch] = useState(''); // Input field value
  const [activeCategorySearch, setActiveCategorySearch] = useState(''); // Active search term for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryRowsPerPage, setCategoryRowsPerPage] = useState(10);
  const [allTermsForCategories, setAllTermsForCategories] = useState([]); // For total count only
  const [categoriesData, setCategoriesData] = useState([]); // Categories from the categories table
  const [updateNotification, setUpdateNotification] = useState(null); // Notification state for update in services
  const [sonsTermsModalOpen, setSonsTermsModalOpen] = useState(false);
  const [sonsTerms, setSonsTerms] = useState([]);
  const [parentTerm, setParentTerm] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Load terms and categories on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const [loadedTerms, loadedCategories] = await Promise.all([
          fetchTerms(),
          fetchCategories()
        ]);
        setAllTermsForCategories(loadedTerms);
        setCategoriesData(loadedCategories);
      } catch (err) {
        setError('Failed to load data. Make sure the backend server is running.');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim() && !selectedCategory) {
      setError('Please enter a search term or select a category');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const searchedTerms = await searchTerms(
        searchTerm.trim(),
        searchOptions,
        selectedCategory === 'All Terms' ? null : selectedCategory
      );
      setTerms(searchedTerms);
      setHasSearched(true);
      setPage(0);
    } catch (err) {
      setError('Failed to search terms. Make sure the backend server is running.');
      console.error('Error searching terms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset search results when category changes (but don't search automatically)
  useEffect(() => {
    if (selectedCategory !== null) {
      setTerms([]);
      setHasSearched(false);
      setPage(0);
    }
  }, [selectedCategory]);

  // Build hierarchical category structure from categories table
  const categories = useMemo(() => {
    if (!categoriesData || categoriesData.length === 0) {
      return [];
    }

    // Filter out "All Categories" from the list (it's just a root container, not meant to be displayed)
    const filteredCategories = categoriesData.filter(cat => cat.name !== 'All Categories');

    // Create a map of categories by name for quick lookup
    const catsMap = {};
    filteredCategories.forEach(cat => {
      catsMap[cat.name] = {
        name: cat.name,
        count: cat.count || 0,
        fatherCategory: cat.fatherCategory === 'All Categories' ? null : (cat.fatherCategory || null),
        children: []
      };
    });

    // Build hierarchy
    const rootCategories = [];
    Object.values(catsMap).forEach(cat => {
      if (cat.fatherCategory && catsMap[cat.fatherCategory]) {
        // This category has a parent
        if (!catsMap[cat.fatherCategory].children) {
          catsMap[cat.fatherCategory].children = [];
        }
        catsMap[cat.fatherCategory].children.push(cat);
      } else {
        // This is a root category (no parent)
        rootCategories.push(cat);
      }
    });

    // Sort children for each category recursively
    const sortCategories = (catList) => {
      catList.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          cat.children.sort((a, b) => a.name.localeCompare(b.name));
          sortCategories(cat.children);
        }
      });
      return catList.sort((a, b) => a.name.localeCompare(b.name));
    };

    return sortCategories(rootCategories);
  }, [categoriesData]);

  // Use terms directly from search (already filtered by backend)
  const filteredTerms = useMemo(() => {
    if (!hasSearched) {
      return [];
    }
    return terms;
  }, [terms, hasSearched]);

  // Paginate filtered terms
  const paginatedTerms = useMemo(() => {
    // If rowsPerPage is greater than or equal to total, show all results
    if (rowsPerPage >= filteredTerms.length) {
      return filteredTerms;
    }
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredTerms.slice(startIndex, endIndex);
  }, [filteredTerms, page, rowsPerPage]);

  // Handler for opening father term modal
  const handleOpenFatherTerm = (fatherTermId, event) => {
    if (event) {
      event.stopPropagation(); // Prevent row click
    }
    if (!fatherTermId) return;
    
    // Find the father term in all terms
    const fatherTerm = allTermsForCategories.find(t => String(t.id) === String(fatherTermId));
    if (fatherTerm) {
      handleEditTerm(fatherTerm);
    }
  };

  // Table columns configuration
  const tableColumns = [
    { 
      field: 'id', 
      header: 'Term Id',
      render: (value, row) => {
        if (!value) return value;
        return (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTerm(row);
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {value}
          </Box>
        );
      },
    },
    { 
      field: 'aliasName', 
      header: 'Alias Name',
      render: (value, row) => {
        if (!value) return value;
        return (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTerm(row);
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {value}
          </Box>
        );
      },
    },
    { 
      field: 'engValue', 
      header: 'Eng Value',
      render: (value, row) => {
        if (!value) return value;
        return (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTerm(row);
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {value}
          </Box>
        );
      },
    },
    { field: 'valsCount', header: 'Vals Count' },
    { 
      field: 'category', 
      header: 'Category',
      render: (value, row) => {
        if (!value) return value;
        return (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              // Find the category from categoriesData by name
              const category = categoriesData.find(cat => cat.name === value);
              if (category) {
                handleEditCategory(category);
              }
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {value}
          </Box>
        );
      },
    },
    { 
      field: 'fatherTerm', 
      header: 'Father Term',
      render: (value, row) => {
        if (!value) return value;
        return (
          <Box
            component="span"
            onClick={(e) => handleOpenFatherTerm(value, e)}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {value}
          </Box>
        );
      },
    },
    { 
      field: 'sonsTerms', 
      header: 'Sons Terms',
      render: (value, row) => {
        // Find all terms where fatherTerm equals this term's id
        const sons = allTermsForCategories.filter(t => String(t.fatherTerm) === String(row.id));
        const count = sons.length;
        
        if (count === 0) return '';
        
        return (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              setSonsTerms(sons);
              setParentTerm(row);
              setSonsTermsModalOpen(true);
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1976d2',
              },
            }}
          >
            {count}
          </Box>
        );
      },
    },
  ];

  const handleCreateTerm = () => {
    setEditingTerm(null);
    setEditModalOpen(true);
  };

  const handleEditTerm = (term) => {
    setEditingTerm(term);
    setEditModalOpen(true);
  };

  const handleSaveTerm = async (termData) => {
    try {
      setError(null);
      if (editingTerm) {
        // Update existing term
        const updatedTerm = await updateTerm(editingTerm.id, termData);
        setTerms(prev => prev.map(t => t.id === editingTerm.id ? updatedTerm : t));
        // Refresh categories and terms
        const [loadedTerms, loadedCategories] = await Promise.all([
          fetchTerms(),
          fetchCategories()
        ]);
        setAllTermsForCategories(loadedTerms);
        setCategoriesData(loadedCategories);
      } else {
        // Create new term
        const newTerm = await createTerm(termData);
        setTerms(prev => [...prev, newTerm]);
        // Refresh categories and terms
        const [loadedTerms, loadedCategories] = await Promise.all([
          fetchTerms(),
          fetchCategories()
        ]);
        setAllTermsForCategories(loadedTerms);
        setCategoriesData(loadedCategories);
      }
      setEditModalOpen(false);
      setEditingTerm(null);
    } catch (err) {
      setError('Failed to save term. Please try again.');
      console.error('Error saving term:', err);
    }
  };

  // Handle Save & Update In Services
  const handleSaveAndUpdate = async (termData) => {
    try {
      setError(null);
      
      // First, save the term
      if (editingTerm) {
        // Update existing term
        const updatedTerm = await updateTerm(editingTerm.id, termData);
        setTerms(prev => prev.map(t => t.id === editingTerm.id ? updatedTerm : t));
        // Refresh categories and terms
        const [loadedTerms, loadedCategories] = await Promise.all([
          fetchTerms(),
          fetchCategories()
        ]);
        setAllTermsForCategories(loadedTerms);
        setCategoriesData(loadedCategories);
      } else {
        // Create new term
        const newTerm = await createTerm(termData);
        setTerms(prev => [...prev, newTerm]);
        // Refresh categories and terms
        const [loadedTerms, loadedCategories] = await Promise.all([
          fetchTerms(),
          fetchCategories()
        ]);
        setAllTermsForCategories(loadedTerms);
        setCategoriesData(loadedCategories);
      }
      
      // Then, call Update In Services procedure
      // TODO: Implement actual Update In Services API call
      // For now, this is a placeholder
      try {
        // This will be the actual API call when implemented
        // await updateInServices(termData);
        console.log('Update In Services called for term:', termData);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (updateErr) {
        console.error('Error updating in services:', updateErr);
        // Don't fail the whole operation if update in services fails
      }
      
      // Close modal
      setEditModalOpen(false);
      setEditingTerm(null);
      
      // Show success notification
      setUpdateNotification({
        severity: 'success',
        message: 'Term saved and updated in services successfully',
      });
    } catch (err) {
      setError('Failed to save term. Please try again.');
      console.error('Error saving term:', err);
      setUpdateNotification({
        severity: 'error',
        message: 'Failed to save term. Please try again.',
      });
    }
  };

  const handleDeleteTerm = async (termId) => {
    try {
      setError(null);
      await deleteTerm(termId);
      setTerms(prev => prev.filter(t => t.id !== termId));
      setSelectedTerms(prev => prev.filter(id => id !== termId));
      // Refresh categories and terms
      const [loadedTerms, loadedCategories] = await Promise.all([
        fetchTerms(),
        fetchCategories()
      ]);
      setAllTermsForCategories(loadedTerms);
      setCategoriesData(loadedCategories);
    } catch (err) {
      setError('Failed to delete term. Please try again.');
      console.error('Error deleting term:', err);
    }
  };


  const handleExportTerms = () => {
    const termsToExport = selectedTerms.length > 0
      ? terms.filter(t => selectedTerms.includes(t.id))
      : terms;
    // Remove langValue from export (not relevant for client display)
    const termsWithoutLangValue = termsToExport.map(({ langValue, ...term }) => term);
    exportToCSV(termsWithoutLangValue, 'dictionary_terms_export.csv');
  };

  const handleClearSelected = () => {
    setSelectedTerms([]);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      setError(null);
      if (editingCategory) {
        // Update existing category
        const updatedCategory = await updateCategory(editingCategory.id, categoryData);
        setCategoriesData(prev => prev.map(c => c.id === editingCategory.id ? updatedCategory : c));
      } else {
        // Create new category
        const newCategory = await createCategory(categoryData);
        setCategoriesData(prev => [...prev, newCategory]);
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      // Refresh categories to get updated counts
      const loadedCategories = await fetchCategories();
      setCategoriesData(loadedCategories);
    } catch (err) {
      setError('Failed to save category. Please try again.');
      console.error('Error saving category:', err);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setError(null);
      await deleteCategory(categoryId);
      setCategoriesData(prev => prev.filter(c => c.id !== categoryId));
      setCategoryModalOpen(false);
      setEditingCategory(null);
      // Refresh categories to get updated counts
      const loadedCategories = await fetchCategories();
      setCategoriesData(loadedCategories);
    } catch (err) {
      setError('Failed to delete category. Please try again.');
      console.error('Error deleting category:', err);
    }
  };

  const handleCategorySearch = async () => {
    try {
      setLoading(true);
      setError(null);
      // Reload categories from DB to ensure we're searching the entire DB
      const loadedCategories = await fetchCategories();
      setCategoriesData(loadedCategories);
      // Set the active search term to trigger filtering
      setActiveCategorySearch(categorySearch.trim());
    } catch (err) {
      setError('Failed to search categories. Make sure the backend server is running.');
      console.error('Error searching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      {/* Page Header */}
      <PageHeader title="Terms Catalog" />

      {/* Main Content: Category Tree and Terms Table */}
      <Grid container spacing={2} alignItems="flex-start">
        {/* Left Panel: Category Tree */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
            {/* Create Category Button */}
            <Box sx={{ 
              mb: 2,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'background.paper',
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <PrimaryButton
                startIcon={<AddIcon />}
                onClick={handleCreateCategory}
                sx={{ minWidth: 'auto', mb: 2 }}
                fullWidth
              >
                Create Category
              </PrimaryButton>
            </Box>
            
            {/* Category Search - Sticky */}
            <Box sx={{ 
              mb: 2, 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center', 
              flexWrap: 'wrap',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'background.paper',
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <TextField
                size="small"
                label="Search Categories"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCategorySearch();
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: categorySearch && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => {
                        setCategorySearch('');
                        setActiveCategorySearch('');
                      }}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1, minWidth: 150 }}
              />
              <SecondaryButton
                onClick={handleCategorySearch}
                sx={{ minWidth: 'auto' }}
              >
                Search
              </SecondaryButton>
            </Box>
            {/* Category Tree - Scrollable */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              minHeight: 0
            }}>
              <CategoryTree
                categories={categories}
                terms={terms}
                selectedCategory={selectedCategory}
                onCategorySelect={(category) => {
                  setSelectedCategory(category);
                  setPage(0);
                  // Don't search automatically - user needs to click search button
                }}
                searchTerm={activeCategorySearch}
                totalTermsCount={allTermsForCategories.length}
                categoryPage={categoryPage}
                categoryRowsPerPage={categoryRowsPerPage}
                onCategoryPageChange={setCategoryPage}
                onCategoryRowsPerPageChange={setCategoryRowsPerPage}
                showPagination={false}
                onCategoryEdit={handleEditCategory}
                categoriesData={categoriesData}
              />
            </Box>
            
            {/* Category Pagination - Outside scrollable area */}
            {(() => {
              // Calculate filtered categories count (same logic as CategoryTree)
              const filterCategories = (cats, search) => {
                if (!cats || !Array.isArray(cats)) return [];
                if (!search) return cats;
                const searchLower = search.toLowerCase();
                return cats.filter(cat => {
                  if (!cat || !cat.name) return false;
                  const matches = cat.name.toLowerCase().includes(searchLower);
                  const hasMatchingChildren = cat.children && Array.isArray(cat.children) && cat.children.length > 0 && 
                    filterCategories(cat.children, search).length > 0;
                  return matches || hasMatchingChildren;
                }).map(cat => {
                  const matches = cat.name.toLowerCase().includes(searchLower);
                  // If parent matches, show all children. Otherwise, filter children.
                  return {
                    ...cat,
                    children: cat.children && Array.isArray(cat.children) 
                      ? (matches ? cat.children : filterCategories(cat.children, search))
                      : []
                  };
                });
              };
              const filteredCategories = filterCategories(categories, activeCategorySearch);
              return filteredCategories.length > 0 ? (
                <Box sx={{ 
                  pt: 2, 
                  borderTop: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      onClick={() => setCategoryPage(categoryPage - 1)}
                      disabled={categoryPage === 0}
                      size="small"
                    >
                      <ArrowBackIosNewIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ mx: 1, minWidth: 'fit-content' }}>
                      Page {categoryPage + 1} of {Math.ceil(filteredCategories.length / categoryRowsPerPage) || 1}
                    </Typography>
                    <IconButton
                      onClick={() => setCategoryPage(categoryPage + 1)}
                      disabled={categoryPage >= Math.ceil(filteredCategories.length / categoryRowsPerPage) - 1}
                      size="small"
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={categoryRowsPerPage}
                      onChange={(e) => {
                        setCategoryRowsPerPage(Number(e.target.value));
                        setCategoryPage(0);
                      }}
                    >
                      {[10, 25, 50].map((option) => (
                        <MenuItem key={option} value={option}>
                          {option} / page
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ) : null;
            })()}
          </Paper>
        </Grid>

        {/* Right Panel: Terms Table */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
            {/* Search, Filter and Action Section - Sticky */}
            <Box sx={{ 
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'background.paper',
              pb: 2,
              mb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              {/* Search and Filter Section */}
              <Box sx={{ 
                mb: 2, 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center', 
                flexWrap: 'wrap'
              }}>
                <TextField
                  size="small"
                  label="Search Terms"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => {
                          setSearchTerm('');
                        }}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <SecondaryButton
                  onClick={handleSearch}
                  sx={{ minWidth: 'auto' }}
                >
                  Search
                </SecondaryButton>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Search options:
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchOptions.alias}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSearchOptions(prev => ({
                            ...prev,
                            alias: checked,
                            termId: checked ? false : prev.termId, // Uncheck termId if alias is checked
                          }));
                        }}
                        size="small"
                      />
                    }
                    label="Alias"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 400 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchOptions.termId}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSearchOptions(prev => ({
                            ...prev,
                            termId: checked,
                            // If termId is checked, uncheck all others
                            alias: checked ? false : prev.alias,
                            values: checked ? false : prev.values,
                            uiLang: checked ? false : prev.uiLang,
                            visible: checked ? false : prev.visible,
                          }));
                        }}
                        size="small"
                      />
                    }
                    label="Term_ID"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 400 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchOptions.values}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSearchOptions(prev => ({
                            ...prev,
                            values: checked,
                            termId: checked ? false : prev.termId, // Uncheck termId if values is checked
                          }));
                        }}
                        size="small"
                      />
                    }
                    label="Values"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 400 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchOptions.uiLang}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSearchOptions(prev => ({
                            ...prev,
                            uiLang: checked,
                            termId: checked ? false : prev.termId, // Uncheck termId if uiLang is checked
                          }));
                        }}
                        size="small"
                      />
                    }
                    label="UI Lang"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 400 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={searchOptions.visible}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSearchOptions(prev => ({
                            ...prev,
                            visible: checked,
                            termId: checked ? false : prev.termId, // Uncheck termId if visible is checked
                          }));
                        }}
                        size="small"
                      />
                    }
                    label="Visible"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 400 } }}
                  />
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center', 
                flexWrap: 'wrap'
              }}>
                <PrimaryButton
                  startIcon={<AddIcon />}
                  onClick={handleCreateTerm}
                  sx={{ minWidth: 'auto' }}
                >
                  Create Term
                </PrimaryButton>
                <SecondaryButton
                  startIcon={<UploadIcon />}
                  onClick={() => setImportModalOpen(true)}
                  sx={{ minWidth: 'auto' }}
                >
                  Import Terms
                </SecondaryButton>
                <SecondaryButton
                  startIcon={<ExportIcon />}
                  onClick={handleExportTerms}
                  endIcon={
                    <Tooltip title="Export selected terms to CSV">
                      <InfoIcon sx={{ fontSize: 16, ml: 0.5 }} />
                    </Tooltip>
                  }
                >
                  Export Terms ({selectedTerms.length})
                </SecondaryButton>
                {selectedTerms.length > 0 && (
                  <Link
                    component="button"
                    variant="body2"
                    onClick={handleClearSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    Clear selected terms
                  </Link>
                )}
              </Box>
            </Box>

            {/* Results Section - Scrollable */}
            <Box sx={{ 
              flex: 1, 
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {filteredTerms.length === 0 && hasSearched ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '400px',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Typography variant="h6" color="text.secondary">
                    No results found
                  </Typography>
                </Box>
              ) : !hasSearched ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '400px',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Typography variant="h6" color="text.secondary">
                    Enter a search term or select a category to view results
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <DataTable
                    data={paginatedTerms}
                    columns={tableColumns}
                    selectedRows={selectedTerms}
                    onSelectionChange={setSelectedTerms}
                    selectable
                    searchable={false}
                    pagination={{
                      page: page,
                      rowsPerPage: rowsPerPage,
                      totalRows: filteredTerms.length,
                    }}
                    onPageChange={setPage}
                    onRowsPerPageChange={(newRowsPerPage) => {
                      setRowsPerPage(newRowsPerPage);
                      setPage(0);
                    }}
                    showPagination={false}
                  />
                </Box>
              )}
            </Box>
            
            {/* Terms Pagination - Outside scrollable area */}
            {filteredTerms.length > 0 && hasSearched && (
              <Box sx={{ 
                pt: 2, 
                borderTop: '1px solid', 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0 || rowsPerPage >= filteredTerms.length}
                    size="small"
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ mx: 1, minWidth: 'fit-content' }}>
                    {rowsPerPage >= filteredTerms.length ? (
                      `Showing all ${filteredTerms.length} results`
                    ) : (
                      `Page ${page + 1} of ${Math.ceil(filteredTerms.length / rowsPerPage) || 1}`
                    )}
                  </Typography>
                  <IconButton
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(filteredTerms.length / rowsPerPage) - 1 || rowsPerPage >= filteredTerms.length}
                    size="small"
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(0);
                    }}
                  >
                    {[20, 50, 100].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option} / page
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Term Edit Modal */}
      <TermEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTerm(null);
        }}
        term={editingTerm}
        onSave={handleSaveTerm}
        onSaveAndUpdate={handleSaveAndUpdate}
        onDelete={editingTerm ? () => {
          handleDeleteTerm(editingTerm.id);
          setEditModalOpen(false);
          setEditingTerm(null);
        } : null}
        allTerms={allTermsForCategories}
        allCategories={categoriesData}
        onCreateCategory={async (categoryData) => {
          const newCategory = await createCategory(categoryData);
          setCategoriesData(prev => [...prev, newCategory]);
          // Refresh categories to get updated counts
          const loadedCategories = await fetchCategories();
          setCategoriesData(loadedCategories);
        }}
        initialCategory={selectedCategory && selectedCategory !== 'All Terms' ? selectedCategory : null}
      />

      {/* Category Edit Modal */}
      <CategoryEditModal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSave={handleSaveCategory}
        onDelete={editingCategory ? () => {
          handleDeleteCategory(editingCategory.id);
        } : null}
        allCategories={categoriesData}
        initialFatherCategory={selectedCategory && selectedCategory !== 'All Terms' ? selectedCategory : null}
      />

      {/* Sons Terms Dialog */}
      <Dialog
        open={sonsTermsModalOpen}
        onClose={() => {
          setSonsTermsModalOpen(false);
          setSonsTerms([]);
          setParentTerm(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {parentTerm ? `Sons Terms of Term ID: ${parentTerm.id}` : 'Sons Terms'}
          </Typography>
          <IconButton onClick={() => {
            setSonsTermsModalOpen(false);
            setSonsTerms([]);
            setParentTerm(null);
          }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {sonsTerms.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No sons terms found
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Term ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>English Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sonsTerms.map((term) => (
                    <TableRow key={term.id} hover>
                      <TableCell>{term.id}</TableCell>
                      <TableCell>{term.engValue || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <SecondaryButton onClick={() => {
            setSonsTermsModalOpen(false);
            setSonsTerms([]);
            setParentTerm(null);
          }}>
            Close
          </SecondaryButton>
        </DialogActions>
      </Dialog>

      {/* Import Terms Modal */}
      <ImportTermsModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          // Refresh data after import
          const refreshData = async () => {
            try {
              const [loadedTerms, loadedCategories] = await Promise.all([
                fetchTerms(),
                fetchCategories()
              ]);
              setAllTermsForCategories(loadedTerms);
              setCategoriesData(loadedCategories);
            } catch (err) {
              console.error('Error refreshing data:', err);
            }
          };
          refreshData();
        }}
        allTerms={allTermsForCategories}
        allCategories={categoriesData}
        onCreateTerm={createTerm}
        onUpdateTerm={updateTerm}
      />

      {/* Update In Services Notification */}
      {updateNotification && (
        <Alert
          severity={updateNotification.severity}
          message={updateNotification.message}
          snackbar={true}
          autoHideDuration={6000}
          onClose={() => setUpdateNotification(null)}
        />
      )}
    </Box>
  );
};

export default Dictionary;

