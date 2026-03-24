import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PrimaryButton, SecondaryButton } from '../Buttons';
import { LoadingSpinner } from '../Feedback';
import { importFromCSV, parseCSV } from '../../utils/csvStorage';

/**
 * ImportTermsModal - Modal for importing terms from CSV/Excel files
 * 
 * Steps:
 * 1. Upload File
 * 2. Review & Validation
 * 3. Confirmation
 * 4. Summary Results
 */
const ImportTermsModal = ({
  open,
  onClose,
  allTerms = [],
  allCategories = [],
  onCreateTerm,
  onUpdateTerm,
}) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Confirmation, 4: Summary
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationResults, setValidationResults] = useState({
    createTerms: [],
    updateTerms: [],
    replaceTerms: [],
    notValidTerms: [],
  });
  const [selectedRows, setSelectedRows] = useState({
    create: new Set(),
    update: new Set(),
    replace: new Set(),
  });
  const [activeTab, setActiveTab] = useState(0); // 0: Create, 1: Update/Replace, 2: Not Valid
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setFileName('');
      setParsedData([]);
      setValidationResults({
        createTerms: [],
        updateTerms: [],
        replaceTerms: [],
        notValidTerms: [],
      });
      setSelectedRows({
        create: new Set(),
        update: new Set(),
        replace: new Set(),
      });
      setActiveTab(0);
      setImportResults(null);
      setError(null);
    }
  }, [open]);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Invalid file type. Please select a CSV or Excel file.');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse the file
      const data = await parseFile(file);
      setParsedData(data);
      
      // Validate the data
      const validation = validateParsedData(data);
      setValidationResults(validation);
      
      // Auto-select all valid rows
      setSelectedRows({
        create: new Set(validation.createTerms.map((_, idx) => idx)),
        update: new Set(validation.updateTerms.map((_, idx) => idx)),
        replace: new Set(validation.replaceTerms.map((_, idx) => idx)),
      });
      
      setStep(2); // Move to review step
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
      console.error('Error parsing file:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseFile = async (file) => {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (fileExtension === '.csv') {
      // Parse CSV file
      const csvText = await readFileAsText(file);
      const rawData = parseCSV(csvText);
      
      // Map CSV rows to term structure
      return rawData.map((row, index) => mapCSVRowToTerm(row, index));
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Excel parsing - will require xlsx library
      // For now, show error
      throw new Error('Excel file support coming soon. Please use CSV format for now.');
    } else {
      throw new Error('Unsupported file format');
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const mapCSVRowToTerm = (row, index) => {
    // Extract language values from columns like "English(1)", "Hebrew(2)", etc.
    const languageValues = [];
    const languageIdPattern = /\((\d+)\)$/;
    
    Object.keys(row).forEach(key => {
      if (key === 'Action' || key === 'TermID' || key === 'AliasName' || 
          key === 'CategoryAliasName' || key === 'FatherTermID') {
        return; // Skip metadata columns
      }
      
      const match = key.match(languageIdPattern);
      if (match) {
        const languageId = parseInt(match[1], 10);
        const value = row[key]?.trim() || '';
        if (value) {
          languageValues.push({
            languageId,
            value,
            isDefault: languageId === 1, // English(1) is default
            status: 'Approved',
            context: '',
            block: false,
            sequence: 1,
          });
        }
      }
    });

    // Sort by languageId, with default first
    languageValues.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.languageId - b.languageId;
    });

    // Update sequence
    languageValues.forEach((val, idx) => {
      val.sequence = idx + 1;
    });

    return {
      _rowIndex: index,
      _action: (row.Action || '').trim(),
      _originalRow: row,
      id: row.TermID ? parseInt(row.TermID, 10) : undefined,
      aliasName: (row.AliasName || '').trim(),
      category: (row.CategoryAliasName || '').trim(),
      fatherTerm: (row.FatherTermID || '').trim(),
      values: languageValues,
      valsCount: languageValues.length,
      engValue: languageValues.find(v => v.isDefault)?.value || languageValues[0]?.value || '',
      langValue: languageValues.find(v => !v.isDefault)?.value || languageValues[0]?.value || '',
    };
  };

  const validateParsedData = (data) => {
    const createTerms = [];
    const updateTerms = [];
    const replaceTerms = [];
    const notValidTerms = [];

    data.forEach((term, index) => {
      const action = term._action.toUpperCase();
      const errors = [];

      // Validate based on action
      if (action === 'CREATE') {
        // Create validation
        if (term.id) {
          errors.push('Create action cannot have TermID');
        }
        if (!term.aliasName) {
          errors.push('AliasName is required');
        }
        if (!term.category) {
          errors.push('CategoryAliasName is required');
        }
        // Check if category exists (support both name and aliasName)
        const categoryExists = allCategories.some(cat => 
          cat.name === term.category || cat.aliasName === term.category
        );
        if (!categoryExists) {
          errors.push(`Category "${term.category}" does not exist`);
        }
        // Check if fatherTerm exists (if provided)
        if (term.fatherTerm) {
          const fatherExists = allTerms.some(t => String(t.id) === String(term.fatherTerm));
          if (!fatherExists) {
            errors.push(`FatherTerm ID "${term.fatherTerm}" does not exist`);
          }
        }
      } else if (action === 'ADD' || action === 'REPLACE') {
        // Add/Replace validation
        if (!term.id) {
          errors.push('TermID is required for Add/Replace actions');
        } else {
          const termExists = allTerms.some(t => String(t.id) === String(term.id));
          if (!termExists) {
            errors.push(`Term ID "${term.id}" does not exist`);
          }
        }
        if (!term.aliasName) {
          errors.push('AliasName is required');
        }
        if (!term.category) {
          errors.push('CategoryAliasName is required');
        }
        // Check if category exists (support both name and aliasName)
        const categoryExists = allCategories.some(cat => 
          cat.name === term.category || cat.aliasName === term.category
        );
        if (!categoryExists) {
          errors.push(`Category "${term.category}" does not exist`);
        }
      } else {
        errors.push(`Invalid action: "${action}". Must be Create, Add, or Replace`);
      }

      // Add to appropriate array
      if (errors.length > 0) {
        notValidTerms.push({
          ...term,
          _errors: errors,
        });
      } else {
        if (action === 'CREATE') {
          createTerms.push(term);
        } else if (action === 'ADD') {
          updateTerms.push(term);
        } else if (action === 'REPLACE') {
          replaceTerms.push(term);
        }
      }
    });

    return {
      createTerms,
      updateTerms,
      replaceTerms,
      notValidTerms,
    };
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = {
        created: [],
        updated: [],
        failed: [],
      };

      // Execute Create operations
      for (const idx of selectedRows.create) {
        const term = validationResults.createTerms[idx];
        try {
          const termData = {
            aliasName: term.aliasName,
            category: term.category,
            fatherTerm: term.fatherTerm || '',
            values: term.values,
            valsCount: term.valsCount,
          };
          const created = await onCreateTerm(termData);
          results.created.push({ ...term, newId: created.id });
        } catch (err) {
          results.failed.push({ ...term, error: err.message });
        }
      }

      // Execute Add operations
      for (const idx of selectedRows.update) {
        const term = validationResults.updateTerms[idx];
        try {
          const existingTerm = allTerms.find(t => String(t.id) === String(term.id));
          if (existingTerm) {
            // Merge values - add new values to existing
            const existingValues = existingTerm.values || [];
            const newValues = term.values || [];
            const mergedValues = [...existingValues];
            
            // Add new values that don't already exist for the same languageId
            newValues.forEach(newVal => {
              const exists = mergedValues.some(v => v.languageId === newVal.languageId && v.value === newVal.value);
              if (!exists) {
                mergedValues.push(newVal);
              }
            });

            const termData = {
              aliasName: term.aliasName || existingTerm.aliasName,
              category: term.category || existingTerm.category,
              fatherTerm: term.fatherTerm || existingTerm.fatherTerm || '',
              values: mergedValues,
              valsCount: mergedValues.length,
            };
            const updated = await onUpdateTerm(term.id, termData);
            results.updated.push({ ...term, updated });
          }
        } catch (err) {
          results.failed.push({ ...term, error: err.message });
        }
      }

      // Execute Replace operations
      for (const idx of selectedRows.replace) {
        const term = validationResults.replaceTerms[idx];
        try {
          const termData = {
            aliasName: term.aliasName,
            category: term.category,
            fatherTerm: term.fatherTerm || '',
            values: term.values,
            valsCount: term.valsCount,
          };
          const updated = await onUpdateTerm(term.id, termData);
          results.updated.push({ ...term, updated });
        } catch (err) {
          results.failed.push({ ...term, error: err.message });
        }
      }

      setImportResults(results);
      setStep(4); // Move to summary step
    } catch (err) {
      setError(`Failed to import terms: ${err.message}`);
      console.error('Error importing terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 4) {
      // If we're on summary step, refresh the page data
      // This will be handled by parent component
    }
    onClose();
  };

  const getSummaryStats = () => {
    const { createTerms, updateTerms, replaceTerms, notValidTerms } = validationResults;
    return {
      total: createTerms.length + updateTerms.length + replaceTerms.length + notValidTerms.length,
      create: createTerms.length,
      update: updateTerms.length,
      replace: replaceTerms.length,
      notValid: notValidTerms.length,
    };
  };

  const stats = getSummaryStats();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {step === 1 && 'Import Terms - Upload File'}
          {step === 2 && 'Import Terms - Review & Validation'}
          {step === 3 && 'Import Terms - Confirmation'}
          {step === 4 && 'Import Terms - Summary Results'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && step === 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <LoadingSpinner />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step 1: Upload File */}
        {step === 1 && !loading && (
          <Box>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Select a CSV or Excel file to import terms. The file should follow the import template format.
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{ mb: 2 }}
              >
                Select File
              </Button>
              {fileName && (
                <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                  Selected: {fileName}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Step 2: Review & Validation */}
        {step === 2 && (
          <Box>
            {/* Summary Section */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Import Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Rows</Typography>
                  <Typography variant="h6">{stats.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Create Terms</Typography>
                  <Typography variant="h6" color="primary">{stats.create}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Update/Replace Terms</Typography>
                  <Typography variant="h6" color="info.main">{stats.update + stats.replace}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Not Valid</Typography>
                  <Typography variant="h6" color="error">{stats.notValid}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
              <Tab label={`Create Terms (${stats.create})`} />
              <Tab label={`Update/Replace (${stats.update + stats.replace})`} />
              <Tab label={`Not Valid (${stats.notValid})`} />
            </Tabs>

            {/* Tab Content */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Review and select the terms you want to create. Only checked terms will be created.
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      onClick={() => {
                        const allSelected = validationResults.createTerms.length === selectedRows.create.size;
                        if (allSelected) {
                          setSelectedRows(prev => ({ ...prev, create: new Set() }));
                        } else {
                          setSelectedRows(prev => ({
                            ...prev,
                            create: new Set(validationResults.createTerms.map((_, idx) => idx)),
                          }));
                        }
                      }}
                    >
                      {validationResults.createTerms.length === selectedRows.create.size ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Box>
                </Box>
                {validationResults.createTerms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No terms to create
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={validationResults.createTerms.length > 0 && validationResults.createTerms.length === selectedRows.create.size}
                              indeterminate={selectedRows.create.size > 0 && selectedRows.create.size < validationResults.createTerms.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRows(prev => ({
                                    ...prev,
                                    create: new Set(validationResults.createTerms.map((_, idx) => idx)),
                                  }));
                                } else {
                                  setSelectedRows(prev => ({ ...prev, create: new Set() }));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Father Term ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>English Value</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Values Count</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResults.createTerms.map((term, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedRows.create.has(idx)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedRows.create);
                                  if (e.target.checked) {
                                    newSet.add(idx);
                                  } else {
                                    newSet.delete(idx);
                                  }
                                  setSelectedRows(prev => ({ ...prev, create: newSet }));
                                }}
                              />
                            </TableCell>
                            <TableCell>{term.aliasName || '-'}</TableCell>
                            <TableCell>{term.category || '-'}</TableCell>
                            <TableCell>{term.fatherTerm || '-'}</TableCell>
                            <TableCell>{term.engValue || '-'}</TableCell>
                            <TableCell>{term.valsCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Review and select the terms you want to update or replace.
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      onClick={() => {
                        const allUpdate = validationResults.updateTerms.map((_, idx) => idx);
                        const allReplace = validationResults.replaceTerms.map((_, idx) => idx + validationResults.updateTerms.length);
                        const allSelected = [...allUpdate, ...allReplace];
                        const currentSelected = [...selectedRows.update, ...selectedRows.replace];
                        const isAllSelected = allSelected.length === currentSelected.length && 
                          allSelected.every(idx => currentSelected.includes(idx));
                        
                        if (isAllSelected) {
                          setSelectedRows(prev => ({ ...prev, update: new Set(), replace: new Set() }));
                        } else {
                          setSelectedRows(prev => ({
                            ...prev,
                            update: new Set(allUpdate),
                            replace: new Set(allReplace),
                          }));
                        }
                      }}
                    >
                      Select All
                    </Button>
                  </Box>
                </Box>
                {validationResults.updateTerms.length === 0 && validationResults.replaceTerms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No terms to update or replace
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={false}
                              onChange={() => {}}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Term ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>English Value</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Values Count</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...validationResults.updateTerms, ...validationResults.replaceTerms].map((term, idx) => {
                          const isUpdate = idx < validationResults.updateTerms.length;
                          const actualIdx = isUpdate ? idx : idx - validationResults.updateTerms.length;
                          const isSelected = isUpdate 
                            ? selectedRows.update.has(actualIdx)
                            : selectedRows.replace.has(actualIdx);
                          
                          return (
                            <TableRow key={idx} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (isUpdate) {
                                      const newSet = new Set(selectedRows.update);
                                      if (e.target.checked) {
                                        newSet.add(actualIdx);
                                      } else {
                                        newSet.delete(actualIdx);
                                      }
                                      setSelectedRows(prev => ({ ...prev, update: newSet }));
                                    } else {
                                      const newSet = new Set(selectedRows.replace);
                                      if (e.target.checked) {
                                        newSet.add(actualIdx);
                                      } else {
                                        newSet.delete(actualIdx);
                                      }
                                      setSelectedRows(prev => ({ ...prev, replace: newSet }));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>{isUpdate ? 'Add' : 'Replace'}</TableCell>
                              <TableCell>{term.id || '-'}</TableCell>
                              <TableCell>{term.aliasName || '-'}</TableCell>
                              <TableCell>{term.category || '-'}</TableCell>
                              <TableCell>{term.engValue || '-'}</TableCell>
                              <TableCell>{term.valsCount || 0}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  These terms failed validation and will not be imported. You can export this list to fix and re-import.
                </Typography>
                {validationResults.notValidTerms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No invalid terms
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Error</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Term ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResults.notValidTerms.map((term, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Box>
                                {term._errors?.map((error, errIdx) => (
                                  <Typography key={errIdx} variant="body2" color="error" sx={{ fontSize: '0.75rem' }}>
                                    {error}
                                  </Typography>
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>{term._action || '-'}</TableCell>
                            <TableCell>{term.id || '-'}</TableCell>
                            <TableCell>{term.aliasName || '-'}</TableCell>
                            <TableCell>{term.category || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 3: Confirmation - Will be shown as a dialog overlay */}
        
        {/* Step 4: Summary Results */}
        {step === 4 && importResults && (
          <Box>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Import Results Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography variant="h6" color="success.main">{importResults.created.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Updated</Typography>
                  <Typography variant="h6" color="info.main">{importResults.updated.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Failed</Typography>
                  <Typography variant="h6" color="error">{importResults.failed.length}</Typography>
                </Box>
              </Box>
            </Box>

            {importResults.created.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Created Terms ({importResults.created.length})
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>New Term ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResults.created.map((term, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{term.newId}</TableCell>
                          <TableCell>{term.aliasName || '-'}</TableCell>
                          <TableCell>{term.category || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {importResults.updated.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Updated Terms ({importResults.updated.length})
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Term ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResults.updated.map((term, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{term.id}</TableCell>
                          <TableCell>{term.aliasName || '-'}</TableCell>
                          <TableCell>{term.category || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {importResults.failed.length > 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Failed Terms ({importResults.failed.length})
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Error</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Term ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Alias Name</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResults.failed.map((term, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" color="error" sx={{ fontSize: '0.75rem' }}>
                              {term.error}
                            </Typography>
                          </TableCell>
                          <TableCell>{term.id || '-'}</TableCell>
                          <TableCell>{term.aliasName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {step === 1 && (
          <>
            <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleUpload} disabled={!file || loading}>
              Upload & Validate
            </PrimaryButton>
          </>
        )}
        {step === 2 && (
          <>
            <SecondaryButton onClick={() => setStep(1)}>Back</SecondaryButton>
            <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
            <PrimaryButton 
              onClick={() => {
                if (window.confirm('Are you sure you want to import the selected terms?')) {
                  handleConfirmImport();
                }
              }}
              disabled={loading}
            >
              Confirm Import
            </PrimaryButton>
          </>
        )}
        {step === 4 && (
          <PrimaryButton onClick={handleClose}>Close</PrimaryButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportTermsModal;

