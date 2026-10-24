import React, { useEffect, useRef, useState } from 'react';
import {
  EVENT_ENTER_CHOICES, EVENT_EXIT_CHOICES, EVENT_SPEED_CHOICES,
  normalizeEventPopupMotion, eventPopupMotionDuration,
} from '../../features/events/utils/eventPopupMotion.mjs';
import '../../features/events/dashboard/EventPopupMotion.css';
import './EventPopupMotionAdmin.css';

/** Rendered only inside Admin's authenticated Motion Library settings. */
export default function EventPopupMotionAdmin({ value, onChange, language = 'vi' }) {
  const vi=language !== 'en';
  const motion=normalizeEventPopupMotion(value);
  const [phase,setPhase]=useState('enter');
  const [tick,setTick]=useState(0);
  const timer=useRef(null);
  useEffect(()=>()=>window.clearTimeout(timer.current),[]);
  function replay(next=motion) {
    window.clearTimeout(timer.current);
    setPhase('enter');
    setTick(n=>n+1);
    // Real preview executes BOTH phases with the selected durations.
    const enter=eventPopupMotionDuration(next,'enter',window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    timer.current=window.setTimeout(()=>setPhase('exit'),enter+450);
  }
  function update(key,value) {
    const next=normalizeEventPopupMotion({...motion,[key]:value});
    onChange(next);
    replay(next);
  }
  const speeds=EVENT_SPEED_CHOICES.find(item=>item.id===motion.speed)||EVENT_SPEED_CHOICES[1];
  return (
    <section className="be-event-motion-settings" aria-labelledby="be-event-motion-title">
      <header className="be-event-motion-settings__head">
        <div><span>EVENT MOTION · ADMIN ONLY</span>
          <h3 id="be-event-motion-title">{vi?'Hiệu ứng popup sự kiện':'Event popup transitions'}</h3>
          <p>{vi?'Điều chỉnh hai chiều mở và đóng. Cấu hình chỉ có hiệu lực với giáo viên sau khi Admin xuất bản bên dưới.':'Choose both opening and closing motion. Teachers receive changes only after Admin publishes below.'}</p>
        </div>
        <span className="be-event-motion-settings__admin">{vi?'Chỉ Admin':'Admin only'}</span>
      </header>
      <div className="be-event-motion-settings__layout">
        <div className="be-event-motion-settings__controls">
          <label>
            <span>{vi?'Hiệu ứng khi mở':'Opening effect'}</span>
            <select aria-label={vi?'Hiệu ứng mở popup sự kiện':'Event popup opening effect'} value={motion.enter} onChange={event=>update('enter',event.target.value)}>
              {EVENT_ENTER_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select>
          </label>
          <label>
            <span>{vi?'Hiệu ứng khi đóng':'Closing effect'}</span>
            <select aria-label={vi?'Hiệu ứng đóng popup sự kiện':'Event popup closing effect'} value={motion.exit} onChange={event=>update('exit',event.target.value)}>
              {EVENT_EXIT_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select>
          </label>
          <label>
            <span>{vi?'Tốc độ':'Speed'}</span>
            <select aria-label={vi?'Tốc độ hiệu ứng sự kiện':'Event popup animation speed'} value={motion.speed} onChange={event=>update('speed',event.target.value)}>
              {EVENT_SPEED_CHOICES.map(item=><option key={item.id} value={item.id}>{vi?item.vi:item.en}</option>)}
            </select>
          </label>
          <small>{vi?'Thời gian mở':'Open'} {speeds.enterMs}ms · {vi?'đóng':'close'} {speeds.exitMs}ms. {vi?'Reduce Motion luôn được ưu tiên.':'Reduced Motion always takes precedence.'}</small>
          <button type="button" className="be-event-motion-settings__replay" onClick={()=>replay()}>
            ↻ {vi?'Xem thử mở → đóng':'Preview open → close'}
          </button>
        </div>
        <div className={`be-pop-preview-stage${phase==='exit'?' is-leaving':''}`}
          data-event-enter={motion.enter} data-event-exit={motion.exit}
          style={{'--be-event-enter-ms':`${eventPopupMotionDuration(motion,'enter')}ms`,
            '--be-event-exit-ms':`${eventPopupMotionDuration(motion,'exit')}ms`}}>
          <div className="be-pop-preview-card" key={tick}>
            <div className="be-pop-preview-card__icon">✦</div>
            <div className="be-pop-preview-card__text"><b>{vi?'Thông báo sự kiện':'Event announcement'}</b>
              <small>{vi?'Một sự kiện mới sắp diễn ra':'A new event is coming up'}</small>
            </div>
            <span className="be-pop-preview-card__pill">{vi?'Mới':'New'}</span>
          </div>
          <span className="be-event-motion-settings__caption">{vi?'Mẫu thử • Không gửi thông báo thật':'Preview only • No real notifications'}</span>
        </div>
      </div>
    </section>
  );
}
