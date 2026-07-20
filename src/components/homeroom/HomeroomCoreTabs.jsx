import React, { useEffect, useMemo, useRef, useState } from 'react';
import StudentRosterImportPanel from '../StudentRosterImportPanel.jsx';
import {
  addLearningRecord,
  addScheduleItem,
  addStudent,
  archiveStudent,
  restoreStudent,
  setAttendanceLock,
  setAttendanceSession,
  transferStudent,
  updateGradeSettings,
  upsertStudents,
} from '../../utils/homeroomStore.js';
import { attendanceSessionKey, createCorrectionRequest, parseAttendanceSessionKey } from '../../utils/homeroomPhase3.js';
import { ATTENDANCE_STATUSES, SCHEDULE_CATEGORIES } from '../../data/homeroom.js';
import {
  classMetrics,
  downloadCsv,
  formatViDate,
  normalizePhone,
  parseLearningFile,
  parseScheduleFile,
  safeText,
  studentMetrics,
  todayIso,
} from '../../utils/homeroomOfflineTools.js';

const EMPTY_STUDENT = {
  code: '', fullName: '', birthDate: '', gender: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', address: '', notes: '', supportLevel: 'normal',
};
const EMPTY_EVENT = { title: '', date: todayIso(), startTime: '', endTime: '', location: '', category: 'Sinh hoạt lớp', audience: 'Toàn lớp', note: '', status: 'Sắp tới' };

export function EmptyState({ title, text, action, actionLabel }) {
  return <div className="hr-empty"><span>＋</span><h3>{title}</h3><p>{text}</p>{action ? <button type="button" className="primary" onClick={action}>{actionLabel}</button> : null}</div>;
}

