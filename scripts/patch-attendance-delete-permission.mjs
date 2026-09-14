import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
}

const uiPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
let ui = fs.readFileSync(uiPath, 'utf8');
ui = replaceOnce(
  ui,
  "import {\n  ATTENDANCE_PERMISSION_ITEMS,\n  getFirstAllowedAttendanceTab,\n  hasAnyAttendanceAccess,\n  hasAttendanceTabAccess,\n} from '../utils/permissions.js';",
  "import {\n  ATTENDANCE_PERMISSION_IDS,\n  ATTENDANCE_PERMISSION_ITEMS,\n  getFirstAllowedAttendanceTab,\n  hasAnyAttendanceAccess,\n  hasAttendanceTabAccess,\n  hasExplicitPermissionId,\n} from '../utils/permissions.js';",
  'attendance permission imports',
);
ui = replaceOnce(
  ui,
  "  const canDeleteAttendanceHistory = isAttendanceAdmin || String(currentUser?.email || '').trim().toLowerCase() === 'hongtham@accounts.brianenglish.studio';",
  "  const canDeleteAttendanceHistory = isAttendanceAdmin\n    || hasExplicitPermissionId(currentUser, ATTENDANCE_PERMISSION_IDS.delete)\n    || String(currentUser?.email || '').trim().toLowerCase() === 'hongtham@accounts.brianenglish.studio';",
  'granular delete capability',
);
fs.writeFileSync(uiPath, ui);

const panelPath = 'src/components/attendance/AttendanceArchivePanel.jsx';
let panel = fs.readFileSync(panelPath, 'utf8');
panel = replaceOnce(
  panel,
  "              {!approved ? <button type=\"button\" className=\"is-restore\" disabled={busy} onClick={() => onRestore?.(item)}>Khôi phục</button> : null}",
  "              {!pending && !approved ? <button type=\"button\" className=\"is-restore\" disabled={busy} onClick={() => onRestore?.(item)}>Khôi phục</button> : null}",
  'pending restore guard',
);
fs.writeFileSync(panelPath, panel);

console.log('Attendance delete permission UI patch applied.');
