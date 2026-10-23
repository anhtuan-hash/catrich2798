import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { fastPreferredHomeroom, listFastHomeroomCatalog } from '../utils/homeroomFastEntry.js';
import HomeroomOverviewCompactTab from '../components/homeroom/HomeroomOverviewCompactTab.jsx';





import HomeroomNavigationPalette from '../components/homeroom/HomeroomNavigationPalette.jsx';
import HomeroomGlassHero from '../components/homeroom/HomeroomGlassHero.jsx';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  HOMEROOM_HERO_UPDATED_EVENT, DEFAULT_HOMEROOM_HERO, normalizeHomeroomHero, readHomeroomHero,
} from '../utils/homeroomHeroCms.js';


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
  setCurrentHomeroomWorkspaceId,
  setHomeroomWorkspaceStatus,
} from '../utils/homeroomClassWorkspaceStore.js';
import { makeWorkspaceId, prepareWorkspaceCommit } from '../utils/homeroomPhase3.js';
import { flushPendingAssignedStudentRosters, syncAssignedStudentRosterDelta } from '../utils/assignedStudentRosterSync.js';
import { isHomeroomStudentListOnlyChange, mergeHomeroomStudentListAfterConflict } from '../utils/homeroomStudentConflictMerge.js';
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
// Homeroom 4.0 Phase 1: scoped tokens only; no visual changes yet.
import '../styles/homeroom-4-tokens.css';
// Gated Homeroom-only presentation layer; no styles escape .hr-v4.
import '../styles/homeroom-4-expressive.css';
import '../styles/homeroom-4-loading.css';
import '../styles/homeroom-hero-cms.css';

// Homeroom 4.0 final pass: keep the initial assigned-class shell light.
// Large feature modules are downloaded only after their tab is requested.
// React.lazy caching retains component state while its tab is active; no RPC
// or class selection occurs during these module imports.
const HomeroomHeroEditor = lazy(() => import('../components/HomeroomHeroEditor.jsx'));
const HomeroomConductTab = lazy(() => import('../components/HomeroomConductTab.jsx'));
const AttendanceTab = lazy(() => import('../components/homeroom/HomeroomCoreTabs.jsx').then((mod) => ({ default: mod.AttendanceTab })));
const HomeroomClassProfileEditor = lazy(() => import('../components/homeroom/HomeroomClassProfileEditor.jsx'));
const SubjectStudentsTab = lazy(() => import('../components/homeroom/SubjectStudentsTab.jsx'));
const HomeroomStudentHub = lazy(() => import('../components/homeroom/HomeroomStudentHub.jsx'));
const HomeroomEngagement = lazy(() => import('../components/homeroom/HomeroomEngagement.jsx'));
const StudentRecordsTab = lazy(() => import('../components/homeroom/StudentRecordsTab.jsx'));
const ClassLifecycleTab = lazy(() => import('../components/HomeroomPhase3Tabs.jsx').then((mod) => ({ default: mod.ClassLifecycleTab })));
const DataSafetyTab = lazy(() => import('../components/HomeroomPhase3Tabs.jsx').then((mod) => ({ default: mod.DataSafetyTab })));

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
  if (local) return normalizeHomeroomWorkspace(local, user);
  const base = makeDefaultHomeroomWorkspace(user);
  const preferred = fastPreferredHomeroom(user);
  const indexed = listFastHomeroomCatalog(user).find((item) => item.id === workspaceId);
  const metadata = indexed || (preferred?.id === workspaceId ? preferred : null);
  if (!metadata || workspaceId === 'default') return base;
  // Cloud-only privacy mode: show the correct class label immediately but never
  // expose editable zero-student placeholder data before real hydration arrives.
  return {
    ...base,
    id: workspaceId,
    __besAwaitingCloudClass: true,
    classProfile: {
      ...base.classProfile,
      className: metadata.className,
      grade: metadata.grade || String(metadata.className).split('.')[0],
      schoolYear: metadata.schoolYear || base.classProfile.schoolYear,
      classType: metadata.classType || HOMEROOM_CLASS_TYPE,
    },
  };
}

function stableJson(value) {
  try { return JSON.stringify(value ?? null); } catch { return ''; }
}

function workspaceOutsideStudentRecords(workspace) {
  if (!workspace || typeof workspace !== 'object') return {};
  const {
    studentRecords,
    auditLogs,
    backups,
    updatedAt,
    syncMeta,
    ...rest
  } = workspace;
  return rest;
}

