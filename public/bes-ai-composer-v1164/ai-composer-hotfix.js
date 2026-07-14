const BES_AI_COMPOSER_VERSION = '11.6.4';
const ROOT = document.documentElement;
const TOOL_PATTERN = /^(tệp|file|màn hình|screen|nói|voice)$/i;
const HINT_PATTERN = /(enter.*gửi|shift\s*\+\s*enter|enter.*send)/i;
const COUNT_PATTERN = /^\s*\d+\s*\/\s*\d+\s*$/;
const SEND_PATTERN = /^(gửi|send|submit|➤|➜|➔|→|↗|▶|►)$/i;
let scanTimer = null;
let observer = null;

function visible(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function textOf(element) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function lowestCommonAncestor(elements) {
  const nodes = elements.filter(Boolean);
  if (!nodes.length) return null;
  let candidate = nodes[0];
  while (candidate && !nodes.every((node) => candidate.contains(node))) candidate = candidate.parentElement;
  return candidate;
}

function panelFor(textarea) {
  let best = null;
  let node = textarea.parentElement;
  for (let depth = 0; node && node !== document.body && depth < 14; depth += 1, node = node.parentElement) {
    const text = textOf(node).toLowerCase();
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const hasBrian = text.includes('brian ai');
    const hasComposerWords = /(tệp|file)/i.test(text) && /(màn hình|screen)/i.test(text) && /(nói|voice)/i.test(text);
    const dialogLike = node.matches('aside,[role="dialog"],[aria-modal="true"]') || style.position === 'fixed';
    if ((hasBrian && hasComposerWords) || (dialogLike && hasComposerWords)) {
      best = node;
      if (style.position === 'fixed' || node.matches('[role="dialog"],[aria-modal="true"]')) break;
    }
    if (rect.height > innerHeight * 0.94 && !hasBrian) break;
  }
  return best;
}

function findToolButtons(panel) {
  return [...panel.querySelectorAll('button,[role="button"]')].filter((button) => {
    const label = (button.getAttribute('aria-label') || button.getAttribute('title') || textOf(button)).trim();
    return TOOL_PATTERN.test(label) && visible(button);
  });
}

function findSendButton(panel, textarea) {
  const buttons = [...panel.querySelectorAll('button,[role="button"]')].filter(visible);
  const labelled = buttons.find((button) => {
    const label = (button.getAttribute('aria-label') || button.getAttribute('title') || textOf(button)).trim();
    return SEND_PATTERN.test(label) || /(^|\s)(gửi|send)(\s|$)/i.test(label);
  });
  if (labelled) return labelled;

  const textRect = textarea.getBoundingClientRect();
  return buttons
    .filter((button) => {
      const rect = button.getBoundingClientRect();
      const content = textOf(button);
      return rect.width <= 76 && rect.height <= 76 && rect.left >= textRect.left + textRect.width * 0.55 && rect.top >= textRect.top - 80 && rect.bottom <= textRect.bottom + 100 && content.length <= 3;
    })
    .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0] || null;
}

function findComposer(panel, textarea, sendButton, toolButtons) {
  const anchors = [textarea, sendButton, ...toolButtons].filter(Boolean);
  let common = lowestCommonAncestor(anchors);
  const panelRect = panel.getBoundingClientRect();
  if (common && common !== panel) {
    const rect = common.getBoundingClientRect();
    if (rect.height <= Math.min(360, panelRect.height * 0.48) && rect.bottom >= panelRect.bottom - 90) return common;
  }

  let best = null;
  let bestScore = -Infinity;
  for (let node = textarea.parentElement, depth = 0; node && node !== panel && depth < 10; depth += 1, node = node.parentElement) {
    const rect = node.getBoundingClientRect();
    const text = textOf(node);
    const buttons = node.querySelectorAll('button,[role="button"]').length;
    let score = 0;
    if (node.matches('form')) score += 6;
    if (buttons >= 2) score += 4;
    if (HINT_PATTERN.test(text)) score += 5;
    if (rect.bottom >= panelRect.bottom - 100) score += 4;
    if (rect.top >= panelRect.top + panelRect.height * 0.5) score += 3;
    if (rect.height >= 110 && rect.height <= 340) score += 4;
    if (rect.width >= panelRect.width * 0.72) score += 3;
    if (rect.height > panelRect.height * 0.55) score -= 10;
    if (score > bestScore) { bestScore = score; best = node; }
  }
  return best || textarea.parentElement;
}

function markAuxiliaryElements(composer, toolButtons) {
  if (toolButtons.length) {
    const toolRow = lowestCommonAncestor(toolButtons);
    if (toolRow && composer.contains(toolRow)) toolRow.dataset.besAiToolsV1164 = 'true';
  }

  [...composer.querySelectorAll('*')].forEach((element) => {
    if (!(element instanceof HTMLElement) || element.children.length > 2) return;
    const text = textOf(element);
    if (COUNT_PATTERN.test(text)) element.dataset.besAiCountV1164 = 'true';
    if (HINT_PATTERN.test(text) && text.length < 120) element.dataset.besAiHintV1164 = 'true';
  });
}

