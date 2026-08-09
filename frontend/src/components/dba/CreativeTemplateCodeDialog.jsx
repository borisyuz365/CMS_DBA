// CreativeTemplateCodeDialog — shows the raw Google Ad Manager CreativeTemplate
// that would be uploaded for an ad format, plus the declared variables and a
// sample per-market Creative. Read-only inspection / copy-to-clipboard.
//
// Tabs:
//   - HTML snippet     — the literal `snippet` payload (CreativeTemplate body)
//   - Variables        — declared variables with type + description
//   - Sample creative  — variable values for the first targeted (bookmaker, country)
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tabs, Tab,
  Box, Button, Typography, Stack, Chip, CircularProgress, Alert, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import apiService from '../../services/api';

// Minimal monospace block with line numbers. Used for the snippet view.
function CodeBlock({ code, lang = 'html' }) {
  const lines = useMemo(() => code.split('\n'), [code]);
  return (
    <Box sx={{
      bgcolor: '#0F1419', color: '#E5E5E5',
      borderRadius: 1.5, overflow: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 12, lineHeight: 1.55,
      maxHeight: 480,
      border: '1px solid #1F2933',
    }}>
      <Box sx={{ display: 'flex' }}>
        <Box component="pre" sx={{
          m: 0, py: 1.5, pl: 1.5, pr: 1,
          color: '#5C6873', textAlign: 'right',
          userSelect: 'none', minWidth: 36,
          borderRight: '1px solid #1F2933',
        }}>{lines.map((_, i) => `${i + 1}\n`).join('')}</Box>
        <Box component="pre" sx={{ m: 0, p: 1.5, flex: 1, whiteSpace: 'pre' }}>{code}</Box>
      </Box>
      <Box component="span" sx={{ display: 'none' }}>{lang /* future syntax-highlighter hook */}</Box>
    </Box>
  );
}

