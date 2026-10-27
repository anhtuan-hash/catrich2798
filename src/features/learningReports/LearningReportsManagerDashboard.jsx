import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {Award, BarChart3, CalendarClock, CalendarRange, CheckCircle2, ClipboardList,
  Download, FileBarChart2, RefreshCw, Send, UsersRound, X, AlertTriangle} from 'lucide-react';
import {
  LEARNING_REPORT_KINDS, LEARNING_REPORT_STATUSES,
  loadLearningTeamDashboard,setLearningTeamDeadline,
} from './learningReportsService.js';
import {buildLearningYearDashboard,schoolYearStartYear} from './learningReportsAnalytics.js';
import './LearningReportsManagerDashboard.css';

const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(Number(n)||0);
const datetime=iso=>iso?new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)):'—';
const inputDate=iso=>{
  if(!iso)return '';
  const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';
  const p=x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
};
const monthText=period=>{
  const [y,m]=period.split('-').map(Number);
  return 'Tháng '+m+'/'+y;
};
const csvCell=value=>{
  let t=String(value??'');
  if(/^[\s]*[=+\-@]/.test(t))t="'"+t;
  return '"'+t.replaceAll('"','""')+'"';
};
function exportCsv(header,rows,filename){
  const bytes='\ufeff'+[header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([bytes],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
const reportSubmitted=status=>['submitted','approved','revision'].includes(status);
function Metric({label,value,sub,icon:Icon}){
  return <article className="blrd-metric">
    <div className="blrd-metric-icon"><Icon size={22}/></div>
    <div><small>{label}</small><strong>{value}</strong>{sub&&<p>{sub}</p>}</div>
  </article>;
}
function Score({data,kind}){
  const s=data;
  return <div className="blrd-metrics">
    <Metric label="Giáo viên được giao" value={fmt(s.teachers)} sub={fmt(s.assigned)+' báo cáo được giao'} icon={UsersRound}/>
    <Metric label="Đã gửi" value={fmt(s.submitted)} sub={s.submissionPct===null?'Chưa có nhiệm vụ':s.submissionPct+'% đã nộp'} icon={Send}/>
    <Metric label="Đã duyệt" value={fmt(s.approved)} sub={fmt(s.revision)+' cần bổ sung'} icon={CheckCircle2}/>
    <Metric label="Lớp có hoạt động" value={fmt(s.classes)} sub="Tính lớp không trùng" icon={ClipboardList}/>
    <Metric label="Buổi thực dạy" value={fmt(s.sessions)} sub="Chỉ tính đúng giáo viên đứng lớp" icon={CalendarClock}/>
    <Metric label="Số tiết giảng dạy" value={fmt(s.periods)} sub="Giữ nguyên tiết lẻ theo Điểm danh" icon={BarChart3}/>
    <Metric label="Lượt có mặt" value={fmt(s.present)+'/'+fmt(s.expected)} sub={s.attendancePct===null?'Chưa có điểm danh':s.attendancePct+'% chuyên cần'} icon={UsersRound}/>
    <Metric label="Lượt vắng / đi trễ" value={fmt(s.absent)+' / '+fmt(s.late)} sub="Đã chốt trên Brian Attendance" icon={AlertTriangle}/>
    <Metric label="Kiến nghị" value={fmt(s.recommendations)} sub="Báo cáo có nội dung kiến nghị" icon={FileBarChart2}/>
    <Metric label={kind==='gifted'?'Lần kiểm tra / thi thử':'Học sinh cải thiện'} value={fmt(kind==='gifted'?s.assessments:s.improved)} sub={kind==='gifted'?fmt(s.achievements)+' báo cáo có thành tích':fmt(s.goals)+' đạt mục tiêu (theo GV đánh giá)'} icon={Award}/>
  </div>;
}
export default function LearningReportsManagerDashboard({
  departmentId,kind,mode,onModeChange,onOpenReport,onDeadlineUpdated,accounts=[]
}){
  const [startYear,setStartYear]=useState(schoolYearStartYear);
  const [data,setData]=useState(null);
  const [month,setMonth]=useState(()=>{
    const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  });
  const [deadlineInput,setDeadlineInput]=useState('');
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [clock,setClock]=useState(Date.now());
  const year=useMemo(()=>buildLearningYearDashboard(data,startYear),[data,startYear]);
  const current=year.months.find(m=>m.period===month)||year.months[0];
  const names=useMemo(()=>new Map(accounts.map(a=>[String(a.id),a.name||a.full_name||a.email||'Giáo viên'])),[accounts]);
  const name=id=>names.get(String(id))||'Giáo viên';
  const refresh=useCallback(async()=>{
    if(!departmentId)return;
    setLoading(true);setError('');
    try{
      const result=await loadLearningTeamDashboard(departmentId,kind,startYear);
      setData(result);
    }catch(e){setError('Chưa tải được dữ liệu tổng hợp: '+e.message);}
    finally{setLoading(false);}
  },[departmentId,kind,startYear]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{
    if(!year.months.some(m=>m.period===month)){
      const thisMonth=new Date();
      const actual=thisMonth.getFullYear()+'-'+String(thisMonth.getMonth()+1).padStart(2,'0');
      setMonth(year.months.some(m=>m.period===actual)?actual:year.months[0].period);
    }
  },[startYear,month,year.months]);
  useEffect(()=>{setDeadlineInput(inputDate(current?.deadline?.value));},[month,current?.deadline?.value]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setClock(Date.now()),1000);
    return()=>window.clearInterval(timer);
  },[]);
  const due=current?.deadline?.value;
  const remaining=due?new Date(due).getTime()-clock:null;
  const countdown=remaining===null
    ?current?.deadline?.cleared?'Đã xóa hạn':'Chưa đặt hạn'
    :remaining<=0?'Đã hết hạn':
      'Còn '+Math.floor(remaining/86400000)+' ngày '+Math.floor(remaining%86400000/3600000)+' giờ '+
      Math.floor(remaining%3600000/60000)+' phút';
  const periodCount=current?.summary||year.summary;
  const filteredReports=current?.reports||[];
  const teacherBreakdown=useMemo(()=>{
    const grouped=new Map();
    for(const r of filteredReports){
      if(!grouped.has(r.teacherId))grouped.set(r.teacherId,[]);
      grouped.get(r.teacherId).push(r);
    }
    return [...grouped.entries()].map(([teacherId,reports])=>{
      const sessions=(current?.sessions||[]).filter(s=>s.teacherId===teacherId);
      return {teacherId,reports,sessions,report:reports[0]};
    });
  },[current]);
  const submitDeadline=async(clear=false)=>{
    if(!departmentId || !current)return;
    if(clear&&!window.confirm('Xóa hạn nộp cho '+monthText(month)+' của '+LEARNING_REPORT_KINDS[kind]+'?'))return;
    if(!clear&&(!deadlineInput||new Date(deadlineInput).getTime()<=Date.now())){
      setError('Hãy chọn thời hạn trong tương lai.');return;
    }
    setSaving(true);setError('');setNotice('');
    try{
      await setLearningTeamDeadline(departmentId,kind,month,deadlineInput,clear);
      await refresh();
      if(typeof onDeadlineUpdated==='function')await onDeadlineUpdated();
      setNotice(clear?'Đã xóa hạn nộp và hủy sự kiện hạn nộp tương ứng.':'Đã cập nhật hạn nộp và lịch sự kiện của báo cáo.');
    }catch(e){setError('Không cập nhật được hạn nộp: '+e.message);}
    finally{setSaving(false);}
  };
  const exportMonth=()=>{
    exportCsv(['Giáo viên','Kỳ báo cáo','Trạng thái','Buổi dạy','Số tiết','Có mặt','Lượt phải tham gia','Vắng','Đi trễ','Ngày nộp'],
      teacherBreakdown.map(x=>[
        name(x.teacherId),month,x.report?.status||'draft',x.sessions.length,
        x.sessions.reduce((v,s)=>v+Number(s.periods||0),0),
        x.sessions.reduce((v,s)=>v+Number(s.present||0),0),
        x.sessions.reduce((v,s)=>v+Number(s.expected||0),0),
        x.sessions.reduce((v,s)=>v+Number(s.absent||0),0),
        x.sessions.reduce((v,s)=>v+Number(s.late||0),0),x.report?.submittedAt||'',
      ]),'brian-'+kind+'-tong-hop-'+month+'.csv');
  };
  const exportYear=()=>{
    exportCsv(['Tháng','Đã giao','Đã nộp','Đã duyệt','Cần bổ sung','Buổi dạy','Tiết dạy','Có mặt','Tổng lượt','Vắng','Đi trễ','Chuyên cần (%)'],
      year.months.map(m=>[m.period,m.summary.assigned,m.summary.submitted,m.summary.approved,
        m.summary.revision,m.summary.sessions,m.summary.periods,m.summary.present,
        m.summary.expected,m.summary.absent,m.summary.late,m.summary.attendancePct??'']),
      'brian-'+kind+'-nam-hoc-'+startYear+'-'+(startYear+1)+'.csv');
  };
  const openMonth=period=>{setMonth(period);onModeChange('summary');};
  return <div className="blrd-shell">
    <header className="blrd-hero">
      <div><small><CalendarRange size={16}/> {mode==='history'?'QUẢN LÝ BÁO CÁO THEO NĂM HỌC':'TỔNG HỢP CHUYÊN MÔN THEO THÁNG'}</small>
        <h2>{mode==='history'?'Thống kê báo cáo theo tháng':'Tổng hợp báo cáo giáo viên'}</h2>
        <p>{LEARNING_REPORT_KINDS[kind]} · Dữ liệu từ báo cáo giáo viên và Điểm danh đã chốt, phân tách theo đúng giáo viên thực dạy.</p>
      </div>
      <div className="blrd-hero-controls">
        <label>Năm học <select value={startYear} onChange={e=>setStartYear(Number(e.target.value))}>
          {Array.from({length:5},(_,i)=>schoolYearStartYear()-2+i).map(y=><option key={y} value={y}>{y}–{y+1}</option>)}
        </select></label>
        <button type="button" onClick={refresh} disabled={loading}><RefreshCw size={16}/>{loading?'Đang tải…':'Làm mới'}</button>
      </div>
    </header>
    {error&&<div className="blrd-message is-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Đóng"><X size={17}/></button></div>}
    {notice&&<div className="blrd-message is-success" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Đóng"><X size={17}/></button></div>}
    {mode==='summary'?<>
      <section className="blrd-deadline">
        <div><small>THỜI GIAN BÁO CÁO</small><h3>Đặt thời hạn cho tổ viên</h3>
          <p>Hạn áp dụng cho tất cả giáo viên được giao <b>{LEARNING_REPORT_KINDS[kind]}</b> trong tháng đã chọn.</p>
          <span className={remaining!==null&&remaining<=0?'is-expired':''}>{countdown}</span>
          {current?.deadline?.multiple&&<p>Các báo cáo đang có hạn riêng khác nhau. Hãy đặt hạn chung để thống nhất.</p>}
        </div>
        <div className="blrd-deadline-actions">
          <label>Tháng báo cáo<select value={month} onChange={e=>setMonth(e.target.value)}>
            {year.months.map(m=><option key={m.period} value={m.period}>{monthText(m.period)}</option>)}
          </select></label>
          <label>Thời hạn<input type="datetime-local" value={deadlineInput} onChange={e=>setDeadlineInput(e.target.value)}/></label>
          <div className="blrd-button-group">
            <button type="button" className="is-primary" disabled={saving||!deadlineInput} onClick={()=>submitDeadline(false)}><CalendarClock size={17}/> Đặt thời hạn</button>
            <button type="button" disabled={saving||(!due&&!deadlineInput)} onClick={()=>submitDeadline(true)}><X size={16}/> Xóa hạn</button>
          </div>
        </div>
      </section>
      <Score data={periodCount} kind={kind}/>
      <section className="blrd-paper">
        <header><div><small>TỔNG HỢP TỪ GIÁO VIÊN</small><h3>Bảng số liệu {monthText(month)}</h3></div>
          <button type="button" onClick={exportMonth} disabled={!teacherBreakdown.length}><Download size={17}/> Xuất CSV</button></header>
        <div className="blrd-table-scroll"><table><thead><tr>
          <th>Giáo viên</th><th>Báo cáo</th><th>Buổi</th><th>Tiết</th><th>Lượt có mặt</th><th>Chuyên cần</th><th>Kiến nghị</th><th>Chi tiết</th>
        </tr></thead><tbody>{teacherBreakdown.map(x=>{
          const expected=x.sessions.reduce((n,s)=>n+Number(s.expected||0),0);
          const present=x.sessions.reduce((n,s)=>n+Number(s.present||0),0);
          const periods=x.sessions.reduce((n,s)=>n+Number(s.periods||0),0);
          return <tr key={x.teacherId}><td><strong>{name(x.teacherId)}</strong></td>
            <td><span className={'blrd-status is-'+x.report?.status}>{LEARNING_REPORT_STATUSES[x.report?.status]||'Chưa nộp'}</span></td>
            <td>{fmt(x.sessions.length)}</td><td>{fmt(periods)}</td>
            <td>{fmt(present)}/{fmt(expected)}</td><td>{expected?Math.round(present/expected*1000)/10+'%':'—'}</td>
            <td>{x.reports.some(r=>r.hasRecommendation)?'Có':'—'}</td>
            <td><button type="button" disabled={!x.report} onClick={()=>onOpenReport(x.report.id)}>Xem</button></td>
          </tr>;
        })}</tbody></table></div>
        {!teacherBreakdown.length&&<p className="blrd-empty">Tháng này chưa có giáo viên được giao báo cáo. TTCM có thể sử dụng “Giao báo cáo” để tạo nhiệm vụ.</p>}
        <p className="blrd-footnote">Mỗi buổi Điểm danh được tính một lần theo mã buổi và giáo viên thực dạy; không nhân đôi vì có hai giáo viên cùng lớp.</p>
      </section>
    </>:<>
      <Score data={year.summary} kind={kind}/>
      <section className="blrd-paper">
        <header><div><small>12 THÁNG TRONG NĂM HỌC</small><h3>Tiến độ nộp báo cáo</h3></div>
          <button type="button" onClick={exportYear}><Download size={17}/> Xuất CSV năm học</button></header>
        <div className="blrd-month-grid">{year.months.map(m=><button type="button" key={m.period}
          onClick={()=>openMonth(m.period)} className={'blrd-month '+(m.period===month?'is-current':'')}>
          <div><strong>T{Number(m.period.slice(5))}/{m.period.slice(2,4)}</strong>
            <b>{m.summary.submissionPct===null?'Chưa giao':m.summary.submissionPct+'%'}</b></div>
          <span className="blrd-bar"><i style={{width:(m.summary.submissionPct??0)+'%'}}/></span>
          <div className="blrd-month-stats"><small>{m.summary.submitted} đã gửi</small>
            <small>{m.summary.approved} đã duyệt</small><small>{m.summary.draft} bản nháp</small>
            <small>{m.summary.revision} cần sửa</small></div>
          <div className="blrd-month-sub">{fmt(m.summary.sessions)} buổi · {fmt(m.summary.periods)} tiết</div>
        </button>)}</div>
      </section>
      <section className="blrd-paper">
        <header><div><small>DIỄN BIẾN HOẠT ĐỘNG</small><h3>Số buổi thực dạy theo tháng</h3></div>
          <p>Đếm theo buổi Điểm danh duy nhất</p></header>
        <div className="blrd-activity">{year.months.map(m=>{
          const max=Math.max(1,...year.months.map(x=>x.summary.sessions));
          return <div key={m.period} className="blrd-activity-row">
            <small>{'T'+Number(m.period.slice(5))+'/'+m.period.slice(2,4)}</small>
            <div><span style={{width:(m.summary.sessions/max*100)+'%'}}/></div>
            <strong>{m.summary.sessions}</strong>
          </div>;
        })}</div>
      </section>
      <section className="blrd-paper">
        <header><div><small>PHÂN TÍCH THEO GIÁO VIÊN</small><h3>Đóng góp giảng dạy trong năm học</h3></div></header>
        <div className="blrd-table-scroll"><table><thead><tr><th>Giáo viên</th><th>Lượt báo cáo</th><th>Đã gửi</th><th>Đã duyệt</th><th>Buổi</th><th>Tiết</th><th>Chuyên cần</th></tr></thead>
          <tbody>{year.teachers.map(t=><tr key={t.teacherId}><td><strong>{name(t.teacherId)}</strong></td>
            <td>{t.summary.assigned}</td><td>{t.summary.submitted}</td><td>{t.summary.approved}</td>
            <td>{t.summary.sessions}</td><td>{fmt(t.summary.periods)}</td>
            <td>{t.summary.attendancePct===null?'—':t.summary.attendancePct+'%'}</td></tr>)}</tbody>
        </table></div>
        {!year.teachers.length&&<p className="blrd-empty">Chưa có báo cáo được phân công trong năm học này.</p>}
      </section>
    </>}
  </div>;
}
