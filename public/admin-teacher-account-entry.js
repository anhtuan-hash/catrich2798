(() => {
  const ENTRY_ID = 'bes-admin-teacher-account-entry';
  const PICKER_ENTRY_ID = 'bes-admin-teacher-picker-create-account';
  const ADMIN_ACCOUNTS_SELECTOR = '#admin-v41-accounts';
  const TEACHER_LIST_SELECTOR = '#admin-v41-teacher-list';
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

  const createPickerButton = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = PICKER_ENTRY_ID;
    button.className = 'teacher-picker-create-account';
    button.setAttribute('aria-label', 'Tạo tài khoản giáo viên');
    button.textContent = '＋ Tạo tài khoản giáo viên';
    button.style.cssText = 'width:100%;min-height:42px;align-items:center;justify-content:center;gap:8px;margin:10px 0 0;padding:0 14px;border:1px solid #b9cdf5;border-radius:12px;background:#e8f0fe;color:#0b57d0;font:inherit;font-size:12px;font-weight:800;line-height:1.2;cursor:pointer;white-space:normal;text-align:center;box-sizing:border-box';
    button.style.setProperty('display', 'inline-flex', 'important');
    button.addEventListener('click', requestManagerOpen);
    return button;
  };

  const installPickerEntry = () => {
    let button = document.getElementById(PICKER_ENTRY_ID);
    if (button?.isConnected) {
      button.style.setProperty('display', 'inline-flex', 'important');
      button.hidden = false;
      return;
    }

    const teacherList = document.querySelector(TEACHER_LIST_SELECTOR);
    const actionArea = document.querySelector('.teacher-picker-buttons');
    if (!teacherList && !actionArea) return;

    button = createPickerButton();
    if (teacherList) {
      teacherList.insertAdjacentElement('afterend', button);
      return;
    }
    actionArea.appendChild(button);
  };

  const installAccountsEntry = () => {
    const accounts = document.querySelector(ADMIN_ACCOUNTS_SELECTOR);
    if (!accounts || document.getElementById(ENTRY_ID)) return;

    const entry = document.createElement('section');
    entry.id = ENTRY_ID;
    entry.setAttribute('aria-label', 'Tạo tài khoản giáo viên');
    entry.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 16px;padding:16px 18px;border:1px solid #d9e2ec;border-radius:18px;background:#f8fbff;box-shadow:0 1px 2px rgba(60,64,67,.08)';
    entry.innerHTML = '<div><strong style="display:block;font-size:15px;color:#202124">Tạo tài khoản giáo viên</strong><span style="display:block;margin-top:4px;color:#5f6368;font-size:12px">Tạo một hoặc nhiều tài khoản giáo viên bằng tên đăng nhập và mật khẩu tạm.</span></div><button type="button" style="min-height:42px;padding:0 18px;border:0;border-radius:999px;background:#0b57d0;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap">＋ Tạo tài khoản giáo viên</button>';
    entry.querySelector('button')?.addEventListener('click', requestManagerOpen);
    accounts.insertBefore(entry, accounts.firstChild);
  };

  const installEntry = () => {
    scheduled = false;
    if (!isAdminRoute()) {
      document.getElementById(ENTRY_ID)?.remove();
      document.getElementById(PICKER_ENTRY_ID)?.remove();
      return;
    }
    installPickerEntry();
    installAccountsEntry();
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
