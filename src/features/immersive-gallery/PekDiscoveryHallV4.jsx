import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
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
  <meshBasicMaterial map={map} toneMapped={false} transparent depthWrite={false}/>
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
  sky.addColorStop(0,'#163E38');sky.addColorStop(.42,'#6EAE8C');sky.addColorStop(1,'#E8D29A');
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
    <meshStandardMaterial color="#08261F" metalness={.22} roughness={.42}/>
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
export default function PekDiscoveryHallV4({lite=false}){
 const floor=useCanvasMap((ctx,w,h)=>{
  ctx.fillStyle='#140E0A';ctx.fillRect(0,0,w,h);
  const pw=54,ph=16;
  for(let row=0,y=-ph;y<h+ph;y+=ph,row++){
   for(let col=0,x=-pw;x<w+pw;x+=pw,col++){
    ctx.save();
    ctx.translate(x+pw/2,y+ph/2);
    ctx.rotate((row+col)%2?Math.PI/4:-Math.PI/4);
    const tone=108+((row*5+col*3)%6)*9;
    ctx.fillStyle=`rgb(${tone},${Math.floor(tone*.58)},${Math.floor(tone*.32)})`;
    ctx.fillRect(-pw*.46,-ph*.42,pw*.88,ph*.76);
    ctx.restore();
   }
  }
  ctx.fillStyle='rgba(10,7,5,.34)';
  ctx.fillRect(0,0,w,86);ctx.fillRect(0,h-86,w,86);ctx.fillRect(0,0,86,h);ctx.fillRect(w-86,0,86,h);
  ctx.strokeStyle='#C8A34B';ctx.lineWidth=16;ctx.strokeRect(40,40,w-80,h-80);
  ctx.strokeStyle='#E8D48A';ctx.lineWidth=4;ctx.strokeRect(72,72,w-144,h-144);
  ctx.beginPath();ctx.arc(w/2,h/2,118,0,Math.PI*2);ctx.strokeStyle='#E8CE78';ctx.lineWidth=8;ctx.stroke();
  ctx.beginPath();ctx.arc(w/2,h/2,76,0,Math.PI*2);ctx.strokeStyle='#0D5B45';ctx.lineWidth=6;ctx.stroke();
  ctx.fillStyle='#F6E7B2';ctx.font='700 34px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('PÉTRUS KÝ',w/2,h/2);
 },1024,1024,[lite]);
 return <group name="PekDiscoveryHallV4">
  {/* Walls, banners and lighting all exist in world-space. */}
  <mesh position={[0,3,-8.18]} receiveShadow>
   <boxGeometry args={[12.65,5.65,.20]}/>
   <meshStandardMaterial color="#E4D5BE" roughness={.9}/>
  </mesh>
  <mesh position={[0,.72,-8.04]}>
   <boxGeometry args={[12.3,1.44,.08]}/>
   <meshStandardMaterial color="#0C3329" roughness={.74} metalness={.08}/>
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
  <Skylight lite={lite}/>
  <WindowBays lite={lite}/>
  {/* Sculpted gallery floor and metallic guide lines. */}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.064,-3.45]} receiveShadow>
   <planeGeometry args={[12.4,12.2]}/>
   {floor
    ?<meshStandardMaterial map={floor} metalness={.18} roughness={.42}/>
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
   <mesh position={[x,4.42,-7.62]}>
    <boxGeometry args={[1.55,.07,.16]}/>
    <meshStandardMaterial color="#F0D78A" metalness={.72} roughness={.22}/>
   </mesh>
   <mesh position={[x,4.28,-7.52]}>
    <boxGeometry args={[.9,.05,.05]}/>
    <meshBasicMaterial color="#FFF6D2"/>
   </mesh>
   <ArtworkSpotlight x={x} lite={lite}/>
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
  {!lite?[-1.22,1.22].map(x=><group key={'rail-'+x}>
   {[-6.55,-4.55].map(z=><group key={z} position={[x,0,z]}>
    <mesh position={[0,.46,0]}><cylinderGeometry args={[.045,.05,.92,12]}/><meshStandardMaterial color={GOLD} metalness={.72} roughness={.26}/></mesh>
    <mesh position={[0,.94,0]}><sphereGeometry args={[.07,12,10]}/><meshStandardMaterial color="#F3E2A8" metalness={.6} roughness={.3}/></mesh>
   </group>)}
   <mesh position={[x,.9,-5.55]} rotation={[Math.PI/2,0,0]}>
    <cylinderGeometry args={[.016,.016,2.05,8]}/>
    <meshStandardMaterial color="#7A2430" roughness={.62}/>
   </mesh>
  </group>):null}
 </group>;
}
