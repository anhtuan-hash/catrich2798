import { getRuntimeClient, runtimeRpc, subscribeTable } from '../services/runtime/core.js';
import { isLeader, readLocal, scopedLocalKey, uid, writeLocal } from '../pages/v1093/shared.js';

export const GOVERNANCE_UPDATED = 'bes-governance-v1098-updated';
export const COLLABORATION_UPDATED = 'bes-collaboration-v1098-updated';
export const RETENTION_DAYS = 30;

const TABLES = {
  spaces: 'collaboration_spaces',
  members: 'collaboration_members',
  threads: 'collaboration_threads',
  comments: 'collaboration_comments',
  versions: 'content_versions',
  permissions: 'permission_overrides',
  audit: 'audit_events',
  snapshots: 'backup_snapshots',
  backupItems: 'backup_items',
  deleted: 'deleted_items',
};

function nowIso() { return new Date().toISOString(); }
function cleanText(value, max = 500) { return String(value || '').trim().slice(0, max); }
function userToken(user) { return user?.id || user?.email || 'guest'; }
function localKeys(user) {
  const token = userToken(user);
  return {
    spaces: scopedLocalKey('bes-v1098-spaces', { id: token }),
    members: scopedLocalKey('bes-v1098-members', { id: token }),
    threads: scopedLocalKey('bes-v1098-threads', { id: token }),
    comments: scopedLocalKey('bes-v1098-comments', { id: token }),
    versions: scopedLocalKey('bes-v1098-versions', { id: token }),
    permissions: scopedLocalKey('bes-v1098-permissions', { id: token }),
    audit: scopedLocalKey('bes-v1098-audit', { id: token }),
    snapshots: scopedLocalKey('bes-v1098-snapshots', { id: token }),
    deleted: scopedLocalKey('bes-v1098-deleted', { id: token }),
  };
}

