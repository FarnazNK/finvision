import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectThemeMode, themeHydrated } from '@/features/ui/uiSlice';
import type { ThemeMode } from '@/types/domain';
import { darkTheme, lightTheme } from './tokens';
import { GlobalStyle } from './GlobalStyle';

const STORAGE_KEY = 'portfolio:theme';

/**
 * Wraps the app with the active styled-components theme.
 *
 * - Hydrates the chosen mode from localStorage once on mount.
 * - Persists changes back to localStorage.
 * - When mode is 'system', subscribes to prefers-color-scheme so the UI
 *   reacts the moment the OS flips light/dark.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const mode = useAppSelector(selectThemeMode);
  const dispatch = useAppDispatch();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        dispatch(themeHydrated(stored as ThemeMode));
      }
    } catch {
      /* localStorage may be unavailable (private mode, SSR) */
    }
  }, [dispatch]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const resolved = useResolvedTheme(mode);
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}

function useResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  const getSystem = (): 'light' | 'dark' => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [system, setSystem] = useState<'light' | 'dark'>(getSystem);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystem(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mode === 'system' ? system : mode;
}
