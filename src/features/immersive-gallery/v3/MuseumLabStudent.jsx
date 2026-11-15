import React,{Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronLeft,ChevronRight,CircleHelp,Cloud,CloudAlert,CloudUpload,Eye,EyeOff,FileText,Info,KeyRound,Landmark,Leaf,Lightbulb,LockKeyhole,MessageSquare,RefreshCw,Send,ShieldCheck,Sparkles,Users,X} from 'lucide-react';
import {emptyStudio,documentFromStudio,normalizeStudio,STEPS,moveStoryboardCard} from './museumData.js';
import {guestRequest,getMuseumInviteInfo,englishSystemGroupLabel} from './museumApi.js';
import {artGuest,liveGuest} from './museumLiveApi.js';
import {buildStudentMuseumPreview} from './museumPreviewImages.js';
import {stageMediaTools} from './museumLiveExtensions.js';
import {wordCount,changedExhibits} from './learningEvidence.js';
import {canSaveMuseumDraft,canSubmitMuseumProject} from './museumSubmissionPolicy.js';
import {submissionReadiness,submissionWindowMessage} from './museumSubmissionReadiness.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumBeforeAfter from './MuseumBeforeAfter.jsx';
import {EXHIBIT_FIELDS} from './museumExhibitInsights.js';
import MuseumLiveStudent from './MuseumLiveStudent.jsx';
import MuseumStudentActivityGroups,{activityGroup,firstActivity} from './MuseumStudentActivityGroups.jsx';
import MuseumLivePeerFeedback from './MuseumLivePeerFeedback.jsx';
import MuseumArtworkStudio from './MuseumArtworkStudio.jsx';
import MuseumCompetitionRibbon from './MuseumCompetitionRibbon.jsx';
import StudentLockedDossier from './StudentLockedDossier.jsx';
import MuseumSpeakingStudio from './MuseumSpeakingStudio.jsx';
import MuseumStudentVoiceGuide from './MuseumStudentVoiceGuide.jsx';
import {studentNarrationCue} from './museumStudentNarration.js';
import './museumLab.css';
import './museumStudentFocus.css';
import './museumStudentCanvas.css';
import './museumStudentEditorial.css';
import './museumStudentScrollFix.css';
import './museumStudentScrapbookV6.css';
import './museumSubmissionFix.css';
import './museumDashboardBanner.css';
import './museumQuickAccessV58.css';
import './museumCreatorPassLuxe.css';
import './museumStudentSwiss.css';
import './museumStudentWorkspace.css';

