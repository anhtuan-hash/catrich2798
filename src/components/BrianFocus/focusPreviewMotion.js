/** A real Web Animations API preview player.
 * CSS keyframes could silently freeze at the last frame (or be overridden by
 * site-wide animation rules). This player attaches a verifiable Animation
 * object to the gallery demo and reuses the same frames on Replay.
 */
const VISIBLE = {opacity:1,transform:'translate3d(0,0,0) scale(1)',filter:'blur(0px)',clipPath:'inset(0 0 0 0)'};
const HIDDEN = {
  portal:{opacity:0,clipPath:'circle(0% at 90% 78%)'},
  fade:{opacity:0},
  zoom:{opacity:0,transform:'scale(1.28)',filter:'blur(10px)'},
  rise:{opacity:0,transform:'translateY(75%) scale(.94)'},
  slide:{opacity:0,transform:'translateX(102%)'},
  curtain:{opacity:.5,clipPath:'inset(0 50% 0 50%)'},
  iris:{opacity:.5,clipPath:'circle(0% at 50% 50%)'},
  flip:{opacity:0,transform:'perspective(700px) rotateY(-42deg) scale(.91)',filter:'blur(4px)'},
  blur:{opacity:0,transform:'scale(1.12)',filter:'blur(21px) brightness(1.55)'},
};
const SHOW = {
  portal:{opacity:1,clipPath:'circle(150% at 90% 78%)'},
  iris:{opacity:1,clipPath:'circle(150% at 50% 50%)'},
  ...Object.fromEntries(['fade','zoom','rise','slide','curtain','flip','blur'].map(id=>[id,{opacity:1,
    ...(id==='curtain'?{clipPath:'inset(0 0 0 0)'}:{}),
    ...(id==='flip'?{transform:'perspective(700px) rotateY(0deg) scale(1)'}:{}),
    ...(id==='zoom'||id==='blur'?{filter:'blur(0px)'}:{}),
    ...(id==='blur'||id==='rise'||id==='slide'||id==='zoom'?{transform:'translate3d(0,0,0) scale(1)'}:{})
  }])),
};
/** @returns {Animation | null} an actual running player, or null when unsupported. */
export function startFocusPreview(element, effect, direction='enter') {
  if (!element || !element.animate || !HIDDEN[effect]) return null;
  const hidden=HIDDEN[effect];
  const shown=SHOW[effect]||VISIBLE;
  const start=direction==='exit'?shown:hidden;
  const end=direction==='exit'?hidden:shown;
  // All keyframes have consistent properties. The last 18% smoothly resets
  // so an infinite loop never freezes at its final frame.
  const fields=new Set([...Object.keys(start),...Object.keys(end)]);
  const merged=(x,offset)=>({offset,...Object.fromEntries([...fields].map(key=>[key,x[key]??(key==='opacity'?1:key==='filter'?'blur(0px)':key==='clipPath'?'inset(0 0 0 0)':'translate3d(0,0,0) scale(1)')]))});
  const animation=element.animate([
    merged(start,0),merged(start,.09),merged(end,.36),
    merged(end,.79),merged(start,1)
  ],{duration:3400,iterations:Infinity,fill:'both',easing:'linear'});
  animation.play();
  return animation;
}
