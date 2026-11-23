import React from 'react';
import * as THREE from 'three';
import {useCanvasTexture} from './PekMuseumArchitecture.jsx';
import SwissEditorialHallDetails from './SwissEditorialHallDetails.jsx';
import MetalWallLettering from './MetalWallLettering.jsx';
import {PEK_MUSEUM_MOTTO,PEK_COURTESY_MOTTO,PEK_TEACHER_MOTTO_LINES} from './pekMuseumMotto.js';

const ink='#211f1b';
const red='#cc2f20';
const trackPositions=[-2.46,.34,3.14];

function grain(ctx,width,height,strength){
 const image=ctx.getImageData(0,0,width,height);
 let seed=19;
 for(let i=0;i<image.data.length;i+=4){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const shade=(seed/4294967296-.5)*strength;
  image.data[i]+=shade;
  image.data[i+1]+=shade;
  image.data[i+2]+=shade;
 }
 ctx.putImageData(image,0,0);
}

export function SwissArtworkLabel({title,index,width,position}){
 const digits=String(index+1).padStart(2,'0');
 const label=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#f3f0e8';ctx.fillRect(0,0,w,h);
  ctx.fillStyle=ink;ctx.fillRect(175,0,5,h);
  ctx.font='800 88px Arial, sans-serif';ctx.textBaseline='middle';
  ctx.fillText(digits,37,h*.53);
  ctx.font='700 74px Arial, sans-serif';
  ctx.fillText(title||'',207,h*.53,w-242);
 },[1120,184],[title,index]);
 return <group position={position}>
  <mesh><boxGeometry args={[width,.29,.035]}/><meshStandardMaterial color={ink} roughness={.75}/></mesh>
  <mesh position={[0,0,.020]}><planeGeometry args={[width-.034,.255]}/><meshBasicMaterial map={label} toneMapped={false}/></mesh>
 </group>;
}

export function useEditorialWallTexture(light=false){
 return useCanvasTexture((ctx,w,h)=>{
  const wall=ctx.createLinearGradient(0,0,0,h);
  wall.addColorStop(0,light?'#c1b39f':'#d2c6b1');wall.addColorStop(.34,light?'#e7d9c3':'#ebe0cb');wall.addColorStop(1,light?'#c5b8a4':'#c3b59e');
  ctx.fillStyle=wall;ctx.fillRect(0,0,w,h);
  for(const x of light?[.10,.27,.53,.79]:[.267,.532,.795]){
   ctx.save();ctx.translate(w*x,h*.14);ctx.scale(1,1.55);
   const beam=ctx.createRadialGradient(0,0,0,0,0,w*.155);
   beam.addColorStop(0,'rgba(255,239,208,.89)');beam.addColorStop(.46,'rgba(255,237,206,.32)');
   beam.addColorStop(1,'rgba(255,236,205,0)');
   ctx.fillStyle=beam;ctx.fillRect(-w*.155,-w*.155,w*.31,w*.31);ctx.restore();
  }
  grain(ctx,w,h,8);
 },[1024,512],[light]);
}

function useEditorialFloorTexture(){
 return useCanvasTexture((ctx,w,h)=>{
  const floor=ctx.createLinearGradient(0,0,0,h);
  floor.addColorStop(0,'#8c806e');floor.addColorStop(.16,'#bdb19b');floor.addColorStop(.52,'#a69a88');floor.addColorStop(1,'#837969');
  ctx.fillStyle=floor;ctx.fillRect(0,0,w,h);
  for(const x of [.15,.36,.55,.74,.89]){
   ctx.save();ctx.translate(x*w,h*.13);ctx.scale(1,2);
   const gloss=ctx.createRadialGradient(0,0,0,0,0,w*.10);
   gloss.addColorStop(0,'rgba(255,234,194,.44)');gloss.addColorStop(1,'rgba(255,234,194,0)');
   ctx.fillStyle=gloss;ctx.fillRect(-w*.1,-w*.1,w*.2,w*.2);ctx.restore();
  }
  grain(ctx,w,h,12);
 },[768,768],[]);
}

