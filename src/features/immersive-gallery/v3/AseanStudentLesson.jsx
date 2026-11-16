import React,{useEffect,useState} from 'react';
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
 const makeDocument=()=>documentFromStudio({...studio,title:destination?.name||'',summary:destination?.country||'',theme:'culture'},session.assignment);
 const edit=change=>{setStudio(value=>typeof change==='function'?change(value):change);setDirty(true);setNotice('');};
 const field=(key,value)=>edit(draft=>({...draft,learning:{...draft.learning,[key]:value}}));
 const save=async()=>{
  const out=await guestRequest('save','PUT',{draft:makeDocument(),expectedVersion:version},session.csrf);
  setVersion(out.version);setDirty(false);setNotice('Exhibit saved.');return out.version;
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
    setAssets((await artGuest('list')).assets);setPreview(v=>!v);
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
   {readOnly&&<p role="status">Lesson complete · View only</p>}
   {!live&&<p role="status">Waiting for Teacher Live to start.</p>}
   {live?.stageIndex===stage&&live.media?.voiceEnabled&&<MuseumVoiceover stage={current} language="en" compact/>}
   {live?.stageIndex===stage&&Boolean(live.media?.videos?.length||live.media?.query)&&<MuseumVideoLab mode="student" language="en" stage={current} stageIndex={stage} media={live.media} readOnly={readOnly}/>}
   {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
   {notice&&<p role="status">{notice}</p>}
  </div>
  {stage!==2&&<GroupResponse key={stage} session={{...session,readOnly}} stage={stage} live={live} open={liveOpen}
   record={records.rows.find(item=>item.stage_index===stage)?.value} refreshLive={refreshLive} refreshRecords={refreshRecords}/>}
  {[2,4,5].includes(stage)&&<section className="bml-surface">
   <h2>{stage===4?'Our revision':'Our exhibit'}</h2>
   {stage===4&&records.feedback&&<p><strong>Feedback received</strong> {records.feedback.comment}</p>}
   {records.retest&&stage>=4&&<p><strong>Fresh visitor retest</strong> · {records.retest.score}/1 · {records.retest.answer}</p>}
   {stage===5&&captured&&<p>In your group report, explain the change you made and what the fresh visitor found.</p>}
   {ASEAN_FRAMES.map(frame=><label className="bml-full-field" key={frame.key}>{frame.label} caption · {aseanWordCount(studio.learning[frame.key])} / 20–30 words
    <textarea rows={3} maxLength={600} disabled={!editable||busy} value={studio.learning[frame.key]} onChange={e=>field(frame.key,e.target.value)}/>
   </label>)}
   <label className="bml-full-field">Factual source <input value={studio.learning.source} maxLength={600} disabled={!editable||busy} onChange={e=>field('source',e.target.value)}/></label>
   {stage!==5&&<MuseumArtworkStudio studio={studio} update={edit} csrf={session.csrf} language="en" disabled={!editable||busy}
    uploadEnabled={session.uploadEnabled} onAssets={setAssets} onBusy={setImageBusy} lessonTemplate={session.assignment.lesson_template}/>}
   <div className="bml-toolbar">
    <button className="bml-primary" disabled={!editable||busy||imageBusy||!dirty} onClick={()=>action('save')}>Save exhibit</button>
    <button className="bml-outline" disabled={busy} onClick={()=>action('preview')}>{preview?'Close preview':'Preview exhibit'}</button>
    <button className="bml-outline" disabled={busy||imageBusy||!editable} onClick={()=>action('reload')}>Reload saved exhibit</button>
   </div>
   {stage===4&&!captured&&editable&&<div className="bml-field-grid">
    <label>Question to retest <select value={revision.question} onChange={e=>setRevision({...revision,question:Number(e.target.value)})}>
     {ASEAN_FRAMES.map((f,i)=><option key={f.key} value={i+1}>{f.question}</option>)}</select></label>
    <label>Why did your group make this change? <input maxLength={300} value={revision.reason} onChange={e=>setRevision({...revision,reason:e.target.value})}/></label>
    <button className="bml-primary" disabled={busy||imageBusy||!revision.reason.trim()} onClick={()=>action('capture')}>Open saved V2 for retest</button>
   </div>}
   {preview&&<GalleryRenderBoundary language="en" onFallback={()=>setPreview(false)}>
    <MuseumScene embedded initial3D language="en" gallery={localMuseumFromDraft(makeDocument(),assets)}/>
   </GalleryRenderBoundary>}
   {stage===5&&<button className="bml-primary" disabled={!liveOpen||dirty||busy||submitted||!captured||Boolean(aseanExhibitMissing(makeDocument()).length)}
    onClick={()=>action('submit')}>{submitted?'Submitted':'Submit final exhibit'}</button>}
  </section>}
 </main>;
}
