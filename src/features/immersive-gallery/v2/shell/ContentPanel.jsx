import React from 'react';

// ContentPanel — bordered paper panel. Props: {variant: 'warm'|'gray'|'navy'|undefined, className, children, ariaLabel}.
export default function ContentPanel({variant, className='', children, ariaLabel}) {
  return (
    <section className={'panel' + (variant ? ' ' + variant : '') + ' ' + className}
      aria-label={ariaLabel}>
      {children}
    </section>
  );
}
