import React from 'react';
import { createRoot } from 'react-dom/client';
import B2ReleaseRehearsal from './pages/B2ReleaseRehearsal.jsx';
import './tokens.css';

const root = document.getElementById('brian-v2-rehearsal-root');
if (root) {
  document.documentElement.dataset.brianUi = 'v2';
  createRoot(root).render(
    <React.StrictMode>
      <B2ReleaseRehearsal />
    </React.StrictMode>,
  );
}
