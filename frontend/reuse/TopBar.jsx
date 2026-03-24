import React, { useState } from 'react';
import { Box, Typography, Link, IconButton, Menu, MenuItem } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getBreadcrumbsForPath } from '../src/utils/breadcrumbRoutes';

const APP_VERSION = '3.4.0.017';

/**
 * TopBar - Header bar with breadcrumbs (left) and environment selector (right).
 * Breadcrumbs use " > " separator; last item is current page (no link).
 */
const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = getBreadcrumbsForPath(location.pathname);
  const [envAnchor, setEnvAnchor] = useState(null);
  const [environment, setEnvironment] = useState('Production');

  const handleEnvOpen = (e) => setEnvAnchor(e.currentTarget);
  const handleEnvClose = () => setEnvAnchor(null);
  const handleEnvSelect = (env) => {
    setEnvironment(env);
    handleEnvClose();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.25,
        minHeight: 48,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumbs - left */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <Typography component="span" sx={{ color: '#666', fontSize: '0.875rem', mx: 0.25 }}> &gt; </Typography>
              )}
              {isLast ? (
                <Typography sx={{ color: '#000', fontWeight: 500, fontSize: '0.875rem' }}>{item.label}</Typography>
              ) : (
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => item.path != null && navigate(item.path)}
                  sx={{
                    color: '#000',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: item.path ? 'pointer' : 'default',
                    '&:hover': { textDecoration: item.path ? 'underline' : 'none' },
                  }}
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Environment - right */}
      <IconButton
        onClick={handleEnvOpen}
        size="small"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textTransform: 'none',
          color: '#000',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 0.5,
            backgroundColor: '#1a1a1a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          365
        </Box>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{environment}</Typography>
        <ExpandMoreIcon sx={{ fontSize: '1.2rem' }} />
      </IconButton>
      <Menu
        anchorEl={envAnchor}
        open={Boolean(envAnchor)}
        onClose={handleEnvClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleEnvSelect('Development')}>Development</MenuItem>
        <MenuItem onClick={() => handleEnvSelect('Staging')}>Staging</MenuItem>
        <MenuItem onClick={() => handleEnvSelect('Production')}>Production</MenuItem>
      </Menu>
    </Box>
  );
};

export default TopBar;
export { APP_VERSION };
