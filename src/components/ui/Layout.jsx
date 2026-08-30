import React, { forwardRef } from 'react';
import './SharedLayout.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const PageShell = forwardRef(function PageShell(
  { children, className, size = 'wide', density = 'comfortable', as: Component = 'section', ...props },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cx('bui-page-shell', className)}
      data-size={size}
      data-density={density}
      {...props}
    >
      {children}
    </Component>
  );
});

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  aside,
  className,
  titleAs: Title = 'h1',
}) {
  return (
    <header className={cx('bui-page-header', className)}>
      <div className="bui-page-header__main">
        {eyebrow ? <div className="bui-page-header__eyebrow">{eyebrow}</div> : null}
        <div className="bui-page-header__title-row">
          <Title className="bui-page-header__title">{title}</Title>
          {meta ? <div className="bui-page-header__meta">{meta}</div> : null}
        </div>
        {description ? <p className="bui-page-header__description">{description}</p> : null}
        {actions ? <div className="bui-page-header__actions">{actions}</div> : null}
      </div>
      {aside ? <div className="bui-page-header__aside">{aside}</div> : null}
    </header>
  );
}

export const Section = forwardRef(function Section(
  {
    children,
    className,
    eyebrow,
    title,
    description,
    actions,
    variant = 'plain',
    as: Component = 'section',
    titleAs: Title = 'h2',
    ...props
  },
  ref,
) {
  return (
    <Component ref={ref} className={cx('bui-section', className)} data-variant={variant} {...props}>
      {(eyebrow || title || description || actions) ? (
        <div className="bui-section__header">
          <div className="bui-section__heading">
            {eyebrow ? <div className="bui-section__eyebrow">{eyebrow}</div> : null}
            {title ? <Title className="bui-section__title">{title}</Title> : null}
            {description ? <p className="bui-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="bui-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="bui-section__body">{children}</div>
    </Component>
  );
});

export const Card = forwardRef(function Card(
  {
    children,
    className,
    variant = 'default',
    interactive = false,
    padding = 'md',
    as: Component = 'article',
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cx('bui-card', className)}
      data-variant={variant}
      data-padding={padding}
      data-interactive={interactive ? 'true' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

export const Toolbar = forwardRef(function Toolbar(
  {
    children,
    className,
    primary,
    secondary,
    start,
    end,
    wrap = true,
    sticky = false,
    ariaLabel = 'Toolbar',
    ...props
  },
  ref,
) {
  const left = start ?? primary;
  const right = end ?? secondary;
  const structured = left || right;

  return (
    <div
      ref={ref}
      className={cx('bui-toolbar', className)}
      data-wrap={wrap ? 'true' : 'false'}
      data-sticky={sticky ? 'true' : undefined}
      role="toolbar"
      aria-label={ariaLabel}
      {...props}
    >
      {structured ? (
        <>
          <div className="bui-toolbar__start">{left}</div>
          <div className="bui-toolbar__end">{right}</div>
        </>
      ) : children}
    </div>
  );
});

export const SearchFilterBar = forwardRef(function SearchFilterBar(
  { search, filters, actions, summary, className, ariaLabel = 'Search and filters', ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx('bui-search-filter', className)} role="search" aria-label={ariaLabel} {...props}>
      <div className="bui-search-filter__controls">
        {search ? <div className="bui-search-filter__search">{search}</div> : null}
        {filters ? <div className="bui-search-filter__filters">{filters}</div> : null}
      </div>
      {(summary || actions) ? (
        <div className="bui-search-filter__end">
          {summary ? <div className="bui-search-filter__summary" aria-live="polite">{summary}</div> : null}
          {actions ? <div className="bui-search-filter__actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
});

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  compact = false,
}) {
  return (
    <div className={cx('bui-empty-state', className)} data-compact={compact ? 'true' : undefined} role="status">
      {icon ? <div className="bui-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      {eyebrow ? <div className="bui-empty-state__eyebrow">{eyebrow}</div> : null}
      <h3 className="bui-empty-state__title">{title}</h3>
      {description ? <p className="bui-empty-state__description">{description}</p> : null}
      {(primaryAction || secondaryAction) ? (
        <div className="bui-empty-state__actions">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export const Stack = forwardRef(function Stack(
  { children, className, gap = 'md', align = 'stretch', as: Component = 'div', ...props },
  ref,
) {
  return (
    <Component ref={ref} className={cx('bui-stack', className)} data-gap={gap} data-align={align} {...props}>
      {children}
    </Component>
  );
});

export const Grid = forwardRef(function Grid(
  { children, className, columns = 'auto', gap = 'md', as: Component = 'div', ...props },
  ref,
) {
  return (
    <Component ref={ref} className={cx('bui-grid', className)} data-columns={columns} data-gap={gap} {...props}>
      {children}
    </Component>
  );
});
