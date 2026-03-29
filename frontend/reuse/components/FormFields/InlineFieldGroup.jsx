import React from 'react';
import { Box } from '@mui/material';
import { FORM_CONSTANTS } from '../../theme/formConstants';

/**
 * InlineFieldGroup
 * 
 * Container for fields that appear on the same line with consistent spacing.
 * 
 * @param {number} gap - Gap between items in spacing units (default: 3)
 * @param {ReactNode} children - Grouped fields
 * @param {object} ...props - Additional Box props
 */
export const InlineFieldGroup = ({ 
  gap = FORM_CONSTANTS.spacing.group, 
  children,
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: gap,
        flexWrap: 'wrap',
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
