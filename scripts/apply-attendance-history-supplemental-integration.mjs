import fs from 'node:fs';

const componentPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
const bootstrapPath = 'src/supplementalAttendanceReportingBootstrap.js';

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let component = fs.readFileSync(componentPath, 'utf8');
if (!component.includes('const [supplementalHistorySessions, setSupplementalHistorySessions]')) {
  component = replaceOnce(
    component,
    "import { filterAndSortAttendanceHistory } from '../utils/attendanceHistoryFilters.js';\n",
    "import { filterAndSortAttendanceHistory } from '../utils/attendanceHistoryFilters.js';\nimport { canManageSupplementalLearning } from '../supplementalAccess.js';\n",
    'supplemental access import',
  );

  component = replaceOnce(
    component,
    `function sameClassIdentity(row, group) {\n  return row?.class_type === group?.class_type\n    && fold(row?.class_name) === fold(group?.class_name)\n    && fold(row?.subject) === fold(group?.subject);\n}\n\nexport default function GlobalAttendanceNavigationTab({ currentUser }) {`,
    `function sameClassIdentity(row, group) {\n  return row?.class_type === group?.class_type\n    && fold(row?.class_name) === fold(group?.class_name)\n    && fold(row?.subject) === fold(group?.subject);\n}\n\nfunction isSupplementalHistorySession(session) {\n  return session?.attendance_source === 'supplemental' || session?.class_type === 'supplemental';\n}\n\nfunction historyClassTypeLabel(session) {\n  return isSupplementalHistorySession(session) ? 'Học bổ sung' : extraClassTypeLabel(session?.class_type);\n}\n\nfunction normalizeSupplementalHistorySessions(rows = []) {\n  return (Array.isArray(rows) ? rows : []).map((row) => {\n    const sourceId = String(row?.id || '');\n    const participants = Array.isArray(row?.participants) ? row.participants : [];\n    const tardyCount = Number(row?.tardyCount || 0);\n    const presentCount = Number(row?.presentCount || 0);\n    return {\n      id: \\`supplemental:\\${sourceId}\\`,\n      class_id: row?.groupId ? \\`supplemental-group:\\${row.groupId}\\` : '',\n      class_type: 'supplemental',\n      class_name: row?.groupName || row?.title || 'Học bổ sung',\n      subject: row?.subject || '',\n      teacher_id: null,\n      teacher_name: row?.teacherName || '',\n      teacher_email: '',\n      attendance_date: row?.date || '',\n      checked_at: row?.attendanceConfirmedAt || null,\n      checked_by: null,\n      checked_by_name: row?.checkedByName || '',\n      total_students: Number(row?.totalStudents || participants.length || 0),\n      present_count: presentCount + tardyCount,\n      absent_count: Number(row?.absentCount || 0),\n      tardy_count: tardyCount,\n      note: row?.sessionNote || '',\n      session_status: row?.status === 'cancelled' ? 'cancelled' : 'completed',\n      lesson_periods: null,\n      cancellation_reason: row?.cancellationReason || '',\n      teaching_room: row?.room || '',\n      teaching_time_range: row?.timeRange || '',\n      proof_path: row?.proofPath || '',\n      created_at: null,\n      attendance_source: 'supplemental',\n      supplemental_session_id: sourceId,\n      history_records: participants.map((participant, index) => ({\n        id: \\`supplemental-record:\\${sourceId}:\\${participant?.studentId || index}\\`,\n        session_id: \\`supplemental:\\${sourceId}\\`,\n        class_id: row?.groupId ? \\`supplemental-group:\\${row.groupId}\\` : '',\n        member_id: participant?.studentId || null,\n        member_key: participant?.canonicalStudentKey || '',\n        student_code: participant?.studentCode || '',\n        student_full_name: participant?.fullName || '',\n        school_class_name: participant?.schoolClassName || '',\n        status: participant?.status === 'tardy' ? ATTENDANCE_STATUS.LATE : normalizeAttendanceStatus(participant?.status, participant?.status !== 'absent'),\n        recorded_at: null,\n        absence_reason_code: participant?.absenceReasonCode || '',\n        absence_note: participant?.absenceNote || '',\n      })),\n    };\n  });\n}\n\nexport default function GlobalAttendanceNavigationTab({ currentUser }) {`,
    'supplemental history helpers',
  );

  component = replaceOnce(
    component,
    "  const [sessions, setSessions] = useState([]);\n  const [records, setRecords] = useState([]);",
    "  const [sessions, setSessions] = useState([]);\n  const [supplementalHistorySessions, setSupplementalHistorySessions] = useState([]);\n  const [records, setRecords] = useState([]);",
    'supplemental history state',
  );

  component = replaceOnce(
    component,
    "  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));\n",
    "  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));\n  const canSeeSupplementalHistory = canManageSupplementalLearning(runtime);\n",
    'supplemental visibility rule',
  );

  component = replaceOnce(
    component,
    `    try {\n      const [classResult, memberResult, classTeacherResult, sessionResult] = await Promise.all([\n        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),\n        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),\n        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),\n        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),\n      ]);\n      const firstError = classResult.error || memberResult.error || classTeacherResult.error || sessionResult.error;`,
    `    try {\n      const supplementalHistoryPromise = canSeeSupplementalHistory && canAccessAttendanceView('history')\n        ? client.rpc('bes_list_supplemental_history', { p_from: '2000-01-01', p_to: today, p_query: '' })\n        : Promise.resolve({ data: [], error: null });\n      const [classResult, memberResult, classTeacherResult, sessionResult, supplementalHistoryResult] = await Promise.all([\n        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),\n        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),\n        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),\n        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),\n        supplementalHistoryPromise,\n      ]);\n      const firstError = classResult.error || memberResult.error || classTeacherResult.error || sessionResult.error || supplementalHistoryResult.error;`,
    'load supplemental history',
  );

  component = replaceOnce(
    component,
    "      setClassTeachers(classTeacherResult.data || []);\n      setSessions(sessionResult.data || []);\n",
    "      setClassTeachers(classTeacherResult.data || []);\n      setSessions(sessionResult.data || []);\n      setSupplementalHistorySessions(normalizeSupplementalHistorySessions(supplementalHistoryResult.data || []));\n",
    'store supplemental history',
  );

  component = replaceOnce(
    component,
    `  async function loadSessionRecords(sessionId) {\n    if (!client || !sessionId) return;\n    setSelectedSessionId(sessionId);\n    setError('');\n    const { data, error: recordError } = await client.from('bes_extra_attendance_records').select(RECORD_COLUMNS).eq('session_id', sessionId).order('student_full_name', { ascending: true });\n    if (recordError) setError(recordError.message);\n    else setRecords(data || []);\n  }`,
    `  function loadSupplementalSessionRecords(session) {\n    if (!session || !isSupplementalHistorySession(session)) return;\n    setSelectedSessionId(session.id);\n    setError('');\n    setRecords(Array.isArray(session.history_records) ? session.history_records : []);\n  }\n\n  async function loadSessionRecords(sessionId) {\n    if (!client || !sessionId) return;\n    const supplementalSession = supplementalHistorySessions.find((session) => String(session.id) === String(sessionId));\n    if (supplementalSession) {\n      loadSupplementalSessionRecords(supplementalSession);\n      return;\n    }\n    setSelectedSessionId(sessionId);\n    setError('');\n    const { data, error: recordError } = await client.from('bes_extra_attendance_records').select(RECORD_COLUMNS).eq('session_id', sessionId).order('student_full_name', { ascending: true });\n    if (recordError) setError(recordError.message);\n    else setRecords(data || []);\n  }`,
    'source-aware session detail',
  );

  component = replaceOnce(
    component,
    "  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory) return;",
    "  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory || isSupplementalHistorySession(session)) return;",
    'source-aware single delete',
  );

  component = replaceOnce(
    component,
    `  function toggleHistoryBulkSelection(sessionId) {\n    const key = String(sessionId);`,
    `  function toggleHistoryBulkSelection(sessionId) {\n    const target = [...sessions, ...supplementalHistorySessions].find((session) => String(session.id) === String(sessionId));\n    if (isSupplementalHistorySession(target)) return;\n    const key = String(sessionId);`,
    'source-aware bulk selection',
  );

  component = replaceOnce(
    component,
    "    const filteredIds = filteredHistory.map((session) => session.id);",
    "    const filteredIds = filteredHistory.filter((session) => !isSupplementalHistorySession(session)).map((session) => session.id);",
    'bulk select legacy sessions only',
  );

  component = replaceOnce(
    component,
    `  const filteredHistory = useMemo(() => filterAndSortAttendanceHistory(sessions, {\n    query: historyQuery,\n    type: historyType,\n    dateFrom: historyDateFrom,\n    dateTo: historyDateTo,\n    sort: historySort,\n    getTeacher: teacherForSession,\n  }), [sessions, historyQuery, historyType, historyDateFrom, historyDateTo, historySort, classTeachers]);`,
    `  const combinedHistorySessions = useMemo(() => [...sessions, ...supplementalHistorySessions], [sessions, supplementalHistorySessions]);\n  const filteredHistory = useMemo(() => filterAndSortAttendanceHistory(combinedHistorySessions, {\n    query: historyQuery,\n    type: historyType,\n    dateFrom: historyDateFrom,\n    dateTo: historyDateTo,\n    sort: historySort,\n    getTeacher: teacherForSession,\n  }), [combinedHistorySessions, historyQuery, historyType, historyDateFrom, historyDateTo, historySort, classTeachers]);`,
    'combine history sources',
  );

  component = replaceOnce(
    component,
    "  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || calendarSessions.find((session) => String(session.id) === String(selectedSessionId));",
    "  const selectedSession = combinedHistorySessions.find((session) => String(session.id) === String(selectedSessionId)) || calendarSessions.find((session) => String(session.id) === String(selectedSessionId));",
    'selected history session from combined source',
  );

  component = replaceOnce(
    component,
    `<label><span>Loại lớp</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></label>`,
    `<label><span>Loại lớp</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option>{canSeeSupplementalHistory ? <option value="supplemental">Học bổ sung</option> : null}</select></label>`,
    'native supplemental history filter',
  );

  component = replaceOnce(
    component,
    `                  const isBulkSelected = selectedHistorySessionIdSet.has(String(session.id));\n                  return <button key={session.id} type="button" className={\\`${String(selectedSessionId) === String(session.id) && !historySelectionMode ? 'is-selected' : ''}\\${historySelectionMode ? ' is-bulk-mode' : ''}\\${isBulkSelected ? ' is-bulk-selected' : ''}\\`.trim()} aria-pressed={historySelectionMode ? isBulkSelected : undefined} onClick={() => { if (historySelectionMode) toggleHistoryBulkSelection(session.id); else loadSessionRecords(session.id); }}>\n                    {historySelectionMode ? <span className={\\`ahv3__select-box \\${isBulkSelected ? 'is-checked' : ''}\\`} aria-hidden="true">{isBulkSelected ? <Icon name="check" size={14} /> : null}</span> : null}`,
    `                  const isBulkSelected = selectedHistorySessionIdSet.has(String(session.id));\n                  const isBulkSelectable = !isSupplementalHistorySession(session);\n                  return <button key={session.id} type="button" className={\\`${String(selectedSessionId) === String(session.id) && !historySelectionMode ? 'is-selected' : ''}\\${historySelectionMode ? ' is-bulk-mode' : ''}\\${isBulkSelected ? ' is-bulk-selected' : ''}\\`.trim()} aria-pressed={historySelectionMode && isBulkSelectable ? isBulkSelected : undefined} onClick={() => { if (historySelectionMode) { if (isBulkSelectable) toggleHistoryBulkSelection(session.id); } else loadSessionRecords(session.id); }}>\n                    {historySelectionMode && isBulkSelectable ? <span className={\\`ahv3__select-box \\${isBulkSelected ? 'is-checked' : ''}\\`} aria-hidden="true">{isBulkSelected ? <Icon name="check" size={14} /> : null}</span> : null}`,
    'supplemental bulk-selection safety',
  );

  component = component.replaceAll('extraClassTypeLabel(session.class_type)', 'historyClassTypeLabel(session)');
  component = component.replaceAll('extraClassTypeLabel(selectedSession.class_type)', 'historyClassTypeLabel(selectedSession)');

  component = replaceOnce(
    component,
    `{canAccessAttendanceView('report') ? <button type="button" className="ahv3__report-button"`,
    `{canAccessAttendanceView('report') && !isSupplementalHistorySession(selectedSession) ? <button type="button" className="ahv3__report-button"`,
    'hide legacy report action for supplemental',
  );

  component = replaceOnce(
    component,
    `{canDeleteAttendanceHistory ? <button type="button" className="ahv3__delete-button"`,
    `{canDeleteAttendanceHistory && !isSupplementalHistorySession(selectedSession) ? <button type="button" className="ahv3__delete-button"`,
    'hide legacy delete action for supplemental',
  );

  fs.writeFileSync(componentPath, component);
}

