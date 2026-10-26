import React,{useState} from 'react';
import {Presentation,Type,ChevronLeft,ChevronRight,Play,Palette,Trash2,ShieldAlert} from 'lucide-react';
import {importedPptxPageIndices} from './boardPptx.js';
import './BoardPptxStudio.css';

/** Editable object inspector. Each update routes through Brian Board's undoable editPage(). */
export default function BoardPptxStudio({lesson,page,vi=true,onEdit,onDelete,onNavigate,onPresent,presenting=false}){
 const all=importedPptxPageIndices(lesson);
 const active=lesson?.pages?.findIndex(p=>p.id===page?.id)??-1;
 const index=all.indexOf(active);
 const textObjects=(page?.pptxSource?page.objects||[]:[]).filter(o=>o.kind==='text'&&o.pptxEditable);
 const [search,setSearch]=useState('');
 const visible=textObjects.filter(o=>String(o.text||'').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,130);
 return <div className="bbd-pptx-studio" data-testid="board-pptx-studio">
   <div className="bbd-pptx-title"><Presentation size={22}/><h3>{vi?'PowerPoint Studio':'PowerPoint Studio'}</h3></div>
   {!all.length?<p role="status">{vi?'Chưa nhập slide. Vào tab Thiết kế → Nhập PowerPoint (.pptx).':'No slides yet. Open Design → Import PowerPoint (.pptx).'}</p>:<>
     <div className="bbd-pptx-count"><strong>{all.length}</strong><span>{vi?'slide PowerPoint đã nhập':'imported PowerPoint slides'}</span></div>
     <div className="bbd-pptx-nav">
       <button type="button" onClick={()=>onNavigate(-1)} disabled={index<=0} aria-label={vi?'Slide trước':'Previous slide'}><ChevronLeft size={18}/></button>
       <span>{index>=0?(vi?'Slide ':'Slide ')+(index+1)+' / '+all.length:(vi?'Đang ở trang Board khác':'Viewing another Board page')}</span>
       <button type="button" onClick={()=>onNavigate(1)} disabled={index<0||index>=all.length-1} aria-label={vi?'Slide kế':'Next slide'}><ChevronRight size={18}/></button>
     </div>
     <button type="button" className="bbd-pptx-present" onClick={onPresent}>
       <Play size={18}/>{presenting?(vi?'Dừng trình chiếu TV':'Stop TV display'):(vi?'Trình chiếu trên TV':'Present on TV')}
     </button>
     {!page?.pptxSource?<p>{vi?'Chọn một trang PowerPoint trong tab Trang để chỉnh sửa.':'Select an imported PowerPoint page to edit.'}</p>:<>
       <label className="bbd-pptx-search">{vi?'Tìm chữ trong slide':'Find text in slide'}
         <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={vi?'Nhập từ khóa…':'Search text…'}/></label>
       <div className="bbd-pptx-caption"><Type size={17}/><strong>{vi?'Chỉnh sửa trực tiếp nội dung chữ':'Edit slide text'}</strong><small>{textObjects.length} {vi?'khung chữ':'text items'}</small></div>
       <div className="bbd-pptx-edit-list">{visible.map((o,i)=><div key={o.id} className="bbd-pptx-edit-item">
         <span className="bbd-pptx-label">{vi?'Khung chữ':'Text'} {i+1}</span>
         <textarea rows={2} maxLength={90} value={o.text||''} disabled={page.locked||o.locked}
           aria-label={(vi?'Sửa văn bản ':'Edit text ')+(i+1)}
           onChange={e=>onEdit(o.id,{text:e.target.value.slice(0,90)})}/>
         <div className="bbd-pptx-edit-controls">
           <label><Type size={14}/><input type="number" min="14" max="115" value={o.fontSize||40} disabled={page.locked||o.locked}
            aria-label={vi?'Kích cỡ chữ':'Font size'}
            onChange={e=>onEdit(o.id,{fontSize:Math.min(115,Math.max(14,Number(e.target.value)||14))})}/></label>
           <label><Palette size={14}/><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(o.color||'')?o.color:'#355d63'}
             disabled={page.locked||o.locked} aria-label={vi?'Màu chữ':'Text color'} onChange={e=>onEdit(o.id,{color:e.target.value})}/></label>
           <button type="button" disabled={page.locked||o.locked} onClick={()=>onDelete(o.id)}
             aria-label={vi?'Xóa khung chữ':'Delete text item'}><Trash2 size={16}/></button>
         </div>
       </div>)}</div>
       {!visible.length&&<p>{vi?'Không có khung chữ phù hợp.':'No matching text objects.'}</p>}
       <p className="bbd-pptx-tip">{vi?'Dùng công cụ Chọn để di chuyển hình và chữ trên bảng. Bút, ghi chú, hoàn tác và lưu nháp vẫn hoạt động bình thường.':
        'Use Select to move text and pictures. Drawing, annotations, undo, and draft saving still work.'}</p>
     </>}
   </>}
   <p className="bbd-pptx-warning"><ShieldAlert size={16}/>{vi?
    'Giới hạn: biểu đồ, SmartArt, video và animation gốc không được chuyển thành đối tượng chỉnh sửa. Các slide có thể lệch font hoặc bố cục so với PowerPoint.':
    'Limits: original animations, video, SmartArt, and charts are not editable. Fonts and layout may differ from PowerPoint.'}</p>
 </div>;
}
