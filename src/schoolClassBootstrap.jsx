import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSheet } from 'read-excel-file/browser';
import {
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  Upload,
  UsersRound,
} from 'lucide-react';
import { getCurrentUser } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { listTeamTeacherAccounts } from './utils/personnelHub.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import {
  SCHOOL_CLASS_BLUEPRINTS,
  SCHOOL_CLASS_REGISTRY_TABLE,
  applyRosterImport,
  assignHomeroomTeacher,
  createDefaultSchoolClassRegistry,
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  parseSchoolRosterRows,
  reconcileWorkspaceRoster,
  schoolClassRegistryStorageKey,
  toggleSubjectTeacher,
} from './utils/schoolClassRegistry.js';
import {
  applyAssignmentLocks,
  getClassAssignmentLock,
  isClassAssignmentLocked,
  lockAllAssignedClasses,
  lockClassAssignment,
  lockedHomeroomConflict,
  preserveAssignmentLocks,
  unlockClassAssignment,
} from './utils/schoolClassAssignmentLock.js';
import './styles/SchoolClassRegistry.css';

const HOST_ID = 'bes-school-class-registry-host';

function safeJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeRegistryPayload(raw) {
  const normalized = normalizeSchoolClassRegistry(raw);
  return applyAssignmentLocks(normalized, raw?.assignmentLocks);
}

function loadLocalRegistry(user) {
  try {
    return normalizeRegistryPayload(safeJson(localStorage.getItem(schoolClassRegistryStorageKey(user)), null));
  } catch {
    return normalizeRegistryPayload(createDefaultSchoolClassRegistry());
  }
}

function saveLocalRegistry(user, registry) {
  const normalized = applyAssignmentLocks(
    normalizeSchoolClassRegistry(registry),
    registry?.assignmentLocks,
  );
  try { localStorage.setItem(schoolClassRegistryStorageKey(user), JSON.stringify(normalized)); } catch { /* optional cache */ }
  return normalized;
}

async function loadCloudRegistry(user) {
  if (!isSupabaseConfigured || !user?.id) return { registry: null, cloudReady: false };
  const { data, error } = await supabase
    .from(SCHOOL_CLASS_REGISTRY_TABLE)
    .select('payload,updated_at')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error) return { registry: null, cloudReady: false, warning: error.message };
  return {
    registry: data?.payload ? normalizeRegistryPayload(data.payload) : null,
    cloudReady: true,
  };
}

async function saveCloudRegistry(user, registry) {
  if (!isSupabaseConfigured || !user?.id) return { ok: true, source: 'local' };
  const payload = applyAssignmentLocks(
    normalizeSchoolClassRegistry(registry),
    registry?.assignmentLocks,
  );
  const { error } = await supabase.from(SCHOOL_CLASS_REGISTRY_TABLE).upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' });
  if (error) return { ok: false, source: 'local', warning: error.message };
  return { ok: true, source: 'cloud' };
}

function workspaceMeta(workspace) {
  return {
    id: workspace.id,
    className: workspace.classProfile?.className || 'Chưa đặt tên',
    schoolYear: workspace.classProfile?.schoolYear || '',
    semester: workspace.semester || 'Học kỳ I',
    grade: workspace.classProfile?.grade || '',
    status: workspace.status || 'active',
    archivedAt: workspace.archivedAt || '',
    studentCount: (workspace.students || []).filter((item) => item.active !== false).length,
    updatedAt: workspace.updatedAt || new Date().toISOString(),
  };
}

