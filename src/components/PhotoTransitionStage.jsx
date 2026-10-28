import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PhotoTransitionStage.css';

const DURATION = { fade: 900, slide: 850, zoom: 1100, reveal: 980, blur: 1050 };
const VALID = new Set(Object.keys(DURATION));

/**
 * Reuses one cinematic, truly overlapping two-frame transition for both the
 * public Home player and the full-screen Photo Story gallery.
 *
 * The outgoing image remains mounted for the entire exit animation. Unlike
 * an animation on a keyed single image, there is never an empty/black frame.
 */
export default function PhotoTransitionStage({ photo, src, alt = '', mode = 'fade', direction = 1 }) {
  const normalized = VALID.has(mode) ? mode : 'fade';
  const incoming = photo && src ? { id: photo.id, src, alt } : null;
  const currentRef = useRef(incoming);
  const [outgoing, setOutgoing] = useState(null);
  const [sequence, setSequence] = useState(0);

  useLayoutEffect(() => {
    const previous = currentRef.current;
    if (previous?.id === incoming?.id && previous?.src === incoming?.src) return;
    currentRef.current = incoming;
    setOutgoing(previous || null);
    setSequence((old) => old + 1);
  }, [incoming?.id, incoming?.src]);

  useEffect(() => {
    if (!outgoing) return undefined;
    const timer = window.setTimeout(() => setOutgoing(null), DURATION[normalized] + 60);
    return () => window.clearTimeout(timer);
  }, [outgoing, normalized, sequence]);

  if (!incoming) return null;
  return (
    <div className={'bss-motion bss-motion--' + normalized + (direction < 0 ? ' bss-motion--reverse' : '')}
      data-transition={normalized} style={{ '--bss-motion-duration': DURATION[normalized] + 'ms' }}>
      {outgoing && <div key={'out-' + outgoing.id + '-' + sequence} className="bss-motion__layer bss-motion__layer--out"
        aria-hidden="true">
        <div className="bss-motion__ambient" style={{ backgroundImage: 'url("' + outgoing.src + '")' }} />
        <img className="bss-motion__image" src={outgoing.src} alt="" draggable="false" />
      </div>}
      <div key={'in-' + incoming.id + '-' + sequence} className={'bss-motion__layer ' + (sequence ? 'bss-motion__layer--in' : 'bss-motion__layer--still')}>
        <div className="bss-motion__ambient" style={{ backgroundImage: 'url("' + incoming.src + '")' }} aria-hidden="true" />
        <img className="bss-motion__image" src={incoming.src} alt={incoming.alt} draggable="false" />
      </div>
    </div>
  );
}
