import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, ClipboardCopy, Download, Layers3, ListTodo, RefreshCw, ShieldAlert } from 'lucide-react';
import { buildDashboardWeek, buildDashboardWeekICS, buildDashboardWeekText } from '../utils/dashboardV32Planning.js';

const WORDS = {
  vi: {
    eyebrow:'WEEKLY PLANNING DOCK', title:'Kế hoạch tuần này',
    sub:'Chọn ngày để xem lịch chi tiết ở khu vực duy nhất bên dưới.',
    events:'Sự kiện', tasks:'Việc đến hạn', view:'Xem trong ứng dụng', none:'Không có nội dung trong dữ liệu đã tải.',
    export:'Xuất lịch', copy:'Sao chép kế hoạch', copied:'Đã sao chép', failed:'Không thể sao chép — kiểm tra quyền clipboard.',
    downloaded:'Đã tạo tệp lịch từ các sự kiện đang hiển thị.', noExport:'Chưa có sự kiện để xuất.',
    limited:'Một số nguồn dữ liệu chưa đầy đủ. Các con số chỉ phản ánh bản ghi đã tải.',
    loading:'Đang cập nhật...', refreshed:'Dữ liệu lúc', more:'Xem tất cả', fewer:'Thu gọn', openSchedule:'Xem lịch chi tiết',
  },
  en: {
    eyebrow:'WEEKLY PLANNING DOCK', title:'This week at a glance', sub:'Select a day to see its details in the single schedule below.',
    events:'Events', tasks:'Tasks due', view:'Open in app', none:'No entries in loaded data.',
    export:'Export calendar', copy:'Copy plan', copied:'Copied', failed:'Unable to copy — check clipboard permissions.',
    downloaded:'Calendar generated from the currently loaded events.', noExport:'No events available to export.',
    limited:'Some sources may be incomplete. Counts describe loaded records only.',
    loading:'Updating...', refreshed:'Data from', more:'Show all', fewer:'Show less', openSchedule:'View detailed schedule',
  },
};
const dateLabel=(date,language,opts)=>new Intl.DateTimeFormat(language==='vi'?'vi-VN':'en-US',opts).format(date);
export default function DashboardWeeklyPlanner({ timeline = [], attention = [], snapshot, now = new Date(), language = 'vi', loading = false, onRefresh, onSelectDay }) {
  const t = WORDS[language] || WORDS.vi;
  const [selectedKey, setSelectedKey] = useState('');
  const [feedback, setFeedback] = useState('');
  const days = useMemo(()=>buildDashboardWeek(timeline,attention,now),[timeline,attention,now]);
  const activeKey = days.some(day=>day.key===selectedKey) ? selectedKey : days[0]?.key;
  const selected = days.find(day=>day.key===activeKey) || days[0];
  const events = days.reduce((sum, day)=>sum+day.events.length,0);
  const tasks = days.reduce((sum, day)=>sum+day.tasks.length,0);
  const hasLimitedData = Boolean(snapshot?.coverageLimited || snapshot?.sourceErrors?.length);
  const stamp = snapshot?.generatedAt && !Number.isNaN(new Date(snapshot.generatedAt).getTime())
    ? dateLabel(new Date(snapshot.generatedAt),language,{hour:'2-digit',minute:'2-digit'}) : '—';
  async function copyPlan() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(buildDashboardWeekText(days,language));
      setFeedback(t.copied);
    } catch { setFeedback(t.failed); }
  }
  function downloadCalendar() {
    if(!events){setFeedback(t.noExport);return;}
    const blob = new Blob([buildDashboardWeekICS(days,now)],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='BRIAN-week-'+days[0].key+'.ics';
    document.body.appendChild(link);
    link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setFeedback(t.downloaded);
  }
  return <section className="gd-v32-planner" aria-label={t.title} data-dashboard-weekly-planner="true">
    <div className="gd-v32-planner-head">
      <div className="gd-v32-planner-brand">
        <div className="gd-v32-planner-symbol" aria-hidden="true"><Layers3 size={24}/></div>
        <div><span className="gd-v32-planner-eyebrow">{t.eyebrow}</span><h2>{t.title}</h2><p>{t.sub}</p></div>
      </div>
      <div className="gd-v32-planner-actions">
        <button type="button" onClick={copyPlan} className="gd-v32-copy" disabled={loading}><ClipboardCopy size={16}/>{t.copy}</button>
        <button type="button" onClick={downloadCalendar} className="gd-v32-export" disabled={loading || events===0}><Download size={16}/>{t.export}</button>
      </div>
    </div>
    <div className="gd-v32-planner-meta">
      <div className="gd-v32-planner-metrics">
        <span><CalendarDays size={15}/><strong>{events}</strong> {t.events.toLowerCase()}</span>
        <span><ListTodo size={15}/><strong>{tasks}</strong> {t.tasks.toLowerCase()}</span>
      </div>
      <div className="gd-v32-planner-fresh">
        <span className={hasLimitedData?'is-partial':'is-current'} aria-hidden="true"/>
        <small>{loading?t.loading:t.refreshed+' '+stamp}</small>
        <button type="button" disabled={loading} aria-label={language==='vi'?'Làm mới kế hoạch':'Refresh plan'} onClick={()=>onRefresh?.()}><RefreshCw size={15}/></button>
      </div>
    </div>
    {hasLimitedData ? <div className="gd-v32-planner-warning" role="status"><ShieldAlert size={16}/>{t.limited}</div> : null}
    <div className="gd-v32-planner-days" role="group" aria-label={t.title}>
      {days.map(day=>{
        const selectedDay = day.key===activeKey;
        const weekday=dateLabel(day.date,language,{weekday:'short'});
        return <button type="button" key={day.key} className={'gd-v32-planner-day'+(selectedDay?' is-selected':'')+(day.offset===0?' is-today':'')}
          aria-pressed={selectedDay} aria-label={dateLabel(day.date,language,{weekday:'long',day:'2-digit',month:'long'})}
          onClick={()=>{setSelectedKey(day.key);setFeedback('');onSelectDay?.(day.key);}}>
          <span className="gd-v32-weekday">{weekday}</span><strong>{day.date.getDate()}</strong>
          <span className="gd-v32-day-dots"><i className={day.events.length?'has-events':''}/><i className={day.tasks.length?'has-tasks':''}/></span>
          <small>{day.events.length+day.tasks.length}</small>
        </button>;
      })}
    </div>
    <div className="gd-v32-planner-body gd-u34-week-summary">
      <div className="gd-v32-planner-day-info">
        <span>{language==='vi'?'NGÀY ĐÃ CHỌN':'SELECTED DAY'}</span>
        <h3>{selected ? dateLabel(selected.date,language,{weekday:'long',day:'2-digit',month:'long'}) : '—'}</h3>
        <p>{selected?.events.length||0} {t.events.toLowerCase()} · {selected?.tasks.length||0} {t.tasks.toLowerCase()}</p>
      </div>
      <button type="button" className="gd-u34-open-schedule" onClick={()=>onSelectDay?.(activeKey)}>
        {t.openSchedule} <ArrowUpRight size={17}/>
      </button>
    </div>
    {feedback ? <div className="gd-v32-planner-feedback" role="status">{feedback}</div> : null}
  </section>;
}
