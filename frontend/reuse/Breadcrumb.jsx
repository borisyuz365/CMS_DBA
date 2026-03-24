import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * Breadcrumb - Navigation breadcrumb component
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of breadcrumb items: [{ label: 'Entities', path: '/entities' }, { label: 'Athletes' }]
 */
const Breadcrumb = ({ items = [] }) => {
  const navigate = useNavigate();

  return (
    <Breadcrumbs 
      separator="/" 
      sx={{ 
        mb: 1,
        '& .MuiBreadcrumbs-separator': {
          color: '#666',
        }
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        if (isLast) {
          return (
            <Typography 
              key={index}
              sx={{ 
                color: '#000',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {item.label}
            </Typography>
          );
        }
        
        return (
          <Link
            key={index}
            component="button"
            variant="body2"
            onClick={() => item.path && navigate(item.path)}
            sx={{
              color: '#666',
              textDecoration: 'none',
              fontSize: '0.875rem',
              cursor: item.path ? 'pointer' : 'default',
              '&:hover': {
                textDecoration: item.path ? 'underline' : 'none',
              },
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default Breadcrumb;
