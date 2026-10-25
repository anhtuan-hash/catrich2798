/** Brian Board V8 – deterministic canvas editing without AI or server dependencies. */
import {spatialObjectBounds} from './boardSpatial.js';

const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const shift=(point,dx,dy)=>({...point,x:finite(point.x)+dx,y:finite(point.y)+dy});
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const inside=(point,polygon)=>{
 let contained=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)contained=!contained;
 }
 return contained;
};
export function lassoObjectIds(objects,polygon){
 if(!Array.isArray(polygon)||polygon.length<3)return [];
 return (objects||[]).filter(obj=>{
  if(obj.locked||obj.hidden)return false;
  const box=spatialObjectBounds(obj);
  if(!box)return false;
  const center={x:box.x+box.width/2,y:box.y+box.height/2};
  return inside(center,polygon);
 }).map(o=>o.id);
}
export function moveBoardObjects(objects,ids,dx,dy){
 const keys=new Set(ids),x=finite(dx),y=finite(dy);
 return objects.map(o=>{
  if(!keys.has(o.id)||o.locked)return o;
  if(o.kind==='stroke')return {...o,points:(o.points||[]).map(p=>shift(p,x,y))};
  if(o.kind==='shape')return {...o,x:finite(o.x)+x,y:finite(o.y)+y,x2:finite(o.x2)+x,y2:finite(o.y2)+y};
  return {...o,x:finite(o.x)+x,y:finite(o.y)+y};
 });
}
export function scaleBoardObjects(objects,ids,factor,origin){
 const scale=Math.max(.5,Math.min(2,finite(factor,1)));
 const chosen=new Set(ids);
 const bounds=(objects||[]).filter(o=>chosen.has(o.id)).map(spatialObjectBounds).filter(Boolean);
 if(!bounds.length)return objects;
 const px=origin?.x??Math.min(...bounds.map(x=>x.x)),py=origin?.y??Math.min(...bounds.map(x=>x.y));
 const tx=v=>px+(finite(v)-px)*scale,ty=v=>py+(finite(v)-py)*scale;
 return objects.map(o=>{
  if(!chosen.has(o.id)||o.locked)return o;
  if(o.kind==='stroke')return {...o,points:(o.points||[]).map(p=>({...p,x:tx(p.x),y:ty(p.y)})),
   width:Math.max(1,finite(o.width,4)*scale)};
  if(o.kind==='shape')return {...o,x:tx(o.x),y:ty(o.y),x2:tx(o.x2),y2:ty(o.y2)};
  return {...o,x:tx(o.x),y:ty(o.y),
   ...(o.kind==='image'||o.kind==='mask'?{width:Math.max(24,finite(o.width,300)*scale),height:Math.max(24,finite(o.height,120)*scale)}:{}),
   ...(o.kind==='text'?{fontSize:Math.max(12,Math.min(160,finite(o.fontSize,40)*scale))}:{})};
 });
}
export function duplicateBoardObjects(objects,ids){
 const selected=new Set(ids);
 return [...objects,...objects.filter(o=>selected.has(o.id)).map(o=>{
  let copy={...o,id:id()};
  if(o.kind==='stroke')copy.points=o.points.map(p=>shift(p,35,35));
  else if(o.kind==='shape'){copy.x+=35;copy.y+=35;copy.x2+=35;copy.y2+=35;}
  else{copy.x=finite(o.x)+35;copy.y=finite(o.y)+35;}
  return copy;
 })];
}
export function reorderBoardObjects(objects,ids,action){
 const keys=new Set(ids),rest=objects.filter(o=>!keys.has(o.id)),picked=objects.filter(o=>keys.has(o.id));
 if(action==='front')return [...rest,...picked];
 if(action==='back')return [...picked,...rest];
 return objects;
}
export function splitStrokeByEraser(stroke,point,radius=24){
 const pts=Array.isArray(stroke?.points)?stroke.points:[];
 if(stroke?.kind!=='stroke'||!pts.length)return [stroke];
 const r=Math.max(3,Math.min(120,finite(radius,24))),segments=[];
 let current=[],changed=false;
 const push=()=>{if(current.length){segments.push(current);current=[];}};
 for(let i=0;i<pts.length;i++){
  const p=pts[i],near=Math.hypot(p.x-point.x,p.y-point.y)<=r;
  let crossing=false;
  if(i>0){
   const a=pts[i-1],vx=p.x-a.x,vy=p.y-a.y,den=vx*vx+vy*vy;
   const t=den?Math.max(0,Math.min(1,((point.x-a.x)*vx+(point.y-a.y)*vy)/den)):0;
   crossing=Math.hypot(a.x+vx*t-point.x,a.y+vy*t-point.y)<=r;
  }
  if(near||crossing){changed=true;push();}else current.push(p);
 }
 push();
 if(!changed)return [stroke];
 return segments.filter(x=>x.length>0).map((points,i)=>({...stroke,id:i===0?stroke.id:id(),points}));
}
export function eraseInkAtPoint(objects,point,radius=24){
 return objects.flatMap(o=>o.kind==='stroke'&&!o.locked?splitStrokeByEraser(o,point,radius):[o]);
}
export function groupBounds(objects,ids){
 const keys=new Set(ids),b=objects.filter(o=>keys.has(o.id)).map(spatialObjectBounds).filter(Boolean);
 if(!b.length)return null;
 const x=Math.min(...b.map(q=>q.x)),y=Math.min(...b.map(q=>q.y));
 return {x,y,width:Math.max(...b.map(q=>q.x+q.width))-x,height:Math.max(...b.map(q=>q.y+q.height))-y};
}
export const BOARD_V8_TEMPLATES=[
 {id:'reading',vi:'Reading · Hai cột',en:'Reading · Two columns'},
 {id:'grammar',vi:'Grammar · Giải thích',en:'Grammar · Explanation'},
 {id:'vocabulary',vi:'Vocabulary Wall',en:'Vocabulary Wall'},
 {id:'debate',vi:'Debate · For / Against',en:'Debate · For / Against'},
 {id:'timeline',vi:'Timeline · Dòng thời gian',en:'Timeline'},
 {id:'exit',vi:'Exit Ticket',en:'Exit Ticket'},
 {id:'mindmap',vi:'Mind Map',en:'Mind Map'}
];
export function buildBoardTemplate(name,viewport={x:0,y:0,width:1600,height:900},vi=true){
 if(!BOARD_V8_TEMPLATES.some(t=>t.id===name))return [];
 const x=finite(viewport.x)+Math.max(50,finite(viewport.width,1600)*.08),
  y=finite(viewport.y)+Math.max(70,finite(viewport.height,900)*.12),
  w=Math.min(1200,finite(viewport.width,1600)*.8);
 const txt=(text,px,py,size=36)=>({kind:'text',id:id(),x:px,y:py,text,fontSize:size,
  color:'#325d50',studentVisible:true});
 const rect=(px,py,wid,hei,fill='#e4f2e9')=>({kind:'shape',id:id(),shape:'rect',x:px,y:py,
  x2:px+wid,y2:py+hei,color:'#50907b',width:3,fill,studentVisible:true});
 const title=BOARD_V8_TEMPLATES.find(t=>t.id===name)[vi?'vi':'en'];
 if(name==='reading')return [txt(title,x,y,48),rect(x,y+60,w*.48,570),rect(x+w*.52,y+60,w*.48,570),
  txt('READING TEXT',x+25,y+130,34),txt('QUESTIONS / EVIDENCE',x+w*.55,y+130,32)];
 if(name==='grammar')return [txt(title,x,y,48),rect(x,y+70,w,155),txt('RULE / FORM',x+30,y+150),
  rect(x,y+255,w*.48,320),rect(x+w*.52,y+255,w*.48,320),txt('EXAMPLES',x+25,y+335),txt('PRACTICE',x+w*.55,y+335)];
 if(name==='vocabulary')return [txt(title,x,y,48),...Array.from({length:8},(_,i)=>rect(x+(i%4)*(w/4+3),y+75+Math.floor(i/4)*240,w/4-13,214,'#fff1cd'))];
 if(name==='debate')return [txt(title,x,y,48),rect(x,y+70,w*.48,495,'#e0f0e6'),rect(x+w*.52,y+70,w*.48,495,'#fbe8df'),
  txt('FOR',x+34,y+142,38),txt('AGAINST',x+w*.55,y+142,38)];
 if(name==='timeline')return [txt(title,x,y,48),{kind:'shape',id:id(),shape:'arrow',x,y:y+330,x2:x+w,y2:y+330,
  color:'#397d65',width:8,fill:'none',studentVisible:true},...Array.from({length:5},(_,i)=>txt(String(i+1),
  x+i*w/5+35,y+273,36))];
 if(name==='exit')return [txt(title,x,y,48),...['3 things I learned','2 questions I have','1 action I will take'].map((t,i)=>[
  rect(x,y+70+i*195,w,178,i%2?'#e4ebfb':'#e6f3e8'),txt(t,x+25,y+140+i*195,35)]).flat()];
 return [txt(title,x,y,48),rect(x+w*.34,y+250,w*.31,115),txt('MAIN IDEA',x+w*.37,y+310,30),
  ...['CAUSES','EXAMPLES','EFFECTS','SOLUTIONS'].map((t,i)=>txt(t,x+(i%2)*w*.58,y+150+Math.floor(i/2)*350,31))];
}

