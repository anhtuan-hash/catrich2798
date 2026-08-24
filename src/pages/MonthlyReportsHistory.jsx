import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CalendarRange, CheckCircle2, ChevronRight, ClipboardList,
  FileClock, Lightbulb, LoaderCircle, RefreshCw, UserRoundCheck, UsersRound,
} from 'lucide-react';
import { REPORT_STATUS, reportMonthLabel } from '../utils/monthlyReports.js';
import {
  listDepartmentReportHistory, schoolYearOptions, summarizeDepartmentReportHistory,
} from '../utils/monthlyReportHistory.js';
import { listTeamTeacherAccounts, loadTeamWorkspace } from '../utils/personnelHub.js';
import './MonthlyReportsHistory.css';

const monthShortLabel = (value) => {
  const [year, month] = String(value || '').split('-');
  return `T${Number(month)}/${String(year || '').slice(-2)}`;
};

function statusClass(status) {
  return `mrh-status is-${status || 'missing'}`;
}

function HistoryStat({ icon: Icon, label, value, note, tone = 'blue' }) {
  return (
    <article className={`mrh-kpi is-${tone}`}>
      <span className="mrh-kpi-icon"><Icon /></span>
      <div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
    </article>
  );
}

function MonthCard({ item, active, onClick }) {
  return (
    <button type="button" className={`mrh-month-card ${active ? 'is-active' : ''} ${item.received ? '' : 'is-empty'}`} onClick={onClick}>
      <div className="mrh-month-card-head"><strong>{monthShortLabel(item.month)}</strong><span>{item.completionRate}%</span></div>
      <div className="mrh-month-meter"><i style={{ width: `${item.completionRate}%` }} /></div>
      <div className="mrh-month-card-grid"><span><b>{item.received}</b> đã gửi</span><span><b>{item.approved}</b> đã duyệt</span><span><b>{item.missing}</b> chưa gửi</span><span><b>{item.revision}</b> cần sửa</span></div>
    </button>
  );
}

