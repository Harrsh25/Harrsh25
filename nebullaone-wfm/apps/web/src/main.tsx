import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { IS_DEMO } from './lib/api';
import { DemoBanner } from './demo/DemoBanner';
import { App } from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

// The demo file is opened from disk, so it uses #-based URLs.
const Router = IS_DEMO ? HashRouter : BrowserRouter;

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <Router>
        <AuthProvider>
          <App />
          {IS_DEMO && <DemoBanner />}
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
);
