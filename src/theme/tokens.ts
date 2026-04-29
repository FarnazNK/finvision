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

export const lightTheme: AppTheme = {
  name: 'light',
  color: {
    bg: palette.ink50,
    surface: palette.ink0,
    surfaceAlt: palette.ink100,
    surfaceMuted: palette.ink100,
    border: palette.ink200,
    borderStrong: palette.ink300,
    text: palette.ink900,
    textMuted: palette.ink500,
    textSubtle: palette.ink400,
    primary: palette.brand500,
    primaryHover: palette.brand600,
    primaryText: palette.ink0,
    accent: palette.brand500,
    success: palette.success600,
    warn: palette.warn600,
    danger: palette.danger600,
    info: palette.info500,
    chartGrid: palette.ink200,
    focusRing: palette.brand400,
  },
  ...sharedTokens(),
};

export const darkTheme: AppTheme = {
  name: 'dark',
  color: {
    bg: palette.ink950,
    surface: palette.ink900,
    surfaceAlt: palette.ink800,
    surfaceMuted: palette.ink800,
    border: palette.ink700,
    borderStrong: palette.ink600,
    text: palette.ink50,
    textMuted: palette.ink300,
    textSubtle: palette.ink400,
    primary: palette.brand400,
    primaryHover: palette.brand300,
    primaryText: palette.ink950,
    accent: palette.brand400,
    success: palette.success500,
    warn: palette.warn500,
    danger: palette.danger500,
    info: palette.info500,
    chartGrid: palette.ink700,
    focusRing: palette.brand300,
  },
  ...sharedTokens(),
};

function sharedTokens() {
  return {
    radius: {
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
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
      sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
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

export type AppTheme = {
  name: 'light' | 'dark';
  color: AppThemeColors;
} & ReturnType<typeof sharedTokens>;
