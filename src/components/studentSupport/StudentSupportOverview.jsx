import React from 'react';

const CARDS = [
  ['monitoredStudents', 'Học sinh đang theo dõi', 'Monitored students'],
  ['newAlerts', 'Cảnh báo mới', 'New alerts'],
  ['activeCases', 'Hồ sơ đang xử lý', 'Active cases'],
  ['followUpDue', 'Đến hạn theo dõi', 'Follow-up due'],
  ['resolvedCases', 'Đã cải thiện', 'Resolved'],
  ['closedCases', 'Đã đóng', 'Closed'],
];

export default function StudentSupportOverview({ summary = {}, language = 'vi', onOpenAlerts, onOpenCases }) {
  const vi = language === 'vi';
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
    </section>
  );
}
