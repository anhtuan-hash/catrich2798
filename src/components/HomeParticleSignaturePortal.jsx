import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CatRichParticleLogo from './CatRichParticleLogo.jsx';

export default function HomeParticleSignaturePortal() {
  const [heroTarget, setHeroTarget] = useState(null);

  useEffect(() => {
    const resolveTarget = () => {
      const nextTarget = document.querySelector('.app-shell[data-route="home"] .bha-hero.hero-cms');
      setHeroTarget((current) => (current === nextTarget ? current : nextTarget));
      return Boolean(nextTarget);
    };

    if (resolveTarget()) return undefined;

    const observer = new MutationObserver(() => {
      if (resolveTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!heroTarget) return null;

  return createPortal(
    <CatRichParticleLogo
      text="catrich.mauxanh"
      interactionRadius={96}
      magneticStrength={1.6}
      spring={0.054}
      damping={0.845}
    />,
    heroTarget,
  );
}
