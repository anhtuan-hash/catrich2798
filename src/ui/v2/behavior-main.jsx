import React from 'react';
import { createRoot } from 'react-dom/client';
import B2BehaviorQA from './pages/B2BehaviorQA.jsx';
import './tokens.css';

const root = document.getElementById('brian-v2-behavior-root');
if (root) {
  document.documentElement.dataset.brianUi = 'v2';
  createRoot(root).render(
    <React.StrictMode>
      <B2BehaviorQA />
    </React.StrictMode>,
  );
}
