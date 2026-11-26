import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Home,Presentation,Layers,Users,Box,FileText,LockKeyhole,ArrowUpRight,ArrowLeft,Download,LayoutGrid,BookOpen,Radio,ClipboardCheck,Eye} from 'lucide-react';
import MuseumLabApp from '../MuseumLabApp.jsx';
import MuseumLabStudent,{PublicAseanWorkshop} from '../MuseumLabStudent.jsx';
import MuseumScene from '../MuseumScene.jsx';
import GalleryRenderBoundary from '../../GalleryRenderBoundary.jsx';
import {ASEAN_PROJECT_OVERVIEW,ASEAN_EVIDENCE_PDF,getAseanPaperPlan} from '../aseanPaperPlan.js';
import {aseanDestination,ASEAN_TEMPLATE,isAsean} from '../aseanLesson.js';
import {publicWorkshopHref} from '../aseanPublicWorkshop.js';
import ContestMasthead from '../../contest/ContestMasthead.jsx';
import {groupWorkshopRows} from './workshopRows.js';
import './unifiedArchive.css';

const T=(lang,vi,en)=>lang==='en'?en:vi;
const BRAND='PÉTRUS KÝ SCHOOL SYSTEM · @brian.universe';
const COPYRIGHT='PÉTRUS KÝ SCHOOL SYSTEM · ASEAN IN THREE FRAMES';
const NAV=[
 ['home','#archive-home',Home,'Trang chủ','Home'],
 ['teacher','#teacher?tab=evidence',Presentation,'Bản giáo viên','Teacher archive'],
 ['saved','#saved-work',Layers,'Bài làm đã lưu','Saved student work'],
 ['student','#student-workshops',Users,'Bản thực hành học sinh','Student workshops'],
 ['exhibitions','#exhibitions',Box,'Triển lãm 2D/3D','2D/3D exhibitions'],
 ['documents','#documents',FileText,'Tài liệu','Documents']
];
const TEACHER=[
 ['evidence','Hồ sơ bài dạy','Teaching dossier',FileText],
 ['home','Tổng quan','Overview',Home],
 ['lessons','Bài học','Lessons',BookOpen],
 ['submissions','Bài nộp','Submissions',ClipboardCheck],
 ['templates','Kế hoạch dạy','Teaching plan',FileText],
 ['live','Điều phối lớp','Live class',Radio],
];
const groupName=(g,l)=>l==='en'?String(g?.label||'').replace(/^Nhóm/,'Group'):g?.label||'';
const formatNum=n=>String(n).padStart(2,'0');
const href=(path,p={})=>path+(Object.keys(p).length?'?'+new URLSearchParams(p).toString():'');
export function archiveRoute(hash){
 const [path,query='']=String(hash||'').split('?');
 const p=new URLSearchParams(query),group=p.get('viewGroup')||p.get('group')||'';
 if(path==='#/gallery-create'&&group)return {section:'student',group,mobile:true,lang:p.get('lang')};
 if(path==='#student-workshops')return {section:'student',group};
 if(path==='#saved-work')return {section:'saved',group};
 if(path==='#documents')return {section:'documents'};
 if(path==='#exhibitions'||p.has('exhibition'))return {section:'exhibitions',exhibition:p.get('exhibition')||'',format:p.get('format')==='3d'?'3d':'2d'};
 if(path==='#teacher'||path==='#/tool/immersive-gallery')return {section:'teacher',tab:TEACHER.some(t=>t[0]===p.get('tab'))?p.get('tab'):(p.has('dossier')||path==='#teacher'?'evidence':'home'),review:p.get('review')||''};
 return {section:'home'};
}
function Header({language,setLanguage,section}){
 const ref=useRef(null);
 useLayoutEffect(()=>{
  const update=()=>document.documentElement.style.setProperty('--archive-nav-height',ref.current?.offsetHeight+'px');
  update();const observer=typeof ResizeObserver==='function'?new ResizeObserver(update):null;
  if(ref.current)observer?.observe(ref.current);window.addEventListener('resize',update);
  return()=>{observer?.disconnect();window.removeEventListener('resize',update);document.documentElement.style.removeProperty('--archive-nav-height');};
 },[]);
 return <header className="museum-unified-nav" ref={ref} lang={language}>
  <div className="museum-unified-brand"><a href="#archive-home">{BRAND}</a><span className="museum-unified-edition">{T(language,'HỒ SƠ DỰ THI · 2026–2027','COMPETITION DOSSIER · 2026–2027')}</span><span className="museum-unified-status"><LockKeyhole size={15}/>{T(language,'Ngoại tuyến · Chỉ đọc · Dữ liệu đã khóa','Offline · Read only · Frozen evidence')}</span><div className="museum-unified-language" role="group" aria-label={T(language,'Ngôn ngữ','Language')}><button aria-pressed={language==='vi'} onClick={()=>setLanguage('vi')}>VI</button><button aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></div></div>
  <nav aria-label={T(language,'Điều hướng hồ sơ','Archive navigation')}>{NAV.map(([id,url,Icon,vi,en])=><a key={id} href={url} aria-current={section===id?'page':undefined}><Icon size={21} aria-hidden="true"/><span>{T(language,vi,en)}</span></a>)}</nav>
 </header>;
}
function PageTitle({number,title,description,count,label}){
 return <div className="museum-unified-title"><div><span className="museum-unified-number">{number} /</span><h1>{title}</h1><p>{description}</p></div>{count!=null&&<aside><strong>{formatNum(count)}</strong><span>{label}</span></aside>}</div>;
}
function Banner({language}){return <div className="museum-editorial-banner"><ContestMasthead language={language} lessonTemplate={ASEAN_TEMPLATE}/></div>;}
function photo(snapshot,group){
 const w=snapshot.publicWorkshops?.[group.id]?.main;
 const assets=w?.assets||snapshot.artworks?.[group.id]||[];
 const draft=w?.draft||snapshot.groupDrafts?.[group.id]?.draft;
 const exhibits=(draft?.rooms||[]).flatMap(r=>r.exhibits||[]);
 const id=exhibits.find(e=>e.title==='Place'&&e.asset_id)?.asset_id||exhibits.find(e=>e.asset_id)?.asset_id||Object.values(draft?.artworks||{}).find(Boolean);
 return assets.find(a=>a.id===id)?.image_url||assets.find(a=>a.image_url?.startsWith('data:image/'))?.image_url||'';
}
function WorkshopList({runtime,language}){
 const groups=groupWorkshopRows(runtime.snapshot),t=(vi,en)=>T(language,vi,en);
 return <main className="museum-unified-page"><PageTitle number="03" title={t('Bản thực hành trực tuyến của học sinh','Online student workshops')} description={t('Mở bản lưu ngoại tuyến của từng nhóm. Không thêm, sửa hoặc xóa dữ liệu.','Open each group’s saved offline workshop. No adding, editing or deleting records.')} count={groups.length} label={t('Nhóm thực hành','Student groups')}/>
  <div className="museum-unified-tablewrap"><table className="museum-unified-table"><thead><tr>{[t('STT','No.'),t('Nhóm','Group'),t('Lớp','Class'),t('Bảo tàng','Museum'),t('Bài viết nhóm · Hoạt động 6','Group transfer card · Activity 6'),t('Bài thực hành','Workshop'),'VI / EN'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{groups.map((g,i)=>{
    const published=g.state==='published',has=Boolean(runtime.snapshot.publicWorkshops?.[g.id]);
    return <tr key={g.id}><td>{formatNum(i+1)}</td><td><strong>{groupName(g,language)}</strong><small>{aseanDestination(g.label)?.name}</small></td><td>{g.classScope}</td><td>{published?t('Đã công bố','Published'):g.state}</td><td>{g.transfer===null?(g.exit?t('Đã nộp','Submitted'):t('Chưa có','None')):g.transfer?t('Đã lưu','On file'):t('Chưa có bản lưu','No saved writing')}</td><td><a className="museum-unified-open" href={has?publicWorkshopHref(g.id,language):href('#student-workshops',{group:g.id})}>{t('Mở','Open')} <ArrowUpRight size={15}/></a></td><td>{has?<div className="museum-unified-group-langs"><a href={publicWorkshopHref(g.id,'vi')}>VI</a><a href={publicWorkshopHref(g.id,'en')}>EN</a></div>:'—'}</td></tr>;
  })}</tbody></table></div>
 </main>;
}
function SavedWork({runtime,language,groupId}){
 const snapshot=runtime.snapshot,groups=groupWorkshopRows(snapshot),t=(vi,en)=>T(language,vi,en);
 const [filter,setFilter]=useState('');
 const group=groups.find(g=>g.id===groupId),selected=snapshot.groupDrafts[groupId];
 const assignment=snapshot.staff.assignments.find(a=>a.id===snapshot.staff.groups.find(g=>g.id===groupId)?.assignment_id);
 const gallery=selected?{...selected.draft,lesson_template:assignment?.lesson_template??selected.draft.lesson_template,rooms:(selected.draft.rooms||[]).map((room,i)=>({...room,id:room.id||'offline-room-'+i,exhibits:(room.exhibits||[]).map((e,j)=>({...e,id:e.id||'offline-exhibit-'+i+'-'+j,image_url:snapshot.artworks[groupId]?.find(a=>a.id===e.asset_id)?.image_url||e.image_url||'',status:'published'}))}))}:null;
 return <main className="museum-unified-page"><PageTitle number="02" title={t('Bài làm đã lưu','Saved student work')} description={t('Bản nháp của nhóm được giữ nguyên trạng thái gốc. Xem tại đây không thay đổi trạng thái nộp hoặc duyệt.','Group drafts are preserved in their original state. Viewing them does not change submission or approval status.')} count={groups.filter(g=>g.draft).length} label={t('Bài làm đã lưu','Saved group works')}/>
  {groupId?<><div className="museum-unified-subbar"><a href="#saved-work"><ArrowLeft size={18}/>{t('Tất cả nhóm','All groups')}</a><strong>{groupName(group,language)} · {group?.classScope}</strong></div>{gallery?<div className="museum-unified-scene bml"><GalleryRenderBoundary language={language} onFallback={()=>{location.hash='#saved-work';}}><MuseumScene key={groupId} gallery={gallery} language={language} embedded cinema startIn2D onClose={()=>{location.hash='#saved-work';}}/></GalleryRenderBoundary></div>:<p>{t('Không có bản nháp trong hồ sơ này.','No draft is present in this archive.')}</p>}</>:<>
  <div className="museum-unified-subbar"><label>{t('Chọn nhóm','Filter groups')} <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{t('Tất cả nhóm','All groups')} ({groups.length})</option>{groups.map(g=><option key={g.id} value={g.id}>{groupName(g,language)}</option>)}</select></label></div>
  <div className="museum-unified-cards">{groups.filter(g=>!filter||g.id===filter).map(g=><article key={g.id}>{photo(snapshot,g)&&<img src={photo(snapshot,g)} alt={aseanDestination(g.label)?.name||groupName(g,language)}/>}<span className="museum-unified-card-number">{formatNum(groups.indexOf(g)+1)}</span><strong>{groupName(g,language)} · {g.classScope}</strong><small>{aseanDestination(g.label)?.name}</small><a href={href('#saved-work',{group:g.id})}><Eye size={16}/>{t('Xem bài làm','View saved work')}<ArrowUpRight size={16}/></a></article>)}</div></>}
 </main>;
}
function Exhibitions({runtime,language,route}){
 const s=runtime.snapshot,t=(vi,en)=>T(language,vi,en);
 const galleries=(s.galleries||[]).filter(g=>isAsean(g));
 const primary=galleries.find(g=>String(g.id).startsWith('asean-'))||galleries[0];
 const target=route.exhibition?galleries.find(g=>g.id===route.exhibition||g.slug===route.exhibition||g.rooms?.some(r=>r.exhibition_id===route.exhibition)):null;
 const room=Math.max(0,target?.rooms?.findIndex(r=>r.exhibition_id===route.exhibition)||0);
 const groups=groupWorkshopRows(s),cover=groups.find(g=>aseanDestination(g.label)?.name==='Angkor')||groups[0];
 const galleryLink=(id,format)=>href('#exhibitions',{exhibition:id,format});
 if(route.exhibition&&target)return <main className="museum-unified-page museum-unified-gallery-view"><div className="museum-unified-subbar"><a href="#exhibitions"><ArrowLeft size={18}/>{t('Về triển lãm','Back to exhibitions')}</a><strong>{target.title}</strong><div className="museum-unified-group-langs"><a aria-current={route.format==='2d'?'page':undefined} href={galleryLink(route.exhibition,'2d')}>2D</a><a aria-current={route.format==='3d'?'page':undefined} href={galleryLink(route.exhibition,'3d')}>3D</a></div></div><div className="museum-unified-scene bml"><GalleryRenderBoundary language={language} onFallback={()=>{location.hash='#exhibitions';}}><MuseumScene key={route.exhibition+route.format} gallery={target} language={language} embedded cinema initial3D initialRoomIndex={room} startIn2D={route.format!=='3d'} onClose={()=>{location.hash='#exhibitions';}}/></GalleryRenderBoundary></div></main>;
 return <main className="museum-unified-page"><Banner language={language}/><PageTitle number="04" title={t('Triển lãm 2D / 3D','2D / 3D exhibitions')} description={t('Không gian trưng bày các sản phẩm học tập đã công bố.','Explore the published learning products in two exhibition formats.')} count={primary?.rooms?.length||0} label={t('Phòng triển lãm','Exhibition rooms')}/>
 {primary?<><div className="museum-unified-exhibition-cards">{['2d','3d'].map(mode=><article key={mode}><div><span>{mode.toUpperCase()}</span><h2>{mode==='2d'?t('Triển lãm 2D','2D exhibition'):t('Phòng triển lãm 3D','3D museum')}</h2></div>{cover&&photo(s,cover)&&<img src={photo(s,cover)} alt={aseanDestination(cover.label)?.name||cover.label}/>}<a className="museum-unified-open" href={galleryLink(primary.id,mode)}>{t('Vào triển lãm','Enter exhibition')} {mode.toUpperCase()}<ArrowUpRight size={18}/></a></article>)}</div><h2 className="museum-unified-subtitle">{t('Khám phá theo phòng','Explore by room')}</h2><div className="museum-unified-room-list">{(primary.rooms||[]).map((r,i)=><article key={r.id||i}><span>{formatNum(i+1)}</span><strong>{r.title}</strong><div className="museum-unified-group-langs"><a href={galleryLink(r.exhibition_id||primary.id,'2d')}>2D</a><a href={galleryLink(r.exhibition_id||primary.id,'3d')}>3D</a></div></article>)}</div></>:<p>{t('Không có triển lãm đã lưu.','No saved exhibition is available.')}</p>}
 </main>;
}
function Documents({language,hash,info}){
 const t=(vi,en)=>T(language,vi,en),plan=getAseanPaperPlan(language);
 const docs=[{...ASEAN_PROJECT_OVERVIEW,label:t('Phần 1 · Tổng quan dự án','Part 1 · Project overview')},{href:plan.href,filename:plan.filename,label:t('Phần 2 · Kế hoạch bài dạy và phụ lục','Part 2 · Teaching plan and appendices')},{href:ASEAN_EVIDENCE_PDF,filename:'ASEAN_11_3_Evidence.pdf',label:t('Minh chứng lớp 11.3 · Đối chiếu Angkor','Class 11.3 evidence · Angkor comparison')}];
 return <main className="museum-unified-page"><PageTitle number="05" title={t('Tài liệu đính kèm','Attached documents')} description={t('Tệp Word và PDF của hồ sơ Museum Lab, được nhúng trong HTML.','Word and PDF documents embedded in the Museum Lab HTML.')} count={docs.length} label={t('Tài liệu','Documents')}/><div className="museum-unified-document-grid"><section>{docs.map(d=><a key={d.filename} className="museum-unified-document" href={d.href} download={d.filename}><FileText size={28}/><strong>{d.label}</strong><span>{d.filename.endsWith('.docx')?'DOCX':'PDF'}</span><Download size={20}/></a>)}</section><aside><LockKeyhole size={26}/><h2>{t('Ngoại tuyến · Chỉ đọc','Offline · Read only')}</h2><strong>≤ 45 MB</strong><p>{t('Giới hạn dung lượng khi xuất. Không cần mạng để tải tài liệu nhúng.','Export size limit. Embedded documents do not require a network.')}</p><details><summary>{t('Thông tin xác thực','Archive verification')}</summary><p>Build: {info?.applicationBuild||'—'}</p><p>SHA-256: <code>{hash}</code></p></details></aside></div></main>;
}
function Teacher({runtime,language,route}){
 const go=(tab,extra)=>{
  if(tab==='gallery'){location.hash=extra?href('#exhibitions',{exhibition:extra,format:'2d'}):'#exhibitions';return;}
  if(!TEACHER.some(t=>t[0]===tab))return;
  location.hash=href('#teacher',{tab,...(tab==='submissions'&&extra?{review:extra}:{})});
 };
 return <div className="museum-unified-teacher"><div className="museum-unified-teacher-tools" aria-label={T(language,'Chức năng bản giáo viên','Teacher tools')}>{TEACHER.map(([tab,vi,en,Icon])=><a key={tab} href={href('#teacher',{tab})} aria-current={route.tab===tab?'page':undefined}><Icon size={16}/>{T(language,vi,en)}</a>)}</div><MuseumLabApp key={route.tab+'-'+route.review} archiveTab={route.tab} archiveLanguage={language} archiveNavigate={go} language={language} currentUser={{id:runtime.snapshot.staff.profile.id}}/></div>;
}
export default function UnifiedArchive({runtime,hash,info,HomePage}){
 const [route,setRoute]=useState(()=>archiveRoute(location.hash));
 const [language,setLanguage]=useState(()=>{const r=archiveRoute(location.hash);if(r.lang==='vi'||r.lang==='en')return r.lang;try{return sessionStorage.getItem('museum-archive-language')==='en'?'en':'vi';}catch{return 'vi';}});
 const choose=next=>{const value=next==='en'?'en':'vi';setLanguage(value);try{sessionStorage.setItem('museum-archive-language',value);}catch{}};
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 useEffect(()=>{
  const change=()=>{const r=archiveRoute(location.hash);runtime.useStudent(r.section==='student'&&!r.mobile?r.group||'':'');if(r.lang==='vi'||r.lang==='en')choose(r.lang);setRoute(r);window.scrollTo(0,0);};
  change();window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);
 },[runtime]);
 const [notice,setNotice]=useState(false);
 const groups=groupWorkshopRows(runtime.snapshot),group=groups.find(g=>g.id===route.group);
 const studentDetail=route.section==='student'&&Boolean(route.group);
 return <div className={'museum-unified-archive'+(studentDetail?' museum-unified-student-detail':'')} lang={language} onClickCapture={event=>{
  const a=event.target.closest?.('a[href]'),url=a?.getAttribute('href')||'';
  if(a&&!a.download&&/^https?:\/\/esl-brian\.vercel\.app(?:\/|$)/i.test(url)){event.preventDefault();event.stopPropagation();setNotice(true);}
 }}>
  <Header language={language} setLanguage={choose} section={route.section}/>
  {notice&&<div className="museum-unified-notice" role="status">{T(language,'Liên kết BRIAN cũ không thuộc hồ sơ này. Dùng thanh điều hướng để xem bản lưu.','The old BRIAN link is not part of this archive. Use the navigation to view the saved copy.')} <button onClick={()=>setNotice(false)}>{T(language,'Đóng','Close')}</button></div>}
  {route.section==='home'?<HomePage runtime={runtime} hash={hash} info={info} archiveLanguage={language} onArchiveLanguageChange={choose}/>:route.section==='teacher'?<Teacher runtime={runtime} language={language} route={route}/>:route.section==='saved'?<SavedWork runtime={runtime} language={language} groupId={route.group}/>:route.section==='exhibitions'?<Exhibitions runtime={runtime} language={language} route={route}/>:route.section==='documents'?<Documents language={language} hash={hash} info={info}/>:studentDetail?<><div className="museum-unified-subbar museum-unified-student-back"><a href="#student-workshops"><ArrowLeft size={16}/>{T(language,'Tất cả nhóm','All groups')}</a><strong>{groupName(group,language)} · {group?.classScope}</strong></div>{!group?<p>{T(language,'Không tìm thấy nhóm.','Group not found.')}</p>:route.mobile?<PublicAseanWorkshop key={route.group} groupId={route.group} language={language} archiveLanguage={language} onArchiveLanguageChange={choose}/>:<MuseumLabStudent key={route.group+'-'+language} language={language}/>}</>:<WorkshopList runtime={runtime} language={language}/>}
  {!studentDetail&&route.section!=='home'&&<footer className="museum-unified-footer"><strong>{COPYRIGHT}</strong><span>{T(language,'Lớp 11.3 · Ngoại tuyến','Class 11.3 · Offline')}</span></footer>}
 </div>;
}
