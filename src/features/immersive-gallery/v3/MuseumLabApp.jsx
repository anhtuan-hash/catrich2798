import React,{useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,ShieldAlert,X} from 'lucide-react';
import MuseumPaperHeader from './MuseumPaperHeader.jsx';
import MuseumDashboard from './MuseumDashboard.jsx';
import MuseumLiveTeacher from './MuseumLiveTeacher.jsx';
import {LessonWizard,LessonsList} from './MuseumLessonFlow.jsx';
import {Submissions} from './MuseumReview.jsx';
import {MuseumTemplates,MuseumGallery,MuseumSettings} from './MuseumExplore.jsx';
import MuseumEvidence from './MuseumEvidence.jsx';
import MuseumExhibitionDetail from './MuseumExhibitionDetail.jsx';
import {DEMO_GALLERY,staffRequest} from './museumApi.js';
import './museumLab.css';
import './museumPaper.css';
const tr=(language,vi,en)=>language==='en'?en:vi;
const initialMuseumTab=()=>{
 if(typeof window==='undefined')return 'home';
 try{return new URLSearchParams(window.location.hash.split('?')[1]||'').has('exhibition')?'gallery':'home';}
 catch{return 'home';}
};
export default function MuseumLabApp({currentUser,language='en',transport=staffRequest}){
 const [tab,setTab]=useState(initialMuseumTab),[staff,setStaff]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[reviewId,setReviewId]=useState(null),[help,setHelp]=useState(false);
 const refresh=useCallback(async()=>{
  try{const data=await transport('dashboard');setStaff(data);setError('');return data;}
  catch(e){setError(e.message);return null;}finally{setLoading(false);}
 },[transport]);
 useEffect(()=>{refresh();},[refresh,currentUser?.id]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{if(!document.hidden)refresh();},45000);
  return()=>window.clearInterval(timer);
 },[refresh]);
 const navigate=(id,extra)=>{
  if(typeof window!=='undefined'&&id!=='gallery'&&id!=='demo'&&window.location.hash.includes('?exhibition=')){
   window.history.replaceState(null,'',window.location.hash.split('?')[0]);
  }
  // A lesson/submission search must never silently hide newly published
  // exhibitions when navigating to a different Museum Lab tab.
  if(id==='gallery'&&id!==tab)setQuery('');
  setTab(id);
  if(id==='submissions'&&extra)setReviewId(extra);
 };
 const create=()=>{if(!staff?.offlineReadOnly)navigate('wizard');};
 const demo=()=>navigate('demo');
 const openCollection=key=>{
  if(typeof window!=='undefined'){
   const hash=window.location.hash.split('?')[0]||'#/tool/immersive-gallery';
   window.history.replaceState(null,'',hash+'?exhibition=collection-'+encodeURIComponent(key));
  }
  navigate('gallery');
 };
 const pending=staff?.reviews?.filter(r=>['submitted','ttcm_review'].includes(r.state)).length||0;
 return <div className={'bml bml-app-layout bml-paper '+(['gallery','demo'].includes(tab)?'bml-is-exhibition':'')} data-testid="brian-museum-lab-v3" lang={language} data-ui-locale={language==='en'?'en-US':'vi-VN'}>
  <div className="bml-main-panel">
   <MuseumPaperHeader language={language} tab={tab} onNavigate={navigate} pending={pending}
    query={query} onQueryChange={setQuery} onRefresh={refresh} onHelp={()=>setHelp(true)}/>
   <main className="bml-page">
    {error?<div className="bml-banner bml-danger-banner" role="alert" style={{marginBottom:18}}><ShieldAlert size={19}/>
      <div><strong>{tr(language,'Không thể đồng bộ dữ liệu quản lý','Could not load staff data')}</strong><p>{error}</p>
       <button type="button" className="bml-outline" onClick={()=>{setLoading(true);refresh();}}><RefreshCw size={17}/>{tr(language,'Thử lại','Retry')}</button></div></div>:null}
    {loading?<div className="bml-empty bml-surface" role="status"><RefreshCw size={27}/>{tr(language,'Đang tải bài học và phân quyền…','Loading lessons and permissions…')}</div>:
    tab==='home'?<MuseumDashboard language={language} data={staff} onNavigate={navigate} onCreate={create} onDemo={demo}/>:
    tab==='live'?<MuseumLiveTeacher data={staff} language={language} onBack={()=>navigate('home')}/>:
    tab==='wizard'?<LessonWizard language={language} data={staff} onExit={()=>navigate('lessons')}
      onSettings={()=>navigate('settings')} onCompleted={refresh}/>:
    tab==='lessons'?<LessonsList language={language} data={staff} query={query}
      onCreate={()=>create()} onReview={id=>navigate('submissions',id)} onOpenCollection={openCollection} onRefresh={refresh}/>:
    tab==='submissions'?<Submissions key={reviewId||'normal'} language={language} data={staff} query={query}
      initialReview={reviewId} onNavigate={navigate} onRefresh={refresh}/>:
    tab==='gallery'?<MuseumGallery language={language} query={query} data={staff} onNavigate={navigate} onDemo={demo} onRefresh={refresh} transport={transport}/>:
    tab==='demo'?<MuseumExhibitionDetail gallery={DEMO_GALLERY} language={language} data={staff} isDemo startInCinema
      onNavigate={navigate} onBack={()=>navigate('gallery')}/>:
    tab==='templates'?<MuseumTemplates language={language} readOnly={!!staff?.offlineReadOnly} onCreate={create} onDemo={demo}/>:
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
      ['01','Mở kế hoạch Unit 5: Global Warming','Open the Unit 5: Global Warming plan'],
      ['02','Tạo mã QR và mã bí mật cho từng nhóm','Create a QR and private passcode for each group'],
      ['03','Học sinh làm 5 bước, tự lưu, không đăng nhập','Students complete five steps with no account'],
      ['04','Admin đánh giá, phê duyệt và công bố','Admin assesses, approves and publishes']
     ].map(([number,vi,en])=><div className="bml-check-item" key={number}><span className="bml-class-tag">{number}</span><div><strong>{tr(language,vi,en)}</strong></div></div>)}</div>
     <button className="bml-primary" type="button" disabled={!!staff?.offlineReadOnly} onClick={()=>{setHelp(false);create();}}><Plus size={17}/>{tr(language,'Tạo bài học ngay','Create a lesson')}</button>
    </section></div>:null}
 </div>;
}