function dispatch(name, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function tableMissing(error) {
  return /does not exist|schema cache|could not find|42P01/i.test(error?.message || '');
}

async function safeSelect(table, configure, fallback = []) {
  const client = getRuntimeClient();
  if (!client) return { data: fallback, cloud: false };
  try {
    let query = client.from(table).select('*');
    query = typeof configure === 'function' ? configure(query) : query;
    const { data, error } = await query;
    if (error) {
      if (tableMissing(error)) return { data: fallback, cloud: false, missing: true };
      throw error;
    }
    return { data: data || fallback, cloud: true };
  } catch (error) {
    if (tableMissing(error)) return { data: fallback, cloud: false, missing: true };
    throw error;
  }
}

async function safeInsert(table, payload, fallbackFactory) {
  const client = getRuntimeClient();
  if (client) {
    const { data, error } = await client.from(table).insert(payload).select('*').single();
    if (!error) return { data, cloud: true };
    if (!tableMissing(error)) throw error;
  }
  return { data: fallbackFactory(), cloud: false };
}

async function safeUpdate(table, id, patch, fallback) {
  const client = getRuntimeClient();
  if (client) {
    const { data, error } = await client.from(table).update(patch).eq('id', id).select('*').single();
    if (!error) return { data, cloud: true };
    if (!tableMissing(error)) throw error;
  }
  return { data: { ...fallback, ...patch, id }, cloud: false };
}

function parseMentions(body, people = []) {
  const text = String(body || '');
  return people.filter((person) => {
    const name = String(person.name || person.full_name || person.email || '').trim();
    return name && text.toLowerCase().includes(`@${name.toLowerCase()}`);
  }).map((person) => person.id || person.user_id || person.profile_id).filter(Boolean);
}

export async function loadPeople() {
  const result = await safeSelect('profiles', (query) => query.limit(500), []);
  return (result.data || []).map((profile) => ({
    id: profile.id || profile.user_id || profile.profile_id,
    name: profile.full_name || profile.name || profile.email || 'Giáo viên',
    email: profile.email || '',
    role: profile.role || 'teacher',
  })).filter((person) => person.id);
}

export async function loadCollaborationState(user) {
  const keys = localKeys(user);
  const local = {
    spaces: readLocal(keys.spaces, []), members: readLocal(keys.members, []), threads: readLocal(keys.threads, []),
    comments: readLocal(keys.comments, []), versions: readLocal(keys.versions, []), permissions: readLocal(keys.permissions, []),
  };
  const [spaces, members, threads, comments, versions, permissions] = await Promise.all([
    safeSelect(TABLES.spaces, (query) => query.order('updated_at', { ascending: false }).limit(300), local.spaces),
    safeSelect(TABLES.members, (query) => query.order('created_at', { ascending: true }).limit(1500), local.members),
    safeSelect(TABLES.threads, (query) => query.order('updated_at', { ascending: false }).limit(1000), local.threads),
    safeSelect(TABLES.comments, (query) => query.order('created_at', { ascending: true }).limit(2500), local.comments),
    safeSelect(TABLES.versions, (query) => query.order('created_at', { ascending: false }).limit(1500), local.versions),
    safeSelect(TABLES.permissions, (query) => query.order('created_at', { ascending: false }).limit(1000), local.permissions),
  ]);
  const state = {
    spaces: spaces.data, members: members.data, threads: threads.data, comments: comments.data,
    versions: versions.data, permissions: permissions.data,
    mode: [spaces, members, threads, comments].every((entry) => entry.cloud) ? 'cloud' : 'local',
  };
  writeLocal(keys.spaces, state.spaces); writeLocal(keys.members, state.members); writeLocal(keys.threads, state.threads);
  writeLocal(keys.comments, state.comments); writeLocal(keys.versions, state.versions); writeLocal(keys.permissions, state.permissions);
  return state;
}

export async function createCollaborationSpace(input, user) {
  const payload = {
    owner_id: user.id,
    title: cleanText(input.title, 180),
    description: cleanText(input.description, 2000),
    space_type: input.space_type || 'project',
    visibility: isLeader(user) ? (input.visibility || 'restricted') : 'restricted',
    status: 'active',
    metadata: { color: input.color || '#3f72cf', created_in: '10.98.0' },
  };
  const result = await safeInsert(TABLES.spaces, payload, () => ({ ...payload, id: uid('space'), created_at: nowIso(), updated_at: nowIso() }));
  const keys = localKeys(user);
  const spaces = [result.data, ...readLocal(keys.spaces, []).filter((item) => item.id !== result.data.id)];
  writeLocal(keys.spaces, spaces);
  await addCollaborationMember({ space_id: result.data.id, user_id: user.id, member_role: 'owner', display_name: user.name || user.email, email: user.email }, user, { skipAudit: true });
  await recordAuditEvent({ action: 'collaboration.space_created', entity_type: 'collaboration_space', entity_id: result.data.id, source_module: 'collaboration-hub', after_data: result.data }, user);
  dispatch(COLLABORATION_UPDATED, { type: 'space-created', id: result.data.id });
  return result.data;
}

export async function addCollaborationMember(input, actor, { skipAudit = false } = {}) {
  const payload = {
    space_id: input.space_id,
    user_id: input.user_id,
    member_role: input.member_role || 'member',
    display_name: cleanText(input.display_name || input.name || input.email, 180),
    email: cleanText(input.email, 240).toLowerCase(),
    status: 'active',
    invited_by: actor?.id || null,
  };
  const client = getRuntimeClient();
  let data;
  if (client) {
    const { data: saved, error } = await client.from(TABLES.members).upsert(payload, { onConflict: 'space_id,user_id' }).select('*').single();
    if (!error) data = saved;
    else if (!tableMissing(error)) throw error;
  }
  if (!data) data = { ...payload, id: uid('member'), created_at: nowIso(), updated_at: nowIso() };
  const keys = localKeys(actor);
  const next = [data, ...readLocal(keys.members, []).filter((entry) => !(entry.space_id === data.space_id && entry.user_id === data.user_id))];
  writeLocal(keys.members, next);
  if (!skipAudit) await recordAuditEvent({ action: 'collaboration.member_added', entity_type: 'collaboration_member', entity_id: data.id, source_module: 'collaboration-hub', after_data: data }, actor);
  dispatch(COLLABORATION_UPDATED, { type: 'member-added', spaceId: data.space_id });
  return data;
}

export async function createThread(input, user) {
  const payload = {
    space_id: input.space_id,
    created_by: user.id,
    title: cleanText(input.title, 240),
    thread_type: input.thread_type || 'discussion',
    status: 'open',
    metadata: input.metadata || {},
  };
  const result = await safeInsert(TABLES.threads, payload, () => ({ ...payload, id: uid('thread'), created_at: nowIso(), updated_at: nowIso() }));
  const keys = localKeys(user); writeLocal(keys.threads, [result.data, ...readLocal(keys.threads, [])]);
  await recordAuditEvent({ action: 'collaboration.thread_created', entity_type: 'collaboration_thread', entity_id: result.data.id, source_module: 'collaboration-hub', after_data: result.data }, user);
  dispatch(COLLABORATION_UPDATED, { type: 'thread-created', spaceId: input.space_id });
  return result.data;
}

export async function addThreadComment(input, user, people = []) {
  const payload = {
    space_id: input.space_id,
    thread_id: input.thread_id,
    author_id: user.id,
    author_name: cleanText(user.name || user.email, 180),
    body: cleanText(input.body, 6000),
    parent_id: input.parent_id || null,
    mentions: parseMentions(input.body, people),
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    resolved: false,
  };
  const result = await safeInsert(TABLES.comments, payload, () => ({ ...payload, id: uid('comment'), created_at: nowIso(), updated_at: nowIso() }));
  const keys = localKeys(user); writeLocal(keys.comments, [...readLocal(keys.comments, []), result.data]);
  await recordAuditEvent({ action: 'collaboration.comment_added', entity_type: 'collaboration_comment', entity_id: result.data.id, source_module: 'collaboration-hub', after_data: { ...result.data, body: result.data.body.slice(0, 500) } }, user);
  dispatch(COLLABORATION_UPDATED, { type: 'comment-added', threadId: input.thread_id });
  return result.data;
}

export async function resolveThread(thread, user, status = 'resolved') {
  const patch = { status, resolved_at: status === 'resolved' ? nowIso() : null, updated_at: nowIso() };
  const result = await safeUpdate(TABLES.threads, thread.id, patch, thread);
  const keys = localKeys(user); writeLocal(keys.threads, readLocal(keys.threads, []).map((item) => item.id === thread.id ? result.data : item));
  await recordAuditEvent({ action: status === 'resolved' ? 'collaboration.thread_resolved' : 'collaboration.thread_reopened', entity_type: 'collaboration_thread', entity_id: thread.id, source_module: 'collaboration-hub', before_data: thread, after_data: result.data }, user);
  dispatch(COLLABORATION_UPDATED, { type: 'thread-updated', id: thread.id });
  return result.data;
}

export async function createContentVersion(input, user) {
  const client = getRuntimeClient();
  let nextVersion = 1;
  if (client) {
    const { data } = await client.from(TABLES.versions).select('version_no').eq('entity_type', input.entity_type).eq('entity_id', input.entity_id).order('version_no', { ascending: false }).limit(1);
    nextVersion = Number(data?.[0]?.version_no || 0) + 1;
  } else {
    const keys = localKeys(user);
    nextVersion = Math.max(0, ...readLocal(keys.versions, []).filter((item) => item.entity_type === input.entity_type && item.entity_id === input.entity_id).map((item) => Number(item.version_no || 0))) + 1;
  }
  const payload = {
    space_id: input.space_id || null,
    entity_type: input.entity_type || 'document',
    entity_id: input.entity_id,
    version_no: nextVersion,
    title: cleanText(input.title, 240),
    content: input.content && typeof input.content === 'object' ? input.content : { value: input.content },
    created_by: user.id,
    status: input.status || 'draft',
    restore_of: input.restore_of || null,
    metadata: input.metadata || {},
  };
  const result = await safeInsert(TABLES.versions, payload, () => ({ ...payload, id: uid('version'), created_at: nowIso() }));
  const keys = localKeys(user); writeLocal(keys.versions, [result.data, ...readLocal(keys.versions, [])]);
  await recordAuditEvent({ action: input.restore_of ? 'content.version_restored' : 'content.version_created', entity_type: input.entity_type, entity_id: input.entity_id, source_module: 'collaboration-hub', after_data: { version_no: nextVersion, title: payload.title } }, user);
  dispatch(COLLABORATION_UPDATED, { type: 'version-created', entityId: input.entity_id });
  return result.data;
}

export async function recordAuditEvent(input, user) {
  if (!user?.id) return null;
  const payload = {
    actor_id: user.id,
    actor_email: cleanText(user.email, 240).toLowerCase(),
    actor_role: cleanText(user.role, 80).toLowerCase(),
    action: cleanText(input.action, 180),
    entity_type: cleanText(input.entity_type, 120),
    entity_id: cleanText(input.entity_id, 180),
    source_module: cleanText(input.source_module || 'system', 120),
    before_data: input.before_data && typeof input.before_data === 'object' ? input.before_data : {},
    after_data: input.after_data && typeof input.after_data === 'object' ? input.after_data : {},
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
  const result = await safeInsert(TABLES.audit, payload, () => ({ ...payload, id: uid('audit'), created_at: nowIso() }));
  const keys = localKeys(user); writeLocal(keys.audit, [result.data, ...readLocal(keys.audit, [])].slice(0, 2000));
  dispatch(GOVERNANCE_UPDATED, { type: 'audit', action: payload.action });
  return result.data;
}

async function collectScopeData(scope) {
  const tablesByScope = {
    collaboration: [TABLES.spaces, TABLES.members, TABLES.threads, TABLES.comments, TABLES.versions, TABLES.permissions],
    work: ['work_hub_items', 'work_hub_comments'],
    knowledge: ['resource_items', 'resource_smart_metadata', 'resource_collections', 'resource_collection_items'],
    assessment: ['assessment_items', 'assessment_blueprints', 'assessment_tests', 'assessment_test_items'],
    automation: ['automation_rules', 'automation_runs', 'automation_events', 'automation_cloud_jobs'],
  };
  const selected = tablesByScope[scope] || tablesByScope.collaboration;
  const data = {};
  for (const table of selected) {
    const result = await safeSelect(table, (query) => query.limit(1000), []);
    data[table] = result.data || [];
  }
  return data;
}

export async function createBackupSnapshot({ label, scope = 'collaboration', retention_days = 30 }, user) {
  const snapshotData = await collectScopeData(scope);
  const itemCount = Object.values(snapshotData).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  const payload = {
    owner_id: user.id,
    label: cleanText(label || `${scope} ${new Date().toLocaleDateString('vi-VN')}`, 240),
    scope,
    status: 'ready',
    item_count: itemCount,
    snapshot_data: snapshotData,
    created_by: user.id,
    expires_at: new Date(Date.now() + Math.max(1, Math.min(365, Number(retention_days || 30))) * 86400000).toISOString(),
    metadata: { application_version: '10.98.0' },
  };
  const result = await safeInsert(TABLES.snapshots, payload, () => ({ ...payload, id: uid('snapshot'), created_at: nowIso(), updated_at: nowIso() }));
  const client = getRuntimeClient();
  if (client && result.cloud) {
    const rows = Object.entries(snapshotData).flatMap(([entity_type, entries]) => (entries || []).map((entry) => ({ snapshot_id: result.data.id, entity_type, entity_id: String(entry.id || ''), payload: entry })));
    if (rows.length) {
      const { error } = await client.from(TABLES.backupItems).insert(rows.slice(0, 5000));
      if (error && !tableMissing(error)) console.warn('[V10.98] backup_items insert failed', error);
    }
  }
  const keys = localKeys(user); writeLocal(keys.snapshots, [result.data, ...readLocal(keys.snapshots, [])]);
  await recordAuditEvent({ action: 'governance.snapshot_created', entity_type: 'backup_snapshot', entity_id: result.data.id, source_module: 'data-governance', after_data: { label: payload.label, scope, item_count: itemCount } }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'snapshot-created', id: result.data.id });
  return result.data;
}

const RESTORABLE_TABLES = new Set([
  TABLES.spaces, TABLES.members, TABLES.threads, TABLES.comments, TABLES.versions, TABLES.permissions,
  'work_hub_items', 'work_hub_comments', 'resource_smart_metadata', 'resource_collections', 'resource_collection_items',
  'assessment_items', 'assessment_blueprints', 'assessment_tests', 'assessment_test_items',
]);

export async function restoreBackupSnapshot(snapshot, user) {
  if (!isLeader(user)) throw new Error('Chỉ Admin/TTCM được khôi phục snapshot.');
  const client = getRuntimeClient();
  if (!client) throw new Error('Khôi phục snapshot cần kết nối Supabase.');
  const payload = snapshot.snapshot_data || {};
  const restored = [];
  for (const [table, rows] of Object.entries(payload)) {
    if (!RESTORABLE_TABLES.has(table) || !Array.isArray(rows) || !rows.length) continue;
    const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
    restored.push({ table, count: rows.length });
  }
  await recordAuditEvent({ action: 'governance.snapshot_restored', entity_type: 'backup_snapshot', entity_id: snapshot.id, source_module: 'data-governance', after_data: { restored } }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'snapshot-restored', id: snapshot.id });
  return restored;
}

