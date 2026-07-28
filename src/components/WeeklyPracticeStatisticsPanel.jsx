import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildWeeklyPracticeEventsCsv,
  clearWeeklyPracticeStatistics,
  filterWeeklyPracticeStatistics,
  groupWeeklyPracticeEventsByDay,
  loadWeeklyPracticeStatistics,
  summarizeWeeklyPracticeStatistics,
} from '../utils/weeklyPracticeStatistics.js';

function errorText(error) {
  const message = String(error?.message || error || '').trim();
  if (/row-level security|permission denied|policy/i.test(message)) return 'Tài khoản hiện tại không có quyền đọc thống kê bài luyện tập.';
  return message || 'Không thể tải dữ liệu thống kê.';
}

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '0%';
}

function formatDay(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function MetricCard({ label, value, note, tone = '' }) {
  return <article className={`bes-weekly-stat-metric ${tone ? `is-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}

function downloadCsv(item, summary, rows) {
  const csv = buildWeeklyPracticeEventsCsv(item, summary, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = text(item?.title || 'thong-ke-bai-tuan').replace(/[^a-zA-Z0-9À-ỹ_-]+/g, '-').replace(/-+/g, '-');
  link.href = url;
  link.download = `${safeName || 'thong-ke-bai-tuan'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function WeeklyPracticeStatisticsPanel({ items = [], initialItem = null, onClose }) {
  const initialId = initialItem?.id || items[0]?.id || '';
  const [practiceId, setPracticeId] = useState(initialId);
  const [rawData, setRawData] = useState({ events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ start: '', end: '' });
  const [message, setMessage] = useState('');

  const selectedItem = useMemo(() => items.find((item) => item.id === practiceId) || items[0] || null, [items, practiceId]);

  const refresh = useCallback(async () => {
    if (!practiceId) { setLoading(false); return; }
    setLoading(true); setError(''); setMessage('');
    try { setRawData(await loadWeeklyPracticeStatistics(practiceId)); }
    catch (loadError) { setRawData({ events: [] }); setError(errorText(loadError)); }
    finally { setLoading(false); }
  }, [practiceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredData = useMemo(() => filterWeeklyPracticeStatistics(rawData, filters), [rawData, filters]);
  const summary = useMemo(() => summarizeWeeklyPracticeStatistics(filteredData), [filteredData]);
  const dailyRows = useMemo(() => groupWeeklyPracticeEventsByDay(filteredData), [filteredData]);

  const clearAll = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Xóa toàn bộ lượt mở và lượt hoàn thành của “${selectedItem.title}”? Thao tác này không thể hoàn tác.`)) return;
    setMessage('');
    try {
      await clearWeeklyPracticeStatistics(selectedItem.id);
      await refresh();
      setMessage('Đã xóa toàn bộ dữ liệu thống kê của bài.');
    } catch (clearError) { setMessage(errorText(clearError)); }
  };

  return createPortal(
    <div className="bes-weekly-stat-backdrop">
      <section className="bes-weekly-stat-panel bes-weekly-stat-panel--simple" role="dialog" aria-modal="true" aria-label="Thống kê lượt làm bài">
        <header className="bes-weekly-stat-header"><div><span className="bes-weekly-kicker">LEARNING ACTIVITY</span><h2>Thống kê lượt làm bài</h2><p>Chỉ theo dõi lượt mở bài và lượt xác nhận hoàn thành; không thu tên, lớp hoặc điểm.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        <div className="bes-weekly-stat-toolbar">
          <label>Bài luyện tập<select value={practiceId} onChange={(event) => setPracticeId(event.target.value)} disabled={!items.length}>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label>Từ ngày<input type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></label>
          <label>Đến ngày<input type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></label>
          <button type="button" onClick={() => setFilters({ start: '', end: '' })}>Xóa lọc</button>
          <button type="button" onClick={refresh}>Làm mới</button>
        </div>
        {message ? <div className="bes-weekly-stat-message">{message}</div> : null}
        {loading ? <div className="bes-weekly-stat-state"><span className="bes-weekly-spinner" />Đang tổng hợp dữ liệu…</div> : null}
        {!loading && error ? <div className="bes-weekly-stat-state is-error"><strong>Không thể đọc thống kê</strong><p>{error}</p><button type="button" onClick={refresh}>Thử lại</button></div> : null}
        {!loading && !error && !selectedItem ? <div className="bes-weekly-stat-state"><strong>Chưa có bài luyện tập</strong></div> : null}
        {!loading && !error && selectedItem ? <main className="bes-weekly-stat-content">
          <div className="bes-weekly-stat-metrics bes-weekly-stat-metrics--simple">
            <MetricCard label="Học sinh đã mở bài" value={summary.openedStudentEstimate.toLocaleString('vi-VN')} note="Ước tính theo trình duyệt/thiết bị khác nhau" tone="accent" />
            <MetricCard label="Đã hoàn thành" value={summary.completedStudentEstimate.toLocaleString('vi-VN')} note={`${summary.completionEventCount.toLocaleString('vi-VN')} lượt xác nhận`} tone="success" />
            <MetricCard label="Tỷ lệ hoàn thành" value={formatPercent(summary.completionRate)} note="Số thiết bị hoàn thành / số thiết bị đã mở" />
            <MetricCard label="Tổng lượt mở" value={summary.openEventCount.toLocaleString('vi-VN')} note="Có thể gồm tải lại hoặc mở lại bài" />
          </div>

          <section className="bes-weekly-stat-explain">
            <div><h3>Cách hệ thống ghi nhận</h3><p>Mỗi trình duyệt hoặc thiết bị được xem như một học sinh ước tính. Khi học sinh bấm <strong>“Xác nhận đã hoàn thành”</strong>, hệ thống ghi thêm một lượt hoàn thành và không yêu cầu khai báo thông tin cá nhân.</p></div>
            <div className="bes-weekly-stat-actions"><button type="button" onClick={() => downloadCsv(selectedItem, summary, dailyRows)} disabled={!filteredData.events.length}>Xuất CSV</button><button className="bes-weekly-stat-danger" type="button" onClick={clearAll} disabled={!rawData.events.length}>Xóa dữ liệu</button></div>
          </section>

          {dailyRows.length ? <section className="bes-weekly-daily-section"><div className="bes-weekly-stat-section-head"><div><h3>Hoạt động theo ngày</h3><p>Theo dõi số người mở và xác nhận hoàn thành trong từng ngày.</p></div></div><div className="bes-weekly-daily-table"><div className="is-head"><span>Ngày</span><span>Đã mở</span><span>Hoàn thành</span><span>Tỷ lệ</span><span>Tổng lượt mở</span></div>{dailyRows.map((row) => <div key={row.date}><strong>{formatDay(row.date)}</strong><span>{row.openedStudentEstimate}</span><span>{row.completedStudentEstimate}</span><span>{formatPercent(row.completionRate)}</span><span>{row.openEvents}</span></div>)}</div></section> : <div className="bes-weekly-stat-empty"><strong>Chưa có dữ liệu</strong><p>Mở bài thử trong cửa sổ ẩn danh, sau đó bấm “Xác nhận đã hoàn thành” để kiểm tra hai chỉ số.</p></div>}
          {summary.errorCount ? <div className="bes-weekly-stat-warning">Có {summary.errorCount} sự kiện lỗi được ghi nhận trong khoảng thời gian này.</div> : null}
        </main> : null}
      </section>
    </div>, document.body,
  );
}
