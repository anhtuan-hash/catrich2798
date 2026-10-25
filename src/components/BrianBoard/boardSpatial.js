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
 const visibleWidth=boardW/zoom,visibleHeight=boardH/zoom;
 return {camera:{
  x:clamp(viewport.x+(viewport.width-visibleWidth)/2,MIN_WORLD,MAX_WORLD),
  y:clamp(viewport.y+(viewport.height-visibleHeight)/2,MIN_WORLD,MAX_WORLD)
 },zoom};
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

/** Map bounds for navigation only. No content or answer strings leave this module. */
export function spatialObjectBounds(object){
 if(!object||typeof object!=='object')return null;
 const kind=object.kind;
 if(kind==='stroke'){
  const points=Array.isArray(object.points)?object.points:[];
  if(!points.length)return null;
  let loX=Infinity,loY=Infinity,hiX=-Infinity,hiY=-Infinity;
  // Full strokes contribute to the overview; never send text/answers.
  for(const point of points.slice(0,4000)){
   const x=Number(point?.x),y=Number(point?.y);
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   loX=Math.min(loX,x);loY=Math.min(loY,y);hiX=Math.max(hiX,x);hiY=Math.max(hiY,y);
  }
  if(!Number.isFinite(loX))return null;
  const pad=Math.max(5,Math.min(48,finite(object.width,5)));
  return {x:loX-pad,y:loY-pad,width:Math.max(1,hiX-loX)+2*pad,height:Math.max(1,hiY-loY)+2*pad};
 }
 const x=finite(object.x),y=finite(object.y);
 if(kind==='shape'){
  const a=finite(object.x2,x),b=finite(object.y2,y);
  return {x:Math.min(x,a),y:Math.min(y,b),width:Math.max(1,Math.abs(a-x)),height:Math.max(1,Math.abs(b-y))};
 }
 if(kind==='image'||kind==='mask')return {x,y,width:Math.max(1,finite(object.width,400)),height:Math.max(1,finite(object.height,180))};
 if(kind==='flashcard')return {x,y,width:340,height:170};
 if(kind==='sticky')return {x,y:y-36,width:Math.max(230,Math.min(520,String(object.text||'').length*13)),height:82};
 if(kind==='text')return {x,y:y-52,width:Math.max(70,Math.min(1350,String(object.text||'').length*24)),height:64};
 return null;
}
export function unionBoardBounds(rectangles,padding=0){
 const valid=rectangles.filter(r=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>=0&&r.height>=0);
 if(!valid.length)return null;
 const x=Math.min(...valid.map(r=>r.x)),y=Math.min(...valid.map(r=>r.y));
 const x2=Math.max(...valid.map(r=>r.x+r.width)),y2=Math.max(...valid.map(r=>r.y+r.height));
 return {x:clamp(x-padding,MIN_WORLD,MAX_WORLD),y:clamp(y-padding,MIN_WORLD,MAX_WORLD),
  width:clamp(x2-x+2*padding,200,10000),height:clamp(y2-y+2*padding,112.5,10000)};
}
/** View, frames, origin and real objects are kept inside the map without huge empty space. */
export function boardOverviewBounds({frames=[],objects=[],viewport=null,includeOrigin=true}={}){
 const initial=includeOrigin?[{x:0,y:0,width:1600,height:900}]:[];
 const pageFrames=normalizeBoardFrames(frames);
 const objectsBounds=(Array.isArray(objects)?objects:[]).slice(0,3000).map(spatialObjectBounds).filter(Boolean);
 const view=safeBoardViewport(viewport);
 return unionBoardBounds([...initial,...pageFrames,...objectsBounds,view],180)||
  {x:-180,y:-180,width:1960,height:1260};
}
export function fitBoardContent({frames=[],objects=[],includeOrigin=false}={},boardW=1600,boardH=900){
 const pageFrames=normalizeBoardFrames(frames).filter(f=>!f.hidden);
 const shapes=(Array.isArray(objects)?objects:[]).slice(0,3000).map(spatialObjectBounds).filter(Boolean);
 const bounds=unionBoardBounds([...pageFrames,...shapes,...(includeOrigin?[{x:0,y:0,width:boardW,height:boardH}]:[])],100);
 return bounds?cameraForViewport(bounds,boardW,boardH):{camera:{x:0,y:0},zoom:1};
}
export function reorderBoardFrame(frames,id,direction){
 const list=normalizeBoardFrames(frames),i=list.findIndex(f=>f.id===id),j=i+direction;
 if(i<0||j<0||j>=list.length||!Number.isInteger(direction)||Math.abs(direction)!==1)return list;
 [list[i],list[j]]=[list[j],list[i]];
 return list;
}
export function duplicateBoardFrame(frames,id,newId){
 const list=normalizeBoardFrames(frames);
 if(list.length>=FRAME_LIMIT||!newId||list.some(f=>f.id===newId))return list;
 const i=list.findIndex(f=>f.id===id);if(i<0)return list;
 const frame=list[i],copy={...frame,id:newId,
  title:(frame.title+' (copy)').slice(0,90),
  x:clamp(frame.x+90,MIN_WORLD,MAX_WORLD),y:clamp(frame.y+90,MIN_WORLD,MAX_WORLD)};
 list.splice(i+1,0,copy);
 return list;
}