export async function softDeleteEntity(input, user) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (input.entity_type === 'resource_item' && uuidPattern.test(String(input.entity_id || '')) && getRuntimeClient()) {
    const { data, error } = await runtimeRpc('bes_v1098_soft_delete_resource', { target_resource: input.entity_id });
    if (!error && data) {
      const client = getRuntimeClient();
      const { data: record } = await client.from(TABLES.deleted).select('*').eq('id', data).maybeSingle();
      dispatch(GOVERNANCE_UPDATED, { type: 'soft-delete', id: data });
      return record || { id: data, entity_type: 'resource_item', entity_id: input.entity_id, title: input.title, status: 'deleted' };
    }
    if (error && !tableMissing(error)) throw error;
  }
  const payload = {
    entity_type: cleanText(input.entity_type, 120),
    entity_id: cleanText(input.entity_id, 180),
    title: cleanText(input.title, 300),
    source_module: cleanText(input.source_module || 'system', 120),
    deleted_by: user.id,
    payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
    restore_payload: input.restore_payload && typeof input.restore_payload === 'object' ? input.restore_payload : {},
    status: 'deleted',
    expires_at: new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString(),
  };
  const result = await safeInsert(TABLES.deleted, payload, () => ({ ...payload, id: uid('deleted'), created_at: nowIso(), updated_at: nowIso() }));
  const keys = localKeys(user); writeLocal(keys.deleted, [result.data, ...readLocal(keys.deleted, [])]);
  await recordAuditEvent({ action: 'governance.soft_delete', entity_type: payload.entity_type, entity_id: payload.entity_id, source_module: payload.source_module, before_data: payload.payload, after_data: { deleted_item_id: result.data.id, expires_at: payload.expires_at } }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'soft-delete', id: result.data.id });
  return result.data;
}

