import React, { useMemo, useState } from 'react';
import {
  addReminder,
  regenerateStudentPortalPin,
  revokeAllPortalAccess,
  toggleReminder,
} from '../utils/homeroomStore.js';
import {
  addIncident,
  addSupportPlan,
  buildClassSummary,
  createManualBackup,
  removeBackup,
  restoreWorkspaceBackup,
  searchWorkspace,
  updateIncidentStatus,
  updateSupportPlan,
} from '../utils/homeroomPhase3.js';

function today() { return new Date().toISOString().slice(0, 10); }
function safeText(value) { return String(value ?? '').trim(); }
function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export function ClassLifecycleTab({ workspace, catalog, currentId, onSwitch, onCreate, onDuplicate, onStatusChange, currentUser }) {
  const [draft, setDraft] = useState({ className: '', schoolYear: workspace.classProfile.schoolYear || '', semester: 'Học kỳ I', grade: workspace.classProfile.grade || '12', room: '' });
  const [copy, setCopy] = useState({ className: `${workspace.classProfile.className || 'Lớp'} · Năm học mới`, schoolYear: workspace.classProfile.schoolYear || '', semester: 'Học kỳ I', keepHistory: false });
  const active = catalog.filter((item) => item.status !== 'archived');
  const archived = catalog.filter((item) => item.status === 'archived');
  const create = async () => {
    if (!safeText(draft.className)) return;
    await onCreate(draft);
    setDraft((value) => ({ ...value, className: '', room: '' }));
  };
  const duplicate = async () => {
    if (!safeText(copy.className)) return;
    await onDuplicate(copy);
  };
  return <div className="hr-tab-stack">
    <section className="hr-panel hr-phase3-banner"><div><small>GIAI ĐOẠN 3 · ĐỢT 1</small><h2>Nhiều lớp, nhiều năm học và lưu trữ an toàn</h2><p>Mỗi lớp có không gian riêng. Dữ liệu lớp cũ được lưu trữ, không bị xóa khi đổi năm học hoặc chuyển lớp chủ nhiệm.</p></div><span>{active.length} lớp đang hoạt động</span></section>

    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Không gian hiện có</small><h2>Chuyển nhanh giữa các lớp</h2></div></div>
      <div className="hr-class-catalog">{active.map((item) => <article key={item.id} className={item.id === currentId ? 'current' : ''}><header><span>{item.grade || 'Lớp'}</span><div><h3>{item.className}</h3><small>{item.schoolYear || '—'} · {item.semester || '—'}</small></div></header><div className="hr-class-card-stats"><b>{item.studentCount || 0}<small>học sinh</small></b><b>{formatDateTime(item.updatedAt)}<small>cập nhật</small></b></div><footer>{item.id === currentId ? <strong>Đang mở</strong> : <button type="button" onClick={() => onSwitch(item.id)}>Mở lớp</button>}<button type="button" className="danger" disabled={item.id === currentId && active.length <= 1} onClick={() => onStatusChange(item.id, 'archived')}>Lưu trữ</button></footer></article>)}</div>
      {!active.length ? <p className="hr-muted">Chưa có lớp đang hoạt động.</p> : null}
    </section>

    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Tạo mới</small><h2>Thêm lớp chủ nhiệm</h2></div><button type="button" className="primary" onClick={create}>Tạo lớp</button></div><div className="hr-form-grid two"><label><span>Tên lớp</span><input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} placeholder="12.6" /></label><label><span>Năm học</span><input value={draft.schoolYear} onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })} /></label><label><span>Học kỳ</span><select value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })}><option>Học kỳ I</option><option>Học kỳ II</option><option>Cả năm</option><option>Hè</option></select></label><label><span>Khối</span><input value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })} /></label><label><span>Phòng</span><input value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value })} /></label><label><span>GVCN</span><input value={currentUser?.name || currentUser?.email || ''} readOnly /></label></div></article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Chuyển năm học</small><h2>Sao chép lớp hiện tại</h2></div><button type="button" className="primary" onClick={duplicate}>Tạo bản sao</button></div><div className="hr-form-grid two"><label><span>Tên lớp mới</span><input value={copy.className} onChange={(e) => setCopy({ ...copy, className: e.target.value })} /></label><label><span>Năm học mới</span><input value={copy.schoolYear} onChange={(e) => setCopy({ ...copy, schoolYear: e.target.value })} /></label><label><span>Học kỳ</span><select value={copy.semester} onChange={(e) => setCopy({ ...copy, semester: e.target.value })}><option>Học kỳ I</option><option>Học kỳ II</option><option>Cả năm</option></select></label><label className="hr-check-label"><input type="checkbox" checked={copy.keepHistory} onChange={(e) => setCopy({ ...copy, keepHistory: e.target.checked })} /><span>Giữ điểm, chuyên cần và lịch sử cũ</span></label></div><p className="hr-security-note">Mặc định hệ thống chỉ sao chép danh sách học sinh và cấu hình lớp; dữ liệu lịch sử không được mang sang năm học mới.</p></article>
    </section>

    {archived.length ? <section className="hr-panel"><div className="hr-panel-head"><div><small>{archived.length} lớp</small><h2>Kho lớp đã lưu trữ</h2></div></div><div className="hr-archive-list">{archived.map((item) => <article key={item.id}><div><b>{item.className}</b><small>{item.schoolYear} · lưu trữ {formatDateTime(item.archivedAt)}</small></div><button type="button" onClick={() => onStatusChange(item.id, 'active')}>Khôi phục</button><button type="button" onClick={() => onSwitch(item.id)}>Xem dữ liệu</button></article>)}</div></section> : null}
  </div>;
}

