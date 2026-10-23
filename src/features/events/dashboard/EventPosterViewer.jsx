import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X, Maximize2, Move } from 'lucide-react';
import { POSTER_MIN_ZOOM, POSTER_MAX_ZOOM, clampPosterZoom, zoomPosterAt, panPosterBy, constrainPosterView } from '../utils/posterViewportMath.mjs';

const RESET = { scale:1, x:0, y:0 };
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

/**
 * Full-size school poster viewer.
 * Native non-passive wheel listener allows mouse wheel + trackpad to zoom.
 * Pointer Events support panning with mouse/touch and two-finger pinch.
 * No data changes; this viewer only receives the signed poster URL.
 */
export default function EventPosterViewer({src,title,onClose}) {
  const viewportRef=useRef(null);
  const imageRef=useRef(null);
  const closeRef=useRef(null);
  const pointersRef=useRef(new Map());
  const gestureRef=useRef(null);
  const viewRef=useRef(RESET);
  const [view,setView]=useState(RESET);
  const [isDragging,setIsDragging]=useState(false);

  const dimensions=useCallback(()=>({
    viewportWidth:viewportRef.current?.clientWidth||0,
    viewportHeight:viewportRef.current?.clientHeight||0,
    imageWidth:imageRef.current?.offsetWidth||0,
    imageHeight:imageRef.current?.offsetHeight||0,
  }),[]);
  const applyView=useCallback(updater=>{
    setView(current=>{
      const next=typeof updater==='function'?updater(current):updater;
      viewRef.current=next;
      return next;
    });
  },[]);
  const zoomTo=useCallback((requested,point={x:0,y:0})=>{
    applyView(current=>zoomPosterAt(current,requested,point,dimensions()));
  },[applyView,dimensions]);
  const reset=useCallback(()=>applyView(RESET),[applyView]);

  useEffect(()=>{
    // Focus the lightbox close control while preserving parent modal state.
    closeRef.current?.focus({preventScroll:true});
    const onKeyDown=event=>{
      if(event.target instanceof HTMLElement &&
        event.target.matches('input, textarea, select, [contenteditable="true"]'))return;
      if(['+','=','Add'].includes(event.key)){event.preventDefault();zoomTo(viewRef.current.scale*1.25);}
      else if(['-','_','Subtract'].includes(event.key)){event.preventDefault();zoomTo(viewRef.current.scale/1.25);}
      else if(['0','f','F'].includes(event.key)){event.preventDefault();reset();}
      // Escape is handled by the parent modal, which preserves its state.
    };
    document.addEventListener('keydown',onKeyDown);
    return ()=>document.removeEventListener('keydown',onKeyDown);
  },[zoomTo,reset]);

  useEffect(()=>{
    const element=viewportRef.current;
    if(!element)return undefined;
    const onWheel=event=>{
      if(!src)return;
      event.preventDefault();
      const rect=element.getBoundingClientRect();
      const point={
        x:event.clientX-rect.left-rect.width/2,
        y:event.clientY-rect.top-rect.height/2
      };
      // Trackpad continuous zoom and mouse-wheel discrete zoom.
      const factor=Math.exp(-event.deltaY*(event.deltaMode===1?.025:.0019));
      zoomTo(viewRef.current.scale*factor,point);
    };
    element.addEventListener('wheel',onWheel,{passive:false});
    return ()=>element.removeEventListener('wheel',onWheel);
  },[src,zoomTo]);

  useEffect(()=>{
    const onResize=()=>applyView(current=>constrainPosterView(current,dimensions()));
    window.addEventListener('resize',onResize);
    return ()=>window.removeEventListener('resize',onResize);
  },[applyView,dimensions]);

  const pointOf=event=>({x:event.clientX,y:event.clientY});
  const relativeToCenter=point=>{
    const rect=viewportRef.current.getBoundingClientRect();
    return {x:point.x-rect.left-rect.width/2,y:point.y-rect.top-rect.height/2};
  };
  const onPointerDown=event=>{
    if(event.button!==0 && event.pointerType==='mouse')return;
    if(!event.isPrimary && event.pointerType==='mouse')return;
    event.preventDefault();
    viewportRef.current?.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId,pointOf(event));
    if(pointersRef.current.size===2){
      const [a,b]=Array.from(pointersRef.current.values());
      gestureRef.current={kind:'pinch',distance:Math.max(1,distance(a,b)),center:midpoint(a,b)};
      setIsDragging(true);
    } else if(pointersRef.current.size===1){
      gestureRef.current={kind:'pan',last:pointOf(event)};
      setIsDragging(viewRef.current.scale>1);
    }
  };
  const onPointerMove=event=>{
    if(!pointersRef.current.has(event.pointerId))return;
    const point=pointOf(event);
    pointersRef.current.set(event.pointerId,point);
    if(pointersRef.current.size>=2){
      const [a,b]=Array.from(pointersRef.current.values());
      const mid=midpoint(a,b);
      const dist=Math.max(1,distance(a,b));
      const gesture=gestureRef.current;
      if(gesture?.kind==='pinch'){
        const factor=dist/gesture.distance;
        const prevCenter=relativeToCenter(gesture.center);
        const nextCenter=relativeToCenter(mid);
        const dims=dimensions();
        applyView(current=>{
          const panned=panPosterBy(current,nextCenter.x-prevCenter.x,nextCenter.y-prevCenter.y,dims);
          return zoomPosterAt(panned,clampPosterZoom(current.scale*factor),nextCenter,dims);
        });
      }
      gestureRef.current={kind:'pinch',distance:dist,center:mid};
      return;
    }
    const gesture=gestureRef.current;
    if(gesture?.kind!=='pan')return;
    const dx=point.x-gesture.last.x,dy=point.y-gesture.last.y;
    if(viewRef.current.scale>1)applyView(current=>panPosterBy(current,dx,dy,dimensions()));
    gestureRef.current={kind:'pan',last:point};
  };
  const onPointerEnd=event=>{
    pointersRef.current.delete(event.pointerId);
    try{
      if(viewportRef.current?.hasPointerCapture?.(event.pointerId))
        viewportRef.current.releasePointerCapture(event.pointerId);
    }catch{/* Browser released capture automatically. */}
    if(pointersRef.current.size===1)
      gestureRef.current={kind:'pan',last:Array.from(pointersRef.current.values())[0]};
    else if(!pointersRef.current.size){
      gestureRef.current=null;
      setIsDragging(false);
    } else gestureRef.current=null;
  };
  const zoomPercent=Math.round(view.scale*100);
  return <div className="be-pop-lightbox" role="dialog" aria-modal="true"
      aria-label={'Xem poster: '+title}>
    <header className="be-pop-zoom-header">
      <div className="be-pop-zoom-title">
        <strong>Poster sự kiện</strong>
        <span title={title}>{title}</span>
      </div>
      <button ref={closeRef} className="be-pop-zoom-close" type="button"
        aria-label="Đóng trình xem poster" onClick={onClose}><X size={22}/></button>
    </header>
    <div ref={viewportRef}
      className={'be-pop-zoom-viewport'+(view.scale>1?' is-zoomed':'')+(isDragging?' is-dragging':'')}
      aria-label="Khu vực phóng to poster. Dùng cuộn chuột, chụm hai ngón, kéo ảnh hoặc các nút bên dưới."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={event=>{
        const pos=relativeToCenter(pointOf(event));
        zoomTo(viewRef.current.scale>1?1:2,pos);
      }}>
      <img ref={imageRef} src={src} alt={'Poster '+title}
        draggable="false"
        style={{transform:'translate3d('+view.x+'px,'+view.y+'px,0) scale('+view.scale+')'}}
        onLoad={()=>applyView(RESET)}
      />
    </div>
    <footer className="be-pop-zoom-toolbar">
      <span className="be-pop-zoom-help"><Move size={16}/> Cuộn để zoom · Kéo để xem · Chạm hai lần để phóng</span>
      <div className="be-pop-zoom-controls" role="group" aria-label="Điều khiển mức phóng to">
        <button type="button" onClick={()=>zoomTo(view.scale/1.25)}
          disabled={view.scale<=POSTER_MIN_ZOOM}
          aria-label="Thu nhỏ poster" title="Thu nhỏ (−)"><Minus size={20}/></button>
        <output aria-label="Mức phóng to hiện tại" aria-live="off">{zoomPercent}%</output>
        <button type="button" onClick={()=>zoomTo(view.scale*1.25)}
          disabled={view.scale>=POSTER_MAX_ZOOM}
          aria-label="Phóng to poster" title="Phóng to (+)"><Plus size={20}/></button>
        <span className="be-pop-zoom-separator"/>
        <button type="button" onClick={reset}
          aria-label="Vừa màn hình, đặt lại zoom" title="Vừa màn hình (0)"><Maximize2 size={19}/><span>Vừa màn hình</span></button>
        <button type="button" onClick={reset} className="be-pop-zoom-reset"
          aria-label="Đặt lại vị trí và kích thước poster" title="Đặt lại"><RotateCcw size={18}/></button>
      </div>
    </footer>
  </div>;
}
