import React, { forwardRef } from 'react';
import './BrianUI.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    startIcon,
    endIcon,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={cx('bui-button', className)}
      data-variant={variant}
      data-size={size}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="bui-button__spinner" aria-hidden="true" /> : startIcon ? <span className="bui-button__icon" aria-hidden="true">{startIcon}</span> : null}
      <span className="bui-button__label">{children}</span>
      {!loading && endIcon ? <span className="bui-button__icon" aria-hidden="true">{endIcon}</span> : null}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton(
  {
    children,
    className,
    variant = 'subtle',
    size = 'md',
    type = 'button',
    label,
    title,
    ...props
  },
  ref,
) {
  const accessibleLabel = label || props['aria-label'] || title;

  return (
    <button
      ref={ref}
      type={type}
      className={cx('bui-icon-button', className)}
      data-variant={variant}
      data-size={size}
      aria-label={accessibleLabel || 'Action'}
      title={title}
      {...props}
    >
      <span className="bui-icon-button__icon" aria-hidden="true">{children}</span>
    </button>
  );
});
