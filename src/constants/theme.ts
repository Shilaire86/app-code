// ─────────────────────────────────────────────────────────────────────────────
// The Becoming Method — Design System v2
// Primary: Refined Indigo   Fonts: Outfit (headings) + Inter (body)
// Both dark and light palettes are first-class citizens.
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
// Refined scale — slightly softer than v1 for a more premium feel.

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
// Key changes vs v1:
//   • Negative letter-spacing on headings (-0.025em → -0.01em range)
//   • New `display` token for hero text
//   • New `label` token (11 px / 700 / 0.09 em uppercase) — replaces ad-hoc
//     "10 px uppercase scattered everywhere" pattern
//   • Line heights changed from fixed px → relative multipliers
//   • `bodyMedium` added for emphasis body copy

export const typography = {
  display: {
    fontFamily:    'Outfit_700Bold',
    fontSize:      36,
    fontWeight:    '700' as const,
    lineHeight:    40,       // ~1.1×
    letterSpacing: -0.9,    // -0.025em @ 36 px
  },
  h1: {
    fontFamily:    'Outfit_700Bold',
    fontSize:      30,
    fontWeight:    '700' as const,
    lineHeight:    36,       // ~1.2×
    letterSpacing: -0.65,   // -0.022em @ 30 px
  },
  h2: {
    fontFamily:    'Outfit_700Bold',
    fontSize:      24,
    fontWeight:    '700' as const,
    lineHeight:    30,       // 1.25×
    letterSpacing: -0.4,    // -0.017em @ 24 px
  },
  h3: {
    fontFamily:    'Outfit_600SemiBold',
    fontSize:      20,
    fontWeight:    '600' as const,
    lineHeight:    26,       // 1.3×
    letterSpacing: -0.2,    // -0.01em @ 20 px
  },
  h4: {
    fontFamily:    'Outfit_600SemiBold',
    fontSize:      18,
    fontWeight:    '600' as const,
    lineHeight:    24,       // 1.33×
    letterSpacing: 0,
  },
  body: {
    fontFamily:    'Inter_400Regular',
    fontSize:      16,
    fontWeight:    '400' as const,
    lineHeight:    26,       // 1.625× — more breathing room than old fixed 24
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily:    'Inter_500Medium',
    fontSize:      16,
    fontWeight:    '500' as const,
    lineHeight:    26,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily:    'Inter_400Regular',
    fontSize:      14,
    fontWeight:    '400' as const,
    lineHeight:    22,       // 1.57×
    letterSpacing: 0,
  },
  bodySmallMedium: {
    fontFamily:    'Inter_500Medium',
    fontSize:      14,
    fontWeight:    '500' as const,
    lineHeight:    22,
    letterSpacing: 0,
  },
  // Standardised label — replaces scattered inline "11px uppercase" styles
  label: {
    fontFamily:    'Inter_600SemiBold',
    fontSize:      11,
    fontWeight:    '600' as const,
    lineHeight:    16,
    letterSpacing: 0.88,    // 0.08em @ 11 px
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily:    'Inter_400Regular',
    fontSize:      12,
    fontWeight:    '400' as const,
    lineHeight:    17,       // 1.42×
    letterSpacing: 0.12,    // 0.01em
  },
  captionMedium: {
    fontFamily:    'Inter_500Medium',
    fontSize:      12,
    fontWeight:    '500' as const,
    lineHeight:    17,
    letterSpacing: 0.12,
  },
  // Button text — tighter tracking than headings, heavier weight
  button: {
    fontFamily:    'Outfit_600SemiBold',
    fontSize:      16,
    fontWeight:    '600' as const,
    lineHeight:    20,
    letterSpacing: -0.1,
  },
  buttonSm: {
    fontFamily:    'Outfit_600SemiBold',
    fontSize:      14,
    fontWeight:    '600' as const,
    lineHeight:    18,
    letterSpacing: -0.08,
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

// ─── Dark Color Palette ───────────────────────────────────────────────────────
// Backgrounds: cool blue-blacks (not pure black — avoids OLED harshness)
// Primary:     Indigo 500  #6366F1
// Text:        Slightly warm white → blue-gray midtones → deep muted

export const darkColors = {
  // ── Primary ──────────────────────────────────────────────────────────────
  primary:      '#6366F1',   // Indigo 500
  primaryLight: '#818CF8',   // Indigo 400  — hover / active states
  primarySoft:  'rgba(99,102,241,0.14)',  // Tinted surface backgrounds

  // Secondary / accent
  secondary:    '#A78BFA',   // Violet 400
  secondarySoft:'rgba(167,139,250,0.14)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:        '#09090B',  // Zinc-950 — slightly cooler than pure black
  surface:           '#141417',  // Card / sheet background
  surfaceElevated:   '#1E1E24',  // Modals, dropdowns, elevated surfaces

  // ── Text ─────────────────────────────────────────────────────────────────
  text:           '#F0F0FF',   // Slightly lavender-white — softer than #FFF
  textSecondary:  '#9898AA',   // Muted text, labels, sub-values
  textTertiary:   '#55556A',   // Disabled, placeholder, hint

  // ── Borders ──────────────────────────────────────────────────────────────
  border:     'rgba(255,255,255,0.07)',   // Hairline — default cards
  borderMid:  'rgba(255,255,255,0.13)',   // Stronger — inputs, active states
  borderHard: 'rgba(255,255,255,0.22)',   // Emphasis borders

  // ── Status ───────────────────────────────────────────────────────────────
  success:     '#34D399',   // Emerald 400
  successSoft: 'rgba(52,211,153,0.14)',
  warning:     '#FBBF24',   // Amber 400
  warningSoft: 'rgba(251,191,36,0.14)',
  error:       '#F87171',   // Red 400
  errorSoft:   'rgba(248,113,113,0.14)',
  info:        '#60A5FA',   // Blue 400
  infoSoft:    'rgba(96,165,250,0.14)',

  // ── Becoming Stages ──────────────────────────────────────────────────────
  initiate:         '#71717A',   // Zinc 500
  initiateSoft:     'rgba(113,113,122,0.15)',
  practitioner:     '#60A5FA',   // Blue 400
  practitionerSoft: 'rgba(96,165,250,0.15)',
  devoted:          '#A78BFA',   // Violet 400
  devotedSoft:      'rgba(167,139,250,0.15)',
  embodied:         '#FCD34D',   // Amber 300
  embodiedSoft:     'rgba(252,211,77,0.15)',

  // ── Feature Accents ──────────────────────────────────────────────────────
  // Unique colors per feature area — used for icon tints and card borders
  cardio:     '#F97316',   // Orange 500
  cardioSoft: 'rgba(249,115,22,0.12)',
  mindset:    '#818CF8',   // Indigo 400 (aligns with primary family)
  mindsetSoft:'rgba(129,140,248,0.12)',
  progress:   '#06B6D4',   // Cyan 500
  progressSoft:'rgba(6,182,212,0.12)',
  nutrition:  '#22C55E',   // Green 500
  nutritionSoft:'rgba(34,197,94,0.12)',
  gallery:    '#EC4899',   // Pink 500
  gallerySoft:'rgba(236,72,153,0.12)',
} as const;

// ─── Light Color Palette ──────────────────────────────────────────────────────
// Backgrounds: warm off-white with the faintest violet undertone
// Primary:     Indigo 600  #4F46E5  (one stop darker for WCAG contrast on white)
// Text:        Blue-black → slate midtones

export const lightColors = {
  // ── Primary ──────────────────────────────────────────────────────────────
  primary:      '#4F46E5',   // Indigo 600 — darker for white-bg contrast
  primaryLight: '#6366F1',   // Indigo 500
  primarySoft:  'rgba(79,70,229,0.08)',

  // Secondary / accent
  secondary:    '#7C3AED',   // Violet 600
  secondarySoft:'rgba(124,58,237,0.09)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:        '#F5F5FC',  // Faint violet-white — not sterile pure white
  surface:           '#FFFFFF',
  surfaceElevated:   '#EEEEF8',  // Blue-gray wash for elevated surfaces

  // ── Text ─────────────────────────────────────────────────────────────────
  text:           '#0C0C1D',   // Near-black with a blue cast
  textSecondary:  '#5A5A7A',   // Slate-blue mid
  textTertiary:   '#9898B5',   // Light muted — placeholders, hints

  // ── Borders ──────────────────────────────────────────────────────────────
  border:     'rgba(79,70,229,0.09)',    // Indigo-tinted hairline
  borderMid:  'rgba(79,70,229,0.18)',    // Stronger indigo border
  borderHard: 'rgba(79,70,229,0.30)',    // Emphasis

  // ── Status ───────────────────────────────────────────────────────────────
  success:     '#059669',   // Emerald 600
  successSoft: 'rgba(5,150,105,0.08)',
  warning:     '#D97706',   // Amber 600
  warningSoft: 'rgba(217,119,6,0.10)',
  error:       '#DC2626',   // Red 600
  errorSoft:   'rgba(220,38,38,0.08)',
  info:        '#2563EB',   // Blue 600
  infoSoft:    'rgba(37,99,235,0.09)',

  // ── Becoming Stages ──────────────────────────────────────────────────────
  initiate:         '#6B7280',   // Gray 500
  initiateSoft:     '#F3F4F6',   // Gray 100
  practitioner:     '#1D4ED8',   // Blue 700
  practitionerSoft: '#DBEAFE',   // Blue 100
  devoted:          '#6D28D9',   // Violet 700
  devotedSoft:      '#EDE9FE',   // Violet 100
  embodied:         '#B45309',   // Amber 700
  embodiedSoft:     '#FEF3C7',   // Amber 100

  // ── Feature Accents ──────────────────────────────────────────────────────
  cardio:      '#EA580C',   // Orange 600
  cardioSoft:  'rgba(234,88,12,0.09)',
  mindset:     '#4F46E5',   // Indigo 600
  mindsetSoft: 'rgba(79,70,229,0.08)',
  progress:    '#0891B2',   // Cyan 600
  progressSoft:'rgba(8,145,178,0.09)',
  nutrition:   '#16A34A',   // Green 600
  nutritionSoft:'rgba(22,163,74,0.09)',
  gallery:     '#DB2777',   // Pink 600
  gallerySoft: 'rgba(219,39,119,0.09)',
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
// Screens that import `theme` directly (e.g. _layout.tsx DiagnosticView)
// will always see dark colors. Gradually migrate those to useTheme().

export const theme = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme       = typeof theme;
export type ColorPalette = typeof darkColors;
export type Spacing     = typeof spacing;
export type Radius      = typeof radius;
export type Typography  = typeof typography;
