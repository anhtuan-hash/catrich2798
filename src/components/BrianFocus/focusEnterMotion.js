/** Real Brian Focus opening transition.
 * The CSS-only entrance was frequently overridden by app-level animation
 * rules. A single Web Animations player now owns the scene transition.
 * Every preset mirrors its Close direction; "none" explicitly skips it.
 */
const fade = [{ opacity:0 }, { opacity:1 }];
const entries = {
  portal: [
    { opacity:0, clipPath:'circle(0px at calc(100% - 55px) calc(100% - 170px))' },
    { opacity:1, clipPath:'circle(145vmax at calc(100% - 55px) calc(100% - 170px))', offset:.83 },
    { opacity:1, clipPath:'circle(170vmax at calc(100% - 55px) calc(100% - 170px))' }
  ],
  fade,
  zoom: [
    { opacity:0, transform:'scale(1.16)', filter:'blur(10px)' },
    { opacity:1, transform:'scale(1)', filter:'blur(0px)' }
  ],
  rise: [
    { opacity:0, transform:'translateY(18vh) scale(.97)' },
    { opacity:1, transform:'translateY(0) scale(1)' }
  ],
  slide: [
    { opacity:.15, transform:'translateX(100%)' },
    { opacity:1, transform:'translateX(0)' }
  ],
  curtain: [
    { opacity:.4, clipPath:'inset(0 50% 0 50%)' },
    { opacity:1, clipPath:'inset(0 0 0 0)' }
  ],
  iris: [
    { opacity:.3, clipPath:'circle(0px at 50% 50%)' },
    { opacity:1, clipPath:'circle(170vmax at 50% 50%)' }
  ],
  flip: [
    { opacity:0, transform:'perspective(1200px) rotateY(-45deg) scale(.85)', filter:'blur(6px)' },
    { opacity:1, transform:'perspective(1200px) rotateY(0deg) scale(1)', filter:'blur(0px)' }
  ],
  blur: [
    { opacity:0, transform:'scale(1.055)', filter:'blur(22px) brightness(1.5)' },
    { opacity:1, transform:'scale(1)', filter:'blur(0px) brightness(1)' }
  ]
};

/** @returns {Animation | null} A running entrance player (or null for No Motion). */
export function startFocusEnter(element, selected='portal', { reducedMotion=false } = {}) {
  if (!element || selected === 'none') return null;

  // Eliminate competing CSS keyframes. The Web Animations API player controls
  // this actual overlay, not the separate gallery preview.
  element.style.setProperty('animation', 'none', 'important');

  const frames = reducedMotion ? fade : (entries[selected] || fade);
  const duration = reducedMotion ? 210 : 690;

  if (typeof element.animate !== 'function') {
    // Older browser fallback starts hidden; a reflow forces a visible fade.
    element.style.setProperty('transition', 'none', 'important');
    element.style.setProperty('opacity', '0');
    element.getBoundingClientRect();
    element.style.setProperty('transition', 'opacity '+duration+'ms ease-out', 'important');
    element.style.setProperty('opacity', '1');
    return { finished:new Promise(resolve=>window.setTimeout(resolve,duration)), cancel:()=>{} };
  }

  const player=element.animate(frames,{
    duration,
    easing:reducedMotion ? 'ease-out' : 'cubic-bezier(.17,.75,.22,1)',
    fill:'both',
    iterations:1
  });
  player.play();
  return player;
}
