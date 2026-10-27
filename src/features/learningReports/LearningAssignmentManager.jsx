import React,{useEffect,useMemo,useState} from 'react';
import {CalendarClock,CheckCircle2,Download,FileText,Search,
  Trash2,UsersRound,X,AlertTriangle,Eye,CheckSquare,Square} from 'lucide-react';
import {LEARNING_REPORT_KINDS,LEARNING_REPORT_STATUSES,reportProgress} from './learningReportsService.js';
import './LearningAssignmentManager.css';
const statusOrder=['all','draft','submitted','revision','approved'];
const safeCsvCell=value=>{
  let s=String(value??'');
  if(/^\s*[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
};
const toCsv=(rows)=>{
  const data=[['Giáo viên','Loại báo cáo','Tháng','Trạng thái','Hạn nộp','Tiến độ','Ngày nộp'],
    ...rows.map(t=>[t.teacherLabel,LEARNING_REPORT_KINDS[t.report_kind],
      String(t.period).slice(0,7),LEARNING_REPORT_STATUSES[t.status],
      t.effective_due_at||'',reportProgress(t.report_kind,t.payload).percent+'%',t.submitted_at||''])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+data.map(r=>r.map(safeCsvCell).join(',')).join('\r\n')],
    {type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='brian-bao-cao-boi-duong-phu-dao.csv';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
};
export function reportCanBeRevoked(task){
  if(!task||task.status!=='draft'||task.submitted_at||task.reviewed_at)return false;
  return !Object.values(task.payload||{}).some(v=>v!==null&&v!==undefined&&
    (typeof v==='object'?Object.keys(v).length>0:String(v).trim()!==''));
}
export function filteredLearningAssignments(tasks,{kind='all',month='all',status='all',query=''}={}){
  const q=query.trim().toLocaleLowerCase('vi');
  return (tasks||[]).filter(t=>
    (kind==='all'||t.report_kind===kind)&&
    (month==='all'||String(t.period||'').slice(0,7)===month)&&
    (status==='all'||t.status===status)&&
    (!q||String(t.teacherLabel||'').toLocaleLowerCase('vi').includes(q)||
      String(LEARNING_REPORT_KINDS[t.report_kind]||'').toLocaleLowerCase('vi').includes(q))
  ).sort((a,b)=>String(b.period).localeCompare(String(a.period))||
    String(a.teacherLabel).localeCompare(String(b.teacherLabel),'vi'));
}
export default function LearningAssignmentManager({
  tasks=[],kind='all',teacherName,onOpen,onBulkRevoke,busy=false,
}){
  const [selectedIds,setSelectedIds]=useState([]);
  const [month,setMonth]=useState('all');
  const [status,setStatus]=useState('all');
  const [query,setQuery]=useState('');
  const enriched=useMemo(()=>(tasks||[]).map(t=>({
    ...t,teacherLabel:teacherName(t.teacher_id),
  })),[tasks,teacherName]);
  const months=useMemo(()=>[...new Set(enriched.map(t=>String(t.period||'').slice(0,7)).filter(Boolean))].sort().reverse(),[enriched]);
  const visible=useMemo(()=>filteredLearningAssignments(enriched,{kind,month,status,query}),[enriched,kind,month,status,query]);
  const revocable=useMemo(()=>visible.filter(reportCanBeRevoked),[visible]);
  const eligibleIds=useMemo(()=>new Set(revocable.map(t=>t.id)),[revocable]);
  useEffect(()=>{setSelectedIds(old=>{const next=old.filter(id=>eligibleIds.has(id));return next.length===old.length?old:next;});},[eligibleIds]);
  const selected=visible.filter(t=>selectedIds.includes(t.id)&&reportCanBeRevoked(t));
  const allSelected=revocable.length>0&&revocable.every(t=>selectedIds.includes(t.id));
  const toggle=id=>setSelectedIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const selectAll=()=>setSelectedIds(old=>[...new Set([...old,...revocable.map(t=>t.id)])]);
  const clear=()=>setSelectedIds([]);
  const submit=async()=>{
    if(!selected.length||busy)return;
    const byKind=selected.reduce((o,t)=>({...o,[t.report_kind]:(o[t.report_kind]||0)+1}),{});
    const preview=[
      'THU HỒI NHIỆM VỤ BÁO CÁO',
      'Đã chọn: '+selected.length+' bản nháp chưa có nội dung.',
      'Bồi dưỡng HSG: '+(byKind.gifted||0)+' · Phụ đạo: '+(byKind.remedial||0),
      'Nhiệm vụ đã có nội dung, đã nộp hoặc đã duyệt không được chọn.',
      'Đây là thao tác xóa nhiệm vụ, không xóa điểm danh. Bạn có chắc chắn?'
    ].join('\n\n');
    if(!window.confirm(preview))return;
    const result=await onBulkRevoke(selected.map(t=>t.id));
    const removed=new Set((result?.removed||[]).map(x=>x.taskId));
    setSelectedIds(old=>old.filter(id=>!removed.has(id)));
  };
  return <section className="blru" aria-label="Quản lý giao báo cáo">
    <div className="blru-header">
      <div><small>QUẢN LÝ BÁO CÁO GIÁO VIÊN</small>
        <h2>Danh sách báo cáo được giao</h2>
        <p>HSG và Phụ đạo dùng chung một bảng theo dõi, lọc độc lập theo từng loại và tháng.</p></div>
      <button type="button" onClick={()=>toCsv(visible)} disabled={!visible.length}>
        <Download size={17}/> Xuất CSV
      </button>
    </div>
    <div className="blru-filters">
      <label><span>Tìm giáo viên</span><span className="blru-input-with-icon"><Search size={17}/>
        <input type="search" value={query} placeholder="Tên giáo viên…" onChange={e=>setQuery(e.target.value)}/>
      </span></label>
      <label><span>Tháng báo cáo</span><select value={month} onChange={e=>setMonth(e.target.value)}>
        <option value="all">Tất cả tháng</option>
        {months.map(m=><option value={m} key={m}>{m.slice(5)}/{m.slice(0,4)}</option>)}
      </select></label>
      <label><span>Trạng thái</span><select value={status} onChange={e=>setStatus(e.target.value)}>
        {statusOrder.map(s=><option key={s} value={s}>{s==='all'?'Tất cả trạng thái':LEARNING_REPORT_STATUSES[s]}</option>)}
      </select></label>
    </div>
    <div className="blru-toolbar">
      <label className="blru-select-all">
        <input type="checkbox" checked={allSelected} disabled={!revocable.length||busy}
          onChange={e=>e.target.checked?selectAll():clear()}/>
        <span>Chọn tất cả</span>
      </label>
      <span className="blru-count">{visible.length} báo cáo · {revocable.length} có thể xóa · {selected.length} đã chọn</span>
      <div className="blru-buttons">
        <button type="button" onClick={clear} disabled={!selectedIds.length||busy}><X size={15}/> Bỏ chọn</button>
        <button type="button" className="blru-danger" onClick={submit} disabled={!selected.length||busy}>
          <Trash2 size={17}/>{busy?'Đang xóa…':'Xóa đã chọn ('+selected.length+')'}
        </button>
      </div>
    </div>
    <div className="blru-table-scroll"><table className="blru-table">
      <thead><tr><th aria-label="Chọn"/><th>Giáo viên</th><th>Loại báo cáo</th><th>Tháng</th>
        <th>Hạn nộp</th><th>Tiến độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{visible.map(t=>{
        const pct=reportProgress(t.report_kind,t.payload).percent;
        const canRemove=reportCanBeRevoked(t);
        const checked=selectedIds.includes(t.id);
        return <tr key={t.id} className={checked?'is-selected':''}>
          <td><input type="checkbox" checked={checked} disabled={!canRemove||busy}
            aria-label={'Chọn báo cáo của '+t.teacherLabel} onChange={()=>toggle(t.id)}/></td>
          <td><strong>{t.teacherLabel}</strong></td>
          <td><span className={'blru-program is-'+t.report_kind}>
            {t.report_kind==='gifted'?<CheckCircle2 size={14}/>:<UsersRound size={14}/>}
            {LEARNING_REPORT_KINDS[t.report_kind]}</span></td>
          <td>{String(t.period||'').slice(0,7)}</td>
          <td>{t.effective_due_at?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(t.effective_due_at)):'—'}</td>
          <td><div className="blru-progress"><i style={{width:pct+'%'}}/></div><small>{pct}%</small></td>
          <td><span className={'blru-status is-'+t.status}>{LEARNING_REPORT_STATUSES[t.status]||t.status}</span></td>
          <td><button type="button" className="blru-view" onClick={()=>onOpen(t.id)}><Eye size={16}/> Xem</button>
            {!canRemove&&<span className="blru-protected" title="Đã nhập nội dung, nộp hoặc duyệt"><CheckCircle2 size={13}/> Bảo vệ</span>}</td>
        </tr>;
      })}</tbody>
    </table></div>
    {!visible.length&&<div className="blru-empty"><FileText size={27}/> Không có báo cáo phù hợp bộ lọc.</div>}
    <footer className="blru-footer"><AlertTriangle size={16}/>
      Chỉ các bản nháp trống được chọn để thu hồi. Báo cáo đã có nội dung, đã nộp hoặc đã duyệt luôn được giữ lại; dữ liệu Điểm danh không bị xóa.
    </footer>
  </section>;
}
