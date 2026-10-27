import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardCheck, Clock3,
  Download, FileText, RefreshCw, Save, Send, Trash2, UsersRound, X } from 'lucide-react';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import { loadTeamWorkspace, listTeamTeacherAccounts } from '../../utils/personnelHub.js';
import {
  LEARNING_REPORT_KINDS, LEARNING_REPORT_SECTIONS, LEARNING_REPORT_STATUSES,
  reportProgress, aggregateLearningSessions, participationPercent, listLearningReports,
  listLearningSessions, issueLearningReports, saveLearningReport, reviewLearningReport,
  saveLearningSession, deleteLearningSession, markLearningReportRead,
} from './learningReportsService.js';
import './LearningReportsWorkspace.css';

const dateOnly = () => { const now = new Date(); return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'); };
const periodNow = () => dateOnly().slice(0,7);
const dateLabel = value => value ? new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
const n = value => Math.max(0,Number(value)||0);
const safeText = value => String(value ?? '');
const defaultSession = () => ({
  session_date:dateOnly(),class_label:'',topic:'',periods:1,expected_count:0,present_count:0,observation:'',
});
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
function Journal({task,rows,onReload,onError}) {
  const [editing,setEditing]=useState('');
  const [form,setForm]=useState(defaultSession);
  const [busy,setBusy]=useState(false);
  const editable=['draft','revision'].includes(task.status);
  const stats=aggregateLearningSessions(rows);
  async function save(e) {
    e.preventDefault();setBusy(true);
    try { await saveLearningSession(task,form,editing);setEditing('');setForm(defaultSession());await onReload(); }
    catch(error){onError(error.message);}
    finally{setBusy(false);}
  }
  async function remove(id){
    if(!window.confirm('Xóa nhật ký buổi dạy này?'))return;
    setBusy(true);
    try{await deleteLearningSession(id);await onReload();}
    catch(error){onError(error.message);}finally{setBusy(false);}
  }
  return <section className="blr-journal">
    <header><div><h3>Nhật ký từng buổi dạy</h3><p>Dữ liệu chuyên cần được tính từ số lượt có mặt/tổng lượt phải tham gia.</p></div><span>{stats.sessions} buổi · {stats.periods} tiết · {participationPercent(stats)??'—'}% chuyên cần</span></header>
    {editable&&<form className="blr-journal-form" onSubmit={save}>
      <label>Ngày dạy<input type="date" required value={form.session_date} onChange={e=>setForm(p=>({...p,session_date:e.target.value}))}/></label>
      <label>Khối/lớp<input value={form.class_label} onChange={e=>setForm(p=>({...p,class_label:e.target.value}))} placeholder="VD: 11A1"/></label>
      <label>Số tiết<input type="number" min="1" max="12" required value={form.periods} onChange={e=>setForm(p=>({...p,periods:e.target.value}))}/></label>
      <label>Đăng ký<input type="number" min="0" max="300" required value={form.expected_count} onChange={e=>setForm(p=>({...p,expected_count:e.target.value}))}/></label>
      <label>Có mặt<input type="number" min="0" max="300" required value={form.present_count} onChange={e=>setForm(p=>({...p,present_count:e.target.value}))}/></label>
      <label className="is-wide">Nội dung đã dạy<input required minLength={2} maxLength={500} value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))}/></label>
      <label className="is-wide">Nhận xét sau buổi học<textarea rows={2} value={form.observation} onChange={e=>setForm(p=>({...p,observation:e.target.value}))}/></label>
      <div className="blr-actions is-wide">
        <button type="submit" disabled={busy}><Save size={16}/>{editing?'Cập nhật':'Thêm buổi dạy'}</button>
        {editing&&<button type="button" onClick={()=>{setEditing('');setForm(defaultSession());}}>Hủy sửa</button>}
      </div>
    </form>}
    <div className="blr-session-list">{rows.length ? rows.map(row=><article key={row.id}>
      <div><strong>{row.topic}</strong><small>{row.session_date} · {row.class_label||'Chưa ghi lớp'} · {row.periods} tiết · {row.present_count}/{row.expected_count} HS</small>{row.observation&&<p>{row.observation}</p>}</div>
      {editable&&<div className="blr-actions">
        <button type="button" onClick={()=>{setEditing(row.id);setForm({session_date:row.session_date,class_label:row.class_label,topic:row.topic,periods:row.periods,expected_count:row.expected_count,present_count:row.present_count,observation:row.observation});}}>Sửa</button>
        <button type="button" className="is-danger" disabled={busy} onClick={()=>remove(row.id)} aria-label="Xóa nhật ký"><Trash2 size={16}/></button>
      </div>}
    </article>) : <p className="blr-muted">Chưa có buổi dạy được ghi nhận. Có thể nhập nhật ký ngay sau mỗi buổi.</p>}</div>
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
  const [sessions,setSessions]=useState([]);
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
    if(!selected){setSessions([]);return;}
    setPayload({...selected.payload});setReviewComment(selected.reviewer_comment||'');
    if(!isLeader && selected.teacher_id===currentUser?.id && !selected.notified_read_at){
      markLearningReportRead(selected).catch(()=>{});
    }
    let active=true;
    listLearningSessions(selected.id).then(rows=>{if(active)setSessions(rows);})
      .catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[selectedId, selected?.id, currentUser?.id, isLeader]);

  const reloadSessions=async()=>{if(selected) setSessions(await listLearningSessions(selected.id));};
  const currentStatus=selected?.status||'draft';
  const editable=selected && !isLeader && selected.teacher_id===currentUser?.id&&['draft','revision'].includes(currentStatus);
  const progress=selected?reportProgress(selected.report_kind,payload):null;
  const sessionStats=aggregateLearningSessions(sessions);
  const deadlinePassed=Boolean(selected&&new Date(selected.due_at).getTime()<Date.now());
  const reportLocked=selected&&!editable;

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
            <small>{p.count}/5 phần đã hoàn thành · {p.percent}%</small>
          </button>;
        })}</div>}
    </section>}

    {selected&&<div className="blr-editor">
      <div className="blr-editor-head"><button type="button" onClick={()=>setSelectedId('')}>← Danh sách báo cáo</button>
        <div><small>{isLeader?teacherName(selected.teacher_id):'BÁO CÁO CỦA TÔI'}</small>
          <h2>{LEARNING_REPORT_KINDS[selected.report_kind]} · {selected.period?.slice(0,7)}</h2>
          <p><Clock3 size={16}/> Hạn {dateLabel(selected.due_at)} {deadlinePassed&&currentStatus!=='approved'&&<b className="blr-overdue">· Quá hạn</b>} · <Status value={currentStatus}/></p></div></div>
      <div className="blr-progressline"><strong>Tiến độ nội dung: {progress.count}/5 phần</strong><div className="blr-progress"><i style={{width:progress.percent+'%'}}/></div><span>{progress.percent}%</span></div>
      {selected.reviewer_comment&&<div className="blr-banner">Nhận xét TTCM: {selected.reviewer_comment}</div>}
      {LEARNING_REPORT_SECTIONS[selected.report_kind].map((section,index)=><section className="blr-form-section" key={section.id}>
        <header><div className="blr-step">{String(index+1).padStart(2,'0')}</div><h3>{section.title}</h3>
          {progress.sections[index]&&<CheckCircle2 size={20} className="blr-done"/>}</header>
        <div className="blr-fields">{section.fields.map(([key,label,type,required])=><TextField key={key}
          label={label} fieldType={type} required={required!==false} value={payload[key]??''} disabled={reportLocked}
          onChange={value=>setPayload(old=>({...old,[key]:value}))}/>)}</div>
      </section>)}
      <Journal key={selected.id} task={selected} rows={sessions} onReload={reloadSessions} onError={setError}/>
      <div className="blr-journal-summary">Tổng hợp nhật ký: <strong>{sessionStats.sessions} buổi · {sessionStats.periods} tiết · {sessionStats.present}/{sessionStats.expected} lượt tham gia · {participationPercent(sessionStats)??'—'}% chuyên cần</strong></div>
      {editable&&<div className="blr-actions blr-bottom-actions">
        <button type="button" disabled={busy} onClick={()=>doSave(false)}><Save size={18}/> Lưu nháp</button>
        <button type="button" className="is-primary" disabled={busy||!progress.ready} onClick={()=>doSave(true)}><Send size={18}/> Gửi TTCM</button>
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
