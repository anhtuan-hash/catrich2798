import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleCheckBig,
  ClipboardList,
  Clock3,
  Eye,
  Lightbulb,
  PencilLine,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import './MonthlyReportsInteractiveHero.css';

const EMPTY_SNAPSHOT = Object.freeze({
  ready: false,
  month: '',
  percent: 0,
  completed: 0,
  total: 0,
  completeSections: 0,
  sectionComplete: [false, false, false, false, false],
  status: 'draft',
  statusLabel: 'Bản nháp',
  teacher: '',
  department: '',
  schoolYear: '',
  locked: false,
  hasDeadline: false,
  deadlineLabel: '',
  countdownLabel: '',
  deadlineExpired: false,
  canSave: false,
  canSubmit: false,
});

const STATUS_META = Object.freeze({
  approved: {
    label: 'Đã duyệt',
    description: 'Báo cáo đã được TTCM phê duyệt',
    tone: 'approved',
  },
  submitted: {
    label: 'Đã gửi',
    description: 'Báo cáo đang chờ TTCM duyệt',
    tone: 'submitted',
  },
  revision: {
    label: 'Cần chỉnh sửa',
    description: 'TTCM đã yêu cầu cập nhật báo cáo',
    tone: 'revision',
  },
  draft: {
    label: 'Bản nháp',
    description: 'Báo cáo đang được bạn biên tập',
    tone: 'draft',
  },
  missing: {
    label: 'Chưa có báo cáo',
    description: 'Bắt đầu hoàn thiện báo cáo tháng này',
    tone: 'draft',
  },
});

const SECTION_META = Object.freeze([
  { number: '01', title: 'Công tác tổ chức', tone: 'blue' },
  { number: '02', title: 'Số liệu chuyên môn', tone: 'green' },
  { number: '03', title: 'Tình hình chuyên môn', tone: 'violet' },
  { number: '04', title: 'Kế hoạch thời gian tới', tone: 'amber' },
  { number: '05', title: 'Ý kiến, kiến nghị', tone: 'red' },
]);

const GUIDE_ITEMS = Object.freeze([
  'Nhập đầy đủ các nội dung theo từng phần.',
  'Số liệu nhập số nguyên; nếu không phát sinh vui lòng nhập 0.',
  'Kiểm tra kỹ trước khi gửi báo cáo.',
  'Liên hệ TTCM nếu cần hỗ trợ.',
  'Báo cáo là căn cứ đánh giá thi đua cuối năm.',
]);

