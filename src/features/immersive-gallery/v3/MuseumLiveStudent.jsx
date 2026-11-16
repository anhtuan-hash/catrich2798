import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,Eye,HelpCircle,Info,Lock,MessageCircle,RefreshCcw,Send,Users,BookOpen,Volume2} from 'lucide-react';
import {liveGuest} from './museumLiveApi.js';
import {englishSystemGroupLabel} from './museumApi.js';
import LessonResources from './LessonResources.jsx';
import {StudentActivityTask} from './MuseumStudentActivityContent.jsx';
import MuseumStudentLessonReview from './MuseumStudentLessonReview.jsx';
import MuseumSurveyChart from './MuseumSurveyChart.jsx';
import {presentationFor} from './livePresentation.js';
import {validatePeer} from './learningEvidence.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumVoiceover from './MuseumVoiceover.jsx';
import MuseumVideoLab from './MuseumVideoLab.jsx';
import MuseumStudentLessonVideos from './MuseumStudentLessonVideos.jsx';
import MuseumResourceHub from './MuseumResourceHub.jsx';
import MuseumMicroChallenge from './MuseumMicroChallenge.jsx';
import {MICRO_CHALLENGES,stageMediaTools,MUSEUM_CURRICULUM_VIDEOS} from './museumLiveExtensions.js';
import './museumLive.css';
import './museumLiveCompetition.css';
import './museumStudentFocus.css';
const t=(language,vi,en)=>language==='en'?en:vi;
const projectActions={
  3:['Mở phiếu Vấn đề – Bằng chứng – Giải pháp','Open Problem–Evidence–Solution canvas'],
  4:['Mở bảng phân cảnh','Open the storyboard'],
  5:['Mở lại bảng phân cảnh đã lưu','Reopen the saved storyboard'],
  6:['Mở xưởng dựng bảo tàng','Open the museum studio'],
  8:['Xem phản hồi và chỉnh sửa','Review feedback and revise'],
  9:['Mở công cụ luyện thuyết trình','Open the speaking studio'],
  10:['Kiểm tra và nộp bảo tàng','Review and submit the museum'],
};
export default function MuseumLiveStudent({csrf,language='vi',onState,compact=false,toolRequest=null,readOnly=false,onOpenProject,peerActivity,reviewIndex,onReturnLive,onReviewProject}){
 const [data,setData]=useState(null),[selected,setSelected]=useState(null);
 const [quiz,setQuiz]=useState({}),[written,setWritten]=useState('');
 const [sent,setSent]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [syncError,setSyncError]=useState('');
 const [peer,setPeer]=useState(null);
 const [peerResponse,setPeerResponse]=useState({learned:'',clarify:'',rating:0}),[peerLabel,setPeerLabel]=useState('');
 const [activeTool,setActiveTool]=useState(null),[quizPage,setQuizPage]=useState(0);
 useEffect(()=>{if(toolRequest?.name)setActiveTool(toolRequest.name);},[toolRequest?.key]);
 const pollVersion=useRef(0), appliedPollVersion=useRef(0), polling=useRef(false);
 const refresh=async()=>{
  if(polling.current)return;
  polling.current=true;
  const request=++pollVersion.current;
  try{const d=await liveGuest('state');if(request<appliedPollVersion.current)return;appliedPollVersion.current=request;setSyncError('');setData(d);onState?.(d.session);
   if(d.submitted&&d.session?.id)setSent(v=>({...v,[d.session.id+'-'+d.session.stageIndex]:true}));
  }catch(e){if(request>appliedPollVersion.current){appliedPollVersion.current=request;setSyncError(e.message);}}
  finally{polling.current=false;}
 };
 useEffect(()=>{
  if(readOnly)return;
  refresh();
  const id=window.setInterval(()=>{if(!document.hidden)refresh();},2000);
  document.addEventListener('visibilitychange',refresh);
  return()=>{appliedPollVersion.current=++pollVersion.current;window.clearInterval(id);document.removeEventListener('visibilitychange',refresh);};
 },[csrf,readOnly]);
 useEffect(()=>{
  if(!readOnly)return;
  let active=true;
  liveGuest('state').then(result=>{
   if(active){setData(result);setSyncError('');}
  }).catch(error=>{if(active)setSyncError(error.message);});
  return()=>{active=false;};
 },[csrf,readOnly]);
 const survey=data?.survey;
 const session=data?.session,stage=session?.stage,stageIndex=session?.stageIndex;
 const {video:hasVideo,voice:hasVoice}=stageMediaTools(session);
 const curriculumClip=MUSEUM_CURRICULUM_VIDEOS[stageIndex]||null;
 const {view,questionIndex}=session?.presentation??presentationFor(stageIndex);
 const [openQuestions,setOpenQuestions]=useState(false);
 const questions=stage?.questions??stage?.videoQuestions;
 const showQuestions=view==='check'||openQuestions;
 const stageIsOpen=Boolean(session?.stageOpen&&session.status==='active');
 const responseQuestions=showQuestions?questions:null;
 const showVote=stage?.kind==='vote'&&view!=='next';
 const canSendVote=showVote&&!(stageIndex===2&&survey);
 const projectAction=projectActions[stageIndex];
 const legacyPeer=stage?.kind==='peer'&&!peerActivity;
 const showExit=stage?.kind==='exit'&&view==='task';
 useEffect(()=>{
  setOpenQuestions(false);setSelected(null);setQuiz({});setWritten('');setPeer(null);setPeerResponse({learned:'',clarify:'',rating:0});
  setPeerLabel('');setActiveTool(null);setError('');setNotice('');
 },[session?.id,stageIndex]);
 useEffect(()=>{
  if(showQuestions)setQuizPage(questionIndex);
 },[session?.id,stageIndex,view,questionIndex,showQuestions]);
 const posted=data?.submitted===true||sent[session?.id+'-'+stageIndex]===true;
 const savedVote=Number.isInteger(data?.response)?data.response:selected;
 const savedQuiz=Array.isArray(data?.response)?data.response:quiz;
 const canRespond=Boolean(canSendVote||responseQuestions||legacyPeer||showExit);
 const submit=async()=>{
  if(readOnly||busy||posted||!stageIsOpen||!canRespond)return;
  const value=stage.kind==='vote'?selected:responseQuestions?responseQuestions.map((_,i)=>quiz[i]??null):stage.kind==='peer'?peerResponse:written.trim();
  setBusy(true);setError('');setNotice('');
  try{await liveGuest('respond','POST',{value,sessionId:session.id,stageIndex},csrf);setSent(v=>({...v,[session.id+'-'+stageIndex]:true}));
   setNotice(t(language,'Đã lưu câu trả lời của nhóm.','Your group response was saved.'));}
  catch(e){setError(e.message);if(e.status===409||e.status===423)refresh();}finally{setBusy(false);}
 };
 const help=async()=>{if(readOnly)return;setError('');setNotice('');
  try{await liveGuest('need-help','POST',{},csrf);
   setNotice(t(language,'Đã gửi tín hiệu cần hỗ trợ.','Help request sent to your teacher.'));}
  catch(e){setError(e.message);}
 };
 const visitPeer=async()=>{setError('');try{const r=await liveGuest('peer-gallery');if(!r.gallery){setError(t(language,'Chưa có nhóm khác để tham quan.','No other group gallery yet.'));return;}
   setPeerLabel((language==='en'?englishSystemGroupLabel(r.gallery.groupLabel):r.gallery.groupLabel)+' · v'+r.gallery.version);
   const draft=r.gallery.draft||{},signed=new Map((r.gallery.artworks||[]).map(x=>[x.id,x.image_url]));
   setPeer({...draft,summary:'Temporary private classroom preview',rooms:(draft.rooms||[]).map((room,i)=>({
    ...room,id:'peer-room-'+i,exhibits:(room.exhibits||[]).map((e,j)=>({
     ...e,id:'peer-exhibit-'+i+'-'+j,status:'published',image_url:signed.get(e.asset_id)||''
    }))
   }))});}
  catch(e){setError(e.message);}};
 if(reviewIndex!=null)return <section className="bml-live-student">
  {!readOnly&&session?.status!=='ended'&&onReturnLive?<button type="button" className="bml-outline bml-student-return-live" onClick={onReturnLive}>
   {t(language,'Về hoạt động giáo viên đang mở','Return to current live activity')}
  </button>:null}
  <MuseumStudentLessonReview language={language} activityIndex={reviewIndex}
    questionVersion={session?.questionVersion} survey={survey} surveyLoading={!data&&!syncError} surveyPending={!readOnly&&session?.status!=='ended'}
    loadSaved={Boolean(session)&&!readOnly} onOpenProject={onReviewProject}/>
  {reviewIndex===7?peerActivity:null}
 </section>;
 if(readOnly||session?.status==='ended')return <section className="bml-live-student" data-testid="student-live-completed">
  <div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={18}/>
   {readOnly?t(language,'Bài đã hoàn thành · Chỉ xem. Câu trả lời và hiện vật được giữ nguyên.','Completed lesson · View only. Your answers and exhibits are preserved.'):
    data?.submitted?t(language,'Exit Ticket của nhóm đã được ghi nhận. Sản phẩm bảo tàng là bài nộp riêng.','Your group Exit Ticket was recorded. Your museum project is submitted separately.'):
    t(language,'Hoạt động trực tiếp đã kết thúc.','Live activities have ended.')}
  </div>
  <MuseumStudentLessonReview language={language} activityIndex={onReviewProject?0:undefined} questionVersion={session?.questionVersion} survey={survey}
   surveyLoading={!data&&!syncError} loadSaved={session?.status==='ended'&&!readOnly} onOpenProject={onReviewProject||onOpenProject}/>
  {['materials','research'].includes(activeTool)?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label={t(language,'Tài liệu bài học','Lesson materials')}>
   <div className="bml-student-detail-window">
    <div className="bml-student-detail-head"><strong>{t(language,'Tài liệu bài học','Lesson materials')}</strong>
     <button className="bml-outline" type="button" onClick={()=>setActiveTool(null)}>{t(language,'Đóng','Close')}</button></div>
    <div className="bml-student-tool-content">{activeTool==='research'?<MuseumResourceHub language={language}/>:<LessonResources stageIndex={0} language={language}/>}</div>
   </div>
  </div>:null}
 </section>;
 if(!session||session.status==='not_started')return <section className="bml-live-student" data-testid="student-live-waiting">
  {syncError?<p role="alert">{syncError}</p>:null}
  <div className="bml-live-student-header"><strong>Teacher Live</strong><span>{t(language,'Đang chờ giáo viên bắt đầu bài dạy.','Waiting for your teacher to start the lesson.')}</span></div>
  <button type="button" className="bml-outline" onClick={refresh}><RefreshCcw size={16}/>{t(language,'Kiểm tra lại','Refresh')}</button>
 </section>;
 if(peer&&!compact)return <section className="bml-live-student"><button className="bml-outline" type="button" onClick={()=>setPeer(null)}>{t(language,'← Trở về bài học','← Back to lesson')}</button>
  <strong>{t(language,'THAM QUAN CHÉO · CHỈ TRONG PHẠM VI LỚP','PEER REVIEW · CLASSROOM ONLY')}</strong>
  <MuseumScene gallery={peer} language={language} embedded/></section>;
 return <section className="bml-live-student" data-testid="student-live-activity" data-stage-kind={stage?.kind||"unknown"} data-view={view}>
  <header className="bml-live-student-header"><strong>Teacher Live · {t(language,'Tiết','Period')} {stage?.period}/2 · {t(language,'Hoạt động','Stage')} {stageIndex+1}/11</strong>
   <span>{stageIsOpen?t(language,'Giáo viên đã mở hoạt động','Activity is open'):t(language,'Chờ giáo viên mở hoạt động','Waiting for teacher')}</span></header>
  {syncError?<p role="alert" className="bml-live-media-error">{syncError} <button type="button" onClick={refresh}>{t(language,'Thử đồng bộ lại','Retry sync')}</button></p>:null}
  <div className="bml-live-student-question">
   <span className="bml-question-eyebrow">READ · THINK · RESPOND</span>
   <h2>{stage?.title}</h2>
  </div>
  <MuseumStudentLessonVideos clip={curriculumClip} assigned={session.media?.videos} language={language}/>
  {stage?.id==='classroom-survey'?<MuseumSurveyChart survey={survey} language={language} pending testId="student-frozen-survey"/>:null}
  {!stageIsOpen?<div className="bml-banner bml-info-banner"><Lock size={18}/>{session.status==='paused'
    ?t(language,'Giáo viên đang tạm dừng bài học.','Your teacher has paused the lesson.')
    :t(language,'Nhiệm vụ đã đóng. Chờ giáo viên mở lượt tiếp theo.','This task is closed. Wait for the teacher to reopen it.')}</div>:null}
    {questions?.length&&view!=='check'?<button type="button" className="bml-outline bml-student-quiz-toggle"
     onClick={()=>setOpenQuestions(open=>!open)} aria-expanded={openQuestions}>
     {openQuestions?t(language,'Ẩn câu hỏi','Hide questions'):t(language,'Mở câu hỏi trắc nghiệm','Open multiple-choice questions')}
    </button>:null}
    {showVote?<><p className="bml-student-p2-question" lang="en">{stage.question}</p><div className="bml-live-response-options">{stage.options.map((o,i)=><button type="button" key={i} disabled={!stageIsOpen||!canSendVote||posted||busy}
     aria-pressed={savedVote===i} aria-label={String.fromCharCode(65+i)+'. '+o} className={savedVote===i?'is-chosen':''} onClick={()=>{setSelected(i);setNotice('');}}>
      <span className="bml-option-letter" aria-hidden="true">{String.fromCharCode(65+i)}.</span>
      <span className="bml-option-copy" aria-hidden="true">{o}</span>
     </button>)}</div></>:null}
    {responseQuestions?<div className="bml-live-response-form" data-testid="student-video-questions">
     {view==='check'?<p className="bml-video-question-intro" role="status">{t(language,'Giáo viên đang trình chiếu câu','Teacher is showing question')} {questionIndex+1}/{responseQuestions.length}.
      {quizPage!==questionIndex?<button className="bml-outline" type="button" onClick={()=>setQuizPage(questionIndex)}>{t(language,'Về câu đang chiếu','Go to projected question')}</button>:null}</p>:null}
     {responseQuestions.map((q,i)=><div key={i} hidden={quizPage!==i}>
     <strong>Q{i+1}. {q.q}</strong><div className="bml-live-response-options">{q.choices.map((v,j)=><button type="button" key={j} disabled={!stageIsOpen||posted||busy}
      aria-pressed={savedQuiz[i]===j} aria-label={String.fromCharCode(65+j)+'. '+v} className={savedQuiz[i]===j?'is-chosen':''} onClick={()=>setQuiz(prev=>({...prev,[i]:j}))}>
       <span className="bml-option-letter" aria-hidden="true">{String.fromCharCode(65+j)}.</span>
       <span className="bml-option-copy" aria-hidden="true">{v}</span>
      </button>)}</div>{session.revealed&&Number.isInteger(q.answer)?<p className="bml-quiz-revealed">Answer: {String.fromCharCode(65+q.answer)} · {q.explanation}</p>:null}
    </div>)}
    {responseQuestions.length>1?<div className="bml-student-quiz-page-controls">
     <button type="button" aria-label={t(language,'Câu trước','Previous question')} disabled={quizPage===0} onClick={()=>setQuizPage(v=>v-1)}>← <span>{t(language,'Trước','Previous')}</span></button>
     <strong><small>{t(language,'CÂU','QUESTION')}</small> {quizPage+1} of {responseQuestions.length} <em>· {Object.keys(savedQuiz).length} {t(language,'đã chọn','answered')}</em></strong>
     <button type="button" aria-label={t(language,'Câu sau','Next question')} disabled={quizPage===responseQuestions.length-1} onClick={()=>setQuizPage(v=>v+1)}><span>{t(language,'Sau','Next')}</span> →</button>
    </div>:null}</div>:null}
    {stageIsOpen&&(legacyPeer||showExit)?<div className="bml-live-response-form">
     {stage.kind==='peer'?<button type="button" className="bml-outline" onClick={visitPeer}><Eye size={17}/>{t(language,'Tham quan triển lãm nhóm khác (riêng tư)','Visit another group (private)')}</button>:null}
     {stage.kind==='peer'?<><strong>{peerLabel||t(language,'Nhóm được phân công sẽ hiện khi mở triển lãm.','Your assigned peer group will appear when the gallery opens.')}</strong>{[['learned','I learned …'],['clarify','The message would be clearer if …']].map(([key,label])=><label className="bml-full-field" key={key}>{label}<textarea rows={3} maxLength={400} disabled={readOnly||posted} value={peerResponse[key]} onChange={e=>setPeerResponse(v=>({...v,[key]:e.target.value}))}/></label>)}<label>{t(language,'Clarity / Mức rõ ràng','Clarity')}<select value={peerResponse.rating} disabled={readOnly||posted} onChange={e=>setPeerResponse(v=>({...v,rating:Number(e.target.value)}))}><option value={0}>{t(language,'Chọn mức','Choose a rating')}</option><option value={1}>1 · Unclear</option><option value={2}>2 · Partly clear</option><option value={3}>3 · Mostly clear</option><option value={4}>4 · Clear</option></select></label></>:<label className="bml-full-field">{t(language,'Trả lời bằng tiếng Anh','Write your response in English')}<textarea rows={3}
      maxLength={800} disabled={readOnly||posted} placeholder={stage.sentence} value={typeof data?.response==='string'?data.response:written} onChange={e=>setWritten(e.target.value)}/></label>}
    </div>:null}
    {responseQuestions&&posted?<p className="bml-live-choice-note bml-editorial-submitted-note" role="status">
     <CheckCircle2 size={17}/>{t(language,'Đã ghi nhận đáp án của nhóm. Giáo viên sẽ mở hoạt động tiếp theo.','Your group answers are recorded. Your teacher will guide the next activity.')}
    </p>:null}
    {showVote&&(canSendVote||posted)?<p className="bml-live-choice-note" role="status" data-testid="student-vote-guidance">
     {posted?t(language,'Nhóm đã nộp một lượt cho hoạt động này.','Your group has already submitted its vote for this activity.'):
      selected===null?t(language,'Chọn đáp án A, B, C hoặc D để bật nút gửi.','Select A, B, C or D to enable Submit group response.'):
      t(language,'Đã chọn phương án ','Option ')+String.fromCharCode(65+selected)+t(language,'. Bấm gửi để ghi nhận.',' selected. Press Submit to record your answer.')}
    </p>:null}
    {stageIsOpen&&canRespond?<div className="bml-live-actions">
     <button type="button" className="bml-primary" disabled={readOnly||busy||posted||(stage.kind==='vote'&&selected===null)||
      (responseQuestions&&responseQuestions.some((_,i)=>!Number.isInteger(quiz[i])))||
      (stage.kind==='peer'&&!validatePeer(peerResponse))||(stage.kind==='exit'&&written.trim().length<10)} onClick={submit}>
      {posted?<CheckCircle2 size={18}/>:<Send size={17}/>}
      {posted?t(language,'Đã ghi nhận một lượt của nhóm','One group response recorded'):t(language,'Gửi câu trả lời của nhóm','Submit group response')}</button>
     <button type="button" className="bml-outline" disabled={readOnly} onClick={help}><HelpCircle size={17}/>{t(language,'Nhờ giáo viên hỗ trợ','Need help')}</button>
    </div>:null}
  {stage&&(view==='task'||view==='next')?<StudentActivityTask stage={stage} language={language}
   extensionOnly={view==='next'}
   projectLabel={projectAction?t(language,...projectAction):undefined}
   onOpenProject={stageIsOpen&&onOpenProject&&projectAction?()=>onOpenProject(stageIndex):undefined}/>:null}
    {stageIsOpen&&!compact&&hasVideo&&session.media?.query?<MuseumVideoLab
     mode="student" stage={stage} stageIndex={stageIndex} media={{...session.media,videos:[]}}
     language={language} csrf={csrf}/>:null}
    {stageIsOpen&&!compact&&MICRO_CHALLENGES[stageIndex]?<MuseumMicroChallenge key={session.id+'-'+stageIndex} sessionId={session.id}
     stageIndex={stageIndex} existing={data?.micro} csrf={csrf} language={language}/>:null}
    {!compact&&survey&&stageIndex>=3?<MuseumSurveyChart survey={survey} language={language}/>:null}
    {stage?.kind==='peer'?peerActivity:null}
    {stageIsOpen&&!canRespond?<div className="bml-live-actions"><button type="button" className="bml-outline" onClick={help}><HelpCircle size={17}/>{t(language,'Nhờ giáo viên hỗ trợ','Need help')}</button></div>:null}
   {!compact?<div className="bml-student-support" aria-label={t(language,'Hỗ trợ hoạt động','Activity support')}>
    <div className="bml-step-hint"><Info size={19}/><span>{stage?.sentence}</span></div>
    <details className="bml-student-enrichment">
     <summary><BookOpen size={17}/>{t(language,'Hướng dẫn và tài liệu bài học','Lesson instructions and materials')}</summary>
     <LessonResources stageIndex={stageIndex} language={language}/>
    </details>
    <details className="bml-student-enrichment" data-testid="museum-student-research">
     <summary><BookOpen size={17}/>{t(language,'Kho tư liệu · nguồn đáng tin cậy','Research library · reliable sources')}</summary>
     <MuseumResourceHub stage={stage} language={language}/>
    </details>
    {hasVoice?<details className="bml-student-enrichment">
     <summary><Volume2 size={17}/>{t(language,'Nghe lời dẫn tiếng Anh','Listen to English voiceover')}</summary>
     <MuseumVoiceover stage={stage} language={language} compact/>
    </details>:null}
   </div>:null}
   {compact?<div className="bml-student-compact-links">
    {stageIsOpen&&MICRO_CHALLENGES[stageIndex]?<button className="bml-outline" type="button" onClick={()=>setActiveTool('micro')}><BookOpen size={16}/>Thinking Lab</button>:null}
    {survey&&stageIndex>=3?<button className="bml-outline" type="button" onClick={()=>setActiveTool('survey')}><Users size={16}/>{t(language,'Khảo sát lớp','Class Survey')}</button>:null}
   </div>:null}
   {data?.feedback?.length?<div className="bml-live-survey"><h3>{t(language,'Phản hồi dành cho nhóm / Feedback received','Feedback received')}</h3>{data.feedback.map(r=><article key={r.from_group}><p>{r.learned}</p><p>{r.clarify}</p><small>Clarity: {r.rating}/4</small></article>)}</div>:null}
   {compact&&peer?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true">
    <div className="bml-student-detail-window">
     <div className="bml-student-detail-head"><strong>{peerLabel||'Peer Gallery Walk'}</strong>
      <button className="bml-outline" type="button" onClick={()=>setPeer(null)}>Close</button></div>
     <MuseumScene gallery={peer} language={language} embedded/>
    </div></div>:null}
   {activeTool&&(activeTool!=='video'||hasVideo)&&(activeTool!=='voice'||hasVoice)?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label="Learning tools">
    <div className="bml-student-detail-window">
     <div className="bml-student-detail-head">
      <strong>{({materials:'Lesson Materials',research:'Research Library',voice:'American English Voiceover',video:'Video Lab',micro:'English Thinking Lab',survey:'Class Survey'})[activeTool]}</strong>
      <button className="bml-outline" type="button" onClick={()=>setActiveTool(null)}>{t(language,'Đóng','Close')}</button>
     </div>
     <div className="bml-student-tool-content" data-testid="student-tool-panel">
      {activeTool==='materials'?<LessonResources stageIndex={stageIndex} language={language}/>:null}
      {activeTool==='research'?<MuseumResourceHub stage={stage} language={language}/>:null}
      {activeTool==='voice'&&hasVoice?<MuseumVoiceover stage={stage} language={language} compact/>:null}
      {activeTool==='video'?(hasVideo?
       <MuseumVideoLab mode="student" stage={stage} stageIndex={stageIndex} media={{...session.media,videos:[]}} language={language} csrf={csrf}/>:
       <p>{t(language,'Giáo viên chưa giao video cho hoạt động này.','No video assigned yet.')}</p>):null}
      {activeTool==='micro'?(stageIsOpen&&MICRO_CHALLENGES[stageIndex]?
       <MuseumMicroChallenge key={session.id+'-'+stageIndex} sessionId={session.id} stageIndex={stageIndex} existing={data?.micro} csrf={csrf} language={language}/>:
       <p>{t(language,'Chưa có câu hỏi bổ sung.','No additional challenge.')}</p>):null}
      {activeTool==='survey'?<MuseumSurveyChart survey={survey} language={language}/>:null}
     </div>
    </div></div>:null}
   {notice?<div role="status" data-testid="student-action-notice" className="bml-banner bml-success-banner bml-student-action-notice"><CheckCircle2 size={17}/>{notice}</div>:null}
    {error?<div role="alert" className="bml-banner bml-danger-banner">{error}</div>:null}
 </section>;
}
