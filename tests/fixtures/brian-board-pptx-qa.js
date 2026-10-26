import {importBoardPptx,importedPptxPageIndices} from '../../src/components/BrianBoard/boardPptx.js';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../../src/components/BrianBoard/boardModel.js';
const file=document.querySelector('#pptx-file');
const status=document.querySelector('#status');
const summary=document.querySelector('#summary');
window.__boardPptxResult=null;
file.addEventListener('change',async()=>{
 status.textContent='Importing';
 try{
  const {pages,report}=await importBoardPptx(file.files[0],1);
  const base=newLesson('pptx-uatrunner');
  const lesson=normalizeLesson({...base,pages:[...base.pages,...pages],activePageId:pages[0].id},'pptx-uatrunner');
  const page=lesson.pages[1];
  window.__boardPptxResult={pages:pages.length,report,pptxIndices:importedPptxPageIndices(lesson),
   objects:page.objects.map(o=>({kind:o.kind,text:o.text,fill:o.fill,src:o.src?.slice(0,30)})),
   student:sanitizeStudentPage(page)};
  status.textContent='Imported '+pages.length+' slides';
  summary.textContent=page.objects.filter(o=>o.kind==='text').map(o=>o.text).join(' | ');
 }catch(e){status.textContent='Error: '+e.message;}
});
