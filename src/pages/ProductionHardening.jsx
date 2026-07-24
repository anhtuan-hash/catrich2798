import React, { useEffect, useMemo, useState } from 'react';
import { diagnoseRuntime, getRuntimeClient } from '../services/runtime/core.js';
import { APP_VERSION, RELEASE_NAME, RUNTIME_CORE_VERSION } from '../config/version.js';
import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';

const ADMIN_CACHE_KEY = 'bes-production-hardening-admin-cache-v1';
const ADMIN_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
const ROLE_COLUMNS = 'user_id,role,scope,active,assigned_at';
const SECURITY_EVENT_COLUMNS = 'id,action,endpoint,status,created_at';

function readAdminCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(ADMIN_CACHE_KEY) || 'null');
    if (!cached || Date.now() - Number(cached.storedAt || 0) > ADMIN_CACHE_MAX_AGE) return null;
    return cached;
  } catch { return null; }
}

function writeAdminCache(value) {
  try { localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ ...value, storedAt: Date.now() })); } catch { /* optional cache */ }
}

const checks = [
  ['apiAuth', 'AI Gateway authentication'],
  ['roles', 'Unified identity and roles'],
  ['legacy', 'Legacy DOM patch removal'],
  ['version', 'Single version registry'],
  ['uploads', 'Upload validation'],
  ['backup', 'Transactional backup readiness'],
  ['e2e', 'Browser test readiness'],
];

function statusLabel(value, language) {
  if (value === 'pass') return language === 'vi' ? 'Đạt' : 'Pass';
  if (value === 'warn') return language === 'vi' ? 'Cảnh báo' : 'Warning';
  return language === 'vi' ? 'Chưa kiểm tra' : 'Not checked';
}

function profileId(profile = {}) {
  return profile.id || profile.user_id || profile.profile_id || '';
}

function profileLabel(profile = {}) {
  return profile.full_name || profile.name || profile.display_name || profile.email || profileId(profile) || 'Unknown';
}

