import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const parentPath = path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx');
const cssPath = path.join(root, 'src/components/attendance/AttendanceDailyOverview.css');
const runtimePaths = [
  path.join(root, 'src/attendanceDailyStatusOverview.js'),
  path.join(root, 'src/attendanceLegacyMonthlyCalendarCleanup.js'),
];

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Missing rewrite anchor: ${label}`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Rewrite anchor is not unique: ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceRegexOnce(source, regex, replacement, label) {
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, got ${matches.length}`);
  return source.replace(regex, replacement);
}

let source = fs.readFileSync(parentPath, 'utf8');

source = replaceOnce(
  source,
  "import AttendanceClassEditor from './attendance/AttendanceClassEditor.jsx';",
  "import AttendanceClassEditor from './attendance/AttendanceClassEditor.jsx';\nimport AttendanceDailySchedule from './attendance/AttendanceDailySchedule.jsx';",
  'direct schedule import',
);

source = replaceRegexOnce(
  source,
  /\nfunction monthBounds\(monthValue\) \{[\s\S]*?\n\}\n\nfunction buildCalendarCells\(monthValue\) \{[\s\S]*?\n\}\n\nfunction sameClassIdentity/,
  '\nfunction sameClassIdentity',
  'legacy month helper block',
);

source = replaceOnce(
  source,
  '  const [monthlySessions, setMonthlySessions] = useState([]);',
  '  const [calendarSessions, setCalendarSessions] = useState([]);',
  'monthly session state',
);
source = replaceOnce(
  source,
  "  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));",
  "  const [calendarDate, setCalendarDate] = useState(today);\n  const [calendarRoomFilter, setCalendarRoomFilter] = useState('all');",
  'calendar month state',
);

source = source.replaceAll('monthlySessions.find', 'calendarSessions.find');
source = source.replaceAll('setMonthlySessions', 'setCalendarSessions');

source = replaceRegexOnce(
  source,
  /\n  async function loadMonthlySessions\(classId = selectedClassId, monthValue = calendarMonth\) \{[\s\S]*?\n  \}\n\n  useEffect\(\(\) => \{\n    if \(open && view === 'calendar' && selectedClassId\) loadMonthlySessions\(\);\n  \}, \[open, view, selectedClassId, calendarMonth\]\);/,
  `\n  async function loadCalendarSessions(dateValue = calendarDate) {\n    if (!client || !dateValue || !allowed) {\n      setCalendarSessions([]);\n      setCalendarLoading(false);\n      return;\n    }\n    setCalendarLoading(true);\n    const { data, error: calendarError } = await client.from('bes_extra_attendance_sessions')\n      .select(SESSION_COLUMNS)\n      .eq('attendance_date', dateValue)\n      .order('checked_at', { ascending: true });\n    if (calendarError) {\n      setError(calendarError.message || 'Không thể tải lịch điểm danh theo ngày.');\n      setCalendarSessions([]);\n    } else {\n      setCalendarSessions(data || []);\n    }\n    setCalendarLoading(false);\n  }\n\n  useEffect(() => {\n    if (open && view === 'calendar') loadCalendarSessions(calendarDate);\n  }, [open, view, calendarDate]);`,
  'monthly loader and effect',
);

source = source.replaceAll('loadMonthlySessions()', 'loadCalendarSessions(calendarDate)');

source = replaceOnce(
  source,
  "  const calendarByDate = useMemo(() => new Map(monthlySessions.map((session) => [session.attendance_date, session])), [monthlySessions]);\n  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);\n",
  '',
  'legacy calendar memos',
);

