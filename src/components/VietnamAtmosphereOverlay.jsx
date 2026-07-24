import React, { useEffect, useMemo, useState } from 'react';
import './VietnamAtmosphereOverlay.css';

const MOTIF_SEQUENCE = [
  'flag',
  'nonla',
  'lotus',
  'bamboo',
  'drum',
  'halong',
  'lotus',
  'nonla',
  'bamboo',
  'flag',
];

const EDGE_ANCHORS = [
  { left: 2, top: 14 },
  { left: 12, top: 67 },
  { left: 84, top: 10 },
  { left: 90, top: 62 },
  { left: 3, top: 84 },
  { left: 72, top: 82 },
  { left: 44, top: 2 },
  { left: 28, top: 88 },
  { left: 94, top: 34 },
  { left: 61, top: 87 },
];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function getViewportTier() {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 680) return 'mobile';
  if (window.innerWidth < 1100) return 'tablet';
  return 'desktop';
}

function getMotifCount(tier) {
  if (tier === 'mobile') return 4;
  if (tier === 'tablet') return 7;
  return 10;
}

function buildMotifs(tier) {
  const count = getMotifCount(tier);
  const random = seededRandom(tier === 'mobile' ? 2704 : tier === 'tablet' ? 1975 : 1945);

  return MOTIF_SEQUENCE.slice(0, count).map((kind, index) => {
    const anchor = EDGE_ANCHORS[index];
    const baseSize = tier === 'mobile' ? 44 : tier === 'tablet' ? 58 : 72;
    const sizeRange = tier === 'mobile' ? 28 : tier === 'tablet' ? 44 : 64;
    const size = Math.round(baseSize + random() * sizeRange);
    const opacity = Number((0.075 + random() * 0.065).toFixed(3));
    const driftX = Math.round((random() - 0.5) * (tier === 'mobile' ? 34 : 72));
    const driftY = Math.round((random() - 0.5) * (tier === 'mobile' ? 44 : 88));
    const rotate = Math.round((random() - 0.5) * 18);
    const duration = Math.round(22 + random() * 24);
    const delay = Math.round(random() * -24);
    const blur = random() > 0.72 ? Number((0.35 + random() * 0.65).toFixed(2)) : 0;

    return {
      id: `${kind}-${index}`,
      kind,
      left: Math.max(0, Math.min(96, anchor.left + (random() - 0.5) * 5)),
      top: Math.max(0, Math.min(92, anchor.top + (random() - 0.5) * 5)),
      size,
      opacity,
      driftX,
      driftY,
      rotate,
      duration,
      delay,
      blur,
    };
  });
}