function important(element, properties) {
  if (!(element instanceof HTMLElement)) return;
  Object.entries(properties).forEach(([name, value]) => element.style.setProperty(name, value, 'important'));
}

function enforceInlineLayout(panel, composer, textarea, sendButton) {
  important(composer, {
    position: 'relative', display: 'flex', 'flex-direction': 'column', 'align-items': 'stretch',
    width: '100%', 'min-width': '0', 'max-width': '100%', 'min-height': '158px',
    'box-sizing': 'border-box', overflow: 'visible', 'writing-mode': 'horizontal-tb', transform: 'none'
  });

  let node = textarea.parentElement;
  while (node && node !== composer) {
    node.dataset.besAiComposerPathV1164 = 'true';
    important(node, {
      position: 'relative', display: 'block', width: '100%', 'min-width': '0', 'max-width': '100%',
      flex: '0 0 auto', 'grid-column': '1 / -1', 'box-sizing': 'border-box',
      'writing-mode': 'horizontal-tb', transform: 'none', float: 'none', inset: 'auto'
    });
    node = node.parentElement;
  }

  important(textarea, {
    position: 'static', display: 'block', width: '100%', 'min-width': '100%', 'max-width': '100%',
    height: '96px', 'min-height': '96px', 'max-height': '260px', margin: '8px 0 0',
    padding: '14px 66px 14px 15px', 'box-sizing': 'border-box', flex: '0 0 auto',
    'grid-column': '1 / -1', 'grid-row': 'auto', 'align-self': 'stretch',
    'writing-mode': 'horizontal-tb', 'text-orientation': 'mixed', 'white-space': 'pre-wrap',
    'overflow-wrap': 'anywhere', 'word-break': 'normal', 'line-height': '1.45', resize: 'vertical',
    'overflow-y': 'auto', transform: 'none', float: 'none', inset: 'auto'
  });

  if (sendButton) {
    important(sendButton, {
      position: 'absolute', right: '12px', top: '64px', bottom: 'auto', left: 'auto',
      width: '48px', 'min-width': '48px', 'max-width': '48px', height: '48px',
      'min-height': '48px', 'max-height': '48px', padding: '0', margin: '0',
      display: 'grid', 'place-items': 'center', 'border-radius': '999px', 'z-index': '6',
      'writing-mode': 'horizontal-tb', transform: 'none'
    });
  }
  panel.style.setProperty('--bes-ai-composer-hotfix', BES_AI_COMPOSER_VERSION);
}

function repairTextarea(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement) || !visible(textarea)) return false;
  const panel = panelFor(textarea);
  if (!panel) return false;
  const toolButtons = findToolButtons(panel);
  if (toolButtons.length < 2) return false;
  const sendButton = findSendButton(panel, textarea);
  const composer = findComposer(panel, textarea, sendButton, toolButtons);
  if (!composer || composer === panel) return false;

  panel.dataset.besAiPanelV1164 = 'true';
  composer.dataset.besAiComposerV1164 = 'true';
  textarea.dataset.besAiTextareaV1164 = 'true';
  if (textarea.parentElement) textarea.parentElement.dataset.besAiInputShellV1164 = 'true';
  if (sendButton) sendButton.dataset.besAiSendV1164 = 'true';
  markAuxiliaryElements(composer, toolButtons);
  enforceInlineLayout(panel, composer, textarea, sendButton);
  return true;
}

function scan() {
  clearTimeout(scanTimer);
  scanTimer = null;
  let repaired = 0;
  document.querySelectorAll('textarea').forEach((textarea) => { if (repairTextarea(textarea)) repaired += 1; });
  if (repaired) {
    ROOT.dataset.besAiComposerHotfix = BES_AI_COMPOSER_VERSION;
    window.dispatchEvent(new CustomEvent('bes:ai-composer-repaired', { detail: { version: BES_AI_COMPOSER_VERSION, repaired } }));
  }
}

function scheduleScan(delay = 40) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, delay);
}

function boot() {
  scan();
  observer = new MutationObserver(() => scheduleScan(60));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-expanded'] });
  window.addEventListener('hashchange', () => scheduleScan(80));
  window.addEventListener('resize', () => scheduleScan(80), { passive: true });
  window.addEventListener('bes:ai-open', () => scheduleScan(30));
  setTimeout(scan, 350);
  setTimeout(scan, 1200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

window.BESAIComposerHotfix = Object.freeze({ version: BES_AI_COMPOSER_VERSION, scan });
