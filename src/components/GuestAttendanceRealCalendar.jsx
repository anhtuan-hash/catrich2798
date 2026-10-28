import React, { useMemo } from 'react';
import { CalendarDays, CheckCircle2, Clock3, GraduationCap, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { isExtraClassScheduledOnDate } from '../utils/extraClassSchedule2026.js';
import './GuestAttendanceRealCalendar.css';

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (year, month, day) => year + '-' + pad(month + 1) + '-' + pad(day);
const monthIndex = (key) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
const monthStart = (index) => new Date(Date.UTC(Math.floor(index / 12), index % 12, 1, 12));
const localToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type)?.value || '';
  return part('year') + '-' + part('month') + '-' + part('day');
};
const clean = (text) => String(text || '').trim().toLocaleLowerCase('vi');

function statusFor(item, date, today) {
  if (item?.status === 'cancelled') return 'cancelled';
  if (item?.status === 'completed') return 'completed';
  if (item?.status) return 'recorded';
  return date > today ? 'future' : 'missing';
}
function statusLabel(status, en) {
  if (status === 'completed') return en ? 'Attendance confirmed' : 'Đã điểm danh';
  if (status === 'cancelled') return en ? 'Cancelled' : 'Đã hủy';
  if (status === 'recorded') return en ? 'Recorded' : 'Đã ghi nhận';
  if (status === 'future') return en ? 'Scheduled' : 'Theo lịch';
  return en ? 'Not yet recorded' : 'Chưa điểm danh';
}
const classTypeLabel = (type, en) =>
  type === 'gifted' ? (en ? 'Advanced class' : 'Bồi dưỡng HSG')
    : type === 'remedial' ? (en ? 'Remedial class' : 'Phụ đạo') : (type || '');

function buildCalendar(sessions, classes, today) {
  const byDate = new Map();
  const get = (date) => {
    if (!byDate.has(date)) byDate.set(date, []);
    return byDate.get(date);
  };
  const recorded = new Map();
  sessions.filter((item) => item.entry_date && item.title).forEach((item) => {
    const key = item.entry_date + '::' + clean(item.title);
    if (!recorded.has(key)) recorded.set(key, []);
    recorded.get(key).push(item);
  });
  const earliest = sessions.map((item) => item.entry_date).filter(Boolean).sort()[0] || today;
  const first = Math.min(monthIndex(earliest), monthIndex(today));
  const last = monthIndex(today) + 1;
  const months = [];
  for (let month = Math.max(first, last - 11); month <= last; month++) {
    const start = monthStart(month);
    const year = start.getUTCFullYear();
    const monthNo = start.getUTCMonth();
    const length = new Date(Date.UTC(year, monthNo + 1, 0)).getUTCDate();
    const leading = (start.getUTCDay() + 6) % 7;
    const days = [];
    for (let day = 1; day <= length; day++) {
      const date = dateKey(year, monthNo, day);
      const activeClasses = classes.filter((row) => row.active !== false && isExtraClassScheduledOnDate(row, date));
      const rows = activeClasses.map((row) => {
        const key = date + '::' + clean(row.class_name);
        const matched = recorded.get(key)?.shift() || null;
        return {
          key: 'class:' + row.class_ref + ':' + date,
          className: row.class_name, subject: row.subject,
          type: row.class_type, room: matched?.room_label || row.room || '',
          time: matched?.time_label || row.time_range || '',
          status: statusFor(matched, date, today),
          count: matched && matched.status === 'completed' ? [matched.present_count, matched.total_count] : null,
          source: 'timetable',
        };
      });
      const orphan = sessions.filter((item) => item.entry_date === date)
        .filter((item) => !rows.some((row) => clean(row.className) === clean(item.title)))
        .map((item) => ({
          key: 'record:' + item.entry_id,
          className: item.title, subject: item.subtitle || '',
          type: item.tag, room: item.room_label || '', time: item.time_label || '',
          status: statusFor(item, date, today),
          count: item.status === 'completed' ? [item.present_count, item.total_count] : null,
          source: 'session',
        }));
      rows.push(...orphan);
      const counts = {
        completed: rows.filter((row) => row.status === 'completed').length,
        cancelled: rows.filter((row) => row.status === 'cancelled').length,
        missing: rows.filter((row) => row.status === 'missing').length,
        future: rows.filter((row) => row.status === 'future').length,
      };
      get(date).push(...rows);
      days.push({ date, day, rows, counts });
    }
    months.push({ key: dateKey(year, monthNo, 1).slice(0, 7), year, monthNo, leading, days });
  }
  return months;
}

