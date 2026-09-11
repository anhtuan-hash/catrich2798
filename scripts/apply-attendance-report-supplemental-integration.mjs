import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing patch marker: ${label}`);
  return source.replace(before, after);
}

const reportUtilPath = 'src/utils/attendanceReport.js';
let reportUtil = fs.readFileSync(reportUtilPath, 'utf8');

reportUtil = replaceOnce(
  reportUtil,
  `function sameText(a, b) {`,
  `export function normalizeSupplementalReportData(rows = []) {\n  const sessions = [];\n  const records = [];\n  const classMap = new Map();\n\n  (Array.isArray(rows) ? rows : []).forEach((row) => {\n    const sourceId = String(row?.id || '');\n    if (!sourceId) return;\n    const groupIdentity = String(row?.groupId || \`${'${row?.groupName || row?.title || \'Học bổ sung\'}'}::${'${row?.subject || \'\'}'}\`);\n    const classId = \`supplemental:${'${groupIdentity}'}\`;\n    const sessionId = \`supplemental:${'${sourceId}'}\`;\n    const participants = Array.isArray(row?.participants) ? row.participants : [];\n    const tardyCount = Number(row?.tardyCount || 0);\n    const presentCount = Number(row?.presentCount || 0) + tardyCount;\n    const absentCount = Number(row?.absentCount || 0);\n    const className = String(row?.groupName || row?.title || 'Học bổ sung');\n    const subject = String(row?.subject || '');\n\n    sessions.push({\n      id: sessionId,\n      class_id: classId,\n      class_type: 'supplemental',\n      class_name: className,\n      subject,\n      teacher_name: String(row?.teacherName || ''),\n      attendance_date: String(row?.date || '').slice(0, 10),\n      checked_at: row?.attendanceConfirmedAt || row?.checkedAt || null,\n      checked_by_name: String(row?.checkedByName || ''),\n      total_students: Number(row?.totalStudents || participants.length || 0),\n      present_count: presentCount,\n      absent_count: absentCount,\n      note: String(row?.sessionNote || ''),\n      session_status: row?.status === 'cancelled' ? 'cancelled' : 'completed',\n      lesson_periods: row?.status === 'cancelled' ? 0 : 1,\n      cancellation_reason: String(row?.cancellationReason || ''),\n      teaching_room: String(row?.room || ''),\n      teaching_time_range: String(row?.timeRange || ''),\n      attendance_source: 'supplemental',\n    });\n\n    if (!classMap.has(classId)) {\n      classMap.set(classId, {\n        id: classId,\n        class_type: 'supplemental',\n        class_name: className,\n        subject,\n        teacher_name: String(row?.teacherName || ''),\n        active: true,\n      });\n    }\n\n    participants.forEach((participant, index) => {\n      const rawStatus = String(participant?.status || 'present');\n      records.push({\n        id: \`supplemental-record:${'${sourceId}'}:${'${participant?.studentId || index}'}\`,\n        session_id: sessionId,\n        class_id: classId,\n        member_id: participant?.studentId || null,\n        member_key: participant?.canonicalStudentKey || '',\n        student_code: participant?.studentCode || '',\n        student_full_name: participant?.fullName || '',\n        school_class_name: participant?.schoolClassName || '',\n        status: rawStatus === 'tardy' ? 'late' : rawStatus === 'absent' ? 'absent' : 'present',\n        recorded_at: null,\n        absence_reason_code: participant?.absenceReasonCode || '',\n        absence_note: participant?.absenceNote || '',\n      });\n    });\n  });\n\n  return { sessions, records, classes: [...classMap.values()] };\n}\n\nfunction sameText(a, b) {`,
  'supplemental report normalizer',
);

reportUtil = replaceOnce(
  reportUtil,
  `function matchesPeriod(session, mode, month, date) {\n  const attendanceDate = String(session?.attendance_date || '');\n  if (mode === 'day') return !date || attendanceDate === date;\n  return !month || attendanceDate.slice(0, 7) === month;\n}`,
  `function matchesPeriod(session, mode, month, date) {\n  const attendanceDate = String(session?.attendance_date || '');\n  if (mode === 'day') return !date || attendanceDate === date;\n  return !month || attendanceDate.slice(0, 7) === month;\n}\n\nfunction matchesActivityType(session, activityType) {\n  const requested = activityType === 'enrichment' ? 'gifted' : String(activityType || 'all');\n  return requested === 'all' || String(session?.class_type || '') === requested;\n}`,
  'activity type matcher',
);

reportUtil = replaceOnce(
  reportUtil,
  `  date = '',\n  classId = 'all',`,
  `  date = '',\n  activityType = 'all',\n  classId = 'all',`,
  'activity type argument',
);

reportUtil = replaceOnce(
  reportUtil,
  `    .filter((session) => matchesPeriod(session, mode, month, date))\n    .filter((session) => classId === 'all' || String(session.class_id) === String(classId))`,
  `    .filter((session) => matchesPeriod(session, mode, month, date))\n    .filter((session) => matchesActivityType(session, activityType))\n    .filter((session) => classId === 'all' || String(session.class_id) === String(classId))`,
  'activity type report filter',
);

fs.writeFileSync(reportUtilPath, reportUtil);

const reportComponentPath = 'src/components/attendance/AttendanceMonthlyReport.jsx';
let reportComponent = fs.readFileSync(reportComponentPath, 'utf8');

reportComponent = replaceOnce(
  reportComponent,
  `import { buildAttendanceReport, uniqueReportTeachers } from '../../utils/attendanceReport.js';`,
  `import { buildAttendanceReport, normalizeSupplementalReportData, uniqueReportTeachers } from '../../utils/attendanceReport.js';`,
  'report normalizer import',
);

reportComponent = replaceOnce(
  reportComponent,
  `function classTypeLabel(value) {\n  return value === 'gifted' ? 'Bồi dưỡng HSG' : value === 'remedial' ? 'Phụ đạo' : '—';\n}`,
  `function classTypeLabel(value) {\n  return value === 'gifted' ? 'Bồi dưỡng HSG' : value === 'remedial' ? 'Phụ đạo' : value === 'supplemental' ? 'Học bổ sung' : '—';\n}`,
  'supplemental class label',
);

reportComponent = replaceOnce(
  reportComponent,
  `export default function AttendanceMonthlyReport({ client, classes = [], month, onMonthChange, onError }) {`,
  `export default function AttendanceMonthlyReport({ client, classes = [], month, onMonthChange, onError, includeSupplemental = false }) {`,
  'supplemental access prop',
);

reportComponent = replaceOnce(
  reportComponent,
  `  const [sessions, setSessions] = useState([]);\n  const [records, setRecords] = useState([]);`,
  `  const [sessions, setSessions] = useState([]);\n  const [supplementalClasses, setSupplementalClasses] = useState([]);\n  const [activityType, setActivityType] = useState('all');\n  const [records, setRecords] = useState([]);`,
  'supplemental report state',
);

reportComponent = replaceOnce(
  reportComponent,
  `  const [loading, setLoading] = useState(false);\n\n  useEffect(() => {`,
  `  const [loading, setLoading] = useState(false);\n\n  useEffect(() => {\n    function handleActivityFilter(event) {\n      if (event?.detail?.tab !== 'report') return;\n      const nextType = ['all', 'remedial', 'enrichment', 'supplemental'].includes(event?.detail?.activityType)\n        ? event.detail.activityType\n        : 'all';\n      setActivityType(nextType);\n      setClassId('all');\n      setTeacherName('all');\n      remarksDirty.current = false;\n    }\n    window.addEventListener('bes-attendance-activity-filter-change', handleActivityFilter);\n    return () => window.removeEventListener('bes-attendance-activity-filter-change', handleActivityFilter);\n  }, []);\n\n  useEffect(() => {`,
  'shared activity filter listener',
);

const oldLoadBlock = `        const sessionResult = await sessionQuery;\n        if (sessionResult.error) throw sessionResult.error;\n        const nextSessions = sessionResult.data || [];\n        const sessionIds = nextSessions.map((row) => row.id);\n        const completedIds = nextSessions.filter((row) => row.session_status !== 'cancelled').map((row) => row.id);\n        let nextRecords = [];\n        let nextChanges = [];\n        if (completedIds.length) {\n          const recordResult = await client.from('bes_extra_attendance_records')\n            .select(REPORT_RECORD_COLUMNS)\n            .in('session_id', completedIds)\n            .order('student_full_name', { ascending: true });\n          if (recordResult.error) throw recordResult.error;\n          nextRecords = recordResult.data || [];\n        }\n        if (sessionIds.length) {\n          const changeResult = await client.from('bes_extra_attendance_record_changes')\n            .select(REPORT_CHANGE_COLUMNS)\n            .in('session_id', sessionIds)\n            .order('changed_at', { ascending: true });\n          if (changeResult.error) throw changeResult.error;\n          nextChanges = changeResult.data || [];\n        }\n        if (!cancelled) {\n          setSessions(nextSessions);\n          setRecords(nextRecords);\n          setChanges(nextChanges);\n          remarksDirty.current = false;\n        }`;

const newLoadBlock = `        const sessionResult = await sessionQuery;\n        if (sessionResult.error) throw sessionResult.error;\n        const extraSessions = sessionResult.data || [];\n        const sessionIds = extraSessions.map((row) => row.id);\n        const completedIds = extraSessions.filter((row) => row.session_status !== 'cancelled').map((row) => row.id);\n        let supplementalData = { sessions: [], records: [], classes: [] };\n        if (includeSupplemental) {\n          const supplementalFrom = mode === 'day' ? date : bounds.start;\n          const supplementalTo = mode === 'day' ? date : bounds.next;\n          const supplementalResult = await client.rpc('bes_list_supplemental_history', { p_from: supplementalFrom, p_to: supplementalTo, p_query: '' });\n          if (supplementalResult.error) throw supplementalResult.error;\n          supplementalData = normalizeSupplementalReportData(supplementalResult.data || []);\n        }\n        let nextRecords = [...supplementalData.records];\n        let nextChanges = [];\n        if (completedIds.length) {\n          const recordResult = await client.from('bes_extra_attendance_records')\n            .select(REPORT_RECORD_COLUMNS)\n            .in('session_id', completedIds)\n            .order('student_full_name', { ascending: true });\n          if (recordResult.error) throw recordResult.error;\n          nextRecords = [...(recordResult.data || []), ...supplementalData.records];\n        }\n        if (sessionIds.length) {\n          const changeResult = await client.from('bes_extra_attendance_record_changes')\n            .select(REPORT_CHANGE_COLUMNS)\n            .in('session_id', sessionIds)\n            .order('changed_at', { ascending: true });\n          if (changeResult.error) throw changeResult.error;\n          nextChanges = changeResult.data || [];\n        }\n        if (!cancelled) {\n          setSessions([...extraSessions, ...supplementalData.sessions]);\n          setSupplementalClasses(supplementalData.classes);\n          setRecords(nextRecords);\n          setChanges(nextChanges);\n          remarksDirty.current = false;\n        }`;
reportComponent = replaceOnce(reportComponent, oldLoadBlock, newLoadBlock, 'merged report data load');

reportComponent = replaceOnce(
  reportComponent,
  `  }, [client, mode, month, date]);\n\n  const teachers = useMemo(() => uniqueReportTeachers(sessions, month, { mode, date }), [sessions, month, mode, date]);\n  useEffect(() => { if (teacherName !== 'all' && !teachers.includes(teacherName)) setTeacherName('all'); }, [teachers.join('|')]);\n  useEffect(() => { if (classId !== 'all' && !classes.some((row) => String(row.id) === String(classId))) setClassId('all'); }, [classes.length]);\n\n  const report = useMemo(() => buildAttendanceReport({ sessions, records, changes, classes, mode, month, date, classId, teacherName }), [sessions, records, changes, classes, mode, month, date, classId, teacherName]);`,
  `  }, [client, mode, month, date, includeSupplemental]);\n\n  const reportClasses = useMemo(() => [...classes, ...supplementalClasses], [classes, supplementalClasses]);\n  const teachers = useMemo(() => uniqueReportTeachers(sessions, month, { mode, date }), [sessions, month, mode, date]);\n  useEffect(() => { if (teacherName !== 'all' && !teachers.includes(teacherName)) setTeacherName('all'); }, [teachers.join('|')]);\n  useEffect(() => { if (classId !== 'all' && !reportClasses.some((row) => String(row.id) === String(classId))) setClassId('all'); }, [reportClasses]);\n\n  const report = useMemo(() => buildAttendanceReport({ sessions, records, changes, classes: reportClasses, mode, month, date, activityType, classId, teacherName }), [sessions, records, changes, reportClasses, mode, month, date, activityType, classId, teacherName]);`,
  'report class and activity integration',
);

reportComponent = replaceOnce(
  reportComponent,
  `  const selectedClass = classes.find((row) => String(row.id) === String(classId));`,
  `  const selectedClass = reportClasses.find((row) => String(row.id) === String(classId));`,
  'supplemental selected class',
);

reportComponent = replaceOnce(
  reportComponent,
  `{classes.filter((row) => row.active !== false).map((row) => <option key={row.id} value={row.id}>{row.class_name}</option>)}`,
  `{reportClasses.filter((row) => row.active !== false && (activityType === 'all' || (activityType === 'enrichment' ? row.class_type === 'gifted' : row.class_type === activityType))).map((row) => <option key={row.id} value={row.id}>{row.class_name}</option>)}`,
  'supplemental class dropdown',
);

fs.writeFileSync(reportComponentPath, reportComponent);

const shellPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
let shell = fs.readFileSync(shellPath, 'utf8');
shell = replaceOnce(
  shell,
  `<AttendanceMonthlyReport client={client} classes={classes} month={reportMonth} onMonthChange={setReportMonth} onError={setError} />`,
  `<AttendanceMonthlyReport client={client} classes={classes} includeSupplemental={canSeeSupplementalHistory} month={reportMonth} onMonthChange={setReportMonth} onError={setError} />`,
  'supplemental report access gate',
);
fs.writeFileSync(shellPath, shell);

const bootstrapPath = 'src/supplementalAttendanceReportingBootstrap.js';
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
bootstrap = replaceOnce(
  bootstrap,
  `    } else if (activeTab === 'report') {\n      if (filter === 'supplemental') {\n        const rows = await loadSupplementalStudentReport(client, { from: dateFrom, to: dateTo });\n        if (current !== token) return;\n        renderPanel(reportHtml(rows), 'Báo cáo Học bổ sung');\n      } else {\n        const rows = await loadAttendanceActivities(client, { from: dateFrom, to: dateTo }, filter);\n        if (current !== token) return;\n        renderPanel(renderLegacyActivityReport(rows, filter), \`Báo cáo ${'${activityLabel(filter)}'}\`);\n      }\n    }`,
  `    } else if (activeTab === 'report') {\n      closePanel();\n      return;\n    }`,
  'native unified report routing',
);
fs.writeFileSync(bootstrapPath, bootstrap);

console.log('Applied unified supplemental attendance report integration.');
