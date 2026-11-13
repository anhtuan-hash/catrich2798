import React,{Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronLeft,ChevronRight,CircleHelp,ClipboardCheck,Cloud,CloudAlert,CloudUpload,Eye,FileText,Info,KeyRound,Landmark,Leaf,Lightbulb,LockKeyhole,MessageSquare,RefreshCw,Send,ShieldCheck,Sparkles,Users,X} from 'lucide-react';
import {emptyStudio,documentFromStudio,normalizeStudio,STEPS,submissionMissing} from './museumData.js';
import {guestRequest,fmtTime,englishSystemGroupLabel} from './museumApi.js';
import {liveGuest} from './museumLiveApi.js';
import {wordCount,evidenceMissing,changedExhibits} from './learningEvidence.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumLiveStudent from './MuseumLiveStudent.jsx';
import MuseumArtworkStudio from './MuseumArtworkStudio.jsx';
import './museumLab.css';
import './museumStudentFocus.css';
import './museumStudentCanvas.css';
import './museumStudentEditorial.css';
const T=(lang,vi,en)=>lang==='en'?en:vi;
const getHandle=()=>{
 try{const raw=new URLSearchParams(window.location.hash.split('?')[1]||'').get('invite')||'';return raw.match(/^[A-Za-z0-9_-]{16,80}/)?.[0]||raw.slice(0,80);}catch{return '';}
};
const initialSession=()=>null;
function GuestEntry({onRedeem,busy,error,language}){
 const [handle,setHandle]=useState(getHandle),[secret,setSecret]=useState('');
 return <div className="bml-guest-entry" data-testid="museum-student-entry">
  <div className="bml-guest-illustration"><div className="bml-guest-overline"><Landmark size={27}/><b>BRIAN Museum Lab</b></div>
   <div className="bml-guest-globe" aria-hidden="true"><Landmark size={82}/><Leaf size={35}/></div>
   <h1>{T(language,'Bảo tàng của nhóm em bắt đầu tại đây.','Build a museum from your evidence.')}</h1>
   <p>{T(language,'Khám phá vấn đề · Viết bằng tiếng Anh · Trưng bày 3D','Explore an issue · Write in English · Create in 3D')}</p>
   <div className="bml-guest-benefits"><span><Check size={16}/>{T(language,'Không tạo tài khoản','No account needed')}</span>
    <span><Check size={16}/>{T(language,'Tự động lưu bài','Automatic saving')}</span></div>
  </div>
  <form className="bml-guest-form" onSubmit={e=>{e.preventDefault();onRedeem({handle:handle.trim(),groupSecret:secret});}}>
   <span className="bml-overline">{T(language,'STUDENT CREATOR PASS','STUDENT CREATOR PASS')}</span>
   <h2>{T(language,'Bắt đầu sáng tạo','Start creating')}</h2>
   <p>{T(language,'Quét QR giáo viên gửi, sau đó nhập mã bí mật riêng của nhóm.','Scan your teacher’s QR code, then enter your group’s private passcode.')}</p>
   <label>{T(language,'Mã lời mời','Invitation code')}<input autoComplete="off" maxLength={80} required value={handle} onChange={e=>setHandle(e.target.value)} placeholder={T(language,'Mã từ QR của giáo viên','Teacher invite code')}/></label>
   <label>{T(language,'Mã bí mật nhóm','Private group passcode')}<input autoComplete="off" type="password" required minLength={16} maxLength={128} value={secret} onChange={e=>setSecret(e.target.value)} placeholder={T(language,'Mã được cấp riêng','Private group code')}/></label>
   {error?<div className="bml-banner bml-danger-banner" role="alert">{error}</div>:null}
   <button type="submit" className="bml-primary bml-full-button" disabled={busy}><KeyRound size={18}/>{busy?T(language,'Đang kiểm tra mã…','Checking invitation…'):T(language,'Vào không gian sáng tạo','Enter Creator Studio')} <ArrowRight size={17}/></button>
   <small className="bml-privacy"><ShieldCheck size={17}/>{T(language,'Không nhập họ tên, ảnh cá nhân hoặc thông tin riêng tư vào triển lãm.','Never include student identities or private personal information in an exhibit.')}</small>
  </form>
 </div>;
}
const field=(label,value,update,{rows=0,placeholder='',limit=2500,disabled=false,required=false}={})=><label className="bml-full-field" key={label}>{label}
 {rows?<textarea rows={rows} maxLength={limit} disabled={disabled} required={required} placeholder={placeholder} value={value||''} onChange={e=>update(e.target.value)}/>:
 <input maxLength={limit} disabled={disabled} required={required} placeholder={placeholder} value={value||''} onChange={e=>update(e.target.value)}/>}
 </label>;
