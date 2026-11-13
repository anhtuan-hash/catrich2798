import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumDashboard from '../../src/features/immersive-gallery/v3/MuseumDashboard.jsx';
import MuseumLiveTeacher from '../../src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx';
import MuseumArtworkStudio from '../../src/features/immersive-gallery/v3/MuseumArtworkStudio.jsx';
import MuseumLiveStudent from '../../src/features/immersive-gallery/v3/MuseumLiveStudent.jsx';
import {LIVE_STAGES,summarizeResponses} from '../../src/features/immersive-gallery/v3/liveLesson.js';
import {videoTaskFor} from '../../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import MuseumLabStudent from '../../src/features/immersive-gallery/v3/MuseumLabStudent.jsx';
import MuseumScene from '../../src/features/immersive-gallery/v3/MuseumScene.jsx';
import MuseumExhibitionDetail from '../../src/features/immersive-gallery/v3/MuseumExhibitionDetail.jsx';
import MuseumEvidence from '../../src/features/immersive-gallery/v3/MuseumEvidence.jsx';
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
function Harness(){
 const [screen,setScreen]=useState('dashboard');
 const [preparedKey,setPreparedKey]=useState('marine-12');
 return <div style={{fontFamily:'Roboto,Arial,sans-serif'}}>
  <div style={{display:'flex',gap:8,padding:10,background:'#e6f0ff',flexWrap:'wrap'}} data-testid="qa-harness">
   <strong>QA ONLY · ALL DATA SYNTHETIC</strong>
   {['dashboard','student','scene','wizard','evidence','teacher-live','student-live','artwork','exhibition','exhibition-layout','prepared','admin-review','published-lesson'].map(x=><button type="button" key={x} onClick={()=>setScreen(x)} data-testid={'qa-'+x}>{x}</button>)}
  </div>
  <div className="bml">
   {screen==='dashboard'?<MuseumDashboard data={synthetic} onNavigate={setScreen} onCreate={()=>setScreen('wizard')} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='student'?<MuseumLabStudent language="vi"/>:null}
   {screen==='admin-review'?<Submissions data={submittedQa} language="vi" onNavigate={setScreen} onRefresh={async()=>{}}/>:null}
   {screen==='published-lesson'?<LessonsList
    data={{...synthetic,groups:synthetic.groups.map((g,i)=>i===0?{...g,state:'published'}:g)}}
    language="vi" onCreate={()=>{}} onReview={()=>{}} onRefresh={async()=>{}}
    onOpenCollection={()=>{}}/>:null}
   {screen==='teacher-live'?<MuseumLiveTeacher data={synthetic} language="vi" transport={demoTeacherApi}/>:null}
   {screen==='student-live'?<MuseumLiveStudent csrf="qa-secret" language="vi"/>:null}
   {screen==='artwork'?<MuseumArtworkStudio studio={{artworks:{issue:null,evidence:null,solution:null}}}
     csrf="qa-secret" language="vi" uploadEnabled={true} update={()=>{}}/>:null}
   {screen==='scene'?<MuseumScene gallery={DEMO_GALLERY} language="vi" onBack={()=>setScreen('dashboard')}/>:null}
   {screen==='prepared'?<LessonsList data={preparedQa} language="vi" onCreate={()=>{}} onReview={()=>{}}
     onRefresh={async()=>{}} onOpenCollection={key=>{setPreparedKey(key);setScreen('prepared-gallery');}}/>:null}
   {screen==='prepared-gallery'?<MuseumExhibitionDetail gallery={preparedGallery(preparedKey)} language="vi"
     data={preparedQa} onBack={()=>setScreen('prepared')} onNavigate={setScreen}/>:null}
   {screen==='evidence'?<MuseumEvidence data={{...synthetic,rubrics:[]}} language="vi"
     currentUser={{name:'Demo Teacher'}} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='exhibition'?<MuseumExhibitionDetail gallery={DEMO_GALLERY} isDemo language="vi"
     data={synthetic} onBack={()=>setScreen('dashboard')} onNavigate={setScreen}/>:null}
   {screen==='exhibition-layout'?<div className="bml bml-app-layout bml-is-exhibition" data-testid="museum-layout-shell">
      <aside className="bml-sidebar"><div className="bml-brand">BRIAN Museum Lab</div>
       <nav className="bml-nav"><button type="button">Dạy trực tiếp</button><button type="button" className="is-active">Triển lãm</button></nav></aside>
      <div className="bml-main-panel"><header className="bml-appbar">Museum Lab</header>
       <main className="bml-page"><MuseumExhibitionDetail gallery={DEMO_GALLERY} isDemo language="vi"
         data={synthetic} onBack={()=>setScreen('dashboard')} onNavigate={setScreen}/></main></div>
    </div>:null}
   {screen==='wizard'?<LessonWizard data={synthetic} language="vi" onExit={()=>setScreen('dashboard')}
    onCompleted={async()=>{}} onSettings={()=>setScreen('dashboard')}/>:null}
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
