import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumLabApp from '../MuseumLabApp.jsx';
import MuseumLabStudent,{PublicAseanWorkshop} from '../MuseumLabStudent.jsx';
import {publicWorkshopHref} from '../aseanPublicWorkshop.js';
import {mobileRoute} from './mobileWorkshops.js';
import {ASEAN_PROJECT_OVERVIEW,ASEAN_EVIDENCE_PDF,getAseanPaperPlan} from '../aseanPaperPlan.js';
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
   <a href="#archive-home">Hồ sơ offline</a><a href="#student-workshops">{groups.length} student workshops · Mobile</a>
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
  <p>{!legacy&&<><a href="#archive-home">Hồ sơ offline</a> · </>}<a href={legacy?"../PetrusKy_Museum_Offline.html":"#teacher"}>Open the teacher archive</a></p>
  <div className="bml-frozen-table-wrap"><table className="bml-frozen-table"><thead><tr><th>#</th><th>Group</th><th>Class</th><th>Museum</th><th>{writingHeading}</th><th>Workshop</th><th>Mobile · VI / EN</th></tr></thead>
   <tbody>{groups.map((group,index)=><tr key={group.id}><td>{String(index+1).padStart(2,'0')}</td><td>{group.label}</td><td>{group.classScope}</td><td>{group.state}</td>
    <td>{group.transfer===null?(group.exit?'Submitted':'None'):(group.transfer?'On file':'No saved writing')}</td>
    <td><button type="button" onClick={()=>open(group.id)}>Open</button></td><td>{runtime.snapshot.publicWorkshops?.[group.id]?<><a href={publicWorkshopHref(group.id,'vi')}>VI</a> · <a href={publicWorkshopHref(group.id,'en')}>EN</a></>:'—'}</td></tr>)}</tbody></table></div>
 </main>;
}
function ArchiveHome({runtime,hash,info}){
 const [language,setLanguage]=useState('vi');
 const T=(vi,en)=>language==='vi'?vi:en;
 const snapshot=runtime.snapshot,groups=groupWorkshopRows(snapshot),mobile=groups.filter(g=>snapshot.publicWorkshops?.[g.id]);
 const plan=getAseanPaperPlan(language);
 const docs=[{...ASEAN_PROJECT_OVERVIEW,label:T('Phần 1 · Tổng quan dự án','Part 1 · Project overview')},{href:plan.href,filename:plan.filename,label:T('Phần 2 · Kế hoạch bài dạy và phụ lục','Part 2 · Teaching plan and appendices')},{href:ASEAN_EVIDENCE_PDF,filename:'ASEAN_11_3_Evidence.pdf',label:T('Minh chứng lớp 11.3 · Angkor','Class 11.3 evidence · Angkor')}];
 const catalogue=snapshot.galleries.find(g=>String(g.id).startsWith('asean-'));
 const count=mobile.length;
 return <main className="museum-onefile" lang={language}>
  <header className="museum-onefile-mast"><strong>PÉTRUS KÝ SCHOOL SYSTEM · @brian.universe</strong><span>OFFLINE / READ ONLY</span><div><button type="button" aria-pressed={language==='vi'} onClick={()=>setLanguage('vi')}>VI</button><button type="button" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></div></header>
  <div className="museum-onefile-hero"><p>{T('HỒ SƠ DỰ THI CẤP THÀNH PHỐ · 2026–2027','CITY-LEVEL COMPETITION DOSSIER · 2026–2027')}</p><h1>ASEAN IN<br/>THREE FRAMES.</h1><p>{T('Một tệp duy nhất · Tiếng Anh 11 · Lớp 11.3','One file · Grade 11 English · Class 11.3')}</p></div>
  <div className="museum-onefile-kpis"><div><strong>{groups.length}</strong>{T('Nhóm học sinh','Student groups')}</div><div><strong>{count}</strong>{T('Bản mobile','Mobile views')}</div><div><strong>06</strong>{T('Hoạt động học tập','Learning activities')}</div></div>
  <section className="museum-onefile-section"><h2>01 / {T('Bài dạy và minh chứng','Lesson and evidence')}</h2><div className="museum-onefile-actions">
   <a href="#/tool/immersive-gallery?dossier=1">{T('Mở bản giáo viên','Open teacher archive')} <span>↗</span></a>
   <a href="#student-workshops">{T('Bài thực hành học sinh','Student workshops')} <span>↗</span></a>
   {catalogue&&<a href={'#/tool/immersive-gallery?exhibition='+encodeURIComponent(catalogue.id)}>{T('Triển lãm 2D/3D','2D/3D exhibition')} <span>↗</span></a>}
  </div></section>
  <section className="museum-onefile-section"><h2>02 / {T('Bản mobile theo nhóm','Mobile views by group')}</h2><div className="museum-onefile-groups">{mobile.map((g,i)=><a key={g.id} href={publicWorkshopHref(g.id,language)}><span>{String(i+1).padStart(2,'0')}</span><strong>{language==='vi'?g.label:g.label.replace(/^Nhóm/,'Group')}</strong><small>{g.classScope} · {T('Mở','Open')} ↗</small></a>)}</div></section>
  <section className="museum-onefile-section"><h2>03 / {T('Tài liệu đính kèm','Attached documents')}</h2><div className="museum-onefile-actions">{docs.map(doc=><a key={doc.filename} href={doc.href} download={doc.filename}>{doc.label}<span>{doc.filename.endsWith('.docx')?'DOCX':'PDF'} ↓</span></a>)}</div><p>{T('Tài liệu Word/PDF được nhúng trong HTML này; chỉ tải riêng khi cần.','Word/PDF documents are embedded in this HTML; extract only if needed.')}</p></section>
  <section className="museum-onefile-section"><h2>04 / {T('Hướng dẫn và xác thực','Help and verification')}</h2><p>{T('Mở HTML bằng Chrome hoặc Edge. Không cần mạng, máy chủ hoặc đăng nhập. Nội dung đã khóa; các nút chuyển hoạt động chỉ thay đổi cách xem. YouTube và trang ngoài cần mạng; giọng đọc cần giọng en-US cài sẵn.','Open this HTML in Chrome or Edge. No network, server or sign-in required. Records are frozen; navigation only changes the view. YouTube and external sites require internet; narration requires an installed en-US voice.')}</p><details><summary>{T('Thông tin bản lưu và SHA-256','Archive details and SHA-256')}</summary><p>{snapshot.startedAt} — {snapshot.completedAt}</p><p>Build: {info?.applicationBuild||'—'}</p><p>Snapshot SHA-256: <code>{hash}</code></p><p>{T('Mã kiểm tra phát hiện thay đổi dữ liệu, không phải chữ ký số. Người có tệp có thể đọc dữ liệu được nhúng.','Checksum detects data changes; it is not a digital signature. Anyone holding this file can read its embedded records.')}</p><ul>{(snapshot.warnings||[]).map((w,i)=><li key={i}>{w.lesson||w.group||''} {w.message}</li>)}</ul></details></section>
  <footer>© PÉTRUS KÝ SCHOOL SYSTEM · Nguyễn Anh Tuấn · Museum Lab</footer>
 </main>;
}
function SharedArchive({runtime,hash,single=false,info}){
 const [route,setRoute]=useState(()=>location.hash);
 useEffect(()=>{
  const change=()=>{runtime.useStudent('');setRoute(location.hash);};
  window.addEventListener('hashchange',change);
  return ()=>window.removeEventListener('hashchange',change);
 },[runtime]);
 if(single&&(!route||route==='#archive-home'))return <ArchiveHome runtime={runtime} hash={hash} info={info}/>;
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
 createRoot(document.getElementById('root')).render(<SharedArchive runtime={runtime} hash={actual} single={payload.mode==='all-in-one'} info={payload.archiveInfo}/>);
}
boot().catch(error=>{const root=document.getElementById('root');root.textContent='Unable to open this archive: '+error.message;});
