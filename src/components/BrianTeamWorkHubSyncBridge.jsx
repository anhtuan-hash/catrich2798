import { useEffect } from 'react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';

const WORKSPACE_PREFIX = 'bes-brian-team-workspace-v1';
const LINK_PREFIX = 'bes-brian-team-workhub-links-v1';
const WORK_HUB_SYNC_PREFIX = 'bes-work-hub-v1093-sync';
const SOURCE_MODULE = 'brian-team';
const POLL_INTERVAL = 1400;

function scopeOf(user) {
  return String(user?.id || user?.email || 'department-leader')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'department-leader';
}

function workspaceKey(user) {
  return `${WORKSPACE_PREFIX}:${scopeOf(user)}`;
}

function linkKey(user) {
  return `${LINK_PREFIX}:${scopeOf(user)}`;
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

function dueAt(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function workHubStatus(status, selfAssigned = false) {
  if (status === 'done') return 'completed';
  if (status === 'review') return 'submitted';
  return selfAssigned ? 'in_progress' : 'assigned';
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
      const assigneeAccountIds = unique(
        (assignment.assigneeIds || []).map((memberId) => memberAccounts.get(String(memberId))).filter(Boolean),
      );
      result.push({
        id: String(assignment.id || ''),
        title: String(assignment.title || '').trim(),
        description: String(assignment.description || '').trim(),
        dueDate: String(assignment.dueDate || ''),
        priority: ['low', 'normal', 'high', 'urgent'].includes(assignment.priority) ? assignment.priority : 'normal',
        status: assignment.status || 'progress',
        assigneeAccountIds,
        departmentId: String(department.id || ''),
        departmentName: String(department.name || 'Tổ chuyên môn'),
        departmentShortName: String(department.shortName || department.name || 'Tổ chuyên môn'),
      });
    });
  });
  return result.filter((entry) => entry.id && entry.title);
}

function readLinks(user) {
  const raw = safeRead(linkKey(user), {});
  return {
    version: 1,
    assignments: raw?.assignments && typeof raw.assignments === 'object' ? raw.assignments : {},
    updatedAt: raw?.updatedAt || '',
  };
}

function saveLinks(user, links) {
  safeWrite(linkKey(user), { ...links, version: 1, updatedAt: new Date().toISOString() });
}

function clearWorkHubCache(user) {
  try { window.localStorage.removeItem(`${WORK_HUB_SYNC_PREFIX}:${user?.id || user?.email || 'guest'}`); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent('bes-work-hub-refresh-requested', { detail: { source: SOURCE_MODULE } }));
}

function ensureChip(language = 'vi') {
  const host = document.querySelector('.bt-actions');
  if (!host) return null;
  let chip = host.querySelector('[data-brian-team-workhub-sync]');
  if (!chip) {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bes-brian-team-workhub-chip';
    chip.dataset.brianTeamWorkhubSync = 'true';
    chip.addEventListener('click', () => { window.location.hash = '#/work-hub'; });
    host.prepend(chip);
  }
  chip.dataset.language = language;
  return chip;
}

function setChip(state, language = 'vi', detail = '') {
  const chip = ensureChip(language);
  if (!chip) return;
  chip.dataset.state = state;
  const labels = language === 'en'
    ? { idle: 'Work Hub connected', syncing: 'Syncing Work Hub…', error: 'Work Hub sync error' }
    : { idle: 'Đã liên thông Work Hub', syncing: 'Đang đồng bộ Work Hub…', error: 'Lỗi liên thông Work Hub' };
  chip.innerHTML = `<i></i><span>${labels[state] || labels.idle}</span>`;
  chip.title = detail || (language === 'en' ? 'Open Unified Work Hub' : 'Mở Trung tâm công việc');
}

