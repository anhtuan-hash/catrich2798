import React from 'react';
import {Users, ArrowRight} from 'lucide-react';

// GroupCard — submission / group card. Two visual modes:
//   mode="submission" (default): full submission card with status + title + open link.
//   mode="tile": compact group-status tile (group grid on overview).
// Props: {groupLabel, title, classScope, statusLabel, statusKind, mode, onClick}.
// statusKind: '' (green/published) | 'gray' | 'red' | 'yellow'.
const STATUS_KIND = {
  published:'', approved_locked:'', submitted:'yellow', ttcm_review:'yellow',
  changes_requested:'red', rejected:'red', editing:'gray',
};

export default function GroupCard({groupLabel, title, classScope, statusLabel='Published', statusKind='', mode='submission', onClick}) {
  const kind = STATUS_KIND[statusKind] !== undefined ? STATUS_KIND[statusKind] : statusKind;
  if (mode === 'tile') {
    return (
      <button type="button" className="group-tile" onClick={onClick}>
        <b>{groupLabel}</b>
        <span className={'status' + (kind ? ' ' + kind : '')}>{statusLabel}</span>
      </button>
    );
  }
  return (
    <button type="button" className="submission-card" onClick={onClick}>
      <div className="cardtop">
        <span className="card-icon"><Users className="icon" size={20} aria-hidden="true" /></span>
        <span className={'status' + (kind ? ' ' + kind : '')}>{statusLabel}</span>
      </div>
      <div>
        <b>{groupLabel}</b>
        <div className="title">{title}</div>
      </div>
      <div className="bottom">
        <small style={{color:'#71808b'}}>{classScope}</small>
        <span className="small-link">Open submission <ArrowRight size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/></span>
      </div>
    </button>
  );
}
