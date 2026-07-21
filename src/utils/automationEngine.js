import { getRuntimeClient } from '../services/runtime/core.js';
import { readLocal, scopedLocalKey, uid, writeLocal } from '../pages/v1093/shared.js';

export const AUTOMATION_EVENT = 'bes-automation-event-v1096';
export const AUTOMATION_UPDATED = 'bes-automation-updated-v1096';

export const TRIGGER_TYPES = [
  { value: 'manual', label: 'Chạy thủ công' },
  { value: 'schedule', label: 'Theo lịch máy chủ / ứng dụng' },
  { value: 'event', label: 'Khi có sự kiện hệ thống' },
];

export const EVENT_TYPES = [
  { value: 'resource_approved', label: 'Tài liệu được duyệt' },
  { value: 'work_due_soon', label: 'Công việc sắp đến hạn' },
  { value: 'work_submitted', label: 'Giáo viên nộp sản phẩm' },
  { value: 'learner_risk', label: 'Phát hiện học sinh cần hỗ trợ' },
  { value: 'assessment_completed', label: 'Hoàn tất bài đánh giá' },
  { value: 'runtime_warning', label: 'Cảnh báo vận hành' },
];

export const ACTION_TYPES = [
  { value: 'notification', label: 'Tạo thông báo trong ứng dụng' },
  { value: 'work_draft', label: 'Tạo bản nháp công việc' },
  { value: 'practice_draft', label: 'Tạo bản nháp bài luyện' },
  { value: 'open_route', label: 'Mở trang được chỉ định' },
  { value: 'snapshot', label: 'Lưu ảnh chụp trạng thái vận hành' },
];

function nowIso() { return new Date().toISOString(); }

function localKeys(user) {
  return {
    rules: scopedLocalKey('bes-automation-rules-v1096', user),
    runs: scopedLocalKey('bes-automation-runs-v1096', user),
    events: scopedLocalKey('bes-automation-events-v1096', user),
    notifications: scopedLocalKey('bes-automation-notifications-v1096', user),
    snapshots: scopedLocalKey('bes-automation-snapshots-v1096', user),
  };
}

function notifyUpdate(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTOMATION_UPDATED, { detail }));
}

function normalizeRule(rule, user) {
  const createdAt = rule.created_at || nowIso();
  return {
    id: rule.id || uid('automation-rule'),
    owner_id: rule.owner_id || user?.id || '',
    name: String(rule.name || 'Quy tắc mới').trim(),
    description: String(rule.description || '').trim(),
    enabled: rule.enabled !== false,
    scope: rule.scope === 'department' ? 'department' : 'personal',
    trigger_type: ['manual', 'schedule', 'event'].includes(rule.trigger_type) ? rule.trigger_type : 'manual',
    trigger_config: rule.trigger_config || { frequency: 'daily', time: '08:00', event: 'resource_approved' },
    action_type: ACTION_TYPES.some((item) => item.value === rule.action_type) ? rule.action_type : 'notification',
    action_config: rule.action_config || { title: 'Brian English Studio', message: '', route: 'work-hub' },
    requires_approval: rule.requires_approval !== false,
    last_run_at: rule.last_run_at || null,
    next_run_at: rule.next_run_at || null,
    run_count: Number(rule.run_count || 0),
    success_count: Number(rule.success_count || 0),
    created_at: createdAt,
    updated_at: rule.updated_at || createdAt,
  };
}

function normalizeRun(run, user) {
  return {
    id: run.id || uid('automation-run'),
    rule_id: run.rule_id || '',
    owner_id: run.owner_id || user?.id || '',
    rule_name: run.rule_name || 'Automation',
    status: run.status || 'success',
    trigger_type: run.trigger_type || 'manual',
    input_json: run.input_json || {},
    output_json: run.output_json || {},
    error_message: run.error_message || '',
    approval_required: Boolean(run.approval_required),
    approved_at: run.approved_at || null,
    started_at: run.started_at || nowIso(),
    finished_at: run.finished_at || null,
    created_at: run.created_at || nowIso(),
  };
}

