import React from 'react';
import { Grid } from '@mui/material';
import { FORM_CONSTANTS } from '../../theme/formConstants';

/**
 * FormGrid
 * 
 * Standardized grid layout container with consistent spacing.
 * 
 * @param {number} spacing - Grid spacing (default: 2)
 * @param {ReactNode} children - Grid items
 * @param {object} ...props - Additional Grid container props
 */
export const FormGrid = ({ 
  spacing = FORM_CONSTANTS.spacing.field, 
  children,
  ...props 
}) => {
  return (
    <Grid container spacing={spacing} {...props}>
      {children}
    </Grid>
  );
};

/**
 * FormGridItem
 * 
 * Standardized grid item with default responsive breakpoints.
 * 
 * @param {number} xs - Extra small breakpoint (default: 12)
 * @param {number} sm - Small breakpoint (default: 6)
 * @param {number} md - Medium breakpoint (default: 4)
 * @param {number} lg - Large breakpoint (default: 3)
 * @param {ReactNode} children - Grid item content
 * @param {object} ...props - Additional Grid item props
 */
export const FormGridItem = ({ 
  xs = 12, 
  sm = 6, 
  md = 4, 
  lg = 3,
  children,
  ...props 
}) => {
  return (
    <Grid item xs={xs} sm={sm} md={md} lg={lg} {...props}>
      {children}
    </Grid>
  );
};
