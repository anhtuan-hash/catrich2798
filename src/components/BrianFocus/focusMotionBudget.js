/** Shared power budget for Brian Focus decorative animation.
 * Read-only feature detection; does not alter saved appearance or timer settings.
 * Absolute deadlines and audio/video playback are NEVER throttled here. */
export function focusMotionBudget({performance='balanced',width=0,memory,cores,reducedMotion=false}={}){
 const low=['low','minimal'].includes(performance)||reducedMotion;
 const compact=(width||0)<760 && (width||0)>0;
 const constrained=(Number.isFinite(memory)&&memory<=4)||(Number.isFinite(cores)&&cores<=4);
 if(low)return {enabled:false,fps:0,dpr:1,particles:0,parallax:false};
 if(compact||constrained)return {enabled:true,fps:20,dpr:1,particles:.42,parallax:false};
 return {enabled:true,fps:30,dpr:1.5,particles:1,parallax:true};
}
export function browserFocusMotionBudget(performance='balanced'){
 const nav=typeof navigator==='undefined'?{}:navigator;
 const width=typeof window==='undefined'?1280:window.innerWidth;
 return focusMotionBudget({performance,width,memory:nav.deviceMemory,cores:nav.hardwareConcurrency,
  reducedMotion:typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
}
