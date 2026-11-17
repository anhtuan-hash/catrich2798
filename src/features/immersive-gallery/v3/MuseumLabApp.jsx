import {ASEAN_TEMPLATE,isAsean} from './aseanLesson.js';
import {AseanDossier} from './AseanDossier.jsx';
import React,{useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,ShieldAlert,X} from 'lucide-react';
import {LessonsList,LessonWizard} from './MuseumLessonFlow.jsx';
import {staffRequest,publicStaffRequest} from './museumApi.js';
import ImmersiveShell from '../v2/shell/ImmersiveShell.jsx';
import OverviewScreen from '../v2/screens/OverviewScreen.jsx';
import SubmissionsScreen from '../v2/screens/SubmissionsScreen.jsx';
import ExhibitionsScreen from '../v2/screens/ExhibitionsScreen.jsx';
import TeacherLiveScreen from '../v2/screens/TeacherLiveScreen.jsx';
import TeachingPlanScreen from '../v2/screens/TeachingPlanScreen.jsx';
import DossierScreen from '../v2/screens/DossierScreen.jsx';
import SettingsScreen from '../v2/screens/SettingsScreen.jsx';
import {getMuseumOffline} from './offlineAccess.js';
import {liveStaff,publicLiveStaff} from './museumLiveApi.js';
import './museumLab.css';
import './museumPaper.css';
import '../v2/tokens.css';
import '../v2/swiss.css';
import '../v2/contestSwissPass.css';
import './museumLessonsEditorial.css';
import './museumSubmissionsEditorial.css';
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

