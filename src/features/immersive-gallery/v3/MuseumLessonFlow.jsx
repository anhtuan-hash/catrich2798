import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronRight,ClipboardList,Copy,Download,Eye,EyeOff,ExternalLink,KeyRound,Landmark,LockKeyhole,Plus,Printer,QrCode,RefreshCw,ShieldAlert,Trash2,Users} from 'lucide-react';
import {ASEAN_TEMPLATE,ASEAN_TITLE,ASEAN_SUBTITLE,ASEAN_CHALLENGE,ASEAN_BRIEF,ASEAN_STAGES,ASEAN_MIN_GROUPS,ASEAN_MAX_GROUPS,isAsean,aseanDestination} from './aseanLesson.js';
import {progressOfGroup} from './museumData.js';
import {englishSystemGroupLabel} from './museumApi.js';
import './museumPrepared.css';
import {staffRequest,joinUrl,saveTextFile} from './museumApi.js';
import MuseumGroupQr from './MuseumGroupQr.jsx';
import {isPublicWorkshopGroup} from './aseanPublicWorkshop.js';
import './museumLessonQr.css';
import './museumLessonPaperV57.css';
import './museumQuickAccessV58.css';
import './museumLessonWizardEditorial.css';
const tr=(language,vi,en)=>language==='en'?en:vi;
const deadlineForWindow=accessWindow=>new Date(Date.now()+({standard:7,extended:30,term:90}[accessWindow]||7)*86400000).toISOString();
function Notice({error,success}){return error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={19}/>{error}</div>:success?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={18}/>{success}</div>:null;}
export function OneTimeInvites({invitations,onClose,language='vi'}){
 const [qr,setQr]=useState({});
 useEffect(()=>{let live=true;import('qrcode').then(({default:QRCode})=>
  Promise.all(invitations.map(async(inv)=>[inv.groupId,await QRCode.toDataURL(joinUrl(inv.handle),{margin:1,width:180,color:{dark:'#253d56',light:'#ffffff'}})])))
  .then(items=>{if(live)setQr(Object.fromEntries(items));}).catch(()=>{});return()=>{live=false;};},[invitations]);
 const copy=async inv=>{try{await navigator.clipboard.writeText(joinUrl(inv.handle)+'\nMã bí mật: '+inv.groupSecret);}catch{window.prompt('Sao chép phiếu nhóm:',joinUrl(inv.handle)+'\n'+inv.groupSecret);}};
 return <section className="bml-surface bml-qr-sheet" data-testid="museum-qr-invites">
  <div className="bml-section-head"><div><span className="bml-overline">CREATOR PASS · PRIVATE</span><h2>{tr(language,'Mã truy cập của từng nhóm','Group invitation codes')}</h2>
    <p>{tr(language,'Lưu hoặc in ngay. Mã bí mật chỉ được hiển thị một lần và không nằm trong QR.','Save or print these codes. Private passcodes are not embedded in QR codes; Admin can reveal them later from My lessons.')}</p></div>
   <button type="button" className="bml-icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
  <div className="bml-qr-grid">{invitations.map(inv=><article className="bml-qr-card" key={inv.groupId}>
   <div className="bml-qr-top"><span className="bml-overline">BRIAN · MUSEUM LAB</span><strong>{language==='en'?englishSystemGroupLabel(inv.label):inv.label}</strong></div>
   {qr[inv.groupId]?<img src={qr[inv.groupId]} width="180" height="180" alt={tr(language,'Mã QR mở Studio cho ','QR for ')+(language==='en'?englishSystemGroupLabel(inv.label):inv.label)}/>:<div className="bml-qr-placeholder"><QrCode size={50}/></div>}
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
 const isAdmin=data?.profile?.role==='admin'&&!data?.offlineReadOnly;
 const [form,setForm]=useState({classScope:'',groupCount:ASEAN_MAX_GROUPS,accessWindow:'standard',title:'',brief:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[invites,setInvites]=useState(null);
 const creatorSettings=data?.creatorSettings;
 const codesUnavailable=creatorSettings?.group_codes_ready===false;
 const setupMessage=tr(language,'Máy chủ chưa được cấu hình để tạo mã nhóm.','The server has not been configured to generate group codes.');
 const disabledMessage=tr(language,'Hãy bật Creator Pass trong phần Cài đặt để giao bài.','Enable Creator Pass in Settings to issue the assignment.');
 const title=form.title||ASEAN_TITLE,brief=form.brief||ASEAN_BRIEF;
 const issue=async()=>{
  if(busy||!isAdmin||!creatorSettings?.enabled||codesUnavailable)return;
  setError('');setBusy(true);
  try{
   const payload={title,classScope:form.classScope.trim(),brief,groupCount:form.groupCount,lessonTemplate:ASEAN_TEMPLATE,
    deadlineAt:deadlineForWindow(form.accessWindow)};
   const r=await staffRequest('create-assignment',payload);setInvites(r.invitations);
   await onCompleted();
  }catch(e){
   if(e.code==='creator_pass_not_configured')setError(setupMessage);
   else if(e.code==='creator_pass_disabled')setError(disabledMessage);
   else setError(e.message);
  }finally{setBusy(false);}
 };
 const steps=[
  tr(language,'Kế hoạch bài dạy','Lesson plan'),
  tr(language,'Lớp & nhóm','Class & groups'),
  tr(language,'Giao nhiệm vụ','Issue assignment'),
 ];
 const stepNumber=String(step+1).padStart(2,'0');
 const [titleFirst,titleSecond]=language==='en'?['Create a','new lesson']:['Tạo bài','học mới'];
 return <div className="bml-screen swiss-editorial-wizard" data-testid="museum-lesson-wizard">
  <header className="wizard-masthead">
   <div>
    <p className="wizard-kicker">{tr(language,'TẠO BÀI HỌC','CREATE LESSON')}</p>
    <h1>{titleFirst}{' '}<span>{titleSecond}</span></h1>
    <button className="wizard-back-link" type="button" onClick={onExit}>
     <ArrowLeft size={17} aria-hidden="true"/>{tr(language,'Về danh sách bài học','Back to lessons')}
    </button>
   </div>
   {!invites?<div className="wizard-step-feature">
    <span className="wizard-step-number" aria-hidden="true">{stepNumber}</span>
    <div className="wizard-step-caption">
     <small>{tr(language,'Bước','Step')} {step+1} {tr(language,'trên','of')} {steps.length}</small>
     <strong>{steps[step]}</strong>
    </div>
   </div>:null}
  </header>
  {invites?<OneTimeInvites invitations={invites} language={language} onClose={onExit}/>:<>
  <ol className="wizard-steps" role="list" aria-label={tr(language,'Các bước tạo bài học','Lesson creation steps')}>
   {steps.map((label,i)=><li key={i} aria-current={i===step?'step':undefined}>
    <b className="wizard-step-index" aria-hidden="true">{i<step?<Check size={24}/>:String(i+1).padStart(2,'0')}</b>
    <strong>{label}</strong>
   </li>)}
  </ol>
  <section className="bml-surface bml-wizard-card">
   {step===0?<section className="bml-single-flow"><h2>{ASEAN_TITLE}</h2>
    <p>{ASEAN_SUBTITLE}</p><p>{ASEAN_CHALLENGE}</p>
    <ol>{ASEAN_STAGES.map(stage=><li key={stage.id}>{stage.title} · {stage.minutes} min</li>)}</ol>
    <p>{tr(language,'Mỗi nhóm thực hiện ba khung ảnh về một điểm đến.','Each group builds a three-frame exhibit about one destination.')}</p>
   </section>:null}
   {step===1?<><h2>{tr(language,'Thiết lập lớp và nhóm','Set class and groups')}</h2><p>{tr(language,'Chỉ điền những thông tin cần thiết. Mỗi nhóm sẽ nhận một Creator Pass riêng.','Only essential information is required. Every group gets its own Creator Pass.')}</p>
    <div className="bml-field-grid">
     <label>{tr(language,'Lớp học','Class')}<input autoFocus required maxLength={120} placeholder="11A3" value={form.classScope} onChange={e=>setForm(v=>({...v,classScope:e.target.value}))}/></label>
     <label>{tr(language,'Số nhóm','Number of groups')}
      <select value={form.groupCount} onChange={e=>setForm(v=>({...v,groupCount:Number(e.target.value)}))}>
       {Array.from({length:ASEAN_MAX_GROUPS-ASEAN_MIN_GROUPS+1},(_,index)=>{
        const count=ASEAN_MIN_GROUPS+index;
        return <option key={count} value={count}>{count} {tr(language,'nhóm','groups')}</option>;
       })}
      </select>
     </label>
     <label>{tr(language,'Quyền truy cập bài','Submission access')}<select value={form.accessWindow} onChange={e=>setForm(v=>({...v,accessWindow:e.target.value}))}>
      <option value="standard">{tr(language,'Tiêu chuẩn','Standard')}</option>
      <option value="extended">{tr(language,'Mở rộng','Extended')}</option>
      <option value="term">{tr(language,'Cả học kỳ','Full term')}</option>
     </select></label>
    </div>
    <div className="bml-banner bml-info-banner"><CheckCircle2 size={19}/>{tr(language,
      'Admin trực tiếp giao nhiệm vụ, duyệt bài và công bố. Không cần phân công giáo viên/TTCM.',
      'The Admin assigns, reviews and publishes directly; no staff delegation is required.')}</div>
   </>:null}
   {step===2?<><h2>{tr(language,'Kiểm tra và giao bài','Review and share')}</h2>
    <p>{tr(language,'Xác nhận nội dung trước khi tạo mã nhóm. Sau khi tạo, mã bí mật sẽ chỉ xuất hiện một lần.','Confirm details before generating one-time private group codes.')}</p>
    <div className="bml-field-grid">
     <label>{tr(language,'Tên chủ đề','Lesson title')}<input maxLength={140} value={title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label>
     <label>{tr(language,'Lớp / nhóm','Class / groups')}<input disabled value={form.classScope+' · '+form.groupCount+' '+tr(language,'nhóm','groups')}/></label>
    </div>
    <label className="bml-full-field">{tr(language,'Nhiệm vụ của học sinh','Student assignment')}<textarea rows={5} maxLength={5000} value={brief} onChange={e=>setForm(v=>({...v,brief:e.target.value}))}/></label>
    <div className="bml-wizard-summary"><div><BookOpen size={21}/><span>{ASEAN_TITLE}</span></div>
     <div><Users size={21}/><span>{form.groupCount} {tr(language,'nhóm','groups')} · {form.classScope}</span></div>
</div>
    {!creatorSettings?.enabled?<div className="bml-banner bml-warning-banner"><LockKeyhole size={20}/><span>{disabledMessage}</span>
      <button type="button" className="bml-text-btn" onClick={onSettings}>{tr(language,'Cài đặt','Settings')}</button></div>:null}
   </>:null}
   <Notice error={error||(step===2&&creatorSettings?.enabled&&codesUnavailable?setupMessage:'')}/>
   <div className="bml-wizard-footer"><button type="button" className="bml-outline" onClick={()=>step===0?onExit():setStep(s=>s-1)}>
     <ArrowLeft size={17}/>{tr(language,'Quay lại','Back')}</button>
    {step<2?<button type="button" className="bml-primary" disabled={step===1&&(!form.classScope.trim()||!isAdmin)} onClick={()=>setStep(s=>s+1)}>{tr(language,'Tiếp tục','Continue')} <ArrowRight size={17}/></button>:
    <button type="button" className="bml-primary" disabled={busy||!isAdmin||!creatorSettings?.enabled||codesUnavailable||!form.classScope.trim()}
      onClick={issue}><QrCode size={18}/>{busy?tr(language,'Đang tạo…','Creating…'):tr(language,'Tạo mã nhóm & giao bài','Generate group codes')}</button>}</div>
  </section></>}
 </div>;
}

function PrivatePasscodeCard({secret,available,revealed,busy,onShow,onHide,onCopy,language}){
 return <div className="bml-private-passcode" data-testid="museum-private-passcode">
  <small className="bml-private-passcode-label"><LockKeyhole size={14} aria-hidden="true"/> {tr(language,'Mã riêng của nhóm','Private group passcode')}</small>
  <code className={revealed&&secret?'is-revealed':''}>{revealed&&secret?secret:'••••••••••••'}</code>
  {!available&&!secret?<small className="bml-private-passcode-unavailable">{tr(language,'Hãy cấp mã mới để xem.','Older code cannot be recovered. Regenerate to view.')}</small>:null}
  <div className="bml-private-passcode-buttons">
   {revealed&&secret?<><button type="button" onClick={onHide}><EyeOff size={13}/> {tr(language,'Ẩn','Hide')}</button>
    <button type="button" onClick={onCopy}><Copy size={13}/> {tr(language,'Sao chép','Copy')}</button></>:
    <button type="button" disabled={busy||!available&&!secret} onClick={onShow}>
      <Eye size={13}/> {busy?tr(language,'Đang tải…','Loading…'):tr(language,'Hiện mã','Show code')}
    </button>}
  </div>
 </div>;
}

export function LessonsList({data,onCreate,onReview,onRefresh,query='',language='vi',standalone=false}){
 const [selected,setSelected]=useState('__auto__'),[invites,setInvites]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [pickedGroup,setPickedGroup]=useState(null);
 const [secrets,setSecrets]=useState({}),[visibleSecrets,setVisibleSecrets]=useState({});
 const [passcodeBusy,setPasscodeBusy]=useState(false),[success,setSuccess]=useState('');
 const copyPass=async secret=>{
  try{await navigator.clipboard.writeText(secret);}
  catch{window.prompt('Copy private group passcode:',secret);}
 };
 const hideGroup=groupId=>{
  setVisibleSecrets(prev=>{const next={...prev};delete next[groupId];return next;});
  setSecrets(prev=>{const next={...prev};delete next[groupId];return next;});
 };
 const revealPasscodes=async(assignment,groupId=null)=>{
  if(passcodeBusy)return;
  setPasscodeBusy(true);setError('');setSuccess('');
  try{
   const result=await staffRequest('reveal-passcodes',{assignmentId:assignment.id});
   const values=Object.fromEntries(result.passcodes.filter(x=>x.groupSecret).map(x=>[x.groupId,x.groupSecret]));
   setSecrets(prev=>({...prev,...values}));
   const selected=groupId?result.passcodes.filter(x=>x.groupId===groupId&&x.groupSecret):result.passcodes.filter(x=>x.groupSecret);
   setVisibleSecrets(prev=>({...prev,...Object.fromEntries(selected.map(x=>[x.groupId,true]))}));
   if(!selected.length)setSuccess('Older private codes cannot be recovered. Use Regenerate all passcodes to create viewable ones.');
  }catch(e){setError(e.message);}finally{setPasscodeBusy(false);}
 };
 const hideLessonPasscodes=assignment=>{
  const ids=new Set((data?.groups||[]).filter(g=>g.assignment_id===assignment.id).map(g=>g.id));
  setVisibleSecrets(prev=>Object.fromEntries(Object.entries(prev).filter(([id])=>!ids.has(id))));
  setSecrets(prev=>Object.fromEntries(Object.entries(prev).filter(([id])=>!ids.has(id))));
 };
 const changeQuickAccess=async assignment=>{
  if(busy||passcodeBusy)return;
  const willEnable=!assignment.quick_access_enabled;
  const message=willEnable?
   'Enable Quick Classroom Access for '+assignment.title+'? Students with a group QR or invitation link can enter using the shared classroom password PEK123. Private group passcodes remain valid. Anyone with a link and this password can enter the corresponding group.':
   'Disable Quick Classroom Access for '+assignment.title+'? Existing quick-access sessions will be invalidated. Private group passcodes remain valid.';
  if(!window.confirm(message))return;
  setBusy(true);setError('');setSuccess('');
  try{
   const output=await staffRequest('quick-access-setting',{assignmentId:assignment.id,enabled:willEnable});
   await onRefresh();
   setSuccess(output.enabled?
    'Quick Classroom Access enabled. Share each group QR/link and classroom password PEK123.':
    'Quick Classroom Access disabled. Private group passcodes still work.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const regenerateAll=async assignment=>{
  if(busy||passcodeBusy)return;
  const name=assignment.title+' · '+assignment.class_scope;
  if(!window.confirm('Regenerate ALL Private group passcodes for '+name+'?\\n\\nExisting student sign-in sessions and old passcodes will be revoked. QR invitation links, submissions, reviews and exhibitions will remain unchanged. Distribute the new passcodes to your groups.'))return;
  setBusy(true);setError('');setSuccess('');
  try{
   const out=await staffRequest('regenerate-all-passcodes',{assignmentId:assignment.id});
   await onRefresh();
   const values=Object.fromEntries(out.passcodes.map(x=>[x.groupId,x.groupSecret]));
   setSecrets(prev=>({...prev,...values}));
   setVisibleSecrets(prev=>({...prev,...Object.fromEntries(out.passcodes.map(x=>[x.groupId,true]))}));
   setSuccess('Created '+out.count+' new private group passcodes. QR codes and student work were preserved. Copy and share the new codes securely.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };

 const isAdmin=data?.profile?.role==='admin'&&!data?.offlineReadOnly;
 const archiveAssignment=async assignment=>{
  if(!isAdmin||busy)return;
  const publishedCount=(data?.groups||[]).filter(g=>g.assignment_id===assignment.id&&g.state==='published').length;
  const label='“'+assignment.title+'” · '+assignment.class_scope;
  const confirmation=publishedCount?tr(language,
   'Bài học '+label+' có '+publishedCount+' triển lãm đã công bố. Bạn muốn xóa BÀI HỌC khỏi danh sách đang hoạt động? Mã nhóm sẽ bị thu hồi, nhưng '+publishedCount+' triển lãm vẫn còn trong mục Triển lãm. Nội dung và lịch sử học sinh được giữ lại.',
   'Lesson '+label+' has '+publishedCount+' published exhibition(s). Remove this LESSON from active lessons and revoke group passes? The published exhibitions remain visible in the Gallery, and student work and history are preserved.'):
   tr(language,
    'Xóa bài học '+label+' khỏi danh sách hoạt động và thu hồi mã nhóm? Bài học được lưu trữ an toàn, không xóa vĩnh viễn dữ liệu và lịch sử học sinh.',
    'Remove lesson '+label+' from active lessons and revoke group passes? Student work and history will remain safely archived.');
  if(!window.confirm(confirmation))return;
  setBusy(true);setError('');
  try{await staffRequest('archive-assignment',{assignmentId:assignment.id});setSelected(null);await onRefresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const allAssignments=data?.assignments||[],assignments=allAssignments.filter(a=>(a.title+' '+a.class_scope).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),groups=data?.groups||[],reviews=data?.reviews||[],exitTickets=data?.exitTickets||[];
 const rotate=async groupId=>{if(!window.confirm(tr(language,'Mã cũ sẽ bị thu hồi. Bạn muốn cấp mã mới?','The old code will be revoked. Generate a new one?')))return;
  setBusy(true);setError('');
  try{const out=await staffRequest('rotate-invite',{groupId});setInvites([{groupId:out.groupId,label:tr(language,'Mã cấp lại','New invitation'),handle:out.handle,groupSecret:out.groupSecret}]);
   setSecrets(prev=>({...prev,[groupId]:out.groupSecret}));setVisibleSecrets(prev=>({...prev,[groupId]:true}));await onRefresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const groupCards=data?.aseanResponses||[];
 const aseanList=isAsean(data?.lessonTemplate);
 return <div className="bml-screen bml-lesson-workspace-v57 swiss-editorial-lessons" data-testid="museum-lessons"><div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'LỚP HỌC SỐ','LESSON WORKSPACE')}</div>
  <h1>{tr(language,'Bài học của tôi','My lessons')}</h1><p>{tr(language,'Giao dự án và theo dõi từng nhóm.','Assign projects and track your groups.')}</p></div>
  {isAdmin?<button type="button" className="bml-primary" onClick={onCreate}><Plus size={19}/>{tr(language,'Tạo bài học mới','New lesson')}</button>:null}</div>
  <div className="kpi-grid mb20" role="list" aria-label={tr(language,'Số liệu bài học','Lesson figures')}>
   <div className="kpi" role="listitem"><strong><i>{allAssignments.length}</i></strong><small>{tr(language,'Bài học đã giao','Assigned lessons')}</small></div>
   <div className="kpi" role="listitem"><strong>{groups.length}</strong><small>{tr(language,'Nhóm học sinh','Active groups')}</small></div>
   <div className="kpi" role="listitem"><strong>{reviews.length}</strong><small>{tr(language,'Bảo tàng đã nộp','Museum submissions')}</small></div>
   <div className="kpi" role="listitem"><strong>{aseanList?groupCards.filter(ticket=>ticket.stage_index===5).length:exitTickets.length}</strong><small>{aseanList?'Group transfer cards':'Exit Tickets'}</small></div>
  </div>
  <Notice error={error} success={success}/>
  {invites?<OneTimeInvites invitations={invites} onClose={()=>setInvites(null)} language={language}/>:null}
  {assignments.length?<div className="bml-lesson-list">{assignments.map(a=>{
   const mine=groups.filter(g=>g.assignment_id===a.id).sort((left,right)=>String(left.label||'').localeCompare(String(right.label||''),undefined,{numeric:true})),done=mine.filter(g=>['submitted','ttcm_review','approved_locked','published'].includes(g.state)).length;
   const asean=isAsean(a);
   const activityCards=asean?groupCards.filter(card=>card.stage_index===5):exitTickets;
   const exitCount=mine.filter(g=>activityCards.some(t=>t.group_id===g.id)).length;
   const expanded=selected===a.id||(selected==='__auto__'&&a.id===assignments[0]?.id);
   const frozen=Boolean(a.content_frozen_at);
   const showPublicGroupLink=data?.publicReadOnly||(standalone&&frozen);
   const canManagePasscodes=!showPublicGroupLink&&isAdmin&&a.created_by===data?.profile?.id;
   const allVisible=mine.length>0&&mine.every(g=>visibleSecrets[g.id]&&secrets[g.id]);
   const activeGroup=mine.find(group=>group.id===pickedGroup)||mine[0];
   const activeLabel=language==='en'?englishSystemGroupLabel(activeGroup?.label):activeGroup?.label;
   const publishedRoom=showPublicGroupLink&&data?.publishedGalleries?.find(gallery=>gallery.assignment_id===a.id)
    ?.destinations?.find(destination=>destination.groupLabel===activeGroup?.label);
   const publicWorkshop=standalone&&publishedRoom&&!data?.offlineReadOnly&&activeGroup&&isPublicWorkshopGroup(a,activeGroup)&&
    reviews.some(review=>review.group_id===activeGroup.id&&review.state==='published');
   const activeTicket=activityCards.find(ticket=>ticket.group_id===activeGroup?.id);
   const activeAnswer=typeof activeTicket?.value==='string'?activeTicket.value:JSON.stringify(activeTicket?.value);
   const canRotate=activeGroup&&!frozen&&canManagePasscodes&&['issued','editing','changes_requested'].includes(activeGroup.state);
   return <article className="bml-lesson-block bml-surface bml-paper-lesson-block" key={a.id}>
    <div className="bml-lesson-summary bml-lesson-hero-summary">
     <span className="bml-table-icon bml-lesson-hero-icon" aria-hidden="true"><BookOpen size={25}/></span>
     <div className="bml-lesson-title-area">
      <span className="bml-lesson-class-chip">{tr(language,'Lớp','Class')} {a.class_scope}</span>
      <h2>{a.title}</h2>
      <div className="bml-lesson-facts" aria-label="Lesson progress">
       <span><Users size={14}/>{mine.length} groups</span>
       {frozen?<span role="status" className="bml-lesson-frozen"><LockKeyhole size={14}/> FINAL · VIEW ONLY</span>:null}
       <span><ClipboardList size={14}/>{asean?tr(language,'Phiếu vận dụng','Group transfer cards'):'Exit Tickets'}: {exitCount}/{mine.length}</span>
       <span><Landmark size={14}/>Museum projects: {done}/{mine.length}</span>
      </div>
     </div>
     <div className="bml-prepared-lesson-actions">
      <button type="button" className="bml-outline bml-lesson-toggle" aria-expanded={expanded} onClick={()=>setSelected(expanded?null:a.id)}>
       {expanded?tr(language,'Thu gọn','Collapse'):tr(language,'Xem các nhóm','View groups')} <ChevronRight size={17} className={expanded?'is-expanded':''}/></button>
      {isAdmin?<button type="button" disabled={busy||frozen} className="bml-danger bml-archive-btn"
        onClick={()=>archiveAssignment(a)} aria-label={tr(language,'Xóa bài học '+a.title,'Remove lesson '+a.title)}>
       <Trash2 size={17}/>{tr(language,'Xóa bài học','Delete lesson')}</button>:null}
     </div>
    </div>
    <div className="bml-progress bml-progress-wide bml-lesson-overall-progress" role="progressbar" aria-label="Museum project submission progress" aria-valuemin={0} aria-valuemax={mine.length} aria-valuenow={done}>
     <div style={{width:(mine.length?100*done/mine.length:0)+'%'}}/>
    </div>
    {expanded?<>
      {canManagePasscodes?<div className="bml-lesson-passcode-toolbar" role="group" aria-label="Private group passcode controls">
       <div className="bml-passcode-toolbar-copy"><span className="bml-passcode-toolbar-icon"><LockKeyhole size={20} aria-hidden="true"/></span>
        <strong>{tr(language,'Mã riêng của nhóm','Private group passcodes')}</strong><small>{tr(language,'Chỉ quản trị viên · không nằm trong QR','Admin only · never included in QR')}</small></div>
       <div className="bml-passcode-toolbar-actions">
        <button type="button" className={'bml-quick-access-toggle'+(a.quick_access_enabled?' is-active':'')}
         aria-pressed={Boolean(a.quick_access_enabled)} disabled={frozen||busy||passcodeBusy}
         onClick={()=>changeQuickAccess(a)}><KeyRound size={15}/>
         {a.quick_access_enabled?tr(language,'Truy cập nhanh đang bật','Quick access ON'):tr(language,'Bật truy cập nhanh','Enable quick access')}</button>
        {allVisible?<button type="button" className="bml-outline" onClick={()=>hideLessonPasscodes(a)}><EyeOff size={15}/> {tr(language,'Ẩn tất cả','Hide all')}</button>:
         <button type="button" className="bml-outline" disabled={passcodeBusy||busy} onClick={()=>revealPasscodes(a)}><Eye size={15}/> {tr(language,'Hiện tất cả mã','Show all passcodes')}</button>}
        <button type="button" className="bml-regenerate-all-passcodes" disabled={frozen||busy||passcodeBusy} onClick={()=>regenerateAll(a)}><RefreshCw size={15}/> {tr(language,'Cấp lại tất cả mã','Regenerate all passcodes')}</button>
       </div>
      </div>:null}
      {activeGroup ? (
        <div className="swiss-editorial-lesson-groups" data-testid="museum-group-qr-grid">
          <table aria-label={tr(language,'Nhóm học sinh','Student groups')}>
            <thead>
              <tr>
                <th scope="col">{tr(language,'Nhóm','Group')}</th>
                <th scope="col">{tr(language,'Sản phẩm bảo tàng','Museum project')}</th>
                <th scope="col">{asean?'Group transfer card':'Exit Ticket'}</th>
                <th scope="col">{tr(language,'Thao tác','Action')}</th>
              </tr>
            </thead>
            <tbody>
              {mine.map(g => {
                const review = reviews.find(item => item.group_id === g.id);
                const submitted = activityCards.some(ticket => ticket.group_id === g.id);
                const groupLabel = language === 'en' ? englishSystemGroupLabel(g.label) : g.label;
                const active = g.id === activeGroup.id;
                return (
                  <tr key={g.id} data-testid="museum-group-qr-card" className={active ? 'is-selected' : undefined}>
                    <th scope="row">
                      <button type="button" aria-pressed={active} onClick={() => setPickedGroup(g.id)}>
                        {groupLabel}{asean&&aseanDestination(g.label)?' · '+aseanDestination(g.label).name:''}
                      </button>
                    </th>
                    <td>{progressOfGroup(g.state,language).label}</td>
                    <td>{submitted ? tr(language,'Đã nộp','Submitted') : tr(language,'Chưa nộp','Not submitted')}</td>
                    <td>{review ? (
                      <button type="button" className="swiss-editorial-review" onClick={() => onReview(review.id)}>
                        {tr(language,'Xem bài','Review')} <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    ) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <aside className="swiss-editorial-group-detail" aria-label={activeLabel} key={activeGroup.id}>
            <h3>{activeLabel}</h3>
            {activeTicket ? (
              <details className="bml-lesson-qr-ticket">
                <summary>{asean?tr(language,'Xem phiếu vận dụng','View group transfer card'):tr(language,'Xem câu trả lời Exit Ticket','View Exit Ticket response')} <ArrowRight size={15} aria-hidden="true" /></summary>
                {asean?<><p>{activeTicket.value?.experience}</p><p>{activeTicket.value?.advice}</p></>:<p>{activeAnswer?.slice(0,2000)}</p>}
              </details>
            ) : data?.publicReadOnly ? (
              <p className="bml-muted">{tr(language,'Chưa có câu trả lời đã lưu cho nhóm này.','No saved response is available for this group.')}</p>
            ) : null}
            {(standalone?publicWorkshop:publishedRoom) && (
              <div className="bml-lesson-qr-access">
                <MuseumGroupQr publicGroupId={publicWorkshop?activeGroup.id:undefined}
                  exhibitionId={standalone?undefined:publishedRoom.id} groupLabel={activeLabel} language={language} />
              </div>
            )}
            {standalone&&frozen&&!publicWorkshop&&<p className="bml-muted">
              {tr(language,'Bài thực hành của nhóm này chưa có bản chỉ xem.','A view-only copy of this group’s workshop is unavailable.')}
            </p>}
            {!data?.offlineReadOnly && !showPublicGroupLink && activeGroup.invite_handle && (
              <div className="bml-lesson-qr-access">
                <MuseumGroupQr
                  handle={activeGroup.invite_handle}
                  showInviteLink={standalone}
                  groupLabel={activeLabel}
                  expiresAt={activeGroup.invite_expires_at}
                  revoked={activeGroup.invite_revoked}
                  language={language}
                />
                {standalone&&isAdmin&&!canManagePasscodes&&<p className="bml-muted">
                  {tr(language,'Mã riêng của nhóm chỉ hiển thị với tài khoản đã tạo bài này.','Group passcodes are visible to the account that created this lesson.')}
                </p>}
                {canManagePasscodes && (
                  <PrivatePasscodeCard
                    secret={secrets[activeGroup.id]}
                    available={activeGroup.invite_has_passcode}
                    revealed={Boolean(visibleSecrets[activeGroup.id])}
                    busy={passcodeBusy || busy}
                    onShow={() => revealPasscodes(a,activeGroup.id)}
                    onHide={() => hideGroup(activeGroup.id)}
                    onCopy={() => copyPass(secrets[activeGroup.id])}
                    language={language}
                  />
                )}
              </div>
            )}
            {canRotate && (
              <button type="button" className="bml-outline swiss-editorial-reset" disabled={busy} onClick={() => rotate(activeGroup.id)}>
                <KeyRound size={15} aria-hidden="true" /> {tr(language,'Cấp lại mã','Reset code')}
              </button>
            )}
          </aside>
        </div>
      ) : <p className="swiss-editorial-no-groups">{tr(language,'Chưa có nhóm.','No groups assigned yet.')}</p>}
    </> : null}
   </article>;
  })}</div>:<div className="bml-empty bml-surface"><BookOpen size={36}/><h2>{tr(language,'Chưa có bài học','No lessons assigned yet')}</h2>
    <p>{tr(language,'Tạo bài học mới từ kế hoạch giảng dạy đã duyệt.','Create your first lesson from the approved teaching plan.')}</p>
    <button type="button" className="bml-primary" disabled={!!data?.offlineReadOnly||!!data?.publicReadOnly} onClick={onCreate}><Plus size={18}/>{tr(language,'Tạo bài học','Create lesson')}</button>
   </div>}
 </div>;
}
