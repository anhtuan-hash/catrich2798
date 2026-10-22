import React, { useEffect, useMemo, useRef, useState } from 'react';
import GradebookWorkspace from '../components/gradebook/GradebookWorkspace.jsx';
import { ClipboardPenLine, ChartNoAxesCombined, FileDown, UsersRound, Plus, Sparkles, Palette, Check, ShieldCheck, BookOpenCheck } from 'lucide-react';
import GradebookRosterHistoryPanel from '../components/gradebook/GradebookRosterHistoryPanel.jsx';
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
import {
  hydrateGradebookWithSharedRoster,
  mergeSharedRosterIntoWorkspace,
  projectSharedRosterStudents,
} from '../utils/gradebookRosterStore.js';
import {
  saveSharedGradebookRosterSafely,
  subscribeSharedGradebookRoster,
} from '../utils/gradebookRosterSync.js';
import {
  listMyGradebookTeachingAssignments,
  matchGradebookClassToAssignment,
} from '../utils/gradebookTeachingAssignments.js';
import { attachVerifiedGradebookAssignment, evaluateGradebookAssignmentLifecycle, isAssignedGradebookWorkspace } from '../utils/gradebookAssignmentLifecycle.js';
import { makeWorkspaceId } from '../utils/homeroomPhase3.js';
import { getClassTypeLabel } from '../utils/homeroomClassTypes.js';
import { syncAssignedStudentRosterDelta } from '../utils/assignedStudentRosterSync.js';
import '../styles/homeroom-complete.css';
import '../styles/GradebookStudio.css';
import '../styles/GradebookLifecycle.css';
import '../styles/GradebookAcademicWorkspace.css';
import '../styles/GradebookSpectrumV4.css';
import '../styles/GradebookRosterLayoutHotfix.css';
import '../styles/GradebookFocusV5.css';
import '../styles/GradebookRebirthV7.css';