export default function MonthlyReportsHistory({ currentUser }) {
  const yearOptions = useMemo(() => schoolYearOptions(5), []);
  const [schoolYear, setSchoolYear] = useState(yearOptions[0]);
  const [department, setDepartment] = useState(null);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  const loadBase = async () => {
    setLoading(true);
    const [workspaceResult, accounts] = await Promise.all([
      loadTeamWorkspace(currentUser),
      listTeamTeacherAccounts(currentUser),
    ]);
    const workspace = workspaceResult.workspace;
    const activeDepartment = workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId)
      || workspace?.departments?.[0]
      || null;
    const accountMap = new Map((accounts || []).map((item) => [String(item.id), item]));
    const nextMembers = (activeDepartment?.members || []).map((member) => ({
      ...member,
      account: accountMap.get(String(member.teacherAccountId)) || {
        id: member.teacherAccountId,
        name: 'Tài khoản giáo viên',
        email: '',
      },
    }));
    setDepartment(activeDepartment);
    setMembers(nextMembers);
    setWarning(workspaceResult.warning || '');
    setLoading(false);
    return { department: activeDepartment, members: nextMembers };
  };

  const loadHistory = async (targetDepartment = department) => {
    if (!targetDepartment?.id) return;
    setLoading(true);
    const result = await listDepartmentReportHistory(currentUser, targetDepartment.id, schoolYear);
    setReports(result.reports || []);
    setWarning(result.warning || '');
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    loadBase().then((result) => {
      if (!alive || !result.department) return;
      return listDepartmentReportHistory(currentUser, result.department.id, schoolYear).then((history) => {
        if (!alive) return;
        setReports(history.reports || []);
        setWarning(history.warning || '');
        setLoading(false);
      });
    }).catch((error) => {
      if (!alive) return;
      setWarning(error?.message || 'Không tải được dữ liệu quản lý báo cáo.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!department?.id) return;
    let alive = true;
    setLoading(true);
    listDepartmentReportHistory(currentUser, department.id, schoolYear).then((result) => {
      if (!alive) return;
      setReports(result.reports || []);
      setWarning(result.warning || '');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [schoolYear, department?.id, currentUser?.id]);

  const summary = useMemo(() => summarizeDepartmentReportHistory(reports, members, schoolYear), [reports, members, schoolYear]);
  useEffect(() => {
    if (selectedMonth && summary.months.some((item) => item.month === selectedMonth)) return;
    const latestWithData = [...summary.months].reverse().find((item) => item.received > 0);
    setSelectedMonth(latestWithData?.month || summary.months[0]?.month || '');
  }, [summary, selectedMonth]);

  const selected = summary.months.find((item) => item.month === selectedMonth) || summary.months[0];
  const reportMap = useMemo(() => new Map((selected?.reports || []).map((report) => [String(report.teacherId), report])), [selected]);
  const activityTotal = summary.totals.observations + summary.totals.demonstrations + summary.totals.seminars;

  if (loading && !department) {
    return <main className="mrh-shell"><div className="mrh-loading"><LoaderCircle className="spin" /><h2>Đang tải thống kê báo cáo…</h2></div></main>;
  }

  return (
    <main className="mrh-shell">
      <header className="mrh-header">
        <div>
          <span className="mrh-eyebrow"><CalendarRange /> QUẢN LÝ BÁO CÁO</span>
          <h1>Thống kê báo cáo theo tháng</h1>
          <p>{department?.name || 'Tổ chuyên môn'} · Theo dõi mức độ gửi, duyệt và số liệu chuyên môn xuyên suốt năm học.</p>
        </div>
        <div className="mrh-header-actions">
          <label><span>Năm học</span><select value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)}>{yearOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => loadHistory()}><RefreshCw /> Làm mới</button>
        </div>
      </header>

      {warning && <div className="mrh-warning">{warning}</div>}

      <section className="mrh-kpi-grid">
        <HistoryStat icon={UsersRound} label="Quy mô tổ" value={summary.totalTeachers} note="giáo viên trong tổ" tone="blue" />
        <HistoryStat icon={FileClock} label="Lượt báo cáo" value={summary.totalReceived} note={`${summary.activeMonths}/12 tháng có dữ liệu`} tone="purple" />
        <HistoryStat icon={CheckCircle2} label="Đã duyệt" value={summary.totalApproved} note={`${summary.averageCompletion}% tỷ lệ gửi TB`} tone="green" />
        <HistoryStat icon={BarChart3} label="Hoạt động CM" value={activityTotal} note={`${summary.totals.itApplications} lượt UDCNTT`} tone="amber" />
        <HistoryStat icon={Lightbulb} label="Kiến nghị" value={summary.totalRecommendations} note={`${summary.totalRevision} báo cáo cần sửa`} tone="red" />
      </section>

      <section className="mrh-panel">
        <div className="mrh-panel-title"><div><small>12 THÁNG TRONG NĂM HỌC</small><h2>Tiến độ nộp báo cáo</h2></div><span>Mỗi thẻ thể hiện tỷ lệ tổ viên đã gửi trong tháng</span></div>
        <div className="mrh-month-grid">{summary.months.map((item) => <MonthCard key={item.month} item={item} active={item.month === selectedMonth} onClick={() => setSelectedMonth(item.month)} />)}</div>
      </section>

      <section className="mrh-panel">
        <div className="mrh-panel-title"><div><small>BẢNG SO SÁNH</small><h2>Thống kê từng tháng</h2></div><span>Có thể theo dõi cả mức độ nộp và số liệu chuyên môn</span></div>
        <div className="mrh-table-wrap">
          <table className="mrh-table">
            <thead><tr><th>Tháng</th><th>Đã gửi</th><th>Đã duyệt</th><th>Cần sửa</th><th>Chưa gửi</th><th>Dự giờ</th><th>Thao giảng</th><th>UDCNTT</th><th>Chuyên đề</th><th>Kho học liệu</th><th>Kiến nghị</th><th /></tr></thead>
            <tbody>{summary.months.map((item) => <tr key={item.month} className={item.month === selectedMonth ? 'is-selected' : ''}><td><b>{reportMonthLabel(item.month)}</b></td><td><span className="mrh-rate">{item.received}/{summary.totalTeachers}</span></td><td>{item.approved}</td><td>{item.revision}</td><td>{item.missing}</td><td>{item.stats.observations}</td><td>{item.stats.demonstrations}</td><td>{item.stats.itApplications}</td><td>{item.stats.seminars}</td><td>{item.stats.digitalRepository}</td><td>{item.recommendations}</td><td><button type="button" className="mrh-detail-button" onClick={() => setSelectedMonth(item.month)}>Chi tiết <ChevronRight /></button></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {selected && <section className="mrh-panel mrh-detail-panel">
        <div className="mrh-panel-title"><div><small>CHI TIẾT TỔ VIÊN</small><h2>{reportMonthLabel(selected.month)}</h2></div><span>{selected.received}/{summary.totalTeachers} giáo viên đã gửi · {selected.completionRate}%</span></div>
        <div className="mrh-detail-summary">
          <div><span>Tỷ lệ gửi</span><strong>{selected.completionRate}%</strong></div>
          <div><span>Đã duyệt</span><strong>{selected.approved}</strong></div>
          <div><span>Cần chỉnh sửa</span><strong>{selected.revision}</strong></div>
          <div><span>Chưa gửi</span><strong>{selected.missing}</strong></div>
        </div>
        <div className="mrh-teacher-grid">{members.map((member) => {
          const teacherId = String(member.teacherAccountId || member.account?.id || '');
          const report = reportMap.get(teacherId);
          return <article className={`mrh-teacher-card ${report ? 'has-report' : 'is-missing'}`} key={member.id || teacherId}>
            <span className="mrh-teacher-icon">{report ? <UserRoundCheck /> : <UsersRound />}</span>
            <div><strong>{member.account?.name || 'Giáo viên'}</strong><small>{member.account?.email || ''}</small></div>
            <span className={statusClass(report?.status)}>{report ? REPORT_STATUS[report.status] || report.status : 'Chưa gửi'}</span>
          </article>;
        })}</div>
      </section>}

      {loading && <div className="mrh-refreshing"><LoaderCircle className="spin" /> Đang cập nhật…</div>}
    </main>
  );
}
