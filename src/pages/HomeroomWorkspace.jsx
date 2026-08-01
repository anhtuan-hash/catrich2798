import React, { useEffect, useState } from 'react';
import HomeroomConductTab from '../components/HomeroomConductTab.jsx';
import HomeroomLearningGradebook from '../components/homeroom/HomeroomLearningGradebook.jsx';
import {
  AttendanceTab,
  OverviewTab,
  ScheduleTab,
  StudentsTab,
} from '../components/homeroom/HomeroomCoreTabs.jsx';
import HomeroomClassProfileEditor from '../components/homeroom/HomeroomClassProfileEditor.jsx';
import SubjectStudentsTab from '../components/homeroom/SubjectStudentsTab.jsx';
import HomeroomNavigationPalette from '../components/homeroom/HomeroomNavigationPalette.jsx';
import {
  AnnouncementsTab,
  CompetitionTab,
  FeedbackTab,
  MeetingsTab,
  ParentsTab,
  PortalsTab,
  RecordsTab,
} from '../components/homeroom/HomeroomCommunicationTabs.jsx';
import SchoolStatsTab from '../components/homeroom/SchoolStatsCompactTab.jsx';
import {
  ClassLifecycleTab,
  DataSafetyTab,
  SearchCommandTab,
  StudentSupportTab,
} from '../components/HomeroomPhase3Tabs.jsx';
import {
  createHomeroomWorkspace,
  duplicateHomeroomWorkspace,
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces,
  listLocalHomeroomWorkspaces,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
  makeDefaultHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
  setCurrentHomeroomWorkspaceId,
  setHomeroomWorkspaceStatus,
} from '../utils/homeroomClassWorkspaceStore.js';
import { makeWorkspaceId, prepareWorkspaceCommit } from '../utils/homeroomPhase3.js';
import {
  HOMEROOM_CLASS_TYPE,
  SUBJECT_CLASS_TYPE,
  applyCatalogClassType,
  getClassTypeLabel,
  getDefaultClassTab,
  getWorkspaceClassType,
  isClassTabAllowed,
  isSubjectClass,
  normalizeHomeroomClassType,
} from '../utils/homeroomClassTypes.js';
import '../styles/homeroom-complete.css';
import '../components/GlobalHomeroomGoogleRedesign.css';
import '../components/GlobalHomeroomGoogleColorPolish.css';
import '../components/GlobalHomeroomGoogleReadabilityPolish.css';
import '../components/homeroom/HomeroomNavigationPalette.css';

