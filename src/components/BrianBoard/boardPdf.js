import {BOARD_W,BOARD_H,newPage,makeId,pathFromPoints,sanitizeStudentPage} from './boardModel.js';

export const MAX_BOARD_PDF_MB=15,MAX_BOARD_PDF_PAGES=12;
export function validateBoardPdfHeader(bytes){
 return bytes?.length>=5 && String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
}
export function canImportPdf({fileBytes=0,pages=0,currentPages=1}){
 if(fileBytes<5||fileBytes>MAX_BOARD_PDF_MB*1024*1024)return 'PDF must be at most 15 MB';
 if(pages<1||pages>MAX_BOARD_PDF_PAGES)return 'Import up to 12 PDF pages at a time';
 if(currentPages+pages>80)return 'The lesson may contain at most 80 pages';
 return '';
}
/** PDF pages are rendered privately in browser as raster page backgrounds, then remain annotatable. */
export async function importBoardPdf(file,currentPages=1,onProgress=()=>{}){
 if(!file||file.size>MAX_BOARD_PDF_MB*1024*1024)throw Error('Choose a PDF of at most 15 MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!validateBoardPdfHeader(bytes))throw Error('The selected file is not a PDF');
 const [{getDocument,GlobalWorkerOptions},{default:workerUrl}]=await Promise.all([
  import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')
 ]);
 GlobalWorkerOptions.workerSrc=workerUrl;
 const task=getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});
 const result=[];
 try{
  const pdf=await task.promise;
  const error=canImportPdf({fileBytes:file.size,pages:pdf.numPages,currentPages});
  if(error)throw Error(error);
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i);
   const original=page.getViewport({scale:1});
   const scale=Math.min(1450/original.width,820/original.height,2.2);
   const viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(viewport.width));
   canvas.height=Math.max(1,Math.round(viewport.height));
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Canvas rendering is unavailable on this browser');
   await page.render({canvasContext:ctx,canvas,viewport,background:'#ffffff'}).promise;
   const src=canvas.toDataURL('image/jpeg',0.80);
   const newLessonPage=newPage('PDF · '+i);
   newLessonPage.objects=[{id:makeId(),kind:'image',src,
    x:Math.round((BOARD_W-viewport.width)/2),y:Math.round((BOARD_H-viewport.height)/2),
    width:Math.round(viewport.width),height:Math.round(viewport.height),studentVisible:true}];
   result.push(newLessonPage);
   canvas.width=0;canvas.height=0;
   page.cleanup?.();
   onProgress({page:i,total:pdf.numPages});
  }
 } finally {await task.destroy().catch(()=>{});}
 return result;
}

const NS='http://www.w3.org/2000/svg';
const svgNode=(name,attrs={},parent)=>{
 const el=document.createElementNS(NS,name);
 for(const [k,v] of Object.entries(attrs))if(v!=null)el.setAttribute(k,String(v));
 parent?.appendChild(el);return el;
};
const textNode=(parent,value,x,y,size=33,color='#263d40')=>{
 const el=svgNode('text',{x,y,'font-size':size,fill:color,
  'font-family':'Arial,Helvetica,sans-serif'},parent);
 el.textContent=String(value||'').slice(0,110);return el;
};
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function pageToSvg(page,theme='ivory'){
 const bg=theme==='midnight'?'#15252d':theme==='classroom'?'#eaf2ec':'#fbfaf6';
 const svg=svgNode('svg',{xmlns:NS,viewBox:'0 0 '+BOARD_W+' '+BOARD_H,width:BOARD_W,height:BOARD_H});
 svgNode('rect',{x:0,y:0,width:BOARD_W,height:BOARD_H,fill:bg},svg);
 for(const o of page?.objects||[]){
  if(o.kind==='stroke'&&Array.isArray(o.points)){
   svgNode('path',{d:pathFromPoints(o.points),fill:'none',stroke:o.color||'#335d63',
    'stroke-width':finite(o.width,5),'stroke-linecap':'round','stroke-linejoin':'round',opacity:o.opacity??1},svg);
  }else if(o.kind==='shape'){
   const common={fill:'none',stroke:o.color||'#335d63','stroke-width':finite(o.width,4)};
   if(o.shape==='ellipse')svgNode('ellipse',{...common,cx:(o.x+o.x2)/2,cy:(o.y+o.y2)/2,
    rx:Math.abs(o.x2-o.x)/2,ry:Math.abs(o.y2-o.y)/2},svg);
   else if(o.shape==='line')svgNode('line',{...common,x1:o.x,y1:o.y,x2:o.x2,y2:o.y2},svg);
   else svgNode('rect',{...common,x:Math.min(o.x,o.x2),y:Math.min(o.y,o.y2),
    width:Math.abs(o.x2-o.x),height:Math.abs(o.y2-o.y),rx:5},svg);
  }else if(o.kind==='image'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(o.src||'')){
   svgNode('image',{href:o.src,x:o.x,y:o.y,width:o.width||500,height:o.height||300,
    preserveAspectRatio:'xMidYMid meet'},svg);
  }else if(o.kind==='mask'){
   svgNode('rect',{x:o.x,y:o.y,width:o.width||240,height:o.height||90,rx:9,fill:'#243b4b'},svg);
  }else if(o.kind==='sticky'||o.kind==='flashcard'){
   const w=o.kind==='flashcard'?340:360,h=o.kind==='flashcard'?165:115;
   svgNode('rect',{x:o.x,y:o.y,width:w,height:h,rx:13,fill:'#edf4e6',stroke:'#a2b8a6'},svg);
   textNode(svg,o.text,o.x+12,o.y+47,25);
   if(o.kind==='flashcard')textNode(svg,o.revealed?o.publicAnswer:'••••••',o.x+12,o.y+111,20,'#53715d');
  }else if(o.kind==='text'){
   textNode(svg,o.text,o.x,o.y,o.fontSize||38,o.color||'#335d63');
  }
 }
 return svg;
}
async function renderCanvasToJpeg(page,theme){
 const svg=pageToSvg(page,theme),source=new XMLSerializer().serializeToString(svg);
 const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(Error('Unable to rasterize PDF page'));
   image.src=url;
  });
  const canvas=document.createElement('canvas');
  canvas.width=BOARD_W;canvas.height=BOARD_H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Canvas is unavailable');
  ctx.drawImage(image,0,0,BOARD_W,BOARD_H);
  const jpeg=canvas.toDataURL('image/jpeg',0.85);
  canvas.width=canvas.height=0;
  return jpeg;
 } finally {URL.revokeObjectURL(url);}
}
/** Actual flattened PDF; teacher-only objects are excluded even from the generated bytes. */
export async function exportBoardStudentPdf(lesson,onProgress=()=>{}){
 const visible=(lesson?.pages||[]).map(sanitizeStudentPage).filter(Boolean);
 if(!visible.length)throw Error('There are no published pages to export');
 if(visible.length>50)throw Error('Export is limited to 50 visible pages per PDF');
 const {PDFDocument}=await import('pdf-lib');
 const pdf=await PDFDocument.create();
 for(let i=0;i<visible.length;i++){
  const jpeg=await renderCanvasToJpeg(visible[i],lesson.theme);
  const img=await pdf.embedJpg(jpeg);
  const sheet=pdf.addPage([960,540]);
  sheet.drawImage(img,{x:0,y:0,width:960,height:540});
  onProgress({page:i+1,total:visible.length});
 }
 return pdf.save();
}
