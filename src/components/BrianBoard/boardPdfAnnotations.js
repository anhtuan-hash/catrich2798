/** Brian Board PDF Studio: teacher-local, reversible annotations on imported pages.
 * Source PDFs remain images, never text-extracted or uploaded.
 */
export const PDF_ANNOTATION_LIMIT=400;
export function findPdfBackground(page){
 return (page?.objects||[]).find(o=>o?.kind==='image'&&o.pdfBackground===true)||null;
}
export function pdfAnnotationSummary(page){
 const background=findPdfBackground(page);
 const other=(page?.objects||[]).filter(o=>o?.id!==background?.id);
 return {hasPdf:!!background,paperLocked:background?.locked!==false,
  paperVisible:background?.hidden!==true,annotationCount:other.length,
  annotationLimit:PDF_ANNOTATION_LIMIT,annotations:other.filter(o=>o.pdfAnnotation===true).length};
}
export function annotateBoardObject(page,object){
 const paper=findPdfBackground(page);
 if(!paper||!object||typeof object!=='object')return object;
 return {...object,pdfAnnotation:true};
}
export function annotateBoardObjects(page,objects){
 if(!findPdfBackground(page))return objects;
 return (objects||[]).map(o=>annotateBoardObject(page,o));
}
export function setPdfPaperState(page,attribute,value){
 if(!findPdfBackground(page)||!['locked','hidden'].includes(attribute))return page;
 return {...page,objects:page.objects.map(o=>o.pdfBackground?{...o,[attribute]:value===true}:o)};
}
export function clearPdfAnnotations(page,{includeLegacy=false}={}){
 const paper=findPdfBackground(page);
 if(!paper)return page;
 return {...page,objects:page.objects.filter(o=>o.id===paper.id||
  (!includeLegacy&&!o.pdfAnnotation))};
}
export function pdfHighlightRegion(page,{x,y,width,height},fill='#fff2a1'){
 const background=findPdfBackground(page);
 if(!background)throw Error('No imported PDF page found');
 if(page.locked)throw Error('Unlock this lesson page to annotate');
 const dimensions=[x,y,width,height].map(Number);
 if(!dimensions.every(Number.isFinite)||width<12||height<8)throw Error('Invalid highlight area');
 if(page.objects.length>=3000)throw Error('Page object limit reached');
 const left=Math.max(background.x,Math.min(x,background.x+background.width-12));
 const top=Math.max(background.y,Math.min(y,background.y+background.height-8));
 const w=Math.min(width,background.x+background.width-left),h=Math.min(height,background.y+background.height-top);
 const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'pdf-'+Date.now().toString(36);
 return {...page,objects:[...page.objects,{
  kind:'shape',shape:'rect',id,x:left,y:top,x2:left+w,y2:top+h,
  color:'#e0aa30',width:2,fill,opacity:.42,pdfAnnotation:true,studentVisible:true
 }]};
}
export function pdfPageIndices(lesson){
 return (lesson?.pages||[]).map((p,i)=>findPdfBackground(p)?i:-1).filter(i=>i>=0);
}
