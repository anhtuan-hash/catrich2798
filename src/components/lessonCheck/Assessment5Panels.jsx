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

export function Assessment5Preview({activity,onClose,onTeach,onAddQueue,inQueue,isFavorite,onFavorite,canOpen,attributes,insight,queueReady=true}) {
 const panelRef=useModalKeyboard(onClose);
 if(!activity)return null;
 const status=canOpen ? 'Đã có quyền truy cập' : 'Chưa được cấp quyền';
 return <div className="lcs5-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <aside ref={panelRef} className="lcs5-preview" role="dialog" aria-modal="true" aria-label={'Xem nhanh '+activity.title}>
     <header><div><small>XEM NHANH · HOẠT ĐỘNG</small><h2>{activity.title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng xem nhanh"><X size={20}/></button></header>
     {activity.thumbnailUrl?<img className="lcs5-preview-image" src={activity.thumbnailUrl} alt="" loading="lazy"/>:<div className="lcs5-preview-placeholder"><Layers3 size={38}/><span>Chưa có ảnh xem trước</span></div>}
     <div className="lcs5-preview-info">
       <span>Global Success {activity.grade||'—'}</span>
       <span>Unit {activity.unitNo||'—'}</span>
       <span>{activity.lessonTitle||'Hoạt động bổ sung'}</span>
       <span>{attributes?.difficulty||'Chưa phân loại CEFR'}</span>
       <span>{attributes?.duration_minutes?attributes.duration_minutes+' phút':'Thời lượng chưa gắn'}</span>
       <span>{attributes?.delivery_mode==='group'?'Nhóm':attributes?.delivery_mode==='individual'?'Cá nhân':'Cả lớp / kết hợp'}</span>
     </div>
     {attributes?.learning_goal?<section className="lcs5-preview-goal"><strong>Mục tiêu học tập</strong><p>{attributes.learning_goal}</p></section>:null}
     <div className="lcs5-preview-status"><ShieldCheck size={17}/>{status}</div>
     {insight?<div className="lcs5-preview-insights"><strong>Dữ liệu sử dụng thực tế</strong><div><span>Đã mở: {insight.opened}</span><span>Đã hoàn tất: {insight.completed}</span><span>Lần gần nhất: {insight.latest||'—'}</span></div></div>:null}
     <div className="lcs5-preview-actions">
       <button onClick={()=>onFavorite(activity.id)}><Heart size={17} fill={isFavorite?'currentColor':'none'}/>{isFavorite?'Bỏ yêu thích':'Thả tim'}</button>
       <button type="button" disabled={!canOpen||inQueue||!queueReady} onClick={()=>onAddQueue(activity.id)}><Plus size={17}/>{inQueue?'Đã trong buổi dạy':'Thêm vào buổi dạy'}</button>
       <button type="button" className="is-primary" disabled={!canOpen} onClick={()=>onTeach(activity)}><MonitorPlay size={17}/>Trình chiếu</button>
     </div>
   </aside>
 </div>;
}

export function Assessment5Queue({items=[],onClose,onMove,onRemove,onStart,className,onClassChange,minutes,onMinutesChange,onClear,busy=false,ready=true}) {
 const [dragIndex,setDragIndex]=useState(null);
 const panelRef=useModalKeyboard(onClose);
 return <div className="lcs5-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <aside ref={panelRef} className="lcs5-queue-drawer" role="dialog" aria-modal="true" aria-label="Hàng đợi giảng dạy">
     <header><div><small>TEACHING QUEUE · ASSESSMENT 5.0</small><h2>Chuẩn bị buổi dạy</h2><p>Kéo thả hoặc dùng mũi tên để sắp xếp hoạt động</p></div><button onClick={onClose} aria-label="Đóng hàng đợi"><X/></button></header>
     <div className="lcs5-queue-config">
       <label>Lớp học<input placeholder="VD: 12.6" maxLength={80} value={className} onChange={e=>onClassChange(e.target.value)}/></label>
       <label>Phút / hoạt động<input type="number" min={1} max={60} value={minutes} onChange={e=>onMinutesChange(e.target.value)}/></label>
     </div>
     <div className="lcs5-queue-count" role="status" aria-live="polite">
       {busy?'Đang đồng bộ hàng đợi…':!ready?'Đang tải buổi dạy…':`${items.length}/20 hoạt động · Đã đồng bộ`}
     </div>
     <div className="lcs5-queue-items">
       {items.map((item,i)=><div key={item.id} className="lcs5-queue-item" draggable
         onDragStart={()=>setDragIndex(i)}
         onDragOver={e=>e.preventDefault()}
         onDrop={e=>{e.preventDefault();if(dragIndex!==null&&dragIndex!==i)onMove(dragIndex,i);setDragIndex(null);}}
         onDragEnd={()=>setDragIndex(null)}>
         <span className="lcs5-queue-seq">{i+1}</span>
         <div><strong>{item.title}</strong><small>Unit {item.unitNo||'—'} · {item.focusArea||'mixed'}</small></div>
         <div className="lcs5-queue-move"><button disabled={busy||!ready||i===0} onClick={()=>onMove(i,i-1)} aria-label={'Đưa '+item.title+' lên'}><ArrowUp size={15}/></button><button disabled={busy||!ready||i===items.length-1} onClick={()=>onMove(i,i+1)} aria-label={'Đưa '+item.title+' xuống'}><ArrowDown size={15}/></button><button disabled={busy||!ready} onClick={()=>onRemove(item.id)} aria-label={'Xóa '+item.title+' khỏi buổi dạy'}><Trash2 size={15}/></button></div>
       </div>)}
       {!items.length?<div className="lcs5-queue-empty">Chưa có hoạt động. Nhấn dấu <b>+</b> trên thẻ trò chơi để thêm vào buổi dạy.</div>:null}
     </div>
     <footer><button onClick={onClear} disabled={!items.length||busy||!ready}>Xóa hàng đợi</button><button className="is-primary" disabled={!items.length||busy||!ready} onClick={onStart}><Play size={17}/> Bắt đầu trình chiếu</button></footer>
   </aside>
 </div>;
}
