import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const TOKEN_HASH = 'f7827cde92a64010587f4261cae4ab058e12f2fef9155276cdb4b5a5c332b3e6';
const TARGET_CLASSES = Object.freeze(['11.3', '11.4', '12.3', '12.6']);
const TARGET_SET = new Set(TARGET_CLASSES);

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function normalizeClassName(value) {
  const raw = String(value ?? '')
    .trim()
    .replace(/^lớp\s*/i, '')
    .replace(/^lop\s*/i, '')
    .replace(/[,/_-]+/g, '.')
    .replace(/\s+/g, '');
  const match = raw.match(/^(10|11|12)\.(\d{1,2})$/);
  return match ? `${match[1]}.${Number(match[2])}` : '';
}

function suppliedToken(req) {
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const headerToken = String(req.headers['x-bes-purge-token'] || '');
  return (headerToken || queryToken).trim();
}

function tokenAccepted(req) {
  const token = suppliedToken(req);
  if (!token) return false;
  const actual = Buffer.from(createHash('sha256').update(token).digest('hex'));
  const expected = Buffer.from(TOKEN_HASH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function classNameFromWorkspace(row) {
  return normalizeClassName(
    row?.class_name
    || row?.payload?.classProfile?.className
    || row?.payload?.className
  );
}

function scrubRegistryPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object'
    ? structuredClone(rawPayload)
    : {};
  let clearedClasses = 0;
  let clearedStudents = 0;
  let clearedAssignments = 0;

  if (Array.isArray(payload.classes)) {
    payload.classes = payload.classes.filter((item) => {
      const className = normalizeClassName(item?.className);
      if (!TARGET_SET.has(className)) return true;

      clearedClasses += 1;
      clearedStudents += Array.isArray(item?.students) ? item.students.length : 0;
      const assignment = item?.assignment || {};
      if (
        String(assignment.homeroomTeacherId || '').trim()
        || (Array.isArray(assignment.subjectTeacherIds) && assignment.subjectTeacherIds.length)
      ) {
        clearedAssignments += 1;
      }
      return false;
    });
  }

  if (Array.isArray(payload.deletionAudit)) {
    payload.deletionAudit = payload.deletionAudit.filter(
      (entry) => !TARGET_SET.has(normalizeClassName(entry?.className)),
    );
  }

  payload.updatedAt = new Date().toISOString();
  payload.classDataPurge = {
    ...(payload.classDataPurge || {}),
    version: '2026-08-05-v1',
    classes: TARGET_CLASSES,
    completedAt: payload.updatedAt,
  };

  return {
    payload,
    stats: { clearedClasses, clearedStudents, clearedAssignments },
  };
}

async function purgeWorkspaceRows(db) {
  const { data, error } = await db
    .from('bes_homeroom_workspaces')
    .select('owner_id,workspace_id,class_name,payload,updated_at');

  if (error) throw new Error(`Không đọc được dữ liệu lớp GVCN: ${error.message}`);

  const targets = (data || []).filter((row) => TARGET_SET.has(classNameFromWorkspace(row)));
  const removed = [];

  for (const row of targets) {
    const result = await db
      .from('bes_homeroom_workspaces')
      .delete()
      .eq('owner_id', row.owner_id)
      .eq('workspace_id', row.workspace_id);

    if (result.error) {
      throw new Error(`Không xóa được workspace ${row.workspace_id}: ${result.error.message}`);
    }
    removed.push({
      ownerId: row.owner_id,
      workspaceId: row.workspace_id,
      className: classNameFromWorkspace(row),
    });
  }

  return removed;
}

async function purgeRegistryRows(db) {
  const { data, error } = await db
    .from('school_class_registries')
    .select('owner_id,payload,updated_at');

  if (error) throw new Error(`Không đọc được danh mục lớp: ${error.message}`);

  const totals = {
    registriesUpdated: 0,
    clearedClasses: 0,
    clearedStudents: 0,
    clearedAssignments: 0,
  };

  for (const row of data || []) {
    const scrubbed = scrubRegistryPayload(row.payload);
    if (!scrubbed.stats.clearedClasses) continue;

    const result = await db
      .from('school_class_registries')
      .update({
        payload: scrubbed.payload,
        updated_at: new Date().toISOString(),
      })
      .eq('owner_id', row.owner_id);

    if (result.error) {
      throw new Error(`Không làm sạch được danh mục lớp: ${result.error.message}`);
    }

    totals.registriesUpdated += 1;
    totals.clearedClasses += scrubbed.stats.clearedClasses;
    totals.clearedStudents += scrubbed.stats.clearedStudents;
    totals.clearedAssignments += scrubbed.stats.clearedAssignments;
  }

  return totals;
}

async function verifyPurge(db) {
  const workspaceResult = await db
    .from('bes_homeroom_workspaces')
    .select('owner_id,workspace_id,class_name,payload');

  if (workspaceResult.error) {
    throw new Error(`Không xác minh được workspace: ${workspaceResult.error.message}`);
  }

  const lingeringWorkspaces = (workspaceResult.data || [])
    .filter((row) => TARGET_SET.has(classNameFromWorkspace(row)))
    .map((row) => ({
      ownerId: row.owner_id,
      workspaceId: row.workspace_id,
      className: classNameFromWorkspace(row),
    }));

  const registryResult = await db
    .from('school_class_registries')
    .select('owner_id,payload');

  if (registryResult.error) {
    throw new Error(`Không xác minh được danh mục lớp: ${registryResult.error.message}`);
  }

  const lingeringRegistryData = [];
  for (const row of registryResult.data || []) {
    for (const item of Array.isArray(row.payload?.classes) ? row.payload.classes : []) {
      const className = normalizeClassName(item?.className);
      if (!TARGET_SET.has(className)) continue;
      const studentCount = Array.isArray(item?.students) ? item.students.length : 0;
      const assignment = item?.assignment || {};
      const subjectCount = Array.isArray(assignment.subjectTeacherIds)
        ? assignment.subjectTeacherIds.length
        : 0;
      lingeringRegistryData.push({
        ownerId: row.owner_id,
        className,
        studentCount,
        hasHomeroomTeacher: Boolean(String(assignment.homeroomTeacherId || '').trim()),
        subjectTeacherCount: subjectCount,
      });
    }
  }

  return {
    ok: lingeringWorkspaces.length === 0 && lingeringRegistryData.length === 0,
    lingeringWorkspaces,
    lingeringRegistryData,
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(String(req.method || '').toUpperCase())) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  if (!tokenAccepted(req)) {
    return json(res, 404, { ok: false, message: 'Not found.' });
  }

  try {
    const supabaseUrl = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json(res, 503, {
        ok: false,
        message: 'Production chưa có đủ biến môi trường Supabase để xóa dữ liệu.',
      });
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const removedWorkspaces = await purgeWorkspaceRows(db);
    const registry = await purgeRegistryRows(db);
    const verification = await verifyPurge(db);

    return json(res, verification.ok ? 200 : 409, {
      ok: verification.ok,
      purgeId: 'four-class-purge-2026-08-05-v1',
      classes: TARGET_CLASSES,
      removedWorkspaceCount: removedWorkspaces.length,
      removedWorkspaces,
      registry,
      verification,
    });
  } catch (error) {
    console.error('[four-class-purge-20260805]', error);
    return json(res, 500, {
      ok: false,
      message: error?.message || 'Không thể xóa dữ liệu bốn lớp.',
    });
  }
}