export default function GuestAttendanceRealCalendar({ sessions = [], classes = [], language = 'vi', loading = false, unavailable = false }) {
  const en = language === 'en';
  const today = localToday();
  const months = useMemo(() => buildCalendar(sessions, classes, today), [sessions, classes, today]);
  const dayNames = en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return <section className="brian-guest-attendance-calendar" aria-label={en ? 'Actual attendance calendar' : 'Lịch điểm danh thực tế'} data-real-attendance-calendar="true">
    <header className="brian-guest-attendance-calendar__head">
      <div className="brian-guest-attendance-calendar__eyebrow"><CalendarDays size={17}/> {en ? 'LIVE DATA · READ ONLY' : 'DỮ LIỆU THỰC · CHỈ XEM'}</div>
      <h2>{en ? 'Actual attendance calendar' : 'Lịch điểm danh thực tế'}</h2>
      <p>{en ? 'Actual class timetables matched with confirmed or cancelled attendance sessions. Scroll through months and each day; no clicks required.' :
        'Lịch học của các lớp đang hoạt động, đối chiếu với từng phiên điểm danh đã chốt hoặc đã hủy. Kéo xuống để xem từng tháng và từng buổi, không cần nhấp chọn.'}</p>
      <div className="brian-guest-attendance-calendar__legend">
        <span className="is-completed"><CheckCircle2 size={14}/>{en ? 'Confirmed' : 'Đã điểm danh'}</span>
        <span className="is-missing"><Clock3 size={14}/>{en ? 'Unrecorded' : 'Chưa điểm danh'}</span>
        <span className="is-cancelled"><XCircle size={14}/>{en ? 'Cancelled' : 'Đã hủy'}</span>
        <span className="is-future"><CalendarDays size={14}/>{en ? 'Scheduled' : 'Theo lịch'}</span>
      </div>
    </header>
    {loading && <p className="brian-guest-attendance-calendar__message">{en ? 'Loading published timetable…' : 'Đang tải lịch điểm danh công khai…'}</p>}
    {unavailable && <p className="brian-guest-attendance-calendar__message">{en ? 'Timetable data is temporarily unavailable.' : 'Tạm thời chưa tải được lịch học công khai.'}</p>}
    {!loading && !unavailable && <>
      <div className="brian-guest-attendance-calendar__months">
        {months.map((month) => {
          const total = month.days.reduce((sum, d) => sum + d.rows.length, 0);
          const completed = month.days.reduce((sum, d) => sum + d.counts.completed, 0);
          const title = new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(monthStart(month.year * 12 + month.monthNo));
          return <section className="brian-guest-attendance-calendar__month" key={month.key}>
            <div className="brian-guest-attendance-calendar__month-title">
              <h3>{title}</h3>
              <span>{total} {en ? 'scheduled/recorded sessions' : 'lượt học theo lịch / đã ghi nhận'}</span>
              <span className="is-done">{completed} {en ? 'confirmed' : 'đã điểm danh'}</span>
            </div>
            <div className="brian-guest-attendance-calendar__grid" aria-label={title}>
              {dayNames.map((day, i) => <span key={'weekday:'+i} className="brian-guest-attendance-calendar__weekday">{day}</span>)}
              {Array.from({length:month.leading},(_,i)=><span key={'blank:'+i} className="brian-guest-attendance-calendar__blank"/>)}
              {month.days.map((day) => <div className={'brian-guest-attendance-calendar__day' + (day.date === today ? ' is-today' : '') + (!day.rows.length ? ' is-empty' : '')}
                key={day.date} aria-label={day.date + ': ' + day.rows.length}>
                <strong>{day.day}</strong>
                {day.rows.length > 0 && <div className="brian-guest-attendance-calendar__day-body">
                  <small>{day.rows.length} {en ? 'classes' : 'lớp'}</small>
                  <div className="brian-guest-attendance-calendar__day-status">
                    {day.counts.completed > 0 && <span className="is-completed">✓ {day.counts.completed}</span>}
                    {day.counts.missing > 0 && <span className="is-missing">• {day.counts.missing}</span>}
                    {day.counts.cancelled > 0 && <span className="is-cancelled">× {day.counts.cancelled}</span>}
                    {day.counts.future > 0 && <span className="is-future">◷ {day.counts.future}</span>}
                  </div>
                </div>}
              </div>)}
            </div>
            <div className="brian-guest-attendance-calendar__month-agenda">
              <h4><GraduationCap size={18}/>{en ? 'Daily class-by-class timetable' : 'Chi tiết lịch học và điểm danh theo ngày'}</h4>
              {month.days.filter((d)=>d.rows.length).map((day)=><article className="brian-guest-attendance-calendar__agenda-day" key={'agenda:'+day.date}>
                <div className="brian-guest-attendance-calendar__agenda-date">
                  <strong>{day.day}/{pad(month.monthNo+1)}</strong>
                  <span>{day.rows.length} {en ? 'classes' : 'lớp'}</span>
                </div>
                <div className="brian-guest-attendance-calendar__agenda-rows">
                  {day.rows.map((row)=><div className="brian-guest-attendance-calendar__agenda-row" key={row.key}>
                    <div><strong>{row.className}</strong><small>{classTypeLabel(row.type,en)}{row.subject?' · '+row.subject:''}</small></div>
                    <div className="brian-guest-attendance-calendar__agenda-meta">
                      {row.room && <span><MapPin size={12}/>{row.room}</span>}
                      {row.time && <span><Clock3 size={12}/>{row.time}</span>}
                    </div>
                    <div className={'brian-guest-attendance-calendar__status is-'+row.status}>
                      {statusLabel(row.status,en)}
                      {row.count && <small>{Number(row.count[0] || 0)}/{Number(row.count[1] || 0)} {en ? 'present' : 'có mặt'}</small>}
                    </div>
                  </div>)}
                </div>
              </article>)}
            </div>
          </section>;
        })}
      </div>
      <footer className="brian-guest-attendance-calendar__foot"><ShieldCheck size={16}/>{en ? 'Real timetable and attendance totals only. No student roster or individual status is published.' :
        'Chỉ công khai lịch học và tổng hợp điểm danh thực tế. Không hiển thị danh sách hoặc trạng thái điểm danh từng học sinh.'}</footer>
    </>}
  </section>;
}
