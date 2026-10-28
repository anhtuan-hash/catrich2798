import React from 'react';
import { linkifyPublicText } from '../utils/linkifyPublicText.js';
import './SlideshowLinkedText.css';

/** Inline, accessible links in published album descriptions or captions. */
export default function SlideshowLinkedText({ text = '' }) {
  return <>{linkifyPublicText(text).map((part, i) => part.href
    ? <a key={i} className="bss-inline-link" href={part.href} target="_blank"
      rel="noopener noreferrer" title={part.href}>{part.text}</a>
    : <React.Fragment key={i}>{part.text}</React.Fragment>)}</>;
}
