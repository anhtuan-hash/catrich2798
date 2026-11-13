import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {focusLayout,smoothstep,clampDelta} from './museumExhibitFocusMotion.js';
import {excerptSentences} from './museumExhibitFocusData.js';

function PlaqueText({board,onBack,phase}){
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>setExpanded(false),[board?.title,board?.description]);
 const {excerpt,hasMore}=excerptSentences(board?.description||'',365);
 return <div className="bml-v5-plaque-copy" data-testid="museum-focus-stage"
  data-focus-phase={phase} role="region" aria-label="Exhibit information in the 3D museum"
  onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
  onWheel={e=>e.stopPropagation()}>
  <div className="bml-v5-plaque-eyebrow">EXHIBIT INSPECTION</div>
  <h2 data-testid="museum-focus-title">{board?.title||'Exhibit'}</h2>
  <div className="bml-v5-plaque-rule" aria-hidden="true"/>
  <div className="bml-v5-plaque-scroll" tabIndex={0} aria-label="Exhibit text and sources">
   <p data-testid="museum-focus-description">{expanded?board?.description:excerpt}</p>
   {hasMore?<button type="button" className="bml-v5-details" aria-expanded={expanded}
    onClick={()=>setExpanded(v=>!v)}>{expanded?'Read less':'Read more'}</button>:null}
   {board?.improvement?<p><strong>After peer testing:</strong> {board.improvement}</p>:null}
   <div className="bml-v5-plaque-source" data-testid="museum-focus-source">
    <strong>Source</strong>
    <span>{board?.source||'Source not provided'}</span>
   </div>
   {board?.imageSource?<p className="bml-v5-attribution">Image source: {board.imageSource}
    {board?.imageRights?' · Rights: '+board.imageRights:''}</p>:null}
   {/* Keep the authentic citation visible before the optional longer tally.
       The complete group survey remains scrollable below, never omitted. */}
   {board?.survey?<div className="bml-v5-survey">
    <strong>Group-priority survey · N={board.survey.n} groups</strong>
    {board.survey.options.map((opt,i)=><div key={i}>
     <span>{opt.label}</span><b>{opt.count}/{board.survey.n} ({opt.percent}%)</b>
    </div>)}
    <small>{board.survey.caveat}</small>
   </div>:null}
  </div>
  <button type="button" className="bml-v5-back" data-testid="museum-back-to-wall"
   disabled={phase!=='focused'} onClick={onBack}>
   <span aria-hidden="true">←</span> Back to wall
  </button>
 </div>;
}

