import fs from 'node:fs';

const path = 'src/components/GlobalAttendanceNavigationTab.jsx';
const source = fs.readFileSync(path, 'utf8');
const before = `  useEffect(() => {\n    if (open && canDeleteAttendanceHistory) loadArchive();\n  }, [open, canDeleteAttendanceHistory, runtime.ready, runtime.session?.user?.id]);`;
const after = `  useEffect(() => {\n    if (open && canOpenArchive) loadArchive();\n  }, [open, canOpenArchive, runtime.ready, runtime.session?.user?.id]);`;

if (!source.includes(before)) {
  throw new Error('Expected archive loader effect was not found.');
}
fs.writeFileSync(path, source.replace(before, after));
console.log('Updated archive loader for attendance:manage users.');
