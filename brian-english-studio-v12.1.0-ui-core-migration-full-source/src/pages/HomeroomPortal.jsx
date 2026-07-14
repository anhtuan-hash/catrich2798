import React, { useEffect, useMemo, useState } from 'react';
import { accessHomeroomPortal, acknowledgePortalNotice, submitPortalResponse, submitSubjectFeedback } from '../utils/homeroomPhase2.js';

function readHashParams() {
  const hash = window.location.hash || '';
  const query = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
  return new URLSearchParams(query);
}

function safeText(value) { return String(value ?? '').trim(); }
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function PortalLogin({ form, setForm, onAccess, loading, error }) {
  return <section className="hrp-login-card">
    <div className="hrp-login-copy"><small>BRIAN ENGLISH · HOMEROOM PORTAL</small><h1>Cổng thông tin lớp chủ nhiệm</h1><p>Chọn đúng vai trò và nhập thông tin do giáo viên chủ nhiệm cung cấp.</p></div>
    <div className="hrp-role-switch">{[['parent', 'Phụ huynh'], ['student', 'Học sinh'], ['subject', 'GV bộ môn']].map(([id, label]) => <button key={id} type="button" className={form.role === id ? 'active' : ''} onClick={() => setForm({ ...form, role: id })}>{label}</button>)}</div>
    <label><span>Mã truy cập</span><input autoCapitalize="characters" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ví dụ: PH12ABC" /></label>
    {form.role !== 'subject' ? <div className="hrp-form-two"><label><span>Mã học sinh</span><input value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} /></label><label><span>PIN cá nhân</span><input type="password" inputMode="numeric" maxLength="6" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></label></div> : null}
    {error ? <p className="hrp-error">{error}</p> : null}
    <button type="button" className="hrp-primary" disabled={loading || !safeText(form.code)} onClick={onAccess}>{loading ? 'Đang xác thực…' : 'Mở cổng thông tin'}</button>
    <button type="button" className="hrp-back" onClick={() => { window.location.hash = '#/home'; }}>← Về Brian English Studio</button>
  </section>;
}

function SubjectPortal({ session, form }) {
  const students = session.view?.students || [];
  const [draft, setDraft] = useState({ studentCode: '', subject: '', teacherName: '', teacherEmail: '', period: '', level: 'Bình thường', comment: '', action: '' });
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const submit = async () => {
    if (!draft.studentCode || !safeText(draft.subject) || !safeText(draft.teacherName) || !safeText(draft.comment)) {
      setState({ loading: false, message: '', error: 'Vui lòng chọn học sinh, nhập môn học, tên giáo viên và nhận xét.' });
      return;
    }
    setState({ loading: true, message: '', error: '' });
    const result = await submitSubjectFeedback({ code: form.code, ...draft });
    if (result.ok) {
      setDraft((current) => ({ ...current, studentCode: '', comment: '', action: '' }));
      setState({ loading: false, message: 'Đã gửi nhận xét đến GVCN. Nội dung sẽ được duyệt trước khi đưa vào hồ sơ.', error: '' });
    } else setState({ loading: false, message: '', error: result.message || 'Không thể gửi nhận xét.' });
  };
  return <div className="hrp-shell"><header className="hrp-header"><div><small>CỔNG GIÁO VIÊN BỘ MÔN</small><h1>{session.view?.classProfile?.className || 'Lớp chủ nhiệm'}</h1><p>{session.view?.classProfile?.schoolYear || ''} · GVCN {session.view?.classProfile?.adviserName || '—'}</p></div><button type="button" onClick={() => window.location.reload()}>Đổi mã</button></header><main className="hrp-main"><section className="hrp-card"><div className="hrp-card-head"><div><small>Phiếu phối hợp</small><h2>Gửi nhận xét học sinh</h2></div><span>{students.length} học sinh</span></div><div className="hrp-grid two"><label><span>Học sinh</span><select value={draft.studentCode} onChange={(e) => setDraft({ ...draft, studentCode: e.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.code || student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select></label><label><span>Môn học</span><input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label><label><span>Giai đoạn / tuần</span><input value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} /></label><label><span>Mức độ</span><select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}><option>Bình thường</option><option>Tích cực</option><option>Cần hỗ trợ</option><option>Nguy cơ</option><option>Khẩn</option></select></label><label><span>Giáo viên</span><input value={draft.teacherName} onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })} /></label><label><span>Email</span><input type="email" value={draft.teacherEmail} onChange={(e) => setDraft({ ...draft, teacherEmail: e.target.value })} /></label></div><label><span>Nhận xét dựa trên quan sát thực tế</span><textarea value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></label><label><span>Đề xuất GVCN / gia đình phối hợp</span><textarea value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} /></label>{state.error ? <p className="hrp-error">{state.error}</p> : null}{state.message ? <p className="hrp-success">{state.message}</p> : null}<button type="button" className="hrp-primary" disabled={state.loading} onClick={submit}>{state.loading ? 'Đang gửi…' : 'Gửi đến GVCN'}</button></section></main></div>;
}

