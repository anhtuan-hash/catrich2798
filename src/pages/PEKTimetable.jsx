import React, { useEffect, useMemo, useState } from 'react';
import './PEKTimetable.css';

const PRIORITY_TEACHERS = [
  'Nguyễn Anh Tuấn',
  'Nguyễn Đặng Minh Hoa',
  'Phạm Thị Ngọc Châm',
  'Ngô Thị Mỹ Diệp',
  'Đào Ngọc Nhã',
  'Nguyễn Thị Mỹ Duyên',
];

const DAYS = [
  { value: 2, short: 'T2', label: 'Thứ Hai' },
  { value: 3, short: 'T3', label: 'Thứ Ba' },
  { value: 4, short: 'T4', label: 'Thứ Tư' },
  { value: 5, short: 'T5', label: 'Thứ Năm' },
  { value: 6, short: 'T6', label: 'Thứ Sáu' },
  { value: 7, short: 'T7', label: 'Thứ Bảy' },
];

const PERIODS = Array.from({ length: 10 }, (_, index) => index + 1);

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase() || 'PE';
}

function formatSyncTime(value) {
  if (!value) return 'Chưa đồng bộ';
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch { return String(value); }
}

function Icon({ name }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    class: <><path d="M3 5h18v14H3z"/><path d="M8 9h8M8 13h5"/></>,
    cloud: <><path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.7 11 4 4 0 0 1 17.5 19Z"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    warning: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/></>,
  };
  return <svg className="pek-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SummaryCard({ icon, label, value, tone = 'blue' }) {
  return <article className={`pek-summary-card tone-${tone}`}><span><Icon name={icon}/></span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function EmptyState({ warning, onRefresh }) {
  return (
    <section className="pek-empty-state">
      <span><Icon name="warning"/></span>
      <h3>Chưa đọc được dữ liệu thời khóa biểu</h3>
      <p>{warning || 'Website PEK đã phản hồi nhưng cấu trúc dữ liệu hiện chưa được nhận diện.'}</p>
      <button type="button" className="pek-filled-button" onClick={onRefresh}><Icon name="refresh"/> Thử đồng bộ lại</button>
    </section>
  );
}

