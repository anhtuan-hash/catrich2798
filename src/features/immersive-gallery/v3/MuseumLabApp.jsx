import React,{useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,ShieldAlert,X} from 'lucide-react';
import {LessonsList,LessonWizard} from './MuseumLessonFlow.jsx';
import {staffRequest} from './museumApi.js';
// --- Swiss Editorial V2 shell + owned screens (route-scoped under .igv2) ---
import ImmersiveShell from '../v2/shell/ImmersiveShell.jsx';
import OverviewScreen from '../v2/screens/OverviewScreen.jsx';
import SubmissionsScreen from '../v2/screens/SubmissionsScreen.jsx';
import ExhibitionsScreen from '../v2/screens/ExhibitionsScreen.jsx';
import SettingsScreen from '../v2/screens/SettingsScreen.jsx';
// --- Screens owned by the parallel agent (contract: named exports) ---
import {TeachingPlanScreen} from '../v2/screens/TeachingPlanScreen.jsx';
import {TeacherLiveScreen} from '../v2/screens/TeacherLiveScreen.jsx';
import {DossierScreen} from '../v2/screens/DossierScreen.jsx';
import './museumLab.css';
import './museumPaper.css';
import '../v2/tokens.css';
import '../v2/swiss.css';

const tr=(language,vi,en)=>language==='en'?en:vi;
const initialMuseumTab=()=>{
 if(typeof window==='undefined')return 'home';
 try{return new URLSearchParams(window.location.hash.split('?')[1]||'').has('exhibition')?'gallery':'home';}
 catch{return 'home';}
};

// SideNavigation id (contract) <-> existing v3 tab.
const NAV_TO_TAB={overview:'home',lessons:'lessons',submissions:'submissions',
 exhibitions:'gallery','teaching-plan':'templates','teacher-live':'live',
 'competition-dossier':'evidence',settings:'settings'};
const TAB_TO_NAV={home:'overview',lessons:'lessons',submissions:'submissions',
 gallery:'exhibitions',wizard:'lessons',templates:'teaching-plan',
 live:'teacher-live',evidence:'competition-dossier',settings:'settings'};

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
  const nextTab=NAV_TO_TAB[id]||id;
  // The completed competition experience has no demonstration route.
  if(id==='demo'){setTab('gallery');return;}
  if(nextTab==='demo'){setTab('gallery');return;}
  if(typeof window!=='undefined'&&nextTab!=='gallery'&&window.location.hash.includes('?exhibition=')){
   window.history.replaceState(null,'',window.location.hash.split('?')[0]);
  }
  // A lesson/submission search must never silently hide newly published
  // exhibitions when navigating to a different Museum Lab tab.
  if(nextTab==='gallery'&&nextTab!==tab)setQuery('');
  setTab(nextTab);
  if(nextTab==='submissions'&&extra)setReviewId(extra);
 };
 // Shell nav ids map to existing tabs; existing navigate()/reviewId preserved.
 const shellNavigate=(navId)=>{ navigate(NAV_TO_TAB[navId]||'home'); };
 const create=()=>navigate('wizard');
 const activeNav=TAB_TO_NAV[tab]||'overview';
 const pendingCount=(staff?.reviews||[]).filter(r=>r.state==='submitted'||r.state==='ttcm_review').length;
 const sharedScreenProps={language,data:staff,staff,onNavigate:navigate,onRefresh:refresh,transport,onCreate:create,onBack:()=>navigate('home'),initialReview:reviewId};
 return <ImmersiveShell activeNav={activeNav} onNavigate={shellNavigate} language={language} staff={staff} data={staff} query={query} onQueryChange={setQuery} onRefresh={refresh} onHelp={()=>setHelp(true)} pendingCount={pendingCount}>
  <div className="bml" data-testid="brian-museum-lab-v3" lang={language} data-ui-locale={language==='en'?'en-US':'vi-VN'}>
   {error?<div className="bml-banner bml-danger-banner" role="alert" style={{marginBottom:18}}><ShieldAlert size={19}/>
     <div><strong>{tr(language,'Không thể đồng bộ dữ liệu quản lý','Could not load staff data')}</strong><p>{error}</p>
      <button type="button" className="bml-outline" onClick={()=>{setLoading(true);refresh();}}><RefreshCw size={17}/>{tr(language,'Thử lại','Retry')}</button></div></div>:null}
   {loading?<div className="bml-empty bml-surface" role="status"><RefreshCw size={27}/>{tr(language,'Đang tải bài học và phân quyền…','Loading lessons and permissions…')}</div>:
   tab==='home'?<OverviewScreen {...sharedScreenProps}/>:
   tab==='live'?<TeacherLiveScreen {...sharedScreenProps}/>:
   tab==='wizard'?<LessonWizard language={language} data={staff} onCompleted={refresh} onExit={()=>navigate('lessons')} onSettings={()=>navigate('settings')}/>:
   tab==='lessons'?<LessonsList language={language} data={staff} query={query}
     onCreate={()=>create()} onReview={id=>navigate('submissions',id)} onRefresh={refresh}/>:
   tab==='submissions'?<SubmissionsScreen {...sharedScreenProps} query={query}/>:
   tab==='gallery'?<ExhibitionsScreen {...sharedScreenProps} query={query}/>:
   tab==='templates'?<TeachingPlanScreen {...sharedScreenProps}/>:
   tab==='evidence'?<DossierScreen {...sharedScreenProps}/>:
   tab==='settings'?<SettingsScreen {...sharedScreenProps}/>:
   <OverviewScreen {...sharedScreenProps}/>}
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
     <button className="bml-primary" type="button" onClick={()=>{setHelp(false);create();}}><Plus size={17}/>{tr(language,'Tạo bài học ngay','Create a lesson')}</button>
    </section></div>:null}
 </ImmersiveShell>;
}
