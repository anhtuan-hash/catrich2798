import React,{useCallback,useEffect,useRef,useState} from 'react';
import {BOARD_W,BOARD_H,pathFromPoints,makeId} from './boardModel.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

export function renderBoardObject(object,onErase,studentView=false,onInteract){
 const o=object;if(studentView&&(o.studentVisible===false||o.teacherOnly))return null;
 const erase=event=>{if(!onErase)return;event.stopPropagation();onErase(o.id);};
 if(o.kind==='stroke')return <path key={o.id} d={pathFromPoints(o.points)}
  fill="none" stroke={o.color||'#304d53'} strokeWidth={o.width||4}
  strokeLinecap="round" strokeLinejoin="round" opacity={o.opacity??1}
  vectorEffect="non-scaling-stroke" onPointerDown={erase} style={{pointerEvents:onErase?'stroke':'none'}}/>;
 if(o.kind==='shape'){
  const common={key:o.id,fill:o.fill||'none',stroke:o.color||'#315966',
    strokeWidth:o.width||4,onPointerDown:erase,style:{pointerEvents:onErase?'all':'none'}};
  return o.shape==='ellipse'?<ellipse {...common} cx={(o.x+o.x2)/2} cy={(o.y+o.y2)/2}
    rx={Math.abs(o.x2-o.x)/2} ry={Math.abs(o.y2-o.y)/2}/>:
   o.shape==='line'?<line {...common} x1={o.x} y1={o.y} x2={o.x2} y2={o.y2}/>:
   <rect {...common} x={Math.min(o.x,o.x2)} y={Math.min(o.y,o.y2)}
    width={Math.abs(o.x2-o.x)} height={Math.abs(o.y2-o.y)} rx={5}/>;
 }
 if(o.kind==='text'||o.kind==='sticky'){
  if(o.kind==='sticky')return <g key={o.id} onPointerDown={erase}
    style={{pointerEvents:onErase?'all':'none'}}>
    <rect x={o.x} y={o.y-36} width={Math.min(520,Math.max(230,(o.text||'').length*13))}
      height={82} rx={14} fill={o.fill||'#fff0c8'} stroke="#b8ab86" strokeWidth="1.5"/>
    <text x={o.x+13} y={o.y+4} fill="#374b4a" fontSize="26">{String(o.text||'').slice(0,32)}</text>
   </g>;
  return <text key={o.id} x={o.x} y={o.y} onPointerDown={erase}
   style={{pointerEvents:onErase?'all':'none'}} fill={o.color||'#304d53'}
   fontSize={o.fontSize||40} fontWeight="550">{String(o.text||'').slice(0,90)}</text>;
 }
 if(o.kind==='flashcard')return <g key={o.id} onPointerDown={erase} onClick={event=>{if(!onErase&&!studentView){event.stopPropagation();onInteract?.(o.id);}}} style={{cursor:'pointer'}}>
  <rect x={o.x} y={o.y} width="330" height="165" rx="18" fill="#ecf3e9" stroke="#94b2a2" strokeWidth="2"/>
  <text x={o.x+20} y={o.y+65} fill="#325449" fontSize="29">{String(o.text||'').slice(0,21)}</text>
  <text x={o.x+20} y={o.y+119} fill="#6c8d81" fontSize="18">{o.revealed?String(o.privateAnswer||'').slice(0,29):'Tap to reveal'}</text>
 </g>;
 if(o.kind==='image'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(o.src||''))return <image key={o.id} href={o.src} x={o.x} y={o.y} width={o.width||500} height={o.height||300} preserveAspectRatio="xMidYMid meet" onPointerDown={erase}/>;
 if(o.kind==='mask')return <rect key={o.id} x={o.x} y={o.y} rx={9}
  width={o.width||240} height={o.height||90} fill="#243b4b" opacity=".95" onPointerDown={erase}/>;
 return null;
}
export default function BoardCanvas({page,tool='pen',color='#355e63',width=5,onCommit,onErase,
 zoom=1,setZoom,camera={x:0,y:0},setCamera,contentText='',privateAnswer='',onInteract,studentView=false,spotlight=false}){
 const svg=useRef(null),preview=useRef(null),pointer=useRef(null);
 const [drawing,setDrawing]=useState(false);
 const [laser,setLaser]=useState(null);
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
  pointer.current=null;setDrawing(false);
  if(preview.current)preview.current.setAttribute('d','');
  if(cancel||studentView)return;
  if(state.tool==='pen'||state.tool==='highlighter'){
    if(state.points.length>=1)onCommit?.({kind:'stroke',id:makeId(),points:state.points,
     color:state.color,width:state.width,opacity:state.tool==='highlighter'?.33:1,studentVisible:true});
  }else if(state.tool.startsWith('shape-')){
    const last=state.points.at(-1),first=state.points[0];
    if(Math.hypot(last.x-first.x,last.y-first.y)>5)onCommit?.({kind:'shape',id:makeId(),shape:state.tool.slice(6),
      x:first.x,y:first.y,x2:last.x,y2:last.y,color:state.color,width:state.width,studentVisible:true});
  }
 };
 const begin=event=>{
  if(studentView||!page||page.locked||event.button!==0)return;
  if(event.pointerType==='touch'&&event.isPrimary===false)return;
  const p=local(event);
  if(tool==='text'||tool==='sticky'||tool==='flashcard'||tool==='mask'){
   if(!contentText.trim()&&tool!=='mask')return;
   onCommit?.({id:makeId(),kind:tool,x:p.x,y:p.y,text:contentText.trim().slice(0,90),
    width:tool==='mask'?300:undefined,height:tool==='mask'?95:undefined,
    color,studentVisible:true,privateAnswer:tool==='flashcard'?privateAnswer.slice(0,120):undefined});
   return;
  }
  if(tool==='laser'){setLaser(p);return;}
  if(!['pen','highlighter','shape-rect','shape-ellipse','shape-line','pan'].includes(tool))return;
  event.preventDefault();
  pointer.current={pointerId:event.pointerId,tool,points:[p],lastClient:{x:event.clientX,y:event.clientY},
    startCamera:{...camera},color,width};
  event.currentTarget.setPointerCapture?.(event.pointerId);
  setDrawing(true);
 };
 const move=event=>{
  if(tool==='laser'){setLaser(local(event));return;}
  const state=pointer.current;
  if(!state||state.pointerId!==event.pointerId)return;
  const p=local(event);
  if(state.tool==='pan'){
   const rect=svg.current.getBoundingClientRect();
   setCamera?.({x:state.startCamera.x-(event.clientX-state.lastClient.x)*viewWidth/rect.width,
     y:state.startCamera.y-(event.clientY-state.lastClient.y)*viewHeight/rect.height});
   return;
  }
  const events=event.getCoalescedEvents?.()||[event];
  if(state.tool==='pen'||state.tool==='highlighter'){
   for(const e of events){const q=local(e);state.points.push({...q,pressure:e.pressure||.5});}
  }else state.points=[state.points[0],p];
  if(preview.current){
    const path=state.tool.startsWith('shape-')?
      'M '+state.points[0].x+' '+state.points[0].y+' L '+p.x+' '+p.y:pathFromPoints(state.points);
    preview.current.setAttribute('d',path);
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
   onPointerLeave={()=>{if(tool==='laser')setLaser(null);}}
   role="img" aria-label="Interactive vector teaching board">
   {page?.objects?.map(o=>renderBoardObject(o,tool==='eraser'?onErase:null,studentView,onInteract))}
   {!studentView&&<path ref={preview} d="" stroke={color} strokeWidth={width}
     fill="none" opacity={tool==='highlighter'?.33:1} strokeLinecap="round"
     strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
   {spotlight&&laser&&<><rect x={camera.x} y={camera.y} width={viewWidth} height={viewHeight}
    fill="#020a14" fillOpacity=".55" pointerEvents="none"/>
    <circle cx={laser.x} cy={laser.y} r="150" fill="#fff" fillOpacity=".1"
     stroke="#ffdd88" strokeWidth="3" pointerEvents="none"/></>}
   {tool==='laser'&&laser&&<circle cx={laser.x} cy={laser.y} r="13"
    fill="#fa445c" stroke="#fff" strokeWidth="3" pointerEvents="none"/>}
  </svg>
  {drawing&&<span className="bbd-canvas__draw-indicator">●</span>}
 </div>;
}
