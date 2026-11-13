import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,Check,CheckCircle2,ChevronRight,ClipboardList,Copy,Download,ExternalLink,KeyRound,LockKeyhole,Plus,Printer,QrCode,RefreshCw,ShieldAlert,Trash2,Users} from 'lucide-react';
import {LESSON_KITS,progressOfGroup} from './museumData.js';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES} from './liveLesson.js';
import {preparedCollectionFor} from './museumPreparedCollections.js';
import './museumPrepared.css';
import {staffRequest,joinUrl,fmtDate,fmtTime,saveTextFile} from './museumApi.js';
import {KitCover} from './MuseumDashboard.jsx';
const tr=(language,vi,en)=>language==='en'?en:vi;
const defaultDeadline=()=>new Date(Date.now()+7*86400000).toISOString().slice(0,16);
function Notice({error,success}){return error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={19}/>{error}</div>:success?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={18}/>{success}</div>:null;}
export function OneTimeInvites({invitations,onClose,language='vi'}){
 const [qr,setQr]=useState({});
 useEffect(()=>{let live=true;import('qrcode').then(({default:QRCode})=>
  Promise.all(invitations.map(async(inv)=>[inv.groupId,await QRCode.toDataURL(joinUrl(inv.handle),{margin:1,width:180,color:{dark:'#253d56',light:'#ffffff'}})])))
  .then(items=>{if(live)setQr(Object.fromEntries(items));}).catch(()=>{});return()=>{live=false;};},[invitations]);
 const copy=async inv=>{try{await navigator.clipboard.writeText(joinUrl(inv.handle)+'\nMã bí mật: '+inv.groupSecret);}catch{window.prompt('Sao chép phiếu nhóm:',joinUrl(inv.handle)+'\n'+inv.groupSecret);}};
 return <section className="bml-surface bml-qr-sheet" data-testid="museum-qr-invites">
  <div className="bml-section-head"><div><span className="bml-overline">CREATOR PASS · PRIVATE</span><h2>{tr(language,'Mã truy cập của từng nhóm','Group invitation codes')}</h2>
    <p>{tr(language,'Lưu hoặc in ngay. Mã bí mật chỉ được hiển thị một lần và không nằm trong QR.','Save or print these codes now. Private secrets are shown only once and are never embedded in QR codes.')}</p></div>
   <button type="button" className="bml-icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
  <div className="bml-qr-grid">{invitations.map(inv=><article className="bml-qr-card" key={inv.groupId}>
   <div className="bml-qr-top"><span className="bml-overline">BRIAN · MUSEUM LAB</span><strong>{inv.label}</strong></div>
   {qr[inv.groupId]?<img src={qr[inv.groupId]} width="180" height="180" alt={tr(language,'Mã QR mở Studio cho ','QR for ')+inv.label}/>:<div className="bml-qr-placeholder"><QrCode size={50}/></div>}
   <small>{tr(language,'QUÉT QR ĐỂ VÀO','SCAN TO START')}</small>
   <div className="bml-secret"><span>{tr(language,'Mã mời','Invite')}</span><code>{inv.handle}</code></div>
   <div className="bml-secret"><span>{tr(language,'Mã bí mật','Private code')}</span><code>{inv.groupSecret}</code></div>
   <button type="button" className="bml-outline" onClick={()=>copy(inv)}><Copy size={16}/>{tr(language,'Sao chép phiếu','Copy pass')}</button>
  </article>)}</div>
  <div className="bml-toolbar"><button type="button" className="bml-primary" onClick={()=>window.print()}><Printer size={17}/>{tr(language,'In phiếu cho các nhóm','Print group slips')}</button>
   <button type="button" className="bml-outline" onClick={onClose}>{tr(language,'Đã lưu mã · Đóng','Codes saved · Close')}</button></div>
 </section>;
}
export function LessonWizard({data,onExit,onCompleted,onSettings,language='vi'}){
 const [step,setStep]=useState(0);
 const kit=LESSON_KITS[0];
 const isAdmin=data?.profile?.role==='admin';
 const [form,setForm]=useState({classScope:'',groupCount:6,deadlineAt:defaultDeadline(),title:'',brief:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[invites,setInvites]=useState(null);
 const title=form.title||kit.title,brief=form.brief||kit.brief;
 const issue=async()=>{
  setError('');setBusy(true);
  try{
   const payload={title,classScope:form.classScope.trim(),brief,groupCount:Number(form.groupCount),
    deadlineAt:new Date(form.deadlineAt).toISOString()};
   const r=await staffRequest('create-assignment',payload);setInvites(r.invitations);
   await onCompleted();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <div className="bml-screen" data-testid="museum-lesson-wizard">
  <div className="bml-heading-line"><button className="bml-icon-btn" type="button" onClick={onExit} aria-label="Back"><ArrowLeft size={21}/></button>
   <div><span className="bml-overline">{tr(language,'TẠO BÀI HỌC','CREATE LESSON')}</span><h1>{tr(language,'Tạo bài học mới','Create a new lesson')}</h1></div></div>
  {invites?<OneTimeInvites invitations={invites} language={language} onClose={onExit}/>:<>
  <div className="bml-wizard-progress">{['Kế hoạch bài dạy','Lớp & nhóm','Giao nhiệm vụ'].map((label,i)=><div className={'bml-wizard-step '+(i<=step?'is-active':'')} key={label}>
   <span>{i<step?<Check size={16}/>:i+1}</span><strong>{tr(language,label,['Lesson plan','Class & groups','Issue assignment'][i])}</strong></div>)}</div>
  <section className="bml-surface bml-wizard-card">
   {step===0?<><h2>{tr(language,'Kế hoạch bài dạy','Lesson plan')}</h2>
    <p>{tr(language,
     'Một chủ đề duy nhất theo Kế hoạch bài dạy hai tiết: Tiếng Anh 11, Global Success, Unit 5 – Global Warming.',
     'One focused two-period lesson: English 11, Global Success, Unit 5 – Global Warming.')}</p>
    <div className="bml-single-lesson" data-testid="museum-single-unit5-plan">
     <KitCover kit={kit} size="large"/>
     <div className="bml-single-lesson-copy">
      <span className="bml-overline">OUR CLIMATE ACTION MUSEUM</span>
      <h3>{kit.title}</h3><p>{kit.subtitle}</p>
      <strong>{tr(language,'Câu hỏi định hướng','Driving question')}</strong>
      <p className="bml-single-lesson-question">{kit.challenge}</p>
      <p>{kit.goal}</p>
      <div className="bml-chips"><span>English 11 · Unit 5</span><span>{'2 × 45 min'}</span><span>11 {tr(language,'hoạt động','activities')}</span><span>STEAM learning</span></div>
     </div>
    </div>
    <section className="bml-single-outcomes" aria-label={tr(language,'Sản phẩm học tập','Learning products')}>
     <h3>{tr(language,'Sản phẩm học sinh cần hoàn thành','Expected student work')}</h3>
     <div className="bml-single-outcome-grid">
      <p><b>01 · The Problem – The Evidence – Our Solution</b><span>{tr(language,'Ba lời thuyết minh tiếng Anh, mỗi phần khoảng 25–40 từ.','Three English exhibit captions, approximately 25–40 words each.')}</span></p>
      <p><b>02 · Group-priority survey</b><span>{tr(language,'Biểu đồ từ phiếu lớp thật, số nhóm N, số đếm, phần trăm và giới hạn.','A genuine group-vote chart with N, counts, percentages and limitations.')}</span></p>
      <p><b>03 · Artwork & learning process</b><span>{tr(language,'Poster/ảnh gốc, phòng 3D, phản hồi chéo, bản cải tiến và phần trình bày 45–60 giây.','Original poster, 3D gallery, peer feedback, documented revision and a 45–60-second pitch.')}</span></p>
     </div>
    </section>
    <section className="bml-single-flow" aria-label={tr(language,'Tiến trình hai tiết','Two-period teaching sequence')}>
     <h3>{tr(language,'Tiến trình 11 hoạt động','11-activity lesson sequence')} · {LIVE_TOTAL_MINUTES} {tr(language,'phút','minutes')}</h3>
     <div className="bml-single-period-grid">{[1,2].map(period=><div key={period} className="bml-single-period">
      <h4>{tr(language,'Tiết','Period')} {period} · 45 {tr(language,'phút','minutes')}</h4>
      <ol>{LIVE_STAGES.map((activity,i)=>({activity,i})).filter(x=>x.activity.period===period).map(({activity,i})=>
       <li key={activity.id}><span>{String(i+1).padStart(2,'0')}</span><div>
        <strong>{language==='en'?activity.title:activity.vi}</strong>
        <small>{activity.minutes} {tr(language,'phút','min')} · {activity.title}</small>
       </div></li>)}</ol>
     </div>)}</div>
    </section>
    <p className="bml-single-lesson-note">{tr(language,
      'Tạo bài học mới không thay đổi các bài đã giao. Dữ liệu khảo sát, phản hồi và kết quả học sinh chỉ có khi lớp thực sự thực hiện.',
      'Creating this lesson does not alter existing assignments. Survey responses, peer feedback and student results are recorded only after classroom activity.')}</p>
   </>:null}
   {step===1?<><h2>{tr(language,'Thiết lập lớp và nhóm','Set class and groups')}</h2><p>{tr(language,'Chỉ điền những thông tin cần thiết. Mỗi nhóm sẽ nhận một Creator Pass riêng.','Only essential information is required. Every group gets its own Creator Pass.')}</p>
    <div className="bml-field-grid">
     <label>{tr(language,'Lớp học','Class')}<input autoFocus required maxLength={120} placeholder="11A3" value={form.classScope} onChange={e=>setForm(v=>({...v,classScope:e.target.value}))}/></label>
     <label>{tr(language,'Số nhóm','Number of groups')}<select value={form.groupCount} onChange={e=>setForm(v=>({...v,groupCount:Number(e.target.value)}))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1} {tr(language,'nhóm','groups')}</option>)}</select></label>
     <label>{tr(language,'Hạn nộp','Deadline')}<input type="datetime-local" required value={form.deadlineAt} onChange={e=>setForm(v=>({...v,deadlineAt:e.target.value}))}/></label>
    </div>
    <div className="bml-banner bml-info-banner"><CheckCircle2 size={19}/>{tr(language,
      'Admin trực tiếp giao nhiệm vụ, duyệt bài và công bố. Không cần phân công giáo viên/TTCM.',
      'The Admin assigns, reviews and publishes directly; no staff delegation is required.')}</div>
   </>:null}
   {step===2?<><h2>{tr(language,'Kiểm tra và giao bài','Review and share')}</h2>
    <p>{tr(language,'Xác nhận nội dung trước khi tạo mã nhóm. Sau khi tạo, mã bí mật sẽ chỉ xuất hiện một lần.','Confirm details before generating one-time private group codes.')}</p>
    <div className="bml-field-grid">
     <label>{tr(language,'Tên chủ đề','Lesson title')}<input maxLength={140} value={title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label>
     <label>{tr(language,'Lớp / nhóm','Class / groups')}<input disabled value={form.classScope+' · '+form.groupCount+' nhóm'}/></label>
    </div>
    <label className="bml-full-field">{tr(language,'Nhiệm vụ của học sinh','Student assignment')}<textarea rows={5} maxLength={5000} value={brief} onChange={e=>setForm(v=>({...v,brief:e.target.value}))}/></label>
    <div className="bml-wizard-summary"><div><BookOpen size={21}/><span>{kit.title}</span></div>
     <div><Users size={21}/><span>{form.groupCount} {tr(language,'nhóm','groups')} · {form.classScope}</span></div>
     <div><CalendarDays size={21}/><span>{tr(language,'Hạn','Due')} {fmtTime(form.deadlineAt)}</span></div></div>
    {!data?.creatorSettings?.enabled?<div className="bml-banner bml-warning-banner"><LockKeyhole size={20}/><span>{tr(language,'Creator Pass đang tắt. Admin cần bật sau khi nghiệm thu trước khi giao bài thật.','Creator Pass is OFF. An administrator must enable it after acceptance.')}</span>
      <button type="button" className="bml-text-btn" onClick={onSettings}>{tr(language,'Cài đặt','Settings')}</button></div>:null}
   </>:null}
   <Notice error={error}/>
   <div className="bml-wizard-footer"><button type="button" className="bml-outline" onClick={()=>step===0?onExit():setStep(s=>s-1)}>
     <ArrowLeft size={17}/>{tr(language,'Quay lại','Back')}</button>
    {step<2?<button type="button" className="bml-primary" disabled={step===1&&(!form.classScope.trim()||!isAdmin)} onClick={()=>setStep(s=>s+1)}>{tr(language,'Tiếp tục','Continue')} <ArrowRight size={17}/></button>:
    <button type="button" className="bml-primary" disabled={busy||!isAdmin||!data?.creatorSettings?.enabled||!form.classScope.trim()}
      onClick={issue}><QrCode size={18}/>{busy?tr(language,'Đang tạo…','Creating…'):tr(language,'Tạo mã nhóm & giao bài','Generate group codes')}</button>}</div>
  </section></>}
 </div>;
}
export function LessonsList({data,onCreate,onReview,onRefresh,onOpenCollection,query='',language='vi'}){
 const [selected,setSelected]=useState(null),[invites,setInvites]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const isAdmin=data?.profile?.role==='admin';
 const archiveAssignment=async assignment=>{
  if(!isAdmin||busy)return;
  if(!window.confirm(tr(language,
   'Xóa bài học “'+assignment.title+'” của lớp '+assignment.class_scope+' khỏi danh sách hoạt động? Mã nhóm sẽ bị thu hồi, nhưng dữ liệu gốc được lưu trong lịch sử. Bài đã công bố không thể xóa.',
   'Remove “'+assignment.title+'” ('+assignment.class_scope+') from active lessons? Group access will be revoked; historical evidence is preserved. Published lessons cannot be removed.')))return;
  setBusy(true);setError('');
  try{await staffRequest('archive-assignment',{assignmentId:assignment.id});setSelected(null);await onRefresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const allAssignments=data?.assignments||[],assignments=allAssignments.filter(a=>(a.title+' '+a.class_scope).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),groups=data?.groups||[],reviews=data?.reviews||[];
 const rotate=async groupId=>{if(!window.confirm(tr(language,'Mã cũ sẽ bị thu hồi. Bạn muốn cấp mã mới?','The old code will be revoked. Generate a new one?')))return;
  setBusy(true);setError('');
  try{const out=await staffRequest('rotate-invite',{groupId});setInvites([{groupId:out.groupId,label:'Mã cấp lại',handle:out.handle,groupSecret:out.groupSecret}]);await onRefresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <div className="bml-screen" data-testid="museum-lessons"><div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'LỚP HỌC SỐ','LESSON WORKSPACE')}</div>
  <h1>{tr(language,'Bài học của tôi','My lessons')}</h1><p>{tr(language,'Giao dự án và theo dõi từng nhóm.','Assign projects and track your groups.')}</p></div>
  {isAdmin?<button type="button" className="bml-primary" onClick={onCreate}><Plus size={19}/>{tr(language,'Tạo bài học mới','New lesson')}</button>:null}</div>
  <Notice error={error}/>
  {invites?<OneTimeInvites invitations={invites} onClose={()=>setInvites(null)} language={language}/>:null}
  {assignments.length?<div className="bml-lesson-list">{assignments.map(a=>{
   const mine=groups.filter(g=>g.assignment_id===a.id),done=mine.filter(g=>['submitted','ttcm_review','approved_locked','published'].includes(g.state)).length;
   const collection=preparedCollectionFor(a);
   return <article className="bml-lesson-block bml-surface" key={a.id}>
    <div className="bml-lesson-summary"><span className="bml-table-icon"><BookOpen size={22}/></span>
     <div><span className="bml-overline">{a.class_scope} · {tr(language,'Hạn','Due')} {fmtDate(a.deadline_at)}</span>
      <h2>{a.title}</h2><p>{done}/{mine.length} {tr(language,'nhóm đã nộp','groups submitted')}</p></div>
     <div className="bml-prepared-lesson-actions">
      {collection?<button type="button" className="bml-outline bml-prepared-visit" onClick={()=>onOpenCollection?.(collection.key)}>
       <BookOpen size={17}/>{tr(language,'Triển lãm 3D','3D exhibition')} <ArrowRight size={15}/></button>:null}
      <button type="button" className="bml-outline" onClick={()=>setSelected(selected===a.id?null:a.id)}>
       {selected===a.id?tr(language,'Thu gọn','Collapse'):tr(language,'Xem các nhóm','View groups')} <ChevronRight size={17}/></button>
      {isAdmin?<button type="button" disabled={busy} className="bml-danger bml-archive-btn"
        onClick={()=>archiveAssignment(a)} aria-label={tr(language,'Xóa bài học '+a.title,'Remove lesson '+a.title)}>
       <Trash2 size={17}/>{tr(language,'Xóa bài học','Delete lesson')}</button>:null}
     </div></div>
    <div className="bml-progress bml-progress-wide"><div style={{width:(mine.length?100*done/mine.length:0)+'%'}}/></div>
    {selected===a.id?<div className="bml-group-list">{mine.map(g=>{
      const state=progressOfGroup(g.state);const review=reviews.find(r=>r.group_id===g.id);
      return <div className="bml-group-row" key={g.id}><span className="bml-group-avatar"><Users size={18}/></span>
       <div><strong>{g.label}</strong><small>{state.label}</small></div><span className="bml-progress-small"><i style={{width:state.pct+'%'}}/></span>
       {review?<button type="button" className="bml-text-btn" onClick={()=>onReview(review.id)}>{tr(language,'Xem bài','Review')} <ArrowRight size={16}/></button>:null}
       {['issued','editing','changes_requested'].includes(g.state)&&a.created_by===data?.profile?.id?
       <button type="button" disabled={busy} className="bml-quiet-btn" onClick={()=>rotate(g.id)}><KeyRound size={16}/>{tr(language,'Cấp lại mã','Reset code')}</button>:null}
      </div>;})}
      {collection?<div className="bml-prepared-projects" data-testid={'lesson-portfolio-'+collection.key}>
       <div className="bml-prepared-projects-heading"><h3>{tr(language,'Dự án và tác phẩm','Projects and artwork')}</h3>
        <span>{collection.groupCount} {tr(language,'nhóm','groups')} · {collection.groupCount*3} {tr(language,'tác phẩm','exhibits')}</span></div>
       <div className="bml-prepared-project-grid">{collection.projects.map(p=>
        <button type="button" key={p.id} className="bml-prepared-project" onClick={()=>onOpenCollection?.(collection.key)}>
         <small>{p.label}</small><strong>{p.title}</strong>
         <span>{p.solution}</span>
         <em>{tr(language,'Xem tác phẩm trong bảo tàng','View in 3D museum')} <ArrowRight size={15}/></em>
        </button>)}</div>
      </div>:null}</div>:null}
   </article>;
  })}</div>:<div className="bml-empty bml-surface"><BookOpen size={36}/><h2>{tr(language,'Chưa có bài học','No lessons assigned yet')}</h2>
    <p>{tr(language,'Tạo bài học đầu tiên từ một mẫu có sẵn.','Create your first lesson from a curated template.')}</p>
    <button type="button" className="bml-primary" onClick={onCreate}><Plus size={18}/>{tr(language,'Tạo bài học','Create lesson')}</button>
   </div>}
 </div>;
}
