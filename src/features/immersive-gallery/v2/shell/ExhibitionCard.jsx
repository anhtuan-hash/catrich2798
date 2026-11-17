import React, {useId} from 'react';
import {ArrowRight, ArrowUpRight, Image} from 'lucide-react';

const tr = (lang, vi, en) => lang === 'vi' ? vi : en;

export default function ExhibitionCard({serial, title, cover='', statusLabel='Published', language='en', ctaLabel, onOpen, disabled=false, groupRoom=false}) {
  const titleId = useId();
  const actionId = useId();
  return (
    <article className={groupRoom ? 'swiss-editorial-exhibit swiss-editorial-exhibit--room' : 'swiss-editorial-exhibit'} aria-labelledby={titleId}>
      <div className="swiss-editorial-exhibit-poster">
        {cover
          ? <img src={cover} alt="" decoding="async" loading="lazy"/>
          : <Image size={24} aria-hidden="true"/>}
      </div>
      <div className="swiss-editorial-exhibit-meta"><strong>{serial}</strong>{!groupRoom && <span>{statusLabel}</span>}</div>
      {groupRoom ? (
        <h4 id={titleId}>
          <button type="button" className="swiss-editorial-exhibit-link"
            aria-label={ctaLabel + ' ' + title} onClick={onOpen} disabled={disabled}>
            <span>{title}</span><ArrowRight size={17} aria-hidden="true"/>
          </button>
        </h4>
      ) : <>
        <h3 id={titleId}>{title}</h3>
        <button type="button" className="swiss-editorial-exhibit-link"
        aria-labelledby={`${actionId} ${titleId}`} onClick={onOpen} disabled={disabled}>
          <span id={actionId}>{ctaLabel || tr(language, 'Mở triển lãm 3D', 'Open 3D exhibition')}</span>
          <ArrowUpRight size={16} aria-hidden="true"/>
        </button>
      </>}
    </article>
  );
}
