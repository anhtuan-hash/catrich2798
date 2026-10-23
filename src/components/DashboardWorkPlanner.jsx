import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, GraduationCap, ListChecks, MapPin,
  Search, UsersRound, X,
} from 'lucide-react';
import { dashboardLocalDayKey } from '../utils/dashboardClassification.js';
import './DashboardWorkPlanner.css';

const OPTIONS = [
  ['all', 'Tất cả', 'All', CalendarDays],
  ['teaching', 'Giảng dạy', 'Teaching', GraduationCap],
  ['meeting', 'Họp', 'Meetings', UsersRound],
  ['work', 'Công việc', 'Tasks', ListChecks],
  ['professional', 'Chuyên môn', 'Professional', BookOpen],
];
const ICONS = { teaching: GraduationCap, meeting: UsersRound, work: ListChecks, professional: BookOpen };
const dayStart = (value) => { const d = new Date(value); d.setHours(0, 0, 0, 0); return d; };
const dayShift = (value, n) => { const d = dayStart(value); d.setDate(d.getDate() + n); return d; };
const monthNumber = (d) => d.getFullYear() * 12 + d.getMonth();
const monthDate = (n) => new Date(Math.floor(n / 12), n % 12, 1);
const dateMs = (item) => { const ms = new Date(item?.date).getTime(); return Number.isFinite(ms) ? ms : 0; };

function category(item) {
  const text = [item?.title, item?.description, item?.sourceLabel].filter(Boolean).join(' ').toLocaleLowerCase('vi');
  if (/thao giảng|dự giờ|giảng dạy|tiết dạy|lên lớp|teaching|demo lesson/.test(text)) return 'teaching';
  if (/cuộc họp|họp |hội nghị|hội thảo|meeting|conference|sinh hoạt tổ/.test(text)) return 'meeting';
  if (/chuyên môn|bồi dưỡng|tập huấn|nghiên cứu|professional development|training/.test(text)) return 'professional';
  return 'work';
}
function timeText(item, locale, fallback) {
  const d = new Date(item?.date);
  if (!dateMs(item) || (d.getHours() === 0 && d.getMinutes() === 0)) return fallback;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
}
function minutesText(item, vi) {
  const start = dateMs(item);
  const end = Date.parse(item?.raw?.metadata?.schedule_end_at || '');
  const mins = Math.round((end - start) / 60000);
  return start && Number.isFinite(end) && mins > 0 && mins <= 1440
    ? mins + (vi ? ' phút' : ' min') : '';
}

