import React, { forwardRef, useId } from 'react';
import './SharedLayout.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const DataShell = forwardRef(function DataShell(
  {
    children,
    className,
    toolbar,
    footer,
    loading = false,
    empty = false,
    loadingState,
    emptyState,
    labelledBy,
    ...props
  },
  ref,
) {
  let body = children;
  if (loading && loadingState) body = loadingState;
  else if (!loading && empty && emptyState) body = emptyState;

  return (
    <section ref={ref} className={cx('bui-data-shell', className)} aria-labelledby={labelledBy} aria-busy={loading || undefined} {...props}>
      {toolbar ? <div className="bui-data-shell__toolbar">{toolbar}</div> : null}
      <div className="bui-data-shell__viewport">{body}</div>
      {footer ? <div className="bui-data-shell__footer">{footer}</div> : null}
    </section>
  );
});

export const TableShell = forwardRef(function TableShell(
  { children, className, minWidth = 760, caption, stickyHeader = false, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx('bui-table-shell', className)} data-sticky-header={stickyHeader ? 'true' : undefined} {...props}>
      {caption ? <div className="bui-table-shell__caption">{caption}</div> : null}
      <div className="bui-table-shell__scroller">
        <div className="bui-table-shell__inner" style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
});

export function DataSummary({ items = [], className }) {
  return (
    <dl className={cx('bui-data-summary', className)}>
      {items.map((item) => (
        <div className="bui-data-summary__item" key={item.key ?? item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const FormLayout = forwardRef(function FormLayout(
  { children, className, columns = 1, gap = 'md', as: Component = 'div', ...props },
  ref,
) {
  return (
    <Component ref={ref} className={cx('bui-form-layout', className)} data-columns={String(columns)} data-gap={gap} {...props}>
      {children}
    </Component>
  );
});

export function FormSection({ title, description, children, actions, className, titleAs: Title = 'h3' }) {
  const titleId = useId();
  return (
    <section className={cx('bui-form-section', className)} aria-labelledby={title ? titleId : undefined}>
      {(title || description || actions) ? (
        <div className="bui-form-section__header">
          <div>
            {title ? <Title id={titleId} className="bui-form-section__title">{title}</Title> : null}
            {description ? <p className="bui-form-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="bui-form-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="bui-form-section__body">{children}</div>
    </section>
  );
}

export function FormActions({ children, className, align = 'end', sticky = false }) {
  return (
    <div className={cx('bui-form-actions', className)} data-align={align} data-sticky={sticky ? 'true' : undefined}>
      {children}
    </div>
  );
}

export function DetailList({ items = [], className, columns = 2 }) {
  return (
    <dl className={cx('bui-detail-list', className)} data-columns={String(columns)}>
      {items.map((item) => (
        <div className="bui-detail-list__item" key={item.key ?? item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
