import React, { useEffect, useState } from 'react';
import { getProviderCatalogEntry } from '../data/aiProviderCatalog.js';
import { getAiConfigs, saveAiConfigs } from '../utils/aiProviders.js';

export default function AISmartModelSelector({ compact = false, context = 'global', className = '' }) {
  const info = getProviderCatalogEntry('openrouter');
  const [config, setConfig] = useState(() => getAiConfigs().openrouter || {});
  const [lastRoute, setLastRoute] = useState(() => (typeof window !== 'undefined' ? window.__BES_LAST_AI_META__ || null : null));

  useEffect(() => {
    const refresh = () => setConfig(getAiConfigs().openrouter || {});
    const route = (event) => setLastRoute(event.detail || window.__BES_LAST_AI_META__ || null);
    window.addEventListener('bes-ai-settings-updated', refresh);
    window.addEventListener('bes-ai-operation-end', route);
    return () => {
      window.removeEventListener('bes-ai-settings-updated', refresh);
      window.removeEventListener('bes-ai-operation-end', route);
    };
  }, []);

  function changeModel(event) {
    const next = { ...config, model: event.target.value };
    setConfig(next);
    saveAiConfigs({ openrouter: next });
  }

  return <div className={`v1157-model-selector ${compact ? 'compact' : ''} ${className}`.trim()} data-context={context}>
    <label className="v1157-route-field provider">
      {!compact && <span>AI Gateway</span>}
      <select value="openrouter" disabled><option value="openrouter">↗ OpenRouter</option></select>
    </label>
    <label className="v1157-route-field model">
      {!compact && <span>Model</span>}
      <input value={config.model || info.defaultModel} onChange={changeModel} placeholder={info.defaultModel} list={`openrouter-models-${context}`} />
      <datalist id={`openrouter-models-${context}`}>{(info.models || []).map((model) => <option key={model} value={model} />)}</datalist>
    </label>
    <button type="button" className="v1157-settings-link" onClick={() => { window.location.hash = '#/settings'; }} title="Mở OpenRouter AI Gateway">⚙</button>
    {lastRoute && !compact && <div className="v1157-last-route"><span>Đã dùng</span><b>OpenRouter · {lastRoute.model || config.model || info.defaultModel}</b></div>}
  </div>;
}
