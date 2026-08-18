import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2SearchBox } from './B2UI.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { V2_PREVIEW_ROLES } from '../previewPermissions.js';
import { useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2GlobalOverlays.css';

const BASE_COMMANDS = [
  { id: 'home', label: 'Trang chủ', group: 'Điều hướng', icon: '⌂' },
  { id: 'apps', label: 'Ứng dụng', group: 'Điều hướng', icon: '▦' },
  { id: 'teaching-tools', label: 'Teaching tools', group: 'Dạy học', icon: '◫' },
  { id: 'resources', label: 'Kho học liệu', group: 'Dạy học', icon: '▤' },
  { id: 'knowledge-hub', label: 'Knowledge Hub', group: 'Dạy học', icon: '⌕' },
  { id: 'news', label: 'News & Reading', group: 'Dạy học', icon: '▥' },
  { id: 'games', label: 'Trò chơi', group: 'Dạy học', icon: '▶' },
  { id: 'homeroom', label: 'Chủ nhiệm', group: 'Quản lý', icon: '◎' },
  { id: 'classes', label: 'Lớp học', group: 'Quản lý', icon: '♙' },
  { id: 'students', label: 'Học sinh', group: 'Quản lý', icon: '▥' },
  { id: 'dashboard', label: 'Dashboard', group: 'Công việc', icon: '◧' },
  { id: 'work-hub', label: 'Work Hub', group: 'Công việc', icon: '◷' },
  { id: 'assessment', label: 'Assessment', group: 'Công việc', icon: '◇' },
  { id: 'collaboration', label: 'Cộng tác', group: 'Công việc', icon: '∞' },
  { id: 'reports', label: 'Báo cáo', group: 'Công việc', icon: '▱' },
  { id: 'settings', label: 'Cài đặt', group: 'Hệ thống', icon: '⚙' },
  { id: 'admin', label: 'Quản trị', group: 'Hệ thống', icon: '◇' },
  { id: 'cloud', label: 'Cloud & Data', group: 'Hệ thống', icon: '☁' },
  { id: 'ui-lab', label: 'UI Lab', group: 'Hệ thống', icon: '◈' },
  { id: 'release-gate', label: 'Release Gate', group: 'Hệ thống', icon: '✓' },
];

const TOOL_COMMANDS = Object.entries(V2_TOOL_BRIDGE)
  .filter(([, meta]) => meta.tested)
  .map(([slug, meta]) => ({
    id: `tool/${slug}`,
    label: meta.label,
    group: meta.family === 'game' ? 'Trò chơi · Tool Shell' : 'Ứng dụng · Tool Shell',
    icon: String(meta.label || slug).slice(0, 2).toUpperCase(),
  }));

const COMMANDS = [...BASE_COMMANDS, ...TOOL_COMMANDS];

export function B2CommandPalette({ open, onClose, onNavigate, canOpen = () => true }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = COMMANDS.filter((item) => canOpen(item.id));
    return q ? allowed.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(q)) : allowed;
  }, [query, canOpen]);
  if (!open) return null;
  return (
    <div className="b2-global-scrim" role="presentation" onMouseDown={onClose}>
      <section className="b2-command-palette" role="dialog" aria-modal="true" aria-label="Tìm kiếm nhanh" onMouseDown={(event) => event.stopPropagation()}>
        <header><span>⌕</span><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm trang, công cụ, lớp học…" /><kbd>ESC</kbd></header>
        <div className="b2-command-palette__list">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => { onNavigate?.(item.id); onClose?.(); }}>
              <span className="b2-command-palette__icon">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.group}</small></span>
              <em>↵</em>
            </button>
          ))}
          {!items.length ? <div className="b2-command-palette__empty">Không có mục phù hợp trong quyền hiện tại.</div> : null}
        </div>
        <footer><span>Gõ để lọc</span><span>↵ mở</span><span>ESC đóng</span></footer>
      </section>
    </div>
  );
}

function noticeTitle(item) {
  return item?.title || item?.message || item?.subject || item?.type || 'Thông báo Brian';
}
function noticeMeta(item) {
  const rawDate = item?.created_at || item?.createdAt || item?.updated_at || item?.updatedAt || '';
  const source = item?.source || item?.sourceLabel || item?.source_module || '';
  let dateLabel = '';
  if (rawDate) {
    const date = new Date(rawDate);
    dateLabel = Number.isNaN(date.getTime()) ? String(rawDate) : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }
  return [source, dateLabel].filter(Boolean).join(' · ');
}

