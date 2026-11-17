import React,{Suspense} from 'react';
import {useCanvasTexture} from './PekMuseumArchitecture.jsx';
import {CrestImage} from './SwissEditorialHallDetails.jsx';
import {SwissWallInscription,useEditorialHallTextures} from './SwissEditorialHall.jsx';
import {PEK_COURTESY_MOTTO,PEK_MUSEUM_MOTTO,PEK_TEACHER_MOTTO_LINES} from './pekMuseumMotto.js';
import {collectionHallHeight,collectionHallPosition} from './swissCollectionLayout.js';

const pine='#254536',brass='#aa8445',ink='#211f1b';
const wallMottoes=[[PEK_COURTESY_MOTTO],PEK_TEACHER_MOTTO_LINES,[PEK_MUSEUM_MOTTO]];
const mottoNames=['PetrusKyWallCourtesy','PetrusKyWallTeacher','PetrusKyWallMotto'];

function CollectionWallLabel({title,index,x}){
 const label=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle=pine;ctx.textBaseline='middle';
  ctx.font='800 85px Arial, sans-serif';
  ctx.fillText(String(index+1).padStart(2,'0')+'  '+title,18,h*.45,w-36);
  ctx.fillStyle=brass;ctx.fillRect(18,h*.86,w-36,4);
 },[1440,132],[title,index]);
 return <mesh position={[x,4.13,.013]}>
  <planeGeometry args={[8.7,.53]}/>
  <meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false}/>
 </mesh>;
}

function Divider({x,corner=false}){
 const height=corner?collectionHallHeight:4.09;
 return <group position={[x,height/2-.064,corner?.14:.31]}>
  <mesh><boxGeometry args={[corner?.26:.20,height,corner?.28:.62]}/><meshStandardMaterial color={pine} roughness={.85}/></mesh>
  <mesh position={[.055,0,corner?.143:.313]}>
   <boxGeometry args={[.022,height,.018]}/><meshStandardMaterial color={brass} roughness={.52}/>
  </mesh>
 </group>;
}

function Track({x}){
 return <group position={[x,5.36,1.04]}>
  <mesh><boxGeometry args={[8.7,.07,.12]}/><meshStandardMaterial color={ink}/></mesh>
  {[-2.78,0,2.78].map(offset=><group key={offset} position={[offset,-.11,0]} rotation={[-.39,0,0]}>
   <mesh><cylinderGeometry args={[.079,.094,.19,10]}/><meshStandardMaterial color={ink} roughness={.67}/></mesh>
   <mesh position={[0,-.096,0]} rotation={[Math.PI/2,0,0]}>
    <circleGeometry args={[.068,10]}/><meshBasicMaterial color="#fff3d7" toneMapped={false}/>
   </mesh>
  </group>)}
 </group>;
}

export default function SwissCollectionHall({hall,collections,onTeleport}){
 const {plaster,concrete}=useEditorialHallTextures(true);
 const width=hall.halfWidth*2,depth=hall.halfDepth*2;
 return <group name="PetrusKyFourWallGallery">
  <mesh position={[0,-.08,0]} rotation={[-Math.PI/2,0,0]} onClick={event=>{
   event.stopPropagation();
   onTeleport(collectionHallPosition(hall,event.point.x,event.point.z));
  }}>
   <planeGeometry args={[width,depth]}/><meshBasicMaterial map={concrete} toneMapped={false}/>
  </mesh>
  <mesh position={[0,collectionHallHeight,0]} rotation={[Math.PI/2,0,0]}>
   <planeGeometry args={[width,depth]}/><meshBasicMaterial color="#c6bbaa"/>
  </mesh>
  {hall.walls.map((wall,i)=><group key={i} name={'CollectionWall'+(i+1)} position={[wall.x,0,wall.z]} rotation={[0,wall.yaw,0]}>
   <mesh position={[0,collectionHallHeight/2,-.061]}>
    <boxGeometry args={[wall.length,collectionHallHeight+.16,.12]}/>
    <meshBasicMaterial color="#d0c0aa" toneMapped={false}/>
   </mesh>
   {wall.bays.map((bay,j)=>{
    const title=collections[bay.index].title;
    const span=wall.length/wall.bays.length;
    const next=wall.bays[j+1];
    return <React.Fragment key={bay.index}>
     <mesh position={[(j-(wall.bays.length-1)/2)*span,collectionHallHeight/2,.002]}>
      <planeGeometry args={[span,collectionHallHeight]}/><meshBasicMaterial map={plaster} toneMapped={false}/>
     </mesh>
     <Track x={bay.x}/>
     <CollectionWallLabel title={title} index={bay.index} x={bay.x}/>
     {next?<Divider x={(bay.x+next.x)/2}/>:null}
    </React.Fragment>;
   })}
   <Divider x={wall.length/2-.13} corner/>
   <mesh position={[0,-.072,1.36]}>
    <boxGeometry args={[wall.length-2.72,.005,.026]}/><meshBasicMaterial color={brass} toneMapped={false}/>
   </mesh>
   {wallMottoes[i]?<SwissWallInscription name={mottoNames[i]} lines={wallMottoes[i]}
    width={i===1?Math.min(wall.length-2,7.7):Math.min(wall.length-2,10.4)}
    height={i===1?1.34:.64} position={[i===1?(wall.bays[0]?.x??0):0,i===1?4.91:4.83,.016]}/>:null}
   {i===2?<group position={[-wall.length/2+1,4.80,.026]} scale={.66}>
    <mesh><boxGeometry args={[.97,1.22,.07]}/><meshStandardMaterial color="#f4ead3" roughness={.66}/></mesh>
    <Suspense fallback={null}><CrestImage/></Suspense>
   </group>:null}
  </group>)}
 </group>;
}
