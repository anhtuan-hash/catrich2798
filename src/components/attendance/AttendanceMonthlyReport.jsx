import React, { useEffect, useMemo, useState } from 'react';
import { buildAttendanceMonthlyReport, uniqueReportTeachers } from '../../utils/attendanceReport.js';
import { downloadAttendanceReportXlsx, printAttendanceReportPdf } from '../../utils/attendanceReportExport.js';
import './AttendanceMonthlyReport.css';

const REPORT_SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_name,attendance_date,checked_at,total_students,present_count,absent_count,note,session_status,lesson_periods,cancellation_reason';
const REPORT_RECORD_COLUMNS = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,recorded_at';

function monthBounds(month) {
  const [year, value] = String(month || '').split('-').map(Number);
  if (!year || !value) return null;
  const start = `${year}-${String(value).padStart(2, '0')}-01`;
  const nextDate = new Date(Date.UTC(year, value, 1));
  const next = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { start, next };
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1).replace('.', ',')}%`;
}

function periodLabel(value) {
  return `${String(Number(value || 0)).replace('.', ',')} tiết`;
}

export default function AttendanceMonthlyReport({ client, classes = [], month, onMonthChange, onError }) {
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [classId, setClassId] = useState('all');
  const [teacherName, setTeacherName] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const bounds = monthBounds(month);
      if (!client || !bounds) return;
      setLoading(true);
      try {
        const sessionResult = await client.from('bes_extra_attendance_sessions')
          .select(REPORT_SESSION_COLUMNS)
          .gte('attendance_date', bounds.start)
          .lt('attendance_date', bounds.next)
          .order('attendance_date', { ascending: true });
        if (sessionResult.error) throw sessionResult.error;
        const nextSessions = sessionResult.data || [];
        const completedIds = nextSessions.filter((row) => row.session_status !== 'cancelled').map((row) => row.id);
        let nextRecords = [];
        if (completedIds.length) {
          const recordResult = await client.from('bes_extra_attendance_records')
            .select(REPORT_RECORD_COLUMNS)
            .in('session_id', completedIds)
            .order('student_full_name', { ascending: true });
          if (recordResult.error) throw recordResult.error;
          nextRecords = recordResult.data || [];
        }
        if (!cancelled) { setSessions(nextSessions); setRecords(nextRecords); }
      } catch (error) {
        if (!cancelled) onError?.(error?.message || 'Không thể tải báo cáo điểm danh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [client, month]);

  const teachers = useMemo(() => uniqueReportTeachers(sessions, month), [sessions, month]);
  useEffect(() => { if (teacherName !== 'all' && !teachers.includes(teacherName)) setTeacherName('all'); }, [teachers.join('|')]);
  useEffect(() => { if (classId !== 'all' && !classes.some((row) => String(row.id) === String(classId))) setClassId('all'); }, [classes.length]);

  const report = useMemo(() => buildAttendanceMonthlyReport({ sessions, records, classes, month, classId, teacherName }), [sessions, records, classes, month, classId, teacherName]);
  const selectedClass = classes.find((row) => String(row.id) === String(classId));
  const exportFilters = {
    month,
    classLabel: classId === 'all' ? 'Tất cả lớp' : (selectedClass?.class_name || 'Lớp đã chọn'),
    teacherLabel: teacherName === 'all' ? 'Tất cả giáo viên' : teacherName,
  };

  return <section className="att-report-m3">
    <header className="att-report-m3__toolbar">
      <div><span className="att-report-m3__eyebrow">BÁO CÁO THÁNG</span><h2>Báo cáo điểm danh</h2><p>Chi tiết theo giáo viên và thống kê tổng số tiết thực dạy.</p></div>
      <div className="att-report-m3__filters">
        <label><span>Tháng</span><input type="month" value={month} onChange={(event) => onMonthChange?.(event.target.value)} /></label>
        <label><span>Lớp</span><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="all">Tất cả lớp</option>{classes.filter((row) => row.active !== false).map((row) => <option key={row.id} value={row.id}>{row.class_name}</option>)}</select></label>
        <label><span>Giáo viên</span><select value={teacherName} onChange={(event) => setTeacherName(event.target.value)}><option value="all">Tất cả giáo viên</option>{teachers.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
    </header>

    {loading ? <div className="att-report-m3__loading">Đang tổng hợp dữ liệu tháng…</div> : <>
      <div className="att-report-m3__metrics">
        <article className="is-blue"><span>Buổi đã dạy</span><b>{report.metrics.completedSessions}</b><small>Phiên đã chốt</small></article>
        <article className="is-green"><span>Lượt có mặt</span><b>{report.metrics.presentInstances}</b><small>{pct(report.metrics.attendanceRate)} chuyên cần</small></article>
        <article className="is-purple"><span>Tổng số tiết</span><b>{String(report.metrics.totalPeriods).replace('.', ',')}</b><small>Không tính buổi hủy</small></article>
        <article className="is-amber"><span>Buổi đã hủy</span><b>{report.metrics.cancelledSessions}</b><small>0 tiết / buổi</small></article>
      </div>

      <section className="att-report-m3__surface">
        <div className="att-report-m3__section-head"><div><h3>Theo giáo viên</h3><p>Tổng số buổi và số tiết trong tháng.</p></div></div>
        <div className="att-report-m3__teacher-grid">{report.teacherRows.map((row) => <article key={row.teacher_name}><strong>{row.teacher_name}</strong><b>{periodLabel(row.total_periods)}</b><span>{row.completed_sessions} buổi · {row.distinct_classes} lớp</span><small>{row.present_instances} có mặt · {row.absent_instances} vắng</small></article>)}{!report.teacherRows.length ? <div className="att-report-m3__empty">Chưa có buổi dạy phù hợp bộ lọc.</div> : null}</div>
      </section>

      <section className="att-report-m3__surface">
        <div className="att-report-m3__section-head"><div><h3>Chi tiết điểm danh theo từng giáo viên</h3><p>Mỗi dòng là một ngày đã được xử lý.</p></div><div className="att-report-m3__export"><button type="button" onClick={() => downloadAttendanceReportXlsx(report, exportFilters)}>Xuất Excel</button><button className="is-primary" type="button" onClick={() => { try { printAttendanceReportPdf(report, exportFilters); } catch (error) { onError?.(error.message); } }}>Xuất PDF báo cáo</button></div></div>
        <div className="att-report-m3__table-wrap"><table><thead><tr><th>Ngày</th><th>Lớp / môn</th><th>Giáo viên</th><th>Trạng thái</th><th>Số tiết</th><th>Có mặt</th><th>Vắng</th><th>Ghi chú / lý do</th></tr></thead><tbody>{report.sessionRows.map((row) => <tr key={row.id} className={row.session_status === 'cancelled' ? 'is-cancelled' : ''}><td>{row.attendance_date}</td><td><b>{row.class_name}</b><small>{row.subject}</small></td><td>{row.teacher_name || '—'}</td><td><span className={`att-report-m3__status is-${row.session_status}`}>{row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh'}</span></td><td>{row.session_status === 'cancelled' ? '0' : String(row.lesson_periods).replace('.', ',')}</td><td>{row.present_count ?? '—'}</td><td>{row.absent_count ?? '—'}</td><td>{row.note || '—'}</td></tr>)}{!report.sessionRows.length ? <tr><td colSpan="8" className="att-report-m3__empty">Không có dữ liệu trong tháng này.</td></tr> : null}</tbody></table></div>
      </section>
    </>}
  </section>;
}
