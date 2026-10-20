import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Typography } from '@mui/material';
import apiService from '../../services/api';
import DbaTemplateEditor from './DbaTemplateEditor';
import DbaThreeBmEditor from './DbaThreeBmEditor';

/** Routes edit to standard vs 3-bookie MPU editor based on template.kind. */
export default function DbaTemplateEditRouter() {
  const { id } = useParams();
  const [kind, setKind] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getDbaTemplate(id)
      .then((tpl) => {
        if (cancelled) return;
        const k = tpl?.kind || tpl?.config?.kind || 'standard';
        setKind(k === '3bm' ? '3bm' : 'standard');
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return <Box sx={{ p: 4 }}><Alert severity="error">Failed to load template: {error}</Alert></Box>;
  }
  if (!kind) {
    return <Box sx={{ p: 4 }}><Typography color="text.secondary">Loading editor…</Typography></Box>;
  }
  return kind === '3bm' ? <DbaThreeBmEditor /> : <DbaTemplateEditor />;
}
