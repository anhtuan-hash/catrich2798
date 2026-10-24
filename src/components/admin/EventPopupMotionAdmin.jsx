import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, CalendarDays, Eye, Sparkles, Video, X, Play, RotateCcw, Maximize2 } from 'lucide-react';
import {
  EVENT_ENTER_CHOICES, EVENT_EXIT_CHOICES, EVENT_SPEED_CHOICES,
  normalizeEventPopupMotion, eventPopupMotionDuration, playEventPopupMotion,
} from '../../features/events/utils/eventPopupMotion.mjs';
import '../../features/events/dashboard/EventPopup.css';
import '../../features/events/dashboard/EventPopupMotion.css';
import './EventPopupMotionAdmin.css';

/** Full-size real DOM preview, not a static mockup or a server event. */
function ActualEventPreview({ motion, language, onClose }) {
  const vi=language!=='en';
  const dialogRef=useRef(null);
  const animationRef=useRef(null);
  const busyRef=useRef(false);
  const closeRef=useRef(null);
  const openerRef=useRef(null);
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;

  useEffect(()=>{
    openerRef.current=document.activeElement;
    const old=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const frame=requestAnimationFrame(()=>{
      animationRef.current=playEventPopupMotion(dialogRef.current,motion,'enter');
      closeRef.current?.focus();
    });
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();requestClose();}
      if(e.key==='Tab'){
        const controls=[...(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href]')||[])];
        if(!controls.length)return;
        const first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>{
      cancelAnimationFrame(frame);
      animationRef.current?.cancel();
      document.body.style.overflow=old;
      window.removeEventListener('keydown',onKey);
      openerRef.current?.focus?.();
    };
  },[]);
  async function requestClose(){
    if(busyRef.current)return;
    busyRef.current=true;
    animationRef.current?.cancel();
    const exiting=playEventPopupMotion(dialogRef.current,motion,'exit');
    animationRef.current=exiting;
    await exiting.finished;
    onCloseRef.current?.();
  }
  return createPortal(
    <div className="be-pop-overlay be-pop-overlay--actual-preview" data-event-motion="true" data-event-driven="true" role="presentation">
      <div className="be-pop-scrim" aria-hidden="true"/>
      <section className="be-pop-dialog" ref={dialogRef} role="dialog" aria-modal="true"
        aria-label={vi?'Xem thử hiệu ứng popup sự kiện':'Event popup motion live preview'}
        data-global-motion-isolate="true">
        <header className="be-pop-header">
          <div className="be-pop-header-id">
            <span className="be-pop-bell"><BellRing size={27}/></span>
            <div className="be-pop-heading-copy">
              <span className="be-pop-eyebrow">{vi?'BẢN XEM THỬ · KHÔNG GỬI THÔNG BÁO':'PREVIEW ONLY · NOT SENT'}</span>
              <h2>{vi?'Thông báo sự kiện':'Event notification'}</h2>
              <p>{vi?'Minh họa hiệu ứng trên kích thước popup thật.':'Animation in the real popup layout.'}</p>
            </div>
          </div>
          <div className="be-pop-header-art" aria-hidden="true"><Sparkles size={72}/></div>
          <button ref={closeRef} type="button" className="be-pop-close" onClick={requestClose} aria-label={vi?'Đóng mẫu thử':'Close preview'}>
            <X size={22}/>
          </button>
        </header>
        <div className="be-pop-body">
          <div className="be-pop-poster">
            <div className="be-pop-preview-poster" aria-label={vi?'Poster minh họa':'Sample poster'}>
              <Sparkles size={40}/>
              <strong>BRIAN EVENT</strong>
              <span>{vi?'Sinh hoạt chuyên đề môn Tiếng Anh':'English Department Special Event'}</span>
              <small>PREVIEW · 2026–2027</small>
            </div>
          </div>
          <div className="be-pop-content">
            <div className="be-pop-tags"><span className="be-pop-priority is-normal"><CalendarDays size={15}/>{vi?'Sắp diễn ra':'Upcoming'}</span></div>
            <h3>{vi?'Sinh hoạt chuyên đề bộ môn Tiếng Anh':'English Department Special Event'}</h3>
            <div className="be-pop-info">
              <div className="be-pop-info-card is-time"><span className="be-pop-info-icon"><CalendarDays/></span>
                <span className="be-pop-info-copy"><span>{vi?'Thời gian':'Time'}</span><strong>30/10/2026 · 13:55</strong></span></div>
              <div className="be-pop-info-card is-format"><span className="be-pop-info-icon"><Video/></span>
                <span className="be-pop-info-copy"><span>{vi?'Hình thức':'Format'}</span><strong>Google Meet</strong></span></div>
            </div>
          </div>
        </div>
        <footer className="be-pop-footer">
          <p className="be-pop-login-hint">{vi?'Đây chỉ là mô phỏng. Không lưu hay gửi thông báo.':'Preview only. No event is sent or saved.'}</p>
          <div className="be-pop-action-buttons">
            <button type="button" className="be-pop-secondary" onClick={requestClose}>
              {vi?'Đóng với hiệu ứng đã chọn':'Close using selected effect'}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}

const PHASES={
  ready:['Sẵn sàng','Ready'],
  opening:['Đang mở','Opening'],
  holding:['Đang hiển thị','On screen'],
  closing:['Đang đóng','Closing'],
  finished:['Đã hoàn tất','Finished'],
};

/** Admin-only Settings → Appearance → Motion entry/exit editor. */
export default function EventPopupMotionAdmin({ value, onChange, language='vi' }) {
  const vi=language!=='en';
  const motion=normalizeEventPopupMotion(value);
  const [phase,setPhase]=useState('ready');
  const [fullPreview,setFullPreview]=useState(false);
  const cardRef=useRef(null);
  const stageRef=useRef(null);
  const animationRef=useRef(null);
  const pendingRef=useRef(null);
  const playId=useRef(0);
  const runRef=useRef(null);
  const onceRef=useRef(false);
  const latestMotionRef=useRef(motion);
  latestMotionRef.current=motion;

  const pause=ms=>new Promise(resolve=>{
    pendingRef.current=window.setTimeout(resolve,ms);
  });

  const replay=useCallback(async(kind='both',nextMotion=latestMotionRef.current)=>{
    onceRef.current=true;
    const token=++playId.current;
    animationRef.current?.cancel();
    window.clearTimeout(pendingRef.current);
    const card=cardRef.current;
    if(!card)return;
    const doPhase=async current=>{
      if(token!==playId.current)return;
      setPhase(current==='enter'?'opening':'closing');
      const playing=playEventPopupMotion(card,nextMotion,current);
      animationRef.current=playing;
      await playing.finished;
    };
    card.style.opacity='1';
    card.style.transform='none';
    if(kind!=='exit') await doPhase('enter');
    if(token!==playId.current)return;
    if(kind==='both'){
      setPhase('holding');
      await pause(650);
      if(token!==playId.current)return;
    }
    if(kind!=='enter')await doPhase('exit');
    if(token!==playId.current)return;
    setPhase('finished');
    await pause(350);
    if(token!==playId.current)return;
    animationRef.current?.cancel();
    card.style.opacity='1';
    card.style.transform='none';
    setPhase('ready');
  },[]);
  runRef.current=replay;
  useEffect(()=>{
    // Settings renders hidden tab panels before they are opened. Autoplay once
    // only when the preview actually becomes visible to the Admin.
    if(typeof IntersectionObserver==='undefined')return undefined;
    const observer=new IntersectionObserver(entries=>{
      if(!onceRef.current && entries.some(e=>e.isIntersecting && e.intersectionRatio>.2)){
        onceRef.current=true;
        window.setTimeout(()=>runRef.current?.('both'),220);
      }
    },{threshold:[.2,.45]});
    if(stageRef.current)observer.observe(stageRef.current);
    return ()=>{
      observer.disconnect();
      playId.current++;
      animationRef.current?.cancel();
      window.clearTimeout(pendingRef.current);
    };
  },[]);
  function update(key,selected) {
    const next=normalizeEventPopupMotion({...motion,[key]:selected});
    onChange(next);
    replay('both',next);
  }
  const speeds=EVENT_SPEED_CHOICES.find(item=>item.id===motion.speed)||EVENT_SPEED_CHOICES[1];
  return (
    <section className="be-event-motion-settings" aria-labelledby="be-event-motion-title">
      <header className="be-event-motion-settings__head">
        <div><span>EVENT MOTION · ADMIN ONLY</span>
          <h3 id="be-event-motion-title">{vi?'Hiệu ứng popup sự kiện':'Event popup transitions'}</h3>
          <p>{vi?'Chọn hiệu ứng mở và đóng độc lập. Chỉ Admin xuất bản mới thay đổi trải nghiệm của giáo viên.':'Choose separate open and close effects. Publishing site-wide requires Admin.'}</p>
        </div>
        <span className="be-event-motion-settings__admin">{vi?'Chỉ Admin':'Admin only'}</span>
      </header>
      <div className="be-event-motion-settings__layout">
        <div className="be-event-motion-settings__controls">
          <label><span>{vi?'Hiệu ứng khi mở':'Opening effect'}</span>
            <select aria-label={vi?'Hiệu ứng mở popup sự kiện':'Event popup opening effect'} value={motion.enter} onChange={e=>update('enter',e.target.value)}>
              {EVENT_ENTER_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select></label>
          <label><span>{vi?'Hiệu ứng khi đóng':'Closing effect'}</span>
            <select aria-label={vi?'Hiệu ứng đóng popup sự kiện':'Event popup closing effect'} value={motion.exit} onChange={e=>update('exit',e.target.value)}>
              {EVENT_EXIT_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select></label>
          <label><span>{vi?'Tốc độ':'Speed'}</span>
            <select aria-label={vi?'Tốc độ hiệu ứng sự kiện':'Event popup animation speed'} value={motion.speed} onChange={e=>update('speed',e.target.value)}>
              {EVENT_SPEED_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select></label>
          <small>{vi?'Mở':'Open'} {speeds.enterMs}ms · {vi?'đóng':'close'} {speeds.exitMs}ms · Reduce Motion.</small>
          <div className="be-event-motion-settings__buttons">
            <button type="button" className="be-event-motion-settings__replay" onClick={()=>replay('both')}>
              <RotateCcw size={16}/> {vi?'Phát mở → đóng':'Play open → close'}
            </button>
            <button type="button" className="be-event-motion-settings__secondary" onClick={()=>replay('enter')}>
              <Play size={14}/> {vi?'Chỉ mở':'Open'}
            </button>
            <button type="button" className="be-event-motion-settings__secondary" onClick={()=>replay('exit')}>
              <Play size={14}/> {vi?'Chỉ đóng':'Close'}
            </button>
          </div>
          <button type="button" className="be-event-motion-settings__actual" onClick={()=>setFullPreview(true)}>
            <Maximize2 size={16}/> {vi?'Xem thử popup thật toàn màn hình':'Test actual full-size popup'}
          </button>
        </div>
        <div ref={stageRef} className="be-pop-preview-stage" data-event-driven="true" data-preview-phase={phase}>
          <div className="be-event-motion-settings__phase" role="status" aria-live="polite">
            <span className={`be-event-motion-settings__phase-dot ${phase}`}/>
            {vi?PHASES[phase][0]:PHASES[phase][1]}
          </div>
          <div className="be-pop-preview-card" ref={cardRef}>
            <div className="be-pop-preview-card__icon"><Sparkles size={24}/></div>
            <div className="be-pop-preview-card__text"><b>{vi?'Thông báo sự kiện':'Event announcement'}</b>
              <small>{vi?'Một sự kiện mới sắp diễn ra':'A new event is coming up'}</small></div>
            <span className="be-pop-preview-card__pill">{vi?'Mới':'New'}</span>
          </div>
          <span className="be-event-motion-settings__caption">{vi?'Đang phát hiệu ứng thực • Không gửi sự kiện':'Real animation preview · No event sent'}</span>
        </div>
      </div>
      {fullPreview&&<ActualEventPreview motion={motion} language={language} onClose={()=>setFullPreview(false)}/>}
    </section>
  );
}
