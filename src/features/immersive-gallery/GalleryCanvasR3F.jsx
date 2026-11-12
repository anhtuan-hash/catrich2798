import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOM_TEMPLATES,normalizeTransform,useLiteQuality} from './sceneTemplates.js';
import {createCuratedGlb,CURATED_GLB_KEYS} from './curatedGlb.js';
import {getGalleryAssetUrl} from './galleryData.js';

// Only bundled, original GLBs are loaded. No URL or user-supplied binary is parsed.
function CuratedModel({modelKey='globe',scale=1}) {
  const [scene,setScene]=useState(null);
  useEffect(()=>{
    if(!CURATED_GLB_KEYS.includes(modelKey))return undefined;
    let active=true,loaded=null;
    const loader=new GLTFLoader();
    loader.parse(createCuratedGlb(modelKey),'',gltf=>{
      loaded=gltf.scene;
      if(active)setScene(gltf.scene);
      else loaded.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});
    },()=>{if(active)setScene(null);});
    return ()=>{
      active=false;setScene(null);
      if(loaded)loaded.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});
    };
  },[modelKey]);
  return scene?<primitive object={scene} scale={scale}/>:<mesh scale={0.4}><octahedronGeometry/><meshStandardMaterial color="#a3b6ae"/></mesh>;
}
export {CuratedModel};
function ArtworkImage({assetId}) {
 const [texture,setTexture]=useState(null);
 useEffect(()=>{
  if(!assetId)return undefined;let alive=true,created=null;
  getGalleryAssetUrl(assetId).then(url=>{
    if(!alive)return;
    new THREE.TextureLoader().load(url,t=>{
      created=t;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
      if(alive)setTexture(t);else t.dispose();
    },undefined,()=>{if(alive)setTexture(null);});
  }).catch(()=>{if(alive)setTexture(null);});
  return()=>{alive=false;if(created)created.dispose();};
 },[assetId]);
 if(!texture)return <mesh position={[0,0,0.083]}><planeGeometry args={[1.3,0.8]}/><meshStandardMaterial color="#e2d4c7"/></mesh>;
 return <mesh position={[0,0,0.083]}><planeGeometry args={[1.3,0.9]}/><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide}/></mesh>;
}
function PaperArtwork({exhibit,onSelect,isSelected}) {
 const transform=useMemo(()=>normalizeTransform(exhibit.transform||{}),[exhibit.transform]);
 return <group position={transform.position} rotation={transform.rotation} scale={transform.scale}
  onClick={e=>{e.stopPropagation();onSelect?.(exhibit.id);}}
  onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}}
  onPointerOut={()=>{document.body.style.cursor='';}}>
  <mesh><boxGeometry args={[1.72,1.45,0.09]}/><meshStandardMaterial color={isSelected?'#e4aa64':'#ae856e'} roughness={0.82}/></mesh>
  <mesh position={[0,0,0.052]}><boxGeometry args={[1.56,1.30,0.025]}/><meshStandardMaterial color="#fff9ee" roughness={0.9}/></mesh>
  {exhibit.kind==='model'
   ?<group position={[0,0,0.45]}><CuratedModel modelKey={exhibit.model_key||'pedestal'} scale={0.63}/></group>
   :exhibit.kind==='image'
    ?<ArtworkImage assetId={exhibit.asset_id}/>
    :<group><mesh position={[0,0.22,0.083]}><boxGeometry args={[1.06,0.12,0.02]}/><meshStandardMaterial color="#93afa7"/></mesh>
      <mesh position={[0,-0.04,0.085]}><boxGeometry args={[0.9,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh>
      <mesh position={[0,-0.20,0.085]}><boxGeometry args={[1.02,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh></group>}
 </group>;
}
function Walls({template,onTeleport}) {
 const theme=ROOM_TEMPLATES[template]||ROOM_TEMPLATES.classic;
 const culture=template==='culture',lab=template==='lab',lobby=template==='lobby';
 return <group>
  <mesh position={[0,-0.08,0]} rotation={[-Math.PI/2,0,0]} receiveShadow onClick={e=>{
    e.stopPropagation();onTeleport?.([Math.max(-5.9,Math.min(5.9,e.point.x)),Math.max(-7.4,Math.min(7.4,e.point.z))]);}}>
   <planeGeometry args={[14,18]}/><meshStandardMaterial color={theme.floor} roughness={0.94}/>
  </mesh>
  <mesh position={[0,6,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[14,18]}/><meshStandardMaterial color={theme.ceiling} roughness={1}/></mesh>
  <mesh position={[0,3,-9]}><planeGeometry args={[14,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  <mesh position={[-7,3,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[18,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  <mesh position={[7,3,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[18,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  {[-6,-3,0,3,6].map(x=><group key={x}>
   <mesh position={[x,0.2,-8.87]}><boxGeometry args={[0.13,0.4,0.2]}/><meshStandardMaterial color={theme.accent}/></mesh>
   <mesh position={[x,5.78,-8.87]}><boxGeometry args={[0.13,0.2,0.2]}/><meshStandardMaterial color="#ffffff"/></mesh>
  </group>)}
  {culture?[-4,4].map(x=><group key={x}>
   <mesh position={[x,2.9,-8.8]}><boxGeometry args={[0.3,5.7,0.34]}/><meshStandardMaterial color={theme.accent}/></mesh>
   <mesh position={[x,5.8,-8.8]}><sphereGeometry args={[0.35,8,6]}/><meshStandardMaterial color={theme.accent}/></mesh>
  </group>):null}
  {lab?[-3,3].map(x=><group key={x}>
   <mesh position={[x,0.36,-3]}><boxGeometry args={[1.65,0.72,1.65]}/><meshStandardMaterial color="#f1f5f7" metalness={0.05}/></mesh>
   <mesh position={[x,0.75,-3]}><boxGeometry args={[1.72,0.11,1.72]}/><meshStandardMaterial color={theme.accent}/></mesh>
  </group>):null}
  {lobby?[-4,0,4].map(x=><group key={x}>
   <mesh position={[x,2.4,-8.78]}><boxGeometry args={[2.4,4.7,0.43]}/><meshStandardMaterial color="#bca995"/></mesh>
   <mesh position={[x,2.25,-8.44]}><boxGeometry args={[1.7,3.7,0.07]}/><meshStandardMaterial color="#627b73"/></mesh>
  </group>):null}
  <mesh position={[0,5.96,-1.5]}><boxGeometry args={[4.3,0.08,5.5]}/><meshStandardMaterial color="#fdfbf2" emissive="#fffbea" emissiveIntensity={0.08}/></mesh>
 </group>;
}
const MOVE_KEYS=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift']);
function CameraWalker({held,paused,onPosition,teleport}) {
 const {camera,gl,invalidate}=useThree();
 const yaw=useRef(0),pitch=useRef(0),drag=useRef(null);
 useEffect(()=>{
  if(teleport?.length===2){camera.position.set(teleport[0],1.7,teleport[1]);invalidate();}
 },[camera,invalidate,teleport]);
 useEffect(()=>{
   if(paused)held.current.clear();
 },[paused,held]);
 useEffect(()=>{
   const canvas=gl.domElement;
   const keyDown=e=>{
     const node=e.target;
     if(node?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
     const key=String(e.key).toLowerCase();
     if(MOVE_KEYS.has(key)&&!paused){held.current.add(key);invalidate();if(key.startsWith('arrow'))e.preventDefault();}
   };
   const keyUp=e=>{held.current.delete(String(e.key).toLowerCase());};
   const down=e=>{if(e.button!==0)return;drag.current=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);};
   const move=e=>{if(!drag.current||paused)return;const [x,y]=drag.current;
     yaw.current-=Math.max(-60,Math.min(60,e.clientX-x))*0.005;
     pitch.current=Math.max(-0.62,Math.min(0.62,pitch.current-(e.clientY-y)*0.003));
     camera.rotation.order='YXZ';camera.rotation.y=yaw.current;camera.rotation.x=pitch.current;
     drag.current=[e.clientX,e.clientY];invalidate();
   };
   const up=()=>{drag.current=null;};
   const blur=()=>held.current.clear();
   window.addEventListener('keydown',keyDown);
   window.addEventListener('keyup',keyUp);
   window.addEventListener('blur',blur);
   canvas.addEventListener('pointerdown',down);
   canvas.addEventListener('pointermove',move);
   canvas.addEventListener('pointerup',up);
   canvas.addEventListener('pointercancel',up);
   return()=>{held.current.clear();document.body.style.cursor='';window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[gl,camera,invalidate,held,paused]);
 useFrame((_,delta)=>{
   if(paused)return;
   const keys=held.current;
   const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
   const sideways=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
   if(!forward&&!sideways)return;
   const speed=Math.min(delta,0.06)*(keys.has('shift')?4.2:2.6);
   const dir=new THREE.Vector3(sideways,0,-forward).applyEuler(new THREE.Euler(0,camera.rotation.y,0,'YXZ')).normalize();
   camera.position.x=Math.max(-6,Math.min(6,camera.position.x+dir.x*speed));
   camera.position.z=Math.max(-7.6,Math.min(7.9,camera.position.z+dir.z*speed));
   onPosition?.(camera.position.x,camera.position.z);
   invalidate();
 });
 return null;
}
function Room({template,exhibits,onSelect,selectedId,onTeleport}) {
 return <><color attach="background" args={['#f2f0e9']}/><ambientLight intensity={1.3}/>
  <hemisphereLight args={['#ffffff','#b7afa3',1.0]}/>
  <directionalLight position={[1,6,3]} intensity={1.35}/>
  <Walls template={template} onTeleport={onTeleport}/>
  {exhibits.slice(0,30).map(e=><PaperArtwork key={e.id} exhibit={e} onSelect={onSelect} isSelected={selectedId===e.id}/>)}
 </>;
}
export default function GalleryCanvasR3F({template='classic',exhibits=[],onSelect,selectedId='',quality='auto',language='vi'}) {
 const held=useRef(new Set());
 const [teleport,setTeleport]=useState(null),[pos,setPos]=useState([0,5]),[supported,setSupported]=useState(null);
 const mode=useLiteQuality(quality);
 useEffect(()=>{
   let ok=false;
   try {const c=document.createElement('canvas');const ctx=c.getContext('webgl2')||c.getContext('webgl');ok=!!ctx;ctx?.getExtension('WEBGL_lose_context')?.loseContext();}
   catch {ok=false;}
   setSupported(ok);
 },[]);
 useEffect(()=>{held.current.clear();},[selectedId,template]);
 const onPosition=(x,z)=>{setPos([+x.toFixed(1),+z.toFixed(1)]);};
 const hold=(key,down)=>{if(down)held.current.add(key);else held.current.delete(key);};
 const onTeleport=point=>{setTeleport([...point]);};
 return <div className="big-webgl-shell">
  {supported===false?<div role="alert" className="big-canvas-error">{language==='en'?'WebGL unavailable. Use the 2D exhibit list.':'Thiết bị không hỗ trợ WebGL. Hãy sử dụng danh sách hiện vật 2D.'}</div>:supported===null?<div className="big-canvas-loading">Preparing 3D exhibition…</div>:<Suspense fallback={<div className="big-canvas-loading">Loading original 3D art…</div>}>
   <Canvas camera={{position:[0,1.7,5],fov:66,near:0.08,far:55}} dpr={mode==='lite'?1:mode==='high'?[1,1.75]:[1,1.35]}
    frameloop="demand" gl={{antialias:mode!=='lite',powerPreference:'low-power',alpha:false}} onCreated={({gl})=>{gl.setClearColor('#f2f0e9');}}>
    <Room template={template} exhibits={exhibits} onSelect={onSelect} selectedId={selectedId} onTeleport={onTeleport}/>
    <CameraWalker held={held} paused={!!selectedId} teleport={teleport} onPosition={onPosition}/>
   </Canvas>
  </Suspense>}
  <div className="big-scene-hud" aria-hidden="true">{pos[0]}, {pos[1]} · R3F</div>
  <div className="big-touch-pad" aria-label="Mobile navigation">
   {[['↑','w'],['←','a'],['↓','s'],['→','d']].map(([text,key])=><button key={key} type="button" onPointerDown={e=>{e.preventDefault();hold(key,true);}}
     onPointerUp={()=>hold(key,false)} onPointerCancel={()=>hold(key,false)} onPointerLeave={()=>hold(key,false)}>{text}</button>)}
  </div>
 </div>;
}
