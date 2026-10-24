import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Waves, Pause, ImagePlus, Clapperboard, TimerReset, SlidersHorizontal, Maximize2, Minimize2, EyeOff, WandSparkles, Presentation } from 'lucide-react';
import HTCSenseClock from './HTCSenseClock.jsx';
import CosmicAmbient from './CosmicAmbient.jsx';
import FocusSceneBackground from './FocusSceneBackground.jsx';
import FocusYoutubeBackground from './FocusYoutubeBackground.jsx';
import FocusSceneEditor from './FocusSceneEditor.jsx';
import FocusEffectsLibrary from './FocusEffectsLibrary.jsx';
import FocusWorkspace from './FocusWorkspace.jsx';
import Focus6Appearance from './Focus6Appearance.jsx';
import useFocusAppearance from './useFocusAppearance.js';
import useFocusSoundMixer from './useFocusSoundMixer.js';
import Focus7Studio from './Focus7Studio.jsx';
import Focus7Particles from './Focus7Particles.jsx';
import { canEditFocusScene } from './focusSceneService.js';

/** Portal keeps the real Dashboard mounted and interactive state intact. */
export default function FocusOverlay({ currentUser, scene, onScenePublished, sceneError, onClose, language, weather, onRefreshWeather, returnFocusRef, performance = 'balanced', exiting = false, transitions = { enter: 'portal', exit: 'portal' }, onEffectsChange, youtubeSession, youtubeControls, timerController, completedSessions=0, focus7, update7, focusFlow, choosePersonalVideo, sharedScene }) {
  const [motionEnabled, setMotionEnabled] = useState(() => (
    !['low', 'minimal'].includes(performance) &&
    !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ));
  const [sceneEditorOpen, setSceneEditorOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [atelierOpen,setAtelierOpen]=useState(false);
  const [classroom,setClassroom]=useState(false);
  const mixer=useFocusSoundMixer(currentUser?.id);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);
  const controlsTimerRef = useRef(null);
  const appearanceButtonRef = useRef(null);
  const { appearance, setAppearance } = useFocusAppearance(currentUser?.id);
  useEffect(()=>{
    if(scene.mediaType!=='youtube')return undefined;
    // The one persistent iframe is owned by BrianFocus (outside this portal).
    // Visual-only filters must never remount it or modify its src/playback.
    const iframe=document.querySelector('.bfc-persistent-youtube.is-visible .bfc-youtube-background__player');
    if(!iframe)return undefined;
    const previous=iframe.style.filter;
    const sat=(appearance.saturation/100) * (appearance.backdrop==='dreamy'?1.18:appearance.backdrop==='dark'?.8:appearance.backdrop==='cinema'?.91:1);
    const contrast=(appearance.contrast/100) * (appearance.backdrop==='cinema'?1.1:appearance.backdrop==='dark'?1.11:appearance.backdrop==='dreamy'?.93:1);
    const brightness=appearance.backdrop==='dark'?.74:1;
    iframe.style.filter='saturate('+sat.toFixed(2)+') contrast('+contrast.toFixed(2)+') brightness('+brightness+') blur('+appearance.blur+'px)';
    return ()=>{iframe.style.filter=previous;};
  },[scene.mediaType,appearance.saturation,appearance.contrast,appearance.blur,appearance.backdrop]);
  const [activeTool, setActiveTool] = useState('');
  const [personalDim, setPersonalDim] = useState(null);
  const [quiet, setQuiet] = useState(false);
  const [fullscreen,setFullscreen] = useState(false);
  const [immersiveOnce,setImmersiveOnce] = useState(false);
  const [fullscreenError,setFullscreenError] = useState('');
  const [soundscapeActive, setSoundscapeActive] = useState(false);
  const handleSoundscapeActive = useCallback(value => {
    setSoundscapeActive(value);
    if (value) youtubeControls?.mute?.();
  }, [youtubeControls?.mute]);
  const activeToolRef = useRef('');
  activeToolRef.current = activeTool;
  const effectsTriggerRef = useRef(null);
  const effectsOpenRef = useRef(false);
  effectsOpenRef.current = effectsOpen;
  const atelierRef=useRef(false);atelierRef.current=atelierOpen;
  const appearanceOpenRef = useRef(false);
  appearanceOpenRef.current = appearanceOpen;
  const sceneEditorRef = useRef(false);
  sceneEditorRef.current = sceneEditorOpen;
  // Applying a preset while Focus is open must not replay its entrance.
  const enteredWithEffect = useRef(transitions.enter);
  useEffect(()=>{
    const change=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange',change);
    return()=>document.removeEventListener('fullscreenchange',change);
  },[]);
  const toggleFullscreen = async () => {
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else await dialogRef.current?.requestFullscreen?.();
      setFullscreenError('');
    }catch{
      setFullscreenError(language === 'en' ? 'Fullscreen is unavailable in this browser.' : 'Trình duyệt không cho phép toàn màn hình.');
    }
  };
  const canManage = canEditFocusScene(currentUser);
  const dialogRef = useRef(null);
  const dismissRef = useRef(null);
  const closeHandlerRef = useRef(onClose);
  closeHandlerRef.current = onClose;
  const controlsBusy = appearanceOpen || atelierOpen || effectsOpen || sceneEditorOpen || Boolean(activeTool) || quickOpen;
  const wakeControls = () => {
    if (exiting) return;
    setControlsVisible(true);
    if (immersiveOnce) setImmersiveOnce(false);
    window.clearTimeout(controlsTimerRef.current);
    if (appearance.autoHide && !controlsBusy) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 5000);
    }
  };
  useEffect(() => {
    wakeControls();
    return () => window.clearTimeout(controlsTimerRef.current);
  }, [appearance.autoHide, controlsBusy, exiting]);
  useEffect(() => {
    const keyboardActivity = event => {
      if (['Tab','Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key)) wakeControls();
    };
    document.addEventListener('keydown',keyboardActivity);
    return () => document.removeEventListener('keydown',keyboardActivity);
  }, [appearance.autoHide, controlsBusy, exiting]);

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
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    const keydown = (event) => {
      if (event.key === 'Escape') {
        if (document.fullscreenElement) {
          event.preventDefault();
          document.exitFullscreen?.().catch(()=>{});
          return;
        }
        event.preventDefault();
        if (atelierRef.current) setAtelierOpen(false);
        else if (appearanceOpenRef.current) setAppearanceOpen(false);
        else if (effectsOpenRef.current) setEffectsOpen(false);
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
  const dim = personalDim === null ? appearance.dim : personalDim;
  const displayScene = { ...scene, dimPercent: dim };
  const hour=new Date().getHours();
  const activeMood=focus7.mood==='auto'
    ? (hour<7?'dawn':hour<16?'golden':hour<19?'twilight':'midnight')
    : focus7.mood;
  const cinemaStyle = {
    '--bfc6-saturation': appearance.saturation / 100,
    '--bfc6-contrast': appearance.contrast / 100,
    '--bfc6-blur': appearance.blur + 'px',
    '--bfc6-scale': appearance.scale / 100,
  };

  return createPortal(
    <div className={`bfc-overlay${(!motionEnabled || ['low','minimal'].includes(performance)) ? ' bfc-overlay--low-motion' : ''}${['low','minimal'].includes(performance) ? ' bfc-overlay--entry-lite' : ''}${canManage ? ' bfc-overlay--manager' : ''}${scene.mediaType === 'youtube' ? ' bfc-overlay--youtube' : ''}${sceneEditorOpen ? ' is-editor-open' : ''}${effectsOpen ? ' is-effects-open' : ''}${activeTool ? ' is-tools-open' : ''}${quiet ? ' bfc-overlay--quiet' : ''}${appearanceOpen ? ' is-appearance-open' : ''}${atelierOpen?' is-atelier7-open':''}${classroom?' bfc7-classroom':''}${focus7.compactDock?' bfc7-compact-dock':''}${(!controlsVisible && appearance.autoHide && !controlsBusy) || immersiveOnce ? ' bfc-atelier--idle' : ''} bfc-atelier bfc-atelier--${appearance.clockMode}${exiting ? ' bfc-overlay--exiting' : ''}`} role="dialog" aria-modal="true"
      aria-label={vi ? 'Chế độ tập trung Brian Focus' : 'Brian Focus mode'}
      aria-owns="bfc-focus-trigger"
      data-focus-transition={exiting ? 'exiting' : 'entering'}
      data-focus-enter={enteredWithEffect.current}
      data-focus-exit={transitions.exit}
      ref={dialogRef}
      style={cinemaStyle}
      data-bfc6-backdrop={appearance.backdrop}
      data-bfc7-mood={activeMood}
      data-bfc7-clock={focus7.clock}
      tabIndex={-1}
      onPointerMove={wakeControls}
      onPointerDown={wakeControls}>
      {scene.mediaType === 'default'
        ? <CosmicAmbient motionEnabled={motionEnabled} />
        : scene.mediaType === 'youtube'
          ? <div className="bfc-focus-youtube-shade" aria-hidden="true"
              style={{ backgroundColor: 'rgba(2,8,22,' + (Math.max(0,Math.min(85,Number(displayScene.dimPercent)||0))/100) + ')' }}/>
          : <FocusSceneBackground scene={displayScene} language={language} motionEnabled={motionEnabled} />}
      {activeMood!=='off'&&<div className="bfc7-light-layer" style={{'--bfc7-tint':focus7.tint/100}} aria-hidden="true"/>}
      <Focus7Particles mode={focus7.particle} density={focus7.density} performance={performance}/>
      {scene.mediaType === 'youtube' ? <FocusYoutubeBackground
        scene={displayScene} language={language}
        session={youtubeSession} controls={youtubeControls}/> : null}
      <div className="bfc-overlay__identity" aria-hidden="true">
        <span className="bfc-overlay__identity-mark">B<span>✦</span></span>
        <span className="bfc-overlay__identity-copy">BRIAN <strong>FOCUS</strong><small>{vi ? 'KHÔNG GIAN TẬP TRUNG' : 'IMMERSIVE SPACE'}</small></span>
      </div>
      {scene.mediaType === 'default' ?
        <div className="bfc-focus-scene-veil" aria-hidden="true"
          style={{ backgroundColor: 'rgba(2,8,22,' + (dim / 100) + ')' }} /> : null}
      <div className="bfc-focus-header-actions">
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen && !atelierOpen ? <button type="button" className="bfc7-open-studio"
        onClick={()=>setAtelierOpen(true)} aria-label={vi?'Mở Living Atelier 7.0':'Open Living Atelier 7.0'} title="Living Atelier">
        <WandSparkles size={18}/></button>:null}
      <button type="button" className="bfc7-classroom-toggle" onClick={()=>{setClassroom(x=>!x);setAtelierOpen(false);setActiveTool('');}}
        aria-pressed={classroom} aria-label={classroom?(vi?'Thoát trình chiếu':'Exit classroom'):(vi?'Chế độ trình chiếu':'Classroom mode')}>
        <Presentation size={18}/></button>
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button type="button" className="bfc-atelier__appearance-action"
        ref={appearanceButtonRef} onClick={() => setAppearanceOpen(true)}
        aria-label={vi ? 'Chọn giao diện Focus' : 'Choose Focus appearance'}
        title={vi ? 'Giao diện Focus' : 'Focus appearance'}>
        <SlidersHorizontal size={17} aria-hidden="true"/>
        <span>{vi ? 'Giao diện' : 'Appearance'}</span>
      </button> : null}
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button type="button" className="bfc-overlay__effects"
        ref={effectsTriggerRef} onClick={() => setEffectsOpen(true)}
        aria-label={vi ? 'Mở kho hiệu ứng chuyển động Focus' : 'Open Focus effects library'}>
        <Clapperboard size={17} aria-hidden="true"/>
        <span>{vi ? 'Hiệu ứng' : 'Effects'}</span>
      </button> : null}
      {canManage && !sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button className="bfc-overlay__edit" type="button"
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
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button type="button" className="bfc6-fullscreen"
        onClick={toggleFullscreen} aria-label={fullscreen ? (vi?'Thoát toàn màn hình':'Exit fullscreen') : (vi?'Toàn màn hình':'Fullscreen')}
        title={fullscreen ? (vi?'Thoát toàn màn hình':'Exit fullscreen') : (vi?'Toàn màn hình':'Fullscreen')}>
        {fullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
      </button> : null}
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button type="button" className="bfc6-immersive"
        onClick={()=>{setControlsVisible(false);setImmersiveOnce(true);}}
        aria-label={vi?'Ẩn tất cả công cụ':'Hide all controls'} title={vi?'Không gian điện ảnh':'Cinema only'}>
        <EyeOff size={17}/>
      </button> : null}
      {!sceneEditorOpen && !effectsOpen && !appearanceOpen ? <button type="button" className="bfc-focus-header__timer"
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
        <HTCSenseClock mode={focus7.clock} clock7={focus7} scale={appearance.scale} hour12={appearance.hour12}
          showSeconds={appearance.showSeconds} language={language} weather={weather} onRefreshWeather={onRefreshWeather}/>
        {!classroom&&appearance.intention && <p className="bfc6-intention">{appearance.intention}</p>}
        {classroom&&<p className="bfc7-classroom-timer" role="timer">{timerController.formatted}</p>}
      </div>
      {!classroom&&<FocusWorkspace currentUser={currentUser} language={language} appearance={appearance}
        onAppearanceChange={setAppearance} mixer={mixer} onManualTimerAction={focusFlow.stop}
        timerController={timerController} completedSessions={completedSessions}
        activeTool={activeTool} onChangeTool={setActiveTool}
        onBrightnessChange={setPersonalDim}
        onDndChange={setQuiet}
        onSoundscapeActiveChange={handleSoundscapeActive}
        onQuickToolsOpenChange={setQuickOpen}/>}
      {fullscreenError ? <span className="bfc6-fullscreen-error" role="alert">{fullscreenError}</span> : null}
      {sceneError && canManage ? <span className="bfc-overlay__scene-sync-warning" role="status">
        {vi ? 'Nền chưa được đồng bộ' : 'Scene sync unavailable'}
      </span> : null}
      {atelierOpen&&<Focus7Studio language={language} data={focus7} update={update7} appearance={appearance}
        onAppearance={setAppearance} flow={focusFlow} timer={timerController} mixer={mixer}
        youtubeSession={youtubeSession} youtubeControls={youtubeControls}
        onChooseVideo={choosePersonalVideo} classroom={classroom} onClassroom={setClassroom}
        onClose={()=>setAtelierOpen(false)}/>}
      {appearanceOpen ? <Focus6Appearance language={language} appearance={appearance}
        onChange={patch=>{ if(Object.hasOwn(patch,'dim'))setPersonalDim(null);setAppearance(patch); }} onClose={() => {setAppearanceOpen(false);appearanceButtonRef.current?.focus?.();}}/> : null}
      {effectsOpen ? <FocusEffectsLibrary language={language} current={transitions}
        onApply={onEffectsChange} onClose={() => setEffectsOpen(false)} openerRef={effectsTriggerRef} /> : null}
      {sceneEditorOpen && canManage ? <FocusSceneEditor key={scene.updatedAt || 'default'}
        language={language} currentUser={currentUser} scene={sharedScene||scene}
        onPublished={onScenePublished} onClose={() => setSceneEditorOpen(false)}/> : null}
      <div className="bfc-overlay__bottom" aria-hidden="true">
        <span className="bfc-overlay__equalizer"><i/><i/><i/><i/><i/></span>
        <span>{vi ? 'THƯ GIÃN  ·  TẬP TRUNG  ·  SÁNG TẠO' : 'BREATHE  ·  FOCUS  ·  CREATE'}</span>
        <span className="bfc-overlay__bottom-line" />
      </div>
    </div>, document.body,
  );
}
