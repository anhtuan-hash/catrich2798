from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected source fragment not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


def append_once(path, marker, content):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if marker in text:
        return
    file.write_text(text.rstrip() + '\n\n' + content.strip() + '\n', encoding='utf-8')


nav = 'src/components/GlobalAttendanceNavigationTab.jsx'
replace_once(nav, '''  ABSENCE_REASON_OPTIONS,
  ATTENDANCE_SUBJECT_HUB,
  attendanceSubjectKey,
  attendanceSummary,
  buildAttendanceDraft,
''', '''  ABSENCE_REASON_OPTIONS,
  ATTENDANCE_STATUS,
  ATTENDANCE_SUBJECT_HUB,
  attendanceStatusLabel,
  attendanceSubjectKey,
  attendanceSummary,
  buildAttendanceDraft,
  normalizeAttendanceStatus,
''')

replace_once(nav, '''        row.present = record.status !== 'absent';
        row.absence_reason_code = record.absence_reason_code || '';
        row.absence_note = record.absence_note || '';
''', '''        row.status = normalizeAttendanceStatus(record.status);
        row.present = row.status !== ATTENDANCE_STATUS.ABSENT;
        row.absence_reason_code = record.absence_reason_code || '';
        row.absence_note = record.absence_note || '';
''')

replace_once(nav, '''  const invalidAbsentRows = useMemo(() => draft.filter((row) => row.present === false && (
''', '''  const invalidAbsentRows = useMemo(() => draft.filter((row) => row.status === ATTENDANCE_STATUS.ABSENT && (
''')

replace_once(nav, '''  function toggleAbsent(memberKeyValue) {
    if (isDayLocked) return;
    setDraft((current) => current.map((row) => {
      if (row.member_key !== memberKeyValue) return row;
      if (row.present === false) return { ...row, present: true, absence_reason_code: '', absence_note: '' };
      return { ...row, present: false, absence_reason_code: '', absence_note: '' };
    }));
  }
''', '''  function setAttendanceStatus(memberKeyValue, nextStatus) {
    if (isDayLocked) return;
    setDraft((current) => current.map((row) => {
      if (row.member_key !== memberKeyValue) return row;
      const status = normalizeAttendanceStatus(nextStatus);
      const absent = status === ATTENDANCE_STATUS.ABSENT;
      return {
        ...row,
        status,
        present: !absent,
        absence_reason_code: absent ? row.absence_reason_code : '',
        absence_note: absent ? row.absence_note : '',
      };
    }));
  }
''')

replace_once(nav, '''    const absenceDetails = draft.filter((row) => row.present === false).map((row) => ({
      member_key: row.member_key,
      reason_code: row.absence_reason_code,
      note: String(row.absence_note || '').trim(),
    }));
    setBusy(true);
''', '''    const absenceDetails = draft.filter((row) => row.status === ATTENDANCE_STATUS.ABSENT).map((row) => ({
      member_key: row.member_key,
      reason_code: row.absence_reason_code,
      note: String(row.absence_note || '').trim(),
    }));
    const lateMemberKeys = draft
      .filter((row) => row.status === ATTENDANCE_STATUS.LATE)
      .map((row) => row.member_key);
    setBusy(true);
''')

replace_once(nav, '''        p_teaching_time_range: teachingTimeRange.trim(),
      });
''', '''        p_teaching_time_range: teachingTimeRange.trim(),
        p_late_member_keys: lateMemberKeys,
      });
''')

replace_once(nav, '''      setNotice(`Đã chốt điểm danh ${selectedClass.class_name} ngày ${formatDate(attendanceDate)} · GV ${sessionTeacher} · ${summary.present}/${summary.total} có mặt.${proofSaved ? ' · Đã lưu ảnh minh chứng.' : ''}`);
''', '''      setNotice(`Đã chốt điểm danh ${selectedClass.class_name} ngày ${formatDate(attendanceDate)} · GV ${sessionTeacher} · ${summary.present}/${summary.total} có mặt · ${summary.late} đi trễ.${proofSaved ? ' · Đã lưu ảnh minh chứng.' : ''}`);
''')

replace_once(nav, '''<div className="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Vắng</span></div>''', '''<div className="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Trạng thái</span></div>''')

