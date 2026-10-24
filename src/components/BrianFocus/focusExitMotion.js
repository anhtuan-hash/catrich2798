/** The real Focus exit animation, not a gallery simulation.
 * One browser Animation owns the exit. BrianFocus waits for animation.finished
 * before unmounting the portal, avoiding a no-op CSS animation / early unmount.
 * A brief crossfade is used under Reduce Motion; "none" is truly instant.
 */
const fade = [
  { opacity:1, transform:'scale(1)' },
  { opacity:0, transform:'scale(.985)' },
];
const styles = {
  portal: [
    {opacity:1, clipPath:'circle(170vmax at calc(100% - 55px) calc(100% - 170px))'},
    {opacity:1, clipPath:'circle(145vmax at calc(100% - 55px) calc(100% - 170px))',offset:.17},
    {opacity:.98, clipPath:'circle(0px at calc(100% - 55px) calc(100% - 170px))'}
  ],
  fade,
  zoom:[
    {opacity:1,transform:'scale(1)',filter:'blur(0px)'},
    {opacity:0,transform:'scale(.81)',filter:'blur(11px)'}
  ],
  rise:[
    {opacity:1,transform:'translateY(0) scale(1)'},
    {opacity:0,transform:'translateY(-18vh) scale(.97)'}
  ],
  slide:[
    {opacity:1,transform:'translateX(0)'},
    {opacity:.15,transform:'translateX(100%)'}
  ],
  curtain:[
    {opacity:1,clipPath:'inset(0 0 0 0)'},
    {opacity:.4,clipPath:'inset(0 50% 0 50%)'}
  ],
  iris:[
    {opacity:1,clipPath:'circle(170vmax at 50% 50%)'},
    {opacity:.3,clipPath:'circle(0px at 50% 50%)'}
  ],
  flip:[
    {opacity:1,transform:'perspective(1200px) rotateY(0deg) scale(1)',filter:'blur(0px)'},
    {opacity:0,transform:'perspective(1200px) rotateY(45deg) scale(.85)',filter:'blur(6px)'}
  ],
  blur:[
    {opacity:1,transform:'scale(1)',filter:'blur(0px) brightness(1)'},
    {opacity:0,transform:'scale(1.055)',filter:'blur(22px) brightness(1.5)'}
  ],
};
export function startFocusExit(element, selected='portal', {reducedMotion=false} = {}) {
  if (!element || selected === 'none') return null;
  // Disable inherited keyframes (some contain !important) before activating
  // the imperative player. Inline !important prevents a CSS exit from racing.
  element.style.setProperty('animation', 'none', 'important');
  const frames=reducedMotion ? [
    {opacity:1},{opacity:0}
  ] : styles[selected] || fade;
  const duration=reducedMotion ? 210 : 690;
  if (typeof element.animate !== 'function') {
    // Rare older browsers: run a plain CSS transition, still visibly closing.
    element.style.setProperty('transition','opacity '+duration+'ms ease-in','important');
    element.style.setProperty('opacity','0','important');
    return { finished:new Promise(resolve=>window.setTimeout(resolve,duration)), cancel:()=>{} };
  }
  const animation=element.animate(frames,{
    duration,
    easing:reducedMotion?'ease-out':'cubic-bezier(.55,.02,.73,.33)',
    fill:'forwards',
    iterations:1
  });
  animation.play();
  return animation;
}