let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes("activityType === 'supplemental' ? 'supplemental'")) {
  bootstrap = replaceOnce(
    bootstrap,
    "  const mapped = activityType === 'enrichment' ? 'gifted' : activityType === 'remedial' ? 'remedial' : 'all';",
    "  const mapped = activityType === 'enrichment' ? 'gifted' : activityType === 'remedial' ? 'remedial' : activityType === 'supplemental' ? 'supplemental' : 'all';",
    'top history filter mapping',
  );

  bootstrap = replaceOnce(
    bootstrap,
    `    if (activeTab === 'history') {\n      syncLegacyHistoryFilter(filter);\n      if (filter === 'supplemental') {\n        const rows = await loadSupplementalHistory(client, { from: dateFrom, to: dateTo }, query);\n        if (current !== token) return;\n        renderPanel(historyHtml(rows), 'Lịch sử Học bổ sung');\n      } else {\n        const rows = await loadAttendanceActivities(client, { from: dateFrom, to: dateTo }, filter);\n        if (current !== token) return;\n        renderPanel(unifiedHistoryHtml(rows), \\`Lịch sử \\${activityLabel(filter)}\\`);\n      }\n    } else if (activeTab === 'report') {`,
    `    if (activeTab === 'history') {\n      syncLegacyHistoryFilter(filter);\n      closePanel();\n      return;\n    } else if (activeTab === 'report') {`,
    'use native history surface for all history types',
  );
  fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log('Applied native supplemental attendance history integration.');