export async function restoreDeletedEntity(record, user) {
  const client = getRuntimeClient();
  if (!client) throw new Error('Khôi phục dữ liệu cần kết nối Supabase.');
  const restore = record.restore_payload || {};
  if (restore.table && restore.row) {
    const { error } = await client.from(restore.table).upsert(restore.row, { onConflict: 'id' });
    if (error) throw error;
  }
  if (record.entity_type === 'resource_item' && restore.resource_id) {
    const { error } = await client.from('resource_items').update({ deleted_at: null, deleted_by: null, status: restore.previous_status || 'approved' }).eq('id', restore.resource_id);
    if (error) throw error;
  }
  const patch = { status: 'restored', restored_at: nowIso(), restored_by: user.id, updated_at: nowIso() };
  const { error } = await client.from(TABLES.deleted).update(patch).eq('id', record.id);
  if (error) throw error;
  await recordAuditEvent({ action: 'governance.restore_deleted', entity_type: record.entity_type, entity_id: record.entity_id, source_module: 'data-governance', after_data: { deleted_item_id: record.id } }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'restore-deleted', id: record.id });
  return true;
}

export async function permanentlyDeleteEntity(record, user) {
  if (!isLeader(user)) throw new Error('Chỉ Admin/TTCM được xóa vĩnh viễn.');
  const client = getRuntimeClient();
  if (!client) throw new Error('Xóa vĩnh viễn cần kết nối Supabase.');

  // Resource files are retained during the normal trash window. They are only
  // moved to Google Drive trash after an explicit permanent-delete action.
  if (record.entity_type === 'resource_item') {
    const payload = record.payload || {};
    const resourceId = record.entity_id || payload.id || payload.resource_id || payload.resourceId || '';
    const fileId = payload.drive_file_id || payload.driveFileId || '';
    if (resourceId || fileId) {
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại trước khi xóa vĩnh viễn.');
      const response = await fetch('/api/google-drive-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resourceId, fileId, title: record.title || payload.title || '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Không thể chuyển file Google Drive vào thùng rác.');
    }
  }

  const { error } = await client.from(TABLES.deleted).update({ status: 'purged', permanently_deleted_at: nowIso(), updated_at: nowIso() }).eq('id', record.id);
  if (error) throw error;
  await recordAuditEvent({ action: 'governance.permanent_delete', entity_type: record.entity_type, entity_id: record.entity_id, source_module: 'data-governance', before_data: record.payload, after_data: { deleted_item_id: record.id, drive_file_trashed: record.entity_type === 'resource_item' } }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'permanent-delete', id: record.id });
  return true;
}

