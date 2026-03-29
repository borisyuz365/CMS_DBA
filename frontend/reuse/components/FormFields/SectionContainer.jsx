import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FORM_CONSTANTS } from '../../theme/formConstants';

/**
 * SectionContainer
 * 
 * Wrapper component for form sections with consistent styling.
 * Sections are collapsible by default (collapsed).
 * 
 * @param {string} title - Optional section title
 * @param {ReactNode} children - Section content
 * @param {boolean} defaultExpanded - Whether the section should be expanded by default (default: false)
 */
export const SectionContainer = ({ title, children, defaultExpanded = false }) => {
  // If no title, render as a simple Box (non-collapsible) to maintain backward compatibility
  if (!title) {
    return (
      <Box
        sx={{
          bgcolor: FORM_CONSTANTS.sections.bgColor,
          border: FORM_CONSTANTS.sections.border,
          borderRadius: FORM_CONSTANTS.sections.borderRadius,
          p: FORM_CONSTANTS.sections.padding,
          mb: FORM_CONSTANTS.sections.marginBottom,
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      sx={{
        bgcolor: FORM_CONSTANTS.sections.bgColor,
        border: FORM_CONSTANTS.sections.border,
        borderRadius: FORM_CONSTANTS.sections.borderRadius,
        mb: FORM_CONSTANTS.sections.marginBottom,
        boxShadow: 'none',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: `0 0 ${FORM_CONSTANTS.sections.marginBottom} 0`,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: FORM_CONSTANTS.sections.padding,
          py: 1,
          '& .MuiAccordionSummary-content': {
            margin: '12px 0',
          },
        }}
      >
        <Typography
          variant={FORM_CONSTANTS.typography.sectionTitle.variant}
          fontWeight={FORM_CONSTANTS.typography.sectionTitle.fontWeight}
        >
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          px: FORM_CONSTANTS.sections.padding,
          pb: FORM_CONSTANTS.sections.padding,
          pt: 0,
        }}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
};
