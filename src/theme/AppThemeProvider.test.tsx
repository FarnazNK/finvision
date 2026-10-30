import { AppThemeProvider, STORAGE_KEY } from './AppThemeProvider';
import { initialData } from '@/app/store';
import { selectThemeMode } from '@/features/ui/uiSlice';
import { renderWithProviders } from '@/test/utils';

const staleLight = { ui: { ...initialData().ui, themeMode: 'light' as const } };

describe('<AppThemeProvider />', () => {
  beforeEach(() => window.localStorage.clear());

  test('applies the dark default over a stale theme restored from before the redesign', () => {
    const { store } = renderWithProviders(<AppThemeProvider>app</AppThemeProvider>, {
      preloadedState: staleLight,
    });
    expect(selectThemeMode(store.getState())).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  test('keeps a choice the visitor made after the redesign', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    const { store } = renderWithProviders(<AppThemeProvider>app</AppThemeProvider>, {
      preloadedState: staleLight,
    });
    expect(selectThemeMode(store.getState())).toBe('light');
  });
});
