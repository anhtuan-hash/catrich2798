import React, { useId } from 'react';
import './BrianUI.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Badge({ children, variant = 'neutral', className, ...props }) {
  return <span className={cx('bui-badge', className)} data-variant={variant} {...props}>{children}</span>;
}

export function Tooltip({ children, content, placement = 'top', className }) {
  const generatedId = useId();
  const tooltipId = `bui-tooltip-${generatedId.replace(/:/g, '')}`;

  if (!content) return children;

  return (
    <span className={cx('bui-tooltip', className)} data-placement={placement}>
      <span className="bui-tooltip__trigger" aria-describedby={tooltipId}>{children}</span>
      <span id={tooltipId} className="bui-tooltip__bubble" role="tooltip">{content}</span>
    </span>
  );
}

export function Spinner({ size = 'md', label = 'Loading', className }) {
  return (
    <span className={cx('bui-spinner-wrap', className)} role="status" aria-label={label}>
      <span className="bui-spinner" data-size={size} aria-hidden="true" />
    </span>
  );
}

export function Skeleton({ width, height, radius, className, ...props }) {
  const style = {
    ...(width ? { width } : null),
    ...(height ? { height } : null),
    ...(radius ? { borderRadius: radius } : null),
  };
  return <span className={cx('bui-skeleton', className)} style={style} aria-hidden="true" {...props} />;
}

export function Progress({ value = 0, max = 100, label, showValue = false, className }) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeMax);
  const percent = (safeValue / safeMax) * 100;

  return (
    <div className={cx('bui-progress', className)}>
      {label || showValue ? (
        <div className="bui-progress__meta">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <strong>{Math.round(percent)}%</strong> : null}
        </div>
      ) : null}
      <div
        className="bui-progress__track"
        role="progressbar"
        aria-label={typeof label === 'string' ? label : 'Progress'}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span className="bui-progress__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
