import React, { useMemo, useState } from 'react';
import {
  CalendarDays, ClipboardList, FileBarChart2, FileDown, Printer, CircleCheck,
  ClockAlert, ShieldCheck, ArrowUpRight, Save, Pencil, X, LockKeyhole,
  Cloud, HardDrive, ListTodo, FileSpreadsheet, CalendarClock, CheckCircle2,
} from 'lucide-react';
import { addScheduleItem } from '../../utils/homeroomStore.js';
import { downloadCsv } from '../../utils/homeroomOfflineTools.js';
import {
  HOMEROOM_TASK_STATUSES, localDateIso, summarizeHomeroomTasks, validReportRange,
  buildHomeroomReport, homeroomReportCsvRows,
} from '../../utils/homeroom4Operations.js';
import './HomeroomOperationsCenter.css';

const safe = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const nowISO=()=>localDateIso();
function earlierDay(date,days){
  const m=String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return date;
  const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])-days));
  return d.toISOString().slice(0,10);
}
const EMPTY = { title:'',date:'',status:'Sắp tới',category:'Sinh hoạt lớp',note:'' };
function BlockStat({label,value,icon:Icon,tone='blue'}){
  return <div className="hr4-ops-stat" data-tone={tone}><Icon size={18} aria-hidden="true"/>
    <div><strong>{value}</strong><span>{label}</span></div></div>;
}
function printReport(report){
  // The print page never receives portal PIN, tokens, backup payloads or raw HTML.
  // No network requests: print/PDF is entirely in the user's browser.
  const popup=window.open('','_blank');
  if(!popup)throw new Error('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
  const m=report.meta,t=report.totals;
  const rows=homeroomReportCsvRows(report);
  const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"/>
    <title>Báo cáo Chủ nhiệm ${safe(m.className)}</title>
    <style>
    body{font-family:Arial,sans-serif;color:#183550;margin:28px;font-size:12px}
    h1{text-align:center;font-size:19px;margin:22px 0 8px}
    .sub{text-align:center;margin-bottom:20px;color:#425a76}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #cbd6e6;padding:6px;text-align:left;overflow-wrap:anywhere}
    th{background:#e9f1fc}tr{break-inside:avoid}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
    .meta span{padding:9px;background:#f1f6fd}
    footer{margin-top:30px;display:flex;justify-content:space-between;gap:50px}
    @page{size:A4 landscape;margin:12mm}
    </style></head><body>
    <h1>BÁO CÁO TỔNG HỢP CÔNG TÁC CHỦ NHIỆM</h1>
    <div class="sub">Lớp ${safe(m.className)} · Năm học ${safe(m.schoolYear)} · ${safe(m.start)} đến ${safe(m.end)}</div>
    <div class="meta"><span>Sĩ số đang học: <b>${t.students}</b></span><span>Phiên điểm danh có dữ liệu: <b>${t.sessions}</b></span>
    <span>Lượt có mặt: <b>${t.attendance.present}</b> · Vắng không phép: <b>${t.attendance.unexcused}</b></span>
    <span>Rèn luyện đã xác nhận: <b>${t.conductConfirmed}</b> · Chờ xác nhận: <b>${t.conductPending}</b></span>
    <span>Hồ sơ giấy đủ: <b>${t.paperReady}</b> · Nguồn vnEdu/MOET: <b>${t.sourceCoverage}</b></span>
    <span>Hồ sơ đã đủ và xác nhận: <b>${t.fullyVerified}</b></span></div>
    <table><thead><tr>${rows[8].map(v=>`<th>${safe(v)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(9).map(row=>`<tr>${row.map(v=>`<td>${safe(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <footer><span>Người lập báo cáo</span><span>Xác nhận</span></footer>
    <script>window.addEventListener('load',function(){window.focus();window.print();});<\/script>
    </body></html>`;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
export default function HomeroomOperationsCenter({ workspace, onCommit, goTab, syncState='local' }){
  const today=nowISO();
  const [section,setSection]=useState('tasks');
  const [draft,setDraft]=useState({...EMPTY,date:today});
  const [editingId,setEditingId]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [period,setPeriod]=useState({start:earlierDay(today,29),end:today});
  const [reportError,setReportError]=useState('');
  const metrics=useMemo(()=>summarizeHomeroomTasks(workspace,today),[workspace.schedule,today]);
  const report=useMemo(()=>{
    if(!validReportRange(period.start,period.end))return null;
    try{return buildHomeroomReport(workspace,period.start,period.end);}catch{return null;}
  },[workspace,period.start,period.end]);
  const activeTasks=metrics.tasks.filter(x=>x.status!=='Đã hủy').slice(0,30);

  const edit=(item)=>{
    setEditingId(item.id);setDraft({title:item.title||'',date:item.date||today,status:item.status||'Sắp tới',category:item.category||'Khác',note:item.note||''});
    setError('');
  };
  const saveTask=async()=>{
    if(busy)return;
    const title=draft.title.trim();
    if(!title){setError('Cần nhập nội dung công việc.');return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)){setError('Vui lòng nhập ngày hợp lệ.');return;}
    const duplicate=(workspace.schedule||[]).find(item=>item.id!==editingId &&
      String(item.title).trim().toLowerCase()===title.toLowerCase()&&item.date===draft.date);
    if(duplicate){setError('Lịch đã có công việc cùng tên và ngày. Hãy sửa công việc hiện có thay vì tạo trùng.');return;}
    setBusy(true);setError('');
    try {
      const newId=editingId||(globalThis.crypto?.randomUUID?.()||`schedule-${Date.now()}`);
      const next=editingId
        ? {...workspace,schedule:(workspace.schedule||[]).map(item=>item.id===editingId?
            {...item,...draft,title,updatedAt:new Date().toISOString()}:item)}
        : addScheduleItem(workspace,{...draft,title,id:newId});
      const saved=await onCommit(next,editingId?'Đã cập nhật công việc GVCN.':'Đã thêm công việc GVCN.');
      if(saved?.ok===false){
        setEditingId(newId);
        setError('Đã lưu trên thiết bị nhưng cloud chưa đồng bộ. Kiểm tra kết nối trước khi đóng biểu mẫu.');
        return;
      }
      setDraft({...EMPTY,date:today});setEditingId('');
    }catch(e){setError(e?.message||'Chưa thể lưu công việc.');}
    finally{setBusy(false);}
  };
  const setDone=async(item,done)=>{
    if(busy)return;
    setBusy(true);setError('');
    try{
      const next={...workspace,schedule:(workspace.schedule||[]).map(row=>row.id===item.id?
        {...row,status:done?'Hoàn thành':'Sắp tới',updatedAt:new Date().toISOString()}:row)};
      const saved=await onCommit(next,done?'Đã đánh dấu hoàn thành.':'Đã mở lại công việc.');
      if(saved?.ok===false)setError('Trạng thái mới đang lưu trên thiết bị nhưng chưa đồng bộ cloud.');
    }catch(e){setError(e?.message||'Không thể cập nhật trạng thái.');}
    finally{setBusy(false);}
  };
  const exportCsv=()=>{
    setReportError('');
    if(!report){setReportError('Chọn khoảng ngày bắt đầu và kết thúc hợp lệ.');return;}
    try{downloadCsv(`bao-cao-gvcn-${String(workspace.classProfile?.className||'lop').replace(/[^\w.-]/g,'_')}-${period.start}-${period.end}.csv`,homeroomReportCsvRows(report));}
    catch(e){setReportError(e?.message||'Không thể xuất CSV.');}
  };
  const print=()=>{
    setReportError('');
    if(!report){setReportError('Chọn khoảng ngày hợp lệ.');return;}
    try{printReport(report);}catch(e){setReportError(e?.message||'Không thể mở bản in.');}
  };
  return <section className="hr4-ops" aria-label="Trung tâm công việc và báo cáo GVCN">
    <header className="hr4-ops-head">
      <div><small>HOMEROOM OPERATIONS</small><h2>Công việc & Báo cáo</h2>
        <p>Tổng hợp từ lớp đang mở. Không thay đổi điểm, khóa tuần hoặc hồ sơ nguồn.</p></div>
      <div className="hr4-ops-toggle" role="group" aria-label="Chọn không gian">
        <button type="button" aria-pressed={section==='tasks'} onClick={()=>setSection('tasks')}><ListTodo size={16}/> Công việc</button>
        <button type="button" aria-pressed={section==='reports'} onClick={()=>setSection('reports')}><FileBarChart2 size={16}/> Báo cáo</button>
      </div>
    </header>
    {section==='tasks' ? <>
      <div className="hr4-ops-stats">
        <BlockStat icon={ClipboardList} label="Đang theo dõi" value={metrics.open}/>
        <BlockStat icon={ClockAlert} tone="coral" label="Đã quá hạn" value={metrics.overdue}/>
        <BlockStat icon={CalendarDays} tone="violet" label="Đến hạn hôm nay" value={metrics.today}/>
        <BlockStat icon={CheckCircle2} tone="teal" label="Đã hoàn thành" value={metrics.completed}/>
      </div>
      <div className="hr4-ops-grid">
        <div className="hr4-ops-task-list">
          <div className="hr4-ops-block-header"><h3>Việc cần theo dõi</h3><span>{activeTasks.length} mục gần nhất</span></div>
          {activeTasks.length ? activeTasks.map(item=>{
            const done=item.status==='Hoàn thành';
            const overdue=!done&&item.date&&item.date<today;
            return <article key={item.id} className="hr4-ops-task" data-overdue={!!overdue} data-done={done}>
              <button type="button" className="hr4-ops-done" aria-label={done?`Mở lại ${item.title}`:`Hoàn thành ${item.title}`} title={done?'Mở lại':'Hoàn thành'} disabled={busy} onClick={()=>setDone(item,!done)}><CircleCheck size={21}/></button>
              <div><strong>{item.title}</strong><small>{item.date||'Chưa có ngày'} · {item.category||'Khác'} · {item.status||'Sắp tới'}</small>{item.note?<p>{item.note}</p>:null}</div>
              <button type="button" className="hr4-ops-edit" aria-label={`Sửa ${item.title}`} onClick={()=>edit(item)}><Pencil size={16}/></button>
            </article>;
          }):<div className="hr4-ops-empty">Chưa có công việc được lưu cho lớp này.</div>}
        </div>
        <div className="hr4-ops-task-editor">
          <div className="hr4-ops-block-header"><h3>{editingId?'Sửa công việc':'Thêm công việc mới'}</h3>{editingId?<button type="button" onClick={()=>{setEditingId('');setDraft({...EMPTY,date:today});setError('');}}><X size={17}/> Hủy</button>:null}</div>
          <label>Nội dung công việc<input value={draft.title} maxLength={180} placeholder="Ví dụ: Rà soát hồ sơ tuần này" onChange={e=>setDraft(x=>({...x,title:e.target.value}))}/></label>
          <div className="hr4-ops-fields">
            <label>Ngày đến hạn<input type="date" value={draft.date} onChange={e=>setDraft(x=>({...x,date:e.target.value}))}/></label>
            <label>Trạng thái<select value={draft.status} onChange={e=>setDraft(x=>({...x,status:e.target.value}))}>{HOMEROOM_TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
          </div>
          <label>Nhóm công việc<select value={draft.category} onChange={e=>setDraft(x=>({...x,category:e.target.value}))}>
            {['Sinh hoạt lớp','Hồ sơ','Tư vấn học sinh','Họp phụ huynh','Kiểm tra','Khác'].map(s=><option key={s}>{s}</option>)}
          </select></label>
          <label>Ghi chú<textarea rows={3} value={draft.note} onChange={e=>setDraft(x=>({...x,note:e.target.value}))}/></label>
          {error?<p className="hr4-ops-error" role="alert">{error}</p>:null}
          <button type="button" className="hr4-ops-primary" onClick={saveTask} disabled={busy}><Save size={16}/>{busy?'Đang lưu…':editingId?'Lưu thay đổi':'Thêm vào lịch'}</button>
        </div>
      </div>
    </> : <>
      <div className="hr4-ops-period">
        <label>Từ ngày<input type="date" value={period.start} onChange={e=>setPeriod(p=>({...p,start:e.target.value}))}/></label>
        <label>Đến ngày<input type="date" value={period.end} onChange={e=>setPeriod(p=>({...p,end:e.target.value}))}/></label>
        <button type="button" onClick={exportCsv} disabled={!report}><FileSpreadsheet size={16}/> Xuất CSV/Excel</button>
        <button type="button" onClick={print} disabled={!report}><Printer size={16}/> In / Lưu PDF</button>
      </div>
      {report ? <>
        <div className="hr4-ops-stats">
          <BlockStat icon={ClipboardList} value={report.totals.students} label="Học sinh đang học"/>
          <BlockStat icon={CalendarClock} tone="teal" value={report.totals.sessions} label="Phiên điểm danh đã lưu"/>
          <BlockStat icon={CircleCheck} tone="violet" value={report.totals.conductConfirmed} label="Ghi nhận rèn luyện xác nhận"/>
          <BlockStat icon={ShieldCheck} tone="coral" value={report.totals.fullyVerified} label="Hồ sơ đủ & đã xác nhận"/>
        </div>
        <div className="hr4-ops-report-overview">
          <p><strong>Chuyên cần</strong> · Có mặt {report.totals.attendance.present} lượt; đi trễ {report.totals.attendance.late} lượt; vắng phép {report.totals.attendance.excused} lượt; vắng không phép {report.totals.attendance.unexcused} lượt.</p>
          <p><strong>Hồ sơ</strong> · Giấy tờ đủ {report.totals.paperReady}/{report.totals.students}; có dữ liệu vnEdu và MOET {report.totals.sourceCoverage}/{report.totals.students}.</p>
          <p><strong>Rèn luyện</strong> · {report.totals.conductPending} ghi nhận đang chờ xác nhận trong khoảng báo cáo.</p>
        </div>
        <p className="hr4-ops-notice">Báo cáo phản ánh những phiên, ghi nhận và hồ sơ thực sự được lưu. Không suy diễn các buổi học chưa ghi điểm danh. Báo cáo hồ sơ phản ánh trạng thái tại thời điểm xuất.</p>
      </>:<p className="hr4-ops-error" role="alert">Khoảng ngày không hợp lệ; ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
      {reportError?<p className="hr4-ops-error" role="alert">{reportError}</p>:null}
    </>}
    <footer className="hr4-ops-safety">
      <div><LockKeyhole size={20}/><span><strong>Trạng thái bảo vệ dữ liệu</strong><small>{syncState==='cloud'?'Lần lưu gần nhất đã đồng bộ cloud':'Đang dùng dữ liệu thiết bị hoặc chưa xác nhận đồng bộ cloud'} · {(workspace.backups||[]).length} điểm sao lưu · {(workspace.auditLogs||[]).length} mục nhật ký</small></span></div>
      <button type="button" onClick={()=>goTab('safety')}>Mở An toàn dữ liệu <ArrowUpRight size={16}/></button>
    </footer>
  </section>;
}
