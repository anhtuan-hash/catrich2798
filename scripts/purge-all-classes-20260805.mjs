import { createClient } from '@supabase/supabase-js';

const PURGE_VERSION = '2026-08-05-all-v1';
const PAGE_SIZE = 1000;

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

async function readAll(queryFactory) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await queryFactory().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function emptyRegistryPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object'
    ? structuredClone(rawPayload)
    : {};
  const completedAt = new Date().toISOString();
  return {
    ...payload,
    version: Math.max(Number(payload.version) || 1, 3),
    sourceLabel: '',
    importedAt: '',
    updatedAt: completedAt,
    deletionAudit: [],
    classes: [],
    classDataPurge: {
      scope: 'all-classes',
      version: PURGE_VERSION,
      completedAt,
    },
  };
}

function registryStats(payload) {
  const classes = Array.isArray(payload?.classes) ? payload.classes : [];
  return {
    classes: classes.length,
    students: classes.reduce((sum, item) => sum + (Array.isArray(item?.students) ? item.students.length : 0), 0),
    assignments: classes.reduce((sum, item) => {
      const assignment = item?.assignment || {};
      return sum + (String(assignment.homeroomTeacherId || '').trim()
        || (Array.isArray(assignment.subjectTeacherIds) && assignment.subjectTeacherIds.length) ? 1 : 0);
    }, 0),
    deletionAudit: Array.isArray(payload?.deletionAudit) ? payload.deletionAudit.length : 0,
  };
}

async function purgeAllWorkspaces(db) {
  const rows = await readAll(() => db
    .from('bes_homeroom_workspaces')
    .select('owner_id,workspace_id,class_name'));

  for (const row of rows) {
    const { error } = await db
      .from('bes_homeroom_workspaces')
      .delete()
      .eq('owner_id', row.owner_id)
      .eq('workspace_id', row.workspace_id);
    if (error) throw new Error(`Không xóa được workspace ${row.workspace_id}: ${error.message}`);
  }
  return rows;
}

async function purgeAllRegistries(db) {
  const rows = await readAll(() => db
    .from('school_class_registries')
    .select('owner_id,payload'));
  const totals = {
    registriesUpdated: 0,
    classesRemoved: 0,
    studentsRemoved: 0,
    assignmentsRemoved: 0,
    deletionAuditRemoved: 0,
  };

  for (const row of rows) {
    const stats = registryStats(row.payload);
    const payload = emptyRegistryPayload(row.payload);
    const { error } = await db
      .from('school_class_registries')
      .update({ payload, updated_at: payload.updatedAt })
      .eq('owner_id', row.owner_id);
    if (error) throw new Error(`Không làm sạch được danh mục lớp của ${row.owner_id}: ${error.message}`);
    totals.registriesUpdated += 1;
    totals.classesRemoved += stats.classes;
    totals.studentsRemoved += stats.students;
    totals.assignmentsRemoved += stats.assignments;
    totals.deletionAuditRemoved += stats.deletionAudit;
  }
  return totals;
}

async function verifyPurge(db) {
  const workspaces = await readAll(() => db
    .from('bes_homeroom_workspaces')
    .select('owner_id,workspace_id,class_name'));
  const registries = await readAll(() => db
    .from('school_class_registries')
    .select('owner_id,payload'));

  let classCount = 0;
  let studentCount = 0;
  let assignmentCount = 0;
  let deletionAuditCount = 0;
  let invalidPurgeMarkerCount = 0;

  for (const row of registries) {
    const stats = registryStats(row.payload);
    classCount += stats.classes;
    studentCount += stats.students;
    assignmentCount += stats.assignments;
    deletionAuditCount += stats.deletionAudit;
    if (row.payload?.classDataPurge?.scope !== 'all-classes'
      || row.payload?.classDataPurge?.version !== PURGE_VERSION) {
      invalidPurgeMarkerCount += 1;
    }
  }

  return {
    ok: workspaces.length === 0
      && classCount === 0
      && studentCount === 0
      && assignmentCount === 0
      && deletionAuditCount === 0
      && invalidPurgeMarkerCount === 0,
    workspaceCount: workspaces.length,
    registryCount: registries.length,
    classCount,
    studentCount,
    assignmentCount,
    deletionAuditCount,
    invalidPurgeMarkerCount,
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

  const removedWorkspaces = await purgeAllWorkspaces(db);
  const registry = await purgeAllRegistries(db);
  const verification = await verifyPurge(db);
  const result = {
    ok: verification.ok,
    purgeId: PURGE_VERSION,
    removedWorkspaceCount: removedWorkspaces.length,
    registry,
    verification,
  };

  console.log('[purge-all-classes-20260805]', JSON.stringify(result));
  if (!verification.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[purge-all-classes-20260805]', error);
  process.exitCode = 1;
});
