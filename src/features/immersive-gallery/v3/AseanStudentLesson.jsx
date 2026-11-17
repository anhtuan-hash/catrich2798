import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,LockKeyhole,Save} from 'lucide-react';
import AseanHueQuiz from './AseanHueQuiz.jsx';
import AseanDiscussionPhoto from './AseanDiscussionPhoto.jsx';
import AseanActivityArt,{AseanFrameIcon} from './AseanActivityArt.jsx';
import {ASEAN_ACTIVITY_DESIGN,ASEAN_DISCUSSION_MODEL} from './aseanActivityDesign.js';
import {ASEAN_FRAMES,ASEAN_STAGES,ASEAN_TITLE,aseanBaselineDraft,aseanDestination,aseanExhibitMissing,aseanWritingCard,aseanWordCount,validAseanResponse} from './aseanLesson.js';
import {guestRequest,englishSystemGroupLabel} from './museumApi.js';
import {liveGuest,localMuseumFromDraft,artGuest} from './museumLiveApi.js';
import {emptyStudio,normalizeStudio,documentFromStudio} from './museumData.js';
import MuseumVoiceover from './MuseumVoiceover.jsx';
import MuseumVideoLab from './MuseumVideoLab.jsx';
import MuseumArtworkStudio from './MuseumArtworkStudio.jsx';
import MuseumStudentWorkshop from './MuseumStudentWorkshop.jsx';
import MuseumStudentActivityGroups from './MuseumStudentActivityGroups.jsx';
import MuseumScene,{reviewMuseum} from './MuseumScene.jsx';
import GalleryRenderBoundary from '../GalleryRenderBoundary.jsx';
import './aseanStudentStudio.css';

const emptyAnswer=()=>({text:'',frame:null,score:0});
const initialFields=stage=>{
 if(stage===0||stage===5)return {experience:'',advice:''};
 if(stage===1)return {codes:['','',''],comparisonFrame:null,alternative:'',fact:'',source:'',reason:''};
 if(stage===3)return {first:null,answers:ASEAN_FRAMES.map(emptyAnswer),comment:''};
 return {answer:'',frame:null,score:0};
};
const errorText=error=>error.message||'The request could not be completed.';
const ACTIVITY_GROUPS=[
 {key:'discover',en:'Discover',vi:'Khám phá'},
 {key:'plan',en:'Plan',vi:'Lập kế hoạch'},
 {key:'build',en:'Build',vi:'Chế tạo'},
 {key:'test',en:'Test & revise',vi:'Thử nghiệm'},
 {key:'share',en:'Share',vi:'Trình bày'},
];
const ACTIVITY_GROUP_ENDS=[1,2,3,5,ASEAN_STAGES.length];
const ASEAN_ACTIVITIES_VI=ASEAN_STAGES.map(stage=>({...stage,title:stage.vi}));
const T=(language,vi,en)=>language==='en'?en:vi;
const groupName=(language,label)=>language==='en'?englishSystemGroupLabel(label):label;
const visitorResult=record=>validAseanResponse(3,record)
 ?record.answers.reduce((sum,answer)=>sum+answer.score,0)+'/'+ASEAN_FRAMES.length
 :null;

function ClassVisitorModel({language}){
 const {title,vi,captions}=ASEAN_DISCUSSION_MODEL;
 return <section className="asean-visitor-model bml-surface" aria-labelledby="asean-visitor-model-title">
  <h3 id="asean-visitor-model-title" lang={language}>{T(language,vi,title)}</h3>
  <AseanDiscussionPhoto language={language}/>
  <ol>{ASEAN_FRAMES.map((frame,index)=><li key={frame.key}><strong>{frame.label}</strong> · {captions[index]}</li>)}</ol>
  <p>Which visitor question still needs a clearer answer? Agree on the missing detail and share it with your class.</p>
 </section>;
}

function ResponseFields({stage,fields,update,groupLabel,question,recorded}){
 const text=(key,label,maxLength=220)=><label className="bml-full-field">{label}
  <textarea required rows={2} maxLength={maxLength} value={fields[key]||''} onChange={event=>update(key,event.target.value)}/>
 </label>;
 const frameOptions=<>{ASEAN_FRAMES.map((frame,index)=><option key={frame.key} value={index+1}>{index+1} · {frame.label}</option>)}</>;
 const frameSelect=(value,onChange,emptyLabel='No matching frame')=><select value={value??''} onChange={event=>onChange(Number(event.currentTarget.value)||null)}>
  <option value="">{emptyLabel}</option>{frameOptions}
 </select>;
 const scoreSelect=(value,onChange)=><select value={value} onChange={event=>onChange(Number(event.currentTarget.value))}>
  <option value={0}>0 · Missing or unclear</option><option value={1}>1 · Found with evidence</option>
 </select>;
 if(stage===0||stage===5){
  const card=aseanWritingCard(groupLabel,stage===5);
  return <fieldset className="asean-response-sheet" disabled={recorded}>
   <legend>{stage===5?'Transfer writing · '+card.title:'Your two sentences'}</legend>
   <p className="asean-response-context">{card.country}</p>
   <div className="asean-response-grid">
    <div><p><strong>Visitors can …</strong><br/>{card.experience}</p>{text('experience','One thing a visitor can do')}</div>
    <div><p><strong>Visitors should …</strong><br/>{card.advice}</p>{text('advice','One piece of advice')}</div>
   </div>
  </fieldset>;
 }
 if(stage===1)return <fieldset className="asean-response-sheet" disabled={recorded}><legend>Exhibit plan</legend>
  <h3>1. Enter your three photo codes</h3>
  <p>Use the codes from your teacher’s photo set or give your chosen photos short codes like P1, E1 and A1.</p>
  <div className="asean-response-grid asean-response-grid--three">
   {ASEAN_FRAMES.map((f,i)=><label className="bml-full-field asean-photo-plan" key={f.key}>
    <AseanFrameIcon index={i}/><span>{f.label} photo code</span><small>{f.question}</small>
    <input required maxLength={35} value={fields.codes?.[i]||''} onChange={event=>update('codes',fields.codes.map((code,j)=>i===j?event.target.value:code))}/>
   </label>)}
  </div>
  <div className="asean-response-grid">
   <section><h3>2. Compare one alternative photo</h3>
    <label className="bml-full-field">Frame your group compared {frameSelect(fields.comparisonFrame,v=>update('comparisonFrame',v),'Select a frame')}</label>
    {text('alternative','Code for the alternative photo, e.g. E2',35)}
    {text('reason','We chose this photo because visitors can see …')}
   </section>
   <section><h3>3. Record one fact and its source</h3>
    {text('fact','A fact in your own words')}{text('source','Source for the fact',350)}
   </section>
  </div>
 </fieldset>;
 if(stage===3)return <fieldset className="asean-response-sheet asean-visit-questions" disabled={recorded}><legend>Three visitor questions</legend>
  <label className="bml-full-field">Which frame did you open first? <select required value={fields.first??''} onChange={event=>update('first',Number(event.target.value))}><option value="">Select a frame</option>{frameOptions}</select></label>
  <p className="asean-visit-scoring">Give 1 point for a clear answer supported by its matching frame. Give 0 if the answer was missing or unclear, and write what was missing.</p>
  {ASEAN_FRAMES.map(({key,label,question},i)=>{
   const answer=fields.answers[i];
   const change=(name,value)=>update('answers',fields.answers.map((item,index)=>index===i?{...item,[name]:value}:item));
   return <fieldset className="asean-visit-question" key={key}><legend>{i+1}. {question}</legend>
    <label className="bml-full-field">What did you find?<textarea required rows={2} maxLength={130} value={answer.text} onChange={e=>change('text',e.target.value)}/></label>
    <div className="asean-visit-evidence">
     <label className="bml-full-field">Evidence frame {frameSelect(answer.frame,v=>change('frame',v),'No clear evidence')}</label>
     <label className="bml-full-field">Score {scoreSelect(answer.score,v=>change('score',v))}</label>
    </div>
    {answer.score===1&&answer.frame!==i+1&&<p role="status">To give 1 point, cite {label}. If the answer is unclear, give 0.</p>}
   </fieldset>;
  })}
  {text('comment','One specific change the group could make')}
 </fieldset>;
 return <fieldset className="asean-response-sheet" disabled={recorded}><legend>{ASEAN_FRAMES[(question||fields.question)-1]?.question||'Fresh visitor test'}</legend>
  {text('answer','Your group’s answer',130)}
  <div className="asean-response-grid">
   <label className="bml-full-field">Evidence frame {frameSelect(fields.frame,v=>update('frame',v))}</label>
   <label className="bml-full-field">Score {scoreSelect(fields.score,v=>update('score',v))}</label>
  </div>
 </fieldset>;
}

