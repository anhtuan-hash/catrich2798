import React, { useEffect, useMemo, useState } from 'react';
import GradebookWorkspace from '../components/gradebook/GradebookWorkspace.jsx';
import SubjectStudentsTab from '../components/homeroom/SubjectStudentsTab.jsx';
import {
  createGradebookClass,
  listGradebookClasses,
  listLocalGradebookClasses,
  loadGradebookClass,
  loadLocalGradebookClass,
  saveGradebookClass,
  saveLocalGradebookClass,
} from '../utils/gradebookWorkspaceStore.js';
import { makeWorkspaceId } from '../utils/homeroomPhase3.js';
import { getClassTypeLabel } from '../utils/homeroomClassTypes.js';
import '../styles/homeroom-complete.css';
import '../styles/GradebookStudio.css';

const EMPTY_CLASS = {
  className: '',
  schoolYear: '2026-2027',
  semester: 'Học kỳ I',
  grade: '',
  room: '',
};

function userIdentity(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function selectionKey(user) {
  return `bes-gradebook-active-class-v1:${userIdentity(user)}`;
}

function readSelectedClassId(user, items = []) {
  let stored = '';
  try { stored = localStorage.getItem(selectionKey(user)) || ''; } catch { /* optional */ }
  const active = items.filter((item) => item.status !== 'archived');
  return active.some((item) => item.id === stored) ? stored : active[0]?.id || '';
}

function persistSelectedClassId(user, id) {
  try { localStorage.setItem(selectionKey(user), id || ''); } catch { /* optional */ }
}

function classLabel(item) {
  const type = item?.classType ? getClassTypeLabel(item.classType) : 'Lớp';
  return `${item?.className || 'Chưa đặt tên'} · ${type}`;
}

export default function GradebookStudio({ currentUser, language = 'vi' }) {
  const initialCatalog = useMemo(
    () => listLocalGradebookClasses(currentUser),
    [currentUser?.id, currentUser?.authId, currentUser?.email],
  );
  const initialId = useMemo(
    () => readSelectedClassId(currentUser, initialCatalog),
    [currentUser?.id, currentUser?.authId, currentUser?.email],
  );
  const [catalog, setCatalog] = useState(initialCatalog);
  const [workspaceId, setWorkspaceId] = useState(initialId);
  const [workspace, setWorkspace] = useState(() => initialId ? loadLocalGradebookClass(currentUser, initialId) : null);
  const [view, setView] = useState('gradebook');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(() => !initialId);
  const [classDraft, setClassDraft] = useState(EMPTY_CLASS);

  const activeClasses = useMemo(() => catalog.filter((item) => item.status !== 'archived'), [catalog]);

  const refreshCatalog = async () => {
    const local = listLocalGradebookClasses(currentUser);
    if (local.length) setCatalog(local);
    const result = await listGradebookClasses(currentUser);
    const items = result.items || local;
    setCatalog(items);
    return items;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await refreshCatalog();
      if (!alive) return;
      const selected = readSelectedClassId(currentUser, items);
      setWorkspaceId((current) => (
        current && items.some((item) => item.id === current && item.status !== 'archived') ? current : selected
      ));
      if (!selected) setCreateOpen(true);
    })();
    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (!workspaceId) {
      setWorkspace(null);
      return undefined;
    }

    let alive = true;
    persistSelectedClassId(currentUser, workspaceId);
    const local = loadLocalGradebookClass(currentUser, workspaceId);
    if (local) setWorkspace(local);
    setLoading(!local);

    (async () => {
      try {
        const result = await loadGradebookClass(currentUser, workspaceId);
        if (alive && result.workspace) setWorkspace(result.workspace);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspaceId]);

  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__besGradebookStudioMessage);
    window.__besGradebookStudioMessage = window.setTimeout(() => setMessage(''), 3600);
  };

  const commit = async (next, successMessage = 'Đã lưu dữ liệu sổ điểm.') => {
    const local = saveLocalGradebookClass(next, currentUser);
    setWorkspace(local);
    setSaving(true);
    const result = await saveGradebookClass(local, currentUser);
    setSaving(false);
    if (result.ok) {
      setWorkspace(result.workspace || local);
      flash(successMessage);
    } else {
      flash(`${successMessage} Đã lưu trên thiết bị; cloud chưa đồng bộ: ${result.message || 'lỗi chưa xác định'}`);
    }
    await refreshCatalog();
    return result;
  };

  const createClass = async () => {
    const className = String(classDraft.className || '').trim();
    if (!className) {
      flash('Vui lòng nhập tên lớp.');
      return;
    }
    const id = makeWorkspaceId(className, classDraft.schoolYear);
    setSaving(true);
    const result = await createGradebookClass(currentUser, {
      id,
      semester: classDraft.semester,
      classProfile: {
        className,
        schoolYear: classDraft.schoolYear,
        grade: classDraft.grade,
        room: classDraft.room,
        adviserName: currentUser?.name || currentUser?.email || '',
        adviserEmail: currentUser?.email || '',
      },
    });
    setSaving(false);
    if (!result.ok || !result.workspace) {
      flash(result.message || 'Không thể tạo lớp bộ môn.');
      return;
    }
    await refreshCatalog();
    setWorkspace(result.workspace);
    setWorkspaceId(result.workspace.id);
    persistSelectedClassId(currentUser, result.workspace.id);
    setClassDraft(EMPTY_CLASS);
    setCreateOpen(false);
    setView('students');
    flash(`Đã tạo lớp ${className}. Hãy nhập danh sách học sinh để bắt đầu.`);
  };

  const activeMeta = activeClasses.find((item) => item.id === workspaceId);
  const studentCount = (workspace?.students || []).filter((item) => item.active !== false).length;
  const vi = language === 'vi';

  return <div className="page hr-page gradebook-studio">
    <section className="gradebook-studio-hero">
      <div className="gradebook-studio-hero-copy">
        <span className="gradebook-studio-kicker">GRADEBOOK · TEACHER WORKSPACE</span>
        <h1>{vi ? 'Sổ điểm' : 'Gradebook'}</h1>
        <p>{vi
          ? 'Không gian nhập điểm độc lập dành cho mọi giáo viên. Dữ liệu lớp và điểm cũ được giữ nguyên, không phụ thuộc vai trò giáo viên chủ nhiệm.'
          : 'An independent gradebook for every teacher. Existing class and score data stays intact and no longer depends on homeroom-teacher status.'}</p>
      </div>
      <div className="gradebook-studio-hero-stats">
        <article><strong>{activeClasses.length}</strong><span>{vi ? 'lớp đang dùng' : 'active classes'}</span></article>
        <article><strong>{studentCount}</strong><span>{vi ? 'học sinh lớp hiện tại' : 'students in current class'}</span></article>
        <article><strong>2</strong><span>{vi ? 'học kỳ' : 'semesters'}</span></article>
      </div>
    </section>

    <section className="gradebook-studio-switcher hr-panel">
      <div className="gradebook-studio-class-picker">
        <label>
          <span>{vi ? 'Lớp đang mở' : 'Current class'}</span>
          <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
            {!activeClasses.length ? <option value="">Chưa có lớp</option> : null}
            {activeClasses.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
          </select>
        </label>
        {activeMeta ? <div className="gradebook-studio-class-meta">
          <b>{activeMeta.className}</b>
          <span>{activeMeta.schoolYear || '—'} · {activeMeta.semester || '—'} · {getClassTypeLabel(activeMeta.classType)}</span>
        </div> : null}
      </div>
      <div className="gradebook-studio-actions">
        <button type="button" className={view === 'gradebook' ? 'primary' : 'secondary'} disabled={!workspace} onClick={() => setView('gradebook')}>∑ {vi ? 'Sổ điểm' : 'Gradebook'}</button>
        <button type="button" className={view === 'students' ? 'primary' : 'secondary'} disabled={!workspace} onClick={() => setView('students')}>♙ {vi ? 'Danh sách học sinh' : 'Students'}</button>
        <button type="button" className="secondary" onClick={() => setCreateOpen((value) => !value)}>＋ {vi ? 'Thêm lớp bộ môn' : 'Add class'}</button>
      </div>
    </section>

    {createOpen ? <section className="gradebook-studio-create hr-panel">
      <div className="hr-panel-head"><div><small>{vi ? 'THIẾT LẬP NHANH' : 'QUICK SETUP'}</small><h2>{vi ? 'Tạo lớp bộ môn mới' : 'Create a subject class'}</h2><p>{vi ? 'Không cần là GVCN. Lớp mới được tạo riêng để nhập danh sách và quản lý điểm.' : 'No homeroom role is required. The new class is created for roster and grade management.'}</p></div><button type="button" className="primary" disabled={saving} onClick={createClass}>{saving ? 'Đang tạo…' : 'Tạo lớp'}</button></div>
      <div className="hr-form-grid four">
        <label><span>Tên lớp</span><input value={classDraft.className} onChange={(event) => setClassDraft({ ...classDraft, className: event.target.value })} placeholder="11.3" /></label>
        <label><span>Năm học</span><input value={classDraft.schoolYear} onChange={(event) => setClassDraft({ ...classDraft, schoolYear: event.target.value })} /></label>
        <label><span>Khối</span><input value={classDraft.grade} onChange={(event) => setClassDraft({ ...classDraft, grade: event.target.value })} placeholder="11" /></label>
        <label><span>Phòng</span><input value={classDraft.room} onChange={(event) => setClassDraft({ ...classDraft, room: event.target.value })} /></label>
        <label><span>Giai đoạn</span><select value={classDraft.semester} onChange={(event) => setClassDraft({ ...classDraft, semester: event.target.value })}><option>Học kỳ I</option><option>Học kỳ II</option><option>Cả năm</option></select></label>
      </div>
    </section> : null}

    {message ? <div className="gradebook-studio-message" role="status">✓ {message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu sổ điểm…</div> : null}

    {loading && !workspace ? <section className="hr-panel gradebook-studio-empty"><h2>Đang mở lớp…</h2><p>Brian đang tải dữ liệu lớp và sổ điểm.</p></section> : null}
    {!loading && !workspace ? <section className="hr-panel gradebook-studio-empty"><h2>{vi ? 'Chưa có lớp để mở sổ điểm' : 'No class yet'}</h2><p>{vi ? 'Tạo một lớp bộ môn ngay tại đây. Giáo viên không cần được phân công GVCN.' : 'Create a subject class here. Homeroom assignment is not required.'}</p><button type="button" className="primary" onClick={() => setCreateOpen(true)}>＋ {vi ? 'Tạo lớp đầu tiên' : 'Create first class'}</button></section> : null}

    {workspace && view === 'students' ? <SubjectStudentsTab workspace={workspace} onCommit={commit} /> : null}
    {workspace && view === 'gradebook' ? <GradebookWorkspace workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
  </div>;
}
