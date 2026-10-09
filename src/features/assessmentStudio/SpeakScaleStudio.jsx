import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BarChart3,BookOpenCheck,Check,ClipboardList,Download,FileDown,FileUp,Info,Plus,Printer,RotateCcw,Save,ShieldCheck,Users,Volume2} from 'lucide-react';
import {
 SPEAKING_CRITERIA,SPEAKING_ANCHORS,EMPTY_MARKS,INITIAL_META,EMPTY_INTERVENTION,
 normalizeStudent,parseRoster,scoreMarks,buildRecord,stats,pairedComparison,checklist,
 makeCsv,createBackup,verifyBackup,recordKey
} from './speakingCore.js';
import './SpeakScaleStudio.css';

const today=()=>new Date().toISOString().slice(0,10);
const fmt=iso=>iso?new Date(iso).toLocaleString('vi-VN'):'—';
const safe=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const levels=['Không có minh chứng','Chưa đạt','Đạt một phần','Đạt yêu cầu','Tốt / Vượt yêu cầu'];
function download(filename,content,type){
 const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function reportHTML({meta,roster,records,intervention,revisions,demo,includeNames}){
 const paired=pairedComparison(records),pre=stats(records,'pre'),post=stats(records,'post');
 const checks=checklist({meta,roster,records,intervention,demo});
 const names=new Map(roster.map(s=>[s.code,s.name]));
 const table='<table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ tên</th><th>Lần</th><th>Điểm</th><th>Ghi nhận</th></tr></thead><tbody>'+
 records.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(r.code)+'</td><td>'+(includeNames?safe(names.get(r.code)):('Học sinh '+(i+1)))+'</td><td>'+(r.phase==='pre'?'Trước':'Sau')+'</td><td>'+r.score+'/20</td><td>'+safe(r.comment)+'</td></tr>').join('')+'</tbody></table>';
 const anchors=SPEAKING_CRITERIA.map(c=>'<h3>'+safe(c.name)+' · '+safe(c.vi)+'</h3><ol start="0">'+SPEAKING_ANCHORS[c.id].map(v=>'<li>'+safe(v)+'</li>').join('')+'</ol>').join('');
 const changes=paired.pairs.map(p=>'<tr><td>'+safe(p.code)+'</td><td>'+p.before+'</td><td>'+p.after+'</td><td>'+(p.change>0?'+':'')+p.change+'</td></tr>').join('');
 const bar=SPEAKING_CRITERIA.map(c=>'<tr><td>'+safe(c.vi)+'</td><td>'+(pre.criteria[c.id]?.toFixed(2)??'—')+'</td><td>'+(post.criteria[c.id]?.toFixed(2)??'—')+'</td></tr>').join('');
 const marks=checks.items.map(c=>'<li>'+(c.ok?'✓':'○')+' '+safe(c.label)+'</li>').join('');
 return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>BRIAN SpeakScale · Hồ sơ đánh giá</title><style>'+
 'body{font:14px/1.6 Arial,sans-serif;max-width:850px;margin:30px auto;color:#233347;padding:0 20px}h1{font-size:24px;margin:8px 0}h2{border-bottom:1px solid #d6e0ec;margin-top:28px;font-size:18px}h3{font-size:15px}p{margin:7px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d2dbe7;text-align:left;padding:7px;vertical-align:top}th{background:#edf3fc}li{margin:3px 0}section{break-inside:avoid}.flag{font-weight:bold;color:#a04434}.meta{background:#eef4fc;padding:14px;border-radius:10px}.foot{font-size:11px;color:#697891;margin-top:25px}button{padding:9px 15px}@media print{button{display:none}body{margin:0;padding:0}}'+
 '</style></head><body><h1>BRIAN SpeakScale · Hồ sơ đánh giá Speaking</h1>'+
 (demo?'<h2 class="flag">DỮ LIỆU MINH HỌA — KHÔNG PHẢI MINH CHỨNG THỰC TẾ</h2>':'')+
 '<div class="meta"><p><b>Đợt đánh giá:</b> '+safe(meta.title)+'</p><p><b>Lớp:</b> '+safe(meta.className)+' &nbsp; <b>Ngày:</b> '+safe(meta.date)+'</p><p><b>Giáo viên:</b> '+safe(meta.teacher)+'</p><p><b>Nhiệm vụ:</b> '+safe(meta.task)+'</p><p><b>Mục tiêu:</b> '+safe(meta.objective)+'</p></div>'+
 '<h2>1. Công cụ và rubric chấm</h2><p>Năm tiêu chí, mỗi tiêu chí 0–4 điểm, tổng 20. Giáo viên chấm trực tiếp, không sử dụng AI.</p>'+anchors+
 '<h2>2. Kết quả đánh giá</h2><p>Trước điều chỉnh: '+pre.count+' học sinh; bình quân '+(pre.average?.toFixed(2)??'—')+'/20. Sau điều chỉnh: '+post.count+' học sinh; bình quân '+(post.average?.toFixed(2)??'—')+'/20.</p>'+table+
 '<h3>Điểm trung bình theo tiêu chí</h3><table><thead><tr><th>Tiêu chí</th><th>Trước /4</th><th>Sau /4</th></tr></thead><tbody>'+bar+'</tbody></table>'+
 '<h2>3. Điều chỉnh hoạt động dạy học</h2><p><b>Vấn đề quan sát:</b> '+safe(intervention.finding||'Chưa ghi nhận')+'</p><p><b>Biện pháp:</b> '+safe(intervention.action||'Chưa ghi nhận')+'</p><p><b>Ngày triển khai:</b> '+safe(intervention.date||'Chưa ghi nhận')+'</p><p><b>Mô tả minh chứng:</b> '+safe(intervention.evidence||'Chưa ghi nhận')+'</p>'+
 '<h2>4. Đánh giá lại cùng học sinh</h2><p>Số học sinh có đủ hai lần đánh giá: '+paired.count+
 '. Chênh lệch bình quân: '+(paired.delta===null?'Chưa có dữ liệu':((paired.delta>0?'+':'')+paired.delta.toFixed(2)+' điểm /20'))+'.</p>'+
 '<table><thead><tr><th>Mã HS</th><th>Trước /20</th><th>Sau /20</th><th>Chênh lệch</th></tr></thead><tbody>'+changes+'</tbody></table>'+
 '<p><b>Nhận xét:</b> '+safe(intervention.reflection||'Chưa ghi nhận')+'</p>'+
 '<h2>5. Tự rà soát hồ sơ</h2><p>'+checks.done+'/'+checks.total+' thành phần được ghi nhận.</p><ul>'+marks+'</ul>'+
 '<p>Không tự động kết luận đạt điểm thi đua. Mức thay đổi điểm không chứng minh quan hệ nhân quả; giáo viên cần đối chiếu đề đánh giá tương đương và minh chứng gốc.</p>'+
 '<h3>Lịch sử điều chỉnh điểm</h3><p>'+ (revisions.length?revisions.map(x=>safe(x.code)+' ('+safe(x.phase)+'): '+x.before+' → '+x.after+'; lý do: '+safe(x.reason)+'; '+safe(x.at)).join('<br>'):'Không có điều chỉnh.')+'</p>'+
 '<p class="foot">BRIAN English · Báo cáo tạo tại trình duyệt từ dữ liệu nhập thủ công. Không được lưu trên máy chủ BRIAN. Xuất ngày '+safe(fmt(new Date().toISOString()))+'.</p>'+
 '<button onclick="window.print()">In / Lưu PDF</button></body></html>';
}