replace_once(nav, '''className={`att-m3-roster-entry ${member.present === false ? 'is-absent' : ''}`}''', '''className={`att-m3-roster-entry ${member.status === ATTENDANCE_STATUS.ABSENT ? 'is-absent' : member.status === ATTENDANCE_STATUS.LATE ? 'is-late' : 'is-present'}`}''')

replace_once(nav, '''<input type="checkbox" disabled={isDayLocked} checked={member.present === false} onChange={() => toggleAbsent(member.member_key)} aria-label={`Đánh dấu ${member.student_full_name} vắng`} />''', '''<div className="att-m3-attendance-status" role="group" aria-label={`Trạng thái ${member.student_full_name}`}>
                          <button type="button" data-status="present" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.PRESENT ? 'is-active is-present' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.PRESENT)}>Có mặt</button>
                          <button type="button" data-status="late" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.LATE ? 'is-active is-late' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.LATE)}>Đi trễ</button>
                          <button type="button" data-status="absent" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.ABSENT ? 'is-active is-absent' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.ABSENT)}>Vắng</button>
                        </div>''')

replace_once(nav, '''</label>{member.present === false ? <div className="att-m3-absence-detail">''', '''</label>{member.status === ATTENDANCE_STATUS.ABSENT ? <div className="att-m3-absence-detail">''')

replace_once(nav, '''  const selectedAbsentRecords = records.filter((record) => record.status === 'absent');
''', '''  const selectedAbsentRecords = records.filter((record) => record.status === ATTENDANCE_STATUS.ABSENT);
  const selectedLateRecords = records.filter((record) => record.status === ATTENDANCE_STATUS.LATE);
''')

replace_once(nav, '''<div className="attendance-history-stat-grid"><article><b>{selectedSession.total_students}</b><span>Sĩ số</span></article><article className="is-present"><b>{selectedSession.present_count}</b><span>Có mặt</span></article><article className="is-absent"><b>{selectedSession.absent_count}</b><span>Vắng</span></article><article className="attendance-history-rate-card"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span></article></div>''', '''<div className="attendance-history-stat-grid"><article><b>{selectedSession.total_students}</b><span>Sĩ số</span></article><article className="is-present"><b>{selectedSession.present_count}</b><span>Có mặt (gồm đi trễ)</span></article><article className="is-late"><b>{selectedLateRecords.length}</b><span>Đi trễ</span></article><article className="is-absent"><b>{selectedSession.absent_count}</b><span>Vắng</span></article><article className="attendance-history-rate-card"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span></article></div>''')

replace_once(nav, '''                  <section className="attendance-history-absent-section"><header><div><strong>Danh sách học sinh vắng</strong>''', '''                  {selectedLateRecords.length ? <section className="attendance-history-late-section"><header><div><strong>Danh sách học sinh đi trễ</strong><span>{selectedLateRecords.length} học sinh</span></div></header><div className="attendance-late-list">{selectedLateRecords.map((record, index) => <div key={record.id}><span>{index + 1}</span><div><b>{record.student_full_name}</b><small>{record.student_code || 'Không có mã HS'} · {attendanceStatusLabel(record.status)} · vẫn tính có mặt</small></div><em>{record.school_class_name || '—'}</em></div>)}</div></section> : null}

                  <section className="attendance-history-absent-section"><header><div><strong>Danh sách học sinh vắng</strong>''')


adjust = 'src/attendancePostConfirmEditBootstrap.js'
replace_once(adjust, '''    status: record.status === 'absent' ? 'absent' : 'present',
''', '''    status: ['present', 'late', 'absent'].includes(record.status) ? record.status : 'present',
''')

replace_once(adjust, '''  const absent = source.filter((item) => item.status === 'absent').length;
  return { total, absent, present: Math.max(0, total - absent) };
''', '''  const absent = source.filter((item) => item.status === 'absent').length;
  const late = source.filter((item) => item.status === 'late').length;
  return { total, absent, late, present: Math.max(0, total - absent) };
''')

replace_once(adjust, '''    const absent = record.status === 'absent';
''', '''    const absent = record.status === 'absent';
    const late = record.status === 'late';
''')

replace_once(adjust, '''class="bes-post-confirm-student ${absent ? 'is-absent' : 'is-present'}"''', '''class="bes-post-confirm-student ${absent ? 'is-absent' : late ? 'is-late' : 'is-present'}"''')