/** Optional hold-to-perfect geometry. Deterministic analytic recognition; not AI. */
export function recognizeBoardGesture(points){
 const p=Array.isArray(points)?points.filter(v=>Number.isFinite(v?.x)&&Number.isFinite(v?.y)):[];
 if(p.length<7)return null;
 const xs=p.map(q=>q.x),ys=p.map(q=>q.y);
 const left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys);
 const w=right-left,h=bottom-top,diag=Math.hypot(w,h);
 if(diag<80)return null;
 const start=p[0],end=p.at(-1);
 const closed=Math.hypot(start.x-end.x,start.y-end.y)<diag*.19;
 if(!closed){
  const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
  if(length<60)return null;
  const average=p.reduce((sum,q)=>sum+Math.abs(dy*q.x-dx*q.y+end.x*start.y-end.y*start.x)/length,0)/p.length;
  return average<Math.max(9,length*.046)?{shape:'line',x:start.x,y:start.y,x2:end.x,y2:end.y}:null;
 }
 if(w<50||h<50)return null;
 const center={x:(left+right)/2,y:(top+bottom)/2};
 const radii=p.map(q=>Math.hypot((q.x-center.x)/(w/2),(q.y-center.y)/(h/2)));
 const error=radii.reduce((sum,r)=>sum+Math.abs(r-1),0)/radii.length;
 return {shape:error<.21?'ellipse':'rect',x:left,y:top,x2:right,y2:bottom};
}

