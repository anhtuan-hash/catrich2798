import {BOARD_W,BOARD_H,newPage,makeId,pathFromPoints,sanitizeStudentPage} from './boardModel.js';
import {publicBoardActivity} from './boardActivities.js';
import {smoothBoardPath,pressureBoardSegments,boardShapeGeometry} from './boardDrawing.js';

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

/**
 * Create the downloadable plan from ALLOWLISTED student material only.
 * Activity answer mapping, private notes, hidden pages and teacher-only objects
 * never enter the PDF drawing layer.
 */
export function buildStudentPdfSlides(lesson,{includeActivities=false}={}){
 const slides=[];
 for(const raw of Array.isArray(lesson?.pages)?lesson.pages:[]){
  const safe=sanitizeStudentPage(raw);
  if(!safe)continue;
  slides.push({kind:'page',page:safe});
  if(includeActivities){
   for(const source of (Array.isArray(raw.activities)?raw.activities:[]).slice(0,24)){
    if(source?.teacherOnly===true||source?.studentVisible===false)continue;
    const activity=publicBoardActivity(source);
    if(activity)slides.push({kind:'activity',activity});
   }
  }
 }
 if(!slides.length)throw Error('There are no published pages to export');
 if(slides.length>50)throw Error('Export is limited to 50 public pages and activity sheets per PDF');
 return slides;
}
const worksheetLine=(svg,value,x,y)=>{
 const text=String(value||'').slice(0,130);
 const fontSize=text.length>68?16:20;
 const parts=text.length>68?[text.slice(0,68),text.slice(68)]:[text];
 parts.forEach((part,index)=>textNode(svg,part,x,y+index*19,fontSize,'#253f39'));
};
const worksheetRow=(svg,value,index,x,y,width,rowHeight)=>{
 svgNode('rect',{x,y,width,height:rowHeight-5,rx:10,fill:index%2?'#f3f7f3':'#ffffff',stroke:'#cfdbd3'},svg);
 textNode(svg,String(index+1)+'.',x+15,y+30,19,'#59826e');
 worksheetLine(svg,value,x+49,y+30);
};
const worksheetHeading=(svg,value,x,y)=>{
 textNode(svg,value,x,y,25,'#3a6b59');
};
/** A printable, non-interactive exercise sheet with public prompts and choices only. */
export function publicActivityToSvg(activity){
 const svg=svgNode('svg',{xmlns:NS,viewBox:'0 0 '+BOARD_W+' '+BOARD_H,width:BOARD_W,height:BOARD_H});
 svgNode('rect',{width:BOARD_W,height:BOARD_H,fill:'#f8fbf8'},svg);
 svgNode('rect',{x:0,y:0,width:BOARD_W,height:14,fill:'#396d5c'},svg);
 textNode(svg,'BRIAN BOARD  /  STUDENT WORKSHEET',76,65,23,'#396d5c');
 worksheetLine(svg,activity.title||'Classroom exercise',76,116);
 if(activity.prompt)worksheetLine(svg,activity.prompt,76,182);
 const labels=Array.isArray(activity.labels)?activity.labels:[];
 if(activity.type==='matching'){
  worksheetHeading(svg,'MATCH',82,255);
  worksheetHeading(svg,'ANSWER BANK',828,255);
  const answers=Array.isArray(activity.options)?activity.options:[];
  labels.slice(0,12).forEach((value,i)=>worksheetRow(svg,value,i,80,274+i*51,690,51));
  answers.slice(0,12).forEach((value,i)=>worksheetRow(svg,value,i,826,274+i*51,690,51));
 }else if(activity.type==='sorting'){
  const categories=Array.isArray(activity.categories)?activity.categories:[];
  worksheetHeading(svg,'CATEGORIES',82,257);
  worksheetLine(svg,categories.join('    •    '),82,299);
  labels.slice(0,20).forEach((value,i)=>{
   const col=Math.floor(i/10),row=i%10;
   worksheetRow(svg,value,i,80+col*746,328+row*54,690,54);
  });
 }else if(activity.type==='ordering'){
  worksheetHeading(svg,'ARRANGE THE PIECES INTO THE CORRECT ORDER',82,258);
  labels.slice(0,16).forEach((value,i)=>{
   const col=Math.floor(i/8),row=i%8;
   worksheetRow(svg,value,i,80+col*746,279+row*68,690,68);
  });
  worksheetHeading(svg,'YOUR ANSWER:',82,853);
  svgNode('line',{x1:274,y1:853,x2:1516,y2:853,stroke:'#aec5b8','stroke-width':2},svg);
 }else{
  // Lab worksheets are public-only: they deliberately contain no answer mapping.
  const text=(value,x,y,max=86)=>{
   const source=String(value||'').slice(0,2200),words=source.split(/\s+/);
   let current='',line=0;
   const flush=()=>{if(current&&line<21){textNode(svg,current,x,y+line*27,20,'#23443c');line++;current='';}};
   for(const word of words){
    if((current+' '+word).trim().length>max)flush();
    current=(current+' '+word).trim();
   }
   flush();return line;
  };
  const visible=Array.isArray(activity.items)?activity.items:[];
  const labels=activity.type==='cloze_snap'?activity.labels:
   activity.type==='concept_connection'?activity.labels:
   visible.length?visible.map(i=>i.label||i.syllables?.join(' / ')):activity.labels;
  worksheetHeading(svg,'STUDENT CHALLENGE',82,245);
  if(activity.passage){
   worksheetHeading(svg,'READING PASSAGE',82,287);
   text(activity.passage,85,322,105);
  }
  const top=activity.passage?610:288;
  (labels||[]).slice(0,12).forEach((label,i)=>worksheetRow(svg,label,i,82,top+i*47,680,47));
  if(Array.isArray(activity.options)&&activity.options.length){
   worksheetHeading(svg,'CHOICES / WORD BANK',822,245);
   activity.options.slice(0,12).forEach((value,i)=>worksheetRow(svg,value,i,825,284+i*49,680,49));
  }else if(Array.isArray(activity.categories)&&activity.categories.length){
   worksheetHeading(svg,'RELATIONS / CATEGORIES',822,245);
   activity.categories.slice(0,12).forEach((value,i)=>worksheetRow(svg,value,i,825,284+i*49,680,49));
  }
  if(activity.type==='four_corners'||activity.type==='evidence_hunter'||activity.type==='error_detective'){
   worksheetHeading(svg,'QUESTIONS AND CHOICES',822,245);
   visible.slice(0,6).forEach((entry,i)=>{
    text((i+1)+'. '+entry.label,827,288+i*92,46);
    text((entry.options||[]).map((x,j)=>String.fromCharCode(65+j)+'. '+x).join('  '),
     827,323+i*92,46);
   });
  }
  if(/^data:image\/(?:png|jpeg|webp);base64,/.test(activity.image||'')){
   svgNode('image',{href:activity.image,x:830,y:390,width:660,height:372,preserveAspectRatio:'xMidYMid meet'},svg);
  }
  if(activity.type==='stress_tap')worksheetHeading(svg,'CIRCLE THE STRESSED SYLLABLE',822,245);
  if(activity.type==='mystery_reveal')worksheetHeading(svg,'REVEAL AFTER EACH CORRECT ANSWER',822,245);
 }
 return svg;
}

