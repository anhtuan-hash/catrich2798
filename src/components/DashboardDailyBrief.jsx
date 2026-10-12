import React, { useMemo } from 'react';
import { ArrowUpRight, BellRing, CalendarClock, CheckCheck, Sparkles, Target } from 'lucide-react';
import { buildDashboardBrief } from '../utils/dashboardV3Selectors.js';
import { dashboardDueLabel, openDashboardTarget } from '../utils/dashboardAggregator.js';

export default function DashboardDailyBrief({ snapshot, now = new Date(), language = 'vi' }) {
  const vi = language === 'vi';
  const brief = useMemo(() => buildDashboardBrief(snapshot, now), [snapshot, now]);
  const nextLabel = brief.next ? new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(brief.next.date)) : null;
  return <section className="gd-v3-brief" aria-label={vi ? 'Tóm tắt hôm nay' : 'Daily brief'}>
    <div className="gd-v3-brief-lead">
      <span className="gd-v3-brief-eyebrow"><Sparkles size={15} /> {vi ? 'DAILY BRIEF · TRỌNG TÂM HÔM NAY' : 'DAILY BRIEF · YOUR FOCUS'}</span>
      <h2>{brief.overdue
        ? (vi ? `${brief.overdue} công việc cần xử lý quá hạn` : `${brief.overdue} overdue tasks to resolve`)
        : brief.today ? (vi ? `${brief.today} công việc cần hoàn thành hôm nay` : `${brief.today} tasks due today`)
        : (vi ? 'Sẵn sàng cho một ngày hiệu quả' : 'Ready for a focused day')}</h2>
      <p>{vi ? 'Tóm tắt tự động từ dữ liệu BRIAN, không sử dụng AI.' : 'A rule-based summary from your BRIAN workspace.'}
        {brief.limited ? (vi ? ' Dữ liệu nguồn có thể chưa đầy đủ.' : ' Source data may be incomplete.') : ''}</p>
      <div className="gd-v3-brief-metrics">
        <span><Target size={16} /> <b>{brief.urgent}</b> {vi ? 'ưu tiên cao' : 'high priority'}</span>
        <span><CheckCheck size={16} /> <b>{brief.today}</b> {vi ? 'đến hạn hôm nay' : 'due today'}</span>
      </div>
    </div>
    <div className="gd-v3-brief-focus">
      <div className="gd-v3-brief-list-title"><Target size={17} />{vi ? 'Nên tập trung trước' : 'Prioritize first'}</div>
      {brief.focus.length ? brief.focus.map(item => <button className="gd-v3-brief-focus-item" type="button" key={item.id} onClick={() => openDashboardTarget(item)}>
        <span><strong>{item.title}</strong><small>{dashboardDueLabel(item.date, item.done, language, now)}</small></span><ArrowUpRight size={16}/>
      </button>) : <p className="gd-v3-brief-none"><CheckCheck size={18}/>{vi ? 'Không có nhiệm vụ tồn đọng.' : 'No outstanding tasks.'}</p>}
      {brief.next ? <button type="button" className="gd-v3-brief-next" onClick={() => openDashboardTarget(brief.next)}>
        <CalendarClock size={16}/><span>{vi ? 'Sắp diễn ra' : 'Up next'}: {brief.next.title}</span><b>{nextLabel}</b>
      </button> : <div className="gd-v3-brief-next"><BellRing size={16}/><span>{vi ? 'Không có sự kiện sắp tới.' : 'No upcoming events.'}</span></div>}
    </div>
  </section>;
}
