import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, CalendarDays, Clock3, Copy, ExternalLink, Eye, Image as ImageIcon, MapPin, Monitor, X, Check, BellOff, GraduationCap, ArrowRight, Sparkles, Video, Info } from 'lucide-react';
import { eligibleEvents, getEventPosterUrl, shouldAutoShow, recordEventInteraction } from '../services/eventService.js';
import { supabase } from '../../../utils/supabase.js';
import { getAuthSessionIdentity, eventLoginStorageKey, eventLoginSessionMarker, canAutoShowEvent } from '../utils/eventLoginSession.mjs';
import EventPosterViewer from './EventPosterViewer.jsx';
import './EventPopup.css';

const order={urgent:3,important:2,normal:1};
const niceDate=(value)=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'full',timeStyle:'short'}).format(new Date(value));
export default function EventPopupHost({currentUser}) {
  const [event,setEvent]=useState(null);
  const [inboxEvents,setInboxEvents]=useState([]);
  const [inboxOpen,setInboxOpen]=useState(false);
  const [posterUrl,setPosterUrl]=useState('');
  const [detailed,setDetailed]=useState(false);
  const [actionError,setActionError]=useState('');
  const [loadingAction,setLoadingAction]=useState(false);
  const [posterExpanded,setPosterExpanded]=useState(false);
  const shownRef=useRef('');
  const authSessionIdentityRef=useRef(null);
  const closeButtonRef=useRef(null);
  const openerRef=useRef(null);
  const posterExpandedRef=useRef(false);
  useEffect(()=>{posterExpandedRef.current=posterExpanded;},[posterExpanded]);
  const userId=currentUser?.id;
  useEffect(()=>{
    if(!userId)return undefined;
    let active=true;
    async function load(){
      try {
        const [items,sessionResult]=await Promise.all([eligibleEvents(userId),supabase.auth.getSession()]);
        if(!active)return;
        items.sort((a,b)=>(order[b.priority]||1)-(order[a.priority]||1) || new Date(a.event_start_at)-new Date(b.event_start_at));
        const session=sessionResult?.data?.session;
        const sessionIdentity=session?.user?.id===userId?getAuthSessionIdentity(session):null;
        authSessionIdentityRef.current=sessionIdentity;
        setInboxEvents(items);
        const automatic=items.find(item=>{
          if(item.frequency!=='per_login')return shouldAutoShow(item);
          let storedMarker='';
          try{storedMarker=window.localStorage.getItem(eventLoginStorageKey(item))||'';}
          catch{/* private browsing: best effort with in-memory marker */}
          return canAutoShowEvent(item,userId,sessionIdentity,storedMarker);
        });
        // At most one unsolicited popup per login; browsing within a session
        // (Dashboard revisit, refresh, tab focus) must not reopen it.
        if(automatic)setEvent(automatic);
      }catch(error){if(active)console.warn('Event announcement unavailable:',error?.message||error);}
    }
    load();
    return ()=>{active=false;};
  },[userId]);

  useEffect(()=>{
    if(!event||!userId)return undefined;
    const key=event.id+'@'+event.version;
    const firstImpression=shownRef.current!==key;
    shownRef.current=key;
    let disposed=false;
    openerRef.current=document.activeElement;
    const originalOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const handleEscape=(e)=>{
      if(e.key==='Escape'){
        e.preventDefault();
        if(posterExpandedRef.current){setPosterExpanded(false);return;}
        dismiss('dismiss');
      }
      if(e.key==='Tab'){
        const selector='button:not(:disabled), a[href]';
        const base=document.querySelector('.be-pop-lightbox') || document.querySelector('.be-pop-dialog');
        const focusables=Array.from(base?.querySelectorAll(selector)||[]);
        if(!focusables.length)return;
        const first=focusables[0],last=focusables[focusables.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',handleEscape);
    window.requestAnimationFrame(()=>closeButtonRef.current?.focus());
    // One-per-login marker is set only when the popup really opens, not when
    // the event is fetched. Reusing the same Auth session after a reload will
    // never re-trigger this event, even if "Đã xem" was clicked previously.
    if(firstImpression && event.frequency==='per_login' && authSessionIdentityRef.current){
      try{window.localStorage.setItem(
        eventLoginStorageKey(event),
        eventLoginSessionMarker(userId,authSessionIdentityRef.current)
      );}catch{/* session still tracked in this mounted component */}
    }
    // Rendering the modal is the impression event; never mark a fetched event
    // as seen merely because it was eligible.
    if(firstImpression) recordEventInteraction(event,userId,'shown')
      .then(receipt=>{if(!disposed)setEvent(x=>x?.id===event.id?{...x,receipt}:x);})
      .catch(error=>{if(!disposed)setActionError('Không đồng bộ được trạng thái xem. Có thể thử lại sau.');console.warn(error?.message||error);});
    return ()=>{
      disposed=true;document.body.style.overflow=originalOverflow;
      document.removeEventListener('keydown',handleEscape);
      openerRef.current?.focus?.();
    };
  // Deliberately keyed only by event identity, not changing receipt payload.
  },[event?.id,event?.version,userId]);

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
  if(!userId||(!event&&!inboxEvents.length))return null;
  return createPortal(<>
    {!event && inboxEvents.length>0 && <button type="button" className="be-pop-inbox-trigger"
      onClick={()=>setInboxOpen(true)} aria-label={'Mở '+inboxEvents.length+' thông báo sự kiện'}>
      <CalendarDays size={18} aria-hidden="true"/><span>Sự kiện dành cho bạn</span><strong>{inboxEvents.length}</strong>
    </button>}
    {!event && inboxOpen && <div className="be-pop-inbox-overlay" role="presentation">
      <section className="be-pop-inbox-dialog" role="dialog" aria-modal="true" aria-labelledby="be-pop-inbox-title">
        <header><div><span>BRIAN ENGLISH · EVENT INBOX</span><h2 id="be-pop-inbox-title">Sự kiện dành cho bạn</h2></div>
          <button type="button" onClick={()=>setInboxOpen(false)} aria-label="Đóng danh sách sự kiện"><X size={18}/></button></header>
        <div className="be-pop-inbox-list">{inboxEvents.map(item=><button type="button" key={item.id} onClick={()=>{
          setDetailed(false);setPosterExpanded(false);setPosterUrl('');setInboxOpen(false);setActionError('');setEvent(item);
        }}>
          <span className="be-pop-inbox-date"><CalendarDays size={20}/></span>
          <span><strong>{item.title}</strong><small>{niceDate(item.event_start_at)} · {item.organizer}</small></span>
          <ExternalLink size={16}/></button>)}</div>
      </section>
    </div>}
    {event && <div className="be-pop-overlay" role="presentation">
      <div className="be-pop-scrim" aria-hidden="true"/>
      <section className="be-pop-dialog" role="dialog" aria-modal="true"
        aria-labelledby="be-pop-title" aria-describedby="be-pop-intro">
        <header className="be-pop-header">
          <div className="be-pop-header-id">
            <span className="be-pop-bell" aria-hidden="true"><BellRing size={30} strokeWidth={1.85}/></span>
            <div className="be-pop-heading-copy">
              <span className="be-pop-eyebrow">BRIAN ENGLISH · THÔNG BÁO DÀNH CHO NHÀ TRƯỜNG</span>
              <h2 id="be-pop-title">Thông báo sự kiện</h2>
              <p id="be-pop-intro">Thông tin mới được gửi đến bạn từ Ban tổ chức.</p>
            </div>
          </div>
          <div className="be-pop-header-art" aria-hidden="true">
            <span className="be-pop-art-glow"/>
            <Sparkles className="be-pop-art-sparkle be-pop-art-sparkle-one" size={19}/>
            <BellRing className="be-pop-art-bell" size={104} strokeWidth={1.2}/>
            <Sparkles className="be-pop-art-sparkle be-pop-art-sparkle-two" size={27}/>
          </div>
          <button type="button" className="be-pop-close" ref={closeButtonRef}
            aria-label="Đóng thông báo" disabled={loadingAction}
            onClick={()=>dismiss('dismiss')}><X size={22}/></button>
        </header>

        <div className="be-pop-body">
          <div className="be-pop-poster">
            {posterUrl
              ? <button type="button" className="be-pop-poster-open"
                  aria-label="Xem poster sự kiện ở kích thước lớn"
                  onClick={()=>setPosterExpanded(true)}>
                  <img src={posterUrl} alt={'Thư mời: '+event.title}/>
                  <span className="be-pop-poster-cta"><Eye size={19} strokeWidth={2}/> Xem poster</span>
                </button>
              : <div className="be-pop-placeholder">
                  <ImageIcon size={42} aria-hidden="true"/>
                  <p>Thông báo sự kiện</p><small>{event.organizer}</small>
                </div>}
          </div>

          <div className="be-pop-content">
            <div className="be-pop-tags">
              <span className={'be-pop-priority is-'+event.priority}>
                <CalendarDays size={15} aria-hidden="true"/>
                {event.priority==='urgent'?'Thông báo khẩn':new Date(event.event_start_at)>new Date()?'Sắp diễn ra':'Đang diễn ra'}
              </span>
              <span className="be-pop-school-year">
                <GraduationCap size={17} aria-hidden="true"/>{event.school_year}
              </span>
            </div>
            <h3>{event.title}</h3>
            <div className="be-pop-info">
              <div className="be-pop-info-card is-time">
                <span className="be-pop-info-icon" aria-hidden="true"><CalendarDays size={25}/></span>
                <span className="be-pop-info-copy">
                  <small>Thời gian</small>
                  <strong>{niceDate(event.event_start_at)}</strong>
                  <span>Đến {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(new Date(event.event_end_at))}</span>
                </span>
              </div>
              <div className="be-pop-info-card is-format">
                <span className="be-pop-info-icon" aria-hidden="true"><Video size={25}/></span>
                <span className="be-pop-info-copy">
                  <small>Hình thức</small>
                  <strong>{event.venue_type==='online'?'Trực tuyến':event.venue_type==='offline'?'Trực tiếp':'Kết hợp'}</strong>
                  {event.venue_name&&<span>{event.venue_name}</span>}
                </span>
              </div>
              {event.meeting_code&&<div className="be-pop-info-card is-meeting">
                <span className="be-pop-info-icon" aria-hidden="true"><Copy size={25}/></span>
                <span className="be-pop-info-copy">
                  <small>Mã phòng họp</small>
                  <strong>{event.meeting_code}</strong>
                </span>
                <button className="be-pop-copy" type="button" aria-label="Sao chép mã phòng họp"
                  title="Sao chép mã phòng họp" onClick={copyCode}><Copy size={19}/></button>
              </div>}
              <div className="be-pop-info-card is-organizer">
                <span className="be-pop-info-icon" aria-hidden="true"><MapPin size={25}/></span>
                <span className="be-pop-info-copy">
                  <small>Đơn vị tổ chức</small>
                  <strong>{event.organizer}</strong>
                </span>
              </div>
            </div>

            {detailed&&<div className="be-pop-description">
              <h4>Nội dung chi tiết</h4>
              {event.summary&&<p>{event.summary}</p>}
              <p>{event.description||'Vui lòng xem poster và thông tin sự kiện.'}</p>
              {event.meeting_url&&/^https:\/\//i.test(event.meeting_url)&&
                <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16}/> Tham gia Google Meet
                </a>}
            </div>}
            {actionError&&<p className="be-pop-error" role="alert">{actionError}</p>}
          </div>
        </div>

        <footer className="be-pop-footer">
          {event.frequency==='per_login'
            ? <p className="be-pop-login-hint"><Info size={20} aria-hidden="true"/>
                <span>Thông báo sẽ xuất hiện lại khi bạn đăng nhập lần tiếp theo.</span>
              </p>
            : <div className="be-pop-dismiss-actions">
                <button type="button" disabled={loadingAction} onClick={()=>dismiss('today')}>
                  <BellOff size={17}/> Không hiện hôm nay
                </button>
                <button type="button" disabled={loadingAction} onClick={()=>dismiss('snooze')}>
                  <Clock3 size={17}/> Nhắc lại sau
                </button>
              </div>}
          <div className="be-pop-action-buttons">
            <button type="button" className="be-pop-secondary" disabled={loadingAction}
              onClick={()=>dismiss(event.frequency==='per_login'?'dismiss':'snooze')}>Để sau</button>
            {detailed
              ? <button type="button" className="be-pop-ack" disabled={loadingAction}
                  onClick={()=>dismiss('acknowledge')}><Check size={18}/> Đã xem</button>
              : <button type="button" className="be-pop-primary" disabled={loadingAction}
                  onClick={openDetails}><Eye size={19}/> Xem chi tiết <ArrowRight size={20}/></button>}
          </div>
        </footer>
      </section>
      {posterExpanded&&posterUrl&&<EventPosterViewer
        src={posterUrl} title={event.title}
        onClose={()=>setPosterExpanded(false)}/>} 
  </div>}
  </>,document.body);
}