function FamilyPortal({ session, form }) {
  const view = session.view || {};
  const student = view.student || {};
  const [readIds, setReadIds] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [reply, setReply] = useState({ noticeId: '', message: '' });
  const [replyState, setReplyState] = useState({ loading: false, message: '', error: '' });
  const analytics = view.analytics || {};
  const attendance = view.attendance || {};
  const leaderboard = view.leaderboard || [];
  const currentTeam = leaderboard.find((team) => team.id === student.teamId);
  const acknowledge = async (notice) => {
    setBusyId(notice.id);
    const result = await acknowledgePortalNotice({ code: form.code, role: form.role, studentCode: form.studentCode, pin: form.pin, noticeId: notice.id, readerName: student.fullName });
    setBusyId('');
    if (result.ok) setReadIds((current) => [...new Set([...current, notice.id])]);
  };
  const sendReply = async () => {
    if (!safeText(reply.message)) return;
    setReplyState({ loading: true, message: '', error: '' });
    const result = await submitPortalResponse({ code: form.code, role: form.role, studentCode: form.studentCode, pin: form.pin, noticeId: reply.noticeId, message: reply.message, readerName: student.fullName });
    if (result.ok) { setReply({ noticeId: '', message: '' }); setReplyState({ loading: false, message: 'Đã gửi phản hồi đến giáo viên chủ nhiệm.', error: '' }); }
    else setReplyState({ loading: false, message: '', error: result.message || 'Không thể gửi phản hồi.' });
  };
  return <div className="hrp-shell">
    <header className="hrp-header"><div><small>{form.role === 'parent' ? 'CỔNG PHỤ HUYNH' : 'CỔNG HỌC SINH'}</small><h1>{view.classProfile?.className || 'Lớp chủ nhiệm'}</h1><p>{view.classProfile?.schoolYear || ''} · GVCN {view.classProfile?.adviserName || '—'}</p></div><button type="button" onClick={() => window.location.reload()}>Đăng xuất</button></header>
    <main className="hrp-main">
      <section className="hrp-student-hero"><span>{student.fullName?.slice(0, 1) || 'HS'}</span><div><small>{student.code || 'Học sinh'}</small><h2>{student.fullName}</h2><p>{currentTeam ? `${currentTeam.symbol} ${currentTeam.name} · ${currentTeam.score} điểm thi đua` : 'Chưa phân tổ thi đua'}</p></div><strong>{analytics.average == null ? '—' : Number(analytics.average).toFixed(1)}</strong></section>
      <section className="hrp-stat-grid"><article><small>Điểm trung bình</small><b>{analytics.average == null ? '—' : Number(analytics.average).toFixed(1)}</b><em>{analytics.trend === 'up' ? 'Đang tiến bộ' : analytics.trend === 'down' ? 'Cần hỗ trợ' : 'Ổn định'}</em></article><article><small>Đi học đúng giờ</small><b>{attendance.present ?? '—'}</b><em>{attendance.totalMarked || 0} lượt đã ghi nhận</em></article><article><small>Đi trễ</small><b>{attendance.late ?? '—'}</b><em>Vắng {Number(attendance.excused || 0) + Number(attendance.unexcused || 0)} lượt</em></article><article><small>Nhận xét bộ môn</small><b>{view.subjectFeedback?.length || 0}</b><em>Thông tin đã được GVCN tiếp nhận</em></article></section>
      <section className="hrp-layout"><div className="hrp-column">
        <section className="hrp-card"><div className="hrp-card-head"><div><small>Cần theo dõi</small><h2>Thông báo</h2></div><span>{view.announcements?.length || 0}</span></div>{view.announcements?.length ? <div className="hrp-notices">{view.announcements.map((notice) => <article key={notice.id}><small>{notice.dueDate ? `Hạn ${formatDate(notice.dueDate)}` : 'Thông báo lớp'}</small><h3>{notice.title}</h3><p>{notice.message}</p>{notice.attachmentName ? <a className="hrp-attachment" href={notice.attachmentData || undefined} download={notice.attachmentName} onClick={(e) => { if (!notice.attachmentData) e.preventDefault(); }}>📎 {notice.attachmentName}</a> : null}<div className="hrp-notice-actions">{notice.requiresAck ? <button type="button" disabled={busyId === notice.id || readIds.includes(notice.id)} onClick={() => acknowledge(notice)}>{readIds.includes(notice.id) ? '✓ Đã xác nhận' : busyId === notice.id ? 'Đang gửi…' : 'Xác nhận đã đọc'}</button> : null}<button type="button" className="secondary" onClick={() => setReply((current) => ({ ...current, noticeId: notice.id }))}>Phản hồi</button></div></article>)}</div> : <p className="hrp-muted">Chưa có thông báo.</p>}</section>
        <section className="hrp-card"><div className="hrp-card-head"><div><small>Trao đổi hai chiều</small><h2>Gửi phản hồi đến GVCN</h2></div></div><label><span>Liên quan thông báo</span><select value={reply.noticeId} onChange={(e) => setReply({ ...reply, noticeId: e.target.value })}><option value="">Phản hồi chung</option>{(view.announcements || []).map((notice) => <option key={notice.id} value={notice.id}>{notice.title}</option>)}</select></label><label><span>Nội dung phản hồi</span><textarea value={reply.message} onChange={(e) => setReply({ ...reply, message: e.target.value })} placeholder="Nhập thông tin cần trao đổi với giáo viên chủ nhiệm…" /></label>{replyState.error ? <p className="hrp-error">{replyState.error}</p> : null}{replyState.message ? <p className="hrp-success">{replyState.message}</p> : null}<button type="button" className="hrp-primary" disabled={replyState.loading || !safeText(reply.message)} onClick={sendReply}>{replyState.loading ? 'Đang gửi…' : 'Gửi phản hồi'}</button></section>
        <section className="hrp-card"><div className="hrp-card-head"><div><small>Kết quả gần đây</small><h2>Học tập</h2></div><span>{view.learningRecords?.length || 0}</span></div>{view.learningRecords?.length ? <div className="hrp-table"><table><thead><tr><th>Ngày</th><th>Môn</th><th>Đánh giá</th><th>Điểm</th></tr></thead><tbody>{view.learningRecords.slice(0, 30).map((item) => <tr key={item.id}><td>{formatDate(item.recordedAt)}</td><td>{item.subject}</td><td>{item.assessment}</td><td><b>{item.score}/{item.maxScore}</b></td></tr>)}</tbody></table></div> : <p className="hrp-muted">Chưa có kết quả được chia sẻ.</p>}</section>
      </div><div className="hrp-column">
        <section className="hrp-card"><div className="hrp-card-head"><div><small>Sắp tới</small><h2>Lịch công việc</h2></div></div>{view.schedule?.length ? <div className="hrp-schedule">{view.schedule.slice(0, 15).map((item) => <article key={item.id}><time>{formatDate(item.date)}<small>{item.startTime || 'Cả ngày'}</small></time><div><b>{item.title}</b><small>{item.category} · {item.location || 'Chưa rõ địa điểm'}</small></div></article>)}</div> : <p className="hrp-muted">Chưa có lịch được chia sẻ.</p>}</section>
        <section className="hrp-card"><div className="hrp-card-head"><div><small>Phối hợp chuyên môn</small><h2>Nhận xét giáo viên bộ môn</h2></div></div>{view.subjectFeedback?.length ? <div className="hrp-feedback">{view.subjectFeedback.map((item) => <article key={item.id}><header><b>{item.subject}</b><span>{item.level}</span></header><small>{item.teacherName} · {item.period}</small><p>{item.comment}</p>{item.action ? <em>Đề xuất: {item.action}</em> : null}</article>)}</div> : <p className="hrp-muted">Chưa có nhận xét được chia sẻ.</p>}</section>
        {leaderboard.length ? <section className="hrp-card"><div className="hrp-card-head"><div><small>Thi đua lớp</small><h2>Bảng xếp hạng tổ</h2></div></div><div className="hrp-ranking">{leaderboard.map((team, index) => <article key={team.id} className={team.id === student.teamId ? 'current' : ''}><span>{index + 1}</span><b>{team.symbol} {team.name}</b><strong>{team.score}</strong></article>)}</div></section> : null}
      </div></section>
    </main>
  </div>;
}

