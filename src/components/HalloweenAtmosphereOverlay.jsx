import React, { useEffect, useMemo, useState } from 'react';
import HalloweenMotifArt, { HALLOWEEN_SYMBOLS } from './HalloweenMotifArt.jsx';
import './HalloweenAtmosphereOverlay.css';

const ANCHORS = [
  [3, 14], [90, 12], [88, 68], [5, 78], [69, 5], [38, 90],
  [2, 45], [79, 85], [96, 37], [19, 3], [59, 91], [95, 90],
  [1, 93], [82, 3], [47, 5], [73, 77], [6, 58], [94, 54],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function getTier() {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 680 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop';
}

export default function HalloweenAtmosphereOverlay({ settings }) {
  const [tier, setTier] = useState(getTier);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setTier((previous) => {
        const next = getTier();
        return previous === next ? previous : next;
      }));
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Rotate *which* symbols are displayed, not how many DOM nodes exist.
  // This exposes all 28 illustrations over time without filling the classroom UI.
  useEffect(() => {
    if (typeof window === 'undefined' || settings?.enabled === false || settings?.showBuiltIns === false) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (document.documentElement.dataset.performance === 'low' || document.documentElement.dataset.performance === 'minimal') return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setRotation((previous) => (previous + 1) % HALLOWEEN_SYMBOLS.length);
      }
    }, 52000);
    return () => window.clearInterval(interval);
  }, [settings?.enabled, settings?.showBuiltIns]);

  const motifs = useMemo(() => {
    const requested = clamp(Math.round(Number(settings?.density) || 10), 3, 18);
    const limit = tier === 'mobile' ? 5 : tier === 'tablet' ? 10 : 18;
    const performanceLow = typeof document !== 'undefined'
      && ['low', 'minimal'].includes(document.documentElement.dataset.performance);
    const count = performanceLow ? Math.min(3, requested) : Math.min(limit, requested);
    const opacity = clamp(Number(settings?.opacity) || 0.18, 0.03, 0.28);
    const speed = clamp(Number(settings?.speed) || 1, 0.4, 2.5);
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      // 9 is coprime with 28: every icon can reach every scene position.
      kind: HALLOWEEN_SYMBOLS[(index + rotation * 9) % HALLOWEEN_SYMBOLS.length],
      left: ANCHORS[index][0],
      top: ANCHORS[index][1],
      size: (tier === 'mobile' ? 38 : tier === 'tablet' ? 52 : 66) + (index % 4) * 9,
      opacity: Number((opacity * (tier === 'mobile' ? 0.72 : 0.85) * (0.78 + (index % 4) * 0.07)).toFixed(3)),
      duration: (24 + (index % 5) * 6) / speed,
      delay: -(index * 4.7),
      drift: index % 2 ? -24 : 24,
    }));
  }, [settings, tier, rotation]);

  if (settings?.enabled === false || settings?.showBuiltIns === false || !motifs.length) return null;
  return (
    <div className="bes-halloween-atmosphere" data-tier={tier} aria-hidden="true">
      <div className="bes-halloween-atmosphere__wash" />
      {motifs.map((motif) => (
        <span key={motif.id} className={`bes-halloween-motif bes-halloween-motif--${motif.kind}`} style={{
          '--h-left': `${motif.left}%`,
          '--h-top': `${motif.top}%`,
          '--h-size': `${motif.size}px`,
          '--h-opacity': motif.opacity,
          '--h-duration': `${motif.duration}s`,
          '--h-delay': `${motif.delay}s`,
          '--h-drift': `${motif.drift}px`,
        }}><HalloweenMotifArt kind={motif.kind}/></span>
      ))}
    </div>
  );
}
