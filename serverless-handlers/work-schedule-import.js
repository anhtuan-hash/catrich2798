import { createClient } from '@supabase/supabase-js';
import { isDepartmentLeaderRole } from '../src/utils/roles.js';
import {
  WORK_SCHEDULE_ITEM_TYPE,
  parseDelimitedText,
  scheduleRowsFromGrid,
} from '../src/utils/workScheduleImport.js';
import { buildScheduleImportPlan } from '../src/utils/workScheduleImportPlan.js';

const MAX_EVENTS = 600;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SCHEDULE_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,source_module,metadata,created_at,updated_at';
const EXCLUDED_PROFILE_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest']);

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function cleanText(value, max = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function missingRelation(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find');
}

function withTimeout(promise, ms = 20000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Yêu cầu Supabase quá thời gian.'), { status: 504 })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function isScheduleImportLeader(profile = {}) {
  if (profile.approved === false) return false;
  return isDepartmentLeaderRole(profile.role);
}

async function authenticate(req) {
  const supabaseUrl = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const anonKey = env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw Object.assign(new Error('Production chưa được cấu hình đầy đủ Supabase cho API nhập lịch.'), { status: 503 });
  }

  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw Object.assign(new Error('Phiên đăng nhập không hợp lệ.'), { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await withTimeout(authClient.auth.getUser(token));
  if (authError || !authData?.user) throw Object.assign(new Error('Phiên đăng nhập đã hết hạn.'), { status: 401 });

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: profileData, error: profileError } = await withTimeout(
    db.from('profiles')
      .select('id,email,full_name,role,approved,permissions')
      .eq('id', authData.user.id)
      .maybeSingle(),
  );
  if (profileError && !missingRelation(profileError)) {
    throw Object.assign(new Error(profileError.message), { status: 403 });
  }

  let assignedRole = '';
  const assigned = await withTimeout(
    db.from('system_roles')
      .select('role,active')
      .eq('user_id', authData.user.id)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ).catch(() => ({ data: null, error: null }));
  if (!assigned.error && assigned.data?.role) assignedRole = assigned.data.role;

  const profile = {
    id: authData.user.id,
    email: authData.user.email || '',
    full_name: authData.user.user_metadata?.full_name || '',
    approved: true,
    role: authData.user.user_metadata?.role || 'teacher',
    ...(profileData || {}),
    ...(assignedRole ? { role: assignedRole } : {}),
  };

  if (!isScheduleImportLeader(profile)) {
    throw Object.assign(new Error('Chỉ Admin/TTCM được phép nhập lịch làm việc dùng chung.'), { status: 403 });
  }

  return { user: authData.user, profile, db };
}

function requestPayload(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { throw Object.assign(new Error('JSON không hợp lệ.'), { status: 400 }); }
  }
  return {};
}

function parseRows(payload) {
  const fileName = cleanText(payload.fileName || payload.filename || 'schedule.csv', 180) || 'schedule.csv';
  if (Array.isArray(payload.rows)) {
    if (payload.rows.length > MAX_EVENTS) throw Object.assign(new Error(`Mỗi lần chỉ nhập tối đa ${MAX_EVENTS} hoạt động.`), { status: 400 });
    return { fileName, rows: payload.rows, invalidRows: [] };
  }

  if (typeof payload.csv === 'string') {
    const grid = parseDelimitedText(payload.csv);
    const parsed = scheduleRowsFromGrid(grid, { fileName });
    if (!parsed.ok) throw Object.assign(new Error(parsed.message || 'Không đọc được dữ liệu CSV.'), { status: 400 });
    if (parsed.validRows.length > MAX_EVENTS) throw Object.assign(new Error(`Mỗi lần chỉ nhập tối đa ${MAX_EVENTS} hoạt động.`), { status: 400 });
    return { fileName, rows: parsed.validRows, invalidRows: parsed.invalidRows || [] };
  }

  throw Object.assign(new Error('Cần gửi rows hoặc nội dung csv để nhập lịch.'), { status: 400 });
}

async function loadExistingItems(db) {
  let result = await withTimeout(
    db.from('work_hub_items')
      .select(SCHEDULE_COLUMNS)
      .eq('item_type', WORK_SCHEDULE_ITEM_TYPE)
      .order('due_at', { ascending: true })
      .limit(1500),
  );
  if (result.error) {
    result = await withTimeout(db.from('work_hub_items').select(SCHEDULE_COLUMNS).limit(1500));
  }
  if (result.error) throw new Error(result.error.message);
  return (result.data || []).filter((item) => item?.item_type === WORK_SCHEDULE_ITEM_TYPE || item?.metadata?.schedule_event === true);
}

