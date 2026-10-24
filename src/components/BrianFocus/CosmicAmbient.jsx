import React, { useEffect, useRef } from 'react';
import {browserFocusMotionBudget} from './focusMotionBudget.js';

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
export default function CosmicAmbient({ motionEnabled = true, performance='balanced' }) {
  const canvasRef = useRef(null);

  // A real-time, pointer-reactive depth layer: no video, external images, or React re-renders.
  useEffect(() => {
    const budget=browserFocusMotionBudget(performance);
    if (!motionEnabled || !budget.enabled || typeof window === 'undefined') return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let enabled = document.visibilityState !== 'hidden';
    let px = 0; let py = 0; let targetX = 0; let targetY = 0;
    const particles = Array.from({ length: Math.round(125*budget.particles) }, (_, index) => ({
      x: ((index * 0.61803398875 + 0.17) % 1),
      y: ((index * 0.41421356237 + 0.38) % 1),
      depth: .28 + (index % 9) / 10,
      size: index % 13 === 0 ? 2.1 : .55 + index % 3 * .34,
      speed: .12 + (index % 7) * .045,
      phase: index * 1.83,
    }));

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, budget.dpr);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const pointer = (event) => {
      if (event.pointerType === 'touch') return;
      targetX = ((event.clientX / width) - .5) * 2;
      targetY = ((event.clientY / height) - .5) * 2;
    };
    const paint = (timestamp) => {
      if (!enabled) return;
      frame = window.requestAnimationFrame(paint);
      if (timestamp - previous < 1000/budget.fps) return; // cap RAF paints per device budget
      previous = timestamp;
      const t = timestamp * .001;
      px += (targetX - px) * .036;
      py += (targetY - py) * .036;
      ctx.clearRect(0, 0, width, height);

      // Independent parallax layers travel at different speeds, giving true spatial depth.
      for (const star of particles) {
        const x = ((star.x * width + t * star.speed * 2.6 * star.depth +
          px * 28 * star.depth) % width + width) % width;
        const y = ((star.y * height + t * star.speed * .65 * star.depth +
          py * 20 * star.depth) % height + height) % height;
        const pulse = .54 + .46 * Math.sin(t * (1.05 + star.depth) + star.phase);
        const opacity = (.15 + pulse * .52) * star.depth;
        ctx.fillStyle = 'rgba(219,237,255,' + opacity.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
        if (star.size > 1.8 && pulse > .66) {
          ctx.strokeStyle = 'rgba(149,192,255,' + (opacity * .23).toFixed(3) + ')';
          ctx.lineWidth = .6;
          ctx.beginPath();
          ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
          ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
          ctx.stroke();
        }
      }

      // Slowly flexing luminous currents float *behind* the foreground clock.
      for (let layer = 0; layer < 3; layer++) {
        const base = height * (.43 + layer * .12);
        const drift = Math.sin(t * (.18 + layer * .04) + layer * 1.2) * height * .055;
        const gradient = ctx.createLinearGradient(0, base - 80, width, base + 80);
        gradient.addColorStop(0, 'rgba(83,122,255,0)');
        gradient.addColorStop(.25, 'rgba(73,137,255,.045)');
        gradient.addColorStop(.66, 'rgba(173,108,255,.09)');
        gradient.addColorStop(1, 'rgba(79,217,240,0)');
        ctx.beginPath();
        ctx.moveTo(-40, base + drift);
        ctx.bezierCurveTo(width * .22, base - height * .22 + drift,
          width * .61, base + height * .2 - drift, width + 40, base - height * .14 + drift);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.3 + layer * .5;
        ctx.stroke();
      }
    };
    const visibility = () => {
      enabled = document.visibilityState !== 'hidden';
      window.cancelAnimationFrame(frame);
      if (enabled) { previous = 0; frame = window.requestAnimationFrame(paint); }
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if(budget.parallax)window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    if (enabled) frame = window.requestAnimationFrame(paint);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [motionEnabled,performance]);

  return (
    <div className="bfc-cosmos" aria-hidden="true">
      <canvas ref={canvasRef} className="bfc-cosmos__canvas" />
      <div className="bfc-cosmos__aurora bfc-cosmos__aurora--one" />
      <div className="bfc-cosmos__aurora bfc-cosmos__aurora--two" />
      <div className="bfc-cosmos__aurora bfc-cosmos__aurora--three" />
      <div className="bfc-cosmos__horizon" />
      <div className="bfc-cosmos__glow-disc" />
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
