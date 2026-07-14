import React from 'react';

function StatChip({ label, value, tone = 'blue' }) {
  return (
    <span className={`route-hero-stat tone-${tone}`}>
      <b>{value}</b>
      <small>{label}</small>
    </span>
  );
}

function FeatureTile({ title, text, tone = 'blue', icon = '•' }) {
  return (
    <div className={`route-hero-tile tone-${tone}`}>
      <span className="route-hero-tile-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}

export default function RouteHero({ eyebrow, title, description, primary, secondary, stats = [], tiles = [], accent = 'blue', icon = 'BR', className = '' }) {
  const previewTiles = tiles.length ? tiles.slice(0, 4) : [
    { title: 'Input', text: 'Add content', icon: 'IN', tone: accent },
    { title: 'Create', text: 'Generate output', icon: 'GO', tone: 'purple' },
    { title: 'Preview', text: 'Check result', icon: 'PV', tone: 'teal' },
    { title: 'Export', text: 'Save or teach', icon: 'EX', tone: 'orange' },
  ];

  return (
    <section data-ui="route-hero" className={`route-hero route-hero-${accent} ${className}`.trim()}>
      <div className="route-hero-copy">
        <div className="route-hero-brand brand-lockup-v2">
          <div className="route-hero-brand-tile">
            <img src="/logo-brian-english.png" alt="Brian English logo" />
          </div>
          <div className="route-hero-brand-copy">
            <span className="eyebrow">{eyebrow}</span>
            <strong>Brian English Studio</strong>
            <small>Flat Metro Teaching OS</small>
          </div>
          <div className={`route-hero-logo tone-${accent}`} aria-hidden="true">{icon}</div>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="route-hero-actions">
          {primary ? <button data-ui="button" data-variant="primary" className="primary" onClick={primary.onClick}>{primary.label}</button> : null}
          {secondary ? <button data-ui="button" data-variant="secondary" className="secondary" onClick={secondary.onClick}>{secondary.label}</button> : null}
        </div>
        {stats.length ? <div className="route-hero-stats">{stats.map((item) => <StatChip key={`${item.label}-${item.value}`} {...item} />)}</div> : null}
      </div>
      <div className="route-hero-visual">
        <div className="route-hero-board">
          <div className="route-hero-board-head">
            <span className="dot blue" />
            <strong>{title}</strong>
          </div>
          <div className="route-hero-board-grid">
            {previewTiles.map((tile) => <FeatureTile key={tile.title} {...tile} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