export default function DashboardWorkPlanner({
  timeline = [], now = new Date(), language = 'vi', loading = false,
  coverage, onOpenFull, onOpenItem,
}) {
  const vi = language !== 'en';
  const locale = vi ? 'vi-VN' : 'en-US';
  const todayKey = dashboardLocalDayKey(now);
  const [selected, setSelected] = useState(() => dayStart(now));
  const [month, setMonth] = useState(() => monthNumber(new Date()));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const selectedKey = dashboardLocalDayKey(selected);
  const isToday = selectedKey === todayKey;
  const firstMonth = monthNumber(now);
  const currentMonth = Math.min(firstMonth + 1, Math.max(firstMonth, month));
  const shownMonth = monthDate(currentMonth);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(shownMonth);
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(selected);
  const cells = useMemo(() => {
    const offset = (shownMonth.getDay() + 6) % 7;
    const first = dayShift(shownMonth, -offset);
    return Array.from({ length: 42 }, (_, i) => dayShift(first, i));
  }, [currentMonth]);
  const events = useMemo(() => (Array.isArray(timeline) ? timeline : [])
    .filter((item) => item && item.date && dateMs(item))
    .sort((a,b) => dateMs(a) - dateMs(b)), [timeline]);
  const byDay = useMemo(() => {
    const map = new Map();
    events.forEach((item) => {
      const key = dashboardLocalDayKey(item.date);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [events]);
  const selectedEvents = useMemo(() =>
    events.filter((item) => dashboardLocalDayKey(item.date) === selectedKey),
  [events, selectedKey]);
  const counts = useMemo(() => {
    const summary = { all: selectedEvents.length, teaching: 0, meeting: 0, work: 0, professional: 0, urgent: 0 };
    selectedEvents.forEach((item) => {
      summary[category(item)] += 1;
      if (!item.done && ['high', 'urgent'].includes(String(item.priority))) summary.urgent++;
    });
    return summary;
  }, [selectedEvents]);
  const shown = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return selectedEvents.filter((item) => (filter === 'all' || category(item) === filter)
      && (!needle || [item.title, item.description, item.sourceLabel, item.owner].some(
        (value) => String(value || '').toLocaleLowerCase('vi').includes(needle))));
  }, [selectedEvents, filter, search]);
  const selectedDateInPast = selected.getTime() < dayStart(now).getTime();
  const featured = selectedDateInPast ? null : selectedEvents.find((item) => !item.done && dateMs(item) >= now.getTime());
  const upcomingMinutes = featured && isToday ? Math.ceil((dateMs(featured) - now.getTime()) / 60000) : null;
  const FeatureIcon = ICONS[category(featured)] || CalendarDays;
  const chooseDay = (d) => { setSelected(dayStart(d)); setMonth(monthNumber(d)); setFilter('all'); };
  const goToToday = () => chooseDay(now);
  // Fill the summary with actually relevant categories instead of prominent zero cards.
  const leadingCategories = OPTIONS.filter(([key]) => key !== 'all')
    .sort((a,b) => counts[b[0]] - counts[a[0]])
    .slice(0, 2);
  const stats = [
    ['all', vi ? 'Tổng hoạt động' : 'Total events', CalendarDays],
    ...leadingCategories.map(([key, label, en, Icon]) => [key, vi ? label : en, Icon]),
    ['urgent', vi ? 'Cần ưu tiên' : 'Priority', AlertTriangle],
  ];
  return <section className="bwp" id="dashboard-calendar"
    aria-label={vi ? 'Lịch làm việc' : 'Work planner'} aria-busy={loading}>
    <header className="bwp-top">
      <div className="bwp-heading">
        <span className="bwp-main-icon"><CalendarDays size={25}/></span>
        <span><small>{vi ? 'KẾ HOẠCH CÔNG VIỆC' : 'WORK PLANNER'}</small>
          <h2>{isToday ? (vi ? 'Lịch làm việc hôm nay' : "Today's work planner") : (vi ? 'Lịch làm việc' : 'Work planner')}</h2>
          <p>{selectedLabel}</p></span>
      </div>
      <div className="bwp-stats">
        {stats.map(([key, title, Icon]) => <div className={'bwp-stat bwp-stat-' + key} key={key}>
          <span><Icon size={20}/></span><div><strong>{counts[key]}</strong><small>{title}</small></div>
        </div>)}
      </div>
      <button type="button" className="bwp-open-all" onClick={onOpenFull}>
        {vi ? 'Xem đầy đủ' : 'Full calendar'} <ArrowRight size={17}/>
      </button>
    </header>
    <div className="bwp-layout">
      <aside className="bwp-sidebar" aria-label={vi ? 'Lịch chọn ngày' : 'Date picker'}>
        <div className="bwp-mini-header">
          <strong>{monthLabel}</strong>
          <div>
            <button type="button" disabled={currentMonth <= firstMonth} aria-label={vi ? 'Tháng trước' : 'Previous month'}
              onClick={() => setMonth((m) => Math.max(firstMonth, m - 1))}><ChevronLeft size={18}/></button>
            <button type="button" disabled={currentMonth >= firstMonth + 1} aria-label={vi ? 'Tháng tới' : 'Next month'}
              onClick={() => setMonth((m) => Math.min(firstMonth + 1, m + 1))}><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="bwp-weekdays" aria-hidden="true">
          {(vi ? ['T2','T3','T4','T5','T6','T7','CN'] : ['Mo','Tu','We','Th','Fr','Sa','Su'])
            .map((d,i) => <span key={i}>{d}</span>)}
        </div>
        <div className="bwp-days">
          {cells.map((d) => {
            const key = dashboardLocalDayKey(d);
            const active = selectedKey === key;
            const count = byDay.get(key) || 0;
            const outside = d.getMonth() !== shownMonth.getMonth();
            return <button type="button" key={key} disabled={outside}
              aria-pressed={active} aria-label={new Intl.DateTimeFormat(locale, {dateStyle:'full'}).format(d) + (count ? ' · ' + count : '')}
              className={'bwp-day' + (active ? ' is-active' : '') + (key === todayKey ? ' is-today' : '') + (outside ? ' is-outside' : '')}
              onClick={() => chooseDay(d)}><span>{d.getDate()}</span>{count ? <i/> : null}</button>;
          })}
        </div>
        <button type="button" className="bwp-jump-today" onClick={goToToday} disabled={isToday}>
          <CalendarDays size={15}/>{vi ? 'Quay về hôm nay' : 'Back to today'}
        </button>
        <div className="bwp-side-card">
          <small>{vi ? 'TỔNG QUAN NGÀY' : 'DAY AT A GLANCE'}</small>
          <strong>{new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric'}).format(selected)}</strong>
          <div><CheckCircle2 size={17}/>{counts.all} {vi ? 'hoạt động đã lên lịch' : 'scheduled events'}</div>
          {coverage?.limited ? <em>{vi ? 'Một số nguồn lịch chưa đồng bộ đầy đủ.' : 'Some sources are incomplete.'}</em> : null}
        </div>
      </aside>
      <div className="bwp-main">
        <div className={'bwp-next' + (featured ? '' : ' is-empty')}>
          <span className="bwp-next-icon">{featured ? <FeatureIcon size={22}/> : <CalendarDays size={22}/>}</span>
          <div>
            <small>{featured ? (isToday ? (vi ? 'TIẾP THEO TRONG NGÀY' : 'UP NEXT TODAY') : (vi ? 'LỊCH NỔI BẬT' : 'FEATURED SCHEDULE')) : (vi ? 'TỔNG QUAN NGÀY' : 'DAILY OVERVIEW')}</small>
            <strong>{featured ? featured.title : (selectedDateInPast ? (vi ? 'Đã qua ngày được chọn' : 'Selected day has passed') : (vi ? 'Không còn hoạt động sắp diễn ra' : 'No upcoming events'))}</strong>
            {featured ? <p><Clock3 size={14}/>{timeText(featured, locale, vi ? 'Cả ngày' : 'All day')}
              {upcomingMinutes !== null && upcomingMinutes > 0 && upcomingMinutes <= 120
                ? <span className="bwp-countdown">{vi ? `Còn ${upcomingMinutes} phút` : `In ${upcomingMinutes} min`}</span> : null}
              <span>{featured.owner || featured.sourceLabel || ''}</span></p> :
              <p>{vi ? 'Sử dụng lịch tháng để xem các hoạt động khác.' : 'Use the calendar to explore other days.'}</p>}
          </div>
          {featured ? <button type="button" onClick={() => onOpenItem?.(featured)}>
            {vi ? 'Xem chi tiết' : 'View details'}<ArrowRight size={16}/>
          </button> : null}
        </div>
        <div className="bwp-toolbar">
          <div className="bwp-filter-group" role="group" aria-label={vi ? 'Bộ lọc lịch' : 'Schedule filters'}>
            {OPTIONS.filter(([key]) => key === 'all' || counts[key] > 0 || filter === key).map(([key,label,en,Icon]) =>
              <button key={key} type="button" aria-pressed={filter===key}
                className={'bwp-tab' + (filter===key?' is-selected':'')}
                onClick={() => setFilter(key)}><Icon size={16}/>{vi?label:en}<b>{counts[key]}</b></button>)}
          </div>
          <label className="bwp-search"><Search size={17}/>
            <span className="bwp-sr-only">{vi ? 'Tìm công việc' : 'Search tasks'}</span>
            <input type="search" value={search} onChange={(e)=>setSearch(e.target.value)}
              placeholder={vi ? 'Tìm công việc…' : 'Search tasks…'}/>
            {search && <button type="button" onClick={() => setSearch('')} aria-label={vi ? 'Xóa tìm kiếm' : 'Clear'}><X size={16}/></button>}
          </label>
        </div>
        <div className="bwp-subheading"><span>{vi ? 'DANH SÁCH HOẠT ĐỘNG' : 'ACTIVITIES'}</span><b>{shown.length}</b></div>
        <div className="bwp-agenda" role="region" aria-label={vi ? 'Danh sách công việc, có thể cuộn để xem thêm' : 'Scrollable schedule list'} tabIndex={shown.length > 4 ? 0 : undefined}>
          {loading && !events.length ? <div className="bwp-empty">{vi ? 'Đang tải lịch làm việc…' : 'Loading schedule…'}</div> :
            shown.length ? shown.map((item,i) => {
              const kind = category(item);
              const RowIcon = ICONS[kind];
              const title = OPTIONS.find((opt)=>opt[0]===kind);
              const urgent = !item.done && ['urgent','high'].includes(String(item.priority));
              const start = dateMs(item);
              const end = Date.parse(item.raw?.metadata?.schedule_end_at || '');
              const active = !item.done && Number.isFinite(end) && start <= now.getTime() && now.getTime() < end;
              const place = String(item.raw?.metadata?.schedule_location || '').trim();
              return <button type="button" className={'bwp-row kind-' + kind + (featured?.id === item.id ? ' is-next' : '')} key={item.id || i}
                onClick={() => onOpenItem?.(item)}>
                <span className="bwp-time"><strong>{timeText(item,locale,vi?'Cả ngày':'All day')}</strong><small>{minutesText(item,vi)}</small></span>
                <span className="bwp-rail"><i/></span>
                <span className="bwp-row-icon"><RowIcon size={20}/></span>
                <span className="bwp-row-copy"><strong>{item.title}</strong>
                  {item.description ? <small className="bwp-description">{item.description}</small> : null}
                  <small className="bwp-meta">{place ? <span><MapPin size={12}/>{place}</span> : null}
                    <span>{item.owner || item.sourceLabel || ''}</span></small></span>
                <span className={'bwp-tag'+(urgent?' priority':active?' active':'')}>
                  {urgent?<AlertTriangle size={14}/>:item.done?<CheckCircle2 size={14}/>:<RowIcon size={14}/>}
                  {urgent ? (vi ? 'Ưu tiên' : 'Priority') : item.done ? (vi ? 'Hoàn tất' : 'Completed') :
                    active ? (vi ? 'Đang diễn ra' : 'In progress') : vi ? title?.[1] : title?.[2]}
                </span>
                <ArrowRight className="bwp-row-arrow" size={16}/>
              </button>;
            }) : <div className="bwp-empty"><CalendarDays size={26}/>
              <strong>{vi ? 'Chưa có hoạt động phù hợp' : 'No matching activities'}</strong>
              <p>{vi ? 'Bạn có thể chọn ngày khác hoặc thay đổi bộ lọc.' : 'Choose another day or filter.'}</p>
              {(filter!=='all'||search) && <button type="button" onClick={()=>{setFilter('all');setSearch('');}}>
                {vi ? 'Xóa bộ lọc' : 'Clear filters'}</button>}
            </div>}
        </div>
      </div>
    </div>
  </section>;
}
