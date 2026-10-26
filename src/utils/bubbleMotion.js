// Shared bubble portal lifecycle. Uses the existing Admin Motion Hub configuration.
// Each full-screen application keeps ownership of its state, storage, sound and
// specialist transitions; this helper only decides whether exit may be animated.
import {getGlobalMotionConfig, GLOBAL_MOTION_SPEEDS} from './globalMotionSystem.js';

export const BUBBLE_MOTION_OPTIONS=Object.freeze(['none','fade','zoom','glide','spring','cinematic']);
export function readBubbleMotion(){
  const config=getGlobalMotionConfig();
  const effect=BUBBLE_MOTION_OPTIONS.includes(config.slots?.bubble)?config.slots.bubble:'zoom';
  const reduced=typeof window!=='undefined'&&Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const speed=GLOBAL_MOTION_SPEEDS[config.speed]||GLOBAL_MOTION_SPEEDS.balanced;
  return Object.freeze({effect,reduced,
    duration:effect==='none'||reduced?0:Math.max(150,Math.min(650,Math.round(speed.slow*1.08))),
    speed:config.speed,
  });
}
