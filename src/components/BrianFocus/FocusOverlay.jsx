import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Waves, Pause, ImagePlus, Clapperboard, TimerReset } from 'lucide-react';
import HTCSenseClock from './HTCSenseClock.jsx';
import CosmicAmbient from './CosmicAmbient.jsx';
import FocusSceneBackground from './FocusSceneBackground.jsx';
import FocusYoutubeBackground from './FocusYoutubeBackground.jsx';
import FocusSceneEditor from './FocusSceneEditor.jsx';
import FocusEffectsLibrary from './FocusEffectsLibrary.jsx';
import FocusWorkspace from './FocusWorkspace.jsx';
import { canEditFocusScene } from './focusSceneService.js';

/** Portal keeps the real Dashboard mounted and interactive state intact. */
export default function FocusOverlay({ currentUser, scene, onScenePublished, sceneError, onClose, language, weather, onRefreshWeather, returnFocusRef, performance = 'balanced', exiting = false, transitions = { enter: 'portal', exit: 'portal' }, onEffectsChange }) {
  const [motionEnabled, setMotionEnabled] = useState(() => (
    !['low', 'minimal'].includes(performance) &&
    !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ));
  const [sceneEditorOpen, setSceneEditorOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('');
  const [personalDim, setPersonalDim] = useState(null);
  const [quiet, setQuiet] = useState(false);
  const [soundscapeActive, setSoundscapeActive] = useState(false);
  const activeToolRef = useRef('');
  activeToolRef.current = activeTool;
  const effectsTriggerRef = useRef(null);
  const effectsOpenRef = useRef(false);
  effectsOpenRef.current = effectsOpen;
  const sceneEditorRef = useRef(false);
  sceneEditorRef.current = sceneEditorOpen;
  // Applying a preset while Focus is open must not replay its entrance.
  const enteredWithEffect = useRef(transitions.enter);
  const canManage = canEditFocusScene(currentUser);
  const dialogRef = useRef(null);
  const dismissRef = useRef(null);
  const closeHandlerRef = useRef(onClose);
  closeHandlerRef.current = onClose;

  useEffect(() => {
    const root = document.getElementById('root');
    const rootWasInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    const frame = window.requestAnimationFrame(() => dismissRef.current?.focus());

    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (effectsOpenRef.current) setEffectsOpen(false);
        else if (sceneEditorRef.current) setSceneEditorOpen(false);
        else if (activeToolRef.current) setActiveTool('');
        else closeHandlerRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      // The Focus Bubble is portalled alongside the dialog, not underneath it.
      // Include it explicitly in the modal's keyboard loop and aria-owns.
      const focusable = [
        ...Array.from(dialogRef.current.querySelectorAll(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )),
        returnFocusRef?.current,
      ].filter(node => node && node.getClientRects().length && getComputedStyle(node).opacity !== '0');
      if (!focusable.length) return;
      // The trigger is before the overlay in document.body. Never rely on
      // browser DOM tab order; cycle explicitly through dialog + portal bubble.
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = currentIndex === -1
        ? (event.shiftKey ? focusable.length - 1 : 0)
        : (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus();
    };

    document.addEventListener('keydown', keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      if (root) root.inert = rootWasInert;
      window.scrollTo(scrollX, scrollY);
      window.requestAnimationFrame(() => returnFocusRef?.current?.focus?.());
    };
  }, [returnFocusRef]);

  if (typeof document === 'undefined') return null;
  const vi = language !== 'en';
  const displayScene = personalDim === null ? scene : { ...scene, dimPercent: personalDim };

  return createPortal(
    <div className={`bfc-overlay${(!motionEnabled || ['low','minimal'].includes(performance)) ? ' bfc-overlay--low-motion' : ''}${['low','minimal'].includes(performance) ? ' bfc-overlay--entry-lite' : ''}${canManage ? ' bfc-overlay--manager' : ''}${sceneEditorOpen ? ' is-editor-open' : ''}${effectsOpen ? ' is-effects-open' : ''}${activeTool ? ' is-tools-open' : ''}${quiet ? ' bfc-overlay--quiet' : ''}${exiting ? ' bfc-overlay--exiting' : ''}`} role="dialog" aria-modal="true"
      aria-label={vi ? 'Chế độ tập trung Brian Focus' : 'Brian Focus mode'}
      aria-owns="bfc-focus-trigger"
      data-focus-transition={exiting ? 'exiting' : 'entering'}
      data-focus-enter={enteredWithEffect.current}
      data-focus-exit={transitions.exit}
      ref={dialogRef}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      {scene.mediaType === 'default'
        ? <CosmicAmbient motionEnabled={motionEnabled} />
        : scene.mediaType === 'youtube'
          ? <FocusYoutubeBackground scene={displayScene} language={language} soundscapeActive={soundscapeActive} />
          : <FocusSceneBackground scene={displayScene} language={language} motionEnabled={motionEnabled} />}
      <div className="bfc-overlay__identity" aria-hidden="true">
        <span className="bfc-overlay__identity-mark">B<span>✦</span></span>
        <span className="bfc-overlay__identity-copy">BRIAN <strong>FOCUS</strong><small>{vi ? 'KHÔNG GIAN TẬP TRUNG' : 'IMMERSIVE SPACE'}</small></span>
      </div>
      {scene.mediaType === 'default' && personalDim !== null ?
        <div className="bfc-focus-scene-veil" aria-hidden="true"
          style={{ backgroundColor: 'rgba(2,8,22,' + (personalDim / 100) + ')' }} /> : null}
      <div className="bfc-focus-header-actions">
      {!sceneEditorOpen && !effectsOpen ? <button type="button" className="bfc-overlay__effects"
        ref={effectsTriggerRef} onClick={() => setEffectsOpen(true)}
        aria-label={vi ? 'Mở kho hiệu ứng chuyển động Focus' : 'Open Focus effects library'}>
        <Clapperboard size={17} aria-hidden="true"/>
        <span>{vi ? 'Hiệu ứng' : 'Effects'}</span>
      </button> : null}
      {canManage && !sceneEditorOpen && !effectsOpen ? <button className="bfc-overlay__edit" type="button"
        onClick={() => setSceneEditorOpen(true)}
        aria-label={vi ? 'Tùy chỉnh nền Focus cho mọi tài khoản' : 'Edit shared Focus scene'}>
        <ImagePlus size={17} aria-hidden="true"/>
        <span>{vi ? 'Đổi nền' : 'Change scene'}</span>
      </button> : null}
      {scene.mediaType === 'default' && <button className="bfc-overlay__motion" type="button"
        aria-pressed={motionEnabled}
        onClick={() => setMotionEnabled(value => !value)}
        title={vi ? (motionEnabled ? 'Tạm dừng chuyển động' : 'Bật chuyển động') : (motionEnabled ? 'Pause motion' : 'Resume motion')}>
        {motionEnabled ? <Pause size={15} aria-hidden="true" /> : <Waves size={15} aria-hidden="true" />}
        <span>{vi ? (motionEnabled ? 'Tạm dừng chuyển động' : 'Bật chuyển động') : (motionEnabled ? 'Pause motion' : 'Resume motion')}</span>
      </button>}
      {!sceneEditorOpen && !effectsOpen ? <button type="button" className="bfc-focus-header__timer"
        aria-label={vi ? 'Mở đồng hồ tập trung Pomodoro' : 'Open Focus timer'}
        onClick={() => setActiveTool(value => value === 'timer' ? '' : 'timer')}>
        <TimerReset size={17} aria-hidden="true"/>
        <span>{vi ? 'Hẹn giờ' : 'Focus timer'}</span>
      </button> : null}
      <button className="bfc-overlay__close" type="button" ref={dismissRef}
        aria-label={vi ? 'Đóng chế độ tập trung' : 'Close Focus mode'}
        onClick={onClose}>
        <X size={20} strokeWidth={1.9} aria-hidden="true"/>
        <span>{vi ? 'Đóng' : 'Close'}</span>
        <kbd>Esc</kbd>
      </button>
      </div>
      <div className="bfc-overlay__center">
        <HTCSenseClock language={language} weather={weather} onRefreshWeather={onRefreshWeather}/>
      </div>
      <FocusWorkspace currentUser={currentUser} language={language}
        activeTool={activeTool} onChangeTool={setActiveTool}
        onBrightnessChange={setPersonalDim}
        onDndChange={setQuiet}
        onSoundscapeActiveChange={setSoundscapeActive}/>
      {sceneError && canManage ? <span className="bfc-overlay__scene-sync-warning" role="status">
        {vi ? 'Nền chưa được đồng bộ' : 'Scene sync unavailable'}
      </span> : null}
      {effectsOpen ? <FocusEffectsLibrary language={language} current={transitions}
        onApply={onEffectsChange} onClose={() => setEffectsOpen(false)} openerRef={effectsTriggerRef} /> : null}
      {sceneEditorOpen && canManage ? <FocusSceneEditor key={scene.updatedAt || 'default'}
        language={language} currentUser={currentUser} scene={scene}
        onPublished={onScenePublished} onClose={() => setSceneEditorOpen(false)}/> : null}
      <div className="bfc-overlay__bottom" aria-hidden="true">
        <span className="bfc-overlay__equalizer"><i/><i/><i/><i/><i/></span>
        <span>{vi ? 'THƯ GIÃN  ·  TẬP TRUNG  ·  SÁNG TẠO' : 'BREATHE  ·  FOCUS  ·  CREATE'}</span>
        <span className="bfc-overlay__bottom-line" />
      </div>
    </div>, document.body,
  );
}