async function loadAssigneeIds(db, userId) {
  const { data, error } = await withTimeout(db.from('profiles').select('id,role').limit(1000));
  if (error) return [userId];
  const ids = (data || [])
    .filter((profile) => profile?.id && !EXCLUDED_PROFILE_ROLES.has(normalizeRole(profile.role)))
    .map((profile) => profile.id);
  if (!ids.includes(userId)) ids.push(userId);
  return [...new Set(ids)];
}

async function insertInBatches(db, payloads) {
  const created = [];
  for (let index = 0; index < payloads.length; index += 50) {
    const batch = payloads.slice(index, index + 50);
    const { data, error } = await withTimeout(db.from('work_hub_items').insert(batch).select(SCHEDULE_COLUMNS));
    if (error) throw error;
    created.push(...(data || []));
  }
  return created;
}

async function updateOwnedRows(db, updates) {
  const updated = [];
  for (const entry of updates) {
    const { data, error } = await withTimeout(
      db.from('work_hub_items')
        .update(entry.payload)
        .eq('id', entry.id)
        .select(SCHEDULE_COLUMNS)
        .single(),
    );
    if (error) throw error;
    if (data) updated.push(data);
  }
  return updated;
}

async function recordImportRun(db, session, details) {
  const payload = {
    actor_id: session.user.id,
    actor_email: cleanText(session.user.email, 240).toLowerCase(),
    actor_role: cleanText(session.profile.role, 80).toLowerCase(),
    action: 'schedule.api_imported',
    entity_type: 'work_schedule_import',
    entity_id: details.importId,
    source_module: 'work-schedule-import-api',
    before_data: {},
    after_data: {
      file_name: details.fileName,
      source: details.source,
      stats: details.stats,
      created_ids: details.createdIds,
      updated_ids: details.updatedIds,
    },
    metadata: { api_version: 1, imported_at: details.importedAt },
  };
  try {
    const { error } = await withTimeout(db.from('audit_events').insert(payload), 10000);
    if (error && !missingRelation(error)) console.warn('[work-schedule-import] audit insert failed', error.message);
  } catch (error) {
    console.warn('[work-schedule-import] audit insert failed', error?.message || error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, message: 'Chỉ hỗ trợ phương thức POST.' });
  }

  try {
    const approximateSize = Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}), 'utf8');
    if (approximateSize > MAX_BODY_BYTES) return json(res, 413, { ok: false, message: 'Dữ liệu nhập lịch vượt quá giới hạn 2 MB.' });

    const session = await authenticate(req);
    const payload = requestPayload(req);
    const parsed = parseRows(payload);
    const source = cleanText(payload.source || 'api', 80) || 'api';
    if (!parsed.rows.length) return json(res, 400, { ok: false, message: 'Không có hoạt động hợp lệ để nhập.', stats: { added: 0, updated: 0, unchanged: 0, errors: parsed.invalidRows.length, manualConflicts: 0 } });

    const [existingItems, assigneeIds] = await Promise.all([
      loadExistingItems(session.db),
      loadAssigneeIds(session.db, session.user.id),
    ]);

    const importedAt = new Date().toISOString();
    const importId = `schedule-import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plan = buildScheduleImportPlan({
      rows: parsed.rows,
      existingItems,
      fileName: parsed.fileName,
      ownerId: session.user.id,
      createdBy: session.user.id,
      assigneeIds,
      importId,
      importedAt,
    });

    const createPayloads = plan.create.map((entry) => entry.payload || entry);
    const [created, updated] = await Promise.all([
      insertInBatches(session.db, createPayloads),
      updateOwnedRows(session.db, plan.update),
    ]);

    const stats = {
      added: created.length,
      updated: updated.length,
      unchanged: plan.stats.unchanged,
      errors: plan.stats.errors + parsed.invalidRows.length,
      manualConflicts: plan.stats.manualConflicts,
    };

    await recordImportRun(session.db, session, {
      importId,
      fileName: parsed.fileName,
      source,
      stats,
      createdIds: created.map((item) => item.id),
      updatedIds: updated.map((item) => item.id),
      importedAt,
    });

    return json(res, 200, {
      ok: true,
      importId,
      fileName: parsed.fileName,
      stats,
      invalidRows: parsed.invalidRows.slice(0, 100),
      items: [...created, ...updated],
      message: `Đã thêm ${stats.added}, cập nhật ${stats.updated}, giữ nguyên ${stats.unchanged} hoạt động.`,
    });
  } catch (error) {
    const status = Number(error?.status || 0) || 500;
    console.error('[work-schedule-import]', error);
    return json(res, status, { ok: false, message: error?.message || 'Không thể nhập lịch làm việc.' });
  }
}
