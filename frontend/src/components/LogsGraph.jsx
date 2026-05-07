import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';

const SEVERITY_COLORS = {
  Info: '#1976d2',
  Error: '#e53935',
  Warning: '#fbc02d',
  Debug: '#43a047',
  Verbose: '#8e24aa',
};

const RANGES = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '24h', label: '24h' },
];

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return String(n);
}

function formatTickLabel(ts, range) {
  const d = new Date(ts);
  if (range === '24h') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LogsGraph({ scannerId }) {
  const [range, setRange] = useState('1h');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getScannerLogsSummary(scannerId, range);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (scannerId) load();
    return () => { cancelled = true; };
  }, [scannerId, range]);

  const chartGeometry = useMemo(() => {
    if (!data) return null;
    const W = 800;
    const H = 240;
    const padL = 50;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const buckets = data.buckets;
    const n = buckets.length;

    let yMax = 0;
    for (const b of buckets) {
      for (const sev of data.severities) {
        if (b[sev] > yMax) yMax = b[sev];
      }
    }
    yMax = Math.max(10, Math.ceil(yMax * 1.1));
    // round yMax up to "nice" number
    const niceStep = Math.pow(10, Math.floor(Math.log10(yMax)));
    yMax = Math.ceil(yMax / niceStep) * niceStep;

    const xFor = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
    const yFor = (v) => padT + innerH - (v / yMax) * innerH;

    const seriesPaths = {};
    for (const sev of data.severities) {
      let d = '';
      buckets.forEach((b, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        d += `${cmd}${xFor(i).toFixed(1)},${yFor(b[sev]).toFixed(1)} `;
      });
      seriesPaths[sev] = d;
    }

    // Y-axis grid lines (5 ticks)
    const yTicks = [];
    for (let t = 0; t <= 5; t++) {
      const v = (yMax / 5) * t;
      yTicks.push({ v, y: yFor(v) });
    }

    // X-axis ticks: ~6 evenly spaced
    const xTickCount = 6;
    const xTicks = [];
    for (let t = 0; t < xTickCount; t++) {
      const i = Math.round((t / (xTickCount - 1)) * (n - 1));
      xTicks.push({ i, x: xFor(i), label: formatTickLabel(buckets[i].ts, data.range) });
    }

    return { W, H, padL, padR, padT, padB, innerW, innerH, yMax, xFor, yFor, seriesPaths, yTicks, xTicks, n };
  }, [data]);

  function handleMouseMove(e) {
    if (!chartGeometry || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xPx = xRatio * chartGeometry.W;
    const { padL, innerW, n } = chartGeometry;
    const rel = (xPx - padL) / innerW;
    if (rel < 0 || rel > 1) { setHoverIdx(null); return; }
    setHoverIdx(Math.round(rel * (n - 1)));
  }

  const hoverBucket = data && hoverIdx != null ? data.buckets[hoverIdx] : null;

  return (
    <Paper sx={{ p: 3, mb: 2, boxShadow: 1, border: '1px solid #e0e0e0', backgroundColor: 'white' }}>
      <Box
        sx={{
          mb: 2, pb: 1, borderBottom: '2px solid #e0e0e0',
          backgroundColor: '#f5f5f5', px: 2, py: 1, mx: -3, mt: -3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Logs</Typography>
          {data?.isMock && (
            <Tooltip title={data.mockReason || 'Using simulated data'}>
              <Chip label="Mock data" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#fff3cd', color: '#856404', cursor: 'help' }} />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup
            size="small" value={range} exclusive
            onChange={(_, v) => v && setRange(v)}
            sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.25, textTransform: 'none', fontSize: 12 } }}
          >
            {RANGES.map((r) => (
              <ToggleButton key={r.value} value={r.value}>{r.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => setRange((r) => r)} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {data?.coralogixUrl && (
            <Button
              size="small" variant="outlined" endIcon={<OpenInNewIcon />}
              href={data.coralogixUrl} target="_blank" rel="noopener noreferrer"
              sx={{ textTransform: 'none', borderColor: '#1976d2', color: '#1976d2' }}
            >
              View in Coralogix
            </Button>
          )}
        </Box>
      </Box>

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">{error}</Typography>
        </Box>
      )}

      {data && chartGeometry && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0, position: 'relative' }}>
            <Box sx={{ fontSize: 12, color: '#616161', mb: 0.5 }}>
              Count grouped by Severity · subsystem: <strong>{data.subsystem}</strong>
            </Box>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartGeometry.W} ${chartGeometry.H}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: 240, display: 'block' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {chartGeometry.yTicks.map((t, idx) => (
                <g key={`y${idx}`}>
                  <line
                    x1={chartGeometry.padL} x2={chartGeometry.W - chartGeometry.padR}
                    y1={t.y} y2={t.y}
                    stroke="#eeeeee" strokeWidth={1}
                  />
                  <text
                    x={chartGeometry.padL - 6} y={t.y + 3}
                    fontSize={10} fill="#9e9e9e" textAnchor="end"
                  >
                    {formatNumber(Math.round(t.v))}
                  </text>
                </g>
              ))}
              {chartGeometry.xTicks.map((t, idx) => (
                <text
                  key={`x${idx}`}
                  x={t.x} y={chartGeometry.H - 8}
                  fontSize={10} fill="#9e9e9e" textAnchor="middle"
                >
                  {t.label}
                </text>
              ))}
              {data.severities.map((sev) => (
                <path
                  key={sev}
                  d={chartGeometry.seriesPaths[sev]}
                  fill="none"
                  stroke={SEVERITY_COLORS[sev]}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {hoverIdx != null && (
                <line
                  x1={chartGeometry.xFor(hoverIdx)} x2={chartGeometry.xFor(hoverIdx)}
                  y1={chartGeometry.padT} y2={chartGeometry.H - chartGeometry.padB}
                  stroke="#bdbdbd" strokeWidth={1} strokeDasharray="3 3"
                />
              )}
              {hoverIdx != null && data.severities.map((sev) => (
                <circle
                  key={`dot-${sev}`}
                  cx={chartGeometry.xFor(hoverIdx)}
                  cy={chartGeometry.yFor(data.buckets[hoverIdx][sev])}
                  r={3}
                  fill={SEVERITY_COLORS[sev]}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </svg>
            {hoverBucket && (
              <Box
                sx={{
                  position: 'absolute', top: 8, right: 8,
                  bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 1,
                  p: 1, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  pointerEvents: 'none', minWidth: 140,
                }}
              >
                <Box sx={{ color: '#616161', mb: 0.5 }}>{formatTickLabel(hoverBucket.ts, data.range)}</Box>
                {data.severities.map((sev) => (
                  <Box key={sev} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SEVERITY_COLORS[sev] }} />
                      <span>{sev}</span>
                    </Box>
                    <strong>{formatNumber(hoverBucket[sev])}</strong>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 240px' }, minWidth: 220 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', columnGap: 1, rowGap: 0.5, fontSize: 11 }}>
              <Box sx={{ color: '#9e9e9e', fontWeight: 600 }}>Name</Box>
              <Box sx={{ color: '#9e9e9e', fontWeight: 600, textAlign: 'right' }}>Min</Box>
              <Box sx={{ color: '#9e9e9e', fontWeight: 600, textAlign: 'right' }}>Max</Box>
              <Box sx={{ color: '#9e9e9e', fontWeight: 600, textAlign: 'right' }}>Avg</Box>
              <Box sx={{ color: '#9e9e9e', fontWeight: 600, textAlign: 'right' }}>Sum</Box>
              {data.severities.map((sev) => {
                const t = data.totals[sev];
                return (
                  <React.Fragment key={sev}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SEVERITY_COLORS[sev], flexShrink: 0 }} />
                      <span>{sev}</span>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>{formatNumber(t.min)}</Box>
                    <Box sx={{ textAlign: 'right' }}>{formatNumber(t.max)}</Box>
                    <Box sx={{ textAlign: 'right' }}>{formatNumber(t.avg)}</Box>
                    <Box sx={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(t.sum)}</Box>
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
