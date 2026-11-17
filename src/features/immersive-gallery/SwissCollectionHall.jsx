import React,{Suspense} from 'react';
import {useCanvasTexture} from './PekMuseumArchitecture.jsx';
import {CrestImage} from './SwissEditorialHallDetails.jsx';
import SwissGalleryFurnishings from './SwissGalleryFurnishings.jsx';
import MetalWallLettering from './MetalWallLettering.jsx';
import {hasMetalLetteringGlyphs} from './metalLetteringGeometry.js';
import {useEditorialWallTexture} from './SwissEditorialHall.jsx';
import {PEK_GALLERY_WALL_INSCRIPTIONS} from './pekMuseumMotto.js';
import {collectionHallHeight,collectionHallPosition,collectionFurnishingAt} from './swissCollectionLayout.js';

const pine='#254536',brass='#a8874a',ink='#211f1b',selectedRed='#b53326';
const coveHeight=collectionHallHeight-.28;
const friezeHeight=1.46;
const friezeCenter=coveHeight-friezeHeight/2-.05;

function FallbackCollectionTitle({title}){
 const label=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle=pine;ctx.textBaseline='middle';
  ctx.font='800 88px Arial, sans-serif';
  ctx.fillText(title,0,h*.50,w);
 },[1300,132],[title]);
 return <mesh position={[.44,.018,.007]}>
  <planeGeometry args={[7.4,.42]}/><meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false}/>
 </mesh>;
}

function CollectionWallLabel({title,index,x,current}){
 const caption=String(title??'');
 const size=.375;
 return <group position={[x,4.13,.022]}>
  <MetalWallLettering lines={[String(index+1).padStart(2,'0')]} maxWidth={.48} size={size}
   depth={.034} position={[-4.23,.025,0]} align="left" finish={current?'red':'bronze'}/>
  {hasMetalLetteringGlyphs(caption)?<MetalWallLettering lines={[caption]} maxWidth={7.38} size={size}
   depth={.034} position={[-3.46,.025,0]} align="left"/>:<FallbackCollectionTitle title={caption}/>}
  <mesh position={[0,-.177,.006]}>
   <boxGeometry args={[8.47,.025,.018]}/><meshBasicMaterial color={brass} toneMapped={false}/>
  </mesh>
 </group>;
}

function Divider({x,corner=false}){
 const height=corner?coveHeight:4.43;
 return <group position={[x,height/2-.064,corner?.16:.31]}>
  <mesh>
   <boxGeometry args={[corner?.29:.23,height,corner?.32:.62]}/>
   <meshStandardMaterial color={pine} roughness={.78}/>
  </mesh>
  <mesh position={[.065,0,corner?.164:.313]}>
   <boxGeometry args={[.025,height,.018]}/>
   <meshStandardMaterial color={brass} roughness={.50}/>
  </mesh>
 </group>;
}

function Track({x}){
 return <group position={[x,coveHeight-.15,1.32]}>
  <mesh><boxGeometry args={[8.7,.055,.11]}/><meshStandardMaterial color={ink}/></mesh>
  {[-2.78,0,2.78].map(offset=><group key={offset} position={[offset,-.12,0]} rotation={[-.40,0,0]}>
   <mesh><cylinderGeometry args={[.085,.10,.21,12]}/><meshStandardMaterial color={ink} roughness={.64}/></mesh>
   <mesh position={[0,-.106,0]} rotation={[Math.PI/2,0,0]}>
    <circleGeometry args={[.071,12]}/><meshBasicMaterial color="#fff3d7" toneMapped={false}/>
   </mesh>
  </group>)}
 </group>;
}

function WallFrieze({length,inscription}){
 const {name,lines}=inscription;
 const width=Math.min(length-2.3,lines.length===1?11.8:9.15);
 return <>
  <mesh position={[0,friezeCenter,.026]}>
   <boxGeometry args={[length,friezeHeight,.074]}/>
   <meshBasicMaterial color="#eee6d5" toneMapped={false}/>
  </mesh>
  <MetalWallLettering name={name} lines={lines} maxWidth={width} position={[0,friezeCenter,.065]}
   size={lines.length===1?.60:.405} lineStep={.408} depth={.057}/>
  <mesh position={[0,friezeCenter-friezeHeight/2,.073]}>
   <boxGeometry args={[length-.24,.025,.028]}/>
   <meshBasicMaterial color={brass} toneMapped={false}/>
  </mesh>
 </>;
}

function GalleryCeiling({width,depth}){
 const panels=3,span=(depth-2.48)/panels;
 return <group name="GalleryCofferedCeiling">
  <mesh position={[0,collectionHallHeight,0]} rotation={[Math.PI/2,0,0]}>
   <planeGeometry args={[width,depth]}/><meshBasicMaterial color="#c9beaa" toneMapped={false}/>
  </mesh>
  {Array.from({length:panels},(_,i)=>{
   const z=(i-(panels-1)/2)*span;
   return <group key={i} position={[0,collectionHallHeight-.20,z]}>
    <mesh rotation={[Math.PI/2,0,0]}>
     <planeGeometry args={[width-2.56,span-.27]}/><meshBasicMaterial color="#e2daca" toneMapped={false}/>
    </mesh>
    {[-.5,.5].map(sign=><mesh key={sign} position={[0,-.05,sign*(span/2-.18)]}>
     <boxGeometry args={[width-2.6,.06,.082]}/><meshBasicMaterial color="#ad9d83" toneMapped={false}/>
    </mesh>)}
   </group>;
  })}
 </group>;
}