async function safeTable(client, table, operation, fallback) {
  if (!client) return fallback;
  try {
    const result = await operation(client.from(table));
    if (result?.error) {
      if (/does not exist|relation .* not found|schema cache/i.test(result.error.message || '')) return fallback;
      throw result.error;
    }
    return result?.data ?? fallback;
  } catch (error) {
    if (/does not exist|relation .* not found|schema cache/i.test(error?.message || '')) return fallback;
    throw error;
  }
}

export async function loadAutomationState(user) {
  const keys = localKeys(user);
  const local = {
    rules: readLocal(keys.rules, []).map((item) => normalizeRule(item, user)),
    runs: readLocal(keys.runs, []).map((item) => normalizeRun(item, user)),
    events: readLocal(keys.events, []),
    notifications: readLocal(keys.notifications, []),
    snapshots: readLocal(keys.snapshots, []),
  };
  const client = getRuntimeClient();
  if (!client || !user?.id) return { ...local, mode: 'local' };

  const [rules, runs, events] = await Promise.all([
    safeTable(client, 'automation_rules', (table) => table.select('*').order('updated_at', { ascending: false }).limit(200), null),
    safeTable(client, 'automation_runs', (table) => table.select('*').order('created_at', { ascending: false }).limit(300), null),
    safeTable(client, 'automation_events', (table) => table.select('*').order('created_at', { ascending: false }).limit(200), null),
  ]);

  if (!rules || !runs || !events) return { ...local, mode: 'local' };
  const state = {
    rules: rules.map((item) => normalizeRule(item, user)),
    runs: runs.map((item) => normalizeRun(item, user)),
    events,
    notifications: local.notifications,
    snapshots: local.snapshots,
    mode: 'cloud',
  };
  writeLocal(keys.rules, state.rules);
  writeLocal(keys.runs, state.runs);
  writeLocal(keys.events, state.events);
  return state;
}

export async function saveAutomationRule(rule, user) {
  const keys = localKeys(user);
  const normalized = normalizeRule({ ...rule, updated_at: nowIso() }, user);
  const client = getRuntimeClient();
  if (client && user?.id) {
    const saved = await safeTable(client, 'automation_rules', (table) => table.upsert(normalized).select('*').single(), null);
    if (saved) {
      const local = readLocal(keys.rules, []);
      writeLocal(keys.rules, [saved, ...local.filter((item) => item.id !== saved.id)]);
      notifyUpdate({ type: 'rule-saved', rule: saved });
      return normalizeRule(saved, user);
    }
  }
  const local = readLocal(keys.rules, []);
  writeLocal(keys.rules, [normalized, ...local.filter((item) => item.id !== normalized.id)]);
  notifyUpdate({ type: 'rule-saved', rule: normalized });
  return normalized;
}

export async function deleteAutomationRule(ruleId, user) {
  const keys = localKeys(user);
  const client = getRuntimeClient();
  if (client && user?.id) {
    await safeTable(client, 'automation_rules', (table) => table.delete().eq('id', ruleId), null);
  }
  writeLocal(keys.rules, readLocal(keys.rules, []).filter((item) => item.id !== ruleId));
  notifyUpdate({ type: 'rule-deleted', ruleId });
}

function saveRunLocal(run, user) {
  const keys = localKeys(user);
  const list = readLocal(keys.runs, []);
  const next = [run, ...list.filter((item) => item.id !== run.id)].slice(0, 500);
  writeLocal(keys.runs, next);
}

async function saveRun(run, user) {
  const client = getRuntimeClient();
  if (client && user?.id) {
    const saved = await safeTable(client, 'automation_runs', (table) => table.upsert(run).select('*').single(), null);
    if (saved) {
      saveRunLocal(saved, user);
      notifyUpdate({ type: 'run-saved', run: saved });
      return saved;
    }
  }
  saveRunLocal(run, user);
  notifyUpdate({ type: 'run-saved', run });
  return run;
}

async function updateRuleStats(rule, user, success) {
  const next = normalizeRule({
    ...rule,
    last_run_at: nowIso(),
    run_count: Number(rule.run_count || 0) + 1,
    success_count: Number(rule.success_count || 0) + (success ? 1 : 0),
  }, user);
  return saveAutomationRule(next, user);
}