replace_once(adjust, '''        <button type="button" data-action="status" data-status="present" class="${!absent ? 'is-active' : ''}">Có mặt</button>
        <button type="button" data-action="status" data-status="absent" class="${absent ? 'is-active' : ''}">Vắng</button>
''', '''        <button type="button" data-action="status" data-status="present" class="${record.status === 'present' ? 'is-active' : ''}">Có mặt</button>
        <button type="button" data-action="status" data-status="late" class="${late ? 'is-active is-late' : ''}">Đi trễ</button>
        <button type="button" data-action="status" data-status="absent" class="${absent ? 'is-active' : ''}">Vắng</button>
''')

replace_once(adjust, '''Nếu học sinh vừa vào trễ, chuyển từ Vắng sang Có mặt rồi lưu điều chỉnh.''', '''Đi trễ được lưu thành trạng thái riêng và vẫn được tính là có mặt.''')
replace_once(adjust, '''<em>${summary.absent} vắng</em>''', '''<em>${summary.late} đi trễ · ${summary.absent} vắng</em>''')
replace_once(adjust, '''Học sinh vào trễ: chuyển <b>Vắng</b> → <b>Có mặt</b>. Hệ thống lưu người sửa, thời gian và trạng thái trước/sau.''', '''Chọn đúng trạng thái <b>Có mặt</b>, <b>Đi trễ</b> hoặc <b>Vắng</b>. Đi trễ vẫn tính là có mặt; hệ thống lưu người sửa, thời gian và trạng thái trước/sau.''')

replace_once(adjust, '''    record.status = button.dataset.status === 'absent' ? 'absent' : 'present';
    if (record.status === 'absent' && !record.absence_reason_code) record.absence_reason_code = 'unspecified';
    if (record.status === 'present') {
      record.absence_reason_code = '';
      record.absence_note = '';
    }
''', '''    const nextStatus = button.dataset.status;
    record.status = ['present', 'late', 'absent'].includes(nextStatus) ? nextStatus : 'present';
    if (record.status === 'absent' && !record.absence_reason_code) record.absence_reason_code = 'unspecified';
    if (record.status === 'present' || record.status === 'late') {
      record.absence_reason_code = '';
      record.absence_note = '';
    }
''')


report = 'src/utils/attendanceReport.js'
replace_once(report, '''  const completedIds = new Set(completed.map((session) => String(session.id)));
  const presentInstances = completed.reduce((sum, session) => sum + session.present_count, 0);
''', '''  const completedIds = new Set(completed.map((session) => String(session.id)));
  const lateCountBySession = new Map();
  records.forEach((record) => {
    const sessionId = String(record?.session_id || '');
    if (record?.status !== 'late' || !completedIds.has(sessionId)) return;
    lateCountBySession.set(sessionId, (lateCountBySession.get(sessionId) || 0) + 1);
  });
  const lateInstances = [...lateCountBySession.values()].reduce((sum, count) => sum + count, 0);
  const presentInstances = completed.reduce((sum, session) => sum + session.present_count, 0);
''')

replace_once(report, '''      present_instances: 0,
      absent_instances: 0,
''', '''      present_instances: 0,
      late_instances: 0,
      absent_instances: 0,
''')

replace_once(report, '''    row.present_instances += session.present_count;
    row.absent_instances += session.absent_count;
''', '''    row.present_instances += session.present_count;
    row.late_instances += lateCountBySession.get(String(session.id)) || 0;
    row.absent_instances += session.absent_count;
''')

replace_once(report, '''      present_instances: row.present_instances,
      absent_instances: row.absent_instances,
''', '''      present_instances: row.present_instances,
      late_instances: row.late_instances,
      absent_instances: row.absent_instances,
''')

replace_once(report, '''      present_count: session.session_status === 'cancelled' ? null : session.present_count,
      absent_count: session.session_status === 'cancelled' ? null : session.absent_count,
''', '''      present_count: session.session_status === 'cancelled' ? null : session.present_count,
      late_count: session.session_status === 'cancelled' ? null : (lateCountBySession.get(String(session.id)) || 0),
      absent_count: session.session_status === 'cancelled' ? null : session.absent_count,
''')

