import React, { useMemo, useState } from 'react';
import { filterSupportAlerts } from '../../studentSupport/studentSupportViewModel.js';

function formatDate(value, language) {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(new Date(value)); }
  catch { return String(value); }
}

export default function StudentSupportAlertQueue({ alerts = [], language = 'vi', onOpenStudent }) {
  const vi = language === 'vi';
  const [filters, setFilters] = useState({ status: '', className: '', alertType: '' });
  const filtered = useMemo(() => filterSupportAlerts(alerts, filters), [alerts, filters]);
  const classes = useMemo(() => [...new Set(alerts.map((row) => row.source_class_name).filter(Boolean))].sort(), [alerts]);
  const types = useMemo(() => [...new Set(alerts.map((row) => row.alert_type).filter(Boolean))].sort(), [alerts]);

  return (
    <section className="student-support-alerts" aria-label={vi ? 'Hàng đợi cảnh báo' : 'Alert queue'}>
      <div className="student-support-filterbar">
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label={vi ? 'Trạng thái' : 'Status'}>
          <option value="">{vi ? 'Tất cả trạng thái' : 'All statuses'}</option>
          {['NEW', 'REVIEWING', 'LINKED_TO_CASE', 'NO_ACTION_REQUIRED', 'RESOLVED'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filters.className} onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))} aria-label={vi ? 'Lớp' : 'Class'}>
          <option value="">{vi ? 'Tất cả lớp' : 'All classes'}</option>
          {classes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={filters.alertType} onChange={(e) => setFilters((f) => ({ ...f, alertType: e.target.value }))} aria-label={vi ? 'Loại cảnh báo' : 'Alert type'}>
          <option value="">{vi ? 'Tất cả loại' : 'All types'}</option>
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {!filtered.length ? (
        <div className="student-support-state-card">{vi ? 'Không có cảnh báo phù hợp bộ lọc.' : 'No alerts match the current filters.'}</div>
      ) : (
        <div className="student-support-alert-list">
          {filtered.map((alert) => (
            <article className="student-support-alert-card" key={alert.id || alert.dedupe_key}>
              <div>
                <span className={`student-support-status is-${String(alert.status || '').toLowerCase()}`}>{alert.status || 'NEW'}</span>
                <h3>{alert.source_class_name || (vi ? 'Chưa xác định lớp' : 'Class unavailable')}</h3>
                <p>{alert.alert_type || (vi ? 'Cảnh báo theo quy tắc' : 'Rule-based alert')}</p>
              </div>
              <dl>
                <div><dt>{vi ? 'Mã học sinh' : 'Student'}</dt><dd>{alert.student_ref}</dd></div>
                <div><dt>{vi ? 'Cập nhật' : 'Updated'}</dt><dd>{formatDate(alert.updated_at || alert.last_evaluated_at, language)}</dd></div>
              </dl>
              <button type="button" onClick={() => onOpenStudent?.(alert)}>{vi ? 'Xem hồ sơ' : 'Open profile'}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