/** Two-node diagram connection: positions follow source/target on editing.
 * Public student payloads only include rendered arrow coordinates.
 */
export function boardObjectCenter(o){
 const b=spatialObjectBounds(o);
 return b?{x:b.x+b.width/2,y:b.y+b.height/2}:null;
}
export function createDiagramConnection(objects,fromId,toId){
 if(!fromId||!toId||fromId===toId)return null;
 const source=objects.find(o=>o.id===fromId),target=objects.find(o=>o.id===toId);
 if(!source||!target)return null;
 const a=boardObjectCenter(source),b=boardObjectCenter(target);
 if(!a||!b)return null;
 return {id:id(),kind:'shape',shape:'arrow',x:a.x,y:a.y,x2:b.x,y2:b.y,
  fromId,toId,color:'#347963',width:6,fill:'none',studentVisible:true};
}
export function syncDiagramConnections(objects){
 const byId=new Map(objects.map(o=>[o.id,o]));
 return objects.map(o=>{
  if(o.kind!=='shape'||!o.fromId||!o.toId)return o;
  const a=boardObjectCenter(byId.get(o.fromId)),b=boardObjectCenter(byId.get(o.toId));
  return a&&b?{...o,x:a.x,y:a.y,x2:b.x,y2:b.y}:o;
 });
}

/** Eight-handle transform, with opposite handle anchored and safe scale bounds.
 * Live preview is handled by the canvas; only final numeric coordinates are persisted.
 */
