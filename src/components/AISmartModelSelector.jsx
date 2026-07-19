import React, { useEffect, useMemo, useState } from 'react';
import { PROVIDER_CATALOG, getProviderCatalogEntry } from '../data/aiProviderCatalog.js';
import { getAiConfigs, getAiProvider } from '../utils/aiProviders.js';
import {
  getEffectiveActiveProvider,
  getRoutingPreferences,
  mergeAiConfigs,
  saveRoutingPreferences,
  setActiveProviderOverride,
} from '../utils/aiProviderOverrides.js';
import { AI_ROUTING_MODES, getRoutingModeInfo } from '../utils/aiSmartRouting.js';

function availableProviders() {
  const legacyConfigs = typeof getAiConfigs === 'function' ? getAiConfigs() : {};
  const configs = mergeAiConfigs(legacyConfigs);
  return PROVIDER_CATALOG.map((provider) => ({
    ...provider,
    config: configs[provider.id] || {},
    configured: provider.requiresApiKey === false
      ? Boolean((configs[provider.id]?.baseUrl || provider.baseUrl || '').trim())
      : Boolean(String(configs[provider.id]?.apiKey || '').trim()),
  }));
}

export default function AISmartModelSelector({ compact = false, context = 'global', className = '' }) {
  const [prefs, setPrefs] = useState(() => getRoutingPreferences());
  const [providers, setProviders] = useState(() => availableProviders());
  const [lastRoute, setLastRoute] = useState(() => (typeof window !== 'undefined' ? window.__besLastAiRoute || null : null));

  useEffect(() => {
    const refresh = () => {
      setPrefs(getRoutingPreferences());
      setProviders(availableProviders());
    };
    const route = (event) => setLastRoute(event.detail || window.__besLastAiRoute || null);
    window.addEventListener('bes-ai-settings-updated', refresh);
    window.addEventListener('bes-ai-routing-updated', refresh);
    window.addEventListener('bes-ai-routing-success', route);
    return () => {
      window.removeEventListener('bes-ai-settings-updated', refresh);
      window.removeEventListener('bes-ai-routing-updated', refresh);
      window.removeEventListener('bes-ai-routing-success', route);
    };
  }, []);

  const legacyProvider = typeof getAiProvider === 'function' ? getAiProvider() : '';
  const effectiveProvider = getEffectiveActiveProvider(legacyProvider);
  const selectedProvider = prefs.manualProvider || effectiveProvider;
  const providerInfo = getProviderCatalogEntry(selectedProvider);
  const configuredProviders = useMemo(() => providers.filter((provider) => provider.configured), [providers]);

  function update(patch) {
    const next = saveRoutingPreferences(patch);
    setPrefs(next);
  }

  function changeMode(event) {
    const mode = event.target.value;
    update({ mode });
  }

  function changeProvider(event) {
    const provider = event.target.value;
    setActiveProviderOverride(provider);
    update({ manualProvider: provider, manualModel: '', mode: prefs.mode === 'manual' ? 'manual' : prefs.mode });
  }

  function changeModel(event) {
    update({ manualModel: event.target.value, manualProvider: selectedProvider, mode: 'manual' });
  }

  return <div className={`v1157-model-selector ${compact ? 'compact' : ''} ${className}`.trim()} data-context={context}>
    <label className="v1157-route-field">
      {!compact && <span>Chế độ AI</span>}
      <select value={prefs.mode} onChange={changeMode} title={getRoutingModeInfo(prefs.mode).description}>
        {AI_ROUTING_MODES.map((mode) => <option key={mode.id} value={mode.id}>{compact ? mode.shortLabel : mode.label}</option>)}
      </select>
    </label>
    <label className="v1157-route-field provider">
      {!compact && <span>Provider</span>}
      <select value={selectedProvider} onChange={changeProvider}>
        {configuredProviders.length ? configuredProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.shortLabel}{provider.freeTier ? ' · free' : ''}</option>) : <option value={selectedProvider}>{providerInfo.shortLabel}</option>}
      </select>
    </label>
    <label className="v1157-route-field model">
      {!compact && <span>Model</span>}
      <input value={prefs.manualModel || ''} onChange={changeModel} placeholder={providerInfo.defaultModel || 'Model tự động'} list={`v1157-models-${context}`} />
      <datalist id={`v1157-models-${context}`}>{(providerInfo.models || []).map((model) => <option key={model} value={model} />)}</datalist>
    </label>
    <button type="button" className="v1157-settings-link" onClick={() => { window.location.hash = '#/settings'; }} title="Mở AI Provider Hub">⚙</button>
    {lastRoute && !compact && <div className="v1157-last-route" title={(lastRoute.attempts || []).map((attempt) => `${attempt.provider}: ${attempt.status}`).join('\n')}><span>Đã dùng</span><b>{lastRoute.providerName || lastRoute.provider} · {lastRoute.model}</b></div>}
  </div>;
}
