import React from 'react';

// Deterministic decor: stable positions prevent hydration jumps and accidental
// React re-mounts while the live clock and weather update.
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37 + 13) % 98}%`,
  top: `${(i * 47 + 7) % 96}%`,
  delay: `${(i % 9) * -.62}s`,
  duration: `${3.2 + (i % 5) * .9}s`,
  size: i % 7 === 0 ? '3px' : i % 3 === 0 ? '2px' : '1px',
}));

// Extra fine points are static: denser atmosphere without more animated work.
const DUST = Array.from({ length: 64 }, (_, i) => ({
  left: `${(i * 73 + Math.floor(i / 5) * 17 + 4) % 100}%`,
  top: `${(i * 31 + Math.floor(i / 7) * 23 + 9) % 100}%`,
  opacity: 0.14 + (i % 5) * 0.07,
}));
export default function CosmicAmbient() {
  return (
    <div className="bfc-cosmos" aria-hidden="true">
      <div className="bfc-cosmos__nebula bfc-cosmos__nebula--a" />
      <div className="bfc-cosmos__nebula bfc-cosmos__nebula--b" />
      <div className="bfc-cosmos__nebula bfc-cosmos__nebula--c" />
      <div className="bfc-cosmos__halo" />
      <div className="bfc-cosmos__stardust" aria-hidden="true">
        {DUST.map((dust,i) => <i key={i} style={{left:dust.left, top:dust.top, opacity:dust.opacity}} />)}
      </div>
      <svg className="bfc-cosmos__orbits" viewBox="0 0 1200 850" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bfc-cosmos-orbit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#46c5ff" stopOpacity=".02"/>
            <stop offset=".45" stopColor="#968aff" stopOpacity=".46"/>
            <stop offset="1" stopColor="#59c7ff" stopOpacity=".05"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#bfc-cosmos-orbit)" strokeWidth="1.25">
          <ellipse cx="600" cy="425" rx="510" ry="305" transform="rotate(-15 600 425)" />
          <ellipse cx="600" cy="425" rx="445" ry="247" transform="rotate(15 600 425)" />
          <ellipse cx="600" cy="425" rx="540" ry="210" transform="rotate(-35 600 425)" strokeDasharray="3 8"/>
        </g>
      </svg>
      <div className="bfc-cosmos__planet bfc-cosmos__planet--left" />
      <div className="bfc-cosmos__planet bfc-cosmos__planet--right" />
      <div className="bfc-cosmos__planet bfc-cosmos__planet--mini" />
      <svg className="bfc-cosmos__constellations" viewBox="0 0 1200 850" preserveAspectRatio="xMidYMid meet">
        <g fill="none" stroke="#b2d3ff" strokeOpacity=".20" strokeWidth="1">
          <path d="M140 170 194 215 245 155 300 188"/>
          <path d="M960 570 1010 525 1068 563 1090 518"/>
          <path d="M800 120 851 152 914 123"/>
        </g>
        <g fill="#c8e5ff" fillOpacity=".6">
          <circle cx="140" cy="170" r="2"/><circle cx="194" cy="215" r="2"/><circle cx="245" cy="155" r="2"/>
          <circle cx="960" cy="570" r="2"/><circle cx="1010" cy="525" r="2"/><circle cx="1068" cy="563" r="2"/>
          <circle cx="800" cy="120" r="2"/><circle cx="851" cy="152" r="2"/>
        </g>
      </svg>
      <div className="bfc-cosmos__stars">
        {STARS.map((star, i) => (
          <span key={i} className="bfc-cosmos__star" style={{
            left: star.left, top: star.top, '--bfc-delay': star.delay,
            '--bfc-duration': star.duration, width: star.size, height: star.size,
          }}/>
        ))}
      </div>
      <span className="bfc-cosmos__meteor bfc-cosmos__meteor--one"/>
      <span className="bfc-cosmos__meteor bfc-cosmos__meteor--two"/>
    </div>
  );
}
