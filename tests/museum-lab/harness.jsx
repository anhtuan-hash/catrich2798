import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MuseumDashboard from '../../src/features/immersive-gallery/v3/MuseumDashboard.jsx';
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
function Harness(){
 const [screen,setScreen]=useState('dashboard');
 return <div style={{fontFamily:'Roboto,Arial,sans-serif'}}>
  <div style={{display:'flex',gap:8,padding:10,background:'#e6f0ff',flexWrap:'wrap'}} data-testid="qa-harness">
   <strong>QA ONLY · ALL DATA SYNTHETIC</strong>
   {['dashboard','student','scene','wizard','evidence'].map(x=><button type="button" key={x} onClick={()=>setScreen(x)} data-testid={'qa-'+x}>{x}</button>)}
  </div>
  <div className="bml">
   {screen==='dashboard'?<MuseumDashboard data={synthetic} onNavigate={setScreen} onCreate={()=>setScreen('wizard')} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='student'?<MuseumLabStudent language="vi"/>:null}
   {screen==='scene'?<MuseumScene gallery={DEMO_GALLERY} language="vi" onBack={()=>setScreen('dashboard')}/>:null}
   {screen==='evidence'?<MuseumEvidence data={{...synthetic,rubrics:[]}} language="vi"
     currentUser={{name:'Demo Teacher'}} onDemo={()=>setScreen('scene')}/>:null}
   {screen==='wizard'?<LessonWizard data={synthetic} language="vi" onExit={()=>setScreen('dashboard')}
    onCompleted={async()=>{}} onSettings={()=>setScreen('dashboard')}/>:null}
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