const T=(lang,vi,en)=>lang==='en'?en:vi;
const getHandle=()=>{
 try{const raw=new URLSearchParams(window.location.hash.split('?')[1]||'').get('invite')||'';return raw.match(/^[A-Za-z0-9_-]{16,80}/)?.[0]||raw.slice(0,80);}catch{return '';}
};
const initialSession=()=>null;
function StudentLangToggle({language,onChange}){
 return <div className="bml-student-lang" role="group" aria-label={T(language,'Ngôn ngữ giao diện','Interface language')}>
  <button type="button" aria-pressed={language!=='en'} onClick={()=>onChange('vi')}>VI</button>
  <button type="button" aria-pressed={language==='en'} onClick={()=>onChange('en')}>EN</button>
 </div>;
}
function GuestEntry({onRedeem,busy,error,language,onResetError,onLanguageChange}){
 const [handle,setHandle]=useState(getHandle),[secret,setSecret]=useState('');
 const [invite,setInvite]=useState(null),[lookupBusy,setLookupBusy]=useState(false);
 const [method,setMethod]=useState('quick');
 const [showSecret,setShowSecret]=useState(false);
 const validHandle=/^[A-Za-z0-9_-]{16,80}$/.test(handle.trim());
 useEffect(()=>{
  let active=true;
  if(!validHandle){setInvite(null);setMethod('private');return ()=>{active=false;};}
  setLookupBusy(true);
  getMuseumInviteInfo(handle.trim()).then(info=>{
   if(!active)return;
   setInvite(info);setMethod(info.quickAccessEnabled?'quick':'private');
  }).catch(()=>{if(active){setInvite(null);setMethod('private');}})
   .finally(()=>{if(active)setLookupBusy(false);});
  return ()=>{active=false;};
 },[handle,validHandle]);
 const quick=method==='quick'&&invite?.quickAccessEnabled;
 const selectMethod=next=>{setMethod(next);setSecret('');onResetError?.();};
 const group=invite?englishSystemGroupLabel(invite.groupLabel):null;
 return <div className="bml-guest-entry" data-testid="museum-student-entry">
  <div className="bml-guest-illustration"><div className="bml-guest-overline"><Landmark size={27}/><b>Pétrus Ký School System</b></div>
   <div className="bml-guest-globe" aria-hidden="true"><Landmark size={82}/><Leaf size={35}/></div>
   <h1>{T(language,'Bảo tàng của nhóm em bắt đầu tại đây.','Build a museum from your evidence.')}</h1>
   <p>{T(language,'Khám phá vấn đề · Viết bằng tiếng Anh · Trưng bày 3D','Explore an issue · Write in English · Create in 3D')}</p>
   <div className="bml-guest-benefits"><span><Check size={16}/>{T(language,'Không tạo tài khoản','No account needed')}</span>
    <span><Check size={16}/>{T(language,'Tự động lưu bài','Automatic saving')}</span></div>
  </div>
  <form className="bml-guest-form bml-quick-classroom-login" onSubmit={e=>{
   e.preventDefault();
   onRedeem({handle:handle.trim(),...(quick?{classroomPassword:secret}:{groupSecret:secret})});
  }}>
   <span className="bml-overline">{T(language,'THẺ HỌC SINH','STUDENT CREATOR PASS')}</span>
   <StudentLangToggle language={language} onChange={onLanguageChange}/>
   <h2>{invite?.readOnly?T(language,'Xem bài đã hoàn thành','View completed lesson'):T(language,'Bắt đầu sáng tạo','Start creating')}</h2>
   {invite?.readOnly?<div className="bml-banner bml-success-banner" role="status"><LockKeyhole size={17}/> {T(language,'Bài đã khóa. Đăng nhập để xem, không sửa được.','This lesson is finalized. Sign in to view its preserved work; editing is disabled.')}</div>:null}
   {invite?<div className="bml-classroom-invite-summary" data-testid="museum-invite-context">
    <Users size={19}/><div><strong>{group}</strong><small>{invite.assignmentTitle} · {invite.classScope}</small></div>
   </div>:null}
   <p>{quick?T(language,'Mở QR hoặc link mời và nhập mật khẩu lớp.','Open your invitation link and enter the classroom password.'):
     T(language,'Nhập mã riêng do giáo viên cung cấp.','Enter the private passcode from your teacher.')}</p>
   {!invite||!validHandle?<label>{T(language,'Mã lời mời','Invitation code')}
    <input autoComplete="off" maxLength={80} required value={handle}
     onChange={e=>{setHandle(e.target.value);setSecret('');onResetError?.();}}
     placeholder={T(language,'Mã từ QR của giáo viên','Teacher invite code')}/></label>:
    <div className="bml-quick-link-confirmation"><CheckCircle2 size={16}/> {T(language,'Đã nhận diện link mời','Invitation link recognized')}</div>}
   <label>{quick?T(language,'Mật khẩu lớp học','Class password'):T(language,'Mã bí mật nhóm','Private group passcode')}
    <span className="bml-secret-field">
    <input autoComplete="off" type={showSecret?'text':'password'} required minLength={quick?6:16} maxLength={quick?64:128}
     value={secret} onChange={e=>setSecret(e.target.value)}
     placeholder={quick?T(language,'Nhập mật khẩu lớp','Enter classroom password'):T(language,'Mã riêng của nhóm','Your private group passcode')}/>
    <button type="button" className="bml-secret-toggle" aria-pressed={showSecret}
     aria-label={showSecret?T(language,'Ẩn mật khẩu','Hide password'):T(language,'Hiện mật khẩu','Show password')}
     onClick={()=>setShowSecret(v=>!v)}>{showSecret?<EyeOff size={18}/>:<Eye size={18}/>}</button>
    </span></label>
   {lookupBusy?<small className="bml-invite-loading">{T(language,'Đang kiểm tra link mời…','Checking invitation link…')}</small>:null}
   {invite?.quickAccessEnabled?<button type="button" className="bml-quick-access-alternate"
    onClick={()=>selectMethod(quick?'private':'quick')}>
    {quick?T(language,'Sử dụng mã bí mật riêng','Use private group passcode instead'):
      T(language,'Dùng mật khẩu lớp','Use classroom password instead')}</button>:null}
   {error?<div className="bml-banner bml-danger-banner" role="alert">{error}</div>:null}
   <button type="submit" className="bml-primary bml-full-button" disabled={busy||lookupBusy||!validHandle}>
    <KeyRound size={18}/>{busy?T(language,'Đang kiểm tra…','Checking access…'):T(language,'Vào bài học','Enter lesson')} <ArrowRight size={17}/></button>
   <small className="bml-privacy"><ShieldCheck size={17}/>{T(language,'Không nhập họ tên, ảnh cá nhân hoặc thông tin riêng tư vào triển lãm.','Never include student identities or private personal information in an exhibit.')}</small>
  </form>
 </div>;
}
const field=(label,value,update,{rows=0,placeholder='',limit=2500,disabled=false,required=false}={})=><label className="bml-full-field" key={label}>{label}
 {rows?<textarea rows={rows} maxLength={limit} disabled={disabled} required={required} placeholder={placeholder} value={value||''} onChange={e=>update(e.target.value)}/>:
 <input maxLength={limit} disabled={disabled} required={required} placeholder={placeholder} value={value||''} onChange={e=>update(e.target.value)}/>}
 </label>;
