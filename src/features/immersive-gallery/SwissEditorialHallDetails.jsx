import React,{Suspense} from 'react';
import * as THREE from 'three';
import {useCanvasTexture} from './PekMuseumArchitecture.jsx';
import {usePekSchoolCrest} from './PekDiscoveryHallV4.jsx';

const pine='#263d2c',brass='#c5a14f',ivory='#f4ead3',iron='#211f1b';
const bench={x:-2.08,z:-6.36,width:2.40,depth:.52};
const lectern={x:4.78,z:-7.03,width:.76,depth:.50};
const furniture=[bench,lectern];

export function isEditorialFurnitureAt(x,z){
 const clearance=.18;
 return furniture.some(item=>
  Math.abs(x-item.x)<item.width/2+clearance&&Math.abs(z-item.z)<item.depth/2+clearance);
}

const outline=[
 [0,.96],[.09,.87],[.24,.76],[.13,.75],[.39,.66],[.24,.63],[.52,.52],[.29,.53],
 [.74,.40],[.63,.36],[.39,.35],[.83,.23],[.73,.18],[.48,.19],[.90,.08],[.74,.03],
 [.24,.05],[.51,-.06],[.88,-.16],[.69,-.22],[.36,-.18],[.78,-.36],[.58,-.40],
 [.29,-.33],[.55,-.52],[.36,-.55],[.12,-.47],[.12,-.83],[.17,-.93],[-.11,-.93],
 [-.07,-.47],[-.33,-.59],[-.64,-.57],[-.52,-.45],[-.24,-.35],[-.53,-.40],
 [-.88,-.34],[-.73,-.27],[-.44,-.25],[-.91,-.19],[-.84,-.13],[-.46,-.12],
 [-.98,-.01],[-.78,.06],[-.37,.07],[-.68,.19],[-.72,.26],[-.37,.21],[-.32,.32],
 [-.58,.36],[-.44,.45],[-.21,.46],[-.52,.55],[-.32,.62],[-.15,.60],[-.34,.72],
 [-.23,.76],[-.11,.75],[-.20,.85],[-.07,.85]
];
const pineShape=new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(x*.46,y*.94)));
pineShape.closePath();
const pineRelief={depth:.016,bevelEnabled:true,bevelThickness:.007,bevelSize:.008,bevelSegments:1};
const screwPositions=[[-.42,-.57],[-.42,.57],[.42,-.57],[.42,.57]];

function CrestImage(){
 const crest=usePekSchoolCrest();
 // Match the PNG's intrinsic proportions, including the original lower wordmark.
 return <mesh name="OfficialPetrusKyCrest" position={[0,0,.047]}>
  <planeGeometry args={[.848,.848*768/631]}/>
  <meshBasicMaterial map={crest} transparent toneMapped={false} depthWrite={false}/>
 </mesh>;
}

function SchoolIdentity(){
 return <>
  <group position={[-4.72,0,-7.82]}>
   <mesh position={[0,2.17,0]}>
    <boxGeometry args={[1.22,4.48,.22]}/>
    <meshStandardMaterial color={pine} roughness={.91}/>
   </mesh>
   <mesh position={[.60,2.17,.13]}>
    <boxGeometry args={[.032,4.48,.032]}/>
    <meshStandardMaterial color={brass} metalness={.38} roughness={.46}/>
   </mesh>
   <group name="PetrusKyEnamelPlaque" position={[0,3.15,.14]}>
    <mesh>
     <boxGeometry args={[1.00,1.30,.066]}/>
     <meshStandardMaterial color={ivory} roughness={.58}/>
    </mesh>
    {screwPositions.map(([x,y])=><mesh key={x+':'+y} position={[x,y,.036]}>
     <sphereGeometry args={[.023,8,6]}/>
     <meshStandardMaterial color={brass} metalness={.42} roughness={.40}/>
    </mesh>)}
    <Suspense fallback={null}><CrestImage/></Suspense>
   </group>
   <mesh name="PineRelief" position={[0,1.15,.12]}>
    <extrudeGeometry args={[pineShape,pineRelief]}/>
    <meshStandardMaterial color="#50664a" roughness={.9}/>
   </mesh>
  </group>
  <mesh position={[5.12,2.17,-7.80]}>
   <boxGeometry args={[.44,4.48,.26]}/>
   <meshStandardMaterial color={pine} roughness={.91}/>
  </mesh>
  <mesh position={[4.91,2.17,-7.65]}>
   <boxGeometry args={[.025,4.48,.028]}/>
   <meshStandardMaterial color={brass} metalness={.38} roughness={.46}/>
  </mesh>
 </>;
}

