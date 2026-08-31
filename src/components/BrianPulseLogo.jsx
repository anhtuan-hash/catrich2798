import React from 'react';
import './BrianPulseLogo.css';

export default function BrianPulseLogo({ className = '' }) {
  return (
    <div
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label="T"
      title="T"
    >
      <span className="brian-pulse-logo__letter" aria-hidden="true">T</span>
    </div>
  );
}
