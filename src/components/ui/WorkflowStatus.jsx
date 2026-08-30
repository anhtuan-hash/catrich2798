import React from 'react';
import { Progress } from './Feedback.jsx';
import './Workflow.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const EXPORT_DEFAULTS = {
  idle: { title: 'Sẵn sàng xuất file', message: 'Chọn định dạng và bắt đầu xuất khi dữ liệu đã sẵn sàng.' },
  loading: { title: 'Đang tạo file', message: 'Hệ thống đang tổng hợp dữ liệu.' },
  success: { title: 'Xuất file thành công', message: 'Tệp đã được tạo và sẵn sàng sử dụng.' },
  error: { title: 'Không thể xuất file', message: 'Đã xảy ra lỗi khi tạo tệp.' },
};

export function StatusPill({ tone = 'neutral', children, icon, className }) {
  return (
    <span className={cx('bwf-status-pill', className)} data-tone={tone}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function ExportState({
  state = 'idle',
  title,
  message,
  fileName,
  progress,
  detail,
  actions,
  className,
}) {
  const defaults = EXPORT_DEFAULTS[state] || EXPORT_DEFAULTS.idle;
  const tone = state === 'success' ? 'success' : state === 'error' ? 'danger' : state === 'loading' ? 'info' : 'neutral';
  return (
    <section className={cx('bwf-export-state', className)} data-state={state} aria-live="polite" aria-busy={state === 'loading' || undefined}>
      <div className="bwf-export-state__icon" data-tone={tone} aria-hidden="true">
        {state === 'success' ? '✓' : state === 'error' ? '!' : state === 'loading' ? '…' : '⇩'}
      </div>
      <div className="bwf-export-state__body">
        <div className="bwf-export-state__heading">
          <div>
            <h3>{title || defaults.title}</h3>
            <p>{message || defaults.message}</p>
          </div>
          <StatusPill tone={tone}>{state === 'loading' ? 'Đang xử lý' : state === 'success' ? 'Thành công' : state === 'error' ? 'Có lỗi' : 'Sẵn sàng'}</StatusPill>
        </div>
        {fileName ? <p className="bwf-export-state__file">{fileName}</p> : null}
        {state === 'loading' && Number.isFinite(progress) ? (
          <Progress value={Math.max(0, Math.min(100, progress))} max={100} label={`Tiến độ ${Math.round(progress)}%`} />
        ) : null}
        {detail ? <div className="bwf-export-state__detail">{detail}</div> : null}
        {actions ? <div className="bwf-export-state__actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function WorkflowState({
  tone = 'neutral',
  label,
  description,
  icon,
  actions,
  compact = false,
  className,
}) {
  return (
    <div className={cx('bwf-workflow-state', className)} data-tone={tone} data-compact={compact ? 'true' : undefined}>
      {icon ? <span className="bwf-workflow-state__icon" aria-hidden="true">{icon}</span> : null}
      <div className="bwf-workflow-state__body">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      {actions ? <div className="bwf-workflow-state__actions">{actions}</div> : null}
    </div>
  );
}
