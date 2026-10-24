import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusBubble from './FocusBubble.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import useFocusWeather from './useFocusWeather.js';
import useFocusScene from './useFocusScene.js';
import { readFocusTransitions, writeFocusTransitions, FOCUS_TRANSITION_STORAGE_KEY } from './FocusTransitionLibrary.js';
import './BrianFocus.css';
import './BrianFocusCosmic.css';
import './BrianFocusPremium.css';
import './BrianFocusLive.css';
import './BrianFocusScene.css';
import './BrianFocusTransitions.css';
import './FocusEffectsLibrary.css';
import './FocusTransitionVariants.css';

// Matches the exit timeline in BrianFocusTransitions.css.
// The overlay stays mounted until the exit animation has completed.
const FOCUS_EXIT_DURATION_MS = 490;

/** One global Focus trigger and overlay; the underlying app route stays mounted. */
export default function BrianFocus({ currentUser, language = 'vi', performance = 'balanced' }) {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [transitions, setTransitions] = useState(readFocusTransitions);
  const triggerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const exitPendingRef = useRef(false);
  const { weather, refresh } = useFocusWeather(open);
  const { scene, setScene, error: sceneError } = useFocusScene(open, currentUser?.id);
  const setEffectChoice = choice => setTransitions(writeFocusTransitions(choice));

  const openFocus = () => {
    if (exitPendingRef.current) return;
    setExiting(false);
    setOpen(true);
  };

  const closeFocus = () => {
    if (!open || exitPendingRef.current) return;
    exitPendingRef.current = true;
    const reduceMotion = ['low', 'minimal'].includes(performance) ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (reduceMotion || transitions.exit === 'none') {
      exitPendingRef.current = false;
      setExiting(false);
      setOpen(false);
      return;
    }
    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      exitPendingRef.current = false;
      setExiting(false);
      setOpen(false);
    }, FOCUS_EXIT_DURATION_MS);
  };

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
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    document.body.classList.remove('bfc-focus-session', 'bfc-focus-session--closing');
  }, []);

  const button = (
    <FocusBubble buttonRef={triggerRef} language={language} active={open}
      onClick={() => (open ? closeFocus() : openFocus())} />
  );
  return (
    <>
      {typeof document !== 'undefined' ? createPortal(button, document.body) : null}
      {open ? (
        <FocusOverlay currentUser={currentUser} scene={scene} onScenePublished={setScene} sceneError={sceneError}
          language={language} weather={weather} exiting={exiting} transitions={transitions} onEffectsChange={setEffectChoice}
          onRefreshWeather={refresh} onClose={closeFocus}
          returnFocusRef={triggerRef} performance={performance} />
      ) : null}
    </>
  );
}
