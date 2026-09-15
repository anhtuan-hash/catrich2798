import { supabase } from '../utils/supabase.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';

const TABLES = Object.freeze({
  alerts: 'student_support_alerts',
  cases: 'student_support_cases',
  actions: 'student_support_actions',
  notes: 'student_support_notes',
  observations: 'student_support_teacher_observations',
  contacts: 'student_support_family_contacts',
  events: 'student_support_case_events',
});

export const CASE_TRANSITIONS = Object.freeze({
  NEW: ['REVIEWING', 'NO_ACTION_REQUIRED'],
  REVIEWING: ['ACTIVE', 'NO_ACTION_REQUIRED'],
  ACTIVE: ['FOLLOW_UP', 'RESOLVED'],
  FOLLOW_UP: ['ACTIVE', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'ACTIVE'],
  CLOSED: [],
  NO_ACTION_REQUIRED: [],
});

export const OBSERVATION_TYPES = Object.freeze([
  'TASK_INCOMPLETE',
  'MATERIAL_NOT_PREPARED',
  'CLASS_TASK_INCOMPLETE',
  'LATE_ARRIVAL',
  'ABSENCE_OBSERVED',
  'POSITIVE_PROGRESS',
  'GOOD_PARTICIPATION',
  'HELPED_PEERS',
  'OTHER_FACTUAL',
]);

const AUDIT_SAFE_KEYS = new Set([
  'id', 'case_id', 'alert_id', 'action_id', 'rule_id', 'student_ref', 'homeroom_workspace_id',
  'owner_id', 'assigned_to', 'teacher_id', 'created_by', 'contacted_by', 'actor_id',
  'status', 'category', 'alert_type', 'observation_type', 'visibility_scope', 'contact_method',
  'contact_status', 'event_type', 'from_status', 'to_status', 'rule_version',
  'created_at', 'updated_at', 'opened_at', 'resolved_at', 'closed_at', 'follow_up_at',
  'completed_at', 'contacted_at', 'observation_date', 'archived_at', 'first_triggered_at',
  'last_evaluated_at', 'window_start', 'window_end',
]);

function nowIso() {
  return new Date().toISOString();
}

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function requireClient() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  return supabase;
}

function requireUser(user) {
  if (!user?.id) throw new Error('Cần đăng nhập để thao tác Student Support.');
  return user;
}

function requireStudentRef(value) {
  const studentRef = clean(value, 240);
  if (!studentRef) throw new Error('student identity is required.');
  return studentRef;
}

function requireWorkspace(value) {
  const workspaceId = clean(value, 240);
  if (!workspaceId) throw new Error('workspace is required.');
  return workspaceId;
}

async function single(query, message = 'Không thể lưu dữ liệu Student Support.') {
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(`${message} ${error.message || ''}`.trim());
  return data;
}

export function canTransitionCase(fromStatus, toStatus) {
  const allowed = CASE_TRANSITIONS[String(fromStatus || '').toUpperCase()] || [];
  return allowed.includes(String(toStatus || '').toUpperCase());
}

export function validateObservationInput(input = {}) {
  const student_ref = requireStudentRef(input.studentRef || input.student_ref);
  const homeroom_workspace_id = requireWorkspace(input.workspaceId || input.homeroom_workspace_id);
  const source_class_name = clean(input.className || input.source_class_name, 180);
  if (!source_class_name) throw new Error('class scope is required.');
  const observation_type = clean(input.observationType || input.observation_type, 80).toUpperCase();
  if (!OBSERVATION_TYPES.includes(observation_type)) throw new Error('Observation type không hợp lệ.');

  return {
    student_ref,
    homeroom_workspace_id,
    source_workspace_id: clean(input.sourceWorkspaceId || input.source_workspace_id || homeroom_workspace_id, 240),
    source_class_name,
    subject_name: clean(input.subjectName || input.subject_name, 180),
    observation_type,
    observation_date: input.observationDate || input.observation_date || new Date().toISOString().slice(0, 10),
    period_label: clean(input.periodLabel || input.period_label, 80),
    body: clean(input.body, 4000),
    visibility_scope: clean(input.visibilityScope || input.visibility_scope || 'HOMEROOM', 40).toUpperCase(),
    submitted_to_homeroom: Boolean(input.submittedToHomeroom ?? input.submitted_to_homeroom),
    follow_up_requested: Boolean(input.followUpRequested ?? input.follow_up_requested),
  };
}

