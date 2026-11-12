import React,{Suspense,useState} from 'react';
import {createRoot} from 'react-dom/client';
import GalleryCanvas from '../../src/features/immersive-gallery/GalleryCanvasR3F.jsx';
import GalleryModelInspector from '../../src/features/immersive-gallery/GalleryModelInspector.jsx';
import '../../src/features/immersive-gallery/gallery.css';
const examples=[
 {id:'art-climate',title:'Our Planet, Our Future',kind:'text',description:'An original synthetic climate poster.',transform:{position:[-2.7,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}},
 {id:'art-book',title:'Language Heritage',kind:'model',model_key:'book',description:'An original curated GLB book.',transform:{position:[0,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}},
 {id:'art-globe',title:'Planet Model',kind:'model',model_key:'globe',description:'An original curated GLB globe.',transform:{position:[2.7,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}},
];
function Harness(){
 const [room,setRoom]=useState('classic'),[quality,setQuality]=useState('balanced'),[selected,setSelected]=useState('');
 return <main className="big-gallery" data-qa-gallery-harness="synthetic-only">
  <div className="big-hero"><small>QA Fixture · Original Demo Data</small><h1>Brian Gallery 3D</h1><p>This isolated renderer test is never linked from production navigation.</p></div>
  <div className="big-controls">
   {['classic','culture','lab','lobby'].map(key=><button id={'qa-'+key} key={key} onClick={()=>{setRoom(key);setSelected('');}} aria-pressed={room===key}>{key}</button>)}
   <button id="qa-lite" onClick={()=>setQuality('lite')}>Lite mode</button>
   <button id="qa-high" onClick={()=>setQuality('high')}>High mode</button>
  </div>
  <p id="qa-status" role="status">Room: {room}; quality: {quality}; selected: {selected||'none'}</p>
  <div style={{margin:'18px auto',maxWidth:1000}}>
   <Suspense fallback={<div role="status">Loading renderer…</div>}>
     <GalleryCanvas key={room} template={room} exhibits={examples} quality={quality} selectedId={selected}
       onSelect={setSelected} language="en"/>
   </Suspense>
  </div>
  <div className="big-controls"><button id="qa-inspect" onClick={()=>setSelected('art-globe')}>Inspect curated GLB</button><button id="qa-close" onClick={()=>setSelected('')}>Close exhibit</button></div>
  {selected==='art-globe'?<div className="big-paper"><GalleryModelInspector modelKey="globe" language="en"/></div>:null}
  <div className="big-paper" role="region" aria-label="Accessible exhibit list">{examples.map(e=><button key={e.id} onClick={()=>setSelected(e.id)}>{e.title}</button>)}</div>
 </main>;
}
createRoot(document.getElementById('gallery-qa-root')).render(<Harness/>);
