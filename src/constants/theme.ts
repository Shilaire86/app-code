// ─────────────────────────────────────────────────────────────────────────────
// The Becoming Method — Design System v5 (Forge)
// Direction B: Deep charcoal · Burnished copper · Industrial edge
// Headings: Barlow Condensed (condensed, bold, assertive)
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
// Headings: Barlow Condensed — condensed, bold, athletic
// Body:     DM Sans — clean, geometric, highly legible

export const typography = {
  display: {
    fontFamily:    'BarlowCondensed_800ExtraBold',
    fontSize:      48,
    fontWeight:    '800' as const,
    lineHeight:    52,
    letterSpacing: 0.5,
  },
  h1: {
    fontFamily:    'BarlowCondensed_700Bold',
    fontSize:      40,
    fontWeight:    '700' as const,
    lineHeight:    44,
    letterSpacing: 0.3,
  },
  h2: {
    fontFamily:    'BarlowCondensed_700Bold',
    fontSize:      32,
    fontWeight:    '700' as const,
    lineHeight:    36,
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily:    'BarlowCondensed_600SemiBold',
    fontSize:      26,
    fontWeight:    '600' as const,
    lineHeight:    30,
    letterSpacing: 0.1,
  },
  h4: {
    fontFamily:    'BarlowCondensed_600SemiBold',
    fontSize:      22,
    fontWeight:    '600' as const,
    lineHeight:    26,
    letterSpacing: 0,
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

// ─── Dark Palette — Forge ────────────────────────────────────────────────────
// Base: Deep charcoal #1C1C1E   Accent: Burnished copper #B5622A
// Text: Warm white #F0EDE8

export const darkColors = {
  // ── Primary — Burnished copper ────────────────────────────────────────────
  primary:      '#B5622A',
  primaryLight: '#D4824A',
  primarySoft:  'rgba(181,98,42,0.14)',

  secondary:    '#F0EDE8',
  secondarySoft:'rgba(240,237,232,0.08)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:      '#1C1C1E',
  surface:         '#1C1C1E',
  surfaceElevated: '#2A2A2C',
  neuInset:        '#101011',

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

// ─── Light Palette — Forge ───────────────────────────────────────────────────
// Base: Warm linen #EFE9E1   Accent: Deep copper #9B4E1C (readable on warm bg)
// Text: Near-black with warm tint #1E1A16

export const lightColors = {
  // ── Primary — Deep copper (readable on warm linen) ────────────────────────
  primary:      '#9B4E1C',
  primaryLight: '#B5622A',
  primarySoft:  'rgba(155,78,28,0.10)',

  secondary:    '#1E1A16',
  secondarySoft:'rgba(30,26,22,0.08)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:      '#EFE9E1',
  surface:         '#EFE9E1',
  surfaceElevated: '#E0D9D0',
  neuInset:        '#D8D0C6',

  // ── Text ─────────────────────────────────────────────────────────────────
  text:          '#1E1A16',
  textSecondary: 'rgba(30,26,22,0.52)',
  textTertiary:  'rgba(30,26,22,0.30)',

  // ── Borders ──────────────────────────────────────────────────────────────
  border:     'rgba(30,26,22,0.07)',
  borderMid:  'rgba(30,26,22,0.14)',
  borderHard: 'rgba(30,26,22,0.28)',

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
  embodied:         '#9B4E1C',
  embodiedSoft:     'rgba(155,78,28,0.10)',

  // ── Feature Accents ──────────────────────────────────────────────────────
  cardio:        '#C0400A',
  cardioSoft:    'rgba(192,64,10,0.10)',
  mindset:       '#9B4E1C',
  mindsetSoft:   'rgba(155,78,28,0.10)',
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
export type ColorPalette = typeof darkColors;
export type Spacing      = typeof spacing;
export type Radius       = typeof radius;
export type Typography   = typeof typography;
