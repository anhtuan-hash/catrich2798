import {useEffect,useState} from 'react';
import {performanceTier} from './useFocus9.js';
/** Samples foreground rAF once every 5s; quality applies to decor ONLY. */
export default function useSilkAutopilot(mode='auto'){
 const [observed,setObserved]=useState(null);
 const [quality,setQuality]=useState('balanced');
 useEffect(()=>{
  if(mode!=='auto'){
    setQuality(mode==='smooth'?'smooth':'beautiful');
    setObserved(null);
    return undefined;
  }
  let running=true,raf=0,last=0,frames=0,slow=0,fast=0,samplesAt=performance.now(),tier='balanced';
  const tick=timestamp=>{
    if(!running)return;
    raf=requestAnimationFrame(tick);
    if(document.hidden)return;
    frames++;
    if(timestamp-samplesAt<5000)return;
    const fps=Math.max(0,Math.round(frames*1000/Math.max(1,timestamp-samplesAt)));
    frames=0;samplesAt=timestamp;
    if(fps<28){slow++;fast=0;}else if(fps>=48){fast++;slow=0;}else{slow=0;fast=0;}
    tier=performanceTier('auto',slow,fast,tier);
    setObserved(fps);setQuality(old=>old===tier?old:tier);
  };
  const visibility=()=>{samplesAt=performance.now();frames=0;};
  document.addEventListener('visibilitychange',visibility);
  raf=requestAnimationFrame(tick);
  return()=>{running=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
 },[mode]);
 return {fps:observed,quality};
}
