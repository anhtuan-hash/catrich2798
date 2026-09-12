from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


root = Path(__file__).resolve().parents[1]

# -----------------------------------------------------------------------------
# Shared React rollcall: complete multi-teacher + cross-source validation parity.
# -----------------------------------------------------------------------------
global_path = root / 'src/components/GlobalAttendanceNavigationTab.jsx'
global_text = global_path.read_text(encoding='utf-8')

global_text = replace_once(
    global_text,
    "import { attachSupplementalProof, beginSupplementalAttendance, cancelSupplementalSession, confirmSupplementalAttendance, deleteSupplementalAttendanceHistory } from '../attendance/supplementalLearningApi.js';",
    "import { attachSupplementalProof, beginSupplementalAttendance, cancelSupplementalSession, confirmSupplementalAttendance, deleteSupplementalAttendanceHistory, loadSupplementalAttendanceActivities, loadSupplementalSessionTeachers } from '../attendance/supplementalLearningApi.js';",
    'supplemental API import',
)

global_text = replace_once(
    global_text,
    """        const payload = await beginSupplementalAttendance(client, sessionId);\n        const session = payload?.session || {};\n        const sourceClassId = String(event?.detail?.classId || session.group_id || sessionId);\n        const syntheticClassId = 'supplemental:' + sourceClassId;\n        const participants = Array.isArray(payload?.participants) ? payload.participants : [];\n        const syntheticClass = {\n          id: syntheticClassId,\n          class_type: 'supplemental',\n          class_name: session.group_name || session.title || 'Học bổ sung',\n          subject: session.subject || '',\n          teacher_name: session.teacher_name || '',\n          room: session.room || '',\n          time_range: [session.start_time, session.end_time].filter(Boolean).join(' - '),\n          active: true,\n        };""",
    """        const [payload, supplementalTeacherRows] = await Promise.all([\n          beginSupplementalAttendance(client, sessionId),\n          loadSupplementalSessionTeachers(client, sessionId),\n        ]);\n        const session = payload?.session || {};\n        const sourceClassId = String(event?.detail?.classId || session.group_id || sessionId);\n        const syntheticClassId = 'supplemental:' + sourceClassId;\n        const participants = Array.isArray(payload?.participants) ? payload.participants : [];\n        const assignedTeacherNames = [];\n        [...(Array.isArray(supplementalTeacherRows) ? supplementalTeacherRows : []).map((row) => row?.fullName || row?.teacherName || ''), session.teacher_name || ''].forEach((name) => {\n          const clean = String(name || '').trim();\n          if (clean && !assignedTeacherNames.some((current) => fold(current) === fold(clean))) assignedTeacherNames.push(clean);\n        });\n        const sessionTeacherName = String(session.teacher_name || '').trim();\n        const initialTeacher = assignedTeacherNames.find((name) => fold(name) === fold(sessionTeacherName))\n          || (assignedTeacherNames.length === 1 ? assignedTeacherNames[0] : '');\n        const syntheticClass = {\n          id: syntheticClassId,\n          class_type: 'supplemental',\n          class_name: session.group_name || session.title || 'Học bổ sung',\n          subject: session.subject || '',\n          teacher_name: assignedTeacherNames.join(', '),\n          room: session.room || '',\n          time_range: [session.start_time, session.end_time].filter(Boolean).join(' - '),\n          active: true,\n        };""",
    'supplemental open payload',
)

global_text = replace_once(
    global_text,
    "        setSessionTeacher(session.teacher_name || '');",
    "        setSessionTeacher(initialTeacher);",
    'supplemental initial teacher',
)

global_text = replace_once(
    global_text,
    """  async function loadTeacherDaySessions(dateValue = attendanceDate) {\n    if (!client || !dateValue || !allowed) {\n      setTeacherDaySessions([]);\n      return [];\n    }\n    const { data, error: usageError } = await client.from('bes_extra_attendance_sessions')\n      .select('id,class_id,class_name,teacher_name,attendance_date,session_status')\n      .eq('attendance_date', dateValue)\n      .eq('session_status', 'completed')\n      .order('checked_at', { ascending: true });\n    if (usageError) {\n      setError(usageError.message || 'Không thể kiểm tra giáo viên đã điểm danh trong ngày.');\n      return [];\n    }\n    const rows = data || [];\n    setTeacherDaySessions(rows);\n    return rows;\n  }""",
    """  async function loadTeacherDaySessions(dateValue = attendanceDate) {\n    if (!client || !dateValue || !allowed) {\n      setTeacherDaySessions([]);\n      return [];\n    }\n    try {\n      const supplementalUsagePromise = canManageSupplementalLearning(runtime)\n        ? loadSupplementalAttendanceActivities(client, { from: dateValue, to: dateValue })\n        : Promise.resolve([]);\n      const [extraResult, supplementalActivities] = await Promise.all([\n        client.from('bes_extra_attendance_sessions')\n          .select('id,class_id,class_name,teacher_name,attendance_date,session_status')\n          .eq('attendance_date', dateValue)\n          .eq('session_status', 'completed')\n          .order('checked_at', { ascending: true }),\n        supplementalUsagePromise,\n      ]);\n      if (extraResult.error) throw extraResult.error;\n      const supplementalRows = (Array.isArray(supplementalActivities) ? supplementalActivities : [])\n        .filter((row) => String(row.status || '').toLowerCase() === 'confirmed')\n        .map((row) => ({\n          id: row.id,\n          class_id: 'supplemental:' + row.id,\n          class_name: row.title || 'Học bổ sung',\n          teacher_name: row.teacherName || '',\n          attendance_date: row.date || dateValue,\n          session_status: 'completed',\n        }));\n      const rows = [...(extraResult.data || []), ...supplementalRows];\n      setTeacherDaySessions(rows);\n      return rows;\n    } catch (usageError) {\n      setError(usageError?.message || 'Không thể kiểm tra giáo viên đã điểm danh trong ngày.');\n      setTeacherDaySessions([]);\n      return [];\n    }\n  }""",
    'cross-source teacher usage',
)

