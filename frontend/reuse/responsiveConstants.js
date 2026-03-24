/**
 * Responsive Constants
 * 
 * Centralized constants for responsive design, breakpoints, spacing, and typography.
 * Used across all components to ensure consistent responsive behavior.
 */

export const RESPONSIVE_CONSTANTS = {
  // Breakpoint values (matching MUI standard breakpoints)
  breakpoints: {
    mobile: 0,           // xs - Extra small devices (phones)
    tablet: 600,         // sm - Small devices (landscape phones, tablets)
    desktop: 900,        // md - Medium devices (tablets, small desktops)
    largeDesktop: 1200,   // lg - Large devices (desktops)
    xlDesktop: 1536,     // xl - Extra large devices (large desktops)
  },

  // Responsive spacing (in MUI spacing units, where 1 = 8px)
  spacing: {
    mobile: 1,      // 8px - Tight spacing for mobile
    tablet: 2,      // 16px - Medium spacing for tablet
    desktop: 3,     // 24px - Comfortable spacing for desktop
  },

  // Responsive typography sizes
  typography: {
    h1: { 
      xs: '1.75rem',    // 28px - Mobile
      sm: '2rem',        // 32px - Tablet
      md: '2.5rem',      // 40px - Desktop
    },
    h2: { 
      xs: '1.5rem',      // 24px - Mobile
      sm: '1.75rem',     // 28px - Tablet
      md: '2rem',        // 32px - Desktop
    },
    h3: { 
      xs: '1.25rem',     // 20px - Mobile
      sm: '1.5rem',      // 24px - Tablet
      md: '1.75rem',     // 28px - Desktop
    },
    h4: { 
      xs: '1.125rem',    // 18px - Mobile
      sm: '1.25rem',     // 20px - Tablet
      md: '1.5rem',      // 24px - Desktop
    },
    h5: { 
      xs: '1rem',        // 16px - Mobile
      sm: '1.125rem',    // 18px - Tablet
      md: '1.25rem',     // 20px - Desktop
    },
    h6: { 
      xs: '0.875rem',    // 14px - Mobile
      sm: '1rem',        // 16px - Tablet
      md: '1.125rem',    // 18px - Desktop
    },
    body1: { 
      xs: '0.875rem',    // 14px - Mobile
      sm: '1rem',        // 16px - Tablet
      md: '1rem',        // 16px - Desktop
    },
    body2: { 
      xs: '0.75rem',     // 12px - Mobile
      sm: '0.875rem',    // 14px - Tablet
      md: '0.875rem',    // 14px - Desktop
    },
    button: { 
      xs: '0.875rem',    // 14px - Mobile
      sm: '0.875rem',    // 14px - Tablet
      md: '0.875rem',    // 14px - Desktop
    },
    caption: { 
      xs: '0.625rem',    // 10px - Mobile
      sm: '0.75rem',     // 12px - Tablet
      md: '0.75rem',     // 12px - Desktop
    },
  },

  // Touch target sizes (in pixels)
  touchTarget: {
    minSize: 44,         // Minimum touch target size (Apple HIG)
    recommendedSize: 48, // Recommended touch target size (Material Design)
    spacing: 8,          // Minimum spacing between touch targets
  },

  // Sidebar dimensions
  sidebar: {
    width: {
      mobile: 240,       // Full-width drawer on mobile
      tablet: 220,       // Standard width on tablet
      desktop: 220,      // Standard width on desktop
      collapsed: 64,     // Collapsed width (icon-only)
    },
  },

  // Container max widths
  container: {
    mobile: '100%',     // Full width on mobile
    tablet: '100%',     // Full width on tablet
    desktop: '1200px',  // Max width on desktop
    largeDesktop: '1400px', // Max width on large desktop
  },
};
