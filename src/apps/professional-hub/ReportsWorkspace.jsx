import React, { useMemo, useState } from 'react';
import './reports-workspace.css';

const PERIODS = ['Tháng này', 'Học kỳ I', 'Học kỳ II', 'Cả năm'];
const REPORT_TYPES = ['Báo cáo tổng hợp', 'Báo cáo nhiệm vụ', 'Báo cáo hồ sơ', 'Báo cáo kế hoạch', 'Báo cáo minh chứng'];

const percent = (value, total) => total ? Math.round((value / total) * 100) : 0;
const safeArray = (value) => Array.isArray(value) ? value : [];
const todayLabel = () => new Date().toLocaleDateString('vi-VN');

function download(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, note }) {
  return <article className="rp-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ProgressRow({ label, value, detail }) {
  return <div className="rp-progress-row"><div><strong>{label}</strong><small>{detail}</small></div><div className="rp-progress"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div><b>{value}%</b></div>;
}

function buildHtml({ title, period, summary, notes }) {
  const rows = [
    ['Nhiệm vụ', summary.tasks.total, `${summary.tasks.done} hoàn thành`],
    ['Hồ sơ', summary.records.total, `${summary.records.approved} đã duyệt/lưu kho`],
    ['Kế hoạch', summary.plans.total, `${summary.plans.avgProgress}% tiến độ trung bình`],
    ['Cuộc họp', summary.meetings.total, `${summary.meetings.finished} đã hoàn tất`],
    ['Minh chứng', summary.evidence.total, `${summary.evidence.verified} đã xác minh/lưu kho`],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#222}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ccc;padding:10px;text-align:left}small{color:#666}.notes{margin-top:24px;white-space:pre-wrap}</style></head><body><h1>${title}</h1><p><strong>Kỳ báo cáo:</strong> ${period}</p><p><strong>Ngày xuất:</strong> ${todayLabel()}</p><table><thead><tr><th>Nhóm dữ liệu</th><th>Tổng số</th><th>Kết quả</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('')}</tbody></table><div class="notes"><h2>Nhận xét</h2>${notes || 'Chưa có nhận xét bổ sung.'}</div></body></html>`;
}

export default function ReportsWorkspace({ tasks, records, plans, meetings, evidence, reportHistory, setReportHistory, setToast }) {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [type, setType] = useState(REPORT_TYPES[0]);
  const [title, setTitle] = useState('Báo cáo hoạt động tổ chuyên môn');
  const [notes, setNotes] = useState('Hub Chuyên môn duy trì tiến độ ổn định. Cần tiếp tục theo dõi các nhiệm vụ quá hạn và hồ sơ cần chỉnh sửa.');
  const [savedTemplate, setSavedTemplate] = useState(false);

  const summary = useMemo(() => {
    const taskItems = safeArray(tasks);
    const recordItems = safeArray(records);
    const planItems = safeArray(plans);
    const meetingItems = safeArray(meetings);
    const evidenceItems = safeArray(evidence);
    const doneTasks = taskItems.filter((item) => ['Hoàn thành', 'Đã nộp'].includes(item.status)).length;
    const approvedRecords = recordItems.filter((item) => ['Đã duyệt', 'Đã lưu kho'].includes(item.status)).length;
    const avgPlanProgress = planItems.length ? Math.round(planItems.reduce((sum, item) => sum + Number(item.progress || 0), 0) / planItems.length) : 0;
    const finishedMeetings = meetingItems.filter((item) => ['Đã kết thúc', 'Đã lưu biên bản'].includes(item.status)).length;
    const verifiedEvidence = evidenceItems.filter((item) => ['Đã xác minh', 'Đã lưu kho'].includes(item.status)).length;
    return {
      tasks: { total: taskItems.length, done: doneTasks, rate: percent(doneTasks, taskItems.length) },
      records: { total: recordItems.length, approved: approvedRecords, rate: percent(approvedRecords, recordItems.length) },
      plans: { total: planItems.length, avgProgress: avgPlanProgress },
      meetings: { total: meetingItems.length, finished: finishedMeetings, rate: percent(finishedMeetings, meetingItems.length) },
      evidence: { total: evidenceItems.length, verified: verifiedEvidence, rate: percent(verifiedEvidence, evidenceItems.length) },
    };
  }, [tasks, records, plans, meetings, evidence]);

  const html = buildHtml({ title, period, summary, notes });

  const addHistory = (format) => {
    const entry = { id: Date.now(), title, period, type, format, date: new Date().toLocaleString('vi-VN') };
    setReportHistory((items) => [entry, ...items].slice(0, 12));
  };

  const exportHtml = () => { download('bao-cao-to-chuyen-mon.html', 'text/html;charset=utf-8', html); addHistory('HTML'); setToast('Đã xuất báo cáo HTML.'); };
  const exportWord = () => { download('bao-cao-to-chuyen-mon.doc', 'application/msword', html); addHistory('Word'); setToast('Đã xuất báo cáo Word.'); };
  const exportPdf = () => { addHistory('PDF/In'); setToast('Đã mở hộp thoại in để lưu PDF.'); window.print(); };
  const saveTemplate = () => {
    localStorage.setItem('department-v3-report-template', JSON.stringify({ title, period, type, notes }));
    setSavedTemplate(true);
    setToast('Đã lưu mẫu báo cáo.');
  };
  const restoreTemplate = () => {
    try {
      const value = JSON.parse(localStorage.getItem('department-v3-report-template') || 'null');
      if (value) { setTitle(value.title); setPeriod(value.period); setType(value.type); setNotes(value.notes); setSavedTemplate(true); setToast('Đã khôi phục mẫu báo cáo.'); }
    } catch { setToast('Không thể đọc mẫu báo cáo.'); }
  };

  return <main className="rp-workspace">
    <section className="rp-hero"><div><span>BÁO CÁO VÀ PHÂN TÍCH</span><h1>Tổng hợp hoạt động chuyên môn</h1><p>Tự động tổng hợp dữ liệu từ Giao việc, Hồ sơ, Kế hoạch, Sinh hoạt tổ và Minh chứng.</p></div><div className="rp-hero-actions"><button onClick={restoreTemplate}>Khôi phục mẫu</button><button className="primary" onClick={saveTemplate}>{savedTemplate ? 'Đã lưu mẫu' : 'Lưu mẫu báo cáo'}</button></div></section>

    <section className="rp-metrics">
      <Metric label="Nhiệm vụ hoàn thành" value={`${summary.tasks.rate}%`} note={`${summary.tasks.done}/${summary.tasks.total} nhiệm vụ`} />
      <Metric label="Hồ sơ đạt yêu cầu" value={`${summary.records.rate}%`} note={`${summary.records.approved}/${summary.records.total} hồ sơ`} />
      <Metric label="Tiến độ kế hoạch" value={`${summary.plans.avgProgress}%`} note={`${summary.plans.total} kế hoạch`} />
      <Metric label="Minh chứng xác minh" value={`${summary.evidence.rate}%`} note={`${summary.evidence.verified}/${summary.evidence.total} minh chứng`} />
    </section>

    <section className="rp-grid">
      <article className="rp-card rp-builder">
        <header><div><span>THIẾT LẬP BÁO CÁO</span><h2>Nội dung xuất báo cáo</h2></div></header>
        <div className="rp-form">
          <label className="wide">Tên báo cáo<input aria-label="Tên báo cáo" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Kỳ báo cáo<select aria-label="Kỳ báo cáo" value={period} onChange={(event) => setPeriod(event.target.value)}>{PERIODS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Loại báo cáo<select aria-label="Loại báo cáo" value={type} onChange={(event) => setType(event.target.value)}>{REPORT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="wide">Nhận xét và kiến nghị<textarea aria-label="Nhận xét báo cáo" rows="7" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <footer><button onClick={exportHtml}>Xuất HTML</button><button onClick={exportWord}>Xuất Word</button><button className="primary" onClick={exportPdf}>In / Lưu PDF</button></footer>
      </article>

      <article className="rp-card rp-analysis">
        <header><div><span>PHÂN TÍCH NHANH</span><h2>Mức độ hoàn thành</h2></div></header>
        <div className="rp-progress-list">
          <ProgressRow label="Nhiệm vụ" value={summary.tasks.rate} detail={`${summary.tasks.done} đã hoàn thành`} />
          <ProgressRow label="Hồ sơ" value={summary.records.rate} detail={`${summary.records.approved} đã duyệt/lưu kho`} />
          <ProgressRow label="Kế hoạch" value={summary.plans.avgProgress} detail={`${summary.plans.total} kế hoạch đang theo dõi`} />
          <ProgressRow label="Sinh hoạt tổ" value={summary.meetings.rate} detail={`${summary.meetings.finished} cuộc họp hoàn tất`} />
          <ProgressRow label="Minh chứng" value={summary.evidence.rate} detail={`${summary.evidence.verified} đã xác minh/lưu kho`} />
        </div>
        <div className="rp-insight"><strong>Gợi ý ưu tiên</strong><p>{summary.tasks.rate < 70 ? 'Cần tập trung xử lý các nhiệm vụ chưa hoàn thành.' : summary.records.rate < 70 ? 'Cần ưu tiên duyệt và hoàn thiện hồ sơ.' : 'Tiến độ chung ổn định; tiếp tục chuẩn hóa minh chứng và lưu kho.'}</p></div>
      </article>
    </section>

    <section className="rp-card rp-preview">
      <header><div><span>XEM TRƯỚC</span><h2>{title || 'Báo cáo chưa đặt tên'}</h2><p>{period} · {type} · Xuất ngày {todayLabel()}</p></div></header>
      <div className="rp-preview-grid">
        <article><strong>{summary.tasks.total}</strong><span>Nhiệm vụ</span><small>{summary.tasks.done} hoàn thành</small></article>
        <article><strong>{summary.records.total}</strong><span>Hồ sơ</span><small>{summary.records.approved} đạt yêu cầu</small></article>
        <article><strong>{summary.plans.total}</strong><span>Kế hoạch</span><small>{summary.plans.avgProgress}% trung bình</small></article>
        <article><strong>{summary.meetings.total}</strong><span>Cuộc họp</span><small>{summary.meetings.finished} hoàn tất</small></article>
        <article><strong>{summary.evidence.total}</strong><span>Minh chứng</span><small>{summary.evidence.verified} xác minh</small></article>
      </div>
      <div className="rp-notes"><h3>Nhận xét và kiến nghị</h3><p>{notes || 'Chưa có nhận xét.'}</p></div>
    </section>

    <section className="rp-card rp-history">
      <header><div><span>LỊCH SỬ XUẤT</span><h2>Các báo cáo gần đây</h2></div>{reportHistory.length > 0 && <button onClick={() => setReportHistory([])}>Xóa lịch sử</button>}</header>
      {reportHistory.length ? <div>{reportHistory.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.period} · {item.type}</small></div><span>{item.format}</span><time>{item.date}</time></article>)}</div> : <p className="rp-empty">Chưa có báo cáo nào được xuất trong phiên bản này.</p>}
    </section>
  </main>;
}
