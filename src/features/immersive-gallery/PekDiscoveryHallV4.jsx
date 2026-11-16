import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';

/**
 * Pétrus Ký Discovery Hall V4 — real meshes, not a flat mockup backdrop.
 * A cinematic gallery layer over the existing traversable museum room.
 * Student exhibits remain independent mesh objects in GalleryCanvasR3F.
 * Performance-lite drops small architectural/foliage accents, never the art.
 */
const INK='#0D5B45',PINE='#176D59',GOLD='#C8A34B',PALE='#F4EBD6';
function useCanvasMap(draw,width,height,deps){
 const map=useMemo(()=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  draw(ctx,width,height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },deps);
 useEffect(()=>()=>map?.dispose(),[map]);
 return map;
}
function DisplayLettering({main,sub,position,size=[8.5,.69],light=false}){
 const map=useMemo(()=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=2048;canvas.height=280;
  const c=canvas.getContext('2d');
  if(!c)return null;
  c.clearRect(0,0,2048,280);
  c.textAlign='center';c.textBaseline='middle';
  c.shadowColor=light?'#0b2e2a':'#1f4337';c.shadowBlur=5;c.shadowOffsetY=3;
  c.fillStyle=light?'#F9E8AF':'#E8CE78';
  c.font='bold 145px Georgia, serif';c.fillText(main,1024,115,1880);
  c.shadowBlur=0;c.shadowOffsetY=0;
  c.font='600 53px Arial, sans-serif';c.letterSpacing='3px';
  c.fillStyle='#EEE6C5';c.fillText(sub,1024,226,1820);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
 },[main,sub,light]);
 useEffect(()=>()=>map?.dispose(),[map]);
 if(!map)return null;
 return <mesh position={position}>
  <planeGeometry args={size}/>
  <meshBasicMaterial map={map} toneMapped={false} transparent depthWrite={false} fog={false}/>
 </mesh>;
}
function SchoolCrest(){
 const crest=useTexture('/museum/branding/petrus-ky-original.png');
 useEffect(()=>{crest.colorSpace=THREE.SRGBColorSpace;crest.anisotropy=4;crest.needsUpdate=true;},[crest]);
 // The previous wall-mounted crest sat BEHIND the central sign board
 // (z=-8.002). Mount the original asset on the sign's front-left plaque.
 // Leave enough room for the wordmark; never hide or redraw its artwork.
 return <group name="SchoolCrestV4" position={[-4.72,4.74,-7.68]}>
  <mesh position={[0,0,-.045]}>
   <boxGeometry args={[.88,.92,.11]}/>
   <meshStandardMaterial color="#F9F8F0" metalness={.06} roughness={.64}/>
  </mesh>
  <mesh position={[0,0,.025]}>
   <planeGeometry args={[.67,.80]}/>
   <meshBasicMaterial map={crest} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false}/>
  </mesh>
  <mesh position={[0,-.43,.04]}>
   <boxGeometry args={[.70,.013,.014]}/>
   <meshStandardMaterial color="#D6B660" metalness={.42} roughness={.36}/>
  </mesh>
 </group>;
}
function Skylight({lite}){
 const arcs=useMemo(()=>[-7.4,-6.25,-5.1,-3.95,-2.8].map(z=>{
  const curve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(-5.7,5.54,z),
   new THREE.Vector3(-3.7,5.99,z),
   new THREE.Vector3(0,6.27,z),
   new THREE.Vector3(3.7,5.99,z),
   new THREE.Vector3(5.7,5.54,z)
  ]);
  return new THREE.TubeGeometry(curve,34,lite?.074:.103,7,false);
 }),[lite]);
 return <group>
  {/* Elliptical translucent skylight with dimensional wood ribs */}
  <mesh position={[0,5.73,-5.15]} rotation={[-Math.PI/2,0,0]} scale={[1.38,.74,1]}>
   <circleGeometry args={[4.08,72]}/>
   <meshStandardMaterial color="#F5F7EA" emissive="#E7EBD5" emissiveIntensity={.22}
    roughness={.65} transparent opacity={.78} side={THREE.DoubleSide}/>
  </mesh>
  <mesh position={[0,5.72,-5.15]} rotation={[-Math.PI/2,0,0]} scale={[1.38,.74,1]}>
   <torusGeometry args={[4.14,.125,10,84]}/>
   <meshStandardMaterial color="#B99A6F" metalness={.12} roughness={.62}/>
  </mesh>
  {arcs.map((g,i)=><mesh key={i} geometry={g}>
   <meshStandardMaterial color={i%2?'#9D754B':'#B59368'} metalness={.08} roughness={.68}/>
  </mesh>)}
  {!lite?[-6.8,-5.4,-4.0,-2.6].map(z=><group key={z}>
   <mesh position={[0,5.72,z]}>
    <boxGeometry args={[10,.07,.055]}/>
    <meshBasicMaterial color="#FFF1C4"/>
   </mesh>
  </group>):null}
 </group>;
}
function WindowBays(){
 const glass=useCanvasMap((ctx,w,h)=>{
  const sky=ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,'#F4FBFF');sky.addColorStop(.45,'#D7F0C8');sky.addColorStop(1,'#FFF3C9');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.globalAlpha=.5;
  [[.2,.24,'#C8A34B'],[.52,.3,'#F6E7B4'],[.8,.22,'#1F6B52'],[.34,.64,'#0D5B45'],[.7,.68,'#E8CE78']].forEach(([x,y,color],i)=>{
   ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(w*x,h*y,78+i*6,48,i*.4,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(232,206,120,.9)';ctx.lineWidth=12;
  ctx.strokeRect(26,26,w-52,h-52);
 },512,640,[]);
 return <group>
  {[-1,1].map(side=>[-4.9,1.1].map(z=><group key={side+'-'+z}
   position={[side*6.83,3.13,z]} rotation={[0,side===-1?Math.PI/2:-Math.PI/2,0]}>
   <mesh position={[0,0,-.04]}>
    <boxGeometry args={[3.42,4.05,.16]}/>
    <meshStandardMaterial color="#2F6A52" metalness={.12} roughness={.48}/>
   </mesh>
   <mesh position={[0,0,.02]}>
    <boxGeometry args={[3.22,3.82,.08]}/>
    <meshStandardMaterial color={GOLD} metalness={.62} roughness={.28}/>
   </mesh>
   <mesh position={[0,0,.07]}>
    <planeGeometry args={[2.92,3.48]}/>
    {glass?<meshBasicMaterial map={glass} toneMapped={false}/>:<meshBasicMaterial color="#C5DCCF"/>}
   </mesh>
   {[-1.5,0,1.5].map(x=><mesh key={'v'+x} position={[x,0,.12]}>
    <boxGeometry args={[.09,3.55,.08]}/>
    <meshStandardMaterial color={GOLD} metalness={.55} roughness={.32}/>
   </mesh>)}
   {[-1.75,0,1.75].map(y=><mesh key={'h'+y} position={[0,y,.12]}>
    <boxGeometry args={[3.15,.09,.08]}/>
    <meshStandardMaterial color={GOLD} metalness={.55} roughness={.32}/>
   </mesh>)}
  </group>))}
 </group>;
}
function MuseumFurniture({lite}){
 const continents=useMemo(()=>{
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(!canvas)return null;
  canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d');
  c.fillStyle='#2E9CA5';c.fillRect(0,0,512,256);
  const islands=[
   [[78,32],[142,49],[146,87],[126,111],[116,161],[87,148],[65,96]],
   [[183,118],[230,109],[245,143],[234,197],[214,233],[196,201]],
   [[295,48],[399,34],[453,79],[420,136],[378,149],[345,109],[315,116]],
   [[344,165],[382,159],[397,216],[368,240],[340,220]]
  ];
  for(const pts of islands){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle='#A9BE7B';c.fill();}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[]);
 useEffect(()=>()=>continents?.dispose(),[continents]);
 const books=[
  {color:'#EADDAF',y:.13,x:-.08,r:.09},
  {color:'#227A67',y:.32,x:.04,r:-.05},
  {color:'#EFE7D0',y:.52,x:-.02,r:.05},
  {color:'#C9A957',y:.72,x:.03,r:-.09}
 ];
 return <group>
  {/* Books and a textured climate globe — rendered as physical objects. */}
  <group position={[-4.85,.33,-5.45]}>
   <mesh position={[0,-.08,0]}>
    <cylinderGeometry args={[.91,1.04,.34,36]}/>
    <meshStandardMaterial color="#E6E0D4" roughness={.64}/>
   </mesh>
   {books.map((b,i)=><group key={i} position={[b.x,b.y,0]} rotation={[0,b.r,0]}>
    <mesh><boxGeometry args={[1.42,.16,.91]}/>
     <meshStandardMaterial color={b.color} roughness={.62}/></mesh>
    <mesh position={[0,0,.465]}><boxGeometry args={[1.22,.135,.012]}/>
     <meshStandardMaterial color="#F9F4E8" roughness={.77}/></mesh>
   </group>)}
   <mesh position={[0,1.14,0]}>
    <cylinderGeometry args={[.03,.065,.62,10]}/>
    <meshStandardMaterial color={GOLD} metalness={.62} roughness={.31}/>
   </mesh>
   <mesh position={[0,1.69,0]} rotation={[.13,.3,-.16]}>
    <sphereGeometry args={[.52,lite?24:40,lite?16:30]}/>
    <meshStandardMaterial color="#2A8D9A" map={continents} metalness={.05} roughness={.42}/>
   </mesh>
   <mesh position={[0,1.69,0]} rotation={[0,0,-.2]}>
    <torusGeometry args={[.61,.025,7,72,Math.PI]}/>
    <meshStandardMaterial color={GOLD} metalness={.58} roughness={.38}/>
   </mesh>
  </group>
  {/* Broadleaf plant. Natural branching replaces the old cone-stack tree. */}
  <group position={[5.13,0,-5.36]}>
   <mesh position={[0,.26,0]}>
    <cylinderGeometry args={[.48,.34,.54,28]}/>
    <meshStandardMaterial color="#DED2B5" roughness={.62}/>
   </mesh>
   <mesh position={[0,.59,0]}>
    <cylinderGeometry args={[.08,.13,.72,10]}/>
    <meshStandardMaterial color="#7D7652" roughness={.83}/>
   </mesh>
   {Array.from({length:lite?9:19},(_,i)=>{
    const a=i*2.39996,r=.36+(i%4)*.18,h=1.15+(i%6)*.30;
    return <group key={i} position={[Math.cos(a)*r,h,Math.sin(a)*r*.82]}
     rotation={[.2,0,(i%2?-.30:.30)]}>
     <mesh rotation={[.2,a,.27]}>
      <icosahedronGeometry args={[i%3===0?.45:.35,lite?0:1]}/>
      <meshStandardMaterial color={['#2C825D','#368766','#569A73','#1C7055'][i%4]} roughness={.88} side={THREE.DoubleSide}/>
     </mesh>
    </group>;
   })}
  </group>
 </group>;
}
const BARRIER_ROPES=[
 [[-1.22,.98,-6.55],[1.22,.98,-6.55]],
 [[-1.22,.98,-4.55],[1.22,.98,-4.55]]
];
function GalleryRope({from,to}){
 const geometry=useMemo(()=>{
  const start=new THREE.Vector3(from[0],from[1],from[2]),end=new THREE.Vector3(to[0],to[1],to[2]);
  const mid=start.clone().lerp(end,.5);mid.y-=.18;
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start,mid,end]),28,.02,7,false);
 },[from,to]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry}><meshStandardMaterial color="#641826" roughness={.46} metalness={.12}/></mesh>;
}
function BayMoulding({x}){
 const y=2.42,z=-7.86,w=3.22,h=3.78,t=.09;
 return <group>
  {[[0,h/2,w+t,t],[0,-h/2,w+t,t],[-w/2,0,t,h],[w/2,0,t,h]].map(([px,py,bw,bh],i)=>
   <mesh key={i} position={[x+px,y+py,z]}>
    <boxGeometry args={[bw,bh,.08]}/>
    <meshStandardMaterial color="#C6A56A" metalness={.4} roughness={.38}/>
   </mesh>)}
 </group>;
}
function LightShaft({x}){
 const mat=useRef(null);
 useFrame(({clock})=>{
  if(!mat.current)return;
  mat.current.opacity=.16+Math.sin(clock.elapsedTime*1.3+x)*.05;
 });
 return <mesh position={[x,3.35,-7.15]} rotation={[.22,0,0]}>
  <cylinderGeometry args={[.08,.85,2.55,18,1,true]}/>
  <meshBasicMaterial ref={mat} color="#FFF3C4" transparent opacity={.18} depthWrite={false}
   side={THREE.DoubleSide} blending={THREE.AdditiveBlending} fog={false}/>
 </mesh>;
}
function ArtworkSpotlight({x,lite}){
 const target=useMemo(()=>{
  const value=new THREE.Object3D();
  value.position.set(x,2.34,-7.78);
  return value;
 },[x]);
 return <group>
  <primitive object={target}/>
  <spotLight position={[x,5.22,-6.75]} target={target}
   color="#FFF3DA" intensity={lite?1.6:3.4}
   angle={.36} penumbra={.84} distance={7.3} decay={2}/>
 </group>;
}
 const VISITOR_ROUTE=[[-2.1,-3.62],[-2.1,-4.02],[-.65,-4.02],[.65,-4.02],[2.1,-4.02],[2.1,-3.62],[0,-3.5]];
