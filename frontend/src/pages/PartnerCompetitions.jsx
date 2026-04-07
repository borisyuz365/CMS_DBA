import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Snackbar,
  Alert as MuiAlert,
  Autocomplete,
  FormControl,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LoadingSpinner from '../../reuse/LoadingSpinner';
import Alert from '../../reuse/Alert';
import api from '../services/api';

const pidColumns = [
  { field: 'dataSourceName', header: 'Data Source', width: 180 },
  { field: 'PARTNER_ID', header: 'Partner ID', width: 140 },
  { field: 'CREATE_TIME', header: 'Create Date', width: 150 },
  { field: 'UPDATE_BY', header: 'Last Update By', width: 140 },
  { field: 'UPDATE_TIME', header: 'Last Update Time', width: 150 },
];

function PartnerCompetitions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const competitionId = Number(id);

  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entries, setEntries] = useState([]);
  const [dataSources, setDataSources] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [newDataSourceId, setNewDataSourceId] = useState('');
  const [newPartnerId, setNewPartnerId] = useState('');
  const [dirty, setDirty] = useState(false);

  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [groupByField, setGroupByField] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 25 });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compData, pidData, ds] = await Promise.all([
        api.getCompetitions({}),
        api.getPartnerIdCompetitions(competitionId),
        api.getDataSources(),
      ]);
      const comp = (compData || []).find((c) => c.COMPETITION_ID === competitionId);
      setCompetition(comp || null);
      setEntries((pidData || []).map((r, i) => ({ ...r, _idx: i })));
      setDataSources(ds || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (idx, field, value) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (!next[idx]) next[idx] = {};
      next[idx][field] = value;
      return next;
    });
    setDirty(true);
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleGroupBy = (field) => {
    if (groupByField === field) {
      setGroupByField(null);
      setExpandedGroups(new Set());
    } else {
      setGroupByField(field);
      setExpandedGroups(new Set());
    }
  };

  const handleToggleGroup = (k) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleToggleEditMode = () => {
    if (editMode) {
      if (dirty && !window.confirm('You have unsaved changes. Cancel anyway?')) return;
      setPendingChanges({});
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleAddEntry = () => {
    if (newDataSourceId === '' || newDataSourceId == null) return;
    const ds = dataSources.find((d) => d.DATA_SOURCE_ID === Number(newDataSourceId));
    const now = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    const newEntry = {
      COMPETITION_ID: competitionId,
      DATA_SOURCE_ID: Number(newDataSourceId),
      PARTNER_ID: newPartnerId.trim() || null,
      CREATE_TIME: now,
      UPDATE_TIME: now,
      UPDATE_BY: 'DanielBelgi',
      dataSourceName: ds ? ds.ALIAS_NAME || `DS ${ds.DATA_SOURCE_ID}` : null,
      _idx: entries.length,
    };
    setEntries((prev) => [...prev, newEntry]);
    setNewDataSourceId('');
    setNewPartnerId('');
    setDirty(true);
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Delete ${selectedRows.length} selected mapping(s)?`)) return;
    setEntries((prev) => prev.filter((_, i) => !selectedRows.includes(i)).map((r, i) => ({ ...r, _idx: i })));
    const newPending = {};
    Object.entries(pendingChanges).forEach(([k, v]) => {
      if (!selectedRows.includes(Number(k))) newPending[k] = v;
    });
    setPendingChanges(newPending);
    setSelectedRows([]);
    setDirty(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const now = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
      const finalEntries = entries.map((entry, i) => {
        const changes = pendingChanges[i] || {};
        const wasEdited = Object.keys(changes).length > 0;
        return {
          DATA_SOURCE_ID: entry.DATA_SOURCE_ID,
          PARTNER_ID: changes.PARTNER_ID ?? entry.PARTNER_ID,
          CREATE_TIME: entry.CREATE_TIME,
          UPDATE_TIME: wasEdited ? now : entry.UPDATE_TIME,
          UPDATE_BY: wasEdited ? 'DanielBelgi' : entry.UPDATE_BY,
        };
      });
      const saved = await api.savePartnerIdsBulk(competitionId, finalEntries);
      setEntries((saved || []).map((r, i) => ({ ...r, _idx: i })));
      setPendingChanges({});
      setEditMode(false);
      setSelectedRows([]);
      setDirty(false);
      setSnackbar({ open: true, message: 'Partner IDs saved', severity: 'success' });
    } catch (err) {
      console.error('Failed to save partner IDs:', err);
      setSnackbar({ open: true, message: err.message || 'Failed to save partner IDs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...entries];
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (!val || !String(val).trim()) return;
      const term = String(val).toLowerCase().trim();
      list = list.filter((row) => {
        const v = row[field];
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return v === Number(term) || String(v).toLowerCase().includes(term);
        return String(v).toLowerCase().includes(term);
      });
    });
    if (sortConfig.field) {
      list.sort((a, b) => {
        const av = a[sortConfig.field];
        const bv = b[sortConfig.field];
        if (av == null) return 1;
        if (bv == null) return -1;
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (typeof av === 'string') return dir * String(av).localeCompare(String(bv));
        return dir * (Number(av) - Number(bv));
      });
    }
    return list;
  }, [entries, columnFilters, sortConfig]);

  const groupedAndPaginated = useMemo(() => {
    if (!groupByField) {
      const start = pagination.page * pagination.rowsPerPage;
      return filteredAndSorted.slice(start, start + pagination.rowsPerPage).map((row) => ({ type: 'row', data: row }));
    }
    const groups = {};
    filteredAndSorted.forEach((row) => {
      const k = String(row[groupByField] ?? 'Unknown');
      if (!groups[k]) groups[k] = [];
      groups[k].push(row);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      const an = Number(a), bn = Number(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a).localeCompare(String(b));
    });
    const out = [];
    keys.forEach((k) => {
      out.push({ type: 'group-header', groupKey: k, groupValue: groups[k][0][groupByField], count: groups[k].length, isExpanded: expandedGroups.has(k) });
      if (expandedGroups.has(k)) groups[k].forEach((r) => out.push({ type: 'row', data: r }));
    });
    const start = pagination.page * pagination.rowsPerPage;
    return out.slice(start, start + pagination.rowsPerPage);
  }, [filteredAndSorted, groupByField, pagination.page, pagination.rowsPerPage, expandedGroups]);

  const totalForPagination = useMemo(() => {
    if (!groupByField) return filteredAndSorted.length;
    let count = 0;
    const groups = {};
    filteredAndSorted.forEach((row) => {
      const k = String(row[groupByField] ?? 'Unknown');
      if (!groups[k]) groups[k] = [];
      groups[k].push(row);
    });
    Object.keys(groups).forEach((k) => {
      count += 1;
      if (expandedGroups.has(k)) count += groups[k].length;
    });
    return count;
  }, [filteredAndSorted, groupByField, expandedGroups]);

  if (loading && entries.length === 0 && !competition) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  const competitionName = competition?.name || `Competition ${competitionId}`;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/competitions/${competitionId}`)} sx={{ color: '#1976d2' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#000000', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
          Partner Competitions : {competitionName} ({competitionId})
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2, boxShadow: 1, backgroundColor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            size="small"
            options={dataSources}
            getOptionLabel={(o) => o.ALIAS_NAME || `DS ${o.DATA_SOURCE_ID}`}
            value={dataSources.find((d) => d.DATA_SOURCE_ID === Number(newDataSourceId)) || null}
            onChange={(e, v) => setNewDataSourceId(v ? v.DATA_SOURCE_ID : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Data Source"
                sx={{ '& .MuiInputBase-root': { height: 36, fontSize: '0.8125rem' } }}
              />
            )}
            sx={{ minWidth: 220 }}
            disableClearable={false}
          />
          <TextField
            size="small"
            label="Partner ID"
            value={newPartnerId}
            onChange={(e) => setNewPartnerId(e.target.value)}
            sx={{
              minWidth: 160,
              '& .MuiInputBase-root': { height: 36, fontSize: '0.8125rem' },
            }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddEntry}
            disabled={newDataSourceId === '' || newDataSourceId == null}
            sx={{ backgroundColor: '#1976d2', textTransform: 'none', height: 36 }}
          >
            Add
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 2, backgroundColor: '#ffffff' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner />
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 'max-content', '& .MuiTableCell-root': { borderColor: '#EAECF0', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' } }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#fff', borderColor: '#EAECF0', position: 'sticky', top: 0, zIndex: 12, py: 1, px: 1.5, whiteSpace: 'nowrap' } }}>
                  {editMode && (
                    <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                      <Checkbox
                        size="small"
                        indeterminate={selectedRows.length > 0 && selectedRows.length < groupedAndPaginated.filter((i) => i.type === 'row').length}
                        checked={groupedAndPaginated.filter((i) => i.type === 'row').length > 0 && selectedRows.length === groupedAndPaginated.filter((i) => i.type === 'row').length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRows(groupedAndPaginated.filter((i) => i.type === 'row').map((i) => i.data._idx));
                          else setSelectedRows([]);
                        }}
                      />
                    </TableCell>
                  )}
                  {pidColumns.map((col) => (
                    <TableCell key={col.field} sx={{ borderColor: '#EAECF0', width: col.width, minWidth: col.width, whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{col.header}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleGroupBy(col.field)} title={groupByField === col.field ? 'Ungroup' : 'Group'}>
                              <ViewListIcon sx={{ fontSize: 12, color: groupByField === col.field ? '#1976d2' : '#ccc' }} />
                            </IconButton>
                            <IconButton size="small" sx={{ p: 0 }} onClick={() => handleSort(col.field)}>
                              <ArrowUpwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'asc' ? '#1976d2' : '#ccc' }} />
                            </IconButton>
                            <IconButton size="small" sx={{ p: 0 }} onClick={() => handleSort(col.field)}>
                              <ArrowDownwardIcon sx={{ fontSize: 10, color: sortConfig.field === col.field && sortConfig.direction === 'desc' ? '#1976d2' : '#ccc' }} />
                            </IconButton>
                          </Box>
                        </Box>
                        <TextField
                          size="small"
                          placeholder="Filter"
                          value={columnFilters[col.field] || ''}
                          onChange={(e) => handleColumnFilterChange(col.field, e.target.value)}
                          sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.8125rem', bgcolor: '#F9FAFB' } }}
                        />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAndPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={pidColumns.length + (editMode ? 1 : 0)} align="center" sx={{ py: 4, borderColor: '#EAECF0' }}>
                      <Typography color="text.secondary">No partner ID mappings for this competition.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedAndPaginated.map((item, idx) => {
                    if (item.type === 'group-header') {
                      return (
                        <TableRow
                          key={`gh-${item.groupKey}-${idx}`}
                          sx={{ bgcolor: '#F5F5F5', '& td': { borderColor: '#EAECF0', fontWeight: 600 } }}
                          onClick={() => handleToggleGroup(item.groupKey)}
                        >
                          <TableCell colSpan={pidColumns.length + (editMode ? 1 : 0)} sx={{ cursor: 'pointer', borderColor: '#EAECF0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {item.isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                              <Typography sx={{ fontWeight: 600 }}>{pidColumns.find((c) => c.field === groupByField)?.header || groupByField}: {item.groupValue ?? 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">({item.count})</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const entry = item.data;
                    const globalIdx = entry._idx;
                    const changes = pendingChanges[globalIdx] || {};
                    return (
                      <TableRow key={`r-${globalIdx}-${idx}`} hover sx={{ '& td': { borderColor: '#EAECF0' } }}>
                        {editMode && (
                          <TableCell padding="checkbox" sx={{ borderColor: '#EAECF0' }}>
                            <Checkbox
                              size="small"
                              checked={selectedRows.includes(globalIdx)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRows((prev) => [...prev, globalIdx]);
                                else setSelectedRows((prev) => prev.filter((i) => i !== globalIdx));
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell sx={{ fontSize: '0.8125rem' }}>
                          {entry.dataSourceName || `DS ${entry.DATA_SOURCE_ID}`}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <TextField
                              size="small"
                              value={changes.PARTNER_ID ?? entry.PARTNER_ID ?? ''}
                              onChange={(e) => handleFieldChange(globalIdx, 'PARTNER_ID', e.target.value)}
                              sx={{ '& .MuiInputBase-root': { height: 32, fontSize: '0.8125rem' }, minWidth: 120 }}
                            />
                          ) : (
                            entry.PARTNER_ID ?? '—'
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{entry.CREATE_TIME || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{entry.UPDATE_BY || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem' }}>{entry.UPDATE_TIME || '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderTop: '1px solid #EAECF0', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant={editMode ? 'contained' : 'outlined'}
              size="small"
              startIcon={editMode ? <CancelIcon /> : <EditIcon />}
              onClick={handleToggleEditMode}
              sx={{
                borderColor: editMode ? 'transparent' : '#E0E0E0',
                backgroundColor: editMode ? '#1976d2' : '#ffffff',
                color: editMode ? '#fff' : '#000',
                textTransform: 'none',
              }}
            >
              {editMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {editMode && (
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!dirty || loading}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#15803d',
                  '&:hover': { backgroundColor: '#166534' },
                  '&.Mui-disabled': { backgroundColor: '#ccc' },
                }}
              >
                Save & Update In Service
              </Button>
            )}
            {editMode && selectedRows.length > 0 && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedRows.length} selected
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={handleBulkDelete}
                  sx={{ textTransform: 'none' }}
                >
                  Delete selected ({selectedRows.length})
                </Button>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              Items per page:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 70 }}>
              <Select
                value={pagination.rowsPerPage}
                onChange={(e) => setPagination((p) => ({ ...p, rowsPerPage: Number(e.target.value), page: 0 }))}
                sx={{ height: 32, fontSize: '0.8125rem' }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {totalForPagination === 0 ? '0' : `${pagination.page * pagination.rowsPerPage + 1}-${Math.min((pagination.page + 1) * pagination.rowsPerPage, totalForPagination)}`} of {totalForPagination}
            </Typography>
            <IconButton size="small" onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 0}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={(pagination.page + 1) * pagination.rowsPerPage >= totalForPagination}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default PartnerCompetitions;
