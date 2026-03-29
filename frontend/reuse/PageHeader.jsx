import React from 'react';
import { Box, Typography, Stack, Chip, Tooltip } from '@mui/material';

const PageHeader = ({ 
  title, 
  subtitle, 
  actions, 
  badges = [], 
  sx = {} 
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
        ...sx 
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#222', 
            mb: subtitle ? 1 : 0 
          }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}
        
        {badges.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {badges.map((badge, index) => (
              <Tooltip key={index} title={badge.tooltip || ''} arrow>
                <Chip
                  label={badge.label}
                  color={badge.color || 'primary'}
                  variant={badge.variant || 'outlined'}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    height: 32,
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        )}
      </Box>
      
      {actions && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
