import React,{useCallback,useEffect,useRef,useState} from 'react';
import {CheckCircle2,Eye,RefreshCw,Send,Users,X} from 'lucide-react';
import {liveGuest} from './museumLiveApi.js';
import MuseumScene from './MuseumScene.jsx';
import {EXHIBIT_FIELDS,exhibitField} from './museumExhibitInsights.js';
import {validatePeer} from './learningEvidence.js';
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
export default function MuseumLivePeerFeedback({csrf,liveInfo,locked=false,saveState='saved',drafts,setDrafts,onUseFeedback}){
 const [data,setData]=useState({rooms:[],mine:null,received:[]});
 const [selected,setSelected]=useState(null),[preview,setPreview]=useState(null);
 const [busy,setBusy]=useState(false);
 const request=useRef(0);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const ready=canWrite(liveInfo),canOpen=ready&&!locked&&saveState==='saved';
 const response=drafts[selected?.id]??blank;
 const setResponse=update=>setDrafts(prev=>({...prev,[selected.id]:update(prev[selected.id]??blank)}));
 const batchRooms=(data.rooms||[]).filter(room=>!room.responded);
 const prepared=batchRooms.filter(room=>validatePeer(drafts[room.id]));
 const remaining=Math.max(0,(data.peerCount??batchRooms.length)-(data.sent??0));
 const canSend=ready&&!locked&&!busy&&remaining>0&&prepared.length===remaining;
 const refresh=useCallback(async()=>{
  const id=++request.current;
  try{const next=await liveGuest('peer-rooms');if(id===request.current)setData(next);}
  catch(e){if(id===request.current)setError(e.message);}
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
  if(!ready||locked||room.responded||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const r=await liveGuest('peer-room-view','GET',null,csrf,{roomId:room.id});
   setPreview(normalizePreview(r.gallery?.draft||{},r.gallery?.artworks));
   setSelected(room);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const submit=async()=>{
  if(!canSend)return;
  setBusy(true);setError('');setNotice('');
  try{
   const reviews=prepared.map(room=>({roomId:room.id,value:drafts[room.id]}));
   await liveGuest('peer-room-review-batch','POST',{reviews},csrf);
   setDrafts({});
   setData(prev=>({...prev,sent:(prev.sent??0)+reviews.length,rooms:(prev.rooms||[]).map(room=>reviews.some(review=>review.roomId===room.id)
    ?{...room,responded:true,responses:room.responses+1}:room)}));
   setNotice(`${reviews.length} reviews sent in one submission.`);
   await refresh();
  }catch(e){setError(e.message);await refresh();}finally{setBusy(false);}
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
  {data.received?.length?<details className="bml-peer-received"><summary>Feedback received · {data.received.length} groups</summary>
   {data.received.map((r,i)=><article key={r.createdAt+'-'+i}>
    <div><strong>{label(r.fromGroup)}</strong><span>Clarity {r.rating}/4</span></div>
    <small className="bml-peer-exhibit-focus">{r.targetExhibit?'Focused on '+(EXHIBIT_FIELDS.find(x=>x.key===r.targetExhibit)?.label||'an exhibit'):'Whole exhibition'}</small>
    <p><b>What we learned:</b> {r.learned}</p>
    <p><b>What to improve:</b> {r.clarify}</p>
    {onUseFeedback?<button type="button" className="bml-outline" disabled={locked}
     onClick={()=>onUseFeedback(r)}>Use this feedback in our project</button>:null}
   </article>)}
  </details>:null}
  <div className="bml-peer-other"><strong>Classmates' open museums</strong>
   {!data.rooms?.length?<p className="bml-peer-hint">No other group has opened feedback yet. Open yours, or refresh when classmates are ready.</p>:null}
   <div className="bml-peer-room-list">{(data.rooms||[]).map(r=><article key={r.id}>
    <div><strong>{label(r.ownerGroup)}</strong><small>{r.title} · {r.responses} responses</small></div>
    <button type="button" className="bml-outline" disabled={!ready||locked||r.responded||busy}
     onClick={()=>visit(r)}><Eye size={16}/>{r.responded?'Feedback sent':validatePeer(drafts[r.id])?'Edit draft':'Visit & review'}</button>
   </article>)}</div>
   {ready&&!locked&&remaining>0?<div className="bml-peer-batch-actions">
    <span role="status">{prepared.length}/{remaining} pending reviews ready</span>
    {batchRooms.length<remaining?<small>Waiting for every classmate group to open its museum.</small>:null}
    <button type="button" className="bml-primary" disabled={!canSend} onClick={submit}><Send size={16}/>Send all {remaining} reviews</button>
   </div>:null}
  </div>
  {notice?<p className="bml-peer-message" role="status"><CheckCircle2 size={16}/>{notice}</p>:null}
  {error?<p className="bml-live-media-error" role="alert">{error}</p>:null}
  {selected&&preview?<div className="bml-student-detail-overlay" role="dialog" aria-modal="true" aria-label="Review a classmate's museum">
   <div className="bml-student-detail-window bml-peer-review-dialog">
    <div className="bml-student-detail-head"><strong>{label(selected.ownerGroup)} · Peer review</strong>
     <button type="button" className="bml-outline" onClick={()=>{setSelected(null);setPreview(null);}}><X size={16}/>Close</button></div>
    <div className="bml-peer-review-body">
     <div className="bml-peer-gallery"><MuseumScene gallery={preview} language="en" embedded onExhibitSelect={item=>{if(item.key)setResponse(v=>({...v,targetExhibit:item.key}));}}/></div>
     <form className="bml-peer-review-form" onSubmit={e=>{e.preventDefault();setSelected(null);setPreview(null);}}>
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
      <button className="bml-primary" type="submit" disabled={busy||!ready||!validatePeer(response)}><CheckCircle2 size={16}/>Save review draft</button>
      <small>One response per group per exhibition. Save each review here, then send them together from the room list.</small>
     </form>
    </div>
   </div>
  </div>:null}
 </section>;
}
