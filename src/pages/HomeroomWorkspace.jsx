import React, { useEffect, useRef, useState } from 'react';
import HomeroomConductTab from '../components/HomeroomConductTab.jsx';
import HomeroomOverviewCompactTab from '../components/homeroom/HomeroomOverviewCompactTab.jsx';
import {
  AttendanceTab,
  StudentsTab,
} from '../components/homeroom/HomeroomCoreTabs.jsx';
import HomeroomClassProfileEditor from '../components/homeroom/HomeroomClassProfileEditor.jsx';
import SubjectStudentsTab from '../components/homeroom/SubjectStudentsTab.jsx';
import HomeroomNavigationPalette from '../components/homeroom/HomeroomNavigationPalette.jsx';
import HomeroomGlassHero from '../components/homeroom/HomeroomGlassHero.jsx';
import {
  ClassLifecycleTab,
  DataSafetyTab,
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
import { consumePendingHomeroomAction } from '../commandCenter/commandCenterCore.js';
import '../styles/homeroom-complete.css';
import '../components/GlobalHomeroomGoogleRedesign.css';
import '../components/GlobalHomeroomGoogleColorPolish.css';
import '../components/GlobalHomeroomGoogleReadabilityPolish.css';
import '../components/homeroom/HomeroomNavigationPalette.css';
import '../components/homeroom/HomeroomGlassHero.css';

// Homeroom owns homeroom duties only. Gradebook is a separate teacher app.
// Keep the last usable class snapshot so remounts never blank this data-heavy route.
const homeroomSessionCache = new Map();

function userIdentity(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function snapshotKey(user, workspaceId) {
  return `${userIdentity(user)}:${String(workspaceId || 'default')}`;
}

function assignedHomeroomWorkspaceId() {
  if (typeof window === 'undefined') return '';
  return String(window.__besAssignedHomeroomWorkspaceId || '').trim();
}

function getInitialWorkspace(user, workspaceId) {
  const cached = homeroomSessionCache.get(snapshotKey(user, workspaceId));
  if (cached) return cached;
  const local = loadLocalHomeroomWorkspace(user, workspaceId);
  return local ? normalizeHomeroomWorkspace(local, user) : makeDefaultHomeroomWorkspace(user);
}

export default function HomeroomWorkspace({ language = 'vi', currentUser }) {
  // Server assignment, when available, is stronger than any stale local current-id.
  // applicationBootstrap resolves it before first mount on a direct Homeroom entry.
  const initialWorkspaceId = assignedHomeroomWorkspaceId() || getCurrentHomeroomWorkspaceId(currentUser);
  const initialWorkspace = getInitialWorkspace(currentUser, initialWorkspaceId);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [catalog, setCatalog] = useState(() => listLocalHomeroomWorkspaces(currentUser));
  const [classDraft, setClassDraft] = useState(initialWorkspace.classProfile);
  const [activeTab, setActiveTab] = useState(() => getDefaultClassTab(initialWorkspace));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState('local');
  const [commandTarget, setCommandTarget] = useState(null);
  const hydrationSequenceRef = useRef(0);

  useEffect(() => {
    if (!workspace?.id) return;
    homeroomSessionCache.set(snapshotKey(currentUser, workspace.id), workspace);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspace]);

  const refreshCatalog = async () => {
    const localItems = listLocalHomeroomWorkspaces(currentUser);
    if (localItems.length) setCatalog(localItems);
    const result = await listHomeroomWorkspaces(currentUser);
    const items = result.items || localItems;
    setCatalog(items);
    return items;
  };

  useEffect(() => {
    let alive = true;
    const sequence = ++hydrationSequenceRef.current;
    const localItems = listLocalHomeroomWorkspaces(currentUser);
    const localWorkspace = loadLocalHomeroomWorkspace(currentUser, workspaceId);
    const cachedWorkspace = homeroomSessionCache.get(snapshotKey(currentUser, workspaceId));
    const immediateWorkspace = cachedWorkspace || localWorkspace;

    if (immediateWorkspace) {
      const cached = applyCatalogClassType(normalizeHomeroomWorkspace(immediateWorkspace, currentUser), localItems);
      setWorkspace(cached);
      setClassDraft(cached.classProfile);
      setActiveTab((current) => isClassTabAllowed(current, cached, currentUser?.role === 'admin') ? current : getDefaultClassTab(cached));
      homeroomSessionCache.set(snapshotKey(currentUser, cached.id), cached);
      setSyncState('local');
    }
    setLoading(false);

    (async () => {
      try {
        const items = await refreshCatalog();
        const result = await loadHomeroomWorkspace(currentUser, workspaceId);
        if (!alive || sequence !== hydrationSequenceRef.current) return;

        // A slow request for a previously selected/random class must never commit
        // after the Admin assignment has become known. Move React state to the
        // authoritative id and let the next hydration load that class instead.
        const authoritativeId = assignedHomeroomWorkspaceId();
        if (authoritativeId && workspaceId !== authoritativeId) {
          setCurrentHomeroomWorkspaceId(currentUser, authoritativeId);
          setWorkspaceId(authoritativeId);
          setCommandTarget({ workspaceId: authoritativeId, tab: 'overview', studentQuery: '' });
          return;
        }

        const normalized = normalizeHomeroomWorkspace(result.workspace, currentUser);
        const loaded = applyCatalogClassType(normalized, items);
        if (authoritativeId && loaded.id !== authoritativeId) return;
        setSyncState(result.source === 'cloud' ? 'cloud' : 'local');
        setWorkspace(loaded);
        setClassDraft(loaded.classProfile);
        setActiveTab((current) => isClassTabAllowed(current, loaded, currentUser?.role === 'admin') ? current : getDefaultClassTab(loaded));
        homeroomSessionCache.set(snapshotKey(currentUser, loaded.id), loaded);
        setCurrentHomeroomWorkspaceId(currentUser, loaded.id);
      } finally {
        if (alive && sequence === hydrationSequenceRef.current) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspaceId]);

  useEffect(() => {
    // Consume the assignment event directly inside React. This removes the last
    // dependency on an external navigation event arriving after our listener.
    const onAssignedHomeroom = (event) => {
      const targetWorkspaceId = String(event?.detail?.homeroomWorkspaceId || '').trim();
      if (!targetWorkspaceId) return;
      window.__besAssignedHomeroomWorkspaceId = targetWorkspaceId;
      setCurrentHomeroomWorkspaceId(currentUser, targetWorkspaceId);
      setCommandTarget({ workspaceId: targetWorkspaceId, tab: 'overview', studentQuery: '' });
      if (targetWorkspaceId !== workspaceId) setWorkspaceId(targetWorkspaceId);
    };
    window.addEventListener('bes-school-class-assignment-synced', onAssignedHomeroom);

    const alreadyAssigned = assignedHomeroomWorkspaceId();
    if (alreadyAssigned && alreadyAssigned !== workspaceId) {
      setCurrentHomeroomWorkspaceId(currentUser, alreadyAssigned);
      setCommandTarget({ workspaceId: alreadyAssigned, tab: 'overview', studentQuery: '' });
      setWorkspaceId(alreadyAssigned);
    }

    return () => window.removeEventListener('bes-school-class-assignment-synced', onAssignedHomeroom);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspaceId]);

  useEffect(() => {
    const acceptCommand = (action) => {
      if (!action || action.type !== 'homeroom.navigate') return;
      const authoritativeId = assignedHomeroomWorkspaceId();
      const requestedWorkspaceId = String(action.workspaceId || workspaceId || '').trim();
      const isServerAssignment = action.source === 'server-assignment'
        || action.source === 'assigned-school-class-sync'
        || action.source === 'assigned-homeroom-entry-guard';

      // Generic/stale entry commands may carry a workspace id from before the
      // current Admin assignment. Once server authority is known they cannot pull
      // the app away from the assigned homeroom. Explicit in-app class switching
      // uses switchWorkspace directly and remains available where permitted.
      const targetWorkspaceId = authoritativeId && requestedWorkspaceId !== authoritativeId && !isServerAssignment
        ? authoritativeId
        : requestedWorkspaceId;
      setCommandTarget({
        workspaceId: targetWorkspaceId,
        tab: String(action.tab || 'overview'),
        studentQuery: String(action.studentQuery || ''),
      });
      if (targetWorkspaceId && targetWorkspaceId !== workspaceId) {
        setCurrentHomeroomWorkspaceId(currentUser, targetWorkspaceId);
        setWorkspaceId(targetWorkspaceId);
      }
    };
    const onCommand = (event) => acceptCommand(event?.detail);
    window.addEventListener('bes-homeroom-command', onCommand);
    const pending = consumePendingHomeroomAction();
    if (pending) acceptCommand(pending);
    return () => window.removeEventListener('bes-homeroom-command', onCommand);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspaceId]);

  useEffect(() => {
    if (!commandTarget || loading) return;
    if (commandTarget.workspaceId && commandTarget.workspaceId !== workspace.id) return;
    const requestedTab = commandTarget.tab || getDefaultClassTab(workspace);
    setActiveTab(isClassTabAllowed(requestedTab, workspace, currentUser?.role === 'admin') ? requestedTab : getDefaultClassTab(workspace));
    if (commandTarget.studentQuery) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('bes-homeroom-student-query', {
          detail: { query: commandTarget.studentQuery, workspaceId: workspace.id },
        }));
      }, 120);
    }
    setCommandTarget(null);
  }, [commandTarget, loading, workspace.id, workspace.classProfile?.classType, currentUser?.role]);

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
    homeroomSessionCache.set(snapshotKey(currentUser, normalized.id), normalized);
    saveLocalHomeroomWorkspace(normalized, currentUser);
    setSaving(true);
    const result = await saveHomeroomWorkspace(normalized, currentUser);
    setSaving(false);
    if (result.ok) {
      const saved = result.workspace || normalized;
      setWorkspace(saved);
      setClassDraft(saved.classProfile);
      homeroomSessionCache.set(snapshotKey(currentUser, saved.id), saved);
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
      const nextWorkspace = result.workspace || demoted;
      setWorkspace(nextWorkspace);
      setClassDraft(nextWorkspace.classProfile);
      homeroomSessionCache.set(snapshotKey(currentUser, nextWorkspace.id), nextWorkspace);
    }
    await refreshCatalog();
    return true;
  };

  const switchWorkspace = (id) => {
    if (!id || id === workspaceId) return;
    const target = catalog.find((item) => item.id === id);
    const localTarget = homeroomSessionCache.get(snapshotKey(currentUser, id)) || loadLocalHomeroomWorkspace(currentUser, id);
    if (localTarget) {
      const normalizedTarget = normalizeHomeroomWorkspace(localTarget, currentUser);
      setWorkspace(normalizedTarget);
      setClassDraft(normalizedTarget.classProfile);
    }
    setCurrentHomeroomWorkspaceId(currentUser, id);
    setWorkspaceId(id);
    setActiveTab(target?.classType === SUBJECT_CLASS_TYPE ? 'students' : 'overview');
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

  const activeStudents = Array.isArray(workspace?.students)
    ? workspace.students.filter((item) => item.active !== false).length
    : 0;
  const subjectMode = isSubjectClass(workspace);
  const visibleTab = isClassTabAllowed(activeTab, workspace, currentUser?.role === 'admin') ? activeTab : getDefaultClassTab(workspace);
  const classTypeLabel = getClassTypeLabel(getWorkspaceClassType(workspace), language);

  return <div className={`page hr-page ${subjectMode ? 'is-subject-class' : 'is-homeroom-class'}`} data-homeroom-hydrated="true">
    <HomeroomGlassHero
      workspace={workspace}
      currentUser={currentUser}
      syncState={syncState}
      language={language}
      subjectMode={subjectMode}
      classTypeLabel={classTypeLabel}
      activeStudents={activeStudents}
    />

    <HomeroomNavigationPalette key={currentUser?.id || currentUser?.authId || currentUser?.email || 'guest'} active={visibleTab} setActive={setActiveTab} language={language} currentUser={currentUser} workspace={workspace} />
    {message ? <div className="hr-toast"><span>✓</span>{message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu lớp…</div> : null}

    {(!workspace.classProfile?.className || visibleTab === (subjectMode ? 'classes' : 'overview')) ? <HomeroomClassProfileEditor value={classDraft} onChange={setClassDraft} onSave={saveClassProfile} saving={saving} language={language} /> : null}

    <main className="hr-workspace-body">
      {visibleTab === 'overview' ? <HomeroomOverviewCompactTab workspace={workspace} goTab={setActiveTab} /> : null}
      {visibleTab === 'classes' ? <ClassLifecycleTab workspace={workspace} catalog={catalog} currentId={workspaceId} onSwitch={switchWorkspace} onCreate={createWorkspace} onDuplicate={duplicateWorkspace} onStatusChange={changeWorkspaceStatus} currentUser={currentUser} /> : null}
      {visibleTab === 'students' ? (subjectMode ? <SubjectStudentsTab workspace={workspace} onCommit={commit} /> : <StudentsTab workspace={workspace} onCommit={commit} />) : null}
      {visibleTab === 'attendance' ? <AttendanceTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'conduct' ? <HomeroomConductTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'safety' ? <DataSafetyTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
    </main>
  </div>;
}