const VISITOR_SEGS=(()=>{
 let total=0;
 const segs=VISITOR_ROUTE.map((a,i)=>{
  const b=VISITOR_ROUTE[(i+1)%VISITOR_ROUTE.length];
  const len=Math.hypot(b[0]-a[0],b[1]-a[1])||.0001;
  const seg={a,b,len,start:total};
  total+=len;
  return seg;
 });
 return {segs,total};
})();
function routePoint(distance){
 const {segs,total}=VISITOR_SEGS;
 let d=((distance%total)+total)%total,s=segs[0];
 for(const item of segs){if(d<=item.start+item.len){s=item;break;}}
 const t=(d-s.start)/s.len;
 return {x:s.a[0]+(s.b[0]-s.a[0])*t,z:s.a[1]+(s.b[1]-s.a[1])*t,yaw:Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]),loop:total};
}
const VISITORS=[
 {offset:0,speed:.22,scale:.78,shirt:'#F7F4EC',trim:'#176D59',bottoms:'#243044',hair:'#2C2118',skin:'#F3C9A6',skirt:false,hairStyle:'short'},
 {offset:.25,speed:.2,scale:.74,shirt:'#F7F4EC',trim:'#176D59',bottoms:'#176D59',hair:'#1A120C',skin:'#E8B48A',skirt:true,hairStyle:'bob'},
 {offset:.5,speed:.21,scale:.8,shirt:'#F4F7F2',trim:'#0D5B45',bottoms:'#1E3A5F',hair:'#4A3020',skin:'#F6D3B4',skirt:false,hairStyle:'short'},
 {offset:.75,speed:.19,scale:.73,shirt:'#F7F4EC',trim:'#176D59',bottoms:'#176D59',hair:'#111111',skin:'#C9845A',skirt:true,hairStyle:'tail'}
];
function GalleryVisitor({visitor,still}){
 const ref=useRef(null),body=useRef(null),head=useRef(null);
 const legL=useRef(null),legR=useRef(null),armL=useRef(null),armR=useRef(null);
 const pose=(distance,step=0)=>{
  const node=ref.current;if(!node)return;
  const p=routePoint(distance);
  node.position.set(p.x,0,p.z);
  node.rotation.y=p.yaw;
  const stride=step*.2;
  if(body.current)body.current.position.y=Math.abs(step)*.012;
  if(legL.current)legL.current.rotation.x=stride;
  if(legR.current)legR.current.rotation.x=-stride;
  if(armL.current)armL.current.rotation.x=-stride*.85;
  if(armR.current)armR.current.rotation.x=stride*.85;
  if(head.current){
   let look=Math.PI-p.yaw;
   while(look>Math.PI)look-=Math.PI*2;
   while(look<-Math.PI)look+=Math.PI*2;
   head.current.rotation.y=Math.max(-.4,Math.min(.4,look));
  }
 };
 useEffect(()=>{
  pose(visitor.offset*VISITOR_SEGS.total);
  ref.current?.traverse(obj=>{obj.raycast=()=>{};});
 },[visitor.offset]);
 useFrame(({clock})=>{
  if(still)return;
  const step=Math.sin(clock.elapsedTime*visitor.speed*6+visitor.offset*9);
  pose(clock.elapsedTime*visitor.speed+visitor.offset*VISITOR_SEGS.total,step);
 });
 const v=visitor,hairY=v.hairStyle==='bob'?0: .045,hairScale=v.hairStyle==='bob'?[1.05,.72,1.04]:[1.02,.5,1.02];
 return <group ref={ref} scale={v.scale} name="GalleryVisitor">
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]}>
   <circleGeometry args={[.16,16]}/><meshBasicMaterial color="#8A6844" transparent opacity={.14} depthWrite={false}/>
  </mesh>
  <group ref={body}>
   <group ref={legL} position={[-.055,.46,0]}>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[.042,.038,.32,10]}/><meshStandardMaterial color={v.skirt?'#F4EFE4':v.bottoms}/></mesh>
    <mesh position={[0,-.34,.02]}><boxGeometry args={[.08,.04,.13]}/><meshStandardMaterial color="#2A241C"/></mesh>
   </group>
   <group ref={legR} position={[.055,.46,0]}>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[.042,.038,.32,10]}/><meshStandardMaterial color={v.skirt?'#F4EFE4':v.bottoms}/></mesh>
    <mesh position={[0,-.34,.02]}><boxGeometry args={[.08,.04,.13]}/><meshStandardMaterial color="#2A241C"/></mesh>
   </group>
   {v.skirt
    ?<mesh position={[0,.5,0]}><cylinderGeometry args={[.075,.155,.44,16]}/><meshStandardMaterial color={v.trim} roughness={.66}/></mesh>
    :<mesh position={[0,.5,0]}><cylinderGeometry args={[.09,.1,.16,12]}/><meshStandardMaterial color={v.bottoms}/></mesh>}
   <mesh position={[0,.84,0]}><cylinderGeometry args={[.09,.115,.32,14]}/><meshStandardMaterial color={v.shirt} roughness={.62}/></mesh>
   <mesh position={[0,.98,0]} scale={[1.28,.42,.82]}><sphereGeometry args={[.11,14,10]}/><meshStandardMaterial color={v.shirt}/></mesh>
   <mesh position={[0,.78,.09]}><boxGeometry args={[.028,.16,.015]}/><meshStandardMaterial color={v.trim}/></mesh>
   <mesh position={[0,1.05,0]}><cylinderGeometry args={[.04,.045,.07,8]}/><meshStandardMaterial color={v.skin}/></mesh>
   <group ref={armL} position={[-.145,.96,0]}>
    <mesh position={[0,-.11,0]}><cylinderGeometry args={[.028,.024,.2,8]}/><meshStandardMaterial color={v.shirt}/></mesh>
    <mesh position={[0,-.22,0]}><sphereGeometry args={[.028,8,8]}/><meshStandardMaterial color={v.skin}/></mesh>
   </group>
   <group ref={armR} position={[.145,.96,0]}>
    <mesh position={[0,-.11,0]}><cylinderGeometry args={[.028,.024,.2,8]}/><meshStandardMaterial color={v.shirt}/></mesh>
    <mesh position={[0,-.22,0]}><sphereGeometry args={[.028,8,8]}/><meshStandardMaterial color={v.skin}/></mesh>
   </group>
   <mesh position={[0,.86,-.1]} scale={[.9,1.05,.42]}><sphereGeometry args={[.09,12,10]}/><meshStandardMaterial color={v.trim}/></mesh>
   <group ref={head} position={[0,1.18,0]}>
    <mesh><sphereGeometry args={[.095,20,16]}/><meshStandardMaterial color={v.skin} roughness={.5}/></mesh>
    <mesh position={[0,hairY,-.01]} scale={hairScale}><sphereGeometry args={[.1,16,12]}/><meshStandardMaterial color={v.hair} roughness={.7}/></mesh>
    {v.hairStyle==='tail'?<mesh position={[0,-.02,-.09]}><sphereGeometry args={[.035,10,8]}/><meshStandardMaterial color={v.hair}/></mesh>:null}
    <mesh position={[-.032,.008,.082]} scale={[1,.72,1]}><sphereGeometry args={[.014,8,6]}/><meshStandardMaterial color="#243044"/></mesh>
    <mesh position={[.032,.008,.082]} scale={[1,.72,1]}><sphereGeometry args={[.014,8,6]}/><meshStandardMaterial color="#243044"/></mesh>
    <mesh position={[0,-.028,.084]} scale={[1,.45,.4]}><sphereGeometry args={[.016,8,6]}/><meshStandardMaterial color="#C46B62"/></mesh>
   </group>
  </group>
 </group>;
}
function GalleryVisitors({lite=false}){
 const still=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const people=lite?VISITORS.slice(0,2):VISITORS;
 return <group name="GalleryVisitors">{people.map((visitor,index)=><GalleryVisitor key={index} visitor={visitor} still={still}/>)}</group>;
}
export default function PekDiscoveryHallV4({lite=false}){
 const floor=useCanvasMap((ctx,w,h)=>{
  ctx.fillStyle='#E4C08A';ctx.fillRect(0,0,w,h);
  const plank=78;
  for(let x=0,n=0;x<w;x+=plank,n++){
   const tone=186+(n%4)*14;
   const grad=ctx.createLinearGradient(x,0,x+plank,0);
   grad.addColorStop(0,`rgb(${tone-10},${Math.floor(tone*.72)},${Math.floor(tone*.42)})`);
   grad.addColorStop(.5,`rgb(${tone+16},${Math.floor(tone*.78)},${Math.floor(tone*.48)})`);
   grad.addColorStop(1,`rgb(${tone-4},${Math.floor(tone*.7)},${Math.floor(tone*.4)})`);
   ctx.fillStyle=grad;ctx.fillRect(x+1,0,plank-2,h);
   ctx.strokeStyle='rgba(48,26,12,.35)';ctx.lineWidth=1.2;
   for(let g=0;g<7;g++){
    ctx.beginPath();ctx.moveTo(x+10,g*190+12);
    ctx.bezierCurveTo(x+plank*.7,g*190+50,x+16,g*190+110,x+plank-14,g*190+170);
    ctx.stroke();
   }
  }
  ctx.fillStyle='rgba(120,78,36,.12)';
  ctx.fillRect(0,0,54,h);ctx.fillRect(w-54,0,54,h);ctx.fillRect(0,0,w,54);ctx.fillRect(0,h-54,w,54);
  ctx.strokeStyle='#E8CE78';ctx.lineWidth=10;ctx.strokeRect(46,46,w-92,h-92);
  ctx.beginPath();ctx.arc(w/2,h/2,132,0,Math.PI*2);ctx.lineWidth=7;ctx.stroke();
  ctx.beginPath();ctx.arc(w/2,h/2,86,0,Math.PI*2);ctx.strokeStyle='#0D5B45';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#F8E7B4';ctx.font='700 36px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('PÉTRUS KÝ',w/2,h/2);
 },1536,1536,[lite]);
 return <group name="PekDiscoveryHallV4">
  {/* Walls, banners and lighting all exist in world-space. */}
  <mesh position={[0,3,-8.18]} receiveShadow>
   <boxGeometry args={[12.65,5.65,.20]}/>
   <meshStandardMaterial color="#F7F3E8" roughness={.86}/>
  </mesh>
  <mesh position={[0,.72,-8.04]}>
   <boxGeometry args={[12.3,1.44,.08]}/>
   <meshStandardMaterial color="#DCEBDF" roughness={.8} metalness={.02}/>
  </mesh>
  <mesh position={[0,1.46,-7.98]}>
   <boxGeometry args={[12.3,.07,.06]}/>
   <meshStandardMaterial color={GOLD} metalness={.62} roughness={.28}/>
  </mesh>
  {[-6.1,6.1].map(x=><group key={x}>
   <mesh position={[x,2.98,-8.02]}><boxGeometry args={[.31,5.82,.42]}/>
    <meshStandardMaterial color={INK} metalness={.12} roughness={.54}/></mesh>
   <mesh position={[x,5.78,-8.02]}><boxGeometry args={[.45,.13,.52]}/>
    <meshStandardMaterial color={GOLD} metalness={.45} roughness={.35}/></mesh>
  </group>)}
  <mesh position={[0,4.74,-8.012]}>
   <boxGeometry args={[10.63,.96,.19]}/>
   <meshStandardMaterial color={GOLD} metalness={.56} roughness={.32}/>
  </mesh>
  <mesh position={[0,4.74,-7.88]}>
   <boxGeometry args={[10.47,.81,.075]}/>
   <meshStandardMaterial color={INK} metalness={.16} roughness={.39}/>
  </mesh>
  <DisplayLettering main="PÉTRUS KÝ" sub="DISCOVERY MUSEUM · THE PIONEERS"
   position={[0,4.73,-7.823]} size={[9.35,.71]} light/>
  <SchoolCrest/>
  <mesh position={[0,5.34,-7.96]}>
   <boxGeometry args={[12.35,.09,.18]}/>
   <meshStandardMaterial color="#C6A56A" metalness={.48} roughness={.32}/>
  </mesh>
  {[-3,0,3].map(x=><BayMoulding key={'bay-'+x} x={x}/>)}
  <Skylight lite={lite}/>
  <WindowBays lite={lite}/>
  {/* Sculpted gallery floor and metallic guide lines. */}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.064,-3.45]} receiveShadow>
   <planeGeometry args={[12.4,12.2]}/>
   {floor
    ?<meshStandardMaterial map={floor} metalness={.04} roughness={.72}/>
    :<meshStandardMaterial color="#12352C" metalness={.12} roughness={.45}/>}
  </mesh>
  {[-5.16,5.16].map(x=><mesh key={x} position={[x,-.048,-3.45]}>
   <boxGeometry args={[.043,.012,10.8]}/>
   <meshStandardMaterial color={GOLD} metalness={.5} roughness={.37}/>
  </mesh>)}
  <mesh position={[0,-.046,-3.7]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[1.24,1.31,56]}/>
   <meshBasicMaterial color="#C2A049" side={THREE.DoubleSide}/>
  </mesh>
  <mesh position={[0,-.039,-3.7]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[.83,.90,56]}/>
   <meshBasicMaterial color={INK} side={THREE.DoubleSide}/>
  </mesh>
  {!lite?[-3.15,3.15].map(x=><group key={x}>
   <mesh position={[x,5.60,-6.72]}>
    <cylinderGeometry args={[.13,.15,.20,16]}/>
    <meshStandardMaterial color="#C8B58E" metalness={.38} roughness={.45}/>
   </mesh>
   <pointLight position={[x,5.48,-6.68]} color="#FFF1D8" intensity={.34} distance={4.4} decay={2}/>
  </group>):null}
  <MuseumFurniture lite={lite}/>
  {/* Each bay gets a real plinth and warm indirect light. */}
  {[-3,0,3].map((x,i)=><group key={i}>
   <mesh position={[x,.40,-7.92]}><boxGeometry args={[2.76,.13,.28]}/>
    <meshStandardMaterial color={GOLD} metalness={.51} roughness={.39}/></mesh>
   <mesh position={[x,4.62,-7.7]} rotation={[.5,0,0]}>
    <boxGeometry args={[1.15,.08,.22]}/>
    <meshStandardMaterial color="#F3D98A" metalness={.74} roughness={.2}/>
   </mesh>
   <mesh position={[x,4.5,-7.58]}>
    <boxGeometry args={[.72,.035,.04]}/>
    <meshBasicMaterial color="#FFF8DC"/>
   </mesh>
   <ArtworkSpotlight x={x} lite={lite}/>
   {!lite?<LightShaft x={x}/>:null}
  </group>)}
  {/* Side galleries, drapes and a brass pendant — shared by teacher and student cinema. */}
  {!lite?[-5.72,5.72].map(x=><group key={'drape-'+x} position={[x,3.35,-7.55]}>
   <mesh><boxGeometry args={[.42,3.5,.08]}/><meshStandardMaterial color="#0C3D31" roughness={.72}/></mesh>
   <mesh position={[x>0?-.16:.16,-1.15,.05]}><boxGeometry args={[.28,1.15,.06]}/><meshStandardMaterial color={GOLD} metalness={.45} roughness={.36}/></mesh>
  </group>):null}
  {!lite?<group position={[0,4.72,-3.35]}>
   <mesh><cylinderGeometry args={[.035,.035,.55,10]}/><meshStandardMaterial color={GOLD} metalness={.7} roughness={.25}/></mesh>
   <mesh position={[0,-.48,0]}><torusGeometry args={[.92,.04,10,40]}/><meshStandardMaterial color="#E8CE78" metalness={.62} roughness={.28}/></mesh>
   <mesh position={[0,-.48,0]}><torusGeometry args={[.62,.028,8,32]}/><meshStandardMaterial color="#F6E7B2" metalness={.55} roughness={.3}/></mesh>
   {Array.from({length:8},(_,i)=>{
    const a=i/8*Math.PI*2;
    return <mesh key={i} position={[Math.cos(a)*.92,-.68,Math.sin(a)*.92]}>
     <sphereGeometry args={[.075,12,10]}/>
     <meshStandardMaterial color="#FFF6D4" emissive="#FFE6A8" emissiveIntensity={.8}/>
    </mesh>;
   })}
   <pointLight position={[0,-.85,0]} color="#FFE7B0" intensity={1.15} distance={8} decay={2}/>
  </group>:null}
  {!lite?<mesh position={[0,-.058,-5.55]} rotation={[-Math.PI/2,0,0]}>
   <planeGeometry args={[2.05,7.1]}/>
   <meshStandardMaterial color="#4A101C" roughness={.86} metalness={.04}/>
  </mesh>:null}
  {!lite?[-1.02,1.02].map(x=><mesh key={'carpet-edge-'+x} position={[x,-.05,-5.55]} rotation={[-Math.PI/2,0,0]}>
   <planeGeometry args={[.045,7.1]}/>
   <meshBasicMaterial color="#E8CE78" side={THREE.DoubleSide}/>
  </mesh>):null}
  {!lite?<group>
   {[-1.22,1.22].map(x=><group key={'rail-'+x}>
    {[-6.55,-4.55].map(z=><group key={z} position={[x,0,z]}>
     <mesh position={[0,.46,0]}><cylinderGeometry args={[.045,.05,.92,12]}/><meshStandardMaterial color={GOLD} metalness={.72} roughness={.26}/></mesh>
     <mesh position={[0,.94,0]}><sphereGeometry args={[.07,12,10]}/><meshStandardMaterial color="#F3E2A8" metalness={.6} roughness={.3}/></mesh>
    </group>)}
   </group>)}
   <GalleryRope from={BARRIER_ROPES[0][0]} to={BARRIER_ROPES[0][1]}/>
   <GalleryRope from={BARRIER_ROPES[1][0]} to={BARRIER_ROPES[1][1]}/>
  </group>:null}
  <GalleryVisitors lite={lite}/>
 </group>;
}
