(() => {
  const SETTINGS_KEY = 'bes-motion-core-v1';
  const effects = window.MOTION_LAB_EFFECTS || [];
  const grid = document.getElementById('grid');
  const toolbar = document.querySelector('.toolbar');
  const toastNode = document.getElementById('toastGlobal');

  const APPLY_MAP = Object.freeze({
    'fade-in': { effectName: 'fadeIn', semantics: ['enter', 'cardEnter', 'dialog', 'toast', 'tab', 'accordion'], scope: 'Trang, thẻ, hộp thoại và thông báo' },
    'fade-slide-combo': { effectName: 'fadeSlide', semantics: ['enter', 'cardEnter', 'dialog', 'toast'], scope: 'Trang, thẻ, hộp thoại và thông báo' },
    'slide-up': { effectName: 'slideUp', semantics: ['enter', 'cardEnter', 'toast'], scope: 'Trang, thẻ và thông báo' },
    'zoom-in': { effectName: 'zoomIn', semantics: ['enter', 'cardEnter', 'dialog'], scope: 'Trang, thẻ và hộp thoại' },
    'modal': { effectName: 'modalOpen', semantics: ['dialog'], scope: 'Toàn bộ hộp thoại' },
    'toast': { effectName: 'toastIn', semantics: ['toast'], scope: 'Toàn bộ toast và snackbar' },
    'press-down': { effectName: 'press', semantics: ['press'], scope: 'Toàn bộ nút và liên kết' },
    'pulse': { effectName: 'pulse', semantics: ['notify', 'error', 'success', 'focus'], scope: 'Thông báo và phản hồi trạng thái' },
    'spring-pop': { effectName: 'springPop', semantics: ['success', 'cardEnter'], scope: 'Hoàn thành tác vụ và thẻ mới' },
    'shake-x': { effectName: 'shakeX', semantics: ['error'], scope: 'Toàn bộ phản hồi lỗi' },
    'bell': { effectName: 'bell', semantics: ['notify'], scope: 'Chuông và badge thông báo' },
    'focus-pulse': { effectName: 'focusPulse', semantics: ['focus'], scope: 'Mục tiêu được hướng dẫn' },
    'glow-pulse': { effectName: 'glowPulse', semantics: ['focus', 'success'], scope: 'Focus và hoàn thành nhẹ' },
    'counter-progress': { effectName: 'counterPop', semantics: ['data'], scope: 'Số liệu và tiến độ' },
    'tab-indicator': { effectName: 'tabIndicator', semantics: ['tab'], scope: 'Toàn bộ tab điều hướng' },
    'accordion': { effectName: 'accordionOpen', semantics: ['accordion'], scope: 'Toàn bộ accordion' },
    'blur-reveal': { effectName: 'blurReveal', semantics: ['enter', 'cardEnter', 'dialog', 'toast'], scope: 'Trang, thẻ, hộp thoại và thông báo' },
    'hover-lift': { effectName: 'hoverLift', semantics: ['cardHover'], scope: 'Toàn bộ thẻ khi rê chuột' },
  });

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const getSettings = () => safeParse(localStorage.getItem(SETTINGS_KEY) || '{}', {});

  const showToast = (message) => {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.classList.add('show');
    clearTimeout(toastNode._sitewideTimer);
    toastNode._sitewideTimer = setTimeout(() => toastNode.classList.remove('show'), 2200);
  };

  const hostWindows = () => {
    const hosts = [];
    try { if (window.parent && window.parent !== window && window.parent.location.origin === location.origin) hosts.push(window.parent); } catch { /* cross-origin */ }
    try { if (window.opener && !window.opener.closed && window.opener.location.origin === location.origin) hosts.push(window.opener); } catch { /* cross-origin */ }
    return hosts;
  };

  const writeSettings = (patch) => {
    const current = getSettings();
    const next = { ...current, ...patch, enabled: true, updatedAt: Date.now() };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    hostWindows().forEach((host) => {
      try {
        if (host.EnglishHubMotion?.setSettings) host.EnglishHubMotion.setSettings(patch);
        host.postMessage({ type: 'bes-motion-sitewide-applied', patch }, location.origin);
      } catch { /* host may be navigating */ }
    });
    return next;
  };

  const selectedSourceId = () => getSettings()?.sitewideSelection?.sourceId || '';

  const previewOnHost = (mapping) => {
    hostWindows().forEach((host) => {
      try {
        const target = host.document.querySelector('main.wp8-page-stage, main, .app-shell') || host.document.body;
        host.EnglishHubMotion?.run?.(target, mapping.effectName);
      } catch { /* optional preview */ }
    });
  };

  const applyEffect = (effect) => {
    const mapping = APPLY_MAP[effect.id];
    if (!mapping) return;
    const semanticOverrides = {};
    mapping.semantics.forEach((semantic) => { semanticOverrides[semantic] = mapping.effectName; });
    const patch = {
      semanticOverrides,
      sitewideSelection: {
        sourceId: effect.id,
        effectName: mapping.effectName,
        title: effect.title,
        scope: mapping.scope,
        semantics: mapping.semantics,
        updatedAt: Date.now(),
      },
    };
    writeSettings(patch);
    previewOnHost(mapping);
    showToast(`Đã áp dụng “${effect.title}” cho ${mapping.scope.toLowerCase()}.`);
    refreshAppliedState();
  };

  const resetSelection = () => {
    writeSettings({ semanticOverrides: {}, sitewideSelection: null });
    showToast('Đã khôi phục chuyển động mặc định của English Hub.');
    refreshAppliedState();
  };

  const ensureStatusPanel = () => {
    if (!toolbar || toolbar.querySelector('.sitewide-motion-status')) return;
    const panel = document.createElement('div');
    panel.className = 'sitewide-motion-status';
    panel.innerHTML = `
      <div class="sitewide-motion-status__icon" aria-hidden="true">✦</div>
      <div class="sitewide-motion-status__copy">
        <small>HIỆU ỨNG TOÀN WEBSITE</small>
        <strong data-sitewide-title>Đang dùng chuyển động mặc định</strong>
        <span data-sitewide-scope>Chọn một hiệu ứng production-safe bên dưới để áp dụng thật.</span>
      </div>
      <button type="button" data-sitewide-reset>Khôi phục mặc định</button>
    `;
    const filters = toolbar.querySelector('.filters');
    toolbar.insertBefore(panel, filters || null);
    panel.querySelector('[data-sitewide-reset]').addEventListener('click', resetSelection);
  };

  const cardForEffect = (effect) => document.getElementById(`stage-${effect.id}`)?.closest('.card');

  const ensureApplyRows = () => {
    effects.forEach((effect) => {
      const card = cardForEffect(effect);
      if (!card || card.querySelector('[data-sitewide-apply-row]')) return;
      const mapping = APPLY_MAP[effect.id];
      const row = document.createElement('div');
      row.dataset.sitewideApplyRow = 'true';
      row.className = `sitewide-apply-row ${mapping ? 'is-compatible' : 'is-lab-only'}`;
      if (mapping) {
        row.innerHTML = `
          <div><small>ÁP DỤNG THẬT</small><span>${mapping.scope}</span></div>
          <button type="button" data-apply-sitewide="${effect.id}">Áp dụng toàn website</button>
        `;
        row.querySelector('button').addEventListener('click', () => applyEffect(effect));
      } else {
        row.innerHTML = '<div><small>MOTION LAB</small><span>Hiệu ứng chuyên biệt — chỉ dùng để xem thử an toàn.</span></div><b>Chỉ thử nghiệm</b>';
      }
      const details = card.querySelector('details');
      card.insertBefore(row, details || null);
    });
  };

  const refreshAppliedState = () => {
    ensureStatusPanel();
    ensureApplyRows();
    const settings = getSettings();
    const selection = settings.sitewideSelection;
    const selected = selectedSourceId();
    document.querySelectorAll('.card').forEach((card) => card.classList.remove('is-sitewide-selected'));
    document.querySelectorAll('[data-apply-sitewide]').forEach((button) => {
      const active = button.dataset.applySitewide === selected;
      button.classList.toggle('is-applied', active);
      button.textContent = active ? '✓ Đang áp dụng' : 'Áp dụng toàn website';
      button.closest('.card')?.classList.toggle('is-sitewide-selected', active);
    });
    const title = toolbar?.querySelector('[data-sitewide-title]');
    const scope = toolbar?.querySelector('[data-sitewide-scope]');
    const reset = toolbar?.querySelector('[data-sitewide-reset]');
    if (title) title.textContent = selection?.title || 'Đang dùng chuyển động mặc định';
    if (scope) scope.textContent = selection?.scope || 'Chọn một hiệu ứng production-safe bên dưới để áp dụng thật.';
    if (reset) reset.disabled = !selection;
  };

  let scheduled = false;
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshAppliedState();
    });
  };

  const observer = new MutationObserver(scheduleRefresh);
  if (grid) observer.observe(grid, { childList: true, subtree: true });
  window.addEventListener('storage', (event) => {
    if (event.key === SETTINGS_KEY) scheduleRefresh();
  });
  window.addEventListener('bes-motion-core-settings-changed', scheduleRefresh);
  scheduleRefresh();
})();
