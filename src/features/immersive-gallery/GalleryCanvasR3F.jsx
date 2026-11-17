import React,{Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOM_TEMPLATES,normalizeTransform,useLiteQuality} from './sceneTemplates.js';
import {createCuratedGlb,CURATED_GLB_KEYS} from './curatedGlb.js';
import {ExhibitWallLabel,TextExhibitPoster} from './PekMuseumArchitecture.jsx';
import PekDiscoveryHallV4 from './PekDiscoveryHallV4.jsx';
import SwissEditorialHall,{SwissArtworkLabel} from './SwissEditorialHall.jsx';
import {isEditorialFurnitureAt} from './SwissEditorialHallDetails.jsx';
import MuseumExhibitFocusRig from './v3/MuseumExhibitFocusRig.jsx';
import {FOCUS_IDLE,focusLayout,clampDelta,smoothstep} from './v3/museumExhibitFocusMotion.js';
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
function cinemaPitch(count){
 return Math.min(2.95,8.4/Math.max(count||1,1));
}
function cinemaMount(aspect,count=3,editorial=false){
 const safe=Math.max(.55,Math.min(Number(aspect)||.78,1.85));
 const pitch=cinemaPitch(count);
 const maxW=editorial?Math.min(2.37,Math.max(.3,pitch-.46)):Math.min(2.2,Math.max(1.2,pitch-.5));
 const maxH=editorial?2.29:2.42;
 let imageW,imageH;
 if(safe>=1){imageW=maxW;imageH=imageW/safe;}
 else{imageH=maxH;imageW=Math.min(maxW,imageH*safe);imageH=imageW/safe;}
 if(editorial){
  const mat=[imageW+.26,imageH+.26];
  return {image:[imageW,imageH],mat,outer:[mat[0]+.12,mat[1]+.12]};
 }
 const mat=[imageW+.14,imageH+.14];
 const liner=[mat[0]+.1,mat[1]+.1];
 const gold=[liner[0]+.1,liner[1]+.1];
 const outer=[gold[0]+.14,gold[1]+.14];
 return {image:[imageW,imageH],mat,liner,gold,outer};
}
function ArtworkImage({assetId,imageUrl,schoolEdition=false,cinemaEdition=false,onAspect,box}) {
 const [texture,setTexture]=useState(null),live=useRef(null);
 useEffect(()=>{
  let active=true;
  if(cinemaEdition&&!imageUrl){
   const old=live.current;live.current=null;setTexture(null);old?.dispose();
   return undefined;
  }
  if(!assetId&&!imageUrl)return undefined;
  // In private Cinema, only the authorized short-lived signed URL is used.
  // The previous *decoded* GPU texture remains visible while a new signed URL
  // loads; failures never replace the original picture with fabricated media.
  (imageUrl?Promise.resolve(imageUrl):import('./galleryData.js').then(({getGalleryAssetUrl})=>getGalleryAssetUrl(assetId)))
   .then(url=>{
    if(!active||!url)return;
    new THREE.TextureLoader().load(url,t=>{
     t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=cinemaEdition?8:4;t.needsUpdate=true;
     if(!active){t.dispose();return;}
     const old=live.current;live.current=t;
     setTexture(t);
     if(old&&old!==t)old.dispose();
     document.dispatchEvent(new Event('bml:museum-texture-ready'));
    const ratio=(t.image?.width||1)/(t.image?.height||1);
    if(onAspect)onAspect(ratio);
    },undefined,()=>{/* keep last authorized decoded texture, no false replacement */});
   }).catch(()=>{/* 2D remains available if signed URL cannot be renewed */});
  return()=>{active=false;};
 },[assetId,imageUrl,cinemaEdition,onAspect]);
 useEffect(()=>()=>{live.current?.dispose();live.current=null;},[]);
 if(!texture)return <mesh position={[0,0,.087]}>
  <planeGeometry args={box||(cinemaEdition?[2.25,3.03]:schoolEdition?[2.1,1.46]:[1.62,1.17])}/>
  <meshStandardMaterial color="#E4E9DF" roughness={.95}/></mesh>;
 const width=texture.image?.width||1,height=texture.image?.height||1,aspect=width/height;
 const maxWidth=box?.[0]??(cinemaEdition?2.26:schoolEdition?2.11:1.65),maxHeight=box?.[1]??(cinemaEdition?3.03:schoolEdition?1.62:1.36);
 const size=aspect>maxWidth/maxHeight?[maxWidth,maxWidth/aspect]:[maxHeight*aspect,maxHeight];
 return <mesh position={[0,0,cinemaEdition?.096:.083]}>
  <planeGeometry args={size}/>
  <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} fog={false}/>
 </mesh>;
}
function PaperArtwork({exhibit,onSelect,isSelected,schoolEdition=false,cinemaEdition=false,index=0,count=1,
 focus=FOCUS_IDLE,onFocusPhaseChange,editorial=false}) {
 const transform=useMemo(()=>normalizeTransform(exhibit.transform||{}),[exhibit.transform]);
 const [aspect,setAspect]=useState(0),[hovered,setHovered]=useState(false);
 const reportAspect=useCallback(value=>{
  setAspect(prev=>Math.abs(prev-value)<.02?prev:value);
 },[]);
 const fitted=cinemaEdition?cinemaMount(aspect||.78,count,editorial):null;
 const frameHalf=fitted?fitted.outer[1]/2:1.6;
 const position=cinemaEdition?
  [(index-(count-1)/2)*cinemaPitch(count)+(editorial ? .34 : 0),1.18+frameHalf,editorial?-7.82:-7.68]:transform.position;
 const ref=useRef(null),motion=useRef({p:0,presenting:false,arrived:false,returned:false});
 const {size,invalidate,camera,gl}=useThree();
 const isTarget=cinemaEdition&&focus.exhibitId===exhibit.id;
 const wall=useMemo(()=>({
  position:[...position],rotation:[...transform.rotation],scale:[...transform.scale]
 }),[...position,...transform.rotation,...transform.scale]);
 useEffect(()=>{
  if(!ref.current)return;
  if(isTarget&&focus.phase==='preparing'){
   motion.current={p:0,presenting:false,arrived:false,returned:false};
   onFocusPhaseChange?.({type:'ASSET_READY'});
   invalidate();
  }else if(isTarget&&focus.phase==='returning'){
   motion.current.returned=false;
   invalidate();
  }else if(!isTarget){
   motion.current={p:0,presenting:false,arrived:false,returned:false};
   ref.current.position.set(...wall.position);
   ref.current.rotation.set(...wall.rotation);
   ref.current.scale.set(...wall.scale);
   invalidate();
  }
 },[isTarget,focus.phase,focus.generation,wall,invalidate]);
 useFrame((_,delta)=>{
  if(!ref.current)return;
  const node=ref.current,a=motion.current;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dt=clampDelta(delta);
  if(isTarget&&['extracting','presenting'].includes(focus.phase)){
   a.p=Math.min(1,a.p+dt/(reduced?.08:1.03));
   if(a.p>.60&&!a.presenting&&focus.phase==='extracting'){
    a.presenting=true;onFocusPhaseChange?.({type:'PRESENTING'});
   }
   if(a.p>=1&&!a.arrived){
    a.arrived=true;onFocusPhaseChange?.({type:'ARRIVED'});
   }
   if(a.p<1)invalidate();
  }else if(isTarget&&focus.phase==='returning'){
   a.p=Math.max(0,a.p-dt/(reduced?.08:.85));
   if(a.p<=0&&!a.returned){
    a.returned=true;onFocusPhaseChange?.({type:'RETURN_COMPLETE'});
   }
   if(a.p>0)invalidate();
  }
  if(isTarget){
   const layout=focusLayout(size.width,size.height),t=smoothstep(a.p);
   node.position.set(
    wall.position[0]+(layout.artwork[0]-wall.position[0])*t,
    wall.position[1]+(layout.artwork[1]-wall.position[1])*t,
    wall.position[2]+(layout.artwork[2]-wall.position[2])*t
   );
   const original=new THREE.Quaternion().setFromEuler(new THREE.Euler(...wall.rotation));
   node.quaternion.copy(original).slerp(new THREE.Quaternion(),t);
   const sc=layout.artworkScale;
   node.scale.set(...wall.scale.map(x=>x+(sc-x)*t));
  }
  // Read-only geometry QA bridge, available only to the project's test harness:
  // no group identifiers, asset URLs, token, or image bytes are exposed.
  if(cinemaEdition&&location.pathname.includes('/tests/museum-lab/')){
   window.__bmlMuseumFocusQA??={artworks:{},camera:{}};
   const p=new THREE.Vector3();node.getWorldPosition(p);
   const rect=gl.domElement.getBoundingClientRect(),q=p.clone().project(camera);
   window.__bmlMuseumFocusQA.artworks[index]={
    uuid:node.uuid,world:p.toArray().map(x=>+x.toFixed(4)),
    wall:[...wall.position],selected:isTarget,
    screen:{x:rect.left+(q.x+1)*rect.width/2,y:rect.top+(1-q.y)*rect.height/2}
   };
   window.__bmlMuseumFocusQA.camera={
    position:camera.position.toArray().map(x=>+x.toFixed(4)),
    quaternion:camera.quaternion.toArray().map(x=>+x.toFixed(5)),
    forward:camera.getWorldDirection(new THREE.Vector3()).toArray().map(x=>+x.toFixed(5))
   };
  }
 });
 return <group ref={ref} name={'BML_OriginalArtwork_'+index} userData={{originalArtwork:true,index}}
  position={position} rotation={transform.rotation} scale={transform.scale}
  onClick={e=>{e.stopPropagation();if(focus.phase==='idle'){setHovered(false);onSelect?.(exhibit.id);}}}
  onPointerOver={e=>{
   e.stopPropagation();
   if(focus.phase!=='idle')return;
   document.body.style.cursor='pointer';
   if(editorial)setHovered(true);
  }}
  onPointerOut={()=>{document.body.style.cursor='';if(editorial)setHovered(false);}}>
  <mesh><boxGeometry args={fitted? [...fitted.outer,.08]:cinemaEdition?[2.78,3.56,.08]:schoolEdition?[2.45,1.95,.11]:[2.04,1.70,.10]}/>
   <meshStandardMaterial color={editorial?(hovered&&focus.phase==='idle'?'#91703a':'#201e1a'):cinemaEdition?'#1A120C':schoolEdition?(isSelected?'#F6D477':'#B69B62'):(isSelected?'#e4aa64':'#ae856e')} roughness={.4} metalness={editorial ? .05 : cinemaEdition ? .48 : schoolEdition ? .19 : 0}/></mesh>
  {fitted&&!editorial?<mesh position={[0,0,.03]}><boxGeometry args={[...fitted.gold,.07]}/>
   <meshStandardMaterial color={isSelected?'#FFE7A1':'#F0D27A'} emissive={isSelected?'#E8CE78':'#3A2A10'} emissiveIntensity={isSelected?.8:.12} metalness={.7} roughness={.22}/></mesh>:null}
  {fitted&&!editorial?<mesh position={[0,0,.044]}><boxGeometry args={[...fitted.liner,.02]}/>
   <meshStandardMaterial color="#2A2118" roughness={.72}/></mesh>:null}
  <mesh position={[0,0,.058]}><boxGeometry args={fitted?[...fitted.mat,.02]:cinemaEdition?[2.4,3.14,.02]:schoolEdition?[2.29,1.80,.025]:[1.86,1.52,.025]}/>
   <meshStandardMaterial color={editorial?"#e9dfce":"#fffdf5"} roughness={.89}/></mesh>
  {exhibit.kind==='model'
   ?<group position={[0,0,0.45]}><CuratedModel modelKey={exhibit.model_key||'pedestal'} scale={0.63}/></group>
   :exhibit.kind==='image'
    ?<ArtworkImage assetId={exhibit.asset_id} imageUrl={exhibit.image_url} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} onAspect={cinemaEdition?reportAspect:undefined} box={fitted?.image}/>
    :schoolEdition?<TextExhibitPoster title={exhibit.title} index={index}/>:
    <group><mesh position={[0,0.22,0.083]}><boxGeometry args={[1.06,0.12,0.02]}/><meshStandardMaterial color="#93afa7"/></mesh>
      <mesh position={[0,-0.04,0.085]}><boxGeometry args={[0.9,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh>
      <mesh position={[0,-0.20,0.085]}><boxGeometry args={[1.02,0.05,0.02]}/><meshStandardMaterial color="#d7c3b3"/></mesh></group>}
  {editorial&&!(isTarget&&focus.phase!=='idle')?<SwissArtworkLabel title={exhibit.title} index={index}
   width={Math.max(.35,fitted.outer[0]-.06)} position={[0,-frameHalf-.205,.076]}/>:null}
  {schoolEdition&&!editorial&&!(isTarget&&focus.phase!=='idle')?<group position={[0,fitted?-(fitted.outer[1]/2+0.22)+1.24:(cinemaEdition?-.54:0),0]}><ExhibitWallLabel title={exhibit.title} index={index}/></group>:null}
 </group>;
}
function Walls({template,onTeleport,schoolEdition=false,cinemaEdition=false,lite=false}) {
 const original=ROOM_TEMPLATES[template]||ROOM_TEMPLATES.classic;
 const theme=schoolEdition
  ?{...original,
    wall:cinemaEdition?'#F4F7F2':'#E5F3EB',
    floor:cinemaEdition?'#E7C99A':'#DFE5DC',
    ceiling:cinemaEdition?'#FBF8F1':'#F8FCF7',
    accent:'#C8A34B'}
  :original;
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
  {schoolEdition?<PekDiscoveryHallV4 lite={lite}/>:<group>
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
// Fit the whole artwork wall in the real content area, including the narrow mobile stage.
function editorialRoomZ(aspect){
 return THREE.MathUtils.clamp(11.45/(2*Math.tan(THREE.MathUtils.degToRad(27.5))*aspect)-7.82,-1.7,7.9);
}
function CameraWalker({held,paused,onPosition,teleport,viewPreset,schoolEdition=false,cinemaEdition=false,editorial=false}) {
 const {camera,gl,invalidate,size}=useThree();
 const yaw=useRef(0),pitch=useRef(0),drag=useRef(null),tween=useRef(null),walking=useRef(false);
 const editorialAspect=editorial&&size.height?size.width/size.height:null;
 useEffect(()=>{
  // R3F default cameras look at the scene origin; a closer camera can then face
  // AWAY from the actual art wall. Set a known school-gallery orientation.
  if(!schoolEdition)return;
  yaw.current=0;pitch.current=cinemaEdition?.075:-.025;
  camera.rotation.order='YXZ';
  camera.rotation.set(pitch.current,yaw.current,0);
  camera.updateMatrixWorld();
  invalidate();
 },[camera,invalidate,schoolEdition,cinemaEdition]);
 useEffect(()=>{
  if(!editorialAspect||paused||walking.current||viewPreset)return;
  camera.position.set(0,1.95,editorialRoomZ(editorialAspect));
  invalidate();
 },[camera,editorialAspect,invalidate,paused,viewPreset]);
 useEffect(()=>{
  if(teleport?.length===2){camera.position.set(teleport[0],1.7,teleport[1]);invalidate();}
 },[camera,invalidate,teleport]);
 useEffect(()=>{
   if(paused){held.current.clear();drag.current=null;}
 },[paused,held]);
 // Viewpoint transitions are camera movement, not CSS resizing.
 useEffect(()=>{
  if(!cinemaEdition||!viewPreset)return;
  const overviewZ=editorialAspect?editorialRoomZ(editorialAspect):viewPreset.type==='room'?2.3:1.3;
  const destination=viewPreset.type==='artwork'?
   [viewPreset.x??0,1.95,editorial&&viewPreset.x==null?Math.max(-3.55,overviewZ-1.30):-3.56]:[0,1.96,overviewZ];
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  tween.current={from:camera.position.clone(),to:new THREE.Vector3(...destination),
   elapsed:0,duration:reduce?0:(viewPreset.type==='artwork'?.62:.82)};
  invalidate();
 },[camera,invalidate,cinemaEdition,editorial,editorialAspect,viewPreset]);
 useEffect(()=>{
   const canvas=gl.domElement;
   const keyDown=e=>{
     const node=e.target;
     if(node?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
     const key=String(e.key).toLowerCase();
     if(MOVE_KEYS.has(key)&&!paused){walking.current=true;tween.current=null;held.current.add(key);invalidate();if(key.startsWith('arrow'))e.preventDefault();}
   };
   const keyUp=e=>{held.current.delete(String(e.key).toLowerCase());};
   const down=e=>{if(e.button!==0||paused)return;drag.current=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);};
   const move=e=>{if(!drag.current||paused)return;walking.current=true;tween.current=null;const [x,y]=drag.current;
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
    camera.updateMatrixWorld();
    if(ratio>=1)tween.current=null;
    else invalidate();
   }
   const keys=held.current;
   const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
   const sideways=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
   if(!forward&&!sideways)return;
   walking.current=true;
   const speed=Math.min(delta,0.06)*(keys.has('shift')?4.2:2.6);
   const dir=new THREE.Vector3(sideways,0,-forward).applyEuler(new THREE.Euler(0,camera.rotation.y,0,'YXZ')).normalize();
   const nextX=THREE.MathUtils.clamp(camera.position.x+dir.x*speed,-6,6);
   const nextZ=THREE.MathUtils.clamp(camera.position.z+dir.z*speed,-7.6,7.9);
   if(!editorial||!isEditorialFurnitureAt(nextX,camera.position.z))camera.position.x=nextX;
   if(!editorial||!isEditorialFurnitureAt(camera.position.x,nextZ))camera.position.z=nextZ;
   camera.updateMatrixWorld();
   onPosition?.(camera.position.x,camera.position.z);
   invalidate();
 },-1);
 return null;
}
// R3F owns the canvas pixel dimensions; this observer keeps the perspective
// matrix synchronized with resized modal/fullscreen containers. Never stretch
// the CSS image of the canvas to simulate a larger room.
function MuseumFocusCameraRig({focus}){
 const {camera,size,invalidate}=useThree();
 const saved=useRef(null),returnStart=useRef(null),phaseRef=useRef('idle');
 const enterTime=useRef(0),returnTime=useRef(0);
 useEffect(()=>{
  if(focus.phase==='preparing'&&phaseRef.current==='idle'){
   saved.current={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
   enterTime.current=0;returnStart.current=null;
  }
  if(focus.phase==='returning'&&phaseRef.current!=='returning'){
   returnStart.current={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
   returnTime.current=0;
  }
  if(focus.phase==='idle'&&phaseRef.current!=='idle'&&saved.current){
   camera.position.copy(saved.current.position);camera.quaternion.copy(saved.current.quaternion);
   camera.fov=saved.current.fov;camera.updateProjectionMatrix();
   saved.current=null;returnStart.current=null;
  }
  phaseRef.current=focus.phase;invalidate();
 },[focus.phase,focus.generation,camera,invalidate]);
 useFrame((_,delta)=>{
  const active=['extracting','presenting','focused'].includes(focus.phase);
  const returning=focus.phase==='returning';
  if(!saved.current||(!active&&!returning))return;
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const layout=focusLayout(size.width,size.height);
  const target=new THREE.Vector3(...layout.camera),look=new THREE.Vector3(...layout.look);
  // Camera eyes look along local -Z; Object3D.lookAt uses +Z instead and
  // produced a backwards-facing empty scene during the first V5 visual run.
  const cameraRotation=new THREE.Quaternion().setFromRotationMatrix(
   new THREE.Matrix4().lookAt(target,look,new THREE.Vector3(0,1,0))
  );
  if(active){
   enterTime.current=Math.min(1,enterTime.current+clampDelta(delta)/(reduce?.08:1.0));
   const t=smoothstep(enterTime.current);
   camera.position.copy(saved.current.position).lerp(target,t);
   camera.quaternion.copy(saved.current.quaternion).slerp(cameraRotation,t);
   if(t<1)invalidate();
  }else if(returnStart.current){
   returnTime.current=Math.min(1,returnTime.current+clampDelta(delta)/(reduce?.08:.83));
   const t=smoothstep(returnTime.current);
   camera.position.copy(returnStart.current.position).lerp(saved.current.position,t);
   camera.quaternion.copy(returnStart.current.quaternion).slerp(saved.current.quaternion,t);
   if(t<1)invalidate();
  }
  camera.fov=saved.current.fov;camera.updateProjectionMatrix();
 });
 return null;
}
/**
 * A demand-rendered Canvas may drop the final invalidate() when a reducer
 * changes extracting -> presenting during the same R3F frame. Keep submitting
 * frames ONLY while a physical transition is active; idle/focused return to
 * demand rendering. This does not mount another Canvas or animate a copy.
 */
function MuseumFocusFramePump({phase}){
 const {invalidate}=useThree();
 useEffect(()=>{
  if(!['preparing','extracting','presenting','returning'].includes(phase))return;
  let alive=true,raf=0;
  const tick=()=>{
   if(!alive)return;
   invalidate();
   raf=window.requestAnimationFrame(tick);
  };
  raf=window.requestAnimationFrame(tick);
  return()=>{alive=false;window.cancelAnimationFrame(raf);};
 },[phase,invalidate]);
 return null;
}
function CinemaEffectPump({active}){
 const {invalidate}=useThree();
 useEffect(()=>{
  if(!active||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return undefined;
  let alive=true,raf=0;
  const tick=()=>{if(!alive)return;if(!document.hidden)invalidate();raf=window.requestAnimationFrame(tick);};
  raf=window.requestAnimationFrame(tick);
  return ()=>{alive=false;window.cancelAnimationFrame(raf);};
 },[active,invalidate]);
 return null;
}
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
function Room({template,exhibits,onSelect,selectedId,onTeleport,schoolEdition=false,cinemaEdition=false,editorial,roomNumber,roomTitle,onRoomGuide,roomGuideLabel,lite=false,focus=FOCUS_IDLE,focusBoard,onFocusBack,onFocusStep,focusIndex=0,language='en',onFocusPhaseChange}) {
 return <><color attach="background" args={[schoolEdition?(cinemaEdition?'#F7F4EC':'#EBF5F0'):'#f2f0e9']}/>
  <ambientLight intensity={schoolEdition?(cinemaEdition?1.15:1.25):1.1}/>
  <hemisphereLight args={[cinemaEdition?'#FFF8EC':'#FFFFFF',schoolEdition?(cinemaEdition?'#D5E6D4':'#9CAD9D'):'#B7AFA3',cinemaEdition?1.05:1.1]}/>
  <directionalLight position={[1,7,3]} color={schoolEdition?'#FFF7E4':'#FFFFFF'} intensity={cinemaEdition?1.35:1.15}/>
  {cinemaEdition?<directionalLight position={[-5,2.4,1.2]} color="#FFF4D8" intensity={.7}/>:null}
  {editorial?<SwissEditorialHall roomNumber={roomNumber} roomTitle={roomTitle} exhibits={exhibits} onTeleport={onTeleport} onRoomGuide={onRoomGuide} roomGuideLabel={roomGuideLabel}/>:<Walls template={template} onTeleport={onTeleport} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} lite={lite}/>}
  {exhibits.slice(0,30).map((e,i)=><PaperArtwork key={e.id} exhibit={e} index={i} count={Math.min(exhibits.length,30)} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition}
   editorial={editorial} focus={focus} onFocusPhaseChange={onFocusPhaseChange} onSelect={onSelect}
   isSelected={selectedId===e.id||focus.exhibitId===e.id}/>)}
  {cinemaEdition&&focus.phase!=='idle'?<MuseumExhibitFocusRig focus={focus} board={focusBoard} onBack={onFocusBack} onStep={onFocusStep} index={focusIndex} count={exhibits.length} language={language} lite={lite} editorial={editorial}/>:null}
 </>;
}
export default function GalleryCanvasR3F({template='classic',exhibits=[],onSelect,selectedId='',quality='auto',language='vi',schoolEdition=false,cinemaEdition=false,focus=FOCUS_IDLE,focusBoard,onFocusBack,onFocusStep,focusIndex=0,onFocusPhaseChange,editorial=false,roomNumber,roomTitle,onRoomGuide,roomGuideOpen=false,roomGuideLabel,editorialViewpoint}) {
 const held=useRef(new Set());
 const narrow=typeof window!=='undefined'&&window.matchMedia?.('(max-width:700px)').matches;
 const startingZ=cinemaEdition?(narrow?2.2:1.3):schoolEdition?(narrow?2.5:-1.6):4.7;
 const [teleport,setTeleport]=useState(null),[viewPreset,setViewPreset]=useState(null),[pos,setPos]=useState([0,startingZ]),[supported,setSupported]=useState(null);
 useEffect(()=>{if(editorialViewpoint)setViewPreset(editorialViewpoint);},[editorialViewpoint]);
 const mode=useLiteQuality(quality);
 useEffect(()=>{
   let ok=false;
   try {const c=document.createElement('canvas');const ctx=c.getContext('webgl2')||c.getContext('webgl');ok=!!ctx;}
   catch {ok=false;}
   setSupported(ok);
 },[]);
 useEffect(()=>{held.current.clear();},[selectedId,template,focus.phase]);
 const onPosition=(x,z)=>{setPos([+x.toFixed(1),+z.toFixed(1)]);};
 const hold=(key,down)=>{if(down)held.current.add(key);else held.current.delete(key);window.dispatchEvent(new Event('big-gallery-animate'));};
 const onTeleport=point=>{
  if(cinemaEdition&&focus.phase!=='idle')return;
  if(cinemaEdition){
   setViewPreset({type:point[1]<-3?'artwork':'room',x:point[0]});
  }else setTeleport([...point]);
 };
 return <div className={'big-webgl-shell '+(schoolEdition?'big-pek-museum ':'')+(cinemaEdition?'big-pek-v4':'')} data-testid={schoolEdition?'pek-discovery-hall':undefined}
  aria-label={schoolEdition?(language==='en'?'Pétrus Ký-inspired Discovery Museum 3D':'Bảo tàng 3D lấy cảm hứng từ Trường Pétrus Ký'):undefined}>
  {supported===false?<div role="alert" className="big-canvas-error">{language==='en'?'WebGL unavailable. Use the 2D exhibit list.':'Thiết bị không hỗ trợ WebGL. Hãy sử dụng danh sách hiện vật 2D.'}</div>:supported===null?<div className="big-canvas-loading">Preparing 3D exhibition…</div>:<Suspense fallback={<div className="big-canvas-loading">Loading original 3D art…</div>}>
   <Canvas camera={{position:[0,cinemaEdition?1.92:1.77,startingZ],fov:cinemaEdition?55:schoolEdition?59:61,near:0.08,far:55}} dpr={mode==='lite'?1:mode==='high'?[1,1.75]:[1,1.35]}
    frameloop="demand" gl={{antialias:mode!=='lite',powerPreference:'low-power',alpha:false}} onCreated={({gl})=>{
     gl.setClearColor(cinemaEdition?'#F7F4EC':'#f2f0e9');
     if(cinemaEdition){gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.22;}
    }}>
    <CameraResizeSync/>
    {cinemaEdition?<MuseumFocusFramePump phase={focus.phase}/>:null}
    {cinemaEdition?<CinemaEffectPump active={focus.phase==='idle'}/>:null}
    <Room template={template} exhibits={exhibits} onSelect={onSelect} selectedId={selectedId} onTeleport={onTeleport}
     focus={focus} focusBoard={focusBoard} onFocusBack={onFocusBack} onFocusStep={onFocusStep} focusIndex={focusIndex} language={language} onFocusPhaseChange={onFocusPhaseChange}
     schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} editorial={editorial} roomNumber={roomNumber} roomTitle={roomTitle} onRoomGuide={onRoomGuide} roomGuideLabel={roomGuideLabel} lite={mode==='lite'}/>
    <MuseumFocusCameraRig focus={cinemaEdition?focus:FOCUS_IDLE}/>
    <CameraWalker held={held} paused={roomGuideOpen||!!selectedId||(cinemaEdition&&focus.phase!=='idle')}
     teleport={teleport} onPosition={onPosition} schoolEdition={schoolEdition} cinemaEdition={cinemaEdition} editorial={editorial} viewPreset={viewPreset}/>
   </Canvas>
  </Suspense>}
  {schoolEdition&&!editorial?<div className="big-pek-tools" role="group" aria-label={language==='en'?'Museum viewpoints':'Góc tham quan bảo tàng'}>
   <div className="big-pek-edition-mark"><span className="big-pek-dot"/>
    <span className="big-pek-edition-long">{language==='en'?'PÉTRUS KÝ · DISCOVERY HALL':'PÉTRUS KÝ · BẢO TÀNG KHÁM PHÁ'}</span>
    <span className="big-pek-edition-short">{'PéK'}</span></div>
   <button type="button" disabled={cinemaEdition&&focus.phase!=='idle'} onClick={()=>onTeleport([0,-4.45])}>{language==='en'?'See the artwork':'Đến gần tranh'}</button>
   <button type="button" disabled={cinemaEdition&&focus.phase!=='idle'} onClick={()=>onTeleport([0,1.55])}>{language==='en'?'Full room view':'Toàn cảnh'}</button>
  </div>:!schoolEdition?<div className="big-scene-hud" aria-hidden="true">{pos[0]}, {pos[1]} · R3F</div>:null}
  {cinemaEdition&&!editorial?<div className="bml-v5-artwork-access" role="group" aria-label="Select a museum exhibit">
   {exhibits.slice(0,30).map((e,i)=><button type="button" key={e.id||i}
    disabled={focus.phase!=='idle'} onClick={()=>onSelect?.(e.id)}
    aria-label={'Inspect '+String(e.title||'exhibit')} title={e.title}>
    {String(i+1).padStart(2,'0')}</button>)}
  </div>:null}
  {(!cinemaEdition||focus.phase==='idle')?<div className="big-touch-pad" aria-label="Mobile navigation">
   {[['↑','w'],['←','a'],['↓','s'],['→','d']].map(([text,key])=><button key={key} type="button" onPointerDown={e=>{e.preventDefault();hold(key,true);}}
     onPointerUp={()=>hold(key,false)} onPointerCancel={()=>hold(key,false)} onPointerLeave={()=>hold(key,false)}>{text}</button>)}
  </div>:null}
 </div>;
}
