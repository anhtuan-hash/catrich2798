(function () {
  'use strict';

  var VERSION = '10.88.0-hf2';
  var MUSIC_ATTR = 'data-bes-floating-music-v10882';
  var LAUNCHER_ATTR = 'data-bes-ai-launcher-v10882';
  var FALLBACK_ID = 'bes-ai-launcher-fallback-v10882';
  var observer = null;
  var scanTimer = null;
  var hiddenMusic = new Map();
  var activeLauncher = null;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function descriptor(element) {
    if (!element) return '';
    return normalize([
      element.getAttribute && element.getAttribute('aria-label'),
      element.getAttribute && element.getAttribute('title'),
      element.getAttribute && element.getAttribute('data-tooltip'),
      element.id,
      element.className,
      element.textContent
    ].filter(Boolean).join(' '));
  }

  function rectOf(element) {
    try { return element.getBoundingClientRect(); }
    catch (_) { return { width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }; }
  }

  function isInsideTopNavigation(element) {
    if (!element || !element.closest) return false;
    var container = element.closest('header, nav, [role="navigation"], [class*="topbar"], [class*="navbar"], [class*="header"]');
    if (!container) return false;
    var rect = rectOf(container);
    return rect.top < 220 && rect.height < 240;
  }

  function isInsideAIChat(element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest(
      '[data-bes-ai-chat-v10881="panel"], [data-bes-ai-chat-v10873="panel"], [data-bes-ai-chat-v10872="panel"], [role="dialog"]'
    ));
  }

  function isLowerRightFloatingSlot(element) {
    if (!element || !element.isConnected || isInsideTopNavigation(element) || isInsideAIChat(element)) return false;
    var rect = rectOf(element);
    var style = window.getComputedStyle(element);
    var positionOK = style.position === 'fixed' || (style.position === 'absolute' && element.parentElement === document.body);
    if (!positionOK) return false;
    if (rect.width < 30 || rect.width > 112 || rect.height < 30 || rect.height > 112) return false;
    var rightGap = Math.max(0, window.innerWidth - rect.right);
    var bottomGap = Math.max(0, window.innerHeight - rect.bottom);
    if (rightGap > 110 || bottomGap > 240) return false;
    if (rect.top < window.innerHeight * 0.42) return false;
    return true;
  }

  function isMusicSymbol(text) {
    return /^[\s♩♪♫♬♭♯🎵🎶🔊🔉🔈]+$/u.test(String(text || ''));
  }

  function isFloatingMusicControl(element) {
    if (!isLowerRightFloatingSlot(element)) return false;
    var label = descriptor(element);
    var rawText = String(element.textContent || '').trim();
    var classOrId = normalize([element.className, element.id].join(' '));
    var explicitMusic = /(^|\s)(nhac|music|audio|sound)(\s|$)/.test(label)
      || /background[-_ ]?music|music[-_ ]?(button|toggle|player)|floating[-_ ]?(music|audio)/.test(classOrId);
    var symbolicMusic = isMusicSymbol(rawText) || Boolean(element.querySelector && element.querySelector('[data-icon*="music"], [class*="music"], [class*="note"]'));
    if (!explicitMusic && !symbolicMusic) return false;
    if (/brian ai|chat|tro ly|assistant/.test(label)) return false;
    return true;
  }

  function rememberMusicState(element) {
    if (hiddenMusic.has(element)) return;
    hiddenMusic.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      tabIndex: element.getAttribute('tabindex')
    });
  }

  function hideFloatingMusicControls() {
    var controls = document.querySelectorAll('button, [role="button"], a, [tabindex]');
    Array.prototype.forEach.call(controls, function (control) {
      if (!isFloatingMusicControl(control)) return;
      rememberMusicState(control);
      control.setAttribute(MUSIC_ATTR, 'hidden');
      control.setAttribute('aria-hidden', 'true');
      control.setAttribute('tabindex', '-1');
    });
  }

  function launcherScore(element) {
    if (!element || !element.isConnected || element.id === FALLBACK_ID || isInsideAIChat(element) || isInsideTopNavigation(element)) return -100;
    var label = descriptor(element);
    var score = 0;
    if (/brian ai/.test(label)) score += 24;
    if (/mo brian|open brian/.test(label)) score += 12;
    if (/mo chat|open chat|chat bubble|chat launcher/.test(label)) score += 14;
    if (/tro ly ai|ai assistant|assistant launcher/.test(label)) score += 12;
    if (/chat|assistant|launcher|bubble|floating/.test(label)) score += 5;
    if (/command center|thong bao|notification|nhac|music|audio/.test(label)) score -= 22;
    if (element.matches('button, [role="button"]')) score += 3;
    if (element.querySelector && element.querySelector('svg')) score += 2;
    var style = window.getComputedStyle(element);
    if (style.position === 'fixed') score += 4;
    var rect = rectOf(element);
    if (rect.width >= 36 && rect.width <= 100 && rect.height >= 36 && rect.height <= 100) score += 3;
    return score;
  }

  function findNativeLauncher() {
    var selectors = [
      'button',
      '[role="button"]',
      '[class*="chat"]',
      '[class*="assistant"]',
      '[class*="launcher"]',
      '[class*="bubble"]',
      '[id*="chat"]',
      '[id*="assistant"]'
    ];
    var seen = new Set();
    var ranked = [];
    selectors.forEach(function (selector) {
      var nodes;
      try { nodes = document.querySelectorAll(selector); } catch (_) { nodes = []; }
      Array.prototype.forEach.call(nodes, function (node) {
        if (seen.has(node)) return;
        seen.add(node);
        var score = launcherScore(node);
        if (score >= 12) ranked.push({ node: node, score: score });
      });
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.length ? ranked[0].node : null;
  }

  function makeChatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3C6.49 3 2 6.81 2 11.5c0 2.56 1.35 4.87 3.66 6.43L5 21l3.72-1.77c1.04.32 2.15.49 3.28.49 5.51 0 10-3.81 10-8.22S17.51 3 12 3Zm-4.25 9.55a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4.25 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4.25 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"/></svg>';
  }

  function findOpenAIControl() {
    var controls = document.querySelectorAll('button, [role="button"], a');
    var ranked = [];
    Array.prototype.forEach.call(controls, function (control) {
      if (control.id === FALLBACK_ID || control === activeLauncher || isInsideAIChat(control)) return;
      var label = descriptor(control);
      var score = 0;
      if (/ai san sang/.test(label)) score += 18;
      if (/mo brian ai|open brian ai/.test(label)) score += 20;
      if (/brian ai/.test(label)) score += 12;
      if (/tro ly ai|ai assistant/.test(label)) score += 10;
      if (/command center|cai dat ai|provider|api key/.test(label)) score -= 12;
      if (score > 0) ranked.push({ node: control, score: score });
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.length ? ranked[0].node : null;
  }

  function visibleAIPanelExists() {
    var candidates = document.querySelectorAll('[data-bes-ai-chat-v10881="panel"], [data-bes-ai-chat-v10873="panel"], [data-bes-ai-chat-v10872="panel"], [role="dialog"]');
    return Array.prototype.some.call(candidates, function (panel) {
      var text = descriptor(panel);
      if (!/brian ai|tro ly ai|ai assistant/.test(text)) return false;
      var style = window.getComputedStyle(panel);
      var rect = rectOf(panel);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0 && rect.width > 240 && rect.height > 240;
    });
  }

  function requestOpenAI(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    var native = findNativeLauncher();
    if (native && native !== activeLauncher && native !== document.getElementById(FALLBACK_ID)) {
      try { native.click(); } catch (_) {}
    } else {
      var opener = findOpenAIControl();
      if (opener) {
        try { opener.click(); } catch (_) {}
      }
    }
    window.dispatchEvent(new CustomEvent('bes-ai-open', { detail: { source: 'launcher-slot-v10882', version: VERSION } }));
    window.dispatchEvent(new CustomEvent('bes-open-ai-assist', { detail: { source: 'launcher-slot-v10882', version: VERSION } }));
    window.setTimeout(function () {
      document.documentElement.setAttribute('data-bes-ai-chat-open', visibleAIPanelExists() ? 'true' : 'false');
      scheduleScan(0);
    }, 220);
  }

  function createFallbackLauncher() {
    var existing = document.getElementById(FALLBACK_ID);
    if (existing) return existing;
    var button = document.createElement('button');
    button.type = 'button';
    button.id = FALLBACK_ID;
    button.setAttribute(LAUNCHER_ATTR, 'fallback');
    button.setAttribute('aria-label', 'Mở Brian AI');
    button.setAttribute('title', 'Mở Brian AI');
    button.innerHTML = makeChatIcon();
    button.addEventListener('click', requestOpenAI);
    document.body.appendChild(button);
    return button;
  }

  function clearOldLauncherTag() {
    if (activeLauncher && activeLauncher.isConnected && activeLauncher.id !== FALLBACK_ID) {
      activeLauncher.removeAttribute(LAUNCHER_ATTR);
    }
    activeLauncher = null;
  }

  function ensureLauncher() {
    var native = findNativeLauncher();
    if (native) {
      var fallback = document.getElementById(FALLBACK_ID);
      if (fallback) fallback.remove();
      if (activeLauncher && activeLauncher !== native && activeLauncher.id !== FALLBACK_ID) activeLauncher.removeAttribute(LAUNCHER_ATTR);
      activeLauncher = native;
      native.setAttribute(LAUNCHER_ATTR, 'native');
      if (!native.getAttribute('aria-label')) native.setAttribute('aria-label', 'Mở Brian AI');
      if (!native.getAttribute('title')) native.setAttribute('title', 'Mở Brian AI');
      return native;
    }
    clearOldLauncherTag();
    activeLauncher = createFallbackLauncher();
    return activeLauncher;
  }

  function reconcileOpenState() {
    if (visibleAIPanelExists()) document.documentElement.setAttribute('data-bes-ai-chat-open', 'true');
    else if (document.documentElement.getAttribute('data-bes-ai-chat-open') !== 'true') document.documentElement.setAttribute('data-bes-ai-chat-open', 'false');
  }

  function scan() {
    scanTimer = null;
    hideFloatingMusicControls();
    reconcileOpenState();
    ensureLauncher();
  }

  function scheduleScan(delay) {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, typeof delay === 'number' ? delay : 90);
  }

  function handleClosed() {
    document.documentElement.setAttribute('data-bes-ai-chat-open', 'false');
    scheduleScan(40);
  }

  function handleOpened() {
    window.setTimeout(function () {
      document.documentElement.setAttribute('data-bes-ai-chat-open', visibleAIPanelExists() ? 'true' : 'false');
      scheduleScan(40);
    }, 120);
  }

  function restoreHiddenMusic() {
    hiddenMusic.forEach(function (snapshot, element) {
      if (!element || !element.isConnected) return;
      element.removeAttribute(MUSIC_ATTR);
      if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', snapshot.ariaHidden);
      if (snapshot.tabIndex === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', snapshot.tabIndex);
    });
    hiddenMusic.clear();
  }

  function boot() {
    scheduleScan(0);
    observer = new MutationObserver(function () { scheduleScan(80); });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state', 'data-open']
    });
    window.addEventListener('resize', function () { scheduleScan(80); }, { passive: true });
    window.addEventListener('hashchange', function () { scheduleScan(120); });
    window.addEventListener('bes-ai-chat-closed', handleClosed);
    window.addEventListener('bes-ai-open', handleOpened);
    window.addEventListener('bes-open-ai-assist', handleOpened);

    window.BESAILauncherSlotV10882 = {
      version: VERSION,
      rescan: function () { scheduleScan(0); },
      open: requestOpenAI,
      hideMusic: hideFloatingMusicControls,
      destroy: function () {
        if (observer) observer.disconnect();
        if (scanTimer) window.clearTimeout(scanTimer);
        restoreHiddenMusic();
        if (activeLauncher && activeLauncher.id !== FALLBACK_ID) activeLauncher.removeAttribute(LAUNCHER_ATTR);
        var fallback = document.getElementById(FALLBACK_ID);
        if (fallback) fallback.remove();
        activeLauncher = null;
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