export default function MuseumLabStudent({language='en'}){
 const [session,setSession]=useState(initialSession),[studio,setStudio]=useState(emptyStudio);
 const [version,setVersion]=useState(0),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const [saveState,setSaveState]=useState('saved'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [step,setStep]=useState(0),[preview,setPreview]=useState(false),[conflict,setConflict]=useState(false);
 const [liveInfo,setLiveInfo]=useState(null),[artAssets,setArtAssets]=useState([]);
 const [history,setHistory]=useState([]),[studentView,setStudentView]=useState('studio');
 const [studioSubstep,setStudioSubstep]=useState(0),[historyOpen,setHistoryOpen]=useState(false);
 const [projectPreview,setProjectPreview]=useState(false),[studentTool,setStudentTool]=useState(null);
 const [artworkOpen,setArtworkOpen]=useState(false);
 // A copied group slip must not leave its secret in the browser URL.
 useEffect(()=>{
  try{
   const [route,qs='']=window.location.hash.split('?');
   if(route!=='#/gallery-create'||!qs)return;
   const params=new URLSearchParams(qs),raw=params.get('invite')||'',handle=getHandle();
   if(!raw||raw===handle||!handle)return;
   params.set('invite',handle);
   window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+route+'?'+params.toString());
  }catch{}
 },[]);
 const viewHistory=async()=>{try{setHistory((await liveGuest('history')).checkpoints||[]);}catch(e){setError(e.message);}};
 const documentRef=useRef(studio),versionRef=useRef(0),csrfRef=useRef(''),savingRef=useRef(false),dirtyRef=useRef(false);
 const groupLocked=session&&!['issued','editing','changes_requested'].includes(session.groupState);
 const liveRunning=liveInfo&&liveInfo.status!=='not_started';
 const stageIndex=liveInfo?.stageIndex??-1;
 // Group work is independent of the gated Teacher Live response.
 const maxStudentStep=4;
 const stageEditAllowed=!liveRunning||liveInfo.status==='active';
 // Group production defaults to the workbench; voting, quizzes and reflection use Live.
 // Keep both panes mounted to preserve unsent answers when switching views.
 useEffect(()=>{
  if(!liveRunning){setStudentView('studio');return;}
  const handsOn=['group','recap','artwork','present'].includes(liveInfo?.stage?.kind);
  setStudentView(handsOn?'studio':'live');
 },[stageIndex,liveRunning]);
 const locked=groupLocked||!stageEditAllowed;
 const studioPages=step===1?2:step===2?3:1;
 const showTool=name=>{setStudentView('live');setStudentTool({name,key:Date.now()});};
 useEffect(()=>{setStudioSubstep(0);setHistoryOpen(false);},[step]);
 useEffect(()=>{
  if(!liveRunning)return;
  if(stageIndex===3||stageIndex===4)setStep(1);
  else if(stageIndex===6||stageIndex===8)setStep(2);
  else if(stageIndex>=7&&stageIndex<=9)setStep(3);
  else if(stageIndex===10)setStep(4);
 },[stageIndex,liveRunning]);
 const load=useCallback(async()=>{
  const me=await guestRequest('me');const d=await guestRequest('draft');
  const parsed=normalizeStudio(d.draft);
  csrfRef.current=me.csrf;setSession(me);documentRef.current=parsed;setStudio(parsed);
  versionRef.current=d.version;setVersion(d.version);dirtyRef.current=false;setDirty(false);
  setSaveState('saved');setConflict(false);
 },[]);
 useEffect(()=>{let active=true;guestRequest('me').then(async me=>{
  const d=await guestRequest('draft');if(!active)return;
  const parsed=normalizeStudio(d.draft);
  csrfRef.current=me.csrf;setSession(me);documentRef.current=parsed;setStudio(parsed);
  versionRef.current=d.version;setVersion(d.version);
 }).catch(()=>{});return()=>{active=false;};},[]);
 const edit=change=>{
  if(locked||conflict)return;
  const before=documentRef.current,next=typeof change==='function'?change(before):change;
  documentRef.current=next;setStudio(next);dirtyRef.current=true;setDirty(true);setSaveState('saving');setError('');
 };
 const changeLearning=(key,value)=>edit(d=>({...d,learning:{...d.learning,[key]:value}}));
 const save=useCallback(async()=>{
  if(!session||savingRef.current||!dirtyRef.current||conflict||locked)return null;
  savingRef.current=true;setSaveState('saving');
  const snapshot=documentRef.current,raw=JSON.stringify(snapshot),expected=versionRef.current;
  try{
   if(snapshot.legacy)throw new Error(T(language,'Bản nháp cũ có nhiều phòng. Chưa thể tự chuyển đổi mà không kiểm tra nội dung.','The legacy draft contains multiple rooms. Review the original content before converting it.'));
   const result=await guestRequest('save','PUT',{draft:documentFromStudio(snapshot),expectedVersion:expected},csrfRef.current);
   versionRef.current=result.version;setVersion(result.version);
   if(JSON.stringify(documentRef.current)===raw){dirtyRef.current=false;setDirty(false);setSaveState('saved');}
   else setSaveState('saving');
   return result.version;
  }catch(e){
   if(e.status===409){setConflict(true);setSaveState('conflict');
    setError(T(language,'Một thiết bị khác đã sửa bản nháp. Hãy tải lại để tránh ghi đè.','Another device changed this draft. Reload to avoid overwriting.'));}
   else{setSaveState('error');setError(e.message);}
   return null;
  }finally{savingRef.current=false;}
 },[session,conflict,locked,language]);
 useEffect(()=>{
  if(!dirty||savingRef.current||conflict||locked)return undefined;
  const timer=window.setTimeout(()=>save(),1500);
  return()=>window.clearTimeout(timer);
 },[studio,dirty,version,save,conflict,locked]);
 const redeem=async credentials=>{setBusy(true);setError('');
  try{await guestRequest('redeem','POST',credentials);await load();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const logout=async()=>{setBusy(true);
  try{await guestRequest('logout','POST',{},csrfRef.current);}catch{}
  csrfRef.current='';setSession(null);documentRef.current=emptyStudio();setStudio(emptyStudio());
  setDirty(false);dirtyRef.current=false;setBusy(false);setStep(0);setNotice('');setError('');
 };
 const submit=async()=>{
  setError('');setNotice('');setBusy(true);
  try{
   if(studio.legacy)throw new Error(T(language,'Cần kiểm tra bản nháp cũ trước khi nộp.','Review the legacy draft before submitting.'));
   const missing=submissionMissing(documentRef.current,language);
   if(liveRunning&&documentRef.current.survey)missing.push(...evidenceMissing(documentFromStudio(documentRef.current)));
   if(missing.length)throw new Error(T(language,'Cần hoàn thành: ','Please complete: ')+missing.join(' · '));
   if(savingRef.current)throw new Error(T(language,'Đang lưu. Hãy thử lại sau khi thấy Đã lưu.','Saving. Please submit once the draft is saved.'));
   if(dirtyRef.current){const n=await save();if(n===null)throw new Error(T(language,'Chưa lưu được bản nháp.','Draft has not been saved.'));}
   await guestRequest('submit','POST',{expectedVersion:versionRef.current},csrfRef.current);
   await load();setNotice(T(language,'Bài đã nộp. Giáo viên sẽ kiểm tra và chuyển TTCM duyệt.','Submitted for Admin review. You can revise if the submission is returned.'));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 if(!session)return <div className="bml bml-student-shell bml-student-editorial" lang={language}><GuestEntry onRedeem={redeem} busy={busy} error={error} language={language}/></div>;
 const l=studio.learning,doc=documentFromStudio(studio),room=doc.rooms[0];
 const exhibitStatus=()=>[l.issue,l.evidence,l.solution].filter(Boolean).length;
 const progressChecks=[!!studio.title,!!l.issue,!!l.evidence,!!l.solution,!!l.source,!!l.feedback,!!l.improvement,!!l.tested,!!l.reflection];
 const progressPercent=Math.round(100*progressChecks.filter(Boolean).length/progressChecks.length);
 return <main className="bml bml-student-shell bml-student-canvas16 bml-student-editorial" data-testid="museum-student-wizard" lang={language} data-ui-locale={language==='en'?'en-US':'vi-VN'}>
  <header className="bml-student-bar"><div className="bml-brand"><span className="bml-brand-icon"><Landmark size={23}/></span><span><strong>BRIAN Museum Lab</strong><small>Student Creator</small></span></div>
   <div className="bml-student-right"><span className="bml-group-pill"><Users size={16}/>{language==='en'?englishSystemGroupLabel(session.groupLabel):session.groupLabel} · {session.assignment.class_scope}</span>
    <span className={'bml-save-indicator bml-save-'+saveState}>{saveState==='saved'?<><Cloud size={16}/>{T(language,'Đã lưu','Saved')}</>:
      saveState==='saving'?<><CloudUpload size={16}/>{T(language,'Đang lưu…','Saving…')}</>:<><CloudAlert size={16}/>{T(language,'Cần xử lý','Action needed')}</>}</span>
    <button type="button" className="bml-outline" onClick={logout}>{T(language,'Thoát','Exit')}</button></div></header>
  <div className="bml-student-content">
   <section className="bml-student-focus" data-testid="student-focus-switch" aria-label={T(language,'Bảng điều khiển học sinh','Student workspace')}>
    <div className="bml-student-focus-head">
     <span className="bml-student-focus-kicker"><Landmark size={16}/> THE STUDENT EDITION</span>
     <strong>{T(language,'Sổ tay triển lãm','Your museum workshop')}</strong>
     <span className="bml-student-focus-stage" role="status">
      <span className={liveRunning&&liveInfo?.stageOpen?'bml-focus-dot is-open':'bml-focus-dot'}/>
      {liveRunning?
       T(language,'Hoạt động','Activity')+' '+(stageIndex+1)+'/11 · '+(liveInfo?.stage?.title||'Teacher Live'):
       T(language,'Đang chờ giáo viên bắt đầu · Có thể xem sản phẩm nhóm','Waiting for teacher · Group workspace available')}
     </span>
    </div>
   <nav className="bml-student-steps" aria-label={T(language,'Các bước thực hiện','Project steps')}>{STEPS.map((s,i)=><button type="button" key={s.key}
     disabled={maxStudentStep<0||i>maxStudentStep}
     aria-current={i===step?'step':undefined}
     onClick={()=>{if(i<=maxStudentStep){setStep(i);setPreview(false);}}} className={i===step?'is-active':i<step?'is-complete':''}>
     <span>{i<step?<Check size={17}/>:i+1}</span><small>{T(language,s.vi,s.en)}</small></button>)}</nav>
   </section>
   <div className="bml-student-workbench" data-testid="student-one-screen-workspace">
    <aside className="bml-student-toolrail" aria-label={T(language,'Bảng công cụ học tập','Learning tools')}>
     <div className="bml-student-paper-note">
      <span className="bml-student-note-kicker"><BookOpen size={16}/> TODAY’S LESSON</span>
      <strong>{liveInfo?.stage?.title||T(language,'Sẵn sàng học tập','Ready to explore')}</strong>
      <p>{liveInfo?.stage?.sentence||T(language,'Các hoạt động sẽ đồng bộ theo giáo viên.','Follow the lesson, share your thinking, and build your exhibit.')}</p>
      <small>{liveRunning?T(language,'Tiết','Period')+' '+(liveInfo.stage?.period||1)+'/2 · '+(stageIndex+1)+'/11':T(language,'Đang chờ buổi dạy','Waiting for class')}</small>
     </div>
    <div className="bml-student-view-tabs" role="group" aria-label={T(language,'Chọn khu vực học tập','Choose learning area')}>
     <button data-testid="student-tab-live" type="button" aria-pressed={studentView==='live'}
      className={studentView==='live'?'is-active':''} onClick={()=>setStudentView('live')}>
      <BookOpen size={20}/><span><strong>{T(language,'Hoạt động hiện tại','Current activity')}</strong>
       <small>{liveRunning?
        (liveInfo?.stageOpen?T(language,'Đang mở · Tham gia ngay','Open · Join now'):T(language,'Đang chờ giáo viên','Waiting for teacher')):
        T(language,'Theo nhịp bài dạy','Follow the lesson')}</small></span>
     </button>
     <button data-testid="student-tab-studio" type="button" aria-pressed={studentView==='studio'}
      className={studentView==='studio'?'is-active':''} onClick={()=>setStudentView('studio')}>
      <ClipboardCheck size={20}/><span><strong>{T(language,'Sản phẩm của nhóm','Our group project')}</strong>
       <small>{T(language,'Thiết kế · Tự lưu · Nộp bài','Create · Autosave · Submit')}</small></span>
     </button>
    </div>

     <div className="bml-student-rail-label">{T(language,'CÔNG CỤ HỖ TRỢ','YOUR TOOLKIT')}</div>
     <div className="bml-student-rail-tools">
      <button type="button" onClick={()=>showTool('materials')}><BookOpen size={18}/>{T(language,'Tài liệu bài học','Lesson materials')}</button>
      <button type="button" onClick={()=>showTool('research')}><FileText size={18}/>{T(language,'Kho tư liệu','Research library')}</button>
      <button type="button" onClick={()=>showTool('voice')}><Lightbulb size={18}/>{T(language,'Giọng đọc Anh Mỹ','US voiceover')}</button>
      <button type="button" onClick={()=>showTool('video')}><Eye size={18}/>{T(language,'Video học tập','Learning videos')}</button>
      <button type="button" onClick={()=>showTool('micro')}><ClipboardCheck size={18}/>{T(language,'Câu hỏi bổ sung','Thinking challenge')}</button>
     </div>
     <div className="bml-student-rail-footer"><ShieldCheck size={17}/>{T(language,'Bài của nhóm được lưu riêng tư.','Your group work stays private.')}</div>
    </aside>
    <section className="bml-student-primary" aria-label={T(language,'Không gian thực hiện nhiệm vụ','Task workspace')}>
   <div className="bml-student-pane" hidden={studentView!=='live'}>
    <MuseumLiveStudent csrf={session.csrf} language={language} onState={setLiveInfo} toolRequest={studentTool} compact/>
   </div>
   <div className="bml-student-pane" hidden={studentView!=='studio'}>
   {session.feedback?<div className="bml-banner bml-warning-banner" role="status"><MessageSquare size={20}/><div><strong>{T(language,'Nhận xét để chỉnh sửa','Feedback for revision')}</strong>
      {session.feedback.teacher?<p>{T(language,'Giáo viên','Teacher')}: {session.feedback.teacher}</p>:null}
      {session.feedback.ttcm?<p>TTCM: {session.feedback.ttcm}</p>:null}</div></div>:null}
   {groupLocked?<div className="bml-banner bml-success-banner"><LockKeyhole size={20}/><div><strong>{T(language,'Bản nộp đã khóa chỉnh sửa','Submission is locked')}</strong>
      <p>{session.groupState==='published'?T(language,'Triển lãm đã được công bố.','Your museum has been published.') :
      session.groupState==='approved_locked'?T(language,'TTCM đã duyệt bản nộp.','The reviewer approved this version.') :
      T(language,'Bài đang được xem xét. Nhóm sẽ sửa lại nếu có yêu cầu.','Your submission is being reviewed. You can revise if it is returned.')}</p></div></div>:null}
   {studio.legacy?<div className="bml-banner bml-warning-banner"><ShieldCheck size={20}/><div><strong>{T(language,'Có bản nháp Gallery đời cũ','Existing legacy gallery draft detected')}</strong>
     <p>{T(language,'Ứng dụng không tự xóa hoặc ghi đè các phòng cũ. Chỉ chọn chuyển sang mẫu V3 khi đã kiểm tra dữ liệu.','Your existing rooms will not be erased automatically. Convert only after reviewing the previous content.')}</p>
     <button type="button" className="bml-outline" disabled={locked} onClick={()=>edit(d=>({...d,legacy:false,legacyOriginal:null}))}>{T(language,'Tôi đã kiểm tra · Chuyển sang mẫu mới','Reviewed · Convert to V3')}</button>
    </div></div>:null}
   {liveRunning&&!stageEditAllowed&&!groupLocked?<div className="bml-banner bml-warning-banner" role="status">
    {T(language,'Buổi học đang tạm dừng hoặc kết thúc. Chưa thể chỉnh sửa bản nháp.','The lesson is paused or ended. Editing is temporarily unavailable.')}</div>:null}
   {liveRunning&&stageIndex<3&&!groupLocked&&stageEditAllowed?<div className="bml-banner bml-info-banner bml-student-early-edit" role="status">
    {T(language,'Nhóm có thể soạn và tự lưu sản phẩm ngay. Để trả lời câu hỏi trực tiếp, mở Current activity.','You can create and autosave your project now. Use Current activity to answer the live question.')}</div>:null}
   <div className="bml-student-stage"><div className="bml-student-task bml-surface"><div className="bml-overline">{T(language,'BƯỚC','STEP')} {step+1} / 5</div>
    <h2>{T(language,STEPS[step].vi,STEPS[step].en)}</h2>
    {studioPages>1?<nav className="bml-student-subpages" aria-label={T(language,'Các trang trong bước này','Pages in this step')}>
     {Array.from({length:studioPages},(_,i)=><button type="button" key={i} aria-current={studioSubstep===i?'page':undefined}
      onClick={()=>setStudioSubstep(i)}>{T(language,'Trang','Page')} {i+1}</button>)}
     <small>{studioSubstep+1} / {studioPages}</small>
    </nav>:null}
    {step===0?<><p>{T(language,'Đọc đề bài. Chọn một vấn đề môi trường thực tế mà người xem cần hiểu.','Read the assignment. Choose one real-world environmental issue your visitors should understand.')}</p>
     <div className="bml-step-hint"><Lightbulb size={21}/><div><strong>{T(language,'Gợi ý viết tiếng Anh','English sentence starter')}</strong>
      <p>“One environmental issue at our school is … because …”</p></div></div>
     {field(T(language,'Vấn đề mà nhóm em chọn','Describe your problem'),l.issue,v=>changeLearning('issue',v),{
      rows:4,disabled:locked,placeholder:'Our school produces plastic waste every day because…'})}
     {field(T(language,'Đối tượng tham quan','Who is your visitor?'),l.audience,v=>changeLearning('audience',v),{
      disabled:locked,limit:1200,placeholder:'Students, teachers and families'})}
    </>:null}
    {step===1&&studioSubstep===0?<><p>{T(language,'Lên câu chuyện triển lãm gồm ba phần: Vấn đề – Bằng chứng – Giải pháp.','Plan your story around Problem, Evidence, and Solution.')}</p>
     {field(T(language,'Vấn đề bằng tiếng Anh / Problem in English','Problem in English'),l.issue,v=>changeLearning('issue',v),{rows:3,disabled:locked})}
     {field(T(language,'Vai trò nhóm / Group roles','Group roles'),l.roles,v=>changeLearning('roles',v),{rows:2,disabled:locked,placeholder:'Editor: member A; data checker: B; designer: C; presenter: D (use initials or roles, no full names)'})}
     {field(T(language,'Tính khả thi / Feasibility','Feasibility'),l.feasibility,v=>changeLearning('feasibility',v),{rows:2,disabled:locked,placeholder:'Who will do it? Resources? One limitation?'})}
    </>:null}
    {step===1&&studioSubstep===1?<><p>{T(language,'Bổ sung dẫn chứng có nguồn và một giải pháp khả thi.','Add sourced evidence and one feasible solution.')}</p>
     <div className="bml-storyboard">{['The Problem','The Evidence','Our Solution'].map((title,i)=><div key={title} className={'bml-storyboard-card '+([l.issue,l.evidence,l.solution][i]?'is-filled':'')}>
      <span>{i+1}</span><strong>{title}</strong><small>{[l.issue,l.evidence,l.solution][i]?T(language,'Đã có nội dung','Content added'):T(language,'Chưa hoàn thành','Not written')}</small></div>)}</div>
     {field(T(language,'Bằng chứng hoặc quan sát bằng tiếng Anh','Evidence in English'),l.evidence,v=>changeLearning('evidence',v),{
      rows:4,disabled:locked,placeholder:'According to the information from …, …'})}
     {field(T(language,'Nguồn dữ liệu/ tài liệu','Source / citation'),l.source,v=>changeLearning('source',v),{
      disabled:locked,limit:1200,placeholder:'Publisher, title, year or “classroom scenario”'})}
     {field(T(language,'Giải pháp nhóm đề xuất bằng tiếng Anh','Proposed solution in English'),l.solution,v=>changeLearning('solution',v),{
      rows:4,disabled:locked,placeholder:'We suggest … because … Our school can …'})}
    </>:null}
    {step===2&&studioSubstep===0?<><p>{T(language,'Không cần kéo thả, đặt tọa độ hay dựng mô hình. Ứng dụng tự sắp xếp ba hiện vật.','No dragging, coordinates or 3D modeling. Your three exhibits are arranged automatically.')}</p>
     {field(T(language,'Tên triển lãm','Exhibition title'),studio.title,v=>edit(d=>({...d,title:v})),{disabled:locked,limit:140,placeholder:'Climate Action Museum'})}
     {field(T(language,'Thông điệp mở đầu','Welcome message'),studio.summary,v=>edit(d=>({...d,summary:v})),{rows:2,disabled:locked,limit:1200,placeholder:'Small actions can make a big difference.'})}
     <label className="bml-full-field">{T(language,'Phong cách bảo tàng','Museum style')}
      <div className="bml-theme-choices">{[['classic','Classic Gallery'],['culture','Culture Pavilion'],['lab','Discovery Lab']].map(([id,label])=>
       <button key={id} type="button" disabled={locked} className={studio.theme===id?'is-active':''} onClick={()=>edit(d=>({...d,theme:id}))}>
        <Landmark size={19}/>{label}{studio.theme===id?<Check size={17}/>:null}</button>)}</div></label>
    </>:null}
    {step===2&&studioSubstep===1?<><p>{T(language,'Kiểm tra lời giới thiệu của ba hiện vật bằng tiếng Anh.','Review the English captions for three exhibits.')}</p>
     <div className="bml-exhibit-progress"><strong>{exhibitStatus()}/3 {T(language,'hiện vật có nội dung','exhibits have content')}</strong>
       <span>{T(language,'Tự động xây dựng từ các thẻ ý tưởng ở bước trước.','Generated from your earlier English evidence cards.')}</span></div>
     {['issue','evidence','solution'].map((key,i)=><details key={key} className="bml-student-exhibit" open={i===0}>
       <summary>{i+1}. {['The Problem','The Evidence','Our Solution'][i]}</summary>
       {field(T(language,'Mô tả bằng tiếng Anh','English description'),l[key],v=>changeLearning(key,v),{rows:3,disabled:locked})}
       <small className="bml-word-count">{wordCount(l[key])} words · Suggested: 25–40</small>
      </details>)}
    </>:null}
    {step===2&&studioSubstep===2?<><p>{T(language,'Thêm sản phẩm trực quan và kiểm tra bản trình bày 2D/3D.','Add authentic artwork and preview the 2D/3D museum.')}</p>
     <button className="bml-primary" type="button" onClick={()=>setArtworkOpen(true)}>
      <CloudUpload size={19}/>{T(language,'Mở xưởng hiện vật và hình ảnh','Open artwork & media studio')}</button>
     {artworkOpen?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Xưởng hiện vật','Artwork studio')}>
      <div className="bml-student-detail-window">
       <div className="bml-student-detail-head"><strong>{T(language,'Xưởng sáng tạo hiện vật','Artwork & media studio')}</strong>
        <button type="button" className="bml-outline" onClick={()=>setArtworkOpen(false)}><X size={17}/>{T(language,'Đóng','Close')}</button></div>
       <div className="bml-student-artwork-dialog">
     <MuseumArtworkStudio studio={studio} update={edit} csrf={session.csrf} language={language}
      disabled={locked||busy} uploadEnabled={session.uploadEnabled===true} onAssets={setArtAssets}/>

       </div>
      </div></div>:null}
     <button type="button" className="bml-outline" onClick={()=>setPreview(v=>!v)}><Eye size={19}/>{preview?T(language,'Đóng xem trước','Close preview'):T(language,'Xem trước bảo tàng 2D/3D','Preview 2D / 3D museum')}</button>
     {preview?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Xem trước bảo tàng','Museum preview')}>
      <div className="bml-student-detail-window">
       <div className="bml-student-detail-head"><strong>{studio.title||'Our Climate Action Museum'}</strong>
        <button type="button" className="bml-outline" onClick={()=>setPreview(false)}><X size={17}/>{T(language,'Đóng','Close')}</button></div>
       <MuseumScene language={language} embedded gallery={{title:studio.title||'Our English Museum',summary:studio.summary,rooms:[{id:'draft-room',title:room.title,template_key:room.template_key,
        exhibits:room.exhibits.map((e,i)=>({...e,id:'draft-exhibit-'+i,status:'published',
         image_url:artAssets.find(x=>x.id===e.asset_id)?.image_url||''}))}]}}/>
      </div>
     </div>:null}
    </>:null}
    {step===3?<><p>{T(language,'Mời một bạn hoặc nhóm khác đọc thử triển lãm. Ghi nhận điều họ hiểu, rồi cải tiến nội dung.','Invite a classmate or group to test the exhibition, note their feedback, then improve your draft.')}</p>
     <button type="button" className="bml-outline" onClick={()=>{setHistoryOpen(true);viewHistory();}}>
      {T(language,'Xem bản thiết kế / Trước–sau','View storyboard / before and after')}</button>
     <div className="bml-step-hint"><MessageSquare size={21}/><div><strong>{T(language,'Câu hỏi gợi ý cho người xem','Ask your peer')}</strong>
      <p>“What is the problem?” · “Is the evidence clear?” · “What action should we take?”</p></div></div>
     {field(T(language,'Phản hồi thực tế từ bạn học (tiếng Anh)','Actual peer feedback (English)'),l.feedback,v=>changeLearning('feedback',v),{
      rows:3,disabled:locked,limit:1200,placeholder:'My classmate understood the problem but asked for a clearer example.'})}
     {field(T(language,'Nhóm đã cải tiến điểm gì? (tiếng Anh)','What did your group improve? (English)'),l.improvement,v=>changeLearning('improvement',v),{
      rows:3,disabled:locked,limit:1200,placeholder:'We revised the description and added a more specific action.'})}
     <label className="bml-checkbox-row"><input type="checkbox" disabled={locked} checked={l.tested===true} onChange={e=>changeLearning('tested',e.target.checked)}/>
      {T(language,'Nhóm đã xem và thử nghiệm bản trình bày trước khi nộp.','Our group has tested the exhibition before submission.')}</label>
     <div className="bml-banner bml-info-banner"><Info size={18}/>{T(language,'Chỉ ghi phản hồi đã thu thập thật. Không tự tạo kết quả thử nghiệm.','Record only feedback actually collected. Never invent a test result.')}</div>
    </>:null}
    {step===4?<><p>{T(language,'Xem lại các mục bắt buộc và tự đánh giá trước khi gửi bài.','Review the required learning evidence and reflect before submitting.')}</p>
     {field(T(language,'Điều nhóm em học được (tiếng Anh)','Our learning reflection (English)'),l.reflection,v=>changeLearning('reflection',v),{
      rows:3,disabled:locked,limit:1200,placeholder:'We learned to explain evidence and revise our English for visitors.'})}
     <div className="bml-submit-check"><h3>{T(language,'Kiểm tra trước khi nộp','Submission checklist')}</h3>
      {[
       [!!studio.title,'Tên triển lãm','Exhibition title'],
       [!!l.issue&&!!l.evidence&&!!l.solution,'Vấn đề – bằng chứng – giải pháp','Problem – evidence – solution'],
       [!!l.source,'Nguồn dữ liệu','Evidence source'],
       [!!l.feedback&&!!l.improvement,'Đã thử nghiệm và cải tiến','Tested and improved'],
       [!!l.reflection,'Phản ánh học tập','Learning reflection']
      ].map(([ok,vi,en],i)=><div key={i} className={ok?'is-done':'is-pending'}><span>{ok?<Check size={16}/>:i+1}</span>{T(language,vi,en)}</div>)}
     </div>
     <button type="button" disabled={busy||locked||studio.legacy||conflict||saveState==='saving'||(liveRunning&&stageIndex!==10)} className="bml-primary bml-full-button"
      onClick={submit}><Send size={19}/>{busy?T(language,'Đang nộp bài…','Submitting…'):T(language,'Nộp để giáo viên duyệt','Submit for Admin review')}</button>
    </>:null}
    {error?<div className="bml-banner bml-danger-banner" role="alert"><CloudAlert size={19}/>{error}
      {conflict?<button type="button" className="bml-outline" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>{T(language,'Tải bản mới nhất','Reload latest')}</button>:null}</div>:null}
    {notice?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={19}/>{notice}</div>:null}
    <footer className="bml-student-bottom">
     <button type="button" className="bml-outline" disabled={step===0&&studioSubstep===0} onClick={()=>{if(studioSubstep>0)setStudioSubstep(v=>v-1);else setStep(s=>Math.max(0,s-1));setPreview(false);}}><ChevronLeft size={18}/>{T(language,'Quay lại','Previous')}</button>
     <div><button type="button" className="bml-text-btn" disabled={!dirty||busy||conflict||locked} onClick={()=>save()}><Cloud size={17}/>{T(language,'Lưu ngay','Save now')}</button>
      {step<4?<button type="button" disabled={step>=maxStudentStep&&studioSubstep===studioPages-1} className="bml-primary"
       onClick={()=>{if(studioSubstep<studioPages-1)setStudioSubstep(v=>v+1);else setStep(s=>Math.min(maxStudentStep,4,s+1));setPreview(false);}}>
       {T(language,'Tiếp tục','Continue')} <ChevronRight size={18}/></button>:null}</div>
    </footer>
   </div>
   </div>
   </div>
    </section>
    <aside className="bml-student-projectrail" aria-label={T(language,'Sản phẩm của nhóm','Group project')}>
     <section className="bml-student-project-card">
      <div className="bml-student-project-ribbon"><Landmark size={19}/>{T(language,'Sản phẩm của nhóm','EXHIBITION DOSSIER')}</div>
   <div className="bml-student-heading"><span className="bml-overline">{T(language,'DỰ ÁN TIẾNG ANH · BẢO TÀNG SỐ','ENGLISH PROJECT · DIGITAL MUSEUM')}</span>
    <h1>{session.assignment.title}</h1><p>{session.assignment.brief||T(language,'Tạo triển lãm tiếng Anh từ ý tưởng của nhóm em.','Create an English exhibition from your group’s ideas.')}</p>
    <small><Info size={15}/>{T(language,'Hạn nộp','Due')} {fmtTime(session.assignment.deadline_at)} · {T(language,'Tự lưu theo mã nhóm','Autosaved to this group pass')}</small></div>

      <div className="bml-student-project-art">
        <span className="bml-student-project-mark" aria-hidden="true"><Leaf size={27}/></span>
        <div><small>WORK IN PROGRESS</small><strong>{studio.title||'Every exhibition begins with one idea.'}</strong></div>
       </div>
      <div className="bml-student-project-meter"><strong>{T(language,'Tiến độ nội dung','Project completion')}</strong><span>{progressPercent}%</span>
       <div role="progressbar" aria-label={T(language,'Tiến độ nội dung','Project completion')} aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}><i style={{width:progressPercent+'%'}}/></div></div>
      <button type="button" className="bml-outline bml-student-project-preview" onClick={()=>setProjectPreview(true)}>
       <Eye size={17}/>{T(language,'Xem bảo tàng 2D/3D','Preview 2D/3D museum')}</button>
      <small className="bml-student-real-data-note">{T(language,'Tiến độ đếm 9 mục thực tế, không phải điểm số.','Progress counts nine actual draft fields, not a grade.')}</small>
     </section>
   <aside className="bml-student-guide bml-surface"><div className="bml-guide-circle"><Lightbulb size={25}/></div><h3>{T(language,'Mẹo học tiếng Anh','English for your exhibit')}</h3>
    <p>{T(language,'Dùng từ nối để giải thích nguyên nhân, trình bày dẫn chứng và đề xuất giải pháp rõ ràng.','Use transitions to explain causes, give evidence and suggest a clear solution.')}</p>
    {['because / therefore','according to the source','we suggest / we recommend','our visitors can…'].map(v=><span className="bml-english-chip" key={v}>{v}</span>)}
    <div className="bml-guide-divider"/>
    <strong>{T(language,'Nguyên tắc nhóm','Group guidelines')}</strong>
    <p>{T(language,'Không cần đăng nhập. Chỉ chia sẻ mã nhóm với thành viên được giao. Không tải nội dung cá nhân.','No account required. Share the private passcode only with your assigned group. Avoid personal data.')}</p></aside>
    </aside>
   </div>
  </div>
  {historyOpen?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Lịch sử thiết kế','Design history')}>
   <div className="bml-student-detail-window">
    <div className="bml-student-detail-head"><strong>{T(language,'Bản thiết kế trước và sau','Storyboard history')}</strong>
     <button type="button" className="bml-outline" onClick={()=>setHistoryOpen(false)}><X size={17}/>{T(language,'Đóng','Close')}</button></div>
    <div className="bml-student-history-dialog">
     {history.length===0?<p>{T(language,'Chưa có mốc lịch sử nào.','No saved checkpoints yet.')}</p>:history.map(c=><article key={c.checkpointId}>
      <strong>v{c.version} · {new Date(c.createdAt).toLocaleString()}</strong>
      {['issue','evidence','solution'].map(k=><p key={k}><b>{k}: </b>{c.draft?.learning?.[k]}</p>)}
      {c.artworks?.map(a=><img key={a.id} src={a.image_url} alt={a.original_name} style={{maxWidth:180}}/>)}
     </article>)}
    </div>
   </div></div>:null}
  {projectPreview?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Xem bảo tàng của nhóm','Preview group museum')}>
   <div className="bml-student-detail-window">
    <div className="bml-student-detail-head"><strong>{studio.title||'Our Climate Action Museum'}</strong><button type="button" className="bml-outline" onClick={()=>setProjectPreview(false)}><X size={18}/>{T(language,'Đóng','Close')}</button></div>
    <MuseumScene language={language} embedded gallery={{title:studio.title||'Our English Museum',summary:studio.summary,rooms:[{id:'draft-room',title:room.title,template_key:room.template_key,
     exhibits:room.exhibits.map((e,i)=>({...e,id:'draft-exhibit-'+i,status:'published',image_url:artAssets.find(x=>x.id===e.asset_id)?.image_url||''}))}]}}/>
   </div></div>:null}
 </main>;
}
