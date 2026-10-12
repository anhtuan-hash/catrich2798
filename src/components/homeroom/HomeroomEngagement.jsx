import React, { useMemo } from 'react';
import { CalendarCheck2, UserRoundCheck, Clock3, ClipboardCheck, Award, ShieldCheck, AlertTriangle, CalendarDays, TrendingUp, CheckCircle2 } from 'lucide-react';
import { buildHomeroomEngagement } from '../../utils/homeroom4Engagement.js';
import './HomeroomEngagement.css';
function localToday(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
const shortDate=(day)=>String(day||'').slice(5).replace('-','/');
function Stat({icon:Icon,label,value,description,tone='blue'}){
  return <article className="hr4-engage-stat" data-tone={tone}>
    <span className="hr4-engage-stat-symbol"><Icon size={20} strokeWidth={2.3} aria-hidden="true"/></span>
    <div><small>{label}</small><strong>{value}</strong><em>{description}</em></div>
  </article>;
}
export default function HomeroomEngagement({workspace,mode}){
  const date=localToday();
  const insights=useMemo(()=>buildHomeroomEngagement(workspace,date),[workspace,date]);
  if(mode==='attendance'){
    const {today,days,hasWeekData,totals}=insights.attendance;
    const maxRows=Math.max(0,...days.map(x=>x.recordedRows));
    return <section className="hr4-engage-panel" aria-label="Phân tích chuyên cần từ dữ liệu thực">
      <header className="hr4-engage-header"><div><small>ATTENDANCE INSIGHTS</small><h2>Chuyên cần trong tầm nhìn</h2><p>Chỉ tính những lượt điểm danh đã lưu, không suy đoán buổi học chưa diễn ra.</p></div><CalendarCheck2 size={31} aria-hidden="true"/></header>
      <div className="hr4-engage-kpis">
        <Stat icon={CalendarDays} tone="blue" label="Phiên đã lưu" value={totals.sessions} description="Toàn bộ lịch sử"/>
        <Stat icon={UserRoundCheck} tone="teal" label="Có mặt hôm nay" value={today?.recordedRows?today.present:'—'} description={today?.sessionCount?`${today.sessionCount} phiên hôm nay`:'Chưa có dữ liệu'}/>
        <Stat icon={Clock3} tone="amber" label="Lượt trễ trong 7 ngày" value={days.reduce((sum,item)=>sum+item.late,0)} description="Trên các phiên có dữ liệu"/>
        <Stat icon={ClipboardCheck} tone="coral" label="Đang chờ chỉnh sửa" value={totals.pendingCorrections} description={`${totals.lockedAttendanceSessions} phiên đang khóa`}/>
      </div>
      <div className="hr4-engage-bottom"><div className="hr4-engage-chart-title"><TrendingUp size={19}/><strong>Lượt điểm danh 7 ngày</strong></div>
        {hasWeekData?<div className="hr4-engage-chart" role="img" aria-label={days.map(x=>`${x.day}: ${x.recordedRows} lượt, ${x.present} có mặt, ${x.late} trễ, ${x.unexcused} vắng không phép`).join('; ')}>
          {days.map(d=><div className="hr4-engage-bar-col" key={d.day}>
            <div className="hr4-engage-bar-track"><div className="hr4-engage-bar-stack" style={{height:maxRows?`${d.recordedRows/maxRows*100}%`:'0%'}}>
              {d.otherAbsences+d.excused+d.unexcused>0?<i className="is-absent" style={{flex:d.otherAbsences+d.excused+d.unexcused}}/>:null}
              {d.late>0?<i className="is-late" style={{flex:d.late}}/>:null}
              {d.present>0?<i className="is-present" style={{flex:d.present}}/>:null}
            </div></div><strong>{d.recordedRows||'·'}</strong><small>{shortDate(d.day)}</small>
          </div>)}
        </div>:<p className="hr4-engage-empty">Chưa có dữ liệu điểm danh trong 7 ngày gần đây.</p>}
        <div className="hr4-engage-legend"><span><i className="is-present"/> Có mặt</span><span><i className="is-late"/> Đi trễ</span><span><i className="is-absent"/> Vắng</span></div>
      </div>
    </section>;
  }
  if(mode==='conduct'){
    const c=insights.conduct;
    return <section className="hr4-engage-panel" aria-label="Tình trạng rèn luyện từ ghi nhận thực">
      <header className="hr4-engage-header"><div><small>CONDUCT INSIGHTS</small><h2>Theo dõi rèn luyện</h2><p>Thống kê các ghi nhận đã lưu. Điểm số và cơ chế khóa tuần không thay đổi.</p></div><Award size={31} aria-hidden="true"/></header>
      <div className="hr4-engage-kpis">
        <Stat icon={CheckCircle2} tone="teal" label="Đã xác nhận" value={c.confirmed} description="Ghi nhận hợp lệ"/>
        <Stat icon={AlertTriangle} tone="coral" label="Chờ xác nhận" value={c.pending} description="Cần giáo viên xử lý"/>
        <Stat icon={Award} tone="violet" label="Khen thưởng" value={c.rewards} description="Đã xác nhận"/>
        <Stat icon={ShieldCheck} tone="blue" label="Tuần đã khóa" value={c.lockedWeeks} description="Theo trạng thái lưu"/>
      </div>
      <div className="hr4-engage-bottom hr4-engage-weeks">
        <div className="hr4-engage-chart-title"><CalendarDays size={19}/><strong>Các tuần gần đây trong sổ</strong></div>
        {c.recent.length?<div className="hr4-engage-week-list">
          {c.recent.map(week=><div key={week.weekStart}><time dateTime={week.weekStart}>Tuần {shortDate(week.weekStart)}</time>
            <span data-locked={week.status==='locked'}>{week.status==='locked'?'Đã khóa':'Chưa khóa'}</span></div>)}
        </div>:<p className="hr4-engage-empty">Chưa có tuần tổng kết được lưu.</p>}
        <p className="hr4-engage-note">Có {c.violations} ghi nhận vi phạm đã xác nhận và {c.rewards} khen thưởng đã xác nhận.</p>
      </div>
    </section>;
  }
  return null;
}
