import React, { useEffect, useMemo, useRef, useState } from 'react';
import { readWorkbookSafe } from '../utils/safeSpreadsheet.js';
import { callAI } from '../utils/gemini.js';
import {
  addAnnouncement,
  addCompetitionEvent,
  addLearningRecord,
  addSubjectFeedback,
  assignStudentTeam,
  calculateStudentAnalytics,
  setPortalConfig,
  updateGradeSettings,
  upsertTeam,
} from '../utils/homeroomStore.js';
import {
  buildLeaderboard,
  generatePortalCode,
  loadFeedbackInbox,
  loadPortalReceipts,
  loadPortalResponses,
  loadSchoolHomeroomStats,
  markFeedbackReviewed,
  publishHomeroomPortal,
} from '../utils/homeroomPhase2.js';

function safeText(value) { return String(value ?? '').trim(); }
function today() { return new Date().toISOString().slice(0, 10); }
function formatNumber(value, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : '—'; }
function riskLabel(risk) { return risk === 'high' ? 'Nguy cơ cao' : risk === 'medium' ? 'Cần theo dõi' : 'Ổn định'; }
function trendLabel(trend) { return trend === 'up' ? 'Đang tăng' : trend === 'down' ? 'Đang giảm' : 'Ổn định'; }
function portalUrl(code, role) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/homeroom-portal?role=${encodeURIComponent(role)}&code=${encodeURIComponent(code || '')}`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

async function readSmallAttachment(file) {
  if (!file) return { attachmentName: '', attachmentType: '', attachmentData: '' };
  if (file.size > 1024 * 1024) throw new Error('Tệp đính kèm tối đa 1 MB để tránh làm nặng dữ liệu lớp.');
  const attachmentData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp đính kèm.'));
    reader.readAsDataURL(file);
  });
  return { attachmentName: file.name, attachmentType: file.type || 'application/octet-stream', attachmentData };
}

export function LearningAnalyticsTab({ workspace, onCommit, hasApiKey, currentUser }) {
  const fileRef = useRef(null);
  const [draft, setDraft] = useState({ studentId: '', subject: 'Tiếng Anh', period: 'Học kỳ I', assessment: 'Điểm thường xuyên', score: '', maxScore: '10', teacherName: currentUser?.name || '', note: '', recordedAt: today() });
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [aiSummary, setAiSummary] = useState('');
  const [importState, setImportState] = useState({ fileName: '', rows: [], headers: [], mapping: {}, error: '' });
  const [settings, setSettings] = useState(() => ({ warningThreshold: workspace.gradeSettings?.warningThreshold ?? 6.5, highRiskThreshold: workspace.gradeSettings?.highRiskThreshold ?? 5 }));
  const subjects = useMemo(() => [...new Set(workspace.learningRecords.map((item) => item.subject).filter(Boolean))], [workspace.learningRecords]);
  const analytics = useMemo(() => workspace.students.filter((student) => student.active !== false).map((student) => ({ student, ...calculateStudentAnalytics(workspace, student.id) })), [workspace]);
  const visibleRecords = workspace.learningRecords.filter((item) => subjectFilter === 'all' || item.subject === subjectFilter);
  const classAverageValues = analytics.map((item) => item.average).filter(Number.isFinite);
  const classAverage = classAverageValues.length ? classAverageValues.reduce((a, b) => a + b, 0) / classAverageValues.length : null;
  const highRisk = analytics.filter((item) => item.risk === 'high').length;
  const improving = analytics.filter((item) => item.trend === 'up').length;
  const lockedPeriods = workspace.gradeSettings?.lockedPeriods || [];
  const isPeriodLocked = lockedPeriods.includes(draft.period);

  const saveRecord = async () => {
    if (!draft.studentId || !safeText(draft.subject) || draft.score === '' || isPeriodLocked) return;
    await onCommit(addLearningRecord(workspace, draft), 'Đã thêm kết quả học tập.');
    setDraft((current) => ({ ...current, score: '', note: '', recordedAt: today() }));
  };

  const generateAnalysis = async () => {
    if (!hasApiKey) return;
    const compact = analytics.map((item) => ({ name: item.student.fullName, average: item.average, trend: item.trend, absences: item.absenceCount, late: item.lateCount, feedbackAlerts: item.alertFeedback, risk: item.risk }));
    const result = await callAI({
      loadingLabel: 'AI đang phân tích học tập toàn lớp…',
      temperature: 0.35,
      maxOutputTokens: 900,
      prompt: `Bạn là trợ lý GVCN THPT. Phân tích dữ liệu lớp sau, tuyệt đối không bịa dữ liệu. Viết 4 phần: 1) bức tranh chung, 2) học sinh cần ưu tiên, 3) học sinh tiến bộ, 4) kế hoạch can thiệp 2 tuần. Dùng tiếng Việt, rõ ràng, bảo vệ dữ liệu cá nhân, tối đa 550 từ.\nDữ liệu: ${JSON.stringify(compact)}`,
    });
    setAiSummary(result);
  };

  const headerKey = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const inferMapping = (headers) => {
    const aliases = {
      studentCode: ['ma hoc sinh', 'ma hs', 'student code', 'code', 'id'],
      studentName: ['ho va ten', 'ho ten', 'ten hoc sinh', 'student name', 'name'],
      subject: ['mon hoc', 'mon', 'subject'],
      period: ['hoc ky', 'giai doan', 'period', 'term'],
      assessment: ['loai diem', 'loai danh gia', 'assessment', 'category'],
      score: ['diem', 'score', 'mark'],
      maxScore: ['thang diem', 'diem toi da', 'max score', 'maximum'],
      recordedAt: ['ngay', 'ngay ghi nhan', 'date'],
      teacherName: ['giao vien', 'teacher'],
      note: ['ghi chu', 'note', 'comment'],
    };
    const mapping = {};
    Object.entries(aliases).forEach(([target, names]) => {
      const found = headers.find((header) => names.some((name) => headerKey(header) === name || headerKey(header).includes(name)));
      if (found) mapping[target] = found;
    });
    return mapping;
  };
  const readScoreFile = async (file) => {
    if (!file) return;
    try {
      const workbook = await readWorkbookSafe(await file.arrayBuffer(), { maxSheets: 1, maxRows: 5000 });
      const rows = workbook.toRows(workbook.names[0], { defval: '' });
      const headers = rows.length ? Object.keys(rows[0]) : [];
      setImportState({ fileName: file.name, rows, headers, mapping: inferMapping(headers), error: rows.length ? '' : 'File không có dữ liệu.' });
    } catch (error) { setImportState({ fileName: file.name, rows: [], headers: [], mapping: {}, error: error.message || 'Không đọc được file.' }); }
  };
  const aiMapColumns = async () => {
    if (!hasApiKey || !importState.headers.length) return;
    const text = await callAI({
      loadingLabel: 'AI đang nhận diện cột bảng điểm…', temperature: 0.1, maxOutputTokens: 320, responseMimeType: 'application/json',
      prompt: `Map spreadsheet headers to this JSON schema. Return JSON only. Keys allowed: studentCode,studentName,subject,period,assessment,score,maxScore,recordedAt,teacherName,note. Values must be exact original headers or empty. Headers: ${JSON.stringify(importState.headers)}`,
    });
    try { const mapping = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}'); setImportState((current) => ({ ...current, mapping: { ...current.mapping, ...mapping }, error: '' })); } catch { setImportState((current) => ({ ...current, error: 'AI trả về ánh xạ không hợp lệ.' })); }
  };
  const importScores = async () => {
    if (!importState.rows.length || !importState.mapping.score) return;
    let next = workspace;
    let added = 0;
    let skipped = 0;
    importState.rows.forEach((row) => {
      const code = safeText(row[importState.mapping.studentCode]);
      const name = safeText(row[importState.mapping.studentName]).toLowerCase();
      const student = workspace.students.find((item) => (code && item.code === code) || (name && item.fullName.toLowerCase() === name));
      const score = Number(String(row[importState.mapping.score]).replace(',', '.'));
      if (!student || !Number.isFinite(score)) { skipped += 1; return; }
      const record = {
        studentId: student.id,
        subject: safeText(row[importState.mapping.subject]) || draft.subject || 'Chưa xác định',
        period: safeText(row[importState.mapping.period]) || draft.period,
        assessment: safeText(row[importState.mapping.assessment]) || draft.assessment,
        score,
        maxScore: Number(String(row[importState.mapping.maxScore] || 10).replace(',', '.')) || 10,
        recordedAt: row[importState.mapping.recordedAt] instanceof Date ? row[importState.mapping.recordedAt].toISOString().slice(0, 10) : safeText(row[importState.mapping.recordedAt]) || today(),
        teacherName: safeText(row[importState.mapping.teacherName]) || draft.teacherName,
        note: safeText(row[importState.mapping.note]),
      };
      if (lockedPeriods.includes(record.period)) { skipped += 1; return; }
      try { next = addLearningRecord(next, record); added += 1; } catch { skipped += 1; }
    });
    await onCommit(next, `Đã nhập ${added} kết quả học tập; bỏ qua ${skipped} dòng không hợp lệ hoặc đã khóa.`);
    setImportState({ fileName: '', rows: [], headers: [], mapping: {}, error: '' });
  };
  const saveSettings = async () => onCommit(updateGradeSettings(workspace, { warningThreshold: Number(settings.warningThreshold), highRiskThreshold: Number(settings.highRiskThreshold) }), 'Đã lưu ngưỡng cảnh báo học tập.');
  const togglePeriodLock = async () => {
    const nextLocked = isPeriodLocked ? lockedPeriods.filter((item) => item !== draft.period) : [...new Set([...lockedPeriods, draft.period])];
    await onCommit(updateGradeSettings(workspace, { lockedPeriods: nextLocked }), isPeriodLocked ? `Đã mở khóa ${draft.period}.` : `Đã khóa bảng điểm ${draft.period}.`);
  };

  return <div className="hr-tab-stack">
    <section className="hr-stat-grid hr-phase2-stats">
      <article className="hr-stat tone-blue"><span>∑</span><div><small>Điểm trung bình lớp</small><strong>{formatNumber(classAverage)}</strong><em>{workspace.learningRecords.length} lượt đánh giá</em></div></article>
      <article className="hr-stat tone-red"><span>!</span><div><small>Nguy cơ cao</small><strong>{highRisk}</strong><em>Ngưỡng &lt; {settings.highRiskThreshold}</em></div></article>
      <article className="hr-stat tone-green"><span>↗</span><div><small>Đang tiến bộ</small><strong>{improving}</strong><em>So với các lần gần trước</em></div></article>
      <article className="hr-stat tone-orange"><span>◎</span><div><small>Môn đã theo dõi</small><strong>{subjects.length}</strong><em>{subjects.join(' · ') || 'Chưa có dữ liệu'}</em></div></article>
    </section>

    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Ngưỡng cảnh báo</small><h2>Quy tắc phân tích lớp</h2></div><button type="button" className="primary" onClick={saveSettings}>Lưu ngưỡng</button></div><div className="hr-form-grid two"><label><span>Cần theo dõi dưới</span><input type="number" step="0.1" min="0" max="10" value={settings.warningThreshold} onChange={(e) => setSettings({ ...settings, warningThreshold: e.target.value })} /></label><label><span>Nguy cơ cao dưới</span><input type="number" step="0.1" min="0" max="10" value={settings.highRiskThreshold} onChange={(e) => setSettings({ ...settings, highRiskThreshold: e.target.value })} /></label></div><p className="hr-security-note">AI chỉ đề xuất. GVCN xác nhận trước khi gắn mức độ hỗ trợ hoặc liên hệ phụ huynh.</p></article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Excel / CSV</small><h2>Nhập bảng điểm hàng loạt</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={() => fileRef.current?.click()}>Chọn file</button><button type="button" className="secondary" disabled={!hasApiKey || !importState.headers.length} onClick={aiMapColumns}>AI nhận diện cột</button><button type="button" className="primary" disabled={!importState.rows.length || !importState.mapping.score} onClick={importScores}>Nhập dữ liệu</button></div></div><input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => readScoreFile(e.target.files?.[0])} />{importState.fileName ? <p><b>{importState.fileName}</b> · {importState.rows.length} dòng</p> : <p className="hr-muted">Hệ thống tự nhận diện mã học sinh, họ tên, môn, loại điểm, điểm và thang điểm.</p>}{importState.error ? <p className="hr-error">{importState.error}</p> : null}{importState.headers.length ? <div className="hr-column-map">{Object.entries({ studentCode:'Mã HS',studentName:'Họ tên',subject:'Môn',period:'Học kỳ',assessment:'Loại điểm',score:'Điểm',maxScore:'Thang điểm',recordedAt:'Ngày' }).map(([key,label]) => <label key={key}><span>{label}</span><select value={importState.mapping[key] || ''} onChange={(e) => setImportState((current) => ({ ...current, mapping: { ...current.mapping, [key]: e.target.value } }))}><option value="">Không dùng</option>{importState.headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div> : null}</article>
    </section>

    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Dữ liệu học tập</small><h2>Thêm kết quả đánh giá</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={togglePeriodLock}>{isPeriodLocked ? 'Mở khóa học kỳ' : 'Khóa học kỳ'}</button><button type="button" className="primary" disabled={isPeriodLocked} onClick={saveRecord}>{isPeriodLocked ? 'Đã khóa' : 'Lưu kết quả'}</button></div></div>
      <div className="hr-form-grid four">
        <label><span>Học sinh</span><select value={draft.studentId} onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}><option value="">Chọn học sinh</option>{workspace.students.filter((item) => item.active !== false).map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select></label>
        <label><span>Môn học</span><input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
        <label><span>Giai đoạn</span><input value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} /></label>
        <label><span>Loại đánh giá</span><input value={draft.assessment} onChange={(e) => setDraft({ ...draft, assessment: e.target.value })} /></label>
        <label><span>Điểm</span><input type="number" step="0.1" min="0" value={draft.score} onChange={(e) => setDraft({ ...draft, score: e.target.value })} /></label>
        <label><span>Thang điểm</span><input type="number" min="1" value={draft.maxScore} onChange={(e) => setDraft({ ...draft, maxScore: e.target.value })} /></label>
        <label><span>Ngày ghi nhận</span><input type="date" value={draft.recordedAt} onChange={(e) => setDraft({ ...draft, recordedAt: e.target.value })} /></label>
        <label><span>Giáo viên bộ môn</span><input value={draft.teacherName} onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })} /></label>
      </div>
      <label className="hr-wide-field"><span>Ghi chú</span><textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
    </section>

    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Phân tích nâng cao</small><h2>Bản đồ nguy cơ và xu hướng</h2></div><div className="hr-head-actions"><select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="all">Tất cả môn</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select><button type="button" className="secondary" disabled={!hasApiKey || !analytics.length} onClick={generateAnalysis}>AI phân tích lớp</button></div></div>
      <div className="hr-analytics-grid">{analytics.map((item) => <article key={item.student.id} className={`hr-analytics-card risk-${item.risk}`}><header><span>{item.student.fullName.slice(0, 1)}</span><div><b>{item.student.fullName}</b><small>{item.student.code || 'Chưa có mã'}</small></div><em>{riskLabel(item.risk)}</em></header><div className="hr-analytics-score"><strong>{formatNumber(item.average)}</strong><span><i style={{ width: `${Math.min(100, Math.max(0, (item.average || 0) * 10))}%` }} /></span></div><footer><small>{trendLabel(item.trend)}</small><small>Vắng {item.absenceCount}</small><small>Trễ {item.lateCount}</small><small>{item.recordCount} điểm</small></footer></article>)}</div>
      {aiSummary ? <article className="hr-ai-result"><div className="hr-panel-head"><div><small>AI GVCN</small><h3>Phân tích và kế hoạch can thiệp</h3></div><button type="button" className="text-btn" onClick={() => setAiSummary('')}>Đóng</button></div><pre>{aiSummary}</pre></article> : null}
    </section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>Lịch sử</small><h2>Kết quả đã nhập</h2></div></div>{visibleRecords.length ? <div className="hr-preview-table"><table><thead><tr><th>Ngày</th><th>Học sinh</th><th>Môn</th><th>Đánh giá</th><th>Điểm</th><th>Giáo viên</th></tr></thead><tbody>{visibleRecords.slice(0, 200).map((item) => <tr key={item.id}><td>{item.recordedAt}</td><td>{workspace.students.find((s) => s.id === item.studentId)?.fullName || '—'}</td><td>{item.subject}</td><td>{item.assessment}</td><td><b>{item.score}/{item.maxScore}</b></td><td>{item.teacherName || '—'}</td></tr>)}</tbody></table></div> : <p className="hr-muted">Chưa có kết quả học tập.</p>}</section>
  </div>;
}

export function SubjectFeedbackTab({ workspace, onCommit, currentUser }) {
  const [draft, setDraft] = useState({ studentId: '', subject: '', teacherName: currentUser?.name || '', teacherEmail: currentUser?.email || '', period: '', level: 'Bình thường', comment: '', action: '' });
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

  const saveManual = async () => {
    if (!draft.studentId || !safeText(draft.subject) || !safeText(draft.comment)) return;
    await onCommit(addSubjectFeedback(workspace, draft), 'Đã lưu nhận xét giáo viên bộ môn.');
    setDraft((current) => ({ ...current, comment: '', action: '' }));
  };
  const acceptInbox = async (item) => {
    const student = workspace.students.find((entry) => entry.code === item.student_ref || entry.id === item.student_ref);
    if (!student) return;
    const next = addSubjectFeedback(workspace, {
      inboxId: item.id,
      studentId: student.id,
      studentCode: student.code,
      subject: item.subject,
      teacherName: item.teacher_name,
      teacherEmail: item.teacher_email,
      period: item.period,
      level: item.level,
      comment: item.comment,
      action: item.suggested_action,
      createdAt: item.created_at,
    });
    await onCommit(next, 'Đã tiếp nhận nhận xét vào hồ sơ học sinh.');
    await markFeedbackReviewed(item.id, currentUser);
    refresh();
  };
  const shareLink = portalUrl(code, 'subject');

  return <div className="hr-tab-stack">
    <section className="hr-panel hr-share-panel"><div><small>Kết nối giáo viên bộ môn</small><h2>Cổng gửi nhận xét cho lớp {workspace.classProfile.className || ''}</h2><p>Giáo viên bộ môn mở liên kết, nhập mã và gửi nhận xét. GVCN duyệt trước khi đưa vào hồ sơ.</p></div><div className="hr-code-box"><b>{code || 'Chưa tạo mã'}</b><button type="button" className="secondary" disabled={!code} onClick={() => copyText(shareLink)}>Sao chép liên kết</button><button type="button" className="text-btn" onClick={() => window.location.hash = '#/homeroom-portal?role=subject'}>Mở cổng</button></div></section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>Nhập trực tiếp</small><h2>Nhận xét giáo viên bộ môn</h2></div><button type="button" className="primary" onClick={saveManual}>Lưu nhận xét</button></div><div className="hr-form-grid four">
      <label><span>Học sinh</span><select value={draft.studentId} onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}><option value="">Chọn học sinh</option>{workspace.students.filter((item) => item.active !== false).map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label>
      <label><span>Môn học</span><input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
      <label><span>Giai đoạn</span><input value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} /></label>
      <label><span>Mức độ</span><select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}><option>Bình thường</option><option>Tích cực</option><option>Cần hỗ trợ</option><option>Nguy cơ</option><option>Khẩn</option></select></label>
      <label><span>Giáo viên</span><input value={draft.teacherName} onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })} /></label>
      <label><span>Email</span><input type="email" value={draft.teacherEmail} onChange={(e) => setDraft({ ...draft, teacherEmail: e.target.value })} /></label>
    </div><label className="hr-wide-field"><span>Nhận xét</span><textarea value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></label><label className="hr-wide-field"><span>Đề xuất phối hợp</span><textarea value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} /></label></section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>Hộp thư nhận xét</small><h2>Chờ GVCN tiếp nhận</h2></div><button type="button" className="secondary" onClick={refresh}>{loading ? 'Đang tải…' : 'Làm mới'}</button></div>{inbox.filter((item) => item.status !== 'reviewed').length ? <div className="hr-feedback-inbox">{inbox.filter((item) => item.status !== 'reviewed').map((item) => <article key={item.id}><header><b>{workspace.students.find((student) => student.code === item.student_ref)?.fullName || item.student_ref}</b><span>{item.level}</span></header><small>{item.subject} · {item.teacher_name} · {item.period}</small><p>{item.comment}</p>{item.suggested_action ? <em>Đề xuất: {item.suggested_action}</em> : null}<button type="button" className="primary" onClick={() => acceptInbox(item)}>Tiếp nhận vào hồ sơ</button></article>)}</div> : <p className="hr-muted">Không có nhận xét mới đang chờ.</p>}</section>

    <section className="hr-panel"><div className="hr-panel-head"><div><small>Hồ sơ đã tiếp nhận</small><h2>Nhận xét theo học sinh</h2></div></div>{workspace.subjectFeedback.length ? <div className="hr-feedback-inbox accepted">{workspace.subjectFeedback.slice(0, 80).map((item) => <article key={item.id}><header><b>{workspace.students.find((student) => student.id === item.studentId)?.fullName || item.studentCode}</b><span>{item.level}</span></header><small>{item.subject} · {item.teacherName} · {item.period}</small><p>{item.comment}</p>{item.action ? <em>Phối hợp: {item.action}</em> : null}</article>)}</div> : <p className="hr-muted">Chưa có nhận xét giáo viên bộ môn.</p>}</section>
  </div>;
}

export function CompetitionTab({ workspace, onCommit }) {
  const [teamDraft, setTeamDraft] = useState({ name: '', symbol: '◆', note: '' });
  const [scoreDraft, setScoreDraft] = useState({ teamId: '', studentId: '', points: 10, reason: '', date: today() });
  const leaderboard = useMemo(() => buildLeaderboard(workspace), [workspace]);
  const addTeam = async () => {
    if (!safeText(teamDraft.name)) return;
    await onCommit(upsertTeam(workspace, teamDraft), 'Đã tạo tổ/đội thi đua.');
    setTeamDraft({ name: '', symbol: '◆', note: '' });
  };
  const assign = async (studentId, teamId) => onCommit(assignStudentTeam(workspace, studentId, teamId), 'Đã cập nhật tổ của học sinh.');
  const score = async () => {
    if (!scoreDraft.teamId || !safeText(scoreDraft.reason)) return;
    await onCommit(addCompetitionEvent(workspace, scoreDraft), 'Đã cập nhật điểm thi đua.');
    setScoreDraft((current) => ({ ...current, points: 10, reason: '', studentId: '' }));
  };
  return <div className="hr-tab-stack">
    <section className="hr-leaderboard">{leaderboard.length ? leaderboard.map((team, index) => <article key={team.id} className={index === 0 ? 'winner' : ''}><span>{team.symbol}</span><small>Hạng {index + 1}</small><h3>{team.name}</h3><strong>{team.score}</strong><em>{team.members} thành viên</em></article>) : <div className="hr-empty"><span>＋</span><h3>Chưa có tổ thi đua</h3><p>Tạo tổ để phân công học sinh và ghi nhận điểm.</p></div>}</section>
    <section className="hr-two-column">
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Thiết lập</small><h2>Tạo tổ / đội</h2></div><button type="button" className="primary" onClick={addTeam}>Thêm đội</button></div><div className="hr-form-grid"><label><span>Biểu tượng</span><input value={teamDraft.symbol} onChange={(e) => setTeamDraft({ ...teamDraft, symbol: e.target.value })} /></label><label><span>Tên tổ / đội</span><input value={teamDraft.name} onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })} /></label></div><label className="hr-wide-field"><span>Ghi chú</span><textarea value={teamDraft.note} onChange={(e) => setTeamDraft({ ...teamDraft, note: e.target.value })} /></label></article>
      <article className="hr-panel"><div className="hr-panel-head"><div><small>Ghi nhận</small><h2>Cộng / trừ điểm</h2></div><button type="button" className="primary" onClick={score}>Lưu điểm</button></div><div className="hr-form-grid"><label><span>Tổ / đội</span><select value={scoreDraft.teamId} onChange={(e) => setScoreDraft({ ...scoreDraft, teamId: e.target.value })}><option value="">Chọn đội</option>{workspace.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label><span>Học sinh liên quan</span><select value={scoreDraft.studentId} onChange={(e) => setScoreDraft({ ...scoreDraft, studentId: e.target.value })}><option value="">Toàn đội</option>{workspace.students.filter((student) => !scoreDraft.teamId || student.teamId === scoreDraft.teamId).map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></label><label><span>Điểm</span><input type="number" value={scoreDraft.points} onChange={(e) => setScoreDraft({ ...scoreDraft, points: e.target.value })} /></label><label><span>Ngày</span><input type="date" value={scoreDraft.date} onChange={(e) => setScoreDraft({ ...scoreDraft, date: e.target.value })} /></label></div><label className="hr-wide-field"><span>Lý do</span><input value={scoreDraft.reason} onChange={(e) => setScoreDraft({ ...scoreDraft, reason: e.target.value })} /></label></article>
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Phân tổ</small><h2>Danh sách học sinh</h2></div></div><div className="hr-team-roster">{workspace.students.filter((item) => item.active !== false).map((student) => <label key={student.id}><span><b>{student.fullName}</b><small>{student.code || 'Chưa có mã'}</small></span><select value={student.teamId || ''} onChange={(e) => assign(student.id, e.target.value)}><option value="">Chưa phân tổ</option>{workspace.teams.map((team) => <option key={team.id} value={team.id}>{team.symbol} {team.name}</option>)}</select></label>)}</div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Nhật ký</small><h2>Biến động điểm thi đua</h2></div></div>{workspace.competitionEvents.length ? <div className="hr-compact-list">{workspace.competitionEvents.slice(0, 100).map((item) => <div key={item.id}><time>{item.date}<small>{Number(item.points) >= 0 ? `+${item.points}` : item.points}</small></time><span><b>{workspace.teams.find((team) => team.id === item.teamId)?.name || 'Đội đã xóa'}</b><small>{item.reason}{item.studentId ? ` · ${workspace.students.find((student) => student.id === item.studentId)?.fullName || ''}` : ''}</small></span></div>)}</div> : <p className="hr-muted">Chưa có biến động điểm.</p>}</section>
  </div>;
}

export function AnnouncementsTab({ workspace, onCommit, currentUser }) {
  const emptyDraft = { title: '', message: '', audience: 'all', targetStudentIds: [], requiresAck: true, dueDate: '', scheduledAt: '', attachmentName: '', attachmentType: '', attachmentData: '', status: 'published' };
  const [draft, setDraft] = useState(emptyDraft);
  const [receipts, setReceipts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [fileError, setFileError] = useState('');
  const codes = [workspace.portalConfig?.parentCode, workspace.portalConfig?.studentCode];
  const refreshPortalActivity = async () => {
    const [receiptResult, responseResult] = await Promise.all([
      loadPortalReceipts(currentUser, workspace.id, codes),
      loadPortalResponses(currentUser, workspace.id, codes),
    ]);
    setReceipts(receiptResult.items || []);
    setResponses(responseResult.items || []);
  };
  useEffect(() => { refreshPortalActivity(); }, [currentUser?.id, workspace.id, codes.join('|')]);
  const add = async () => {
    if (!safeText(draft.title) || !safeText(draft.message)) return;
    const next = addAnnouncement(workspace, { ...draft, status: draft.scheduledAt ? 'scheduled' : 'published' });
    await onCommit(next, draft.scheduledAt ? 'Đã lên lịch thông báo.' : 'Đã tạo thông báo.');
    setDraft(emptyDraft);
    setFileError('');
  };
  const publish = async () => {
    setPublishing(true);
    const result = await publishHomeroomPortal(workspace, currentUser);
    setPublishing(false);
    window.alert(result.ok ? (result.offline ? 'Đã cập nhật cổng trên thiết bị. Cần Supabase để phụ huynh truy cập từ thiết bị khác.' : 'Đã xuất bản thông báo lên cổng phụ huynh và học sinh.') : `Không thể xuất bản: ${result.message}`);
  };
  const selectAttachment = async (file) => {
    try { const attachment = await readSmallAttachment(file); setDraft((current) => ({ ...current, ...attachment })); setFileError(''); }
    catch (error) { setFileError(error.message); setDraft((current) => ({ ...current, attachmentName: '', attachmentType: '', attachmentData: '' })); }
  };
  const noticeReceipts = (noticeId) => receipts.filter((item) => (item.notice_id || item.noticeId) === noticeId);
  const noticeResponses = (noticeId) => responses.filter((item) => (item.notice_id || item.noticeId) === noticeId);
  const countReceipt = (noticeId) => noticeReceipts(noticeId).length;
  const resendUnread = async (notice) => {
    const readRefs = new Set(noticeReceipts(notice.id).map((item) => item.student_ref || item.studentCode));
    const targets = workspace.students.filter((student) => student.active !== false && !readRefs.has(student.code || student.id)).map((student) => student.id);
    if (!targets.length) { window.alert('Tất cả học sinh/phụ huynh đã xác nhận.'); return; }
    const next = addAnnouncement(workspace, { ...notice, id: '', title: `[Nhắc lại] ${notice.title}`, audience: 'selected', targetStudentIds: targets, publishedAt: new Date().toISOString(), scheduledAt: '', status: 'published' });
    await onCommit(next, `Đã tạo thông báo nhắc lại cho ${targets.length} học sinh chưa xác nhận.`);
  };
  return <div className="hr-tab-stack">
    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Trung tâm thông báo</small><h2>Tạo, lên lịch, đính kèm và nhận phản hồi</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={publish}>{publishing ? 'Đang xuất bản…' : 'Xuất bản lên cổng'}</button><button type="button" className="primary" onClick={add}>{draft.scheduledAt ? 'Lên lịch' : 'Lưu thông báo'}</button></div></div>
      <div className="hr-form-grid four">
        <label><span>Tiêu đề</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
        <label><span>Đối tượng</span><select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })}><option value="all">Học sinh và phụ huynh</option><option value="parents">Chỉ phụ huynh</option><option value="students">Chỉ học sinh</option><option value="selected">Học sinh được chọn</option></select></label>
        <label><span>Hạn xác nhận</span><input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
        <label><span>Lên lịch đăng</span><input type="datetime-local" value={draft.scheduledAt} onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })} /></label>
        <label><span>Tệp đính kèm (≤ 1 MB)</span><input type="file" onChange={(e) => selectAttachment(e.target.files?.[0])} /></label>
        <label className="hr-check-label"><input type="checkbox" checked={draft.requiresAck} onChange={(e) => setDraft({ ...draft, requiresAck: e.target.checked })} /><span>Yêu cầu xác nhận đã đọc</span></label>
      </div>
      {fileError ? <p className="hr-error">{fileError}</p> : null}
      {draft.attachmentName ? <p className="hr-attachment-chip">📎 {draft.attachmentName}</p> : null}
      {draft.audience === 'selected' ? <div className="hr-student-selector">{workspace.students.filter((student) => student.active !== false).map((student) => <label key={student.id}><input type="checkbox" checked={draft.targetStudentIds.includes(student.id)} onChange={(e) => setDraft({ ...draft, targetStudentIds: e.target.checked ? [...draft.targetStudentIds, student.id] : draft.targetStudentIds.filter((id) => id !== student.id) })} /><span>{student.fullName}</span></label>)}</div> : null}
      <label className="hr-wide-field"><span>Nội dung</span><textarea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} /></label>
    </section>
    <section className="hr-panel">
      <div className="hr-panel-head"><div><small>Theo dõi hai chiều</small><h2>Thông báo đã tạo</h2></div><button type="button" className="secondary" onClick={refreshPortalActivity}>Làm mới xác nhận & phản hồi</button></div>
      {workspace.announcements.length ? <div className="hr-notice-list">{workspace.announcements.map((notice) => <article key={notice.id}>
        <header><div><small>{notice.audience} · {notice.dueDate || 'Không hạn'} · {notice.status || 'published'}</small><h3>{notice.title}</h3></div><strong>{countReceipt(notice.id)} đã đọc · {noticeResponses(notice.id).length} phản hồi</strong></header>
        <p>{notice.message}</p>
        {notice.attachmentName ? <a className="hr-attachment-chip" href={notice.attachmentData || undefined} download={notice.attachmentName} onClick={(e) => { if (!notice.attachmentData) e.preventDefault(); }}>📎 {notice.attachmentName}</a> : null}
        <footer><span>{notice.requiresAck ? 'Cần xác nhận' : 'Không bắt buộc'}</span><span>{notice.scheduledAt ? `Lịch: ${notice.scheduledAt}` : new Date(notice.publishedAt).toLocaleString('vi-VN')}</span><button type="button" className="text-btn" onClick={() => resendUnread(notice)}>Gửi lại người chưa đọc</button></footer>
        {noticeReceipts(notice.id).length ? <div className="hr-receipt-chips">{noticeReceipts(notice.id).map((item) => <span key={item.id || `${item.studentCode}-${item.role}`}>{item.reader_name || item.readerName || item.student_ref || item.studentCode} · {item.reader_role || item.role}</span>)}</div> : null}
        {noticeResponses(notice.id).length ? <div className="hr-portal-responses">{noticeResponses(notice.id).map((item) => <blockquote key={item.id}><p>{item.message}</p><footer>{item.reader_name || item.readerName || item.student_ref || item.studentCode} · {new Date(item.created_at || item.createdAt).toLocaleString('vi-VN')}</footer></blockquote>)}</div> : null}
      </article>)}</div> : <p className="hr-muted">Chưa có thông báo.</p>}
    </section>
  </div>;
}

export function PortalsTab({ workspace, onCommit, currentUser }) {
  const [config, setConfig] = useState(() => ({ ...workspace.portalConfig }));
  const [publishing, setPublishing] = useState(false);
  useEffect(() => { setConfig({ ...workspace.portalConfig }); }, [workspace.portalConfig]);
  const ensureCodes = () => setConfig((current) => ({
    ...current,
    enabled: true,
    parentCode: current.parentCode || generatePortalCode('PH'),
    studentCode: current.studentCode || generatePortalCode('HS'),
    subjectCode: current.subjectCode || generatePortalCode('BM'),
  }));
  const save = async () => {
    const next = setPortalConfig(workspace, config);
    await onCommit(next, 'Đã lưu cấu hình cổng truy cập.');
  };
  const publish = async () => {
    const next = setPortalConfig(workspace, { ...config, enabled: true, publishedAt: new Date().toISOString() });
    await onCommit(next, 'Đã lưu cấu hình cổng truy cập.');
    setPublishing(true);
    const result = await publishHomeroomPortal(next, currentUser);
    setPublishing(false);
    window.alert(result.ok ? (result.offline ? 'Đã tạo bản xem trước trên thiết bị. Hãy chạy migration Supabase để chia sẻ ngoài thiết bị.' : 'Đã xuất bản cổng phụ huynh, học sinh và giáo viên bộ môn.') : `Không thể xuất bản: ${result.message}`);
  };
  const regenerate = (key, prefix) => setConfig({ ...config, [key]: generatePortalCode(prefix) });
  return <div className="hr-tab-stack">
    <section className="hr-panel hr-portal-intro"><div><small>Phase 2</small><h2>Cổng phụ huynh, học sinh và giáo viên bộ môn</h2><p>Dữ liệu công khai được tạo thành bản riêng đã lọc. Phụ huynh và học sinh cần mã lớp, mã học sinh và PIN cá nhân; giáo viên bộ môn chỉ thấy danh sách cơ bản để gửi nhận xét.</p></div><button type="button" className="primary" onClick={ensureCodes}>Tạo đủ mã truy cập</button></section>
    <section className="hr-portal-grid">
      {[['parentCode', 'PH', 'Phụ huynh', 'parent'], ['studentCode', 'HS', 'Học sinh', 'student'], ['subjectCode', 'BM', 'Giáo viên bộ môn', 'subject']].map(([key, prefix, label, role]) => <article key={key} className="hr-panel hr-portal-card"><small>{label}</small><h3>{config[key] || 'Chưa có mã'}</h3><p>{role === 'subject' ? 'Gửi nhận xét học tập vào hộp thư GVCN.' : 'Xem dữ liệu cá nhân và xác nhận thông báo.'}</p><div><button type="button" className="secondary" onClick={() => regenerate(key, prefix)}>Tạo mã mới</button><button type="button" className="secondary" disabled={!config[key]} onClick={() => copyText(portalUrl(config[key], role))}>Sao chép link</button><button type="button" className="text-btn" onClick={() => window.open(portalUrl(config[key], role), '_blank', 'noopener,noreferrer')}>Mở thử</button></div></article>)}
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Quyền hiển thị</small><h2>Dữ liệu được chia sẻ</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={save}>Lưu cấu hình</button><button type="button" className="primary" disabled={publishing || !config.parentCode || !config.studentCode || !config.subjectCode} onClick={publish}>{publishing ? 'Đang xuất bản…' : 'Xuất bản cổng'}</button></div></div><div className="hr-toggle-grid">{[['exposeSchedule', 'Lịch công việc'], ['exposeLearning', 'Kết quả học tập'], ['exposeAttendance', 'Tóm tắt chuyên cần'], ['exposeFeedback', 'Nhận xét bộ môn']].map(([key, label]) => <label key={key}><input type="checkbox" checked={config[key] !== false} onChange={(e) => setConfig({ ...config, [key]: e.target.checked })} /><span><b>{label}</b><small>Chỉ hiển thị dữ liệu của đúng học sinh đã xác thực.</small></span></label>)}</div></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Thông tin phát cho gia đình</small><h2>Mã học sinh và PIN cá nhân</h2></div></div>{workspace.students.length ? <div className="hr-preview-table"><table><thead><tr><th>Mã học sinh</th><th>Họ và tên</th><th>PIN</th><th>Phụ huynh</th><th>Trạng thái</th></tr></thead><tbody>{workspace.students.filter((student) => student.active !== false).map((student) => <tr key={student.id}><td>{student.code || student.id}</td><td>{student.fullName}</td><td><b className="hr-pin">{student.portalPin}</b></td><td>{student.parentName || '—'}</td><td>{config.enabled ? 'Sẵn sàng' : 'Chưa bật'}</td></tr>)}</tbody></table></div> : <p className="hr-muted">Cần thêm học sinh trước khi tạo cổng.</p>}<p className="hr-security-note">Không đăng mã truy cập và PIN lên kênh công khai. Tạo mã mới ngay nếu nghi ngờ bị lộ.</p></section>
  </div>;
}

export function SchoolStatsTab({ currentUser }) {
  const [state, setState] = useState({ loading: true, error: '', workspaces: [] });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const result = await loadSchoolHomeroomStats(currentUser);
    setState({ loading: false, error: result.ok ? '' : result.message, workspaces: result.workspaces || [] });
  };
  useEffect(() => { load(); }, [currentUser?.id]);
  if (currentUser?.role !== 'admin') return <section className="hr-panel"><h2>Thống kê toàn trường</h2><p className="hr-muted">Chỉ tài khoản Admin được cấp quyền xem dữ liệu tổng hợp nhiều lớp.</p></section>;
  const normalized = state.workspaces.map((row) => ({ ...row, payload: row.payload || {} }));
  const students = normalized.reduce((sum, row) => sum + (row.payload.students || []).filter((student) => student.active !== false).length, 0);
  const notices = normalized.reduce((sum, row) => sum + (row.payload.announcements || []).length, 0);
  const feedback = normalized.reduce((sum, row) => sum + (row.payload.subjectFeedback || []).length, 0);
  const attendanceEntries = normalized.reduce((sum, row) => sum + Object.values(row.payload.attendance || {}).reduce((inner, dateRows) => inner + Object.keys(dateRows || {}).length, 0), 0);
  return <div className="hr-tab-stack">
    <section className="hr-stat-grid"><article className="hr-stat tone-blue"><span>▦</span><div><small>Lớp chủ nhiệm</small><strong>{normalized.length}</strong><em>Đã đồng bộ</em></div></article><article className="hr-stat tone-green"><span>♙</span><div><small>Học sinh</small><strong>{students}</strong><em>Tổng sĩ số hoạt động</em></div></article><article className="hr-stat tone-orange"><span>✓</span><div><small>Lượt điểm danh</small><strong>{attendanceEntries}</strong><em>Dữ liệu đã ghi nhận</em></div></article><article className="hr-stat tone-red"><span>!</span><div><small>Nhận xét bộ môn</small><strong>{feedback}</strong><em>{notices} thông báo</em></div></article></section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>Toàn trường</small><h2>Tổng hợp không gian chủ nhiệm</h2></div><button type="button" className="secondary" onClick={load}>{state.loading ? 'Đang tải…' : 'Làm mới'}</button></div>{state.error ? <p className="hr-error">{state.error}</p> : null}{normalized.length ? <div className="hr-preview-table"><table><thead><tr><th>Lớp</th><th>Năm học</th><th>GVCN</th><th>Sĩ số</th><th>Điểm danh</th><th>Thông báo</th><th>Cập nhật</th></tr></thead><tbody>{normalized.map((row) => { const p = row.payload; const count = (p.students || []).filter((student) => student.active !== false).length; const marks = Object.values(p.attendance || {}).reduce((sum, rows) => sum + Object.keys(rows || {}).length, 0); return <tr key={`${row.owner_id}-${row.workspace_id || 'default'}`}><td><b>{row.class_name || p.classProfile?.className || 'Chưa đặt tên'}</b></td><td>{row.school_year || p.classProfile?.schoolYear || '—'}</td><td>{p.classProfile?.adviserName || row.owner_email}</td><td>{count}</td><td>{marks}</td><td>{(p.announcements || []).length}</td><td>{new Date(row.updated_at).toLocaleString('vi-VN')}</td></tr>; })}</tbody></table></div> : <p className="hr-muted">{state.loading ? 'Đang tải dữ liệu…' : 'Chưa có lớp nào đồng bộ.'}</p>}</section>
  </div>;
}
