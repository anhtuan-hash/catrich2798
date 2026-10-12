import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import { getDashboardMonthGrid } from '../utils/dashboardV3Selectors.js';
import { openDashboardTarget } from '../utils/dashboardAggregator.js';
import { dashboardLocalDayKey } from '../utils/dashboardClassification.js';

export default function DashboardMonthCalendar({ timeline = [], now = new Date(), language = 'vi', coverage }) {
  const vi = language === 'vi';
  const [offset, setOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const locale = vi ? 'vi-VN' : 'en-US';
  const cells = useMemo(() => getDashboardMonthGrid(now, offset, timeline), [now, offset, timeline]);
  const first = cells.find(cell => cell.inMonth);
  const activeKey = cells.some(c=>c.key===selectedKey && c.inMonth) ? selectedKey
    : offset === 0 ? dashboardLocalDayKey(now) : first?.key;
  const activeEvents = cells.find(c=>c.key===activeKey)?.events || [];
  const title = first ? new Intl.DateTimeFormat(locale, {month: 'long',year:'numeric'}).format(first.date) : '';
  const dayNames = vi ? ['T2','T3','T4','T5','T6','T7','CN'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return <section className="gd-v3-month" aria-label={vi ? 'Lịch tháng' : 'Month calendar'}>
    <div className="gd-v3-month-toolbar">
      <div><CalendarDays size={19}/><strong>{title}</strong></div>
      <div className="gd-v3-month-nav">
        <button type="button" aria-label={vi ? 'Tháng trước' : 'Previous month'} disabled={offset===0} onClick={()=>{setOffset(0);setSelectedKey('');}}><ArrowLeft size={18}/></button>
        <button type="button" aria-label={vi ? 'Tháng tiếp theo' : 'Next month'} disabled={offset===1} onClick={()=>{setOffset(1);setSelectedKey('');}}><ArrowRight size={18}/></button>
      </div>
    </div>
    <div className="gd-v3-month-grid" role="group" aria-label={title}>
      {dayNames.map(d=><span className="gd-v3-month-weekday" key={d}>{d}</span>)}
      {cells.map(cell=><button type="button" key={cell.key}
        disabled={!cell.inMonth} aria-pressed={activeKey===cell.key} aria-label={new Intl.DateTimeFormat(locale,{weekday:'long',day:'2-digit',month:'long'}).format(cell.date)+', '+cell.events.length+' '+(vi?'sự kiện':'events')}
        className={'gd-v3-month-cell'+(cell.inMonth?' is-current-month':'')+(cell.today?' is-today':'')+(activeKey===cell.key?' is-selected':'')}
        onClick={()=>setSelectedKey(cell.key)}>
        <span>{cell.date.getDate()}</span>{cell.events.length>0?<b>{Math.min(cell.events.length,99)}</b>:null}
      </button>)}
    </div>
    <div className="gd-v3-month-agenda">
      <strong>{activeKey ? new Intl.DateTimeFormat(locale,{weekday:'long',day:'2-digit',month:'long'}).format(new Date(activeKey+'T12:00:00')) : ''}</strong>
      {activeEvents.length ? activeEvents.map(item=><button key={item.id} type="button" onClick={()=>openDashboardTarget(item)}>
        <span>{item.title}</span><ArrowRight size={15}/>
      </button>) : <p>{vi ? 'Không có sự kiện trong dữ liệu đã tải.' : 'No events in loaded data.'}</p>}
    </div>
    {coverage?.limited ? <p className="gd-v3-month-caveat">{vi ? 'Nguồn lịch có thể chưa trả đủ sự kiện.' : 'Calendar source may have incomplete coverage.'}</p> : null}
  </section>;
}
