(() => {
  'use strict';

  const BES_AI_GOVERNANCE_VERSION = '11.6.5';
  if (window.__BES_AI_GOVERNANCE_V1165__) return;
  window.__BES_AI_GOVERNANCE_V1165__ = true;

  const ROUTE_FRAGMENT = 'ai-governance';
  const STORAGE_PREFIX = 'bes:ai-governance:v1165';
  const SAVE_TEXT = 'lưu cấu hình';
  const PROMPT_LIMIT_RE = /prompt tokens limit exceeded\s*:\s*([\d,.]+)\s*>\s*([\d,.]+)/i;
  const CREDIT_ERROR_RE = /(insufficient credits|credit limit|can only afford|upgrade to a paid account|settings\/credits)/i;
  const AI_URL_RE = /(openrouter\.ai\/api\/v1\/(?:chat\/completions|responses)|\/api\/(?:ai|chat|generate)|chat\/completions|responses)/i;
  const GOVERNANCE_NOISE_RE = /(ai governance|governance policy|daily token budget|request quota|audit log|allowed action|action engine|requires confirmation|hành động được phép|ngân sách token|yêu cầu hôm nay|kiểm soát toàn hệ thống)/i;

  const runtime = {
    restoredForRoute: false,
    restoredRoot: null,
    userDirty: false,
    restoreTimers: [],
    observerTimer: 0,
    fetchInstalled: false,
    lastRoute: '',
  };

  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const isGovernanceRoute = () => normalize(location.hash).includes(ROUTE_FRAGMENT);

  function safeParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function accountScope() {
    const candidates = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        if (!/(user|auth|profile|session|supabase)/i.test(key)) continue;
        const value = localStorage.getItem(key) || '';
        if (value.length > 180000) continue;
        candidates.push(value);
      }
    } catch { /* storage may be restricted */ }
    const email = candidates.join('\n').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    return normalize(email || 'local-device').replace(/[^a-z0-9@._-]+/g, '-');
  }

  function storageKey() {
    return `${STORAGE_PREFIX}:${accountScope()}`;
  }

  function toast(title, detail = '') {
    let stack = document.getElementById('bes-v1165-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'bes-v1165-toast-stack';
      document.documentElement.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = 'bes-v1165-toast';
    item.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}`;
    stack.appendChild(item);
    requestAnimationFrame(() => { item.dataset.visible = 'true'; });
    setTimeout(() => {
      item.dataset.visible = 'false';
      setTimeout(() => item.remove(), 220);
    }, 4300);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function governanceRoot() {
    if (!isGovernanceRoute()) return null;
    const candidates = [...document.querySelectorAll('main, [role="main"], section, div')];
    const anchor = candidates.find((element) => {
      const text = normalize(element.textContent).slice(0, 1400);
      return text.includes('kiem soat toan he thong') && text.includes('hanh dong duoc phep');
    });
    if (!anchor) return document.querySelector('main, [role="main"]') || document.body;
    let current = anchor;
    while (current.parentElement && current.parentElement !== document.body) {
      const parentText = normalize(current.parentElement.textContent);
      if (parentText.includes('luu cau hinh') && parentText.includes('xuat bao cao json')) current = current.parentElement;
      else break;
    }
    return current;
  }

  function visible(element) {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }

  function labelFor(element, index) {
    const direct = element.getAttribute('aria-label') || element.getAttribute('name') || element.getAttribute('title');
    if (direct) return normalize(direct).slice(0, 140);
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label?.textContent) return normalize(label.textContent).slice(0, 140);
    }
    let parent = element.parentElement;
    for (let depth = 0; parent && depth < 3; depth += 1, parent = parent.parentElement) {
      const text = normalize(parent.textContent).replace(normalize(element.value || ''), '').slice(0, 180);
      if (text.length >= 3) return text;
    }
    return `${element.tagName.toLowerCase()}-${index}`;
  }

  function controlFingerprint(element, index) {
    return [
      element.tagName.toLowerCase(),
      element.getAttribute('type') || '',
      element.getAttribute('role') || '',
      labelFor(element, index),
      index,
    ].join('|');
  }

  function collectControls(root) {
    const nativeControls = [...root.querySelectorAll('input, select, textarea')].filter(visible);
    const switches = [...root.querySelectorAll('button[role="switch"], [role="switch"]')]
      .filter((element) => visible(element) && !nativeControls.includes(element));
    return [...nativeControls, ...switches].map((element, index) => ({
      key: controlFingerprint(element, index),
      label: labelFor(element, index),
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type') || '',
      value: 'value' in element ? String(element.value ?? '') : '',
      checked: 'checked' in element ? Boolean(element.checked) : null,
      ariaChecked: element.getAttribute('aria-checked'),
      dataState: element.getAttribute('data-state'),
    }));
  }

  function deriveConfig(controls) {
    const find = (...phrases) => controls.find((control) => phrases.some((phrase) => control.label.includes(normalize(phrase))));
    const number = (control, fallback) => {
      const parsed = Number(String(control?.value || '').replace(/[^\d.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const bool = (control, fallback) => {
      if (!control) return fallback;
      if (control.checked !== null) return control.checked;
      if (control.ariaChecked !== null) return control.ariaChecked === 'true';
      if (control.dataState) return control.dataState === 'checked' || control.dataState === 'on';
      return fallback;
    };
    return {
      enabled: bool(find('bật brian ai', 'bat brian ai'), true),
      actionsEnabled: bool(find('cho phép hành động ai', 'cho phep hanh dong ai'), true),
      confirmationRequired: bool(find('luôn yêu cầu xác nhận', 'luon yeu cau xac nhan'), true),
      dailyRequestLimit: number(find('số yêu cầu tối đa/ngày', 'so yeu cau toi da/ngay'), 120),
      dailyTokenBudget: number(find('ngân sách token/ngày', 'ngan sach token/ngay'), 180000),
      maxOutputTokens: number(find('trần output mỗi yêu cầu', 'tran output moi yeu cau'), 2200),
    };
  }

  function writeSnapshot(snapshot, announce = false) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(snapshot));
      localStorage.setItem(`${STORAGE_PREFIX}:latest`, JSON.stringify(snapshot));
    } catch (error) {
      if (announce) toast('Không thể lưu cấu hình', error?.message || 'Trình duyệt đang chặn localStorage.');
      return false;
    }
    window.dispatchEvent(new CustomEvent('bes-ai-governance-updated', { detail: snapshot }));
    window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: { source: `v${BES_AI_GOVERNANCE_VERSION}`, config: snapshot.config } }));
    try {
      const channel = new BroadcastChannel('bes-ai-governance');
      channel.postMessage({ type: 'governance-updated', version: BES_AI_GOVERNANCE_VERSION, snapshot });
      channel.close();
    } catch { /* BroadcastChannel is optional */ }
    if (announce) toast('Đã lưu cấu hình AI', 'Thiết lập đã được lưu thật trên trình duyệt và áp dụng cho các yêu cầu mới.');
    return true;
  }

  function saveSnapshot(announce = false) {
    const root = governanceRoot();
    if (!root) return false;
    const controls = collectControls(root);
    if (controls.length < 3) return false;
    const snapshot = {
      schema: 2,
      version: BES_AI_GOVERNANCE_VERSION,
      savedAt: new Date().toISOString(),
      account: accountScope(),
      controls,
      config: deriveConfig(controls),
    };
    const saved = writeSnapshot(snapshot, announce);
    if (saved) {
      const button = [...root.querySelectorAll('button')].find((item) => normalize(item.textContent).includes(SAVE_TEXT));
      if (button) {
        button.dataset.besGovernanceSavedV1165 = 'true';
        button.title = `Đã lưu thật lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    return saved;
  }

  function readSnapshot() {
    try {
      return safeParse(localStorage.getItem(storageKey())) || safeParse(localStorage.getItem(`${STORAGE_PREFIX}:latest`));
    } catch { return null; }
  }

  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setNativeChecked(element, checked) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (setter) setter.call(element, checked);
    else element.checked = checked;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyControl(element, saved) {
    if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
      if (saved.checked !== null && element.checked !== saved.checked) setNativeChecked(element, saved.checked);
      return;
    }
    if (element.matches('[role="switch"]')) {
      const target = saved.ariaChecked === 'true' || saved.dataState === 'checked' || saved.dataState === 'on';
      const current = element.getAttribute('aria-checked') === 'true' || element.getAttribute('data-state') === 'checked' || element.getAttribute('data-state') === 'on';
      if (target !== current && typeof element.click === 'function') element.click();
      return;
    }
    if ('value' in element && saved.value !== undefined && String(element.value) !== String(saved.value)) setNativeValue(element, saved.value);
  }

  function restoreSnapshot() {
    if (!isGovernanceRoute()) return false;
    const snapshot = readSnapshot();
    const root = governanceRoot();
    if (!snapshot?.controls?.length || !root) return false;
    const elements = [...root.querySelectorAll('input, select, textarea, button[role="switch"], [role="switch"]')].filter(visible);
    if (elements.length < 3) return false;
    const byKey = new Map(snapshot.controls.map((control) => [control.key, control]));
    const byLabel = new Map(snapshot.controls.map((control) => [control.label, control]));
    elements.forEach((element, index) => {
      const key = controlFingerprint(element, index);
      const saved = byKey.get(key) || byLabel.get(labelFor(element, index)) || snapshot.controls[index];
      if (saved) applyControl(element, saved);
    });
    runtime.restoredForRoute = true;
    runtime.restoredRoot = root;
    root.dataset.besGovernanceRestoredV1165 = 'true';
    window.dispatchEvent(new CustomEvent('bes-ai-governance-restored', { detail: snapshot }));
    return true;
  }

  function scheduleRestore() {
    runtime.restoreTimers.forEach((timer) => clearTimeout(timer));
    runtime.restoreTimers = [];
    if (!isGovernanceRoute()) {
      runtime.restoredForRoute = false;
      runtime.restoredRoot = null;
      runtime.userDirty = false;
      return;
    }
    const delays = [180, 720, 1500];
    runtime.restoreTimers = delays.map((delay) => window.setTimeout(() => {
      const root = governanceRoot();
      const rootWasReplaced = root && runtime.restoredRoot && root !== runtime.restoredRoot;
      if (!runtime.userDirty && (!runtime.restoredForRoute || rootWasReplaced || !root?.dataset?.besGovernanceRestoredV1165)) {
        restoreSnapshot();
      }
    }, delay));
  }

  function parseNumber(value) {
    const number = Number(String(value || '').replace(/[,\s]/g, ''));
    return Number.isFinite(number) ? number : 0;
  }

  function estimateTokens(text) {
    const value = String(text || '');
    if (!value) return 0;
    const latin = (value.match(/[\x00-\x7F]/g) || []).length;
    const nonLatin = value.length - latin;
    return Math.ceil(latin / 3.15 + nonLatin / 1.65);
  }

  function clipText(text, maxChars) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (value.length <= maxChars) return value;
    if (maxChars < 120) return value.slice(0, Math.max(0, maxChars));
    const head = Math.floor(maxChars * 0.64);
    const tail = Math.floor(maxChars * 0.28);
    return `${value.slice(0, head)}\n[…đã rút gọn để phù hợp giới hạn OpenRouter…]\n${value.slice(-tail)}`;
  }

  function contentToText(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return JSON.stringify(content ?? '');
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text' || part?.type === 'input_text') return part.text || part.content || '';
      return '';
    }).filter(Boolean).join('\n');
  }

  function replaceTextContent(content, nextText) {
    if (typeof content === 'string') return nextText;
    if (!Array.isArray(content)) return nextText;
    let replaced = false;
    const next = content.map((part) => {
      if (!replaced && part && (part.type === 'text' || part.type === 'input_text')) {
        replaced = true;
        return { ...part, text: nextText, content: nextText };
      }
      return part;
    });
    if (!replaced) next.unshift({ type: 'text', text: nextText });
    return next;
  }

  function compactMessages(messages, tokenBudget) {
    if (!Array.isArray(messages) || !messages.length) return messages;
    const clean = messages.filter((message) => {
      const text = contentToText(message?.content);
      return !(message?.role === 'system' && GOVERNANCE_NOISE_RE.test(text) && estimateTokens(text) > 90);
    });
    const systems = clean.filter((message) => message?.role === 'system');
    const users = clean.filter((message) => message?.role === 'user');
    const assistants = clean.filter((message) => message?.role === 'assistant');
    const latestUser = users.at(-1) || clean.at(-1);
    const latestAssistant = assistants.at(-1);
    const maxChars = Math.max(360, Math.floor(tokenBudget * 2.45));
    const systemChars = Math.min(360, Math.floor(maxChars * 0.22));
    const assistantChars = latestAssistant ? Math.min(180, Math.floor(maxChars * 0.12)) : 0;
    const userChars = Math.max(220, maxChars - systemChars - assistantChars - 150);
    const result = [];
    if (systems[0]) {
      result.push({ ...systems[0], content: replaceTextContent(systems[0].content, clipText(contentToText(systems[0].content), systemChars)) });
    }
    if (latestAssistant && latestAssistant !== latestUser) {
      result.push({ ...latestAssistant, content: replaceTextContent(latestAssistant.content, clipText(contentToText(latestAssistant.content), assistantChars)) });
    }
    if (latestUser) {
      result.push({ ...latestUser, role: latestUser.role || 'user', content: replaceTextContent(latestUser.content, clipText(contentToText(latestUser.content), userChars)) });
    }
    result.unshift({
      role: 'system',
      content: 'OpenRouter free-rescue mode: answer the latest user request directly. Preserve the requested language, item count and output format. Do not discuss token limits.',
    });
    return result;
  }

  function walkAndCompact(value, tokenBudget, depth = 0) {
    if (!value || depth > 5) return value;
    if (Array.isArray(value)) return value.map((item) => walkAndCompact(item, tokenBudget, depth + 1));
    if (typeof value !== 'object') return value;
    const next = { ...value };
    for (const [key, item] of Object.entries(next)) {
      const normalizedKey = normalize(key);
      if (normalizedKey === 'messages' && Array.isArray(item)) {
        next[key] = compactMessages(item, tokenBudget);
      } else if (['messages', 'input', 'history', 'conversation'].includes(normalizedKey) && Array.isArray(item)) {
        next[key] = compactMessages(item, tokenBudget);
      } else if (['prompt', 'input', 'context', 'pagecontext', 'documentcontext', 'instructions', 'source', 'sourcetext', 'userprompt', 'systemprompt', 'query'].includes(normalizedKey) && typeof item === 'string') {
        const maxChars = Math.max(360, Math.floor(tokenBudget * 2.45));
        next[key] = clipText(item, maxChars);
      } else if (typeof item === 'object' && item !== null) {
        next[key] = walkAndCompact(item, tokenBudget, depth + 1);
      }
    }
    return next;
  }

  function forceOpenRouterFree(payload) {
    const next = typeof structuredClone === 'function'
      ? structuredClone(payload)
      : JSON.parse(JSON.stringify(payload));
    const apply = (object, depth = 0) => {
      if (!object || typeof object !== 'object' || depth > 4) return;
      if ('provider' in object && typeof object.provider === 'string') object.provider = 'openrouter';
      if ('model' in object) object.model = 'openrouter/free';
      for (const key of ['modelId', 'model_id', 'aiModel']) {
        if (key in object) object[key] = 'openrouter/free';
      }
      if ('models' in object && Array.isArray(object.models)) object.models = ['openrouter/free'];
      if ('reasoning' in object) delete object.reasoning;
      if ('reasoning_effort' in object) delete object.reasoning_effort;
      if ('include_reasoning' in object) object.include_reasoning = false;
      for (const [key, value] of Object.entries(object)) {
        if (value && typeof value === 'object' && /(config|options|provider|ai|request)/i.test(key)) apply(value, depth + 1);
      }
    };
    apply(next);
    next.model = 'openrouter/free';
    if (Array.isArray(next.models)) next.models = ['openrouter/free'];
    return next;
  }

  function payloadLooksOpenRouter(payload, url) {
    if (/openrouter\.ai/i.test(url)) return true;
    const serialized = JSON.stringify(payload || {}).slice(0, 12000);
    return /openrouter/i.test(serialized);
  }

  async function requestDescriptor(input, init = {}) {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    let bodyText = typeof init.body === 'string' ? init.body : '';
    if (!bodyText && request && method !== 'GET' && method !== 'HEAD') {
      try { bodyText = await request.clone().text(); } catch { bodyText = ''; }
    }
    const payload = safeParse(bodyText);
    return { request, url, method, bodyText, payload };
  }

  function retryInput(descriptor, init, body) {
    const bodyText = JSON.stringify(body);
    const headers = new Headers(init?.headers || descriptor.request?.headers || {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (descriptor.request) {
      return [new Request(descriptor.request, { method: descriptor.method, headers, body: bodyText }), undefined];
    }
    return [descriptor.url, { ...init, method: descriptor.method, headers, body: bodyText }];
  }

  async function responseText(response) {
    try { return await response.clone().text(); } catch { return ''; }
  }

  function promptLimit(text) {
    const match = String(text || '').match(PROMPT_LIMIT_RE);
    if (!match) return null;
    return { requested: parseNumber(match[1]), allowed: parseNumber(match[2]) };
  }

  async function rescueOpenRouter(descriptor, init, response, errorText) {
    const limit = promptLimit(errorText);
    if (!descriptor.payload || (!limit && !CREDIT_ERROR_RE.test(errorText))) return response;
    const confirmedOpenRouter = payloadLooksOpenRouter(descriptor.payload, descriptor.url)
      || /openrouter|settings\/credits/i.test(errorText)
      || Boolean(limit);
    if (!confirmedOpenRouter) return response;

    const allowed = Math.max(180, limit?.allowed || 520);
    const firstBudget = Math.max(150, Math.floor(allowed * 0.72));
    let retryBody = walkAndCompact(descriptor.payload, firstBudget);
    const saved = readSnapshot();
    const cap = Number(saved?.config?.maxOutputTokens || 0);
    if (cap > 0 && 'max_tokens' in retryBody) retryBody.max_tokens = Math.min(Number(retryBody.max_tokens || cap), cap);

    let [retryRequest, retryInit] = retryInput(descriptor, init, retryBody);
    let retryResponse = await window.__besOriginalFetchV1165(retryRequest, retryInit);
    if (retryResponse.ok) {
      window.dispatchEvent(new CustomEvent('bes-openrouter-free-rescue', { detail: { version: BES_AI_GOVERNANCE_VERSION, allowed, mode: 'compact-current-model' } }));
      toast('OpenRouter đã tự khôi phục', 'Phần ngữ cảnh thừa đã được loại bỏ; mô hình đang chọn vẫn được giữ nguyên.');
      return retryResponse;
    }

    const retryErrorText = await responseText(retryResponse);
    const secondLimit = promptLimit(retryErrorText);
    if (secondLimit || CREDIT_ERROR_RE.test(retryErrorText)) {
      const secondBudget = Math.max(96, Math.floor((secondLimit?.allowed || allowed) * 0.42));
      retryBody = forceOpenRouterFree(walkAndCompact(descriptor.payload, secondBudget));
      [retryRequest, retryInit] = retryInput(descriptor, init, retryBody);
      retryResponse = await window.__besOriginalFetchV1165(retryRequest, retryInit);
      if (retryResponse.ok) {
        window.dispatchEvent(new CustomEvent('bes-openrouter-free-rescue', { detail: { version: BES_AI_GOVERNANCE_VERSION, allowed: secondLimit?.allowed || allowed, mode: 'ultra-compact-free' } }));
        toast('OpenRouter đã tự khôi phục', 'Yêu cầu dài đã được chuyển sang chế độ siêu gọn trên mô hình miễn phí.');
      }
    }
    return retryResponse;
  }

  function installFetchResilience() {
    if (runtime.fetchInstalled || typeof window.fetch !== 'function') return;
    runtime.fetchInstalled = true;
    window.__besOriginalFetchV1165 = window.fetch.bind(window);
    window.fetch = async function besFetchV1165(input, init = {}) {
      const descriptor = await requestDescriptor(input, init);
      const response = await window.__besOriginalFetchV1165(input, init);
      if (response.ok || descriptor.method !== 'POST' || !AI_URL_RE.test(descriptor.url) || !descriptor.payload) return response;
      const text = await responseText(response);
      if (!PROMPT_LIMIT_RE.test(text) && !CREDIT_ERROR_RE.test(text)) return response;
      try {
        return await rescueOpenRouter(descriptor, init, response, text);
      } catch (error) {
        console.warn('[Brian V11.6.5] OpenRouter rescue failed:', error);
        return response;
      }
    };
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button, [role="button"]') : null;
    if (!button || !isGovernanceRoute()) return;
    if (normalize(button.textContent).includes(SAVE_TEXT)) {
      saveSnapshot(false);
      runtime.userDirty = false;
      runtime.restoredRoot = governanceRoot();
      setTimeout(() => saveSnapshot(true), 40);
    }
  }, true);

  document.addEventListener('submit', () => {
    if (isGovernanceRoute()) setTimeout(() => saveSnapshot(true), 0);
  }, true);

  document.addEventListener('input', (event) => {
    if (isGovernanceRoute() && event.isTrusted) runtime.userDirty = true;
  }, true);
  document.addEventListener('change', (event) => {
    if (isGovernanceRoute() && event.isTrusted) runtime.userDirty = true;
  }, true);

  function routeChanged() {
    const route = location.hash;
    if (route !== runtime.lastRoute) {
      runtime.lastRoute = route;
      runtime.restoredForRoute = false;
      runtime.restoredRoot = null;
      runtime.userDirty = false;
    }
    scheduleRestore();
  }

  window.addEventListener('hashchange', routeChanged);
  window.addEventListener('popstate', routeChanged);
  window.addEventListener('pageshow', routeChanged);
  document.addEventListener('DOMContentLoaded', routeChanged, { once: true });

  const observer = new MutationObserver(() => {
    clearTimeout(runtime.observerTimer);
    runtime.observerTimer = window.setTimeout(routeChanged, 90);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  installFetchResilience();
  routeChanged();

  window.BrianAIGovernanceV1165 = Object.freeze({
    version: BES_AI_GOVERNANCE_VERSION,
    save: () => saveSnapshot(true),
    restore: restoreSnapshot,
    getSaved: readSnapshot,
    compactMessages,
    estimateTokens,
  });
})();
