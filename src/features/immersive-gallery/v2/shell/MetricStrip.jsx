import React from 'react';

// MetricStrip — KPI row. Props: {items: [{value, label, highlight?}]}.
// Counts are computed by the caller from real records; this component is pure display.
export default function MetricStrip({items = []}) {
  if (!items.length) return null;
  return (
    <div className="kpi-grid" role="list" aria-label="Live project figures">
      {items.map((it, i) => (
        <div className="kpi" role="listitem" key={i}>
          <strong>{it.highlight ? <i>{it.value}</i> : it.value}</strong>
          <small>{it.label}</small>
        </div>
      ))}
    </div>
  );
}
