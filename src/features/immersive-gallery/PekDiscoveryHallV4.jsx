import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';

/**
 * Pétrus Ký Discovery Hall V4 — real meshes, not a flat mockup backdrop.
 * A cinematic gallery layer over the existing traversable museum room.
 * Student exhibits remain independent mesh objects in GalleryCanvasR3F.
 * Performance-lite drops small architectural/foliage accents, never the art.
 */
const INK='#0D5B45',PINE='#176D59',GOLD='#C8A34B',PALE='#FAF8F1';
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
 return <group position={[-5.38,4.75,-8.002]}>
  <mesh position={[0,0,-.025]}>
   <boxGeometry args={[.91,1.05,.10]}/>
   <meshStandardMaterial color="#F9F8E9" metalness={.04} roughness={.70}/>
  </mesh>
  <mesh position={[0,0,.043]}>
   <planeGeometry args={[.73,.9]}/>
   <meshBasicMaterial map={crest} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false}/>
  </mesh>
 </group>;
}
function Skylight({lite}){
 const arcs=useMemo(()=>[-6.7,-4.4,-2.1,.2,2.5].map(z=>{
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
  <mesh position={[0,5.92,-2.45]} rotation={[-Math.PI/2,0,0]} scale={[1.38,.74,1]}>
   <circleGeometry args={[4.08,72]}/>
   <meshStandardMaterial color="#F5F7EA" emissive="#E7EBD5" emissiveIntensity={.22}
    roughness={.65} transparent opacity={.78} side={THREE.DoubleSide}/>
  </mesh>
  <mesh position={[0,5.89,-2.45]} rotation={[-Math.PI/2,0,0]} scale={[1.38,.74,1]}>
   <torusGeometry args={[4.14,.125,10,84]}/>
   <meshStandardMaterial color="#B99A6F" metalness={.12} roughness={.62}/>
  </mesh>
  {arcs.map((g,i)=><mesh key={i} geometry={g}>
   <meshStandardMaterial color={i%2?'#9D754B':'#B59368'} metalness={.08} roughness={.68}/>
  </mesh>)}
  {!lite?[-5.5,-3.1,-.7,1.7].map(z=><group key={z}>
   <mesh position={[0,5.72,z]}>
    <boxGeometry args={[10,.07,.055]}/>
    <meshBasicMaterial color="#FFF1C4"/>
   </mesh>
  </group>):null}
 </group>;
}
function WindowBays({lite}){
 return <group>
  {[-1,1].map(side=>[-4.9,1.1].map((z,index)=><group key={side+'-'+z}
   position={[side*6.83,3.13,z]} rotation={[0,side===-1?Math.PI/2:-Math.PI/2,0]}>
   <mesh position={[0,0,-.015]}>
    <boxGeometry args={[3.15,3.68,.10]}/>
    <meshStandardMaterial color="#D9E3D7" metalness={.08} roughness={.46}/>
   </mesh>
   <mesh position={[0,0,.042]}>
    <planeGeometry args={[2.92,3.42]}/>
    <meshBasicMaterial color="#C5DCCF" side={THREE.DoubleSide}/>
   </mesh>
   {/* Layered landscape is geometry inside the window, not a campus photograph. */}
   {Array.from({length:lite?3:5},(_,i)=><mesh key={i}
    position={[-1.1+i*.53,-.82+Math.sin(i*2.1)*.23,.056]}>
    <sphereGeometry args={[.45,9,7]}/>
    <meshStandardMaterial color={i%2?'#81AC85':'#5D9278'} roughness={.93}/>
   </mesh>)}
   {[-1.55,0,1.55].map(x=><mesh key={'v'+x} position={[x,0,.1]}>
    <boxGeometry args={[.095,3.7,.15]}/>
    <meshStandardMaterial color="#0D6656" metalness={.10} roughness={.5}/>
   </mesh>)}
   {[-1.82,0,1.82].map(y=><mesh key={'h'+y} position={[0,y,.1]}>
    <boxGeometry args={[3.3,.1,.15]}/>
    <meshStandardMaterial color="#0D6656" metalness={.10} roughness={.5}/>
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
   color="#FFF3DA" intensity={lite?1.1:2.15}
   angle={.36} penumbra={.84} distance={7.3} decay={2}/>
 </group>;
}
export default function PekDiscoveryHallV4({lite=false}){
 return <group name="PekDiscoveryHallV4">
  {/* Walls, banners and lighting all exist in world-space. */}
  <mesh position={[0,3,-8.18]} receiveShadow>
   <boxGeometry args={[12.65,5.65,.20]}/>
   <meshStandardMaterial color={PALE} roughness={.87}/>
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
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.064,-3.45]}>
   <planeGeometry args={[10.6,10.9]}/>
   <meshStandardMaterial color="#F4F1E9" metalness={.045} roughness={.35}/>
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
   <mesh position={[x,4.08,-7.96]}><boxGeometry args={[2.75,.075,.18]}/>
    <meshStandardMaterial color="#CDAF62" metalness={.46} roughness={.36}/></mesh>
   <mesh position={[x,4.1,-7.84]}><boxGeometry args={[1.85,.045,.03]}/>
    <meshBasicMaterial color="#FFF4CD"/></mesh>
   <ArtworkSpotlight x={x} lite={lite}/>
  </group>)}
 </group>;
}
