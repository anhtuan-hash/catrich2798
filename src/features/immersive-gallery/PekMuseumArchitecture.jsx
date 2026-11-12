// BRIAN PEK Discovery Hall — an original interpretation of publicly documented
// Pétrus Ký School motifs. NOT a scan or faithful replica of any school campus.
// Visual references: school's teal/yellow/white facades, pine motif, and the
// four published school values. No remote photos, student information or logos.
import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';

export const PEK_MUSEUM_IDENTITY=Object.freeze({
 school:'TRƯỜNG TRUNG – TIỂU HỌC PÉTRUS KÝ',
 hall:'PÉTRUS KÝ DISCOVERY MUSEUM',
 subtitle:'THE PIONEERS · STUDENT EXHIBITION',
 colors:Object.freeze({pine:'#176F57',teal:'#138F86',mint:'#DDEFE9',gold:'#E8BA49',
  cream:'#FAF7ED',ink:'#203D41',yellow:'#F1D875',stone:'#E9E5D8'}),
 values:Object.freeze([
  ['THÂN THIỆN','FRIENDLINESS'],
  ['TRÁCH NHIỆM','RESPONSIBILITY'],
  ['HỢP TÁC','CO-OPERATION'],
  ['PHÁT TRIỂN','DEVELOPMENT']
 ])
});
const C=PEK_MUSEUM_IDENTITY.colors;
const limited=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,110);
function useCanvasTexture(draw,size=[1024,256],deps=[]){
 const texture=useMemo(()=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=size[0];canvas.height=size[1];
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return null;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  draw(ctx,canvas.width,canvas.height);
  const result=new THREE.CanvasTexture(canvas);
  result.colorSpace=THREE.SRGBColorSpace;
  result.anisotropy=2;result.needsUpdate=true;
  return result;
 // Texture is intentionally only recalculated on its content and variant.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },deps);
 useEffect(()=>()=>{texture?.dispose();},[texture]);
 return texture;
}
function Typography({text,subtitle='',position,size=[5.5,.68],type='banner',rotation=[0,0,0]}){
 const headline=limited(text),sub=limited(subtitle);
 const map=useCanvasTexture((ctx,w,h)=>{
  const dark=type==='banner'||type==='values';
  ctx.fillStyle=dark?'#1D695B':type==='gold'?'#F4E2A7':'#FBFEFC';
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle=dark?'#D7B85D':'#1C806C';ctx.lineWidth=8;
  ctx.strokeRect(12,12,w-24,h-24);
  ctx.fillStyle=dark?'#F7F2DA':'#245047';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=type==='banner'?'bold 92px Arial,sans-serif':'bold 75px Arial,sans-serif';
  ctx.fillText(headline,w/2,sub?h*.43:h*.53,w-105);
  if(sub){
   ctx.fillStyle=dark?'#E6D7A5':'#568778';
   ctx.font='600 32px Arial,sans-serif';
   ctx.fillText(sub,w/2,h*.76,w-95);
  }
 },[1024,256],[headline,sub,type]);
 if(!map)return null;
 return <mesh position={position} rotation={rotation}>
  <planeGeometry args={size}/><meshBasicMaterial map={map} toneMapped={false} side={THREE.DoubleSide} transparent={false}/>
 </mesh>;
}
function SchoolPineSeal({position=[-5.72,4.85,-7.89],size=1.1,rotation=[0,0,0]}){
 const map=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(w/2,h/2,w*.482,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#C7AA56';ctx.lineWidth=17;ctx.stroke();
  ctx.fillStyle='#12664B';ctx.beginPath();ctx.arc(w/2,h/2,w*.41,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#F0CD59';
  // A newly drawn pine silhouette alludes to the school's tree emblem.
  for(let i=0;i<4;i++){
   const yy=175+i*62,half=35+i*45;
   ctx.beginPath();ctx.moveTo(274,yy-75);ctx.lineTo(274-half,yy+60);
   ctx.lineTo(274+half,yy+60);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#F8FBF7';ctx.font='900 90px Arial';ctx.textAlign='center';
  ctx.fillText('PéK',275,412,330);
  ctx.font='bold 27px Arial';ctx.fillText('THE PIONEERS',270,467,310);
 },[512,512],[]);
 return <group position={position} rotation={rotation}>
  <mesh><cylinderGeometry args={[size*.53,size*.53,.065,40]} rotation={[Math.PI/2,0,0]}/>
   <meshStandardMaterial color="#E9CD82" metalness={.56} roughness={.29}/></mesh>
  {map?<mesh position={[0,0,.046]}>
   <planeGeometry args={[size,size]}/>
   <meshBasicMaterial map={map} transparent toneMapped={false} side={THREE.DoubleSide}/>
  </mesh>:null}
 </group>;
}
function SculpturePine({x=5.5,z=0}){
 return <group position={[x,0,z]}>
  <mesh position={[0,.26,0]}><cylinderGeometry args={[.66,.76,.5,24]}/>
   <meshStandardMaterial color="#E7E0D2" roughness={.65}/></mesh>
  <mesh position={[0,.52,0]}><cylinderGeometry args={[.43,.52,.14,28]}/>
   <meshStandardMaterial color="#D0AF68" metalness={.48} roughness={.34}/></mesh>
  <mesh position={[0,1.19,0]}><cylinderGeometry args={[.10,.13,1.18,12]}/>
   <meshStandardMaterial color="#8D623F" roughness={.79}/></mesh>
  {[0,1,2,3].map(i=><mesh key={i} position={[0,1.3+i*.33,0]}>
   <coneGeometry args={[.54-i*.10,.75-i*.06,7]}/>
   <meshStandardMaterial color={i%2===0?'#217B5D':'#33957B'} roughness={.82} flatShading/>
  </mesh>)}
  <mesh position={[0,2.57,0]}><sphereGeometry args={[.11,12,8]}/>
   <meshStandardMaterial color="#E5BE55" emissive="#BC8C26" emissiveIntensity={.22}/></mesh>
 </group>;
}
function BookSculpture({x=-5.5,z=0}){
 return <group position={[x,0,z]}>
  <mesh position={[0,.30,0]}><cylinderGeometry args={[.68,.75,.58,24]}/>
   <meshStandardMaterial color="#E8E0D2" roughness={.7}/></mesh>
  <mesh position={[0,.64,0]}><cylinderGeometry args={[.55,.55,.12,24]}/>
   <meshStandardMaterial color="#D1B369" metalness={.35} roughness={.55}/></mesh>
  {[0,1,2,3].map((i)=><group key={i} position={[0,.87+i*.3,0]} rotation={[0,i*.13,i%2===0?-.09:.08]}>
   <mesh><boxGeometry args={[1.1,.22,.69]}/>
    <meshStandardMaterial color={['#126D61','#E8C45D','#2C8481','#F4E8CD'][i]} roughness={.65}/></mesh>
   <mesh position={[.06,0,.355]}><boxGeometry args={[.94,.15,.02]}/>
    <meshStandardMaterial color="#FBF8EC"/></mesh>
  </group>)}
  <mesh position={[0,2.18,0]}><octahedronGeometry args={[.31]}/>
   <meshStandardMaterial color="#E4BD58" metalness={.48} roughness={.33}/></mesh>
 </group>;
}
function PavilionWindows({side,z,index}){
 const x=side*6.86;
 const rotation=[0,side===-1?Math.PI/2:-Math.PI/2,0];
 return <group position={[x,3.2,z]} rotation={rotation}>
  <mesh><boxGeometry args={[3.28,3.1,.07]}/>
   <meshStandardMaterial color={index%2===0?'#DCECE8':'#E8F0DB'} roughness={.84}/></mesh>
  <mesh position={[0,0,.06]}><planeGeometry args={[2.88,2.72]}/>
   <meshStandardMaterial color="#AFCFC6" metalness={.08} roughness={.31} transparent opacity={.62}/></mesh>
  {[-1.48,0,1.48].map(xx=><mesh key={xx} position={[xx,0,.14]}>
   <boxGeometry args={[.10,3.1,.09]}/><meshStandardMaterial color="#FCFEF8"/></mesh>)}
  {[-1.48,0,1.48].map(yy=><mesh key={yy} position={[0,yy,.14]}>
   <boxGeometry args={[3.2,.095,.09]}/><meshStandardMaterial color="#FCFEF8"/></mesh>)}
  <mesh position={[0,0,.17]}><boxGeometry args={[.08,3.02,.055]}/>
   <meshStandardMaterial color="#138779"/></mesh>
  <mesh position={[0,0,.17]}><boxGeometry args={[3.04,.08,.055]}/>
   <meshStandardMaterial color="#138779"/></mesh>
  <mesh position={[0,-1.8,.08]}><boxGeometry args={[3.38,.18,.3]}/>
   <meshStandardMaterial color="#E2C765" roughness={.56}/></mesh>
 </group>;
}
function SchoolValue({side=-1,z=3,vi,en}){
 const rotation=[0,side===-1?Math.PI/2:-Math.PI/2,0],x=side*6.81;
 return <group position={[x,1.23,z]} rotation={rotation}>
  <mesh position={[0,0,-.045]}><boxGeometry args={[3.12,.59,.085]}/>
   <meshStandardMaterial color="#E6C56B" metalness={.12} roughness={.59}/></mesh>
  <Typography text={vi} subtitle={en} position={[0,0,.02]} size={[3.02,.51]} type="values"/>
 </group>;
}
export function PekMuseumArchitecture({template='classic',lite=false}){
 const compact=lite;
 return <group>
  {/* Campus-inspired grand front wall, not a literal campus replica. */}
  <mesh position={[0,2.71,-8.10]}>
   <boxGeometry args={[11.9,3.94,.17]}/>
   <meshStandardMaterial color="#FAFDF7" roughness={.86}/></mesh>
  <mesh position={[0,4.72,-8.08]}>
   <boxGeometry args={[11.95,.16,.19]}/>
   <meshStandardMaterial color={C.gold} metalness={.17} roughness={.54}/></mesh>
  <mesh position={[0,.74,-8.08]}>
   <boxGeometry args={[11.95,.15,.21]}/>
   <meshStandardMaterial color={C.teal} roughness={.68}/></mesh>
  {[[-6.1,'#1B8F86'],[6.1,'#1B8F86']].map(([x,color])=>
   <group key={x}>
    <mesh position={[x,2.8,-8.33]}><boxGeometry args={[.36,5.62,.68]}/>
     <meshStandardMaterial color={color} metalness={.12} roughness={.68}/></mesh>
    <mesh position={[x,5.54,-8.3]}><boxGeometry args={[.63,.18,.71]}/>
     <meshStandardMaterial color={C.gold} roughness={.56}/></mesh>
   </group>)}
  {/* Actual name in typography, warm-gold border, and an original pine reinterpretation. */}
  <mesh position={[0,5.17,-8.02]}><boxGeometry args={[8.8,.84,.12]}/>
   <meshStandardMaterial color="#F4D775" metalness={.18} roughness={.49}/></mesh>
  <Typography text="PÉTRUS KÝ" subtitle="DISCOVERY MUSEUM • THE PIONEERS"
   position={[0,5.16,-7.93]} size={[8.6,.71]} type="banner"/>
  <SchoolPineSeal position={[-5.72,5.08,-7.93]} size={1.02}/>
  <mesh position={[5.71,5.07,-7.99]}><cylinderGeometry args={[.52,.52,.08,32]} rotation={[Math.PI/2,0,0]}/>
   <meshStandardMaterial color="#E4C46B" metalness={.52} roughness={.39}/></mesh>
  <Typography text="PEK" subtitle="2008" position={[5.71,5.07,-7.91]} size={[.92,.72]} type="gold"/>
  {/* Architecture echoes the photographed teal-yellow-white campus facades. */}
  {[-5.95,5.95].map(x=><group key={'yellow-'+x}>
   <mesh position={[x,3,-8.76]}><boxGeometry args={[1.48,5.72,.09]}/>
    <meshStandardMaterial color="#F6DA79" roughness={.76}/></mesh>
   <mesh position={[x,3,-8.66]}><boxGeometry args={[.20,5.7,.15]}/>
    <meshStandardMaterial color="#128C80" roughness={.65}/></mesh>
  </group>)}
  {[-1,1].map(side=><group key={side}>
   {[[-5.45,0],[.65,1]].map(([z,index])=>
    <PavilionWindows key={z} side={side} z={z} index={index}/>)}
   <SchoolValue side={side} z={-2.0}
    vi={side===-1?'THÂN THIỆN':'HỢP TÁC'} en={side===-1?'FRIENDLINESS':'CO-OPERATION'}/>
   <SchoolValue side={side} z={3.7}
    vi={side===-1?'TRÁCH NHIỆM':'PHÁT TRIỂN'} en={side===-1?'RESPONSIBILITY':'DEVELOPMENT'}/>
  </group>)}
  {/* Skylight coffers and a soft daytime wash. */}
  <mesh position={[0,5.90,-.3]}><boxGeometry args={[8.6,.12,10.4]}/>
   <meshStandardMaterial color="#F9FBF7" roughness={.8}/></mesh>
  {[-3.9,-1.95,0,1.95,3.9].map(x=><mesh key={'sky-'+x} position={[x,5.80,-.35]}>
   <boxGeometry args={[.14,.10,9.7]}/>
   <meshStandardMaterial color={x===0?C.gold:'#4C9E92'} roughness={.59}/></mesh>)}
  {[-4.7,-1.55,1.55,4.7].map(z=><mesh key={'beam-'+z} position={[0,5.82,z]}>
   <boxGeometry args={[8.2,.10,.14]}/>
   <meshStandardMaterial color="#8EB9B3" roughness={.54}/></mesh>)}
  {[[-2.75,-6], [0,-6],[2.75,-6],[-3.0,-2.2],[3,-2.2]].map(([x,z],i)=>
   <group key={i}>
    <mesh position={[x,5.47,z]}><cylinderGeometry args={[.09,.12,.22,12]}/>
     <meshStandardMaterial color="#F3F2E9" metalness={.23} roughness={.44}/></mesh>
    <pointLight position={[x,4.66,z-.35]} color="#FFF0CD" intensity={compact?.45:.66} distance={6.8} decay={2}/>
   </group>)}
  {/* A calm central terrazzo promenade and an identity medallion. */}
  <mesh position={[0,-.057,-3.0]} rotation={[-Math.PI/2,0,0]}>
   <planeGeometry args={[5.4,10.65]}/>
   <meshStandardMaterial color="#FAF5E7" roughness={.88} metalness={.01}/></mesh>
  {[-2.62,2.62].map(x=><mesh key={x} position={[x,-.048,-3.0]}>
   <boxGeometry args={[.055,.016,10.2]}/>
   <meshStandardMaterial color={C.gold} roughness={.57}/></mesh>)}
  <mesh position={[0,-.043,-2.1]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[1.24,40]}/>
   <meshStandardMaterial color="#CEE7D9" roughness={.68}/></mesh>
  <mesh position={[0,-.037,-2.1]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[1.08,1.18,40]}/>
   <meshBasicMaterial color={C.gold} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,-.034,-2.1]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[.78,.83,40]}/>
   <meshBasicMaterial color={C.pine} side={THREE.DoubleSide}/></mesh>
  {/* Two handcrafted school-inspired display objects, outside the art sightline. */}
  {!compact?<><BookSculpture x={-5.25} z={-2.65}/><SculpturePine x={5.25} z={-2.65}/></>:null}
  {/* Simple, non-blocking visual pools mark the three student exhibit bays. */}
  {[-3,0,3].map(x=><group key={'bay-'+x}>
   <mesh position={[x,.61,-7.88]}><boxGeometry args={[2.67,.10,.23]}/>
    <meshStandardMaterial color="#D5BC7B" metalness={.11} roughness={.69}/></mesh>
   <mesh position={[x,4.12,-7.89]}><boxGeometry args={[2.76,.07,.2]}/>
    <meshStandardMaterial color="#1E8275" roughness={.53}/></mesh>
   <mesh position={[x,4.02,-7.75]}><boxGeometry args={[.09,.16,.11]}/>
    <meshStandardMaterial color="#E3CB85" emissive="#B89D48" emissiveIntensity={.13}/></mesh>
  </group>)}
 </group>;
}
export function ExhibitWallLabel({title,index=0}){
 const safe=limited(title||'STUDENT ARTWORK');
 const map=useCanvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#FAF7ED';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#196F5C';ctx.fillRect(0,0,11,h);
  ctx.fillStyle='#3C5D5B';ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.font='bold 35px Arial';ctx.fillText(String(index+1).padStart(2,'0'),35,h/2,85);
  ctx.fillStyle='#A38B49';ctx.fillRect(125,21,2,h-42);
  ctx.fillStyle='#253F42';ctx.font='bold 39px Arial';
  ctx.fillText(safe,157,h/2,w-187);
 },[768,128],[safe,index]);
 if(!map)return null;
 return <group position={[0,-1.24,.14]}>
  <mesh position={[0,0,-.045]}><boxGeometry args={[2.27,.39,.045]}/>
   <meshStandardMaterial color="#CBB57F" roughness={.65}/></mesh>
  <mesh position={[0,0,.0]}><planeGeometry args={[2.20,.33]}/>
   <meshBasicMaterial map={map} toneMapped={false}/></mesh>
 </group>;
}