function CopyButton({ getText, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  return (
    <Button
      size="small" variant="outlined"
      startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      onClick={handle}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}

export default function CreativeTemplateCodeDialog({ open, onClose, templateId }) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !templateId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    apiService.getDbaGamPreview(templateId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, templateId]);

  const ct = data?.creativeTemplate;
  const creatives = data?.creatives || [];
  const sampleCreative = creatives[0];
  const validation = data?.validation || { errors: [], warnings: [] };
  const bakeChecks = ct?.bakeValidation?.checks || [];
  const feedValidation = data?.feedValidation;
  const bakedInline = ct?.bakedInline || sampleCreative?.inlineValues || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Creative Template Code
        {ct?.name && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            <Box component="span">{ct.name}</Box>
            <Chip label={ct.operation} size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
            <Chip label={ct.type} size="small" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
            {ct.sourceFile && (
              <Box component="code" sx={{ ml: 1, fontSize: 11, color: 'text.disabled' }}>
                gam/templates/{ct.sourceFile}
              </Box>
            )}
          </Typography>
        )}
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1 }}>
        {loading && (
          <Stack direction="row" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && ct && (ct.bakeValidation?.ok === false) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Preview ↔ snippet mismatch:</strong> some editor values may be missing from the exported HTML.
            See the alignment table below.
          </Alert>
        )}

        {!loading && !error && feedValidation && (
          <Alert severity={feedValidation.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
            <strong>Games feed:</strong>{' '}
            {feedValidation.ok
              ? `${feedValidation.gameCount} game(s) returned${feedValidation.sampleGame ? ` — e.g. ${feedValidation.sampleGame}` : ''}`
              : feedValidation.error}
            {feedValidation.feedUrl && (
              <Box component="div" sx={{ mt: 0.5, fontSize: 11, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
                {feedValidation.feedUrl}
              </Box>
            )}
          </Alert>
        )}

        {!loading && !error && bakeChecks.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview ↔ snippet alignment</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Setting</TableCell>
                  <TableCell>Baked value</TableCell>
                  <TableCell sx={{ width: 72 }}>In snippet</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bakeChecks.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell sx={{ fontSize: 13 }}>{c.label}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all', maxWidth: 360 }}>
                      {String(c.expected).slice(0, 120)}{String(c.expected).length > 120 ? '…' : ''}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.ok ? 'OK' : 'Missing'}
                        size="small"
                        color={c.ok ? 'success' : 'error'}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {Object.keys(bakedInline).length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Logo: {bakedInline.bookmaker_logo_url ? 'baked' : 'missing'} · Legal layout: {bakedInline.disclaimer_layout || '—'}
              </Typography>
            )}
          </Box>
        )}

        {!loading && !error && ct && (ct.remainingMacros || []).some((m) => m !== 'cta_url') && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Snippet not fully baked:</strong> GAM will reject placeholders{' '}
            {(ct.remainingMacros || []).filter((m) => m !== 'cta_url').map((m) => `[${m}]`).join(', ')}.
            Assign a bookmaker and countries, then re-open this dialog and copy again.
          </Alert>
        )}

        {!loading && !error && ct && (ct.remainingMacros || []).length === 1 && ct.remainingMacros[0] === 'cta_url' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Paste into GAM with one template variable: <Box component="code" sx={{ fontSize: 12 }}>cta_url</Box> (URL, required).
            All colors and legal copy are already baked into the HTML.
          </Alert>
        )}

        {!loading && !error && data && validation.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Cannot build template:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Alert>
        )}

        {!loading && !error && validation.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>{validation.warnings.length} warning{validation.warnings.length === 1 ? '' : 's'}:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
              {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Alert>
        )}

        {!loading && !error && ct && (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="HTML snippet" />
              <Tab label={`Variables (${ct.variables?.length || 0})`} />
              <Tab label={`Sample creative${creatives.length ? ` (${creatives.length} market${creatives.length === 1 ? '' : 's'})` : ''}`} />
            </Tabs>

            {tab === 0 && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {ct.snippet.length.toLocaleString()} chars · {ct.snippet.split('\n').length} lines
                    {(ct.remainingMacros || []).length > 0 ? (
                      <>
                        {' '}· remaining macros:{' '}
                        {(ct.remainingMacros || []).map((name, i) => (
                          <React.Fragment key={name}>
                            {i > 0 ? ', ' : null}
                            <Box component="code" sx={{ fontSize: 11 }}>[%{name}%]</Box>
                          </React.Fragment>
                        ))}
                      </>
                    ) : (
                      <> · no [%…%] macros left in snippet</>
                    )}
                  </Typography>
                  <CopyButton getText={() => ct.snippet} label="Copy snippet" />
                </Stack>
                <CodeBlock code={ct.snippet} />
              </Box>
            )}

            {tab === 1 && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Variables declared on the CreativeTemplate (only cta_url — colors, legal, and branding are baked into the HTML)
                  </Typography>
                  <CopyButton getText={() => JSON.stringify(ct.variables, null, 2)} label="Copy JSON" />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Required</TableCell>
                      <TableCell>Label · description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ct.variables.map((v) => (
                      <TableRow key={v.uniqueName}>
                        <TableCell>
                          <Box component="code" sx={{ fontSize: 12 }}>{v.uniqueName}</Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={v.type} size="small" sx={{ height: 18, fontSize: 10 }} />
                        </TableCell>
                        <TableCell>{v.isRequired ? 'yes' : 'no'}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{v.label}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{v.description}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {tab === 2 && (
              sampleCreative ? (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      GAM variable values for the first targeted market ·
                      <Box component="span" sx={{ ml: 0.5, fontWeight: 500 }}>
                        {sampleCreative.market.bookmakerId} / {sampleCreative.market.country} (lang {sampleCreative.market.languageId})
                      </Box>
                      {' '}· other fields are baked into the HTML snippet
                    </Typography>
                    <CopyButton getText={() => JSON.stringify(sampleCreative, null, 2)} label="Copy JSON" />
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 220 }}>Variable</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleCreative.creativeTemplateVariableValues.map((v) => (
                        <TableRow key={v.uniqueName}>
                          <TableCell>
                            <Box component="code" sx={{ fontSize: 12 }}>{v.uniqueName}</Box>
                          </TableCell>
                          <TableCell sx={{ wordBreak: 'break-all', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
                            {v.value === '' ? <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>(empty)</Box> : v.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {creatives.length > 1 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Other markets ({creatives.length - 1}): {creatives.slice(1).map((c) => `${c.market.bookmakerId}/${c.market.country}`).join(', ')}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Alert severity="info">
                  No targeted markets to produce a sample Creative — assign a bookmaker and at least one country to this template.
                </Alert>
              )
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
