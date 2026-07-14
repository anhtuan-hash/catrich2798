import React from 'react';

export default function SectionHeader({ eyebrow, title, text, right }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {right && <div className="section-right">{right}</div>}
    </div>
  );
}
