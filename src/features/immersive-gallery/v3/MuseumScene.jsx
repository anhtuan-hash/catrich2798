import React,{Suspense,lazy,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,ChevronLeft,ChevronRight,Eye,FileText,Info,LayoutGrid,MapPin,Maximize2,PanelRightClose} from 'lucide-react';
import '../gallery.css';
const GalleryCanvas=lazy(()=>import('../GalleryCanvasR3F.jsx'));
const Exhibit360Viewer=lazy(()=>import('./Exhibit360Viewer.jsx'));
const clean=(x,n=180)=>String(x??'').slice(0,n);
export function reviewMuseum(review){
 const raw=review?.snapshot||{};
 return {
  id:'review-'+String(review?.id||'preview'),
  title:raw.title||'Triển lãm tiếng Anh',
  summary:raw.summary||'Bản duyệt nội bộ — chưa xuất bản',
  status:review?.state||'draft',
  rooms:(raw.rooms||[]).map((r,i)=>({
   id:'review-room-'+i,title:r.title||'Room '+(i+1),
   template_key:r.template_key||'classic',
   exhibits:(r.exhibits||[]).map((e,j)=>({...e,id:'review-exhibit-'+i+'-'+j,status:'published'}))
  }))
 };
}
export default function MuseumScene({gallery,onBack,language='vi',embedded=false,compact=false,initial3D=false}){
 const [activeRoom,setActiveRoom]=useState(0),[threeD,setThreeD]=useState(initial3D),[selectedId,setSelectedId]=useState(null);
 const dialogRef=useRef(null),closeRef=useRef(null),openerRef=useRef(null);
 const rooms=gallery?.rooms||[];
 const room=rooms[Math.min(activeRoom,Math.max(0,rooms.length-1))];
 const exhibits=useMemo(()=>room?.exhibits||[],[room]);
 const selected=exhibits.find(e=>e.id===selectedId);
 const tr=(vi,en)=>language==='en'?en:vi;
 const openExhibit=id=>{openerRef.current=document.activeElement;setSelectedId(id);};
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
 const changeRoom=n=>{setActiveRoom(n);setSelectedId(null);};
 return <section className={'bml-scene '+(embedded?'bml-scene-embedded ':'')+(compact?'bml-scene-compact':'')} data-testid="museum-visitor">
  {!compact?<header className="bml-scene-header">
   <div className="bml-scene-title">
    {onBack?<button type="button" className="bml-icon-btn" onClick={onBack} aria-label={tr('Quay lại','Back')}><ArrowLeft size={20}/></button>:null}
    <div><div className="bml-overline">{tr('TRIỂN LÃM TƯƠNG TÁC','INTERACTIVE EXHIBITION')}</div>
     <h2>{clean(gallery?.title,140)}</h2>
     <p>{clean(gallery?.summary,350)}</p></div>
   </div>
   <div className="bml-scene-switch" aria-label={tr('Chế độ xem','View mode')}>
    <button type="button" className={!threeD?'is-active':''} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
    <button type="button" className={threeD?'is-active':''} onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
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
   </div>:<div className="bml-museum-room">
    {compact?<div className="bml-scene-mode-float" aria-label={tr('Chế độ xem','View mode')}>
     <button type="button" className="is-active" aria-pressed={!threeD} onClick={()=>setThreeD(false)}><LayoutGrid size={16}/> 2D</button>
     <button type="button" aria-pressed={threeD} onClick={()=>setThreeD(true)}><Box size={16}/> 3D</button>
    </div>:null}
    <div className="bml-room-mast"><div className="bml-floor-label">{tr('BẢO TÀNG SỐ','DIGITAL MUSEUM')}</div><h3>{clean(room.title,140)}</h3>
     <p>{tr('Đọc nội dung triển lãm bằng tiếng Anh. Chuyển sang 3D để tham quan không gian.','Read the English exhibit labels or explore the immersive 3D view.')}</p></div>
    <div className="bml-art-grid">{exhibits.map((e,i)=><button type="button" className="bml-art-card" key={e.id||i} onClick={()=>openExhibit(e.id)}>
     <div className={'bml-art-graphic bml-art-'+(i%3)} aria-hidden="true">
      {e.kind==='image'&&e.image_url?<img src={e.image_url} alt={e.alt_text||e.title||'Artwork'} style={{width:'100%',height:'100%',objectFit:'contain'}} loading="lazy" referrerPolicy="no-referrer"/>:
       e.kind==='model'?<Box size={47} strokeWidth={1.25}/>:i%3===0?<div className="bml-planet-art">🌍</div>:i%3===1?<div className="bml-bars-art"><i/><i/><i/><i/></div>:<div className="bml-sun-art">☀</div>}
     </div><div className="bml-art-body"><small>{tr('HIỆN VẬT','EXHIBIT')} {String(i+1).padStart(2,'0')}</small><strong>{clean(e.title,120)}</strong>
     <p>{clean(e.description,165)||tr('Chưa có thuyết minh.','No description yet.')}</p><span>{tr('Khám phá','Explore')} <ArrowRight size={15}/></span></div>
    </button>)}</div>
    {!exhibits.length?<div className="bml-empty"><FileText size={28}/>{tr('Chưa có hiện vật trong phòng này.','No exhibits in this room.')}</div>:null}
   </div>}
   <footer className="bml-scene-footer">
    <span><MapPin size={16}/>{activeRoom+1}/{rooms.length} {tr('phòng','rooms')} · {exhibits.length} {tr('hiện vật','exhibits')}</span>
    <div><button type="button" disabled={activeRoom===0} onClick={()=>changeRoom(activeRoom-1)}><ChevronLeft size={18}/> {tr('Trước','Previous')}</button>
     <button type="button" disabled={activeRoom===rooms.length-1} onClick={()=>changeRoom(activeRoom+1)}>{tr('Phòng tiếp','Next room')} <ChevronRight size={18}/></button></div>
   </footer>
  </>:<div className="bml-empty">{tr('Triển lãm chưa có phòng.','No rooms available.')}</div>}
  {selected?<div className="bml-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeExhibit();}} role="presentation">
    <section className="bml-modal bml-art-dialog bml-art-360-dialog" ref={dialogRef} role="dialog" aria-modal="true"
      aria-label={clean(selected.title,140)} data-testid="museum-artwork-inspector">
     <header><span className="bml-overline">{tr('THAM QUAN HIỆN VẬT 360°','360° EXHIBIT INSPECTION')}</span>
      <button type="button" className="bml-icon-btn" ref={closeRef} aria-label={tr('Đóng','Close')} onClick={closeExhibit}>✕</button></header>
     <h2>{clean(selected.title,160)}</h2>
     <Suspense fallback={<div className="bml-empty">{tr('Đang mở tác phẩm…','Loading exhibit…')}</div>}>
      <Exhibit360Viewer key={selected.id} exhibit={selected} language={language}/>
     </Suspense>
     <p className="bml-article-copy">{clean(selected.description,2500)||tr('Chưa có thuyết minh.','No description yet.')}</p>
     {selected.kind==='model'?<p><Box size={17}/> {tr('Mô hình 3D được tuyển chọn.','Curated 3D object.')}</p>:null}
     <button type="button" className="bml-primary bml-art-360-finish" onClick={closeExhibit}>{tr('Đã hiểu','Got it')}</button>
    </section>
   </div>:null}
 </section>;
}
