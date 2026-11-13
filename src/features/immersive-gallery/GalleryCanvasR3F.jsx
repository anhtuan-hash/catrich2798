import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOM_TEMPLATES,normalizeTransform,useLiteQuality} from './sceneTemplates.js';
import {createCuratedGlb,CURATED_GLB_KEYS} from './curatedGlb.js';
import {PekMuseumArchitecture,ExhibitWallLabel,TextExhibitPoster} from './PekMuseumArchitecture.jsx';
import PekDiscoveryHallV4 from './PekDiscoveryHallV4.jsx';
import MuseumExhibitFocusRig from './v3/MuseumExhibitFocusRig.jsx';
import {museumFocusLayout,minimumCameraDistance,selectFocusDuration,smoothstep} from './v3/museumExhibitFocusMotion.js';
import './pekMuseum.css';
// Cloud media service is imported on demand to prevent eager auth/bootstrap cycles.

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
function ArtworkImage({assetId,imageUrl,schoolEdition=false,cinemaEdition=false}) {
 const [texture,setTexture]=useState(null);
 const displayed=useRef(null);
 useEffect(()=>()=>{
  displayed.current?.dispose();displayed.current=null;
 },[]);
 useEffect(()=>{
  let alive=true;
  if(!assetId&&!imageUrl)return undefined;
  (imageUrl?Promise.resolve(imageUrl):import('./galleryData.js').then(({getGalleryAssetUrl})=>getGalleryAssetUrl(assetId)))
   .then(url=>{
    if(!alive||!url)return;
    new THREE.TextureLoader().load(url,t=>{
     t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
     if(!alive){t.dispose();return;}
     const old=displayed.current;
     displayed.current=t;
     setTexture(t);
     if(old&&old!==t)old.dispose();
     // Event exposes no tokens, group IDs or private URLs.
     document.dispatchEvent(new Event('bml:museum-texture-ready'));
    },undefined,()=>{/* Keep last decoded original while URL renews. */});
   }).catch(()=>{/* Never replace art with fabricated media. */});
  return()=>{alive=false;};
 },[assetId,imageUrl]);
 if(!texture)return <mesh position={[0,0,.087]}>
  <planeGeometry args={cinemaEdition?[2.25,3.03]:schoolEdition?[2.1,1.46]:[1.62,1.17]}/>
  <meshStandardMaterial color="#E4E9DF" roughness={.95}/></mesh>;
 const width=texture.image?.width||1,height=texture.image?.height||1,aspect=width/height;
 const maxWidth=cinemaEdition?2.26:schoolEdition?2.11:1.65,maxHeight=cinemaEdition?3.03:schoolEdition?1.62:1.36;
 const size=aspect>maxWidth/maxHeight?[maxWidth,maxWidth/aspect]:[maxHeight*aspect,maxHeight];
 return <mesh position={[0,0,cinemaEdition ? .096 : .083]}>
  <planeGeometry args={size}/><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide}/>
 </mesh>;
}
function PaperArtwork({exhibit,onSelect,isSelected,schoolEdition=false,cinemaEdition=false,index=0,
 focusPhase='idle',isFocused=false,selectionLocked=false,onTransitionComplete,onWorldPose}) {
 const transform=useMemo(()=>normalizeTransform(exhibit.transform||{}),[exhibit.transform]);
 const position=useMemo(()=>cinemaEdition?
  [Math.max(-3.2,Math.min(3.2,transform.position[0])),2.45,-7.68]:transform.position,
  [cinemaEdition,transform.position[0],transform.position[1],transform.position[2]]);
 const artRef=useRef(null),wallPose=useRef(null),motion=useRef(null);
 const pointerDown=useRef(null),lastPhase=useRef('idle');
 const {invalidate,size}=useThree();
 const aspect=size.width/Math.max(1,size.height),layout=useMemo(()=>museumFocusLayout(aspect),[aspect]);
 useEffect(()=>{
  const node=artRef.current;
  if(node&&!wallPose.current){
   wallPose.current={position:node.position.clone(),quaternion:node.quaternion.clone(),
    scale:node.scale.clone(),uuid:node.uuid};
  }
 },[]);
 useEffect(()=>{
  const node=artRef.current,wall=wallPose.current;
  if(!node||!wall||!cinemaEdition||!isFocused)return;
  if(focusPhase===lastPhase.current)return;
  lastPhase.current=focusPhase;
  const to=focusPhase==='returning'?wall:{
   position:new THREE.Vector3(...layout.art),
   quaternion:new THREE.Quaternion(),
   scale:wall.scale.clone()
  };
  if(['extracting','returning','presenting'].includes(focusPhase)){
   motion.current={
    phase:focusPhase,elapsed:0,duration:selectFocusDuration(
     focusPhase,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    from:{position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()},
    to
   };
   invalidate();
  }
 },[cinemaEdition,isFocused,focusPhase,layout,aspect,invalidate]);
 useFrame((_,delta)=>{
  const group=artRef.current,wall=wallPose.current;
  if(!group||!wall||!isFocused||!cinemaEdition)return;
  const tween=motion.current;
  if(tween){
   tween.elapsed+=Math.min(.05,delta);
   const t=smoothstep(Math.min(1,tween.elapsed/tween.duration));
   group.position.lerpVectors(tween.from.position,tween.to.position,t);
   group.quaternion.slerpQuaternions(tween.from.quaternion,tween.to.quaternion,t);
   group.scale.lerpVectors(tween.from.scale,tween.to.scale,t);
   if(t>=1){
    group.position.copy(tween.to.position);
    group.quaternion.copy(tween.to.quaternion);
    group.scale.copy(tween.to.scale);
    if(tween.phase==='returning'){
     // Verify the original object, not a duplicated presentation image,
     // returns to its immutable starting transform.
     group.position.copy(wall.position);
     group.quaternion.copy(wall.quaternion);
     group.scale.copy(wall.scale);
    }
    motion.current=null;
    onWorldPose?.({uuid:group.uuid,position:group.position.toArray(),
     wall:wall.position.toArray(),quaternion:group.quaternion.toArray(),
     wallQuaternion:wall.quaternion.toArray(),scale:group.scale.toArray()});
    const event=tween.phase==='extracting'?'EXTRACT_COMPLETE':
     tween.phase==='presenting'?'PRESENT_COMPLETE':'RETURN_COMPLETE';
    onTransitionComplete?.(event);
   }else{
    onWorldPose?.({uuid:group.uuid,position:group.position.toArray(),
     wall:wall.position.toArray(),quaternion:group.quaternion.toArray(),
     wallQuaternion:wall.quaternion.toArray(),scale:group.scale.toArray()});
    invalidate();
   }
  }
 });
 const maySelect=!selectionLocked;
 return <group ref={artRef} name={'MuseumOriginalArtwork-'+index}
  userData={{museumOriginalArtwork:true,exhibitIndex:index}}
  position={position} rotation={transform.rotation} scale={transform.scale}
  onPointerDown={e=>{pointerDown.current=[e.clientX,e.clientY];}}
  onClick={e=>{
   e.stopPropagation();
   const down=pointerDown.current;pointerDown.current=null;
   if(!maySelect||down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;
   onSelect?.(exhibit.id);
  }}
  onPointerOver={e=>{e.stopPropagation();if(maySelect)document.body.style.cursor='pointer';}}
  onPointerOut={()=>{document.body.style.cursor='';}}>
  <mesh><boxGeometry args={cinemaEdition?[2.63,3.41,.12]:schoolEdition?[2.45,1.95,.11]:[2.04,1.70,.10]}/>
   <meshStandardMaterial color={schoolEdition?(isSelected?'#F6D477':'#B69B62'):(isSelected?'#e4aa64':'#ae856e')}
    roughness={.63} metalness={schoolEdition?.19:0}/></mesh>
  <mesh position={[0,0,.058]}><boxGeometry args={cinemaEdition?[2.46,3.22,.025]:schoolEdition?[2.29,1.80,.025]:[1.86,1.52,.025]}/>
   <meshStandardMaterial color="#fffdf5" roughness={.89}/></mesh>
  {exhibit.kind==='model'
   ?<group position={[0,0,0.45]}><CuratedModel modelKey={exhibit.model_key||'pedestal'} scale={0.63}/></group>
   :exhibit.kind==='image'
    ?<ArtworkImage assetId={exhibit.asset_id} imageUrl={exhibit.image_url} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition}/>
    :schoolEdition?<TextExhibitPoster title={exhibit.title} index={index}/>:
    <group><mesh position={[0,0.22,0.083]}><boxGeometry args={[1.06,0.12,0.02]}/><meshStandardMaterial color="#93afa7"/></mesh>
      <mesh position={[0,-0.04,0.085]}><boxGeometry args={[0.9,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh>
      <mesh position={[0,-0.20,0.085]}><boxGeometry args={[1.02,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh></group>}
  {schoolEdition?<group position={[0,cinemaEdition?-.54:0,0]}><ExhibitWallLabel title={exhibit.title} index={index}/></group>:null}
 </group>;
}
function Walls({template,onTeleport,schoolEdition=false,cinemaEdition=false,lite=false}) {
 const original=ROOM_TEMPLATES[template]||ROOM_TEMPLATES.classic;
 const theme=schoolEdition?{...original,wall:'#E5F3EB',floor:'#DFE5DC',ceiling:'#F8FCF7',accent:'#138F86'}:original;
 const culture=template==='culture',lab=template==='lab',lobby=template==='lobby';
 return <group>
  <mesh position={[0,-0.08,0]} rotation={[-Math.PI/2,0,0]} receiveShadow onClick={e=>{
    e.stopPropagation();onTeleport?.([Math.max(-5.9,Math.min(5.9,e.point.x)),Math.max(-7.4,Math.min(7.4,e.point.z))]);}}>
   <planeGeometry args={[14,18]}/><meshStandardMaterial color={theme.floor} roughness={0.84} metalness={0.025}/>
  </mesh>
  <mesh position={[0,6,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[14,18]}/><meshStandardMaterial color={theme.ceiling} roughness={1}/></mesh>
  <mesh position={[0,3,-9]}><planeGeometry args={[14,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  <mesh position={[-7,3,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[18,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  <mesh position={[7,3,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[18,6]}/><meshStandardMaterial color={theme.wall} side={THREE.DoubleSide}/></mesh>
  {schoolEdition?(cinemaEdition?<PekDiscoveryHallV4 lite={lite}/>:<PekMuseumArchitecture template={template} lite={lite}/>):<group>
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
  {/* Museum-grade ceiling coves, baseboards, track lights and discreet floor seams. */}
  <mesh position={[0,5.76,-8.86]}><boxGeometry args={[13.9,0.075,0.12]}/><meshStandardMaterial color="#fafdf9" roughness={0.7}/></mesh>
  <mesh position={[0,0.18,-8.87]}><boxGeometry args={[13.9,0.21,0.09]}/><meshStandardMaterial color="#fbfff9" roughness={0.72}/></mesh>
  {[-6.93,6.93].map(x=><group key={'side-'+x}>
   <mesh position={[x,0.18,0]}><boxGeometry args={[0.085,0.2,17.8]}/><meshStandardMaterial color="#f9fcf8"/></mesh>
   <mesh position={[x,5.72,0]}><boxGeometry args={[0.085,0.11,17.8]}/><meshStandardMaterial color="#f9fcf8"/></mesh>
  </group>)}
  {[-5.5,-1.5,2.5,6.5].map(z=><mesh key={'floor-'+z} position={[0,-0.072,z]}>
   <boxGeometry args={[13.8,0.008,0.018]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.31}/></mesh>)}
  {[-3.8,3.8].map(x=><group key={'track-'+x}>
   <mesh position={[x,5.88,-1.8]}><boxGeometry args={[0.065,0.048,12.5]}/><meshStandardMaterial color="#9ba4a4" metalness={0.68} roughness={0.34}/></mesh>
   {[-6.2,-2.4,1.4,5.2].map(z=><group key={'light-'+z}>
    <mesh position={[x,5.75,z]}><cylinderGeometry args={[0.14,0.19,0.25,12]}/><meshStandardMaterial color="#fefcf6" emissive="#fff4dc" emissiveIntensity={0.2}/></mesh>
    <mesh position={[x,5.59,z]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[0.17,16]}/><meshBasicMaterial color="#fff9e9"/></mesh>
   </group>)}
  </group>)}
  <mesh position={[0,5.96,-1.5]}><boxGeometry args={[4.3,0.08,5.5]}/><meshStandardMaterial color="#fdfbf2" emissive="#fffbea" emissiveIntensity={0.08}/></mesh>
  </group>}
 </group>;
}
const MOVE_KEYS=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift']);
function CameraWalker({held,paused,onPosition,teleport,viewPreset,schoolEdition=false,cinemaEdition=false}) {
 const {camera,gl,invalidate}=useThree();
 const yaw=useRef(0),pitch=useRef(0),drag=useRef(null),tween=useRef(null);
 useEffect(()=>{
  // R3F default cameras look at the scene origin; a closer camera can then face
  // AWAY from the actual art wall. Set a known school-gallery orientation.
  if(!schoolEdition)return;
  yaw.current=0;pitch.current=cinemaEdition?.075:-.025;
  camera.rotation.order='YXZ';
  camera.rotation.set(pitch.current,yaw.current,0);
  camera.updateMatrixWorld();
  invalidate();
 },[camera,invalidate,schoolEdition]);
 useEffect(()=>{
  if(teleport?.length===2){camera.position.set(teleport[0],1.7,teleport[1]);invalidate();}
 },[camera,invalidate,teleport]);
 useEffect(()=>{
   if(paused)held.current.clear();
 },[paused,held]);
 // Viewpoint transitions are camera movement, not CSS resizing.
 useEffect(()=>{
  if(!cinemaEdition||!viewPreset)return;
  const destination=viewPreset.type==='artwork'?
   [viewPreset.x??0,1.95,-3.56]:[0,1.96,viewPreset.type==='room'?2.3:1.3];
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  tween.current={from:camera.position.clone(),to:new THREE.Vector3(...destination),
   elapsed:0,duration:reduce?0:(viewPreset.type==='artwork'?.62:.82)};
  invalidate();
 },[camera,invalidate,cinemaEdition,viewPreset?.id]);
 useEffect(()=>{
   const canvas=gl.domElement;
   const keyDown=e=>{
     const node=e.target;
     if(node?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
     const key=String(e.key).toLowerCase();
     if(MOVE_KEYS.has(key)&&!paused){tween.current=null;held.current.add(key);invalidate();if(key.startsWith('arrow'))e.preventDefault();}
   };
   const keyUp=e=>{held.current.delete(String(e.key).toLowerCase());};
   const down=e=>{if(e.button!==0)return;drag.current=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);};
   const move=e=>{if(!drag.current||paused)return;tween.current=null;const [x,y]=drag.current;
     yaw.current-=Math.max(-60,Math.min(60,e.clientX-x))*0.005;
     pitch.current=Math.max(-0.62,Math.min(0.62,pitch.current-(e.clientY-y)*0.003));
     camera.rotation.order='YXZ';camera.rotation.y=yaw.current;camera.rotation.x=pitch.current;
     drag.current=[e.clientX,e.clientY];invalidate();
   };
   const up=()=>{drag.current=null;};
   const blur=()=>held.current.clear();
   const wake=()=>invalidate();
   window.addEventListener('keydown',keyDown);
   window.addEventListener('keyup',keyUp);
   window.addEventListener('blur',blur);window.addEventListener('big-gallery-animate',wake);
   canvas.addEventListener('pointerdown',down);
   canvas.addEventListener('pointermove',move);
   canvas.addEventListener('pointerup',up);
   canvas.addEventListener('pointercancel',up);
   return()=>{held.current.clear();document.body.style.cursor='';window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);window.removeEventListener('big-gallery-animate',wake);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[gl,camera,invalidate,held,paused]);
 useFrame((_,delta)=>{
   if(paused)return;
   if(tween.current){
    const t=tween.current;
    t.elapsed+=Math.min(delta,.09);
    const ratio=t.duration===0?1:Math.min(1,t.elapsed/t.duration);
    const ease=ratio*ratio*(3-2*ratio);
    camera.position.lerpVectors(t.from,t.to,ease);
    if(cinemaEdition){yaw.current=0;pitch.current=.075;camera.rotation.set(pitch.current,yaw.current,0,'YXZ');}
    if(ratio>=1)tween.current=null;
    else invalidate();
   }
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
function MuseumFocusCameraDirector({phase='idle',cinemaEdition=false,onCameraPose}){
 const {camera,size,invalidate}=useThree();
 const original=useRef(null),animation=useRef(null);
 const layout=useMemo(()=>museumFocusLayout(size.width/Math.max(1,size.height)),[size.width,size.height]);
 useEffect(()=>{
  if(!cinemaEdition)return;
  if(phase==='idle'){
   if(original.current){
    camera.position.copy(original.current.position);
    camera.quaternion.copy(original.current.quaternion);
    camera.fov=original.current.fov;camera.updateProjectionMatrix();
    original.current=null;invalidate();
   }
   return;
  }
  if(!original.current){
   original.current={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
   onCameraPose?.({phase:'wall',position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov});
  }
  if(phase==='extracting'||phase==='returning'){
   const restore=phase==='returning',aspect=size.width/Math.max(1,size.height);
   const dist=minimumCameraDistance(6.25,4.15,aspect,layout.fov,.09);
   const destination=restore?original.current:{
    position:new THREE.Vector3(layout.camera[0],layout.camera[1],
     Math.max(layout.camera[2],layout.art[2]+dist+.20)),
    quaternion:new THREE.Quaternion(),
    fov:layout.fov
   };
   if(!restore){
    const look=new THREE.Matrix4().lookAt(destination.position,
     new THREE.Vector3(...layout.lookAt),new THREE.Vector3(0,1,0));
    destination.quaternion.setFromRotationMatrix(look);
   }
   animation.current={phase,elapsed:0,duration:selectFocusDuration(
    phase,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    from:{position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov},to:destination};
   invalidate();
  }
 },[phase,cinemaEdition,layout,camera,size.width,size.height,invalidate]);
 useFrame((_,delta)=>{
  const tween=animation.current;
  if(!tween||!cinemaEdition)return;
  tween.elapsed+=Math.min(.05,delta);
  const t=smoothstep(Math.min(1,tween.elapsed/tween.duration));
  camera.position.lerpVectors(tween.from.position,tween.to.position,t);
  camera.quaternion.slerpQuaternions(tween.from.quaternion,tween.to.quaternion,t);
  camera.fov=THREE.MathUtils.lerp(tween.from.fov,tween.to.fov,t);camera.updateProjectionMatrix();
  onCameraPose?.({phase:tween.phase,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov});
  if(t>=1){
   camera.position.copy(tween.to.position);camera.quaternion.copy(tween.to.quaternion);
   camera.fov=tween.to.fov;camera.updateProjectionMatrix();
   animation.current=null;
  }else invalidate();
 });
 return null;
}
// R3F owns the canvas pixel dimensions; this observer keeps the perspective
// matrix synchronized with resized modal/fullscreen containers. Never stretch
// the CSS image of the canvas to simulate a larger room.
function CameraResizeSync(){
 const {camera,gl,invalidate}=useThree();
 useEffect(()=>{
  const parent=gl.domElement.parentElement;
  if(!parent||typeof ResizeObserver==='undefined')return;
  const sync=()=>{
   const width=parent.clientWidth,height=parent.clientHeight;
   if(width>0&&height>0&&'aspect'in camera){
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    invalidate();
   }
  };
  const observer=new ResizeObserver(sync);
  observer.observe(parent);sync();
  return()=>observer.disconnect();
 },[camera,gl,invalidate]);
 return null;
}
function Room({template,exhibits,onSelect,selectedId,onTeleport,schoolEdition=false,cinemaEdition=false,lite=false,
 focusPhase='idle',focusId=null,focusBoard=null,onFocusBack,onFocusPhaseChange,onWorldPose}) {
 return <><color attach="background" args={[schoolEdition?'#EBF5F0':'#f2f0e9']}/>
  <ambientLight intensity={schoolEdition?1.25:1.1}/>
  <hemisphereLight args={['#FFFFFF',schoolEdition?'#9CAD9D':'#B7AFA3',1.1]}/>
  <directionalLight position={[1,7,3]} color={schoolEdition?'#FFF7E4':'#FFFFFF'} intensity={1.15}/>
  <Walls template={template} onTeleport={onTeleport} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} lite={lite}/>
  {exhibits.slice(0,30).map((e,i)=><PaperArtwork key={e.id} exhibit={e} index={i} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition}
   focusPhase={focusPhase} isFocused={!!focusId&&focusId===e.id} selectionLocked={focusPhase!=='idle'}
   onTransitionComplete={onFocusPhaseChange} onWorldPose={onWorldPose}
   onSelect={onSelect} isSelected={selectedId===e.id||focusId===e.id}/>)}
  {cinemaEdition&&focusId&&focusBoard&&focusPhase!=='idle'?
   <MuseumExhibitFocusRig phase={focusPhase} board={focusBoard} onBack={onFocusBack} lite={lite}/>:null}
 </>;
}
export default function GalleryCanvasR3F({template='classic',exhibits=[],onSelect,selectedId='',quality='auto',language='en',schoolEdition=false,cinemaEdition=false,
 focusPhase='idle',focusId=null,focusBoard=null,onFocusBack,onFocusPhaseChange}) {
 const held=useRef(new Set());
 const shellRef=useRef(null);
 const narrow=typeof window!=='undefined'&&window.matchMedia?.('(max-width:700px)').matches;
 const startingZ=cinemaEdition?(narrow?2.2:1.3):schoolEdition?(narrow?2.5:-1.6):4.7;
 const [teleport,setTeleport]=useState(null),[viewPreset,setViewPreset]=useState(null),[pos,setPos]=useState([0,startingZ]),[supported,setSupported]=useState(null);
 const mode=useLiteQuality(quality);
 useEffect(()=>{
   let ok=false;
   try {const c=document.createElement('canvas');const ctx=c.getContext('webgl2')||c.getContext('webgl');ok=!!ctx;}
   catch {ok=false;}
   setSupported(ok);
 },[]);
 useEffect(()=>{held.current.clear();},[selectedId,focusPhase,template]);
 useEffect(()=>()=>{if(typeof window!=='undefined'&&window.__brianMuseumV5QA)delete window.__brianMuseumV5QA;},[]);
 const onWorldPose=pose=>{
  const node=shellRef.current?.querySelector('[data-testid="museum-focus-artwork"]');
  if(!node)return;
  node.dataset.worldPosition=pose.position.map(n=>n.toFixed(5)).join(',');
  node.dataset.wallPosition=pose.wall.map(n=>n.toFixed(5)).join(',');
  node.dataset.meshUuid=pose.uuid;
 };
 const onCameraPose=pose=>{
  const node=shellRef.current?.querySelector('[data-testid="museum-focus-artwork"]');
  if(node)node.dataset.cameraPosition=pose.position.map(n=>n.toFixed(5)).join(',');
 };
 const onPosition=(x,z)=>{setPos([+x.toFixed(1),+z.toFixed(1)]);};
 const hold=(key,down)=>{if(down)held.current.add(key);else held.current.delete(key);window.dispatchEvent(new Event('big-gallery-animate'));};
 const onTeleport=point=>{
  if(cinemaEdition){
   setViewPreset({type:point[1]<-3?'artwork':'room',x:point[0],id:Date.now()+Math.random()});
  }else setTeleport([...point]);
 };
 return <div ref={shellRef} className={'big-webgl-shell '+(schoolEdition?'big-pek-museum ':'')+(cinemaEdition?'big-pek-v4':'')} data-testid={schoolEdition?'pek-discovery-hall':undefined}
  aria-label={schoolEdition?(language==='en'?'Pétrus Ký-inspired Discovery Museum 3D':'Bảo tàng 3D lấy cảm hứng từ Trường Pétrus Ký'):undefined}>
  {cinemaEdition?<div data-testid="museum-focus-state" data-phase={focusPhase}
    data-focused={focusPhase!=='idle'} className="bml-v5-focus-announcement" aria-live="polite">
    {focusPhase==='focused'&&focusBoard?focusBoard.title+' is now displayed in the museum.':''}
  </div>:null}
  {cinemaEdition&&focusId?<div data-testid="museum-focus-stage" data-real-scene="MuseumV5FocusRig"
    className="bml-v5-focus-announcement" aria-hidden="true"/>
   :null}
  {cinemaEdition?<div data-testid="museum-focus-artwork" className="bml-v5-focus-announcement" aria-hidden="true"/>:null}
  {supported===false?<div role="alert" className="big-canvas-error">{language==='en'?'WebGL unavailable. Use the 2D exhibit list.':'Thiết bị không hỗ trợ WebGL. Hãy sử dụng danh sách hiện vật 2D.'}</div>:supported===null?<div className="big-canvas-loading">Preparing 3D exhibition…</div>:<Suspense fallback={<div className="big-canvas-loading">Loading original 3D art…</div>}>
   <Canvas camera={{position:[0,cinemaEdition?1.92:1.77,startingZ],fov:cinemaEdition?55:schoolEdition?59:61,near:0.08,far:55}} dpr={mode==='lite'?1:mode==='high'?[1,1.75]:[1,1.35]}
    // Run continuous frames only for the <1s physical transition; all settled
    // states remain demand-driven. Headless/school GPUs may throttle invalidate()
    // requested inside useFrame, otherwise indefinitely stalling extraction.
    frameloop={cinemaEdition&&['preparing','extracting','presenting','returning'].includes(focusPhase)?'always':'demand'}
    gl={{antialias:mode!=='lite',powerPreference:'low-power',alpha:false}} onCreated={({gl,scene,camera})=>{
     gl.setClearColor('#f2f0e9');
     // Read-only geometric bridge in QA harness only. Never expose URLs,
     // group identity, artwork text or auth tokens.
     if(location.pathname.startsWith('/tests/museum-lab/')){
      window.__brianMuseumV5QA=()=>{
       const art=[];scene.traverse(o=>{
        if(!o.userData?.museumOriginalArtwork)return;
        const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
        o.getWorldPosition(p);o.getWorldQuaternion(q);o.getWorldScale(s);
        const ndc=p.clone().project(camera),rect=gl.domElement.getBoundingClientRect();
        art.push({index:o.userData.exhibitIndex,uuid:o.uuid,position:p.toArray(),
         quaternion:q.toArray(),scale:s.toArray(),
         screen:{x:rect.left+(ndc.x+1)*rect.width/2,y:rect.top+(1-ndc.y)*rect.height/2}});
       });
       const focus=scene.getObjectByName('MuseumV5FocusRig');
       return {originalArtworkCount:art.length,art,
        focusRigCount:focus?1:0,
        camera:camera.position.toArray(),cameraQuaternion:camera.quaternion.toArray(),fov:camera.fov,
        canvasCount:document.querySelectorAll('.bml-museum-cinema canvas').length};
      };
     }
    }}>
    <CameraResizeSync/>
    <Room template={template} exhibits={exhibits} onSelect={onSelect} selectedId={selectedId} onTeleport={onTeleport}
     schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} lite={mode==='lite'}
     focusPhase={focusPhase} focusId={focusId} focusBoard={focusBoard}
     onFocusBack={onFocusBack} onFocusPhaseChange={onFocusPhaseChange} onWorldPose={onWorldPose}/>
    <CameraWalker held={held} paused={!!selectedId||focusPhase!=='idle'} teleport={teleport}
     onPosition={onPosition} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} viewPreset={viewPreset}/>
    {cinemaEdition?<MuseumFocusCameraDirector phase={focusPhase} cinemaEdition onCameraPose={onCameraPose}/>:null}
   </Canvas>
  </Suspense>}
  {schoolEdition?<div className="big-pek-tools" role="group" aria-label={language==='en'?'Museum viewpoints':'Góc tham quan bảo tàng'}>
   <div className="big-pek-edition-mark"><span className="big-pek-dot"/>
    <span className="big-pek-edition-long">{language==='en'?'PÉTRUS KÝ · DISCOVERY HALL':'PÉTRUS KÝ · BẢO TÀNG KHÁM PHÁ'}</span>
    <span className="big-pek-edition-short">{'PéK'}</span></div>
   <button type="button" disabled={focusPhase!=='idle'} onClick={()=>onTeleport([0,-4.45])}>{language==='en'?'See the artwork':'Đến gần tranh'}</button>
   <button type="button" disabled={focusPhase!=='idle'} onClick={()=>onTeleport([0,1.55])}>{language==='en'?'Full room view':'Toàn cảnh'}</button>
  </div>:<div className="big-scene-hud" aria-hidden="true">{pos[0]}, {pos[1]} · R3F</div>}
  <div className="big-touch-pad" aria-label="Mobile navigation">
   {[['↑','w'],['←','a'],['↓','s'],['→','d']].map(([text,key])=><button key={key} type="button" disabled={focusPhase!=='idle'} onPointerDown={e=>{if(focusPhase!=='idle')return;e.preventDefault();hold(key,true);}}
     onPointerUp={()=>hold(key,false)} onPointerCancel={()=>hold(key,false)} onPointerLeave={()=>hold(key,false)}>{text}</button>)}
  </div>
 </div>;
}