export const BOARD_RESIZE_HANDLES=['nw','n','ne','e','se','s','sw','w'];
export function groupResizeTransform(objects,ids,handle,delta){
 const bounds=groupBounds(objects,ids);
 if(!bounds||!BOARD_RESIZE_HANDLES.includes(handle))return objects;
 const selected=new Set(ids);
 const dx=finite(delta?.x),dy=finite(delta?.y);
 const minWidth=36,minHeight=36;
 const x1=bounds.x,y1=bounds.y,x2=x1+bounds.width,y2=y1+bounds.height;
 let left=x1,right=x2,top=y1,bottom=y2;
 if(handle.includes('w'))left=Math.min(right-minWidth,x1+dx);
 if(handle.includes('e'))right=Math.max(left+minWidth,x2+dx);
 if(handle.includes('n'))top=Math.min(bottom-minHeight,y1+dy);
 if(handle.includes('s'))bottom=Math.max(top+minHeight,y2+dy);
 const fx=Math.max(.2,Math.min(5,(right-left)/Math.max(1,bounds.width)));
 const fy=Math.max(.2,Math.min(5,(bottom-top)/Math.max(1,bounds.height)));
 // Opposite edge remains stationary, centered edges retain their original axis.
 const xAnchor=handle.includes('w')?x2:handle.includes('e')?x1:x1;
 const yAnchor=handle.includes('n')?y2:handle.includes('s')?y1:y1;
 const tx=v=>xAnchor+(finite(v)-xAnchor)*fx;
 const ty=v=>yAnchor+(finite(v)-yAnchor)*fy;
 return objects.map(o=>{
  if(!selected.has(o.id)||o.locked)return o;
  if(o.kind==='stroke')return {...o,points:(o.points||[]).map(p=>({...p,x:tx(p.x),y:ty(p.y)})),
   width:Math.max(1,finite(o.width,4)*Math.sqrt(fx*fy))};
  if(o.kind==='shape')return {...o,x:tx(o.x),y:ty(o.y),x2:tx(o.x2),y2:ty(o.y2)};
  const changes={x:tx(o.x),y:ty(o.y)};
  if(o.kind==='image'||o.kind==='mask')Object.assign(changes,{
   width:Math.max(24,finite(o.width,300)*fx),
   height:Math.max(24,finite(o.height,120)*fy)});
  if(o.kind==='text')changes.fontSize=Math.max(12,Math.min(160,finite(o.fontSize,40)*Math.sqrt(fx*fy)));
  return {...o,...changes};
 });
}

/** Rotation preserves each item's native SVG primitives for PDF, TV and handwriting. */
export function rotateBoardObjects(objects,ids,degrees){
 const angle=Math.max(-180,Math.min(180,finite(degrees)));
 const picked=new Set(ids),bounds=groupBounds(objects,ids);
 if(!bounds||!angle)return objects;
 const eligible=objects.filter(o=>picked.has(o.id)&&!o.locked);
 const only=eligible.length===1?eligible[0]:null;
 const center=only?.kind==='shape'&&['line','arrow'].includes(only.shape)?
  {x:(finite(only.x)+finite(only.x2))/2,y:(finite(only.y)+finite(only.y2))/2}:
  {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 const theta=angle*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta);
 const turn=(x,y)=>({
  x:center.x+(finite(x)-center.x)*cos-(finite(y)-center.y)*sin,
  y:center.y+(finite(x)-center.x)*sin+(finite(y)-center.y)*cos
 });
 return objects.map(o=>{
  if(!picked.has(o.id)||o.locked)return o;
  const b=spatialObjectBounds(o),itemCenter=b&&{x:b.x+b.width/2,y:b.y+b.height/2};
  if(!itemCenter)return o;
  // A straight line/arrow can be rotated entirely by changing its endpoints.
  if(o.kind==='shape'&&['line','arrow'].includes(o.shape)){
   const a=turn(o.x,o.y),z=turn(o.x2,o.y2);
   return {...o,x:a.x,y:a.y,x2:z.x,y2:z.y};
  }
  if(o.kind==='stroke'){
   return {...o,points:(o.points||[]).map(p=>({...p,...turn(p.x,p.y)}))};
  }
  const destination=turn(itemCenter.x,itemCenter.y);
  const dx=destination.x-itemCenter.x,dy=destination.y-itemCenter.y;
  if(o.kind==='shape')return {...o,x:o.x+dx,y:o.y+dy,
   x2:o.x2+dx,y2:o.y2+dy,rotation:(finite(o.rotation)+angle+360)%360};
  return {...o,x:o.x+dx,y:o.y+dy,rotation:(finite(o.rotation)+angle+360)%360};
 });
}
export function alignBoardObjects(objects,ids,operation){
 const keys=new Set(ids),selected=objects.filter(o=>keys.has(o.id)&&!o.locked);
 if(selected.length<2)return objects;
 const bounds=selected.map(o=>spatialObjectBounds(o)).filter(Boolean);
 if(bounds.length!==selected.length)return objects;
 const left=Math.min(...bounds.map(b=>b.x)),right=Math.max(...bounds.map(b=>b.x+b.width));
 const top=Math.min(...bounds.map(b=>b.y)),bottom=Math.max(...bounds.map(b=>b.y+b.height));
 const items=selected.map((o,i)=>({id:o.id,b:bounds[i]}));
 const centers=items.map(v=>({id:v.id,x:v.b.x+v.b.width/2,y:v.b.y+v.b.height/2}));
 const changes=new Map();
 if(['left','center','right','top','middle','bottom'].includes(operation)){
  for(const item of items){
   let dx=0,dy=0;
   if(operation==='left')dx=left-item.b.x;
   if(operation==='center')dx=(left+right-item.b.width)/2-item.b.x;
   if(operation==='right')dx=right-item.b.width-item.b.x;
   if(operation==='top')dy=top-item.b.y;
   if(operation==='middle')dy=(top+bottom-item.b.height)/2-item.b.y;
   if(operation==='bottom')dy=bottom-item.b.height-item.b.y;
   changes.set(item.id,{x:dx,y:dy});
  }
 }else if((operation==='distribute-x'||operation==='distribute-y')&&items.length>=3){
  const axis=operation==='distribute-x'?'x':'y';
  const sorted=[...centers].sort((a,b)=>a[axis]-b[axis]);
  const first=sorted[0][axis],last=sorted.at(-1)[axis];
  sorted.forEach((entry,i)=>{
   const offset=first+(last-first)*i/(sorted.length-1)-entry[axis];
   changes.set(entry.id,axis==='x'?{x:offset,y:0}:{x:0,y:offset});
  });
 }else return objects;
 return moveBoardObjects(objects,[...changes.keys()],0,0).map(o=>{
  const d=changes.get(o.id);
  if(!d)return o;
  return moveBoardObjects([o],[o.id],d.x,d.y)[0];
 });
}

