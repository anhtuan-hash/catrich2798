import React,{useMemo,useRef,useState} from 'react';
import {ArrowLeft,BookOpenCheck,ClipboardCheck,Download,FileDown,FileUp,Info,Printer,RotateCcw,Save,ShieldCheck,Users} from 'lucide-react';
import {normalizeStudent} from './speakingCore.js';
import {EXIT_SAMPLE,EXIT_META,EXIT_ADJUSTMENT,makeExitConfig,exitQuestions,gradeExit,
  groupExit,pairExit,bulkExit,exitReadiness,exitCsv,exitBackup,loadExitBackup} from './exitTicketCore.js';
import './SpeakScaleStudio.css';
import './ExitTicket.css';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const today=()=>new Date().toISOString().slice(0,10);
const css='<style>body{font:14px/1.65 Arial,sans-serif;color:#263953;max-width:850px;margin:25px auto;padding:0 20px}h1{font-size:23px}h2{font-size:18px;margin-top:22px;border-bottom:1px solid #d9e2ef}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ced9e7;padding:7px;text-align:left}th{background:#eef4fc}.question{padding:10px 0;break-inside:avoid}.options{display:grid;grid-template-columns:1fr 1fr;gap:7px}.muted{color:#62788f;font-size:12px}button{padding:10px 14px;margin:20px 0}.demo{color:#a52a2a;font-size:19px;font-weight:bold}@media print{button{display:none}body{margin:0;padding:0}}</style>';
function downloadFile(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function displayPrint(html){
  const target=window.open('','_blank');
  if(!target)throw new Error('Safari chặn cửa sổ mới. Hãy cho phép pop-up để in.');
  target.opener=null;target.document.open();target.document.write(html);target.document.close();
  target.document.querySelector('[data-print]')?.addEventListener('click',()=>target.print());
}
function handout(meta,config,stage){
 const q=exitQuestions(config,stage);
 return '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Exit Ticket · Phiếu học sinh</title>'+css+
  '<h1>EXIT TICKET · '+esc(meta.lesson)+'</h1><p><b>Lớp:</b> '+esc(meta.className)+' · <b>Ngày:</b> '+esc(meta.date)+
  ' · <b>Lượt:</b> '+(stage==='initial'?'Cuối tiết':'Đánh giá lại')+'</p>'+
  '<p><b>Họ tên:</b> ___________________________ &nbsp; <b>Mã HS:</b> ___________</p>'+
  q.map((item,i)=>'<div class="question"><b>Question '+(i+1)+'.</b> '+esc(item.stem)+
  '<div class="options">'+item.options.map((option,j)=>'<span>□ '+('ABCD'[j])+'. '+esc(option)+'</span>').join('')+'</div></div>').join('')+
  '<h2>Student reflection</h2><p>I feel confident about this lesson:</p><p>□ 1 · Not yet &nbsp; □ 2 · A little &nbsp; □ 3 · Mostly &nbsp; □ 4 · Confident</p>'+
  '<p><b>One thing I still find difficult:</b></p><p>__________________________________________________________________</p><p>__________________________________________________________________</p>'+
  '<p class="muted">BRIAN ExitTicket · Không có đáp án · Chấm theo khóa giáo viên · No AI</p><button data-print>In / Lưu PDF</button></html>';
}
function evidence(meta,config,roster,records,action,revisions,demo,showNames){
 const names=new Map(roster.map(s=>[s.code,s.name]));
 const before=groupExit(records,'initial'),after=groupExit(records,'followup'),pairs=pairExit(records);
 const ready=exitReadiness({meta,config,records,adjustment:action,demo});
 const topics=[...new Set([...Object.keys(before.topics),...Object.keys(after.topics)])];
 const topicsHtml=topics.map(topic=>{
  const x=before.topics[topic],y=after.topics[topic];
  const format=v=>v?(v.correct/v.total*100).toFixed(1)+'%':'—';
  return '<tr><td>'+esc(topic)+'</td><td>'+format(x)+'</td><td>'+format(y)+'</td></tr>';
 }).join('');
 const qhtml=stage=>'<h3>'+(stage==='initial'?'Cuối tiết':'Sau điều chỉnh')+'</h3>'+
  '<table><thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Chủ điểm</th></tr></thead><tbody>'+
  exitQuestions(config,stage).map((q,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(q.stem)+'</td><td>'+esc(q.answer)+'</td><td>'+esc(q.topic)+'</td></tr>').join('')+'</tbody></table>';
 const resultHtml=records.map((r,i)=>'<tr><td>'+esc(r.code)+'</td><td>'+(showNames?esc(names.get(r.code)):'HS '+(i+1))+'</td><td>'+esc(r.stage)+'</td><td>'+r.score+'/'+r.maxScore+'</td><td>'+r.confidence+'/4</td><td>'+esc(r.reflection)+'</td></tr>').join('');
 return '<!doctype html><html lang="vi"><meta charset="utf-8"><title>ExitTicket · Hồ sơ đánh giá</title>'+css+
 '<h1>BRIAN ExitTicket · Hồ sơ kiểm tra, đánh giá</h1>'+
 (demo?'<p class="demo">DEMO — KHÔNG PHẢI DỮ LIỆU HỌC SINH THẬT</p>':'')+
 '<p><b>Lớp:</b> '+esc(meta.className)+' · <b>Nội dung:</b> '+esc(meta.lesson)+' · <b>Giáo viên:</b> '+esc(meta.teacher)+' · <b>Ngày:</b> '+esc(meta.date)+'</p>'+
 '<h2>1. Câu hỏi và tiêu chí đánh giá</h2><p>Hai hoặc ba câu hỏi A–D theo chủ điểm. Mức tự tin 1–4 là tự đánh giá và không được tính vào điểm đúng.</p>'+qhtml('initial')+qhtml('followup')+
 '<h2>2. Kết quả kiểm tra cuối tiết</h2><p>Số lượt ban đầu: '+before.count+'; tỷ lệ đúng bình quân: '+(before.average?.toFixed(1)??'—')+
 '%; mức tự tin bình quân: '+(before.confidence?.toFixed(2)??'—')+'/4.</p>'+
 '<table><thead><tr><th>Mã HS</th><th>Học sinh</th><th>Lượt</th><th>Điểm</th><th>Tự tin</th><th>Phản hồi</th></tr></thead><tbody>'+resultHtml+'</tbody></table>'+
 '<h3>Phân tích chủ điểm</h3><table><thead><tr><th>Chủ điểm</th><th>Cuối tiết</th><th>Đánh giá lại</th></tr></thead><tbody>'+topicsHtml+'</tbody></table>'+
 '<h2>3. Điều chỉnh dạy học</h2><p><b>Vấn đề:</b> '+esc(action.weakness||'Chưa có')+'</p><p><b>Biện pháp:</b> '+esc(action.action||'Chưa có')+'</p>'+
 '<p><b>Ngày thực hiện:</b> '+esc(action.implementedDate||'Chưa có')+'</p><p><b>Nguồn minh chứng:</b> '+esc(action.evidence||'Chưa có')+'</p>'+
 '<h2>4. Đánh giá lại</h2><p>Đã ghép '+pairs.count+' học sinh; chênh lệch bình quân: '+(pairs.delta===null?'—':pairs.delta.toFixed(1)+' điểm phần trăm')+'.</p>'+
 '<table><thead><tr><th>Mã</th><th>Trước (%)</th><th>Sau (%)</th><th>Chênh lệch</th></tr></thead><tbody>'+
 pairs.rows.map(r=>'<tr><td>'+esc(r.code)+'</td><td>'+r.before.toFixed(1)+'</td><td>'+r.after.toFixed(1)+'</td><td>'+r.delta.toFixed(1)+'</td></tr>').join('')+'</tbody></table>'+
 '<p><b>Tính tương đương:</b> '+esc(action.comparability||'Chưa đánh giá')+'</p><p><b>Nhận xét:</b> '+esc(action.followupReflection||'Chưa ghi nhận')+'</p>'+
 '<h2>5. Danh mục minh chứng</h2><p>'+ready.count+'/'+ready.checks.length+' thành phần.</p><ul>'+
 ready.checks.map(x=>'<li>'+(x.ok?'✓':'○')+' '+esc(x.label)+'</li>').join('')+'</ul>'+
 '<h3>Lịch sử điều chỉnh điểm</h3><ul>'+revisions.map(x=>'<li>'+esc(x.code)+' ('+esc(x.stage)+'): '+x.before+' → '+x.after+
 '; '+esc(x.reason)+'; '+esc(x.date)+'</li>').join('')+'</ul>'+
 '<p class="muted">Không suy ra quan hệ nhân quả hay điểm thi đua chỉ từ kết quả trên. Hồ sơ minh chứng gốc cần được xác nhận riêng. Dữ liệu xử lý trong trình duyệt, không dùng AI.</p>'+
 '<button data-print>In / Lưu PDF</button></html>';
}
const avg=n=>n===null?'—':n.toFixed(1)+'%';
export default function ExitTicket({onBack}){
 const [meta,setMeta]=useState({...EXIT_META,date:today()});
 const [initialRaw,setInitialRaw]=useState(''),[followupRaw,setFollowupRaw]=useState(''),[repeatQuestions,setRepeatQuestions]=useState(false);
 const [config,setConfig]=useState(null),[roster,setRoster]=useState([]),[records,setRecords]=useState([]);
 const [adjustment,setAdjustment]=useState({...EXIT_ADJUSTMENT}),[revisions,setRevisions]=useState([]),[demo,setDemo]=useState(false);
 const [tab,setTab]=useState('setup'),[stage,setStage]=useState('initial'),[code,setCode]=useState(''),[name,setName]=useState('');
 const [answers,setAnswers]=useState(''),[confidence,setConfidence]=useState(''),[reflection,setReflection]=useState(''),[reason,setReason]=useState('');
 const [bulk,setBulk]=useState(''),[bulkPreview,setBulkPreview]=useState(null);
 const [showNames,setShowNames]=useState(false),[message,setMessage]=useState(null),fileRef=useRef(null);
 const before=useMemo(()=>groupExit(records,'initial'),[records]);
 const after=useMemo(()=>groupExit(records,'followup'),[records]);
 const paired=useMemo(()=>pairExit(records),[records]);
 const readiness=useMemo(()=>exitReadiness({meta,config,records,adjustment,demo}),[meta,config,records,adjustment,demo]);
 const questions=config?exitQuestions(config,stage):[];
 const current=records.find(r=>r.code===code.trim().toUpperCase()&&r.stage===stage);
 const alert=(msg,isError=false)=>setMessage({msg,isError});
 const patchMeta=(key,value)=>setMeta(x=>({...x,[key]:value}));
 const patchAdj=(key,value)=>setAdjustment(x=>({...x,[key]:value}));
 const setRound=(next)=>{
  setStage(next);setBulk('');setBulkPreview(null);setReason('');
  const rec=records.find(r=>r.code===code.trim().toUpperCase()&&r.stage===next);
  setAnswers(rec?.answers||'');setConfidence(rec?String(rec.confidence):'');setReflection(rec?.reflection||'');
 };
 const selectStudent=(value)=>{
  setCode(value);setName(roster.find(s=>s.code===value)?.name||'');
  const rec=records.find(r=>r.code===value&&r.stage===stage);
  setAnswers(rec?.answers||'');setConfidence(rec?String(rec.confidence):'');setReflection(rec?.reflection||'');setReason('');
 };
 const prepare=()=>{
  try {
   if(records.length)throw new Error('Đã chấm điểm. Hãy sao lưu và tạo phiên mới để thay đề.');
   const data=makeExitConfig({meta,initialRaw,followupRaw,repeatQuestions});
   setConfig({questions:data.initial,followup:data.followup,repeatQuestions:data.repeatQuestions});
   setTab('collect');alert('Đã xác nhận '+data.initial.length+' câu hỏi cho cuối tiết.');
  }catch(e){alert(e.message,true);}
 };
 const addStudent=()=>{
  try{
   const s=normalizeStudent({code,name});
   if(roster.some(x=>x.code===s.code))throw new Error('Mã học sinh đã tồn tại.');
   if(roster.length>=200)throw new Error('Danh sách không vượt quá 200 học sinh.');
   setRoster(x=>[...x,s]);selectStudent(s.code);alert('Đã thêm '+s.code+'.');
  }catch(e){alert(e.message,true);}
 };
 const saveRecord=()=>{
  try {
   if(!config)throw new Error('Hãy xác nhận câu hỏi trước.');
   if(!meta.className.trim()||!meta.lesson.trim())throw new Error('Chưa khai báo lớp hoặc bài học.');
   const student=roster.find(s=>s.code===code.trim().toUpperCase());
   if(!student)throw new Error('Hãy thêm học sinh vào danh sách.');
   if(stage==='followup'){
    if(!records.some(r=>r.code===student.code&&r.stage==='initial'))throw new Error('Học sinh chưa có kết quả ban đầu.');
    if(!adjustment.action.trim()||!adjustment.implementedDate||!adjustment.evidence.trim())throw new Error('Cần ghi biện pháp, ngày và minh chứng đã thực hiện trước khi kiểm tra lại.');
   }
   const record=gradeExit({config,code:student.code,stage,answers,confidence,reflection});
   if(current){
    if(!reason.trim()||reason.length>400)throw new Error('Muốn điều chỉnh kết quả đã lưu, cần lý do ngắn, tối đa 400 ký tự.');
    setRevisions(x=>[...x,{code:record.code,stage,before:current.score,after:record.score,reason:reason.trim(),date:record.assessedAt}]);
    setRecords(x=>x.map(r=>r.code===record.code&&r.stage===stage?record:r));
    setReason('');alert('Đã cập nhật và ghi lịch sử chỉnh sửa.');
   }else{setRecords(x=>[...x,record]);alert('Đã ghi kết quả '+record.score+'/'+record.maxScore+'.');}
  }catch(e){alert(e.message,true);}
 };
 const checkBulk=()=>{
  try{
   if(!config)throw new Error('Hãy xác nhận câu hỏi trước.');
   if(stage==='followup'&&(!adjustment.action.trim()||!adjustment.implementedDate||!adjustment.evidence.trim()))throw new Error('Chưa có đủ dữ liệu điều chỉnh dạy học.');
   const result=bulkExit(bulk,config,stage,roster,records);
   setBulkPreview({raw:bulk,result});alert('Đã xác thực '+result.newRecords.length+' kết quả. Chưa lưu.');
  }catch(e){setBulkPreview(null);alert(e.message,true);}
 };
 const saveBulk=()=>{
  try{
   if(!bulkPreview||bulkPreview.raw!==bulk)throw new Error('Hãy kiểm tra lại dữ liệu trước khi lưu.');
   const result=bulkExit(bulk,config,stage,roster,records);
   setRoster(x=>[...x,...result.newStudents]);setRecords(x=>[...x,...result.newRecords]);
   setBulk('');setBulkPreview(null);alert('Đã ghi '+result.newRecords.length+' kết quả.');
  }catch(e){alert(e.message,true);}
 };
 const demoData=()=>{
  if(records.length&&!window.confirm('Thay dữ liệu hiện có bằng DEMO? Hãy xuất JSON để lưu bản cũ.'))return;
  const demoMeta={title:'Exit Ticket — DEMO',className:'12.6 (Demo)',lesson:'Gerund and Infinitive',teacher:'Giáo viên minh họa',date:today()};
  const cfg=makeExitConfig({meta:demoMeta,initialRaw:EXIT_SAMPLE,followupRaw:'',repeatQuestions:true});
  const exitCfg={questions:cfg.initial,followup:[],repeatQuestions:true};
  const students=Array.from({length:6},(_,i)=>({code:'DEMO'+String(i+1).padStart(2,'0'),name:'Học sinh minh họa '+(i+1)}));
  const first=['BAD','BCD','BCA','BAD','BCD','AAD'];
  const last=['BCD','BCD','BCD','BCD','BCD','BCD'];
  const results=students.flatMap((s,i)=>[
   gradeExit({config:exitCfg,code:s.code,stage:'initial',answers:first[i],confidence:2,reflection:'Ví dụ minh họa (không phải dữ liệu thật)'}),
   gradeExit({config:exitCfg,code:s.code,stage:'followup',answers:last[i],confidence:3,reflection:'Ví dụ minh họa'}),
  ]);
  setMeta(demoMeta);setInitialRaw(EXIT_SAMPLE);setFollowupRaw('');setRepeatQuestions(true);
  setConfig(exitCfg);setRoster(students);setRecords(results);setRevisions([]);setDemo(true);setTab('analytics');
  setAdjustment({weakness:'Ví dụ: lỗi về Gerund và Infinitive.',action:'Dạy bổ sung và luyện nhóm — CHỈ MINH HỌA',implementedDate:today(),
    evidence:'Ví dụ, không có tệp minh chứng thật.',followupReflection:'Điểm mẫu tăng, không chứng minh hiệu quả thực tế.',
    comparability:'Dùng lại bộ câu hỏi minh họa nên có nguy cơ học sinh nhớ đáp án.'});
  selectStudent(students[0].code);alert('Đã nạp DEMO; báo cáo được gắn cảnh báo.');
 };
 const reset=()=>{
  if(!window.confirm('Xóa dữ liệu phiên đang mở? Nếu chưa sao lưu JSON, không thể khôi phục.'))return;
  setMeta({...EXIT_META,date:today()});setInitialRaw('');setFollowupRaw('');setRepeatQuestions(false);setConfig(null);
  setRoster([]);setRecords([]);setAdjustment({...EXIT_ADJUSTMENT});setRevisions([]);setDemo(false);
  setTab('setup');setStage('initial');setCode('');setName('');setAnswers('');setConfidence('');setReflection('');setReason('');setBulk('');setBulkPreview(null);alert('Đã tạo phiên trống.');
 };
 const saveJSON=()=>{
  downloadFile('BRIAN-ExitTicket-backup.json',exitBackup({meta,config,draft:{initialRaw,followupRaw,repeatQuestions},roster,records,adjustment,revisions,demo}),'application/json;charset=utf-8');
  alert('Đã xuất tệp JSON. Hãy lưu file riêng tư nếu chứa thông tin thật.');
 };
 const loadJSON=async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
   if(file.size>1000000)throw new Error('Giới hạn file 1 MB.');
   const data=loadExitBackup(JSON.parse(await file.text()));
   if(records.length&&!window.confirm('Thay thế dữ liệu phiên hiện tại?'))return;
   setMeta(data.meta);setConfig(data.config);setInitialRaw(data.draft.initialRaw);setFollowupRaw(data.draft.followupRaw);setRepeatQuestions(data.draft.repeatQuestions);
   setRoster(data.roster);setRecords(data.records);setAdjustment(data.adjustment);setRevisions(data.revisions);setDemo(data.demo);
   setTab('setup');setCode('');setName('');setAnswers('');setConfidence('');setReflection('');setStage('initial');
   alert('Đã khôi phục '+data.roster.length+' học sinh và '+data.records.length+' bài làm.');
  }catch(e){alert('Không thể nhập JSON: '+e.message,true);}
 };
 const print=(type)=>{
  try{
   if(!config)throw new Error('Bạn chưa xác nhận đề kiểm tra.');
   displayPrint(type==='paper'?handout(meta,config,stage):evidence(meta,config,roster,records,adjustment,revisions,demo,showNames));
  }catch(e){alert(e.message,true);}
 };
 return <div className="ss-root et-root">
  <header className="ss-heading"><div><div className="ss-eyebrow"><ClipboardCheck size={15}/> BRIAN ASSESSMENT · TOOL 03 / 12</div>
    <h2>ExitTicket <span>Lesson Exit Assessment</span></h2><p>Đánh giá 2–3 câu cuối tiết · Phản hồi học sinh · Điều chỉnh tiết kế tiếp</p></div>
    <div className="ss-heading-side"><span className="ss-pill"><ShieldCheck size={14}/> NO AI</span><span className="ss-pill">Teacher-operated</span></div></header>
  <div className="ss-notice"><Info size={17}/><span><b>Dữ liệu chỉ tồn tại trong phiên trình duyệt, không được lưu lên máy chủ.</b> Dùng Sao lưu JSON trước khi tải lại trang. Không nhập thông tin học sinh thật trên thiết bị dùng chung.</span></div>
  <div className="ss-toolbar"><div className="ss-actions">{onBack&&<button className="ss-btn ss-quiet" onClick={onBack}><ArrowLeft size={15}/> 12 công cụ</button>}
    <button type="button" className="ss-btn ss-quiet" onClick={demoData}><BookOpenCheck size={15}/> Dữ liệu mẫu</button>
    <button type="button" className="ss-btn ss-quiet" onClick={reset}><RotateCcw size={15}/> Phiên mới</button></div>
    <div className="ss-actions"><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={loadJSON}/>
      <button type="button" className="ss-btn ss-quiet" onClick={()=>fileRef.current?.click()}><FileUp size={15}/> Nhập JSON</button>
      <button type="button" className="ss-btn ss-main" onClick={saveJSON}><Download size={15}/> Sao lưu JSON</button></div></div>
  {message&&<div role="status" className={'ss-feedback '+(message.isError?'is-error':'')}><span>{message.msg}</span><button type="button" onClick={()=>setMessage(null)} aria-label="Đóng">×</button></div>}
  <div className="ss-summary">
    <div className="ss-metric"><small>Số câu cuối tiết</small><b>{config?.questions.length||0}</b><em>2–3 MCQ</em></div>
    <div className="ss-metric"><small>Học sinh đã làm</small><b>{before.count}</b><em>{roster.length} trong danh sách</em></div>
    <div className="ss-metric"><small>Tỷ lệ đúng trung bình</small><b>{avg(before.average)}</b><em>Không cộng mức tự tin</em></div>
    <div className="ss-metric"><small>Đã đánh giá lại</small><b>{paired.count}</b><em>{paired.delta===null?'Chưa có':(paired.delta>0?'+':'')+paired.delta.toFixed(1)+' điểm phần trăm'}</em></div>
  </div>
  <nav className="ss-tabs" aria-label="Quy trình ExitTicket">{[['setup','1 · Soạn câu hỏi'],['collect','2 · Thu kết quả'],['analytics','3 · Phân tích'],['evidence','4 · Điều chỉnh & minh chứng']].map(([id,label])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>{setTab(id);setMessage(null);}}>{label}</button>)}</nav>
  {tab==='setup'&&<div className="ss-columns"><section className="ss-panel"><h3><ClipboardCheck size={19}/> Thiết lập Exit Ticket</h3>
    <div className="ss-fields">{[['title','Tên đợt','Ví dụ: Unit 4 – Exit Ticket'],['className','Lớp','Ví dụ: 12.6'],['teacher','Giáo viên','Người phụ trách'],['lesson','Nội dung tiết học','Gerund and Infinitive']].map(([key,label,placeholder])=><label className="ss-label" key={key}>{label}<input disabled={Boolean(records.length)} value={meta[key]} onChange={e=>patchMeta(key,e.target.value)} placeholder={placeholder}/></label>)}
      <label className="ss-label">Ngày tổ chức<input type="date" value={meta.date} onChange={e=>patchMeta('date',e.target.value)}/></label></div>
    <label className="ss-label">2–3 câu cuối tiết<textarea rows={8} value={initialRaw} spellCheck={false} disabled={Boolean(records.length)} onChange={e=>setInitialRaw(e.target.value)} placeholder="Câu hỏi | A | B | C | D | Đáp án | Chủ điểm"/><small>Mỗi dòng có 7 trường. Ví dụ: Choose the correct form. | take | taking | to take | took | B | Gerund</small></label>
    <label className="et-check"><input type="checkbox" checked={repeatQuestions} disabled={Boolean(records.length)} onChange={e=>setRepeatQuestions(e.target.checked)}/> Dùng lại cùng đề để đánh giá sau (cần giải trình nguy cơ ghi nhớ đáp án)</label>
    {!repeatQuestions&&<label className="ss-label">Câu hỏi đánh giá lại<textarea rows={6} value={followupRaw} spellCheck={false} disabled={Boolean(records.length)} onChange={e=>setFollowupRaw(e.target.value)} placeholder="2–3 câu cùng mục tiêu, độ khó tương đương"/></label>}
    <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={prepare} disabled={Boolean(records.length)}>Xác nhận đề kiểm tra</button><button type="button" className="ss-btn ss-quiet" disabled={Boolean(records.length)} onClick={()=>setInitialRaw(EXIT_SAMPLE)}>Chèn 3 câu mẫu</button></div>
    {Boolean(records.length)&&<div className="ss-inline-note">Bộ đề được khóa sau khi đã ghi nhận bài làm; muốn thay đáp án cần tạo phiên mới.</div>}
   </section><aside className="ss-panel"><h3><Users size={19}/> Hướng dẫn thu phiếu</h3>
    <p className="ss-muted">Phát phiếu vào 3–5 phút cuối tiết, học sinh chọn đáp án và tự đánh giá mức độ tự tin từ 1–4; có thể ghi một điều còn thắc mắc.</p>
    <div className="ss-inline-note">Giáo viên nhập kết quả vào BRIAN theo từng em hoặc dán Excel sau giờ học. Phiên bản này <b>chưa có cổng cho học sinh tự nộp bài trực tuyến</b>.</div>
    <div className="ss-actions"><button type="button" className="ss-btn ss-quiet" onClick={()=>print('paper')}><Printer size={16}/> In phiếu học sinh</button><button type="button" className="ss-btn ss-quiet" onClick={()=>setTab('collect')}>Chuyển sang thu kết quả →</button></div>
   </aside></div>}
  {tab==='collect'&&<div className="ss-columns ss-score-layout"><section className="ss-panel">
    <div className="ss-section-top"><div><h3><ClipboardCheck size={19}/> Thu và chấm Exit Ticket</h3><p className="ss-muted">{config?questions.length+' câu · '+(stage==='initial'?'Cuối tiết':'Đánh giá lại'):'Hãy xác nhận câu hỏi ở bước 1.'}</p></div>
      <button type="button" className="ss-btn ss-quiet" onClick={()=>print('paper')}><Printer size={15}/> In phiếu không đáp án</button></div>
    <div className="ss-switch"><button type="button" className={stage==='initial'?'chosen':''} onClick={()=>setRound('initial')}>Cuối tiết</button><button type="button" className={stage==='followup'?'chosen':''} onClick={()=>setRound('followup')}>Tiết sau / Đánh giá lại</button></div>
    {config&&<details className="ss-details"><summary>Đáp án giáo viên</summary>{questions.map((q,i)=><p key={i} className="ss-muted">{i+1}. {q.stem} · <b>{q.answer}</b> · {q.topic}</p>)}</details>}
    <div className="ss-picker"><label className="ss-label">Mã học sinh<input value={code} onChange={e=>selectStudent(e.target.value.toUpperCase())} placeholder="S001" list="et-students"/><datalist id="et-students">{roster.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</datalist></label>
      <label className="ss-label">Họ tên<input value={name} onChange={e=>setName(e.target.value)} placeholder="Nguyễn Văn A"/></label></div>
    {code&&!roster.some(s=>s.code===code.trim().toUpperCase())&&<button className="ss-btn ss-quiet" type="button" onClick={addStudent}>+ Thêm học sinh</button>}
    <label className="ss-label">Đáp án học sinh<input autoComplete="off" value={answers} onChange={e=>setAnswers(e.target.value.toUpperCase())} placeholder={questions.length===3?'BCD':'BC'} /><small>Chuỗi A–D theo thứ tự {questions.length} câu.</small></label>
    <label className="ss-label">Mức độ tự tin (học sinh tự đánh giá)<select value={confidence} onChange={e=>setConfidence(e.target.value)}>
      <option value="">Chọn 1–4...</option>{[1,2,3,4].map(v=><option key={v} value={v}>{v} — {['','Chưa tự tin','Còn khó khăn','Tương đối tự tin','Tự tin'][v]}</option>)}</select></label>
    <label className="ss-label">Một điều học sinh còn thắc mắc<textarea rows={2} maxLength={500} value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="Ghi nguyên văn phản hồi (nếu học sinh có ghi)."/></label>
    {current&&<div className="ss-correction"><b>Đã lưu: {current.score}/{current.maxScore}</b><p>Muốn thay đổi kết quả đã ghi, cần lý do và sẽ lưu lịch sử chỉnh sửa.</p><label className="ss-label">Lý do sửa<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={400}/></label></div>}
    <button type="button" className="ss-btn ss-main" disabled={!config} onClick={saveRecord}><Save size={15}/>{current?'Lưu chỉnh sửa':'Chấm và lưu'}</button>
    <details className="ss-details et-bulk"><summary>Nhập hàng loạt từ Excel (tối đa 80 học sinh)</summary><p className="ss-muted">Dán: Mã HS | Họ tên | Đáp án | Tự tin (1–4) | Phản hồi (không bắt buộc). Có thể dán trực tiếp các cột từ Excel.</p>
      <textarea rows={6} value={bulk} onChange={e=>{setBulk(e.target.value);setBulkPreview(null);}} placeholder={'S001 | Nguyễn Văn A | BCD | 3 | Chưa hiểu bare infinitive\nS002 | Trần Thị B | BAD | 2 | Cần luyện thêm'}/>
      <div className="ss-actions"><button type="button" className="ss-btn ss-quiet" onClick={checkBulk}>Kiểm tra dữ liệu</button>{bulkPreview&&<button type="button" className="ss-btn ss-main" onClick={saveBulk}>Lưu {bulkPreview.result.newRecords.length} kết quả</button>}</div></details>
   </section><aside className="ss-panel"><h3>Tiến độ nộp phiếu</h3>
    <div className="ss-progress-list">{roster.map(s=>{const r=records.find(x=>x.code===s.code&&x.stage===stage);return <button key={s.code} type="button" className={code===s.code?'chosen':''} onClick={()=>selectStudent(s.code)}><span><strong>{s.code}</strong><small>{s.name}</small></span><b>{r?r.score+'/'+r.maxScore:'Chưa nhập'}</b></button>})}</div>
    {!roster.length&&<div className="ss-empty">Chưa thêm học sinh. Bạn có thể nhập từng em hoặc dán kết quả Excel.</div>}
   </aside></div>}
  {tab==='analytics'&&<div className="ss-columns"><section className="ss-panel"><h3>Kiến thức cần củng cố</h3><p className="ss-muted">Tỷ lệ đúng theo chủ điểm từ các phiếu cuối tiết.</p>
    {[...new Set([...Object.keys(before.topics),...Object.keys(after.topics)])].map(topic=>{
     const a=before.topics[topic],b=after.topics[topic];const fraction=v=>v?v.correct/v.total*100:0;
     return <div className="ss-chartrow" key={topic}><div><b>{topic}</b><small>Trước: {avg(a?fraction(a):null)} · Sau: {avg(b?fraction(b):null)}</small></div>
       <div className="ss-bars"><div className="ss-track"><i style={{width:fraction(a)+'%'}}/></div><div className="ss-track after"><i style={{width:fraction(b)+'%'}}/></div></div></div>;
    })}
    {!before.count&&<div className="ss-empty">Chưa có bài làm để phân tích.</div>}
    <div className="ss-inline-note">Mức độ tự tin trung bình: <b>{before.confidence===null?'—':before.confidence.toFixed(2)+'/4'}</b>. Đây là tự đánh giá, không được cộng vào điểm trắc nghiệm.</div>
   </section><section className="ss-panel"><h3>Đánh giá lại tiết sau</h3>
    <div className="ss-summary-inline"><div className="ss-metric"><small>Đã ghép mã học sinh</small><b>{paired.count}</b></div>
      <div className="ss-metric"><small>Thay đổi bình quân</small><b>{paired.delta===null?'—':(paired.delta>0?'+':'')+paired.delta.toFixed(1)+' đpt'}</b></div></div>
    <div className="ss-table-wrap"><table><thead><tr><th>Mã HS</th><th>Cuối tiết</th><th>Tiết sau</th><th>Chênh lệch</th></tr></thead><tbody>{paired.rows.map(r=><tr key={r.code}><td>{r.code}</td><td>{r.before.toFixed(1)}%</td><td>{r.after.toFixed(1)}%</td><td>{r.delta.toFixed(1)} đpt</td></tr>)}</tbody></table></div>
    {!paired.count&&<div className="ss-empty">Cần ghi đánh giá lại cho học sinh đã có Exit Ticket ban đầu.</div>}
    <p className="ss-muted">Nếu sử dụng cùng đề, kết quả có thể chịu tác động từ việc ghi nhớ đáp án; cần ghi chú ở hồ sơ.</p>
   </section></div>}
  {tab==='evidence'&&<div className="ss-columns"><section className="ss-panel"><h3>Nhật ký điều chỉnh bài dạy</h3>
    {[
      ['weakness','Kiến thức học sinh chưa nắm','Câu/chủ điểm nào có tỷ lệ đúng thấp?'],
      ['action','Biện pháp đã thực hiện','Hoạt động chữa lỗi, phân hóa, luyện bổ sung...'],
      ['evidence','Tài liệu minh chứng','Vị trí phiếu thực tế, giáo án, ảnh hoạt động...'],
      ['comparability','Tính tương đương của hai lần đánh giá','Đề cùng chuẩn? Nếu dùng lại câu hỏi hãy nêu nguy cơ ghi nhớ đáp án.'],
      ['followupReflection','Nhận xét sau đánh giá lại','Kết quả của cùng học sinh, lưu ý giới hạn kết luận...']
    ].map(([key,label,placeholder])=><label className="ss-label" key={key}>{label}<textarea rows={2} value={adjustment[key]} onChange={e=>patchAdj(key,e.target.value)} placeholder={placeholder}/></label>)}
    <label className="ss-label">Ngày thực hiện biện pháp<input type="date" value={adjustment.implementedDate} onChange={e=>patchAdj('implementedDate',e.target.value)}/></label>
   </section><section className="ss-panel"><h3>Bảng kiểm minh chứng</h3><p className="ss-muted">{readiness.count}/{readiness.checks.length} thành phần đã có dữ liệu. Hệ thống không tự xác nhận điểm thi đua.</p>
    <div className="ss-checklist">{readiness.checks.map((x,i)=><div key={i}><span className={x.ok?'is-done':''}>{x.ok?'✓':'○'}</span><span>{x.label}</span><small>{x.ok?'Đã ghi':'Chưa đủ'}</small></div>)}</div>
    {demo&&<div className="ss-demo-warning">DEMO: dữ liệu minh họa không được dùng làm minh chứng thực tế.</div>}
    <label className="ss-checkbox"><input type="checkbox" checked={showNames} onChange={e=>setShowNames(e.target.checked)}/> Hiện tên học sinh trong báo cáo PDF (mặc định ẩn)</label>
    <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={()=>print('report')}><Printer size={15}/> Hồ sơ PDF</button>
      <button type="button" className="ss-btn ss-quiet" onClick={()=>{downloadFile('BRIAN-ExitTicket-results.csv',exitCsv(roster,records,demo),'text/csv;charset=utf-8');alert('Đã xuất CSV dành cho giáo viên, có mã và họ tên.');}}><FileDown size={15}/> Xuất CSV</button></div>
    <p className="ss-muted">Báo cáo PDF chứa khóa đáp án cho giáo viên; phiếu in phát học sinh không có đáp án. Tài liệu minh chứng gốc phải được lưu ngoài hệ thống.</p>
   </section></div>}
  <footer className="ss-footer">EXIT TICKET v1.0 · BRIAN ENGLISH · NO AI · KHÔNG TỰ LƯU DỮ LIỆU</footer>
 </div>;
}
