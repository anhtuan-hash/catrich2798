import React, { useEffect, useState } from 'react';
import { loadSchoolHomeroomStats } from '../../utils/homeroomPhase2.js';
import { StatCard } from './HomeroomCoreTabs.jsx';

function compactRow(row = {}) {
  const payload = row.payload || {};
  const rawStudents = (payload.students || []).filter((student) => student.active !== false).length;
  const rawAttendance = Object.values(payload.attendance || {})
    .reduce((sum, rows) => sum + Object.keys(rows || {}).length, 0);
  return {
    ...row,
    class_name: row.class_name || payload.classProfile?.className || 'Chưa đặt tên',
    school_year: row.school_year || payload.classProfile?.schoolYear || '',
    adviser_name: row.adviser_name || payload.classProfile?.adviserName || row.owner_email || '',
    student_count: Number(row.student_count ?? rawStudents),
    attendance_count: Number(row.attendance_count ?? rawAttendance),
    notice_count: Number(row.notice_count ?? (payload.announcements || []).length),
    feedback_count: Number(row.feedback_count ?? (payload.subjectFeedback || []).length),
  };
}

export default function SchoolStatsCompactTab({ currentUser }) {
  const [state, setState] = useState({ loading: true, error: '', workspaces: [] });

  const load = async ({ force = false } = {}) => {
    setState((value) => ({ ...value, loading: true, error: '' }));
    const result = await loadSchoolHomeroomStats(currentUser, { force });
    setState({
      loading: false,
      error: result.ok ? '' : result.message,
      workspaces: (result.workspaces || []).map(compactRow),
    });
  };

  useEffect(() => { load(); }, [currentUser?.id]);

  if (currentUser?.role !== 'admin') {
    return <section className="hr-panel"><h2>Thống kê toàn trường</h2><p className="hr-muted">Chỉ tài khoản Admin được cấp quyền xem dữ liệu tổng hợp nhiều lớp.</p></section>;
  }

  const students = state.workspaces.reduce((sum, row) => sum + row.student_count, 0);
  const attendance = state.workspaces.reduce((sum, row) => sum + row.attendance_count, 0);
  const notices = state.workspaces.reduce((sum, row) => sum + row.notice_count, 0);
  const feedback = state.workspaces.reduce((sum, row) => sum + row.feedback_count, 0);

  return <div className="hr-tab-stack">
    <section className="hr-stat-grid">
      <StatCard icon="▦" label="Lớp chủ nhiệm" value={state.workspaces.length} note="Đã đồng bộ" />
      <StatCard icon="♙" label="Học sinh" value={students} note="Sĩ số hoạt động" tone="green" />
      <StatCard icon="✓" label="Lượt điểm danh" value={attendance} note="Dữ liệu đã ghi nhận" tone="orange" />
      <StatCard icon="↔" label="Nhận xét bộ môn" value={feedback} note={`${notices} thông báo`} tone="red" />
    </section>
    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Toàn trường</small><h2>Tổng hợp không gian chủ nhiệm</h2></div><button type="button" className="secondary" onClick={() => load({ force: true })}>{state.loading ? 'Đang tải…' : 'Làm mới'}</button></div>
      {state.error ? <p className="hr-error">{state.error}</p> : null}
      {state.workspaces.length ? <div className="hr-preview-table"><table><thead><tr><th>Lớp</th><th>Năm học</th><th>GVCN</th><th>Sĩ số</th><th>Điểm danh</th><th>Thông báo</th><th>Cập nhật</th></tr></thead><tbody>{state.workspaces.map((row) => <tr key={`${row.owner_id}-${row.workspace_id || 'default'}`}><td><b>{row.class_name}</b></td><td>{row.school_year || '—'}</td><td>{row.adviser_name || row.owner_email}</td><td>{row.student_count}</td><td>{row.attendance_count}</td><td>{row.notice_count}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '—'}</td></tr>)}</tbody></table></div> : <p className="hr-muted">{state.loading ? 'Đang tải dữ liệu…' : 'Chưa có lớp nào đồng bộ.'}</p>}
    </section>
  </div>;
}

export { SchoolStatsCompactTab as SchoolStatsTab };