function showToast(message, tone = 'success') {
  let toast = document.getElementById('bes-brian-team-workhub-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bes-brian-team-workhub-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.className = `bes-brian-team-workhub-toast is-${tone}`;
  toast.textContent = message;
  window.clearTimeout(Number(toast.dataset.timer || 0));
  toast.dataset.timer = String(window.setTimeout(() => toast.remove(), 4200));
}

export default function BrianTeamWorkHubSyncBridge({ currentUser, language = 'vi' }) {
  useEffect(() => {
    if (!currentUser?.id || !isDepartmentLeaderRole(currentUser.role) || !isSupabaseConfigured || !supabase) return undefined;

    let stopped = false;
    let busy = false;
    let interval = 0;
    let lastFingerprint = '';
    let hydrated = false;
    let lastError = '';

    const hydrateLinks = async () => {
      const { data, error } = await supabase
        .from('work_hub_items')
        .select('id,assignee_ids,metadata')
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE)
        .limit(800);
      if (error) throw error;

      const assignments = {};
      (data || []).forEach((item) => {
        const assignmentId = String(item.metadata?.brian_team_assignment_id || '');
        const assigneeId = String(item.metadata?.brian_team_assignee_id || item.assignee_ids?.[0] || '');
        if (!assignmentId || !assigneeId) return;
        const current = assignments[assignmentId] || { signature: '', items: [] };
        current.items.push({ assigneeId, workItemId: String(item.id) });
        assignments[assignmentId] = current;
      });
      const next = { version: 1, assignments, updatedAt: new Date().toISOString() };
      saveLinks(currentUser, next);
      hydrated = true;
      return next;
    };

    const deleteIds = async (ids) => {
      const cleanIds = unique(ids);
      if (!cleanIds.length) return 0;
      const { error } = await supabase
        .from('work_hub_items')
        .delete()
        .eq('owner_id', currentUser.id)
        .in('id', cleanIds);
      if (error) throw error;
      return cleanIds.length;
    };

    const sync = async () => {
      if (stopped || busy) return;
      const workspace = safeRead(workspaceKey(currentUser), null);
      if (!workspace?.departments) {
        setChip('idle', language);
        return;
      }

      const desired = flattenAssignments(workspace);
      const fingerprint = JSON.stringify(desired.map((entry) => ({ ...entry, signature: assignmentSignature(entry) })));
      if (hydrated && fingerprint === lastFingerprint) {
        ensureChip(language);
        return;
      }

      busy = true;
      setChip('syncing', language);
      let createdCount = 0;
      let removedCount = 0;
      let updatedCount = 0;

      try {
        let links = hydrated ? readLinks(currentUser) : await hydrateLinks();
        const desiredMap = new Map(desired.map((entry) => [entry.id, entry]));
        const nextAssignments = { ...links.assignments };

        for (const [assignmentId, linked] of Object.entries(nextAssignments)) {
          if (desiredMap.has(assignmentId)) continue;
          removedCount += await deleteIds((linked.items || []).map((item) => item.workItemId));
          delete nextAssignments[assignmentId];
        }

        for (const entry of desired) {
          const signature = assignmentSignature(entry);
          const linked = nextAssignments[entry.id] || { signature: '', items: [] };
          const linkedByAssignee = new Map((linked.items || []).map((item) => [String(item.assigneeId), item]));
          const wanted = new Set(entry.assigneeAccountIds);

          const stale = (linked.items || []).filter((item) => !wanted.has(String(item.assigneeId)));
          if (stale.length) removedCount += await deleteIds(stale.map((item) => item.workItemId));

          const retained = (linked.items || []).filter((item) => wanted.has(String(item.assigneeId)));
          const missingAssignees = entry.assigneeAccountIds.filter((assigneeId) => !linkedByAssignee.has(assigneeId));

          if (missingAssignees.length) {
            const payloads = missingAssignees.map((assigneeId) => ({
              title: entry.title,
              description: entry.description,
              item_type: 'task',
              status: workHubStatus(entry.status, assigneeId === currentUser.id),
              priority: entry.priority,
              visibility: 'restricted',
              owner_id: currentUser.id,
              created_by: currentUser.id,
              assignee_ids: [assigneeId],
              watcher_ids: [],
              due_at: dueAt(entry.dueDate),
              attachments: [],
              source_module: SOURCE_MODULE,
              metadata: {
                created_in: 'brian-team-v2',
                notify_assignee: assigneeId !== currentUser.id,
                brian_team_assignment_id: entry.id,
                brian_team_assignee_id: assigneeId,
                brian_team_department_id: entry.departmentId,
                brian_team_department_name: entry.departmentName,
                linkage_version: 1,
              },
            }));
            const { data, error } = await supabase
              .from('work_hub_items')
              .insert(payloads)
              .select('id,assignee_ids,metadata');
            if (error) throw error;
            (data || []).forEach((item) => {
              const assigneeId = String(item.metadata?.brian_team_assignee_id || item.assignee_ids?.[0] || '');
              if (assigneeId) retained.push({ assigneeId, workItemId: String(item.id) });
            });
            createdCount += data?.length || 0;
          }

          const retainedIds = unique(retained.map((item) => item.workItemId));
          if (retainedIds.length && linked.signature !== signature) {
            const { error } = await supabase
              .from('work_hub_items')
              .update({
                title: entry.title,
                description: entry.description,
                status: workHubStatus(entry.status, false),
                priority: entry.priority,
                due_at: dueAt(entry.dueDate),
                updated_at: new Date().toISOString(),
              })
              .eq('owner_id', currentUser.id)
              .in('id', retainedIds);
            if (error) throw error;
            updatedCount += retainedIds.length;
          }

          nextAssignments[entry.id] = {
            signature,
            departmentId: entry.departmentId,
            departmentName: entry.departmentName,
            items: retained,
            syncedAt: new Date().toISOString(),
          };
        }

        links = { ...links, assignments: nextAssignments, updatedAt: new Date().toISOString() };
        saveLinks(currentUser, links);
        lastFingerprint = fingerprint;
        lastError = '';
        clearWorkHubCache(currentUser);
        setChip('idle', language);

        if (createdCount || removedCount) {
          const message = language === 'en'
            ? `Brian Team synced ${createdCount} new and removed ${removedCount} obsolete Work Hub task(s).`
            : `Brian Team đã tạo ${createdCount} và thu hồi ${removedCount} công việc trong Work Hub.`;
          showToast(message, 'success');
        } else if (updatedCount) {
          setChip('idle', language, language === 'en'
            ? `${updatedCount} Work Hub task(s) updated.`
            : `Đã cập nhật ${updatedCount} công việc trong Work Hub.`);
        }
      } catch (error) {
        const detail = String(error?.message || error || 'Unknown sync error');
        setChip('error', language, detail);
        if (detail !== lastError) {
          showToast(language === 'en'
            ? `Could not sync Brian Team with Work Hub: ${detail}`
            : `Không thể liên thông Brian Team với Work Hub: ${detail}`, 'error');
          lastError = detail;
        }
      } finally {
        busy = false;
      }
    };

    const observer = new MutationObserver(() => ensureChip(language));
    observer.observe(document.body, { childList: true, subtree: true });
    interval = window.setInterval(sync, POLL_INTERVAL);
    sync();

    const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
      document.querySelector('[data-brian-team-workhub-sync]')?.remove();
      document.getElementById('bes-brian-team-workhub-toast')?.remove();
    };
  }, [currentUser?.id, currentUser?.role, language]);

  return (
    <style>{`
      .bes-brian-team-workhub-chip{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:8px 12px;border:1px solid color-mix(in srgb,var(--bt-accent,#B2C248) 52%,#27321f);border-radius:999px;background:color-mix(in srgb,var(--bt-accent,#B2C248) 18%,#fff);color:#29341f;font:800 12px/1.1 inherit;cursor:pointer;white-space:nowrap}
      .bes-brian-team-workhub-chip i{width:9px;height:9px;border-radius:50%;background:#738621;box-shadow:0 0 0 4px rgba(178,194,72,.18)}
      .bes-brian-team-workhub-chip[data-state="syncing"] i{background:#c78316;animation:besBtPulse 1s infinite}
      .bes-brian-team-workhub-chip[data-state="error"]{border-color:#c46860;background:#fff2f0;color:#8a302a}.bes-brian-team-workhub-chip[data-state="error"] i{background:#b9473d;box-shadow:0 0 0 4px rgba(185,71,61,.14)}
      .bes-brian-team-workhub-toast{position:fixed;right:24px;bottom:24px;z-index:99999;max-width:min(520px,calc(100vw - 32px));padding:14px 18px;border-radius:16px;background:#28331d;color:#fff;box-shadow:0 20px 55px rgba(25,34,18,.28);font-weight:750}.bes-brian-team-workhub-toast.is-error{background:#8d2f28}
      @keyframes besBtPulse{50%{opacity:.35;transform:scale(.78)}}
      @media(max-width:900px){.bes-brian-team-workhub-chip span{display:none}.bes-brian-team-workhub-chip{padding:8px 11px}.bes-brian-team-workhub-toast{right:16px;bottom:16px}}
    `}</style>
  );
}
