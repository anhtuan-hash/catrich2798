import React from 'react';
import './B2Data.css';

export function B2Status({ children, tone = 'neutral', dot = true }) {
  return (
    <span className={`b2-status b2-status--${tone}`}>
      {dot ? <span className="b2-status__dot" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}

export function B2FilterChips({ items = [], value, onChange }) {
  return (
    <div className="b2-filter-chips" aria-label="Bộ lọc nhanh">
      {items.map((item) => {
        const id = typeof item === 'string' ? item : item.id;
        const label = typeof item === 'string' ? item : item.label;
        const count = typeof item === 'string' ? null : item.count;
        return (
          <button type="button" key={id} className={value === id ? 'is-active' : ''} onClick={() => onChange?.(id)}>
            <span>{label}</span>
            {count !== null && count !== undefined ? <em>{count}</em> : null}
          </button>
        );
      })}
    </div>
  );
}

export function B2DataToolbar({ left, right }) {
  return (
    <div className="b2-data-toolbar">
      <div className="b2-data-toolbar__left">{left}</div>
      <div className="b2-data-toolbar__right">{right}</div>
    </div>
  );
}

export function B2DataTable({ columns = [], rows = [], rowKey = 'id', onRowClick, empty = null, className = '' }) {
  if (!rows.length && empty) return empty;
  return (
    <div className={`b2-data-table-wrap ${className}`.trim()}>
      <table className="b2-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined} className={column.align ? `is-${column.align}` : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowKey] ?? index} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'is-clickable' : ''}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label} className={column.align ? `is-${column.align}` : ''}>
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function B2PersonCell({ initials, name, meta, tone = 'blue' }) {
  return (
    <div className="b2-person-cell">
      <span className={`b2-person-cell__avatar tone-${tone}`}>{initials}</span>
      <span><strong>{name}</strong>{meta ? <small>{meta}</small> : null}</span>
    </div>
  );
}

export function B2ProgressBar({ value = 0, label = null, tone = 'blue' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`b2-progress tone-${tone}`}>
      <div className="b2-progress__track"><span style={{ width: `${safe}%` }} /></div>
      {label !== null ? <small>{label}</small> : null}
    </div>
  );
}
