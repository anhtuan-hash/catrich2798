import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Layers3,
  PencilLine,
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
  status: 'draft',
  statusLabel: 'Bản nháp',
  teacher: '',
  department: '',
  schoolYear: '',
  locked: false,
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
    description: 'Báo cáo đang được hoàn thiện',
    tone: 'draft',
  },
  missing: {
    label: 'Chưa có báo cáo',
    description: 'Bắt đầu hoàn thiện báo cáo tháng này',
    tone: 'draft',
  },
});

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

export default function MonthlyReportsInteractiveHero() {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);

  const readWorkspace = useCallback(() => {
    const root = document.querySelector('.btp-shell .mr-teacher-shell');
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

    setSnapshot({
      ready: true,
      month: monthInput?.value || '',
      ...completion,
      completeSections: root.querySelectorAll('.mr-section.is-complete').length,
      status,
      statusLabel: statusElement?.textContent?.trim() || STATUS_META[status]?.label || 'Bản nháp',
      teacher: metadataValue(0),
      department: metadataValue(1),
      schoolYear,
      locked: ['approved', 'submitted'].includes(status),
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
  const progressLabel = snapshot.percent >= 100 ? 'Hoàn tất' : snapshot.percent >= 80 ? 'Sắp hoàn tất' : 'Đang thực hiện';
  const reportMonthNumber = /^\d{4}-\d{2}$/.test(snapshot.month)
    ? String(Number(snapshot.month.slice(5, 7)))
    : '';

  const metrics = useMemo(() => [
    {
      icon: ClipboardCheck,
      value: `${snapshot.completed}/${snapshot.total || 0}`,
      label: 'Mục bắt buộc hoàn tất',
      tone: 'blue',
    },
    {
      icon: CheckCircle2,
      value: `${snapshot.percent}%`,
      label: 'Tiến độ hoàn thiện',
      tone: 'green',
    },
    {
      icon: Layers3,
      value: `${snapshot.completeSections}/5`,
      label: 'Phần báo cáo hoàn chỉnh',
      tone: 'orange',
    },
    {
      icon: FileCheck2,
      value: statusMeta.label,
      label: 'Trạng thái báo cáo',
      tone: 'violet',
    },
  ], [snapshot.completed, snapshot.total, snapshot.percent, snapshot.completeSections, statusMeta.label]);

  const handleMonthChange = (event) => {
    const actualInput = document.querySelector('.btp-shell .mr-teacher-shell .mr-top-actions input[type="month"]');
    setNativeValue(actualInput, event.target.value);
    window.setTimeout(readWorkspace, 0);
  };

  const handlePreview = () => {
    const buttons = [...document.querySelectorAll('.btp-shell .mr-teacher-shell .mr-sticky-actions button')];
    const previewButton = buttons.find((button) => /Xem trước/i.test(button.textContent || ''));
    previewButton?.click();
  };

  const scrollToEditor = (focus = false) => {
    const root = document.querySelector('.btp-shell .mr-teacher-shell');
    const target = root?.querySelector('.mr-form-stack');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus && !snapshot.locked) {
      window.setTimeout(() => root?.querySelector('.mr-form-stack textarea:not(:disabled), .mr-form-stack input:not(:disabled)')?.focus(), 420);
    }
  };

  const scrollToSection = (index) => {
    const sections = document.querySelectorAll('.btp-shell .mr-teacher-shell .mr-section');
    sections[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!snapshot.ready) return null;

  return (
    <section className="mr-material-hero" aria-label="Tổng quan báo cáo tháng">
      <div className="mr-material-hero__glow" aria-hidden="true" />
      <div className="mr-material-hero__content">
        <div className="mr-material-hero__intro">
          <div className="mr-material-hero__eyebrow"><Sparkles /> BRIAN REPORTS</div>
          <h1>
            Báo cáo công việc tháng
            {reportMonthNumber && <span className="mr-material-hero__month-ink"> {reportMonthNumber}</span>}
          </h1>
          <p>Tổng hợp, theo dõi và đánh giá toàn bộ hoạt động giảng dạy và công việc của bạn theo từng tháng.</p>
          <span className="mr-material-hero__rule" aria-hidden="true" />

          <div className="mr-material-hero__metrics" aria-label="Chỉ số nhanh">
            {metrics.map(({ icon: Icon, value, label, tone }, index) => (
              <button
                key={label}
                type="button"
                className={`mr-material-metric is-${tone}`}
                onClick={() => index < 3 ? scrollToSection(Math.min(index, 4)) : scrollToEditor(false)}
                aria-label={`${label}: ${value}`}
              >
                <span><Icon /></span>
                <div><strong>{value}</strong><small>{label}</small></div>
              </button>
            ))}
          </div>
        </div>

        <div className="mr-material-hero__panel">
          <div className="mr-material-hero__top-controls">
            <label className="mr-material-month">
              <span>THÁNG BÁO CÁO</span>
              <div>
                <CalendarDays />
                <strong>{monthLabel(snapshot.month)}</strong>
                <ChevronDown />
              </div>
              <input type="month" value={snapshot.month} onChange={handleMonthChange} aria-label="Chọn tháng báo cáo" />
            </label>

            <button type="button" className={`mr-material-status is-${statusMeta.tone}`} onClick={() => scrollToEditor(false)}>
              <span><ShieldCheck /></span>
              <div><strong>{statusMeta.label}</strong><small>{statusMeta.description}</small></div>
            </button>
          </div>

          <button type="button" className="mr-material-progress" onClick={() => scrollToEditor(false)} aria-label={`Tiến độ hoàn thiện ${snapshot.percent}%`}>
            <div className="mr-material-progress__head"><span>TIẾN ĐỘ HOÀN THÀNH</span><strong>{snapshot.percent}%</strong></div>
            <div className="mr-material-progress__track"><i style={{ width: `${snapshot.percent}%` }} /></div>
            <div className="mr-material-progress__foot">
              <span>{snapshot.completed}/{snapshot.total || 0} mục bắt buộc đã hoàn tất</span>
              <b>{progressLabel}</b>
            </div>
          </button>

          <div className="mr-material-actions">
            <button type="button" className="is-primary" onClick={handlePreview}><Eye /> Xem báo cáo</button>
            <button type="button" className="is-secondary" onClick={() => scrollToEditor(!snapshot.locked)}>
              <PencilLine /> {snapshot.locked ? 'Xem các phần' : 'Chỉnh sửa báo cáo'}
            </button>
          </div>

          <div className="mr-material-hero__context">
            <span>{snapshot.teacher || 'Giáo viên'}</span>
            <i aria-hidden="true" />
            <span>{snapshot.department || 'Tổ chuyên môn'}</span>
            {snapshot.schoolYear && <><i aria-hidden="true" /><span>Năm học {snapshot.schoolYear}</span></>}
          </div>
        </div>
      </div>
    </section>
  );
}
