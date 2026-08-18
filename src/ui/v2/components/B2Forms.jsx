import React from 'react';
import './B2Forms.css';

export function B2TextField({ label, hint, value, onChange, placeholder = '', disabled = false, type = 'text' }) {
  return (
    <label className={`b2-field ${disabled ? 'is-disabled' : ''}`}>
      <span className="b2-field__label">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} disabled={disabled} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function B2Textarea({ label, hint, value, onChange, placeholder = '', rows = 4 }) {
  return (
    <label className="b2-field">
      <span className="b2-field__label">{label}</span>
      <textarea value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} rows={rows} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function B2Select({ label, value, onChange, options, hint }) {
  return (
    <label className="b2-field">
      <span className="b2-field__label">{label}</span>
      <select value={value} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function B2Switch({ label, description, checked, onChange }) {
  return (
    <label className="b2-switch-row">
      <span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange?.(event.target.checked)} />
      <span className="b2-switch-ui" aria-hidden="true"><i /></span>
    </label>
  );
}
