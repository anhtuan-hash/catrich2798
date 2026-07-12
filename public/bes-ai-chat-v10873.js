(function () {
  'use strict';

  var VERSION = '10.87.3';
  var STORAGE_KEY = 'bes-ai-chat-layout-v10873';
  var LEGACY_STORAGE_KEY = 'bes-ai-chat-layout-v10872';
  var PANEL_ATTR = 'data-bes-ai-chat-v10873';
  var ROLE_ATTR = 'data-bes-ai-chat-role';
  var DRAFT_ATTR = 'data-bes-ai-draft-v10873';
  var INPUT_WRAP_ATTR = 'data-bes-ai-chat-input-wrap';
  var scanTimer = null;
  var currentPanel = null;
  var observer = null;
  var boundInputs = new WeakSet();

  function safeGetState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function safeSetState(next) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function normalizedText(element) {
    return String(element && element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    var style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 240 && rect.height > 240 && rect.bottom > 0 && rect.right > 0;
  }

  function hasComposer(element) {
    return Boolean(element.querySelector('textarea, [contenteditable="true"], input[type="text"]'));
  }

  function scoreCandidate(element) {
    if (!isVisible(element) || !hasComposer(element)) return -1;
    var text = normalizedText(element);
    var rect = element.getBoundingClientRect();
    var score = 0;
    if (text.indexOf('brian ai') !== -1) score += 12;
    if (text.indexOf('màn hình') !== -1 || text.indexOf('man hinh') !== -1) score += 3;
    if (text.indexOf('tệp') !== -1 || text.indexOf('tep') !== -1) score += 2;
    if (text.indexOf('nói') !== -1 || text.indexOf('noi') !== -1) score += 2;
    if (text.indexOf('gửi') !== -1 || text.indexOf('gui') !== -1) score += 2;
    if (text.indexOf('dùng kết quả') !== -1 || text.indexOf('dung ket qua') !== -1) score += 2;
    if (rect.width >= 280 && rect.width <= 800) score += 3;
    if (rect.height >= 420 && rect.height <= 1000) score += 3;
    var position = window.getComputedStyle(element).position;
    if (position === 'fixed') score += 8;
    if (position === 'absolute') score += 3;
    if (element.getAttribute('role') === 'dialog') score += 4;
    if (element === document.body || element === document.documentElement) score -= 30;
    if (rect.width > window.innerWidth * 0.9) score -= 8;
    return score;
  }

  function findPanel() {
    var selectors = ['[role="dialog"]', '[class*="ai"][class*="chat"]', '[class*="assistant"]', '[class*="messenger"]', '[class*="chatbot"]', 'aside', 'section', 'div'];
    var seen = new Set();
    var candidates = [];
    selectors.forEach(function (selector) {
      var nodes;
      try { nodes = document.querySelectorAll(selector); } catch (_) { nodes = []; }
      Array.prototype.forEach.call(nodes, function (node) {
        if (seen.has(node)) return;
        seen.add(node);
        var score = scoreCandidate(node);
        if (score >= 15) candidates.push({ node: node, score: score, area: node.getBoundingClientRect().width * node.getBoundingClientRect().height });
      });
    });
    candidates.sort(function (a, b) { return b.score !== a.score ? b.score - a.score : a.area - b.area; });
    return candidates.length ? candidates[0].node : null;
  }

  function closestUsefulAncestor(node, panel, predicate) {
    var current = node;
    while (current && current !== panel) {
      if (predicate(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function markRole(element, role) {
    if (element && element !== currentPanel) element.setAttribute(ROLE_ATTR, role);
  }

  function findHeader(panel) {
    var descendants = panel.querySelectorAll('header, [class*="header"], [class*="title"], div');
    var best = null;
    var bestScore = -1;
    Array.prototype.forEach.call(descendants, function (node) {
      var text = normalizedText(node);
      if (text.indexOf('brian ai') === -1) return;
      var rect = node.getBoundingClientRect();
      if (rect.height < 34 || rect.height > 140 || rect.width < panel.getBoundingClientRect().width * 0.55) return;
      var score = 10 - Math.abs(rect.height - 64) / 20;
      if (node.parentElement === panel) score += 2;
      if (score > bestScore) { best = node; bestScore = score; }
    });
    return best;
  }

  function findComposer(panel) {
    var input = panel.querySelector('textarea') || panel.querySelector('[contenteditable="true"]') || panel.querySelector('input[type="text"]');
    if (!input) return { input: null, composer: null };
    var composer = closestUsefulAncestor(input, panel, function (node) {
      var rect = node.getBoundingClientRect();
      var text = normalizedText(node);
      var hasTool = text.indexOf('tệp') !== -1 || text.indexOf('màn hình') !== -1 || text.indexOf('nói') !== -1 || node.querySelectorAll('button').length >= 1;
      return rect.height >= 54 && rect.height <= 340 && rect.width >= panel.getBoundingClientRect().width * 0.68 && hasTool;
    });
    if (!composer) composer = input.parentElement;
    return { input: input, composer: composer };
  }

  function findToolbar(panel, composer) {
    var labels = ['sao chép', 'dùng kết quả', 'hành động', 'gửi sang', 'nghe'];
    var nodes = panel.querySelectorAll('div, nav, footer, section');
    var best = null;
    var bestMatches = 0;
    Array.prototype.forEach.call(nodes, function (node) {
      if (composer && composer.contains(node)) return;
      var rect = node.getBoundingClientRect();
      if (rect.height < 20 || rect.height > 130) return;
      var text = normalizedText(node);
      var matches = labels.reduce(function (count, label) { return count + (text.indexOf(label) !== -1 ? 1 : 0); }, 0);
      if (matches > bestMatches && rect.width >= panel.getBoundingClientRect().width * 0.62) { best = node; bestMatches = matches; }
    });
    return bestMatches >= 2 ? best : null;
  }

  function findQuickTools(composer) {
    if (!composer) return null;
    var nodes = composer.querySelectorAll('div, nav, section');
    var best = null;
    var bestScore = 0;
    Array.prototype.forEach.call(nodes, function (node) {
      var text = normalizedText(node);
      var score = 0;
      if (text.indexOf('tệp') !== -1) score += 1;
      if (text.indexOf('màn hình') !== -1) score += 1;
      if (text.indexOf('nói') !== -1) score += 1;
      if (score > bestScore && node.getBoundingClientRect().height < 96) { best = node; bestScore = score; }
    });
    return bestScore >= 2 ? best : null;
  }

  function findSendButton(composer) {
    if (!composer) return null;
    var buttons = composer.querySelectorAll('button');
    var best = null;
    Array.prototype.forEach.call(buttons, function (button) {
      var label = (button.getAttribute('aria-label') || button.getAttribute('title') || normalizedText(button)).toLowerCase();
      if (!best && (label.indexOf('gửi') !== -1 || label.indexOf('send') !== -1 || button.querySelector('svg'))) best = button;
    });
    return best;
  }

  function findInputWrap(input, send, composer) {
    if (!input || !composer) return null;
    var current = input.parentElement;
    var fallback = current;
    while (current && current !== composer.parentElement) {
      var rect = current.getBoundingClientRect();
      if (rect.width >= composer.getBoundingClientRect().width * 0.72 && rect.height <= 260) {
        fallback = current;
        if (!send || current.contains(send)) return current;
      }
      if (current === composer) break;
      current = current.parentElement;
    }
    return fallback;
  }

  function findHint(composer) {
    if (!composer) return null;
    var nodes = composer.querySelectorAll('small, p, span, div');
    var best = null;
    Array.prototype.forEach.call(nodes, function (node) {
      if (best || node.children.length > 2) return;
      var text = normalizedText(node);
      if ((text.indexOf('enter để gửi') !== -1 || text.indexOf('shift + enter') !== -1 || text.indexOf('xuống dòng') !== -1) && node.getBoundingClientRect().height < 52) best = node;
    });
    return best;
  }

  function findMessages(panel, header, composer, toolbar) {
    var nodes = panel.querySelectorAll('main, [class*="message"], [class*="history"], [class*="conversation"], [class*="body"], div, section');
    var best = null;
    var bestScore = -Infinity;
    var panelRect = panel.getBoundingClientRect();
    Array.prototype.forEach.call(nodes, function (node) {
      if (node === header || node === composer || node === toolbar) return;
      if ((header && header.contains(node)) || (composer && composer.contains(node)) || (toolbar && toolbar.contains(node))) return;
      var rect = node.getBoundingClientRect();
      if (rect.height < 110 || rect.width < panelRect.width * 0.60) return;
      var textLength = normalizedText(node).length;
      if (textLength < 40) return;
      var style = window.getComputedStyle(node);
      var scrollBonus = (style.overflowY === 'auto' || style.overflowY === 'scroll' || node.scrollHeight > node.clientHeight + 12) ? 8 : 0;
      var directBonus = node.parentElement === panel ? 4 : 0;
      var score = rect.height / 40 + Math.min(textLength / 140, 8) + scrollBonus + directBonus;
      if (score > bestScore) { best = node; bestScore = score; }
    });
    return best;
  }

  function getInputLimits() {
    if (window.innerWidth <= 680) return { min: 92, max: 168 };
    if (window.innerHeight <= 700) return { min: 88, max: 150 };
    if (window.innerWidth <= 820) return { min: 96, max: 190 };
    return { min: 104, max: 220 };
  }

  function resizeInput(input) {
    if (!input || !input.isConnected) return;
    var limits = getInputLimits();
    input.style.setProperty('height', 'auto', 'important');
    var measured = Math.max(limits.min, Math.min(input.scrollHeight || limits.min, limits.max));
    input.style.setProperty('height', measured + 'px', 'important');
    input.style.setProperty('min-height', limits.min + 'px', 'important');
    input.style.setProperty('max-height', limits.max + 'px', 'important');
    input.style.setProperty('overflow-y', (input.scrollHeight || 0) > limits.max ? 'auto' : 'hidden', 'important');
  }

  function bindAutoGrow(input) {
    if (!input || boundInputs.has(input)) return;
    boundInputs.add(input);
    var schedule = function () { window.requestAnimationFrame(function () { resizeInput(input); }); };
    input.addEventListener('input', schedule, { passive: true });
    input.addEventListener('change', schedule, { passive: true });
    input.addEventListener('focus', schedule, { passive: true });
    window.setTimeout(schedule, 0);
    window.setTimeout(schedule, 180);
  }

  function ensureExpandButton(panel, header) {
    if (!header || header.querySelector('.bes-ai-chat-expand-v10873')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'bes-ai-chat-expand-v10873';
    button.setAttribute('aria-label', 'Mở rộng khung Brian AI');
    button.setAttribute('title', 'Mở rộng khung chat');
    button.textContent = '↗';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var next = panel.getAttribute('data-bes-ai-chat-size') === 'expanded' ? 'normal' : 'expanded';
      panel.setAttribute('data-bes-ai-chat-size', next);
      document.documentElement.setAttribute('data-bes-ai-chat-expanded', next === 'expanded' ? 'true' : 'false');
      button.textContent = next === 'expanded' ? '↘' : '↗';
      button.setAttribute('aria-label', next === 'expanded' ? 'Thu gọn khung Brian AI' : 'Mở rộng khung Brian AI');
      button.setAttribute('title', next === 'expanded' ? 'Thu gọn khung chat' : 'Mở rộng khung chat');
      var state = safeGetState();
      state.size = next;
      safeSetState(state);
      window.dispatchEvent(new CustomEvent('bes-ai-chat-layout-changed', { detail: { version: VERSION, size: next } }));
    });
    var actionHost = null;
    var children = header.querySelectorAll('div, nav, span');
    Array.prototype.forEach.call(children, function (node) {
      if (actionHost) return;
      var buttons = node.querySelectorAll(':scope > button');
      if (buttons.length >= 2 && node.getBoundingClientRect().height < 80) actionHost = node;
    });
    (actionHost || header).appendChild(button);
  }

  function markDraftToast() {
    var nodes = document.querySelectorAll('div, aside, section');
    Array.prototype.forEach.call(nodes, function (node) {
      var text = normalizedText(node);
      if (text.indexOf('tìm thấy bản nháp chưa khôi phục') === -1 && text.indexOf('tim thay ban nhap chua khoi phuc') === -1) return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 240 || rect.width > 780 || rect.height < 48 || rect.height > 230) return;
      var candidate = node;
      while (candidate.parentElement && candidate.parentElement !== document.body) {
        var parentRect = candidate.parentElement.getBoundingClientRect();
        if (parentRect.width > rect.width * 1.55 || parentRect.height > rect.height * 2.1) break;
        candidate = candidate.parentElement;
      }
      candidate.setAttribute(DRAFT_ATTR, 'toast');
    });
  }

  function clearLegacyTags(panel) {
    if (!panel) return;
    panel.removeAttribute('data-bes-ai-chat-v10872');
    Array.prototype.forEach.call(panel.querySelectorAll('.bes-ai-chat-expand-v10872'), function (node) { node.remove(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bes-ai-draft-v10872]'), function (node) { node.removeAttribute('data-bes-ai-draft-v10872'); });
  }

  function tagPanel(panel) {
    currentPanel = panel;
    clearLegacyTags(panel);
    panel.setAttribute(PANEL_ATTR, 'panel');
    var state = safeGetState();
    var size = state.size === 'expanded' ? 'expanded' : 'normal';
    panel.setAttribute('data-bes-ai-chat-size', size);
    document.documentElement.setAttribute('data-bes-ai-chat-expanded', size === 'expanded' ? 'true' : 'false');

    var directChildren = Array.prototype.filter.call(panel.children, function (child) { return window.getComputedStyle(child).display !== 'none'; });
    if (directChildren.length === 1) directChildren[0].setAttribute(PANEL_ATTR, 'shell');

    var header = findHeader(panel);
    var parts = findComposer(panel);
    var toolbar = findToolbar(panel, parts.composer);
    var messages = findMessages(panel, header, parts.composer, toolbar);
    var quickTools = findQuickTools(parts.composer);
    var send = findSendButton(parts.composer);
    var inputWrap = findInputWrap(parts.input, send, parts.composer);
    var hint = findHint(parts.composer);

    markRole(header, 'header');
    markRole(parts.composer, 'composer');
    markRole(parts.input, 'input');
    markRole(toolbar, 'toolbar');
    markRole(messages, 'messages');
    markRole(quickTools, 'quick-tools');
    markRole(send, 'send');
    if (inputWrap && inputWrap !== parts.composer) inputWrap.setAttribute(INPUT_WRAP_ATTR, 'true');
    markRole(hint, 'hint');

    bindAutoGrow(parts.input);
    resizeInput(parts.input);
    ensureExpandButton(panel, header);
    markDraftToast();
  }

  function cleanupOldPanel(panel) {
    if (!panel || panel === currentPanel) return;
    panel.removeAttribute(PANEL_ATTR);
    panel.removeAttribute('data-bes-ai-chat-size');
    Array.prototype.forEach.call(panel.querySelectorAll('[' + ROLE_ATTR + ']'), function (node) { node.removeAttribute(ROLE_ATTR); });
    Array.prototype.forEach.call(panel.querySelectorAll('[' + INPUT_WRAP_ATTR + ']'), function (node) { node.removeAttribute(INPUT_WRAP_ATTR); });
    Array.prototype.forEach.call(panel.querySelectorAll('[' + PANEL_ATTR + '="shell"]'), function (node) { node.removeAttribute(PANEL_ATTR); });
  }

  function scan() {
    scanTimer = null;
    var panel = findPanel();
    if (!panel) {
      if (currentPanel && !currentPanel.isConnected) currentPanel = null;
      markDraftToast();
      return;
    }
    if (currentPanel && currentPanel !== panel) cleanupOldPanel(currentPanel);
    tagPanel(panel);
  }

  function scheduleScan(delay) {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, typeof delay === 'number' ? delay : 90);
  }

  function boot() {
    scheduleScan(0);
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        return mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
      });
      if (relevant) scheduleScan(110);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { scheduleScan(150); });
    window.addEventListener('resize', function () {
      if (currentPanel) {
        var input = currentPanel.querySelector('[' + ROLE_ATTR + '="input"]');
        resizeInput(input);
      }
      scheduleScan(120);
    }, { passive: true });
    window.addEventListener('bes-ai-open', function () { scheduleScan(150); });
    window.addEventListener('bes-open-ai-assist', function () { scheduleScan(150); });

    window.BESAIChatLayoutV10873 = {
      version: VERSION,
      rescan: function () { scheduleScan(0); },
      resizeComposer: function () {
        if (!currentPanel) return false;
        var input = currentPanel.querySelector('[' + ROLE_ATTR + '="input"]');
        resizeInput(input);
        return Boolean(input);
      },
      setSize: function (size) {
        var next = size === 'expanded' ? 'expanded' : 'normal';
        var state = safeGetState();
        state.size = next;
        safeSetState(state);
        if (currentPanel) currentPanel.setAttribute('data-bes-ai-chat-size', next);
        document.documentElement.setAttribute('data-bes-ai-chat-expanded', next === 'expanded' ? 'true' : 'false');
      },
      destroy: function () {
        if (observer) observer.disconnect();
        if (scanTimer) window.clearTimeout(scanTimer);
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