export default function SwissEditorialHall({roomNumber,roomTitle,exhibits,onTeleport,onRoomGuide,roomGuideLabel}){
 const plaster=useEditorialWallTexture();
 const concrete=useEditorialFloorTexture();
 const number=useCanvasTexture((ctx,w,h)=>{
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 312px Arial, sans-serif';
  ctx.fillStyle=red;ctx.fillText(roomNumber,w/2,h/2+9);
 },[512,384],[roomNumber]);
 return <group name="SwissEditorialHall">
  <mesh position={[0,-.08,0]} rotation={[-Math.PI/2,0,0]} onClick={event=>{
   event.stopPropagation();
   if(event.delta<=6)onTeleport?.([THREE.MathUtils.clamp(event.point.x,-5.9,5.9),event.point.z]);
  }}>
   <planeGeometry args={[14,18]}/><meshBasicMaterial map={concrete} toneMapped={false}/>
  </mesh>
  <mesh position={[0,4.85,0]} rotation={[Math.PI/2,0,0]}>
   <planeGeometry args={[14,18]}/><meshStandardMaterial color="#e6dfd0" roughness={.94}/>
  </mesh>
  <mesh position={[0,2.38,-9]}><boxGeometry args={[14,4.88,.12]}/><meshStandardMaterial color="#c6baaa" roughness={.94}/></mesh>
  {[-7,7].map(x=><mesh key={x} position={[x,2.38,0]}>
   <boxGeometry args={[.12,4.88,18]}/><meshStandardMaterial color="#c6bbad" roughness={.94}/>
  </mesh>)}
  {[-6.85,6.85].map(x=><group key={x} position={[x,0,0]}>
   <mesh position={[0,.045,0]}><boxGeometry args={[.065,.22,17.8]}/><meshStandardMaterial color="#463d32" roughness={.83}/></mesh>
   <mesh position={[0,4.57,0]}><boxGeometry args={[.19,.16,17.6]}/><meshStandardMaterial color="#d3c9b7" roughness={.9}/></mesh>
   <mesh position={[0,4.481,0]}><boxGeometry args={[.056,.012,17.5]}/><meshBasicMaterial color="#f6e9cc" toneMapped={false}/></mesh>
  </group>)}
  <MetalWallLettering name="PetrusKyWallCourtesy" lines={[PEK_COURTESY_MOTTO]}
   maxWidth={6.2} size={.33} position={[6.925,3.44,-3.1]} rotation={[0,-Math.PI/2,0]}/>
  <MetalWallLettering name="PetrusKyWallTeacher" lines={PEK_TEACHER_MOTTO_LINES}
   maxWidth={6.2} size={.33} lineStep={.41} position={[-6.925,3.44,-3.1]} rotation={[0,Math.PI/2,0]}/>
  <mesh position={[0,2.17,-8.26]}><boxGeometry args={[10.7,4.48,.65]}/><meshStandardMaterial color="#9d9081" roughness={.94}/></mesh>
  <mesh position={[0,2.17,-7.934]}><planeGeometry args={[10.7,4.48]}/><meshBasicMaterial map={plaster} toneMapped={false}/></mesh>
  <mesh position={[-3.55,4.09,-7.925]}><planeGeometry args={[.85,.58]}/><meshBasicMaterial map={number} transparent toneMapped={false}/></mesh>
  <MetalWallLettering name="PetrusKyWallMotto" lines={[PEK_MUSEUM_MOTTO]}
   maxWidth={6.84} size={.37} position={[.58,4.10,-7.928]}/>
  <mesh position={[.58,3.89,-7.918]}>
   <boxGeometry args={[6.84,.014,.012]}/><meshBasicMaterial color="#a5833c" toneMapped={false}/>
  </mesh>
  <mesh position={[0,4.49,-6.71]}><boxGeometry args={[11.45,.13,.43]}/><meshStandardMaterial color="#d6ccbb" roughness={.92}/></mesh>
  <mesh position={[0,4.415,-6.82]}><boxGeometry args={[11,.018,.07]}/><meshBasicMaterial color="#fbebcb" toneMapped={false}/></mesh>
  <mesh position={[0,4.39,-6.48]}><boxGeometry args={[11.05,.042,.056]}/><meshStandardMaterial color={ink}/></mesh>
  {trackPositions.map(x=><group key={x} position={[x,4.19,-6.44]} rotation={[-.26,0,.07]}>
   <mesh><cylinderGeometry args={[.074,.092,.22,16]}/><meshStandardMaterial color={ink} roughness={.63}/></mesh>
   <mesh position={[0,-.111,0]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.069,16]}/><meshBasicMaterial color="#fff2d6" toneMapped={false}/></mesh>
  </group>)}
  <SwissEditorialHallDetails title={roomTitle} exhibits={exhibits} onRoomGuide={onRoomGuide} roomGuideLabel={roomGuideLabel}/>
 </group>;
}
