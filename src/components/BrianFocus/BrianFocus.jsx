import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusBubble from './FocusBubble.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import FocusYoutubeBackground from './FocusYoutubeBackground.jsx';
import usePersistentFocusYoutube from './usePersistentFocusYoutube.jsx';
import useFocusWeather from './useFocusWeather.js';
import useFocusScene from './useFocusScene.js';
import useFocusTimer from './useFocusTimer.js';
import useFocus7Data from './useFocus7Data.js';
import useFocus7Flow from './useFocus7Flow.js';
import { readFocusTransitions, writeFocusTransitions, FOCUS_TRANSITION_STORAGE_KEY } from './FocusTransitionLibrary.js';
import { startFocusExit } from './focusExitMotion.js';
import { startFocusEnter } from './focusEnterMotion.js';
import './BrianFocus.css';
import './BrianFocusCosmic.css';
import './BrianFocusPremium.css';
import './BrianFocusLive.css';
import './BrianFocusScene.css';
import './BrianFocusTransitions.css';
import './FocusEffectsLibrary.css';
import './FocusTransitionVariants.css';
import './BrianFocusWorkspace.css';
import './BrianFocusAtelier.css';
import './BrianFocusPersistentYoutube.css';
import './BrianFocusYoutubePlaylist.css';
import './BrianFocus6.css';
import './BrianFocus7.css';
import { GLOBAL_FLOATING_ACTION_EVENT, FLOATING_ACTION_IDS } from '../../utils/unifiedFloatingDock.js';

