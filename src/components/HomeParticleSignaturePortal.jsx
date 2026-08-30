import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CatRichParticleLogo from './CatRichParticleLogo.jsx';

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
    <CatRichParticleLogo
      className="catrich-particle-logo--nav"
      variant="nav"
      text="catrich.mauxanh"
      interactionRadius={34}
      magneticStrength={0.58}
      spring={0.105}
      damping={0.82}
    />,
    navTarget,
  );
}
