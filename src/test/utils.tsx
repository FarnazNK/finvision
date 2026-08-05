import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { makeStore, type RootState } from '@/app/store';
import { lightTheme } from '@/theme/tokens';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  route?: string;
}

/**
 * Render a component with the providers it needs in production: Redux store,
 * styled-components ThemeProvider, and a MemoryRouter so navigation works.
 *
 * Returns the store so tests can dispatch actions or read state directly.
 */
export function renderWithProviders(
  ui: ReactElement,
  { preloadedState, route = '/', ...rtlOptions }: ExtendedRenderOptions = {},
) {
  const store = makeStore(preloadedState);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...rtlOptions }) };
}

export * from '@testing-library/react';
