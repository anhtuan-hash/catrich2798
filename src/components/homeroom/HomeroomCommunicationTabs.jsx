import React, { useEffect, useMemo, useState } from 'react';
import {
  addAnnouncement,
  addCompetitionEvent,
  addMeeting,
  addMessageTemplate,
  addParentContact,
  addRecord,
  addSubjectFeedback,
  assignStudentTeam,
  exportWorkspaceJson,
  regenerateStudentPortalPin,
  revokeAllPortalAccess,
  scheduleParentMessage,
  setPortalConfig,
  upsertTeam,
} from '../../utils/homeroomStore.js';
import {
  buildLeaderboard,
  generatePortalCode,
  loadFeedbackInbox,
  loadPortalReceipts,
  loadPortalResponses,
  loadSchoolHomeroomStats,
  markFeedbackReviewed,
  publishHomeroomPortal,
} from '../../utils/homeroomPhase2.js';
import { downloadWordDocument, printRecordAsPdf } from '../../utils/homeroomPhase3.js';
import { CONTACT_CHANNELS, RECORD_TYPES } from '../../data/homeroom.js';
import {
  buildMeetingDraft,
  buildParentMessage,
  buildRecordDraft,
  downloadCsv,
  formatViDate,
  safeText,
  todayIso,
} from '../../utils/homeroomOfflineTools.js';
import { EmptyState, StatCard } from './HomeroomCoreTabs.jsx';

function copyText(text) {
  if (!text) return Promise.resolve(false);
  return navigator.clipboard?.writeText(text).then(() => true).catch(() => false) || Promise.resolve(false);
}

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function readSmallAttachment(file) {
  if (!file) return { attachmentName: '', attachmentType: '', attachmentData: '' };
  if (file.size > 1024 * 1024) throw new Error('Tệp đính kèm tối đa 1 MB.');
  const attachmentData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp đính kèm.'));
    reader.readAsDataURL(file);
  });
  return { attachmentName: file.name, attachmentType: file.type || 'application/octet-stream', attachmentData };
}

export function FeedbackTab({ workspace, onCommit, currentUser }) {
  const students = (workspace.students || []).filter((item) => item.active !== false);
  const [draft, setDraft] = useState({ studentId: '', subject: '', teacherName: currentUser?.name || '', teacherEmail: currentUser?.email || '', period: workspace.semester || '', level: 'Bình thường', comment: '', action: '' });
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const code = workspace.portalConfig?.subjectCode || '';
  const refresh = async () => {
    setLoading(true);
    const result = await loadFeedbackInbox(currentUser, workspace.id, code);
    setInbox(result.items || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [currentUser?.id, workspace.id, code]);
  const save = async () => {
    if (!draft.studentId || !safeText(draft.subject) || !safeText(draft.comment)) return;
    await onCommit(addSubjectFeedback(workspace, draft), 'Đã lưu nhận xét giáo viên bộ môn.');
    setDraft((value) => ({ ...value, comment: '', action: '' }));
  };
  const accept = async (item) => {
    const student = students.find((entry) => entry.code === item.student_ref || entry.id === item.student_ref);
    if (!student) { window.alert('Không tìm thấy học sinh tương ứng trong lớp.'); return; }
    const next = addSubjectFeedback(workspace, {
      inboxId: item.id, studentId: student.id, studentCode: student.code, subject: item.subject,
      teacherName: item.teacher_name, teacherEmail: item.teacher_email, period: item.period,
      level: item.level, comment: item.comment, action: item.suggested_action, createdAt: item.created_at,
    });
    await onCommit(next, 'Đã tiếp nhận nhận xét vào hồ sơ học sinh.');
    await markFeedbackReviewed(item.id, currentUser);
    refresh();
  };
  const remove = (id) => onCommit({ ...workspace, subjectFeedback: workspace.subjectFeedback.filter((item) => item.id !== id) }, 'Đã xóa nhận xét khỏi hồ sơ.');
  return <div className="hr-tab-stack">
    <section className="hr-panel hr-share-panel"><div><small>Kết nối giáo viên bộ môn</small><h2>Mã cổng nhận xét lớp {workspace.classProfile?.className || ''}</h2><p>Giáo viên bộ môn dùng mã cổng để gửi nhận xét. GVCN duyệt trước khi đưa vào hồ sơ.</p></div><div className="hr-code-box"><b>{code || 'Chưa tạo mã'}</b><button type="button" className="secondary" disabled={!code} onClick={() => copyText(`${window.location.origin}${window.location.pathname}#/homeroom-portal?role=subject&code=${encodeURIComponent(code)}`)}>Sao chép liên kết</button></div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Nhập trực tiếp</small><h2>Nhận xét giáo viên bộ môn</h2></div><button type="button" className="primary" onClick={save}>Lưu nhận xét</button></div><div className="hr-form-grid four"><label><span>Học sinh</span><select value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Môn học</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label><label><span>Giai đoạn</span><input value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label><label><span>Mức độ</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value })}><option>Bình thường</option><option>Tích cực</option><option>Cần hỗ trợ</option><option>Nguy cơ</option><option>Khẩn</option></select></label><label><span>Giáo viên</span><input value={draft.teacherName} onChange={(event) => setDraft({ ...draft, teacherName: event.target.value })} /></label><label><span>Email</span><input type="email" value={draft.teacherEmail} onChange={(event) => setDraft({ ...draft, teacherEmail: event.target.value })} /></label></div><label className="hr-wide-field"><span>Nhận xét</span><textarea value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} /></label><label className="hr-wide-field"><span>Đề xuất phối hợp</span><textarea value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} /></label></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Hộp thư nhận xét</small><h2>Chờ GVCN tiếp nhận</h2></div><button type="button" className="secondary" onClick={refresh}>{loading ? 'Đang tải…' : 'Làm mới'}</button></div>{inbox.filter((item) => item.status !== 'reviewed').length ? <div className="hr-feedback-inbox">{inbox.filter((item) => item.status !== 'reviewed').map((item) => <article key={item.id}><header><b>{students.find((student) => student.code === item.student_ref)?.fullName || item.student_ref}</b><span>{item.level}</span></header><small>{item.subject} · {item.teacher_name} · {item.period}</small><p>{item.comment}</p>{item.suggested_action ? <em>Đề xuất: {item.suggested_action}</em> : null}<button type="button" className="primary" onClick={() => accept(item)}>Tiếp nhận vào hồ sơ</button></article>)}</div> : <p className="hr-muted">Không có nhận xét mới đang chờ.</p>}</section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.subjectFeedback?.length || 0} nhận xét</small><h2>Hồ sơ đã tiếp nhận</h2></div></div>{workspace.subjectFeedback?.length ? <div className="hr-feedback-inbox accepted">{workspace.subjectFeedback.map((item) => <article key={item.id}><header><b>{students.find((student) => student.id === item.studentId)?.fullName || item.studentCode}</b><span>{item.level}</span></header><small>{item.subject} · {item.teacherName} · {item.period}</small><p>{item.comment}</p>{item.action ? <em>Phối hợp: {item.action}</em> : null}<button type="button" className="danger" onClick={() => remove(item.id)}>Xóa</button></article>)}</div> : <p className="hr-muted">Chưa có nhận xét giáo viên bộ môn.</p>}</section>
  </div>;
}

