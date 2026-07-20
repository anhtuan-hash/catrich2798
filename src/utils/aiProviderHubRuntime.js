export function installAIProviderHubRuntime() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: { provider: 'openrouter', serverManaged: true } }));
}
export function uninstallAIProviderHubRuntime() {}
