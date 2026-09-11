import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing anchor: ${label}`);
  return source.replace(before, after);
}

const reactPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
let react = fs.readFileSync(reactPath, 'utf8');

react = replaceOnce(react,
  "import { canManageSupplementalLearning } from '../supplementalAccess.js';\n",
  "import { canManageSupplementalLearning } from '../supplementalAccess.js';\nimport { attachSupplementalProof, beginSupplementalAttendance, cancelSupplementalSession, confirmSupplementalAttendance } from '../attendance/supplementalLearningApi.js';\n",
  'supplemental API import');

react = replaceOnce(react,
  '      lesson_periods: null,',
  '      lesson_periods: Number(row?.lessonPeriods ?? row?.lesson_periods ?? 1) || 1,',
  'supplemental history lesson periods');

react = replaceOnce(react,
  "  const selectedClass = useMemo(() => classes.find((row) => String(row.id) === String(selectedClassId)) || null, [classes, selectedClassId]);\n",
  "  const selectedClass = useMemo(() => classes.find((row) => String(row.id) === String(selectedClassId)) || null, [classes, selectedClassId]);\n  const attendanceSource = String(selectedClassId || '').startsWith('supplemental:') ? 'supplemental' : 'extra';\n",
  'attendance source discriminator');

const listenerAnchor = "  async function loadDaySession(classId = selectedClassId, dateValue = attendanceDate) {";
const listener = `  useEffect(() => {\n    if (!client || !allowed || !canManageSupplementalLearning(runtime)) return undefined;\n\n    const openSupplementalRollcall = async (event) => {\n      const sessionId = String(event?.detail?.sessionId || '').trim();\n      if (!sessionId) return;\n      try {\n        setBusy(true);\n        setError('');\n        setNotice('');\n        const payload = await beginSupplementalAttendance(client, sessionId);\n        const session = payload?.session || {};\n        const sourceClassId = String(event?.detail?.classId || session.group_id || sessionId);\n        const syntheticClassId = 'supplemental:' + sourceClassId;\n        const participants = Array.isArray(payload?.participants) ? payload.participants : [];\n        const syntheticClass = {\n          id: syntheticClassId,\n          class_type: 'supplemental',\n          class_name: session.group_name || session.title || 'Học bổ sung',\n          subject: session.subject || '',\n          teacher_name: session.teacher_name || '',\n          room: session.room || '',\n          time_range: [session.start_time, session.end_time].filter(Boolean).join(' - '),\n          active: true,\n        };\n        const syntheticMembers = participants.map((participant) => ({\n          id: participant.id,\n          class_id: syntheticClassId,\n          member_key: participant.canonicalStudentKey || participant.studentId || participant.id,\n          student_code: participant.studentCode || '',\n          student_full_name: participant.fullName || '',\n          school_class_name: participant.schoolClassName || '',\n          active: true,\n        }));\n        setClasses((current) => [...current.filter((row) => String(row.id) !== syntheticClassId), syntheticClass]);\n        setMembers((current) => [...current.filter((row) => String(row.class_id) !== syntheticClassId), ...syntheticMembers]);\n        setSelectedClassId(syntheticClassId);\n        setSelectedSessionId(sessionId);\n        setAttendanceDate(String(session.attendance_date || today).slice(0, 10));\n        setSessionTeacher(session.teacher_name || '');\n        setLessonPeriods(Number(session.lesson_periods || 1));\n        setTeachingRoom(session.room || '');\n        setTeachingTimeRange([session.start_time, session.end_time].filter(Boolean).join(' - '));\n        setDaySession({ ...session, id: sessionId, note: session.session_note || '' });\n        setDayRecords(participants.map((participant) => ({\n          member_key: participant.canonicalStudentKey || participant.studentId || participant.id,\n          status: participant.status === 'tardy' ? ATTENDANCE_STATUS.LATE : (participant.status || ATTENDANCE_STATUS.PRESENT),\n          absence_reason_code: participant.absenceReasonCode || '',\n          absence_note: participant.absenceNote || '',\n        })));\n        setOpen(true);\n        setView('quick');\n      } catch (openError) {\n        setError(openError?.message || 'Không thể mở điểm danh Học bổ sung.');\n      } finally {\n        setBusy(false);\n      }\n    };\n\n    window.addEventListener('bes-supplemental-open-rollcall', openSupplementalRollcall);\n    window.addEventListener('bes-open-supplemental-attendance', openSupplementalRollcall);\n    return () => {\n      window.removeEventListener('bes-supplemental-open-rollcall', openSupplementalRollcall);\n      window.removeEventListener('bes-open-supplemental-attendance', openSupplementalRollcall);\n    };\n  }, [client, allowed, runtime]);\n\n`;
react = replaceOnce(react, listenerAnchor, listener + listenerAnchor, 'supplemental rollcall listeners');

const confirmAnchor = "  async function confirmAttendance() {";
const helper = `  async function confirmSupplementalSharedAttendance() {\n    if (!selectedClass || busy || !client || isDayLocked) return;\n    if (!attendanceDate || isFutureDate) {\n      setError('Ngày điểm danh không được ở tương lai theo giờ Việt Nam.');\n      return;\n    }\n    const absentWithoutReason = draft.find((row) => row.status === ATTENDANCE_STATUS.ABSENT && !row.absence_reason_code);\n    if (absentWithoutReason) {\n      setError('Hãy chọn lý do vắng cho ' + (absentWithoutReason.student_full_name || 'học sinh vắng mặt') + '.');\n      return;\n    }\n    const [startTime = '', endTime = ''] = String(teachingTimeRange || '').split(/\\s*-\\s*/, 2);\n    setBusy(true);\n    setError('');\n    setNotice('');\n    try {\n      const created = await confirmSupplementalAttendance(client, {\n        sessionId: selectedSessionId || daySession?.id,\n        participants: draft.map((row) => ({\n          participantId: row.id || row.member_id || row.member_key,\n          status: row.status === ATTENDANCE_STATUS.LATE ? 'tardy' : row.status,\n          absenceReasonCode: row.absence_reason_code || '',\n          absenceNote: row.absence_note || '',\n        })),\n        sessionNote: note,\n        lessonPeriods,\n        teacherName: sessionTeacher,\n        room: teachingRoom.trim(),\n        startTime: startTime.trim(),\n        endTime: endTime.trim(),\n      });\n      const confirmedSession = created?.session || created || daySession;\n      setDaySession(confirmedSession);\n      if (proofFile && confirmedSession?.id) await uploadAttendanceProof(confirmedSession);\n      clearProofSelection();\n      setNotice('Đã chốt điểm danh Học bổ sung.');\n      window.dispatchEvent(new CustomEvent('bes-supplemental-attendance-changed', { detail: { sessionId: selectedSessionId || daySession?.id } }));\n      await loadHistory();\n    } catch (confirmError) {\n      setError(confirmError?.message || 'Không thể chốt điểm danh Học bổ sung.');\n    } finally {\n      setBusy(false);\n    }\n  }\n\n`;
react = replaceOnce(react, confirmAnchor, helper + confirmAnchor, 'supplemental confirm helper');
react = replaceOnce(react,
  "  async function confirmAttendance() {\n    if (!selectedClass || busy || !client || isDayLocked) return;",
  "  async function confirmAttendance() {\n    if (attendanceSource === 'supplemental') return confirmSupplementalSharedAttendance();\n    if (!selectedClass || busy || !client || isDayLocked) return;",
  'confirm branch');

react = replaceOnce(react,
  "    const { error: attachError } = await client.rpc('bes_set_extra_attendance_proof', {\n      p_session_id: session.id,\n      p_proof_path: proofPath,\n    });",
  "    let attachError = null;\n    if (attendanceSource === 'supplemental') {\n      try { await attachSupplementalProof(client, session.id, proofPath); } catch (error) { attachError = error; }\n    } else {\n      const result = await client.rpc('bes_set_extra_attendance_proof', { p_session_id: session.id, p_proof_path: proofPath });\n      attachError = result.error;\n    }",
  'proof attachment branch');

fs.writeFileSync(reactPath, react);

const apiPath = 'src/attendance/supplementalLearningApi.js';
let api = fs.readFileSync(apiPath, 'utf8');
api = replaceOnce(api,
  "  return rpc(client, 'bes_confirm_supplemental_attendance', {\n    p_session_id: input.sessionId,\n    p_participants: (input.participants || []).map((item) => ({ participantId: item.participantId || item.id, status: item.status || 'present', absenceReasonCode: item.absenceReasonCode || '', absenceNote: item.absenceNote || '' })),\n    p_session_note: input.sessionNote || '', p_proof_path: input.proofPath || '',\n  });",
  "  return rpc(client, 'bes_confirm_supplemental_attendance_v2', {\n    p_session_id: input.sessionId,\n    p_participants: (input.participants || []).map((item) => ({ participantId: item.participantId || item.id, status: item.status || 'present', absenceReasonCode: item.absenceReasonCode || '', absenceNote: item.absenceNote || '' })),\n    p_session_note: input.sessionNote || '',\n    p_proof_path: input.proofPath || '',\n    p_lesson_periods: Number(input.lessonPeriods || 1),\n    p_teacher_name: input.teacherName || '',\n    p_room: input.room || '',\n    p_start_time: input.startTime || null,\n    p_end_time: input.endTime || null,\n  });",
  'supplemental confirm v2');
fs.writeFileSync(apiPath, api);

fs.writeFileSync('src/supplementalAttendanceQuickBootstrap.js', `// Học bổ sung rollcall now uses the canonical React attendance surface.\n// Keep this module as a compatibility side-effect import; launch events are handled\n// by GlobalAttendanceNavigationTab so legacy entry points continue to work.\nexport {};\n`);

console.log('Applied supplemental native rollcall GREEN patch.');
