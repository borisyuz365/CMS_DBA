import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SecondaryButton from '../../../reuse/SecondaryButton';
import api from '../../services/api';

const formatDateIL = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const AuditLogDialog = ({
  open,
  onClose,
  priorityRow,
  dsLookup = {},
  utLookup = {},
  resolveCutValue,
}) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !priorityRow) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getPriorityHistory({
          data_source: priorityRow.DATA_SOURCE,
          update_type: priorityRow.UPDATE_TYPE,
          cut_type: priorityRow.CUT_TYPE,
          cut_value: priorityRow.CUT_VALUE,
        });
        setHistory(data);
      } catch (error) {
        console.error('Error fetching priority history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, priorityRow]);

  const CUT_TYPE_MAP = { 1: 'Game', 2: 'Competition', 3: 'Country' };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: '1.25rem',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'inherit' }}>
          Priority Change History
          {priorityRow && (
            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
              — {dsLookup[priorityRow.DATA_SOURCE] || priorityRow.DATA_SOURCE} / {utLookup[priorityRow.UPDATE_TYPE] || priorityRow.UPDATE_TYPE} / {CUT_TYPE_MAP[priorityRow.CUT_TYPE]} : {resolveCutValue ? resolveCutValue(priorityRow.CUT_TYPE, priorityRow.CUT_VALUE) : priorityRow.CUT_VALUE}
            </Typography>
          )}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No history entries found for this priority.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 1, maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Update Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority Level</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cut Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cut Value</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Comment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>After Expired</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((entry, index) => {
                  const isDeleted = entry.COMMENT && entry.COMMENT.startsWith('[DELETED]');
                  return (
                    <TableRow key={index} hover sx={isDeleted ? { bgcolor: 'error.50', opacity: 0.85 } : {}}>
                      <TableCell>{formatDateIL(entry.UPDATE_TIME)}</TableCell>
                      <TableCell>
                        {entry.USER_NAME ? (
                          <Chip label={entry.USER_NAME} size="small" color="primary" />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.PRIORITY_LEVEL}
                          size="small"
                          color={entry.PRIORITY_LEVEL === 6 ? 'success' : entry.PRIORITY_LEVEL === -1 ? 'error' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{CUT_TYPE_MAP[entry.CUT_TYPE] || entry.CUT_TYPE}</TableCell>
                      <TableCell>{resolveCutValue ? resolveCutValue(entry.CUT_TYPE, entry.CUT_VALUE) : entry.CUT_VALUE}</TableCell>
                      <TableCell sx={isDeleted ? { color: 'error.main', fontWeight: 600 } : {}}>
                        {entry.COMMENT || '-'}
                      </TableCell>
                      <TableCell>{formatDateIL(entry.START_DATE)}</TableCell>
                      <TableCell>{formatDateIL(entry.EXPIRATION_DATE)}</TableCell>
                      <TableCell>{entry.AFTER_EXPIRED_PRIORITY ?? '-'}</TableCell>
                      <TableCell>{entry.SCHEDULE_PRIORITY ?? '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default AuditLogDialog;