export async function loadGovernanceState(user) {
  const keys = localKeys(user);
  const local = { audit: readLocal(keys.audit, []), snapshots: readLocal(keys.snapshots, []), deleted: readLocal(keys.deleted, []), permissions: readLocal(keys.permissions, []) };
  const [audit, snapshots, deleted, permissions] = await Promise.all([
    safeSelect(TABLES.audit, (query) => query.order('created_at', { ascending: false }).limit(1000), local.audit),
    safeSelect(TABLES.snapshots, (query) => query.order('created_at', { ascending: false }).limit(300), local.snapshots),
    safeSelect(TABLES.deleted, (query) => query.neq('status', 'purged').order('created_at', { ascending: false }).limit(1000), local.deleted),
    safeSelect(TABLES.permissions, (query) => query.order('created_at', { ascending: false }).limit(1000), local.permissions),
  ]);
  const state = { audit: audit.data, snapshots: snapshots.data, deleted: deleted.data, permissions: permissions.data, mode: [audit, snapshots, deleted].every((entry) => entry.cloud) ? 'cloud' : 'local' };
  writeLocal(keys.audit, state.audit); writeLocal(keys.snapshots, state.snapshots); writeLocal(keys.deleted, state.deleted); writeLocal(keys.permissions, state.permissions);
  return state;
}

