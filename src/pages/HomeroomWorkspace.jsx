import React, { useEffect, useState } from 'react';
import HomeroomConductTab from '../components/HomeroomConductTab.jsx';
import {
  AttendanceTab,
  ClassProfileEditor,
  LearningTab,
  OverviewTab,
  ScheduleTab,
  StudentsTab,
} from '../components/homeroom/HomeroomCoreTabs.jsx';
import {
  AnnouncementsTab,
  CompetitionTab,
  FeedbackTab,
  MeetingsTab,
  ParentsTab,
  PortalsTab,
  RecordsTab,
  SchoolStatsTab,
} from '../components/homeroom/HomeroomCommunicationTabs.jsx';
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
  loadHomeroomWorkspace,
  makeDefaultHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
  setCurrentHomeroomWorkspaceId,
  setHomeroomWorkspaceStatus,
} from '../utils/homeroomStore.js';
import { makeWorkspaceId, prepareWorkspaceCommit } from '../utils/homeroomPhase3.js';
import { HOMEROOM_TABS } from '../data/homeroom.js';
import '../styles/homeroom-complete.css';

function Tabs({ active, setActive, language, currentUser }) {
  return <nav className="hr-tabs" aria-label={language === 'vi' ? 'Chức năng giáo viên chủ nhiệm' : 'Homeroom tools'}>
    {HOMEROOM_TABS.filter((tab) => !tab.adminOnly || currentUser?.role === 'admin').map((tab) => <button key={tab.key} type="button" className={active === tab.key ? 'active' : ''} onClick={() => setActive(tab.key)}><span>{tab.icon}</span><b>{language === 'vi' ? tab.titleVi : tab.title}</b></button>)}
  </nav>;
}

export default function HomeroomWorkspace({ language = 'vi', currentUser }) {
  const [workspaceId, setWorkspaceId] = useState(() => getCurrentHomeroomWorkspaceId(currentUser));
  const [workspace, setWorkspace] = useState(() => makeDefaultHomeroomWorkspace(currentUser));
  const [catalog, setCatalog] = useState([]);
  const [classDraft, setClassDraft] = useState(() => makeDefaultHomeroomWorkspace(currentUser).classProfile);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState('local');

  const refreshCatalog = async () => {
    const result = await listHomeroomWorkspaces(currentUser);
    setCatalog(result.items || []);
    return result.items || [];
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadHomeroomWorkspace(currentUser, workspaceId).then((result) => {
      if (!alive) return;
      const loaded = normalizeHomeroomWorkspace(result.workspace, currentUser);
      setWorkspace(loaded);
      setClassDraft(loaded.classProfile);
      setSyncState(result.source === 'cloud' ? 'cloud' : 'local');
      setCurrentHomeroomWorkspaceId(currentUser, loaded.id);
      refreshCatalog();
      setLoading(false);
    });
    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.email, workspaceId]);

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

  const switchWorkspace = (id) => {
    if (!id || id === workspaceId) return;
    setCurrentHomeroomWorkspaceId(currentUser, id);
    setWorkspaceId(id);
    setActiveTab('overview');
  };

  const createWorkspace = async (input) => {
    const id = makeWorkspaceId(input.className, input.schoolYear);
    const result = await createHomeroomWorkspace(currentUser, {
      id,
      semester: input.semester,
      classProfile: {
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
    const result = await duplicateHomeroomWorkspace(workspace, currentUser, { ...input, id });
    await refreshCatalog();
    if (result.ok) switchWorkspace(result.workspace.id);
    else flash(result.message || 'Không thể sao chép lớp.');
  };

  const changeWorkspaceStatus = async (id, status) => {
    const targetResult = id === workspace.id ? { workspace } : await loadHomeroomWorkspace(currentUser, id);
    if (!targetResult.workspace) return;
    const result = await setHomeroomWorkspaceStatus(targetResult.workspace, currentUser, status);
    const items = await refreshCatalog();
    if (id === workspace.id && status === 'archived') {
      const fallback = items.find((item) => item.status !== 'archived' && item.id !== id);
      if (fallback) switchWorkspace(fallback.id);
    }
    flash(result.ok ? (status === 'archived' ? 'Đã lưu trữ lớp.' : 'Đã khôi phục lớp.') : result.message || 'Không thể cập nhật lớp.');
  };

  const saveClassProfile = () => commit({ ...workspace, classProfile: classDraft }, 'Đã lưu thông tin lớp chủ nhiệm.');
  const className = workspace.classProfile?.className || 'Chưa thiết lập lớp';
  const activeStudents = workspace.students.filter((item) => item.active !== false).length;

  if (loading) return <div className="page hr-page"><section className="hr-panel hr-loading"><span /><h2>Đang mở không gian chủ nhiệm…</h2></section></div>;

  return <div className="page hr-page">
    <section className="hr-hero">
      <div className="hr-hero-copy"><p>HOMEROOM TEACHER WORKSPACE · COMPLETE</p><h1>{language === 'vi' ? 'Giáo viên chủ nhiệm' : 'Homeroom Teacher'}</h1><span>{className} · {workspace.classProfile?.schoolYear || '—'} · {activeStudents} {language === 'vi' ? 'học sinh' : 'students'}</span></div>
      <div className="hr-hero-art" aria-hidden="true"><div className="hr-board"><i /><i /><i /><b>{workspace.classProfile?.className || 'GVCN'}</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
      <aside className="hr-hero-meta"><span className={`hr-sync ${syncState}`}><i />{syncState === 'cloud' ? 'Đã đồng bộ Supabase' : 'Đang lưu trên thiết bị'}</span><b>{currentUser?.name || currentUser?.email || 'Giáo viên'}</b><small>{workspace.classProfile?.adviserEmail || currentUser?.email || ''}</small><span className="hrc-offline-badge">Nhận diện ngoại tuyến · Không dùng AI</span></aside>
    </section>

    <Tabs active={activeTab} setActive={setActiveTab} language={language} currentUser={currentUser} />
    {message ? <div className="hr-toast"><span>✓</span>{message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu lớp chủ nhiệm…</div> : null}

    {(!workspace.classProfile?.className || activeTab === 'overview') ? <ClassProfileEditor value={classDraft} onChange={setClassDraft} onSave={saveClassProfile} saving={saving} language={language} /> : null}

    <main className="hr-workspace-body">
      {activeTab === 'overview' ? <OverviewTab workspace={workspace} goTab={setActiveTab} /> : null}
      {activeTab === 'classes' ? <ClassLifecycleTab workspace={workspace} catalog={catalog} currentId={workspaceId} onSwitch={switchWorkspace} onCreate={createWorkspace} onDuplicate={duplicateWorkspace} onStatusChange={changeWorkspaceStatus} currentUser={currentUser} /> : null}
      {activeTab === 'search' ? <SearchCommandTab workspace={workspace} onCommit={commit} goTab={setActiveTab} /> : null}
      {activeTab === 'students' ? <StudentsTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'support' ? <StudentSupportTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'attendance' ? <AttendanceTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'learning' ? <LearningTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'feedback' ? <FeedbackTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'competition' ? <CompetitionTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'conduct' ? <HomeroomConductTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'schedule' ? <ScheduleTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'meetings' ? <MeetingsTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'parents' ? <ParentsTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'announcements' ? <AnnouncementsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'portals' ? <PortalsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'records' ? <RecordsTab workspace={workspace} onCommit={commit} /> : null}
      {activeTab === 'safety' ? <DataSafetyTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {activeTab === 'schoolStats' ? <SchoolStatsTab currentUser={currentUser} /> : null}
    </main>
  </div>;
}