function SummaryMetric({label,value,sub}){return <div className="ss-metric"><small>{label}</small><b>{value}</b>{sub&&<em>{sub}</em>}</div>}
function Pill({children}){return <span className="ss-pill">{children}</span>}

export default function SpeakScaleStudio({onBack}){
 const [meta,setMeta]=useState({...INITIAL_META,date:today()});
 const [roster,setRoster]=useState([]);
 const [records,setRecords]=useState([]);
 const [intervention,setIntervention]=useState({...EMPTY_INTERVENTION});
 const [revisions,setRevisions]=useState([]);
 const [demo,setDemo]=useState(false);
 const [tab,setTab]=useState('setup');
 const [selected,setSelected]=useState('');
 const [phase,setPhase]=useState('pre');
 const [marks,setMarks]=useState({...EMPTY_MARKS});
 const [comment,setComment]=useState('');
 const [reason,setReason]=useState('');
 const [newCode,setNewCode]=useState('');
 const [newName,setNewName]=useState('');
 const [bulk,setBulk]=useState('');
 const [showRubric,setShowRubric]=useState(false);
 const [showNames,setShowNames]=useState(false);
 const [alert,setAlert]=useState(null);
 const fileRef=useRef(null);
 const pre=useMemo(()=>stats(records,'pre'),[records]);
 const post=useMemo(()=>stats(records,'post'),[records]);
 const paired=useMemo(()=>pairedComparison(records),[records]);
 const review=useMemo(()=>checklist({meta,roster,records,intervention,demo}),[meta,roster,records,intervention,demo]);
 const current=records.find(r=>r.code===selected&&r.phase===phase);
 const checked=Object.values(marks).every(v=>Number.isInteger(v)&&v>=0&&v<=4);
 const score=checked?Object.values(marks).reduce((a,b)=>a+b,0):null;
 const status=(message,type='success')=>{setAlert({message,type});};
 const resetFeedback=()=>setAlert(null);
 const patchMeta=(key,value)=>setMeta(x=>({...x,[key]:value}));
 const patchIntervention=(key,value)=>setIntervention(x=>({...x,[key]:value}));
 const openRecord=(code,level=phase)=>{
  const saved=records.find(r=>r.code===code&&r.phase===level);
  setSelected(code);setPhase(level);setMarks(saved?{...saved.marks}:{...EMPTY_MARKS});
  setComment(saved?.comment||'');setReason('');resetFeedback();
 };
 useEffect(()=>{ if(roster.length&&!roster.some(s=>s.code===selected))openRecord(roster[0].code);},[roster,selected]); // eslint-disable-line react-hooks/exhaustive-deps
 const addStudent=()=>{
  resetFeedback();
  try{
   const person=normalizeStudent({code:newCode,name:newName});
   if(roster.some(s=>s.code===person.code))throw new Error('Mã học sinh này đã có trong danh sách.');
   if(roster.length>=200)throw new Error('Giới hạn 200 học sinh.');
   setRoster(a=>[...a,person]);setNewCode('');setNewName('');
   if(!selected)openRecord(person.code);
   status('Đã thêm '+person.name+'.');
  }catch(e){status(e.message,'error');}
 };
 const addBulk=()=>{
  resetFeedback();
  try{
   const students=parseRoster(bulk,roster);
   setRoster(a=>[...a,...students]);if(!selected)openRecord(students[0].code);
   setBulk('');status('Đã thêm '+students.length+' học sinh.');
  }catch(e){status(e.message,'error');}
 };
 const saveScore=()=>{
  resetFeedback();
  try{
   if(!selected)throw new Error('Hãy thêm và chọn học sinh trước.');
   if(!meta.className.trim()||!meta.objective.trim()||!meta.task.trim())throw new Error('Vui lòng khai báo lớp, mục tiêu và nhiệm vụ tại bước Thiết lập.');
   if(phase==='post'){
    if(!records.some(r=>r.code===selected&&r.phase==='pre'))throw new Error('Cần có điểm trước điều chỉnh của học sinh này.');
    if(!intervention.action.trim()||!intervention.date||!intervention.evidence.trim())throw new Error('Hãy ghi biện pháp, ngày thực hiện và thông tin minh chứng trước khi chấm lại.');
   }
   const record=buildRecord({code:selected,phase,marks,comment,assessor:meta.teacher});
   const prior=records.find(r=>r.code===record.code&&r.phase===record.phase);
   if(prior){
    if(!reason.trim())throw new Error('Khi sửa điểm đã lưu, cần ghi lý do chỉnh sửa.');
    if(reason.length>400)throw new Error('Lý do chỉnh sửa tối đa 400 ký tự.');
    setRevisions(a=>[...a,{code:selected,phase,before:prior.score,after:record.score,reason:reason.trim(),at:record.assessedAt}]);
    setRecords(a=>a.map(r=>r.code===selected&&r.phase===phase?record:r));setReason('');status('Đã cập nhật điểm và lưu lịch sử điều chỉnh.');
   }else{
    setRecords(a=>[...a,record]);status('Đã ghi nhận '+(phase==='pre'?'đánh giá ban đầu':'đánh giá lại')+' cho '+selected+'.');
   }
  }catch(e){status(e.message,'error');}
 };
 const demoLoad=()=>{
  if((roster.length||records.length)&&!window.confirm('Thay dữ liệu đang nhập bằng ví dụ minh họa? Hãy xuất bản sao JSON trước nếu muốn giữ dữ liệu.'))return;
  const students=Array.from({length:6},(_,i)=>({code:'DEMO'+String(i+1).padStart(2,'0'),name:'Học sinh minh họa '+(i+1)}));
  const before=[[2,2,2,3,2],[2,1,2,2,2],[3,3,2,2,3],[1,2,2,1,2],[3,2,3,3,3],[2,2,1,2,2]];
  const after=[[3,3,3,3,3],[3,2,3,3,3],[4,3,4,3,4],[2,3,3,2,3],[4,4,3,4,4],[3,3,3,3,3]];
  const entries=[];
  students.forEach((s,i)=>{['pre','post'].forEach((p,j)=>{
    entries.push(buildRecord({code:s.code,phase:p,marks:Object.fromEntries(SPEAKING_CRITERIA.map((c,n)=>[c.id,(j?after:before)[i][n]])),
      comment:'Dữ liệu minh họa phục vụ thử nghiệm',assessor:'Giáo viên minh họa'}));
  })});
  setMeta({title:'Speaking Presentation — DEMO',className:'12.6 (Demo)',objective:'Express and support opinions orally',task:'Individual presentation — 2 minutes',teacher:'Giáo viên minh họa',date:today()});
  setIntervention({finding:'Fluency và Vocabulary là hai tiêu chí cần tăng cường.',action:'Luyện nói theo cặp với từ khóa và phản hồi rubric.',date:today(),evidence:'Phiếu luyện tập MINH HỌA (không có hồ sơ gốc).',reflection:'Điểm trong ví dụ tăng, không phải quan sát thực tế.'});
  setRoster(students);setRecords(entries);setRevisions([]);setDemo(true);setTab('analytics');
  openRecord(students[0].code,'pre');status('Đã nạp dữ liệu minh họa. Báo cáo được đánh dấu DEMO.');
 };
 const clearAll=()=>{
  if(!window.confirm('Xóa toàn bộ dữ liệu trong phiên hiện tại? BRIAN không thể khôi phục nếu bạn chưa xuất JSON.'))return;
  setMeta({...INITIAL_META,date:today()});setRoster([]);setRecords([]);setIntervention({...EMPTY_INTERVENTION});
  setRevisions([]);setSelected('');setPhase('pre');setMarks({...EMPTY_MARKS});setComment('');setReason('');setDemo(false);setTab('setup');status('Đã tạo phiên trống.');
 };
 const saveBackup=()=>{download('BRIAN-SpeakScale-'+(meta.className||'class').replace(/[^a-z0-9_-]/gi,'_')+'.json',createBackup({meta,roster,records,intervention,revisions,demo}),'application/json;charset=utf-8');status('Đã xuất JSON. Hãy lưu file tại nơi an toàn nếu chứa thông tin học sinh thật.');};
 const importBackup=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>1_000_000)throw new Error('Tệp sao lưu vượt 1 MB.');
   const data=verifyBackup(JSON.parse(await file.text()));
   if((roster.length||records.length)&&!window.confirm('Nhập tệp sẽ thay dữ liệu phiên hiện tại. Tiếp tục?'))return;
   setMeta(data.meta);setRoster(data.roster);setRecords(data.records);setIntervention(data.intervention);
   setRevisions(data.revisions);setDemo(data.demo);setSelected('');setTab('setup');setMarks({...EMPTY_MARKS});
   status('Đã khôi phục '+data.roster.length+' học sinh và '+data.records.length+' kết quả hợp lệ.');
  }catch(error){status('Không thể nhập file: '+error.message,'error');}
 };
 const printReport=()=>{
  const popup=window.open('','_blank','noopener,noreferrer');
  if(!popup){status('Safari đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.','error');return;}
  popup.document.open();popup.document.write(reportHTML({meta,roster,records,intervention,revisions,demo,includeNames:showNames}));popup.document.close();
 };
 const exportCSV=()=>{download('BRIAN-SpeakScale-results.csv',makeCsv(roster,records,demo),'text/csv;charset=utf-8');status('Đã xuất CSV nội bộ. File bao gồm mã và họ tên học sinh.');};
 const setCriterion=(id,value)=>setMarks(x=>({...x,[id]:value===''?null:Number(value)}));
 const completed=roster.length?Math.round(pre.count/roster.length*100):0;
 return <div className="ss-root">
  <div className="ss-heading">
   <div><div className="ss-eyebrow"><Volume2 size={15}/> BRIAN ENGLISH · ASSESSMENT TOOL 01 / 12</div><h2>SpeakScale <span>Speaking Assessment</span></h2><p>Chấm nói theo tiêu chí minh bạch · Phân tích từng lớp · Minh chứng điều chỉnh dạy học</p></div>
   <div className="ss-heading-side"><Pill><ShieldCheck size={13}/> NO AI</Pill><Pill>Dữ liệu chỉ trong phiên</Pill></div>
  </div>
  <div className="ss-notice"><Info size={17}/><span><b>Chế độ giáo viên — dữ liệu lưu trong bộ nhớ phiên trình duyệt.</b> Không tự đồng bộ Supabase, không tự lưu khi tải lại trang. Để lưu kết quả, hãy xuất <b>JSON sao lưu</b>. Không nhập dữ liệu học sinh thật trên thiết bị dùng chung.</span></div>
  <div className="ss-toolbar">
   <div className="ss-actions">
    {onBack&&<button type="button" className="ss-btn ss-quiet" onClick={onBack}><ArrowLeft size={16}/> 12 công cụ</button>}
    <button type="button" className="ss-btn ss-quiet" onClick={demoLoad}><BookOpenCheck size={15}/> Xem dữ liệu mẫu</button>
    <button type="button" className="ss-btn ss-quiet" onClick={clearAll}><RotateCcw size={15}/> Phiên mới</button>
   </div>
   <div className="ss-actions">
    <button type="button" className="ss-btn ss-quiet" onClick={()=>fileRef.current?.click()}><FileUp size={15}/> Nhập JSON</button>
    <input hidden type="file" accept=".json,application/json" ref={fileRef} onChange={importBackup}/>
    <button type="button" className="ss-btn ss-main" onClick={saveBackup}><Download size={16}/> Sao lưu JSON</button>
   </div>
  </div>
  {alert&&<div role="status" className={'ss-feedback '+(alert.type==='error'?'is-error':'')}><span>{alert.message}</span><button type="button" aria-label="Đóng thông báo" onClick={resetFeedback}>×</button></div>}
  <div className="ss-summary">
   <SummaryMetric label="Học sinh trong danh sách" value={roster.length} sub="Mã định danh duy nhất"/>
   <SummaryMetric label="Đã đánh giá lần đầu" value={pre.count} sub={completed+'% danh sách'}/>
   <SummaryMetric label="Đã đánh giá lại" value={post.count} sub="Sau biện pháp điều chỉnh"/>
   <SummaryMetric label="Đối chiếu cùng học sinh" value={paired.count} sub={paired.delta===null?'Chưa có':'Thay đổi '+(paired.delta>=0?'+':'')+paired.delta.toFixed(1)+' điểm'}/>
  </div>
  <div className="ss-tabs" role="tablist" aria-label="Quy trình SpeakScale">
   {[['setup','1 · Thiết lập','settings'],['rubric','2 · Rubric','rubric'],['score','3 · Chấm nói','score'],['analytics','4 · Phân tích','analytics'],['evidence','5 · Minh chứng','evidence']].map(([id,title])=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?'active':''} key={id} onClick={()=>{setTab(id);resetFeedback();}}>{title}</button>)}
  </div>

  {tab==='setup'&&<div className="ss-columns">
   <section className="ss-panel">
    <h3><ClipboardList size={19}/> Thông tin đợt đánh giá</h3>
    <div className="ss-fields">
     {[
      ['title','Tên đợt đánh giá','Ví dụ: Oral Presentation – Unit 4'],
      ['className','Lớp','Ví dụ: 12.6'],
      ['teacher','Giáo viên','Tên người chấm'],
      ['objective','Mục tiêu đánh giá','Ví dụ: Express and defend opinions'],
      ['task','Nhiệm vụ Speaking','Ví dụ: Individual talk – 2 minutes'],
     ].map(([key,label,placeholder])=><label key={key} className="ss-label">{label}<input value={meta[key]} maxLength={250} placeholder={placeholder} onChange={e=>patchMeta(key,e.target.value)}/></label>)}
     <label className="ss-label">Ngày tổ chức<input type="date" value={meta.date} onChange={e=>patchMeta('date',e.target.value)}/></label>
    </div>
    <button type="button" className="ss-btn ss-main" onClick={()=>setTab('rubric')}>Xem bảng tiêu chí →</button>
   </section>
   <section className="ss-panel">
    <h3><Users size={19}/> Danh sách học sinh</h3>
    <p className="ss-muted">Nhập học sinh theo mã ổn định, giữ số 0 đầu mã để ghép kết quả trước–sau.</p>
    <div className="ss-roster-inline">
     <label className="ss-label">Mã học sinh<input placeholder="S001" value={newCode} onChange={e=>setNewCode(e.target.value.toUpperCase())}/></label>
     <label className="ss-label">Họ và tên<input placeholder="Nguyễn Văn A" value={newName} onChange={e=>setNewName(e.target.value)}/></label>
     <button type="button" className="ss-btn ss-main" onClick={addStudent}><Plus size={15}/> Thêm</button>
    </div>
    <details className="ss-details"><summary>Dán danh sách từ Excel (tối đa 80 dòng/lượt)</summary>
     <p className="ss-muted">Mỗi dòng: <b>Mã học sinh | Họ tên</b> hoặc hai cột sao chép từ Excel.</p>
     <textarea rows={5} value={bulk} placeholder={'S001 | Nguyễn Văn A\nS002 | Trần Thị B'} onChange={e=>setBulk(e.target.value)}/>
     <button type="button" className="ss-btn ss-quiet" onClick={addBulk}>Kiểm tra và thêm danh sách</button>
    </details>
    {roster.length>0?<div className="ss-roster-list">{roster.map(person=><div key={person.code}><strong>{person.code}</strong><span>{person.name}</span><small>{records.filter(r=>r.code===person.code).length}/2 lượt</small></div>)}</div>:<div className="ss-empty">Chưa có học sinh. Bạn có thể thêm thủ công, dán Excel hoặc nạp dữ liệu mẫu.</div>}
   </section>
  </div>}

  {tab==='rubric'&&<section className="ss-panel">
    <div className="ss-section-top"><div><h3><BookOpenCheck size={20}/> Rubric Speaking · 20 điểm</h3><p className="ss-muted">Mỗi tiêu chí 0–4 điểm. Các mô tả này được công bố cố định trước khi đánh giá; không sử dụng AI.</p></div><button className="ss-btn ss-main" type="button" onClick={()=>setTab('score')}>Bắt đầu chấm →</button></div>
    <div className="ss-rubric-table"><table><thead><tr><th>Tiêu chí</th>{levels.map((l,i)=><th key={i}>{i} điểm<br/><small>{l}</small></th>)}</tr></thead><tbody>{SPEAKING_CRITERIA.map(c=><tr key={c.id}><th>{c.name}<br/><small>{c.vi}</small></th>{SPEAKING_ANCHORS[c.id].map((d,i)=><td key={i}>{d}</td>)}</tr>)}</tbody></table></div>
    <p className="ss-muted">Hướng dẫn: chấm theo minh chứng quan sát thực tế của từng học sinh. Điểm 0 chỉ sử dụng khi không có minh chứng phù hợp, không mặc định cho học sinh vắng mặt.</p>
  </section>}

  {tab==='score'&&<div className="ss-columns ss-score-layout">
   <section className="ss-panel">
    <div className="ss-section-top"><div><h3><Volume2 size={19}/> Phiếu chấm Speaking</h3><p className="ss-muted">Chọn học sinh và lượt đánh giá. Tất cả 5 tiêu chí phải được chấm.</p></div><div className="ss-score-badge">{score===null?'—':score}<small>/20</small></div></div>
    <div className="ss-picker">
     <label className="ss-label">Học sinh<select value={selected} onChange={e=>openRecord(e.target.value,phase)}><option value="">Chọn học sinh...</option>{roster.map(s=><option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}</select></label>
     <label className="ss-label">Lượt đánh giá<select value={phase} onChange={e=>openRecord(selected,e.target.value)}><option value="pre">Trước điều chỉnh</option><option value="post">Sau điều chỉnh</option></select></label>
    </div>
    {SPEAKING_CRITERIA.map(c=><div className="ss-criterion" key={c.id}>
      <div className="ss-criterion-title"><b>{c.name}</b><span>{c.vi}</span></div>
      <div className="ss-level-selector">{[0,1,2,3,4].map(n=><label key={n} className={marks[c.id]===n?'selected':''}><input type="radio" name={'mark-'+c.id} checked={marks[c.id]===n} onChange={()=>setCriterion(c.id,String(n))}/>{n}</label>)}</div>
      <p>{marks[c.id]===null?'Chưa chọn điểm.':SPEAKING_ANCHORS[c.id][marks[c.id]]}</p>
    </div>)}
    <label className="ss-label">Nhận xét theo minh chứng quan sát<textarea rows={3} maxLength={1500} value={comment} placeholder="Nhận xét cụ thể về bài nói, lỗi thường gặp, hướng khắc phục..." onChange={e=>setComment(e.target.value)}/></label>
    {current&&<div className="ss-correction"><b>Đang chỉnh sửa một phiếu đã lưu</b><p>Điểm trước đó: {current.score}/20 · {fmt(current.assessedAt)}. Cần ghi lý do để hệ thống lưu lịch sử chỉnh sửa trong bản sao JSON và báo cáo.</p><label className="ss-label">Lý do điều chỉnh điểm<input maxLength={400} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Nhập nhầm tiêu chí Fluency"/></label></div>}
    <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={saveScore} disabled={!roster.length}><Save size={16}/>{current?'Ghi bản chỉnh sửa':'Lưu kết quả'}</button><button type="button" className="ss-btn ss-quiet" onClick={()=>setTab('analytics')}>Xem phân tích →</button></div>
   </section>
   <aside className="ss-panel"><h3>Tiến độ của lớp</h3><div className="ss-switch"><button type="button" className={phase==='pre'?'chosen':''} onClick={()=>openRecord(selected,'pre')}>Trước</button><button type="button" className={phase==='post'?'chosen':''} onClick={()=>openRecord(selected,'post')}>Sau</button></div>
    {roster.length?<div className="ss-progress-list">{roster.map(s=>{const r=records.find(r=>r.code===s.code&&r.phase===phase);return <button key={s.code} type="button" onClick={()=>openRecord(s.code,phase)} className={selected===s.code?'chosen':''}><span><strong>{s.code}</strong><small>{s.name}</small></span><b>{r?r.score+'/20':'Chưa chấm'}</b></button>})}</div>:<div className="ss-empty">Vào bước Thiết lập để thêm học sinh.</div>}
    <div className="ss-inline-note">Khi chấm sau điều chỉnh, giáo viên phải có điểm trước điều chỉnh của cùng học sinh và ghi biện pháp thực tế tại bước Minh chứng.</div>
   </aside>
  </div>}

  {tab==='analytics'&&<div className="ss-columns">
   <section className="ss-panel">
    <h3><BarChart3 size={19}/> Phân tích năng lực Speaking</h3>
    <p className="ss-muted">Trung bình của các lượt đánh giá đã ghi nhận, không phải dữ liệu mô phỏng nếu bạn chưa nạp ví dụ.</p>
    {SPEAKING_CRITERIA.map(c=><div className="ss-chartrow" key={c.id}><div><b>{c.vi}</b><small>Trước: {pre.criteria[c.id]===null?'—':pre.criteria[c.id].toFixed(2)} /4 · Sau: {post.criteria[c.id]===null?'—':post.criteria[c.id].toFixed(2)} /4</small></div><div className="ss-bars"><div className="ss-track"><i style={{width:((pre.criteria[c.id]||0)/4*100)+'%'}}/></div><div className="ss-track after"><i style={{width:((post.criteria[c.id]||0)/4*100)+'%'}}/></div></div></div>)}
    <div className="ss-legend"><span>● Trước điều chỉnh</span><span>● Sau điều chỉnh</span></div>
   </section>
   <section className="ss-panel"><h3>Đối chiếu trước và sau</h3>
    <div className="ss-summary-inline"><SummaryMetric label="Số học sinh ghép cặp" value={paired.count}/><SummaryMetric label="Thay đổi trung bình" value={paired.delta===null?'—':(paired.delta>0?'+':'')+paired.delta.toFixed(2)} sub="Điểm /20"/></div>
    <div className="ss-table-wrap"><table><thead><tr><th>Mã HS</th><th>Trước</th><th>Sau</th><th>Chênh lệch</th></tr></thead><tbody>{paired.pairs.map(x=><tr key={x.code}><td>{x.code}</td><td>{x.before}</td><td>{x.after}</td><td className={x.change>0?'ss-positive':''}>{x.change>0?'+':''}{x.change}</td></tr>)}</tbody></table></div>
    {!paired.count&&<div className="ss-empty">Cần có kết quả ở cả hai lần của cùng mã học sinh để tính mức thay đổi.</div>}
    <p className="ss-muted">Chỉ đối chiếu khi nhiệm vụ và chuẩn đánh giá giữa hai lần tương đương; sự khác biệt điểm số không tự chứng minh hiệu quả can thiệp.</p>
   </section>
  </div>}

  {tab==='evidence'&&<div className="ss-columns">
   <section className="ss-panel"><h3><ClipboardList size={19}/> Nhật ký điều chỉnh dạy học</h3>
    <p className="ss-muted">Ghi hoạt động thực tế; kế hoạch chưa triển khai không được đánh dấu là đã thực hiện. Bản ghi này không tự tạo minh chứng.</p>
    <label className="ss-label">Vấn đề phát hiện qua đánh giá<textarea value={intervention.finding} onChange={e=>patchIntervention('finding',e.target.value)} rows={3} placeholder="Tiêu chí nào thấp? Bao nhiêu học sinh cần hỗ trợ?"/></label>
    <label className="ss-label">Biện pháp điều chỉnh đã thực hiện<textarea value={intervention.action} onChange={e=>patchIntervention('action',e.target.value)} rows={3} placeholder="Mô tả biện pháp và đối tượng"/></label>
    <label className="ss-label">Ngày thực hiện<input type="date" value={intervention.date} onChange={e=>patchIntervention('date',e.target.value)}/></label>
    <label className="ss-label">Thông tin / vị trí minh chứng gốc<textarea rows={2} value={intervention.evidence} onChange={e=>patchIntervention('evidence',e.target.value)} placeholder="Ví dụ: phiếu học tập ngày..., ảnh hoạt động..., ghi ở đâu..." /></label>
    <label className="ss-label">Nhận xét sau đánh giá lại<textarea rows={3} value={intervention.reflection} onChange={e=>patchIntervention('reflection',e.target.value)} placeholder="Dựa trên cùng học sinh, nêu quan sát và giới hạn kết luận"/></label>
   </section>
   <section className="ss-panel"><h3><Check size={19}/> Bảng kiểm minh chứng</h3>
    <p className="ss-muted"><b>{review.done}/{review.total}</b> thành phần có dữ liệu. Không tự xác nhận đạt điểm thi đua.</p>
    <div className="ss-checklist">{review.items.map(item=><div key={item.key}><span className={item.ok?'is-done':''}>{item.ok?'✓':'○'}</span><span>{item.label}</span><small>{item.ok?'Đã ghi nhận':'Chưa đủ'}</small></div>)}</div>
    {demo&&<div className="ss-demo-warning">DỮ LIỆU MINH HỌA. Phải xóa ví dụ và nhập thông tin kiểm tra thật trước khi lập hồ sơ.</div>}
    <label className="ss-checkbox"><input type="checkbox" checked={showNames} onChange={e=>setShowNames(e.target.checked)}/> Hiện tên học sinh trong PDF (mặc định ẩn tên)</label>
    <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={printReport}><Printer size={16}/> In hồ sơ / PDF</button><button type="button" className="ss-btn ss-quiet" onClick={exportCSV}><FileDown size={15}/> Xuất CSV</button></div>
    <p className="ss-muted">JSON là bản sao có thể nhập lại; CSV là bảng điểm nội bộ; PDF là báo cáo tóm tắt và rubric. Các tệp gốc phải được giáo viên lưu ngoài hệ thống.</p>
   </section>
  </div>}
  <footer className="ss-footer">SPEAKSCALE v1.0 · BRIAN ENGLISH · HUMAN-ASSESSED · NO AI · KHÔNG TỰ LƯU DỮ LIỆU</footer>
 </div>;
}
