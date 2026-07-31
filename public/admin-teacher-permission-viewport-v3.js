(() => {
  const GRID_SELECTOR = '.metro-clean-system[data-route="admin"] .permission-admin-grid.admin-permission-manager.is-single-teacher';
  let queued = false;

  const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

  const markCreateTeacherButton = () => {
    document.querySelectorAll('button').forEach((button) => {
      const label = normalize(button.textContent || button.getAttribute('aria-label') || '');
      const isCreateTeacher = label.includes('tạo tài khoản gv')
        || label.includes('tạo tài khoản giáo viên')
        || label.includes('create teacher account');
      button.classList.toggle('teacher-picker-floating-create-account', isCreateTeacher);
    });
  };

  const sync = () => {
    queued = false;
    const grid = document.querySelector(GRID_SELECTOR);
    const hasVisibleTeacher = Boolean(grid && !grid.hidden && grid.querySelector(':scope > .admin-user-card:not([hidden])'));
    document.body.classList.toggle('teacher-permission-selection-active', hasVisibleTeacher);
    markCreateTeacherButton();
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden'],
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  schedule();
})();
