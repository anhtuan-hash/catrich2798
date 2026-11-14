import React from 'react';
import {ArrowRight} from 'lucide-react';

// ExhibitionCard — published exhibition card with 3D entry.
// Props: {serial, title, description, featured, statusLabel, onOpen}.
// Pure display; onOpen is wired by the screen to the existing 3D viewer.
export default function ExhibitionCard({serial, title, description, featured=false, statusLabel='Published', onOpen}) {
  return (
    <article className={'exhibit-card' + (featured ? ' featured' : '')}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span className="serial">{serial}</span>
        <span className="status">{statusLabel}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" className="small-link" onClick={onOpen}>
        Open 3D exhibition <ArrowRight size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/>
      </button>
    </article>
  );
}
