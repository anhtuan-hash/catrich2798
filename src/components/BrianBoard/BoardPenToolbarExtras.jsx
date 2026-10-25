import React from 'react';
import {Eraser,Grid3X3} from 'lucide-react';

// Isolated toolbar avoids nested JSX expression parsing conflicts in the Board canvas.
export default function BoardPenToolbarExtras({
  studentView,tool,vi,presets,penPreset,setPenPreset,setTool,setThickness,
  snapToGrid,setSnapToGrid,shapeFill,setShapeFill,page,clearInk,
}){
  if(studentView)return null;
  return <>
    <div className="bbd-pen-presets" role="group" aria-label={vi?'Kiểu bút':'Pen presets'}>
      {Object.entries(presets).map(([id,preset])=>(
        <button key={id} type="button" className={penPreset===id?'active':''}
          title={preset.label} aria-pressed={penPreset===id}
          onClick={()=>{setPenPreset(id);setTool('pen');setThickness(preset.width);}}>
          {id==='fine'?'01':id==='classic'?'02':id==='fountain'?'03':'04'}
        </button>
      ))}
    </div>
    <button type="button" className={'bbd-tool-toggle'+(snapToGrid?' active':'')}
      title={vi?'Bật/tắt căn lưới 25 đơn vị':'Toggle 25-unit magnetic grid'}
      aria-pressed={snapToGrid} onClick={()=>setSnapToGrid(v=>!v)}>
      <Grid3X3 size={17}/>
    </button>
    {tool.startsWith('shape-')&&(
      <select className="bbd-shape-fill" aria-label={vi?'Màu tô hình':'Shape fill'}
        value={shapeFill} onChange={e=>setShapeFill(e.target.value)}>
        <option value="none">{vi?'Không tô':'No fill'}</option>
        <option value="#fff0c8">{vi?'Vàng nhạt':'Soft yellow'}</option>
        <option value="#dcefe7">{vi?'Xanh lá nhạt':'Soft mint'}</option>
        <option value="#dce7fa">{vi?'Xanh dương nhạt':'Soft blue'}</option>
      </select>
    )}
    <button type="button" className="bbd-clear-ink"
      disabled={page?.locked || !page?.objects?.some(o=>o.kind==='stroke')}
      onClick={clearInk}
      title={vi?'Xóa tất cả nét bút, có thể hoàn tác':'Clear all pen ink, undo available'}>
      <Eraser size={16}/><span>{vi?'Xóa nét':'Clear ink'}</span>
    </button>
  </>;
}
