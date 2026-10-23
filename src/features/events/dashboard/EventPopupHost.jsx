import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, CalendarDays, Clock3, Copy, ExternalLink, Eye, Image as ImageIcon, MapPin, Monitor, X, Check, BellOff } from 'lucide-react';
import { eligibleEvents, getEventPosterUrl, shouldAutoShow, recordEventInteraction } from '../services/eventService.js';
import './EventPopup.css';

const order={urgent:3,important:2,normal:1};
const niceDate=(value)=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'full',timeStyle:'short'}).format(new Date(value));
export default function EventPopupHost({currentUser}) {
  const [event,setEvent]=useState(null);
  const [posterUrl,setPosterUrl]=useState('');
  const [detailed,setDetailed]=useState(false);
  const [actionError,setActionError]=useState('');
  const [loadingAction,setLoadingAction]=useState(false);
  const [posterExpanded,setPosterExpanded]=useState(false);
  const shownRef=useRef('');
  const closeButtonRef=useRef(null);
  const openerRef=useRef(null);
  const userId=currentUser?.id;
  useEffect(()=>{
    if(!userId)return undefined;
    let active=true;
    async function load(){
      try {
        const items=(await eligibleEvents(userId)).filter(x=>shouldAutoShow(x));
        items.sort((a,b)=>(order[b.priority]||1)-(order[a.priority]||1) || new Date(a.event_start_at)-new Date(b.event_start_at));
        if(!active||!items.length)return;
        // Only one unsolicited dialog per dashboard visit. Other events remain
        // available for a future inbox, not as a forced stack of modals.
        setEvent(items[0]);
      }catch(error){if(active)console.warn('Event announcement unavailable:',error?.message||error);}
    }
    load();
    return ()=>{active=false;};
  },[userId]);

  useEffect(()=>{
    if(!event||!userId)return undefined;
    const key=event.id+'@'+event.version;
    if(shownRef.current===key)return undefined;
    shownRef.current=key;
    let disposed=false;
    openerRef.current=document.activeElement;
    const originalOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const handleEscape=(e)=>{
      if(e.key==='Escape' && !posterExpanded) {e.preventDefault();dismiss('dismiss');}
    };
    document.addEventListener('keydown',handleEscape);
    window.requestAnimationFrame(()=>closeButtonRef.current?.focus());
    // Rendering the modal is the impression event; never mark a fetched event
    // as seen merely because it was eligible.
    recordEventInteraction(event,userId,'shown').then(receipt=>{if(!disposed)setEvent(x=>x?.id===event.id?{...x,receipt}:x);})
      .catch(error=>{if(!disposed)setActionError('Không đồng bộ được trạng thái xem. Có thể thử lại sau.');console.warn(error?.message||error);});
    return ()=>{
      disposed=true;document.body.style.overflow=originalOverflow;
      document.removeEventListener('keydown',handleEscape);
      openerRef.current?.focus?.();
    };
  // Deliberately keyed only by event identity, not changing receipt payload.
  },[event?.id,event?.version,userId,posterExpanded]);

  useEffect(()=>{
    if(!event?.poster_path)return undefined;
    let live=true;
    getEventPosterUrl(event.poster_path).then(url=>{if(live)setPosterUrl(url);}).catch(()=>{if(live)setPosterUrl('');});
    return ()=>{live=false;};
  },[event?.poster_path]);

  async function dismiss(action){
    if(!event||loadingAction)return;
    setLoadingAction(true);setActionError('');
    try{await recordEventInteraction(event,userId,action);setEvent(null);}
    catch(e){setActionError('Không thể ghi nhận lựa chọn: '+e.message);}
    finally{setLoadingAction(false);}
  }
  async function openDetails(){
    if(!event)return;
    setDetailed(true);
    try{const receipt=await recordEventInteraction(event,userId,'detail');setEvent(x=>x?{...x,receipt}:null);}
    catch(e){setActionError('Không thể đồng bộ trạng thái xem chi tiết.');}
  }
  async function copyCode(){
    try{await navigator.clipboard.writeText(event.meeting_code); }
    catch(e){setActionError('Không thể sao chép mã phòng.');}
  }
  if(!event||!userId)return null;
  return createPortal(<div className="be-pop-overlay" role="presentation">
    <div className="be-pop-scrim" aria-hidden="true"/>
    <section className="be-pop-dialog" role="dialog" aria-modal="true" aria-labelledby="be-pop-title" aria-describedby="be-pop-intro">
      <header className="be-pop-header">
        <div className="be-pop-header-id"><span className="be-pop-bell"><BellRing size={22}/></span><div>
          <span className="be-pop-eyebrow">BRIAN ENGLISH · THÔNG BÁO DÀNH CHO GIÁO VIÊN</span>
          <h2 id="be-pop-title">Thông báo sự kiện</h2>
          <p id="be-pop-intro">Thông tin mới được gửi đến bạn từ Ban tổ chức.</p>
        </div></div>
        <button type="button" className="be-pop-close" ref={closeButtonRef} aria-label="Đóng thông báo"
          disabled={loadingAction} onClick={()=>dismiss('dismiss')}><X size={20}/></button>
      </header>
      <div className="be-pop-body">
        <div className="be-pop-poster">{posterUrl?
          <button type="button" aria-label="Phóng to poster sự kiện" onClick={()=>setPosterExpanded(true)}><img src={posterUrl} alt={'Poster: '+event.title}/><span><Eye size={15}/> Xem poster</span></button>:
          <div className="be-pop-placeholder"><ImageIcon size={42}/><p>Thông báo sự kiện</p><small>{event.organizer}</small></div>}
        </div>
        <div className="be-pop-content">
          <div className="be-pop-tags"><span className={'be-pop-priority is-'+event.priority}>{event.priority==='urgent'?'Khẩn':event.priority==='important'?'Sắp diễn ra':'Sự kiện'}</span><span>{event.school_year}</span></div>
          <h3>{event.title}</h3>
          <p className="be-pop-summary">{event.summary}</p>
          <div className="be-pop-info">
            <div><CalendarDays size={18}/><span><small>Thời gian</small><strong>{niceDate(event.event_start_at)}</strong><small>Đến {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(new Date(event.event_end_at))}</small></span></div>
            <div><Monitor size={18}/><span><small>Hình thức</small><strong>{event.venue_type==='online'?'Trực tuyến':event.venue_type==='offline'?'Trực tiếp':'Kết hợp'}</strong>{event.venue_name&&<small>{event.venue_name}</small>}</span></div>
            {event.meeting_code&&<div><Copy size={18}/><span><small>Mã phòng họp</small><strong>{event.meeting_code}</strong></span><button type="button" aria-label="Sao chép mã họp" onClick={copyCode}><Copy size={14}/></button></div>}
            <div><MapPin size={18}/><span><small>Đơn vị tổ chức</small><strong>{event.organizer}</strong></span></div>
          </div>
          {detailed&&<div className="be-pop-description"><h4>Nội dung chi tiết</h4><p>{event.description||'Vui lòng xem poster và thông tin sự kiện.'}</p>{event.meeting_url&&/^https:\/\//i.test(event.meeting_url)&&<a href={event.meeting_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Tham gia Google Meet</a>}</div>}
          {actionError&&<p className="be-pop-error" role="alert">{actionError}</p>}
        </div>
      </div>
      <footer className="be-pop-footer">
        <div className="be-pop-dismiss-actions">
          <button type="button" disabled={loadingAction} onClick={()=>dismiss('today')}><BellOff size={15}/> Không hiện hôm nay</button>
          <button type="button" disabled={loadingAction} onClick={()=>dismiss('snooze')}><Clock3 size={15}/> Nhắc lại sau</button>
        </div>
        <div className="be-pop-action-buttons">
          {detailed&&<button type="button" className="be-pop-ack" disabled={loadingAction} onClick={()=>dismiss('acknowledge')}><Check size={16}/> Đã xem</button>}
          <button type="button" className="be-pop-primary" onClick={openDetails} disabled={loadingAction||detailed}><Eye size={16}/>{detailed?'Đang xem chi tiết':'Xem chi tiết'}</button>
        </div>
      </footer>
    </section>
    {posterExpanded&&<div className="be-pop-lightbox" role="dialog" aria-modal="true" aria-label="Poster phóng to"><button type="button" aria-label="Đóng hình ảnh" onClick={()=>setPosterExpanded(false)}><X size={22}/></button><img src={posterUrl} alt={'Poster '+event.title}/></div>}
  </div>,document.body);
}