export default function MuseumLabStudent({language:languageProp='en'}){
 const [uiLanguage,setUiLanguage]=useState(()=>{
  try{const saved=sessionStorage.getItem('bml-student-ui');if(saved==='vi'||saved==='en')return saved;}catch{}
  return languageProp==='vi'?'vi':'en';
 });
 const language=uiLanguage;
 const chooseLanguage=next=>{setUiLanguage(next);try{sessionStorage.setItem('bml-student-ui',next);}catch{}};
 const [session,setSession]=useState(initialSession),[studio,setStudio]=useState(emptyStudio);
 const [version,setVersion]=useState(0),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const [saveState,setSaveState]=useState('saved'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [step,setStep]=useState(0),[preview,setPreview]=useState(false),[conflict,setConflict]=useState(false);
 const [liveInfo,setLiveInfo]=useState(null),[liveReady,setLiveReady]=useState(false),[artAssets,setArtAssets]=useState([]);
 const [history,setHistory]=useState([]);
 const [reviewIndex,setReviewIndex]=useState(null);
 const [studioSubstep,setStudioSubstep]=useState(0),[historyOpen,setHistoryOpen]=useState(false);
 const [projectPreview,setProjectPreview]=useState(false),[studentTool,setStudentTool]=useState(null);
 const [artworkOpen,setArtworkOpen]=useState(false),[speakingOpen,setSpeakingOpen]=useState(false);
 const previewGallery=buildStudentMuseumPreview(studio,artAssets);
 // Uploaded media is private and its signed URLs expire after 90 seconds.
 // Fetch real group assets at opening time (also after refresh/navigation),
 // then renew them while the viewer is open. Never use invented stock photos.
 useEffect(()=>{
  if(!session?.csrf||(!preview&&!projectPreview))return undefined;
  let active=true;
  const refresh=async()=>{
   try{
    const result=await artGuest('list');
    if(active)setArtAssets(result.assets||[]);
   }catch(err){
    if(active)setError(err.message||'Unable to load your private artwork.');
   }
  };
  refresh();
  const timer=window.setInterval(refresh,55000);
  return()=>{active=false;window.clearInterval(timer);};
 },[session?.csrf,preview,projectPreview]);
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
 const dragStoryboard=useRef(null);
 const groupLocked=session&&(session.readOnly===true||!['issued','editing','changes_requested'].includes(session.groupState));
 const liveRunning=Boolean(liveInfo&&liveInfo.status!=='not_started');
 const stageIndex=liveInfo?.stageIndex??-1;
 // Group work is independent of the gated Teacher Live response.
 const maxStudentStep=4;
 const stageEditAllowed=canSaveMuseumDraft(liveInfo);
 const canFollowLive=liveRunning&&!session?.readOnly&&liveInfo.status!=='ended';
 const displayedActivity=reviewIndex??(canFollowLive?stageIndex:0);
 const displayedGroup=activityGroup(displayedActivity);
 const projectPanelRef=useRef(null),lessonBodyRef=useRef(null);
 const focusProject=()=>{
  projectPanelRef.current?.focus({preventScroll:true});
  projectPanelRef.current?.scrollIntoView?.({block:'nearest'});
 };
 const returnLive=()=>{setReviewIndex(null);setStep(activityGroup(stageIndex));};
 const browseActivity=index=>{
  setReviewIndex(canFollowLive&&index===stageIndex?null:index);
  setStep(activityGroup(index));
  setPreview(false);
 };
 const chooseGroup=group=>{
  if(group!==displayedGroup)browseActivity(firstActivity(group));
  else setStep(group);
 };
 useEffect(()=>{
  setArtworkOpen(false);setSpeakingOpen(false);setHistoryOpen(false);setPreview(false);setProjectPreview(false);
 },[stageIndex]);
 const locked=groupLocked||!stageEditAllowed;
 const studioPages=step===1?2:step===2?3:1;
 // Keep the 16:9 frame stationary; only the active step's fields scroll.
 // Reset on navigation so Page 2 and the next step never open halfway down.
 const taskScrollRef=useRef(null);
 useEffect(()=>{
  const lesson=lessonBodyRef.current?.firstElementChild;
  if(lesson)lesson.scrollTop=0;
 },[displayedActivity,reviewIndex]);
 useEffect(()=>{if(taskScrollRef.current)taskScrollRef.current.scrollTop=0;},[step,studioSubstep]);
 const showTool=name=>{setReviewIndex(null);setStudentTool({name,key:Date.now()});};
 useEffect(()=>{setStudioSubstep(step===2&&artworkOpen?2:0);setHistoryOpen(false);},[step]);
 useEffect(()=>{
  if(!liveRunning||reviewIndex!=null)return;
  setStep(activityGroup(stageIndex));
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
  setDirty(false);dirtyRef.current=false;setBusy(false);setStep(0);setLiveInfo(null);setReviewIndex(null);setLiveReady(false);setNotice('');setError('');
 };
 const submit=async()=>{
  setError('');setNotice('');setBusy(true);
  try{
   if(studio.legacy)throw new Error(T(language,'Cần kiểm tra bản nháp cũ trước khi nộp.','Review the legacy draft before submitting.'));
   const validation=submissionReadiness(documentRef.current,liveInfo);
   if(validation.missing.length)throw new Error(T(language,'Cần hoàn thành: ','Please complete: ')+validation.missing.map(item=>item.text).join(' · '));
   if(!validation.allowedByLesson)throw new Error(submissionWindowMessage(liveInfo));
   if(savingRef.current)throw new Error(T(language,'Đang lưu. Hãy thử lại sau khi thấy Đã lưu.','Saving. Please submit once the draft is saved.'));
   if(dirtyRef.current){const n=await save();if(n===null)throw new Error(T(language,'Chưa lưu được bản nháp.','Draft has not been saved.'));}
   await guestRequest('submit','POST',{expectedVersion:versionRef.current},csrfRef.current);
   await load();setNotice(T(language,'Bài đã nộp. Giáo viên sẽ kiểm tra và chuyển TTCM duyệt.','Submitted for Admin review. You can revise if the submission is returned.'));
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 if(!session)return <div className="bml bml-student-shell bml-student-editorial bml-student-login-with-ribbon" lang={language}>
  <div className="bml-paper bml-guest-competition-wrap" data-testid="museum-login-competition-banner">
   <MuseumCompetitionRibbon variant="dashboard"/>
  </div>
  <GuestEntry onRedeem={redeem} busy={busy} error={error} language={language} onLanguageChange={chooseLanguage} onResetError={()=>setError('')}/>
 </div>;
 const l=studio.learning,doc=documentFromStudio(studio),room=doc.rooms[0];
 const exhibitStatus=()=>[l.issue,l.evidence,l.solution].filter(Boolean).length;
 const progressChecks=[!!studio.title,!!l.issue,!!l.evidence,!!l.solution,!!l.source,!!l.feedback,!!l.improvement,!!l.tested,!!l.reflection];
 const progressPercent=Math.round(100*progressChecks.filter(Boolean).length/progressChecks.length);
 const readiness=submissionReadiness(studio,liveInfo);
 const submitWindowNote=submissionWindowMessage(liveInfo);
 const openSubmitReview=()=>{setStep(4);setArtworkOpen(false);setPreview(false);setError('');focusProject();};
 const openArtworkSources=()=>{setArtworkOpen(true);setStep(2);setStudioSubstep(2);setPreview(false);setError('');};
 const studentMedia=stageMediaTools(liveInfo);
 const narrationCue=session.readOnly?null:studentNarrationCue({liveInfo,step,ready:liveReady});
 return <main className="bml bml-student-shell bml-student-canvas16 bml-student-editorial bml-student-dual-workspace" data-testid="museum-student-wizard" lang={language} data-ui-locale={language==='en'?'en-US':'vi-VN'}>
  <MuseumCompetitionRibbon/>
  <header className="bml-student-bar"><div className="bml-brand"><span className="bml-brand-icon"><Landmark size={23}/></span><span><strong>Pétrus Ký School System</strong><small>{T(language,'Học sinh sáng tạo','Student Creator')}</small></span></div>
   <MuseumStudentVoiceGuide cue={narrationCue} language={language}/>
   <div className="bml-student-right"><span className="bml-group-pill"><Users size={16}/>{language==='en'?englishSystemGroupLabel(session.groupLabel):session.groupLabel} · {session.assignment.class_scope}</span>
    <span className={'bml-save-indicator bml-save-'+saveState} title={T(language,'Đã lưu bản nháp chưa có nghĩa là đã nộp bảo tàng.','Saved draft does not mean the museum project was submitted.')}>{saveState==='saved'?<><Cloud size={16}/>{T(language,'Đã lưu','Saved')}</>:
      saveState==='saving'?<><CloudUpload size={16}/>{T(language,'Đang lưu…','Saving…')}</>:<><CloudAlert size={16}/>{T(language,'Cần xử lý','Action needed')}</>}</span>
    <StudentLangToggle language={language} onChange={chooseLanguage}/>
    <button type="button" className="bml-outline" onClick={logout}>{T(language,'Thoát','Exit')}</button></div></header>
  <div className="bml-student-content">
   <section className="bml-student-focus" data-testid="student-focus-switch" aria-label={T(language,'Bảng điều khiển học sinh','Student workspace')}>
    <div className="bml-student-focus-head">
     <strong>{T(language,'Sổ tay triển lãm','Your museum workshop')}</strong>
     <span className="bml-student-focus-stage" role="status">
      <span className={liveRunning&&liveInfo?.stageOpen?'bml-focus-dot is-open':'bml-focus-dot'}/>
      {session.readOnly?T(language,'Bài đã hoàn thành · Chỉ xem','Completed lesson · View only'):liveInfo?.status==='ended'?T(language,'Buổi học đã kết thúc','Lesson completed'):liveRunning?T(language,'Hoạt động','Activity')+' '+(stageIndex+1)+'/11 · '+(liveInfo?.stage?.title||'Teacher Live'):
       T(language,'Đang chờ giáo viên bắt đầu · Có thể xem sản phẩm nhóm','Waiting for teacher · Group workspace available')}
     </span>
    </div>
    <MuseumStudentActivityGroups group={displayedGroup} activity={displayedActivity}
     language={language} onGroup={chooseGroup} onActivity={browseActivity}/>
   </section>
   <div className="bml-student-workbench" data-testid="student-one-screen-workspace">
    <section className="bml-student-primary bml-student-lesson-panel" aria-labelledby="bml-student-lesson-title">
     <header className="bml-student-panel-head">
      <h2 id="bml-student-lesson-title">{T(language,'Bài học','Lesson')}</h2>
      <div className="bml-student-lesson-tools" role="group" aria-label={T(language,'Công cụ học tập','Learning tools')}>
       <button type="button" className="bml-outline" onClick={()=>showTool('materials')}><BookOpen size={16}/>{T(language,'Tài liệu','Materials')}</button>
       <button type="button" className="bml-outline" onClick={()=>showTool('research')}><FileText size={16}/>{T(language,'Kho tư liệu','Research library')}</button>
       {studentMedia.voice?<button type="button" className="bml-outline" onClick={()=>showTool('voice')}><Lightbulb size={16}/>{T(language,'Giọng đọc Anh Mỹ','US voiceover')}</button>:null}
       {studentMedia.video?<button type="button" className="bml-outline" onClick={()=>showTool('video')}><Eye size={16}/>{T(language,'Video học tập','Learning videos')}</button>:null}
      </div>
     </header>
   <div ref={lessonBodyRef} className="bml-student-pane" data-testid="student-lesson-pane">
    <MuseumLiveStudent csrf={session.csrf} language={language} readOnly={session.readOnly===true}
      onState={next=>{setLiveInfo(next);setLiveReady(true);}} toolRequest={studentTool} compact
      reviewIndex={reviewIndex} onReturnLive={canFollowLive?returnLive:undefined} onReviewProject={()=>{setStep(displayedGroup);focusProject();}}
      onOpenProject={index=>{
       if(index===9){setSpeakingOpen(true);return;}
       if(index===8)setStep(3);
       if(index===10)setStep(4);
       if(index===6){setStep(2);setStudioSubstep(2);setArtworkOpen(true);}
       if(index>=3&&index<=5){setStep(1);setStudioSubstep(index===3?0:1);}
       focusProject();
      }}
      peerActivity={stageIndex===7?<MuseumLivePeerFeedback csrf={session.csrf} liveInfo={liveInfo}
       locked={locked||conflict} saveState={saveState}/>:null}/>
   </div>
    </section>
    <section ref={projectPanelRef} tabIndex={-1} className="bml-student-primary bml-student-project-panel" aria-labelledby="bml-student-project-title">
     <header className="bml-student-panel-head bml-student-project-head">
      <div><h2 id="bml-student-project-title">{T(language,'Sản phẩm nhóm','Group Project')}</h2>
       {studio.title?<p>{studio.title}</p>:null}</div>
      <div className="bml-student-project-actions">
       {!groupLocked?<button type="button" className="bml-outline" onClick={openSubmitReview} data-testid="museum-submit-shortcut">
        <Send size={16}/>{T(language,'Kiểm tra và nộp','Review & submit')}
       </button>:null}
       <button type="button" className="bml-outline" onClick={()=>setProjectPreview(true)}>
        <Eye size={16}/>{T(language,'Xem 2D/3D','Preview 2D/3D')}
       </button>
      </div>
      <div className="bml-student-project-status" data-testid="museum-submit-summary" role="status">
       <span>{T(language,'Tiến độ nội dung','Draft content')} · {progressPercent}%</span>
       <strong>{session.groupState==='published'?T(language,'Đã công bố','Published'):session.groupState==='approved_locked'?T(language,'Đã duyệt','Approved'):session.readOnly?T(language,'Chỉ xem','View only'):groupLocked?T(language,'Đã nộp / đang chờ duyệt','Submitted / under review'):readiness.missing.length?T(language,'Còn '+readiness.missing.length+' mục cần làm',readiness.stateLabel):T(language,'Đủ nội dung bản nháp','Draft requirements complete')}</strong>
      </div>
     </header>
   <div className="bml-student-pane" data-testid="student-project-pane">
   {session.feedback?<div className="bml-banner bml-warning-banner" role="status"><MessageSquare size={20}/><div><strong>{T(language,'Nhận xét để chỉnh sửa','Feedback for revision')}</strong>
      {session.feedback.teacher?<p>{T(language,'Giáo viên','Teacher')}: {session.feedback.teacher}</p>:null}
      {session.feedback.ttcm?<p>TTCM: {session.feedback.ttcm}</p>:null}</div></div>:null}
   {groupLocked?<div className="bml-banner bml-success-banner" role="status"><LockKeyhole size={20}/><div><strong>{session.readOnly?T(language,'Bài đã hoàn thành · Chỉ xem','Completed lesson · View only'):T(language,'Bản nộp đã khóa chỉnh sửa','Submission is locked')}</strong>
      <p>{session.readOnly?'The final lesson and all submitted exhibits are preserved. You can view them, but cannot make changes.':session.groupState==='published'?T(language,'Triển lãm đã được công bố.','Your museum has been published.') :
      session.groupState==='approved_locked'?T(language,'TTCM đã duyệt bản nộp.','The reviewer approved this version.') :
      T(language,'Bài đang được xem xét. Nhóm sẽ sửa lại nếu có yêu cầu.','Your submission is being reviewed. You can revise if it is returned.')}</p></div></div>:null}
   {studio.legacy?<div className="bml-banner bml-warning-banner"><ShieldCheck size={20}/><div><strong>{T(language,'Có bản nháp Gallery đời cũ','Existing legacy gallery draft detected')}</strong>
     <p>{T(language,'Ứng dụng không tự xóa hoặc ghi đè các phòng cũ. Chỉ chọn chuyển sang mẫu V3 khi đã kiểm tra dữ liệu.','Your existing rooms will not be erased automatically. Convert only after reviewing the previous content.')}</p>
     <button type="button" className="bml-outline" disabled={locked} onClick={()=>edit(d=>({...d,legacy:false,legacyOriginal:null}))}>{T(language,'Tôi đã kiểm tra · Chuyển sang mẫu mới','Reviewed · Convert to V3')}</button>
    </div></div>:null}
   {liveRunning&&!stageEditAllowed&&!groupLocked?<div className="bml-banner bml-warning-banner" role="status">
    {T(language,'Buổi học đang tạm dừng hoặc kết thúc. Chưa thể chỉnh sửa bản nháp.','The live lesson is paused. Editing is temporarily unavailable.')}</div>:null}
   {liveInfo?.status==='ended'&&!groupLocked?<div className="bml-banner bml-info-banner" role="status"><CheckCircle2 size={18}/>{T(language,'Buổi học đã kết thúc. Dự án vẫn có thể hoàn thiện và nộp trước hạn.','Lesson completed. You can edit and submit your museum project before the deadline.')}</div>:null}
   <div className="bml-student-stage"><div className="bml-student-task bml-surface">{groupLocked?null:<><div className="bml-overline">{T(language,'BƯỚC','STEP')} {step+1} / 5</div>
    <h2>{T(language,STEPS[step].vi,STEPS[step].en)}</h2>
    {studioPages>1?<nav className="bml-student-subpages" aria-label={T(language,'Các trang trong bước này','Pages in this step')}>
     {Array.from({length:studioPages},(_,i)=><button type="button" key={i} aria-current={studioSubstep===i?'page':undefined}
      onClick={()=>setStudioSubstep(i)}>{T(language,'Trang','Page')} {i+1}</button>)}
     <small>{studioSubstep+1} / {studioPages}</small>
    </nav>:null}</>}
    <div className="bml-student-task-scroll" data-testid="student-task-scroll"
     role="region" aria-label={T(language,'Nội dung bài làm có thể cuộn','Scrollable project step content')}
     tabIndex={0} ref={taskScrollRef}>
    {groupLocked?<StudentLockedDossier language={language} studio={studio} artAssets={artAssets} onPreview={()=>setProjectPreview(true)}/>:null}
    {!groupLocked&&step===0?<><p>{T(language,'Đọc đề bài. Chọn một vấn đề môi trường thực tế mà người xem cần hiểu.','Read the assignment. Choose one real-world environmental issue your visitors should understand.')}</p>
     <div className="bml-step-hint"><Lightbulb size={21}/><div><strong>{T(language,'Gợi ý viết tiếng Anh','English sentence starter')}</strong>
      <p>“One environmental issue at our school is … because …”</p></div></div>
     {field(T(language,'Vấn đề mà nhóm em chọn','Describe your problem'),l.issue,v=>changeLearning('issue',v),{
      rows:4,disabled:locked,placeholder:'Our school produces plastic waste every day because…'})}
     {field(T(language,'Đối tượng tham quan','Who is your visitor?'),l.audience,v=>changeLearning('audience',v),{
      disabled:locked,limit:1200,placeholder:'Students, teachers and families'})}
    </>:null}
    {step===1&&studioSubstep===0&&!groupLocked?<><p>{T(language,'Lên câu chuyện triển lãm gồm ba phần: Vấn đề – Bằng chứng – Giải pháp.','Plan your story around Problem, Evidence, and Solution.')}</p>
     {field(T(language,'Vấn đề bằng tiếng Anh / Problem in English','Problem in English'),l.issue,v=>changeLearning('issue',v),{rows:3,disabled:locked})}
     {field(T(language,'Vai trò nhóm / Group roles','Group roles'),l.roles,v=>changeLearning('roles',v),{rows:2,disabled:locked,placeholder:'Editor: member A; data checker: B; designer: C; presenter: D (use initials or roles, no full names)'})}
     {field(T(language,'Tính khả thi / Feasibility','Feasibility'),l.feasibility,v=>changeLearning('feasibility',v),{rows:2,disabled:locked,placeholder:'Who will do it? Resources? One limitation?'})}
    </>:null}
    {step===1&&studioSubstep===1&&!groupLocked?<><p>{T(language,'Bổ sung dẫn chứng có nguồn và một giải pháp khả thi.','Add sourced evidence and one feasible solution.')}</p>
     <div className="bml-storyboard" role="list" aria-label="Arrange your exhibition visitor route">
      {studio.storyboardOrder.map((key,i)=>{
       const title=EXHIBIT_FIELDS.find(item=>item.key===key)?.label||'Exhibit';
       return <article key={key} className={'bml-storyboard-card '+(l[key]?'is-filled':'')}
        role="listitem" draggable={!locked} onDragStart={()=>{dragStoryboard.current=key;}}
        onDragOver={e=>{if(!locked)e.preventDefault();}}
        onDrop={e=>{e.preventDefault();if(!locked&&dragStoryboard.current&&dragStoryboard.current!==key)
         edit(d=>({...d,storyboardOrder:moveStoryboardCard(d.storyboardOrder,dragStoryboard.current,i-d.storyboardOrder.indexOf(dragStoryboard.current))}));
         dragStoryboard.current=null;}} onDragEnd={()=>{dragStoryboard.current=null;}}>
        <span>{i+1}</span><strong>{title}</strong>
        <small>{l[key]?T(language,'Đã có nội dung','Content added'):T(language,'Chưa hoàn thành','Not written')}</small>
        <div className="bml-storyboard-move">
         <button type="button" disabled={locked||i===0} aria-label={'Move '+title+' earlier'}
           onClick={()=>edit(d=>({...d,storyboardOrder:moveStoryboardCard(d.storyboardOrder,key,-1)}))}><ChevronLeft size={17}/></button>
         <button type="button" disabled={locked||i===2} aria-label={'Move '+title+' later'}
           onClick={()=>edit(d=>({...d,storyboardOrder:moveStoryboardCard(d.storyboardOrder,key,1)}))}><ChevronRight size={17}/></button>
        </div>
       </article>;
      })}
     </div>
     {field(T(language,'Bằng chứng hoặc quan sát bằng tiếng Anh','Evidence in English'),l.evidence,v=>changeLearning('evidence',v),{
      rows:4,disabled:locked,placeholder:'According to the information from …, …'})}
     {field(T(language,'Nguồn dữ liệu/ tài liệu','Source / citation'),l.source,v=>changeLearning('source',v),{
      disabled:locked,limit:1200,placeholder:'Publisher, title, year or “classroom scenario”'})}
     {field(T(language,'Giải pháp nhóm đề xuất bằng tiếng Anh','Proposed solution in English'),l.solution,v=>changeLearning('solution',v),{
      rows:4,disabled:locked,placeholder:'We suggest … because … Our school can …'})}
    </>:null}
    {step===2&&studioSubstep===0&&!groupLocked?<><p>{T(language,'Không cần kéo thả, đặt tọa độ hay dựng mô hình. Ứng dụng tự sắp xếp ba hiện vật.','Your three exhibits follow the visitor route arranged in Plan. You may keep the recommended order. No 3D modeling is required.')}</p>
     {field(T(language,'Tên triển lãm','Exhibition title'),studio.title,v=>edit(d=>({...d,title:v})),{disabled:locked,limit:140,placeholder:'Climate Action Museum'})}
     {field(T(language,'Thông điệp mở đầu','Welcome message'),studio.summary,v=>edit(d=>({...d,summary:v})),{rows:2,disabled:locked,limit:1200,placeholder:'Small actions can make a big difference.'})}
     <label className="bml-full-field">{T(language,'Phong cách bảo tàng','Museum style')}
      <div className="bml-theme-choices">{[['classic','Classic Gallery'],['culture','Culture Pavilion'],['lab','Discovery Lab']].map(([id,label])=>
       <button key={id} type="button" disabled={locked} className={studio.theme===id?'is-active':''} onClick={()=>edit(d=>({...d,theme:id}))}>
        <Landmark size={19}/>{label}{studio.theme===id?<Check size={17}/>:null}</button>)}</div></label>
    </>:null}
    {step===2&&studioSubstep===1&&!groupLocked?<><p>{T(language,'Kiểm tra lời giới thiệu của ba hiện vật bằng tiếng Anh.','Review the English captions for three exhibits.')}</p>
     <div className="bml-exhibit-progress"><strong>{exhibitStatus()}/3 {T(language,'hiện vật có nội dung','exhibits have content')}</strong>
       <span>{T(language,'Tự động xây dựng từ các thẻ ý tưởng ở bước trước.','Generated from your earlier English evidence cards.')}</span></div>
     {studio.storyboardOrder.map((key,i)=><details key={key} className="bml-student-exhibit" open={i===0}>
       <summary>{i+1}. {EXHIBIT_FIELDS.find(x=>x.key===key)?.label||'Exhibit'}</summary>
       {field(T(language,'Mô tả bằng tiếng Anh','English description'),l[key],v=>changeLearning(key,v),{rows:3,disabled:locked})}
       <small className="bml-word-count">{wordCount(l[key])} words · Suggested: 25–40</small>
      </details>)}
    </>:null}
    {step===2&&studioSubstep===2&&!groupLocked?<><p>{T(language,'Thêm sản phẩm trực quan và kiểm tra bản trình bày 2D/3D.','Add authentic artwork and preview the 2D/3D museum.')}</p>
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
     {preview?<div className="bml-student-detail-overlay bml-museum-preview-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Xem trước bảo tàng','Museum preview')}>
      <div className="bml-student-detail-window bml-museum-preview-window">
       <div className="bml-student-detail-head"><strong>{studio.title||'Our Climate Action Museum'}</strong>
        <button type="button" className="bml-outline" onClick={()=>setPreview(false)}><X size={17}/>{T(language,'Đóng','Close')}</button></div>
       <MuseumScene language={language} embedded cinema initial3D gallery={previewGallery} onClose={()=>setPreview(false)}/>
      </div>
     </div>:null}
    </>:null}
    {step===3&&!groupLocked?<><p>{T(language,'Mời một bạn hoặc nhóm khác đọc thử triển lãm. Ghi nhận điều họ hiểu, rồi cải tiến nội dung.','Invite a classmate or group to test the exhibition, note their feedback, then improve your draft.')}</p>
      {liveRunning&&stageIndex===9&&liveInfo?.stageOpen?
      <button type="button" className="bml-outline" data-testid="museum-open-speaking" onClick={()=>setSpeakingOpen(true)}>
       <Sparkles size={18}/>English Speaking Studio · 45–60 seconds</button>:null}
      {stageIndex>=8&&stageIndex<=9?<MuseumLivePeerFeedback csrf={session.csrf} liveInfo={liveInfo} locked={locked||conflict}
       saveState={saveState} onUseFeedback={r=>edit(d=>({...d,learning:{...d.learning,
        feedback:'From '+englishSystemGroupLabel(r.fromGroup)+' on '+(EXHIBIT_FIELDS.find(x=>x.key===r.targetExhibit)?.label||'the exhibition')+': '+r.learned+' | Suggested improvement: '+r.clarify,
        tested:true
       }}))}/>:null}
     <button type="button" className="bml-outline" onClick={()=>{setHistoryOpen(true);viewHistory();}}>
      {T(language,'Xem bản thiết kế / Trước–sau','View storyboard / before and after')}</button>
     <div className="bml-step-hint"><MessageSquare size={21}/><div><strong>{T(language,'Câu hỏi gợi ý cho người xem','Ask your peer')}</strong>
      <p>“What is the problem?” · “Is the evidence clear?” · “What action should we take?”</p></div></div>
     {stageIndex===8?<details className="bml-student-exhibit">
      <summary>{T(language,'Chỉnh nội dung và nguồn của hiện vật','Revise exhibit captions and source')}</summary>
      {EXHIBIT_FIELDS.map(item=><React.Fragment key={item.key}>{field(item.label,l[item.key],v=>changeLearning(item.key,v),{rows:3,disabled:locked})}</React.Fragment>)}
      {field(T(language,'Nguồn dữ liệu','Evidence source'),l.source,v=>changeLearning('source',v),{rows:2,disabled:locked})}
     </details>:null}
     {field(T(language,'Phản hồi thực tế từ bạn học (tiếng Anh)','Peer feedback (English)'),l.feedback,v=>changeLearning('feedback',v),{
      rows:3,disabled:locked,limit:1200,placeholder:'My classmate understood the problem but asked for a clearer example.'})}
     {field(T(language,'Nhóm đã cải tiến điểm gì? (tiếng Anh)','What did your group improve? (English)'),l.improvement,v=>changeLearning('improvement',v),{
      rows:3,disabled:locked,limit:1200,placeholder:'We revised the description and added a more specific action.'})}
     <label className="bml-checkbox-row"><input type="checkbox" disabled={locked} checked={l.tested===true} onChange={e=>changeLearning('tested',e.target.checked)}/>
      {T(language,'Nhóm đã xem và thử nghiệm bản trình bày trước khi nộp.','Our group has tested the exhibition before submission.')}</label>
     <div className="bml-banner bml-info-banner"><Info size={18}/>{T(language,'Chỉ ghi phản hồi đã thu thập thật. Không tự tạo kết quả thử nghiệm.','Record only feedback actually collected. Never invent a test result.')}</div>
    </>:null}
    {step===4&&!groupLocked?<><p>{T(language,'Xem lại các mục bắt buộc và tự đánh giá trước khi gửi bài.','Review the required learning evidence and reflect before submitting.')}</p>
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
     <section className="bml-student-submission-readiness" data-testid="museum-submission-checks" aria-label="Submission readiness">
      <div className="bml-student-submission-head">
       <strong>{readiness.missing.length?'Before you submit':'Draft requirements complete'}</strong>
       <span>{readiness.missing.length?readiness.missing.length+' to fix':'All draft checks passed'}</span>
      </div>
      {readiness.missing.length?<><p>100% draft completion does not include all submission requirements. Finish these items:</p>
       <ul>{readiness.missing.map(item=><li key={item.code}>{item.text}</li>)}</ul>
       {readiness.missingImageSources>0?<button type="button" className="bml-outline" onClick={openArtworkSources}>
        <CloudUpload size={16}/> Add missing image sources ({readiness.missingImageSources})
       </button>:null}</>:<p>The server will also check actual peer feedback and saved Before/After evidence when submitting.</p>}
      {submitWindowNote?<p className="bml-student-submission-window" role="status">{submitWindowNote}</p>:null}
     </section>
     <button type="button" disabled={busy||locked||studio.legacy||conflict||!canSubmitMuseumProject(liveInfo)} className="bml-primary bml-full-button"
      onClick={submit}><Send size={19}/>{busy?T(language,'Đang nộp bài…','Submitting…'):T(language,'Nộp để giáo viên duyệt','Submit for Admin review')}</button>
    </>:null}
    {error?<div className="bml-banner bml-danger-banner" role="alert"><CloudAlert size={19}/>{error}
      {conflict?<button type="button" className="bml-outline" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>{T(language,'Tải bản mới nhất','Reload latest')}</button>:null}</div>:null}
    {notice?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={19}/>{notice}</div>:null}
    </div>
    <footer className="bml-student-bottom">
     {groupLocked?<button type="button" className="bml-primary" onClick={()=>setProjectPreview(true)}><Eye size={18}/>{T(language,'Mở bảo tàng 2D/3D','Open the 2D/3D museum')}</button>:<>
     <button type="button" className="bml-outline" disabled={step===0&&studioSubstep===0} onClick={()=>{if(studioSubstep>0)setStudioSubstep(v=>v-1);else setStep(s=>Math.max(0,s-1));setPreview(false);}}><ChevronLeft size={18}/>{T(language,'Quay lại','Previous')}</button>
     <div><button type="button" className="bml-text-btn" disabled={!dirty||busy||conflict||locked} onClick={()=>save()}><Cloud size={17}/>{T(language,'Lưu ngay','Save now')}</button>
      {step<4?<button type="button" disabled={step>=maxStudentStep&&studioSubstep===studioPages-1} className="bml-primary"
       onClick={()=>{if(studioSubstep<studioPages-1)setStudioSubstep(v=>v+1);else setStep(s=>Math.min(maxStudentStep,4,s+1));setPreview(false);}}>
       {T(language,'Tiếp tục','Continue')} <ChevronRight size={18}/></button>:null}</div>
     </>}
    </footer>
   </div>
   </div>
   </div>
    </section>
   </div>
  </div>
  {speakingOpen&&stageIndex===9&&liveInfo?.stageOpen?<MuseumSpeakingStudio enabled={true} learning={studio.learning} onClose={()=>setSpeakingOpen(false)}/>:null}
  {historyOpen?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Lịch sử thiết kế','Design history')}>
   <div className="bml-student-detail-window">
    <div className="bml-student-detail-head"><strong>{T(language,'Bản thiết kế trước và sau','Storyboard history')}</strong>
     <button type="button" className="bml-outline" onClick={()=>setHistoryOpen(false)}><X size={17}/>{T(language,'Đóng','Close')}</button></div>
    <div className="bml-student-history-dialog">
     <MuseumBeforeAfter
      before={history.find(c=>c.kind==='before')||null}
      after={history.find(c=>c.kind==='after')||null}
      groupLabel={language==='en'?englishSystemGroupLabel(session.groupLabel):session.groupLabel}/>
     {history.length>0?<details className="bml-history-versions"><summary>Saved checkpoint details ({history.length})</summary>
      {history.map(c=><article key={c.checkpointId}><strong>{c.kind||'Checkpoint'} · Version {c.version}</strong>
       {['issue','evidence','solution'].map(k=><p key={k}><b>{k}: </b>{c.draft?.learning?.[k]||'Not recorded'}</p>)}
      </article>)}</details>:null}

    </div>
   </div></div>:null}
  {projectPreview?<div className="bml-student-detail-overlay bml-museum-preview-overlay" role="dialog" aria-modal="true" aria-label={T(language,'Xem bảo tàng của nhóm','Preview group museum')}>
   <div className="bml-student-detail-window bml-museum-preview-window">
    <div className="bml-student-detail-head"><strong>{studio.title||'Our Climate Action Museum'}</strong><button type="button" className="bml-outline" onClick={()=>setProjectPreview(false)}><X size={18}/>{T(language,'Đóng','Close')}</button></div>
    <MuseumScene language={language} embedded cinema initial3D gallery={previewGallery} onClose={()=>setProjectPreview(false)}/>
   </div></div>:null}
 </main>;
}