const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function pageToSvg(page,theme='ivory'){
 const bg=theme==='midnight'?'#15252d':theme==='classroom'?'#eaf2ec':'#fbfaf6';
 const svg=svgNode('svg',{xmlns:NS,viewBox:'0 0 '+BOARD_W+' '+BOARD_H,width:BOARD_W,height:BOARD_H});
 svgNode('rect',{x:0,y:0,width:BOARD_W,height:BOARD_H,fill:bg},svg);
 if(page?.background==='dots'){
  for(let y=18;y<BOARD_H;y+=36)for(let x=18;x<BOARD_W;x+=36)
   svgNode('circle',{cx:x,cy:y,r:1.4,fill:'#b2c5bc',opacity:.65},svg);
 }else if(page?.background==='grid'){
  for(let x=0;x<=BOARD_W;x+=38)svgNode('line',{x1:x,y1:0,x2:x,y2:BOARD_H,stroke:'#d5e0da','stroke-width':1},svg);
  for(let y=0;y<=BOARD_H;y+=38)svgNode('line',{x1:0,y1:y,x2:BOARD_W,y2:y,stroke:'#d5e0da','stroke-width':1},svg);
 }else if(page?.background==='lines'){
  for(let y=38;y<=BOARD_H;y+=38)svgNode('line',{x1:0,y1:y,x2:BOARD_W,y2:y,stroke:'#d5e0da','stroke-width':1},svg);
 }
 for(const o of page?.objects||[]){
  if(o.kind==='stroke'&&Array.isArray(o.points)){
   if(o.pressureSensitive&&o.points.length>1){
    const group=svgNode('g',{opacity:o.opacity??1},svg);
    pressureBoardSegments(o.points,finite(o.width,5)).forEach(seg=>svgNode('line',{
     x1:seg.x1,y1:seg.y1,x2:seg.x2,y2:seg.y2,stroke:o.color||'#335d63',
     'stroke-width':seg.width,'stroke-linecap':'round'},group));
   }else svgNode('path',{d:o.smoothed?smoothBoardPath(o.points):pathFromPoints(o.points),
    fill:'none',stroke:o.color||'#335d63','stroke-width':finite(o.width,5),
    'stroke-linecap':'round','stroke-linejoin':'round',opacity:o.opacity??1},svg);
  }else if(o.kind==='shape'){
   const common={fill:/^#[0-9a-fA-F]{6}$/.test(o.fill||'')?o.fill:'none',
    stroke:o.color||'#335d63','stroke-width':finite(o.width,4)};
   const geometry=boardShapeGeometry(o.shape,o.x,o.y,o.x2,o.y2);
   if(geometry)svgNode(geometry.type==='polygon'?'polygon':'polyline',{
    ...common,fill:geometry.type==='polyline'?'none':common.fill,
    points:geometry.points.map(p=>p.join(',')).join(' ')},svg);
   else if(o.shape==='ellipse')svgNode('ellipse',{...common,cx:(o.x+o.x2)/2,cy:(o.y+o.y2)/2,
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
async function renderCanvasToJpeg(slide,theme){
 const svg=slide.kind==='activity'?publicActivityToSvg(slide.activity):pageToSvg(slide.page,theme);
 const source=new XMLSerializer().serializeToString(svg);
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
export async function exportBoardStudentPdf(lesson,onProgress=()=>{},{includeActivities=false}={}){
 const visible=buildStudentPdfSlides(lesson,{includeActivities});
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
