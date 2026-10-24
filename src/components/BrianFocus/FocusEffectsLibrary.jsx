import React, { useEffect, useRef, useState } from 'react';
import { Check, Clapperboard, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { FOCUS_TRANSITIONS, normalizeFocusTransitions } from './FocusTransitionLibrary.js';
import { startFocusPreview } from './focusPreviewMotion.js';

/**
 * Focus Transition Gallery. Preview runs in a small simulated scene, never on the
 * actual Focus overlay: selections are only committed when "Apply" is pressed.
 */
export default function FocusEffectsLibrary({ language = 'vi', current, onApply, onClose, openerRef }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => normalizeFocusTransitions(current));
  const [direction, setDirection] = useState('enter');
  const [category, setCategory] = useState('all');
  const [playKey, setPlayKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [allowMotionPreview, setAllowMotionPreview] = useState(false);
  const [previewState, setPreviewState] = useState('pending');
  const demoRef = useRef(null);
  const runningAnimationRef = useRef(null);
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const selected = draft[direction];
  const effects = FOCUS_TRANSITIONS.filter(item => category === 'all' || item.category === category);
  const preview = () => setPlayKey(n => n + 1);
  const motionIsBlocked = reducedMotion && !allowMotionPreview;
  const choose = id => {
    setDraft(previous => ({ ...previous, [direction]: id }));
    preview();
  };
  const close = () => {
    onClose();
    requestAnimationFrame(() => openerRef?.current?.focus?.());
  };
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  // Start a real browser Animation and inspect its play state, not a simulated
  // progress timer. Replay remounts the demo and constructs a fresh player.
  useEffect(() => {
    runningAnimationRef.current?.cancel();
    runningAnimationRef.current = null;
    if (selected === 'none') { setPreviewState('none'); return undefined; }
    if (motionIsBlocked) { setPreviewState('reduced'); return undefined; }
    const animation = startFocusPreview(demoRef.current, selected, direction);
    if (!animation) { setPreviewState('unsupported'); return undefined; }
    runningAnimationRef.current = animation;
    setPreviewState(animation.playState === 'running' ? 'playing' : 'paused');
    return () => {
      animation.cancel();
      if (runningAnimationRef.current === animation) runningAnimationRef.current = null;
    };
  }, [selected, direction, playKey, motionIsBlocked]);
  return (
    <section className="bfc-effect-gallery" role="region"
      ref={panelRef}
      aria-label={vi ? 'Kho hiệu ứng chuyển động' : 'Transition effects library'}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(panelRef.current?.querySelectorAll('button:not([disabled]),input:not([disabled])') || [])
          .filter(element => element.getClientRects().length);
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls[controls.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
          event.preventDefault();
          controls[0].focus();
        }
      }}>
      <header className="bfc-effect-gallery__head">
        <span className="bfc-effect-gallery__head-icon"><Clapperboard size={21}/></span>
        <span><small>BRIAN FOCUS / MOTION LIBRARY</small>
          <strong>{vi ? 'Kho hiệu ứng chuyển động' : 'Transition effects library'}</strong>
          <em>{vi ? 'Xem thử rồi chọn chuyển cảnh yêu thích.' : 'Preview and choose your favorite transition.'}</em>
        </span>
        <button ref={closeRef} type="button" className="bfc-effect-gallery__close" onClick={close}
          aria-label={vi ? 'Đóng kho hiệu ứng' : 'Close effects library'}><X size={19}/></button>
      </header>

      <div className="bfc-effect-gallery__body">
        <div className="bfc-effect-gallery__directions" role="group" aria-label={vi ? 'Kiểu chuyển cảnh' : 'Transition direction'}>
          <button type="button" className={direction==='enter'?'active':''} aria-pressed={direction==='enter'}
            onClick={()=>{setDirection('enter');preview();}}>{vi?'Hiệu ứng mở':'Opening effect'} <span>{FOCUS_TRANSITIONS.find(t=>t.id===draft.enter)?.[vi?'labelVi':'labelEn']}</span></button>
          <button type="button" className={direction==='exit'?'active':''} aria-pressed={direction==='exit'}
            onClick={()=>{setDirection('exit');preview();}}>{vi?'Hiệu ứng đóng':'Closing effect'} <span>{FOCUS_TRANSITIONS.find(t=>t.id===draft.exit)?.[vi?'labelVi':'labelEn']}</span></button>
        </div>

        <div className="bfc-effect-gallery__preview">
          <div className="bfc-effect-gallery__preview-screen">
            <div className="bfc-effect-gallery__preview-underlay" aria-hidden="true">
              <i/><i/><i/><span>BRIAN ENGLISH</span>
            </div>
            <div key={playKey} ref={demoRef} className="bfc-effect-gallery__demo" data-demo-effect={selected} data-demo-direction={direction}
              data-preview-override={allowMotionPreview ? 'true' : 'false'}
              aria-label={vi?'Xem trước hiệu ứng':'Effect preview'}>
              <span className="bfc-effect-gallery__demo-spark">✦</span>
              <span className="bfc-effect-gallery__demo-clock">11<span>:</span>41</span>
              <small>BRIAN FOCUS</small>
            </div>
          </div>
          <div className="bfc-effect-gallery__preview-meta">
            <span><Sparkles size={15}/><strong>{FOCUS_TRANSITIONS.find(t=>t.id===selected)?.[vi?'labelVi':'labelEn']}</strong>
              <small aria-live="polite">{previewState === 'playing' ? (vi?'ĐANG PHÁT · lặp mỗi 3,4 giây':'PLAYING · loops every 3.4 seconds')
                : previewState === 'reduced' ? (vi?'Thiết bị đang bật Giảm chuyển động':'Reduce Motion is enabled')
                : previewState === 'none' ? (vi?'Đã chọn Không hiệu ứng':'No motion selected')
                : previewState === 'unsupported' ? (vi?'Trình duyệt không hỗ trợ phát mẫu này':'Browser preview unavailable')
                : (vi?'Đang chuẩn bị hiệu ứng':'Preparing preview')}</small>
            </span>
            <button type="button" onClick={preview} disabled={motionIsBlocked || selected === 'none'}><Play size={16}/>{vi?'Phát lại':'Replay'}</button>
          </div>
          {previewState === 'playing' ? <div key={'meter-'+playKey+'-'+selected+'-'+direction} className="bfc-effect-gallery__preview-progress" aria-hidden="true"><span/></div> : null}
          {reducedMotion && !allowMotionPreview ? <button type="button" className="bfc-effect-gallery__override" onClick={() => setAllowMotionPreview(true)}>{vi?'Bật xem thử chuyển động lần này':'Preview motion anyway'}</button> : null}
        </div>

        <div className="bfc-effect-gallery__filter" role="group" aria-label={vi?'Bộ lọc hiệu ứng':'Effect categories'}>
          {[['all',vi?'Tất cả':'All'],['cinema',vi?'Điện ảnh':'Cinematic'],['gentle',vi?'Nhẹ nhàng':'Gentle']].map(([id,label])=>
            <button type="button" key={id} onClick={()=>setCategory(id)} className={category===id?'active':''} aria-pressed={category===id}>{label}</button>)}
        </div>

        <div className="bfc-effect-gallery__grid">
          {effects.map((effect,index)=><button type="button" key={effect.id}
            className={'bfc-effect-gallery__card tone-'+effect.tone+(selected===effect.id?' selected':'')}
            onClick={()=>choose(effect.id)} aria-pressed={selected===effect.id}>
            <span className="bfc-effect-gallery__art" aria-hidden="true">
              <i className={'bfc-effect-gallery__art-graphic effect-'+effect.id}><b>✦</b><b>11:41</b></i>
              {selected===effect.id?<span className="bfc-effect-gallery__check"><Check size={12}/></span>:null}
            </span>
            <span className="bfc-effect-gallery__card-copy"><strong>{effect[vi?'labelVi':'labelEn']}</strong>
              <small>{effect[vi?'detailVi':'detailEn']}</small></span>
            <span className="bfc-effect-gallery__card-num">{String(index+1).padStart(2,'0')}</span>
          </button>)}
        </div>
        <p className="bfc-effect-gallery__privacy">{vi
          ? 'Lựa chọn chỉ lưu trên trình duyệt này. Không thay đổi ảnh nền dùng chung hay cài đặt của giáo viên khác.'
          : 'Saved for this browser only. Does not alter the shared scene or other teachers’ settings.'}</p>
      </div>

      <footer className="bfc-effect-gallery__foot">
        <button type="button" className="bfc-effect-gallery__reset" onClick={()=>{setDraft({enter:'portal',exit:'portal'});preview();}}>
          <RotateCcw size={16}/>{vi?'Mặc định':'Default'}
        </button>
        <button type="button" className="bfc-effect-gallery__apply" onClick={()=>{onApply(draft);close();}}>
          <Check size={17}/>{vi?'Áp dụng hiệu ứng':'Apply effects'}
        </button>
      </footer>
    </section>
  );
}
