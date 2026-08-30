import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FishParticleLogo from './FishParticleLogo.jsx';

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
    <FishParticleLogo
      className="fish-particle-logo--nav"
      interactionRadius={46}
      magneticStrength={1.7}
      spring={0.116}
      damping={0.79}
    />,
    navTarget,
  );
}
