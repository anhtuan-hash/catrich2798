import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Clock3, ExternalLink, Heart, Layers3, LockKeyhole, MonitorPlay, Play, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

// Real dialogs support Escape, trapped Tab focus and focus restoration on close.
function useModalKeyboard(onClose) {
 const panelRef = useRef(null);
 const closeRef = useRef(onClose);
 closeRef.current = onClose;
 useEffect(() => {
  const before = document.activeElement;
  const panel = panelRef.current;
  const selector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
  panel?.querySelector(selector)?.focus();
  const onKeyDown = event => {
   if (event.key === 'Escape') {
    event.preventDefault();
    closeRef.current?.();
   } else if (event.key === 'Tab' && panel) {
    const controls = [...panel.querySelectorAll(selector)].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0],last = controls[controls.length-1];
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
     event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
     event.preventDefault(); first.focus();
    }
   }
  };
  document.addEventListener('keydown', onKeyDown);
  return () => {
   document.removeEventListener('keydown', onKeyDown);
   if (before?.isConnected) before.focus?.();
  };
 }, []);
 return panelRef;
}

export function Assessment5Preview({activity,onClose,onTeach,onAddQueue,inQueue,isFavorite,onFavorite,canOpen,attributes,insight,queueReady=true,language='vi'}) {
  const vi=language==='vi';
  const tt=(a,b)=>vi?a:b;
 const panelRef=useModalKeyboard(onClose);
 if(!activity)return null;
 const status=canOpen ? tt('Đã có quyền truy cập','Access granted') : tt('Chưa được cấp quyền','Access not granted');
 return <div className="lcs5-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <aside ref={panelRef} className="lcs5-preview" role="dialog" aria-modal="true" aria-label={tt('Xem nhanh ','Preview ')+activity.title}>
     <header><div><small>{tt('XEM NHANH · HOẠT ĐỘNG','QUICK VIEW · ACTIVITY')}</small><h2>{activity.title}</h2></div><button type="button" onClick={onClose} aria-label={tt("Đóng xem nhanh","Close quick view")}><X size={20}/></button></header>
     {activity.thumbnailUrl?<img className="lcs5-preview-image" src={activity.thumbnailUrl} alt="" loading="lazy"/>:<div className="lcs5-preview-placeholder"><Layers3 size={38}/><span>{tt('Chưa có ảnh xem trước','No preview image')}</span></div>}
     <div className="lcs5-preview-info">
       <span>Global Success {activity.grade||'—'}</span>
       <span>Unit {activity.unitNo||'—'}</span>
       <span>{activity.lessonTitle||tt('Hoạt động bổ sung','Supplementary activity')}</span>
       <span>{attributes?.difficulty||tt('Chưa phân loại CEFR','CEFR level not assigned')}</span>
       <span>{attributes?.duration_minutes?attributes.duration_minutes+tt(' phút',' min'):tt('Thời lượng chưa gắn','Duration not assigned')}</span>
       <span>{attributes?.delivery_mode==='group'?tt('Nhóm','Group'):attributes?.delivery_mode==='individual'?tt('Cá nhân','Individual'):tt('Cả lớp / kết hợp','Whole class / mixed')}</span>
     </div>
     {attributes?.learning_goal?<section className="lcs5-preview-goal"><strong>{tt('Mục tiêu học tập','Learning objectives')}</strong><p>{attributes.learning_goal}</p></section>:null}
     <div className="lcs5-preview-status"><ShieldCheck size={17}/>{status}</div>
     {insight?<div className="lcs5-preview-insights"><strong>{tt('Dữ liệu sử dụng thực tế','Actual usage data')}</strong><div><span>{tt('Đã mở:','Opened:')} {insight.opened}</span><span>{tt('Đã hoàn tất:','Completed:')} {insight.completed}</span><span>{tt('Lần gần nhất:','Last used:')} {insight.latest||'—'}</span></div></div>:null}
     <div className="lcs5-preview-actions">
       <button onClick={()=>onFavorite(activity.id)}><Heart size={17} fill={isFavorite?'currentColor':'none'}/>{isFavorite?tt('Bỏ yêu thích','Remove favorite'):tt('Thả tim','Add to favorites')}</button>
       <button type="button" disabled={!canOpen||inQueue||!queueReady} onClick={()=>onAddQueue(activity.id)}><Plus size={17}/>{inQueue?tt('Đã trong buổi dạy','Already in queue'):tt('Thêm vào buổi dạy','Add to teaching queue')}</button>
       <button type="button" className="is-primary" disabled={!canOpen} onClick={()=>onTeach(activity)}><MonitorPlay size={17}/>{tt('Trình chiếu','Present')}</button>
     </div>
   </aside>
 </div>;
}

