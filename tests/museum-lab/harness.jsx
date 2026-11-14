import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumLabApp from '../../src/features/immersive-gallery/v3/MuseumLabApp.jsx';
import MuseumLiveTeacher from '../../src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx';
import SwissTeacherLive from '../../src/features/immersive-gallery/v2/screens/TeacherLiveScreen.jsx';
import MuseumArtworkStudio from '../../src/features/immersive-gallery/v3/MuseumArtworkStudio.jsx';
import MuseumLiveStudent from '../../src/features/immersive-gallery/v3/MuseumLiveStudent.jsx';
import {LIVE_STAGES,summarizeResponses} from '../../src/features/immersive-gallery/v3/liveLesson.js';
import {videoTaskFor} from '../../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import MuseumLabStudent from '../../src/features/immersive-gallery/v3/MuseumLabStudent.jsx';
import MuseumScene from '../../src/features/immersive-gallery/v3/MuseumScene.jsx';
import MuseumExhibitionDetail from '../../src/features/immersive-gallery/v3/MuseumExhibitionDetail.jsx';
import MuseumEvidence from '../../src/features/immersive-gallery/v3/MuseumEvidence.jsx';
import MuseumSpeakingStudio from '../../src/features/immersive-gallery/v3/MuseumSpeakingStudio.jsx';
import {LessonWizard,LessonsList} from '../../src/features/immersive-gallery/v3/MuseumLessonFlow.jsx';
import {Submissions} from '../../src/features/immersive-gallery/v3/MuseumReview.jsx';
import {PREPARED_COLLECTIONS,preparedGallery} from '../../src/features/immersive-gallery/v3/museumPreparedCollections.js';
import {DEMO_GALLERY} from '../../src/features/immersive-gallery/v3/museumApi.js';
import '../../src/features/immersive-gallery/v3/museumLab.css';
import '../../src/features/immersive-gallery/v3/museumExhibition.css';
const synthetic={
 profile:{id:'teacher-synthetic',role:'admin',school:'SYNTHETIC SCHOOL'},
 creatorSettings:{enabled:false,upload_enabled:false},
 reviewers:[{reviewer_id:'reviewer-synthetic',active:true,can_publish:true}],
 reviewerCandidates:[{id:'reviewer-synthetic',full_name:'Authorized Review Demo',role:'teacher'}],
 assignments:[{id:'lesson-synthetic',created_by:'teacher-synthetic',title:'Synthetic Climate Action Museum',class_scope:'11-DEMO',deadline_at:'2026-11-25T17:00:00Z'}],
 groups:[
  {id:'group-1',assignment_id:'lesson-synthetic',state:'submitted',label:'Demo Group 1'},
  {id:'group-2',assignment_id:'lesson-synthetic',state:'editing',label:'Demo Group 2'}
 ],
 reviews:[]
};
const preparedQa={
 ...synthetic,
 assignments:PREPARED_COLLECTIONS.map((c,i)=>({id:'prepared-lesson-'+i,title:c.title,class_scope:c.classScope,
  created_by:'teacher-synthetic',deadline_at:'2026-11-19T17:00:00Z'})),
 groups:PREPARED_COLLECTIONS.flatMap((c,i)=>c.projects.map((p,n)=>({
  id:c.key+'-qa-'+n,assignment_id:'prepared-lesson-'+i,state:'issued',label:'Nhóm '+(n+1)
 }))),
 reviews:[]
};
const demoDashboardApi=async(action)=>action==='showcase-state'
 ?{hiddenCollections:[],archivedGalleries:[],galleryEnabled:false,publishedGalleries:[]}
 :synthetic;
