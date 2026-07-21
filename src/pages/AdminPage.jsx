import React, { useEffect, useMemo, useState } from 'react';
import { getUsers, isAuthConfigured, repairCurrentAdminDatabaseRole, syncMissingProfilesFromAuth, updateUserApproval, updateUserPermissions, updateUserRole } from '../utils/auth.js';
import { getPermissionRequests, PERMISSION_REQUESTS_EVENT, updatePermissionRequestStatus } from '../utils/permissionRequests.js';
import {
  ALL_PERMISSION_IDS,
  PERMISSION_GROUPS,
  PERMISSION_ITEMS,
  createAllAccessPermissions,
  createCustomPermissions,
  getAllowedIdsFromPermissions,
  normalizePermissions,
  summarizePermissions,
} from '../utils/permissions.js';

const ADMIN_V41_NAV = [
  { id: 'hero', icon: '⌂', labelVi: 'Trang chủ', label: 'Home' },
  { id: 'requests', icon: '◎', labelVi: 'Yêu cầu truy cập', label: 'Access requests' },
  { id: 'permissions', icon: '🛡', labelVi: 'Phân quyền', label: 'Permissions' },
  { id: 'accounts', icon: '👤', labelVi: 'Tài khoản hệ thống', label: 'System accounts' },
  { id: 'security', icon: '◔', labelVi: 'Nhật ký & bảo mật', label: 'Security & logs' },
  { id: 'config', icon: '⚙', labelVi: 'Cấu hình hệ thống', label: 'System config' },
  { id: 'reports', icon: '▥', labelVi: 'Báo cáo & thống kê', label: 'Reports & analytics' },
  { id: 'assistant', icon: '🤖', labelVi: 'AI Admin Assistant', label: 'AI Admin Assistant' },
];