const EMPTY_CLASS = {
  className: '',
  schoolYear: '2026-2027',
  semester: 'Học kỳ I',
  grade: '',
  room: '',
  teachingSubject: 'Tiếng Anh',
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

function findAssignmentClass(classes, assignment) {
  return classes.find((item) => matchGradebookClassToAssignment(item, assignment)) || null;
}

function rosterFingerprint(students = []) {
  return JSON.stringify(projectSharedRosterStudents(students));
}

function rosterStatusLabel(source, vi = true) {
  if (source === 'roster-cloud') return vi ? '✓ Danh sách dùng chung' : '✓ Shared roster';
  if (source === 'roster-cloud-promoted') return vi ? '✓ Danh sách toàn trường · đã hợp nhất' : '✓ School roster · promoted';
  if (source === 'roster-realtime') return vi ? '● Danh sách dùng chung · realtime' : '● Shared roster · realtime';
  if (source === 'roster-conflict-resolved') return vi ? '✓ Danh sách dùng chung · đã hòa giải' : '✓ Shared roster · conflict resolved';
  if (source === 'roster-concurrent-retry') return vi ? 'Danh sách dùng chung · cần kiểm tra lại' : 'Shared roster · review needed';
  if (source === 'roster-cloud-empty') return vi ? 'Danh sách dùng chung sẵn sàng' : 'Shared roster ready';
  if (source === 'assignment-ended') return vi ? 'Roster chỉ đọc · hết phân công' : 'Read-only roster · assignment ended';
  if (source === 'historical-roster') return vi ? 'Roster lịch sử · chỉ đọc' : 'Historical roster · read only';
  if (source === 'roster-table-pending') return vi ? 'Danh sách cục bộ · chờ kích hoạt cloud' : 'Local roster · cloud pending';
  if (source === 'roster-cloud-error') return vi ? 'Danh sách cục bộ · lỗi đồng bộ' : 'Local roster · sync issue';
  if (source === 'roster-local' || source === 'no-cloud') return vi ? 'Danh sách cục bộ' : 'Local roster';
  return vi ? 'Đang kiểm tra danh sách…' : 'Checking roster…';
}

function lifecycleExplanation(lifecycle) {
  if (lifecycle.status === 'ended') {
    return 'TTCM không còn phân công bạn dạy lớp này. Sổ điểm cá nhân vẫn được giữ để xem, hoàn thiện hồ sơ và xuất báo cáo; roster dùng chung chuyển sang chỉ đọc.';
  }
  if (lifecycle.status === 'historical') {
    return 'Đây là sổ điểm của năm học cũ. Brian giữ dữ liệu lịch sử nhưng không tiếp tục đồng bộ/chỉnh roster dùng chung của năm hiện hành.';
  }
  if (lifecycle.status === 'unverified') {
    return 'Brian chưa xác minh được phân công từ Brian Team. Chức năng hiện tại vẫn hoạt động và RLS trên Supabase tiếp tục là lớp bảo vệ cuối.';
  }
  return '';
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
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const [view, setView] = useState('gradebook');
  const [gradebookAction, setGradebookAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradebookDirty, setGradebookDirty] = useState(false);
  const [visualPalette, setVisualPalette] = useState(() => {
    try {
      const saved = localStorage.getItem(`bes-gradebook-spectrum-v4:${userIdentity(currentUser)}`);
      return ['electric','coral','orbit'].includes(saved) ? saved : 'electric';
    } catch { return 'electric'; }
  });
  useEffect(() => {
    try { localStorage.setItem(`bes-gradebook-spectrum-v4:${userIdentity(currentUser)}`, visualPalette); }
    catch { /* Cosmetic preference is optional. */ }
  }, [visualPalette, currentUser?.id, currentUser?.authId, currentUser?.email]);
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(() => !initialId);
  const [classDraft, setClassDraft] = useState(EMPTY_CLASS);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [assignmentSource, setAssignmentSource] = useState('loading');
  const [rosterSource, setRosterSource] = useState('loading');

  const activeClasses = useMemo(() => catalog.filter((item) => item.status !== 'archived'), [catalog]);
  const assignedReadyCount = useMemo(() => teachingAssignments.filter(
    (assignment) => Boolean(findAssignmentClass(activeClasses, assignment)),
  ).length, [teachingAssignments, activeClasses]);
  const lifecycle = useMemo(
    () => evaluateGradebookAssignmentLifecycle(workspace, teachingAssignments, assignmentSource),
    [workspace, teachingAssignments, assignmentSource],
  );

  const refreshCatalog = async () => {
    const local = listLocalGradebookClasses(currentUser);
    if (local.length) setCatalog(local);
    const result = await listGradebookClasses(currentUser);
    const items = result.items || local;
    setCatalog(items);
    return items;
  };

  const refreshAssignments = async () => {
    const result = await listMyGradebookTeachingAssignments(currentUser);
    setTeachingAssignments(result.assignments || []);
    setAssignmentSource(result.source || (result.ok ? 'brian-team-sync' : 'assignment-sync-error'));
    return result;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [items] = await Promise.all([refreshCatalog(), refreshAssignments()]);
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
      setRosterSource('loading');
      return undefined;
    }

    let alive = true;
    persistSelectedClassId(currentUser, workspaceId);
    const local = loadLocalGradebookClass(currentUser, workspaceId);
    if (local) setWorkspace(local);
    setLoading(!local);
    setRosterSource('loading');

    (async () => {
      try {
        const result = await loadGradebookClass(currentUser, workspaceId);
        if (!result.workspace) return;
        const verifiedWorkspace = attachVerifiedGradebookAssignment(
          result.workspace, teachingAssignments, assignmentSource,
        );
        const access = evaluateGradebookAssignmentLifecycle(
          verifiedWorkspace,
          teachingAssignments,
          assignmentSource,
        );
        const rosterResult = access.sharingAllowed
          ? await hydrateGradebookWithSharedRoster(currentUser, verifiedWorkspace)
          : {
            workspace: verifiedWorkspace,
            source: access.status === 'historical' ? 'historical-roster' : 'assignment-ended',
          };
        if (!alive) return;
        const hydrated = rosterResult.workspace || verifiedWorkspace;
        const saved = saveLocalGradebookClass(hydrated, currentUser);
        workspaceRef.current = saved;
        setWorkspace(saved);
        setRosterSource(rosterResult.source || 'roster-local');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    workspaceId,
    assignmentSource,
    teachingAssignments,
  ]);

  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__besGradebookStudioMessage);
    window.__besGradebookStudioMessage = window.setTimeout(() => setMessage(''), 4200);
  };

  useEffect(() => {
    if (lifecycle.status === 'ended') setRosterSource('assignment-ended');
    if (lifecycle.status === 'historical') setRosterSource('historical-roster');
  }, [lifecycle.status]);

  useEffect(() => {
    const current = workspaceRef.current;
    if (!current || !workspaceId || !lifecycle.sharingAllowed) return undefined;

    return subscribeSharedGradebookRoster(currentUser, current, ({ roster, updatedBy }) => {
      const latest = workspaceRef.current;
      if (!latest || latest.id !== workspaceId || !roster?.students) return;
      const merged = mergeSharedRosterIntoWorkspace(latest, roster.students);
      const saved = saveLocalGradebookClass(merged, currentUser);
      workspaceRef.current = saved;
      setWorkspace(saved);

      const selfUpdate = String(updatedBy || '') === String(currentUser?.id || '');
      setRosterSource(selfUpdate ? 'roster-cloud' : 'roster-realtime');
      if (!selfUpdate) {
        flash('Danh sách học sinh vừa được cập nhật từ giáo viên khác. Điểm và ghi chú môn học của bạn vẫn được giữ nguyên.');
      }
    });
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    workspaceId,
    lifecycle.sharingAllowed,
    workspace?.classProfile?.assignmentDepartmentId,
    workspace?.classProfile?.assignmentSource,
    workspace?.classProfile?.className,
    workspace?.classProfile?.schoolYear,
  ]);

  const commit = async (next, successMessage = 'Đã lưu dữ liệu sổ điểm.') => {
    const previous = workspaceRef.current;
    const rosterChanged = rosterFingerprint(next?.students) !== rosterFingerprint(previous?.students);
    if (rosterChanged && !lifecycle.rosterEditable) {
      flash('Roster đang ở chế độ chỉ đọc vì phân công không còn hiệu lực hoặc đây là dữ liệu năm học cũ.');
      return { ok: false, blocked: true, workspace: workspaceRef.current };
    }

    const verifiedNext = attachVerifiedGradebookAssignment(
      next, teachingAssignments, assignmentSource,
    );
    const local = saveLocalGradebookClass(verifiedNext, currentUser);
    workspaceRef.current = local;
    setWorkspace(local);
    setSaving(true);

    const [result, rosterResult] = await Promise.all([
      saveGradebookClass(local, currentUser),
      rosterChanged && lifecycle.sharingAllowed
        ? (isAssignedGradebookWorkspace(local)
          ? syncAssignedStudentRosterDelta(currentUser, previous, local)
          : saveSharedGradebookRosterSafely(currentUser, local))
        : Promise.resolve(null),
    ]);

    setSaving(false);
    if (rosterResult) setRosterSource(rosterResult.ok
      ? (rosterResult.source || 'roster-cloud')
      : (rosterResult.source || 'roster-cloud-error'));

    const gradebookWorkspace = result.workspace || local;
    const resolvedWorkspace = rosterResult?.workspace
      ? { ...gradebookWorkspace, students: rosterResult.workspace.students }
      : gradebookWorkspace;
    const savedResolved = saveLocalGradebookClass(resolvedWorkspace, currentUser);
    workspaceRef.current = savedResolved;
    setWorkspace(savedResolved);

    if (result.ok) {
      if (rosterResult?.conflictResolved) {
        flash(`${successMessage} Brian đã tự hòa giải ${rosterResult.conflicts?.length || 1} trường dữ liệu bị sửa đồng thời.`);
      } else if (rosterChanged && rosterResult && !rosterResult.ok && !rosterResult.missingTable) {
        flash(`${successMessage} Sổ điểm đã lưu; ${rosterResult.message || 'danh sách dùng chung chưa đồng bộ.'}`);
      } else {
        flash(successMessage);
      }
    } else {
      flash(`${successMessage} Đã lưu trên thiết bị; cloud chưa đồng bộ: ${result.message || 'lỗi chưa xác định'}`);
    }
    await refreshCatalog();
    return result;
  };

  const handleRosterRestored = async (restoredWorkspace) => {
    if (!restoredWorkspace) return;
    const local = saveLocalGradebookClass(restoredWorkspace, currentUser);
    workspaceRef.current = local;
    setWorkspace(local);
    setRosterSource('roster-cloud');
    const result = await saveGradebookClass(local, currentUser);
    if (result.ok && result.workspace) {
      const saved = saveLocalGradebookClass(result.workspace, currentUser);
      workspaceRef.current = saved;
      setWorkspace(saved);
    }
    flash('Đã khôi phục roster. Điểm và ghi chú môn học không bị thay đổi.');
  };

  const createClassFromData = async (draft, { fromAssignment = null } = {}) => {
    const className = String(draft.className || '').trim();
    if (!className) {
      flash('Vui lòng nhập tên lớp.');
      return null;
    }
    const schoolYear = String(draft.schoolYear || EMPTY_CLASS.schoolYear).trim() || EMPTY_CLASS.schoolYear;
    const id = makeWorkspaceId(className, schoolYear);
    setSaving(true);
    const result = await createGradebookClass(currentUser, {
      id,
      semester: draft.semester || 'Học kỳ I',
      classProfile: {
        className,
        schoolYear,
        grade: draft.grade || '',
        room: draft.room || '',
        teachingSubject: draft.teachingSubject || fromAssignment?.subject || 'Tiếng Anh',
        assignmentSource: fromAssignment?.source || '',
        assignmentDepartmentId: fromAssignment?.departmentId || '',
        assignmentDepartmentName: fromAssignment?.departmentName || '',
        adviserName: currentUser?.name || currentUser?.email || '',
        adviserEmail: currentUser?.email || '',
      },
    });
    setSaving(false);
    if (!result.ok || !result.workspace) {
      flash(result.message || 'Không thể tạo lớp bộ môn.');
      return null;
    }
    await refreshCatalog();
    setWorkspace(result.workspace);
    workspaceRef.current = result.workspace;
    setWorkspaceId(result.workspace.id);
    persistSelectedClassId(currentUser, result.workspace.id);
    setCreateOpen(false);
    setRosterSource('loading');
    return result.workspace;
  };

  const createClass = async () => {
    if (!canLeaveGradebook()) return;
    setGradebookDirty(false);
    const created = await createClassFromData(classDraft);
    if (!created) return;
    const className = created.classProfile?.className || classDraft.className;
    setClassDraft(EMPTY_CLASS);
    setView('students');
    flash(`Đã tạo lớp ${className}. Hãy nhập danh sách học sinh để bắt đầu.`);
  };

  const openAssignment = async (assignment) => {
    if (!canLeaveGradebook()) return;
    setGradebookDirty(false);
    const existing = findAssignmentClass(activeClasses, assignment);
    if (existing) {
      setWorkspaceId(existing.id);
      setView('gradebook');
      flash(`Đã mở Sổ điểm lớp ${assignment.className} · ${assignment.subject}.`);
      return;
    }

    const created = await createClassFromData({
      className: assignment.className,
      schoolYear: activeClasses[0]?.schoolYear || EMPTY_CLASS.schoolYear,
      semester: activeClasses[0]?.semester || 'Học kỳ I',
      grade: assignment.grade,
      room: '',
      teachingSubject: assignment.subject,
    }, { fromAssignment: assignment });
    if (!created) return;
    setView('students');
    flash(`Đã khởi tạo Sổ điểm ${assignment.className} · ${assignment.subject} từ phân công TTCM.`);
  };

  const activeMeta = activeClasses.find((item) => item.id === workspaceId);
  const studentCount = (workspace?.students || []).filter((item) => item.active !== false).length;
  const activeSubject = workspace?.classProfile?.teachingSubject || activeMeta?.teachingSubject || '';
  const vi = language === 'vi';
  const rosterLabel = rosterStatusLabel(rosterSource, vi);
  const rosterCloudReady = [
    'roster-cloud',
    'roster-cloud-promoted',
    'roster-cloud-empty',
    'roster-realtime',
    'roster-conflict-resolved',
  ].includes(rosterSource);
  const lifecycleText = lifecycleExplanation(lifecycle);
  const canLeaveGradebook = () => !gradebookDirty
    || window.confirm('Sổ điểm đang có thay đổi chưa lưu. Rời bảng nhập sẽ bỏ những thay đổi này. Bạn có chắc muốn tiếp tục?');
  const switchGradebookClass = (nextId) => {
    if (nextId === workspaceId) return;
    if (!canLeaveGradebook()) return;
    setGradebookDirty(false);
    setWorkspaceId(nextId);
  };
  const openStudentRoster = () => {
    if (!canLeaveGradebook()) return;
    setGradebookDirty(false);
    setView('students');
  };
  const requestGradebookAction = (action) => {
    setView('gradebook');
    setGradebookAction((current) => ({ action, workspaceId, seq: (current?.seq || 0) + 1 }));
  };



  // Move existing live actions into the redesigned workspace rather than duplicating them.
  const teachingOverview = teachingAssignments.length ? (
    <section className="gradebook-assignment-panel hr-panel gb4-assignment-panel">
      <div className="gradebook-assignment-head">
        <div><small>BRIAN TEAM · PHÂN CÔNG GIẢNG DẠY</small><h2>{vi ? 'Lớp được phân công' : 'Teaching assignments'}</h2><p>{assignedReadyCount}/{teachingAssignments.length} lớp đã có Sổ điểm riêng. Dữ liệu được đồng bộ từ hồ sơ phân công của TTCM.</p></div>
        <span className="gradebook-assignment-sync">✓ Đã đồng bộ</span>
      </div>
      <div className="gradebook-assignment-grid">
        {teachingAssignments.map((assignment) => {
          const linked = findAssignmentClass(activeClasses, assignment);
          return <article key={assignment.id} className={linked ? 'is-ready' : ''}>
            <div className="gradebook-assignment-icon">{assignment.grade || '∑'}</div>
            <div className="gradebook-assignment-copy">
              <small>{assignment.departmentShortName || assignment.departmentName}</small>
              <h3>{assignment.className}</h3>
              <p>{assignment.subject}{assignment.weeklyPeriods ? ` · ${assignment.weeklyPeriods} tiết/tuần` : ''}</p>
            </div>
            <span className="gradebook-assignment-state">{linked ? 'Đã có sổ' : 'Chưa khởi tạo'}</span>
            <button type="button" disabled={saving} onClick={() => openAssignment(assignment)}>{linked ? 'Mở sổ điểm' : 'Tạo sổ điểm'}</button>
          </article>;
        })}
      </div>

    </section>
  ) : null;
  const classManagement = (
    <section className="gradebook-studio-switcher hr-panel gb4-class-manager">
      <div className="gb4-manager-heading"><strong>Quản lý lớp &amp; học sinh</strong><small>Đổi lớp và quản lý danh sách</small></div>
      <div className="gradebook-studio-class-picker">
        <label>
          <span>{vi ? 'Lớp đang mở' : 'Current class'}</span>
          <select value={workspaceId} onChange={(event) => switchGradebookClass(event.target.value)}>
            {!activeClasses.length ? <option value="">Chưa có lớp</option> : null}
            {activeClasses.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
          </select>
        </label>
        {activeMeta ? <div className="gradebook-studio-class-meta">
          <b>{activeMeta.className}{activeSubject ? ` · ${activeSubject}` : ''}</b>
          <span>{activeMeta.schoolYear || '—'} · {activeMeta.semester || '—'} · {getClassTypeLabel(activeMeta.classType)}</span>
          <em className={`gradebook-roster-status ${rosterCloudReady ? 'is-shared' : 'is-local'}`}>{rosterLabel}</em>
          <em className={`gradebook-lifecycle-badge is-${lifecycle.status}`}>{lifecycle.label}</em>
        </div> : null}
      </div>
      <div className="gradebook-studio-actions">
        <button type="button" className={view === 'gradebook' ? 'primary' : 'secondary'} disabled={!workspace} onClick={() => setView('gradebook')}>∑ {vi ? 'Sổ điểm' : 'Gradebook'}</button>
        <button type="button" className={view === 'students' ? 'primary' : 'secondary'} disabled={!workspace} onClick={openStudentRoster}>♙ {vi ? 'Danh sách học sinh' : 'Students'}</button>
        <button type="button" className="secondary" onClick={() => setCreateOpen((value) => !value)}>＋ {vi ? 'Thêm lớp bộ môn' : 'Add class'}</button>
      </div>

    </section>
  );

  return <div className={`page hr-page gradebook-studio gb4-spectrum gb5-focus gb7-rebirth gb4-palette-${visualPalette}`}>
    <section className="gradebook-studio-hero gb-academic-hero" aria-label="Không gian Sổ điểm">
      <div className="gb-academic-heading">
        <div className="gb7-heading-lockup">
          <span className="gb7-heading-icon" aria-hidden="true"><ClipboardPenLine size={29} strokeWidth={2.1} /></span>
        <div className="gb-academic-heading-copy">
          <span className="gb-academic-eyebrow"><Sparkles size={13} strokeWidth={2.4} aria-hidden="true" /> GRADEBOOK / SỔ ĐIỂM</span>
          <h1>{vi ? 'Sổ điểm' : 'Gradebook'}</h1>
          <p>{vi ? 'Quản lý điểm số, theo dõi tiến độ và đánh giá học tập trực quan' : 'Manage scores and track learning progress'}</p>
          <div className="gb4-hero-signals" aria-label="Thông tin sổ điểm">
            <span><BookOpenCheck size={14} aria-hidden="true" />{activeMeta?.className ? `Lớp ${activeMeta.className}` : 'Academic workspace'}</span>
            <span><UsersRound size={14} aria-hidden="true" />{studentCount} học sinh</span>
            <span><ShieldCheck size={14} aria-hidden="true" />{gradebookDirty ? 'Có thay đổi chưa lưu' : 'Đồng bộ an toàn'}</span>
          </div>
        </div>
        </div>
        <img className="gb-m3-hero-illustration" src="/gradebook-material3-hero.svg" alt="" aria-hidden="true" decoding="async" />
        <span className="gb-academic-class-meta">{activeMeta?.schoolYear || '2026–2027'} · {activeMeta?.semester || 'Học kỳ I'}</span>
      </div>
      <div className="gb-academic-class-row">
        <span className="gb-academic-section-label">{vi ? 'LỚP ĐANG MỞ' : 'ACTIVE CLASS'}</span>
        {activeClasses.length > 12 ? <div className="gb-m3-class-jump">
          <label htmlFor="gb-m3-quick-class">Chuyển nhanh đến lớp</label>
          <select id="gb-m3-quick-class" value={workspaceId} onChange={(event) => switchGradebookClass(event.target.value)} disabled={saving} aria-label="Chuyển nhanh đến lớp">
            {activeClasses.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
          </select>
        </div> : null}
        <div className="gb-academic-class-list" role="group" aria-label="Chọn lớp Sổ điểm">
          {activeClasses.length ? activeClasses.map((item) => (
            <button key={item.id} type="button" className={item.id === workspaceId ? 'is-active' : ''} aria-pressed={item.id === workspaceId} disabled={saving} onClick={() => switchGradebookClass(item.id)} title={classLabel(item)}>{item.className || classLabel(item)}</button>
          )) : <span className="gb-academic-no-classes">Chưa có lớp</span>}
        </div>
      </div>
      <div className="gb-academic-actions">
        <div className="gb-academic-primary-actions">
          <button type="button" className="gb-academic-primary" disabled={!workspace} onClick={() => requestGradebookAction('entry')}><ClipboardPenLine size={17} strokeWidth={2.2} aria-hidden="true" /> {vi ? 'Nhập điểm' : 'Enter scores'}</button>
          <button type="button" disabled={!workspace} onClick={() => requestGradebookAction('summary')}><ChartNoAxesCombined size={17} strokeWidth={2.2} aria-hidden="true" /> {vi ? 'Tổng hợp' : 'Summary'}</button>
          <button type="button" disabled={!workspace} onClick={() => requestGradebookAction('pdf')}><FileDown size={17} strokeWidth={2.2} aria-hidden="true" /> {vi ? 'Xuất báo cáo' : 'Export reports'}</button>
        </div>
        <div className="gb-academic-secondary-actions">
          <button type="button" disabled={!workspace} onClick={openStudentRoster}><UsersRound size={17} strokeWidth={2.2} aria-hidden="true" /> {vi ? 'Danh sách HS' : 'Students'}</button>
          <button type="button" onClick={() => setCreateOpen((value) => !value)}><Plus size={17} strokeWidth={2.2} aria-hidden="true" /> {vi ? 'Thêm lớp' : 'Add class'}</button>
        </div>
        <div className="gb4-palette-selector" role="group" aria-label="Chọn bảng màu Sổ điểm">
          <span><Palette size={15} aria-hidden="true" /> Giao diện</span>
          {[
            { id:'electric', name:'Xanh điện', shade:'#3a66fc' },
            { id:'coral', name:'San hô', shade:'#e45769' },
            { id:'orbit', name:'Tím cực quang', shade:'#7548d9' },
          ].map((palette) => <button key={palette.id} type="button" className="gb4-palette-choice"
            style={{ '--swatch':palette.shade }} title={`Chọn màu ${palette.name}`}
            aria-label={`Bảng màu ${palette.name}`} aria-pressed={visualPalette === palette.id}
            onClick={() => setVisualPalette(palette.id)}>{visualPalette === palette.id ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}</button>)}
        </div>
      </div>
    </section>

    {!teachingAssignments.length && assignmentSource === 'assignment-sync-not-installed' ? <section className="gradebook-assignment-note hr-panel">
      <b>Phân công Brian Team chưa được đồng bộ vào tài khoản này.</b>
      <span>Sổ điểm vẫn hoạt động bình thường bằng các lớp bộ môn tự tạo.</span>
    </section> : null}

    {lifecycleText ? <section className={`gradebook-lifecycle-banner is-${lifecycle.status}`}>
      <div><b>{lifecycle.label}</b><span>{lifecycleText}</span></div>
    </section> : null}

    {createOpen ? <section className="gradebook-studio-create hr-panel">
      <div className="hr-panel-head"><div><small>{vi ? 'THIẾT LẬP NHANH' : 'QUICK SETUP'}</small><h2>{vi ? 'Tạo lớp bộ môn mới' : 'Create a subject class'}</h2><p>{vi ? 'Dùng khi lớp chưa có trong phân công TTCM hoặc giáo viên cần tạo lớp riêng.' : 'Use this when a class is not yet present in department assignments.'}</p></div><button type="button" className="primary" disabled={saving} onClick={createClass}>{saving ? 'Đang tạo…' : 'Tạo lớp'}</button></div>
      <div className="hr-form-grid four">
        <label><span>Tên lớp</span><input value={classDraft.className} onChange={(event) => setClassDraft({ ...classDraft, className: event.target.value })} placeholder="11.3" /></label>
        <label><span>Môn dạy</span><input value={classDraft.teachingSubject} onChange={(event) => setClassDraft({ ...classDraft, teachingSubject: event.target.value })} placeholder="Tiếng Anh" /></label>
        <label><span>Năm học</span><input value={classDraft.schoolYear} onChange={(event) => setClassDraft({ ...classDraft, schoolYear: event.target.value })} /></label>
        <label><span>Khối</span><input value={classDraft.grade} onChange={(event) => setClassDraft({ ...classDraft, grade: event.target.value })} placeholder="11" /></label>
        <label><span>Phòng</span><input value={classDraft.room} onChange={(event) => setClassDraft({ ...classDraft, room: event.target.value })} /></label>
        <label><span>Giai đoạn</span><select value={classDraft.semester} onChange={(event) => setClassDraft({ ...classDraft, semester: event.target.value })}><option>Học kỳ I</option><option>Học kỳ II</option><option>Cả năm</option></select></label>
      </div>
    </section> : null}

    {message ? <div className="gradebook-studio-message" role="status">✓ {message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu sổ điểm…</div> : null}

    {loading && !workspace ? <section className="hr-panel gradebook-studio-empty"><h2>Đang mở lớp…</h2><p>Brian đang tải dữ liệu lớp, roster dùng chung và sổ điểm.</p></section> : null}
    {!loading && !workspace ? <section className="hr-panel gradebook-studio-empty"><h2>{vi ? 'Chưa có lớp để mở sổ điểm' : 'No class yet'}</h2><p>{vi ? 'Chọn một lớp được TTCM phân công ở phía trên hoặc tự tạo lớp bộ môn.' : 'Choose an assigned class above or create a subject class.'}</p><button type="button" className="primary" onClick={() => setCreateOpen(true)}>＋ {vi ? 'Tạo lớp đầu tiên' : 'Create first class'}</button></section> : null}

    {view !== 'gradebook' || !workspace ? <>{teachingOverview}{classManagement}</> : null}

    {workspace && view === 'students' ? <>
      {lifecycle.rosterEditable
        ? <SubjectStudentsTab workspace={workspace} onCommit={commit} />
        : <section className="hr-panel gradebook-roster-readonly"><div><h3>Danh sách học sinh đang ở chế độ chỉ đọc</h3><p>{lifecycleExplanation(lifecycle) || 'Bạn không có quyền chỉnh roster dùng chung của lớp này.'}</p></div></section>}
      <GradebookRosterHistoryPanel
        currentUser={currentUser}
        workspace={workspace}
        canRestore={lifecycle.rosterEditable}
        onRestored={handleRosterRestored}
      />
    </> : null}

    {workspace && view === 'gradebook' ? <GradebookWorkspace workspace={workspace} onCommit={commit} currentUser={currentUser} teachingOverview={teachingOverview} classManagement={classManagement} gradebookAction={gradebookAction} onDirtyChange={setGradebookDirty} /> : null}
  </div>;
}
