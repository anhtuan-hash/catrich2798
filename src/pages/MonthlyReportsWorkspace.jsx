import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Download, FileCheck2, FileText,
  LoaderCircle, MessageSquareWarning, Printer, RefreshCw, Save, Send,
  ShieldCheck, Sparkles, UsersRound, X,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { listTeamTeacherAccounts, loadTeamWorkspace } from '../utils/personnelHub.js';
import {
  PROFESSIONAL_STAT_DEFINITIONS, REPORT_STATUS, aggregateMonthlyReports,
  buildDepartmentMonthlyReportHtml, cacheMonthlyDraft, createEmptyMonthlyPayload,
  currentReportMonth, listDepartmentMonthlyReports, loadMonthlyReportContexts,
  loadMyMonthlyReport, normalizeMonthlyPayload, reportCompletion, reportMonthLabel,
  reviewMonthlyReport, saveMyMonthlyReport,
} from '../utils/monthlyReports.js';
import './MonthlyReportsWorkspace.css';

const teacherName = (user) => user?.full_name || user?.name || user?.email || 'Giáo viên';
const statusClass = (status) => `mr-status is-${status || 'draft'}`;
const text = (value) => String(value ?? '');

const PLACEHOLDERS = Object.freeze({
  organization: 'Gợi ý: Thực hiện nghiêm túc nội quy, nề nếp chuyên môn; tham gia đầy đủ, đúng giờ các cuộc họp, sinh hoạt tổ, tập huấn và hoạt động của nhà trường; thực hiện đúng quy định về hồ sơ, giờ giấc và tác phong chuyên môn…',
  development: 'Gợi ý: Tham gia tập huấn/bồi dưỡng chuyên môn; tự nghiên cứu chương trình, SGK, tài liệu hướng dẫn, văn bản chuyên môn; trao đổi chuyên môn trong tổ; cập nhật phương pháp và công cụ dạy học…',
  monthly: 'Gợi ý: Nêu ngắn gọn tình hình thực hiện chương trình trong tháng; nội dung đã dạy; kiểm tra – đánh giá; công tác chủ nhiệm nếu có; phụ đạo/bồi dưỡng học sinh; hồ sơ chuyên môn; nhiệm vụ được phân công; những nội dung nổi bật hoặc cần lưu ý…',
  plan: 'Gợi ý: Tiếp tục thực hiện chương trình đúng tiến độ; hoàn thiện hồ sơ; thực hiện kiểm tra – đánh giá; dự giờ/thao giảng/chuyên đề; phụ đạo, bồi dưỡng hoặc ôn thi; công tác chủ nhiệm; các nhiệm vụ được TTCM/BGH phân công…',
  recommendation: 'Gợi ý: Nêu khó khăn, đề xuất hoặc kiến nghị đối với TTCM/BGH nếu có. Nếu không có, có thể để trống hoặc ghi “Không có”.',
});

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="mr-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`mr-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><small>BRIAN REPORTS</small><h2>{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Đóng"><X /></button>
        </header>
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
      <small>{completion.completed}/{completion.total} mục bắt buộc đã hoàn tất</small>
    </div>
  );
}

function SectionCard({ number, title, description, complete, children }) {
  return (
    <section className={`mr-section ${complete ? 'is-complete' : ''}`}>
      <header>
        <span className="mr-section-icon"><ClipboardList /></span>
        <div><small>PHẦN {number}</small><h2>{title}</h2><p>{description}</p></div>
        {complete && <CheckCircle2 className="mr-section-check" />}
      </header>
      <div className="mr-section-body">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="mr-field span-2">
      <span>{label}</span>
      {children}
      {hint && <small className="mr-field-hint">{hint}</small>}
    </label>
  );
}

