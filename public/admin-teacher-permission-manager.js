(() => {
  const GRID_SELECTOR = '.metro-clean-system[data-route="admin"] .permission-admin-grid';
  const ENHANCED_CLASS = 'admin-permission-manager';
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
    if (!parts.length) return 'GV';
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  };

  const getCardInfo = (card, index) => {
    const name = card.querySelector('.admin-user-top h3')?.textContent?.trim() || `Teacher ${index + 1}`;
    const school = card.querySelector('.admin-user-top p')?.textContent?.trim() || '';
    const meta = [...card.querySelectorAll('.admin-user-meta > span')].map((item) => item.textContent.trim());
    const email = meta[0] || '';
    const accountState = meta[1] || '';
    const permissionState = meta[2] || '';
    const role = card.querySelector('.status-badge')?.textContent?.trim() || '';
    const key = email || `${name}-${index}`;
    return { name, school, email, accountState, permissionState, role, key };
  };

  const setExpanded = (grid, key, shouldOpen = true) => {
    const cards = [...grid.querySelectorAll(':scope > .admin-user-card')];
    expandedKey = shouldOpen ? key : '';
    cards.forEach((card, index) => {
      const info = getCardInfo(card, index);
      const open = shouldOpen && info.key === key;
      card.classList.toggle('is-permission-open', open);
      const toggle = card.querySelector('.teacher-permission-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(open));
        const label = toggle.querySelector('.teacher-permission-toggle-label');
        if (label) label.textContent = open
          ? (isVietnamese() ? 'Thu gọn' : 'Collapse')
          : (isVietnamese() ? 'Quản lý quyền' : 'Manage access');
      }
    });
    if (shouldOpen) {
      const active = cards.find((card, index) => getCardInfo(card, index).key === key);
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    avatar.textContent = initials(info.name);

    let summary = top.querySelector('.teacher-permission-summary');
    if (!summary) {
      summary = document.createElement('span');
      summary.className = 'teacher-permission-summary';
      const state = document.createElement('small');
      state.className = 'teacher-permission-state';
      const access = document.createElement('small');
      access.className = 'teacher-permission-access';
      summary.append(state, access);
      const statusBadge = top.querySelector('.status-badge');
      statusBadge?.insertAdjacentElement('afterend', summary);
    }
    const state = summary.querySelector('.teacher-permission-state');
    const access = summary.querySelector('.teacher-permission-access');
    if (state) state.textContent = info.accountState || (isVietnamese() ? 'Chưa có trạng thái' : 'No status');
    if (access) access.textContent = info.permissionState || (isVietnamese() ? 'Chưa cấu hình quyền' : 'No access profile');

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
        const willOpen = !card.classList.contains('is-permission-open');
        setExpanded(grid, info.key, willOpen);
      });
    }

    const open = expandedKey === info.key;
    card.classList.toggle('is-permission-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${isVietnamese() ? 'Quản lý quyền của' : 'Manage permissions for'} ${info.name}`);
    const toggleLabel = toggle.querySelector('.teacher-permission-toggle-label');
    if (toggleLabel) toggleLabel.textContent = open
      ? (isVietnamese() ? 'Thu gọn' : 'Collapse')
      : (isVietnamese() ? 'Quản lý quyền' : 'Manage access');

    return info;
  };

  const ensureToolbar = (grid, infos) => {
    let toolbar = grid.previousElementSibling;
    if (!toolbar?.classList.contains('teacher-permission-manager-toolbar')) {
      toolbar = document.createElement('section');
      toolbar.className = 'teacher-permission-manager-toolbar';
      toolbar.innerHTML = `
        <div class="teacher-permission-toolbar-copy">
          <span>${isVietnamese() ? 'QUẢN LÝ THEO GIÁO VIÊN' : 'MANAGE BY TEACHER'}</span>
          <h2>${isVietnamese() ? 'Quyền truy cập của giáo viên' : 'Teacher access permissions'}</h2>
          <p>${isVietnamese() ? 'Chọn một giáo viên để mở bảng quyền. Danh sách và nhóm quyền có thanh cuộn riêng.' : 'Select a teacher to open their access panel. Teacher and permission lists scroll independently.'}</p>
        </div>
        <div class="teacher-permission-toolbar-controls">
          <label class="teacher-permission-search">
            <span>${isVietnamese() ? 'Tìm giáo viên' : 'Search teachers'}</span>
            <input type="search" autocomplete="off" placeholder="${isVietnamese() ? 'Tên hoặc email…' : 'Name or email…'}" />
          </label>
          <label class="teacher-permission-select-wrap">
            <span>${isVietnamese() ? 'Giáo viên' : 'Teacher'}</span>
            <select class="teacher-permission-select"></select>
          </label>
          <label class="teacher-permission-status-wrap">
            <span>${isVietnamese() ? 'Trạng thái' : 'Status'}</span>
            <select class="teacher-permission-status">
              <option value="all">${isVietnamese() ? 'Tất cả trạng thái' : 'All statuses'}</option>
              <option value="active">${isVietnamese() ? 'Đang hoạt động' : 'Active'}</option>
              <option value="inactive">${isVietnamese() ? 'Đã khóa / chờ duyệt' : 'Locked / pending'}</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div class="teacher-permission-toolbar-actions">
            <strong class="teacher-permission-result-count">0</strong>
            <button type="button" class="teacher-permission-collapse-all">${isVietnamese() ? 'Thu gọn tất cả' : 'Collapse all'}</button>
          </div>
        </div>`;
      grid.parentElement?.insertBefore(toolbar, grid);

      const rerun = () => applyFilters(grid, toolbar);
      toolbar.querySelector('input')?.addEventListener('input', rerun);
      toolbar.querySelector('.teacher-permission-status')?.addEventListener('change', rerun);
      toolbar.querySelector('.teacher-permission-select')?.addEventListener('change', (event) => {
        applyFilters(grid, toolbar);
        const value = event.currentTarget.value;
        if (value !== 'all') setExpanded(grid, value, true);
      });
      toolbar.querySelector('.teacher-permission-collapse-all')?.addEventListener('click', () => setExpanded(grid, '', false));
    }

    const select = toolbar.querySelector('.teacher-permission-select');
    if (select) {
      const previous = select.value || 'all';
      select.textContent = '';
      const all = document.createElement('option');
      all.value = 'all';
      all.textContent = isVietnamese() ? `Tất cả giáo viên (${infos.length})` : `All teachers (${infos.length})`;
      select.append(all);
      infos.forEach((info) => {
        const option = document.createElement('option');
        option.value = info.key;
        option.textContent = info.email ? `${info.name} · ${info.email}` : info.name;
        select.append(option);
      });
      select.value = [...select.options].some((item) => item.value === previous) ? previous : 'all';
    }
    return toolbar;
  };

  function applyFilters(grid, toolbar) {
    const query = toolbar.querySelector('input')?.value.trim().toLowerCase() || '';
    const selected = toolbar.querySelector('.teacher-permission-select')?.value || 'all';
    const status = toolbar.querySelector('.teacher-permission-status')?.value || 'all';
    let visible = 0;

    [...grid.querySelectorAll(':scope > .admin-user-card')].forEach((card) => {
      const matchQuery = !query || card.dataset.permissionTeacherName.includes(query);
      const matchTeacher = selected === 'all' || card.dataset.permissionTeacherKey === selected;
      const state = card.dataset.permissionTeacherState || '';
      const role = card.dataset.permissionTeacherRole || '';
      const matchStatus = status === 'all'
        || (status === 'admin' && role.includes('admin'))
        || (status === 'active' && (state.includes('kích hoạt') || state.includes('approved') || state.includes('active')))
        || (status === 'inactive' && !(state.includes('kích hoạt') || state.includes('approved') || state.includes('active')));
      const show = matchQuery && matchTeacher && matchStatus;
      card.hidden = !show;
      if (show) visible += 1;
    });

    const count = toolbar.querySelector('.teacher-permission-result-count');
    if (count) count.textContent = isVietnamese() ? `${visible} giáo viên` : `${visible} teachers`;
    grid.classList.toggle('is-single-teacher', selected !== 'all');
  }

  const enhance = () => {
    if (applying) return;
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    applying = true;
    try {
      grid.classList.add(ENHANCED_CLASS);
      const cards = [...grid.querySelectorAll(':scope > .admin-user-card')];
      const infos = cards.map((card, index) => enhanceCard(card, grid, index));
      const toolbar = ensureToolbar(grid, infos);
      applyFilters(grid, toolbar);
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

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('bes-auth-users-updated', schedule);
  window.addEventListener('load', schedule, { once: true });
  schedule();
})();