/** Auto-layout diagram nodes. Existing strokes and image contents are not regenerated. */
export function layoutBoardNodes(objects,ids,mode='horizontal',gap=50){
 const chosen=new Set(ids);
 const elements=objects.filter(o=>chosen.has(o.id)&&!o.locked&&
  o.kind!=='stroke'&&!(o.kind==='shape'&&o.fromId&&o.toId));
 if(elements.length<2||!['horizontal','vertical','grid'].includes(mode))return objects;
 const bounds=elements.map(spatialObjectBounds);
 if(bounds.some(b=>!b))return objects;
 const firstX=Math.min(...bounds.map(b=>b.x)),firstY=Math.min(...bounds.map(b=>b.y));
 const cells=elements.map((o,i)=>({id:o.id,width:bounds[i].width,height:bounds[i].height}));
 const spacing=Math.max(10,Math.min(220,finite(gap,50)));
 const targets=new Map();
 if(mode==='horizontal'){
  const rowHeight=Math.max(...cells.map(c=>c.height));let x=firstX;
  cells.forEach(cell=>{
   targets.set(cell.id,{x,y:firstY+(rowHeight-cell.height)/2});
   x+=cell.width+spacing;
  });
 }else if(mode==='vertical'){
  const colWidth=Math.max(...cells.map(c=>c.width));let y=firstY;
  cells.forEach(cell=>{
   targets.set(cell.id,{x:firstX+(colWidth-cell.width)/2,y});
   y+=cell.height+spacing;
  });
 }else{
  const cols=Math.ceil(Math.sqrt(cells.length)),cellW=Math.max(...cells.map(c=>c.width));
  const cellH=Math.max(...cells.map(c=>c.height));
  cells.forEach((cell,i)=>{
   const col=i%cols,row=Math.floor(i/cols);
   targets.set(cell.id,{x:firstX+col*(cellW+spacing)+(cellW-cell.width)/2,
    y:firstY+row*(cellH+spacing)+(cellH-cell.height)/2});
  });
 }
 return objects.map(o=>{
  const index=elements.findIndex(el=>el.id===o.id);
  if(index<0)return o;
  const oldBounds=bounds[index],pos=targets.get(o.id);
  const dx=pos.x-oldBounds.x,dy=pos.y-oldBounds.y;
  return moveBoardObjects([o],[o.id],dx,dy)[0];
 });
}
