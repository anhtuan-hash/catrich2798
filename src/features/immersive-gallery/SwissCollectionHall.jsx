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
 return <group position={[x,height/2-.064,corner?.14:.23]}>
  <mesh>
   <boxGeometry args={[corner?.32:.29,height,corner?.28:.46]}/>
   <meshStandardMaterial color={pine} roughness={.72}/>
  </mesh>
  {[-.088,0,.088].map(offset=><mesh key={offset} position={[offset,0,corner?.146:.236]}>
   <boxGeometry args={[.041,height-.10,.022]}/>
   <meshStandardMaterial color={offset===0?brass:'#496456'} metalness={offset===0?.34:0} roughness={.54}/>
  </mesh>)}
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
   <meshBasicMaterial color="#f0e8d8" toneMapped={false}/>
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
 const panels=3,span=(depth-3.10)/panels;
 const panelWidth=width-3.10;
 const recess=useCanvasTexture((ctx,w,h)=>{
  const glow=ctx.createLinearGradient(0,0,0,h);
  glow.addColorStop(0,'#c7baa5');glow.addColorStop(.045,'#e4dacf');
  glow.addColorStop(.13,'#f8efe1');glow.addColorStop(.50,'#ede5d9');
  glow.addColorStop(.87,'#f8efe1');glow.addColorStop(.955,'#e4dacf');
  glow.addColorStop(1,'#c7baa5');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 },[64,256],[]);
 return <group name="GalleryCofferedCeiling">
  <mesh position={[0,collectionHallHeight,0]} rotation={[Math.PI/2,0,0]}>
   <planeGeometry args={[width,depth]}/><meshBasicMaterial color="#d8cdbb" toneMapped={false}/>
  </mesh>
  {Array.from({length:panels},(_,i)=>{
   const z=(i-(panels-1)/2)*span;
   return <group key={i} position={[0,collectionHallHeight-.14,z]}>
    <mesh rotation={[Math.PI/2,0,0]}>
     <planeGeometry args={[panelWidth,span-.34]}/><meshBasicMaterial map={recess} toneMapped={false}/>
    </mesh>
    {[-1,1].map(sign=><React.Fragment key={sign}>
     <mesh position={[0,-.045,sign*(span/2-.18)]}>
      <boxGeometry args={[panelWidth+.09,.18,.12]}/><meshBasicMaterial color="#a9997d" toneMapped={false}/>
     </mesh>
     <mesh position={[0,-.102,sign*(span/2-.28)]}>
      <boxGeometry args={[panelWidth-.14,.04,.055]}/><meshBasicMaterial color="#fff2d6" toneMapped={false}/>
     </mesh>
     <mesh position={[sign*(panelWidth/2+.025),-.046,0]}>
      <boxGeometry args={[.10,.17,span-.25]}/><meshBasicMaterial color="#b5a78c" toneMapped={false}/>
     </mesh>
    </React.Fragment>)}
   </group>;
  })}
 </group>;
}

function GalleryStoneFloor({width,depth,onWalk}){
 const stone=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#a89983';ctx.fillRect(0,0,w,h);
  let seed=291;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const cols=Math.round(width/2.9),rows=Math.round(depth/1.85);
  const tileW=w/cols,tileH=h/rows;
  for(let row=0;row<rows;row++){
   const stagger=row%2?.5:0;
   for(let col=-1;col<cols;col++){
    const x=(col+stagger)*tileW,y=row*tileH;
    const base=190+Math.round(rnd()*14);
    ctx.fillStyle='rgb('+base+','+(base-9)+','+(base-22)+')';
    ctx.fillRect(x+1,y+1,tileW-1.4,tileH-1.4);
    ctx.fillStyle='#fff3df38';
    ctx.fillRect(x+1,y+1,tileW-1.4,1.25);
   }
  }
  for(let i=0;i<1100;i++){
   const x=rnd()*w,y=rnd()*h,rx=7+rnd()*56,ry=1.7+rnd()*8;
   const wash=ctx.createRadialGradient(0,0,0,0,0,1);
   wash.addColorStop(0,i%3===0?'#8f775326':'#fff3d82e');
   wash.addColorStop(1,'#ffffff00');
   ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);ctx.fillStyle=wash;
   ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  for(let i=0;i<7200;i++){
   const x=rnd()*w,y=rnd()*h;
   ctx.fillStyle=i%3===0?'#7d6f5630':'#fff6df57';
   ctx.fillRect(x,y,.6+rnd()*2.0,.45+rnd());
  }
  const light=ctx.createRadialGradient(.50*w,.50*h,.1*w,.50*w,.50*h,.68*w);
  light.addColorStop(0,'#fff0ca2a');light.addColorStop(1,'#59452c23');
  ctx.fillStyle=light;ctx.fillRect(0,0,w,h);

  // The inlay follows the walls, with equal physical margins on all four sides.
  const inlay=(offset,color)=>{
   const x=w*offset/width,y=h*offset/depth;
   ctx.strokeStyle=color;ctx.strokeRect(x,y,w-x*2,h-y*2);
  };
  ctx.lineWidth=12;inlay(.72,'#4e594a');
  ctx.lineWidth=2;inlay(.84,'#b9955c');inlay(.60,'#c6a976');
 },[1536,1536],[width,depth]);
 return <mesh name="LimestoneGalleryFloor" position={[0,-.08,0]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
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
    <boxGeometry args={[wall.length-.12,.17,.88]}/><meshBasicMaterial color="#ddd1be" toneMapped={false}/>
   </mesh>
   <mesh position={[0,coveHeight-.095,.74]}>
    <boxGeometry args={[wall.length-.35,.030,.13]}/><meshBasicMaterial color="#fff4d8" toneMapped={false}/>
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
    <boxGeometry args={[wall.length,.23,.10]}/><meshBasicMaterial color={pine} toneMapped={false}/>
   </mesh>
   <mesh position={[0,.151,.048]}>
    <boxGeometry args={[wall.length-.18,.029,.115]}/><meshBasicMaterial color="#687062" toneMapped={false}/>
   </mesh>
   <Divider x={wall.length/2-.15} corner/>
   {i===0?<group position={[-wall.length/2+.80,friezeCenter,.081]} scale={.68}>
    <mesh><boxGeometry args={[.97,1.22,.07]}/><meshStandardMaterial color="#f4ead3" roughness={.66}/></mesh>
    <Suspense fallback={null}><CrestImage/></Suspense>
   </group>:null}
  </group>)}
 </group>;
}
