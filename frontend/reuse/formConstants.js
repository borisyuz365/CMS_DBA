/**
 * Form Constants
 * 
 * Centralized constants for form styling, spacing, and sizing.
 * Used across all form components to ensure consistency.
 */

export const FORM_CONSTANTS = {
  // Spacing values (in MUI spacing units, where 1 = 8px)
  spacing: {
    section: 4,      // Space between major sections (32px)
    field: 2,        // Space between fields in grid (16px)
    inline: 1,       // Space between inline elements (8px)
    group: 3,        // Space within a field group (24px)
  },

  // Input field sizes
  sizes: {
    input: {
      small: 80,      // Small input fields (e.g., numeric inputs)
      medium: 120,   // Medium input fields
      large: 200,    // Large input fields
      full: '100%',  // Full width
    },
    select: {
      small: 140,    // Small select dropdowns
      medium: 200,  // Medium select dropdowns
      large: 250,    // Large select dropdowns
    },
  },

  // Section container styling
  sections: {
    bgColor: '#f8fafc',
    border: '1px solid #e0e0e0',
    borderRadius: 2,
    padding: 2,
    marginBottom: 4,
  },

  // Typography constants
  typography: {
    sectionTitle: {
      variant: 'subtitle1',
      fontWeight: 700,
      marginBottom: 2,
    },
    label: {
      variant: 'body2',
      color: '#666',
      fontWeight: 600,
      minWidth: 'fit-content',
    },
  },
};
