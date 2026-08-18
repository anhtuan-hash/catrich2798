import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2SearchBox } from './B2UI.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { V2_PREVIEW_ROLES } from '../previewPermissions.js';
import './B2GlobalOverlays.css';

const BASE_COMMANDS = [
  { id: 'home', label: 'Trang chủ', group: 'Điều hướng', icon: '⌂' },
  { id: 'apps', label: 'Ứng dụng', group: 'Điều hướng', icon: '▦' },
  { id: 'teaching-tools', label: 'Teaching tools', group: 'Điều hướng', icon: '◫' },
  { id: 'homeroom', label: 'Chủ nhiệm 12.6', group: 'Quản lý', icon: '◎' },
  { id: 'classes', label: 'Lớp học', group: 'Quản lý', icon: '♙' },
  { id: 'students', label: 'Học sinh', group: 'Quản lý', icon: '▥' },
  { id: 'dashboard', label: 'Dashboard', group: 'Công việc', icon: '◧' },
  { id: 'reports', label: 'Báo cáo', group: 'Công việc', icon: '▱' },
  { id: 'resources', label: 'Kho học liệu', group: 'Dạy học', icon: '▤' },
  { id: 'games', label: 'Trò chơi', group: 'Dạy học', icon: '▶' },
  { id: 'settings', label: 'Cài đặt', group: 'Hệ thống', icon: '⚙' },
  { id: 'admin', label: 'Quản trị', group: 'Hệ thống', icon: '◇' },
  { id: 'ui-lab', label: 'UI Lab', group: 'Hệ thống', icon: '◈' },
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
          {!items.length ? <div className="b2-command-palette__empty">Không tìm thấy mục phù hợp trong quyền preview hiện tại.</div> : null}
        </div>
        <footer><span>Gõ để lọc</span><span>↵ mở</span><span>ESC đóng</span></footer>
      </section>
    </div>
  );
}

const NOTICES = [
  { id: 1, tone: 'blue', title: 'Kế hoạch sinh hoạt tuần 34', meta: 'Hạn hôm nay · 21:00', unread: true },
  { id: 2, tone: 'violet', title: 'Có 1 mục đang chờ duyệt', meta: 'Teaching Tool Hub · 18 phút trước', unread: true },
  { id: 3, tone: 'green', title: 'Autosave hoạt động bình thường', meta: 'Đồng bộ lần cuối lúc 21:38', unread: false },
];

export function B2NotificationCenter({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="b2-flyout b2-flyout--notifications">
      <header><div><span>THÔNG BÁO</span><strong>Hôm nay</strong></div><B2Badge tone="blue">2 mới</B2Badge></header>
      <div className="b2-notification-list">
        {NOTICES.map((notice) => (
          <button type="button" key={notice.id} className={notice.unread ? 'is-unread' : ''}>
            <i className={`tone-${notice.tone}`} />
            <span><strong>{notice.title}</strong><small>{notice.meta}</small></span>
          </button>
        ))}
      </div>
      <footer><B2Button variant="ghost" onClick={onClose}>Đóng</B2Button><B2Button variant="ghost">Xem tất cả →</B2Button></footer>
    </div>
  );
}

export function B2ProfileMenu({ open, onClose, onNavigate, role = 'teacher', roleMeta, onRoleChange, canOpen = () => true }) {
  if (!open) return null;
  return (
    <div className="b2-flyout b2-flyout--profile">
      <div className="b2-profile-summary"><span>T</span><div><strong>Nguyễn Anh Tuấn</strong><small>{roleMeta?.label || 'Giáo viên'} · Brian V2 Preview</small></div></div>
      <div className="b2-profile-menu-list">
        <button type="button" onClick={() => { onNavigate?.('settings'); onClose?.(); }}><span>⚙</span><strong>Cài đặt</strong></button>
        {canOpen('ui-lab') ? <button type="button" onClick={() => { onNavigate?.('ui-lab'); onClose?.(); }}><span>◇</span><strong>UI Lab</strong><B2Badge tone="violet">LAB</B2Badge></button> : null}
        {canOpen('admin') ? <button type="button" onClick={() => { onNavigate?.('admin'); onClose?.(); }}><span>◈</span><strong>Quản trị</strong><B2Badge tone="blue">ADMIN</B2Badge></button> : null}
        <button type="button" onClick={() => window.open('/#/', '_blank', 'noopener,noreferrer')}><span>↗</span><strong>Mở Brian V1</strong></button>
      </div>
      <div className="b2-profile-role-switch">
        <span>Role simulator · Shadow only</span>
        <div className="b2-profile-role-options">
          {Object.values(V2_PREVIEW_ROLES).map((item) => (
            <button key={item.id} type="button" className={role === item.id ? 'is-active' : ''} onClick={() => onRoleChange?.(item.id)}>{item.shortLabel}</button>
          ))}
        </div>
        <small className="b2-profile-role-note">Chỉ kiểm thử UI. Quyền V1/backend vẫn là nguồn bảo mật thật.</small>
      </div>
      <footer><span>Shadow UI · {roleMeta?.label || role}</span><B2Badge tone="green">PRIVATE</B2Badge></footer>
    </div>
  );
}