function GalleryFurniture({title,exhibits}){
 const labels=exhibits.slice(0,3).map(exhibit=>exhibit.title).join(' · ');
 const introduction=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle=ivory;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=iron;ctx.textBaseline='middle';
  ctx.font='800 62px Arial, sans-serif';ctx.fillText(title,32,88,w-64);
  ctx.fillStyle=brass;ctx.fillRect(32,141,w-64,4);
  ctx.fillStyle=iron;ctx.font='600 30px Arial, sans-serif';ctx.fillText(labels,32,191,w-64);
 },[640,310],[title,labels]);
 const wood=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#65412b';ctx.fillRect(0,0,w,h);
  for(let line=0;line<64;line++){
   ctx.strokeStyle=line%3===0?'#8f62453c':'#2d1b1738';
   ctx.lineWidth=1+line%3;
   const y=line*h/64;
   ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(w*.35,y-3,w*.66,y+3,w,y-1);ctx.stroke();
  }
 },[512,128],[]);
 const shadow=useCanvasTexture((ctx,w,h)=>{
  const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  gradient.addColorStop(0,'#15130d74');gradient.addColorStop(.44,'#15130d47');
  gradient.addColorStop(1,'#15130d00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 },[128,128],[]);
 return <>
  <group name="GalleryViewingBench" position={[bench.x,-.08,bench.z]}>
   <mesh position={[0,.004,0]} rotation={[-Math.PI/2,0,0]}>
    <planeGeometry args={[bench.width+.32,bench.depth+.48]}/>
    <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false}/>
   </mesh>
   <mesh position={[0,.47,0]}>
    <boxGeometry args={[bench.width,.12,bench.depth]}/>
    <meshStandardMaterial map={wood} roughness={.76}/>
   </mesh>
   {[-1.02,1.02].map(x=><mesh key={x} position={[x,.225,0]}>
    <boxGeometry args={[.052,.45,.45]}/>
    <meshStandardMaterial color={iron} roughness={.58}/>
   </mesh>)}
  </group>
  <group name="RoomIntroductionStand" position={[lectern.x,-.08,lectern.z]}>
   <mesh position={[0,.004,0]} rotation={[-Math.PI/2,0,0]}>
    <planeGeometry args={[.76,.72]}/>
    <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false}/>
   </mesh>
   <mesh position={[0,.027,0]}>
    <cylinderGeometry args={[.21,.23,.044,24]}/>
    <meshStandardMaterial color={iron} roughness={.62}/>
   </mesh>
   <mesh position={[0,.49,0]}>
    <cylinderGeometry args={[.024,.033,.93,12]}/>
    <meshStandardMaterial color={iron} roughness={.58}/>
   </mesh>
   <group position={[0,1.01,0]} rotation={[-.79,-.11,0]}>
    <mesh>
     <boxGeometry args={[lectern.width,.37,.042]}/>
     <meshStandardMaterial color={iron} roughness={.64}/>
    </mesh>
    <mesh position={[0,0,.022]}>
     <planeGeometry args={[.724,.334]}/>
     <meshBasicMaterial map={introduction} toneMapped={false}/>
    </mesh>
   </group>
  </group>
 </>;
}

export default function SwissEditorialHallDetails({title,exhibits}){
 return <group name="PetrusKyGalleryDetails">
  <SchoolIdentity/>
  <GalleryFurniture title={title} exhibits={exhibits}/>
  <mesh position={[-4.76,-.074,-7.03]}>
   <boxGeometry args={[.028,.003,1.14]}/>
   <meshBasicMaterial color={brass} toneMapped={false}/>
  </mesh>
  <mesh position={[-4.32,-.073,-6.46]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[.426,.454,20,1,Math.PI,Math.PI/2]}/>
   <meshBasicMaterial color={brass} toneMapped={false}/>
  </mesh>
  <mesh position={[-.62,-.074,-6.02]}>
   <boxGeometry args={[7.40,.003,.028]}/>
   <meshBasicMaterial color={brass} toneMapped={false}/>
  </mesh>
 </group>;
}
