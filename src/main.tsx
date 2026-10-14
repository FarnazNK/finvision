import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/app/store';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { App } from './App';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppThemeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ErrorBoundary><App /></ErrorBoundary>
        </BrowserRouter>
      </AppThemeProvider>
    </Provider>
  </React.StrictMode>,
);
