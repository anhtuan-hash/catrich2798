import React from 'react';
import './BrianPulseLogo.css';

const TEXT = 'CATRICHMAUXANH';

export default function BrianPulseLogo({ className = '' }) {
  return (
    <div
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label={TEXT}
      title={TEXT}
    >
      <span className="brian-pulse-logo__wordmark" aria-hidden="true">
        <span className="brian-pulse-logo__catrich">CATRICH</span>
        <span className="brian-pulse-logo__divider" />
        <span className="brian-pulse-logo__mauxanh">MAUXANH</span>
      </span>
    </div>
  );
}
