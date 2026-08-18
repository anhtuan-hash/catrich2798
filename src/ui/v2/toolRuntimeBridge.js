import { applyToolChromeAdapter, hasLevel2ChromeAdapter } from './toolChromeAdapters.js';
import { applyPhase2ToolChromeAdapter, hasPhase2Level2Adapter } from './toolChromeAdaptersPhase2.js';

export function injectToolBridgeCleanup(frame) {
  try {
    const doc = frame?.contentDocument;
    if (!doc?.head) return false;
    let style = doc.getElementById('b2-v2-bridge-cleanup');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'b2-v2-bridge-cleanup';
      doc.head.appendChild(style);
    }
    style.textContent = `
      .bes-top-chrome,
      .global-flat-navigation,
      .status-menu-bar,
      .brian-briefing-bar,
      .transfer-inbox-banner,
      .site-footer,
      .global-footer,
      footer[role="contentinfo"] { display:none !important; }
      html, body, #root { min-height:100% !important; background:#fff !important; }
      body { margin:0 !important; }
      .app-shell { padding-top:0 !important; min-height:100vh !important; }
      #bes-main-content { margin-top:0 !important; padding-top:0 !important; min-height:100vh !important; }
    `;
    return true;
  } catch {
    return false;
  }
}

export function isLevel2Runtime(slug) {
  return hasLevel2ChromeAdapter(slug) || hasPhase2Level2Adapter(slug);
}

export function prepareToolRuntimeFrame(frame, slug) {
  const cleanupReady = injectToolBridgeCleanup(frame);
  const level2 = isLevel2Runtime(slug);
  if (!level2) return { cleanupReady, level2: false, adapterReady: false };

  const phase1Ready = hasLevel2ChromeAdapter(slug)
    ? applyToolChromeAdapter(frame, slug)
    : false;
  const phase2Ready = hasPhase2Level2Adapter(slug)
    ? applyPhase2ToolChromeAdapter(frame, slug)
    : false;

  return {
    cleanupReady,
    level2: true,
    adapterReady: Boolean(phase1Ready || phase2Ready),
  };
}