function pushNotification(rule, context, user) {
  const keys = localKeys(user);
  const notification = {
    id: uid('automation-notice'),
    title: rule.action_config?.title || rule.name,
    message: rule.action_config?.message || `Quy tắc “${rule.name}” đã được thực thi.`,
    route: rule.action_config?.route || '',
    read: false,
    created_at: nowIso(),
    context,
  };
  writeLocal(keys.notifications, [notification, ...readLocal(keys.notifications, [])].slice(0, 200));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-global-notification', { detail: notification }));
  }
  return notification;
}

function createWorkDraft(rule, context) {
  const draft = {
    title: rule.action_config?.title || rule.name,
    description: rule.action_config?.message || context?.summary || rule.description || '',
    priority: rule.action_config?.priority || 'normal',
    due_at: rule.action_config?.due_at || '',
    source_module: 'automation-center-v1096',
    automation_rule_id: rule.id,
    created_at: nowIso(),
  };
  sessionStorage.setItem('bes-v1096-automation-work-draft', JSON.stringify(draft));
  return draft;
}

function createPracticeDraft(rule, context) {
  const draft = {
    title: rule.action_config?.title || `Bài luyện từ ${rule.name}`,
    sourceText: rule.action_config?.source_text || context?.sourceText || context?.summary || '',
    instruction: rule.action_config?.message || 'Tạo bài luyện thích ứng dựa trên tín hiệu tự động hóa.',
    level: rule.action_config?.level || 'B2',
    itemCount: Number(rule.action_config?.item_count || 15),
    source: 'automation-center-v1096',
  };
  sessionStorage.setItem('bes-automation-practice-to-content', JSON.stringify(draft));
  return draft;
}

function saveSnapshot(rule, context, user) {
  const keys = localKeys(user);
  const snapshot = {
    id: uid('ops-snapshot'),
    rule_id: rule.id,
    title: rule.action_config?.title || rule.name,
    context,
    location: typeof window !== 'undefined' ? window.location.hash : '',
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    created_at: nowIso(),
  };
  writeLocal(keys.snapshots, [snapshot, ...readLocal(keys.snapshots, [])].slice(0, 100));
  return snapshot;
}

async function executeAction(rule, context, user) {
  switch (rule.action_type) {
    case 'notification': return { notification: pushNotification(rule, context, user) };
    case 'work_draft': return { draft: createWorkDraft(rule, context) };
    case 'practice_draft': return { draft: createPracticeDraft(rule, context) };
    case 'open_route': {
      const route = String(rule.action_config?.route || 'work-hub').replace(/^#\//, '');
      if (typeof window !== 'undefined') window.location.hash = `#/${route}`;
      return { route };
    }
    case 'snapshot': return { snapshot: saveSnapshot(rule, context, user) };
    default: return { skipped: true };
  }
}

export async function runAutomationRule(rule, user, context = {}, { approved = false } = {}) {
  const normalized = normalizeRule(rule, user);
  const requiresApproval = normalized.requires_approval && !approved;
  let run = normalizeRun({
    rule_id: normalized.id,
    owner_id: user?.id || normalized.owner_id,
    rule_name: normalized.name,
    status: requiresApproval ? 'pending_approval' : 'running',
    trigger_type: normalized.trigger_type,
    input_json: context,
    approval_required: requiresApproval,
    started_at: nowIso(),
  }, user);
  run = await saveRun(run, user);
  if (requiresApproval) return { run, pending: true };

  try {
    const output = await executeAction(normalized, context, user);
    run = await saveRun({ ...run, status: 'success', output_json: output, approved_at: approved ? nowIso() : run.approved_at, finished_at: nowIso() }, user);
    await updateRuleStats(normalized, user, true);
    return { run, output, pending: false };
  } catch (error) {
    run = await saveRun({ ...run, status: 'failed', error_message: error?.message || String(error), finished_at: nowIso() }, user);
    await updateRuleStats(normalized, user, false);
    return { run, error, pending: false };
  }
}

export async function approveAutomationRun(run, rules, user) {
  const rule = rules.find((item) => item.id === run.rule_id);
  if (!rule) throw new Error('Không tìm thấy quy tắc nguồn.');
  const result = await runAutomationRule(rule, user, run.input_json || {}, { approved: true });
  await saveRun({ ...run, status: 'approved', approved_at: nowIso(), finished_at: nowIso(), output_json: { delegated_run_id: result.run?.id } }, user);
  return result;
}

export async function emitAutomationEvent(eventType, payload = {}, user = null) {
  const event = { id: uid('automation-event'), event_type: eventType, source: payload.source || 'application', payload, created_at: nowIso(), owner_id: user?.id || '' };
  const keys = localKeys(user);
  writeLocal(keys.events, [event, ...readLocal(keys.events, [])].slice(0, 300));
  const client = getRuntimeClient();
  if (client && user?.id) await safeTable(client, 'automation_events', (table) => table.insert(event), null);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTOMATION_EVENT, { detail: event }));
  notifyUpdate({ type: 'event-emitted', event });
  return event;
}

