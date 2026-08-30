import React from 'react';
import { Badge } from './Feedback.jsx';
import './Workflow.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const ATTENDANCE_LABELS = {
  present: 'Có mặt',
  absent: 'Vắng',
  late: 'Đi trễ',
  excused: 'Có phép',
  unknown: 'Chưa ghi nhận',
};

export function AttendanceState({ state = 'unknown', label, compact = false, className }) {
  return (
    <span className={cx('bwf-attendance', className)} data-state={state} data-compact={compact ? 'true' : undefined}>
      <span className="bwf-attendance__dot" aria-hidden="true" />
      <span>{label || ATTENDANCE_LABELS[state] || state}</span>
    </span>
  );
}

export function StudentCard({
  name,
  code,
  studentClass,
  subtitle,
  avatar,
  initials,
  status,
  statusLabel,
  attendance,
  metrics = [],
  tags,
  actions,
  className,
}) {
  const fallbackInitials = initials || String(name || '?').split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return (
    <article className={cx('bwf-student-card', className)}>
      <div className="bwf-student-card__header">
        <div className="bwf-student-avatar">
          {avatar ? <img src={avatar} alt="" /> : <span aria-hidden="true">{fallbackInitials}</span>}
        </div>
        <div className="bwf-student-card__identity">
          <h3>{name}</h3>
          <p>{[code, studentClass, subtitle].filter(Boolean).join(' · ')}</p>
        </div>
        {status ? <Badge tone={status === 'good' ? 'success' : status === 'attention' ? 'warning' : status === 'risk' ? 'danger' : 'neutral'}>{statusLabel || status}</Badge> : null}
      </div>
      {attendance ? <div className="bwf-student-card__attendance">{typeof attendance === 'string' ? <AttendanceState state={attendance} /> : attendance}</div> : null}
      {metrics.length ? (
        <dl className="bwf-student-card__metrics">
          {metrics.map((metric, index) => (
            <div key={metric.key || metric.label || index}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {tags ? <div className="bwf-student-card__tags">{tags}</div> : null}
      {actions ? <div className="bwf-student-card__actions">{actions}</div> : null}
    </article>
  );
}

export function ViolationCard({
  title,
  studentName,
  category,
  severity = 'medium',
  severityLabel,
  status = 'open',
  occurredAt,
  rule,
  note,
  actions,
  className,
}) {
  const severityText = severityLabel || ({ low: 'Nhẹ', medium: 'Cần lưu ý', high: 'Nghiêm trọng' }[severity] || severity);
  return (
    <article className={cx('bwf-violation-card', className)} data-severity={severity}>
      <div className="bwf-violation-card__top">
        <div>
          <p className="bwf-violation-card__eyebrow">{studentName || category || 'Ghi nhận rèn luyện'}</p>
          <h3>{title}</h3>
        </div>
        <div className="bwf-violation-card__badges">
          <Badge tone={severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'neutral'}>{severityText}</Badge>
          {status === 'resolved' ? <Badge tone="success">Đã xử lý</Badge> : null}
        </div>
      </div>
      <dl className="bwf-violation-card__details">
        {category ? <div><dt>Nhóm</dt><dd>{category}</dd></div> : null}
        {occurredAt ? <div><dt>Thời điểm</dt><dd>{occurredAt}</dd></div> : null}
        {rule ? <div><dt>Quy định</dt><dd>{rule}</dd></div> : null}
      </dl>
      {note ? <p className="bwf-violation-card__note">{note}</p> : null}
      {actions ? <div className="bwf-violation-card__actions">{actions}</div> : null}
    </article>
  );
}