function GroupResponse({session,stage,open,record,live,refreshRecords,refreshLive,onVisit,retestTask,transferNeedsResubmission,formId,onSubmittingChange,language='en'}){
 const baselineDraft=stage===0&&session.assignment?.class_scope==='11.3'?aseanBaselineDraft(session.groupLabel):null;
 const [fields,setFields]=useState(()=>record||baselineDraft||initialFields(stage));
 const [visit,setVisit]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [prefilledFeedback,setPrefilledFeedback]=useState(false);
 const submitted=Boolean(record);
 const errorRef=useRef(null),openedV1=useRef(false);
 useEffect(()=>{
  if(formId&&error)errorRef.current?.focus();
 },[formId,error]);
 const v1Visit=stage===3;
 const v2Visit=stage===4;
 const visitStage=v1Visit||v2Visit;
 const reconstructed=v1Visit&&visit?.gallery?.draft?.checkpointOrigin==='reconstructed_reference';
 const targetGroup=visit?.target||retestTask?.target;
 const visitedExhibit=targetGroup&&[
  groupName(language,targetGroup),
  aseanDestination(targetGroup)?.name||visit?.gallery?.draft?.title,
 ].filter(Boolean).join(' · ');
 const scoreMismatch=v2Visit&&visit?.gallery&&fields.score===1&&fields.frame!==visit.question;
 const loadVisit=async()=>{
  setError('');setBusy(true);
  try{
   const result=await liveGuest('asean-visit');
   setVisit(result);
   if(result.gallery){
    if(v1Visit&&!openedV1.current){
     openedV1.current=true;
     if(validAseanResponse(3,result.feedbackDraft)){
      setFields(result.feedbackDraft);
      setPrefilledFeedback(true);
     }
    }
    const reference=stage===3&&result.gallery.draft?.checkpointOrigin==='reconstructed_reference';
    onVisit(reviewMuseum({snapshot:result.gallery.draft},result.gallery.artworks),reference);
   }
   else if(v1Visit)onVisit(null);
   else setError(englishSystemGroupLabel(result.target)+' has not made V2 available yet.');
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 const submit=async event=>{
  event.preventDefault();
  if(!open||submitted||busy)return;
  setError('');
  const value=stage===4?{...fields,question:visit?.question}:fields;
  if(visitStage&&!visit?.gallery)return;
  if(!validAseanResponse(stage,value)){
   if(stage===1){
    setError('Use three different photo codes, choose the frame you compared, and give the alternative a different code from the photo you chose for that frame. Check that the fact, source and reason are filled in.');
   }else if(stage===3){
    setError('Select the first frame you opened, answer all three questions and add one suggestion. For each score of 1, select the frame that matches the question.');
   }else{
    setError('Complete the required answers before submitting.');
   }
   return;
  }
  setBusy(true);onSubmittingChange?.(true);
  try{
   await liveGuest('asean-submit','POST',{
    sessionId:live.id,stageIndex:stage,value,
    ...(visitStage?{checkpointId:visit.gallery.checkpointId}:{}),
   },session.csrf);
   await Promise.all([refreshRecords(),refreshLive()]);
  }catch(e){setError(errorText(e));}finally{setBusy(false);onSubmittingChange?.(false);}
 };
 if(!open&&!submitted&&!baselineDraft&&!v2Visit)return <p className="asean-response-closed" role="status">{transferNeedsResubmission
  ?session.readOnly?'A corrected transfer response is still pending.':'Your previous response repeated your baseline writing. When Activity 6 opens, write two new sentences using your transfer card.'
  :session.readOnly?'No group response was recorded for this activity.':'Your teacher has not opened this activity for responses.'}</p>;
 return <section className={'bml-surface asean-group-response'+(v1Visit?' asean-v1-visit':v2Visit?' asean-v2-retest':'')}>
  {transferNeedsResubmission&&!submitted&&<p role="status">Your previous response repeated your baseline writing. Write two new sentences using the transfer card below.</p>}
  {v1Visit&&!submitted&&<div className="asean-visit-intro" lang={language}>
   <h3 data-visit-start tabIndex={-1}>{T(language,'1. Tham quan phòng được giao','1. Visit the assigned exhibit')}</h3>
   {visitedExhibit&&!visit?.gallery&&<p><strong>{visitedExhibit}</strong></p>}
   {!submitted&&<p role={visit&&!visit.gallery?'status':undefined}>{visit&&!visit.gallery
    ?T(language,'Phòng V1 chưa sẵn sàng. Hỏi giáo viên rồi thử mở lại.','This V1 is not ready. Ask your teacher, then try again.')
    :T(language,'Mở phòng V1, đọc ba khung và ghi nhớ khung mở đầu tiên. Đóng phòng để điền phiếu góp ý.','Open the V1 exhibit, inspect all three frames and remember which one you opened first. Close the viewer to fill in the feedback.')}</p>}
   {open&&!submitted&&<button type="button" className={visit?.gallery?'bml-outline':'bml-primary'} onClick={loadVisit} disabled={busy}>
    <Box size={18}/>{busy?T(language,'Đang mở…','Opening…'):visit?.gallery?T(language,'Mở lại phòng V1','Reopen the V1 exhibit'):T(language,'Mở phòng V1 được giao','Open assigned V1 exhibit')}
   </button>}
   {reconstructed&&<p role="status">{T(language,'Phòng này là bản tham chiếu V1 được dựng lại.','This exhibit is a reconstructed V1 reference.')}</p>}
  </div>}
  {v2Visit&&<div className="asean-visit-intro" lang={language}>
   <h3 data-activity5-visitor tabIndex={-1}>{T(language,'2. Thử phòng V2 của nhóm được giao','2. Retest the assigned group’s V2')}</h3>
   {visitedExhibit&&<p><strong>{visitedExhibit}</strong></p>}
   {!visit?.gallery&&!submitted&&retestTask?.ready&&<p lang="en">{ASEAN_FRAMES[retestTask.question-1]?.question}</p>}
   {!open&&!submitted&&<p role="status">{session.readOnly||live?.stageIndex>4
    ?T(language,'Nhóm em chưa có phiếu thử lại đã nộp.','Your group has no recorded retest submission.')
    :T(language,'Giáo viên sẽ mở phần nộp phiếu trong Hoạt động 5.','Your teacher will open submissions during Activity 5.')}</p>}
   {open&&!submitted&&(retestTask?.ready===false
    ?<p role="status">{T(language,'Đang chờ nhóm được giao lưu bản V2.','Waiting for the assigned group to save its V2.')}</p>
    :<>
     <p>{T(language,'Mở phòng, tìm câu trả lời rồi đóng phòng để ghi bằng chứng.','Open the exhibit, find the answer, then close the viewer to cite the frame you used.')}</p>
     <button type="button" className={visit?.gallery?'bml-outline':'bml-primary'} onClick={loadVisit} disabled={busy}>
      <Box size={18}/>{visit?.gallery?T(language,'Mở lại phòng V2 được giao','Reopen assigned V2 exhibit'):T(language,'Mở phòng V2 được giao','Open assigned V2 exhibit')}
     </button>
    </>)}
  </div>}
  {(!visitStage||submitted||visit?.gallery)&&<form id={formId} onSubmit={submit}>
   {v1Visit&&(submitted?<p role="status" lang={language}>
    {[T(language,'Đã nộp góp ý','Visitor feedback submitted'),visitorResult(record)].filter(Boolean).join(' · ')}
   </p>:<h3 data-visit-form-heading tabIndex={-1} lang={language}>{T(language,'2. Điền phiếu góp ý','2. Complete the visitor feedback')}</h3>)}
   {v1Visit&&visitedExhibit&&<p className="asean-visit-target" lang={language}>
    {T(language,'Triển lãm được góp ý','Exhibit visited')} · <strong>{visitedExhibit}</strong>
   </p>}
   {v2Visit&&(submitted?<p role="status" lang={language}>
    {T(language,'Đã nộp phiếu thử lại','Retest submitted')} · {record.score}/1
   </p>:<h4 data-activity5-answer tabIndex={-1} lang={language}>{T(language,'Ghi kết quả thử lại','Record your retest answer')}</h4>)}
   {v2Visit&&!submitted&&visitedExhibit&&<p className="asean-visit-target" lang={language}>
    {T(language,'Phòng vừa thử','Exhibit tested')} · <strong>{visitedExhibit}</strong>
   </p>}
   {prefilledFeedback&&!submitted&&<p className="bml-banner bml-info-banner" lang={language}>
    {T(language,'Phiếu điền sẵn từ lượt rà soát V1. Hãy kiểm tra các câu trả lời, bằng chứng và khung nhóm mở đầu tiên trước khi nộp.',
     'Draft based on a V1 review. Check the answers, evidence and the first frame your group opened before submitting.')}
   </p>}
   {baselineDraft&&!submitted&&<p role="status">{open
    ?'Teacher-provided draft. Review the two sentences and edit them before submitting.'
    :session.readOnly?'Teacher-provided example shown for review.':'Teacher-provided draft. Your teacher needs to open Activity 1 for editing and submission.'}</p>}
   <ResponseFields stage={stage} fields={record||fields} update={(key,value)=>setFields(previous=>({...previous,[key]:value}))}
    groupLabel={session.groupLabel} question={visit?.question} recorded={submitted||!open}/>
   {!submitted&&scoreMismatch&&<p role="status">For a score of 1, choose {ASEAN_FRAMES[visit.question-1]?.label} as the evidence frame. Choose 0 if the answer is missing or unclear.</p>}
   {submitted?!visitStage&&<p role="status">{stage===1?'Exhibit plan submitted.':'Group response saved.'}</p>:
    !formId&&<button className="bml-primary" type="submit" disabled={busy||!open||scoreMismatch}>
     {v2Visit?T(language,'Nộp phiếu thử lại','Submit retest answer'):'Submit group response'}
    </button>}
  </form>}
  {error&&<p className="bml-banner bml-danger-banner" ref={errorRef} tabIndex={formId?-1:undefined} role="alert">{error}</p>}
 </section>;
}

export default function AseanStudentLesson({session,initialStudio,initialVersion,onLogout,language,onLanguageChange}){
 const destination=aseanDestination(session.groupLabel);
 const [studio,setStudio]=useState(()=>initialStudio||emptyStudio());
 const [version,setVersion]=useState(initialVersion);
 const [assets,setAssets]=useState([]);
 const [live,setLive]=useState(null),[records,setRecords]=useState({rows:[],feedback:null,checkpoints:[]});
 const [readOnly,setReadOnly]=useState(session.readOnly),[review,setReview]=useState(null);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [imageBusy,setImageBusy]=useState(false);
 const [projectSubmitting,setProjectSubmitting]=useState(false);
 const [visitOpened,setVisitOpened]=useState(false);
 const projectFormId=useId();
 const [notice,setNotice]=useState(''),[preview,setPreview]=useState(null);
 const [bannerExpanded,setBannerExpanded]=useState(true),[activityStarted,setActivityStarted]=useState(false);
 const lessonRef=useRef(null),projectRef=useRef(null),studioRef=useRef(null);
 const [revision,setRevision]=useState({question:1,reason:''});
 const [submitted,setSubmitted]=useState(!['issued','editing','changes_requested'].includes(session.groupState));
 const refreshLive=async()=>{
  const result=await liveGuest('state');setLive(result.session);setReadOnly(Boolean(result.readOnly));
 };
 const refreshRecords=async()=>setRecords(await liveGuest('asean-records'));
 useEffect(()=>{
  let active=true;
  const sync=async()=>{
   try{
    const [next,work]=await Promise.all([liveGuest('state'),liveGuest('asean-records')]);
    if(active){setLive(next.session);setReadOnly(Boolean(next.readOnly));setRecords(work);}
   }catch(e){if(active)setError(errorText(e));}
  };
  sync();const interval=window.setInterval(sync,5000);
  return()=>{active=false;window.clearInterval(interval);};
 },[]);
 const stage=review??Math.max(0,Math.min(ASEAN_STAGES.length-1,live?.stageIndex??0));
 const isWritingActivity=stage===0||stage===5;
 const current=ASEAN_STAGES[stage];
 const activityGroup=ACTIVITY_GROUP_ENDS.findIndex(end=>stage<end);
 const design=ASEAN_ACTIVITY_DESIGN[stage];
 const liveOpen=!readOnly&&live?.status==='active'&&live.stageOpen&&live.stageIndex===stage;
 const captured=records.checkpoints.find(item=>item.kind==='after');
 const baseline=records.checkpoints.find(item=>item.kind==='before');
 const retestVisitor=records.retestVisitor?groupName(language,records.retestVisitor)
  :T(language,'nhóm khách được giao','the assigned visitor group');
 const waitingForRetest=live?.stageIndex===4&&liveOpen
  ?T(language,'Đang chờ '+retestVisitor+' nộp phiếu thử lại.','Waiting for '+retestVisitor+' to submit its retest.')
  :T(language,'Chưa có phiếu thử lại từ '+retestVisitor+'.','No retest submission from '+retestVisitor+'.');
 const revisionTask=captured
  ?T(language,'Đối chiếu bản sửa của nhóm em, rồi thử phòng V2 của nhóm được giao.',
   'Review your group’s revision, then retest the V2 room assigned to you.')
  :records.feedback
   ?T(language,'Đọc góp ý, sửa một khung và giải thích lý do. Lưu V2 để một nhóm khách mới thử lại cùng câu hỏi.',design.studentTask)
   :T(language,'Chọn một chú thích hoặc ảnh cần làm rõ. Giải thích thay đổi rồi lưu V2 để nhóm khách mới thử lại.',
    'Choose a caption or photo that could answer a visitor’s question more clearly. Explain your change and save V2 for the fresh visitor test.');
 const reportTask=records.retest
  ?'Report what changed and what the assigned visitor group found.'
  :records.staffRetest
   ?'Report what changed. You may cite the teacher’s check and state that the visitor group has yet to submit.'
   :'Report what changed and state that the visitor group has yet to submit.';
 const editable=liveOpen&&(stage===2||(stage===4&&!captured))&&!submitted;
 const document=documentFromStudio({...studio,title:destination?.name||'',summary:destination?.country||'',theme:'culture'},session.assignment);
 const missing=aseanExhibitMissing(document);
 const photoCount=Object.values(studio.artworks).filter(Boolean).length;
 const workshopVisible=[2,4,5].includes(stage);
 useEffect(()=>{
  setPreview(null);
  setVisitOpened(false);
  if(lessonRef.current)lessonRef.current.scrollTop=0;
  if(projectRef.current)projectRef.current.scrollTop=0;
 },[stage,live?.id]);
 const startActivity=()=>{setActivityStarted(true);setBannerExpanded(false);};
 const focusWithin=(element,block='nearest')=>{
  element?.focus({preventScroll:true});
  element?.scrollIntoView({block});
 };
 const focusVisitorStep=selector=>{
  requestAnimationFrame(()=>focusWithin(projectRef.current?.querySelector(selector),'start'));
 };
 const closePreview=()=>{
  setPreview(null);
  if(stage===3&&visitOpened)focusVisitorStep('[data-visit-form-heading]');
  if(stage===4&&preview?.retest)focusVisitorStep('[data-activity5-answer]');
 };
 const browseActivity=next=>{startActivity();if(next!==stage)setReview(next);};
 const moveActivity=next=>{browseActivity(next);focusWithin(lessonRef.current);};
 const focusStudio=()=>{
  startActivity();
  requestAnimationFrame(()=>{
   const project=projectRef.current,editor=studioRef.current;
   if(!project||!editor)return;
   editor.focus({preventScroll:true});
   if(getComputedStyle(project).overflowY==='auto'&&project.scrollHeight>project.clientHeight)project.scrollTop=0;
   else editor.querySelector('.asean-studio-title')?.scrollIntoView({block:'start'});
  });
 };
 const stageRecord=records.rows.find(item=>item.stage_index===stage)?.value;
 const frames=ASEAN_FRAMES.map(frame=>({
  ...frame,
  needsPhoto:missing.includes(frame.label+' photo'),
  ready:!missing.some(item=>item.startsWith(frame.label+' ')),
 }));
 const missingPhotos=frames.filter(frame=>frame.needsPhoto);
 const readyFrames=frames.filter(frame=>frame.ready).length;
 const buildPhotoTask=missingPhotos.length
  ?T(language,'Bổ sung ảnh cho các khung sau','Add photos for these frames')+': '+missingPhotos.map(frame=>frame.label).join(', ')+'.'
  :T(language,'Ba ảnh của nhóm đã có trong triển lãm.','Your three photos are already in place.');
 const draftStatus=dirty?T(language,'Có thay đổi chưa lưu','Unsaved changes'):
  missing.length?Number(version)>0
   ?T(language,'Đã lưu bản nháp · Còn thiếu mục','Draft saved · Some items are still missing')
   :T(language,'Còn thiếu nội dung hoặc nguồn','Some build requirements are still missing'):
  Number(version)>0?T(language,'Đã lưu bản nháp · Sẵn sàng cho lượt tham quan thử','Draft saved · Ready for the visitor test'):
  T(language,'Đủ nội dung · Hãy lưu bản nháp','All requirements met · Save your draft');
 const projectStatus=stage===1
  ?stageRecord?T(language,'Đã nộp kế hoạch','Plan submitted'):T(language,'Chưa nộp kế hoạch','Plan not submitted')
  :stage===3?stageRecord?T(language,'Đã nộp góp ý','Feedback submitted')
   :readOnly?T(language,'Chỉ xem','View only')
   :!liveOpen?T(language,'Chờ giáo viên mở','Waiting for teacher')
   :visitOpened?T(language,'Điền phiếu góp ý','Complete the feedback'):T(language,'Mở phòng được giao','Open the assigned exhibit')
  :readOnly?T(language,'Chỉ xem','View only'):
   submitted?T(language,'Đã nộp','Submitted'):
   stage===4?captured?T(language,'Đã lưu bản V2','Our V2 saved'):T(language,'Cần lưu bản V2','Save our V2'):
   stage===2?readyFrames+' / '+ASEAN_FRAMES.length+' '+T(language,'khung đã đủ','frames ready'):
   photoCount+' / '+ASEAN_FRAMES.length+' '+T(language,'ảnh','photos');
 const edit=change=>{setStudio(value=>typeof change==='function'?change(value):change);setDirty(true);setNotice('');};
 const field=(key,value)=>edit(draft=>({...draft,learning:{...draft.learning,[key]:value}}));
 const save=async()=>{
  const out=await guestRequest('save','PUT',{draft:document,expectedVersion:version},session.csrf);
  setVersion(out.version);setDirty(false);
  if(stage!==2)setNotice('Exhibit draft saved.');
  return out.version;
 };
 const action=async operation=>{
  setBusy(true);setError('');
  try{
   if(operation==='save')await save();
   if(operation==='reload'){
    const result=await guestRequest('draft');
    setStudio(normalizeStudio(result.draft));setVersion(result.version);setDirty(false);
   }
   if(operation==='preview'){
    const result=await artGuest('list');
    setAssets(result.assets||[]);setPreview({own:true});
   }
   if(operation==='reference-v1'){
    const {gallery}=await liveGuest('asean-reference-v1');
    setPreview({gallery:reviewMuseum({snapshot:gallery.draft},gallery.artworks),reference:true});
   }
   if(operation==='capture'){
    const next=dirty?await save():version;
    await liveGuest('asean-capture','POST',{version:next,...revision},session.csrf);
    await refreshRecords();setNotice('V2 opened for the fresh visitor group.');
   }
   if(operation==='submit'){
    await guestRequest('submit','POST',{expectedVersion:version},session.csrf);
    setSubmitted(true);setNotice('Exhibit submitted for review.');
   }
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 const captionEditor=frame=><label className="bml-full-field asean-caption-field" key={frame.key}>{frame.label} caption
  <small>{frame.question} · {aseanWordCount(studio.learning[frame.key])} / 20–30 words</small>
  <textarea rows={3} maxLength={600} disabled={!editable||busy} value={studio.learning[frame.key]} onChange={e=>field(frame.key,e.target.value)}/>
 </label>;
 return <MuseumStudentWorkshop language={language} onLanguageChange={onLanguageChange} onLogout={onLogout}
  groupLabel={[language==='en'?englishSystemGroupLabel(session.groupLabel):session.groupLabel,session.assignment.class_scope].filter(Boolean).join(' · ')}
  bannerExpanded={bannerExpanded} onBannerChange={setBannerExpanded} lessonTemplate={session.assignment.lesson_template}
  title={ASEAN_TITLE} testId="asean-student-lesson"
  navigation={<MuseumStudentActivityGroups group={activityGroup} activity={stage} language={language}
   groups={ACTIVITY_GROUPS} ends={ACTIVITY_GROUP_ENDS} activities={language==='en'?ASEAN_STAGES:ASEAN_ACTIVITIES_VI}
   onGroup={group=>browseActivity(group===activityGroup?stage:(ACTIVITY_GROUP_ENDS[group-1]??0))} onActivity={browseActivity}/>}
  overlays={preview&&<div className="bml-student-detail-overlay bml-museum-preview-overlay" role="dialog" aria-modal="true"
    aria-label={preview.reference?'Reconstructed V1 reference':preview.own?'Preview group museum':'Visit assigned exhibit'}>
   <div className="bml-student-detail-window bml-museum-preview-window">
    {preview.reference&&<p className="asean-v1-reference-label">V1 · Reconstructed reference</p>}
    <GalleryRenderBoundary language="en" onFallback={closePreview}>
     <MuseumScene embedded cinema initial3D language="en" gallery={preview.own?localMuseumFromDraft(document,assets):preview.gallery}
      onClose={closePreview}/>
    </GalleryRenderBoundary>
   </div>
  </div>}>
  <section className="bml-student-primary bml-student-lesson-panel" aria-labelledby="bml-student-lesson-title">
   <header className="bml-student-panel-head">
    <h2 id="bml-student-lesson-title">{T(language,'Bài học','Lesson')}</h2>
    <div className="bml-student-lesson-tools">
     <button type="button" className="bml-outline" aria-pressed={review===null} onClick={()=>{startActivity();setReview(null);focusWithin(lessonRef.current);}}>
      {T(language,'Theo giáo viên','Follow teacher')}
     </button>
    </div>
   </header>
   <div className="bml-student-pane bml-student-lesson-scroll" data-testid="student-lesson-pane" role="region"
    aria-label={T(language,'Nội dung bài học','Lesson content')} lang="en" tabIndex={0} ref={lessonRef}>
    <div className="bml-live-student asean-student-brief">
     <section className="asean-student-activity" aria-labelledby="asean-student-activity-title" data-testid={'asean-student-slide-'+(stage+1)}>
      <div className="bml-live-student-question">
       <p className="bml-question-eyebrow">Period {current.period} · Activity {stage+1} / {ASEAN_STAGES.length} · {current.minutes} min</p>
       <h2 id="asean-student-activity-title">{stage===0?'1. Write about '+aseanWritingCard(session.groupLabel).title:design.studentTitle}</h2>
       <p lang={[2,3,4].includes(stage)?language:undefined}>{stage===0
        ?'Write one thing a visitor can do and one piece of advice. Submit both sentences, then discuss the class example and answer its three questions in Step 2.'
        :stage===5
        ?reportTask+' Submit your final exhibit in the project panel. Use the transfer card below to write two sentences.'
        :stage===4?revisionTask:stage===2?buildPhotoTask:stage===3
        ?T(language,'Thử xem một khách mới có thể tự tìm đủ ba câu trả lời trong phòng của nhóm khác hay không.',design.studentTask)
        :design.studentTask}</p>
      </div>
      {stage===2&&<div className="asean-build-instructions" lang={language}>
       {editable&&<ol>
        <li>{T(language,'Chỉnh sửa triển lãm. Rà ba chú thích tiếng Anh (20–30 từ mỗi khung), nguồn ảnh và nguồn dữ kiện.',design.studentTask)}</li>
        <li>{T(language,'Xem thử phòng 3D và lưu bản nháp nếu có thay đổi.','Preview your exhibit in 3D and save any changes.')}</li>
       </ol>}
       <button type="button" className="bml-primary" onClick={focusStudio}><Box size={18}/>
        {editable?T(language,'Chỉnh sửa triển lãm','Edit your exhibit'):T(language,'Xem lại triển lãm','Review your exhibit')}
       </button>
      </div>}
      {stage===3&&<div className="asean-visit-instructions" lang={language}>
       <ol>
        <li>{T(language,'Mở phòng được giao và đọc ba khung. Ghi nhớ khung mở đầu tiên.','Open the assigned room, inspect all three frames and remember which one you opened first.')}</li>
        <li>{T(language,'Đóng phòng, ghi điều tìm được và chấm từng câu theo bằng chứng.','Close the viewer, record what you found and score each answer using the evidence.')}</li>
        <li>{T(language,'Viết một đề xuất cụ thể bằng tiếng Anh và nộp phiếu.','Write one specific suggestion in English and submit the feedback.')}</li>
       </ol>
       {liveOpen&&!stageRecord&&<button type="button" className="bml-outline" onClick={()=>{
        startActivity();focusVisitorStep(visitOpened?'[data-visit-form-heading]':'[data-visit-start]');
       }}>
        {visitOpened?T(language,'Tới phiếu góp ý','Go to the feedback form'):T(language,'Tới phần tham quan','Go to the visitor task')}<ArrowRight size={18}/>
       </button>}
      </div>}
      {stage===4&&<div className="asean-visit-instructions" lang={language}>
       <ol>
        <li>{captured?T(language,'Phòng nhóm em: so sánh khung đã sửa giữa V1 và V2, rồi xem kết quả thử lại.',
         'Your exhibit: compare the changed frame in V1 and V2, then check the retest result.')
         :T(language,'Phòng nhóm em: sửa một khung, giải thích lý do và lưu bản V2.',
         'Your exhibit: revise one frame, explain the change and save V2.')}</li>
        <li>{T(language,'Phòng được giao: mở V2 và trả lời lại một câu hỏi kèm khung làm bằng chứng.',
         'Assigned exhibit: open V2 and answer one question again, citing the frame you used.')}</li>
       </ol>
       <div className="asean-retest-links">
        <button type="button" className="bml-outline" onClick={()=>{startActivity();focusVisitorStep('[data-activity5-own]');}}>
         {T(language,'Phòng nhóm em','Our exhibit')}<ArrowRight size={18}/>
        </button>
        <button type="button" className="bml-outline" onClick={()=>{startActivity();focusVisitorStep('[data-activity5-visitor]');}}>
         {T(language,'Phòng được giao','Assigned exhibit')}<ArrowRight size={18}/>
        </button>
       </div>
      </div>}
      {isWritingActivity&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
       record={stageRecord} refreshLive={refreshLive} refreshRecords={refreshRecords}
       transferNeedsResubmission={stage===5&&records.transferNeedsResubmission}/>}
      {stage!==0&&<AseanActivityArt activity={design.id} language={stage===3||stage===4?language:undefined}
       visitorResult={stage===3?visitorResult(stageRecord):null}
       revisionCaptured={Boolean(captured)} revisionHasFeedback={Boolean(records.feedback)}/>}
      {[1,2,4].includes(stage)&&destination&&<div className="asean-student-sources">
       <a href={destination.source} target="_blank" rel="noreferrer">UNESCO destination source</a>
       <a href={'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search='+encodeURIComponent(destination.name)} target="_blank" rel="noreferrer">Find candidate photographs</a>
      </div>}
      {stage===1&&<p>Complete all three steps in the project panel, then select Submit exhibit plan.</p>}
     </section>
     {live?.stageIndex===stage&&live.media?.voiceEnabled&&<MuseumVoiceover stage={current} language="en" compact/>}
     {live?.stageIndex===stage&&Boolean(live.media?.videos?.length||live.media?.query)&&<MuseumVideoLab mode="student" language="en" stage={current} stageIndex={stage} media={live.media} readOnly={readOnly}/>}
     {!live&&!readOnly&&<p role="status">Waiting for Teacher Live to start.</p>}
    </div>
   </div>
   <footer className="bml-workshop-lesson-nav">
    <button type="button" className="bml-outline" disabled={stage===0} onClick={()=>moveActivity(stage-1)}>
     <ArrowLeft size={18}/>{T(language,'Hoạt động trước','Previous activity')}
    </button>
    {!activityStarted?<button type="button" className="bml-primary" onClick={()=>{startActivity();focusWithin(lessonRef.current);}}>
     {readOnly?T(language,'Xem lại hoạt động','Review activity'):T(language,'Bắt đầu hoạt động','Start activity')}<ArrowRight size={18}/>
    </button>:<button type="button" className="bml-primary" disabled={stage===ASEAN_STAGES.length-1} onClick={()=>moveActivity(stage+1)}>
     {T(language,'Hoạt động tiếp theo','Next activity')}<ArrowRight size={18}/>
    </button>}
   </footer>
  </section>
  <section className="bml-student-primary bml-student-project-panel" aria-labelledby="bml-student-project-title">
   <header className="bml-student-panel-head bml-student-project-head">
    <h2 id="bml-student-project-title">{stage===0?T(language,'2. Thảo luận mẫu chung','2. Discuss the class example'):
     stage===3?T(language,'Phiếu góp ý tham quan','Visitor Feedback'):
     stage===4?T(language,'Chỉnh sửa và thử lại','Revision & Retest'):T(language,'Sản phẩm nhóm','Group Project')}</h2>
    {stage!==0&&<div className="bml-student-project-status" role="status"><strong>{projectStatus}</strong></div>}
   </header>
   <div className="bml-student-pane bml-student-project-pane" data-testid="student-project-pane">
    <div className="bml-student-stage"><div className="bml-student-task bml-surface">
     <div className="bml-student-task-scroll asean-student-project" data-testid="student-task-scroll" role="region"
      aria-label={stage===0?T(language,'Mẫu chung của lớp','Class example content'):T(language,'Nội dung bài làm có thể cuộn','Scrollable project step content')} lang="en" ref={projectRef} tabIndex={0}>
      {readOnly&&<p className="bml-workshop-readonly" role="status"><LockKeyhole size={16}/>Lesson complete · View only</p>}
      {stage===0?<>
       {(stageRecord||live?.stageIndex>0||readOnly)?<>
        <ClassVisitorModel language={language}/>
        <AseanHueQuiz key={live?.id||'review'} language={language} sessionId={live?.id} csrf={session.csrf}
         open={Boolean(liveOpen&&stageRecord)} readOnly={readOnly} record={records.hueQuiz}/>
        <AseanActivityArt activity={design.id}/>
       </>:
        <p className="asean-response-closed" role="status" lang={language}>{T(language,'Nộp hai câu ở Bước 1 để mở mẫu chung.','Submit your two sentences in Step 1 to open the class example.')}</p>}
       <p className="asean-project-topic"><span>Your 3D project topic</span><strong>{destination?.name||session.assignment.title}</strong></p>
      </>:stage!==3&&!(stage===4&&captured)&&<>
       {stage===5&&<p className="asean-exhibit-destination-label">Your 3D project topic</p>}
       <h3 className="bml-workshop-draft-title">{destination?.name||session.assignment.title}</h3>
       {destination&&<p className="asean-student-country">{destination.country}</p>}
      </>}
      {stage>=4&&captured&&<section className="asean-own-revision" data-testid="asean-own-revision">
       <h3 data-activity5-own={stage===4?true:undefined} tabIndex={stage===4?-1:undefined} lang={language}>
        {stage===4?T(language,'1. Phòng V2 của nhóm em','1. Our V2 exhibit'):T(language,'Phòng V2 của nhóm em','Our V2 exhibit')}
       </h3>
       {stage===4&&<p><strong>{destination?.name||session.assignment.title}</strong></p>}
       {captured.reason&&<p>{captured.reason}</p>}
       <div className="asean-retest-results" lang={language}>
        {records.staffRetest&&<p><strong>{T(language,'Kiểm tra tham chiếu của giáo viên','Teacher reference check')}</strong>
         {' · '}{records.staffRetest.score}/1<br/><span lang="en">{records.staffRetest.answer}</span>
        </p>}
        {records.retest?<p role="status"><strong>{T(language,'Kết quả thử lại của '+retestVisitor,'Retest result from '+retestVisitor)}</strong>
         {' · '}{records.retest.score}/1<br/><span lang="en">{records.retest.answer}</span>
        </p>:<p role="status">{waitingForRetest}</p>}
       </div>
       {baseline?.reconstructed&&<button type="button" className="bml-outline" disabled={busy} onClick={()=>action('reference-v1')}>
        {T(language,'Xem bản tham chiếu V1','View reconstructed V1')}
       </button>}
       {stage===4&&records.revisionDetails?.length>0&&<details className="asean-revision-comparison" open>
        <summary>{T(language,'So sánh V1 và V2','Compare V1 and V2')}</summary>
        {records.revisionDetails.map(({frame,v1,v2,photoChanged})=><div key={frame}>
         <h5>{frame}</h5>
         {v1!==v2&&<>
          <p><strong>{baseline?.reconstructed?'V1 reference':'V1'}</strong> · {v1||'No caption saved'}</p>
          <p><strong>V2</strong> · {v2||'No caption saved'}</p>
         </>}
         {photoChanged&&<p>The photo in this frame changed in V2.</p>}
        </div>)}
       </details>}
       {baseline?.complete===false&&<p>V1 was saved before the exhibit was complete. Record what the visitor finds in V2.</p>}
      </section>}
      {workshopVisible&&!(stage===4&&captured)&&<section className="asean-student-studio" ref={studioRef} tabIndex={-1} data-testid="asean-3d-studio">
       <h4 className="asean-studio-title" data-activity5-own={stage===4?true:undefined} tabIndex={stage===4?-1:undefined}>
        {stage===2?T(language,'Ba khung triển lãm','Your three frames'):
         stage===4?T(language,'1. Sửa phòng của nhóm em','1. Revise our exhibit'):'Submit your 3D exhibit'}
       </h4>
       {stage===2&&<section className="asean-build-checklist" aria-label={T(language,'Tiến độ triển lãm','Exhibit progress')} lang={language}>
        <ul>{frames.map(({key,label,ready,needsPhoto})=><li key={key} data-ready={ready}>
         <button type="button" onClick={()=>focusWithin(studioRef.current?.querySelector('[data-artwork-frame="'+key+'"]'),'start')}>
          <strong>{label}</strong>
          <span>{needsPhoto?T(language,'Thiếu ảnh','Photo needed'):ready?T(language,'Đã đủ','Ready'):T(language,'Cần bổ sung','Details needed')}</span>
         </button>
        </li>)}</ul>
        {missing.includes('Factual source')&&<p className="asean-build-source-needed">{T(language,'Cần bổ sung nguồn dữ kiện.','Add the source for your fact.')}</p>}
        {missing.length>0&&<details><summary>What’s still needed ({missing.length})</summary>
         <ul className="asean-build-missing">{missing.map(item=><li key={item}>{item}</li>)}</ul>
        </details>}
       </section>}
       {photoCount===0&&<p>Upload a photo to preview your room in 3D.</p>}
       {!editable&&stage===2&&<p role="status">{readOnly||submitted?'This exhibit is view only.':'Your teacher needs to open Activity 3 before your group can edit.'}</p>}
       {stage===4&&records.feedback&&<p><strong>Feedback received</strong> {records.feedback.comment}</p>}
       {stage!==5&&<MuseumArtworkStudio studio={studio} update={edit} csrf={session.csrf} language="en" disabled={!editable||busy}
        uploadEnabled={session.uploadEnabled||readOnly} onAssets={setAssets} onBusy={setImageBusy} lessonTemplate={session.assignment.lesson_template}
        compactCredits={stage===2}
        frameEditor={key=>captionEditor(ASEAN_FRAMES.find(frame=>frame.key===key))}/>}
       {stage!==5&&<label className="bml-full-field">Factual source <input value={studio.learning.source} maxLength={600} disabled={!editable||busy} onChange={e=>field('source',e.target.value)}/></label>}
       {stage!==5&&<div className="asean-studio-save">
        <div className="bml-toolbar">
         {stage!==2&&<button type="button" className="bml-primary" disabled={!editable||busy||imageBusy||!dirty} onClick={()=>action('save')}><Save size={18}/>Save draft</button>}
         <button className="bml-outline" disabled={busy||imageBusy||!editable} onClick={()=>{if(!dirty||window.confirm('Discard unsaved caption and credit changes?'))action('reload');}}>Reload saved exhibit</button>
        </div>
        {stage!==2&&editable&&missing.length>0&&<details><summary>What’s still needed ({missing.length})</summary><ul>{missing.map(item=><li key={item}>{item}</li>)}</ul></details>}
       </div>}
       {stage===4&&!captured&&editable&&<div className="bml-field-grid">
        <label>Question to retest <select value={revision.question} onChange={e=>setRevision({...revision,question:Number(e.target.value)})}>
         {ASEAN_FRAMES.map((f,i)=><option key={f.key} value={i+1}>{f.question}</option>)}</select></label>
        <label>Why did your group make this change? <input maxLength={300} value={revision.reason} onChange={e=>setRevision({...revision,reason:e.target.value})}/></label>
        <button className="bml-primary" disabled={busy||imageBusy||!revision.reason.trim()} onClick={()=>action('capture')}>Open saved V2 for retest</button>
       </div>}
       {stage===5&&<button className="bml-primary" disabled={!liveOpen||dirty||busy||submitted||!captured||Boolean(missing.length)}
        onClick={()=>action('submit')}>{submitted?'Submitted':'Submit final 3D exhibit'}</button>}
       {stage===5&&liveOpen&&!captured&&!submitted&&<p>Save the revised V2 in Activity 5 before submitting.</p>}
      </section>}
      {stage===4&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
       record={stageRecord} refreshLive={refreshLive} refreshRecords={refreshRecords}
       onVisit={gallery=>{startActivity();setPreview({gallery,retest:true});}}
       retestTask={records.retestTask} language={language}/>}
      {(stage===1||stage===3)&&<GroupResponse key={stage===3?live?.id??stage:stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
       record={stageRecord} refreshLive={refreshLive} refreshRecords={refreshRecords}
       onVisit={(gallery,reference)=>{
        setVisitOpened(Boolean(gallery));
        if(gallery){startActivity();setPreview({gallery,reference});}
       }}
       formId={projectFormId} onSubmittingChange={setProjectSubmitting} language={language}/>}
      {stage===3&&records.feedback&&<section className="asean-own-revision">
       <h4>{T(language,'Góp ý nhận được cho triển lãm của nhóm mình','Feedback received on your own exhibit')}</h4>
       <p>{records.feedback.comment}</p>
       {liveOpen&&<p>{T(language,'Trao đổi bằng tiếng Anh với nhóm khách.','Reply to the visitors or ask a follow-up question in English.')}</p>}
      </section>}
      {stage!==2&&error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
      {stage!==2&&notice&&<p role="status">{notice}</p>}
     </div>
     {(stage===3?liveOpen&&visitOpened&&!stageRecord:stage!==1||!stageRecord||photoCount>0)&&<footer className="bml-student-bottom">
      {(stage===1&&!stageRecord||stage===3)&&<button type="submit" form={projectFormId} className="bml-primary asean-workshop-action" disabled={!liveOpen||projectSubmitting}>
       {projectSubmitting?T(language,'Đang nộp…','Submitting…'):
        stage===3?T(language,'Nộp phiếu góp ý','Submit visitor feedback'):T(language,'Nộp kế hoạch triển lãm','Submit exhibit plan')}
      </button>}
      {stage===2&&<>
       <p className="asean-build-status" role="status"><strong>{draftStatus}</strong></p>
       {error&&<p className="bml-banner bml-danger-banner asean-build-status" role="alert">{error}</p>}
       <button type="button" className="bml-primary asean-workshop-action"
        disabled={!editable||busy||imageBusy||(!dirty&&(missing.length>0||Number(version)>0))} onClick={()=>action('save')}>
        <Save size={18}/>{T(language,'Lưu bản nháp','Save draft')}
       </button>
      </>}
      {stage!==3&&(stage!==1||photoCount>0)&&<button type="button" className={[1,2,4].includes(stage)?'bml-outline asean-workshop-action':'bml-primary'}
       disabled={busy||imageBusy||!photoCount} onClick={()=>action('preview')}>
       <Box size={18}/>{stage===4?T(language,'Xem thử phòng nhóm em','Preview our exhibit'):
        stage===0||stage===2?T(language,'Xem thử triển lãm','Preview your exhibit'):T(language,'Xem trước 2D/3D','Preview 2D/3D')}
      </button>}
      {stage===2&&<p className="asean-build-status asean-build-next">
       {T(language,'Khi giáo viên mở Hoạt động 4, bản nháp đã lưu mới nhất sẽ là V1 cho lượt tham quan thử.','When your teacher opens Activity 4, the latest saved draft becomes V1 for the visitor test.')}
      </p>}
     </footer>}
    </div></div>
   </div>
  </section>
 </MuseumStudentWorkshop>;
}
