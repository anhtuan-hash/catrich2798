import React from 'react';
import { Badge } from './Feedback.jsx';
import './Workflow.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const STATUS_LABELS = {
  todo: 'Chưa làm',
  pending: 'Đang chờ',
  progress: 'Đang thực hiện',
  done: 'Hoàn tất',
  blocked: 'Bị chặn',
};

export function DeadlineBadge({ label, status = 'normal', className }) {
  return (
    <span className={cx('bwf-deadline', className)} data-status={status}>
      <span className="bwf-deadline__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function TaskCard({
  title,
  description,
  status = 'todo',
  statusLabel,
  priority = 'normal',
  due,
  dueStatus = 'normal',
  assignee,
  meta,
  actions,
  selected = false,
  className,
}) {
  return (
    <article className={cx('bwf-task-card', className)} data-priority={priority} data-selected={selected ? 'true' : undefined}>
      <div className="bwf-task-card__header">
        <div className="bwf-task-card__heading">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <Badge tone={status === 'done' ? 'success' : status === 'blocked' ? 'danger' : status === 'progress' ? 'info' : 'neutral'}>
          {statusLabel || STATUS_LABELS[status] || status}
        </Badge>
      </div>
      {(assignee || due || meta) ? (
        <div className="bwf-task-card__meta">
          {assignee ? <span className="bwf-person-chip">{assignee}</span> : null}
          {due ? <DeadlineBadge label={due} status={dueStatus} /> : null}
          {meta ? <span className="bwf-meta-text">{meta}</span> : null}
        </div>
      ) : null}
      {actions ? <div className="bwf-task-card__actions">{actions}</div> : null}
    </article>
  );
}

export function NoticeCard({
  title,
  body,
  scope = 'general',
  scopeLabel,
  author,
  timestamp,
  unread = false,
  needsResponse = false,
  attachments,
  actions,
  className,
}) {
  const scopeText = scopeLabel || ({ general: 'Thông báo chung', personal: 'Riêng bạn', team: 'Toàn tổ', feedback: 'Cần góp ý' }[scope] || scope);
  return (
    <article className={cx('bwf-notice-card', className)} data-unread={unread ? 'true' : undefined} data-scope={scope}>
      <div className="bwf-notice-card__rail" aria-hidden="true" />
      <div className="bwf-notice-card__content">
        <div className="bwf-notice-card__topline">
          <Badge tone={scope === 'personal' ? 'info' : scope === 'feedback' ? 'warning' : 'neutral'}>{scopeText}</Badge>
          {needsResponse ? <Badge tone="warning">Cần phản hồi</Badge> : null}
          {unread ? <span className="bwf-unread-dot" aria-label="Chưa đọc" /> : null}
        </div>
        <h3>{title}</h3>
        {body ? <p className="bwf-notice-card__body">{body}</p> : null}
        {(author || timestamp) ? (
          <div className="bwf-notice-card__meta">
            {author ? <span>{author}</span> : null}
            {timestamp ? <time>{timestamp}</time> : null}
          </div>
        ) : null}
        {attachments ? <div className="bwf-notice-card__attachments">{attachments}</div> : null}
        {actions ? <div className="bwf-notice-card__actions">{actions}</div> : null}
      </div>
    </article>
  );
}

export function AttachmentCard({
  name,
  meta,
  size,
  type,
  icon,
  onOpen,
  onDownload,
  actions,
  className,
}) {
  const interactive = Boolean(onOpen);
  const handleKeyDown = (event) => {
    if (!interactive || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onOpen?.();
  };
  return (
    <article
      className={cx('bwf-attachment-card', interactive && 'is-interactive', className)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpen : undefined}
      onKeyDown={handleKeyDown}
    >
      <span className="bwf-attachment-card__icon" aria-hidden="true">{icon || '▤'}</span>
      <div className="bwf-attachment-card__body">
        <strong>{name}</strong>
        <span>{[type, size, meta].filter(Boolean).join(' · ')}</span>
      </div>
      {(onDownload || actions) ? (
        <div className="bwf-attachment-card__actions" onClick={(event) => event.stopPropagation()}>
          {onDownload ? <button type="button" className="bwf-text-action" onClick={onDownload}>Tải xuống</button> : null}
          {actions}
        </div>
      ) : null}
    </article>
  );
}
