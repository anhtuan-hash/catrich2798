import React,{useEffect,useState} from 'react';
import {CheckCircle2,Eye,HelpCircle,Info,Lock,MessageCircle,RefreshCcw,Send,Users,BookOpen,Volume2,Film} from 'lucide-react';
import {liveGuest} from './museumLiveApi.js';
import {englishSystemGroupLabel} from './museumApi.js';
import LessonResources from './LessonResources.jsx';
import {validatePeer} from './learningEvidence.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumVoiceover from './MuseumVoiceover.jsx';
import MuseumVideoLab,{MuseumVideoFrame} from './MuseumVideoLab.jsx';
import MuseumResourceHub from './MuseumResourceHub.jsx';
import MuseumMicroChallenge from './MuseumMicroChallenge.jsx';
import {MICRO_CHALLENGES,stageMediaTools,MUSEUM_CURRICULUM_VIDEOS} from './museumLiveExtensions.js';
import './museumLive.css';
import './museumLiveCompetition.css';
import './museumStudentFocus.css';
const t=(language,vi,en)=>language==='en'?en:vi;
export default function MuseumLiveStudent({csrf,language='vi',onState,compact=false,toolRequest=null,readOnly=false}){
 const [data,setData]=useState(null),[selected,setSelected]=useState(null);
 const [quiz,setQuiz]=useState({}),[written,setWritten]=useState('');
 const [sent,setSent]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [peer,setPeer]=useState(null),[survey,setSurvey]=useState(null);
 const [peerResponse,setPeerResponse]=useState({learned:'',clarify:'',rating:0}),[peerLabel,setPeerLabel]=useState('');
 const [activeTool,setActiveTool]=useState(null),[quizPage,setQuizPage]=useState(0);
 useEffect(()=>{if(toolRequest?.name)setActiveTool(toolRequest.name);},[toolRequest?.key]);
 const refresh=async()=>{
  try{const d=await liveGuest('state');setData(d);setSurvey(d.survey);onState?.(d.session);
   if(d.submitted)setSent(v=>({...v,[d.session.id+'-'+d.session.stageIndex]:true}));
  }catch(e){setError(e.message);}
 };
 useEffect(()=>{refresh();const id=window.setInterval(refresh,3500);return()=>window.clearInterval(id);},[]);
 const session=data?.session,stage=session?.stage,stageIndex=session?.stageIndex;
 const {video:hasVideo,voice:hasVoice}=stageMediaTools(session);
 const curriculumClip=MUSEUM_CURRICULUM_VIDEOS[stageIndex]||null;
 const responseQuestions=stage?.kind==='quiz'?stage.questions:(stage?.kind==='group'&&stage.videoQuestions?stage.videoQuestions:null);
 const isVideoCheck=Boolean(stage?.kind==='group'&&stage.videoQuestions);
 useEffect(()=>{setSelected(null);setQuiz({});setWritten('');setPeer(null);setQuizPage(0);setActiveTool(null);setNotice('');},[stageIndex]);
 const posted=sent[session?.id+'-'+stageIndex]===true;
 const canRespond=stage&&(['vote','quiz','peer','exit'].includes(stage.kind)||isVideoCheck);
 const submit=async()=>{
  if(readOnly||busy||posted)return;
  const value=stage.kind==='vote'?selected:responseQuestions?responseQuestions.map((_,i)=>quiz[i]??null):stage.kind==='peer'?peerResponse:written.trim();
  setBusy(true);setError('');setNotice('');
  try{await liveGuest('respond','POST',{value},csrf);setSent(v=>({...v,[session.id+'-'+stageIndex]:true}));
   setNotice(t(language,'Đã lưu câu trả lời của nhóm.','Your group response was saved.'));}
  catch(e){setError(e.message);}finally{setBusy(false);}
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
 if(session?.status==='ended')return <section className="bml-live-student" data-testid="student-live-completed">
  <div className="bml-live-student-header"><strong>Teacher Live</strong><span>{t(language,'Buổi học đã kết thúc','Lesson completed')}</span></div>
  <div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={18}/>
   {data?.submitted?t(language,'Exit Ticket của nhóm đã được ghi nhận. Sản phẩm bảo tàng là bài nộp riêng.','Your group Exit Ticket was recorded. Your museum project is submitted separately.'):
    t(language,'Hoạt động trực tiếp đã kết thúc. Sản phẩm bảo tàng vẫn mở trước hạn.','Live activities have ended. Your museum project remains available until the deadline.')}
  </div>
  <button type="button" className="bml-outline" onClick={refresh}><RefreshCcw size={16}/>{t(language,'Kiểm tra lại','Refresh')}</button>
 </section>;
 if(!session||session.status==='not_started')return <section className="bml-live-student" data-testid="student-live-waiting">
  <div className="bml-live-student-header"><strong>Teacher Live</strong><span>{t(language,'Đang chờ giáo viên bắt đầu bài dạy.','Waiting for your teacher to start the lesson.')}</span></div>
  <button type="button" className="bml-outline" onClick={refresh}><RefreshCcw size={16}/>{t(language,'Kiểm tra lại','Refresh')}</button>
 </section>;
 if(peer&&!compact)return <section className="bml-live-student"><button className="bml-outline" type="button" onClick={()=>setPeer(null)}>{t(language,'← Trở về bài học','← Back to lesson')}</button>
  <strong>{t(language,'THAM QUAN CHÉO · CHỈ TRONG PHẠM VI LỚP','PEER REVIEW · CLASSROOM ONLY')}</strong>
  <MuseumScene gallery={peer} language={language} embedded/></section>;
 return <section className="bml-live-student" data-testid="student-live-activity" data-stage-kind={stage?.kind||"unknown"}>
  {readOnly?<p role="status" className="bml-banner bml-success-banner">Completed lesson · View only. Your answers and exhibits are preserved.</p>:null}
  <header className="bml-live-student-header"><strong>Teacher Live · {t(language,'Tiết','Period')} {stage?.period}/2 · {t(language,'Hoạt động','Stage')} {stageIndex+1}/11</strong>
   <span>{session.stageOpen?t(language,'Giáo viên đã mở hoạt động','Activity is open'):t(language,'Chờ giáo viên mở hoạt động','Waiting for teacher')}</span></header>
  <div className="bml-live-student-question">
   <span className="bml-question-eyebrow">READ · THINK · RESPOND</span>
   <h2>{stage?.title}</h2>
   <p>{stage?.question}</p>
   {curriculumClip&&session.stageOpen&&session.status==='active'?<button type="button" className="bml-student-video-cta" data-testid="student-curriculum-watch"
     onClick={()=>setActiveTool('curriculum')}><Film size={17}/> Watch NASA clip · {curriculumClip.title}</button>:null}
  </div>
  {!session.stageOpen||session.status!=='active'?<div className="bml-banner bml-info-banner"><Lock size={18}/>{t(language,'Chờ giáo viên mở hoạt động tiếp theo.','Wait for your teacher to open this task.')}</div>:<>
    {stage.kind==='vote'?<div className="bml-live-response-options">{stage.options.map((o,i)=><button type="button" key={i} disabled={readOnly||posted||busy}
     aria-pressed={selected===i} aria-label={String.fromCharCode(65+i)+'. '+o} className={selected===i?'is-chosen':''} onClick={()=>{setSelected(i);setNotice('');}}>
      <span className="bml-option-letter" aria-hidden="true">{String.fromCharCode(65+i)}.</span>
      <span className="bml-option-copy" aria-hidden="true">{o}</span>
     </button>)}</div>:null}
    {responseQuestions?<div className="bml-live-response-form" data-testid="student-video-questions">
     {isVideoCheck?<p className="bml-video-question-intro">NASA VIDEO CHECK · Answer three questions before continuing your group design.</p>:null}
     {responseQuestions.map((q,i)=><div key={i} hidden={compact&&quizPage!==i}>
     <strong>Q{i+1}. {q.q}</strong><div className="bml-live-response-options">{q.choices.map((v,j)=><button type="button" key={j} disabled={readOnly||posted||busy}
      aria-pressed={quiz[i]===j} aria-label={String.fromCharCode(65+j)+'. '+v} className={quiz[i]===j?'is-chosen':''} onClick={()=>setQuiz(prev=>({...prev,[i]:j}))}>
       <span className="bml-option-letter" aria-hidden="true">{String.fromCharCode(65+j)}.</span>
       <span className="bml-option-copy" aria-hidden="true">{v}</span>
      </button>)}</div>{session.revealed?<p className="bml-quiz-revealed">Answer: {String.fromCharCode(65+q.answer)} · {q.explanation}</p>:null}
    </div>)}
    {compact&&responseQuestions.length>1?<div className="bml-student-quiz-page-controls">
     <button type="button" aria-label="Previous question" disabled={quizPage===0} onClick={()=>setQuizPage(v=>v-1)}>← <span>Previous</span></button>
     <strong><small>QUESTION</small> {quizPage+1} of {responseQuestions.length} <em>· {Object.keys(quiz).length} answered</em></strong>
     <button type="button" aria-label="Next question" disabled={quizPage===responseQuestions.length-1} onClick={()=>setQuizPage(v=>v+1)}><span>Next</span> →</button>
    </div>:null}</div>:null}
    {['peer','exit'].includes(stage.kind)?<div className="bml-live-response-form">
     {stage.kind==='peer'?<button type="button" className="bml-outline" onClick={visitPeer}><Eye size={17}/>{t(language,'Tham quan triển lãm nhóm khác (riêng tư)','Visit another group (private)')}</button>:null}
     {stage.kind==='peer'?<><strong>{peerLabel||t(language,'Nhóm được phân công sẽ hiện khi mở triển lãm.','Your assigned peer group will appear when the gallery opens.')}</strong>{[['learned','I learned …'],['clarify','The message would be clearer if …']].map(([key,label])=><label className="bml-full-field" key={key}>{label}<textarea rows={3} maxLength={400} disabled={readOnly||posted} value={peerResponse[key]} onChange={e=>setPeerResponse(v=>({...v,[key]:e.target.value}))}/></label>)}<label>{t(language,'Clarity / Mức rõ ràng','Clarity')}<select value={peerResponse.rating} disabled={readOnly||posted} onChange={e=>setPeerResponse(v=>({...v,rating:Number(e.target.value)}))}><option value={0}>{t(language,'Chọn mức','Choose a rating')}</option><option value={1}>1 · Unclear</option><option value={2}>2 · Partly clear</option><option value={3}>3 · Mostly clear</option><option value={4}>4 · Clear</option></select></label></>:<label className="bml-full-field">{t(language,'Trả lời bằng tiếng Anh','Write your response in English')}<textarea rows={3}
      maxLength={800} disabled={readOnly||posted} placeholder={stage.sentence} value={written} onChange={e=>setWritten(e.target.value)}/></label>}
    </div>:null}
    {responseQuestions&&posted?<p className="bml-live-choice-note bml-editorial-submitted-note" role="status">
     <CheckCircle2 size={17}/>{t(language,'Đã ghi nhận đáp án của nhóm. Giáo viên sẽ mở hoạt động tiếp theo.','Your group answers are recorded. Your teacher will guide the next activity.')}
    </p>:null}
    {stage.kind==='vote'&&canRespond?<p className="bml-live-choice-note" role="status" data-testid="student-vote-guidance">
     {posted?t(language,'Nhóm đã nộp một lượt cho hoạt động này.','Your group has already submitted its vote for this activity.'):
      selected===null?t(language,'Chọn đáp án A, B, C hoặc D để bật nút gửi.','Select A, B, C or D to enable Submit group response.'):
      t(language,'Đã chọn phương án ','Option ')+String.fromCharCode(65+selected)+t(language,'. Bấm gửi để ghi nhận.',' selected. Press Submit to record your answer.')}
    </p>:null}
    {canRespond?<div className="bml-live-actions">
     <button type="button" className="bml-primary" disabled={readOnly||busy||posted||(stage.kind==='vote'&&selected===null)||
      (responseQuestions&&responseQuestions.some((_,i)=>!Number.isInteger(quiz[i])))||
      (stage.kind==='peer'&&!validatePeer(peerResponse))||(stage.kind==='exit'&&written.trim().length<10)} onClick={submit}>
      {posted?<CheckCircle2 size={18}/>:<Send size={17}/>}
      {posted?t(language,'Đã ghi nhận một lượt của nhóm','One group response recorded'):t(language,'Gửi câu trả lời của nhóm','Submit group response')}</button>
     <button type="button" className="bml-outline" disabled={readOnly} onClick={help}><HelpCircle size={17}/>{t(language,'Nhờ giáo viên hỗ trợ','Need help')}</button>
    </div>:null}
    {!compact&&hasVideo?<MuseumVideoLab
     mode="student" stage={stage} stageIndex={stageIndex} media={session.media}
     language={language} csrf={csrf}/>:null}
    {!readOnly&&!compact&&MICRO_CHALLENGES[stageIndex]?<MuseumMicroChallenge key={session.id+'-'+stageIndex}
     stageIndex={stageIndex} existing={data?.micro} csrf={csrf} language={language}/>:null}
    {['group','recap','artwork','present'].includes(stage.kind)?<p className="bml-live-student-status">
      {t(language,'Hãy thực hiện nhiệm vụ bên dưới theo hướng dẫn của giáo viên.','After the NASA video check, continue with the Problem–Evidence–Solution canvas.')}</p>:null}
    {!compact&&survey&&stageIndex>=3?<div className="bml-live-survey"><strong>{t(language,'KẾT QUẢ KHẢO SÁT LỚP','CLASS SURVEY')} · N={survey.n} {t(language,'thiết bị nhóm','group devices')}</strong>
      {survey.options?.map((o,i)=><p key={i}>{o.label}: {o.count}/{survey.n} ({o.percent}%)</p>)}</div>:null}
   </>}
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
    {hasVideo?<button className="bml-outline" type="button" onClick={()=>setActiveTool('video')}><Eye size={16}/>Video</button>:null}
    {MICRO_CHALLENGES[stageIndex]?<button className="bml-outline" type="button" onClick={()=>setActiveTool('micro')}><BookOpen size={16}/>Thinking Lab</button>:null}
    {survey&&stageIndex>=3?<button className="bml-outline" type="button" onClick={()=>setActiveTool('survey')}><Users size={16}/>Class Survey</button>:null}
   </div>:null}
   {data?.feedback?.length?<div className="bml-live-survey"><h3>{t(language,'Phản hồi dành cho nhóm / Feedback received','Feedback received')}</h3>{data.feedback.map(r=><article key={r.from_group}><p>{r.learned}</p><p>{r.clarify}</p><small>Clarity: {r.rating}/4</small></article>)}</div>:null}
   {compact&&peer?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true">
    <div className="bml-student-detail-window">
     <div className="bml-student-detail-head"><strong>{peerLabel||'Peer Gallery Walk'}</strong>
      <button className="bml-outline" type="button" onClick={()=>setPeer(null)}>Close</button></div>
     <MuseumScene gallery={peer} language={language} embedded/>
    </div></div>:null}
   {compact&&activeTool&&(activeTool!=='video'||hasVideo)&&(activeTool!=='voice'||hasVoice)&&(activeTool!=='curriculum'||curriculumClip)?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label="Learning tools">
    <div className="bml-student-detail-window">
     <div className="bml-student-detail-head">
      <strong>{({materials:'Lesson Materials',research:'Research Library',voice:'American English Voiceover',video:'Video Lab',curriculum:'Watch NASA lesson video',micro:'English Thinking Lab',survey:'Class Survey'})[activeTool]}</strong>
      <button className="bml-outline" type="button" onClick={()=>setActiveTool(null)}>{t(language,'Đóng','Close')}</button>
     </div>
     <div className="bml-student-tool-content" data-testid="student-tool-panel">
      {activeTool==='materials'?<LessonResources stageIndex={stageIndex} language={language}/>:null}
      {activeTool==='research'?<MuseumResourceHub stage={stage} language={language}/>:null}
      {activeTool==='voice'&&hasVoice?<MuseumVoiceover stage={stage} language={language} compact/>:null}
      {activeTool==='curriculum'&&curriculumClip?<MuseumVideoFrame id={curriculumClip.id} title={curriculumClip.title}
       language={language} onClose={()=>setActiveTool(null)}/>:null}
      {activeTool==='video'?(hasVideo?
       <MuseumVideoLab mode="student" stage={stage} stageIndex={stageIndex} media={session.media} language={language} csrf={csrf}/>:
       <p>{t(language,'Giáo viên chưa giao video cho hoạt động này.','No video assigned yet.')}</p>):null}
      {activeTool==='micro'?(MICRO_CHALLENGES[stageIndex]?
       <MuseumMicroChallenge key={session.id+'-'+stageIndex} stageIndex={stageIndex} existing={data?.micro} csrf={csrf} language={language}/>:
       <p>{t(language,'Chưa có câu hỏi bổ sung.','No additional challenge.')}</p>):null}
      {activeTool==='survey'?<div className="bml-live-survey">
       {survey?<><strong>CLASS SURVEY · N={survey.n} group devices</strong>
        {survey.options?.map((o,i)=><p key={i}>{o.label}: {o.count}/{survey.n} ({o.percent}%)</p>)}</>:
        <p>{t(language,'Chưa có dữ liệu khảo sát.','No survey data yet.')}</p>}
      </div>:null}
     </div>
    </div></div>:null}
   {!compact&&activeTool==='curriculum'&&curriculumClip?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label="NASA learning video">
    <div className="bml-student-detail-window">
     <div className="bml-student-detail-head"><strong>NASA LESSON VIDEO</strong><button type="button" className="bml-outline" onClick={()=>setActiveTool(null)}>Close</button></div>
     <MuseumVideoFrame id={curriculumClip.id} title={curriculumClip.title} language={language} onClose={()=>setActiveTool(null)}/>
    </div></div>:null}
   {notice?<div role="status" data-testid="student-action-notice" className="bml-banner bml-success-banner bml-student-action-notice"><CheckCircle2 size={17}/>{notice}</div>:null}
    {error?<div role="alert" className="bml-banner bml-danger-banner">{error}</div>:null}
 </section>;
}
