import React, { useRef, useState } from 'react';
import FocusBubble from './FocusBubble.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import './BrianFocus.css';

/**
 * Dashboard-only ambient display.
 * React state is local to Focus; opening it never unmounts or navigates Dashboard.
 */
export default function BrianFocus({ language = 'vi', weather, weatherDescription, disabled = false }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <>
      {!open && !disabled ? <FocusBubble buttonRef={triggerRef} language={language}
        onClick={() => { if (!disabled) setOpen(true); }} /> : null}
      {open ? <FocusOverlay language={language} weather={weather}
        weatherDescription={weatherDescription}
        onClose={() => setOpen(false)} returnFocusRef={triggerRef} /> : null}
    </>
  );
}
