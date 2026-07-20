import React from 'react';
import { getProviderSummary } from '../utils/aiProviders.js';

export default function AISmartModelSelector({ compact = false, context = 'global', className = '' }) {
  const summary = getProviderSummary();
  return <div className={`v1157-model-selector ${compact ? 'compact' : ''} ${className}`.trim()} data-context={context}>
    <div className="v1157-route-field provider" aria-label="AI Gateway">
      {!compact && <span>AI Gateway</span>}
      <strong>OpenRouter · Server</strong>
    </div>
    <label className="v1157-route-field model">
      {!compact && <span>Model</span>}
      <input value={summary.model || 'Admin quản lý'} readOnly title="Model do Admin quản lý tại AI Governance" />
    </label>
    <button type="button" className="v1157-settings-link" onClick={() => { window.location.hash = '#/ai-governance'; }} title="Mở AI Governance">⚙</button>
  </div>;
}
