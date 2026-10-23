import React, { useMemo } from 'react';
import './HalloweenAtmosphereOverlay.css';

const MOTIFS = ['pumpkin', 'bat', 'moon', 'ghost', 'candy', 'star', 'bat', 'pumpkin', 'star', 'moon', 'ghost', 'candy', 'bat', 'pumpkin', 'star', 'ghost', 'candy', 'moon'];
const ANCHORS = [
  [3, 14], [90, 12], [88, 68], [5, 78], [69, 5], [38, 90],
  [2, 45], [79, 85], [96, 37], [19, 3], [59, 91], [95, 90],
  [1, 93], [82, 3], [47, 5], [73, 77], [6, 58], [94, 54],
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function Symbol({ kind }) {
  if (kind === 'pumpkin') return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="M50 25c-2-11 2-17 10-18" fill="none" stroke="#52735a" strokeWidth="6" strokeLinecap="round" />
      <path d="M49 29c-9-9-23-8-30 3C5 53 13 80 34 87c10 4 23 4 33 0 20-7 29-34 15-55-8-12-23-12-33-3Z" fill="#f48b3c" stroke="#c86935" strokeWidth="2"/>
      <path d="M46 30C28 40 26 72 42 86M55 30c18 12 18 44 3 56" fill="none" stroke="#db712f" strokeWidth="4" opacity=".7"/>
      <path d="m24 55 13-8 8 13ZM55 60l8-13 13 8ZM32 70q17 17 37 0l-7 13-11-4-10 4Z" fill="#46253d"/>
    </svg>
  );
  if (kind === 'bat') return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="M50 44 44 33l-6 8C27 31 16 35 3 28c5 13 1 22 8 32 6-5 13-4 18 1 2 8 9 13 17 10l4-12 4 12c8 3 15-2 17-10 5-5 12-6 18-1 7-10 3-19 8-32-13 7-24 3-35 13l-6-8Z" fill="#593374"/>
      <circle cx="45" cy="51" r="2" fill="#ffc17c"/><circle cx="55" cy="51" r="2" fill="#ffc17c"/>
    </svg>
  );
  if (kind === 'moon') return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="M66 13a36 36 0 1 0 22 61A38 38 0 0 1 66 13Z" fill="#f8c56e"/>
      <circle cx="33" cy="24" r="3" fill="#ba94bd"/><path d="m79 20 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e6a4c6"/>
    </svg>
  );
  if (kind === 'ghost') return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="M24 83V43C24 26 35 16 50 16s26 10 26 27v40l-12-8-14 9-13-9Z" fill="#fff1df" stroke="#be9fb9" strokeWidth="2.5"/>
      <ellipse cx="40" cy="47" rx="4" ry="6" fill="#634261"/><ellipse cx="60" cy="47" rx="4" ry="6" fill="#634261"/>
      <path d="M46 65q4 5 8 0" fill="none" stroke="#e68f94" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
  if (kind === 'candy') return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="m28 37-18-4 6 16-3 17 18-7M72 37l18-4-6 16 3 17-18-7" fill="#f5bb74" stroke="#d98c4a" strokeWidth="2"/>
      <rect x="28" y="34" width="44" height="32" rx="10" fill="#b08acd" stroke="#7953a2" strokeWidth="2"/>
      <path d="m41 35 14 30M57 35l13 22" stroke="#fce5c4" strokeWidth="8" opacity=".92"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <path d="m50 9 10 30 30 11-30 11-10 30-11-30L9 50l30-11Z" fill="#f4aa66"/>
      <circle cx="50" cy="50" r="8" fill="#ffebc4"/>
    </svg>
  );
}

export default function HalloweenAtmosphereOverlay({ settings }) {
  const tier = typeof window === 'undefined' ? 'desktop' : window.innerWidth < 680 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop';
  const motifs = useMemo(() => {
    const requested = clamp(Math.round(Number(settings?.density) || 10), 3, 18);
    const limit = tier === 'mobile' ? 4 : tier === 'tablet' ? 8 : 14;
    const performanceLow = typeof document !== 'undefined' && document.documentElement.dataset.performance === 'low';
    const count = performanceLow ? Math.min(3, requested) : Math.min(limit, requested);
    const opacity = clamp(Number(settings?.opacity) || 0.18, 0.03, 0.28);
    const speed = clamp(Number(settings?.speed) || 1, 0.4, 2.5);
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      kind: MOTIFS[index % MOTIFS.length],
      left: ANCHORS[index][0],
      top: ANCHORS[index][1],
      size: (tier === 'mobile' ? 38 : tier === 'tablet' ? 52 : 66) + (index % 4) * 9,
      opacity: Number((opacity * (tier === 'mobile' ? 0.72 : 0.85) * (0.78 + (index % 4) * 0.07)).toFixed(3)),
      duration: (24 + (index % 5) * 6) / speed,
      delay: -(index * 4.7),
      drift: index % 2 ? -24 : 24,
    }));
  }, [settings, tier]);

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
        }}><Symbol kind={motif.kind}/></span>
      ))}
    </div>
  );
}
