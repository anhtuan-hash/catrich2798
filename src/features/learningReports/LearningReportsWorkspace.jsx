import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LearningReportsManagerDashboard from './LearningReportsManagerDashboard.jsx';
import SmartAssignmentComposer from './SmartAssignmentComposer.jsx';
import LearningAssignmentManager from './LearningAssignmentManager.jsx';
import {isValidReportPeriod,reportPeriodTitle,shiftReportPeriod} from './learningReportsPeriod.js';
import { Award, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardCheck, Clock3,
  Download, FileText, RefreshCw, Save, Send, Trash2, Link2, ShieldCheck, UsersRound, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import { loadTeamWorkspace, listTeamTeacherAccounts } from '../../utils/personnelHub.js';
import {
  LEARNING_REPORT_KINDS, LEARNING_REPORT_SECTIONS, LEARNING_REPORT_STATUSES,
  reportProgress, participationPercent, listLearningReports, loadLearningAttendance,
  listLearningClassOptions, bindLearningClasses,
  saveLearningReport, reviewLearningReport, markLearningReportRead,
  bulkRevokeLearningReportAssignments,
} from './learningReportsService.js';
import './LearningReportsWorkspace.css';
import './LearningReportsMacMaterial.css';
import './LearningReportsHeroInteractive.css';

const dateOnly = () => { const now = new Date(); return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'); };
const periodNow = () => dateOnly().slice(0,7);

const dateLabel = value => value ? new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
const safeText = value => String(value ?? '');
const csvCell = value => '"' + safeText(value).replaceAll('"','""') + '"';

function downloadCsv(items) {
  const rows=[['Loại báo cáo','Giáo viên','Tháng','Hạn nộp','Trạng thái','Tiến độ','Ngày nộp'],
    ...items.map(x=>[LEARNING_REPORT_KINDS[x.report_kind],x.teacherName,x.period?.slice(0,7),
      dateLabel(x.due_at),LEARNING_REPORT_STATUSES[x.status],reportProgress(x.report_kind,x.payload).percent+'%',
      dateLabel(x.submitted_at)])];
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='brian-learning-reports.csv';link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Metric({label,value,note,icon:Icon=FileText}) {
  return <article className="blr-metric">
    <span className="blr-metric-icon" aria-hidden="true"><Icon size={22}/></span>
    <small>{label}</small><strong>{value}</strong>{note&&<span>{note}</span>}
  </article>;
}
function Status({value}) {
  return <span className={'blr-status is-'+value}>{LEARNING_REPORT_STATUSES[value]||value}</span>;
}
function TextField({label,fieldType,value,disabled,onChange,required}) {
  return <label className="blr-field"><span>{label}{required&&' *'}</span>
    {fieldType==='textarea'
      ? <textarea rows={3} disabled={disabled} value={safeText(value)} onChange={e=>onChange(e.target.value)}/>
      : <input type={fieldType==='number'?'number':'text'} min={fieldType==='number'?0:undefined}
        disabled={disabled} value={safeText(value)} onChange={e=>onChange(e.target.value)}/>}
  </label>;
}
function AttendancePanel({data,loading}) {
  const classes=data?.classes||[];
  const sessions=data?.sessions||[];
  const t=data?.totals||{};
  const pct=Number(t.expected)>0 ? participationPercent({expected:Number(t.expected),present:Number(t.present)}) : null;
  return <section className="blr-journal blr-attendance-source" aria-label="Dữ liệu tự động từ điểm danh">
    <header>
      <div><h3><ShieldCheck size={21}/> Dữ liệu tự động từ Brian Attendance</h3>
        <p>Chỉ lấy các buổi đã chốt do đúng giáo viên này giảng dạy; không cộng chung buổi của giáo viên khác trong cùng lớp.</p></div>
      <span>{loading?'Đang đồng bộ…':'Nguồn: Điểm danh chính thức'}</span>
    </header>
    {!classes.length ? <div className="blr-attendance-warning">
      <Link2 size={21}/><div><strong>Chưa liên kết lớp điểm danh</strong>
        <p>TTCM cần chọn lớp phụ trách trong mục “Liên kết lớp điểm danh”. Giáo viên không phải nhập số liệu thủ công.</p></div>
    </div> : <>
      <div className="blr-attendance-classes"><strong>Đội tuyển / lớp đã liên kết:</strong>
        {classes.map(c=><span key={c.id}>{c.name} · GV: {c.instructorName} · {c.registered} HS đăng ký</span>)}</div>
      <div className="blr-attendance-metrics">
        {[
          ['Lớp liên kết',classes.length],['Buổi đã chốt',t.sessions??0],
          ['Số tiết thực hiện',t.periods??0],['Lượt có mặt',(t.present??0)+'/'+(t.expected??0)],
          ['Đi trễ',t.late??0],['Vắng',t.absent??0],
          ['Chuyên cần',pct===null?'—':pct+'%'],
        ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </div>
      <div className="blr-attendance-sessions">
        <h4>Nhật ký các buổi đã chốt · {data?.period||''}</h4>
        {!sessions.length?<p className="blr-muted">Chưa có buổi điểm danh đã chốt trong tháng này. Số liệu sẽ tự xuất hiện khi Điểm danh được xác nhận.</p>
        :sessions.map(row=><article key={row.id}>
          <div><strong>{row.date} · {row.className} · GV: {row.instructorName}</strong>
            <small>{row.periods} tiết · Có mặt {row.present}/{row.expected} · Đi trễ {row.late} · Vắng {row.absent}</small>
            {row.note&&<p>Ghi chú từ điểm danh: {row.note}</p>}</div>
          <span className="blr-synced-pill"><ShieldCheck size={13}/> Đã đồng bộ</span>
        </article>)}
      </div>
    </>}
  </section>;
}
function ClassBindingEditor({options=[],busy,onSave,teacherLabel=''}) {
  const [byClass,setByClass]=useState({});
  useEffect(()=>{
    setByClass(Object.fromEntries(options.filter(c=>c.linked&&c.linkedInstructor)
      .map(c=>[c.id,c.linkedInstructor])));
  },[options]);
  const selected=options.filter(c=>byClass[c.id]).map(c=>({
    classId:c.id,instructorName:byClass[c.id],
  }));
  return <section className="blr-bind-editor">
    <header><div><h3><Link2 size={19}/> Liên kết lớp và giáo viên đứng lớp</h3>
      <p>Đang lập báo cáo cho: <strong>{teacherLabel}</strong>. Chọn tên người giảng dạy được ghi trong Điểm danh của từng lớp. Liên kết này được dùng lại trong các kỳ tiếp theo.</p></div>
      <button type="button" className="is-primary" disabled={busy} onClick={()=>onSave(selected)}>
        <Save size={16}/>{busy?'Đang lưu…':'Lưu '+selected.length+' liên kết'}</button>
    </header>
    <div className="blr-bind-grid">
      {options.map(c=><div key={c.id} className={'blr-instructor-class '+(byClass[c.id]?'is-checked':'')}>
        <strong>{c.name}</strong>
        <small>{c.subject||'Môn học'} · {c.grade||'Khối'}</small>
        <label htmlFor={'blr-instructor-'+c.id}>Giáo viên thực dạy của lớp này</label>
        <select id={'blr-instructor-'+c.id} value={byClass[c.id]||''} disabled={busy}
          onChange={e=>setByClass(old=>({...old,[c.id]:e.target.value}))}>
          <option value="">Không liên kết lớp này</option>
          {(c.instructors||[]).map(instructor=><option key={instructor.name}
            value={instructor.name} disabled={instructor.assignedToOther}>
            {instructor.name} · {instructor.confirmedSessions} buổi đã chốt{instructor.assignedToOther?' · Đã gán giáo viên khác':''}
          </option>)}
        </select>
        {!c.instructors?.length&&<p className="blr-muted">Lớp chưa có danh sách giáo viên trong Điểm danh.</p>}
        {byClass[c.id]&&<span className="blr-synced-pill"><ShieldCheck size={13}/> Chỉ lấy buổi dạy của {byClass[c.id]}</span>}
      </div>)}
      {!options.length&&<p>Chưa có lớp điểm danh phù hợp với loại báo cáo này.</p>}
    </div>
    <p className="blr-muted">Hai giáo viên cùng lớp được phân biệt bằng tên người dạy trên từng buổi điểm danh. Mỗi buổi chỉ thuộc báo cáo của giáo viên được chọn, không cộng dồn toàn lớp.</p>
  </section>;
}
export default function LearningReportsWorkspace({currentUser}) {
  const isLeader=isDepartmentLeaderRole(currentUser?.role);
  const [tasks,setTasks]=useState([]);
  const [workspace,setWorkspace]=useState(null);
  const [accounts,setAccounts]=useState([]);
  const [departmentId,setDepartmentId]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [payload,setPayload]=useState({});
  const [attendance,setAttendance]=useState(null);
  const [attendanceLoading,setAttendanceLoading]=useState(false);
  const [classOptions,setClassOptions]=useState([]);
  const [bindingBusy,setBindingBusy]=useState(false);
  const [reviewComment,setReviewComment]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showComposer,setShowComposer]=useState(false);
  const [analyticsKind,setAnalyticsKind]=useState('gifted');
  const [managerView,setManagerView]=useState('reports');
  const [heroPeriod,setHeroPeriod]=useState(periodNow);
  const [bulkBusy,setBulkBusy]=useState(false);
  const [clockNow,setClockNow]=useState(Date.now());
  useEffect(()=>{const id=window.setInterval(()=>setClockNow(Date.now()),60000);return()=>window.clearInterval(id);},[]);

  const load=useCallback(async()=>{
    const [rows,meta]=await Promise.all([
      listLearningReports(),
      isLeader?Promise.all([loadTeamWorkspace(currentUser),listTeamTeacherAccounts(currentUser)]):Promise.resolve(null),
    ]);
    setTasks(rows);
    if(meta){
      setWorkspace(meta[0].workspace);setAccounts(meta[1]);
      setDepartmentId(old=>old||meta[0].workspace?.activeDepartmentId||meta[0].workspace?.departments?.[0]?.id||'');
    }
  },[isLeader,currentUser?.id]);

  useEffect(()=>{
    let active=true;setLoading(true);setError('');
    load().catch(e=>{if(active)setError('Chưa thể tải dữ liệu báo cáo. Kiểm tra migration và quyền truy cập: '+e.message);})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[load]);

  const selected=useMemo(()=>tasks.find(t=>t.id===selectedId)||null,[tasks,selectedId]);
  const departments=workspace?.departments||[];
  const department=departments.find(d=>d.id===departmentId)||departments[0];
  const members=(department?.members||[]).filter(m=>m.status==='active'&&m.teacherAccountId);
  const eligibleMembers=members.map(m=>({
    id:m.teacherAccountId,
    name:accounts.find(a=>a.id===m.teacherAccountId)?.name||m.staffCode||m.teacherAccountId,
  }));
  const teacherName=useCallback(id=>accounts.find(a=>a.id===id)?.name||
    members.find(m=>m.teacherAccountId===id)?.staffCode||'Giáo viên',[accounts,members]);
  const filtered=tasks.filter(t=>isLeader?t.department_id===departmentId:t.teacher_id===currentUser?.id);
  const pending=filtered.filter(t=>t.status==='submitted').length;
  const done=filtered.filter(t=>t.status==='approved').length;
  const reportPeriodTasks=filtered.filter(t=>String(t.period||'').slice(0,7)===heroPeriod);
  const heroDrafts=reportPeriodTasks.filter(t=>t.status==='draft'||t.status==='revision').length;
  const heroModeLabel=!isLeader?'Báo cáo của tôi':
    managerView==='summary'?'Tổng hợp tổ':
    managerView==='history'?'Thống kê tháng':'Báo cáo giáo viên';
  const updateHeroPeriod=period=>{
    if(!isValidReportPeriod(period))return;
    setHeroPeriod(period);
    if(isLeader&&!selected){
      setShowComposer(false);
      setManagerView('summary');
    }
  };


  useEffect(()=>{
    if(!selected){setAttendance(null);setClassOptions([]);return;}
    let active=true;
    setPayload({...selected.payload});setReviewComment(selected.reviewer_comment||'');
    if(!isLeader && selected.teacher_id===currentUser?.id && !selected.notified_read_at){
      markLearningReportRead(selected).catch(()=>{});
    }
    setAttendanceLoading(true);
    const calls=[loadLearningAttendance(selected.id),isLeader?listLearningClassOptions(selected.id):Promise.resolve([])];
    Promise.all(calls).then(([summary,options])=>{
      if(!active)return;
      setAttendance(summary);setClassOptions(options);
    }).catch(e=>{if(active)setError('Không thể tải dữ liệu điểm danh: '+e.message);})
      .finally(()=>{if(active)setAttendanceLoading(false);});
    return()=>{active=false;};
  },[selected?.id,isLeader,currentUser?.id]);
  const currentStatus=selected?.status||'draft';
  const editable=selected && !isLeader && selected.teacher_id===currentUser?.id&&['draft','revision'].includes(currentStatus);
  const progress=selected?reportProgress(selected.report_kind,payload):null;
  const effectiveAttendance=selected?.status==='approved' && selected.attendance_snapshot
    ? selected.attendance_snapshot : attendance;
  const hasLinkedClass=(effectiveAttendance?.classes?.length||0)>0;
  const deadlinePassed=Boolean(selected?.effective_due_at&&new Date(selected.effective_due_at).getTime()<clockNow);
  const msLeft=selected?.effective_due_at?new Date(selected.effective_due_at).getTime()-clockNow:null;
  const teacherDeadlineStatus=msLeft===null?'Chưa đặt hạn nộp':
    msLeft<=0?'Đã hết hạn':
    'Còn '+Math.floor(msLeft/86400000)+' ngày '+Math.floor(msLeft%86400000/3600000)+' giờ';
  const reportLocked=selected&&!editable;
  const saveBindings=async(ids)=>{
    if(!selected)return;
    setBindingBusy(true);setError('');setNotice('');
    try{
      const count=await bindLearningClasses(selected.id,ids);
      const [summary,options]=await Promise.all([
        loadLearningAttendance(selected.id),listLearningClassOptions(selected.id),
      ]);
      setAttendance(summary);setClassOptions(options);
      setNotice('Đã liên kết '+count+' cặp lớp + giáo viên. Chỉ những buổi giảng dạy của giáo viên được chọn mới được tổng hợp.');
    }catch(e){setError(e.message);}finally{setBindingBusy(false);}
  };
  const reloadAttendance=async()=>{
    if(!selected)return;
    setAttendanceLoading(true);setError('');
    try{setAttendance(await loadLearningAttendance(selected.id));}
    catch(e){setError(e.message);}finally{setAttendanceLoading(false);}
  };

  const doSave=async(submit)=>{
    setError('');setNotice('');setBusy(true);
    try{
      const next=await saveLearningReport(selected,payload,submit);
      setTasks(rows=>rows.map(t=>t.id===next.id?next:t));
      setNotice(submit?'Đã gửi báo cáo cho TTCM.':'Đã lưu bản nháp.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const doBulkRevoke=async(ids)=>{
    if(!isLeader||bulkBusy||!ids?.length)return {removed:[],skipped:[]};
    setBulkBusy(true);setError('');setNotice('');
    try{
      const result=await bulkRevokeLearningReportAssignments(ids);
      const removed=new Set((result.removed||[]).map(r=>r.taskId));
      setTasks(rows=>rows.filter(row=>!removed.has(row.id)));
      if(removed.has(selectedId))setSelectedId('');
      setNotice('Đã thu hồi '+(result.removedCount||0)+' yêu cầu giao báo cáo.'+
        (result.skippedCount?' '+result.skippedCount+' báo cáo được bảo vệ/không thể xóa.':'')+
        ' Dữ liệu Điểm danh vẫn được giữ nguyên.');
      return result;
    }catch(e){setError('Không thể xóa các yêu cầu được chọn: '+e.message);return {removed:[],skipped:[]};}
    finally{setBulkBusy(false);}
  };
  const doReview=async(status)=>{
    setBusy(true);setError('');setNotice('');
    try{
      const updated=await reviewLearningReport(selected.id,status,reviewComment);
      setTasks(rows=>rows.map(t=>t.id===updated.id?updated:t));
      setNotice(status==='approved'?'Đã xác nhận báo cáo.':'Đã yêu cầu giáo viên bổ sung.');
      setSelectedId('');
      if(isLeader)setManagerView('reports');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <main className="blr-shell">
    <header className="blr-hero blr-hero-interactive">
      <div className="blr-hero-copy">
        <small>BRIAN REPORTS · SPECIALIST PROGRAMMES</small>
        <h1>Bồi dưỡng & Phụ đạo</h1>
        <p>Quản lý hiệu quả dạy học, nhật ký từng buổi và báo cáo chuyên môn có minh chứng.</p>
        <div className="blr-hero-inline-meta">
          <span className="blr-hero-pill"><CalendarClock size={16} aria-hidden="true"/>{reportPeriodTitle(heroPeriod)}</span>
          <span className="blr-hero-pill is-soft"><FileText size={16} aria-hidden="true"/>{heroModeLabel}</span>
        </div>
      </div>
      <div className="blr-hero-stage">
        <div className="blr-hero-visual" aria-hidden="true">
          <div className="blr-hero-icon"><BookOpenCheck size={47}/></div>
        </div>
        <div className="blr-hero-month-card">
          <label htmlFor="blr-hero-report-period">Tháng báo cáo</label>
          <div className="blr-hero-month-control">
            <button type="button" className="blr-hero-month-nav"
              aria-label="Tháng trước" title="Xem tháng trước"
              onClick={()=>updateHeroPeriod(shiftReportPeriod(heroPeriod,-1))}><ChevronLeft size={17}/></button>
            <input id="blr-hero-report-period" type="month" aria-label="Chọn tháng báo cáo"
              value={heroPeriod} onChange={e=>updateHeroPeriod(e.target.value)}/>
            <button type="button" className="blr-hero-month-nav"
              aria-label="Tháng sau" title="Xem tháng sau"
              onClick={()=>updateHeroPeriod(shiftReportPeriod(heroPeriod,1))}><ChevronRight size={17}/></button>
          </div>
        </div>
        <button type="button" className="blr-hero-chip is-count"
          onClick={()=>{if(isLeader){setShowComposer(false);setSelectedId('');setManagerView('reports');}}}
          disabled={!isLeader} title="Mở danh sách báo cáo giáo viên">
          <span>Đã giao trong {reportPeriodTitle(heroPeriod).toLowerCase()}</span>
          <strong>{reportPeriodTasks.length} <FileText size={16} aria-hidden="true"/></strong>
        </button>
        <div className="blr-hero-chip is-status">
          <span>Còn cần hoàn tất</span>
          <strong>{heroDrafts} <Clock3 size={16} aria-hidden="true"/></strong>
        </div>
      </div>
    </header>
    <div className="blr-topline blr-topline-unified">
      <div className="blr-workspace-title">
        <strong>Không gian quản lý chuyên đề</strong>
        <span>HSG và Phụ đạo · Một hệ thống báo cáo thống nhất</span>
      </div>
      <div className="blr-actions">
        <button type="button" onClick={()=>load().catch(e=>setError(e.message))}>
          <RefreshCw size={16}/> Làm mới
        </button>
        {isLeader&&<button className="is-primary" type="button"
          onClick={()=>{setManagerView('reports');setShowComposer(v=>!v);setSelectedId('');}}>
          <Send size={16}/> Giao báo cáo
        </button>}
      </div>
    </div>
    {error&&<div className="blr-banner is-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Đóng"><X size={16}/></button></div>}
    {notice&&<div className="blr-banner is-success" role="status"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')} aria-label="Đóng"><X size={16}/></button></div>}

    {isLeader&&!selected&&<div className="blr-manager-modes blr-unified-tabs" role="tablist" aria-label="Quản lý báo cáo Bồi dưỡng và Phụ đạo">
      <button type="button" role="tab" aria-selected={managerView==='reports'}
        className={managerView==='reports'?'is-active':''}
        onClick={()=>setManagerView('reports')}><FileText size={16}/> Báo cáo giáo viên</button>
      <button type="button" role="tab" aria-selected={managerView==='summary'}
        className={managerView==='summary'?'is-active':''}
        onClick={()=>{setShowComposer(false);setManagerView('summary');}}><UsersRound size={16}/> Tổng hợp tổ</button>
      <button type="button" role="tab" aria-selected={managerView==='history'}
        className={managerView==='history'?'is-active':''}
        onClick={()=>{setShowComposer(false);setManagerView('history');}}><CalendarClock size={16}/> Thống kê tháng</button>
      {managerView!=='reports'&&<label className="blr-analytics-kind">Loại báo cáo
        <select value={analyticsKind} onChange={e=>setAnalyticsKind(e.target.value)}>
          <option value="gifted">Bồi dưỡng HSG</option>
          <option value="remedial">Phụ đạo học sinh</option>
        </select>
      </label>}
    </div>}
    {isLeader&&managerView==='reports'&&<div className="blr-metrics">
      <Metric label="Báo cáo đã giao" icon={FileText} value={filtered.length}/>
      <Metric label="Chờ TTCM duyệt" icon={Clock3} value={pending}/>
      <Metric label="Đã xác nhận" icon={CheckCircle2} value={done}/>
      <Metric label="Chưa hoàn tất" icon={AlertCircle} value={filtered.length-done}/>
    </div>}
    {isLeader&&<label className="blr-department-label">Tổ chuyên môn
      <select value={departmentId} onChange={e=>{setDepartmentId(e.target.value);setSelectedId('');}}>
      {departments.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select>
    </label>}

    {isLeader&&managerView==='reports'&&showComposer&&<SmartAssignmentComposer
      departmentId={departmentId} departmentName={department?.name||'Tổ chuyên môn'}
      eligibleMembers={eligibleMembers} onClose={()=>setShowComposer(false)}
      onSuccess={async result=>{
        setShowComposer(false);setSelectedId('');
        setNotice('Đã tự động giao '+result.created+' báo cáo mới; '+result.existing+
          ' báo cáo đã có được giữ nguyên. Đã liên kết '+result.linkedClasses+
          ' cặp lớp/giáo viên.'+(result.needsReview?' Còn '+result.needsReview+
          ' tên giáo viên cần xác minh.':''));
        try{await load();}catch(e){setError('Đã giao thành công nhưng cần làm mới danh sách: '+e.message);}
      }}
    />}

    {isLeader&&!selected&&managerView!=='reports'&&<LearningReportsManagerDashboard
      departmentId={departmentId} kind={analyticsKind} mode={managerView}
      selectedPeriod={heroPeriod} onPeriodChange={setHeroPeriod}
      onModeChange={setManagerView} onDeadlineUpdated={load} accounts={accounts}
      onOpenReport={id=>{setManagerView('reports');setSelectedId(id);}}/>}
    {isLeader&&managerView==='reports'&&!selected&&<LearningAssignmentManager
      tasks={filtered} kind="all" teacherName={teacherName}
      busy={bulkBusy} onBulkRevoke={doBulkRevoke}
      onOpen={id=>setSelectedId(id)}
    />}
    {!isLeader&&!selected&&<section className="blr-list">
      <div className="blr-title-row"><h2>Báo cáo của tôi</h2><span>{filtered.length} báo cáo</span></div>
      {loading?<div className="blr-empty">Đang tải báo cáo…</div>
      :!filtered.length?<div className="blr-empty"><FileText size={35}/>
        Bạn chưa được phân công báo cáo bồi dưỡng hoặc phụ đạo.</div>
      :<div className="blr-list-grid">{filtered.map(task=>{
        const p=reportProgress(task.report_kind,task.payload);
        return <button type="button" key={task.id} className="blr-task" onClick={()=>setSelectedId(task.id)}>
          <div className="blr-task-top"><span>{task.report_kind==='gifted'?<Award/>:<BookOpenCheck/>}
            {LEARNING_REPORT_KINDS[task.report_kind]}</span><Status value={task.status}/></div>
          <h3>{LEARNING_REPORT_KINDS[task.report_kind]} · {task.period?.slice(0,7)}</h3>
          <small><CalendarClock size={15}/> Hạn nộp: {dateLabel(task.effective_due_at)}</small>
          <div className="blr-progress"><i style={{width:p.percent+'%'}}/></div>
          <small>{p.count}/5 phần đã hoàn thành · {p.percent}% phần chuyên môn</small>
        </button>;
      })}</div>}
    </section>}

    {selected&&<div className="blr-editor">
      <div className="blr-editor-head"><button type="button" onClick={()=>{setSelectedId('');if(isLeader)setManagerView('summary');}}>
          {isLeader?'← Danh sách báo cáo':'← Danh sách báo cáo'}</button>
        <div><small>{isLeader?teacherName(selected.teacher_id):'BÁO CÁO CỦA TÔI'}</small>
          <h2>{LEARNING_REPORT_KINDS[selected.report_kind]} · {selected.period?.slice(0,7)}</h2>
          <p><Clock3 size={16}/> Hạn {dateLabel(selected.effective_due_at)} {deadlinePassed&&currentStatus!=='approved'&&<b className="blr-overdue">· Quá hạn</b>} · <Status value={currentStatus}/></p>
          <p className="blr-deadline-countdown"><CalendarClock size={16}/> {teacherDeadlineStatus}</p></div></div>
      {isLeader&&<details className="blr-legacy-bindings">
        <summary>Quản lý liên kết lớp cũ (chỉ khi cần chỉnh sửa)</summary>
        <ClassBindingEditor key={selected.id} options={classOptions} busy={bindingBusy}
          onSave={saveBindings} teacherLabel={teacherName(selected.teacher_id)}/>
      </details>}
      <div className="blr-attendance-refresh"><strong>Thống kê chuyên cần tự động</strong>
        <button type="button" onClick={reloadAttendance} disabled={attendanceLoading}><RefreshCw size={16}/> Cập nhật từ Điểm danh</button></div>
      <AttendancePanel data={effectiveAttendance} loading={attendanceLoading}/>
      {selected.status==='approved'&&selected.attendance_snapshot&&<p className="blr-muted">Số liệu điểm danh tại thời điểm TTCM xác nhận báo cáo đã được lưu để đối chiếu.</p>}
      <div className="blr-progressline"><strong>Tiến độ nhận xét chuyên môn: {progress.count}/5 phần</strong><div className="blr-progress"><i style={{width:progress.percent+'%'}}/></div><span>{progress.percent}%</span></div>
      {selected.reviewer_comment&&<div className="blr-banner">Nhận xét TTCM: {selected.reviewer_comment}</div>}
      {LEARNING_REPORT_SECTIONS[selected.report_kind].map((section,index)=><section className="blr-form-section" key={section.id}>
        <header><div className="blr-step">{String(index+1).padStart(2,'0')}</div><h3>{section.title}</h3>
          {progress.sections[index]&&<CheckCircle2 size={20} className="blr-done"/>}</header>
        <div className="blr-fields">{section.fields.map(([key,label,type,required])=><TextField key={key}
          label={label} fieldType={type} required={required!==false} value={payload[key]??''} disabled={reportLocked}
          onChange={value=>setPayload(old=>({...old,[key]:value}))}/>)}</div>
      </section>)}
      {editable&&!hasLinkedClass&&<p className="blr-attendance-warning">Chưa thể gửi báo cáo vì TTCM chưa liên kết lớp điểm danh. Bạn vẫn có thể lưu phần đánh giá chuyên môn.</p>}
      {editable&&<div className="blr-actions blr-bottom-actions">
        <button type="button" disabled={busy} onClick={()=>doSave(false)}><Save size={18}/> Lưu nháp</button>
        <button type="button" className="is-primary" disabled={busy||!progress.ready||!hasLinkedClass||attendanceLoading} onClick={()=>doSave(true)}><Send size={18}/> Gửi TTCM</button>
      </div>}
      {isLeader&&<section className="blr-review"><h3>Đánh giá của TTCM</h3>
        <label>Nhận xét / yêu cầu bổ sung<textarea rows={3} value={reviewComment} onChange={e=>setReviewComment(e.target.value)}/></label>
        <div className="blr-actions"><button type="button" disabled={busy||!['submitted','approved','revision'].includes(currentStatus)} onClick={()=>doReview('revision')}>
          Yêu cầu bổ sung</button>
        <button type="button" className="is-primary" disabled={busy||currentStatus!=='submitted'} onClick={()=>doReview('approved')}>
          <ClipboardCheck size={18}/> Xác nhận báo cáo</button></div>
      </section>}
    </div>}
  </main>;
}