replace_once(report, '''      presentInstances,
      absentInstances,
''', '''      presentInstances,
      lateInstances,
      absentInstances,
''')


monthly = 'src/components/attendance/AttendanceMonthlyReport.jsx'
replace_once(monthly, '''<small>{pct(report.metrics.attendanceRate)} chuyên cần</small>''', '''<small>{pct(report.metrics.attendanceRate)} chuyên cần · {report.metrics.lateInstances} đi trễ</small>''')
replace_once(monthly, '''<small>{row.present_instances} có mặt · {row.absent_instances} vắng · {pct(row.attendance_rate)}</small>''', '''<small>{row.present_instances} có mặt · {row.late_instances} đi trễ · {row.absent_instances} vắng · {pct(row.attendance_rate)}</small>''')
replace_once(monthly, '''<th>Sĩ số</th><th>Có mặt</th><th>Vắng</th><th>Tỷ lệ</th>''', '''<th>Sĩ số</th><th>Có mặt</th><th>Đi trễ</th><th>Vắng</th><th>Tỷ lệ</th>''')
replace_once(monthly, '''<td>{row.total_students ?? '—'}</td><td>{row.present_count ?? '—'}</td><td>{row.absent_count ?? '—'}</td><td>{row.attendance_rate === null ? '—' : pct(row.attendance_rate)}</td>''', '''<td>{row.total_students ?? '—'}</td><td>{row.present_count ?? '—'}</td><td>{row.late_count ?? '—'}</td><td>{row.absent_count ?? '—'}</td><td>{row.attendance_rate === null ? '—' : pct(row.attendance_rate)}</td>''')


css = 'src/components/attendance/AttendanceMaterial3.css'
append_once(css, '.att-m3-attendance-status{', '''
/* First-class attendance status: present / late / absent. */
.att-m3-roster-entry>label{grid-template-columns:42px minmax(0,1fr) 120px minmax(225px,auto)!important}
.att-m3-attendance-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:4px;border-radius:14px;background:var(--att-m3-surface-container-high)}
.att-m3-attendance-status button{min-height:32px;border:0;border-radius:10px;padding:0 8px;background:transparent;color:var(--att-m3-on-variant);font:inherit;font-size:9px;font-weight:900;cursor:pointer;white-space:nowrap}
.att-m3-attendance-status button.is-active.is-present{background:var(--att-m3-success-container);color:var(--att-m3-success)}
.att-m3-attendance-status button.is-active.is-late{background:var(--att-m3-warning-container);color:var(--att-m3-warning)}
.att-m3-attendance-status button.is-active.is-absent{background:var(--att-m3-danger-container);color:var(--att-m3-danger)}
.att-m3-attendance-status button:disabled{cursor:default;opacity:.75}
.att-m3-roster-entry.is-late{background:color-mix(in srgb,var(--att-m3-warning-container) 42%,var(--att-m3-surface))}
.attendance-history-stat-grid>article.is-late{background:var(--att-m3-warning-container)!important;color:var(--att-m3-warning)!important}
.attendance-history-late-section{margin:14px 0;padding:14px;border-radius:18px;background:var(--att-m3-warning-container);color:var(--att-m3-warning)}
.attendance-history-late-section header>div{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.attendance-late-list{display:grid;gap:6px}
.attendance-late-list>div{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 11px;border-radius:13px;background:color-mix(in srgb,var(--att-m3-surface) 78%,var(--att-m3-warning-container))}
.attendance-late-list b,.attendance-late-list small{display:block}
.attendance-late-list small{margin-top:2px;font-size:9px}
.attendance-late-list em{font-size:10px;font-style:normal;font-weight:850}
@media(max-width:760px){.att-m3-roster-entry>label{grid-template-columns:34px minmax(0,1fr) 64px!important}.att-m3-attendance-status{grid-column:1/-1;margin-left:34px}.attendance-history-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
''')

post_css = 'src/styles/AttendancePostConfirmEdit.css'
append_once(post_css, '.bes-post-confirm-student.is-late{', '''
.bes-post-confirm-student.is-late{background:color-mix(in srgb,#ffddb8 42%,#fff)}
.bes-post-confirm-status-toggle{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.bes-post-confirm-status-toggle button.is-late{background:#ffddb8!important;color:#8b5000!important}
''')

print('Tardy frontend patch applied')
