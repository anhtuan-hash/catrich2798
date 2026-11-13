// V5: one exhibit at a time, physically animated by the existing PaperArtwork group.
// Pure state + pose mathematics, independently testable without a WebGL renderer.
export const FOCUS_IDLE=Object.freeze({phase:'idle',exhibitId:null,roomId:null,generation:0,errorCode:null});
const ACTIVE=new Set(['preparing','extracting','presenting','focused']);
export const focusActive=state=>state?.phase!=='idle'&&state?.phase!=='error';
export function focusReducer(state,action){
 switch(action?.type){
  case 'SELECT':
   if(state.phase!=='idle'||!action.exhibitId)return state;
   return {...state,phase:'preparing',exhibitId:action.exhibitId,
    roomId:action.roomId||null,generation:state.generation+1,errorCode:null};
  case 'ASSET_READY':
   return state.phase==='preparing'&&action.generation===state.generation?
    {...state,phase:'extracting'}:state;
  case 'ARRIVED':
   return (state.phase==='extracting'||state.phase==='presenting')&&action.generation===state.generation?
    {...state,phase:'focused'}:state;
  case 'PRESENTING':
   return state.phase==='extracting'&&action.generation===state.generation?
    {...state,phase:'presenting'}:state;
  case 'BACK':
   return ACTIVE.has(state.phase)?{...state,phase:'returning'}:state;
  case 'RETURN_COMPLETE':
   return state.phase==='returning'&&action.generation===state.generation?
    {...FOCUS_IDLE,generation:state.generation+1}:state;
  case 'FAIL':
   return action.generation===state.generation?
    {...state,phase:'error',errorCode:action.errorCode||'INVALID_EXHIBIT'}:state;
  case 'RESET':
   return {...FOCUS_IDLE,generation:state.generation+1};
  default:return state;
 }
}
export const smoothstep=t=>{
 const v=Math.max(0,Math.min(1,Number(t)||0));
 return v*v*(3-2*v);
};
export const clampDelta=delta=>Math.min(.05,Math.max(0,Number(delta)||0));
export const FOCUS_POSITIONS=Object.freeze({
 desktop:{artwork:[-1.70,2.47,-3.56],board:[1.58,2.33,-3.51],camera:[0,2.18,2.05],
  look:[0,2.28,-3.55],artworkScale:1},
 tablet:{artwork:[-1.35,2.41,-4.0],board:[1.37,2.3,-3.94],camera:[0,2.13,2.9],
  look:[0,2.25,-3.94],artworkScale:.85},
 mobile:{artwork:[-.67,2.48,-4.05],board:[.60,2.05,-3.65],camera:[0,2.23,4.70],
  look:[0,2.29,-3.85],artworkScale:.66}
});
export function focusLayout(width=1536,height=864){
 const w=Number(width)||1536,h=Number(height)||864;
 if(w<650||w/h<.83)return FOCUS_POSITIONS.mobile;
 if(w<1100||w/h<1.34)return FOCUS_POSITIONS.tablet;
 return FOCUS_POSITIONS.desktop;
}
export function blendPose(wall,focus,amount){
 const t=smoothstep(amount);
 return {
  position:wall.position.map((v,i)=>v+(focus.position[i]-v)*t),
  scale:wall.scale.map((v,i)=>v+(focus.scale[i]-v)*t),
  // Wall and focus rotations are identity for this room; quaternion interpolation
  // is performed on Three.js objects using slerp in the physical mesh component.
  progress:t
 };
}
export function nearlyEqualPose(a,b,epsilon=1e-3){
 return ['position','scale'].every(k=>Array.isArray(a?.[k])&&Array.isArray(b?.[k])&&
  a[k].every((v,i)=>Math.abs(v-b[k][i])<epsilon));
}