function VietnamMotif({ kind }) {
  const commonProps = {
    viewBox: '0 0 120 120',
    role: 'presentation',
    focusable: 'false',
    'aria-hidden': 'true',
  };

  if (kind === 'flag') {
    return (
      <svg {...commonProps}>
        <defs>
          <linearGradient id="bes-vn-flag-red" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ff3b30" />
            <stop offset="1" stopColor="#c70d18" />
          </linearGradient>
        </defs>
        <rect x="15" y="12" width="6" height="96" rx="3" fill="#9a6b32" />
        <circle cx="18" cy="10" r="5" fill="#d7a64a" />
        <path d="M21 20c23-10 47 7 84-3v62c-35 11-62-7-84 4z" fill="url(#bes-vn-flag-red)" />
        <path d="m63 35 6.4 13.2 14.6 2.1-10.5 10.2L76 75 63 68.1 50 75l2.5-14.5L42 50.3l14.6-2.1z" fill="#ffd52a" />
      </svg>
    );
  }

  if (kind === 'nonla') {
    return (
      <svg {...commonProps}>
        <defs>
          <linearGradient id="bes-vn-hat" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff1bb" />
            <stop offset="1" stopColor="#c99643" />
          </linearGradient>
        </defs>
        <path d="M12 72 62 17l47 55c-26 15-70 15-97 0Z" fill="url(#bes-vn-hat)" />
        <ellipse cx="60" cy="72" rx="49" ry="12" fill="#e4b760" opacity=".72" />
        <path d="M17 70c27 11 60 11 87 0M62 18 31 73M62 18l29 55M62 18v62" fill="none" stroke="#b27d32" strokeWidth="2" opacity=".62" />
        <path d="M42 80c2 15 8 23 19 26M80 80c-2 15-8 23-19 26" fill="none" stroke="#b05735" strokeLinecap="round" strokeWidth="4" />
      </svg>
    );
  }

  if (kind === 'lotus') {
    return (
      <svg {...commonProps}>
        <defs>
          <linearGradient id="bes-vn-lotus" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffb2cf" />
            <stop offset="1" stopColor="#e53a79" />
          </linearGradient>
        </defs>
        <path d="M60 98C34 83 23 64 29 44c15 5 26 15 31 31 5-16 16-26 31-31 6 20-5 39-31 54Z" fill="#f06d9e" opacity=".86" />
        <path d="M60 87C40 66 40 43 60 18c20 25 20 48 0 69Z" fill="url(#bes-vn-lotus)" />
        <path d="M59 91C39 87 25 76 18 58c19-2 33 5 42 22 9-17 23-24 42-22-7 18-21 29-43 33Z" fill="#ff8db7" />
        <circle cx="60" cy="65" r="7" fill="#f7c53d" />
        <path d="M60 91v21" stroke="#478533" strokeLinecap="round" strokeWidth="5" />
      </svg>
    );
  }

  if (kind === 'bamboo') {
    return (
      <svg {...commonProps}>
        <defs>
          <linearGradient id="bes-vn-bamboo" x1="0" x2="1">
            <stop offset="0" stopColor="#9bcf42" />
            <stop offset="1" stopColor="#2e7d32" />
          </linearGradient>
        </defs>
        <path d="M43 108 50 18M69 108 66 10M86 108 80 34" fill="none" stroke="url(#bes-vn-bamboo)" strokeLinecap="round" strokeWidth="10" />
        <path d="M47 45h8M44 72h9M65 36h8M65 68h9M80 62h9M82 88h8" stroke="#d7c36a" strokeLinecap="round" strokeWidth="4" />
        <path d="M49 37C27 21 16 27 8 39c18 6 31 5 41-2ZM70 28c18-17 34-11 42 1-18 7-31 7-42-1ZM75 57c21-14 35-5 41 8-20 3-32 0-41-8ZM42 66C23 54 10 62 5 74c18 2 29-1 37-8ZM82 83c17-9 29-1 33 10-16 1-26-2-33-10Z" fill="#4f9e33" />
      </svg>
    );
  }

  if (kind === 'drum') {
    return (
      <svg {...commonProps}>
        <defs>
          <linearGradient id="bes-vn-drum" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f0c86d" />
            <stop offset="1" stopColor="#9f6827" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="url(#bes-vn-drum)" />
        <circle cx="60" cy="60" r="41" fill="none" stroke="#ffe09a" strokeWidth="3" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="#7d4c1e" strokeDasharray="4 5" strokeWidth="3" />
        <path d="m60 31 6 19 20-5-15 15 15 15-20-5-6 19-6-19-20 5 15-15-15-15 20 5Z" fill="#ffe37f" />
        <path d="M19 60h10M91 60h10M60 19v10M60 91v10M31 31l7 7M82 82l7 7M89 31l-7 7M38 82l-7 7" stroke="#7d4c1e" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <defs>
        <linearGradient id="bes-vn-water" x1="0" x2="1">
          <stop offset="0" stopColor="#7ed9d3" />
          <stop offset="1" stopColor="#2d9fb3" />
        </linearGradient>
      </defs>
      <path d="M8 87c23-8 39 3 57 0s31-10 48-1v17H8Z" fill="url(#bes-vn-water)" />
      <path d="m13 87 18-48 20 48Z" fill="#4e8c64" />
      <path d="m38 87 26-67 25 67Z" fill="#397253" />
      <path d="m78 87 18-48 18 48Z" fill="#4e8c64" />
      <path d="M52 50c7-6 16-8 24-1M24 63c5-4 10-5 16-1M87 58c5-4 10-4 15 0" fill="none" stroke="#7bb76e" strokeLinecap="round" strokeWidth="7" />
      <circle cx="91" cy="24" r="11" fill="#f7c94c" opacity=".9" />
      <path d="M48 95c11-2 22-2 34 0" stroke="#d24a35" strokeLinecap="round" strokeWidth="5" />
      <path d="m64 74 10 18H54Z" fill="#d94131" />
    </svg>
  );
}

export default function VietnamAtmosphereOverlay() {
  const [viewportTier, setViewportTier] = useState(getViewportTier);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('bes-vietnam-atmosphere') !== 'off';
  });

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextTier = getViewportTier();
        setViewportTier((current) => (current === nextTier ? current : nextTier));
      });
    };
    const onStorage = (event) => {
      if (event.key === 'bes-vietnam-atmosphere') setEnabled(event.newValue !== 'off');
    };
    const onPreference = (event) => setEnabled(event.detail?.enabled !== false);

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('storage', onStorage);
    window.addEventListener('bes:vietnam-atmosphere', onPreference);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bes:vietnam-atmosphere', onPreference);
    };
  }, []);

  const motifs = useMemo(() => buildMotifs(viewportTier), [viewportTier]);

  if (!enabled) return null;

  return (
    <div className="bes-vn-atmosphere" data-tier={viewportTier} aria-hidden="true">
      <div className="bes-vn-atmosphere__veil" />
      {motifs.map((motif) => (
        <span
          key={motif.id}
          className={`bes-vn-motif bes-vn-motif--${motif.kind}`}
          style={{
            '--vn-left': `${motif.left}%`,
            '--vn-top': `${motif.top}%`,
            '--vn-size': `${motif.size}px`,
            '--vn-opacity': motif.opacity,
            '--vn-drift-x': `${motif.driftX}px`,
            '--vn-drift-y': `${motif.driftY}px`,
            '--vn-rotate': `${motif.rotate}deg`,
            '--vn-duration': `${motif.duration}s`,
            '--vn-delay': `${motif.delay}s`,
            '--vn-blur': `${motif.blur}px`,
          }}
        >
          <span className="bes-vn-motif__art">
            <VietnamMotif kind={motif.kind} />
          </span>
        </span>
      ))}
    </div>
  );
}
