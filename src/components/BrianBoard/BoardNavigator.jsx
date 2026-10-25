import React,{useMemo,useRef,useState} from 'react';
import {Map,Maximize2,MapPinned,ChevronsUpDown} from 'lucide-react';
import {boardOverviewBounds,spatialObjectBounds} from './boardSpatial.js';
import './BoardNavigator.css';

/**
 * Small teacher-only overview of the infinite Board. The viewport moves the camera,
 * not a lesson object. No user notes, questions, or answer text are rendered here.
 */
export default function BoardNavigator({page,viewport,activeFrameId,vi=true,
 onCenter,onFitAll,onHome,open=true,onToggle}){
 const svg=useRef(null),drag=useRef(null);
 const [dragging,setDragging]=useState(false);
 const frames=page?.frames||[];
 const objectBoxes=useMemo(()=>(page?.objects||[]).slice(0,3000)
  .map(spatialObjectBounds).filter(Boolean),[page?.objects]);
 const extents=useMemo(()=>boardOverviewBounds({
  frames,objects:page?.objects,viewport
 }),[frames,page?.objects,viewport?.x,viewport?.y,viewport?.width,viewport?.height]);
 const toWorld=event=>{
  const root=svg.current;
  if(!root||!root.getScreenCTM)return null;
  const matrix=root.getScreenCTM();
  if(!matrix)return null;
  const point=root.createSVGPoint();
  point.x=event.clientX;point.y=event.clientY;
  const p=point.matrixTransform(matrix.inverse());
  return Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:p.x,y:p.y}:null;
 };
 const pan=event=>{
  const p=toWorld(event);
  if(!p)return;
  onCenter?.(p);
 };
 const pointerDown=event=>{
  if(event.button!==0)return;
  event.preventDefault();
  drag.current=event.pointerId;
  svg.current?.setPointerCapture?.(event.pointerId);
  setDragging(true);pan(event);
 };
 const pointerMove=event=>{
  if(drag.current!==event.pointerId)return;
  event.preventDefault();pan(event);
 };
 const pointerEnd=event=>{
  if(drag.current!==event.pointerId)return;
  drag.current=null;setDragging(false);
  if(svg.current?.hasPointerCapture?.(event.pointerId))svg.current.releasePointerCapture(event.pointerId);
 };
 return <aside className={'bbd-navigator'+(!open?' is-collapsed':'')} aria-label={vi?'Bản đồ bảng vô hạn':'Infinite board overview'}>
  <div className="bbd-navigator__top">
   <div><Map size={16}/><strong>{vi?'Bản đồ bảng':'Board map'}</strong>
    <small>{frames.length} {vi?'khung':'frames'}</small></div>
   <button type="button" onClick={onToggle} aria-expanded={open}
    title={open?(vi?'Thu nhỏ bản đồ':'Collapse overview'):(vi?'Mở bản đồ':'Expand overview')}>
    <ChevronsUpDown size={16}/></button>
  </div>
  {open&&<>
   <svg ref={svg} className={'bbd-navigator__map'+(dragging?' is-dragging':'')}
    viewBox={[extents.x,extents.y,extents.width,extents.height].join(' ')}
    preserveAspectRatio="xMidYMid meet" role="application" tabIndex={0}
    aria-label={vi?'Kéo trên bản đồ để di chuyển góc nhìn. Dùng phím mũi tên để di chuyển.':'Drag to pan the teaching board. Arrow keys move the view.'}
    onPointerDown={pointerDown} onPointerMove={pointerMove}
    onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
    onKeyDown={event=>{
     if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
     event.preventDefault();
     const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,
      dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
     onCenter?.({x:viewport.x+viewport.width/2+dx*viewport.width*.2,
      y:viewport.y+viewport.height/2+dy*viewport.height*.2});
    }}>
    <rect x={extents.x} y={extents.y} width={extents.width} height={extents.height}
     className="bbd-navigator__ground"/>
    <rect x="0" y="0" width="1600" height="900" rx="12" className="bbd-navigator__origin"/>
    {objectBoxes.map((b,i)=><rect key={i} x={b.x} y={b.y}
     width={Math.max(b.width,14)} height={Math.max(b.height,14)}
     className="bbd-navigator__mark"/>)}
    {frames.map((f,i)=><g key={f.id} opacity={f.hidden ? 0.35 : 1}>
     <rect x={f.x} y={f.y} width={f.width} height={f.height} rx="10"
      className={'bbd-navigator__frame'+(activeFrameId===f.id?' is-active':'')}/>
     <text x={f.x+24} y={f.y+80} fontSize="69" className="bbd-navigator__index">{i+1}</text>
    </g>)}
    <rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height}
     rx="8" className="bbd-navigator__viewport"/>
    <circle cx={viewport.x+viewport.width/2} cy={viewport.y+viewport.height/2}
     r={Math.max(14,Math.min(viewport.width,viewport.height)*.026)} className="bbd-navigator__crosshair"/>
   </svg>
   <div className="bbd-navigator__actions">
    <button type="button" onClick={onFitAll} title={vi?'Hiển thị tất cả đối tượng và khung':'Fit all objects and frames'}>
     <Maximize2 size={14}/>{vi?'Toàn bộ':'Fit all'}</button>
    <button type="button" onClick={onHome} title={vi?'Về điểm gốc':'Return to origin'}>
     <MapPinned size={14}/>{vi?'Gốc':'Home'}</button>
   </div>
  </>}
 </aside>;
}
