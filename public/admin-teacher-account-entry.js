(() => {
  const ENTRY_ID = 'bes-admin-teacher-account-entry';
  const ADMIN_ACCOUNTS_SELECTOR = '#admin-v41-accounts';
  const MANAGER_LAUNCHER_SELECTOR = '.bes-bulk-accounts__launcher';
  let scheduled = false;

  const isAdminRoute = () => /^#\/admin(?:[/?]|$)/.test(window.location.hash || '');

  const requestManagerOpen = () => {
    window.dispatchEvent(new CustomEvent('bes-open-teacher-account-manager'));
    window.setTimeout(() => {
      if (document.querySelector('.bes-bulk-accounts__panel')) return;
      const launcher = document.querySelector(MANAGER_LAUNCHER_SELECTOR);
      if (launcher && launcher.getAttribute('aria-expanded') !== 'true') launcher.click();
    }, 120);
  };

  const installEntry = () => {
    scheduled = false;
    const existing = document.getElementById(ENTRY_ID);
    if (!isAdminRoute()) {
      existing?.remove();
      return;
    }

    const accounts = document.querySelector(ADMIN_ACCOUNTS_SELECTOR);
    if (!accounts || existing) return;

    const entry = document.createElement('section');
    entry.id = ENTRY_ID;
    entry.setAttribute('aria-label', 'Tạo tài khoản giáo viên');
    entry.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 16px;padding:16px 18px;border:1px solid #d9e2ec;border-radius:18px;background:#f8fbff;box-shadow:0 1px 2px rgba(60,64,67,.08)';
    entry.innerHTML = '<div><strong style="display:block;font-size:15px;color:#202124">Tạo tài khoản giáo viên</strong><span style="display:block;margin-top:4px;color:#5f6368;font-size:12px">Tạo một hoặc nhiều tài khoản giáo viên bằng tên đăng nhập và mật khẩu tạm.</span></div><button type="button" style="min-height:42px;padding:0 18px;border:0;border-radius:999px;background:#0b57d0;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">＋ Tạo tài khoản giáo viên</button>';
    entry.querySelector('button')?.addEventListener('click', requestManagerOpen);

    accounts.insertBefore(entry, accounts.firstChild);
  };

  const scheduleInstall = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(installEntry);
  };

  window.addEventListener('hashchange', scheduleInstall);
  window.addEventListener('bes-auth-users-updated', scheduleInstall);
  new MutationObserver(scheduleInstall).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInstall, { once: true });
  } else {
    scheduleInstall();
  }
})();