export default function HomeroomWorkspace({ language = 'vi', currentUser }) {
  const [workspaceId, setWorkspaceId] = useState(() => getCurrentHomeroomWorkspaceId(currentUser));
  const [workspace, setWorkspace] = useState(() => makeDefaultHomeroomWorkspace(currentUser));
  const [catalog, setCatalog] = useState(() => listLocalHomeroomWorkspaces(currentUser));
  const [classDraft, setClassDraft] = useState(() => makeDefaultHomeroomWorkspace(currentUser).classProfile);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState('local');

  const refreshCatalog = async () => {
    const localItems = listLocalHomeroomWorkspaces(currentUser);
    setCatalog(localItems);
    const result = await listHomeroomWorkspaces(currentUser);
    const items = result.items || localItems;
    setCatalog(items);
    return items;
  };

  useEffect(() => {
    let alive = true;
    const localItems = listLocalHomeroomWorkspaces(currentUser);
    const localWorkspace = loadLocalHomeroomWorkspace(currentUser, workspaceId);

    if (localWorkspace) {
      const cached = applyCatalogClassType(normalizeHomeroomWorkspace(localWorkspace, currentUser), localItems);
      setWorkspace(cached);
      setClassDraft(cached.classProfile);
      setSyncState('local');
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        const items = await refreshCatalog();
        const result = await loadHomeroomWorkspace(currentUser, workspaceId);
        if (!alive) return;
        const normalized = normalizeHomeroomWorkspace(result.workspace, currentUser);
        const loaded = applyCatalogClassType(normalized, items);
        if (getWorkspaceClassType(loaded) !== getWorkspaceClassType(normalized)) {
          const migration = await saveHomeroomWorkspace(loaded, currentUser);
          if (!alive) return;
          setSyncState(migration.offline ? 'local' : 'cloud');
        } else {
          setSyncState(result.source === 'cloud' ? 'cloud' : 'local');
        }
        setWorkspace(loaded);
        setClassDraft(loaded.classProfile);
        setCurrentHomeroomWorkspaceId(currentUser, loaded.id);
        setLoading(false);
      } catch {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.email, workspaceId]);

  useEffect(() => {
    if (!isClassTabAllowed(activeTab, workspace, currentUser?.role === 'admin')) {
      setActiveTab(getDefaultClassTab(workspace));
    }
  }, [activeTab, workspace.id, workspace.classProfile?.classType, currentUser?.role]);

  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__besHomeroomMsg);
    window.__besHomeroomMsg = window.setTimeout(() => setMessage(''), 3800);
  };

  const commit = async (next, successMessage = 'Đã lưu dữ liệu.') => {
    const normalized = prepareWorkspaceCommit(workspace, next, currentUser, successMessage);
    setWorkspace(normalized);
    setClassDraft(normalized.classProfile);
    saveLocalHomeroomWorkspace(normalized, currentUser);
    setSaving(true);
    const result = await saveHomeroomWorkspace(normalized, currentUser);
    setSaving(false);
    if (result.ok) {
      const saved = result.workspace || normalized;
      setWorkspace(saved);
      setClassDraft(saved.classProfile);
      setSyncState(result.offline ? 'local' : 'cloud');
      flash(successMessage);
    } else {
      setSyncState('local');
      flash(`${successMessage} Dữ liệu đã lưu trên thiết bị; cloud chưa đồng bộ: ${result.message || 'lỗi chưa xác định'}`);
    }
    await refreshCatalog();
    return result;
  };

  const reserveHomeroomSlot = async (requestedType, targetId, targetName) => {
    if (normalizeHomeroomClassType(requestedType, SUBJECT_CLASS_TYPE) !== HOMEROOM_CLASS_TYPE) return true;
    const conflict = catalog.find((item) => item.status !== 'archived' && item.id !== targetId && item.classType === HOMEROOM_CLASS_TYPE);
    if (!conflict) return true;
    const confirmed = window.confirm(`Lớp ${conflict.className} đang là lớp chủ nhiệm. Chuyển lớp này thành lớp bộ môn và đặt ${targetName || 'lớp mới'} làm lớp chủ nhiệm?`);
    if (!confirmed) return false;

    const loaded = conflict.id === workspace.id ? { workspace } : await loadHomeroomWorkspace(currentUser, conflict.id);
    if (!loaded.workspace) {
      flash('Không thể mở lớp chủ nhiệm hiện tại để đổi loại.');
      return false;
    }
    const demoted = normalizeHomeroomWorkspace({
      ...loaded.workspace,
      classProfile: { ...loaded.workspace.classProfile, classType: SUBJECT_CLASS_TYPE },
    }, currentUser);
    const result = await saveHomeroomWorkspace(demoted, currentUser);
    if (!result.ok) {
      flash(result.message || 'Không thể chuyển lớp chủ nhiệm hiện tại thành lớp bộ môn.');
      return false;
    }
    if (conflict.id === workspace.id) {
      setWorkspace(result.workspace || demoted);
      setClassDraft((result.workspace || demoted).classProfile);
    }
    await refreshCatalog();
    return true;
  };

  const switchWorkspace = (id) => {
    if (!id || id === workspaceId) return;
    const target = catalog.find((item) => item.id === id);
    setCurrentHomeroomWorkspaceId(currentUser, id);
    setWorkspaceId(id);
    setActiveTab(target?.classType === SUBJECT_CLASS_TYPE ? 'learning' : 'overview');
  };

  const createWorkspace = async (input) => {
    const id = makeWorkspaceId(input.className, input.schoolYear);
    if (!await reserveHomeroomSlot(input.classType, id, input.className)) return;
    const result = await createHomeroomWorkspace(currentUser, {
      id,
      semester: input.semester,
      classProfile: {
        classType: normalizeHomeroomClassType(input.classType, SUBJECT_CLASS_TYPE),
        className: input.className,
        schoolYear: input.schoolYear,
        grade: input.grade,
        room: input.room,
        adviserName: currentUser?.name || currentUser?.email || '',
        adviserEmail: currentUser?.email || '',
      },
    });
    await refreshCatalog();
    if (result.ok) switchWorkspace(result.workspace.id);
    else flash(result.message || 'Không thể tạo lớp.');
  };

  const duplicateWorkspace = async (input) => {
    const id = makeWorkspaceId(input.className, input.schoolYear);
    if (!await reserveHomeroomSlot(input.classType, id, input.className)) return;
    const result = await duplicateHomeroomWorkspace(workspace, currentUser, { ...input, id });
    await refreshCatalog();
    if (result.ok) switchWorkspace(result.workspace.id);
    else flash(result.message || 'Không thể sao chép lớp.');
  };

  const changeWorkspaceStatus = async (id, status) => {
    const targetResult = id === workspace.id ? { workspace } : await loadHomeroomWorkspace(currentUser, id);
    if (!targetResult.workspace) return;
    if (status === 'active' && !await reserveHomeroomSlot(targetResult.workspace.classProfile?.classType, id, targetResult.workspace.classProfile?.className)) return;
    const result = await setHomeroomWorkspaceStatus(targetResult.workspace, currentUser, status);
    const items = await refreshCatalog();
    if (id === workspace.id && status === 'archived') {
      const fallback = items.find((item) => item.status !== 'archived' && item.id !== id);
      if (fallback) switchWorkspace(fallback.id);
    }
    flash(result.ok ? (status === 'archived' ? 'Đã lưu trữ lớp.' : 'Đã khôi phục lớp.') : result.message || 'Không thể cập nhật lớp.');
  };

  const saveClassProfile = async () => {
    if (!await reserveHomeroomSlot(classDraft.classType, workspace.id, classDraft.className)) return;
    const classType = normalizeHomeroomClassType(classDraft.classType);
    await commit({ ...workspace, classProfile: { ...classDraft, classType } }, `Đã lưu thông tin ${getClassTypeLabel(classType).toLowerCase()}.`);
  };
  const className = workspace.classProfile?.className || 'Chưa thiết lập lớp';
  const activeStudents = workspace.students.filter((item) => item.active !== false).length;
  const subjectMode = isSubjectClass(workspace);
  const visibleTab = isClassTabAllowed(activeTab, workspace, currentUser?.role === 'admin') ? activeTab : getDefaultClassTab(workspace);
  const classTypeLabel = getClassTypeLabel(getWorkspaceClassType(workspace), language);

  if (loading) return <div className="page hr-page"><section className="hr-panel hr-loading"><span /><h2>Đang mở không gian lớp…</h2></section></div>;

  return <div className={`page hr-page ${subjectMode ? 'is-subject-class' : 'is-homeroom-class'}`}>
    <section className="hr-hero">
      <div className="hr-hero-copy"><p>{subjectMode ? 'SUBJECT TEACHER WORKSPACE · FOCUSED' : 'HOMEROOM TEACHER WORKSPACE · COMPLETE'}</p><div className={`hr-class-type-badge hero ${getWorkspaceClassType(workspace)}`}>{classTypeLabel}</div><h1>{language === 'vi' ? (subjectMode ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm') : (subjectMode ? 'Subject Teacher' : 'Homeroom Teacher')}</h1><span>{className} · {workspace.classProfile?.schoolYear || '—'} · {activeStudents} {language === 'vi' ? 'học sinh' : 'students'}</span></div>
      <div className="hr-hero-art" aria-hidden="true"><div className="hr-board"><i /><i /><i /><b>{workspace.classProfile?.className || (subjectMode ? 'GVBM' : 'GVCN')}</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
      <aside className="hr-hero-meta"><span className={`hr-sync ${syncState}`}><i />{syncState === 'cloud' ? 'Đã đồng bộ Supabase' : 'Đang lưu trên thiết bị'}</span><b>{currentUser?.name || currentUser?.email || 'Giáo viên'}</b><small>{workspace.classProfile?.adviserEmail || currentUser?.email || ''}</small><span className="hrc-offline-badge">{subjectMode ? 'Chế độ bộ môn · Chỉ lớp và điểm' : 'Không gian GVCN đầy đủ'}</span></aside>
    </section>

    <HomeroomNavigationPalette key={currentUser?.id || currentUser?.authId || currentUser?.email || 'guest'} active={visibleTab} setActive={setActiveTab} language={language} currentUser={currentUser} workspace={workspace} />
    {message ? <div className="hr-toast"><span>✓</span>{message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu lớp…</div> : null}

    {(!workspace.classProfile?.className || visibleTab === (subjectMode ? 'classes' : 'overview')) ? <HomeroomClassProfileEditor value={classDraft} onChange={setClassDraft} onSave={saveClassProfile} saving={saving} language={language} /> : null}

    <main className="hr-workspace-body">
      {visibleTab === 'overview' ? <OverviewTab workspace={workspace} goTab={setActiveTab} /> : null}
      {visibleTab === 'classes' ? <ClassLifecycleTab workspace={workspace} catalog={catalog} currentId={workspaceId} onSwitch={switchWorkspace} onCreate={createWorkspace} onDuplicate={duplicateWorkspace} onStatusChange={changeWorkspaceStatus} currentUser={currentUser} /> : null}
      {visibleTab === 'search' ? <SearchCommandTab workspace={workspace} onCommit={commit} goTab={setActiveTab} /> : null}
      {visibleTab === 'students' ? (subjectMode ? <SubjectStudentsTab workspace={workspace} onCommit={commit} /> : <StudentsTab workspace={workspace} onCommit={commit} />) : null}
      {visibleTab === 'support' ? <StudentSupportTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'attendance' ? <AttendanceTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'learning' ? <HomeroomLearningGradebook workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'feedback' ? <FeedbackTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'competition' ? <CompetitionTab workspace={workspace} onCommit={commit} /> : null}
      {visibleTab === 'conduct' ? <HomeroomConductTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'schedule' ? <ScheduleTab workspace={workspace} onCommit={commit} /> : null}
      {visibleTab === 'meetings' ? <MeetingsTab workspace={workspace} onCommit={commit} /> : null}
      {visibleTab === 'parents' ? <ParentsTab workspace={workspace} onCommit={commit} /> : null}
      {visibleTab === 'announcements' ? <AnnouncementsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'portals' ? <PortalsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'records' ? <RecordsTab workspace={workspace} onCommit={commit} /> : null}
      {visibleTab === 'safety' ? <DataSafetyTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'schoolStats' ? <SchoolStatsTab currentUser={currentUser} /> : null}
    </main>
  </div>;
}
