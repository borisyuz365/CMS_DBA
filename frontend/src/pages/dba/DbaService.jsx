import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, Stack, Snackbar, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import FlashOnIcon from '@mui/icons-material/FlashOn';

import { DBA_INITIAL_SERVICE_STATE, DBA_AUDIT_LOG } from '../../data/dbaData';
import { StatusPill } from '../../components/dba/DbaPrimitives';
import { fmtBytes, fmtDateTime, fmtUptime, relTime } from '../../components/dba/dbaUtils';

export default function DbaService() {
  const [state, setState] = useState(DBA_INITIAL_SERVICE_STATE);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Tick uptime + cooldown every second.
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => ({
        ...s,
        uptimeSec: s.status === 'running' ? s.uptimeSec + 1 : s.uptimeSec,
        cooldownRemainingSec: Math.max(0, s.cooldownRemainingSec - 1),
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setToast({ kind: 'success', msg: 'Status refreshed' }); }, 600);
  };

  const handleRestart = () => {
    setConfirmRestart(false);
    setState((s) => ({ ...s, status: 'restarting', cooldownRemainingSec: 0 }));
    setTimeout(() => {
      setState({
        status: 'running',
        lastRestartAt: new Date().toISOString(),
        lastRestartBy: 'D. Benvelgy',
        cacheSizeBytes: 0,
        uptimeSec: 0,
        cooldownRemainingSec: 120,
      });
      setToast({ kind: 'success', msg: 'Service restarted' });
    }, 4000);
  };

  const { status, lastRestartAt, lastRestartBy, cacheSizeBytes, uptimeSec, cooldownRemainingSec } = state;
  const restartDisabled = status === 'restarting' || cooldownRemainingSec > 0;

  return (
    <Box sx={{ p: 4, maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>DBA Service Management</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Service health, cache state, and restart controls for the DBA pipeline.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
        {/* Status card */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                Service Status
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <StatusPill
                  kind={status === 'running' ? 'running' : status === 'restarting' ? 'restarting' : 'down'}
                  label={status === 'running' ? 'Running' : status === 'restarting' ? 'Restarting…' : 'Down'}
                />
                {status === 'restarting' && <CircularProgress size={16} thickness={5} sx={{ color: '#FFA726' }} />}
              </Stack>
            </Box>
            <Button variant="outlined" onClick={handleRefresh} disabled={refreshing}
              startIcon={<RefreshIcon sx={{ animation: refreshing ? 'dbaSpin 0.8s linear' : 'none', '@keyframes dbaSpin': { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } } }} />}>
              Refresh Status
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
            <Metric icon={<AccessTimeIcon fontSize="small" />} label="Uptime" value={status === 'restarting' ? '—' : fmtUptime(uptimeSec)} />
            <Metric icon={<StorageIcon fontSize="small" />} label="Cache size" value={fmtBytes(cacheSizeBytes)} />
            <Metric icon={<MemoryIcon fontSize="small" />} label="Active ad slots" value="1,284" />
          </Box>

          <Box sx={{ pt: 3, borderTop: '1px solid #E5E5E5' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              Restart Controls
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" sx={{ gap: 2 }}>
              <Tooltip title={cooldownRemainingSec > 0 ? `Please wait ${cooldownRemainingSec}s` : ''}>
                <span>
                  <Button color="error" variant="contained" size="large" startIcon={<PowerSettingsNewIcon />}
                    disabled={restartDisabled} onClick={() => setConfirmRestart(true)}>
                    {status === 'restarting' ? 'Restarting…' : 'Restart Service'}
                  </Button>
                </span>
              </Tooltip>
              {cooldownRemainingSec > 0 && (
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 13, color: 'text.secondary' }}>
                  <AccessTimeIcon fontSize="inherit" />
                  <Box component="span">Cooldown: {cooldownRemainingSec}s remaining</Box>
                </Stack>
              )}
              <Typography sx={{ ml: 'auto', fontSize: 13, color: 'text.secondary' }}>
                Last restart: <Box component="strong" sx={{ color: 'text.primary', fontWeight: 500 }}>{fmtDateTime(lastRestartAt)}</Box> · by {lastRestartBy}
              </Typography>
            </Stack>
            <Typography sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>
              Restarting clears the ad cache, releases memory, and refreshes affiliate links. Service will be unavailable for 30–60 seconds.
            </Typography>
          </Box>
        </Paper>

        {/* Audit log card */}
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E5E5E5', fontSize: 13, fontWeight: 600 }}>
            Recent activity
          </Box>
          <Box sx={{ py: 1, maxHeight: 400, overflow: 'auto' }}>
            {DBA_AUDIT_LOG.map((e, i) => {
              const palette =
                e.kind === 'restart' ? { bg: '#FFF3E0', fg: '#F57C00', icon: <PowerSettingsNewIcon sx={{ fontSize: 14 }} /> }
              : e.kind === 'publish' ? { bg: '#EFF6FF', fg: '#1976D2', icon: <FlashOnIcon sx={{ fontSize: 14 }} /> }
              : e.kind === 'edit'    ? { bg: '#F5F5F5', fg: '#737373', icon: <EditIcon sx={{ fontSize: 14 }} /> }
              :                        { bg: '#F5F5F5', fg: '#737373', icon: <AddIcon sx={{ fontSize: 14 }} /> };
              return (
                <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 2.5, py: 1.25 }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: 999,
                    bgcolor: palette.bg, color: palette.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{palette.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.35 }}>{e.text}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{e.who} · {relTime(e.when)}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Box>
        </Paper>
      </Box>

      <Dialog open={confirmRestart} onClose={() => setConfirmRestart(false)}>
        <DialogTitle>Restart DBA service?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Restarting will <strong>temporarily interrupt ad serving for 30–60 seconds</strong>. Active campaigns may briefly stop delivering. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestart(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleRestart}>Restart now</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.kind === 'error' ? 'error' : 'success'} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

function Metric({ icon, label, value }) {
  return (
    <Box sx={{ bgcolor: '#F5F5F5', borderRadius: 1.5, p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 500, mb: 1 }}>
        {icon}
        <Box component="span">{label}</Box>
      </Stack>
      <Typography sx={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}
