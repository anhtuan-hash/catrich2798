import fs from 'node:fs';

const path = 'src/components/GlobalAttendanceNavigationTab.jsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing anchor: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
`  useEffect(() => {
    if (open && allowed) loadAll();
  }, [open, allowed, runtime.ready, runtime.session?.user?.id]);`,
`  useEffect(() => {
    if (open && allowed && !String(selectedClassId || '').startsWith('supplemental:')) loadAll();
  }, [open, allowed, runtime.ready, runtime.session?.user?.id]);`,
'avoid loadAll overwrite',
);

replaceOnce(
`  useEffect(() => {
    if (!open || !allowed || !selectedClassId || !attendanceDate) return;
    loadDaySession(selectedClassId, attendanceDate);
  }, [open, allowed, selectedClassId, attendanceDate]);`,
`  useEffect(() => {
    if (!open || !allowed || !selectedClassId || !attendanceDate) return;
    if (String(selectedClassId || '').startsWith('supplemental:')) return;
    loadDaySession(selectedClassId, attendanceDate);
  }, [open, allowed, selectedClassId, attendanceDate]);`,
'avoid extra day loader',
);

replaceOnce(
`    if (daySession) {
      setSessionTeacher(daySession.teacher_name || '');
      setLessonPeriods(daySession.session_status === 'cancelled' ? 0 : Number(daySession.lesson_periods || 1));
      setTeachingRoom(daySession.teaching_room || '');
      setTeachingTimeRange(daySession.teaching_time_range || '');
      setNote(daySession.note || '');`,
`    if (daySession) {
      setSessionTeacher(daySession.teacher_name || '');
      setLessonPeriods(attendanceSource === 'supplemental'
        ? Number(daySession.lesson_periods || 1)
        : (daySession.session_status === 'cancelled' ? 0 : Number(daySession.lesson_periods || 1)));
      setTeachingRoom(attendanceSource === 'supplemental' ? (daySession.room || '') : (daySession.teaching_room || ''));
      setTeachingTimeRange(attendanceSource === 'supplemental'
        ? [daySession.start_time, daySession.end_time].filter(Boolean).join(' - ')
        : (daySession.teaching_time_range || ''));
      setNote(attendanceSource === 'supplemental' ? (daySession.session_note || '') : (daySession.note || ''));`,
'supplemental metadata state',
);

replaceOnce(
`  const isDayLocked = Boolean(daySession);`,
`  const supplementalSessionStatus = String(daySession?.status || daySession?.session_status || '').toLowerCase();
  const isDayLocked = attendanceSource === 'supplemental'
    ? Boolean(daySession && ['confirmed', 'cancelled'].includes(supplementalSessionStatus))
    : Boolean(daySession);`,
'source-aware lock',
);

replaceOnce(
`    try {
      const { data, error: cancelError } = await client.rpc('bes_cancel_extra_class_session', {`,
`    try {
      if (attendanceSource === 'supplemental') {
        const cancelled = await cancelSupplementalSession(client, selectedSessionId || daySession?.id, reason);
        const created = cancelled?.session || cancelled || { ...daySession, status: 'cancelled', cancellation_reason: reason };
        setDaySession(created);
        setShowCancelSession(false);
        clearProofSelection();
        setNotice(\`Đã hủy buổi học \${selectedClass.class_name} ngày \${formatDate(attendanceDate)}.\`);
        window.dispatchEvent(new CustomEvent('bes-supplemental-attendance-changed', { detail: { sessionId: selectedSessionId || daySession?.id } }));
        await loadHistory();
        return;
      }
      const { data, error: cancelError } = await client.rpc('bes_cancel_extra_class_session', {`,
'supplemental cancellation branch',
);

fs.writeFileSync(path, source);
console.log('Applied supplemental shared-rollcall runtime guards.');
