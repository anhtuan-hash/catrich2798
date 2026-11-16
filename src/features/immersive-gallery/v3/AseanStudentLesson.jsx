import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,LockKeyhole,Save} from 'lucide-react';
import AseanActivityArt,{AseanFrameIcon} from './AseanActivityArt.jsx';
import {ASEAN_ACTIVITY_DESIGN} from './aseanActivityDesign.js';
import {ASEAN_FRAMES,ASEAN_STAGES,ASEAN_TITLE,aseanDestination,aseanExhibitMissing,aseanWritingCard,aseanWordCount} from './aseanLesson.js';
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
 if(stage===1)return {codes:['','',''],comparisonFrame:1,alternative:'',fact:'',source:'',reason:''};
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

function ResponseFields({stage,fields,update,groupLabel,question,recorded}){
 const text=(key,label,maxLength=220)=><label className="bml-full-field">{label}
  <textarea required rows={2} maxLength={maxLength} value={fields[key]||''} onChange={event=>update(key,event.target.value)}/>
 </label>;
 const frameOptions=<>{ASEAN_FRAMES.map((frame,index)=><option key={frame.key} value={index+1}>{index+1} · {frame.label}</option>)}</>;
 const frameSelect=(value,onChange)=><select value={value??''} onChange={event=>onChange(Number(event.currentTarget.value)||null)}>
  <option value="">No matching frame</option>{frameOptions}
 </select>;
 const scoreSelect=(value,onChange)=><select value={value} onChange={event=>onChange(Number(event.currentTarget.value))}>
  <option value={0}>0 · Missing or unclear</option><option value={1}>1 · Found with evidence</option>
 </select>;
 if(stage===0||stage===5){
  const card=aseanWritingCard(groupLabel,stage===5);
  return <fieldset className="asean-response-sheet" disabled={recorded}><legend>{card.title}</legend>
   <p className="asean-response-context">{card.country}</p>
   <div className="asean-response-grid">
    <div><p><strong>Visitors can …</strong><br/>{card.experience}</p>{text('experience','One thing a visitor can do')}</div>
    <div><p><strong>Visitors should …</strong><br/>{card.advice}</p>{text('advice','One piece of advice')}</div>
   </div>
  </fieldset>;
 }
 if(stage===1)return <fieldset className="asean-response-sheet" disabled={recorded}><legend>Exhibit plan</legend>
  <div className="asean-response-grid asean-response-grid--three">
   {ASEAN_FRAMES.map((f,i)=><label className="bml-full-field asean-photo-plan" key={f.key}>
    <AseanFrameIcon index={i}/><span>{f.label} photo code</span><small>{f.question}</small>
    <input required maxLength={35} value={fields.codes?.[i]||''} onChange={event=>update('codes',fields.codes.map((code,j)=>i===j?event.target.value:code))}/>
   </label>)}
  </div>
  <div className="asean-response-grid">
   <section><h3>Compare two images</h3>
    <label className="bml-full-field">Frame your group compared {frameSelect(fields.comparisonFrame,v=>update('comparisonFrame',v))}</label>
    {text('alternative','Code for the other photo you considered',35)}
    {text('reason','We chose this photo because visitors can see …')}
   </section>
   <section><h3>Check one fact</h3>
    {text('fact','A fact in your own words')}{text('source','Source for the fact',350)}
   </section>
  </div>
 </fieldset>;
 if(stage===3)return <fieldset className="asean-response-sheet" disabled={recorded}><legend>Visitor test /3</legend>
  <label className="bml-full-field">First frame opened <select required value={fields.first??''} onChange={event=>update('first',Number(event.target.value))}><option value="">Select a frame</option>{frameOptions}</select></label>
  <div className="asean-response-grid asean-response-grid--three">
  {ASEAN_FRAMES.map(({key,question},i)=>{
   const answer=fields.answers[i];
   const change=(name,value)=>update('answers',fields.answers.map((item,index)=>index===i?{...item,[name]:value}:item));
   return <fieldset key={key}><legend>{question}</legend>
    <AseanFrameIcon index={i}/>
    <label className="bml-full-field">Answer<textarea required rows={2} maxLength={130} value={answer.text} onChange={e=>change('text',e.target.value)}/></label>
    <label className="bml-full-field">Evidence frame {frameSelect(answer.frame,v=>change('frame',v))}</label>
    <label className="bml-full-field">Score {scoreSelect(answer.score,v=>change('score',v))}</label>
   </fieldset>;
  })}
  </div>
  {text('comment','One change that would make a frame clearer')}
 </fieldset>;
 return <fieldset className="asean-response-sheet" disabled={recorded}><legend>{ASEAN_FRAMES[(question||fields.question)-1]?.question||'Fresh visitor test'}</legend>
  {text('answer','Your group’s answer')}
  <div className="asean-response-grid">
   <label className="bml-full-field">Evidence frame {frameSelect(fields.frame,v=>update('frame',v))}</label>
   <label className="bml-full-field">Score {scoreSelect(fields.score,v=>update('score',v))}</label>
  </div>
 </fieldset>;
}

