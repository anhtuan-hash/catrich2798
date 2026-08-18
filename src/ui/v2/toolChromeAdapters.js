const BASE_ADAPTER_CSS = `
:root[data-b2-tool-adapter] {
  --b2a-canvas:#f5f8fc;
  --b2a-surface:#ffffff;
  --b2a-subtle:#f1f5f9;
  --b2a-border:#d8e2ec;
  --b2a-border-strong:#b9c9d8;
  --b2a-ink:#13263a;
  --b2a-muted:#61758a;
  --b2a-blue:#1769e0;
  --b2a-blue-soft:#eaf2ff;
  --b2a-green:#11845b;
  --b2a-red:#c43b4d;
  --b2a-radius:10px;
  --b2a-radius-sm:8px;
  color-scheme:light;
}
:root[data-b2-tool-adapter] body {
  background:var(--b2a-canvas)!important;
  color:var(--b2a-ink)!important;
}
:root[data-b2-tool-adapter] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select) {
  background:#fff!important;
  color:var(--b2a-ink)!important;
  border-color:var(--b2a-border)!important;
  border-radius:var(--b2a-radius-sm)!important;
  box-shadow:none!important;
}
:root[data-b2-tool-adapter] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select):focus {
  border-color:#8fb8ef!important;
  box-shadow:0 0 0 2px rgba(23,105,224,.12)!important;
  outline:none!important;
}
:root[data-b2-tool-adapter] :where(button) {
  font-family:inherit;
}
:root[data-b2-tool-adapter] :where(.panel,.inner-panel) {
  box-shadow:none!important;
}
`;

