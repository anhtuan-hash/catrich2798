import React from 'react';

/**
 * Decorative-only Halloween art composition. Text, navigation, published
 * artworks, scoring and lessons remain real React/Supabase components.
 * The entire scene is removed from the DOM when the Home master switch is OFF.
 */
const ASSET = '/assets/home/v9/';

function Art({ name, className, eager = false }) {
  return (
    <img
      className={`halloween-scene__${className}`}
      src={`${ASSET}${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable="false"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...(eager ? { fetchPriority: 'high' } : {})}
    />
  );
}

export default function HalloweenScene({ zone }) {
  if (zone === 'hero') {
    return (
      <div className="halloween-scene halloween-scene--hero" aria-hidden="true" data-seasonal-art="hero">
        <div className="halloween-scene__night" />
        <Art name="halloween-hero-world" className="world" eager />
        <Art name="halloween-tree-left" className="left-tree" />
        <Art name="halloween-tree-right" className="right-tree" />
        <Art name="halloween-ghost-reader" className="reader" eager />
        <Art name="halloween-hanging-lanterns" className="lanterns" />
        <div className="halloween-scene__ambient" />
      </div>
    );
  }

  if (zone === 'practice') {
    return (
      <div className="halloween-scene halloween-scene--practice" aria-hidden="true" data-seasonal-art="practice">
        <div className="halloween-scene__night" />
        <Art name="halloween-cemetery-world" className="cemetery" />
        <Art name="halloween-tree-left" className="practice-tree-left" />
        <Art name="halloween-tree-right" className="practice-tree-right" />
        <Art name="halloween-pumpkin-main" className="practice-pumpkin" />
        <div className="halloween-scene__ambient" />
      </div>
    );
  }

  return null;
}
