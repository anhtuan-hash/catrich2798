import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeftRight,CheckCircle2,Eye,Hand,MessageSquareText,MonitorPlay,RefreshCw,ShieldCheck,Users,X} from 'lucide-react';
import MuseumBeforeAfter from './MuseumBeforeAfter.jsx';
import {englishSystemGroupLabel} from './museumApi.js';
import {classroomSummary} from './museumCommandCenter.js';
import './museumCommandCenter.css';

const safeLabel=value=>englishSystemGroupLabel(value||'Group');
const prettyState=state=>({
 issued:'Invitation issued',editing:'Editing',changes_requested:'Changes requested',
 submitted:'Submitted',ttcm_review:'Under review',approved_locked:'Approved',published:'Published'
})[state]||'Working';
function Stat({icon:Icon,value,label}){
 return <div className="bml-cc-stat"><Icon size={19} aria-hidden="true"/>
  <span><strong>{value}</strong><small>{label}</small></span></div>;
}
function ReviewCard({review,otherLabel}){
 return <article className="bml-cc-review">
  <div><strong>{otherLabel}</strong><span>{review.rating||0}/4</span></div>
  <p><b>What we learned</b> {review.learned}</p>
  <p><b>What to improve</b> {review.clarify}</p>
 </article>;
}
export default function MuseumClassroomCommandCenter({
 groups=[],responses=[],feedback=[],microResults=[],helpGroups=[],
 session,compact=false,busy=false,onRefresh,onSpotlight,onCompare
}){
 const model=useMemo(()=>classroomSummary({groups,responses,feedback,microResults,helpGroups}),
  [groups,responses,feedback,microResults,helpGroups]);
 const [selectedId,setSelectedId]=useState(null),[tab,setTab]=useState('received');
 const [qualityOpen,setQualityOpen]=useState(false);
 const [compareData,setCompareData]=useState(null),[compareBusy,setCompareBusy]=useState(false),[compareError,setCompareError]=useState('');
 const openComparison=async groupId=>{
  if(compareBusy||!onCompare)return;
  setCompareBusy(true);setCompareError('');
  try{setCompareData(await onCompare(groupId));}
  catch(error){setCompareError(error.message||'Unable to load saved checkpoints.');}
  finally{setCompareBusy(false);}
 };
 useEffect(()=>{
  if(!model.groups.some(g=>g.id===selectedId))setSelectedId(model.groups[0]?.id||null);
 },[selectedId,model.groups]);
 const selected=model.groups.find(g=>g.id===selectedId)||model.groups[0];
 const names=new Map(model.groups.map(g=>[g.id,safeLabel(g.label)]));
 const reviews=selected?(tab==='received'?selected.reviewsReceived:selected.reviewsGiven):[];
 const reviewLabel=r=>tab==='received'?names.get(r.from_group):names.get(r.to_group);
 return <section className={'bml-class-command'+(compact?' is-compact':'')}
  aria-label="Classroom Live Command Center" data-testid="museum-class-command">
  <header className="bml-cc-header">
   <div><span className="bml-cc-eyebrow">BRIAN MUSEUM LAB · CLASSROOM LIVE</span>
    <h2>Classroom Command Center</h2>
    <p>Activity {String((session?.stageIndex??-1)+1).padStart(2,'0')}/11
     {' · '}{session?.stage?.title||'Lesson'}{' · '}
     <span className="bml-cc-status">{session?.stageOpen?'Task open':'Task closed'}</span></p>
   </div>
   <button type="button" className="bml-cc-refresh" disabled={busy} onClick={onRefresh}
    aria-label="Refresh classroom overview"><RefreshCw size={17}/>Refresh</button>
  </header>
  <div className="bml-cc-stats" aria-label="Classroom summary">
   <Stat icon={Users} value={model.metrics.groups} label="Groups"/>
   <Stat icon={CheckCircle2} value={model.metrics.responded} label="Activity responses"/>
   <Stat icon={MessageSquareText} value={model.metrics.reviewed} label="Groups reviewed"/>
   <Stat icon={Hand} value={model.metrics.needHelp} label="Need help"/>
  </div>
  <div className="bml-cc-main">
   <div className="bml-cc-group-panel">
    <div className="bml-cc-subhead"><strong>Select a group</strong>
     <span>{model.groups.length} class groups</span></div>
    {model.groups.length?<div className="bml-cc-grid" role="group" aria-label="Class groups">
     {model.groups.map((group,i)=><button key={group.id} type="button"
      className={'bml-cc-group'+(selected?.id===group.id?' is-selected':'')}
      aria-pressed={selected?.id===group.id}
      aria-label={safeLabel(group.label)+' — '+prettyState(group.state)}
      onClick={()=>{setSelectedId(group.id);setTab('received');}}>
      <span className="bml-cc-group-top"><strong>{safeLabel(group.label)}</strong>
       <small>{String(i+1).padStart(2,'0')}</small></span>
      <span className="bml-cc-group-state">{prettyState(group.state)}</span>
      <span className="bml-cc-group-tags">
       <span className={group.responded||group.thinkingAnswered?'is-done':'is-pending'}>
        {group.responded||group.thinkingAnswered?'Responded':'Not yet'}</span>
       <span>{group.reviewCount} reviews</span>
       {group.askingHelp?<span className="is-help"><Hand size={12}/> Help</span>:null}
      </span>
     </button>)}
    </div>:<p className="bml-cc-empty">No groups have been assigned to this lesson yet.</p>}
    <div className="bml-cc-integrity">
     <ShieldCheck size={16} aria-hidden="true"/>
     <span>Activity answers and group states are not grades.</span>
    </div>
   </div>
   <aside className="bml-cc-details" aria-label="Selected group details">
    {selected?<><div className="bml-cc-detail-head">
     <div><span className="bml-cc-eyebrow">SELECTED GROUP</span><h3>{safeLabel(selected.label)}</h3>
      <p>{prettyState(selected.state)} · {selected.thinkingAnswered?'Thinking task completed':selected.responded?'Response submitted':'Awaiting current activity response'}</p></div>
     <button className="bml-cc-spotlight" type="button" onClick={()=>onSpotlight?.(selected.id)}
      disabled={busy} aria-label={'Spotlight '+safeLabel(selected.label)+' private museum'}>
      <MonitorPlay size={16}/>Spotlight</button>
    </div>
    {onCompare?<button type="button" className="bml-cc-compare-launch"
     disabled={compareBusy} onClick={()=>openComparison(selected.id)}>
     <ArrowLeftRight size={15}/>{compareBusy?'Opening saved versions…':'Compare Before / After'}</button>:null}
    {compareError?<p className="bml-cc-compare-error" role="alert">{compareError}</p>:null}
    <div className="bml-cc-tabs" role="tablist" aria-label="Group peer feedback">
     <button type="button" role="tab" aria-selected={tab==='received'} onClick={()=>setTab('received')}>
      Received ({selected.reviewsReceived.length})</button>
     <button type="button" role="tab" aria-selected={tab==='sent'} onClick={()=>setTab('sent')}>
      Sent ({selected.reviewsGiven.length})</button>
    </div>
    <div className="bml-cc-review-list" role="tabpanel" aria-label={tab==='received'?'Feedback received':'Feedback sent'}>
     {reviews.length?reviews.map((review,i)=><ReviewCard key={review.id||review.from_group+'-'+i}
      review={review} otherLabel={reviewLabel(review)||'Class group'}/>):
      <p className="bml-cc-empty"><MessageSquareText size={19}/> No {tab} feedback in this lesson yet.</p>}
    </div>
    {selected.askingHelp?<div className="bml-cc-help-alert"><Hand size={15}/> This group requested help in the current activity.</div>:null}
    </>:<p className="bml-cc-empty">Choose a group to view its progress and peer feedback.</p>}
   </aside>
  </div>
  <footer className="bml-cc-footer">
   <span><Eye size={15}/> Teacher-only view · Group work stays private</span>
   {model.warnings.length?<button type="button" aria-expanded={qualityOpen} className="bml-cc-quality"
    onClick={()=>setQualityOpen(v=>!v)}><AlertTriangle size={16}/>
    Quality review · {model.warnings.length} issue{model.warnings.length===1?'':'s'}</button>:
    <span className="bml-cc-quality-ok"><ShieldCheck size={16}/> No repeated feedback detected</span>}
  </footer>
  {qualityOpen&&model.warnings.length?<div className="bml-cc-quality-detail" role="status" aria-label="Teacher-only content quality review">
   {model.warnings.map((w,i)=><p key={w.type+'-'+i}><b>{w.type==='repeated-comment'?'Repeated feedback':'Brief feedback'}</b>
    {' · '+w.count+' instance'+(w.count===1?'':'s')}. {w.excerpt}</p>)}
   <small>Advisory only: review context before editing. No student grade or submission is changed.</small>
  </div>:null}
  {compareData?<div className="bml-cc-compare-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCompareData(null);}}>
   <section className="bml-cc-compare-dialog" role="dialog" aria-modal="true" aria-label="Compare saved exhibit revisions" data-testid="museum-teacher-compare-dialog">
    <header><strong>Group exhibit development</strong><button type="button" className="bml-cc-compare-close" onClick={()=>setCompareData(null)} aria-label="Close comparison"><X size={18}/>Close</button></header>
    <MuseumBeforeAfter before={compareData.before} after={compareData.after} groupLabel={safeLabel(compareData.groupLabel)}/>
   </section></div>:null}
 </section>;
}