export function CompetitionTab({ workspace, onCommit }) {
  const [teamDraft, setTeamDraft] = useState({ id: '', name: '', symbol: '◆', note: '' });
  const [scoreDraft, setScoreDraft] = useState({ teamId: '', studentId: '', points: 10, reason: '', date: todayIso() });
  const leaderboard = useMemo(() => buildLeaderboard(workspace), [workspace]);
  const saveTeam = async () => {
    if (!safeText(teamDraft.name)) return;
    await onCommit(upsertTeam(workspace, teamDraft), teamDraft.id ? 'Đã cập nhật tổ/đội.' : 'Đã tạo tổ/đội thi đua.');
    setTeamDraft({ id: '', name: '', symbol: '◆', note: '' });
  };
  const score = async () => {
    if (!scoreDraft.teamId || !safeText(scoreDraft.reason)) return;
    await onCommit(addCompetitionEvent(workspace, scoreDraft), 'Đã cập nhật điểm thi đua.');
    setScoreDraft((value) => ({ ...value, points: 10, reason: '', studentId: '' }));
  };
  const removeTeam = async (teamId) => {
    const next = { ...workspace, teams: workspace.teams.filter((item) => item.id !== teamId), students: workspace.students.map((item) => item.teamId === teamId ? { ...item, teamId: '' } : item), competitionEvents: workspace.competitionEvents.filter((item) => item.teamId !== teamId) };
    await onCommit(next, 'Đã xóa tổ/đội và các biến động điểm liên quan.');
  };
  return <div className="hr-tab-stack">
    <section className="hr-leaderboard">{leaderboard.length ? leaderboard.map((team, index) => <article key={team.id} className={index === 0 ? 'winner' : ''}><span>{team.symbol}</span><small>Hạng {index + 1}</small><h3>{team.name}</h3><strong>{team.score}</strong><em>{team.members} thành viên</em></article>) : <EmptyState title="Chưa có tổ thi đua" text="Tạo tổ để phân công học sinh và ghi nhận điểm." />}</section>
    <section className="hr-two-column"><article className="hr-panel"><div className="hr-panel-head"><div><small>Thiết lập</small><h2>{teamDraft.id ? 'Chỉnh sửa tổ / đội' : 'Tạo tổ / đội'}</h2></div><button type="button" className="primary" onClick={saveTeam}>{teamDraft.id ? 'Cập nhật' : 'Thêm đội'}</button></div><div className="hr-form-grid two"><label><span>Biểu tượng</span><input value={teamDraft.symbol} onChange={(event) => setTeamDraft({ ...teamDraft, symbol: event.target.value })} /></label><label><span>Tên tổ / đội</span><input value={teamDraft.name} onChange={(event) => setTeamDraft({ ...teamDraft, name: event.target.value })} /></label></div><label className="hr-wide-field"><span>Ghi chú</span><textarea value={teamDraft.note} onChange={(event) => setTeamDraft({ ...teamDraft, note: event.target.value })} /></label></article><article className="hr-panel"><div className="hr-panel-head"><div><small>Ghi nhận</small><h2>Cộng / trừ điểm</h2></div><button type="button" className="primary" onClick={score}>Lưu điểm</button></div><div className="hr-form-grid two"><label><span>Tổ / đội</span><select value={scoreDraft.teamId} onChange={(event) => setScoreDraft({ ...scoreDraft, teamId: event.target.value })}><option value="">Chọn đội</option>{workspace.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label><span>Học sinh liên quan</span><select value={scoreDraft.studentId} onChange={(event) => setScoreDraft({ ...scoreDraft, studentId: event.target.value })}><option value="">Toàn đội</option>{workspace.students.filter((student) => student.active !== false && (!scoreDraft.teamId || student.teamId === scoreDraft.teamId)).map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Điểm</span><input type="number" value={scoreDraft.points} onChange={(event) => setScoreDraft({ ...scoreDraft, points: event.target.value })} /></label><label><span>Ngày</span><input type="date" value={scoreDraft.date} onChange={(event) => setScoreDraft({ ...scoreDraft, date: event.target.value })} /></label></div><label className="hr-wide-field"><span>Lý do</span><input value={scoreDraft.reason} onChange={(event) => setScoreDraft({ ...scoreDraft, reason: event.target.value })} /></label></article></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Phân tổ</small><h2>Danh sách học sinh</h2></div></div><div className="hr-team-roster">{workspace.students.filter((item) => item.active !== false).map((student) => <label key={student.id}><span><b>{student.fullName}</b><small>{student.code || 'Chưa có mã'}</small></span><select value={student.teamId || ''} onChange={(event) => onCommit(assignStudentTeam(workspace, student.id, event.target.value), 'Đã cập nhật tổ của học sinh.')}><option value="">Chưa phân tổ</option>{workspace.teams.map((team) => <option key={team.id} value={team.id}>{team.symbol} {team.name}</option>)}</select></label>)}</div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Quản lý tổ</small><h2>Danh sách tổ / đội</h2></div></div>{workspace.teams.length ? <div className="hr-compact-list">{workspace.teams.map((team) => <div key={team.id}><time>{team.symbol}<small>{workspace.students.filter((item) => item.teamId === team.id && item.active !== false).length} thành viên</small></time><span><b>{team.name}</b><small>{team.note || 'Không có ghi chú'}</small></span><div className="hr-row-actions"><button type="button" onClick={() => setTeamDraft(team)}>Sửa</button><button type="button" className="danger" onClick={() => removeTeam(team.id)}>Xóa</button></div></div>)}</div> : <p className="hr-muted">Chưa có tổ / đội.</p>}</section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.competitionEvents.length} biến động</small><h2>Nhật ký điểm thi đua</h2></div></div>{workspace.competitionEvents.length ? <div className="hr-compact-list">{workspace.competitionEvents.slice(0, 150).map((item) => <div key={item.id}><time>{formatViDate(item.date)}<small>{Number(item.points) >= 0 ? `+${item.points}` : item.points}</small></time><span><b>{workspace.teams.find((team) => team.id === item.teamId)?.name || 'Đội đã xóa'}</b><small>{item.reason}{item.studentId ? ` · ${workspace.students.find((student) => student.id === item.studentId)?.fullName || ''}` : ''}</small></span><button type="button" className="danger" onClick={() => onCommit({ ...workspace, competitionEvents: workspace.competitionEvents.filter((entry) => entry.id !== item.id) }, 'Đã xóa biến động điểm.')}>Xóa</button></div>)}</div> : <p className="hr-muted">Chưa có biến động điểm.</p>}</section>
  </div>;
}

export function MeetingsTab({ workspace, onCommit }) {
  const [draft, setDraft] = useState({ date: todayIso(), theme: '', objectives: '', attendanceSummary: '', learningSummary: '', commendations: '', reminders: '', nextWeek: '', content: '' });
  const [focus, setFocus] = useState('');
  const generate = () => setDraft(buildMeetingDraft(workspace, draft.date || todayIso(), focus));
  const save = async () => {
    if (!safeText(draft.theme)) return;
    await onCommit(addMeeting(workspace, draft), draft.id ? 'Đã cập nhật nội dung sinh hoạt lớp.' : 'Đã lưu nội dung sinh hoạt lớp.');
    setDraft({ date: todayIso(), theme: '', objectives: '', attendanceSummary: '', learningSummary: '', commendations: '', reminders: '', nextWeek: '', content: '' });
  };
  const remove = (id) => onCommit({ ...workspace, meetings: workspace.meetings.filter((item) => item.id !== id) }, 'Đã xóa bản ghi sinh hoạt lớp.');
  return <div className="hr-tab-stack">
    <section className="hr-panel hrc-offline-panel"><div className="hr-panel-head"><div><small>TỔNG HỢP NGOẠI TUYẾN</small><h2>Tạo tiết sinh hoạt từ dữ liệu tuần</h2><p>Hệ thống dùng điểm danh, học tập, rèn luyện và lịch công việc đã lưu; không gửi dữ liệu ra ngoài.</p></div><button type="button" className="primary" onClick={generate}>Tạo nội dung từ dữ liệu</button></div><label className="hr-wide-field"><span>Trọng tâm / chủ đề bổ sung</span><input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ví dụ: tinh thần tự học và chuẩn bị kiểm tra giữa kỳ" /></label></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Kế hoạch / biên bản</small><h2>Nội dung sinh hoạt lớp</h2></div><button type="button" className="primary" onClick={save}>Lưu sinh hoạt lớp</button></div><div className="hr-form-grid three"><label><span>Ngày</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label><span>Chủ đề</span><input value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })} /></label><label><span>Mục tiêu</span><input value={draft.objectives} onChange={(event) => setDraft({ ...draft, objectives: event.target.value })} /></label></div><div className="hr-form-grid two">{[['attendanceSummary', 'Tổng kết chuyên cần'], ['learningSummary', 'Tình hình học tập'], ['commendations', 'Tuyên dương'], ['reminders', 'Nhắc nhở'], ['nextWeek', 'Kế hoạch tuần tới']].map(([key, label]) => <label key={key}><span>{label}</span><textarea value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div><label className="hr-wide-field"><span>Kịch bản chi tiết</span><textarea className="tall" value={draft.content || ''} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.meetings.length} bản ghi</small><h2>Lịch sử sinh hoạt lớp</h2></div></div>{workspace.meetings.length ? <div className="hr-record-list">{workspace.meetings.map((item) => <article key={item.id}><time>{formatViDate(item.date)}</time><div><h3>{item.theme}</h3><p>{item.objectives || item.content?.slice(0, 180)}</p></div><div className="hr-row-actions"><button type="button" onClick={() => setDraft({ ...item })}>Mở lại</button><button type="button" className="danger" onClick={() => remove(item.id)}>Xóa</button></div></article>)}</div> : <p className="hr-muted">Chưa lưu nội dung sinh hoạt lớp.</p>}</section>
  </div>;
}

export function ParentsTab({ workspace, onCommit }) {
  const students = (workspace.students || []).filter((item) => item.active !== false);
  const [draft, setDraft] = useState({ studentId: '', date: todayIso(), channel: 'Zalo', direction: 'GVCN liên hệ', subject: '', message: '', outcome: '', followUpDate: '', attachmentName: '', responseStatus: 'pending' });
  const [tone, setTone] = useState('phối hợp');
  const [templateName, setTemplateName] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');
  const selectedStudent = students.find((item) => item.id === draft.studentId);
  const generate = () => setDraft((value) => ({ ...value, message: buildParentMessage(workspace, { ...value, tone }) }));
  const save = async () => {
    if (!safeText(draft.subject) && !safeText(draft.message)) return;
    await onCommit(addParentContact(workspace, draft), 'Đã lưu lịch sử liên hệ phụ huynh.');
    setDraft({ studentId: '', date: todayIso(), channel: 'Zalo', direction: 'GVCN liên hệ', subject: '', message: '', outcome: '', followUpDate: '', attachmentName: '', responseStatus: 'pending' });
  };
  const saveTemplate = async () => {
    if (!safeText(templateName) || !safeText(draft.message)) return;
    await onCommit(addMessageTemplate(workspace, { name: templateName, channel: draft.channel, subject: draft.subject, content: draft.message }), 'Đã lưu mẫu thông báo.');
    setTemplateName('');
  };
  const schedule = async () => {
    if (!safeText(sendAt) || !safeText(draft.message)) return;
    await onCommit(scheduleParentMessage(workspace, { ...draft, sendAt }), 'Đã tạo lịch nhắc gửi thông báo.');
    setSendAt('');
  };
  const visible = workspace.parentContacts.filter((item) => filterStudent === 'all' || item.studentId === filterStudent);
  const exportHistory = () => downloadCsv(`lien-he-phu-huynh-${workspace.classProfile?.className || 'lop'}.csv`, [['Ngày', 'Học sinh', 'Kênh', 'Chủ đề', 'Nội dung', 'Kết quả', 'Theo dõi lại', 'Trạng thái'], ...visible.map((item) => [item.date, students.find((student) => student.id === item.studentId)?.fullName || 'Toàn lớp', item.channel, item.subject, item.message, item.outcome, item.followUpDate, item.responseStatus])]);
  const applyTemplate = (id) => {
    const item = workspace.messageTemplates.find((entry) => entry.id === id);
    if (item) setDraft((value) => ({ ...value, channel: item.channel || value.channel, subject: item.subject || '', message: item.content || '' }));
  };
  return <div className="hr-tab-stack">
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Sổ liên lạc nội bộ · NGOẠI TUYẾN</small><h2>Soạn, lưu và theo dõi trao đổi</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={generate}>Tạo tin từ mẫu & dữ liệu</button><button type="button" className="secondary" onClick={() => copyText(draft.message)}>Sao chép</button><button type="button" className="primary" onClick={save}>Lưu lịch sử</button></div></div><div className="hr-form-grid four"><label><span>Học sinh</span><select value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}><option value="">Toàn lớp / không chọn</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Ngày liên hệ</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label><span>Kênh</span><select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })}>{CONTACT_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Giọng điệu mẫu</span><select value={tone} onChange={(event) => setTone(event.target.value)}><option value="phối hợp">Nhẹ nhàng, phối hợp</option><option value="trang trọng">Trang trọng, ngắn gọn</option><option value="khẩn">Khẩn nhưng bình tĩnh</option></select></label></div>{selectedStudent ? <div className="hr-parent-info"><b>{selectedStudent.parentName || 'Chưa có tên phụ huynh'}</b><span>{selectedStudent.parentPhone || 'Chưa có SĐT'}</span><span>{selectedStudent.parentEmail || 'Chưa có email'}</span></div> : null}{workspace.messageTemplates.length ? <label className="hr-wide-field"><span>Dùng mẫu có sẵn</span><select defaultValue="" onChange={(event) => applyTemplate(event.target.value)}><option value="">Chọn mẫu thông báo</option>{workspace.messageTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}<label className="hr-wide-field"><span>Chủ đề / nội dung cần trao đổi</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Ví dụ: Trao đổi việc đi trễ và đề nghị phối hợp" /></label><label className="hr-wide-field"><span>Nội dung trao đổi</span><textarea className="tall" value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label><div className="hr-form-grid two"><label><span>Kết quả / phản hồi</span><textarea value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value })} /></label><label><span>Ngày cần theo dõi lại</span><input type="date" value={draft.followUpDate} onChange={(event) => setDraft({ ...draft, followUpDate: event.target.value })} /></label><label><span>Tệp đính kèm</span><input type="file" onChange={(event) => setDraft({ ...draft, attachmentName: event.target.files?.[0]?.name || '' })} /></label><label><span>Trạng thái phản hồi</span><select value={draft.responseStatus} onChange={(event) => setDraft({ ...draft, responseStatus: event.target.value })}><option value="pending">Chờ phản hồi</option><option value="replied">Đã phản hồi</option><option value="resolved">Đã xử lý</option></select></label></div><div className="hr-message-tools"><div><input placeholder="Tên mẫu" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /><button type="button" className="secondary" onClick={saveTemplate}>Lưu làm mẫu</button></div><div><input type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} /><button type="button" className="secondary" onClick={schedule}>Tạo lịch nhắc gửi</button></div></div><p className="hr-security-note">Lịch nhắc không tự gửi Zalo/SMS/email. Ứng dụng lưu thời điểm để GVCN chủ động sao chép và gửi qua kênh đã chọn.</p></section>
    {workspace.scheduledMessages.length ? <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.scheduledMessages.length} lịch nhắc</small><h2>Thông báo cần gửi</h2></div></div><div className="hr-scheduled-list">{workspace.scheduledMessages.map((item) => <article key={item.id}><div><b>{item.subject || 'Thông báo phụ huynh'}</b><small>{item.sendAt} · {item.channel}</small><p>{item.message}</p></div><span>{item.status}</span><div className="hr-row-actions"><button type="button" onClick={() => copyText(item.message)}>Sao chép</button><button type="button" onClick={() => onCommit({ ...workspace, scheduledMessages: workspace.scheduledMessages.map((entry) => entry.id === item.id ? { ...entry, status: 'sent-manually', sentAt: new Date().toISOString() } : entry) }, 'Đã đánh dấu đã gửi thủ công.')}>Đã gửi</button><button type="button" className="danger" onClick={() => onCommit({ ...workspace, scheduledMessages: workspace.scheduledMessages.filter((entry) => entry.id !== item.id) }, 'Đã xóa lịch nhắc.')}>Xóa</button></div></article>)}</div></section> : null}
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{visible.length} lần trao đổi</small><h2>Lịch sử liên hệ</h2></div><div className="hr-head-actions"><select value={filterStudent} onChange={(event) => setFilterStudent(event.target.value)}><option value="all">Tất cả học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><button type="button" className="secondary" onClick={exportHistory}>Xuất lịch sử CSV</button></div></div>{visible.length ? <div className="hr-contact-list">{visible.map((item) => <article key={item.id}><div><span>{item.channel}</span><time>{formatViDate(item.date)}</time></div><h3>{students.find((student) => student.id === item.studentId)?.fullName || 'Toàn lớp'} · {item.subject || 'Trao đổi phụ huynh'}</h3><p>{item.message}</p>{item.outcome ? <small><b>Kết quả:</b> {item.outcome}</small> : null}<footer>{item.followUpDate ? <span>Nhắc lại: {formatViDate(item.followUpDate)}</span> : null}{item.attachmentName ? <span>📎 {item.attachmentName}</span> : null}<span>{item.responseStatus || 'pending'}</span></footer><div className="hr-row-actions"><button type="button" onClick={() => setDraft({ ...draft, ...item })}>Mở lại</button><button type="button" className="danger" onClick={() => onCommit({ ...workspace, parentContacts: workspace.parentContacts.filter((entry) => entry.id !== item.id) }, 'Đã xóa lịch sử liên hệ.')}>Xóa</button></div></article>)}</div> : <p className="hr-muted">Chưa có lịch sử liên hệ phụ huynh.</p>}</section>
  </div>;
}

