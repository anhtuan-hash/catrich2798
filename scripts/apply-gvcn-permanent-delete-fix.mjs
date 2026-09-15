import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function patchPermanentDeleteRuntime() {
  const path = new URL('../src/studentPermanentDeleteRuntime.js', import.meta.url);
  let source = fs.readFileSync(path, 'utf8');

  source = replaceOnce(
    source,
    "import { isSupabaseConfigured, supabase } from './utils/supabase.js';\n",
    "import { isSupabaseConfigured, supabase } from './utils/supabase.js';\nimport { mergePermanentStudentTombstones } from './utils/permanentStudentDeletion.js';\n",
    'permanent-delete helper import',
  );

  source = replaceOnce(
    source,
    'function buildCleanWorkspace(workspace, ids, user) {',
    'function buildCleanWorkspace(workspace, ids, user, removedStudents = []) {',
    'buildCleanWorkspace signature',
  );

  source = replaceOnce(
    source,
    "    studentDeletionAudit: (workspace.studentDeletionAudit || []).filter((item) => !ids.has(item.studentId)),\n    studentPermanentDeletionAudit: [",
    "    studentDeletionAudit: (workspace.studentDeletionAudit || []).filter((item) => !ids.has(item.studentId)),\n    studentPermanentDeletionTombstones: mergePermanentStudentTombstones(\n      workspace.studentPermanentDeletionTombstones || [],\n      removedStudents,\n      now,\n    ),\n    studentPermanentDeletionAudit: [",
    'durable workspace tombstones',
  );

  source = replaceOnce(
    source,
    '    const cleaned = buildCleanWorkspace(workspace, ids, user);',
    '    const cleaned = buildCleanWorkspace(workspace, ids, user, removedStudents);',
    'pass removed students into cleanup',
  );

  fs.writeFileSync(path, source);
}

function patchAssignedClassSync() {
  const path = new URL('../src/assignedSchoolClassBootstrap.js', import.meta.url);
  let source = fs.readFileSync(path, 'utf8');

  source = replaceOnce(
    source,
    "import { isSupabaseConfigured, supabase } from './utils/supabase.js';\n",
    "import { isSupabaseConfigured, supabase } from './utils/supabase.js';\nimport { filterPermanentlyDeletedStudents } from './utils/permanentStudentDeletion.js';\n",
    'assigned-sync helper import',
  );

  source = replaceOnce(
    source,
    "  for (const item of sorted) {\n    const existing = await loadExistingWorkspace(user, catalog, item.className);\n    const workspaceId = existing.workspace?.id || deterministicWorkspaceId(item.className, item.schoolYear);",
    "  for (const item of sorted) {\n    const existing = await loadExistingWorkspace(user, catalog, item.className);\n    const durableTombstones = Array.isArray(existing.workspace?.studentPermanentDeletionTombstones)\n      ? existing.workspace.studentPermanentDeletionTombstones\n      : [];\n    const filteredStudents = filterPermanentlyDeletedStudents(item.students, durableTombstones);\n    const effectiveActiveStudentCount = filteredStudents.filter((student) => (\n      student?.active !== false && !isDeletedAssignedStudent(student)\n    )).length;\n    const workspaceId = existing.workspace?.id || deterministicWorkspaceId(item.className, item.schoolYear);",
    'load durable tombstones before assigned roster reconciliation',
  );

  source = replaceOnce(
    source,
    '    const itemSignature = signature(item);',
    "    const itemSignature = signature({\n      ...item,\n      students: filteredStudents,\n      activeStudentCount: effectiveActiveStudentCount,\n    });",
    'signature excludes permanently deleted students',
  );

  source = replaceOnce(
    source,
    "    const importedAt = item.registryUpdatedAt || new Date().toISOString();\n    const reconciled = item.students.length\n      ? reconcileWorkspaceRoster(base, item.className, item.students, importedAt)\n      : base;",
    "    const importedAt = item.registryUpdatedAt || new Date().toISOString();\n    const reconciledBase = item.students.length\n      ? reconcileWorkspaceRoster(base, item.className, filteredStudents, importedAt)\n      : base;\n    const reconciled = durableTombstones.length\n      ? {\n          ...reconciledBase,\n          students: filterPermanentlyDeletedStudents(reconciledBase.students, durableTombstones),\n        }\n      : reconciledBase;",
    'filter assigned roster and existing workspace by durable tombstones',
  );

  source = replaceOnce(
    source,
    '        studentCountTarget: item.activeStudentCount || item.expectedCount,',
    "        studentCountTarget: durableTombstones.length\n          ? effectiveActiveStudentCount\n          : (item.activeStudentCount || item.expectedCount),",
    'student count honors permanent deletions',
  );

  fs.writeFileSync(path, source);
}

patchPermanentDeleteRuntime();
patchAssignedClassSync();
console.log('Applied GVCN permanent-delete durability patch.');
