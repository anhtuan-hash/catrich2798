import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumLabApp from '../MuseumLabApp.jsx';
import MuseumLabStudent,{PublicAseanWorkshop} from '../MuseumLabStudent.jsx';
import {publicWorkshopHref} from '../aseanPublicWorkshop.js';
import {mobileRoute} from './mobileWorkshops.js';
import {ASEAN_PROJECT_OVERVIEW,ASEAN_EVIDENCE_PDF,getAseanPaperPlan} from '../aseanPaperPlan.js';
import MuseumScene from '../MuseumScene.jsx';
import MuseumExhibitionDetail from '../MuseumExhibitionDetail.jsx';
import {isAsean,ASEAN_TEMPLATE,aseanDestination} from '../aseanLesson.js';
import ContestMasthead from '../../contest/ContestMasthead.jsx';
import {Presentation,BookOpen,Box,FileText,Monitor,LockKeyhole,WifiOff,Globe,ArrowUpRight,ArrowRight} from 'lucide-react';
import {installMuseumOffline} from '../offlineAccess.js';
import {createOfflineRuntime} from './runtime.js';
import {digest,expandCompactSnapshot,COMPACT_PAYLOAD_VERSION} from './snapshot.js';
import {groupWorkshopRows} from './workshopRows.js';
import './offline.css';
import UnifiedArchive from './UnifiedArchive.jsx';

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
   <a href="#archive-home">Archive home</a><a href="#student-workshops">{groups.length} student workshops · Mobile</a>
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
  <p>{!legacy&&<><a href="#archive-home">Archive home</a> · </>}<a href={legacy?"../PetrusKy_Museum_Offline.html":"#teacher"}>Open the teacher archive</a></p>
  <div className="bml-frozen-table-wrap"><table className="bml-frozen-table"><thead><tr><th>#</th><th>Group</th><th>Class</th><th>Museum</th><th>{writingHeading}</th><th>Workshop</th><th>Mobile · VI / EN</th></tr></thead>
   <tbody>{groups.map((group,index)=><tr key={group.id}><td>{String(index+1).padStart(2,'0')}</td><td>{group.label}</td><td>{group.classScope}</td><td>{group.state}</td>
    <td>{group.transfer===null?(group.exit?'Submitted':'None'):(group.transfer?'On file':'No saved writing')}</td>
    <td><button type="button" onClick={()=>open(group.id)}>Open</button></td><td>{runtime.snapshot.publicWorkshops?.[group.id]?<><a href={publicWorkshopHref(group.id,'vi')}>VI</a> · <a href={publicWorkshopHref(group.id,'en')}>EN</a></>:'—'}</td></tr>)}</tbody></table></div>
 </main>;
}
// Official school and author names are preserved in both interface languages.
const ARCHIVE_BRAND='PÉTRUS KÝ SCHOOL SYSTEM · @brian.universe';
const ARCHIVE_CREDIT='© PÉTRUS KÝ SCHOOL SYSTEM · Nguyễn Anh Tuấn · Museum Lab';
function ArchiveHome({runtime,hash,info,archiveLanguage,onArchiveLanguageChange}){
 const [localLanguage,setLocalLanguage]=useState('vi');
 const language=archiveLanguage||localLanguage;
 const setLanguage=onArchiveLanguageChange||setLocalLanguage;
 const T=(vi,en)=>language==='vi'?vi:en;
 const snapshot=runtime.snapshot,groups=groupWorkshopRows(snapshot),mobile=groups.filter(g=>snapshot.publicWorkshops?.[g.id]);
 const plan=getAseanPaperPlan(language);
 const docs=[{...ASEAN_PROJECT_OVERVIEW,label:T('Phần 1 · Tổng quan dự án','Part 1 · Project overview')},{href:plan.href,filename:plan.filename,label:T('Phần 2 · Kế hoạch bài dạy và phụ lục','Part 2 · Teaching plan and appendices')},{href:ASEAN_EVIDENCE_PDF,filename:'ASEAN_11_3_Evidence.pdf',label:T('Minh chứng lớp 11.3 · Đối chiếu Angkor','Class 11.3 evidence · Angkor comparison')}];
 const catalogue=snapshot.galleries.find(g=>String(g.id).startsWith('asean-'));
 const imageFor=g=>{
  const w=snapshot.publicWorkshops?.[g?.id]?.main;
  if(!w)return '';
  const exhibits=(w.draft?.rooms||[]).flatMap(r=>r.exhibits||[]);
  const assetId=exhibits.find(e=>e.kind==='image'&&e.asset_id)?.asset_id||Object.values(w.draft?.artworks||{}).find(Boolean);
  return w.assets?.find(a=>a.id===assetId)?.image_url||w.assets?.find(a=>a.image_url?.startsWith('data:image/'))?.image_url||'';
 };
 const angkor=mobile.find(g=>aseanDestination(g.label)?.name==='Angkor');
 const coverGroup=angkor||mobile[0],cover=imageFor(coverGroup);
 const actions=[
  {Icon:Presentation,href:'#/tool/immersive-gallery?dossier=1',title:T('Mở bản giáo viên','Open teacher archive'),desc:T('Bài dạy, tiến trình, học liệu và rubric','Lesson, teaching sequence, materials and rubric')},
  {Icon:BookOpen,href:'#student-workshops',title:T('Bài thực hành học sinh','Student workshops'),desc:T('6 hoạt động theo mô hình STEM/STEAM','Six STEM/STEAM learning activities')},
  ...(catalogue?[{Icon:Box,href:'#/tool/immersive-gallery?exhibition='+encodeURIComponent(catalogue.id),title:T('Triển lãm 2D / 3D','2D / 3D exhibition'),desc:T('Không gian trưng bày sản phẩm các nhóm','Gallery of group learning products')}]:[])
 ];
 const guides=[
  {Icon:Monitor,title:T('Mở offline','Open offline'),desc:T('Mở HTML bằng Chrome hoặc Edge.','Open HTML in Chrome or Edge.')},
  {Icon:LockKeyhole,title:T('Chỉ đọc','Read only'),desc:T('Không chỉnh sửa hoặc nộp dữ liệu.','No editing or submitting.')},
  {Icon:WifiOff,title:T('Không cần mạng','No network needed'),desc:T('Bài làm và học liệu đã được lưu.','Saved work and embedded materials.')},
  {Icon:Globe,title:T('Lưu ý','Note'),desc:T('YouTube và trang ngoài cần Internet; giọng đọc cần giọng en-US có sẵn.','YouTube and external sites need internet; narration needs an installed en-US voice.')}
 ];
 const heading=(num,label)=><h2 className="museum-editorial-heading"><span>{num} /</span>{label}</h2>;
 return <main className="museum-onefile museum-editorial-home" lang={language}>
  {!archiveLanguage&&<header className="museum-onefile-mast"><strong>{ARCHIVE_BRAND}</strong><span>OFFLINE / READ ONLY</span><div><button type="button" aria-pressed={language==='vi'} onClick={()=>setLanguage('vi')}>VI</button><button type="button" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></div></header>}
  <div className="museum-editorial-banner"><ContestMasthead language={language} lessonTemplate={ASEAN_TEMPLATE}/></div>
  <div className="museum-onefile-kpis"><div><strong>{String(groups.length).padStart(2,'0')}</strong><span>{T('Nhóm học sinh','Student groups')}</span></div><div><strong>{String(mobile.length).padStart(2,'0')}</strong><span>{T('Bản thực hành trực tuyến','Online student workshops')}</span></div><div><strong>06</strong><span>{T('Hoạt động học tập','Learning activities')}</span></div></div>
  <section className="museum-onefile-section museum-editorial-intro">
   <div className="museum-editorial-intro-copy">{heading('01',T('Bài dạy và minh chứng','Lesson and evidence'))}<p>{T('Kế hoạch bài dạy, học liệu, minh chứng triển khai và sản phẩm học tập của lớp 11.3.','Teaching plan, materials, classroom evidence and learning products of class 11.3.')}</p></div>
   <div className="museum-onefile-actions">{actions.map(({Icon,href,title,desc})=><a key={href} href={href}><Icon size={24} aria-hidden="true"/><div><strong>{title}</strong><small>{desc}</small></div><ArrowUpRight size={18} aria-hidden="true"/></a>)}</div>
   {cover&&<figure className="museum-editorial-cover"><img src={cover} alt={aseanDestination(coverGroup.label)?.name||coverGroup.label}/><figcaption>{aseanDestination(coverGroup.label)?.name} · {coverGroup.label}</figcaption></figure>}
  </section>
  <section className="museum-onefile-section museum-editorial-workshops"><div className="museum-editorial-sectionbar"><div>{heading('02',T('Bản thực hành trực tuyến của học sinh','Online student workshops'))}<p>{T('Xem bản lưu ngoại tuyến của bài thực hành, kết quả và sản phẩm từng nhóm.','View the offline copies of each group’s published workshop, results and products.')}</p></div><a className="museum-editorial-all" href="#student-workshops">{T('Xem toàn bộ '+mobile.length+' nhóm','View all '+mobile.length+' groups')} <ArrowRight size={18}/></a></div>
   <div className="museum-onefile-groups">{mobile.map((g,i)=>{const dest=aseanDestination(g.label),photo=imageFor(g);return <article key={g.id} className="museum-editorial-group"><div className="museum-editorial-group-copy"><span className="museum-editorial-number">{String(i+1).padStart(2,'0')}</span><strong>{language==='vi'?g.label:g.label.replace(/^Nhóm/,'Group')}</strong><small>{g.classScope} · {dest?.name}</small><div className="museum-editorial-langs"><a href={publicWorkshopHref(g.id,'vi')} aria-label={g.label+' · Vietnamese'}>VI</a><a href={publicWorkshopHref(g.id,'en')} aria-label={g.label+' · English'}>EN</a></div></div>{photo&&<a className="museum-editorial-thumb" href={publicWorkshopHref(g.id,language)} aria-label={g.label+' · '+(dest?.name||'Workshop')}><img src={photo} alt={dest?.name||g.label}/></a>}</article>})}</div>
  </section>
  <div className="museum-editorial-bottom">
   <section className="museum-onefile-section">{heading('03',T('Tài liệu đính kèm','Attached documents'))}<div className="museum-editorial-docs">{docs.map(doc=><a key={doc.filename} href={doc.href} download={doc.filename}><FileText size={20}/><strong>{doc.label}</strong><small>{doc.filename.endsWith('.docx')?'DOCX':'PDF'}</small><ArrowRight size={17}/></a>)}</div></section>
   <section className="museum-onefile-section">{heading('04',T('Hướng dẫn sử dụng','User guide'))}<div className="museum-editorial-guide">{guides.map(({Icon,title,desc})=><div key={title}><Icon size={28}/><strong>{title}</strong><small>{desc}</small></div>)}</div><details><summary>{T('Thông tin bản lưu và SHA-256','Archive details and SHA-256')}</summary><p>{snapshot.startedAt} — {snapshot.completedAt}</p><p>Build: {info?.applicationBuild||'—'}</p><p>Snapshot SHA-256: <code>{hash}</code></p><p>{T('Mã kiểm tra phát hiện thay đổi dữ liệu, không phải chữ ký số. Người có tệp có thể đọc dữ liệu được nhúng.','Checksum detects changes; it is not a digital signature. Anyone holding this file can read its embedded records.')}</p><ul>{(snapshot.warnings||[]).map((w,i)=><li key={i}>{w.lesson||w.group||''} {w.message}</li>)}</ul></details></section>
  </div>
  <footer><span>{ARCHIVE_CREDIT}</span><span className="museum-editorial-mark" aria-hidden="true">///</span></footer>
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
 createRoot(document.getElementById('root')).render(payload.mode==='all-in-one'&&import.meta.env.MUSEUM_LAB_STANDALONE?<UnifiedArchive runtime={runtime} hash={actual} info={payload.archiveInfo} HomePage={ArchiveHome}/>:<SharedArchive runtime={runtime} hash={actual} single={payload.mode==='all-in-one'} info={payload.archiveInfo}/>);
}
boot().catch(error=>{const root=document.getElementById('root');root.textContent='Unable to open this archive: '+error.message;});