export function AnnouncementsTab({ workspace, onCommit, currentUser }) {
  const empty = { title: '', message: '', audience: 'all', targetStudentIds: [], requiresAck: true, dueDate: '', scheduledAt: '', attachmentName: '', attachmentType: '', attachmentData: '', status: 'published' };
  const [draft, setDraft] = useState(empty);
  const [receipts, setReceipts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [fileError, setFileError] = useState('');
  const codes = [workspace.portalConfig?.parentCode, workspace.portalConfig?.studentCode];
  const refresh = async () => {
    const [receiptResult, responseResult] = await Promise.all([loadPortalReceipts(currentUser, workspace.id, codes), loadPortalResponses(currentUser, workspace.id, codes)]);
    setReceipts(receiptResult.items || []); setResponses(responseResult.items || []);
  };
  useEffect(() => { refresh(); }, [currentUser?.id, workspace.id, codes.join('|')]);
  const save = async () => {
    if (!safeText(draft.title) || !safeText(draft.message)) return;
    await onCommit(addAnnouncement(workspace, { ...draft, status: draft.scheduledAt ? 'scheduled' : 'published' }), draft.scheduledAt ? 'Đã lên lịch thông báo.' : 'Đã tạo thông báo.');
    setDraft(empty); setFileError('');
  };
  const publish = async () => {
    const now = Date.now();
    const dueCount = workspace.announcements.filter((notice) => notice.status === 'scheduled' && notice.scheduledAt && Date.parse(notice.scheduledAt) <= now).length;
    const source = dueCount ? {
      ...workspace,
      announcements: workspace.announcements.map((notice) => notice.status === 'scheduled' && notice.scheduledAt && Date.parse(notice.scheduledAt) <= now
        ? { ...notice, status: 'published', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : notice),
    } : workspace;
    if (dueCount) await onCommit(source, `Đã chuyển ${dueCount} thông báo đến hạn sang trạng thái đã đăng.`);
    setPublishing(true);
    const result = await publishHomeroomPortal(source, currentUser);
    setPublishing(false);
    window.alert(result.ok ? (result.offline ? 'Đã cập nhật bản cổng trên thiết bị. Cần Supabase để truy cập từ thiết bị khác.' : 'Đã xuất bản dữ liệu cổng kết nối.') : `Không thể xuất bản: ${result.message}`);
  };
  const chooseAttachment = async (file) => {
    try {
      const attachment = await readSmallAttachment(file);
      setDraft((value) => ({ ...value, ...attachment }));
      setFileError('');
    } catch (error) { setFileError(error.message); }
  };
  const receiptFor = (id) => receipts.filter((item) => (item.notice_id || item.noticeId) === id);
  const responseFor = (id) => responses.filter((item) => (item.notice_id || item.noticeId) === id);
  const resendUnread = async (notice) => {
    const readRefs = new Set(receiptFor(notice.id).map((item) => item.student_ref || item.studentCode));
    const targets = workspace.students.filter((student) => student.active !== false && !readRefs.has(student.code || student.id)).map((student) => student.id);
    if (!targets.length) { window.alert('Tất cả học sinh/phụ huynh đã xác nhận.'); return; }
    await onCommit(addAnnouncement(workspace, { ...notice, id: '', title: `[Nhắc lại] ${notice.title}`, audience: 'selected', targetStudentIds: targets, scheduledAt: '', status: 'published' }), `Đã tạo thông báo nhắc lại cho ${targets.length} học sinh.`);
  };
  return <div className="hr-tab-stack">
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Trung tâm thông báo</small><h2>Tạo, lên lịch, đính kèm và nhận phản hồi</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={publish}>{publishing ? 'Đang xuất bản…' : 'Xuất bản lên cổng'}</button><button type="button" className="primary" onClick={save}>{draft.scheduledAt ? 'Lưu lịch nhắc' : 'Lưu thông báo'}</button></div></div><div className="hr-form-grid four"><label><span>Tiêu đề</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>Đối tượng</span><select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}><option value="all">Học sinh và phụ huynh</option><option value="parents">Chỉ phụ huynh</option><option value="students">Chỉ học sinh</option><option value="selected">Học sinh được chọn</option></select></label><label><span>Hạn xác nhận</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label><label><span>Hẹn giờ nhắc đăng</span><input type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} /></label><label><span>Tệp đính kèm ≤ 1 MB</span><input type="file" onChange={(event) => chooseAttachment(event.target.files?.[0])} /></label><label className="hr-check-label"><input type="checkbox" checked={draft.requiresAck} onChange={(event) => setDraft({ ...draft, requiresAck: event.target.checked })} /><span>Yêu cầu xác nhận đã đọc</span></label></div>{fileError ? <p className="hr-error">{fileError}</p> : null}{draft.attachmentName ? <p className="hr-attachment-chip">📎 {draft.attachmentName}</p> : null}{draft.audience === 'selected' ? <div className="hr-student-selector">{workspace.students.filter((student) => student.active !== false).map((student) => <label key={student.id}><input type="checkbox" checked={draft.targetStudentIds.includes(student.id)} onChange={(event) => setDraft({ ...draft, targetStudentIds: event.target.checked ? [...draft.targetStudentIds, student.id] : draft.targetStudentIds.filter((id) => id !== student.id) })} /><span>{student.fullName}</span></label>)}</div> : null}<label className="hr-wide-field"><span>Nội dung</span><textarea className="tall" value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label><p className="hr-security-note">Thông báo hẹn giờ sẽ không xuất hiện trước thời điểm đã chọn. Khi đến giờ, mở mục này và bấm “Xuất bản lên cổng” để cập nhật cổng phụ huynh/học sinh.</p></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.announcements.length} thông báo</small><h2>Thông báo đã tạo</h2></div><button type="button" className="secondary" onClick={refresh}>Làm mới xác nhận & phản hồi</button></div>{workspace.announcements.length ? <div className="hr-notice-list">{workspace.announcements.map((notice) => <article key={notice.id}><header><div><small>{notice.audience} · {notice.dueDate || 'Không hạn'} · {notice.status}</small><h3>{notice.title}</h3></div><strong>{receiptFor(notice.id).length} đã đọc · {responseFor(notice.id).length} phản hồi</strong></header><p>{notice.message}</p>{notice.attachmentName ? <a className="hr-attachment-chip" href={notice.attachmentData || undefined} download={notice.attachmentName}>📎 {notice.attachmentName}</a> : null}<footer><span>{notice.requiresAck ? 'Cần xác nhận' : 'Không bắt buộc'}</span><button type="button" className="text-btn" onClick={() => resendUnread(notice)}>Nhắc người chưa đọc</button><button type="button" className="danger" onClick={() => onCommit({ ...workspace, announcements: workspace.announcements.filter((item) => item.id !== notice.id) }, 'Đã xóa thông báo.')}>Xóa</button></footer>{receiptFor(notice.id).length ? <div className="hr-receipt-chips">{receiptFor(notice.id).map((item) => <span key={item.id}>{item.reader_name || item.readerName || item.student_ref || item.studentCode}</span>)}</div> : null}{responseFor(notice.id).length ? <div className="hr-portal-responses">{responseFor(notice.id).map((item) => <blockquote key={item.id}><p>{item.message}</p><footer>{item.reader_name || item.readerName || item.student_ref || item.studentCode}</footer></blockquote>)}</div> : null}</article>)}</div> : <p className="hr-muted">Chưa có thông báo.</p>}</section>
  </div>;
}

