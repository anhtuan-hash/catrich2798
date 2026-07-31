(() => {
  const GRID_SELECTOR = '.metro-clean-system[data-route="admin"] .permission-admin-grid';
  const STYLE_ID = 'teacher-picker-modal-style-v2';
  const MODAL_ID = 'teacher-picker-modal-v2';
  let selectedKey = '';
  let expandedKey = '';
  let scheduled = false;
  let applying = false;
  let lastFocusedElement = null;

  const isVietnamese = () => {
    const lang = String(document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('vi')) return true;
    return Boolean(document.querySelector('.permission-headline strong')?.textContent?.includes('Quyền'));
  };

  const t = (vi, en) => (isVietnamese() ? vi : en);

  const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'GV';
  };

  const installModalStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/admin-teacher-picker-modal.css?v=2';
    document.head.appendChild(link);
  };

  const getCardInfo = (card, index) => {
    const name = card.querySelector('.admin-user-top h3')?.textContent?.trim() || `Teacher ${index + 1}`;
    const school = card.querySelector('.admin-user-top p')?.textContent?.trim() || '';
    const meta = [...card.querySelectorAll('.admin-user-meta > span')].map((item) => item.textContent.trim());
    const email = meta[0] || '';
    const role = card.querySelector('.status-badge')?.textContent?.trim() || '';
    return {
      card,
      name,
      school,
      email,
      accountState: meta[1] || '',
      permissionState: meta[2] || '',
      role,
      key: email || `${name}-${index}`,
      isAdmin: role.toLowerCase().includes('admin') || card.classList.contains('admin-tile'),
    };
  };

  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const teacherInfos = (grid) => [...grid.querySelectorAll(':scope > .admin-user-card')]
    .map((card, index) => getCardInfo(card, index))
    .filter((info) => !info.isAdmin);

  const closeModal = () => {
    const backdrop = document.getElementById(MODAL_ID);
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('teacher-picker-modal-open');
    const focusTarget = lastFocusedElement;
    lastFocusedElement = null;
    window.setTimeout(() => focusTarget?.focus?.(), 0);
  };

  const focusableElements = (modal) => [...modal.querySelectorAll(
    'button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )].filter((node) => !node.hidden && node.offsetParent !== null);

  const trapModalFocus = (event) => {
    const backdrop = document.getElementById(MODAL_ID);
    if (!backdrop || backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = backdrop.querySelector('.teacher-picker-modal');
    const focusable = focusableElements(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const ensureModal = () => {
    let backdrop = document.getElementById(MODAL_ID);
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.className = 'teacher-picker-modal-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <section class="teacher-picker-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-modal-title" aria-describedby="teacher-picker-modal-description">
        <header class="teacher-picker-modal-header">
          <div>
            <span>${t('CHỌN GIÁO VIÊN', 'SELECT TEACHER')}</span>
            <h2 id="teacher-picker-modal-title">${t('Chọn giáo viên để quản lý quyền', 'Choose a teacher to manage access')}</h2>
            <p id="teacher-picker-modal-description">${t('Tìm theo tên hoặc email, sau đó chọn một giáo viên để mở bảng quyền.', 'Search by name or email, then choose a teacher to open their permissions.')}</p>
          </div>
          <button type="button" class="teacher-picker-modal-close" aria-label="${t('Đóng', 'Close')}">×</button>
        </header>
        <div class="teacher-picker-modal-filters">
          <label><span>${t('Tìm giáo viên', 'Search teachers')}</span><input class="teacher-picker-modal-search" type="search" autocomplete="off" placeholder="${t('Nhập tên hoặc email…', 'Enter name or email…')}" /></label>
          <label><span>${t('Trạng thái', 'Status')}</span><select class="teacher-picker-modal-status"><option value="all">${t('Tất cả trạng thái', 'All statuses')}</option><option value="active">${t('Đang hoạt động', 'Active')}</option><option value="inactive">${t('Đã khóa / chờ duyệt', 'Locked / pending')}</option></select></label>
        </div>
        <div class="teacher-picker-modal-list" role="listbox" aria-label="${t('Danh sách giáo viên', 'Teacher list')}"></div>
        <footer class="teacher-picker-modal-footer"><strong class="teacher-picker-modal-count">0</strong><button type="button" class="teacher-picker-modal-cancel">${t('Đóng', 'Close')}</button></footer>
      </section>`;
    document.body.appendChild(backdrop);

    backdrop.querySelector('.teacher-picker-modal-close')?.addEventListener('click', closeModal);
    backdrop.querySelector('.teacher-picker-modal-cancel')?.addEventListener('click', closeModal);
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeModal();
    });
    backdrop.querySelector('.teacher-picker-modal-search')?.addEventListener('input', () => renderModalList());
    backdrop.querySelector('.teacher-picker-modal-status')?.addEventListener('change', () => renderModalList());
    document.addEventListener('keydown', trapModalFocus);
    return backdrop;
  };

  const setExpanded = (grid, key, shouldOpen = true) => {
    const cards = [...grid.querySelectorAll(':scope > .admin-user-card')];
    expandedKey = shouldOpen ? key : '';
    cards.forEach((card, index) => {
      const info = getCardInfo(card, index);
      const open = shouldOpen && info.key === key;
      card.classList.toggle('is-permission-open', open);
      const toggle = card.querySelector('.teacher-permission-toggle');
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', String(open));
      setText(toggle.querySelector('.teacher-permission-toggle-label'), open
        ? t('Thu gọn', 'Collapse')
        : t('Quản lý quyền', 'Manage access'));
    });
  };

  const updateToolbarSummary = (grid, toolbar) => {
    const infos = teacherInfos(grid);
    const selected = infos.find((info) => info.key === selectedKey);
    const avatar = toolbar.querySelector('.teacher-picker-current-avatar');
    const name = toolbar.querySelector('.teacher-picker-current-name');
    const detail = toolbar.querySelector('.teacher-picker-current-detail');
    const openButton = toolbar.querySelector('.teacher-picker-open');
    const clearButton = toolbar.querySelector('.teacher-picker-clear');

    if (selected) {
      setText(avatar, initials(selected.name));
      setText(name, selected.name);
      setText(detail, selected.email || selected.school || selected.accountState || '—');
      setText(openButton, t('Đổi giáo viên', 'Change teacher'));
      clearButton.hidden = false;
    } else {
      setText(avatar, 'GV');
      setText(name, t('Chưa chọn giáo viên', 'No teacher selected'));
      setText(detail, t('Chọn một giáo viên để xem và chỉnh quyền.', 'Choose a teacher to view and edit permissions.'));
      setText(openButton, t('Chọn giáo viên', 'Choose teacher'));
      clearButton.hidden = true;
    }
  };

  const ensureEmptyState = (grid, toolbar) => {
    let empty = toolbar.nextElementSibling;
    if (!empty?.classList.contains('teacher-permission-picker-empty')) {
      empty = document.createElement('div');
      empty.className = 'teacher-permission-picker-empty';
      empty.innerHTML = `<div><strong>${t('Chưa chọn giáo viên', 'No teacher selected')}</strong><span>${t('Bấm “Chọn giáo viên” để mở danh sách trong cửa sổ modal.', 'Click “Choose teacher” to open the teacher list in a modal.')}</span></div>`;
      toolbar.insertAdjacentElement('afterend', empty);
    }
    empty.hidden = Boolean(selectedKey);
    grid.hidden = !selectedKey;
    return empty;
  };

  const applySelection = (grid, toolbar) => {
    const infos = [...grid.querySelectorAll(':scope > .admin-user-card')].map((card, index) => getCardInfo(card, index));
    const selectedStillExists = infos.some((info) => !info.isAdmin && info.key === selectedKey);
    if (selectedKey && !selectedStillExists) {
      selectedKey = '';
      expandedKey = '';
    }

    infos.forEach((info) => {
      info.card.hidden = !selectedKey || info.isAdmin || info.key !== selectedKey;
    });
    grid.classList.toggle('is-single-teacher', Boolean(selectedKey));
    ensureEmptyState(grid, toolbar);
    updateToolbarSummary(grid, toolbar);
    if (selectedKey) setExpanded(grid, selectedKey, true);
  };

  const selectTeacher = (key) => {
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    const toolbar = grid.previousElementSibling?.classList.contains('teacher-permission-manager-toolbar')
      ? grid.previousElementSibling
      : document.querySelector('.teacher-permission-manager-toolbar');
    if (!toolbar) return;
    selectedKey = key;
    applySelection(grid, toolbar);
    closeModal();
    window.requestAnimationFrame(() => {
      grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      grid.querySelector(':scope > .admin-user-card:not([hidden]) .teacher-permission-toggle')?.focus?.();
    });
  };

  const renderModalList = () => {
    const grid = document.querySelector(GRID_SELECTOR);
    const backdrop = document.getElementById(MODAL_ID);
    if (!grid || !backdrop) return;
    const list = backdrop.querySelector('.teacher-picker-modal-list');
    const count = backdrop.querySelector('.teacher-picker-modal-count');
    const query = backdrop.querySelector('.teacher-picker-modal-search')?.value.trim().toLowerCase() || '';
    const status = backdrop.querySelector('.teacher-picker-modal-status')?.value || 'all';
    const infos = teacherInfos(grid).filter((info) => {
      const haystack = `${info.name} ${info.email} ${info.school}`.toLowerCase();
      const state = info.accountState.toLowerCase();
      const active = state.includes('kích hoạt') || state.includes('approved') || state.includes('active');
      return (!query || haystack.includes(query))
        && (status === 'all' || (status === 'active' && active) || (status === 'inactive' && !active));
    });

    list.replaceChildren();
    if (!infos.length) {
      const empty = document.createElement('div');
      empty.className = 'teacher-picker-modal-empty';
      empty.textContent = t('Không tìm thấy giáo viên phù hợp.', 'No matching teachers found.');
      list.appendChild(empty);
    } else {
      infos.forEach((info) => {
        const state = info.accountState.toLowerCase();
        const active = state.includes('kích hoạt') || state.includes('approved') || state.includes('active');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'teacher-picker-modal-item';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(info.key === selectedKey));
        button.dataset.teacherKey = info.key;

        const avatar = document.createElement('span');
        avatar.className = 'teacher-picker-modal-avatar';
        avatar.textContent = initials(info.name);

        const copy = document.createElement('span');
        copy.className = 'teacher-picker-modal-item-copy';
        const strong = document.createElement('strong');
        strong.textContent = info.name;
        const email = document.createElement('span');
        email.textContent = info.email || info.school || '—';
        const access = document.createElement('span');
        access.textContent = info.permissionState || t('Chưa cấu hình quyền', 'No access profile');
        copy.append(strong, email, access);

        const meta = document.createElement('span');
        meta.className = 'teacher-picker-modal-item-meta';
        const stateChip = document.createElement('span');
        stateChip.className = `teacher-picker-modal-state${active ? '' : ' inactive'}`;
        stateChip.textContent = info.accountState || (active ? t('Đang hoạt động', 'Active') : t('Chờ duyệt', 'Pending'));
        const check = document.createElement('span');
        check.className = 'teacher-picker-modal-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        meta.append(stateChip, check);

        button.append(avatar, copy, meta);
        button.addEventListener('click', () => selectTeacher(info.key));
        list.appendChild(button);
      });
    }
    setText(count, t(`${infos.length} giáo viên`, `${infos.length} teachers`));
  };

  const openModal = (trigger) => {
    const backdrop = ensureModal();
    lastFocusedElement = trigger || document.activeElement;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('teacher-picker-modal-open');
    const search = backdrop.querySelector('.teacher-picker-modal-search');
    const status = backdrop.querySelector('.teacher-picker-modal-status');
    if (search) search.value = '';
    if (status) status.value = 'all';
    renderModalList();
    window.requestAnimationFrame(() => search?.focus());
  };

  const enhanceCard = (card, grid, index) => {
    const info = getCardInfo(card, index);
    card.dataset.permissionTeacherKey = info.key;
    card.dataset.permissionTeacherName = `${info.name} ${info.email} ${info.school}`.toLowerCase();
    card.dataset.permissionTeacherRole = info.role.toLowerCase();
    card.dataset.permissionTeacherState = info.accountState.toLowerCase();
    card.classList.add('teacher-permission-row');

    const top = card.querySelector('.admin-user-top');
    if (!top) return info;
    top.classList.add('teacher-permission-row-head');

    let avatar = top.querySelector('.teacher-permission-avatar');
    if (!avatar) {
      avatar = document.createElement('span');
      avatar.className = 'teacher-permission-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      top.prepend(avatar);
    }
    setText(avatar, initials(info.name));

    let summary = top.querySelector('.teacher-permission-summary');
    if (!summary) {
      summary = document.createElement('span');
      summary.className = 'teacher-permission-summary';
      summary.innerHTML = '<small class="teacher-permission-state"></small><small class="teacher-permission-access"></small>';
      const statusBadge = top.querySelector('.status-badge');
      statusBadge?.insertAdjacentElement('afterend', summary);
    }
    setText(summary.querySelector('.teacher-permission-state'), info.accountState || t('Chưa có trạng thái', 'No status'));
    setText(summary.querySelector('.teacher-permission-access'), info.permissionState || t('Chưa cấu hình quyền', 'No access profile'));

    let toggle = top.querySelector('.teacher-permission-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'teacher-permission-toggle';
      toggle.innerHTML = '<span class="teacher-permission-toggle-label"></span><span class="teacher-permission-chevron" aria-hidden="true">⌄</span>';
      top.append(toggle);
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setExpanded(grid, card.dataset.permissionTeacherKey || info.key, !card.classList.contains('is-permission-open'));
      });
    }

    const open = expandedKey === info.key;
    card.classList.toggle('is-permission-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${t('Quản lý quyền của', 'Manage permissions for')} ${info.name}`);
    setText(toggle.querySelector('.teacher-permission-toggle-label'), open ? t('Thu gọn', 'Collapse') : t('Quản lý quyền', 'Manage access'));
    return info;
  };

  const buildToolbar = (grid) => {
    const oldToolbar = grid.previousElementSibling?.classList.contains('teacher-permission-manager-toolbar')
      ? grid.previousElementSibling
      : null;
    oldToolbar?.remove();

    const toolbar = document.createElement('section');
    toolbar.className = 'teacher-permission-manager-toolbar teacher-picker-toolbar';
    toolbar.dataset.pickerVersion = '2';
    toolbar.innerHTML = `
      <div class="teacher-permission-toolbar-copy">
        <span>${t('QUẢN LÝ THEO GIÁO VIÊN', 'MANAGE BY TEACHER')}</span>
        <h2>${t('Chọn giáo viên', 'Choose teacher')}</h2>
        <p>${t('Chọn một giáo viên trong cửa sổ modal để xem và chỉnh quyền truy cập. Danh sách luôn nằm gọn trong viewport.', 'Choose a teacher in the modal to view and edit access. The list always stays inside the viewport.')}</p>
      </div>
      <div class="teacher-picker-action-area">
        <div class="teacher-picker-current">
          <span class="teacher-picker-current-avatar">GV</span>
          <span class="teacher-picker-current-copy"><small>${t('Giáo viên đang chọn', 'Selected teacher')}</small><strong class="teacher-picker-current-name">${t('Chưa chọn giáo viên', 'No teacher selected')}</strong><span class="teacher-picker-current-detail">${t('Chọn một giáo viên để xem và chỉnh quyền.', 'Choose a teacher to view and edit permissions.')}</span></span>
        </div>
        <div class="teacher-picker-buttons"><button type="button" class="teacher-picker-clear" hidden>${t('Bỏ lựa chọn', 'Clear selection')}</button><button type="button" class="teacher-picker-open">${t('Chọn giáo viên', 'Choose teacher')}</button></div>
      </div>`;
    grid.parentElement?.insertBefore(toolbar, grid);

    toolbar.querySelector('.teacher-picker-open')?.addEventListener('click', (event) => openModal(event.currentTarget));
    toolbar.querySelector('.teacher-picker-current')?.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      openModal(toolbar.querySelector('.teacher-picker-open'));
    });
    toolbar.querySelector('.teacher-picker-current')?.setAttribute('role', 'button');
    toolbar.querySelector('.teacher-picker-current')?.setAttribute('tabindex', '0');
    toolbar.querySelector('.teacher-picker-current')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(toolbar.querySelector('.teacher-picker-open'));
      }
    });
    toolbar.querySelector('.teacher-picker-clear')?.addEventListener('click', () => {
      selectedKey = '';
      expandedKey = '';
      applySelection(grid, toolbar);
    });
    return toolbar;
  };

  const ensureToolbar = (grid) => {
    const previous = grid.previousElementSibling;
    if (previous?.classList.contains('teacher-permission-manager-toolbar') && previous.dataset.pickerVersion === '2') return previous;
    return buildToolbar(grid);
  };

  const enhance = () => {
    if (applying) return;
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) {
      closeModal();
      return;
    }
    applying = true;
    try {
      installModalStyles();
      ensureModal();
      grid.classList.add('admin-permission-manager');
      [...grid.querySelectorAll(':scope > .admin-user-card')].forEach((card, index) => enhanceCard(card, grid, index));
      const toolbar = ensureToolbar(grid);
      applySelection(grid, toolbar);
      if (!document.getElementById(MODAL_ID)?.hidden) renderModalList();
    } finally {
      applying = false;
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };

  const isRelevantNode = (node) => node?.nodeType === 1 && (
    node.matches?.(GRID_SELECTOR)
    || node.querySelector?.(GRID_SELECTOR)
    || node.matches?.('.admin-user-card')
    || node.querySelector?.('.admin-user-card')
  );

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some(isRelevantNode))) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    closeModal();
    schedule();
  });
  window.addEventListener('bes-auth-users-updated', schedule);
  window.addEventListener('load', schedule, { once: true });
  installModalStyles();
  schedule();
})();