function MuseumFocusSpotlight({position,aim,lite=false,index=0}){
 const target=useMemo(()=>{
  const object=new THREE.Object3D();
  object.position.set(...aim);
  return object;
 },[...aim]);
 return <>
  <primitive object={target}/>
  <mesh position={position}>
   <cylinderGeometry args={[.13,.18,.22,16]}/>
   <meshStandardMaterial color="#C4A160" metalness={.64} roughness={.34}/>
  </mesh>
  <mesh position={[position[0],position[1]-.127,position[2]]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[.135,16]}/><meshBasicMaterial color="#FFE8BB"/>
  </mesh>
  {!lite||index===1?<spotLight position={[position[0],position[1]-.18,position[2]]}
   target={target} color="#FFF1D1" angle={.41} penumbra={.78}
   intensity={lite?1.65:1.24} distance={6.8} decay={2}/>:null}
 </>;
}
/** This stage holds only a plinth, physical board and light, never a copy of the poster. */
export default function MuseumExhibitFocusRig({focus,board,onBack,lite=false}){
 const {size,invalidate}=useThree();
 const stage=useRef(null),boardGroup=useRef(null),pedestalGroup=useRef(null);
 const active=focus?.phase!=='idle'&&focus?.phase!=='error';
 const layout=focusLayout(size.width,size.height);
 const motion=useRef(0);
 useFrame((_,delta)=>{
  if(!active||!stage.current)return;
  const isReturn=focus.phase==='returning';
  const desired=isReturn?0:1;
  const duration=isReturn?.75:1.0;
  const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const step=reduced?1:clampDelta(delta)/duration;
  motion.current=Math.max(0,Math.min(1,motion.current+(desired>motion.current?step:-step)));
  const p=smoothstep(motion.current);
  stage.current.position.y=0;
  stage.current.scale.setScalar(1);
  stage.current.visible=p>.002;
  if(pedestalGroup.current)pedestalGroup.current.scale.set(layout.pedestalScale||1,Math.max(.001,p),layout.pedestalScale||1);
  if(boardGroup.current){
   boardGroup.current.position.y=layout.board[1]-.24*(1-p);
   boardGroup.current.scale.setScalar(Math.max(.001,p*(layout.boardScale||1)));
  }
  if(Math.abs(motion.current-desired)>.0001)invalidate();
 });
 useEffect(()=>{if(active)invalidate();else motion.current=0;},[active,focus?.phase,invalidate]);
 if(!active)return null;
 return <group ref={stage} name="MuseumV5FocusStage" userData={{focusStage:true}}>
  {/* Museum stone podium: foreground physical mesh, NOT a second artwork. */}
  <group ref={pedestalGroup} position={[layout.artwork[0],0,layout.artwork[2]]}>
   <mesh position={[0,.24,-.08]} castShadow receiveShadow>
    <boxGeometry args={[2.89,.48,.93]}/>
    <meshStandardMaterial color="#E8E0D1" metalness={.08} roughness={.67}/>
   </mesh>
   <mesh position={[0,.49,-.08]}>
    <boxGeometry args={[2.97,.056,.99]}/>
    <meshStandardMaterial color="#C8A34B" metalness={.57} roughness={.38}/>
   </mesh>
   <mesh position={[0,.55,.0]}>
    <boxGeometry args={[2.72,.085,.90]}/>
    <meshStandardMaterial color="#EFE9DB" metalness={.05} roughness={.7}/>
   </mesh>
   <mesh position={[0,.18,.396]}>
    <boxGeometry args={[1.60,.22,.027]}/>
    <meshStandardMaterial color="#B9954A" metalness={.53} roughness={.43}/>
   </mesh>
   <mesh position={[0,.18,.417]}>
    <boxGeometry args={[1.49,.17,.01]}/>
    <meshStandardMaterial color="#F8EED6" metalness={.01} roughness={.8}/>
   </mesh>
   <mesh position={[0,.0,-.08]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[1.64,1.69,48]}/>
    <meshBasicMaterial color="#C8A34B" side={THREE.DoubleSide} depthWrite={false}/>
   </mesh>
  </group>
  {/* Three real warm spotlights aimed at the original artwork's focus pose. */}
  {[-.74,0,.74].map((offset,i)=><MuseumFocusSpotlight key={i} index={i}
   position={[layout.artwork[0]+offset,5.28,layout.artwork[2]-.10]}
   aim={[layout.artwork[0]+offset*.32,2.40,layout.artwork[2]+.17]}
   lite={lite}/>)}
  {/* Physical freestanding plaque and support stand. No fullscreen HTML panel. */}
  <group ref={boardGroup} position={layout.board} name="MuseumV5PhysicalInformationBoard">
   <mesh castShadow receiveShadow>
    <boxGeometry args={[2.63,3.03,.16]}/>
    <meshStandardMaterial color="#C8A34B" metalness={.48} roughness={.39}/>
   </mesh>
   <mesh position={[0,0,.087]}>
    <boxGeometry args={[2.50,2.90,.014]}/>
    <meshStandardMaterial color="#FFF9EB" metalness={.025} roughness={.78}/>
   </mesh>
   {[-1,1].map(x=>[-1,1].map(y=><mesh key={x+'-'+y}
    position={[x*1.17,y*1.35,.105]}>
    <boxGeometry args={[.17,.035,.02]}/>
    <meshStandardMaterial color="#BDA15B" metalness={.55} roughness={.39}/>
   </mesh>))}
   <mesh position={[0,-1.88,-.09]}>
    <cylinderGeometry args={[.065,.095,.78,16]}/>
    <meshStandardMaterial color="#C09A4C" metalness={.55} roughness={.37}/>
   </mesh>
   <mesh position={[0,-2.22,-.07]}>
    <cylinderGeometry args={[.48,.59,.12,28]}/>
    <meshStandardMaterial color="#C8A34B" metalness={.48} roughness={.4}/>
   </mesh>
   <Html transform center position={[0,0,.114]} distanceFactor={3.1} occlude={false}>
    <PlaqueText board={board} phase={focus.phase} onBack={onBack}/>
   </Html>
  </group>
 </group>;
}