export function StudentSupportTab({ workspace, onCommit, currentUser }) {
  const students = workspace.students.filter((student) => student.active !== false);
  const [incident, setIncident] = useState({ studentId: '', date: today(), category: 'Nề nếp', severity: 'low', title: '', description: '', discoveredBy: currentUser?.name || '', peopleInvolved: '', actionTaken: '', followUpDate: '', outcome: '', status: 'open', evidenceName: '' });
  const [plan, setPlan] = useState({ studentId: '', title: '', goal: '', actions: '', collaborators: '', startDate: today(), reviewDate: '', successCriteria: '', progress: '', status: 'active' });
  const saveIncident = async () => {
    try { await onCommit(addIncident(workspace, incident), 'Đã lưu hồ sơ sự việc học sinh.'); setIncident((value) => ({ ...value, title: '', description: '', actionTaken: '', outcome: '', evidenceName: '' })); } catch (error) { window.alert(error.message); }
  };
  const savePlan = async () => {
    try { await onCommit(addSupportPlan(workspace, plan), 'Đã lưu kế hoạch hỗ trợ học sinh.'); setPlan((value) => ({ ...value, title: '', goal: '', actions: '', progress: '' })); } catch (error) { window.alert(error.message); }
  };
  const studentName = (id) => workspace.students.find((item) => item.id === id)?.fullName || '—';
  return <div className="hr-tab-stack">
    <section className="hr-stat-grid">
      <article className="hr-stat tone-red"><span>!</span><div><small>Sự việc đang mở</small><strong>{workspace.incidents.filter((item) => item.status !== 'closed').length}</strong><em>Cần tiếp tục theo dõi</em></div></article>
      <article className="hr-stat tone-green"><span>◎</span><div><small>Kế hoạch hỗ trợ</small><strong>{workspace.supportPlans.filter((item) => item.status === 'active').length}</strong><em>Đang triển khai</em></div></article>
      <article className="hr-stat tone-orange"><span>◷</span><div><small>Đến hạn 7 ngày</small><strong>{workspace.supportPlans.filter((item) => item.reviewDate && item.reviewDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) && item.status === 'active').length}</strong><em>Cần đánh giá tiến độ</em></div></article>
      <article className="hr-stat tone-blue"><span>♙</span><div><small>Học sinh ưu tiên</small><strong>{students.filter((item) => item.supportLevel === 'priority').length}</strong><em>Do GVCN xác nhận</em></div></article>
    </section>

    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Nhật ký sự việc</small><h2>Ghi nhận và xử lý</h2></div><button type="button" className="primary" onClick={saveIncident}>Lưu sự việc</button></div><div className="hr-form-grid two"><label><span>Học sinh</span><select value={incident.studentId} onChange={(e) => setIncident({ ...incident, studentId: e.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Ngày</span><input type="date" value={incident.date} onChange={(e) => setIncident({ ...incident, date: e.target.value })} /></label><label><span>Nhóm sự việc</span><select value={incident.category} onChange={(e) => setIncident({ ...incident, category: e.target.value })}><option>Nề nếp</option><option>Học tập</option><option>Quan hệ bạn bè</option><option>Sức khỏe</option><option>Tâm lý</option><option>An toàn</option><option>Khác</option></select></label><label><span>Mức độ</span><select value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}><option value="low">Thông thường</option><option value="medium">Cần phối hợp</option><option value="high">Ưu tiên cao</option></select></label><label><span>Tiêu đề</span><input value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} /></label><label><span>Hạn theo dõi</span><input type="date" value={incident.followUpDate} onChange={(e) => setIncident({ ...incident, followUpDate: e.target.value })} /></label></div><label className="hr-wide-field"><span>Mô tả khách quan</span><textarea value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} /></label><label className="hr-wide-field"><span>Biện pháp đã thực hiện</span><textarea value={incident.actionTaken} onChange={(e) => setIncident({ ...incident, actionTaken: e.target.value })} /></label><div className="hr-form-grid two"><label><span>Người phối hợp</span><input value={incident.peopleInvolved} onChange={(e) => setIncident({ ...incident, peopleInvolved: e.target.value })} /></label><label><span>Tên file minh chứng</span><input value={incident.evidenceName} onChange={(e) => setIncident({ ...incident, evidenceName: e.target.value })} placeholder="Không tải dữ liệu nhạy cảm nếu không cần" /></label></div></article>

      <article className="hr-panel"><div className="hr-panel-head"><div><small>Kế hoạch can thiệp</small><h2>Hỗ trợ có mục tiêu</h2></div><button type="button" className="primary" onClick={savePlan}>Lưu kế hoạch</button></div><div className="hr-form-grid two"><label><span>Học sinh</span><select value={plan.studentId} onChange={(e) => setPlan({ ...plan, studentId: e.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Tên kế hoạch</span><input value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} /></label><label><span>Bắt đầu</span><input type="date" value={plan.startDate} onChange={(e) => setPlan({ ...plan, startDate: e.target.value })} /></label><label><span>Ngày đánh giá</span><input type="date" value={plan.reviewDate} onChange={(e) => setPlan({ ...plan, reviewDate: e.target.value })} /></label></div><label className="hr-wide-field"><span>Mục tiêu cụ thể</span><textarea value={plan.goal} onChange={(e) => setPlan({ ...plan, goal: e.target.value })} /></label><label className="hr-wide-field"><span>Hoạt động / biện pháp</span><textarea value={plan.actions} onChange={(e) => setPlan({ ...plan, actions: e.target.value })} /></label><div className="hr-form-grid two"><label><span>Người phối hợp</span><input value={plan.collaborators} onChange={(e) => setPlan({ ...plan, collaborators: e.target.value })} /></label><label><span>Tiêu chí hoàn thành</span><input value={plan.successCriteria} onChange={(e) => setPlan({ ...plan, successCriteria: e.target.value })} /></label></div></article>
    </section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.incidents.length} hồ sơ</small><h2>Lịch sử sự việc</h2></div></div>{workspace.incidents.length ? <div className="hr-case-grid">{workspace.incidents.map((item) => <article key={item.id} className={`severity-${item.severity}`}><header><span>{item.category}</span><small>{item.date}</small></header><h3>{item.title}</h3><b>{studentName(item.studentId)}</b><p>{item.description || 'Không có mô tả.'}</p><small>{item.actionTaken ? `Đã xử lý: ${item.actionTaken}` : 'Chưa ghi biện pháp'}</small><footer><select value={item.status} onChange={(e) => onCommit(updateIncidentStatus(workspace, item.id, { status: e.target.value }), 'Đã cập nhật trạng thái sự việc.')}><option value="open">Đang theo dõi</option><option value="monitoring">Đang phối hợp</option><option value="closed">Đã kết thúc</option></select>{item.followUpDate ? <time>Hẹn: {item.followUpDate}</time> : null}</footer></article>)}</div> : <p className="hr-muted">Chưa có sự việc nào được ghi nhận.</p>}</section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.supportPlans.length} kế hoạch</small><h2>Tiến độ hỗ trợ</h2></div></div>{workspace.supportPlans.length ? <div className="hr-support-plan-list">{workspace.supportPlans.map((item) => <article key={item.id}><div><span className={item.status}>{item.status === 'active' ? 'Đang thực hiện' : item.status === 'completed' ? 'Hoàn thành' : 'Tạm dừng'}</span><h3>{item.title}</h3><b>{studentName(item.studentId)}</b><p>{item.goal}</p></div><label><span>Tiến độ / kết quả</span><textarea value={item.progress || ''} onChange={(e) => onCommit(updateSupportPlan(workspace, item.id, { progress: e.target.value }), 'Đã cập nhật tiến độ kế hoạch.')} /></label><select value={item.status} onChange={(e) => onCommit(updateSupportPlan(workspace, item.id, { status: e.target.value }), 'Đã cập nhật kế hoạch hỗ trợ.')}><option value="active">Đang thực hiện</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option></select></article>)}</div> : <p className="hr-muted">Chưa có kế hoạch hỗ trợ.</p>}</section>
  </div>;
}

