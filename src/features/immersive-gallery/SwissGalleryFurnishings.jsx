import React,{useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {BufferAttribute,BufferGeometry,Color,DoubleSide,Object3D} from 'three';
import {useCanvasTexture} from './PekMuseumArchitecture.jsx';

const green='#243c34',brass='#896d44';
const planterProfile=[
 [0,0],[.31,0],[.40,.045],[.42,.12],[.48,.53],[.49,.59],
 [.48,.61],[.43,.61],[.42,.57],[.36,.12],[0,.12]
];
const porcelainProfile=[
 [0,0],[.16,0],[.19,.025],[.24,.15],[.28,.28],[.265,.37],
 [.22,.41],[.115,.49],[.105,.57],[.13,.61],[.13,.635],
 [.10,.635],[.095,.61],[.09,.57],[.08,.51],[.11,.46],[.15,.40],[0,.22]
];
const culms=[
 {x:-.24,z:.02,height:1.76,lean:-.10},
 {x:-.095,z:-.14,height:1.97,lean:-.04},
 {x:.10,z:.04,height:1.54,lean:.09},
 {x:.22,z:-.08,height:1.84,lean:.14},
 {x:.04,z:.18,height:1.34,lean:.02}
];
const leafColors=['#567a4b','#476b43','#78925d','#315f45','#678650'];
const ceramicColors=['#557b70','#9f644d'];

function points(profile){
 return profile.map(([x,y])=>({x,y}));
}

function createLeaf(){
 const geometry=new BufferGeometry();
 // A folded blade gains a bright central vein from its real surface normals.
 geometry.setAttribute('position',new BufferAttribute(new Float32Array([
  0,0,0, -.12,.38,-.045, 0,.39,.038, .105,.40,-.041,
  -.05,.77,-.08, 0,.76,-.025, .045,.76,-.085, .014,1,-.17,
 ]),3));
 geometry.setIndex([0,2,1,0,3,2,1,2,4,2,5,4,2,3,5,3,6,5,4,5,7,5,6,7]);
 geometry.computeVertexNormals();
 return geometry;
}

function BambooLeaves(){
 const leaves=useRef(null);
 const materialColors=useMemo(()=>leafColors.map(hex=>new Color(hex)),[]);
 const geometry=useMemo(createLeaf,[]);
 const sprigs=useMemo(()=>culms.flatMap(({x,z,height,lean},i)=>
  Array.from({length:8},(_,j)=>{
   const t=.32+.081*j;
   const angle=i*1.62+j*2.38;
   const reach=.18+.045*(j%3);
   const stem=[x-height*t*Math.sin(lean),.52+height*t-.035,z];
   const end=[stem[0]+Math.cos(angle)*reach,stem[1]+.035,z+Math.sin(angle)*reach];
   return {stem,end,angle,scale:.31+.033*((i+j)%4),
    lift:-.33+(j%4)*.20,tilt:1.02+((i+j)%3)*.27,color:(i+j)%leafColors.length};
  })
 ),[]);
 const branches=useMemo(()=>new Float32Array(sprigs.flatMap(({stem,end})=>[...stem,...end])),[sprigs]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useLayoutEffect(()=>{
  const mesh=leaves.current;
  if(!mesh)return;
  const pose=new Object3D();
  sprigs.forEach(({end,angle,scale,lift,tilt,color},i)=>{
   pose.position.set(...end);
   pose.rotation.set(lift,angle,tilt,'YXZ');
   pose.scale.set(scale*.83,scale,scale);
   pose.updateMatrix();
   mesh.setMatrixAt(i,pose.matrix);
   mesh.setColorAt(i,materialColors[color]);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingSphere();
 },[materialColors,sprigs]);
 return <>
  <lineSegments>
   <bufferGeometry><bufferAttribute attach="attributes-position" args={[branches,3]}/></bufferGeometry>
   <lineBasicMaterial color="#5e754a"/>
  </lineSegments>
  <instancedMesh ref={leaves} args={[geometry,undefined,sprigs.length]}>
   <meshStandardMaterial color="#fffaf0" roughness={.82} side={DoubleSide}/>
  </instancedMesh>
 </>;
}

function BambooPlanter(){
 return <group name="BambooPlanter">
  <mesh>
   <latheGeometry args={[points(planterProfile),24]}/>
   <meshStandardMaterial color="#c2b3a0" roughness={.88}/>
  </mesh>
  <mesh position={[0,.515,0]}>
   <cylinderGeometry args={[.423,.405,.085,22]}/><meshStandardMaterial color="#40372a" roughness={1}/>
  </mesh>
  {culms.map(({x,z,height,lean},i)=><group key={x} position={[x,.52,z]} rotation={[0,0,lean]}>
   <mesh position={[0,height/2,0]}>
    <cylinderGeometry args={[.012,.024,height,7]}/><meshStandardMaterial color={i%2?'#7b884e':'#5e754a'} roughness={.76}/>
   </mesh>
   {[.24,.48,.72,.91].map(t=><mesh key={t} position={[0,height*t,0]}>
    <cylinderGeometry args={[.021,.022,.018,7]}/><meshStandardMaterial color="#475d39" roughness={.9}/>
   </mesh>)}
  </group>)}
  <BambooLeaves/>
 </group>;
}

function CeramicDisplay({index}){
 const profileScale=index%2?[.88,1.11,.88]:[1,1,1];
 return <group name="CeramicDisplay">
  <mesh position={[0,.055,0]}>
   <boxGeometry args={[.93,.11,.93]}/><meshStandardMaterial color={green} roughness={.65}/>
  </mesh>
  <mesh position={[0,.423,0]}>
   <boxGeometry args={[.81,.68,.81]}/><meshStandardMaterial color="#d1c5ae" roughness={.89}/>
  </mesh>
  <mesh position={[0,.777,0]}>
   <boxGeometry args={[.83,.028,.83]}/><meshStandardMaterial color={brass} roughness={.48} metalness={.52}/>
  </mesh>
  <group position={[0,.797,0]} scale={profileScale}>
   <mesh>
    <latheGeometry args={[points(porcelainProfile),26]}/>
    <meshStandardMaterial color={ceramicColors[index%2]} roughness={.40}/>
   </mesh>
  </group>
 </group>;
}

export default function SwissGalleryFurnishings({furnishings}){
 const shadow=useCanvasTexture((ctx,w,h)=>{
  const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  gradient.addColorStop(0,'#21180f63');gradient.addColorStop(.44,'#21180f44');gradient.addColorStop(1,'#21180f00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 },[64,64],[]);
 return <group name="SwissGalleryFurnishings">
  {furnishings.map(({kind,x,z,halfWidth,halfDepth},i)=><group key={kind+i} position={[x,-.08,z]}>
   <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]}>
    <planeGeometry args={[halfWidth*2+.42,halfDepth*2+.40]}/>
    <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false}/>
   </mesh>
   {kind==='bamboo'?<BambooPlanter/>:<CeramicDisplay index={i}/>}
  </group>)}
 </group>;
}
