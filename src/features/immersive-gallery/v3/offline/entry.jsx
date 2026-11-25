import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumLabApp from '../MuseumLabApp.jsx';
import MuseumLabStudent,{PublicAseanWorkshop} from '../MuseumLabStudent.jsx';
import {publicWorkshopHref} from '../aseanPublicWorkshop.js';
import {mobileRoute} from './mobileWorkshops.js';
import MuseumScene from '../MuseumScene.jsx';
import MuseumExhibitionDetail from '../MuseumExhibitionDetail.jsx';
import {isAsean} from '../aseanLesson.js';
import {installMuseumOffline} from '../offlineAccess.js';
import {createOfflineRuntime} from './runtime.js';
import {digest,expandCompactSnapshot,COMPACT_PAYLOAD_VERSION} from './snapshot.js';
import {groupWorkshopRows} from './workshopRows.js';
import './offline.css';

function OfflineApp({runtime,hash}){
 const [view,setView]=useState('app'),[groupId,setGroupId]=useState(''),[notice,setNotice]=useState('');
 const groupPicker=useRef(null);
 const {snapshot}=runtime,groups=snapshot.staff.groups;
 const selected=snapshot.groupDrafts[groupId];
 const group=groups.find(item=>item.id===groupId);
 const assignment=snapshot.staff.assignments.find(item=>item.id===group?.assignment_id);
 const gallery=selected?{
  ...selected.draft,
  lesson_template:assignment?.lesson_template??selected.draft.lesson_template,
  rooms:(selected.draft.rooms||[]).map((room,i)=>({
   ...room,id:room.id||'offline-room-'+i,
   exhibits:(room.exhibits||[]).map((exhibit,j)=>({
    ...exhibit,id:exhibit.id||'offline-exhibit-'+i+'-'+j,
    image_url:snapshot.artworks[groupId]?.find(asset=>asset.id===exhibit.asset_id)?.image_url||'',
    status:'published',
   })),
  })),
 }:null;
 const closeDraft=()=>{
  setGroupId('');
  window.requestAnimationFrame(()=>groupPicker.current?.focus());
 };
 return <div className="museum-offline-root" onClickCapture={event=>{
  const anchor=event.target.closest?.('a[href]');
  const href=anchor?.getAttribute('href')||'';
  if(anchor&&!anchor.download&&href!=='hoc-sinh/index.html'&&!/^(?:blob:|data:|#)/.test(href)){
   event.preventDefault();event.stopPropagation();setNotice('This reference is external. Its content is not included in this offline archive.');
  }
 }}>
  <header className="museum-offline-bar">
   <strong>Pétrus Ký School System</strong><span>Frozen evidence · Read only</span>
   <nav aria-label="Offline archive navigation">
    <button type="button" onClick={()=>setView('app')} aria-current={view==='app'?'page':undefined}>Museum Lab</button>
    <button type="button" onClick={()=>setView('work')} aria-current={view==='work'?'page':undefined}>Saved student work</button>
   </nav>
   <a href="#student-workshops">{groups.length} student workshops · Mobile</a>
   <details><summary>Archive details</summary><p>Viewing controls do not change this snapshot.</p>
    <p>Snapshot SHA-256: <code>{hash}</code></p><p>Checksums detect changes relative to this manifest; they are not a digital signature.</p>
    <ul>{snapshot.warnings.map((w,i)=><li key={i}>{w.lesson||w.group||''} {w.message}</li>)}</ul>
   </details>
  </header>
  {notice?<aside role="status" className="museum-offline-notice">{notice}<button onClick={()=>setNotice('')}>Close</button></aside>:null}
  {view==='app'?<MuseumLabApp language="en" currentUser={{id:snapshot.staff.profile.id}}/>:null}
  {view==='work'?<main className="bml museum-offline-records"><h1>Saved student work</h1>
   <p>Group drafts are preserved in their original state. Viewing a draft here does not mark it as submitted or approved.</p>
   <label>Choose a group <select ref={groupPicker} value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">Select…</option>
    {groups.map(g=><option key={g.id} value={g.id}>{snapshot.staff.assignments.find(a=>a.id===g.assignment_id)?.class_scope} · {g.label}</option>)}</select></label>
   {gallery&&isAsean(gallery)?<MuseumExhibitionDetail key={groupId} gallery={gallery} language="en"
    startInCinema startIn2D onBack={closeDraft}/>:gallery?<><h2>{gallery.title}</h2><p>{gallery.summary}</p>
    <MuseumScene gallery={gallery} language="en"/></>:groupId?<p>No saved draft was present in this snapshot.</p>:null}
  </main>:null}
  {view==='work'?<footer className="museum-offline-footer">PÉTRUS KÝ SCHOOL SYSTEM · Nguyễn Anh Tuấn · Teach Better Together</footer>:null}
 </div>;
}
function StudentBoard({runtime,legacy=false}){
 const [groupId,setGroupId]=useState('');
 const groups=groupWorkshopRows(runtime.snapshot);
 const hasTransfer=groups.some(group=>group.transfer!==null);
 const writingHeading=hasTransfer
  ?groups.some(group=>group.transfer===null)?'Final activity':'Group transfer card · Activity 6'
  :'Exit Ticket';
 const open=id=>{runtime.useStudent(id);setGroupId(id);};
 if(groupId){
  const group=groups.find(item=>item.id===groupId);
  return <div className="museum-offline-root">
   <header className="museum-offline-bar"><strong>Student workshop</strong><span>Frozen · {group?.label||'Group'} · Read only</span>
    <button type="button" onClick={()=>setGroupId('')}>All workshops</button><a href={legacy?"../PetrusKy_Museum_Offline.html":"#teacher"}>Teacher archive</a></header>
   <MuseumLabStudent key={groupId} language="en"/>
  </div>;
 }
 return <main className="bml museum-offline-records">
  <p>PÉTRUS KÝ · FROZEN · READ ONLY</p>
  <h1>{groups.length} student workshops</h1>
  <p>Each row opens that group’s saved practice. Nothing can be added, edited or deleted.</p>
  <p><a href={legacy?"../PetrusKy_Museum_Offline.html":"#teacher"}>Open the teacher archive</a></p>
  <div className="bml-frozen-table-wrap"><table className="bml-frozen-table"><thead><tr><th>#</th><th>Group</th><th>Class</th><th>Museum</th><th>{writingHeading}</th><th>Workshop</th><th>Mobile · VI / EN</th></tr></thead>
   <tbody>{groups.map((group,index)=><tr key={group.id}><td>{String(index+1).padStart(2,'0')}</td><td>{group.label}</td><td>{group.classScope}</td><td>{group.state}</td>
    <td>{group.transfer===null?(group.exit?'Submitted':'None'):(group.transfer?'On file':'No saved writing')}</td>
    <td><button type="button" onClick={()=>open(group.id)}>Open</button></td><td>{runtime.snapshot.publicWorkshops?.[group.id]?<><a href={publicWorkshopHref(group.id,'vi')}>VI</a> · <a href={publicWorkshopHref(group.id,'en')}>EN</a></>:'—'}</td></tr>)}</tbody></table></div>
 </main>;
}
function SharedArchive({runtime,hash}){
 const [route,setRoute]=useState(()=>location.hash);
 useEffect(()=>{
  const change=()=>{runtime.useStudent('');setRoute(location.hash);};
  window.addEventListener('hashchange',change);
  return ()=>window.removeEventListener('hashchange',change);
 },[runtime]);
 const mobile=mobileRoute(route);
 if(mobile)return <PublicAseanWorkshop key={mobile.id+mobile.language} groupId={mobile.id} language={mobile.language}/>;
 return route==='#student-workshops'?<StudentBoard runtime={runtime}/>:<OfflineApp runtime={runtime} hash={hash}/>;
}
async function boot(){
 const payload=JSON.parse(document.getElementById('museum-frozen-payload').textContent);
 if(payload.compactVersion!==undefined){
  if(payload.compactVersion!==COMPACT_PAYLOAD_VERSION||!Array.isArray(payload.images))throw new Error('Unsupported compact archive.');
  payload.snapshot=expandCompactSnapshot(payload.snapshot,payload.images);
 }
 const actual=await digest(JSON.stringify(payload.snapshot));
 if(actual!==payload.snapshotHash)throw new Error('The snapshot checksum does not match. Open the original archive again.');
 const runtime=createOfflineRuntime(payload.snapshot);installMuseumOffline(runtime);
 if(payload.mode==='student-board'){
  createRoot(document.getElementById('root')).render(<StudentBoard runtime={runtime} legacy/>);
  return;
 }
 if(payload.mode==='mobile'){
  createRoot(document.getElementById('root')).render(<PublicAseanWorkshop groupId={payload.groupId} language="vi"/>);
  return;
 }
 if(payload.mode==='student'){
  runtime.useStudent(payload.groupId);
  const group=payload.snapshot.staff.groups.find(item=>item.id===payload.groupId);
  createRoot(document.getElementById('root')).render(<div className="museum-offline-root">
   <header className="museum-offline-bar"><strong>Student workshop</strong><span>Frozen · {group?.label||'Group'} · Read only</span></header>
   <MuseumLabStudent language="en"/>
  </div>);
  return;
 }
 createRoot(document.getElementById('root')).render(<SharedArchive runtime={runtime} hash={actual}/>);
}
boot().catch(error=>{const root=document.getElementById('root');root.textContent='Unable to open this archive: '+error.message;});
