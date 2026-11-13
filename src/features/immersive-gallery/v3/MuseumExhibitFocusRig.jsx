import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {useFrame,useThree} from '@react-three/fiber';
import MuseumExhibitInfoPlaque from './MuseumExhibitInfoPlaque.jsx';
import {museumFocusLayout,selectFocusDuration,smoothstep} from './museumExhibitFocusMotion.js';
// These are live, tangible objects in the existing hall Canvas.
// The artwork itself MUST remain exclusively in PaperArtwork, not here.
export default function MuseumExhibitFocusRig({phase,board,onBack,lite=false}){
 const {size,invalidate}=useThree();
 const aspect=size.width/Math.max(1,size.height);
 const layout=useMemo(()=>museumFocusLayout(aspect),[aspect]);
 const root=useRef(null),progress=useRef(0),previousPhase=useRef('');
 const target=useMemo(()=>{
  const obj=new THREE.Object3D();obj.position.set(layout.art[0],layout.art[1],layout.art[2]);
  return obj;
 },[layout.art[0],layout.art[1],layout.art[2]]);
 useEffect(()=>{invalidate();},[phase,invalidate,aspect]);
 useFrame((_,delta)=>{
  if(!root.current)return;
  if(previousPhase.current!==phase){previousPhase.current=phase;invalidate();}
  const wants=phase==='returning'||phase==='idle'?0:phase==='preparing'?0:
   phase==='extracting'?.86:1;
  const rate=Math.min(delta,.05)/(selectFocusDuration(phase,
   typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  if(Math.abs(wants-progress.current)>.001){
   progress.current=THREE.MathUtils.lerp(progress.current,wants,Math.min(1,rate*2.7));
   invalidate();
  }else progress.current=wants;
  const v=smoothstep(progress.current);
  root.current.visible=v>.001;
  root.current.position.y=-.32*(1-v);
  root.current.scale.setScalar(.88+.12*v);
 });
 if(phase==='idle'||!board)return null;
 const showText=phase==='presenting'||phase==='focused';
 return <group ref={root} name="MuseumV5FocusRig" renderOrder={3}>
  <group position={layout.pedestal}>
   <mesh position={[0,.08,0]} receiveShadow>
    <boxGeometry args={[3.06,.54,.84]}/>
    <meshStandardMaterial color="#E8E0D1" roughness={.78} metalness={.04}/>
   </mesh>
   <mesh position={[0,.36,0]}>
    <boxGeometry args={[3.10,.055,.87]}/>
    <meshStandardMaterial color="#C8A34B" roughness={.42} metalness={.52}/>
   </mesh>
   <mesh position={[0,.11,.44]}>
    <boxGeometry args={[2.2,.22,.035]}/>
    <meshStandardMaterial color="#BE994B" roughness={.47} metalness={.48}/>
   </mesh>
   <mesh position={[0,.11,.465]}>
    <boxGeometry args={[2.08,.14,.012]}/>
    <meshStandardMaterial color="#FFF9EB" roughness={.86}/>
   </mesh>
   <mesh position={[0,-.26,0]}>
    <boxGeometry args={[3.32,.07,1.04]}/>
    <meshStandardMaterial color="#B0A493" roughness={.77}/>
   </mesh>
  </group>
  <group position={[layout.art[0],5.63,layout.art[2]+.12]}>
   <mesh rotation={[Math.PI/2,0,0]}>
    <torusGeometry args={[1.50,.077,9,72,Math.PI*1.06]}/>
    <meshStandardMaterial color="#C8A34B" metalness={.53} roughness={.4}/>
   </mesh>
   {[-.93,0,.93].map((x,i)=><group key={i} position={[x,0,0]}>
    <mesh position={[0,-.20,0]}>
     <cylinderGeometry args={[.15,.19,.21,20]}/>
     <meshStandardMaterial color="#B59149" metalness={.48} roughness={.43}/>
    </mesh>
    <mesh position={[0,-.32,0]}>
     <sphereGeometry args={[.085,12,8]}/>
     <meshBasicMaterial color="#FFF1D1"/>
    </mesh>
    {!lite||i===1?<spotLight position={[0,-.27,0]} target={target}
      color="#FFF1D1" intensity={lite?1.5:2.1} angle={.29}
      penumbra={.85} distance={7.2} decay={2}/>:null}
   </group>)}
  </group>
  <primitive object={target}/>
  <mesh position={[layout.art[0],-.045,layout.art[2]]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[1.78,1.82,64]}/>
   <meshBasicMaterial color="#C8A34B" side={THREE.DoubleSide}/>
  </mesh>
  <MuseumExhibitInfoPlaque board={board} position={layout.plaque}
   width={layout.plaqueWidth} height={layout.plaqueHeight}
   compact={aspect<1.38}
   interactive={phase==='focused'} onBack={onBack}/>
 </group>;
}
