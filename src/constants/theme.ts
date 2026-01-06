// Design System Tokens for The Becoming Method
// Based on ARCHITECTURE.md specifications

export const theme = {
  colors: {
    // Primary colors
    primary: '#6366F1',      // Indigo
    secondary: '#8B5CF6',    // Violet
    
    // Background colors
    background: '#0F0F0F',   // Near black
    surface: '#1A1A1A',      // Dark gray
    surfaceElevated: '#262626',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#A1A1A1',
    textTertiary: '#737373',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    // Stage colors (for Becoming stages)
    initiate: '#6B7280',
    practitioner: '#3B82F6',
    devoted: '#8B5CF6',
    embodied: '#F59E0B',
    
    // Borders
    border: '#333333',
    borderLight: '#404040',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
  
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
} as const;

export type Theme = typeof theme;
