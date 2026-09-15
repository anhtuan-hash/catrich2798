import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import BrianPulseLogo from './BrianPulseLogo.jsx';
import { writePresentationOverride } from '../device/presentationMode.js';

export default function HomeParticleSignaturePortal({ currentUser }) {
  const [navTarget, setNavTarget] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setNavTarget(null);
      return undefined;
    }

    const resolveTarget = () => {
      const nextTarget = document.querySelector('.brian-nav__actions');
      setNavTarget((current) => (current === nextTarget ? current : nextTarget));
      return Boolean(nextTarget);
    };

    if (resolveTarget()) return undefined;

    const observer = new MutationObserver(() => {
      if (resolveTarget()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currentUser]);

  if (!currentUser || !navTarget) return null;

  return createPortal(
    <button
      type="button"
      className="brian-pulse-logo-trigger"
      onClick={() => writePresentationOverride('mobile')}
      aria-label="Chuyển sang giao diện mobile"
      title="Chuyển sang giao diện mobile"
    >
      <BrianPulseLogo className="brian-pulse-logo--nav" />
    </button>,
    navTarget,
  );
}
