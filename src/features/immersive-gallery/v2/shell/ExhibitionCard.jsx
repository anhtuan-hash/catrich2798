import React from 'react';
import {ArrowRight} from 'lucide-react';

const tr = (lang, vi, en) => lang === 'vi' ? vi : en;

export default function ExhibitionCard({serial, title, cover='', statusLabel='Published', language='en', ctaLabel, onOpen}) {
  return (
    <article className="exhibit-card exhibit-poster-card">
      <button type="button" className="exhibit-poster-hit" onClick={onOpen}>
        {cover
          ? <img className="exhibit-cover" src={cover} alt={title}/>
          : <span className="exhibit-cover exhibit-cover-wait" aria-hidden="true"/>}
        <span className="serial">{serial}</span>
        <span className="status">{statusLabel}</span>
      </button>
      <h3>{title}</h3>
      <button type="button" className="small-link" onClick={onOpen}>
        {ctaLabel || tr(language, 'Mở triển lãm 3D', 'Open 3D exhibition')} <ArrowRight size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/>
      </button>
    </article>
  );
}