function ProfessionalStatsTable({ stats, locked = false, onChange = null, compact = false }) {
  return (
    <div className="mr-number-table-wrap">
      <table className={`mr-number-table ${compact ? 'is-compact' : ''}`}>
        <thead><tr><th>Nội dung</th><th>Số lượng</th></tr></thead>
        <tbody>
          {PROFESSIONAL_STAT_DEFINITIONS.map(({ key, label }) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                {onChange
                  ? <input aria-label={label} disabled={locked} type="number" min="0" step="1" value={stats?.[key] ?? 0} onChange={(event) => onChange(key, event.target.value)} />
                  : <strong>{Number(stats?.[key] || 0)}</strong>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPayload({ payload, context, user, report }) {
  const completion = reportCompletion(payload);
  return (
    <div className="mr-preview mr-template-preview">
      <div className="mr-preview-head">
        <div><small>{reportMonthLabel(payload.month)}</small><h3>{teacherName(user)}</h3><p>{context?.departmentName || 'Tổ chuyên môn'} · Năm học {payload.schoolYear}</p></div>
        <span className={statusClass(report?.status)}>{REPORT_STATUS[report?.status || 'draft']}</span>
      </div>
      <section className="mr-read-section"><h4>I. Công tác tổ chức</h4><div className="mr-read-block"><b>Thực hiện nội quy, nề nếp giáo viên</b><p>{payload.organizationNarrative || '—'}</p></div><div className="mr-read-block"><b>Công tác bồi dưỡng thường xuyên</b><p>{payload.professionalDevelopmentNarrative || '—'}</p></div></section>
      <section className="mr-read-section"><h4>Số liệu chuyên môn</h4><ProfessionalStatsTable stats={payload.professionalStats} compact /></section>
      <section className="mr-read-section"><h4>II. Tình hình thực hiện chuyên môn trong tháng</h4><p>{payload.monthlyProfessionalNarrative || '—'}</p></section>
      <section className="mr-read-section"><h4>III. Kế hoạch thực hiện trong thời gian tới</h4><p>{payload.nextPlanNarrative || '—'}</p></section>
      <section className="mr-read-section"><h4>IV. Một số ý kiến, kiến nghị (nếu có)</h4><p>{payload.recommendationNarrative || 'Không có.'}</p></section>
      <p className="mr-preview-ready">{completion.ready ? 'Báo cáo đã đủ dữ liệu bắt buộc để gửi TTCM.' : `Còn ${completion.total - completion.completed} mục bắt buộc cần hoàn thiện.`}</p>
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
  const patch = (values) => {
    if (locked) return;
    setPayload((current) => ({ ...current, ...values, updatedAt: new Date().toISOString() }));
  };
  const patchStat = (key, value) => {
    if (locked) return;
    patch({ professionalStats: { ...payload.professionalStats, [key]: Math.max(0, Number(value || 0) || 0) } });
  };

  const save = async (submit = false) => {
    if (!payload || !context) return;
    if (submit && !completion.ready) {
      setWarning('Báo cáo chưa hoàn tất các mục bắt buộc. Hãy điền các đề mục bằng chữ và xác nhận bảng số liệu chuyên môn.');
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
        <div><span><Sparkles /> {teacherName(currentUser)}</span><h2>{reportMonthLabel(month)}</h2><p>{context?.departmentName || 'Chưa xác định tổ chuyên môn'} · Năm học {payload.schoolYear}. Form được giữ theo đúng cấu trúc báo cáo: nhập số trong bảng, các đề mục còn lại chỉ cần viết ngắn gọn theo gợi ý.</p></div>
        <ProgressMeter payload={payload} />
      </section>

      <section className="mr-report-meta">
        <div><span>Giáo viên</span><strong>{teacherName(currentUser)}</strong></div>
        <div><span>Tổ chuyên môn</span><strong>{context?.departmentName || '—'}</strong></div>
        <div><span>Lớp giảng dạy</span><strong>{context?.teachingClasses?.join(', ') || '—'}</strong></div>
        <div><span>Lớp chủ nhiệm</span><strong>{context?.homeroomClass || 'Không'}</strong></div>
      </section>

      {!contexts.length && <Notice warning={warning || 'Tài khoản chưa được TTCM thêm vào Brian Team. Bản nháp có thể soạn trên thiết bị, nhưng chưa thể gửi.'} />}
      {contexts.length > 0 && <Notice warning={warning} />}
      {report?.status === 'revision' && <div className="mr-revision"><MessageSquareWarning /><div><b>TTCM yêu cầu chỉnh sửa</b><p>{report.reviewerComment || 'Vui lòng rà soát và gửi lại báo cáo.'}</p></div></div>}
      {locked && <div className="mr-lock"><ShieldCheck /><div><b>{report.status === 'approved' ? 'Báo cáo đã được duyệt' : 'Báo cáo đang chờ TTCM duyệt'}</b><p>Nội dung đang khóa để bảo toàn bản đã gửi.</p></div></div>}

      <div className="mr-form-stack" aria-disabled={locked}>
        <SectionCard number="01" title="Công tác tổ chức" description="Chỉ nhập nội dung bằng chữ; hệ thống đã hiển thị gợi ý để giáo viên viết nhanh." complete={checks[0] && checks[1]}>
          <div className="mr-form-grid mr-text-only-grid">
            <Field label="1. Thực hiện nội quy, nề nếp giáo viên"><textarea disabled={locked} rows="5" value={text(payload.organizationNarrative)} onChange={(event) => patch({ organizationNarrative: event.target.value })} placeholder={PLACEHOLDERS.organization} /></Field>
            <Field label="2. Công tác bồi dưỡng thường xuyên"><textarea disabled={locked} rows="5" value={text(payload.professionalDevelopmentNarrative)} onChange={(event) => patch({ professionalDevelopmentNarrative: event.target.value })} placeholder={PLACEHOLDERS.development} /></Field>
          </div>
        </SectionCard>

        <SectionCard number="02" title="Số liệu chuyên môn" description="Giữ nguyên đầy đủ bảng số liệu của mẫu báo cáo. Nếu không phát sinh, nhập 0." complete={checks[2]}>
          <ProfessionalStatsTable stats={payload.professionalStats} locked={locked} onChange={patchStat} />
          <label className="mr-confirm mr-table-confirm"><input disabled={locked} type="checkbox" checked={Boolean(payload.professionalStatsConfirmed)} onChange={(event) => patch({ professionalStatsConfirmed: event.target.checked })} /><span>Tôi đã kiểm tra và xác nhận toàn bộ số liệu trong bảng trên.</span></label>
        </SectionCard>

        <SectionCard number="03" title="Tình hình thực hiện chuyên môn trong tháng" description="Một ô báo cáo tổng hợp, không khai báo chi tiết từng hoạt động." complete={checks[3]}>
          <div className="mr-form-grid mr-text-only-grid"><Field label="Nội dung báo cáo"><textarea disabled={locked} rows="9" value={text(payload.monthlyProfessionalNarrative)} onChange={(event) => patch({ monthlyProfessionalNarrative: event.target.value })} placeholder={PLACEHOLDERS.monthly} /></Field></div>
        </SectionCard>

        <SectionCard number="04" title="Kế hoạch thực hiện trong thời gian tới" description="Chỉ nhập các nhiệm vụ trọng tâm, không cần tạo từng dòng công việc." complete={checks[4]}>
          <div className="mr-form-grid mr-text-only-grid"><Field label="Kế hoạch"><textarea disabled={locked} rows="8" value={text(payload.nextPlanNarrative)} onChange={(event) => patch({ nextPlanNarrative: event.target.value })} placeholder={PLACEHOLDERS.plan} /></Field></div>
        </SectionCard>

        <SectionCard number="05" title="Một số ý kiến, kiến nghị (nếu có)" description="Mục này không bắt buộc." complete={Boolean(text(payload.recommendationNarrative).trim())}>
          <div className="mr-form-grid mr-text-only-grid"><Field label="Ý kiến / kiến nghị"><textarea disabled={locked} rows="5" value={text(payload.recommendationNarrative)} onChange={(event) => patch({ recommendationNarrative: event.target.value })} placeholder={PLACEHOLDERS.recommendation} /></Field></div>
        </SectionCard>
      </div>

      <footer className="mr-sticky-actions">
        <div><ProgressMeter payload={payload} /></div>
        <div className="mr-action-buttons">
          <button type="button" onClick={() => setPreview(true)}><FileText /> Xem trước</button>
          <button type="button" disabled={locked || saving || !context} onClick={() => save(false)}><Save /> {saving ? 'Đang lưu…' : 'Lưu nháp'}</button>
          <button type="button" className="is-primary" disabled={locked || saving || !context || !completion.ready} onClick={() => save(true)}><Send /> Gửi TTCM</button>
        </div>
      </footer>

      {preview && <Modal title="Xem trước báo cáo" onClose={() => setPreview(false)} wide><PreviewPayload payload={payload} context={context} user={currentUser} report={report} /></Modal>}
    </main>
  );
}

function StatCard({ label, value, note }) {
  return <article className="mr-stat"><span><ClipboardList /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function ReadOnlyReport({ report, member }) {
  const payload = report?.payload || {};
  const name = member?.account?.name || 'Giáo viên';
  return (
    <div className="mr-read-report">
      <div className="mr-read-report-head"><div><small>{name}</small><h3>{reportMonthLabel(payload.month)}</h3><p>Năm học {payload.schoolYear}</p></div><span className={statusClass(report?.status)}>{REPORT_STATUS[report?.status] || report?.status}</span></div>
      <section className="mr-read-section"><h4>I. Công tác tổ chức</h4><div className="mr-read-block"><b>Thực hiện nội quy, nề nếp giáo viên</b><p>{payload.organizationNarrative || '—'}</p></div><div className="mr-read-block"><b>Công tác bồi dưỡng thường xuyên</b><p>{payload.professionalDevelopmentNarrative || '—'}</p></div></section>
      <section className="mr-read-section"><h4>Số liệu chuyên môn</h4><ProfessionalStatsTable stats={payload.professionalStats} compact /></section>
      <section className="mr-read-section"><h4>II. Tình hình thực hiện chuyên môn trong tháng</h4><p>{payload.monthlyProfessionalNarrative || '—'}</p></section>
      <section className="mr-read-section"><h4>III. Kế hoạch thực hiện trong thời gian tới</h4><p>{payload.nextPlanNarrative || '—'}</p></section>
      <section className="mr-read-section"><h4>IV. Một số ý kiến, kiến nghị (nếu có)</h4><p>{payload.recommendationNarrative || 'Không có.'}</p></section>
    </div>
  );
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
  const summary = useMemo(() => aggregateMonthlyReports(reports), [reports]);
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
    setSelectedId('');
    setReviewComment('');
    await reload();
  };

  const generate = () => setGeneratedHtml(buildDepartmentMonthlyReportHtml({ department, members, reports, month }));
  const exportWord = () => {
    const html = generatedHtml || buildDepartmentMonthlyReportHtml({ department, members, reports, month });
    const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Bao-cao-chuyen-mon-${month}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const printReport = () => {
    const html = generatedHtml || buildDepartmentMonthlyReportHtml({ department, members, reports, month });
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { setWarning('Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up và thử lại.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);
  };

  const total = members?.length || 0;
  const missing = Math.max(0, total - reports.length);

  return (
    <div className="mr-manager">
      <div className="mr-manager-head"><div><small>BÁO CÁO THÁNG</small><h2>Tổng hợp báo cáo giáo viên</h2><p>{department?.name || 'Tổ chuyên môn'} · Số liệu được cộng trực tiếp từ bảng của từng giáo viên; phần chữ được giữ nguyên để TTCM tổng hợp.</p></div><label><span>Tháng báo cáo</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
      <Notice warning={warning} />

      <div className="mr-stats-grid">
        <StatCard label="Giáo viên" value={total} note={`${missing} chưa gửi`} />
        <StatCard label="Đã gửi" value={summary.submitted} note={`${summary.approved} đã duyệt`} />
        <StatCard label="Dự giờ" value={summary.stats.observations} note="Tổng lượt" />
        <StatCard label="Thao giảng" value={summary.stats.demonstrations} note="Tổng lượt" />
        <StatCard label="UDCNTT" value={summary.stats.itApplications} note="Tổng số" />
        <StatCard label="SH chuyên đề" value={summary.stats.seminars} note="Tổng số" />
        <StatCard label="Kho học liệu số" value={summary.stats.digitalRepository} note="Tổng lượt khai thác" />
        <StatCard label="Kiến nghị" value={summary.recommendations} note={`${summary.revision} báo cáo cần sửa`} />
      </div>

      <section className="mr-aggregate-table-card">
        <header><div><small>TỔNG HỢP TỪ GIÁO VIÊN</small><h3>Bảng số liệu chuyên môn</h3></div></header>
        <ProfessionalStatsTable stats={summary.stats} compact />
      </section>

      <div className="mr-manager-toolbar"><div><button type="button" onClick={reload}><RefreshCw /> Làm mới</button><button type="button" className="is-primary" onClick={generate}><Sparkles /> Tạo báo cáo tổ</button></div><span>{reports.length}/{total || reports.length} giáo viên đã có báo cáo</span></div>

      <div className="mr-report-table-wrap">
        <table className="mr-report-table"><thead><tr><th>Giáo viên</th><th>Dự giờ</th><th>Thao giảng</th><th>UDCNTT</th><th>Kiến nghị</th><th>Trạng thái</th><th /></tr></thead><tbody>
          {(members || []).map((member) => {
            const teacherId = String(member.teacherAccountId || member.account?.id || '');
            const report = reportMap.get(teacherId);
            const stats = report?.payload?.professionalStats || {};
            return <tr key={member.id || teacherId}><td><b>{member.account?.name || 'Giáo viên'}</b><small>{member.account?.email || ''}</small></td><td>{report ? Number(stats.observations || 0) : '—'}</td><td>{report ? Number(stats.demonstrations || 0) : '—'}</td><td>{report ? Number(stats.itApplications || 0) : '—'}</td><td>{report ? (report.payload.recommendationNarrative ? 'Có' : 'Không') : '—'}</td><td>{report ? <span className={statusClass(report.status)}>{REPORT_STATUS[report.status]}</span> : <span className="mr-status is-missing">Chưa gửi</span>}</td><td>{report && <button type="button" className="mr-open" onClick={() => { setSelectedId(report.id); setReviewComment(report.reviewerComment || ''); }}>Xem</button>}</td></tr>;
          })}
          {!members?.length && reports.map((report) => <tr key={report.id}><td><b>{memberMap.get(report.teacherId)?.account?.name || report.teacherId}</b></td><td>{report.payload?.professionalStats?.observations || 0}</td><td>{report.payload?.professionalStats?.demonstrations || 0}</td><td>{report.payload?.professionalStats?.itApplications || 0}</td><td>{report.payload?.recommendationNarrative ? 'Có' : 'Không'}</td><td><span className={statusClass(report.status)}>{REPORT_STATUS[report.status]}</span></td><td><button type="button" className="mr-open" onClick={() => setSelectedId(report.id)}>Xem</button></td></tr>)}
        </tbody></table>
        {loading && <div className="mr-table-loading"><LoaderCircle className="spin" /> Đang tải dữ liệu…</div>}
      </div>

      {generatedHtml && <section className="mr-generated"><header><div><small>BẢN TỔNG HỢP</small><h3>Báo cáo chuyên môn {reportMonthLabel(month)}</h3></div><div><button onClick={exportWord}><Download /> Xuất Word</button><button onClick={printReport}><Printer /> In / PDF</button><button className="mr-icon-btn" onClick={() => setGeneratedHtml('')}><X /></button></div></header><iframe title="Bản xem trước báo cáo chuyên môn" srcDoc={generatedHtml} /></section>}

      {selected && <Modal title={`Duyệt báo cáo · ${memberMap.get(selected.teacherId)?.account?.name || 'Giáo viên'}`} onClose={() => { setSelectedId(''); setReviewComment(''); }} wide><ReadOnlyReport report={selected} member={memberMap.get(selected.teacherId)} /><div className="mr-review-box"><Field label="Nhận xét của TTCM"><textarea rows="3" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Bắt buộc khi yêu cầu chỉnh sửa; tùy chọn khi duyệt." /></Field><div className="mr-review-actions"><button type="button" className="is-revision" onClick={() => doReview('revision')}><MessageSquareWarning /> Yêu cầu chỉnh sửa</button><button type="button" className="is-primary" onClick={() => doReview('approved')}><FileCheck2 /> Duyệt báo cáo</button></div></div></Modal>}
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
