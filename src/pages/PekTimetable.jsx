import React, { useEffect, useMemo, useState } from 'react';
import './PekTimetable.css';

const TARGET_TEACHERS = [
  'Nguyễn Anh Tuấn',
  'Nguyễn Đặng Minh Hoa',
  'Phạm Thị Ngọc Châm',
  'Ngô Thị Mỹ Diệp',
  'Đào Ngọc Nhã',
  'Nguyễn Thị Mỹ Duyên',
];
const DAYS = [
  { value: 2, label: 'Thứ Hai', short: 'T2' },
  { value: 3, label: 'Thứ Ba', short: 'T3' },
  { value: 4, label: 'Thứ Tư', short: 'T4' },
  { value: 5, label: 'Thứ Năm', short: 'T5' },
  { value: 6, label: 'Thứ Sáu', short: 'T6' },
  { value: 7, label: 'Thứ Bảy', short: 'T7' },
];

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}
function initials(name = '') { return String(name).trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'TK'; }
function formatSync(value) {
  if (!value) return 'Chưa đồng bộ';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return String(value); }
}
function colorIndex(value = '') {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 6;
}

export default function PekTimetable({ language = 'vi' }) {
  const vi = language === 'vi';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('teacher');
  const [teacher, setTeacher] = useState(TARGET_TEACHERS[0]);
  const [className, setClassName] = useState('');
  const [view, setView] = useState('week');

  async function load(force = false) {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/pek-timetable${force ? '?force=1' : ''}`, { cache: force ? 'no-store' : 'default' });
      const payload = await response.json();
      setData(payload);
      if (!payload.ok) setError(payload.message || (vi ? 'Chưa thể đọc thời khóa biểu.' : 'Unable to read timetable.'));
    } catch (reason) {
      setError(reason?.message || String(reason));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(false); }, []);
  useEffect(() => {
    if (!className && data?.classes?.length) setClassName(data.classes[0]);
  }, [data?.classes, className]);

  const entries = data?.entries || [];
  const visible = useMemo(() => entries.filter((entry) => mode === 'teacher'
    ? normalize(entry.teacher) === normalize(teacher)
    : entry.className === className), [entries, mode, teacher, className]);
  const maxPeriod = Math.max(10, ...visible.map((entry) => Number(entry.periodEnd || entry.periodStart || 0)));
  const periods = Array.from({ length: Math.min(maxPeriod, 12) }, (_, index) => index + 1);
  const grouped = useMemo(() => DAYS.map((day) => ({ ...day, entries: visible.filter((entry) => entry.weekday === day.value) })), [visible]);
  const currentLabel = mode === 'teacher' ? teacher : className || (vi ? 'Chọn lớp' : 'Choose class');
  const selectedTeacherMeta = data?.teachers?.find((item) => normalize(item.name) === normalize(teacher));

  return (
    <main className="pek-timetable-page">
      <section className="pek-hero">
        <div className="pek-hero-copy">
          <span className="pek-overline">PEK · LIVE TIMETABLE</span>
          <h1>{vi ? 'Thời khóa biểu PEK' : 'PEK Timetable'}</h1>
          <p>{vi ? 'Xem lịch dạy của giáo viên Tiếng Anh và thời khóa biểu của toàn bộ lớp, được đồng bộ trực tiếp từ hệ thống chuyên môn PEK.' : 'View English teachers and all class schedules synced from the PEK academic system.'}</p>
          <div className="pek-hero-actions">
            <button type="button" className="pek-filled" onClick={() => load(true)} disabled={loading}>↻ {loading ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Làm mới dữ liệu' : 'Refresh')}</button>
            <span className={`pek-live-state ${data?.ok ? 'is-live' : 'is-warning'}`}><i />{data?.ok ? (vi ? 'Dữ liệu trực tiếp' : 'Live data') : (vi ? 'Đang kiểm tra nguồn' : 'Checking source')}</span>
          </div>
        </div>
        <aside className="pek-sync-card">
          <span className="pek-sync-icon">▦</span>
          <div><small>{vi ? 'Đồng bộ gần nhất' : 'Last sync'}</small><strong>{formatSync(data?.fetchedAt)}</strong><p>{data?.cache === 'stale' ? (vi ? 'Đang dùng bản lưu gần nhất' : 'Using last saved copy') : (vi ? 'Nguồn: cm.pek.edu.vn' : 'Source: cm.pek.edu.vn')}</p></div>
        </aside>
      </section>

      <section className="pek-summary-grid">
        <article><span className="tone-blue">👩‍🏫</span><div><strong>6</strong><small>{vi ? 'Giáo viên Tiếng Anh' : 'English teachers'}</small></div></article>
        <article><span className="tone-green">🏫</span><div><strong>{data?.classes?.length || 0}</strong><small>{vi ? 'Lớp được nhận diện' : 'Classes detected'}</small></div></article>
        <article><span className="tone-yellow">📘</span><div><strong>{entries.length}</strong><small>{vi ? 'Tiết học đã đồng bộ' : 'Lessons synced'}</small></div></article>
        <article><span className="tone-red">⏱</span><div><strong>{visible.length}</strong><small>{vi ? 'Tiết trong lịch đang xem' : 'Lessons in current view'}</small></div></article>
      </section>

      {error ? (
        <section className="pek-source-alert" role="status">
          <span>!</span><div><strong>{vi ? 'Chưa đọc được dữ liệu thời khóa biểu' : 'Timetable data unavailable'}</strong><p>{error}</p>{data?.diagnostics ? <small>{vi ? `Đã thử ${data.diagnostics.attempts?.length || 0} nguồn, phát hiện ${data.diagnostics.tables || 0} bảng và ${data.diagnostics.candidates?.length || 0} endpoint liên quan.` : 'Source diagnostics are available.'}</small> : null}</div><button type="button" onClick={() => load(true)}>{vi ? 'Thử lại' : 'Retry'}</button>
        </section>
      ) : null}

      <section className="pek-control-surface">
        <div className="pek-mode-tabs" role="tablist">
          <button type="button" className={mode === 'teacher' ? 'is-active' : ''} onClick={() => setMode('teacher')}>👩‍🏫 {vi ? 'Giáo viên' : 'Teachers'}</button>
          <button type="button" className={mode === 'class' ? 'is-active' : ''} onClick={() => setMode('class')}>🏫 {vi ? 'Lớp học' : 'Classes'}</button>
        </div>
        <div className="pek-view-tabs">
          <button type="button" className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>▦ {vi ? 'Lịch tuần' : 'Week'}</button>
          <button type="button" className={view === 'agenda' ? 'is-active' : ''} onClick={() => setView('agenda')}>☷ {vi ? 'Danh sách' : 'Agenda'}</button>
        </div>
      </section>

      {mode === 'teacher' ? (
        <section className="pek-teacher-strip" aria-label={vi ? 'Giáo viên Tiếng Anh' : 'English teachers'}>
          {TARGET_TEACHERS.map((name, index) => {
            const count = data?.teachers?.find((item) => normalize(item.name) === normalize(name))?.entryCount || 0;
            return <button type="button" key={name} className={teacher === name ? 'is-selected' : ''} onClick={() => setTeacher(name)}><span className={`teacher-avatar tone-${index % 6}`}>{initials(name)}</span><div><strong>{name}</strong><small>{count} {vi ? 'tiết' : 'lessons'}</small></div><i>✓</i></button>;
          })}
        </section>
      ) : (
        <section className="pek-class-picker">
          <div><span>🏫</span><div><small>{vi ? 'Xem thời khóa biểu lớp' : 'Class timetable'}</small><strong>{className || (vi ? 'Chưa có lớp' : 'No class')}</strong></div></div>
          <select value={className} onChange={(event) => setClassName(event.target.value)} disabled={!data?.classes?.length}>
            {(data?.classes || []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </section>
      )}

      <section className="pek-calendar-card">
        <header>
          <div><span className="pek-calendar-mark">▦</span><div><small>{mode === 'teacher' ? (vi ? 'LỊCH GIẢNG DẠY' : 'TEACHING SCHEDULE') : (vi ? 'THỜI KHÓA BIỂU LỚP' : 'CLASS SCHEDULE')}</small><h2>{currentLabel}</h2><p>{mode === 'teacher' && selectedTeacherMeta ? `${selectedTeacherMeta.entryCount} ${vi ? 'tiết được đồng bộ' : 'synced lessons'}` : `${visible.length} ${vi ? 'tiết được đồng bộ' : 'synced lessons'}`}</p></div></div>
          <span className="pek-week-chip">{vi ? 'Thứ Hai – Thứ Bảy' : 'Monday – Saturday'}</span>
        </header>

        {loading && !data ? <div className="pek-loading"><span /><p>{vi ? 'Đang lấy dữ liệu từ PEK…' : 'Loading PEK timetable…'}</p></div> : null}
        {!loading && data?.ok && !visible.length ? <div className="pek-empty"><span>▦</span><h3>{vi ? 'Chưa có tiết học trong lịch này' : 'No lessons in this schedule'}</h3><p>{vi ? 'Nguồn PEK chưa trả về tiết học phù hợp với lựa chọn hiện tại.' : 'PEK has no matching entries for this selection.'}</p></div> : null}

        {data?.ok && visible.length && view === 'week' ? (
          <div className="pek-week-wrap">
            <div className="pek-week-grid" style={{ '--period-count': periods.length }}>
              <div className="pek-grid-corner"><small>{vi ? 'TIẾT' : 'PERIOD'}</small></div>
              {DAYS.map((day) => <div className="pek-day-head" key={day.value}><span>{day.short}</span><strong>{day.label}</strong><small>{visible.filter((entry) => entry.weekday === day.value).length} {vi ? 'tiết' : 'lessons'}</small></div>)}
              {periods.map((period) => (
                <React.Fragment key={period}>
                  <div className="pek-period-cell"><strong>{period}</strong><small>{vi ? 'Tiết' : 'Period'}</small></div>
                  {DAYS.map((day) => {
                    const items = visible.filter((entry) => entry.weekday === day.value && entry.periodStart <= period && entry.periodEnd >= period && entry.periodStart === period);
                    return <div className="pek-schedule-cell" key={`${day.value}-${period}`}>{items.map((entry) => <article key={entry.id} className={`pek-lesson tone-${colorIndex(mode === 'teacher' ? entry.className : entry.teacher)}`}><strong>{entry.subject || (vi ? 'Môn học' : 'Subject')}</strong><span>{mode === 'teacher' ? entry.className : entry.teacher}</span><small>Tiết {entry.periodStart}{entry.periodEnd !== entry.periodStart ? `–${entry.periodEnd}` : ''}{entry.room ? ` · P.${entry.room}` : ''}</small></article>)}</div>;
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}

        {data?.ok && visible.length && view === 'agenda' ? (
          <div className="pek-agenda">
            {grouped.map((day) => <section key={day.value}><header><span>{day.short}</span><div><strong>{day.label}</strong><small>{day.entries.length} {vi ? 'tiết học' : 'lessons'}</small></div></header><div>{day.entries.length ? day.entries.map((entry) => <article key={entry.id}><span className={`agenda-time tone-${colorIndex(entry.subject)}`}>{entry.periodStart}{entry.periodEnd !== entry.periodStart ? `–${entry.periodEnd}` : ''}</span><div><strong>{entry.subject || (vi ? 'Môn học' : 'Subject')}</strong><p>{mode === 'teacher' ? `Lớp ${entry.className}` : entry.teacher}{entry.room ? ` · Phòng ${entry.room}` : ''}</p></div></article>) : <p className="agenda-empty">{vi ? 'Trống lịch' : 'No lessons'}</p>}</div></section>)}
          </div>
        ) : null}
      </section>

      <footer className="pek-data-note"><span>ⓘ</span><p>{vi ? 'Dữ liệu được tải và chuẩn hóa ở máy chủ Brian. Khi PEK tạm thời không phản hồi, ứng dụng sẽ ưu tiên bản đồng bộ gần nhất thay vì tạo dữ liệu giả.' : 'Data is fetched and normalized by Brian server-side. Cached data is used when PEK is temporarily unavailable.'}</p></footer>
    </main>
  );
}
