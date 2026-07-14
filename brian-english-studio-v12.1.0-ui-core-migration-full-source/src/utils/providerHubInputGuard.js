const EDITING_ATTR = 'data-bes-provider-key-editing';
const INPUT_ATTR = 'data-bes-api-key-input';
const EDITOR_ATTR = 'data-bes-provider-editor-locked';
const LIST_ATTR = 'data-bes-provider-list';

function textOf(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function fieldHint(input) {
  return [input?.name, input?.id, input?.placeholder, input?.getAttribute?.('aria-label'), input?.getAttribute?.('autocomplete')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function isProviderApiKeyInput(node) {
  if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return false;
  const hint = fieldHint(node);
  if (/api\s*key|apikey|access\s*token|bearer\s*token|provider\s*key/.test(hint)) return true;
  if (node instanceof HTMLInputElement && node.type === 'password') {
    const host = node.closest('[class*="provider"], [data-provider], article, section, form, div');
    const context = textOf(host);
    return context.includes('api key') && (context.includes('provider') || context.includes('model') || context.includes('base url'));
  }
  return false;
}

function findProviderEditor(input) {
  const direct = input.closest('[data-provider-editor], [class*="provider-detail"], [class*="provider-editor"], [class*="provider-config"], [class*="provider-panel"]');
  if (direct) return direct;
  let current = input.parentElement;
  while (current && current !== document.body) {
    const context = textOf(current);
    const fields = current.querySelectorAll('input,select,textarea').length;
    if (context.includes('api key') && fields >= 1 && (context.includes('model') || context.includes('base url') || context.includes('provider'))) return current;
    current = current.parentElement;
  }
  return input.parentElement;
}

function commonAncestor(nodes) {
  if (!nodes.length) return null;
  let current = nodes[0].parentElement;
  while (current && current !== document.body) {
    if (nodes.every((node) => current.contains(node))) return current;
    current = current.parentElement;
  }
  return null;
}

function findProviderList(editor) {
  const scope = editor?.closest('[data-route="settings"], .settings-page, [class*="settings"], main') || document;
  const direct = scope.querySelector('[data-provider-list], [class*="provider-list"], [class*="provider-grid"], [class*="provider-catalog"]');
  if (direct && !direct.contains(editor)) return direct;
  const candidates = [...scope.querySelectorAll('button,a,[role="button"]')].filter((node) => {
    if (editor?.contains(node)) return false;
    const text = textOf(node);
    return text.includes('lấy api key') || text.includes('api key') || text.includes('openrouter') || text.includes('google gemini') || text.includes('groqcloud');
  });
  if (candidates.length < 2) return null;
  const ancestor = commonAncestor(candidates.slice(0, Math.min(6, candidates.length)));
  return ancestor && !ancestor.contains(editor) ? ancestor : null;
}

function configureInput(input) {
  if (!input || input.dataset.besProviderGuardInstalled === 'true') return;
  input.dataset.besProviderGuardInstalled = 'true';
  input.setAttribute(INPUT_ATTR, 'true');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('data-1p-ignore', 'true');
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-form-type', 'other');
  ['pointerdown', 'mousedown', 'click', 'dblclick', 'paste', 'copy', 'cut', 'keydown', 'keyup'].forEach((type) => {
    input.addEventListener(type, (event) => event.stopPropagation());
  });
}

export function installProviderHubInputGuard() {
  if (typeof document === 'undefined' || document.documentElement.dataset.besProviderGuard === 'true') return () => {};
  document.documentElement.dataset.besProviderGuard = 'true';
  let activeInput = null;
  let activeEditor = null;
  let activeList = null;
  let pointerInEditor = false;
  let unlockTimer = null;

  const markLocked = (input) => {
    if (!isProviderApiKeyInput(input)) return;
    configureInput(input);
    activeInput = input;
    activeEditor = findProviderEditor(input);
    activeList = findProviderList(activeEditor);
    document.documentElement.setAttribute(EDITING_ATTR, 'true');
    activeEditor?.setAttribute(EDITOR_ATTR, 'true');
    activeList?.setAttribute(LIST_ATTR, 'true');
  };

  const clearLocked = () => {
    if (activeEditor?.contains(document.activeElement) || pointerInEditor) return;
    document.documentElement.removeAttribute(EDITING_ATTR);
    activeEditor?.removeAttribute(EDITOR_ATTR);
    activeList?.removeAttribute(LIST_ATTR);
    activeInput = null;
    activeEditor = null;
    activeList = null;
  };

  const scheduleUnlock = () => {
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(clearLocked, 140);
  };

  const scan = (root = document) => {
    const nodes = root.querySelectorAll?.('input,textarea') || [];
    nodes.forEach((node) => {
      if (isProviderApiKeyInput(node)) configureInput(node);
    });
  };

  const onFocusIn = (event) => {
    if (isProviderApiKeyInput(event.target)) markLocked(event.target);
  };

  const onFocusOut = (event) => {
    if (!isProviderApiKeyInput(event.target)) return;
    const next = event.relatedTarget;
    if (next && activeEditor?.contains(next)) return;
    scheduleUnlock();
  };

  const onPointerOver = (event) => {
    const target = event.target;
    const input = target?.closest?.(`[${INPUT_ATTR}="true"]`);
    const editor = input ? findProviderEditor(input) : target?.closest?.(`[${EDITOR_ATTR}="true"], [data-provider-editor], [class*="provider-detail"], [class*="provider-editor"], [class*="provider-config"], [class*="provider-panel"]`);
    if (input) markLocked(input);
    if (editor && editor.querySelector?.(`[${INPUT_ATTR}="true"]`)) {
      activeEditor = editor;
      pointerInEditor = true;
      const keyInput = editor.querySelector(`[${INPUT_ATTR}="true"]`);
      if (keyInput) markLocked(keyInput);
    }
  };

  const onPointerOut = (event) => {
    if (!activeEditor) return;
    const fromEditor = activeEditor.contains(event.target);
    const toEditor = activeEditor.contains(event.relatedTarget);
    if (fromEditor && !toEditor) {
      pointerInEditor = false;
      scheduleUnlock();
    }
  };

  const stopProviderReset = (event) => {
    const related = event.relatedTarget;
    if (!related) return;
    const destinationInput = related.closest?.(`[${INPUT_ATTR}="true"]`);
    const destinationEditor = destinationInput ? findProviderEditor(destinationInput) : related.closest?.(`[${EDITOR_ATTR}="true"], [data-provider-editor], [class*="provider-detail"], [class*="provider-editor"], [class*="provider-config"], [class*="provider-panel"]`);
    if (!destinationEditor) return;
    const origin = event.target;
    const looksLikeProviderChoice = origin?.closest?.('[data-provider-list], [class*="provider-list"], [class*="provider-grid"], [class*="provider-catalog"], button, a, [role="button"]');
    if (looksLikeProviderChoice) {
      const keyInput = destinationEditor.querySelector?.('input,textarea');
      if (keyInput && isProviderApiKeyInput(keyInput)) markLocked(keyInput);
      event.stopPropagation();
    }
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (isProviderApiKeyInput(node)) configureInput(node);
        scan(node);
      });
    }
    if (activeInput && !activeInput.isConnected) {
      const replacement = activeEditor?.querySelector?.('input,textarea') || [...document.querySelectorAll('input,textarea')].find(isProviderApiKeyInput);
      if (replacement && isProviderApiKeyInput(replacement)) {
        configureInput(replacement);
        activeInput = replacement;
        window.requestAnimationFrame(() => {
          replacement.focus({ preventScroll: true });
          const end = String(replacement.value || '').length;
          try { replacement.setSelectionRange(end, end); } catch { /* unsupported field type */ }
        });
      }
    }
  });

  scan();
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('mouseover', onPointerOver, true);
  document.addEventListener('mouseout', stopProviderReset, true);
  document.addEventListener('pointerout', stopProviderReset, true);

  return () => {
    observer.disconnect();
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('pointerout', onPointerOut, true);
    document.removeEventListener('mouseover', onPointerOver, true);
    document.removeEventListener('mouseout', stopProviderReset, true);
    document.removeEventListener('pointerout', stopProviderReset, true);
    window.clearTimeout(unlockTimer);
    clearLocked();
  };
}
