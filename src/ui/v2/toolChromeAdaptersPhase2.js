const PHASE2_BASE_CSS = `
:root[data-b2-tool-adapter-phase2] {
  --b2p-canvas:#f5f8fc;
  --b2p-surface:#ffffff;
  --b2p-subtle:#eef4f9;
  --b2p-border:#d8e2ec;
  --b2p-border-strong:#b9c9d8;
  --b2p-ink:#13263a;
  --b2p-muted:#61758a;
  --b2p-blue:#1769e0;
  --b2p-blue-soft:#eaf2ff;
  --b2p-green:#11845b;
  --b2p-red:#c43b4d;
  --b2p-radius:10px;
  --b2p-radius-sm:8px;
  color-scheme:light;
}
:root[data-b2-tool-adapter-phase2] body {
  background:var(--b2p-canvas)!important;
  color:var(--b2p-ink)!important;
}
:root[data-b2-tool-adapter-phase2] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select) {
  background:#fff!important;
  color:var(--b2p-ink)!important;
  border-color:var(--b2p-border)!important;
  border-radius:var(--b2p-radius-sm)!important;
  box-shadow:none!important;
}
:root[data-b2-tool-adapter-phase2] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select):focus {
  border-color:#8fb8ef!important;
  outline:none!important;
  box-shadow:0 0 0 2px rgba(23,105,224,.12)!important;
}
:root[data-b2-tool-adapter-phase2] :where(button) { font-family:inherit; }
:root[data-b2-tool-adapter-phase2] :where(.panel,.inner-panel) { box-shadow:none!important; }
`;

const PHASE2_ADAPTER_CSS = {
  'textlab-activities': `
    :root[data-b2-tool-adapter-phase2="textlab-activities"] .textlab-material-hero { display:none!important; }
    :root[data-b2-tool-adapter-phase2="textlab-activities"] .textlab-integrated-page,
    :root[data-b2-tool-adapter-phase2="textlab-activities"] .textlab-frameless-page {
      padding:0!important; margin:0!important; max-width:none!important; background:#fff!important;
    }
    :root[data-b2-tool-adapter-phase2="textlab-activities"] .textlab-direct-workspace {
      margin:0!important; padding:0!important; border:0!important; border-radius:0!important; box-shadow:none!important; background:#fff!important;
    }
    :root[data-b2-tool-adapter-phase2="textlab-activities"] .textlab-direct-frame {
      width:100%!important; border:0!important; border-radius:0!important; box-shadow:none!important; background:#fff!important;
    }
  `,
  'lesson-plan-ai': `
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] .lesson-architect-page { background:var(--b2p-canvas)!important; }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] .lesson-v50-back { display:none!important; }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] .lesson-v50-hero {
      min-height:0!important; padding:20px!important; border:1px solid var(--b2p-border)!important;
      border-radius:10px!important; box-shadow:none!important; background:#fff!important;
      grid-template-columns:minmax(0,1fr) auto!important;
    }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] .lesson-v50-hero-illustration { display:none!important; }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] .lesson-v50-hero-copy h1 { font-size:clamp(28px,3vw,42px)!important; }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] :where(.panel,[class*="lesson-v50-"][class*="card"],[class*="lesson-"][class*="panel"]) {
      border-color:var(--b2p-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] :where(button) { box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase2="lesson-plan-ai"] :where(.lesson-v50-stat-card,[class*="workflow-card"],[class*="suggestion-card"]) { background:#fff!important; }
  `,
  'thpt-practice-hub': `
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-practice-page { background:var(--b2p-canvas)!important; }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-hero {
      gap:16px!important; padding:20px!important; border:1px solid var(--b2p-border)!important;
      border-radius:10px!important; box-shadow:none!important; background:#fff!important;
    }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-hero h1 { font-size:clamp(30px,3.4vw,46px)!important; }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-hero-actions button,
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-player-bar button { border-radius:8px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] :where(.thpt-stat-grid article,.thpt-source-summary,.thpt-card,.thpt-lesson-card,[class*="thpt-"][class*="panel"]) {
      background:#fff!important; border-color:var(--b2p-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] .thpt-player-bar {
      min-height:50px!important; padding:7px 12px!important; background:#fff!important;
      border-bottom:1px solid var(--b2p-border)!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="thpt-practice-hub"] :where(.thpt-modal,.thpt-dialog,[role="dialog"]) > :where(section,div) { border-radius:12px!important; }
  `,
  'seating-chart-studio': `
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro { background:var(--b2p-canvas)!important; color:var(--b2p-ink)!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__toolbar {
      min-height:50px!important; padding:7px 12px!important; background:#fff!important;
      border-bottom:1px solid var(--b2p-border)!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__brand { display:none!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__actions { margin-left:auto!important; gap:6px!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] :where(.scs-pro__actions button,.scs-pro__stage-actions button,.scs-pro__settings button,.scs-pro__create button) {
      border-radius:8px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__summary { gap:8px!important; padding:12px!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] :where(.scs-pro__stat,.scs-pro__stage,.scs-pro__settings,.scs-pro__card,.scs-pro__picker) {
      background:#fff!important; border-color:var(--b2p-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__tabs { background:var(--b2p-subtle)!important; border-radius:8px!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__modal { background:rgba(19,38,58,.32)!important; backdrop-filter:blur(6px)!important; }
    :root[data-b2-tool-adapter-phase2="seating-chart-studio"] .scs-pro__seat { box-shadow:none!important; }
  `,
  'reading-studio': `
    :root[data-b2-tool-adapter-phase2="reading-studio"] .reading-accordion-page {
      padding:18px 20px 80px!important; background:var(--b2p-canvas)!important;
    }
    :root[data-b2-tool-adapter-phase2="reading-studio"] .reading-accordion-hero {
      min-height:0!important; grid-template-columns:1fr!important; gap:14px!important; padding:22px!important;
      border:1px solid var(--b2p-border)!important; border-radius:10px!important; box-shadow:none!important; background:#fff!important;
    }
    :root[data-b2-tool-adapter-phase2="reading-studio"] .reading-accordion-hero-art { display:none!important; }
    :root[data-b2-tool-adapter-phase2="reading-studio"] .reading-accordion-hero h1 { font-size:clamp(30px,3.5vw,48px)!important; line-height:1.05!important; }
    :root[data-b2-tool-adapter-phase2="reading-studio"] .reading-accordion-benefits span { min-height:34px!important; border-radius:8px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter-phase2="reading-studio"] :where(.reading-accordion-hero-actions button,.reading-accordion-type-actions button,.reading-accordion-toolbar-actions button,.reading-accordion-footer-bar button,.reading-accordion-copy) {
      min-height:38px!important; border-radius:8px!important; box-shadow:none!important; transform:none!important;
    }
    :root[data-b2-tool-adapter-phase2="reading-studio"] :where([class*="reading-accordion-"][class*="card"],[class*="reading-accordion-"][class*="panel"],[class*="reading-accordion-"][class*="section"]) {
      border-color:var(--b2p-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
  `,
};

