import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildAttendanceReport, normalizeSupplementalReportData, uniqueReportTeachers } from '../../utils/attendanceReport.js';
import { downloadAttendanceReportXlsx, printAttendanceReportPdf } from '../../utils/attendanceReportExport.js';
import './AttendanceMonthlyReport.css';

const REPORT_SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_name,attendance_date,checked_at,checked_by,checked_by_name,total_students,present_count,absent_count,note,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range';
const REPORT_RECORD_COLUMNS = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,recorded_at,absence_reason_code,absence_note';
const REPORT_CHANGE_COLUMNS = 'id,session_id,record_id,class_id,member_key,student_full_name,change_kind,changed_by,changed_by_name,changed_at,old_status,new_status,old_absence_reason_code,new_absence_reason_code,old_absence_note,new_absence_note,session_note_before,session_note_after';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const REPORT_ICON_PATHS = {
  chart: <><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" /><path d="m3 13 5-5 4 3 8-8" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 12h18" /></>,
  note: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 11h6M9 15h6" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
  download: <><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M5 15v4h14v-4" /></>,
  teacher: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="M17 8h4M19 6v4" /></>,
  absent: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 10-4.5" /><path d="m16 16 5 5m0-5-5 5" /></>,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
};

function ReportIcon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{REPORT_ICON_PATHS[name] || REPORT_ICON_PATHS.chart}</svg>;
}

function monthBounds(month) {
  const [year, value] = String(month || '').split('-').map(Number);
  if (!year || !value) return null;
  const start = `${year}-${String(value).padStart(2, '0')}-01`;
  const nextDate = new Date(Date.UTC(year, value, 1));
  const next = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { start, next };
}

function vietnamDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

function formatCheckedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1).replace('.', ',')}%`;
}

function periodLabel(value) {
  return `${String(Number(value || 0)).replace('.', ',')} tiết`;
}

function classTypeLabel(value) {
  return value === 'gifted' ? 'Bồi dưỡng HSG' : value === 'remedial' ? 'Phụ đạo' : value === 'supplemental' ? 'Học bổ sung' : '—';
}

function teacherInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'GV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function readStored(key, fallback = '') {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function remember(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* optional convenience only */ }
}

function automaticRemarks(report) {
  if (!report.sessionRows.length) return 'Không có dữ liệu phù hợp bộ lọc trong kỳ báo cáo.';
  const attendance = pct(report.metrics.attendanceRate);
  const cancelled = report.metrics.cancelledSessions ? ` Có ${report.metrics.cancelledSessions} buổi đã hủy.` : '';
  return `Trong kỳ báo cáo có ${report.metrics.completedSessions} buổi đã dạy, tổng ${String(report.metrics.totalPeriods).replace('.', ',')} tiết; tỷ lệ chuyên cần đạt ${attendance}.${cancelled}`;
}

export default function AttendanceMonthlyReport({ client, classes = [], month, onMonthChange, onError, includeSupplemental = false }) {
  const [mode, setMode] = useState('month');
  const [date, setDate] = useState(vietnamDateString());
  const [sessions, setSessions] = useState([]);
  const [supplementalClasses, setSupplementalClasses] = useState([]);
  const [activityType, setActivityType] = useState('all');
  const [records, setRecords] = useState([]);
  const [changes, setChanges] = useState([]);
  const [classId, setClassId] = useState('all');
  const [teacherName, setTeacherName] = useState('all');
  const [teacherSort, setTeacherSort] = useState('periods-desc');
  const [reporterName, setReporterName] = useState(() => readStored('attendance.reporterName'));
  const [reporterTitle, setReporterTitle] = useState(() => readStored('attendance.reporterTitle'));
  const [generalRemarks, setGeneralRemarks] = useState('');
  const remarksDirty = useRef(false);
  const teacherTrackRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleActivityFilter(event) {
      if (event?.detail?.tab !== 'report') return;
      const nextType = ['all', 'remedial', 'enrichment', 'supplemental'].includes(event?.detail?.activityType)
        ? event.detail.activityType
        : 'all';
      setActivityType(nextType);
      setClassId('all');
      setTeacherName('all');
      remarksDirty.current = false;
    }
    window.addEventListener('bes-attendance-activity-filter-change', handleActivityFilter);
    return () => window.removeEventListener('bes-attendance-activity-filter-change', handleActivityFilter);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!client) return;
      const bounds = mode === 'month' ? monthBounds(month) : null;
      if (mode === 'month' && !bounds) return;
      if (mode === 'day' && !date) return;
      setLoading(true);
      try {
        let sessionQuery = client.from('bes_extra_attendance_sessions')
          .select(REPORT_SESSION_COLUMNS)
          .order('attendance_date', { ascending: true });
        if (mode === 'day') sessionQuery = sessionQuery.eq('attendance_date', date);
        else sessionQuery = sessionQuery.gte('attendance_date', bounds.start).lt('attendance_date', bounds.next);
        const sessionResult = await sessionQuery;
        if (sessionResult.error) throw sessionResult.error;
        const extraSessions = sessionResult.data || [];
        const sessionIds = extraSessions.map((row) => row.id);
        const completedIds = extraSessions.filter((row) => row.session_status !== 'cancelled').map((row) => row.id);
        let supplementalData = { sessions: [], records: [], classes: [] };
        if (includeSupplemental) {
          const supplementalFrom = mode === 'day' ? date : bounds.start;
          const supplementalTo = mode === 'day' ? date : bounds.next;
          const supplementalResult = await client.rpc('bes_list_supplemental_history', { p_from: supplementalFrom, p_to: supplementalTo, p_query: '' });
          if (supplementalResult.error) throw supplementalResult.error;
          supplementalData = normalizeSupplementalReportData(supplementalResult.data || []);
        }
        let nextRecords = [...supplementalData.records];
        let nextChanges = [];
        if (completedIds.length) {
          const recordResult = await client.from('bes_extra_attendance_records')
            .select(REPORT_RECORD_COLUMNS)
            .in('session_id', completedIds)
            .order('student_full_name', { ascending: true });
          if (recordResult.error) throw recordResult.error;
          nextRecords = [...(recordResult.data || []), ...supplementalData.records];
        }
        if (sessionIds.length) {
          const changeResult = await client.from('bes_extra_attendance_record_changes')
            .select(REPORT_CHANGE_COLUMNS)
            .in('session_id', sessionIds)
            .order('changed_at', { ascending: true });
          if (changeResult.error) throw changeResult.error;
          nextChanges = changeResult.data || [];
        }
        if (!cancelled) {
          setSessions([...extraSessions, ...supplementalData.sessions]);
          setSupplementalClasses(supplementalData.classes);
          setRecords(nextRecords);
          setChanges(nextChanges);
          remarksDirty.current = false;
        }
      } catch (error) {
        if (!cancelled) onError?.(error?.message || 'Không thể tải báo cáo điểm danh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [client, mode, month, date, includeSupplemental]);

  const reportClasses = useMemo(() => [...classes, ...supplementalClasses], [classes, supplementalClasses]);
  const teachers = useMemo(() => uniqueReportTeachers(sessions, month, { mode, date }), [sessions, month, mode, date]);
  useEffect(() => { if (teacherName !== 'all' && !teachers.includes(teacherName)) setTeacherName('all'); }, [teachers.join('|')]);
  useEffect(() => { if (classId !== 'all' && !reportClasses.some((row) => String(row.id) === String(classId))) setClassId('all'); }, [reportClasses]);

  const report = useMemo(() => buildAttendanceReport({ sessions, records, changes, classes: reportClasses, mode, month, date, activityType, classId, teacherName }), [sessions, records, changes, reportClasses, mode, month, date, activityType, classId, teacherName]);
  useEffect(() => {
    if (!remarksDirty.current) setGeneralRemarks(automaticRemarks(report));
  }, [report.metrics.completedSessions, report.metrics.cancelledSessions, report.metrics.totalPeriods, report.metrics.attendanceRate, report.sessionRows.length, classId, teacherName, mode, month, date]);

  const sortedTeacherRows = useMemo(() => {
    const rows = [...report.teacherRows];
    if (teacherSort === 'attendance-desc') return rows.sort((a, b) => Number(b.attendance_rate || 0) - Number(a.attendance_rate || 0) || Number(b.total_periods || 0) - Number(a.total_periods || 0));
    if (teacherSort === 'name-asc') return rows.sort((a, b) => String(a.teacher_name || '').localeCompare(String(b.teacher_name || ''), 'vi'));
    return rows.sort((a, b) => Number(b.total_periods || 0) - Number(a.total_periods || 0) || String(a.teacher_name || '').localeCompare(String(b.teacher_name || ''), 'vi'));
  }, [report.teacherRows, teacherSort]);

  const selectedClass = reportClasses.find((row) => String(row.id) === String(classId));
  const periodLabelText = mode === 'day' ? formatDate(date) : `Tháng ${String(month || '').slice(5, 7)}/${String(month || '').slice(0, 4)}`;
  const exportFilters = {
    mode,
    month,
    date,
    periodLabel: periodLabelText,
    classLabel: classId === 'all' ? 'Tất cả lớp' : (selectedClass?.class_name || 'Lớp đã chọn'),
    teacherLabel: teacherName === 'all' ? 'Tất cả giáo viên' : teacherName,
    reporterName: reporterName.trim(),
    reporterTitle: reporterTitle.trim(),
    generalRemarks: generalRemarks.trim(),
  };

  function changeMode(nextMode) {
    setMode(nextMode);
    setTeacherName('all');
    remarksDirty.current = false;
  }

  function updateReporterName(value) {
    setReporterName(value);
    remember('attendance.reporterName', value);
  }

  function updateReporterTitle(value) {
    setReporterTitle(value);
    remember('attendance.reporterTitle', value);
  }

  function scrollTeacherTrack(direction) {
    const track = teacherTrackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(280, track.clientWidth * 0.82), behavior: 'smooth' });
  }

  return <section className="att-report-m3">
    <header className="att-report-m3__toolbar">
      <div className="att-report-m3__hero-copy">
        <span className="att-report-m3__hero-icon"><ReportIcon name="chart" size={25} /></span>
        <div><span className="att-report-m3__eyebrow">BÁO CÁO ĐIỂM DANH</span><h2>Báo cáo điểm danh</h2><p>Thống kê đầy đủ theo ngày hoặc theo tháng, bao gồm giáo viên, phòng học, giờ dạy, người điểm danh và người điều chỉnh.</p></div>
      </div>
      <div className="att-report-m3__controls">
        <div className="att-report-m3__mode" role="group" aria-label="Chế độ báo cáo">
          <button type="button" className={mode === 'month' ? 'is-active' : ''} onClick={() => changeMode('month')}>Theo tháng</button>
          <button type="button" className={mode === 'day' ? 'is-active' : ''} onClick={() => changeMode('day')}>Theo ngày</button>
        </div>
        <div className="att-report-m3__filters">
          {mode === 'month'
            ? <label><span>Tháng</span><input type="month" value={month} onChange={(event) => { onMonthChange?.(event.target.value); remarksDirty.current = false; }} /></label>
            : <label><span>Ngày</span><input type="date" value={date} max={vietnamDateString()} onChange={(event) => { setDate(event.target.value); remarksDirty.current = false; }} /></label>}
          <label><span>Lớp</span><select value={classId} onChange={(event) => { setClassId(event.target.value); remarksDirty.current = false; }}><option value="all">Tất cả lớp</option>{reportClasses.filter((row) => row.active !== false && (activityType === 'all' || (activityType === 'enrichment' ? row.class_type === 'gifted' : row.class_type === activityType))).map((row) => <option key={row.id} value={row.id}>{row.class_name}</option>)}</select></label>
          <label><span>Giáo viên</span><select value={teacherName} onChange={(event) => { setTeacherName(event.target.value); remarksDirty.current = false; }}><option value="all">Tất cả giáo viên</option>{teachers.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
      </div>
    </header>

    <section className="att-report-m3__export-meta">
      <label><span className="att-report-m3__meta-icon"><ReportIcon name="person" size={17} /></span><span>Người báo cáo</span><input value={reporterName} onChange={(event) => updateReporterName(event.target.value)} placeholder="Nhập họ và tên" /></label>
      <label><span className="att-report-m3__meta-icon"><ReportIcon name="briefcase" size={17} /></span><span>Chức vụ</span><input value={reporterTitle} onChange={(event) => updateReporterTitle(event.target.value)} placeholder="Ví dụ: Phó hiệu trưởng" /></label>
      <label className="is-wide"><span className="att-report-m3__meta-icon"><ReportIcon name="note" size={17} /></span><span>Nhận xét chung</span><textarea value={generalRemarks} rows="2" onChange={(event) => { remarksDirty.current = true; setGeneralRemarks(event.target.value); }} /></label>
    </section>

    {loading ? <div className="att-report-m3__loading">Đang tổng hợp dữ liệu {mode === 'day' ? 'ngày' : 'tháng'}…</div> : <>
      <div className="att-report-m3__metrics">
        <article className="is-blue"><span className="att-report-m3__metric-icon"><ReportIcon name="book" size={24} /></span><div><span>Buổi đã dạy</span><b>{report.metrics.completedSessions}</b><small>Phiên đã chốt</small></div></article>
        <article className="is-green"><span className="att-report-m3__metric-icon"><ReportIcon name="users" size={24} /></span><div><span>Lượt có mặt</span><b>{report.metrics.presentInstances}</b><small>{pct(report.metrics.attendanceRate)} chuyên cần · {report.metrics.lateInstances} đi trễ</small></div></article>
        <article className="is-purple"><span className="att-report-m3__metric-icon"><ReportIcon name="clock" size={24} /></span><div><span>Tổng số tiết</span><b>{String(report.metrics.totalPeriods).replace('.', ',')}</b><small>Không tính buổi hủy</small></div></article>
        <article className="is-amber"><span className="att-report-m3__metric-icon"><ReportIcon name="ban" size={24} /></span><div><span>Buổi đã hủy</span><b>{report.metrics.cancelledSessions}</b><small>0 tiết / buổi</small></div></article>
      </div>

      <section className="att-report-m3__surface att-report-m3__teacher-surface">
        <div className="att-report-m3__section-head">
          <div className="att-report-m3__section-title"><span><ReportIcon name="teacher" size={20} /></span><div><h3>Theo giáo viên</h3><p>Tổng hợp số buổi, số tiết và tỷ lệ chuyên cần trong kỳ đang chọn. Kéo ngang để xem thêm giáo viên.</p></div></div>
          <div className="att-report-m3__teacher-tools">
            <label><span>Sắp xếp theo</span><select value={teacherSort} onChange={(event) => setTeacherSort(event.target.value)}><option value="periods-desc">Số tiết (giảm dần)</option><option value="attendance-desc">Chuyên cần (cao nhất)</option><option value="name-asc">Tên giáo viên (A–Z)</option></select></label>
            <button type="button" aria-label="Giáo viên trước" onClick={() => scrollTeacherTrack(-1)}><ReportIcon name="chevronLeft" size={18} /></button>
            <button type="button" className="is-next" aria-label="Giáo viên tiếp theo" onClick={() => scrollTeacherTrack(1)}><ReportIcon name="chevronRight" size={18} /></button>
          </div>
        </div>
        <div className="att-report-m3__teacher-track" ref={teacherTrackRef} tabIndex="0">
          {sortedTeacherRows.map((row, index) => {
            const rate = Math.max(0, Math.min(1, Number(row.attendance_rate || 0)));
            return <article className={`att-report-m3__teacher-card is-tone-${index % 6}`} key={row.teacher_name}>
              <div className="att-report-m3__teacher-card-head"><span className="att-report-m3__teacher-avatar">{teacherInitials(row.teacher_name)}</span><strong title={row.teacher_name}>{row.teacher_name}</strong></div>
              <b>{periodLabel(row.total_periods)}</b>
              <span>{row.completed_sessions} buổi · {row.distinct_classes} lớp</span>
              <small>{row.present_instances} có mặt · {row.late_instances} đi trễ · {row.absent_instances} vắng</small>
              <div className="att-report-m3__teacher-rate"><span className="att-report-m3__teacher-progress"><i style={{ width: `${rate * 100}%` }} /></span><b>{pct(rate)}</b></div>
            </article>;
          })}
          {!sortedTeacherRows.length ? <div className="att-report-m3__empty">Chưa có buổi dạy phù hợp bộ lọc.</div> : null}
        </div>
      </section>

      <section className="att-report-m3__surface att-report-m3__detail-surface">
        <div className="att-report-m3__section-head"><div className="att-report-m3__section-title"><span><ReportIcon name="calendar" size={20} /></span><div><h3>Chi tiết buổi học</h3><p>Tách rõ giáo viên thực dạy, người thực hiện điểm danh và người điều chỉnh gần nhất.</p></div></div><div className="att-report-m3__export"><button type="button" disabled={loading} onClick={() => downloadAttendanceReportXlsx(report, exportFilters)}><ReportIcon name="download" size={15} />Xuất Excel</button><button className="is-primary" type="button" disabled={loading} onClick={async () => { try { await printAttendanceReportPdf(report, exportFilters); } catch (error) { onError?.(error.message); } }}><ReportIcon name="note" size={15} />Xuất PDF báo cáo</button></div></div>
        <div className="att-report-m3__table-wrap"><table><thead><tr><th>Ngày</th><th>Giờ dạy</th><th>Giờ chốt</th><th>Lớp / loại</th><th>Môn</th><th>Phòng học</th><th>Giáo viên dạy</th><th>Người điểm danh</th><th>Điều chỉnh gần nhất</th><th>Số tiết</th><th>Sĩ số</th><th>Có mặt</th><th>Đi trễ</th><th>Vắng</th><th>Tỷ lệ</th><th>Trạng thái / ghi chú</th></tr></thead><tbody>{report.sessionRows.map((row) => <tr key={row.id} className={row.session_status === 'cancelled' ? 'is-cancelled' : ''}><td>{formatDate(row.attendance_date)}</td><td>{row.teaching_time_range || 'Chưa ghi'}</td><td>{formatCheckedTime(row.checked_at)}</td><td><b>{row.class_name}</b><small>{classTypeLabel(row.class_type)}</small></td><td>{row.subject || '—'}</td><td>{row.teaching_room || 'Chưa ghi'}</td><td>{row.teacher_name || '—'}</td><td><b>{row.checked_by_name || '—'}</b><small>{formatCheckedTime(row.checked_at)}</small></td><td><b>{row.latest_changed_by_name || 'Chưa điều chỉnh'}</b><small>{row.latest_changed_at ? formatCheckedTime(row.latest_changed_at) : `${row.change_count || 0} lần`}</small></td><td>{row.session_status === 'cancelled' ? '0' : String(row.lesson_periods).replace('.', ',')}</td><td>{row.total_students ?? '—'}</td><td>{row.present_count ?? '—'}</td><td>{row.late_count ?? '—'}</td><td>{row.absent_count ?? '—'}</td><td>{row.attendance_rate === null ? '—' : pct(row.attendance_rate)}</td><td><span className={`att-report-m3__status is-${row.session_status}`}>{row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh'}</span><small>{row.note || '—'}</small></td></tr>)}{!report.sessionRows.length ? <tr><td colSpan="16" className="att-report-m3__empty">Không có dữ liệu phù hợp bộ lọc.</td></tr> : null}</tbody></table></div>
      </section>

      <section className="att-report-m3__surface att-report-m3__absence-surface">
        <div className="att-report-m3__section-head"><div className="att-report-m3__section-title"><span><ReportIcon name="absent" size={20} /></span><div><h3>Chi tiết học sinh vắng</h3><p>Lý do vắng và ghi chú được lấy từ bản ghi đã chốt của từng buổi.</p></div></div></div>
        <div className="att-report-m3__table-wrap"><table><thead><tr><th>Ngày</th><th>Học sinh</th><th>Lớp chính khóa</th><th>Lý do vắng</th><th>Ghi chú</th><th>Lớp phụ đạo/bồi dưỡng</th><th>Môn</th><th>Giáo viên</th><th>Giờ dạy</th><th>Giờ chốt</th><th>Phòng học</th></tr></thead><tbody>{report.absenceRows.map((row, index) => <tr key={`${row.session_id}-${row.student_code || row.student_full_name}-${index}`}><td>{formatDate(row.attendance_date)}</td><td><b>{row.student_full_name}</b><small>{row.student_code || 'Không có mã HS'}</small></td><td>{row.school_class_name || '—'}</td><td>{row.reason_label}</td><td>{row.absence_note || '—'}</td><td>{row.class_name}</td><td>{row.subject || '—'}</td><td>{row.teacher_name || '—'}</td><td>{row.teaching_time_range || 'Chưa ghi'}</td><td>{formatCheckedTime(row.checked_at)}</td><td>{row.teaching_room || 'Chưa ghi'}</td></tr>)}{!report.absenceRows.length ? <tr><td colSpan="11" className="att-report-m3__empty">Không có học sinh vắng trong dữ liệu phù hợp bộ lọc.</td></tr> : null}</tbody></table></div>
      </section>
    </>}
  </section>;
}