/**
 * Design tokens. The single source of truth for visual primitives.
 * Use these via the styled-components theme — never hard-code values in components.
 */

const palette = {
  // Brand
  brand50: '#eef4ff',
  brand100: '#dbe6ff',
  brand200: '#b8cfff',
  brand300: '#8ab0ff',
  brand400: '#5b8bff',
  brand500: '#3366ff', // primary
  brand600: '#244fdb',
  brand700: '#1a3cb0',
  brand800: '#152e85',

  // Neutrals (dark-mode-first scale)
  ink0: '#ffffff',
  ink50: '#f7f8fa',
  ink100: '#eef0f4',
  ink200: '#dde1e9',
  ink300: '#bac1cf',
  ink400: '#8a93a6',
  ink500: '#5d6678',
  ink600: '#3e4655',
  ink700: '#262d3c',
  ink800: '#161c2a',
  ink900: '#0b1220',
  ink950: '#060a14',

  // Semantic
  success500: '#10b981',
  success600: '#059669',
  warn500: '#f59e0b',
  warn600: '#d97706',
  danger500: '#ef4444',
  danger600: '#dc2626',
  info500: '#06b6d4',
} as const;

/**
 * Glass surfaces are translucent, so every component that reads
 * `color.surface` picks up the frosted look automatically. `surfaceSolid`
 * is the opaque fallback for things that must not show what's behind them
 * (native <option> lists, tooltips over busy charts).
 */
export const lightTheme: AppTheme = {
  name: 'light',
  color: {
    bg: '#eef1fa',
    surface: 'rgba(255, 255, 255, 0.58)',
    surfaceSolid: '#ffffff',
    surfaceAlt: 'rgba(255, 255, 255, 0.72)',
    surfaceMuted: 'rgba(15, 23, 42, 0.04)',
    border: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.16)',
    text: palette.ink900,
    textMuted: palette.ink500,
    textSubtle: palette.ink400,
    primary: palette.brand500,
    primaryHover: palette.brand600,
    primaryText: palette.ink0,
    accent: '#7c5cff',
    success: palette.success600,
    warn: palette.warn600,
    danger: palette.danger600,
    info: palette.info500,
    chartGrid: 'rgba(15, 23, 42, 0.07)',
    focusRing: palette.brand400,
  },
  glass: {
    blur: 'blur(22px) saturate(170%)',
    highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(30, 41, 99, 0.18)',
    glow: '0 18px 48px -18px rgba(51, 102, 255, 0.45)',
    edge: 'linear-gradient(140deg, rgba(255,255,255,0.95), rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.6))',
    aurora: ['rgba(51, 102, 255, 0.30)', 'rgba(124, 92, 255, 0.28)', 'rgba(6, 182, 212, 0.22)'],
  },
  ...sharedTokens(),
};

export const darkTheme: AppTheme = {
  name: 'dark',
  color: {
    bg: '#05070f',
    surface: 'rgba(255, 255, 255, 0.045)',
    surfaceSolid: '#0d1222',
    surfaceAlt: 'rgba(255, 255, 255, 0.075)',
    surfaceMuted: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.085)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    text: '#f1f4fb',
    textMuted: '#a3adc2',
    textSubtle: '#6f7a91',
    primary: '#6d94ff',
    primaryHover: palette.brand300,
    primaryText: '#ffffff',
    accent: '#a78bfa',
    success: '#34d399',
    warn: '#fbbf24',
    danger: '#f87171',
    info: '#22d3ee',
    chartGrid: 'rgba(255, 255, 255, 0.06)',
    focusRing: palette.brand300,
  },
  glass: {
    blur: 'blur(24px) saturate(160%)',
    highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    shadow: '0 1px 1px rgba(0, 0, 0, 0.3), 0 24px 48px -24px rgba(0, 0, 0, 0.7)',
    glow: '0 20px 60px -20px rgba(109, 148, 255, 0.55)',
    edge: 'linear-gradient(140deg, rgba(255,255,255,0.22), rgba(255,255,255,0.03) 40%, rgba(167,139,250,0.18))',
    aurora: ['rgba(59, 108, 255, 0.42)', 'rgba(139, 92, 246, 0.36)', 'rgba(6, 182, 212, 0.26)'],
  },
  ...sharedTokens(),
};

function sharedTokens() {
  return {
    radius: {
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '18px',
      xl: '24px',
      pill: '999px',
    },
    space: {
      0: '0',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
    },
    font: {
      sans: "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      md: '1.0625rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '2rem',
      '3xl': '2.5rem',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.45,
      relaxed: 1.6,
    },
    shadow: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
      sm: '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      md: '0 6px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
      lg: '0 16px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)',
      ringFocus: '0 0 0 3px rgba(91, 139, 255, 0.45)',
    },
    motion: {
      fast: '120ms cubic-bezier(0.2, 0, 0, 1)',
      base: '180ms cubic-bezier(0.2, 0, 0, 1)',
      slow: '320ms cubic-bezier(0.2, 0, 0, 1)',
    },
    breakpoint: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    layout: {
      sidebarWidth: '244px',
      headerHeight: '64px',
      contentMaxWidth: '1440px',
    },
    z: {
      base: 0,
      dropdown: 100,
      sticky: 200,
      modal: 1000,
      toast: 2000,
    },
  };
}

export interface AppThemeColors {
  bg: string;
  surface: string;
  surfaceSolid: string;
  surfaceAlt: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  accent: string;
  success: string;
  warn: string;
  danger: string;
  info: string;
  chartGrid: string;
  focusRing: string;
}

export interface AppThemeGlass {
  /** backdrop-filter value for frosted panels. */
  blur: string;
  /** Inset top highlight that sells the "pane of glass" edge. */
  highlight: string;
  shadow: string;
  /** Coloured ambient shadow for emphasised panels. */
  glow: string;
  /** Gradient painted into a 1px mask ring for a light-catching border. */
  edge: string;
  /** Three aurora blob colours for the page backdrop. */
  aurora: [string, string, string];
}

export type AppTheme = {
  name: 'light' | 'dark';
  color: AppThemeColors;
  glass: AppThemeGlass;
} & ReturnType<typeof sharedTokens>;
