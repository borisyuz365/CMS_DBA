import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RadarIcon from '@mui/icons-material/Radar';

function ScannersPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <RadarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Scanners v1
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This page has been replaced by the new Scanners interface.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/scanners-v2')}
      >
        Go to Scanners v2
      </Button>
    </Box>
  );
}

export default ScannersPage;
