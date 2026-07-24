(() => {
  const GRID_SELECTOR = '.metro-clean-system[data-route="admin"] .permission-admin-grid';
  let expandedKey = '';
  let scheduled = false;
  let applying = false;

  const isVietnamese = () => {
    const lang = String(document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('vi')) return true;
    return Boolean(document.querySelector('.permission-headline strong')?.textContent?.includes('Quyền'));
  };

  const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'GV';
  };

  const getCardInfo = (card, index) => {
    const name = card.querySelector('.admin-user-top h3')?.textContent?.trim() || `Teacher ${index + 1}`;
    const school = card.querySelector('.admin-user-top p')?.textContent?.trim() || '';
    const meta = [...card.querySelectorAll('.admin-user-meta > span')].map((item) => item.textContent.trim());
    const email = meta[0] || '';
    return {
      name,
      school,
      email,
      accountState: meta[1] || '',
      permissionState: meta[2] || '',
      role: card.querySelector('.status-badge')?.textContent?.trim() || '',
      key: email || `${name}-${index}`,
    };
  };

  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
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
        ? (isVietnamese() ? 'Thu gọn' : 'Collapse')
        : (isVietnamese() ? 'Quản lý quyền' : 'Manage access'));
    });
    if (shouldOpen) {
      cards.find((card, index) => getCardInfo(card, index).key === key)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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
    setText(summary.querySelector('.teacher-permission-state'), info.accountState || (isVietnamese() ? 'Chưa có trạng thái' : 'No status'));
    setText(summary.querySelector('.teacher-permission-access'), info.permissionState || (isVietnamese() ? 'Chưa cấu hình quyền' : 'No access profile'));

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
        setExpanded(grid, info.key, !card.classList.contains('is-permission-open'));
      });
    }

    const open = expandedKey === info.key;
    card.classList.toggle('is-permission-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${isVietnamese() ? 'Quản lý quyền của' : 'Manage permissions for'} ${info.name}`);
    setText(toggle.querySelector('.teacher-permission-toggle-label'), open
      ? (isVietnamese() ? 'Thu gọn' : 'Collapse')
      : (isVietnamese() ? 'Quản lý quyền' : 'Manage access'));
    return info;
  };

  const buildToolbar = (grid) => {
    const toolbar = document.createElement('section');
    toolbar.className = 'teacher-permission-manager-toolbar';
    toolbar.innerHTML = `
      <div class="teacher-permission-toolbar-copy">
        <span>${isVietnamese() ? 'QUẢN LÝ THEO GIÁO VIÊN' : 'MANAGE BY TEACHER'}</span>
        <h2>${isVietnamese() ? 'Quyền truy cập của giáo viên' : 'Teacher access permissions'}</h2>
        <p>${isVietnamese() ? 'Chọn một giáo viên để mở bảng quyền. Danh sách và nhóm quyền có thanh cuộn riêng.' : 'Select a teacher to open their access panel. Teacher and permission lists scroll independently.'}</p>
      </div>
      <div class="teacher-permission-toolbar-controls">
        <label class="teacher-permission-search"><span>${isVietnamese() ? 'Tìm giáo viên' : 'Search teachers'}</span><input type="search" autocomplete="off" placeholder="${isVietnamese() ? 'Tên hoặc email…' : 'Name or email…'}" /></label>
        <label class="teacher-permission-select-wrap"><span>${isVietnamese() ? 'Giáo viên' : 'Teacher'}</span><select class="teacher-permission-select"></select></label>
        <label class="teacher-permission-status-wrap"><span>${isVietnamese() ? 'Trạng thái' : 'Status'}</span><select class="teacher-permission-status"><option value="all">${isVietnamese() ? 'Tất cả trạng thái' : 'All statuses'}</option><option value="active">${isVietnamese() ? 'Đang hoạt động' : 'Active'}</option><option value="inactive">${isVietnamese() ? 'Đã khóa / chờ duyệt' : 'Locked / pending'}</option><option value="admin">Admin</option></select></label>
        <div class="teacher-permission-toolbar-actions"><strong class="teacher-permission-result-count">0</strong><button type="button" class="teacher-permission-collapse-all">${isVietnamese() ? 'Thu gọn tất cả' : 'Collapse all'}</button></div>
      </div>`;
    grid.parentElement?.insertBefore(toolbar, grid);

    const rerun = () => applyFilters(grid, toolbar);
    toolbar.querySelector('input')?.addEventListener('input', rerun);
    toolbar.querySelector('.teacher-permission-status')?.addEventListener('change', rerun);
    toolbar.querySelector('.teacher-permission-select')?.addEventListener('change', (event) => {
      applyFilters(grid, toolbar);
      if (event.currentTarget.value !== 'all') setExpanded(grid, event.currentTarget.value, true);
    });
    toolbar.querySelector('.teacher-permission-collapse-all')?.addEventListener('click', () => setExpanded(grid, '', false));
    return toolbar;
  };

  const ensureToolbar = (grid, infos) => {
    let toolbar = grid.previousElementSibling;
    if (!toolbar?.classList.contains('teacher-permission-manager-toolbar')) toolbar = buildToolbar(grid);

    const select = toolbar.querySelector('.teacher-permission-select');
    const signature = infos.map((info) => `${info.key}|${info.name}|${info.email}`).join('::');
    if (select && select.dataset.optionsSignature !== signature) {
      const previous = select.value || 'all';
      const options = [
        { value: 'all', label: isVietnamese() ? `Tất cả giáo viên (${infos.length})` : `All teachers (${infos.length})` },
        ...infos.map((info) => ({ value: info.key, label: info.email ? `${info.name} · ${info.email}` : info.name })),
      ];
      select.replaceChildren(...options.map(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
      }));
      select.dataset.optionsSignature = signature;
      select.value = options.some((item) => item.value === previous) ? previous : 'all';
    }
    return toolbar;
  };

  function applyFilters(grid, toolbar) {
    const query = toolbar.querySelector('input')?.value.trim().toLowerCase() || '';
    const selected = toolbar.querySelector('.teacher-permission-select')?.value || 'all';
    const status = toolbar.querySelector('.teacher-permission-status')?.value || 'all';
    let visible = 0;

    [...grid.querySelectorAll(':scope > .admin-user-card')].forEach((card) => {
      const name = card.dataset.permissionTeacherName || '';
      const key = card.dataset.permissionTeacherKey || '';
      const state = card.dataset.permissionTeacherState || '';
      const role = card.dataset.permissionTeacherRole || '';
      const active = state.includes('kích hoạt') || state.includes('approved') || state.includes('active');
      const show = (!query || name.includes(query))
        && (selected === 'all' || key === selected)
        && (status === 'all' || (status === 'admin' && role.includes('admin')) || (status === 'active' && active) || (status === 'inactive' && !active));
      card.hidden = !show;
      if (show) visible += 1;
    });

    setText(toolbar.querySelector('.teacher-permission-result-count'), isVietnamese() ? `${visible} giáo viên` : `${visible} teachers`);
    grid.classList.toggle('is-single-teacher', selected !== 'all');
  }

  const enhance = () => {
    if (applying) return;
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    applying = true;
    try {
      grid.classList.add('admin-permission-manager');
      const infos = [...grid.querySelectorAll(':scope > .admin-user-card')].map((card, index) => enhanceCard(card, grid, index));
      applyFilters(grid, ensureToolbar(grid, infos));
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
  window.addEventListener('hashchange', schedule);
  window.addEventListener('bes-auth-users-updated', schedule);
  window.addEventListener('load', schedule, { once: true });
  schedule();
})();
