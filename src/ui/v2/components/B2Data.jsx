import React, { useMemo, useState } from 'react';
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

export function B2DataToolbar({ left, right, selectedCount = 0, bulkActions = null }) {
  return (
    <div className={`b2-data-toolbar ${selectedCount ? 'has-selection' : ''}`}>
      <div className="b2-data-toolbar__left">
        {selectedCount ? <strong className="b2-data-selected">{selectedCount} đã chọn</strong> : left}
        {selectedCount ? bulkActions : null}
      </div>
      <div className="b2-data-toolbar__right">{right}</div>
    </div>
  );
}

export function B2RowActions({ items = [] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="b2-row-actions" onClick={(event) => event.stopPropagation()}>
      <button type="button" aria-label="Thao tác" onClick={() => setOpen((value) => !value)}>•••</button>
      {open ? (
        <div className="b2-row-actions__menu">
          {items.map((item) => (
            <button key={item.label} type="button" className={item.danger ? 'is-danger' : ''} onClick={() => { setOpen(false); item.onClick?.(); }}>
              <span>{item.icon || '›'}</span><strong>{item.label}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function B2DataTable({ columns = [], rows = [], rowKey = 'id', onRowClick, empty = null, className = '', selectable = false, selected = [], onSelectionChange }) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const keys = rows.map((row, index) => row[rowKey] ?? index);
  const allSelected = selectable && keys.length > 0 && keys.every((key) => selectedSet.has(key));

  const toggleAll = () => onSelectionChange?.(allSelected ? [] : keys);
  const toggleOne = (key) => onSelectionChange?.(selectedSet.has(key) ? selected.filter((value) => value !== key) : [...selected, key]);

  if (!rows.length && empty) return empty;
  return (
    <div className={`b2-data-table-wrap ${className}`.trim()}>
      <table className="b2-data-table">
        <thead>
          <tr>
            {selectable ? <th className="b2-select-cell"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Chọn tất cả" /></th> : null}
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined} className={column.align ? `is-${column.align}` : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = row[rowKey] ?? index;
            const isSelected = selectedSet.has(key);
            return (
              <tr key={key} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`${onRowClick ? 'is-clickable' : ''} ${isSelected ? 'is-selected' : ''}`.trim()}>
                {selectable ? <td className="b2-select-cell" data-label="Chọn"><input type="checkbox" checked={isSelected} onClick={(event) => event.stopPropagation()} onChange={() => toggleOne(key)} aria-label={`Chọn dòng ${index + 1}`} /></td> : null}
                {columns.map((column) => (
                  <td key={column.key} data-label={column.label} className={column.align ? `is-${column.align}` : ''}>
                    {column.render ? column.render(row, index) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function B2Pagination({ page = 1, pageCount = 1, total = 0, onChange }) {
  return (
    <div className="b2-pagination">
      <span>{total} mục · Trang {page}/{Math.max(pageCount, 1)}</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onChange?.(page - 1)}>←</button>
        <button type="button" disabled={page >= pageCount} onClick={() => onChange?.(page + 1)}>→</button>
      </div>
    </div>
  );
}

export function B2DataState({ type = 'empty', title, description, action = null }) {
  const icons = { empty: '□', error: '!', loading: '⋯' };
  if (type === 'loading') {
    return <B2SkeletonRows rows={5} />;
  }
  return (
    <div className={`b2-data-state is-${type}`}>
      <span>{icons[type] || '□'}</span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function B2SkeletonRows({ rows = 5 }) {
  return (
    <div className="b2-skeleton-list" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index}><i /><span><b /><b /></span><em /></div>
      ))}
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
