import React from 'react';

export default function Win8Loader({ active = false, label = 'Loading...' }) {
  if (!active) return null;
  return (
    <div className="win8-loader-overlay" aria-live="polite" aria-busy="true">
      <div className="win8-loader-box">
        <div className="win8-spinner">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p>{label}</p>
      </div>
    </div>
  );
}
