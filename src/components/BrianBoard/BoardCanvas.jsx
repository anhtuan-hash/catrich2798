import React,{useCallback,useEffect,useRef,useState} from 'react';
import {BOARD_W,BOARD_H,pathFromPoints,makeId} from './boardModel.js';
import {snapBoardPoint,constrainBoardShape,smoothBoardPath,pressureBoardSegments,
 boardShapeGeometry,boardShapePreviewPath} from './boardDrawing.js';
import {frameFromCorners,spatialObjectBounds} from './boardSpatial.js';
import {lassoObjectIds,recognizeBoardGesture,groupBounds,BOARD_RESIZE_HANDLES} from './boardV8Tools.js';
import {measureRuler,measureAngle,drawCompassCircle} from './boardMeasure.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

function renderBoardObjectRaw(object,onErase,studentView=false,onInteract,onSelect){
 const o=object;if(o.hidden===true||studentView&&(o.studentVisible===false||o.teacherOnly))return null;
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
 if(o.kind==='activity-pin'){
  if(studentView)return null;
  return <g key={o.id} data-board-object={o.id} role="button" tabIndex={0}
   onPointerDown={event=>{if(onErase||onSelect)press(event);else event.stopPropagation();}}
   onClick={event=>{if(!onErase&&!onSelect){event.stopPropagation();onInteract?.(o.id);}}}
   onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&!onErase&&!onSelect)onInteract?.(o.id);}}
   style={{cursor:'pointer'}}>
   <rect x={o.x} y={o.y} width="310" height="100" rx="18" fill="#e2efe5" stroke="#3b8c6a" strokeWidth="3"/>
   <circle cx={o.x+48} cy={o.y+50} r="28" fill="#3d876d"/>
   <text x={o.x+36} y={o.y+61} fill="white" fontSize="35">▶</text>
   <text x={o.x+95} y={o.y+44} fill="#254639" fontSize="21" fontWeight="700">ACTIVITY</text>
   <text x={o.x+95} y={o.y+75} fill="#4e7863" fontSize="18">{String(o.text||'').slice(0,18)}</text>
  </g>;
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
export function renderBoardObject(object,onErase,studentView=false,onInteract,onSelect){
 const rendered=renderBoardObjectRaw(object,onErase,studentView,onInteract,onSelect);
 if(!rendered)return null;
 const deg=Number(object?.rotation)||0;
 if(!deg)return rendered;
 const b=spatialObjectBounds(object);
 if(!b)return rendered;
 const cx=b.x+b.width/2,cy=b.y+b.height/2;
 return <g key={object.id} transform={'rotate('+deg+' '+cx+' '+cy+')'}>{rendered}</g>;
}
export default function BoardCanvas({page,tool='pen',color='#355e63',width=5,onCommit,onErase,onDuplicateObject,onMoveObject,onBatchEdit,onPrecisionErase,onSaveAsset,onCommitMany,
 zoom=1,setZoom,camera={x:0,y:0},setCamera,contentText='',privateAnswer='',onInteract,
 studentView=false,spotlight=false,penPreset='classic',snapToGrid=false,shapeFill='none',vi=true,
 frames=[],showFrames=true,onCreateFrame,activeFrameId=null,onPointerPosition,smartGeometry=false}){
 const svg=useRef(null),preview=useRef(null),pointer=useRef(null),resizeOutline=useRef(null);
 const [drawing,setDrawing]=useState(false),[selectedId,setSelectedId]=useState(''),[selectedIds,setSelectedIds]=useState([]);
 const [laser,setLaser]=useState(null);
 const [inlineText,setInlineText]=useState(null);
 const [measureBase,setMeasureBase]=useState(null);
 const inlineCommitted=useRef(false);
 const saveInlineText=()=>{
  if(!inlineText||inlineCommitted.current)return;
  inlineCommitted.current=true;
  const value=inlineText.text.replace(/\s+/g,' ').trim().slice(0,90);
  if(value&&!studentView&&!page?.locked)onCommit?.({
   id:makeId(),kind:'text',x:inlineText.x,y:inlineText.y,text:value,
   fontSize:40,color,studentVisible:true
  });
  setInlineText(null);
 };
 const editTextAnywhere=event=>{
  if(studentView||page?.locked||tool!=='select'||event.target.closest('[data-board-object]'))return;
  event.preventDefault();
  const pos=local(event),rect=event.currentTarget.getBoundingClientRect();
  inlineCommitted.current=false;
  setInlineText({x:pos.x,y:pos.y,
   left:Math.max(7,Math.min(event.clientX-rect.left,rect.width-275)),
   top:Math.max(5,Math.min(event.clientY-rect.top,rect.height-54)),
   text:''});
 };
 const stylusActive=useRef(false);
 useEffect(()=>{setSelectedId('');setSelectedIds([]);pointer.current=null;stylusActive.current=false;},[page?.id]);
 useEffect(()=>{setMeasureBase(null);},[tool,page?.id]);
 const viewWidth=BOARD_W/zoom,viewHeight=BOARD_H/zoom;
 const selection=groupBounds(page?.objects||[],selectedIds);
 const transformHandles=selection?BOARD_RESIZE_HANDLES.map(handle=>{
  const h=handle.includes('w')?selection.x:handle.includes('e')?selection.x+selection.width:selection.x+selection.width/2;
  const v=handle.includes('n')?selection.y:handle.includes('s')?selection.y+selection.height:selection.y+selection.height/2;
  return {handle,x:h,y:v};
 }):[];
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
  if(state.tool==='resize-group'){
   if(resizeOutline.current)resizeOutline.current.style.opacity='0';
   if(!cancel){
    const origin=state.points[0],last=state.points.at(-1);
    const dx=last.x-origin.x,dy=last.y-origin.y;
    if(Math.hypot(dx,dy)>1)onBatchEdit?.(state.selectedIds,'resize',{handle:state.handle,delta:{x:dx,y:dy}});
   }
   return;
  }
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
  if(state.tool==='lasso'){
   const ids=lassoObjectIds(page?.objects||[],state.points);
   setSelectedIds(ids);setSelectedId(ids[0]||'');
   return;
  }
  if(state.tool==='eraser-precision'){
   if(state.points.length)onPrecisionErase?.(state.points);
   return;
  }
  if(state.tool==='pen'||state.tool==='highlighter'){
   const points=state.points.slice(0,4000);
   if(state.tool==='pen'&&smartGeometry&&performance.now()-(state.lastMoveAt||0)>650){
    const shape=recognizeBoardGesture(points);
    if(shape){
     onCommit?.({id:makeId(),kind:'shape',...shape,color:state.color,
      width:state.width,fill:'none',studentVisible:true});
     return;
    }
   }
   if(points.length>=1)onCommit?.({kind:'stroke',id:makeId(),points,
    color:state.color,width:state.width,opacity:state.opacity??1,studentVisible:true,
    smoothed:true,pressureSensitive:state.pressureSensitive===true});
  }else if(state.tool==='ruler'){
   const objects=measureRuler(state.points[0],state.points.at(-1));
   if(objects.length)onCommitMany?.(objects);
  }else if(state.tool==='compass'){
   const circle=drawCompassCircle(state.points[0],state.points.at(-1));
   if(circle)onCommit?.(circle);
  }else if(state.tool==='protractor'){
   const first=state.points[0],last=state.points.at(-1);
   if(Math.hypot(last.x-first.x,last.y-first.y)<20)return;
   if(!measureBase)setMeasureBase({vertex:first,baseline:last});
   else{
    const shapes=measureAngle(measureBase.vertex,measureBase.baseline,last);
    if(shapes.length)onCommitMany?.(shapes);
    setMeasureBase(null);
   }
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
 const beginResize=(handle,event)=>{
  if(studentView||page?.locked||!selectedIds.length)return;
  event.preventDefault();event.stopPropagation();
  const p=local(event);
  pointer.current={tool:'resize-group',handle,pointerId:event.pointerId,
   points:[p],selectedIds:[...selectedIds],bounds:selection};
  svg.current?.setPointerCapture?.(event.pointerId);
  setDrawing(true);
 };
 const selectObject=(id,event)=>{
  if(studentView||tool!=='select'||page?.locked)return;
  event.preventDefault();event.stopPropagation();setSelectedId(id);setSelectedIds([id]);
  const p=local(event);
  pointer.current={tool:'move-object',id,pointerId:event.pointerId,
   points:[p],el:event.target.closest('[data-board-object]')};
  svg.current.setPointerCapture?.(event.pointerId);
 };
 const begin=event=>{
  if(studentView||!page||page.locked||event.button!==0)return;
  if(event.pointerType==='touch'&&(event.isPrimary===false||stylusActive.current))return;
  const p=local(event),origin=snapBoardPoint(p,snapToGrid);
  if(tool==='select'){setSelectedId('');setSelectedIds([]);return;}
  if(tool==='text'||tool==='sticky'||tool==='flashcard'||tool==='mask'){
   if(tool==='text'&&!contentText.trim()){
    const rect=svg.current.getBoundingClientRect();
    inlineCommitted.current=false;
    setInlineText({x:origin.x,y:origin.y,
     left:Math.max(7,Math.min(event.clientX-rect.left,rect.width-275)),
     top:Math.max(5,Math.min(event.clientY-rect.top,rect.height-54)),text:''});
    return;
   }
   if(!contentText.trim()&&tool!=='mask')return;
   onCommit?.({id:makeId(),kind:tool,x:origin.x,y:origin.y,text:contentText.trim().slice(0,90),
    width:tool==='mask'?300:undefined,height:tool==='mask'?95:undefined,
    color,studentVisible:true,privateAnswer:tool==='flashcard'?privateAnswer.slice(0,120):undefined});
   return;
  }
  if(tool==='laser'){setLaser(p);onPointerPosition?.(p,spotlight?'spotlight':'laser');return;}
  if(!['pen','highlighter','shape-rect','shape-ellipse','shape-line','shape-arrow','shape-triangle','pan','frame','lasso','eraser-precision','ruler','protractor','compass'].includes(tool))return;
  event.preventDefault();
  const appliedPreset=tool==='highlighter'?{width:Math.max(width,14),opacity:.3,pressure:false}:
   penPreset==='fine'?{width,opacity:1,pressure:false}:
   penPreset==='fountain'?{width,opacity:1,pressure:true}:
   penPreset==='marker'?{width,opacity:.46,pressure:false}:
   {width,opacity:1,pressure:false};
  if(event.pointerType==='pen')stylusActive.current=true;
  pointer.current={pointerId:event.pointerId,pointerType:event.pointerType,tool,
   points:[{...(tool.startsWith('shape-')?origin:(tool==='protractor'&&measureBase?measureBase.vertex:p)),pressure:event.pressure||.5}],
   lastClient:{x:event.clientX,y:event.clientY},startCamera:{...camera},
   color,width:appliedPreset.width,opacity:appliedPreset.opacity,
   pressureSensitive:appliedPreset.pressure,shift:event.shiftKey,snapToGrid,shapeFill,
   lastMoveAt:performance.now()};
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
  if(state.tool==='resize-group'){
   state.points=[state.points[0],p];
   const b=state.bounds;
   if(b&&resizeOutline.current){
    const dx=p.x-state.points[0].x,dy=p.y-state.points[0].y;
    const x=b.x+(state.handle.includes('w')?dx:0),
     y=b.y+(state.handle.includes('n')?dy:0);
    const w=Math.max(36,b.width+(state.handle.includes('e')?dx:state.handle.includes('w')?-dx:0));
    const h=Math.max(36,b.height+(state.handle.includes('s')?dy:state.handle.includes('n')?-dy:0));
    resizeOutline.current.setAttribute('x',String(x));
    resizeOutline.current.setAttribute('y',String(y));
    resizeOutline.current.setAttribute('width',String(w));
    resizeOutline.current.setAttribute('height',String(h));
    resizeOutline.current.style.opacity='1';
   }
   return;
  }
  if(state.tool==='pen')state.lastMoveAt=performance.now();
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
  if(['pen','highlighter','lasso','eraser-precision'].includes(state.tool)){
   for(const e of events){
    if(state.points.length>=4000)break;
    const q=local(e);
    const prev=state.points.at(-1);
    if(prev&&Math.hypot(prev.x-q.x,prev.y-q.y)<(state.tool==='eraser-precision'?7:2))continue;
    state.points.push({...q,pressure:e.pressure||.5});
   }
  }else state.points=[state.points[0],p];
  state.shift=event.shiftKey;
  if(preview.current){
   const path=['ruler','protractor'].includes(state.tool)?
    boardShapePreviewPath('line',state.points[0].x,state.points[0].y,p.x,p.y):
    state.tool==='compass'?(()=>{
     const c=state.points[0],r=Math.hypot(p.x-c.x,p.y-c.y);
     return boardShapePreviewPath('ellipse',c.x-r,c.y-r,c.x+r,c.y+r);
    })():
    state.tool==='lasso'?smoothBoardPath([...state.points,state.points[0]]):
    state.tool==='eraser-precision'?smoothBoardPath(state.points):
    state.tool==='frame'?boardShapePreviewPath('rect',state.points[0].x,
    state.points[0].y,p.x,p.y):state.tool.startsWith('shape-')?(()=>{
    const f=state.points[0],b=constrainBoardShape(f,p,state.tool.slice(6),
     {shift:state.shift,snap:state.snapToGrid});
    return boardShapePreviewPath(state.tool.slice(6),b.x,b.y,b.x2,b.y2);
   })():smoothBoardPath(state.points);
   preview.current.setAttribute('d',path);
   preview.current.setAttribute('stroke-width',String(state.tool==='lasso'?3:state.tool==='eraser-precision'?30:state.width));
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
   onDoubleClick={editTextAnywhere}
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
    !o.locked&&(tool==='eraser'||tool==='eraser-ink'&&o.kind==='stroke')?onErase:null,
    studentView,tool==='select'||tool==='eraser-ink'?null:onInteract,
    tool==='select'&&!o.locked?selectObject:null))}
   {measureBase&&tool==='protractor'&&!studentView&&<g pointerEvents="none">
     <line x1={measureBase.vertex.x} y1={measureBase.vertex.y}
      x2={measureBase.baseline.x} y2={measureBase.baseline.y}
      stroke="#6ca7e5" strokeWidth={4/zoom} strokeDasharray={11/zoom+' '+7/zoom}/>
     <circle cx={measureBase.vertex.x} cy={measureBase.vertex.y} r={10/zoom} fill="#538bc2"/>
     <text x={measureBase.vertex.x+20/zoom} y={measureBase.vertex.y-24/zoom}
      fill="#538bc2" fontSize={23/zoom}>{vi?'Kéo tia thứ hai':'Draw second ray'}</text>
    </g>}
   {selection&&['select','lasso'].includes(tool)&&!studentView&&!page?.locked&&<g className="bbd-v8-resize-overlay">
     <rect x={selection.x} y={selection.y} width={selection.width} height={selection.height}
      fill="none" stroke="#308e6e" strokeWidth={2.5/zoom} strokeDasharray={12/zoom+" "+7/zoom}
      pointerEvents="none"/>
     <rect ref={resizeOutline} x={selection.x} y={selection.y} width={selection.width}
      height={selection.height} stroke="#e4a34a" strokeWidth={3/zoom} strokeDasharray={8/zoom+" "+4/zoom}
      fill="none" opacity="0" pointerEvents="none"/>
     {transformHandles.map(({handle,x,y})=><circle key={handle} cx={x} cy={y} r={12/zoom}
      fill="#fffefa" stroke="#27755e" strokeWidth={3/zoom} role="button" tabIndex={0}
      aria-label={(vi?'Thay đổi kích thước, tay nắm ':'Resize group, handle ')+handle}
      onPointerDown={event=>beginResize(handle,event)}
      onKeyDown={event=>{
       if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
       event.preventDefault();
       onBatchEdit?.(selectedIds,'resize',{handle,delta:{
        x:event.key==='ArrowLeft'?-18:event.key==='ArrowRight'?18:0,
        y:event.key==='ArrowUp'?-18:event.key==='ArrowDown'?18:0}});
      }} style={{cursor:handle.includes('n')||handle.includes('s')?'nwse-resize':'ew-resize'}}/>)}
    </g>}
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
  {inlineText&&<input autoFocus type="text" className="bbd-canvas__inline-editor"
    aria-label={vi?'Nhập chữ trực tiếp trên bảng':'Type anywhere on the board'}
    maxLength={90} value={inlineText.text}
    style={{left:inlineText.left,top:inlineText.top}}
    onPointerDown={e=>e.stopPropagation()}
    onChange={e=>setInlineText(v=>({...v,text:e.target.value}))}
    onKeyDown={e=>{
     e.stopPropagation();
     if(e.key==='Enter'){e.preventDefault();saveInlineText();}
     if(e.key==='Escape'){e.preventDefault();inlineCommitted.current=true;setInlineText(null);}
    }}
    onBlur={saveInlineText}
    placeholder={vi?'Viết gì đó rồi Enter':'Type and press Enter'}/>}
  {['select','lasso'].includes(tool)&&!studentView&&!page?.locked&&selectedIds.length>0&&
   <div className="bbd-canvas__selection-actions bbd-v8-selection" role="group"
    aria-label={vi?'Nhóm đối tượng đã chọn':'Selected objects'}>
    <strong>{selectedIds.length} {vi?'đối tượng':'objects'}</strong>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'front')}>
     {vi?'Lên trên':'Front'}</button>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'back')}>
     {vi?'Xuống dưới':'Back'}</button>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'scale',{factor:1.15})}>+15%</button>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'scale',{factor:.85})}>−15%</button>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'rotate',{degrees:-15})}
     title={vi?'Xoay ngược kim đồng hồ':'Rotate counterclockwise'}>↶ 15°</button>
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'rotate',{degrees:15})}
     title={vi?'Xoay theo kim đồng hồ':'Rotate clockwise'}>↷ 15°</button>
    <select className="bbd-v8-align-select" defaultValue="" aria-label={vi?'Căn chỉnh nhóm đối tượng':'Align selected objects'}
     onChange={e=>{
      if(e.target.value)onBatchEdit?.(selectedIds,'align',{mode:e.target.value});
      e.target.value='';
     }}>
     <option value="">{vi?'Căn chỉnh…':'Align…'}</option>
     <option value="left">{vi?'Căn trái':'Left'}</option>
     <option value="center">{vi?'Căn giữa ngang':'Center horizontally'}</option>
     <option value="right">{vi?'Căn phải':'Right'}</option>
     <option value="top">{vi?'Căn trên':'Top'}</option>
     <option value="middle">{vi?'Căn giữa dọc':'Center vertically'}</option>
     <option value="bottom">{vi?'Căn dưới':'Bottom'}</option>
     <option value="distribute-x">{vi?'Chia đều ngang':'Distribute horizontally'}</option>
     <option value="distribute-y">{vi?'Chia đều dọc':'Distribute vertically'}</option>
    </select>
    <select className="bbd-v8-align-select" defaultValue=""
     aria-label={vi?'Bố trí sơ đồ tự động':'Automatic diagram layout'}
     onChange={e=>{
      if(e.target.value)onBatchEdit?.(selectedIds,'layout',{mode:e.target.value,gap:65});
      e.target.value='';
     }}>
     <option value="">{vi?'Sơ đồ…':'Diagram…'}</option>
     <option value="horizontal">{vi?'Sắp hàng ngang':'Horizontal flow'}</option>
     <option value="vertical">{vi?'Sắp hàng dọc':'Vertical flow'}</option>
     <option value="grid">{vi?'Sắp lưới':'Grid layout'}</option>
    </select>
    {selectedIds.length===2&&<button type="button" onClick={()=>onBatchEdit?.(selectedIds,'connect')}>
     {vi?'Nối sơ đồ →':'Connect nodes →'}</button>}
    <button type="button" onClick={()=>onBatchEdit?.(selectedIds,'duplicate')}>
     {vi?'⧉ Nhân bản':'⧉ Duplicate'}</button>
    <button type="button" onClick={()=>onSaveAsset?.(selectedIds)}>
     {vi?'Lưu học liệu':'Save asset'}</button>
    <button type="button" onClick={()=>{onBatchEdit?.(selectedIds,'delete');setSelectedIds([]);setSelectedId('');}}>
     {vi?'× Xóa':'× Delete'}</button>
   </div>}
  {drawing&&<span className="bbd-canvas__draw-indicator">●</span>}
 </div>;
}
