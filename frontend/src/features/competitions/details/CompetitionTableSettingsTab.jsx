import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export default function CompetitionTableSettingsTab({
  formData,
  competition,
  standingTypes,
  tablePointKeys,
  tableCheckboxKeys,
  tableSettingsLabels,
  orderByList,
  tableSettingsFieldOptions,
  tableOrderByNewField,
  tableOrderByNewDirection,
  dragOrderIndex,
  dragOverOrderIndex,
  standingTypeLabel,
  onFormChange,
  onTableOrderByNewFieldChange,
  onTableOrderByNewDirectionChange,
  onAddOrderByItem,
  onRemoveOrderByItem,
  onOrderDragStart,
  onOrderDragEnd,
  onOrderDragOver,
  onOrderDragLeave,
  onOrderDrop,
  formatTableSettingKeyAsLabel,
}) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#000000' }}>
        Table Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Points and table rules for this competition. Changes are saved to this competition only (competitions.json).
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} sx={{ width: 'fit-content', maxWidth: '100%' }}>
          {Number(formData.SPORT_TYPE_ID) === 2 && (
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                <InputLabel>{standingTypeLabel}</InputLabel>
                <Select
                  value={formData.STANDING_TYPE ?? competition?.STANDING_TYPE ?? ''}
                  label={standingTypeLabel}
                  onChange={(e) => onFormChange('STANDING_TYPE', e.target.value)}
                >
                  <MenuItem value="">—</MenuItem>
                  {standingTypes.map((standingType) => (
                    <MenuItem key={standingType.STANDING_TYPE_ID} value={standingType.STANDING_TYPE}>
                      {standingType.STANDING_TYPE}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Point configuration</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 18ch)', columnGap: 2, rowGap: 3.5, mb: 2, width: 'fit-content' }}>
            {tablePointKeys.map((key) => (
              <TextField
                key={key}
                size="small"
                label={formatTableSettingKeyAsLabel(key)}
                type="number"
                value={formData[key] ?? competition?.[key] ?? ''}
                onChange={(e) => onFormChange(key, e.target.value === '' ? null : Number(e.target.value))}
                sx={{
                  width: '18ch',
                  maxWidth: '100%',
                  '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                }}
              />
            ))}
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Scoring rules</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: 'fit-content' }}>
            {tableCheckboxKeys.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    size="small"
                    checked={!!(formData[key] ?? competition?.[key])}
                    onChange={(e) => onFormChange(key, e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{tableSettingsLabels[key] ?? formatTableSettingKeyAsLabel(key)}</Typography>}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
              />
            ))}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Table order parameters</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
            Current order (priority from top to bottom):
          </Typography>
          <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, bgcolor: '#fafafa' }}>
            {orderByList.map((item, index) => (
              <ListItem
                key={`${item.field}-${index}`}
                data-index={index}
                onDragOver={(e) => onOrderDragOver(e, index)}
                onDragLeave={onOrderDragLeave}
                onDrop={(e) => onOrderDrop(e, index)}
                sx={{
                  py: 0.5,
                  cursor: dragOrderIndex != null ? (dragOrderIndex === index ? 'grabbing' : 'default') : 'default',
                  transition: 'all 0.2s ease',
                  ...(dragOrderIndex === index && {
                    opacity: 0.9,
                    transform: 'scale(1.02)',
                    boxShadow: 2,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                  }),
                  ...(dragOverOrderIndex === index && dragOrderIndex !== index && {
                    borderTop: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                    borderRadius: 0,
                  }),
                }}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => onRemoveOrderByItem(index)} aria-label="Remove" sx={{ color: '#d32f2f' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Box
                  component="span"
                  draggable
                  onDragStart={(e) => onOrderDragStart(e, index)}
                  onDragEnd={onOrderDragEnd}
                  sx={{ display: 'flex', alignItems: 'center', mr: 1, cursor: 'grab', color: 'action.active', '&:active': { cursor: 'grabbing' } }}
                  aria-label="Drag to reorder"
                >
                  <DragIndicatorIcon fontSize="small" />
                </Box>
                <ListItemText
                  primary={`${index + 1}. ${tableSettingsFieldOptions.find((option) => option.value === item.field)?.label ?? item.field}`}
                  secondary={item.direction === 'desc' ? 'Descending' : 'Ascending'}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItem>
            ))}
            {orderByList.length === 0 && (
              <ListItem>
                <ListItemText primary="No order parameters defined" primaryTypographyProps={{ fontSize: '0.875rem', color: 'text.secondary' }} />
              </ListItem>
            )}
          </List>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="table-order-field-label">Select field</InputLabel>
              <Select
                labelId="table-order-field-label"
                label="Select field"
                value={tableOrderByNewField}
                onChange={(e) => onTableOrderByNewFieldChange(e.target.value)}
              >
                <MenuItem value="">Select field</MenuItem>
                {tableSettingsFieldOptions.filter((option) => !orderByList.some((item) => item.field === option.value)).map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="table-order-dir-label">Direction</InputLabel>
              <Select
                labelId="table-order-dir-label"
                label="Direction"
                value={tableOrderByNewDirection}
                onChange={(e) => onTableOrderByNewDirectionChange(e.target.value)}
              >
                <MenuItem value="desc">Descending</MenuItem>
                <MenuItem value="asc">Ascending</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              onClick={onAddOrderByItem}
              disabled={!tableOrderByNewField || orderByList.some((item) => item.field === tableOrderByNewField)}
              sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}
            >
              Add
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