export async function savePermissionOverride(input, user) {
  if (!isLeader(user)) throw new Error('Chỉ Admin/TTCM được thay đổi quyền ngoại lệ.');
  const payload = {
    resource_type: cleanText(input.resource_type, 120), resource_id: cleanText(input.resource_id, 180),
    principal_type: input.principal_type || 'user', principal_id: cleanText(input.principal_id, 180),
    permission_level: input.permission_level || 'viewer', granted_by: user.id,
    expires_at: input.expires_at || null, metadata: input.metadata || {},
  };
  const client = getRuntimeClient();
  let data;
  if (client) {
    const { data: saved, error } = await client.from(TABLES.permissions).upsert(payload, { onConflict: 'resource_type,resource_id,principal_type,principal_id' }).select('*').single();
    if (!error) data = saved;
    else if (!tableMissing(error)) throw error;
  }
  if (!data) data = { ...payload, id: uid('permission'), created_at: nowIso(), updated_at: nowIso() };
  const keys = localKeys(user); writeLocal(keys.permissions, [data, ...readLocal(keys.permissions, []).filter((item) => item.id !== data.id)]);
  await recordAuditEvent({ action: 'governance.permission_override_saved', entity_type: input.resource_type, entity_id: input.resource_id, source_module: 'data-governance', after_data: data }, user);
  dispatch(GOVERNANCE_UPDATED, { type: 'permission-saved', id: data.id });
  return data;
}

export function subscribeCollaboration(user, onChange) {
  const key = user?.id || 'guest';
  const tables = [TABLES.spaces, TABLES.members, TABLES.threads, TABLES.comments, TABLES.versions];
  const cleanups = tables.map((table) => subscribeTable({ key: `v1098-${table}-${key}`, table, onChange }));
  const listener = () => onChange?.();
  window.addEventListener(COLLABORATION_UPDATED, listener);
  return () => { cleanups.forEach((cleanup) => cleanup?.()); window.removeEventListener(COLLABORATION_UPDATED, listener); };
}

export function subscribeGovernance(user, onChange) {
  const key = user?.id || 'guest';
  const tables = [TABLES.audit, TABLES.snapshots, TABLES.deleted, TABLES.permissions];
  const cleanups = tables.map((table) => subscribeTable({ key: `v1098-${table}-${key}`, table, onChange }));
  const listener = () => onChange?.();
  window.addEventListener(GOVERNANCE_UPDATED, listener);
  return () => { cleanups.forEach((cleanup) => cleanup?.()); window.removeEventListener(GOVERNANCE_UPDATED, listener); };
}

export function subscribeSpacePresence(spaceId, user, onChange) {
  const client = getRuntimeClient();
  if (!client || !spaceId || !user?.id) return () => {};
  const channel = client.channel(`bes-v1098-presence-${spaceId}`, { config: { presence: { key: user.id } } });
  const emitState = () => {
    const state = channel.presenceState();
    const users = Object.values(state).flat().map((entry) => ({ id: entry.user_id, name: entry.name, role: entry.role, online_at: entry.online_at }));
    onChange?.(users);
  };
  channel.on('presence', { event: 'sync' }, emitState).on('presence', { event: 'join' }, emitState).on('presence', { event: 'leave' }, emitState).subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: user.id, name: user.name || user.email, role: user.role || 'teacher', online_at: nowIso() });
    }
  });
  return () => { try { client.removeChannel(channel); } catch { /* optional */ } };
}
