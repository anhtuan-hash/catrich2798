import React,{useRef,useState} from 'react';
import {Check,RotateCcw,X,Crop} from 'lucide-react';
import {normalizeBoardCrop} from './boardImageStudio.js';

export default function BoardCropEditor({image,onApply,onCancel,vi=true}){
 const initial={x:.06,y:.06,width:.88,height:.88};
 const [rect,setRect]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const surface=useRef(null),active=useRef(null);
 const begin=(mode,event)=>{
  if(busy||event.button!==0)return;
  event.stopPropagation();event.preventDefault();
  active.current={mode,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
   original:{...rect}};
  surface.current?.setPointerCapture(event.pointerId);
 };
 const drag=event=>{
  const op=active.current;if(!op||op.pointerId!==event.pointerId)return;
  const bounds=surface.current?.getBoundingClientRect();if(!bounds?.width||!bounds.height)return;
  const dx=(event.clientX-op.startX)/bounds.width;
  const dy=(event.clientY-op.startY)/bounds.height;
  const v={...op.original};
  const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
  if(op.mode==='move'){
   v.x=clamp(v.x+dx,0,1-v.width);v.y=clamp(v.y+dy,0,1-v.height);
  }else{
   if(op.mode.includes('w')){
    const right=v.x+v.width;v.x=clamp(v.x+dx,0,right-.08);v.width=right-v.x;
   }
   if(op.mode.includes('e'))v.width=clamp(v.width+dx,.08,1-v.x);
   if(op.mode.includes('n')){
    const bottom=v.y+v.height;v.y=clamp(v.y+dy,0,bottom-.08);v.height=bottom-v.y;
   }
   if(op.mode.includes('s'))v.height=clamp(v.height+dy,.08,1-v.y);
  }
  setRect(normalizeBoardCrop(v));
 };
 const end=e=>{if(active.current?.pointerId===e.pointerId)active.current=null;};
 const apply=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{await onApply(rect);}catch(e){setError(e?.message||'Crop failed');}
  finally{setBusy(false);}
 };
 return <div className="bbd-v8-crop-editor">
  <div className="bbd-v8-crop-editor__heading"><Crop size={18}/><strong>{vi?'Cắt ảnh theo vùng':'Freeform image crop'}</strong>
   <button type="button" disabled={busy} onClick={onCancel} aria-label={vi?'Đóng trình cắt':'Close crop editor'}><X size={15}/></button>
  </div>
  <p>{vi?'Kéo vùng sáng để di chuyển. Kéo góc để chỉnh vùng cắt. Ảnh gốc có thể khôi phục bằng Undo.':
   'Drag the light window to move, or drag corners to crop. Use Undo to recover your source image.'}</p>
  <div ref={surface} className="bbd-v8-crop-editor__stage" onPointerMove={drag}
   onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   <img src={image.src} alt={vi?'Ảnh chuẩn bị cắt':'Image to crop'} draggable={false}/>
   <div className="bbd-v8-crop-editor__shade"/>
   <div className="bbd-v8-crop-editor__region" style={{
    left:(rect.x*100)+'%',top:(rect.y*100)+'%',width:(rect.width*100)+'%',
    height:(rect.height*100)+'%'}} onPointerDown={e=>begin('move',e)}>
    {['nw','ne','se','sw'].map(handle=><span key={handle}
     className={'bbd-v8-crop-editor__handle is-'+handle}
     role="button" tabIndex={0} aria-label={vi?'Kéo góc '+handle:'Drag '+handle+' corner'}
     onPointerDown={e=>begin(handle,e)}
     onKeyDown={e=>{
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();
      const dx=e.key==='ArrowLeft'?-.015:e.key==='ArrowRight'?.015:0;
      const dy=e.key==='ArrowUp'?-.015:e.key==='ArrowDown'?.015:0;
      let v={...rect};
      if(handle.includes('w')){v.x+=dx;v.width-=dx;}else v.width+=dx;
      if(handle.includes('n')){v.y+=dy;v.height-=dy;}else v.height+=dy;
      setRect(normalizeBoardCrop(v));
     }}/>)}
   </div>
  </div>
  <div className="bbd-v8-crop-editor__footer">
   <small>{Math.round(rect.width*100)}% × {Math.round(rect.height*100)}%</small>
   <button type="button" onClick={()=>setRect(initial)} disabled={busy}><RotateCcw size={15}/>{vi?'Đặt lại':'Reset'}</button>
   <button type="button" className="is-primary" onClick={()=>void apply()} disabled={busy}>
    <Check size={16}/>{busy?(vi?'Đang cắt':'Cropping'):(vi?'Áp dụng':'Apply crop')}</button>
  </div>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
