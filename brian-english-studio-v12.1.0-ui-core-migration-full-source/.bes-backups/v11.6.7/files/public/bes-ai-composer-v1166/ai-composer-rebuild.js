(() => {
  'use strict';

  const VERSION = '11.6.6';
  const EDITABLE_SELECTOR = [
    'textarea',
    'input[type="text"]',
    'input:not([type])',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]'
  ].join(',');
  const TOOL_RE = /^(tệp|file|màn hình|screen|nói|voice)$/i;
  const SEND_RE = /^(gửi|send|submit|➤|➜|➔|→|↗|▶|►)$/i;
  const HINT_RE = /(enter\s*(để|to)?\s*(gửi|send)|shift\s*\+\s*enter)/i;
  const COUNT_RE = /^\s*\d+\s*\/\s*\d+\s*$/;
  const OLD_ATTRIBUTES = [
    'data-bes-ai-panel-v1164',
    'data-bes-ai-composer-v1164',
    'data-bes-ai-composer-path-v1164',
    'data-bes-ai-input-shell-v1164',
    'data-bes-ai-textarea-v1164',
    'data-bes-ai-send-v1164',
    'data-bes-ai-tools-v1164',
    'data-bes-ai-count-v1164',
    'data-bes-ai-hint-v1164'
  ];

  let observer = null;
  let timer = 0;
  let periodicTimer = 0;
  let lastReport = null;

  const textOf = (node) => String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  const labelOf = (node) => String(
    node?.getAttribute?.('aria-label') ||
    node?.getAttribute?.('title') ||
    node?.getAttribute?.('data-label') ||
    textOf(node)
  ).replace(/\s+/g, ' ').trim();

  function visible(node) {
    if (!(node instanceof HTMLElement)) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  }

  function setImportant(node, map) {
    if (!(node instanceof HTMLElement)) return;
    for (const [property, value] of Object.entries(map)) {
      node.style.setProperty(property, value, 'important');
    }
  }

  function clearOldMarkers(scope = document) {
    for (const attr of OLD_ATTRIBUTES) {
      scope.querySelectorAll?.(`[${attr}]`).forEach((node) => node.removeAttribute(attr));
    }
  }

  function toolButtons(panel) {
    return [...panel.querySelectorAll('button,[role="button"]')].filter((button) => visible(button) && TOOL_RE.test(labelOf(button)));
  }

  function panelFor(editor) {
    let best = null;
    let bestScore = -Infinity;
    let node = editor.parentElement;
    for (let depth = 0; node && node !== document.body && depth < 18; depth += 1, node = node.parentElement) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const text = textOf(node).toLowerCase();
      const tools = toolButtons(node).length;
      let score = 0;
      if (text.includes('brian ai')) score += 12;
      if (tools >= 2) score += 9;
      if (node.matches('aside,dialog,[role="dialog"],[aria-modal="true"]')) score += 5;
      if (style.position === 'fixed' || style.position === 'sticky') score += 4;
      if (rect.width >= 260 && rect.width <= 620) score += 3;
      if (rect.height >= 320) score += 2;
      if (rect.width >= innerWidth * 0.92 && !text.includes('brian ai')) score -= 12;
      if (rect.height >= innerHeight * 0.96 && !text.includes('brian ai')) score -= 10;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
      if (score >= 25 && (style.position === 'fixed' || node.matches('aside,dialog,[role="dialog"]'))) break;
    }
    return bestScore >= 15 ? best : null;
  }

  function candidateEditors(panel) {
    const panelRect = panel.getBoundingClientRect();
    return [...panel.querySelectorAll(EDITABLE_SELECTOR)]
      .filter((editor) => visible(editor))
      .filter((editor) => {
        if (editor instanceof HTMLInputElement) {
          const type = String(editor.type || 'text').toLowerCase();
          if (!['text', ''].includes(type)) return false;
          if (/search|tìm kiếm/i.test(editor.placeholder || '')) return false;
        }
        const rect = editor.getBoundingClientRect();
        return rect.top >= panelRect.top + panelRect.height * 0.45;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const aText = String(a.getAttribute('placeholder') || a.getAttribute('aria-label') || '');
        const bText = String(b.getAttribute('placeholder') || b.getAttribute('aria-label') || '');
        const aScore = ar.bottom + (/(nhắn|tin|message|hỏi|ask)/i.test(aText) ? 500 : 0);
        const bScore = br.bottom + (/(nhắn|tin|message|hỏi|ask)/i.test(bText) ? 500 : 0);
        return bScore - aScore;
      });
  }

  function findSendButton(panel, editor) {
    const buttons = [...panel.querySelectorAll('button,[role="button"]')].filter(visible);
    const labelled = buttons.find((button) => SEND_RE.test(labelOf(button)) || /(^|\s)(gửi|send)(\s|$)/i.test(labelOf(button)));
    if (labelled) return labelled;
    const editorRect = editor.getBoundingClientRect();
    return buttons
      .map((button) => ({ button, rect: button.getBoundingClientRect() }))
      .filter(({ button, rect }) => {
        const label = labelOf(button);
        return label.length <= 4 && rect.width <= 72 && rect.height <= 72 && rect.top >= editorRect.top - 100 && rect.bottom <= editorRect.bottom + 100 && rect.right >= editorRect.left;
      })
      .sort((a, b) => b.rect.right - a.rect.right)[0]?.button || null;
  }

  function ancestry(editor, panel) {
    const list = [];
    let node = editor.parentElement;
    while (node && node !== panel && node !== document.body) {
      list.push(node);
      node = node.parentElement;
    }
    return list;
  }

  function chooseWideRoot(panel, editor, tools) {
    const panelRect = panel.getBoundingClientRect();
    const minimumWide = Math.max(220, panelRect.width * 0.68);
    const ancestors = ancestry(editor, panel);
    let best = null;
    let bestScore = -Infinity;

    for (let index = 0; index < ancestors.length; index += 1) {
      const node = ancestors[index];
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const containsTools = tools.filter((tool) => node.contains(tool)).length;
      const text = textOf(node);
      let score = 0;
      if (rect.width >= minimumWide) score += 15;
      else score -= (minimumWide - rect.width) / 10;
      if (rect.bottom >= panelRect.bottom - 150) score += 5;
      if (rect.height >= 90 && rect.height <= Math.min(330, panelRect.height * 0.52)) score += 5;
      if (containsTools >= 2) score += 8;
      if (HINT_RE.test(text)) score += 4;
      if (node.matches('form,footer')) score += 4;
      if (style.display === 'grid' || style.display === 'flex') score += 2;
      if (rect.height > panelRect.height * 0.66) score -= 15;
      if (node === panel) score -= 20;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }

    if (best && best.getBoundingClientRect().width >= minimumWide * 0.9) return best;
    return ancestors.find((node) => node.getBoundingClientRect().width >= minimumWide) || ancestors.at(-1) || editor.parentElement;
  }

  function pathFromEditorToRoot(editor, root) {
    const result = [];
    let node = editor.parentElement;
    while (node && node !== root && node !== document.body) {
      result.push(node);
      node = node.parentElement;
    }
    if (node === root) result.push(root);
    return result;
  }

  function commonAncestor(nodes, stop) {
    const valid = nodes.filter(Boolean);
    if (!valid.length) return null;
    let candidate = valid[0];
    while (candidate && candidate !== stop && !valid.every((node) => candidate.contains(node))) candidate = candidate.parentElement;
    return candidate && candidate !== stop ? candidate : null;
  }

  function structuralFallback(root, editor, send) {
    const existing = root.querySelector(':scope > [data-bes-ai-fallback-host-v1166="true"]');
    const host = existing || document.createElement('div');
    host.dataset.besAiFallbackHostV1166 = 'true';
    setImportant(host, {
      position: 'relative', display: 'block', width: '100%', 'min-width': '0', 'max-width': '100%',
      'inline-size': '100%', 'min-inline-size': '0', 'max-inline-size': '100%',
      'grid-column': '1 / -1', 'grid-row': 'auto', 'align-self': 'stretch', 'justify-self': 'stretch',
      'box-sizing': 'border-box', 'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed'
    });
    if (!existing) {
      const hint = [...root.querySelectorAll('*')].find((node) => node instanceof HTMLElement && HINT_RE.test(textOf(node)) && node.children.length < 4);
      root.insertBefore(host, hint || null);
    }
    if (editor.parentElement !== host) host.appendChild(editor);
    if (send && send.parentElement !== host) host.appendChild(send);
    host.dataset.besAiShellV1166 = 'true';
    if (send) send.dataset.besAiSendInsideV1166 = 'true';
    return host;
  }

  function conflictReport(panel, root, editor) {
    const panelRect = panel.getBoundingClientRect();
    const chain = pathFromEditorToRoot(editor, root).map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        tag: node.tagName.toLowerCase(),
        className: String(node.className || '').slice(0, 160),
        width: Math.round(rect.width),
        display: style.display,
        position: style.position,
        writingMode: style.writingMode,
        gridColumn: style.gridColumn,
        minWidth: style.minWidth,
        inlineSize: style.inlineSize
      };
    });
    const editorStyle = getComputedStyle(editor);
    const causes = [];
    if (editor.getBoundingClientRect().width < panelRect.width * 0.55) causes.push('collapsed-editor-width');
    if (chain.some((item) => item.width < panelRect.width * 0.55)) causes.push('collapsed-ancestor-chain');
    if (chain.some((item) => item.writingMode !== 'horizontal-tb')) causes.push('vertical-writing-mode');
    if (chain.some((item) => item.position === 'absolute' || item.position === 'fixed')) causes.push('positioned-ancestor');
    if (editorStyle.writingMode !== 'horizontal-tb') causes.push('editor-writing-mode');
    return {
      version: VERSION,
      route: location.hash,
      timestamp: new Date().toISOString(),
      panelWidth: Math.round(panelRect.width),
      editorWidthBefore: Math.round(editor.getBoundingClientRect().width),
      causes: [...new Set(causes)],
      chain
    };
  }

  function repair(panel, editor) {
    const tools = toolButtons(panel);
    if (tools.length < 2) return false;
    const root = chooseWideRoot(panel, editor, tools);
    if (!(root instanceof HTMLElement)) return false;

    const report = conflictReport(panel, root, editor);
    const send = findSendButton(panel, editor);
    const path = pathFromEditorToRoot(editor, root);
    const shell = editor.parentElement;

    panel.dataset.besAiPanelV1166 = 'true';
    root.dataset.besAiRootV1166 = 'true';
    editor.dataset.besAiEditorV1166 = 'true';
    if (shell) shell.dataset.besAiShellV1166 = 'true';

    setImportant(root, {
      width: '100%', 'min-width': '0', 'max-width': '100%', 'inline-size': '100%',
      'min-inline-size': '0', 'max-inline-size': '100%', 'align-self': 'stretch',
      'justify-self': 'stretch', 'grid-column': '1 / -1', 'box-sizing': 'border-box',
      'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed'
    });

    for (const node of path) {
      if (node === root) continue;
      node.dataset.besAiPathV1166 = 'true';
      setImportant(node, {
        position: 'relative', inset: 'auto', display: 'block', width: '100%', 'min-width': '0',
        'max-width': '100%', 'inline-size': '100%', 'min-inline-size': '0', 'max-inline-size': '100%',
        flex: '1 1 auto', 'align-self': 'stretch', 'justify-self': 'stretch',
        'grid-column': '1 / -1', 'grid-row': 'auto', 'box-sizing': 'border-box',
        'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed', transform: 'none',
        float: 'none', columns: 'auto', 'column-width': 'auto'
      });
    }

    setImportant(editor, {
      position: 'static', inset: 'auto', display: 'block', width: '100%', 'min-width': '0',
      'max-width': '100%', 'inline-size': '100%', 'min-inline-size': '0', 'max-inline-size': '100%',
      height: '96px', 'min-height': '88px', 'max-height': '240px', margin: '0',
      padding: '14px 62px 14px 14px', 'box-sizing': 'border-box', flex: '1 1 auto',
      'align-self': 'stretch', 'justify-self': 'stretch', 'grid-column': '1 / -1', 'grid-row': 'auto',
      'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed', 'white-space': 'pre-wrap',
      'overflow-wrap': 'anywhere', 'word-break': 'normal', 'line-height': '1.45', resize: 'vertical',
      'overflow-x': 'hidden', 'overflow-y': 'auto', transform: 'none', float: 'none',
      columns: 'auto', 'column-width': 'auto'
    });

    const toolsRoot = commonAncestor(tools, panel);
    if (toolsRoot && root.contains(toolsRoot)) {
      toolsRoot.dataset.besAiToolsV1166 = 'true';
      setImportant(toolsRoot, {
        position: 'static', inset: 'auto', display: 'flex', 'flex-direction': 'row',
        'align-items': 'center', 'justify-content': 'flex-start', 'flex-wrap': 'wrap',
        width: '100%', 'min-width': '0', 'max-width': '100%', 'inline-size': '100%',
        'grid-column': '1 / -1', gap: '8px', 'writing-mode': 'horizontal-tb',
        'text-orientation': 'mixed', transform: 'none'
      });
    }

    if (send) {
      send.dataset.besAiSendV1166 = 'true';
      const isInsideShell = Boolean(shell && shell.contains(send));
      if (isInsideShell) send.dataset.besAiSendInsideV1166 = 'true';
      setImportant(send, {
        'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed', width: '44px',
        'min-width': '44px', 'max-width': '44px', height: '44px', 'min-height': '44px',
        'max-height': '44px', flex: '0 0 44px', transform: 'none'
      });
      if (isInsideShell) {
        setImportant(shell, { position: 'relative', 'min-height': '96px' });
        setImportant(send, {
          position: 'absolute', right: '9px', bottom: '9px', left: 'auto', top: 'auto',
          'z-index': '8', margin: '0', padding: '0', display: 'grid', 'place-items': 'center',
          'border-radius': '999px'
        });
      }
    }

    [...root.querySelectorAll('*')].forEach((node) => {
      if (!(node instanceof HTMLElement) || node.children.length > 3) return;
      const text = textOf(node);
      if (HINT_RE.test(text) && text.length < 140) node.dataset.besAiHintV1166 = 'true';
      if (COUNT_RE.test(text)) node.dataset.besAiCountV1166 = 'true';
    });

    let afterWidth = editor.getBoundingClientRect().width;
    const minimumHealthyWidth = Math.min(220, panel.getBoundingClientRect().width * 0.65);
    if (afterWidth < minimumHealthyWidth) {
      const fallbackHost = structuralFallback(root, editor, send);
      fallbackHost.dataset.besAiPathV1166 = 'true';
      setImportant(editor, {
        position: 'static', width: '100%', 'min-width': '0', 'max-width': '100%',
        'inline-size': '100%', 'min-inline-size': '0', 'max-inline-size': '100%',
        'grid-column': '1 / -1', 'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed'
      });
      if (send) {
        setImportant(send, {
          position: 'absolute', right: '9px', bottom: '9px', left: 'auto', top: 'auto',
          width: '44px', height: '44px', 'z-index': '8'
        });
      }
      afterWidth = editor.getBoundingClientRect().width;
      report.structuralFallback = true;
    }
    report.editorWidthAfter = Math.round(afterWidth);
    report.rootWidth = Math.round(root.getBoundingClientRect().width);
    report.repaired = afterWidth >= minimumHealthyWidth;
    lastReport = report;
    window.BESAIComposerRebuildV1166.lastReport = report;
    document.documentElement.dataset.besAiComposer = VERSION;
    return true;
  }

  function scan() {
    clearTimeout(timer);
    timer = 0;
    clearOldMarkers(document);
    let repaired = 0;
    const editors = [...document.querySelectorAll(EDITABLE_SELECTOR)].filter(visible);
    for (const editor of editors) {
      const panel = panelFor(editor);
      if (!panel) continue;
      const preferred = candidateEditors(panel)[0];
      if (preferred !== editor) continue;
      if (repair(panel, editor)) repaired += 1;
    }
    if (repaired) {
      window.dispatchEvent(new CustomEvent('bes:ai-composer-rebuilt', {
        detail: { version: VERSION, repaired, report: lastReport }
      }));
    }
    return repaired;
  }

  function schedule(delay = 50) {
    clearTimeout(timer);
    timer = window.setTimeout(scan, delay);
  }

  function boot() {
    clearOldMarkers(document);
    scan();
    observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList' && (record.addedNodes.length || record.removedNodes.length))) schedule(70);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    addEventListener('hashchange', () => schedule(90));
    addEventListener('resize', () => schedule(100), { passive: true });
    addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement && event.target.matches(EDITABLE_SELECTOR)) schedule(0);
    }, true);
    addEventListener('click', () => schedule(40), true);
    addEventListener('bes:ai-open', () => schedule(20));
    setTimeout(scan, 300);
    setTimeout(scan, 1000);
    periodicTimer = window.setInterval(() => {
      if (document.querySelector('[data-bes-ai-panel-v1166="true"], aside, [role="dialog"]')) scan();
    }, 2500);
  }

  window.BESAIComposerRebuildV1166 = {
    version: VERSION,
    get lastReport() { return lastReport; },
    set lastReport(value) { lastReport = value; },
    scan,
    stop() {
      observer?.disconnect();
      clearInterval(periodicTimer);
      clearTimeout(timer);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