export function Assessment5Queue({items=[],onClose,onMove,onRemove,onStart,className,onClassChange,minutes,onMinutesChange,onClear,busy=false,ready=true,language='vi'}) {
  const vi=language==='vi';
  const tt=(a,b)=>vi?a:b;
 const [dragIndex,setDragIndex]=useState(null);
 const panelRef=useModalKeyboard(onClose);
 return <div className="lcs5-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <aside ref={panelRef} className="lcs5-queue-drawer" role="dialog" aria-modal="true" aria-label={tt('Hàng đợi giảng dạy','Teaching queue')}>
     <header><div><small>TEACHING QUEUE · ASSESSMENT 5.0</small><h2>{tt('Chuẩn bị buổi dạy','Prepare teaching session')}</h2><p>{tt('Kéo thả hoặc dùng mũi tên để sắp xếp hoạt động','Drag and drop or use arrows to rearrange activities')}</p></div><button onClick={onClose} aria-label={tt('Đóng hàng đợi','Close queue')}><X/></button></header>
     <div className="lcs5-queue-config">
       <label>{tt('Lớp học','Class')}<input placeholder={tt('VD: 12.6','e.g. 12.6')} maxLength={80} value={className} onChange={e=>onClassChange(e.target.value)}/></label>
       <label>{tt('Phút / hoạt động','Minutes per activity')}<input type="number" min={1} max={60} value={minutes} onChange={e=>onMinutesChange(e.target.value)}/></label>
     </div>
     <div className="lcs5-queue-count" role="status" aria-live="polite">
       {busy?tt('Đang đồng bộ hàng đợi…','Syncing teaching queue…'):!ready?tt('Đang tải buổi dạy…','Loading teaching session…'):`${items.length}/20 ${tt('hoạt động · Đã đồng bộ','activities · Synced')}`}
     </div>
     <div className="lcs5-queue-items">
       {items.map((item,i)=><div key={item.id} className="lcs5-queue-item" draggable
         onDragStart={()=>setDragIndex(i)}
         onDragOver={e=>e.preventDefault()}
         onDrop={e=>{e.preventDefault();if(dragIndex!==null&&dragIndex!==i)onMove(dragIndex,i);setDragIndex(null);}}
         onDragEnd={()=>setDragIndex(null)}>
         <span className="lcs5-queue-seq">{i+1}</span>
         <div><strong>{item.title}</strong><small>Unit {item.unitNo||'—'} · {item.focusArea||'mixed'}</small></div>
         <div className="lcs5-queue-move"><button disabled={busy||!ready||i===0} onClick={()=>onMove(i,i-1)} aria-label={tt('Đưa ','Move ')+item.title+tt(' lên',' up')}><ArrowUp size={15}/></button><button disabled={busy||!ready||i===items.length-1} onClick={()=>onMove(i,i+1)} aria-label={tt('Đưa ','Move ')+item.title+tt(' xuống',' down')}><ArrowDown size={15}/></button><button disabled={busy||!ready} onClick={()=>onRemove(item.id)} aria-label={tt('Xóa ','Remove ')+item.title+tt(' khỏi buổi dạy',' from teaching queue')}><Trash2 size={15}/></button></div>
       </div>)}
       {!items.length?<div className="lcs5-queue-empty">{tt('Chưa có hoạt động. Nhấn dấu','No activities yet. Tap the')} <b>+</b> {tt('trên thẻ trò chơi để thêm vào buổi dạy.','on an activity card to add it to the queue.')}</div>:null}
     </div>
     <footer><button onClick={onClear} disabled={!items.length||busy||!ready}>{tt('Xóa hàng đợi','Clear queue')}</button><button className="is-primary" disabled={!items.length||busy||!ready} onClick={onStart}><Play size={17}/> {tt('Bắt đầu trình chiếu','Start presentation')}</button></footer>
   </aside>
 </div>;
}