function reconcileLocalWorkspaces(user, rosters) {
  const scopes = [...new Set([user?.id, user?.authId, user?.email]
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean))];
  let changed = 0;
  const changedClasses = [];
  const importedAt = new Date().toISOString();
  scopes.forEach((scope) => {
    const prefix = `bes-homeroom-workspace-v1:${scope}:`;
    const metas = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const workspace = safeJson(localStorage.getItem(key), null);
      const className = normalizeSchoolClassName(workspace?.classProfile?.className);
      if (!className || !rosters[className]) continue;
      const next = reconcileWorkspaceRoster(workspace, className, rosters[className], importedAt);
      localStorage.setItem(key, JSON.stringify(next));
      metas.push(workspaceMeta(next));
      changed += 1;
      changedClasses.push(className);
    }
    if (metas.length) {
      const indexKey = `bes-homeroom-workspace-index-v3:${scope}`;
      const current = safeJson(localStorage.getItem(indexKey), []);
      const byId = new Map((Array.isArray(current) ? current : []).map((item) => [item.id, item]));
      metas.forEach((item) => byId.set(item.id, { ...(byId.get(item.id) || {}), ...item }));
      localStorage.setItem(indexKey, JSON.stringify([...byId.values()]));
    }
  });
  return { changed, changedClasses: [...new Set(changedClasses)] };
}

async function reconcileCloudWorkspaces(user, rosters) {
  if (!isSupabaseConfigured || !user?.id) return { changed: 0, changedClasses: [] };
  const { data, error } = await supabase
    .from('bes_homeroom_workspaces')
    .select('workspace_id,class_name,school_year,status,semester,archived_at,payload')
    .eq('owner_id', user.id);
  if (error) return { changed: 0, changedClasses: [], warning: error.message };
  const importedAt = new Date().toISOString();
  const updates = (data || []).flatMap((row) => {
    const className = normalizeSchoolClassName(row.payload?.classProfile?.className || row.class_name);
    if (!className || !rosters[className]) return [];
    const payload = reconcileWorkspaceRoster(row.payload || { id: row.workspace_id }, className, rosters[className], importedAt);
    return [{
      owner_id: user.id,
      owner_email: user.email || '',
      workspace_id: row.workspace_id,
      class_name: className,
      school_year: row.school_year || payload.classProfile?.schoolYear || '',
      status: row.status || payload.status || 'active',
      semester: row.semester || payload.semester || 'Học kỳ I',
      archived_at: row.archived_at || payload.archivedAt || null,
      payload,
      updated_at: importedAt,
    }];
  });
  if (!updates.length) return { changed: 0, changedClasses: [] };
  const result = await supabase
    .from('bes_homeroom_workspaces')
    .upsert(updates, { onConflict: 'owner_id,workspace_id' });
  if (result.error) return { changed: 0, changedClasses: [], warning: result.error.message };
  return { changed: updates.length, changedClasses: updates.map((item) => item.class_name) };
}

function teacherLabel(account) {
  return account?.name || account?.email || 'Giáo viên';
}

function ClassCard({ item, accounts, lock, onHomeroom, onSubject, onLock, onUnlock }) {
  const selectedSubjects = new Set(item.assignment.subjectTeacherIds || []);
  const locked = lock?.locked === true;
  const hasAssignment = Boolean(item.assignment.homeroomTeacherId || selectedSubjects.size);
  return (
    <article className={`scr-class-card ${locked ? 'is-assignment-locked' : ''}`}>
      <header>
        <span className={`scr-grade grade-${item.grade}`}>{item.grade}</span>
        <div><h3>Lớp {item.className}</h3><p>{item.importedCount || item.expectedCount} học sinh</p></div>
        <em className={item.importedCount === item.expectedCount ? 'is-ready' : ''}>
          {item.importedCount ? `${item.importedCount}/${item.expectedCount}` : `Dự kiến ${item.expectedCount}`}
        </em>
      </header>
      <label className="scr-field">
        <span>Giáo viên chủ nhiệm</span>
        <select
          value={item.assignment.homeroomTeacherId || ''}
          disabled={locked}
          onChange={(event) => onHomeroom(event.target.value)}
        >
          <option value="">Chưa phân công</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{teacherLabel(account)}</option>)}
        </select>
      </label>
      <details className="scr-subject-picker">
        <summary>Giáo viên bộ môn <b>{selectedSubjects.size || 'Chưa phân công'}</b></summary>
        <div>
          {accounts.map((account) => (
            <label key={account.id}>
              <input
                type="checkbox"
                disabled={locked}
                checked={selectedSubjects.has(account.id)}
                onChange={(event) => onSubject(account.id, event.target.checked)}
              />
              <span><b>{teacherLabel(account)}</b><small>{account.email || ''}</small></span>
            </label>
          ))}
        </div>
      </details>
      <div className="scr-assignment-lock-row">
        {locked ? (
          <>
            <span className="scr-lock-status"><Lock /> Đã khóa phân công</span>
            <button type="button" className="scr-unlock-button" onClick={onUnlock}><Unlock /> Mở khóa</button>
          </>
        ) : (
          <button type="button" className="scr-lock-button" disabled={!hasAssignment} onClick={onLock}>
            <Lock /> {hasAssignment ? 'Khóa phân công' : 'Phân công trước khi khóa'}
          </button>
        )}
      </div>
    </article>
  );
}

