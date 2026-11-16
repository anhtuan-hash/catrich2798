import React,{useEffect,useRef,useState} from 'react';
import {Box,Save} from 'lucide-react';
import {ASEAN_FRAMES,ASEAN_STAGES,aseanDestination,aseanExhibitMissing,aseanWritingCard,aseanWordCount} from './aseanLesson.js';
import {guestRequest,englishSystemGroupLabel} from './museumApi.js';
import {liveGuest,localMuseumFromDraft,artGuest} from './museumLiveApi.js';
import {emptyStudio,normalizeStudio,documentFromStudio} from './museumData.js';
import MuseumVoiceover from './MuseumVoiceover.jsx';
import MuseumVideoLab from './MuseumVideoLab.jsx';
import MuseumArtworkStudio from './MuseumArtworkStudio.jsx';
import MuseumCompetitionRibbon from './MuseumCompetitionRibbon.jsx';
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
  return <fieldset disabled={recorded}><legend>{card.title}</legend>
   <p>{card.country}</p><p>Experience clues · {card.experience}</p><p>Visitor tip clues · {card.advice}</p>
   {text('experience','One thing a visitor can do')}{text('advice','One piece of advice')}
  </fieldset>;
 }
 if(stage===1)return <fieldset disabled={recorded}><legend>Exhibit plan</legend>
  {ASEAN_FRAMES.map((f,i)=><label className="bml-full-field" key={f.key}>{f.label} photo code
   <input required maxLength={35} value={fields.codes?.[i]||''} onChange={event=>update('codes',fields.codes.map((code,j)=>i===j?event.target.value:code))}/>
  </label>)}
  <label>Frame your group compared {frameSelect(fields.comparisonFrame,v=>update('comparisonFrame',v))}</label>
  {text('alternative','Code for the other photo you considered',35)}
  {text('fact','A fact in your own words')}{text('source','Source for the fact',350)}
  {text('reason','We chose this photo because visitors can see …')}
 </fieldset>;
 if(stage===3)return <fieldset disabled={recorded}><legend>Visitor test /3</legend>
  <label>First frame opened <select required value={fields.first??''} onChange={event=>update('first',Number(event.target.value))}><option value="">Select a frame</option>{frameOptions}</select></label>
  {ASEAN_FRAMES.map(({key,question},i)=>{
   const answer=fields.answers[i];
   const change=(name,value)=>update('answers',fields.answers.map((item,index)=>index===i?{...item,[name]:value}:item));
   return <fieldset key={key}><legend>{question}</legend>
    <label className="bml-full-field">Answer<textarea required rows={2} maxLength={130} value={answer.text} onChange={e=>change('text',e.target.value)}/></label>
    <label>Evidence frame {frameSelect(answer.frame,v=>change('frame',v))}</label>{' '}
    <label>Score {scoreSelect(answer.score,v=>change('score',v))}</label>
   </fieldset>;
  })}
  {text('comment','One change that would make a frame clearer')}
 </fieldset>;
 return <fieldset disabled={recorded}><legend>{ASEAN_FRAMES[(question||fields.question)-1]?.question||'Fresh visitor test'}</legend>
  {text('answer','Your group’s answer')}
  <label>Evidence frame {frameSelect(fields.frame,v=>update('frame',v))}</label>{' '}
  <label>Score {scoreSelect(fields.score,v=>update('score',v))}</label>
 </fieldset>;
}

