(function () {
  'use strict';

  var VERSION = '10.88.0-hf1';
  var STORAGE_KEY = 'bes-ai-chat-layout-v10881';
  var LEGACY_STORAGE_KEYS = ['bes-ai-chat-layout-v10873', 'bes-ai-chat-layout-v10872'];
  var PANEL_ATTR = 'data-bes-ai-chat-v10881';
  var LIFECYCLE_ATTR = 'data-bes-ai-chat-lifecycle';
  var ROLE_ATTR = 'data-bes-ai-chat-role';
  var DRAFT_ATTR = 'data-bes-ai-draft-v10881';
  var INPUT_WRAP_ATTR = 'data-bes-ai-chat-input-wrap';
  var scanTimer = null;
  var currentPanel = null;
  var observer = null;
  var boundInputs = new WeakSet();
  var inputSnapshots = new WeakMap();
  var suspendedUntil = new WeakMap();
  var closeCleanupTimer = null;
  var lastClosedPanel = null;

  function safeGetState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (var i = 0; i < LEGACY_STORAGE_KEYS.length && !raw; i += 1) raw = localStorage.getItem(LEGACY_STORAGE_KEYS[i]);
      }
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

  function hasClosedToken(value) {
    return /(^|[\s_-])(closed|closing|hidden|minimized|minimised|collapsed|is-closed|is-hidden)([\s_-]|$)/i.test(String(value || ''));
  }

  function isSemanticallyClosed(element) {
    var current = element;
    var depth = 0;
    while (current && current !== document.documentElement && depth < 4) {
      if (current.hidden || current.hasAttribute('inert')) return true;
      if (String(current.getAttribute('aria-hidden') || '').toLowerCase() === 'true') return true;
      if (String(current.getAttribute('data-open') || '').toLowerCase() === 'false') return true;
      if (String(current.getAttribute('data-visible') || '').toLowerCase() === 'false') return true;
      var state = String(current.getAttribute('data-state') || '').toLowerCase();
      if (state === 'closed' || state === 'closing' || state === 'hidden' || state === 'collapsed' || state === 'minimized' || state === 'minimised') return true;
      if (hasClosedToken(current.className)) return true;
      var inlineDisplay = String(current.style && current.style.display || '').toLowerCase();
      var inlineVisibility = String(current.style && current.style.visibility || '').toLowerCase();
      var inlineOpacity = String(current.style && current.style.opacity || '').trim();
      if (inlineDisplay === 'none' || inlineVisibility === 'hidden' || inlineOpacity === '0') return true;
      current = current.parentElement;
      depth += 1;
    }
    return false;
  }

  function isSuspended(element) {
    return Boolean(element && (suspendedUntil.get(element) || 0) > Date.now());
  }

  function isVisible(element) {
    if (!element || !element.isConnected || isSuspended(element) || isSemanticallyClosed(element)) return false;
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

  function snapshotInput(input) {
    if (!input || inputSnapshots.has(input)) return;
    var names = ['height', 'min-height', 'max-height', 'overflow-y'];
    var snapshot = {};
    names.forEach(function (name) {
      snapshot[name] = { value: input.style.getPropertyValue(name), priority: input.style.getPropertyPriority(name) };
    });
    inputSnapshots.set(input, snapshot);
  }

  function restoreInput(input) {
    if (!input) return;
    var snapshot = inputSnapshots.get(input);
    if (!snapshot) return;
    Object.keys(snapshot).forEach(function (name) {
      var item = snapshot[name];
      if (item.value) input.style.setProperty(name, item.value, item.priority || '');
      else input.style.removeProperty(name);
    });
    inputSnapshots.delete(input);
  }

  function resizeInput(input) {
    if (!input || !input.isConnected) return;
    snapshotInput(input);
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
    if (!header || header.querySelector('.bes-ai-chat-expand-v10881')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'bes-ai-chat-expand-v10881';
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
    ['data-bes-ai-chat-v10872', 'data-bes-ai-chat-v10873'].forEach(function (name) { panel.removeAttribute(name); });
    Array.prototype.forEach.call(panel.querySelectorAll('.bes-ai-chat-expand-v10872, .bes-ai-chat-expand-v10873'), function (node) { node.remove(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bes-ai-draft-v10872], [data-bes-ai-draft-v10873]'), function (node) {
      node.removeAttribute('data-bes-ai-draft-v10872');
      node.removeAttribute('data-bes-ai-draft-v10873');
    });
  }

  function tagPanel(panel) {
    currentPanel = panel;
    clearLegacyTags(panel);
    panel.removeAttribute(LIFECYCLE_ATTR);
    panel.setAttribute(PANEL_ATTR, 'panel');
    document.documentElement.setAttribute('data-bes-ai-chat-open', 'true');
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

  function clearPanelTags(panel, preserveLifecycle) {
    if (!panel) return;
    panel.removeAttribute(PANEL_ATTR);
    panel.removeAttribute('data-bes-ai-chat-size');
    if (!preserveLifecycle) panel.removeAttribute(LIFECYCLE_ATTR);
    Array.prototype.forEach.call(panel.querySelectorAll('[' + ROLE_ATTR + ']'), function (node) {
      if (node.getAttribute(ROLE_ATTR) === 'input') restoreInput(node);
      node.removeAttribute(ROLE_ATTR);
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[' + INPUT_WRAP_ATTR + ']'), function (node) { node.removeAttribute(INPUT_WRAP_ATTR); });
    Array.prototype.forEach.call(panel.querySelectorAll('[' + PANEL_ATTR + '="shell"]'), function (node) { node.removeAttribute(PANEL_ATTR); });
    Array.prototype.forEach.call(panel.querySelectorAll('.bes-ai-chat-expand-v10881'), function (node) { node.remove(); });
  }

  function finishClose(panel, reason) {
    clearPanelTags(panel, true);
    if (panel && panel.isConnected) panel.setAttribute(LIFECYCLE_ATTR, 'closed');
    if (currentPanel === panel) currentPanel = null;
    document.documentElement.setAttribute('data-bes-ai-chat-open', 'false');
    document.documentElement.setAttribute('data-bes-ai-chat-expanded', 'false');
    window.dispatchEvent(new CustomEvent('bes-ai-chat-closed', { detail: { version: VERSION, reason: reason || 'unknown' } }));
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(function () { scheduleScan(0); }, 360);
  }

  function beginClose(panel, reason) {
    if (!panel || !panel.isConnected) {
      if (currentPanel === panel) currentPanel = null;
      document.documentElement.setAttribute('data-bes-ai-chat-open', 'false');
      document.documentElement.setAttribute('data-bes-ai-chat-expanded', 'false');
      return;
    }
    if (panel.getAttribute(LIFECYCLE_ATTR) === 'closing') return;
    lastClosedPanel = panel;
    suspendedUntil.set(panel, Date.now() + 500);
    panel.setAttribute(LIFECYCLE_ATTR, 'closing');
    document.documentElement.setAttribute('data-bes-ai-chat-open', 'false');
    document.documentElement.setAttribute('data-bes-ai-chat-expanded', 'false');
    if (closeCleanupTimer) window.clearTimeout(closeCleanupTimer);
    closeCleanupTimer = window.setTimeout(function () { finishClose(panel, reason); }, 220);
  }

  function cleanupOldPanel(panel) {
    if (!panel) return;
    clearPanelTags(panel, false);
  }

  function isCloseControl(target) {
    if (!currentPanel || !target || !target.closest) return false;
    var control = target.closest('button, [role="button"]');
    if (!control || !currentPanel.contains(control) || control.classList.contains('bes-ai-chat-expand-v10881')) return false;
    var label = [control.getAttribute('aria-label'), control.getAttribute('title'), control.textContent].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (/đóng|dong|close|thu gọn|thu gon|minimi[sz]e|collapse|ẩn chat|an chat|hide chat/.test(label)) return true;
    return ['−', '–', '—', '-', '×', '✕', '✖'].indexOf(label) !== -1;
  }

  function handleDocumentClick(event) {
    if (!isCloseControl(event.target)) return;
    beginClose(currentPanel, 'close-control');
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || !currentPanel) return;
    window.setTimeout(function () {
      if (!currentPanel) return;
      if (isSemanticallyClosed(currentPanel) || !isVisible(currentPanel)) beginClose(currentPanel, 'escape');
    }, 40);
  }

  function handleOpenRequest() {
    if (lastClosedPanel) {
      suspendedUntil.delete(lastClosedPanel);
      lastClosedPanel.removeAttribute(LIFECYCLE_ATTR);
    }
    document.documentElement.setAttribute('data-bes-ai-chat-open', 'true');
    scheduleScan(80);
  }

  function scan() {
    scanTimer = null;
    var panel = findPanel();
    if (!panel) {
      if (currentPanel) beginClose(currentPanel, currentPanel.isConnected ? 'hidden-state' : 'detached');
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
        if (mutation.type === 'childList') return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
        if (mutation.type === 'attributes') {
          if (lastClosedPanel && lastClosedPanel.isConnected && lastClosedPanel.getAttribute(LIFECYCLE_ATTR) === 'closed') {
            var touchesClosed = mutation.target === lastClosedPanel || lastClosedPanel.contains(mutation.target) || mutation.target.contains(lastClosedPanel);
            if (touchesClosed && !isSemanticallyClosed(lastClosedPanel)) {
              suspendedUntil.delete(lastClosedPanel);
              lastClosedPanel.removeAttribute(LIFECYCLE_ATTR);
              document.documentElement.setAttribute('data-bes-ai-chat-open', 'true');
              scheduleScan(40);
            }
          }
          if (currentPanel && (mutation.target === currentPanel || currentPanel.contains(mutation.target) || mutation.target.contains(currentPanel))) {
            if (isSemanticallyClosed(currentPanel)) beginClose(currentPanel, 'state-attribute');
          }
          return true;
        }
        return false;
      });
      if (relevant) scheduleScan(110);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state', 'data-open', 'data-visible']
    });
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', handleEscape, true);
    window.addEventListener('hashchange', function () { scheduleScan(150); });
    window.addEventListener('resize', function () {
      if (currentPanel) {
        var input = currentPanel.querySelector('[' + ROLE_ATTR + '="input"]');
        resizeInput(input);
      }
      scheduleScan(120);
    }, { passive: true });
    window.addEventListener('bes-ai-open', handleOpenRequest);
    window.addEventListener('bes-open-ai-assist', handleOpenRequest);
    window.addEventListener('bes-ai-close', function () { if (currentPanel) beginClose(currentPanel, 'custom-event'); });
    window.addEventListener('bes-close-ai-assist', function () { if (currentPanel) beginClose(currentPanel, 'custom-event'); });

    window.BESAIChatLayoutV10881 = {
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
      close: function () { if (currentPanel) beginClose(currentPanel, 'api'); },
      destroy: function () {
        if (observer) observer.disconnect();
        if (scanTimer) window.clearTimeout(scanTimer);
        if (closeCleanupTimer) window.clearTimeout(closeCleanupTimer);
        document.removeEventListener('click', handleDocumentClick, true);
        document.removeEventListener('keydown', handleEscape, true);
        if (currentPanel) clearPanelTags(currentPanel, false);
        if (lastClosedPanel) lastClosedPanel.removeAttribute(LIFECYCLE_ATTR);
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
