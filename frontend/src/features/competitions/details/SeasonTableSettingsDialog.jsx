import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

export default function SeasonTableSettingsDialog({
  open,
  seasonName,
  competition,
  form,
  standingTypes,
  tablePointKeys,
  tableCheckboxKeys,
  tableSettingsLabels,
  fieldLabels,
  orderByList,
  dragOrderIndex,
  dragOverOrderIndex,
  fieldOptions,
  newField,
  newDirection,
  saving,
  formatLabel,
  onClose,
  onSave,
  onFormChange,
  onOrderDragOver,
  onOrderDragLeave,
  onOrderDrop,
  onRemoveOrderBy,
  onOrderDragStart,
  onOrderDragEnd,
  onNewFieldChange,
  onNewDirectionChange,
  onAddOrderBy,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { minHeight: '75vh' } }}>
      <DialogTitle>
        Table Settings — Season {seasonName}
      </DialogTitle>
      <DialogContent sx={{ minHeight: '60vh' }}>
        {form && (
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              {Number(competition?.SPORT_TYPE_ID) === 2 && (
                <Box sx={{ mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}>
                    <InputLabel>{fieldLabels.STANDING_TYPE}</InputLabel>
                    <Select
                      value={form.STANDING_TYPE ?? ''}
                      label={fieldLabels.STANDING_TYPE}
                      onChange={(event) => onFormChange('STANDING_TYPE', event.target.value)}
                    >
                      <MenuItem value="">—</MenuItem>
                      {standingTypes.map((standingType) => (
                        <MenuItem key={standingType.STANDING_TYPE_ID} value={standingType.STANDING_TYPE}>{standingType.STANDING_TYPE}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Point configuration</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 2, rowGap: 2, mb: 2, maxWidth: 400 }}>
                {tablePointKeys.map((key) => (
                  <TextField
                    key={key}
                    size="small"
                    label={formatLabel(key)}
                    type="number"
                    value={form[key] ?? ''}
                    onChange={(event) => onFormChange(key, event.target.value === '' ? null : Number(event.target.value))}
                    fullWidth
                    sx={{
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
                        checked={!!form[key]}
                        onChange={(event) => onFormChange(key, event.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">{tableSettingsLabels[key] ?? formatLabel(key)}</Typography>}
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Table order parameters</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                Current order (priority from top to bottom):
              </Typography>
              <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, bgcolor: '#fafafa' }}>
                {orderByList.map((item, index) => (
                  <ListItem
                    key={`${item.field}-${index}`}
                    data-index={index}
                    onDragOver={(event) => onOrderDragOver(event, index)}
                    onDragLeave={onOrderDragLeave}
                    onDrop={(event) => onOrderDrop(event, index)}
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
                      <IconButton edge="end" size="small" onClick={() => onRemoveOrderBy(index)} aria-label="Remove" sx={{ color: '#d32f2f' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <Box
                      component="span"
                      draggable
                      onDragStart={(event) => onOrderDragStart(event, index)}
                      onDragEnd={onOrderDragEnd}
                      sx={{ display: 'flex', alignItems: 'center', mr: 1, cursor: 'grab', color: 'action.active', '&:active': { cursor: 'grabbing' } }}
                      aria-label="Drag to reorder"
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                    <ListItemText
                      primary={`${index + 1}. ${fieldOptions.find((option) => option.value === item.field)?.label ?? item.field}`}
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
                  <InputLabel id="season-table-order-field-label">Select field</InputLabel>
                  <Select
                    labelId="season-table-order-field-label"
                    label="Select field"
                    value={newField}
                    onChange={(event) => onNewFieldChange(event.target.value)}
                  >
                    <MenuItem value="">Select field</MenuItem>
                    {fieldOptions.filter((option) => !orderByList.some((item) => item.field === option.value)).map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="season-table-order-dir-label">Direction</InputLabel>
                  <Select
                    labelId="season-table-order-dir-label"
                    label="Direction"
                    value={newDirection}
                    onChange={(event) => onNewDirectionChange(event.target.value)}
                  >
                    <MenuItem value="desc">Descending</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onAddOrderBy}
                  disabled={!newField || orderByList.some((item) => item.field === newField)}
                  sx={{ backgroundColor: '#1976d2', textTransform: 'none' }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving}
          sx={{
            textTransform: 'none',
            backgroundColor: '#15803d',
            color: 'white',
            px: 4,
            '&:hover': { backgroundColor: '#166534' },
          }}
        >
          {saving ? 'Saving…' : 'Save & Update In Service'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