export default function MuseumLabApp({currentUser,language='en',transport,publicReadOnly=false}){
 const staffTransport=transport||(publicReadOnly?publicStaffRequest:staffRequest);
 const liveTransport=publicReadOnly?publicLiveStaff:liveStaff;
 const [uiLanguage,setUiLanguage]=useState(()=>{
  try{const saved=sessionStorage.getItem('bml-ui-language');if(saved==='vi'||saved==='en')return saved;}catch{/* ignore */}
  return language==='vi'?'vi':'en';
 });
 const chooseLanguage=(next)=>{
  const value=next==='vi'?'vi':'en';
  setUiLanguage(value);
  try{sessionStorage.setItem('bml-ui-language',value);}catch{/* ignore */}
 };
 // Previously downloaded Climate evidence keeps its original viewer.
 const legacyArchive=getMuseumOffline()?.snapshot?.staff?.assignments?.some(assignment=>!isAsean(assignment));
 const lessonTemplate=legacyArchive?'climate':ASEAN_TEMPLATE;
 const [tab,setTab]=useState(initialMuseumTab),[staff,setStaff]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[reviewId,setReviewId]=useState(null),[help,setHelp]=useState(false);
 const refresh=useCallback(async()=>{
  try{const data=await staffTransport('dashboard');setStaff(data);setError('');return data;}
  catch(e){setError(e.message);return null;}finally{setLoading(false);}
 },[staffTransport]);
 useEffect(()=>{refresh();},[refresh,currentUser?.id]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{if(!document.hidden)refresh();},45000);
  return()=>window.clearInterval(timer);
 },[refresh]);
 const navigate=(id,extra)=>{
  const nextTab=NAV_TO_TAB[id]||id;
  if(readOnly&&nextTab==='wizard')return;
  // The completed competition experience has no demonstration route.
  if(id==='demo'){setTab('gallery');return;}
  if(nextTab==='demo'){setTab('gallery');return;}
  if(typeof window!=='undefined'&&nextTab!=='gallery'&&window.location.hash.includes('?exhibition=')){
   window.history.replaceState(null,'',window.location.hash.split('?')[0]);
  }
  if(nextTab==='gallery'&&typeof extra==='string'&&extra){
   const route=window.location.hash.split('?')[0]||'#/tool/immersive-gallery';
   window.history.replaceState(null,'',route+'?exhibition='+encodeURIComponent(extra));
  }
  // A lesson/submission search must never silently hide newly published
  // exhibitions when navigating to a different Museum Lab tab.
  if(nextTab==='gallery'&&nextTab!==tab)setQuery('');
  setTab(nextTab);
  if(nextTab==='submissions'&&extra)setReviewId(extra);
 };
 // Shell nav ids map to existing tabs; existing navigate()/reviewId preserved.
 const shellNavigate=(navId)=>{ navigate(NAV_TO_TAB[navId]||'home'); };
 const visitor=publicReadOnly||!!staff?.publicReadOnly;
 const readOnly=visitor||!!staff?.offlineReadOnly;
 const create=()=>{if(!readOnly)navigate('wizard');};
 const activeNav=TAB_TO_NAV[tab]||'overview';
 const matchingAssignments=(staff?.assignments||[]).filter(a=>isAsean(a)===isAsean(lessonTemplate));
 const matchingIds=new Set(matchingAssignments.map(a=>a.id));
 const matchingGroups=(staff?.groups||[]).filter(g=>matchingIds.has(g.assignment_id));
 const matchingGroupIds=new Set(matchingGroups.map(g=>g.id));
 const pendingCount=(staff?.reviews||[]).filter(r=>matchingGroupIds.has(r.group_id)&&['submitted','ttcm_review'].includes(r.state)).length;
 const matchingReviewIds=new Set((staff?.reviews||[]).filter(r=>matchingGroupIds.has(r.group_id)).map(r=>r.id));
 const matchingData=staff?{...staff,lessonTemplate,aseanResponses:(staff.aseanResponses||[]).filter(r=>matchingGroupIds.has(r.group_id)),assignments:matchingAssignments,groups:matchingGroups,
  aseanWritingScores:(staff.aseanWritingScores||[]).filter(r=>matchingGroupIds.has(r.group_id)),
  rubrics:(staff.rubrics||[]).filter(r=>matchingReviewIds.has(r.review_id)),
  reviews:(staff.reviews||[]).filter(r=>matchingGroupIds.has(r.group_id)),
  exitTickets:(staff.exitTickets||[]).filter(r=>matchingGroupIds.has(r.group_id)),
  publishedGalleries:(staff.publishedGalleries||[]).filter(g=>isAsean(g)===isAsean(lessonTemplate))}:staff;
 const sharedScreenProps={language:uiLanguage,data:staff,staff,onNavigate:navigate,onRefresh:refresh,transport:staffTransport,onCreate:readOnly?undefined:create,onBack:()=>navigate('home'),initialReview:reviewId};
 const overview=<OverviewScreen {...sharedScreenProps} data={matchingData} lessonTemplate={lessonTemplate} publicReadOnly={visitor}/>;
 return <ImmersiveShell activeNav={activeNav} onNavigate={shellNavigate} language={uiLanguage} onLanguageChange={chooseLanguage} staff={staff} data={staff} query={query} onQueryChange={setQuery} onRefresh={refresh} onHelp={()=>setHelp(true)} pendingCount={pendingCount} lessonTemplate={lessonTemplate}>
  <div className="bml" data-testid="brian-museum-lab-v3" lang={uiLanguage} data-ui-locale={uiLanguage==='en'?'en-US':'vi-VN'} data-public-readonly={visitor?'true':'false'}>
   {error?<div className="bml-banner bml-danger-banner" role="alert" style={{marginBottom:18}}><ShieldAlert size={19}/>
     <div><strong>{tr(uiLanguage,'Không thể đồng bộ dữ liệu quản lý','Could not load staff data')}</strong><p>{error}</p>
      <button type="button" className="bml-outline" onClick={()=>{setLoading(true);refresh();}}><RefreshCw size={17}/>{tr(uiLanguage,'Thử lại','Retry')}</button></div></div>:null}
   {loading?<div className="bml-empty bml-surface" role="status"><RefreshCw size={27}/>{tr(uiLanguage,'Đang tải bài học và phân quyền…','Loading lessons and permissions…')}</div>:
   tab==='home'?overview:
   tab==='live'?<TeacherLiveScreen key={lessonTemplate} {...sharedScreenProps} data={matchingData} transport={liveTransport} initialTemplate={lessonTemplate}/>:
   tab==='wizard'?<LessonWizard language={uiLanguage} data={staff} onCompleted={refresh} onExit={()=>navigate('lessons')} onSettings={()=>navigate('settings')}/>:
   tab==='lessons'?<LessonsList key={lessonTemplate} language={uiLanguage} data={matchingData} query={query}
     onCreate={()=>create()} onReview={id=>navigate('submissions',id)} onRefresh={refresh}/>:
   tab==='submissions'?<SubmissionsScreen key={lessonTemplate} {...sharedScreenProps} data={matchingData} lessonTemplate={lessonTemplate} query={query}/>:
   tab==='gallery'?<ExhibitionsScreen key={lessonTemplate} {...sharedScreenProps} data={matchingData} lessonTemplate={lessonTemplate} query={query}/>:
   tab==='templates'?<TeachingPlanScreen {...sharedScreenProps} data={matchingData} lessonTemplate={lessonTemplate}/>:
   tab==='evidence'?(isAsean(lessonTemplate)?<AseanDossier data={matchingData} language={uiLanguage}
    transport={staffTransport} readOnly={readOnly} onOpenGallery={id=>navigate('gallery',id)} onOpenReview={id=>navigate('submissions',id)}/>:<DossierScreen {...sharedScreenProps} data={matchingData} transport={liveTransport}/>):
   tab==='settings'?<SettingsScreen {...sharedScreenProps}/>:
   overview}
  </div>
  {help?<div className="bml-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false);}}>
    <section className="bml-modal" role="dialog" aria-modal="true" aria-label={tr(uiLanguage,'Hướng dẫn Museum Lab','Museum Lab help')}>
     <header><div><span className="bml-overline">HOW IT WORKS</span><h2>{tr(uiLanguage,'Bắt đầu thật đơn giản','Getting started is simple')}</h2></div>
      <button type="button" className="bml-icon-btn" onClick={()=>setHelp(false)} aria-label="Close"><X size={20}/></button></header>
     <div className="bml-checklist" style={{margin:'19px 0'}}>{[
      ['01','Mở kế hoạch dạy ASEAN','Open the ASEAN teaching plan'],
      ['02','Tạo mã QR và mã bí mật cho từng nhóm','Create a QR and private passcode for each group'],
      ['03','Học sinh làm bài theo nhóm và lưu bài bằng mã nhóm','Students use their group pass to complete and save their work'],
      ['04','Admin đánh giá, phê duyệt và công bố','Admin assesses, approves and publishes']
     ].map(([number,vi,en])=><div className="bml-check-item" key={number}><span className="bml-class-tag">{number}</span><div><strong>{tr(uiLanguage,vi,en)}</strong></div></div>)}</div>
     <button className="bml-primary" type="button" disabled={readOnly} onClick={()=>{setHelp(false);create();}}><Plus size={17}/>{tr(uiLanguage,'Tạo bài học ngay','Create a lesson')}</button>
    </section></div>:null}
 </ImmersiveShell>;
}
