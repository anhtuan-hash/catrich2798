import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardCheck, Clock3,
  Download, FileText, RefreshCw, Save, Send, Link2, ShieldCheck, UsersRound, X } from 'lucide-react';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import { loadTeamWorkspace, listTeamTeacherAccounts } from '../../utils/personnelHub.js';
import {
  LEARNING_REPORT_KINDS, LEARNING_REPORT_SECTIONS, LEARNING_REPORT_STATUSES,
  reportProgress, participationPercent, listLearningReports, loadLearningAttendance,
  listLearningClassOptions, bindLearningClasses, issueLearningReports,
  saveLearningReport, reviewLearningReport, markLearningReportRead,
} from './learningReportsService.js';
import './LearningReportsWorkspace.css';

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
function Metric({label,value,note}) {
  return <article className="blr-metric"><small>{label}</small><strong>{value}</strong>{note&&<span>{note}</span>}</article>;
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
        <p>Số liệu chỉ lấy từ các buổi điểm danh đã chốt trong kỳ báo cáo; không cần nhập lại.</p></div>
      <span>{loading?'Đang đồng bộ…':'Nguồn: Điểm danh chính thức'}</span>
    </header>
    {!classes.length ? <div className="blr-attendance-warning">
      <Link2 size={21}/><div><strong>Chưa liên kết lớp điểm danh</strong>
        <p>TTCM cần chọn lớp phụ trách trong mục “Liên kết lớp điểm danh”. Giáo viên không phải nhập số liệu thủ công.</p></div>
    </div> : <>
      <div className="blr-attendance-classes"><strong>Đội tuyển / lớp đã liên kết:</strong>
        {classes.map(c=><span key={c.id}>{c.name} · {c.registered} HS đăng ký</span>)}</div>
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
          <div><strong>{row.date} · {row.className}</strong>
            <small>{row.periods} tiết · Có mặt {row.present}/{row.expected} · Đi trễ {row.late} · Vắng {row.absent}</small>
            {row.note&&<p>Ghi chú từ điểm danh: {row.note}</p>}</div>
          <span className="blr-synced-pill"><ShieldCheck size={13}/> Đã đồng bộ</span>
        </article>)}
      </div>
    </>}
  </section>;
}
function ClassBindingEditor({options=[],busy,onSave}) {
  const [ids,setIds]=useState([]);
  useEffect(()=>{setIds(options.filter(c=>c.linked).map(c=>c.id));},[options]);
  const toggle=id=>setIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  return <section className="blr-bind-editor">
    <header><div><h3><Link2 size={19}/> Liên kết lớp điểm danh</h3>
      <p>Chỉ TTCM liên kết. Một lần liên kết được dùng lại cho các báo cáo tháng sau của giáo viên này.</p></div>
      <button type="button" className="is-primary" disabled={busy} onClick={()=>onSave(ids)}>
        <Save size={16}/>{busy?'Đang lưu…':'Lưu liên kết lớp'}</button>
    </header>
    <div className="blr-bind-grid">
      {options.map(c=><label key={c.id} className={ids.includes(c.id)?'is-checked':''}>
        <input type="checkbox" checked={ids.includes(c.id)} onChange={()=>toggle(c.id)}/>
        <span><strong>{c.name}</strong><small>{c.subject||'Môn học'} · {c.grade||'Khối'} · {c.completedSessions} buổi đã chốt trong kỳ</small></span>
      </label>)}
      {!options.length&&<p>Chưa có lớp điểm danh phù hợp với loại báo cáo này.</p>}
    </div>
    <p className="blr-muted">Chọn đúng mã lớp; không tự ghép theo tên giáo viên. Việc thay đổi liên kết không ghi đè dữ liệu Điểm danh.</p>
  </section>;
}
export default function LearningReportsWorkspace({currentUser}) {
  const isLeader=isDepartmentLeaderRole(currentUser?.role);
  const [tasks,setTasks]=useState([]);
  const [workspace,setWorkspace]=useState(null);
  const [accounts,setAccounts]=useState([]);
  const [kind,setKind]=useState('gifted');
  const [month,setMonth]=useState(periodNow);
  const [dueAt,setDueAt]=useState('');
  const [departmentId,setDepartmentId]=useState('');
  const [recipients,setRecipients]=useState([]);
  const [notification,setNotification]=useState(true);
  const [createEvent,setCreateEvent]=useState(true);
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
  const [filter,setFilter]=useState('all');

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
  const filtered=tasks.filter(t=>(!isLeader||t.department_id===departmentId)
    &&(filter==='all'||t.report_kind===filter));
  const pending=filtered.filter(t=>t.status==='submitted').length;
  const done=filtered.filter(t=>t.status==='approved').length;

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
  const deadlinePassed=Boolean(selected&&new Date(selected.due_at).getTime()<Date.now());
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
      setNotice('Đã liên kết '+count+' lớp điểm danh. Dữ liệu được tổng hợp tự động.');
    }catch(e){setError(e.message);}finally{setBindingBusy(false);}
  };
  const reloadAttendance=async()=>{
    if(!selected)return;
    setAttendanceLoading(true);setError('');
    try{setAttendance(await loadLearningAttendance(selected.id));}
    catch(e){setError(e.message);}finally{setAttendanceLoading(false);}
  };

  const doIssue=async(e)=>{
    e.preventDefault();setError('');setNotice('');
    if(!departmentId){setError('Chưa có tổ chuyên môn để giao báo cáo.');return;}
    if(!recipients.length){setError('Chọn ít nhất một giáo viên trong tổ.');return;}
    setBusy(true);
    try{
      const result=await issueLearningReports({departmentId,kind,month,dueAt,teacherIds:recipients,notification,event:createEvent});
      await load();setShowComposer(false);setRecipients([]);
      setNotice('Đã giao '+result.assigned_count+' báo cáo '+LEARNING_REPORT_KINDS[kind]+
        (result.created_event_id?' và xuất bản sự kiện hạn nộp.':'.'));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const doSave=async(submit)=>{
    setError('');setNotice('');setBusy(true);
    try{
      const next=await saveLearningReport(selected,payload,submit);
      setTasks(rows=>rows.map(t=>t.id===next.id?next:t));
      setNotice(submit?'Đã gửi báo cáo cho TTCM.':'Đã lưu bản nháp.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const doReview=async(status)=>{
    setBusy(true);setError('');setNotice('');
    try{
      const updated=await reviewLearningReport(selected.id,status,reviewComment);
      setTasks(rows=>rows.map(t=>t.id===updated.id?updated:t));
      setNotice(status==='approved'?'Đã xác nhận báo cáo.':'Đã yêu cầu giáo viên bổ sung.');
      setSelectedId('');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  function toggleRecipient(id){setRecipients(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
  return <main className="blr-shell">
    <header className="blr-hero"><div><small>BRIAN REPORTS · SPECIALIST PROGRAMMES</small>
      <h1>Bồi dưỡng & Phụ đạo</h1><p>Quản lý hiệu quả dạy học, nhật ký từng buổi và báo cáo chuyên môn có minh chứng.</p></div>
      <div className="blr-hero-icon"><BookOpenCheck size={48}/></div>
    </header>
    <div className="blr-topline">
      <div className="blr-kind-tabs">
        {Object.entries(LEARNING_REPORT_KINDS).map(([id,label])=>
          <button key={id} className={filter===id?'is-active':''} onClick={()=>{setFilter(filter===id?'all':id);setSelectedId('');}}>
            {id==='gifted'?<Award/>:<BookOpenCheck/>}{label}
          </button>)}
      </div>
      <div className="blr-actions"><button type="button" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/> Làm mới</button>
      {isLeader&&<button className="is-primary" type="button" onClick={()=>{setShowComposer(v=>!v);setSelectedId('');}}>
        <Send size={16}/> Giao báo cáo</button>}</div>
    </div>
    {error&&<div className="blr-banner is-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Đóng"><X size={16}/></button></div>}
    {notice&&<div className="blr-banner is-success" role="status"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')} aria-label="Đóng"><X size={16}/></button></div>}

    {isLeader&&<div className="blr-metrics">
      <Metric label="Báo cáo đã giao" value={filtered.length}/>
      <Metric label="Chờ TTCM duyệt" value={pending}/>
      <Metric label="Đã xác nhận" value={done}/>
      <Metric label="Chưa hoàn tất" value={filtered.length-done}/>
    </div>}
    {isLeader&&<label className="blr-department-label">Tổ chuyên môn
      <select value={departmentId} onChange={e=>{setDepartmentId(e.target.value);setRecipients([]);setSelectedId('');}}>
      {departments.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select>
    </label>}

    {isLeader&&showComposer&&<form className="blr-composer" onSubmit={doIssue}>
      <div className="blr-title-row"><h2>Tạo yêu cầu báo cáo</h2><button type="button" aria-label="Đóng" onClick={()=>setShowComposer(false)}><X size={20}/></button></div>
      <div className="blr-compose-grid">
        <label>Loại báo cáo<select value={kind} onChange={e=>setKind(e.target.value)}>
          {Object.entries(LEARNING_REPORT_KINDS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select></label>
        <label>Kỳ báo cáo<input required type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
        <label>Thời hạn nộp<input required type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label>
      </div>
      <div className="blr-recipient-head"><strong>Giáo viên thuộc {department?.name||'tổ chuyên môn'}</strong>
        <div className="blr-actions"><button type="button" onClick={()=>setRecipients(eligibleMembers.map(m=>m.id))}>Chọn tất cả</button>
        <button type="button" onClick={()=>setRecipients([])}>Bỏ chọn</button></div></div>
      <div className="blr-recipient-grid">{eligibleMembers.map(m=><label key={m.id}>
        <input type="checkbox" checked={recipients.includes(m.id)} onChange={()=>toggleRecipient(m.id)}/>{m.name}</label>)}
        {!eligibleMembers.length&&<p>Chưa có thành viên đang hoạt động được gắn tài khoản trong tổ.</p>}</div>
      <div className="blr-options">
        <label><input type="checkbox" checked={notification} onChange={e=>setNotification(e.target.checked)}/> Thông báo trong tài khoản giáo viên</label>
        <label><input type="checkbox" checked={createEvent} onChange={e=>setCreateEvent(e.target.checked)}/> Xuất bản sự kiện hạn nộp cho giáo viên được chọn</label>
      </div>
      <div className="blr-actions"><button className="is-primary" type="submit" disabled={busy||!recipients.length||!dueAt}><Send size={17}/>{busy?'Đang giao…': 'Giao '+recipients.length+' báo cáo'}</button></div>
    </form>}

    {!selected&&<section className="blr-list">
      <div className="blr-title-row"><h2>{isLeader?'Danh sách báo cáo được giao':'Báo cáo được phân công'}</h2>
        <span>{filtered.length} báo cáo</span>{isLeader&&<button onClick={()=>downloadCsv(filtered.map(x=>({...x,teacherName:teacherName(x.teacher_id)})))} disabled={!filtered.length}>
          <Download size={17}/> Xuất CSV</button>}</div>
      {loading?<div className="blr-empty">Đang tải báo cáo…</div>:!filtered.length?<div className="blr-empty"><FileText size={35}/>
        {isLeader?'Chưa có báo cáo nào được giao cho kỳ này.':'Bạn chưa được phân công báo cáo bồi dưỡng hoặc phụ đạo.'}</div>
        :<div className="blr-list-grid">{filtered.map(task=>{
          const p=reportProgress(task.report_kind,task.payload);
          return <button key={task.id} type="button" className="blr-task" onClick={()=>setSelectedId(task.id)}>
            <div className="blr-task-top"><span>{task.report_kind==='gifted'?<Award/>:<BookOpenCheck/>}{LEARNING_REPORT_KINDS[task.report_kind]}</span><Status value={task.status}/></div>
            <h3>{isLeader?teacherName(task.teacher_id):'Báo cáo '+task.period.slice(0,7)}</h3>
            <small><CalendarClock size={15}/> Hạn nộp: {dateLabel(task.due_at)}</small>
            <div className="blr-progress"><i style={{width:p.percent+'%'}}/></div>
            <small>{p.count}/5 phần đã hoàn thành · {p.percent}% phần chuyên môn</small>
          </button>;
        })}</div>}
    </section>}

    {selected&&<div className="blr-editor">
      <div className="blr-editor-head"><button type="button" onClick={()=>setSelectedId('')}>← Danh sách báo cáo</button>
        <div><small>{isLeader?teacherName(selected.teacher_id):'BÁO CÁO CỦA TÔI'}</small>
          <h2>{LEARNING_REPORT_KINDS[selected.report_kind]} · {selected.period?.slice(0,7)}</h2>
          <p><Clock3 size={16}/> Hạn {dateLabel(selected.due_at)} {deadlinePassed&&currentStatus!=='approved'&&<b className="blr-overdue">· Quá hạn</b>} · <Status value={currentStatus}/></p></div></div>
      <div className="blr-progressline"><strong>Tiến độ nhận xét chuyên môn: {progress.count}/5 phần</strong><div className="blr-progress"><i style={{width:progress.percent+'%'}}/></div><span>{progress.percent}%</span></div>
      {selected.reviewer_comment&&<div className="blr-banner">Nhận xét TTCM: {selected.reviewer_comment}</div>}
      {LEARNING_REPORT_SECTIONS[selected.report_kind].map((section,index)=><section className="blr-form-section" key={section.id}>
        <header><div className="blr-step">{String(index+1).padStart(2,'0')}</div><h3>{section.title}</h3>
          {progress.sections[index]&&<CheckCircle2 size={20} className="blr-done"/>}</header>
        <div className="blr-fields">{section.fields.map(([key,label,type,required])=><TextField key={key}
          label={label} fieldType={type} required={required!==false} value={payload[key]??''} disabled={reportLocked}
          onChange={value=>setPayload(old=>({...old,[key]:value}))}/>)}</div>
      </section>)}
      {isLeader&&<ClassBindingEditor key={selected.id} options={classOptions} busy={bindingBusy} onSave={saveBindings}/>}
      <div className="blr-attendance-refresh"><strong>Thống kê chuyên cần tự động</strong>
        <button type="button" onClick={reloadAttendance} disabled={attendanceLoading}><RefreshCw size={16}/> Cập nhật từ Điểm danh</button></div>
      <AttendancePanel data={effectiveAttendance} loading={attendanceLoading}/>
      {selected.status==='approved'&&selected.attendance_snapshot&&<p className="blr-muted">Số liệu điểm danh tại thời điểm TTCM xác nhận báo cáo đã được lưu để đối chiếu.</p>}
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