const publishedQaItem={
 id:'11111111-1111-4111-8111-111111111111',
 slug:'qa-published-group-01',title:'Synthetic Published Group 01',
 summary:'The Problem, The Evidence and Our Solution',status:'published',
 visibility:'school',owner_id:'teacher-synthetic',updated_at:'2026-11-13T10:00:00Z'
};
const publishedQaDashboard={...synthetic,publishedGalleries:[publishedQaItem]};
const qaPoster="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='320'%3E%3Crect%20width='240'%20height='320'%20fill='%23d5f5e7'/%3E%3C/svg%3E";
const publishedQaTransport=async(action)=>{
 if(action==='dashboard')return publishedQaDashboard;
 if(action==='showcase-state')return {hiddenCollections:[],archivedGalleries:[],
  galleryEnabled:true,publishedGalleries:[publishedQaItem]};
 if(action==='showcase-exhibition')return {gallery:{...publishedQaItem,
  rooms:[{id:'qa-room-01',title:'Climate Action Room',sort_order:0,template_key:'classic',
   exhibits:['The Problem','The Evidence','Our Solution'].map((title,i)=>({
    id:'qa-exhibit-'+i,title,kind:'image',description:'Classroom energy project.',
    status:'published',asset_id:'qa-asset-'+i,image_url:qaPoster
   }))}]}};
 return demoDashboardApi();
};
const tenGroups=Array.from({length:10},(_,i)=>({
 id:'g'+(i+1),assignment_id:'lesson-synthetic',state:i===0?'submitted':'editing',
 label:'Nhóm '+String(i+1).padStart(2,'0')
}));
const tenFeedback=[
 {id:'f1',from_group:'g1',to_group:'g2',rating:4,
  learned:'The marked crossing makes the safety concern visible to visitors.',
  clarify:'The visitor needs another path for unsafe or rainy-day routes.'},
 {id:'f2',from_group:'g3',to_group:'g2',rating:3,
  learned:'I learned that group votes do not describe actual commuting behaviour.',
  clarify:'Please explain who assesses local road conditions before travel advice.'},
 {id:'f3',from_group:'g2',to_group:'g7',rating:4,
  learned:'The canteen exhibit explains why personal meal records should remain private.',
  clarify:'The chart should define what counts as an anonymous category.'}
];
const submittedQa={
 ...synthetic,
 reviews:[{id:'review-qa-1',group_id:'group-1',version:1,state:'submitted',
  submitted_at:'2026-11-13T00:00:00Z',snapshot:{title:'Group climate work',
   learning:{issue:'A school climate issue',evidence:'A credible source',solution:'A practical solution'},
   rooms:[{title:'The climate hall',exhibits:[{title:'Our Problem',description:'Energy waste can contribute to emissions.'}]}]}}],
 rubrics:[]
};
let liveSession=null;
const demoTeacherApi=async(action,body)=>{
 if(['media-task','media-add','media-remove'].includes(action)){
  if(!liveSession||body.version!==liveSession.version)throw new Error('Stale QA version');
  const board=liveSession.mediaBoard||{},stageIndex=body.stageIndex;
  const old=videoTaskFor(board,stageIndex);
  let media=old;
  if(action==='media-task')media={...old,query:body.query,instruction:body.instruction};
  if(action==='media-add')media={...old,videos:[...old.videos.filter(v=>v.id!==body.videoId),
   {id:body.videoId,title:body.title||'Synthetic approved video',channel:body.channel||''}]};
  if(action==='media-remove')media={...old,videos:old.videos.filter(v=>v.id!==body.videoId)};
  liveSession={...liveSession,version:liveSession.version+1,mediaBoard:{...board,[stageIndex]:media}};
  return {session:{...liveSession,media:videoTaskFor(liveSession.mediaBoard,liveSession.stageIndex),
   stage:LIVE_STAGES[liveSession.stageIndex]}};
 }
 if(action==='video-search')return {available:false,results:[],reason:'youtube_api_key_not_configured'};
 if(action==='state')return {session:liveSession?{...liveSession,media:videoTaskFor(liveSession.mediaBoard,liveSession.stageIndex),stage:LIVE_STAGES[liveSession.stageIndex]}:null,
  groups:synthetic.groups,result:liveSession?summarizeResponses(liveSession.stageIndex,[]):null,needHelp:0};
 if(action==='start'){liveSession={id:'lesson-demo-session',assignmentId:'lesson-synthetic',status:'active',
  stageIndex:0,stageOpen:true,revealed:false,version:0,stageStartedAt:new Date().toISOString()};
  return {session:{...liveSession,media:videoTaskFor(liveSession.mediaBoard,0),stage:LIVE_STAGES[0]}};}
 if(action==='control'){if(!liveSession)throw new Error('No session');liveSession={...liveSession,version:liveSession.version+1};
  if(body.action==='next')liveSession.stageIndex++;
  if(body.action==='previous')liveSession.stageIndex--;
  if(body.action==='next'||body.action==='previous')liveSession.stageOpen=true;
  if(body.action==='open')liveSession.stageOpen=true;
  if(body.action==='close')liveSession.stageOpen=false;
  if(body.action==='reveal')liveSession.revealed=true;
  if(body.action==='pause'){liveSession.status='paused';liveSession.stageOpen=false;}
  if(body.action==='resume'){liveSession.status='active';liveSession.stageOpen=true;}
  if(body.action==='end')liveSession.status='ended';
  return {session:{...liveSession,media:videoTaskFor(liveSession.mediaBoard,liveSession.stageIndex),stage:LIVE_STAGES[liveSession.stageIndex]}};}
 if(action==='group-gallery')return {draft:{title:'Synthetic Group',rooms:[]},artworks:[],groupLabel:'Demo group'};
 throw new Error('Unexpected mocked operation');
};
const frozenQa={
 ...synthetic,assignments:synthetic.assignments.map(a=>({
  ...a,content_frozen_at:'2026-11-13T19:19:21.161Z'
 }))
};
// Browser-only fixture: no database, credentials or production requests.
// All frozen Teacher Live actions except GET state and GET video-search must fail.
const frozenTeacherApi=async(action,body,params={})=>{
 if(action==='video-search')return {available:true,results:[]};
 if(action!=='state'||body){
  window.__frozenTeacherWrites=(window.__frozenTeacherWrites||0)+1;
  throw new Error('A frozen lesson must not write presentation changes.');
 }
 const requested=Number(params.viewStage);
 const index=Number.isInteger(requested)&&requested>=0&&requested<LIVE_STAGES.length?requested:10;
 window.__frozenTeacherReads=[...(window.__frozenTeacherReads||[]),index];
 const stage=LIVE_STAGES[index];
 return {
  session:{id:'frozen-qa',assignmentId:'lesson-synthetic',status:'active',
   stageIndex:index,persistedStageIndex:10,stageOpen:false,revealed:false,
   version:21,readOnly:true,elapsedSeconds:0,stageStartedAt:null,
   stage:{...stage,questions:stage.questions,videoQuestions:stage.videoQuestions},
   media:{query:'',instruction:'',videos:[],voiceEnabled:false},
   evidenceVersion:1,questionVersion:2},
  result:summarizeResponses(index,[]),groups:synthetic.groups,needHelp:0,
  survey:null,feedback:[],responses:[],microResponses:0,microResults:[]
 };
};
const v53QaGallery={
 title:'School Climate Workshop',summary:'Group choices and practical safety decisions',
 learning:{issue:'Unused lights remain on after class',source:'NASA greenhouse effect educational overview',
  evidence:'Four out of ten groups prioritised unused lighting.',
  solution:'Teachers approve shutdown equipment lists.',improvement:'Added teacher permission and safety exception.'},
 survey:{id:'synthetic-survey',session_id:'synthetic',counts:[2,4,3,1],source:'online',created_at:'2026-11-13T00:00:00Z'},
 rooms:[{id:'qa-room',title:'Climate Hall',template_key:'classic',exhibits:[
  {id:'qa-problem',title:'The Problem',kind:'text',description:'Lights sometimes remain on in empty classrooms.'},
  {id:'qa-evidence',title:'The Evidence',kind:'text',description:'Four group votes support choosing lighting as a focus.\\n\\nSource: NASA greenhouse effect educational overview'},
  {id:'qa-solution',title:'Our Solution',kind:'text',description:'A student monitor checks with the teacher before switching off equipment.'}
 ]}]
};
const v53Before={kind:'before',version:1,checkpointId:'before-qa',artworks:[],draft:{
 title:'School Climate Workshop',learning:{issue:'Our school wastes energy.',evidence:'Survey results',source:'Class group votes',
  solution:'Switch off everything'},artworks:{},rooms:[]}};