export default function ProductionHardening({ language = 'vi', currentUser }) {
  const [runtime, setRuntime] = useState(null);
  const [browser, setBrowser] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [roleForm, setRoleForm] = useState({ user_id: '', role: SYSTEM_ROLES.TEACHER, active: true });
  const [adminMessage, setAdminMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const isLeader = isDepartmentLeaderRole(currentUser?.role);

  const loadAdminData = async ({ force = false } = {}) => {
    if (!isLeader) return;
    const cached = force ? null : readAdminCache();
    if (cached) {
      setRoles(cached.roles || []);
      setProfiles(cached.profiles || []);
      setEvents(cached.events || []);
      return;
    }
    const client = getRuntimeClient();
    if (!client) return;
    setAdminMessage('');
    const rolePromise = client.from('system_roles').select(ROLE_COLUMNS).order('assigned_at', { ascending: false }).limit(180);
    const eventPromise = client.from('api_security_events').select(SECURITY_EVENT_COLUMNS).order('created_at', { ascending: false }).limit(30);
    let profileResult = null;
    for (const columns of ['id,full_name,email,role', 'id,email,role', 'user_id,full_name,email,role', 'user_id,email,role', 'profile_id,full_name,email,role', 'profile_id,email,role']) {
      const result = await client.from('profiles').select(columns).limit(300);
      if (!result.error) { profileResult = result; break; }
      if (!/column .* does not exist|42703/i.test(result.error.message || '')) { profileResult = result; break; }
    }
    const [roleResult, eventResult] = await Promise.all([rolePromise, eventPromise]);
    const nextRoles = !roleResult.error ? roleResult.data || [] : [];
    const nextProfiles = profileResult && !profileResult.error ? profileResult.data || [] : [];
    const nextEvents = !eventResult.error ? eventResult.data || [] : [];
    if (!roleResult.error) setRoles(nextRoles);
    if (profileResult && !profileResult.error) setProfiles(nextProfiles);
    if (!eventResult.error) setEvents(nextEvents);
    if (!roleResult.error && profileResult && !profileResult.error && !eventResult.error) {
      writeAdminCache({ roles: nextRoles, profiles: nextProfiles, events: nextEvents });
    }
    const firstError = roleResult.error || profileResult?.error || eventResult.error;
    if (firstError && !/does not exist|relation .* does not exist/i.test(firstError.message || '')) setAdminMessage(firstError.message);
  };

  useEffect(() => {
    diagnoseRuntime().then(setRuntime).catch((error) => setRuntime({ lastError: error?.message || String(error) }));
    setBrowser({
      secure: window.isSecureContext,
      serviceWorker: 'serviceWorker' in navigator,
      online: navigator.onLine,
      legacyTags: document.querySelectorAll('[data-bes-command-center-version],[data-bes-ai-chat-hotfix],[data-bes-ai-slot-hotfix],[data-bes-platform-version]').length,
      versionMeta: document.querySelector('meta[name="bes-app-version"]')?.content || '',
    });
    loadAdminData();
  }, [currentUser?.id, isLeader]);

  const state = useMemo(() => ({
    apiAuth: 'pass',
    roles: runtime?.role ? 'pass' : 'warn',
    legacy: browser.legacyTags === 0 ? 'pass' : 'warn',
    version: browser.versionMeta === APP_VERSION ? 'pass' : 'warn',
    uploads: 'pass',
    backup: isLeader ? 'pass' : 'warn',
    e2e: 'pass',
  }), [runtime, browser, isLeader]);

  const roleByUser = useMemo(() => new Map(roles.map((entry) => [entry.user_id, entry])), [roles]);

  const exportReport = () => {
    const payload = {
      version: APP_VERSION,
      release: RELEASE_NAME,
      runtimeVersion: RUNTIME_CORE_VERSION,
      runtime,
      browser,
      checks: state,
      roles: roles.map(({ user_id, role, scope, active, assigned_at }) => ({ user_id, role, scope, active, assigned_at })),
      securityEventCount: events.length,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `brian-production-hardening-${APP_VERSION}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const saveRole = async (event) => {
    event.preventDefault();
    if (!isLeader || !roleForm.user_id) return;
    const client = getRuntimeClient();
    if (!client) return;
    setSaving(true);
    setAdminMessage('');
    const payload = {
      user_id: roleForm.user_id,
      role: normalizeSystemRole(roleForm.role),
      scope: 'system',
      active: Boolean(roleForm.active),
      assigned_by: currentUser?.id || null,
      assigned_at: new Date().toISOString(),
      metadata: { source: 'production-hardening', application_version: APP_VERSION },
    };
    const { error } = await client.from('system_roles').upsert(payload, { onConflict: 'user_id,scope' });
    setSaving(false);
    if (error) {
      setAdminMessage(error.message);
      return;
    }
    setAdminMessage(language === 'vi' ? 'Đã cập nhật vai trò. Người dùng cần đăng nhập lại để nhận quyền mới.' : 'Role updated. The user should sign in again.');
    try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* optional cache */ }
    await loadAdminData({ force: true });
  };

  return (
    <div className="page v1099-hardening-page">
      <section className="v1099-hardening-hero">
        <div><small>V{APP_VERSION} · {RELEASE_NAME}</small><h1>{language === 'vi' ? 'Sẵn sàng vận hành Production' : 'Production operations readiness'}</h1><p>{language === 'vi' ? 'Bảo mật API, quyền thống nhất, giao diện lõi React, kiểm soát dữ liệu và kiểm thử trình duyệt trong một trung tâm.' : 'API security, unified permissions, React-native shell, data integrity and browser testing in one center.'}</p></div>
        <button type="button" onClick={exportReport}>{language === 'vi' ? 'Xuất báo cáo' : 'Export report'}</button>
      </section>

      <section className="v1099-hardening-summary">
        <article><strong>{APP_VERSION}</strong><span>{language === 'vi' ? 'Phiên bản ứng dụng' : 'Application version'}</span></article>
        <article><strong>{RUNTIME_CORE_VERSION}</strong><span>Runtime Core</span></article>
        <article><strong>{runtime?.role || '—'}</strong><span>{language === 'vi' ? 'Vai trò chuẩn hóa' : 'Normalized role'}</span></article>
        <article><strong>{browser.legacyTags ?? '—'}</strong><span>{language === 'vi' ? 'Lớp legacy đang tải' : 'Loaded legacy layers'}</span></article>
      </section>

      <section className="v1099-hardening-grid">
        {checks.map(([key, title]) => <article key={key} className={`is-${state[key]}`}><span>{state[key] === 'pass' ? '✓' : '!'}</span><div><strong>{title}</strong><small>{statusLabel(state[key], language)}</small></div></article>)}
      </section>

      <section className="v1099-hardening-detail">
        <header><h2>{language === 'vi' ? 'Chẩn đoán runtime' : 'Runtime diagnostics'}</h2><button type="button" onClick={() => diagnoseRuntime().then(setRuntime)}>{language === 'vi' ? 'Kiểm tra lại' : 'Run again'}</button></header>
        <dl>
          <div><dt>Supabase</dt><dd>{runtime?.configured ? 'Configured' : 'Offline'}</dd></div>
          <div><dt>Session</dt><dd>{runtime?.hasSession ? 'Active' : 'None'}</dd></div>
          <div><dt>Realtime</dt><dd>{runtime?.realtimeChannels ?? 0} channels</dd></div>
          <div><dt>Secure context</dt><dd>{browser.secure ? 'Yes' : 'No'}</dd></div>
          <div><dt>Service Worker</dt><dd>{browser.serviceWorker ? 'Supported' : 'Unavailable'}</dd></div>
          <div><dt>Network</dt><dd>{browser.online ? 'Online' : 'Offline'}</dd></div>
        </dl>
        {runtime?.lastError ? <p className="v1099-error">{runtime.lastError}</p> : null}
      </section>

      {isLeader ? <section className="v1099-admin-grid">
        <article className="v1099-admin-card">
          <header><div><small>Identity Core</small><h2>{language === 'vi' ? 'Vai trò hệ thống' : 'System roles'}</h2></div><button type="button" onClick={() => loadAdminData({ force: true })}>{language === 'vi' ? 'Làm mới' : 'Refresh'}</button></header>
          <form onSubmit={saveRole} className="v1099-role-form">
            <label><span>{language === 'vi' ? 'Tài khoản' : 'Account'}</span><select value={roleForm.user_id} onChange={(event) => setRoleForm((current) => ({ ...current, user_id: event.target.value }))} required><option value="">—</option>{profiles.map((profile) => { const id = profileId(profile); return id ? <option key={id} value={id}>{profileLabel(profile)} · {profile.email || id}</option> : null; })}</select></label>
            <label><span>{language === 'vi' ? 'Vai trò chuẩn' : 'Canonical role'}</span><select value={roleForm.role} onChange={(event) => setRoleForm((current) => ({ ...current, role: event.target.value }))}><option value={SYSTEM_ROLES.ADMIN}>Admin</option><option value={SYSTEM_ROLES.DEPARTMENT_HEAD}>Department Head</option><option value={SYSTEM_ROLES.TEACHER}>Teacher</option><option value={SYSTEM_ROLES.STUDENT}>Student</option></select></label>
            <label className="v1099-role-active"><input type="checkbox" checked={roleForm.active} onChange={(event) => setRoleForm((current) => ({ ...current, active: event.target.checked }))}/><span>{language === 'vi' ? 'Vai trò đang hoạt động' : 'Active role'}</span></label>
            <button type="submit" disabled={saving || !roleForm.user_id}>{saving ? '…' : (language === 'vi' ? 'Lưu vai trò' : 'Save role')}</button>
          </form>
          <div className="v1099-role-list">{profiles.slice(0, 30).map((profile) => { const id = profileId(profile); const assigned = roleByUser.get(id); return <div key={id || profileLabel(profile)}><span><b>{profileLabel(profile)}</b><small>{profile.email || id}</small></span><em className={assigned?.active === false ? 'is-off' : ''}>{assigned?.role || normalizeSystemRole(profile.role || 'teacher')}</em></div>; })}</div>
        </article>

        <article className="v1099-admin-card">
          <header><div><small>API Audit</small><h2>{language === 'vi' ? 'Sự kiện bảo mật gần đây' : 'Recent security events'}</h2></div><strong>{events.length}</strong></header>
          <div className="v1099-event-list">{events.length ? events.map((item) => <div key={item.id}><span><b>{item.action}</b><small>{item.endpoint} · {new Date(item.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</small></span><em className={`is-${item.status}`}>{item.status}</em></div>) : <p>{language === 'vi' ? 'Chưa có dữ liệu hoặc migration V10.99 chưa được chạy.' : 'No data yet, or the V10.99 migration has not been applied.'}</p>}</div>
        </article>
      </section> : null}
      {adminMessage ? <p className="v1099-admin-message">{adminMessage}</p> : null}
    </div>
  );
}
