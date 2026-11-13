import React from 'react';
import {Html} from '@react-three/drei';
// Physical board + world-anchored, selectable HTML text. There is no
// fullscreen/fixed dialog, no second Canvas, and no synthetic museum image.
const GREEN='#0D5B45',GOLD='#C8A34B';
export default function MuseumExhibitInfoPlaque({board,position=[1.69,2.35,-3.43],
 width=2.58,height=3.03,onBack,interactive=false,compact=false}){
 if(!board)return null;
 const plaqueHeight=height,plaqueWidth=width;
 return <group name="MuseumExhibitInfoPlaque" position={position} data-testid="museum-focus-plaque-mesh">
  <mesh position={[0,0,-.065]} receiveShadow>
   <boxGeometry args={[plaqueWidth+.11,plaqueHeight+.11,.145]}/>
   <meshStandardMaterial color={GOLD} metalness={.56} roughness={.38}/>
  </mesh>
  <mesh position={[0,0,.024]}>
   <boxGeometry args={[plaqueWidth,plaqueHeight,.05]}/>
   <meshStandardMaterial color="#FFF9EB" metalness={.02} roughness={.91}/>
  </mesh>
  <mesh position={[0,-plaqueHeight/2-.58,-.04]} castShadow>
   <cylinderGeometry args={[.055,.07,1.10,14]}/>
   <meshStandardMaterial color="#AF8B3F" metalness={.52} roughness={.4}/>
  </mesh>
  <mesh position={[0,-plaqueHeight/2-1.15,-.03]} castShadow>
   <cylinderGeometry args={[.32,.37,.12,22]}/>
   <meshStandardMaterial color="#B0914D" metalness={.42} roughness={.45}/>
  </mesh>
  {[-1,1].flatMap(dx=>[-1,1].map(dy=><mesh
   key={dx+','+dy} position={[dx*(plaqueWidth/2-.12),dy*(plaqueHeight/2-.12),.062]}>
   <sphereGeometry args={[.025,10,8]}/>
   <meshStandardMaterial color={GOLD} metalness={.66} roughness={.28}/>
  </mesh>))}
  <Html center transform distanceFactor={1.65} position={[0,0,.105]}
   style={{pointerEvents:interactive?'auto':'none'}}>
   <article data-testid="museum-focus-info-board"
    className={'bml-v5-world-board '+(compact?'is-compact':'')}
    aria-label={'In-room exhibit information: '+board.title}>
    <div className="bml-v5-board-scroll">
     <div className="bml-v5-board-eyebrow">{board.eyebrow}</div>
     <h2 id="museum-focus-heading" tabIndex={-1}>{board.title}</h2>
     <div className="bml-v5-board-rule"/>
     {board.description?<p className="bml-v5-board-copy">{board.description}</p>:
      <p className="bml-v5-board-copy">No group description is available.</p>}
     {board.fullDescription?<details className="bml-v5-board-more">
      <summary>Read full description</summary>
      <p>{board.fullDescription}</p>
     </details>:null}
     <section className="bml-v5-board-source" aria-label="Exhibit citation">
      <strong>Source</strong>
      <p>{board.source||'Source not provided'}</p>
     </section>
     {board.evidence?<details className="bml-v5-board-more bml-v5-survey">
      <summary>Group survey · N={board.evidence.n}</summary>
      <div className="bml-v5-survey-rows">{board.evidence.options.map((o,i)=>
       <p key={i}><span>{o.label}</span><strong>{o.count}/{board.evidence.n} ({o.percent}%)</strong></p>)}</div>
      <small>{board.evidence.caveat}</small>
     </details>:null}
     {board.improvement?<details className="bml-v5-board-more">
      <summary>Change after peer testing</summary><p>{board.improvement}</p>
     </details>:null}
     {board.imageSource?<details className="bml-v5-board-more">
      <summary>Image attribution</summary><p>{board.imageSource}</p>
      {board.imageRights?<p>Rights: {board.imageRights}</p>:null}
     </details>:null}
    </div>
    <button data-testid="museum-back-to-wall" type="button" className="bml-v5-back-to-wall"
     disabled={!interactive} onClick={event=>{event.stopPropagation();onBack?.();}}>
     <span aria-hidden="true">←</span> Back to wall
    </button>
   </article>
  </Html>
 </group>;
}
