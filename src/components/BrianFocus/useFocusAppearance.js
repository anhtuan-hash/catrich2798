import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'bfc-atelier-v5:';
export const FOCUS6_ATMOSPHERES = Object.freeze([
  { id:'morning', vi:'Năng lượng sáng', en:'Morning Energy', clockMode:'floating', backdrop:'natural', scale:95, autoHide:true },
  { id:'deep', vi:'Tập trung sâu', en:'Deep Focus', clockMode:'minimal', backdrop:'cinema', scale:90, autoHide:true },
  { id:'rainy', vi:'Học cùng mưa', en:'Rainy Study', clockMode:'glass', backdrop:'dreamy', scale:100, autoHide:true },
  { id:'evening', vi:'Buổi tối tĩnh lặng', en:'Evening Calm', clockMode:'sense', backdrop:'dark', scale:94, autoHide:true },
  { id:'classroom', vi:'Trình chiếu lớp học', en:'Classroom Display', clockMode:'floating', backdrop:'natural', scale:120, autoHide:false },
]);
const MODES = ['sense','minimal','glass','floating'];
const BACKDROPS = ['natural','cinema','dreamy','dark'];
const DEFAULTS = Object.freeze({
  clockMode:'sense', autoHide:true, scale:100, showSeconds:false, hour12:false,
  backdrop:'natural', dim:24, saturation:100, contrast:100, blur:0,
  dock:['timer','notes','soundscape','brightness'], atmosphere:'custom',
  intention:'', immersive:false, customPreset:null,
});
const finiteRange = (x, lo, hi, def) => Number.isFinite(Number(x))
  ? Math.max(lo,Math.min(hi,Number(x))) : def;
export function normalizeFocusAppearance(value) {
  const v=value&&typeof value==='object'?value:{};
  return {
    clockMode:MODES.includes(v.clockMode)?v.clockMode:DEFAULTS.clockMode,
    autoHide:v.autoHide!==false,
    scale:finiteRange(v.scale,75,125,100),
    showSeconds:v.showSeconds===true,
    hour12:v.hour12===true,
    backdrop:BACKDROPS.includes(v.backdrop)?v.backdrop:'natural',
    dim:finiteRange(v.dim,0,85,24),
    saturation:finiteRange(v.saturation,60,160,100),
    contrast:finiteRange(v.contrast,75,135,100),
    blur:finiteRange(v.blur,0,8,0),
    dock:Array.isArray(v.dock) ? [...new Set(v.dock.filter(x=>DEFAULTS.dock.includes(x)))].concat(DEFAULTS.dock.filter(x=>!v.dock.includes(x))) : [...DEFAULTS.dock],
    atmosphere:FOCUS6_ATMOSPHERES.some(x=>x.id===v.atmosphere)?v.atmosphere:'custom',
    intention:typeof v.intention==='string'?v.intention.slice(0,100):'',
    immersive:v.immersive===true,
    customPreset:v.customPreset&&typeof v.customPreset==='object'?{
      name:typeof v.customPreset.name==='string'?v.customPreset.name.slice(0,30):'My Space',
      clockMode:MODES.includes(v.customPreset.clockMode)?v.customPreset.clockMode:'sense',
      backdrop:BACKDROPS.includes(v.customPreset.backdrop)?v.customPreset.backdrop:'natural',
      scale:finiteRange(v.customPreset.scale,75,125,100),
      dim:finiteRange(v.customPreset.dim,0,85,24),
      saturation:finiteRange(v.customPreset.saturation,60,160,100),
      contrast:finiteRange(v.customPreset.contrast,75,135,100),
      blur:finiteRange(v.customPreset.blur,0,8,0),
      autoHide:v.customPreset.autoHide!==false,
    }:null,
  };
}
export function readFocusAppearance(userId) {
  try {
    const raw=localStorage.getItem(STORAGE_PREFIX + (userId || 'guest'));
    return raw?normalizeFocusAppearance(JSON.parse(raw)):normalizeFocusAppearance(DEFAULTS);
  } catch {return normalizeFocusAppearance(DEFAULTS);}
}
export function useFocusAppearance(userId) {
  const [appearance,setPreferences]=useState(()=>readFocusAppearance(userId));
  useEffect(()=>setPreferences(readFocusAppearance(userId)),[userId]);
  const setAppearance=patch=>setPreferences(prev=>{
    const next=normalizeFocusAppearance({...prev,...patch});
    try{localStorage.setItem(STORAGE_PREFIX+(userId||'guest'),JSON.stringify(next));}
    catch{/* Storage denied; in-memory preference remains. */}
    return next;
  });
  return {appearance,setAppearance};
}
export default useFocusAppearance;
