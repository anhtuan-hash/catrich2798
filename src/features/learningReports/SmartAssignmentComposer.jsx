import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,BookOpenCheck,CalendarClock,CheckCircle2,
  ClipboardList,Link2,RefreshCw,Send,ShieldCheck,UsersRound,X} from 'lucide-react';
import {
  previewSmartLearningAssignments,dispatchSmartLearningAssignments,
  verifySmartLearningInstructor,
} from './learningReportsService.js';
import './SmartAssignmentComposer.css';

const todayMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const kindLabels={gifted:'Bồi dưỡng học sinh giỏi',remedial:'Phụ đạo học sinh'};
export default function SmartAssignmentComposer({
  departmentId,departmentName,eligibleMembers=[],onSuccess,onClose,
}){
  const [month,setMonth]=useState(todayMonth);
  const [kindMode,setKindMode]=useState('both');
  const [scope,setScope]=useState('all');
  const [selectedIds,setSelectedIds]=useState([]);
  const [dueAt,setDueAt]=useState('');
  const [notify,setNotify]=useState(true);
  const [event,setEvent]=useState(true);
  const [preview,setPreview]=useState(null);
  const [loading,setLoading]=useState(false);
  const [sending,setSending]=useState(false);
  const [verifying,setVerifying]=useState('');
  const [chosenNames,setChosenNames]=useState({});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const kinds=useMemo(()=>kindMode==='both'?['gifted','remedial']:[kindMode],[kindMode]);
  const effectiveIds=useMemo(()=>scope==='all'?null:selectedIds.slice().sort(),[scope,selectedIds]);
  const scopeKey=effectiveIds?.join(',')||'*';
  const runPreview=useCallback(async()=>{
    if(!departmentId || (scope==='selected'&&!selectedIds.length)){
      setPreview(null);setError(scope==='selected'?'Hãy chọn ít nhất một giáo viên.':'Chưa có tổ chuyên môn.');
      return;
    }
    setLoading(true);setError('');
    try{
      const data=await previewSmartLearningAssignments({
        departmentId,month,kinds,teacherIds:effectiveIds,
      });
      setPreview(data);
    }catch(e){setPreview(null);setError('Không phân tích được Điểm danh: '+e.message);}
    finally{setLoading(false);}
  },[departmentId,month,kindMode,scope,scopeKey]);

  useEffect(()=>{
    setPreview(null);setNotice('');
    if(scope==='selected'&&!selectedIds.length)return;
    let alive=true;
    const timer=window.setTimeout(async()=>{
      if(!alive)return;
      setLoading(true);setError('');
      try{
        const p=await previewSmartLearningAssignments({
          departmentId,month,kinds,teacherIds:effectiveIds,
        });
        if(alive)setPreview(p);
      }catch(e){if(alive){setPreview(null);setError('Không thể phân tích Điểm danh: '+e.message);}}
      finally{if(alive)setLoading(false);}
    },220);
    return()=>{alive=false;window.clearTimeout(timer);};
  },[departmentId,month,kindMode,scope,scopeKey]);

  const teacherName=id=>eligibleMembers.find(t=>t.id===id)?.name||'Giáo viên';
  const toggle=id=>setSelectedIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const groups=preview?.groups||[];
  const unresolved=preview?.exceptions||[];
  const kindsCount={gifted:groups.filter(g=>g.kind==='gifted').length,
    remedial:groups.filter(g=>g.kind==='remedial').length};
  async function verify(unmatched){
    const key=unmatched.classId+'|'+unmatched.instructorName;
    const id=chosenNames[key];
    if(!id){setError('Chọn đúng tài khoản giáo viên trước khi xác minh.');return;}
    if(!window.confirm('Xác minh tên Điểm danh "'+unmatched.instructorName+
      '" là tài khoản '+teacherName(id)+'? Liên kết này sẽ được sử dụng ở các tháng sau.'))return;
    setVerifying(key);setError('');
    try{
      await verifySmartLearningInstructor({departmentId,sourceName:unmatched.instructorName,teacherId:id});
      setNotice('Đã xác minh danh tính '+unmatched.instructorName+'. Hệ thống tự phân tích lại.');
      await runPreview();
    }catch(e){setError('Không xác minh được: '+e.message);}
    finally{setVerifying('');}
  }
  async function dispatch(e){
    e.preventDefault();
    if(!preview?.fingerprint||loading){setError('Chưa có kết quả phân tích Điểm danh hợp lệ.');return;}
    if(!dueAt||new Date(dueAt).getTime()<=Date.now()){
      setError('Hãy chọn thời hạn nộp trong tương lai.');return;
    }
    const text='Phát hành yêu cầu tháng '+month+'? Tạo mới '+preview.totalNew+
      ' báo cáo, bỏ qua '+preview.totalExisting+' báo cáo đã có'+
      (unresolved.length?', còn '+unresolved.length+' trường hợp cần xác minh':'')+'.';
    if(!window.confirm(text))return;
    setSending(true);setError('');
    try{
      const result=await dispatchSmartLearningAssignments({
        departmentId,month,kinds,teacherIds:effectiveIds,dueAt,
        fingerprint:preview.fingerprint,notification:notify,event,
      });
      await onSuccess?.(result);
    }catch(e){setError('Giao báo cáo chưa hoàn tất: '+e.message+
      '. Nếu dữ liệu Điểm danh vừa thay đổi, hãy nhấn Phân tích lại.');}
    finally{setSending(false);}
  }
  return <form className="blr-smart" onSubmit={dispatch}>
    <header className="blr-smart-head">
      <div><small>BRIAN SMART REPORT ASSIGNMENT</small>
        <h2>Giao báo cáo tự động từ Điểm danh</h2>
        <p>Chọn tháng, hệ thống tự xác định giáo viên dạy HSG, Phụ đạo hoặc cả hai và liên kết đúng buổi giảng dạy.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Đóng"><X size={19}/></button>
    </header>
    {error&&<div className="blr-smart-alert is-error" role="alert"><AlertTriangle size={18}/>{error}</div>}
    {notice&&<div className="blr-smart-alert" role="status"><CheckCircle2 size={18}/>{notice}</div>}
    <div className="blr-smart-grid">
      <label>Tổ chuyên môn<input disabled value={departmentName||'Tổ chuyên môn'}/></label>
      <label>Tháng báo cáo<input required type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
      <label>Loại báo cáo<select value={kindMode} onChange={e=>setKindMode(e.target.value)}>
        <option value="both">Cả HSG và Phụ đạo</option>
        <option value="gifted">Chỉ Bồi dưỡng HSG</option>
        <option value="remedial">Chỉ Phụ đạo</option>
      </select></label>
      <label>Đối tượng<select value={scope} onChange={e=>setScope(e.target.value)}>
        <option value="all">Toàn tổ (tự tìm giáo viên)</option>
        <option value="selected">Giáo viên được chọn</option>
      </select></label>
      <label>Hạn nộp<input required type="datetime-local" value={dueAt}
        onChange={e=>setDueAt(e.target.value)}/></label>
    </div>
    {scope==='selected'&&<div className="blr-smart-members">
      <div><strong>Giáo viên được chọn</strong>
        <button type="button" onClick={()=>setSelectedIds(eligibleMembers.map(m=>m.id))}>Chọn tất cả</button>
        <button type="button" onClick={()=>setSelectedIds([])}>Bỏ chọn</button></div>
      <div>{eligibleMembers.map(m=><label key={m.id}>
        <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={()=>toggle(m.id)}/>{m.name}
      </label>)}</div>
    </div>}
    <div className="blr-smart-flags">
      <label><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/> Gửi thông báo giáo viên</label>
      <label><input type="checkbox" checked={event} onChange={e=>setEvent(e.target.checked)}/> Tạo sự kiện hạn nộp</label>
    </div>
    <section className="blr-smart-preview">
      <header><div><h3><ClipboardList size={19}/> Phân tích dữ liệu Điểm danh</h3>
        <p>Chỉ tính buổi đã chốt, đúng giáo viên thực dạy và môn học của tổ.</p></div>
        <button type="button" onClick={runPreview} disabled={loading||sending}>
          <RefreshCw size={16}/>{loading?'Đang phân tích…':'Phân tích lại'}</button>
      </header>
      {preview&&<div className="blr-smart-metrics">
        <div><small>Nhóm giáo viên / loại</small><strong>{groups.length}</strong></div>
        <div><small>HSG</small><strong>{kindsCount.gifted}</strong></div>
        <div><small>Phụ đạo</small><strong>{kindsCount.remedial}</strong></div>
        <div><small>Cần tạo mới</small><strong>{preview.totalNew||0}</strong></div>
        <div><small>Đã tồn tại</small><strong>{preview.totalExisting||0}</strong></div>
        <div><small>Chưa xác minh</small><strong>{unresolved.length}</strong></div>
      </div>}
      {preview&&groups.length>0&&<div className="blr-smart-table-wrap"><table>
        <thead><tr><th>Giáo viên</th><th>Loại</th><th>Số lớp</th><th>Số buổi</th><th>Trạng thái</th></tr></thead>
        <tbody>{groups.map(g=><tr key={g.teacherId+'|'+g.kind}>
          <td><strong>{g.teacherName}</strong>
            <details><summary>Xem lớp đã tự liên kết</summary>
              {(g.classLinks||[]).map(c=><p key={c.classId}>{c.className} · GV: {c.instructorName}</p>)}
            </details></td>
          <td>{kindLabels[g.kind]}</td><td>{g.classes}</td><td>{g.sessions}</td>
          <td>{g.existingTaskId?<span className="blr-smart-existing">Đã có báo cáo</span>
            :<span className="blr-smart-new">Tạo mới</span>}</td>
        </tr>)}</tbody>
      </table></div>}
      {preview&&!groups.length&&<p className="blr-smart-empty">Chưa tìm thấy nhóm giáo viên có buổi giảng dạy hợp lệ trong phạm vi này.</p>}
      {unresolved.length>0&&<section className="blr-smart-exceptions">
        <h3><AlertTriangle size={18}/> {unresolved.length} trường hợp cần xác minh danh tính</h3>
        <p>Hệ thống không đoán người dạy. Xác minh một lần; tên nguồn sẽ được dùng lại ở các tháng sau.</p>
        {unresolved.map((u,i)=>{
          const k=u.classId+'|'+u.instructorName;
          return <div key={k+'|'+i} className="blr-smart-unmatched">
            <div><strong>{u.instructorName}</strong>
              <small>{u.className} · {kindLabels[u.kind]} · {u.sessions} buổi</small></div>
            <select aria-label={'Chọn giáo viên cho '+u.instructorName}
              value={chosenNames[k]||''} onChange={e=>setChosenNames(x=>({...x,[k]:e.target.value}))}>
              <option value="">Chọn tài khoản giáo viên</option>
              {eligibleMembers.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}
            </select>
            <button type="button" disabled={!chosenNames[k]||verifying===k||sending}
              onClick={()=>verify(u)}><ShieldCheck size={16}/> Xác minh</button>
          </div>;
        })}
      </section>}
    </section>
    <footer className="blr-smart-footer">
      <p><Link2 size={17}/> Liên kết tự động được lưu lâu dài. Báo cáo đã tồn tại và dữ liệu đã duyệt không bị ghi đè.</p>
      <button className="is-primary" type="submit" disabled={loading||sending||!preview?.fingerprint||!groups.length||!dueAt}>
        <Send size={17}/>{sending?'Đang giao báo cáo…':
          'Giao '+(preview?.totalNew||0)+' báo cáo mới và đồng bộ lớp'}
      </button>
    </footer>
  </form>;
}