const TEXTLAB_INNER_CSS = `
:root { color-scheme:light; --b2-inner-border:#d8e2ec; --b2-inner-ink:#13263a; --b2-inner-blue:#1769e0; }
html,body { background:#fff!important; color:var(--b2-inner-ink)!important; }
:where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select) {
  background:#fff!important; color:var(--b2-inner-ink)!important; border-color:var(--b2-inner-border)!important;
  border-radius:8px!important; box-shadow:none!important;
}
:where(button) { box-shadow:none!important; }
:where(dialog,[role="dialog"],.modal,.drawer,.panel,.card) { border-radius:10px!important; box-shadow:none!important; }
`;

export const PHASE2_LEVEL_2_TOOL_SLUGS = new Set(Object.keys(PHASE2_ADAPTER_CSS));

export function hasPhase2Level2Adapter(slug) {
  return PHASE2_LEVEL_2_TOOL_SLUGS.has(slug);
}

function installStyle(doc, id, css) {
  if (!doc?.head) return false;
  let style = doc.getElementById(id);
  if (!style) {
    style = doc.createElement('style');
    style.id = id;
    doc.head.appendChild(style);
  }
  style.textContent = css;
  return true;
}

function adaptTextLabNestedFrame(doc) {
  const nested = doc?.querySelector?.('.textlab-integrated-frame, .textlab-direct-frame');
  if (!nested) return;
  const applyNested = () => {
    try {
      const nestedDoc = nested.contentDocument;
      if (!nestedDoc?.documentElement) return;
      nestedDoc.documentElement.dataset.b2NestedAdapter = 'textlab';
      installStyle(nestedDoc, 'b2-v2-textlab-inner-adapter', TEXTLAB_INNER_CSS);
    } catch {
      /* Embedded TextLab stays usable if browser isolation changes. */
    }
  };
  nested.addEventListener?.('load', applyNested, { once: true });
  applyNested();
  window.setTimeout(applyNested, 300);
  window.setTimeout(applyNested, 1200);
}

export function applyPhase2ToolChromeAdapter(frame, slug) {
  if (!frame || !slug || !hasPhase2Level2Adapter(slug)) return false;
  try {
    const doc = frame.contentDocument;
    if (!doc?.documentElement || !doc.head) return false;
    doc.documentElement.dataset.b2ToolAdapterPhase2 = slug;
    const installed = installStyle(doc, 'b2-v2-tool-chrome-adapter-phase2', `${PHASE2_BASE_CSS}\n${PHASE2_ADAPTER_CSS[slug] || ''}`);
    if (slug === 'textlab-activities') adaptTextLabNestedFrame(doc);
    return installed;
  } catch {
    return false;
  }
}
