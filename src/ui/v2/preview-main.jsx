import React from 'react';
import { createRoot } from 'react-dom/client';
import BrianV2Preview from './BrianV2Preview.jsx';

const root = document.getElementById('brian-v2-root');
if (root) {
  document.documentElement.dataset.brianUi = 'v2';
  createRoot(root).render(
    <React.StrictMode>
      <BrianV2Preview />
    </React.StrictMode>,
  );
}