export function DataSafetyTab({ workspace, onCommit, currentUser }) {
  const [backupLabel, setBackupLabel] = useState('');
  const [security, setSecurity] = useState({ ...workspace.portalConfig });
  const summary = buildClassSummary(workspace);
  const createBackup = () => onCommit(createManualBackup(workspace, currentUser, backupLabel), 'Đã tạo bản sao lưu thủ công.').then(() => setBackupLabel(''));
  const restore = (id) => {
    if (!window.confirm('Khôi phục bản sao lưu này? Dữ liệu hiện tại sẽ được thay thế nhưng vẫn giữ lịch sử sao lưu.')) return;
    onCommit(restoreWorkspaceBackup(workspace, id, currentUser), 'Đã khôi phục bản sao lưu.');
  };
  const saveSecurity = () => onCommit({ ...workspace, portalConfig: { ...workspace.portalConfig, ...security }, settings: { ...workspace.settings, privacyMode: security.privacyMode || workspace.settings.privacyMode, inactivityLogoutMinutes: Number(security.inactivityLogoutMinutes || workspace.settings.inactivityLogoutMinutes) } }, 'Đã lưu cấu hình an toàn dữ liệu.');
  const resetPin = (studentId) => onCommit(regenerateStudentPortalPin(workspace, studentId), 'Đã tạo PIN mới cho học sinh.');
  const revoke = () => {
    if (!window.confirm('Thu hồi toàn bộ mã cổng và tạo lại PIN cho tất cả học sinh?')) return;
    onCommit(revokeAllPortalAccess(workspace), 'Đã thu hồi toàn bộ quyền truy cập cổng.');
  };
  return <div className="hr-tab-stack">
    <section className="hr-stat-grid"><article className="hr-stat tone-blue"><span>⟲</span><div><small>Bản sao lưu</small><strong>{workspace.backups.length}</strong><em>Tối đa 30 phiên bản</em></div></article><article className="hr-stat tone-green"><span>☷</span><div><small>Nhật ký thay đổi</small><strong>{workspace.auditLogs.length}</strong><em>Ai sửa, lúc nào, nội dung gì</em></div></article><article className="hr-stat tone-orange"><span>♙</span><div><small>Hồ sơ lưu trữ</small><strong>{summary.archivedStudents}</strong><em>Không xóa vĩnh viễn</em></div></article><article className="hr-stat tone-red"><span>!</span><div><small>Việc quá hạn</small><strong>{summary.dueReminders}</strong><em>Nhắc việc chưa hoàn thành</em></div></article></section>

    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Sao lưu & khôi phục</small><h2>Điểm phục hồi dữ liệu</h2></div><button type="button" className="primary" onClick={createBackup}>Tạo sao lưu</button></div><label className="hr-wide-field"><span>Tên bản sao lưu</span><input value={backupLabel} onChange={(e) => setBackupLabel(e.target.value)} placeholder="Ví dụ: Trước khi nhập điểm học kỳ" /></label><div className="hr-backup-list">{workspace.backups.map((item) => <article key={item.id}><div><b>{item.label}</b><small>{formatDateTime(item.createdAt)} · {item.kind === 'automatic' ? 'Tự động' : 'Thủ công'}</small></div><button type="button" onClick={() => restore(item.id)}>Khôi phục</button><button type="button" className="danger" onClick={() => onCommit(removeBackup(workspace, item.id), 'Đã xóa điểm sao lưu.')}>Xóa</button></article>)}</div></article>

      <article className="hr-panel"><div className="hr-panel-head"><div><small>Bảo mật cổng</small><h2>PIN, khóa truy cập và quyền riêng tư</h2></div><button type="button" className="primary" onClick={saveSecurity}>Lưu bảo mật</button></div><div className="hr-form-grid two"><label><span>Số lần nhập sai tối đa</span><input type="number" min="3" max="10" value={security.maxFailedAttempts || 5} onChange={(e) => setSecurity({ ...security, maxFailedAttempts: Number(e.target.value) })} /></label><label><span>Khóa tạm thời (phút)</span><input type="number" min="5" max="120" value={security.lockMinutes || 15} onChange={(e) => setSecurity({ ...security, lockMinutes: Number(e.target.value) })} /></label><label><span>Phiên truy cập (phút)</span><input type="number" min="10" max="240" value={security.sessionMinutes || 30} onChange={(e) => setSecurity({ ...security, sessionMinutes: Number(e.target.value) })} /></label><label><span>Tự đăng xuất GVCN (phút)</span><input type="number" min="5" max="240" value={security.inactivityLogoutMinutes || workspace.settings.inactivityLogoutMinutes || 30} onChange={(e) => setSecurity({ ...security, inactivityLogoutMinutes: Number(e.target.value) })} /></label><label><span>Chế độ dữ liệu cục bộ</span><select value={security.privacyMode || workspace.settings.privacyMode || 'balanced'} onChange={(e) => setSecurity({ ...security, privacyMode: e.target.value })}><option value="balanced">Cân bằng: lưu local + cloud</option><option value="cloud-only">Ưu tiên cloud, hạn chế local</option><option value="device-only">Chỉ thiết bị hiện tại</option></select></label><label className="hr-check-label"><input type="checkbox" checked={security.requireStrongPin !== false} onChange={(e) => setSecurity({ ...security, requireStrongPin: e.target.checked })} /><span>Bắt buộc PIN 6 chữ số</span></label></div><button type="button" className="danger wide" onClick={revoke}>Thu hồi toàn bộ quyền truy cập</button></article>
    </section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>PIN cá nhân</small><h2>Quản lý quyền truy cập học sinh</h2></div></div><div className="hr-preview-table"><table><thead><tr><th>Học sinh</th><th>Mã</th><th>PIN</th><th>Cập nhật</th><th /></tr></thead><tbody>{workspace.students.filter((item) => item.active !== false).map((student) => <tr key={student.id}><td>{student.fullName}</td><td>{student.code || student.id}</td><td><b className="hr-pin">{student.portalPin}</b></td><td>{formatDateTime(student.pinUpdatedAt)}</td><td><button type="button" className="secondary" onClick={() => resetPin(student.id)}>Tạo PIN mới</button></td></tr>)}</tbody></table></div></section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.auditLogs.length} thay đổi gần nhất</small><h2>Nhật ký hoạt động</h2></div></div>{workspace.auditLogs.length ? <div className="hr-audit-list">{workspace.auditLogs.map((item) => <article key={item.id}><span>{item.action.slice(0, 1)}</span><div><b>{item.action}</b><p>{item.summary}</p><small>{item.actorName} · {formatDateTime(item.createdAt)} · {item.source}</small></div></article>)}</div> : <p className="hr-muted">Nhật ký sẽ được tạo từ lần lưu dữ liệu tiếp theo.</p>}</section>
  </div>;
}

