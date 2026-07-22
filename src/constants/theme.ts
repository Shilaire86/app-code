// ─────────────────────────────────────────────────────────────────────────────
// The Becoming Method — Design System v6
// Light  → Direction A "The Method": off-white · fire orange · editorial brutalism
// Dark   → Direction B "Forge":      charcoal · burnished copper · industrial
// Headings: Barlow Condensed (condensed, bold, uppercase) — both directions
// Body:     DM Sans (clean, geometric, modern)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

// ─── Radius ──────────────────────────────────────────────────────────────────

export const radius = {
  xs:   4,
  sm:   6,
  md:   10,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
// Headings: Barlow Condensed — condensed, bold, athletic, uppercase
// Body:     DM Sans — clean, geometric, highly legible
// Both directions use uppercase condensed headings with tight letter-spacing.

export const typography = {
  display: {
    fontFamily:     'BarlowCondensed_800ExtraBold',
    fontSize:       48,
    fontWeight:     '800' as const,
    lineHeight:     50,
    letterSpacing:  -0.5,
    textTransform:  'uppercase' as const,
  },
  h1: {
    fontFamily:     'BarlowCondensed_800ExtraBold',
    fontSize:       40,
    fontWeight:     '800' as const,
    lineHeight:     42,
    letterSpacing:  -0.3,
    textTransform:  'uppercase' as const,
  },
  h2: {
    fontFamily:     'BarlowCondensed_700Bold',
    fontSize:       32,
    fontWeight:     '700' as const,
    lineHeight:     34,
    letterSpacing:  -0.2,
    textTransform:  'uppercase' as const,
  },
  h3: {
    fontFamily:     'BarlowCondensed_700Bold',
    fontSize:       26,
    fontWeight:     '700' as const,
    lineHeight:     28,
    letterSpacing:  0,
    textTransform:  'uppercase' as const,
  },
  h4: {
    fontFamily:     'BarlowCondensed_600SemiBold',
    fontSize:       22,
    fontWeight:     '600' as const,
    lineHeight:     24,
    letterSpacing:  0,
    textTransform:  'uppercase' as const,
  },
  body: {
    fontFamily:    'DMSans_400Regular',
    fontSize:      16,
    lineHeight:    26,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily:    'DMSans_500Medium',
    fontSize:      16,
    lineHeight:    26,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily:    'DMSans_400Regular',
    fontSize:      14,
    lineHeight:    22,
    letterSpacing: 0,
  },
  bodySmallMedium: {
    fontFamily:    'DMSans_500Medium',
    fontSize:      14,
    lineHeight:    22,
    letterSpacing: 0,
  },
  label: {
    fontFamily:    'DMSans_700Bold',
    fontSize:      11,
    fontWeight:    '700' as const,
    lineHeight:    16,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily:    'DMSans_400Regular',
    fontSize:      12,
    lineHeight:    17,
    letterSpacing: 0.1,
  },
  captionMedium: {
    fontFamily:    'DMSans_500Medium',
    fontSize:      12,
    lineHeight:    17,
    letterSpacing: 0.1,
  },
  button: {
    fontFamily:    'DMSans_700Bold',
    fontSize:      15,
    fontWeight:    '700' as const,
    lineHeight:    20,
    letterSpacing: 0.3,
  },
  buttonSm: {
    fontFamily:    'DMSans_700Bold',
    fontSize:      13,
    fontWeight:    '700' as const,
    lineHeight:    18,
    letterSpacing: 0.2,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────

export const animation = {
  fast:   150,
  normal: 250,
  slow:   350,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius:  1.0,
    elevation:     1,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius:  2.62,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius:  4.65,
    elevation:     8,
  },
} as const;

// ─── Dark Palette — Direction B "Forge" ──────────────────────────────────────
// Base: Deep charcoal #1C1C1E   Cards: #141414 (darker/inset)
// Accent: Burnished copper #B5622A   Text: Warm white #F0EDE8

export const darkColors = {
  // ── Primary — Burnished copper ────────────────────────────────────────────
  primary:      '#B5622A',
  primaryLight: '#D4824A',
  primarySoft:  'rgba(181,98,42,0.14)',

  secondary:    '#F0EDE8',
  secondarySoft:'rgba(240,237,232,0.08)',

  // ── Backgrounds — cards sit darker (inset industrial aesthetic) ───────────
  background:      '#1C1C1E',
  surface:         '#1A1A1A',
  surfaceElevated: '#141414',
  neuInset:        '#0D0D0F',

  // ── Text ─────────────────────────────────────────────────────────────────
  text:          '#F0EDE8',
  textSecondary: 'rgba(240,237,232,0.52)',
  textTertiary:  'rgba(240,237,232,0.28)',

  // ── Borders ──────────────────────────────────────────────────────────────
  border:     'rgba(240,237,232,0.06)',
  borderMid:  'rgba(240,237,232,0.13)',
  borderHard: 'rgba(240,237,232,0.24)',

  // ── Status ───────────────────────────────────────────────────────────────
  success:     '#34D399',
  successSoft: 'rgba(52,211,153,0.12)',
  warning:     '#FF9F0A',
  warningSoft: 'rgba(255,159,10,0.12)',
  error:       '#FF4D4D',
  errorSoft:   'rgba(255,77,77,0.12)',
  info:        '#4F9DFF',
  infoSoft:    'rgba(79,157,255,0.12)',

  // ── Becoming Stages ──────────────────────────────────────────────────────
  initiate:         '#6B6B65',
  initiateSoft:     'rgba(107,107,101,0.12)',
  practitioner:     '#4F9DFF',
  practitionerSoft: 'rgba(79,157,255,0.12)',
  devoted:          '#FF9F0A',
  devotedSoft:      'rgba(255,159,10,0.12)',
  embodied:         '#B5622A',
  embodiedSoft:     'rgba(181,98,42,0.14)',

  // ── Feature Accents ──────────────────────────────────────────────────────
  cardio:        '#FF6B35',
  cardioSoft:    'rgba(255,107,53,0.12)',
  mindset:       '#B5622A',
  mindsetSoft:   'rgba(181,98,42,0.12)',
  progress:      '#4F9DFF',
  progressSoft:  'rgba(79,157,255,0.10)',
  nutrition:     '#34D399',
  nutritionSoft: 'rgba(52,211,153,0.10)',
  gallery:       '#FF9F0A',
  gallerySoft:   'rgba(255,159,10,0.10)',
} as const;

// ─── Light Palette — Direction A "The Method" ────────────────────────────────
// Base: Off-white #F7F4EF   Accent: Fire orange #FF4B1F
// Text: Near-black #1A1A1A   Editorial brutalism — hard borders, no shadows

export const lightColors = {
  // ── Primary — Fire orange ─────────────────────────────────────────────────
  primary:      '#FF4B1F',
  primaryLight: '#FF6B45',
  primarySoft:  'rgba(255,75,31,0.10)',

  secondary:    '#1A1A1A',
  secondarySoft:'rgba(26,26,26,0.06)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:      '#F7F4EF',
  surface:         '#F7F4EF',
  surfaceElevated: '#EDEDEA',
  neuInset:        '#E4E1DC',

  // ── Text ─────────────────────────────────────────────────────────────────
  text:          '#1A1A1A',
  textSecondary: 'rgba(26,26,26,0.45)',
  textTertiary:  'rgba(26,26,26,0.28)',

  // ── Borders — borderHard is solid black for editorial card edges ──────────
  border:     'rgba(26,26,26,0.08)',
  borderMid:  'rgba(26,26,26,0.16)',
  borderHard: '#1A1A1A',

  // ── Status ───────────────────────────────────────────────────────────────
  success:     '#2D8A4E',
  successSoft: 'rgba(45,138,78,0.10)',
  warning:     '#A86400',
  warningSoft: 'rgba(168,100,0,0.10)',
  error:       '#C42B2B',
  errorSoft:   'rgba(196,43,43,0.10)',
  info:        '#2563EB',
  infoSoft:    'rgba(37,99,235,0.10)',

  // ── Becoming Stages ──────────────────────────────────────────────────────
  initiate:         '#7A7468',
  initiateSoft:     'rgba(122,116,104,0.10)',
  practitioner:     '#2563EB',
  practitionerSoft: 'rgba(37,99,235,0.10)',
  devoted:          '#A86400',
  devotedSoft:      'rgba(168,100,0,0.10)',
  embodied:         '#FF4B1F',
  embodiedSoft:     'rgba(255,75,31,0.10)',

  // ── Feature Accents ──────────────────────────────────────────────────────
  cardio:        '#E03800',
  cardioSoft:    'rgba(224,56,0,0.10)',
  mindset:       '#A86400',
  mindsetSoft:   'rgba(168,100,0,0.10)',
  progress:      '#2563EB',
  progressSoft:  'rgba(37,99,235,0.10)',
  nutrition:     '#2D8A4E',
  nutritionSoft: 'rgba(45,138,78,0.10)',
  gallery:       '#A86400',
  gallerySoft:   'rgba(168,100,0,0.10)',
} as const;

// ─── Grouped tokens (for useTheme return shape) ───────────────────────────────

export const themeTokens = {
  spacing,
  radius,
  typography,
  shadows,
  animation,
} as const;

// ─── Static default (dark) — backward compat ─────────────────────────────────
import { Appearance } from 'react-native';

export const theme = {
  colors: Appearance.getColorScheme() === 'dark' ? darkColors : lightColors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme        = typeof theme;
// Widened to plain `string` values rather than `typeof darkColors` verbatim —
// dark/light palettes share identical keys but different literal hex/rgba
// values, so pinning this to one palette's exact literals rejected the other
// wherever a caller passed `useTheme().colors` (a dark|light union) into a
// function typed to accept `ColorPalette`.
export type ColorPalette = { [K in keyof typeof darkColors]: string };
export type Spacing      = typeof spacing;
export type Radius       = typeof radius;
export type Typography   = typeof typography;
