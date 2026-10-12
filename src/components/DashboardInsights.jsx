import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Database } from 'lucide-react';
import { buildDashboardBrief } from '../utils/dashboardV3Selectors.js';

export default function DashboardInsights({ snapshot, now = new Date(), language = 'vi' }) {
  const vi = language === 'vi';
  const stats = snapshot?.stats || {};
  const brief = useMemo(() => buildDashboardBrief(snapshot, now), [snapshot, now]);
  const open = Number(stats.openTasks || 0), completed = Number(stats.completedTasks || 0);
  const total = open + completed;
  const completedPercent = total ? Math.round(completed / total * 100) : 0;
  const metrics = [
    { key: 'completed', value: completed, label: vi ? 'Đã hoàn thành (trong dữ liệu tải)' : 'Completed (loaded records)', Icon: CheckCircle2, tone: 'mint' },
    { key: 'open', value: open, label: vi ? 'Chưa hoàn thành' : 'Unfinished tasks', Icon: Activity, tone: 'blue' },
    { key: 'urgent', value: brief.urgent, label: vi ? 'Cần ưu tiên cao' : 'High priority', Icon: AlertTriangle, tone: 'coral' },
    { key: 'due', value: brief.today, label: vi ? 'Đến hạn hôm nay' : 'Due today', Icon: Clock, tone: 'violet' },
  ];
  return <section className="gd-v3-insights" aria-label={vi ? 'Thống kê công việc' : 'Work insights'}>
    <div className="gd-v3-insights-heading">
      <span><Activity size={20}/><strong>{vi ? 'Nhịp độ công việc' : 'Work overview'}</strong></span>
      <small><Database size={13}/>{vi ? 'Dựa trên bản ghi đã tải' : 'Based on loaded records'}</small>
    </div>
    <div className="gd-v3-insights-metrics">
      {metrics.map(({key,value,label,Icon,tone})=><div className={'gd-v3-insight-cell tone-'+tone} key={key}>
        <Icon size={18}/><strong>{value.toLocaleString(vi ? 'vi-VN':'en-US')}</strong><span>{label}</span>
      </div>)}
    </div>
    <div className="gd-v3-insights-completion">
      <div><span>{vi ? 'Tỷ lệ hoàn thành trong mẫu dữ liệu' : 'Completion within loaded data'}</span><strong>{completedPercent}%</strong></div>
      <div className="gd-v3-insights-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completedPercent} aria-label={vi ? 'Tỷ lệ hoàn thành' : 'Completion rate'}>
        <span style={{width: completedPercent+'%'}}/>
      </div>
      {snapshot?.coverageLimited ? <p>{vi ? 'Một nguồn đã đạt giới hạn tải. Không xem đây là tỷ lệ toàn hệ thống.' : 'A source hit its load cap. This is not a system-wide rate.'}</p> : null}
    </div>
  </section>;
}