const ADAPTER_CSS = {
  'classroom-screen': `
    :root[data-b2-tool-adapter="classroom-screen"] section[aria-label="Brian Classroom Stage"] > header { display:none!important; }
    :root[data-b2-tool-adapter="classroom-screen"] section[aria-label="Brian Classroom Stage"] { background:#fff!important; }
    :root[data-b2-tool-adapter="classroom-screen"] section[aria-label="Brian Classroom Stage"] > div { background:#fff!important; }
  `,
  'knowledge-train': `
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-app { background:var(--b2a-canvas)!important; color:var(--b2a-ink)!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-topbar {
      min-height:50px!important; height:auto!important; padding:7px 12px!important;
      background:#fff!important; border-bottom:1px solid var(--b2a-border)!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-back,
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-brand { display:none!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-top-actions { margin-left:auto!important; gap:6px!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-btn {
      min-height:36px!important; border-radius:8px!important; box-shadow:none!important; padding:0 11px!important;
    }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-shell { gap:14px!important; padding:16px!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-main,
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-preview,
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-cars > article,
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-settings {
      background:#fff!important; border-color:var(--b2a-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-intro { margin-bottom:16px!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-intro > span { background:var(--b2a-blue-soft)!important; color:var(--b2a-blue)!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-editor-footer { position:sticky!important; bottom:0!important; background:rgba(255,255,255,.96)!important; border-top:1px solid var(--b2a-border)!important; }
    :root[data-b2-tool-adapter="knowledge-train"] .ktg-instruction { border-radius:0!important; box-shadow:none!important; }
  `,
  'crossword-trial': `
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-app { background:var(--b2a-canvas)!important; color:var(--b2a-ink)!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-topbar {
      min-height:50px!important; height:auto!important; padding:7px 12px!important;
      background:#fff!important; border-bottom:1px solid var(--b2a-border)!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-back,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-brand { display:none!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-mode { margin-left:auto!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-top-actions { gap:6px!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-btn,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-top-actions button,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-mode {
      min-height:36px!important; border-radius:8px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-editor-shell { gap:14px!important; padding:16px!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-editor-form,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-editor-preview,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-row-list > article,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-question-card,
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-progress-card {
      background:#fff!important; border-color:var(--b2a-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-statusbar { background:#fff!important; border-top:1px solid var(--b2a-border)!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="crossword-trial"] .bcg-modal-card { border-radius:12px!important; box-shadow:0 16px 44px rgba(19,38,58,.16)!important; }
  `,
  'flying-words': `
    :root[data-b2-tool-adapter="flying-words"] .flying-words-app,
    :root[data-b2-tool-adapter="flying-words"] .fwg-setup { background:var(--b2a-canvas)!important; color:var(--b2a-ink)!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-app-header {
      min-height:50px!important; padding:7px 12px!important; background:#fff!important;
      border-bottom:1px solid var(--b2a-border)!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="flying-words"] .fwg-app-header > .fwg-icon-button,
    :root[data-b2-tool-adapter="flying-words"] .fwg-app-brand { display:none!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-header-actions { margin-left:auto!important; gap:6px!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-header-button,
    :root[data-b2-tool-adapter="flying-words"] .fwg-button,
    :root[data-b2-tool-adapter="flying-words"] .fwg-start-button {
      border-radius:8px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="flying-words"] .fwg-setup-hero { padding-top:28px!important; padding-bottom:24px!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-builder-card,
    :root[data-b2-tool-adapter="flying-words"] .fwg-preview-card {
      background:#fff!important; border:1px solid var(--b2a-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="flying-words"] .fwg-game-toolbar { background:#fff!important; border-bottom:1px solid var(--b2a-border)!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-game-toolbar-actions button { border-radius:8px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="flying-words"] .fwg-answer-dock { background:#fff!important; border-top:1px solid var(--b2a-border)!important; box-shadow:none!important; }
  `,
  'exam-studio': `
    :root[data-b2-tool-adapter="exam-studio"] .exam-stepper,
    :root[data-b2-tool-adapter="exam-studio"] .exam-v19-stepper {
      background:#fff!important; border:1px solid var(--b2a-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="exam-studio"] .exam-stepper button { border-radius:8px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="exam-studio"] .exam-work-panel,
    :root[data-b2-tool-adapter="exam-studio"] .exam-v946-panel,
    :root[data-b2-tool-adapter="exam-studio"] .exam-v35-summary-bar,
    :root[data-b2-tool-adapter="exam-studio"] .exam-sample-library,
    :root[data-b2-tool-adapter="exam-studio"] .recognition-panel,
    :root[data-b2-tool-adapter="exam-studio"] .question-editor-card {
      background:#fff!important; border-color:var(--b2a-border)!important; border-radius:10px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="exam-studio"] .upload-zone,
    :root[data-b2-tool-adapter="exam-studio"] .exam-v946-upload { border-radius:10px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="exam-studio"] :where(.exam-work-panel,.exam-sample-library,.question-editor-card) button {
      border-radius:8px!important; box-shadow:none!important;
    }
    :root[data-b2-tool-adapter="exam-studio"] .exam-sample-card { border-radius:9px!important; box-shadow:none!important; }
    :root[data-b2-tool-adapter="exam-studio"] .exam-v35-summary-bar { position:sticky!important; top:0!important; z-index:5!important; }
  `,
};

export const LEVEL_2_TOOL_SLUGS = new Set(Object.keys(ADAPTER_CSS));

export function hasLevel2ChromeAdapter(slug) {
  return LEVEL_2_TOOL_SLUGS.has(slug);
}

export function applyToolChromeAdapter(frame, slug) {
  if (!frame || !slug || !hasLevel2ChromeAdapter(slug)) return false;
  try {
    const doc = frame.contentDocument;
    if (!doc?.documentElement || !doc.head) return false;
    doc.documentElement.dataset.b2ToolAdapter = slug;
    let style = doc.getElementById('b2-v2-tool-chrome-adapter');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'b2-v2-tool-chrome-adapter';
      doc.head.appendChild(style);
    }
    style.textContent = `${BASE_ADAPTER_CSS}\n${ADAPTER_CSS[slug] || ''}`;
    return true;
  } catch {
    return false;
  }
}
