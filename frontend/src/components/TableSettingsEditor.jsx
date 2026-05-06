import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Paper,
  Autocomplete,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';

export function parseSettingsString(str) {
  if (!str || !str.trim()) return [];
  return str.split(',').map((entry) => {
    const [compSeason, tableTypeId] = entry.split('.');
    const parts = compSeason ? compSeason.split('|') : [];
    return {
      COMPETITION_ID: parts[0] ? Number(parts[0]) : '',
      SEASON_NUM: parts[1] ? Number(parts[1]) : '',
      STAGE_NUM: parts[2] ? Number(parts[2]) : '',
      TABLE_TYPE_ID: tableTypeId ? Number(tableTypeId) : '',
    };
  });
}

export function serializeSettings(rows) {
  return rows
    .map((r) => `${r.COMPETITION_ID}|${r.SEASON_NUM}|${r.STAGE_NUM}.${r.TABLE_TYPE_ID}`)
    .join(',');
}

function TableSettingsRow({
  row,
  index,
  filteredCompetitions,
  tableTypes,
  onRowChange,
  onDelete,
}) {
  const [seasons, setSeasons] = useState([]);
  const [stages, setStages] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    if (!row.COMPETITION_ID) {
      setSeasons([]);
      setStages([]);
      return;
    }
    let cancelled = false;
    setLoadingSeasons(true);
    api.getSeasons(row.COMPETITION_ID).then((data) => {
      if (!cancelled) {
        setSeasons(data || []);
        setLoadingSeasons(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSeasons([]);
        setLoadingSeasons(false);
      }
    });
    return () => { cancelled = true; };
  }, [row.COMPETITION_ID]);

  useEffect(() => {
    if (!row.COMPETITION_ID || !row.SEASON_NUM) {
      setStages([]);
      return;
    }
    let cancelled = false;
    setLoadingStages(true);
    api.getStages(row.COMPETITION_ID, row.SEASON_NUM).then((data) => {
      if (!cancelled) {
        setStages(data || []);
        setLoadingStages(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setStages([]);
        setLoadingStages(false);
      }
    });
    return () => { cancelled = true; };
  }, [row.COMPETITION_ID, row.SEASON_NUM]);

  const isIncomplete = !row.COMPETITION_ID || !row.SEASON_NUM || !row.STAGE_NUM || !row.TABLE_TYPE_ID;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 1,
        p: 1,
        borderRadius: 1,
        backgroundColor: isIncomplete ? '#fff8e1' : '#f1f8e9',
        border: '1px solid',
        borderColor: isIncomplete ? '#ffe082' : '#c8e6c9',
      }}
    >
      <Autocomplete
        size="small"
        sx={{ minWidth: 160 }}
        options={filteredCompetitions}
        getOptionLabel={(option) =>
          option.name
            ? `${option.name} (${option.COMPETITION_ID})`
            : `Competition ${option.COMPETITION_ID}`
        }
        value={
          filteredCompetitions.find(
            (c) => Number(c.COMPETITION_ID) === Number(row.COMPETITION_ID)
          ) || null
        }
        isOptionEqualToValue={(opt, val) =>
          Number(opt?.COMPETITION_ID) === Number(val?.COMPETITION_ID)
        }
        onChange={(_, newValue) => {
          onRowChange(index, { COMPETITION_ID: newValue?.COMPETITION_ID ?? '', SEASON_NUM: '', STAGE_NUM: '' });
        }}
        renderInput={(params) => (
          <TextField {...params} label="Competition" size="small" />
        )}
      />
      <Autocomplete
        size="small"
        sx={{ minWidth: 160 }}
        options={seasons}
        getOptionLabel={(option) =>
          option.name || `Season ${option.SEASON_NUM}`
        }
        value={
          seasons.find((s) => Number(s.SEASON_NUM) === Number(row.SEASON_NUM)) || null
        }
        isOptionEqualToValue={(opt, val) =>
          Number(opt?.SEASON_NUM) === Number(val?.SEASON_NUM)
        }
        onChange={(_, newValue) => {
          onRowChange(index, { SEASON_NUM: newValue?.SEASON_NUM ?? '', STAGE_NUM: '' });
        }}
        disabled={!row.COMPETITION_ID}
        loading={loadingSeasons}
        renderInput={(params) => (
          <TextField {...params} label="Season" size="small" />
        )}
      />
      <Autocomplete
        size="small"
        sx={{ minWidth: 160 }}
        options={stages}
        getOptionLabel={(option) =>
          option.name || `Stage ${option.STAGE_NUM}`
        }
        value={
          stages.find((s) => Number(s.STAGE_NUM) === Number(row.STAGE_NUM)) || null
        }
        isOptionEqualToValue={(opt, val) =>
          Number(opt?.STAGE_NUM) === Number(val?.STAGE_NUM)
        }
        onChange={(_, newValue) => {
          onRowChange(index, 'STAGE_NUM', newValue?.STAGE_NUM ?? '');
        }}
        disabled={!row.COMPETITION_ID || !row.SEASON_NUM}
        loading={loadingStages}
        renderInput={(params) => (
          <TextField {...params} label="Stage" size="small" />
        )}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Table Type</InputLabel>
        <Select
          value={row.TABLE_TYPE_ID}
          label="Table Type"
          onChange={(e) => onRowChange(index, 'TABLE_TYPE_ID', e.target.value)}
        >
          {(tableTypes || []).map((tt) => (
            <MenuItem key={tt.TABLE_TYPE_ID} value={tt.TABLE_TYPE_ID}>
              {tt.ALIAS_NAME}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <IconButton
        size="small"
        color="error"
        onClick={() => onDelete(index)}
        sx={{ ml: 0.5 }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function TableSettingsEditor({
  value,
  onChange,
  label,
  competitions,
  tableTypes,
  competitionSportTypeId,
  competitionCountryId,
}) {
  const [rows, setRows] = useState(() => parseSettingsString(value));
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      setRows(parseSettingsString(value));
    }
  }, [value]);

  const filteredCompetitions = (competitions || []).filter(
    (c) =>
      competitionCountryId != null &&
      Number(c.COUNTRY_ID) === Number(competitionCountryId) &&
      competitionSportTypeId != null &&
      Number(c.SPORT_TYPE_ID) === Number(competitionSportTypeId)
  );

  const updateRows = useCallback((newRows) => {
    setRows(newRows);
    if (newRows.length === 0) {
      lastExternalValue.current = null;
      onChange(null);
    } else {
      const serialized = serializeSettings(newRows);
      lastExternalValue.current = serialized;
      onChange(serialized);
    }
  }, [onChange]);

  const handleRowChange = useCallback((index, fieldOrUpdates, val) => {
    setRows((prev) => {
      const newRows = [...prev];
      if (typeof fieldOrUpdates === 'object') {
        newRows[index] = { ...newRows[index], ...fieldOrUpdates };
      } else {
        newRows[index] = { ...newRows[index], [fieldOrUpdates]: val };
      }
      if (newRows.length === 0) {
        lastExternalValue.current = null;
        onChange(null);
      } else {
        const serialized = serializeSettings(newRows);
        lastExternalValue.current = serialized;
        onChange(serialized);
      }
      return newRows;
    });
  }, [onChange]);

  const handleAddRow = () => {
    setRows((prev) => [...prev, { COMPETITION_ID: '', SEASON_NUM: '', STAGE_NUM: '', TABLE_TYPE_ID: '' }]);
  };

  const handleDeleteRow = useCallback((index) => {
    setRows((prev) => {
      const newRows = prev.filter((_, i) => i !== index);
      if (newRows.length === 0) {
        lastExternalValue.current = null;
        onChange(null);
      } else {
        const serialized = serializeSettings(newRows);
        lastExternalValue.current = serialized;
        onChange(serialized);
      }
      return newRows;
    });
  }, [onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        {label}
      </Typography>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No entries configured. Click "Add Row" to begin.
        </Typography>
      )}
      {rows.map((row, index) => (
        <TableSettingsRow
          key={index}
          row={row}
          index={index}
          filteredCompetitions={filteredCompetitions}
          tableTypes={tableTypes}
          onRowChange={handleRowChange}
          onDelete={handleDeleteRow}
        />
      ))}
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddRow}
        sx={{ mt: 1, textTransform: 'none' }}
      >
        Add Row
      </Button>
    </Paper>
  );
}
