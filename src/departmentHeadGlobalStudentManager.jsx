import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RotateCcw, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';
import { getCurrentUser } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import {
  SCHOOL_CLASS_REGISTRY_TABLE,
  deleteSchoolClassStudents,
  isDeletedSchoolStudent,
  normalizeSchoolClassRegistry,
  normalizeSchoolClassName,
  reconcileWorkspaceRoster,
  restoreSchoolClassStudents,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';
import './styles/DepartmentHeadGlobalStudentManager.css';

const HOST_ID = 'bes-department-head-global-student-manager';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';

function safeJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function safeText(value) {
  return String(value ?? '').trim();
}

function fold(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function loadLocalRegistry(user) {
  return normalizeSchoolClassRegistry(safeJson(localStorage.getItem(schoolClassRegistryStorageKey(user)), null));
}

function saveLocalRegistry(user, registry) {
  const normalized = normalizeSchoolClassRegistry(registry);
  localStorage.setItem(schoolClassRegistryStorageKey(user), JSON.stringify(normalized));
  return normalized;
}

async function loadCloudRegistry(user) {
  if (!isSupabaseConfigured || !user?.id) return null;
  const { data } = await supabase
    .from(SCHOOL_CLASS_REGISTRY_TABLE)
    .select('payload,updated_at')
    .eq('owner_id', user.id)
    .maybeSingle();
  return data?.payload ? normalizeSchoolClassRegistry(data.payload) : null;
}

async function saveCloudRegistry(user, registry) {
  if (!isSupabaseConfigured || !user?.id) return { ok: true, source: 'local' };
  const { error } = await supabase.from(SCHOOL_CLASS_REGISTRY_TABLE).upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    payload: registry,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' });
  return error ? { ok: false, warning: error.message } : { ok: true, source: 'cloud' };
}

function studentMatches(left, right) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  const leftCode = safeText(left.code).toLowerCase();
  const rightCode = safeText(right.code).toLowerCase();
  if (leftCode && rightCode && leftCode === rightCode) return true;
  return fold(left.fullName) === fold(right.fullName)
    && (!left.birthDate || !right.birthDate || left.birthDate === right.birthDate);
}

function appendWorkspaceAudit(workspace, className, affected, action, actor, createdAt) {
  const rows = affected.map((student, index) => ({
    id: `ttcm-global-student-${action}-${Date.now()}-${index}`,
    action,
    className,
    studentId: student.id,
    studentCode: student.code || '',
    studentName: student.fullName || '',
    actorId: actor?.id || '',
    actorEmail: actor?.email || '',
    createdAt,
    source: 'department-head-global-manager',
  }));
  return {
    ...workspace,
    studentDeletionAudit: [...(workspace.studentDeletionAudit || []), ...rows],
  };
}

function reconcileOneWorkspace(workspace, classItem, affected, action, actor, createdAt) {
  const reconciled = reconcileWorkspaceRoster(
    workspace,
    classItem.className,
    classItem.students || [],
    createdAt,
  );
  return appendWorkspaceAudit(reconciled, classItem.className, affected, action, actor, createdAt);
}

function syncLocalWorkspaces(classItem, affected, action, actor) {
  let changed = 0;
  const createdAt = new Date().toISOString();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
    const workspace = safeJson(localStorage.getItem(key), null);
    const className = normalizeSchoolClassName(workspace?.classProfile?.className);
    if (className !== classItem.className) continue;
    const next = reconcileOneWorkspace(workspace, classItem, affected, action, actor, createdAt);
    localStorage.setItem(key, JSON.stringify(next));
    changed += 1;
  }
  return changed;
}

