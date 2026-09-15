import React, { useMemo, useState } from 'react';
import './StudentSupportReports.css';
import {
  buildSupportReport,
  exportSupportReportExcel,
  exportSupportReportPdf,
} from '../../studentSupport/studentSupportExports.js';

function unique(rows, getter) {
  return [...new Set(rows.map(getter).map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
}

export default function StudentSupportReports({ cases = [], alerts = [], language = 'vi' }) {
  const vi = language === 'vi';
  const [filters, setFilters] = useState({ className: '', grade: '', homeroomOwnerId: '', month: '', semester: '', schoolYear: '', status: '', category: '' });
  const report = useMemo(() => buildSupportReport({ cases, alerts }, filters), [cases, alerts, filters]);
  const options = useMemo(() => ({
    classes: unique(cases, (row) => row.source_class_name || row.class_name),
    grades: unique(cases, (row) => row.grade),
    owners: unique(cases, (row) => row.homeroom_owner_id || row.owner_id),
    semesters: unique(cases, (row) => row.semester),
    schoolYears: unique(cases, (row) => row.school_year),
    statuses: unique(cases, (row) => row.status),
    categories: unique(cases, (row) => row.category),
  }), [cases]);

  const patch = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters({ className: '', grade: '', homeroomOwnerId: '', month: '', semester: '', schoolYear: '', status: '', category: '' });
  const summaries = [
    [vi ? 'Tổng hồ sơ' : 'Total cases', report.summary.total],
    [vi ? 'Đang hỗ trợ' : 'Active', report.summary.active],
    [vi ? 'Theo dõi tiếp' : 'Follow-up', report.summary.followUp],
    [vi ? 'Đã giải quyết' : 'Resolved', report.summary.resolved],
    [vi ? 'Đã đóng' : 'Closed', report.summary.closed],
    [vi ? 'Không cần hành động' : 'No action', report.summary.noActionRequired],
  ];

  return <section className="student-support-reports">
    <header className="student-support-reports-head">
      <div><span>{vi ? 'Báo cáo tổng hợp' : 'Aggregate reports'}</span><h2>{vi ? 'Theo dõi hoạt động hỗ trợ học sinh' : 'Student support activity'}</h2><p>{vi ? 'Chỉ xuất dữ liệu tổng hợp và metadata hồ sơ; không xuất nội dung ghi chú riêng tư.' : 'Exports aggregate data and case metadata only; private note bodies are excluded.'}</p></div>
      <div className="student-support-report-actions">
        <button type="button" className="secondary" onClick={reset}>{vi ? 'Xóa bộ lọc' : 'Reset'}</button>
        <button type="button" onClick={() => exportSupportReportExcel(report)} disabled={!report.rows.length}>{vi ? 'Xuất Excel' : 'Export Excel'}</button>
        <button type="button" onClick={() => exportSupportReportPdf(report)} disabled={!report.rows.length}>{vi ? 'In / PDF' : 'Print / PDF'}</button>
      </div>
    </header>

    <div className="student-support-report-filters">
      <label><span>{vi ? 'Lớp' : 'Class'}</span><select value={filters.className} onChange={(e) => patch('className', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.classes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Khối' : 'Grade'}</span><select value={filters.grade} onChange={(e) => patch('grade', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.grades.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>GVCN</span><select value={filters.homeroomOwnerId} onChange={(e) => patch('homeroomOwnerId', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.owners.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Tháng' : 'Month'}</span><select value={filters.month} onChange={(e) => patch('month', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Học kỳ' : 'Semester'}</span><select value={filters.semester} onChange={(e) => patch('semester', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.semesters.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Năm học' : 'School year'}</span><select value={filters.schoolYear} onChange={(e) => patch('schoolYear', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.schoolYears.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Trạng thái' : 'Status'}</span><select value={filters.status} onChange={(e) => patch('status', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>{vi ? 'Nhóm hỗ trợ' : 'Category'}</span><select value={filters.category} onChange={(e) => patch('category', e.target.value)}><option value="">{vi ? 'Tất cả' : 'All'}</option>{options.categories.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>

    <div className="student-support-report-summary">{summaries.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>

    <div className="student-support-report-table-wrap">
      <table>
        <thead><tr><th>#</th><th>{vi ? 'Học sinh' : 'Student'}</th><th>{vi ? 'Lớp' : 'Class'}</th><th>{vi ? 'Nhóm' : 'Category'}</th><th>{vi ? 'Trạng thái' : 'Status'}</th><th>{vi ? 'Theo dõi tiếp' : 'Follow-up'}</th></tr></thead>
        <tbody>{report.rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.studentRef || '—'}</td><td>{row.className || '—'}</td><td>{row.category || '—'}</td><td>{row.status || '—'}</td><td>{row.followUpAt ? new Date(row.followUpAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US') : '—'}</td></tr>)}</tbody>
      </table>
      {!report.rows.length ? <p>{vi ? 'Không có hồ sơ phù hợp bộ lọc.' : 'No cases match the filters.'}</p> : null}
    </div>
  </section>;
}
