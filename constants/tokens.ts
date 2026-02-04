/**
 * Design Tokens - Direction A: "Newsprint Editorial"
 * Full design system with light/dark mode support
 */

export const tokens = {
  color: {
    light: {
      // Backgrounds
      background: '#FFFCF8', // warm white, slight cream
      surface: '#FFFFFF', // pure white cards
      surfaceAlt: '#F5F2ED', // subtle beige for alternating rows

      // Borders
      border: '#E0DCD5', // warm gray, low contrast
      borderStrong: '#C7C2B8', // visible dividers

      // Text
      ink: '#1A1814', // near-black, warm undertone
      inkSoft: '#4A4540', // readable secondary text
      inkMuted: '#8A857E', // metadata, de-emphasized

      // Accents
      accent: '#D84315', // burnt orange - unexpected, energetic
      accentSoft: '#FF6E40', // hover states, active tabs
      accentMuted: '#FFCCBC', // backgrounds, badges

      // Status
      success: '#2E7D32', // open status, positive actions
      warning: '#F57C00', // closing soon
      neutral: '#546E7A', // neutral info
      error: '#C62828', // errors, destructive actions
    },
    dark: {
      // Backgrounds
      background: '#1A1814', // warm near-black
      surface: '#2B2621', // elevated cards
      surfaceAlt: '#3A342D', // alternating rows

      // Borders
      border: '#443E37', // subtle dividers
      borderStrong: '#5A534A', // visible dividers

      // Text
      ink: '#FFFCF8', // inverted, warm white
      inkSoft: '#D0CCC5', // readable secondary
      inkMuted: '#8A857E', // metadata

      // Accents
      accent: '#FF6E40', // brighter in dark mode
      accentSoft: '#FF8A65', // hover
      accentMuted: '#4A3428', // backgrounds

      // Status
      success: '#66BB6A', // status indicators
      warning: '#FFA726', // closing soon
      neutral: '#78909C', // neutral info
      error: '#EF5350', // errors, destructive actions
    },
  },

  font: {
    // Font families (loaded via expo-google-fonts)
    display: 'InterTight_700Bold',
    displayBlack: 'InterTight_800ExtraBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemibold: 'Inter_600SemiBold',
    mono: 'IBMPlexMono_400Regular',

    // Fallbacks for web/system fonts
    displayFallback: 'system-ui, -apple-system, sans-serif',
    bodyFallback: 'system-ui, -apple-system, sans-serif',
    monoFallback: 'Menlo, Monaco, Consolas, monospace',
  },

  fontSize: {
    display: 72,   // MASSIVE headlines
    hero: 56,      // Major section heads
    h1: 36,        // Primary headlines
    h2: 24,        // Section headers
    h3: 18,        // Subsections
    body: 15,
    caption: 12,
    label: 11,
    tiny: 10,
  },

  lineHeight: {
    compressed: 0.9,  // For huge display type
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: -1,       // Tighter for large type
    normal: 0,
    wide: 1.5,
    wider: 2.5,
    widest: 4,       // For tiny caps
  },

  space: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    pill: 999,
  },

  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#1A1814',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#1A1814',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#1A1814',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
  },

  // Accessibility
  touchTarget: {
    min: 48, // WCAG minimum touch target size
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 30,
    popover: 40,
    toast: 50,
  },

  // Animation durations
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },

  // Opacity scale
  opacity: {
    disabled: 0.5,
    muted: 0.7,
    hover: 0.9,
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type Tokens = typeof tokens;