export function B2NotificationCenter({ open, onClose }) {
  const { dashboard } = useBrianV2Data();
  const notices = Array.isArray(dashboard?.notifications) ? dashboard.notifications : [];
  if (!open) return null;
  return (
    <div className="b2-flyout b2-flyout--notifications">
      <header><div><span>THÔNG BÁO</span><strong>Brian</strong></div><B2Badge tone={notices.length ? 'blue' : 'green'}>{notices.length} mục</B2Badge></header>
      <div className="b2-notification-list">
        {notices.slice(0, 8).map((notice, index) => (
          <button type="button" key={notice.id || `${noticeTitle(notice)}-${index}`}>
            <i className="tone-blue" />
            <span><strong>{noticeTitle(notice)}</strong><small>{noticeMeta(notice) || 'Thông báo từ hệ thống hiện tại'}</small></span>
          </button>
        ))}
        {!notices.length ? <div className="b2-command-palette__empty">Không có thông báo trong snapshot hiện tại.</div> : null}
      </div>
      <footer><B2Button variant="ghost" onClick={onClose}>Đóng</B2Button><B2Button variant="ghost" onClick={() => window.open('/#/dashboard', '_blank', 'noopener,noreferrer')}>Dashboard V1 →</B2Button></footer>
    </div>
  );
}

function profileInitials(user) {
  const words = String(user?.name || user?.email || 'T').trim().split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || 'T'}${words.length > 1 ? words[words.length - 1]?.[0] || '' : ''}`.toUpperCase();
}

export function B2ProfileMenu({ open, onClose, onNavigate, role = 'teacher', roleMeta, onRoleChange, canOpen = () => true, currentUser = null, permissionMode = 'preview' }) {
  if (!open) return null;
  return (
    <div className="b2-flyout b2-flyout--profile">
      <div className="b2-profile-summary"><span>{profileInitials(currentUser)}</span><div><strong>{currentUser?.name || currentUser?.email || 'Shadow Preview'}</strong><small>{roleMeta?.label || 'Giáo viên'} · Brian V2</small></div></div>
      <div className="b2-profile-menu-list">
        {canOpen('settings') ? <button type="button" onClick={() => { onNavigate?.('settings'); onClose?.(); }}><span>⚙</span><strong>Cài đặt</strong></button> : null}
        {canOpen('cloud') ? <button type="button" onClick={() => { onNavigate?.('cloud'); onClose?.(); }}><span>☁</span><strong>Cloud & Data</strong><B2Badge tone="blue">ADMIN</B2Badge></button> : null}
        {canOpen('ui-lab') ? <button type="button" onClick={() => { onNavigate?.('ui-lab'); onClose?.(); }}><span>◇</span><strong>UI Lab</strong><B2Badge tone="violet">LAB</B2Badge></button> : null}
        {canOpen('release-gate') ? <button type="button" onClick={() => { onNavigate?.('release-gate'); onClose?.(); }}><span>✓</span><strong>Release Gate</strong><B2Badge tone="violet">PRIVATE</B2Badge></button> : null}
        {canOpen('admin') ? <button type="button" onClick={() => { onNavigate?.('admin'); onClose?.(); }}><span>◈</span><strong>Quản trị</strong><B2Badge tone="blue">ADMIN</B2Badge></button> : null}
        <button type="button" onClick={() => window.open('/#/', '_blank', 'noopener,noreferrer')}><span>↗</span><strong>Mở Brian V1</strong></button>
      </div>
      {permissionMode === 'preview' ? <div className="b2-profile-role-switch">
        <span>Role simulator · Shadow only</span>
        <div className="b2-profile-role-options">
          {Object.values(V2_PREVIEW_ROLES).map((item) => (
            <button key={item.id} type="button" className={role === item.id ? 'is-active' : ''} onClick={() => onRoleChange?.(item.id)}>{item.shortLabel}</button>
          ))}
        </div>
        <small className="b2-profile-role-note">Chưa có session thật nên chỉ đang kiểm thử UI.</small>
      </div> : <div className="b2-profile-role-switch">
        <span>Permission source · LIVE</span>
        <small className="b2-profile-role-note">{roleMeta?.summary || 'Quyền đang được đọc từ profile/permission service hiện tại. Shadow UI không tự thay đổi quyền.'}</small>
      </div>}
      <footer><span>Shadow UI · {permissionMode === 'real' ? 'LIVE PERMISSIONS' : roleMeta?.label || role}</span><B2Badge tone="green">PRIVATE</B2Badge></footer>
    </div>
  );
}