let cloudWorkerProbe = { checkedAt: 0, available: false };
async function hasCloudWorker() {
  const now = Date.now();
  if (now - cloudWorkerProbe.checkedAt < 5 * 60 * 1000) return cloudWorkerProbe.available;
  const client = getRuntimeClient();
  if (!client) return false;
  try {
    const { data, error } = await client.rpc('bes_v1097_cloud_status');
    cloudWorkerProbe = { checkedAt: now, available: !error && Boolean(data?.available) };
  } catch { cloudWorkerProbe = { checkedAt: now, available: false }; }
  return cloudWorkerProbe.available;
}

function parseTime(value) {
  const match = String(value || '08:00').match(/^(\d{1,2}):(\d{2})$/);
  return match ? { hour: Math.min(23, Number(match[1])), minute: Math.min(59, Number(match[2])) } : { hour: 8, minute: 0 };
}

export function isRuleDue(rule, date = new Date()) {
  if (!rule.enabled || rule.trigger_type !== 'schedule') return false;
  const { hour, minute } = parseTime(rule.trigger_config?.time);
  const last = rule.last_run_at ? new Date(rule.last_run_at) : null;
  const target = new Date(date); target.setHours(hour, minute, 0, 0);
  if (date < target) return false;
  const frequency = rule.trigger_config?.frequency || 'daily';
  if (!last || Number.isNaN(last.getTime())) return true;
  if (frequency === 'hourly') return date.getTime() - last.getTime() >= 60 * 60 * 1000;
  if (frequency === 'weekly') return date.getDay() === Number(rule.trigger_config?.weekday || 1) && last.toDateString() !== date.toDateString();
  return last.toDateString() !== date.toDateString();
}

export async function processDueRules(rules, user) {
  const due = rules.filter((rule) => isRuleDue(rule));
  const results = [];
  for (const rule of due.slice(0, 10)) {
    results.push(await runAutomationRule(rule, user, { source: 'schedule', scheduled_at: nowIso() }));
  }
  return results;
}

export async function processAutomationEvent(event, rules, user) {
  const matches = rules.filter((rule) => rule.enabled && rule.trigger_type === 'event' && rule.trigger_config?.event === event.event_type);
  const results = [];
  for (const rule of matches.slice(0, 20)) results.push(await runAutomationRule(rule, user, event.payload || {}));
  return results;
}

export function installAutomationRunner({ getUser, getRules } = {}) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  let timer = null;
  const tick = async () => {
    if (!active) return;
    const user = typeof getUser === 'function' ? getUser() : null;
    const rules = typeof getRules === 'function' ? getRules() : [];
    if (user && Array.isArray(rules) && !(await hasCloudWorker())) await processDueRules(rules, user).catch(() => {});
    timer = window.setTimeout(tick, 60000);
  };
  const onEvent = (event) => {
    const user = typeof getUser === 'function' ? getUser() : null;
    const rules = typeof getRules === 'function' ? getRules() : [];
    if (user) hasCloudWorker().then((cloud) => { if (!cloud) processAutomationEvent(event.detail || {}, rules, user).catch(() => {}); });
  };
  window.addEventListener(AUTOMATION_EVENT, onEvent);
  timer = window.setTimeout(tick, 3000);
  return () => {
    active = false;
    if (timer) window.clearTimeout(timer);
    window.removeEventListener(AUTOMATION_EVENT, onEvent);
  };
}