/** One global Focus trigger and overlay; the underlying app route stays mounted. */
export default function BrianFocus({ currentUser, language = 'vi', performance = 'balanced', dockManaged = false, dockTriggerRef }) {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [transitions, setTransitions] = useState(readFocusTransitions);
  const triggerRef = useRef(null);
  const exitPendingRef = useRef(false);
  // Freeze the selected entrance per opening; changing gallery settings while
  // already in Focus must not replay the opening animation.
  const enteredWithEffectRef = useRef(transitions.enter);
  const { weather, refresh } = useFocusWeather(open);
  const { scene, setScene, error: sceneError } = useFocusScene(open, currentUser?.id);
  const {data:focus7,update:update7} = useFocus7Data(currentUser?.id);
  const focus7UpdateRef=useRef(update7);focus7UpdateRef.current=update7;
  const focus7RecordRef=useRef(focus7);focus7RecordRef.current=focus7;
  const timerLengthRef=useRef(25);
  const [completionToken,setCompletionToken]=useState(0);
  const [videoDeadline,setVideoDeadline]=useState(0);
  const mediaScene=focus7.videoOverride
    ? {...scene,mediaType:'youtube',mediaPath:'youtube:'+focus7.videoOverride}
    : scene;
  const choosePersonalVideo=id=>{
    update7({videoOverride:id});
    setVideoDeadline(id&&focus7.stopAfterMinutes>0?Date.now()+focus7.stopAfterMinutes*60000:0);
  };
  const sessionDay = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const completedKey = 'bfc-completed-v6:' + String(currentUser?.id || 'guest') + ':' + sessionDay();
  const readCompleted = () => { try {return Math.max(0,Number(localStorage.getItem(completedKey))||0);} catch {return 0;} };
  const [completedSessions,setCompletedSessions] = useState(readCompleted);
  const timerModeRef = useRef('pomodoro');
  useEffect(()=>setCompletedSessions(readCompleted()),[completedKey]);
  const onTimerComplete = useCallback(() => {
    const focusSession = ['pomodoro','deep','custom'].includes(timerModeRef.current);
    const key = 'bfc-completed-v6:' + String(currentUser?.id || 'guest') + ':' + sessionDay();
    setCompletionToken(n=>n+1);
    if(focusSession){
      try{
        const next=(Number(localStorage.getItem(key))||0)+1;
        localStorage.setItem(key,String(next));
        setCompletedSessions(next);
      } catch {setCompletedSessions(count=>count+1);}
      focus7UpdateRef.current({sessions:[...focus7RecordRef.current.sessions,{at:Date.now(),minutes:timerLengthRef.current}].slice(-1000)});
    }
    // A timer was started by a user gesture. Any browser audio permission
    // restrictions are respected; failure must not affect the timer.
    try{
      const Context=window.AudioContext||window.webkitAudioContext;
      if(Context){
        const ctx=new Context(), osc=ctx.createOscillator(), gain=ctx.createGain();
        osc.type='sine';osc.frequency.value=660;
        gain.gain.setValueAtTime(.0001,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.038,ctx.currentTime+.025);
        gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.48);
        osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.5);
        osc.onended=()=>ctx.close().catch(()=>{});
      }
    }catch{}
  },[currentUser?.id]);
  // Keep the timer hook mounted even when Focus overlay is closed.
  const timerController = useFocusTimer(currentUser?.id,onTimerComplete);
  timerModeRef.current = timerController.timer.mode;
  timerLengthRef.current=timerController.timer.minutes;
  const focusFlow = useFocus7Flow(currentUser?.id,timerController,completionToken);
  const {
    player: persistentYoutubePlayer,
    session: youtubeSession,
    controls: youtubeControls,
  } = usePersistentFocusYoutube({ scene:mediaScene, focusOpen: open, userId: currentUser?.id });
  useEffect(()=>{
    if(!videoDeadline)return undefined;
    const remaining=videoDeadline-Date.now();
    if(remaining<=0){youtubeControls.stop();setVideoDeadline(0);return undefined;}
    const timeout=window.setTimeout(()=>{youtubeControls.stop();setVideoDeadline(0);},remaining);
    return()=>window.clearTimeout(timeout);
  },[videoDeadline]);
  const setEffectChoice = choice => setTransitions(writeFocusTransitions(choice));

  const openFocus = () => {
    if (exitPendingRef.current) return;
    enteredWithEffectRef.current = transitions.enter;
    setExiting(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!dockManaged) return undefined;
    const handler = event => {
      if (event.detail?.id === FLOATING_ACTION_IDS.focus && !open) openFocus();
    };
    window.addEventListener(GLOBAL_FLOATING_ACTION_EVENT, handler);
    return () => window.removeEventListener(GLOBAL_FLOATING_ACTION_EVENT, handler);
  }, [dockManaged, open, transitions.enter]);

  const closeFocus = () => {
    if (!open || exitPendingRef.current) return;
    exitPendingRef.current = true;
    if (transitions.exit === 'none') {
      exitPendingRef.current = false;
      setExiting(false);
      setOpen(false);
      return;
    }
    setExiting(true);
  };

  // Enter through the same browser animation engine used by Close.
  // This layout effect sees FocusOverlay's portal immediately after mount
  // and starts before the browser paints a frame, preventing a sudden flash.
  useLayoutEffect(() => {
    if (!open || exiting) return undefined;
    const overlay = document.querySelector('.bfc-overlay[data-focus-transition="entering"]');
    const reducedMotion = ['low', 'minimal'].includes(performance) ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const animation = startFocusEnter(overlay, enteredWithEffectRef.current, { reducedMotion });
    // Keep fill-mode until exit starts, so the transition never snaps.
    return () => animation?.cancel?.();
  }, [open, exiting]);

  // Play the chosen effect AFTER React mounts the exiting class, but BEFORE
  // painting. Do not remove the Focus portal until the real animation finishes.
  useLayoutEffect(() => {
    if (!open || !exiting) return undefined;
    const overlay = document.querySelector('.bfc-overlay[data-focus-transition="exiting"]');
    const reducedMotion = ['low', 'minimal'].includes(performance) ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const animation = startFocusExit(overlay, transitions.exit, { reducedMotion });
    let finished = false;
    let cancelled = false;
    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      exitPendingRef.current = false;
      setOpen(false);
      setExiting(false);
    };
    // Fallback only for throttled tabs / unsupported Web Animations API.
    const watchdog = window.setTimeout(finish, reducedMotion ? 750 : 1500);
    Promise.resolve(animation?.finished).then(finish, finish);
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      animation?.cancel?.();
    };
  }, [open, exiting, performance, transitions.exit]);

  // Keep the page mounted and slightly subdued while Focus is active.
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('bfc-focus-session');
    return () => document.body.classList.remove('bfc-focus-session');
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle('bfc-focus-session--closing', open && exiting);
    return () => document.body.classList.remove('bfc-focus-session--closing');
  }, [open, exiting]);

  useEffect(() => {
    const onStorage = event => {
      if (event.key === FOCUS_TRANSITION_STORAGE_KEY) setTransitions(readFocusTransitions());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => () => {
    document.body.classList.remove('bfc-focus-session', 'bfc-focus-session--closing');
  }, []);

  const button = dockManaged ? null : (
    <FocusBubble buttonRef={triggerRef} language={language} active={open}
      onClick={() => (open ? closeFocus() : openFocus())} />
  );
  return (
    <>
      {persistentYoutubePlayer}
      {typeof document !== 'undefined' ? createPortal(button, document.body) : null}
      {!open && youtubeSession.mounted && mediaScene.mediaType === 'youtube' && typeof document !== 'undefined'
        ? createPortal(<FocusYoutubeBackground
            scene={mediaScene} session={youtubeSession} controls={youtubeControls}
            language={language} compact onOpenFocus={openFocus}/>, document.body)
        : null}
      {open ? (
        <FocusOverlay currentUser={currentUser} scene={mediaScene} sharedScene={scene} onScenePublished={setScene} sceneError={sceneError}
          focus7={focus7} update7={update7} focusFlow={focusFlow} choosePersonalVideo={choosePersonalVideo}
          youtubeSession={youtubeSession} youtubeControls={youtubeControls}
          timerController={timerController} completedSessions={completedSessions}
          language={language} weather={weather} exiting={exiting} transitions={transitions} onEffectsChange={setEffectChoice}
          onRefreshWeather={refresh} onClose={closeFocus}
          returnFocusRef={dockManaged ? dockTriggerRef : triggerRef} performance={performance} />
      ) : null}
    </>
  );
}