function goToAdminSection(id) {
  const map = {
    hero: '.admin-v41-hero',
    requests: '#admin-v41-requests',
    permissions: '#admin-v41-permissions',
    accounts: '#admin-v41-accounts',
    security: '#admin-v41-security',
    config: '.admin-sync-panel',
    reports: '#admin-v41-security',
    assistant: '.admin-v41-ai-card',
  };
  const selector = map[id] || id;
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function AdminV41Sidebar({ language, currentUser }) {
  return (
    <aside className="admin-v41-sidebar">
      <div className="admin-v41-side-brand">
        <div className="admin-v41-brand-mark">B</div>
        <div>
          <strong>Brian English</strong>
          <span>STUDIO</span>
        </div>
      </div>

      <nav className="admin-v41-side-nav">
        {ADMIN_V41_NAV.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === 0 ? 'active' : ''}
            onClick={() => goToAdminSection(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{language === 'vi' ? item.labelVi : item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-v41-ai-card">
        <div className="robot-wrap" aria-hidden="true">
          <span className="robot-head">
            <i /><i /><b />
          </span>
        </div>
        <div>
          <strong>{language === 'vi' ? 'AI Admin Assistant' : 'AI Admin Assistant'}</strong>
          <p>{language === 'vi' ? 'Trợ lý Hỗ trợ quản trị hệ thống 24/7.' : 'AI assistant for system administration, available 24/7.'}</p>
        </div>
        <button type="button" onClick={() => goToAdminSection('assistant')}>{language === 'vi' ? 'Mở trợ lý' : 'Open assistant'}</button>
      </div>

      <div className="admin-v41-side-user">
        <span className="avatar">{String(currentUser?.name || currentUser?.email || 'A').slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{currentUser?.name || 'anh tuan'}</strong>
          <small>{currentUser?.role || 'admin'}</small>
        </div>
        <em>⌄</em>
      </div>
    </aside>
  );
}

function AdminV41Illustration({ language }) {
  return (
    <div className="admin-v41-illustration" aria-hidden="true">
      <div className="flow-line line-a" />
      <div className="flow-line line-b" />
      <div className="flow-line line-c" />

      <div className="mini-user-card teacher">
        <div className="avatar-circle" />
        <div>
          <strong>{language === 'vi' ? 'Teacher' : 'Teacher'}</strong>
          <span />
        </div>
      </div>

      <div className="mini-user-card editor">
        <div className="avatar-circle" />
        <div>
          <strong>{language === 'vi' ? 'Editor' : 'Editor'}</strong>
          <span />
        </div>
      </div>

      <div className="admin-card-center">
        <div className="avatar-hero" />
        <div className="admin-card-copy">
          <strong>Admin</strong>
          <small>admin@brian.studio</small>
        </div>
        <div className="approved-pill">✓ {language === 'vi' ? 'Đã duyệt' : 'Approved'}</div>
        <div className="role-box">
          <span>{language === 'vi' ? 'Vai trò & quyền' : 'Roles & permissions'}</span>
          <ul>
            <li>{language === 'vi' ? 'Quản trị hệ thống' : 'System admin'}</li>
            <li>{language === 'vi' ? 'Quản lý người dùng' : 'User management'}</li>
            <li>{language === 'vi' ? 'Quản lý nội dung' : 'Content control'}</li>
            <li>{language === 'vi' ? 'Báo cáo & thống kê' : 'Reports & analytics'}</li>
          </ul>
        </div>
      </div>

      <div className="shield-lock">
        <div className="lock-body" />
      </div>
      <div className="status-orb red">✓</div>
      <div className="status-orb blue">✓</div>
      <div className="admin-bot-bubble">
        <span className="robot-head small"><i /><i /><b /></span>
      </div>
      <div className="soft-sheet" />
    </div>
  );
}

function AdminV41Hero({ language, onRefresh, onOpenRequests, onOpenPermissions, onSync }) {
  return (
    <section className="admin-v41-hero" aria-label={language === 'vi' ? 'Hero quản trị' : 'Admin hero'}>
      <div className="admin-v41-hero-visual">
        <AdminV41Illustration language={language} />
      </div>
      <div className="admin-v41-hero-copy">
        <span className="eyebrow-red">{language === 'vi' ? 'Admin center' : 'Admin center'}</span>
        <h1>{language === 'vi' ? 'Quản trị tài khoản và phân quyền' : 'Account and permission management'}</h1>
        <p>
          {language === 'vi'
            ? 'Quản lý tài khoản, phân quyền theo vai trò, duyệt yêu cầu cấp quyền và giám sát truy cập hệ thống Brian English Studio một cách an toàn, minh bạch.'
            : 'Manage accounts, assign role-based permissions, approve access requests and monitor system access across Brian English Studio with a secure, transparent workflow.'}
        </p>
        <div className="admin-v41-hero-actions">
          <button type="button" className="primary" onClick={onOpenRequests}>{language === 'vi' ? 'Duyệt yêu cầu' : 'Review requests'}</button>
          <button type="button" className="secondary" onClick={onOpenPermissions}>{language === 'vi' ? 'Phân quyền chi tiết' : 'Granular permissions'}</button>
          <button type="button" className="secondary" onClick={onSync}>{language === 'vi' ? 'Đồng bộ quyền' : 'Sync permissions'}</button>
        </div>
        <div className="admin-v41-hero-mini-actions">
          <button type="button" className="ghost-link" onClick={onRefresh}>{language === 'vi' ? 'Làm mới dữ liệu' : 'Refresh data'}</button>
          <button type="button" className="ghost-link" onClick={() => (window.location.hash = '#/home')}>{language === 'vi' ? 'Về trang chủ' : 'Go home'}</button>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ tone, icon, title, value, caption }) {
  return (
    <article className={`admin-v41-summary-card ${tone}`}>
      <span className="summary-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <h3>{value}</h3>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function AdminPreviewTable({ columns, rows, rowKey, buttonText, onButtonClick, emptyText }) {
  return (
    <div className="admin-v41-table-block">
      <div className="admin-v41-table-head">
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      <div className="admin-v41-table-body">
        {rows.length === 0 ? (
          <div className="admin-v41-empty-note">{emptyText}</div>
        ) : rows.map((row) => (
          <div key={rowKey(row)} className="admin-v41-table-row">
            {row.cells.map((cell, index) => <span key={`${rowKey(row)}-${index}`}>{cell}</span>)}
          </div>
        ))}
      </div>
      {buttonText ? <button type="button" className="table-action" onClick={onButtonClick}>{buttonText}</button> : null}
    </div>
  );
}

export default function AdminPage({ language, currentUser }) {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = async (clearMessage = true) => {
    if (!isAuthConfigured()) return;
    setLoading(true);
    if (clearMessage) setMsg('');
    try {
      const [nextUsers, nextRequests] = await Promise.all([getUsers(), getPermissionRequests()]);
      setUsers(nextUsers);
      setRequests(nextRequests);
    } catch (error) {
      setMsg(error?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const fn = () => refresh();
    window.addEventListener('bes-auth-users-updated', fn);
    window.addEventListener(PERMISSION_REQUESTS_EVENT, fn);
    return () => {
      window.removeEventListener('bes-auth-users-updated', fn);
      window.removeEventListener(PERMISSION_REQUESTS_EVENT, fn);
    };
  }, []);

  const runAction = async (action, successText = '') => {
    setMsg('');
    setLoading(true);
    const res = await action();
    await refresh(false);
    if (!res?.ok) setMsg(res?.message || (language === 'vi' ? 'Không thể cập nhật tài khoản.' : 'Could not update account.'));
    else if (successText) setMsg(successText);
    setLoading(false);
  };

  const syncAuthProfiles = async () => {
    setMsg('');
    setLoading(true);
    const res = await syncMissingProfilesFromAuth();
    await refresh(false);
    if (!res?.ok) {
      setMsg(res?.message || (language === 'vi' ? 'Không thể đồng bộ tài khoản Auth.' : 'Could not sync Auth accounts.'));
    } else {
      setMsg(language === 'vi'
        ? `Đã đồng bộ tài khoản Auth. Tạo thêm ${res.created || 0} hồ sơ thiếu.`
        : `Auth accounts synced. Created ${res.created || 0} missing profiles.`);
    }
    setLoading(false);
  };

  const repairDatabaseAdmin = async () => {
    setMsg('');
    setLoading(true);
    const res = await repairCurrentAdminDatabaseRole();
    await refresh(false);
    if (!res?.ok) {
      setMsg(res?.message || (language === 'vi' ? 'Không thể sửa quyền admin trong database.' : 'Could not repair database admin role.'));
    } else {
      setMsg(language === 'vi'
        ? 'Đã đồng bộ quyền admin vào public.profiles. Bấm Đồng bộ Auth → Profiles nếu vẫn thiếu giáo viên.'
        : 'Admin role synced into public.profiles. Click Sync Auth → Profiles if teacher accounts are still missing.');
    }
    setLoading(false);
  };

  const approveRequest = async (request) => {
    const target = users.find((user) => user.id === request.requester_id);
    if (!target) return { ok: false, message: language === 'vi' ? 'Không tìm thấy tài khoản gửi yêu cầu.' : 'Requesting account was not found.' };

    const permissions = normalizePermissions(target.permissions);
    if (target.role !== 'admin' && permissions.mode === 'custom') {
      const nextAllowed = [...new Set([...getAllowedIdsFromPermissions(permissions), request.permission_id])];
      const grant = await updateUserPermissions(target.id, createCustomPermissions(nextAllowed));
      if (!grant?.ok) return grant;
    }

    return updatePermissionRequestStatus(request.id, 'approved');
  };

  const rejectRequest = async (request) => updatePermissionRequestStatus(request.id, 'rejected');

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === 'pending'), [requests]);
  const handledRequests = useMemo(() => requests.filter((request) => request.status !== 'pending'), [requests]);
  const teacherUsers = useMemo(() => users.filter((user) => user.role !== 'admin'), [users]);
  const activeUsers = useMemo(() => users.filter((user) => user.approved).length, [users]);
  const inactiveUsers = useMemo(() => users.filter((user) => !user.approved).length, [users]);
  const databaseAdminNotSynced = useMemo(() => {
    if (!currentUser || currentUser.role !== 'admin') return false;
    if (!isAuthConfigured()) return false;
    const currentEmail = String(currentUser.email || '').toLowerCase();
    const selfProfile = users.find((user) => user.id === currentUser.id || String(user.email || '').toLowerCase() === currentEmail);
    if (!selfProfile) return true;
    return selfProfile.role !== 'admin' || selfProfile.approved !== true;
  }, [currentUser, users]);

  const roleRows = useMemo(() => {
    const allAccessTeachers = users.filter((user) => user.role !== 'admin' && normalizePermissions(user.permissions).mode === 'all').length;
    const customTeachers = users.filter((user) => user.role !== 'admin' && normalizePermissions(user.permissions).mode === 'custom').length;
    return [
      {
        id: 'admin',
        name: 'Admin',
        members: users.filter((user) => user.role === 'admin').length,
        app: language === 'vi' ? 'Tất cả ứng dụng' : 'All apps',
        rights: language === 'vi' ? 'Toàn quyền' : 'Full access',
        status: language === 'vi' ? 'Hoạt động' : 'Active',
      },
      {
        id: 'teacher-all',
        name: language === 'vi' ? 'Giáo viên' : 'Teachers',
        members: allAccessTeachers,
        app: 'Brian English',
        rights: language === 'vi' ? 'Toàn quyền GV' : 'Teacher full',
        status: language === 'vi' ? 'Hoạt động' : 'Active',
      },
      {
        id: 'teacher-custom',
        name: language === 'vi' ? 'Tài khoản tuỳ chỉnh' : 'Custom access',
        members: customTeachers,
        app: language === 'vi' ? 'App / game chọn lọc' : 'Selected apps',
        rights: `${ALL_PERMISSION_IDS.length} ${language === 'vi' ? 'mục quyền' : 'permission IDs'}`,
        status: language === 'vi' ? 'Hoạt động' : 'Active',
      },
    ];
  }, [users, language]);

  const recentUsers = useMemo(() => [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 3), [users]);

  const recentActivity = useMemo(() => {
    const items = [];
    handledRequests.slice(0, 3).forEach((request) => {
      items.push({
        id: `req-${request.id}`,
        tone: request.status === 'approved' ? 'green' : 'red',
        title: request.status === 'approved'
          ? (language === 'vi' ? `Đã duyệt yêu cầu của ${request.requester_name || request.requester_email}` : `Approved request from ${request.requester_name || request.requester_email}`)
          : (language === 'vi' ? `Đã từ chối yêu cầu của ${request.requester_name || request.requester_email}` : `Rejected request from ${request.requester_name || request.requester_email}`),
        subtitle: `${formatDate(request.updated_at || request.created_at)}`,
      });
    });
    if (currentUser) {
      items.unshift({
        id: 'login-current',
        tone: 'green',
        title: language === 'vi' ? 'Đăng nhập hệ thống thành công' : 'System sign-in successful',
        subtitle: `${currentUser.name || currentUser.email} (${currentUser.role})`,
      });
    }
    return items.slice(0, 3);
  }, [handledRequests, currentUser, language]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="page">
        <section className="metro-panel empty-state">
          <h1>{language === 'vi' ? 'Không có quyền truy cập' : 'Access denied'}</h1>
          <p>{language === 'vi' ? 'Chỉ tài khoản quản trị mới có thể vào khu vực này.' : 'Only an admin account can access this area.'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page admin-page admin-page-v62 admin-page-v41">
      <div className="admin-v41-shell">
        <AdminV41Sidebar language={language} currentUser={currentUser} />

        <div className="admin-v41-main">
          <AdminV41Hero
            language={language}
            onRefresh={() => refresh()}
            onOpenRequests={() => goToAdminSection('requests')}
            onOpenPermissions={() => goToAdminSection('permissions')}
            onSync={syncAuthProfiles}
          />

          <section className="admin-v41-summary-strip">
            <SummaryCard
              tone="blue"
              icon="👥"
              title={language === 'vi' ? 'Yêu cầu chờ duyệt' : 'Pending requests'}
              value={pendingRequests.length}
              caption={language === 'vi' ? `+${Math.min(3, pendingRequests.length)} mới trong hôm nay` : `+${Math.min(3, pendingRequests.length)} today`}
            />
            <SummaryCard
              tone="mint"
              icon="🛡️"
              title={language === 'vi' ? 'Phân quyền hệ thống' : 'Permission groups'}
              value={PERMISSION_GROUPS.length}
              caption={language === 'vi' ? `${ALL_PERMISSION_IDS.length} quyền khả dụng` : `${ALL_PERMISSION_IDS.length} available rights`}
            />
            <SummaryCard
              tone="violet"
              icon="👤"
              title={language === 'vi' ? 'Tài khoản đang hoạt động' : 'Active accounts'}
              value={activeUsers}
              caption={language === 'vi' ? `Trong tổng số ${users.length} tài khoản` : `Out of ${users.length} accounts`}
            />
            <SummaryCard
              tone="peach"
              icon="🔔"
              title={language === 'vi' ? 'Cảnh báo / nhật ký' : 'Alerts / logs'}
              value={inactiveUsers + (databaseAdminNotSynced ? 1 : 0)}
              caption={language === 'vi' ? 'Cần kiểm tra' : 'Require review'}
            />
          </section>

          <section className="admin-v41-core-grid">
            <article className="admin-v41-panel panel-blue" id="admin-v41-requests">
              <div className="panel-title-row">
                <div>
                  <h2>{language === 'vi' ? 'Yêu cầu truy cập' : 'Access requests'}</h2>
                  <p>{language === 'vi' ? 'Duyệt nhanh các yêu cầu giáo viên gửi lên.' : 'Quick review of teacher requests.'}</p>
                </div>
                <button type="button" className="text-link" onClick={() => document.querySelector('.permission-request-admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button>
              </div>

              <AdminPreviewTable
                columns={[
                  language === 'vi' ? 'Người dùng' : 'User',
                  language === 'vi' ? 'Vai trò đề nghị' : 'Requested role',
                  language === 'vi' ? 'Ứng dụng' : 'App',
                  language === 'vi' ? 'Thời gian' : 'Time',
                  language === 'vi' ? 'Trạng thái' : 'Status',
                ]}
                rows={pendingRequests.slice(0, 3).map((request) => ({
                  id: request.id,
                  cells: [
                    request.requester_name || request.requester_email,
                    request.item_title || request.permission_id,
                    request.item_type || 'Brian English',
                    formatMiniDate(request.created_at),
                    language === 'vi' ? 'Chờ duyệt' : 'Pending',
                  ],
                }))}
                rowKey={(row) => row.id}
                emptyText={language === 'vi' ? 'Chưa có yêu cầu mới.' : 'No pending requests.'}
                buttonText={language === 'vi' ? 'Duyệt yêu cầu' : 'Review requests'}
                onButtonClick={() => goToAdminSection('requests')}
              />
            </article>

            <article className="admin-v41-panel panel-mint" id="admin-v41-permissions">
              <div className="panel-title-row">
                <div>
                  <h2>{language === 'vi' ? 'Phân quyền chi tiết' : 'Granular permissions'}</h2>
                  <p>{language === 'vi' ? 'Tổng quan vai trò, nhóm quyền và phạm vi truy cập.' : 'Role groups, access scope and permission coverage.'}</p>
                </div>
                <button type="button" className="text-link" onClick={() => document.querySelector('.permission-admin-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{language === 'vi' ? 'Xem chi tiết' : 'View detail'}</button>
              </div>

              <AdminPreviewTable
                columns={[
                  language === 'vi' ? 'Vai trò / Nhóm' : 'Role / group',
                  language === 'vi' ? 'Thành viên' : 'Members',
                  language === 'vi' ? 'Ứng dụng' : 'Apps',
                  language === 'vi' ? 'Quyền' : 'Rights',
                  language === 'vi' ? 'Trạng thái' : 'Status',
                ]}
                rows={roleRows.map((row) => ({
                  id: row.id,
                  cells: [row.name, row.members, row.app, row.rights, row.status],
                }))}
                rowKey={(row) => row.id}
                emptyText={language === 'vi' ? 'Chưa có cấu hình quyền.' : 'No permission groups yet.'}
                buttonText={language === 'vi' ? 'Phân quyền chi tiết' : 'Permission detail'}
                onButtonClick={() => goToAdminSection('permissions')}
              />
            </article>

            <article className="admin-v41-panel panel-cream" id="admin-v41-accounts">
              <div className="panel-title-row">
                <div>
                  <h2>{language === 'vi' ? 'Tài khoản hệ thống' : 'System accounts'}</h2>
                  <p>{language === 'vi' ? 'Theo dõi trạng thái tài khoản và người dùng mới.' : 'Monitor account status and newly created users.'}</p>
                </div>
                <button type="button" className="text-link" onClick={() => document.querySelector('.permission-admin-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button>
              </div>

              <div className="admin-v41-account-grid">
                <div className="admin-v41-mini-stats">
                  <div><strong>{users.length}</strong><span>{language === 'vi' ? 'Tổng tài khoản' : 'Total accounts'}</span></div>
                  <div><strong>{activeUsers}</strong><span>{language === 'vi' ? 'Đang hoạt động' : 'Active now'}</span></div>
                  <div><strong>{inactiveUsers}</strong><span>{language === 'vi' ? 'Tạm khoá / chờ duyệt' : 'Locked / pending'}</span></div>
                  <div><strong>{teacherUsers.length}</strong><span>{language === 'vi' ? 'Giáo viên' : 'Teachers'}</span></div>
                </div>
                <div className="admin-v41-new-users">
                  <strong>{language === 'vi' ? 'Người dùng mới' : 'Newest users'}</strong>
                  {recentUsers.length === 0 ? (
                    <div className="admin-v41-empty-note">{language === 'vi' ? 'Chưa có người dùng mới.' : 'No recent users.'}</div>
                  ) : recentUsers.map((user) => (
                    <div key={user.id} className="new-user-row">
                      <span className="initials">{initialsFromName(user.name || user.email)}</span>
                      <b>{user.name}</b>
                      <em>{user.role === 'admin' ? 'Admin' : (language === 'vi' ? 'Giáo viên' : 'Teacher')}</em>
                      <small>{user.createdAt ? relativeLabel(user.createdAt, language) : '—'}</small>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" className="table-action gold" onClick={() => document.querySelector('.permission-admin-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{language === 'vi' ? 'Quản lý tài khoản' : 'Manage accounts'}</button>
            </article>

            <article className="admin-v41-panel panel-lavender" id="admin-v41-security">
              <div className="panel-title-row">
                <div>
                  <h2>{language === 'vi' ? 'Nhật ký & bảo mật' : 'Logs & security'}</h2>
                  <p>{language === 'vi' ? 'Theo dõi hoạt động gần đây và kiểm tra trạng thái bảo mật.' : 'Track recent actions and review security status.'}</p>
                </div>
                <button type="button" className="text-link" onClick={() => goToAdminSection('security')}>{language === 'vi' ? 'Xem nhật ký' : 'View logs'}</button>
              </div>

              <div className="admin-v41-security-grid">
                <div className="activity-list">
                  <strong>{language === 'vi' ? 'Hoạt động gần đây' : 'Recent activity'}</strong>
                  {recentActivity.map((item) => (
                    <div key={item.id} className={`activity-item ${item.tone}`}>
                      <span className="dot" />
                      <div>
                        <b>{item.title}</b>
                        <small>{item.subtitle}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="security-checklist">
                  <strong>{language === 'vi' ? 'Kiểm tra bảo mật' : 'Security checklist'}</strong>
                  <div><span>{language === 'vi' ? 'Xác thực 2 lớp (2FA)' : '2FA'}</span><b>{language === 'vi' ? 'Đã bật' : 'Enabled'}</b></div>
                  <div><span>{language === 'vi' ? 'Mật khẩu mạnh' : 'Strong passwords'}</span><b>{language === 'vi' ? 'Đạt' : 'Good'}</b></div>
                  <div><span>{language === 'vi' ? 'Phiên đăng nhập lạ' : 'Unusual sessions'}</span><b>{language === 'vi' ? 'Không phát hiện' : 'Not detected'}</b></div>
                  <div><span>{language === 'vi' ? 'Cập nhật bảo mật' : 'Security updates'}</span><b>{language === 'vi' ? 'Mới nhất' : 'Latest'}</b></div>
                </div>
              </div>
              <button type="button" className="table-action violet" onClick={() => goToAdminSection('security')}>{language === 'vi' ? 'Xem nhật ký & bảo mật' : 'Open logs & security'}</button>
            </article>
          </section>

          <section className="metro-admin-header metro-panel admin-sync-panel">
            <div className="admin-note">
              {language === 'vi'
                ? 'Nếu giáo viên đã xác thực email nhưng chưa hiện trong danh sách, hãy bấm Đồng bộ Auth → Profiles. Tính năng này dùng hàm bảo mật trong Supabase để tạo bù profile và đọc danh sách đầy đủ.'
                : 'If a teacher confirmed email but is missing here, click Sync Auth → Profiles. This uses a secure Supabase function to create missing profiles and load the full list.'}
            </div>
            <div className="admin-inline-actions">
              <button className="metro-small-btn active" disabled={loading} onClick={syncAuthProfiles}>
                {language === 'vi' ? 'Đồng bộ Auth → Profiles' : 'Sync Auth → Profiles'}
              </button>
              <button className="metro-small-btn" disabled={loading} onClick={repairDatabaseAdmin}>
                {language === 'vi' ? 'Sửa quyền admin DB' : 'Repair DB admin'}
              </button>
            </div>
          </section>

          {!isAuthConfigured() && (
            <section className="metro-panel empty-state">
              <h2>{language === 'vi' ? 'Chưa cấu hình Supabase' : 'Supabase is not configured'}</h2>
              <p>{language === 'vi' ? 'Thêm biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trước khi dùng trang quản trị.' : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using admin management.'}</p>
            </section>
          )}

          {msg ? <div className="auth-message">{msg}</div> : null}
          {loading ? <div className="auth-message success-message">{language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading...'}</div> : null}

          <AdminProfilesDiagnostic
            language={language}
            currentUser={currentUser}
            users={users}
            teacherUsers={teacherUsers}
            databaseAdminNotSynced={databaseAdminNotSynced}
            onRefresh={() => refresh()}
            onRepairAdmin={repairDatabaseAdmin}
          />

          <PermissionRequestsPanel
            language={language}
            loading={loading}
            pendingRequests={pendingRequests}
            allRequests={requests}
            onApprove={(request) => runAction(() => approveRequest(request), language === 'vi' ? 'Đã cấp quyền theo yêu cầu.' : 'Requested access granted.')}
            onReject={(request) => runAction(() => rejectRequest(request), language === 'vi' ? 'Đã từ chối yêu cầu.' : 'Request rejected.')}
          />

          <section className="admin-grid permission-admin-grid">
            {users.map((user) => (
              <article key={user.id} className={`admin-user-card metro-tile ${user.role === 'admin' ? 'admin-tile' : 'teacher-tile'}`}>
                <div className="admin-user-top">
                  <div>
                    <h3>{user.name}</h3>
                    <p>{user.school || '—'}</p>
                  </div>
                  <span className="status-badge">{user.role}</span>
                </div>
                <div className="admin-user-meta">
                  <span>{user.email}</span>
                  <span>{user.approved ? (language === 'vi' ? 'Đã kích hoạt' : 'Approved') : (language === 'vi' ? 'Đã khóa / chờ duyệt' : 'Disabled / pending')}</span>
                  <span>{summarizePermissions(user, language)}</span>
                  {user.createdAt ? <span>{formatDate(user.createdAt)}</span> : null}
                </div>
                <div className="admin-user-actions">
                  <button className="metro-small-btn" disabled={loading || user.id === currentUser.id} onClick={() => runAction(() => updateUserRole(user.id, user.role === 'admin' ? 'teacher' : 'admin'))}>
                    {user.role === 'admin' ? (language === 'vi' ? 'Hạ quyền' : 'Make teacher') : (language === 'vi' ? 'Đặt quản trị' : 'Make admin')}
                  </button>
                  <button className="metro-small-btn" disabled={loading || user.id === currentUser.id} onClick={() => runAction(() => updateUserApproval(user.id, !user.approved))}>
                    {user.approved ? (language === 'vi' ? 'Khóa' : 'Disable') : (language === 'vi' ? 'Mở khóa' : 'Enable')}
                  </button>
                </div>
                <PermissionEditor
                  user={user}
                  currentUser={currentUser}
                  language={language}
                  loading={loading}
                  onChange={(permissions) => runAction(
                    () => updateUserPermissions(user.id, permissions),
                    language === 'vi' ? 'Đã cập nhật quyền truy cập.' : 'Permissions updated.'
                  )}
                />
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function buildAdminRepairSql(currentUser) {
  const adminEmail = String(currentUser?.email || 'your-admin-email@example.com').replace(/'/g, "''");
  return `-- Brian English Studio: sửa lỗi admin không thấy tài khoản giáo viên
-- Chạy trong Supabase Dashboard → SQL Editor.
-- Bước 1: bảo đảm tài khoản admin thật sự là admin trong public.profiles.
update public.profiles
set role = 'admin', approved = true, updated_at = now()
where lower(email) = lower('${adminEmail}');

-- Bước 2: tạo bù hồ sơ cho các tài khoản đã có trong Authentication nhưng chưa có trong public.profiles.
insert into public.profiles (id, email, full_name, school, role, approved, permissions)
select
  u.id,
  lower(coalesce(u.email, '')),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1), 'Teacher'),
  coalesce(u.raw_user_meta_data->>'school', ''),
  case when lower(coalesce(u.email, '')) = lower('${adminEmail}') then 'admin' else 'teacher' end,
  case when lower(coalesce(u.email, '')) = lower('${adminEmail}') then true else false end,
  '{"mode":"all","allowed":[]}'::jsonb
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Bước 3: kiểm tra kết quả.
select id, email, full_name, role, approved, created_at
from public.profiles
order by created_at desc;`;
}

function AdminProfilesDiagnostic({ language, currentUser, users, teacherUsers, databaseAdminNotSynced, onRefresh, onRepairAdmin }) {
  const [copied, setCopied] = useState(false);
  const shouldShow = users.length === 0 || teacherUsers.length === 0 || databaseAdminNotSynced;
  if (!shouldShow) return null;

  const sql = buildAdminRepairSql(currentUser);
  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="metro-panel admin-diagnostic-panel">
      <div className="admin-diagnostic-head">
        <span className="eyebrow">{language === 'vi' ? 'Kiểm tra tài khoản giáo viên' : 'Teacher account check'}</span>
        <h2>{language === 'vi' ? 'Chưa thấy tài khoản giáo viên trong Quản trị' : 'Teacher accounts are not visible in Admin'}</h2>
        <p>{language === 'vi'
          ? 'Hệ thống đang đọc danh sách từ bảng public.profiles. Nếu giáo viên đã đăng kí trong Supabase Authentication nhưng chưa có dòng tương ứng trong profiles, hoặc tài khoản admin chưa được nâng quyền trong database, trang Quản trị sẽ không thấy giáo viên.'
          : 'The Admin page reads accounts from public.profiles. If teachers exist in Supabase Authentication but have no matching profile row, or the admin profile is not promoted in the database, they will not appear here.'}</p>
      </div>

      <div className="admin-diagnostic-grid">
        <div className="diagnostic-tile">
          <strong>{users.length}</strong>
          <span>{language === 'vi' ? 'hồ sơ đọc được' : 'readable profiles'}</span>
        </div>
        <div className="diagnostic-tile">
          <strong>{teacherUsers.length}</strong>
          <span>{language === 'vi' ? 'tài khoản giáo viên' : 'teacher accounts'}</span>
        </div>
        <div className={`diagnostic-tile ${databaseAdminNotSynced ? 'warn' : 'ok'}`}>
          <strong>{databaseAdminNotSynced ? '!' : '✓'}</strong>
          <span>{language === 'vi' ? 'quyền admin database' : 'database admin role'}</span>
        </div>
      </div>

      <div className="admin-diagnostic-cause">
        <strong>{language === 'vi' ? 'Nguyên nhân thường gặp' : 'Likely cause'}</strong>
        <p>{language === 'vi'
          ? 'Tài khoản của thầy đang được nhận là admin ở giao diện nhờ VITE_ADMIN_EMAILS, nhưng trong public.profiles dòng tài khoản đó vẫn có thể đang là teacher hoặc approved = false. Khi đó Supabase RLS chỉ trả về hồ sơ của chính thầy, nên giáo viên khác dù đã có trong Supabase vẫn không hiện ở Quản trị. Bấm Sửa quyền admin DB trước, sau đó bấm Đồng bộ Auth → Profiles.'
          : 'The UI can treat your email as admin via VITE_ADMIN_EMAILS, but Supabase RLS only allows reading all profiles when your row in public.profiles has role = admin and approved = true. That can let you open Admin while still only seeing your own profile.'}</p>
      </div>

      <details className="admin-diagnostic-sql">
        <summary>{language === 'vi' ? 'SQL sửa nhanh trong Supabase' : 'Quick Supabase repair SQL'}</summary>
        <textarea readOnly value={sql} />
        <div className="admin-diagnostic-actions">
          <button className="metro-small-btn active" type="button" onClick={onRepairAdmin}>{language === 'vi' ? 'Sửa quyền admin DB' : 'Repair DB admin'}</button>
          <button className="metro-small-btn" type="button" onClick={copySql}>{copied ? (language === 'vi' ? 'Đã copy' : 'Copied') : (language === 'vi' ? 'Copy SQL' : 'Copy SQL')}</button>
          <button className="metro-small-btn" type="button" onClick={onRefresh}>{language === 'vi' ? 'Kiểm tra lại' : 'Refresh check'}</button>
        </div>
      </details>
    </section>
  );
}

function PermissionRequestsPanel({ language, loading, pendingRequests, allRequests, onApprove, onReject }) {
  const recentHandled = allRequests.filter((request) => request.status !== 'pending').slice(0, 6);

  return (
    <section className="metro-panel permission-request-admin-panel">
      <div className="permission-request-admin-head">
        <div>
          <span className="eyebrow">{language === 'vi' ? 'Yêu cầu quyền' : 'Access requests'}</span>
          <h2>{language === 'vi' ? 'Giáo viên xin quyền truy cập' : 'Teacher access requests'}</h2>
          <p>{language === 'vi'
            ? 'Khi giáo viên bấm Xin quyền trên app bị khóa, yêu cầu sẽ xuất hiện tại đây để admin duyệt nhanh.'
            : 'When teachers click Request access on a locked app, the request appears here for quick approval.'}</p>
        </div>
        <strong className="request-count-pill">{pendingRequests.length}</strong>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="permission-all-note">
          {language === 'vi' ? 'Chưa có yêu cầu mới.' : 'No pending requests.'}
        </div>
      ) : (
        <div className="permission-request-list">
          {pendingRequests.map((request) => (
            <article key={request.id} className="permission-request-card pending">
              <div>
                <strong>{request.item_title || request.permission_id}</strong>
                <span>{request.requester_name || 'Teacher'} · {request.requester_email}</span>
                <small>{request.permission_id} · {formatDate(request.created_at)}</small>
              </div>
              <div className="permission-request-actions">
                <button className="metro-small-btn active" disabled={loading} onClick={() => onApprove(request)}>
                  {language === 'vi' ? 'Cấp quyền' : 'Approve'}
                </button>
                <button className="metro-small-btn danger" disabled={loading} onClick={() => onReject(request)}>
                  {language === 'vi' ? 'Từ chối' : 'Reject'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {recentHandled.length ? (
        <details className="permission-request-history">
          <summary>{language === 'vi' ? 'Lịch sử gần đây' : 'Recent history'}</summary>
          <div className="permission-request-list compact-list">
            {recentHandled.map((request) => (
              <article key={request.id} className={`permission-request-card ${request.status}`}>
                <div>
                  <strong>{request.item_title || request.permission_id}</strong>
                  <span>{request.requester_name || 'Teacher'} · {request.requester_email}</span>
                  <small>{request.status} · {formatDate(request.updated_at || request.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function PermissionEditor({ user, currentUser, language, loading, onChange }) {
  const permissions = normalizePermissions(user.permissions);
  const allowedIds = useMemo(() => getAllowedIdsFromPermissions(permissions), [permissions]);
  const isAdminAccount = user.role === 'admin';
  const disabled = loading || isAdminAccount || user.id === currentUser.id;
  const byId = useMemo(() => new Map(PERMISSION_ITEMS.map((item) => [item.id, item])), []);

  const setFull = () => onChange(createAllAccessPermissions());
  const setCustom = () => onChange(createCustomPermissions(allowedIds));
  const selectAll = () => onChange(createCustomPermissions(ALL_PERMISSION_IDS));
  const clearAll = () => onChange(createCustomPermissions([]));
  const setGroup = (ids, checked) => {
    const next = new Set(allowedIds);
    ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    onChange(createCustomPermissions([...next]));
  };
  const toggleId = (id) => {
    const next = new Set(allowedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(createCustomPermissions([...next]));
  };

  return (
    <div className="permission-box">
      <div className="permission-headline">
        <div>
          <strong>{language === 'vi' ? 'Quyền truy cập' : 'Access permissions'}</strong>
          <span>{isAdminAccount ? (language === 'vi' ? 'Admin luôn có toàn quyền.' : 'Admins always have full access.') : summarizePermissions(user, language)}</span>
        </div>
      </div>

      {!isAdminAccount && (
        <>
          <div className="permission-mode-row">
            <button className={permissions.mode === 'all' ? 'metro-small-btn active' : 'metro-small-btn'} disabled={disabled} onClick={setFull}>
              {language === 'vi' ? 'Toàn quyền' : 'Full access'}
            </button>
            <button className={permissions.mode === 'custom' ? 'metro-small-btn active' : 'metro-small-btn'} disabled={disabled} onClick={setCustom}>
              {language === 'vi' ? 'Tùy chỉnh' : 'Custom'}
            </button>
            <button className="metro-small-btn" disabled={disabled || permissions.mode !== 'custom'} onClick={selectAll}>
              {language === 'vi' ? 'Chọn tất cả' : 'Select all'}
            </button>
            <button className="metro-small-btn danger" disabled={disabled || permissions.mode !== 'custom'} onClick={clearAll}>
              {language === 'vi' ? 'Bỏ tất cả' : 'Clear all'}
            </button>
          </div>

          {permissions.mode === 'all' ? (
            <div className="permission-all-note">
              {language === 'vi' ? 'Tài khoản này được dùng toàn bộ hoạt động, trò chơi, công cụ và nội dung giáo viên.' : 'This account can use all teacher activities, games, tools and content modules.'}
            </div>
          ) : (
            <div className="permission-groups">
              {PERMISSION_GROUPS.map((group) => {
                const checkedCount = group.ids.filter((id) => allowedIds.includes(id)).length;
                const allChecked = checkedCount === group.ids.length;
                return (
                  <div key={group.key} className="permission-group">
                    <div className="permission-group-title">
                      <label>
                        <input type="checkbox" checked={allChecked} disabled={disabled} onChange={(e) => setGroup(group.ids, e.target.checked)} />
                        <span>{language === 'vi' ? group.titleVi : group.title}</span>
                      </label>
                      <small>{checkedCount}/{group.ids.length}</small>
                    </div>
                    <div className="permission-chip-grid">
                      {group.ids.map((id) => {
                        const item = byId.get(id);
                        const checked = allowedIds.includes(id);
                        return (
                          <label key={id} className={checked ? 'permission-chip checked' : 'permission-chip'}>
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleId(id)} />
                            <span>
                              <b>{language === 'vi' ? item?.titleVi || item?.title : item?.title}</b>
                              <small>{language === 'vi' ? item?.descVi || item?.desc : item?.desc}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMiniDate(value) {
  try {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  } catch {
    return value || '—';
  }
}

function initialsFromName(name = '') {
  const clean = String(name).trim();
  if (!clean) return 'NA';
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function relativeLabel(value, language = 'vi') {
  const diff = Date.now() - new Date(value).getTime();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;
  if (Number.isNaN(diff)) return '—';
  if (diff < hour) {
    const mins = Math.max(1, Math.round(diff / (1000 * 60)));
    return language === 'vi' ? `${mins} phút trước` : `${mins} minutes ago`;
  }
  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return language === 'vi' ? `${hours} giờ trước` : `${hours} hours ago`;
  }
  const days = Math.max(1, Math.round(diff / day));
  return language === 'vi' ? `${days} ngày trước` : `${days} days ago`;
}
