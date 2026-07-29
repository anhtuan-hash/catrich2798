import { useEffect } from 'react';
import { getUsers, USERS_EVENT } from '../utils/auth.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';

const ROLE_OPTIONS = [
  { value: SYSTEM_ROLES.TEACHER, vi: 'Giáo viên', en: 'Teacher' },
  { value: SYSTEM_ROLES.DEPARTMENT_HEAD, vi: 'TTCM', en: 'Department head' },
  { value: SYSTEM_ROLES.ADMIN, vi: 'Quản trị', en: 'Admin' },
];

function showRoleNotice(message, tone = 'success') {
  let toast = document.getElementById('bes-admin-role-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bes-admin-role-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.className = `bes-admin-role-toast is-${tone}`;
  toast.textContent = message;
  window.clearTimeout(Number(toast.dataset.timer || 0));
  const timer = window.setTimeout(() => toast.remove(), 4200);
  toast.dataset.timer = String(timer);
}

function emailFromCard(card) {
  const value = card.querySelector('.admin-user-meta span')?.textContent || '';
  return String(value).trim().toLowerCase();
}

function roleLabel(role, language) {
  const option = ROLE_OPTIONS.find((entry) => entry.value === normalizeSystemRole(role));
  return option?.[language === 'en' ? 'en' : 'vi'] || role;
}

export default function DepartmentHeadAdminRoleBridge({ currentUser, language = 'vi' }) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || normalizeSystemRole(currentUser?.role, '') !== SYSTEM_ROLES.ADMIN) return undefined;

    let stopped = false;
    let timer = 0;

    const applyControls = async () => {
      if (stopped) return;
      const cards = [...document.querySelectorAll('.admin-user-card')];
      if (!cards.length) return;

      let users = [];
      try {
        users = await getUsers();
      } catch (error) {
        console.warn('[Brian Team] Could not load accounts for TTCM role controls.', error);
        return;
      }
      if (stopped) return;

      const byEmail = new Map(users.map((user) => [String(user.email || '').trim().toLowerCase(), user]));

      cards.forEach((card) => {
        const user = byEmail.get(emailFromCard(card));
        const actions = card.querySelector('.admin-user-actions');
        if (!user || !actions) return;

        const existing = actions.querySelector('[data-bes-role-picker]');
        if (existing) {
          const select = existing.querySelector('select');
          if (select && document.activeElement !== select) select.value = normalizeSystemRole(user.role);
          return;
        }

        const legacyRoleButton = actions.querySelector('button.metro-small-btn');
        if (legacyRoleButton) {
          legacyRoleButton.hidden = true;
          legacyRoleButton.setAttribute('aria-hidden', 'true');
        }

        const label = document.createElement('label');
        label.className = 'bes-admin-role-picker';
        label.dataset.besRolePicker = 'true';

        const caption = document.createElement('span');
        caption.textContent = language === 'en' ? 'System role' : 'Vai trò hệ thống';

        const select = document.createElement('select');
        select.setAttribute('aria-label', caption.textContent);
        ROLE_OPTIONS.forEach((entry) => {
          const option = document.createElement('option');
          option.value = entry.value;
          option.textContent = language === 'en' ? entry.en : entry.vi;
          select.appendChild(option);
        });
        select.value = normalizeSystemRole(user.role);
        select.disabled = user.id === currentUser?.id;
        select.title = select.disabled
          ? (language === 'en' ? 'You cannot change your own administrator role here.' : 'Không thể tự thay đổi quyền quản trị của chính mình tại đây.')
          : '';

        select.addEventListener('change', async () => {
          const previousRole = normalizeSystemRole(user.role);
          const nextRole = normalizeSystemRole(select.value);
          select.disabled = true;

          try {
            const { error } = await supabase
              .from('profiles')
              .update({ role: nextRole, approved: true, updated_at: new Date().toISOString() })
              .eq('id', user.id);

            if (error) throw error;

            user.role = nextRole;
            const badge = card.querySelector('.status-badge');
            if (badge) badge.textContent = nextRole;
            card.classList.toggle('admin-tile', nextRole === SYSTEM_ROLES.ADMIN);
            card.classList.toggle('teacher-tile', nextRole !== SYSTEM_ROLES.ADMIN);
            window.dispatchEvent(new CustomEvent(USERS_EVENT));
            showRoleNotice(
              language === 'en'
                ? `${user.name || user.email} is now ${roleLabel(nextRole, language)}.`
                : `Đã đặt ${user.name || user.email} thành ${roleLabel(nextRole, language)}.`,
              'success',
            );
          } catch (error) {
            select.value = previousRole;
            const detail = String(error?.message || error || 'Unknown error');
            showRoleNotice(
              language === 'en'
                ? `Could not update the role. Run supabase/brian-team.sql first. ${detail}`
                : `Không thể cập nhật vai trò. Hãy chạy supabase/brian-team.sql trước. ${detail}`,
              'error',
            );
          } finally {
            select.disabled = user.id === currentUser?.id;
          }
        });

        label.append(caption, select);
        actions.prepend(label);
      });
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(applyControls, 120);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.getElementById('bes-admin-role-toast')?.remove();
    };
  }, [currentUser?.id, currentUser?.role, language]);

  return (
    <style>{`
      .bes-admin-role-picker{display:grid;gap:5px;min-width:150px;padding:8px 10px;border:1px solid rgba(32,47,27,.14);border-radius:12px;background:#f7f9ef;color:#48513e;font-size:12px;font-weight:800}
      .bes-admin-role-picker select{min-height:36px;padding:6px 30px 6px 10px;border:1px solid rgba(32,47,27,.18);border-radius:9px;background:#fff;color:#20251c;font:inherit;outline:none}
      .bes-admin-role-picker select:focus{border-color:#81932f;box-shadow:0 0 0 3px rgba(178,194,72,.2)}
      .bes-admin-role-picker select:disabled{cursor:not-allowed;opacity:.58}
      .bes-admin-role-toast{position:fixed;right:24px;bottom:24px;z-index:99999;max-width:min(460px,calc(100vw - 32px));padding:14px 18px;border-radius:16px;background:#28331d;color:#fff;box-shadow:0 20px 55px rgba(25,34,18,.28);font-weight:750}
      .bes-admin-role-toast.is-error{background:#8d2f28}
      @media(max-width:720px){.bes-admin-role-picker{width:100%}.bes-admin-role-toast{right:16px;bottom:16px}}
    `}</style>
  );
}
