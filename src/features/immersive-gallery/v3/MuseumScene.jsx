import React,{Suspense,lazy,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,ChevronLeft,ChevronRight,Eye,FileText,Info,LayoutGrid,MapPin,Maximize2,PanelRightClose,Image as ImageIcon,Leaf,Globe2} from 'lucide-react';
import '../gallery.css';
import {exhibitInsights,exhibitField} from './museumExhibitInsights.js';
import './museumExhibitLens.css';
import './museumPaper2D.css';
const GalleryCanvas=lazy(()=>import('../GalleryCanvasR3F.jsx'));
const Exhibit360Viewer=lazy(()=>import('./Exhibit360Viewer.jsx'));
const clean=(x,n=180)=>String(x??'').slice(0,n);
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
export function reviewMuseum(review,assets=[]){
 const byId=new Map(assets.filter(a=>a?.id&&a?.image_url).map(a=>[a.id,a]));
 const raw=review?.snapshot||{};
 return {
  id:'review-'+String(review?.id||'preview'),
  title:raw.title||'English Museum',
  summary:raw.summary||'Private review draft — not published',
  status:review?.state||'draft',
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
export default function MuseumScene({gallery,onBack,language='vi',embedded=false,compact=false,initial3D=false,onExhibitSelect}){
 const [activeRoom,setActiveRoom]=useState(0),[threeD,setThreeD]=useState(initial3D),[selectedId,setSelectedId]=useState(null);
 const [fullPosterId,setFullPosterId]=useState(null);
 const posterCloseRef=useRef(null),posterOpenerRef=useRef(null);
 const dialogRef=useRef(null),closeRef=useRef(null),openerRef=useRef(null);
 const rooms=gallery?.rooms||[];
 const room=rooms[Math.min(activeRoom,Math.max(0,rooms.length-1))];
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
 const tr=(vi,en)=>language==='en'?en:vi;
 const openExhibit=id=>{
  openerRef.current=document.activeElement;
  const index=exhibits.findIndex(e=>e.id===id);
  if(index>=0)onExhibitSelect?.({index,key:exhibitField(index,exhibits[index]?.title),title:exhibits[index]?.title});
  setSelectedId(id);
 };
 const closeExhibit=()=>{
  setSelectedId(null);
  Promise.resolve().then(()=>openerRef.current?.focus?.());
 };
 useEffect(()=>{
  if(!selected)return undefined;
  closeRef.current?.focus?.();
  const handleKeys=event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeExhibit();return;}
   if(event.key!=='Tab')return;
   const controls=[...(dialogRef.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')||[])];
   if(!controls.length)return;
   const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',handleKeys);
  return()=>document.removeEventListener('keydown',handleKeys);
 },[selected?.id]);
 const changeRoom=n=>{setActiveRoom(n);setSelectedId(null);setFullPosterId(null);};
 return <section className={'bml-scene bml-paper-2d '+(!threeD?'is-2d ':'')+(embedded?'bml-scene-embedded ':'')+(compact?'bml-scene-compact':'')} data-testid="museum-visitor">
  {!compact?<header className="bml-scene-header">
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
  {rooms.length?<>
   <nav className="bml-room-tabs" aria-label={tr('Các phòng trưng bày','Exhibition rooms')}>
    {rooms.map((r,i)=><button type="button" key={r.id||i} className={i===activeRoom?'is-active':''} onClick={()=>changeRoom(i)}>
      {String(i+1).padStart(2,'0')} · {r.title}</button>)}
   </nav>
   {threeD?<div className="bml-3d-stage">
    {compact?<div className="bml-scene-mode-float" aria-label={tr('Chế độ xem','View mode')}>
     <button type="button" aria-pressed={!threeD} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
     <button type="button" aria-pressed={threeD} className="is-active" onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
    </div>:null}
    <Suspense fallback={<div className="bml-empty"><Box size={32}/>{tr('Đang dựng bảo tàng 3D…','Preparing 3D museum…')}</div>}>
     <GalleryCanvas key={room.id} template={room.template_key} exhibits={exhibits} selectedId={selectedId||''}
      onSelect={openExhibit} quality="auto" language={language} schoolEdition/>
    </Suspense>
    <div className="bml-3d-caption"><Info size={15}/>{tr('Dùng WASD hoặc nút trên điện thoại để di chuyển. Chạm vào hiện vật để xem nội dung.','Use WASD or touch controls. Select any exhibit to read it.')}</div>
   </div>:<div className="bml-museum-room bml-paper-museum-room" data-testid="museum-paper-2d-room">
    {compact?<div className="bml-scene-mode-float" aria-label={tr('Chế độ xem','View mode')}>
     <button type="button" className="is-active" aria-pressed={!threeD} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
     <button type="button" aria-pressed={threeD} onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
    </div>:null}
    <div className="bml-room-mast">
     <div className="bml-floor-label"><Leaf size={16} aria-hidden="true"/>{tr('BẢO TÀNG SỐ','DIGITAL MUSEUM')}</div>
     <h3>{clean(room.title,140)}</h3>
     <p>{tr('Đọc nội dung triển lãm bằng tiếng Anh. Chuyển sang 3D để tham quan không gian.','Read the English exhibit labels or explore the immersive 3D view.')}</p>
    </div>
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
   <footer className="bml-scene-footer">
    <span><MapPin size={16}/>{activeRoom+1}/{rooms.length} {tr('phòng','rooms')} · {exhibits.length} {tr('hiện vật','exhibits')}</span>
    <div><button type="button" disabled={activeRoom===0} onClick={()=>changeRoom(activeRoom-1)}><ChevronLeft size={18}/> {tr('Trước','Previous')}</button>
     <button type="button" disabled={activeRoom===rooms.length-1} onClick={()=>changeRoom(activeRoom+1)}>{tr('Phòng tiếp','Next room')} <ChevronRight size={18}/></button></div>
   </footer>
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
  {selected?<div className="bml-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeExhibit();}} role="presentation">
    <section className="bml-modal bml-art-dialog bml-art-360-dialog" ref={dialogRef} role="dialog" aria-modal="true"
      aria-label={clean(selected.title,140)} data-testid="museum-artwork-inspector">
     <header><span className="bml-overline">{tr('THAM QUAN HIỆN VẬT 360°','360° EXHIBIT INSPECTION')}</span>
      <button type="button" className="bml-icon-btn" ref={closeRef} aria-label={tr('Đóng','Close')} onClick={closeExhibit}>✕</button></header>
     <h2>{clean(selected.title,160)}</h2>
     <Suspense fallback={<div className="bml-empty">{tr('Đang mở tác phẩm…','Loading exhibit…')}</div>}>
      <Exhibit360Viewer key={selected.id} exhibit={selected} language={language}/>
     </Suspense>
     <p className="bml-article-copy">{clean(insight?.message,2500)||tr('Chưa có thuyết minh.','No description yet.')}</p>
     <section className="bml-exhibit-lens" aria-label="Exhibit evidence and context" data-testid="museum-exhibit-evidence">
      <header><Info size={18}/><div><strong>{insight?.label||'Exhibit'} · Evidence & context</strong>
       <small>Explore the source, limitations and revision where recorded.</small></div></header>
      {insight?.source?<div className="bml-exhibit-lens-block">
       <b>Source named by the group</b><p>{clean(insight.source,1200)}</p>
       <small>Citation text is supplied by the creators; it is not independently verified by this app.</small></div>:null}
      {insight?.survey?<div className="bml-exhibit-lens-block">
       <b>Class group-priority survey · N={insight.survey.n} groups</b>
       <div className="bml-exhibit-survey">
        {insight.survey.options.map(option=><div key={option.label}>
         <span>{option.label}</span><strong>{option.count}/{insight.survey.n} ({option.percent}%)</strong></div>)}
       </div><small>Source: {insight.survey.source==='paper'?'teacher-entered paper tally':'online group votes'}. Group choices are not measurements of emissions or individual behaviour.</small>
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