function GalleryStoneFloor({width,depth,onWalk}){
 const cols=Math.max(1,Math.round(width/2.25)),rows=Math.max(1,Math.round(depth/2.25));
 const stone=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#afa492';ctx.fillRect(0,0,w,h);
  let seed=291;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const tileW=w/cols,tileH=h/rows;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const base=178+Math.round(rnd()*13);
   ctx.fillStyle='rgb('+base+','+(base-7)+','+(base-18)+')';
   ctx.fillRect(col*tileW+1,row*tileH+1,tileW-1.5,tileH-1.5);
  }
  const chips=['#e8deca99','#71695f55','#ab8d6659','#f4ecdd83','#847b6c47'];
  for(let i=0;i<16000;i++){
   const x=rnd()*w,y=rnd()*h,size=.55+rnd()*(i%7===0?3.8:1.8);
   ctx.fillStyle=chips[i%chips.length];ctx.fillRect(x,y,size,size*.79);
  }
  const light=ctx.createRadialGradient(.50*w,.55*h,0,.50*w,.55*h,.70*w);
  light.addColorStop(0,'#fff5dc29');light.addColorStop(.72,'#fff5dc00');light.addColorStop(1,'#59452c27');
  ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
 },[1536,1536],[cols,rows]);
 return <mesh name="TerrazzoGalleryFloor" position={[0,-.08,0]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
  <planeGeometry args={[width,depth]}/><meshBasicMaterial map={stone} toneMapped={false}/>
 </mesh>;
}

export default function SwissCollectionHall({hall,collections,collectionIndex,onTeleport}){
 const plaster=useEditorialWallTexture(true);
 const width=hall.halfWidth*2,depth=hall.halfDepth*2;
 return <group name="PetrusKyFourWallGallery">
  <GalleryStoneFloor width={width} depth={depth} onWalk={event=>{
   event.stopPropagation();
   const [x,z]=collectionHallPosition(hall,event.point.x,event.point.z);
   if(!collectionFurnishingAt(hall,x,z))onTeleport([x,z]);
  }}/>
  <GalleryCeiling width={width} depth={depth}/>
  <SwissGalleryFurnishings furnishings={hall.furnishings}/>
  {hall.walls.map((wall,i)=><group key={i} name={'CollectionWall'+(i+1)} position={[wall.x,0,wall.z]} rotation={[0,wall.yaw,0]}>
   <mesh position={[0,collectionHallHeight/2,-.061]}>
    <boxGeometry args={[wall.length,collectionHallHeight+.16,.12]}/>
    <meshBasicMaterial color="#d7cbb9" toneMapped={false}/>
   </mesh>
   <mesh position={[0,coveHeight+.01,.44]}>
    <boxGeometry args={[wall.length-.12,.17,.88]}/><meshBasicMaterial color="#d7c9b4" toneMapped={false}/>
   </mesh>
   <mesh position={[0,coveHeight-.095,.74]}>
    <boxGeometry args={[wall.length-.35,.032,.19]}/><meshBasicMaterial color="#fff0c8" toneMapped={false}/>
   </mesh>
   <WallFrieze length={wall.length} inscription={PEK_GALLERY_WALL_INSCRIPTIONS[i]}/>
   {wall.bays.map((bay,j)=>{
    const span=wall.length/wall.bays.length;
    const next=wall.bays[j+1];
    return <React.Fragment key={bay.index}>
     <mesh position={[(j-(wall.bays.length-1)/2)*span,2.23,.003]}>
      <planeGeometry args={[span,4.62]}/><meshBasicMaterial map={plaster} toneMapped={false}/>
     </mesh>
     <Track x={bay.x}/>
     <CollectionWallLabel title={collections[bay.index].title} index={bay.index} x={bay.x} current={bay.index===collectionIndex}/>
     {bay.index===collectionIndex?<mesh name="CurrentCollectionFloorMarker" position={[bay.x,-.071,1.36]}>
      <boxGeometry args={[3.2,.007,.065]}/><meshBasicMaterial color={selectedRed} toneMapped={false}/>
     </mesh>:null}
     {next?<Divider x={(bay.x+next.x)/2}/>:null}
    </React.Fragment>;
   })}
   <mesh position={[0,.035,.034]}>
    <boxGeometry args={[wall.length,.21,.075]}/><meshBasicMaterial color={pine} toneMapped={false}/>
   </mesh>
   <Divider x={wall.length/2-.15} corner/>
   <mesh position={[0,-.074,1.36]}>
    <boxGeometry args={[wall.length-2.72,.006,.026]}/><meshBasicMaterial color={brass} toneMapped={false}/>
   </mesh>
   {i===0?<group position={[-wall.length/2+.80,friezeCenter,.081]} scale={.68}>
    <mesh><boxGeometry args={[.97,1.22,.07]}/><meshStandardMaterial color="#f4ead3" roughness={.66}/></mesh>
    <Suspense fallback={null}><CrestImage/></Suspense>
   </group>:null}
  </group>)}
 </group>;
}
