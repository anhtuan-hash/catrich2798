import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildWeeklyPracticeResultsCsv,
  clearWeeklyPracticeStatistics,
  deleteWeeklyPracticeResult,
  filterWeeklyPracticeStatistics,
  groupWeeklyPracticeResultsByClass,
  loadWeeklyPracticeStatistics,
  resultPercentage,
  resultStudentKey,
  selectWeeklyPracticeStudentAttempts,
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatPercent(value, fallback = '—') {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : fallback;
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return '—';
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return minutes ? `${minutes} phút ${remain ? `${remain} giây` : ''}`.trim() : `${remain} giây`;
}

function scoreText(result) {
  if (Number.isFinite(Number(result?.score)) && Number.isFinite(Number(result?.max_score))) {
    return `${Number(result.score).toLocaleString('vi-VN')}/${Number(result.max_score).toLocaleString('vi-VN')}`;
  }
  if (Number.isFinite(Number(result?.correct_count)) && Number.isFinite(Number(result?.question_count))) {
    return `${result.correct_count}/${result.question_count} câu`;
  }
  return '—';
}

function MetricCard({ label, value, note, tone = '' }) {
  return <article className={`bes-weekly-stat-metric ${tone ? `is-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}

function downloadCsv(item, rows) {
  const csv = buildWeeklyPracticeResultsCsv(item, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = text(`${item?.week_key || 'tuan'}-${item?.title || 'ket-qua'}`).replace(/[^a-zA-Z0-9À-ỹ_-]+/g, '-').replace(/-+/g, '-');
  link.href = url;
  link.download = `${safeName || 'ket-qua-bai-tuan'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ResultDetail({ result, onClose, onDelete }) {
  if (!result) return null;
  const percentage = resultPercentage(result);
  return <aside className="bes-weekly-result-detail" aria-label="Chi tiết lượt nộp">
    <header><div><span>CHI TIẾT LƯỢT NỘP</span><h3>{result.student_name || 'Học sinh'}</h3><p>{result.class_code || 'Chưa có lớp'} · {formatDate(result.created_at)}</p></div><button type="button" onClick={onClose}>×</button></header>
    <div className="bes-weekly-result-detail__metrics"><div><span>Điểm</span><strong>{scoreText(result)}</strong></div><div><span>Tỷ lệ</span><strong>{formatPercent(percentage)}</strong></div><div><span>Thời gian</span><strong>{formatDuration(result.duration_seconds)}</strong></div></div>
    <dl><div><dt>Mã học sinh</dt><dd>{result.student_code || '—'}</dd></div><div><dt>Mã thiết bị</dt><dd>{result.device_id || '—'}</dd></div><div><dt>Mã lượt nộp</dt><dd>{result.id}</dd></div></dl>
    <section><h4>Dữ liệu đáp án</h4><pre>{Object.keys(result.answers || {}).length ? JSON.stringify(result.answers, null, 2) : 'File HTML không gửi dữ liệu đáp án.'}</pre></section>
    <button className="bes-weekly-stat-danger" type="button" onClick={() => onDelete(result)}>Xóa lượt nộp này</button>
  </aside>;
}

export default function WeeklyPracticeStatisticsPanel({ items = [], initialItem = null, onClose }) {
  const initialId = initialItem?.id || items[0]?.id || '';
  const [practiceId, setPracticeId] = useState(initialId);
  const [rawData, setRawData] = useState({ events: [], results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState({ start: '', end: '' });
  const [attemptMode, setAttemptMode] = useState('latest');
  const [classFilter, setClassFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [message, setMessage] = useState('');

  const selectedItem = useMemo(() => items.find((item) => item.id === practiceId) || items[0] || null, [items, practiceId]);

  const refresh = useCallback(async () => {
    if (!practiceId) { setLoading(false); return; }
    setLoading(true); setError(''); setMessage(''); setSelectedResult(null);
    try { setRawData(await loadWeeklyPracticeStatistics(practiceId)); }
    catch (loadError) { setRawData({ events: [], results: [] }); setError(errorText(loadError)); }
    finally { setLoading(false); }
  }, [practiceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredData = useMemo(() => filterWeeklyPracticeStatistics(rawData, filters), [rawData, filters]);
  const summary = useMemo(() => summarizeWeeklyPracticeStatistics(filteredData), [filteredData]);
  const classRows = useMemo(() => groupWeeklyPracticeResultsByClass(filteredData.results), [filteredData.results]);
  const attemptsByStudent = useMemo(() => {
    const map = new Map();
    filteredData.results.forEach((result) => {
      const key = resultStudentKey(result);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [filteredData.results]);
  const studentRows = useMemo(() => {
    const selected = selectWeeklyPracticeStudentAttempts(filteredData.results, attemptMode);
    const normalizedQuery = text(query).toLocaleLowerCase('vi-VN');
    return selected.filter((result) => {
      if (classFilter !== 'all' && text(result.class_code) !== classFilter) return false;
      if (!normalizedQuery) return true;
      return `${result.student_name || ''} ${result.class_code || ''} ${result.student_code || ''}`.toLocaleLowerCase('vi-VN').includes(normalizedQuery);
    });
  }, [filteredData.results, attemptMode, classFilter, query]);

  const deleteResult = async (result) => {
    if (!window.confirm(`Xóa lượt nộp của “${result.student_name}” lúc ${formatDate(result.created_at)}?`)) return;
    setMessage('');
    try {
      await deleteWeeklyPracticeResult(result.id);
      setSelectedResult(null);
      await refresh();
      setMessage('Đã xóa lượt nộp.');
    } catch (deleteError) { setMessage(errorText(deleteError)); }
  };

  const clearAll = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Xóa toàn bộ lượt mở, hoàn thành và kết quả của “${selectedItem.title}”? Thao tác này không thể hoàn tác.`)) return;
    setMessage('');
    try {
      await clearWeeklyPracticeStatistics(selectedItem.id);
      await refresh();
      setMessage('Đã xóa toàn bộ dữ liệu thống kê của bài.');
    } catch (clearError) { setMessage(errorText(clearError)); }
  };

  return createPortal(
    <div className="bes-weekly-stat-backdrop">
      <section className="bes-weekly-stat-panel" role="dialog" aria-modal="true" aria-label="Thống kê bài luyện tập theo tuần">
        <header className="bes-weekly-stat-header"><div><span className="bes-weekly-kicker">LEARNING ANALYTICS</span><h2>Thống kê bài luyện tập</h2><p>Phân biệt lượt mở bài, thiết bị ước tính, lượt hoàn thành và học sinh đã nộp.</p></div><button className="bes-weekly-close" type="button" onClick={onClose}>×</button></header>
        <div className="bes-weekly-stat-toolbar">
          <label>Bài luyện tập<select value={practiceId} onChange={(event) => { setPracticeId(event.target.value); setClassFilter('all'); }} disabled={!items.length}>{items.map((item) => <option key={item.id} value={item.id}>{item.week_key} · {item.title}</option>)}</select></label>
          <label>Từ ngày<input type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></label>
          <label>Đến ngày<input type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></label>
          <button type="button" onClick={() => setFilters({ start: '', end: '' })}>Xóa lọc ngày</button>
          <button type="button" onClick={refresh}>Làm mới</button>
        </div>
        <nav className="bes-weekly-stat-tabs" aria-label="Các nhóm thống kê"><button className={tab === 'overview' ? 'is-active' : ''} type="button" onClick={() => setTab('overview')}>Tổng quan</button><button className={tab === 'classes' ? 'is-active' : ''} type="button" onClick={() => setTab('classes')}>Theo lớp</button><button className={tab === 'students' ? 'is-active' : ''} type="button" onClick={() => setTab('students')}>Học sinh</button></nav>
        {message ? <div className="bes-weekly-stat-message">{message}</div> : null}
        {loading ? <div className="bes-weekly-stat-state"><span className="bes-weekly-spinner" />Đang tổng hợp dữ liệu…</div> : null}
        {!loading && error ? <div className="bes-weekly-stat-state is-error"><strong>Không thể đọc thống kê</strong><p>{error}</p><button type="button" onClick={refresh}>Thử lại</button></div> : null}
        {!loading && !error && !selectedItem ? <div className="bes-weekly-stat-state"><strong>Chưa có bài luyện tập</strong></div> : null}
        {!loading && !error && selectedItem ? <main className="bes-weekly-stat-content">
          {tab === 'overview' ? <section className="bes-weekly-stat-overview">
            <div className="bes-weekly-stat-metrics"><MetricCard label="Lượt mở bài" value={summary.openCount.toLocaleString('vi-VN')} note="Tính theo sự kiện mở" /><MetricCard label="Thiết bị ước tính" value={summary.uniqueDeviceCount.toLocaleString('vi-VN')} note="Không đồng nghĩa số học sinh" tone="accent" /><MetricCard label="Lượt hoàn thành" value={summary.completionCount.toLocaleString('vi-VN')} note={`${summary.completedDeviceCount} thiết bị hoàn thành`} /><MetricCard label="Học sinh đã nộp" value={summary.uniqueStudentCount.toLocaleString('vi-VN')} note={`${summary.submissionCount} lượt nộp`} tone="success" /><MetricCard label="Tỷ lệ hoàn thành" value={formatPercent(summary.completionRate, '0%')} note="Thiết bị hoàn thành / thiết bị mở" /><MetricCard label="Điểm trung bình" value={formatPercent(summary.averagePercentage)} note="Quy đổi theo tỷ lệ phần trăm" /><MetricCard label="Thời gian trung bình" value={formatDuration(summary.averageDurationSeconds)} note="Chỉ tính lượt có thời gian" /><MetricCard label="Học sinh làm nhiều lần" value={summary.repeaterCount.toLocaleString('vi-VN')} note={summary.errorCount ? `${summary.errorCount} lỗi được ghi nhận` : 'Không có lỗi được ghi nhận'} /></div>
            <div className="bes-weekly-stat-explain"><div><h3>Cách hiểu số liệu</h3><p><strong>Lượt mở</strong> có thể tăng khi học sinh tải lại trang. <strong>Học sinh đã nộp</strong> chỉ xuất hiện khi bài bật Thu kết quả và file HTML gọi <code>BrianWeeklyPractice.complete()</code>.</p></div><button type="button" onClick={() => downloadCsv(selectedItem, filteredData.results)} disabled={!filteredData.results.length}>Xuất toàn bộ CSV</button></div>
            {!filteredData.events.length && !filteredData.results.length ? <div className="bes-weekly-stat-empty"><strong>Chưa có dữ liệu</strong><p>Hãy mở bài thử trong cửa sổ ẩn danh. Dữ liệu tên và lớp chỉ được lưu sau khi học sinh hoàn thành và nộp bài.</p></div> : null}
          </section> : null}
          {tab === 'classes' ? <section className="bes-weekly-stat-classes"><div className="bes-weekly-stat-section-head"><div><h3>Hiệu quả theo lớp</h3><p>Dựa trên các lượt nộp có trường lớp.</p></div><button type="button" onClick={() => downloadCsv(selectedItem, filteredData.results)} disabled={!filteredData.results.length}>Xuất CSV</button></div>{classRows.length ? <div className="bes-weekly-class-table"><div className="is-head"><span>Lớp</span><span>Học sinh</span><span>Lượt nộp</span><span>Điểm TB</span><span>Thời gian TB</span><span>Gần nhất</span></div>{classRows.map((row) => <button key={row.classCode} type="button" onClick={() => { setClassFilter(row.classCode); setTab('students'); }}><strong>{row.classCode}</strong><span>{row.uniqueStudents}</span><span>{row.attempts}</span><span className="bes-weekly-score-bar"><i style={{ width: `${Math.max(2, row.averagePercentage || 0)}%` }} /><b>{formatPercent(row.averagePercentage)}</b></span><span>{formatDuration(row.averageDurationSeconds)}</span><span>{formatDate(row.latestAt)}</span></button>)}</div> : <div className="bes-weekly-stat-empty"><strong>Chưa có lượt nộp theo lớp</strong><p>Bài cần bật Thu kết quả để Brian yêu cầu học sinh nhập họ tên và lớp.</p></div>}</section> : null}
          {tab === 'students' ? <section className="bes-weekly-stat-students"><div className="bes-weekly-stat-section-head"><div><h3>Danh sách học sinh</h3><p>{studentRows.length} dòng theo bộ lọc hiện tại.</p></div><div><button type="button" onClick={() => downloadCsv(selectedItem, studentRows)} disabled={!studentRows.length}>Xuất danh sách CSV</button><button className="bes-weekly-stat-danger" type="button" onClick={clearAll} disabled={!rawData.events.length && !rawData.results.length}>Xóa toàn bộ dữ liệu</button></div></div><div className="bes-weekly-student-filters"><label>Cách chọn lượt<select value={attemptMode} onChange={(event) => setAttemptMode(event.target.value)}><option value="latest">Lượt mới nhất</option><option value="first">Lượt đầu tiên</option><option value="best">Điểm cao nhất</option><option value="all">Tất cả lượt làm</option></select></label><label>Lớp<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">Tất cả lớp</option>{classRows.map((row) => <option key={row.classCode} value={row.classCode}>{row.classCode}</option>)}</select></label><label className="is-search">Tìm học sinh<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, lớp hoặc mã học sinh" /></label></div>{studentRows.length ? <div className="bes-weekly-student-table"><div className="is-head"><span>Họ và tên</span><span>Lớp</span><span>Điểm</span><span>Tỷ lệ</span><span>Thời gian</span><span>Lần làm</span><span>Ngày nộp</span></div>{studentRows.map((result) => <button key={result.id} type="button" onClick={() => setSelectedResult(result)}><strong>{result.student_name || 'Chưa có tên'}<small>{result.student_code || 'Không có mã HS'}</small></strong><span>{result.class_code || '—'}</span><span>{scoreText(result)}</span><span>{formatPercent(resultPercentage(result))}</span><span>{formatDuration(result.duration_seconds)}</span><span>{attemptsByStudent.get(resultStudentKey(result)) || 1}</span><span>{formatDate(result.created_at)}</span></button>)}</div> : <div className="bes-weekly-stat-empty"><strong>Không có kết quả phù hợp</strong><p>Thử bỏ bộ lọc lớp, ngày hoặc từ khóa tìm kiếm.</p></div>}</section> : null}
        </main> : null}
        {selectedResult ? <ResultDetail result={selectedResult} onClose={() => setSelectedResult(null)} onDelete={deleteResult} /> : null}
      </section>
    </div>, document.body,
  );
}