function GroupResponse({session,stage,open,record,live,refreshRecords,refreshLive,onVisit,retestTask}){
 const [fields,setFields]=useState(()=>record||initialFields(stage));
 const [visit,setVisit]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submitted=Boolean(record);
 const visitStage=stage===3||stage===4;
 const loadVisit=async()=>{
  setError('');setBusy(true);
  try{
   const result=await liveGuest('asean-visit');
   setVisit(result);
   if(result.gallery)onVisit(reviewMuseum({snapshot:result.gallery.draft},result.gallery.artworks));
   else setError(stage===3?'The saved V1 is incomplete. Ask your teacher about this visit.':englishSystemGroupLabel(result.target)+' has not made V2 available yet.');
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{
   await liveGuest('asean-submit','POST',{
    sessionId:live.id,stageIndex:stage,value:stage===4?{...fields,question:visit.question}:fields,
    ...(visitStage?{checkpointId:visit.gallery.checkpointId}:{}),
   },session.csrf);
   await Promise.all([refreshRecords(),refreshLive()]);
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 if(!open&&!submitted)return <p className="asean-response-closed" role="status">{session.readOnly?'No group response was recorded for this activity.':'Your teacher has not opened this activity for responses.'}</p>;
 return <section className="bml-surface asean-group-response">
  {visitStage&&<h3>{stage===3?'Your assigned V1 exhibit':'Test the assigned V2 exhibit'}</h3>}
  {stage===4&&retestTask&&<>
   <p><strong>{englishSystemGroupLabel(retestTask.target)} · {aseanDestination(retestTask.target)?.name}</strong></p>
   {!visit?.gallery&&!submitted&&<p>{retestTask.ready?ASEAN_FRAMES[retestTask.question-1]?.question:'Waiting for this group’s V2.'}</p>}
  </>}
  {stage===4&&retestTask?.staffChecked&&!submitted&&<p role="status">A staff check is on file. Submit your group’s own observations here.</p>}
  {visitStage&&open&&!submitted&&<button type="button" className="bml-outline" onClick={loadVisit} disabled={busy||retestTask?.ready===false}>
   Open assigned {stage===3?'V1 exhibit':'V2 exhibit'}
  </button>}
  {visit?.gallery&&<p role="status">{retestTask?null:englishSystemGroupLabel(visit.target)+' · '}Opened saved version {visit.gallery.version}.</p>}
  {stage===4&&open&&!submitted&&!visit?.gallery&&retestTask?.ready&&<p>Open the exhibit, inspect the frames, then close the viewer to answer and cite the frame you used.</p>}
  {(!visitStage||submitted||visit?.gallery)&&<form onSubmit={submit}>
   <ResponseFields stage={stage} fields={record||fields} update={(key,value)=>setFields(previous=>({...previous,[key]:value}))}
    groupLabel={session.groupLabel} question={visit?.question} recorded={submitted||!open}/>
   {submitted?<p role="status">Group response saved.</p>:
    <button className="bml-primary" type="submit" disabled={busy||!open}>Submit group response</button>}
  </form>}
  {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
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
 const current=ASEAN_STAGES[stage];
 const activityGroup=ACTIVITY_GROUP_ENDS.findIndex(end=>stage<end);
 const design=ASEAN_ACTIVITY_DESIGN[stage];
 const liveOpen=!readOnly&&live?.status==='active'&&live.stageOpen&&live.stageIndex===stage;
 const captured=records.checkpoints.find(item=>item.kind==='after');
 const baseline=records.checkpoints.find(item=>item.kind==='before');
 const editable=liveOpen&&(stage===2||(stage===4&&!captured))&&!submitted;
 const document=documentFromStudio({...studio,title:destination?.name||'',summary:destination?.country||'',theme:'culture'},session.assignment);
 const missing=aseanExhibitMissing(document);
 const photoCount=Object.values(studio.artworks).filter(Boolean).length;
 const workshopVisible=[2,4,5].includes(stage);
 useEffect(()=>{
  setPreview(null);
  if(lessonRef.current)lessonRef.current.scrollTop=0;
  if(projectRef.current)projectRef.current.scrollTop=0;
 },[stage]);
 const startActivity=()=>{setActivityStarted(true);setBannerExpanded(false);};
 const focusWithin=element=>{
  element?.focus({preventScroll:true});
  element?.scrollIntoView({block:'nearest'});
 };
 const browseActivity=next=>{startActivity();if(next!==stage)setReview(next);};
 const moveActivity=next=>{browseActivity(next);focusWithin(lessonRef.current);};
 const focusStudio=()=>{
  startActivity();
  studioRef.current?.focus({preventScroll:true});
  if(!projectRef.current)return;
  if(getComputedStyle(projectRef.current).overflowY==='auto')projectRef.current.scrollTop=0;
  else studioRef.current?.scrollIntoView({block:'nearest'});
 };
 const stageRecord=records.rows.find(item=>item.stage_index===stage)?.value;
 const projectStatus=readOnly?T(language,'Chỉ xem','View only'):
  submitted?T(language,'Đã nộp','Submitted'):photoCount+' / '+ASEAN_FRAMES.length+' '+T(language,'ảnh','photos');
 const edit=change=>{setStudio(value=>typeof change==='function'?change(value):change);setDirty(true);setNotice('');};
 const field=(key,value)=>edit(draft=>({...draft,learning:{...draft.learning,[key]:value}}));
 const save=async()=>{
  const out=await guestRequest('save','PUT',{draft:document,expectedVersion:version},session.csrf);
  setVersion(out.version);setDirty(false);setNotice(stage===2&&!missing.length?'V1 saved. Your group’s 3D exhibit is ready for the visitor test.':'Exhibit draft saved.');return out.version;
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
    <GalleryRenderBoundary language="en" onFallback={()=>setPreview(null)}>
     <MuseumScene embedded cinema initial3D language="en" gallery={preview.own?localMuseumFromDraft(document,assets):preview.gallery}
      onClose={()=>setPreview(null)}/>
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
       <h2 id="asean-student-activity-title">{design.studentTitle}</h2>
       <p>{stage===4&&captured?
        'Visit the assigned room and record what you find. Then check the revision and visitor result for your own exhibit.':design.studentTask}</p>
      </div>
      <AseanActivityArt activity={design.id}/>
      {[1,2,4].includes(stage)&&destination&&<div className="asean-student-sources">
       <a href={destination.source} target="_blank" rel="noreferrer">UNESCO destination source</a>
       <a href={'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search='+encodeURIComponent(destination.name)} target="_blank" rel="noreferrer">Find candidate photographs</a>
      </div>}
      {stage===2&&<button type="button" className="bml-primary" onClick={focusStudio}><Box size={18}/> Open the 3D Studio</button>}
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
    <h2 id="bml-student-project-title">{T(language,'Sản phẩm nhóm','Group Project')}</h2>
    <div className="bml-student-project-status" role="status"><strong>{projectStatus}</strong></div>
   </header>
   <div className="bml-student-pane bml-student-project-pane" data-testid="student-project-pane">
    <div className="bml-student-stage"><div className="bml-student-task bml-surface">
     <div className="bml-student-task-scroll asean-student-project" data-testid="student-task-scroll" role="region"
      aria-label={T(language,'Nội dung bài làm có thể cuộn','Scrollable project step content')} lang="en" ref={projectRef} tabIndex={0}>
      {readOnly&&<p className="bml-workshop-readonly" role="status"><LockKeyhole size={16}/>Lesson complete · View only</p>}
      <h3 className="bml-workshop-draft-title">{destination?.name||session.assignment.title}</h3>
      {destination&&<p className="asean-student-country">{destination.country}</p>}
      {stage===4&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
       record={stageRecord} refreshLive={refreshLive} refreshRecords={refreshRecords} onVisit={gallery=>setPreview({gallery})}
       retestTask={records.retestTask}/>}
      {stage>=4&&captured&&<section className="asean-own-revision" data-testid="asean-own-revision">
       <h4>Our V2 exhibit</h4>
       {captured.reason&&<p>{captured.reason}</p>}
       {baseline?.reconstructed&&<button type="button" className="bml-outline" disabled={busy} onClick={()=>action('reference-v1')}>View reconstructed V1</button>}
       {baseline?.complete===false&&<p>V1 was saved before the exhibit was complete. Record what the visitor finds in V2.</p>}
       {records.retest?<p><strong>Fresh visitor result</strong> · {records.retest.score}/1 · {records.retest.answer}</p>:
        <p role="status">Waiting for the assigned visitor group’s result.</p>}
       {stage===5&&records.staffRetest&&<p><strong>Staff-prepared check</strong> · {records.staffRetest.score}/1 · {records.staffRetest.answer}</p>}
      </section>}
      {workshopVisible&&!(stage===4&&captured)&&<section className="asean-student-studio" ref={studioRef} tabIndex={-1} data-testid="asean-3d-studio">
       <h4 className="asean-studio-title">{stage===2?'3D Studio':stage===4?'Revise your 3D exhibit':'Submit your 3D exhibit'}</h4>
       {photoCount===0&&<p>Upload a photo to preview your room in 3D.</p>}
       {!editable&&stage===2&&<p role="status">{readOnly||submitted?'This exhibit is view only.':'Your teacher needs to open Activity 3 before your group can edit.'}</p>}
       {stage===4&&records.feedback&&<p><strong>Feedback received</strong> {records.feedback.comment}</p>}
       {stage===5&&captured&&<p>{records.retest?"Report the revision and what the fresh visitors found.":"Report the revision. The visitor result is still pending."}</p>}
       {stage!==5&&<MuseumArtworkStudio studio={studio} update={edit} csrf={session.csrf} language="en" disabled={!editable||busy}
        uploadEnabled={session.uploadEnabled||readOnly} onAssets={setAssets} onBusy={setImageBusy} lessonTemplate={session.assignment.lesson_template}
        frameEditor={key=>captionEditor(ASEAN_FRAMES.find(frame=>frame.key===key))}/>}
       {stage!==5&&<label className="bml-full-field">Factual source <input value={studio.learning.source} maxLength={600} disabled={!editable||busy} onChange={e=>field('source',e.target.value)}/></label>}
       {stage!==5&&<div className="asean-studio-save">
        <div className="bml-toolbar">
         <button className="bml-primary" disabled={!editable||busy||imageBusy||!dirty} onClick={()=>action('save')}><Save size={18}/>{stage===2&&!missing.length?'Save V1':'Save draft'}</button>
         <button className="bml-outline" disabled={busy||imageBusy||!editable} onClick={()=>{if(!dirty||window.confirm('Discard unsaved caption and credit changes?'))action('reload');}}>Reload saved exhibit</button>
        </div>
        {editable&&missing.length>0&&<details><summary>What’s still needed ({missing.length})</summary><ul>{missing.map(item=><li key={item}>{item}</li>)}</ul></details>}
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
      {stage!==2&&stage!==4&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
       record={stageRecord} refreshLive={refreshLive} refreshRecords={refreshRecords} onVisit={gallery=>setPreview({gallery})}/>}
      {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
      {notice&&<p role="status">{notice}</p>}
     </div>
     <footer className="bml-student-bottom">
      <button type="button" className="bml-primary" disabled={busy||imageBusy||!photoCount} onClick={()=>action('preview')}>
       <Box size={18}/>{T(language,'Xem trước 2D/3D','Preview 2D/3D')}
      </button>
     </footer>
    </div></div>
   </div>
  </section>
 </MuseumStudentWorkshop>;
}
