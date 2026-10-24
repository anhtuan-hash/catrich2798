import React from 'react';
import { MoonStar, X } from 'lucide-react';

export default function FocusBubble({ active = false, onClick, buttonRef, language = 'vi' }) {
  const vi = language !== 'en';
  const label = active
    ? (vi ? 'Thoát chế độ tập trung' : 'Exit focus mode')
    : (vi ? 'Mở chế độ tập trung' : 'Enter focus mode');
  return (
    <button type="button" id="bfc-focus-trigger" ref={buttonRef} data-bfc-focus-trigger="true"
      className={`bfc-bubble${active ? ' is-active' : ''}`}
      aria-label={label} title={label}
      aria-pressed={active} aria-hidden={active ? true : undefined} tabIndex={active ? -1 : 0} onClick={onClick}>
      {active ? <X size={23} strokeWidth={1.8} aria-hidden="true"/>
        : <MoonStar size={26} strokeWidth={1.65} aria-hidden="true"/>}
    </button>
  );
}