const parseCompletion = (root) => {
  const meter = root?.querySelector('.mr-completion');
  const strong = meter?.querySelector('strong');
  const small = meter?.querySelector('small');
  const percent = Math.max(0, Math.min(100, Number(String(strong?.textContent || '').replace(/[^0-9.]/g, '')) || 0));
  const match = String(small?.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
  return {
    percent,
    completed: Number(match?.[1] || 0),
    total: Number(match?.[2] || 0),
  };
};

const statusFromElement = (element) => {
  if (!element) return 'draft';
  for (const status of ['approved', 'submitted', 'revision', 'missing', 'draft']) {
    if (element.classList.contains(`is-${status}`)) return status;
  }
  return 'draft';
};

const monthLabel = (value) => {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return 'Chọn tháng';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
};

const setNativeValue = (input, value) => {
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const findWorkspaceButton = (pattern) => {
  const buttons = [...document.querySelectorAll('.btp-report-grid .mr-teacher-shell .mr-sticky-actions button')];
  return buttons.find((button) => pattern.test(button.textContent || '')) || null;
};

export default function MonthlyReportsInteractiveHero() {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);

  const readWorkspace = useCallback(() => {
    const root = document.querySelector('.btp-report-grid .mr-teacher-shell');
    if (!root) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }

    const monthInput = root.querySelector('.mr-top-actions input[type="month"]');
    const statusElement = root.querySelector('.mr-top-actions .mr-status') || root.querySelector('.mr-status');
    const status = statusFromElement(statusElement);
    const completion = parseCompletion(root);
    const metadata = [...root.querySelectorAll('.mr-report-meta > div')];
    const metadataValue = (index) => metadata[index]?.querySelector('strong')?.textContent?.trim() || '';
    const schoolYearText = root.querySelector('.mr-hero p')?.textContent || '';
    const schoolYear = schoolYearText.match(/Năm học\s+([^·]+)/i)?.[1]?.trim() || '';
    const sections = [...root.querySelectorAll('.mr-form-stack > .mr-section')];
    const deadlineCard = root.querySelector('.mr-deadline-card');
    const saveButton = findWorkspaceButton(/Lưu nháp|Đang lưu/i);
    const submitButton = findWorkspaceButton(/Gửi TTCM/i);

    setSnapshot({
      ready: true,
      month: monthInput?.value || '',
      ...completion,
      completeSections: sections.filter((section) => section.classList.contains('is-complete')).length,
      sectionComplete: SECTION_META.map((_, index) => Boolean(sections[index]?.classList.contains('is-complete'))),
      status,
      statusLabel: statusElement?.textContent?.trim() || STATUS_META[status]?.label || 'Bản nháp',
      teacher: metadataValue(0),
      department: metadataValue(1),
      schoolYear,
      locked: ['approved', 'submitted'].includes(status),
      hasDeadline: Boolean(deadlineCard),
      deadlineLabel: deadlineCard?.querySelector('.mr-deadline-copy strong')?.textContent?.trim() || '',
      countdownLabel: deadlineCard?.querySelector('.mr-countdown strong')?.textContent?.trim() || '',
      deadlineExpired: Boolean(deadlineCard?.classList.contains('is-expired')),
      canSave: Boolean(saveButton && !saveButton.disabled),
      canSubmit: Boolean(submitButton && !submitButton.disabled),
    });
  }, []);

  useEffect(() => {
    const shell = document.querySelector('.btp-shell');
    if (!shell) return undefined;
    shell.classList.add('mr-has-interactive-hero');

    let frame = 0;
    const scheduleRead = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(readWorkspace);
    };

    scheduleRead();
    const observer = new MutationObserver(scheduleRead);
    observer.observe(shell, { subtree: true, childList: true, attributes: true, characterData: true });
    shell.addEventListener('input', scheduleRead, true);
    shell.addEventListener('change', scheduleRead, true);

    return () => {
      shell.classList.remove('mr-has-interactive-hero');
      observer.disconnect();
      shell.removeEventListener('input', scheduleRead, true);
      shell.removeEventListener('change', scheduleRead, true);
      window.cancelAnimationFrame(frame);
    };
  }, [readWorkspace]);

  const statusMeta = STATUS_META[snapshot.status] || STATUS_META.draft;
  const reportMonthNumber = /^\d{4}-\d{2}$/.test(snapshot.month)
    ? String(Number(snapshot.month.slice(5, 7)))
    : '';

  const handleMonthChange = (event) => {
    const actualInput = document.querySelector('.btp-report-grid .mr-teacher-shell .mr-top-actions input[type="month"]');
    setNativeValue(actualInput, event.target.value);
    window.setTimeout(readWorkspace, 0);
  };

  const handlePreview = () => findWorkspaceButton(/Xem trước/i)?.click();
  const handleSaveDraft = () => findWorkspaceButton(/Lưu nháp|Đang lưu/i)?.click();
  const handleSubmit = () => findWorkspaceButton(/Gửi TTCM/i)?.click();

  const scrollToEditor = (focus = false) => {
    const root = document.querySelector('.btp-report-grid .mr-teacher-shell');
    const target = root?.querySelector('.mr-form-stack');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus && !snapshot.locked) {
      window.setTimeout(() => root?.querySelector('.mr-form-stack textarea:not(:disabled), .mr-form-stack input:not(:disabled)')?.focus(), 420);
    }
  };

  const scrollToSection = (index) => {
    const sections = document.querySelectorAll('.btp-report-grid .mr-teacher-shell .mr-section');
    sections[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const sectionRows = useMemo(() => SECTION_META.map((section, index) => ({
    ...section,
    complete: Boolean(snapshot.sectionComplete[index]),
  })), [snapshot.sectionComplete]);

  if (!snapshot.ready) return null;

  return (
    <>
      <section className="mr-report-lead" aria-label="Báo cáo công việc tháng">
        <div className="mr-report-lead__eyebrow"><Sparkles /> BRIAN REPORTS</div>
        <h1>
          Báo cáo công<br />việc tháng
          {reportMonthNumber && <span> {reportMonthNumber}</span>}
        </h1>
        <p>Tổng kết · Chia sẻ · Phát triển cùng Brian English</p>
        <div className="mr-report-lead__note" aria-hidden="true">Mỗi nỗ lực<br />đều tạo nên<br />sự thay đổi tích cực!</div>
        <div className="mr-report-lead__badge" aria-hidden="true">Better<br />Teachers<br />Brighter<br />Futures</div>
      </section>

      <aside className="mr-report-sidebar" aria-label="Trạng thái và hướng dẫn báo cáo">
        <section className="mr-report-side-card mr-report-side-status">
          <h2>Trạng thái báo cáo</h2>

          <label className="mr-report-month-picker">
            <CalendarDays />
            <strong>{monthLabel(snapshot.month)}</strong>
            <ChevronDown />
            <input type="month" value={snapshot.month} onChange={handleMonthChange} aria-label="Chọn tháng báo cáo" />
          </label>

          <button type="button" className={`mr-report-status-row is-${statusMeta.tone}`} onClick={() => scrollToEditor(false)}>
            <span><ShieldCheck /></span>
            <div><strong>{statusMeta.label}</strong><small>{statusMeta.description}</small></div>
          </button>

          <div className="mr-report-side-progress">
            <div><span>Tiến độ hoàn thành</span><strong>{snapshot.percent}%</strong></div>
            <div className="mr-report-side-progress__track"><i style={{ width: `${snapshot.percent}%` }} /></div>
            <p><span>{snapshot.completed}/{snapshot.total || 0} mục bắt buộc đã hoàn thành</span><button type="button" onClick={() => scrollToEditor(false)}>Xem chi tiết →</button></p>
          </div>

          {snapshot.hasDeadline && (
            <div className={`mr-report-deadline ${snapshot.deadlineExpired ? 'is-expired' : ''}`}>
              <span><Clock3 /></span>
              <div>
                <small>Thời hạn nộp báo cáo</small>
                <strong>{snapshot.deadlineExpired ? 'Đã hết hạn' : snapshot.countdownLabel || 'Đang cập nhật'}</strong>
                {snapshot.deadlineLabel && <p>Hạn nộp: {snapshot.deadlineLabel}</p>}
              </div>
            </div>
          )}

          <div className="mr-report-side-actions">
            <button type="button" className="is-preview" onClick={handlePreview}><Eye /> Xem báo cáo</button>
            <div>
              <button type="button" onClick={() => scrollToEditor(!snapshot.locked)}><PencilLine /> {snapshot.locked ? 'Xem các phần' : 'Chỉnh sửa báo cáo'}</button>
              <button type="button" className="is-save" disabled={!snapshot.canSave} onClick={handleSaveDraft}><Save /> Lưu bản nháp</button>
            </div>
            {!snapshot.locked && (
              <button type="button" className="is-submit" disabled={!snapshot.canSubmit} onClick={handleSubmit}><Send /> Gửi TTCM</button>
            )}
          </div>
        </section>

        <section className="mr-report-side-card mr-report-side-sections">
          <div className="mr-report-side-heading">
            <h2>Tình trạng các phần</h2>
            <span>{snapshot.completeSections}/5 hoàn thành</span>
          </div>
          <div className="mr-report-section-list">
            {sectionRows.map((section, index) => (
              <button key={section.number} type="button" className={`is-${section.tone} ${section.complete ? 'is-complete' : ''}`} onClick={() => scrollToSection(index)}>
                <span><ClipboardList /></span>
                <div><strong><b>Phần {section.number}</b> {section.title}</strong><small>{section.complete ? 'Đã hoàn thành' : index === 1 ? 'Chưa có số liệu' : 'Chưa có nội dung'}</small></div>
                {section.complete && <CheckCircle2 />}
              </button>
            ))}
          </div>
        </section>

        <section className="mr-report-side-card mr-report-side-guide">
          <div className="mr-report-side-heading mr-report-side-heading--guide"><Lightbulb /><h2>Hướng dẫn &amp; Lưu ý nhanh</h2></div>
          <ul>
            {GUIDE_ITEMS.map((item) => <li key={item}><CircleCheckBig /> <span>{item}</span></li>)}
          </ul>
          <blockquote>
            “Giáo dục hôm nay<br />vì những cơ hội ngày mai”
            <span>♥</span>
            <small>— Brian English —</small>
          </blockquote>
        </section>
      </aside>
    </>
  );
}
