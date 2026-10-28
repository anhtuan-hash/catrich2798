import React, { useMemo } from 'react';
import {
  Activity, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCheck, Clock3, Download, FileText, Filter, GraduationCap,
  LayoutDashboard, LockKeyhole, MapPin, MoreHorizontal, Search, ShieldCheck,
  Sparkles, TrendingUp, UserCheck, UserRoundCheck, Users, UserX, AlertCircle,
} from 'lucide-react';
import './GuestAttendanceStudio.css';

// This file is deliberately standalone and contains no data imports, network
// requests, Supabase access, local storage, or student information from BRIAN.
const CLASS_NAMES = [
  ['10.1','P.201',41],['10.2','P.202',42],['10.3','P.203',40],
  ['10.4','P.204',41],['10.5','P.205',42],['10.6','P.206',40],
  ['11.1','P.301',40],['11.2','P.302',39],['11.3','P.303',41],
  ['11.4','P.304',40],['11.5','P.305',42],['11.6','P.306',39],
  ['12.1','P.401',38],['12.2','P.402',39],['12.3','P.403',40],
  ['12.4','P.404',39],['12.5','P.405',38],['12.6','P.406',40],
];
const CLASS_MAP = new Map(CLASS_NAMES.map(([name,room,size])=>[name,{name,room,size}]));
const SESSION_BASE = [
  {className:'10.5',time:'07:00 – 07:45',period:'Tiết 1',status:'completed',present:41,room:'P.205'},
  {className:'11.1',time:'08:00 – 08:45',period:'Tiết 2',status:'completed',present:38,room:'P.301'},
  {className:'11.3',time:'09:00 – 09:45',period:'Tiết 3',status:'ongoing',present:39,room:'P.303'},
  {className:'12.2',time:'10:00 – 10:45',period:'Tiết 4',status:'upcoming',present:null,room:'P.402'},
  {className:'10.2',time:'13:30 – 14:15',period:'Tiết 5',status:'upcoming',present:null,room:'P.202'},
  {className:'12.6',time:'14:20 – 15:05',period:'Tiết 6',status:'attention',present:36,room:'P.406'},
];
const ROSTER = [
  ['Nguyễn Minh Anh','present'],['Trần Gia Hân','present'],['Lê Hoàng Phúc','excused'],
  ['Phạm Khánh Linh','present'],['Võ Đức Minh','present'],['Nguyễn Thảo Vy','late'],
  ['Trương Quốc Bảo','present'],['Huỳnh Nhật Nam','present'],['Đặng Bảo Ngọc','present'],
  ['Lý Thanh Tâm','present'],['Phan Tuấn Kiệt','present'],['Bùi Ngọc Hà','present'],
];
const WEEK_RATE = [93,96,94,91,98,94,92];
const WEEK_LABELS = ['T2','T3','T4','T5','T6','T7','CN'];
const STATUS = {
  completed:{vi:'Hoàn tất',en:'Completed'},
  ongoing:{vi:'Đang diễn ra',en:'In progress'},
  upcoming:{vi:'Sắp tới',en:'Upcoming'},
  attention:{vi:'Cần rà soát',en:'Needs review'},
  present:{vi:'Có mặt',en:'Present'},
  late:{vi:'Đi trễ',en:'Late'},
  excused:{vi:'Vắng phép',en:'Excused'},
};
const fmt2 = (n) => String(n).padStart(2,'0');
const hcmNow = () => {
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'numeric',day:'numeric'
  }).formatToParts(new Date());
  const get=(type)=>Number(parts.find(p=>p.type===type)?.value||1);
  return {year:get('year'),month:get('month')-1,day:get('day')};
};
const formatDate=(day,month,year)=>fmt2(day)+'/'+fmt2(month+1)+'/'+year;
const previousDate=(offset,now)=>{
  const date=new Date(Date.UTC(now.year,now.month,now.day-offset,12));
  return formatDate(date.getUTCDate(),date.getUTCMonth(),date.getUTCFullYear());
};
const statusLabel=(status,en)=>STATUS[status]?.[en?'en':'vi']||status;
const getClass=(name)=>CLASS_MAP.get(name)||{room:'P.301',size:40};
const iconForStatus=(status)=>status==='completed'?CheckCircle2:status==='attention'?AlertCircle:Clock3;
const weekOffset=(year,month)=> (new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
const calendarDays=(now)=>{
  const num=new Date(Date.UTC(now.year,now.month+1,0)).getUTCDate();
  const offset=weekOffset(now.year,now.month);
  return Array.from({length:Math.ceil((num+offset)/7)*7},(_,i)=>{
    const day=i-offset+1;
    if(day<1||day>num) return null;
    const weekDay=new Date(Date.UTC(now.year,now.month,day)).getUTCDay();
    const hasClass=weekDay!==0;
    const code=!hasClass?'empty':day>now.day?'upcoming':day===now.day?'ongoing':day%9===0?'attention':'completed';
    return {day,code,classes:hasClass?(day%3===0?6:day%2===0?5:4):0};
  });
};
function SectionHeading({icon:Icon,title,aside}) {
  return <div className="gas-section-head"><div><span className="gas-section-icon"><Icon size={18}/></span><h2>{title}</h2></div>{aside&&<span className="gas-section-aside">{aside}</span>}</div>;
}
function Tag({status,en}){
  const Icon=iconForStatus(status);
  return <span className={'gas-tag gas-tag--'+status}><Icon size={13}/>{statusLabel(status,en)}</span>;
}
function StatCard({Icon,value,label,tone,detail}){
  return <article className={'gas-stat gas-stat--'+tone}>
    <span className="gas-stat-icon"><Icon size={23}/></span>
    <div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>
    <span className="gas-stat-glow" aria-hidden="true"/>
  </article>;
}
function CalendarPanel({now,en}){
  const dates=useMemo(()=>calendarDays(now),[now.year,now.month,now.day]);
  const month=new Intl.DateTimeFormat(en?'en-US':'vi-VN',{month:'long',year:'numeric',timeZone:'UTC'})
    .format(new Date(Date.UTC(now.year,now.month,1,12)));
  return <section className="gas-panel gas-calendar">
    <SectionHeading icon={CalendarDays} title={en?'Attendance calendar':'Lịch điểm danh'} aside={en?'Monthly view':'Theo tháng'}/>
    <div className="gas-calendar-month">
      <div><strong>{month}</strong><small>{en?'School schedule':'Lịch học trong tháng'}</small></div>
      <span className="gas-calendar-arrows" aria-hidden="true"><ChevronLeft size={18}/><ChevronRight size={18}/></span>
    </div>
    <div className="gas-calendar-grid">
      {(en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:WEEK_LABELS).map((x,i)=><span className="gas-calendar-weekday" key={i}>{x}</span>)}
      {dates.map((date,i)=>date
        ? <div className={'gas-calendar-day gas-calendar-day--'+date.code+(date.day===now.day?' is-today':'')} key={i}>
            <strong>{date.day}</strong>
            {date.classes>0&&<><span className="gas-calendar-dots"><i/><i/><i/></span><small>{date.classes} {en?'classes':'lớp'}</small></>}
          </div>
        : <div className="gas-calendar-blank" key={i}/>)}
    </div>
    <div className="gas-calendar-legend">
      {['completed','ongoing','upcoming','attention'].map(status=><span key={status}><i className={'gas-dot--'+status}/>{statusLabel(status,en)}</span>)}
    </div>
  </section>;
}
function TodaySessions({now,en}){
  return <section className="gas-panel gas-today">
    <SectionHeading icon={Clock3} title={en?'Today’s sessions':'Buổi học hôm nay'} aside={formatDate(now.day,now.month,now.year)}/>
    <div className="gas-today-list">{SESSION_BASE.map((item)=>{
      const Icon=iconForStatus(item.status);const cls=getClass(item.className);
      return <article className="gas-session" key={item.className}>
        <span className={'gas-session-icon gas-session-icon--'+item.status}><Icon size={19}/></span>
        <div className="gas-session-main">
          <div className="gas-session-title"><strong>{item.className}</strong><span>{en?'English':'Tiếng Anh'} {item.className.split('.')[0]}</span><Tag status={item.status} en={en}/></div>
          <div className="gas-session-meta"><span><Clock3 size={12}/>{item.time}</span><span><MapPin size={12}/>{item.room}</span><span>{item.period}</span></div>
        </div>
        <div className="gas-session-count">{item.present==null?'—':item.present+'/'+cls.size}<small>{en?'present':'có mặt'}</small></div>
      </article>;
    })}</div>
  </section>;
}
function QuickAttendance({en}){
  return <section className="gas-panel gas-quick">
    <SectionHeading icon={UserRoundCheck} title={en?'Quick attendance':'Điểm danh nhanh'} aside={en?'Class roster':'Danh sách lớp'}/>
    <div className="gas-quick-controls">
      <span className="gas-faux-field"><small>{en?'Class':'Lớp'}</small><strong>11.1 <span>⌄</span></strong></span>
      <span className="gas-faux-field"><small>{en?'Lesson':'Buổi học'}</small><strong>{en?'Period 2 · 08:00':'Tiết 2 · 08:00'} <span>⌄</span></strong></span>
      <span className="gas-faux-field gas-quick-teacher"><small>{en?'Subject teacher':'Giáo viên bộ môn'}</small><strong>{en?'English department':'Tổ tiếng Anh'} <span><GraduationCap size={15}/></span></strong></span>
      <span className="gas-quick-search"><Search size={15}/>{en?'Find students':'Tìm học sinh'}</span>
    </div>
    <div className="gas-quick-chips">
      <span className="gas-chip gas-chip--present"><CheckCircle2 size={15}/>{en?'Present':'Có mặt'}</span>
      <span className="gas-chip gas-chip--absent"><UserX size={15}/>{en?'Absent':'Vắng'}</span>
      <span className="gas-chip gas-chip--late"><Clock3 size={15}/>{en?'Late':'Đi trễ'}</span>
      <span className="gas-chip gas-chip--excused"><ShieldCheck size={15}/>{en?'Excused':'Vắng phép'}</span>
      <span className="gas-chip gas-chip--neutral"><Filter size={15}/>{en?'Filter':'Bộ lọc'}</span>
    </div>
    <div className="gas-roster-scroll"><table className="gas-roster"><thead><tr><th>STT</th><th>{en?'Student':'Họ và tên'}</th><th>{en?'Attendance':'Trạng thái'}</th><th>{en?'Notes':'Ghi chú'}</th></tr></thead>
      <tbody>{ROSTER.map(([name,status],i)=><tr key={name}><td>{fmt2(i+1)}</td><td><span className="gas-avatar">{name.split(' ').slice(-2).map(x=>x[0]).join('')}</span><strong>{name}</strong></td><td><Tag status={status} en={en}/></td><td>{status==='late'?(en?'10 minutes late':'Trễ 10 phút'):status==='excused'?(en?'Approved leave':'Có phép'):'—'}</td></tr>)}</tbody>
    </table></div>
    <div className="gas-quick-footer"><div className="gas-quick-figures"><span><b>38</b> {en?'present':'có mặt'}</span><span><b>01</b> {en?'excused':'có phép'}</span><span><b>01</b> {en?'late':'đi trễ'}</span></div><span className="gas-quick-save"><LockKeyhole size={15}/>{en?'Save attendance':'Lưu điểm danh'}</span></div>
  </section>;
}
function AttendanceHistory({now,en}){
  const classes=['11.1','10.5','11.3','12.2','10.2','12.6','11.4','10.3'];
  return <section className="gas-panel gas-history">
    <SectionHeading icon={FileText} title={en?'Attendance history':'Lịch sử điểm danh'} aside={en?'Recent sessions':'Gần đây'}/>
    <div className="gas-history-scroll"><table className="gas-history-table"><thead><tr>
      <th>{en?'Date':'Ngày'}</th><th>{en?'Class':'Lớp'}</th><th>{en?'Session':'Buổi'}</th><th>{en?'Enrolment':'Sĩ số'}</th><th>{en?'Present':'Có mặt'}</th><th>{en?'Status':'Trạng thái'}</th>
    </tr></thead><tbody>{classes.map((name,i)=>{
      const size=getClass(name).size; const present=size-(i%4===0?2:1);
      return <tr key={name}><td>{previousDate(i%5,now)}</td><td><strong>{name}</strong></td><td>{en?'Period ':'Tiết '}{i%6+1}</td><td>{size}</td><td><strong>{present}</strong></td><td><Tag status="completed" en={en}/></td></tr>;
    })}</tbody></table></div>
    <div className="gas-history-foot"><span><CheckCircle2 size={14}/>{en?'All records synchronized':'Các phiên đã đồng bộ'}</span><span><Download size={15}/>{en?'Export report':'Xuất báo cáo'}</span></div>
  </section>;
}
function AttendanceReports({en}){
  const ranking=[['11.1',98],['10.5',97],['12.2',96]];
  return <section className="gas-panel gas-reports">
    <SectionHeading icon={BarChart3} title={en?'Attendance reports':'Báo cáo chuyên cần'} aside={en?'Weekly overview':'Tổng quan tuần'}/>
    <div className="gas-report-tiles">
      <div><TrendingUp size={20}/><strong>94%</strong><span>{en?'Average attendance':'Hiện diện trung bình'}</span></div>
      <div><UserCheck size={20}/><strong>16</strong><span>{en?'Sessions completed':'Buổi hoàn thành'}</span></div>
      <div><AlertCircle size={20}/><strong>02</strong><span>{en?'To review':'Cần rà soát'}</span></div>
    </div>
    <div className="gas-report-bottom">
      <div className="gas-bar-section"><h3>{en?'Weekly attendance rate':'Tỉ lệ hiện diện theo tuần'}</h3><div className="gas-report-chart">
        {WEEK_RATE.map((rate,i)=><div className="gas-report-bar" key={i}><small>{rate}%</small><span><i style={{height:rate+'%'}}/></span><b>{WEEK_LABELS[i]}</b></div>)}
      </div></div>
      <div className="gas-rank"><h3>{en?'Leading classes':'Lớp chuyên cần nổi bật'}</h3>
        {ranking.map(([name,rate],i)=><div key={name}><span className="gas-rank-number">{i+1}</span><strong>{name}</strong><span className="gas-rank-track"><i style={{width:rate+'%'}}/></span><b>{rate}%</b></div>)}
      </div>
    </div>
  </section>;
}
export default function GuestAttendanceStudio({language='vi'}){
  const en=language==='en';
  const now=useMemo(hcmNow,[]);
  return <div className="brian-guest-attendance-studio" data-guest-attendance-studio="true" data-sample-fixture="true">
    <header className="gas-hero">
      <div className="gas-hero-main"><span className="gas-eyebrow"><span className="gas-live-dot"/>{en?'BRIAN ATTENDANCE':'BRIAN · QUẢN LÝ ĐIỂM DANH'}</span>
        <h1>{en?'Attendance':'Điểm danh'}</h1>
        <div className="gas-hero-flags"><span><CalendarDays size={15}/>{formatDate(now.day,now.month,now.year)}</span><span><ShieldCheck size={15}/>{en?'Read only':'Chỉ xem'}</span></div>
      </div>
      <div className="gas-hero-art" aria-hidden="true"><span className="gas-art-ring"/><span className="gas-art-card gas-art-card--back"><CalendarDays size={35}/></span><span className="gas-art-card gas-art-card--front"><ClipboardCheck size={55}/><CheckCircle2 size={22}/></span><span className="gas-art-tick"><Sparkles size={22}/></span></div>
    </header>
    <div className="gas-stats">
      <StatCard Icon={Users} value="18" label={en?'Active classes':'Lớp đang hoạt động'} detail={en?'Grades 10 · 11 · 12':'Khối 10 · 11 · 12'} tone="blue"/>
      <StatCard Icon={CalendarDays} value="06" label={en?'Today’s sessions':'Buổi học hôm nay'} detail={formatDate(now.day,now.month,now.year)} tone="violet"/>
      <StatCard Icon={TrendingUp} value="94%" label={en?'Attendance rate':'Tỉ lệ hiện diện'} detail={en?'This week':'Trong tuần'} tone="mint"/>
      <StatCard Icon={AlertCircle} value="02" label={en?'Need attention':'Cần lưu ý'} detail={en?'Pending review':'Chờ rà soát'} tone="orange"/>
    </div>
    <nav className="gas-tabs" aria-label={en?'Attendance sections':'Các phân hệ điểm danh'}>
      <span className="gas-tabs-active"><CalendarDays size={18}/>{en?'Calendar':'Lịch điểm danh'}</span>
      <span><ClipboardCheck size={18}/>{en?'Quick attendance':'Điểm danh nhanh'}</span>
      <span><Clock3 size={18}/>{en?'History':'Lịch sử'}</span>
      <span><BarChart3 size={18}/>{en?'Reports':'Báo cáo'}</span>
    </nav>
    <div className="gas-primary-grid"><CalendarPanel now={now} en={en}/><TodaySessions now={now} en={en}/></div>
    <QuickAttendance en={en}/>
    <div className="gas-secondary-grid"><AttendanceHistory now={now} en={en}/><AttendanceReports en={en}/></div>
  </div>;
}
