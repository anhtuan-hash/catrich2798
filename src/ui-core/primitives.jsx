import React from 'react';

function mergeClass(...values) {
  return values.filter(Boolean).join(' ');
}

export function UIPage({ as: Component = 'div', layout, className = '', children, ...props }) {
  return <Component data-ui="page" data-ui-layout={layout} className={mergeClass('ui-page', className)} {...props}>{children}</Component>;
}

export function UICard({ as: Component = 'article', variant = 'default', interactive = false, selected = false, className = '', children, ...props }) {
  return (
    <Component
      data-ui="card"
      data-variant={variant}
      data-interactive={interactive ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      className={mergeClass('ui-card', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function UIButton({ variant = 'secondary', size = 'medium', className = '', children, ...props }) {
  return <button data-ui="button" data-variant={variant} data-size={size} className={mergeClass('ui-button', className)} {...props}>{children}</button>;
}

export function UIIconButton({ label, size = 'medium', className = '', children, ...props }) {
  return <button type="button" data-ui="icon-button" data-size={size} aria-label={label} className={mergeClass('ui-icon-button', className)} {...props}>{children}</button>;
}

export function UIChip({ as: Component = 'span', tone = 'neutral', selected = false, className = '', children, ...props }) {
  return <Component data-ui="chip" data-tone={tone} data-selected={selected ? 'true' : undefined} className={mergeClass('ui-chip', className)} {...props}>{children}</Component>;
}

export function UIField({ label, hint, error, className = '', children }) {
  return (
    <label data-ui="field" className={mergeClass('ui-field', className)}>
      {label ? <span data-ui="field-label">{label}</span> : null}
      {children}
      {error ? <small data-ui="field-error">{error}</small> : hint ? <small data-ui="field-hint">{hint}</small> : null}
    </label>
  );
}

export function UISwitch({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-ui="switch"
      className={mergeClass('ui-switch', className)}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <span />
    </button>
  );
}

export function UISectionHeader({ eyebrow, title, text, right, className = '' }) {
  return (
    <div data-ui="section-header" className={mergeClass('ui-section-header', className)}>
      <div>
        {eyebrow ? <span data-ui="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {right ? <div data-ui="section-actions">{right}</div> : null}
    </div>
  );
}
