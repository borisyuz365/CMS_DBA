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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

const GROUP_CONFIGURATION_FIELDS = [
  { key: 'HAS_TABLE', label: 'Has Table' },
  { key: 'IS_SERIES', label: 'Is Series' },
  { key: 'USE_NAME', label: 'Use Name' },
  { key: 'GROUP_BY', label: 'Group By' },
  { key: 'AUTONOMOUS', label: 'Autonomous' },
  { key: 'IS_FINAL', label: 'Is Final' },
];

export default function GroupEditDialog({
  open,
  form,
  context,
  groupsByStage,
  saving,
  onClose,
  onSave,
  onFormChange,
}) {
  const groups = context ? (groupsByStage[`${context.seasonNum}-${context.stageNum}`] || []) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Group</DialogTitle>
      <DialogContent>
        {form && context && (
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Group Hierarchy (Category)"
                  value={form.GROUP_CATEGORY_NUM ?? ''}
                  onChange={(event) => onFormChange((currentForm) => ({ ...currentForm, GROUP_CATEGORY_NUM: event.target.value === '' ? null : Number(event.target.value) }))}
                  placeholder="—"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Parent Group</InputLabel>
                  <Select
                    label="Parent Group"
                    value={form.FATHER_GROUP ?? ''}
                    onChange={(event) => onFormChange((currentForm) => ({ ...currentForm, FATHER_GROUP: event.target.value === '' ? null : Number(event.target.value) }))}
                    renderValue={(value) => {
                      if (value == null || value === '') return '—';
                      const group = groups.find((item) => Number(item.GROUP_NUM) === Number(value));
                      return group ? (group.name || `Group ${group.GROUP_NUM}`) : `Group ${value}`;
                    }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {groups
                      .filter((group) => {
                        if (Number(group.GROUP_NUM) === Number(form.GROUP_NUM)) return false;
                        const currentCategory = form.GROUP_CATEGORY_NUM;
                        if (currentCategory == null || currentCategory === '') return false;
                        const currentCategoryNum = Number(currentCategory);
                        if (isNaN(currentCategoryNum)) return false;
                        const groupCategory = group.GROUP_CATEGORY_NUM;
                        if (groupCategory == null || groupCategory === '') return true;
                        return Number(groupCategory) < currentCategoryNum;
                      })
                      .sort((first, second) => Number(first.GROUP_NUM) - Number(second.GROUP_NUM))
                      .map((group) => (
                        <MenuItem key={group.GROUP_NUM} value={group.GROUP_NUM}>
                          {group.name || `Group ${group.GROUP_NUM}`}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Group Configuration</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {GROUP_CONFIGURATION_FIELDS.map(({ key, label }) => (
                <Grid item xs={6} sm={4} md={3} key={key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!form[key]}
                        onChange={(event) => onFormChange((currentForm) => ({ ...currentForm, [key]: event.target.checked }))}
                      />
                    }
                    label={label}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={saving}
          sx={{ textTransform: 'none', backgroundColor: '#15803d', '&:hover': { backgroundColor: '#166534' } }}
        >
          {saving ? 'Saving…' : 'Save & Update In Service'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
