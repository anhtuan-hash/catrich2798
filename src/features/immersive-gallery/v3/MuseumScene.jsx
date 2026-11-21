import React,{Suspense,lazy,useCallback,useEffect,useMemo,useReducer,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,ChevronLeft,ChevronRight,Eye,FileText,Info,LayoutGrid,MapPin,Maximize2,Minimize2,X,Image as ImageIcon,Leaf,Globe2} from 'lucide-react';
import '../gallery.css';
import {exhibitInsights,exhibitField} from './museumExhibitInsights.js';
import './museumExhibitLens.css';
import './museumPaper2D.css';
import './museumCinemaPreview.css';
import './museumExhibitFocus.css';
import {FOCUS_IDLE,focusReducer,focusActive} from './museumExhibitFocusMotion.js';
import {buildExhibitFocusBoard} from './museumExhibitFocusData.js';
import MuseumSurveyChart from './MuseumSurveyChart.jsx';
import MuseumPhotoQuiz from './MuseumPhotoQuiz.jsx';
import {museumPhotoQuiz} from './museumPhotoQuizData.js';
import {MuseumEditorialRoom,MuseumEditorialExhibit} from './MuseumEditorial2D.jsx';
import {isAsean} from './aseanLesson.js';
import {PEK_GALLERY_WALL_INSCRIPTIONS} from '../pekMuseumMotto.js';
import {buildCollectionHall} from '../swissCollectionLayout.js';
import './museumEditorial3D.css';
const GalleryCanvas=lazy(()=>import('../GalleryCanvasR3F.jsx'));
const Exhibit360Viewer=lazy(()=>import('./Exhibit360Viewer.jsx'));
const clean=(x,n=180)=>String(x??'').slice(0,n);
const numberLabel=n=>String(n).padStart(2,'0');
const museumSchool='PÉTRUS KÝ';
function CollectionFloorPlan({count,activeIndex,language}){
 const {walls,bays}=useMemo(()=>buildCollectionHall(count),[count]);
 const activeWall=bays[activeIndex].wallIndex+1;
 const position=(language==='en'?'Wall ':'Tường ')+numberLabel(activeWall)+' / '+numberLabel(walls.length);
 return <figure className="bml-swiss-3d-plan" data-testid="museum-collection-plan" data-wall={activeWall}>
  <div className="bml-swiss-3d-plan-grid" role="img"
   aria-label={(language==='en'?'Gallery floor plan. ':'Sơ đồ phòng triển lãm. ')+position}>
   {walls.map((wall,i)=><div key={i} className="bml-swiss-3d-plan-wall" data-side={i+1} aria-hidden="true">
    {wall.bays.map(bay=><span key={bay.index} className={bay.index===activeIndex?'is-current':''}/>)}
   </div>)}
  </div>
  <figcaption aria-hidden="true">{position}</figcaption>
 </figure>;
}
function ExhibitVisual({exhibit,index,language}){
 const [failed,setFailed]=useState(false);
 const source=typeof exhibit?.image_url==='string'?exhibit.image_url:'';
 useEffect(()=>setFailed(false),[source]);
 const tr=(vi,en)=>language==='en'?en:vi;
 const isImage=Boolean(source&&!failed);
 return <div className={'bml-paper-art-photo '+(!isImage?'is-empty':'')+
  ' bml-paper-art-photo--'+index%3}>
  {isImage?<img key={source} src={source} alt={clean(exhibit?.alt_text||exhibit?.title||'Student exhibition image',220)}
   referrerPolicy="no-referrer" loading="lazy" decoding="async"
   onError={()=>setFailed(true)}/>:
   <div className="bml-paper-photo-placeholder">
    <ImageIcon size={32} strokeWidth={1.5} aria-hidden="true"/>
    <span>{failed||exhibit?.asset_id?tr('Ảnh không khả dụng · mở lại xem trước','Image unavailable · reopen preview'):
      tr('Chưa có ảnh của nhóm','No group image uploaded')}</span>
   </div>}
 </div>;
}
export function reviewMuseum(review,assets=[],lessonTemplate){
 const byId=new Map(assets.filter(a=>a?.id&&a?.image_url).map(a=>[a.id,a]));
 const raw=review?.snapshot||{};
 return {
  id:'review-'+String(review?.id||'preview'),
  title:raw.title||'English Museum',
  summary:raw.summary||'Private review draft — not published',
  lesson_template:lessonTemplate??raw.lesson_template,
  status:review?.state||'draft',
  learning:raw.learning||{},survey:raw.survey||null,artMeta:raw.artMeta||{},
  rooms:(raw.rooms||[]).map((r,i)=>({
   id:'review-room-'+i,title:r.title||'Room '+(i+1),
   template_key:r.template_key||'classic',
   exhibits:(r.exhibits||[]).map((e,j)=>{
    const slot=['issue','evidence','solution'][j],asset=byId.get(e.asset_id||raw.artworks?.[slot]);
    return {...e,id:'review-exhibit-'+i+'-'+j,status:'published',image_url:asset?.image_url||'',
     kind:asset?'image':e.kind,alt_text:e.alt_text||raw.artMeta?.[slot]?.alt||e.title,
     image_original_name:asset?.original_name||''};
   })
  }))
 };
}
export default function MuseumScene({gallery,onBack,onClose,language='vi',embedded=false,compact=false,initial3D=false,onExhibitSelect,cinema=false,initialRoomIndex=0,startIn2D=false,onOpen3D}){
 const [activeRoom,setActiveRoom]=useState(initialRoomIndex),[threeD,setThreeD]=useState(!startIn2D&&(cinema||initial3D)),[selectedId,setSelectedId]=useState(null);
 const inline=Boolean(onOpen3D);
 const [fullPosterId,setFullPosterId]=useState(null);
 const editorialCinema=cinema&&isAsean(gallery);
 const swiss3D=editorialCinema&&threeD;
 const [viewpoint,setViewpoint]=useState(null);
 const [focus,dispatchFocus]=useReducer(focusReducer,FOCUS_IDLE);
 const isFocus=cinema&&threeD&&focusActive(focus);
 const editorial=editorialCinema&&!threeD;
 const focusBack=()=>dispatchFocus({type:'BACK'});
 const queuedFocus=useRef(null);
 const stepFocus=dir=>{
  if(focus.phase!=='focused')return;
  const i=exhibits.findIndex(e=>e.id===focus.exhibitId);
  const next=exhibits[i+dir];
  if(!next)return;
  queuedFocus.current=next.id;
  dispatchFocus({type:'BACK'});
 };
 const changeTo2D=()=>{setViewpoint(null);queuedFocus.current=null;dispatchFocus({type:'RESET'});setInfoOpen(false);setThreeD(false);};
 const changeTo3D=()=>{setInfoOpen(false);setSelectedId(null);setFullPosterId(null);setThreeD(true);};
 const lastFocusPhase=useRef('idle');
 const cinemaRef=useRef(null),cinemaOpenerRef=useRef(null),[infoOpen,setInfoOpen]=useState(false);
 const infoTriggerRef=useRef(null),infoCloseRef=useRef(null);
 const openInfo=useCallback(()=>setInfoOpen(true),[]);
 const closeInfo=useCallback(()=>{
  setInfoOpen(false);
  infoTriggerRef.current?.focus({preventScroll:true});
 },[]);
 useEffect(()=>{
  if(swiss3D&&infoOpen)infoCloseRef.current?.focus({preventScroll:true});
 },[infoOpen,swiss3D]);
 useEffect(()=>{
  if(!cinema)return;
  if(focus.phase==='idle'&&lastFocusPhase.current!=='idle'){
   if(openerRef.current?.isConnected)openerRef.current.focus({preventScroll:true});
   else cinemaRef.current?.querySelector('.bml-cinema-mode-group button')?.focus({preventScroll:true});
  }
  lastFocusPhase.current=focus.phase;
 },[cinema,focus.phase]);
 useEffect(()=>{if(cinema)cinemaOpenerRef.current=document.activeElement;},[cinema]);
 const [isFullscreen,setIsFullscreen]=useState(false),[fallbackFullscreen,setFallbackFullscreen]=useState(false);
 const leaveCinema=()=>{
  if(document.fullscreenElement===cinemaRef.current)document.exitFullscreen?.().catch(()=>{});
  dispatchFocus({type:'RESET'});setFallbackFullscreen(false);onClose?.();
  Promise.resolve().then(()=>cinemaOpenerRef.current?.focus?.());
 };
 const toggleFullscreen=async()=>{
  if(document.fullscreenElement===cinemaRef.current){
   try{await document.exitFullscreen?.();}catch{setFallbackFullscreen(false);}
   return;
  }
  if(fallbackFullscreen){setFallbackFullscreen(false);return;}
  try{
   if(typeof cinemaRef.current?.requestFullscreen!=='function')throw Error('Fullscreen unavailable');
   await cinemaRef.current.requestFullscreen();
  }catch{setFallbackFullscreen(true);}
 };
 const open3D=async event=>{
  const trigger=event.currentTarget;
  if(document.fullscreenElement===cinemaRef.current||fallbackFullscreen)await toggleFullscreen();
  onOpen3D(trigger);
 };
 useEffect(()=>{
  if(!cinema)return undefined;
  const onFullscreen=()=>setIsFullscreen(document.fullscreenElement===cinemaRef.current);
  const onEscape=event=>{
   if(inline&&!cinemaRef.current?.contains(event.target))return;
   if(event.key==='Tab'&&(!inline||isFullscreen||fallbackFullscreen)&&(!selectedId||editorial)&&!fullPosterId){
    const controls=[...(cinemaRef.current?.querySelectorAll('button:not(:disabled),a[href]')||[])]
     .filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    return;
   }
   if(event.key!=='Escape')return;
   if(infoOpen){event.preventDefault();closeInfo();return;}
   if(cinema&&threeD&&focusActive(focus)){
    event.preventDefault();event.stopPropagation();focusBack();return;
   }
   if(inline){
    if(fallbackFullscreen){event.preventDefault();setFallbackFullscreen(false);}
    return;
   }
   if(!selectedId&&!fullPosterId&&!document.fullscreenElement){
    event.preventDefault();leaveCinema();
   }
  };
  document.addEventListener('fullscreenchange',onFullscreen);
  document.addEventListener('keydown',onEscape);
  return()=>{document.removeEventListener('fullscreenchange',onFullscreen);document.removeEventListener('keydown',onEscape);};
 },[cinema,onClose,selectedId,fullPosterId,infoOpen,threeD,focus.phase,editorial,closeInfo,inline,isFullscreen,fallbackFullscreen]);
 const posterCloseRef=useRef(null),posterOpenerRef=useRef(null);
 const dialogRef=useRef(null),closeRef=useRef(null),openerRef=useRef(null);
 const editorialScrollRef=useRef(null),roomTabsRef=useRef(null);
 const rooms=gallery?.rooms||[];
 const roomIndex=Math.min(activeRoom,Math.max(0,rooms.length-1));
 const room=rooms[roomIndex];
 const fourWall=swiss3D&&rooms.length>1;
 const [roomHeading,roomSubtitle]=clean(room?.title,140).split(/ (?=Ancient Town$)/);
 const exhibits=useMemo(()=>room?.exhibits||[],[room]);
 const selected=exhibits.find(e=>e.id===selectedId);
 const fullPoster=exhibits.find(e=>e.id===fullPosterId);
 const openFullPoster=id=>{posterOpenerRef.current=document.activeElement;setFullPosterId(id);};
 const closeFullPoster=()=>{
  setFullPosterId(null);
  Promise.resolve().then(()=>posterOpenerRef.current?.focus?.());
 };
 useEffect(()=>{
  if(!fullPoster)return;
  posterCloseRef.current?.focus?.();
  const onKey=event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeFullPoster();}
   if(event.key==='Tab'){event.preventDefault();posterCloseRef.current?.focus?.();}
  };
  document.addEventListener('keydown',onKey,true);
  return()=>document.removeEventListener('keydown',onKey,true);
 },[fullPoster?.id]);
 const selectedIndex=exhibits.findIndex(e=>e.id===selectedId);
 const insight=selected?exhibitInsights(gallery,selected,selectedIndex):null;
 const selectedQuiz=museumPhotoQuiz(selected);
 const focusSelectedIndex=exhibits.findIndex(e=>e.id===focus.exhibitId);
 const focusSelected=focusSelectedIndex>=0?exhibits[focusSelectedIndex]:null;
 const focusBoard=useMemo(()=>focusSelected?
  buildExhibitFocusBoard(gallery,focusSelected,focusSelectedIndex):null,
  [gallery,focusSelected,focusSelectedIndex]);
 const tr=(vi,en)=>language==='en'?en:vi;
 const openExhibit=(id,recordOpener=true,collectionIndex=roomIndex)=>{
  if(cinema&&threeD&&focus.phase!=='idle')return;
  const collection=rooms[collectionIndex];
  const collectionExhibits=collection?.exhibits||[];
  const index=collectionExhibits.findIndex(exhibit=>exhibit.id===id);
  if(index<0)return;
  if(collectionIndex!==roomIndex)setActiveRoom(collectionIndex);
  if(recordOpener)openerRef.current=swiss3D&&infoOpen?infoTriggerRef.current:document.activeElement;
  if(swiss3D&&infoOpen)setInfoOpen(false);
  const title=collectionExhibits[index].title;
  onExhibitSelect?.({index,key:exhibitField(index,title),title});
  if(cinema&&threeD){
   dispatchFocus({type:'SELECT',exhibitId:id,roomId:collection?.id||'room-'+collectionIndex});
  }else setSelectedId(id);
 };
 const closeExhibit=()=>{
  setSelectedId(null);
  window.requestAnimationFrame(()=>openerRef.current?.focus({preventScroll:true}));
 };
 useEffect(()=>{
  if(!selected||cinema&&threeD)return undefined;
  closeRef.current?.focus({preventScroll:true});
  const handleKeys=event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeExhibit();return;}
   if(event.key!=='Tab'||editorial)return;
   const controls=[...(dialogRef.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')||[])];
   if(!controls.length)return;
   const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',handleKeys);
  return()=>document.removeEventListener('keydown',handleKeys);
 },[selected?.id,editorial,cinema,threeD]);
 useEffect(()=>{
  if(!editorial)return;
  if(editorialScrollRef.current)editorialScrollRef.current.scrollTop=0;
  if(!inline&&!selectedId)roomTabsRef.current?.querySelector('[aria-current="true"]')
   ?.scrollIntoView({block:'nearest',inline:'nearest'});
 },[editorial,roomIndex,selectedId,inline]);
 const changeRoom=index=>{
  if(index===roomIndex&&!fourWall)return;
  if(fourWall&&focus.phase!=='idle')return;
  setViewpoint(fourWall?{type:'collection',collectionIndex:index}:null);
  queuedFocus.current=null;
  dispatchFocus({type:'RESET'});
  setActiveRoom(index);setSelectedId(null);setFullPosterId(null);
 };
 const openCollectionGuide=index=>{setActiveRoom(index);openInfo();};
 useEffect(()=>{
  if(!(cinema&&threeD)||focus.phase!=='idle'||!queuedFocus.current)return;
  const id=queuedFocus.current;
  queuedFocus.current=null;
  dispatchFocus({type:'SELECT',exhibitId:id,roomId:room?.id||'room-'+activeRoom});
 },[focus.phase,focus.generation,cinema,threeD,room?.id,activeRoom]);
 useEffect(()=>{
  if(!(cinema&&threeD)||focus.phase!=='focused')return undefined;
  const onKey=event=>{
   if(event.key==='Escape'){event.preventDefault();focusBack();}
   else if(event.key==='ArrowRight'){event.preventDefault();stepFocus(1);}
   else if(event.key==='ArrowLeft'){event.preventDefault();stepFocus(-1);}
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[cinema,threeD,focus.phase,focus.exhibitId,exhibits]);
 return <section ref={cinemaRef} className={'bml-scene '+(editorial?'bml-swiss-2d ':'bml-paper-2d ')+(!threeD?'is-2d ':'')+(embedded?'bml-scene-embedded ':'')+(compact?'bml-scene-compact ':'')+(cinema?'bml-museum-cinema ':'')+(swiss3D?'bml-swiss-3d ':'')+(fallbackFullscreen?'is-fallback-fullscreen':'')}
  data-testid="museum-visitor" data-museum-mode={inline?'inline':cinema?'cinema':'classic'}>
  {!compact&&!cinema?<header className="bml-scene-header">
   <div className="bml-scene-title">
    {onBack?<button type="button" className="bml-icon-btn" onClick={onBack} aria-label={tr('Quay lại','Back')}><ArrowLeft size={20}/></button>:null}
    <div><div className="bml-overline">{tr('TRIỂN LÃM TƯƠNG TÁC','INTERACTIVE EXHIBITION')}</div>
     <h2>{clean(gallery?.title,140)}</h2>
     <p>{clean(gallery?.summary,350)}</p></div>
   </div>
   <div className="bml-scene-switch" aria-label={tr('Chế độ xem','View mode')}>
    <button type="button" aria-pressed={!threeD} className={!threeD?'is-active':''} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
    <button type="button" aria-pressed={threeD} className={threeD?'is-active':''} onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
   </div>
  </header>:null}
  {cinema?<div className="bml-cinema-hud" data-testid="museum-cinema-hud">
   {swiss3D?<div className="bml-swiss-3d-masthead">
    <strong>{museumSchool}</strong><span>DISCOVERY MUSEUM</span>
   </div>:editorial&&!inline?<strong className="bml-editorial-masthead">{clean(gallery?.title,140)}</strong>:null}
   <div className="bml-cinema-mode-group" role="group" aria-label="Museum view mode">
    <button type="button" className={!threeD?'is-active':''} aria-pressed={!threeD}
     onClick={changeTo2D}><LayoutGrid size={17}/>2D</button>
    <button type="button" className={threeD?'is-active':''} aria-pressed={threeD}
     onClick={inline?open3D:changeTo3D}><Box size={17}/>3D</button>
   </div>
   <button type="button" ref={infoTriggerRef} aria-label="Museum information" aria-expanded={infoOpen}
    className="bml-cinema-hud-button" onClick={infoOpen?closeInfo:openInfo}><Info size={19}/></button>
   <button type="button" aria-label={isFullscreen||fallbackFullscreen?'Exit fullscreen':'Fullscreen'}
    className="bml-cinema-hud-button" onClick={toggleFullscreen}>
    {isFullscreen||fallbackFullscreen?<Minimize2 size={19}/>:<Maximize2 size={19}/>}
    {editorial?<span>{isFullscreen||fallbackFullscreen?tr('Thoát toàn màn hình','Exit fullscreen'):tr('Toàn màn hình','Fullscreen')}</span>:null}
   </button>
   {!inline?<button type="button" className="bml-cinema-close" aria-label="Close museum preview" onClick={leaveCinema}>
    <X size={19}/><span>Close</span></button>:null}
  </div>:null}
  {cinema&&infoOpen?<aside className="bml-cinema-info" data-testid="museum-cinema-info">
   <header><strong>{clean(swiss3D&&room?.title?room.title:gallery?.title,140)}</strong>
    <button type="button" ref={infoCloseRef} aria-label="Close information" onClick={closeInfo}><X size={16}/></button></header>
   <p>{clean(gallery?.summary,1000)||'Explore the museum and select artwork to learn more.'}</p>
   {swiss3D?<>{PEK_GALLERY_WALL_INSCRIPTIONS.map(({name,lines})=>
    <p key={name} className="bml-room-guide-motto" lang="vi">{lines.join(' ')}</p>)}
    {exhibits.length?<ul className="bml-room-guide-exhibits" aria-label={tr('Tác phẩm trong phòng','Room exhibits')}>
     {exhibits.slice(0,30).map((exhibit,i)=><li key={exhibit.id||i}>
      <button type="button" disabled={isFocus} onClick={()=>openExhibit(exhibit.id)}>
       <span>{numberLabel(i+1)}</span> {clean(exhibit.title,120)} <ArrowRight size={15} aria-hidden="true"/>
      </button>
     </li>)}
    </ul>:null}</>:null}
   <p>{editorial?tr('Mở một tác phẩm để xem ảnh gốc và trả lời câu đố.','Open an exhibit to view the original photo and answer its quiz.'):
    'WASD / arrow keys to move, drag to look, tap artwork to inspect.'}</p>
  </aside>:null}
  {rooms.length?<>
   {!swiss3D?<nav ref={roomTabsRef} className={'bml-room-tabs '+(cinema?'bml-cinema-room-tabs':'')} aria-label={tr('Các phòng trưng bày','Exhibition rooms')}
    hidden={cinema&&(rooms.length===1||editorial&&Boolean(selected))}>
    {rooms.map((r,i)=><button type="button" key={r.id||i} className={i===roomIndex?'is-active':''}
     aria-current={i===roomIndex?'true':undefined} onClick={()=>changeRoom(i)}>
      {String(i+1).padStart(2,'0')} · {r.title}</button>)}
   </nav>:null}
   {threeD?<div className={'bml-3d-stage '+(cinema?'bml-cinema-stage':'')}>
    {swiss3D?<aside className="bml-swiss-3d-index">
     <div className="bml-swiss-3d-room-title">
      <p>{clean(gallery?.title,90)}</p>
      <h2>{roomHeading}{roomSubtitle?<span>{roomSubtitle}</span>:null}</h2>
     </div>
     {exhibits.length?<ul className="bml-swiss-3d-exhibits" aria-label={tr('Tác phẩm','Exhibits')}>
      {exhibits.slice(0,30).map((exhibit,i)=><li key={exhibit.id||i}>
       <button type="button" disabled={isFocus} onClick={()=>openExhibit(exhibit.id)}
        aria-label={(language==='en'?'Inspect ':'Xem tác phẩm ')+clean(exhibit.title,120)}>
        <span>{numberLabel(i+1)}</span><span>{clean(exhibit.title,120)}</span>
       </button>
      </li>)}
     </ul>:null}
     {rooms.length>1?<nav className="bml-swiss-3d-rooms"
      aria-label={tr('Bộ sưu tập','Exhibition collections')}>
      {fourWall?<CollectionFloorPlan count={rooms.length} activeIndex={roomIndex} language={language}/>:null}
      <p>{tr('BỘ SƯU TẬP','COLLECTIONS')}</p>
      <div className="bml-swiss-3d-collection-grid">{rooms.map((item,i)=><button key={item.id||i} type="button" disabled={isFocus} onClick={()=>changeRoom(i)}
       className={i===roomIndex?'is-active':''} aria-current={i===roomIndex?'true':undefined}
       aria-label={numberLabel(i+1)+' · '+item.title} title={item.title}>{numberLabel(i+1)}</button>)}</div>
     </nav>:null}
    </aside>:null}
    {compact&&!cinema?<div className="bml-scene-mode-float" aria-label={tr('Chế độ xem','View mode')}>
     <button type="button" aria-pressed={!threeD} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
     <button type="button" aria-pressed={threeD} className="is-active" onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
    </div>:null}
    <Suspense fallback={<div className="bml-empty"><Box size={32}/>{tr('Đang dựng bảo tàng 3D…','Preparing 3D museum…')}</div>}>
     <GalleryCanvas key={fourWall?gallery.id??'four-wall-gallery':room.id} template={room.template_key} exhibits={exhibits}
      collections={fourWall?rooms:undefined} collectionIndex={roomIndex} onCollectionGuide={openCollectionGuide}
      selectedId={selectedId||''} focus={cinema?focus:FOCUS_IDLE}
      focusBoard={focusBoard} onFocusBack={focusBack} onFocusStep={stepFocus} focusIndex={Math.max(0,focusSelectedIndex)}
      onFocusPhaseChange={action=>dispatchFocus({...action,generation:focus.generation})}
      onSelect={openExhibit} quality="auto" language={language} schoolEdition cinemaEdition={cinema}
      editorial={swiss3D} roomNumber={numberLabel(roomIndex+1)} roomTitle={clean(room.title,140)} editorialViewpoint={viewpoint}
      onRoomGuide={swiss3D&&!isFocus?openInfo:undefined} roomGuideOpen={swiss3D&&infoOpen}
      roomGuideLabel={fourWall?tr('Giới thiệu bộ sưu tập ↗','Collection guide ↗'):tr('Giới thiệu phòng ↗','Room guide ↗')}/>
    </Suspense>
    {!swiss3D?<div className="bml-3d-plate">
     <small>{clean(gallery?.title,90)||'Our Climate Action Museum'}</small>
     <strong>{clean(room?.title,90)}</strong>
     {exhibits.length?<p>{exhibits.slice(0,3).map(item=>clean(item.title,48)).filter(Boolean).join(' · ')}</p>:null}
    </div>:null}
    {!cinema?<div className="bml-3d-caption"><Info size={15}/>{tr('Dùng WASD hoặc nút trên điện thoại để di chuyển. Chạm vào hiện vật để xem nội dung.','Use WASD or touch controls. Select any exhibit to read it.')}</div>:null}
   </div>:editorial?<div className="bml-editorial-viewport" ref={editorialScrollRef}>
    <div hidden={Boolean(selected)}>
     <MuseumEditorialRoom gallery={gallery} rooms={rooms} roomIndex={roomIndex} exhibits={exhibits}
      onRoomChange={changeRoom} onOpen={openExhibit} language={language}
      renderImage={(exhibit,index)=><ExhibitVisual exhibit={exhibit} index={index} language={language}/>}/>
    </div>
    {selected?<MuseumEditorialExhibit room={room} exhibit={selected} index={selectedIndex} count={exhibits.length}
     insight={insight} quiz={selectedQuiz} language={language} backRef={closeRef} onBack={closeExhibit}
     onStep={delta=>openExhibit(exhibits[selectedIndex+delta].id,false)} onZoom={openFullPoster}/>:null}
   </div>:<div className="bml-museum-room bml-paper-museum-room" data-testid="museum-paper-2d-room">
    {compact&&!cinema?<div className="bml-scene-mode-float" aria-label={tr('Chế độ xem','View mode')}>
     <button type="button" className="is-active" aria-pressed={!threeD} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
     <button type="button" aria-pressed={threeD} onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
    </div>:null}
    {!cinema?<div className="bml-room-mast">
     <div className="bml-floor-label"><Leaf size={16} aria-hidden="true"/>{tr('BẢO TÀNG SỐ','DIGITAL MUSEUM')}</div>
     <h3>{clean(room.title,140)}</h3>
     <p>{tr('Đọc nội dung triển lãm bằng tiếng Anh. Chuyển sang 3D để tham quan không gian.','Read the English exhibit labels or explore the immersive 3D view.')}</p>
    </div>:null}
    <div className="bml-art-grid bml-paper-art-grid" data-testid="museum-2d-exhibits">{exhibits.map((e,i)=>
     <div className="bml-paper-art-tile" key={e.id||i}>
      <button type="button" className={'bml-art-card bml-paper-art-card bml-paper-art-card--'+i%3}
       onClick={()=>openExhibit(e.id)}
       aria-label={tr('Khám phá hiện vật ','Explore exhibit ')+(i+1)+': '+clean(e.title,120)}>
       <ExhibitVisual exhibit={e} index={i} language={language}/>
       <div className="bml-art-body bml-paper-art-body">
        <small>{tr('HIỆN VẬT','EXHIBIT')} {String(i+1).padStart(2,'0')}</small>
        <strong>{clean(e.title,120)}</strong>
        <p>{clean(e.description,360)||tr('Chưa có thuyết minh.','No description yet.')}</p>
        <span className="bml-paper-art-explore">{tr('Khám phá','Explore')} <ArrowRight size={17}/></span>
       </div>
      </button>
      {e.image_url?<button type="button" className="bml-paper-poster-zoom"
        aria-label={tr('Xem toàn bộ poster: ','View full original poster: ')+clean(e.title,120)}
        onClick={()=>openFullPoster(e.id)}>
        <Maximize2 size={16}/>{tr('Xem toàn bộ poster','Full poster')}
       </button>:null}
     </div>)}</div>
    {!exhibits.length?<div className="bml-empty"><FileText size={28}/>{tr('Chưa có hiện vật trong phòng này.','No exhibits in this room.')}</div>:null}
   </div>}
   {!cinema?<footer className="bml-scene-footer">
    <span><MapPin size={16}/>{activeRoom+1}/{rooms.length} {tr('phòng','rooms')} · {exhibits.length} {tr('hiện vật','exhibits')}</span>
    <div><button type="button" disabled={roomIndex===0} onClick={()=>changeRoom(roomIndex-1)}><ChevronLeft size={18}/> {tr('Trước','Previous')}</button>
     <button type="button" disabled={roomIndex===rooms.length-1} onClick={()=>changeRoom(roomIndex+1)}>{tr('Phòng tiếp','Next room')} <ChevronRight size={18}/></button></div>
   </footer>:null}
   {cinema&&!editorial?<div className="bml-cinema-bottom-hud" data-testid="museum-cinema-bottom-hud">
    {swiss3D?<div className="bml-swiss-3d-viewpoints" role="group" aria-label={tr('Góc nhìn','Museum viewpoints')}>
     <button type="button" disabled={isFocus} onClick={()=>setViewpoint({type:'artwork',collectionIndex:roomIndex})}>
      {tr('Đến gần tranh','See the artwork')}</button>
     <button type="button" disabled={isFocus} onClick={()=>setViewpoint({type:'room',collectionIndex:roomIndex})}>
      {tr('Toàn cảnh','Full room view')}</button>
    </div>:null}
    <span className="bml-cinema-room-counter">{swiss3D?
     numberLabel(roomIndex+1)+' / '+numberLabel(rooms.length)+' '+(fourWall?tr('bộ sưu tập','collections'):tr('phòng','rooms')):
     (roomIndex+1)+'/'+rooms.length+' rooms · '+exhibits.length+' exhibits'}</span>
    {rooms.length>1?<div className="bml-cinema-room-controls">
     <button type="button" disabled={roomIndex===0||fourWall&&isFocus} onClick={()=>changeRoom(roomIndex-1)}
      aria-label={fourWall?tr('Bộ sưu tập trước','Previous collection'):'Previous room'}><ChevronLeft size={18}/></button>
     <button type="button" disabled={roomIndex===rooms.length-1||fourWall&&isFocus} onClick={()=>changeRoom(roomIndex+1)}
      aria-label={fourWall?tr('Bộ sưu tập tiếp theo','Next collection'):'Next room'}><ChevronRight size={18}/></button>
    </div>:null}
   </div>:null}
  </>:<div className="bml-empty">{tr('Triển lãm chưa có phòng.','No rooms available.')}</div>}
  {fullPoster?<div className="bml-modal-overlay bml-paper-poster-overlay" role="presentation"
   onMouseDown={event=>{if(event.target===event.currentTarget)closeFullPoster();}}>
    <section role="dialog" aria-modal="true" aria-label={tr('Poster gốc: ','Original poster: ')+clean(fullPoster.title,140)}
     className="bml-paper-poster-dialog" data-testid="museum-original-poster-dialog">
     <header>
      <div><small>{tr('ẢNH GỐC CỦA NHÓM HỌC SINH','ORIGINAL GROUP ARTWORK')}</small>
       <strong>{clean(fullPoster.title,150)}</strong></div>
      <button ref={posterCloseRef} type="button" className="bml-paper-poster-close"
       onClick={closeFullPoster} aria-label={tr('Đóng poster','Close poster')}>✕ {tr('Đóng','Close')}</button>
     </header>
     <div className="bml-paper-poster-full-image">
      <img src={fullPoster.image_url} alt={clean(fullPoster.alt_text||fullPoster.title,220)}
       referrerPolicy="no-referrer" decoding="async" data-testid="museum-original-poster"/>
     </div>
     <p>{tr('Toàn bộ poster được hiển thị đúng tỷ lệ, không cắt xén.',
       'The complete original poster is displayed without cropping or distortion.')}</p>
    </section>
   </div>:null}
  {cinema&&threeD&&isFocus&&focus.phase!=='focused'?<div className="bml-v5-focus-status" role="status" aria-live="polite"
   data-testid="museum-focus-status">
   {focus.phase==='focused'?focusBoard?.title+' is now displayed in the room.':
    focus.phase==='returning'?'Returning artwork to wall…':'Preparing exhibit in the room…'}
  </div>:null}
  {selected&&!(cinema&&threeD)&&!editorial?<div className="bml-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeExhibit();}} role="presentation">
    <section className="bml-modal bml-art-dialog bml-art-360-dialog" ref={dialogRef} role="dialog" aria-modal="true"
      aria-label={clean(selected.title,140)} data-testid="museum-artwork-inspector">
     <header><span className="bml-overline">{tr('THAM QUAN HIỆN VẬT 360°','360° EXHIBIT INSPECTION')}</span>
      <button type="button" className="bml-icon-btn" ref={closeRef} aria-label={tr('Đóng','Close')} onClick={closeExhibit}>✕</button></header>
     <h2>{clean(selected.title,160)}</h2>
     <Suspense fallback={<div className="bml-empty">{tr('Đang mở tác phẩm…','Loading exhibit…')}</div>}>
      <Exhibit360Viewer key={selected.id} exhibit={selected} language={language}/>
     </Suspense>
     <p className="bml-article-copy">{clean(insight?.message,2500)||tr('Chưa có thuyết minh.','No description yet.')}</p>
     {selectedQuiz?<MuseumPhotoQuiz key={selected.id} quiz={selectedQuiz} language={language}/>:null}
     <section className="bml-exhibit-lens" aria-label="Exhibit evidence and context" data-testid="museum-exhibit-evidence">
      <header><Info size={18}/><div><strong>{insight?.label||'Exhibit'} · Evidence & context</strong>
       <small>Explore the source, limitations and revision where recorded.</small></div></header>
      {insight?.source?<div className="bml-exhibit-lens-block">
       <b>Source named by the group</b><p>{clean(insight.source,1200)}</p>
       <small>Citation text is supplied by the creators; it is not independently verified by this app.</small></div>:null}
      {insight?.survey?<div className="bml-exhibit-lens-block">
       <MuseumSurveyChart survey={insight.survey} language={language}/>
       <small>{insight.survey.source==='paper'?tr('Nguồn · Phiếu giấy do giáo viên tổng hợp','Source · Teacher-entered paper tally')
        :tr('Nguồn · Phiếu trực tuyến của các nhóm','Source · Online group votes')}</small>
      </div>:null}
      {insight?.improvement?<div className="bml-exhibit-lens-block">
       <b>Change after peer testing</b><p>{clean(insight.improvement,1200)}</p></div>:null}
      {insight?.imageSource?<div className="bml-exhibit-lens-block"><b>Image attribution</b>
       <p>{clean(insight.imageSource,600)}</p>
       {insight.imageRights?<small>Usage rights: {clean(insight.imageRights,300)}</small>:null}</div>:null}
      {!insight?.source&&!insight?.survey&&!insight?.improvement&&!insight?.imageSource?
       <p className="bml-exhibit-lens-empty">No additional citation or revision is recorded for this exhibit.</p>:null}
     </section>
     {selected.kind==='model'?<p><Box size={17}/> {tr('Mô hình 3D được tuyển chọn.','Curated 3D object.')}</p>:null}
     <button type="button" className="bml-primary bml-art-360-finish" onClick={closeExhibit}>{tr('Đã hiểu','Got it')}</button>
    </section>
   </div>:null}
 </section>;
}
