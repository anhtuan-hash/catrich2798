import React, { useEffect, useMemo, useState } from 'react';
import { summarizeAttendance, groupGradeComparisons } from '../../studentSupport/studentSupportAnalytics.js';
import { loadStudent360Facts } from '../../studentSupport/studentSupportSources.js';

function formatDate(value, language) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(date);
}

function deltaLabel(delta, vi) {
  if (delta == null) return vi ? 'Chưa đủ dữ liệu' : 'Insufficient data';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}`;
}

export default function StudentSupportStudentProfile({
  studentRef = '',
  workspaceId = '',
  alerts = [],
  cases = [],
  language = 'vi',
}) {
  const vi = language === 'vi';
  const [facts, setFacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentRef) {
      setFacts(null);
      setError('');
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError('');
    loadStudent360Facts({ student: { studentRef }, workspaceId })
      .then((next) => { if (alive) setFacts(next); })
      .catch((nextError) => {
        if (!alive) return;
        setFacts(null);
        setError(nextError?.message || (vi ? 'Không thể tải hồ sơ học sinh.' : 'Unable to load student profile.'));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [studentRef, workspaceId, vi]);

  const attendance = useMemo(() => summarizeAttendance(facts?.attendance || []), [facts?.attendance]);
  const gradeGroups = useMemo(() => groupGradeComparisons(facts?.grades || [], 3), [facts?.grades]);
  const studentAlerts = useMemo(
    () => alerts.filter((row) => row.student_ref === studentRef && row.status !== 'ARCHIVED'),
    [alerts, studentRef],
  );
  const studentCases = useMemo(
    () => cases.filter((row) => row.student_ref === studentRef && !row.archived_at),
    [cases, studentRef],
  );

  if (!studentRef) {
    return <section className="student-support-state-card">{vi ? 'Dùng ô tìm kiếm để chọn học sinh.' : 'Use search to select a student.'}</section>;
  }
  if (loading) {
    return <section className="student-support-state-card">{vi ? 'Đang tải Student 360…' : 'Loading Student 360…'}</section>;
  }
  if (error) {
    return <section className="student-support-state-card is-error">{error}</section>;
  }
  if (!facts) return null;

  const student = facts.student || {};
  return (
    <section className="student-support-profile" aria-label={vi ? 'Hồ sơ học sinh 360' : 'Student 360 profile'}>
      <header className="student-support-profile-header">
        <div>
          <span>{vi ? 'Hồ sơ học sinh 360°' : 'Student 360°'}</span>
          <h2>{student.fullName || student.studentRef}</h2>
          <p>{[student.code, student.className, student.schoolYear].filter(Boolean).join(' · ') || student.studentRef}</p>
        </div>
        <div className="student-support-profile-id">
          <small>Student ref</small>
          <strong>{student.studentRef}</strong>
        </div>
      </header>

      <div className="student-support-profile-grid">
        <article className="student-support-profile-card">
          <h3>{vi ? 'Thông tin chung' : 'General information'}</h3>
          <dl className="student-support-key-values">
            <div><dt>{vi ? 'Họ tên' : 'Name'}</dt><dd>{student.fullName || '—'}</dd></div>
            <div><dt>{vi ? 'Mã học sinh' : 'Student code'}</dt><dd>{student.code || '—'}</dd></div>
            <div><dt>{vi ? 'Lớp' : 'Class'}</dt><dd>{student.className || '—'}</dd></div>
            <div><dt>{vi ? 'Năm học' : 'School year'}</dt><dd>{student.schoolYear || '—'}</dd></div>
            <div><dt>{vi ? 'Trạng thái hồ sơ nguồn' : 'Source lifecycle'}</dt><dd>{student.lifecycleStatus || 'active'}</dd></div>
          </dl>
        </article>

        <article className="student-support-profile-card">
          <h3>{vi ? 'Chuyên cần' : 'Attendance'}</h3>
          <div className="student-support-mini-stats">
            <div><strong>{attendance.total}</strong><span>{vi ? 'Bản ghi' : 'Records'}</span></div>
            <div><strong>{attendance.present}</strong><span>{vi ? 'Có mặt' : 'Present'}</span></div>
            <div><strong>{attendance.absent}</strong><span>{vi ? 'Vắng' : 'Absent'}</span></div>
            <div><strong>{attendance.late}</strong><span>{vi ? 'Đi trễ' : 'Late'}</span></div>
          </div>
          <div className="student-support-compact-list">
            {(facts.attendance || []).slice(0, 8).map((row, index) => (
              <div key={`${row.date}-${row.sessionName}-${index}`}>
                <span>{formatDate(row.date, language)}</span>
                <strong>{row.status}</strong>
                <small>{row.sessionName || (row.periodNo ? `${vi ? 'Tiết' : 'Period'} ${row.periodNo}` : '')}</small>
              </div>
            ))}
            {!facts.attendance?.length ? <p>{vi ? 'Chưa có dữ liệu chuyên cần.' : 'No attendance data.'}</p> : null}
          </div>
        </article>
      </div>

      <article className="student-support-profile-card student-support-grade-card">
        <div className="student-support-section-heading">
          <div>
            <h3>{vi ? 'Kết quả học tập' : 'Learning results'}</h3>
            <p>{vi ? 'So sánh trung bình 3 điểm gần nhất với 3 điểm liền trước; chỉ hiển thị khi đủ 6 điểm trong cùng môn.' : 'Compares the latest 3 scores with the preceding 3; shown only when the same subject has at least 6 scores.'}</p>
          </div>
        </div>
        {!gradeGroups.length ? <div className="student-support-empty-inline">{vi ? 'Chưa có dữ liệu điểm.' : 'No grade data.'}</div> : (
          <div className="student-support-grade-grid">
            {gradeGroups.map(({ subject, rows, comparison }) => {
              const latest = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
              return (
                <section className="student-support-subject-card" key={subject}>
                  <h4>{subject}</h4>
                  <div className="student-support-subject-main">
                    <div><small>{vi ? 'Điểm gần nhất' : 'Latest'}</small><strong>{latest?.score ?? '—'}</strong></div>
                    <div><small>{vi ? 'TB 3 gần nhất' : 'Recent 3 avg.'}</small><strong>{comparison.recentAverage ?? '—'}</strong></div>
                    <div><small>{vi ? 'TB 3 trước' : 'Previous 3 avg.'}</small><strong>{comparison.previousAverage ?? '—'}</strong></div>
                    <div><small>{vi ? 'Chênh lệch' : 'Difference'}</small><strong>{deltaLabel(comparison.delta, vi)}</strong></div>
                  </div>
                  {!comparison.hasEnoughData ? <p>{vi ? 'Chưa đủ 6 điểm để so sánh hai cửa sổ.' : 'At least 6 scores are required for window comparison.'}</p> : null}
                </section>
              );
            })}
          </div>
        )}
      </article>

      <div className="student-support-profile-grid">
        <article className="student-support-profile-card">
          <h3>{vi ? 'Ghi nhận giáo viên' : 'Teacher observations'}</h3>
          <div className="student-support-compact-list">
            {(facts.observations || []).slice(0, 10).map((row) => (
              <div key={row.id}>
                <span>{formatDate(row.observation_date, language)}</span>
                <strong>{row.observation_type}</strong>
                <small>{[row.subject_name, row.period_label].filter(Boolean).join(' · ')}</small>
              </div>
            ))}
            {!facts.observations?.length ? <p>{vi ? 'Chưa có ghi nhận Student Support.' : 'No Student Support observations yet.'}</p> : null}
          </div>
        </article>

        <article className="student-support-profile-card">
          <h3>{vi ? 'Cảnh báo & hồ sơ hỗ trợ' : 'Alerts & support cases'}</h3>
          <div className="student-support-mini-stats is-two">
            <div><strong>{studentAlerts.length}</strong><span>{vi ? 'Cảnh báo' : 'Alerts'}</span></div>
            <div><strong>{studentCases.length}</strong><span>{vi ? 'Hồ sơ' : 'Cases'}</span></div>
          </div>
          <div className="student-support-compact-list">
            {studentCases.slice(0, 6).map((row) => (
              <div key={row.id}>
                <span>{row.status}</span>
                <strong>{row.title || row.category}</strong>
                <small>{row.category}</small>
              </div>
            ))}
            {!studentCases.length ? <p>{vi ? 'Chưa có hồ sơ hỗ trợ đang mở.' : 'No support cases are currently available.'}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