function GroupResponse({session,stage,open,record,live,refreshRecords,refreshLive}){
 const [fields,setFields]=useState(()=>record||initialFields(stage));
 const [visit,setVisit]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [showGallery,setShowGallery]=useState(false);
 const submitted=Boolean(record);
 const visitStage=stage===3||stage===4;
 const loadVisit=async()=>{
  setError('');setBusy(true);
  try{
   const result=await liveGuest('asean-visit');
   setVisit(result);setShowGallery(Boolean(result.gallery));
   if(!result.gallery)setError(englishSystemGroupLabel(result.target)+' has not made this version available yet.');
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
   setShowGallery(false);
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 if(!open&&!submitted)return <p className="bml-muted">{session.readOnly?'No group response was recorded for this activity.':'Your teacher has not opened this activity for responses.'}</p>;
 return <section className="bml-surface">
  {visitStage&&open&&!submitted&&<button type="button" className="bml-outline" onClick={loadVisit} disabled={busy}>
   Open assigned {stage===3?'V1 exhibit':'V2 exhibit'}
  </button>}
  {visit?.target&&<p>{englishSystemGroupLabel(visit.target)}{visit.gallery?' · Saved version '+visit.gallery.version:''}</p>}
  {showGallery&&visit?.gallery&&<GalleryRenderBoundary language="en" onFallback={()=>setShowGallery(false)}>
   <MuseumScene embedded initial3D language="en" gallery={reviewMuseum({snapshot:visit.gallery.draft},visit.gallery.artworks)}/>
   <button type="button" className="bml-outline" onClick={()=>setShowGallery(false)}>Back to response</button>
  </GalleryRenderBoundary>}
  {(!visitStage||submitted||visit?.gallery)&&<form onSubmit={submit}>
   <ResponseFields stage={stage} fields={record||fields} update={(key,value)=>setFields(previous=>({...previous,[key]:value}))}
    groupLabel={session.groupLabel} question={visit?.question} recorded={submitted||!open}/>
   {submitted?<p role="status">Group response saved.</p>:
    <button className="bml-primary" type="submit" disabled={busy||!open}>Submit group response</button>}
  </form>}
  {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
 </section>;
}

export default function AseanStudentLesson({session,initialStudio,initialVersion,onLogout}){
 const destination=aseanDestination(session.groupLabel);
 const [studio,setStudio]=useState(()=>initialStudio||emptyStudio());
 const [version,setVersion]=useState(initialVersion);
 const [assets,setAssets]=useState([]);
 const [live,setLive]=useState(null),[records,setRecords]=useState({rows:[],feedback:null,checkpoints:[]});
 const [readOnly,setReadOnly]=useState(session.readOnly),[review,setReview]=useState(null);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [imageBusy,setImageBusy]=useState(false);
 const [notice,setNotice]=useState(''),[preview,setPreview]=useState(false);
 const previewRef=useRef(null);
 const studioRef=useRef(null);
 const [revision,setRevision]=useState({question:1,reason:''});
 const [submitted,setSubmitted]=useState(!['issued','editing','changes_requested'].includes(session.groupState));
 const refreshLive=async()=>{
  const result=await liveGuest('state');setLive(result.session);setReadOnly(result.readOnly);
 };
 const refreshRecords=async()=>setRecords(await liveGuest('asean-records'));
 useEffect(()=>{
  let active=true;
  const sync=async()=>{
   try{
    const [next,work]=await Promise.all([liveGuest('state'),liveGuest('asean-records')]);
    if(active){setLive(next.session);setReadOnly(next.readOnly);setRecords(work);}
   }catch(e){if(active)setError(errorText(e));}
  };
  sync();const interval=window.setInterval(sync,5000);
  return()=>{active=false;window.clearInterval(interval);};
 },[]);
 const stage=review??Math.max(0,Math.min(ASEAN_STAGES.length-1,live?.stageIndex??0));
 const current=ASEAN_STAGES[stage];
 const liveOpen=!readOnly&&live?.status==='active'&&live.stageOpen&&live.stageIndex===stage;
 const captured=records.checkpoints.find(item=>item.kind==='after');
 const editable=liveOpen&&(stage===2||(stage===4&&!captured))&&!submitted;
 const document=documentFromStudio({...studio,title:destination?.name||'',summary:destination?.country||'',theme:'culture'},session.assignment);
 const missing=aseanExhibitMissing(document);
 const photoCount=Object.values(studio.artworks).filter(Boolean).length;
 const workshopVisible=[2,4,5].includes(stage);
 useEffect(()=>{if(preview&&workshopVisible)previewRef.current?.focus();},[preview,workshopVisible]);
 useEffect(()=>{setPreview(false);},[stage]);
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
    if(preview){setPreview(false);return;}
    setAssets((await artGuest('list')).assets);setPreview(true);
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
 return <main className="bml bml-paper bml-student-editorial" lang="en" data-testid="asean-student-lesson">
  <MuseumCompetitionRibbon language="en" lessonTemplate={session.assignment.lesson_template}/>
  <div className="bml-surface">
   <header className="bml-section-head">
    <div><h1>{destination?.name||session.assignment.title}</h1>
     <p>{englishSystemGroupLabel(session.groupLabel)} · {destination?.country} · {session.assignment.class_scope}</p>
    </div>
    <button className="bml-outline" onClick={onLogout}>Sign out</button>
   </header>
   {destination&&<p><a href={destination.source} target="_blank" rel="noreferrer">UNESCO destination source</a>{' · '}
    <a href={'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search='+encodeURIComponent(destination.name)} target="_blank" rel="noreferrer">Find candidate photographs</a></p>}
   <nav aria-label="Lesson activities" className="bml-toolbar">
    <button className="bml-outline" disabled={stage===0} onClick={()=>setReview(stage-1)}>Previous</button>
    <button className="bml-outline" onClick={()=>setReview(null)}>Follow teacher</button>
    <button className="bml-outline" disabled={stage===5} onClick={()=>setReview(stage+1)}>Next</button>
   </nav>
   <p className="bml-overline">PERIOD {current.period} · ACTIVITY {stage+1} / 6 · {current.minutes} MIN</p>
   <h2>{current.title}</h2><p>{current.question}</p><p>{current.expected}</p>
   {stage===2&&<button type="button" className="bml-primary" onClick={()=>{
    studioRef.current?.focus({preventScroll:true});
    studioRef.current?.scrollIntoView({block:'start'});
   }}><Box size={18}/> Open the 3D Studio</button>}
   {readOnly&&<p role="status">Lesson complete · View only</p>}
   {!live&&<p role="status">Waiting for Teacher Live to start.</p>}
   {live?.stageIndex===stage&&live.media?.voiceEnabled&&<MuseumVoiceover stage={current} language="en" compact/>}
   {live?.stageIndex===stage&&Boolean(live.media?.videos?.length||live.media?.query)&&<MuseumVideoLab mode="student" language="en" stage={current} stageIndex={stage} media={live.media} readOnly={readOnly}/>}
   {!workshopVisible&&error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
   {!workshopVisible&&notice&&<p role="status">{notice}</p>}
  </div>
  {stage!==2&&stage!==4&&stage!==5&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
   record={records.rows.find(item=>item.stage_index===stage)?.value} refreshLive={refreshLive} refreshRecords={refreshRecords}/>}
  {workshopVisible&&<section className="bml-surface asean-student-studio" ref={studioRef} tabIndex={-1} data-testid="asean-3d-studio">
   <div className="asean-studio-head">
    <div><h2>{stage===2?'Build your group’s 3D exhibit':stage===4?'Revise your 3D exhibit':'Submit your 3D exhibit'}</h2>
     <p>{stage===2?'Upload one photo per frame. Add the English captions and credits, preview the room, then save V1.':
      stage===4?'Improve one frame, then make the revised room available for retesting.':'Preview the finished room, then send it to your teacher for review.'}</p>
    </div>
    <button type="button" className="bml-outline" disabled={busy||imageBusy||!photoCount} onClick={()=>action('preview')}><Box size={18}/>{preview?'Close 3D preview':'Preview in 3D'}</button>
   </div>
   {photoCount===0&&<p>Upload a photo to preview your room in 3D.</p>}
   {preview&&<section className="asean-studio-preview" tabIndex={-1} ref={previewRef} aria-label="Preview of your 3D room">
    <GalleryRenderBoundary language="en" onFallback={()=>setPreview(false)}>
     <MuseumScene embedded initial3D language="en" gallery={localMuseumFromDraft(document,assets)}/>
    </GalleryRenderBoundary>
   </section>}
   {!editable&&stage===2&&<p role="status">{readOnly||submitted?'This exhibit is view only.':'Your teacher needs to open Activity 3 before your group can edit.'}</p>}
   {stage===4&&records.feedback&&<p><strong>Feedback received</strong> {records.feedback.comment}</p>}
   {records.retest&&stage>=4&&<p><strong>Fresh visitor retest</strong> · {records.retest.score}/1 · {records.retest.answer}</p>}
   {stage===5&&captured&&<p>In your group report, explain the change you made and what the fresh visitor found.</p>}
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
   {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
   {notice&&<p role="status">{notice}</p>}
  </section>}
  {(stage===4||stage===5)&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
   record={records.rows.find(item=>item.stage_index===stage)?.value} refreshLive={refreshLive} refreshRecords={refreshRecords}/>}
 </main>;
}
