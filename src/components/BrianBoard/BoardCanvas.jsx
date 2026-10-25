import React,{useCallback,useEffect,useRef,useState} from 'react';
import {BOARD_W,BOARD_H,pathFromPoints,makeId} from './boardModel.js';
import {snapBoardPoint,constrainBoardShape,smoothBoardPath,pressureBoardSegments,
 boardShapeGeometry,boardShapePreviewPath} from './boardDrawing.js';
import {frameFromCorners} from './boardSpatial.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

export function renderBoardObject(object,onErase,studentView=false,onInteract,onSelect){
 const o=object;if(studentView&&(o.studentVisible===false||o.teacherOnly))return null;
 const erase=event=>{if(!onErase)return;event.stopPropagation();onErase(o.id);};
 const press=event=>{
  if(onErase)erase(event);
  else if(onSelect){event.stopPropagation();onSelect(o.id,event);}
 };
 if(o.kind==='stroke'){
  if(o.pressureSensitive===true&&Array.isArray(o.points)&&o.points.length>1){
   return <g data-board-object={o.id} key={o.id} opacity={o.opacity??1}
    onPointerDown={press} style={{pointerEvents:onErase||onSelect?'stroke':'none'}}>
    {pressureBoardSegments(o.points,o.width||4).map((seg,i)=><line key={i}
     x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
     stroke={o.color||'#304d53'} strokeWidth={seg.width}
     strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}
   </g>;
  }
  return <path data-board-object={o.id} key={o.id}
   d={o.smoothed?smoothBoardPath(o.points):pathFromPoints(o.points)}
   fill="none" stroke={o.color||'#304d53'} strokeWidth={o.width||4}
   strokeLinecap="round" strokeLinejoin="round" opacity={o.opacity??1}
   vectorEffect="non-scaling-stroke" onPointerDown={press} style={{pointerEvents:onErase||onSelect?'stroke':'none'}}/>;
 }
 if(o.kind==='shape'){
  const common={key:o.id,'data-board-object':o.id,fill:o.fill||'none',stroke:o.color||'#315966',
    strokeWidth:o.width||4,onPointerDown:press,style:{pointerEvents:onErase||onSelect?'all':'none'}};
  const geometry=boardShapeGeometry(o.shape,o.x,o.y,o.x2,o.y2);
  if(geometry)return geometry.type==='polygon'?
   <polygon {...common} points={geometry.points.map(p=>p.join(',')).join(' ')}/>:
   <polyline {...common} points={geometry.points.map(p=>p.join(',')).join(' ')} fill="none"/>;
  return o.shape==='ellipse'?<ellipse {...common} cx={(o.x+o.x2)/2} cy={(o.y+o.y2)/2}
    rx={Math.abs(o.x2-o.x)/2} ry={Math.abs(o.y2-o.y)/2}/>:
   o.shape==='line'?<line {...common} x1={o.x} y1={o.y} x2={o.x2} y2={o.y2}/>:
   <rect {...common} x={Math.min(o.x,o.x2)} y={Math.min(o.y,o.y2)}
    width={Math.abs(o.x2-o.x)} height={Math.abs(o.y2-o.y)} rx={5}/>;
 }
 if(o.kind==='text'||o.kind==='sticky'){
  if(o.kind==='sticky')return <g key={o.id} data-board-object={o.id} onPointerDown={press}
    style={{pointerEvents:onErase?'all':'none'}}>
    <rect x={o.x} y={o.y-36} width={Math.min(520,Math.max(230,(o.text||'').length*13))}
      height={82} rx={14} fill={o.fill||'#fff0c8'} stroke="#b8ab86" strokeWidth="1.5"/>
    <text x={o.x+13} y={o.y+4} fill="#374b4a" fontSize="26">{String(o.text||'').slice(0,32)}</text>
   </g>;
  return <text key={o.id} data-board-object={o.id} x={o.x} y={o.y} onPointerDown={press}
   style={{pointerEvents:onErase||onSelect?'all':'none'}} fill={o.color||'#304d53'}
   fontSize={o.fontSize||40} fontWeight="550">{String(o.text||'').slice(0,90)}</text>;
 }
 if(o.kind==='flashcard')return <g key={o.id} data-board-object={o.id} onPointerDown={event=>{if(onErase||onSelect)press(event);else event.stopPropagation();}} onClick={event=>{if(!onErase&&!studentView){event.stopPropagation();onInteract?.(o.id);}}} style={{cursor:'pointer'}}>
  <rect x={o.x} y={o.y} width="330" height="165" rx="18" fill="#ecf3e9" stroke="#94b2a2" strokeWidth="2"/>
  <text x={o.x+20} y={o.y+65} fill="#325449" fontSize="29">{String(o.text||'').slice(0,21)}</text>
  <text x={o.x+20} y={o.y+119} fill="#6c8d81" fontSize="18">{o.revealed?String(o.publicAnswer||o.privateAnswer||'').slice(0,29):'Tap to reveal'}</text>
 </g>;
 if(o.kind==='image'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(o.src||''))return <image key={o.id} data-board-object={o.id} href={o.src} x={o.x} y={o.y} width={o.width||500} height={o.height||300} preserveAspectRatio="xMidYMid meet" onPointerDown={press}/>
 if(o.kind==='mask'){
  if(o.revealed)return null;
  return <g key={o.id} data-board-object={o.id} style={{cursor:!studentView?'pointer':'default'}}
   onPointerDown={event=>{if(onErase||onSelect)press(event);else event.stopPropagation();}}
   onClick={event=>{if(!studentView&&!onErase&&!onSelect){event.stopPropagation();onInteract?.(o.id);}}}>
   <rect x={o.x} y={o.y} rx={9} width={o.width||240} height={o.height||90}
    fill="#243b4b" opacity=".96"/>
   {!studentView&&<text x={o.x+14} y={o.y+Math.min(53,(o.height||90)/2+11)} fill="#fff"
    fontSize="22" pointerEvents="none">Tap to reveal</text>}
  </g>;
 }
 return null;
}
export default function BoardCanvas({page,tool='pen',color='#355e63',width=5,onCommit,onErase,onDuplicateObject,onMoveObject,
 zoom=1,setZoom,camera={x:0,y:0},setCamera,contentText='',privateAnswer='',onInteract,
 studentView=false,spotlight=false,penPreset='classic',snapToGrid=false,shapeFill='none',vi=true,
 frames=[],showFrames=true,onCreateFrame,activeFrameId=null,onPointerPosition}){
 const svg=useRef(null),preview=useRef(null),pointer=useRef(null);
 const [drawing,setDrawing]=useState(false),[selectedId,setSelectedId]=useState('');
 const [laser,setLaser]=useState(null);
 const stylusActive=useRef(false);
 useEffect(()=>{setSelectedId('');pointer.current=null;stylusActive.current=false;},[page?.id]);
 const viewWidth=BOARD_W/zoom,viewHeight=BOARD_H/zoom;
 const local=event=>{
  const root=svg.current;if(!root)return {x:0,y:0};
  const point=root.createSVGPoint();
  point.x=event.clientX;point.y=event.clientY;
  const matrix=root.getScreenCTM();
  if(!matrix)return {x:0,y:0};
  const world=point.matrixTransform(matrix.inverse());
  return {x:Math.round(world.x*10)/10,y:Math.round(world.y*10)/10};
 };
 const finish=(event,cancel=false)=>{
  const state=pointer.current;
  if(!state||state.pointerId!==event.pointerId)return;
  pointer.current=null;setDrawing(false);if(state.pointerType==='pen')stylusActive.current=false;
  if(preview.current)preview.current.setAttribute('d','');
  if(state.tool==='move-object'){
   state.el?.removeAttribute('transform');
   if(!cancel&&state.points.length>1){
    const first=state.points[0],last=state.points.at(-1);
    const dx=last.x-first.x,dy=last.y-first.y;
    if(Math.hypot(dx,dy)>2)onMoveObject?.(state.id,dx,dy);
   }
   return;
  }
  if(cancel||studentView)return;
  if(state.tool==='pen'||state.tool==='highlighter'){
   const points=state.points.slice(0,4000);
   if(points.length>=1)onCommit?.({kind:'stroke',id:makeId(),points,
    color:state.color,width:state.width,opacity:state.opacity??1,studentVisible:true,
    smoothed:true,pressureSensitive:state.pressureSensitive===true});
  }else if(state.tool==='frame'){
   const last=state.points.at(-1),first=state.points[0];
   const frame=frameFromCorners(makeId(),first,last,vi?'Khung mới':'New frame');
   if(frame)onCreateFrame?.(frame);
  }else if(state.tool.startsWith('shape-')){
   const last=state.points.at(-1),first=state.points[0],shape=state.tool.slice(6);
   const bounds=constrainBoardShape(first,last,shape,{shift:state.shift,snap:state.snapToGrid});
   if(Math.hypot(bounds.x2-bounds.x,bounds.y2-bounds.y)>5)
    onCommit?.({kind:'shape',id:makeId(),shape,...bounds,color:state.color,
     width:state.width,fill:state.shapeFill,studentVisible:true});
  }
 };
 const selectObject=(id,event)=>{
  if(studentView||tool!=='select'||page?.locked)return;
  event.preventDefault();event.stopPropagation();setSelectedId(id);
  const p=local(event);
  pointer.current={tool:'move-object',id,pointerId:event.pointerId,
   points:[p],el:event.target.closest('[data-board-object]')};
  svg.current.setPointerCapture?.(event.pointerId);
 };
 const begin=event=>{
  if(studentView||!page||page.locked||event.button!==0)return;
  if(event.pointerType==='touch'&&(event.isPrimary===false||stylusActive.current))return;
  const p=local(event),origin=snapBoardPoint(p,snapToGrid);
  if(tool==='select'){setSelectedId('');return;}
  if(tool==='text'||tool==='sticky'||tool==='flashcard'||tool==='mask'){
   if(!contentText.trim()&&tool!=='mask')return;
   onCommit?.({id:makeId(),kind:tool,x:origin.x,y:origin.y,text:contentText.trim().slice(0,90),
    width:tool==='mask'?300:undefined,height:tool==='mask'?95:undefined,
    color,studentVisible:true,privateAnswer:tool==='flashcard'?privateAnswer.slice(0,120):undefined});
   return;
  }
  if(tool==='laser'){setLaser(p);onPointerPosition?.(p,spotlight?'spotlight':'laser');return;}
  if(!['pen','highlighter','shape-rect','shape-ellipse','shape-line','shape-arrow','shape-triangle','pan','frame'].includes(tool))return;
  event.preventDefault();
  const appliedPreset=tool==='highlighter'?{width:Math.max(width,14),opacity:.3,pressure:false}:
   penPreset==='fine'?{width,opacity:1,pressure:false}:
   penPreset==='fountain'?{width,opacity:1,pressure:true}:
   penPreset==='marker'?{width,opacity:.46,pressure:false}:
   {width,opacity:1,pressure:false};
  if(event.pointerType==='pen')stylusActive.current=true;
  pointer.current={pointerId:event.pointerId,pointerType:event.pointerType,tool,
   points:[{...(tool.startsWith('shape-')?origin:p),pressure:event.pressure||.5}],
   lastClient:{x:event.clientX,y:event.clientY},startCamera:{...camera},
   color,width:appliedPreset.width,opacity:appliedPreset.opacity,
   pressureSensitive:appliedPreset.pressure,shift:event.shiftKey,snapToGrid,shapeFill};
  event.currentTarget.setPointerCapture?.(event.pointerId);
  setDrawing(true);
 };
 const move=event=>{
  if(tool==='laser'||spotlight){
   const pos=local(event);setLaser(pos);
   onPointerPosition?.(pos,spotlight?'spotlight':'laser');
   if(tool==='laser')return;
  }
  const state=pointer.current;
  if(!state||state.pointerId!==event.pointerId)return;
  const p=local(event);
  if(state.tool==='move-object'){
   const first=state.points[0];state.points=[first,p];
   state.el?.setAttribute('transform','translate('+(p.x-first.x)+' '+(p.y-first.y)+')');
   return;
  }
  if(state.tool==='pan'){
   const rect=svg.current.getBoundingClientRect();
   setCamera?.({x:state.startCamera.x-(event.clientX-state.lastClient.x)*viewWidth/rect.width,
     y:state.startCamera.y-(event.clientY-state.lastClient.y)*viewHeight/rect.height});
   return;
  }
  const events=event.getCoalescedEvents?.()||[event];
  if(state.tool==='pen'||state.tool==='highlighter'){
   for(const e of events){if(state.points.length>=4000)break;const q=local(e);state.points.push({...q,pressure:e.pressure||.5});}
  }else state.points=[state.points[0],p];
  state.shift=event.shiftKey;
  if(preview.current){
   const path=state.tool==='frame'?boardShapePreviewPath('rect',state.points[0].x,
    state.points[0].y,p.x,p.y):state.tool.startsWith('shape-')?(()=>{
    const f=state.points[0],b=constrainBoardShape(f,p,state.tool.slice(6),
     {shift:state.shift,snap:state.snapToGrid});
    return boardShapePreviewPath(state.tool.slice(6),b.x,b.y,b.x2,b.y2);
   })():smoothBoardPath(state.points);
   preview.current.setAttribute('d',path);
   preview.current.setAttribute('stroke-width',String(state.width));
   preview.current.setAttribute('opacity',String(state.opacity));
  }
 };
 const wheel=event=>{
  if(studentView||!setZoom)return;
  if(event.ctrlKey||event.metaKey){
   event.preventDefault();
   setZoom(clamp(zoom*(event.deltaY<0?1.12:.89),.35,3));
  }
 };
 return <div className={'bbd-canvas bbd-canvas--'+(page?.background||'plain')+' bbd-canvas--tool-'+tool}
  data-tool={tool} aria-label="Teaching board drawing surface">
  <svg ref={svg} className="bbd-canvas__svg" viewBox={camera.x+' '+camera.y+' '+viewWidth+' '+viewHeight}
   preserveAspectRatio="xMidYMid meet"
   onPointerDown={begin} onPointerMove={move} onPointerUp={event=>finish(event)}
   onPointerCancel={event=>finish(event,true)} onWheel={wheel}
   onPointerLeave={()=>{if(tool==='laser'||spotlight){setLaser(null);onPointerPosition?.(null);}}}
   role="img" aria-label="Interactive vector teaching board">
   {!studentView&&showFrames&&frames.map((f,i)=><g key={f.id} className="bbd-frame-outline"
     pointerEvents="none" opacity={activeFrameId===f.id?1:.8}>
     <rect x={f.x} y={f.y} width={f.width} height={f.height}
      rx="17" fill="none" stroke={activeFrameId===f.id?'#4cc99a':'#4f8d79'}
      strokeWidth={activeFrameId===f.id?5:3} strokeDasharray="18 12"/>
     <rect x={f.x} y={f.y-47} rx="9" width={Math.min(530,Math.max(170,f.title.length*15))} height="42"
      fill="#214c40"/>
     <text x={f.x+14} y={f.y-17} fill="#fff" fontSize="24">{i+1}. {f.title.slice(0,27)}</text>
    </g>)}
   {page?.objects?.map(o=>renderBoardObject(o,
    (tool==='eraser'||tool==='eraser-ink'&&o.kind==='stroke')?onErase:null,
    studentView,tool==='select'||tool==='eraser-ink'?null:onInteract,tool==='select'?selectObject:null))}
   {!studentView&&<path ref={preview} d="" stroke={color} strokeWidth={width}
     fill="none" opacity={tool==='highlighter'?.33:1} strokeLinecap="round"
     strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
   {spotlight&&laser&&<><defs><mask id="bbd-spotlight-cutout">
     <rect x={camera.x-100} y={camera.y-100} width={viewWidth+200} height={viewHeight+200} fill="#fff"/>
     <circle cx={laser.x} cy={laser.y} r="150" fill="#000"/>
    </mask></defs>
    <rect x={camera.x-100} y={camera.y-100} width={viewWidth+200} height={viewHeight+200}
     fill="#020a14" fillOpacity=".79" mask="url(#bbd-spotlight-cutout)" pointerEvents="none"/>
    <circle cx={laser.x} cy={laser.y} r="150" fill="none"
     stroke="#ffe6a6" strokeWidth="3" pointerEvents="none"/></>}
   {tool==='laser'&&laser&&<circle cx={laser.x} cy={laser.y} r="13"
    fill="#fa445c" stroke="#fff" strokeWidth="3" pointerEvents="none"/>}
  </svg>
  {tool==='select'&&!studentView&&!page?.locked&&selectedId&&page?.objects?.some(o=>o.id===selectedId)&&
   <div className="bbd-canvas__selection-actions" role="group" aria-label="Selected board object">
    <button type="button" onClick={()=>{onDuplicateObject?.(selectedId);setSelectedId('');}}>
     {vi?'⧉ Nhân bản':'⧉ Duplicate'}</button>
    <button type="button" onClick={()=>{onErase?.(selectedId);setSelectedId('');}}>
     {vi?'× Xóa':'× Delete'}</button>
   </div>}
  {drawing&&<span className="bbd-canvas__draw-indicator">●</span>}
 </div>;
}
