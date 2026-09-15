import fs from 'node:fs';

const path = new URL('../src/assignedSchoolClassBootstrap.js', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  source = `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

replaceOnce(
  "    const reconciled = durableTombstones.length\n      ? {\n          ...reconciledBase,\n          students: filterPermanentlyDeletedStudents(reconciledBase.students, durableTombstones),\n        }\n      : reconciledBase;\n    const next = normalizeHomeroomWorkspace({",
  "    const reconciled = durableTombstones.length\n      ? {\n          ...reconciledBase,\n          students: filterPermanentlyDeletedStudents(reconciledBase.students, durableTombstones),\n        }\n      : reconciledBase;\n    const reconciledActiveStudentCount = (reconciled.students || []).filter((student) => (\n      student?.active !== false && !isDeletedAssignedStudent(student)\n    )).length;\n    const next = normalizeHomeroomWorkspace({",
  'reconciled active student count',
);

replaceOnce(
  "        studentCountTarget: durableTombstones.length\n          ? effectiveActiveStudentCount\n          : (item.activeStudentCount || item.expectedCount),",
  "        studentCountTarget: durableTombstones.length\n          ? reconciledActiveStudentCount\n          : (item.activeStudentCount || item.expectedCount),",
  'durable student count target',
);

fs.writeFileSync(path, source);
console.log('Applied reconciled student-count fix.');