export function PortalsTab({ workspace, onCommit, currentUser }) {
  const [config, setConfig] = useState({ ...workspace.portalConfig });
  const [publishing, setPublishing] = useState(false);
  useEffect(() => { setConfig({ ...workspace.portalConfig }); }, [workspace.portalConfig]);
  const ensureCodes = () => setConfig((value) => ({ ...value, enabled: true, parentCode: value.parentCode || generatePortalCode('PH'), studentCode: value.studentCode || generatePortalCode('HS'), subjectCode: value.subjectCode || generatePortalCode('BM') }));
  const save = () => onCommit(setPortalConfig(workspace, config), 'Đã lưu cấu hình cổng truy cập.');
  const publish = async () => {
    const next = setPortalConfig(workspace, { ...config, enabled: true, publishedAt: new Date().toISOString() });
    await onCommit(next, 'Đã lưu cấu hình cổng truy cập.'); setPublishing(true);
    const result = await publishHomeroomPortal(next, currentUser); setPublishing(false);
    window.alert(result.ok ? (result.offline ? 'Đã tạo bản cổng trên thiết bị. Cần Supabase để chia sẻ ngoài thiết bị.' : 'Đã xuất bản cổng kết nối.') : `Không thể xuất bản: ${result.message}`);
  };
  const shareUrl = (role, code) => `${window.location.origin}${window.location.pathname}#/homeroom-portal?role=${role}&code=${encodeURIComponent(code || '')}`;
  const revoke = async () => {
    if (!window.confirm('Thu hồi toàn bộ mã truy cập và tạo PIN mới cho tất cả học sinh?')) return;
    await onCommit(revokeAllPortalAccess(workspace), 'Đã thu hồi toàn bộ quyền truy cập cũ.');
  };
  return <div className="hr-tab-stack">
    <section className="hr-panel hr-portal-intro"><div><small>Cổng kết nối bảo mật</small><h2>Phụ huynh, học sinh và giáo viên bộ môn</h2><p>Mỗi học sinh dùng mã học sinh và PIN cá nhân. GVCN kiểm soát dữ liệu được chia sẻ.</p></div><button type="button" className="primary" onClick={ensureCodes}>Tạo đủ mã truy cập</button></section>
    <section className="hr-portal-grid">{[['parentCode', 'PH', 'Phụ huynh', 'parent'], ['studentCode', 'HS', 'Học sinh', 'student'], ['subjectCode', 'BM', 'Giáo viên bộ môn', 'subject']].map(([key, prefix, label, role]) => <article key={key} className="hr-panel hr-portal-card"><small>{label}</small><h3>{config[key] || 'Chưa có mã'}</h3><p>{role === 'subject' ? 'Gửi nhận xét học tập vào hộp thư GVCN.' : 'Xem dữ liệu đúng học sinh đã xác thực.'}</p><div><button type="button" className="secondary" onClick={() => setConfig({ ...config, [key]: generatePortalCode(prefix) })}>Tạo mã mới</button><button type="button" className="secondary" disabled={!config[key]} onClick={() => copyText(shareUrl(role, config[key]))}>Sao chép link</button><button type="button" className="text-btn" onClick={() => window.open(shareUrl(role, config[key]), '_blank', 'noopener,noreferrer')}>Mở thử</button></div></article>)}</section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Quyền hiển thị</small><h2>Dữ liệu được chia sẻ</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={save}>Lưu cấu hình</button><button type="button" className="primary" disabled={publishing || !config.parentCode || !config.studentCode || !config.subjectCode} onClick={publish}>{publishing ? 'Đang xuất bản…' : 'Xuất bản cổng'}</button><button type="button" className="danger" onClick={revoke}>Thu hồi toàn bộ</button></div></div><div className="hr-toggle-grid">{[['exposeSchedule', 'Lịch công việc'], ['exposeLearning', 'Kết quả học tập'], ['exposeAttendance', 'Tóm tắt chuyên cần'], ['exposeFeedback', 'Nhận xét bộ môn']].map(([key, label]) => <label key={key}><input type="checkbox" checked={config[key] !== false} onChange={(event) => setConfig({ ...config, [key]: event.target.checked })} /><span><b>{label}</b><small>Chỉ hiển thị dữ liệu của đúng học sinh đã xác thực.</small></span></label>)}</div><div className="hr-form-grid three"><label><span>Thời lượng phiên (phút)</span><input type="number" min="5" max="240" value={config.sessionMinutes || 30} onChange={(event) => setConfig({ ...config, sessionMinutes: Number(event.target.value) })} /></label><label><span>Số lần nhập sai tối đa</span><input type="number" min="3" max="10" value={config.maxFailedAttempts || 5} onChange={(event) => setConfig({ ...config, maxFailedAttempts: Number(event.target.value) })} /></label><label><span>Khóa tạm (phút)</span><input type="number" min="5" max="120" value={config.lockMinutes || 15} onChange={(event) => setConfig({ ...config, lockMinutes: Number(event.target.value) })} /></label></div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Thông tin phát cho gia đình</small><h2>Mã học sinh và PIN cá nhân</h2></div></div>{workspace.students.length ? <div className="hr-preview-table"><table><thead><tr><th>Mã học sinh</th><th>Họ và tên</th><th>PIN</th><th>Phụ huynh</th><th /></tr></thead><tbody>{workspace.students.filter((student) => student.active !== false).map((student) => <tr key={student.id}><td>{student.code || student.id}</td><td>{student.fullName}</td><td><b className="hr-pin">{student.portalPin}</b></td><td>{student.parentName || '—'}</td><td><button type="button" onClick={() => onCommit(regenerateStudentPortalPin(workspace, student.id), `Đã tạo PIN mới cho ${student.fullName}.`)}>Đổi PIN</button></td></tr>)}</tbody></table></div> : <p className="hr-muted">Cần thêm học sinh trước khi tạo cổng.</p>}<p className="hr-security-note">Không đăng mã truy cập và PIN lên kênh công khai. Tạo mã mới ngay khi nghi ngờ bị lộ.</p></section>
  </div>;
}

