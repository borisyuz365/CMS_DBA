import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';

const SIDEBAR_VERSION = '3.4.0.017';

/**
 * Sidebar - Navigation sidebar with user profile, menu (chevron-right for expandable), and footer.
 */
const Sidebar = ({
  menuItems = [],
  width = 260,
  collapsible = true,
  userName = 'Daniel Benvelgy',
  sx = {},
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const initialExpanded = React.useMemo(() => {
    const path = location.pathname;
    for (const section of menuItems) {
      for (const item of section.items || []) {
        const isUnder = item.subItems?.some(
          (sub) => (path === '/' && sub.path === '/athletes') || path === sub.path || (sub.path && path.startsWith(sub.path + '/'))
        );
        if (isUnder) return { [item.label]: true };
      }
    }
    return {};
  }, [location.pathname, menuItems]);

  const [expandedItems, setExpandedItems] = useState(initialExpanded);

  React.useEffect(() => {
    setExpandedItems((prev) => ({ ...prev, ...initialExpanded }));
  }, [initialExpanded]);

  const handleNavigation = (path) => {
    if (path) navigate(path);
  };

  const handleExpandToggle = (itemLabel) => {
    if (collapsible) {
      setExpandedItems((prev) => ({ ...prev, [itemLabel]: !prev[itemLabel] }));
    }
  };

  const isSubItemSelected = (subItem) => {
    if (!subItem.path) return false;
    return location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
  };

  const renderMenuItem = (item, index) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.label] || false;
    const selected = !hasSubItems && location.pathname === item.path;

    return (
      <React.Fragment key={item.label || index}>
        <ListItem
          button
          onClick={() => {
            if (hasSubItems) handleExpandToggle(item.label);
            else handleNavigation(item.path);
          }}
          sx={{
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            backgroundColor: !hasSubItems && selected ? 'rgba(0,0,0,0.06)' : 'transparent',
            '&:hover': {
              backgroundColor: !hasSubItems && selected ? 'rgba(0,0,0,0.08)' : 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#000',
              },
            }}
          />
          {hasSubItems && (
            <ChevronRightIcon
              sx={{
                fontSize: '1.25rem',
                color: '#666',
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          )}
        </ListItem>

        {hasSubItems && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems.map((subItem, subIndex) => {
                const subSelected = isSubItemSelected(subItem);
                return (
                  <ListItem
                    key={subItem.label || subIndex}
                    button
                    sx={{
                      pl: 4,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      backgroundColor: subSelected ? 'rgba(0,0,0,0.06)' : 'transparent',
                      '&:hover': {
                        backgroundColor: subSelected ? 'rgba(0,0,0,0.08)' : 'action.hover',
                      },
                    }}
                    onClick={() => handleNavigation(subItem.path)}
                  >
                    {subItem.icon && (
                      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        {subItem.icon}
                      </ListItemIcon>
                    )}
                    <ListItemText
                      primary={subItem.label}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.8rem',
                          color: subSelected ? '#000' : 'text.secondary',
                        },
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (isMobile && collapsible) {
    return null;
  }

  return (
    <Box
      sx={{
        width: width,
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* User profile – top */}
      <Box sx={{ flexShrink: 0, px: 2, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#7c3aed',
              color: '#fff',
            }}
          >
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#000' }}>
              {userName}
            </Typography>
            <Typography
              component="a"
              href="#"
              onClick={(e) => { e.preventDefault(); /* placeholder logout */ }}
              sx={{
                fontSize: '0.8rem',
                color: '#d32f2f',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Logout
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider sx={{ borderColor: '#e0e0e0', mx: 2 }} />

      {/* Menu – scrollable */}
      <Box
        sx={{
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: '#fafafa' },
          '&::-webkit-scrollbar-thumb': {
            background: '#ccc',
            borderRadius: '4px',
            '&:hover': { background: '#aaa' },
          },
        }}
      >
        {menuItems.map((section, sectionIndex) => (
          <Box key={section.section || sectionIndex}>
            {section.section && (
              <Typography
                variant="caption"
                sx={{
                  pl: 2,
                  pt: 2,
                  color: '#888',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {section.section}
              </Typography>
            )}
            <List sx={{ px: 1, py: 1 }}>
              {section.items?.map((item, itemIndex) => renderMenuItem(item, itemIndex))}
            </List>
            {section.section && <Divider sx={{ mx: 2, borderColor: '#eee' }} />}
          </Box>
        ))}
      </Box>

      {/* Footer – version & copyright */}
      <Box sx={{ flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #eee' }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>
          Version {SIDEBAR_VERSION}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: '#999', mt: 0.25 }}>
          Copyright © 2006 366xcones.com, All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
export { SIDEBAR_VERSION };
