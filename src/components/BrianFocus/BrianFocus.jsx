import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusBubble from './FocusBubble.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import useFocusWeather from './useFocusWeather.js';
import './BrianFocus.css';
import './BrianFocusCosmic.css';

/** One global Focus trigger and overlay; the underlying app route stays mounted. */
export default function BrianFocus({ language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { weather, refresh } = useFocusWeather(open);

  const button = (
    <FocusBubble buttonRef={triggerRef} language={language} active={open}
      onClick={() => setOpen(value => !value)} />
  );
  return (
    <>
      {typeof document !== 'undefined' ? createPortal(button, document.body) : null}
      {open ? (
        <FocusOverlay language={language} weather={weather}
          onRefreshWeather={refresh} onClose={() => setOpen(false)}
          returnFocusRef={triggerRef} />
      ) : null}
    </>
  );
}
