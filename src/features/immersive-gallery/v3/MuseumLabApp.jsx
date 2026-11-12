import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,Award,Bell,BookOpen,CheckCircle2,ChevronRight,CircleHelp,ClipboardCheck,FileCheck2,Grid2X2,House,Landmark,Library,Menu,Plus,RefreshCw,Search,Settings2,ShieldAlert,Sparkles,Users,X} from 'lucide-react';
import MuseumDashboard from './MuseumDashboard.jsx';
import {LessonWizard,LessonsList} from './MuseumLessonFlow.jsx';
import {Submissions} from './MuseumReview.jsx';
import {MuseumTemplates,MuseumGallery,MuseumSettings} from './MuseumExplore.jsx';
import MuseumEvidence from './MuseumEvidence.jsx';
import MuseumScene from './MuseumScene.jsx';
import {DEMO_GALLERY,staffRequest} from './museumApi.js';
import './museumLab.css';
const NAV=[
 {id:'home',icon:House,vi:'Trang chủ',en:'Home'},
 {id:'lessons',icon:BookOpen,vi:'Bài học',en:'Lessons'},
 {id:'submissions',icon:ClipboardCheck,vi:'Bài nộp',en:'Submissions'},
 {id:'gallery',icon:Landmark,vi:'Triển lãm',en:'Exhibitions'},
 {id:'templates',icon:Library,vi:'Thư viện mẫu',en:'Lesson library'},
 {id:'evidence',icon:Award,vi:'Hồ sơ dự thi',en:'Competition dossier'},
 {id:'settings',icon:Settings2,vi:'Cài đặt',en:'Settings'}
];
const tr=(language,vi,en)=>language==='en'?en:vi;
export default function MuseumLabApp({currentUser,language='vi'}){
 const [tab,setTab]=useState('home'),[kit,setKit]=useState('climate'),[staff,setStaff]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[reviewId,setReviewId]=useState(null),[help,setHelp]=useState(false),[menuOpen,setMenuOpen]=useState(false);
 const refresh=useCallback(async()=>{
  try{const data=await staffRequest('dashboard');setStaff(data);setError('');return data;}
  catch(e){setError(e.message);return null;}finally{setLoading(false);}
 },[]);
 useEffect(()=>{let live=true;refresh();return()=>{live=false;};},[refresh,currentUser?.id]);
 const navigate=(id,extra)=>{
  setTab(id);setMenuOpen(false);setNotice('');
  if(id==='submissions'&&extra)setReviewId(extra);
 };
 const create=(kitId='climate')=>{setKit(kitId);navigate('wizard');};
 const demo=()=>navigate('demo');
 const pending=staff?.reviews?.filter(r=>['submitted','ttcm_review'].includes(r.state)).length||0;
 const activePage=NAV.find(n=>n.id===tab);
 const initials=String(currentUser?.full_name||currentUser?.name||currentUser?.email||'B').trim().slice(0,1).toUpperCase();
 const primary=NAV.slice(0,4),secondary=NAV.slice(4);
 return <div className="bml bml-app-layout" data-testid="brian-museum-lab-v3">
  <aside className={'bml-sidebar '+(menuOpen?'is-open':'')}>
   <div className="bml-brand"><span className="bml-brand-icon"><Landmark size={23}/></span>
    <div><strong>BRIAN Museum Lab</strong><small>V3.0 · Learn by creating</small></div></div>
   <nav className="bml-nav" aria-label={tr(language,'Điều hướng Museum Lab','Museum Lab navigation')}>
    {primary.map(({id,icon:Icon,vi,en})=><button type="button" className={tab===id?'is-active':''} aria-current={tab===id?'page':undefined}
      key={id} onClick={()=>navigate(id)}><Icon size={20}/>{tr(language,vi,en)}{id==='submissions'&&pending>0?<span className="bml-status-pill bml-status-purple">{pending}</span>:null}</button>)}
   </nav>
   <div className="bml-nav-divider"/>
   <div className="bml-nav-label">{tr(language,'CÔNG CỤ HỖ TRỢ','EXTRA TOOLS')}</div>
   <nav className="bml-nav" aria-label={tr(language,'Công cụ mở rộng','Other tools')}>
    {secondary.map(({id,icon:Icon,vi,en})=><button type="button" className={tab===id?'is-active':''} key={id}
      onClick={()=>navigate(id)}><Icon size={19}/>{tr(language,vi,en)}</button>)}</nav>
   <div className="bml-sidebar-footer"><Sparkles size={19}/><span>{tr(language,'Thiết kế bài học trong ba bước, học sinh không cần tài khoản.','Three-step lessons. Students never need accounts.')}</span></div>
  </aside>
  <div className="bml-main-panel">
   <header className="bml-appbar">
    <button type="button" className="bml-icon-btn" aria-label={tr(language,'Mở điều hướng','Open navigation')} onClick={()=>setMenuOpen(v=>!v)}><Menu size={22}/></button>
    <div className="bml-appbar-title">{tab==='home'?'BRIAN Museum Lab':tr(language,activePage?.vi||'Museum Lab',activePage?.en||'Museum Lab')}</div>
    <label className="bml-search"><Search size={19} color="#6e8195"/><input aria-label={tr(language,'Tìm bài học','Search lessons')}
      value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){navigate('lessons');}}}
      placeholder={tr(language,'Tìm bài học, triển lãm…','Search lessons and museums…')}/></label>
    <div className="bml-appbar-actions">
     <button className="bml-icon-btn" type="button" onClick={()=>setHelp(true)} aria-label={tr(language,'Trợ giúp','Help')}><CircleHelp size={22}/></button>
     <button className="bml-icon-btn" type="button" onClick={()=>navigate('submissions')} aria-label={tr(language,'Bài nộp chờ duyệt','Pending reviews')}><Bell size={21}/></button>
     <button className="bml-icon-btn" type="button" onClick={()=>{window.location.hash='#/apps';}} aria-label={tr(language,'Ứng dụng Brian','Brian apps')}><Grid2X2 size={21}/></button>
     <div className="bml-user-avatar" title={currentUser?.email||''} aria-label={tr(language,'Tài khoản đang đăng nhập','Signed-in user')}>{initials}</div>
    </div>
   </header>
   <main className="bml-page">
    {error?<div className="bml-banner bml-danger-banner" role="alert" style={{marginBottom:18}}><ShieldAlert size={19}/>
      <div><strong>{tr(language,'Không thể đồng bộ dữ liệu quản lý','Could not load staff data')}</strong><p>{error}</p>
       <button type="button" className="bml-outline" onClick={()=>{setLoading(true);refresh();}}><RefreshCw size={17}/>{tr(language,'Thử lại','Retry')}</button></div></div>:null}
    {loading?<div className="bml-empty bml-surface" role="status"><RefreshCw size={27}/>{tr(language,'Đang tải bài học và phân quyền…','Loading lessons and permissions…')}</div>:
    tab==='home'?<MuseumDashboard language={language} data={staff} onNavigate={navigate} onCreate={create} onDemo={demo}/>:
    tab==='wizard'?<LessonWizard language={language} data={staff} initialKit={kit} onExit={()=>navigate('lessons')}
      onSettings={()=>navigate('settings')} onCompleted={refresh}/>:
    tab==='lessons'?<LessonsList language={language} data={staff} query={query}
      onCreate={()=>create()} onReview={id=>navigate('submissions',id)} onRefresh={refresh}/>:
    tab==='submissions'?<Submissions key={reviewId||'normal'} language={language} data={staff} query={query}
      initialReview={reviewId} onNavigate={navigate} onRefresh={refresh}/>:
    tab==='gallery'?<MuseumGallery language={language} query={query} onDemo={demo}/>:
    tab==='demo'?<div className="bml-screen"><div className="bml-banner bml-info-banner"><Sparkles size={19}/>
       {tr(language,'Bản xem trước sử dụng nội dung mô phỏng gốc. Không phải minh chứng lớp học thật.','This is an original synthetic demo, not real student evidence.')}</div>
      <MuseumScene gallery={DEMO_GALLERY} language={language} onBack={()=>navigate('gallery')}/></div>:
    tab==='templates'?<MuseumTemplates language={language} onCreate={create} onDemo={demo}/>:
    tab==='evidence'?<MuseumEvidence language={language} data={staff||{assignments:[],groups:[],reviews:[],rubrics:[]}}
      currentUser={currentUser} onDemo={demo}/>:
    tab==='settings'?<MuseumSettings language={language} data={staff} onRefresh={refresh}/>:
    <MuseumDashboard language={language} data={staff} onNavigate={navigate} onCreate={create} onDemo={demo}/>}
   </main>
  </div>
  {help?<div className="bml-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false);}}>
    <section className="bml-modal" role="dialog" aria-modal="true" aria-label={tr(language,'Hướng dẫn Museum Lab','Museum Lab help')}>
     <header><div><span className="bml-overline">HOW IT WORKS</span><h2>{tr(language,'Bắt đầu thật đơn giản','Getting started is simple')}</h2></div>
      <button type="button" className="bml-icon-btn" onClick={()=>setHelp(false)} aria-label="Close"><X size={20}/></button></header>
     <div className="bml-checklist" style={{margin:'19px 0'}}>{[
      ['01','Chọn Bài học và mẫu phù hợp','Choose a lesson and a template'],
      ['02','Tạo mã QR và mã bí mật cho từng nhóm','Create a QR and private passcode for each group'],
      ['03','Học sinh làm 5 bước, tự lưu, không đăng nhập','Students complete five steps with no account'],
      ['04','Giáo viên chấm và chuyển TTCM duyệt','Teachers assess; department heads review']
     ].map(([number,vi,en])=><div className="bml-check-item" key={number}><span className="bml-class-tag">{number}</span><div><strong>{tr(language,vi,en)}</strong></div></div>)}</div>
     <button className="bml-primary" type="button" onClick={()=>{setHelp(false);create();}}><Plus size={17}/>{tr(language,'Tạo bài học ngay','Create a lesson')}</button>
    </section></div>:null}
 </div>;
}
