import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumLabApp from '../MuseumLabApp.jsx';
import MuseumLabStudent from '../MuseumLabStudent.jsx';
import MuseumScene from '../MuseumScene.jsx';
import {installMuseumOffline} from '../offlineAccess.js';
import {createOfflineRuntime} from './runtime.js';
import {digest} from './snapshot.js';
import './offline.css';

function OfflineApp({runtime,hash}){
 const [view,setView]=useState('app'),[groupId,setGroupId]=useState(''),[notice,setNotice]=useState('');
 const {snapshot}=runtime,groups=snapshot.staff.groups;
 const selected=snapshot.groupDrafts[groupId];
 const gallery=selected?{...selected.draft,rooms:(selected.draft.rooms||[]).map((r,i)=>({...r,id:r.id||'offline-room-'+i,exhibits:(r.exhibits||[]).map((e,j)=>({...e,id:e.id||'offline-exhibit-'+i+'-'+j,image_url:runtime.snapshot.artworks[groupId]?.find(a=>a.id===e.asset_id)?.image_url||'',status:'published'}))}))}:null;
 const evidence=Object.values(snapshot.evidence);
 const groupLabel=id=>groups.find(g=>g.id===id)?.label||id||'—';
 return <div className="museum-offline-root" onClickCapture={event=>{
  const anchor=event.target.closest?.('a[href]');
  if(anchor&&!anchor.download&&!/^(?:blob:|data:|#)/.test(anchor.getAttribute('href')||'')){
   event.preventDefault();event.stopPropagation();setNotice('This reference is external. Its content is not included in this offline archive.');
  }
 }}>
  <header className="museum-offline-bar">
   <strong>BRIAN Museum Lab</strong><span>Frozen evidence · Read only</span>
   <nav aria-label="Offline archive navigation">
    <button type="button" onClick={()=>setView('app')} aria-current={view==='app'?'page':undefined}>Museum Lab</button>
    <button type="button" onClick={()=>setView('work')} aria-current={view==='work'?'page':undefined}>Saved student work</button>
    <button type="button" onClick={()=>setView('records')} aria-current={view==='records'?'page':undefined}>Evidence records</button>
   </nav>
   <a href="hoc-sinh/index.html">10 student workshops</a>
   <details><summary>Archive details</summary><p>Captured from {snapshot.startedAt} to {snapshot.completedAt}. Viewing controls do not change this snapshot.</p>
    <p>Snapshot SHA-256: <code>{hash}</code></p><p>Checksums detect changes relative to this manifest; they are not a digital signature.</p>
    <ul>{snapshot.warnings.map((w,i)=><li key={i}>{w.lesson||w.group||''} {w.message}</li>)}</ul>
   </details>
  </header>
  {notice?<aside role="status" className="museum-offline-notice">{notice}<button onClick={()=>setNotice('')}>Close</button></aside>:null}
  {view==='app'?<MuseumLabApp language="en" currentUser={{id:snapshot.staff.profile.id}}/>:null}
  {view==='work'?<main className="bml museum-offline-records"><h1>Saved student work</h1>
   <p>Group drafts are preserved in their original state. Viewing a draft here does not mark it as submitted or approved.</p>
   <label>Choose a group <select value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">Select…</option>
    {groups.map(g=><option key={g.id} value={g.id}>{snapshot.staff.assignments.find(a=>a.id===g.assignment_id)?.class_scope} · {g.label}</option>)}</select></label>
   {gallery?<><h2>{gallery.title}</h2><p>{gallery.summary}</p><MuseumScene gallery={gallery} language="en"/></>:groupId?<p>No saved draft was present in this snapshot.</p>:null}
  </main>:null}
  {view==='records'?<main className="bml museum-offline-records"><h1>Frozen classroom evidence</h1>
   <p>Recorded responses, feedback and original provenance are preserved. Empty sections mean no saved records were available.</p>
   {evidence.map(bundle=><section className="bml-surface" key={bundle.assignment.id}>
    <h2>{bundle.assignment.title} · {bundle.assignment.class_scope}</h2>
    {bundle.presentationProvenance?<p><strong>Source note: </strong>{bundle.presentationProvenance.teacher_visible_note||bundle.presentationProvenance.data_origin}</p>:null}
    <h3>Survey</h3><p>N = {bundle.survey?.n??'—'} groups</p>
    <ul>{bundle.survey?.options?.map((o,i)=><li key={i}>{o.label}: {o.count} ({o.percent}%)</li>)}</ul>
    <details><summary>Activity responses ({bundle.responses?.length||0})</summary>
     {(bundle.responses||[]).map((r,i)=><article key={i}><strong>{groupLabel(r.group_id)} · Activity {r.stage_index+1}</strong>
      <p>{typeof r.value==='string'?r.value:Object.entries(r.value||{}).map(([key,val])=>key+': '+(Array.isArray(val)?val.join(', '):String(val))).join(' · ')}</p><small>{r.created_at}</small></article>)}
    </details>
    <details><summary>Peer feedback ({bundle.feedback?.length||0})</summary>{(bundle.feedback||[]).map((r,i)=><article key={i}>
     <strong>{groupLabel(r.from_group)} → {groupLabel(r.to_group)}</strong><p>{r.learned}</p><p>{r.clarify}</p><small>{r.created_at}</small></article>)}</details>
    <details><summary>Thinking challenges ({bundle.microResponses?.length||0})</summary>{(bundle.microResponses||[]).map((r,i)=><article key={i}><strong>{groupLabel(r.group_id)} · Activity {r.stage_index+1}</strong><p>{r.reason}</p></article>)}</details>
   </section>)}
   {!evidence.length?<p>No recorded live sessions were available at export. Lesson plans and saved work remain accessible.</p>:null}
  </main>:null}
  {view!=='app'?<footer className="museum-offline-footer">PÉTRUS KÝ SCHOOL SYSTEM · Nguyễn Anh Tuấn · Teach Better Together</footer>:null}
 </div>;
}
function StudentBoard({runtime}){
 const [groupId,setGroupId]=useState('');
 const groups=[...runtime.snapshot.staff.groups].sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),undefined,{numeric:true}));
 const open=id=>{runtime.useStudent(id);setGroupId(id);};
 if(groupId){
  const group=groups.find(item=>item.id===groupId);
  return <div className="museum-offline-root">
   <header className="museum-offline-bar"><strong>Student workshop</strong><span>Frozen · {group?.label||'Group'} · Read only</span>
    <button type="button" onClick={()=>setGroupId('')}>All workshops</button><a href="../BRIAN_Museum_Offline.html">Teacher archive</a></header>
   <MuseumLabStudent key={groupId} language="en"/>
  </div>;
 }
 return <main className="bml museum-offline-records">
  <p>PÉTRUS KÝ · FROZEN · READ ONLY</p>
  <h1>10 student workshops</h1>
  <p>Each row opens that group’s saved practice. Nothing can be added, edited or deleted.</p>
  <p><a href="../BRIAN_Museum_Offline.html">Open the teacher archive</a></p>
  <table className="bml-frozen-table"><thead><tr><th>#</th><th>Group</th><th>Class</th><th>Museum</th><th></th></tr></thead>
   <tbody>{groups.map((group,index)=>{
    const lesson=runtime.snapshot.staff.assignments.find(item=>item.id===group.assignment_id);
    return <tr key={group.id}><td>{String(index+1).padStart(2,'0')}</td><td>{group.label}</td><td>{lesson?.class_scope||''}</td><td>{group.state}</td>
     <td><button type="button" onClick={()=>open(group.id)}>Open</button></td></tr>;
   })}</tbody></table>
 </main>;
}
async function boot(){
 const payload=JSON.parse(document.getElementById('museum-frozen-payload').textContent);
 const actual=await digest(JSON.stringify(payload.snapshot));
 if(actual!==payload.snapshotHash)throw new Error('The snapshot checksum does not match. Open the original archive again.');
 const runtime=createOfflineRuntime(payload.snapshot);installMuseumOffline(runtime);
 if(payload.mode==='student-board'){
  createRoot(document.getElementById('root')).render(<StudentBoard runtime={runtime}/>);
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
 createRoot(document.getElementById('root')).render(<OfflineApp runtime={runtime} hash={actual}/>);
}
boot().catch(error=>{const root=document.getElementById('root');root.textContent='Unable to open this archive: '+error.message;});
