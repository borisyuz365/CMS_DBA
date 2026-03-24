import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Checkbox,
  Box,
  Typography,
  Autocomplete,
  Radio,
  FormControlLabel,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Grid,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { PrimaryButton, SecondaryButton } from '../Buttons';
import { FormField } from '../Forms';
import { fetchLanguages as fetchLanguagesApi } from '../../services/dictionaryApi';

// Status options for term values
const STATUS_OPTIONS = ['Approved', 'NotApproved', 'NotForUse', 'NotInLang'];

/**
 * TermEditModal - Modal for editing term details and values
 */
const TermEditModal = ({
  open,
  onClose,
  term,
  onSave,
  onSaveAndUpdate,
  onDelete,
  allTerms = [],
  allCategories = [],
  onCreateCategory,
  initialCategory = null,
}) => {
  const [termValues, setTermValues] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);
  
  // Details tab state
  const [id, setId] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [category, setCategory] = useState('');
  const [fatherTerm, setFatherTerm] = useState('');
  
  // Add value form state
  const [addValue, setAddValue] = useState('');
  const [addContext, setAddContext] = useState('');
  const [addLanguage, setAddLanguage] = useState('');
  const [onlyUiLang, setOnlyUiLang] = useState(true);
  
  // Filter state for values table (default: show only UI languages)
  const [showOnlyUILanguages, setShowOnlyUILanguages] = useState(true);
  
  // Edit value state
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef();
  
  // State for creating new category
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});
  
  // Father Term info state
  const [fatherTermInfo, setFatherTermInfo] = useState(null);
  
  // Debounce timer for father term lookup
  const fatherTermLookupTimerRef = useRef(null);
  
  // Languages state
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  // Load languages from API
  useEffect(() => {
    let cancelled = false;
    setLoadingLanguages(true);
    fetchLanguagesApi()
      .then((data) => {
        if (!cancelled) setLanguages(data);
      })
      .catch((error) => {
        console.error('Error loading languages:', error);
        if (!cancelled) {
          setLanguages([
            { id: 1, name: 'English', code: 'en', isUI: true },
            { id: 2, name: 'Hebrew', code: 'he', isUI: true },
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLanguages(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Get unique categories from both terms and categories DB
  const categories = React.useMemo(() => {
    const cats = new Set();
    // Add categories from terms
    allTerms.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    // Add categories from categories DB
    allCategories.forEach(cat => {
      if (cat.name) cats.add(cat.name);
    });
    return Array.from(cats).sort();
  }, [allTerms, allCategories]);


  // Initialize form when term changes
  useEffect(() => {
    if (open) {
      if (term) {
        // Editing existing term
        setId(term.id || '');
        setAliasName(term.aliasName || '');
        setCategory(term.category || '');
        setFatherTerm(term.fatherTerm || '');
        
        // Check if father term exists and set fatherTermInfo
        const fatherTermStr = term.fatherTerm ? String(term.fatherTerm).trim() : '';
        if (fatherTermStr !== '') {
          const fatherTermNum = Number(fatherTermStr);
          if (!isNaN(fatherTermNum) && Number.isInteger(fatherTermNum)) {
            // Compare both as numbers and as strings to handle type mismatches
            const foundTerm = allTerms.find(t => 
              t.id === fatherTermNum || 
              String(t.id) === String(fatherTermNum) ||
              Number(t.id) === fatherTermNum
            );
            if (foundTerm) {
              // Get English value from values array or fallback to engValue
              const defaultValue = foundTerm.values?.find(v => v.isDefault)?.value || 
                                 foundTerm.engValue || 
                                 '';
              setFatherTermInfo(defaultValue);
            } else {
              setFatherTermInfo(null);
            }
          } else {
            setFatherTermInfo(null);
          }
        } else {
          setFatherTermInfo(null);
        }
        
        // Load term values from new structure (values array) or fallback to old structure
        if (term.values && Array.isArray(term.values) && term.values.length > 0) {
          // New structure with values array
          // First pass: map all values
          const mappedValues = term.values.map((v, index) => {
            const lang = languages.find(l => l.id === v.languageId);
            return {
              id: index + 1,
              value: v.value || '',
              languageId: v.languageId,
              language: lang ? lang.name : 'Unknown',
              sequence: v.sequence || index + 1, // Use sequence from DB if exists
              status: v.status || 'Approved',
              context: v.context || '',
              block: v.block || false,
              isDefault: v.isDefault || false,
            };
          });
          
          // Second pass: recalculate sequences for each language to ensure correctness
          const valuesByLanguage = {};
          mappedValues.forEach(v => {
            if (!valuesByLanguage[v.languageId]) {
              valuesByLanguage[v.languageId] = [];
            }
            valuesByLanguage[v.languageId].push(v);
          });
          
          // Recalculate sequences
          const finalValues = mappedValues.map(v => {
            const sameLangValues = valuesByLanguage[v.languageId] || [];
            const sequence = sameLangValues.findIndex(sv => sv.id === v.id) + 1;
            return { ...v, sequence };
          });
          
          // Sort by languageId then sequence
          setTermValues(sortValues(finalValues));
        } else {
          // Fallback to old structure (engValue/langValue)
          const defaultLang = languages[0];
          const otherLang = languages[1] || languages[0];
          
          const oldStructureValues = [
            {
              id: 1,
              value: term.engValue || '',
              languageId: defaultLang?.id || 1,
              language: defaultLang?.name || 'English',
              sequence: 1,
              status: 'Approved',
              context: '',
              block: false,
              isDefault: true,
            },
            {
              id: 2,
              value: term.langValue || term.engValue || '',
              languageId: otherLang?.id || 2,
              language: otherLang?.name || 'Hebrew',
              sequence: 2,
              status: 'Approved',
              context: '',
              block: false,
              isDefault: false,
            },
          ];
          
          // Sort by languageId then sequence
          setTermValues(sortValues(oldStructureValues));
        }
      } else {
        // Creating new term - use initialCategory if provided
        setId('');
        setAliasName('');
        setCategory(initialCategory || '');
        setFatherTerm('');
        setTermValues([]);
      }
      setSelectedValues([]);
      setAddValue('');
      setAddContext('');
      setAddLanguage('');
      setOnlyUiLang(true);
      setEditId(null);
      setEditValue('');
      setShowCreateCategory(false);
      setNewCategoryName('');
      // Reset filter to default (show only UI languages)
      setShowOnlyUILanguages(true);
      // Reset father term info only if creating new term (not editing existing)
      if (!term) {
        setFatherTermInfo(null);
      }
      // Clear debounce timer
      if (fatherTermLookupTimerRef.current) {
        clearTimeout(fatherTermLookupTimerRef.current);
        fatherTermLookupTimerRef.current = null;
      }
    }
  }, [open, term, allTerms, allCategories, languages, initialCategory]);
  
  // Update fatherTermInfo when allTerms or fatherTerm changes (for existing terms)
  useEffect(() => {
    const fatherTermStr = fatherTerm ? String(fatherTerm).trim() : '';
    if (open && term && fatherTermStr !== '' && allTerms.length > 0) {
      const fatherTermNum = Number(fatherTermStr);
      if (!isNaN(fatherTermNum) && Number.isInteger(fatherTermNum)) {
        // Compare both as numbers and as strings to handle type mismatches
        const foundTerm = allTerms.find(t => 
          t.id === fatherTermNum || 
          String(t.id) === String(fatherTermNum) ||
          Number(t.id) === fatherTermNum
        );
        if (foundTerm) {
          // Get English value from values array or fallback to engValue
          const defaultValue = foundTerm.values?.find(v => v.isDefault)?.value || 
                             foundTerm.engValue || 
                             '';
          setFatherTermInfo(defaultValue);
        } else {
          setFatherTermInfo(null);
        }
      } else {
        setFatherTermInfo(null);
      }
    }
  }, [open, term, fatherTerm, allTerms]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (fatherTermLookupTimerRef.current) {
        clearTimeout(fatherTermLookupTimerRef.current);
      }
    };
  }, []);


  // Helper function to sort values by languageId (ascending) then by sequence (ascending)
  const sortValues = (values) => {
    return [...values].sort((a, b) => {
      // First sort by languageId
      if (a.languageId !== b.languageId) {
        return (a.languageId || 0) - (b.languageId || 0);
      }
      // Then sort by sequence
      return (a.sequence || 0) - (b.sequence || 0);
    });
  };

  // Helper function to calculate sequence for a language
  const calculateSequenceForLanguage = (values, languageId, excludeId = null) => {
    const valuesWithSameLang = values.filter(v => 
      v.languageId === languageId && v.id !== excludeId
    );
    return valuesWithSameLang.length + 1;
  };

  // Helper function to recalculate sequences for all values with a specific language
  const recalculateSequencesForLanguage = (values, languageId) => {
    const valuesWithSameLang = values.filter(v => v.languageId === languageId);
    return values.map(v => {
      if (v.languageId === languageId) {
        const index = valuesWithSameLang.findIndex(v2 => v2.id === v.id);
        return { ...v, sequence: index + 1 };
      }
      return v;
    });
  };

  // Terms Tab Handlers
  const handleSelectValue = (id) => {
    setSelectedValues(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllValues = (e) => {
    if (e.target.checked) {
      setSelectedValues(termValues.map(t => t.id));
    } else {
      setSelectedValues([]);
    }
  };

  const handleDeleteValue = (id) => {
    setTermValues(prev => {
      const valueToDelete = prev.find(v => v.id === id);
      if (!valueToDelete) return prev;
      
      // Remove the value
      let filtered = prev.filter(t => t.id !== id);
      
      // Recalculate sequences for the language of the deleted value
      if (valueToDelete.languageId) {
        filtered = recalculateSequencesForLanguage(filtered, valueToDelete.languageId);
      }
      
      // Sort by languageId then sequence
      return sortValues(filtered);
    });
    setSelectedValues(prev => prev.filter(x => x !== id));
  };

  const handleDeleteSelectedValues = () => {
    setTermValues(prev => {
      // Get languages of values being deleted
      const languagesToRecalculate = new Set();
      prev.forEach(v => {
        if (selectedValues.includes(v.id) && v.languageId) {
          languagesToRecalculate.add(v.languageId);
        }
      });
      
      // Remove selected values
      let filtered = prev.filter(t => !selectedValues.includes(t.id));
      
      // Recalculate sequences for each affected language
      languagesToRecalculate.forEach(langId => {
        filtered = recalculateSequencesForLanguage(filtered, langId);
      });
      
      // Sort by languageId then sequence
      return sortValues(filtered);
    });
    setSelectedValues([]);
  };

  const handleAddValue = () => {
    if (!addValue || !addLanguage) return;
    const selectedLang = languages.find(l => l.name === addLanguage);
    if (!selectedLang) return;
    
    const newId = Math.max(...termValues.map(t => t.id || 0), 0) + 1;
    // Calculate sequence based on how many values already exist for this language
    const sequence = calculateSequenceForLanguage(termValues, selectedLang.id);
    
    const newValue = {
      id: newId,
      value: addValue,
      languageId: selectedLang.id,
      language: addLanguage,
      sequence: sequence,
      status: 'Approved',
      context: addContext,
      block: false,
      isDefault: termValues.length === 0,
    };
    setTermValues(prev => sortValues([...prev, newValue]));
    setAddValue('');
    setAddContext('');
    setAddLanguage('');
    // Clear validation error when user adds a value
    if (validationErrors.values) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.values;
        return newErrors;
      });
    }
  };

  const handleSetDefault = (id) => {
    setTermValues(prev =>
      prev.map(t => ({ ...t, isDefault: t.id === id }))
    );
  };

  const handleValueDoubleClick = (id, value) => {
    setEditId(id);
    setEditValue(value);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleValueBlur = (id) => {
    setTermValues(prev =>
      prev.map(t => (t.id === id ? { ...t, value: editValue } : t))
    );
    setEditId(null);
    setEditValue('');
  };

  const handleValueKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleValueBlur(id);
    } else if (e.key === 'Escape') {
      setEditId(null);
      setEditValue('');
    }
  };

  // Details Tab Handlers
  const handleSave = () => {
    const errors = {};
    
    // Validation 1: Category is required
    if (!category || category.trim() === '') {
      errors.category = 'Category is required';
    }
    
    // Validation 2: At least one value is required
    if (termValues.length === 0) {
      errors.values = 'At least one value is required';
    }
    
    // Validation 3: Father Term must be a number and must be a valid term ID
    const fatherTermStr = fatherTerm ? String(fatherTerm).trim() : '';
    if (fatherTermStr !== '') {
      const fatherTermNum = Number(fatherTermStr);
      if (isNaN(fatherTermNum) || !Number.isInteger(fatherTermNum)) {
        errors.fatherTerm = 'Father Term must be a valid number';
      } else {
        // Compare both as numbers and as strings to handle type mismatches
        const termExists = allTerms.some(t => 
          t.id === fatherTermNum || 
          String(t.id) === String(fatherTermNum) ||
          Number(t.id) === fatherTermNum
        );
        if (!termExists) {
          errors.fatherTerm = 'Father Term ID does not exist';
        }
      }
    }
    
    // If there are validation errors, show them and don't save
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors
    setValidationErrors({});
    
    // Recalculate sequences for all languages to ensure correctness before saving
    let finalTermValues = [...termValues];
    const languagesInValues = new Set(termValues.map(tv => tv.languageId).filter(Boolean));
    languagesInValues.forEach(langId => {
      finalTermValues = recalculateSequencesForLanguage(finalTermValues, langId);
    });
    
    // Sort by languageId then sequence before saving
    finalTermValues = sortValues(finalTermValues);
    
    // Convert termValues to new structure (values array)
    const values = finalTermValues.map(tv => ({
      languageId: tv.languageId,
      value: tv.value,
      isDefault: tv.isDefault || false,
      status: tv.status || 'Approved',
      context: tv.context || '',
      block: tv.block || false,
      sequence: tv.sequence || 1,
    }));

    const termData = {
      id: term ? term.id : undefined,
      aliasName,
      category,
      fatherTerm: fatherTerm || '',
      values: values,
      valsCount: values.length,
      // Keep old structure for backward compatibility
      engValue: termValues.find(t => t.isDefault)?.value || '',
      langValue: termValues.find(t => !t.isDefault)?.value || termValues.find(t => t.isDefault)?.value || '',
    };

    onSave(termData);
  };

  // Handle Save & Update In Services
  const handleSaveAndUpdate = async () => {
    const errors = {};
    
    // Validation 1: Category is required
    if (!category || category.trim() === '') {
      errors.category = 'Category is required';
    }
    
    // Validation 2: At least one value is required
    if (termValues.length === 0) {
      errors.values = 'At least one value is required';
    }
    
    // Validation 3: Father Term must be a number and must be a valid term ID
    const fatherTermStr = fatherTerm ? String(fatherTerm).trim() : '';
    if (fatherTermStr !== '') {
      const fatherTermNum = Number(fatherTermStr);
      if (isNaN(fatherTermNum) || !Number.isInteger(fatherTermNum)) {
        errors.fatherTerm = 'Father Term must be a valid number';
      } else {
        // Compare both as numbers and as strings to handle type mismatches
        const termExists = allTerms.some(t => 
          t.id === fatherTermNum || 
          String(t.id) === String(fatherTermNum) ||
          Number(t.id) === fatherTermNum
        );
        if (!termExists) {
          errors.fatherTerm = 'Father Term ID does not exist';
        }
      }
    }
    
    // If there are validation errors, show them and don't save
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors
    setValidationErrors({});
    
    // Recalculate sequences for all languages to ensure correctness before saving
    let finalTermValues = [...termValues];
    const languagesInValues = new Set(termValues.map(tv => tv.languageId).filter(Boolean));
    languagesInValues.forEach(langId => {
      finalTermValues = recalculateSequencesForLanguage(finalTermValues, langId);
    });
    
    // Sort by languageId then sequence before saving
    finalTermValues = sortValues(finalTermValues);
    
    // Convert termValues to new structure (values array)
    const values = finalTermValues.map(tv => ({
      languageId: tv.languageId,
      value: tv.value,
      isDefault: tv.isDefault || false,
      status: tv.status || 'Approved',
      context: tv.context || '',
      block: tv.block || false,
      sequence: tv.sequence || 1,
    }));

    const termData = {
      id: term ? term.id : undefined,
      aliasName,
      category,
      fatherTerm: fatherTerm || '',
      values: values,
      valsCount: values.length,
      // Keep old structure for backward compatibility
      engValue: termValues.find(t => t.isDefault)?.value || '',
      langValue: termValues.find(t => !t.isDefault)?.value || termValues.find(t => t.isDefault)?.value || '',
    };

    if (onSaveAndUpdate) {
      await onSaveAndUpdate(termData);
    }
  };

  // Get available languages based on filter (for Add Value form)
  const availableLanguages = React.useMemo(() => {
    if (onlyUiLang) {
      // Filter by isUI flag from database
      return languages.filter(l => l.isUI === true).map(l => l.name);
    }
    return languages.map(l => l.name);
  }, [languages, onlyUiLang]);

  // Filter term values based on UI languages filter (for table display)
  const filteredTermValues = React.useMemo(() => {
    if (showOnlyUILanguages) {
      // Filter to show only values with UI languages
      return termValues.filter(value => {
        const lang = languages.find(l => l.id === value.languageId);
        return lang && lang.isUI === true;
      });
    }
    // Show all values
    return termValues;
  }, [termValues, showOnlyUILanguages, languages]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
        <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {term ? `Term: ${term.engValue || term.category || 'Edit Term'}` : 'Create New Term'}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Validation Errors */}
        {Object.keys(validationErrors).length > 0 && (
          <Box sx={{ mb: 3 }}>
            {validationErrors.category && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {validationErrors.category}
              </Alert>
            )}
            {validationErrors.values && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {validationErrors.values}
              </Alert>
            )}
            {validationErrors.fatherTerm && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {validationErrors.fatherTerm}
              </Alert>
            )}
          </Box>
        )}

        {/* Details Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
            Details
          </Typography>
          <Grid container spacing={2}>
            {/* First Row: Id and Alias Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled
                placeholder={!term ? "Will be assigned on save" : undefined}
                helperText={!term ? "Will be assigned on save" : undefined}
                size="small"
                fullWidth
                sx={{
                  '& .MuiInputBase-input': {
                    '&::placeholder': {
                      opacity: !term ? 0.6 : 1,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField
                type="text"
                label="Alias Name"
                value={aliasName}
                onChange={setAliasName}
              />
            </Grid>
            
            {/* Second Row: Category and Father Term */}
            <Grid item xs={12} sm={6}>
              <Box>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={categories}
                  value={category || null}
                  onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                      // User typed a new category name
                      setCategory(newValue);
                      if (newValue && !categories.includes(newValue)) {
                        setShowCreateCategory(true);
                        setNewCategoryName(newValue);
                      } else {
                        setShowCreateCategory(false);
                      }
                    } else {
                      setCategory(newValue || '');
                      setShowCreateCategory(false);
                    }
                    // Clear validation error when user selects/changes category
                    if (validationErrors.category) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.category;
                        return newErrors;
                      });
                    }
                  }}
                  isOptionEqualToValue={(option, value) => option === value}
                  onInputChange={(event, newInputValue) => {
                    if (newInputValue && !categories.includes(newInputValue)) {
                      setShowCreateCategory(true);
                      setNewCategoryName(newInputValue);
                    } else {
                      setShowCreateCategory(false);
                    }
                    // Clear validation error when user starts typing
                    if (validationErrors.category && newInputValue) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.category;
                        return newErrors;
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      placeholder="Select or type new category name"
                      error={!!validationErrors.category}
                      helperText={validationErrors.category}
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            <InputAdornment position="end">
                              <ArrowDropDownIcon sx={{ color: 'action.active', pointerEvents: 'none' }} />
                            </InputAdornment>
                          </>
                        ),
                      }}
                    />
                  )}
                />
                {showCreateCategory && newCategoryName && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Category "{newCategoryName}" doesn't exist. Create it?
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        if (onCreateCategory && newCategoryName.trim()) {
                          try {
                            await onCreateCategory({ name: newCategoryName.trim() });
                            setCategory(newCategoryName.trim());
                            setShowCreateCategory(false);
                            setNewCategoryName('');
                          } catch (error) {
                            console.error('Error creating category:', error);
                          }
                        }
                      }}
                    >
                      Create Category
                    </Button>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  label="Father Term"
                  value={fatherTerm}
                  placeholder="Optional"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFatherTerm(value);
                    // Clear validation error when user starts typing
                    if (validationErrors.fatherTerm) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.fatherTerm;
                        return newErrors;
                      });
                    }
                    
                    // Clear existing timer
                    if (fatherTermLookupTimerRef.current) {
                      clearTimeout(fatherTermLookupTimerRef.current);
                    }
                    
                    // Reset fatherTermInfo immediately if field is empty
                    const valueStr = value ? String(value).trim() : '';
                    if (valueStr === '') {
                      setFatherTermInfo(null);
                      return;
                    }
                    
                    // Debounce the lookup by 1.5 seconds
                    fatherTermLookupTimerRef.current = setTimeout(() => {
                      // Check if term exists and set fatherTermInfo
                      const fatherTermNum = Number(valueStr);
                      if (!isNaN(fatherTermNum) && Number.isInteger(fatherTermNum)) {
                        // Compare both as numbers and as strings to handle type mismatches
                        const foundTerm = allTerms.find(t => 
                          t.id === fatherTermNum || 
                          String(t.id) === String(fatherTermNum) ||
                          Number(t.id) === fatherTermNum
                        );
                        if (foundTerm) {
                          // Get English value from values array or fallback to engValue
                          const defaultValue = foundTerm.values?.find(v => v.isDefault)?.value || 
                                             foundTerm.engValue || 
                                             '';
                          setFatherTermInfo(defaultValue);
                        } else {
                          setFatherTermInfo(null);
                        }
                      } else {
                        setFatherTermInfo(null);
                      }
                    }, 1500);
                  }}
                  error={!!validationErrors.fatherTerm}
                  helperText={validationErrors.fatherTerm || undefined}
                  size="small"
                  fullWidth
                />
                {fatherTermInfo && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: fatherTerm ? `${14 + fatherTerm.toString().length * 7.2}px` : '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      zIndex: 1,
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      component="span"
                      sx={{ 
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        ml: 1,
                        lineHeight: 1.5,
                      }}
                    >
                      ({fatherTermInfo})
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Terms Section */}
        <Box>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
            Terms
          </Typography>
          <Box>
              {/* Values Table */}
              <TableContainer component={Paper} sx={{ mb: 2, maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={filteredTermValues.length > 0 && filteredTermValues.every(v => selectedValues.includes(v.id))}
                          indeterminate={filteredTermValues.some(v => selectedValues.includes(v.id)) && !filteredTermValues.every(v => selectedValues.includes(v.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all filtered values
                              const filteredIds = filteredTermValues.map(v => v.id);
                              setSelectedValues(prev => [...new Set([...prev, ...filteredIds])]);
                            } else {
                              // Deselect all filtered values
                              const filteredIds = filteredTermValues.map(v => v.id);
                              setSelectedValues(prev => prev.filter(id => !filteredIds.includes(id)));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Sequence</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Context</TableCell>
                      <TableCell>Block Text</TableCell>
                      <TableCell>Is Default</TableCell>
                      <TableCell>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTermValues.map((value) => (
                      <TableRow key={value.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedValues.includes(value.id)}
                            onChange={() => handleSelectValue(value.id)}
                          />
                        </TableCell>
                        <TableCell>{value.id}</TableCell>
                        <TableCell
                          onDoubleClick={() => handleValueDoubleClick(value.id, value.value)}
                          sx={{ cursor: 'pointer' }}
                        >
                          {editId === value.id ? (
                            <TextField
                              inputRef={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleValueBlur(value.id)}
                              onKeyDown={(e) => handleValueKeyDown(e, value.id)}
                              size="small"
                              variant="standard"
                              sx={{ minWidth: 150 }}
                            />
                          ) : (
                            <Typography component="span" sx={{ fontWeight: 600 }}>
                              {value.value}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                              value={value.languageId || ''}
                              onChange={(e) => {
                                const selectedLangId = e.target.value;
                                const selectedLang = languages.find(l => l.id === selectedLangId);
                                if (selectedLang) {
                                  const oldLanguageId = value.languageId;
                                  
                                  setTermValues(prev => {
                                    // First, update the value with new language
                                    let updated = prev.map(v =>
                                      v.id === value.id 
                                        ? { ...v, languageId: selectedLangId, language: selectedLang.name } 
                                        : v
                                    );
                                    
                                    // Recalculate sequences for the old language (if it changed)
                                    if (oldLanguageId && oldLanguageId !== selectedLangId) {
                                      updated = recalculateSequencesForLanguage(updated, oldLanguageId);
                                    }
                                    
                                    // Calculate and set sequence for the new language
                                    updated = updated.map(v => {
                                      if (v.id === value.id) {
                                        const sequence = calculateSequenceForLanguage(
                                          updated.filter(v2 => v2.id !== value.id),
                                          selectedLangId
                                        );
                                        return { ...v, sequence };
                                      }
                                      return v;
                                    });
                                    
                                    // Recalculate sequences for the new language
                                    updated = recalculateSequencesForLanguage(updated, selectedLangId);
                                    
                                    // Sort by languageId then sequence
                                    return sortValues(updated);
                                  });
                                }
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                <em>Select Language</em>
                              </MenuItem>
                              {languages.map((lang) => (
                                <MenuItem key={lang.id} value={lang.id}>
                                  {lang.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>{value.sequence}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={value.status || 'Approved'}
                              onChange={(e) => {
                                setTermValues(prev =>
                                  prev.map(v =>
                                    v.id === value.id ? { ...v, status: e.target.value } : v
                                  )
                                );
                              }}
                              displayEmpty
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <MenuItem key={status} value={status}>
                                  {status}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>{value.context || '-'}</TableCell>
                        <TableCell>
                          <Checkbox checked={value.block} disabled />
                        </TableCell>
                        <TableCell>
                          <Radio
                            checked={value.isDefault}
                            onChange={() => handleSetDefault(value.id)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            onClick={() => handleDeleteValue(value.id)}
                            size="small"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTermValues.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">
                            {termValues.length === 0 
                              ? 'No values added yet. Add a value below.'
                              : 'No values match the current filter. Try changing the filter or add a value below.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  color="error"
                  variant="contained"
                  onClick={handleDeleteSelectedValues}
                  disabled={selectedValues.length === 0}
                  size="small"
                >
                  Delete Selected Rows ({selectedValues.length})
                </Button>
                <Tooltip title="Toggle between showing all languages or only UI languages in the values table">
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnlyUILanguages(!showOnlyUILanguages)}
                    size="small"
                    color="primary"
                  >
                    {showOnlyUILanguages ? 'Show All' : 'UI Languages Only'}
                  </Button>
                </Tooltip>
              </Box>

              {/* Summary */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                  {showOnlyUILanguages 
                    ? `Showing ${filteredTermValues.length} of ${termValues.length} items (UI Languages only) | Selected: ${selectedValues.length}`
                    : `Total Items: ${termValues.length} | Selected Items: ${selectedValues.length}`}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Add Value Form */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Add Value
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                  <TextField
                    label="Value"
                    size="small"
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    label="Context"
                    size="small"
                    value={addContext}
                    onChange={(e) => setAddContext(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 200 }}
                    options={availableLanguages}
                    value={addLanguage || null}
                    onChange={(event, newValue) => setAddLanguage(newValue || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Language"
                        placeholder="Please select language"
                      />
                    )}
                    freeSolo={false}
                    isOptionEqualToValue={(option, value) => option === value}
                  />
                  <Tooltip title="When checked, only languages marked as UI languages will appear in the language dropdown">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={onlyUiLang}
                          onChange={(e) => setOnlyUiLang(e.target.checked)}
                        />
                      }
                      label="Only UI languages"
                    />
                  </Tooltip>
                  <Button
                    variant="contained"
                    onClick={handleAddValue}
                    disabled={!addValue || !addLanguage}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {onDelete && term && (
              <Button
                color="error"
                variant="outlined"
                disabled
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this term?')) {
                    onDelete();
                  }
                }}
              >
                Delete Term
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            <PrimaryButton onClick={handleSaveAndUpdate} color="success">
              Save & Update In Services
            </PrimaryButton>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TermEditModal;

