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

export function UITextInput({ label, hint, error, className = '', ...props }) {
  return <UIField label={label} hint={hint} error={error} className={className}><input data-ui="input" className="ui-input" {...props} /></UIField>;
}

export function UITextArea({ label, hint, error, className = '', rows = 4, ...props }) {
  return <UIField label={label} hint={hint} error={error} className={className}><textarea data-ui="textarea" className="ui-textarea" rows={rows} {...props} /></UIField>;
}

export function UISelect({ label, hint, error, className = '', children, ...props }) {
  return <UIField label={label} hint={hint} error={error} className={className}><select data-ui="select" className="ui-select" {...props}>{children}</select></UIField>;
}

export function UIMetric({ label, value, meta, tone = 'neutral', className = '' }) {
  return <div data-ui="metric" data-tone={tone} className={mergeClass('ui-metric', className)}><span>{label}</span><strong>{value}</strong>{meta ? <small>{meta}</small> : null}</div>;
}

export function UITabs({ value, onChange, items = [], label = 'Tabs', className = '' }) {
  return <div role="tablist" aria-label={label} data-ui="tabs" className={mergeClass('ui-tabs', className)}>{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} data-selected={value === item.value ? 'true' : undefined} onClick={() => onChange?.(item.value)}>{item.label}</button>)}</div>;
}

export function UIDialog({ open, title, onClose, children, actions, className = '' }) {
  if (!open) return null;
  return <div data-ui="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}><section role="dialog" aria-modal="true" aria-label={title} data-ui="dialog" className={mergeClass('ui-dialog', className)}><header><h2>{title}</h2><UIIconButton label="Close" onClick={onClose}>×</UIIconButton></header><div data-ui="dialog-body">{children}</div>{actions ? <footer>{actions}</footer> : null}</section></div>;
}

export function UIStack({ gap = 'medium', direction = 'column', className = '', children, ...props }) {
  return <div data-ui="stack" data-gap={gap} data-direction={direction} className={mergeClass('ui-stack', className)} {...props}>{children}</div>;
}
