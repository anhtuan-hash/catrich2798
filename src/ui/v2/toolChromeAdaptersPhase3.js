const PHASE3_BASE_CSS = `
:root[data-b2-tool-adapter-phase3] {
  --b2x-canvas:#f5f8fc;
  --b2x-surface:#ffffff;
  --b2x-subtle:#eef4f9;
  --b2x-border:#d8e2ec;
  --b2x-ink:#13263a;
  --b2x-muted:#61758a;
  --b2x-blue:#1769e0;
  color-scheme:light;
}
:root[data-b2-tool-adapter-phase3] body { background:var(--b2x-canvas)!important; color:var(--b2x-ink)!important; }
:root[data-b2-tool-adapter-phase3] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select) {
  background:#fff!important; color:var(--b2x-ink)!important; border-color:var(--b2x-border)!important; border-radius:8px!important; box-shadow:none!important;
}
:root[data-b2-tool-adapter-phase3] :where(button) { font-family:inherit; box-shadow:none!important; }
`;

const PHASE3_ADAPTER_CSS = {
  'top-five-arena': `
    :root[data-b2-tool-adapter-phase3="top-five-arena"] .t5a-page { background:var(--b2x-canvas)!important; padding:16px!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] .t5a-window { border:1px solid var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; backdrop-filter:none!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] .t5a-titlebar { min-height:58px!important; padding:8px 12px!important; gap:10px!important; border-radius:10px 10px 0 0!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] .t5a-window-controls { display:none!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] :where(.t5a-board-card,.t5a-side-card,.t5a-popover,[class*="t5a-"][class*="panel"],[class*="t5a-"][class*="card"]) { border-color:var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; backdrop-filter:none!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] :where(.t5a-toolbar-button,.t5a-icon-button,.t5a-status-pill) { border-radius:8px!important; background:#fff!important; box-shadow:none!important; transform:none!important; }
    :root[data-b2-tool-adapter-phase3="top-five-arena"] .t5a-workspace { gap:12px!important; padding:12px!important; }
  `,
  'word2graph': `
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-page { background:var(--b2x-canvas)!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-back { display:none!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-topline { min-height:44px!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-hero { min-height:0!important; padding:20px!important; border:1px solid var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-demo { display:none!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] .wordgraph-v821-hero-main { grid-template-columns:1fr!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] :where(.wordgraph-v821-dashboard-card,.wordgraph-v821-ai-panel,.wordgraph-v821-canvas-panel,.wordgraph-v821-outline-panel,.wordgraph-ai-panel,.wordgraph-canvas-panel,.wordgraph-outline-panel) { border-color:var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="word2graph"] :where(.wordgraph-v821-hero-actions button,.wordgraph-v821-main-create,.wordgraph-v821-secondary-create,.wordgraph-v821-template-chips button,.wordgraph-toolbar button,.wordgraph-ai-actions button) { border-radius:8px!important; box-shadow:none!important; transform:none!important; }
  `,
  'vietnam-tax': `
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] .tax-studio-page { background:var(--b2x-canvas)!important; padding:18px 20px 54px!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] .tax-studio-back { display:none!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] .tax-studio-hero { grid-template-columns:1fr!important; gap:14px!important; padding:22px!important; border:1px solid var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] .tax-studio-hero-art { display:none!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] .tax-studio-hero h1 { font-size:clamp(30px,3.4vw,46px)!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] :where(.tax-studio-input-card,.tax-studio-panel,.tax-studio-reference-panel,.tax-studio-stat-grid article) { border-color:var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="vietnam-tax"] :where(.tax-studio-hero-actions button,.tax-studio-counter button,.tax-studio-region-grid button,.tax-studio-segmented button) { border-radius:8px!important; box-shadow:none!important; }
  `,
  'textcare': `
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] { background:var(--b2x-canvas)!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] .textcare-google-page { padding:16px 18px 54px!important; gap:14px!important; background:var(--b2x-canvas)!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] .tcg-topbar { min-height:56px!important; padding:7px 10px!important; border:1px solid var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; backdrop-filter:none!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] .tcg-workspace-hero { min-height:0!important; grid-template-columns:1fr!important; gap:14px!important; padding:22px!important; border:1px solid var(--b2x-border)!important; border-radius:10px!important; background:#fff!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] :where([class*="hero-art"],[class*="hero-visual"],[class*="hero-illustration"]) { display:none!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] :where(.tcg-workbench,[class*="tcg-"][class*="card"],[class*="tcg-"][class*="panel"],[class*="tcg-"][class*="drawer"],[class*="tcg-"][class*="dialog"]) { border-color:var(--b2x-border)!important; border-radius:10px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase3="textcare"] .metro-clean-system[data-tool="textcare"] :where(button) { border-radius:8px!important; box-shadow:none!important; transform:none!important; }
  `,
};

export const PHASE3_LEVEL_2_TOOL_SLUGS = new Set(Object.keys(PHASE3_ADAPTER_CSS));

export function hasPhase3Level2Adapter(slug) {
  return PHASE3_LEVEL_2_TOOL_SLUGS.has(slug);
}

export function applyPhase3ToolChromeAdapter(frame, slug) {
  if (!frame || !slug || !hasPhase3Level2Adapter(slug)) return false;
  try {
    const doc = frame.contentDocument;
    if (!doc?.documentElement || !doc.head) return false;
    doc.documentElement.dataset.b2ToolAdapterPhase3 = slug;
    let style = doc.getElementById('b2-v2-tool-chrome-adapter-phase3');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'b2-v2-tool-chrome-adapter-phase3';
      doc.head.appendChild(style);
    }
    style.textContent = `${PHASE3_BASE_CSS}\n${PHASE3_ADAPTER_CSS[slug] || ''}`;
    return true;
  } catch {
    return false;
  }
}