export function RecordsTab({ workspace, onCommit }) {
  const empty = { id: '', type: 'Báo cáo tuần', title: '', period: '', content: '', metadata: {} };
  const [draft, setDraft] = useState(empty);
  const [schoolName, setSchoolName] = useState(workspace.classProfile?.schoolName || 'TRƯỜNG THPT');
  const generate = () => setDraft((value) => ({ ...value, ...buildRecordDraft(workspace, value) }));
  const save = async () => {
    if (!safeText(draft.title)) return;
    let nextWorkspace = { ...workspace, classProfile: { ...workspace.classProfile, schoolName } };
    if (draft.id) nextWorkspace = { ...nextWorkspace, records: nextWorkspace.records.map((item) => item.id === draft.id ? { ...item, ...draft, updatedAt: new Date().toISOString() } : item) };
    else nextWorkspace = addRecord(nextWorkspace, draft);
    await onCommit(nextWorkspace, draft.id ? 'Đã cập nhật hồ sơ / báo cáo.' : 'Đã lưu hồ sơ / báo cáo.');
    setDraft(empty);
  };
  const exportAll = () => downloadText(`ho-so-gvcn-${workspace.classProfile?.className || 'lop'}.json`, exportWorkspaceJson(workspace), 'application/json;charset=utf-8');
  const exportText = (item) => downloadText(`${safeText(item.title, 'ho-so').replace(/[^a-zA-Z0-9À-ỹ _-]/g, '').replace(/\s+/g, '-')}.txt`, `${item.title}\n${item.type} · ${item.period}\n\n${item.content}`);
  return <div className="hr-tab-stack">
    <section className="hr-panel hrc-offline-panel"><div className="hr-panel-head"><div><small>TỔNG HỢP NGOẠI TUYẾN</small><h2>Tạo báo cáo từ dữ liệu lớp</h2><p>Chuyên cần, học tập, rèn luyện, hỗ trợ học sinh và lịch công việc được tổng hợp tự động, không dùng AI.</p></div><button type="button" className="primary" onClick={generate}>Tạo bản nháp báo cáo</button></div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Lưu vào hồ sơ chủ nhiệm</small><h2>Biên soạn tài liệu Word / PDF</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={exportAll}>Sao lưu JSON</button><button type="button" className="primary" onClick={save}>{draft.id ? 'Cập nhật tài liệu' : 'Lưu tài liệu'}</button></div></div><div className="hr-form-grid four"><label><span>Tên trường</span><input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} /></label><label><span>Loại hồ sơ</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{RECORD_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Tiêu đề</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>Thời gian / kỳ báo cáo</span><input value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label></div><label className="hr-wide-field"><span>Nội dung</span><textarea className="report" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>{safeText(draft.title) ? <div className="hr-document-preview"><header><div><b>{schoolName}</b><small>LỚP {workspace.classProfile?.className || '—'}</small></div><div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><small>Độc lập – Tự do – Hạnh phúc</small></div></header><h3>{draft.title}</h3><p>{draft.content.slice(0, 700)}{draft.content.length > 700 ? '…' : ''}</p></div> : null}</section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.records.length} tài liệu</small><h2>Kho hồ sơ chủ nhiệm</h2></div></div>{workspace.records.length ? <div className="hr-record-grid">{workspace.records.map((item) => <article key={item.id}><span>{item.type}</span><h3>{item.title}</h3><small>{item.period || formatViDate(item.createdAt?.slice(0, 10))}</small><p>{item.content.slice(0, 220)}{item.content.length > 220 ? '…' : ''}</p><div><button type="button" onClick={() => setDraft({ ...empty, ...item })}>Mở / sửa</button><button type="button" onClick={() => exportText(item)}>TXT</button><button type="button" onClick={() => downloadWordDocument(workspace, item, { schoolName })}>Word</button><button type="button" onClick={() => { try { printRecordAsPdf(workspace, item, { schoolName }); } catch (error) { window.alert(error.message); } }}>PDF / In</button><button type="button" className="danger" onClick={() => onCommit({ ...workspace, records: workspace.records.filter((entry) => entry.id !== item.id) }, 'Đã xóa tài liệu.')}>Xóa</button></div></article>)}</div> : <p className="hr-muted">Chưa có hồ sơ hoặc báo cáo.</p>}</section>
  </div>;
}