export function sanitizeAuditSnapshot(input = {}) {
  const result = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (AUDIT_SAFE_KEYS.has(key) || key.endsWith('_id')) result[key] = value;
  });
  return result;
}

export async function recordStudentSupportAudit(action, input = {}, user) {
  if (!user?.id) return null;
  return recordAuditEvent({
    action,
    entity_type: clean(input.entity_type || input.entityType || 'student_support', 120),
    entity_id: clean(input.entity_id || input.entityId || input.id, 180),
    source_module: 'student-support',
    before_data: sanitizeAuditSnapshot(input.before_data || input.beforeData || {}),
    after_data: sanitizeAuditSnapshot(input.after_data || input.afterData || {}),
    metadata: sanitizeAuditSnapshot(input.metadata || {}),
  }, user);
}

export async function listSupportAlerts(filters = {}) {
  const client = requireClient();
  let query = client.from(TABLES.alerts).select('*').is('archived_at', null).order('updated_at', { ascending: false }).limit(500);
  if (filters.studentRef) query = query.eq('student_ref', filters.studentRef);
  if (filters.workspaceId) query = query.eq('homeroom_workspace_id', filters.workspaceId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.alertType) query = query.eq('alert_type', filters.alertType);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertEvaluatedAlert(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const dedupeKey = clean(input.dedupeKey || input.dedupe_key, 500);
  if (!dedupeKey) throw new Error('Alert dedupe_key is required.');
  const studentRef = requireStudentRef(input.studentRef || input.student_ref);
  const workspaceId = requireWorkspace(input.workspaceId || input.homeroom_workspace_id);

  const { data: existing, error: lookupError } = await client
    .from(TABLES.alerts)
    .select('*')
    .eq('dedupe_key', dedupeKey)
    .is('archived_at', null)
    .in('status', ['NEW', 'REVIEWING', 'LINKED_TO_CASE'])
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    return single(client.from(TABLES.alerts).update({
      evidence: input.evidence || {},
      last_evaluated_at: nowIso(),
      window_start: input.windowStart || input.window_start || existing.window_start || null,
      window_end: input.windowEnd || input.window_end || existing.window_end || null,
    }).eq('id', existing.id), 'Không thể cập nhật cảnh báo.');
  }

  return single(client.from(TABLES.alerts).insert({
    student_ref: studentRef,
    homeroom_workspace_id: workspaceId,
    source_class_name: clean(input.className || input.source_class_name, 180),
    school_year: clean(input.schoolYear || input.school_year, 80),
    rule_id: input.ruleId || input.rule_id,
    rule_version: Number(input.ruleVersion || input.rule_version || 1),
    alert_type: clean(input.alertType || input.alert_type, 120),
    status: 'NEW',
    evidence: input.evidence || {},
    window_start: input.windowStart || input.window_start || null,
    window_end: input.windowEnd || input.window_end || null,
    dedupe_key: dedupeKey,
    first_triggered_at: nowIso(),
    last_evaluated_at: nowIso(),
  }), 'Không thể tạo cảnh báo.');
}

export async function reviewAlert(alertId, decision = {}, user) {
  requireUser(user);
  const client = requireClient();
  const nextStatus = clean(decision.status || 'REVIEWING', 40).toUpperCase();
  if (!['REVIEWING', 'LINKED_TO_CASE', 'NO_ACTION_REQUIRED', 'RESOLVED'].includes(nextStatus)) {
    throw new Error('Trạng thái xử lý cảnh báo không hợp lệ.');
  }
  const before = await getById(TABLES.alerts, alertId);
  const after = await single(client.from(TABLES.alerts).update({
    status: nextStatus,
    assigned_to: decision.assignedTo || decision.assigned_to || before.assigned_to || null,
    linked_case_id: decision.linkedCaseId || decision.linked_case_id || before.linked_case_id || null,
  }).eq('id', alertId), 'Không thể cập nhật cảnh báo.');
  await recordStudentSupportAudit('student_support.alert_reviewed', {
    entity_type: 'student_support_alert', entity_id: alertId, before_data: before, after_data: after,
  }, user);
  return after;
}

