import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { observePerformance } from './lib/performance';
import { preloadCriticalRoutes } from './lib/preloader';
import './index.css';

observePerformance();
preloadCriticalRoutes();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
