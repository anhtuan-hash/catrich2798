import React from 'react';
import './BrianPulseLogo.css';

const TRAIL_DOTS = [
  { cx: 78, cy: 18.8, r: 2.15, cls: 'p1' },
  { cx: 87, cy: 15.8, r: 1.85, cls: 'p2' },
  { cx: 94, cy: 24.2, r: 1.65, cls: 'p3' },
  { cx: 102, cy: 18.0, r: 1.45, cls: 'p4' },
  { cx: 109, cy: 25.1, r: 1.25, cls: 'p5' },
  { cx: 116, cy: 19.2, r: 1.12, cls: 'p6' },
  { cx: 123, cy: 24.5, r: 1.0, cls: 'p7' },
  { cx: 129, cy: 20.8, r: 0.9, cls: 'p8' },
];

export default function BrianPulseLogo({ className = '' }) {
  return (
    <div
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label="Brian Pulse"
    >
      <svg
        viewBox="0 0 136 46"
        className="brian-pulse-logo__svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brianPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="brianPulseGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>

          <filter id="brianPulseGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.18  0 1 0 0 0.28  0 0 1 0 0.72  0 0 0 .28 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="brian-pulse-logo__core" filter="url(#brianPulseGlow)">
          <rect
            x="8"
            y="7"
            width="34"
            height="32"
            rx="11.5"
            fill="url(#brianPulseGradient)"
            className="brian-pulse-logo__chip"
          />
          <rect
            x="8.7"
            y="7.7"
            width="32.6"
            height="30.6"
            rx="10.9"
            fill="url(#brianPulseGlass)"
            stroke="#ffffff"
            strokeOpacity="0.24"
            strokeWidth="0.7"
          />

          <g className="brian-pulse-logo__glyph" fill="#fff">
            <rect x="16.4" y="12.7" width="5.7" height="20.3" rx="2.85" />
            <path d="M22 12.9H27.7C31.8 12.9 34.2 14.9 34.2 18.1C34.2 20.4 33 21.9 30.8 22.6C33.6 23.2 35.2 25.1 35.2 27.9C35.2 31.5 32.4 33.5 27.9 33.5H22V12.9ZM27.1 20.8C29.3 20.8 30.6 19.9 30.6 18.4C30.6 16.8 29.3 16.0 27.1 16.0H25.4V20.8H27.1ZM27.7 30.5C30.2 30.5 31.6 29.5 31.6 27.8C31.6 26.0 30.2 25.0 27.7 25.0H25.4V30.5H27.7Z" />
          </g>
        </g>

        <g className="brian-pulse-logo__trail">
          <path
            d="M47 23 C 57 17.8, 67.8 17.8, 78.4 22.7 C 89.5 27.8, 101.8 27.5, 118 21.9"
            fill="none"
            stroke="url(#brianPulseGradient)"
            strokeWidth="3.05"
            strokeLinecap="round"
            strokeOpacity="0.96"
            className="trail-main"
          />
          <path
            d="M49 25.4 C 60.2 21.8, 71.8 22.0, 82.8 25.2 C 94.0 28.5, 104.2 27.5, 116.0 24.2"
            fill="none"
            stroke="url(#brianPulseGradient)"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeOpacity="0.34"
            className="trail-soft"
          />
          <path
            d="M50 20.3 C 60 17.2, 69.7 17.9, 80.4 21.0 C 91.0 24.1, 100.5 23.8, 111 20.8"
            fill="none"
            stroke="url(#brianPulseGradient)"
            strokeWidth="1.05"
            strokeLinecap="round"
            strokeOpacity="0.22"
            className="trail-fine"
          />
        </g>

        <g className="brian-pulse-logo__particles">
          {TRAIL_DOTS.map((dot) => (
            <circle
              key={dot.cls}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              className={`trail-dot ${dot.cls}`}
              fill="url(#brianPulseGradient)"
            />
          ))}
        </g>
      </svg>

      <span className="brian-pulse-logo__fallback">Brian Pulse</span>
    </div>
  );
}
