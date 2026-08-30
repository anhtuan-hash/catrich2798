import React from 'react';
import './Workflow.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function MetricCard({
  label,
  value,
  helper,
  trend,
  trendTone = 'neutral',
  icon,
  footer,
  className,
  compact = false,
}) {
  return (
    <article className={cx('bwf-metric-card', className)} data-compact={compact ? 'true' : undefined}>
      <div className="bwf-metric-card__top">
        <div>
          <p className="bwf-metric-card__label">{label}</p>
          <p className="bwf-metric-card__value">{value}</p>
        </div>
        {icon ? <span className="bwf-metric-card__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      {(helper || trend) ? (
        <div className="bwf-metric-card__meta">
          {trend ? <span className="bwf-trend" data-tone={trendTone}>{trend}</span> : null}
          {helper ? <span>{helper}</span> : null}
        </div>
      ) : null}
      {footer ? <div className="bwf-metric-card__footer">{footer}</div> : null}
    </article>
  );
}

export function MetricGrid({ children, className, minItemWidth = 220 }) {
  return (
    <div
      className={cx('bwf-metric-grid', className)}
      style={{ '--bwf-metric-min': `${minItemWidth}px` }}
    >
      {children}
    </div>
  );
}
