import React from 'react';
import './B2UI.css';

export function B2Button({ children, variant = 'secondary', icon = null, className = '', ...props }) {
  return (
    <button className={`b2-btn b2-btn--${variant} ${className}`.trim()} type="button" {...props}>
      {icon ? <span className="b2-btn__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export function B2IconButton({ label, children, className = '', ...props }) {
  return (
    <button className={`b2-icon-button ${className}`.trim()} type="button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function B2Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`b2-badge b2-badge--${tone} ${className}`.trim()}>{children}</span>;
}

export function B2PageHeader({ eyebrow, title, description, actions = null, aside = null }) {
  return (
    <header className="b2-page-header">
      <div className="b2-page-header__copy">
        {eyebrow ? <span className="b2-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="b2-page-header__actions">{actions}</div> : null}
      </div>
      {aside ? <div className="b2-page-header__aside">{aside}</div> : null}
    </header>
  );
}

export function B2SectionHeader({ eyebrow, title, description, action = null }) {
  return (
    <div className="b2-section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function B2SearchBox({ value, onChange, placeholder = 'Tìm kiếm…', className = '' }) {
  return (
    <label className={`b2-search-box ${className}`.trim()}>
      <span aria-hidden="true">⌕</span>
      <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function B2Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`b2-tabs ${className}`.trim()} role="tablist">
      {items.map((item) => {
        const id = typeof item === 'string' ? item : item.id;
        const label = typeof item === 'string' ? item : item.label;
        const count = typeof item === 'string' ? null : item.count;
        return (
          <button key={id} className={value === id ? 'is-active' : ''} type="button" role="tab" aria-selected={value === id} onClick={() => onChange?.(id)}>
            <span>{label}</span>
            {count !== null && count !== undefined ? <em>{count}</em> : null}
          </button>
        );
      })}
    </div>
  );
}

export function B2Surface({ children, className = '', padding = 'normal' }) {
  return <section className={`b2-surface b2-surface--${padding} ${className}`.trim()}>{children}</section>;
}

export function B2StatCard({ label, value, meta, tone = 'blue', icon = '•' }) {
  return (
    <article className={`b2-stat-card tone-${tone}`}>
      <div className="b2-stat-card__icon" aria-hidden="true">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </article>
  );
}

export function B2AppCard({ icon, title, group, description, status, tone = 'blue', featured = false, onOpen }) {
  return (
    <article className={`b2-app-card tone-${tone} ${featured ? 'is-featured' : ''}`}>
      <button className="b2-app-card__main" type="button" onClick={onOpen}>
        <span className="b2-app-card__icon" aria-hidden="true">{icon || 'AP'}</span>
        <span className="b2-app-card__copy">
          <small>{group}</small>
          <strong>{title}</strong>
          <p>{description}</p>
        </span>
        <span className="b2-app-card__arrow" aria-hidden="true">↗</span>
      </button>
      <footer>
        <span>{status}</span>
        {featured ? <B2Badge tone="blue">Nổi bật</B2Badge> : null}
      </footer>
    </article>
  );
}

export function B2LauncherTile({ icon, title, category, domain, tone = 'blue', pinned = false, shared = false, onOpen }) {
  return (
    <button type="button" className={`b2-launcher-tile tone-${tone}`} onClick={onOpen}>
      <span className="b2-launcher-tile__top">
        <span className="b2-launcher-tile__icon" aria-hidden="true">{icon || '↗'}</span>
        <span className="b2-launcher-tile__flags">
          {pinned ? <B2Badge tone="amber">★</B2Badge> : null}
          {shared ? <B2Badge tone="violet">Chia sẻ</B2Badge> : null}
        </span>
      </span>
      <span className="b2-launcher-tile__copy">
        <small>{category}</small>
        <strong>{title}</strong>
        <em>{domain}</em>
      </span>
      <span className="b2-launcher-tile__open" aria-hidden="true">↗</span>
    </button>
  );
}

export function B2EmptyState({ icon = '□', title, description, action = null }) {
  return (
    <div className="b2-empty-state">
      <div className="b2-empty-state__icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function B2CommandBar({ children, className = '' }) {
  return <div className={`b2-command-bar ${className}`.trim()}>{children}</div>;
}
