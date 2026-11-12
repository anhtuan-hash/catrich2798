import React,{Suspense,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {CuratedModel} from './GalleryCanvasR3F.jsx';
import {CURATED_GLB_KEYS} from './curatedGlb.js';

// An accessible, user-initiated viewer for original curated GLB objects.
// No external model URL and no auto-play. The scene is mounted only while its detail modal is open.
export default function GalleryModelInspector({modelKey='globe',language='vi'}) {
 const [ready,setReady]=useState(false);
 if(!CURATED_GLB_KEYS.includes(modelKey))return <p role="alert">This model is not approved.</p>;
 return <div className="big-inspector">
   <button type="button" onClick={()=>setReady(v=>!v)} aria-expanded={ready}>
     {ready?(language==='en'?'Close 3D inspection':'Đóng xem 3D'):(language==='en'?'Inspect 3D object':'Xoay và khám phá mô hình 3D')}
   </button>
   {ready?<div style={{width:'100%',height:320,background:'#edf0e8',borderRadius:12,overflow:'hidden'}}>
    <Suspense fallback={<p>Loading 3D model…</p>}>
     <Canvas camera={{position:[1.7,1.2,2.3],fov:48}} dpr={[1,1.5]} frameloop="demand"
        gl={{alpha:false,antialias:true,powerPreference:'low-power'}}>
       <color attach="background" args={['#edf0e8']}/>
       <ambientLight intensity={1.4}/>
       <directionalLight position={[4,5,3]} intensity={1.5}/>
       <CuratedModel modelKey={modelKey} scale={1.5}/>
       <OrbitControls enableDamping={false} enablePan={false} minDistance={1.5} maxDistance={5}/>
      </Canvas>
    </Suspense>
   </div>:null}
   <p className="big-description">{language==='en'?'Drag to rotate, scroll to zoom. This is an original, reviewed GLB model stored inside Brian.':'Kéo để xoay, cuộn để phóng to. Đây là mô hình GLB gốc được kiểm duyệt và lưu trong mã Brian.'}</p>
 </div>;
}
