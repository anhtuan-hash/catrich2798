import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, BookOpenCheck, CheckCircle2, ChevronDown, ClipboardCheck,
  Clock3, Download, FileCheck2, FileText, GraduationCap, Laptop2, ListChecks,
  LoaderCircle, MessageSquareWarning, Plus, Printer, RefreshCw, Save, Send,
  ShieldCheck, Sparkles, Trash2, UserRoundCheck, UsersRound, X,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { listTeamTeacherAccounts, loadTeamWorkspace } from '../utils/personnelHub.js';
import {
  REPORT_STATUS, aggregateMonthlyReports, buildDepartmentMonthlyReportHtml, cacheMonthlyDraft,
  createEmptyMonthlyPayload, currentReportMonth, listDepartmentMonthlyReports,
  loadMonthlyReportContexts, loadMyMonthlyReport, makeRow, normalizeMonthlyPayload,
  reportCompletion, reportMonthLabel, reviewMonthlyReport, saveMyMonthlyReport,
} from '../utils/monthlyReports.js';
import './MonthlyReportsWorkspace.css';

const PROGRESS_STATUS = {
  on_track: 'Đúng tiến độ', delayed: 'Chậm tiến độ', ahead: 'Nhanh hơn kế hoạch', not_started: 'Chưa phát sinh giảng dạy',
};
const ASSESSMENT_TYPES = ['Kiểm tra thường xuyên', 'Kiểm tra giữa kỳ', 'Kiểm tra cuối kỳ', 'Khảo sát', 'Kiểm tra kỹ năng', 'Thi thử', 'Khác'];
const PROFESSIONAL_TYPES = ['Dự giờ', 'Được dự giờ', 'Thao giảng', 'Tiết dạy minh họa', 'Nghiên cứu bài học', 'Sinh hoạt chuyên môn', 'Sinh hoạt chuyên đề', 'Báo cáo chuyên đề', 'Hội thảo', 'Tập huấn', 'Chia sẻ chuyên môn', 'Họp tổ chuyên môn', 'Khác'];
const RESOURCE_TYPES = ['Kế hoạch bài dạy', 'PowerPoint/Slides', 'Worksheet', 'Tài liệu ôn tập', 'Đề kiểm tra', 'Ngân hàng câu hỏi', 'Quiz trực tuyến', 'Video', 'Audio', 'Học liệu số', 'Trò chơi học tập', 'Website/App', 'Dự án học tập', 'Đồ dùng dạy học', 'Bảng tương tác', 'Khác'];
const DEVELOPMENT_TYPES = ['Tập huấn của trường', 'Tập huấn của Sở/Ngành', 'Hội thảo', 'Khóa học', 'Webinar', 'Tự bồi dưỡng', 'Nghiên cứu tài liệu', 'Nghiên cứu chương trình/SGK', 'Chứng chỉ', 'Khác'];
const TASK_TYPES = ['Phụ đạo học sinh yếu', 'Bồi dưỡng học sinh giỏi', 'Ôn thi TN THPT', 'Ôn kiểm tra', 'Tư vấn học tập', 'Hỗ trợ học sinh có nguy cơ không đạt', 'Hướng dẫn dự án', 'Coi kiểm tra/thi', 'Chấm kiểm tra/thi', 'Công tác tuyển sinh', 'Ngoại khóa / sự kiện trường', 'Công việc TTCM giao', 'Công việc BGH giao', 'Khác'];
const DIFFICULTY_CATEGORIES = ['Tiến độ chương trình', 'Học sinh', 'Nề nếp', 'Kiểm tra đánh giá', 'Thiết bị', 'Phòng học', 'Học liệu', 'Công nghệ', 'Hồ sơ', 'Thời khóa biểu', 'Phối hợp PHHS', 'Khối lượng công việc', 'Khác'];
const PLAN_TYPES = ['Giảng dạy', 'Kiểm tra', 'Ra đề', 'Dự giờ', 'Thao giảng', 'Chuyên đề', 'Bồi dưỡng', 'Phụ đạo', 'Ôn thi', 'Chủ nhiệm', 'Hồ sơ', 'Nhiệm vụ trường', 'Khác'];

const teacherName = (user) => user?.full_name || user?.name || user?.email || 'Giáo viên';
const statusClass = (status) => `mr-status is-${status || 'draft'}`;
const text = (value) => String(value ?? '');

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="mr-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`mr-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><small>BRIAN REPORTS</small><h2>{title}</h2></div><button type="button" onClick={onClose}><X /></button></header>
        <div className="mr-modal-body">{children}</div>
      </section>
    </div>
  );
}

function Notice({ warning }) {
  if (!warning) return null;
  return <div className="mr-notice"><AlertTriangle /><span>{warning}</span></div>;
}

function ProgressMeter({ payload }) {
  const completion = reportCompletion(payload);
  return (
    <div className="mr-completion">
      <div><span>Tiến độ hoàn thiện</span><strong>{completion.percent}%</strong></div>
      <div className="mr-meter"><i style={{ width: `${completion.percent}%` }} /></div>
      <small>{completion.completed}/{completion.total} nhóm bắt buộc đã hoàn tất</small>
    </div>
  );
}

function SectionCard({ number, Icon, title, text: description, children, complete = false }) {
  return (
    <section className={`mr-section ${complete ? 'is-complete' : ''}`}>
      <header>
        <span className="mr-section-icon"><Icon /></span>
        <div><small>PHẦN {number}</small><h2>{title}</h2><p>{description}</p></div>
        {complete && <CheckCircle2 className="mr-section-check" />}
      </header>
      <div className="mr-section-body">{children}</div>
    </section>
  );
}

function RowActions({ onDelete }) {
  return <button type="button" className="mr-icon-btn is-danger" title="Xóa dòng" onClick={onDelete}><Trash2 /></button>;
}

function Field({ label, children, wide = false }) {
  return <label className={wide ? 'mr-field span-2' : 'mr-field'}><span>{label}</span>{children}</label>;
}

function EmptyToggle({ checked, onChange, label = 'Không phát sinh trong tháng' }) {
  return <label className="mr-empty-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><CheckCircle2 /> {label}</span></label>;
}

