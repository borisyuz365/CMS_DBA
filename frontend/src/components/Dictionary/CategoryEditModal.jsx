import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Autocomplete,
  TextField,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PrimaryButton, SecondaryButton } from '../Buttons';
import { FormField } from '../Forms';

const CategoryEditModal = ({
  open,
  onClose,
  category,
  onSave,
  onDelete,
  allCategories = [],
  initialFatherCategory = null,
}) => {
  const [name, setName] = useState('');
  const [fatherCategory, setFatherCategory] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  const parentCategoryOptions = React.useMemo(
    () => allCategories.filter((c) => c.name !== category?.name).map((c) => ({ value: c.name, label: c.name })),
    [allCategories, category]
  );

  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name || '');
        setFatherCategory(category.fatherCategory || '');
        setDescription(category.description || '');
      } else {
        setName('');
        setFatherCategory(initialFatherCategory || '');
        setDescription('');
      }
      setValidationError('');
    }
  }, [open, category, initialFatherCategory]);

  const handleSave = () => {
    if (!category && !fatherCategory) {
      setValidationError('Father Category is required when creating a new category');
      return;
    }
    if (description.length > 500) {
      setValidationError('Description cannot exceed 500 characters');
      return;
    }
    setValidationError('');
    onSave({ id: category?.id, name, fatherCategory: fatherCategory || null, description: description || '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{category ? `Category: ${category.name}` : 'Create New Category'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box>
          <FormField type="text" label="Name" value={name} onChange={setName} required disabled={!!category} sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              size="small"
              options={parentCategoryOptions}
              getOptionLabel={(opt) => opt.label || ''}
              value={parentCategoryOptions.find((o) => o.value === fatherCategory) || null}
              onChange={(e, newVal) => setFatherCategory(newVal?.value || '')}
              disabled={!!category}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={category ? 'Father Category (Optional)' : 'Father Category *'}
                  placeholder="Select parent category..."
                  size="small"
                  required={!category}
                  error={!!validationError && !validationError.includes('500')}
                  helperText={validationError && !validationError.includes('500') ? validationError : ''}
                />
              )}
            />
          </Box>
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            multiline
            rows={4}
            fullWidth
            size="small"
            error={description.length > 500}
            helperText={`${description.length}/500 characters`}
            sx={{ mb: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {onDelete && category && (
              <Button color="error" variant="outlined" onClick={() => window.confirm('Are you sure you want to delete this category?') && onDelete()}>Delete Category</Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            <PrimaryButton onClick={handleSave} disabled={!name.trim() || (!category && !fatherCategory) || description.length > 500}>Save</PrimaryButton>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryEditModal;
