import React from 'react';
import {ArrowRight} from 'lucide-react';

// ActionTile — workspace shortcut card. Props:
//   {icon (lucide component), title, description, variant: 'accent'|'navy'|'yellow'|undefined, onClick}.
export default function ActionTile({icon:Icon, title, description, variant, onClick}) {
  return (
    <button type="button" className={'action' + (variant ? ' ' + variant : '')} onClick={onClick}>
      {Icon ? <Icon className="icon" size={30} strokeWidth={1.8} aria-hidden="true" /> : null}
      <div>
        <b>{title}</b>
        <p>{description}</p>
      </div>
      <span className="go" aria-hidden="true"><ArrowRight className="icon" size={18} strokeWidth={1.8} /></span>
    </button>
  );
}
