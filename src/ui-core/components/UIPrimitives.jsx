import React from 'react';

function classes(...items) { return items.filter(Boolean).join(' '); }

export function UIButton({ variant = 'primary', size = 'medium', className = '', ...props }) {
  return <button className={classes('bui-button', `bui-button--${variant}`, `bui-button--${size}`, className)} {...props} />;
}

export function UICard({ as: Component = 'section', variant = 'default', className = '', ...props }) {
  return <Component className={classes('bui-card', `bui-card--${variant}`, className)} {...props} />;
}

export function UIField({ as: Component = 'input', className = '', ...props }) {
  return <Component className={classes('bui-field', className)} {...props} />;
}

export function UITextArea({ className = '', ...props }) {
  return <textarea className={classes('bui-field', 'bui-textarea', className)} {...props} />;
}

export function UIChip({ selected = false, className = '', ...props }) {
  return <button type="button" className={classes('bui-chip', selected && 'is-selected', className)} {...props} />;
}