global_text = replace_once(
    global_text,
    """    const absentWithoutReason = draft.find((row) => row.status === ATTENDANCE_STATUS.ABSENT && !row.absence_reason_code);\n    if (absentWithoutReason) {\n      setError('Hãy chọn lý do vắng cho ' + (absentWithoutReason.student_full_name || 'học sinh vắng mặt') + '.');\n      return;\n    }\n    const [startTime = '', endTime = ''] = String(teachingTimeRange || '').split(/\\s*-\\s*/, 2);""",
    """    if (!sessionTeacher) {\n      setError('Vui lòng chọn giáo viên dạy hôm nay.');\n      return;\n    }\n    if (isTeacherBlocked) {\n      setError(`Giáo viên ${sessionTeacher} đã được điểm danh tại lớp ${blockedTeacherUsage.class_name} ngày ${formatDate(attendanceDate)}.`);\n      setSessionTeacher('');\n      return;\n    }\n    if (!teachingRoom.trim()) {\n      setError('Vui lòng nhập phòng học.');\n      return;\n    }\n    if (!teachingTimeRange.trim()) {\n      setError('Vui lòng nhập thời gian dạy.');\n      return;\n    }\n    if (invalidAbsentRows.length) {\n      const first = invalidAbsentRows[0];\n      setError(first.absence_reason_code === 'other'\n        ? `Vui lòng ghi chú lý do “Khác” cho ${first.student_full_name}.`\n        : `Vui lòng chọn lý do vắng cho ${first.student_full_name}.`);\n      return;\n    }\n    const [startTime = '', endTime = ''] = String(teachingTimeRange || '').split(/\\s*[-–—]\\s*/, 2);\n    if (!startTime.trim() || !endTime.trim()) {\n      setError('Vui lòng nhập thời gian dạy.');\n      return;\n    }""",
    'supplemental confirmation validation',
)

global_text = replace_once(
    global_text,
    '              <section className="attendance-rollcall">',
    """              <section\n                className=\"attendance-rollcall\"\n                data-bes-attendance-source={attendanceSource}\n                data-bes-attendance-session-id={attendanceSource === 'supplemental' ? (selectedSessionId || daySession?.id || '') : (daySession?.id || '')}\n              >""",
    'rollcall source metadata',
)

global_path.write_text(global_text, encoding='utf-8')

# -----------------------------------------------------------------------------
# Existing post-confirm editor: make it source-aware rather than duplicating UI.
# -----------------------------------------------------------------------------
editor_path = root / 'src/attendancePostConfirmEditBootstrap.js'
editor = editor_path.read_text(encoding='utf-8')

editor = replace_once(
    editor,
    """import {\n  ensureRuntimeReady,\n  getRuntimeClient,\n  getRuntimeState,\n  subscribeRuntime,\n} from './services/runtime/core.js';""",
    """import {\n  ensureRuntimeReady,\n  getRuntimeClient,\n  getRuntimeState,\n  subscribeRuntime,\n} from './services/runtime/core.js';\nimport {\n  getSupplementalAttendanceEditSnapshot,\n  updateSupplementalAttendanceSession,\n} from './attendance/supplementalLearningApi.js';""",
    'editor supplemental imports',
)

editor = replace_once(
    editor,
    "let activeKey = '';\nlet activeSession = null;",
    "let activeKey = '';\nlet activeSource = 'extra';\nlet activeSession = null;",
    'editor active source state',
)

editor = replace_once(
    editor,
    """  const classId = text(\n    selectedButton?.dataset?.besAttendanceClassId\n      || selectedButton?.getAttribute?.('data-bes-attendance-class-id'),\n  ).trim();\n  if (!className || !attendanceDate) return null;\n  return { rollcall, className, attendanceDate, classId };""",
    """  const classId = text(\n    selectedButton?.dataset?.besAttendanceClassId\n      || selectedButton?.getAttribute?.('data-bes-attendance-class-id'),\n  ).trim();\n  const source = text(rollcall.dataset.besAttendanceSource || rollcall.getAttribute('data-bes-attendance-source')).trim() === 'supplemental'\n    ? 'supplemental'\n    : 'extra';\n  const sessionId = text(rollcall.dataset.besAttendanceSessionId || rollcall.getAttribute('data-bes-attendance-session-id')).trim();\n  if (!className || !attendanceDate) return null;\n  return { rollcall, className, attendanceDate, classId, source, sessionId };""",
    'editor selected context source',
)