function SchoolClassRegistryPanel() {
  const [user, setUser] = useState(null);
  const [registry, setRegistryState] = useState(() => normalizeRegistryPayload(createDefaultSchoolClassRegistry()));
  const [accounts, setAccounts] = useState([]);
  const [grade, setGrade] = useState('all');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const registryRef = useRef(registry);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingSaveCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    let alive = true;
    mountedRef.current = true;
    (async () => {
      const currentUser = await getCurrentUser();
      if (!alive || !currentUser || !isDepartmentLeaderRole(currentUser.role)) return;
      setUser(currentUser);
      const local = loadLocalRegistry(currentUser);
      registryRef.current = local;
      setRegistryState(local);
      const [cloud, directory] = await Promise.all([
        loadCloudRegistry(currentUser),
        listTeamTeacherAccounts(currentUser).catch(() => []),
      ]);
      if (!alive) return;
      setAccounts(directory);
      if (cloud.registry) {
        const localTime = Date.parse(local.updatedAt || 0) || 0;
        const cloudTime = Date.parse(cloud.registry.updatedAt || 0) || 0;
        const selected = cloudTime >= localTime ? cloud.registry : local;
        const cached = saveLocalRegistry(currentUser, selected);
        registryRef.current = cached;
        setRegistryState(cached);
      }
      if (cloud.warning) setWarning('Chưa bật bảng đồng bộ danh mục lớp trên Supabase; dữ liệu vẫn được lưu an toàn trên thiết bị.');
    })();
    return () => {
      alive = false;
      mountedRef.current = false;
    };
  }, []);

  const queueCloudSave = (snapshot) => {
    if (!user) return;
    pendingSaveCountRef.current += 1;
    if (mountedRef.current) setSaving(true);
    saveQueueRef.current = saveQueueRef.current
      .catch(() => null)
      .then(() => saveCloudRegistry(user, snapshot))
      .then((result) => {
        if (result?.warning && mountedRef.current) {
          setWarning('Chưa đồng bộ được danh mục lớp lên Supabase; bản trên thiết bị vẫn còn nguyên.');
        }
        return result;
      })
      .finally(() => {
        pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
        if (mountedRef.current && pendingSaveCountRef.current === 0) setSaving(false);
      });
  };

  const replaceRegistry = (next, { persist = true, successMessage = '' } = {}) => {
    if (!user) return registryRef.current;
    const saved = saveLocalRegistry(user, next);
    registryRef.current = saved;
    setRegistryState(saved);
    if (persist) queueCloudSave(saved);
    if (successMessage) setMessage(successMessage);
    return saved;
  };

  const commitRegistry = (producer, successMessage = '') => {
    const current = registryRef.current;
    const next = typeof producer === 'function' ? producer(current) : producer;
    return replaceRegistry(next, { persist: true, successMessage });
  };

  const visible = useMemo(() => registry.classes.filter((item) => {
    if (grade !== 'all' && item.grade !== grade) return false;
    return !query.trim() || item.className.includes(query.trim());
  }), [registry.classes, grade, query]);
  const totalStudents = registry.classes.reduce((sum, item) => sum + (item.importedCount || item.expectedCount), 0);
  const assignedHomerooms = registry.classes.filter((item) => item.assignment.homeroomTeacherId).length;
  const lockedAssignments = registry.classes.filter((item) => isClassAssignmentLocked(registry, item.className)).length;

  const changeHomeroomTeacher = (className, teacherId) => {
    if (isClassAssignmentLocked(registryRef.current, className)) {
      setMessage(`Lớp ${className} đang khóa phân công. Hãy mở khóa trước khi thay đổi.`);
      return;
    }
    const conflict = lockedHomeroomConflict(registryRef.current, teacherId, className);
    if (conflict) {
      setMessage(`Giáo viên này đang là GVCN lớp ${conflict.className} và phân công đó đã khóa.`);
      return;
    }
    commitRegistry((current) => preserveAssignmentLocks(
      assignHomeroomTeacher(current, className, teacherId),
      current,
    ));
  };

  const changeSubjectTeacher = (className, teacherId, enabled) => {
    if (isClassAssignmentLocked(registryRef.current, className)) {
      setMessage(`Lớp ${className} đang khóa phân công. Hãy mở khóa trước khi thay đổi.`);
      return;
    }
    commitRegistry((current) => preserveAssignmentLocks(
      toggleSubjectTeacher(current, className, teacherId, enabled),
      current,
    ));
  };

  const lockOneClass = (className) => {
    commitRegistry(
      (current) => lockClassAssignment(current, className, user),
      `Đã khóa phân công lớp ${className}. Import danh sách học sinh sẽ không thay đổi GVCN/GVBM của lớp này.`,
    );
  };

  const unlockOneClass = (className) => {
    const confirmed = window.confirm(`Mở khóa phân công lớp ${className}? Sau khi mở khóa, Admin/TTCM có thể thay đổi GVCN và giáo viên bộ môn.`);
    if (!confirmed) return;
    commitRegistry(
      (current) => unlockClassAssignment(current, className, user),
      `Đã mở khóa phân công lớp ${className}.`,
    );
  };

  const lockAllCurrentAssignments = () => {
    const before = registryRef.current;
    const beforeCount = before.classes.filter((item) => isClassAssignmentLocked(before, item.className)).length;
    const next = lockAllAssignedClasses(before, user);
    const afterCount = next.classes.filter((item) => isClassAssignmentLocked(next, item.className)).length;
    if (afterCount === beforeCount) {
      setMessage('Không có phân công mới cần khóa.');
      return;
    }
    replaceRegistry(next, {
      persist: true,
      successMessage: `Đã khóa ${afterCount - beforeCount} lớp vừa phân công. Tổng cộng ${afterCount}/27 lớp đang được bảo vệ.`,
    });
  };

  const importWorkbook = async (file) => {
    if (!file || !user) return;
    setMessage('Đang đọc danh sách học sinh…');
    try {
      const rows = await readSheet(file);
      const parsed = parseSchoolRosterRows(rows);
      if (parsed.totalStudents !== 718) {
        throw new Error(`Tệp hiện có ${parsed.totalStudents} học sinh; danh sách chuẩn cần 718 học sinh.`);
      }
      const current = registryRef.current;
      const imported = applyRosterImport(current, parsed, file.name);
      const next = preserveAssignmentLocks(imported, current);
      replaceRegistry(next, { persist: true });
      const localResult = reconcileLocalWorkspaces(user, parsed.rosters);
      const cloudResult = await reconcileCloudWorkspaces(user, parsed.rosters);
      const changedClasses = [...new Set([...localResult.changedClasses, ...cloudResult.changedClasses])];
      const detail = changedClasses.length
        ? ` Đã cập nhật lớp đang có: ${changedClasses.sort().join(', ')}; điểm số, hạnh kiểm và phân công đã khóa được giữ nguyên.`
        : ' Chưa tìm thấy lớp cá nhân trùng tên trong tài khoản hiện tại.';
      setMessage(`Đã tạo đủ 27 lớp với ${parsed.totalStudents} học sinh.${detail}`);
      setWarning(parsed.warnings.length ? parsed.warnings.join(' ') : '');
      window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
      window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated'));
    } catch (error) {
      setMessage(error?.message || 'Không thể nhập tệp Excel.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!user || !isDepartmentLeaderRole(user.role)) return null;

  return (
    <section className="scr-panel" aria-label="Danh mục 27 lớp toàn trường">
      <header className="scr-hero">
        <div>
          <span><ShieldCheck /> QUẢN LÝ LỚP DÀNH CHO TTCM</span>
          <h2>27 lớp · danh sách học sinh chuẩn</h2>
          <p>Phân công GVCN/GVBM rồi khóa lại. Khi đã khóa, import danh sách hoặc đồng bộ thông thường không được phép thay đổi phân công.</p>
        </div>
        <div className="scr-actions">
          <input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(event) => importWorkbook(event.target.files?.[0])} />
          <button type="button" onClick={lockAllCurrentAssignments}><Lock /> Khóa các phân công đã có</button>
          <button type="button" onClick={() => fileRef.current?.click()}><Upload /> Nhập danh sách chuẩn</button>
          <span>{saving ? <RefreshCw className="scr-spin" /> : <CheckCircle2 />}{saving ? 'Đang lưu' : 'Đã sẵn sàng'}</span>
        </div>
      </header>

      <div className="scr-stats">
        <article><FileSpreadsheet /><span><small>Số lớp</small><b>{registry.classes.length}</b></span></article>
        <article><UsersRound /><span><small>Học sinh</small><b>{totalStudents}</b></span></article>
        <article><ShieldCheck /><span><small>Đã có GVCN</small><b>{assignedHomerooms}/27</b></span></article>
        <article><Lock /><span><small>Đã khóa phân công</small><b>{lockedAssignments}/27</b></span></article>
      </div>

      {message ? <div className="scr-message">{message}</div> : null}
      {warning ? <div className="scr-warning">{warning}</div> : null}

      <div className="scr-toolbar">
        <div>{['all', '10', '11', '12'].map((value) => <button type="button" key={value} className={grade === value ? 'is-active' : ''} onClick={() => setGrade(value)}>{value === 'all' ? 'Tất cả' : `Khối ${value}`}</button>)}</div>
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lớp…" /></label>
      </div>

      <div className="scr-class-grid">
        {visible.map((item) => (
          <ClassCard
            key={item.className}
            item={item}
            accounts={accounts}
            lock={getClassAssignmentLock(registry, item.className)}
            onHomeroom={(teacherId) => changeHomeroomTeacher(item.className, teacherId)}
            onSubject={(teacherId, enabled) => changeSubjectTeacher(item.className, teacherId, enabled)}
            onLock={() => lockOneClass(item.className)}
            onUnlock={() => unlockOneClass(item.className)}
          />
        ))}
      </div>
      <footer className="scr-footnote">
        Phân công được lưu ngay trên thiết bị và đồng bộ tuần tự lên cloud. Khi một lớp đã khóa, snapshot GVCN/GVBM của lớp đó được dùng làm nguồn chuẩn cho tới khi Admin/TTCM chủ động mở khóa.
      </footer>
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

function ensureSchoolClassRegistryHost() {
  scheduled = false;
  const shell = document.querySelector('.bt-shell');
  if (!shell) {
    if (host) host.hidden = true;
    return;
  }
  const content = shell.querySelector('.bt-content');
  if (!content) return;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    root = createRoot(host);
    root.render(<SchoolClassRegistryPanel />);
  }
  if (host.parentElement !== shell || host.previousElementSibling !== content) {
    content.insertAdjacentElement('afterend', host);
  }
  host.hidden = !isOverviewActive(shell);
}

function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(ensureSchoolClassRegistryHost);
}

export function installSchoolClassRegistry() {
  if (window.__BES_SCHOOL_CLASS_REGISTRY_INSTALLED__) return;
  window.__BES_SCHOOL_CLASS_REGISTRY_INSTALLED__ = true;
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('hashchange', scheduleEnsure);
  document.addEventListener('click', scheduleEnsure, true);
  window.setInterval(scheduleEnsure, 1200);
  scheduleEnsure();
}

installSchoolClassRegistry();

export { SCHOOL_CLASS_BLUEPRINTS };