export default function HomeroomPortal() {
  const params = useMemo(readHashParams, []);
  const [form, setForm] = useState({ role: params.get('role') || 'parent', code: (params.get('code') || '').toUpperCase(), studentCode: '', pin: '' });
  const [state, setState] = useState({ loading: false, error: '', session: null });
  const access = async () => {
    setState({ loading: true, error: '', session: null });
    const result = await accessHomeroomPortal(form);
    if (!result?.ok || !result?.view) setState({ loading: false, error: result?.message || 'Không thể mở cổng thông tin.', session: null });
    else setState({ loading: false, error: '', session: result });
  };
  useEffect(() => {
    if (!state.session?.sessionExpiresAt) return undefined;
    const remaining = Date.parse(state.session.sessionExpiresAt) - Date.now();
    if (remaining <= 0) { setState({ loading: false, error: 'Phiên truy cập đã hết hạn. Vui lòng đăng nhập lại.', session: null }); return undefined; }
    const timer = window.setTimeout(() => setState({ loading: false, error: 'Phiên truy cập đã hết hạn. Vui lòng đăng nhập lại.', session: null }), remaining);
    return () => window.clearTimeout(timer);
  }, [state.session?.sessionExpiresAt]);
  if (!state.session) return <div className="hrp-page"><PortalLogin form={form} setForm={setForm} onAccess={access} loading={state.loading} error={state.error} /></div>;
  return form.role === 'subject' ? <SubjectPortal session={state.session} form={form} /> : <FamilyPortal session={state.session} form={form} />;
}