function ConfirmationToggle({ checked, onChange }) {
  return <label className="mr-confirm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>Tôi đã rà soát và xác nhận nội dung của phần này.</span></label>;
}

function PreviewPayload({ payload, context, user, report }) {
  const completion = reportCompletion(payload);
  const summary = [
    ['Lớp/tiến độ', payload.teachingProgress?.length || 0],
    ['Kiểm tra – đánh giá', payload.assessments?.length || 0],
    ['Hoạt động chuyên môn', payload.professionalActivities?.length || 0],
    ['Học liệu / sản phẩm', payload.learningResources?.length || 0],
    ['Bồi dưỡng', payload.professionalDevelopment?.length || 0],
    ['Công việc khác', payload.otherTasks?.length || 0],
    ['Kế hoạch', payload.nextPlans?.length || 0],
  ];
  return (
    <div className="mr-preview">
      <div className="mr-preview-head"><div><small>{reportMonthLabel(payload.month)}</small><h3>{teacherName(user)}</h3><p>{context?.departmentName || 'Tổ chuyên môn'} · Năm học {payload.schoolYear}</p></div><span className={statusClass(report?.status)}>{REPORT_STATUS[report?.status || 'draft']}</span></div>
      <div className="mr-preview-grid">{summary.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <p className="mr-preview-ready">{completion.ready ? 'Báo cáo đã đủ dữ liệu bắt buộc để gửi TTCM.' : `Còn ${completion.total - completion.completed} nhóm bắt buộc cần hoàn thiện.`}</p>
      {payload.difficulties?.has && <div className="mr-read-block"><b>Khó khăn</b><p>{payload.difficulties.description || payload.difficulties.categories?.join(', ')}</p></div>}
      {payload.recommendation?.has && <div className="mr-read-block"><b>Kiến nghị {payload.recommendation.private ? '· Chỉ TTCM xem' : ''}</b><p>{payload.recommendation.content || '—'}</p></div>}
    </div>
  );
}

function TeacherMonthlyReports({ currentUser }) {
  const [month, setMonth] = useState(currentReportMonth());
  const [contexts, setContexts] = useState([]);
  const [contextIndex, setContextIndex] = useState(0);
  const [payload, setPayload] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState('');
  const [preview, setPreview] = useState(false);
  const context = contexts[contextIndex] || null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadMonthlyReportContexts(currentUser).then((result) => {
      if (!alive) return;
      setContexts(result.contexts || []);
      setWarning(result.warning || '');
      setContextIndex(0);
      if (!result.contexts?.length) {
        setPayload(createEmptyMonthlyPayload(null, month));
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [currentUser?.id]);

  useEffect(() => {
    let alive = true;
    if (!context) return undefined;
    setLoading(true);
    loadMyMonthlyReport(currentUser, context, month).then((result) => {
      if (!alive) return;
      setReport(result.report || null);
      setPayload(normalizeMonthlyPayload(result.payload, context, month));
      setWarning(result.warning || '');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [currentUser?.id, context?.departmentHeadId, context?.departmentId, month]);

  useEffect(() => {
    if (!payload || !context || loading) return;
    const handle = window.setTimeout(() => cacheMonthlyDraft(currentUser, context, month, payload), 350);
    return () => window.clearTimeout(handle);
  }, [payload, context?.departmentHeadId, context?.departmentId, month, currentUser?.id, loading]);

  const locked = ['submitted', 'approved'].includes(report?.status);
  const completion = reportCompletion(payload || {});
  const checks = completion.checks || [];
  const patch = (updater) => {
    if (locked) return;
    setPayload((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return { ...next, updatedAt: new Date().toISOString() };
    });
  };
  const patchRow = (key, id, values) => patch((current) => ({ ...current, [key]: current[key].map((item) => item.id === id ? { ...item, ...values } : item) }));
  const removeRow = (key, id) => patch((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  const addRow = (key, kind, defaults) => patch((current) => ({ ...current, [key]: [...current[key], makeRow(kind, defaults)] }));

  const save = async (submit = false) => {
    if (!payload || !context) return;
    if (submit && !completion.ready) {
      setWarning('Báo cáo chưa hoàn tất đủ 7 nhóm bắt buộc. Hãy kiểm tra các phần chưa có dấu xác nhận.');
      return;
    }
    if (submit && !window.confirm(`Gửi báo cáo ${reportMonthLabel(month)} đến TTCM? Sau khi gửi, bạn chỉ chỉnh sửa lại khi TTCM yêu cầu.`)) return;
    setSaving(true);
    const result = await saveMyMonthlyReport(currentUser, context, month, payload, { submit, currentStatus: report?.status || 'draft' });
    setSaving(false);
    setWarning(result.warning || '');
    if (result.report) setReport(result.report);
    if (result.payload) setPayload(result.payload);
  };

  if (loading || !payload) return <main className="mr-shell"><div className="mr-loading"><LoaderCircle className="spin" /><h2>Đang mở báo cáo tháng…</h2></div></main>;

  return (
    <main className="mr-shell mr-teacher-shell">
      <header className="mr-topbar">
        <div className="mr-brand"><span><FileText /></span><div><small>BRIAN REPORTS</small><h1>Báo cáo công việc tháng</h1></div></div>
        <div className="mr-top-actions">
          <label><span>Tháng</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          {contexts.length > 1 && <label><span>Tổ</span><select value={contextIndex} onChange={(event) => setContextIndex(Number(event.target.value))}>{contexts.map((item, index) => <option key={`${item.departmentHeadId}-${item.departmentId}`} value={index}>{item.departmentName}</option>)}</select></label>}
          <span className={statusClass(report?.status)}>{REPORT_STATUS[report?.status || 'draft']}</span>
        </div>
      </header>

      <section className="mr-hero">
        <div><span><Sparkles /> {teacherName(currentUser)}</span><h2>{reportMonthLabel(month)}</h2><p>{context?.departmentName || 'Chưa xác định tổ chuyên môn'} · Năm học {payload.schoolYear}. Điền dữ liệu có phát sinh; các phần không phát sinh chỉ cần xác nhận.</p></div>
        <ProgressMeter payload={payload} />
      </section>

      {!contexts.length && <Notice warning={warning || 'Tài khoản chưa được TTCM thêm vào Brian Team. Bản nháp có thể soạn trên thiết bị, nhưng chưa thể gửi.'} />}
      {contexts.length > 0 && <Notice warning={warning} />}
      {report?.status === 'revision' && <div className="mr-revision"><MessageSquareWarning /><div><b>TTCM yêu cầu chỉnh sửa</b><p>{report.reviewerComment || 'Vui lòng rà soát và gửi lại báo cáo.'}</p></div></div>}
      {locked && <div className="mr-lock"><ShieldCheck /><div><b>{report.status === 'approved' ? 'Báo cáo đã được duyệt' : 'Báo cáo đang chờ TTCM duyệt'}</b><p>Nội dung đang khóa để bảo toàn bản đã gửi.</p></div></div>}

      <div className="mr-form-stack" aria-disabled={locked}>
        <SectionCard number="01" Icon={BookOpenCheck} title="Giảng dạy & tiến độ" text="Cập nhật từng lớp đang phụ trách, số tiết và vị trí chương trình." complete={checks[0]}>
          <div className="mr-row-list">
            {payload.teachingProgress.map((row, index) => (
              <article className="mr-repeat-card" key={row.id}>
                <header><b>Lớp {row.className || index + 1}</b>{payload.teachingProgress.length > 1 && <RowActions onDelete={() => removeRow('teachingProgress', row.id)} />}</header>
                <div className="mr-form-grid">
                  <Field label="Lớp"><input disabled={locked} value={row.className} onChange={(e) => patchRow('teachingProgress', row.id, { className: e.target.value })} placeholder="11.3" /></Field>
                  <Field label="Tiến độ"><select disabled={locked} value={row.status} onChange={(e) => patchRow('teachingProgress', row.id, { status: e.target.value })}>{Object.entries(PROGRESS_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Đang thực hiện đến" wide><input disabled={locked} value={row.currentContent} onChange={(e) => patchRow('teachingProgress', row.id, { currentContent: e.target.value })} placeholder="Unit 2 – Lesson 5: Listening" /></Field>
                  <Field label="Tiết theo kế hoạch"><input disabled={locked} type="number" min="0" value={row.plannedPeriods} onChange={(e) => patchRow('teachingProgress', row.id, { plannedPeriods: e.target.value })} /></Field>
                  <Field label="Tiết đã thực hiện"><input disabled={locked} type="number" min="0" value={row.completedPeriods} onChange={(e) => patchRow('teachingProgress', row.id, { completedPeriods: e.target.value })} /></Field>
                  <Field label="Tiết dạy bù"><input disabled={locked} type="number" min="0" value={row.makeupPeriods} onChange={(e) => patchRow('teachingProgress', row.id, { makeupPeriods: e.target.value })} /></Field>
                  <Field label="Tiết nghỉ/chưa thực hiện"><input disabled={locked} type="number" min="0" value={row.missedPeriods} onChange={(e) => patchRow('teachingProgress', row.id, { missedPeriods: e.target.value })} /></Field>
                  {row.status === 'delayed' && <><Field label="Chậm bao nhiêu tiết"><input disabled={locked} type="number" min="0" value={row.delayPeriods} onChange={(e) => patchRow('teachingProgress', row.id, { delayPeriods: e.target.value })} /></Field><Field label="Nguyên nhân"><input disabled={locked} value={row.delayReason} onChange={(e) => patchRow('teachingProgress', row.id, { delayReason: e.target.value })} /></Field><Field label="Kế hoạch khắc phục" wide><textarea disabled={locked} rows="2" value={row.recoveryPlan} onChange={(e) => patchRow('teachingProgress', row.id, { recoveryPlan: e.target.value })} /></Field></>}
                </div>
              </article>
            ))}
          </div>
          {!locked && <button className="mr-add" type="button" onClick={() => addRow('teachingProgress', 'progress', { className: '', status: 'on_track', currentContent: '', plannedPeriods: 0, completedPeriods: 0, makeupPeriods: 0, missedPeriods: 0, delayPeriods: 0, delayReason: '', recoveryPlan: '' })}><Plus /> Thêm lớp</button>}
        </SectionCard>

        <SectionCard number="02" Icon={ClipboardCheck} title="Kiểm tra – đánh giá" text="Ghi các hoạt động kiểm tra đã thực hiện; nếu không có, chọn Không phát sinh." complete={checks[1]}>
          <EmptyToggle checked={payload.assessmentNoActivity} onChange={(value) => patch({ assessmentNoActivity: value, assessments: value ? [] : payload.assessments })} />
          {!payload.assessmentNoActivity && <div className="mr-row-list">{payload.assessments.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Hoạt động kiểm tra'}</b><RowActions onDelete={() => removeRow('assessments', row.id)} /></header><div className="mr-form-grid"><Field label="Lớp/khối"><input disabled={locked} value={text(row.className)} onChange={(e) => patchRow('assessments', row.id, { className: e.target.value })} /></Field><Field label="Loại"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('assessments', row.id, { type: e.target.value })}><option value="">Chọn loại</option>{ASSESSMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Ngày"><input disabled={locked} type="date" value={text(row.date)} onChange={(e) => patchRow('assessments', row.id, { date: e.target.value })} /></Field><Field label="Số học sinh"><input disabled={locked} type="number" min="0" value={row.studentCount || 0} onChange={(e) => patchRow('assessments', row.id, { studentCount: e.target.value })} /></Field><Field label="Nội dung" wide><input disabled={locked} value={text(row.content)} onChange={(e) => patchRow('assessments', row.id, { content: e.target.value })} placeholder="Unit 2 / Reading / Vocabulary…" /></Field><Field label="Tình trạng" wide><div className="mr-inline-checks"><label><input disabled={locked} type="checkbox" checked={Boolean(row.graded)} onChange={(e) => patchRow('assessments', row.id, { graded: e.target.checked })} /> Đã chấm</label><label><input disabled={locked} type="checkbox" checked={Boolean(row.entered)} onChange={(e) => patchRow('assessments', row.id, { entered: e.target.checked })} /> Đã nhập điểm</label><label><input disabled={locked} type="checkbox" checked={Boolean(row.returned)} onChange={(e) => patchRow('assessments', row.id, { returned: e.target.checked })} /> Đã trả bài</label></div></Field></div></article>)}</div>}
          {!locked && !payload.assessmentNoActivity && <button className="mr-add" type="button" onClick={() => addRow('assessments', 'assessment', { className: '', type: '', date: '', content: '', studentCount: 0, graded: false, entered: false, returned: false })}><Plus /> Thêm hoạt động kiểm tra</button>}
          <ConfirmationToggle checked={payload.assessmentConfirmed} onChange={(value) => patch({ assessmentConfirmed: value })} />
        </SectionCard>

        <SectionCard number="03" Icon={UsersRound} title="Hoạt động chuyên môn" text="Dự giờ, thao giảng, chuyên đề, tập huấn, họp tổ và các hoạt động chuyên môn khác." complete={checks[2]}>
          <EmptyToggle checked={payload.professionalActivitiesNoActivity} onChange={(value) => patch({ professionalActivitiesNoActivity: value, professionalActivities: value ? [] : payload.professionalActivities })} />
          {!payload.professionalActivitiesNoActivity && <div className="mr-row-list">{payload.professionalActivities.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Hoạt động chuyên môn'}</b><RowActions onDelete={() => removeRow('professionalActivities', row.id)} /></header><div className="mr-form-grid"><Field label="Loại"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('professionalActivities', row.id, { type: e.target.value })}><option value="">Chọn hoạt động</option>{PROFESSIONAL_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Ngày"><input disabled={locked} type="date" value={text(row.date)} onChange={(e) => patchRow('professionalActivities', row.id, { date: e.target.value })} /></Field><Field label="Lớp"><input disabled={locked} value={text(row.className)} onChange={(e) => patchRow('professionalActivities', row.id, { className: e.target.value })} /></Field><Field label="Vai trò"><input disabled={locked} value={text(row.role)} onChange={(e) => patchRow('professionalActivities', row.id, { role: e.target.value })} placeholder="Tham gia / chủ trì / người dạy…" /></Field><Field label="Tên bài / chuyên đề" wide><input disabled={locked} value={text(row.title)} onChange={(e) => patchRow('professionalActivities', row.id, { title: e.target.value })} /></Field><Field label="Kết quả / ghi chú" wide><textarea disabled={locked} rows="2" value={text(row.result)} onChange={(e) => patchRow('professionalActivities', row.id, { result: e.target.value })} /></Field></div></article>)}</div>}
          {!locked && !payload.professionalActivitiesNoActivity && <button className="mr-add" type="button" onClick={() => addRow('professionalActivities', 'activity', { type: '', date: '', className: '', role: '', title: '', result: '' })}><Plus /> Thêm hoạt động chuyên môn</button>}
          <ConfirmationToggle checked={payload.professionalActivitiesConfirmed} onChange={(value) => patch({ professionalActivitiesConfirmed: value })} />
        </SectionCard>

        <SectionCard number="04" Icon={Laptop2} title="Học liệu – CNTT – thiết bị" text="Ghi sản phẩm/học liệu đã tạo hoặc sử dụng thay vì chỉ báo một con số UDCNTT." complete={checks[3]}>
          <EmptyToggle checked={payload.learningResourcesNoActivity} onChange={(value) => patch({ learningResourcesNoActivity: value, learningResources: value ? [] : payload.learningResources })} />
          {!payload.learningResourcesNoActivity && <div className="mr-row-list">{payload.learningResources.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Học liệu / sản phẩm'}</b><RowActions onDelete={() => removeRow('learningResources', row.id)} /></header><div className="mr-form-grid"><Field label="Loại"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('learningResources', row.id, { type: e.target.value })}><option value="">Chọn loại</option>{RESOURCE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Khối/lớp"><input disabled={locked} value={text(row.className)} onChange={(e) => patchRow('learningResources', row.id, { className: e.target.value })} /></Field><Field label="Số lượng"><input disabled={locked} type="number" min="1" value={row.quantity || 1} onChange={(e) => patchRow('learningResources', row.id, { quantity: e.target.value })} /></Field><Field label="Công cụ"><input disabled={locked} value={text(row.tool)} onChange={(e) => patchRow('learningResources', row.id, { tool: e.target.value })} placeholder="Canva, Wayground, PowerPoint…" /></Field><Field label="Tên sản phẩm" wide><input disabled={locked} value={text(row.title)} onChange={(e) => patchRow('learningResources', row.id, { title: e.target.value })} /></Field><Field label="Link minh chứng" wide><input disabled={locked} value={text(row.link)} onChange={(e) => patchRow('learningResources', row.id, { link: e.target.value })} placeholder="https://… (không bắt buộc)" /></Field></div></article>)}</div>}
          {!locked && !payload.learningResourcesNoActivity && <button className="mr-add" type="button" onClick={() => addRow('learningResources', 'resource', { type: '', className: '', quantity: 1, tool: '', title: '', link: '' })}><Plus /> Thêm học liệu / sản phẩm</button>}
          <ConfirmationToggle checked={payload.learningResourcesConfirmed} onChange={(value) => patch({ learningResourcesConfirmed: value })} />
        </SectionCard>

        <SectionCard number="05" Icon={GraduationCap} title="Bồi dưỡng chuyên môn" text="Tập huấn, hội thảo, khóa học, tự bồi dưỡng và nghiên cứu chương trình/tài liệu." complete={checks[4]}>
          <EmptyToggle checked={payload.professionalDevelopmentNoActivity} onChange={(value) => patch({ professionalDevelopmentNoActivity: value, professionalDevelopment: value ? [] : payload.professionalDevelopment })} />
          {!payload.professionalDevelopmentNoActivity && <div className="mr-row-list">{payload.professionalDevelopment.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Hoạt động bồi dưỡng'}</b><RowActions onDelete={() => removeRow('professionalDevelopment', row.id)} /></header><div className="mr-form-grid"><Field label="Loại"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('professionalDevelopment', row.id, { type: e.target.value })}><option value="">Chọn loại</option>{DEVELOPMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Ngày"><input disabled={locked} type="date" value={text(row.date)} onChange={(e) => patchRow('professionalDevelopment', row.id, { date: e.target.value })} /></Field><Field label="Đơn vị tổ chức"><input disabled={locked} value={text(row.organizer)} onChange={(e) => patchRow('professionalDevelopment', row.id, { organizer: e.target.value })} /></Field><Field label="Số giờ"><input disabled={locked} type="number" min="0" value={row.hours || 0} onChange={(e) => patchRow('professionalDevelopment', row.id, { hours: e.target.value })} /></Field><Field label="Tên hoạt động" wide><input disabled={locked} value={text(row.title)} onChange={(e) => patchRow('professionalDevelopment', row.id, { title: e.target.value })} /></Field><Field label="Kết quả" wide><textarea disabled={locked} rows="2" value={text(row.result)} onChange={(e) => patchRow('professionalDevelopment', row.id, { result: e.target.value })} /></Field></div></article>)}</div>}
          {!locked && !payload.professionalDevelopmentNoActivity && <button className="mr-add" type="button" onClick={() => addRow('professionalDevelopment', 'development', { type: '', date: '', organizer: '', hours: 0, title: '', result: '' })}><Plus /> Thêm hoạt động bồi dưỡng</button>}
          <ConfirmationToggle checked={payload.professionalDevelopmentConfirmed} onChange={(value) => patch({ professionalDevelopmentConfirmed: value })} />
        </SectionCard>

        <SectionCard number="06" Icon={ListChecks} title="Công việc khác trong tháng" text="Hỗ trợ học sinh, công tác chủ nhiệm và các nhiệm vụ chuyên môn/nhà trường khác." complete={checks[5]}>
          <EmptyToggle checked={payload.otherTasksNoActivity} onChange={(value) => patch({ otherTasksNoActivity: value, otherTasks: value ? [] : payload.otherTasks })} />
          {!payload.otherTasksNoActivity && <div className="mr-row-list">{payload.otherTasks.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Công việc'}</b><RowActions onDelete={() => removeRow('otherTasks', row.id)} /></header><div className="mr-form-grid"><Field label="Loại"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('otherTasks', row.id, { type: e.target.value })}><option value="">Chọn công việc</option>{TASK_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Lớp/đối tượng"><input disabled={locked} value={text(row.target)} onChange={(e) => patchRow('otherTasks', row.id, { target: e.target.value })} /></Field><Field label="Số buổi/lần"><input disabled={locked} type="number" min="0" value={row.sessions || 0} onChange={(e) => patchRow('otherTasks', row.id, { sessions: e.target.value })} /></Field><Field label="Số HS"><input disabled={locked} type="number" min="0" value={row.studentCount || 0} onChange={(e) => patchRow('otherTasks', row.id, { studentCount: e.target.value })} /></Field><Field label="Nội dung / kết quả" wide><textarea disabled={locked} rows="2" value={text(row.result)} onChange={(e) => patchRow('otherTasks', row.id, { result: e.target.value })} /></Field></div></article>)}</div>}
          {!locked && !payload.otherTasksNoActivity && <button className="mr-add" type="button" onClick={() => addRow('otherTasks', 'task', { type: '', target: '', sessions: 1, studentCount: 0, result: '' })}><Plus /> Thêm công việc</button>}
          {payload.homeroom?.enabled && <div className="mr-subsection"><h3><UserRoundCheck /> Công tác chủ nhiệm · {payload.homeroom.className}</h3><div className="mr-form-grid"><Field label="Chuyên cần"><select disabled={locked} value={text(payload.homeroom.attendance)} onChange={(e) => patch({ homeroom: { ...payload.homeroom, attendance: e.target.value } })}><option value="">Chọn mức</option><option>Tốt</option><option>Bình thường</option><option>Cần lưu ý</option></select></Field><Field label="Nề nếp/kỷ luật"><select disabled={locked} value={text(payload.homeroom.discipline)} onChange={(e) => patch({ homeroom: { ...payload.homeroom, discipline: e.target.value } })}><option value="">Chọn mức</option><option>Tốt</option><option>Bình thường</option><option>Cần lưu ý</option></select></Field><Field label="Học tập"><select disabled={locked} value={text(payload.homeroom.learning)} onChange={(e) => patch({ homeroom: { ...payload.homeroom, learning: e.target.value } })}><option value="">Chọn mức</option><option>Tốt</option><option>Bình thường</option><option>Cần lưu ý</option></select></Field><Field label="Phối hợp PHHS"><input disabled={locked} value={text(payload.homeroom.parentCoordination)} onChange={(e) => patch({ homeroom: { ...payload.homeroom, parentCoordination: e.target.value } })} /></Field><Field label="Nội dung cần lưu ý" wide><textarea disabled={locked} rows="2" value={text(payload.homeroom.notableCases)} onChange={(e) => patch({ homeroom: { ...payload.homeroom, notableCases: e.target.value } })} /></Field></div></div>}
          <ConfirmationToggle checked={payload.otherTasksConfirmed} onChange={(value) => patch({ otherTasksConfirmed: value })} />
        </SectionCard>

        <SectionCard number="07" Icon={Clock3} title="Kế hoạch – khó khăn – kiến nghị" text="Kế hoạch tháng tới là bắt buộc; khó khăn và kiến nghị chỉ nhập khi có." complete={checks[6]}>
          <div className="mr-subsection"><h3>Kế hoạch tháng tiếp theo</h3><div className="mr-row-list">{payload.nextPlans.map((row) => <article className="mr-repeat-card" key={row.id}><header><b>{row.type || 'Kế hoạch'}</b><RowActions onDelete={() => removeRow('nextPlans', row.id)} /></header><div className="mr-form-grid"><Field label="Nhóm"><select disabled={locked} value={text(row.type)} onChange={(e) => patchRow('nextPlans', row.id, { type: e.target.value })}><option value="">Chọn nhóm</option>{PLAN_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Thời gian"><input disabled={locked} value={text(row.time)} onChange={(e) => patchRow('nextPlans', row.id, { time: e.target.value })} placeholder="Tuần 1–2" /></Field><Field label="Lớp/đối tượng"><input disabled={locked} value={text(row.target)} onChange={(e) => patchRow('nextPlans', row.id, { target: e.target.value })} /></Field><Field label="Mục tiêu"><input disabled={locked} value={text(row.goal)} onChange={(e) => patchRow('nextPlans', row.id, { goal: e.target.value })} /></Field><Field label="Công việc" wide><input disabled={locked} value={text(row.task)} onChange={(e) => patchRow('nextPlans', row.id, { task: e.target.value })} /></Field></div></article>)}</div>{!locked && <button className="mr-add" type="button" onClick={() => addRow('nextPlans', 'plan', { type: '', time: '', target: '', goal: '', task: '' })}><Plus /> Thêm kế hoạch</button>}</div>
          <div className="mr-subsection"><h3>Khó khăn</h3><label className="mr-switch"><input disabled={locked} type="checkbox" checked={Boolean(payload.difficulties.has)} onChange={(e) => patch({ difficulties: { ...payload.difficulties, has: e.target.checked } })} /><span>Có khó khăn cần báo cáo</span></label>{payload.difficulties.has && <><div className="mr-chip-grid">{DIFFICULTY_CATEGORIES.map((item) => <label key={item}><input disabled={locked} type="checkbox" checked={payload.difficulties.categories.includes(item)} onChange={(e) => patch({ difficulties: { ...payload.difficulties, categories: e.target.checked ? [...payload.difficulties.categories, item] : payload.difficulties.categories.filter((value) => value !== item) } })} /><span>{item}</span></label>)}</div><div className="mr-form-grid"><Field label="Mô tả" wide><textarea disabled={locked} rows="2" value={text(payload.difficulties.description)} onChange={(e) => patch({ difficulties: { ...payload.difficulties, description: e.target.value } })} /></Field><Field label="Đã xử lý" wide><textarea disabled={locked} rows="2" value={text(payload.difficulties.handled)} onChange={(e) => patch({ difficulties: { ...payload.difficulties, handled: e.target.value } })} /></Field><Field label="Cần hỗ trợ" wide><textarea disabled={locked} rows="2" value={text(payload.difficulties.support)} onChange={(e) => patch({ difficulties: { ...payload.difficulties, support: e.target.value } })} /></Field></div></>}</div>
          <div className="mr-subsection"><h3>Kiến nghị / đề xuất</h3><label className="mr-switch"><input disabled={locked} type="checkbox" checked={Boolean(payload.recommendation.has)} onChange={(e) => patch({ recommendation: { ...payload.recommendation, has: e.target.checked } })} /><span>Có kiến nghị/đề xuất</span></label>{payload.recommendation.has && <div className="mr-form-grid"><Field label="Nhóm vấn đề"><input disabled={locked} value={text(payload.recommendation.category)} onChange={(e) => patch({ recommendation: { ...payload.recommendation, category: e.target.value } })} /></Field><Field label="Mức độ"><select disabled={locked} value={payload.recommendation.urgency} onChange={(e) => patch({ recommendation: { ...payload.recommendation, urgency: e.target.value } })}><option value="normal">Thông thường</option><option value="review">Cần xem xét</option><option value="urgent">Cần xử lý sớm</option></select></Field><Field label="Nơi đề nghị hỗ trợ"><select disabled={locked} value={payload.recommendation.target} onChange={(e) => patch({ recommendation: { ...payload.recommendation, target: e.target.value } })}><option>TTCM</option><option>BGH</option><option>Giáo vụ</option><option>IT</option><option>Khác</option></select></Field><Field label="Quyền xem"><label className="mr-private-check"><input disabled={locked} type="checkbox" checked={Boolean(payload.recommendation.private)} onChange={(e) => patch({ recommendation: { ...payload.recommendation, private: e.target.checked } })} /> Chỉ TTCM xem</label></Field><Field label="Nội dung" wide><textarea disabled={locked} rows="3" value={text(payload.recommendation.content)} onChange={(e) => patch({ recommendation: { ...payload.recommendation, content: e.target.value } })} /></Field></div>}</div>
        </SectionCard>
      </div>

      <footer className="mr-sticky-actions">
        <div><ProgressMeter payload={payload} /></div>
        <div className="mr-action-buttons"><button type="button" onClick={() => setPreview(true)}><FileText /> Xem trước</button><button type="button" disabled={locked || saving || !context} onClick={() => save(false)}><Save /> {saving ? 'Đang lưu…' : 'Lưu nháp'}</button><button type="button" className="is-primary" disabled={locked || saving || !context || !completion.ready} onClick={() => save(true)}><Send /> Gửi TTCM</button></div>
      </footer>
      {preview && <Modal title="Xem trước báo cáo" onClose={() => setPreview(false)} wide><PreviewPayload payload={payload} context={context} user={currentUser} report={report} /></Modal>}
    </main>
  );
}

function StatCard({ Icon, label, value, note }) {
  return <article className="mr-stat"><span><Icon /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function ReadOnlyReport({ report, member }) {
  const payload = report?.payload || {};
  const name = member?.account?.name || report?.teacherName || 'Giáo viên';
  return <div className="mr-read-report"><div className="mr-read-report-head"><div><small>{name}</small><h3>{reportMonthLabel(payload.month)}</h3><p>Năm học {payload.schoolYear}</p></div><span className={statusClass(report?.status)}>{REPORT_STATUS[report?.status] || report?.status}</span></div>
    <ReadSection title="1. Giảng dạy & tiến độ">{(payload.teachingProgress || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.className || 'Lớp'}</b><span>{PROGRESS_STATUS[row.status] || row.status}</span><p>{row.currentContent || '—'} · {row.completedPeriods || 0}/{row.plannedPeriods || 0} tiết</p>{row.status === 'delayed' && <small>Chậm {row.delayPeriods || 0} tiết · {row.delayReason || 'Chưa ghi nguyên nhân'} · {row.recoveryPlan || ''}</small>}</div>)}</ReadSection>
    <ReadSection title="2. Kiểm tra – đánh giá">{payload.assessmentNoActivity ? <p>Không phát sinh.</p> : (payload.assessments || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.type}</b><span>{row.className}</span><p>{row.content || '—'} {row.date ? `· ${row.date}` : ''}</p></div>)}</ReadSection>
    <ReadSection title="3. Hoạt động chuyên môn">{payload.professionalActivitiesNoActivity ? <p>Không phát sinh.</p> : (payload.professionalActivities || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.type}</b><span>{row.date || ''}</span><p>{row.title || row.result || '—'}</p></div>)}</ReadSection>
    <ReadSection title="4. Học liệu – CNTT – thiết bị">{payload.learningResourcesNoActivity ? <p>Không phát sinh.</p> : (payload.learningResources || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.type}</b><span>{row.quantity || 1}</span><p>{row.title || '—'} · {row.className || ''}</p></div>)}</ReadSection>
    <ReadSection title="5. Bồi dưỡng chuyên môn">{payload.professionalDevelopmentNoActivity ? <p>Không phát sinh.</p> : (payload.professionalDevelopment || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.type}</b><span>{row.hours || 0} giờ</span><p>{row.title || row.organizer || '—'}</p></div>)}</ReadSection>
    <ReadSection title="6. Công việc khác">{payload.otherTasksNoActivity ? <p>Không phát sinh.</p> : (payload.otherTasks || []).map((row) => <div className="mr-read-row" key={row.id}><b>{row.type}</b><span>{row.sessions || 0} buổi/lần</span><p>{row.target || ''} · {row.result || ''}</p></div>)}{payload.homeroom?.enabled && <div className="mr-read-block"><b>Chủ nhiệm {payload.homeroom.className}</b><p>Chuyên cần: {payload.homeroom.attendance || '—'} · Nề nếp: {payload.homeroom.discipline || '—'} · Học tập: {payload.homeroom.learning || '—'}</p><small>{payload.homeroom.notableCases || ''}</small></div>}</ReadSection>
    <ReadSection title="7. Kế hoạch – khó khăn – kiến nghị"><div className="mr-read-block"><b>Kế hoạch</b>{(payload.nextPlans || []).map((row) => <p key={row.id}>{row.task || row.goal || '—'} {row.time ? `· ${row.time}` : ''}</p>)}</div>{payload.difficulties?.has && <div className="mr-read-block"><b>Khó khăn</b><p>{payload.difficulties.description || payload.difficulties.categories?.join(', ') || '—'}</p><small>Cần hỗ trợ: {payload.difficulties.support || '—'}</small></div>}{payload.recommendation?.has && <div className={`mr-read-block ${payload.recommendation.private ? 'is-private' : ''}`}><b>Kiến nghị {payload.recommendation.private ? '· Chỉ TTCM xem' : ''}</b><p>{payload.recommendation.content || '—'}</p></div>}</ReadSection>
  </div>;
}

function ReadSection({ title, children }) {
  return <section className="mr-read-section"><h4>{title}</h4>{children}</section>;
}

function LeaderMonthlyReports({ currentUser, department, members }) {
  const [month, setMonth] = useState(currentReportMonth());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const memberMap = useMemo(() => new Map((members || []).map((item) => [String(item.teacherAccountId || item.account?.id || ''), item])), [members]);
  const reportMap = useMemo(() => new Map(reports.map((item) => [String(item.teacherId), item])), [reports]);
  const stats = useMemo(() => aggregateMonthlyReports(reports), [reports]);
  const selected = reports.find((item) => item.id === selectedId) || null;

  const reload = async () => {
    setLoading(true);
    const result = await listDepartmentMonthlyReports(currentUser, month, department?.id || '');
    setReports(result.reports || []);
    setWarning(result.warning || '');
    setLoading(false);
  };
  useEffect(() => { reload(); }, [currentUser?.id, department?.id, month]);

  const doReview = async (status) => {
    if (!selected) return;
    if (status === 'revision' && !reviewComment.trim()) {
      setWarning('Hãy ghi rõ nội dung giáo viên cần chỉnh sửa.');
      return;
    }
    const result = await reviewMonthlyReport(currentUser, selected.id, status, reviewComment);
    if (!result.ok) { setWarning(result.warning); return; }
    setSelectedId(''); setReviewComment(''); await reload();
  };
  const generate = () => {
    const html = buildDepartmentMonthlyReportHtml({ department, members, reports, month });
    setGeneratedHtml(html);
  };
  const exportWord = () => {
    const html = generatedHtml || buildDepartmentMonthlyReportHtml({ department, members, reports, month });
    const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Bao-cao-chuyen-mon-${month}.doc`; anchor.click(); URL.revokeObjectURL(url);
  };
  const printReport = () => {
    const html = generatedHtml || buildDepartmentMonthlyReportHtml({ department, members, reports, month });
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { setWarning('Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up và thử lại.'); return; }
    win.document.open(); win.document.write(html); win.document.close(); win.focus(); window.setTimeout(() => win.print(), 250);
  };

  const total = members?.length || 0;
  const missing = Math.max(0, total - reports.length);
  return (
    <div className="mr-manager">
      <div className="mr-manager-head"><div><small>BÁO CÁO THÁNG</small><h2>Tổng hợp báo cáo giáo viên</h2><p>{department?.name || 'Tổ chuyên môn'} · Theo dõi gửi, duyệt và tự tổng hợp thành báo cáo chuyên môn.</p></div><label><span>Tháng báo cáo</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label></div>
      <Notice warning={warning} />
      <div className="mr-stats-grid"><StatCard Icon={UsersRound} label="Giáo viên" value={total} note={`${missing} chưa gửi`} /><StatCard Icon={Send} label="Đã gửi" value={stats.submitted} note={`${stats.approved} đã duyệt`} /><StatCard Icon={BookOpenCheck} label="Lớp đúng tiến độ" value={`${stats.onTrackPercent}%`} note={`${stats.onTrackClasses}/${stats.teachingClasses || 0} lớp`} /><StatCard Icon={ClipboardCheck} label="KT – đánh giá" value={stats.assessments} note="Hoạt động đã báo cáo" /><StatCard Icon={UsersRound} label="Hoạt động CM" value={stats.professionalActivities} note={`${stats.observations} lượt dự giờ`} /><StatCard Icon={Laptop2} label="Học liệu" value={stats.resources} note="Sản phẩm/lượt" /><StatCard Icon={GraduationCap} label="Bồi dưỡng" value={stats.development} note="Hoạt động" /><StatCard Icon={MessageSquareWarning} label="Kiến nghị" value={stats.recommendations} note={`${stats.revision} báo cáo cần sửa`} /></div>

      <div className="mr-manager-toolbar"><div><button type="button" onClick={reload}><RefreshCw /> Làm mới</button><button type="button" className="is-primary" onClick={generate}><Sparkles /> Tạo báo cáo tổ</button></div><span>{reports.length}/{total || reports.length} giáo viên đã có báo cáo</span></div>

      <div className="mr-report-table-wrap">
        <table className="mr-report-table"><thead><tr><th>Giáo viên</th><th>Tiến độ</th><th>Hoạt động</th><th>Khó khăn</th><th>Trạng thái</th><th /></tr></thead><tbody>
          {(members || []).map((member) => {
            const teacherId = String(member.teacherAccountId || member.account?.id || ''); const report = reportMap.get(teacherId); const progress = report?.payload?.teachingProgress || []; const delayed = progress.filter((row) => row.status === 'delayed').length; const activities = (report?.payload?.professionalActivities || []).length;
            return <tr key={member.id || teacherId}><td><b>{member.account?.name || 'Giáo viên'}</b><small>{member.account?.email || ''}</small></td><td>{report ? (delayed ? <span className="mr-warning-text">{delayed} lớp chậm</span> : 'Đúng / nhanh') : '—'}</td><td>{report ? activities : '—'}</td><td>{report?.payload?.difficulties?.has ? 'Có' : report ? 'Không' : '—'}</td><td>{report ? <span className={statusClass(report.status)}>{REPORT_STATUS[report.status]}</span> : <span className="mr-status is-missing">Chưa gửi</span>}</td><td>{report && <button type="button" className="mr-open" onClick={() => { setSelectedId(report.id); setReviewComment(report.reviewerComment || ''); }}>Xem</button>}</td></tr>;
          })}
          {!members?.length && reports.map((report) => <tr key={report.id}><td><b>{memberMap.get(report.teacherId)?.account?.name || report.teacherId}</b></td><td>—</td><td>{report.payload?.professionalActivities?.length || 0}</td><td>{report.payload?.difficulties?.has ? 'Có' : 'Không'}</td><td><span className={statusClass(report.status)}>{REPORT_STATUS[report.status]}</span></td><td><button type="button" className="mr-open" onClick={() => setSelectedId(report.id)}>Xem</button></td></tr>)}
        </tbody></table>
        {loading && <div className="mr-table-loading"><LoaderCircle className="spin" /> Đang tải dữ liệu…</div>}
      </div>

      {generatedHtml && <section className="mr-generated"><header><div><small>BẢN TỔNG HỢP</small><h3>Báo cáo chuyên môn {reportMonthLabel(month)}</h3></div><div><button onClick={exportWord}><Download /> Xuất Word</button><button onClick={printReport}><Printer /> In / PDF</button><button className="mr-icon-btn" onClick={() => setGeneratedHtml('')}><X /></button></div></header><iframe title="Bản xem trước báo cáo chuyên môn" srcDoc={generatedHtml} /></section>}
      {selected && <Modal title={`Duyệt báo cáo · ${memberMap.get(selected.teacherId)?.account?.name || 'Giáo viên'}`} onClose={() => { setSelectedId(''); setReviewComment(''); }} wide><ReadOnlyReport report={selected} member={memberMap.get(selected.teacherId)} /><div className="mr-review-box"><Field label="Nhận xét của TTCM" wide><textarea rows="3" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Bắt buộc khi yêu cầu chỉnh sửa; tùy chọn khi duyệt." /></Field><div className="mr-review-actions"><button type="button" className="is-revision" onClick={() => doReview('revision')}><MessageSquareWarning /> Yêu cầu chỉnh sửa</button><button type="button" className="is-primary" onClick={() => doReview('approved')}><FileCheck2 /> Duyệt báo cáo</button></div></div></Modal>}
    </div>
  );
}

function LeaderMonthlyReportsLoader({ currentUser, department: suppliedDepartment = null, members: suppliedMembers = [] }) {
  const [state, setState] = useState({ loading: !suppliedDepartment, department: suppliedDepartment, members: suppliedMembers, warning: '' });
  useEffect(() => {
    if (suppliedDepartment) {
      setState({ loading: false, department: suppliedDepartment, members: suppliedMembers, warning: '' });
      return undefined;
    }
    let alive = true;
    Promise.all([loadTeamWorkspace(currentUser), listTeamTeacherAccounts(currentUser)]).then(([workspaceResult, accounts]) => {
      if (!alive) return;
      const workspace = workspaceResult.workspace;
      const department = workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId) || workspace?.departments?.[0] || null;
      const accountMap = new Map((accounts || []).map((item) => [String(item.id), item]));
      const members = (department?.members || []).map((item) => ({ ...item, account: accountMap.get(String(item.teacherAccountId)) || { id: item.teacherAccountId, name: 'Tài khoản giáo viên', email: '' } }));
      setState({ loading: false, department, members, warning: workspaceResult.warning || '' });
    }).catch((error) => alive && setState({ loading: false, department: null, members: [], warning: error?.message || 'Không tải được dữ liệu Brian Team.' }));
    return () => { alive = false; };
  }, [currentUser?.id, suppliedDepartment]);
  if (state.loading) return <div className="mr-loading"><LoaderCircle className="spin" /><h2>Đang tải dữ liệu tổ chuyên môn…</h2></div>;
  if (!state.department) return <div><Notice warning={state.warning || 'Chưa có tổ chuyên môn trong Brian Team.'} /><div className="mr-loading"><UsersRound /><h2>Chưa có dữ liệu tổ chuyên môn</h2><p>Hãy thiết lập thành viên trong Brian Team trước khi tổng hợp báo cáo.</p></div></div>;
  return <><Notice warning={state.warning} /><LeaderMonthlyReports currentUser={currentUser} department={state.department} members={state.members} /></>;
}

export default function MonthlyReportsWorkspace({ currentUser, department = null, members = [] }) {
  if (isDepartmentLeaderRole(currentUser?.role)) return <LeaderMonthlyReportsLoader currentUser={currentUser} department={department} members={members} />;
  return <TeacherMonthlyReports currentUser={currentUser} />;
}
