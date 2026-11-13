// Museum V5: deterministic 3D focus transitions, free of DOM/Three dependencies.
// Keep the real artwork Object3D mounted and interpolate its existing pose.
export const FOCUS_INITIAL=Object.freeze({
 phase:'idle',exhibitId:null,roomId:null,generation:0,errorCode:null
});
export const FOCUS_BUSY=new Set(['preparing','extracting','presenting','focused','returning']);
export const FOCUS_DURATIONS=Object.freeze({
 extracting:.82,presenting:.22,returning:.90,reduced:.08
});
export function focusReducer(state,action){
 switch(action.type){
  case 'SELECT':
   if(state.phase!=='idle'||!action.exhibitId||!action.roomId)return state;
   return {...FOCUS_INITIAL,phase:'preparing',exhibitId:action.exhibitId,
    roomId:action.roomId,generation:state.generation+1};
  case 'PREPARED':
   return state.phase==='preparing'?{...state,phase:'extracting'}:state;
  case 'EXTRACT_COMPLETE':
   return state.phase==='extracting'?{...state,phase:'presenting'}:state;
  case 'PRESENT_COMPLETE':
   return state.phase==='presenting'?{...state,phase:'focused'}:state;
  case 'BACK':
   return ['preparing','extracting','presenting','focused','error'].includes(state.phase)?
    {...state,phase:'returning'}:state;
  case 'RETURN_COMPLETE':
   return state.phase==='returning'?{...FOCUS_INITIAL,generation:state.generation+1}:state;
  case 'FAIL':
   return state.phase!=='idle'&&state.phase!=='returning'?
    {...state,phase:'error',errorCode:action.code||'INVALID_EXHIBIT'}:state;
  case 'RESET':
   return {...FOCUS_INITIAL,generation:state.generation+1};
  default:return state;
 }
}
export const smoothstep=value=>{
 const x=Math.max(0,Math.min(1,Number(value)||0));
 return x*x*(3-2*x);
};
export function interpolatePose(source,target,progress){
 const t=smoothstep(progress);
 const lerp=(a,b)=>a+(b-a)*t;
 return {position:source.position.map((v,i)=>lerp(v,target.position[i])),
  scale:source.scale.map((v,i)=>lerp(v,target.scale[i]))};
}
export function poseWithinTolerance(a,b,epsilon=1e-3){
 if(!a||!b)return false;
 return ['position','quaternion','scale'].every(key=>
  Array.isArray(a[key])&&Array.isArray(b[key])&&a[key].length===b[key].length&&
  a[key].every((n,i)=>Math.abs(n-b[key][i])<=epsilon));
}
// A single world-space layout drives artwork, plaque and pedestal. The camera
// uses the combined bounds + aspect to fit all objects with a safety margin.
export function museumFocusLayout(aspect=16/9){
 const portrait=aspect<.88,tablet=aspect<1.38;
 const art=portrait?[-.85,3.16,-3.60]:[-1.69,2.32,-3.52];
 const plaque=portrait?[.76,1.12,-3.30]:[1.69,2.20,-3.43];
 const cameraZ=portrait?5.5:tablet?3.25:1.35;
 const fov=portrait?69:tablet?63:55;
 return {art,plaque,
  pedestal:[art[0],portrait?.35:.26,art[2]-.04],
  camera:[0,portrait?2.35:2.06,cameraZ],lookAt:[0,portrait?2.38:2.54,-3.45],
  fov,plaqueWidth:portrait?2.55:2.58,plaqueHeight:portrait?2.34:1.95};
}
// Conservative perspective-fit recommendation based on combined XY bounds.
// Bounding box is in world-space and camera faces the negative Z direction.
export function minimumCameraDistance(width,height,aspect,fovDegrees,padding=.10){
 const safeAspect=Math.max(.45,Number(aspect)||16/9);
 const fov=Math.max(20,Math.min(90,Number(fovDegrees)||55))*Math.PI/180;
 const effective=1+Math.max(.05,padding)*2;
 return Math.max(height*effective/(2*Math.tan(fov/2)),
  width*effective/(2*Math.tan(fov/2)*safeAspect));
}
export function selectFocusDuration(phase,reducedMotion=false){
 if(reducedMotion)return FOCUS_DURATIONS.reduced;
 return FOCUS_DURATIONS[phase]||.82;
}
