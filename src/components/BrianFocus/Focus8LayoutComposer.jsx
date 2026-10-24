import React,{useRef,useState} from 'react';
import {getViewportLayout,snapPosition} from './useFocus8Data.js';
const targetNames={clock:['Đồng hồ','Clock'],weather:['Thời tiết','Weather'],dock:['Thanh công cụ','Dock'],timer:['Bộ đếm','Timer']};

/** Move DOM coordinates per frame; commit React/localStorage ONCE on pointerup.
 * Previous behavior normalized an entire settings tree and rerendered the Focus
 * video/overlay for every pointermove, producing noticeable jank on Android. */
export default function Focus8LayoutComposer({data,update,language='vi'}){
 const vi=language!=='en';
 const [mode,setMode]=useState(()=>getViewportLayout(window.innerWidth));
 const [selected,setSelected]=useState('clock');
 const [history,setHistory]=useState([]),[future,setFuture]=useState([]);
 const board=useRef(null),move=useRef(null),frame=useRef(0);
 const layout=data.layout[mode];
 const apply=(next,commit=true)=>{
  if(commit){setHistory(h=>[...h.slice(-19),data.layout]);setFuture([]);}
  update({layout:{...data.layout,[mode]:next}});
 };
 const start=(event,id)=>{
  if(event.button!==0||move.current)return;
  event.preventDefault();setSelected(id);
  move.current={id,pointerId:event.pointerId,initial:data.layout,
    position:layout[id],el:event.currentTarget,rect:board.current.getBoundingClientRect()};
  event.currentTarget.setPointerCapture?.(event.pointerId);
 };
 const drag=event=>{
  const moving=move.current;
  if(!moving||moving.pointerId!==event.pointerId)return;
  // DOM-only work, at most once per animation frame; no React commits.
  const position=snapPosition({x:(event.clientX-moving.rect.left)*100/moving.rect.width,
    y:(event.clientY-moving.rect.top)*100/moving.rect.height});
  moving.position=position;
  if(frame.current)return;
  frame.current=requestAnimationFrame(()=>{
    frame.current=0;
    if(move.current!==moving)return;
    moving.el.style.left=moving.position.x+'%';
    moving.el.style.top=moving.position.y+'%';
  });
 };
 const end=(event,cancel=false)=>{
  const moving=move.current;
  if(!moving||moving.pointerId!==event.pointerId)return;
  if(frame.current){cancelAnimationFrame(frame.current);frame.current=0;}
  move.current=null;
  if(cancel||moving.position.x===layout[moving.id].x&&moving.position.y===layout[moving.id].y){
    moving.el.style.left=layout[moving.id].x+'%';
    moving.el.style.top=layout[moving.id].y+'%';
    return;
  }
  setHistory(h=>[...h.slice(-19),moving.initial]);setFuture([]);
  update({layout:{...data.layout,[mode]:{...layout,[moving.id]:moving.position}}});
 };
 const nudge=(id,axis,delta)=>{
  apply({...layout,[id]:{...layout[id],[axis]:Math.max(axis==='x'?8:12,Math.min(axis==='x'?92:96,layout[id][axis]+delta))}});
 };
 const undo=()=>{if(!history.length)return;const prev=history.at(-1);setHistory(h=>h.slice(0,-1));setFuture(a=>[data.layout,...a]);update({layout:prev});};
 const redo=()=>{if(!future.length)return;const next=future[0];setFuture(a=>a.slice(1));setHistory(h=>[...h,data.layout]);update({layout:next});};
 return <div className="bfc8-stack">
  <h3>{vi?'Freeform Layout Composer':'Freeform Layout Composer'}</h3>
  <p>{vi?'Kéo thả mượt mà, lưu sau khi thả. Có Undo/Redo và lưới 5%.':'Smooth drag previews; changes save on release. Includes Undo/Redo and 5% snapping.'}</p>
  <label className="bfc8-check"><input type="checkbox" checked={data.layoutEnabled}
    onChange={e=>update({layoutEnabled:e.target.checked})}/>{vi?'Áp dụng bố cục tự chọn lên màn hình Focus':'Apply custom layout to Focus'}</label>
  <div className="bfc8-actions">{['desktop','tablet','mobile'].map(x=><button type="button" key={x} className={mode===x?'is-active':''} onClick={()=>setMode(x)}>{x}</button>)}</div>
  <div ref={board} className={'bfc8-layout-board bfc8-layout-board--'+mode} role="group" aria-label="Drag to arrange widgets">
   {Object.keys(targetNames).map(id=><button type="button" key={id}
    className={'bfc8-layout-item'+(id===selected?' active':'')}
    style={{left:layout[id].x+'%',top:layout[id].y+'%'}}
    onPointerDown={e=>start(e,id)} onPointerMove={drag}
    onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)}
    onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();nudge(id,['ArrowLeft','ArrowRight'].includes(e.key)?'x':'y',['ArrowLeft','ArrowUp'].includes(e.key)?-5:5);}}}
    aria-label={(vi?targetNames[id][0]:targetNames[id][1])+' x '+layout[id].x+' y '+layout[id].y}>
    {vi?targetNames[id][0]:targetNames[id][1]}</button>)}
  </div>
  <div className="bfc8-actions">
   <button type="button" onClick={undo} disabled={!history.length}>{vi?'Hoàn tác':'Undo'}</button>
   <button type="button" onClick={redo} disabled={!future.length}>{vi?'Làm lại':'Redo'}</button>
   <button type="button" onClick={()=>apply({clock:{x:50,y:50},weather:{x:50,y:68},dock:{x:50,y:94},timer:{x:50,y:82}})}>{vi?'Đặt lại bố cục':'Reset layout'}</button>
  </div>
  <p>{vi?'Sử dụng phím mũi tên để dịch chuyển phần tử đang chọn.':'Arrow keys move the selected widget.'}</p>
 </div>;
}