function Agenda({ entries, mode }) {
  return (
    <div className="pek-agenda">
      {DAYS.map((day) => {
        const items = entries.filter((entry) => Number(entry.weekday) === day.value).sort((a, b) => a.periodStart - b.periodStart);
        return (
          <section key={day.value} className="pek-agenda-day">
            <header><span>{day.short}</span><div><strong>{day.label}</strong><small>{items.length ? `${items.length} tiết/bài` : 'Không có lịch'}</small></div></header>
            <div className="pek-agenda-list">
              {items.map((entry) => (
                <article key={entry.id}>
                  <time>Tiết {entry.periodStart}{entry.periodEnd > entry.periodStart ? `–${entry.periodEnd}` : ''}</time>
                  <div><strong>{entry.subject}</strong><span>{mode === 'teacher' ? (entry.className || 'Chưa rõ lớp') : (entry.teacherName || 'Chưa rõ giáo viên')}</span>{entry.room ? <small>Phòng {entry.room}</small> : null}</div>
                </article>
              ))}
              {!items.length ? <p className="pek-agenda-empty">Trống lịch</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WeekBoard({ entries, mode }) {
  const events = entries.filter((entry) => entry.weekday >= 2 && entry.weekday <= 7 && entry.periodStart >= 1 && entry.periodStart <= 10);
  return (
    <div className="pek-week-scroll">
      <div className="pek-week-board">
        <div className="pek-grid-corner">Tiết</div>
        {DAYS.map((day) => <div className="pek-day-heading" key={day.value}><span>{day.short}</span><strong>{day.label}</strong></div>)}
        {PERIODS.map((period) => <div className="pek-period-label" key={`label-${period}`} style={{ gridRow: period + 1 }}><strong>{period}</strong><small>Tiết</small></div>)}
        {PERIODS.flatMap((period) => DAYS.map((day, dayIndex) => <div key={`${period}-${day.value}`} className="pek-grid-cell" style={{ gridColumn: dayIndex + 2, gridRow: period + 1 }}/>))}
        {events.map((entry, index) => {
          const dayIndex = DAYS.findIndex((day) => day.value === Number(entry.weekday));
          const span = Math.max(1, Math.min(11 - entry.periodStart, (entry.periodEnd || entry.periodStart) - entry.periodStart + 1));
          return (
            <article
              key={`${entry.id}-${index}`}
              className={`pek-event-card tone-${(dayIndex % 4) + 1}`}
              style={{ gridColumn: dayIndex + 2, gridRow: `${entry.periodStart + 1} / span ${span}` }}
              title={`${entry.subject} · ${entry.className || entry.teacherName}`}
            >
              <strong>{entry.subject}</strong>
              <span>{mode === 'teacher' ? (entry.className || 'Chưa rõ lớp') : (entry.teacherName || 'Chưa rõ giáo viên')}</span>
              <small>Tiết {entry.periodStart}{entry.periodEnd > entry.periodStart ? `–${entry.periodEnd}` : ''}{entry.room ? ` · P.${entry.room}` : ''}</small>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function PEKTimetable({ language = 'vi' }) {
  const vi = language === 'vi';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('teacher');
  const [selectedTeacher, setSelectedTeacher] = useState(PRIORITY_TEACHERS[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [view, setView] = useState('week');

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/pek-timetable${refresh ? '?refresh=1&debug=1' : ''}`, { headers: { accept: 'application/json' } });
      const payload = await response.json();
      setData(payload);
      if (!response.ok && !payload.entries?.length) setError(payload.message || payload.warning || 'Không thể đồng bộ dữ liệu PEK.');
    } catch (loadError) {
      setError(loadError.message || 'Không thể kết nối API thời khóa biểu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(false); }, []);

  const entries = data?.entries || [];
  const classes = data?.classes || [];
  const activeEntries = useMemo(() => {
    if (mode === 'teacher') return entries.filter((entry) => normalize(entry.teacherName) === normalize(selectedTeacher));
    if (selectedClass === 'all') return [];
    return entries.filter((entry) => normalize(entry.className) === normalize(selectedClass));
  }, [entries, mode, selectedTeacher, selectedClass]);

  const stats = useMemo(() => {
    const uniquePeriods = new Set(activeEntries.map((entry) => `${entry.weekday}-${entry.periodStart}-${entry.periodEnd}`));
    const days = new Set(activeEntries.map((entry) => entry.weekday));
    const rooms = new Set(activeEntries.map((entry) => entry.room).filter(Boolean));
    return { lessons: uniquePeriods.size, days: days.size, rooms: rooms.size };
  }, [activeEntries]);

  const teacherStats = useMemo(() => PRIORITY_TEACHERS.map((name) => ({
    name,
    count: entries.filter((entry) => normalize(entry.teacherName) === normalize(name)).length,
  })), [entries]);

  return (
    <div className="page pek-timetable-page">
      <section className="pek-hero">
        <div className="pek-hero-copy">
          <span className="pek-eyebrow"><Icon name="cloud"/> PEK LIVE TIMETABLE</span>
          <h1>{vi ? 'Thời khóa biểu PEK' : 'PEK Timetable'}</h1>
          <p>{vi ? 'Xem lịch dạy của giáo viên Tiếng Anh và thời khóa biểu các lớp, đồng bộ trực tiếp từ hệ thống chuyên môn Pétrus Ký.' : 'View English teachers and class schedules synced from the Pétrus Ký professional portal.'}</p>
          <div className="pek-hero-actions">
            <button type="button" className="pek-filled-button" onClick={() => load(true)} disabled={refreshing}><Icon name="refresh"/>{refreshing ? 'Đang đồng bộ…' : 'Làm mới dữ liệu'}</button>
            <span className={`pek-sync-state ${data?.ok ? 'is-live' : 'is-warning'}`}><i/>{data?.stale ? 'Đang dùng bản lưu' : data?.ok ? 'Dữ liệu trực tiếp' : 'Chờ nhận diện dữ liệu'}</span>
          </div>
        </div>
        <div className="pek-hero-visual" aria-hidden="true">
          <div className="pek-calendar-art"><span>THÁNG 7</span><strong>24</strong><small>Thứ Sáu</small></div>
          <div className="pek-mini-event one"><i/>Tiếng Anh · 12.1</div>
          <div className="pek-mini-event two"><i/>Reading · 11.6</div>
        </div>
      </section>

      <section className="pek-overview-row">
        <SummaryCard icon="person" label="Giáo viên Tiếng Anh" value={PRIORITY_TEACHERS.length} tone="blue"/>
        <SummaryCard icon="class" label="Lớp đã nhận diện" value={classes.length} tone="green"/>
        <SummaryCard icon="calendar" label="Mục thời khóa biểu" value={entries.length} tone="yellow"/>
        <SummaryCard icon="cloud" label="Đồng bộ gần nhất" value={data?.fetchedAt ? formatSyncTime(data.fetchedAt).split(' ')[1] || 'Mới' : '—'} tone="red"/>
      </section>

      <section className="pek-workspace">
        <header className="pek-workspace-header">
          <div className="pek-mode-tabs" role="tablist">
            <button type="button" className={mode === 'teacher' ? 'is-active' : ''} onClick={() => setMode('teacher')}><Icon name="person"/> Giáo viên</button>
            <button type="button" className={mode === 'class' ? 'is-active' : ''} onClick={() => setMode('class')}><Icon name="class"/> Lớp học</button>
          </div>
          <div className="pek-view-switch">
            <button type="button" className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>Lịch tuần</button>
            <button type="button" className={view === 'agenda' ? 'is-active' : ''} onClick={() => setView('agenda')}>Danh sách</button>
          </div>
        </header>

        {mode === 'teacher' ? (
          <div className="pek-teacher-strip">
            {teacherStats.map((teacher, index) => (
              <button key={teacher.name} type="button" className={selectedTeacher === teacher.name ? 'is-active' : ''} onClick={() => setSelectedTeacher(teacher.name)}>
                <span className={`avatar tone-${(index % 4) + 1}`}>{initials(teacher.name)}</span>
                <div><strong>{teacher.name}</strong><small>{teacher.count ? `${teacher.count} mục lịch` : 'Chưa có dữ liệu'}</small></div>
                <Icon name="chevron"/>
              </button>
            ))}
          </div>
        ) : (
          <div className="pek-class-toolbar">
            <label><span>Chọn lớp</span><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}><option value="all">Tất cả các lớp</option>{classes.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
            <small>{classes.length ? `${classes.length} lớp được lấy tự động từ PEK` : 'Danh sách lớp sẽ xuất hiện sau khi nguồn PEK được nhận diện.'}</small>
          </div>
        )}

        {loading ? <div className="pek-loading"><span/><p>Đang kết nối hệ thống chuyên môn PEK…</p></div> : null}
        {!loading && (error || (!data?.ok && !entries.length)) ? <EmptyState warning={error || data?.warning} onRefresh={() => load(true)}/> : null}

        {!loading && data?.ok && mode === 'class' && selectedClass === 'all' ? (
          <section className="pek-class-directory">
            <header><div><span className="pek-eyebrow">DANH SÁCH TỰ ĐỘNG</span><h2>Toàn bộ các lớp</h2></div><small>{classes.length} lớp</small></header>
            <div>{classes.map((className) => {
              const count = entries.filter((entry) => normalize(entry.className) === normalize(className)).length;
              return <button type="button" key={className} onClick={() => setSelectedClass(className)}><span>{className}</span><small>{count} mục lịch</small><Icon name="chevron"/></button>;
            })}</div>
          </section>
        ) : null}

        {!loading && data?.ok && (mode === 'teacher' || selectedClass !== 'all') ? (
          <section className="pek-schedule-section">
            <header>
              <div><span className="pek-eyebrow">LỊCH HỌC HÀNG TUẦN</span><h2>{mode === 'teacher' ? selectedTeacher : `Lớp ${selectedClass}`}</h2><p>Cập nhật: {formatSyncTime(data.fetchedAt)}{data.cached ? ' · Dữ liệu cache' : ''}</p></div>
              <div className="pek-inline-stats"><span><strong>{stats.lessons}</strong> mục lịch</span><span><strong>{stats.days}</strong> ngày có lịch</span><span><strong>{stats.rooms}</strong> phòng</span></div>
            </header>
            {activeEntries.length ? (view === 'week' ? <WeekBoard entries={activeEntries} mode={mode}/> : <Agenda entries={activeEntries} mode={mode}/>) : <div className="pek-no-schedule"><Icon name="calendar"/><h3>Chưa có lịch cho lựa chọn này</h3><p>Dữ liệu nguồn đã đồng bộ nhưng chưa tìm thấy tên tương ứng. Hãy thử làm mới hoặc chọn giáo viên/lớp khác.</p></div>}
          </section>
        ) : null}
      </section>

      {data?.sourceUrl ? <footer className="pek-source-footer"><Icon name="cloud"/><div><strong>Nguồn dữ liệu</strong><span>{data.sourceUrl}</span></div><small>Brian chỉ đọc dữ liệu công khai và lưu cache tối đa 30 phút.</small></footer> : null}
    </div>
  );
}
