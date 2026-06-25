import React from 'react';
import ReactDOM from 'react-dom/client';
// HashRouter (not BrowserRouter) so deep links never 404 on GitHub Pages, which
// has no SPA history fallback. Pairs with vite `base: './'`.
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
