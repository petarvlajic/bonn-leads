// styles/theme.ts
// Theme configuration for the application with TypeScript

export const colors = {
  primary: '#000000', // Primary buttons, important actions
  background: '#f5f5f5', // Main background
  card: '#ffffff', // Card background
  text: '#000000', // Primary text color
  textSecondary: '#6b7280', // Secondary text, subtitles, descriptions
  border: '#e5e7eb', // Borders for inputs, cards
  success: '#10b981', // Success states
  pending: '#f59e0b', // Pending/processing states
  error: '#ef4444', // Error states
  inputBackground: '#ffffff', // Input field background
  white: '#ffffff', // White color
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};

// Type definitions for the theme
export type ColorKeys = keyof typeof colors;
export type SpacingKeys = keyof typeof spacing;
export type FontSizeKeys = keyof typeof fontSizes;
export type FontWeightKeys = keyof typeof fontWeights;
export type BorderRadiusKeys = keyof typeof borderRadius;
export type ShadowKeys = keyof typeof shadows;
