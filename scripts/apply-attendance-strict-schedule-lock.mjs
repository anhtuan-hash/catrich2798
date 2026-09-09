import fs from 'node:fs';

const file = 'src/components/GlobalAttendanceNavigationTab.jsx';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing source pattern: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Source pattern is not unique: ${label}`);
  source = `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

replaceOnce(
  "  const isFutureDate = attendanceDate > today;\n  const isDayLocked = Boolean(daySession);\n",
  "  const isFutureDate = attendanceDate > today;\n  const isDayLocked = Boolean(daySession);\n  const isScheduleLocked = Boolean(selectedClass && attendanceDate && !isExtraClassScheduledOnDate(selectedClass, attendanceDate));\n",
  'derive schedule lock',
);

source = source.replaceAll('if (isDayLocked) return;', 'if (isDayLocked || isScheduleLocked) return;');

replaceOnce(
  "  function chooseProofFile(file) {\n    if (!file) return;\n",
  "  function chooseProofFile(file) {\n    if (!file || isScheduleLocked) return;\n",
  'proof schedule guard',
);

replaceOnce(
  "    if (!attendanceDate || isFutureDate) {\n      setError('Ngày điểm danh không được ở tương lai theo giờ Việt Nam.');\n      return;\n    }\n    if (!sessionTeacher) {",
  "    if (!attendanceDate || isFutureDate) {\n      setError('Ngày điểm danh không được ở tương lai theo giờ Việt Nam.');\n      return;\n    }\n    if (!isExtraClassScheduledOnDate(selectedClass, attendanceDate)) {\n      setError(`Lớp ${selectedClass.class_name} không có lịch học ngày ${formatDate(attendanceDate)}. Không thể điểm danh ngoài lịch.`);\n      return;\n    }\n    if (!sessionTeacher) {",
  'confirm schedule guard',
);

replaceOnce(
  "  async function cancelClassSession() {\n    if (!selectedClass || busy || !client || isDayLocked || isFutureDate) return;\n    const reason = cancellationReason.trim();",
  "  async function cancelClassSession() {\n    if (!selectedClass || busy || !client || isDayLocked || isFutureDate) return;\n    if (!isExtraClassScheduledOnDate(selectedClass, attendanceDate)) {\n      setError(`Lớp ${selectedClass.class_name} không có lịch học ngày ${formatDate(attendanceDate)}. Không thể hủy một buổi không có trong lịch.`);\n      return;\n    }\n    const reason = cancellationReason.trim();",
  'cancel schedule guard',
);

replaceOnce(
  "title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}>",
  "disabled={!scheduledForDate} aria-disabled={!scheduledForDate} title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}>",
  'disable off-schedule class card',
);

source = source.replaceAll('disabled={isDayLocked || !selectedTeacherOptions.length}', 'disabled={isDayLocked || isScheduleLocked || !selectedTeacherOptions.length}');
source = source.replaceAll('disabled={isDayLocked} className={lessonPeriods === value', 'disabled={isDayLocked || isScheduleLocked} className={lessonPeriods === value');
source = source.replaceAll('value={teachingRoom} disabled={isDayLocked}', 'value={teachingRoom} disabled={isDayLocked || isScheduleLocked}');
source = source.replaceAll('value={teachingTimeRange} disabled={isDayLocked}', 'value={teachingTimeRange} disabled={isDayLocked || isScheduleLocked}');
source = source.replaceAll('type="checkbox" disabled={isDayLocked}', 'type="checkbox" disabled={isDayLocked || isScheduleLocked}');
source = source.replaceAll('type="button" disabled={isDayLocked} className={member.absence_reason_code', 'type="button" disabled={isDayLocked || isScheduleLocked} className={member.absence_reason_code');
source = source.replaceAll('<input disabled={isDayLocked} value={member.absence_note', '<input disabled={isDayLocked || isScheduleLocked} value={member.absence_note');
source = source.replaceAll('hidden disabled={isDayLocked} onChange=', 'hidden disabled={isDayLocked || isScheduleLocked} onChange=');
source = source.replaceAll('className="att-m3-proof-picker" type="button" onClick=', 'className="att-m3-proof-picker" type="button" disabled={isScheduleLocked} onClick=');
source = source.replaceAll('<input disabled={isDayLocked} value={note}', '<input disabled={isDayLocked || isScheduleLocked} value={note}');
source = source.replaceAll('disabled={busy || isDayLocked || isFutureDate} onClick={() => setShowCancelSession', 'disabled={busy || isDayLocked || isScheduleLocked || isFutureDate} onClick={() => setShowCancelSession');
source = source.replaceAll('disabled={busy || !draft.length || isDayLocked || isFutureDate || !sessionTeacher', 'disabled={busy || !draft.length || isDayLocked || isScheduleLocked || isFutureDate || !sessionTeacher');

replaceOnce(
  "{isDayLocked ? <div className={`attendance-day-lock ${daySession.session_status === 'cancelled' ? 'is-cancelled' : ''}`}><Icon name=\"check\" size={18} /><div><b>{daySession.session_status === 'cancelled' ? `Đã hủy ${formatDate(daySession.attendance_date)}` : `Đã điểm danh ${formatDate(daySession.attendance_date)}`}</b><span>{daySession.session_status === 'cancelled' ? `${daySession.cancellation_reason} · 0 tiết` : `GV ${daySession.teacher_name} · ${String(daySession.lesson_periods || 1).replace('.', ',')} tiết · ${formatDateTime(daySession.checked_at)}`}</span></div></div> : <div className=\"attendance-day-open\"><b>Chưa chốt ngày này</b><span>{isFutureDate ? 'Không thể chọn ngày tương lai.' : 'Có thể điểm danh hoặc hủy buổi học.'}</span></div>}",
  "{isDayLocked ? <div className={`attendance-day-lock ${daySession.session_status === 'cancelled' ? 'is-cancelled' : ''}`}><Icon name=\"check\" size={18} /><div><b>{daySession.session_status === 'cancelled' ? `Đã hủy ${formatDate(daySession.attendance_date)}` : `Đã điểm danh ${formatDate(daySession.attendance_date)}`}</b><span>{daySession.session_status === 'cancelled' ? `${daySession.cancellation_reason} · 0 tiết` : `GV ${daySession.teacher_name} · ${String(daySession.lesson_periods || 1).replace('.', ',')} tiết · ${formatDateTime(daySession.checked_at)}`}</span></div></div> : isScheduleLocked ? <div className=\"attendance-day-open is-schedule-locked\"><b>Không có lịch học ngày {formatDate(attendanceDate)}</b><span>Lớp này bị khóa điểm danh theo lịch đã cấu hình.</span></div> : <div className=\"attendance-day-open\"><b>Chưa chốt ngày này</b><span>{isFutureDate ? 'Không thể chọn ngày tương lai.' : 'Có thể điểm danh hoặc hủy buổi học.'}</span></div>}",
  'schedule lock notice',
);

fs.writeFileSync(file, source);
console.log('Applied strict schedule lock to GlobalAttendanceNavigationTab.jsx');