export async function listSupportCases(filters = {}) {
  const client = requireClient();
  let query = client.from(TABLES.cases).select('*').is('archived_at', null).order('updated_at', { ascending: false }).limit(500);
  if (filters.studentRef) query = query.eq('student_ref', filters.studentRef);
  if (filters.workspaceId) query = query.eq('homeroom_workspace_id', filters.workspaceId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getById(table, id) {
  const client = requireClient();
  const { data, error } = await client.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function appendCaseEvent(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  return single(client.from(TABLES.events).insert({
    case_id: input.caseId || input.case_id,
    student_ref: requireStudentRef(input.studentRef || input.student_ref),
    homeroom_workspace_id: requireWorkspace(input.workspaceId || input.homeroom_workspace_id),
    actor_id: user.id,
    event_type: clean(input.eventType || input.event_type, 120),
    from_status: input.fromStatus || input.from_status || null,
    to_status: input.toStatus || input.to_status || null,
    metadata: sanitizeAuditSnapshot(input.metadata || {}),
  }), 'Không thể ghi timeline.');
}

export async function createSupportCase(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const row = await single(client.from(TABLES.cases).insert({
    student_ref: requireStudentRef(input.studentRef || input.student_ref),
    homeroom_workspace_id: requireWorkspace(input.workspaceId || input.homeroom_workspace_id),
    source_class_name: clean(input.className || input.source_class_name, 180),
    school_year: clean(input.schoolYear || input.school_year, 80),
    category: clean(input.category, 120),
    title: clean(input.title, 240),
    reason: clean(input.reason, 4000),
    goal: clean(input.goal, 4000),
    owner_id: input.ownerId || input.owner_id || user.id,
    status: 'NEW',
    follow_up_at: input.followUpAt || input.follow_up_at || null,
    created_by: user.id,
  }), 'Không thể tạo hồ sơ hỗ trợ.');
  await appendCaseEvent({
    caseId: row.id, studentRef: row.student_ref, workspaceId: row.homeroom_workspace_id,
    eventType: 'CASE_CREATED', toStatus: 'NEW', metadata: { category: row.category },
  }, user);
  await recordStudentSupportAudit('student_support.case_created', {
    entity_type: 'student_support_case', entity_id: row.id, after_data: row,
  }, user);
  return row;
}

export async function transitionSupportCase(caseId, nextStatus, user) {
  requireUser(user);
  const client = requireClient();
  const before = await getById(TABLES.cases, caseId);
  const toStatus = clean(nextStatus, 40).toUpperCase();
  if (!canTransitionCase(before.status, toStatus)) {
    throw new Error(`Không thể chuyển hồ sơ từ ${before.status} sang ${toStatus}.`);
  }
  const patch = { status: toStatus };
  if (toStatus === 'RESOLVED') patch.resolved_at = nowIso();
  if (toStatus === 'CLOSED') patch.closed_at = nowIso();
  if (toStatus === 'ACTIVE' && before.status === 'RESOLVED') patch.resolved_at = null;
  const after = await single(client.from(TABLES.cases).update(patch).eq('id', caseId), 'Không thể đổi trạng thái hồ sơ.');
  await appendCaseEvent({
    caseId, studentRef: before.student_ref, workspaceId: before.homeroom_workspace_id,
    eventType: 'CASE_STATUS_CHANGED', fromStatus: before.status, toStatus,
  }, user);
  await recordStudentSupportAudit('student_support.case_status_changed', {
    entity_type: 'student_support_case', entity_id: caseId, before_data: before, after_data: after,
  }, user);
  return after;
}

export async function createSupportAction(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const row = await single(client.from(TABLES.actions).insert({
    case_id: input.caseId || input.case_id,
    student_ref: requireStudentRef(input.studentRef || input.student_ref),
    homeroom_workspace_id: requireWorkspace(input.workspaceId || input.homeroom_workspace_id),
    title: clean(input.title, 240),
    description: clean(input.description, 4000),
    assigned_to: input.assignedTo || input.assigned_to || null,
    status: 'TODO',
    due_at: input.dueAt || input.due_at || null,
    created_by: user.id,
  }), 'Không thể tạo hoạt động hỗ trợ.');
  await recordStudentSupportAudit('student_support.action_created', {
    entity_type: 'student_support_action', entity_id: row.id, after_data: row,
  }, user);
  return row;
}

export async function updateSupportAction(actionId, patch = {}, user) {
  requireUser(user);
  const client = requireClient();
  const before = await getById(TABLES.actions, actionId);
  const status = clean(patch.status || before.status, 40).toUpperCase();
  if (!['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(status)) throw new Error('Trạng thái action không hợp lệ.');
  const after = await single(client.from(TABLES.actions).update({
    status,
    due_at: patch.dueAt ?? patch.due_at ?? before.due_at,
    assigned_to: patch.assignedTo ?? patch.assigned_to ?? before.assigned_to,
    outcome_note: clean(patch.outcomeNote ?? patch.outcome_note ?? before.outcome_note, 4000),
    completed_at: status === 'DONE' ? (before.completed_at || nowIso()) : null,
  }).eq('id', actionId), 'Không thể cập nhật hoạt động hỗ trợ.');
  if (status === 'DONE' && before.status !== 'DONE') {
    await recordStudentSupportAudit('student_support.action_completed', {
      entity_type: 'student_support_action', entity_id: actionId, before_data: before, after_data: after,
    }, user);
  }
  return after;
}

export async function createSupportNote(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const visibility = clean(input.visibilityScope || input.visibility_scope || 'HOMEROOM', 40).toUpperCase();
  if (!['PRIVATE', 'HOMEROOM', 'TEACHING_TEAM', 'MANAGEMENT'].includes(visibility)) throw new Error('Phạm vi ghi chú không hợp lệ.');
  const row = await single(client.from(TABLES.notes).insert({
    case_id: input.caseId || input.case_id,
    student_ref: requireStudentRef(input.studentRef || input.student_ref),
    homeroom_workspace_id: requireWorkspace(input.workspaceId || input.homeroom_workspace_id),
    author_id: user.id,
    note_type: clean(input.noteType || input.note_type || 'GENERAL', 80),
    body: clean(input.body, 6000),
    visibility_scope: visibility,
  }), 'Không thể tạo ghi chú.');
  await recordStudentSupportAudit('student_support.note_created', {
    entity_type: 'student_support_note', entity_id: row.id, after_data: row,
  }, user);
  return row;
}

export async function createTeacherObservation(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const payload = validateObservationInput(input);
  const row = await single(client.from(TABLES.observations).insert({ ...payload, teacher_id: user.id }), 'Không thể tạo ghi nhận giáo viên.');
  await recordStudentSupportAudit('student_support.observation_created', {
    entity_type: 'student_support_observation', entity_id: row.id, after_data: row,
  }, user);
  return row;
}

export async function createFamilyContact(input = {}, user) {
  requireUser(user);
  const client = requireClient();
  const row = await single(client.from(TABLES.contacts).insert({
    case_id: input.caseId || input.case_id,
    student_ref: requireStudentRef(input.studentRef || input.student_ref),
    homeroom_workspace_id: requireWorkspace(input.workspaceId || input.homeroom_workspace_id),
    contacted_by: user.id,
    contact_method: clean(input.contactMethod || input.contact_method, 80),
    contact_status: clean(input.contactStatus || input.contact_status, 80),
    contacted_at: input.contactedAt || input.contacted_at || nowIso(),
    summary: clean(input.summary, 6000),
    follow_up_required: Boolean(input.followUpRequired ?? input.follow_up_required),
  }), 'Không thể ghi nhật ký liên hệ gia đình.');
  await recordStudentSupportAudit('student_support.family_contact_logged', {
    entity_type: 'student_support_family_contact', entity_id: row.id, after_data: row,
  }, user);
  return row;
}

export async function archiveSupportCase(caseId, user) {
  requireUser(user);
  const client = requireClient();
  const before = await getById(TABLES.cases, caseId);
  const after = await single(client.from(TABLES.cases).update({ archived_at: nowIso() }).eq('id', caseId), 'Không thể lưu trữ hồ sơ.');
  await appendCaseEvent({
    caseId, studentRef: before.student_ref, workspaceId: before.homeroom_workspace_id,
    eventType: 'CASE_ARCHIVED', metadata: { archived_at: after.archived_at },
  }, user);
  await recordStudentSupportAudit('student_support.case_archived', {
    entity_type: 'student_support_case', entity_id: caseId, before_data: before, after_data: after,
  }, user);
  return after;
}

export async function restoreSupportCase(caseId, user) {
  requireUser(user);
  const client = requireClient();
  const before = await getById(TABLES.cases, caseId);
  const after = await single(client.from(TABLES.cases).update({ archived_at: null }).eq('id', caseId), 'Không thể khôi phục hồ sơ.');
  await appendCaseEvent({
    caseId, studentRef: before.student_ref, workspaceId: before.homeroom_workspace_id,
    eventType: 'CASE_RESTORED', metadata: { archived_at: null },
  }, user);
  await recordStudentSupportAudit('student_support.case_restored', {
    entity_type: 'student_support_case', entity_id: caseId, before_data: before, after_data: after,
  }, user);
  return after;
}
