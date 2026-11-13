import React,{useCallback,useEffect,useState} from 'react';
import {CheckCircle2,Eye,MessageSquare,RefreshCw,Send,Users,X} from 'lucide-react';
import {liveGuest} from './museumLiveApi.js';
import MuseumScene from './MuseumScene.jsx';
import {EXHIBIT_FIELDS,exhibitField} from './museumExhibitInsights.js';
import {englishSystemGroupLabel} from './museumApi.js';
import './museumLivePeer.css';

const blank={learned:'',clarify:'',rating:0,targetExhibit:''};
const canWrite=s=>s?.status==='active'&&s?.stageOpen===true&&s?.stageIndex>=7&&s?.stageIndex<=9;
function normalizePreview(draft,artworks){
 const images=new Map((artworks||[]).map(a=>[a.id,a.image_url]));
 return {...draft,rooms:(draft.rooms||[]).map((room,i)=>({
  ...room,id:'live-review-room-'+i,
  exhibits:(room.exhibits||[]).map((e,j)=>({
   ...e,id:'live-review-exhibit-'+i+'-'+j,status:'published',
   image_url:images.get(e.asset_id)||''
  }))
 }))};
}
export default function MuseumLivePeerFeedback({csrf,liveInfo,locked=false,saveState='saved',onUseFeedback}){
 const [data,setData]=useState({rooms:[],mine:null,received:[]});
 const [selected,setSelected]=useState(null),[preview,setPreview]=useState(null);
 const [response,setResponse]=useState(blank),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const ready=canWrite(liveInfo),canOpen=ready&&!locked&&saveState==='saved';
 const refresh=useCallback(async()=>{
  try{const next=await liveGuest('peer-rooms');setData(next);}
  catch(e){setError(e.message);}
 },[]);
 useEffect(()=>{
  refresh();
  const timer=window.setInterval(refresh,5000);
  return()=>window.clearInterval(timer);
 },[refresh]);
 useEffect(()=>{if(!ready){setSelected(null);setPreview(null);}},[ready]);
 const toggle=async open=>{
  if(!canOpen||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   await liveGuest('peer-room-toggle','POST',{open},csrf);
   await refresh();
   setNotice(open?'Your feedback room is open to other groups in this class.':'Feedback room closed.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const visit=async room=>{
  if(!ready||room.responded||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const r=await liveGuest('peer-room-view','GET',null,csrf,{roomId:room.id});
   setPreview(normalizePreview(r.gallery?.draft||{},r.gallery?.artworks));
   setSelected(room);setResponse(blank);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const submit=async()=>{
  if(!selected||busy||response.rating<1||response.rating>4||response.learned.trim().length<10||response.clarify.trim().length<10)return;
  setBusy(true);setError('');
  try{
   await liveGuest('peer-room-review','POST',{roomId:selected.id,value:response},csrf);
   setSelected(null);setPreview(null);setResponse(blank);
   setNotice('Your feedback was recorded for the museum creators.');
   await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const label=s=>englishSystemGroupLabel(s||'Class group');
 return <section className="bml-peer-live" data-testid="museum-live-peer-feedback">
  <header className="bml-peer-head"><div><span className="bml-overline"><Users size={15}/> CLASSROOM GALLERY WALK</span>
   <h3>Live Museum Feedback</h3>
   <p>Open your museum for classmates, visit their exhibitions and give evidence-based feedback in English.</p>
  </div><button className="bml-outline" type="button" onClick={refresh} disabled={busy} aria-label="Refresh feedback rooms"><RefreshCw size={17}/></button></header>
  {!ready?<p className="bml-peer-hint">Feedback rooms become interactive when your teacher opens Activity 8, 9 or 10.</p>:null}
  <div className="bml-peer-own">
   <div><strong>Our group's feedback room</strong><small>{data.mine?.isOpen?'OPEN · Visible to classroom groups':data.mine?'CLOSED · Private':'NOT OPENED YET'}</small></div>
   {data.mine?.isOpen?<button type="button" className="bml-outline" disabled={!canOpen||busy} onClick={()=>toggle(false)}>Close feedback</button>:
    <button type="button" className="bml-primary" disabled={!canOpen||busy} onClick={()=>toggle(true)}>Open for feedback</button>}
  </div>
  {ready&&saveState!=='saved'?<p className="bml-peer-hint">Save your latest museum draft before opening feedback.</p>:null}
  {data.mine?.responses>0?<p className="bml-peer-count"><CheckCircle2 size={16}/> {data.mine.responses} group response(s) received</p>:null}
  {data.received?.length?<div className="bml-peer-received"><strong>Feedback received · {data.received.length} groups</strong>
   {data.received.map((r,i)=><article key={r.createdAt+'-'+i}>
    <div><strong>{label(r.fromGroup)}</strong><span>Clarity {r.rating}/4</span></div>
    <small className="bml-peer-exhibit-focus">{r.targetExhibit?'Focused on '+(EXHIBIT_FIELDS.find(x=>x.key===r.targetExhibit)?.label||'an exhibit'):'Whole exhibition'}</small>
    <p><b>What we learned:</b> {r.learned}</p>
    <p><b>What to improve:</b> {r.clarify}</p>
    {onUseFeedback?<button type="button" className="bml-outline" disabled={locked}
     onClick={()=>onUseFeedback(r)}>Use this as authentic peer evidence</button>:null}
   </article>)}
  </div>:null}
  <div className="bml-peer-other"><strong>Classmates' open museums</strong>
   {!data.rooms?.length?<p className="bml-peer-hint">No other group has opened feedback yet. Open yours, or refresh when classmates are ready.</p>:null}
   <div className="bml-peer-room-list">{(data.rooms||[]).map(r=><article key={r.id}>
    <div><strong>{label(r.ownerGroup)}</strong><small>{r.title} · {r.responses} responses</small></div>
    <button type="button" className="bml-outline" disabled={!ready||r.responded||busy}
     onClick={()=>visit(r)}><Eye size={16}/>{r.responded?'Feedback sent':'Visit & review'}</button>
   </article>)}</div>
  </div>
  {notice?<p className="bml-peer-message" role="status"><CheckCircle2 size={16}/>{notice}</p>:null}
  {error?<p className="bml-live-media-error" role="alert">{error}</p>:null}
  {selected&&preview?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label="Review a classmate's museum">
   <div className="bml-student-detail-window bml-peer-review-dialog">
    <div className="bml-student-detail-head"><strong>{label(selected.ownerGroup)} · Peer review</strong>
     <button type="button" className="bml-outline" onClick={()=>{setSelected(null);setPreview(null);}}><X size={16}/>Close</button></div>
    <div className="bml-peer-review-body">
     <div className="bml-peer-gallery"><MuseumScene gallery={preview} language="en" embedded onExhibitSelect={item=>{if(item.key)setResponse(v=>({...v,targetExhibit:item.key}));}}/></div>
     <form className="bml-peer-review-form" onSubmit={e=>{e.preventDefault();submit();}}>
      <label>What are you reviewing?
       <select value={response.targetExhibit} onChange={e=>setResponse(v=>({...v,targetExhibit:e.target.value}))}>
        <option value="">Whole exhibition</option>
        {EXHIBIT_FIELDS.filter(item=>(preview.rooms||[]).flatMap(r=>r.exhibits||[])
         .some((ex,j)=>exhibitField(j,ex.title)===item.key)).map(item=>
         <option key={item.key} value={item.key}>{item.label}</option>)}
       </select>
       <small>Choose an exhibit or click it in the gallery. Your comment will be linked to that part.</small>
      </label>
      <label>What did you learn?<textarea required minLength={10} maxLength={400} value={response.learned}
       placeholder="We learned that ..." onChange={e=>setResponse(v=>({...v,learned:e.target.value}))}/></label>
      <label>What could be clearer?<textarea required minLength={10} maxLength={400} value={response.clarify}
       placeholder="The exhibition would be clearer if ..." onChange={e=>setResponse(v=>({...v,clarify:e.target.value}))}/></label>
      <label>Clarity (1–4)<select required value={response.rating} onChange={e=>setResponse(v=>({...v,rating:Number(e.target.value)}))}>
       <option value={0}>Choose a rating</option><option value={1}>1 · Unclear</option>
       <option value={2}>2 · Partly clear</option><option value={3}>3 · Mostly clear</option>
       <option value={4}>4 · Clear</option></select></label>
      <button className="bml-primary" type="submit" disabled={busy||!ready||response.rating===0||response.learned.trim().length<10||response.clarify.trim().length<10}><Send size={16}/>Send feedback</button>
      <small>One response per group per exhibition. Only classmates with a valid group pass can participate. Exhibit focus is optional.</small>
     </form>
    </div>
   </div>
  </div>:null}
 </section>;
}
