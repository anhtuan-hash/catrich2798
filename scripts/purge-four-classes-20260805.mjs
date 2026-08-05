import { createClient } from '@supabase/supabase-js';

const TARGET_CLASSES = Object.freeze(['11.3', '11.4', '12.3', '12.6']);
const TARGET_SET = new Set(TARGET_CLASSES);

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
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

function classNameFromWorkspace(row) {
  return normalizeClassName(
    row?.class_name
    || row?.payload?.classProfile?.className
    || row?.payload?.className,
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
    .filter((row) => TARGET_SET.has(classNameFromWorkspace(row)));

  const registryResult = await db
    .from('school_class_registries')
    .select('owner_id,payload');

  if (registryResult.error) {
    throw new Error(`Không xác minh được danh mục lớp: ${registryResult.error.message}`);
  }

  const lingeringRegistryClasses = [];
  for (const row of registryResult.data || []) {
    for (const item of Array.isArray(row.payload?.classes) ? row.payload.classes : []) {
      const className = normalizeClassName(item?.className);
      if (TARGET_SET.has(className)) {
        lingeringRegistryClasses.push({ ownerId: row.owner_id, className });
      }
    }
  }

  return {
    ok: lingeringWorkspaces.length === 0 && lingeringRegistryClasses.length === 0,
    lingeringWorkspaceCount: lingeringWorkspaces.length,
    lingeringRegistryClassCount: lingeringRegistryClasses.length,
  };
}

async function main() {
  const supabaseUrl = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Thiếu SUPABASE_URL/VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong môi trường Vercel.');
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const removedWorkspaces = await purgeWorkspaceRows(db);
  const registry = await purgeRegistryRows(db);
  const verification = await verifyPurge(db);
  const result = {
    ok: verification.ok,
    purgeId: 'four-class-purge-2026-08-05-v1',
    classes: TARGET_CLASSES,
    removedWorkspaceCount: removedWorkspaces.length,
    removedWorkspaces,
    registry,
    verification,
  };

  console.log('[four-class-purge-20260805]', JSON.stringify(result));
  if (!verification.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[four-class-purge-20260805]', error);
  process.exitCode = 1;
});
