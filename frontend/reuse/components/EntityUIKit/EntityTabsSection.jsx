import React from 'react';
import {
  Paper,
  Box,
  Tabs,
  Tab,
} from '@mui/material';

/**
 * EntityTabsSection - Reusable tabs section component for entity details pages
 * 
 * @param {Object} props
 * @param {number} props.activeTab - Currently active tab index
 * @param {Function} props.onTabChange - Handler for tab change (newTabIndex) => void
 * @param {Array} props.tabs - Array of tab configurations:
 *   [
 *     {
 *       label: 'Tab 1',
 *       content: <Component />, // React component or element
 *       lazy: true, // Load content only when tab is active
 *     }
 *   ]
 * @param {Object} props.sx - Additional styling
 */
const EntityTabsSection = ({
  activeTab = 0,
  onTabChange,
  tabs = [],
  sx = {},
}) => {
  const handleTabChange = (event, newValue) => {
    onTabChange?.(newValue);
  };

  return (
    <Paper sx={{ boxShadow: 1, ...sx }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
          },
          '& .Mui-selected': {
            color: '#1976d2',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tabs.map((tab, index) => {
          // If lazy loading is enabled, only render active tab
          if (tab.lazy && index !== activeTab) {
            return null;
          }

          return (
            <Box
              key={index}
              sx={{
                display: index === activeTab ? 'block' : 'none',
              }}
            >
              {tab.content}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default EntityTabsSection;
