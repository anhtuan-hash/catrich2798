import React from 'react';

function classes(...values) { return values.filter(Boolean).join(' '); }

/**
 * Route-level native surface. It isolates remaining historical interiors while
 * giving every operational page the same width, spacing, token and adapter contract.
 */
export function UIRouteSurface({
  as: Component = 'div',
  route,
  variant = 'platform',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={classes('bui-route-surface', `bui-route-surface--${variant}`, className)}
      data-ui="route-surface"
      data-ui-variant={variant}
      data-ui-route={route}
      {...props}
    >
      {children}
    </Component>
  );
}

export function UIPlatformHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={classes('bui-platform-header', className)} data-ui="platform-header">
      <div className="bui-platform-header__copy">
        {eyebrow ? <span className="bui-platform-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="bui-platform-header__actions">{actions}</div> : null}
    </header>
  );
}

export function UIStatGrid({ children, className = '' }) {
  return <div className={classes('bui-stat-grid', className)} data-ui="stat-grid">{children}</div>;
}

export function UIStat({ label, value, detail, className = '' }) {
  return <article className={classes('bui-stat', className)} data-ui="stat"><strong>{value}</strong><span>{label}</span>{detail ? <small>{detail}</small> : null}</article>;
}

export function UIDataRegion({ as: Component = 'section', title, eyebrow, actions, className = '', children, ...props }) {
  return (
    <Component className={classes('bui-data-region', className)} data-ui="data-region" {...props}>
      {(title || eyebrow || actions) ? <header className="bui-data-region__header"><div>{eyebrow ? <span>{eyebrow}</span> : null}{title ? <h2>{title}</h2> : null}</div>{actions ? <div>{actions}</div> : null}</header> : null}
      <div className="bui-data-region__body">{children}</div>
    </Component>
  );
}
