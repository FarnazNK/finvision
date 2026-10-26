import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { initialData, store, type AppData } from '@/app/store';
import { lightTheme } from '@/theme/tokens';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<AppData>;
  route?: string;
}

/**
 * Render a component with the providers it needs in production: the
 * styled-components ThemeProvider and a MemoryRouter so navigation works.
 *
 * The app store is reset to fresh (optionally preloaded) data first, so each
 * test starts clean. Returns the store so tests can call actions or read
 * state directly.
 */
export function renderWithProviders(
  ui: ReactElement,
  { preloadedState, route = '/', ...rtlOptions }: ExtendedRenderOptions = {},
) {
  store.setState(initialData(preloadedState));

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...rtlOptions }) };
}

export * from '@testing-library/react';
