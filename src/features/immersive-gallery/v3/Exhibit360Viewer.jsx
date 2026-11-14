import {getMuseumOffline} from './offlineAccess.js';
// Immersive 360-degree inspection of a physical frame or curated 3D object.
// A flat photograph remains flat: this is NOT a synthetic 360 panorama.
// Uses the existing authorized exhibit URL and never changes publication scope.
import React,{Suspense,useEffect,useMemo,useState} from 'react';
import * as THREE from 'three';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {ArrowLeft,ArrowRight,Image as ImageIcon,Pause,Play,RotateCcw} from 'lucide-react';
import {CuratedModel} from '../GalleryCanvasR3F.jsx';
import './exhibit360.css';

const safeText=(value,max=220)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
function canRenderWebGL(){
 try {
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
  if(!context)return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
 }catch{return false;}
}
function PosterTexture({title,description,width,height}){
 const map=useMemo(()=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=1024;canvas.height=768;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.fillStyle='#f7f2e4';ctx.fillRect(0,0,1024,768);
  ctx.fillStyle='#187669';ctx.fillRect(0,0,1024,110);
  ctx.fillStyle='#fffdf4';ctx.font='bold 40px Arial,sans-serif';
  ctx.textAlign='left';ctx.fillText('BRIAN · STUDENT EXHIBITION',64,73,900);
  ctx.fillStyle='#193f44';ctx.font='bold 68px Arial,sans-serif';
  const heading=safeText(title,95);
  const pieces=heading.split(/\s+/);let line='',yy=212;
  for(const word of pieces){
   const candidate=(line+' '+word).trim();
   if(ctx.measureText(candidate).width>882&&line){ctx.fillText(line,66,yy,884);yy+=77;line=word;}
   else line=candidate;
   if(yy>350)break;
  }
  if(line&&yy<=420){ctx.fillText(line,66,yy,884);yy+=95;}
  ctx.strokeStyle='#d8b85f';ctx.lineWidth=8;
  ctx.beginPath();ctx.moveTo(66,yy);ctx.lineTo(950,yy);ctx.stroke();
  ctx.fillStyle='#415957';ctx.font='36px Arial,sans-serif';
  let info=safeText(description,260);
  const words=info.split(/\s+/);line='';let dy=yy+65;
  for(const word of words){
   const candidate=(line+' '+word).trim();
   if(ctx.measureText(candidate).width>875&&line){
    ctx.fillText(line,66,dy,880);dy+=53;line=word;
   }else line=candidate;
   if(dy>675)break;
  }
  if(line&&dy<=710)ctx.fillText(line,66,dy,880);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  return texture;
 },[title,description]);
 useEffect(()=>()=>map?.dispose(),[map]);
 return map?<mesh position={[0,0,.105]}>
  <planeGeometry args={[width,height]}/>
  <meshBasicMaterial map={map} toneMapped={false}/>
 </mesh>:null;
}
function ArtworkSurface({url,onImageError,maxWidth=2.8,maxHeight=2.15}){
 const [texture,setTexture]=useState(null);
 useEffect(()=>{
  let active=true,resource=null;
  setTexture(null);
  if(!url)return undefined;
  new THREE.TextureLoader().load(url,t=>{
   resource=t;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;
   if(active)setTexture(t);else t.dispose();
  },undefined,()=>{if(active)onImageError?.();});
  return()=>{active=false;resource?.dispose();};
 },[url,onImageError]);
 if(!texture)return <mesh position={[0,0,.106]}>
  <planeGeometry args={[maxWidth,maxHeight]}/>
  <meshStandardMaterial color="#dbece6" roughness={.87}/>
 </mesh>;
 const rawW=Number(texture.image?.width)||1,rawH=Number(texture.image?.height)||1;
 const ratio=Math.max(.25,Math.min(4,rawW/rawH));
 const w=Math.min(maxWidth,maxHeight*ratio),h=w/ratio;
 return <mesh position={[0,0,.106]}>
  <planeGeometry args={[w,h]}/>
  <meshBasicMaterial map={texture} toneMapped={false} side={THREE.FrontSide}/>
 </mesh>;
}
function FramedWork({exhibit,url,onImageError}){
 const isModel=exhibit?.kind==='model';
 const isImage=exhibit?.kind==='image';
 const posterTitle=safeText(exhibit?.title,120);
 const posterDescription=safeText(exhibit?.description,280);
 if(isModel)return <group>
  <mesh position={[0,-1.02,0]}><cylinderGeometry args={[1.05,1.15,.33,36]}/>
   <meshStandardMaterial color="#e9dfc6" roughness={.63}/></mesh>
  <mesh position={[0,-.83,0]}><cylinderGeometry args={[.88,.88,.07,36]}/>
   <meshStandardMaterial color="#d7ac53" metalness={.45} roughness={.32}/></mesh>
  <group position={[0,-.15,0]}><CuratedModel modelKey={exhibit.model_key||'pedestal'} scale={1.03}/></group>
 </group>;
 return <group>
  <mesh position={[0,0,-.065]}><boxGeometry args={[3.2,2.55,.22]}/>
   <meshStandardMaterial color="#916f3e" roughness={.56} metalness={.11}/></mesh>
  <mesh position={[0,0,.058]}><boxGeometry args={[3.02,2.37,.035]}/>
   <meshStandardMaterial color="#fcfaf0" roughness={.8}/></mesh>
  {isImage
   ?<ArtworkSurface url={url} onImageError={onImageError}/>
   :<PosterTexture title={posterTitle} description={posterDescription} width={2.8} height={2.15}/>}
  <mesh position={[0,0,-.181]}>
   <planeGeometry args={[2.84,2.18]}/>
   <meshStandardMaterial color="#b99b65" roughness={.9} side={THREE.BackSide}/>
  </mesh>
  <mesh position={[0,0,-.194]}>
   <boxGeometry args={[1.36,.35,.02]}/>
   <meshStandardMaterial color="#dfc58a" roughness={.48} metalness={.18}/>
  </mesh>
 </group>;
}
function OrbitStage({exhibit,url,spin,yaw,reset,onImageError}){
 return <Canvas key={reset} data-testid="exhibit-360-canvas"
  camera={{position:[0,.2,4.65],fov:43,near:.1,far:30}}
  frameloop={spin?'always':'demand'} dpr={[1,1.45]}
  gl={{alpha:false,antialias:true,powerPreference:'low-power'}}>
  <color attach="background" args={['#e8efeb']}/>
  <ambientLight intensity={1.55}/>
  <hemisphereLight args={['#ffffff','#81938b',1.1]}/>
  <directionalLight position={[3,5,4]} intensity={2.0} color="#fff7e2"/>
  <directionalLight position={[-3,2,-4]} intensity={.8} color="#a9cfc4"/>
  <mesh position={[0,-1.5,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[5.4,48]}/>
   <meshStandardMaterial color="#cbd8cc" roughness={.84}/>
  </mesh>
  <group rotation={[0,yaw,0]}>
   <FramedWork exhibit={exhibit} url={url} onImageError={onImageError}/>
  </group>
  <OrbitControls makeDefault enableRotate enableZoom enableDamping enablePan={false}
   autoRotate={spin} autoRotateSpeed={1.45}
   minDistance={2.5} maxDistance={8.5}
   minPolarAngle={.16} maxPolarAngle={Math.PI-.16}/>
 </Canvas>;
}
export default function Exhibit360Viewer({exhibit,language='vi'}){
 const tr=(vi,en)=>language==='en'?en:vi;
 // An encoded 1024px artwork is usually far longer than 3,000 characters.
 // Never pass a truncated data URL to THREE.TextureLoader or the original 2D view.
 const rawImageUrl=typeof exhibit?.image_url==='string'?exhibit.image_url:'';
 const imageUrl=(getMuseumOffline()&&/^data:image\/(?:png|jpeg|webp|avif|gif);base64,/.test(rawImageUrl)||rawImageUrl.length<=4000000)&&(
  (getMuseumOffline()&&/^data:image\/(?:png|jpeg|webp|avif|gif);base64,/.test(rawImageUrl))||
  rawImageUrl.startsWith('data:image/png;base64,')||
  rawImageUrl.startsWith('data:image/jpeg;base64,')||
  rawImageUrl.startsWith('https://')||
  rawImageUrl.startsWith('/')||
  rawImageUrl.startsWith('blob:')
 )?rawImageUrl:'';
 const assetId=exhibit?.asset_id;
 const [resolvedUrl,setResolvedUrl]=useState(imageUrl);
 const [supportsWebGL,setSupportsWebGL]=useState(null);
 const [view,setView]=useState('3d'),[spin,setSpin]=useState(false);
 const [yaw,setYaw]=useState(0),[reset,setReset]=useState(0);
 const [loadError,setLoadError]=useState(false);
 useEffect(()=>{
  setSupportsWebGL(canRenderWebGL());
 },[]);
 useEffect(()=>{
  let active=true;
  setResolvedUrl(imageUrl);setLoadError(false);
  if(!imageUrl&&assetId){
   import('../galleryData.js').then(({getGalleryAssetUrl})=>getGalleryAssetUrl(assetId))
    .then(url=>{if(active)setResolvedUrl(typeof url==='string'?url:'');})
    .catch(()=>{if(active)setLoadError(true);});
  }
  return()=>{active=false;};
 },[imageUrl,assetId]);
 const switchTo2D=()=>{setSpin(false);setView('2d');};
 const onImageError=React.useCallback(()=>setLoadError(true),[]);
 const inspect3D=view==='3d'&&supportsWebGL===true;
 return <div className="bml-exhibit-360" data-testid="exhibit-360-viewer">
  <div className="bml-exhibit-360-toolbar" role="group" aria-label={tr('Chế độ quan sát tác phẩm','Exhibit viewing mode')}>
   <button type="button" aria-pressed={inspect3D} disabled={supportsWebGL===false}
    onClick={()=>{setView('3d');setLoadError(false);}}>{tr('Xem 360°','360° view')}</button>
   <button type="button" aria-pressed={view==='2d'||supportsWebGL===false}
    onClick={switchTo2D}><ImageIcon size={15}/>{tr('Xem 2D','2D original')}</button>
   {inspect3D?<button type="button" aria-pressed={spin} onClick={()=>setSpin(v=>!v)}>
    {spin?<Pause size={15}/>:<Play size={15}/>}
    {spin?tr('Dừng xoay','Pause'):tr('Tự xoay','Auto rotate')}</button>:null}
  </div>
  <div className="bml-exhibit-360-stage" data-testid="exhibit-360-stage">
   {inspect3D?<Suspense fallback={<p>{tr('Đang tải góc nhìn 360°…','Preparing 360° view…')}</p>}>
    <OrbitStage exhibit={exhibit} url={resolvedUrl} spin={spin}
     yaw={yaw} reset={reset} onImageError={onImageError}/>
   </Suspense>:exhibit?.kind==='image'&&resolvedUrl
    ?<img className="bml-exhibit-original-image" src={resolvedUrl} loading="lazy"
      alt={safeText(exhibit.alt_text||exhibit.title,180)} referrerPolicy="no-referrer"
      onError={()=>setLoadError(true)}/>
    :<div className="bml-exhibit-2d-copy">
      <strong>{safeText(exhibit?.title,120)}</strong>
      <p>{safeText(exhibit?.description,500)}</p>
      {supportsWebGL===false?<small>{tr('Thiết bị không hỗ trợ WebGL.','WebGL is unavailable on this device.')}</small>:null}
    </div>}
   {supportsWebGL===null?<div className="bml-exhibit-360-wait">{tr('Đang kiểm tra thiết bị…','Checking device…')}</div>:null}
  </div>
  {inspect3D?<div className="bml-exhibit-360-actions" role="group" aria-label={tr('Điều khiển góc nhìn','View controls')}>
   <button type="button" onClick={()=>setYaw(v=>v-Math.PI/6)} aria-label={tr('Xoay trái 30 độ','Rotate left 30 degrees')}><ArrowLeft size={16}/>{tr('Trái','Left')}</button>
   <button type="button" onClick={()=>{setYaw(0);setReset(n=>n+1);setSpin(false);}}><RotateCcw size={16}/>{tr('Đặt lại','Reset')}</button>
   <button type="button" onClick={()=>setYaw(v=>v+Math.PI/6)} aria-label={tr('Xoay phải 30 độ','Rotate right 30 degrees')}>{tr('Phải','Right')}<ArrowRight size={16}/></button>
  </div>:null}
  {loadError&&exhibit?.kind==='image'?<p className="bml-exhibit-360-error" role="status">
   {tr('Ảnh hiện không tải được. Có thể đường dẫn xem riêng tư đã hết hạn.','Image unavailable; the private viewing link may have expired.')}
  </p>:null}
  <p className="bml-exhibit-360-help">
   {inspect3D?tr('Kéo để xoay quanh khung tranh 360°. Cuộn hoặc chụm để phóng to và thu nhỏ.','Drag to orbit 360° around the frame. Scroll or pinch to zoom.'):
    tr('Đây là ảnh gốc hoặc nội dung mô tả của hiện vật.','This is the original 2D image or exhibit description.')}
  </p>
  <p className="bml-exhibit-360-disclaimer">
   {tr('Đây là góc nhìn 3D quanh tác phẩm phẳng, không phải ảnh panorama 360° của cảnh bên trong tranh.',
        'This rotates around a flat artwork; it is not a 360° panorama of the scene inside the image.')}
  </p>
 </div>;
}
