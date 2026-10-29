import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PhotoTransitionStage.css';

const DURATIONS = { fade: 1100, slide: 1150, zoom: 1500, reveal: 1250, blur: 1350 };
const MODES = new Set(Object.keys(DURATIONS));
const EASING = 'cubic-bezier(.22,.76,.16,1)';

function transitionFrames(mode, direction) {
  const sign = direction < 0 ? -1 : 1;
  // Animate layers without enlarging the artwork beyond its contain box:
  // the whole illustration stays readable from edge to edge.
  switch (mode) {
    case 'slide':
      return {
        incoming: [
          { opacity: .52, transform: 'translateX(' + (sign * 3) + '%)' },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        outgoing: [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: .2, transform: 'translateX(' + (-sign * 3) + '%)' },
        ],
      };
    case 'zoom':
      return {
        incoming: [{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }],
        outgoing: [{ opacity: 1, transform: 'scale(1)' }, { opacity: .16, transform: 'scale(.98)' }],
      };
    case 'reveal':
      return {
        incoming: [
          { opacity: .38, transform: 'translateX(' + (sign * 1.5) + '%) scale(.992)' },
          { opacity: 1, transform: 'translateX(0) scale(1)' },
        ],
        outgoing: [{ opacity: 1 }, { opacity: .45 }],
      };
    case 'blur':
      // Never blur the submitted artwork itself. The background is softly
      // blurred; the painting fades in sharply at its original proportions.
      return {
        incoming: [{ opacity: .1, filter: 'brightness(.8)' }, { opacity: 1, filter: 'brightness(1)' }],
        outgoing: [{ opacity: 1 }, { opacity: .1 }],
      };
    default:
      return {
        incoming: [{ opacity: 0 }, { opacity: 1 }],
        outgoing: [{ opacity: 1 }, { opacity: .08 }],
      };
  }
}

/**
 * Decoded-image, two-layer transition engine shared by public Home and Gallery.
 * The old image stays visible until the next one is ready, and both layers are
 * animated via Web Animations API (CSS keyframes remain as a fallback).
 */
export default function PhotoTransitionStage({ photo, src, alt = '', mode = 'fade', direction = 1 }) {
  const effect = MODES.has(mode) ? mode : 'fade';
  const item = photo?.id && src ? { id: photo.id, src, alt } : null;
  const [frames, setFrames] = useState(() => ({ current: item, previous: null, token: 0 }));
  const currentLayer = useRef(null);
  const previousLayer = useRef(null);
  const webAnimationsAvailable = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

  // Decode first, then replace the stage: no image flash even on a cold cache.
  useEffect(() => {
    if (!item) {
      setFrames((old) => old.current ? { current: null, previous: null, token: old.token + 1 } : old);
      return undefined;
    }
    let cancelled = false;
    const show = () => {
      if (cancelled) return;
      setFrames((old) => {
        if (old.current?.id === item.id && old.current?.src === item.src) return old;
        return { current: item, previous: old.current, token: old.token + 1 };
      });
    };
    const preload = new Image();
    preload.src = item.src;
    if (typeof preload.decode === 'function') {
      void preload.decode().then(show, show);
    } else if (preload.complete) {
      show();
    } else {
      preload.onload = show;
      preload.onerror = show;
    }
    return () => { cancelled = true; preload.onload = null; preload.onerror = null; };
  }, [item?.id, item?.src]);

  useLayoutEffect(() => {
    if (!frames.previous) return undefined;
    const duration = DURATIONS[effect];
    const reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const clear = () => setFrames((old) => old.token === frames.token
      ? { ...old, previous: null } : old);
    if (reducedMotion) {
      clear();
      return undefined;
    }
    const incoming = currentLayer.current;
    const outgoing = previousLayer.current;
    const animations = [];
    if (webAnimationsAvailable && incoming && outgoing) {
      const sequence = transitionFrames(effect, direction);
      animations.push(incoming.animate(sequence.incoming, {
        duration, easing: EASING, fill: 'both',
      }));
      animations.push(outgoing.animate(sequence.outgoing, {
        duration, easing: EASING, fill: 'both',
      }));
    }
    const timer = window.setTimeout(clear, duration + 80);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [frames.token, frames.previous?.id, effect, direction, webAnimationsAvailable]);

  if (!frames.current) return null;

  const layer = (value, type) => <div
    key={type + ':' + value.id + ':' + frames.token}
    className={'bss-motion__layer bss-motion__layer--' + type}
    ref={type === 'in' ? currentLayer : previousLayer}
    aria-hidden={type === 'out' ? 'true' : undefined}>
    <div className="bss-motion__ambient" style={{ backgroundImage: 'url("' + value.src + '")' }} aria-hidden="true" />
    <img className="bss-motion__image" src={value.src} alt={type === 'out' ? '' : (value.alt || alt)} draggable="false" />
  </div>;

  return <div className={'bss-motion bss-motion--' + effect + (direction < 0 ? ' bss-motion--reverse' : '')}
    data-transition={effect}
    data-animation={webAnimationsAvailable ? 'waapi' : 'css'}
    data-motion-token={frames.token}
    style={{ '--bss-motion-duration': DURATIONS[effect] + 'ms' }}>
    {frames.previous && layer(frames.previous, 'out')}
    {layer(frames.current, frames.previous ? 'in' : 'still')}
  </div>;
}