export function StatCard({ icon, label, value, note, tone = 'blue' }) {
  return <article className={`hr-stat tone-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export function ClassProfileEditor({ value, onChange, onSave, saving, language = 'vi' }) {
  const field = (key, label, type = 'text') => <label key={key}><span>{label}</span><input type={type} value={value[key] || ''} onChange={(event) => onChange({ ...value, [key]: event.target.value })} /></label>;
  return <section className="hr-panel hr-class-setup">
    <div className="hr-panel-head"><div><small>{language === 'vi' ? 'Thiết lập lớp' : 'Class setup'}</small><h2>{language === 'vi' ? 'Thông tin lớp chủ nhiệm' : 'Homeroom class profile'}</h2></div><button type="button" className="primary" disabled={saving || !safeText(value.className)} onClick={onSave}>{saving ? 'Đang lưu…' : 'Lưu thông tin lớp'}</button></div>
    <div className="hr-form-grid four">
      {field('className', 'Tên lớp')}{field('schoolYear', 'Năm học')}{field('grade', 'Khối')}{field('room', 'Phòng học')}
      {field('adviserName', 'Giáo viên chủ nhiệm')}{field('adviserEmail', 'Email', 'email')}{field('classMonitor', 'Lớp trưởng')}{field('studentCountTarget', 'Sĩ số dự kiến', 'number')}{field('schoolName', 'Tên trường')}
    </div>
    <label className="hr-wide-field"><span>Ghi chú lớp</span><textarea value={value.notes || ''} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label>
  </section>;
}

export function OverviewTab({ workspace, goTab }) {
  const metrics = classMetrics(workspace);
  const today = todayIso();
  const todayKeys = Object.keys(workspace.attendance || {}).filter((key) => key.split('::')[0] === today);
  const todayRows = todayKeys.flatMap((key) => Object.values(workspace.attendance?.[key] || {}));
  const dueFollowups = (workspace.parentContacts || []).filter((item) => item.followUpDate && item.followUpDate <= today && item.responseStatus !== 'resolved');
  const upcoming = (workspace.schedule || []).filter((item) => !item.date || item.date >= today).slice(0, 6);
  const support = metrics.perStudent.filter((item) => item.student.supportLevel !== 'normal' || item.unexcused > 0 || item.late >= 2 || (Number.isFinite(item.average) && item.average < 5)).slice(0, 6);
  const setupItems = [
    ['Thông tin lớp', workspace.classProfile?.className ? 100 : 0],
    ['Danh sách học sinh', Math.min(100, metrics.students.length * 4)],
    ['Điểm danh', Math.min(100, Object.keys(workspace.attendance || {}).length * 10)],
    ['Hồ sơ & báo cáo', Math.min(100, (workspace.records || []).length * 20)],
  ];
  return <div className="hr-tab-stack">
    <section className="hr-stat-grid">
      <StatCard icon="♙" label="Sĩ số hiện tại" value={metrics.students.length} note={`${workspace.classProfile?.grade ? `Khối ${workspace.classProfile.grade}` : '—'} · ${workspace.classProfile?.schoolYear || '—'}`} />
      <StatCard icon="✓" label="Có mặt hôm nay" value={todayRows.length ? todayRows.filter((item) => item.status === 'present').length : '—'} note={`${todayKeys.length} phiên đã lưu`} tone="green" />
      <StatCard icon="!" label="Cần xử lý" value={dueFollowups.length + metrics.priorityCount} note={`${dueFollowups.length} liên hệ đến hạn · ${metrics.priorityCount} HS ưu tiên`} tone="red" />
      <StatCard icon="∑" label="Điểm trung bình lớp" value={Number.isFinite(metrics.classAverage) ? metrics.classAverage.toFixed(1) : '—'} note={`${workspace.learningRecords?.length || 0} kết quả đã nhập`} tone="orange" />
    </section>
    <section className="hr-overview-grid">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Thao tác nhanh</small><h2>Công việc hôm nay</h2></div></div><div className="hr-quick-grid">
        <button type="button" onClick={() => goTab('attendance')}><span>✓</span><b>Điểm danh</b><small>Theo buổi hoặc tiết</small></button>
        <button type="button" onClick={() => goTab('students')}><span>♙</span><b>Nhập danh sách</b><small>Excel/CSV theo mẫu</small></button>
        <button type="button" onClick={() => goTab('conduct')}><span>100</span><b>Xét rèn luyện</b><small>100 điểm mỗi tuần</small></button>
        <button type="button" onClick={() => goTab('parents')}><span>✉</span><b>Liên hệ phụ huynh</b><small>Mẫu tin ngoại tuyến</small></button>
        <button type="button" onClick={() => goTab('records')}><span>▤</span><b>Tạo báo cáo</b><small>Tổng hợp dữ liệu thực</small></button>
      </div></article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Sắp tới</small><h2>Lịch công việc</h2></div><button type="button" className="text-btn" onClick={() => goTab('schedule')}>Mở lịch</button></div>{upcoming.length ? <div className="hr-compact-list">{upcoming.map((item) => <div key={item.id}><time>{formatViDate(item.date)}<small>{item.startTime || 'Cả ngày'}</small></time><span><b>{item.title}</b><small>{item.category} · {item.location || 'Chưa có địa điểm'}</small></span></div>)}</div> : <p className="hr-muted">Chưa có công việc sắp tới.</p>}</article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Theo dõi</small><h2>Học sinh cần lưu ý</h2></div><button type="button" className="text-btn" onClick={() => goTab('support')}>Mở hồ sơ hỗ trợ</button></div>{support.length ? <div className="hr-student-mini-list">{support.map((item) => <div key={item.student.id}><span>{item.student.fullName.slice(0, 1)}</span><p><b>{item.student.fullName}</b><small>{Number.isFinite(item.average) ? `TB ${item.average.toFixed(1)} · ` : ''}{item.unexcused} vắng KP · {item.late} trễ</small></p></div>)}</div> : <p className="hr-muted">Chưa có học sinh cần ưu tiên.</p>}</article>
      <article className="hr-panel hr-progress-panel"><div className="hr-panel-head"><div><small>Mức độ hoàn thiện</small><h2>Hồ sơ chủ nhiệm</h2></div></div>{setupItems.map(([label, value]) => <div key={label} className="hr-progress-row"><span><b>{label}</b><small>{value}%</small></span><div><i style={{ width: `${value}%` }} /></div></div>)}</article>
    </section>
  </div>;
}

export function StudentsTab({ workspace, onCommit }) {
  const [draft, setDraft] = useState(EMPTY_STUDENT);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [showImporter, setShowImporter] = useState(false);
  const students = useMemo(() => (workspace.students || []).filter((student) => {
    const match = `${student.fullName} ${student.code} ${student.parentName} ${student.parentPhone}`.toLowerCase().includes(query.toLowerCase());
    if (!match) return false;
    if (filter === 'inactive') return student.active === false;
    if (filter === 'attention') return student.active !== false && student.supportLevel !== 'normal';
    return student.active !== false;
  }), [workspace.students, query, filter]);

  const save = async () => {
    if (!safeText(draft.fullName)) return;
    let next;
    if (editingId) next = { ...workspace, students: workspace.students.map((item) => item.id === editingId ? { ...item, ...draft, id: editingId, updatedAt: new Date().toISOString() } : item) };
    else next = addStudent(workspace, draft);
    await onCommit(next, editingId ? 'Đã cập nhật hồ sơ học sinh.' : 'Đã thêm học sinh.');
    setDraft(EMPTY_STUDENT); setEditingId('');
  };
  const edit = (student) => { setDraft({ ...EMPTY_STUDENT, ...student }); setEditingId(student.id); document.querySelector('.hr-student-form')?.scrollIntoView({ behavior: 'smooth' }); };
  const archive = async (student) => {
    const reason = window.prompt(`Lý do lưu trữ hồ sơ ${student.fullName}:`, 'Chuyển lớp / thôi học / bảo lưu') || '';
    if (safeText(reason)) await onCommit(archiveStudent(workspace, student.id, reason), 'Đã lưu trữ hồ sơ, không xóa lịch sử.');
  };
  const transfer = async (student) => {
    const target = window.prompt(`Chuyển ${student.fullName} đến lớp nào?`, '') || '';
    if (safeText(target)) await onCommit(transferStudent(workspace, student.id, target), `Đã ghi nhận chuyển lớp đến ${target}.`);
  };
  const importRows = async (rows) => onCommit(upsertStudents(workspace, rows), `Đã nhập/cập nhật ${rows.length} học sinh từ file mẫu.`);
  const exportRoster = () => downloadCsv(`danh-sach-${workspace.classProfile?.className || 'lop'}.csv`, [
    ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'SĐT học sinh', 'Phụ huynh', 'SĐT phụ huynh', 'Email phụ huynh', 'Địa chỉ', 'Ghi chú'],
    ...(workspace.students || []).map((item) => [item.code, item.fullName, item.birthDate, item.gender, item.phone, item.parentName, item.parentPhone, item.parentEmail, item.address, item.notes]),
  ]);

  return <div className="hr-tab-stack">
    {showImporter ? <StudentRosterImportPanel existingStudents={workspace.students} onImport={importRows} onClose={() => setShowImporter(false)} /> : null}
    <section className="hr-panel hr-student-form"><div className="hr-panel-head"><div><small>{editingId ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ mới'}</small><h2>Thông tin học sinh</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={() => setShowImporter((value) => !value)}>Nhập nhanh từ file</button><button type="button" className="secondary" onClick={exportRoster}>Xuất CSV</button><button type="button" className="primary" onClick={save}>{editingId ? 'Cập nhật' : 'Thêm học sinh'}</button></div></div>
      <div className="hr-form-grid four">{[
        ['code', 'Mã học sinh'], ['fullName', 'Họ và tên'], ['birthDate', 'Ngày sinh', 'date'], ['gender', 'Giới tính'], ['phone', 'SĐT học sinh', 'tel'], ['parentName', 'Phụ huynh / người giám hộ'], ['parentPhone', 'SĐT phụ huynh', 'tel'], ['parentEmail', 'Email phụ huynh', 'email'], ['address', 'Địa chỉ'],
      ].map(([key, label, type = 'text']) => <label key={key}><span>{label}</span><input type={type} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: key.toLowerCase().includes('phone') ? normalizePhone(event.target.value) : event.target.value })} /></label>)}
        <label><span>Mức theo dõi</span><select value={draft.supportLevel} onChange={(event) => setDraft({ ...draft, supportLevel: event.target.value })}><option value="normal">Bình thường</option><option value="attention">Cần lưu ý</option><option value="priority">Ưu tiên hỗ trợ</option></select></label>
      </div><label className="hr-wide-field"><span>Ghi chú / hoàn cảnh cần lưu ý</span><textarea value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>{editingId ? <button type="button" className="text-btn" onClick={() => { setDraft(EMPTY_STUDENT); setEditingId(''); }}>Hủy chỉnh sửa</button> : null}
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.students?.length || 0} hồ sơ</small><h2>Danh sách lớp</h2></div><div className="hr-filter-row"><input placeholder="Tìm học sinh, phụ huynh…" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="active">Đang học</option><option value="attention">Cần lưu ý / ưu tiên</option><option value="inactive">Đã lưu trữ / chuyển lớp</option></select></div></div>
      {students.length ? <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Học sinh</th><th>Liên hệ</th><th>Phụ huynh</th><th>Theo dõi</th><th /></tr></thead><tbody>{students.map((student, index) => <tr key={student.id}><td><div className="hr-person-cell"><span>{String(index + 1).padStart(2, '0')}</span><p><b>{student.fullName}</b><small>{student.code || 'Chưa có mã'} · {student.birthDate ? formatViDate(student.birthDate) : 'Chưa có ngày sinh'}</small></p></div></td><td><b>{student.phone || '—'}</b><small>{student.address || 'Chưa có địa chỉ'}</small></td><td><b>{student.parentName || '—'}</b><small>{student.parentPhone || student.parentEmail || 'Chưa có liên hệ'}</small></td><td><span className={`hr-support-chip ${student.supportLevel}`}>{student.supportLevel === 'priority' ? 'Ưu tiên' : student.supportLevel === 'attention' ? 'Cần lưu ý' : 'Bình thường'}</span><small>{student.notes || 'Không có ghi chú'}</small></td><td><div className="hr-row-actions"><button type="button" onClick={() => edit(student)}>Sửa</button>{student.active === false ? <button type="button" onClick={() => onCommit(restoreStudent(workspace, student.id), 'Đã khôi phục học sinh.')}>Khôi phục</button> : <><button type="button" onClick={() => transfer(student)}>Chuyển lớp</button><button type="button" className="danger" onClick={() => archive(student)}>Lưu trữ</button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có học sinh" text="Tải file mẫu, điền danh sách và hệ thống sẽ tự nhận diện hoàn toàn trên thiết bị." action={() => setShowImporter(true)} actionLabel="Nhập nhanh từ file" />}
    </section>
  </div>;
}

export function AttendanceTab({ workspace, onCommit, currentUser }) {
  const [date, setDate] = useState(todayIso());
  const [session, setSession] = useState('morning');
  const [period, setPeriod] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [rows, setRows] = useState({});
  const students = (workspace.students || []).filter((item) => item.active !== false);
  const sessionKey = attendanceSessionKey(date, session, period);
  const locked = Boolean(workspace.attendanceLocks?.[sessionKey]?.locked);

  useEffect(() => {
    const existing = workspace.attendance?.[sessionKey] || {};
    const next = {};
    students.forEach((student) => { next[student.id] = existing[student.id] || { status: 'present', reason: '', note: '', evidenceName: '', markedAt: '' }; });
    setRows(next);
    setSessionNote(workspace.attendanceSessions?.[sessionKey]?.note || '');
  }, [sessionKey, workspace.attendance, workspace.attendanceSessions, workspace.students]);

  const setStatus = (studentId, status) => !locked && setRows((current) => ({ ...current, [studentId]: { ...(current[studentId] || {}), status, markedAt: new Date().toISOString(), markedBy: currentUser?.email || currentUser?.name || '' } }));
  const markAll = (status) => !locked && setRows(Object.fromEntries(students.map((student) => [student.id, { ...(rows[student.id] || {}), status, markedAt: new Date().toISOString(), markedBy: currentUser?.email || currentUser?.name || '' }])));
  const save = () => !locked && onCommit(setAttendanceSession(workspace, sessionKey, rows, { date, session, period, note: sessionNote }), `Đã lưu điểm danh ${formatViDate(date)}.`);
  const toggleLock = () => onCommit(setAttendanceLock(workspace, sessionKey, !locked, currentUser?.email || currentUser?.name), locked ? 'Đã mở khóa phiên điểm danh.' : 'Đã chốt phiên điểm danh.');
  const requestCorrection = async () => {
    const reason = window.prompt('Nhập lý do cần chỉnh sửa phiên đã chốt:') || '';
    if (safeText(reason)) await onCommit(createCorrectionRequest(workspace, { sessionKey, reason, requestedBy: currentUser?.email || currentUser?.name }), 'Đã ghi nhận yêu cầu chỉnh sửa.');
  };
  const resolveRequest = async (request, approve) => {
    let next = { ...workspace, correctionRequests: workspace.correctionRequests.map((item) => item.id === request.id ? { ...item, status: approve ? 'approved' : 'rejected', resolvedAt: new Date().toISOString(), resolvedBy: currentUser?.email || currentUser?.name || '' } : item) };
    if (approve) next = setAttendanceLock(next, request.sessionKey, false, currentUser?.email || currentUser?.name);
    await onCommit(next, approve ? 'Đã chấp thuận và mở khóa phiên điểm danh.' : 'Đã từ chối yêu cầu chỉnh sửa.');
  };
  const counts = ATTENDANCE_STATUSES.reduce((acc, item) => ({ ...acc, [item.id]: Object.values(rows).filter((row) => row.status === item.id).length }), {});
  const historyKeys = Object.keys(workspace.attendance || {}).sort().reverse().slice(0, 40);
  const labelSession = (value) => value === 'morning' ? 'Buổi sáng' : value === 'afternoon' ? 'Buổi chiều' : value === 'evening' ? 'Buổi tối' : 'Cả ngày';

  return <div className="hr-tab-stack">
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Điểm danh theo buổi / tiết</small><h2>{formatViDate(date)} · {labelSession(session)}{period ? ` · Tiết ${period}` : ''}</h2></div><div className="hr-head-actions"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={session} onChange={(event) => setSession(event.target.value)}><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option><option value="evening">Buổi tối</option><option value="day">Cả ngày</option></select><input className="hr-period-input" placeholder="Tiết" value={period} onChange={(event) => setPeriod(event.target.value)} /><button type="button" className="secondary" disabled={locked} onClick={() => markAll('present')}>Tất cả có mặt</button><button type="button" className="primary" disabled={locked} onClick={save}>Lưu điểm danh</button></div></div>
      <div className={`hr-attendance-lock ${locked ? 'is-locked' : ''}`}><span>{locked ? '🔒 Phiên đã chốt' : '🔓 Phiên đang mở'}</span><input placeholder="Ghi chú phiên" value={sessionNote} disabled={locked} onChange={(event) => setSessionNote(event.target.value)} /><button type="button" className="secondary" onClick={toggleLock}>{locked ? 'Mở khóa' : 'Chốt phiên'}</button>{locked ? <button type="button" className="secondary" onClick={requestCorrection}>Yêu cầu chỉnh sửa</button> : null}</div>
      <div className="hr-attendance-summary">{ATTENDANCE_STATUSES.map((item) => <span key={item.id} className={item.id}><b>{counts[item.id] || 0}</b><small>{item.labelVi}</small></span>)}</div>
      {students.length ? <div className="hr-attendance-grid">{students.map((student, index) => { const row = rows[student.id] || { status: 'present' }; return <article key={student.id} className={`hr-attendance-card is-${row.status} ${locked ? 'locked' : ''}`}><div className="hr-attendance-name"><span>{index + 1}</span><p><b>{student.fullName}</b><small>{student.code || student.parentPhone || '—'}</small></p></div><div className="hr-status-switch">{ATTENDANCE_STATUSES.map((item) => <button key={item.id} type="button" disabled={locked} className={row.status === item.id ? 'active' : ''} title={item.labelVi} onClick={() => setStatus(student.id, item.id)}>{item.symbol}</button>)}</div>{row.status !== 'present' ? <div className="hr-attendance-detail"><input disabled={locked} placeholder="Lý do / ghi chú" value={row.reason || ''} onChange={(event) => setRows({ ...rows, [student.id]: { ...row, reason: event.target.value } })} /><label><span>Minh chứng</span><input disabled={locked} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setRows({ ...rows, [student.id]: { ...row, evidenceName: event.target.files?.[0]?.name || '' } })} /></label>{row.evidenceName ? <small>📎 {row.evidenceName}</small> : null}</div> : null}</article>; })}</div> : <EmptyState title="Chưa có danh sách lớp" text="Cần thêm học sinh trước khi điểm danh." />}
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>40 phiên gần nhất</small><h2>Lịch sử chuyên cần</h2></div></div>{historyKeys.length ? <div className="hr-history-list">{historyKeys.map((key) => { const data = workspace.attendance[key] || {}; const parsed = parseAttendanceSessionKey(key); return <button key={key} type="button" onClick={() => { setDate(parsed.date); setSession(parsed.session); setPeriod(parsed.period); }}><time>{formatViDate(parsed.date)}<small>{labelSession(parsed.session)}{parsed.period ? ` · Tiết ${parsed.period}` : ''}</small></time><span><b>{Object.values(data).filter((entry) => entry.status === 'present').length}/{Object.keys(data).length} có mặt</b><small>{Object.values(data).filter((entry) => ['excused', 'unexcused'].includes(entry.status)).length} vắng · {Object.values(data).filter((entry) => entry.status === 'late').length} trễ</small></span><i>{workspace.attendanceLocks?.[key]?.locked ? '🔒' : '→'}</i></button>; })}</div> : <p className="hr-muted">Chưa có dữ liệu chuyên cần.</p>}
      {(workspace.correctionRequests || []).length ? <div className="hr-correction-list"><h3>Yêu cầu chỉnh sửa</h3>{workspace.correctionRequests.slice(0, 20).map((item) => <article key={item.id}><b>{item.sessionKey}</b><span>{item.reason}</span><small>{item.requestedBy} · {item.status}</small>{item.status === 'pending' ? <div className="hr-row-actions"><button type="button" onClick={() => resolveRequest(item, true)}>Chấp thuận</button><button type="button" className="danger" onClick={() => resolveRequest(item, false)}>Từ chối</button></div> : null}</article>)}</div> : null}
    </section>
  </div>;
}

export function LearningTab({ workspace, onCommit, currentUser }) {
  const fileRef = useRef(null);
  const [draft, setDraft] = useState({ id: '', studentId: '', subject: 'Tiếng Anh', period: workspace.semester || 'Học kỳ I', assessment: 'Điểm thường xuyên', score: '', maxScore: '10', teacherName: currentUser?.name || '', note: '', recordedAt: todayIso() });
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [importState, setImportState] = useState({ fileName: '', rows: [], error: '' });
  const [settings, setSettings] = useState({ warningThreshold: workspace.gradeSettings?.warningThreshold ?? 6.5, highRiskThreshold: workspace.gradeSettings?.highRiskThreshold ?? 5 });
  const students = (workspace.students || []).filter((item) => item.active !== false);
  const analytics = students.map((student) => ({ student, ...studentMetrics(workspace, student.id) }));
  const subjects = [...new Set((workspace.learningRecords || []).map((item) => item.subject).filter(Boolean))];
  const visible = (workspace.learningRecords || []).filter((item) => subjectFilter === 'all' || item.subject === subjectFilter);
  const metrics = classMetrics(workspace);

  const save = async () => {
    if (!draft.studentId || !safeText(draft.subject) || draft.score === '') return;
    await onCommit(addLearningRecord(workspace, { ...draft, score: Number(String(draft.score).replace(',', '.')), maxScore: Number(String(draft.maxScore).replace(',', '.')) || 10 }), draft.id ? 'Đã cập nhật kết quả học tập.' : 'Đã thêm kết quả học tập.');
    setDraft((current) => ({ ...current, id: '', score: '', note: '', recordedAt: todayIso() }));
  };
  const readFile = async (file) => {
    if (!file) return;
    try { setImportState({ fileName: file.name, rows: await parseLearningFile(file), error: '' }); }
    catch (error) { setImportState({ fileName: file.name, rows: [], error: error.message || 'Không đọc được file.' }); }
  };
  const importAll = async () => {
    let next = workspace; let added = 0; let skipped = 0;
    importState.rows.forEach((row) => {
      const student = students.find((item) => (row.studentCode && item.code === row.studentCode) || (row.studentName && item.fullName.toLowerCase() === row.studentName.toLowerCase()));
      if (!student) { skipped += 1; return; }
      try { next = addLearningRecord(next, { ...row, studentId: student.id, subject: row.subject || draft.subject, period: row.period || draft.period, teacherName: row.teacherName || draft.teacherName }); added += 1; } catch { skipped += 1; }
    });
    await onCommit(next, `Đã nhập ${added} kết quả; bỏ qua ${skipped} dòng không khớp học sinh.`);
    setImportState({ fileName: '', rows: [], error: '' });
  };
  const downloadTemplate = () => downloadCsv('mau-bang-diem-hoc-sinh.csv', [['Mã HS', 'Họ và tên', 'Môn học', 'Học kỳ', 'Loại điểm', 'Điểm', 'Thang điểm', 'Ngày', 'Giáo viên', 'Ghi chú'], ['126701', 'Nguyễn Minh Anh', 'Tiếng Anh', 'Học kỳ I', 'Điểm thường xuyên', '8,5', '10', '20/07/2026', 'Nguyễn Anh Tuấn', '']]);
  const remove = (id) => onCommit({ ...workspace, learningRecords: workspace.learningRecords.filter((item) => item.id !== id) }, 'Đã xóa kết quả học tập.');

  return <div className="hr-tab-stack">
    <section className="hr-stat-grid"><StatCard icon="∑" label="Điểm trung bình lớp" value={Number.isFinite(metrics.classAverage) ? metrics.classAverage.toFixed(1) : '—'} note={`${workspace.learningRecords?.length || 0} kết quả`} /><StatCard icon="!" label="Nguy cơ cao" value={analytics.filter((item) => Number.isFinite(item.average) && item.average < settings.highRiskThreshold).length} note={`Dưới ${settings.highRiskThreshold}`} tone="red" /><StatCard icon="◎" label="Cần theo dõi" value={analytics.filter((item) => Number.isFinite(item.average) && item.average < settings.warningThreshold).length} note={`Dưới ${settings.warningThreshold}`} tone="orange" /><StatCard icon="▦" label="Môn đã theo dõi" value={subjects.length} note={subjects.join(' · ') || 'Chưa có dữ liệu'} tone="green" /></section>
    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Nhập trực tiếp</small><h2>Kết quả học tập</h2></div><button type="button" className="primary" onClick={save}>{draft.id ? 'Cập nhật' : 'Lưu điểm'}</button></div><div className="hr-form-grid two"><label><span>Học sinh</span><select value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Môn học</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label><label><span>Giai đoạn</span><input value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label><label><span>Loại đánh giá</span><input value={draft.assessment} onChange={(event) => setDraft({ ...draft, assessment: event.target.value })} /></label><label><span>Điểm</span><input inputMode="decimal" value={draft.score} onChange={(event) => setDraft({ ...draft, score: event.target.value })} /></label><label><span>Thang điểm</span><input inputMode="decimal" value={draft.maxScore} onChange={(event) => setDraft({ ...draft, maxScore: event.target.value })} /></label><label><span>Ngày</span><input type="date" value={draft.recordedAt} onChange={(event) => setDraft({ ...draft, recordedAt: event.target.value })} /></label><label><span>Giáo viên</span><input value={draft.teacherName} onChange={(event) => setDraft({ ...draft, teacherName: event.target.value })} /></label></div><label className="hr-wide-field"><span>Ghi chú</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label></article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Excel / CSV</small><h2>Nhập bảng điểm hàng loạt</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={downloadTemplate}>Tải file mẫu</button><button type="button" className="secondary" onClick={() => fileRef.current?.click()}>Chọn file</button><button type="button" className="primary" disabled={!importState.rows.length} onClick={importAll}>Nhập dữ liệu</button></div></div><input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(event) => readFile(event.target.files?.[0])} />{importState.fileName ? <p><b>{importState.fileName}</b> · {importState.rows.length} dòng hợp lệ</p> : <p className="hr-muted">Nhận diện tự động theo tiêu đề cột; không gửi dữ liệu ra ngoài.</p>}{importState.error ? <p className="hr-error">{importState.error}</p> : null}<div className="hr-form-grid two"><label><span>Cần theo dõi dưới</span><input type="number" step="0.1" value={settings.warningThreshold} onChange={(event) => setSettings({ ...settings, warningThreshold: event.target.value })} /></label><label><span>Nguy cơ cao dưới</span><input type="number" step="0.1" value={settings.highRiskThreshold} onChange={(event) => setSettings({ ...settings, highRiskThreshold: event.target.value })} /></label></div><button type="button" className="secondary" onClick={() => onCommit(updateGradeSettings(workspace, { warningThreshold: Number(settings.warningThreshold), highRiskThreshold: Number(settings.highRiskThreshold) }), 'Đã lưu ngưỡng cảnh báo.')}>Lưu ngưỡng</button></article>
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Phân tích ngoại tuyến</small><h2>Tình hình học tập theo học sinh</h2></div><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="all">Tất cả môn</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></div><div className="hr-analytics-grid">{analytics.map((item) => { const risk = !Number.isFinite(item.average) ? 'medium' : item.average < settings.highRiskThreshold ? 'high' : item.average < settings.warningThreshold ? 'medium' : 'low'; return <article key={item.student.id} className={`hr-analytics-card risk-${risk}`}><header><span>{item.student.fullName.slice(0, 1)}</span><div><b>{item.student.fullName}</b><small>{item.student.code || 'Chưa có mã'}</small></div><em>{risk === 'high' ? 'Nguy cơ cao' : risk === 'medium' ? 'Cần theo dõi' : 'Ổn định'}</em></header><div className="hr-analytics-score"><strong>{Number.isFinite(item.average) ? item.average.toFixed(1) : '—'}</strong><span><i style={{ width: `${Math.max(0, Math.min(100, (item.average || 0) * 10))}%` }} /></span></div><footer><small>{item.scoreCount} điểm</small><small>Vắng KP {item.unexcused}</small><small>Trễ {item.late}</small></footer></article>; })}</div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{visible.length} kết quả</small><h2>Lịch sử điểm</h2></div></div>{visible.length ? <div className="hr-preview-table"><table><thead><tr><th>Ngày</th><th>Học sinh</th><th>Môn</th><th>Đánh giá</th><th>Điểm</th><th /></tr></thead><tbody>{visible.slice(0, 300).map((item) => <tr key={item.id}><td>{formatViDate(item.recordedAt)}</td><td>{workspace.students.find((student) => student.id === item.studentId)?.fullName || '—'}</td><td>{item.subject}</td><td>{item.assessment}</td><td><b>{item.score}/{item.maxScore}</b></td><td><div className="hr-row-actions"><button type="button" onClick={() => setDraft({ ...draft, ...item })}>Sửa</button><button type="button" className="danger" onClick={() => remove(item.id)}>Xóa</button></div></td></tr>)}</tbody></table></div> : <p className="hr-muted">Chưa có kết quả học tập.</p>}</section>
  </div>;
}

export function ScheduleTab({ workspace, onCommit }) {
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(EMPTY_EVENT);
  const [editingId, setEditingId] = useState('');
  const [range, setRange] = useState('upcoming');
  const [importState, setImportState] = useState({ fileName: '', rows: [], error: '' });
  const visible = (workspace.schedule || []).filter((item) => range === 'all' || range === 'done' ? (range === 'all' || item.status === 'Hoàn thành') : (!item.date || item.date >= todayIso()) && item.status !== 'Hoàn thành');
  const save = async () => {
    if (!safeText(draft.title)) return;
    await onCommit(addScheduleItem(workspace, { ...draft, id: editingId || draft.id }), editingId ? 'Đã cập nhật công việc.' : 'Đã thêm công việc.');
    setDraft({ ...EMPTY_EVENT, date: draft.date || todayIso() }); setEditingId('');
  };
  const readFile = async (file) => {
    if (!file) return;
    try { setImportState({ fileName: file.name, rows: await parseScheduleFile(file), error: '' }); }
    catch (error) { setImportState({ fileName: file.name, rows: [], error: error.message || 'Không đọc được file.' }); }
  };
  const importAll = async () => {
    let next = workspace;
    importState.rows.forEach((item) => { try { next = addScheduleItem(next, item); } catch { /* skip */ } });
    await onCommit(next, `Đã nhập ${importState.rows.length} công việc từ file.`);
    setImportState({ fileName: '', rows: [], error: '' });
  };
  const downloadTemplate = () => downloadCsv('mau-lich-cong-viec-gvcn.csv', [['Nội dung công việc', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Địa điểm', 'Loại công việc', 'Đối tượng', 'Ghi chú', 'Trạng thái'], ['Họp phụ huynh đầu năm', '25/08/2026', '08:00', '10:00', 'Phòng 12.1', 'Họp phụ huynh', 'Phụ huynh', 'Chuẩn bị danh sách và tài liệu', 'Sắp tới']]);
  const patch = (id, data, message) => onCommit({ ...workspace, schedule: workspace.schedule.map((item) => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item) }, message);
  return <div className="hr-tab-stack">
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Lịch riêng của GVCN</small><h2>{editingId ? 'Chỉnh sửa công việc' : 'Thêm công việc'}</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={downloadTemplate}>Tải file mẫu</button><button type="button" className="secondary" onClick={() => fileRef.current?.click()}>Nhập lịch từ file</button><button type="button" className="primary" onClick={save}>{editingId ? 'Cập nhật' : 'Thêm vào lịch'}</button></div></div><input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(event) => readFile(event.target.files?.[0])} /><div className="hr-form-grid four"><label><span>Nội dung công việc</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>Ngày</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label><span>Bắt đầu</span><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label><label><span>Kết thúc</span><input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label><label><span>Loại công việc</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{SCHEDULE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Địa điểm / link</span><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><label><span>Đối tượng</span><input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label><label><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Sắp tới</option><option>Đang thực hiện</option><option>Hoàn thành</option><option>Đã hủy</option></select></label></div><label className="hr-wide-field"><span>Nội dung chuẩn bị / ghi chú</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>{editingId ? <button type="button" className="text-btn" onClick={() => { setEditingId(''); setDraft(EMPTY_EVENT); }}>Hủy chỉnh sửa</button> : null}{importState.fileName ? <div className="hrc-import-preview"><b>{importState.fileName}</b><span>{importState.rows.length} công việc hợp lệ</span><button type="button" className="primary" disabled={!importState.rows.length} onClick={importAll}>Nhập tất cả</button>{importState.error ? <p className="hr-error">{importState.error}</p> : null}</div> : null}</section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{visible.length} công việc</small><h2>Lịch công việc chủ nhiệm</h2></div><select value={range} onChange={(event) => setRange(event.target.value)}><option value="upcoming">Đang chờ / sắp tới</option><option value="done">Đã hoàn thành</option><option value="all">Tất cả</option></select></div>{visible.length ? <div className="hr-schedule-list">{visible.map((item) => <article key={item.id}><time><b>{item.date ? new Date(`${item.date}T00:00:00`).getDate() : '—'}</b><small>{item.date ? `Tháng ${new Date(`${item.date}T00:00:00`).getMonth() + 1}` : 'Chưa ngày'}</small></time><div><span className="hr-category-chip">{item.category}</span><h3>{item.title}</h3><p>{item.startTime || 'Cả ngày'}{item.endTime ? ` – ${item.endTime}` : ''} · {item.location || 'Chưa có địa điểm'} · {item.audience}</p><small>{item.note || 'Không có ghi chú'}</small></div><aside><span className={`hr-status-chip ${item.status === 'Hoàn thành' ? 'done' : ''}`}>{item.status}</span><button type="button" onClick={() => { setDraft({ ...EMPTY_EVENT, ...item }); setEditingId(item.id); }}>Sửa</button>{item.status !== 'Hoàn thành' ? <button type="button" onClick={() => patch(item.id, { status: 'Hoàn thành' }, 'Đã hoàn thành công việc.')}>Hoàn thành</button> : null}<button type="button" onClick={() => onCommit(addScheduleItem(workspace, { ...item, id: '', title: `${item.title} · Bản sao` }), 'Đã nhân bản công việc.')}>Nhân bản</button><button type="button" className="danger" onClick={() => onCommit({ ...workspace, schedule: workspace.schedule.filter((entry) => entry.id !== item.id) }, 'Đã xóa công việc.')}>Xóa</button></aside></article>)}</div> : <EmptyState title="Chưa có lịch công việc" text="Thêm thủ công hoặc nhập Excel/CSV theo file mẫu." action={() => fileRef.current?.click()} actionLabel="Nhập lịch từ file" />}</section>
  </div>;
}
