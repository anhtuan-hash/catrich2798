import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { WEEKLY_PRACTICE_CLASSES } from '../utils/weeklyPractice.js';
import {
  buildWeeklyPracticeResultsCsv,
  clearWeeklyPracticeStatistics,
  createWeeklyPracticeProofUrl,
  filterWeeklyPracticeStatistics,
  groupWeeklyPracticeEventsByDay,
  loadWeeklyPracticeStatistics,
  summarizeWeeklyPracticeStatistics,
} from '../utils/weeklyPracticeStatistics.js';

function errorText(error) {
  const message = String(error?.message || error || '').trim();
  if (/row-level security|permission denied|policy/i.test(message)) return 'Tài khoản hiện tại không có quyền đọc thống kê bài luyện tập.';
  if (/proof_path|weekly-practice-proofs|does not exist|schema cache/i.test(message)) return 'Supabase chưa có migration weekly_practice_student_proof_v2.';
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

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function MetricCard({ label, value, note, tone = '' }) {
  return <article className={`bes-weekly-stat-metric ${tone ? `is-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}

function downloadCsv(item, rows) {
  const csv = buildWeeklyPracticeResultsCsv(item, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = text(item?.title || 'ket-qua-bai-tuan').replace(/[^a-zA-Z0-9À-ỹ_-]+/g, '-').replace(/-+/g, '-');
  link.href = url;
  link.download = `${safeName || 'ket-qua-bai-tuan'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function WeeklyPracticeStatisticsPanel({ items = [], initialItem = null, onClose }) {
  const initialId = initialItem?.id || items[0]?.id || '';
  const [practiceId, setPracticeId] = useState(initialId);
  const [rawData, setRawData] = useState({ events: [], results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ start: '', end: '', classCode: '' });
  const [message, setMessage] = useState('');
  const [openingProofId, setOpeningProofId] = useState(null);

  const selectedItem = useMemo(() => items.find((item) => item.id === practiceId) || items[0] || null, [items, practiceId]);

  const refresh = useCallback(async () => {
    if (!practiceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try { setRawData(await loadWeeklyPracticeStatistics(practiceId)); }
    catch (loadError) {
      setRawData({ events: [], results: [] });
      setError(errorText(loadError));
    } finally { setLoading(false); }
  }, [practiceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredData = useMemo(() => filterWeeklyPracticeStatistics(rawData, filters), [rawData, filters]);
  const summary = useMemo(() => summarizeWeeklyPracticeStatistics(filteredData), [filteredData]);
  const dailyRows = useMemo(() => groupWeeklyPracticeEventsByDay(filteredData), [filteredData]);
  const resultRows = useMemo(() => [...filteredData.results].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [filteredData.results]);

  const clearAll = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Xóa toàn bộ lượt mở, bài nộp và ảnh xác nhận của “${selectedItem.title}”? Thao tác này không thể hoàn tác.`)) return;
    setMessage('');
    try {
      await clearWeeklyPracticeStatistics(selectedItem.id);
      await refresh();
      setMessage('Đã xóa toàn bộ dữ liệu thống kê và ảnh xác nhận của bài.');
    } catch (clearError) { setMessage(errorText(clearError)); }
  };

  const openProof = async (row) => {
    if (!row.proof_path) return;
    setOpeningProofId(row.id);
    setMessage('');
    try {
      const url = await createWeeklyPracticeProofUrl(row.proof_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (proofError) {
      setMessage(errorText(proofError));
    } finally {
      setOpeningProofId(null);
    }
  };

  return createPortal(
    <div className="bes-weekly-stat-backdrop">
      <section className="bes-weekly-stat-panel bes-weekly-stat-panel--simple" role="dialog" aria-modal="true" aria-label="Thống kê bài luyện tập">
        <header className="bes-weekly-stat-header"><div><span className="bes-weekly-kicker">LEARNING SUBMISSIONS</span><h2>Bài nộp gửi TTCM</h2><p>Xem họ tên, lớp, thời lượng làm bài và ảnh xác nhận hoàn thành của từng học sinh.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        <div className="bes-weekly-stat-toolbar bes-weekly-stat-toolbar--results">
          <label>Bài luyện tập<select value={practiceId} onChange={(event) => setPracticeId(event.target.value)} disabled={!items.length}>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label>Lớp<select value={filters.classCode} onChange={(event) => setFilters({ ...filters, classCode: event.target.value })}><option value="">Tất cả lớp</option>{WEEKLY_PRACTICE_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Từ ngày<input type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></label>
          <label>Đến ngày<input type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></label>
          <button type="button" onClick={() => setFilters({ start: '', end: '', classCode: '' })}>Xóa lọc</button>
          <button type="button" onClick={refresh}>Làm mới</button>
        </div>
        {message ? <div className="bes-weekly-stat-message">{message}</div> : null}
        {loading ? <div className="bes-weekly-stat-state"><span className="bes-weekly-spinner" />Đang tổng hợp dữ liệu…</div> : null}
        {!loading && error ? <div className="bes-weekly-stat-state is-error"><strong>Không thể đọc thống kê</strong><p>{error}</p><button type="button" onClick={refresh}>Thử lại</button></div> : null}
        {!loading && !error && !selectedItem ? <div className="bes-weekly-stat-state"><strong>Chưa có bài luyện tập</strong></div> : null}
        {!loading && !error && selectedItem ? <main className="bes-weekly-stat-content">
          <div className="bes-weekly-stat-metrics bes-weekly-stat-metrics--simple">
            <MetricCard label="Bài đã gửi TTCM" value={summary.submittedCount.toLocaleString('vi-VN')} note={`${summary.classCount} lớp có bài nộp`} tone="success" />
            <MetricCard label="Học sinh đã mở bài" value={summary.openedStudentEstimate.toLocaleString('vi-VN')} note={`${summary.openEventCount.toLocaleString('vi-VN')} lượt mở`} tone="accent" />
            <MetricCard label="Tỷ lệ gửi bài" value={formatPercent(summary.completionRate)} note="Thiết bị gửi bài / thiết bị đã mở" />
            <MetricCard label="Thời lượng trung bình" value={formatDuration(summary.averageDurationSeconds)} note="Mỗi bài nộp tối thiểu 45 phút" />
          </div>

          <section className="bes-weekly-stat-explain">
            <div><h3>Dữ liệu xác nhận</h3><p>Mỗi bài nộp gồm họ tên, lớp, thời lượng hoạt động, thời điểm gửi và ảnh xác nhận được lưu riêng trong kho bảo mật.</p></div>
            <div className="bes-weekly-stat-actions"><button type="button" onClick={() => downloadCsv(selectedItem, resultRows)} disabled={!resultRows.length}>Xuất CSV</button><button className="bes-weekly-stat-danger" type="button" onClick={clearAll} disabled={!rawData.events.length && !rawData.results.length}>Xóa dữ liệu</button></div>
          </section>

          {resultRows.length ? <section className="bes-weekly-result-section"><div className="bes-weekly-stat-section-head"><div><h3>Danh sách học sinh đã gửi</h3><p>{resultRows.length} bài nộp phù hợp bộ lọc hiện tại.</p></div></div><div className="bes-weekly-result-table"><div className="is-head"><span>Họ và tên</span><span>Lớp</span><span>Thời lượng</span><span>Thời điểm gửi</span><span>Minh chứng</span></div>{resultRows.map((row) => <div key={row.id}><strong>{row.student_name}</strong><span>{row.class_code}</span><span>{formatDuration(row.duration_seconds)}</span><span>{formatDateTime(row.created_at)}</span><button type="button" disabled={!row.proof_path || openingProofId === row.id} onClick={() => openProof(row)}>{openingProofId === row.id ? 'Đang mở…' : row.proof_path ? 'Xem ảnh' : 'Không có ảnh'}</button></div>)}</div></section> : <div className="bes-weekly-stat-empty"><strong>Chưa có bài nộp</strong><p>Học sinh phải đủ 45 phút, tạo ảnh xác nhận và bấm “Gửi cho TTCM” thì mới xuất hiện tại đây.</p></div>}

          {dailyRows.length ? <section className="bes-weekly-daily-section"><div className="bes-weekly-stat-section-head"><div><h3>Tổng hợp theo ngày</h3><p>So sánh lượt mở và số bài gửi trong từng ngày.</p></div></div><div className="bes-weekly-daily-table bes-weekly-daily-table--results"><div className="is-head"><span>Ngày</span><span>Thiết bị đã mở</span><span>Bài đã gửi</span><span>Số lớp</span><span>Tỷ lệ</span></div>{dailyRows.map((row) => <div key={row.date}><strong>{formatDay(row.date)}</strong><span>{row.openedStudentEstimate}</span><span>{row.submissions}</span><span>{row.classCount}</span><span>{formatPercent(row.completionRate)}</span></div>)}</div></section> : null}
          {summary.errorCount ? <div className="bes-weekly-stat-warning">Có {summary.errorCount} sự kiện lỗi được ghi nhận trong khoảng thời gian này.</div> : null}
        </main> : null}
      </section>
    </div>, document.body,
  );
}