editor = replace_once(
    editor,
    """function clearState({ keepNotice = false } = {}) {\n  activeKey = '';\n  activeSession = null;""",
    """function clearState({ keepNotice = false } = {}) {\n  activeKey = '';\n  activeSource = 'extra';\n  activeSession = null;""",
    'editor clear source',
)

editor = replace_once(
    editor,
    """  const provisionalKey = `${context.classId || context.className}|${context.attendanceDate}`;\n  if (!force && provisionalKey === activeKey && activeSession) {\n    queueRender();\n    return;\n  }\n\n  loading = true;\n  queueRender();\n  try {\n    const classId = await resolveClassId(context);""",
    """  const provisionalKey = `${context.source}|${context.sessionId || context.classId || context.className}|${context.attendanceDate}`;\n  if (!force && provisionalKey === activeKey && activeSession) {\n    queueRender();\n    return;\n  }\n\n  loading = true;\n  queueRender();\n  try {\n    if (context.source === 'supplemental') {\n      if (!context.sessionId) {\n        clearState();\n        return;\n      }\n      const snapshot = await getSupplementalAttendanceEditSnapshot(client, context.sessionId);\n      activeKey = provisionalKey;\n      activeSource = 'supplemental';\n      activeSession = snapshot?.session || null;\n      serverAccess = snapshot?.access || { allowed: false, reason: 'unknown' };\n      updateClockOffset(serverAccess?.server_now);\n      records = (Array.isArray(snapshot?.records) ? snapshot.records : []).map((record) => ({\n        ...record,\n        status: record.status === 'tardy' ? 'late' : record.status,\n      }));\n      latestChange = snapshot?.latestChange && Object.keys(snapshot.latestChange).length ? snapshot.latestChange : null;\n      editing = false;\n      draft = [];\n      draftNote = text(activeSession?.note);\n      errorMessage = '';\n      return;\n    }\n\n    activeSource = 'extra';\n    const classId = await resolveClassId(context);""",
    'editor supplemental load branch',
)

editor = replace_once(
    editor,
    """function localAccess() {\n  if (!activeSession) return { allowed: false, reason: 'not_completed', remainingMs: 0, expiresAt: '' };\n  const evaluated = evaluatePostConfirmEditAccess({""",
    """function localAccess() {\n  if (!activeSession) return { allowed: false, reason: 'not_completed', remainingMs: 0, expiresAt: '' };\n  if (activeSource === 'supplemental') {\n    return {\n      allowed: Boolean(serverAccess?.allowed),\n      reason: serverAccess?.reason || 'unknown',\n      bypass: Boolean(serverAccess?.bypass),\n      remainingMs: Math.max(0, Number(serverAccess?.remaining_seconds || 0) * 1000),\n      expiresAt: serverAccess?.expires_at || '',\n    };\n  }\n  const evaluated = evaluatePostConfirmEditAccess({""",
    'editor supplemental access',
)

editor = replace_once(
    editor,
    "    if (!records.length) records = await fetchRecords(activeSession.id);",
    "    if (!records.length && activeSource !== 'supplemental') records = await fetchRecords(activeSession.id);",
    'editor supplemental records',
)

editor = replace_once(
    editor,
    """  const { error } = await client.rpc('bes_update_extra_attendance_session', {\n    p_session_id: activeSession.id,\n    p_records: payload,\n    p_note: text(draftNote).trim(),\n  });\n  saving = false;\n\n  if (error) {\n    errorMessage = error.message || 'Không thể lưu điều chỉnh điểm danh.';\n    if (/30 phút|không có quyền|đã hết/i.test(errorMessage)) editing = false;\n    queueRender();\n    return;\n  }""",
    """  let saveError = null;\n  try {\n    if (activeSource === 'supplemental') {\n      await updateSupplementalAttendanceSession(client, {\n        sessionId: activeSession.id,\n        records: payload,\n        note: text(draftNote).trim(),\n      });\n    } else {\n      const { error } = await client.rpc('bes_update_extra_attendance_session', {\n        p_session_id: activeSession.id,\n        p_records: payload,\n        p_note: text(draftNote).trim(),\n      });\n      saveError = error;\n    }\n  } catch (error) {\n    saveError = error;\n  }\n  saving = false;\n\n  if (saveError) {\n    errorMessage = saveError.message || 'Không thể lưu điều chỉnh điểm danh.';\n    if (/30 phút|không có quyền|đã hết/i.test(errorMessage)) editing = false;\n    queueRender();\n    return;\n  }""",
    'editor supplemental save',
)

editor_path.write_text(editor, encoding='utf-8')
print('Applied supplemental final parity frontend patch.')
