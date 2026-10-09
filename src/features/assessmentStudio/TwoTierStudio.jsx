import React,{useMemo,useRef,useState} from 'react';
import {ArrowLeft,BookOpenCheck,CheckCircle2,ClipboardList,Download,FileJson,FileText,Info,Printer,RefreshCcw,ShieldCheck,Upload,Users} from 'lucide-react';
import {
 TWO_TIER_SAMPLE,TWO_TIER_EMPTY_META,TWO_TIER_EMPTY_ADJUST,
 validateTwoTierSetup,importTwoTierBatch,summarizeTwoTier,pairedTwoTier,
 twoTierReadiness,twoTierCSV,twoTierBackup,restoreTwoTierBackup,encodeTwoTierQuestions
} from './twoTierCore.js';
import './TwoTierStudio.css';
const freshMeta=()=>({...TWO_TIER_EMPTY_META,date:new Date().toLocaleDateString('en-CA')});
const escapeHTML=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmt=x=>x==null?'—':Number(x).toFixed(1)+'%';
const labels={
 understood:'Hiểu đúng cả hai tầng',answerOnly:'Đúng đáp án, sai lý do',
 reasonOnly:'Sai đáp án, đúng lý do',misconception:'Sai cả hai tầng'
};
function downloadText(filename,text,mime){
 const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function makeReport({meta,config,roster,records,adjustment,demo,includeNames}){
 const before=summarizeTwoTier(records,'pre'),after=summarizeTwoTier(records,'post');
 const paired=pairedTwoTier(records),ready=twoTierReadiness({meta,config,records,adjustment,demo});
 const lookup=new Map(roster.map(x=>[x.code,x.name]));
 const topics=[...new Set([...Object.keys(before.topics),...Object.keys(after.topics)])];
 const pct=v=>v?(100*v.mastered/v.total).toFixed(1)+'%':'—';
 const table=(head,body)=>'<table><thead><tr>'+head.map(x=>'<th>'+escapeHTML(x)+'</th>').join('')+'</tr></thead><tbody>'+
  (body.length?body.map(row=>'<tr>'+row.map(x=>'<td>'+escapeHTML(x)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+head.length+'">Chưa có dữ liệu</td></tr>')+'</tbody></table>';
 const summaryTable=table(['Nhóm kết quả','Lần đầu','Lần sau'],Object.keys(labels).map(k=>[labels[k],before.count?before.counts[k]:'—',after.count?after.counts[k]:'—']));
 const qtable=phase=>table(['#','Tầng 1: Câu hỏi','Đáp án','Tầng 2: Giải thích','Đáp án','Chủ điểm'],
  (phase==='pre'?config.pre:(config.repeat?config.pre:config.post)).map((q,i)=>[i+1,q.stem,q.answer,q.reasonStem,q.reasonAnswer,q.topic]));
 const html='<!doctype html><html lang="vi"><meta charset="utf-8"><title>BRIAN Two-Tier – Hồ sơ minh chứng</title>'+
 '<style>body{font:14px/1.55 Arial,sans-serif;color:#223955;max-width:950px;margin:22px auto;padding:0 18px}h1{font-size:23px}h2{font-size:17px;margin:25px 0 9px;border-bottom:1px solid #dae2ed;padding-bottom:7px}h3{font-size:14px}table{width:100%;border-collapse:collapse;font-size:12px;margin:9px 0 20px;page-break-inside:auto}td,th{border:1px solid #ced9e8;text-align:left;padding:7px;vertical-align:top}th{background:#edf4fd}tr{break-inside:avoid}.warn{color:#a42d32;font-weight:bold}.muted{color:#637791;font-size:12px}.print{padding:10px 16px;background:#2959a7;color:white;border:0;border-radius:8px}@media print{.print{display:none}body{padding:0;margin:0}}</style>'+
 '<h1>BRIAN Assessment Studio · TWO-TIER</h1>'+
 (demo?'<p class="warn">DEMO — KHÔNG PHẢI MINH CHỨNG THỰC TẾ</p>':'')+
 '<p><b>Giáo viên:</b> '+escapeHTML(meta.teacher)+' · <b>Lớp:</b> '+escapeHTML(meta.className)+' · <b>Ngày:</b> '+escapeHTML(meta.date)+
 '<br><b>Nội dung:</b> '+escapeHTML(meta.title)+' · <b>Mục tiêu:</b> '+escapeHTML(meta.objective)+'</p>'+
 '<h2>1. Công cụ đánh giá: bài kiểm tra hai tầng</h2><p>Mỗi câu có đáp án kiến thức (tầng 1) và lý do (tầng 2). Chỉ tính hiểu đầy đủ khi cả hai tầng đúng.</p>'+
 '<h3>Đánh giá ban đầu</h3>'+qtable('pre')+'<h3>Đánh giá lại</h3>'+qtable('post')+
 '<h2>2. Thống kê và phân tích kết quả</h2><p>Số HS lượt đầu: '+before.count+'; lượt sau: '+after.count+'. Tỷ lệ hiểu đầy đủ trung bình: '+fmt(before.average)+' → '+fmt(after.average)+'.</p>'+summaryTable+
 table(['Chủ điểm','Lần đầu: hiểu đầy đủ','Lần sau: hiểu đầy đủ'],topics.map(k=>[k,pct(before.topics[k]),pct(after.topics[k])]))+
 table(['Mã học sinh','Họ tên','Lượt','Đáp án','Đúng cả hai tầng','Tỷ lệ'],records.map(r=>[r.code,includeNames?lookup.get(r.code)||'':'(đã ẩn)',r.phase,r.answers,r.score+'/'+r.maxScore,fmt(r.percent)]))+
 '<h2>3. Nội dung điều chỉnh dạy học</h2><p><b>Vấn đề:</b> '+escapeHTML(adjustment.finding||'Chưa ghi')+'</p>'+
 '<p><b>Biện pháp:</b> '+escapeHTML(adjustment.action||'Chưa ghi')+'</p><p><b>Ngày áp dụng:</b> '+escapeHTML(adjustment.implementedDate||'Chưa ghi')+'</p>'+
 '<p><b>Minh chứng kèm theo:</b> '+escapeHTML(adjustment.evidence||'Chưa ghi')+'</p>'+
 '<h2>4. Đánh giá lại cùng học sinh</h2><p>Số HS ghép cặp: '+paired.count+'. Chênh lệch điểm phần trăm trung bình: '+fmt(paired.averageDelta)+'.</p>'+
 table(['Mã HS','Trước (%)','Sau (%)','Thay đổi (điểm %)'],paired.rows.map(r=>[r.code,r.before.toFixed(1),r.after.toFixed(1),r.delta.toFixed(1)]))+
 '<p><b>Tính tương đương:</b> '+escapeHTML(adjustment.comparability||'Chưa ghi')+'</p><p><b>Nhận xét GV:</b> '+escapeHTML(adjustment.reflection||'Chưa ghi')+'</p>'+
 '<h2>5. Danh mục minh chứng</h2><p>Hoàn thiện '+ready.count+'/'+ready.total+' thành phần. '+
 (ready.complete?'Đã có dữ liệu các mục yêu cầu (chưa đồng nghĩa được công nhận điểm thi đua).':'Hồ sơ chưa đủ các thành phần dự kiến.')+'</p><ul>'+
 ready.checks.map(x=>'<li>'+(x.ok?'✓ ':'○ ')+escapeHTML(x.label)+'</li>').join('')+'</ul>'+
 '<p class="muted">BRIAN – Tính toán theo khóa đáp án/rubric, không AI. Hồ sơ cần được giáo viên và tổ chuyên môn đối chiếu với bằng chứng gốc; không tự xác nhận kết quả thi đua hoặc quan hệ nhân quả.</p>'+
 '<button class="print" onclick="window.print()">In / Lưu PDF</button></html>';
 return html;
}
export default function TwoTierStudio({onBack}){
 const [meta,setMeta]=useState(freshMeta);
 const [preRaw,setPreRaw]=useState(TWO_TIER_SAMPLE);
 const [postRaw,setPostRaw]=useState('');
 const [repeat,setRepeat]=useState(false);
 const [config,setConfig]=useState(null);
 const [roster,setRoster]=useState([]);
 const [records,setRecords]=useState([]);
 const [phase,setPhase]=useState('pre');
 const [bulk,setBulk]=useState('');
 const [adjustment,setAdjustment]=useState({...TWO_TIER_EMPTY_ADJUST});
 const [showNames,setShowNames]=useState(false);
 const [demo,setDemo]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const inputFile=useRef(null);
 const before=useMemo(()=>summarizeTwoTier(records,'pre'),[records]);
 const after=useMemo(()=>summarizeTwoTier(records,'post'),[records]);
 const paired=useMemo(()=>pairedTwoTier(records),[records]);
 const ready=useMemo(()=>twoTierReadiness({meta,config,records,adjustment,demo}),[meta,config,records,adjustment,demo]);
 const topics=useMemo(()=>[...new Set([...Object.keys(before.topics),...Object.keys(after.topics)])],[before,after]);
 const announce=(fn)=>{
  setError('');setNotice('');
  try{const message=fn();if(message)setNotice(message);}catch(e){setError(e.message||'Không thể xử lý dữ liệu.');}
 };
 const saveConfig=()=>announce(()=>{
  const validated=validateTwoTierSetup({meta,preRaw,postRaw,repeat});
  if(records.length&&!window.confirm('Cập nhật khóa đáp án sẽ xóa tất cả kết quả hiện có. Hãy xuất JSON trước. Tiếp tục?'))return '';
  setConfig({pre:validated.pre,post:validated.post,repeat:validated.repeat});
  setMeta(validated.meta);setRoster([]);setRecords([]);setBulk('');
  return 'Đã kiểm tra và khóa bộ câu hỏi. Có thể nhập kết quả.';
 });
 const addScores=()=>announce(()=>{
  if(!config)throw new Error('Hãy lưu bộ câu hỏi và khóa đáp án trước.');
  const batch=importTwoTierBatch({raw:bulk,config,phase,roster,records});
  setRoster(old=>[...old,...batch.newStudents]);
  setRecords(old=>[...old,...batch.newRecords]);
  setBulk('');
  return 'Đã chấm và thêm '+batch.newRecords.length+' học sinh vào lượt '+(phase==='pre'?'ban đầu.':'đánh giá lại.');
 });
 const resetAll=()=>{
  if(window.confirm('Xóa tất cả dữ liệu Two-Tier trong phiên này? Hãy sao lưu JSON trước khi xóa.')){
   setConfig(null);setMeta(freshMeta());setPreRaw(TWO_TIER_SAMPLE);setPostRaw('');setRepeat(false);
   setRoster([]);setRecords([]);setBulk('');setAdjustment({...TWO_TIER_EMPTY_ADJUST});setDemo(false);setError('');setNotice('Đã đặt lại phiên.');
  }
 };
 const backup=()=>announce(()=>{
  downloadText('BRIAN-TwoTier-backup.json',twoTierBackup({meta,config,roster,records,adjustment,demo}),'application/json;charset=utf-8');
  return 'Đã xuất sao lưu JSON. Lưu file tại vị trí an toàn.';
 });
 const restore=async file=>{
  if(!file)return;
  setError('');setNotice('');
  try{
   if(file.size>2_000_000)throw new Error('File JSON vượt giới hạn 2 MB.');
   const data=restoreTwoTierBackup(JSON.parse(await file.text()));
   if((records.length||config)&&!window.confirm('Nhập JSON sẽ thay toàn bộ dữ liệu trong phiên. Bạn đã sao lưu chưa?'))return;
   setMeta(data.meta);setConfig(data.config);setRoster(data.roster);setRecords(data.records);
   setAdjustment(data.adjustment);setDemo(data.demo);
   setPreRaw(data.config?encodeTwoTierQuestions(data.config.pre):TWO_TIER_SAMPLE);
   setPostRaw(data.config?encodeTwoTierQuestions(data.config.post):'');
   setRepeat(Boolean(data.config?.repeat));
   setBulk('');setNotice('Đã khôi phục JSON và kiểm tra lại điểm dựa vào đáp án.');
  }catch(e){setError('Không nhập được: '+e.message);}finally{if(inputFile.current)inputFile.current.value='';}
 };
 const printReport=()=>announce(()=>{
  if(!config)throw new Error('Cần khóa đáp án trước khi xuất báo cáo.');
  const win=window.open('','_blank');
  if(!win)throw new Error('Trình duyệt chặn pop-up. Hãy cấp quyền mở cửa sổ để in PDF.');
  win.opener=null;
  win.document.open();
  win.document.write(makeReport({meta,config,roster,records,adjustment,demo,includeNames:showNames}));
  win.document.close();
  return 'Đã tạo bản xem trước báo cáo; chọn In / Lưu PDF ở cửa sổ mới.';
 });
 const updateMeta=(key,value)=>setMeta(s=>({...s,[key]:value}));
 const updateAdjust=(key,value)=>setAdjustment(s=>({...s,[key]:value}));
 return <main className="tt-root" aria-label="Two-Tier Assessment Studio">
  <header className="tt-hero">
   <div>
    <div className="tt-kicker"><BookOpenCheck size={16}/> BRIAN ASSESSMENT STUDIO / NO AI</div>
    <h2>Two-Tier <span>Assessment</span></h2>
    <p>Kiểm tra đáp án và khả năng giải thích. Phát hiện hiểu sai, điều chỉnh dạy học và đối chiếu kết quả theo từng học sinh.</p>
   </div>
   <div className="tt-head-actions">
    <button type="button" className="tt-btn tt-outline" onClick={onBack}><ArrowLeft size={17}/> Danh mục</button>
    <button type="button" className="tt-btn tt-outline" onClick={backup}><FileJson size={17}/> Sao lưu JSON</button>
    <button type="button" className="tt-btn tt-outline" onClick={()=>inputFile.current?.click()}><Upload size={17}/> Nhập JSON</button>
    <input ref={inputFile} type="file" accept=".json,application/json" hidden onChange={e=>restore(e.target.files?.[0])}/>
   </div>
  </header>
  <div className="tt-note"><ShieldCheck size={19}/><span>Chấm điểm theo đáp án giáo viên nhập; không dùng AI và không gửi dữ liệu lên máy chủ. Dữ liệu chỉ nằm trong phiên trang này. <b>Phải xuất JSON trước khi thoát/tải lại.</b></span></div>
  {error&&<div role="alert" className="tt-alert is-error">{error}</div>}
  {notice&&<div role="status" className="tt-alert is-ok">{notice}</div>}
  <div className="tt-stats">
   <div><span>Học sinh</span><strong>{roster.length}</strong><small>có mã định danh</small></div>
   <div><span>Đánh giá ban đầu</span><strong>{before.count}</strong><small>TB hiểu đầy đủ {fmt(before.average)}</small></div>
   <div><span>Đánh giá lại</span><strong>{after.count}</strong><small>TB hiểu đầy đủ {fmt(after.average)}</small></div>
   <div><span>Minh chứng</span><strong>{ready.count}/{ready.total}</strong><small>{ready.complete?'Đủ trường dữ liệu':'Chờ hoàn thiện'}</small></div>
  </div>
  <div className="tt-grid">
   <section className="tt-panel">
    <h3><ClipboardList size={20}/> 01 · Cấu hình công cụ</h3>
    <div className="tt-fields">
     {[[ 'title','Tên đợt đánh giá','Two-Tier Grammar Assessment'],['teacher','Giáo viên','Họ và tên'],['className','Lớp','12.6'],['objective','Mục tiêu','Phân biệt gerund, infinitive...']].map(([key,label,placeholder])=>
      <label key={key}>{label}<input value={meta[key]} placeholder={placeholder} disabled={records.length>0} onChange={e=>updateMeta(key,e.target.value)}/></label>)}
     <label>Ngày đánh giá<input type="date" value={meta.date} onChange={e=>updateMeta('date',e.target.value)}/></label>
    </div>
    <p className="tt-help">Mỗi dòng có 13 trường, ngăn bằng dấu |: Câu hỏi | 4 đáp án | Khóa tầng 1 | Câu giải thích | 4 lý do | Khóa tầng 2 | Chủ điểm.</p>
    <label className="tt-wide">Đề lần đầu (1–40 câu)<textarea rows={6} spellCheck={false} value={preRaw} onChange={e=>setPreRaw(e.target.value)}/></label>
    <label className="tt-check"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/> Dùng lại đề lần đầu khi đánh giá lại (có nguy cơ ghi nhớ đáp án)</label>
    {!repeat&&<label className="tt-wide">Đề đánh giá lại (số câu tương đương)<textarea rows={5} spellCheck={false} value={postRaw} onChange={e=>setPostRaw(e.target.value)} placeholder="Nhập bộ câu hỏi mới cùng chuẩn kiến thức và độ khó"/></label>}
    <button type="button" className="tt-btn tt-main" onClick={saveConfig}><CheckCircle2 size={17}/> Kiểm tra và lưu khóa đáp án</button>
    {config&&<p className="tt-success">Đã lưu {config.pre.length} câu lần đầu và {config.repeat?'dùng lại đề':config.post.length+' câu đánh giá lại'}.</p>}
   </section>
   <section className="tt-panel">
    <h3><Users size={20}/> 02 · Nhập và chấm bài</h3>
    <p className="tt-help">Dành cho giáo viên nhập điểm từ phiếu giấy. Mỗi cặp gồm <b>đáp án tầng 1 + đáp án lý do</b>. Ví dụ: <code>S001 | Nguyễn Văn A | BB CC CC</code>.</p>
    <div className="tt-segment">
     <button className={phase==='pre'?'is-active':''} onClick={()=>setPhase('pre')} type="button">Đánh giá ban đầu</button>
     <button className={phase==='post'?'is-active':''} onClick={()=>setPhase('post')} type="button">Đánh giá lại</button>
    </div>
    <label className="tt-wide">Dữ liệu học sinh: Mã HS | Họ tên | Các cặp đáp án
     <textarea rows={7} value={bulk} onChange={e=>setBulk(e.target.value)} placeholder={'S001 | Nguyễn Văn A | BB CC CC\nS002 | Trần Thị B | BA CA DD'}/>
    </label>
    <button type="button" className="tt-btn tt-main" onClick={addScores} disabled={!config}><CheckCircle2 size={17}/> Chấm và lưu kết quả</button>
    <div className="tt-key">
     {Object.entries(labels).map(([key,label])=><div key={key}><span className={'tt-dot '+key}/>{label}</div>)}
    </div>
    <p className="tt-help">Hai tầng được chấm bằng khóa đáp án rõ ràng. Trường hợp đáp án đúng nhưng lý do sai <b>không được tính là hiểu đầy đủ</b>.</p>
   </section>
   <section className="tt-panel tt-full">
    <h3><RefreshCcw size={20}/> 03 · Phân tích và đối chiếu</h3>
    <div className="tt-analysis">
     <div className="tt-analysis-table">
      <table><thead><tr><th>Phân loại hiểu biết</th><th>Lần đầu</th><th>Lần sau</th></tr></thead><tbody>
       {Object.entries(labels).map(([key,label])=><tr key={key}><td><span className={'tt-dot '+key}/>{label}</td><td>{before.counts[key]}</td><td>{after.counts[key]}</td></tr>)}
      </tbody></table>
     </div>
     <div className="tt-analysis-table">
      <table><thead><tr><th>Chủ điểm</th><th>Ban đầu</th><th>Đánh giá lại</th></tr></thead><tbody>
       {topics.length?topics.map(topic=><tr key={topic}><td>{topic}</td><td>{before.topics[topic]?fmt(100*before.topics[topic].mastered/before.topics[topic].total):'—'}</td><td>{after.topics[topic]?fmt(100*after.topics[topic].mastered/after.topics[topic].total):'—'}</td></tr>):
        <tr><td colSpan={3}>Chưa có dữ liệu; bảng sẽ hiển thị sau khi chấm.</td></tr>}
      </tbody></table>
     </div>
    </div>
    <p className="tt-help">Đã ghép {paired.count} học sinh có cả hai lượt. Chênh lệch trung bình: <b>{fmt(paired.averageDelta)}</b> (điểm phần trăm). Chỉ so sánh học sinh có đủ dữ liệu và cần ghi rõ tính tương đương của đề.</p>
    <div className="tt-table-scroll"><table><thead><tr><th>Mã HS</th><th>Trước</th><th>Sau</th><th>Thay đổi</th></tr></thead><tbody>
     {paired.rows.length?paired.rows.map(x=><tr key={x.code}><td>{x.code}</td><td>{fmt(x.before)}</td><td>{fmt(x.after)}</td><td>{x.delta.toFixed(1)} điểm %</td></tr>):
      <tr><td colSpan={4}>Chưa có cặp dữ liệu trước–sau.</td></tr>}
    </tbody></table></div>
   </section>
   <section className="tt-panel">
    <h3><BookOpenCheck size={20}/> 04 · Phiếu điều chỉnh dạy học</h3>
    {[['finding','Vấn đề phát hiện','Ví dụ: học sinh chọn đúng dạng nhưng chưa hiểu quy tắc'],['action','Biện pháp điều chỉnh','Hoạt động, nhóm học sinh, bài tập bổ sung'],['evidence','Tài liệu/minh chứng thực tế','Giáo án điều chỉnh, phiếu học sinh, đường dẫn lưu'],['comparability','Đánh giá tính tương đương','Cùng chuẩn, độ khó; khác bộ câu hỏi nếu có'],['reflection','Nhận xét sau can thiệp','Mức thay đổi và giới hạn của kết luận']].map(([key,label,placeholder])=>
     <label key={key} className="tt-wide">{label}<textarea rows={2} value={adjustment[key]} onChange={e=>updateAdjust(key,e.target.value)} placeholder={placeholder}/></label>)}
    <label className="tt-wide">Ngày thực hiện điều chỉnh<input type="date" value={adjustment.implementedDate} onChange={e=>updateAdjust('implementedDate',e.target.value)}/></label>
   </section>
   <section className="tt-panel">
    <h3><FileText size={20}/> 05 · Hồ sơ minh chứng</h3>
    <p className="tt-help">Bảng kiểm dựa vào dữ liệu đã nhập, không thay thế đánh giá của tổ chuyên môn.</p>
    <div className="tt-checks">{ready.checks.map((x,i)=><div key={i}><span className={x.ok?'is-ok':''}>{x.ok?'✓':'○'}</span><span>{x.label}</span><small>{x.ok?'Đã có':'Còn thiếu'}</small></div>)}</div>
    <label className="tt-check"><input type="checkbox" checked={demo} onChange={e=>setDemo(e.target.checked)}/> Đây là dữ liệu mô phỏng (ghi nhãn DEMO trên báo cáo)</label>
    <label className="tt-check"><input type="checkbox" checked={showNames} onChange={e=>setShowNames(e.target.checked)}/> Hiện tên học sinh trong báo cáo PDF (mặc định ẩn)</label>
    <div className="tt-export">
     <button type="button" className="tt-btn tt-main" disabled={!config} onClick={printReport}><Printer size={17}/> Hồ sơ PDF</button>
     <button type="button" className="tt-btn tt-outline" disabled={!records.length} onClick={()=>announce(()=>{downloadText('BRIAN-TwoTier-results.csv',twoTierCSV(roster,records,demo),'text/csv;charset=utf-8');return 'Đã xuất CSV có họ tên học sinh. Chỉ lưu ở nơi được cấp quyền.';})}><Download size={17}/> Kết quả CSV</button>
     <button type="button" className="tt-btn tt-outline" onClick={backup}><FileJson size={17}/> Sao lưu JSON</button>
     <button type="button" className="tt-btn tt-danger" onClick={resetAll}>Đặt lại phiên</button>
    </div>
    <p className="tt-help"><Info size={14}/> Báo cáo PDF không xác nhận tự động 3 điểm thi đua. Số liệu cần có nguồn gốc và được đối chiếu với bài làm thực tế.</p>
   </section>
  </div>
  <footer className="tt-footer">BRIAN TWO-TIER v1.0 · TEACHER-LED ASSESSMENT · DETERMINISTIC · NO AI · SESSION ONLY</footer>
 </main>;
}