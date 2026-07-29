import { useEffect } from 'react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';

const WORKSPACE_PREFIX = 'bes-brian-team-workspace-v1';
const FORWARD_LINK_PREFIX = 'bes-brian-team-workhub-links-v1';
const CLOUD_WORKSPACE_TABLE = 'department_team_workspaces';
const SOURCE_MODULE = 'brian-team';
const POLL_INTERVAL = 3200;
const TERMINAL = new Set(['approved', 'completed', 'archived']);

function scopeOf(user) {
  return String(user?.id || user?.email || 'department-leader')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'department-leader';
}

function workspaceKey(user) {
  return `${WORKSPACE_PREFIX}:${scopeOf(user)}`;
}

function forwardLinkKey(user) {
  return `${FORWARD_LINK_PREFIX}:${scopeOf(user)}`;
}

function safeRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional cache */ }
}

function unique(values = []) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function assignmentSignature(entry) {
  return JSON.stringify({
    title: entry.title,
    description: entry.description,
    dueDate: entry.dueDate,
    priority: entry.priority,
    status: entry.status,
    assigneeAccountIds: entry.assigneeAccountIds,
    departmentId: entry.departmentId,
  });
}

function flattenAssignments(workspace) {
  const result = [];
  (workspace?.departments || []).forEach((department) => {
    const memberAccounts = new Map(
      (department.members || []).map((member) => [String(member.id), String(member.teacherAccountId || '')]),
    );
    (department.assignments || []).forEach((assignment) => {
      result.push({
        id: String(assignment.id || ''),
        title: String(assignment.title || '').trim(),
        description: String(assignment.description || '').trim(),
        dueDate: String(assignment.dueDate || ''),
        priority: ['low', 'normal', 'high', 'urgent'].includes(assignment.priority) ? assignment.priority : 'normal',
        status: assignment.status || 'progress',
        assigneeAccountIds: unique(
          (assignment.assigneeIds || []).map((memberId) => memberAccounts.get(String(memberId))).filter(Boolean),
        ),
        departmentId: String(department.id || ''),
      });
    });
  });
  return result.filter((entry) => entry.id && entry.title);
}

function normalizeDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function sameArray(a = [], b = []) {
  const left = unique(a).sort();
  const right = unique(b).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function contentMatchesRemote(entry, rows) {
  if (!rows.length) return false;
  const first = rows[0];
  const remoteAssignees = rows.map((row) => row.metadata?.brian_team_assignee_id || row.assignee_ids?.[0]).filter(Boolean);
  return String(first.title || '') === entry.title
    && String(first.description || '') === entry.description
    && String(first.priority || 'normal') === entry.priority
    && normalizeDateOnly(first.due_at) === entry.dueDate
    && sameArray(remoteAssignees, entry.assigneeAccountIds);
}

function summaryOf(rows) {
  const counts = {
    total: rows.length,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    submitted: 0,
    changesRequested: 0,
    approved: 0,
    completed: 0,
    archived: 0,
  };

  rows.forEach((row) => {
    const status = String(row.status || 'assigned');
    if (status === 'assigned' || status === 'draft') counts.assigned += 1;
    else if (status === 'accepted') counts.accepted += 1;
    else if (status === 'in_progress') counts.inProgress += 1;
    else if (status === 'submitted') counts.submitted += 1;
    else if (status === 'changes_requested') counts.changesRequested += 1;
    else if (status === 'approved') counts.approved += 1;
    else if (status === 'completed') counts.completed += 1;
    else if (status === 'archived') counts.archived += 1;
  });

  const statuses = rows.map((row) => String(row.status || 'assigned'));
  let aggregateStatus = 'progress';
  if (statuses.length && statuses.every((status) => TERMINAL.has(status))) {
    aggregateStatus = 'done';
  } else if (
    statuses.length
    && statuses.every((status) => status === 'submitted' || TERMINAL.has(status))
    && statuses.some((status) => status === 'submitted')
  ) {
    aggregateStatus = 'review';
  }

  return {
    ...counts,
    finished: counts.approved + counts.completed + counts.archived,
    waitingReview: counts.submitted,
    aggregateStatus,
    updatedAt: rows.reduce((latest, row) => {
      const value = String(row.updated_at || '');
      return value > latest ? value : latest;
    }, '') || new Date().toISOString(),
  };
}

function summaryKey(summary) {
  return JSON.stringify({
    total: summary?.total || 0,
    assigned: summary?.assigned || 0,
    accepted: summary?.accepted || 0,
    inProgress: summary?.inProgress || 0,
    submitted: summary?.submitted || 0,
    changesRequested: summary?.changesRequested || 0,
    approved: summary?.approved || 0,
    completed: summary?.completed || 0,
    archived: summary?.archived || 0,
    aggregateStatus: summary?.aggregateStatus || 'progress',
  });
}

function ensureToastStyle() {
  if (document.getElementById('bes-brian-team-reverse-style')) return;
  const style = document.createElement('style');
  style.id = 'bes-brian-team-reverse-style';
  style.textContent = `
    .bes-brian-team-reverse-toast{position:fixed;right:24px;bottom:24px;z-index:99999;max-width:min(560px,calc(100vw - 32px));padding:14px 18px;border-radius:16px;background:#28331d;color:#fff;box-shadow:0 20px 55px rgba(25,34,18,.28);font-weight:750}
    .bes-brian-team-reverse-toast.is-warning{background:#8a5b17}
    @media(max-width:720px){.bes-brian-team-reverse-toast{right:16px;bottom:16px}}
  `;
  document.head.appendChild(style);
}

function showToast(message, tone = 'success') {
  ensureToastStyle();
  let toast = document.getElementById('bes-brian-team-reverse-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bes-brian-team-reverse-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.className = `bes-brian-team-reverse-toast is-${tone}`;
  toast.textContent = message;
  window.clearTimeout(Number(toast.dataset.timer || 0));
  toast.dataset.timer = String(window.setTimeout(() => toast.remove(), 5200));
}

async function persistWorkspace(user, workspace) {
  safeWrite(workspaceKey(user), workspace);
  const { error } = await supabase.from(CLOUD_WORKSPACE_TABLE).upsert({
    owner_id: user.id,
    payload: workspace,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' });
  window.dispatchEvent(new CustomEvent('bes-brian-team-workspace-updated', {
    detail: { source: 'work-hub', workspace, cloudError: error?.message || '' },
  }));
  return error?.message || '';
}

function scheduleSafeReload() {
  if (!window.location.hash.includes('brian-team')) return;
  const reload = () => {
    if (document.querySelector('.bt-modal-layer')) {
      window.setTimeout(reload, 1200);
      return;
    }
    try {
      const last = Number(window.sessionStorage.getItem('bes-brian-team-reverse-reload') || 0);
      if (Date.now() - last < 5000) return;
      window.sessionStorage.setItem('bes-brian-team-reverse-reload', String(Date.now()));
    } catch { /* reload once even without storage */ }
    window.location.reload();
  };
  window.setTimeout(reload, 900);
}

export default function BrianTeamWorkHubReverseSyncBridge({ currentUser, language = 'vi' }) {
  useEffect(() => {
    if (!currentUser?.id || !isDepartmentLeaderRole(currentUser.role) || !isSupabaseConfigured || !supabase) return undefined;

    let stopped = false;
    let busy = false;
    let timer = 0;
    let lastRemoteFingerprint = '';
    let lastError = '';

    const syncReverse = async () => {
      if (stopped || busy) return;
      const workspace = safeRead(workspaceKey(currentUser), null);
      if (!workspace?.departments) return;

      busy = true;
      try {
        const { data, error } = await supabase
          .from('work_hub_items')
          .select('id,title,description,status,priority,due_at,assignee_ids,metadata,updated_at')
          .eq('owner_id', currentUser.id)
          .eq('source_module', SOURCE_MODULE)
          .limit(900);
        if (error) throw error;

        const remoteRows = data || [];
        const fingerprint = JSON.stringify(remoteRows.map((row) => [
          row.id, row.status, row.updated_at, row.title, row.priority, row.due_at,
        ]));
        if (fingerprint === lastRemoteFingerprint) return;

        const byAssignment = new Map();
        remoteRows.forEach((row) => {
          const assignmentId = String(row.metadata?.brian_team_assignment_id || '');
          if (!assignmentId) return;
          const rows = byAssignment.get(assignmentId) || [];
          rows.push(row);
          byAssignment.set(assignmentId, rows);
        });

        const flat = new Map(flattenAssignments(workspace).map((entry) => [entry.id, entry]));
        const forwardLinks = safeRead(forwardLinkKey(currentUser), { version: 1, assignments: {} });
        let changed = false;
        let changedCount = 0;

        const nextWorkspace = {
          ...workspace,
          departments: workspace.departments.map((department) => ({
            ...department,
            assignments: (department.assignments || []).map((assignment) => {
              const assignmentId = String(assignment.id || '');
              const entry = flat.get(assignmentId);
              const rows = byAssignment.get(assignmentId) || [];
              if (!entry || !rows.length || !contentMatchesRemote(entry, rows)) return assignment;

              const summary = summaryOf(rows);
              const statusChanged = assignment.status !== summary.aggregateStatus;
              const progressChanged = summaryKey(assignment.workHubSummary) !== summaryKey(summary);
              if (!statusChanged && !progressChanged) return assignment;

              changed = true;
              changedCount += 1;
              const nextAssignment = {
                ...assignment,
                status: summary.aggregateStatus,
                workHubSummary: summary,
                workHubStatusSource: 'work-hub',
                workHubSyncedAt: new Date().toISOString(),
              };

              const linked = forwardLinks.assignments?.[assignmentId];
              if (linked) linked.signature = assignmentSignature({ ...entry, status: summary.aggregateStatus });
              return nextAssignment;
            }),
          })),
          updatedAt: new Date().toISOString(),
        };

        if (!changed) {
          lastRemoteFingerprint = fingerprint;
          return;
        }

        safeWrite(forwardLinkKey(currentUser), {
          ...forwardLinks,
          version: 1,
          assignments: forwardLinks.assignments || {},
          updatedAt: new Date().toISOString(),
        });

        const cloudError = await persistWorkspace(currentUser, nextWorkspace);
        lastRemoteFingerprint = fingerprint;
        lastError = '';

        showToast(
          language === 'en'
            ? `Brian Team received progress updates for ${changedCount} assignment(s) from Work Hub.`
            : `Brian Team đã nhận tiến độ mới của ${changedCount} phân công từ Work Hub.`,
          cloudError ? 'warning' : 'success',
        );
        scheduleSafeReload();
      } catch (error) {
        const detail = String(error?.message || error || 'Reverse sync failed');
        if (detail !== lastError) {
          showToast(
            language === 'en'
              ? `Could not receive Work Hub progress: ${detail}`
              : `Không thể nhận tiến độ từ Work Hub: ${detail}`,
            'warning',
          );
          lastError = detail;
        }
      } finally {
        busy = false;
      }
    };

    timer = window.setInterval(syncReverse, POLL_INTERVAL);
    syncReverse();
    const onFocus = () => syncReverse();
    const onVisibility = () => { if (document.visibilityState === 'visible') syncReverse(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      document.getElementById('bes-brian-team-reverse-toast')?.remove();
    };
  }, [currentUser?.id, currentUser?.role, language]);

  return null;
}
