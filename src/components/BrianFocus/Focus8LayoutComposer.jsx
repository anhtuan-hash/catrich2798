import React,{useEffect,useRef,useState} from 'react';
import {getViewportLayout,snapPosition} from './useFocus8Data.js';
const targetNames={clock:['Đồng hồ','Clock'],weather:['Thời tiết','Weather'],dock:['Thanh công cụ','Dock'],timer:['Bộ đếm','Timer']};
export default function Focus8LayoutComposer({data,update,language='vi'}){
 const vi=language!=='en';
 const [mode,setMode]=useState(()=>getViewportLayout(window.innerWidth)),[selected,setSelected]=useState('clock');
 const [history,setHistory]=useState([]),[future,setFuture]=useState([]);
 const board=useRef(null),move=useRef(null);
 const layout=data.layout[mode];
 const apply=(next,commit=true)=>{
  if(commit){setHistory(h=>[...h.slice(-19),data.layout]);setFuture([]);}
  update({layout:{...data.layout,[mode]:next}});
 };
 const start=(event,id)=>{event.preventDefault();setSelected(id);move.current={id,initial:data.layout,startX:event.clientX,startY:event.clientY};event.currentTarget.setPointerCapture?.(event.pointerId);};
 const drag=event=>{
  if(!move.current||!board.current)return;
  const box=board.current.getBoundingClientRect();
  const id=move.current.id,position=snapPosition({x:(event.clientX-box.left)*100/box.width,y:(event.clientY-box.top)*100/box.height});
  update({layout:{...data.layout,[mode]:{...layout,[id]:position}}});
 };
 const end=()=>{if(move.current){setHistory(h=>[...h.slice(-19),move.current.initial]);setFuture([]);move.current=null;}};
 const nudge=(id,axis,delta)=>{
  apply({...layout,[id]:{...layout[id],[axis]:Math.max(axis==='x'?8:12,Math.min(axis==='x'?92:96,layout[id][axis]+delta))}});
 };
 const undo=()=>{if(!history.length)return;const prev=history.at(-1);setHistory(h=>h.slice(0,-1));setFuture(a=>[data.layout,...a]);update({layout:prev});};
 const redo=()=>{if(!future.length)return;const next=future[0];setFuture(a=>a.slice(1));setHistory(h=>[...h,data.layout]);update({layout:next});};
 return <div className="bfc8-stack">
  <h3>{vi?'Freeform Layout Composer':'Freeform Layout Composer'}</h3>
  <p>{vi?'Kéo thả các phần tử trên khung xem trước; cập nhật ngay trong Focus. Có Undo/Redo và lưới 5%.':'Drag widgets on the preview; changes apply live. Includes Undo/Redo and 5% snapping.'}</p>
  <div className="bfc8-actions">{['desktop','tablet','mobile'].map(x=><button key={x} className={mode===x?'is-active':''} onClick={()=>setMode(x)}>{x}</button>)}</div>
  <div ref={board} className={'bfc8-layout-board bfc8-layout-board--'+mode} role="group" aria-label="Drag to arrange widgets">
   {Object.keys(targetNames).map(id=><button type="button" key={id}
    className={'bfc8-layout-item'+(id===selected?' active':'')}
    style={{left:layout[id].x+'%',top:layout[id].y+'%'}}
    onPointerDown={e=>start(e,id)} onPointerMove={drag} onPointerUp={end} onPointerCancel={end}
    onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();nudge(id,['ArrowLeft','ArrowRight'].includes(e.key)?'x':'y',['ArrowLeft','ArrowUp'].includes(e.key)?-5:5);}}}
    aria-label={(vi?targetNames[id][0]:targetNames[id][1])+' x '+layout[id].x+' y '+layout[id].y}>
    {vi?targetNames[id][0]:targetNames[id][1]}</button>)}
  </div>
  <div className="bfc8-actions">
   <button type="button" onClick={undo} disabled={!history.length}>{vi?'Hoàn tác':'Undo'}</button>
   <button type="button" onClick={redo} disabled={!future.length}>{vi?'Làm lại':'Redo'}</button>
   <button type="button" onClick={()=>apply({clock:{x:50,y:50},weather:{x:50,y:68},dock:{x:50,y:94},timer:{x:50,y:82}})}>{vi?'Đặt lại bố cục':'Reset layout'}</button>
  </div>
  <p>{vi?'Dùng các phím mũi tên để dịch chuyển phần tử đang chọn. Bố cục được lưu riêng cho từng cỡ màn hình.':'Arrow keys move the selected widget; layouts are stored separately for screen sizes.'}</p>
 </div>;
}
