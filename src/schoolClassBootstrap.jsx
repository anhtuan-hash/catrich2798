import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import readXlsxFile from 'read-excel-file';
import { CheckCircle2, FileSpreadsheet, RefreshCw, Search, ShieldCheck, Upload, UsersRound } from 'lucide-react';
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
import './styles/SchoolClassRegistry.css';

const HOST_ID = 'bes-school-class-registry-host';

function safeJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function loadLocalRegistry(user) {
  try {
    return normalizeSchoolClassRegistry(safeJson(localStorage.getItem(schoolClassRegistryStorageKey(user)), null));
  } catch {
    return createDefaultSchoolClassRegistry();
  }
}

function saveLocalRegistry(user, registry) {
  const normalized = normalizeSchoolClassRegistry(registry);
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
    registry: data?.payload ? normalizeSchoolClassRegistry(data.payload) : null,
    cloudReady: true,
  };
}

async function saveCloudRegistry(user, registry) {
  if (!isSupabaseConfigured || !user?.id) return { ok: true, source: 'local' };
  const { error } = await supabase.from(SCHOOL_CLASS_REGISTRY_TABLE).upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    payload: registry,
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
  const scopes = [...new Set([user?.id, user?.authId, user?.email].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))];
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

function ClassCard({ item, accounts, onHomeroom, onSubject }) {
  const selectedSubjects = new Set(item.assignment.subjectTeacherIds || []);
  return (
    <article className="scr-class-card">
      <header>
        <span className={`scr-grade grade-${item.grade}`}>{item.grade}</span>
        <div><h3>Lớp {item.className}</h3><p>{item.importedCount || item.expectedCount} học sinh</p></div>
        <em className={item.importedCount === item.expectedCount ? 'is-ready' : ''}>
          {item.importedCount ? `${item.importedCount}/${item.expectedCount}` : `Dự kiến ${item.expectedCount}`}
        </em>
      </header>
      <label className="scr-field">
        <span>Giáo viên chủ nhiệm</span>
        <select value={item.assignment.homeroomTeacherId || ''} onChange={(event) => onHomeroom(event.target.value)}>
          <option value="">Chưa phân công</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{teacherLabel(account)}</option>)}
        </select>
      </label>
      <details className="scr-subject-picker">
        <summary>Giáo viên bộ môn <b>{selectedSubjects.size || 'Chưa phân công'}</b></summary>
        <div>
          {accounts.map((account) => (
            <label key={account.id}>
              <input type="checkbox" checked={selectedSubjects.has(account.id)} onChange={(event) => onSubject(account.id, event.target.checked)} />
              <span><b>{teacherLabel(account)}</b><small>{account.email || ''}</small></span>
            </label>
          ))}
        </div>
      </details>
    </article>
  );
}

function SchoolClassRegistryPanel() {
  const [user, setUser] = useState(null);
  const [registry, setRegistry] = useState(createDefaultSchoolClassRegistry);
  const [accounts, setAccounts] = useState([]);
  const [grade, setGrade] = useState('all');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const currentUser = await getCurrentUser();
      if (!alive || !currentUser || !isDepartmentLeaderRole(currentUser.role)) return;
      setUser(currentUser);
      const local = loadLocalRegistry(currentUser);
      setRegistry(local);
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
        setRegistry(saveLocalRegistry(currentUser, selected));
      }
      if (cloud.warning) setWarning('Chưa bật bảng đồng bộ danh mục lớp trên Supabase; dữ liệu vẫn được lưu an toàn trên thiết bị.');
    })();
    return () => { alive = false; clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      const saved = saveLocalRegistry(user, registry);
      const result = await saveCloudRegistry(user, saved);
      setSaving(false);
      if (result.warning) setWarning('Chưa đồng bộ được danh mục lớp lên Supabase; bản trên thiết bị vẫn còn nguyên.');
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [registry, user]);

  const visible = useMemo(() => registry.classes.filter((item) => {
    if (grade !== 'all' && item.grade !== grade) return false;
    return !query.trim() || item.className.includes(query.trim());
  }), [registry.classes, grade, query]);
  const totalStudents = registry.classes.reduce((sum, item) => sum + (item.importedCount || item.expectedCount), 0);
  const assignedHomerooms = registry.classes.filter((item) => item.assignment.homeroomTeacherId).length;

  const importWorkbook = async (file) => {
    if (!file || !user) return;
    setMessage('Đang đọc danh sách học sinh…');
    try {
      const rows = await readXlsxFile(file);
      const parsed = parseSchoolRosterRows(rows);
      if (parsed.totalStudents !== 718) {
        throw new Error(`Tệp hiện có ${parsed.totalStudents} học sinh; danh sách chuẩn cần 718 học sinh.`);
      }
      const next = applyRosterImport(registry, parsed, file.name);
      setRegistry(next);
      const localResult = reconcileLocalWorkspaces(user, parsed.rosters);
      const cloudResult = await reconcileCloudWorkspaces(user, parsed.rosters);
      const changedClasses = [...new Set([...localResult.changedClasses, ...cloudResult.changedClasses])];
      const detail = changedClasses.length
        ? ` Đã cập nhật lớp đang có: ${changedClasses.sort().join(', ')}; điểm số và hạnh kiểm được giữ nguyên.`
        : ' Chưa tìm thấy lớp cá nhân trùng tên trong tài khoản hiện tại.';
      setMessage(`Đã tạo đủ 27 lớp với ${parsed.totalStudents} học sinh.${detail}`);
      setWarning(parsed.warnings.length ? parsed.warnings.join(' ') : '');
      window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
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
          <p>Tạo sẵn 10.1–10.12, 11.1–11.6 và 12.1–12.9. TTCM phân công một GVCN và nhiều giáo viên bộ môn cho từng lớp.</p>
        </div>
        <div className="scr-actions">
          <input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(event) => importWorkbook(event.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()}><Upload /> Nhập danh sách chuẩn</button>
          <span>{saving ? <RefreshCw className="scr-spin" /> : <CheckCircle2 />}{saving ? 'Đang lưu' : 'Đã sẵn sàng'}</span>
        </div>
      </header>

      <div className="scr-stats">
        <article><FileSpreadsheet /><span><small>Số lớp</small><b>{registry.classes.length}</b></span></article>
        <article><UsersRound /><span><small>Học sinh</small><b>{totalStudents}</b></span></article>
        <article><ShieldCheck /><span><small>Đã có GVCN</small><b>{assignedHomerooms}/27</b></span></article>
        <article><CheckCircle2 /><span><small>Lần nhập gần nhất</small><b>{registry.importedAt ? new Date(registry.importedAt).toLocaleDateString('vi-VN') : 'Chưa nhập'}</b></span></article>
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
            onHomeroom={(teacherId) => setRegistry((current) => assignHomeroomTeacher(current, item.className, teacherId))}
            onSubject={(teacherId, enabled) => setRegistry((current) => toggleSubjectTeacher(current, item.className, teacherId, enabled))}
          />
        ))}
      </div>
      <footer className="scr-footnote">
        Khi nhập lại danh sách, hệ thống ghép học sinh theo mã học sinh; nếu thiếu mã thì dùng họ tên và ngày sinh. ID học sinh cũ được giữ lại nên dữ liệu điểm số, điểm danh và rèn luyện không bị mất.
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
