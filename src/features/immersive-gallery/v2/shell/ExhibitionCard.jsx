import React from 'react';
import {ArrowRight} from 'lucide-react';

const tr = (lang, vi, en) => lang === 'vi' ? vi : en;

const PALETTES = [
  {bg:'#112339', ink:'#fffdf9', red:'#ca2431', gold:'#f4ca4b'},
  {bg:'#f4ca4b', ink:'#112339', red:'#ca2431', gold:'#fffdf9'},
  {bg:'#ca2431', ink:'#fffdf9', red:'#112339', gold:'#f4ca4b'},
  {bg:'#fffdf9', ink:'#112339', red:'#ca2431', gold:'#f4ca4b'},
  {bg:'#1c3d34', ink:'#f4f7f2', red:'#e7c15a', gold:'#fffdf9'},
];

function motifOf(title='') {
  const text = title.toLowerCase();
  if (/water|refill|bottle|reuse|drink/.test(text)) return 'water';
  if (/trip|road|walk|cross|safe/.test(text)) return 'path';
  if (/light|day|sun|switch|bulb/.test(text)) return 'light';
  if (/lunch|food|portion|waste|canteen|habit/.test(text)) return 'portions';
  return 'blocks';
}

function ExhibitPoster({title, index}) {
  const tone = PALETTES[index % PALETTES.length];
  const motif = motifOf(title);
  return (
    <svg className="exhibit-poster" viewBox="0 0 320 180" role="img" aria-label={title}>
      <rect width="320" height="180" fill={tone.bg}/>
      <rect x="0" y="0" width="14" height="180" fill={tone.red}/>
      {motif === 'water' ? (
        <>
          <rect x="78" y="28" width="36" height="124" rx="18" fill={tone.gold}/>
          <rect x="142" y="46" width="36" height="106" rx="18" fill={tone.ink}/>
          <rect x="206" y="64" width="36" height="88" rx="18" fill={tone.red}/>
        </>
      ) : motif === 'path' ? (
        <>
          <polygon points="40,150 280,28 320,28 80,150" fill={tone.gold}/>
          <circle cx="92" cy="58" r="22" fill={tone.ink}/>
          <circle cx="228" cy="122" r="16" fill={tone.red}/>
        </>
      ) : motif === 'light' ? (
        <>
          <circle cx="168" cy="86" r="46" fill={tone.gold}/>
          <circle cx="168" cy="86" r="22" fill={tone.bg}/>
          {[0,45,90,135].map(deg => (
            <rect key={deg} x="160" y="18" width="16" height="28" fill={tone.ink} transform={'rotate('+deg+' 168 86)'}/>
          ))}
        </>
      ) : motif === 'portions' ? (
        <>
          <rect x="48" y="36" width="210" height="28" fill={tone.ink}/>
          <rect x="48" y="76" width="150" height="28" fill={tone.gold}/>
          <rect x="48" y="116" width="92" height="28" fill={tone.red}/>
        </>
      ) : (
        <>
          <rect x="36" y="28" width="110" height="110" fill={tone.gold}/>
          <rect x="168" y="28" width="110" height="48" fill={tone.ink}/>
          <rect x="168" y="90" width="48" height="48" fill={tone.red}/>
          <rect x="230" y="90" width="48" height="48" fill={tone.ink}/>
        </>
      )}
    </svg>
  );
}

export default function ExhibitionCard({serial, title, description, featured=false, statusLabel='Published', language='en', ctaLabel, onOpen, index=0}) {
  return (
    <article className={'exhibit-card exhibit-poster-card' + (featured ? ' featured' : '')}>
      <button type="button" className="exhibit-poster-hit" onClick={onOpen}>
        <ExhibitPoster title={title} index={index}/>
        <span className="serial">{serial}</span>
        <span className="status">{statusLabel}</span>
      </button>
      <h3>{title}</h3>
      <p className="exhibit-sr">{description}</p>
      <button type="button" className="small-link" onClick={onOpen}>
        {ctaLabel || tr(language, 'Mở triển lãm 3D', 'Open 3D exhibition')} <ArrowRight size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/>
      </button>
    </article>
  );
}
