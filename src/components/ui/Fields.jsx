import React, { forwardRef, useId } from 'react';
import './BrianUI.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function FieldFrame({ id, label, hint, error, required, children, className }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('bui-field', error && 'is-error', className)}>
      {label ? (
        <label className="bui-field__label" htmlFor={id}>
          {label}
          {required ? <span className="bui-field__required" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children(describedBy)}
      {hint ? <div id={hintId} className="bui-field__hint">{hint}</div> : null}
      {error ? <div id={errorId} className="bui-field__error" role="alert">{error}</div> : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { id, label, hint, error, required = false, className, inputClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id || `bui-input-${generatedId.replace(/:/g, '')}`;

  return (
    <FieldFrame id={controlId} label={label} hint={hint} error={error} required={required} className={className}>
      {(describedBy) => (
        <input
          ref={ref}
          id={controlId}
          className={cx('bui-input', inputClassName)}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      )}
    </FieldFrame>
  );
});

export const Select = forwardRef(function Select(
  { id, label, hint, error, required = false, className, selectClassName, children, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id || `bui-select-${generatedId.replace(/:/g, '')}`;

  return (
    <FieldFrame id={controlId} label={label} hint={hint} error={error} required={required} className={className}>
      {(describedBy) => (
        <select
          ref={ref}
          id={controlId}
          className={cx('bui-select', selectClassName)}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldFrame>
  );
});

export const Checkbox = forwardRef(function Checkbox(
  { id, label, description, className, disabled, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id || `bui-checkbox-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <label className={cx('bui-check', disabled && 'is-disabled', className)} htmlFor={controlId}>
      <input
        ref={ref}
        id={controlId}
        type="checkbox"
        className="bui-check__control"
        disabled={disabled}
        aria-describedby={descriptionId}
        {...props}
      />
      <span className="bui-check__content">
        <span className="bui-check__label">{label}</span>
        {description ? <span id={descriptionId} className="bui-check__description">{description}</span> : null}
      </span>
    </label>
  );
});

export const Radio = forwardRef(function Radio(
  { id, label, description, className, disabled, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id || `bui-radio-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <label className={cx('bui-check', disabled && 'is-disabled', className)} htmlFor={controlId}>
      <input
        ref={ref}
        id={controlId}
        type="radio"
        className="bui-check__control"
        disabled={disabled}
        aria-describedby={descriptionId}
        {...props}
      />
      <span className="bui-check__content">
        <span className="bui-check__label">{label}</span>
        {description ? <span id={descriptionId} className="bui-check__description">{description}</span> : null}
      </span>
    </label>
  );
});

export const Toggle = forwardRef(function Toggle(
  { id, label, description, className, disabled, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id || `bui-toggle-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <label className={cx('bui-toggle', disabled && 'is-disabled', className)} htmlFor={controlId}>
      <span className="bui-toggle__content">
        <span className="bui-toggle__label">{label}</span>
        {description ? <span id={descriptionId} className="bui-toggle__description">{description}</span> : null}
      </span>
      <span className="bui-toggle__switch">
        <input
          ref={ref}
          id={controlId}
          type="checkbox"
          role="switch"
          className="bui-toggle__control"
          disabled={disabled}
          aria-describedby={descriptionId}
          {...props}
        />
        <span className="bui-toggle__track" aria-hidden="true"><span className="bui-toggle__thumb" /></span>
      </span>
    </label>
  );
});
