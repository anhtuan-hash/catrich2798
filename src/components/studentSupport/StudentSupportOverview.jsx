import React from 'react';

const CARDS = [
  ['monitoredStudents', 'Học sinh đang theo dõi', 'Monitored students'],
  ['newAlerts', 'Cảnh báo mới', 'New alerts'],
  ['activeCases', 'Hồ sơ đang xử lý', 'Active cases'],
  ['followUpDue', 'Đến hạn theo dõi', 'Follow-up due'],
  ['resolvedCases', 'Đã cải thiện', 'Resolved'],
  ['closedCases', 'Đã đóng', 'Closed'],
];

export default function StudentSupportOverview({
  summary = {},
  students = [],
  studentsLoading = false,
  studentsError = '',
  language = 'vi',
  onOpenStudent,
  onOpenAlerts,
  onOpenCases,
}) {
  const vi = language === 'vi';
  const roster = Array.isArray(students) ? students : [];

  return (
    <section className="student-support-overview" aria-label={vi ? 'Tổng quan hỗ trợ học sinh' : 'Student support overview'}>
      <div className="student-support-summary-grid">
        {CARDS.map(([key, viLabel, enLabel]) => (
          <article className="student-support-summary-card" key={key}>
            <strong>{Number(summary[key] || 0)}</strong>
            <span>{vi ? viLabel : enLabel}</span>
          </article>
        ))}
      </div>
      <div className="student-support-quick-actions">
        <button type="button" onClick={onOpenAlerts}>{vi ? 'Xem cảnh báo cần xử lý' : 'Review alerts'}</button>
        <button type="button" className="secondary" onClick={onOpenCases}>{vi ? 'Xem hồ sơ hỗ trợ' : 'Open support cases'}</button>
      </div>

      <div className="student-support-roster-preview">
        <div className="student-support-roster-preview__header">
          <div>
            <strong>{vi ? 'Học sinh trong phạm vi của bạn' : 'Students in your scope'}</strong>
            <p>{vi ? 'Dữ liệu trực tiếp từ Chủ nhiệm/Sổ điểm. Chọn học sinh để mở hồ sơ Student 360.' : 'Live Homeroom/Gradebook data. Select a student to open Student 360.'}</p>
          </div>
          {roster.length ? <span>{vi ? `${roster.length} học sinh đầu tiên` : `First ${roster.length} students`}</span> : null}
        </div>

        {studentsLoading ? <p className="student-support-roster-state">{vi ? 'Đang tải danh sách học sinh…' : 'Loading students…'}</p> : null}
        {!studentsLoading && studentsError ? <p className="student-support-roster-state is-error">{studentsError}</p> : null}
        {!studentsLoading && !studentsError && roster.length === 0 ? (
          <p className="student-support-roster-state">{vi ? 'Chưa tìm thấy học sinh trong phạm vi tài khoản này.' : 'No students were found in this account scope.'}</p>
        ) : null}
        {!studentsLoading && !studentsError && roster.length ? (
          <div className="student-support-roster-grid">
            {roster.map((row) => (
              <button
                type="button"
                className="student-support-roster-card"
                key={`${row.workspace_id || ''}:${row.student_ref || row.code || ''}`}
                onClick={() => onOpenStudent?.(row)}
              >
                <strong>{row.full_name || row.student_ref || row.code}</strong>
                <span>{[row.code, row.class_name, row.school_year].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
