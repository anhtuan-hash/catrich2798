import React,{useMemo,useRef,useState} from 'react';
import {ArrowLeft,BarChart3,BookOpenCheck,Check,ClipboardList,Download,FileDown,FileUp,FileText,Info,Plus,Printer,RotateCcw,Save,ShieldCheck,Users} from 'lucide-react';
import {normalizeCode,normalizeStudent,parseRoster} from './speakingCore.js';
import {
 EMPTY_DIAGNOSTIC_META,EMPTY_DIAGNOSTIC_ADJUST,SAMPLE_QUESTIONS,
 validateDiagnosticConfig,scoreDiagnosticRecord,scorePhase,pairedDiagnostic,parseBulkDiagnostic,
 diagnosticReadiness,diagnosticCsv,diagnosticBackup,verifyDiagnosticBackup,resolveQuestions
} from './diagnosticCore.js';
import './SpeakScaleStudio.css';
import './DiagnosticScan.css';

const dateToday=()=>new Date().toISOString().slice(0,10);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const percent=n=>n===null?'—':n.toFixed(1)+'%';
const displayDate=x=>x?new Date(x).toLocaleString('vi-VN'):'—';
function getFile(name,body,type){
 const url=URL.createObjectURL(new Blob([body],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function openPrintable(html){
 const windowRef=window.open('','_blank');
 if(!windowRef)throw new Error('Safari đang chặn cửa sổ mới. Hãy cho phép mở cửa sổ in.');
 windowRef.opener=null;windowRef.document.open();windowRef.document.write(html);windowRef.document.close();
 // No inline script: attach the print handler from the originating document.
 windowRef.document.querySelector('[data-print]')?.addEventListener('click',()=>windowRef.print());
}
function printStyle(){return '<style>body{font:14px/1.65 Arial,sans-serif;color:#22344b;max-width:820px;margin:25px auto;padding:0 15px}h1{font-size:23px}h2{font-size:17px;border-bottom:1px solid #d2deee;margin-top:25px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #c6d4e7;text-align:left;padding:7px;vertical-align:top}th{background:#f0f5fe}.question{margin:17px 0;break-inside:avoid}.options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.demo{font-size:23px;font-weight:bold;color:#b44535}.foot{margin-top:25px;font-size:11px;color:#678}button{padding:10px 14px}@media print{body{margin:0;padding:0}button{display:none}}</style>'}
function paperHTML({meta,config,phase}){
 const questions=resolveQuestions(config,phase);
 return '<!doctype html><html lang="vi"><meta charset="utf-8"><title>DiagnosticScan · Phiếu kiểm tra</title>'+printStyle()+
 '<h1>BRIAN · DIAGNOSTIC ASSESSMENT</h1><p><b>'+esc(meta.title)+'</b> · Lớp: '+esc(meta.className)+' · '+(phase==='pre'?'Kiểm tra ban đầu':'Đánh giá lại')+'</p>'+
 '<p>Họ và tên: ___________________________________ &nbsp; Mã HS: ______________</p>'+
 '<p><b>Mục tiêu:</b> '+esc(meta.objective)+'</p><p>Chọn duy nhất một phương án A, B, C hoặc D cho mỗi câu.</p>'+
 questions.map((q,i)=>'<div class="question"><b>Question '+(i+1)+'.</b> '+esc(q.stem)+
 '<div class="options">'+q.options.map((o,j)=>'<span>□ '+('ABCD'[j])+'. '+esc(o)+'</span>').join('')+'</div></div>').join('')+
 '<p class="foot">Phiếu học sinh · Không chứa đáp án hoặc khóa chấm · BRIAN Assessment Studio (No AI)</p>'+
 '<button data-print>In / Lưu PDF</button></html>';
}
function reportHTML({meta,config,roster,records,adjustment,revisions,demo,includeNames}){
 const pre=scorePhase(records,'pre'),post=scorePhase(records,'post'),paired=pairedDiagnostic(records);
 const names=new Map(roster.map(s=>[s.code,s.name]));
 const topics=Object.keys({...pre.topics,...post.topics}).sort();
 const check=diagnosticReadiness({meta,config,records,adjustment,demo});
 const rub=phase=>resolveQuestions(config,phase).map((q,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(q.stem)+'</td><td>'+esc(q.answer)+'</td><td>'+esc(q.topic)+'</td></tr>').join('');
 const trows=topics.map(t=>{
  const a=pre.topics[t],b=post.topics[t];
  const r=v=>v?(v.achieved/v.total*100).toFixed(1)+'% ('+v.achieved+'/'+v.total+')':'—';
  return '<tr><td>'+esc(t)+'</td><td>'+r(a)+'</td><td>'+r(b)+'</td></tr>';
 }).join('');
 const marks=records.map((r,i)=>'<tr><td>'+esc(r.code)+'</td><td>'+(includeNames?esc(names.get(r.code)):'HS '+(i+1))+'</td><td>'+esc(r.phase)+'</td><td>'+r.score+'/'+r.maxScore+'</td><td>'+r.percent.toFixed(1)+'%</td></tr>').join('');
 const comparisons=paired.rows.map(r=>'<tr><td>'+esc(r.code)+'</td><td>'+r.before.toFixed(1)+'%</td><td>'+r.after.toFixed(1)+'%</td><td>'+(r.delta>0?'+':'')+r.delta.toFixed(1)+' đpt</td></tr>').join('');
 const revisionsText=revisions.length?revisions.map(r=>'<li>'+esc(r.code)+', '+esc(r.phase)+': '+r.oldScore+' → '+r.newScore+'; '+esc(r.reason)+'; '+esc(r.at)+'</li>').join(''):'<li>Chưa có lần sửa điểm.</li>';
 return '<!doctype html><html lang="vi"><meta charset="utf-8"><title>BRIAN DiagnosticScan · Hồ sơ minh chứng</title>'+printStyle()+
 '<h1>HỒ SƠ KIỂM TRA, ĐÁNH GIÁ · DIAGNOSTICSCAN</h1>'+(demo?'<p class="demo">DỮ LIỆU MINH HỌA · KHÔNG DÙNG LÀM MINH CHỨNG</p>':'')+
 '<p><b>Bài đánh giá:</b> '+esc(meta.title)+' · <b>Lớp:</b> '+esc(meta.className)+' · <b>Giáo viên:</b> '+esc(meta.teacher)+'</p>'+
 '<p><b>Ngày:</b> '+esc(meta.date)+' · <b>Mục tiêu:</b> '+esc(meta.objective)+'</p>'+
 '<h2>1. Công cụ và nội dung đánh giá</h2><p>Trắc nghiệm A–D có đáp án cố định và chủ điểm do giáo viên xác nhận. Chấm điểm bằng quy tắc, không dùng AI.</p>'+
 '<h3>Đề ban đầu ('+config.preQuestions.length+' câu)</h3><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Chủ điểm</th></tr></thead><tbody>'+rub('pre')+'</tbody></table>'+
 '<h3>Đề đánh giá lại ('+resolveQuestions(config,'post').length+' câu)</h3><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Chủ điểm</th></tr></thead><tbody>'+rub('post')+'</tbody></table>'+
 '<h2>2. Kết quả đánh giá học sinh</h2><p>Lượt trước: '+pre.count+'; trung bình '+percent(pre.average)+'. Lượt sau: '+post.count+'; trung bình '+percent(post.average)+'.</p>'+
 '<table><thead><tr><th>Mã</th><th>Học sinh</th><th>Lượt</th><th>Đúng/tổng</th><th>Tỷ lệ</th></tr></thead><tbody>'+marks+'</tbody></table>'+
 '<h3>Chủ điểm cần hỗ trợ</h3><table><thead><tr><th>Chủ điểm</th><th>Trước</th><th>Sau</th></tr></thead><tbody>'+trows+'</tbody></table>'+
 '<h2>3. Điều chỉnh hoạt động dạy học</h2><p><b>Vấn đề:</b> '+esc(adjustment.finding||'Chưa ghi nhận')+'</p><p><b>Biện pháp:</b> '+esc(adjustment.action||'Chưa ghi nhận')+
 '</p><p><b>Ngày:</b> '+esc(adjustment.date||'Chưa ghi nhận')+'</p><p><b>Thông tin minh chứng:</b> '+esc(adjustment.evidence||'Chưa ghi nhận')+'</p>'+
 '<h2>4. Đánh giá lại cùng học sinh</h2><p>Số học sinh đối chiếu: '+paired.count+'; thay đổi bình quân: '+(paired.delta===null?'—':(paired.delta>0?'+':'')+paired.delta.toFixed(1)+' điểm phần trăm')+'.</p>'+
 '<table><thead><tr><th>Mã</th><th>Trước</th><th>Sau</th><th>Thay đổi</th></tr></thead><tbody>'+comparisons+'</tbody></table>'+
 '<p><b>Tính tương đương hai đề:</b> '+esc(adjustment.comparability||'Chưa có nhận xét')+'</p><p><b>Nhận xét:</b> '+esc(adjustment.reflection||'Chưa có')+'</p>'+
 '<h2>5. Tình trạng minh chứng</h2><p>'+check.count+'/'+check.total+' thành phần được ghi nhận; đây không phải xác nhận đạt điểm thi đua.</p><ul>'+check.items.map(x=>'<li>'+(x.ok?'✓':'○')+' '+esc(x.label)+'</li>').join('')+'</ul>'+
 '<h3>Lịch sử sửa điểm</h3><ul>'+revisionsText+'</ul>'+
 '<p>Mức chênh lệch không chứng minh quan hệ nhân quả. Giáo viên tự xác nhận nguồn tư liệu, chất lượng đề và biện pháp đã thực hiện.</p>'+
 '<p class="foot">BRIAN · Dữ liệu từ phiên trình duyệt, không lưu trên máy chủ · Xuất '+esc(displayDate(new Date().toISOString()))+'</p>'+
 '<button data-print>In / Lưu PDF</button></html>';
}
function PanelMetric({label,value,extra}){return <div className="ss-metric"><small>{label}</small><b>{value}</b>{extra&&<em>{extra}</em>}</div>}
export default function DiagnosticScan({onBack}){
 const [meta,setMeta]=useState({...EMPTY_DIAGNOSTIC_META,date:dateToday()});
 const [preRaw,setPreRaw]=useState('');
 const [postRaw,setPostRaw]=useState('');
 const [samePost,setSamePost]=useState(false);
 const [config,setConfig]=useState(null);
 const [roster,setRoster]=useState([]);
 const [records,setRecords]=useState([]);
 const [adjustment,setAdjustment]=useState({...EMPTY_DIAGNOSTIC_ADJUST});
 const [revisions,setRevisions]=useState([]);
 const [demo,setDemo]=useState(false);
 const [tab,setTab]=useState('setup'),[phase,setPhase]=useState('pre');
 const [studentCode,setStudentCode]=useState(''),[studentName,setStudentName]=useState('');
 const [answers,setAnswers]=useState(''),[comment,setComment]=useState(''),[reason,setReason]=useState('');
 const [bulk,setBulk]=useState(''),[bulkPreview,setBulkPreview]=useState(null);
 const [includeNames,setIncludeNames]=useState(false);
 const [notice,setNotice]=useState(null);
 const uploadRef=useRef(null);
 const pre=useMemo(()=>scorePhase(records,'pre'),[records]);
 const post=useMemo(()=>scorePhase(records,'post'),[records]);
 const paired=useMemo(()=>pairedDiagnostic(records),[records]);
 const review=useMemo(()=>diagnosticReadiness({meta,config,records,adjustment,demo}),[meta,config,records,adjustment,demo]);
 const updateMeta=(k,v)=>setMeta(m=>({...m,[k]:v}));
 const updateAdjustment=(k,v)=>setAdjustment(a=>({...a,[k]:v}));
 const message=(text,type='success')=>setNotice({text,type});
 const activeQuestions=config?resolveQuestions(config,phase):[];
 const currentRecord=records.find(r=>r.code===studentCode.trim().toUpperCase()&&r.phase===phase);
 const firstTopic=useMemo(()=>Object.entries(pre.topics).filter(([,t])=>t.total>0).sort((a,b)=>a[1].achieved/a[1].total-b[1].achieved/b[1].total)[0], [pre]);
 const setStage=(next)=>{
  setPhase(next);setReason('');setBulk('');setBulkPreview(null);
  const saved=records.find(r=>r.code===studentCode.trim().toUpperCase()&&r.phase===next);
  setAnswers(saved?.answers||'');setComment(saved?.comment||'');
 };
 const selectStudent=(code)=>{
  setStudentCode(code);
  setStudentName(roster.find(s=>s.code===code)?.name||'');
  const saved=records.find(r=>r.code===code&&r.phase===phase);
  setAnswers(saved?.answers||'');setComment(saved?.comment||'');setReason('');
 };
 const addTeacherQuestions=()=>{
  try{
   if(records.length)throw new Error('Bộ đề đã có điểm. Không thể đổi khóa đáp án trong cùng đợt; hãy sao lưu và tạo đợt mới.');
   const verified=validateDiagnosticConfig({meta,preRaw,postRaw,useSamePost:samePost});
   setConfig({preQuestions:verified.preQuestions,postQuestions:verified.postQuestions,useSamePost:verified.useSamePost});
   message('Đã xác nhận '+verified.preQuestions.length+' câu đánh giá đầu và '+resolveQuestions(verified,'post').length+' câu đánh giá lại.');
   setTab('grade');
  }catch(e){message(e.message,'error');}
 };
 const addStudent=()=>{
  try{
   const person=normalizeStudent({code:studentCode,name:studentName});
   if(roster.some(s=>s.code===person.code))throw new Error('Mã học sinh đã tồn tại trong lớp.');
   if(roster.length>=200)throw new Error('Đã đạt giới hạn 200 học sinh.');
   setRoster(a=>[...a,person]);setStudentCode(person.code);message('Đã thêm '+person.code+'.');
  }catch(e){message(e.message,'error');}
 };
 const saveOne=()=>{
  try{
   if(!config)throw new Error('Hãy thiết lập và xác nhận bộ câu hỏi trước.');
   const person=roster.find(s=>s.code===studentCode.trim().toUpperCase());
   if(!person)throw new Error('Hãy chọn hoặc thêm học sinh có mã hợp lệ.');
   if(phase==='post'){
    if(!records.some(r=>r.phase==='pre'&&r.code===person.code))throw new Error('Học sinh này chưa có kết quả kiểm tra ban đầu.');
    if(!adjustment.action.trim()||!adjustment.date||!adjustment.evidence.trim())throw new Error('Cần ghi biện pháp thực tế, ngày và mô tả minh chứng trước khi đánh giá lại.');
   }
   const record=scoreDiagnosticRecord({code:person.code,phase,answers,config,comment});
   const old=records.find(r=>r.code===record.code&&r.phase===phase);
   if(old){
    if(!reason.trim())throw new Error('Sửa kết quả cần ghi lý do chỉnh sửa.');
    if(reason.length>400)throw new Error('Lý do sửa quá dài.');
    setRevisions(a=>[...a,{code:record.code,phase,oldScore:old.score,newScore:record.score,reason:reason.trim(),at:record.assessedAt}]);
    setRecords(a=>a.map(r=>r.code===record.code&&r.phase===phase?record:r));setReason('');message('Đã sửa kết quả, có ghi nhật ký.');
   }else{
    setRecords(a=>[...a,record]);message('Đã lưu kết quả '+record.score+'/'+record.maxScore+' ('+record.percent.toFixed(1)+'%) cho '+record.code+'.');
   }
  }catch(e){message(e.message,'error');}
 };
 const previewBulk=()=>{
  try{
   if(!config)throw new Error('Hãy xác nhận bộ đề trước.');
   if(phase==='post'&&(!adjustment.action.trim()||!adjustment.date||!adjustment.evidence.trim()))throw new Error('Chưa đủ thông tin biện pháp và minh chứng dạy học.');
   const result=parseBulkDiagnostic(bulk,config,phase,roster,records);
   if(phase==='post'&&result.records.some(r=>!records.some(x=>x.code===r.code&&x.phase==='pre')))throw new Error('Có học sinh chưa có đánh giá ban đầu. Hãy nhập kết quả trước.');
   setBulkPreview({source:bulk,result});
   message('Đã kiểm tra '+result.records.length+' bản ghi; chưa lưu cho đến khi nhấn Xác nhận.');
  }catch(e){setBulkPreview(null);message(e.message,'error');}
 };
 const commitBulk=()=>{
  if(!bulkPreview||bulkPreview.source!==bulk){message('Dữ liệu đã thay đổi, vui lòng kiểm tra lại.','error');return;}
  try{
   const check=parseBulkDiagnostic(bulk,config,phase,roster,records);
   if(check.records.length!==bulkPreview.result.records.length)throw new Error('Bản xem trước đã thay đổi.');
   setRoster(a=>[...a,...check.newStudents]);
   setRecords(a=>[...a,...check.records]);setBulk('');setBulkPreview(null);
   message('Đã lưu '+check.records.length+' kết quả, không ghi trùng mã học sinh.');
  }catch(e){message(e.message,'error');}
 };
 const demoData=()=>{
  if((roster.length||records.length)&&!window.confirm('Thay phiên hiện tại bằng dữ liệu minh họa? Xuất JSON trước nếu muốn giữ kết quả.'))return;
  const verified=validateDiagnosticConfig({meta:{title:'Diagnostic Grammar — DEMO',className:'12.6 (Demo)',objective:'Gerund, Infinitive and Bare Infinitive',teacher:'Giáo viên minh họa',date:dateToday()},preRaw:SAMPLE_QUESTIONS,postRaw:'',useSamePost:true});
  const configNew={preQuestions:verified.preQuestions,postQuestions:[],useSamePost:true};
  const students=Array.from({length:6},(_,i)=>({code:'D'+String(i+1).padStart(3,'0'),name:'Học sinh minh họa '+(i+1)}));
  const variants=['BACBC','BBABC','BABBC','CACAB','BBCAC','BACAC'];
  const after=['BCABC','BCABC','BCABC','BCABC','BCABC','BCABC'];
  const rows=[];
  students.forEach((s,i)=>{rows.push(scoreDiagnosticRecord({code:s.code,phase:'pre',answers:variants[i],config:configNew}));
    rows.push(scoreDiagnosticRecord({code:s.code,phase:'post',answers:after[i],config:configNew}));});
  setMeta(verified.meta);setConfig(configNew);setPreRaw(SAMPLE_QUESTIONS);setPostRaw('');setSamePost(true);
  setRoster(students);setRecords(rows);setRevisions([]);setDemo(true);setPhase('pre');setStudentCode(students[0].code);setStudentName(students[0].name);setAnswers(rows[0].answers);
  setAdjustment({finding:'Một số câu về Gerund và Bare Infinitive có tỷ lệ đúng thấp (DỮ LIỆU MẪU).',action:'Dạy lại theo bảng quy tắc kết hợp hoạt động nhóm (MINH HỌA).',date:dateToday(),evidence:'Chưa có minh chứng gốc — DEMO.',reflection:'Số liệu minh họa không phản ánh kết quả học sinh thật.',comparability:'Sử dụng cùng bộ đề minh họa; khả năng nhớ đáp án có thể ảnh hưởng kết quả.'});
  setTab('analytics');message('Đã nạp dữ liệu DEMO. Không được dùng làm minh chứng thực tế.');
 };
 const newSession=()=>{
  if(!window.confirm('Xóa phiên hiện tại? Nếu chưa xuất JSON, kết quả sẽ mất và không thể khôi phục.'))return;
  setMeta({...EMPTY_DIAGNOSTIC_META,date:dateToday()});setPreRaw('');setPostRaw('');setConfig(null);setSamePost(false);
  setRoster([]);setRecords([]);setAdjustment({...EMPTY_DIAGNOSTIC_ADJUST});setRevisions([]);setDemo(false);
  setStudentCode('');setStudentName('');setAnswers('');setComment('');setReason('');setBulk('');setBulkPreview(null);
  setIncludeNames(false);setTab('setup');message('Đã mở phiên mới.');
 };
 const exportJSON=()=>{getFile('BRIAN-DiagnosticScan-backup.json',diagnosticBackup({meta,roster,config,records,adjustment,revisions,demo}),'application/json;charset=utf-8');message('Đã xuất JSON; hãy lưu tệp tại nơi riêng tư và an toàn.');};
 const importJSON=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>1_500_000)throw new Error('Tệp JSON vượt 1,5 MB.');
   const loaded=verifyDiagnosticBackup(JSON.parse(await file.text()));
   if(records.length&&!window.confirm('Thay dữ liệu hiện tại bằng bản JSON đã chọn?'))return;
   setMeta(loaded.meta);setConfig(loaded.config);setRoster(loaded.roster);setRecords(loaded.records);setAdjustment(loaded.adjustment);
   setRevisions(loaded.revisions);setDemo(loaded.demo);setPreRaw(loaded.config.preQuestions.map(q=>[q.stem,...q.options,q.answer,q.topic].join(' | ')).join('\n'));
   setPostRaw(loaded.config.postQuestions.map(q=>[q.stem,...q.options,q.answer,q.topic].join(' | ')).join('\n'));
   setSamePost(loaded.config.useSamePost);setStudentCode('');setStudentName('');setAnswers('');setPhase('pre');setTab('setup');
   message('Đã nhập '+loaded.records.length+' kết quả từ bản sao hợp lệ.');
  }catch(error){message('Không thể nhập JSON: '+error.message,'error');}
 };
 const doPrint=(type)=>{
  try{
   if(!config)throw new Error('Chưa tạo bài kiểm tra.');
   openPrintable(type==='handout'?paperHTML({meta,config,phase}):reportHTML({meta,config,roster,records,adjustment,revisions,demo,includeNames}));
  }catch(e){message(e.message,'error');}
 };
 const recordCount=pre.count+post.count;
 return <div className="ss-root ds-root">
   <header className="ss-heading"><div><div className="ss-eyebrow"><ClipboardList size={15}/> BRIAN ASSESSMENT · TOOL 02 / 12</div><h2>DiagnosticScan <span>Diagnostic Assessment</span></h2><p>Phân tích lỗ hổng kiến thức · Đáp án xác định · Đánh giá lại theo chủ điểm</p></div><div className="ss-heading-side"><span className="ss-pill"><ShieldCheck size={14}/> NO AI</span><span className="ss-pill">Chế độ giáo viên</span></div></header>
   <div className="ss-notice"><Info size={17}/><span><b>Không tự lưu kết quả.</b> Dữ liệu chỉ ở bộ nhớ phiên trình duyệt. Hãy xuất <b>JSON sao lưu</b> trước khi đóng hoặc tải lại trang. Không nhập thông tin thật trên thiết bị dùng chung.</span></div>
   <div className="ss-toolbar"><div className="ss-actions">{onBack&&<button type="button" className="ss-btn ss-quiet" onClick={onBack}><ArrowLeft size={15}/> 12 công cụ</button>}
     <button type="button" className="ss-btn ss-quiet" onClick={demoData}><BookOpenCheck size={15}/> Nạp ví dụ</button><button type="button" className="ss-btn ss-quiet" onClick={newSession}><RotateCcw size={15}/> Phiên mới</button></div>
    <div className="ss-actions"><input ref={uploadRef} hidden type="file" accept="application/json,.json" onChange={importJSON}/><button type="button" className="ss-btn ss-quiet" onClick={()=>uploadRef.current?.click()}><FileUp size={15}/> Nhập JSON</button><button type="button" className="ss-btn ss-main" onClick={exportJSON}><Download size={15}/> Sao lưu JSON</button></div></div>
   {notice&&<div className={'ss-feedback '+(notice.type==='error'?'is-error':'')} role="status"><span>{notice.text}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setNotice(null)}>×</button></div>}
   <div className="ss-summary"><PanelMetric label="Số câu kiểm tra" value={config?.preQuestions.length||0} extra="Có nhãn chủ điểm"/><PanelMetric label="Số lượt đã chấm" value={recordCount} extra={roster.length+' học sinh trong danh sách'}/><PanelMetric label="Điểm đúng lần đầu" value={percent(pre.average)} extra={pre.count+' học sinh'}/><PanelMetric label="Học sinh ghép trước–sau" value={paired.count} extra={paired.delta===null?'Chưa có':'Chênh lệch '+(paired.delta>=0?'+':'')+paired.delta.toFixed(1)+' đpt'}/></div>
   <nav className="ss-tabs" aria-label="Quy trình DiagnosticScan">{[['setup','1 · Tạo đề'],['grade','2 · Chấm bài'],['analytics','3 · Phân tích'],['evidence','4 · Minh chứng']].map(([key,label])=><button type="button" className={tab===key?'active':''} onClick={()=>{setTab(key);setNotice(null);}} key={key}>{label}</button>)}</nav>
   {tab==='setup'&&<div className="ss-columns"><section className="ss-panel"><h3><ClipboardList size={20}/> Tạo bài kiểm tra chẩn đoán</h3>
    <div className="ss-fields">{[['title','Tên bài kiểm tra','Ví dụ: Diagnostic Gerund & Infinitive'],['className','Lớp','12.6'],['teacher','Giáo viên','Tên người thực hiện'],['objective','Mục tiêu đánh giá','Phân biệt Gerund / Infinitive']].map(([k,label,placeholder])=><label className="ss-label" key={k}>{label}<input value={meta[k]} disabled={Boolean(records.length)} onChange={e=>updateMeta(k,e.target.value)} placeholder={placeholder}/></label>)}
     <label className="ss-label">Ngày tổ chức<input type="date" value={meta.date} onChange={e=>updateMeta('date',e.target.value)}/></label></div>
    <label className="ss-label">Câu hỏi kiểm tra ban đầu<textarea rows={8} spellCheck={false} value={preRaw} disabled={Boolean(records.length)} onChange={e=>setPreRaw(e.target.value)} placeholder={'She enjoys ___. | read | reading | to read | reads | B | Gerund'}/><small>7 cột: Nội dung | A | B | C | D | Đáp án đúng | Chủ điểm. Một câu mỗi dòng, tối đa 100.</small></label>
    <label className="ds-check"><input type="checkbox" checked={samePost} disabled={Boolean(records.length)} onChange={e=>setSamePost(e.target.checked)}/> Dùng lại cùng bộ đề để kiểm tra sau (lưu ý hiệu ứng nhớ đáp án)</label>
    {!samePost&&<label className="ss-label">Bộ câu hỏi đánh giá lại<textarea rows={6} spellCheck={false} value={postRaw} disabled={Boolean(records.length)} onChange={e=>setPostRaw(e.target.value)} placeholder="Nhập câu hỏi cùng chuẩn mục tiêu và độ khó..."}/></label>}
    <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={addTeacherQuestions} disabled={Boolean(records.length)}><Check size={16}/> Xác nhận bộ câu hỏi</button><button type="button" className="ss-btn ss-quiet" onClick={()=>{if(records.length){message('Không được đổi đáp án sau khi đã chấm điểm.','error');return;}setPreRaw(SAMPLE_QUESTIONS);}}>Điền 5 câu ví dụ</button></div>
    {Boolean(records.length)&&<div className="ss-inline-note">Khóa đáp án đã được cố định khi có kết quả. Muốn dùng bộ đề khác, hãy xuất JSON và tạo phiên mới.</div>}
   </section><section className="ss-panel"><h3><Users size={20}/> Chuẩn bị danh sách lớp</h3>
    <p className="ss-muted">Có thể thêm học sinh ngay khi chấm hoặc dán danh sách từ Excel (mỗi dòng: Mã HS | Họ tên). </p>
    <details className="ss-details"><summary>Nhập danh sách lớp từ Excel</summary><p className="ss-muted">Dán tối đa 80 học sinh/lượt; mã không được trùng.</p>
     <textarea rows={6} placeholder={'S001 | Nguyễn Văn A\nS002 | Trần Thị B'} id="ds-roster" />
     <button type="button" className="ss-btn ss-quiet" onClick={()=>{try{const text=document.getElementById('ds-roster').value;const students=parseRoster(text,roster);if(roster.length+students.length>200)throw new Error('Giới hạn 200 học sinh.');setRoster(r=>[...r,...students]);document.getElementById('ds-roster').value='';message('Đã thêm '+students.length+' học sinh.');}catch(e){message(e.message,'error');}}}>Thêm danh sách</button></details>
    <div className="ss-roster-list">{roster.map(person=><div key={person.code}><strong>{person.code}</strong><span>{person.name}</span><small>{records.filter(r=>r.code===person.code).length}/2</small></div>)}</div>
    {!roster.length&&<div className="ss-empty">Chưa có danh sách; có thể bắt đầu từ bài làm và thêm từng học sinh tại bước Chấm bài.</div>}
   </section></div>}
   {tab==='grade'&&<div className="ss-columns ss-score-layout"><section className="ss-panel">
    <div className="ss-section-top"><div><h3><FileText size={20}/> Chấm bài theo đáp án</h3><p className="ss-muted">{config?activeQuestions.length+' câu · '+(phase==='pre'?'Lần đầu':'Đánh giá lại'):'Hãy xác nhận bộ câu hỏi tại bước 1.'}</p></div><div className="ss-actions"><button className="ss-btn ss-quiet" type="button" onClick={()=>doPrint('handout')}><Printer size={15}/> In phiếu không đáp án</button></div></div>
    <div className="ss-switch"><button className={phase==='pre'?'chosen':''} type="button" onClick={()=>setStage('pre')}>Đánh giá ban đầu</button><button className={phase==='post'?'chosen':''} type="button" onClick={()=>setStage('post')}>Đánh giá lại</button></div>
    {config&&<details className="ss-details"><summary>Xem bộ câu hỏi và khóa đáp án giáo viên</summary><div className="ds-key-list">{activeQuestions.map((q,i)=><p key={i}><b>{i+1}. {q.stem}</b><br/><span>Đáp án {q.answer} · {q.topic}</span></p>)}</div></details>}
    <div className="ss-picker"><label className="ss-label">Mã học sinh<input value={studentCode} onChange={e=>selectStudent(e.target.value.toUpperCase())} list="ds-students" placeholder="S001"/><datalist id="ds-students">{roster.map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</datalist></label>
    <label className="ss-label">Họ và tên<input value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder="Nguyễn Văn A"/></label></div>
    {studentCode&&!roster.some(x=>x.code===studentCode.trim().toUpperCase())&&<button type="button" className="ss-btn ss-quiet" onClick={addStudent}><Plus size={15}/> Thêm học sinh này vào lớp</button>}
    <label className="ss-label">Chuỗi đáp án học sinh<input value={answers} onChange={e=>setAnswers(e.target.value.toUpperCase())} placeholder="Ví dụ: BCABC" autoComplete="off"/><small>Nhập A/B/C/D liên tiếp theo thứ tự câu; hệ thống kiểm tra đủ {activeQuestions.length} câu trước khi chấm.</small></label>
    <label className="ss-label">Nhận xét của giáo viên<textarea rows={2} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Nhận xét lỗi, khả năng vận dụng..." /></label>
    {currentRecord&&<div className="ss-correction"><b>Đã có kết quả: {currentRecord.score}/{currentRecord.maxScore} ({currentRecord.percent.toFixed(1)}%)</b><p>Điểm đã ghi chỉ được sửa nếu cung cấp lý do; lịch sử sửa được lưu trong JSON và PDF.</p><label className="ss-label">Lý do sửa<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Nhập sai chuỗi đáp án"/></label></div>}
    <button type="button" className="ss-btn ss-main" onClick={saveOne} disabled={!config}><Save size={16}/>{currentRecord?'Lưu bản chỉnh sửa':'Chấm và lưu kết quả'}</button>
    <details className="ss-details ds-bulk"><summary>Chấm cả lớp: dán Excel, kiểm tra trước khi lưu</summary><p className="ss-muted">Mỗi dòng: Mã HS | Họ tên | Đáp án A–D. Tối đa 80 bản ghi/lượt. Lượt kiểm tra lại yêu cầu điểm ban đầu và thông tin can thiệp.</p>
     <textarea rows={6} value={bulk} onChange={e=>{setBulk(e.target.value);setBulkPreview(null);}} placeholder={'S001 | Nguyễn Văn A | BCABC\nS002 | Trần Thị B | BAABC'}/>
     <div className="ss-actions"><button type="button" className="ss-btn ss-quiet" onClick={previewBulk}>Kiểm tra dữ liệu</button>{bulkPreview&&<button type="button" className="ss-btn ss-main" onClick={commitBulk}>Lưu {bulkPreview.result.records.length} kết quả đã kiểm tra</button>}</div>
    </details>
   </section><aside className="ss-panel"><h3>Tiến độ theo học sinh</h3>
    <div className="ss-progress-list">{roster.map(s=>{const result=records.find(r=>r.code===s.code&&r.phase===phase);return <button key={s.code} type="button" onClick={()=>selectStudent(s.code)} className={studentCode===s.code?'chosen':''}><span><strong>{s.code}</strong><small>{s.name}</small></span><b>{result?result.score+'/'+result.maxScore:'Chưa chấm'}</b></button>})}</div>
    {!roster.length&&<div className="ss-empty">Chưa có học sinh.</div>}
    <div className="ss-inline-note">BRIAN không đưa đề, đáp án hoặc thông tin học sinh qua AI. Tất cả đáp án được so với khóa do giáo viên nhập.</div>
   </aside></div>}
   {tab==='analytics'&&<div className="ss-columns"><section className="ss-panel"><h3><BarChart3 size={19}/> Phân tích theo chủ điểm</h3>
    <p className="ss-muted">Phân tích dựa trên số câu trả lời đúng thực tế, không đoán năng lực từ số liệu ít.</p>
    {[...new Set([...Object.keys(pre.topics),...Object.keys(post.topics)])].sort().map(topic=>{
     const a=pre.topics[topic],b=post.topics[topic],p=v=>v?Math.round(v.achieved/v.total*100):0;
     return <div key={topic} className="ss-chartrow"><div><b>{topic}</b><small>Trước: {a?percent(a.achieved/a.total*100):'—'} · Sau: {b?percent(b.achieved/b.total*100):'—'}</small></div><div className="ss-bars"><div className="ss-track"><i style={{width:p(a)+'%'}}/></div><div className="ss-track after"><i style={{width:p(b)+'%'}}/></div></div></div>
    })}
    {!Object.keys(pre.topics).length&&<div className="ss-empty">Chưa có kết quả đánh giá để phân tích.</div>}
    {firstTopic&&<div className="ss-inline-note">Chủ điểm có tỷ lệ đúng thấp nhất ở lượt đầu: <b>{firstTopic[0]}</b> ({percent(firstTopic[1].achieved/firstTopic[1].total*100)}). Giáo viên cần đối chiếu số câu hỏi và độ khó trước khi quyết định can thiệp.</div>}
   </section><section className="ss-panel"><h3>Trước và sau điều chỉnh</h3>
    <div className="ss-summary-inline"><PanelMetric label="Đã ghép mã HS" value={paired.count}/><PanelMetric label="Thay đổi trung bình" value={paired.delta===null?'—':(paired.delta>0?'+':'')+paired.delta.toFixed(1)+' đpt'}/></div>
    <div className="ss-table-wrap"><table><thead><tr><th>Mã HS</th><th>Trước (%)</th><th>Sau (%)</th><th>Thay đổi</th></tr></thead><tbody>{paired.rows.map(r=><tr key={r.code}><td>{r.code}</td><td>{r.before.toFixed(1)}</td><td>{r.after.toFixed(1)}</td><td className={r.delta>0?'ss-positive':''}>{r.delta>0?'+':''}{r.delta.toFixed(1)} đpt</td></tr>)}</tbody></table></div>
    {!paired.count&&<div className="ss-empty">Cần chấm hai lần cho cùng mã học sinh.</div>}
    <p className="ss-muted">Nếu hai đề có cấu trúc/chủ điểm khác nhau, phải xem xét khả năng so sánh. Điểm cao hơn không tự chứng minh hiệu quả dạy lại.</p>
   </section></div>}
   {tab==='evidence'&&<div className="ss-columns"><section className="ss-panel"><h3><ClipboardList size={19}/> Nhật ký điều chỉnh dạy học</h3>
     {[['finding','Vấn đề phát hiện từ kết quả đánh giá','Nêu những chủ điểm có tỷ lệ đúng thấp...'],['action','Hoạt động điều chỉnh đã thực hiện','Dạy lại, hỗ trợ nhóm, giao bài phân hóa...'],['evidence','Thông tin minh chứng gốc','Đường dẫn nội bộ hoặc vị trí lưu giáo án, phiếu...'],['comparability','Nhận xét về tính tương đương hai đề','Cùng chuẩn đầu ra, độ khó, phạm vi? Nếu dùng lại đề, ghi rủi ro nhớ đáp án.'],['reflection','Nhận xét dựa trên kết quả đánh giá lại','Nêu kết quả quan sát, hạn chế kết luận...']].map(([key,label,placeholder])=><label className="ss-label" key={key}>{label}<textarea rows={2} value={adjustment[key]} onChange={e=>updateAdjustment(key,e.target.value)} placeholder={placeholder}/></label>)}
     <label className="ss-label">Ngày thực hiện<input type="date" value={adjustment.date} onChange={e=>updateAdjustment('date',e.target.value)}/></label>
    </section><section className="ss-panel"><h3><Check size={19}/> Bảng kiểm hồ sơ</h3>
     <p className="ss-muted">{review.count}/{review.total} thành phần đã ghi; đây không phải xác nhận đạt điểm thi đua.</p><div className="ss-checklist">{review.items.map((r,i)=><div key={i}><span className={r.ok?'is-done':''}>{r.ok?'✓':'○'}</span><span>{r.label}</span><small>{r.ok?'Có dữ liệu':'Chưa đủ'}</small></div>)}</div>
     {demo&&<div className="ss-demo-warning">DEMO — Dữ liệu minh họa không được dùng làm minh chứng đánh giá thật.</div>}
     <label className="ss-checkbox"><input type="checkbox" checked={includeNames} onChange={e=>setIncludeNames(e.target.checked)}/> Hiện tên học sinh trong PDF (mặc định ẩn)</label>
     <div className="ss-actions"><button type="button" className="ss-btn ss-main" onClick={()=>doPrint('report')}><Printer size={15}/> Hồ sơ PDF</button><button type="button" className="ss-btn ss-quiet" onClick={()=>{getFile('BRIAN-DiagnosticScan-results.csv',diagnosticCsv(roster,records,demo),'text/csv;charset=utf-8');message('Đã xuất CSV nội bộ có tên học sinh.');}}><FileDown size={15}/> Xuất CSV</button></div>
     <p className="ss-muted">PDF có khóa đáp án để giáo viên thẩm định. Phiếu phát cho học sinh được tạo riêng tại bước Chấm bài và không có khóa đáp án.</p>
    </section></div>}
   <footer className="ss-footer">DIAGNOSTICSCAN v1.0 · BRIAN ENGLISH · DETERMINISTIC SCORING · NO AI · KHÔNG TỰ LƯU</footer>
 </div>;
}