function changedStudentRecordIds(before, after) {
  const previous = before?.studentRecords || {};
  const next = after?.studentRecords || {};
  const ids = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...ids].filter((id) => stableJson(previous[id]) !== stableJson(next[id]));
}

function isStudentRecordsOnlyChange(before, after) {
  return stableJson(workspaceOutsideStudentRecords(before)) === stableJson(workspaceOutsideStudentRecords(after))
    && changedStudentRecordIds(before, after).length > 0;
}

function mergeStudentRecordDelta(before, after, latest) {
  const mergedRecords = { ...(latest?.studentRecords || {}) };
  changedStudentRecordIds(before, after).forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(after?.studentRecords || {}, id)) mergedRecords[id] = after.studentRecords[id];
    else delete mergedRecords[id];
  });
  return { ...latest, studentRecords: mergedRecords };
}

export default function HomeroomWorkspace({ language = 'vi', currentUser }) {
  // Only inspect small metadata keys on first paint. Never deserialize all
  // 28 workspaces simply to choose the teacher's one homeroom class.
  const [initialWorkspaceId] = useState(() => (
    fastPreferredHomeroom(currentUser)?.id
    || assignedHomeroomWorkspaceId()
    || getCurrentHomeroomWorkspaceId(currentUser)
  ));
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [workspace, setWorkspace] = useState(() => applyCatalogClassType(getInitialWorkspace(currentUser, initialWorkspaceId), listFastHomeroomCatalog(currentUser), assignedHomeroomWorkspaceId()));
  const [catalog, setCatalog] = useState(() => listFastHomeroomCatalog(currentUser));
  const [classDraft, setClassDraft] = useState(() => workspace.classProfile);
  const [activeTab, setActiveTab] = useState(() => getDefaultClassTab(workspace));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState('local');
  const [commandTarget, setCommandTarget] = useState(null);
  const canEditHero = isDepartmentLeaderRole(currentUser?.role);
  const [heroPublished, setHeroPublished] = useState(() => normalizeHomeroomHero(DEFAULT_HOMEROOM_HERO));
  const [heroDraft, setHeroDraft] = useState(null);
  const [heroPreview, setHeroPreview] = useState(null);
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const hydrationSequenceRef = useRef(0);

  // Keep the initial Homeroom Hero exactly below the fixed Brian navbar.
  // Other routes own their own spacing. The former CSS selector incorrectly
  // matched main > .hr-page; the actual DOM has a .bqa-content-safe-frame.
  const heroEntryPositionedRef = useRef(false);
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || workspace?.__besAwaitingCloudClass === true) return undefined;
    const page = document.querySelector('.app-shell[data-route="homeroom"] .hr-page[data-homeroom-hydrated="true"]');
    const hero = page?.querySelector(':scope > .hr-campus-hero');
    if (!hero) return undefined;

    // A hash-route change may preserve the previous page's scroll position.
    // Reset only when entering Homeroom, never while navigating its tabs.
    if (!heroEntryPositionedRef.current) {
      heroEntryPositionedRef.current = true;
      window.scrollTo(0, 0);
      const stage = document.querySelector('.app-shell[data-route="homeroom"] #bes-main-content');
      if (stage && stage.scrollTop > 0) stage.scrollTop = 0;
    }

    const getNavbar = () => [...document.querySelectorAll(
      '.app-shell[data-route="homeroom"] .bes-top-chrome',
    )].find((node) => {
      const box = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return box.height > 25 && box.width > 180 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    let frame = 0;
    let trailingFrame = 0;
    let observer = null;
    const measure = () => {
      frame = 0;
      if (!hero.isConnected || window.scrollY > 8 || document.documentElement.scrollTop > 8) return;
      const navbar = getNavbar();
      if (!navbar) return;
      const navbarBottom = navbar.getBoundingClientRect().bottom;
      if (navbarBottom < 0 || navbarBottom > window.innerHeight) return;
      const previous = Number.parseFloat(hero.style.getPropertyValue('--hr-v4-nav-clearance')) || 0;
      const naturalTop = hero.getBoundingClientRect().top - previous;
      const required = Math.max(0, Math.ceil(navbarBottom + 34 - naturalTop));
      if (Math.abs(previous - required) > 1) {
        hero.style.setProperty('--hr-v4-nav-clearance', `${required}px`);
      }
    };
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    // Run once immediately, again when the pinned navigation has attached,
    // and after its first resize. Do not recompute on scroll (avoids jumpiness).
    measure();
    trailingFrame = window.requestAnimationFrame(scheduleMeasure);
    const delayedMeasure = window.setTimeout(scheduleMeasure, 280);
    const navbar = getNavbar();
    if (navbar && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(navbar);
    }
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    return () => {
      window.clearTimeout(delayedMeasure);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(trailingFrame);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [workspace?.__besAwaitingCloudClass]);

  // Reads a dedicated Homeroom CMS table, never the Dashboard CMS.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;
    const syncHero = async () => {
      try {
        const result = await readHomeroomHero();
        if (!cancelled) setHeroPublished(result.published);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Homeroom Hero CMS unavailable', error);
      }
    };
    const onPublished = (event) => {
      if (!cancelled && event?.detail?.published) setHeroPublished(normalizeHomeroomHero(event.detail.published));
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void syncHero(); };
    void syncHero();
    window.addEventListener('focus', syncHero);
    window.addEventListener(HOMEROOM_HERO_UPDATED_EVENT, onPublished);
    document.addEventListener('visibilitychange', onVisible);
    const refresh = window.setInterval(() => { if (document.visibilityState === 'visible') void syncHero(); }, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      window.removeEventListener('focus', syncHero);
      window.removeEventListener(HOMEROOM_HERO_UPDATED_EVENT, onPublished);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id]);

  const openHeroEditor = async () => {
    if (!canEditHero) return;
    try {
      const result = await readHomeroomHero({ includeDraft: true });
      setHeroPublished(result.published);
      setHeroDraft(result.draft);
    } catch (error) {
      setHeroDraft(heroPublished);
      if (import.meta.env.DEV) console.warn('Could not load Homeroom Hero draft', error);
    }
    setHeroEditorOpen(true);
  };

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return undefined;
    const retryQueuedChanges = () => {
      void flushPendingAssignedStudentRosters(currentUser);
    };
    // Recovery runs once when opening the app and whenever the network returns.
    retryQueuedChanges();
    window.addEventListener('online', retryQueuedChanges);
    window.addEventListener('focus', retryQueuedChanges);
    return () => {
      window.removeEventListener('online', retryQueuedChanges);
      window.removeEventListener('focus', retryQueuedChanges);
    };
  }, [currentUser?.id]);



  useEffect(() => {
    if (!workspace?.id) return;
    homeroomSessionCache.set(snapshotKey(currentUser, workspace.id), workspace);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspace]);

  const withAssignedClassType = (items = []) => {
    const assignedId = assignedHomeroomWorkspaceId();
    if (!assignedId) return items;
    return items.map((item) => (
      item.id === assignedId && item.status !== 'archived'
        ? { ...item, classType: HOMEROOM_CLASS_TYPE, classTypeResolved: true }
        : item
    ));
  };
  const refreshCatalog = async () => {
    const localItems = withAssignedClassType(listLocalHomeroomWorkspaces(currentUser));
    if (localItems.length) setCatalog(localItems);
    const result = await listHomeroomWorkspaces(currentUser);
    const items = withAssignedClassType(result.items || localItems);
    setCatalog(items);
    return items;
  };
  const restoreAssignedHomeroomDisplay = (targetId) => {
    if (!targetId || targetId !== workspaceId) return;
    setWorkspace((current) => applyCatalogClassType(current, [], targetId));
    setClassDraft((current) => current?.classType === HOMEROOM_CLASS_TYPE
      ? current : { ...current, classType: HOMEROOM_CLASS_TYPE });
    setCatalog((items) => withAssignedClassType(items));
  };

  useEffect(() => {
    let alive = true;
    const sequence = ++hydrationSequenceRef.current;
    const localItems = listFastHomeroomCatalog(currentUser);
    const localWorkspace = loadLocalHomeroomWorkspace(currentUser, workspaceId);
    const cachedWorkspace = homeroomSessionCache.get(snapshotKey(currentUser, workspaceId));
    const immediateWorkspace = cachedWorkspace || localWorkspace;

    if (immediateWorkspace) {
      const cached = applyCatalogClassType(normalizeHomeroomWorkspace(immediateWorkspace, currentUser), localItems, assignedHomeroomWorkspaceId());
      setWorkspace(cached);
      setClassDraft(cached.classProfile);
      setActiveTab((current) => isClassTabAllowed(current, cached, currentUser?.role === 'admin') ? current : getDefaultClassTab(cached));
      homeroomSessionCache.set(snapshotKey(currentUser, cached.id), cached);
      setSyncState('local');
    }
    setLoading(false);

    (async () => {
      try {
        // Hydrate the selected class first. Downloading/normalizing every class
        // in the catalog must not delay visible 12.6 student data.
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
        const loaded = applyCatalogClassType(normalized, localItems, assignedHomeroomWorkspaceId());
        if (authoritativeId && loaded.id !== authoritativeId) return;
        setSyncState(result.source === 'cloud' ? 'cloud' : 'local');
        setWorkspace(loaded);
        setClassDraft(loaded.classProfile);
        setActiveTab((current) => isClassTabAllowed(current, loaded, currentUser?.role === 'admin') ? current : getDefaultClassTab(loaded));
        homeroomSessionCache.set(snapshotKey(currentUser, loaded.id), loaded);
        setCurrentHomeroomWorkspaceId(currentUser, loaded.id);
        // Catalog reconciliation is maintenance; schedule it after the class
        // has rendered, and do not reopen/switch tabs on its completion.
        window.setTimeout(() => {
          if (alive && sequence === hydrationSequenceRef.current) {
            refreshCatalog().catch((error) => {
              console.warn('[HomeroomWorkspace] Không đồng bộ được danh mục lớp.', error);
            });
          }
        }, 0);
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
      restoreAssignedHomeroomDisplay(targetWorkspaceId);

      // Background assignment syncs are frequent and may fire while the teacher
      // is working inside another Homeroom tab. If the authoritative workspace
      // is already open, do not manufacture an "overview" navigation command:
      // doing so used to kick users back to Tổng quan whenever they changed tabs.
      if (targetWorkspaceId !== workspaceId) {
        setCommandTarget({ workspaceId: targetWorkspaceId, tab: 'overview', studentQuery: '', preserveTab: false });
        setWorkspaceId(targetWorkspaceId);
      }
    };
    window.addEventListener('bes-school-class-assignment-synced', onAssignedHomeroom);
    const onPreferredHomeroom = (event) => {
      const source = String(event?.detail?.source || '');
      if (source !== 'server-assignment' && source !== 'cached-server-assignment') return;
      restoreAssignedHomeroomDisplay(String(event?.detail?.workspaceId || '').trim());
    };
    window.addEventListener('bes-preferred-homeroom-selected', onPreferredHomeroom);
    const alreadyAssigned = assignedHomeroomWorkspaceId();
    if (alreadyAssigned) restoreAssignedHomeroomDisplay(alreadyAssigned);
    if (alreadyAssigned && alreadyAssigned !== workspaceId) {
      setCurrentHomeroomWorkspaceId(currentUser, alreadyAssigned);
      setCommandTarget({ workspaceId: alreadyAssigned, tab: 'overview', studentQuery: '' });
      setWorkspaceId(alreadyAssigned);
    }

    return () => {
      window.removeEventListener('bes-school-class-assignment-synced', onAssignedHomeroom);
      window.removeEventListener('bes-preferred-homeroom-selected', onPreferredHomeroom);
    };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, workspaceId]);

  useEffect(() => {
    const acceptCommand = (action) => {
      if (!action || action.type !== 'homeroom.navigate') return;
      const authoritativeId = assignedHomeroomWorkspaceId();
      const requestedWorkspaceId = String(action.workspaceId || workspaceId || '').trim();
      const isServerAssignment = action.source === 'server-assignment'
        || action.source === 'assigned-school-class-sync'
        || action.source === 'assigned-homeroom-entry-guard';
      if (isServerAssignment && requestedWorkspaceId === workspaceId) {
        restoreAssignedHomeroomDisplay(requestedWorkspaceId);
      }

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
        preserveTab: action.preserveTab === true,
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
    const canPreserveCurrentTab = commandTarget.preserveTab === true
      && (!commandTarget.workspaceId || commandTarget.workspaceId === workspace.id)
      && isClassTabAllowed(activeTab, workspace, currentUser?.role === 'admin');
    const requestedTab = canPreserveCurrentTab
      ? activeTab
      : (commandTarget.tab || getDefaultClassTab(workspace));
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

  useEffect(() => {
    if (typeof window === 'undefined' || !workspace?.id) return undefined;
    const snapshot = {
      workspaceId: workspace.id,
      workspace,
      updatedAt: workspace.updatedAt || '',
    };
    window.__besHomeroomLiveWorkspace = snapshot;
    window.dispatchEvent(new CustomEvent('bes-homeroom-live-workspace-updated', {
      detail: { workspaceId: workspace.id, updatedAt: workspace.updatedAt || '' },
    }));
    return () => {
      if (window.__besHomeroomLiveWorkspace === snapshot) {
        delete window.__besHomeroomLiveWorkspace;
      }
    };
  }, [workspace]);

  const flash = (text) => {
    setMessage(text);
    window.clearTimeout(window.__besHomeroomMsg);
    window.__besHomeroomMsg = window.setTimeout(() => setMessage(''), 3800);
  };

  const commit = async (next, successMessage = 'Đã lưu dữ liệu.') => {
    const previousWorkspace = workspace;
    let normalized = prepareWorkspaceCommit(previousWorkspace, next, currentUser, successMessage);
    let schoolRosterBefore = previousWorkspace;
    setWorkspace(normalized);
    setClassDraft(normalized.classProfile);
    homeroomSessionCache.set(snapshotKey(currentUser, normalized.id), normalized);
    setSaving(true);
    let result = await saveHomeroomWorkspace(normalized, currentUser);

    // Student-record edits are frequent and may collide with a background class
    // sync or another harmless workspace write. Retry them safely by applying
    // only the changed student-record entries on top of the latest cloud payload.
    // This is especially important for destructive edits: without this retry,
    // "Xóa thông tin" looked successful locally but the old cloud fields came
    // back after a page refresh.
    if (!result.ok
      && result.code === 'workspace-conflict'
      && result.workspace
      && isStudentRecordsOnlyChange(previousWorkspace, normalized)) {
      const latestCloud = normalizeHomeroomWorkspace(result.workspace, currentUser);
      const merged = mergeStudentRecordDelta(previousWorkspace, normalized, latestCloud);
      normalized = prepareWorkspaceCommit(latestCloud, merged, currentUser, successMessage);
      homeroomSessionCache.set(snapshotKey(currentUser, normalized.id), normalized);
      result = await saveHomeroomWorkspace(normalized, currentUser);
    }

    if (!result.ok && result.code === 'workspace-conflict' && result.workspace
      && isHomeroomStudentListOnlyChange(previousWorkspace, normalized)) {
      const latestCloud = normalizeHomeroomWorkspace(result.workspace, currentUser);
      const merged = mergeHomeroomStudentListAfterConflict(
        previousWorkspace, normalized, latestCloud,
      );
      if (merged.ok) {
        schoolRosterBefore = latestCloud;
        normalized = prepareWorkspaceCommit(latestCloud, merged.workspace, currentUser, successMessage);
        homeroomSessionCache.set(snapshotKey(currentUser, normalized.id), normalized);
        result = await saveHomeroomWorkspace(normalized, currentUser);
      } else {
        result = { ...result, message: merged.message };
      }
    }

    let schoolRosterSync = null;
    if (result.ok && !result.offline) {
      const savedCloud = result.workspace || normalized;
      const verifiedAssignment = savedCloud.schoolAssignment?.source === 'school-class-registry'
        || savedCloud.id === assignedHomeroomWorkspaceId();
      if (verifiedAssignment) {
        try {
          schoolRosterSync = await syncAssignedStudentRosterDelta(
            currentUser, schoolRosterBefore, savedCloud,
          );
        } catch (error) {
          schoolRosterSync = { ok: false, message: error?.message || 'Không đồng bộ được danh sách chung.' };
        }
      }
    }
    setSaving(false);
    if (result.ok) {
      const saved = result.workspace || normalized;
      setWorkspace(saved);
      setClassDraft(saved.classProfile);
      homeroomSessionCache.set(snapshotKey(currentUser, saved.id), saved);
      setSyncState(result.offline ? 'local' : schoolRosterSync?.ok === false ? 'local' : 'cloud');
      flash(schoolRosterSync?.ok === false
        ? `${successMessage} Hồ sơ đã lưu nhưng danh sách dùng chung chưa đồng bộ: ${schoolRosterSync.message}`
        : successMessage);
    } else {
      setSyncState('local');
      flash(`${successMessage} Dữ liệu đã lưu trên thiết bị; cloud chưa đồng bộ: ${result.message || 'lỗi chưa xác định'}`);
    }
    void refreshCatalog().catch(() => {
      // Catalog refresh is secondary to the save itself; never keep the user waiting for it.
    });
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
      const normalizedTarget = applyCatalogClassType(normalizeHomeroomWorkspace(localTarget, currentUser), catalog, assignedHomeroomWorkspaceId());
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
    if (workspace.id === assignedHomeroomWorkspaceId() && classDraft.classType === SUBJECT_CLASS_TYPE) {
      flash('Lớp này đang được phân công GVCN. Không thể đổi thành lớp bộ môn khi phân công còn hiệu lực.');
      return;
    }
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

  // Only the class label is cached in cloud-only mode. Never enable editing a
  // synthetic empty roster while the actual school records are still loading.
  if (workspace.__besAwaitingCloudClass === true) {
    return <div className="page hr-page hr-v4 is-homeroom-class">
      <section className="hr-panel" role="status" aria-live="polite" style={{ padding: '28px', marginTop: '16px' }}>
        <small>BRIAN • CHỦ NHIỆM</small>
        <h1>Lớp {workspace.classProfile.className}</h1>
        <p>Đang tải dữ liệu lớp đã phân công…</p>
      </section>
    </div>;
  }

  return <div className={`page hr-page hr-v4 ${subjectMode ? 'is-subject-class' : 'is-homeroom-class'}`} data-homeroom-hydrated="true">
    {canEditHero && heroEditorOpen ? <Suspense fallback={null}><HomeroomHeroEditor
      open={heroEditorOpen}
      currentUser={currentUser}
      language={language}
      initialConfig={heroDraft || heroPublished}
      onClose={() => { setHeroEditorOpen(false); setHeroPreview(null); }}
      onPreview={setHeroPreview}
      onPublished={(published) => { setHeroPublished(published); setHeroDraft(published); setHeroPreview(published); }}
    /></Suspense> : null}
    <HomeroomGlassHero
      workspace={workspace}
      currentUser={currentUser}
      syncState={syncState}
      language={language}
      subjectMode={subjectMode}
      classTypeLabel={classTypeLabel}
      activeStudents={activeStudents}
      heroConfig={heroPreview || heroPublished}
      canEditHero={canEditHero}
      onEditHero={openHeroEditor}
    />

    <HomeroomNavigationPalette key={currentUser?.id || currentUser?.authId || currentUser?.email || 'guest'} active={visibleTab} setActive={setActiveTab} language={language} currentUser={currentUser} workspace={workspace} />
    {message ? <div className="hr-toast"><span>✓</span>{message}</div> : null}
    {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ dữ liệu lớp…</div> : null}

    <Suspense fallback={<section className="hr-v4-tab-loading" role="status" aria-live="polite"><span className="hr-v4-loading-mark" aria-hidden="true" /><div><strong>Đang mở phân hệ…</strong><small>Dữ liệu lớp hiện tại được giữ nguyên.</small></div></section>}>
      {(!workspace.classProfile?.className || visibleTab === 'classes') ? <HomeroomClassProfileEditor value={classDraft} onChange={setClassDraft} onSave={saveClassProfile} saving={saving} language={language} /> : null}

      <main id="hr-workspace-body" className="hr-workspace-body">
      {visibleTab === 'overview' ? <HomeroomOverviewCompactTab workspace={workspace} goTab={setActiveTab} onCommit={commit} syncState={syncState} subjectMode={subjectMode} /> : null}
      {visibleTab === 'classes' ? <ClassLifecycleTab workspace={workspace} catalog={catalog} currentId={workspaceId} onSwitch={switchWorkspace} onCreate={createWorkspace} onDuplicate={duplicateWorkspace} onStatusChange={changeWorkspaceStatus} currentUser={currentUser} /> : null}
      {visibleTab === 'students' ? (subjectMode ? <SubjectStudentsTab workspace={workspace} onCommit={commit} /> : <HomeroomStudentHub key={`${currentUser?.id || currentUser?.email || 'guest'}:${workspace.id}`} workspace={workspace} onCommit={commit} />) : null}
      {visibleTab === 'studentRecords' ? <StudentRecordsTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      {visibleTab === 'attendance' ? <><HomeroomEngagement workspace={workspace} mode="attendance" /><AttendanceTab workspace={workspace} onCommit={commit} currentUser={currentUser} /></> : null}
      {visibleTab === 'conduct' ? <><HomeroomEngagement workspace={workspace} mode="conduct" /><HomeroomConductTab workspace={workspace} onCommit={commit} currentUser={currentUser} /></> : null}
      {visibleTab === 'safety' ? <DataSafetyTab workspace={workspace} onCommit={commit} currentUser={currentUser} /> : null}
      </main>
    </Suspense>
  </div>;
}