async function syncCloudWorkspaces(classItem, affected, action, actor) {
  if (!isSupabaseConfigured) return { changed: 0, warning: '' };
  const { data, error } = await supabase
    .from('bes_homeroom_workspaces')
    .select('owner_id,workspace_id,payload')
    .eq('class_name', classItem.className);
  if (error) return { changed: 0, warning: error.message };

  const createdAt = new Date().toISOString();
  let changed = 0;
  const warnings = [];
  for (const row of data || []) {
    const workspace = row.payload;
    if (!workspace) continue;
    const next = reconcileOneWorkspace(workspace, classItem, affected, action, actor, createdAt);
    const result = await supabase
      .from('bes_homeroom_workspaces')
      .update({ payload: next, updated_at: createdAt })
      .eq('owner_id', row.owner_id)
      .eq('workspace_id', row.workspace_id);
    if (result.error) warnings.push(result.error.message);
    else changed += 1;
  }
  return { changed, warning: [...new Set(warnings)].join(' ') };
}

function classActiveCount(item) {
  return (item?.students || []).filter((student) => student.active !== false && !isDeletedSchoolStudent(student)).length;
}

function classDeletedCount(item) {
  return (item?.students || []).filter(isDeletedSchoolStudent).length;
}

function StudentManagerPanel() {
  const [user, setUser] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [className, setClassName] = useState('');
  const [mode, setMode] = useState('active');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      const currentUser = await getCurrentUser();
      if (!aliveRef.current || !currentUser || !isDepartmentLeaderRole(currentUser.role)) return;
      setUser(currentUser);
      const local = loadLocalRegistry(currentUser);
      const cloud = await loadCloudRegistry(currentUser).catch(() => null);
      const selectedRegistry = cloud && Date.parse(cloud.updatedAt || 0) >= Date.parse(local.updatedAt || 0) ? cloud : local;
      setRegistry(selectedRegistry);
      setClassName(selectedRegistry.classes[0]?.className || '');
    })();
    return () => { aliveRef.current = false; };
  }, []);

  const currentClass = useMemo(() => (
    registry?.classes?.find((item) => item.className === className) || null
  ), [registry, className]);

  const visibleStudents = useMemo(() => {
    const source = currentClass?.students || [];
    const normalizedQuery = fold(query);
    return source.filter((student) => {
      const deleted = isDeletedSchoolStudent(student);
      if (mode === 'deleted' ? !deleted : deleted || student.active === false) return false;
      if (!normalizedQuery) return true;
      return fold(`${student.fullName} ${student.code} ${student.birthDate}`).includes(normalizedQuery);
    });
  }, [currentClass, mode, query]);

  useEffect(() => { setSelected([]); }, [className, mode, query]);

  if (!user || !registry || !isDepartmentLeaderRole(user.role)) return null;

  const persistChange = async (nextRegistry, affected, action) => {
    const normalized = saveLocalRegistry(user, nextRegistry);
    setRegistry(normalized);
    const nextClass = normalized.classes.find((item) => item.className === className);
    const [cloudRegistry, localWorkspaceCount, cloudWorkspaceResult] = await Promise.all([
      saveCloudRegistry(user, normalized),
      Promise.resolve(syncLocalWorkspaces(nextClass, affected, action, user)),
      syncCloudWorkspaces(nextClass, affected, action, user),
    ]);
    window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated', {
      detail: { className, action, studentIds: affected.map((student) => student.id) },
    }));
    window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));

    const actionLabel = action === 'delete' ? 'xóa' : 'khôi phục';
    setMessage(
      `Đã ${actionLabel} ${affected.length} học sinh lớp ${className}. `
      + `Đã cập nhật ${localWorkspaceCount} workspace trên thiết bị và ${cloudWorkspaceResult.changed} workspace cloud đang được cấp quyền.`,
    );
    const warnings = [cloudRegistry.warning, cloudWorkspaceResult.warning].filter(Boolean);
    setWarning(warnings.length
      ? `Danh mục trung tâm đã được lưu trên thiết bị. Một số workspace cloud chưa cập nhật ngay do giới hạn quyền; giáo viên sẽ nhận thay đổi khi đồng bộ lại lớp. ${warnings.join(' ')}`
      : 'Điểm, rèn luyện và điểm danh không bị xóa; học sinh có thể được khôi phục từ mục Đã xóa.');
  };

  const deleteSelected = async () => {
    const ids = new Set(selected);
    const affected = (currentClass.students || []).filter((student) => ids.has(student.id) && !isDeletedSchoolStudent(student));
    if (!affected.length) return;
    const names = affected.slice(0, 6).map((student) => student.fullName).join(', ');
    const remaining = Math.max(0, affected.length - 6);
    const confirmed = window.confirm(
      `TTCM xóa ${affected.length} học sinh khỏi lớp ${className}?\n\n`
      + names + (remaining ? ` và ${remaining} học sinh khác` : '')
      + '\n\nHọc sinh sẽ bị ẩn khỏi danh sách đang học ở mọi workspace có quyền đồng bộ. Điểm, rèn luyện và điểm danh vẫn được giữ để khôi phục.',
    );
    if (!confirmed) return;
    setBusy(true);
    setMessage('Đang xóa học sinh và đồng bộ toàn trường…');
    setWarning('');
    try {
      const next = deleteSchoolClassStudents(registry, className, affected.map((student) => student.id), user);
      await persistChange(next, affected, 'delete');
      setSelected([]);
    } catch (error) {
      setWarning(error?.message || 'Không thể xóa học sinh toàn trường.');
    } finally {
      setBusy(false);
    }
  };

  const restoreSelected = async () => {
    const ids = new Set(selected);
    const affected = (currentClass.students || []).filter((student) => ids.has(student.id) && isDeletedSchoolStudent(student));
    if (!affected.length) return;
    if (!window.confirm(`Khôi phục ${affected.length} học sinh trở lại lớp ${className}?`)) return;
    setBusy(true);
    setMessage('Đang khôi phục học sinh và đồng bộ toàn trường…');
    setWarning('');
    try {
      const next = restoreSchoolClassStudents(registry, className, affected.map((student) => student.id), user);
      await persistChange(next, affected, 'restore');
      setSelected([]);
    } catch (error) {
      setWarning(error?.message || 'Không thể khôi phục học sinh.');
    } finally {
      setBusy(false);
    }
  };

  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((student) => selected.includes(student.id));
  const toggleAll = () => {
    if (allVisibleSelected) setSelected((current) => current.filter((id) => !visibleStudents.some((student) => student.id === id)));
    else setSelected((current) => [...new Set([...current, ...visibleStudents.map((student) => student.id)])]);
  };

  return (
    <section className="dhsm-shell" aria-label="Quản lý học sinh toàn trường cho TTCM">
      <header className="dhsm-header">
        <div>
          <span><ShieldCheck /> QUYỀN TTCM</span>
          <h2>Xóa học sinh ở tất cả 27 lớp</h2>
          <p>TTCM được chọn bất kỳ lớp nào, xóa nhanh nhiều học sinh và khôi phục khi cần. Dữ liệu điểm không bị xóa.</p>
        </div>
        <button type="button" className="dhsm-open" onClick={() => setOpen(true)}><UsersRound /> Quản lý học sinh toàn trường</button>
      </header>

      {message ? <div className="dhsm-message">{message}</div> : null}
      {warning ? <div className="dhsm-warning">{warning}</div> : null}

      {open ? <div className="dhsm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
        <section className="dhsm-dialog" role="dialog" aria-modal="true" aria-label="Quản lý học sinh toàn trường">
          <header>
            <div><span>QUẢN LÝ TOÀN TRƯỜNG</span><h3>Lớp {className}</h3></div>
            <button type="button" className="dhsm-close" disabled={busy} onClick={() => setOpen(false)} aria-label="Đóng"><X /></button>
          </header>

          <div className="dhsm-controls">
            <label><span>Lớp</span><select value={className} disabled={busy} onChange={(event) => setClassName(event.target.value)}>
              {registry.classes.map((item) => <option key={item.className} value={item.className}>
                {item.className} · {classActiveCount(item)} đang học · {classDeletedCount(item)} đã xóa
              </option>)}
            </select></label>
            <label className="dhsm-search"><Search /><input value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo họ tên, mã học sinh…" /></label>
          </div>

          <div className="dhsm-tabs">
            <button type="button" className={mode === 'active' ? 'is-active' : ''} onClick={() => setMode('active')}>Đang học ({classActiveCount(currentClass)})</button>
            <button type="button" className={mode === 'deleted' ? 'is-active' : ''} onClick={() => setMode('deleted')}>Đã xóa ({classDeletedCount(currentClass)})</button>
          </div>

          <div className="dhsm-bulk">
            <label><input type="checkbox" checked={allVisibleSelected} disabled={!visibleStudents.length || busy} onChange={toggleAll} /> Chọn tất cả đang hiển thị</label>
            <span>Đã chọn <b>{selected.length}</b></span>
            <button type="button" disabled={!selected.length || busy} onClick={() => setSelected([])}>Bỏ chọn</button>
            {mode === 'active'
              ? <button type="button" className="danger" disabled={!selected.length || busy} onClick={deleteSelected}><Trash2 /> Xóa nhanh {selected.length ? `(${selected.length})` : ''}</button>
              : <button type="button" className="restore" disabled={!selected.length || busy} onClick={restoreSelected}><RotateCcw /> Khôi phục {selected.length ? `(${selected.length})` : ''}</button>}
          </div>

          <div className="dhsm-table-wrap">
            <table className="dhsm-table">
              <thead><tr><th>Chọn</th><th>Học sinh</th><th>Mã HS</th><th>Ngày sinh</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {visibleStudents.map((student) => <tr key={student.id} className={selected.includes(student.id) ? 'is-selected' : ''}>
                  <td><input type="checkbox" checked={selected.includes(student.id)} disabled={busy} onChange={() => setSelected((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /></td>
                  <td><b>{student.fullName}</b><small>{student.gender || ''}{student.studyMode ? ` · ${student.studyMode}` : ''}</small></td>
                  <td>{student.code || '—'}</td>
                  <td>{student.birthDate || '—'}</td>
                  <td>{isDeletedSchoolStudent(student) ? <em className="is-deleted">Đã xóa</em> : <em className="is-active">Đang học</em>}</td>
                </tr>)}
                {!visibleStudents.length ? <tr><td colSpan="5" className="dhsm-empty">Không có học sinh phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <footer>
            <span>{busy ? 'Đang đồng bộ thay đổi…' : 'Điểm số, rèn luyện và điểm danh luôn được giữ nguyên.'}</span>
            <button type="button" disabled={busy} onClick={() => setOpen(false)}>Đóng</button>
          </footer>
        </section>
      </div> : null}
    </section>
  );
}

let host = null;
let root = null;
let scheduled = false;

function isOverviewActive(shell) {
  const active = shell?.querySelector('.bt-tabs button.is-active');
  return !active || /tổng quan/i.test(active.textContent || '');
}

function ensureHost() {
  scheduled = false;
  const shell = document.querySelector('.bt-shell');
  if (!shell) {
    if (host) host.hidden = true;
    return;
  }
  const registryHost = document.getElementById('bes-school-class-registry-host');
  const content = shell.querySelector('.bt-content');
  const anchor = registryHost || content;
  if (!anchor) return;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    root = createRoot(host);
    root.render(<StudentManagerPanel />);
  }
  if (host.parentElement !== shell || host.previousElementSibling !== anchor) {
    anchor.insertAdjacentElement('afterend', host);
  }
  host.hidden = !isOverviewActive(shell);
}

function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(ensureHost);
}

const observer = new MutationObserver(scheduleEnsure);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('hashchange', scheduleEnsure);
document.addEventListener('click', scheduleEnsure, true);
window.setInterval(scheduleEnsure, 1200);
scheduleEnsure();