export function SearchCommandTab({ workspace, onCommit, goTab }) {
  const [query, setQuery] = useState('');
  const [reminder, setReminder] = useState({ title: '', dueDate: today(), dueTime: '', category: 'Chủ nhiệm', linkedTab: '' });
  const results = useMemo(() => searchWorkspace(workspace, query), [workspace, query]);
  const add = async () => {
    if (!safeText(reminder.title)) return;
    await onCommit(addReminder(workspace, reminder), 'Đã thêm nhắc việc.');
    setReminder({ title: '', dueDate: today(), dueTime: '', category: 'Chủ nhiệm', linkedTab: '' });
  };
  const upcoming = [...workspace.reminders].filter((item) => !item.done).sort((a, b) => `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`));
  return <div className="hr-tab-stack">
    <section className="hr-panel hr-command-search"><div><small>ĐỢT 3 · TÌM KIẾM TOÀN HỆ THỐNG</small><h2>Tìm mọi dữ liệu trong lớp</h2><p>Tìm học sinh, lịch, sự việc, thông báo, nhận xét, liên hệ phụ huynh và hồ sơ trong một nơi.</p></div><input autoFocus placeholder="Nhập tên học sinh, nội dung, ngày, số điện thoại…" value={query} onChange={(e) => setQuery(e.target.value)} /></section>
    {query ? <section className="hr-panel"><div className="hr-panel-head"><div><small>{results.length} kết quả</small><h2>Kết quả tìm kiếm</h2></div></div>{results.length ? <div className="hr-search-results">{results.map((item) => <button key={`${item.type}-${item.id}`} type="button" onClick={() => goTab(item.tab)}><span>{item.type.slice(0, 1)}</span><div><b>{item.title}</b><small>{item.type} · {item.subtitle || '—'}</small><p>{String(item.text || '').slice(0, 180)}</p></div><i>→</i></button>)}</div> : <p className="hr-muted">Không tìm thấy dữ liệu phù hợp.</p>}</section> : null}
    <section className="hr-two-column"><article className="hr-panel"><div className="hr-panel-head"><div><small>Nhắc việc</small><h2>Thêm công việc cần theo dõi</h2></div><button type="button" className="primary" onClick={add}>Thêm nhắc việc</button></div><div className="hr-form-grid two"><label><span>Nội dung</span><input value={reminder.title} onChange={(e) => setReminder({ ...reminder, title: e.target.value })} /></label><label><span>Phân hệ liên quan</span><select value={reminder.linkedTab} onChange={(e) => setReminder({ ...reminder, linkedTab: e.target.value })}><option value="">Không liên kết</option><option value="attendance">Điểm danh</option><option value="support">Hỗ trợ học sinh</option><option value="parents">Phụ huynh</option><option value="records">Hồ sơ</option></select></label><label><span>Ngày</span><input type="date" value={reminder.dueDate} onChange={(e) => setReminder({ ...reminder, dueDate: e.target.value })} /></label><label><span>Giờ</span><input type="time" value={reminder.dueTime} onChange={(e) => setReminder({ ...reminder, dueTime: e.target.value })} /></label></div></article><article className="hr-panel"><div className="hr-panel-head"><div><small>{upcoming.length} việc chưa xong</small><h2>Danh sách nhắc việc</h2></div></div><div className="hr-reminder-list">{upcoming.map((item) => <article key={item.id} className={item.dueDate < today() ? 'overdue' : ''}><button type="button" onClick={() => onCommit(toggleReminder(workspace, item.id), 'Đã hoàn thành nhắc việc.')}>✓</button><div><b>{item.title}</b><small>{item.dueDate} {item.dueTime} · {item.category}</small></div>{item.linkedTab ? <button type="button" onClick={() => goTab(item.linkedTab)}>Mở</button> : null}</article>)}</div></article></section>
  </div>;
}
