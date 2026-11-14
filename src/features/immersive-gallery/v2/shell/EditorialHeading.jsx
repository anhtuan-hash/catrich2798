import React from 'react';

// EditorialHeading — Swiss page header: kicker bar + heavy title + description + right aside.
// Props: {kicker, title, description, aside}. All optional; title required.
export default function EditorialHeading({kicker, title, description, aside}) {
  return (
    <section className="page-header">
      <div>
        {kicker ? <div className="page-kicker">{kicker}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
      {aside ? <div className="header-aside" aria-live="polite">{aside}</div> : null}
    </section>
  );
}
