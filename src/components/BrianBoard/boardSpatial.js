/** TeachKit-inspired spatial classroom functions, independently implemented.
 * No framework, AI, remote fetching or shared account data.
 */
export const MIN_WORLD=-100000,MAX_WORLD=100000;
export const FRAME_LIMIT=32,FRAME_MIN_WIDTH=240,FRAME_MIN_HEIGHT=135;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function safeBoardViewport(raw,defaults={x:0,y:0,width:1600,height:900}){
 const width=clamp(finite(raw?.width,defaults.width),200,10000);
 const height=clamp(finite(raw?.height,defaults.height),112.5,10000);
 return {x:clamp(finite(raw?.x,defaults.x),MIN_WORLD,MAX_WORLD),
  y:clamp(finite(raw?.y,defaults.y),MIN_WORLD,MAX_WORLD),width,height};
}
export function normalizeBoardFrames(frames){
 if(!Array.isArray(frames))return [];
 const seen=new Set();
 return frames.slice(0,FRAME_LIMIT).flatMap((raw,index)=>{
  if(!raw||typeof raw!=='object')return [];
  const id=String(raw.id||'').slice(0,85);
  if(!id||seen.has(id))return [];
  seen.add(id);
  const v=safeBoardViewport(raw);
  return [{id,title:String(raw.title||'Frame '+(index+1)).trim().slice(0,90)||'Frame '+(index+1),
   x:v.x,y:v.y,width:clamp(v.width,FRAME_MIN_WIDTH,8000),height:clamp(v.height,FRAME_MIN_HEIGHT,4500),
   hidden:raw.hidden===true}];
 });
}
export function frameFromCorners(id,start,end,title='Frame'){
 const left=Math.min(finite(start?.x),finite(end?.x)),top=Math.min(finite(start?.y),finite(end?.y));
 const width=Math.abs(finite(end?.x)-finite(start?.x)),height=Math.abs(finite(end?.y)-finite(start?.y));
 if(width<FRAME_MIN_WIDTH||height<FRAME_MIN_HEIGHT)return null;
 return normalizeBoardFrames([{id,title,x:left,y:top,width,height}])[0]||null;
}
export function viewportForFrame(frame,boardW=1600,boardH=900){
 const w=Math.max(200,finite(frame?.width,boardW)),h=Math.max(112.5,finite(frame?.height,boardH));
 const scale=Math.max(w/boardW,h/boardH);
 const vw=boardW*scale,vh=boardH*scale;
 const x=finite(frame?.x)+(w-vw)/2,y=finite(frame?.y)+(h-vh)/2;
 return safeBoardViewport({x,y,width:vw,height:vh});
}
export function cameraForViewport(v,boardW=1600,boardH=900){
 const viewport=safeBoardViewport(v);
 const zoom=clamp(Math.min(boardW/viewport.width,boardH/viewport.height),.2,5);
 return {camera:{x:viewport.x,y:viewport.y},zoom};
}
export function nextFramePlacement(frames=[],w=1600,h=900){
 const list=normalizeBoardFrames(frames);
 if(!list.length)return {x:0,y:0,width:w,height:h};
 const last=list.at(-1);
 return {x:clamp(last.x+last.width+120,MIN_WORLD,MAX_WORLD),y:last.y,width:w,height:h};
}
export function adjacentFrameIndex(frames,currentId,direction){
 const list=normalizeBoardFrames(frames).filter(f=>!f.hidden);
 if(!list.length)return -1;
 const i=list.findIndex(x=>x.id===currentId);
 return clamp((i<0?(direction>0?-1:0):i)+Math.sign(direction||1),0,list.length-1);
}
