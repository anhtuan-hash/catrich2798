(() => {
  const GRID_SELECTOR = '.metro-clean-system[data-route="admin"] .permission-admin-grid';
  const TOOLBAR_CLASS = 'teacher-permission-manager-toolbar';
  const EMPTY_CLASS = 'teacher-permission-picker-empty';
  const MODAL_ID = 'teacher-picker-modal-v2';
  const STYLE_ID = 'teacher-picker-modal-style-v2';
  const state = {
    selectedKey: '',
    expandedKey: '',
    applying: false,
    scheduled: false,
    lastFocus: null,
  };

  const isVietnamese = () => {
    const language = String(document.documentElement.lang || '').toLowerCase();
    if (language.startsWith('vi')) return true;
    return Boolean(document.querySelector('.permission-headline strong')?.textContent?.includes('Quyền'));
  };
  const tr = (vi, en) => (isVietnamese() ? vi : en);
  const languageKey = () => (isVietnamese() ? 'vi' : 'en');
  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };
  const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'GV';
  };
  const isActiveState = (value = '') => {
    const text = String(value).toLowerCase();
    return text.includes('kích hoạt') || text.includes('approved') || text.includes('active');
  };

  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/admin-teacher-picker-modal.css?v=2';
    document.head.appendChild(link);
  };

  const cardInfo = (card, index) => {
    const name = card.querySelector('.admin-user-top h3')?.textContent?.trim() || `Teacher ${index + 1}`;
    const school = card.querySelector('.admin-user-top p')?.textContent?.trim() || '';
    const meta = [...card.querySelectorAll('.admin-user-meta > span')].map((node) => node.textContent.trim());
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

  const allInfos = (grid) => [...grid.querySelectorAll(':scope > .admin-user-card')]
    .map((card, index) => cardInfo(card, index));
  const teacherInfos = (grid) => allInfos(grid).filter((info) => !info.isAdmin);
  const findToolbar = (grid) => grid.parentElement?.querySelector(`:scope > .${TOOLBAR_CLASS}[data-picker-version="2"]`) || null;
  const findEmpty = (grid) => grid.parentElement?.querySelector(`:scope > .${EMPTY_CLASS}`) || null;

  const setExpanded = (grid, key, open = true) => {
    state.expandedKey = open ? key : '';
    allInfos(grid).forEach((info) => {
      const isOpen = open && info.key === key;
      info.card.classList.toggle('is-permission-open', isOpen);
      const toggle = info.card.querySelector('.teacher-permission-toggle');
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', String(isOpen));
      setText(toggle.querySelector('.teacher-permission-toggle-label'), isOpen
        ? tr('Thu gọn', 'Collapse')
        : tr('Quản lý quyền', 'Manage access'));
    });
  };

  const enhanceCard = (card, grid, index) => {
    const info = cardInfo(card, index);
    card.dataset.permissionTeacherKey = info.key;
    card.classList.add('teacher-permission-row');
    const top = card.querySelector('.admin-user-top');
    if (!top) return;
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
      top.querySelector('.status-badge')?.insertAdjacentElement('afterend', summary);
    }
    setText(summary.querySelector('.teacher-permission-state'), info.accountState || tr('Chưa có trạng thái', 'No status'));
    setText(summary.querySelector('.teacher-permission-access'), info.permissionState || tr('Chưa cấu hình quyền', 'No access profile'));

    let toggle = top.querySelector('.teacher-permission-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'teacher-permission-toggle';
      toggle.innerHTML = '<span class="teacher-permission-toggle-label"></span><span class="teacher-permission-chevron" aria-hidden="true">⌄</span>';
      top.appendChild(toggle);
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = card.dataset.permissionTeacherKey || '';
        setExpanded(grid, key, !card.classList.contains('is-permission-open'));
      });
    }
    const isOpen = state.expandedKey === info.key;
    card.classList.toggle('is-permission-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', `${tr('Quản lý quyền của', 'Manage permissions for')} ${info.name}`);
    setText(toggle.querySelector('.teacher-permission-toggle-label'), isOpen ? tr('Thu gọn', 'Collapse') : tr('Quản lý quyền', 'Manage access'));
  };

  const updateToolbar = (grid, toolbar) => {
    const selected = teacherInfos(grid).find((info) => info.key === state.selectedKey);
    setText(toolbar.querySelector('.teacher-picker-current-avatar'), selected ? initials(selected.name) : 'GV');
    setText(toolbar.querySelector('.teacher-picker-current-name'), selected ? selected.name : tr('Chưa chọn giáo viên', 'No teacher selected'));
    setText(toolbar.querySelector('.teacher-picker-current-detail'), selected
      ? (selected.email || selected.school || selected.accountState || '—')
      : tr('Chọn một giáo viên để xem và chỉnh quyền.', 'Choose a teacher to view and edit permissions.'));
    setText(toolbar.querySelector('.teacher-picker-open'), selected ? tr('Đổi giáo viên', 'Change teacher') : tr('Chọn giáo viên', 'Choose teacher'));
    const clear = toolbar.querySelector('.teacher-picker-clear');
    if (clear) clear.hidden = !selected;
  };

  const ensureEmpty = (grid) => {
    let empty = findEmpty(grid);
    if (!empty) {
      empty = document.createElement('div');
      empty.className = EMPTY_CLASS;
      grid.insertAdjacentElement('afterend', empty);
    }
    empty.innerHTML = `<div><strong>${tr('Chưa chọn giáo viên', 'No teacher selected')}</strong><span>${tr('Bấm “Chọn giáo viên” để mở danh sách trong cửa sổ modal.', 'Click “Choose teacher” to open the teacher list in a modal.')}</span></div>`;
    empty.hidden = Boolean(state.selectedKey);
    return empty;
  };

  const applySelection = (grid, toolbar) => {
    const infos = allInfos(grid);
    if (state.selectedKey && !infos.some((info) => !info.isAdmin && info.key === state.selectedKey)) {
      state.selectedKey = '';
      state.expandedKey = '';
    }
    infos.forEach((info) => {
      info.card.hidden = !state.selectedKey || info.isAdmin || info.key !== state.selectedKey;
    });
    grid.hidden = !state.selectedKey;
    grid.classList.toggle('is-single-teacher', Boolean(state.selectedKey));
    ensureEmpty(grid);
    updateToolbar(grid, toolbar);
    if (state.selectedKey) setExpanded(grid, state.selectedKey, true);
  };

  const focusable = (modal) => [...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.offsetParent !== null);

  const closeModal = () => {
    const backdrop = document.getElementById(MODAL_ID);
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('teacher-picker-modal-open');
    const target = state.lastFocus;
    state.lastFocus = null;
    window.setTimeout(() => target?.focus?.(), 0);
  };

  const onModalKeydown = (event) => {
    const backdrop = document.getElementById(MODAL_ID);
    if (!backdrop || backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusable(backdrop.querySelector('.teacher-picker-modal'));
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modalMarkup = () => `
    <section class="teacher-picker-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-modal-title" aria-describedby="teacher-picker-modal-description">
      <header class="teacher-picker-modal-header">
        <div><span>${tr('CHỌN GIÁO VIÊN', 'SELECT TEACHER')}</span><h2 id="teacher-picker-modal-title">${tr('Chọn giáo viên để quản lý quyền', 'Choose a teacher to manage access')}</h2><p id="teacher-picker-modal-description">${tr('Tìm theo tên hoặc email, sau đó chọn một giáo viên để mở bảng quyền.', 'Search by name or email, then choose a teacher to open their permissions.')}</p></div>
        <button type="button" class="teacher-picker-modal-close" aria-label="${tr('Đóng', 'Close')}">×</button>
      </header>
      <div class="teacher-picker-modal-filters">
        <label><span>${tr('Tìm giáo viên', 'Search teachers')}</span><input class="teacher-picker-modal-search" type="search" autocomplete="off" placeholder="${tr('Nhập tên hoặc email…', 'Enter name or email…')}" /></label>
        <label><span>${tr('Trạng thái', 'Status')}</span><select class="teacher-picker-modal-status"><option value="all">${tr('Tất cả trạng thái', 'All statuses')}</option><option value="active">${tr('Đang hoạt động', 'Active')}</option><option value="inactive">${tr('Đã khóa / chờ duyệt', 'Locked / pending')}</option></select></label>
      </div>
      <div class="teacher-picker-modal-list" role="listbox" aria-label="${tr('Danh sách giáo viên', 'Teacher list')}"></div>
      <footer class="teacher-picker-modal-footer"><strong class="teacher-picker-modal-count">0</strong><button type="button" class="teacher-picker-modal-cancel">${tr('Đóng', 'Close')}</button></footer>
    </section>`;

  const ensureModal = () => {
    let backdrop = document.getElementById(MODAL_ID);
    if (backdrop && backdrop.dataset.language === languageKey()) return backdrop;
    backdrop?.remove();
    backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.className = 'teacher-picker-modal-backdrop';
    backdrop.dataset.language = languageKey();
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = modalMarkup();
    document.body.appendChild(backdrop);
    backdrop.querySelector('.teacher-picker-modal-close')?.addEventListener('click', closeModal);
    backdrop.querySelector('.teacher-picker-modal-cancel')?.addEventListener('click', closeModal);
    backdrop.querySelector('.teacher-picker-modal-search')?.addEventListener('input', renderModalList);
    backdrop.querySelector('.teacher-picker-modal-status')?.addEventListener('change', renderModalList);
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeModal();
    });
    return backdrop;
  };

  const selectTeacher = (key) => {
    const grid = document.querySelector(GRID_SELECTOR);
    const toolbar = grid ? findToolbar(grid) : null;
    if (!grid || !toolbar) return;
    state.selectedKey = key;
    applySelection(grid, toolbar);
    closeModal();
    requestAnimationFrame(() => {
      grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      grid.querySelector(':scope > .admin-user-card:not([hidden]) .teacher-permission-toggle')?.focus?.();
    });
  };

  function renderModalList() {
    const grid = document.querySelector(GRID_SELECTOR);
    const backdrop = document.getElementById(MODAL_ID);
    if (!grid || !backdrop) return;
    const list = backdrop.querySelector('.teacher-picker-modal-list');
    const count = backdrop.querySelector('.teacher-picker-modal-count');
    const query = backdrop.querySelector('.teacher-picker-modal-search')?.value.trim().toLowerCase() || '';
    const filter = backdrop.querySelector('.teacher-picker-modal-status')?.value || 'all';
    const infos = teacherInfos(grid).filter((info) => {
      const matchText = `${info.name} ${info.email} ${info.school}`.toLowerCase();
      const active = isActiveState(info.accountState);
      return (!query || matchText.includes(query))
        && (filter === 'all' || (filter === 'active' && active) || (filter === 'inactive' && !active));
    });

    list.replaceChildren();
    if (!infos.length) {
      const empty = document.createElement('div');
      empty.className = 'teacher-picker-modal-empty';
      empty.textContent = tr('Không tìm thấy giáo viên phù hợp.', 'No matching teachers found.');
      list.appendChild(empty);
    } else {
      infos.forEach((info) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'teacher-picker-modal-item';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(info.key === state.selectedKey));

        const avatar = document.createElement('span');
        avatar.className = 'teacher-picker-modal-avatar';
        avatar.textContent = initials(info.name);

        const copy = document.createElement('span');
        copy.className = 'teacher-picker-modal-item-copy';
        const name = document.createElement('strong');
        name.textContent = info.name;
        const email = document.createElement('span');
        email.textContent = info.email || info.school || '—';
        const access = document.createElement('span');
        access.textContent = info.permissionState || tr('Chưa cấu hình quyền', 'No access profile');
        copy.append(name, email, access);

        const meta = document.createElement('span');
        meta.className = 'teacher-picker-modal-item-meta';
        const status = document.createElement('span');
        const active = isActiveState(info.accountState);
        status.className = `teacher-picker-modal-state${active ? '' : ' inactive'}`;
        status.textContent = info.accountState || (active ? tr('Đang hoạt động', 'Active') : tr('Chờ duyệt', 'Pending'));
        const check = document.createElement('span');
        check.className = 'teacher-picker-modal-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        meta.append(status, check);

        button.append(avatar, copy, meta);
        button.addEventListener('click', () => selectTeacher(info.key));
        list.appendChild(button);
      });
    }
    setText(count, isVietnamese() ? `${infos.length} giáo viên` : `${infos.length} teachers`);
  }

  const openModal = (trigger) => {
    const backdrop = ensureModal();
    state.lastFocus = trigger || document.activeElement;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('teacher-picker-modal-open');
    const search = backdrop.querySelector('.teacher-picker-modal-search');
    const status = backdrop.querySelector('.teacher-picker-modal-status');
    if (search) search.value = '';
    if (status) status.value = 'all';
    renderModalList();
    requestAnimationFrame(() => search?.focus());
  };

  const toolbarMarkup = () => `
    <div class="teacher-permission-toolbar-copy"><span>${tr('QUẢN LÝ THEO GIÁO VIÊN', 'MANAGE BY TEACHER')}</span><h2>${tr('Chọn giáo viên', 'Choose teacher')}</h2><p>${tr('Chọn một giáo viên trong cửa sổ modal để xem và chỉnh quyền truy cập. Danh sách luôn nằm gọn trong viewport.', 'Choose a teacher in the modal to view and edit access. The list always stays inside the viewport.')}</p></div>
    <div class="teacher-picker-action-area">
      <div class="teacher-picker-current" role="button" tabindex="0"><span class="teacher-picker-current-avatar">GV</span><span class="teacher-picker-current-copy"><small>${tr('Giáo viên đang chọn', 'Selected teacher')}</small><strong class="teacher-picker-current-name"></strong><span class="teacher-picker-current-detail"></span></span></div>
      <div class="teacher-picker-buttons"><button type="button" class="teacher-picker-clear" hidden>${tr('Bỏ lựa chọn', 'Clear selection')}</button><button type="button" class="teacher-picker-open">${tr('Chọn giáo viên', 'Choose teacher')}</button></div>
    </div>`;

  const ensureToolbar = (grid) => {
    let toolbar = findToolbar(grid);
    if (toolbar && toolbar.dataset.language === languageKey()) return toolbar;
    grid.parentElement?.querySelectorAll(`:scope > .${TOOLBAR_CLASS}`).forEach((node) => node.remove());
    toolbar = document.createElement('section');
    toolbar.className = `${TOOLBAR_CLASS} teacher-picker-toolbar`;
    toolbar.dataset.pickerVersion = '2';
    toolbar.dataset.language = languageKey();
    toolbar.innerHTML = toolbarMarkup();
    grid.parentElement?.insertBefore(toolbar, grid);

    const openButton = toolbar.querySelector('.teacher-picker-open');
    const current = toolbar.querySelector('.teacher-picker-current');
    openButton?.addEventListener('click', (event) => openModal(event.currentTarget));
    current?.addEventListener('click', () => openModal(openButton));
    current?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(openButton);
      }
    });
    toolbar.querySelector('.teacher-picker-clear')?.addEventListener('click', () => {
      state.selectedKey = '';
      state.expandedKey = '';
      applySelection(grid, toolbar);
    });
    return toolbar;
  };

  const enhance = () => {
    if (state.applying) return;
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) {
      closeModal();
      return;
    }
    state.applying = true;
    try {
      installStyles();
      ensureModal();
      grid.classList.add('admin-permission-manager');
      [...grid.querySelectorAll(':scope > .admin-user-card')].forEach((card, index) => enhanceCard(card, grid, index));
      applySelection(grid, ensureToolbar(grid));
      const modal = document.getElementById(MODAL_ID);
      if (modal && !modal.hidden) renderModalList();
    } finally {
      state.applying = false;
    }
  };

  const schedule = () => {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(() => {
      state.scheduled = false;
      enhance();
    });
  };

  const relevantNode = (node) => node?.nodeType === 1 && (
    node.matches?.(GRID_SELECTOR)
    || node.querySelector?.(GRID_SELECTOR)
    || node.matches?.('.admin-user-card')
    || node.querySelector?.('.admin-user-card')
  );
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some(relevantNode))) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('keydown', onModalKeydown);
  window.addEventListener('hashchange', () => {
    closeModal();
    schedule();
  });
  window.addEventListener('bes-auth-users-updated', schedule);
  window.addEventListener('load', schedule, { once: true });
  installStyles();
  schedule();
})();
