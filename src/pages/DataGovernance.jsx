import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { diagnoseRuntime } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, formatDate, isLeader } from './v1093/shared.js';
import {
  createBackupSnapshot,
  loadGovernanceState,
  loadPeople,
  permanentlyDeleteEntity,
  restoreBackupSnapshot,
  restoreDeletedEntity,
  savePermissionOverride,
  subscribeGovernance,
} from '../utils/collaborationGovernance.js';

const SCOPE_OPTIONS = [
  ['collaboration', 'Không gian cộng tác'], ['work', 'Trung tâm công việc'], ['knowledge', 'Kho học liệu'],
  ['assessment', 'Ngân hàng câu hỏi'], ['automation', 'Tự động hóa'],
];
const PERMISSION_LEVELS = [['viewer', 'Chỉ xem'], ['commenter', 'Bình luận'], ['editor', 'Chỉnh sửa'], ['manager', 'Quản lý']];

export default function DataGovernance({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const leader = isLeader(currentUser);
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState({ audit: [], snapshots: [], deleted: [], permissions: [], mode: 'local' });
  const [people, setPeople] = useState([]);
  const [runtimeReport, setRuntimeReport] = useState(null);
  const [query, setQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState('all');
  const [snapshotDraft, setSnapshotDraft] = useState({ label: '', scope: 'collaboration', retention_days: 30 });
  const [permissionDraft, setPermissionDraft] = useState({ resource_type: 'collaboration_space', resource_id: '', principal_type: 'user', principal_id: '', permission_level: 'viewer', expires_at: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restorePreview, setRestorePreview] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [next, profiles, diagnostic] = await Promise.all([loadGovernanceState(currentUser), loadPeople(), diagnoseRuntime()]);
      setState(next); setPeople(profiles); setRuntimeReport(diagnostic);
    } catch (loadError) { setError(loadError?.message || String(loadError)); }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeGovernance(currentUser, load), [currentUser?.id, load]);

  const run = async (operation, message) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); setNotice(message); await load(); }
    catch (actionError) { setError(actionError?.message || String(actionError)); }
    finally { setBusy(false); }
  };

  const activeDeleted = state.deleted.filter((item) => item.status === 'deleted');
  const metrics = useMemo(() => ({
    audit24h: state.audit.filter((item) => Date.now() - new Date(item.created_at).getTime() <= 86400000).length,
    snapshots: state.snapshots.filter((item) => item.status !== 'expired').length,
    deleted: activeDeleted.length,
    permissions: state.permissions.filter((item) => !item.expires_at || new Date(item.expires_at) > new Date()).length,
  }), [state]);

  const auditActions = useMemo(() => Array.from(new Set(state.audit.map((item) => item.action).filter(Boolean))).sort(), [state.audit]);
  const filteredAudit = useMemo(() => state.audit.filter((item) => {
    if (auditFilter !== 'all' && item.action !== auditFilter) return false;
    const text = `${item.action} ${item.entity_type} ${item.entity_id} ${item.actor_email} ${item.source_module}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [state.audit, auditFilter, query]);
  const filteredDeleted = useMemo(() => activeDeleted.filter((item) => `${item.title} ${item.entity_type} ${item.source_module}`.toLowerCase().includes(query.trim().toLowerCase())), [activeDeleted, query]);

  const createSnapshot = (event) => {
    event.preventDefault();
    if (!leader) return;
    run(async () => {
      await createBackupSnapshot(snapshotDraft, currentUser);
      setSnapshotDraft({ label: '', scope: 'collaboration', retention_days: 30 });
    }, 'Đã tạo snapshot dữ liệu.');
  };

  const restoreSnapshot = (snapshot) => run(async () => {
    await restoreBackupSnapshot(snapshot, currentUser);
    setRestorePreview(null);
  }, 'Đã khôi phục snapshot trong phạm vi hỗ trợ.');

  const savePermission = (event) => {
    event.preventDefault();
    if (!permissionDraft.resource_id.trim() || !permissionDraft.principal_id.trim()) return;
    run(async () => {
      await savePermissionOverride({ ...permissionDraft, expires_at: permissionDraft.expires_at ? new Date(permissionDraft.expires_at).toISOString() : null }, currentUser);
      setPermissionDraft({ resource_type: 'collaboration_space', resource_id: '', principal_type: 'user', principal_id: '', permission_level: 'viewer', expires_at: '' });
    }, 'Đã lưu quyền ngoại lệ.');
  };

  const exportReport = () => downloadText(`data-governance-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported_at: new Date().toISOString(), runtime: runtimeReport, ...state }, null, 2), 'application/json');

  return <section className="v1098-page v1098-governance">
    <header className="v1098-hero governance">
      <div><span>DATA GOVERNANCE · V10.98</span><h1>Quản trị dữ liệu & tuân thủ</h1><p>Audit log, quyền ngoại lệ, snapshot, khôi phục và thùng rác 30 ngày cho toàn hệ thống.</p></div>
      <div className="v1098-hero-actions"><button onClick={load}>Làm mới</button><button onClick={exportReport}>Xuất báo cáo</button></div>
    </header>

    {error && <div className="v1098-alert error"><b>!</b><span>{error}</span><button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="v1098-alert success"><b>✓</b><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

    <div className="v1098-metrics"><article><strong>{metrics.audit24h}</strong><span>Sự kiện 24 giờ</span></article><article><strong>{metrics.snapshots}</strong><span>Snapshot đang giữ</span></article><article><strong>{metrics.deleted}</strong><span>Mục trong thùng rác</span></article><article><strong>{metrics.permissions}</strong><span>Quyền ngoại lệ</span></article></div>

    <nav className="v1098-tabs">{[['overview', 'Tổng quan'], ['audit', 'Audit log'], ['backups', 'Backup & Restore'], ['trash', 'Thùng rác'], ['permissions', 'Ma trận quyền']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === 'overview' && <div className="v1098-governance-grid">
      <section className="v1098-panel"><header><div><span>RUNTIME</span><h2>Trạng thái nền tảng</h2></div><em data-ok={runtime.ready}>{runtime.ready ? 'Sẵn sàng' : 'Đang kết nối'}</em></header><div className="v1098-status-list"><article><b>Runtime Core</b><span>{runtimeReport?.runtimeVersion || '—'}</span></article><article><b>Vai trò</b><span>{runtime.role}</span></article><article><b>Supabase</b><span>{runtimeReport?.configured ? 'Đã cấu hình' : 'Chưa cấu hình'}</span></article><article><b>Realtime channels</b><span>{runtimeReport?.realtimeChannels ?? 0}</span></article><article><b>Chế độ dữ liệu</b><span>{state.mode === 'cloud' ? 'Cloud' : 'Local fallback'}</span></article></div></section>
      <section className="v1098-panel"><header><div><span>CHÍNH SÁCH</span><h2>Bảo vệ dữ liệu</h2></div></header><div className="v1098-policy-list"><article><i>30</i><div><b>Thời gian giữ thùng rác</b><span>Dữ liệu xóa mềm được giữ 30 ngày trước khi xóa vĩnh viễn.</span></div></article><article><i>RLS</i><div><b>Phân quyền tại database</b><span>Không gian, audit, snapshot và thùng rác tuân theo vai trò và thành viên.</span></div></article><article><i>APP</i><div><b>Khôi phục có xác nhận</b><span>Snapshot chỉ được khôi phục sau bước xem trước và xác nhận của Admin/TTCM.</span></div></article></div></section>
      <section className="v1098-panel wide"><header><div><span>HOẠT ĐỘNG GẦN ĐÂY</span><h2>Dòng thời gian toàn hệ thống</h2></div></header><div className="v1098-audit-list compact">{state.audit.slice(0, 12).map((item) => <article key={item.id}><i>{String(item.action || 'A').slice(0, 2).toUpperCase()}</i><div><b>{item.action}</b><span>{item.actor_email || item.actor_role || 'Hệ thống'} · {item.source_module}</span></div><time>{formatDate(item.created_at)}</time></article>)}</div></section>
    </div>}

    {tab === 'audit' && <section className="v1098-panel"><header><div><span>IMMUTABLE LOG</span><h2>{filteredAudit.length} sự kiện</h2></div><div className="v1098-filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm hành động, người dùng, module…" /><select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}><option value="all">Mọi hành động</option>{auditActions.map((action) => <option key={action} value={action}>{action}</option>)}</select></div></header><div className="v1098-audit-table"><div className="head"><b>Thời gian</b><b>Người thực hiện</b><b>Hành động</b><b>Đối tượng</b><b>Module</b></div>{filteredAudit.map((item) => <article key={item.id}><time>{formatDate(item.created_at)}</time><span>{item.actor_email || item.actor_role || 'Hệ thống'}</span><strong>{item.action}</strong><span>{item.entity_type} · {item.entity_id || '—'}</span><span>{item.source_module}</span></article>)}</div></section>}

    {tab === 'backups' && <div className="v1098-backup-layout">
      {leader && <form className="v1098-panel v1098-backup-form" onSubmit={createSnapshot}><header><div><span>SNAPSHOT</span><h2>Tạo bản sao lưu</h2></div></header><label>Tên snapshot<input value={snapshotDraft.label} onChange={(e) => setSnapshotDraft({ ...snapshotDraft, label: e.target.value })} placeholder="Ví dụ: Trước khi cập nhật học liệu" /></label><label>Phạm vi<select value={snapshotDraft.scope} onChange={(e) => setSnapshotDraft({ ...snapshotDraft, scope: e.target.value })}>{SCOPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Giữ trong<select value={snapshotDraft.retention_days} onChange={(e) => setSnapshotDraft({ ...snapshotDraft, retention_days: Number(e.target.value) })}><option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option></select></label><button disabled={busy}>Tạo snapshot</button></form>}
      <section className="v1098-panel v1098-snapshot-list"><header><div><span>BACKUP HISTORY</span><h2>{state.snapshots.length} snapshot</h2></div></header>{state.snapshots.map((snapshot) => <article key={snapshot.id}><div><b>{snapshot.label}</b><span>{SCOPE_OPTIONS.find(([value]) => value === snapshot.scope)?.[1] || snapshot.scope} · {snapshot.item_count || 0} bản ghi</span><small>Tạo: {formatDate(snapshot.created_at)} · Hết hạn: {formatDate(snapshot.expires_at)}</small></div>{leader && <button onClick={() => setRestorePreview(snapshot)}>Xem & khôi phục</button>}</article>)}</section>
    </div>}

    {tab === 'trash' && <section className="v1098-panel"><header><div><span>30-DAY RECOVERY</span><h2>{filteredDeleted.length} mục có thể khôi phục</h2></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm trong thùng rác…" /></header><div className="v1098-trash-list">{filteredDeleted.map((item) => <article key={item.id}><i>{String(item.entity_type || 'IT').slice(0, 2).toUpperCase()}</i><div><b>{item.title || item.entity_id}</b><span>{item.source_module} · Xóa lúc {formatDate(item.created_at)}</span><small>Giữ đến {formatDate(item.expires_at)}</small></div><button disabled={busy} onClick={() => run(() => restoreDeletedEntity(item, currentUser), `Đã khôi phục “${item.title}”.`)}>Khôi phục</button>{leader && <button className="danger" disabled={busy} onClick={() => { if (window.confirm('Xóa vĩnh viễn mục này?')) run(() => permanentlyDeleteEntity(item, currentUser), 'Đã đánh dấu xóa vĩnh viễn.'); }}>Xóa vĩnh viễn</button>}</article>)}</div></section>}

    {tab === 'permissions' && <div className="v1098-permission-layout">
      {leader && <form className="v1098-panel" onSubmit={savePermission}><header><div><span>OVERRIDE</span><h2>Cấp quyền ngoại lệ</h2></div></header><label>Loại tài nguyên<select value={permissionDraft.resource_type} onChange={(e) => setPermissionDraft({ ...permissionDraft, resource_type: e.target.value })}><option value="collaboration_space">Không gian cộng tác</option><option value="resource_item">Tài liệu</option><option value="work_hub_item">Công việc</option><option value="assessment_test">Đề kiểm tra</option></select></label><label>ID tài nguyên<input value={permissionDraft.resource_id} onChange={(e) => setPermissionDraft({ ...permissionDraft, resource_id: e.target.value })} placeholder="UUID hoặc mã tài nguyên" /></label><label>Người dùng<select value={permissionDraft.principal_id} onChange={(e) => setPermissionDraft({ ...permissionDraft, principal_id: e.target.value })}><option value="">Chọn tài khoản…</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label><label>Mức quyền<select value={permissionDraft.permission_level} onChange={(e) => setPermissionDraft({ ...permissionDraft, permission_level: e.target.value })}>{PERMISSION_LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Hết hạn<input type="datetime-local" value={permissionDraft.expires_at} onChange={(e) => setPermissionDraft({ ...permissionDraft, expires_at: e.target.value })} /></label><button disabled={busy || !permissionDraft.resource_id || !permissionDraft.principal_id}>Lưu quyền</button></form>}
      <section className="v1098-panel"><header><div><span>ACTIVE MATRIX</span><h2>{state.permissions.length} quyền ngoại lệ</h2></div></header><div className="v1098-permission-list">{state.permissions.map((item) => <article key={item.id}><div><b>{item.resource_type} · {item.resource_id}</b><span>{people.find((person) => person.id === item.principal_id)?.name || item.principal_id}</span></div><strong>{PERMISSION_LEVELS.find(([value]) => value === item.permission_level)?.[1] || item.permission_level}</strong><small>{item.expires_at ? `Hết hạn ${formatDate(item.expires_at)}` : 'Không hết hạn'}</small></article>)}</div></section>
    </div>}

    {restorePreview && <div className="v1098-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setRestorePreview(null); }}><section className="v1098-modal"><button className="close" onClick={() => setRestorePreview(null)}>×</button><span>RESTORE PREVIEW</span><h2>{restorePreview.label}</h2><p>Snapshot chứa <b>{restorePreview.item_count || 0}</b> bản ghi trong phạm vi <b>{restorePreview.scope}</b>.</p><div className="v1098-restore-summary">{Object.entries(restorePreview.snapshot_data || {}).map(([table, rows]) => <article key={table}><b>{table}</b><span>{Array.isArray(rows) ? rows.length : 0} bản ghi</span></article>)}</div><div className="v1098-modal-actions"><button onClick={() => setRestorePreview(null)}>Hủy</button><button className="primary" disabled={busy} onClick={() => restoreSnapshot(restorePreview)}>Xác nhận khôi phục</button></div></section></div>}
  </section>;
}