const calendarStart = "          {!loading && canAccessAttendanceView('calendar') && view === 'calendar' ? (";
const manageStart = "          {!loading && canAccessAttendanceView('manage') && view === 'manage' ? (";
const calendarIndex = source.indexOf(calendarStart);
const manageIndex = source.indexOf(manageStart, calendarIndex);
if (calendarIndex < 0 || manageIndex < 0) throw new Error('Could not locate original calendar React branch.');
const directCalendarBranch = `          {!loading && canAccessAttendanceView('calendar') && view === 'calendar' ? (\n            <div className="attendance-calendar-layout">\n              <AttendanceDailySchedule\n                classes={activeClasses}\n                sessions={calendarSessions}\n                date={calendarDate}\n                maxDate={today}\n                loading={calendarLoading}\n                roomFilter={calendarRoomFilter}\n                onDateChange={(nextDate) => {\n                  if (!nextDate) return;\n                  setCalendarDate(nextDate);\n                  setNotice('');\n                  setError('');\n                }}\n                onRoomFilterChange={setCalendarRoomFilter}\n                teacherLabelForClass={teachersForClass}\n                onOpenClass={(classRow, session) => {\n                  if (session?.session_status === 'completed' || session?.session_status === 'cancelled') {\n                    openSessionFromCalendar(session);\n                    return;\n                  }\n                  setSelectedClassId(String(classRow.id));\n                  setAttendanceDate(calendarDate);\n                  setNotice('');\n                  setError('');\n                  setView('quick');\n                }}\n              />\n            </div>\n          ) : null}\n\n`;
source = source.slice(0, calendarIndex) + directCalendarBranch + source.slice(manageIndex);

for (const forbidden of ['calendarMonth', 'monthlySessions', 'calendarCells', 'calendarByDate', 'loadMonthlySessions', 'attendance-calendar-toolbar', 'attendance-calendar-weekdays', 'attendance-calendar-grid']) {
  if (source.includes(forbidden)) throw new Error(`Legacy calendar token remains in parent: ${forbidden}`);
}
if (!source.includes('<AttendanceDailySchedule')) throw new Error('Direct AttendanceDailySchedule render missing after rewrite.');
fs.writeFileSync(parentPath, source);

let css = fs.readFileSync(cssPath, 'utf8');
const hiddenLegacyCss = `.attendance-calendar-layout[data-attendance-daily-mode="daily"] > .attendance-calendar-toolbar {\n  display: none !important;\n}\n\n.attendance-calendar-layout[data-attendance-daily-mode="daily"] > .attendance-calendar-weekdays,\n.attendance-calendar-layout[data-attendance-daily-mode="daily"] > .attendance-calendar-grid,\n.attendance-calendar-layout[data-attendance-daily-mode="daily"] > .attendance-loading {\n  display: none !important;\n}\n\n`;
css = replaceOnce(css, hiddenLegacyCss, '', 'legacy calendar hiding CSS');
if (css.includes('data-attendance-daily-mode') || css.includes('data-attendance-daily-only')) throw new Error('Runtime calendar hiding attributes remain in CSS.');
fs.writeFileSync(cssPath, css);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(path.join(root, 'src')).filter((file) => /\.(?:js|jsx|mjs)$/.test(file));
for (const file of sourceFiles) {
  if (runtimePaths.includes(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace(/^import\s+['"][^'"]*attendanceDailyStatusOverview\.js['"];\s*\n/gm, '');
  text = text.replace(/^import\s+['"][^'"]*attendanceLegacyMonthlyCalendarCleanup\.js['"];\s*\n/gm, '');
  if (text !== before) fs.writeFileSync(file, text);
}

for (const runtimePath of runtimePaths) {
  if (!fs.existsSync(runtimePath)) throw new Error(`Expected runtime file missing before deletion: ${path.relative(root, runtimePath)}`);
  fs.rmSync(runtimePath);
}

for (const file of walk(path.join(root, 'src')).filter((entry) => /\.(?:js|jsx|mjs)$/.test(entry))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/attendanceDailyStatusOverview|attendanceLegacyMonthlyCalendarCleanup/.test(text)) {
    throw new Error(`Runtime overlay reference remains in ${path.relative(root, file)}`);
  }
}

console.log('Direct React attendance calendar rewrite applied; overlay and cleanup runtimes deleted.');