const v53After={kind:'after',version:3,checkpointId:'after-qa',artworks:[],draft:{
 title:'School Climate Workshop',learning:{issue:'Unused equipment stays on after the bell.',
  evidence:'Four of ten groups selected lighting.',source:'Named group-priority survey',
  solution:'Student monitor consults the teacher before changing switches.',
  feedback:'A peer asked about devices that must remain on.',improvement:'Added staff approval.'},
  artworks:{},rooms:[]}};
const tenTeacherApi=async(action,body,query)=>{
 if(action==='checkpoint-compare')return {groupLabel:'Nhóm 02',before:v53Before,after:v53After};
 if(action==='group-gallery')return {draft:DEMO_GALLERY,artworks:[],groupLabel:
  'Nhóm '+String(tenGroups.findIndex(g=>g.id===query?.groupId)+1).padStart(2,'0')};
 const base=await demoTeacherApi(action,body,query);
 return action==='state'?{...base,groups:tenGroups,feedback:tenFeedback,
  responses:[{group_id:'g1',value:1},{group_id:'g3',value:0}],
  microResults:[{group_id:'g2',choice:1}],helpGroups:['g4','g7'],needHelp:2}:base;
};
const publishedQaTransportBroken=async(action,...args)=>{
 if(action==='showcase-state')throw new Error('Synthetic showcase catalogue unavailable');
 return publishedQaTransport(action,...args);
};
function Harness(){
 const [screen,setScreen]=useState('dashboard');
  const englishOnly=screen.endsWith('-en');
  const normalized=englishOnly?screen.slice(0,-3):screen;
  const uiLanguage=englishOnly?'en':'vi';
 const [preparedKey,setPreparedKey]=useState('marine-12');
 return <div style={{fontFamily:'Roboto,Arial,sans-serif'}}>
  <div style={{display:'flex',gap:8,padding:10,background:'#e6f0ff',flexWrap:'wrap'}} data-testid="qa-harness">
   <strong>QA ONLY · ALL DATA SYNTHETIC</strong>
   {['dashboard','student','scene','wizard','evidence','teacher-live','student-live','artwork','exhibition','exhibition-layout','prepared','admin-review','published-lesson','dashboard-en','dashboard-published-en','dashboard-published-fail-en','student-en','teacher-live-en','teacher-live-ten-en','teacher-live-frozen-en','teacher-live-v2-frozen-en','v53-evidence-en','v54-speaking-en','wizard-en','evidence-en','admin-review-en'].map(x=><button type="button" key={x} onClick={()=>setScreen(x)} data-testid={'qa-'+x}>{x}</button>)}
  </div>
  <div className={normalized==='dashboard'?'':'bml'}>
   {normalized==='dashboard'?<MuseumLabApp language={uiLanguage} currentUser={{id:'teacher-synthetic',name:'Demo Teacher'}} transport={demoDashboardApi}/>:null}
   {normalized==='dashboard-published'?<MuseumLabApp language={uiLanguage}
    currentUser={{id:'teacher-synthetic',name:'Synthetic Teacher'}} transport={publishedQaTransport}/>:null}
   {normalized==='dashboard-published-fail'?<MuseumLabApp language={uiLanguage}
    currentUser={{id:'teacher-synthetic',name:'Synthetic Teacher'}} transport={publishedQaTransportBroken}/>:null}
   {normalized==='student'?<MuseumLabStudent language={uiLanguage}/>:null}
   {normalized==='admin-review'?<Submissions data={submittedQa} language={uiLanguage} onNavigate={setScreen} onRefresh={async()=>{}}/>:null}
   {normalized==='published-lesson'?<LessonsList
    data={{...synthetic,groups:synthetic.groups.map((g,i)=>i===0?{...g,state:'published'}:g)}}
    language={uiLanguage} onCreate={()=>{}} onReview={()=>{}} onRefresh={async()=>{}}
    onOpenCollection={()=>{}}/>:null}
   {normalized==='teacher-live'?<MuseumLiveTeacher data={synthetic} language={uiLanguage} transport={demoTeacherApi}/>:null}
    {normalized==='teacher-live-ten'?<MuseumLiveTeacher data={{...synthetic,groups:tenGroups}} language={uiLanguage} transport={tenTeacherApi}/>:null}
   {normalized==='teacher-live-frozen'?<MuseumLiveTeacher data={frozenQa} language={uiLanguage} transport={frozenTeacherApi}/>:null}
   {normalized==='teacher-live-v2-frozen'?<SwissTeacherLive data={frozenQa} language={uiLanguage} transport={frozenTeacherApi}/>:null}
   {normalized==='student-live'?<MuseumLiveStudent csrf="qa-secret" language={uiLanguage}/>:null}
   {normalized==='artwork'?<MuseumArtworkStudio studio={{artworks:{issue:null,evidence:null,solution:null}}}
     csrf="qa-secret" language={uiLanguage} uploadEnabled={true} update={()=>{}}/>:null}
   {normalized==='scene'?<MuseumScene gallery={DEMO_GALLERY} language={uiLanguage} onBack={()=>setScreen('dashboard')}/>:null}
   {normalized==='v53-evidence'?<MuseumScene gallery={v53QaGallery} language={uiLanguage}/>:null}
   {normalized==='v54-speaking'?<MuseumSpeakingStudio enabled learning={{
    issue:'Unused classroom lights after the final bell',
    evidence:'Four of ten groups selected reducing unnecessary lighting.',
    solution:'A teacher-approved monitor checklist'
   }} onClose={()=>setScreen('dashboard')}/>:null}
   {normalized==='prepared'?<LessonsList data={preparedQa} language={uiLanguage} onCreate={()=>{}} onReview={()=>{}}
     onRefresh={async()=>{}} onOpenCollection={key=>{setPreparedKey(key);setScreen('prepared-gallery');}}/>:null}
   {normalized==='prepared-gallery'?<MuseumExhibitionDetail gallery={preparedGallery(preparedKey)} language={uiLanguage}
     data={preparedQa} onBack={()=>setScreen('prepared')} onNavigate={setScreen}/>:null}
   {normalized==='evidence'?<MuseumEvidence data={{...synthetic,rubrics:[]}} language={uiLanguage}
     currentUser={{name:'Demo Teacher'}} onDemo={()=>setScreen('scene')}/>:null}
   {normalized==='exhibition'?<MuseumExhibitionDetail gallery={DEMO_GALLERY} isDemo language={uiLanguage}
     data={synthetic} onBack={()=>setScreen('dashboard')} onNavigate={setScreen}/>:null}
   {normalized==='exhibition-layout'?<div className="bml bml-app-layout bml-is-exhibition" data-testid="museum-layout-shell">
      <aside className="bml-sidebar"><div className="bml-brand">BRIAN Museum Lab</div>
       <nav className="bml-nav"><button type="button">Dạy trực tiếp</button><button type="button" className="is-active">Triển lãm</button></nav></aside>
      <div className="bml-main-panel"><header className="bml-appbar">Museum Lab</header>
       <main className="bml-page"><MuseumExhibitionDetail gallery={DEMO_GALLERY} isDemo language={uiLanguage}
         data={synthetic} onBack={()=>setScreen('dashboard')} onNavigate={setScreen}/></main></div>
    </div>:null}
   {normalized==='wizard'?<LessonWizard data={synthetic} language={uiLanguage} onExit={()=>setScreen('dashboard')}
    onCompleted={async()=>{}} onSettings={()=>setScreen('dashboard')}/>:null}
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
