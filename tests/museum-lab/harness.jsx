import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumDashboard from '../../src/features/immersive-gallery/v3/MuseumDashboard.jsx';
import MuseumLiveTeacher from '../../src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx';
import MuseumArtworkStudio from '../../src/features/immersive-gallery/v3/MuseumArtworkStudio.jsx';
import MuseumLiveStudent from '../../src/features/immersive-gallery/v3/MuseumLiveStudent.jsx';
import {LIVE_STAGES,summarizeResponses} from '../../src/features/immersive-gallery/v3/liveLesson.js';
import MuseumLabStudent from '../../src/features/immersive-gallery/v3/MuseumLabStudent.jsx';
import MuseumScene from '../../src/features/immersive-gallery/v3/MuseumScene.jsx';
import MuseumEvidence from '../../src/features/immersive-gallery/v3/MuseumEvidence.jsx';
import {LessonWizard} from '../../src/features/immersive-gallery/v3/MuseumLessonFlow.jsx';
import {DEMO_GALLERY} from '../../src/features/immersive-gallery/v3/museumApi.js';
import '../../src/features/immersive-gallery/v3/museumLab.css';
const synthetic={
 profile:{id:'teacher-synthetic',role:'teacher',school:'SYNTHETIC SCHOOL'},
 creatorSettings:{enabled:false,upload_enabled:false},
 reviewers:[{reviewer_id:'reviewer-synthetic',active:true,can_publish:true}],
 reviewerCandidates:[{id:'reviewer-synthetic',full_name:'Authorized Review Demo',role:'teacher'}],
 assignments:[{id:'lesson-synthetic',title:'Synthetic Climate Action Museum',class_scope:'11-DEMO',deadline_at:'2026-11-25T17:00:00Z'}],
 groups:[
  {id:'group-1',assignment_id:'lesson-synthetic',state:'submitted',label:'Demo Group 1'},
  {id:'group-2',assignment_id:'lesson-synthetic',state:'editing',label:'Demo Group 2'}
 ],
 reviews:[]
};
let liveSession=null;
const demoTeacherApi=async(action,body)=>{
 if(action==='state')return {session:liveSession?{...liveSession,stage:LIVE_STAGES[liveSession.stageIndex]}:null,
  groups:synthetic.groups,result:liveSession?summarizeResponses(liveSession.stageIndex,[]):null,needHelp:0};
 if(action==='start'){liveSession={id:'lesson-demo-session',assignmentId:'lesson-synthetic',status:'active',
  stageIndex:0,stageOpen:false,revealed:false,version:0,stageStartedAt:new Date().toISOString()};
  return {session:{...liveSession,stage:LIVE_STAGES[0]}};}
 if(action==='control'){if(!liveSession)throw new Error('No session');liveSession={...liveSession,version:liveSession.version+1};
  if(body.action==='next')liveSession.stageIndex++;
  if(body.action==='previous')liveSession.stageIndex--;
  if(body.action==='next'||body.action==='previous')liveSession.stageOpen=false;
  if(body.action==='open')liveSession.stageOpen=true;
  if(body.action==='close')liveSession.stageOpen=false;
  if(body.action==='reveal')liveSession.revealed=true;
  if(body.action==='pause')liveSession.status='paused';
  if(body.action==='resume')liveSession.status='active';
  if(body.action==='end')liveSession.status='ended';
  return {session:{...liveSession,stage:LIVE_STAGES[liveSession.stageIndex]}};}
 if(action==='group-gallery')return {draft:{title:'Synthetic Group',rooms:[]},artworks:[],groupLabel:'Demo group'};
 throw new Error('Unexpected mocked operation');
};
function Harness(){
 const [screen,setScreen]=useState('dashboard');
 return <div style={{fontFamily:'Roboto,Arial,sans-serif'}}>
  <div style={{display:'flex',gap:8,padding:10,background:'#e6f0ff',flexWrap:'wrap'}} data-testid="qa-harness">
   <strong>QA ONLY · ALL DATA SYNTHETIC</strong>
   {['dashboard','student','scene','wizard','evidence','teacher-live','student-live','artwork'].map(x=><button type="button" key={x} onClick={()=>setScreen(x)} data-testid={'qa-'+x}>{x}</button>)}
  </div>
  <div className="bml">
   {screen==='dashboard'?<MuseumDashboard data={synthetic} onNavigate={setScreen} onCreate={()=>setScreen('wizard')} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='student'?<MuseumLabStudent language="vi"/>:null}
   {screen==='teacher-live'?<MuseumLiveTeacher data={synthetic} language="vi" transport={demoTeacherApi}/>:null}
   {screen==='student-live'?<MuseumLiveStudent csrf="qa-secret" language="vi"/>:null}
   {screen==='artwork'?<MuseumArtworkStudio studio={{artworks:{issue:null,evidence:null,solution:null}}}
     csrf="qa-secret" language="vi" uploadEnabled={true} update={()=>{}}/>:null}
   {screen==='scene'?<MuseumScene gallery={DEMO_GALLERY} language="vi" onBack={()=>setScreen('dashboard')}/>:null}
   {screen==='evidence'?<MuseumEvidence data={{...synthetic,rubrics:[]}} language="vi"
     currentUser={{name:'Demo Teacher'}} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='wizard'?<LessonWizard data={synthetic} language="vi" onExit={()=>setScreen('dashboard')}
    onCompleted={async()=>{}} onSettings={()=>setScreen('dashboard')}/>:null}
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
