import React from 'react';
import {FileText,Highlighter,Eye,EyeOff,Lock,Unlock,Trash2,ChevronLeft,ChevronRight,ShieldCheck} from 'lucide-react';
import {pdfAnnotationSummary,pdfPageIndices} from './boardPdfAnnotations.js';
/** PDF page artwork remains an owner-private raster background.
 * All canvas annotations are ordinary undoable vector objects.
 */
export default function BoardPdfStudio({lesson,page,vi=true,tool,onTool,onPaperState,onClear,onNavigate}){
 const status=pdfAnnotationSummary(page);
 const pdfIndices=pdfPageIndices(lesson);
 const currentIndex=lesson?.pages?.findIndex(p=>p.id===page?.id)??-1;
 const position=pdfIndices.indexOf(currentIndex);
 return <section className="bbd-v9-pdf-studio" aria-label={vi?'Bộ công cụ PDF':'PDF teaching studio'}>
  <div className="bbd-side-heading"><h3><FileText size={19}/> {vi?'PDF Annotation Studio':'PDF Annotation Studio'}</h3></div>
  <p>{vi?'Nhập PDF ở tab Thiết kế, rồi viết, tô sáng và thêm ghi chú lên từng trang. Tài liệu nền được khóa riêng khỏi nét viết.':
    'Import PDF from Design, then annotate, highlight and mark each page. Paper and vector annotations are separated.'}</p>
  {!status.hasPdf?
   <div className="bbd-v9-pdf-empty"><FileText size={25}/>
    <strong>{vi?'Chưa có trang PDF tại đây':'This is not an imported PDF page'}</strong>
    <small>{pdfIndices.length?
     (vi?'Dùng nút Đi tới trang PDF để chuyển đến tài liệu đã nhập.':'Use PDF page navigation to find the imported document.'):
     (vi?'Mở Thiết kế → Nhập PDF để thêm tài liệu.':'Open Design → Import PDF to start.')}</small></div>:
   <>
    <div className="bbd-v9-pdf-stats">
     <div><strong>{status.annotations}</strong><small>{vi?'Chú thích V8.3':'V8.3 annotations'}</small></div>
     <div><strong>{status.paperLocked?'🔒':'🔓'}</strong><small>{vi?'Nền tài liệu':'PDF paper'}</small></div>
    </div>
    <button type="button" className={tool==='pdf-highlight'?'is-active':''}
     onClick={()=>onTool('pdf-highlight')} disabled={page?.locked}
     aria-pressed={tool==='pdf-highlight'}><Highlighter size={17}/>
     {vi?'Tô sáng vùng PDF':'Draw PDF highlight'}</button>
    <p>{vi?'Kéo hình chữ nhật trên tài liệu để tô sáng màu vàng. Nét đánh dấu được lưu riêng và có Undo.':
     'Drag a rectangle to highlight. Markup remains independent of the PDF paper and supports Undo.'}</p>
    <div className="bbd-v9-pdf-actions">
     <button type="button" onClick={()=>onPaperState('hidden',status.paperVisible)} disabled={page?.locked}>
      {status.paperVisible?<EyeOff size={16}/>:<Eye size={16}/>}
      {status.paperVisible?(vi?'Ẩn nền PDF':'Hide paper'):(vi?'Hiện nền PDF':'Show paper')}</button>
     <button type="button" onClick={()=>onPaperState('locked',!status.paperLocked)} disabled={page?.locked}>
      {status.paperLocked?<Unlock size={16}/>:<Lock size={16}/>}
      {status.paperLocked?(vi?'Mở khóa nền':'Unlock paper'):(vi?'Khóa nền':'Lock paper')}</button>
    </div>
    <button type="button" className="bbd-v9-pdf-clear" onClick={onClear}
      disabled={page?.locked||status.annotations===0}>
      <Trash2 size={16}/>{vi?'Xóa nét chú thích (có thể Undo)':'Clear annotations (Undo available)'}</button>
   </>}
  {pdfIndices.length>0&&<div className="bbd-v9-pdf-pagination">
   <strong>{vi?'Trang PDF':'PDF pages'} {Math.max(0,position)+1} / {pdfIndices.length}</strong>
   <div>
    <button type="button" onClick={()=>onNavigate(-1)} disabled={position<=0}
     aria-label={vi?'Trang PDF trước':'Previous PDF page'}><ChevronLeft size={18}/></button>
    <button type="button" onClick={()=>onNavigate(1)} disabled={position===pdfIndices.length-1}
     aria-label={vi?'Trang PDF sau':'Next PDF page'}><ChevronRight size={18}/></button>
   </div>
  </div>}
  <small className="bbd-v9-pdf-disclaimer"><ShieldCheck size={14}/>
   {vi?'Xuất PDF học sinh bằng chức năng hiện có để loại trừ ghi chú riêng. Không trích xuất hay chỉnh sửa văn bản gốc của PDF.':
    'Use student PDF export to exclude private teacher content. Source PDF text remains rasterized, not natively editable.'}</small>
 </section>;
}
