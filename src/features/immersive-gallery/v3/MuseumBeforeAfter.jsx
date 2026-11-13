import React,{useMemo,useState} from 'react';
import {ArrowLeftRight,CheckCircle2,ClipboardCheck,Image as ImageIcon,Info} from 'lucide-react';
import {changedExhibits} from './learningEvidence.js';
import {EXHIBIT_FIELDS} from './museumExhibitInsights.js';
import {normalizeStoryboardOrder} from './museumData.js';
import './museumBeforeAfter.css';

const text=(value,max=2500)=>String(value||'').trim().slice(0,max);
const normalizeCheckpoint=checkpoint=>checkpoint?.draft||checkpoint?.doc||null;
const getText=(doc,key)=>{
 if(!doc)return '';
 const learning=text(doc.learning?.[key]);
 if(learning)return learning;
 const names={issue:'problem',evidence:'evidence',solution:'solution'};
 const exhibit=(doc.rooms||[]).flatMap(r=>r.exhibits||[])
  .find(e=>String(e.title||'').toLowerCase().includes(names[key]));
 return text(exhibit?.description);
};
const getImage=(checkpoint,key)=>{
 const id=normalizeCheckpoint(checkpoint)?.artworks?.[key];
 return (checkpoint?.artworks||[]).find(a=>a.id===id)?.image_url||'';
};
export function beforeAfterEvidence(before,after){
 const previous=normalizeCheckpoint(before),updated=normalizeCheckpoint(after);
 if(!previous||!updated)return {ready:false,changed:[],before:previous,after:updated};
 const changed=changedExhibits(previous,updated);
 return {ready:true,changed,before:previous,after:updated,
  routeChanged:JSON.stringify(normalizeStoryboardOrder(previous.storyboardOrder))!==JSON.stringify(normalizeStoryboardOrder(updated.storyboardOrder)),
  improvement:text(updated.learning?.improvement,1200),
  feedback:text(updated.learning?.feedback,1200)};
}
function VersionCard({checkpoint,kind,selectedKey,changed}){
 const doc=normalizeCheckpoint(checkpoint);
 const isAfter=kind==='after';
 const value=getText(doc,selectedKey);
 const image=getImage(checkpoint,selectedKey);
 return <article className={'bml-compare-version'+(isAfter?' is-after':' is-before')}>
  <div className="bml-compare-version-heading">
   <span>{kind==='before'?'BEFORE · INITIAL DESIGN':'AFTER · IMPROVED DESIGN'}</span>
   <strong>{checkpoint?'Saved version '+checkpoint.version:'Not recorded'}</strong>
  </div>
  {doc?<><p className="bml-compare-version-title">{doc.title||'Our English Museum'}</p>
   <p className="bml-compare-content">{value||'No description for this exhibit.'}</p>
   {image?<img className="bml-compare-image" src={image} alt={kind+' uploaded exhibit artwork'} referrerPolicy="no-referrer"/>:
    <div className="bml-compare-no-image"><ImageIcon size={16}/> No uploaded image for this exhibit</div>}
   {selectedKey==='evidence'&&doc.learning?.source?<p className="bml-compare-source"><b>Source:</b> {text(doc.learning.source,600)}</p>:null}
   <span className={'bml-compare-note'+(changed?' is-changed':'')}>{isAfter?(changed?'Revised after testing':'No content change recorded'):'Original checkpoint'}</span>
  </>:<p className="bml-compare-empty">This checkpoint has not been saved. No version is invented.</p>}
 </article>;
}
export default function MuseumBeforeAfter({before=null,after=null,groupLabel='',compact=false}){
 const [field,setField]=useState('issue');
 const model=useMemo(()=>beforeAfterEvidence(before,after),[before,after]);
 return <section className={'bml-before-after'+(compact?' is-compact':'')} data-testid="museum-before-after"
  aria-label="Before and after exhibit comparison">
  <header className="bml-compare-header"><div><span className="bml-compare-kicker"><ArrowLeftRight size={16}/> DESIGN EVOLUTION</span>
   <h2>Before & After</h2>
   <p>{groupLabel?groupLabel+' · ':''}Compare saved exhibit checkpoints without changing either version.</p></div>
   {model.ready?<span className="bml-compare-total"><CheckCircle2 size={16}/>{model.changed.length} revised exhibit{model.changed.length===1?'':'s'}</span>:null}
  </header>
  {!model.ready?<div className="bml-compare-no-checkpoint"><Info size={21}/>
   <p>Both a Before and an After checkpoint must exist to compare the exhibition. Only saved work appears here.</p>
  </div>:<>
   <div className="bml-compare-tabs" role="tablist" aria-label="Choose exhibit to compare">
    {EXHIBIT_FIELDS.map(item=><button type="button" key={item.key} role="tab"
     aria-selected={field===item.key} className={field===item.key?'is-active':''}
     onClick={()=>setField(item.key)}>{item.label}
     {model.changed.includes(item.key)?<span className="bml-compare-changed">Changed</span>:null}</button>)}
   </div>
   <div className="bml-compare-grid" role="tabpanel">
    <VersionCard checkpoint={before} kind="before" selectedKey={field} changed={false}/>
    <VersionCard checkpoint={after} kind="after" selectedKey={field} changed={model.changed.includes(field)}/>
   </div>
   {model.routeChanged?<div className="bml-compare-route-changed">
    <ArrowLeftRight size={17}/><strong>Visitor route revised:</strong>
    <span>{normalizeStoryboardOrder(model.before.storyboardOrder).map(k=>EXHIBIT_FIELDS.find(x=>x.key===k)?.short).join(' → ')}</span>
    <b>→</b><span>{normalizeStoryboardOrder(model.after.storyboardOrder).map(k=>EXHIBIT_FIELDS.find(x=>x.key===k)?.short).join(' → ')}</span>
   </div>:null}
   {model.feedback||model.improvement?<div className="bml-compare-revision">
    <div><ClipboardCheck size={17}/><strong>Feedback → revision</strong></div>
    {model.feedback?<p><b>Peer feedback:</b> {model.feedback}</p>:null}
    {model.improvement?<p><b>Revision described by the group:</b> {model.improvement}</p>:null}
   </div>:null}
   <small className="bml-compare-integrity">These are stored snapshots, not independent proof that learning outcomes or environmental savings occurred.</small>
  </>}
 </section>;
}
