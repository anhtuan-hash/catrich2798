import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FocusBubble from './FocusBubble.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import './BrianFocus.css';

/**
 * Focus lives on Dashboard but its ONLY floating trigger is portalled to body.
 * This escapes transformed/scaled Dashboard sections that otherwise rebase
 * position:fixed onto a news card instead of the viewport (mobile Safari).
 */
export default function BrianFocus({ language = 'vi', weather, weatherDescription, disabled = false }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const button = (!disabled || open) ? (
    <FocusBubble buttonRef={triggerRef} language={language} active={open}
      onClick={() => {
        if (!disabled || open) setOpen(value => !value);
      }}/>
  ) : null;

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(button, document.body) : null}
      {open ? (
        <FocusOverlay
          onClose={() => setOpen(false)}
          returnFocusRef={triggerRef}
          language={language}
          weather={weather}
          weatherDescription={weatherDescription}
        />
      ) : null}
    </>
  );
}