export function SchoolStatsTab({ currentUser }) {
  const [state, setState] = useState({ loading: true, error: '', workspaces: [] });
  const load = async () => {
    setState((value) => ({ ...value, loading: true, error: '' }));
    const result = await loadSchoolHomeroomStats(currentUser);
    setState({ loading: false, error: result.ok ? '' : result.message, workspaces: result.workspaces || [] });
  };
  useEffect(() => { load(); }, [currentUser?.id]);
  if (currentUser?.role !== 'admin') return <section className="hr-panel"><h2>Thống kê toàn trường</h2><p className="hr-muted">Chỉ tài khoản Admin được cấp quyền xem dữ liệu tổng hợp nhiều lớp.</p></section>;
  const normalized = state.workspaces.map((row) => ({ ...row, payload: row.payload || {} }));
  const students = normalized.reduce((sum, row) => sum + (row.payload.students || []).filter((student) => student.active !== false).length, 0);
  const attendance = normalized.reduce((sum, row) => sum + Object.values(row.payload.attendance || {}).reduce((inner, rows) => inner + Object.keys(rows || {}).length, 0), 0);
  const notices = normalized.reduce((sum, row) => sum + (row.payload.announcements || []).length, 0);
  const feedback = normalized.reduce((sum, row) => sum + (row.payload.subjectFeedback || []).length, 0);
  return <div className="hr-tab-stack"><section className="hr-stat-grid"><StatCard icon="▦" label="Lớp chủ nhiệm" value={normalized.length} note="Đã đồng bộ" /><StatCard icon="♙" label="Học sinh" value={students} note="Sĩ số hoạt động" tone="green" /><StatCard icon="✓" label="Lượt điểm danh" value={attendance} note="Dữ liệu đã ghi nhận" tone="orange" /><StatCard icon="↔" label="Nhận xét bộ môn" value={feedback} note={`${notices} thông báo`} tone="red" /></section><section className="hr-panel"><div className="hr-panel-head"><div><small>Toàn trường</small><h2>Tổng hợp không gian chủ nhiệm</h2></div><button type="button" className="secondary" onClick={load}>{state.loading ? 'Đang tải…' : 'Làm mới'}</button></div>{state.error ? <p className="hr-error">{state.error}</p> : null}{normalized.length ? <div className="hr-preview-table"><table><thead><tr><th>Lớp</th><th>Năm học</th><th>GVCN</th><th>Sĩ số</th><th>Điểm danh</th><th>Thông báo</th><th>Cập nhật</th></tr></thead><tbody>{normalized.map((row) => { const payload = row.payload; return <tr key={`${row.owner_id}-${row.workspace_id || 'default'}`}><td><b>{row.class_name || payload.classProfile?.className || 'Chưa đặt tên'}</b></td><td>{row.school_year || payload.classProfile?.schoolYear || '—'}</td><td>{payload.classProfile?.adviserName || row.owner_email}</td><td>{(payload.students || []).filter((student) => student.active !== false).length}</td><td>{Object.values(payload.attendance || {}).reduce((sum, rows) => sum + Object.keys(rows || {}).length, 0)}</td><td>{(payload.announcements || []).length}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '—'}</td></tr>; })}</tbody></table></div> : <p className="hr-muted">{state.loading ? 'Đang tải dữ liệu…' : 'Chưa có lớp nào đồng bộ.'}</p>}</section></div>;
}
